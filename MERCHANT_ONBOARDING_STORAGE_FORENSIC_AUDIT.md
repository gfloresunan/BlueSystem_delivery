# BLUE SYSTEM DELIVERY — FORENSIC AUDIT REPORT
## Merchant Onboarding Portal: Firebase Storage Document Upload Failure

**Fecha de Auditoría:** 9 de Agosto de 2026  
**Auditor:** Senior Developer & Auditor de BlueSystem  
**Aplicación:** Merchant Onboarding Portal (`https://bluesystem-7c9af-apply.web.app/`)  
**Estado:** DIAGNÓSTICO AUDITADO — APROBADO CON MODIFICACIONES DE SEGURIDAD  

---

> [!IMPORTANT]
> **ESTADO DE ARQUITECTURA SEGURO:**
> El presente documento refleja los hallazgos forenses y la arquitectura de seguridad enterprise aprobada con las modificaciones solicitadas: aislamiento por `applicationId`, inmutabilidad con `resource == null`, almacenamiento de `storagePath` en Firestore en lugar de URLs públicas, y lectura restringida a Admin Panel via URLs firmadas temporales.

---

## 1. Root Cause (Causa Raíz)

La falla en la carga de documentos legales desde el portal de onboarding (`https://bluesystem-7c9af-apply.web.app/`) es provocada por la combinación de **tres causas raíz en cascada**:

### Causa Raíz Primaria (Configuration Mismatch & Invalid Bucket Endpoint)
En el archivo `merchant-onboarding-portal/src/firebase.ts`, las credenciales por defecto (*fallbacks*) apuntan a un proyecto y bucket inexistentes / de prueba:
- **`projectId` configurado:** `bluesystem-delivery`
- **`storageBucket` configurado:** `bluesystem-delivery.appspot.com`

Al no existir un archivo `.env` en el subproyecto `merchant-onboarding-portal/`, Vite compiló el artefacto de producción (`dist/assets/index-B-EPCvh5.js`) utilizando estos valores por defecto. Cuando la app intenta subir un documento, envía peticiones HTTP XHR al endpoint:
`https://firebasestorage.googleapis.com/v0/b/bluesystem-delivery.appspot.com/o?...`
Dado que el bucket `bluesystem-delivery.appspot.com` no corresponde al proyecto activo de GCP/Firebase (`bluesystem-7c9af`), el servidor de Google Cloud Storage responde con un código de error HTTP (404/400). El navegador web interpreta esta respuesta no exitosa en la solicitud preflight `OPTIONS` como una falla de política CORS (`net::ERR_FAILED`), bloqueando la petición POST.

### Causa Raíz Secundaria (Ausencia de Configuración CORS en el Bucket Real)
Incluso al corregir el endpoint al bucket real (`bluesystem-7c9af.firebasestorage.app`), Google Cloud Storage deniega por defecto peticiones de origen cruzado (Cross-Origin Resource Sharing) provenientes de dominios personalizados como `https://bluesystem-7c9af-apply.web.app`, a menos que se aplique explícitamente un objeto de configuración CORS en el bucket mediante `gcloud storage buckets update` o `gsutil cors set`.

### Causa Raíz Terciaria (Falta de Cobertura en Storage Security Rules)
El archivo de reglas `storage.rules` **no posee ninguna regla que cubra la ruta `merchant_applications_docs/**`**. Todas las solicitudes hacia esa ruta caen en la regla por defecto:
```cel
match /{allPaths=**} {
  allow read, write: if false;
}
```
Una vez solventados el bucket y CORS, la subida fallaría inmediatamente con HTTP 403 Forbidden (Permission Denied).

---

## 2. Evidence (Evidencia Forense)

1. **Credenciales en `merchant-onboarding-portal/src/firebase.ts` (Líneas 7-14):**
   ```typescript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoConfigKeyForBlueSystemApps",
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bluesystem-delivery.firebaseapp.com",
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bluesystem-delivery",
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bluesystem-delivery.appspot.com",
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
     appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcd1234efgh5678",
   };
   ```
2. **Inspección del Bundle de Producción Compilado (`merchant-onboarding-portal/dist/assets/index-B-EPCvh5.js`):**
   La cadena `bluesystem-delivery.appspot.com` se encuentra incrustada literalmente en el JavaScript desplegado en Firebase Hosting.
3. **Contraste con la Configuración Enterprise en el resto del proyecto:**
   - `.firebaserc`: Project `bluesystem-7c9af`, target `onboarding` -> `bluesystem-7c9af-apply`.
   - `app/google-services.json`: `project_id: "bluesystem-7c9af"`, `storage_bucket: "bluesystem-7c9af.firebasestorage.app"`.
   - `merchant-web/src/shared/services/firebase.ts`: `projectId: "bluesystem-7c9af"`, `storageBucket: "bluesystem-7c9af.firebasestorage.app"`.
   - `panel-admin/public/js/firebase-config.js`: `projectId: "bluesystem-7c9af"`, `storageBucket: "bluesystem-7c9af.firebasestorage.app"`.
4. **Inspección de `storage.rules` (Líneas 23-43):**
   Rutas configuradas: `/products/...`, `/vouchers/...`, `/avatars/...`.  
   Ruta `merchant_applications_docs/**`: **INEXISTENTE** (cae en fallback `allow read, write: if false;`).
5. **Mensaje de Error del Navegador:**
   `Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/bluesystem-delivery.appspot.com/o?...' from origin 'https://bluesystem-7c9af-apply.web.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status. POST ... net::ERR_FAILED`

---

## 3. Firebase Configuration

Matriz comparativa de inicialización Firebase en el proyecto:

| Componente | Project ID | Storage Bucket | Auth Domain | Estado de Configuración |
|---|---|---|---|---|
| **Android POS App** | `bluesystem-7c9af` | `bluesystem-7c9af.firebasestorage.app` | `bluesystem-7c9af.firebaseapp.com` | OK (Production) |
| **Merchant Web Portal** | `bluesystem-7c9af` | `bluesystem-7c9af.firebasestorage.app` | `bluesystem-7c9af.firebaseapp.com` | OK (Production) |
| **Admin Governance Panel** | `bluesystem-7c9af` | `bluesystem-7c9af.firebasestorage.app` | `bluesystem-7c9af.firebaseapp.com` | OK (Production) |
| **Firebase Hosting Target** | `bluesystem-7c9af` | N/A | `bluesystem-7c9af-apply.web.app` | OK (Production) |
| **Merchant Onboarding Portal** | `bluesystem-delivery` | `bluesystem-delivery.appspot.com` | `bluesystem-delivery.firebaseapp.com` | **ERRÓNEO / FALLBACK DEMO** |

### Confirmación de Bucket Definitivo
- **Bucket Inválido:** `bluesystem-delivery.appspot.com`
- **Bucket Definitivo Enterprise:** `bluesystem-7c9af.firebasestorage.app` (Bucket predeterminado activo de Firebase Web SDK v9+ para el proyecto `bluesystem-7c9af`).

---

## 4. Storage Rules & Security Architecture Analysis

Análisis de la ruta `merchant_applications_docs/{applicationId}/{fileName}` con modelo de seguridad endurecido:

1. **Aislamiento por `applicationId`:**  
   Se elimina el uso del email como identificador en el storage. Toda carga se aísla bajo la ruta `merchant_applications_docs/{applicationId}/{fileName}` (ejemplo: `merchant_applications_docs/APP-2026-000184/ruc.jpg`).
2. **Protección de Inmutabilidad con `resource == null`:**  
   Se requiere explícitamente `resource == null` en la regla de `create` para evitar la sobrescritura de archivos existentes. Un archivo cargado no se puede modificar.
3. **Privacidad de Lectura Pública:**  
   `read`, `update` y `delete` quedan en denegación absoluta para el público (`allow read, update, delete: if false;`). No se generan ni se guardan URLs públicas de descarga en el cliente.
4. **Trazabilidad en Firestore:**  
   El cliente envía a Firestore únicamente el metadato con `storagePath`: `merchant_applications_docs/APP-2026-000184/ruc.jpg`.
5. **Lectura por Administradores:**  
   Los administradores en el Governance Center consultan el documento a través del Admin SDK o URLs firmadas temporales (`getSignedUrl`).

---

## 5. Authentication & Privacy State

- **Portal Público:** El portal de Onboarding no exige autenticación previa.
- **Acciones Públicas Permitidas:** Únicamente `CREATE` de un nuevo documento bajo `merchant_applications_docs/{applicationId}/{fileName}` cumpliendo las condiciones de inmutabilidad, peso y tipo MIME.
- **Acciones Denegadas:** `READ` público ❌, `UPDATE` público ❌, `DELETE` público ❌.

---

## 6. Upload Implementation Specification

- **Path Final:** `merchant_applications_docs/${applicationId}/${documentId}.${ext}`
- **Método:** `uploadBytesResumable` o `uploadBytes`
- **Metadatos Registrados en Firestore:**
  ```json
  {
    "documentType": "RUC",
    "storagePath": "merchant_applications_docs/APP-2026-000184/ruc.jpg",
    "contentType": "image/jpeg",
    "size": 2843921,
    "uploadedAt": "2026-08-09T03:30:00.000Z",
    "status": "PENDING_REVIEW"
  }
  ```
- **Validaciones en Cliente (Pre-Upload):**
  - MIME permitidos: `image/jpeg`, `image/png`, `application/pdf`
  - Tamaños permitidos: `<= 10MB` (10 * 1024 * 1024 bytes)

---

## 7. CORS Configuration Specification

Bucket: `bluesystem-7c9af.firebasestorage.app`

`cors.json`:
```json
[
  {
    "origin": [
      "https://bluesystem-7c9af-apply.web.app",
      "https://bluesystem-7c9af.web.app",
      "https://bluesystem-7c9af-merchant.web.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "User-Agent",
      "x-goog-resumable"
    ],
    "maxAgeSeconds": 3600
  }
]
```

---

## 8. Regla de Almacenamiento Definitiva (`storage.rules`)

```cel
// ─── /merchant_applications_docs/{applicationId}/{fileName} (ADR-011 Enterprise) ─
match /merchant_applications_docs/{applicationId}/{fileName} {
  // Permitir la creación pública con inmutabilidad estricta (resource == null evita sobrescrituras)
  allow create: if resource == null
                && request.resource.size <= 10 * 1024 * 1024
                && request.resource.contentType.matches('image/(jpeg|png)|application/pdf');

  // Privacidad absoluta: prohibir lectura, modificación y eliminación pública
  // Solo la plataforma Admin (Governance Center / Cloud Functions) tiene acceso mediante Claims/Admin SDK
  allow read, update, delete: if request.auth != null &&
                                (request.auth.token.get("role", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR"]);
}
```

---

## 9. Plan de Ejecución Aprobado (5 Fases)

1. **FASE 1 — Configuration Repair:** Reparar `firebase.ts`, crear `.env` / `.env.production` con credenciales de `bluesystem-7c9af`, compilar y verificar que `bluesystem-delivery.appspot.com` desaparezca del directorio `dist/`.
2. **FASE 2 — Storage Security:** Desplegar regla inmutable en `storage.rules` para `merchant_applications_docs/{applicationId}/{fileName}`.
3. **FASE 3 — CORS:** Aplicar la configuración `cors.json` en `bluesystem-7c9af.firebasestorage.app`.
4. **FASE 4 — Upload Hardening:** Implementar aislamiento por `applicationId`, validaciones MIME + size pre-upload, generación de `storagePath` sin URL pública y guardado de metadatos en Firestore.
5. **FASE 5 — E2E Verification & Deployment:** Probar operaciones permitidas (JPG/PNG/PDF 2MB ✅) y bloqueadas (EXE/JS ❌, 15MB ❌, lectura pública ❌, update ❌). Recompilar y desplegar a Firebase Hosting.

---

**ESTADO: DIAGNÓSTICO SEGURO AUDITADO Y LISTO PARA EJECUCIÓN.**
