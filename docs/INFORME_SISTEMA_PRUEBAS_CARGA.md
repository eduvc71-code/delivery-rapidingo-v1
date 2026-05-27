# Informe minucioso del sistema Rapidingo

Fecha de revision: 2026-05-27

Este informe se basa en el codigo actual del repositorio, no en una maqueta teorica. El sistema tiene dos superficies principales:

- PWA React/Vite: cliente, delivery, restaurante, admin y operadora.
- APK Android Kotlin/Compose: cliente y delivery, conectados a las mismas tablas Supabase.

La base comun operativa es Supabase REST. PocketBase aparece como legado y Gmail se maneja por Google/Supabase Auth.

## 1. Arquitectura real

### Frontend PWA

Archivos principales:

- `App.tsx`: seleccion de modo/rol y contenedor general.
- `context/AppContext.tsx`: estado global, polling, registro, creacion y actualizacion de pedidos.
- `components/client/ClientModule.tsx`: pedido, ubicacion, cotizacion, tracking, chat y confirmacion final.
- `components/delivery/DeliveryModule.tsx`: toma de pedido, cotizacion, ruta, llegada, chat y cancelacion/rechazo.
- `components/restaurant/RestaurantModule.tsx`: recepcion de pedidos por restaurante, tiempo de preparacion y listo para recojo.
- `components/admin/AdminModule.tsx`: monitoreo, modo de despacho, asignacion manual, cotizacion por operadora, conductores y metricas.
- `services/supabase.ts`: cliente REST manual contra Supabase.
- `services/supabaseClient.ts`: cliente oficial `@supabase/supabase-js` para auth.

### Android

Archivos principales:

- `app/src/main/java/delivery/trinidad/MainViewModel.kt`: estado, polling, registro, seleccion de pedidos, creacion y transiciones.
- `app/src/main/java/delivery/trinidad/data/SupabaseApi.kt`: REST directo a Supabase.
- `app/src/main/java/delivery/trinidad/Models.kt`: modelos CLIENT/DELIVERY y estados de pedido.
- `app/src/main/java/delivery/trinidad/LocationService.kt`: seguimiento y notificaciones en segundo plano.

### Base de datos

Archivo:

- `supabase/schema.sql`

Tablas:

- `users`: clientes, deliveries y algunos roles especiales mapeados por email.
- `orders`: pedidos activos y tambien completados en algunas rutas.
- `delivery_reports`: resumen liviano por repartidor, pero no todas las rutas lo escriben.
- `settings`: modo global `dispatch_mode` con valores `AUTOMATIC` u `OPERATOR`.
- `storage.order-media`: fotos de pedidos, pagos y chat.

## 2. Roles y coherencia

### Cliente

Responsabilidades:

- Registrarse con nombre, telefono, email y ubicacion.
- Crear pedido con categoria, descripcion, ubicacion de cliente y destino.
- Esperar cotizacion.
- Confirmar precio.
- Seguir el estado y GPS del delivery.
- Confirmar recepcion final.

Estados relevantes:

- `PENDING_PRICE`: pedido creado.
- `WAITING_CONFIRM`: precio listo.
- `CONFIRMED_BY_CLIENT`: cliente acepto.
- `PICKING_UP`: delivery/restaurante preparando o comprando.
- `IN_DELIVERY`: pedido en ruta.
- `DELIVERED_BY_REPARTIDOR`: delivery marco llegada.
- `COMPLETED`: cliente confirma cierre.

Observacion:

El cliente puede cancelar antes de estar en ruta. En PWA, los completados quedan en `orders` como `COMPLETED`; hay una funcion `finalizeCompletedOrder` que guarda report y borra, pero no es la ruta usada por `updateOrder`. En Android tambien se marca `COMPLETED`, se guarda historial local, pero no se borra ni siempre se genera `delivery_reports`.

### Delivery / repartidor

Responsabilidades:

- Registrarse como `DELIVERY`, quedar online y enviar ubicacion.
- Recibir pedido asignado o disponible.
- Reclamar pedido para cotizar con condicion atomica parcial.
- Enviar precio de productos y servicio.
- Avanzar por compra, ruta, llegada y espera de confirmacion.
- Rechazar/cancelar cuando corresponde.

Integridad positiva:

- La toma del pedido tiene proteccion en Supabase REST: `status=eq.PENDING_PRICE`, `delivery_id=is.null` y target compatible. Esto reduce colisiones cuando dos deliveries intentan tomar el mismo pedido.

Riesgo:

- El resto de transiciones no tiene validacion de estado anterior en backend. Cualquier cliente anonimo con la key anon puede hacer PATCH a cualquier pedido por las politicas actuales.

### Restaurante

Responsabilidades:

- Entrar por clave de restaurante.
- Ver pedidos donde su nombre aparece en la descripcion.
- Aceptar y declarar tiempo.
- Marcar listo.
- Esperar confirmacion de recojo por delivery.

Riesgo de coherencia:

- La vinculacion restaurante-pedido se hace parseando texto (`RESTAURANTE:` y lineas `- item xN`). Es funcional, pero fragil: un cambio de nombre o formato rompe el panel del restaurante.
- Hay mapeos duplicados de restaurantes en cliente, delivery, admin, restaurante y Android.

### Admin

Responsabilidades:

- Login con clave local (`admin747`).
- Ver monitoreo, mapa, conductores, metricas.
- Cambiar `dispatch_mode`.
- Forzar completar/cancelar.
- Ver chat y estado.
- Verificar conductores.

Riesgo:

- La autenticacion admin es de UI, no de servidor. Como RLS esta abierto a anon, el rol admin no protege realmente operaciones en base.

### Operadora

Responsabilidades:

- Login con clave local (`operador747`).
- Modo `OPERATOR`: cotizar, enviar pedido a restaurante, asignar conductor y chatear como soporte.

Flujo esperado:

1. Cliente crea pedido.
2. Pedido queda `PENDING_PRICE` sin `target_delivery_id`.
3. Operadora cotiza y pasa a `WAITING_CONFIRM`.
4. Cliente confirma y pasa a `CONFIRMED_BY_CLIENT`.
5. Operadora puede enviar a restaurante y/o asignar driver.
6. Pedido pasa a `PICKING_UP`, luego `IN_DELIVERY`, `DELIVERED_BY_REPARTIDOR`, `COMPLETED`.

Riesgo:

- En modo operadora, el sistema depende de que una persona asigne pedidos. Si hay muchos pedidos simultaneos, no existe cola automatica, SLA, prioridad o reasignacion por timeout.

## 3. Flujo automatico cliente/delivery

1. Cliente crea pedido.
2. `createOrder` lee `dispatch_mode`.
3. Si es `AUTOMATIC`, lee repartidores y pedidos activos.
4. Calcula repartidores libres:
   - rol `DELIVERY`
   - online
   - ubicacion valida
   - no aparece como `deliveryId` ni `targetDeliveryId` en pedidos activos
   - no esta en `rejectedBy`
5. Elige aleatoriamente uno de los tres mas cercanos.
6. Crea pedido con `target_delivery_id`.
7. Repartidor ve el pedido y cotiza.
8. Cliente acepta.
9. Repartidor compra/recoge y entrega.

Hallazgo importante:

- Si no hay repartidores libres al crear el pedido, el pedido puede quedar sin `target_delivery_id`.
- En PWA delivery, el repartidor solo busca pedidos `PENDING_PRICE` con `targetDeliveryId === user.id`; por tanto, un pedido sin target puede quedar invisible para deliveries PWA.
- Android si contempla pedidos `targetDeliveryId` vacio en modo automatico, pero la experiencia no es simetrica.

Impacto en hora pico:

- Con 10 repartidores, solo 10 pedidos pueden quedar asignados inmediatamente si todos quedan ocupados.
- Con 50 repartidores, solo 50 pedidos pueden quedar asignados inmediatamente.
- El excedente requiere logica de cola, operadora o que Android tome pedidos sin target. En PWA esto es un cuello de botella.

## 4. Flujo cliente/operadora

1. Admin/operadora cambia `settings.dispatch_mode` a `OPERATOR`.
2. Cliente crea pedido sin target de delivery.
3. Operadora cotiza.
4. Cliente acepta.
5. Operadora asigna conductor online.
6. Si es restaurante, operadora puede pedir preparacion.
7. Restaurante acepta/listo.
8. Delivery recoge y entrega.

Fortaleza:

- Es mas controlado para restaurantes y pedidos complejos.

Debilidad en carga:

- La operadora se vuelve un cuello de botella humano.
- No hay asignacion por prioridad, edad del pedido, zona, balance de carga, ni alerta de pedidos vencidos.

## 5. Integridad y seguridad

### RLS actual

El schema habilita RLS pero crea politicas de desarrollo:

- usuarios anonimos pueden leer y escribir `users`
- usuarios anonimos pueden leer y escribir `orders`
- usuarios anonimos pueden escribir storage `order-media`
- usuarios anonimos pueden cambiar `settings`

Esto permite pruebas faciles, pero no es apto para produccion.

Riesgo critico:

- Cualquier persona con la anon key puede modificar pedidos, precios, conductores, estado, usuarios, ubicaciones y modo de despacho.

Recomendacion obligatoria antes de produccion:

- Usar Supabase Auth como identidad real.
- Guardar `role` real en claims o tabla protegida.
- Reemplazar politicas anon por politicas `authenticated`.
- Validar que solo el cliente del pedido, el delivery asignado o admin/operadora puedan actualizar cada campo.
- Proteger `settings` solo para admin/operadora.
- Proteger storage por owner/order.

### Estados

El enum de DB no incluye `DRAFT`, pero TypeScript si. Mientras no se guarde `DRAFT` en Supabase, no rompe. Si algun dia se intenta persistir, fallara.

Transiciones no validadas en base:

- `PENDING_PRICE -> WAITING_CONFIRM`
- `WAITING_CONFIRM -> CONFIRMED_BY_CLIENT`
- `CONFIRMED_BY_CLIENT -> PICKING_UP`
- `PICKING_UP -> IN_DELIVERY`
- `IN_DELIVERY -> DELIVERED_BY_REPARTIDOR`
- `DELIVERED_BY_REPARTIDOR -> COMPLETED`

Solo la toma de pedido tiene un filtro atomico robusto.

### Reportes e historial

Inconsistencia:

- `delivery_reports` existe, pero no todas las rutas lo escriben.
- PWA guarda historial local y deja orden completada.
- Android guarda historial local y marca completada.
- Admin calcula metricas sobre `orders`, no sobre `delivery_reports`.

Impacto:

- Las metricas pueden variar segun plataforma y flujo.
- La tabla `orders` puede crecer con completados si no hay limpieza o archivado.

## 6. Polling y capacidad

El sistema usa polling, no realtime:

- PWA activa hace cada 2.5 s: `getOrders`, `getDeliveryUsers`, `getDispatchMode`.
- Android observa ordenes cada 2.5 s y deliveries cada 4 s.

Estimacion teorica si todos estan con la app abierta:

- 100 clientes + 10 repartidores = 110 sesiones.
- PWA: 110 * 3 / 2.5 = 132 requests/s solo de lectura.
- 500 clientes + 50 repartidores = 550 sesiones.
- PWA: 550 * 3 / 2.5 = 660 requests/s solo de lectura.

Esto no incluye escrituras de ubicacion, chat, fotos, cotizaciones ni admin.

Conclusion:

- El mayor riesgo de carga no son los pedidos, sino el polling masivo de `orders` completos para todos los usuarios.
- `getOrders()` trae todos los pedidos para todos los roles. Esto no escala bien.

Recomendaciones:

- Cambiar a Supabase Realtime o polling filtrado por rol.
- Cliente: consultar solo sus pedidos activos.
- Delivery: consultar su pedido asignado y una cola filtrada.
- Admin/operadora: consultar activos paginados.
- Delivery users: cachear o consultar solo online con ubicacion valida.
- Settings: cache local con menor frecuencia o realtime.

## 7. Simulacion de comportamiento esperada

### Escenario A: 10 repartidores y 100 usuarios registrados

Suposiciones:

- Todos los repartidores online y con GPS.
- 100 pedidos entran en una ventana de hora pico.
- Modo automatico.

Resultado esperado:

- Primeros 10 pedidos reciben `target_delivery_id` si la app ve a todos libres.
- 90 pedidos quedan pendientes o sin target si llegan simultaneamente y todos los deliveries ya estan ocupados.
- En PWA delivery, pedidos sin target no aparecen a nuevos repartidores.
- Android puede ver pedidos sin target en automatico, pero esto genera comportamiento diferente entre APK y PWA.

Capacidad operativa:

- Si un delivery tarda 20-35 min por pedido, 10 deliveries solo pueden procesar entre 17 y 30 pedidos/hora aproximadamente, dependiendo de distancia y preparacion.
- 100 pedidos/hora requiere mas deliveries, batching, operadora o promesas de tiempo mas largas.

### Escenario B: 50 repartidores y 500 usuarios registrados

Suposiciones:

- 500 pedidos en pico.
- 50 repartidores online.

Resultado esperado:

- 50 pedidos asignados al inicio.
- 450 pedidos quedan en cola logica, pero la cola no esta implementada de forma formal.
- Polling PWA puede subir a cientos de requests/s si muchas sesiones estan abiertas.

Capacidad operativa:

- 50 deliveries con 2 pedidos/hora cada uno sostienen cerca de 100 pedidos/hora.
- Para 500 pedidos en una hora se requiere una operacion muy superior o una cola con tiempos prometidos claros.

### Modo cliente/operadora en hora pico

Con operadora:

- Se evita que todos los pedidos golpeen al delivery directo.
- La carga humana se concentra en cotizar/asignar.
- Si la operadora no procesa rapido, `PENDING_PRICE` y `WAITING_CONFIRM` crecen.

Necesario:

- Bandeja con prioridad por antiguedad.
- Estados de vencimiento.
- Asignacion semiautomatica por zona.
- Multiples operadoras con lock de pedido.

## 8. Prueba de carga real generada

Se agrego un arnes en:

- `scripts/loadtest/rapidingo-loadtest.mjs`

Comandos:

```bash
npm run loadtest -- --scenario=small --mode=both
npm run loadtest -- --scenario=small --mode=automatic --live --cleanup
npm run loadtest -- --scenario=large --mode=operator --live --cleanup --concurrency=50
```

Por defecto es dry-run. Para trafico real se exige `--live`.

Variables requeridas:

```bash
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Tambien acepta `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

Que hace realmente:

- Inserta clientes de prueba.
- Inserta repartidores online con GPS.
- Cambia `dispatch_mode`.
- Crea pedidos reales en `orders`.
- Ejecuta flujo automatico o flujo operadora con PATCH reales.
- Avanza pedidos por cotizacion, confirmacion, ruta, llegada y completado.
- Mide latencia p50/p95/p99, requests/s, pedidos completados, bloqueados y errores HTTP.
- Si se pasa `--cleanup`, elimina datos generados por prefijo de corrida.

Importante:

- Esto no es simulador visual. Es trafico sintetico real contra la API y la base.
- Debe ejecutarse primero en un proyecto Supabase de staging.
- No ejecutar sobre produccion hasta endurecer RLS y tener backup.

## 9. Criterios de aprobacion para someter a prueba

Antes de prueba small:

- Crear proyecto Supabase staging.
- Ejecutar `supabase/schema.sql`.
- Configurar variables de entorno.
- Confirmar que no hay usuarios reales en staging.
- Ejecutar dry-run.

Prueba small aceptable:

- 0 errores HTTP.
- p95 menor a 1500 ms en REST.
- Sin pedidos automaticos asignados a dos repartidores.
- Pedidos bloqueados explicados por falta de repartidores, no por errores.

Prueba large aceptable:

- 0 errores 5xx.
- p95 menor a 2500 ms.
- Sin crecimiento indefinido de pedidos invisibles.
- Admin/operadora sigue cargando en menos de 3 s.
- No se pierden transiciones de estado.

## 10. Prioridades de correccion

Critico:

- Cerrar RLS anon antes de produccion.
- Implementar cola formal para pedidos sin repartidor.
- Filtrar `getOrders()` por rol y usuario.
- Unificar cierre de pedidos y escritura de reportes.

Alto:

- Validar transiciones de estado en backend.
- Evitar parseo de restaurantes desde texto y crear tabla/JSON estructurado de items.
- Unificar roles entre DB, PWA y Android.
- Evitar que `settings.dispatch_mode` sea modificable por anon.

Medio:

- Reemplazar duplicacion de restaurantes por fuente unica.
- Agregar timeouts de asignacion, cotizacion y restaurante.
- Agregar dashboard de cola y antiguedad por pedido.
- Agregar metricas reales por `delivery_reports`.

## 11. Veredicto

El sistema ya tiene una base funcional para operar pedidos reales en ambos modos. La experiencia de cliente, delivery, restaurante y operadora esta bastante avanzada.

Para someterlo a prueba de trafico, el punto debil principal es backend/operacion, no pantalla: RLS permisivo, polling no filtrado, cola automatica incompleta e historial/reportes inconsistentes.

La recomendacion es ejecutar primero el arnes small en staging, corregir cola y RLS, luego repetir small, y recien despues ejecutar large con 50 repartidores y 500 usuarios.
