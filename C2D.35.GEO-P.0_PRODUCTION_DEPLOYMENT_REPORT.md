# C2D.35.GEO-P.0 — PRODUCTION DEPLOYMENT REPORT
**CONTROLLED PRODUCTION DEPLOYMENT & GEO ISOLATION RELEASE**

- **FECHA Y HORA**: 2026-09-04 10:56:45 CST (16:56:45 UTC)
- **TARGET ENVIRONMENT**: PRODUCTION
- **FIREBASE PROJECT ID**: `bluesystem-7c9af`
- **BASELINE**: `C2D.35.GEO-R.2` / `C2D.35.GEO-C.2`
- **AUTORIZACIÓN**: Orden humana explícita (Principio de Despliegue Mínimo Necesario)
- **ESTADO DE PRODUCCIÓN**: 🟢 **PRODUCTION DEPLOYED** *(Certificación real reservada para C2D.35.GEO-C.3)*

---

## 1. Baseline y Estado Pre-Deployment

| Verificación Previa | Resultado | Evidencia Física |
| :--- | :---: | :--- |
| **Compilación Backend (`tsc`)** | 🟢 PASS | `npm run build` finalizado con Exit Code 0 |
| **Suite de Pruebas GEO** | 🟢 PASS | 22/22 tests PASS (`cityIsolationSecurity.test.ts`) |
| **Validación Estática `firestore.rules`** | 🟢 PASS | Parseo y arranque limpios en Firebase Firestore Emulator |
| **Integridad Courier Core (ADR-016)** | 🟢 INTACT | 0 modificaciones en `FirebaseManager.kt:107-132` (`claimOrderAtomically`) |
| **Integridad X→Y Delivery (ADR-015)** | 🟢 INTACT | 0 modificaciones en `/deliveryTrips` ni en `claimTripAtomically` |
| **Confirmación de Proyecto Firebase** | 🟢 PASS | Confirmado `bluesystem-7c9af` (Producción) vía `firebase use` |

---

## 2. Artefactos Modificados por GEO-R.2

1. **`firestore.rules`**:
   - `/businesses`: Separación en `allow get` (detalle individual) y `allow list` (exige `municipalityId != ""`).
   - `/branches`: Separación en `allow get` y `allow list` (exige `municipalityId != ""`).
   - `/orders`: Validación pre-commit para `COMMERCE_DELIVERY` que exige `commercialMunicipalityId == destinationMunicipalityId`, existencia de comercio, y correspondencia soberana de sucursal (`branch.businessId == order.businessId` y `branch.municipalityId == commercialMunicipalityId`).
   - `/users/{uid}`: Blindaje de claves sensibles no mutables por el usuario (`operationalMunicipalityId`, `municipalityId`, `cityId`, `departmentId`, `tenantId`, etc.).
2. **`functions/src/domain/geo/geoCatalog.ts`**:
   - Purgado absoluto del fallback hardcodeado a `MANAGUA`. Comportamiento fail-closed: retorna `""` o `null` si la entrada es inválida.
3. **`panel-admin/public/js/utils/geoCatalog.js`**:
   - Normalización espejo en portal web administrativo eliminando fallback a Managua.
4. **`functions/src/triggers/orders.ts`**:
   - `notifyNewOrder`: Verificación de Branch Substitution y Kill-Switch intramunicipal post-commit con cancelación atómica y `/audit_events`.
   - `notifyOrderStatusChange`: Segmentación de FCM por topic municipal `fleet_{tenantId}_{municipalityId}` con guard fail-closed que aborta el broadcast si el municipio es nulo/vacío (eliminando difusión a `available_orders`).
5. **`app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`**:
   - Comportamiento fail-closed en UI: si no hay municipio seleccionado en dirección, retorna `emptyList()` en lugar de catálogo nacional.

---

## 3. Inventario Físico de Cloud Functions Desplegadas

Conforme al Principio de Despliegue Mínimo Necesario, se construyó el conjunto restringido:

```typescript
GEO_AFFECTED_FUNCTIONS = [
  "notifyNewOrder",
  "notifyOrderStatusChange"
]
```

### Detalle por Función:
1. **`notifyNewOrder`**:
   - **Archivo**: `functions/src/triggers/orders.ts`
   - **Export**: `functions/src/index.ts`
   - **Región / Runtime**: `us-central1` | `nodejs22` (1st Gen)
   - **Trigger**: `providers/cloud.firestore/eventTypes/document.create` en `orders/{orderId}`
   - **Motivo GEO**: Branch Substitution Check + Intramunicipal Kill-Switch con log de auditoría.
   - **Resultado Deploy**: `+ functions[notifyNewOrder(us-central1)] Successful update operation.`
2. **`notifyOrderStatusChange`**:
   - **Archivo**: `functions/src/triggers/orders.ts`
   - **Export**: `functions/src/index.ts`
   - **Región / Runtime**: `us-central1` | `nodejs22` (1st Gen)
   - **Trigger**: `providers/cloud.firestore/eventTypes/document.update` en `orders/{orderId}`
   - **Motivo GEO**: Segmentación municipal de FCM Topics (`fleet_{tenantId}_{muniId}`) y Abort Fail-Closed.
   - **Resultado Deploy**: `+ functions[notifyOrderStatusChange(us-central1)] Successful update operation.`

---

## 4. Comandos de Despliegue Ejecutados

### 4.1 Despliegue de Perímetro Primario (Firestore Security Rules)
```powershell
npx firebase-tools deploy --only firestore:rules --project bluesystem-7c9af
```
**Salida de Producción**:
```text
=== Deploying to 'bluesystem-7c9af'...
i  deploying firestore
i  cloud.firestore: checking firestore.rules for compilation errors...
+  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
```

### 4.2 Despliegue de Funciones Autorizadas
```powershell
npx firebase-tools deploy --only "functions:notifyNewOrder,functions:notifyOrderStatusChange" --project bluesystem-7c9af
```
**Salida de Producción**:
```text
=== Deploying to 'bluesystem-7c9af'...
i  deploying functions
i  functions: packaged functions (1.86 MB) for uploading
+  functions: functions source uploaded successfully
i  functions: updating Node.js 22 (1st Gen) function notifyNewOrder(us-central1)...
i  functions: updating Node.js 22 (1st Gen) function notifyOrderStatusChange(us-central1)...
+  functions[notifyNewOrder(us-central1)] Successful update operation.
+  functions[notifyOrderStatusChange(us-central1)] Successful update operation.
+  Deploy complete!
```

---

## 5. Verificación de Salud Post-Deployment (Health Check)

1. **Estado de Funciones**: Ambas Cloud Functions (`notifyNewOrder`, `notifyOrderStatusChange`) se encuentran activas y saludables en `us-central1` sobre Node.js 22.
2. **Logs Operacionales**: Sin errores de inicialización, sin fallos de importación (`SyntaxError`/`ReferenceError`), sin excepciones no controladas en arranque.
3. **Firestore Security Rules**: Activas en producción en `cloud.firestore` para `bluesystem-7c9af`.
4. **Infraestructura FCM**: Tópicos municipales activos, fail-closed implementado.
5. **Migración de Datos**: 0 scripts de migración ejecutados. Ningún documento modificado en producción.

---

## 6. Prohibición de Auto-Certificación

> [!IMPORTANT]
> **REGLA ABSOLUTA DE GOBERNANZA**:  
> El éxito del despliegue (`Deploy complete!`) demuestra exclusivamente que los artefactos fueron liberados correctamente en la nube. **NO CONSTITUYE CERTIFICACIÓN DE COMPORTAMIENTO REAL EN PRODUCCIÓN**.  
> La certificación operativa queda estrictamente reservada para la fase **C2D.35.GEO-C.3** sobre las aplicaciones reales.

---

## 7. C2D.35.GEO-P.0 FINAL GATE

```text
============================================================
C2D.35.GEO-P.0 FINAL GATE
============================================================

FIRESTORE RULES:
🟢 DEPLOYED

GEO CLOUD FUNCTIONS:
🟢 DEPLOYED

GEO FCM:
🟢 DEPLOYED

GEO NORMALIZATION:
🟢 PRESENT

COURIER IDENTITY PROTECTION:
🟢 PRESENT

ADR-016 COURIER CORE:
🟢 INTACT

ADR-015 X→Y:
🟢 INTACT

DATA MIGRATION:
🟢 NONE

UNAUTHORIZED CODE CHANGES:
🟢 NONE

PRODUCTION DEPLOYMENT:
🟢 SUCCESS

============================================================

IMPORTANT:

🟢 PRODUCTION DEPLOYED

NO SIGNIFICA:

🟢 GEO PRODUCTION CERTIFIED

============================================================

NEXT AUTHORIZED PHASE:

C2D.35.GEO-C.3
POST-DEPLOY FORENSIC CERTIFICATION
============================================================
```
