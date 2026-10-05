# BSD-COURIER-SETTLEMENT-FINANCIAL-AUDIT-REPORT

**Auditoría Forense Integral de Liquidaciones / Conciliaciones de Motorizados**  
**Protocolo:** BSD-COURIER-SETTLEMENT-FINANCIAL-AUDIT-001  
**Agente Auditor:** GRAVE (Senior Developer & Auditor de BlueSystem)  
**Plataforma:** BlueSystem Delivery Enterprise v2.2 / v2.3  
**Fecha de Ejecución:** 2026-09-29  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Modo:** READ-ONLY / AUDIT-FIRST / ZERO MUTATION  

---

## 1. Executive Summary

| Dimensión | Estado Evaluado | Veredicto Forense |
| :--- | :---: | :--- |
| **Integridad del Ledger & Custodia de Efectivo** | 🟢 | Canónico, inmutable y atómico en `/courier_cash_ledger` y `/courier_balances`. |
| **Flujo de Cierre y Depósito Bancario Courier** | 🟢 | Implementado y certificado bajo ADR-018 (`CourierCashClosureScreen.kt`). |
| **Aprobación & Conciliación Admin Web** | 🟢 | Operativo vía callable server-authoritative `verifyCourierDailyClosure`. |
| **Generación de Acta Oficial PDF** | 🟡 | Generación vectorial funcional (`jsPDF` / `PdfDocument`), pero **carece de desglose línea por línea de pedidos**. |
| **Auditoría Móvil (Admin Mobile)** | 🔴 | `AdminCourierCashCenterScreen.kt` intenta escrituras directas de cliente bloqueadas por Firestore Rules (`PERMISSION_DENIED`). |
| **Notificaciones Push / In-App al Admin** | 🔴 | **Completamente ausente**. No se encola notificación ni se alerta a Administradores. |
| **Email Transaccional Corporativo** | 🔴 | **Completamente ausente**. `EmailService` no posee plantilla ni disparador para cierres de motorizados. |
| **Resolución Dinámica de Destinatarios** | 🔴 | **Inexistente**. No existe configuración por rol ni por usuario en base de datos ni interfaz. |
| **Aislamiento Multi-Tenant** | ⚠️ | Fuga de lectura en Firestore Rules (`isBusinessAdmin` puede leer) y falta `tenantId` en esquema de cierre. |

**Veredicto General:** 🟡 **PARTIAL / INCONSISTENT (Cadena Transaccional Central Sólida, pero con Brecha Total en Notificaciones, Correo, Consola Móvil y Aislamiento Multi-Tenant)**.

---

## 2. Current Architecture (Flujo Real Encontrado)

El sistema implementa dos flujos de liquidación para motorizados:
1. **Cierre Diario + Depósito Bancario (Flujo Digital Móvil - ADR-018):** El motorizado deposita en el banco el efectivo recaudado de su jornada y sube el voucher para verificación del supervisor.
2. **Arqueo Físico en Mesa (Flujo Presencial - ADR-018):** El motorizado entrega el dinero en efectivo directamente al supervisor en la oficina/base.

```
                                  MAPA DE LA ARQUITECTURA REAL
                                  
     [ /orders (Delivered) ]                [ /deliveryTrips (Completed) ]
        (Commerce Delivery)                       (X→Y Express)
                │                                       │
                ▼                                       ▼
      [ orders.ts (Trigger) ]                 [ trips.ts (Trigger) ]
                │                                       │
                └───────────────────┬───────────────────┘
                                    │
                       (Compensación Determinista)
                                    │
                                    ▼
                     [ /courier_cash_ledger ] (Subledger Inmutable)
                     - eventType: ORDER_CASH_COLLECTED / TRIP_CASH_COLLECTED
                     - direction: CREDIT (Aumenta pasivo bajo custodia)
                     - amountCents (Total cobrado en efectivo)
                     - compensatedCents (Ganancias retenidas en caliente)
                     - netCustodyCents (Deuda neta entregable a la empresa)
                                    │
                                    ▼
                     [ /courier_balances/{courierId} ] (Balance Vivo)
                     - cashOutstandingCents (Custodia viva acumulada)
                     - courierPayableBalanceCents (Ganancias pendientes)
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼ (Flujo Depósito Bancario Móvil)                       ▼ (Flujo Arqueo Mesa)
 [ CourierCashClosureScreen.kt ]                         [ executeCourierSettlement ]
        │                                                       │
        ├─► initiateCourierDailyClosure()                       ├─► Asiento CASH_HANDOVER (DEBIT)
        │     └─► Doc en /courier_daily_closures (status: OPEN) │     en /courier_cash_ledger
        │                                                       │
        ├─► Subida Voucher a Firebase Storage                   ├─► Actualiza /courier_balances
        │     └─► courier_closures/{uid}/{closureId}/...        │     (Decrementa cashOutstandingCents)
        │                                                       │
        └─► registerBankDepositReceipt()                        └─► Doc en /courier_settlements
              └─► status: PENDING_ADMIN_VERIFICATION                  - status: SETTLED / DISCREPANCY
              └─► /audit_events: BANK_DEPOSIT_RECEIPT_REGISTERED
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
         [ RUPTURA FORENSE:              [ RUPTURA FORENSE:
           ZERO ADMIN NOTIFICATION ]       ZERO CORPORATE EMAIL ]
           - No entra a notification_      - EmailService no llamado
             campaigns                     - No existe template
           - No FCM ni In-App              - No destinatarios
                   │                                 │
                   └────────────────┬────────────────┘
                                    │
                                    ▼
             [ Panel Admin Web: courierCashControl.js ]
             - Listener onSnapshot sobre /courier_daily_closures
             - Supervisor inspecciona comprobante y llama a:
                                    │
                                    ▼
             [ Callable: verifyCourierDailyClosure() ]
             - action == 'VERIFY'
             - Genera officialAct inmutable (actNumber + verificationCode)
             - Asiento en /courier_cash_ledger: BANK_DEPOSIT_SETTLED (DEBIT)
             - Actualiza /courier_balances: cashOutstandingCents -= depositAmountCents
             - Actualiza /courier_daily_closures: status = VERIFIED
             - Evento en /audit_events: COURIER_CLOSURE_VERIFIED
             - Generación y descarga de Acta Oficial PDF (jsPDF + AutoTable)
```

---

## 3. Settlement Lifecycle (Ciclo de Vida Canónico)

La máquina de estados del cierre diario en `/courier_daily_closures` transita de la siguiente manera:

1. **`OPEN`**: Iniciado por el motorizado (o supervisor) mediante `initiateCourierDailyClosure`. Congela los asientos de la fecha operacional, calculando `expectedAmountCents`, `ordersCount`, `includedOrderIds` e `includedTripIds`.
2. **`PENDING_ADMIN_VERIFICATION`**: El motorizado consignó el depósito en el banco y subió el comprobante mediante `registerBankDepositReceipt`. Su balance en `/courier_balances` pasa a `status: "PENDING_AUDIT"`.
3. **`VERIFIED`**: El supervisor aprueba en Admin Web mediante `verifyCourierDailyClosure(action: "VERIFY")`. Se emite el acta oficial, se descarga el saldo deudor de custodia y se restaura el cupo de efectivo.
4. **`REJECTED`**: El supervisor rechaza el comprobante con motivo obligatorio (`rejectionReason`). No se descarga el balance y el motorizado debe reintentar o aclarar la discrepancia.
5. **`DISCREPANCY`**: Estado registrado cuando el monto contado o depositado no coincide con lo esperado (`depositDiscrepancyCents !== 0` o `differenceCents !== 0`).

---

## 4. Financial Model (Modelo Matemático y Reglas de Custodia)

### A. Compensación Determinista en Caliente (Zero Deuda Injusta)
Implementado en `functions/src/triggers/orders.ts` (líneas 1712-1773) y `trips.ts` (líneas 198-249):

$$\text{cashCollectedNetCents} = \max(0, \text{cashReceivedCents} - \text{changeGivenCents})$$
$$\text{totalPayableToCourierCents} = \text{currentPayableBalanceCents} + \text{courierTotalEarningsCents}$$
$$\text{compensationCents} = \min(\text{cashCollectedNetCents}, \text{totalPayableToCourierCents})$$
$$\text{netCustodyIncrementCents} = \max(0, \text{cashCollectedNetCents} - \text{compensationCents})$$
$$\text{remainingPayableCents} = \text{totalPayableToCourierCents} - \text{compensationCents}$$

*   **¿Qué significa en la práctica?**  
    El motorizado **retiene sus ganancias inmediatamente del efectivo que cobra**. Únicamente adeuda y debe depositar a la empresa el saldo neto resultante ($\text{netCustodyIncrementCents}$).
*   **Desglose de Ganancias del Motorizado:**
    *   $\text{distanceEarningsCents}$: Tarifa base + tarifa por km recorrido (calculado autoritativamente por ruteador GPS).
    *   $\text{bonusEarningsCents}$: Bono fijo por pedido.
    *   $\text{tipEarningsCents}$: Propinas del cliente (100% íntegras del repartidor).
    *   $\text{courierTotalEarningsCents} = \text{distanceEarnings} + \text{bonusEarnings} + \text{tipEarnings}$.

### B. Conciliación de 4 Capas (ADR-018)
1.  **Capa 1: Recaudación Esperada (`expectedAmountCents`):** Suma algebraica de los asientos `ORDER_CASH_COLLECTED` y `TRIP_CASH_COLLECTED` menos compensaciones de la jornada en `/courier_cash_ledger`.
2.  **Capa 2: Arqueo en Mesa (`countedAmountCents`):** Dinero físico contado presencialmente ante un supervisor (si aplica).
3.  **Capa 3: Depósito Bancario (`bankDeposit.depositAmountCents`):** Monto reportado según la boleta/transferencia bancaria.
    $$\text{depositDiscrepancyCents} = \text{depositAmountCents} - \text{baseCountedCents}$$
4.  **Capa 4: Liquidación & Verificación Administrativa (`settledAmountCents`):**
    Asiento `DEBIT` en subledger por el monto validado. Actualización atómica en `/courier_balances`:
    $$\text{cashOutstandingCents}_{\text{nuevo}} = \text{cashOutstandingCents}_{\text{anterior}} - \text{depositAmountCents}$$

---

## 5. Firestore Evidence (Colecciones, Esquemas y Documentos)

### 5.1 `/courier_daily_closures/{closureId}`
*   **Quién escribe:** Exclusivamente Cloud Functions (Admin SDK vía Callables). Prohibida escritura directa en `firestore.rules`.
*   **Quién lee:** Courier titular (`auth.uid == courierId`), Administradores (`isPlatformAdmin()`), Supervisores (`isSupervisor()`) y Business Admins (`isBusinessAdmin()`).
*   **Campos clave:**
    ```typescript
    {
      closureId: string,                  // ID canónico del documento
      closureOperationId: string,         // Idempotency key (UUID cliente)
      courierId: string,                  // UID del motorizado
      courierName: string,                // Nombre real canónico (ej. "Henry Paz")
      businessDate: string,               // YYYY-MM-DD
      status: "OPEN" | "PENDING_ADMIN_VERIFICATION" | "VERIFIED" | "REJECTED" | "DISCREPANCY",
      expectedAmountCents: number,        // Total esperado en centavos (NIO)
      totalCashCollectedCents: number,    // Bruto cobrado
      totalCompensatedCents: number,      // Ganancias retenidas
      totalEarningsCents: number,         // Ganancias totales del día
      ordersCount: number,                // Cantidad de pedidos/trips
      includedOrderIds: string[],         // Array de IDs de pedidos de comercio
      includedTripIds: string[],          // Array de IDs de encomiendas X→Y
      bankDeposit?: {
        bankDepositId: string,
        bankName: string,                 // "BAC Credomatic", "Banco LAFISE", etc.
        bankReference: string,            // No. de transacción / transferencia
        depositAmountCents: number,       // Monto depositado
        depositDiscrepancyCents: number,  // Diferencia vs lo esperado
        receiptStoragePath: string,       // Ruta en Cloud Storage
        receiptDownloadUrl: string,       // URL segura del voucher
        uploadedAt: Timestamp,
        uploadedByUid: string
      },
      officialAct?: {
        actNumber: string,                // ACTA-CASH-YYYYMMDD-UID-HASH
        issuedAt: Timestamp,
        verificationCode: string,         // Hash único de verificación
        supervisorUid: string,
        supervisorName: string
      },
      verifiedByUid?: string,
      verifiedByName?: string,
      verifiedAt?: Timestamp,
      rejectionReason?: string,
      createdAt: Timestamp,
      updatedAt: Timestamp
    }
    ```

### 5.2 `/courier_cash_ledger/{entryId}` (Subledger de Custodia)
*   **Quién escribe:** Cloud Functions (triggers `orders.ts`, `trips.ts`, callables de liquidación).
*   **Campos clave:** `entryId`, `courierId`, `courierName`, `sourceDomain` (`COMMERCE_DELIVERY`, `X_TO_Y_DELIVERY`, `BANK_DEPOSIT`, `SETTLEMENT`), `orderId`, `tripId`, `closureId`, `eventType` (`ORDER_CASH_COLLECTED`, `TRIP_CASH_COLLECTED`, `BANK_DEPOSIT_SETTLED`, `CASH_HANDOVER`), `direction` (`CREDIT` | `DEBIT`), `amountCents`, `compensatedCents`, `netCustodyCents`, `earningsCents`, `idempotencyKey`, `createdAt`.

### 5.3 `/courier_balances/{courierId}`
*   **Campos clave:** `cashOutstandingCents`, `effectiveCashLimitCents`, `courierPayableBalanceCents`, `totalCollectedCents`, `totalSettledCents`, `lastSettledClosureId`, `reconciliationStatus`.

### 5.4 `/courier_settlements/{settlementId}` (Arqueos Presenciales en Mesa)
*   **Campos clave:** `settlementId`, `settlementOperationId`, `courierId`, `supervisorUid`, `branchId`, `expectedAmountCents`, `countedAmountCents`, `differenceCents`, `discrepancyAction`, `status` (`SETTLED` | `DISCREPANCY`), `receiptNumber`.

### 5.5 `/audit_events/{eventId}`
*   Eventos reales registrados: `BANK_DEPOSIT_RECEIPT_REGISTERED`, `COURIER_CLOSURE_VERIFIED`, `COURIER_CLOSURE_REJECTED`, `COURIER_SETTLEMENT_EXECUTED`.

---

## 6. Cloud Functions Evidence

| Función Callable / Trigger | Archivo | Tipo | Idempotencia | Acción Financiera |
| :--- | :--- | :--- | :--- | :--- |
| `initiateCourierDailyClosure` | `functions/src/callables/courierClosureCallables.ts` | HTTPS Callable | `closureOperationId` | Congela subledger y crea documento en `/courier_daily_closures`. |
| `registerBankDepositReceipt` | `functions/src/callables/courierClosureCallables.ts` | HTTPS Callable | Transacción Firestore | Registra voucher, calcula discrepancia y audita en `/audit_events`. |
| `verifyCourierDailyClosure` | `functions/src/callables/courierClosureCallables.ts` | HTTPS Callable | Transacción Firestore | Emite Acta Oficial, asiento `DEBIT` en subledger y reduce `cashOutstandingCents`. |
| `generateOfficialClosureActPdf` | `functions/src/callables/courierClosureCallables.ts` | HTTPS Callable | N/A (Lectura) | Retorna DTO estructurado del acta oficial. |
| `executeCourierSettlement` | `functions/src/callables/courierSettlement.ts` | HTTPS Callable | `settlementOperationId` | Arqueo físico en mesa, crea asiento `DEBIT` y actualiza balance. |
| `recalculateCourierBalance` | `functions/src/callables/courierSettlement.ts` | HTTPS Callable | N/A (Admin) | Suma algebraica de `/courier_cash_ledger` para reparar balance. |
| `onOrderDelivered` | `functions/src/triggers/orders.ts` | Firestore Trigger | `onOrderDelivered_fin_{id}` | Asiento `ORDER_CASH_COLLECTED` e incremento de custodia. |
| `onTripCompleted` | `functions/src/triggers/trips.ts` | Firestore Trigger | `onTripCompleted_fin_{id}` | Asiento `TRIP_CASH_COLLECTED` e incremento de custodia. |

---

## 7. Notification Evidence (Push FCM & In-App)

*   **Evidencia en Código:** Se realizó una auditoría exhaustiva en `courierClosureCallables.ts`, `courierSettlement.ts` y triggers de notificación.
*   **Hallazgo:** **CERO INTEGRACIÓN**.
    *   No se genera ningún documento en `/notification_campaigns`.
    *   No se invoca a `admin.messaging().send()`.
    *   No se crea ninguna notificación in-app en `/users/{adminUid}/notifications`.
*   **Impacto Operativo:** El Administrador **NO recibe alertas automáticas** cuando un repartidor sube un comprobante de depósito bancario. La única manera en que el administrador se percata es si tiene abierta la pestaña de "Caja de Motorizados" en Admin Web (`courierCashControl.js`), la cual mantiene un listener reactivo `onSnapshot`.

---

## 8. Corporate Email Evidence

*   **Evidencia en Código:**
    *   Existe un motor centralizado corporativo: `EmailService` en `functions/src/services/emailService.ts` operando por SMTP SSL puerto 465 (`mail.bluesystemdelivery.com`).
    *   Contiene 12 plantillas activas (bienvenida, solicitud comercio, aprobación comercio, solicitud courier, aprobación courier, password reset, test email, verificación x2y, etc.).
*   **Hallazgo:** **RUPTURA TOTAL DE LA CADENA (GAP CRÍTICO)**.
    *   `courierClosureCallables.ts` **no importa ni ejecuta** `EmailService`.
    *   No existe ninguna plantilla en `EmailTemplateEngine` para:
        *   `courier_closure_submitted`
        *   `courier_deposit_verified`
        *   `courier_closure_rejected`
    *   No se envía ningún correo corporativo a Finanzas, Contabilidad o Administración al registrarse un depósito o liquidación.

---

## 9. Recipient Configuration Evidence

*   **Evidencia en Código:**
    *   No existe ninguna colección como `/settlement_notification_config`.
    *   No existe ningún campo de destinatarios financieros en `/system_config/global`.
    *   No existe interfaz de configuración en Admin Web.
*   **Comparación:** En otros módulos (como `xToYDispatch.ts`), se implementó la función auxiliar `getPlatformAdminRecipients()` que consulta usuarios con rol `ADMIN`, `SUPER_ADMIN` o `PLATFORM_ADMIN` en `/users`. Sin embargo, esta función **tampoco está conectada** al módulo de cierres diarios.

---

## 10. Settlement Report / Acta Formal

*   **Admin Web (`courierCashControl.js`):**
    *   Función `exportOfficialActPdf(closure)` implementada con `jsPDF` + `AutoTable`.
    *   Estructura:
        1. Encabezado corporativo BlueSystem Delivery Enterprise.
        2. Badge con `actNumber` (ej. `ACTA-CASH-20260825-C001-A9F2`) o marca de agua "BORRADOR NO APROBADO".
        3. Sección 1: Datos de identificación (nombre real del motorizado, ID, fecha operacional, código de validación hash, estado de auditoría).
        4. Sección 2: Tabla de 3 capas contables (Recaudación, Arqueo Mesa, Depósito Banco).
        5. Sección 3: Firmas autorizadas (Motorizado y Auditoría & Finanzas).
        6. Hash de seguridad al pie de página.
*   **Android App (`CourierCashClosureScreen.kt`):**
    *   Función `downloadOfficialActPdf` basada en `android.graphics.pdf.PdfDocument`.
    *   Genera un PDF idéntico y lo almacena localmente en la carpeta de descargas del dispositivo móvil.
*   **GAP EN EL ACTA:**
    *   Ni el generador web ni el generador Android imprimen el **desglose individual de los pedidos o viajes** que componen la liquidación. Solo imprimen la fila consolidada: `"Efectivo total esperado (X pedidos): C$ Y.YY"`.

---

## 11. Idempotency Evidence

*   **Inicio de Cierre:** Blindado por `closureOperationId` (generado como UUID cliente). Si se reenvía, la transacción detecta el registro previo y retorna el documento existente con `{ idempotent: true }`.
*   **Arqueo en Mesa:** Blindado por `settlementOperationId`. Retorna `{ idempotent: true }` si ya fue procesado.
*   **Depósito Bancario:** `registerBankDepositReceipt` opera dentro de una transacción atómica verificando el estado del cierre.
*   **Aprobación Administrativa:** `verifyCourierDailyClosure` genera un asiento de subledger con `idempotencyKey: closure_{closureId}_deposit_settled`, imposibilitando duplicar débitos en el balance contable ante clics repetidos.

---

## 12. Security & Multi-Tenant Evidence

*   **Reglas de Firestore (`app/src/main/firestore.rules` y `firestore.rules`):**
    *   Escritura cliente completamente denegada: `allow write: if false;` en `/courier_daily_closures`, `/courier_settlements`, `/courier_cash_ledger`, `/courier_balances`.
    *   Lectura permitida a: courier titular, platform admin, supervisor y... `isBusinessAdmin()`.
*   **GAP DE SEGURIDAD MULTI-TENANT (MEDIO):**
    1.  `isBusinessAdmin()` (comercios) tiene permiso de lectura sobre `/courier_daily_closures/{closureId}`. Un administrador de comercio podría inspeccionar cierres diarios de motorizados de la plataforma.
    2.  El documento `/courier_daily_closures` **no almacena `tenantId`**. En entornos multi-empresa, no hay discriminación de tenant en la raíz del documento.
*   **Reglas de Storage (`storage.rules`):**
    *   Ruta `/courier_closures/{courierId}/{closureId}/{fileName}`:
        *   Creación: Solo el courier titular (`request.auth.uid == courierId`), tamaño $\le 10\text{ MB}$, formato raster/pdf.
        *   Lectura: Courier titular o Platform Admin.
        *   Actualización/Eliminación: Restringido a Platform Admin.

---

## 13. Audit Trail (`/audit_events`)

Se verificó la emisión consistente de eventos de auditoría inmutables en Firestore:

| Evento | Origen | Actor | Datos Registrados |
| :--- | :--- | :--- | :--- |
| `BANK_DEPOSIT_RECEIPT_REGISTERED` | `registerBankDepositReceipt` | Courier (`callerUid`) | `closureId`, `courierId`, `bankDepositId`, `depositAmountCents`, `depositDiscrepancyCents`, `bankReference`, `timestamp`. |
| `COURIER_CLOSURE_VERIFIED` | `verifyCourierDailyClosure` | Supervisor (`callerUid`) | `closureId`, `courierId`, `actNumber`, `verificationCode`, `depositAmountCents`, `supervisorUid`, `timestamp`. |
| `COURIER_CLOSURE_REJECTED` | `verifyCourierDailyClosure` | Supervisor (`callerUid`) | `closureId`, `courierId`, `courierName`, `supervisorUid`, `reason`, `timestamp`. |
| `COURIER_SETTLEMENT_EXECUTED` | `executeCourierSettlement` | Supervisor (`callerUid`) | `settlementId`, `settlementOperationId`, `courierId`, `expectedCents`, `countedCents`, `diffCents`, `timestamp`. |

---

## 14. Frontend Audit Specification (Diseño Propuesto para Admin Web)

Para dotar al panel administrativo de visibilidad forense completa, se propone incorporar el submódulo **"Auditoría Forense de Liquidaciones de Motorizados"** (`courierSettlementAudit.js` / tab en `financeCenter.js`):

### 14.1 Dashboard de Salud de Liquidaciones
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏛️ AUDITORÍA FORENSE DE LIQUIDACIONES Y CUSTODIA DE EFECTIVO — COURIER FLEET         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ KPI Aggregates:                                                                        │
│ • Liquidaciones Registradas: 124        • Conciliadas (VERIFIED): 110                  │
│ • Pendientes de Verificación: 8         • Con Discrepancias / Rechazadas: 6            │
│ • Custodia Viva en Calle: C$ 14,250.00  • Total Depositado Banco: C$ 186,400.00        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Estado de los Canales Operativos:                                                      │
│ [🟢 Ledger & Subledger SSOT]    [🟢 Idempotencia Transaccional]                        │
│ [🟢 Acta Oficial Vectorial]     [🔴 Notificaciones FCM Admin]                         │
│ [🔴 Correo Corporativo SMTP]    [🔴 Configuración de Destinatarios]                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Consola de Inspección por Cierre Específico (`SET-XXXXXX`)
Al seleccionar cualquier liquidación, la consola debe renderizar una vista de 6 bloques:
1.  **Tarjeta de Identidad del Courier:** Nombre real, teléfono, vehículo, balance vivo actual y límite de crédito.
2.  **Conciliación de 4 Capas:** Esperado vs Contado vs Depositado vs Liquidado con cálculo de discrepancia en centavos.
3.  **Voucher Bancario & Visor Forense:** Imagen en alta resolución, banco, número de transacción, fecha/hora y hash SHA-256.
4.  **Desglose Línea por Línea de Pedidos/Trips:** Tabla consumiendo directamente los asientos en `/courier_cash_ledger` asociados al `closureId` (ID de orden, dominio, monto recaudado, ganancia retenida, neto entregado).
5.  **Trazabilidad de Notificaciones & Correo:** Indicadores visuales de estado de entrega de correo y push FCM con identificadores de eventos.
6.  **Timeline & Pista de Auditoría:** Historial cronológico inmutable de eventos en `/audit_events`.

---

## 15. GAP REGISTER (Matriz de Brechas Identificadas)

| ID | Severidad | Módulo Afectado | Descripción del Hallazgo | Riesgo Operativo / Financiero | Recomendación Técnica |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **GAP-01** | 🔴 **CRITICAL** | `courierClosureCallables.ts` / FCM | Al enviar comprobante de depósito bancario no se despacha ninguna notificación push ni in-app al Admin/Finanzas. | Retraso en la verificación de depósitos, acumulación de custodia y couriers bloqueados innecesariamente. | Encolar automáticamente campaña en `/notification_campaigns` (`targetType: 'admin'`) y persistir en `/users/{adminUid}/notifications`. |
| **GAP-02** | 🔴 **CRITICAL** | `functions/src/services/emailService.ts` | No existe plantilla ni despacho de correo corporativo para liquidaciones y depósitos de motorizados. | Ausencia de comprobante documental por correo corporativo para Contabilidad y Gerencia Financiera. | Crear plantilla canónica `courier_daily_closure_submitted` y `courier_daily_closure_verified` en `EmailService`. |
| **GAP-03** | 🟠 **HIGH** | Admin Web / `system_config` | Inexistencia de un módulo o colección para parametrizar qué roles/usuarios reciben alertas de liquidaciones. | Dificultad para enrutar avisos a Contabilidad vs Supervisores de Flota; riesgo de hardcoding. | Implementar `/system_config/settlement_recipients` administrable desde Admin Web por rol y usuario específico. |
| **GAP-04** | 🔴 **CRITICAL** | `AdminCourierCashCenterScreen.kt` | La consola de aprobación en Android intenta escribir directamente en `/courier_daily_closures` y `/courier_balances`, fallando por `PERMISSION_DENIED` en Firestore Rules. | La app móvil de Admin no puede aprobar cierres en producción; descuadre de esquemas vs el backend. | Refactorizar `AdminCourierCashCenterScreen.kt` para invocar el callable autorizado `verifyCourierDailyClosure`. |
| **GAP-05** | 🟡 **MEDIUM** | `courierCashControl.js` / Android | El Acta Oficial PDF no incluye el desglose individual de los pedidos/trips incluidos en la liquidación. | El acta sirve como resumen bancario pero requiere auditoría manual adicional para ver los pedidos específicos. | Agregar tabla anexa en el PDF con el desglose de `includedOrderIds` y `/courier_cash_ledger`. |
| **GAP-06** | 🟡 **MEDIUM** | `firestore.rules` / Multi-tenant | Regla `/courier_daily_closures` permite lectura a `isBusinessAdmin()`, y los cierres carecen del campo `tenantId`. | Potencial fuga de datos de recaudación de flota hacia comercios o entre diferentes tenants. | Remover `isBusinessAdmin()` de la regla de lectura y añadir validación de `tenantId`. |

---

## 16. Matriz de Auditoría de Componentes

| Componente | Esperado | Encontrado | Estado | Evidencia en Código |
| :--- | :---: | :---: | :---: | :--- |
| **Settlement Record** | Sí | Sí | 🟢 IMPLEMENTADO | `/courier_daily_closures/{id}` y `/courier_settlements/{id}` |
| **Courier Balance** | Sí | Sí | 🟢 IMPLEMENTADO | `/courier_balances/{courierId}` con `cashOutstandingCents` |
| **Financial Ledger** | Sí | Sí | 🟢 IMPLEMENTADO | `/courier_cash_ledger` (subledger con `direction`, `netCustodyCents`) |
| **Reconciliation Engine** | Sí | Sí | 🟢 IMPLEMENTADO | 4 Capas en `courierClosureCallables.ts` y `courierCashControl.js` |
| **Admin Notification** | Sí | No | 🔴 AUSENTE | `courierClosureCallables.ts` no encola ni emite notificaciones |
| **Corporate Email** | Sí | No | 🔴 AUSENTE | `EmailService.ts` no posee template ni llamada para settlements |
| **Recipient Configuration**| Sí | No | 🔴 AUSENTE | No existe configuración por rol/usuario en BD ni Admin Web |
| **Idempotency** | Sí | Sí | 🟢 IMPLEMENTADO | `closureOperationId`, `settlementOperationId`, transacciones atómicas |
| **Audit Trail** | Sí | Sí | 🟢 IMPLEMENTADO | `/audit_events` con eventos explícitos y metadatos |
| **Settlement Report** | Sí | Parcial | 🟡 PARCIAL | PDF resumen existe; falta desglose individual de órdenes en PDF |
| **Downloadable Acta** | Sí | Sí | 🟢 IMPLEMENTADO | `exportOfficialActPdf` (Web jsPDF) y `downloadOfficialActPdf` (Android) |
| **Admin Mobile Approvals**| Sí | Inconsistente| 🔴 FALLA CRÍTICA | `AdminCourierCashCenterScreen.kt` intenta mutación cliente rechazada |
| **Multi-tenant Security** | Sí | Parcial | ⚠️ INCONSISTENTE | Fuga de lectura a `isBusinessAdmin()` y falta `tenantId` en schema |

---

## 17. Respuestas Taxativas a las 15 Preguntas Fundamentales

1.  **¿Cuánto dinero tiene pendiente de liquidar cada motorizado?**  
    El monto exacto se encuentra en `/courier_balances/{courierId}.cashOutstandingCents` (en centavos de NIO).
2.  **¿De dónde sale ese dinero?**  
    De los pedidos en efectivo completados (`status: delivered/completed`) de `/orders` y de los viajes en efectivo de `/deliveryTrips`.
3.  **¿Qué órdenes/trips componen ese dinero?**  
    Cada cobro genera un asiento en `/courier_cash_ledger` con su `orderId` o `tripId`. Al iniciar el cierre diario, se congelan en los arreglos `includedOrderIds` e `includedTripIds` dentro de `/courier_daily_closures`.
4.  **¿Qué parte es realmente dinero que debe entregar?**  
    El campo `netCustodyCents`. Es el remanente después de aplicar la compensación determinista en caliente: $\max(0, \text{cobradoNeto} - \text{gananciasRetenidas})$.
5.  **¿Qué parte corresponde realmente a ganancias del courier?**  
    El campo `earningsCents`, compuesto por `distanceEarningsCents` + `bonusEarningsCents` + `tipEarningsCents`. El courier retiene estas ganancias inmediatamente del efectivo cobrado.
6.  **¿Cómo presenta el courier la liquidación?**  
    Desde `CourierCashClosureScreen.kt` en la app móvil. Selecciona banco, ingresa número de referencia, sube la foto del comprobante a Storage y llama a `registerBankDepositReceipt`.
7.  **¿Dónde se almacena?**  
    En el documento `/courier_daily_closures/{closureId}`, con el comprobante en Storage `courier_closures/{courierId}/{closureId}/voucher_{ts}.jpg` y los asientos contables en `/courier_cash_ledger`.
8.  **¿Cómo se concilia?**  
    Mediante Conciliación de 4 Capas en Admin Web (`courierCashControl.js`), donde el supervisor verifica el voucher y ejecuta `verifyCourierDailyClosure(action: "VERIFY")`.
9.  **¿Qué ocurre cuando existe diferencia?**  
    Se registra `depositDiscrepancyCents`. Si depositó menos, la diferencia sigue quedando a cargo del motorizado en `cashOutstandingCents`. Si el supervisor lo rechaza con motivo, el cierre queda en `status: "REJECTED"` y no se libera el cupo.
10. **¿Se notifica al Admin/Finanzas?**  
    **NO.** Brecha identificada (GAP-01). No se generan notificaciones FCM ni in-app.
11. **¿Se envía email corporativo?**  
    **NO.** Brecha identificada (GAP-02). `EmailService` no está conectado al flujo de liquidación de motorizados.
12. **¿Quién recibe ese email?**  
    **NADIE.** Al no existir el envío, ningún destinatario recibe alertas por correo.
13. **¿Los destinatarios pueden configurarse por rol/usuario desde Admin Web?**  
    **NO.** Brecha identificada (GAP-03). No existe módulo ni colección para parametrizar receptores de avisos financieros.
14. **¿Existe un acta/reporte descargable con todo el detalle?**  
    Existe el Acta Oficial en PDF vectorial con las 4 capas y firmas, pero **carece del detalle pedido por pedido** en el documento impreso (GAP-05).
15. **¿Existe trazabilidad completa e idempotente de todo el proceso?**  
    **SÍ** en el núcleo transaccional del backend y Admin Web; **NO** en la app Admin Mobile (`AdminCourierCashCenterScreen.kt`), la cual falla por mutación directa no autorizada (GAP-04).
