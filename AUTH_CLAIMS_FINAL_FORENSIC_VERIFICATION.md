# BLUE SYSTEM DELIVERY ENTERPRISE
## FINAL AUTH CLAIMS FORENSIC VERIFICATION REPORT

**Fecha de Auditoría:** 2026-08-12  
**Proyecto Firebase Target:** `bluesystem-7c9af`  
**Usuario Auditado:**  
- **UID:** `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`  
- **EMAIL:** `geraldflores07@gmail.com`  
**Método de Verificación:** Consulta directa vía Firebase Admin SDK (`admin.auth().getUser(uid)`) e inspección directa en backend con credenciales ADC de proyecto.  
**Estado de Modificación:** READ-ONLY — CERO MODIFICACIONES REALIZADAS.

---

### 1. EVIDENCIA FORENSE DIRECTA (Firebase Admin SDK)

La ejecución directa del método `admin.auth().getUser("XWsjzZe8lsfthRQ5PgbDzlqA2nX2")` en el proyecto `bluesystem-7c9af` arrojó el siguiente resultado empírico:

```json
{
  "uid": "XWsjzZe8lsfthRQ5PgbDzlqA2nX2",
  "email": "geraldflores07@gmail.com",
  "displayName": "Gerald José Flores Gutiérrez",
  "emailVerified": true,
  "disabled": false,
  "customClaims": undefined
}
```

#### Detalle de Presencia / Ausencia de Claims Requeridos:

| Campo Claim | Estado en Firebase Auth | Valor |
| :--- | :--- | :--- |
| `role` | **AUSENTE** | `undefined` |
| `admin` | **AUSENTE** | `undefined` |
| `isSuperAdmin` | **AUSENTE** | `undefined` |
| `eiamRole` | **AUSENTE** | `undefined` |
| `businessId` | **AUSENTE** | `undefined` |
| `branchId` | **AUSENTE** | `undefined` |
| `orgId` | **AUSENTE** | `undefined` |

---

### 2. MATRIZ DE COMPARACIÓN Y ANÁLISIS DE DISCREPANCIA

Se compararon de forma independiente las 4 fuentes de datos de autorización para la identidad `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`:

| Fuente | Contenido / Valor | Estado de Autorización |
| :--- | :--- | :--- |
| **A. Firebase Auth Custom Claims** | `customClaims: undefined` | Sin atributos ni roles configurados en Authentication Server. |
| **B. Firestore `/users/{uid}`** | `role: "admin"`, `rol: "admin"`, `userType: "admin"`, `active: true` | Documento en base de datos declara rol administrativo `admin`. |
| **C. JWT Token (`getIdTokenResult()`)** | Token emitido carece de campos `role`, `admin`, `isSuperAdmin`, `businessId`, `branchId`, `orgId`. | El token decodificado solo posee claims estándar (`sub`, `email`, etc.), sin el payload EIAM. |
| **D. `firestore.rules` (`isPlatformAdmin()`)** | Requiere `request.auth.token.role` en roles autorizados, o `request.auth.token.admin == true`, o `request.auth.token.isSuperAdmin == true`. | **EVALÚA A `FALSE`**. Las reglas rechazan las peticiones protegidas por `isPlatformAdmin()`. |

#### Diagnóstico de Discrepancia:
Existe una **discrepancia crítica de inconsistencia de datos de identidad** entre la capa de persistencia Firestore (donde el usuario tiene `role: "admin"`) y la capa de autenticación Firebase Auth (donde `customClaims` es `undefined`).

Como consecuencia directa, cuando el cliente realiza peticiones evaluadas por Security Rules (`firestore.rules`), la función `isPlatformAdmin()` retorna `false` porque `request.auth.token` carece de las propiedades de custom claims.

---

### 3. ESTADO FINAL OBLIGATORIO

```text
CLAIMS_MISSING:
Los Custom Claims requeridos no existen realmente en Firebase Auth.
```

---

> [!IMPORTANT]
> **STOP CONDITION ATALCANZADA:**
> No se aplicó `setCustomUserClaims()`.
> No se modificaron archivos del sistema.
> No se modificaron reglas `firestore.rules`.
> No se realizó ningún deploy.
> Se aguarda explícitamente la autorización del usuario antes de proceder con cualquier parche.
