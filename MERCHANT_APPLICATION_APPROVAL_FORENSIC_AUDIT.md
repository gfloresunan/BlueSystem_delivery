# MERCHANT APPLICATION APPROVAL FORENSIC AUDIT

**Proyecto Target:** `bluesystem-7c9af`  
**ID Afectado:** `APP-MSLC53R4-K4ZS3`  
**Fecha Auditoría:** 2026-08-12  
**Modo:** READ-ONLY FORENSIC AUDIT (STOP CONDITION ACTIVE)  

---

## 1. ROOT CAUSE (Causa Raíz)

La causa raíz del error `FirebaseError: No document to update: projects/bluesystem-7c9af/databases/(default)/documents/merchant_applications/APP-MSLC53R4-K4ZS3` es una **desalineación de identificadores (ID Mapping Mismatch)** provocada por el orden de destructuración de objetos en el servicio del cliente.

En `panel-admin/public/js/services/governanceService.js` (Línea 253):
```javascript
snap.forEach(doc => {
    list.push({ appId: doc.id, ...doc.data() });
});
```

Al propagar `...doc.data()` **después** de `{ appId: doc.id }`, el campo interno `appId` que almacena el código legible generado por el portal cliente (`"APP-MSLC53R4-K4ZS3"`) **sobrescribe** la propiedad `appId` del objeto JavaScript con dicho valor en lugar de conservar la clave real del documento Firestore (`"McIq7vqVMwDlcLiw4q36"`).

Posteriormente, al hacer clic en el botón `⚡ Aprobar`, la interfaz gráfica pasa `app.appId` (`"APP-MSLC53R4-K4ZS3"`) a `governanceService.approveMerchantApplication(appId)`, el cual intenta ejecutar:
```javascript
db.collection('merchant_applications').doc('APP-MSLC53R4-K4ZS3').update({ status: 'APPROVED', ... });
```

Dado que el documento no existe en la ruta `/merchant_applications/APP-MSLC53R4-K4ZS3` (existe realmente en `/merchant_applications/McIq7vqVMwDlcLiw4q36`), el SDK de Firestore rechaza la actualización con la excepción `No document to update`.

---

## 2. EXACT FAILURE POINT (Punto Exacto de Falla)

- **Línea de UI:** `panel-admin/public/js/dashboard/governanceCenter.js` L2211  
  `<button onclick="governanceCenterModule.approveMerchantApp('${app.appId}')" ...>`  
  (Pasa `app.appId = "APP-MSLC53R4-K4ZS3"` en lugar del `doc.id` real `"McIq7vqVMwDlcLiw4q36"`).

- **Línea del Servicio Client Side:** `panel-admin/public/js/services/governanceService.js` L277  
  `await db.collection('merchant_applications').doc(appId).update({ status: 'APPROVED', ... });`  
  (Intenta actualizar una ruta de documento Firestore inexistente).

---

## 3. DOCUMENT EXISTENCE STATUS (Estado de Existencia del Documento)

- **Inspección Directa Firestore Backend (`bluesystem-7c9af`):**
  - Ruta `/merchant_applications/APP-MSLC53R4-K4ZS3`: 🔴 **`exists = false`**
  - Ruta real de Firestore `/merchant_applications/McIq7vqVMwDlcLiw4q36`: 🟢 **`exists = true`**

- **Datos del Documento Real (`McIq7vqVMwDlcLiw4q36`):**
  - `doc.id`: `"McIq7vqVMwDlcLiw4q36"`
  - `data.appId`: `"APP-MSLC53R4-K4ZS3"`
  - `data.businessName`: `"El Chanchito"`
  - `data.legalName`: `"Grupo Flores"`
  - `data.ruc`: `"J031003403434"`
  - `data.email`: `"ventas@tecnocomp.com.ni"`
  - `data.status`: `"PENDING"`
  - `data.createdAt`: `1786251778` (Seconds)

---

## 4. FRONTEND CALL CHAIN (Cadena de Llamadas Frontend)

```
HTML Click [dashboard.html]
    ↓
governanceCenterModule.approveMerchantApp('APP-MSLC53R4-K4ZS3') [governanceCenter.js:2261]
    ↓
governanceService.approveMerchantApplication('APP-MSLC53R4-K4ZS3', adminUid) [governanceService.js:275]
    ↓
db.collection('merchant_applications').doc('APP-MSLC53R4-K4ZS3').update(...) [governanceService.js:277]
    ↓
Firestore Client SDK Exception: "No document to update: projects/bluesystem-7c9af/.../APP-MSLC53R4-K4ZS3"
```

---

## 5. BACKEND CALL CHAIN (Cadena de Backend)

Dado que la actualización de Firestore del cliente falla en el navegador antes de modificar la base de datos, el trigger backend Cloud Function `onMerchantApplicationApproved` (`functions/src/triggers/merchantApplications.ts:147`) **NUNCA se activa** para esta solicitud.

```
Frontend Update
    ↓ (FAIL: No document to update)
[Firestore Document Unchanged (McIq7vqVMwDlcLiw4q36 status remains "PENDING")]
    ↓
Cloud Function trigger onMerchantApplicationApproved
    ↓ (NO SE INVOCA)
EIAM Provisioning / Email Dispatch
    ↓ (NO SE INVOCA)
```

---

## 6. FIRESTORE WRITE TRACE (Trazado de Escritura Firestore)

1. La operación intentada es `updateDoc` sobre `/merchant_applications/APP-MSLC53R4-K4ZS3`.
2. El método `.update()` en la SDK de Firestore requiere estrictamente que el documento exista previamente en la ruta especificada. Si no existe, la SDK no realiza un fallback a `set()` y devuelve inmediatamente la excepción `No document to update`.

---

## 7. TRIGGER TRACE (Trazado del Trigger)

- Trigger `onMerchantApplicationApproved` escuchando en `merchant_applications/{appId}`:
  - Estado: **0 ejecuciones**. El documento real `McIq7vqVMwDlcLiw4q36` no cambió de estado (sigue en `"PENDING"`).

---

## 8. POSSIBLE RACE CONDITIONS (Condiciones de Carrera)

- **Auditoría de Carrera:** 🔴 **No existe condición de carrera**.
- No hay escrituras paralelas ni eliminaciones simultáneas del documento. El documento `McIq7vqVMwDlcLiw4q36` está intacto en Firestore. El fallo es 100% determinista por usar una clave de ruta incorrecta.

---

## 9. ID MAPPING (Mapeo de Identificadores)

| Concepto | Valor Real | Definición |
|---|---|---|
| **Firestore Document ID Key (`doc.id`)** | `McIq7vqVMwDlcLiw4q36` | Clave primaria requerida para `.doc(id).update()` |
| **Field `appId` (Data Field)** | `APP-MSLC53R4-K4ZS3` | Código de solicitud generado en cliente para visualización |
| **Field `businessName`** | `El Chanchito` | Nombre comercial del negocio |

---

## 10. CURRENT STATUS MACHINE (Máquina de Estado Actual)

```
[Merchant Submitted] → status: "PENDING" (Doc ID: McIq7vqVMwDlcLiw4q36)
                           │
             Admin Clicks "⚡ Aprobar"
                           │
       (Frontend busca /merchant_applications/APP-MSLC53R4-K4ZS3)
                           │
                      🔴 ERROR
             "No document to update"
                           │
 [Estado Actual Permanece en "PENDING" sin sufrir ninguna alteración]
```

---

## 11. EMAIL FLOW IMPACT (Impacto en Envíos de Correo)

- **Impacto:** **BLOCKED** (Bloqueado únicamente porque la aprobación no llega a ejecutarse).
- Al no cambiar el estado a `"APPROVED"` en Firestore, la Cloud Function `onMerchantApplicationApproved` no se activa y no emite el correo `merchant_application_approved`.

---

## 12. PLACEHOLDER ERROR IMPACT (Impacto de la Advertencia de Imagen Placeholder)

- **URL Afectada:** `https://via.placeholder.com/150?text=Store`  
- **Origen en Código:** `panel-admin/public/js/dashboard/liveRestaurants.js:225` (`onError="this.src='...'"`).
- **Impacto:** 🟢 **NONE (Sin Impacto)**.
- Se debe a un tiempo de espera de red (`ERR_CONNECTION_TIMED_OUT`) al intentar descargar una imagen de marcador de posición externa desde un servicio de terceros. Es un evento completamente asíncrono e independiente que no interfiere con Firestore ni con la lógica de gobernanza.

---

## 13. SECURITY IMPACT (Impacto en Seguridad)

- **Impacto:** 🟢 **NONE**.
- El error no compromete datos, no abre vulnerabilidades de bypass y las reglas de seguridad de Firestore (`firestore.rules`) no participan en este error (no es `permission-denied`).

---

## 14. DATA INTEGRITY IMPACT (Impacto en Integridad de Datos)

- **Impacto:** 🟢 **NONE**.
- No se produjeron datos corruptos, no se crearon usuarios huérfanos ni se modificó ningún documento en la base de datos.

---

## 15. EXACT REMEDIATION RECOMMENDATION (Recomendación Exacta de Corrección)

*Nota: De acuerdo a las instrucciones de STOP CONDITION, esta corrección no se ha aplicado.*

Para corregir definitivamente el problema cuando se autorice el parche:

Invertir el orden de destructuración en `governanceService.getMerchantApplications()` (`panel-admin/public/js/services/governanceService.js:253`) para garantizar que `doc.id` prevalezca como el identificador primario de la aplicación o mapear explícitamente `id: doc.id`:

```javascript
// CORRECCIÓN RECOMENDADA:
snap.forEach(doc => {
    list.push({ ...doc.data(), appId: doc.id, customAppCode: doc.data().appId });
});
```

---

## 🛑 AUDIT CLOSURE STATEMENT

```
FORENSIC STATUS:
ROOT CAUSE IDENTIFIED

DOCUMENT STATUS:
EXISTS (Real Doc ID: McIq7vqVMwDlcLiw4q36)

FAILURE LOCATION:
FRONTEND (ID Mapping Mismatch in governanceService.js)

EMAIL IMPACT:
BLOCKED (Trigger not fired due to frontend update error)

PLACEHOLDER IMPACT:
NONE (Unrelated network timeout in liveRestaurants.js)

REMEDIATION:
READY (Awaiting approval, zero changes applied)

FILES MODIFIED:
0

DEPLOY:
NO

FINAL STATUS:
AUDIT COMPLETE — STOP CONDITION REACHED
```
