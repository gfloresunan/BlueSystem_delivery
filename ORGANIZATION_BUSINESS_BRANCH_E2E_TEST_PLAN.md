# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN DE PRUEBAS E2E Y SUITE DE REGRESIÓN OBLIGATORIA

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. PLAN DE SUITE FUTURA DE PRUEBAS DE AISLAMIENTO MULTI-TENANT

Se diseña la suite de verificación automatizada que deberá ser superada al 100% antes de aprobar la migración a producción:

```text
[TEST SUITE E2E - JERARQUÍA MULTI-TENANT]
  ├── 1. AISLAMIENTO DE ORGANIZACIÓN
  │      ├── TEST-ORG-01: Usuario Org A solicita lectura de Org B ───► Debe retornar PERMISSION_DENIED
  │      └── TEST-ORG-02: Usuario Org A intenta asociar Business a Org B ──► Debe denegarse por Rules
  │
  ├── 2. AISLAMIENTO DE COMERCIO (BUSINESS)
  │      ├── TEST-BIZ-01: Merchant Owner A consulta pedidos de Merchant B ─► Debe retornar lista vacía / PERMISSION_DENIED
  │      └── TEST-BIZ-02: Creación de producto con businessId ajeno ─────► Debe rebotar en Rules
  │
  ├── 3. AISLAMIENTO DE SUCURSAL (BRANCH)
  │      ├── TEST-BR-01: Staff Sucursal 1 intenta modificar KDS de Sucursal 2 ─► Bloqueo EIAM
  │      └── TEST-BR-02: Orden creada en Sucursal A asignada a Sucursal B ───► Error de coherencia
  │
  ├── 4. PERSISTENCIA Y SINCRONIZACIÓN OFFLINE ANDROID
  │      ├── TEST-OFF-01: Orden offline creada por Usuario A no se envía con token de Usuario B
  │      └── TEST-OFF-02: Cola Room mantiene creatorUid inalterado tras relogin
  │
  └── 5. INTEGRIDAD CONTABLE Y DE FLOTA
         ├── TEST-ACC-01: Histórico contable /merchant_summaries intacto tras backfill
         └── TEST-FLEET-01: Tracking GPS en vivo funciona sin interrupción durante consulta
```

---

### 2. PRUEBAS DE REGRESIÓN OBLIGATORIAS (BASELINE CERTIFICATION)

| Módulo Protegido | Prueba de Regresión Requerida | Criterio de Éxito |
| :--- | :--- | :--- |
| **Auth & Claims** | `getIdTokenResult()` en Merchant Web | Token contiene `role`, `orgId`, `businessId`, `branchId` |
| **Governance Center** | Creación y desaprobación de solicitudes | Mantiene estado de `merchant_applications` |
| **Fleet Core** | Asignación inteligente de motorizado | Asigna repartidores por proximidad a la sucursal |
| **Merchant Email** | Notificación SendGrid de aprobación | Correo entregado con credenciales temporales |
| **Android Sync** | Reintentos de `SyncWorker` | Eventos offline suben exitosamente al reconectar |
