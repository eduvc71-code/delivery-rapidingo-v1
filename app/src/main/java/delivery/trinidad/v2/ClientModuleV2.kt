package delivery.trinidad

import android.Manifest
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
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.net.toUri
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.compose.AsyncImage
import delivery.trinidad.ui.theme.*
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView as MapLibreMapView
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng

private object UppercaseVisualTransformationV2 : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        return TransformedText(AnnotatedString(text.text.uppercase()), OffsetMapping.Identity)
    }
}

private fun hasWhatsAppPhone(phone: String?): Boolean = phone.orEmpty().any { it.isDigit() }

private fun openWhatsAppMessage(context: Context, phone: String?, message: String) {
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

@Composable
private fun rapidingoTextFieldColorsV2() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = BrandBlack,
    unfocusedTextColor = BrandBlack,
    focusedBorderColor = BrandYellow,
    unfocusedBorderColor = BrandSurfaceGray,
    focusedLabelColor = BrandYellow,
    unfocusedLabelColor = BrandGrayMedium,
    cursorColor = BrandYellow,
    focusedContainerColor = BrandWhite,
    unfocusedContainerColor = BrandWhite,
    focusedPlaceholderColor = BrandGrayMedium,
    unfocusedPlaceholderColor = BrandGrayMedium
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientModuleV2(viewModel: MainViewModel, showChat: MutableState<Boolean>, onOpenCamera: ((Uri) -> Unit) -> Unit) {
    var orderText by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var sendToOtherLocation by remember { mutableStateOf(false) }
    var selectedDestination by remember { mutableStateOf<MyLatLng?>(null) }
    var showDestinationPicker by remember { mutableStateOf(false) }
    var isLocationConfirmedByUser by remember { mutableStateOf(false) }
    var showLocationConfirmDialog by remember { mutableStateOf(false) }
    val availableDeliveries = viewModel.availableDeliveriesCount
    val clientName = viewModel.clientUser?.name ?: ""
    val context = LocalContext.current
    val activity = (LocalContext.current as? ComponentActivity)
    val scrollState = rememberScrollState()
    val defaultDestination = selectedDestination
        ?: viewModel.currentUserLocation
        ?: viewModel.clientUser?.location
        ?: MyLatLng(-14.8336, -64.9000)

    var restFilterCategory by remember { mutableStateOf<String?>(null) }
    var showSummaryDialog by remember { mutableStateOf(false) }
    var showOrderDialog by remember { mutableStateOf(false) }
    var currentRestaurantForDialog by remember { mutableStateOf<Restaurant?>(null) }

    fun closeClientSession() {
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

    Scaffold(
        topBar = { 
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandWhite,
                    titleContentColor = BrandBlack,
                    actionIconContentColor = BrandBlack
                ),
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            color = BrandBgLight,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.size(44.dp),
                            border = BorderStroke(1.dp, BrandSurfaceGray)
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
                            Text(
                                "¡Hola, $clientName!",
                                fontSize = 18.sp,
                                lineHeight = 20.sp,
                                fontWeight = FontWeight.Black,
                                color = BrandBlack,
                                fontFamily = PoppinsFamily,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                "CLIENTE V2",
                                fontSize = 11.sp,
                                lineHeight = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandGrayMedium,
                                fontFamily = PoppinsFamily,
                                maxLines = 1
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            color = if (availableDeliveries > 0) OpGreen.copy(alpha = 0.15f) else BrandYellow.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, if (availableDeliveries > 0) OpGreen else BrandYellow),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.ic_scooter),
                                    contentDescription = "Deliveries",
                                    modifier = Modifier.size(18.dp),
                                    contentScale = ContentScale.Fit
                                )
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    text = if (availableDeliveries > 0) "$availableDeliveries" else "0",
                                    color = if (availableDeliveries > 0) OpGreen else BrandBlack,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = PoppinsFamily
                                )
                            }
                        }
                    }
                },
                actions = { 
                    if (selectedCategory == "COMIDA" && viewModel.tempOrderItems.isNotEmpty()) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = BrandYellow, contentColor = BrandBlack) {
                                    Text("${viewModel.tempOrderItems.sumOf { it.quantity }}", fontFamily = PoppinsFamily, fontWeight = FontWeight.Bold)
                                }
                            }
                        ) {
                            IconButton(onClick = { showSummaryDialog = true }) {
                                Icon(Icons.Default.ReceiptLong, null, tint = BrandBlack)
                            }
                        }
                    }
                    IconButton(onClick = { closeClientSession() }) { 
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Cerrar sesion", tint = BrandBlack) 
                    }
                }
            ) 
        },
        floatingActionButton = {
            if (selectedCategory == "COMIDA" && viewModel.tempOrderItems.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { showSummaryDialog = true },
                    containerColor = BrandYellow,
                    contentColor = BrandBlack,
                    icon = { Icon(Icons.Default.ReceiptLong, null) },
                    text = { Text("VER RESUMEN (${viewModel.tempOrderItems.sumOf { it.quantity }})", fontFamily = PoppinsFamily, fontWeight = FontWeight.Bold) }
                )
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding).fillMaxSize().background(BrandBgLight)) {
            if (viewModel.activeOrder == null) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        CategoryButtonV2("COMIDA", R.drawable.category_restaurant, selectedCategory == "COMIDA", Modifier.weight(1f)) {
                            selectedCategory = "COMIDA"
                        }
                        CategoryButtonV2("FARMACIA", R.drawable.category_pharmacy, selectedCategory == "FARMACIA", Modifier.weight(1f)) {
                            selectedCategory = "FARMACIA"
                        }
                        CategoryButtonV2("OTROS", R.drawable.category_other, selectedCategory == "OTROS", Modifier.weight(1f)) {
                            selectedCategory = "OTROS"
                        }
                    }

                    if (selectedCategory == "COMIDA") {
                        RestaurantCarouselScreenV2(
                            restaurants = viewModel.restaurants,
                            selectedCategory = restFilterCategory,
                            onCategoryFilter = { restFilterCategory = it },
                            onRestaurantDoubleTap = { restaurant ->
                                currentRestaurantForDialog = restaurant
                                showOrderDialog = true
                            }
                        )
                    } else {
                        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState).padding(horizontal = 16.dp)) {
                             OutlinedTextField(
                                 value = orderText, 
                                 onValueChange = { orderText = it }, 
                                 label = { Text("Detalle del pedido y referencia", fontFamily = InterFamily) },
                                 placeholder = { Text("Escribe aquí lo que necesitas", fontFamily = InterFamily) },
                                 modifier = Modifier
                                     .fillMaxWidth()
                                     .height(140.dp),
                                 keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                                 visualTransformation = UppercaseVisualTransformationV2,
                                 shape = RoundedCornerShape(22.dp),
                                 textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BrandBlack, fontFamily = InterFamily),
                                 colors = rapidingoTextFieldColorsV2()
                             )

                             Card(
                                 modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                                 colors = CardDefaults.cardColors(containerColor = BrandWhite),
                                 elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                 shape = RoundedCornerShape(22.dp),
                                 border = BorderStroke(1.dp, BrandSurfaceGray)
                             ) {
                                 Column(modifier = Modifier.padding(12.dp)) {
                                     Row(
                                         verticalAlignment = Alignment.CenterVertically,
                                         modifier = Modifier.graphicsLayer(alpha = if (isLocationConfirmedByUser) 1.0f else 0.5f)
                                     ) {
                                         Checkbox(
                                             checked = sendToOtherLocation,
                                             enabled = isLocationConfirmedByUser,
                                             onCheckedChange = { checked ->
                                                 sendToOtherLocation = checked
                                                 if (checked) {
                                                     showDestinationPicker = true
                                                 } else {
                                                     selectedDestination = null
                                                 }
                                             },
                                             colors = CheckboxDefaults.colors(
                                                 checkedColor = BrandYellow,
                                                 uncheckedColor = BrandGrayMedium,
                                                 checkmarkColor = BrandBlack
                                             )
                                         )
                                         Column {
                                             Text("Enviar a otra ubicación", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = BrandBlack, fontFamily = PoppinsFamily)
                                             val locDesc = if (!isLocationConfirmedByUser) "Confirma tu ubicación al pedir" else if (selectedDestination != null) "Punto marcado en el mapa" else "Se enviará a tu posición actual"
                                             Text(locDesc, color = BrandYellow, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = InterFamily)
                                         }
                                     }
                                 }
                             }

                            Button(
                                onClick = { 
                                    if (!isLocationConfirmedByUser) {
                                        showLocationConfirmDialog = true
                                    } else {
                                        val category = selectedCategory
                                        if (category != null && orderText.isNotBlank()) {
                                            viewModel.createOrder(category, orderText.trim().uppercase(), selectedDestination ?: defaultDestination)
                                            selectedCategory = null
                                            sendToOtherLocation = false
                                            selectedDestination = null
                                            orderText = ""
                                            isLocationConfirmedByUser = false
                                        }
                                    }
                                }, 
                                modifier = Modifier.fillMaxWidth().padding(top = 24.dp, bottom = 60.dp).height(64.dp),
                                enabled = selectedCategory != null && orderText.trim().length >= 2,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandYellow,
                                    contentColor = BrandBlack,
                                    disabledContainerColor = BrandSurfaceGray,
                                    disabledContentColor = BrandGrayMedium
                                ),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                                shape = RoundedCornerShape(20.dp)
                            ) { 
                                Text("¡PEDIR AHORA!", fontWeight = FontWeight.Bold, fontSize = 16.sp, fontFamily = PoppinsFamily)
                            }
                        }
                    }
                }
            } else {
                OSMOrderTrackingV2(viewModel, onOpenChat = { showChat.value = true })
            }
        }
    }

    if (showLocationConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showLocationConfirmDialog = false },
            title = {
                Text(
                    "CONFIRMACIÓN DE ENTREGA",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = BrandBlack,
                    fontFamily = PoppinsFamily
                )
            },
            text = {
                Text(
                    "¿EL PEDIDO LLEGARÁ A TU UBICACIÓN ACTUAL?",
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp,
                    color = BrandGrayMedium,
                    fontFamily = InterFamily
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showLocationConfirmDialog = false
                        isLocationConfirmedByUser = true
                        val category = selectedCategory
                        if (category == "COMIDA" && viewModel.tempOrderItems.isNotEmpty()) {
                            viewModel.confirmTempOrderAndCreate(
                                viewModel.currentUserLocation ?: viewModel.clientUser?.location ?: MyLatLng(-14.8336, -64.9000)
                            )
                            selectedCategory = null
                            sendToOtherLocation = false
                            selectedDestination = null
                            showSummaryDialog = false
                            isLocationConfirmedByUser = false
                        } else if (category != null && orderText.isNotBlank()) {
                            viewModel.createOrder(
                                category,
                                orderText.trim().uppercase(),
                                viewModel.currentUserLocation ?: viewModel.clientUser?.location ?: MyLatLng(-14.8336, -64.9000)
                            )
                            selectedCategory = null
                            sendToOtherLocation = false
                            selectedDestination = null
                            orderText = ""
                            isLocationConfirmedByUser = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack)
                ) {
                    Text("SÍ, AQUÍ MISMO", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showLocationConfirmDialog = false
                        isLocationConfirmedByUser = true
                        sendToOtherLocation = true
                        selectedDestination = null
                        showDestinationPicker = true
                    }
                ) {
                    Text("NO, OTRA UBICACIÓN", fontWeight = FontWeight.Bold, color = BrandBlack, fontFamily = PoppinsFamily)
                }
            },
            containerColor = BrandWhite,
            shape = RoundedCornerShape(22.dp)
        )
    }

    if (showOrderDialog && currentRestaurantForDialog != null) {
        RestaurantOrderDialogV2(
            restaurant = currentRestaurantForDialog!!,
            existingItems = viewModel.tempOrderItems.filter { it.restaurantId == currentRestaurantForDialog?.id },
            onAddItem = { name, qty ->
                viewModel.addItemToTempOrder(currentRestaurantForDialog!!, name, qty)
            },
            onRemoveItem = { viewModel.removeTempItem(it) },
            onUpdateQuantity = { id, qty -> viewModel.updateTempItemQuantity(id, qty) },
            onDismiss = { showOrderDialog = false }
        )
    }

    if (showSummaryDialog) {
        OrderSummaryDialogV2(
            items = viewModel.tempOrderItems,
            isDeliveryLocationConfirmed = isLocationConfirmedByUser,
            isOtherLocation = sendToOtherLocation,
            deliveryLocationLabel = if (!isLocationConfirmedByUser) {
                "Elige antes de confirmar el pedido"
            } else if (sendToOtherLocation) {
                "Enviar a otra ubicacion"
            } else {
                "Enviar a mi ubicacion actual"
            },
            onUseCurrentLocation = {
                isLocationConfirmedByUser = true
                sendToOtherLocation = false
                selectedDestination = viewModel.currentUserLocation ?: viewModel.clientUser?.location ?: MyLatLng(-14.8336, -64.9000)
            },
            onUseOtherLocation = {
                isLocationConfirmedByUser = true
                sendToOtherLocation = true
                showDestinationPicker = true
            },
            onEditItem = { id ->
                showSummaryDialog = false
                val item = viewModel.tempOrderItems.find { it.id == id }
                item?.let {
                    currentRestaurantForDialog = viewModel.restaurants.find { r -> r.id == it.restaurantId }
                    showOrderDialog = true
                }
            },
            onRemoveItem = { viewModel.removeTempItem(it) },
            onClearAll = { viewModel.clearTempOrder() },
            onConfirmOrder = {
                if (!isLocationConfirmedByUser) {
                    showLocationConfirmDialog = true
                } else {
                    viewModel.confirmTempOrderAndCreate(selectedDestination ?: defaultDestination)
                    sendToOtherLocation = false
                    selectedDestination = null
                    isLocationConfirmedByUser = false
                    showSummaryDialog = false
                }
            },
            onDismiss = { showSummaryDialog = false }
        )
    }

    if (showDestinationPicker) {
        DestinationPickerDialogV2(
            initialLocation = defaultDestination,
            onDismiss = { showDestinationPicker = false },
            onConfirm = { point ->
                selectedDestination = point
                showDestinationPicker = false
            }
        )
    }
}

@Composable
fun CategoryButtonV2(text: String, imageRes: Int, isSelected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        modifier = modifier
            .height(132.dp)
            .clip(RoundedCornerShape(22.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
        color = if (isSelected) BrandYellow.copy(alpha = 0.15f) else BrandWhite,
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) BrandYellow else BrandSurfaceGray
        ),
        shadowElevation = if (isSelected) 4.dp else 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = text,
                modifier = Modifier.size(68.dp).weight(1f),
                contentScale = ContentScale.Fit
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = PoppinsFamily,
                color = BrandBlack,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}

@Composable
fun RestaurantCarouselScreenV2(
    restaurants: List<Restaurant>,
    selectedCategory: String?,
    onCategoryFilter: (String?) -> Unit,
    onRestaurantDoubleTap: (Restaurant) -> Unit
) {
    val categories = listOf("TODOS", "HAMBURGUESAS", "PARRILLA", "COMIDA_RAPIDA", "RESTAURANTE")
    val filteredRestaurants = if (selectedCategory == null || selectedCategory == "TODOS") {
        restaurants
    } else {
        restaurants.filter { it.category == selectedCategory }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        LazyRow(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp, horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories) { category ->
                FilterChip(
                    selected = (category == selectedCategory || (category == "TODOS" && selectedCategory == null)),
                    onClick = { onCategoryFilter(if (category == "TODOS") null else category) },
                    label = { Text(category, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandYellow,
                        selectedLabelColor = BrandBlack,
                        containerColor = BrandWhite,
                        labelColor = BrandBlack
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = (category == selectedCategory || (category == "TODOS" && selectedCategory == null)),
                        borderColor = BrandSurfaceGray,
                        selectedBorderColor = BrandYellow
                    )
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.DoubleArrow, null, tint = BrandYellow, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Doble clic en la tarjeta para pedir", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BrandGrayMedium, fontFamily = InterFamily)
        }

        LazyRow(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(filteredRestaurants) { restaurant ->
                RestaurantCardDoubleTapV2(
                    restaurant = restaurant,
                    onDoubleTap = { onRestaurantDoubleTap(restaurant) }
                )
            }
        }
    }
}

@Composable
fun RestaurantCardDoubleTapV2(
    restaurant: Restaurant,
    onDoubleTap: () -> Unit
) {
    var lastTapTime by remember { mutableLongStateOf(0L) }

    Card(
        modifier = Modifier
            .width(300.dp)
            .height(220.dp)
            .clickable {
                val currentTime = System.currentTimeMillis()
                if (currentTime - lastTapTime < 300) {
                    onDoubleTap()
                }
                lastTapTime = currentTime
            },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = BrandWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        border = BorderStroke(1.dp, BrandSurfaceGray)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color(restaurant.logoColor).copy(alpha = 0.8f),
                            Color(restaurant.logoColor)
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            if (restaurant.logoUrl != null) {
                AsyncImage(
                    model = restaurant.logoUrl,
                    contentDescription = restaurant.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.6f)
                                )
                            )
                        )
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(16.dp)
            ) {
                Icon(
                    Icons.Default.Restaurant,
                    null,
                    tint = Color.White,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    restaurant.name,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = PoppinsFamily,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    maxLines = 2
                )
                Spacer(Modifier.height(8.dp))
                Surface(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White.copy(alpha = 0.9f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.DoubleArrow, null, tint = BrandYellow, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("DOBLE CLIC PARA PEDIR", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandBlack, fontFamily = PoppinsFamily)
                    }
                }
            }

            Surface(
                modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color.White.copy(alpha = 0.9f)
            ) {
                Text(
                    restaurant.category,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandBlack,
                    fontFamily = PoppinsFamily
                )
            }
        }
    }
}

@Composable
fun RestaurantOrderDialogV2(
    restaurant: Restaurant,
    existingItems: List<TempOrderItem>,
    onAddItem: (String, Int) -> Unit,
    onRemoveItem: (String) -> Unit,
    onUpdateQuantity: (String, Int) -> Unit,
    onDismiss: () -> Unit
) {
    val draftRows = remember { mutableStateListOf(TempOrderItem(restaurantId = restaurant.id, restaurantName = restaurant.name, productName = "")) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = BrandBgLight
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header (Z-Index alto)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BrandWhite)
                        .padding(horizontal = 8.dp, vertical = 12.dp)
                        .border(BorderStroke(1.dp, BrandSurfaceGray)),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, null, tint = BrandBlack)
                    }
                    Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                        Text(restaurant.name.uppercase(), color = BrandBlack, fontWeight = FontWeight.Black, fontSize = 16.sp, fontFamily = PoppinsFamily, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(restaurant.schedule.uppercase(), color = BrandGrayMedium, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
                    }
                }

                // Zona de Menú (Zoomable) - Ocupa la parte superior
                Box(modifier = Modifier.weight(1.3f)) {
                    ZoomableImage(
                        url = restaurant.menuUrl ?: restaurant.logoUrl,
                        modifier = Modifier.fillMaxSize()
                    )

                    Surface(
                        color = BrandBlack.copy(alpha = 0.7f),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 20.dp)
                    ) {
                        Text(
                            "HAZ ZOOM PARA VER PRECIOS",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = PoppinsFamily,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                        )
                    }
                }

                // Panel de pedido alineado con la marca V2.
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    color = BrandWhite,
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                    border = BorderStroke(1.dp, BrandSurfaceGray)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text("RESERVA DE MENU", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BrandYellow, fontFamily = PoppinsFamily, letterSpacing = 1.sp)
                        Text(restaurant.name.uppercase(), fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandBlack, fontFamily = PoppinsFamily)

                        Spacer(Modifier.height(12.dp))

                        // Lista de filas de entrada
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            draftRows.forEachIndexed { index, row ->
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(BrandBgLight, RoundedCornerShape(16.dp))
                                        .border(1.dp, BrandSurfaceGray, RoundedCornerShape(16.dp))
                                        .padding(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        OutlinedTextField(
                                            value = row.productName,
                                            onValueChange = { draftRows[index] = row.copy(productName = it.uppercase()) },
                                            placeholder = { Text("¿QUÉ VAS A PEDIR?", fontSize = 12.sp, color = BrandGrayMedium, fontFamily = InterFamily) },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 15.sp, color = BrandBlack, fontFamily = InterFamily),
                                            singleLine = true,
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = BrandYellow,
                                                unfocusedBorderColor = BrandSurfaceGray,
                                                focusedContainerColor = BrandWhite,
                                                unfocusedContainerColor = BrandWhite,
                                                focusedTextColor = BrandBlack,
                                                unfocusedTextColor = BrandBlack,
                                                focusedPlaceholderColor = BrandGrayMedium,
                                                unfocusedPlaceholderColor = BrandGrayMedium,
                                                cursorColor = BrandYellow
                                            )
                                        )
                                        Spacer(Modifier.width(10.dp))
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.background(BrandWhite, RoundedCornerShape(10.dp)).border(1.dp, BrandSurfaceGray, RoundedCornerShape(10.dp))
                                        ) {
                                            IconButton(onClick = { if (row.quantity > 1) draftRows[index] = row.copy(quantity = row.quantity - 1) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Default.Remove, null, tint = BrandBlack, modifier = Modifier.size(16.dp))
                                            }
                                            Text("${row.quantity}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BrandBlack, fontFamily = PoppinsFamily, modifier = Modifier.padding(horizontal = 6.dp))
                                            IconButton(onClick = { draftRows[index] = row.copy(quantity = row.quantity + 1) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Default.Add, null, tint = BrandBlack, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                        if (draftRows.size > 1) {
                                            IconButton(onClick = { draftRows.removeAt(index) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Default.Delete, null, tint = OpRed, modifier = Modifier.size(20.dp))
                                            }
                                        }
                                    }
                                }
                            }

                            Button(
                                onClick = { draftRows.add(TempOrderItem(restaurantId = restaurant.id, restaurantName = restaurant.name, productName = "")) },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandBgLight, contentColor = BrandBlack),
                                border = BorderStroke(1.dp, BrandSurfaceGray)
                            ) {
                                Icon(Icons.Default.Add, null, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("AÑADIR OTRA FILA", fontWeight = FontWeight.Bold, fontSize = 14.sp, fontFamily = PoppinsFamily)
                            }
                        }

                        Spacer(Modifier.height(12.dp))

                        Button(
                            onClick = {
                                draftRows.forEach { row ->
                                    if (row.productName.isNotBlank()) {
                                        onAddItem(row.productName, row.quantity)
                                    }
                                }
                                onDismiss()
                            },
                            enabled = draftRows.any { it.productName.isNotBlank() },
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            shape = RoundedCornerShape(18.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = BrandYellow,
                                contentColor = BrandBlack,
                                disabledContainerColor = BrandSurfaceGray,
                                disabledContentColor = BrandGrayMedium
                            )
                        ) {
                            Icon(Icons.Default.ReceiptLong, null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            Text("RESERVAR PEDIDO", fontWeight = FontWeight.Bold, fontSize = 15.sp, fontFamily = PoppinsFamily)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OrderSummaryDialogV2(
    items: List<TempOrderItem>,
    isDeliveryLocationConfirmed: Boolean,
    isOtherLocation: Boolean,
    deliveryLocationLabel: String,
    onUseCurrentLocation: () -> Unit,
    onUseOtherLocation: () -> Unit,
    onEditItem: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    onClearAll: () -> Unit,
    onConfirmOrder: () -> Unit,
    onDismiss: () -> Unit
) {
    val totalItems = items.sumOf { it.quantity }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = BrandBgLight
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header (Z-Index alto)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BrandWhite)
                        .padding(horizontal = 8.dp, vertical = 16.dp)
                        .border(BorderStroke(1.dp, BrandSurfaceGray)),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, null, tint = BrandBlack)
                    }
                    Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                        Text("RESUMEN DE PEDIDO", color = BrandBlack, fontWeight = FontWeight.Black, fontSize = 20.sp, fontFamily = PoppinsFamily)
                        Text("$totalItems productos en tu lista", color = BrandGrayMedium, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
                    }
                    IconButton(onClick = onClearAll) {
                        Icon(Icons.Default.DeleteSweep, null, tint = OpRed)
                    }
                }

                // Cuerpo
                Surface(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    color = BrandWhite,
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                    border = BorderStroke(1.dp, BrandSurfaceGray)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(BrandBgLight, RoundedCornerShape(8.dp))
                                .padding(10.dp)
                        ) {
                            Text("DESCRIPCIÓN DEL PEDIDO", modifier = Modifier.weight(1f), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandBlack, fontFamily = PoppinsFamily)
                            Text("CANT.", modifier = Modifier.width(50.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandBlack, textAlign = TextAlign.Center, fontFamily = PoppinsFamily)
                            Text("OPC.", modifier = Modifier.width(60.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandBlack, textAlign = TextAlign.Center, fontFamily = PoppinsFamily)
                        }

                        Spacer(Modifier.height(8.dp))

                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(1.dp)
                        ) {
                            items(items) { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(0.5.dp, BrandSurfaceGray)
                                        .padding(vertical = 4.dp, horizontal = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.productName.uppercase(), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandBlack, fontFamily = PoppinsFamily, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(item.restaurantName.uppercase(), fontSize = 9.sp, color = BrandYellow, fontWeight = FontWeight.Bold, fontFamily = InterFamily)
                                    }
                                    Text(
                                        "x${item.quantity}",
                                        modifier = Modifier.width(50.dp),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = BrandBlack,
                                        fontFamily = PoppinsFamily,
                                        textAlign = TextAlign.Center
                                    )
                                    Row(modifier = Modifier.width(60.dp), horizontalArrangement = Arrangement.End) {
                                        IconButton(onClick = { onEditItem(item.id) }, modifier = Modifier.size(30.dp)) {
                                            Icon(Icons.Default.Visibility, null, tint = BrandBlack, modifier = Modifier.size(18.dp))
                                        }
                                        IconButton(onClick = { onRemoveItem(item.id) }, modifier = Modifier.size(18.dp)) {
                                            Icon(Icons.Default.Delete, null, tint = OpRed, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = BrandBgLight),
                            shape = RoundedCornerShape(18.dp),
                            border = BorderStroke(1.dp, BrandSurfaceGray)
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("DESTINO DE ENTREGA", color = BrandBlack, fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = PoppinsFamily)
                                Text(deliveryLocationLabel, color = BrandYellow, fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = InterFamily)
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Button(
                                        onClick = onUseCurrentLocation,
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isDeliveryLocationConfirmed && !isOtherLocation) BrandYellow else BrandWhite,
                                            contentColor = BrandBlack
                                        ),
                                        border = BorderStroke(1.dp, BrandSurfaceGray)
                                    ) {
                                        Text("MI UBICACIÓN", fontWeight = FontWeight.Bold, fontSize = 11.sp, fontFamily = PoppinsFamily)
                                    }
                                    Button(
                                        onClick = onUseOtherLocation,
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isOtherLocation) BrandYellow else BrandWhite,
                                            contentColor = BrandBlack
                                        ),
                                        border = BorderStroke(1.dp, BrandSurfaceGray)
                                    ) {
                                        Text("OTRA", fontWeight = FontWeight.Bold, fontSize = 11.sp, fontFamily = PoppinsFamily)
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        Button(
                            onClick = onConfirmOrder,
                            modifier = Modifier.fillMaxWidth().height(60.dp),
                            shape = RoundedCornerShape(18.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack)
                        ) {
                            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.width(12.dp))
                            Text("ENVIAR PEDIDO AHORA", fontWeight = FontWeight.Bold, fontSize = 16.sp, fontFamily = PoppinsFamily)
                        }

                        TextButton(
                            onClick = onDismiss,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("SEGUIR AGREGANDO MÁS", color = BrandGrayMedium, fontWeight = FontWeight.Bold, fontSize = 12.sp, fontFamily = PoppinsFamily)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DestinationPickerDialogV2(
    initialLocation: MyLatLng,
    onDismiss: () -> Unit,
    onConfirm: (MyLatLng) -> Unit
) {
    var selectedPoint by remember(initialLocation) { mutableStateOf(initialLocation) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(24.dp), color = BrandWhite, border = BorderStroke(1.dp, BrandSurfaceGray)) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Destino de entrega", color = BrandYellow, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
                        Text("Mueve el mapa", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = BrandBlack, fontFamily = PoppinsFamily)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = BrandBlack)
                    }
                }
                
                Box(modifier = Modifier.fillMaxWidth().height(360.dp)) {
                    var isSatellite by remember { mutableStateOf(false) }
                    MapLibrePickerView(
                        initialLocation = initialLocation,
                        onPointSelected = { selectedPoint = it },
                        modifier = Modifier.fillMaxSize(),
                        isSatellite = isSatellite
                    )
                    
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp)
                            .size(36.dp)
                            .clickable { isSatellite = !isSatellite },
                        shape = CircleShape,
                        color = BrandWhite,
                        shadowElevation = 4.dp,
                        border = BorderStroke(1.dp, BrandSurfaceGray)
                    ) {
                        Icon(
                            if (isSatellite) Icons.Default.Map else Icons.Default.SatelliteAlt,
                            contentDescription = null,
                            modifier = Modifier.padding(8.dp),
                            tint = BrandYellow
                        )
                    }

                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.align(Alignment.Center).size(48.dp).offset(y = (-24).dp),
                        tint = BrandYellow
                    )
                }

                Text(
                    "Ubica el pin amarillo en el punto exacto de entrega.",
                    color = BrandBlack,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = InterFamily,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onDismiss, 
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, BrandSurfaceGray)
                    ) {
                        Text("CANCELAR", fontWeight = FontWeight.Bold, color = BrandBlack, fontFamily = PoppinsFamily)
                    }
                    Button(
                        onClick = { onConfirm(selectedPoint) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack)
                    ) {
                        Text("CONFIRMAR", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
                    }
                }
            }
        }
    }
}

@Composable
fun OSMOrderTrackingV2(viewModel: MainViewModel, onOpenChat: () -> Unit) {
    val context = LocalContext.current
    val order = viewModel.activeOrder ?: return
    val deliveryDestination = order.destinationLocation ?: order.clientLocation ?: MyLatLng()
    val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
    val isEnRoute = order.status == OrderStatus.IN_DELIVERY ||
        order.status == OrderStatus.DELIVERED_BY_REPARTIDOR ||
        (!isFoodOrder && order.status == OrderStatus.PICKING_UP)
    val deliveryNameDisplay = order.deliveryName?.ifBlank { "Repartidor" } ?: "Repartidor"

    Box(modifier = Modifier.fillMaxSize()) {
        if (isEnRoute) {
            MapLibreTrackingView(
                userLocation = deliveryDestination, 
                otherLocation = order.deliveryLocation, 
                otherTitle = deliveryNameDisplay, 
                showRoute = true,
                centerOnOther = true,
                deliveryPath = order.deliveryPath,
                plannedRoute = viewModel.plannedRoute
            )
        } else {
            Box(modifier = Modifier.fillMaxSize().background(BrandBgLight))
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(horizontal = 12.dp, vertical = 20.dp),
            shape = RoundedCornerShape(32.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            colors = CardDefaults.cardColors(containerColor = BrandWhite),
            border = BorderStroke(1.dp, BrandSurfaceGray)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                if (!isEnRoute) {
                    Row(
                        modifier = Modifier.fillMaxWidth(), 
                        horizontalArrangement = Arrangement.SpaceBetween, 
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            val statusText = clientPersistentStatus(order, viewModel.dispatchMode)
                            Text(
                                statusText, 
                                fontWeight = FontWeight.Bold, 
                                color = BrandYellow,
                                fontSize = 11.sp,
                                fontFamily = PoppinsFamily,
                                letterSpacing = 1.sp
                            )
                            Text(
                                deliveryNameDisplay, 
                                fontWeight = FontWeight.ExtraBold, 
                                color = BrandBlack,
                                fontSize = 20.sp,
                                fontFamily = PoppinsFamily
                            )
                        }
                        
                        if (order.totalPrice != null) {
                            Column(horizontalAlignment = Alignment.End) {
                                Text("A PAGAR", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandGrayMedium, fontFamily = PoppinsFamily)
                                Text("Bs. ${order.totalPrice}", fontSize = 26.sp, fontWeight = FontWeight.Black, color = BrandYellow, fontFamily = PoppinsFamily)
                            }
                        }
                    }
                    
                    Spacer(Modifier.height(16.dp))

                    if (order.status == OrderStatus.WAITING_CONFIRM) {
                        Button(
                            onClick = { viewModel.updateOrderStatus(OrderStatus.CONFIRMED_BY_CLIENT) }, 
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                            shape = RoundedCornerShape(16.dp)
                        ) { 
                            Text("ACEPTAR Y CONFIRMAR PEDIDO", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, fontFamily = PoppinsFamily) 
                        }
                        Spacer(Modifier.height(12.dp))
                    } else if (order.status == OrderStatus.BIDDING) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape), 
                            color = BrandYellow,
                            trackColor = BrandSurfaceGray
                        )
                        Text("Buscando el mejor precio para ti...", fontSize = 12.sp, color = BrandGrayMedium, fontWeight = FontWeight.SemiBold, fontFamily = InterFamily, modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally))
                        Spacer(Modifier.height(16.dp))
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            color = BrandYellow.copy(alpha = 0.18f),
                            shape = CircleShape,
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(Icons.Default.TwoWheeler, null, tint = BrandYellow, modifier = Modifier.padding(12.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(order.status.toSpanish().uppercase(), fontWeight = FontWeight.Bold, color = BrandYellow, fontSize = 11.sp, fontFamily = PoppinsFamily)
                            Text(deliveryNameDisplay, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = BrandBlack, fontFamily = PoppinsFamily)
                        }
                    }
                    
                    if (order.status == OrderStatus.DELIVERED_BY_REPARTIDOR) {
                        Spacer(Modifier.height(14.dp))
                        Button(
                            onClick = { 
                                viewModel.addChatMessage("Ya salgo, gracias", viewModel.clientUser?.id ?: "")
                                viewModel.updateOrderStatus(OrderStatus.COMPLETED) 
                            }, 
                            colors = ButtonDefaults.buttonColors(containerColor = OpGreen, contentColor = Color.White),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        ) { 
                            Icon(Icons.Default.Check, null, tint = Color.White)
                            Spacer(Modifier.width(10.dp))
                            Text("YA SALGO, GRACIAS", fontWeight = FontWeight.Bold, fontSize = 15.sp, fontFamily = PoppinsFamily)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = onOpenChat,
                        modifier = Modifier.weight(1f).height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandBgLight, contentColor = BrandBlack),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, BrandSurfaceGray)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Chat, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("CHAT", fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
                    }
                    if (hasWhatsAppPhone(order.deliveryPhone)) {
                        Button(
                            onClick = {
                                openWhatsAppMessage(context, order.deliveryPhone, "Hola Soy el cliente ${viewModel.clientUser?.name ?: order.clientName}")
                            },
                            modifier = Modifier.weight(1.2f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366), contentColor = Color.White),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Phone, null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("WHATSAPP", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, maxLines = 1)
                        }
                    }
                }

                if (!isEnRoute) {
                    TextButton(
                        onClick = { viewModel.updateOrderStatus(OrderStatus.CANCELLED) },
                        modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                    ) {
                        Text("CANCELAR PEDIDO", color = OpRed, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, textDecoration = TextDecoration.Underline)
                    }
                }
            }
        }
    }
}

private fun clientPersistentStatus(order: Order, dispatchMode: String): String {
    val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
    val restaurantAccepted = order.chatHistory.lastOrNull { it.text.startsWith("RESTAURANT_STATUS:") && it.text.contains(":ACCEPTED:") }
    val restaurantReady = order.chatHistory.any { it.text.startsWith("RESTAURANT_STATUS:") && it.text.contains(":READY") }
    val restaurantRequested = order.chatHistory.any { it.text == "OPERATOR_RESTAURANT_REQUEST" }

    return when (order.status) {
        OrderStatus.PENDING_PRICE -> if (dispatchMode == "OPERATOR") {
            "PEDIDO RECIBIDO POR OPERADORA. EN BREVE ENVIARA LA COTIZACION."
        } else {
            "PEDIDO RECIBIDO. BUSCANDO DELIVERY PARA COTIZAR."
        }
        OrderStatus.WAITING_CONFIRM -> "COTIZACION LISTA. CONFIRMA PARA CONTINUAR."
        OrderStatus.CONFIRMED_BY_CLIENT -> if (isFoodOrder) {
            "PEDIDO CONFIRMADO. OPERADORA COORDINARA CON EL RESTAURANTE."
        } else {
            "PEDIDO CONFIRMADO. COORDINANDO DELIVERY."
        }
        OrderStatus.PICKING_UP -> if (isFoodOrder) {
            when {
                restaurantReady -> "RESTAURANTE MARCO TU PEDIDO LISTO PARA RECOJO."
                restaurantAccepted != null -> {
                    val minutes = restaurantAccepted.text.split(":").getOrNull(3) ?: "15"
                    if (order.deliveryName != null) {
                        "DELIVERY ASIGNADO. RESTAURANTE PREPARANDO: $minutes MIN."
                    } else {
                        "RESTAURANTE PREPARANDO. TIEMPO ESTIMADO: $minutes MIN."
                    }
                }
                restaurantRequested -> "PEDIDO ENVIADO AL RESTAURANTE. ESPERANDO TIEMPO DE PREPARACION."
                order.deliveryName != null -> "DELIVERY ASIGNADO. RECOGERA TU PEDIDO EN RESTAURANTE."
                else -> "COORDINANDO RESTAURANTE."
            }
        } else {
            "DELIVERY GESTIONANDO TU PEDIDO."
        }
        OrderStatus.IN_DELIVERY -> "DELIVERY RECOGIO TU PEDIDO. SEGUIMIENTO ACTIVADO HACIA TU DESTINO."
        OrderStatus.DELIVERED_BY_REPARTIDOR -> "DELIVERY LLEGO A TU DESTINO."
        OrderStatus.COMPLETED -> "PEDIDO COMPLETADO. GRACIAS POR TU CONFIANZA."
        OrderStatus.CANCELLED -> "PEDIDO CANCELADO."
        else -> order.status.toSpanish().uppercase()
    }
}
