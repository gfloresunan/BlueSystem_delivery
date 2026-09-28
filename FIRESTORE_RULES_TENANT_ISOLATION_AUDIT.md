# BLUE SYSTEM DELIVERY ENTERPRISE
## FIRESTORE RULES TENANT ISOLATION & ANONYMOUS SECURITY AUDIT

```text
Project:          BlueSystem Delivery Enterprise
Firebase Project: bluesystem-7c9af
Target Module:    Firestore Security Rules (firestore.rules)
Audit Date:       2026-08-12
Auditor / Lead:   Senior Developer & Auditor de BlueSystem
Audit Type:       Read-Only Security & Multi-Tenant Isolation Hardening Audit
Final Verdict:    FAIL — SECURITY VIOLATION
```

---

### 1. CURRENT RULES OVERVIEW

The deployed Security Rules (`firestore.rules`) establish access control based on JWT Custom Claims (`role`, `businessId`, `branchId`, `orgId`) and helper functions (`isPlatformAdmin()`, `ownsBusiness()`, `isBusinessStaff()`, `isBusinessAdmin()`).

While Platform Admin global access for Governance Center has been properly scoped, a detailed forensic audit of tenant isolation and anonymous access revealed **critical security vulnerabilities** in current rule definitions.

---

### 2. AUTHENTICATION & CLAIM MODEL

* **Platform Admins:** Users with JWT claim `role` in `["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"]` or boolean claims `admin == true` / `isSuperAdmin == true`.
* **Tenant Staff (`isBusinessStaff()`):** Users with JWT claim `role` in `["OWNER", "MANAGER", "SUPERVISOR", "CASHIER", "COOK"]`.
* **Tenant Business Admins (`isBusinessAdmin()`):** Users with JWT claim `role` in `["OWNER", "MANAGER"]`.
* **Tenant ID Claim (`getBusinessId()`):** User's assigned merchant identifier `request.auth.token.businessId`.

---

### 3. FORENSIC AUDIT OF INITIAL FINDINGS

#### HALLAZGO INICIAL 1 — VULNERABILIDAD EN `/businesses/{businessId}`
* **Regla Evaluada:**
  ```firestore
  match /businesses/{businessId} {
    allow read: if isAuthenticated() &&
                   (isPlatformAdmin() || ownsBusiness(businessId) || isBusinessStaff());
  }
  ```
* **Análisis de Helper `isBusinessStaff()`:**
  ```firestore
  function isBusinessStaff() {
    return getRole() in ["OWNER", "MANAGER", "SUPERVISOR", "CASHIER", "COOK"];
  }
  ```
* **Diagnóstico Forense:** `isBusinessStaff()` comprueba **únicamente** la existencia de un rol de personal de comercio en la cuenta del usuario, pero **NO COMPRUEBA `businessId` ni `ownsBusiness(businessId)`**.
* **Resultado:** Un usuario del **Comercio A** con rol `CASHIER` y `businessId = "BUSINESS_A"` que intente leer `/businesses/BUSINESS_B` o ejecutar `db.collection('businesses').get()` obtiene un resultado **ALLOW**.
* **Veredicto del Hallazgo:** 🔴 **CRITICAL SECURITY VIOLATION** (Fuga de datos entre tenants / Cross-Tenant Breach).

---

#### HALLAZGO INICIAL 2 — VULNERABILIDAD EN `/branches/{branchId}`
* **Regla Evaluada:**
  ```firestore
  match /branches/{branchId} {
    allow read: if isAuthenticated() &&
                   (isPlatformAdmin() || isBusinessStaff());
  }
  ```
* **Diagnóstico Forense:** La regla permite lectura si `isBusinessStaff()` evalúa como verdadero, sin validar `resource.data.businessId == getBusinessId()`.
* **Resultado:** El personal del **Comercio A** puede consultar las sucursales GPS del **Comercio B** o listar todas las sucursales del sistema mediante `db.collection('branches').get()`.
* **Veredicto del Hallazgo:** 🔴 **CRITICAL SECURITY VIOLATION** (Fuga de datos de ubicación e infraestructura de otros comercios).

---

#### HALLAZGO INICIAL 3 Y 4 — ACCESO TENANT A `/roles` Y `/permissions`
* **Reglas Evaluadas:**
  ```firestore
  match /roles/{roleId} {
    allow read: if isAuthenticated() && (isPlatformAdmin() || isBusinessStaff());
  }
  match /permissions/{docId} {
    allow read: if isAuthenticated() && (isPlatformAdmin() || isBusinessStaff());
  }
  ```
* **Diagnóstico Forense:** Todo usuario con rol de personal de comercio puede consultar la matriz global de permisos y definiciones de roles. Aunque son metadatos de configuración, en un esquema EIAM estricto esta consulta debería restringirse a administradores o tenant admins (`isBusinessAdmin()`).
* **Veredicto del Hallazgo:** 🟡 **MEDIUM FINDING** (Sobre-permisivo para staff operativo).

---

#### HALLAZGO INICIAL 5 — FUGA DE PII Y ANÓNIMOS EN `/invitations/{token}`
* **Regla Evaluada:**
  ```firestore
  match /invitations/{token} {
    allow read: if true;
  }
  ```
* **Análisis de Contenido de los Documentos:** Los documentos de invitación contienen información altamente sensible:
  - `email`: Correo electrónico del empleado invitado.
  - `telefono`: Número telefónico corporativo/personal.
  - `targetRole`: Rol de destino (`CASHIER`, `MANAGER`, etc.).
  - `businessId`, `branchId`, `orgId`: Identificadores de tenant.
  - `token`, `expiresAt`, `status`: Tokens y fechas de expiración.
* **Diagnóstico Forense:** `allow read: if true;` fue implementado originalmente para permitir que el portal de Merchant Web valide un token de invitación antes de que el usuario haya creado o iniciado sesión en su cuenta (`accept-invite?token=xyz`). Sin embargo, utilizar `allow read: if true;` permite que **cualquier usuario anónimo no autenticado** ejecute una consulta coleccional `db.collection('invitations').get()` y descargue la totalidad de invitaciones, correos, números telefónicos y estructura de personal del sistema.
* **Veredicto del Hallazgo:** 🔴 **CRITICAL SECURITY VIOLATION** (Fuga pública de PII y tokens de invitación).

---

#### HALLAZGO INICIAL 6 — ACCESO PÚBLICO A `/products/{productId}`
* **Regla Evaluada:**
  ```firestore
  match /products/{productId} {
    allow read: if true;
  }
  ```
* **Diagnóstico Forense:** Los catálogos de productos y menús gastronómicos son públicos por diseño para la app de clientes y el portal web de pedidos (e-Commerce Marketplace public catalog). Las operaciones de modificación (`create`, `update`, `delete`) están estrictamente protegidas por `isWritingOwnBusinessId()` y `ownsBusiness()`.
* **Veredicto del Hallazgo:** 🟢 **PUBLIC BY DESIGN** (Comportamiento correcto y esperado para marketplace).

---

### 4. MATRIZ DE ACCESO COMPLETA POR ROL (PRUEBAS DE SEGURIDAD)

| Colección / Recurso | Anonymous | Platform Admin | Merchant A OWNER | Merchant A MANAGER | Merchant A SUPERVISOR | Merchant A CASHIER | Merchant A COOK | Merchant B Staff | Estado de Seguridad |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`/organizations`** | ❌ DENY | ✅ ALLOW | ⚠️ PARTIAL | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/businesses/B`** | ❌ DENY | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 **VULNERABLE** |
| **`/businesses` (List)** | ❌ DENY | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 **VULNERABLE** |
| **`/branches/B1`** | ❌ DENY | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 **VULNERABLE** |
| **`/branches` (List)** | ❌ DENY | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 **VULNERABLE** |
| **`/roles`** | ❌ DENY | ✅ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | 🟡 OVER-PERMISSIVE |
| **`/permissions`** | ❌ DENY | ✅ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | ⚠️ ALLOW | 🟡 OVER-PERMISSIVE |
| **`/invitations` (List)** | 🚨 **ALLOW** | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 **CRITICAL LEAK** |
| **`/products`** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | 🟢 PUBLIC BY DESIGN |
| **`/users/USER_B`** | ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/employees/EMP_B`** | ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/sessions/SESS_B`** | ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/devices/DEV_B`** | ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/orders/ORDER_B`** | ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/audit_events/EV_B`** | ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |
| **`/merchant_applications`**| ❌ DENY | ✅ ALLOW | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | 🟢 SECURE |

---

### 5. EVALUACIÓN DE PRUEBAS CRÍTICAS

1. **CRITICAL TEST — Business Isolation:**
   - **Acción:** Usuario `CASHIER` del Comercio A solicita `/businesses/BUSINESS_B`.
   - **Resultado:** **ALLOW** (Vulnerabilidad Crítica).
2. **CRITICAL TEST — Branch Isolation:**
   - **Acción:** Usuario `CASHIER` del Comercio A solicita `/branches/BRANCH_B1`.
   - **Resultado:** **ALLOW** (Vulnerabilidad Crítica).
3. **CRITICAL TEST — Anonymous Invitations Leak:**
   - **Acción:** Usuario anónimo solicita `collection('invitations').get()`.
   - **Resultado:** **ALLOW** (Vulnerabilidad Crítica de Fuga de PII).

---

### 6. PROPUESTA DE CORRECCIÓN PARA FASE FUTURA (NO APLICADA)

Para resolver definitivamente las vulnerabilidades identificadas sin afectar al Governance Center ni la operación de Merchant Web, las reglas deberán refactorizarse en el futuro de la siguiente manera:

```firestore
// 1. Corrección /businesses/{businessId}: Eliminar isBusinessStaff() no acotado
match /businesses/{businessId} {
  allow read: if isAuthenticated() &&
                 (isPlatformAdmin() || ownsBusiness(businessId));
}

// 2. Corrección /branches/{branchId}: Acotar isBusinessStaff() al businessId del recurso
match /branches/{branchId} {
  allow read: if isAuthenticated() &&
                 (isPlatformAdmin() ||
                  (isBusinessStaff() && resource.data.businessId == getBusinessId()));
}

// 3. Corrección /invitations/{token}: Distinguir lectura individual (get) de lista (list)
match /invitations/{token} {
  // Permite validar un token específico de invitación de forma pública
  allow get: if true;
  // Bloquea el escaneo coleccional a anónimos y restringe a administradores
  allow list: if isAuthenticated() && (isPlatformAdmin() || isBusinessAdmin());
}
```

---

### 7. FINAL VERDICT

```text
═══════════════════════════════════════════════════════════════════════════════
               FIRESTORE RULES TENANT ISOLATION AUDIT VERDICT
═══════════════════════════════════════════════════════════════════════════════

FINAL VERDICT:         FAIL — SECURITY VIOLATION

CRITICAL FINDINGS:
1. Cross-Tenant Breach en /businesses y /branches: El uso de isBusinessStaff()
   sin filtro por businessId permite a cualquier cajero o personal del Comercio A
   leer la información y sucursales del Comercio B y listar la colección completa.

2. Anonymous PII Leak en /invitations: 'allow read: if true;' permite que cualquier
   usuario no autenticado descargue la colección completa de invitaciones, exponiendo
   emails, teléfonos, roles y estructura interna de personal de los comercios.

PUBLIC BY DESIGN:
- /products: La lectura pública ('allow read: if true;') es correcta y requerida
  para la operación del catálogo Marketplace de clientes.

NO FILES MODIFIED:     YES
NO DEPLOY:             YES
FINAL STATUS:          AUDIT COMPLETE — REMEDIATION REQUIRED IN FUTURE SPRINT
═══════════════════════════════════════════════════════════════════════════════
```
