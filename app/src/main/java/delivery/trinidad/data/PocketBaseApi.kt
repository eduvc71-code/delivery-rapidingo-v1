package delivery.trinidad.data

import android.util.Log
import delivery.trinidad.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import org.json.JSONObject

@Serializable
data class PbUser(
    val id: String,
    val name: String = "",
    val email: String = "",
    val role: String = "CLIENT",
    val phone: String = "",
    val isOnline: Boolean = false,
    val location: MyLatLng? = null
)

@Serializable
data class PbOrder(
    val id: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("delivery_id") val deliveryId: String? = null,
    val description: String = "",
    val category: String = "OTROS",
    val status: String = "PENDING_PRICE",
    @SerialName("product_price") val productPrice: Double? = null,
    @SerialName("service_price") val servicePrice: Double? = null,
    val chat: JsonElement? = null,
    @SerialName("created") val created: String = ""
)

@Serializable
data class PbListResponse<T>(
    val items: List<T>
)

object PocketBaseApi {
    private const val TAG = "PocketBaseApi"
    // Usamos la IP hardcoded temporalmente si BuildConfig falla, 
    // pero idealmente viene del build.gradle.kts
    private val baseUrl = "http://192.168.1.5:8090"

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
                encodeDefaults = true
            })
        }
    }

    suspend fun getUser(id: String): User? {
        return try {
            val response: PbUser = client.get("$baseUrl/api/collections/users/records/$id").body()
            mapUser(response)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting user $id: ${e.message}")
            null
        }
    }

    suspend fun getUserByEmail(email: String): User? {
        return try {
            val response: PbListResponse<PbUser> = client.get("$baseUrl/api/collections/users/records") {
                parameter("filter", "email='$email'")
            }.body()
            response.items.firstOrNull()?.let { mapUser(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting user by email $email: ${e.message}")
            null
        }
    }

    suspend fun upsertUser(user: User) {
        try {
            val pbUser = JsonObject(mapOf(
                "name" to JsonPrimitive(user.name),
                "email" to JsonPrimitive(user.email),
                "role" to JsonPrimitive(user.role.name),
                "phone" to JsonPrimitive(user.phone),
                "isOnline" to JsonPrimitive(user.isOnline)
            ))
            
            val check = client.get("$baseUrl/api/collections/users/records/${user.id}")
            if (check.status == HttpStatusCode.OK) {
                client.patch("$baseUrl/api/collections/users/records/${user.id}") {
                    contentType(ContentType.Application.Json)
                    setBody(pbUser)
                }
            } else {
                client.post("$baseUrl/api/collections/users/records") {
                    contentType(ContentType.Application.Json)
                    setBody(pbUser.toMutableMap().apply { put("id", JsonPrimitive(user.id)) })
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error upserting user: ${e.message}")
        }
    }

    suspend fun updateUser(id: String, values: JSONObject) {
        try {
            client.patch("$baseUrl/api/collections/users/records/$id") {
                contentType(ContentType.Application.Json)
                setBody(values.toString())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating user: ${e.message}")
        }
    }

    suspend fun getDeliveryUsers(): List<User> {
        return try {
            val response: PbListResponse<PbUser> = client.get("$baseUrl/api/collections/users/records") {
                parameter("filter", "role='DELIVERY'")
            }.body()
            response.items.map { mapUser(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting delivery users: ${e.message}")
            emptyList()
        }
    }

    suspend fun getOrders(): List<Order> {
        return try {
            val response: PbListResponse<PbOrder> = client.get("$baseUrl/api/collections/orders/records") {
                parameter("sort", "-created")
            }.body()
            response.items.map { mapOrder(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting orders: ${e.message}")
            emptyList()
        }
    }

    suspend fun upsertOrder(order: Order) {
        try {
            val body = JsonObject(mapOf(
                "client_id" to JsonPrimitive(order.clientId),
                "delivery_id" to JsonPrimitive(order.deliveryId ?: ""),
                "description" to JsonPrimitive(order.description),
                "category" to JsonPrimitive(order.category),
                "status" to JsonPrimitive(order.status.name),
                "product_price" to JsonPrimitive(order.productPrice ?: 0.0),
                "service_price" to JsonPrimitive(order.servicePrice ?: 0.0)
            ))

            val check = client.get("$baseUrl/api/collections/orders/records/${order.id}")
            if (check.status == HttpStatusCode.OK) {
                client.patch("$baseUrl/api/collections/orders/records/${order.id}") {
                    contentType(ContentType.Application.Json)
                    setBody(body)
                }
            } else {
                client.post("$baseUrl/api/collections/orders/records") {
                    contentType(ContentType.Application.Json)
                    setBody(body.toMutableMap().apply { put("id", JsonPrimitive(order.id)) })
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error upserting order: ${e.message}")
        }
    }

    suspend fun updateOrder(id: String, values: JSONObject) {
        try {
            client.patch("$baseUrl/api/collections/orders/records/$id") {
                contentType(ContentType.Application.Json)
                setBody(values.toString())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating order: ${e.message}")
        }
    }

    suspend fun deleteOrder(id: String) {
        try {
            client.delete("$baseUrl/api/collections/orders/records/$id")
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting order: ${e.message}")
        }
    }

    private fun mapUser(pb: PbUser): User {
        return User(
            id = pb.id,
            name = pb.name,
            email = pb.email,
            role = UserRole.valueOf(pb.role),
            phone = pb.phone,
            isOnline = pb.isOnline,
            location = pb.location
        )
    }

    private fun mapOrder(pb: PbOrder): Order {
        return Order(
            id = pb.id,
            clientId = pb.clientId,
            deliveryId = pb.deliveryId,
            description = pb.description,
            category = pb.category,
            status = OrderStatus.valueOf(pb.status),
            productPrice = pb.productPrice,
            servicePrice = pb.servicePrice,
            totalPrice = (pb.productPrice ?: 0.0) + (pb.servicePrice ?: 0.0)
        )
    }
}
