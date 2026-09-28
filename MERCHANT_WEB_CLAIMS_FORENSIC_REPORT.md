# MERCHANT WEB CLAIMS FORENSIC REPORT
**Proyecto:** bluesystem-7c9af  
**Fecha:** 2026-08-17  
**Fase:** FASE 1 — DIAGNÓSTICO OBLIGATORIO DE CLAIMS DE IDENTIDAD (EIAM / IAC v1.0)  
**Modo:** CONTROLLED FIX / PRODUCTION-SAFE / NO DATA DELETION  

---

## 1. RESUMEN EJECUTIVO

El presente informe documenta la auditoría forense realizada sobre la infraestructura de autenticación y reclamos de identidad (Custom Claims) para los usuarios del portal Merchant Web. Se investigó de manera exhaustiva el error reportado:

> `"AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid."`

La auditoría analizó la colección física `/users` (47 documentos), la colección `/membership` (3 documentos), la colección `/businesses` (8 documentos), las funciones backend de Cloud Functions (`setUserClaims V2` en `functions/src/triggers/auth.ts`), el estado de autenticación en Firebase Auth (mediante la API REST oficial Identity Toolkit), y la implementación del `AuthContext.tsx` en `merchant-web`.

---

## 2. AUDITORÍA EXHAUSTIVA DE CUENTAS MERCHANT

Para cada cuenta Merchant identificada se registraron sus datos canónicos en Firestore y sus Custom Claims reales en Firebase Auth:

### A) CUENTA TARGET: FRITONI (Caso de Control Primario)
- **UID:** `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`
- **Email:** `fritoni@gmail.com` (Auth Email: `fritonic@gmail.com`)
- **`/users.role` (Firestore):** `"business"`
- **`/users.status` (Firestore):** `"ACTIVE"`
- **`/users.businessId` (Firestore):** `"dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"`
- **`/users.branchId` (Firestore):** `"br_1786988052589"`
- **`/users.orgId` (Firestore):** `"org_default_bluesystem"`
- **`/users.tenantId` (Firestore):** `null`
- **Auth.disabled (Firebase Auth):** `false`
- **Auth customClaims.role:** `"MERCHANT_OWNER"` *(Rol legacy previo a la normalización V2 a OWNER)*
- **Auth customClaims.businessId:** `"dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"`
- **Auth customClaims.branchId:** `"br_1786988052589"`
- **Auth customClaims.orgId:** `"org_default_bluesystem"`
- **Auth customClaims.tenantId:** `null`
- **Memberships Existentes:** `1`
  - **ID:** `mem_fritoni_dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`
  - **businessId:** `"dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"`
  - **branchId:** `"br_1786988052589"`
  - **role:** `"MERCHANT_OWNER"`
  - **status:** `"ACTIVE"`
  - **permissions:** `["VIEW_ORDERS", "MANAGE_ORDERS", "VIEW_MENU", "MANAGE_MENU", "VIEW_FINANCE", "EXPORT_REPORT", "MANAGE_EMPLOYEES", "MANAGE_SETTINGS", "VIEW_ANALYTICS", "CLOSE_CASH_REGISTER"]`

---

### B) ALDRICH FLORES / TECNOCOMP
- **UID:** `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2`
- **Email:** `ventas@tecnocomp.com.ni`
- **`/users.role` (Firestore):** `"OWNER"`
- **`/users.status` (Firestore):** `"DELETED"` *(Comercio desaprovisionado en prueba previa)*
- **`/users.businessId` (Firestore):** `"bbb760d5-a8f3-4700-9a96-f58f11f345ac"`
- **`/users.branchId` (Firestore):** `"30945c9c-3aee-4e45-b35d-a998b57cf2fa"`
- **`/users.orgId` (Firestore):** `"1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8"`
- **`/users.tenantId` (Firestore):** `null`
- **Auth.disabled (Firebase Auth):** `false`
- **Auth customClaims.role:** `"OWNER"`
- **Auth customClaims.businessId:** `"bbb760d5-a8f3-4700-9a96-f58f11f345ac"`
- **Auth customClaims.branchId:** `"30945c9c-3aee-4e45-b35d-a998b57cf2fa"`
- **Auth customClaims.orgId:** `"1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8"`
- **Auth customClaims.tenantId:** `null`
- **Memberships Existentes:** `1` (`businessId`: `bbb760d5-a8f3-4700-9a96-f58f11f345ac`)

---

### C) JUNIOR FLORES
- **UID:** `XWNzPT5p6fbf7reFdFBNTZoQrY42`
- **Email:** `gflores@unan.edu.ni`
- **`/users.role` (Firestore):** `"business"`
- **`/users.status` (Firestore):** `"DELETED"` *(Comercio desaprovisionado)*
- **`/users.businessId` (Firestore):** `"e7dc911e-e587-4be9-a741-7d9d9828011f"`
- **`/users.branchId` (Firestore):** `"794f7c02-8077-40a8-b260-2fdd27a6f35d"`
- **`/users.orgId` (Firestore):** `"75b145e5-17ec-4248-a085-c962a408db86"`
- **`/users.tenantId` (Firestore):** `null`
- **Auth.disabled (Firebase Auth):** `false`
- **Auth customClaims.role:** `"MERCHANT_OWNER"`
- **Auth customClaims.businessId:** `"e7dc911e-e587-4be9-a741-7d9d9828011f"`
- **Auth customClaims.branchId:** `"794f7c02-8077-40a8-b260-2fdd27a6f35d"`
- **Auth customClaims.orgId:** `"75b145e5-17ec-4248-a085-c962a408db86"`
- **Auth customClaims.tenantId:** `null`
- **Memberships Existentes:** `1` (`businessId`: `e7dc911e-e587-4be9-a741-7d9d9828011f`)

---

### D) EL CHANCHITO
- **UID:** `bbb760d5-a8f3-4700-9a96-f58f11f345ac`
- **Email:** `elchanchito@gmail.com`
- **`/users.role` (Firestore):** `"business"`
- **`/users.status` (Firestore):** `"ACTIVE"`
- **`/users.businessId` (Firestore):** `null` *(Ausente en documento /users)*
- **`/users.branchId` (Firestore):** `null`
- **`/users.orgId` (Firestore):** `null`
- **`/users.tenantId` (Firestore):** `null`
- **Auth.disabled (Firebase Auth):** `false`
- **Auth customClaims:** `{}` *(Sin reclamos de negocio configurados)*
- **Memberships Existentes:** `0`

---

### E) VARIEDADES TECNOHOME
- **UID:** `e7dc911e-e587-4be9-a741-7d9d9828011f`
- **Email:** `tecnohome@gmail.com`
- **`/users.role` (Firestore):** `"business"`
- **`/users.status` (Firestore):** `"ACTIVE"`
- **`/users.businessId` (Firestore):** `null` *(Ausente en documento /users)*
- **`/users.branchId` (Firestore):** `null`
- **`/users.orgId` (Firestore):** `null`
- **`/users.tenantId` (Firestore):** `null`
- **Auth.disabled (Firebase Auth):** `false`
- **Auth customClaims:** `{}` *(Sin reclamos de negocio configurados)*
- **Memberships Existentes:** `0`

---

### F) KIMBERLY FLORES
- **UID:** `8O8hJe5kSzNQxUkLwwkCsipGmAI3`
- **Email:** `kim@gmail.com`
- **`/users.role` (Firestore):** `"business"`
- **`/users.status` (Firestore):** `"DELETED"`
- **`/users.businessId` (Firestore):** `null`
- **Auth.disabled (Firebase Auth):** `true`
- **Auth customClaims.role:** `"OWNER"`
- **Auth customClaims.businessId:** `null`
- **Memberships Existentes:** `0`

---

## 3. CLASIFICACIÓN DE LA CAUSA EXACTA DEL FALLO

Con base en la evidencia obtenida, se clasifican las causas del error en las siguientes categorías canónicas:

1. **Categoría C (Role Legacy vs Canónico EIAM):**
   - El documento `/users/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` (FRITONI) contiene `role: "business"`.
   - En Firebase Auth, los Custom Claims actuales contienen `role: "MERCHANT_OWNER"`.
   - El trigger canónico `setUserClaims V2` (`functions/src/triggers/auth.ts`) utiliza `resolveEiamRole()`, el cual normaliza `"business"` y `"MERCHANT_OWNER"` hacia el rol canónico EIAM `"OWNER"`.
   - Al no haberse ejecutado un evento `onWrite` sobre `/users` para FRITONI tras la actualización del trigger, los Custom Claims en el servidor de Firebase Auth continuaban con el valor legacy `"MERCHANT_OWNER"`.

2. **Categoría G (AuthContext y Normalización de Roles Legacy en Cliente):**
   - En `AuthContext.tsx` (líneas 92-100), el cliente realizaba un casteo estricto a `CanonicalRole` pero no aplicaba la resolución canónica de `CanonicalIdentityResolver`.
   - Si el token del cliente contenía un valor legacy como `"MERCHANT_OWNER"` o `"business"`, o si existía un retardo en la propagación de token tras login, el check `!claimRole || !claimBusinessId` provocaba un `FAIL CLOSED` prematuro antes de forzar una reconciliación/refresh controlado de token.

3. **Categoría D (Refresh de Token en Cliente):**
   - El cliente requiere un mecanismo explícito de refresh de token de 1 solo intento (`getIdToken(true)`) al detectar reclamos obsoletos o desincronizados tras login, garantizando que el ID Token refleje de forma inmediata los reclamos actualizados en el servidor de Firebase Auth sin generar loops infinitos de render.

---

## 4. CONCLUSIÓN DE DIAGNÓSTICO Y ACCIÓN REQUERIDA

- **FRITONI (`dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`):** Posee todos los datos canónicos necesarios en Firestore (`role: "business"`, `businessId: "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"`, `branchId: "br_1786988052589"`, `orgId: "org_default_bluesystem"`) y una membresía activa correspondiente (`mem_fritoni_dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`).
- **Acción de Reparación:**
  1. Ejecutar `setUserClaims V2` mediante la reconciliación administrativa de claims sobre el UID de FRITONI para sincronizar sus Custom Claims en Firebase Auth con los valores canónicos (`role: "OWNER"`, `businessId: "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2"`, `branchId: "br_1786988052589"`, `orgId: "org_default_bluesystem"`).
  2. Actualizar `merchant-web/src/shared/context/AuthContext.tsx` para incorporar:
     - Normalización de roles vía `CanonicalIdentityResolver` (mapeando `MERCHANT_OWNER` y `business` a `OWNER`).
     - Refresh controlled de token (1 único reintento si los claims requieren actualización).
     - Log estructural obligatorio `[MERCHANT_IAC_CLAIMS]` en consola.
