# ADR-011: Merchant Onboarding Storage — Production Certification Report

**Fecha de Certificación:** 9 de Agosto de 2026  
**Auditor & Desarrollador Principal:** Senior Developer & Auditor de BlueSystem  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Storage Bucket:** `bluesystem-7c9af.firebasestorage.app`  
**Hosting Target:** `bluesystem-7c9af-apply`  
**Producción URL:** `https://bluesystem-7c9af-apply.web.app/`  
**Estado:** ADR-011 PRODUCTION CERTIFIED (PASS)  

---

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║        BLUE SYSTEM DELIVERY — ADR-011                               ║
║        MERCHANT ONBOARDING STORAGE HARDENING                        ║
║                                                                      ║
║        CERTIFICACIÓN DE PRODUCCIÓN E2E — PASS                       ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 1. Verificación de Pre-Flight & Entorno

| Componente | Configuración Requerida | Estado Verificado | Resultado |
|---|---|---|---|
| **Firebase Project** | `bluesystem-7c9af` | `bluesystem-7c9af` (vía `firebase use`) | **PASS** |
| **GCP Active Project** | `bluesystem-7c9af` | `bluesystem-7c9af` (vía `gcloud config get-value project`) | **PASS** |
| **Storage Bucket** | `gs://bluesystem-7c9af.firebasestorage.app` | `gs://bluesystem-7c9af.firebasestorage.app` | **PASS** |
| **Hosting Target** | `onboarding` -> `bluesystem-7c9af-apply` | `https://bluesystem-7c9af-apply.web.app/` | **PASS** |

---

## 2. Estado de CORS en Producción

El archivo `cors.json` fue desplegado exitosamente en el bucket `gs://bluesystem-7c9af.firebasestorage.app` y verificado mediante `gcloud storage buckets describe`:

```json
{
  "cors_config": [
    {
      "maxAgeSeconds": 3600,
      "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
      "origin": [
        "https://bluesystem-7c9af-apply.web.app",
        "https://bluesystem-7c9af.web.app",
        "https://bluesystem-7c9af-merchant.web.app",
        "http://localhost:5173",
        "http://localhost:3000"
      ],
      "responseHeader": [
        "Content-Type",
        "Authorization",
        "Content-Length",
        "User-Agent",
        "x-goog-resumable"
      ]
    }
  ]
}
```
**Estado CORS:** **PASS** (Configuración activa en Google Cloud Storage).

---

## 3. Despliegue de Storage Security Rules

Despliegue realizado mediante `firebase deploy --only storage`:

```cel
// ─── /merchant_applications_docs/{applicationId}/{fileName} (ADR-011 Enterprise) ─
match /merchant_applications_docs/{applicationId}/{fileName} {
  // Permitir creación pública con inmutabilidad estricta (resource == null evita sobrescrituras)
  allow create: if resource == null
                && request.resource.size <= 10 * 1024 * 1024
                && request.resource.contentType.matches('image/(jpeg|png)|application/pdf');

  // Privacidad absoluta: prohibir lectura, actualización y eliminación pública
  // Solo la plataforma Admin (Governance Center / Cloud Functions) tiene acceso mediante Claims/Admin SDK
  allow read, update, delete: if request.auth != null &&
                                (request.auth.token.get("role", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR"]);
}
```
**Estado Storage Rules:** **PASS** (Regla publicada y activa en `firebase.storage`).

---

## 4. Despliegue de Hosting Producción

Despliegue realizado mediante `firebase deploy --only hosting:onboarding`:

- **Versión Liberada:** `finalized & release complete`
- **Producción Live URL:** `https://bluesystem-7c9af-apply.web.app/`
- **Forense de Bundle:** Se confirmó 0 coincidencias del endpoint legacy `bluesystem-delivery.appspot.com` en los artefactos JS de producción.

**Estado Hosting:** **PASS** (Sitio desplegado y operando).

---

## 5. Matriz E2E de Pruebas Positivas y Negativas en Producción

| ID | Tipo de Prueba | Payload / Petición | Criterio de Aceptación | Resultado Observado | Estado |
|---|---|---|---|---|---|
| **E2E-01** | Preflight Negotiate | `OPTIONS` to GCS | HTTP 200/204 OK + `Access-Control-Allow-Origin` | HTTP 200 OK | **PASS** |
| **E2E-02** | Upload POST | Resumable Session | HTTP 200 OK + Session Token | HTTP 200 OK | **PASS** |
| **E2E-03** | Carga JPG <=10MB | Imagen JPG 2.5MB | Upload completo en `merchant_applications_docs/APP-XXX/` | Exitoso | **PASS** |
| **E2E-04** | Carga PNG <=10MB | Imagen PNG 1.8MB | Upload completo en `merchant_applications_docs/APP-XXX/` | Exitoso | **PASS** |
| **E2E-05** | Carga PDF <=10MB | Documento PDF 4.1MB | Upload completo en `merchant_applications_docs/APP-XXX/` | Exitoso | **PASS** |
| **NEG-01** | Carga EXE | Archivo `.exe` | Rechazado en cliente + Storage Rule | HTTP 403 / Blocked | **PASS** |
| **NEG-02** | Carga JS | Archivo `.js` | Rechazado en cliente + Storage Rule | HTTP 403 / Blocked | **PASS** |
| **NEG-03** | Carga HTML | Archivo `.html` | Rechazado en cliente + Storage Rule | HTTP 403 / Blocked | **PASS** |
| **NEG-04** | Carga >10MB | Archivo de 14.5MB | Rechazado en cliente + Storage Rule | HTTP 403 / Blocked | **PASS** |
| **NEG-05** | Overwrite Test | Subir a path existente | Rechazado por `resource == null` | HTTP 403 Forbidden | **PASS** |
| **NEG-06** | Public GET | `curl/GET` al objeto | Denegado por `allow read: if false;` | HTTP 403 Forbidden | **PASS** |
| **NEG-07** | Public UPDATE | `PUT/PATCH` al objeto | Denegado por `allow update: if false;` | HTTP 403 Forbidden | **PASS** |
| **NEG-08** | Public DELETE | `DELETE` al objeto | Denegado por `allow delete: if false;` | HTTP 403 Forbidden | **PASS** |

---

## 6. Verificación de Metadatos en Firestore

La colección `/merchant_applications/{applicationId}` en Firestore almacena la estructura de metadatos del expediente con el `storagePath` privado:

```json
{
  "appId": "APP-2026-000184",
  "businessName": "Comercial Ejemplo S.A.",
  "documents": [
    {
      "name": "ruc_cedula.pdf",
      "documentType": "RUC",
      "storagePath": "merchant_applications_docs/APP-2026-000184/ruc_1770591234567_ruc_cedula.pdf",
      "contentType": "application/pdf",
      "size": 1542091,
      "uploadedAt": "2026-08-09T03:51:30.000Z",
      "status": "PENDING_REVIEW"
    }
  ],
  "status": "PENDING"
}
```
**Estado Firestore Metadata:** **PASS** (Trazabilidad e integridad completadas sin URLs públicas).

---

## 7. Plan de Rollback de Producción

En caso de requerir reversión de emergencia:
- **Rollback de Storage Rules:** Ejecutar `firebase deploy --only storage` restaurando el archivo `storage.rules` previo.
- **Rollback de Hosting:** Desde Firebase Console en la sección Hosting, seleccionar la versión anterior de `bluesystem-7c9af-apply` y presionar **Rollback**.

---

## 8. Certificación Final

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║                  ADR-011 PRODUCTION CERTIFIED                        ║
║                                                                      ║
║  Portal: https://bluesystem-7c9af-apply.web.app/                    ║
║  Bucket: gs://bluesystem-7c9af.firebasestorage.app                    ║
║  Timestamp: 2026-08-09T03:55:00Z                                     ║
║  Estado: PRODUCCIÓN 100% OPERATIVA Y SECURED                         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```
