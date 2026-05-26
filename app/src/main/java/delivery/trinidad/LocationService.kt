package delivery.trinidad

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.edit
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import delivery.trinidad.data.SupabaseApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class LocationService : Service() {
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val channelId = "location_service_channel"

    private lateinit var notificationHelper: NotificationHelper
    private var lastChatSize = 0
    private var lastStatus: OrderStatus? = null

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        notificationHelper = NotificationHelper(this)

        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Rapidingo esta activo")
            .setContentText("Tu ubicacion se actualiza en tiempo real")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
        startForeground(1, notification)

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                syncLocation(location.latitude, location.longitude)
            }
        }

        startLocationUpdates()
    }

    private fun syncLocation(rawLat: Double, rawLng: Double) {
        val prefs = getSharedPreferences("delivery_prefs", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null) ?: return
        val activeOrderId = prefs.getString("active_order_id", null)

        serviceScope.launch {
            runCatching {
                val user = SupabaseApi.getUser(userId) ?: return@launch
                val isEmulator = android.os.Build.FINGERPRINT.contains("generic") ||
                    android.os.Build.MODEL.contains("Emulator") ||
                    android.os.Build.HARDWARE.contains("goldfish") ||
                    android.os.Build.HARDWARE.contains("ranchu")

                val finalLat: Double
                val finalLng: Double
                if (isEmulator) {
                    if (user.role == UserRole.DELIVERY) {
                        finalLat = -14.830000
                        finalLng = -64.900000
                    } else {
                        finalLat = -14.835000
                        finalLng = -64.905000
                    }
                } else {
                    finalLat = rawLat
                    finalLng = rawLng
                }

                val latLng = MyLatLng(finalLat, finalLng)
                if (latLng.latitude != 0.0 && latLng.longitude != 0.0) {
                    SupabaseApi.updateUser(userId, JSONObject().put("location", latLng.toJson()))
                }

                if (activeOrderId == null) {
                    lastChatSize = 0
                    lastStatus = null
                    return@launch
                }

                val order = SupabaseApi.getOrders().find { it.id == activeOrderId }
                if (order == null || order.status == OrderStatus.COMPLETED || order.status == OrderStatus.CANCELLED) {
                    prefs.edit { remove("active_order_id") }
                    lastChatSize = 0
                    lastStatus = null
                    return@launch
                }

                if (order.deliveryId == userId) {
                    val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
                    if (isFoodOrder && order.status != OrderStatus.IN_DELIVERY && order.status != OrderStatus.DELIVERED_BY_REPARTIDOR) {
                        notifyOrderChanges(order, userId, user.role)
                        return@launch
                    }
                    val updates = JSONObject().put("delivery_location", latLng.toJson())
                    val lastLoc = order.deliveryPath.lastOrNull()
                    if (lastLoc == null || kotlin.math.abs(lastLoc.latitude - finalLat) > 0.00001) {
                        updates.put("delivery_path", JSONArray((order.deliveryPath + latLng).map { it.toJson() }))
                    }
                    SupabaseApi.updateOrder(activeOrderId, updates)
                } else if (order.clientId == userId) {
                    SupabaseApi.updateOrder(activeOrderId, JSONObject().put("client_location", latLng.toJson()))
                }

                notifyOrderChanges(order, userId, user.role)
            }.onFailure {
                Log.e("Rapidingo", "Error en LocationService Supabase: ${it.message}")
            }
        }
    }

    private fun notifyOrderChanges(order: Order, userId: String, role: UserRole) {
        if (lastStatus != null && order.chatHistory.size > lastChatSize) {
            val lastMsg = order.chatHistory.last()
            if (lastMsg.senderId != userId) {
                notificationHelper.sendNotification(
                    "Mensaje de ${if (order.deliveryId == userId) "Cliente" else "Repartidor"}",
                    lastMsg.text.ifBlank { "Te enviaron un archivo" }
                )
            }
        }
        lastChatSize = order.chatHistory.size

        if (lastStatus != null && order.status != lastStatus) {
            val statusMsg = when (order.status) {
                OrderStatus.PENDING_PRICE -> if (role == UserRole.DELIVERY && order.targetDeliveryId == userId) "Nuevo pedido recibido" else null
                OrderStatus.BIDDING -> if (role == UserRole.CLIENT) "El repartidor esta cotizando" else null
                OrderStatus.WAITING_CONFIRM -> if (role == UserRole.CLIENT) "Cotizacion lista! Revisa el precio" else null
                OrderStatus.CONFIRMED_BY_CLIENT -> if (role == UserRole.DELIVERY) "El cliente acepto la cotizacion" else null
                OrderStatus.PICKING_UP -> if (role == UserRole.CLIENT) "El repartidor esta comprando" else null
                OrderStatus.IN_DELIVERY -> if (role == UserRole.CLIENT) "Pedido en camino!" else null
                OrderStatus.DELIVERED_BY_REPARTIDOR -> if (role == UserRole.CLIENT) "El repartidor ya llego!" else null
                OrderStatus.COMPLETED -> null
                OrderStatus.CANCELLED -> null
                else -> null
            }
            statusMsg?.let { notificationHelper.sendNotification("Rapidingo", it) }
        }
        lastStatus = order.status
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
            .setMinUpdateIntervalMillis(5000)
            .setWaitForAccurateLocation(false)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            Log.e("Rapidingo", "Error de permisos en LocationService: ${e.message}")
            stopSelf()
        }
    }

    private fun createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                channelId,
                "Canal de Ubicacion Rapidingo",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    private fun MyLatLng.toJson(): JSONObject = JSONObject()
        .put("latitude", latitude)
        .put("longitude", longitude)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        super.onDestroy()
    }
}
