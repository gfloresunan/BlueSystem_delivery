# C2D.34 — Merchant Application Status
## Forensic Audit Report

```text
===================================================================
C2D.34 FORENSIC VERDICT
===================================================================

getMerchantApplicationStatus:

DEPLOYMENT:
    CONFIRMED (Deployed in us-central1, nodejs20, Cloud Functions v1)

REACHABILITY:
    CONFIRMED (HTTP 200/500 reached from frontend via httpsCallable)

INPUT CONTRACT:
    PASS (Frontend sends { email: string }, Function validates data.email)

FIRESTORE QUERY:
    FAIL (Unhandled FAILED_PRECONDITION: The query requires an index)

DOCUMENT RESOLUTION:
    NOT REACHED (Query aborts at database engine level before retrieving docs)

doc.id / appId:
    PASS (app.appId exists in schema; secondary resilience recommendation noted)

MAPPING:
    PASS (Return object schema aligns with frontend ApplicationStatusResult)

SERIALIZATION:
    PASS (Standard JSON primitives and Firestore Timestamps supported)

ERROR HANDLING:
    FAIL (No try/catch in Callable; unhandled error turns to HTTP 500 INTERNAL)

FRONTEND RESPONSE CONTRACT:
    PASS (Matches types, but UI error banner conflates 500 with 'Not Found')

ROOT CAUSE:
    CONFIRMED (Missing Firestore Composite Index on merchant_applications for email ASC + createdAt DESC)

SECONDARY CAUSE:
    CONFIRMED (Frontend StatusCheckPage hardcodes 'No se encontró información' for any error, including 500 INTERNAL)

HTTP 500 CAUSE:
    CONFIRMED (gRPC Error 9 FAILED_PRECONDITION thrown by Firestore SDK escaping unhandled to Firebase Functions Callable framework)

===================================================================
```

### 🔥 ROOT CAUSE EXACTA

- **Archivo:** `functions/src/callables/merchant.ts` (transpilado en `functions/lib/callables/merchant.js`)
- **Función:** `getMerchantApplicationStatus`
- **Línea / Bloque:** Líneas 473-478 de `functions/src/callables/merchant.ts` (líneas 326-331 de `functions/lib/callables/merchant.js`):
  ```typescript
  const snap = await db
    .collection("merchant_applications")
    .where("email", "==", data.email.toLowerCase().trim())
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  ```
- **Operación:** Ejecución de consulta Firestore (`Query.get()`) combinando filtro de igualdad (`.where("email", "==")`) con ordenamiento por un campo diferente (`.orderBy("createdAt", "desc")`).
- **Excepción:** `Error: 9 FAILED_PRECONDITION`
- **Mensaje:** `The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/bluesystem-7c9af/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9ibHVlc3lzdGVtLTdjOWFmL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9tZXJjaGFudF9hcHBsaWNhdGlvbnMvaW5kZXhlcy9fEAEaCQoFZW1haWwQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC`
- **Stack:**
  ```text
  Error: 9 FAILED_PRECONDITION: The query requires an index...
      at callErrorFromStatus (/workspace/node_modules/@grpc/grpc-js/build/src/call.js:31:19)
      at Object.onReceiveStatus (/workspace/node_modules/@grpc/grpc-js/build/src/client.js:357:73)
      at Object.onReceiveStatus (/workspace/node_modules/@grpc/grpc-js/build/src/client-interceptors.js:323:181)
      at /workspace/node_modules/@grpc/grpc-js/build/src/resolving-call.js:94:78
      at process.processTicksAndRejections (node:internal/process/task_queues:77:11)
  Caused by: Error
      at Query._get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1738:23)
      at Query.get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1726:21)
      at /workspace/lib/callables/merchant.js:331:10
      at /workspace/node_modules/firebase-functions/lib/common/onInit.js:33:16
      at fixedLen (/workspace/node_modules/firebase-functions/lib/v1/providers/https.js:77:47)
      at /workspace/node_modules/firebase-functions/lib/common/providers/https.js:458:32
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
  ```
- **Dato causante:** Cualquier string de email válido (ej. `"jbporcinos@bluesystemdelivery.com"`, `"contacto@pizzaroma.com"`).
- **Por qué ocurre:** En Google Cloud Firestore, cualquier consulta que combina una cláusula de igualdad (`==`) sobre un campo con una cláusula `orderBy()` sobre un campo distinto exige de forma obligatoria un índice compuesto en la colección (`collectionGroup: "merchant_applications"`, `email ASC`, `createdAt DESC`). Dicho índice no existe en el proyecto Firestore de producción (`bluesystem-7c9af`) ni está declarado en `firestore.indexes.json`. Al no existir un bloque `try/catch` que capture la excepción de Firestore en la Cloud Function, el runtime de Firebase Functions Callable convierte automáticamente el error no controlado en un `HTTP 500 Internal Server Error` con cuerpo `{ "error": { "message": "INTERNAL", "status": "INTERNAL" } }`. El SDK cliente de Firebase (`httpsCallable`) deserializa este estado y genera `FirebaseError: INTERNAL`.

---

## 1. Executive Summary

La auditoría forense independiente **C2D.34** (`BSD-C2D.34-MERCHANT-APPLICATION-STATUS-FORENSIC-001`) determinó de manera concluyente y con evidencia reproducible en logs de producción y entorno de pruebas de solo lectura la causa raíz del error `FirebaseError: INTERNAL (HTTP 500)` al consultar el estado de una solicitud en el portal de afiliación de comercios.

La función `getMerchantApplicationStatus` falla porque ejecuta una consulta de Firestore que requiere un **índice compuesto** (`email ASC`, `createdAt DESC`) que no existe en el clúster de Firestore. La ausencia de manejo de excepciones (`try/catch`) en la Cloud Function provoca que el error `FAILED_PRECONDITION` escale directamente al wrapper Callable de Firebase, el cual devuelve HTTP 500 con código de estado `INTERNAL`.

Asimismo, se identificó un defecto secundario de UX en el frontend (`merchant-onboarding-portal/src/pages/StatusCheckPage.tsx`): la UI asume que cualquier error recibido corresponde a "No se encontró información", concatenando debajo el mensaje crudo `"INTERNAL"`.

---

## 2. Production Evidence

Se recolectó la siguiente evidencia objetiva directa de producción:

1. **Invocación del Frontend:**
   - URL: `https://onboarding.bluesystemdelivery.com/status` (o localhost:5173/status)
   - Operación: Consulta de estado introduciendo correo electrónico de afiliación.
2. **Tráfico de Red (Network):**
   - Método: `POST`
   - Endpoint: `https://us-central1-bluesystem-7c9af.cloudfunctions.net/getMerchantApplicationStatus`
   - Código HTTP: `500 Internal Server Error`
   - Headers: `content-type: application/json`
3. **Respuesta del Servidor:**
   - Payload JSON: `{"error":{"message":"INTERNAL","status":"INTERNAL"}}`
4. **Log de Consola del Navegador:**
   - `Error consultando estado: FirebaseError: INTERNAL`
5. **Renderizado en UI:**
   - Título: `No se encontró información`
   - Mensaje: `INTERNAL`
6. **Logs de Google Cloud Functions (Producción 2026-09-03 18:02:03 UTC):**
   - Evento: `Unhandled error Error: 9 FAILED_PRECONDITION: The query requires an index.`
   - Duración: `4591 ms, finished with status code: 500`.

---

## 3. Audit Scope

La auditoría se circunscribió estrictamente al dominio de **Merchant Onboarding Status**:
- **Colección:** `/merchant_applications`
- **Cloud Function:** `getMerchantApplicationStatus` (`functions/src/callables/merchant.ts`)
- **Portal Frontend:** `merchant-onboarding-portal/src/pages/StatusCheckPage.tsx`
- **Configuración de Índices:** `firestore.indexes.json`
- **Reglas de Seguridad:** `firestore.rules` (evaluación de no afectación por Admin SDK)

---

## 4. Function Discovery

La función está localizada y estructurada de la siguiente manera:

1. **Definición Fuente:**
   - Archivo: [merchant.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L464-L504)
   - Export: `export const getMerchantApplicationStatus = functions.https.onCall(async (data: { email: string }) => { ... });`
2. **Registro y Export Principal:**
   - Archivo: [index.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/index.ts#L105)
   - Exportación: `export { ... getMerchantApplicationStatus } from "./callables/merchant";`
3. **Artefacto Compilado:**
   - Archivo: [merchant.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/lib/callables/merchant.js#L322-L350)
4. **Cliente Frontend:**
   - Archivo: [firebase.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/firebase.ts#L26)
   - Declaración: `export const getApplicationStatusCallable = httpsCallable(functions, 'getMerchantApplicationStatus');`
5. **Consumo en Vista:**
   - Archivo: [StatusCheckPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx#L23)

---

## 5. Frontend Contract

En [StatusCheckPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx#L23):
```typescript
const res: any = await getApplicationStatusCallable({ email: emailToSearch.trim() });
```
- **Parámetros enviados:**
  ```json
  {
    "email": "contacto@comercio.com"
  }
  ```
- **Expectativa de respuesta (`ApplicationStatusResult`):**
  - `success`: `boolean`
  - `applicationId`: `string`
  - `businessName`: `string`
  - `status`: `MerchantApplicationStatus`
  - `statusMessage`: `string`
  - `docsNote`: `string | null`
  - `rejectionReason`: `string | null`
  - `createdAt`: `any`
  - `updatedAt`: `any`

---

## 6. Callable Input Contract

En `functions/src/callables/merchant.ts` (L464-L471):
```typescript
export const getMerchantApplicationStatus = functions.https.onCall(
  async (data: { email: string }) => {
    if (!data.email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El email es requerido."
      );
    }
```

### Matriz de Contrato de Entrada

| Parámetro | Frontend Envía | Cloud Function Espera | Estado |
|---|---|---|---|
| `email` | `string` (trim) | `string` (requerido) | 🟢 PASS |
| `appId` | No enviado | No requerido | 🟢 PASS |
| `applicationId` | No enviado | No requerido | 🟢 PASS |
| `tenantId` | No enviado | No requerido | 🟢 PASS |
| `businessId` | No enviado | No requerido | 🟢 PASS |
| `uid` | No enviado | No requerido | 🟢 PASS |

*Nota de Resiliencia:* Si `data` llegara como `undefined` o `null` (por ejemplo, llamada POST sin body), la expresión `!data.email` provocaría `TypeError: Cannot read properties of undefined (reading 'email')`. No obstante, el SDK oficial de Firebase envía `{ email: ... }` envuelto en `{ data: { email: ... } }`, por lo que en el flujo estándar `data` es un objeto válido.

---

## 7. Firestore Query Audit

La consulta ejecutada en L473-478 es:
```typescript
const snap = await db
  .collection("merchant_applications")
  .where("email", "==", data.email.toLowerCase().trim())
  .orderBy("createdAt", "desc")
  .limit(1)
  .get();
```

### Análisis Técnico de la Query

| Parámetro | Valor en Código |
|---|---|
| Collection | `merchant_applications` |
| Field 1 (Filtro) | `email` |
| Operator 1 | `==` (Equality) |
| Field 2 (Orden) | `createdAt` |
| Direction 2 | `desc` (Descending) |
| Limit | `1` |
| Índice Requerido | `merchant_applications` -> `email` (ASC) + `createdAt` (DESC) |
| ¿Índice Existe en `firestore.indexes.json`? | **NO** (0 coincidencias) |
| ¿Índice Existe en Proyecto Remoto? | **NO** (comprobado en logs y reproducción) |
| Comportamiento del Motor | Lanza `9 FAILED_PRECONDITION` de forma síncrona en el streaming call gRPC |

---

## 8. Real Document Audit

Se inspeccionó la colección canónica `/merchant_applications` en modo **READ-ONLY**, identificando 7 documentos existentes con la siguiente estructura:

### Matriz de Documentos Existentes

| Document ID | `appId` | `email` | `status` | Tipo `createdAt` | Tipo `updatedAt` |
|---|---|---|---|---|---|
| `McIq7vqVMwDlcLiw4q36` | `APP-MSLC53R4-K4ZS3` | `ventas@tecnocomp.com.ni` | `ONBOARDING` | `Timestamp` | `Timestamp` |
| `UEltaH08PPauMnMczNTa` | `UEltaH08PPauMnMczNTa` | `vicenta@tecnocomp.com.ni` | `TERMINATED` | `Object` (`{_seconds,...}`) | `Timestamp` |
| `XEruTtRpcqXc6J9Tt2t8` | `XEruTtRpcqXc6J9Tt2t8` | `e2e_remediation_test_1@bluesystem.app` | `REJECTED` | `Timestamp` | `Timestamp` |
| `icmP7k8O9gbqIvEa1ZWY` | `icmP7k8O9gbqIvEa1ZWY` | `tecnostore@bluesystemdelivery.com` | `ONBOARDING` | `Timestamp` | `Timestamp` |
| `iqjC3eKa4gjwZmlrwoSb` | `iqjC3eKa4gjwZmlrwoSb` | `jbporcinos@bluesystemdelivery.com` | `ONBOARDING` | `Timestamp` | `Timestamp` |
| `rkul8qqr6ljKyf8W7eXW` | `rkul8qqr6ljKyf8W7eXW` | `gflores@unan.edu.ni` | `ONBOARDING` | `Timestamp` | `Timestamp` |
| `sPK3UOy6nFrurt4wzdSn` | `sPK3UOy6nFrurt4wzdSn` | `test@test.com` | `REJECTED` | `Timestamp` | `Timestamp` |

Todos los documentos contienen el campo `email` en minúsculas y el campo `status`. En 6 de los 7 documentos, `createdAt` es un objeto nativo de tipo `admin.firestore.Timestamp`.

---

## 9. doc.id vs appId Audit

Se verificó el patrón de identificación:
- En la creación de solicitudes (`submitMerchantApplication` L198-207):
  ```typescript
  const appRef = db.collection("merchant_applications").doc();
  await appRef.set({ appId: appRef.id, ... });
  ```
  El documento almacena `appId: appRef.id`, haciendo que por diseño `appId === doc.id`.
- Sin embargo, en el documento legacy `McIq7vqVMwDlcLiw4q36`, el campo `appId` es `'APP-MSLC53R4-K4ZS3'` mientras que `doc.id` es `'McIq7vqVMwDlcLiw4q36'`.
- En `getMerchantApplicationStatus` L492:
  ```typescript
  applicationId: app.appId,
  ```
  La función devuelve `app.appId`. Si un documento careciera del campo `appId`, devolvería `undefined`.
- **Conclusión de Auditoría:** La discrepancia `doc.id` vs `appId` **NO es la causa del HTTP 500**, ya que el fallo ocurre antes de que la consulta devuelva resultados. Sin embargo, constituye un punto de endurecimiento preventivo para el mapeo.

---

## 10. Timestamp Audit

- Los campos `createdAt` y `updatedAt` son generados en backend mediante `FieldValue.serverTimestamp()`.
- En `getMerchantApplicationStatus` se devuelven directamente:
  ```typescript
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
  ```
- No se ejecutan llamadas inseguras como `createdAt.toDate()` o `createdAt.toISOString()` sin verificación de null/undefined.
- El serializador de Firebase Functions Callable transforma instancias de `admin.firestore.Timestamp` en objetos serializables `{ _seconds: number, _nanoseconds: number }`.
- **Conclusión de Auditoría:** La manipulación de timestamps **NO es la causa del HTTP 500**.

---

## 11. Response Serialization Audit

El payload devuelto por `getMerchantApplicationStatus` es:
```typescript
return {
  success: true,
  applicationId: app.appId,
  businessName: app.businessName,
  status: app.status,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
  statusMessage: getStatusMessage(app.status),
  docsNote: app.status === "DOCS_REQUESTED" ? app.docsRequestedNote : null,
  rejectionReason: app.status === "REJECTED" ? app.rejectionReason : null,
};
```
Todos los campos son tipos primitivos JSON (`boolean`, `string`, `null`) u objetos de Timestamp compatibles con la serialización JSON de Firebase. Ninguno contiene referencias circulares, clases personalizadas ni `BigInt`.

---

## 12. Error Handling Audit

En `functions/src/callables/merchant.ts` (L464-L504):
- **Cero bloques `try/catch`:** La función carece por completo de captura de excepciones alrededor de `db.collection("merchant_applications").where(...).orderBy(...).get()`.
- **Comportamiento del runtime de Firebase Functions Callable:**
  Cuando se arroja una excepción que no es de tipo `functions.https.HttpsError` (como el error gRPC de Firestore), el runtime:
  1. Registra en stdout/stderr: `Unhandled error Error: 9 FAILED_PRECONDITION...`
  2. Ofusca el error para evitar fuga de información interna al cliente web.
  3. Responde al cliente con cabecera `HTTP 500` y payload:
     ```json
     {
       "error": {
         "message": "INTERNAL",
         "status": "INTERNAL"
       }
     }
     ```
  4. El SDK cliente de Firebase (`httpsCallable`) intercepta este código y emite:
     `FirebaseError: INTERNAL`

---

## 13. Cloud Function Logs

Logs extraídos directamente de Google Cloud Logging para `getMerchantApplicationStatus`:

```text
2026-09-03T18:01:59.227355744Z D getMerchantApplicationStatus: Function execution started
2026-09-03T18:01:59.400755Z D getMerchantApplicationStatus: {"message":"Callable request verification passed","verifications":{"app":"MISSING","auth":"MISSING"}}
2026-09-03T18:02:03.815495Z E getMerchantApplicationStatus: Unhandled error Error: 9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/bluesystem-7c9af/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9ibHVlc3lzdGVtLTdjOWFmL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9tZXJjaGFudF9hcHBsaWNhdGlvbnMvaW5kZXhlcy9fEAEaCQoFZW1haWwQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
    at callErrorFromStatus (/workspace/node_modules/@grpc/grpc-js/build/src/call.js:31:19)
    at Object.onReceiveStatus (/workspace/node_modules/@grpc/grpc-js/build/src/client.js:357:73)
    at Object.onReceiveStatus (/workspace/node_modules/@grpc/grpc-js/build/src/client-interceptors.js:323:181)
    at /workspace/node_modules/@grpc/grpc-js/build/src/resolving-call.js:94:78
    at process.processTicksAndRejections (node:internal/process/task_queues:77:11)
Caused by: Error
    at Query._get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1738:23)
    at Query.get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1726:21)
    at /workspace/lib/callables/merchant.js:331:10
2026-09-03T18:02:03.819045633Z D getMerchantApplicationStatus: Function execution took 4591 ms, finished with status code: 500
```

---

## 14. Exact Exception

- **Clase:** `GoogleError` / `StatusObject` (gRPC status code 9)
- **Código:** `9` (`FAILED_PRECONDITION`)
- **Detalle Oficial emitido por Firestore Engine:**
  `The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/bluesystem-7c9af/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9ibHVlc3lzdGVtLTdjOWFmL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9tZXJjaGFudF9hcHBsaWNhdGlvbnMvaW5kZXhlcy9fEAEaCQoFZW1haWwQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC`

---

## 15. Stack Trace

```text
Error: 9 FAILED_PRECONDITION: The query requires an index...
    at callErrorFromStatus (/workspace/node_modules/@grpc/grpc-js/build/src/call.js:31:19)
    at Object.onReceiveStatus (/workspace/node_modules/@grpc/grpc-js/build/src/client.js:357:73)
    at Object.onReceiveStatus (/workspace/node_modules/@grpc/grpc-js/build/src/client-interceptors.js:323:181)
    at /workspace/node_modules/@grpc/grpc-js/build/src/resolving-call.js:94:78
    at process.processTicksAndRejections (node:internal/process/task_queues:77:11)
for call at
    at ServiceClientImpl.makeServerStreamRequest (/workspace/node_modules/@grpc/grpc-js/build/src/client.js:340:32)
    at ServiceClientImpl.<anonymous> (/workspace/node_modules/@grpc/grpc-js/build/src/make-client.js:105:19)
    at /workspace/node_modules/@google-cloud/firestore/build/src/v1/firestore_client.js:227:29
    at /workspace/node_modules/google-gax/build/src/streamingCalls/streamingApiCaller.js:38:28
    at /workspace/node_modules/google-gax/build/src/normalCalls/timeout.js:44:16
    at Object.request (/workspace/node_modules/google-gax/build/src/streamingCalls/streaming.js:130:40)
    at makeRequest (/workspace/node_modules/retry-request/index.js:141:28)
    at retryRequest (/workspace/node_modules/retry-request/index.js:109:5)
    at StreamProxy.setStream (/workspace/node_modules/google-gax/build/src/streamingCalls/streaming.js:121:37)
    at StreamingApiCaller.call (/workspace/node_modules/google-gax/build/src/streamingCalls/streamingApiCaller.js:54:16)
Caused by: Error
    at Query._get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1738:23)
    at Query.get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1726:21)
    at /workspace/lib/callables/merchant.js:331:10
```

---

## 16. Frontend Error Handling

En `merchant-onboarding-portal/src/pages/StatusCheckPage.tsx`:

```tsx
// Líneas 22-34:
try {
  const res: any = await getApplicationStatusCallable({ email: emailToSearch.trim() });
  if (res.data && res.data.success) {
    setResult(res.data);
  } else {
    throw new Error('No se encontró ninguna solicitud para este correo.');
  }
} catch (err: any) {
  console.warn('Error consultando estado:', err);
  setError(err.message || 'No encontramos ninguna solicitud de afiliación registrada con este correo electrónico.');
}

// Líneas 154-162:
{error && (
  <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start space-x-4 animate-fade-in">
    <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
    <div>
      <h4 className="font-bold text-sm text-red-200">No se encontró información</h4>
      <p className="text-xs text-red-300/90 mt-1">{error}</p>
    </div>
  </div>
)}
```

### Análisis del Comportamiento en Frontend:
1. Cuando ocurre el fallo 500, el SDK de Firebase produce un error con `err.message = "INTERNAL"`.
2. El bloque `catch` asigna `setError("INTERNAL")`.
3. El componente renderiza de forma estática `<h4>No se encontró información</h4>`.
4. Justo debajo, inyecta `{error}`, renderizando el texto `"INTERNAL"`.
5. Esto explica de manera irrefutable por qué el usuario visualiza simultáneamente "No se encontró información" e "INTERNAL".

---

## 17. Root Cause Tree

```text
Usuario ingresa email en StatusCheckPage
        ↓
Click en "Consultar"
        ↓
StatusCheckPage.tsx::fetchStatus(email)
        ↓
getApplicationStatusCallable({ email })
        ↓ [POST /getMerchantApplicationStatus]
Cloud Functions Runtime (Node 20, us-central1)
        ↓
getMerchantApplicationStatus(data)
        ↓
Validación: data.email presente (PASS)
        ↓
db.collection("merchant_applications")
  .where("email", "==", email)
  .orderBy("createdAt", "desc")
  .limit(1)
  .get()
        ↓
🔥 FAILURE POINT 1 (Firestore Query Engine):
   Falta de Índice Compuesto en Firestore (email ASC + createdAt DESC)
   Lanza gRPC 9 FAILED_PRECONDITION
        ↓
🔥 FAILURE POINT 2 (Functions Error Handling):
   No existe bloque try/catch en getMerchantApplicationStatus
   Excepción no controlada escapa al framework
        ↓
Firebase Functions Callable Framework:
   Detecta error no controlado
   Mapea excepción a HTTP 500 con status "INTERNAL"
        ↓ [HTTP 500 Response]
Client Firebase SDK:
   Recibe 500 INTERNAL y lanza FirebaseError: INTERNAL
        ↓
StatusCheckPage.tsx catch(err):
   err.message = "INTERNAL"
   setError("INTERNAL")
        ↓
🔥 FAILURE POINT 3 (Frontend UX):
   Renderiza tarjeta roja con título estático "No se encontró información"
   y mensaje secundario "INTERNAL"
```

---

## 18. C2D.33 Relationship

- En actividades previas de Onboarding (C2D.33 / ADR-011) se auditó el flujo de creación de aplicaciones y la consistencia de `doc.id` vs `appId`.
- **Dependencia Causada:** En C2D.33 se definió que `submitMerchantApplication` ordenara las solicitudes y normalizara `email` a minúsculas (`email.toLowerCase().trim()`). Al introducir posteriormente la consulta con `.orderBy("createdAt", "desc")` en `getMerchantApplicationStatus`, no se incorporó el índice compuesto en `firestore.indexes.json`.
- **Relación:** `C2D.33 DEPENDENCY DETECTED` (Evolución de esquema sin migración de índices de Firestore).

---

## 19. Security / Auth Assessment

- **Autenticación requerida:** Ninguna. `getMerchantApplicationStatus` es intencionalmente una función pública para que los postulantes verifiquen su trámite sin necesidad de contar aún con credenciales de acceso a Merchant Web.
- **Seguridad y Reglas:** La función opera mediante Firebase Admin SDK en el entorno Cloud Functions, por lo que no está limitada por `firestore.rules`.
- **EIAM / Claims:** No depende de roles ni claims de usuario.
- **Veredicto de Seguridad:** `Firestore Rules: NOT ROOT CAUSE`. `Auth/EIAM: NOT ROOT CAUSE`.

---

## 20. Impact Assessment

| Funcionalidad | Estado de Impacto | Evidencia |
|---|---|---|
| [x] Usuario puede registrar comercio | **OPERATIVO** | `submitMerchantApplication` persiste con éxito en Firestore |
| [ ] Usuario puede consultar estado | **BLOQUEADO (100%)** | Todo request termina en HTTP 500 |
| [ ] Usuario puede ver PENDING | **BLOQUEADO** | El resultado nunca llega a la UI |
| [ ] Usuario puede ver APPROVED | **BLOQUEADO** | El resultado nunca llega a la UI |
| [ ] Usuario puede ver REJECTED | **BLOQUEADO** | El resultado nunca llega a la UI |
| [ ] Usuario puede continuar documentación | **BLOQUEADO** | `docsNote` no puede ser consultado |
| [x] Admin puede aprobar solicitudes | **OPERATIVO** | `panel-admin` consulta directamente sin este endpoint |
| [x] Merchant puede ser provisionado | **OPERATIVO** | Triggers y Cloud Functions de aprovisionamiento independientes |
| [x] Estado se mantiene en Firestore | **OPERATIVO** | Los documentos en `/merchant_applications` están íntegros |

---

## 21. Evidence Matrix

| Evidence ID | Evidencia | Fuente | Resultado |
|---|---|---|---|
| **E-001** | HTTP POST a endpoint callable | DevTools / Cloud Logs | `POST /getMerchantApplicationStatus` enviado con `{ email: "..." }` |
| **E-002** | Código de respuesta HTTP 500 | DevTools / Cloud Logs | `HTTP 500 Internal Server Error` devuelto por Cloud Functions |
| **E-003** | Error en consola del cliente | Browser Console | `FirebaseError: INTERNAL` emitido por Firebase Callable SDK |
| **E-004** | Código fuente Cloud Function | `functions/src/callables/merchant.ts` | Línea 473-478: `.where("email", "==").orderBy("createdAt", "desc")` sin `try/catch` |
| **E-005** | Configuración de Índices | `firestore.indexes.json` | 0 índices definidos para la colección `merchant_applications` |
| **E-006** | Inspección de documentos reales | Firestore Database (Read-Only) | 7 documentos en `/merchant_applications`, datos y estados íntegros |
| **E-007** | Logs de producción de Cloud Functions | Google Cloud Logging (`firebase functions:log`) | `Unhandled error Error: 9 FAILED_PRECONDITION: The query requires an index.` |
| **E-008** | Stack trace en logs | Google Cloud Logging | `at Query.get (/workspace/node_modules/@google-cloud/firestore/build/src/reference.js:1726:21)` |
| **E-009** | Código fuente Frontend | `merchant-onboarding-portal/src/pages/StatusCheckPage.tsx` | Título hardcodeado "No se encontró información" con cuerpo `{error}` |
| **E-010** | Reproducción controlada | Script de solo lectura en entorno Node | Falla con `9 FAILED_PRECONDITION` con `orderBy`; tiene éxito inmediato sin `orderBy` |

---

## 22. Root Cause Classification

- **Clasificación Primaria:**
  🔴 **`B. Firestore Query Exception`** / **`L. Configuration Error`**
  *(Ausencia del índice compuesto requerido por Firestore para queries combinadas de igualdad y ordenamiento descendente).*
- **Clasificación Secundaria:**
  🔴 **`P. Frontend Error Handling`**
  *(Enmascaramiento de errores de servidor e infraestructura como "No se encontró información").*

---

## 23. Secondary Findings

1. **Falta de Índice en `firestore.indexes.json`:** El archivo contiene 240 líneas de índices para `orders`, `products`, `coupons`, etc., pero omitió por completo la colección `merchant_applications`.
2. **Ausencia de Bloque `try / catch` en Cloud Function:** La función no atrapa errores de Firestore ni los empaqueta en `functions.https.HttpsError`, imposibilitando mensajes diagnósticos controlados hacia el cliente.
3. **Manejo de Error Monolítico en Frontend:** El componente `StatusCheckPage.tsx` no discrimina entre `not-found` (solicitud inexistente) y errores `internal` / `unavailable` / conectividad.
4. **Resiliencia de `appId`:** En caso de solicitudes registradas con estructuras antiguas, `app.appId` podría ser `undefined` si se guardó como `doc.id`. Debe considerarse `applicationId: app.appId || snap.docs[0].id`.
5. **Validación de Parámetro `data`:** La validación `if (!data.email)` fallaría con `TypeError` si la función se invoca con `data = null`.

---

## 24. Recommended Repair Boundary

*(Nota de Gobernanza: Esta sección delimita el alcance exclusivo para la fase posterior. Ningún cambio ha sido implementado).*

- **Archivos Objetivo:**
  1. `firestore.indexes.json` (declaración del índice compuesto oficial).
  2. `functions/src/callables/merchant.ts` (manejo de query, try/catch y fallback resiliente).
  3. `merchant-onboarding-portal/src/pages/StatusCheckPage.tsx` (diferenciación de errores en UI).
- **Naturaleza del Cambio:**
  - Agregar índice compuesto en `firestore.indexes.json`:
    ```json
    {
      "collectionGroup": "merchant_applications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
    ```
  - Envolver la consulta de `getMerchantApplicationStatus` en `try / catch` estructurado.
  - Alternativa sin costo de índice: Ejecutar la consulta filtrando únicamente por `where("email", "==", cleanEmail)` y ordenar en memoria por `createdAt` en Node.js (dado que un comercio tiene típicamente 1 o muy pocas solicitudes asociadas).
  - En `StatusCheckPage.tsx`, mostrar mensaje de error técnico cuando el código sea `INTERNAL`, en lugar de afirmar que no se encontró información.
- **Riesgo:** Extremadamente bajo, limitado exclusivamente al módulo de consulta de solicitudes de comercio.
- **Prueba Necesaria:** Ejecutar consulta por email existente y verificar respuesta exitosa con badge de estado; ejecutar consulta con email inexistente y verificar mensaje controlado "No se encontró ninguna solicitud registrada".

---

## 25. Certification Gate

```text
===================================================================
C2D.34 — CERTIFICATION GATE
===================================================================

Estado Final:
    🟢 ROOT CAUSE CONFIRMED

Causa Raíz Confirmada:
    Error 9 FAILED_PRECONDITION (Falta de índice compuesto en Firestore
    para collection 'merchant_applications', fields 'email' ASC + 'createdAt' DESC).

Evidencia Objetiva:
    - Stack trace exacto obtenido de logs de producción de Cloud Functions.
    - Reproducción controlada en script de solo lectura.
    - Confirmación en firestore.indexes.json (0 entradas para merchant_applications).
    - Código fuente identificado en merchant.ts (L473-478) y StatusCheckPage.tsx (L29-31, L158-159).

===================================================================
```

---

## 26. Repair Boundary Specification

```text
REPAIR REQUIRED:
    YES

ROOT FILE:
    functions/src/callables/merchant.ts (y firestore.indexes.json)

ROOT FUNCTION:
    getMerchantApplicationStatus

ROOT BLOCK:
    Líneas 473-485

CHANGE TYPE:
    Optimización de query / incorporación de índice / manejo resiliente de errores

EXPECTED EFFECT:
    La función devolverá HTTP 200 con el payload completo del estado de la solicitud
    en lugar de HTTP 500 INTERNAL.

SIDE EFFECT RISK:
    Ninguno. La función es de solo lectura y opera aislada en el módulo de onboarding.

REGRESSION RISK:
    Cero regresión sobre orders, deliveryTrips, billing o fleet core.

REQUIRED TEST:
    Verificación E2E de consulta de solicitud en StatusCheckPage con email existente y no existente.

ESTADO:
    NO IMPLEMENTAR DURANTE ESTA FASE.
```

---

```text
===================================================================
C2D.34 — ZERO MUTATION CERTIFICATION
===================================================================

Source Code Mutations:
    0

Firestore Mutations:
    0

Storage Mutations:
    0

Rules Mutations:
    0

Claims Mutations:
    0

Environment Changes:
    0

Deployments:
    0

Function Redeployments:
    0

Configuration Changes:
    0

Data Migrations:
    0

Status:
    🔒 READ-ONLY CERTIFIED

===================================================================
```
