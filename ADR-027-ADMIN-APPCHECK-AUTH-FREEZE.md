# BLUE SYSTEM DELIVERY ENTERPRISE
## ARCHITECTURAL DECISION RECORD — ADR-027
### ADMIN WEB APP CHECK & RESILIENT AUTHENTICATION FREEZE
**Protocolo:** `BSD-ADMIN-APPCHECK-AUTH-FREEZE-001`  
**Estado:** 🟢 **CERTIFIED / CODE FREEZE / PROTECTED 🔒**  
**Fecha de Certificación:** 2026-09-22  
**Dominio Oficial:** `https://admin.bluesystemdelivery.com`  
**Target Hosting:** `admin` (`panel-admin/public`)  

---

## 1. Resumen Ejecutivo

Durante el acceso a la consola administrativa de BlueSystem Delivery (`https://admin.bluesystemdelivery.com`), se detectaron y resolvieron dos anomalías en el ciclo de inicialización y autenticación:
1. **Fallo de Atestación App Check:** `FirebaseError: AppCheck: ReCAPTCHA error. (appCheck/recaptcha-error)`.
2. **Fallo de Login por Microcorte de Red:** `POST https://securetoken.googleapis.com/v1/token net::ERR_CONNECTION_CLOSED 200 (OK)` derivado en `(auth/network-request-failed)`.

Ambas causas fueron diagnosticadas de forma forense, corregidas quirúrgicamente sin afectar componentes globales y certificadas en vivo en el navegador real bajo el protocolo **ADR-027**. Quedan formalmente **CONGELADAS E INMUTABLES**.

---

## 2. Diagnóstico Forense y Causa Raíz

### A. Condición de Carrera en App Check
- **Causa Raíz:** En `panel-admin/public/js/firebase-config.js`, los servicios `firebase.auth()`, `firebase.firestore()`, etc. se instanciaban **antes** de que se ejecutara `appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(...))`.
- **Efecto:** Los servicios intentaban resolver tokens de App Check antes de que el motor de reCAPTCHA Enterprise estuviera montado e inicializado en el DOM, disparando excepciones no controladas.

### B. Error de Red en Login (`net::ERR_CONNECTION_CLOSED`)
- **Causa Raíz:** En `panel-admin/public/js/auth.js`, tras completarse exitosamente `auth.signInWithEmailAndPassword(email, password)` (el cual ya devuelve un token JWT fresco con todos los Custom Claims), el código ejecutaba una llamada redundante:
  ```javascript
  await user.getIdToken(true); // Petición HTTP forzada e innecesaria a securetoken.googleapis.com
  ```
- **Efecto:** Ante cualquier reinicio de conexión TCP o latencia de red, esa segunda petición se cerraba abruptamente (`net::ERR_CONNECTION_CLOSED`), abortando el login del administrador.

---

## 3. Correcciones Quirúrgicas Aplicadas

1. **Orden Canónico de Inicialización (`firebase-config.js`):**
   - `firebase.appCheck().activate(...)` se ejecuta inmediatamente después de `firebase.initializeApp()` y **estrictamente antes** de instanciar `auth`, `db`, `storage` y `functions`.
   - Firma defensiva de dos callbacks en `appCheck.onTokenChanged(next, error)` para capturar notas de atestación sin arrojar errores no controlados.
2. **Lectura Atómica de Tokens y Resiliencia en Login (`auth.js`):**
   - Se eliminó la llamada redundante `await user.getIdToken(true)`.
   - Se implementó la lectura en memoria de los Custom Claims: `await user.getIdTokenResult(false)`.
   - Se añadió un mecanismo de reintento transparente ante microcortes transitorios (`auth/network-request-failed`).
3. **Cache-Busting y Despliegue:**
   - Se actualizaron las versiones en `index.html` y `dashboard.html` (`firebase-config.js?v=5.7.3`, `auth.js?v=5.1.3`).
   - Se desplegó exitosamente a Firebase Hosting (`hosting:admin`).

---

## 4. Evidencia de Certificación en Vivo (Consola Navegador)

```text
[APP_CHECK_AUDIT] Initializing App Check...
[APP_CHECK] Provider: reCAPTCHA Enterprise
[APP_CHECK] Host: admin.bluesystemdelivery.com
[APP_CHECK] App ID: 1:514416631826:web:ceff16519cecd24088b8cb
[APP_CHECK] Site key configured: true
[APP_CHECK] Activated successfully
[APP_CHECK_TOKEN] 🟢 Token acquired / refreshed successfully (attestation active)
[COMMERCE_SYNC] Servicio de Sincronización Atómica en Lote inicializado
[GEO_CATALOG] Catálogo Canónico Geográfico de Nicaragua inicializado (17 Departamentos)
[IMAGE_UTILS] Módulo de manejo seguro de imágenes inicializado
[AUTH_READY_GATE] 🟢 AUTH READY CERTIFIED: {uid: 'XWsjzZe8lsfthRQ5PgbDzlqA2nX2', email: 'geraldflores07@gmail.com', role: 'super_admin', claims: {…}, isPlatformAdmin: true}
```

---

## 5. Directiva Operativa de Blindaje (Code Freeze)

Queda **TERMINANTEMENTE PROHIBIDO** a cualquier desarrollador o agente de IA modificar, reorganizar o refactorizar:
- `panel-admin/public/js/firebase-config.js` (Orden de App Check)
- `panel-admin/public/js/auth.js` (Flujo de login y claims)
- Configuración de reCAPTCHA Enterprise Key (`6Ld84octAAAAAD7hM1x5bDfYDmEiRoarxyoBAP2X`) en Google Cloud
- Dominios autorizados en reCAPTCHA Enterprise

Cualquier intervención futura requerirá obligatoriamente una nueva orden explícita, auditoría forense previa y certificación E2E formal.

---
**Firmado y Certificado:**  
*Senior Developer & Auditor de BlueSystem v2.1 Enterprise*  
*Baseline Inmutable v2.3 Enterprise — STATUS: FROZEN / PROTECTED 🔒*
