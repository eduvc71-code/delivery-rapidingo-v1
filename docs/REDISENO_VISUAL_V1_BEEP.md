# Rediseño visual propuesto para V1 - Beep Delivery

## Objetivo

Mejorar visualmente la version 1 sin alterar su logica, estados ni flujo funcional. La propuesta toma la identidad visual de la imagen subida y la traduce a las pantallas actuales: cliente, delivery, restaurante y administracion.

## Diagnostico V1

La V1 ya tiene una estructura funcional completa, pero visualmente mezcla varias direcciones:

- Mucho naranja `#FF6A00`, cuando la identidad Beep usa amarillo `#FFC107` como color principal.
- Tipografias Montserrat/Teko con estilo muy deportivo; la marca pide Poppins para titulos e Inter para lectura.
- Pantallas oscuras con mucho brillo y bordes intensos, lo que reduce legibilidad en operacion diaria.
- Tarjetas y modales con radios muy grandes y sombras pesadas; conviene llevarlos a superficies mas limpias.
- Cliente, delivery, restaurante y admin se sienten como productos distintos; necesitan un sistema comun.
- Iconografia funcional correcta, pero puede simplificarse con un lenguaje visual consistente: ubicacion, entrega, compras, tiempo, seguridad.

## Principios de rediseño

- Mantener flujo: no cambiar pasos, estados, botones ni informacion requerida.
- Separar tono por rol: cliente mas claro y amable; delivery/admin mas oscuro y operativo.
- Usar amarillo Beep solo para acciones primarias, estados activos y foco.
- Usar negro para estructura, no para saturar toda la pantalla cliente.
- Reemplazar textos enormes/condensados por jerarquia Poppins + Inter.
- Hacer las pantallas mas escaneables: menos ruido, mas agrupacion por tarea.
- Mantener el icono de la abeja como ancla de marca.

## Sistema visual aplicado

### Colores

- Negro: `#111111`
- Amarillo: `#FFC107`
- Gris claro: `#E5E5E5`
- Gris medio: `#9E9E9E`
- Fondo claro: `#FAFAFA`
- Blanco: `#FFFFFF`
- Verde operativo: `#22C55E`
- Azul informativo: `#2563EB`
- Rojo alerta: `#EF4444`

### Tipografia

- Titulos, botones y labels fuertes: Poppins.
- Cuerpo, formularios y detalle operativo: Inter.

### Componentes base

- Header compacto con logo, rol y estado.
- Tarjetas blancas para cliente.
- Tarjetas oscuras para delivery/admin/restaurante.
- Botones primarios amarillos con texto negro.
- Botones secundarios grises/blancos.
- Estados con barra lateral o badge, no con fondos completos agresivos.
- Navegacion inferior limpia con icono + label.

## Pantallas generadas

Se genero un prototipo HTML estatico en:

`docs/prototipo-v1-beep/index.html`

Incluye estas pantallas:

- Registro cliente.
- Home cliente con categorias.
- Pedido restaurante y destino.
- Seguimiento cliente.
- Panel delivery online.
- Cotizacion delivery.
- Panel restaurante.
- Panel admin/operadora.

## Como usar la propuesta

Este prototipo no toca el codigo funcional. Sirve como guia visual para aplicar despues sobre V1 componente por componente.

La integracion recomendada seria:

1. Crear tokens visuales V1 Beep en CSS.
2. Reemplazar clases visuales en `Register.tsx`.
3. Reemplazar estilos en `ClientModule.tsx` sin tocar handlers ni estados.
4. Repetir en `DeliveryModule.tsx`, `RestaurantModule.tsx` y `AdminModule.tsx`.
5. Validar con `npm.cmd run build:pwas`.

## Criterios de aceptacion visual

- V1 conserva sus mismos eventos, formularios, estados y textos operativos.
- La interfaz se reconoce como Beep Delivery.
- Cliente se siente mas claro y directo.
- Delivery, restaurante y admin se sienten mas operativos y legibles.
- El amarillo se usa de forma consistente como accion/foco.
- No queda dependencia visual dominante del naranja viejo.
