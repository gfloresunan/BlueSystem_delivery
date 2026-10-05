# ACTA DE CIERRE OPERACIONAL Y CERTIFICACIÓN TÉCNICA — GAP-03
**Protocolo:** `BSD-COURIER-SETTLEMENT-PHASE2-CONTROLLED-IMPLEMENTATION-001`  
**Módulo:** Liquidaciones de Motorizados — Destinatarios Configurables de Alertas Financieras  
**Fecha de Certificación:** 29 de Septiembre de 2026  
**Estatus Oficial:** 🟢 **CERTIFIED**  

---

### 1. GAP Identificado & Causa Raíz
- **GAP:** `GAP-03 — Ausencia de Configuración Dinámica de Destinatarios de Liquidaciones y Falta de UI en Admin Web`.
- **Causa Raíz:** No existía el documento canónico `/system_config/settlement_recipients` (ni su alias `/settlement_notification_config/global`), ni un resolvedor centralizado de destinatarios ni interfaz gráfica en el Panel de Administración. Las alertas se dirigían exclusivamente mediante consultas genéricas a usuarios con rol administrativo sin soporte para selección granular por rol o usuarios específicos.

---

### 2. Archivos Modificados & Creados
- **Archivos Creados:**
  - `functions/src/services/settlementRecipientResolver.ts`:
    - SSOT canónico de configuración en `/system_config/settlement_recipients` y `/settlement_notification_config/global`.
    - Clase `SettlementNotificationRecipientResolver` con resolución dinámica en tiempo de ejecución.
    - Validación rigurosa de 4 capas: existencia de usuario, estatus activo, autorización de rol/UID y límite multi-tenant.
    - Registro inmutable de auditoría en `/audit_events` ante cualquier mutación de configuración.
  - `functions/src/tests/settlementRecipientResolver.test.ts`:
    - Suite de 6 pruebas unitarias y E2E que validan el ciclo completo de configuración, resolución y auditoría.
- **Archivos Modificados:**
  - `functions/src/callables/courierClosureCallables.ts`:
    - Sustitución de consultas estáticas en `dispatchCourierClosureAdminNotification` (GAP-01) y `dispatchCourierClosureEmailNotification` (GAP-02) por `SettlementNotificationRecipientResolver.resolveRecipients(...)`.
    - Nuevas Callables HTTPS exportadas: `getSettlementNotificationConfig` y `updateSettlementNotificationConfig`.
  - `functions/src/index.ts`:
    - Exportación de las nuevas Callables para despliegue y consumo en cliente web.
  - `panel-admin/public/js/dashboard/courierCashControl.js`:
    - Botón en cabecera: `🔔 Destinatarios de Alertas`.
    - Modal interactivo de configuración (`openRecipientsModal()`, `saveRecipientsConfig()`).
    - Selección por roles (`ADMIN`, `SUPERVISOR`, `FINANCE_MANAGER`, `ACCOUNTANT`).
    - Selección por usuarios administrativos específicos activos con checkboxes individuales.
    - Selección de canales (`Push FCM`, `Centro In-App`, `Email Corporativo`).
    - Campo obligatorio de justificación de auditoría con feedback visual en tiempo real.
- **Archivos NO Modificados (Preservación Absoluta):**
  - `functions/src/triggers/orders.ts` (Financial Core intacto).
  - `functions/src/callables/trips.ts` (Financial Core intacto).
  - `firestore.rules` (Sin alteración de reglas).

---

### 3. Funciones & Componentes Modificados
- `SettlementNotificationRecipientResolver.resolveRecipients(tenantId, firestoreDb)`:
  - Resuelve dinámicamente los destinatarios activos combinando los roles autorizados y la lista de UIDs específicos.
  - Excluye usuarios inactivos o suspendidos (`isActive === false`, `status in ["INACTIVE", "SUSPENDED"]`).
  - Aplica aislamiento multi-tenant: usuarios anclados a un tenant ajeno son descartados automáticamente salvo que cuenten con alcance global (`PLATFORM_ADMIN` / `SUPER_ADMIN`).
- `getSettlementNotificationConfig`:
  - Retorna la configuración activa y la lista de candidatos administrativos para renderizado en Admin Web.
- `updateSettlementNotificationConfig`:
  - Valida permisos de administrador y longitud mínima del motivo de cambio ($\ge 5$ caracteres).
  - Persiste atómicamente la configuración en `/system_config/settlement_recipients` y `/settlement_notification_config/global`.
  - Registra el evento `SETTLEMENT_NOTIFICATION_CONFIG_UPDATED` en `/audit_events` con `previousConfig` y `newConfig`.

---

### 4. Colecciones de Firestore Afectadas
| Colección | Operación | Clave Determinística / Ruta |
| :--- | :--- | :--- |
| `/system_config` | `set` (merge) | `settlement_recipients` |
| `/settlement_notification_config` | `set` (merge) | `global` |
| `/audit_events` | `add` | Evento `SETTLEMENT_NOTIFICATION_CONFIG_UPDATED` |

---

### 5. Idempotencia & Seguridad
- **Cero Destinatarios Hardcodeados:** Ningún correo electrónico ni UID está fijado en el código fuente.
- **Gobernanza de Seguridad:** Todo cambio de configuración exige un motivo explícito de auditoría y es verificado contra credenciales autenticadas del administrador en backend.
- **Fail-Safe de Resolución:** Si no existe configuración en Firestore, el sistema aplica automáticamente los valores predeterminados seguros (`ADMIN`, `SUPERVISOR`, `FINANCE_MANAGER`, `ACCOUNTANT`).

---

### 6. Evidencia de Pruebas Unitarias & E2E (Suite Dedicada)
- **Suite de Pruebas:** `functions/src/__tests__/settlementRecipientResolver.test.ts`
- **Resultados:**
  ```text
  ▶ GAP-03: Settlement Notification Recipient Resolver Suite
    ✔ TEST A: Defaults canónicos cuando no existe configuración previa (3.2534ms)
    ✔ TEST B: Cambio de configuración de roles A -> B (A deja de recibir, B recibe) (4.6409ms)
    ✔ TEST C: Agregar destinatario específico Usuario C -> recibe B + C (1.6633ms)
    ✔ TEST D: Desactivación de Usuario B -> únicamente Usuario C continúa recibiendo (1.6082ms)
    ✔ TEST E: Aislamiento Multi-Tenant (Admin de otro tenant queda excluido) (1.1987ms)
    ✔ TEST F: Validación de seguridad y auditoría inmutable en /audit_events (3.8411ms)
  ✔ GAP-03: Settlement Notification Recipient Resolver Suite (19.0551ms)
  ℹ tests 6 | pass 6 | fail 0
  ```

---

### 7. Verificación de Regresión & Preservación del Financial Core
- **Suite GAP-01:** `node --test lib/__tests__/courierClosureAdminNotification.test.js`
  - `5 tests | 5 pass | 0 fail`
- **Suite GAP-02:** `node --test lib/__tests__/courierClosureEmail.test.js`
  - `5 tests | 5 pass | 0 fail`
- **Suite de Regresión Financiera:** `npm run test:courier-ledger`
  - `11 tests | 11 pass | 0 fail`
- **Conclusión de Impacto:** `Financial Core Impact = 0% (TOTALMENTE INTACTO)`.

---

### 8. Veredicto Final
**GAP-03 = 🟢 CERTIFIED**  
Autorizado para proceder inmediatamente al desarrollo controlado de **GAP-04 (Admin Mobile Approval Fix)**.
