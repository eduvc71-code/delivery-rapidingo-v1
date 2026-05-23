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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import kotlinx.coroutines.delay

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
                        label = " "
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

                    InAppNotificationOverlay(viewModel, showChat)

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
    val selectedRole = remember { mutableStateOf<UserRole?>(null) }
    val activity = (LocalContext.current as? ComponentActivity)
    val forcedRole = viewModel.forcedRole
    if (forcedRole != null) {
        RegisterScreen(viewModel, forcedRole)
        return
    }

    if (selectedRole.value == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFFD32F2F), Color(0xFFB71C1C))))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.FlashOn, contentDescription = null, tint = Color.White, modifier = Modifier.size(100.dp))
            Text("¡GRACIAS POR SER PARTE DE RAPIDINGO DELIVERY!", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(16.dp))
            Text("CLIENTES PIDEN EN TRINIDAD. DELIVERY ES PARA EL EQUIPO INTERNO.", color = Color.White.copy(alpha = 0.9f), textAlign = TextAlign.Center, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(64.dp))

            Button(
                onClick = { selectedRole.value = UserRole.CLIENT },
                colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth().height(60.dp),
                shape = RoundedCornerShape(30.dp),
                enabled = viewModel.clientUser == null && viewModel.deliveryUser == null
            ) {
                Text("REGISTRARSE COMO CLIENTE", color = Color(0xFFD32F2F), fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(
                onClick = { selectedRole.value = UserRole.DELIVERY },
                border = BorderStroke(2.dp, Color.White),
                modifier = Modifier.fillMaxWidth().height(60.dp),
                shape = RoundedCornerShape(30.dp),
                enabled = viewModel.clientUser == null && viewModel.deliveryUser == null
            ) {
                Text("REPARTIDOR - EQUIPO INTERNO", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.height(32.dp))
            TextButton(onClick = { activity?.finish() }) {
                Text("SALIR DE LA APLICACIÓN", color = Color.White.copy(alpha = 0.8f), fontWeight = FontWeight.Medium)
            }
        }
    } else {
        RegisterScreen(viewModel, selectedRole.value!!)
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
            .background(Color(0xFFF2F2F2))
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = Color.White,
            shadowElevation = 10.dp,
            border = BorderStroke(1.dp, Color(0xFFEDEDED))
        ) {
            Column(modifier = Modifier.padding(22.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(62.dp),
                        shape = RoundedCornerShape(22.dp),
                        color = Color.White,
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
                        Text("DELIVERY", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color(0xFFE50914), letterSpacing = 3.sp)
                        Text("Rapidingo", fontSize = 30.sp, lineHeight = 32.sp, fontWeight = FontWeight.Black, color = Color(0xFF0D1321))
                        Text("Tu pedido llega rapido.", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0D1321))
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFFE50914), modifier = Modifier.size(22.dp))
                    Text("- - - - - -", color = Color(0xFFB8BDC8), fontWeight = FontWeight.Black)
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFFFFC107), modifier = Modifier.size(22.dp))
                    Text("- - -", color = Color(0xFFB8BDC8), fontWeight = FontWeight.Black)
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF0D1321), modifier = Modifier.size(20.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(22.dp))
        Text(if (role == UserRole.CLIENT) "Registro Cliente" else "Registro Delivery", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color(0xFF0D1321))
        Text(if (role == UserRole.CLIENT) "Crea tu acceso para pedir en Trinidad." else "Acceso interno para recibir y entregar pedidos.", color = Color(0xFF4C5362), fontWeight = FontWeight.SemiBold)
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
            colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White, contentColor = Color(0xFF0D1321))
        ) {
            Text("G", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color(0xFFE50914), modifier = Modifier.padding(end = 10.dp))
            Text("CONTINUAR CON GMAIL", fontWeight = FontWeight.ExtraBold)
        }
        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it.uppercase() },
            label = { Text("Nombre completo") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Person, null, tint = Color(0xFFE50914)) },
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, color = Color(0xFF0D1321)),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFE50914),
                unfocusedBorderColor = Color.White,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedLabelColor = Color(0xFFE50914),
                unfocusedLabelColor = Color(0xFF4C5362)
            )
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it.trim() },
            label = { Text("Correo electronico") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Email, null, tint = Color(0xFFE50914)) },
            isError = email.isNotBlank() && !emailValid,
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, color = Color(0xFF0D1321)),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFE50914),
                unfocusedBorderColor = Color.White,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedLabelColor = Color(0xFFE50914),
                unfocusedLabelColor = Color(0xFF4C5362)
            ),
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
            leadingIcon = { Icon(Icons.Default.Phone, null, tint = Color(0xFFE50914)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, color = Color(0xFF0D1321)),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFE50914),
                unfocusedBorderColor = Color.White,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedLabelColor = Color(0xFFE50914),
                unfocusedLabelColor = Color(0xFF4C5362)
            )
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
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D1321)),
                shape = RoundedCornerShape(16.dp)
            ) { Text("ACTIVAR UBICACION", fontWeight = FontWeight.Black) }
        } else {
            Surface(color = Color(0xFFFFF4CC), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Text("Ubicacion lista para compartir durante pedidos", color = Color(0xFF0D1321), fontWeight = FontWeight.Black, modifier = Modifier.padding(14.dp), textAlign = TextAlign.Center)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))
        Text("La camara se pedira cuando envies fotos o comprobantes", color = Color(0xFF4C5362), fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))

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
                containerColor = Color(0xFFE50914),
                disabledContainerColor = Color(0xFFFFD9DC),
                disabledContentColor = Color(0xFF8A0A10)
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
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = Color(0xFFE50914))
            Spacer(Modifier.width(8.dp))
            Text("SALIR DE LA APLICACION", fontWeight = FontWeight.Black, color = Color(0xFFE50914))
        }
    }
}

// ==================== MÓDULO DE CLIENTE CON FLUJO INTERACTIVO ====================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientModule(viewModel: MainViewModel, showChat: MutableState<Boolean>, onOpenCamera: ((Uri) -> Unit) -> Unit) {
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var showSummaryDialog by remember { mutableStateOf(false) }
    var showOrderDialog by remember { mutableStateOf(false) }
    var currentRestaurantForDialog by remember { mutableStateOf<Restaurant?>(null) }
    val clientName = viewModel.clientUser?.name ?: " "
    val context = LocalContext.current
    val activity = (LocalContext.current as? ComponentActivity)

    fun closeClientSession() {
        viewModel.closeSession(
            onSuccess = {
                context.stopService(Intent(context, LocationService::class.java))
                activity?.window?.decorView?.postDelayed({ activity.finishAndRemoveTask() }, 350)
            },
            onError = { message -> Toast.makeText(context, message, Toast.LENGTH_LONG).show() }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color(0xFF161616),
                    actionIconContentColor = Color(0xFFD32F2F)
                ),
                title = {
                    Column {
                        Text("¡Hola, $clientName!", fontSize = 22.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("¿Qué te llevamos hoy?", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD32F2F))
                    }
                },
                actions = {
                    if (viewModel.tempOrderItems.isNotEmpty()) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = Color(0xFFD32F2F)) {
                                    Text("${viewModel.tempOrderItems.sumOf { it.quantity }}")
                                }
                            }
                        ) {
                            IconButton(onClick = { showSummaryDialog = true }) {
                                Icon(Icons.Default.ReceiptLong, null, tint = Color(0xFFD32F2F))
                            }
                        }
                    }
                    IconButton(onClick = { closeClientSession() }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, null, tint = Color(0xFFD32F2F))
                    }
                }
            )
        },
        floatingActionButton = {
            if (viewModel.tempOrderItems.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { showSummaryDialog = true },
                    containerColor = Color(0xFFD32F2F),
                    contentColor = Color.White,
                    icon = { Icon(Icons.Default.ReceiptLong, null) },
                    text = { Text("VER RESUMEN (${viewModel.tempOrderItems.size})") }
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color(0xFFFFFBF8))
        ) {
            if (viewModel.activeOrder == null) {
                RestaurantCarouselScreen(
                    restaurants = viewModel.restaurants,
                    selectedCategory = selectedCategory,
                    onCategoryFilter = { selectedCategory = it },
                    onRestaurantDoubleTap = { restaurant ->
                        currentRestaurantForDialog = restaurant
                        showOrderDialog = true
                    }
                )
            } else {
                OSMOrderTracking(viewModel, onOpenChat = { showChat.value = true })
            }
        }
    }

    // Diálogo para agregar pedido por restaurante
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

    // Diálogo de Resumen Final
    if (showSummaryDialog) {
        OrderSummaryDialog(
            items = viewModel.tempOrderItems,
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
            onConfirmOrder = { viewModel.confirmTempOrderAndCreate() },
            onDismiss = { showSummaryDialog = false }
        )
    }

    if (showChat.value) {
        viewModel.lastReadChatSize = viewModel.activeOrder?.chatHistory?.size ?: 0
        ChatDialog(viewModel, viewModel.clientUser?.id ?: " ", onDismiss = { showChat.value = false }, onOpenCamera = onOpenCamera)
    }
}

// ==================== PANTALLA DE CARRUSEL DE RESTAURANTES ====================
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
        // Filtros de categoría
        LazyRow(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp, horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories) { category ->
                FilterChip(
                    selected = (category == selectedCategory || (category == "TODOS" && selectedCategory == null)),
                    onClick = { onCategoryFilter(if (category == "TODOS") null else category) },
                    label = { Text(category) }
                )
            }
        }

        // Indicador de doble clic
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.DoubleArrow, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Doble clic en la tarjeta para pedir", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF565656))
        }

        // Carrusel horizontal de restaurantes
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

// ==================== TARJETA DE RESTAURANTE CON DOBLE CLIC ====================
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
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(restaurant.logoColor.copy(alpha = 0.8f), restaurant.logoColor)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            // Imagen del restaurante desde Supabase
            if (restaurant.logoUrl != null) {
                AsyncImage(
                    model = restaurant.logoUrl,
                    contentDescription = restaurant.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                // Capa oscura para legibilidad del texto
                Box(
                    modifier = Modifier.fillMaxSize()
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
                        Icon(Icons.Default.DoubleArrow, null, tint = restaurant.logoColor, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("DOBLE CLIC PARA PEDIR", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = restaurant.logoColor)
                    }
                }
            }

            // Badge de categoría
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
                    color = restaurant.logoColor
                )
            }
        }
    }
}

// ==================== DIÁLOGO DE PEDIDO POR RESTAURANTE ====================
@Composable
fun RestaurantOrderDialog(
    restaurant: Restaurant,
    existingItems: List<TempOrderItem>,
    onAddItem: (String, Int) -> Unit,
    onRemoveItem: (String) -> Unit,
    onUpdateQuantity: (String, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var productName by remember { mutableStateOf("") }
    var quantity by remember { mutableIntStateOf(1) }
    val scrollState = rememberScrollState()

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                onClick = {
                    if (productName.isNotBlank() && quantity > 0) {
                        onAddItem(productName, quantity)
                        productName = ""
                        quantity = 1
                    }
                },
                enabled = productName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(Modifier.width(8.dp))
                Text("AGREGAR")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("CERRAR")
            }
        },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(32.dp),
                    shape = CircleShape,
                    color = restaurant.logoColor.copy(alpha = 0.2f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Restaurant, null, tint = restaurant.logoColor, modifier = Modifier.size(20.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(restaurant.name, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text("Toca en la foto para pedir • ${existingItems.size} items", fontSize = 12.sp, color = Color.Gray)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp)
                    .verticalScroll(scrollState)
            ) {
                // Campo para nuevo producto
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FA))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = productName,
                            onValueChange = { productName = it.uppercase() },
                            placeholder = { Text("NOMBRE DEL PLATO...") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            textStyle = TextStyle(fontWeight = FontWeight.Bold, fontSize = 14.sp),
                            maxLines = 1,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFD32F2F),
                                unfocusedBorderColor = Color.LightGray
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        Row(
                            modifier = Modifier
                                .background(Color.White, RoundedCornerShape(12.dp))
                                .border(1.dp, Color.LightGray, RoundedCornerShape(12.dp))
                        ) {
                            IconButton(
                                onClick = { if (quantity > 1) quantity-- },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(Icons.Default.Remove, null, modifier = Modifier.size(18.dp))
                            }
                            Text(
                                "$quantity",
                                modifier = Modifier.padding(horizontal = 12.dp),
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                            IconButton(
                                onClick = { quantity++ },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Text("TUS PRODUCTOS:", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.Gray)
                Spacer(Modifier.height(8.dp))

                if (existingItems.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.ShoppingBasket, null, tint = Color.Gray, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("Aún no has agregado productos", color = Color.Gray, fontWeight = FontWeight.Medium)
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(existingItems) { item ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = BorderStroke(1.dp, Color(0xFFE0E0E0))
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("${restaurant.name}", fontSize = 11.sp, color = Color.Gray)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("x${item.quantity}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFFD32F2F))
                                        IconButton(
                                            onClick = { onRemoveItem(item.id) },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(Icons.Default.Close, null, tint = Color.Red, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(0.95f).fillMaxHeight(0.7f)
    )
}

// ==================== DIÁLOGO DE RESUMEN FINAL ====================
@Composable
fun OrderSummaryDialog(
    items: List<TempOrderItem>,
    onEditItem: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    onClearAll: () -> Unit,
    onConfirmOrder: () -> Unit,
    onDismiss: () -> Unit
) {
    val grouped = items.groupBy { it.restaurantName }
    val totalItems = items.sumOf { it.quantity }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("SEGUIR PEDIDO")
                }
                Button(
                    onClick = onConfirmOrder,
                    modifier = Modifier.weight(1.5f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                ) {
                    Icon(Icons.Default.Check, null)
                    Spacer(Modifier.width(8.dp))
                    Text("CONFIRMAR")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onClearAll) {
                Text("VACIAR TODO", color = Color.Red)
            }
        },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.ReceiptLong, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(28.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("RESUMEN DE PEDIDO", fontWeight = FontWeight.ExtraBold)
                    Text("$totalItems productos en ${grouped.size} restaurante(s)", fontSize = 12.sp, color = Color.Gray)
                }
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 350.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                grouped.forEach { (restaurantName, restItems) ->
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFFF8F9FA)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Restaurant, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(restaurantName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Spacer(Modifier.weight(1f))
                                    Text("${restItems.size} items", fontSize = 12.sp, color = Color.Gray)
                                }
                                Divider(modifier = Modifier.padding(vertical = 8.dp))
                                restItems.forEach { item ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text("• ${item.productName}", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                            Spacer(Modifier.width(8.dp))
                                            Surface(
                                                modifier = Modifier.size(24.dp),
                                                shape = CircleShape,
                                                color = Color(0xFFD32F2F).copy(alpha = 0.1f)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Text("x${item.quantity}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD32F2F))
                                                }
                                            }
                                        }
                                        Row {
                                            IconButton(
                                                onClick = { onEditItem(item.id) },
                                                modifier = Modifier.size(32.dp)
                                            ) {
                                                Icon(Icons.Default.Edit, null, tint = Color.Blue, modifier = Modifier.size(16.dp))
                                            }
                                            IconButton(
                                                onClick = { onRemoveItem(item.id) },
                                                modifier = Modifier.size(32.dp)
                                            ) {
                                                Icon(Icons.Default.Delete, null, tint = Color.Red, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier.fillMaxWidth(0.95f).fillMaxHeight(0.8f)
    )
}

// ==================== RESTO DEL CÓDIGO ORIGINAL (SIN CAMBIOS ESENCIALES) ====================
// [El resto de funciones como DestinationPickerDialog, MapLibrePickerView, DeliveryModule,
// OSMOrderTracking, OSMDeliveryTracking, WazeButton, GPSCheck, LocationHandler,
// CategoryButton, CameraScreen, MapLibreTrackingView, OSMView, ChatDialog, ChatBubble,
// InAppNotificationOverlay se mantienen igual que en tu archivo original]
// Para ahorrar espacio, no las incluyo aquí, pero debes mantenerlas en tu MainActivity.kt

// Nota: Asegúrate de mantener todas las funciones originales de MainActivity.kt
// después de las nuevas funciones que agregué arriba.