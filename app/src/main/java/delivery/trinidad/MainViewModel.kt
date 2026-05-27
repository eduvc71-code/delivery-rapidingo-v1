package delivery.trinidad

import android.app.Application
import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.auth.api.signin.GoogleSignIn
import delivery.trinidad.data.SupabaseApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.util.UUID

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val appContext = application.applicationContext
    private val prefs = application.getSharedPreferences("delivery_prefs", Context.MODE_PRIVATE)
    private val trinidadCenter = MyLatLng(-14.8336, -64.9000)
    val forcedRole: UserRole? = when (BuildConfig.APP_ROLE) {
        UserRole.CLIENT.name -> UserRole.CLIENT
        UserRole.DELIVERY.name -> UserRole.DELIVERY
        else -> null
    }

    var clientUser by mutableStateOf<User?>(null)
    var deliveryUser by mutableStateOf<User?>(null)
    var activeOrder by mutableStateOf<Order?>(null)
    var currentMode by mutableStateOf<UserRole?>(null)
    var dispatchMode by mutableStateOf("AUTOMATIC")

    var availableDeliveriesCount by mutableIntStateOf(0)
    var allDeliveryUsers by mutableStateOf<List<User>>(emptyList())
    var currentUserLocation by mutableStateOf<MyLatLng?>(null)

    var isCheckingSession by mutableStateOf(true)
    var isRegistrationComplete by mutableStateOf(false)
    var isRegisteringUser by mutableStateOf(false)
    var completedOrdersList by mutableStateOf<List<Order>>(emptyList())
    var lastReadChatSize by mutableIntStateOf(0)
    var inAppNotificationMessage by mutableStateOf<String?>(null)
    var isAppInForeground by mutableStateOf(false)

    var plannedRoute by mutableStateOf<List<MyLatLng>>(emptyList())
    private var lastRouteQueryTime = 0L

    var showThankYouDialog by mutableStateOf(false)
    var thankYouDialogMessage by mutableStateOf("")

    private val notificationHelper = NotificationHelper(application)
    private var lastChatSize = 0
    private var lastStatus: OrderStatus? = null
    private val shownStatusNotificationsPref = "shown_status_notifications"

    private var orderJob: Job? = null
    private var deliveryStatusJob: Job? = null
    private var reportsJob: Job? = null

    private fun sendSystemNotification(title: String, message: String) {
        if (!isAppInForeground) {
            notificationHelper.sendNotification(title, message)
        }
    }

    // ==================== ESTADOS PARA CARRITO INTERACTIVO ====================
    var tempOrderItems by mutableStateOf<List<TempOrderItem>>(emptyList())
    var currentRestaurantForOrder by mutableStateOf<Restaurant?>(null)
    var showOrderDialog by mutableStateOf(false)
    var showSummaryDialog by mutableStateOf(false)

    val restaurants = listOf(
        Restaurant(
            id = "wings_drinks",
            name = "Wings & Drinks",
            category = "COMIDA_RAPIDA",
            rating = 4.6,
            deliveryTime = "25-35 min",
            deliveryFee = 5.0,
            minOrder = 20.0,
            phone = "74721716",
            address = "Trinidad Centro",
            schedule = "Lun-Dom: 12:00 - 22:00",
            logoUrl = "file:///android_asset/restaurants/wings_drinks.jpg",
            menuUrl = "file:///android_asset/restaurants/wings_drinks.jpg",
            logoColor = 0xFFFF5722L
        ),
        Restaurant(
            id = "el_brete",
            name = "El Brete Churrasqueria",
            category = "PARRILLA",
            rating = 4.8,
            deliveryTime = "35-45 min",
            deliveryFee = 7.0,
            minOrder = 50.0,
            phone = "69376937",
            address = "C/ Macheteros #284",
            schedule = "Lun-Dom: 12:00 - 23:00",
            logoUrl = "file:///android_asset/restaurants/el_brete.jpg",
            menuUrl = "file:///android_asset/restaurants/el_brete.jpg",
            logoColor = 0xFFE91E63L
        ),
        Restaurant(
            id = "la_toscana_1",
            name = "La Toscana Centro",
            category = "RESTAURANTE",
            rating = 4.7,
            deliveryTime = "30-40 min",
            deliveryFee = 6.0,
            minOrder = 20.0,
            phone = "73939626",
            address = "Calle La Paz esq. 18 de Noviembre",
            schedule = "Lun-Dom: 11:30 - 22:00",
            logoUrl = "file:///android_asset/restaurants/la_toscana.jpg",
            menuUrl = "file:///android_asset/restaurants/la_toscana.jpg",
            logoColor = 0xFF9C27B0L
        ),
        Restaurant(
            id = "la_toscana_2",
            name = "La Toscana - Tablitas",
            category = "PARRILLA",
            rating = 4.7,
            deliveryTime = "30-40 min",
            deliveryFee = 6.0,
            minOrder = 55.0,
            phone = "73939626",
            address = "Calle La Paz esq. 18 de Noviembre",
            schedule = "Lun-Dom: 11:30 - 22:00",
            logoUrl = "file:///android_asset/restaurants/la_toscana1.jpg",
            menuUrl = "file:///android_asset/restaurants/la_toscana1.jpg",
            logoColor = 0xFF673AB7L
        ),
        Restaurant(
            id = "la_toscana_rapido",
            name = "La Toscana - Rápido",
            category = "COMIDA_RAPIDA",
            rating = 4.6,
            deliveryTime = "25-35 min",
            deliveryFee = 6.0,
            minOrder = 20.0,
            phone = "73939626",
            address = "Calle La Paz esq. 18 de Noviembre",
            schedule = "Lun-Dom: 11:30 - 22:00",
            logoUrl = "file:///android_asset/restaurants/la_toscana2.jpg",
            menuUrl = "file:///android_asset/restaurants/la_toscana2.jpg",
            logoColor = 0xFFBA68C8L
        ),
        Restaurant(
            id = "la_plazuela",
            name = "La Plazuela J&C",
            category = "RESTAURANTE",
            rating = 4.5,
            deliveryTime = "30-40 min",
            deliveryFee = 6.0,
            minOrder = 18.0,
            phone = "73900041",
            address = "Calle 9 de Abril, diagonal parroquia Fatima",
            schedule = "Lun-Dom: 12:00 - 22:00",
            logoUrl = "file:///android_asset/restaurants/la_plazuela.jpg",
            menuUrl = "file:///android_asset/restaurants/la_plazuela.jpg",
            logoColor = 0xFF795548L
        ),
        Restaurant(
            id = "la_coqueta",
            name = "La Coqueta",
            category = "HAMBURGUESAS",
            rating = 4.5,
            deliveryTime = "25-35 min",
            deliveryFee = 5.0,
            minOrder = 15.0,
            phone = "72845195",
            address = "Calle Sucre esquina 9 de Abril",
            schedule = "Mar-Dom: 19:00 - 23:00",
            logoUrl = "file:///android_asset/restaurants/la_coqueta.jpg",
            menuUrl = "file:///android_asset/restaurants/la_coqueta.jpg",
            logoColor = 0xFFE91E63L
        ),
        Restaurant(
            id = "mr_grill",
            name = "Mr. Grill",
            category = "HAMBURGUESAS",
            rating = 4.8,
            deliveryTime = "20-30 min",
            deliveryFee = 0.0,
            minOrder = 20.0,
            phone = "77848655",
            address = "Calle Santa Cruz esq. Av. del Mar",
            schedule = "Lun-Dom: 12:00 - 23:00",
            logoUrl = "file:///android_asset/restaurants/mr_grill.jpg",
            menuUrl = "file:///android_asset/restaurants/mr_grill.jpg",
            logoColor = 0xFFFF5722L
        ),
        Restaurant(
            id = "el_benianito",
            name = "Restaurante El Benianito",
            category = "RESTAURANTE",
            rating = 4.3,
            deliveryTime = "30-40 min",
            deliveryFee = 7.0,
            minOrder = 22.0,
            phone = "72815881",
            address = "Av. del Mar frente a la Plaza Ganadera",
            schedule = "19:00 - 12:30",
            logoUrl = "file:///android_asset/restaurants/el_benianito.jpg",
            menuUrl = "file:///android_asset/restaurants/el_benianito.jpg",
            logoColor = 0xFF3F51B5L
        ),
        Restaurant(
            id = "toby",
            name = "Toby - Cuarto de Libra",
            category = "HAMBURGUESAS",
            rating = 4.4,
            deliveryTime = "20-30 min",
            deliveryFee = 5.0,
            minOrder = 27.0,
            phone = "67270686",
            address = "Trinidad Centro",
            schedule = "Lun-Dom: 12:00 - 22:00",
            logoUrl = "file:///android_asset/restaurants/toby.jpg",
            menuUrl = "file:///android_asset/restaurants/toby.jpg",
            logoColor = 0xFFD32F2FL
        )
    )

    // ==================== FUNCIONES DE CARRITO INTERACTIVO ====================
    fun addItemToTempOrder(restaurant: Restaurant, productName: String, quantity: Int) {
        if (productName.isBlank() || quantity < 1) return
        tempOrderItems = tempOrderItems + TempOrderItem(
            restaurantId = restaurant.id,
            restaurantName = restaurant.name,
            productName = productName.trim().uppercase(),
            quantity = quantity
        )
    }

    fun removeTempItem(itemId: String) {
        tempOrderItems = tempOrderItems.filter { it.id != itemId }
    }

    fun updateTempItemQuantity(itemId: String, newQuantity: Int) {
        if (newQuantity < 1) {
            removeTempItem(itemId)
            return
        }
        tempOrderItems = tempOrderItems.map {
            if (it.id == itemId) it.copy(quantity = newQuantity) else it
        }
    }

    fun clearTempOrder() {
        tempOrderItems = emptyList()
    }

    fun confirmTempOrderAndCreate(destinationLocation: MyLatLng) {
        if (tempOrderItems.isEmpty()) return

        val grouped = tempOrderItems.groupBy { it.restaurantName }
        val description = buildString {
            grouped.forEach { (restName, items) ->
                appendLine("RESTAURANTE: $restName")
                items.forEach { item ->
                    appendLine("- ${item.productName} x${item.quantity}")
                }
            }
            appendLine("TOTAL PLATOS: ${tempOrderItems.sumOf { it.quantity }}")
        }

        createOrder(
            category = "COMIDA",
            description = description.trim(),
            destinationLocation = destinationLocation
        )

        clearTempOrder()
        showSummaryDialog = false
    }

    init {
        checkUserSession()
        observeAvailableDeliveries()
    }

    private fun getAppId(): String {
        var id = prefs.getString("app_instance_id", null)
        if (id == null) {
            id = UUID.randomUUID().toString()
            prefs.edit { putString("app_instance_id", id) }
        }
        return id
    }

    private fun checkUserSession() {
        isCheckingSession = true
        val savedUserId = prefs.getString("user_id", null)
        val savedEmail = prefs.getString("user_email", null)
        val googleEmail = GoogleSignIn.getLastSignedInAccount(appContext)?.email
        val appId = getAppId()
        val candidateIds = listOfNotNull(savedUserId, appId).distinct()
        val candidateEmails = listOfNotNull(savedEmail, googleEmail).map { it.trim().lowercase() }.filter { it.isNotBlank() }.distinct()

        viewModelScope.launch {
            runCatching {
                SupabaseApi.getDispatchMode()
            }.onSuccess { mode ->
                dispatchMode = mode
            }.onFailure {
                Log.e("Rapidingo", "Error al inicializar dispatchMode: ${it.message}")
            }

            runCatching {
                var savedUser: User? = null
                for (candidateId in candidateIds) {
                    savedUser = SupabaseApi.getUser(candidateId)
                    if (savedUser != null) break
                }
                if (savedUser == null) {
                    for (candidateEmail in candidateEmails) {
                        savedUser = SupabaseApi.getUserByEmail(candidateEmail)
                        if (savedUser != null) break
                    }
                }
                savedUser
            }.onSuccess { user ->
                // Verificación estricta: Si Supabase no tiene al usuario, LIMPIAR TODO
                if (user == null) {
                    clearLocalSession()
                    isCheckingSession = false
                    return@onSuccess
                }
                
                if (roleMatchesApp(user.role)) {
                    prefs.edit {
                        putString("user_id", user.id)
                        putString("user_role", user.role.name)
                        putString("user_email", user.email)
                        putString("app_instance_id", user.id)
                    }
                    finalizeSessionLoad(user)
                } else {
                    clearLocalSession()
                    isCheckingSession = false
                }
            }.onFailure {
                Log.e("Rapidingo", "Error al verificar sesion Supabase: ${it.message}")
                isCheckingSession = false
            }
        }
    }

    private fun roleMatchesApp(role: UserRole): Boolean {
        return forcedRole == null || forcedRole == role
    }

    private fun clearLocalSession() {
        prefs.edit {
            remove("user_id")
            remove("user_role")
            remove("user_email")
            remove("active_order_id")
        }
        clientUser = null
        deliveryUser = null
        activeOrder = null
        currentMode = null
    }

    fun closeSession(onSuccess: () -> Unit, onError: (String) -> Unit) {
        val order = activeOrder
        if (order != null && order.status != OrderStatus.COMPLETED && order.status != OrderStatus.CANCELLED) {
            onError("No puedes cerrar sesión con un pedido en curso.")
            return
        }

        val userId = prefs?.getString("user_id", null)
        if (userId != null) {
            viewModelScope.launch {
                runCatching {
                    SupabaseApi.setUserOnline(userId, false)
                }.onFailure {
                    Log.e("Rapidingo", "Error al cerrar sesion: ${it.message}")
                }
            }
        }
        orderJob?.cancel()
        reportsJob?.cancel()
        deliveryStatusJob?.cancel()
        clearLocalSession()
        isCheckingSession = false
        onSuccess()
    }

    private fun finalizeSessionLoad(user: User) {
        currentUserLocation = user.location
        if (user.role == UserRole.CLIENT) {
            clientUser = user
            currentMode = UserRole.CLIENT
        } else {
            deliveryUser = user.copy(isOnline = true)
            currentMode = UserRole.DELIVERY
            setUserOnline(true)
            loadReports(user.id)
        }
        observeActiveOrder(user)
        isCheckingSession = false
    }

    private fun observeAvailableDeliveries() {
        deliveryStatusJob?.cancel()
        deliveryStatusJob = viewModelScope.launch {
            while (true) {
                runCatching {
                    SupabaseApi.getDeliveryUsers()
                }.onSuccess { users ->
                    allDeliveryUsers = users
                    availableDeliveriesCount = users.count { it.isOnline && hasValidDispatchLocation(it.location) }
                }.onFailure {
                    Log.e("Rapidingo", "Error observando repartidores Supabase: ${it.message}")
                }
                delay(4000)
            }
        }
    }

    private fun loadReports(userId: String) {
        reportsJob?.cancel()
        reportsJob = viewModelScope.launch {
            while (true) {
                runCatching {
                    // Cargar historial local para los reportes
                    val ordersJson = prefs.getString("local_history_v2", "[]") ?: "[]"
                    val jsonArray = JSONArray(ordersJson)
                    val history = (0 until jsonArray.length()).map { i ->
                        val obj = jsonArray.getJSONObject(i)
                        Order(
                            id = obj.getString("id"),
                            description = obj.getString("detalle"),
                            totalPrice = obj.getDouble("total"),
                            servicePrice = obj.getDouble("servicio")
                        )
                    }
                    history.reversed()
                }.onSuccess {
                    completedOrdersList = it
                }.onFailure {
                    Log.e("Rapidingo", "Error cargando reportes locales: ${it.message}")
                }
                delay(10000)
            }
        }
    }

    private fun observeActiveOrder(user: User) {
        orderJob?.cancel()
        orderJob = viewModelScope.launch {
            while (true) {
                runCatching {
                    val mode = SupabaseApi.getDispatchMode()
                    dispatchMode = mode
                    val sortedOrders = SupabaseApi.getOrders().sortedByDescending { it.createdAt }
                    selectActiveOrder(user, sortedOrders, mode)
                }.onFailure {
                    Log.e("Rapidingo", "Error observando ordenes Supabase: ${it.message}")
                }
                delay(2500)
            }
        }
    }

    private fun selectActiveOrder(user: User, sortedOrders: List<Order>, currentModeDispatch: String) {
        val previousActiveOrder = activeOrder

        activeOrder = if (user.role == UserRole.CLIENT) {
            sortedOrders.find {
                it.clientId == user.id &&
                    it.status != OrderStatus.COMPLETED &&
                    it.status != OrderStatus.CANCELLED
            }
        } else {
            val myOrder = sortedOrders.find {
                it.deliveryId == user.id &&
                    it.status != OrderStatus.COMPLETED &&
                    it.status != OrderStatus.CANCELLED
            }
            val availableOrder = if (currentModeDispatch == "AUTOMATIC") {
                sortedOrders.find {
                    it.status == OrderStatus.PENDING_PRICE &&
                        (it.targetDeliveryId == user.id || it.targetDeliveryId.isNullOrBlank()) &&
                        !it.rejectedBy.contains(user.id)
                }
            } else {
                sortedOrders.find {
                    it.status == OrderStatus.PENDING_PRICE &&
                        it.targetDeliveryId == user.id &&
                        !it.rejectedBy.contains(user.id)
                }
            }
            myOrder ?: availableOrder
        }

        activeOrder?.let { prefs.edit { putString("active_order_id", it.id) } }

        if (previousActiveOrder != null && activeOrder == null &&
            previousActiveOrder.status != OrderStatus.COMPLETED &&
            previousActiveOrder.status != OrderStatus.CANCELLED
        ) {
            val isCancelled = sortedOrders.find { it.id == previousActiveOrder.id }?.status == OrderStatus.CANCELLED
            thankYouDialogMessage = if (isCancelled) {
                "LO SENTIMOS\nNO HUBO REPARTIDORES DISPONIBLES"
            } else {
                if (user.role == UserRole.CLIENT) {
                    "ENTREGA EXITOSA\nGRACIAS POR TU CONFIANZA"
                } else {
                    "PEDIDO COMPLETADO\nGRACIAS POR EL SERVICIO"
                }
            }
            showThankYouDialog = true
        }

        activeOrder?.let { order ->
            val deliveryDestination = order.destinationLocation ?: order.clientLocation
            if (order.deliveryLocation != null && deliveryDestination != null &&
                order.deliveryLocation.latitude != 0.0 && deliveryDestination.latitude != 0.0
            ) {
                fetchRoute(order.deliveryLocation, deliveryDestination)
            }

            if (lastStatus != null && order.chatHistory.size > lastChatSize) {
                val lastMsg = order.chatHistory.last()
                val myId = if (currentMode == UserRole.CLIENT) clientUser?.id else deliveryUser?.id
                if (lastMsg.senderId != myId) {
                    val title = "Nuevo mensaje de ${if (currentMode == UserRole.CLIENT) "Repartidor" else "Cliente"}"
                    val msg = lastMsg.text.ifBlank { "Te enviaron una imagen/archivo" }
                    sendSystemNotification(title, msg)
                    inAppNotificationMessage = msg
                }
            }
            lastChatSize = order.chatHistory.size

            if (order.status != lastStatus) {
                val statusMsg = when (order.status) {
                    OrderStatus.PENDING_PRICE -> if (currentMode == UserRole.DELIVERY && order.targetDeliveryId == user.id) "NUEVO PEDIDO RECIBIDO! Toca para cotizar." else null
                    OrderStatus.BIDDING -> if (currentMode == UserRole.CLIENT) "El repartidor esta cotizando tu pedido" else null
                    OrderStatus.WAITING_CONFIRM -> if (currentMode == UserRole.CLIENT) "TIENES UNA COTIZACION! Revisa el precio." else null
                    OrderStatus.CONFIRMED_BY_CLIENT -> if (currentMode == UserRole.DELIVERY) "PEDIDO ACEPTADO! Ve por los productos." else null
                    OrderStatus.PICKING_UP -> if (currentMode == UserRole.CLIENT) "El repartidor esta comprando tus productos" else null
                    OrderStatus.IN_DELIVERY -> if (currentMode == UserRole.CLIENT) "PEDIDO EN CAMINO! Siguelo en el mapa." else null
                    OrderStatus.DELIVERED_BY_REPARTIDOR -> if (currentMode == UserRole.CLIENT) "EL REPARTIDOR LLEGO A TU UBICACION!" else null
                    OrderStatus.COMPLETED -> null
                    OrderStatus.CANCELLED -> if (currentMode == UserRole.CLIENT) "LO SENTIMOS, PEDIDO CANCELADO." else null
                    else -> null
                }

                if (statusMsg != null && shouldShowStatusNotification(order.id, order.status)) {
                    sendSystemNotification("Rapidingo", statusMsg)
                    inAppNotificationMessage = statusMsg
                }
            }
            lastStatus = order.status
        } ?: run {
            lastChatSize = 0
            lastStatus = null
        }
    }

    private fun shouldShowStatusNotification(orderId: String, status: OrderStatus): Boolean {
        val key = "${orderId}_${status.name}"
        val shown = prefs.getStringSet(shownStatusNotificationsPref, emptySet()).orEmpty()
        if (shown.contains(key)) return false
        prefs.edit { putStringSet(shownStatusNotificationsPref, shown + key) }
        return true
    }

    fun setUserOnline(online: Boolean) {
        val userId = prefs.getString("user_id", null) ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.setUserOnline(userId, online)
            }.onSuccess {
                if (currentMode == UserRole.DELIVERY) {
                    deliveryUser = deliveryUser?.copy(isOnline = online)
                }
            }.onFailure {
                Log.e("Rapidingo", "Error al cambiar estado online: ${it.message}")
            }
        }
    }

    fun registerUser(name: String, email: String, phone: String, role: UserRole, context: Context, externalUserId: String? = null) {
        val finalRole = forcedRole ?: role
        val userId = externalUserId?.takeIf { it.isNotBlank() } ?: getAppId()
        val cleanEmail = email.trim().lowercase()
        val cleanPhone = phone.trim()

        isRegisteringUser = true
        viewModelScope.launch {
            runCatching {
                val existingByEmail = SupabaseApi.getUserByEmail(cleanEmail)
                val existingById = SupabaseApi.getUser(userId)
                val existing = existingByEmail ?: existingById
                if (existing == null && cleanPhone.isBlank()) {
                    isRegisteringUser = false
                    android.widget.Toast.makeText(
                        context,
                        "Ingresa tu numero de WhatsApp para registrarte por primera vez.",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }
                if (existing != null && existing.role != finalRole) {
                    val roleName = if (existing.role == UserRole.CLIENT) "CLIENTE" else "REPARTIDOR"
                    isRegisteringUser = false
                    android.widget.Toast.makeText(
                        context,
                        "BLOQUEADO: Este correo ya es $roleName y no puede cambiar.",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }

                val user = existing?.copy(
                    name = name.ifBlank { existing.name },
                    phone = cleanPhone.ifBlank { existing.phone },
                    email = cleanEmail,
                    location = currentUserLocation ?: existing.location,
                    isOnline = finalRole == UserRole.DELIVERY,
                    deviceId = existing.deviceId.ifBlank { existing.id }
                ) ?: User(
                    id = userId,
                    name = name,
                    phone = cleanPhone,
                    email = cleanEmail,
                    role = finalRole,
                    location = currentUserLocation,
                    isOnline = finalRole == UserRole.DELIVERY,
                    deviceId = userId
                )
                SupabaseApi.upsertUser(user)
                user
            }.onSuccess { user ->
                isRegisteringUser = false
                prefs.edit {
                    putString("user_id", user.id)
                    putString("user_role", user.role.name)
                    putString("user_email", user.email)
                    putString("app_instance_id", user.id)
                }
                if (finalRole == UserRole.CLIENT) {
                    clientUser = user
                    currentMode = UserRole.CLIENT
                } else {
                    deliveryUser = user
                    currentMode = UserRole.DELIVERY
                    loadReports(user.id)
                }
                observeActiveOrder(user)
                isRegistrationComplete = false
                val roleName = if (finalRole == UserRole.CLIENT) "cliente" else "repartidor"
                android.widget.Toast.makeText(context, "Listo, entrando como $roleName", android.widget.Toast.LENGTH_SHORT).show()
            }.onFailure {
                isRegisteringUser = false
                Log.e("Rapidingo", "Error en registro Supabase: ${it.message}")
                android.widget.Toast.makeText(
                    context,
                    "No se pudo registrar: ${it.message ?: "revisa conexion/Supabase"}",
                    android.widget.Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    fun loginRegisteredEmail(email: String, role: UserRole, context: Context) {
        val finalRole = forcedRole ?: role
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank()) return

        isRegisteringUser = true
        viewModelScope.launch {
            runCatching {
                SupabaseApi.getUserByEmail(cleanEmail)
            }.onSuccess { user ->
                isRegisteringUser = false
                if (user == null) return@onSuccess
                if (user.role != finalRole) {
                    val roleName = if (user.role == UserRole.CLIENT) "CLIENTE" else "REPARTIDOR"
                    android.widget.Toast.makeText(context, "Este correo ya es $roleName.", android.widget.Toast.LENGTH_LONG).show()
                    return@onSuccess
                }
                prefs.edit {
                    putString("user_id", user.id)
                    putString("user_role", user.role.name)
                    putString("user_email", user.email)
                    putString("app_instance_id", user.id)
                }
                finalizeSessionLoad(user)
                android.widget.Toast.makeText(context, "Sesion recuperada: ${user.name}", android.widget.Toast.LENGTH_SHORT).show()
            }.onFailure {
                isRegisteringUser = false
                Log.e("Rapidingo", "Error recuperando usuario por email: ${it.message}")
            }
        }
    }

    fun updateWhatsappPhone(phone: String, context: Context) {
        val cleanPhone = phone.trim()
        if (cleanPhone.isBlank()) {
            android.widget.Toast.makeText(context, "Ingresa tu numero de WhatsApp", android.widget.Toast.LENGTH_SHORT).show()
            return
        }
        val userId = prefs.getString("user_id", null) ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.updateUser(userId, JSONObject().put("phone", cleanPhone))
                activeOrder?.let { order ->
                    when {
                        currentMode == UserRole.CLIENT && order.clientId == userId -> {
                            SupabaseApi.updateOrder(order.id, JSONObject().put("client_phone", cleanPhone))
                        }
                        currentMode == UserRole.DELIVERY && order.deliveryId == userId -> {
                            SupabaseApi.updateOrder(order.id, JSONObject().put("delivery_phone", cleanPhone))
                        }
                    }
                }
            }.onSuccess {
                if (currentMode == UserRole.CLIENT) {
                    clientUser = clientUser?.copy(phone = cleanPhone)
                    activeOrder = activeOrder?.takeIf { it.clientId == userId }?.copy(clientPhone = cleanPhone) ?: activeOrder
                } else if (currentMode == UserRole.DELIVERY) {
                    deliveryUser = deliveryUser?.copy(phone = cleanPhone)
                    activeOrder = activeOrder?.takeIf { it.deliveryId == userId }?.copy(deliveryPhone = cleanPhone) ?: activeOrder
                }
                android.widget.Toast.makeText(context, "WhatsApp guardado", android.widget.Toast.LENGTH_SHORT).show()
            }.onFailure {
                Log.e("Rapidingo", "Error guardando WhatsApp: ${it.message}")
                android.widget.Toast.makeText(context, "No se pudo guardar el WhatsApp", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }

    fun updateLocation(lat: Double, lng: Double) {
        if (lat == 0.0 && lng == 0.0) return
        val newLoc = MyLatLng(lat, lng)
        currentUserLocation = newLoc

        if (currentMode == UserRole.DELIVERY) {
            deliveryUser = deliveryUser?.copy(location = newLoc)
        } else if (currentMode == UserRole.CLIENT) {
            clientUser = clientUser?.copy(location = newLoc)
        }

        val userId = prefs.getString("user_id", null) ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.updateUser(userId, JSONObject().put("location", newLoc.toJson()))
                activeOrder?.let { order ->
                    if (currentMode == UserRole.CLIENT && order.clientId == userId) {
                        SupabaseApi.updateOrder(order.id, JSONObject().put("client_location", newLoc.toJson()))
                    } else if (currentMode == UserRole.DELIVERY && order.deliveryId == userId) {
                        val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
                        if (isFoodOrder && order.status != OrderStatus.IN_DELIVERY && order.status != OrderStatus.DELIVERED_BY_REPARTIDOR) {
                            return@let
                        }
                        val updates = JSONObject().put("delivery_location", newLoc.toJson())
                        val lastLoc = order.deliveryPath.lastOrNull()
                        if (lastLoc == null ||
                            kotlin.math.abs(lastLoc.latitude - lat) > 0.00001 ||
                            kotlin.math.abs(lastLoc.longitude - lng) > 0.00001
                        ) {
                            updates.put("delivery_path", JSONArray((order.deliveryPath + newLoc).map { it.toJson() }))
                        }
                        SupabaseApi.updateOrder(order.id, updates)

                        val deliveryDestination = order.destinationLocation ?: order.clientLocation
                        if (order.status == OrderStatus.IN_DELIVERY && deliveryDestination != null) {
                            val distance = calculateDistance(newLoc, deliveryDestination)
                            if (distance < 50.0) {
                                sendSystemNotification("Rapidingo", "El repartidor ha llegado a tu ubicacion!")
                                inAppNotificationMessage = "REPARTIDOR LLEGO!"
                            }
                        }
                    }
                }
            }.onFailure {
                Log.e("Rapidingo", "Error actualizando ubicacion Supabase: ${it.message}")
            }
        }
    }

    fun createOrder(category: String, description: String, destinationLocation: MyLatLng) {
        val client = clientUser ?: return
        val orderId = System.currentTimeMillis().toString()
        val clientLocation = currentUserLocation ?: client.location ?: trinidadCenter

        viewModelScope.launch {
            runCatching {
                val orders = SupabaseApi.getOrders()
                val mode = SupabaseApi.getDispatchMode()
                dispatchMode = mode
                val targetDelivery = if (mode == "AUTOMATIC") {
                    selectTargetDelivery(destinationLocation, orders)
                } else {
                    null
                }
                val order = Order(
                    id = orderId,
                    clientId = client.id,
                    clientName = client.name,
                    clientPhone = client.phone,
                    category = category,
                    description = description.uppercase(),
                    status = OrderStatus.PENDING_PRICE,
                    createdAt = System.currentTimeMillis(),
                    clientLocation = clientLocation,
                    destinationLocation = destinationLocation,
                    targetDeliveryId = targetDelivery?.id
                )
                SupabaseApi.upsertOrder(order)
                order
            }.onSuccess {
                activeOrder = it
                prefs.edit { putString("active_order_id", orderId) }
                lastStatus = OrderStatus.PENDING_PRICE
                lastChatSize = 0
            }.onFailure {
                Log.e("Rapidingo", "Error al crear pedido Supabase: ${it.message}")
            }
        }
    }

    fun startBidding() {
        val orderId = activeOrder?.id ?: return
        val deliveryId = prefs.getString("user_id", null) ?: return
        val currentLocation = currentUserLocation ?: deliveryUser?.location ?: MyLatLng(0.0, 0.0)
        val updates = JSONObject()
            .put("status", OrderStatus.BIDDING.name)
            .put("delivery_id", deliveryId)
            .put("delivery_name", deliveryUser?.name ?: "")
            .put("delivery_phone", deliveryUser?.phone ?: "")
            .put("delivery_location", currentLocation.toJson())
            .put("delivery_path", if (currentLocation.latitude != 0.0) JSONArray(listOf(currentLocation.toJson())) else JSONArray())

        viewModelScope.launch {
            runCatching {
                val claimed = SupabaseApi.claimOrderForBidding(orderId, deliveryId, updates)
                if (!claimed) error("Pedido ya tomado por otro repartidor")
            }.onSuccess {
                prefs.edit { putString("active_order_id", orderId) }
                lastStatus = OrderStatus.BIDDING
                lastChatSize = activeOrder?.chatHistory?.size ?: 0
            }.onFailure {
                Log.e("Rapidingo", "Error al tomar pedido Supabase: ${it.message}")
            }
        }
    }

    fun setOrderPrices(productPrice: Double, servicePrice: Double) {
        val orderId = activeOrder?.id ?: return
        val updates = JSONObject()
            .put("product_price", productPrice)
            .put("service_price", servicePrice)
            .put("total_price", productPrice + servicePrice)
            .put("status", OrderStatus.WAITING_CONFIRM.name)

        viewModelScope.launch {
            runCatching {
                SupabaseApi.updateOrder(orderId, updates)
            }.onSuccess {
                lastStatus = OrderStatus.WAITING_CONFIRM
            }.onFailure {
                Log.e("Rapidingo", "Error guardando precios Supabase: ${it.message}")
            }
        }
    }

    fun updateOrderStatus(status: OrderStatus) {
        val orderId = activeOrder?.id ?: return
        viewModelScope.launch {
            runCatching {
                if (status == OrderStatus.COMPLETED) {
                    val orderToSave = activeOrder
                    if (orderToSave != null) {
                        saveOrderLocally(orderToSave.copy(status = OrderStatus.COMPLETED))
                        SupabaseApi.updateOrder(orderId, JSONObject().put("status", OrderStatus.COMPLETED.name))
                        
                        // Mostrar mensaje de gracias al usuario que finaliza
                        thankYouDialogMessage = if (currentMode == UserRole.CLIENT) {
                            "ENTREGA EXITOSA\nGRACIAS POR TU CONFIANZA"
                        } else {
                            "PEDIDO COMPLETADO\nGRACIAS POR EL SERVICIO"
                        }
                        showThankYouDialog = true
                    }
                    activeOrder = null
                } else if (status == OrderStatus.CANCELLED) {
                    activeOrder?.let { deleteOrderMedia(it) }
                    SupabaseApi.deleteOrder(orderId)
                    activeOrder = null
                } else {
                    SupabaseApi.updateOrder(orderId, JSONObject().put("status", status.name))
                }
            }.onFailure {
                Log.e("Rapidingo", "Error al procesar estado final: ${it.message}")
            }
        }
    }

    fun confirmRestaurantPickup(restaurantId: String, restaurantName: String, allPickedUp: Boolean) {
        val currentOrder = activeOrder ?: return
        val now = System.currentTimeMillis()
        val systemMsg = ChatMessage(
            id = "sys-pickup-$restaurantId-$now",
            senderId = "system",
            text = "RESTAURANT_STATUS:$restaurantId:DELIVERED",
            timestamp = now
        )
        val notificationMsg = ChatMessage(
            id = "sys-notif-pickup-$restaurantId-$now",
            senderId = "system",
            text = "Delivery recibio el pedido de $restaurantName.",
            timestamp = now
        )
        val nextHistory = currentOrder.chatHistory + systemMsg + notificationMsg
        val nextStatus = if (allPickedUp) OrderStatus.IN_DELIVERY else OrderStatus.PICKING_UP
        val nextOrder = currentOrder.copy(status = nextStatus, chatHistory = nextHistory)

        activeOrder = nextOrder
        lastChatSize = nextHistory.size
        lastReadChatSize = nextHistory.size

        viewModelScope.launch {
            runCatching {
                SupabaseApi.updateOrder(
                    currentOrder.id,
                    JSONObject()
                        .put("status", nextStatus.name)
                        .put("chat_history", JSONArray(nextHistory.map { it.toJson() }))
                )
            }.onFailure {
                Log.e("Rapidingo", "Error confirmando recojo restaurante: ${it.message}")
            }
        }
    }

    fun rejectOrder() {
        val order = activeOrder ?: return
        val deliveryId = prefs.getString("user_id", null) ?: return
        viewModelScope.launch {
            runCatching {
                val orders = SupabaseApi.getOrders()
                val rejectedBy = (order.rejectedBy + deliveryId).distinct()
                val nextDelivery = selectTargetDelivery(order.destinationLocation ?: order.clientLocation ?: trinidadCenter, orders, rejectedBy)
                SupabaseApi.updateOrder(
                    order.id,
                    JSONObject()
                        .put("rejected_by", JSONArray(rejectedBy))
                        .putNullable("target_delivery_id", nextDelivery?.id)
                        .putNullable("delivery_id", null)
                        .putNullable("delivery_name", nextDelivery?.name)
                        .putNullable("delivery_phone", nextDelivery?.phone)
                        .putNullable("delivery_location", null)
                        .put("delivery_path", JSONArray())
                        .put("status", OrderStatus.PENDING_PRICE.name)
                )
            }.onSuccess {
                activeOrder = null
                prefs.edit { remove("active_order_id") }
            }.onFailure {
                Log.e("Rapidingo", "Error rechazando pedido: ${it.message}")
            }
        }
    }

    fun uploadPaymentPhoto(uri: Uri) {
        val order = activeOrder ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.uploadPaymentPhoto(appContext, order.id, uri)
            }.onSuccess { url ->
                SupabaseApi.updateOrder(order.id, JSONObject().put("payment_photo_url", url))
                activeOrder = order.copy(paymentPhotoUrl = url)
            }.onFailure {
                Log.e("Rapidingo", "Error subiendo comprobante Supabase: ${it.message}")
            }
        }
    }

    fun uploadPhoto(uri: Uri) {
        val order = activeOrder ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.uploadOrderPhoto(appContext, order.id, uri)
            }.onSuccess { url ->
                SupabaseApi.updateOrder(order.id, JSONObject().put("photo_url", url))
                activeOrder = order.copy(photoUrl = url)
            }.onFailure {
                Log.e("Rapidingo", "Error subiendo foto Supabase: ${it.message}")
            }
        }
    }

    fun addChatMessage(text: String, senderId: String, imageUrl: String? = null, fileUrl: String? = null) {
        val currentOrder = activeOrder ?: return
        val newMessage = ChatMessage(
            id = System.currentTimeMillis().toString(),
            senderId = senderId,
            text = text,
            imageUrl = imageUrl,
            fileUrl = fileUrl,
            timestamp = System.currentTimeMillis()
        )
        val newHistory = currentOrder.chatHistory + newMessage
        activeOrder = currentOrder.copy(chatHistory = newHistory)
        lastChatSize = newHistory.size
        lastReadChatSize = newHistory.size

        viewModelScope.launch {
            runCatching {
                SupabaseApi.updateOrder(
                    currentOrder.id,
                    JSONObject().put("chat_history", JSONArray(newHistory.map { it.toJson() }))
                )
            }.onFailure {
                Log.e("Rapidingo", "Error guardando chat Supabase: ${it.message}")
            }
        }
    }

    fun uploadChatFile(uri: Uri, type: String, onComplete: (String) -> Unit) {
        val orderId = activeOrder?.id ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.uploadChatFile(appContext, orderId, uri, type)
            }.onSuccess(onComplete)
                .onFailure { Log.e("Rapidingo", "Error subiendo archivo chat Supabase: ${it.message}") }
        }
    }

    fun updateWazeStatus(active: Boolean) {
        val orderId = activeOrder?.id ?: return
        viewModelScope.launch {
            runCatching {
                SupabaseApi.updateOrder(orderId, JSONObject().put("is_waze_active", active))
            }.onFailure {
                Log.e("Rapidingo", "Error actualizando Waze Supabase: ${it.message}")
            }
        }
    }

    private fun saveOrderLocally(order: Order) {
        val ordersJson = prefs.getString("local_history_v2", "[]") ?: "[]"
        try {
            val jsonArray = JSONArray(ordersJson)
            val summary = JSONObject().apply {
                put("id", order.id)
                put("fecha", java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date()))
                put("repartidor", order.deliveryName ?: "N/A")
                put("detalle", order.description)
                put("total", order.totalPrice ?: 0.0)
                put("servicio", order.servicePrice ?: 0.0)
            }
            jsonArray.put(summary)
            prefs.edit { putString("local_history_v2", jsonArray.toString()) }
            Log.d("Rapidingo", "Pedido guardado localmente y limpiado de la nube")
        } catch (e: Exception) {
            Log.e("Rapidingo", "Error al guardar historial local: ${e.message}")
        }
    }

    private fun deleteOrderMedia(order: Order) {
        val urls = buildList {
            order.photoUrl?.let { add(it) }
            order.paymentPhotoUrl?.let { add(it) }
            order.chatHistory.forEach { message ->
                message.imageUrl?.let { add(it) }
                message.fileUrl?.let { add(it) }
            }
        }
        viewModelScope.launch {
            runCatching { SupabaseApi.deleteMedia(urls) }
                .onFailure { Log.e("Rapidingo", "Error eliminando media Supabase: ${it.message}") }
        }
    }

    private fun fetchRoute(start: MyLatLng, end: MyLatLng) {
        val now = System.currentTimeMillis()
        if (now - lastRouteQueryTime < 5000) return
        lastRouteQueryTime = now

        viewModelScope.launch(Dispatchers.IO) {
            try {
                val urlStr = "https://api.openrouteservice.org/v2/directions/driving-car?" +
                    "api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIxNGYyZjY2MmZhNjQ1ZmU4MWZhMjQ1YWUwOTRhNjZiIiwiaCI6Im11cm11cjY0In0=&" +
                    "start=${start.longitude},${start.latitude}&" +
                    "end=${end.longitude},${end.latitude}"

                val response = URL(urlStr).openConnection().getInputStream().bufferedReader().use { it.readText() }
                val coords = JSONObject(response)
                    .getJSONArray("features")
                    .getJSONObject(0)
                    .getJSONObject("geometry")
                    .getJSONArray("coordinates")
                val points = mutableListOf<MyLatLng>()
                for (i in 0 until coords.length()) {
                    val point = coords.getJSONArray(i)
                    points.add(MyLatLng(point.getDouble(1), point.getDouble(0)))
                }
                withContext(Dispatchers.Main) { plannedRoute = points }
            } catch (e: Exception) {
                Log.e("Rapidingo", "Error fetching route from ORS: ${e.message}")
            }
        }
    }

    private fun calculateDistance(loc1: MyLatLng, loc2: MyLatLng): Double {
        val r = 6371e3
        val phi1 = loc1.latitude * kotlin.math.PI / 180
        val phi2 = loc2.latitude * kotlin.math.PI / 180
        val deltaPhi = (loc2.latitude - loc1.latitude) * kotlin.math.PI / 180
        val deltaLambda = (loc2.longitude - loc1.longitude) * kotlin.math.PI / 180
        val a = kotlin.math.sin(deltaPhi / 2) * kotlin.math.sin(deltaPhi / 2) +
            kotlin.math.cos(phi1) * kotlin.math.cos(phi2) *
            kotlin.math.sin(deltaLambda / 2) * kotlin.math.sin(deltaLambda / 2)
        val c = 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
        return r * c
    }

    private fun hasValidDispatchLocation(location: MyLatLng?): Boolean {
        return location != null && (location.latitude != 0.0 || location.longitude != 0.0)
    }

    private fun isActiveDispatchOrder(order: Order): Boolean {
        return order.status != OrderStatus.COMPLETED && order.status != OrderStatus.CANCELLED
    }

    private fun availableDeliveryCandidates(
        destinationLocation: MyLatLng,
        orders: List<Order>,
        rejectedBy: List<String> = emptyList()
    ): List<User> {
        val busyDeliveryIds = orders
            .filter { isActiveDispatchOrder(it) }
            .flatMap { listOfNotNull(it.deliveryId, it.targetDeliveryId) }
            .toSet()

        return allDeliveryUsers
            .filter {
                it.role == UserRole.DELIVERY &&
                    it.isOnline &&
                    hasValidDispatchLocation(it.location) &&
                    !busyDeliveryIds.contains(it.id) &&
                    !rejectedBy.contains(it.id)
            }
            .sortedBy { calculateDistance(destinationLocation, it.location!!) }
    }

    private fun selectTargetDelivery(
        destinationLocation: MyLatLng,
        orders: List<Order>,
        rejectedBy: List<String> = emptyList()
    ): User? {
        return availableDeliveryCandidates(destinationLocation, orders, rejectedBy)
            .take(3)
            .randomOrNull()
    }

    private fun MyLatLng.toJson(): JSONObject = JSONObject()
        .put("latitude", latitude)
        .put("longitude", longitude)

    private fun ChatMessage.toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("senderId", senderId)
        put("text", text)
        putNullable("imageUrl", imageUrl)
        putNullable("fileUrl", fileUrl)
        put("timestamp", timestamp)
    }

    private fun JSONObject.putNullable(name: String, value: Any?): JSONObject {
        if (value == null) put(name, JSONObject.NULL) else put(name, value)
        return this
    }

    override fun onCleared() {
        orderJob?.cancel()
        deliveryStatusJob?.cancel()
        reportsJob?.cancel()
        super.onCleared()
    }
}
