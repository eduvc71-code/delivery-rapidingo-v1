package delivery.trinidad.data

import android.content.Context
import android.net.Uri
import android.util.Log
import delivery.trinidad.BuildConfig
import delivery.trinidad.ChatMessage
import delivery.trinidad.MyLatLng
import delivery.trinidad.Order
import delivery.trinidad.OrderStatus
import delivery.trinidad.User
import delivery.trinidad.UserRole
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

object SupabaseApi {
    private const val TAG = "SupabaseApi"
    private const val MEDIA_BUCKET = "order-media"

    private val baseUrl: String
        get() = BuildConfig.SUPABASE_URL.trimEnd('/')

    private val anonKey: String
        get() = BuildConfig.SUPABASE_ANON_KEY

    suspend fun getUser(id: String): User? {
        val response = request("GET", "/rest/v1/users?id=eq.$id&limit=1")
        val array = JSONArray(response)
        return if (array.length() == 0) null else parseUser(array.getJSONObject(0))
    }

    suspend fun getUserByEmail(email: String): User? {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.isBlank()) return null
        val response = request("GET", "/rest/v1/users?email=eq.${urlEncode(cleanEmail)}&limit=1")
        val array = JSONArray(response)
        return if (array.length() == 0) null else parseUser(array.getJSONObject(0))
    }

    suspend fun upsertUser(user: User) {
        request(
            method = "POST",
            path = "/rest/v1/users?on_conflict=id",
            body = user.toJson(),
            prefer = "resolution=merge-duplicates"
        )
    }

    suspend fun updateUser(id: String, values: JSONObject) {
        request("PATCH", "/rest/v1/users?id=eq.$id", values)
    }

    suspend fun setUserOnline(userId: String, isOnline: Boolean) {
        request("PATCH", "/rest/v1/users?id=eq.$userId", JSONObject().put("online", isOnline))
    }

    suspend fun getDeliveryUsers(): List<User> {
        val response = request("GET", "/rest/v1/users?role=eq.DELIVERY&order=name.asc")
        return JSONArray(response).toObjectList(::parseUser)
    }

    suspend fun getDispatchMode(): String {
        return try {
            val response = request("GET", "/rest/v1/config?key=eq.dispatch_mode&limit=1")
            val array = JSONArray(response)
            if (array.length() == 0) "AUTOMATIC" else array.getJSONObject(0).optString("value", "AUTOMATIC")
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo dispatch_mode: ${e.message}")
            "AUTOMATIC"
        }
    }

    suspend fun getOrders(): List<Order> {
        val response = request("GET", "/rest/v1/orders?order=created_at.desc")
        return JSONArray(response).toObjectList(::parseOrder)
    }

    suspend fun upsertOrder(order: Order) {
        request(
            method = "POST",
            path = "/rest/v1/orders?on_conflict=id",
            body = order.toJson(),
            prefer = "resolution=merge-duplicates"
        )
    }

    suspend fun updateOrder(id: String, values: JSONObject) {
        request("PATCH", "/rest/v1/orders?id=eq.$id", values)
    }

    suspend fun claimOrderForBidding(orderId: String, deliveryId: String, values: JSONObject): Boolean {
        val response = request(
            method = "PATCH",
            path = "/rest/v1/orders?id=eq.$orderId&status=eq.${OrderStatus.PENDING_PRICE.name}&delivery_id=is.null&or=(target_delivery_id.is.null,target_delivery_id.eq.$deliveryId)",
            body = values,
            prefer = "return=representation"
        )
        return JSONArray(response).length() > 0
    }

    suspend fun deleteOrder(id: String) {
        request("DELETE", "/rest/v1/orders?id=eq.$id")
    }

    suspend fun getReports(deliveryId: String): List<Order> {
        val response = request(
            "GET",
            "/rest/v1/delivery_reports?delivery_id=eq.$deliveryId&order=completed_at.desc"
        )
        return JSONArray(response).toObjectList(::parseReport)
    }

    suspend fun saveDeliveryReport(order: Order) {
        val report = JSONObject().apply {
            put("id", order.id)
            put("delivery_id", order.deliveryId)
            put("delivery_name", order.deliveryName)
            put("client_name", order.clientName)
            put("category", order.category)
            put("description", order.description)
            put("status", OrderStatus.COMPLETED.name)
            putNullable("product_price", order.productPrice)
            putNullable("service_price", order.servicePrice)
            putNullable("total_price", order.totalPrice)
            put("created_at", order.createdAt)
        }

        request(
            method = "POST",
            path = "/rest/v1/delivery_reports?on_conflict=id",
            body = report,
            prefer = "resolution=merge-duplicates"
        )
    }

    suspend fun uploadOrderPhoto(context: Context, orderId: String, uri: Uri): String {
        return uploadFile(context, "orders/$orderId.jpg", uri)
    }

    suspend fun uploadPaymentPhoto(context: Context, orderId: String, uri: Uri): String {
        return uploadFile(context, "payments/${orderId}_${System.currentTimeMillis()}.jpg", uri)
    }

    suspend fun uploadChatFile(context: Context, orderId: String, uri: Uri, type: String): String {
        val ext = if (type == "image") "jpg" else "file"
        val folder = if (type == "image") "chat_images" else "chat_files"
        return uploadFile(context, "$folder/$orderId/${UUID.randomUUID()}.$ext", uri)
    }

    suspend fun deleteMedia(urls: List<String>) {
        val paths = urls.mapNotNull(::storagePathFromPublicUrl).distinct()
        if (paths.isEmpty()) return
        request(
            method = "POST",
            path = "/storage/v1/object/$MEDIA_BUCKET/remove",
            body = JSONObject().put("prefixes", JSONArray(paths))
        )
    }

    private suspend fun uploadFile(context: Context, path: String, uri: Uri): String = withContext(Dispatchers.IO) {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: error("No se pudo leer el archivo: $uri")
        val connection = openConnection("POST", "/storage/v1/object/$MEDIA_BUCKET/$path")
        connection.setRequestProperty("Content-Type", guessContentType(path))
        connection.setRequestProperty("x-upsert", "true")
        connection.doOutput = true
        connection.outputStream.use { it.write(bytes) }
        readResponse(connection)
        "$baseUrl/storage/v1/object/public/$MEDIA_BUCKET/$path"
    }

    private suspend fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        prefer: String? = null
    ): String = withContext(Dispatchers.IO) {
        val connection = openConnection(method, path)
        if (prefer != null) connection.setRequestProperty("Prefer", prefer)
        if (body != null) {
            connection.doOutput = true
            connection.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        readResponse(connection)
    }

    private fun openConnection(method: String, path: String): HttpURLConnection {
        check(baseUrl.isNotBlank() && anonKey.isNotBlank()) {
            "Faltan SUPABASE_URL o SUPABASE_ANON_KEY en local.properties"
        }
        return (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            setRequestProperty("apikey", anonKey)
            setRequestProperty("Authorization", "Bearer $anonKey")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            connectTimeout = 15000
            readTimeout = 15000
        }
    }

    private fun readResponse(connection: HttpURLConnection): String {
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        if (code !in 200..299) {
            Log.e(TAG, "Supabase error $code: $text")
            error("Supabase error $code: $text")
        }
        return text.ifBlank { "[]" }
    }

    private fun parseUser(json: JSONObject): User {
        return User(
            id = json.optString("id"),
            name = json.optString("name"),
            phone = json.optString("phone"),
            email = json.optString("email"),
            role = enumValueOfOrDefault(json.optString("role"), UserRole.CLIENT),
            location = json.optObject("location")?.toLatLng(),
            isOnline = json.optBoolean("online"),
            deviceId = json.optString("device_id")
        )
    }

    private fun parseOrder(json: JSONObject): Order {
        return Order(
            id = json.optString("id"),
            clientId = json.optString("client_id"),
            clientName = json.optString("client_name"),
            clientPhone = json.optString("client_phone"),
            deliveryId = json.optNullableString("delivery_id"),
            deliveryName = json.optNullableString("delivery_name"),
            deliveryPhone = json.optNullableString("delivery_phone"),
            category = json.optString("category", "OTROS"),
            description = json.optString("description"),
            status = enumValueOfOrDefault(json.optString("status"), OrderStatus.PENDING_PRICE),
            productPrice = json.optNullableDouble("product_price"),
            servicePrice = json.optNullableDouble("service_price"),
            totalPrice = json.optNullableDouble("total_price"),
            photoUrl = json.optNullableString("photo_url"),
            paymentPhotoUrl = json.optNullableString("payment_photo_url"),
            createdAt = json.optLong("created_at"),
            chatHistory = json.optArray("chat_history").toChatMessages(),
            clientLocation = json.optObject("client_location")?.toLatLng(),
            destinationLocation = json.optObject("destination_location")?.toLatLng()
                ?: json.optObject("client_location")?.toLatLng(),
            deliveryLocation = json.optObject("delivery_location")?.toLatLng(),
            deliveryPath = json.optArray("delivery_path").toLatLngList(),
            isWazeActive = json.optBoolean("is_waze_active"),
            targetDeliveryId = json.optNullableString("target_delivery_id"),
            rejectedBy = json.optArray("rejected_by").toStringList()
        )
    }

    private fun parseReport(json: JSONObject): Order {
        return Order(
            id = json.optString("id"),
            clientName = json.optString("client_name"),
            clientPhone = json.optString("client_phone"),
            deliveryId = json.optNullableString("delivery_id"),
            deliveryName = json.optNullableString("delivery_name"),
            deliveryPhone = json.optNullableString("delivery_phone"),
            category = json.optString("category", "OTROS"),
            description = json.optString("description"),
            status = enumValueOfOrDefault(json.optString("status"), OrderStatus.COMPLETED),
            productPrice = json.optNullableDouble("product_price"),
            servicePrice = json.optNullableDouble("service_price"),
            totalPrice = json.optNullableDouble("total_price"),
            createdAt = json.optLong("created_at")
        )
    }

    private fun User.toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("name", name)
        put("phone", phone)
        put("email", email)
        put("role", role.name)
        putNullable("location", location?.toJson())
        put("online", isOnline)
        put("device_id", deviceId)
    }

    private fun Order.toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("client_id", clientId)
        put("client_name", clientName)
        put("client_phone", clientPhone)
        putNullable("delivery_id", deliveryId)
        putNullable("delivery_name", deliveryName)
        putNullable("delivery_phone", deliveryPhone)
        put("category", category)
        put("description", description)
        put("status", status.name)
        putNullable("product_price", productPrice)
        putNullable("service_price", servicePrice)
        putNullable("total_price", totalPrice)
        putNullable("photo_url", photoUrl)
        putNullable("payment_photo_url", paymentPhotoUrl)
        put("created_at", createdAt)
        put("chat_history", JSONArray(chatHistory.map { it.toJson() }))
        putNullable("client_location", clientLocation?.toJson())
        putNullable("destination_location", (destinationLocation ?: clientLocation)?.toJson())
        putNullable("delivery_location", deliveryLocation?.toJson())
        put("delivery_path", JSONArray(deliveryPath.map { it.toJson() }))
        put("is_waze_active", isWazeActive)
        putNullable("target_delivery_id", targetDeliveryId)
        put("rejected_by", JSONArray(rejectedBy))
    }

    fun ChatMessage.toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("senderId", senderId)
        put("text", text)
        putNullable("imageUrl", imageUrl)
        putNullable("fileUrl", fileUrl)
        put("timestamp", timestamp)
    }

    fun MyLatLng.toJson(): JSONObject = JSONObject()
        .put("latitude", latitude)
        .put("longitude", longitude)

    private fun JSONObject.toLatLng(): MyLatLng = MyLatLng(
        latitude = optDouble("latitude"),
        longitude = optDouble("longitude")
    )

    private fun JSONArray?.toChatMessages(): List<ChatMessage> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { index ->
            optJSONObject(index)?.let {
                ChatMessage(
                    id = it.optString("id"),
                    senderId = it.optString("senderId"),
                    text = it.optString("text"),
                    imageUrl = it.optNullableString("imageUrl"),
                    fileUrl = it.optNullableString("fileUrl"),
                    timestamp = it.optLong("timestamp")
                )
            }
        }
    }

    private fun JSONArray?.toLatLngList(): List<MyLatLng> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { optJSONObject(it)?.toLatLng() }
    }

    private fun JSONArray?.toStringList(): List<String> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { optString(it).takeIf(String::isNotBlank) }
    }

    private fun <T> JSONArray.toObjectList(parser: (JSONObject) -> T): List<T> {
        return (0 until length()).mapNotNull { optJSONObject(it)?.let(parser) }
    }

    private fun JSONObject.optObject(name: String): JSONObject? =
        if (has(name) && !isNull(name)) optJSONObject(name) else null

    private fun JSONObject.optArray(name: String): JSONArray? =
        if (has(name) && !isNull(name)) optJSONArray(name) else null

    private fun JSONObject.optNullableString(name: String): String? =
        if (has(name) && !isNull(name)) optString(name).takeIf { it.isNotBlank() } else null

    private fun JSONObject.optNullableDouble(name: String): Double? =
        if (has(name) && !isNull(name)) optDouble(name) else null

    private fun JSONObject.putNullable(name: String, value: Any?) {
        if (value == null) put(name, JSONObject.NULL) else put(name, value)
    }

    private inline fun <reified T : Enum<T>> enumValueOfOrDefault(value: String, default: T): T {
        return runCatching { enumValueOf<T>(value) }.getOrDefault(default)
    }

    private fun storagePathFromPublicUrl(url: String): String? {
        val marker = "/storage/v1/object/public/$MEDIA_BUCKET/"
        return url.substringAfter(marker, missingDelimiterValue = "").takeIf { it.isNotBlank() }
    }

    private fun guessContentType(path: String): String {
        return when {
            path.endsWith(".jpg", ignoreCase = true) -> "image/jpeg"
            path.endsWith(".png", ignoreCase = true) -> "image/png"
            path.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
            else -> "application/octet-stream"
        }
    }

    private fun urlEncode(value: String): String =
        java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20")
}
