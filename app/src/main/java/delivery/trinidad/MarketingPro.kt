package delivery.trinidad

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import delivery.trinidad.ui.theme.DeliveryRapidingoTheme

// 1. BIENVENIDA - MARCA BLANCA
@Preview(showSystemUi = true, name = "1_Bienvenida")
@Composable
fun PreviewMarketing1() {
    DeliveryRapidingoTheme {
        Column(
            modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFFD32F2F), Color(0xFFB71C1C)))),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.FlashOn, null, tint = Color.White, modifier = Modifier.size(120.dp))
            Spacer(Modifier.height(16.dp))
            Text("TU MARCA DELIVERY", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
            Text("LA PLATAFORMA QUE TU EMPRESA NECESITA", color = Color.White.copy(alpha = 0.8f), fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Spacer(Modifier.height(100.dp))
            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(30.dp))
        }
    }
}

// 2. CLIENTE - HACIENDO PEDIDO (CON ICONOS 3D REALES)
@Preview(showSystemUi = true, name = "2_Pedido_Cliente")
@Composable
fun PreviewMarketing2() {
    DeliveryRapidingoTheme {
        Column(modifier = Modifier.fillMaxSize().background(Color.White).padding(24.dp)) {
            Text("¡Hola, Juan!", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
            Text("¿Qué te llevamos hoy?", color = Color.Gray, fontSize = 16.sp)
            Spacer(Modifier.height(32.dp))
            
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // COMIDA 3D REAL
                CategoryBox3DReal("COMIDA", R.drawable.category_restaurant, Color(0xFFFFF3E0), Modifier.weight(1f))
                // FARMACIA 3D REAL
                CategoryBox3DReal("FARMACIA", R.drawable.category_pharmacy, Color(0xFFE3F2FD), Modifier.weight(1f))
                // OTROS 3D REAL
                CategoryBox3DReal("OTROS", R.drawable.category_other, Color(0xFFF3E5F5), Modifier.weight(1f))
            }
            
            Spacer(Modifier.height(32.dp))
            OutlinedTextField(
                value = "2 HAMBURGUESAS COMPLETAS CON PAPAS FRITAS",
                onValueChange = {},
                modifier = Modifier.fillMaxWidth().height(150.dp),
                shape = RoundedCornerShape(16.dp),
                label = { Text("¿Cuál es tu pedido?") }
            )
            Button(
                onClick = {}, 
                modifier = Modifier.fillMaxWidth().padding(top = 24.dp).height(60.dp), 
                shape = RoundedCornerShape(30.dp), 
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F)),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp)
            ) {
                Text("PEDIR AHORA", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun CategoryBox3DReal(label: String, imageRes: Int, bgColor: Color, modifier: Modifier) {
    Surface(
        modifier = modifier.height(120.dp),
        shape = RoundedCornerShape(20.dp),
        color = bgColor,
        shadowElevation = 8.dp
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxSize().padding(8.dp)
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = label,
                modifier = Modifier.size(65.dp).weight(1f),
                contentScale = ContentScale.Fit
            )
            Text(label, fontWeight = FontWeight.Black, fontSize = 10.sp, color = Color.Black)
        }
    }
}


// 3. REPARTIDOR - Dashboard
@Preview(showSystemUi = true, name = "3_Panel_Repartidor")
@Composable
fun PreviewMarketing3() {
    DeliveryRapidingoTheme {
        Column(modifier = Modifier.fillMaxSize().background(Color(0xFFF5F5F5)).padding(16.dp)) {
            Text("PEDIDOS ACTIVOS", fontWeight = FontWeight.Black, fontSize = 20.sp)
            Spacer(Modifier.height(16.dp))
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(4.dp)) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Badge(containerColor = Color(0xFFFFEBEE), contentColor = Color(0xFFD32F2F)) { Text("NUEVO PEDIDO") }
                        Text("Hace 1 min", fontSize = 12.sp, color = Color.Gray)
                    }
                    Spacer(Modifier.height(12.dp))
                    Text("Hamburguesas y Papas", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text("Cliente: Juan Pérez", color = Color.Gray)
                    Spacer(Modifier.height(20.dp))
                    Button(onClick = {}, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1976D2)), shape = RoundedCornerShape(12.dp)) {
                        Text("TOMAR Y COTIZAR", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// 4. SEGUIMIENTO GPS (SIMULADO PARA MARKETING)
@Preview(showSystemUi = true, name = "4_Tracking_GPS")
@Composable
fun PreviewMarketing4() {
    DeliveryRapidingoTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFFE0E0E0))) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val gridStep = 100f
                // Dibujar "Calles"
                for (i in 0..20) {
                    drawLine(Color.White, start = Offset(i * gridStep, 0f), end = Offset(i * gridStep, size.height), strokeWidth = 20f)
                    drawLine(Color.White, start = Offset(0f, i * gridStep), end = Offset(size.width, i * gridStep), strokeWidth = 20f)
                }
                // Dibujar "Ruta de entrega" (Línea Azul)
                val path = Path().apply {
                    moveTo(200f, 1500f)
                    lineTo(200f, 800f)
                    lineTo(800f, 800f)
                    lineTo(800f, 400f)
                }
                drawPath(path, Color(0xFF1976D2), style = Stroke(width = 15f, cap = StrokeCap.Round))
            }

            // Marcador del Repartidor (Icono de Moto)
            Surface(
                modifier = Modifier.offset(x = 180.dp, y = 350.dp).size(40.dp),
                shape = CircleShape,
                color = Color.White,
                shadowElevation = 4.dp
            ) {
                Icon(Icons.Default.DirectionsBike, null, tint = Color(0xFFD32F2F), modifier = Modifier.padding(8.dp))
            }

            // Marcador de Destino (Cliente)
            Icon(
                Icons.Default.LocationOn, 
                null, 
                tint = Color(0xFF4CAF50), 
                modifier = Modifier.offset(x = 55.dp, y = 650.dp).size(45.dp)
            )
            
            Card(
                modifier = Modifier.fillMaxWidth().align(Alignment.BottomCenter).padding(20.dp),
                shape = RoundedCornerShape(28.dp),
                elevation = CardDefaults.cardElevation(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Speed, null, tint = Color(0xFFD32F2F), modifier = Modifier.size(32.dp))
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("EL REPARTIDOR ESTÁ EN CAMINO", fontWeight = FontWeight.Black, color = Color(0xFFD32F2F), fontSize = 14.sp)
                            Text("Llegada estimada: 8 min", fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    LinearProgressIndicator(
                        progress = { 0.7f },
                        modifier = Modifier.fillMaxWidth().height(8.dp), 
                        color = Color(0xFFD32F2F), 
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                    Spacer(Modifier.height(16.dp))
                    Text("TOTAL A PAGAR: Bs. 60.00", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

// 5. REGISTRO DE USUARIO
@Preview(showSystemUi = true, name = "5_Registro")
@Composable
fun PreviewMarketing5() {
    DeliveryRapidingoTheme {
        Column(modifier = Modifier.fillMaxSize().background(Color.White).padding(32.dp), verticalArrangement = Arrangement.Center) {
            Text("Crea tu cuenta", fontSize = 28.sp, fontWeight = FontWeight.Bold)
            Text("Únete a la red de delivery más rápida", color = Color.Gray)
            Spacer(modifier = Modifier.height(32.dp))
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth().height(56.dp), border = BorderStroke(2.dp, Color(0xFFFFB74D))) {
                Text("G", fontSize = 22.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(end = 10.dp))
                Text("CONTINUAR CON GMAIL", fontWeight = FontWeight.ExtraBold)
            }
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(value = "JUAN PÉREZ", onValueChange = {}, label = { Text("Nombre completo") }, modifier = Modifier.fillMaxWidth(), leadingIcon = { Icon(Icons.Default.Person, null) })
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(value = "+591 70000000", onValueChange = {}, label = { Text("WhatsApp") }, modifier = Modifier.fillMaxWidth(), leadingIcon = { Icon(Icons.Default.Phone, null) })
            Spacer(modifier = Modifier.height(32.dp))
            Button(onClick = {}, modifier = Modifier.fillMaxWidth().height(56.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))) {
                Text("LISTO, ENTRAR", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// 6. FINALIZACIÓN - VISTA CLIENTE
@Preview(showSystemUi = true, name = "6_Final_Cliente")
@Composable
fun PreviewMarketing6() {
    DeliveryRapidingoTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFFF5F5F5)), contentAlignment = Alignment.Center) {
            Card(modifier = Modifier.padding(24.dp), shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(8.dp)) {
                Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(80.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("¡PEDIDO ENTREGADO!", fontSize = 22.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(8.dp))
                    Text("ENTREGA EXITOSA\nGRACIAS POR TU CONFIANZA", color = Color.Gray, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = {}, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(30.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))) {
                        Text("CERRAR", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// 7. FINALIZACIÓN - VISTA REPARTIDOR
@Preview(showSystemUi = true, name = "7_Final_Repartidor")
@Composable
fun PreviewMarketing7() {
    DeliveryRapidingoTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF1976D2)), contentAlignment = Alignment.Center) {
            Card(modifier = Modifier.padding(24.dp), shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Stars, null, tint = Color(0xFFFFD600), modifier = Modifier.size(80.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("¡EXCELENTE TRABAJO!", fontSize = 22.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(8.dp))
                    Text("PEDIDO COMPLETADO\nGRACIAS POR EL SERVICIO", color = Color.Gray, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(24.dp))
                    Text("Ganancia neta: Bs. 15.00", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF2E7D32))
                }
            }
        }
    }
}

// 9. ESCENA HERO - TRES TELÉFONOS EN PERSPECTIVA (PARA EL INICIO DEL VIDEO)
@Preview(showBackground = true, name = "9_Escena_Hero")
@Composable
fun PreviewMarketing9() {
    DeliveryRapidingoTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF111111)).padding(16.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("TU PROPIA APP DE DELIVERY", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("Potencia tu negocio con tecnología real", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp)
                
                Spacer(Modifier.height(40.dp))
                
                Box(modifier = Modifier.fillMaxWidth().height(400.dp)) {
                    // Teléfono Izquierda (Seguimiento)
                    Surface(
                        modifier = Modifier.align(Alignment.CenterStart).offset(x = 20.dp, y = 40.dp).width(140.dp).height(280.dp).graphicsLayer(rotationZ = -15f),
                        shape = RoundedCornerShape(20.dp),
                        color = Color.White,
                        shadowElevation = 20.dp
                    ) { PreviewMarketing4() }

                    // Teléfono Derecha (Registro)
                    Surface(
                        modifier = Modifier.align(Alignment.CenterEnd).offset(x = (-20).dp, y = 40.dp).width(140.dp).height(280.dp).graphicsLayer(rotationZ = 15f),
                        shape = RoundedCornerShape(20.dp),
                        color = Color.White,
                        shadowElevation = 20.dp
                    ) { PreviewMarketing5() }

                    // Teléfono Centro (Bienvenida)
                    Surface(
                        modifier = Modifier.align(Alignment.Center).width(160.dp).height(320.dp),
                        shape = RoundedCornerShape(24.dp),
                        color = Color.White,
                        shadowElevation = 40.dp,
                        border = BorderStroke(4.dp, Color(0xFF222222))
                    ) { PreviewMarketing1() }
                }
            }
        }
    }
}

// 8. CHAT EN VIVO - SIMULACIÓN DE DIÁLOGO
@Preview(showSystemUi = true, name = "8_Chat_En_Vivo")
@Composable
fun PreviewMarketing8() {
    val simulatedMessages = listOf(
        ChatMessage("1", "user", "Hola, ¿ya tienes mis hamburguesas?", timestamp = System.currentTimeMillis() - 120000),
        ChatMessage("2", "me", "Sí, acaban de entregármelas. Estaban bien calientes.", timestamp = System.currentTimeMillis() - 60000),
        ChatMessage("3", "me", "Ya voy saliendo para tu ubicación.", timestamp = System.currentTimeMillis() - 45000),
        ChatMessage("4", "user", "Perfecto, te espero. ¡Gracias!", timestamp = System.currentTimeMillis() - 10000)
    )

    DeliveryRapidingoTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.surface) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header del Chat
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
                            Text("Repartidor Mario", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("En línea", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4CAF50))
                        }
                    }
                    IconButton(onClick = {}) { Icon(Icons.Default.Close, null) }
                }

                HorizontalDivider(modifier = Modifier.alpha(0.1f))

                // Lista de Mensajes
                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(simulatedMessages) { msg ->
                        // Simulamos que el "me" es el repartidor y el "user" es el cliente
                        val isMe = msg.senderId == "me" 
                        ChatBubbleSimulated(msg, isMe)
                    }
                }

                HorizontalDivider(modifier = Modifier.alpha(0.1f))

                // Barra de Entrada
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth().padding(8.dp)
                ) {
                    IconButton(onClick = {}) { Icon(Icons.Default.PhotoCamera, null, tint = MaterialTheme.colorScheme.primary) }
                    IconButton(onClick = {}) { Icon(Icons.Default.Image, null, tint = MaterialTheme.colorScheme.primary) }
                    OutlinedTextField(
                        value = "",
                        onValueChange = {},
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Escribe un mensaje...") },
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = Color.Transparent
                        )
                    )
                    IconButton(onClick = {}) { Icon(Icons.AutoMirrored.Filled.Send, null, tint = MaterialTheme.colorScheme.primary) }
                }
            }
        }
    }
}

@Composable
fun ChatBubbleSimulated(msg: ChatMessage, isMe: Boolean) {
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
        val bubbleShape = if (isMe) RoundedCornerShape(16.dp, 4.dp, 16.dp, 16.dp) else RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp)
        Surface(
            color = if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondaryContainer,
            shape = bubbleShape,
            tonalElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(
                    msg.text,
                    color = if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSecondaryContainer,
                    style = MaterialTheme.typography.bodyMedium
                )
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
