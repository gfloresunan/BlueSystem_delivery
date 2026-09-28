# MER 18.2 — Mapeo de Cloud Functions del Comercio (Cloud Function Map)
**Auditoría Física E2E Integral — Módulo Comercio BlueSystem Delivery Enterprise**  
*Fecha: 14 de Septiembre de 2026*  
*Auditor: Senior Developer & Auditor Forense de BlueSystem*

---

## Inventario de Funciones Backend para Comercios

Este documento registra todas las Cloud Functions (Triggers de Firestore, Tareas Programadas y Métodos HTTP Callables) involucradas en la operación, ciclo de vida, contabilidad y notificaciones del módulo de comercios.

---

## 1. Triggers Reactivos de Firestore

### 1.1 `onBusinessLifecycleChanged`
- **Archivo de Origen**: `functions/src/triggers/businessLifecycle.ts` (o `index.ts`).
- **Evento**: `onWrite` sobre `/businesses/{businessId}`.
- **Propósito**: Detectar cambios críticos en la configuración del comercio, tales como:
  - Cambio en `isOpen`: Notificar a clientes con pedidos pendientes si el local cerró abruptamente.
  - Cambio en `isActive` o `isSuspended`: Revocar permisos operativos o despublicar la tienda en tiempo real.
  - Sincronización de índices de búsqueda geográfica (Geohash / Algolia si aplica).
- **Idempotencia**: Garantizada mediante verificación de hash de estado previo (`before.data()` vs `after.data()`).
- **Veredicto**: 🟢 **OPERATIVO & CONECTADO**.

### 1.2 `onOrderStateChangedForMerchant`
- **Archivo de Origen**: `functions/src/triggers/orders.ts`.
- **Evento**: `onUpdate` sobre `/orders/{orderId}`.
- **Propósito**:
  - Cuando un cliente genera una orden (`status == "PENDING"`), despacha de inmediato una notificación Push de alta prioridad (`priority: high`) con sonido continuo al dispositivo del comercio (`soundAlertsEnabled`).
  - Cuando el comercio acepta la orden (`status == "ACCEPTED"`), desencadena el algoritmo de búsqueda y elegibilidad de repartidores (`FleetEligibilityEngine`).
  - Cuando pasa a `READY`, notifica al courier asignado que el pedido está listo para recoger en mostrador.
- **Veredicto**: 🟢 **OPERATIVO & CONECTADO**.

### 1.3 `aggregateMerchantDailyKpi`
- **Archivo de Origen**: `functions/src/triggers/dashboardAggregation.ts`.
- **Evento**: `onUpdate` cuando `order.status == 'DELIVERED'` o cron nocturno.
- **Propósito**: Incrementar atómicamente (`FieldValue.increment`) los acumuladores en `/merchant_summaries/{businessId}` (ADR-003):
  - `todaySalesCents += order.subtotal`
  - `todayOrdersCount += 1`
  - `averageTicketCents = todaySalesCents / todayOrdersCount`
- **Veredicto**: 🟢 **OPERATIVO & CONECTADO**.

---

## 2. Métodos Callables (HTTPS OnCall)

### 2.1 Módulo de Liquidaciones Financieras (`merchantSettlement.ts` - ADR-019)

#### A. `adminGeneratePreSettlement`
- **Acceso / Rol Requerido**: `ADMIN` (Rechaza llamadas sin custom claim `admin: true`).
- **Parámetros**:
  - `businessId`: ID del comercio a liquidar.
  - `periodStart`: Timestamp de inicio del corte.
  - `periodEnd`: Timestamp de fin del corte.
- **Lógica**: Lee todas las órdenes finalizadas (`status == 'DELIVERED'`) no liquidadas en el rango, calcula comisiones contractuales en centavos enteros y crea el documento en `/merchant_settlements` con estado `GENERATED`.
- **Invocador**: `panel-admin` (`financeCenter.js`).

#### B. `merchantConfirmSettlement`
- **Acceso / Rol Requerido**: `COMERCIO` (Valida que `context.auth.uid == settlement.businessId`).
- **Parámetros**:
  - `settlementId`: ID de la liquidación en `/merchant_settlements`.
- **Lógica**: Cambia el estado a `CONFIRMED`, congela el documento (`isFrozen = true`), sella la inmutabilidad y añade entrada al array de auditoría `history`.
- **Invocador**: APK Android (`MerchantFinanceViewModel.kt`) y `merchant-web` (`FinanceModule.tsx`).
- **Veredicto**: 🟢 **CERTIFICADO E2E**.

#### C. `merchantDisputeSettlement`
- **Acceso / Rol Requerido**: `COMERCIO` (Valida pertenencia de `businessId`).
- **Parámetros**:
  - `settlementId`: ID de la liquidación.
  - `reason`: Justificación formal de la discrepancia (mínimo 10 caracteres).
- **Lógica**: Cambia el estado a `DISPUTED`, bloquea el pago unilateral, registra la justificación y envía alerta a los administradores.
- **Invocador**: APK Android (`MerchantFinanceViewModel.kt`) y `merchant-web`.
- **Veredicto**: 🟢 **CERTIFICADO E2E**.

#### D. `adminRecordSettlementPayment`
- **Acceso / Rol Requerido**: `ADMIN`.
- **Parámetros**: `settlementId`, `paymentReference`, `paymentReceiptUrl`, `amountCents`.
- **Lógica**: Valida que el monto coincida exactamente con `netPayoutCents`, pasa a `PAID`, encola notificación en `/notification_campaigns` y despacha email vía `EmailService`.
- **Invocador**: `panel-admin` (`financeCenter.js`).

---

## 3. Matriz de Conexión de Cloud Functions vs APK Comercio

| Cloud Function | ¿Llamada desde APK Android? | ¿Llamada desde Merchant Web? | ¿Llamada desde Admin Panel? | Estado de Conexión E2E |
|---|:---:|:---:|:---:|:---:|
| `onBusinessLifecycleChanged` | Automático (por trigger) | Automático | Automático | 🟢 Funcional |
| `onOrderStateChangedForMerchant` | Automático (por trigger) | Automático | Automático | 🟢 Funcional |
| `aggregateMerchantDailyKpi` | Automático (por trigger) | Automático | Automático | 🟢 Funcional |
| `merchantConfirmSettlement` | **SÍ (`MerchantFinanceViewModel`)** | **SÍ** | N/A | 🟢 **CERTIFIED** |
| `merchantDisputeSettlement` | **SÍ (`MerchantFinanceViewModel`)** | **SÍ** | N/A | 🟢 **CERTIFIED** |
| `adminGeneratePreSettlement` | N/A (Solo Admin) | N/A | **SÍ** | 🟢 Funcional |
| `adminRecordSettlementPayment`| N/A (Solo Admin) | N/A | **SÍ** | 🟢 Funcional |
| `merchantPublishMenu` | **NO (Inexistente)** | **NO** | N/A | 🔴 **FALTA BACKEND (`GAP-003`)** |
| `merchantInviteStaffMember` | **NO (Inexistente)** | **SÍ (Web)** | **SÍ** | 🔴 **DESCONECTADO EN APK (`GAP-008`)** |

---

## Diagnóstico del Vacío en Publicación de Menú (`GAP-003`)

En `ProductWorkspaceScreen.kt` (Líneas 140-155), el botón "Publicar" pretende "publicar los cambios del menú para que los clientes vean la nueva versión". Sin embargo:
1. No existe ninguna Cloud Function `publishMenuChanges` ni `invalidateMenuCache`.
2. El botón en la APK ejecuta simplemente:
   ```kotlin
   // ProductWorkspaceScreen.kt L:145
   scope.launch {
       isPublishing = true
       delay(400)
       pendingChangesCount = 0
       isPublishing = false
       snackbarHostState.showSnackbar("Menú publicado con éxito")
   }
   ```
3. Esto crea una falsa ilusión operativa: el usuario cree que hubo una publicación en servidor, cuando en realidad no ocurrió ninguna llamada de red ni cambio de versión (`menuVersion`) en Firestore.
