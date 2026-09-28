# EIAM PRODUCTION FINAL FORENSIC VERIFICATION

**Proyecto Target:** `bluesystem-7c9af`  
**UID Administrador:** `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`  
**Email Administrador:** `geraldflores07@gmail.com`  
**Fecha Consulta:** 2026-08-12  
**Modo:** READ-ONLY AUDIT  

---

## 🛑 STOP CONDITION TRIGGERED

> [!CAUTION]
> **ESTADO CRÍTICO DETECTADO EN FIREBASE AUTH BACKEND**  
> La consulta forense directa al servidor de Firebase Auth (`identitytoolkit.googleapis.com` / `admin.auth().getUser("XWsjzZe8lsfthRQ5PgbDzlqA2nX2")`) confirmó que el usuario administrativo **NO TIENE Custom Claims definidos** (`customClaims` / `customAttributes` es `undefined`).  
>  
> Con la eliminación de los bypasses de correo en `dashboard.js` y `auth.js`, cualquier intento de autenticación con este usuario sin Custom Claims será rechazado con `AUTH_CLAIMS_INVALID`.

---

## 1. Evidencia Real del Servidor de Firebase Auth

**Consulta Ejecutada a la API de Firebase Identity Toolkit (`accounts:lookup`):**

- **Project ID:** `bluesystem-7c9af`
- **Target UID:** `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`
- **HTTP Status Code:** `200 OK`

### JSON Respuesta Real del Servidor:

```json
{
  "kind": "identitytoolkit#GetAccountInfoResponse",
  "users": [
    {
      "localId": "XWsjzZe8lsfthRQ5PgbDzlqA2nX2",
      "email": "geraldflores07@gmail.com",
      "displayName": "Gerald José Flores Gutiérrez",
      "photoUrl": "https://lh3.googleusercontent.com/a/ACg8ocL5A1sNmeKqTLQqP2AXOrmYZyWNnOPpqNnYGRxBNlocXHrA_rtM=s96-c",
      "emailVerified": true,
      "passwordUpdatedAt": 1784055723078,
      "providerUserInfo": [
        {
          "providerId": "google.com",
          "displayName": "Gerald José Flores Gutiérrez",
          "email": "geraldflores07@gmail.com",
          "federatedId": "112720329222935699750",
          "rawId": "112720329222935699750"
        },
        {
          "providerId": "password",
          "displayName": "Gerald José Flores Gutiérrez",
          "email": "geraldflores07@gmail.com",
          "federatedId": "geraldflores07@gmail.com",
          "rawId": "geraldflores07@gmail.com"
        }
      ],
      "validSince": "1784055723",
      "lastLoginAt": "1786556130628",
      "createdAt": "1784041682241",
      "lastRefreshAt": "2026-08-12T17:56:34.400839Z"
    }
  ]
}
```

---

## 2. Desglose de Claims en Servidor

| Atributo Claim | Valor Real en Firebase Auth Backend | Estado |
|---|---|---|
| `user.customClaims` | `undefined` (No existe el campo `customAttributes` en el registro) | 🛑 FALTANTE |
| `role` | `undefined` | 🛑 FALTANTE |
| `admin` | `undefined` | 🛑 FALTANTE |
| `isSuperAdmin` | `undefined` | 🛑 FALTANTE |
| `eiamRole` | `undefined` | 🛑 FALTANTE |

---

## 3. Impacto en JWT y Firestore Security Rules

1. **`user.getIdToken(true)` / `user.getIdTokenResult()`:**
   Al no existir claims en Firebase Auth, el token JWT generado para el UID `XWsjzZe8lsfthRQ5PgbDzlqA2nX2` **NO contiene la propiedad `role`** (`tokenResult.claims.role == undefined`).

2. **Firestore Security Rules (`firestore.rules:53-57`):**
   ```cel
   function isPlatformAdmin() {
     return isAuthenticated() && (
       getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "super_admin", "admin", "auditor", "support"] ||
       request.auth.token.get("admin", false) == true ||
       request.auth.token.get("isSuperAdmin", false) == true
     );
   }
   ```
   Debido a que `request.auth.token.role` es `undefined` y `admin` es `false`, la función `isPlatformAdmin()` en las reglas de Firestore evalúa a **`false`**.

3. **Acceso a Governance Center y Live Operations:**
   Sin los Custom Claims en el JWT, las consultas a `/orders`, `/users`, `/organizations`, etc., devolverán `FirebaseError: Missing or insufficient permissions`.

---

## 4. Conclusión Forense & Próximo Paso Obligatorio

- 🛑 **NO SE HA MODIFICADO CÓDIGO**
- 🛑 **NO SE HA MODIFICADO `firestore.rules`**
- 🛑 **NO SE HA HECHO DEPLOY**
- 🛑 **NO SE HAN CREADO FALLBACKS DE EMAIL NI UID**

**Requisito Previsto para Habilitar Producción:**
Se debe ejecutar el provisioning oficial de Custom Claims mediante Firebase Admin SDK en el backend para asignar los claims administrativos al UID `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`:

```javascript
// A ejecutar mediante Firebase Admin SDK en servidor confiable:
await admin.auth().setCustomUserClaims("XWsjzZe8lsfthRQ5PgbDzlqA2nX2", {
  role: "ADMIN",
  eiamRole: "ADMIN",
  admin: true,
  isSuperAdmin: true
});
```

Una vez ejecutado ese comando en Firebase Auth backend, el token JWT contendrá los claims requeridos y la arquitectura EIAM operará al 100% sin depender de ningún bypass.
