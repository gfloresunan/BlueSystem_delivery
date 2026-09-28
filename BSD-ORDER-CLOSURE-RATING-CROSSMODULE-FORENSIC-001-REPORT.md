# INFORME DE AUDITORÍA FORENSE INTEGRAL — CIERRE DE PEDIDO, PRODUCTOS, HISTORIAL Y SISTEMA DE VALORACIONES
**Protocolo:** `BSD-ORDER-CLOSURE-RATING-CROSSMODULE-FORENSIC-001`  
**Ecosistema:** BlueSystem Delivery Enterprise v2.3  
**Modo:** AUDIT-FIRST / READ-ONLY / ZERO MUTATION  
**Fecha:** 2026-09-08  
**Autor:** Senior Developer & Auditor de BlueSystem  

---

## 1. Executive Summary

Se ha completado una auditoría forense quirúrgica, integral y multi-módulo sobre el ciclo final de pedidos Commerce Delivery en BlueSystem Delivery Enterprise.

El objetivo fue investigar la disparidad observada entre dos flujos de pedidos:
* **CASO A (Pedido Problemático / Flujo Real en Vivo):** Pedido entregado físicamente por el motorizado. En la app del cliente se muestra `"✓ Pedido completado"` (o `"Completado"`), se indica `"Detalles de productos no especificados."`, no se visualizan los productos ni la opción de agregarlos a favoritos, no funciona "Volver a pedir", y el botón/experiencia de **"Calificar ⭐" NO aparece**.
* **CASO B (Pedidos Correctos / Históricos con estado "entregado"):** Muestran `"🎉 ¡Pedido entregado!"`, timeline completo en verde, botón `"Calificar ⭐"`, modal de 5 estrellas para Comercio y 5 estrellas para Motorizado con comentarios opcionales.

### Resumen de Conclusiones Forenses:
1. **Pérdida de Productos en Historial & Detalle:** La función `parsePedidoManual(doc)` en [`Models.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt#L170-L263) **NUNCA asigna ni parsea el campo `items`** al construir la instancia de `Pedido`. En consecuencia, todo pedido recuperado mediante `doc.toPedidoSafely()` tiene `order.items = emptyList()`. Esto produce que [`OrderDetailScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt#L221-L228) muestre el fallback `"Detalles de productos no especificados."`, impida favoritos y bloquee "Volver a pedir".
2. **Desaparición del Botón "Calificar ⭐":** [`RutaActivaScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt#L1072-L1090) escribe directamente `status = "completed"` y `estado = "completado"` al confirmar la entrega física. Por otro lado, [`OrdersHistoryScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrdersHistoryScreen.kt#L278) condiciona el botón exclusivamente a `order.status == "delivered" || order.estado == "entregado"`. Al recibir `completed`, la condición evalúa `false` y el botón desaparece por completo.
3. **Falla Silenciosa de Transacción de Calificación (Bloqueo de Seguridad):** [`OrdersViewModel.submitReview()`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrdersViewModel.kt#L107-L135) intenta actualizar directamente desde el cliente `hasBeenRated` en `/orders/{orderId}` y `averageRating`/`ratingCount` en `/users/{businessId}` dentro de un `db.runTransaction`. Las [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L209-L216) prohíben a clientes mutar perfiles ajenos y restringir campos de pedidos, causando `PERMISSION_DENIED` y abortando la transacción silenciosamente (`catch (e) {}`).
4. **Ausencia de Agregación de Rating para Motorizados:** El rating del motorizado se almacena en el documento de `/reviews`, pero no se proyecta a `/users/{courierId}` ni `/couriers/{courierId}`, dejando a la app del repartidor con un fallback hardcodeado de `5.0`.

---

## 2. Current Architecture

```mermaid
flowchart TD
    subgraph Client [Customer App - Android]
        Cart[Customer Cart] -->|placeOrder| OrdersFS[Firestore: /orders/{orderId}]
        OrdersVM[OrdersViewModel / toPedidoSafely] --> OrdersHistory[OrdersHistoryScreen]
        OrdersVM --> OrderDetail[OrderDetailScreen]
        RatingDlg[RatingDialog] -->|submitReview Transaction| TX[db.runTransaction]
    end

    subgraph Courier [Courier App - Android]
        RutaActiva[RutaActivaScreen] -->|Confirmar Entrega| UpdateFS[update: status=completed, estado=completado]
        UpdateFS --> OrdersFS
    end

    subgraph Backend [Cloud Functions & Rules]
        Rules[firestore.rules]
        Functions[triggers/orders.ts: onOrderDelivered]
    end

    subgraph Storage [Firestore Canonical Collections]
        OrdersFS
        ReviewsFS[/reviews/{reviewId}]
        UsersBiz[/users/{businessId}]
        CouriersFS[/couriers/{courierId}]
    end

    TX -.->|Violates Rules| Rules
    TX -.->|Fails Silently| ReviewsFS
    OrdersFS --> Functions
    Functions -->|Financial Ledger| FinEvents[/financial_events]
```

---

## 3. Expected Order Lifecycle

```text
PENDING (Pendiente)
  ↓ [Merchant Acepta & Prepara]
PREPARING (En Preparación / En Cocina)
  ↓ [Merchant Marca Listo]
READY (Listo para Despacho)
  ↓ [Courier Asignado & Acepta]
ASSIGNED / COURIER_ACCEPTED
  ↓ [Courier Recoge en Local]
PICKED_UP / IN_TRANSIT (En Camino)
  ↓ [Courier Entrega en Destino]
DELIVERED (Físicamente Entregado al Cliente)
  ├── Customer Visualiza: "🎉 ¡Pedido entregado!"
  ├── Customer Habilita: "Calificar ⭐" (Comercio 1-5 + Motorizado 1-5 + Comentario)
  ├── Customer Habilita: "Volver a pedir" & Favoritos de Productos
  ↓ [Cierre Transaccional / Financiero]
COMPLETED (Completado)
  ├── Conciliación Financiera y Liquidación
  └── Conserva semántica de entregado para el cliente y calificación disponible si !hasBeenRated
```

---

## 4. Actual Order Lifecycle (Código Real Implementado)

```text
1. Customer crea pedido:
   /orders/{orderId}
   items: [ { productId, productName, price, quantity, subtotal, imageUrl } ]
   status: "pending", estado: "pendiente"

2. Merchant y Courier avanzan orden:
   status: "preparing" → "ready" → "in_transit"

3. Courier entrega físicamente en RutaActivaScreen.kt (L1072-L1086):
   Escribe directamente en Firestore en una sola operación:
   status: "completed"
   estado: "completado"
   courierPhase: 3
   deliveredAt: Timestamp.now()
   completedAt: Timestamp.now()

4. Customer App lee Firestore vía toPedidoSafely() / parsePedidoManual():
   - NO lee ni asigna el array 'items' -> order.items = emptyList()
   - OrderPresentationResolver.resolve(order) -> Title: "✓ Pedido completado", Label: "Completado"
   - OrdersHistoryScreen.kt L278:
     evalúa: (order.status == "delivered" || order.estado == "entregado") -> FALSE
     Resultado: Oculta botón "Calificar ⭐"
   - OrderDetailScreen.kt L221:
     evalúa: order.items.isEmpty() -> TRUE
     Resultado: Muestra "Detalles de productos no especificados."
```

---

## 5. Problematic Order Trace (CASO A)

1. **T0 (Creación):** Cliente realiza checkout. Se persiste `/orders/{orderId}` con `items: [...]`.
2. **T1-T7 (Operación):** El pedido pasa por cocina y reparto.
3. **T8 (Entrega Física):** Motorizado pulsa `"Confirmar Entrega"` en `RutaActivaScreen.kt`. Se envía `update({ status: "completed", estado: "completado", deliveredAt: now, completedAt: now })`.
4. **T9 (Recepción en Cliente):** `OrdersViewModel` recibe el snapshot. `toPedidoSafely()` descarta `items`.
5. **T10 (Renderizado Historial):** `status == "completed"`. Como no es `"delivered"` ni `"entregado"`, el botón `"Calificar ⭐"` no se renderiza.
6. **T11 (Renderizado Detalle):** `order.items` está vacío. Muestra `"Detalles de productos no especificados."`.
7. **T12 (Re-order & Favoritos):** `items` vacío imposibilita agregar productos al carrito o marcarlos como favoritos.

---

## 6. Working Order Trace (CASO B)

1. **Origen de Pedidos en CASO B:** Pedidos creados mediante scripts de migración, tests o flujos administrativos donde `status = "delivered"` y `estado = "entregado"`.
2. **Recepción en Cliente:** `OrdersViewModel` recibe `status == "delivered"`.
3. **Renderizado Historial:** `(order.status == "delivered" || order.estado == "entregado")` es `true`. El botón `"Calificar ⭐"` se renderiza.
4. **Intento de Envío de Review:** Cliente pulsa `"Calificar ⭐"`, completa las 5 estrellas y pulsa `"Enviar Calificación"`.
5. **Ejecución de `submitReview()`:** `OrdersViewModel` inicia `db.runTransaction` para escribir en `/reviews`, `/orders/{id}` (`hasBeenRated`) y `/users/{businessId}` (`averageRating`).
6. **Bloqueo en Firestore Rules:** `firestore.rules` rechaza la escritura en `/orders` y `/users/{businessId}`. La transacción es abortada por Firestore, atrapada por `catch (e) {}` sin emitir feedback al usuario.

---

## 7. Side-by-Side Firestore Comparison

| Campo / Dimensión | Contrato Esperado | Caso A (Flujo Problemático) | Caso B (Flujo Correcto Aparente) | Causa de Discrepancia |
| :--- | :--- | :--- | :--- | :--- |
| `status` en Firestore post-entrega | `"delivered"` o `"completed"` | `"completed"` | `"delivered"` | `RutaActivaScreen` escribe `completed` directamente |
| `estado` en Firestore post-entrega | `"entregado"` o `"completado"` | `"completado"` | `"entregado"` | `RutaActivaScreen` escribe `completado` |
| `items` en `/orders/{id}` | Array de mapas con items | Presente en Firestore (`productName`, `price`) | Presente en Firestore | Datos sí existen en DB |
| `order.items` en Kotlin App | `List<OrderItem>` poblada | `emptyList()` | `emptyList()` (o doc con mapper directo) | `parsePedidoManual` omite `items` |
| `hasBeenRated` en Firestore | `boolean` (false → true) | `false` (no se muestra botón) | `false` (transacción falla en rules) | Regla de actualización bloqueada |
| Botón "Calificar" visible | Visible si entregado/completado y `!hasBeenRated` | **Oculto** | **Visible** | Condición estricta de string en UI |
| Detalle de productos visible | Lista de productos con precio y cantidad | `"Detalles de productos no especificados."` | Ídem si pasa por `parsePedidoManual` | Omisión de parseo en `Models.kt` |
| `/reviews/{reviewId}` generado | Documento de valoración válido | No generado | No generado (abortado por rules) | Transacción cliente no autorizada |

---

## 8. First Divergence

El primer punto de divergencia donde el pedido real en vivo se separa del contrato esperado ocurre en:
1. **Divergencia de Estado (UI/Rating):** [`RutaActivaScreen.kt:1073-1074`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt#L1073-L1074), al transicionar directamente a `status = "completed"` sin que `OrdersHistoryScreen.kt` contemple `completed` como estado elegible para calificación.
2. **Divergencia de Modelo (Productos):** [`Models.kt:215-263`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt#L215-L263), en `parsePedidoManual()`, donde `Pedido` se instancia ignorando completamente el campo `items` del documento Firestore.

---

## 9. Root Causes (Demostradas con Evidencia de Código)

### ROOT-CAUSE 1: Omisión de `items` en el parser canónico de pedidos
* **Archivo:** [`app/src/main/java/com/example/Models.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt#L170-L263)
* **Función:** `parsePedidoManual(doc: DocumentSnapshot): Pedido`
* **Evidencia:**
  En la línea 215, `parsePedidoManual` construye el objeto `Pedido` mapeando campo por campo (`pedidoId`, `customerId`, `businessId`, `total`, etc.), pero **omite pasar el parámetro `items`**. Por defecto, `Pedido.items` toma `emptyList()`.
* **Discrepancia de Nombres:** `CustomerHomeViewModel.placeOrder()` guarda mapas con llaves `productId`, `productName`, `price`, `quantity`, `subtotal`, `imageUrl`. La clase `OrderItem` en `OrderHistoryModels.kt` tiene el campo `name` en lugar de `productName`.

### ROOT-CAUSE 2: Condición restrictiva en `OrdersHistoryScreen.kt` para mostrar el botón de calificar
* **Archivo:** [`app/src/main/java/com/example/presentation/customer/profile/OrdersHistoryScreen.kt:278`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrdersHistoryScreen.kt#L278)
* **Condición:**
  ```kotlin
  if ((order.status == "delivered" || order.estado == "entregado") && !order.hasBeenRated)
  ```
* **Evidencia:**
  Dado que el motorizado ejecuta el cierre marcando `status = "completed"` y `estado = "completado"` ([`RutaActivaScreen.kt:1073-1074`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt#L1073-L1074)), `order.status == "completed"` no cumple la condición, ocultando el botón "Calificar ⭐".

### ROOT-CAUSE 3: Violación de `firestore.rules` en la transacción de calificación del cliente
* **Archivo:** [`app/src/main/java/com/example/presentation/customer/profile/OrdersViewModel.kt:107-129`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrdersViewModel.kt#L107-L129)
* **Evidencia:**
  `submitReview` ejecuta un `db.runTransaction` que intenta:
  1. `transaction.update(orderRef, "hasBeenRated", true)`
  2. `transaction.update(businessRef, "averageRating", newRating)`
  En [`firestore.rules:669-677`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L669-L677), los clientes solo tienen permitido actualizar `status/estado/cancelReason` o `unreadCustomerCount` en `/orders`. Y en [`firestore.rules:209-216`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L209-L216), un cliente no puede actualizar documentos ajenos en `/users/{businessId}`.
  Resultado: La transacción es rechazada por el motor de seguridad de Firebase.

---

## 10. Contributing Causes

1. **Silenciamiento de Excepciones:** En `OrdersViewModel.submitReview()`, el bloque `catch (e: Exception)` se encuentra vacío, ocultando errores de permisos o fallos de red al desarrollador y al usuario.
2. **Falta de Botón de Calificación en Detalle:** [`OrderDetailScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt) no cuenta con un disparador del `RatingDialog`, dejando a `OrdersHistoryScreen` como único punto de entrada.
3. **Ausencia de Callable / Cloud Function para Ratings:** No existe un backend autoritativo que procese valoraciones de manera atómica, recalcule promedios ponderados y actualice los contadores de comercios y motorizados en el servidor.
4. **Dualidad de Colecciones de Comercio:** `/users/{businessId}` vs `/businesses/{businessId}`. La sincronización depende del trigger `businessProjection.ts`, el cual no se dispara si la actualización en `/users` falla por permisos.

---

## 11. Customer App Findings

* **Historial (`OrdersHistoryScreen.kt`):**
  * La insignia de estado utiliza `OrderPresentationResolver.resolve(order)`. Para `completed`, muestra `"Completado"` en lugar de `"Entregado"`.
  * La condición de calificación ignora los estados `completed` y `completado`.
  * La función `"Volver a pedir"` falla silenciosamente al iterar sobre una lista vacía `order.items`.
* **Detalle (`OrderDetailScreen.kt`):**
  * Muestra `"Detalles de productos no especificados."` al encontrar `order.items.isEmpty()`.
  * La sección de favoritos (`OrderItemRow`) no se renderiza.
  * Muestra la tarjeta del motorizado (`driverName`, `driverPlate`, `driverIdStr`), pero no expone métricas de reputación (`averageRating`, `totalDeliveries`).

---

## 12. Courier App Findings

* **Cierre de Entrega (`RutaActivaScreen.kt`):**
  * Al pulsar "Confirmar Entrega" (Fase 2 → 3), ejecuta `update()` enviando simultáneamente `status: "completed"`, `estado: "completado"`, `deliveredAt` y `completedAt`.
  * No separa la confirmación física (`delivered`) del cierre transaccional.
* **Visualización de Rendimiento (`CourierPerformanceScreen.kt` / `CourierViewModel.kt`):**
  * Muestra `metrics.averageRating`, pero este valor proviene de un fallback local hardcodeado a `5.0` en `CourierMetrics.kt`.
  * No existe suscripción ni lectura de valoraciones reales dejadas por clientes hacia el motorizado.

---

## 13. Merchant Web Findings

* **Módulo de Pedidos (`OrdersModule.tsx`):**
  * El normalizador canónico (`normalizeCanonicalStatus`) agrupa correctamente `DELIVERED` y `COMPLETED` como pedidos concluidos en el filtro de historial (`historyStatusFilter`).
  * No sufre regresión visual por `status = "completed"`.
* **Métricas de Reputación:**
  * No dispone de una vista dedicada para inspeccionar comentarios y ratings de clientes en tiempo real.

---

## 14. Admin Web Findings

* **Live Restaurants (`liveRestaurants.js`):**
  * Muestra `★ ${store.rating || store.averageRating || '4.8'}` con fallback estático.
* **Control de Calificaciones:**
  * Permite editar manualmente el rating en el modal de sucursales (`modalBranchRating`), pero no calcula agregados en tiempo real basados en la colección `/reviews`.

---

## 15. Cloud Functions Findings

* **`triggers/orders.ts`:**
  * `onOrderStatusChanged` y `onOrderDelivered` procesan eventos cuando el estado es `delivered`, `entregado`, `completed` o `completado`.
  * Ninguna Cloud Function transforma `delivered` en `completed` de forma retardada o errática; la escritura proviene directamente de `RutaActivaScreen.kt`.
* **Gaps Backend:**
  * No existe una Cloud Function (`onReviewCreated` o callable `submitOrderReview`) encargada de:
    1. Validar que el `orderId` pertenece al cliente solicitante.
    2. Verificar que el pedido esté físicamente entregado (`status in ["delivered", "completed"]`).
    3. Garantizar idempotencia estricta (1 pedido = 1 review).
    4. Marcar `hasBeenRated = true` en `/orders/{orderId}`.
    5. Actualizar atómicamente los promedios en `/businesses/{businessId}` y `/users/{businessId}`.

---

## 16. Firestore Rules Findings

* **`/reviews/{reviewId}`:**
  * Regla actual (L328-L348): Permite `create` si `request.resource.data.customerId == currentUid()` y `orderId != ""`.
* **`/orders/{orderId}`:**
  * Regla actual (L669-L677): No incluye `hasBeenRated` ni `rating` en las llaves permitidas para actualización por parte del cliente.
* **`/users/{uid}`:**
  * Regla actual (L209-L216): Bloquea actualizaciones si `currentUid() != uid`.
* **Veredicto de Seguridad:** El cliente **no debe tener permisos directos** para modificar perfiles de terceros ni marcar flags de auditoría en pedidos. El flujo de calificación debe ejecutarse mediante una Cloud Function segura o mediante reglas quirúrgicas específicas si se mantiene en cliente.

---

## 17. Review System Findings

* **Esquema Real Canónico de `/reviews/{reviewId}`:**
  ```typescript
  interface ReviewDocument {
    id: string;              // Determinístico: orderId o reviewId único
    orderId: string;         // Referencia única al pedido
    businessId: string;      // ID del comercio calificado
    customerId: string;      // UID del cliente que emite la reseña
    courierId: string;       // UID del motorizado asignado
    businessRating: number;  // Calificación comercio (1-5 estrellas)
    courierRating: number;   // Calificación motorizado (1-5 estrellas)
    comments: string;        // Comentario opcional
    timestamp: Timestamp;    // Fecha y hora del registro
  }
  ```

---

## 18. Courier & Merchant Rating Aggregation

* **Comercio:** Debe almacenar `averageRating: number` y `ratingCount: number` en `/businesses/{businessId}` y `/users/{businessId}`.
* **Motorizado:** Debe almacenar `averageRating: number` y `ratingCount: number` en `/couriers/{courierId}` y `/users/{courierId}`.
* **Cálculo Incremental Seguro:**
  $$\text{newAverage} = \frac{(\text{currentAverage} \times \text{currentCount}) + \text{newRating}}{\text{currentCount} + 1}$$
  $$\text{newCount} = \text{currentCount} + 1$$

---

## 19. Side-by-Side Root Cause Classification

| Módulo / Componente | Clasificación | Evidencia Exacta | Impacto |
| :--- | :--- | :--- | :--- |
| `Models.kt` (`parsePedidoManual`) | **ROOT-CAUSE** | Línea 215: omite `items` en instanciación de `Pedido` | Productos vacíos, fallo en detalles, re-order y favoritos |
| `OrdersHistoryScreen.kt` | **ROOT-CAUSE** | Línea 278: solo evalúa `delivered`/`entregado` | Desaparición de botón "Calificar ⭐" tras entrega real |
| `OrdersViewModel.kt` | **ROOT-CAUSE** | Líneas 107-135: transacción cliente bloqueada por rules | Imposibilidad de persistir valoraciones |
| `RutaActivaScreen.kt` | **CONTRIBUTING** | Líneas 1073-1074: escribe `completed` directamente | Dispara la condición que oculta el botón en UI |
| `firestore.rules` | **SECURITY** | Líneas 669-677 & 209-216: restringen escrituras no autorizadas | Bloqueo legítimo de transacción insegura del cliente |
| Backend Cloud Functions | **MISSING-FEATURE** | No existe callable / trigger para reseñas | Falta de agregación server-side para motorizados y comercios |

---

## 20. Minimal Corrective Plan (Propuesta Quirúrgica)

### Prioridad P0 — Corrección de Modelos e Integridad de Productos
1. **[`Models.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt):**
   * En `parsePedidoManual()`, parsear la lista de `items` leyendo tanto `productName` como `name`, `price`, `quantity`, `subtotal`, `imageUrl` y asignarla a `Pedido.items`.
2. **[`OrderHistoryModels.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrderHistoryModels.kt):**
   * Compatibilizar `OrderItem` para soportar `productName` y `name`.

### Prioridad P0 — Disponibilidad de Valoraciones y Semántica de Estados
1. **[`OrdersHistoryScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrdersHistoryScreen.kt):**
   * Actualizar la condición de visibilidad del botón "Calificar ⭐":
     ```kotlin
     val isDeliveredOrCompleted = order.status.lowercase() in listOf("delivered", "completed", "entregado", "completado")
     if (isDeliveredOrCompleted && !order.hasBeenRated) {
         // Mostrar botón "Calificar ⭐"
     }
     ```
2. **[`OrderDetailScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt):**
   * Agregar botón de calificación cuando el pedido esté entregado/completado y `!order.hasBeenRated`.

### Prioridad P0 — Backend Autoritativo de Reseñas / Corrección de Transacción
1. **Cloud Function / Callable (`submitOrderReview`):**
   * Implementar callable autenticado que reciba `{ orderId, businessRating, courierRating, comments }`.
   * Verificar en backend que `order.customerId == auth.uid` y `order.status in ["delivered", "completed"]` y `!order.hasBeenRated`.
   * Ejecutar en una sola transacción Admin SDK:
     * Crear `/reviews/{orderId}` (idempotencia determinística).
     * Actualizar `/orders/{orderId}`: `hasBeenRated = true`, `rating = businessRating`.
     * Recalcular y actualizar promedios en `/businesses/{businessId}` y `/users/{businessId}`.
     * Recalcular y actualizar promedios en `/couriers/{courierId}` y `/users/{courierId}`.

### Prioridad P1 — Reputación del Motorizado en Detalle del Pedido
1. **[`OrderDetailScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt):**
   * Mostrar estrellas de reputación del motorizado (`★ 4.9 (120 entregas)`) obtenidas de `/couriers/{courierId}` de forma segura y sin exponer UIDs ni datos sensibles.

---

## 21. Regression Protection & Certification Gates

* **CUSTOMER:** Creación de pedido, visualización de historial, detalle de items, volver a pedir, tracking en vivo, calificación y favoritos 100% funcionales.
* **COURIER:** Asignación, ruta activa, confirmación de entrega y cierre financiero sin alteraciones ni regresiones.
* **MERCHANT:** Kanban, historial y facturación operan normalmente con `/orders`.
* **X→Y DELIVERY:** Flujo `/deliveryTrips` totalmente desacoplado e inmutable.
* **FINANCE & AUDIT:** Cero alteración en triggers de liquidación y eventos financieros.

---

## 22. Veredicto Forense Final

```text
============================================================
VEREDICTO FINAL DE AUDITORÍA FORENSE
============================================================

ROOT CAUSE:
1. Omisión de asignación del campo 'items' en parsePedidoManual() de Models.kt, provocando order.items = emptyList() y mostrando "Detalles de productos no especificados." en la interfaz.
2. Condición restrictiva en OrdersHistoryScreen.kt (L278) que solo evaluaba status == "delivered", ocultando el botón "Calificar ⭐" frente al estado real "completed" escrito por RutaActivaScreen.kt.
3. Intento de mutación cliente-servidor en OrdersViewModel.submitReview() rechazado por firestore.rules (PERMISSION_DENIED) al intentar actualizar perfiles ajenos y campos restringidos sin backend autoritativo.
4. Ausencia de proyección y agregación de calificaciones hacia el perfil del motorizado (/couriers/{courierId}).

FIRST DIVERGENCE:
1. En el parser: Models.kt:215 (omisión de items).
2. En la máquina de estados: RutaActivaScreen.kt:1073 (escritura directa de status = "completed" sin soporte en el condicional de OrdersHistoryScreen.kt).

AFFECTED MODULES:
- app/src/main/java/com/example/Models.kt
- app/src/main/java/com/example/presentation/customer/profile/OrdersHistoryScreen.kt
- app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt
- app/src/main/java/com/example/presentation/customer/profile/OrdersViewModel.kt
- app/src/main/java/com/example/presentation/customer/profile/OrderHistoryModels.kt
- functions/src/callables/ (o functions/src/triggers/ para reviews)

SAFE FIX:
1. Mapear 'items' resilientemente en parsePedidoManual() soportando 'productName' y 'name'.
2. Permitir calificación en OrdersHistoryScreen y OrderDetailScreen para status in ["delivered", "completed", "entregado", "completado"] cuando hasBeenRated sea false.
3. Implementar callable autoritativo en Cloud Functions (o actualización con permisos validados) para registrar la reseña y recalcular atómicamente los ratings agregados de comercio y motorizado.

DATABASE MUTATION: NO (Durante esta fase de diagnóstico)
SCHEMA CHANGE: NO
CODE MUTATION: NO (Durante esta fase de diagnóstico)
DEPLOYMENT: NO
REGRESSION RISK: LOW (Corrección puramente aditiva y quirúrgica)
CERTIFICATION: READY FOR PROPOSAL
============================================================
```
