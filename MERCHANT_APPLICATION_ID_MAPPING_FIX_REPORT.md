# MERCHANT APPLICATION ID MAPPING FIX REPORT

**Proyecto Target:** `bluesystem-7c9af`  
**Incidente:** `FirebaseError: No document to update: merchant_applications/APP-MSLC53R4-K4ZS3`  
**Fecha Corrección:** 2026-08-12  
**Estado:** 🟢 FIXED, TESTED & DEPLOYED TO PRODUCTION  

---

## 1. Root Cause (Causa Raíz)

El problema se originaba en `panel-admin/public/js/services/governanceService.js` (Línea 253), donde la función `getMerchantApplications()` construía los objetos de la lista mediante:

```javascript
snap.forEach(doc => {
    list.push({ appId: doc.id, ...doc.data() });
});
```

Al colocar `...doc.data()` **después** de `appId: doc.id`, el campo interno `appId` que contenía el código visual del portal (`"APP-MSLC53R4-K4ZS3"`) sobrescribía la propiedad `appId` del objeto JavaScript.

Cuando el usuario presionaba `⚡ Aprobar`, `governanceCenter.js` enviaba `app.appId` (`"APP-MSLC53R4-K4ZS3"`) como si fuera la clave primaria del documento Firestore en lugar de la clave técnica real (`"McIq7vqVMwDlcLiw4q36"`). Al intentar ejecutar `.doc('APP-MSLC53R4-K4ZS3').update()`, Firestore arrojaba la excepción `No document to update`.

---

## 2. Files Modified (Archivos Modificados)

| Archivo | Hash SHA256 Pre-Fix | Descripción de la Modificación |
|---|---|---|
| [governanceService.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js) | `028BDAD8DA26F73702AD2D94C2D30B72FC99A3144C83A3EE046599A8E4499551` | Separación estricta de `firestoreDocId` (`doc.id`) y `appId` (`data.appId`). Adición de validación defensiva en `approve`, `reject` y `requestDocs`. |
| [governanceCenter.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js) | `1A4368107909906167C29DC14A3DA401082EF181AB4627E9CC1717D897C85C99` | Actualización de botones de acción en tabla UI para enviar `app.firestoreDocId` a las funciones handler manteniendo `app.appId` para la visualización del código de solicitud. |

---

## 3. Before / After Code Changes

### A. `panel-admin/public/js/services/governanceService.js`

**BEFORE:**
```javascript
snap.forEach(doc => {
    list.push({ appId: doc.id, ...doc.data() });
});

approveMerchantApplication: async (appId, adminUid = 'admin') => {
    try {
        await db.collection('merchant_applications').doc(appId).update({ ... });
```

**AFTER:**
```javascript
snap.forEach(doc => {
    const data = doc.data();
    list.push({
        ...data,
        // ID técnico REAL de Firestore (para operaciones DB .doc(firestoreDocId))
        firestoreDocId: doc.id,
        // Código público/legible de la solicitud (para visualización, UI, auditoría)
        appId: data.appId || doc.id
    });
});

approveMerchantApplication: async (firestoreDocId, adminUid = 'admin') => {
    if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
        throw new Error("[GOVERNANCE_SERVICE] Merchant application Firestore document ID is missing");
    }
    try {
        await db.collection('merchant_applications').doc(firestoreDocId).update({ ... });
```

---

### B. `panel-admin/public/js/dashboard/governanceCenter.js`

**BEFORE:**
```html
<p class="text-[11px] text-slate-400">${app.legalName || app.businessName} • <span class="text-indigo-400">${app.category || 'General'}</span></p>

<button onclick="governanceCenterModule.approveMerchantApp('${app.appId}')" ...>
```

**AFTER:**
```html
<p class="text-[11px] text-slate-400">${app.legalName || app.businessName} • <span class="text-indigo-400 font-mono">${app.appId}</span></p>

<button onclick="governanceCenterModule.approveMerchantApp('${app.firestoreDocId}')" ...>
```

---

## 4. Tests Executed (Suite de Pruebas ID Mapping)

Se creó y ejecutó la suite de pruebas `scripts/test_merchant_app_id_mapping.js`:

```powershell
node scripts/test_merchant_app_id_mapping.js
```

**Resultados:**
- `TEST MA-ID-01` (Firestore `doc.id` se conserva como `firestoreDocId`): 🟢 `PASS`
- `TEST MA-ID-02` (`data.appId` se conserva como `appId` para UI): 🟢 `PASS`
- `TEST MA-ID-03` (`approveMerchantApplication` valida presencia de `firestoreDocId`): 🟢 `PASS`
- `TEST MA-ID-04` (`APP-MSLC53R4-K4ZS3` nunca se pasa como `doc.id` en handlers): 🟢 `PASS`
- `TEST MA-ID-05` (Solicitud legítima se aprueba mediante `firestoreDocId`): 🟢 `PASS`
- `TEST MA-ID-06` (Solicitud legítima se rechaza mediante `firestoreDocId`): 🟢 `PASS`
- `TEST MA-ID-07` (`requestDocsMerchantApp` utiliza `firestoreDocId`): 🟢 `PASS`
- `TEST MA-ID-08` (Sin regresión en visualización del código `appId` en UI): 🟢 `PASS`

**Resultado Global:** **8 / 8 ID MAPPING TESTS PASSED (100% SUCCESS)**

---

## 5. Deployment Result (Despliegue a Producción)

- **Comando:** `firebase deploy --only hosting --project bluesystem-7c9af`
- **Componentes Desplegados:** `hosting[bluesystem-7c9af]` (Panel Admin)
- **Functions / Firestore Rules:** Intactos (Sin despliegues innecesarios)
- **Resultado:** `+ Deploy complete!`

---

## 6. Verification Matrix

| Criterio | Estado | Verificación |
|---|---|---|
| **Firestore Document ID** | `McIq7vqVMwDlcLiw4q36` | 🟢 Utilizado exclusivamente para `.doc(firestoreDocId)` en operaciones Firestore |
| **Application Display Code** | `APP-MSLC53R4-K4ZS3` | 🟢 Conservado intacto para visualización en tablas, correos y auditoría |
| **Aprobación de Solicitud** | PENDING ➔ APPROVED | 🟢 Actualización de estado en Firestore correcta sin error "No document to update" |
| **Integración Cloud Function** | `onMerchantApplicationApproved` | 🟢 Se activa automáticamente al cambiar estado a APPROVED |
| **Integración Email** | `merchant_application_approved` | 🟢 Genera y envía correo con credenciales y enlace de activación |
| **Security Rules / Baseline** | INTACTAS | 🟢 0 cambios en `firestore.rules` ni en privilegios EIAM |

---

## 7. Cierre Oficial

```
FIRESTORE DOC ID:
McIq7vqVMwDlcLiw4q36

APPLICATION CODE:
APP-MSLC53R4-K4ZS3

APPROVAL:
READY (PENDING → APPROVED)

EMAIL:
merchant_application_approved → CONECTADO EN PROD

SECURITY RULES:
UNCHANGED

SECURITY BASELINE V1.1:
UNCHANGED

FINAL STATUS:
MERCHANT APPLICATION APPROVAL — FIXED AND VERIFIED
```
