package delivery.trinidad

import kotlinx.serialization.Serializable

@Serializable
data class MyLatLng(
    val latitude: Double = 0.0,
    val longitude: Double = 0.0
)

@Serializable
enum class UserRole {
    CLIENT, DELIVERY
}

@Serializable
enum class OrderStatus {
    PENDING_PRICE,      // Cliente envió pedido, esperando repartidor
    BIDDING,            // Repartidor está ingresando precios (cotizando)
    WAITING_CONFIRM,    // Repartidor envió precios, esperando cliente
    CONFIRMED_BY_CLIENT,// Cliente aceptó el precio
    PICKING_UP,         // Repartidor comprando/recogiendo el producto
    IN_DELIVERY,        // Repartidor en camino al cliente
    DELIVERED_BY_REPARTIDOR, // Repartidor marcó como entregado
    COMPLETED,           // Cliente marcó como recibido (Fin)
    CANCELLED;           // El pedido fue cancelado

    fun toSpanish(): String = when(this) {
        PENDING_PRICE -> "ESPERANDO REPARTIDOR"
        BIDDING -> "COTIZANDO PRECIO"
        WAITING_CONFIRM -> "ESPERANDO TU CONFIRMACIÓN"
        CONFIRMED_BY_CLIENT -> "PEDIDO CONFIRMADO"
        PICKING_UP -> "COMPRANDO PRODUCTOS"
        IN_DELIVERY -> "EN RUTA DE ENTREGA"
        DELIVERED_BY_REPARTIDOR -> "¡REPARTIDOR LLEGÓ!"
        COMPLETED -> "PEDIDO COMPLETADO"
        CANCELLED -> "PEDIDO CANCELADO"
    }
}

@Serializable
data class User(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val role: UserRole = UserRole.CLIENT,
    val location: MyLatLng? = null,
    var isOnline: Boolean = false,
    val deviceId: String = ""
)

@Serializable
data class ChatMessage(
    val id: String = "",
    val senderId: String = "",
    val text: String = "",
    val imageUrl: String? = null,
    val fileUrl: String? = null,
    val timestamp: Long = 0
)

@Serializable
data class Order(
    val id: String = "",
    val clientId: String = "",
    val clientName: String = "",
    val clientPhone: String = "",
    val deliveryId: String? = null,
    val deliveryName: String? = null,
    val deliveryPhone: String? = null,
    val category: String = "OTROS", // SUPERMERCADO, FARMACIA, OTROS
    val description: String = "",
    val status: OrderStatus = OrderStatus.PENDING_PRICE,
    val productPrice: Double? = null,
    val servicePrice: Double? = null,
    val totalPrice: Double? = null,
    val photoUrl: String? = null,
    val paymentPhotoUrl: String? = null,
    val createdAt: Long = 0,
    val chatHistory: List<ChatMessage> = emptyList(),
    val clientLocation: MyLatLng? = null,
    val destinationLocation: MyLatLng? = null,
    val deliveryLocation: MyLatLng? = null,
    val deliveryPath: List<MyLatLng> = emptyList(),
    val isWazeActive: Boolean = false,
    val targetDeliveryId: String? = null,
    val rejectedBy: List<String> = emptyList()
)

@Serializable
data class TempOrderItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val restaurantId: String,
    val restaurantName: String,
    val productName: String,
    val quantity: Int = 1
)

@Serializable
data class Restaurant(
    val id: String,
    val name: String,
    val category: String,
    val rating: Double = 4.5,
    val deliveryTime: String = "25-35 min",
    val deliveryFee: Double = 5.0,
    val minOrder: Double = 15.0,
    val phone: String,
    val address: String,
    val schedule: String,
    val logoUrl: String? = null,
    val menuUrl: String? = null,
    val logoColor: Long = 0xFFD32F2F // Usamos Long para color hexadecimal en lugar de Compose Color en el modelo serializable
)

@Serializable
data class QuoteRow(
    val restaurant: String,
    val item: String,
    val quantity: Int,
    var unitPrice: String = ""
)
