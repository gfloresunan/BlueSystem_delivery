# 🛡️ INFORME FORENSE OFICIAL — FASE 4
## BSD-COURIER-OPERATIONAL-INTEGRITY-FORENSIC-004
**COURIER 360 OPERATIONAL INTEGRITY FORENSIC AUDIT**

- **Clasificación:** CRITICAL OPERATIONAL / COURIER EXPERIENCE / ORDER LIFECYCLE / ROLE ISOLATION
- **Modo:** 🔎 READ-ONLY / FORENSIC AUDIT ONLY (CERO MODIFICACIONES DE CÓDIGO)
- **Dominio:** `COMMERCE_DELIVERY` + `X_TO_Y_DELIVERY` + `COURIER FLEET CORE`
- **Fecha:** 2026-09-02
- **Auditor:** Senior Developer & Auditor Forense BlueSystem Enterprise

---

## 1. Executive Summary

Se ha ejecutado una auditoría forense 360° de ciclo de vida operacional sobre el módulo de Motorizados (Courier) de BlueSystem Delivery Enterprise v2.2. La evaluación abarcó desde el inicio de sesión y persistencia de rol, pasando por la recepción en la bolsa de órdenes, la aceptación y asignación atómica, el detalle del pedido, la navegación en ruta activa, el cobro de efectivo en destino, hasta la liquidación final, métricas de rendimiento y retención en custodia.

**Resultado Global:** Si bien la arquitectura núcleo de validación financiera (`FleetEligibilityEngine`), el enrutamiento (`routingService` / OSRM) y el ledger inmutable (`onOrderDelivered` / `financial_events`) se encuentran sólidamente estructurados, **se detectaron 5 vulnerabilidades operacionales críticas (P1) y 4 inconsistencias secundarias (P2/P3)** que impiden otorgar la certificación operacional limpia en este momento:
1. **Riesgo de Role Leakage vía Notificación FCM:** `MainActivity.kt` enruta notificaciones con `orderId` que no pertenezcan a la lista blanca de courier directamente a la pantalla de Customer (`Screen.OrderDetail.route`), permitiendo que el motorizado caiga en la UI del cliente.
2. **Riesgo de Role Leakage en Cold Start por Timeout de Red:** `SplashViewModel.kt` tiene un fallback `?: "customer"` si la resolución de rol tarda más de 3 segundos en baja cobertura celular.
3. **Race Condition / Mutual Overwrite en `aceptarPedido`:** `FirebaseManager.kt:796` no valida en la transacción si `assignedCourierId` ya está tomado por otro motorizado (a diferencia de `claimOrderAtomically` que sí lo hacía), permitiendo sobreescritura si dos couriers aceptan simultáneamente.
4. **Permisividad Excesiva en Reglas de Firestore:** `firestore.rules:647` permite que cualquier usuario con claim `isCourierOrDriver()` actualice órdenes ya asignadas a otro motorizado debido a una cláusula booleana desprotegida.
5. **Bypass de Restricciones Financieras en Panel Admin:** `opsTools.js` permite reasignar órdenes manualmente a couriers bloqueados financieramente o fuera de tenant sin validar sus balances.

Conforme a las reglas estrictas de certificación del protocolo, el dictamen oficial es **🔴 FAIL**, requiriéndose una fase quirúrgica de reparación para alcanzar la certificación verde.

---

## 2. Scope

- **Aplicación Android Courier:** Flujos de login, splash, dashboard, recepción en bolsa (pool), aceptación, ruta activa, cobro de efectivo, detalle y finanzas.
- **Backend & Cloud Functions:** Triggers de asignación, entrega y finanzas (`orders.ts`, `trips.ts`, `routingService.ts`).
- **Base de Datos & Seguridad:** Reglas de seguridad (`firestore.rules`), colecciones `/orders`, `/deliveryTrips`, `/courier_balances`, `/couriers`, `/users`.
- **Paneles Web:** Asignación manual en Merchant Web (`OrdersModule.tsx`) y Admin Web (`opsTools.js`, `courierCashControl.js`).

---

## 3. Files Audited

1. [`app/src/main/java/com/example/domain/engine/FleetEligibilityEngine.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/engine/FleetEligibilityEngine.kt)
2. [`app/src/main/java/com/example/FirebaseManager.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)
3. [`app/src/main/java/com/example/service/DeliveryFirebaseMessagingService.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/service/DeliveryFirebaseMessagingService.kt)
4. [`app/src/main/java/com/example/presentation/courier/CourierMainDashboardScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierMainDashboardScreen.kt)
5. [`app/src/main/java/com/example/presentation/courier/CourierOrderDetailScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierOrderDetailScreen.kt)
6. [`app/src/main/java/com/example/presentation/courier/CourierViewModel.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierViewModel.kt)
7. [`app/src/main/java/com/example/presentation/courier/MisPedidosCourierScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/MisPedidosCourierScreen.kt)
8. [`app/src/main/java/com/example/RutaActivaScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt)
9. [`app/src/main/java/com/example/PedidosEntrantesScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/PedidosEntrantesScreen.kt)
10. [`app/src/main/java/com/example/MainActivity.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt)
11. [`app/src/main/java/com/example/presentation/splash/SplashViewModel.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashViewModel.kt)
12. [`app/src/main/java/com/example/domain/engine/courier/PerformanceEngine.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/engine/courier/PerformanceEngine.kt)
13. [`functions/src/triggers/orders.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/orders.ts)
14. [`functions/src/triggers/trips.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/trips.ts)
15. [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules)
16. [`merchant-web/src/modules/OrdersModule.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/OrdersModule.tsx)
17. [`panel-admin/public/js/dashboard/opsTools.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/opsTools.js)

---

## 4. Architecture Map

```
                    ┌───────────────────────────────────────────────────────────┐
                    │                   COURIER IDENTITY GATE                  │
                    │   Firebase Auth UID + Custom Claims + /users + /couriers  │
                    └─────────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                        ┌───────────────────────────────────────────────────┐
                        │           FLEET ELIGIBILITY ENGINE                │
                        │  canReceiveNewOrders, cashOutstandingCents,       │
                        │  effectiveCashLimitCents, hasOverdueClosure       │
                        └─────────┬───────────────────────────────┬─────────┘
                                  │ ALLOW                         │ BLOCKED
                                  ▼                               ▼
                 ┌──────────────────────────────────┐   ┌───────────────────┐
                 │     FLEET ORDER POOL LISTENER    │   │  POOL SUPPRESSED  │
                 │  orders (ready) / deliveryTrips  │   │  (empty list)     │
                 └────────────────┬─────────────────┘   └───────────────────┘
                                  │
                                  ▼
                 ┌──────────────────────────────────┐
                 │    ATOMIC CLAIM / ACCEPT TRANSACTION    │
                 │    Firestore runTransaction      │
                 └────────────────┬─────────────────┘
                                  │
                                  ▼
                 ┌──────────────────────────────────┐
                 │      ORDER IN-ROUTE (PHASE 2)    │
                 │    RutaActivaScreen / OSRM GPS   │
                 └────────────────┬─────────────────┘
                                  │
                                  ▼
                 ┌──────────────────────────────────┐
                 │     CASH COLLECTION IN DESTINY   │
                 │  receivedAmount >= customerTotal │
                 └────────────────┬─────────────────┘
                                  │
                                  ▼
                 ┌──────────────────────────────────┐
                 │      COMPLETED & SETTLEMENT      │
                 │ onOrderDelivered / financial_events │
                 └──────────────────────────────────┘
```

---

## 5. Courier Identity Audit

- **Identificación Autoritativa:** El motorizado se identifica mediante su Firebase Auth UID (`authManager.currentUser?.uid`).
- **Almacenamiento de Rol:** Se almacena en Custom User Claims (`claims.role == "courier"` o `"driver"`) y se sincroniza en `/users/{uid}.role` y `/couriers/{uid}`.
- **Riesgo Identificado (BSD-C4-001):** En [`MainActivity.kt:986`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L986), cuando llega un Intent de notificación con `orderId`, la lógica no consulta el rol actual del usuario en sesión. Si el payload no contiene un `action` de la lista blanca de courier (`"COURIER_ASSIGNED"`, `"NEW_ORDER"`, etc.), la app ejecuta:
  ```kotlin
  orderId.isNotBlank() -> Screen.OrderDetail.createRoute(orderId)
  ```
  Esto envía al motorizado directamente a `com.example.presentation.customer.profile.OrderDetailScreen`. Y cuando el motorizado pulsa "Atrás", el botón ejecuta:
  ```kotlin
  navController.navigate("customer_dashboard?tab=3")
  ```
  provocando una **fuga de rol hacia la interfaz del cliente**.
- **Severidad:** 🔴 **P1 — RIESGO OPERACIONAL / ROLE LEAKAGE**.

---

## 6. State Machine Audit

Estados reales identificados en base de datos:
- `PENDING` / `pendiente`: Pedido creado en cliente.
- `PREPARING` / `preparando`: Comercio preparando orden.
- `READY` / `listo`: Disponible para motorizados en la bolsa.
- `ASSIGNED` / `asignado`: Asignado a un motorizado específico.
- `COURIER_ACCEPTED` / `aceptado_por_courier`: Motorizado confirmó recepción.
- `PICKED_UP` / `recogido`: Motorizado recogió paquete en tienda.
- `IN_TRANSIT` / `en_camino`: En desplazamiento vial hacia cliente.
- `DELIVERED` / `entregado`: Entregado físicamente al destinatario.
- `COMPLETED` / `completado`: Transacción monetaria y orden cerrada.
- `CANCELLED` / `cancelado`: Cancelado con justificación.

**Control de Estados:**
- El cliente sólo puede cancelar en `pending` o `preparing`.
- El comercio puede avanzar a `preparing` y `ready`.
- El motorizado es el único que transiciona de `ready` $\rightarrow$ `assigned/accepted` $\rightarrow$ `picked_up` $\rightarrow$ `in_transit` $\rightarrow$ `completed`.
- El backend (`orders.ts`) gobierna la liquidación en `completed/delivered`.

---

## 7. Order Assignment Audit

Se auditaron los 4 caminos de asignación:

| Camino | Origen | Validación Financiera | Aislamiento Tenant | Bloqueo Concurrencia |
| :--- | :--- | :---: | :---: | :---: |
| **Bolsa Automática (Pool)** | Android `obtenerFlujoPedidosCourier` | 🟢 Evaluada reactivamente | 🟢 Filtrado en query | 🟡 Vulnerable en `aceptarPedido` |
| **Manual por Comercio** | Merchant Web `OrdersModule.tsx` | 🟢 Bloqueo en transacción | 🟢 Validado en transacción | 🟢 Atómico (`runTransaction`) |
| **Soporte Admin** | Admin Web `opsTools.js` | 🔴 **OMITIDA (Bypass)** | 🔴 **OMITIDA (Bypass)** | 🔴 Update ciego sin lock |
| **Notificación Push (FCM)** | `DeliveryFirebaseMessagingService` | 🟢 Descartada si bloqueado | 🟢 Basado en device | N/A (Sólo alerta visual) |

---

## 8. Claim/Accept Audit & 9. Race Condition Audit

### Vulnerabilidad Crítica Detectada (BSD-C4-004)
Al comparar las dos funciones de asignación en `FirebaseManager.kt`:

1. En `claimOrderAtomically` (L110-115):
   ```kotlin
   val existingCourier = snapshot.getString("assignedCourierId") ?: snapshot.getString("motorizadoId")
   if (!existingCourier.isNullOrEmpty() && existingCourier != courierId) {
       return@runTransaction false // Lock Atómico: Segundo motorizado es rechazado
   }
   ```
2. **Pero en `aceptarPedido` (L796-827), que es la función invocada directamente por `CourierMainDashboardScreen.kt:428` al pulsar "Aceptar":**
   ```kotlin
   val orderSnap = transaction.get(orderDocRef)
   if (orderSnap.exists()) {
       val currentStatus = (orderSnap.getString("status") ?: "").lowercase()
       if (currentStatus !in listOf("ready", "listo", "assigned", "asignado", "courier_accepted")) {
           throw Exception("El pedido no está disponible...")
       }
       // ⚠️ FALTA COMPROBAR SI existingCourier != motorizadoId
       transaction.update(orderDocRef, mapOf(
           "status" to "courier_accepted",
           "assignedCourierId" to motorizadoId,
           ...
       ))
   }
   ```
**Simulación Concurrente:** Si Courier A y Courier B ven una orden en estado `ready` y ambos pulsan "Aceptar" con milisegundos de diferencia, la transacción del Courier B sobreescribe `assignedCourierId = Courier B` sin arrojar error, despojando al Courier A del pedido.
- **Severidad:** 🔴 **P1 — RACE CONDITION / MUTUAL OVERWRITE**.

---

## 10. Financial Eligibility Audit

- **Evaluación en Android:** `FleetEligibilityEngine.kt` valida estrictamente:
  `!courier.canReceiveNewOrders || courier.financialAccessState.startsWith("BLOCKED") || courier.hasOverdueClosure || (cashOutstandingCents >= effectiveCashLimitCents)`.
- **Evaluación en Bolsa:** Si no es elegible, el flujo en `FirebaseManager.kt:527` vacía la lista del pool a `emptyList()`.
- **Evaluación en FCM:** `DeliveryFirebaseMessagingService.kt:87` descarta la alarma sonora y la notificación si el courier está bloqueado.
- **Bypass Detectado:** `panel-admin/public/js/dashboard/opsTools.js:94` no verifica `canReceiveNewOrders` al reasignar manualmente (BSD-C4-006).

---

## 11. Multi-Tenant Audit

- **Garantía en Android:** `FleetEligibilityEngine.evaluateCityAndTenantEligibility` compara `courierTenantId == branchTenantId` y `courierCityId == branchCityId`.
- **Garantía en Comercio:** `OrdersModule.tsx:498` rechaza la asignación si `courierTenant !== orderTenant`.
- **Reglas de Seguridad Firestore:** `firestore.rules:600` exige `isCourierInSameTenantAndCity(resource.data)`.

---

## 12. FCM Audit

- `DeliveryFirebaseMessagingService.kt` utiliza deduplicación de eventos en ventana de 60 segundos por `eventKey = "${action}_$conversationId"`.
- Separa canales de notificación: `CHANNEL_ALARM_V3_ID` para ofertas y `CHANNEL_STATUS_ID` para actualizaciones.
- Comprueba caché local de balance antes de emitir sonido en `isIncomingOrder`.

---

## 13. Mis Pedidos Audit

- **Colecciones Consultadas:** `/orders` (por `assignedCourierId` y `motorizadoId`) y `/deliveryTrips` (por `assignedCourierId`).
- **Filtro:** Correctamente restringido al UID del motorizado.
- **Observación (BSD-C4-003):** No implementa `.limit(50)` ni paginación con `startAfter`. A largo plazo, un motorizado con cientos de entregas descargará todos sus documentos históricos en tiempo real, incrementando lecturas Firestore y consumo de memoria.
- **Severidad:** 🟡 **P2 — RENDIMIENTO Y COSTOS (ADR-003)**.

---

## 14. Order Detail & Order Identity Audit

- **Identidad Única:** El `orderId` emitido en la creación permanece inmutable durante todo el flujo.
- En `CourierMainDashboardScreen.kt`, al pulsar un pedido en "Mis Pedidos", se activa `selectedDetailOrderId = orderId` y se renderiza `CourierOrderDetailScreen(orderId = selectedDetailOrderId!!)`.
- No existe recreación de objetos ni mapeo por índice o posición.

---

## 15. Order Lifecycle & 16. Cash Collection Audit

- **Validación de Efectivo en Destino:** En `RutaActivaScreen.kt:756`:
  ```kotlin
  val isCashValid = (faseActual == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedAmount >= totalOrderState)
  ```
  Si el motorizado ingresa un monto inferior al total de la orden, el botón de confirmación se bloquea indicando cuánto efectivo falta.
- Al confirmar la entrega, se guardan en Firestore: `cashReceived`, `changeGiven` y `cashDiscrepancy`.

---

## 17. Earnings Integration Audit

- En `CourierOrderDetailScreen.kt`, se consume autoritativamente `courierTotalEarnings` si la orden está completada.
- **Inconsistencia Detectada (BSD-C4-005):** En [`CourierViewModel.kt:416`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierViewModel.kt#L416), la función de métricas `currentMetrics` suma:
  ```kotlin
  val totalEarned = if (delivered.isNotEmpty()) delivered.sumOf { it.gananciaRepartidor } else baseMetrics.totalEarningsAmount
  ```
  utilizando `it.gananciaRepartidor` (estimación preliminar pre-entrega) en lugar de `if (it.courierTotalEarnings > 0.0) it.courierTotalEarnings else it.gananciaRepartidor`.
- **Severidad:** 🟡 **P2 — INCONSISTENCIA DE MÉTRICAS OPERACIONALES**.

---

## 18. Performance Audit

- `PerformanceEngine.kt` opera como agregador en memoria para la sesión activa (`ShiftSession`).
- Se combina reactivamente con los pedidos entregados de `courierHistoryOrders`.
- Requiere alinear el campo de ganancias con el SSOT autoritativo.

---

## 19. Routing Integration Audit

- `RutaActivaScreen.kt` consume las coordenadas canónicas (`comercioLatLng` y `clienteLatLng`).
- Traza la ruta visual con Google Maps Polyline.
- La distancia vial y tiempo de viaje corresponden a los parámetros del motor OSRM certificado en la Fase 3.2.

---

## 20. Idempotency Audit

- En `orders.ts:845`, el trigger `onOrderDelivered` valida `${orderId}_ORDER_REVENUE` en `/financial_events`. Si el evento ya existe, se aborta la ejecución con retorno limpio, impidiendo doble cobro, doble ganancia y doble cargo en custodia.
- En `trips.ts:54`, se aplica idempotencia análoga con clave `trip_${tripId}_courier_collection`.

---

## 21. Reconnection & 22. Cold Start Audit

- **Reconexión:** Los snapshot listeners de Firestore en Android manejan automáticamente la pérdida temporal de señal celular, manteniendo el estado local en SQLite/Room y sincronizando al reanudar datos.
- **Cold Start Defect (BSD-C4-007):** En `SplashViewModel.kt:67`:
  ```kotlin
  val userType = withTimeoutOrNull(3000L) { obtenerTipoUsuarioUseCase(user.uid) } ?: "customer"
  ```
  Si el dispositivo experimenta latencia de red superior a 3 segundos al arrancar la app, el sistema asume que el motorizado es un `"customer"` y navega a `SolicitarEnvioScreen` (Customer Home).
- **Severidad:** 🔴 **P1 — ROLE LEAKAGE EN CONDICIONES DE MALA RED**.

---

## 23. Mock / QA Data Audit

- En `CourierMainDashboardScreen.kt:47`:
  `val motorizadoId = remember { authManager.currentUser?.uid ?: "usr_motorizado_123" }`
  Contiene un fallback hardcodeado (`"usr_motorizado_123"`) que debe eliminarse.
- En `RutaActivaScreen.kt:78`:
  `val isSimulated = remember(pedidoId) { pedidoId.startsWith("sim_") }`
  Bypass residual de simulador para IDs que comiencen con `"sim_"`.

---

## 24. UI Operational Audit

- Los botones de acción en `RutaActivaScreen.kt` respetan `clearFocus()` para que el teclado virtual no tape el botón de entrega.
- Los campos monetarios están protegidos contra valores nulos o caracteres alfabéticos.
- El scroll vertical está garantizado mediante `verticalScroll(rememberScrollState())`.

---

## 25. Root Cause Matrix

| ID | Hallazgo / Síntoma | Causa Raíz | Capa | Archivo y Línea | Severidad |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **BSD-C4-001** | Notificación FCM con `orderId` puede abrir pantalla de Cliente | Falta validación de rol del usuario actual en el switch de enrutamiento | Android Nav | `MainActivity.kt:986` | 🔴 **P1** |
| **BSD-C4-002** | Firestore Rules permite a cualquier courier modificar pedidos ajenos | Condición `isCourierOrDriver() \|\| ...` evalúa a true sin verificar `assignedCourierId` | Firestore Security | `firestore.rules:647` | 🔴 **P1** |
| **BSD-C4-004** | Race condition: dos couriers pueden sobreescribir la misma orden al aceptar | `aceptarPedido` en `FirebaseManager` no verifica si `assignedCourierId` ya está ocupado | Android DB | `FirebaseManager.kt:796` | 🔴 **P1** |
| **BSD-C4-006** | Admin Ops reasigna pedidos sin validar estado financiero del courier | `opsTools.js` ejecuta `update` directo sin comprobar balances ni tenant | Admin Web | `opsTools.js:94` | 🔴 **P1** |
| **BSD-C4-007** | Cold start con baja cobertura celular envía al courier a la pantalla de Cliente | Timeout de 3s en Splash hace fallback ciego a `"customer"` | Android Splash | `SplashViewModel.kt:67` | 🔴 **P1** |
| **BSD-C4-003** | Historial de órdenes de courier sin límite ni paginación | Queries en `obtenerHistorialCourier` no tienen `.limit()` | Android DB | `FirebaseManager.kt:722` | 🟡 **P2** |
| **BSD-C4-005** | Performance suma `gananciaRepartidor` estimada en lugar de `courierTotalEarnings` | Campo obsoleto en la reducción de `currentMetrics` | Android VM | `CourierViewModel.kt:416` | 🟡 **P2** |
| **BSD-C4-008** | Fallback de UID hardcodeado a `"usr_motorizado_123"` | Fallback local residual en `CourierMainDashboardScreen` | Android UI | `CourierMainDashboardScreen.kt:47` | 🟡 **P2** |
| **BSD-C4-009** | Bypass de persistencia si `pedidoId.startsWith("sim_")` | Branch de prueba residual en `RutaActivaScreen` | Android UI | `RutaActivaScreen.kt:78` | 🟢 **P3** |

---

## 26. Risk Matrix

| Riesgo | Probabilidad | Impacto | Nivel de Riesgo | Mitigación Requerida |
| :--- | :---: | :---: | :---: | :--- |
| Conflicto de asignación entre motorizados en hora pico | Media | Crítico | **ALTO** | Añadir lock de `existingCourier` en `aceptarPedido` |
| Desorientación del motorizado al abrir notificación (Role Leakage) | Media | Alto | **ALTO** | Role Guard en `MainActivity.handleNotificationIntent` |
| Asignación indebida de órdenes a couriers en mora desde Admin Web | Baja | Alto | **MEDIO** | Validar `canReceiveNewOrders` en `opsTools.js` |
| Acceso no autorizado de couriers a órdenes ajenas vía API | Baja | Alto | **MEDIO** | Restringir `firestore.rules` al courier asignado |

---

## 27. Evidence Matrix

| Control | Resultado | Evidencia Directa | Archivo | Línea |
| :--- | :---: | :--- | :--- | :---: |
| **1. Role Isolation** | 🔴 FAIL | `orderId.isNotBlank() -> Screen.OrderDetail.createRoute(orderId)` abre Customer | `MainActivity.kt` | 986 |
| **2. Session Identity** | 🟢 CONFIRMED | Autenticación basada en Firebase Auth UID | `MainActivity.kt` | 405 |
| **3. Order Pool** | 🟢 CONFIRMED | Queries filtradas por estado `ready` y `unassigned` | `FirebaseManager.kt` | 670 |
| **4. Order Assignment** | 🟢 CONFIRMED | Merchant Web valida finanzas y tenant atómicamente | `OrdersModule.tsx` | 475 |
| **5. Claim / Accept** | 🔴 FAIL | `aceptarPedido` omite check de `existingCourierId` | `FirebaseManager.kt` | 803 |
| **6. Race Conditions** | 🔴 FAIL | Segundo motorizado sobreescribe asignación sin error | `FirebaseManager.kt` | 820 |
| **7. Financial Eligibility** | 🟢 CONFIRMED | `FleetEligibilityEngine` bloquea bolsa si hay mora | `FleetEligibilityEngine.kt` | 92 |
| **8. Multi-Tenant Isolation** | 🟢 CONFIRMED | Comparación estricta de tenant en Android y Web | `OrdersModule.tsx` | 498 |
| **9. FCM Push Filter** | 🟢 CONFIRMED | `SUPPRESSED_INCOMING_ORDER_FCM` si hay bloqueo | `DeliveryFirebaseMessagingService.kt` | 88 |
| **10. Order Detail ID** | 🟢 CONFIRMED | ID inmutable pasado a `CourierOrderDetailScreen` | `CourierMainDashboardScreen.kt` | 466 |
| **11. Routing Integration**| 🟢 CONFIRMED | OSRM / Haversine 1.28 consumido con exactitud | `orders.ts` | 935 |
| **12. Cash Collection** | 🟢 CONFIRMED | Validación `receivedAmount >= totalOrderState` | `RutaActivaScreen.kt` | 756 |
| **13. Earnings Source** | 🟡 PARTIAL | Detalle usa autoritativo, pero Performance usa preliminar | `CourierViewModel.kt` | 416 |
| **14. Idempotency** | 🟢 CONFIRMED | Clave única `${orderId}_ORDER_REVENUE` en `financial_events` | `orders.ts` | 845 |
| **15. Cold Start** | 🔴 FAIL | Timeout de 3s degrada rol courier a `"customer"` | `SplashViewModel.kt` | 67 |

---

## 28. Required Surgical Repairs (Plan de Reparación Fase 5)

1. **Reparación 1 (`MainActivity.kt:986`):**
   Añadir guardia de rol en `handleNotificationIntent`: Si el usuario actual tiene rol de courier, navegar a `Screen.Courier.route` con selección de orden, nunca a `Screen.OrderDetail`.
2. **Reparación 2 (`FirebaseManager.kt:796`):**
   Integrar el lock atómico en `aceptarPedido`: Si `orderSnap.assignedCourierId` no es nulo/vacío y es distinto al motorizado actual, abortar transacción con excepción controlada.
3. **Reparación 3 (`firestore.rules:647`):**
   Ajustar la regla de update: Exigir que para actualizar estados operativos (`picked_up`, `in_transit`, `completed`), el `currentUid()` coincida estrictamente con `resource.data.assignedCourierId`.
4. **Reparación 4 (`SplashViewModel.kt:67`):**
   Reemplazar el fallback ciego `"customer"` por lectura de la caché local de sesión (`SharedPreferences` / `DataStore`), conservando el último rol autenticado del usuario.
5. **Reparación 5 (`opsTools.js:94`):**
   Verificar el estado financiero en `courier_balances/{courierId}` antes de permitir la reasignación en el panel administrativo.
6. **Reparación 6 (`CourierViewModel.kt:416`):**
   Unificar el campo de ganancias en `currentMetrics` para priorizar `courierTotalEarnings`.

---

## 29. Regression Risks

- La modificación de las Firestore Rules debe mantener intacto el permiso de reclamo inicial sobre órdenes en estado `ready` sin asignar.
- El ajuste de `SplashViewModel` debe garantizar que los usuarios invitados o nuevos clientes sigan accediendo a su experiencia natural sin bloqueos.

---

## 30. Certification Verdict

Conforme a las reglas obligatorias del Protocolo **BSD-COURIER-OPERATIONAL-INTEGRITY-FORENSIC-004**:
> *"🔴 FAIL: Si existe: bypass financiero, role leakage, double assignment, cross-tenant access, entrega sin asignación, earnings duplicados, estado operacional inconsistente, mock activo crítico, pérdida del orderId, FCM capaz de evadir restricciones."*

Habiéndose evidenciado objetivamente vulnerabilidades de **Role Leakage (BSD-C4-001 y BSD-C4-007)**, **Race Condition en Aceptación (BSD-C4-004)** y **Bypass Administrativo (BSD-C4-006)**:

# 🔴 BSD-COURIER-OPERATIONAL-INTEGRITY — FAIL

*(Se requiere la apertura de una Fase Quirúrgica de Reparación para subsanar los 5 hallazgos P1 antes de emitir la Certificación Operacional Definitiva).*
