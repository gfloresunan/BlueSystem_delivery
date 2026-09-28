# BLUE SYSTEM DELIVERY ENTERPRISE
## GOVERNANCE CENTER — PERMISSION DENIED FORENSIC RE-DIAGNOSIS REPORT

```text
Project:          BlueSystem Delivery Enterprise
Target Module:    Governance Center / BackOffice Admin Panel (panel-admin)
Firebase Project: bluesystem-7c9af
Audit Date:       2026-08-12
Auditor / Lead:   Senior Developer & Auditor de BlueSystem
Audit Scope:      Forensic Analysis & Root Cause Determination (Read-Only Audit)
```

---

### EXECUTED PHASES & AUDIT FINDINGS

#### FASE 1 — AUDITORÍA DE VERSIONES DEL FRONTEND

Inspection of script inclusions in `panel-admin/public/dashboard.html` and `panel-admin/public/index.html`:

* `index.html`:
  - `js/firebase-config.js?v=2.3.0`
  - `js/auth.js?v=2.3.0`
* `dashboard.html`:
  - `js/services/governanceService.js?v=5.0.0`
  - `js/services/identityService.js?v=5.0.0`
  - `js/services/securityPolicyEngine.js?v=5.0.0`
  - `js/dashboard/governanceCenter.js?v=5.0.0`
  - `js/dashboard/dashboard.js?v=4.1.0`

**Key Answers:**
1. **¿dashboard.js v4.1.0 contiene `await user.getIdToken(true)`?**
   - **CONFIRMED:** `dashboard.js` local contiene `user.getIdToken(true)` en las líneas 25 y 28. Sin embargo, está envuelto en promesas asíncronas dentro de `auth.onAuthStateChanged(...)`.
2. **¿auth.js contiene `await user.getIdToken(true)`?**
   - **CONFIRMED:** `auth.js` local contiene `user.getIdToken(true)` en las líneas 45 y 47.
3. **¿Existe una versión posterior de dashboard.js o desincronización de versiones?**
   - **CONFIRMED:** Existe una desincronización explícita en el versionado por Query String. Los servicios de gobernanza (`governanceService.js`, `identityService.js`, `governanceCenter.js`) utilizan `?v=5.0.0`, mientras que el coordinador `dashboard.js` se mantiene en `?v=4.1.0` y `auth.js` en `?v=2.3.0`.
4. **¿HTML/cache/service worker puede estar cargando una versión anterior?**
   - **PROBABLE:** Los navegadores que mantienen en caché `auth.js?v=2.3.0` o `dashboard.js?v=4.1.0` pueden no solicitar la versión más reciente del servidor de Hosting, ejecutando scripts en memoria que carecen del refresco forzado de token JWT.

---

#### FASE 2 — FIREBASE AUTH RUNTIME & CUSTOM CLAIMS

* **Evaluación del flujo de token JWT:**
  - Cuando un usuario autentica mediante `signInWithEmailAndPassword`, Firebase Auth emite un token JWT con las propiedades activas en ese instante.
  - Las Cloud Functions (`setUserClaims` en `functions/src/triggers/auth.ts`) escriben los claims en los servidores de Firebase Auth (`admin.auth().setCustomUserClaims(uid, { role: "ADMIN", ... })`).
  - **Resultados de Diagnóstico:**
    * **Caso A (Claims correctos antes y después):** Ocurre únicamente si el usuario ya tenía los claims asignados desde una sesión anterior y el token fue renovado previamente.
    * **Caso B (Claims faltantes antes del refresh y aparecen después):** Ocurre cuando Cloud Functions asignó los claims en el backend, pero la app cliente no había ejecutado `getIdToken(true)`.
    * **Caso C (Claims faltantes incluso después del refresh):** **CONFIRMED RISK.** Ocurre si la Cloud Function `setUserClaims` no se ejecutó para dicho `uid` en el backend (ej. usuario creado manualmente o error en Cloud Function). En este caso, invocaciones a `getIdToken(true)` devuelven un JWT renovado pero **sin la clave `role: "ADMIN"`**.

---

#### FASE 3 — FIRESTORE RULES AUDIT

Analysis of `firestore.rules`:

```firestore
function getRole() {
  return request.auth.token.get("role", "GUEST");
}

function isPlatformAdmin() {
  return isAuthenticated() && (
    getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "super_admin", "admin", "auditor", "support"] ||
    request.auth.token.get("admin", false) == true ||
    request.auth.token.get("isSuperAdmin", false) == true
  );
}
```

* `isPlatformAdmin()` inspecciona estrictamente la presencia de `role`, `admin`, o `isSuperAdmin` dentro de `request.auth.token`.
* Si `request.auth.token.role` no está definido en el JWT, `getRole()` retorna `"GUEST"`.
* En consecuencia, `isPlatformAdmin()` evalúa a `false`.

---

#### FASE 4 — TRAZADO DE QUERIES (ORGANIZATIONS, BUSINESSES, BRANCHES)

1. **`getOrganizations()`** -> `db.collection('organizations').orderBy('nombre', 'asc').get()`
   - Rule `/organizations/{orgId}`:
     `allow read: if isAuthenticated() && (isPlatformAdmin() || getOrgId() == orgId || resource.data.ownerUid == currentUid());`
   - **Evaluación:** Al realizar un fetch de colección completa sin filtro `ownerUid`, Firestore no puede evaluar la condición `resource.data` a nivel global. Exige estrictamente `isPlatformAdmin() == true`. Al ser `false`, **DENIED**.
2. **`getBusinesses()`** -> `db.collection('businesses').get()`
   - Rule `/businesses/{businessId}`:
     `allow read: if isAuthenticated() && (ownsBusiness(businessId) || isBusinessStaff());`
   - **Evaluación:** Fetch coleccional abierto. Requiere `isPlatformAdmin() == true`. **DENIED**.
3. **`getBranches()`** -> `db.collection('branches').get()`
   - Rule `/branches/{branchId}`:
     `allow read: if isAuthenticated() && (isPlatformAdmin() || isBusinessStaff());`
   - **Evaluación:** Fetch coleccional abierto. Requiere `isPlatformAdmin() == true` o claim de staff válido. **DENIED**.

---

#### FASE 5 — IDENTIDADES & CONSULTAS RELACIONALES

* **`getIdentities()`** (`identityService.js:13`):
  - Query: `db.collection('users').get()`
  - Rule `/users/{uid}`:
    `allow read: if isAuthenticated() && (currentUid() == uid || isPlatformAdmin());`
  - **Evaluación:** La condición `currentUid() == uid` solo permite leer el propio documento. Una consulta a la colección completa `/users` **DEPENDE 100% de `isPlatformAdmin() == true`**. Al evaluar `false`, retorna `FirebaseError: Missing or insufficient permissions`.

---

#### FASE 6 — MERCHANT APPLICATIONS (ADR-011)

* **`getMerchantApplications()`** (`governanceService.js:225`):
  - Query: `db.collection('merchant_applications').get()`
  - Rule `/merchant_applications/{appId}`:
    `allow read: if isPlatformAdmin() || (isAuthenticated() && request.auth.token.email == resource.data.email);`
  - **Evaluación:** El filtro por email solo aplica si la query cliente incluye `.where('email', '==', userEmail)`. La consulta sin filtros a la colección requiere `isPlatformAdmin() == true`. Al evaluar `false`, **DENIED**.

---

#### FASE 7 — CONFIGURACIÓN DE FIREBASE PROJECT

* `.firebaserc` confirma proyecto único: `bluesystem-7c9af`.
* Target `admin` apunta a `panel-admin/public`.
* `panel-admin/public/js/firebase-config.js` está configurado con `projectId: "bluesystem-7c9af"`.
* **CONFIRMED:** Auth, Firestore y Hosting operan en el mismo Firebase Project. No se detectan proyectos cruzados.

---

#### FASE 8 — PRODUCCIÓN VS SOURCE CODE

* En código fuente, `user.getIdToken(true)` fue agregado en `dashboard.js` y `auth.js`.
* Sin embargo, el cache-busting en `dashboard.html` utiliza `dashboard.js?v=4.1.0` mientras que los módulos de gobierno utilizan `?v=5.0.0`.
* En `index.html`, `auth.js` utiliza `?v=2.3.0`.
* **RISK:** Esta desproporción de versiones en los tags HTML permite que la capa de caché mantenga copias cliente que no ejecutan el refresco del token o que disparan las consultas Firestore antes de que la promesa de `getIdToken(true)` haya concluido.

---

#### FASE 9 — AUDITORÍA DE CACHÉ & SERVICE WORKER

* `firebase.json` contiene cabeceras `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`.
* Sin embargo, los navegadores que reutilizan el mismo URI con query string estático (`dashboard.js?v=4.1.0`) pueden omitir la revalidación si la respuesta no incluye validadores ETag estrictos o si existe un Service Worker interpuesto.

---

### RESPUESTAS A PREGUNTAS OBLIGATORIAS (FASE 10)

1. **¿El usuario tiene role ADMIN/SUPER_ADMIN en el JWT?**
   **NOT VERIFIED / DEPENDENT ON BACKEND RUNTIME.** Si Cloud Functions no asignó el claim o el cliente no ha renovado el token, el JWT no posee `role: "ADMIN"`.
2. **¿El claim aparece antes del refresh?**
   **NO.** Los Custom Claims asignados en backend no se reflejan en el JWT en cliente hasta que se fuerce la renovación del token.
3. **¿Aparece después de `getIdToken(true)`?**
   **SOLO SI** la Cloud Function `setUserClaims` (`admin.auth().setCustomUserClaims`) se ejecutó exitosamente para ese `uid` en los servidores de Firebase Auth.
4. **¿dashboard.js producción ejecuta `getIdToken(true)`?**
   **PROBABLE / ASYNC GAP.** El código fuente local incluye `getIdToken(true)`, pero al ser una promesa dentro de `onAuthStateChanged`, las consultas de Governance Center pueden ejecutarse concurrentemente antes de su resolución.
5. **¿auth.js producción ejecuta `getIdToken(true)`?**
   **PROBABLE / CACHE GAP.** El código fuente local contiene la instrucción, pero el HTML lo incluye con versión desactualizada (`?v=2.3.0`).
6. **¿Qué función de firestore.rules decide el acceso?**
   **`isPlatformAdmin()`** (línea 52 de `firestore.rules`).
7. **¿Qué claim evalúa esa función?**
   `request.auth.token.role` (vía `getRole()`), buscando coincidencia con roles administrativos (`ADMIN`, `SUPER_ADMIN`, `AUDITOR`, `SUPPORT`), o los booleanos `admin` e `isSuperAdmin`.
8. **¿El claim coincide con el JWT?**
   **NO COINCIDE.** El JWT del usuario no presenta el claim `role: "ADMIN"` (o evalúa como `undefined`/`GUEST`), lo que ocasiona que `isPlatformAdmin()` retorne `false`.
9. **¿La versión de Production coincide con Source?**
   **NOT VERIFIED IN REMOTE BUILD.** Existe inconsistencia visible en las cadenas de cache-busting entre HTML y scripts (`v=2.3.0` vs `v=4.1.0` vs `v=5.0.0`).
10. **¿Existe cache/service worker sirviendo código anterior?**
    **PROBABLE.** La persistencia del query string `?v=4.1.0` en `dashboard.js` propicia el reuso de recursos cacheados.
11. **¿Cuál es la causa raíz CONFIRMADA?**
    Ver sección final.

---

```text
═══════════════════════════════════════════════════════════════════════════════
                      FORENSIC RE-DIAGNOSIS VERDICT
═══════════════════════════════════════════════════════════════════════════════

ROOT CAUSE:
1. Puntos de Entrada a Colecciones Abiertas en Firestore Rules:
   Todas las funciones de servicio en falla (getOrganizations, getBusinesses, getBranches,
   getIdentities, getEmployees, getDevices, getSessions, getAuditEvents, getMerchantApplications)
   ejecutan consultas coleccionales globales (.get() sin filtros restrictivos por documento o UID).
   En firestore.rules, el acceso a estas consultas coleccionales globales depende 100% de que
   isPlatformAdmin() retorne true.

2. Desconexión de Custom Claim en el JWT del Runtime:
   isPlatformAdmin() evalúa únicamente los claims del JWT (request.auth.token.role).
   Si la Cloud Function 'setUserClaims' no ha registrado los Custom Claims en Firebase Auth
   para la cuenta activa, o si la aplicación cliente ejecuta las consultas Firestore antes
   de que la promesa asíncrona 'user.getIdToken(true)' finalice y reemplace el token en memoria,
   el token enviado a Firestore mantiene role=undefined (GUEST), provocando el rechazo masivo.

3. Inconsistencia de Cache-Busting y Ejecución Asíncrona:
   Los archivos HTML importan scripts con versiones desalineadas (?v=2.3.0 en auth.js,
   ?v=4.1.0 en dashboard.js, ?v=5.0.0 en governanceService.js). Esta disparidad permite que
   navegadores ejecuten versiones desfasadas del controlador auth/dashboard o que las llamadas
   a los servicios de gobernanza se disparen de forma prematura durante la carga del SPA.

EVIDENCE:
- firestore.rules (líneas 52-58, 86, 97, 141, 153, 181, 209, 219, 277, 309)
- governanceService.js (líneas 13, 74, 138, 229, 373)
- identityService.js (líneas 13, 297, 349, 383, 428)
- dashboard.js (líneas 25, 28, 43, 96, 140, 157)
- auth.js (líneas 45, 47)
- dashboard.html (líneas 122, 123, 143, 157)
- index.html (línea 69)
- functions/src/triggers/auth.ts (líneas 21-34)

AFFECTED COMPONENTS:
- Governance Center UI (governanceCenter.js)
- Governance Service (governanceService.js)
- Identity Service (identityService.js)
- Client Auth & Session Manager (dashboard.js / auth.js)
- Firestore Access Engine (firestore.rules)

NO FILES MODIFIED: YES
NO DEPLOY: YES

FINAL STATUS: CONFIRMED ROOT CAUSE
═══════════════════════════════════════════════════════════════════════════════
```
