# C2D25D — FIREBASE READINESS AUDIT
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Estado Actual de `google-services.json`

- **Proyecto Firebase:** `bluesystem-7c9af` (Project Number: `514416631826`)
- **Clientes Android Registrados:** Exactamente 1
  - Package: `com.aistudio.delivery.djweq` (App ID: `1:514416631826:android:788b99430f87324e88b8cb`)
- **Clientes Android NO Registrados:**
  - `com.fitoni.delivery` (Flavor: `enterpriseFitoni`) -> 🔴 **FALTANTE EN FIREBASE**
  - `com.bluesystem.delivery` o identificadores personalizados de WhiteLabel -> 🔴 **FALTANTES EN FIREBASE**

---

### 2. Análisis Técnico de la Dependencia Firebase

1. **¿Puede un segundo producto utilizar el mismo Firebase Project?**
   - **SÍ.** Un único proyecto de Firebase puede contener múltiples Android Apps (hasta 30 aplicaciones Android por proyecto en plan estándar/Blaze), compartiendo la misma base de datos Firestore, Storage y Cloud Functions con aislamiento por `tenantId`.
2. **¿Necesita una Firebase Android App adicional?**
   - **SÍ.** Cada `applicationId` único de Android requiere ser registrado en el proyecto de Firebase para habilitar Google Auth, FCM token dispatching, App Check y Firebase Installations.
3. **¿Cómo se resuelve esto sin duplicar el Core?**
   - El archivo `google-services.json` admite un arreglo de clientes en `client: [...]`. Al registrar una nueva app en el proyecto de Firebase y descargar el archivo actualizado, el plugin de Google Services empareja automáticamente el `applicationId` del flavor compilado con la entrada correspondiente.

---

### 3. Veredicto
🔴 **FIREBASE SECOND PRODUCT READINESS: RED (Bloqueante previo a compilación física).**
No se debe autorizar la compilación física de un segundo `applicationId` hasta que esté debidamente provisionado en `google-services.json`.
