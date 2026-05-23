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
    PENDING_PRICE,
    BIDDING,
    WAITING_CONFIRM,
    CONFIRMED_BY_CLIENT,
    PICKING_UP,
    IN_DELIVERY,
    DELIVERED_BY_REPARTIDOR,
    COMPLETED,
    CANCELLED;

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
    val category: String = "OTROS",
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