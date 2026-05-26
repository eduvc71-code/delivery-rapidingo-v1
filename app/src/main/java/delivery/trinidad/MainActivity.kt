package delivery.trinidad

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.IntentSender
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.util.Log
import android.util.Patterns
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.*
import com.google.android.gms.tasks.Task
import delivery.trinidad.ui.theme.DeliveryRapidingoTheme
import org.maplibre.android.MapLibre
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.annotations.PolylineOptions
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView as MapLibreMapView
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.util.MapTileIndex
import org.osmdroid.views.MapView as OsmMapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import java.io.File

private object UppercaseVisualTransformation : VisualTransformation {
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

private val ApkBrandBlack = Color(0xFF111111)
private val ApkBrandPanel = Color(0xFF171717)
private val ApkBrandPanelSoft = Color(0xFF202020)
private val ApkBrandOrange = Color(0xFFFF6A00)
private val ApkBrandYellow = Color(0xFFFFC107)
private val ApkBrandMuted = Color(0xFF8B8B8B)
private val ApkBrandBorder = Color(0x33FF6A00)
private val ApkBrandField = Color(0xFF151515)
private val ApkBrandSuccess = Color(0xFF2E7D32)

@Composable
private fun RapidingoBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(ApkBrandBlack, Color(0xFF16110D), ApkBrandBlack)
                )
            )
    ) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(ApkBrandOrange.copy(alpha = 0.035f))
        )
        content()
    }
}

@Composable
private fun RapidingoCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier,
        color = ApkBrandPanel.copy(alpha = 0.96f),
        contentColor = Color.White,
        shape = RoundedCornerShape(28.dp),
        tonalElevation = 0.dp,
        shadowElevation = 12.dp,
        border = BorderStroke(1.dp, ApkBrandBorder)
    ) {
        Column(modifier = Modifier.padding(20.dp), content = content)
    }
}

@Composable
private fun RapidingoPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    containerColor: Color = ApkBrandOrange,
    contentColor: Color = Color.White,
    icon: @Composable (() -> Unit)? = null
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(60.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = Color(0xFF2A2A2A),
            disabledContentColor = Color(0xFF686868)
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(22.dp),
        contentPadding = PaddingValues(horizontal = 18.dp)
    ) {
        if (icon != null) {
            icon()
            Spacer(Modifier.width(10.dp))
        }
        Text(text, fontWeight = FontWeight.Black, fontSize = 15.sp, maxLines = 1)
    }
}

@Composable
private fun RapidingoHeader(
    title: String,
    subtitle: String,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = ApkBrandPanel.copy(alpha = 0.96f),
        contentColor = Color.White,
        tonalElevation = 0.dp,
        shadowElevation = 10.dp,
        border = BorderStroke(1.dp, ApkBrandBorder)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                color = ApkBrandOrange,
                shape = RoundedCornerShape(14.dp),
                shadowElevation = 8.dp
            ) {
                Box(contentAlignment = Alignment.Center) { icon() }
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    fontSize = 20.sp,
                    lineHeight = 23.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    subtitle,
                    fontSize = 12.sp,
                    lineHeight = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = ApkBrandYellow,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), content = actions)
        }
    }
}

@Composable
private fun rapidingoTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedBorderColor = ApkBrandOrange,
    unfocusedBorderColor = Color.White.copy(alpha = 0.25f),
    focusedLabelColor = ApkBrandOrange,
    unfocusedLabelColor = Color.White.copy(alpha = 0.8f),
    cursorColor = ApkBrandOrange,
    focusedContainerColor = ApkBrandField,
    unfocusedContainerColor = ApkBrandField,
    focusedPlaceholderColor = Color.White.copy(alpha = 0.6f),
    unfocusedPlaceholderColor = Color.White.copy(alpha = 0.5f)
)

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NotificationHelper(this).clearAllNotifications()
        MapLibre.getInstance(this)
        Configuration.getInstance().load(this, getSharedPreferences("osmdroid", MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = packageName
        enableEdgeToEdge()
        setContent {
            DeliveryRapidingoTheme {
                val viewModel: MainViewModel = viewModel()
                LocationHandler(viewModel)
                GPSCheck(LocalContext.current)
                MainNavigation(viewModel)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        NotificationHelper(this).clearServiceNotifications()
    }
}

@Composable
fun MainNavigation(viewModel: MainViewModel) {
    var showCamera by remember { mutableStateOf(false) }
    var onCameraResult: ((Uri) -> Unit)? by remember { mutableStateOf(null) }
    val activity = (LocalContext.current as? ComponentActivity)

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        if (viewModel.isCheckingSession) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (viewModel.isRegistrationComplete) {
            Box(modifier = Modifier.fillMaxSize().background(Color(0xFFD32F2F)).padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(100.dp))
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("¡BIENVENIDO A RAPIDINGO!", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("TU REGISTRO SE HA COMPLETADO CON EXITO.\n\nPOR SEGURIDAD Y PARA ACTIVAR TODOS LOS SERVICIOS, POR FAVOR CIERRA LA APLICACIÓN Y VUELVE A ENTRAR.",
                        color = Color.White, textAlign = TextAlign.Center, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(32.dp))
                    Button(
                        onClick = { activity?.finish() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                        shape = RoundedCornerShape(30.dp)
                    ) {
                        Text("ENTENDIDO, SALIR", color = Color(0xFFD32F2F), fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            if (showCamera) {
                CameraScreen(
                    onPhotoTaken = { uri -> 
                        onCameraResult?.invoke(uri) ?: viewModel.uploadPhoto(uri)
                        showCamera = false
                        onCameraResult = null
                    },
                    onCancel = { 
                        showCamera = false
                        onCameraResult = null
                    }
                )
            } else {
                val user = if (viewModel.currentMode == UserRole.CLIENT) viewModel.clientUser else viewModel.deliveryUser
                val showChat = remember { mutableStateOf(false) }
                
                Box(modifier = Modifier.fillMaxSize()) {
                    AnimatedContent(
                        targetState = (viewModel.currentMode == null || user == null),
                        transitionSpec = { fadeIn(tween(500)) togetherWith fadeOut(tween(500)) },
                        label = ""
                    ) { isRegistering ->
                        if (isRegistering) {
                            WelcomeAndRegister(viewModel)
                        } else {
                            if (viewModel.currentMode == UserRole.CLIENT) {
                                ClientModule(viewModel, showChat, onOpenCamera = { callback ->
                                    onCameraResult = callback
                                    showCamera = true
                                })
                            } else {
                                DeliveryModule(viewModel, showChat, onOpenCamera = { callback ->
                                    onCameraResult = callback
                                    showCamera = true
                                })
                            }
                        }
                    }

                    // Notificación In-App Global
                    InAppNotificationOverlay(viewModel, showChat)

                    // Diálogo de Agradecimiento Vistoso
                    if (viewModel.showThankYouDialog) {
                        ThankYouDialog(viewModel)
                    }

                    if (user != null && user.phone.isBlank()) {
                        CompleteWhatsappDialog(viewModel, user.role)
                    }
                }
            }
        }
    }
}

@Composable
fun CompleteWhatsappDialog(viewModel: MainViewModel, role: UserRole) {
    val context = LocalContext.current
    var phone by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = {},
        confirmButton = {
            Button(
                onClick = { viewModel.updateWhatsappPhone(phone, context) },
                enabled = phone.isNotBlank()
            ) {
                Text("GUARDAR", fontWeight = FontWeight.Bold)
            }
        },
        title = {
            Text(
                if (role == UserRole.CLIENT) "WhatsApp del cliente" else "WhatsApp del delivery",
                fontWeight = FontWeight.ExtraBold
            )
        },
        text = {
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Numero de WhatsApp") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Default.Phone, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done)
            )
        },
        shape = RoundedCornerShape(24.dp),
        containerColor = Color.White
    )
}

@Composable
fun ThankYouDialog(viewModel: MainViewModel) {
    AlertDialog(
        onDismissRequest = { viewModel.showThankYouDialog = false },
        confirmButton = {
            Button(
                onClick = { viewModel.showThankYouDialog = false },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                shape = RoundedCornerShape(30.dp)
            ) {
                Text("CERRAR", fontWeight = FontWeight.Bold)
            }
        },
        title = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Celebration, contentDescription = null, tint = Color(0xFFD32F2F), modifier = Modifier.size(64.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("¡MUCHAS GRACIAS!", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
            }
        },
        text = {
            Text(
                viewModel.thankYouDialogMessage,
                textAlign = TextAlign.Center,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth(),
                color = Color.Black
            )
        },
        shape = RoundedCornerShape(24.dp),
        containerColor = Color.White
    )
}

@Composable
fun WelcomeAndRegister(viewModel: MainViewModel) {
    val activity = (LocalContext.current as? ComponentActivity)
    val forcedRole = viewModel.forcedRole

    if (forcedRole != null) {
        RegisterScreen(viewModel, forcedRole)
        return
    }

    RapidingoBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                color = ApkBrandOrange.copy(alpha = 0.18f),
                shape = RoundedCornerShape(28.dp),
                shadowElevation = 14.dp,
                modifier = Modifier.size(104.dp),
                border = BorderStroke(1.dp, ApkBrandBorder)
            ) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = ApkBrandOrange, modifier = Modifier.padding(24.dp))
            }
            Spacer(modifier = Modifier.height(26.dp))
            Text("APP SIN ROL", fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.Black, color = Color.White, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Instala la APK Cliente o la APK Delivery. Esta version no tiene rol configurado.",
                color = ApkBrandMuted,
                textAlign = TextAlign.Center,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.height(32.dp))
            RapidingoPrimaryButton(
                text = "CERRAR APLICACION",
                onClick = { activity?.finish() },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun RegisterScreen(viewModel: MainViewModel, role: UserRole) {
    val context = LocalContext.current
    val activity = LocalContext.current as? ComponentActivity
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var googleUserId by remember { mutableStateOf<String?>(null) }
    val emailValid = remember(email) { Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() }
    
    var hasLocationPerm by remember { 
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) 
    }
    val locLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { perms ->
        hasLocationPerm = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }
    val googleSignInClient = remember(context) {
        GoogleSignIn.getClient(
            context,
            GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken("916799303545-7cgugqk1u0t920nn0aijbftr3atopj5t.apps.googleusercontent.com")
                .requestEmail()
                .build()
        )
    }
    val gmailLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val accountEmail = account.email.orEmpty().lowercase()
            val accountName = account.displayName?.takeIf { it.isNotBlank() }
                ?: accountEmail.substringBefore('@')

            if (accountEmail.isBlank()) {
                Toast.makeText(context, "No se pudo leer el correo Gmail", Toast.LENGTH_LONG).show()
            } else {
                googleUserId = account.id?.let { "google_$it" } ?: accountEmail
                email = accountEmail
                name = accountName.uppercase()
                viewModel.loginRegisteredEmail(accountEmail, role, context)
                Toast.makeText(context, "Gmail conectado: $accountEmail", Toast.LENGTH_SHORT).show()
            }
        } catch (e: ApiException) {
            Log.e("Rapidingo", "Error Gmail sign-in: ${e.statusCode}", e)
            Toast.makeText(context, "No se pudo iniciar con Gmail. Codigo: ${e.statusCode}", Toast.LENGTH_LONG).show()
        }
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(ApkBrandBlack, Color(0xFF16110D), ApkBrandBlack)))
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = ApkBrandPanel,
            shadowElevation = 14.dp,
            border = BorderStroke(1.dp, ApkBrandBorder)
        ) {
            Column(modifier = Modifier.padding(22.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(62.dp),
                        shape = RoundedCornerShape(22.dp),
                        color = ApkBrandPanelSoft,
                        shadowElevation = 8.dp
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.brand_logo),
                            contentDescription = "Rapidingo",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(if (role == UserRole.CLIENT) "CLIENTE" else "DELIVERY", fontSize = 12.sp, fontWeight = FontWeight.Black, color = ApkBrandOrange, letterSpacing = 3.sp)
                        Text("Rapidingo", fontSize = 30.sp, lineHeight = 32.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Text(if (role == UserRole.CLIENT) "APP CLIENTE" else "APP DELIVERY", fontSize = 14.sp, fontWeight = FontWeight.Black, color = ApkBrandYellow)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = ApkBrandOrange, modifier = Modifier.size(22.dp))
                    Text("- - - - - -", color = Color.White.copy(alpha = 0.2f), fontWeight = FontWeight.Black)
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = ApkBrandYellow, modifier = Modifier.size(22.dp))
                    Text("- - -", color = Color.White.copy(alpha = 0.2f), fontWeight = FontWeight.Black)
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(22.dp))
        Text(if (role == UserRole.CLIENT) "Registro Cliente" else "Registro Delivery", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color.White)
        Text(if (role == UserRole.CLIENT) "Crea tu acceso para pedir en Trinidad." else "Acceso interno para recibir y entregar pedidos.", color = ApkBrandMuted, fontWeight = FontWeight.Black)
        Spacer(modifier = Modifier.height(20.dp))

        OutlinedButton(
            onClick = {
                googleSignInClient.signOut().addOnCompleteListener {
                    gmailLauncher.launch(googleSignInClient.signInIntent)
                }
            },
            modifier = Modifier.fillMaxWidth().height(58.dp),
            enabled = !viewModel.isRegisteringUser,
            border = BorderStroke(2.dp, Color.White),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White, contentColor = ApkBrandBlack)
        ) {
            Text("G", fontSize = 22.sp, fontWeight = FontWeight.Black, color = ApkBrandOrange, modifier = Modifier.padding(end = 10.dp))
            Text("CONTINUAR CON GMAIL", fontWeight = FontWeight.ExtraBold)
        }
        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it.uppercase() },
            label = { Text("Nombre completo") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Person, null, tint = ApkBrandOrange) },
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, color = Color.White),
            colors = rapidingoTextFieldColors()
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it.trim() },
            label = { Text("Correo electronico") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Email, null, tint = ApkBrandOrange) },
            isError = email.isNotBlank() && !emailValid,
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, color = Color.White),
            colors = rapidingoTextFieldColors(),
            supportingText = {
                if (email.isNotBlank() && !emailValid) {
                    Text("Ingresa un correo valido")
                }
            }
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Numero de WhatsApp") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Phone, null, tint = ApkBrandOrange) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, color = Color.White),
            colors = rapidingoTextFieldColors()
        )
        Spacer(modifier = Modifier.height(20.dp))

        if (!hasLocationPerm) {
            Button(
                onClick = {
                    val perms = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                        perms.add(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    locLauncher.launch(perms.toTypedArray())
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = ApkBrandBlack),
                shape = RoundedCornerShape(16.dp)
            ) { Text("ACTIVAR UBICACION", fontWeight = FontWeight.Black) }
        } else {
            Surface(color = ApkBrandYellow.copy(alpha = 0.12f), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(), border = BorderStroke(1.dp, ApkBrandYellow.copy(alpha = 0.25f))) {
                Text("Ubicacion lista para compartir durante pedidos", color = Color.White, fontWeight = FontWeight.Black, modifier = Modifier.padding(14.dp), textAlign = TextAlign.Center)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))
        Text("La camara se pedira cuando envies fotos o comprobantes", color = ApkBrandMuted, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))

        Spacer(modifier = Modifier.height(18.dp))
        Button(
            onClick = {
                if (name.isBlank() || !emailValid) {
                    Toast.makeText(context, "Completa tu nombre y correo", Toast.LENGTH_SHORT).show()
                } else if (!hasLocationPerm) {
                    Toast.makeText(context, "Primero activa la ubicacion", Toast.LENGTH_SHORT).show()
                    val perms = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                        perms.add(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    locLauncher.launch(perms.toTypedArray())
                } else {
                    Toast.makeText(context, "Registrando...", Toast.LENGTH_SHORT).show()
                    viewModel.registerUser(name.trim().uppercase(), email, phone, role, context, googleUserId)
                }
            },
            modifier = Modifier.fillMaxWidth().height(60.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = ApkBrandOrange,
                disabledContainerColor = Color(0xFF2A2A2A),
                disabledContentColor = Color(0xFF686868)
            ),
            shape = RoundedCornerShape(18.dp),
            enabled = name.isNotBlank() && emailValid && !viewModel.isRegisteringUser
        ) {
            Text(if (viewModel.isRegisteringUser) "REGISTRANDO..." else "LISTO, ENTRAR", fontWeight = FontWeight.Black)
        }
        TextButton(
            onClick = { activity?.finish() },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = ApkBrandOrange)
            Spacer(Modifier.width(8.dp))
            Text("SALIR DE LA APLICACION", fontWeight = FontWeight.Black, color = ApkBrandOrange)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientModule(viewModel: MainViewModel, showChat: MutableState<Boolean>, onOpenCamera: ((Uri) -> Unit) -> Unit) {
    var orderText by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var expandDirectory by remember { mutableStateOf(false) }
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

    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.uploadPaymentPhoto(it) }
    }
    
    val fileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.uploadPaymentPhoto(it) } 
    }
    
    Scaffold(
        topBar = { 
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ApkBrandPanel,
                    titleContentColor = Color.White,
                    actionIconContentColor = ApkBrandOrange
                ),
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            color = ApkBrandPanelSoft,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.size(44.dp),
                            border = BorderStroke(1.dp, ApkBrandBorder)
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.brand_logo),
                                contentDescription = "Rapidingo",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "¡Hola, $clientName!",
                                fontSize = 20.sp,
                                lineHeight = 22.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                "CLIENTE RAPIDINGO",
                                fontSize = 12.sp,
                                lineHeight = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = ApkBrandYellow,
                                maxLines = 1
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            color = if (availableDeliveries > 0) Color(0xFF2E7D32).copy(alpha = 0.15f) else ApkBrandOrange.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, if (availableDeliveries > 0) Color(0xFF4CAF50) else ApkBrandOrange),
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
                                    color = if (availableDeliveries > 0) Color(0xFF81C784) else ApkBrandOrange,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                },
                actions = { 
                    if (selectedCategory == "COMIDA" && viewModel.tempOrderItems.isNotEmpty()) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = ApkBrandOrange) {
                                    Text("${viewModel.tempOrderItems.sumOf { it.quantity }}", color = Color.White)
                                }
                            }
                        ) {
                            IconButton(onClick = { showSummaryDialog = true }) {
                                Icon(Icons.Default.ReceiptLong, null, tint = ApkBrandOrange)
                            }
                        }
                    }
                    IconButton(onClick = { closeClientSession() }) { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Cerrar sesion", tint = ApkBrandOrange) }
                }
            ) 
        },
        floatingActionButton = {
            if (selectedCategory == "COMIDA" && viewModel.tempOrderItems.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { showSummaryDialog = true },
                    containerColor = ApkBrandOrange,
                    contentColor = Color.White,
                    icon = { Icon(Icons.Default.ReceiptLong, null) },
                    text = { Text("VER RESUMEN (${viewModel.tempOrderItems.sumOf { it.quantity }})") }
                )
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding).fillMaxSize().background(ApkBrandBlack)) {
            if (viewModel.activeOrder == null) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        CategoryButton("COMIDA", R.drawable.category_restaurant, Color(0xFFFFF3E0), selectedCategory == "COMIDA", Modifier.weight(1f)) {
                            selectedCategory = "COMIDA"
                        }
                        CategoryButton("FARMACIA", R.drawable.category_pharmacy, Color(0xFFE3F2FD), selectedCategory == "FARMACIA", Modifier.weight(1f)) {
                            selectedCategory = "FARMACIA"
                        }
                        CategoryButton("OTROS", R.drawable.category_other, Color(0xFFF3E5F5), selectedCategory == "OTROS", Modifier.weight(1f)) {
                            selectedCategory = "OTROS"
                        }
                    }

                    if (selectedCategory == "COMIDA") {
                        RestaurantCarouselScreen(
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
                                 label = { Text("Detalle del pedido y referencia") },
                                 placeholder = { Text("Escribe aquí lo que necesitas") },
                                 modifier = Modifier
                                     .fillMaxWidth()
                                     .height(140.dp),
                                 keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                                 visualTransformation = UppercaseVisualTransformation,
                                 shape = RoundedCornerShape(22.dp),
                                 textStyle = TextStyle(fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White),
                                 colors = rapidingoTextFieldColors()
                             )

                             Card(
                                 modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                                 colors = CardDefaults.cardColors(containerColor = ApkBrandPanel),
                                 elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                                 shape = RoundedCornerShape(22.dp)
                             ) {
                                 Column(modifier = Modifier.padding(12.dp)) {
                                     Row(
                                         verticalAlignment = Alignment.CenterVertically,
                                         modifier = Modifier.graphicsLayer(alpha = if (isLocationConfirmedByUser) 1.0f else 0.4f)
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
                                                 checkedColor = ApkBrandOrange,
                                                 uncheckedColor = Color.White,
                                                 checkmarkColor = Color.White
                                             )
                                         )
                                         Column {
                                             Text("Enviar a otra ubicación", fontWeight = FontWeight.Black, fontSize = 15.sp, color = ApkBrandOrange)
                                             val locDesc = if (!isLocationConfirmedByUser) "Confirma tu ubicación al pedir" else if (selectedDestination != null) "Punto marcado en el mapa" else "Se enviará a tu posición actual"
                                             Text(locDesc, color = ApkBrandYellow, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
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
                                    containerColor = ApkBrandOrange,
                                    disabledContainerColor = Color(0xFF2A2A2A),
                                    disabledContentColor = Color(0xFF686868)
                                ),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 10.dp),
                                shape = RoundedCornerShape(20.dp)
                            ) { 
                                Text("¡PEDIR AHORA!", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White)
                            }
                        }
                    }
                }
            } else {
                OSMOrderTracking(viewModel, onOpenChat = { showChat.value = true })
            }
        }
    }

    if (showLocationConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showLocationConfirmDialog = false },
            title = {
                Text(
                    "CONFIRMACIÓN DE ENTREGA",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = Color.White
                )
            },
            text = {
                Text(
                    "¿EL PEDIDO LLEGARÁ A TU UBICACIÓN ACTUAL?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.8f)
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
                    colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange)
                ) {
                    Text("SÍ, AQUÍ MISMO", fontWeight = FontWeight.Black)
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
                    Text("NO, OTRA UBICACIÓN", fontWeight = FontWeight.Bold, color = ApkBrandOrange)
                }
            },
            containerColor = ApkBrandPanel,
            shape = RoundedCornerShape(22.dp)
        )
    }

    if (showOrderDialog && currentRestaurantForDialog != null) {
        RestaurantOrderDialog(
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
        OrderSummaryDialog(
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

    if (showChat.value) {
        viewModel.lastReadChatSize = viewModel.activeOrder?.chatHistory?.size ?: 0
        ChatDialog(viewModel, viewModel.clientUser?.id ?: "", onDismiss = { showChat.value = false }, onOpenCamera = onOpenCamera)
    }
    if (showDestinationPicker) {
        DestinationPickerDialog(
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
fun RestaurantCarouselScreen(
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
                    label = { Text(category, fontWeight = FontWeight.Black) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = ApkBrandOrange,
                        selectedLabelColor = Color.White,
                        containerColor = ApkBrandPanel,
                        labelColor = Color.White
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = (category == selectedCategory || (category == "TODOS" && selectedCategory == null)),
                        borderColor = ApkBrandBorder,
                        selectedBorderColor = ApkBrandOrange
                    )
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.DoubleArrow, null, tint = ApkBrandOrange, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Doble clic en la tarjeta para pedir", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ApkBrandMuted)
        }

        LazyRow(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(filteredRestaurants) { restaurant ->
                RestaurantCardDoubleTap(
                    restaurant = restaurant,
                    onDoubleTap = { onRestaurantDoubleTap(restaurant) }
                )
            }
        }
    }
}

@Composable
fun RestaurantCardDoubleTap(
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
        colors = CardDefaults.cardColors(containerColor = ApkBrandPanel),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
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
                        Icon(Icons.Default.DoubleArrow, null, tint = Color(restaurant.logoColor), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("DOBLE CLIC PARA PEDIR", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(restaurant.logoColor))
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
                    color = Color(restaurant.logoColor)
                )
            }
        }
    }
}

@Composable
fun ZoomableImage(
    url: String?,
    modifier: Modifier = Modifier
) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    BoxWithConstraints(
        modifier = modifier
            .clip(RectangleShape)
    ) {
        val scope = this
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        scale = (scale * zoom).coerceIn(1f, 5f)
                        val maxX = (scope.constraints.maxWidth * (scale - 1)) / 2
                        val maxY = (scope.constraints.maxHeight * (scale - 1)) / 2
                        offset = Offset(
                            x = (offset.x + pan.x).coerceIn(-maxX, maxX),
                            y = (offset.y + pan.y).coerceIn(-maxY, maxY)
                        )
                    }
                }
        ) {
            AsyncImage(
                model = url,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer(
                        scaleX = scale,
                        scaleY = scale,
                        translationX = offset.x,
                        translationY = offset.y
                    ),
                contentScale = ContentScale.Fit
            )
        }
    }
}

@Composable
fun RestaurantOrderDialog(
    restaurant: Restaurant,
    existingItems: List<TempOrderItem>,
    onAddItem: (String, Int) -> Unit,
    onRemoveItem: (String) -> Unit,
    onUpdateQuantity: (String, Int) -> Unit,
    onDismiss: () -> Unit
) {
    // Usamos el mismo estado de filas temporales que en la PWA
    val draftRows = remember { mutableStateListOf(TempOrderItem(restaurantId = restaurant.id, restaurantName = restaurant.name, productName = "")) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color(0xFF111111)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header (Z-Index alto)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF111111).copy(alpha = 0.95f))
                        .padding(horizontal = 8.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, null, tint = Color.White)
                    }
                    Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                        Text(restaurant.name.uppercase(), color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(restaurant.schedule.uppercase(), color = Color.White.copy(alpha = 0.6f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }

                // Zona de Menú (Zoomable) - Ocupa la parte superior
                Box(modifier = Modifier.weight(1.3f)) {
                    ZoomableImage(
                        url = restaurant.menuUrl ?: restaurant.logoUrl,
                        modifier = Modifier.fillMaxSize()
                    )

                    Surface(
                        color = Color.Black.copy(alpha = 0.6f),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 20.dp)
                    ) {
                        Text(
                            "HACE ZOOM PARA VER PRECIOS",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                        )
                    }
                }

                // Panel de Pedido (Blanco) - Simula el 42% de la PWA
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    color = Color.White,
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text("RESERVA DE MENU", fontWeight = FontWeight.Black, fontSize = 12.sp, color = ApkBrandOrange, letterSpacing = 1.sp)
                        Text(restaurant.name.uppercase(), fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF161616))

                        Spacer(Modifier.height(12.dp))

                        // Lista de filas de entrada (Tipo Excel/PWA)
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
                                        .background(Color(0xFFF9F9F9), RoundedCornerShape(16.dp))
                                        .border(1.dp, Color(0xFFE0E0E0), RoundedCornerShape(16.dp))
                                        .padding(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        OutlinedTextField(
                                            value = row.productName,
                                            onValueChange = { draftRows[index] = row.copy(productName = it.uppercase()) },
                                            placeholder = { Text("¿QUÉ VAS A PEDIR?", fontSize = 12.sp, color = Color.Gray) },
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(10.dp),
                                            textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF161616)),
                                            singleLine = true,
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = ApkBrandOrange,
                                                unfocusedBorderColor = Color(0xFFE0E0E0),
                                                focusedContainerColor = Color.White,
                                                unfocusedContainerColor = Color.White,
                                                focusedTextColor = Color(0xFF161616),
                                                unfocusedTextColor = Color(0xFF161616)
                                            )
                                        )
                                        Spacer(Modifier.width(10.dp))
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.background(Color.White, RoundedCornerShape(10.dp)).border(1.dp, ApkBrandOrange.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                        ) {
                                            IconButton(onClick = { if (row.quantity > 1) draftRows[index] = row.copy(quantity = row.quantity - 1) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Default.Remove, null, tint = ApkBrandOrange, modifier = Modifier.size(16.dp))
                                            }
                                            Text("${row.quantity}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF161616), modifier = Modifier.padding(horizontal = 6.dp))
                                            IconButton(onClick = { draftRows[index] = row.copy(quantity = row.quantity + 1) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Default.Add, null, tint = ApkBrandOrange, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                        if (draftRows.size > 1) {
                                            IconButton(onClick = { draftRows.removeAt(index) }, modifier = Modifier.size(36.dp)) {
                                                Icon(Icons.Default.Delete, null, tint = Color.Red.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
                                            }
                                        }
                                    }
                                    if (index == 0 && draftRows.size == 1) {
                                        Text(
                                            "Presione \"+\" para agregar a su pedido",
                                            fontSize = 10.sp,
                                            color = ApkBrandOrange,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(top = 4.dp, start = 4.dp)
                                        )
                                    }
                                }
                            }

                            Button(
                                onClick = { draftRows.add(TempOrderItem(restaurantId = restaurant.id, restaurantName = restaurant.name, productName = "")) },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = ApkBrandOrange),
                                border = BorderStroke(1.5.dp, ApkBrandOrange)
                            ) {
                                Icon(Icons.Default.Add, null, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("AÑADIR OTRA FILA", fontWeight = FontWeight.Black, fontSize = 14.sp)
                            }
                        }

                        Spacer(Modifier.height(12.dp))

                        // Botón Primario: RESERVAR (Como en PWA)
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
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange)
                        ) {
                            Icon(Icons.Default.ReceiptLong, null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            Text("RESERVAR PEDIDO", fontWeight = FontWeight.Black, fontSize = 15.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OrderSummaryDialog(
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
            color = Color(0xFF111111).copy(alpha = 0.98f)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header (Z-Index alto)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, null, tint = Color.White)
                    }
                    Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                        Text("RESUMEN DE PEDIDO", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Text("$totalItems productos en tu lista", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    IconButton(onClick = onClearAll) {
                        Icon(Icons.Default.DeleteSweep, null, tint = Color.Red.copy(alpha = 0.8f))
                    }
                }

                // Cuerpo Blanco (Contenedor Excel)
                Surface(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    color = Color.White,
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // CABECERA TABLA EXCEL
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF263238), RoundedCornerShape(8.dp))
                                .padding(10.dp)
                        ) {
                            Text("DESCRIPCIÓN DEL PEDIDO", modifier = Modifier.weight(1f), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.White)
                            Text("CANT.", modifier = Modifier.width(50.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.White, textAlign = TextAlign.Center)
                            Text("OPC.", modifier = Modifier.width(60.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.White, textAlign = TextAlign.Center)
                        }

                        Spacer(Modifier.height(8.dp))

                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(1.dp) // Sin espacio para simular bordes de tabla
                        ) {
                            items(items) { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(0.5.dp, Color.LightGray)
                                        .padding(vertical = 4.dp, horizontal = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.productName.uppercase(), fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF161616), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(item.restaurantName.uppercase(), fontSize = 9.sp, color = ApkBrandOrange, fontWeight = FontWeight.Bold)
                                    }
                                    Text(
                                        "x${item.quantity}",
                                        modifier = Modifier.width(50.dp),
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        color = Color(0xFF161616),
                                        textAlign = TextAlign.Center
                                    )
                                    Row(modifier = Modifier.width(60.dp), horizontalArrangement = Arrangement.End) {
                                        IconButton(onClick = { onEditItem(item.id) }, modifier = Modifier.size(30.dp)) {
                                            Icon(Icons.Default.Visibility, null, tint = Color(0xFF1976D2), modifier = Modifier.size(18.dp))
                                        }
                                        IconButton(onClick = { onRemoveItem(item.id) }, modifier = Modifier.size(30.dp)) {
                                            Icon(Icons.Default.Delete, null, tint = Color.Red.copy(alpha = 0.6f), modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF111111)),
                            shape = RoundedCornerShape(18.dp),
                            border = BorderStroke(1.dp, ApkBrandOrange.copy(alpha = 0.35f))
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("DESTINO DE ENTREGA", color = ApkBrandOrange, fontWeight = FontWeight.Black, fontSize = 12.sp)
                                Text(deliveryLocationLabel, color = ApkBrandYellow, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Button(
                                        onClick = onUseCurrentLocation,
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = if (isDeliveryLocationConfirmed && !isOtherLocation) ApkBrandOrange else Color(0xFF2A2A2A))
                                    ) {
                                        Text("MI UBICACION", fontWeight = FontWeight.Black, fontSize = 11.sp)
                                    }
                                    Button(
                                        onClick = onUseOtherLocation,
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(containerColor = if (isOtherLocation) ApkBrandOrange else Color(0xFF2A2A2A))
                                    ) {
                                        Text("OTRA", fontWeight = FontWeight.Black, fontSize = 11.sp)
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        // BOTÓN FINAL
                        Button(
                            onClick = onConfirmOrder,
                            modifier = Modifier.fillMaxWidth().height(60.dp),
                            shape = RoundedCornerShape(18.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange)
                        ) {
                            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.width(12.dp))
                            Text("ENVIAR PEDIDO AHORA", fontWeight = FontWeight.Black, fontSize = 16.sp)
                        }

                        TextButton(
                            onClick = onDismiss,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("SEGUIR AGREGANDO MÁS", color = Color(0xFF455A64), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DestinationPickerDialog(
    initialLocation: MyLatLng,
    onDismiss: () -> Unit,
    onConfirm: (MyLatLng) -> Unit
) {
    var selectedPoint by remember(initialLocation) { mutableStateOf(initialLocation) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(shape = RoundedCornerShape(24.dp), color = ApkBrandPanel, tonalElevation = 8.dp) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Destino de entrega", color = ApkBrandOrange, fontSize = 12.sp, fontWeight = FontWeight.Black)
                        Text("Mueve el mapa", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.White)
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
                    
                    // BOTÓN SATÉLITE PEQUEÑO
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp)
                            .size(36.dp)
                            .clickable { isSatellite = !isSatellite },
                        shape = CircleShape,
                        color = Color.White,
                        shadowElevation = 6.dp
                    ) {
                        Icon(
                            if (isSatellite) Icons.Default.Map else Icons.Default.SatelliteAlt,
                            contentDescription = null,
                            modifier = Modifier.padding(8.dp),
                            tint = ApkBrandOrange
                        )
                    }

                    // Pin central fijo para seleccionar
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.align(Alignment.Center).size(48.dp).offset(y = (-24).dp),
                        tint = ApkBrandOrange
                    )
                }

                Text(
                    "Ubica el pin rojo en el punto exacto de entrega.",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onDismiss, 
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.5f))
                    ) {
                        Text("CANCELAR", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Button(
                        onClick = { onConfirm(selectedPoint) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange)
                    ) {
                        Text("CONFIRMAR", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun MapLibrePickerView(
    initialLocation: MyLatLng,
    onPointSelected: (MyLatLng) -> Unit,
    modifier: Modifier = Modifier,
    isSatellite: Boolean = false
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var mapLibreMap by remember { mutableStateOf<MapLibreMap?>(null) }
    
    val mapTilerKey = "3cP8iNk1Zj2ghLvTv5eB"
    val styleUrl = if (isSatellite) 
        "https://api.maptiler.com/maps/hybrid/style.json?key=$mapTilerKey"
        else "https://api.maptiler.com/maps/streets-v2/style.json?key=$mapTilerKey"

    LaunchedEffect(isSatellite) {
        mapLibreMap?.setStyle(styleUrl)
    }

    val mapView = remember {
        MapLibreMapView(context).apply {
            onCreate(null)
            getMapAsync { map ->
                mapLibreMap = map
                map.uiSettings.isCompassEnabled = true
                map.uiSettings.isRotateGesturesEnabled = false // FORZAR NORTE
                map.uiSettings.isTiltGesturesEnabled = true
                
                map.setStyle(styleUrl)

                val camera = CameraPosition.Builder()
                    .target(LatLng(initialLocation.latitude, initialLocation.longitude))
                    .zoom(17.0)
                    .tilt(0.0)
                    .bearing(0.0) // NORTE
                    .build()
                map.moveCamera(CameraUpdateFactory.newCameraPosition(camera))
                
                map.addOnCameraIdleListener {
                    map.cameraPosition.target?.let { target ->
                        onPointSelected(MyLatLng(target.latitude, target.longitude))
                    }
                }
            }
        }
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_START -> mapView.onStart()
                androidx.lifecycle.Lifecycle.Event.ON_RESUME -> mapView.onResume()
                androidx.lifecycle.Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> mapView.onStop()
                androidx.lifecycle.Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onDestroy()
        }
    }

    AndroidView(factory = { mapView }, modifier = modifier)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryModule(viewModel: MainViewModel, showChat: MutableState<Boolean>, onOpenCamera: ((Uri) -> Unit) -> Unit) {
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

    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { viewModel.uploadPaymentPhoto(it) }
    }
    
    Scaffold(topBar = { 
        TopAppBar(
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = ApkBrandPanel,
                titleContentColor = Color.White,
                actionIconContentColor = ApkBrandOrange
            ),
            title = { 
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Surface(
                        color = ApkBrandPanelSoft,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.size(42.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.brand_logo),
                            contentDescription = "Rapidingo",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("RAPIDINGO", fontSize = 19.sp, lineHeight = 22.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Text(deliveryName.ifBlank { "Repartidor" }, fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, color = ApkBrandYellow, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Surface(
                        color = ApkBrandSuccess.copy(alpha = 0.16f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("ONLINE", modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFF50E36D))
                    }
                }
            }, 
            actions = { 
                IconButton(onClick = { showReports.value = true }) { Icon(Icons.Default.Assessment, contentDescription = "Reportes") }
                IconButton(onClick = { closeDeliveryApp() }) { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Cerrar sesion", tint = ApkBrandOrange) }
            }
        ) 
    }) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize().background(ApkBrandBlack)) {
            val order = viewModel.activeOrder
            if (order == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Surface(shape = RoundedCornerShape(34.dp), color = ApkBrandPanel, modifier = Modifier.size(104.dp), border = BorderStroke(1.dp, ApkBrandBorder), shadowElevation = 12.dp) {
                            Icon(Icons.Default.TwoWheeler, contentDescription = null, modifier = Modifier.padding(24.dp), tint = ApkBrandOrange)
                        }
                        Spacer(Modifier.height(18.dp))
                        Text("ESTÁS ONLINE", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White)
                        Text("Los pedidos llegarán pronto a Trinidad.", color = ApkBrandMuted, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, modifier = Modifier.padding(16.dp))
                        Button(
                            onClick = { closeDeliveryApp() },
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange),
                            shape = RoundedCornerShape(18.dp),
                            modifier = Modifier.height(54.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ExitToApp, null, tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text("CERRAR SESION", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            } else {
                Box(modifier = Modifier.fillMaxSize()) {
                    OSMDeliveryTracking(viewModel, prodPrice, servPrice, { prodPrice = it }, { servPrice = it }, onOpenChat = { showChat.value = true })
                }
            }
        }
    }
    if (showChat.value) {
        viewModel.lastReadChatSize = viewModel.activeOrder?.chatHistory?.size ?: 0
        ChatDialog(viewModel, viewModel.deliveryUser?.id ?: "", onDismiss = { showChat.value = false }, onOpenCamera = onOpenCamera)
    }
    if (showReports.value) ReportsDialog(viewModel, onDismiss = { showReports.value = false })
}

@Composable
fun ReportsDialog(viewModel: MainViewModel, onDismiss: () -> Unit) {
    val completedOrders = viewModel.completedOrdersList 
    val totalEarnings = completedOrders.sumOf { it.servicePrice ?: 0.0 }
    val totalProducts = completedOrders.sumOf { it.productPrice ?: 0.0 }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ApkBrandPanel,
        titleContentColor = Color.White,
        textContentColor = Color.White,
        confirmButton = { TextButton(onClick = onDismiss) { Text("CERRAR", color = ApkBrandOrange, fontWeight = FontWeight.Black) } },
        title = { Text("Resumen de Ganancias", fontWeight = FontWeight.Black) },
        text = {
            Column {
                Text("Total de Pedidos: ${completedOrders.size}", fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Ganancia neta (Servicios): Bs. $totalEarnings", color = ApkBrandYellow, fontWeight = FontWeight.ExtraBold)
                Text("Monto en Productos: Bs. $totalProducts", color = ApkBrandMuted, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(16.dp))
                Text("Tus pedidos hoy:", fontSize = 14.sp, color = ApkBrandMuted, fontWeight = FontWeight.SemiBold)
                LazyColumn(modifier = Modifier.height(200.dp)) {
                    items(completedOrders) { order ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(order.description.take(20) + "...", fontSize = 12.sp)
                            Text("Bs. ${order.servicePrice}", fontWeight = FontWeight.Bold, color = ApkBrandYellow)
                        }
                    }
                }
            }
        }
    )
}

@Composable
fun OSMOrderTracking(viewModel: MainViewModel, onOpenChat: () -> Unit) {
    val context = LocalContext.current
    val order = viewModel.activeOrder ?: return
    val deliveryDestination = order.destinationLocation ?: order.clientLocation ?: MyLatLng()
    val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
    // Si ya compró o está en camino, el flujo es más restringido
    val isEnRoute = order.status == OrderStatus.IN_DELIVERY ||
        order.status == OrderStatus.DELIVERED_BY_REPARTIDOR ||
        (!isFoodOrder && order.status == OrderStatus.PICKING_UP)
    val deliveryNameDisplay = order.deliveryName?.ifBlank { "Repartidor" } ?: "Repartidor"

    Box(modifier = Modifier.fillMaxSize()) {
        if (isEnRoute) {
            // Mapa ocupa todo el fondo con efecto 2.5D
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
            Box(modifier = Modifier.fillMaxSize().background(ApkBrandBlack))
        }

        // Panel de Control Inferior - Muy compacto si ya está en camino
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(horizontal = 12.dp, vertical = 20.dp),
            shape = RoundedCornerShape(32.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 20.dp),
            colors = CardDefaults.cardColors(containerColor = ApkBrandPanel),
            border = BorderStroke(1.dp, ApkBrandBorder)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                if (!isEnRoute) {
                    // Vista previa al despacho (Cotización/Confirmación)
                    Row(
                        modifier = Modifier.fillMaxWidth(), 
                        horizontalArrangement = Arrangement.SpaceBetween, 
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                order.status.toSpanish().uppercase(), 
                                fontWeight = FontWeight.Black, 
                                color = ApkBrandOrange,
                                fontSize = 11.sp,
                                letterSpacing = 1.sp
                            )
                            Text(
                                deliveryNameDisplay, 
                                fontWeight = FontWeight.ExtraBold, 
                                color = Color.White,
                                fontSize = 20.sp
                            )
                        }
                        
                        if (order.totalPrice != null) {
                            Column(horizontalAlignment = Alignment.End) {
                                Text("A PAGAR", fontSize = 11.sp, fontWeight = FontWeight.Black, color = ApkBrandMuted)
                                Text("Bs. ${order.totalPrice}", fontSize = 26.sp, fontWeight = FontWeight.Black, color = ApkBrandYellow)
                            }
                        }
                    }
                    
                    Spacer(Modifier.height(16.dp))

                    if (order.status == OrderStatus.WAITING_CONFIRM) {
                        Button(
                            onClick = { viewModel.updateOrderStatus(OrderStatus.CONFIRMED_BY_CLIENT) }, 
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandYellow, contentColor = ApkBrandBlack),
                            shape = RoundedCornerShape(16.dp)
                        ) { 
                            Text("ACEPTAR Y CONFIRMAR PEDIDO", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp) 
                        }
                        Spacer(Modifier.height(12.dp))
                    } else if (order.status == OrderStatus.BIDDING) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape), 
                            color = ApkBrandOrange,
                            trackColor = Color.White.copy(alpha = 0.08f)
                        )
                        Text("Buscando el mejor precio para ti...", fontSize = 12.sp, color = ApkBrandMuted, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally))
                        Spacer(Modifier.height(16.dp))
                    }
                } else {
                    // Vista compacta durante el seguimiento real
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            color = ApkBrandOrange.copy(alpha = 0.18f),
                            shape = CircleShape,
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(Icons.Default.TwoWheeler, null, tint = ApkBrandOrange, modifier = Modifier.padding(12.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(order.status.toSpanish().uppercase(), fontWeight = FontWeight.Black, color = ApkBrandOrange, fontSize = 11.sp)
                            Text(deliveryNameDisplay, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color.White)
                        }
                    }
                    
                    if (order.status == OrderStatus.DELIVERED_BY_REPARTIDOR) {
                        Spacer(Modifier.height(14.dp))
                        Button(
                            onClick = { 
                                viewModel.addChatMessage("Ya salgo, gracias", viewModel.clientUser?.id ?: "")
                                viewModel.updateOrderStatus(OrderStatus.COMPLETED) 
                            }, 
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        ) { 
                            Icon(Icons.Default.Check, null, tint = Color.White)
                            Spacer(Modifier.width(10.dp))
                            Text("YA SALGO, GRACIAS", fontWeight = FontWeight.Black, fontSize = 15.sp)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }

                // Botones de comunicación: Siempre visibles y bien ajustados
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = onOpenChat,
                        modifier = Modifier.weight(1f).height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.08f)),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Chat, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("CHAT", fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                    if (hasWhatsAppPhone(order.deliveryPhone)) {
                        Button(
                            onClick = {
                                openWhatsAppMessage(context, order.deliveryPhone, "Hola Soy el cliente ${viewModel.clientUser?.name ?: order.clientName}")
                            },
                            modifier = Modifier.weight(1.2f).height(50.dp), // Un poco más ancho para que quepa bien el texto
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Phone, null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("WHATSAPP", fontSize = 9.sp, fontWeight = FontWeight.Black, maxLines = 1)
                        }
                    }
                }

                // Botón de Cancelar: Desaparece si el delivery ya compró (isEnRoute)
                if (!isEnRoute) {
                    TextButton(
                        onClick = { viewModel.updateOrderStatus(OrderStatus.CANCELLED) },
                        modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                    ) {
                        Text("CANCELAR PEDIDO", color = ApkBrandOrange, fontSize = 12.sp, fontWeight = FontWeight.Black, textDecoration = TextDecoration.Underline)
                    }
                }
            }
        }
    }
}

private fun parseQuoteRows(description: String?): List<QuoteRow> {
    val rows = mutableListOf<QuoteRow>()
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
                rows.add(QuoteRow(restaurant = currentRestaurant, item = itemName, quantity = qty))
            } else {
                rows.add(QuoteRow(restaurant = currentRestaurant, item = itemPart, quantity = 1))
            }
        }
    }
    return rows
}

@Composable
fun OSMDeliveryTracking(viewModel: MainViewModel, pPrice: String, sPrice: String, onPChange: (String) -> Unit, onSChange: (String) -> Unit, onOpenChat: () -> Unit) {
    val order = viewModel.activeOrder ?: return
    val deliveryDestination = order.destinationLocation ?: order.clientLocation
    val isFoodOrder = order.category == "COMIDA" || order.description.contains("RESTAURANTE:", ignoreCase = true)
    
    val quoteRows = remember(order.id, order.description) { parseQuoteRows(order.description) }
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
        
        // Panel de Control del Repartidor - Estilo Moderno
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            colors = CardDefaults.cardColors(containerColor = ApkBrandPanel),
            elevation = CardDefaults.cardElevation(defaultElevation = 22.dp),
            border = BorderStroke(1.dp, ApkBrandBorder)
        ) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 22.dp)) {
                // Info Cliente
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Surface(modifier = Modifier.size(48.dp), shape = CircleShape, color = ApkBrandOrange.copy(alpha = 0.18f)) {
                        Icon(Icons.Default.Person, null, modifier = Modifier.padding(11.dp), tint = ApkBrandOrange)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(clientNameDisplay.uppercase(), fontWeight = FontWeight.Black, color = Color.White, fontSize = 16.sp)
                        Text(order.description.uppercase(), fontWeight = FontWeight.Bold, color = ApkBrandMuted, fontSize = 13.sp)
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
                                colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange)
                            ) { 
                                Text("TOMAR PEDIDO", fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color.White, maxLines = 1) 
                            }
                            OutlinedButton(
                                onClick = { viewModel.rejectOrder() }, 
                                modifier = Modifier.weight(1f).height(58.dp),
                                border = BorderStroke(2.dp, ApkBrandOrange),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White.copy(alpha = 0.04f), contentColor = ApkBrandOrange)
                            ) { 
                                Text("RECHAZAR", fontSize = 13.sp, fontWeight = FontWeight.Bold) 
                            }
                        }
                    }
                    OrderStatus.BIDDING -> {
                        Column(modifier = Modifier.background(ApkBrandPanelSoft, RoundedCornerShape(18.dp)).padding(16.dp)) {
                            if (order.category == "COMIDA" && quoteRows.isNotEmpty()) {
                                Text("COTIZACIÓN DESGLOSADA", fontWeight = FontWeight.Black, fontSize = 13.sp, color = ApkBrandYellow)
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
                                            colors = CardDefaults.cardColors(containerColor = ApkBrandPanel),
                                            border = BorderStroke(1.dp, ApkBrandBorder)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(10.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(item.item, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                                                    Text("Cant: ${item.quantity} • ${item.restaurant}", fontSize = 11.sp, color = ApkBrandMuted)
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
                                                    colors = rapidingoTextFieldColors(),
                                                    singleLine = true
                                                )
                                            }
                                        }
                                    }
                                }
                                Spacer(Modifier.height(12.dp))
                                HorizontalDivider(modifier = Modifier.alpha(0.2f))
                                Spacer(Modifier.height(12.dp))
                                
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    OutlinedTextField(
                                        value = sPrice, 
                                        onValueChange = onSChange, 
                                        label = { Text("TARIFA ENVIÓ", fontSize = 11.sp, fontWeight = FontWeight.Black) }, 
                                        modifier = Modifier.weight(1f),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        textStyle = TextStyle(fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White),
                                        singleLine = true,
                                        colors = rapidingoTextFieldColors()
                                    )
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("SUBTOTAL PROD: Bs. $calculatedProductTotal", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color.White)
                                        Text("TOTAL: Bs. ${calculatedProductTotal + (sPrice.toDoubleOrNull() ?: 0.0)}", fontWeight = FontWeight.Black, color = ApkBrandYellow, fontSize = 24.sp)
                                    }
                                }
                            } else {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OutlinedTextField(
                                        value = pPrice, 
                                        onValueChange = onPChange, 
                                        label = { Text("PRODUCTOS", fontSize = 11.sp, fontWeight = FontWeight.Black) }, 
                                        modifier = Modifier.weight(1f),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White),
                                        colors = rapidingoTextFieldColors()
                                    )
                                    OutlinedTextField(
                                        value = sPrice, 
                                        onValueChange = onSChange, 
                                        label = { Text("TARIFA", fontSize = 11.sp, fontWeight = FontWeight.Black) }, 
                                        modifier = Modifier.weight(1f),
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        shape = RoundedCornerShape(12.dp),
                                        textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White),
                                        colors = rapidingoTextFieldColors()
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("TOTAL A COBRAR:", fontWeight = FontWeight.Black, color = ApkBrandMuted, fontSize = 14.sp)
                                    Text("Bs. $totalCalculated", fontWeight = FontWeight.Black, color = ApkBrandYellow, fontSize = 28.sp)
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
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange),
                            contentPadding = PaddingValues(horizontal = 14.dp)
                        ) { 
                            Text("ENVIAR COTIZACIÓN", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color.White, maxLines = 1) 
                        }
                    }
                    OrderStatus.CONFIRMED_BY_CLIENT -> {
                        Button(
                            onClick = { viewModel.updateOrderStatus(OrderStatus.PICKING_UP) }, 
                            modifier = Modifier.fillMaxWidth().height(62.dp), 
                            colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange),
                            shape = RoundedCornerShape(16.dp)
                        ) { 
                            Icon(Icons.Default.ShoppingCart, null, tint = Color.White)
                            Spacer(Modifier.width(10.dp))
                            Text(if (isFoodOrder) "AVISAR AL RESTAURANTE" else "IR A COMPRAR", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White, maxLines = 1) 
                        }
                    }
                    OrderStatus.PICKING_UP -> {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (isFoodOrder) {
                                Surface(modifier = Modifier.fillMaxWidth(), color = ApkBrandPanelSoft, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, ApkBrandBorder)) {
                                    Text("ESPERANDO DESPACHO DEL RESTAURANTE", color = ApkBrandYellow, modifier = Modifier.padding(16.dp), fontSize = 13.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                                }
                            } else {
                                Button(
                                    onClick = { viewModel.updateOrderStatus(OrderStatus.IN_DELIVERY) }, 
                                    modifier = Modifier.fillMaxWidth().height(62.dp), 
                                    colors = ButtonDefaults.buttonColors(containerColor = ApkBrandOrange),
                                    shape = RoundedCornerShape(16.dp)
                                ) { 
                                    Icon(Icons.Default.BikeScooter, null, tint = Color.White)
                                    Spacer(Modifier.width(10.dp))
                                    Text("COMPRADO, EN RUTA", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color.White, maxLines = 1) 
                                }
                                WazeButton(order, context, viewModel)
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
                                Text("¡YA LLEGUÉ!", fontWeight = FontWeight.Black, fontSize = 19.sp, color = Color.White, maxLines = 1)
                            }
                            WazeButton(order, context, viewModel)
                        }
                    }
                    else -> {
                        Surface(modifier = Modifier.fillMaxWidth(), color = Color(0xFFE8F5E9), shape = RoundedCornerShape(12.dp)) {
                            Text("ESPERANDO CONFIRMACIÓN DEL CLIENTE", color = Color(0xFF2E7D32), modifier = Modifier.padding(16.dp), fontSize = 13.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                // Footer: Chat, WhatsApp y Cancelar
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = onOpenChat, 
                        modifier = Modifier.weight(1f).height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF161616)),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Chat, null, modifier = Modifier.size(20.dp), tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("CHAT", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color.White) 
                    }
                    if (hasWhatsAppPhone(order.clientPhone)) {
                        Button(
                            onClick = {
                                openWhatsAppMessage(
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
                            Text("WHATSAPP", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, maxLines = 1)
                        }
                    }
                }
                
                if (order.status != OrderStatus.COMPLETED && order.status != OrderStatus.CANCELLED) {
                    TextButton(
                        onClick = { viewModel.rejectOrder() },
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                    ) {
                    Text("CANCELAR / RECHAZAR", color = ApkBrandOrange, fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
        }
    }
}

@Composable
fun WazeButton(order: Order, context: Context, viewModel: MainViewModel) {
    val clientLoc = order.destinationLocation ?: order.clientLocation
    if (clientLoc != null) {
        // Botón Waze (Modificado para notificar al cliente y abrir en paralelo)
        Button(
            onClick = {
                viewModel.updateWazeStatus(true)
                try {
                    val url = "waze://?ll=${clientLoc.latitude},${clientLoc.longitude}&navigate=yes"
                    val intent = Intent(Intent.ACTION_VIEW, url.toUri())
                    // Intentar abrir en modo Split Screen / Ventana adyacente
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
            Icon(Icons.Default.Navigation, null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("NAVEGAR CON WAZE", fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
fun GPSCheck(context: Context) {
    val settingResultRequest = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            Log.d("Rapidingo", "GPS activado por el usuario")
        } else {
            Toast.makeText(context, "El GPS es necesario para el funcionamiento", Toast.LENGTH_LONG).show()
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000).build()
                val builder = LocationSettingsRequest.Builder().addLocationRequest(locationRequest)
                val client: SettingsClient = LocationServices.getSettingsClient(context)
                val task: Task<LocationSettingsResponse> = client.checkLocationSettings(builder.build())

                task.addOnFailureListener { exception ->
                    if (exception is ResolvableApiException) {
                        try {
                            val intentSenderRequest = IntentSenderRequest.Builder(exception.resolution.intentSender).build()
                            settingResultRequest.launch(intentSenderRequest)
                        } catch (sendEx: IntentSender.SendIntentException) {
                            Log.e("Rapidingo", "Error al abrir configuración de GPS", sendEx)
                        }
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}

@Composable
fun LocationHandler(viewModel: MainViewModel) {
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                val fineLocationGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
                
                if (fineLocationGranted) {
                    val serviceIntent = Intent(context, LocationService::class.java)
                    ContextCompat.startForegroundService(context, serviceIntent)
                    startLocationUpdates(fusedLocationClient, viewModel)
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
}

@SuppressLint("MissingPermission")
private fun startLocationUpdates(client: FusedLocationProviderClient, viewModel: MainViewModel) {
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
        .setMinUpdateIntervalMillis(5000)
        .setWaitForAccurateLocation(false)
        .build()
    
    client.requestLocationUpdates(request, object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { 
                Log.d("Rapidingo", "Update Location: ${it.latitude}, ${it.longitude}")
                viewModel.updateLocation(it.latitude, it.longitude) 
            }
        }
    }, Looper.getMainLooper())
}

@Composable
fun CategoryButton(text: String, imageRes: Int, tintColor: Color, isSelected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        modifier = modifier
            .height(132.dp)
            .clip(RoundedCornerShape(22.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
        color = if (isSelected) ApkBrandPanelSoft else ApkBrandPanel,
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) ApkBrandOrange else ApkBrandBorder
        ),
        shadowElevation = if (isSelected) 12.dp else 5.dp
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
                fontWeight = FontWeight.Black,
                color = if (isSelected) ApkBrandOrange else Color.White,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}

@Composable
fun CameraScreen(onPhotoTaken: (Uri) -> Unit, onCancel: () -> Unit) {
    val context = LocalContext.current
    var hasPermission by remember { 
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED) 
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
        if (isGranted) {
            hasPermission = true
        } else {
            Toast.makeText(context, "Se necesita permiso de cámara para tomar fotos", Toast.LENGTH_SHORT).show()
            onCancel()
        }
    }

    LaunchedEffect(Unit) {
        if (!hasPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    if (hasPermission) {
        val lifecycleOwner = LocalLifecycleOwner.current
        val previewView = remember { PreviewView(context) }
        val imageCapture = remember { ImageCapture.Builder().build() }
        val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

        LaunchedEffect(Unit) {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageCapture)
                } catch (exc: Exception) { Log.e("Camera", "Use case binding failed", exc) }
            }, ContextCompat.getMainExecutor(context))
        }

        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            AndroidView({ previewView }, modifier = Modifier.fillMaxSize())
            
            Row(modifier = Modifier.fillMaxWidth().align(Alignment.BottomCenter).padding(32.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onCancel, modifier = Modifier.size(64.dp).background(Color.White.copy(alpha = 0.3f), CircleShape)) {
                    Icon(Icons.Default.Close, contentDescription = null, tint = Color.White)
                }
                IconButton(onClick = {
                    val file = File(context.cacheDir, "${System.currentTimeMillis()}.jpg")
                    val outputOptions = ImageCapture.OutputFileOptions.Builder(file).build()
                    imageCapture.takePicture(outputOptions, ContextCompat.getMainExecutor(context), object : ImageCapture.OnImageSavedCallback {
                        override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                            onPhotoTaken(Uri.fromFile(file))
                        }
                        override fun onError(exc: ImageCaptureException) { Log.e("Camera", "Photo capture failed", exc) }
                    })
                }, modifier = Modifier.size(80.dp).background(Color.White, CircleShape)) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color.Black)
                }
            }
        }
    }
}

@Composable
fun MapLibreTrackingView(
    userLocation: MyLatLng,
    otherLocation: MyLatLng?,
    otherTitle: String,
    showRoute: Boolean = false,
    centerOnOther: Boolean = false,
    deliveryPath: List<MyLatLng> = emptyList(),
    plannedRoute: List<MyLatLng> = emptyList()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var mapLibreMap by remember { mutableStateOf<MapLibreMap?>(null) }
    var isStyleReady by remember { mutableStateOf(false) }
    var isMapInitialized by remember { mutableStateOf(false) }
    var followMode by remember { mutableStateOf(true) }

    val mapView = remember {
        MapLibreMapView(context).apply {
            onCreate(null)
            getMapAsync { map ->
                mapLibreMap = map
                map.uiSettings.isCompassEnabled = true
                map.uiSettings.isRotateGesturesEnabled = false // FORZAR NORTE
                map.uiSettings.isTiltGesturesEnabled = true
                map.setStyle("https://tiles.openfreemap.org/styles/bright") {
                    isStyleReady = true
                }
                // FORZAR NORTE INICIAL
                map.moveCamera(CameraUpdateFactory.bearingTo(0.0))
            }
        }
    }

    LaunchedEffect(otherLocation == null) {
        isMapInitialized = false
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_START -> mapView.onStart()
                androidx.lifecycle.Lifecycle.Event.ON_RESUME -> mapView.onResume()
                androidx.lifecycle.Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> mapView.onStop()
                androidx.lifecycle.Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onDestroy()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { mapView },
            update = {
                val map = mapLibreMap ?: return@AndroidView
                if (!isStyleReady) return@AndroidView

                val validUser = userLocation.latitude != 0.0 || userLocation.longitude != 0.0
                val userPoint = if (validUser) LatLng(userLocation.latitude, userLocation.longitude) else null
                val validOther = otherLocation != null && (otherLocation.latitude != 0.0 || otherLocation.longitude != 0.0)
                val otherPoint = if (validOther) LatLng(otherLocation!!.latitude, otherLocation.longitude) else null

                if (followMode) {
                    if (userPoint != null && otherPoint != null) {
                        if (!isMapInitialized) {
                            val bounds = LatLngBounds.Builder()
                                .include(userPoint)
                                .include(otherPoint)
                                .build()
                            map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 48))
                            isMapInitialized = true
                        } else {
                            moveMapLibreCamera(map, if (centerOnOther) otherPoint else userPoint, false)
                        }
                    } else if (userPoint != null) {
                        moveMapLibreCamera(map, userPoint, isMapInitialized)
                        isMapInitialized = true
                    } else if (otherPoint != null) {
                        moveMapLibreCamera(map, otherPoint, isMapInitialized)
                        isMapInitialized = true
                    }
                }

                map.clear()
                userPoint?.let { map.addMarker(MarkerOptions().position(it).title("Tu ubicacion")) }
                otherPoint?.let { point ->
                    map.addMarker(MarkerOptions().position(point).title(otherTitle))

                    if (showRoute) {
                        if (plannedRoute.isNotEmpty()) {
                            map.addPolyline(
                                PolylineOptions()
                                    .addAll(plannedRoute.map { LatLng(it.latitude, it.longitude) })
                                    .color(android.graphics.Color.rgb(76, 175, 80))
                                    .width(6f)
                            )
                        }

                        val validPath = deliveryPath.filter { it.latitude != 0.0 || it.longitude != 0.0 }
                        if (validPath.isNotEmpty()) {
                            map.addPolyline(
                                PolylineOptions()
                                    .addAll(validPath.map { LatLng(it.latitude, it.longitude) })
                                    .color(android.graphics.Color.YELLOW)
                                    .width(8f)
                            )
                        }

                        if (userPoint != null && plannedRoute.isEmpty()) {
                            map.addPolyline(
                                PolylineOptions()
                                    .add(userPoint, point)
                                    .color(android.graphics.Color.MAGENTA)
                                    .width(4f)
                            )
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        FloatingActionButton(
            onClick = { followMode = !followMode },
            modifier = Modifier.align(Alignment.BottomEnd).padding(bottom = 100.dp, end = 16.dp),
            containerColor = if (followMode) Color(0xFFD32F2F) else Color.White,
            contentColor = if (followMode) Color.White else Color.Black,
            shape = CircleShape
        ) {
            Icon(if (followMode) Icons.Default.GpsFixed else Icons.Default.GpsNotFixed, contentDescription = "Seguimiento")
        }
    }
}

private fun moveMapLibreCamera(map: MapLibreMap, point: LatLng, alreadyInitialized: Boolean) {
    val camera = CameraPosition.Builder()
        .target(point)
        .zoom(if (alreadyInitialized) map.cameraPosition.zoom.coerceAtLeast(17.2) else 17.6)
        .tilt(52.0)
        .bearing(0.0) // NORTE SIEMPRE ARRIBA
        .build()
    map.animateCamera(CameraUpdateFactory.newCameraPosition(camera))
}

@Composable
fun OSMView(
    userLocation: MyLatLng, 
    otherLocation: MyLatLng?, 
    otherTitle: String, 
    showRoute: Boolean = false, 
    centerOnOther: Boolean = false, 
    deliveryPath: List<MyLatLng> = emptyList(),
    plannedRoute: List<MyLatLng> = emptyList()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var isMapInitialized by remember { mutableStateOf(false) }
    var followMode by remember { mutableStateOf(true) }
    
    // Configurar User Agent para osmdroid para evitar mapas en negro
    Configuration.getInstance().userAgentValue = context.packageName

    val mapView = remember { 
        OsmMapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(17.5)
            // Deshabilitar el clipping que a veces causa áreas negras
            setHasTransientState(true)
        }
    }

    // Resetear inicialización cuando cambia la disponibilidad del "otro" punto
    LaunchedEffect(otherLocation == null) {
        isMapInitialized = false
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                mapView.onResume()
            } else if (event == androidx.lifecycle.Lifecycle.Event.ON_PAUSE) {
                mapView.onPause()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { mapView },
            update = { view ->
                val validUser = userLocation.latitude != 0.0 || userLocation.longitude != 0.0
                val userPoint = if (validUser) GeoPoint(userLocation.latitude, userLocation.longitude) else null
                
                val validOther = otherLocation != null && (otherLocation.latitude != 0.0 || otherLocation.longitude != 0.0)
                val otherPoint = if (validOther) GeoPoint(otherLocation.latitude, otherLocation.longitude) else null
                
                if (followMode) {
                    if (validUser && validOther) {
                        if (!isMapInitialized) {
                            val bounds = org.osmdroid.util.BoundingBox.fromGeoPoints(listOf(userPoint, otherPoint))
                            // Usar un zoom que contenga a ambos puntos con un margen cómodo
                            view.zoomToBoundingBox(bounds.increaseByScale(1.8f), false)
                            isMapInitialized = true
                        } else {
                            // Centrar suavemente en el objetivo principal
                            view.controller.animateTo(if (centerOnOther) otherPoint else userPoint)
                        }
                    } else if (validUser) {
                        if (!isMapInitialized) {
                            view.controller.setCenter(userPoint)
                            isMapInitialized = true
                        } else {
                            view.controller.animateTo(userPoint)
                        }
                    } else if (validOther) {
                        if (!isMapInitialized) {
                            view.controller.setCenter(otherPoint)
                            isMapInitialized = true
                        } else {
                            view.controller.animateTo(otherPoint)
                        }
                    }
                }

                view.overlays.clear()
                
                userPoint?.let {
                    val userMarker = Marker(view).apply { 
                        position = it
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        title = "Tú"
                        icon = ContextCompat.getDrawable(context, android.R.drawable.ic_menu_mylocation)
                    }
                    view.overlays.add(userMarker)
                }
                
                otherPoint?.let { point ->
                    val otherMarker = Marker(view).apply { 
                        position = point
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        title = otherTitle
                        // Iconos más descriptivos: Repartidor (Directions/Moto), Cliente (Pin/Home)
                        val iconRes = if (otherTitle.contains("Repartidor", ignoreCase = true)) 
                            android.R.drawable.ic_menu_directions
                        else 
                            android.R.drawable.ic_menu_myplaces
                        icon = ContextCompat.getDrawable(context, iconRes)
                    }
                    view.overlays.add(otherMarker)
                    
                    if (showRoute) {
                        // 1. Ruta Planeada por Calles (Verde)
                        if (plannedRoute.isNotEmpty()) {
                            val routeLine = Polyline(view).apply {
                                setPoints(plannedRoute.map { GeoPoint(it.latitude, it.longitude) })
                                outlinePaint.color = "#4CAF50".toColorInt() // Verde Material
                                outlinePaint.strokeWidth = 10f
                                outlinePaint.isAntiAlias = true
                            }
                            view.overlays.add(routeLine)
                        }

                        // 2. Rastro Real de Recorrido (Puntos Amarillos)
                        val validPath = deliveryPath.filter { it.latitude != 0.0 || it.longitude != 0.0 }
                        if (validPath.isNotEmpty()) {
                            val trackLine = Polyline(view).apply {
                                setPoints(validPath.map { GeoPoint(it.latitude, it.longitude) })
                                outlinePaint.color = android.graphics.Color.YELLOW
                                outlinePaint.strokeWidth = 15f 
                                outlinePaint.strokeCap = android.graphics.Paint.Cap.ROUND
                                outlinePaint.isAntiAlias = true
                            }
                            view.overlays.add(trackLine)
                        }
                        
                        if (userPoint != null && plannedRoute.isEmpty()) {
                            // Línea de Objetivo Directo (solo si no hay ruta por calles aún)
                            val directLine = Polyline(view).apply {
                                setPoints(listOf(userPoint, point))
                                outlinePaint.color = android.graphics.Color.MAGENTA
                                outlinePaint.strokeWidth = 7f
                                outlinePaint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(20f, 25f), 0f)
                            }
                            view.overlays.add(directLine)
                        }
                    }
                }
                view.invalidate()
            },
            modifier = Modifier.fillMaxSize()
        )

        FloatingActionButton(
            onClick = { followMode = !followMode },
            modifier = Modifier.align(Alignment.BottomEnd).padding(bottom = 100.dp, end = 16.dp),
            containerColor = if (followMode) Color(0xFFD32F2F) else Color.White,
            contentColor = if (followMode) Color.White else Color.Black,
            shape = CircleShape
        ) {
            Icon(if (followMode) Icons.Default.GpsFixed else Icons.Default.GpsNotFixed, contentDescription = "Seguimiento")
        }
    }
}

@Composable
fun ChatDialog(viewModel: MainViewModel, currentUserId: String, onDismiss: () -> Unit, onOpenCamera: ((Uri) -> Unit) -> Unit) {
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
        // ... (expanded image dialog)
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.85f),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                            Icon(Icons.Default.Person, null, modifier = Modifier.padding(8.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            val roleName = if (viewModel.currentMode == UserRole.CLIENT) "Repartidor" else "Cliente"
                            Text(roleName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("En línea", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4CAF50))
                        }
                    }
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, null) }
                }

                HorizontalDivider(modifier = Modifier.alpha(0.1f))

                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(order.chatHistory) { msg ->
                        val isMe = msg.senderId == currentUserId
                        ChatBubble(msg, isMe, context) { expandedImageUrl.value = it }
                    }
                }

                HorizontalDivider(modifier = Modifier.alpha(0.1f))

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
                        Text("YA SALGO, GRACIAS", fontWeight = FontWeight.Black, fontSize = 16.sp)
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
                    }) { Icon(Icons.Default.PhotoCamera, null, tint = MaterialTheme.colorScheme.primary) }
                    
                    IconButton(onClick = { galleryLauncher.launch("image/*") }) { Icon(Icons.Default.QrCode, null, tint = MaterialTheme.colorScheme.primary) }
                    
                    IconButton(onClick = { fileLauncher.launch("*/*") }) { Icon(Icons.Default.AttachFile, null, tint = MaterialTheme.colorScheme.primary) }

                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Mensaje...", fontSize = 12.sp) },
                        shape = RoundedCornerShape(24.dp),
                        maxLines = 2,
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = Color.Transparent
                        )
                    )
                    
                    IconButton(
                        onClick = { if (text.isNotBlank()) { viewModel.addChatMessage(text, currentUserId); text = "" } },
                        enabled = text.isNotBlank()
                    ) { Icon(Icons.AutoMirrored.Filled.Send, null, tint = if (text.isNotBlank()) MaterialTheme.colorScheme.primary else Color.Gray) }
                }
            }
        }
    }
}

@Composable
private fun ChatBubble(msg: ChatMessage, isMe: Boolean, context: Context, onImageClick: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
        val bubbleShape = if (isMe) RoundedCornerShape(16.dp, 4.dp, 16.dp, 16.dp) else RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp)
        Surface(
            color = if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondaryContainer,
            shape = bubbleShape,
            tonalElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                if (msg.text.isNotBlank()) {
                    Text(
                        msg.text,
                        color = if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer,
                        style = MaterialTheme.typography.bodyMedium
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
                        }.background(if (isMe) Color.White.copy(alpha = 0.2f) else Color.Black.copy(alpha = 0.05f), RoundedCornerShape(8.dp)).padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.AttachFile, null, modifier = Modifier.size(16.dp), tint = if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer)
                        Spacer(Modifier.width(4.dp))
                        Text("Ver archivo", style = MaterialTheme.typography.labelMedium, textDecoration = TextDecoration.Underline, color = if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                }
                Text(
                    java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(java.util.Date(msg.timestamp)),
                    style = MaterialTheme.typography.labelSmall,
                    color = (if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer).copy(alpha = 0.6f),
                    modifier = Modifier.align(Alignment.End).padding(top = 2.dp)
                )
            }
        }
    }
}

@Composable
fun InAppNotificationOverlay(viewModel: MainViewModel, showChat: MutableState<Boolean>) {
    val message = viewModel.inAppNotificationMessage
    
    LaunchedEffect(message) {
        if (message != null) {
            kotlinx.coroutines.delay(1500)
            viewModel.inAppNotificationMessage = null
        }
    }

    AnimatedVisibility(
        visible = message != null && !showChat.value,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut()
    ) {
        Box(modifier = Modifier.fillMaxSize().padding(top = 32.dp, start = 16.dp, end = 16.dp), contentAlignment = Alignment.TopCenter) {
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(20.dp),
                shadowElevation = 8.dp,
                modifier = Modifier.clickable { 
                    showChat.value = true 
                    viewModel.lastReadChatSize = viewModel.activeOrder?.chatHistory?.size ?: 0
                    viewModel.inAppNotificationMessage = null
                }
            ) { 
                Row(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Chat, 
                        contentDescription = null, 
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        text = message ?: "", 
                        color = MaterialTheme.colorScheme.onPrimaryContainer, 
                        fontWeight = FontWeight.Bold, 
                        fontSize = 14.sp,
                        maxLines = 2
                    )
                }
            }
        }
    }
}
