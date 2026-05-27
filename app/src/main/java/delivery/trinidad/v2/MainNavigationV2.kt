package delivery.trinidad

import android.Manifest
import android.content.Context
import android.net.Uri
import android.util.Log
import android.util.Patterns
import android.widget.Toast
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.tasks.Task
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import delivery.trinidad.ui.theme.*

@Composable
fun MainNavigationV2(viewModel: MainViewModel) {
    var showCamera by remember { mutableStateOf(false) }
    var onCameraResult: ((Uri) -> Unit)? by remember { mutableStateOf(null) }
    val activity = (LocalContext.current as? ComponentActivity)

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        if (viewModel.isCheckingSession) {
            val isClient = viewModel.currentMode == UserRole.CLIENT || viewModel.forcedRole == UserRole.CLIENT
            val containerBg = if (isClient) BrandBgLight else BrandBlack
            val textColor = if (isClient) BrandBlack else Color.White

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(containerBg),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(120.dp)) {
                        Surface(
                            shape = RoundedCornerShape(28.dp),
                            color = if (isClient) BrandWhite else Color(0xFF1C1C1C),
                            shadowElevation = 8.dp,
                            border = BorderStroke(1.dp, if (isClient) BrandSurfaceGray else Color(0xFF2E2E2E)),
                            modifier = Modifier.size(100.dp)
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.brand_logo),
                                contentDescription = "Beep Delivery",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        text = "BEEP DELIVERY",
                        fontWeight = FontWeight.Bold,
                        fontFamily = PoppinsFamily,
                        fontSize = 16.sp,
                        color = BrandYellow,
                        letterSpacing = 3.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    CircularProgressIndicator(
                        color = BrandYellow,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 3.dp
                    )
                }
            }
        } else if (viewModel.isRegistrationComplete) {
            Box(modifier = Modifier.fillMaxSize().background(BrandBlack).padding(32.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(100.dp))
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("¡BIENVENIDO A BEEP DELIVERY!", fontSize = 24.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = Color.White, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("TU REGISTRO SE HA COMPLETADO CON EXITO.\n\nPOR SEGURIDAD Y PARA ACTIVAR TODOS LOS SERVICIOS, POR FAVOR CIERRA LA APLICACIÓN Y VUELVE A ENTRAR.",
                        color = Color.White, textAlign = TextAlign.Center, fontFamily = InterFamily, fontSize = 16.sp)
                    Spacer(modifier = Modifier.height(32.dp))
                    Button(
                        onClick = { activity?.finish() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                        shape = RoundedCornerShape(30.dp)
                    ) {
                        Text("ENTENDIDO, SALIR", color = BrandBlack, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
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
                            WelcomeAndRegisterV2(viewModel)
                        } else {
                            if (viewModel.currentMode == UserRole.CLIENT) {
                                ClientModuleV2(viewModel, showChat, onOpenCamera = { callback ->
                                    onCameraResult = callback
                                    showCamera = true
                                })
                            } else {
                                DeliveryModuleV2(viewModel, showChat, onOpenCamera = { callback ->
                                    onCameraResult = callback
                                    showCamera = true
                                })
                            }
                        }
                    }

                    // Notificación In-App Global
                    InAppNotificationOverlay(viewModel, showChat)

                    // Diálogo de Agradecimiento Vistoso V2
                    if (viewModel.showThankYouDialog) {
                        ThankYouDialogV2(viewModel)
                    }

                    if (user != null && user.phone.isBlank()) {
                        CompleteWhatsappDialogV2(viewModel, user.role)
                    }
                }
            }
        }
    }
}

@Composable
fun CompleteWhatsappDialogV2(viewModel: MainViewModel, role: UserRole) {
    val context = LocalContext.current
    var phone by remember { mutableStateOf("") }
    val isClient = role == UserRole.CLIENT
    val containerBg = if (isClient) BrandWhite else Color(0xFF1C1C1C)
    val textStyle = TextStyle(fontWeight = FontWeight.Bold, fontFamily = InterFamily, color = if (isClient) BrandBlack else Color.White)

    AlertDialog(
        onDismissRequest = {},
        confirmButton = {
            Button(
                onClick = { viewModel.updateWhatsappPhone(phone, context) },
                enabled = phone.isNotBlank(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = BrandYellow,
                    contentColor = BrandBlack,
                    disabledContainerColor = if (isClient) BrandSurfaceGray else Color(0xFF2A2A2A),
                    disabledContentColor = if (isClient) BrandGrayMedium else Color(0xFF666666)
                )
            ) {
                Text("GUARDAR", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
            }
        },
        title = {
            Text(
                if (role == UserRole.CLIENT) "WhatsApp del cliente" else "WhatsApp del delivery",
                fontWeight = FontWeight.Bold,
                fontFamily = PoppinsFamily,
                color = if (isClient) BrandBlack else Color.White
            )
        },
        text = {
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Numero de WhatsApp", fontFamily = InterFamily) },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Default.Phone, null, tint = BrandYellow) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
                textStyle = textStyle,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandYellow,
                    unfocusedBorderColor = if (isClient) BrandSurfaceGray else Color.White.copy(alpha = 0.25f),
                    focusedContainerColor = if (isClient) BrandBgLight else Color(0xFF202020),
                    unfocusedContainerColor = if (isClient) BrandBgLight else Color(0xFF202020),
                    focusedTextColor = if (isClient) BrandBlack else Color.White,
                    unfocusedTextColor = if (isClient) BrandBlack else Color.White,
                    cursorColor = BrandYellow
                )
            )
        },
        shape = RoundedCornerShape(24.dp),
        containerColor = containerBg
    )
}

@Composable
fun ThankYouDialogV2(viewModel: MainViewModel) {
    val isClient = viewModel.currentMode == UserRole.CLIENT
    val containerBg = if (isClient) BrandWhite else Color(0xFF1C1C1C)

    AlertDialog(
        onDismissRequest = { viewModel.showThankYouDialog = false },
        confirmButton = {
            Button(
                onClick = { viewModel.showThankYouDialog = false },
                colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                shape = RoundedCornerShape(30.dp)
            ) {
                Text("CERRAR", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
            }
        },
        title = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Celebration, contentDescription = null, tint = BrandYellow, modifier = Modifier.size(64.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("¡MUCHAS GRACIAS!", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, fontSize = 22.sp, color = if (isClient) BrandBlack else Color.White)
            }
        },
        text = {
            Text(
                viewModel.thankYouDialogMessage,
                textAlign = TextAlign.Center,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = InterFamily,
                modifier = Modifier.fillMaxWidth(),
                color = if (isClient) BrandBlack else Color.White
            )
        },
        shape = RoundedCornerShape(24.dp),
        containerColor = containerBg
    )
}

@Composable
fun WelcomeAndRegisterV2(viewModel: MainViewModel) {
    val activity = (LocalContext.current as? ComponentActivity)
    val forcedRole = viewModel.forcedRole

    if (forcedRole != null) {
        RegisterScreenV2(viewModel, forcedRole)
        return
    }

    // V2 styled fallback screen for app without role configuration
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandBlack)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                color = BrandYellow.copy(alpha = 0.18f),
                shape = RoundedCornerShape(28.dp),
                shadowElevation = 14.dp,
                modifier = Modifier.size(104.dp),
                border = BorderStroke(1.dp, BrandSurfaceGray)
            ) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = BrandYellow, modifier = Modifier.padding(24.dp))
            }
            Spacer(modifier = Modifier.height(26.dp))
            Text("APP SIN ROL", fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = Color.White, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "Instala la APK Cliente o la APK Delivery. Esta version no tiene rol configurado.",
                color = BrandGrayMedium,
                textAlign = TextAlign.Center,
                fontSize = 14.sp,
                fontFamily = InterFamily,
                fontWeight = FontWeight.Normal
            )
            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = { activity?.finish() },
                modifier = Modifier.fillMaxWidth().height(60.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                shape = RoundedCornerShape(18.dp)
            ) {
                Text("CERRAR APLICACION", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
            }
        }
    }
}

@Composable
fun RegisterScreenV2(viewModel: MainViewModel, role: UserRole) {
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

    val isClient = role == UserRole.CLIENT
    val themeBg = if (isClient) BrandBgLight else BrandBlack
    val cardBg = if (isClient) BrandWhite else Color(0xFF1C1C1C)
    val cardBorder = if (isClient) BrandSurfaceGray else Color(0xFF2E2E2E)
    val textColor = if (isClient) BrandBlack else Color.White
    val mutedTextColor = if (isClient) BrandGrayMedium else Color.Gray

    val textFieldsColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = textColor,
        unfocusedTextColor = textColor,
        focusedBorderColor = BrandYellow,
        unfocusedBorderColor = if (isClient) BrandSurfaceGray else Color.White.copy(alpha = 0.25f),
        focusedLabelColor = BrandYellow,
        unfocusedLabelColor = if (isClient) BrandGrayMedium else Color.White.copy(alpha = 0.8f),
        cursorColor = BrandYellow,
        focusedContainerColor = if (isClient) BrandWhite else Color(0xFF151515),
        unfocusedContainerColor = if (isClient) BrandWhite else Color(0xFF151515),
        focusedPlaceholderColor = textColor.copy(alpha = 0.6f),
        unfocusedPlaceholderColor = textColor.copy(alpha = 0.5f)
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(themeBg)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = cardBg,
            shadowElevation = 10.dp,
            border = BorderStroke(1.dp, cardBorder)
        ) {
            Column(modifier = Modifier.padding(22.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(62.dp),
                        shape = RoundedCornerShape(22.dp),
                        color = if (isClient) BrandBgLight else Color(0xFF222222),
                        shadowElevation = 4.dp
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.brand_logo),
                            contentDescription = "Beep Delivery",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(if (isClient) "CLIENTE" else "DELIVERY", fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = BrandYellow, letterSpacing = 3.sp)
                        Text("Beep", fontSize = 30.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = textColor)
                        Text(if (isClient) "APP CLIENTE" else "APP DELIVERY", fontSize = 14.sp, fontWeight = FontWeight.Medium, fontFamily = PoppinsFamily, color = BrandYellow)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = if (isClient) BrandBlack else BrandYellow, modifier = Modifier.size(22.dp))
                    Text("- - - - - -", color = textColor.copy(alpha = 0.2f), fontWeight = FontWeight.Bold, fontFamily = InterFamily)
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = BrandYellow, modifier = Modifier.size(22.dp))
                    Text("- - -", color = textColor.copy(alpha = 0.2f), fontWeight = FontWeight.Bold, fontFamily = InterFamily)
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = textColor, modifier = Modifier.size(20.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(22.dp))
        Text(if (isClient) "Registro Cliente" else "Registro Delivery", fontSize = 26.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = textColor)
        Text(if (isClient) "Crea tu acceso para pedir en Trinidad." else "Acceso interno para recibir y entregar pedidos.", color = mutedTextColor, fontWeight = FontWeight.Normal, fontFamily = InterFamily)
        Spacer(modifier = Modifier.height(20.dp))

        OutlinedButton(
            onClick = {
                googleSignInClient.signOut().addOnCompleteListener {
                    gmailLauncher.launch(googleSignInClient.signInIntent)
                }
            },
            modifier = Modifier.fillMaxWidth().height(58.dp),
            enabled = !viewModel.isRegisteringUser,
            border = BorderStroke(1.dp, if (isClient) BrandSurfaceGray else Color.White),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = cardBg, contentColor = textColor)
        ) {
            Text("G", fontSize = 22.sp, fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = BrandYellow, modifier = Modifier.padding(end = 10.dp))
            Text("CONTINUAR CON GMAIL", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = textColor)
        }
        Spacer(modifier = Modifier.height(14.dp))

        OutlinedTextField(
            value = name,
            onValueChange = { name = it.uppercase() },
            label = { Text("Nombre completo", fontFamily = InterFamily) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Person, null, tint = if (isClient) BrandBlack else BrandYellow) },
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, fontFamily = InterFamily, color = textColor),
            colors = textFieldsColors
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it.trim() },
            label = { Text("Correo electronico", fontFamily = InterFamily) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Email, null, tint = if (isClient) BrandBlack else BrandYellow) },
            isError = email.isNotBlank() && !emailValid,
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, fontFamily = InterFamily, color = textColor),
            colors = textFieldsColors,
            supportingText = {
                if (email.isNotBlank() && !emailValid) {
                    Text("Ingresa un correo valido", fontFamily = InterFamily)
                }
            }
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Numero de WhatsApp", fontFamily = InterFamily) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Phone, null, tint = if (isClient) BrandBlack else BrandYellow) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(18.dp),
            textStyle = TextStyle(fontWeight = FontWeight.Bold, fontFamily = InterFamily, color = textColor),
            colors = textFieldsColors
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
                colors = ButtonDefaults.buttonColors(containerColor = BrandYellow, contentColor = BrandBlack),
                shape = RoundedCornerShape(16.dp)
            ) { Text("ACTIVAR UBICACION", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily) }
        } else {
            Surface(
                color = BrandYellow.copy(alpha = 0.12f),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, BrandYellow.copy(alpha = 0.25f))
            ) {
                Text("Ubicacion lista para compartir durante pedidos", color = textColor, fontWeight = FontWeight.Bold, fontFamily = InterFamily, modifier = Modifier.padding(14.dp), textAlign = TextAlign.Center)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))
        Text("La camara se pedira cuando envies fotos o comprobantes", color = mutedTextColor, fontWeight = FontWeight.Normal, fontFamily = InterFamily, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))

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
                containerColor = BrandYellow,
                contentColor = BrandBlack,
                disabledContainerColor = if (isClient) BrandSurfaceGray else Color(0xFF2A2A2A),
                disabledContentColor = if (isClient) BrandGrayMedium else Color(0xFF686868)
            ),
            shape = RoundedCornerShape(18.dp),
            enabled = name.isNotBlank() && emailValid && !viewModel.isRegisteringUser
        ) {
            Text(if (viewModel.isRegisteringUser) "REGISTRANDO..." else "LISTO, ENTRAR", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily)
        }
        TextButton(
            onClick = { activity?.finish() },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = if (isClient) BrandBlack else BrandYellow)
            Spacer(Modifier.width(8.dp))
            Text("SALIR DE LA APLICACION", fontWeight = FontWeight.Bold, fontFamily = PoppinsFamily, color = if (isClient) BrandBlack else BrandYellow)
        }
    }
}
