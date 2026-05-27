# Informe visual V2 Rapidingo

Fecha: 2026-05-27  
Estado: propuesta visual, sin implementacion

## 1. Objetivo

Definir una version visual 2 de Rapidingo basada en la identidad de marca recibida (`rplogo.png`), manteniendo PWA y APK como experiencias gemelas.

Este informe no cambia codigo. Su funcion es fijar el criterio visual, listar todas las pantallas y dejar una guia clara para aprobar antes de implementar.

## 2. Lectura de la identidad recibida

La imagen propone una marca de delivery rapida, limpia y confiable. El lenguaje visual gira alrededor de:

- Abeja como simbolo principal.
- Velocidad como promesa directa.
- Amarillo y negro como colores dominantes.
- Fondos claros, limpios y con mucho aire.
- Iconografia lineal con pequenos acentos amarillos.
- Sistema visual con lineas de velocidad y panal.
- Tipografia principal fuerte y redondeada.
- Mensaje de marca: "Tu pedido vuela."

La identidad se siente mas premium y comercial que la interfaz actual. La app actual tiene una estetica oscura, intensa, con mucho naranja, sombras fuertes, radios grandes y un estilo mas agresivo. La V2 deberia sentirse mas clara, ordenada y de marca, sin perder energia.

## 3. Recomendacion visual

Recomiendo una V2 tipo "Rapidingo Beep": limpia, rapida, compacta y operativa.

No recomiendo copiar literalmente el nombre "beep delivery"; debe mantenerse Rapidingo. Lo que si conviene adoptar es el sistema visual:

- App icon amarillo con abeja negra.
- Fondos claros en cliente, restaurante, admin y operadora.
- Modo oscuro controlado para delivery por uso en calle/noche.
- Botones amarillos con texto negro.
- Estados operativos con color semantico, no todo naranja.
- Tarjetas mas sobrias, con menor radio y mejor jerarquia.
- Menos decoracion pesada; mas foco en pedido, mapa, precio y accion.

## 4. Paleta V2

| Uso | Color | Hex |
|---|---:|---|
| Negro principal | Texto fuerte, iconos, delivery dark | `#111111` |
| Amarillo marca | CTA, estados activos, acentos | `#FFC107` |
| Fondo claro | Base PWA/APK cliente | `#FAFAFA` |
| Superficie gris | Cards suaves, inputs, separadores | `#E5E5E5` |
| Gris medio | Texto secundario, iconos inactivos | `#9E9E9E` |
| Blanco | Fondos de tarjeta, modales | `#FFFFFF` |
| Verde operativo | Completado/listo | `#22C55E` |
| Azul operativo | En ruta/tracking | `#2563EB` |
| Rojo operativo | Cancelado/alerta | `#EF4444` |

El naranja actual `#FF6A00` deberia bajar de protagonismo. Puede quedar para advertencias o compatibilidad, pero la accion principal deberia pasar a amarillo.

## 5. Tipografia

La identidad sugiere:

- Principal: Poppins.
- Secundaria: Inter.

Recomendacion:

- Titulos: Poppins SemiBold / Bold.
- Botones: Poppins SemiBold.
- Texto operativo: Inter Regular / Medium.
- Numeros/precios/tiempos: Inter SemiBold.

En APK se debe empaquetar la misma familia o usar una alternativa visualmente muy cercana. En PWA se puede cargar la fuente web, pero idealmente tambien empaquetarla para que funcione offline.

## 6. Iconografia

El sistema debe usar iconos lineales, consistentes y sin mezcla de estilos.

Iconos base:

- Ubicacion.
- Entrega.
- Compras.
- Tiempo.
- Seguridad.
- Pedido.
- Chat.
- Camara.
- Mapa.
- Waze/navegacion.
- Usuario.
- Restaurante.
- Delivery.
- Historial.
- Reportes.
- Operadora/admin.

En PWA conviene seguir con `lucide-react`, adaptando pesos y tamanos. En APK conviene mapear los mismos iconos o dibujarlos con Material Icons equivalentes, manteniendo grosor y estilo.

## 7. Sistema visual

Elementos de marca a usar con moderacion:

- Lineas de velocidad en headers, empty states y loading.
- Panal muy suave como textura de fondo, con opacidad baja.
- Abeja como icono principal, no como decoracion repetida.
- Sombras suaves, no glow naranja fuerte.
- Tarjetas de radio 12 a 18 px en mobile.
- Botones primarios amarillos con texto negro.
- Botones secundarios blancos/grises con borde suave.

## 8. Principio gemelo APK/PWA

Para que APK y PWA sean gemelas, la V2 debe partir de un contrato visual compartido:

| Pieza | PWA | APK |
|---|---|---|
| Colores | CSS variables/Tailwind tokens | Kotlin object/theme colors |
| Tipografia | Poppins + Inter | Poppins/Inter empaquetadas o equivalentes |
| Espaciado | escala 4/8/12/16/24 | `dp` equivalentes |
| Radios | 8/12/16/20 | `RoundedCornerShape` equivalente |
| Iconos | lucide-react | Material/lucide equivalente/vector |
| Estados | mismos labels y colores | mismos labels y colores |
| Assets | `public/assets` | `android_asset` |
| Validacion | scripts existentes | build Android + validadores |

Regla: ninguna pantalla se aprueba en PWA si no existe su equivalente APK, y viceversa.

## 9. Inventario total de pantallas V2

### 9.1 Pantallas globales

| Pantalla | Descripcion V2 |
|---|---|
| Splash/carga | Fondo claro, logo abeja, texto "Rapidingo", lineas de velocidad animadas. |
| Validando sesion | Spinner sobrio amarillo/negro, mensaje corto. |
| GPS requerido | Ilustracion/icono ubicacion, explicacion breve, boton amarillo. |
| Banner instalar PWA | Banner compacto, no invasivo, icono app amarillo. |
| Dialogo gracias | Modal blanco, check amarillo/verde, mensaje claro. |
| WhatsApp incompleto | Modal de correccion con campos compactos. |
| Error/conexion | Empty state con icono lineal y CTA reintentar. |

### 9.2 Registro Cliente

| Pantalla | Descripcion V2 |
|---|---|
| Registro inicial cliente | Logo arriba, formulario claro, CTA amarillo "Crear cuenta". |
| Registro con Gmail | Boton blanco con borde, Gmail como opcion secundaria. |
| Datos cliente | Nombre, correo, WhatsApp, terminos. |
| Permiso ubicacion | Pantalla dedicada con icono mapa y beneficio operativo. |
| Cliente listo | Confirmacion breve antes de entrar al home. |

### 9.3 Registro Delivery

| Pantalla | Descripcion V2 |
|---|---|
| Registro delivery | Modo oscuro o mixto, logo amarillo, formulario ordenado. |
| Datos delivery | Nombre, correo, WhatsApp. |
| Ubicacion delivery | Permiso obligatorio, copy operativo. |
| Verificacion | DNI/selfie si se mantiene flujo actual. |
| Delivery listo | Estado online/offline claro. |

### 9.4 Cliente Home

| Pantalla | Descripcion V2 |
|---|---|
| Home cliente | Header limpio: saludo, logo, delivery online, salir. |
| Categorias | Comida, farmacia, otros como chips/tarjetas compactas. |
| Pedido manual | Caja "Que necesitas?" visible y rapida. |
| Lista restaurantes | Tarjetas con imagen real, nombre, categoria, horario, doble click/pedir. |
| Filtros comida | Chips horizontales: todos, hamburguesas, parrilla, comida rapida. |

### 9.5 Cliente restaurantes

| Pantalla | Descripcion V2 |
|---|---|
| Tarjeta restaurante | Imagen corregida, overlay sobrio, nombre legible. |
| Vista menu | Imagen grande, zoom, cerrar, nombre/hora. |
| Reserva menu | Panel blanco inferior, input pedido, cantidad, agregar fila. |
| Multiples filas | Lista compacta de items, editar/eliminar. |
| Resumen carrito | Items por restaurante, cantidades, subtotal si aplica. |

### 9.6 Cliente pedido manual

| Pantalla | Descripcion V2 |
|---|---|
| Formulario pedido | Tipo, descripcion, destino, referencia. |
| Adjuntar foto | Boton camara lineal, preview de imagen. |
| Confirmar ubicacion | Mapa, direccion, boton confirmar. |
| Selector destino | Mapa con pin amarillo, busqueda/direccion. |
| Enviar pedido | CTA amarillo, resumen breve antes de enviar. |

### 9.7 Cliente tracking

| Estado | Pantalla V2 |
|---|---|
| `PENDING_PRICE` | Esperando repartidor/operadora, progreso de 3 pasos. |
| `BIDDING` | Cotizando precio, mensaje de espera. |
| `WAITING_CONFIRM` | Precio del producto, servicio y total; aceptar/rechazar. |
| `CONFIRMED_BY_CLIENT` | Pedido confirmado, esperando inicio de compra. |
| `PICKING_UP` | Delivery comprando/preparando; si restaurante, estado cocina. |
| `IN_DELIVERY` | Mapa destacado, ETA, boton chat. |
| `DELIVERED_BY_REPARTIDOR` | Confirmar recepcion y pago. |
| `COMPLETED` | Gracias + historial. |
| `CANCELLED` | Motivo/estado cancelado y volver al inicio. |

### 9.8 Delivery dashboard

| Pantalla | Descripcion V2 |
|---|---|
| Dashboard delivery | Fondo oscuro sobrio, estado online, pedidos disponibles. |
| Cola pedidos | Cards por distancia, tipo, cliente, zona, tiempo. |
| Pedido asignado | Prioridad maxima, CTA claro. |
| Sin pedidos | Empty state con abeja/lineas de velocidad. |
| Historial | Lista de entregas y ganancias. |
| Reportes | Dia, semana, total pedidos, ganancias, promedio. |

### 9.9 Delivery pedido activo

| Estado | Pantalla V2 |
|---|---|
| `PENDING_PRICE` | Cotizar servicio/producto, inputs numericos grandes. |
| `BIDDING` | Esperando confirmacion del cliente. |
| `CONFIRMED_BY_CLIENT` | Iniciar compra/retiro. |
| `PICKING_UP` | Lista de restaurantes/items, botones recoger/listo. |
| `IN_DELIVERY` | Mapa, Waze, contacto, chat, confirmar llegada. |
| `DELIVERED_BY_REPARTIDOR` | Esperando confirmacion cliente. |
| Cancelar/rechazar | Accion secundaria, no competir con CTA principal. |

### 9.10 Restaurante

| Pantalla | Descripcion V2 |
|---|---|
| Login restaurante | Logo, nombre restaurante, clave. |
| Pedidos recibidos | Lista compacta, tiempo solicitado, aceptar. |
| Preparando | Timer editable, estado amarillo. |
| Listo para retiro | Estado verde, repartidor asignado. |
| Historial/ventas | Tabla simple, total por dia. |
| Pedido detalle | Items, cantidades, notas, acciones. |

### 9.11 Admin/operadora

| Pantalla | Descripcion V2 |
|---|---|
| Dashboard | Metricas arriba, activos, completados, ingresos. |
| Pedidos activos | Tabla/cards paginadas, filtros por estado. |
| Pedido detalle | Cliente, delivery, precio, mapa/direccion, chat. |
| Cotizar desde operadora | Inputs precio producto/servicio y enviar. |
| Asignar repartidor | Lista de online con ubicacion valida. |
| Coordinar restaurante | Estado por restaurante y tiempos. |
| Forzar estado | Acciones peligrosas separadas con confirmacion. |
| Historial | Busqueda por fecha/cliente/delivery. |
| Settings despacho | Delivery directo vs operadora, con descripcion corta. |

### 9.12 Chat y media

| Pantalla | Descripcion V2 |
|---|---|
| Chat cliente | Modal/panel con burbujas claras, input fijo. |
| Chat delivery | Igual estructura, modo oscuro si delivery. |
| Camara | Pantalla full, botones simples. |
| Preview foto | Confirmar, repetir, adjuntar. |
| Mensajes sistema | Separadores pequenos y no invasivos. |

### 9.13 Mapas

| Pantalla | Descripcion V2 |
|---|---|
| Mapa selector | Pin amarillo, panel inferior con direccion. |
| Mapa tracking cliente | Ruta, repartidor, destino, ETA. |
| Mapa tracking delivery | Origen/destino, Waze, estado actual. |
| Fallback mapa | Placeholder claro si el mapa no carga. |

## 10. Componentes base V2

| Componente | Regla visual |
|---|---|
| Boton primario | Amarillo `#FFC107`, texto negro, radio 14-16. |
| Boton secundario | Blanco/gris, borde `#E5E5E5`, texto negro. |
| Boton peligro | Rojo suave, confirmacion obligatoria. |
| Card pedido | Fondo blanco, borde gris, status lateral o badge. |
| Card restaurante | Imagen real, overlay ligero, nombre visible. |
| Input | Fondo blanco/gris claro, borde gris, foco amarillo. |
| Badge estado | Color semantico y texto corto. |
| Tabs | Segmentados, activo amarillo. |
| Modal | Fondo blanco, borde suave, sombra media. |
| Empty state | Icono lineal + texto corto + CTA si aplica. |

## 11. Flujo visual cliente/delivery

### Modo cliente/delivery

1. Cliente crea pedido.
2. Delivery ve cola filtrada.
3. Delivery cotiza.
4. Cliente confirma.
5. Delivery compra/retira.
6. Delivery va en ruta.
7. Cliente confirma recibido.

Visualmente debe sentirse como una linea de progreso compartida. Cliente y delivery ven el mismo estado con palabras adaptadas a su rol.

### Modo cliente/operadora

1. Cliente crea pedido.
2. Operadora ve pedido activo.
3. Operadora cotiza/asigna.
4. Cliente confirma.
5. Delivery ejecuta.
6. Restaurante interviene si corresponde.
7. Cierre y pago.

La operadora necesita mayor densidad y menos decoracion. El cliente no debe sentir complejidad interna.

## 12. Riesgos si se implementa sin sistema compartido

- PWA y APK pueden volver a verse diferentes.
- Las imagenes pueden volver a cruzarse si se agregan restaurantes sin validacion.
- Los estados pueden tener nombres o colores distintos por rol.
- El delivery podria perder legibilidad si todo se vuelve claro.
- Admin/operadora podria quedar demasiado "bonito" y poco operativo.

## 13. Validaciones necesarias para V2

Antes de aprobar la V2 implementada:

- PWA cliente y APK cliente deben coincidir visualmente.
- PWA delivery y APK delivery deben coincidir visualmente.
- Todas las pantallas deben pasar mobile 360/390/430 px.
- No debe haber texto cortado en botones ni cards.
- Los assets de restaurantes deben seguir pasando `assets:restaurants:check`.
- Los paquetes PWA deben seguir pasando `pwas:check`.
- Los APK deben compilar cliente/delivery.
- El flujo real pedido debe probarse con al menos cliente + delivery.

## 14. Plan de implementacion recomendado

Fase 1: preparar sistema visual compartido

- Crear tokens PWA y APK.
- Definir fuentes.
- Definir iconos.
- Definir componentes base.
- No tocar logica de pedidos.

Fase 2: redisenar pantallas de entrada

- Splash/carga.
- Registro cliente.
- Registro delivery.
- GPS requerido.
- Banner PWA.

Fase 3: redisenar cliente

- Home.
- Restaurantes.
- Pedido manual.
- Reserva menu.
- Resumen.
- Tracking.

Fase 4: redisenar delivery

- Dashboard.
- Cola.
- Pedido activo.
- Historial.
- Reportes.

Fase 5: redisenar restaurante/admin

- Restaurante operativo.
- Admin/operadora.
- Settings modo despacho.

Fase 6: QA gemelo

- Comparar PWA/APK por pantalla.
- Capturas de cliente y delivery.
- Prueba funcional completa.
- Prueba de carga rapida post-cambios para confirmar que no se afecto logica.

## 15. Recomendacion final

La V2 es viable y conveniente. La identidad recibida encaja muy bien con Rapidingo, especialmente por la abeja, velocidad y color amarillo.

La decision importante es no tratarlo como "cambio de colores", sino como un sistema visual compartido entre PWA y APK.

Mi recomendacion es aprobar primero una maqueta visual por pantalla. Una vez aprobada, implementar por fases empezando por tokens y componentes base, para no romper la logica que ya quedo optimizada con realtime, consultas filtradas y pruebas de carga.
