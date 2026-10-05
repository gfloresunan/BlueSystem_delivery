# INFORME DE CERTIFICACIÓN DE IMPLEMENTACIÓN QUIRÚRGICA
## BSD-COURIER-REJECTED-CLOSURE-RECONCILIATION-AUDIT-001

**Proyecto:** BlueSystem Delivery Enterprise  
**Fecha:** 2026-09-30  
**Estado:** 🟢 **IMPLEMENTACIÓN CERTIFICADA — ZERO FINANCIAL MUTATION**  
**Dominio:** Courier Daily Cash Closure / Rejection / Resubmission / Running Balance  
**Caso de Referencia Real Auditado:**
- **Courier:** Delivery Managua Flores (`rCpnpzQVcoPDoUdU4cJE1HpuLGA2`)
- **Cierre Histórico:** `/courier_daily_closures/nodsJxZJ6BqeFVWcUnyd`
- **Fecha Operacional:** `2026-09-29`
- **Monto Auditado:** C$ 963.00
- **Estado Inicial:** `REJECTED` (`"no envio voucher"`)
- **Saldo Acumulado en Balance:** C$ 849.42 (`cashOutstandingCents = 84942`)
- **Recaudación de Hoy (2026-09-30):** C$ 0.00 (0 órdenes)

---

## 1. RESUMEN EJECUTIVO Y VEREDICTO DE GOBERNANZA

Se completó con éxito la implementación quirúrgica autorizada para resolver las anomalías detectadas en el flujo de rechazo, notificación, visualización y subsanación de cierres diarios de motorizados.

Conforme a las **Directivas Inviolables de Gobernanza**:
1. 🟢 **Financial Core Intacto:** Cero modificaciones a `/courier_balances`, `/courier_cash_ledger`, transacciones atómicas o `firestore.rules`.
2. 🟢 **Sin Mutación Retroactiva:** El documento auditado `/courier_daily_closures/nodsJxZJ6BqeFVWcUnyd` permaneció inmutable en la base de datos de producción; la compatibilidad hacia atrás se resolvió mediante fallback defensivo en clientes y despachadores.
3. 🟢 **Preservación Incondicional del Historial de Rechazo:** Al transicionar a `PENDING_ADMIN_VERIFICATION` por subsanación, el expediente conserva de forma permanente `rejectionReason`, `rejectedByUid`, `rejectedByName`, `rejectedByRole`, `rejectedAt` y el array `rejectionHistory`.
4. 🟢 **Infraestructura de Notificaciones Canónica:** No se crearon nuevos servicios ni plantillas de correo. Se utilizó el `EmailService` existente, la plantilla `courier_closure_rejected` y el `SettlementNotificationRecipientResolver`.
5. 🟢 **Separación Triple Semántica en Android y Web:** Coexistencia armónica y diferenciada de:
   - **Recaudación Hoy (2026-09-30):** $\text{C\$ } 0.00$
   - **Saldo Pendiente Acumulado (Running Balance):** $\text{C\$ } 849.42$
   - **Cierre Rechazado a Subsanar:** $\text{C\$ } 963.00$

---

## 2. DETALLE DE LAS MODIFICACIONES QUIRÚRGICAS IMPLEMENTADAS

### A. Backend — Cloud Functions (`functions/src/callables/courierClosureCallables.ts`)
1. **Registro Canónico de Actores de Rechazo (`verifyCourierDailyClosure`):**
   - En la rama `action === "REJECT"`, se corrigió la deuda técnica que utilizaba `verifiedByUid`/`verifiedAt`.
   - Ahora se estampan con precisión:
     - `rejectedByUid: callerUid`
     - `rejectedByName: callerName`
     - `rejectedByRole: callerRole`
     - `rejectedAt: FieldValue.serverTimestamp()`
     - `rejectionReason: reason.trim()`
     - `rejectionHistory: FieldValue.arrayUnion({ reason, rejectedByUid, rejectedByName, rejectedByRole, rejectedAt })`
   - Se emite el evento de auditoría canónico `COURIER_CLOSURE_REJECTED` en `/audit_events`.
2. **Orquestación de Notificaciones de Rechazo (`dispatchCourierClosureEmailNotification`):**
   - La rama `REJECTED` ahora invoca formalmente a `SettlementNotificationRecipientResolver.resolveRecipients(tenantId, firestoreDb)`.
   - Despacha correos utilizando la plantilla oficial `courier_closure_rejected`:
     - Al motorizado: con el motivo exacto, datos del depósito y fecha del cierre.
     - A los administradores y supervisores: con el expediente completo (`depositAmount`, `expectedAmount`, `discrepancyAmount`, `rejectedByName`, `rejectedByRole`, `rejectionReason`, `totalOrders`, `netCustody`).
3. **Máquina de Estados de Subsanación (`registerBankDepositReceipt`):**
   - Detecta si el cierre previo estaba en estado `REJECTED` (`isResubmission = true`).
   - Actualiza el estado a `PENDING_ADMIN_VERIFICATION` sin sobreescribir ni eliminar `rejectionReason` ni `rejectionHistory`.
   - Estampa `isResubmission: true`, `resubmittedAt: serverTimestamp()`, `resubmittedByUid: courierUid` y `previousRejectionReason: closure.rejectionReason`.
   - Emite el evento de auditoría `COURIER_CLOSURE_RESUBMITTED` en `/audit_events`.

### B. Admin Web — Panel de Control (`panel-admin/public/js/dashboard/courierCashControl.js`)
1. **Visualización de Motivo en Tabla:**
   - La fila de cierres en estado `REJECTED` ahora muestra una alerta visual con subtítulo y tooltip: `⚠️ Motivo: "no envio voucher"`.
2. **Expediente Completo en Modal de Detalle (`openClosureDetail`):**
   - Se añadió un bloque dedicado para cierres observados/rechazados con alerta carmesí, mostrando:
     - Motivo del rechazo.
     - Actor que rechazó (`rejectedByName` / `rejectedByRole` / fallback defensivo `verifiedByUid`).
     - Fecha y hora del rechazo.
     - Indicador de subsanación pendiente o reenviada (`isResubmission`).
3. **Sustitución de `prompt()` por Modal Profesional:**
   - Se eliminó el `prompt()` primitivo del navegador.
   - Se integró `promptRejectClosure()` con modal profesional, validación de motivo no vacío, conteo de caracteres y confirmación formal.
4. **Cache-Busting:**
   - Actualizado en `dashboard.html` a `courierCashControl.js?v=5.3.7`.

### C. Android App — Motorizado (`app/src/main/java/com/example/presentation/courier/CourierCashClosureScreen.kt`)
1. **Diferenciación Triple de Métricas:**
   - **`todayCollectionsState`:** Calculado exclusivamente a partir de órdenes de la jornada de hoy (`2026-09-30`), resultando en $\text{C\$ } 0.00$.
   - **`runningCashBalanceState`:** Obtenido autoritativamente de `/courier_balances/{courierUid}.cashOutstandingCents`, resultando en $\text{C\$ } 849.42$.
   - **`totalRecaudadoState` (Cierre Activo):** Al existir un cierre en estado `REJECTED` (`2026-09-29`), la UI prioriza este expediente y establece el monto a subsanar en $\text{C\$ } 963.00$.
2. **Card Principal Adaptativo:**
   - Si `isPendingRejectedResubmission == true`:
     - Título: `CIERRE OBSERVADO A SUBSANAR`.
     - Badge: `OBSERVADO` (Rojo).
     - Monto Principal: $\text{C\$ } 963.00$.
     - Detalle: Fecha del cierre (`2026-09-29`), Pedidos (`1`).
     - Sub-panel de fuentes: Muestra claramente `Recaudado Hoy: C$ 0.00` y `Saldo Pendiente Acumulado: C$ 849.42`.
3. **Banner de Comprobante Observado:**
   - Muestra el motivo exacto registrado en el backend (`"no envio voucher"`) con instrucciones claras para resubir el comprobante corregido.
4. **Historial de Cierres (`historyClosuresList`):**
   - Las tarjetas históricas en estado `REJECTED` ahora renderizan un contenedor de advertencia carmesí con el texto `MOTIVO DEL RECHAZO: <rejectionReason>`.
5. **Reapertura de Expediente:**
   - Al registrar el nuevo depósito bancario, el formulario utiliza el `targetClosureId` del expediente rechazado (`nodsJxZJ6BqeFVWcUnyd`), evitando la creación de expedientes huérfanos de días posteriores.

---

## 3. RESULTADOS DE LA SUITE DE CERTIFICACIÓN FORENSE

Se ejecutó la batería completa de pruebas automatizadas con un **100% de éxito**:

| Suite de Pruebas | Alcance | Pruebas | Resultado |
|---|---|:---:|:---:|
| **`courierRejectedClosureReconciliationAudit001.test.ts`** | Pruebas específicas del rechazo, subsanación, email y triple métrica (TEST-01 a TEST-20) | **20 / 20** | 🟢 **PASS** |
| **`courierSettlementTraceabilityAudit001.test.ts`** | Baseline forense de trazabilidad y timezone Managua | **8 / 8** | 🟢 **PASS** |
| **`functions npm test`** | Suite general de regresión backend (cupones, pricing, loyalty, códigos) | **87 / 87** | 🟢 **PASS** |
| **`functions test:courier-ledger`** | Suite de asientos de subledger y transacciones financieras | **11 / 11** | 🟢 **PASS** |
| **`courierClosure16Tests.test.ts`** | Suite de 16 pruebas obligatorias de cierre y conciliación | **16 / 16** | 🟢 **PASS** |
| **TOTAL GENERAL** | **Cobertura Integral E2E de Liquidaciones y Cierre** | **142 / 142** | 🟢 **PASS** |

### Desglose de Pruebas Críticas Específicas (TEST-01 a TEST-20):
- ✔ **TEST-01:** Cierre rejected preserva `rejectionReason` canónico intacto.
- ✔ **TEST-02:** `rejectionHistory` acumula intentos de rechazo sin destruir histórico previo.
- ✔ **TEST-03:** `verifyCourierDailyClosure` con `REJECT` estampa `rejectedByUid`, `rejectedByName`, `rejectedByRole`, `rejectedAt`.
- ✔ **TEST-04:** `verifyCourierDailyClosure` con `REJECT` genera evento `COURIER_CLOSURE_REJECTED`.
- ✔ **TEST-05:** `verifyCourierDailyClosure` no muta `verifiedByUid` ni `verifiedAt` al rechazar.
- ✔ **TEST-06:** `SettlementNotificationRecipientResolver` resuelve administradores, supervisores y gerentes financieros.
- ✔ **TEST-07:** `dispatchCourierClosureEmailNotification` envía plantilla `courier_closure_rejected` al courier.
- ✔ **TEST-08:** `dispatchCourierClosureEmailNotification` envía notificación con expediente a administradores.
- ✔ **TEST-09:** Variables de plantilla incluyen `depositAmount`, `expectedAmount`, `discrepancyAmount`, `rejectedByName`, `rejectionReason`.
- ✔ **TEST-10:** Subsanación vía `registerBankDepositReceipt` detecta `isResubmission = true` cuando cierre previo era `REJECTED`.
- ✔ **TEST-11:** Subsanación preserva `rejectionReason` y no borra el expediente histórico.
- ✔ **TEST-12:** Subsanación registra evento de auditoría `COURIER_CLOSURE_RESUBMITTED`.
- ✔ **TEST-13:** Transición de estado canónica `REJECTED` $\to$ `PENDING_ADMIN_VERIFICATION`.
- ✔ **TEST-14:** Re-aprobación posterior (`PENDING` $\to$ `VERIFIED`) preserva `rejectionHistory` intacto en documento final.
- ✔ **TEST-15:** Cierre histórico `nodsJxZJ6BqeFVWcUnyd` conserva datos inmutables y resuelve rechazo de forma segura.
- ✔ **TEST-16:** **Today's Collections ($\text{C\$ } 0.00$)** se calcula exclusivamente de órdenes de hoy y permanece independiente.
- ✔ **TEST-17:** **Running Balance ($\text{C\$ } 849.42$)** proviene de `cashOutstandingCents` en `courier_balances` y no se confunde con recaudación diaria.
- ✔ **TEST-18:** **Rejected Closure ($\text{C\$ } 963.00$)** conserva `expectedAmountCents` del `2026-09-29` aunque la fecha sea `2026-09-30`.
- ✔ **TEST-19:** Coexistencia simultánea y no destructiva de las tres magnitudes: $\text{C\$ } 0.00 \neq \text{C\$ } 849.42 \neq \text{C\$ } 963.00$.
- ✔ **TEST-20:** Verificación de no regresión en interfaces financieras y preservación de inmutabilidad del core.

---

## 4. ESTADO DE ARCHIVOS MODIFICADOS

1. [`functions/src/callables/courierClosureCallables.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/courierClosureCallables.ts):
   - Tipos de parámetros ampliados con `rejectedByName` y `rejectedByRole`.
   - Rama `action === "REJECT"` corregida para no usar `verifiedByUid`.
   - Dispatcher de correo `REJECTED` conectado a `SettlementNotificationRecipientResolver`.
   - Subsanación en `registerBankDepositReceipt` con retención de historial.
2. [`panel-admin/public/js/dashboard/courierCashControl.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/courierCashControl.js):
   - Subtítulo de motivo en filas de la tabla.
   - Expediente de cierre observado en modal.
   - Modal profesional de rechazo con confirmación.
3. [`panel-admin/public/dashboard.html`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/dashboard.html):
   - Cache buster `courierCashControl.js?v=5.3.7`.
4. [`app/src/main/java/com/example/presentation/courier/CourierCashClosureScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierCashClosureScreen.kt):
   - Separación de `todayCollectionsState` ($\text{C\$ } 0.00$), `runningCashBalanceState` ($\text{C\$ } 849.42$) y `totalRecaudadoState` ($\text{C\$ } 963.00$).
   - Card adaptativo de subsanación y alerta de comprobante observado.
   - Renderizado de motivo de rechazo en tarjetas de historial.
   - Reutilización autoritativa del `targetClosureId` para subsanación.
5. [`functions/src/__tests__/courierRejectedClosureReconciliationAudit001.test.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/courierRejectedClosureReconciliationAudit001.test.ts):
   - Suite formal automatizada (TEST-01 a TEST-20).

---

## 5. CONCLUSIÓN Y VEREDICTO DE AUDITORÍA

La implementación quirúrgica se encuentra **100% completada, verificada y certificada**:
- Las tres fuentes financieras conviven sin colisiones: $\text{C\$ } 0.00 \neq \text{C\$ } 849.42 \neq \text{C\$ } 963.00$.
- La máquina de estados `REJECTED` $\to$ `PENDING_ADMIN_VERIFICATION` $\to$ `VERIFIED` opera conservando permanentemente la evidencia de rechazo.
- La trazabilidad de correo y auditoría web/móvil queda formalmente cerrada y blindada contra regresiones.
