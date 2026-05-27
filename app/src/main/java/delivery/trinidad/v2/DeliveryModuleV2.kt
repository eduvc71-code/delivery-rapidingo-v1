package delivery.trinidad

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.net.toUri
import coil.compose.AsyncImage
import delivery.trinidad.ui.theme.*

private fun hasWhatsAppPhoneV2(phone: String?): Boolean = phone.orEmpty().any { it.isDigit() }

private fun openWhatsAppMessageV2(context: Context, phone: String?, message: String) {
    val cleanPhone = phone.orEmpty().filter { it.isDigit() }
    if (cleanPhone.isBlank()) {
        Toast.makeText(context, "No hay numero de WhatsApp registrado", Toast.LENGTH_SHORT).show()
        return
    }
    val url = "https://wa.me/$cleanPhone?text=${Uri.encode(message)}"
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
    }.onFailure {
        Toast.makeText(context, "No se pudo abrir WhatsApp", Toast.LENGTH_SHORT).show()
    }
}

data class QuoteRowV2(
    val restaurant: String,
    val item: String,
    val quantity: Int
)

data class RestaurantProgressV2(
    val restaurantId: String,
    val restaurant: String,
    val status: String,
    val prepTime: Int,
    val timestamp: Long
)

private fun resolveRestaurantIdV2(restaurantName: String): String {
    return when (restaurantName.trim().lowercase()) {
        "wings & drinks" -> "wings_drinks"
        "el brete churrasqueria" -> "el_brete"
        "la toscana centro" -> "la_toscana"
        "la toscana - tablitas" -> "la_toscana"
        "la plazuela j&c" -> "la_plazuela"
        "la coqueta" -> "la_coqueta"
        "mr. grill" -> "mr_grill"
        "restaurante el benianito" -> "el_benianito"
        "toby - cuarto de libra" -> "toby"
        "la toscana - rapido" -> "la_toscana"
        else -> restaurantName.trim().lowercase().replace(Regex("[^a-z0-9]+"), "_").trim('_')
    }
}

private fun parseQuoteRowsV2(description: String?): List<QuoteRowV2> {
    val rows = mutableListOf<QuoteRowV2>()
    if (description.isNullOrBlank()) return rows
    
    var currentRestaurant = "RESTAURANTE"
    val lines = description.split("\n", "\r")
    for (line in lines) {
        val trimmed = line.trim()
        if (trimmed.startsWith("RESTAURANTE:", ignoreCase = true)) {
            currentRestaurant = trimmed.substring("RESTAURANTE:".length).trim()
        } else if (trimmed.startsWith("- ")) {
            val itemPart = trimmed.substring(2).trim()
            val lastXIdx = itemPart.lastIndexOf(" x")
            if (lastXIdx != -1) {
                val itemName = itemPart.substring(0, lastXIdx).trim()
                val qtyStr = itemPart.substring(lastXIdx + 2).trim()
                val qty = qtyStr.toIntOrNull() ?: 1
                rows.add(QuoteRowV2(restaurant = currentRestaurant, item = itemName, quantity = qty))
            } else {
                rows.add(QuoteRowV2(restaurant = currentRestaurant, item = itemPart, quantity = 1))
            }
        }
    }
    return rows
}

private fun getRestaurantProgressV2(order: Order, restaurantId: String, restaurantName: String): RestaurantProgressV2 {
    var status = "PENDING"
    var prepTime = 0
    var timestamp = 0L

    order.chatHistory.forEach { msg ->
        val parts = msg.text.split(":")
        if (parts.size >= 3 && parts[0] == "RESTAURANT_STATUS" && parts[1] == restaurantId) {
            status = parts[2]
            if (status == "ACCEPTED" && parts.size >= 4) prepTime = parts[3].toIntOrNull() ?: 0
            timestamp = msg.timestamp
        }
    }

    return RestaurantProgressV2(restaurantId, restaurantName, status, prepTime, timestamp)
}

private fun buildRestaurantProgressV2(order: Order, rows: List<QuoteRowV2>): List<RestaurantProgressV2> {
    return rows
        .map { it.restaurant }
        .distinct()
        .map { restaurantName ->
            val restaurantId = resolveRestaurantIdV2(restaurantName)
            getRestaurantProgressV2(order, restaurantId, restaurantName)
        }
}

@Composable
private fun rapidingoTextFieldColorsV2() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedBorderColor = BrandYellow,
    unfocusedBorderColor = Color.White.copy(alpha = 0.25f),
    focusedLabelColor = BrandYellow,
    unfocusedLabelColor = Color.White.copy(alpha = 0.8f),
    cursorColor = BrandYellow,
    focusedContainerColor = Color(0xFF151515),
    unfocusedContainerColor = Color(0xFF151515)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryModuleV2(viewModel: MainViewModel, showChat: MutableState<Boolean>, onOpenCamera: ((Uri) -> Unit) -> Unit) {
    var prodPrice by remember { mutableStateOf("") }
    var servPrice by remember { mutableStateOf("") }
    val showReports = remember { mutableStateOf(false) }
    val deliveryName = viewModel.deliveryUser?.name ?: ""
    val context = LocalContext.current
    val activity = (LocalContext.current as? ComponentActivity)

    LaunchedEffect(viewModel.activeOrder?.id, viewModel.activeOrder?.status) {
        if (viewModel.activeOrder?.status != OrderStatus.BIDDING) {
            prodPrice = ""
            servPrice = ""
        }
    }

    fun closeDeliveryApp() {
        viewModel.closeSession(
            onSuccess = {
                context.stopService(Intent(context, LocationService::class.java))
                activity?.window?.decorView?.postDelayed({
                    activity.finishAndRemoveTask()
                }, 350)
            },
            onError = { message ->
                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
            }
        )
    }
    
    Scaffold(topBar = { 
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Color(0xFF1C1C1C),
                titleContentColor = Color.White,
                actionIconContentColor = BrandYellow
            ),
            title = { 
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Surface(
                        color = Color(0xFF222222),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.size(42.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.brand_logo),
                            contentDescription = "Beep Delivery",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("BEEP DELIVERY", fontSize = 19.sp, lineHeight = 22.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, color = Color.White)
                        Text(deliveryName.ifBlank { "Repartidor" }, fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = BrandYellow, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Surface(
                        color = Color(0xFF2E7D32).copy(alpha = 0.16f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("ONLINE", modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, color = Color(0xFF50E36D))
                    }
                }
            }, 
            actions = { 
                IconButton(onClick = { showReports.value = true }) { Icon(Icons.Default.Assessment, contentDescription = "Reportes", tint = Color.White) }
                IconButton(onClick = { closeDeliveryApp() }) { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Cerrar sesion", tint = BrandYellow) }
            }
        ) 
    }) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize().background(BrandBlack)) {
            val order = viewModel.activeOrder
            if (order == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Surface(
                            shape = RoundedCornerShape(34.dp), 
                            color = Color(0xFF1C1C1C), 
                            modifier = Modifier.size(104.dp), 
                            border = BorderStroke(1.dp, Color(0xFF2E2E2E)), 
                            shadowElevation = 12.dp
                        ) {
                            Icon(Icons.Default.TwoWheeler, contentDescription = null, modifier = Modifier.padding(24.dp), tint = BrandYellow)
                        }
                        Spacer(Modifier.height(18.dp))
                        Text("ESTÁS ONLINE", fontSize = 22.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, color = Color.White)
                        Text("Los pedidos llegarán pronto a Trinidad.", color = BrandGrayMedium, fontFamily = InterFamily, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, modifier = Modifier.padding(16.dp))
                        Button(
                            onClick = { closeDeliveryApp() },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                            shape = RoundedCornerShape(18.dp),
                            modifier = Modifier.height(54.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ExitToApp, null, tint = BrandBlack)
                            Spacer(Modifier.width(8.dp))
                            Text("CERRAR SESION", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = BrandBlack)
                        }
                    }
                }
            } else {
                Box(modifier = Modifier.fillMaxSize()) {
                    OSMDeliveryTrackingV2(viewModel, prodPrice, servPrice, { prodPrice = it }, { servPrice = it }, onOpenChat = { showChat.value = true })
                }
            }
        }
    }
    if (showChat.value) {
        viewModel.lastReadChatSize = viewModel.activeOrder?.chatHistory?.size ?: 0
        ChatDialogV2(viewModel, viewModel.deliveryUser?.id ?: "", onDismiss = { showChat.value = false }, onOpenCamera = onOpenCamera)
    }
    if (showReports.value) ReportsDialogV2(viewModel, onDismiss = { showReports.value = false })
}

@Composable
fun ReportsDialogV2(viewModel: MainViewModel, onDismiss: () -> Unit) {
    val completedOrders = viewModel.completedOrdersList 
    val totalEarnings = completedOrders.sumOf { it.servicePrice ?: 0.0 }
    val totalProducts = completedOrders.sumOf { it.productPrice ?: 0.0 }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1C1C1C),
        titleContentColor = Color.White,
        textContentColor = Color.White,
        confirmButton = { TextButton(onClick = onDismiss) { Text("CERRAR", color = BrandYellow, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily) } },
        title = { Text("Resumen de Ganancias", fontWeight = FontWeight.Black, fontFamily = PoppinsFamily) },
        text = {
            Column {
                Text("Total de Pedidos: ${completedOrders.size}", fontWeight = FontWeight.Bold, fontFamily = InterFamily)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Ganancia neta (Servicios): Bs. $totalEarnings", color = BrandYellow, fontWeight = FontWeight.ExtraBold, fontFamily = InterFamily)
                Text("Monto en Productos: Bs. $totalProducts", color = BrandGrayMedium, fontWeight = FontWeight.SemiBold, fontFamily = InterFamily)
                Spacer(modifier = Modifier.height(16.dp))
                Text("Tus pedidos hoy:", fontSize = 14.sp, color = BrandGrayMedium, fontWeight = FontWeight.SemiBold, fontFamily = InterFamily)
                LazyColumn(modifier = Modifier.height(200.dp)) {
                    items(completedOrders) { order ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(order.description.take(20) + "...", fontSize = 12.sp, fontFamily = InterFamily)
                            Text("Bs. ${order.servicePrice}", fontWeight = FontWeight.Bold, color = BrandYellow, fontFamily = InterFamily)
                        }
                    }
                }
            }
        }
    )
}

@Composable
fun OSMDeliveryTrackingV2(viewModel: MainViewModel, pPrice: String, sPrice: String, onPChange: (String) -> Unit, onSChange: (String) -> Unit, onOpenChat: () -> Unit) {
    val order = viewModel.activeOrder ?: return
    val deliveryDestination = order.destinationLocation ?: order.clientLocation
    val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
    
    val quoteRows = remember(order.id, order.description) { parseQuoteRowsV2(order.description) }
    val restaurantProgress = remember(order.id, order.chatHistory, quoteRows) { buildRestaurantProgressV2(order, quoteRows) }
    val unitPrices = remember(order.id) { mutableStateMapOf<Int, String>() }

    val calculatedProductTotal = quoteRows.indices.sumOf { index ->
        val qty = quoteRows[index].quantity
        val priceStr = unitPrices[index] ?: ""
        val price = priceStr.toDoubleOrNull() ?: 0.0
        qty * price
    }

    val totalCalculated = if (order.category == "COMIDA" && quoteRows.isNotEmpty()) {
        calculatedProductTotal + (sPrice.toDoubleOrNull() ?: 0.0)
    } else {
        (pPrice.toDoubleOrNull() ?: 0.0) + (sPrice.toDoubleOrNull() ?: 0.0)
    }

    val context = LocalContext.current
    val clientNameDisplay = order.clientName.ifBlank { "Cliente" }
    
    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.weight(1f)) {
            MapLibreTrackingView(
                userLocation = viewModel.currentUserLocation ?: MyLatLng(), 
                otherLocation = deliveryDestination, 
                otherTitle = clientNameDisplay, 
                showRoute = true,
                deliveryPath = order.deliveryPath,
                plannedRoute = viewModel.plannedRoute
            )
        }
        
        // Panel de Control del Repartidor V2 - Rediseño Dark
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1C1C)),
            elevation = CardDefaults.cardElevation(defaultElevation = 22.dp),
            border = BorderStroke(1.dp, Color(0xFF2E2E2E))
        ) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 22.dp)) {
                // Info Cliente
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Surface(modifier = Modifier.size(48.dp), shape = CircleShape, color = BrandYellow.copy(alpha = 0.12f)) {
                        Icon(Icons.Default.Person, null, modifier = Modifier.padding(11.dp), tint = BrandYellow)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(clientNameDisplay.uppercase(), fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, color = Color.White, fontSize = 16.sp)
                        Text(order.description.uppercase(), fontWeight = FontWeight.Bold, fontFamily = InterFamily, color = BrandGrayMedium, fontSize = 13.sp)
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))

                when (order.status) {
                    OrderStatus.PENDING_PRICE -> {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = { viewModel.startBidding() }, 
                                modifier = Modifier.weight(1.2f).height(58.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack)
                            ) { 
                                Text("TOMAR PEDIDO", fontSize = 14.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, color = BrandBlack, maxLines = 1) 
                            }
                            OutlinedButton(
                                onClick = { viewModel.rejectOrder() }, 
                                modifier = Modifier.weight(1f).height(58.dp),
                                border = BorderStroke(2.dp, BrandYellow),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White.copy(alpha = 0.04f), contentColor = BrandYellow)
                            ) { 
                                Text("RECHAZAR", fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily) 
                            }
                        }
                    }
                    OrderStatus.BIDDING -> {
                        Column(modifier = Modifier.background(Color(0xFF151515), RoundedCornerShape(18.dp)).padding(16.dp)) {
                            if (order.category == "COMIDA" && quoteRows.isNotEmpty()) {
                                Text("COTIZACIÓN DESGLOSADA", fontWeight = FontWeight.Black, fontSize = 13.sp, fontFamily = PoppinsFamily, color = BrandYellow)
                                Spacer(Modifier.height(8.dp))
                                
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(max = 180.dp)
                                        .verticalScroll(rememberScrollState()),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    quoteRows.forEachIndexed { index, item ->
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1C1C)),
                                            border = BorderStroke(1.dp, Color(0xFF2E2E2E))
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(10.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(item.item, fontWeight = FontWeight.Bold, fontFamily = InterFamily, fontSize = 13.sp, color = Color.White)
                                                    Text("Cant: ${item.quantity} • ${item.restaurant}", fontSize = 11.sp, fontFamily = InterFamily, color = BrandGrayMedium)
                                                }
                                                Spacer(Modifier.width(8.dp))
                                                OutlinedTextField(
                                                    value = unitPrices[index] ?: "",
                                                    onValueChange = { newValue ->
                                                        if (newValue.isEmpty() || newValue.all { it.isDigit() || it == '.' }) {
                                                            unitPrices[index] = newValue
                                                        }
                                                    },
                                                    placeholder = { Text("0.00") },
                                                    modifier = Modifier.width(90.dp).height(50.dp),
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    shape = RoundedCornerShape(8.dp),
                                                    textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White),
                                                    colors = rapidingoTextFieldColorsV2(),
                                                    singleLine = true
                                                )
                                            }
                                        }
                                    }
                                }
                                Spacer(Modifier.height(12.dp))
                                HorizontalDivider(modifier = Modifier.alpha(0.1f))
                                Spacer(Modifier.height(12.dp))
                                
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    OutlinedTextField(
                                        value = sPrice, 
                                        onValueChange = onSChange, 
                                        label = { Text("TARIFA ENVIÓ", fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily) }, 
                                        modifier = Modifier.weight(1f),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        textStyle = TextStyle(fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White),
                                        singleLine = true,
                                        colors = rapidingoTextFieldColorsV2()
                                    )
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("SUBTOTAL PROD: Bs. $calculatedProductTotal", fontSize = 12.sp, fontWeight = FontWeight.Black, fontFamily = InterFamily, color = Color.White)
                                        Text("TOTAL: Bs. ${calculatedProductTotal + (sPrice.toDoubleOrNull() ?: 0.0)}", fontWeight = FontWeight.Black, fontFamily = InterFamily, color = BrandYellow, fontSize = 24.sp)
                                    }
                                }
                            } else {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OutlinedTextField(
                                        value = pPrice, 
                                        onValueChange = onPChange, 
                                        label = { Text("PRODUCTOS", fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily) }, 
                                        modifier = Modifier.weight(1f),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White),
                                        colors = rapidingoTextFieldColorsV2()
                                    )
                                    OutlinedTextField(
                                        value = sPrice, 
                                        onValueChange = onSChange, 
                                        label = { Text("TARIFA", fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily) }, 
                                        modifier = Modifier.weight(1f),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White),
                                        colors = rapidingoTextFieldColorsV2()
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("TOTAL A COBRAR:", fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, color = BrandGrayMedium, fontSize = 14.sp)
                                    Text("Bs. $totalCalculated", fontWeight = FontWeight.Black, fontFamily = InterFamily, color = BrandYellow, fontSize = 28.sp)
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = {
                                val p = if (order.category == "COMIDA" && quoteRows.isNotEmpty()) calculatedProductTotal else (pPrice.toDoubleOrNull() ?: 0.0)
                                val s = sPrice.toDoubleOrNull() ?: 0.0
                                viewModel.setOrderPrices(p, s)
                                onPChange("")
                                onSChange("")
                            }, 
                            modifier = Modifier.fillMaxWidth().height(60.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                            contentPadding = PaddingValues(horizontal = 14.dp)
                        ) { 
                            Text("ENVIAR COTIZACIÓN", fontWeight = FontWeight.Black, fontSize = 15.sp, fontFamily = PoppinsFamily, color = BrandBlack, maxLines = 1) 
                        }
                    }
                    OrderStatus.CONFIRMED_BY_CLIENT -> {
                        Button(
                            onClick = { viewModel.updateOrderStatus(OrderStatus.PICKING_UP) }, 
                            modifier = Modifier.fillMaxWidth().height(62.dp), 
                            colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                            shape = RoundedCornerShape(16.dp)
                        ) { 
                            Icon(Icons.Default.ShoppingCart, null, tint = BrandBlack)
                            Spacer(Modifier.width(10.dp))
                            Text(if (isFoodOrder) "AVISAR AL RESTAURANTE" else "IR A COMPRAR", fontWeight = FontWeight.Black, fontSize = 16.sp, fontFamily = PoppinsFamily, color = BrandBlack, maxLines = 1) 
                        }
                    }
                    OrderStatus.PICKING_UP -> {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (isFoodOrder) {
                                if (restaurantProgress.isEmpty()) {
                                    Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFF151515), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Color(0xFF2E2E2E))) {
                                        Text("ESPERANDO DESPACHO DEL RESTAURANTE", color = BrandYellow, modifier = Modifier.padding(16.dp), fontSize = 13.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, textAlign = TextAlign.Center)
                                    }
                                } else {
                                    restaurantProgress.forEach { progress ->
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(14.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFF151515)),
                                            border = BorderStroke(1.dp, Color(0xFF2E2E2E))
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text(progress.restaurant.uppercase(), color = BrandYellow, fontSize = 12.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, textAlign = TextAlign.Center)
                                                when (progress.status) {
                                                    "PENDING" -> Text("ESPERANDO QUE ACEPTE SU PARTE", color = BrandGrayMedium, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = InterFamily, textAlign = TextAlign.Center)
                                                    "ACCEPTED" -> Text("ACEPTADO: ${progress.prepTime.toString().padStart(2, '0')} MIN", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Black, fontFamily = InterFamily, textAlign = TextAlign.Center)
                                                    "READY" -> {
                                                        Text("PEDIDO LISTO", color = BrandYellow, fontSize = 15.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, textAlign = TextAlign.Center)
                                                        Button(
                                                            onClick = {
                                                                val allPickedUp = restaurantProgress.all { it.restaurantId == progress.restaurantId || it.status == "DELIVERED" }
                                                                viewModel.confirmRestaurantPickup(progress.restaurantId, progress.restaurant, allPickedUp)
                                                            },
                                                            modifier = Modifier.fillMaxWidth().height(50.dp),
                                                            shape = RoundedCornerShape(12.dp),
                                                            colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack)
                                                        ) {
                                                            Text("RECIBI ESTE PEDIDO", fontWeight = FontWeight.Black, fontSize = 13.sp, fontFamily = PoppinsFamily, color = BrandBlack)
                                                        }
                                                    }
                                                    "DELIVERED" -> Text("RECOJO CONFIRMADO", color = Color(0xFF2E7D32), fontSize = 13.sp, fontWeight = FontWeight.Black, fontFamily = InterFamily, textAlign = TextAlign.Center)
                                                    else -> Text("ESPERANDO ACTUALIZACION", color = BrandGrayMedium, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = InterFamily, textAlign = TextAlign.Center)
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                Button(
                                    onClick = { viewModel.updateOrderStatus(OrderStatus.IN_DELIVERY) }, 
                                    modifier = Modifier.fillMaxWidth().height(62.dp), 
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                                    shape = RoundedCornerShape(16.dp)
                                ) { 
                                    Icon(Icons.Default.BikeScooter, null, tint = BrandBlack)
                                    Spacer(Modifier.width(10.dp))
                                    Text("COMPRADO, EN RUTA", fontWeight = FontWeight.Black, fontSize = 15.sp, fontFamily = PoppinsFamily, color = BrandBlack, maxLines = 1) 
                                }
                                WazeButtonV2(order, context, viewModel)
                            }
                        }
                    }
                    OrderStatus.IN_DELIVERY -> {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = { 
                                    viewModel.addChatMessage("Su pedido está en la puerta", viewModel.deliveryUser?.id ?: "")
                                    viewModel.updateOrderStatus(OrderStatus.DELIVERED_BY_REPARTIDOR) 
                                }, 
                                modifier = Modifier.fillMaxWidth().height(66.dp), 
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)), 
                                shape = RoundedCornerShape(18.dp)
                            ) { 
                                Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(28.dp))
                                Spacer(Modifier.width(12.dp))
                                Text("¡YA LLEGUÉ!", fontWeight = FontWeight.Black, fontSize = 19.sp, fontFamily = PoppinsFamily, color = Color.White, maxLines = 1)
                            }
                            WazeButtonV2(order, context, viewModel)
                        }
                    }
                    else -> {
                        Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFF2E7D32).copy(alpha = 0.15f), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Color(0xFF2E7D32).copy(alpha = 0.3f))) {
                            Text("ESPERANDO CONFIRMACIÓN DEL CLIENTE", color = Color(0xFF50E36D), modifier = Modifier.padding(16.dp), fontSize = 13.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily, textAlign = TextAlign.Center)
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                // Footer: Chat, WhatsApp y Cancelar
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = onOpenChat, 
                        modifier = Modifier.weight(1f).height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF252525)),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Chat, null, modifier = Modifier.size(20.dp), tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("CHAT", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, fontFamily = PoppinsFamily, color = Color.White) 
                    }
                    if (hasWhatsAppPhoneV2(order.clientPhone)) {
                        Button(
                            onClick = {
                                openWhatsAppMessageV2(
                                    context,
                                    order.clientPhone,
                                    "Hola Soy el delivery ${viewModel.deliveryUser?.name ?: order.deliveryName.orEmpty()}"
                                )
                            },
                            modifier = Modifier.weight(1.15f).height(52.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Phone, null, modifier = Modifier.size(20.dp), tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text("WHATSAPP", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, fontFamily = PoppinsFamily, color = Color.White, maxLines = 1)
                        }
                    }
                }
                
                if (order.status != OrderStatus.COMPLETED && order.status != OrderStatus.CANCELLED) {
                    TextButton(
                        onClick = { viewModel.rejectOrder() },
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                    ) {
                        Text("CANCELAR / RECHAZAR", color = BrandYellow, fontSize = 12.sp, fontWeight = FontWeight.Black, fontFamily = PoppinsFamily)
                    }
                }
            }
        }
    }
}

@Composable
fun WazeButtonV2(order: Order, context: Context, viewModel: MainViewModel) {
    val clientLoc = order.destinationLocation ?: order.clientLocation
    if (clientLoc != null) {
        Button(
            onClick = {
                viewModel.updateWazeStatus(true)
                try {
                    val url = "waze://?ll=${clientLoc.latitude},${clientLoc.longitude}&navigate=yes"
                    val intent = Intent(Intent.ACTION_VIEW, url.toUri())
                    intent.addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT or Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                } catch (_: Exception) {
                    val gmmIntentUri = "google.navigation:q=${clientLoc.latitude},${clientLoc.longitude}".toUri()
                    val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
                    mapIntent.setPackage("com.google.android.apps.maps")
                    context.startActivity(mapIntent)
                }
            },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(45.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF33CCFF)) 
        ) {
            Icon(Icons.Default.Navigation, null, modifier = Modifier.size(18.dp), tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("NAVEGAR CON WAZE", fontWeight = FontWeight.Bold, fontSize = 14.sp, fontFamily = PoppinsFamily, color = Color.White)
        }
    }
}

@Composable
fun ChatDialogV2(viewModel: MainViewModel, currentUserId: String, onDismiss: () -> Unit, onOpenCamera: ((Uri) -> Unit) -> Unit) {
    var text by remember { mutableStateOf("") }
    val expandedImageUrl = remember { mutableStateOf<String?>(null) }
    val order = viewModel.activeOrder ?: return
    val context = LocalContext.current
    
    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.uploadChatFile(it, "image") { url -> viewModel.addChatMessage("", currentUserId, imageUrl = url) } }
    }
    val fileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.uploadChatFile(it, "file") { url -> viewModel.addChatMessage("Archivo enviado", currentUserId, fileUrl = url) } }
    }

    if (expandedImageUrl.value != null) {
        Dialog(onDismissRequest = { expandedImageUrl.value = null }) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clickable { expandedImageUrl.value = null },
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = expandedImageUrl.value,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(16.dp)),
                    contentScale = ContentScale.Fit
                )
            }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.85f),
            shape = RoundedCornerShape(28.dp),
            color = Color(0xFF1C1C1C),
            border = BorderStroke(1.dp, Color(0xFF2E2E2E))
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = BrandYellow.copy(alpha = 0.12f)) {
                            Icon(Icons.Default.Person, null, modifier = Modifier.padding(8.dp), tint = BrandYellow)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            val roleName = if (viewModel.currentMode == UserRole.CLIENT) "Repartidor" else "Cliente"
                            Text(roleName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = Color.White)
                            Text("En línea", style = MaterialTheme.typography.labelSmall, fontFamily = InterFamily, color = Color(0xFF4CAF50))
                        }
                    }
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, null, tint = Color.White) }
                }

                HorizontalDivider(modifier = Modifier.alpha(0.08f))

                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth().background(Color(0xFF111111)),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(order.chatHistory) { msg ->
                        val isMe = msg.senderId == currentUserId
                        ChatBubbleV2(msg, isMe, context) { expandedImageUrl.value = it }
                    }
                }

                HorizontalDivider(modifier = Modifier.alpha(0.08f))

                if (viewModel.currentMode == UserRole.CLIENT && order.status == OrderStatus.DELIVERED_BY_REPARTIDOR) {
                    Button(
                        onClick = { 
                            viewModel.addChatMessage("Ya salgo, gracias", currentUserId)
                            viewModel.updateOrderStatus(OrderStatus.COMPLETED)
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth().padding(12.dp).height(54.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Icon(Icons.Default.Check, null, tint = Color.White)
                        Spacer(Modifier.width(10.dp))
                        Text("YA SALGO, GRACIAS", fontWeight = FontWeight.Black, fontSize = 16.sp, fontFamily = PoppinsFamily)
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth().padding(8.dp)
                ) {
                    IconButton(onClick = { 
                        onOpenCamera { uri -> 
                            viewModel.uploadChatFile(uri, "image") { url -> 
                                viewModel.addChatMessage("", currentUserId, imageUrl = url) 
                            }
                        } 
                    }) { Icon(Icons.Default.PhotoCamera, null, tint = BrandYellow) }
                    
                    IconButton(onClick = { galleryLauncher.launch("image/*") }) { Icon(Icons.Default.QrCode, null, tint = BrandYellow) }
                    
                    IconButton(onClick = { fileLauncher.launch("*/*") }) { Icon(Icons.Default.AttachFile, null, tint = BrandYellow) }

                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Mensaje...", fontSize = 12.sp, fontFamily = InterFamily) },
                        shape = RoundedCornerShape(24.dp),
                        maxLines = 2,
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedContainerColor = Color(0xFF151515),
                            focusedContainerColor = Color(0xFF151515),
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = Color.Transparent,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    
                    IconButton(
                        onClick = { if (text.isNotBlank()) { viewModel.addChatMessage(text, currentUserId); text = "" } },
                        enabled = text.isNotBlank()
                    ) { Icon(Icons.AutoMirrored.Filled.Send, null, tint = if (text.isNotBlank()) BrandYellow else Color.Gray) }
                }
            }
        }
    }
}

@Composable
private fun ChatBubbleV2(msg: ChatMessage, isMe: Boolean, context: Context, onImageClick: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
        val bubbleShape = if (isMe) RoundedCornerShape(16.dp, 4.dp, 16.dp, 16.dp) else RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp)
        Surface(
            color = if (isMe) BrandYellow else Color(0xFF1C1C1C),
            contentColor = if (isMe) BrandBlack else Color.White,
            shape = bubbleShape,
            border = if (isMe) null else BorderStroke(1.dp, Color(0xFF2E2E2E)),
            tonalElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                if (msg.text.isNotBlank()) {
                    Text(
                        msg.text,
                        color = if (isMe) BrandBlack else Color.White,
                        fontWeight = if (isMe) FontWeight.Bold else FontWeight.Normal,
                        style = MaterialTheme.typography.bodyMedium,
                        fontFamily = InterFamily
                    )
                }
                msg.imageUrl?.let {
                    AsyncImage(
                        model = it,
                        contentDescription = null,
                        modifier = Modifier.padding(top = 4.dp).size(180.dp).clip(RoundedCornerShape(8.dp)).clickable { onImageClick(it) },
                        contentScale = ContentScale.Crop
                    )
                }
                msg.fileUrl?.let {
                    Row(
                        modifier = Modifier.padding(top = 4.dp).clickable {
                            val intent = Intent(Intent.ACTION_VIEW, it.toUri())
                            context.startActivity(intent)
                        }.background(if (isMe) Color.Black.copy(alpha = 0.1f) else Color.White.copy(alpha = 0.05f), RoundedCornerShape(8.dp)).padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.AttachFile, null, modifier = Modifier.size(16.dp), tint = if (isMe) BrandBlack else Color.White)
                        Spacer(Modifier.width(4.dp))
                        Text("Ver archivo", style = MaterialTheme.typography.labelMedium, fontFamily = InterFamily, textDecoration = TextDecoration.Underline, color = if (isMe) BrandBlack else Color.White)
                    }
                }
                Text(
                    java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(java.util.Date(msg.timestamp)),
                    style = MaterialTheme.typography.labelSmall,
                    fontFamily = InterFamily,
                    color = (if (isMe) BrandBlack else Color.White).copy(alpha = 0.6f),
                    modifier = Modifier.align(Alignment.End).padding(top = 2.dp)
                )
            }
        }
    }
}
