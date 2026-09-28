# Reporte Forense: Corrección Quirúrgica de Error PERMISSION_DENIED en Catálogo de Premios (Commerce Intelligence)

## 1. Identificación del Problema y Causa Raíz
* **Módulo Afectado:** Panel Admin Web → Commerce Intelligence → Fidelidad → Catálogo de Premios
* **Síntoma:** Al guardar una recompensa (ej: *C$50 Descuento en tu pedido*, 20 pts, Global, FIXED_DISCOUNT), la consola emitía:
  `[COMMERCE_INTEL] Error guardando recompensa: FirebaseError: Missing or insufficient permissions.`
* **Causa Raíz:** El archivo `panel-admin/public/js/dashboard/commerceIntelligence.js` intentaba realizar operaciones directas de Firestore desde el cliente del navegador (`db.collection('loyalty_rewards').add(payload)` / `.set(...)` / `.delete(...)` / `.update(...)`). 
  
  Bajo la gobernanza de seguridad EIAM v2.1 de `firestore.rules`, las escrituras directas sobre `/loyalty_rewards/{rewardId}` exigen `isPlatformAdmin()`. La arquitectura canónica del sistema exige que las operaciones administrativas mutativas se ejecuten de forma autoritativa mediante Cloud Functions con Firebase Admin SDK (`adminSaveLoyaltyReward` y `adminDeleteLoyaltyReward`), evitando la exposición de escrituras directas desde el frontend cliente.

---

## 2. Archivos y Funciones Intervenidas

### 1. `panel-admin/public/js/dashboard/commerceIntelligence.js`
* **`saveReward()`**:
  * **Antes:** Ejecutaba `db.collection('loyalty_rewards').add(payload)` o `.doc(id).set(payload)`.
  * **Ahora:** Consume el Callable autorizado `firebase.functions().httpsCallable('adminSaveLoyaltyReward')`, enviando el payload estricto alineado con `LoyaltyRewardEntity` (`name`, `pointsCost`, `scope`, `businessId`, `businessName`, `rewardType`, `discountType`, `discountValue`, `description`, `active`, `comboItems`).
* **`toggleRewardActive()`**:
  * **Antes:** Ejecutaba `db.collection('loyalty_rewards').doc(id).update({ active })`.
  * **Ahora:** Consume `firebase.functions().httpsCallable('adminSaveLoyaltyReward')` preservando la integridad del documento y la auditoría.
* **`deleteReward()`**:
  * **Antes:** Ejecutaba `db.collection('loyalty_rewards').doc(id).delete()`.
  * **Ahora:** Consume `firebase.functions().httpsCallable('adminDeleteLoyaltyReward')`.
* **`editReward()`**:
  * **Nuevo:** Función quirúrgica que rellena el formulario de recompensa a partir del catálogo cargado, permitiendo edición fluida y respetando combos y tipos de recompensa.
* **`loadLoyaltyData()`**:
  * Almacena en memoria `this.rewardsList` y agrega botón de edición `✏️` junto a pausa/activación y eliminación.

### 2. `functions/src/callables/loyaltyCallables.ts` y `functions/src/index.ts`
* Incorporación de `adminDeleteLoyaltyReward` con validación estricta de `isPlatformAdmin(context)`, eliminación autoritativa y registro inmutable en `/audit_events` (`LOYALTY_REWARD_DELETED`).

---

## 3. Estado de Reglas de Seguridad (Firestore Rules)
* **Reglas Modificadas:** **NINGUNA.**
* **Gobernanza de Seguridad:** Se mantuvo intacto el aislamiento estricto en `firestore.rules`:
  ```javascript
  match /loyalty_rewards/{rewardId} {
    allow read: if isAuthenticated();
    allow create, update, delete: if isAuthenticated() && isPlatformAdmin();
  }
  ```
* **Cero Apertura Insegura:** No se añadieron permisos laxos como `allow write: if true` ni `allow write: if request.auth != null`. El backend de Cloud Functions (Admin SDK) asume la autoridad administrativa con auditoría.

---

## 4. Validación y Pruebas Ejecutadas

### A. Pruebas de Compilación y Tipado TypeScript
* `npm --prefix functions run build` ejecutado con éxito (código de salida `0`), validando la integridad de `adminSaveLoyaltyReward` y `adminDeleteLoyaltyReward`.

### B. Suite de Pruebas Unitarias de Backend
* Ejecución de `npm --prefix functions test`:
  * `Loyalty Engine — FIFO Allocation Policy & Consistency`: 5/5 pruebas pasadas.
  * `Loyalty Engine — Combo Reward Validation & Backward Compatibility`: 6/6 pruebas pasadas.
  * **Total:** 11 pruebas superadas, 0 fallos.

### C. Cobertura de Tipos de Recompensa
1. `FIXED_DISCOUNT` (Descuento de monto fijo en C$) ✅
2. `PERCENTAGE_DISCOUNT` (Descuento porcentual %) ✅
3. `FREE_DELIVERY` (Envío gratis) ✅
4. `FREE_PRODUCT` (Producto de catálogo bonificado) ✅
5. `COMBO` (Multi-beneficio compuesto) ✅

---

## 5. Análisis de Regresión
* **Customer App (`LoyaltyRepository.kt`):** Continúa leyendo `/loyalty_rewards` sin cambios, con soporte para los modelos canónicos.
* **Integridad Financiera:** Las operaciones de guardado y eliminación ahora quedan registradas con actor y timestamp en la colección `/audit_events`.
* **Cero impacto** en cálculo FIFO, balances de clientes ni checkout.
