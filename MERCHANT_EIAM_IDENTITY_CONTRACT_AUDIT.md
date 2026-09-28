# SPRINT 17.3 — MERCHANT WEB × EIAM IDENTITY CONTRACT FORENSIC AUDIT REPORT
**Documento Oficial de Certificación y Cierre de Integración**  
**Versión:** 1.0.0  
**Fecha:** 17 de Agosto de 2026  
**Sistema:** BlueSystem Delivery Enterprise (v2.2)  
**Módulos Auditados:** Cloud Functions EIAM, Firebase Auth, Firestore Security Rules, Merchant Web Portal  

---

## 1. Resumen Ejecutivo y Diagnóstico Forense

Se ejecutó una auditoría forense integral de extremo a extremo (E2E) para resolver la anomalía en el inicio de sesión del portal **BlueSystem Merchant Web**, donde Firebase Authentication autenticaba al usuario exitosamente pero el motor EIAM denegaba el acceso de forma inmediata con la excepción:
```text
AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.
```

### Causa Raíz Confirmada
1. **Conflicto de Mapeo en Función de Resolución (`resolveEiamRole`):**  
   En [`functions/src/triggers/auth.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/auth.ts), el diccionario de normalización de roles omitía la clave canónica `"merchant_owner"`. Al sincronizarse cualquier cambio en `/users/{uid}` con `eiamRole: "MERCHANT_OWNER"`, la función resolvía el rol como `undefined`, degradándolo automáticamente al fallback `"CLIENT"`.
2. **Race Condition en Onboarding de Comercio:**  
   Cuando se aprobaba una solicitud de comercio ([`functions/src/triggers/merchantApplications.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts)), se escribía en `/users/{uid}` y se asignaban los claims canónicos. Sin embargo, el trigger asíncrono `setUserClaims` sobreescribía los claims de Firebase Auth con `role: "CLIENT"`.
3. **Sobrescritura Destructiva de Claims en `adminUpdateUser`:**  
   En [`functions/src/callables/admin.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts), la acción `setRole` establecía únicamente `{ role: eiamRole }`, eliminando los claims `businessId`, `orgId`, `branchId` y `tenantId`.
4. **Omisión de `orgId` en `setMembershipClaims`:**  
   El trigger de `/membership/{membershipId}` actualizaba `role`, `businessId` y `branchId`, pero omitía la propagación de `orgId` al token JWT.

---

## 2. UIDs Afectados y Estado de Identidad

| UID | Nombre / Contacto | Correo | Comercio Asociado | Estado `/membership` |
| :--- | :--- | :--- | :--- | :--- |
| `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | Aldrich Flores | `ventas@tecnocomp.com.ni` | `bbb760d5-a8f3-4700-9a96-f58f11f345ac` (*El Chanchito*) | 🟢 `ACTIVE` |
| `XWNzPT5p6fbf7reFdFBNTZoQrY42` | Junior Flores | `gflores@unan.edu.ni` | `e7dc911e-e587-4be9-a741-7d9d9828011f` (*Variedades TECNOHOME*) | 🟢 `ACTIVE` |
| `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | FRITONI | `fritonic@gmail.com` | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` (*FRITONI*) | 🔴 Sin membresía (Legacy) |
| `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | Kimberly Flores | `kim@gmail.com` | *N/A* (Deprovisioned) | 🔴 Sin membresía (Legacy) |

---

## 3. Matriz de Contrato Canónico (Antes vs Después)

| Campo | Firestore (`/membership`) | Custom Claims (Antes) | Custom Claims (Corregido) | Merchant Web Resolver | Estatus |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`role`** | `MERCHANT_OWNER` | ❌ `"CLIENT"` | 🟢 `"MERCHANT_OWNER"` | Valida contra `CanonicalRole` | 🟢 PASS |
| **`businessId`** | UUID del Comercio | UUID del Comercio | 🟢 UUID del Comercio | Coincide con `/membership.businessId` | 🟢 PASS |
| **`orgId`** | UUID de Organización | UUID de Organización | 🟢 UUID de Organización | Resuelve Organización activa | 🟢 PASS |
| **`branchId`** | UUID de Sucursal | UUID de Sucursal | 🟢 UUID de Sucursal | Resuelve Sucursal asignada | 🟢 PASS |
| **`tenantId`** | `null` | `null` | 🟢 `null` | Aislamiento multi-tenant | 🟢 PASS |

---

## 4. Estado de Colecciones en Firestore

* **`/organizations`**: 2 Holdings activos (`Grupo Flores`), vinculados con `ownerUid` y `businessIds`.
* **`/businesses`**: Documentos provisionados con `lifecycleStatus: "ACTIVE"` y `wizardCompleted: false`.
* **`/branches`**: Sucursales principales activas (`isPrimary: true`, `isActive: true`).
* **`/membership` (SSOT)**: 2 registros activos con matriz de 10 permisos canónicos (`VIEW_ORDERS`, `MANAGE_ORDERS`, `VIEW_MENU`, `MANAGE_MENU`, `VIEW_FINANCE`, `EXPORT_REPORT`, `MANAGE_EMPLOYEES`, `MANAGE_SETTINGS`, `VIEW_ANALYTICS`, `CLOSE_CASH_REGISTER`).
* **`/users`**: Dual-Write sincronizado (`role: "business"`, `rol: "business"`, `eiamRole: "MERCHANT_OWNER"`, `isActive: true`, `active: true`).

---

## 5. Correcciones de Código Implementadas

### A. Corrección de `resolveEiamRole` y `setMembershipClaims`
**Archivo:** [`functions/src/triggers/auth.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/auth.ts)
* Se integró `merchant_owner: "MERCHANT_OWNER"`, `business_owner: "MERCHANT_OWNER"`, `owner: "MERCHANT_OWNER"`, `business: "MERCHANT_OWNER"`, `merchant: "MERCHANT_OWNER"`.
* Se añadió `orgId: data.orgId ?? data.organizationId ?? currentClaims.orgId ?? null` en `setMembershipClaims`.

### B. Preservación de Contexto Tenant en `adminUpdateUser`
**Archivo:** [`functions/src/callables/admin.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts)
* La mutación de roles preserva `businessId`, `orgId`, `branchId` y `tenantId` existentes sin sobrescribirlos con valores nulos.

### C. Soporte Canónico en Reglas de Seguridad
**Archivo:** [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules)
* Se añadieron `"MERCHANT_OWNER"` a las funciones auxiliares `isBusinessAdmin()`, `isBusinessStaff()` y reglas de eliminación delegadas.

### D. Actualización de Pruebas Unitarias
**Archivo:** [`functions/src/__tests__/merchantApplications.test.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/merchantApplications.test.ts)
* Aserciones actualizadas para validar el contrato canónico `"MERCHANT_OWNER"`.

---

## 6. Evidencia de Token Refrescado y Acceso E2E

### Evidencia de Reconciliación en Firebase Auth
```json
// Token Claims verificados para UID qtlV8m8wj0ed0tQFXKzjfXKzQ5g2:
{
  "role": "MERCHANT_OWNER",
  "businessId": "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
  "orgId": "1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8",
  "branchId": "30945c9c-3aee-4e45-b35d-a998b57cf2fa",
  "tenantId": null
}

// Token Claims verificados para UID XWNzPT5p6fbf7reFdFBNTZoQrY42:
{
  "role": "MERCHANT_OWNER",
  "businessId": "e7dc911e-e587-4be9-a741-7d9d9828011f",
  "orgId": "75b145e5-17ec-4248-a085-c962a408db86",
  "branchId": "794f7c02-8077-40a8-b260-2fdd27a6f35d",
  "tenantId": null
}
```

### Evidencia de Resolución Exitosa en Merchant Web
```json
{
  "uid": "qtlV8m8wj0ed0tQFXKzjfXKzQ5g2",
  "orgId": "1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8",
  "businessId": "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
  "restaurantId": "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
  "branchId": "30945c9c-3aee-4e45-b35d-a998b57cf2fa",
  "membershipId": "2ff139e2-de9e-4641-b881-89209dc4e447",
  "role": "MERCHANT_OWNER",
  "permissions": [
    "VIEW_ORDERS", "MANAGE_ORDERS", "VIEW_MENU", "MANAGE_MENU",
    "VIEW_FINANCE", "EXPORT_REPORT", "MANAGE_EMPLOYEES",
    "MANAGE_SETTINGS", "VIEW_ANALYTICS", "CLOSE_CASH_REGISTER"
  ],
  "lifecycleStatus": "ACTIVE",
  "wizardCompleted": false
}
```

---

## 7. Batería de Pruebas Negativas (Tenant Isolation & Fail-Closed)

| ID | Escenario de Prueba | Comportamiento Esperado | Resultado |
| :--- | :--- | :--- | :--- |
| **NEG-01** | Token sin `businessId` | Rechazo con `AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.` | 🟢 **PASS** |
| **NEG-02** | Token sin `role` | Rechazo con `AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.` | 🟢 **PASS** |
| **NEG-03** | `businessId` inexistente | Rechazo con `SECURITY_ERROR: Tenant claim mismatch.` | 🟢 **PASS** |
| **NEG-04** | Tenant Cross-Access (Usuario Tenant A con claim de Tenant B) | Rechazo con `SECURITY_ERROR: Tenant claim mismatch.` | 🟢 **PASS** |
| **NEG-05** | Usuario Legacy sin `/membership` activo | Rechazo con `AUTHORIZATION_ERROR: No membership record found for this user identity.` | 🟢 **PASS** |
| **NEG-06** | Rol no canónico (`HACKER`) | Rechazo con `AUTH_ERROR: Role "HACKER" is not recognized as a valid CanonicalRole.` | 🟢 **PASS** |

**Resultado global:** 6/6 Pruebas Negativas superadas exitosamente.

---

## 8. Análisis de Riesgos de Regresión y Conclusiones

* **Compatibilidad Multi-Plataforma:**  
  * Android Cliente / Motorizado / Comercio: El Dual-Write en `/users/{uid}` (`role: "business"`, `rol: "business"`, `eiamRole: "MERCHANT_OWNER"`, `isActive: true`) preserva 100% la compatibilidad con las aplicaciones móviles.
  * Governance Center / Web Admin: La sincronización de roles respeta los identificadores empresariales y no altera permisos globales de plataforma.
* **Compilación y Construcción:**
  * Cloud Functions: `npm run build` $\rightarrow$ `tsc` finalizado con éxito (código 0).
  * Merchant Web: `npm run build` $\rightarrow$ `tsc && vite build` finalizado con éxito (código 0).

---

## 9. Declaración de Certificación Oficial

> Se certifica formalmente el cierre del **Sprint 17.3**.  
> La cadena de aprovisionamiento canónica `Governance Center → EIAM → Firebase Auth Claims → Merchant Web Resolver → Merchant Dashboard` opera bajo un contrato de identidad unificado, estricto, inmutable y aislado por tenant.
