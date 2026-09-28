# APP CHECK HTTP 400 ROOT CAUSE REPORT

**Proyecto Firebase / GCP:** `bluesystem-7c9af` (Project Number: `514416631826`)  
**Fecha de Diagnóstico:** 2026-08-16  
**Modulo Evaluado:** Panel Admin Web (`bluesystem-7c9af.web.app`)  
**Estado de Modificaciones:** **NINGUNA MODIFICACIÓN REALIZADA (Fase 1: Diagnóstico Forense Estricto)**

---

## 1. Captura Forense del Error HTTP 400 (Google App Check API)

### A. Endpoint Invocado
```http
POST https://content-firebaseappcheck.googleapis.com/v1/projects/bluesystem-7c9af/apps/1:514416631826:web:788b99430f87324e88b8cb:exchangeRecaptchaEnterpriseToken?key=AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI
```

### B. HTTP Status Code
`HTTP 400 Bad Request`

### C. Request Payload (Enviado por SDK App Check)
```json
{
  "recaptchaEnterpriseToken": "<TOKEN_GENERADO_POR_RECAPTCHA_ENTERPRISE>"
}
```

### D. Response Body EXACTO (Devuelto por Google Firebase App Check)
```json
{
  "error": {
    "code": 400,
    "message": "App not registered: 1:514416631826:web:788b99430f87324e88b8cb.",
    "status": "FAILED_PRECONDITION"
  }
}
```

### E. Response Headers Relevantes
- `content-type`: `application/json; charset=UTF-8`
- `server`: `ESF`
- `vary`: `X-Origin, Referer, Origin, Accept-Encoding`
- `x-content-type-options`: `nosniff`
- `x-frame-options`: `SAMEORIGIN`
- `x-xss-protection`: `0`

---

## 2. Inspección del Archivo de Configuración (`panel-admin/public/js/firebase-config.js`)

Se verificaron las constantes de inicialización utilizadas en producción:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:788b99430f87324e88b8cb" // <-- APP ID EN CONFIGURACIÓN
};
```

- **`projectId`**: `"bluesystem-7c9af"` (**COINCIDE EXACTAMENTE**)
- **`authDomain`**: `"bluesystem-7c9af.firebaseapp.com"`
- **`messagingSenderId`**: `"514416631826"`
- **`appId` configurado actualmente**: `1:514416631826:web:788b99430f87324e88b8cb`

---

## 3. Verificación de Aplicaciones Registradas en Proyecto Firebase (`bluesystem-7c9af`)

Ejecución CLI en directo via Firebase CLI (`firebase apps:list --project=bluesystem-7c9af`):

```text
┌─────────────────────────┬───────────────────────────────────────────────┬──────────┐
│ App Display Name        │ App ID                                        │ Platform │
├─────────────────────────┼───────────────────────────────────────────────┼──────────┤
│ BlueSystem Delivery     │ 1:514416631826:android:788b99430f87324e88b8cb │ ANDROID  │
├─────────────────────────┼───────────────────────────────────────────────┼──────────┤
│ ai-studio-applet-webapp │ 1:514416631826:web:58e784a0e8e4867e88b8cb     │ WEB      │
├─────────────────────────┼───────────────────────────────────────────────┼──────────┤
│ BlueSystem Web          │ 1:514416631826:web:ceff16519cecd24088b8cb     │ WEB      │
└─────────────────────────┴───────────────────────────────────────────────┴──────────┘
```

### Hallazgo Crítico de Identidad
1. La aplicación web oficial de Firebase llamada **"BlueSystem Web"** tiene el App ID:  
   `1:514416631826:web:ceff16519cecd24088b8cb`
2. La aplicación Android llamada **"BlueSystem Delivery"** tiene el App ID:  
   `1:514416631826:android:788b99430f87324e88b8cb`
3. El archivo `firebase-config.js` del Panel Admin contiene:  
   `1:514416631826:web:788b99430f87324e88b8cb`

> [!CAUTION]
> El App ID `1:514416631826:web:788b99430f87324e88b8cb` **NO EXISTE EN FIREBASE**.  
> Se produjo por un error de tipado donde se combinó el prefijo `:web:` con el sufijo `788b99430f87324e88b8cb` perteneciente a la app **Android**.

---

## 4. Verificación de reCAPTCHA Enterprise Key en Google Cloud

Inspección directa de la clave en GCP mediante `gcloud recaptcha keys list --project=bluesystem-7c9af`:

```json
[
  {
    "createTime": "2026-08-16T01:39:42Z",
    "displayName": "BlueSystem Delivery Admin Web",
    "name": "projects/514416631826/keys/6Ld84octAAAAAD7hM1x5bDfYDmEiRoarxyoBAP2X",
    "webSettings": {
      "allowAllDomains": false,
      "allowAmpTraffic": false,
      "allowedDomains": [
        "bluesystem-7c9af.web.app"
      ],
      "integrationType": "SCORE"
    }
  }
]
```

- **Proyecto GCP**: `514416631826` (`bluesystem-7c9af`) (**CORRECTO**)
- **Site Key**: `6Ld84octAAAAAD7hM1x5bDfYDmEiRoarxyoBAP2X` (**CORRECTO**)
- **Tipo de Integración**: `SCORE` (Score-based: SÍ, Checkbox challenge: NO) (**CORRECTO**)
- **Dominio Autorizado**: `bluesystem-7c9af.web.app` (**CORRECTO**)

---

## 5. Verificación de APIs Habilitadas en Google Cloud

Inspección de servicios activos (`gcloud services list --enabled`):

1. **`firebaseappcheck.googleapis.com`**: `ENABLED` (Firebase App Check API)
2. **`recaptchaenterprise.googleapis.com`**: `ENABLED` (reCAPTCHA Enterprise API)

---

## 6. Demostración Empírica Comparativa (Prueba de Invocación Directa)

### Prueba A: Con el App ID actual de `firebase-config.js` (`1:514416631826:web:788b99430f87324e88b8cb`)
- **Petición**: `POST https://content-firebaseappcheck.googleapis.com/v1/projects/bluesystem-7c9af/apps/1:514416631826:web:788b99430f87324e88b8cb:exchangeRecaptchaEnterpriseToken`
- **Resultado HTTP**: **`HTTP 400 Bad Request`**
- **Error JSON**:
  ```json
  {
    "error": {
      "code": 400,
      "message": "App not registered: 1:514416631826:web:788b99430f87324e88b8cb.",
      "status": "FAILED_PRECONDITION"
    }
  }
  ```

### Prueba B: Con el App ID Real de "BlueSystem Web" (`1:514416631826:web:ceff16519cecd24088b8cb`)
- **Petición**: `POST https://content-firebaseappcheck.googleapis.com/v1/projects/bluesystem-7c9af/apps/1:514416631826:web:ceff16519cecd24088b8cb:exchangeRecaptchaEnterpriseToken`
- **Resultado HTTP**: **`HTTP 403 Permission Denied`** (Respuesta esperada al enviar un token de prueba sin atestar, confirmando que la aplicación **SÍ está registrada y reconocida por App Check**).

---

## 7. Causa Raíz Definitiva

**Escenario Confirmado:** `Escenario G / A - Firebase Web App ID no registrado`

La falla `HTTP 400 Bad Request` **NO** se debe a la Site Key de reCAPTCHA Enterprise, **NO** se debe a dominios no autorizados, **NO** se debe a APIs deshabilitadas, ni a las reglas de Firestore.

La causa exacta y comprobada es:
> El archivo `panel-admin/public/js/firebase-config.js` está utilizando un `appId` inexistente (`1:514416631826:web:788b99430f87324e88b8cb`). Cuando el SDK de Firebase App Check intenta intercambiar el token de reCAPTCHA con el backend de Google Firebase App Check (`content-firebaseappcheck.googleapis.com`), el servidor rechaza la solicitud inmediatamente con HTTP 400 porque esa Web App ID no existe registrada en el proyecto Firebase.

---

## 8. Acción Correctiva Recomendada (A la espera de autorización)

1. En el archivo `panel-admin/public/js/firebase-config.js`, reemplazar la línea 8:
   ```diff
   - appId: "1:514416631826:web:788b99430f87324e88b8cb"
   + appId: "1:514416631826:web:ceff16519cecd24088b8cb"
   ```
2. Desplegar la actualización del Panel Admin a Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

---
**Firmado por:** Senior Developer & Auditor de BlueSystem v2.1 Enterprise
