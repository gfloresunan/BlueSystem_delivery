# MERCHANT WEB IAC CLAIMS HOTFIX REPORT
**Proyecto:** bluesystem-7c9af  
**Fecha:** 2026-08-17  
**Modulo Target:** Merchant Web / IAC Claims Reconciliation  
**Estado:** 🟢 COMPLETADO Y CERTIFICADO  

---

## 1. RESUMEN DE LA INTERVENCIÓN

Se ejecutó la reparación hotfix controlada para resolver el error en Merchant Web:
> `"AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid."`

### Principios Aplicados
- **Objetivo Exclusivo Inicial:** FRITONI (`dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`). Ninguna otra cuenta fue modificada.
- **Autoridad Única Canónica:** Reutilización de `setUserClaims V2` (`functions/src/triggers/auth.ts`) y `CanonicalIdentityResolver`. Sin creaciones de autoridades paralelas.
- **Sin Fallbacks Ni Máscaras Hardcodeadas:** `AuthContext.tsx` no oculta errores ni inventa valores. Aplica resolución canónica de roles legacy (`MERCHANT_OWNER` / `business` -> `OWNER`), refresh de token controlado de máximo 1 intento (`getIdToken(true)`), y sostiene la política `FAIL CLOSED` en caso de reclamos ausentes.
- **Protección de Datos:** Cero eliminación de cuentas, cero modificaciones manuales desde Firebase Console.

---

## 2. ESTADO ANTES Y DESPUÉS (CUENTA FRITONI)

- **UID:** `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`
- **Email:** `fritoni@gmail.com`

| Parámetro | Estado ANTES | Estado DESPUÉS |
| :--- | :--- | :--- |
| `/users.role` (Firestore) | `business` | `business` (Mantenido) |
| `/users.status` (Firestore) | `ACTIVE` | `ACTIVE` (Mantenido) |
| `/users.businessId` | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` |
| `/users.branchId` | `br_1786988052589` | `br_1786988052589` |
| `/users.orgId` | `org_default_bluesystem` | `org_default_bluesystem` |
| **Auth customClaims.role** | `"MERCHANT_OWNER"` | **`"OWNER"` (Canónico EIAM V2)** |
| **Auth customClaims.businessId** | `"dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"` | `"dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"` |
| **Auth customClaims.branchId** | `"br_1786988052589"` | `"br_1786988052589"` |
| **Auth customClaims.orgId** | `"org_default_bluesystem"` | `"org_default_bluesystem"` |
| **Auth.disabled** | `false` | `false` |
| **Membresía Asociada** | `mem_fritoni_dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | `mem_fritoni_dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` |

---

## 3. AUDITORÍA Y REGISTRO EN `/audit_events`

Toda mutación fue respaldada por un snapshot previo:
- **Operation ID Reconciliación:** `op_reconcile_fritoni_1787013877616`
- **Actor:** `EIAM_SYSTEM_HOTFIX`
- **Colección:** `/audit_events/op_reconcile_fritoni_1787013877616`
- **Estado Auditoría:** `COMPLETED`
- **Prueba de Cambio de Rol (OWNER <-> MANAGER):**
  - Transition 1: `op_role_transition_manager_1787014028014` (`OWNER` -> `MANAGER`)
  - Transition 2: `op_role_transition_owner_1787014028080` (`MANAGER` -> `OWNER`)

---

## 4. CAMBIOS CÓDIGO FUENTE

### [`AuthContext.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/context/AuthContext.tsx)
1. **Normalización Canónica de Rol:** Función `normalizeCanonicalRole` para mapear roles legacy (`MERCHANT_OWNER`, `business`, `propietario`) a `OWNER`.
2. **Refresh Controlled de ID Token:** `getIdToken(currentUser, true)` ejecutado máximo 1 vez tras login si los reclamos requieren actualización.
3. **Registro Diagnóstico Consola:**
   ```
   [MERCHANT_IAC_CLAIMS]
   UID: dlRY2ZVUqPR2Fxoc3cazcOxxRJg2
   Role: OWNER
   BusinessId: dlRY2ZVUqPR2Fxoc3cazcOxxRJg2
   BranchId: br_1786988052589
   OrgId: org_default_bluesystem
   TenantId: null
   TokenFresh: true
   Resolution: CANONICAL
   ```
