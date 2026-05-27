# Plan de factibilidad y migracion: Realtime + consultas filtradas

Fecha: 2026-05-27

## Decision recomendada

La ruta mas conveniente para Rapidingo es una migracion hibrida:

1. Primero cambiar el polling global por polling filtrado por rol.
2. Despues incorporar Supabase Realtime solo donde aporta valor: pedido activo, cola de delivery, dashboard admin/operadora y `settings`.
3. Mantener polling lento como respaldo cuando Realtime falle o el dispositivo vuelva de segundo plano.

No recomiendo pasar todo a Realtime de una sola vez. El sistema actual usa polling en PWA y Android, y una migracion total aumentaria riesgo de regresiones. Filtrar consultas primero baja la carga de inmediato y deja una base estable para Realtime.

## Factibilidad

| Area | Factibilidad | Riesgo | Recomendacion |
| --- | --- | --- | --- |
| Cliente: solo pedidos activos propios | Alta | Bajo | Migrar primero |
| Delivery: pedido asignado + cola filtrada | Media | Medio | Migrar por etapas |
| Admin/operadora: activos paginados | Alta | Bajo | Migrar primero junto a cliente |
| Delivery users online con GPS valido | Alta | Bajo | Cambiar consulta e indice |
| Settings cache/realtime | Alta | Bajo | Cache local + realtime |
| Realtime total de pedidos | Media | Medio/Alto | Hacer despues del filtrado |
| Android completo | Media | Medio | Replicar despues de PWA validada |

## Problema actual

Actualmente muchos roles ejecutan consultas amplias:

- `SupabasePwaApi.getOrders()` trae todos los pedidos.
- `AppContext` refresca cada 2.5 s pedidos, repartidores y settings.
- Android tambien consulta pedidos cada 2.5 s y deliveries cada 4 s.

En hora pico esto escala mal:

- 100 usuarios + 10 repartidores pueden generar mas de 100 requests/s solo en lectura si todos tienen la app abierta.
- 500 usuarios + 50 repartidores pueden superar cientos de requests/s.
- La consulta global de `orders` crece con cada pedido completado si no hay archivado/limpieza.

## Arquitectura objetivo

### Cliente

Debe consultar solo:

- Pedido activo propio.
- Historial propio paginado, si se muestra.

Filtro recomendado:

```http
/rest/v1/orders?client_id=eq.{clientId}&status=not.in.(COMPLETED,CANCELLED)&order=created_at.desc&limit=1
```

Mejor opcion en PostgREST:

```http
/rest/v1/orders?client_id=eq.{clientId}&status=neq.COMPLETED&status=neq.CANCELLED&order=created_at.desc&limit=1
```

Realtime:

- Canal por `client_id`.
- Escuchar INSERT/UPDATE/DELETE del pedido activo del cliente.

### Delivery

Debe consultar dos cosas separadas:

1. Su pedido asignado o tomado:

```http
/rest/v1/orders?delivery_id=eq.{deliveryId}&status=neq.COMPLETED&status=neq.CANCELLED&order=created_at.desc&limit=1
```

2. Su cola de oportunidades:

Modo automatico:

```http
/rest/v1/orders?status=eq.PENDING_PRICE&or=(target_delivery_id.eq.{deliveryId},target_delivery_id.is.null)&not.rejected_by.cs.["{deliveryId}"]&order=created_at.asc&limit=10
```

Modo operadora:

```http
/rest/v1/orders?status=eq.PENDING_PRICE&target_delivery_id=eq.{deliveryId}&not.rejected_by.cs.["{deliveryId}"]&order=created_at.asc&limit=10
```

Nota tecnica:

El filtro `not.rejected_by.cs` sobre JSONB puede ser incomodo por REST. Si causa problemas, conviene crear una RPC `get_delivery_queue(delivery_id text, dispatch_mode text, limit_count int)`.

Realtime:

- Canal para updates donde `delivery_id = deliveryId`.
- Canal para nuevos `PENDING_PRICE`.
- Al recibir evento de cola, validar nuevamente con consulta filtrada antes de mostrar/tomar.

### Admin/operadora

Debe consultar:

- Pedidos activos paginados.
- Pedidos completados/cancelados por filtros de fecha.
- Conductores online paginados o limitados.

Filtro recomendado para monitoreo:

```http
/rest/v1/orders?status=neq.COMPLETED&status=neq.CANCELLED&order=created_at.asc&limit=50&offset=0
```

Para metricas:

- Usar `delivery_reports` o una vista agregada.
- Evitar calcular metricas leyendo todos los pedidos desde el frontend.

Realtime:

- Canal de pedidos activos para operadora/admin.
- Mantener paginacion: Realtime avisa cambios, la pantalla refresca la pagina actual o inserta el pedido si corresponde.

### Delivery users

Debe consultar solo repartidores que sirven para despacho:

```http
/rest/v1/users?role=eq.DELIVERY&online=eq.true&order=name.asc
```

Filtrar GPS valido:

- Ideal: agregar columnas `lat`, `lng` normalizadas o una columna generada.
- Alternativa temporal: traer online y filtrar `location.latitude/location.longitude` en cliente.

Recomendacion de DB:

```sql
create index if not exists users_delivery_online_idx
on public.users(role, online)
where role = 'DELIVERY' and online = true;
```

### Settings

`dispatch_mode` no debe pedirse cada 2.5 s por cada usuario.

Objetivo:

- Leer una vez al iniciar.
- Guardar en memoria/localStorage.
- Refrescar cada 60 s como respaldo.
- Usar Realtime para cambios inmediatos.

Fallback:

- Si Realtime falla, polling lento cada 60 s.

## Plan por fases

### Fase 0: Preparacion y medicion

Duracion estimada: 0.5 a 1 dia.

Pasos:

1. Crear proyecto Supabase staging.
2. Ejecutar `supabase/schema.sql`.
3. Ejecutar `npm run loadtest:small` en dry-run.
4. Ejecutar una prueba live pequena con `--cleanup`.
5. Medir p95, errores HTTP y pedidos bloqueados.

Criterio de salida:

- Hay una linea base antes de tocar polling.
- El arnes de carga funciona contra staging.

### Fase 1: Crear consultas filtradas en PWA

Duracion estimada: 1 a 2 dias.

Cambios:

- Agregar nuevos metodos en `services/supabase.ts`:
  - `getActiveOrderForClient(clientId)`
  - `getActiveOrderForDelivery(deliveryId)`
  - `getDeliveryQueue(deliveryId, mode)`
  - `getActiveOrdersPage(limit, offset)`
  - `getOnlineDeliveryUsers()`
  - `getSettingsCached()` o cache en `AppContext`

- Cambiar `AppContext.tsx`:
  - Cliente ya no llama `getOrders()`.
  - Delivery ya no llama `getOrders()` global.
  - Admin/operadora usa pagina de activos.
  - Settings se lee al iniciar y luego cada 60 s.

Criterio de salida:

- Cliente ve su pedido activo igual que antes.
- Delivery recibe/toma pedidos igual que antes.
- Admin/operadora ve activos paginados.
- `npm run build` pasa.
- `loadtest:small --live --cleanup` mejora requests/s y latencia.

### Fase 2: Resolver cola formal de delivery

Duracion estimada: 1 a 2 dias.

Motivo:

En modo automatico, si no hay repartidor disponible al crear el pedido, el pedido puede quedar sin `target_delivery_id`. Android lo contempla mejor que PWA, pero el comportamiento debe ser unico.

Opciones:

1. Cola abierta: pedidos `PENDING_PRICE` sin target son visibles para deliveries libres.
2. Reasignador: funcion periodica que asigna target cuando un delivery queda libre.
3. Operadora fallback: pedidos sin target pasan a bandeja de operadora.

Recomendacion:

- Implementar cola abierta filtrada + claim atomico.
- Mantener `claimOrderForPricing` como proteccion contra doble toma.

Criterio de salida:

- Un pedido sin target aparece a un delivery libre.
- Dos deliveries no pueden tomar el mismo pedido.
- Rechazo agrega `rejected_by` y busca siguiente candidato.

### Fase 3: Realtime selectivo en PWA

Duracion estimada: 2 a 3 dias.

Cambios:

- Usar `supabase.channel(...)` en `AppContext`.
- Cliente:
  - subscribe a cambios de su pedido.
- Delivery:
  - subscribe a su pedido asignado.
  - subscribe a nuevos `PENDING_PRICE`.
- Admin/operadora:
  - subscribe a pedidos activos.
- Settings:
  - subscribe a `settings` key `dispatch_mode`.

Mantener fallback:

- Polling de pedido activo cada 30 s.
- Polling settings cada 60 s.
- Refresco inmediato al volver a foreground.

Criterio de salida:

- Cambio de estado aparece sin esperar 2.5 s.
- Si se corta Realtime, polling lento recupera estado.
- No se duplican notificaciones ni sonidos.

### Fase 4: Migrar Android al mismo modelo

Duracion estimada: 2 a 4 dias.

Pasos:

1. Replicar consultas filtradas en `SupabaseApi.kt`.
2. Cambiar `MainViewModel.observeActiveOrder()` para no leer todos los pedidos.
3. Reducir `observeAvailableDeliveries()` a online filtrado.
4. Mantener polling como respaldo.
5. Evaluar Supabase Realtime en Android despues de estabilizar PWA.

Recomendacion:

- En Android, primero polling filtrado. Realtime Android despues.

Criterio de salida:

- APK cliente/delivery mantiene flujo.
- Consumo de datos y bateria baja.
- Menos lecturas a Supabase.

### Fase 5: Seguridad y RLS productivo

Duracion estimada: 2 a 4 dias.

Debe hacerse antes de produccion real.

Cambios:

- Reemplazar politicas anon por `authenticated`.
- Validar usuario por `auth.uid()`.
- Restringir updates por rol/campo.
- Proteger `settings` para admin/operadora.
- Crear roles reales para admin/operadora o claims.
- Crear RPCs seguras para acciones sensibles:
  - tomar pedido
  - cotizar
  - confirmar cliente
  - asignar driver
  - completar/cancelar

Criterio de salida:

- Un cliente no puede modificar pedido ajeno.
- Un delivery no puede tomar pedido ya tomado.
- Nadie anonimo puede cambiar `dispatch_mode`.
- Storage queda protegido por pedido/owner.

## Orden recomendado de implementacion

1. PWA: metodos filtrados en `services/supabase.ts`.
2. PWA: `AppContext` usando consultas por rol.
3. PWA: admin/operadora paginado.
4. Delivery queue formal para pedidos sin target.
5. Cache settings 60 s.
6. Supabase Realtime en PWA.
7. Android polling filtrado.
8. Android Realtime opcional.
9. RLS productivo y RPCs.

## Cambios concretos sugeridos por archivo

### `services/supabase.ts`

Agregar:

- `getActiveClientOrder(clientId)`
- `getActiveDeliveryOrder(deliveryId)`
- `getDeliveryQueue(deliveryId, dispatchMode)`
- `getActiveOrdersPage(limit, offset)`
- `getOnlineDeliveryUsers()`
- `subscribeToOrder(orderId, callback)`
- `subscribeToClientOrders(clientId, callback)`
- `subscribeToDeliveryOrders(deliveryId, callback)`
- `subscribeToDispatchMode(callback)`

### `context/AppContext.tsx`

Cambiar:

- Reemplazar `SupabasePwaApi.getOrders()` global por funciones por rol.
- Separar estado:
  - `activeOrder`
  - `deliveryQueue`
  - `adminOrdersPage`
  - `onlineDeliveries`
- Settings con cache y realtime.

### `components/admin/AdminModule.tsx`

Cambiar:

- Usar pagina de activos.
- Boton "cargar mas" o paginacion simple.
- Metricas desde endpoint/vista agregada, no desde todos los pedidos.

### `app/src/main/java/.../SupabaseApi.kt`

Agregar equivalentes:

- `getActiveClientOrder(clientId)`
- `getActiveDeliveryOrder(deliveryId)`
- `getDeliveryQueue(deliveryId, mode)`
- `getOnlineDeliveryUsers()`

### `app/src/main/java/.../MainViewModel.kt`

Cambiar:

- `observeActiveOrder()` a consultas filtradas.
- `observeAvailableDeliveries()` a online filtrado.
- Reducir frecuencia de settings.

## Pruebas necesarias

### Funcionales

- Cliente crea pedido en automatico.
- Delivery toma y cotiza.
- Cliente confirma.
- Delivery entrega.
- Cliente completa.
- Delivery rechaza y se reasigna.
- Modo operadora cotiza y asigna.
- Restaurante acepta/listo.
- Admin fuerza cancelar/completar.

### Carga

Small:

```bash
npm run loadtest -- --scenario=small --mode=both --live --cleanup
```

Large:

```bash
npm run loadtest -- --scenario=large --mode=both --live --cleanup --concurrency=50
```

### Aceptacion tecnica

- Menos requests totales que la version actual.
- p95 REST menor a 1500 ms en small.
- p95 REST menor a 2500 ms en large.
- Cero doble asignacion.
- Cero pedidos invisibles en automatico.
- Admin/operadora no se bloquea con 500 pedidos.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Realtime pierde eventos al volver de segundo plano | Polling lento de respaldo y refresh al foreground |
| Filtros REST con JSONB `rejected_by` son incomodos | Crear RPC `get_delivery_queue` |
| Admin necesita vista global | Paginacion + filtros, no lectura total |
| Diferencia PWA/Android | Migrar primero PWA, luego replicar contratos en Android |
| RLS rompe app actual | Staging, RPCs y migracion por roles |

## Veredicto de factibilidad

La migracion es factible y recomendable. La mayor ganancia inicial viene de eliminar `getOrders()` global para cliente/delivery y bajar frecuencia de `settings`.

Realtime debe entrar despues, como optimizacion de experiencia y latencia, no como primer paso. La prioridad operativa es que cada rol lea solo lo que necesita y que exista una cola formal para pedidos sin repartidor.

