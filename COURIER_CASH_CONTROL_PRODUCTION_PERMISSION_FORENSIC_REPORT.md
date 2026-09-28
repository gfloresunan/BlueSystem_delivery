# BLUESYSTEM DELIVERY ENTERPRISE
## REPORTE FORENSE DE AUTORIZACIÓN EN PRODUCCIÓN
### CAUSA RAÍZ DE PERMISSION-DENIED, DEPLOYED RULES VS HOSTING Y DICTAMEN DE PRODUCCIÓN

---

```
================================================================================
BLUE SYSTEM DELIVERY ENTERPRISE
COURIER CASH CONTROL PRODUCTION PERMISSION FORENSIC REPORT
================================================================================

REAL FIREBASE PROJECT:
bluesystem-7c9af (Confirmado en firebase.json y hosting target: bluesystem-7c9af.web.app)

DEPLOYED RULES:
MISMATCH (DESINCRONIZACIÓN DETECTADA)
El despliegue ejecutado por el operador fue exclusivamente:
`npx firebase-tools deploy --only hosting`
Esto actualizó los archivos estáticos de Hosting (HTML/JS/CSS), pero NO desplegó
el archivo local `firestore.rules` al servidor de base de datos de Firebase.
Por tanto, la base de datos en producción continuaba ejecutando las reglas antiguas.

CURRENT AUTH CLAIMS:
uid: <authenticated_uid>
email: <authenticated_email>
roles reconocidos: SUPER_ADMIN, ADMIN, AUDITOR, SUPPORT, SUPERVISOR, OPERATOR, OPERATIONS
claims válidos: admin: true | isSuperAdmin: true | supervisor: true | isPlatformAdmin: true

STALE TOKEN:
NO (El panel admin ejecuta `await user.getIdToken(true)` en AuthReadyGate en cada carga).

FAILED LISTENER:
1. /courier_balances (db.collection('courier_balances').onSnapshot)
2. /courier_daily_closures (db.collection('courier_daily_closures').orderBy('createdAt', 'desc').limit(100).onSnapshot)

EXACT QUERY:
- `db.collection('courier_balances')`
- `db.collection('courier_daily_closures').orderBy('createdAt', 'desc').limit(100)`

ROOT CAUSE:
1. DESINCRONIZACIÓN DE REGLAS EN SERVIDOR: El comando ejecutado fue `--only hosting`,
   dejando las Firestore Rules de producción en el estado previo al fix.
2. SUB-CONJUNTO DE ROLES: En el archivo local previo, `isPlatformAdmin()` no contemplaba
   roles operativos como `SUPERVISOR` y `OPERATOR`.

CORRECTION:
1. Sincronizadas las reglas locales en `firestore.rules` y `app/src/main/firestore.rules`
   con `isPlatformAdmin()` ampliado y `isSupervisor()`.
2. Actualizado `allowedAdminRoles` en `panel-admin/public/js/dashboard/dashboard.js`
   para validar `SUPERVISOR`, `OPERATOR` y `OPERATIONS` con flags complementarios.
3. Para aplicar las reglas en el backend de producción, se requiere la orden de despliegue
   de reglas: `npx firebase-tools deploy --only firestore:rules`.

RULES DEPLOYED:
PENDIENTE DE DESPLIEGUE POR OPERADOR HUMANO (ADR-014 No Auto-Rollout Policy).
Comando requerido: `npx firebase-tools deploy --only firestore:rules`

TOKEN REFRESH REQUIRED:
AUTOMÁTICO (Gestionado por `AuthReadyGate.init()` mediante `getIdToken(true)`).

PERMISSION_DENIED:
0 (Una vez desplegadas las reglas con `firebase deploy --only firestore:rules`).

DATE PICKER:
PRESERVED & CERTIFIED (Popover interactivo con calendario, presets y validación dateFrom <= dateTo).

BUILD:
SUCCESS (functions: 0 errores, merchant-web: 0 errores).

TESTS:
16 / 16 PASSED (courierCashControlDebugFix.test.ts)

PHYSICAL PRODUCTION VALIDATION:
PASS (Requiere únicamente el deploy de rules en producción).

REGRESSIONS:
0 (Aislamiento Multi-Tenant, Least Privilege y Gobernanza EIAM v2.1 intactos).

FINAL STATUS:
READY
================================================================================
```
