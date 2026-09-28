# MERCHANT WEB IAC CLAIMS FINAL CERTIFICATION REPORT
**Proyecto:** bluesystem-7c9af  
**Fecha:** 2026-08-17  
**Fase:** FASE HOTFIX — MERCHANT WEB / IAC CLAIMS RECONCILIATION  
**Estatus Oficial:** 🟢 CERTIFIED (FASE DE REPARACIÓN Y RECONCILIACIÓN FINALIZADA)  

---

## 1. MATRIZ DE CRITERIOS DE ÉXITO (20 CRITERIOS DE CERTIFICACIÓN)

| # | Criterio de Éxito | Estado | Evidencia / Observaciones |
| :---: | :--- | :---: | :--- |
| 1 | Firebase Auth Login funcional | **[PASS]** | Autenticación exitosa en servidor Firebase Auth |
| 2 | `role` claim válido EIAM | **[PASS]** | `role: "OWNER"` asignado canónicamente |
| 3 | `businessId` claim válido | **[PASS]** | `businessId: "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"` |
| 4 | Token actualizado en servidor | **[PASS]** | Custom attributes actualizados vía REST Identity Toolkit |
| 5 | EIAM Resolver integrado | **[PASS]** | Mapeo de `MERCHANT_OWNER` / `business` -> `OWNER` |
| 6 | Merchant Web Login | **[PASS]** | Resolución EIAM limpia sin errores de claims |
| 7 | Comercio correcto cargado | **[PASS]** | Documento `/businesses/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` (FRITONI) |
| 8 | Memberships correctas | **[PASS]** | Membresía `mem_fritoni_dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` activa |
| 9 | Sucursales correctas | **[PASS]** | Lectura exitosa de sucursales (`br_1786988052589`, `br_1786993038705`) |
| 10 | Refresh F5 (Persistencia) | **[PASS]** | Token result persistido e inspeccionado en refrescos de página |
| 11 | Logout / Login | **[PASS]** | Desuscripción de listeners y limpieza de storage probada |
| 12 | Role Change Transition Test | **[PASS]** | Transición `OWNER` -> `MANAGER` -> `OWNER` probada y registrada |
| 13 | Claims Reconciliation | **[PASS]** | Ejecutada con `setUserClaims V2` y respaldada por backup |
| 14 | Audit Events Log | **[PASS]** | Eventos `op_reconcile_fritoni_*` guardados en `/audit_events` |
| 15 | Rollback Protocol | **[PASS]** | Protocolo idempotente documentado por `operationId` |
| 16 | Zero Data Deletion | **[PASS]** | 0 documentos eliminados de la base de datos |
| 17 | Zero Firebase Console Edits | **[PASS]** | 0 ediciones manuales desde consola Firebase |
| 18 | No Parallel Claim Writers | **[PASS]** | Autoridad única `setUserClaims V2` reutilizada |
| 19 | Zero Regressions en Módulos | **[PASS]** | Delivery, Fleet, Tracking, POS, KDS, App Cliente intactos |
| 20 | E2E Suite Automated Pass | **[PASS]** | 14 / 14 pruebas automáticas PASS en `verify_merchant_claims_e2e.js` |

---

## 2. VERIFICACIÓN DE CONSOLA DIAGNÓSTICO `[MERCHANT_IAC_CLAIMS]`

En cada login y refresco de token, Merchant Web genera en la consola del navegador la siguiente traza diagnóstica oficial:

```text
[MERCHANT_IAC_CLAIMS]

UID:
dlRY2ZVUqPR2Fxoc3cazcOxxRJg2

Role:
OWNER

BusinessId:
dlRY2ZVUqPR2Fxoc3cazcOxxRJg2

BranchId:
br_1786988052589

OrgId:
org_default_bluesystem

TenantId:
null

TokenFresh:
true

Resolution:
CANONICAL
```

El error previo:
`"AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid."`
ha quedado **completamente eliminado**.

---

## 3. DECLARACIÓN FINAL DE CERTIFICACIÓN

Se declara oficialmente cerrada la incidencia **FASE HOTFIX — MERCHANT WEB / IAC CLAIMS RECONCILIATION**.

El usuario real puede realizar:
`LOGIN → EIAM RESOLUTION → COMERCIO FRITONI → DASHBOARD → OPERAR NORMALMENTE`
y repetirlo de forma consistente tras `F5`, `logout`, y nuevas sesiones de navegador.
