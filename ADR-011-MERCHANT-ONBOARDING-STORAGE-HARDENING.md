# ADR-011: Merchant Onboarding Storage Hardening & Security Standard
## Architecture Decision Record — BlueSystem Delivery Enterprise v2.2

**Estado:** APROBADO E IMPLEMENTADO — Agosto 2026  
**Autor:** Senior Developer & Auditor BlueSystem  
**Prioridad:** P0 — Seguridad & Producción  
**Dependencias:** EIAM v2.2, ADR-004 (Architecture Freeze), ADR-010 (E2E Certification), ADR-011 (Merchant Onboarding Lifecycle)  

---

## 1. Contexto y Problema

Durante el despliegue del **Merchant Onboarding Portal** (`https://bluesystem-7c9af-apply.web.app/`), se detectó un fallo de producción en la carga de documentos legales de comercios. El navegador reportaba bloqueos por política CORS (`net::ERR_FAILED`) al realizar solicitudes preflight `OPTIONS` hacia Google Cloud Storage.

Una auditoría forense profunda (`MERCHANT_ONBOARDING_STORAGE_FORENSIC_AUDIT.md`) reveló tres causas fundamentales:
1. **Configuración Firebase Desalineada:** El subproyecto `merchant-onboarding-portal` utilizaba cadenas por defecto (*fallbacks*) apuntando al proyecto no existente `bluesystem-delivery` y al bucket `bluesystem-delivery.appspot.com`.
2. **CORS Desconfigurado:** El bucket de producción real `bluesystem-7c9af.firebasestorage.app` no poseía encabezados CORS autorizando peticiones cross-origin desde `https://bluesystem-7c9af-apply.web.app/`.
3. **Ausencia de Reglas de Almacenamiento:** El archivo `storage.rules` carecía de reglas para la ruta `merchant_applications_docs/**`, provocando el rechazo por defecto con HTTP 403.

Adicionalmente, se identificaron brechas de diseño en la gestión de archivos:
- Uso del correo electrónico (`cleanEmail`) como mecanismo de aislamiento en lugar de un identificador de solicitud.
- Ausencia de validación de inmutabilidad (riesgo de sobrescritura de documentos legales ya adjuntados).
- Ausencia de restricción de lectura pública de documentos privados (RUC, Cédulas, Permisos).

---

## 2. Decisión Arquitectónica

Se adopta e implementa oficialmente la **Estándar de Almacenamiento Seguro para Onboarding de Comercios (ADR-011 Hardening)** con los siguientes pilares fundamentales:

1. **Aislamiento Estricto por `applicationId`:**
   Todos los documentos cargados durante el proceso de afiliación se almacenan bajo la ruta determinista:
   `merchant_applications_docs/{applicationId}/{documentId}.{extension}`
   Descartando por completo el correo electrónico como clave de aislamiento.

2. **Inmutabilidad de Documentos (`resource == null`):**
   La regla de almacenamiento exige `resource == null` en la operación de creación (`create`). Un archivo subido a un expediente no puede ser sobrescrito por ninguna acción pública.

3. **Privacidad por Diseño (Sin URLs Públicas):**
   Queda estrictamente denegado el acceso público a `read`, `update` y `delete` (`allow read, update, delete: if false;` para el público). El cliente de Onboarding NO genera ni guarda URLs públicas (`getDownloadURL`). En su lugar, registra únicamente la ruta física (`storagePath`) en Firestore. Los administradores en el Governance Center consultan los expedientes a través del Admin SDK o URLs firmadas temporales (`getSignedUrl`).

4. **Validación Doble Capa (Cliente + Storage Rules):**
   - Tamaño máximo permitido: `10 MB` (`10 * 1024 * 1024` bytes).
   - Tipos MIME autorizados: `image/jpeg`, `image/png`, `application/pdf`.
   - Rechazo explícito de ejecutables (`.exe`, `.sh`, `.js`), código interpretado y metadatos maliciosos.

5. **Alinear Credenciales de Producción al Proyecto Activo:**
   Toda la configuración del subproyecto utiliza exclusivamente `bluesystem-7c9af` y `bluesystem-7c9af.firebasestorage.app`.

---

## 3. Arquitectura del Flujo de Documentos

```
┌────────────────────────────────┐
│   Merchant Onboarding Portal   │
│   (merchant-apply.bluesystem)  │
└───────────────┬────────────────┘
                │ Genera: applicationId (APP-2026-XXXXX)
                ▼
┌────────────────────────────────┐
│   Validación Local (JS)        │
│   ├─ MIME: JPG/PNG/PDF         │
│   └─ Peso: <= 10 MB            │
└───────────────┬────────────────┘
                │
                ├───────────────────────────────────────┐
                │ uploadBytesResumable                  │ Registra Metadatos
                ▼                                       ▼
┌────────────────────────────────┐    ┌───────────────────────────────────┐
│   Firebase Storage             │    │   Firestore                       │
│   merchant_applications_docs/  │    │   /merchant_applications/{appId}  │
│      {applicationId}/          │    │   documents: [                     │
│         {documentId}.ext       │    │     { storagePath, contentType,   │
│                                │    │       size, status, uploadedAt }  │
│   CREATE:                      │    │   ]                               │
│   - resource == null           │    └─────────────────┬─────────────────┘
│   - MIME valid                 │                      │
│   - size <= 10MB               │                      │ Consultan Expediente
│   READ/UPDATE/DELETE: Denegado │                      ▼
└────────────────────────────────┘    ┌───────────────────────────────────┐
                                      │   Governance Center (Admin Panel) │
                                      │   - Lectura vía Admin SDK        │
                                      │   - Generación de Signed URL     │
                                      └───────────────────────────────────┘
```

---

## 4. Reglas de Almacenamiento (`storage.rules`)

```cel
// ─── /merchant_applications_docs/{applicationId}/{fileName} (ADR-011 Enterprise) ─
match /merchant_applications_docs/{applicationId}/{fileName} {
  // Permitir creación desde el Portal de Onboarding (Público) con inmutabilidad estricta
  allow create: if resource == null
                && request.resource.size <= 10 * 1024 * 1024
                && request.resource.contentType.matches('image/(jpeg|png)|application/pdf');

  // Privacidad absoluta: prohibir lectura, actualización y eliminación pública
  // Solo la plataforma Admin (Governance Center / Cloud Functions) tiene acceso mediante Claims/Admin SDK
  allow read, update, delete: if request.auth != null &&
                                (request.auth.token.get("role", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR"]);
}
```

---

## 5. Configuración CORS (`cors.json`)

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

Comando de despliegue en GCP:
```bash
gcloud config set project bluesystem-7c9af
gcloud storage buckets update gs://bluesystem-7c9af.firebasestorage.app --cors-file=cors.json
```

---

## 6. Estrategia de Metadatos en Firestore

Cada solicitud registrada en la colección `/merchant_applications/{appId}` almacena la estructura de metadatos del expediente:

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
      "uploadedAt": "2026-08-09T03:36:00.000Z",
      "status": "PENDING_REVIEW"
    }
  ],
  "status": "PENDING",
  "createdAt": "SERVER_TIMESTAMP"
}
```

---

## 7. Pruebas y Verificación

### Pruebas Permitidas (PASS)
- ✅ Carga de imagen JPG de 2.5 MB bajo `merchant_applications_docs/APP-XXX/`
- ✅ Carga de imagen PNG de 1.8 MB bajo `merchant_applications_docs/APP-XXX/`
- ✅ Carga de documento PDF de 4.1 MB bajo `merchant_applications_docs/APP-XXX/`

### Pruebas de Seguridad y Negativas (BLOCK & DENY)
- ❌ Carga de archivo ejecutable `.exe` / `.js` / `.html` -> Rechazado en cliente y por Storage Rules (HTTP 403).
- ❌ Carga de archivo de 14.5 MB -> Rechazado en cliente y por Storage Rules (HTTP 403).
- ❌ Intento de sobrescritura de archivo existente -> Rechazado por `resource == null` en Storage Rules (HTTP 403).
- ❌ Consulta directa por HTTP GET sin token de Administrador -> Bloqueado con HTTP 403 Forbidden.

---

## 8. Consideraciones de Seguridad y Riesgos Residuales

- **Sanitización de Nombres:** Todos los nombres de archivo se sanitizan mediante regex `[^a-zA-Z0-9._-]` para prevenir ataques de *path traversal* (`../`).
- **Secretos en Frontend:** Ningún secreto privado o servicio de cuenta GCP se expone en la aplicación React/Vite. Las variables de entorno utilizadas son públicas por naturaleza (`VITE_FIREBASE_*`).
- **Auditoría de Inmunidad:** La inmutabilidad garantiza que los documentos presentados durante la afiliación no sufran alteración posterior por terceros.

---

**ESTADO: APROBADO E IMPLEMENTADO OFICIALMENTE EN BLUESYSTEM DELIVERY ENTERPRISE v2.2**
