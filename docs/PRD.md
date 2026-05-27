# PRD - Beep Delivery

## 1. Resumen

Beep Delivery es una plataforma de delivery local para Trinidad, Bolivia, orientada a coordinar pedidos de comida, farmacia, supermercado y encargos generales entre clientes, repartidores, restaurantes, operadora y administracion.

El producto existe en dos superficies principales:

- PWA instalable por rol: cliente, delivery, restaurante y admin/operadora.
- APK Android por rol: cliente y delivery, con version 2 activa en los flavors `clienteV2` y `deliveryV2`.

La version 2 utiliza una identidad visual basada en la marca Beep Delivery: negro `#111111`, amarillo `#FFC107`, grises `#E5E5E5` y `#9E9E9E`, fondo claro `#FAFAFA`, tipografias Poppins e Inter, e iconografia enfocada en ubicacion, entrega, compras, tiempo y seguridad.

## 2. Problema

Los pedidos locales por WhatsApp o llamadas suelen ser lentos, poco trazables y dificiles de coordinar cuando intervienen cliente, delivery, restaurante y operadora. El cliente necesita saber si su pedido fue recibido, cuanto costara, quien lo entrega y en que estado esta. El repartidor necesita recibir pedidos claros, cotizar, navegar al destino y actualizar estados sin depender de mensajes dispersos.

## 3. Objetivos

- Permitir que un cliente cree pedidos con ubicacion GPS y destino confirmado.
- Permitir que un repartidor reciba pedidos, cotice productos/servicio y actualice el avance.
- Soportar pedidos de restaurantes con multiples productos y seguimiento de preparacion.
- Mantener comunicacion por chat interno y accesos rapidos a WhatsApp.
- Ofrecer seguimiento de estado y ubicacion durante la entrega.
- Separar experiencias por rol para que cada PWA/APK abra directamente la interfaz correcta.
- Consolidar una V2 visualmente coherente con la identidad Beep Delivery.

## 4. No Objetivos

- No reemplazar pasarelas de pago en esta etapa.
- No implementar optimizacion avanzada de rutas multi-parada.
- No construir un sistema contable completo.
- No lanzar produccion con politicas RLS permisivas de desarrollo.
- No depender de una unica plataforma: PWA y APK deben convivir.

## 5. Usuarios

### Cliente

Persona que solicita comida, farmacia, supermercado u otros encargos. Necesita registrar nombre, correo, WhatsApp y GPS. Quiere pedir rapido, confirmar precio y hacer seguimiento.

### Delivery

Repartidor que recibe pedidos, cotiza costos, confirma compras/recojos, comparte ubicacion y marca estados hasta completar entrega.

### Restaurante

Negocio que visualiza pedidos relacionados a comida/restaurante y puede participar en el flujo de preparacion.

### Operadora

Usuario interno que coordina pedidos manualmente cuando el modo de despacho es por operadora.

### Admin

Usuario de gestion que observa pedidos, repartidores y configuraciones operativas como el modo de despacho.

## 6. Plataformas

### PWA

La PWA se empaqueta en carpetas independientes:

- `dist/cliente`
- `dist/delivery`
- `dist/restaurante`
- `dist/admin`

Cada paquete fija su rol mediante `window.__RAPIDINGO_ROLE`, manifest propio, titulo propio y cache dedicada. La V2 es la experiencia por defecto; V1 queda disponible solo por parametro `?v=1`.

### APK Android

El proyecto Android define flavors por rol:

- `cliente`: V1 cliente.
- `delivery`: V1 delivery.
- `clienteV2`: V2 cliente, `IS_V2 = true`.
- `deliveryV2`: V2 delivery, `IS_V2 = true`.

Los APK V2 deben usar icono, launcher, nombre y tema visual Beep Delivery.

## 7. Alcance MVP

### Registro e Inicio

- Registro por rol con nombre, correo, WhatsApp y permisos de ubicacion.
- Inicio con Gmail/Supabase Auth donde este configurado.
- Recuperacion de usuario por correo si ya existe.
- Validacion de rol para evitar usar el mismo correo como otro tipo de usuario.
- Persistencia local para mantener sesion en PWA/APK.

### Pedidos Cliente

- Seleccion de categoria: restaurante/comida, farmacia, supermercado y otros.
- Creacion de pedido con descripcion, ubicacion origen y destino.
- Confirmacion de destino: ubicacion actual u otra ubicacion.
- Busqueda/movimiento de destino en mapa cuando aplique.
- Envio de pedido a Supabase.
- Visualizacion de estado persistente del pedido.
- Confirmacion de cotizacion antes de iniciar la entrega.
- Cancelacion mientras el pedido no este en ruta.

### Restaurantes

- Catalogo de restaurantes aliados con categoria, horario, telefono, direccion, tiempo estimado, costo de envio y pedido minimo.
- Seleccion de productos por restaurante.
- Resumen agrupado por restaurante.
- Soporte de pedidos con varios productos y cantidades.
- Mensajes de sistema para avance de restaurante: aceptado, listo, entregado al delivery.

### Delivery

- Estado online al ingresar como repartidor.
- Recepcion de pedido asignado o disponible segun modo de despacho.
- Cotizacion desglosada: productos, cantidades, precio unitario, total productos, tarifa de servicio y total general.
- Actualizacion de estados: confirmado, recogiendo/comprando, en ruta, llego, completado/cancelado.
- Seguimiento GPS durante estados activos.
- Navegacion externa con Waze hacia destino.
- Historial/resumen local de ganancias.

### Chat y Comunicacion

- Chat interno por pedido.
- Sonido de notificacion al cambiar estado o recibir mensajes.
- Boton WhatsApp cuando exista telefono valido.
- Mensajes de sistema para eventos importantes.

### Admin y Operadora

- Visualizacion de pedidos activos.
- Visualizacion de repartidores online.
- Soporte de modo despacho automatico u operadora.
- Capacidad de coordinar pedidos desde una vista interna.

## 8. Flujo Principal

1. Cliente abre PWA/APK Cliente V2.
2. Cliente se registra o se recupera por Gmail/correo.
3. App solicita GPS y WhatsApp si faltan.
4. Cliente crea pedido y confirma destino.
5. Sistema crea el pedido en Supabase con estado `PENDING_PRICE`.
6. Si el despacho es automatico, el sistema selecciona delivery candidato por cercania y disponibilidad.
7. Delivery recibe pedido y envia cotizacion.
8. Pedido pasa a `WAITING_CONFIRM`.
9. Cliente acepta cotizacion.
10. Pedido pasa a `CONFIRMED_BY_CLIENT`.
11. Delivery compra/recoge y actualiza a `PICKING_UP`.
12. Delivery inicia ruta y actualiza a `IN_DELIVERY`.
13. Delivery marca llegada: `DELIVERED_BY_REPARTIDOR`.
14. Cliente confirma recepcion: `COMPLETED`.
15. Sistema guarda resumen/historial y muestra mensaje de agradecimiento.

## 9. Estados de Pedido

- `DRAFT`: borrador.
- `PENDING_PRICE`: pedido enviado, esperando cotizacion.
- `BIDDING`: cotizacion en curso.
- `WAITING_CONFIRM`: cliente debe aceptar precio.
- `CONFIRMED_BY_CLIENT`: cliente acepto.
- `PICKING_UP`: delivery comprando o recogiendo.
- `IN_DELIVERY`: delivery en ruta.
- `DELIVERED_BY_REPARTIDOR`: delivery llego.
- `COMPLETED`: pedido finalizado.
- `CANCELLED`: pedido cancelado.

## 10. Requisitos Funcionales

### RF-01 Registro de Usuario

El sistema debe permitir registrar clientes y delivery con nombre, correo, WhatsApp, rol y ubicacion.

### RF-02 Recuperacion por Correo

El sistema debe consultar Supabase para recuperar usuarios existentes por correo y rol.

### RF-03 GPS Obligatorio

Cliente y delivery deben aprobar ubicacion antes de operar pedidos.

### RF-04 Creacion de Pedido

El cliente debe poder crear pedidos con categoria, descripcion, ubicacion y destino.

### RF-05 Asignacion de Delivery

En modo automatico, el sistema debe seleccionar candidatos online, con GPS valido, sin pedido activo y ordenados por cercania.

### RF-06 Cotizacion

El delivery debe poder enviar una cotizacion con precio de productos, tarifa de servicio y total.

### RF-07 Confirmacion del Cliente

El cliente debe aceptar o cancelar la cotizacion antes de que el pedido avance.

### RF-08 Seguimiento de Estado

Cliente y delivery deben ver el estado actual del pedido en tiempo casi real.

### RF-09 Chat por Pedido

El sistema debe permitir mensajes entre cliente y delivery asociados al pedido activo.

### RF-10 WhatsApp Externo

Si existe un telefono valido, la app debe abrir WhatsApp con mensaje prellenado.

### RF-11 Seguimiento GPS Delivery

Durante el pedido activo, el delivery debe actualizar su ubicacion para seguimiento.

### RF-12 Pedidos Restaurante

El cliente debe poder armar pedidos de restaurante con multiples items, cantidades y agrupacion por restaurante.

### RF-13 Estados Restaurante

El sistema debe interpretar mensajes `RESTAURANT_STATUS` para mostrar preparacion, listo y recogido.

### RF-14 Historial

El sistema debe guardar pedidos finalizados en historial local y/o Supabase segun disponibilidad.

### RF-15 PWA por Rol

El build PWA debe generar paquetes independientes con manifest, titulo, rol y cache coherentes.

### RF-16 APK V2 por Rol

Los flavors Android V2 deben compilar con `IS_V2 = true`, nombre Beep y recursos visuales V2.

## 11. Requisitos No Funcionales

- Rendimiento: las pantallas criticas deben responder en menos de 2 segundos despues de tener datos locales.
- Disponibilidad: la app debe tolerar perdida temporal de red y mostrar errores claros al usuario.
- Seguridad: antes de produccion se deben reemplazar politicas RLS permisivas por politicas autenticadas.
- Compatibilidad: PWA debe funcionar en Chrome Android y Safari iOS como app instalable.
- Android: APK debe soportar minSdk 24 y permisos de GPS/camara/notificaciones.
- Accesibilidad: controles primarios deben tener contraste suficiente con la paleta Beep.
- Observabilidad: errores de Supabase, GPS y auth deben registrarse en consola/logcat.
- Consistencia visual: V2 debe usar Poppins/Inter, amarillo Beep, negro y grises de la marca.

## 12. Identidad Visual V2

### Colores

- Negro: `#111111`
- Amarillo: `#FFC107`
- Gris claro: `#E5E5E5`
- Gris medio: `#9E9E9E`
- Fondo claro: `#FAFAFA`
- Blanco: `#FFFFFF`

### Tipografia

- Principal: Poppins.
- Secundaria: Inter.

### Iconografia

La iconografia debe reforzar:

- Ubicacion
- Entrega
- Compras
- Tiempo
- Seguridad

### Aplicaciones

- Icono PWA y launcher APK deben usar la abeja sobre fondo amarillo.
- UI cliente puede usar tema claro con amarillo/negro.
- UI delivery puede usar tema oscuro con amarillo/negro.

## 13. Datos y Backend

Supabase es la fuente compartida para PWA y APK:

- `users`
- `orders`
- `delivery_reports`
- `settings`
- bucket privado `order-media`

La PWA usa variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, con fallback a las mismas llaves locales usadas por Android. Android usa `SUPABASE_URL` y `SUPABASE_ANON_KEY` desde `local.properties` o Gradle properties.

## 14. Metricas de Exito

- Tasa de pedidos completados sobre pedidos creados.
- Tiempo promedio desde `PENDING_PRICE` hasta `WAITING_CONFIRM`.
- Tiempo promedio desde confirmacion hasta entrega.
- Porcentaje de pedidos cancelados por falta de delivery.
- Numero de deliveries online por hora.
- Pedidos por categoria.
- Uso de WhatsApp externo vs chat interno.
- Errores de GPS/autenticacion por sesion.

## 15. Riesgos

- Permisos GPS denegados pueden bloquear el flujo.
- RLS permisivo no es apto para produccion.
- Dependencia de conectividad en tiempo real.
- GoogleSignIn actual muestra deprecaciones en Android.
- El bundle PWA es grande y puede requerir code splitting.
- Las PWAs no funcionan correctamente desde `file://`; requieren `http`, `https` o localhost.

## 16. Roadmap

### Fase 1 - Estabilizacion V2

- Consolidar visual Beep en todas las pantallas V2.
- Verificar PWA y APK en dispositivos reales.
- Revisar textos, acentos y estados vacios.
- Asegurar que cada flavor/paquete tenga icono y nombre correcto.

### Fase 2 - Operacion Real

- Endurecer RLS en Supabase.
- Mejorar panel de administracion y operadora.
- Agregar reportes por fecha, delivery y categoria.
- Mejorar seguimiento de ubicacion y reintentos de red.

### Fase 3 - Escalamiento

- Separar chunks de PWA para reducir carga inicial.
- Push notifications reales.
- Pagos o registro de cobros.
- Analitica operativa.
- Gestion avanzada de restaurantes y menus.

## 17. Criterios de Aceptacion MVP

- Cliente V2 puede registrarse, activar GPS, crear pedido y confirmar precio.
- Delivery V2 puede registrarse, quedar online, recibir pedido, cotizar y avanzar estados.
- Cliente ve cambios de estado y puede confirmar entrega.
- Chat funciona entre cliente y delivery.
- PWA empaqueta cuatro roles con manifests validos.
- APK `clienteV2` y `deliveryV2` compilan y usan `IS_V2 = true`.
- La identidad visual Beep se refleja en icono, paleta, tipografia y pantallas principales.

## 18. Comandos de Verificacion

```powershell
npm.cmd run build:pwas
```

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat :app:assembleClienteV2Debug :app:assembleDeliveryV2Debug
```

## 19. Entregables Actuales

- PWA cliente: `dist/cliente`
- PWA delivery: `dist/delivery`
- PWA restaurante: `dist/restaurante`
- PWA admin: `dist/admin`
- APK cliente V2: `app/build/outputs/apk/clienteV2/debug/app-clienteV2-debug.apk`
- APK delivery V2: `app/build/outputs/apk/deliveryV2/debug/app-deliveryV2-debug.apk`
