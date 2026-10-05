# ACTA DE CIERRE OPERACIONAL Y CERTIFICACIÓN TÉCNICA — GAP-01
**Protocolo:** `BSD-COURIER-SETTLEMENT-PHASE2-CONTROLLED-IMPLEMENTATION-001`  
**Módulo:** Liquidaciones de Motorizados — Capa de Notificación Administrativa  
**Fecha de Certificación:** 29 de Septiembre de 2026  
**Estatus Oficial:** 🟢 **CERTIFIED**  

---

### 1. GAP Identificado & Causa Raíz
- **GAP:** `GAP-01 — Ausencia de Notificación Administrativa en Cierre de Efectivo`.
- **Causa Raíz:** Al invocarse `registerBankDepositReceipt` desde la app móvil del motorizado, el estado del cierre transicionaba correctamente a `PENDING_ADMIN_VERIFICATION` y se registraba el asiento en `/audit_events`, pero **ningún orquestador** creaba registros en `/notification_campaigns` (para despacho de Push FCM) ni en `/users/{adminUid}/notifications` (para el centro de notificaciones in-app del Panel Admin). La administración dependía exclusivamente de tener abierta la pestaña de caja con un listener reactivo `onSnapshot`.

---

### 2. Archivos Modificados & Preservados
- **Archivos Modificados:**
  - `functions/src/callables/courierClosureCallables.ts`
    - Adición del orquestador `dispatchCourierClosureAdminNotification(...)`.
    - Enlace desacoplado e inquebrantable en `registerBankDepositReceipt` tras la confirmación atómica del comprobante bancario.
    - Tipado y blindaje de inicialización Firebase (`if (!admin.apps.length) admin.initializeApp()`).
- **Archivos NO Modificados (Preservación Absoluta):**
  - `functions/src/triggers/orders.ts` (Financial Core intacto).
  - `functions/src/callables/trips.ts` (Financial Core intacto).
  - `functions/src/services/emailService.ts` (Reservado para GAP-02).
  - `firestore.rules` (Sin alteración de reglas).

---

### 3. Funciones & Componentes Modificados
- `registerBankDepositReceipt`:
  - Mantiene su transacción financiera y subida de comprobante idéntica.
  - Al completar la transacción y el registro del evento en `/audit_events`, invoca en bloque `try/catch` asíncrono no bloqueante:
    ```typescript
    await dispatchCourierClosureAdminNotification({
      closureId: result.closureId,
      courierId: result.courierId,
      courierName: result.courierName,
      depositAmountCents,
      expectedAmountCents: result.expectedAmountCents,
      bankName: bankName.trim(),
      bankReference: bankReference.trim(),
      businessDate: result.businessDate,
      tenantId: result.tenantId,
    });
    ```
- `dispatchCourierClosureAdminNotification`:
  - **Resolución de Destinatarios:** Consulta administradores y supervisores autorizados (`role in ["admin", "superadmin", "platform_admin", "supervisor"]`).
  - **Filtro de Inactividad:** Descarta usuarios con `isActive === false` o `status in ["INACTIVE", "SUSPENDED"]`.
  - **Aislamiento Multi-Tenant:** Admins anclados a un tenant específico no reciben notificaciones de cierres de otros tenants (sólo usuarios con rol global o pertenecientes al mismo `tenantId`).
  - **Encolamiento FCM:** Crea documento en `/notification_campaigns/{campaignDocId}` para procesamiento por el worker push.
  - **Centro de Notificaciones In-App:** Escritura en lote (`batch.set`) en `/users/{adminUid}/notifications/{campaignDocId}`.
  - **Deep Link Operativo:** Enlace directo canónico: `panel-admin/public/dashboard.html#courierCashControl?closureId={closureId}`.
  - **Trazabilidad:** Registra evento `COURIER_CLOSURE_ADMIN_NOTIFIED` en `/audit_events`.

---

### 4. Colecciones de Firestore Afectadas
| Colección | Operación | Clave Determinística / Ruta |
| :--- | :--- | :--- |
| `/notification_campaigns` | `set` (Idempotente) | `courier_closure_{closureId}_pending_admin` |
| `/users/{adminUid}/notifications` | `batch.set` | `{campaignDocId}` |
| `/audit_events` | `add` | Evento `COURIER_CLOSURE_ADMIN_NOTIFIED` |

---

### 5. Idempotencia & Seguridad
- **Clave Determinística:** `courier_closure_${closureId}_pending_admin`.
- **Comportamiento ante Reintentos:** Si la campaña ya existe, la función detecta el registro previo, emite log informativo y retorna `{ success: true, idempotent: true, adminCount: 0 }`, impidiendo la inundación de notificaciones ante dobles clics o reintentos de red.
- **Fail-Safe Financiero:** El despacho de notificación se ejecuta fuera de la transacción bancaria. Si el servicio de notificaciones llegara a fallar, el registro del comprobante financiero **NO** se revierte ni corrompe el ledger.

---

### 6. Evidencia de Pruebas Unitarias & E2E (Suite Dedicada)
- **Suite de Pruebas:** `functions/src/__tests__/courierClosureAdminNotification.test.ts`
- **Resultados:**
  ```text
  ▶ GAP-01: Courier Daily Closure Admin Notification Suite
    ✔ TEST A: Despacha notificación y encola campaña al registrar comprobante de depósito (9.3613ms)
    ✔ TEST B: Idempotencia estricta ante reintentos (cero duplicación de campañas ni notificaciones) (2.8078ms)
    ✔ TEST C: Aislamiento Multi-Tenant (Admins de otro tenant son excluidos) (1.8041ms)
    ✔ TEST D: Usuarios inactivos y no administradores son excluidos absolutamente (2.8606ms)
    ✔ TEST E: Formato y Deep Link verificados contra la especificación de Admin Web (3.8931ms)
  ✔ GAP-01: Courier Daily Closure Admin Notification Suite (30.5815ms)
  ℹ tests 5 | pass 5 | fail 0
  ```

---

### 7. Verificación de Regresión & Preservación del Financial Core
- **Suite de Regresión Financiera:** `npm run test:courier-ledger`
- **Resultados:**
  ```text
  ▶ CERTIFICACIÓN E2E FORENSE — COURIER CASH LEDGER & SETTLEMENT SUITE
    ✔ TEST 01: Cobro exacto (Total=435, Recibido=435, Cambio=0) -> MATCHED, Liability +435
    ✔ TEST 02: Cobro con vuelto (Total=435, Recibido=500, Cambio=65) -> MATCHED, Liability +435
    ✔ TEST 03: Discrepancia (Total=435, Recibido=500, Cambio=40, Neto=460) -> DISCREPANCY, diff=+25
    ✔ TEST 04: Modo Offline -> Room Outbox sync -> exactamente 1 asiento de subledger
    ✔ TEST 05: Doble retry de orden -> exactamente 1 ORDER_CASH_COLLECTED
    ✔ TEST 06: Settlement exacto (Outstanding=435, Contado=435) -> status=SETTLED
    ✔ TEST 07: Settlement con faltante (Outstanding=1280, Contado=1250) -> diff=-30
    ✔ TEST 08: Retry de Settlement con mismo settlementOperationId -> 1 settlement
    ✔ TEST 09: Corromper balance artificialmente -> recalculateCourierBalance reconstruye desde Ledger
    ✔ TEST 10: Validación de reglas de seguridad -> allow write: if false
    ✔ TEST 11: Ataque de manipulación -> Backend ignora valor y calcula autoritativamente
  ✔ 11 tests | 11 pass | 0 fail
  ```
- **Conclusión de Impacto:** `Financial Core Impact = 0% (TOTALMENTE INTACTO)`.

---

### 8. Veredicto Final
**GAP-01 = 🟢 CERTIFIED**  
Autorizado para proceder inmediatamente al desarrollo controlado de **GAP-02 (Email Corporativo)**.
