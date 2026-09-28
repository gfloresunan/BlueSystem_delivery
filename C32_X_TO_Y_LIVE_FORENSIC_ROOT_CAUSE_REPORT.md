# C32 — X→Y DELIVERY LIVE FORENSIC ROOT-CAUSE REPORT
**Proyecto:** BlueSystem Delivery Enterprise  
**Fecha:** 2026-08-25  
**Modo:** FORENSIC READ-ONLY AUDIT & ROOT-CAUSE TRACE  
**Dispositivo Físico:** ALWSCP4504401991 (Huawei WDY-LX3 / Android)  
**Usuario Courier Autenticado:** `6VkVNQ2yRzS67kEIYfyATkuwBiI3`  
**Usuario Cliente Autenticado:** `SlFFl3rNi4RBxJIoxqOhcuwyzcS2`  

---

## 1. Executive Summary

Se ejecutó una auditoría forense integral de solo lectura sobre el flujo físico de encomiendas X→Y (P2P) entre el teléfono del Cliente y el teléfono del Courier.

### Síntoma Reportado:
El Cliente crea una encomienda X→Y (`env_6d575072`), quedando en *"Buscando motorizados..."*. El teléfono del Courier físico está conectado, autenticado en el módulo Courier, pero muestra `Disponibles (0)` y no recibe alertas visuales ni notificaciones FCM (foreground, background o lockscreen).

### Hallazgo Forense Incontestable:
1. **La creación en Firestore es exitosa y canónica:** El documento `/orders/env_6d575072` y la entidad `/deliveryTrips/env_6d575072` fueron creados correctamente con `serviceType: "X_TO_Y_DELIVERY"` y `status: "ready"` (CASH).
2. **Causa Raíz #1 (Visualización en Courier / Disponibles 0):** Discrepancia en `firestore.rules`. El trigger canónico de backend `setUserClaims` (`functions/src/triggers/auth.ts`) normaliza a todos los couriers/motorizados a `role: "DRIVER"` (mayúsculas). Sin embargo, `firestore.rules` (línea 516 y 573) únicamente autoriza consultas de pool si `getRole()` está en `["courier", "COURIER", "motorizado", "MOTORIZADO"]` o si `userType` está en el token (campo que no se incluye en el JWT). Como consecuencia, la consulta de Listener 4 falla por evaluación de reglas de seguridad, impidiendo que el Courier físico reciba el documento de la encomienda.
3. **Causa Raíz #2 (Notificaciones FCM Nulas):** Despliegue obsoleto de Cloud Functions en producción. Los registros oficiales de Cloud Logging (`npx firebase-tools functions:log`) revelan que la última ejecución desplegada de `notifyNewOrder` data del `2026-08-19`. El código con bifurcación de dominio para `X_TO_Y_DELIVERY` fue implementado localmente en los sprints C30/C31 pero **no fue desplegado a producción**. La versión de producción vigente descarta toda orden sin `businessId` (`if (!order.businessId) return null;`), por lo que nunca emitió el mensaje FCM `NEW_X_TO_Y_DELIVERY` al topic `available_orders`.

---

## 2. Physical Test & Order Verification

### Datos Reales Capturados en Producción:
* **Order ID:** `env_6d575072`
* **Trip ID:** `env_6d575072`
* **Customer ID:** `SlFFl3rNi4RBxJIoxqOhcuwyzcS2`
* **Payment Method:** `efectivo` (CASH)
* **Delivery Fee:** `C$ 204.30`
* **Service Type:** `X_TO_Y_DELIVERY`
* **Status en `/orders`:** `ready`
* **Status en `/deliveryTrips`:** `PENDING`
* **assignedCourierId:** `undefined` (Libre en pool)
* **motorizadoId:** `undefined` (Libre en pool)
* **businessId:** `""` (Correcto para P2P X→Y)
* **Origen:** `5R68+PG2, Managua 11046, Nicaragua` (Lat: `12.1618205`, Lng: `-86.1836205`)
* **Destino:** `4P4H+7W7, Pista de La Unan, Managua 14172, Nicaragua` (Lat: `12.1056632`, Lng: `-86.2701040`)

---

## 3. APK Real Instalado

* **Device ID:** `ALWSCP4504401991` (model: `WDY_LX3`)
* **Package Name:** `com.aistudio.delivery.djweq`
* **Version Code:** `1`
* **Version Name:** `1.0`
* **Last Update Time:** `2026-08-24 23:24:32`
* **Process PID:** `16572` (Activo)
* **Estado de la App en Dispositivo:** El APK contiene el código de UI, `CourierViewModel`, `PedidosEntrantesScreen` y `FirebaseManager` con Listener 4.

---

## 4. Firestore Index Evidence

En `firestore.indexes.json` se confirmó la existencia del índice:
* **collectionGroup:** `orders`
* **fields:** `serviceType` (ASCENDING), `status` (ASCENDING)
* **queryScope:** `COLLECTION`

---

## 5. Security Rules & Claims Evaluation

### A. Claims Canónicos del Courier (`functions/src/triggers/auth.ts`)
```typescript
// Líneas 54-58
driver: "DRIVER",
motorizado: "DRIVER",
courier: "DRIVER",
repartidor: "DRIVER",

// Líneas 106-112
const claims = {
  role: "DRIVER", // Normalizado en mayúsculas
  businessId: null,
  branchId: null,
  orgId: null,
  tenantId: null,
};
```

### B. Regla en `firestore.rules` (Línea 516-520 y 573-577)
```javascript
((getRole() in ["courier", "COURIER", "motorizado", "MOTORIZADO"] ||
  request.auth.token.get("userType", "") in ["courier", "motorizado", "driver"]) &&
 (resource.data.get("status", "") in ["ready", "READY", "listo", "LISTO", "assigned", "ASSIGNED", "in_transit", "en_ruta", "delivering", "DELIVERING", "preparing", "PREPARING"] ||
  (resource.data.get("serviceType", "") == "X_TO_Y_DELIVERY" && resource.data.get("status", "") in ["ready", "READY", "listo", "LISTO", "pending", "PENDING"])))
```

### C. Evaluación Lógica:
1. `getRole()` devuelve `"DRIVER"`.
2. `"DRIVER"` **NO** pertenece a `["courier", "COURIER", "motorizado", "MOTORIZADO"]`.
3. `request.auth.token` no contiene `userType`.
4. La expresión completa evalúa a `FALSE`.
5. Firestore rechaza la suscripción coleccional de pedidos en pool para todo usuario con rol canónico `DRIVER`.

---

## 6. Courier Identity & GPS Eligibility

* **Courier UID:** `6VkVNQ2yRzS67kEIYfyATkuwBiI3`
* **Documento `/users/6VkVNQ2yRzS67kEIYfyATkuwBiI3`:**
  * `role`: `'driver'`
  * `userType`: `'driver'`
  * `isActive`: `true`
* **Documento `/ubicaciones_repartidores/6VkVNQ2yRzS67kEIYfyATkuwBiI3`:**
  * `latitud`: `12.1618195`
  * `longitud`: `-86.18363`
* **Origen de la Encomienda:** `12.1618205, -86.1836205`
* **Distancia Courier ↔ Origen:** `~1.1 metros` (`0.001 km`).
* **Veredicto GPS:** Totalmente elegible dentro del radio operacional (< 15 km).

---

## 7. Cloud Functions & FCM Dispatch Audit

* **Función:** `notifyNewOrder`
* **Última Ejecución en Producción:** `2026-08-19T21:27:33Z` (Fuente: Cloud Logging).
* **Causa:** Las modificaciones de Sprint C30/C31 en `functions/src/triggers/orders.ts` (bifurcación de dominio X_TO_Y_DELIVERY para enviar push al topic `available_orders`) no fueron desplegadas con `firebase deploy --only functions`.
* **Comportamiento en Producción:** La función activa del 19 de agosto evalúa `if (!order.businessId) return null;` y finaliza de forma inmediata sin enviar la notificación FCM.

---

## 8. Cadena de Evidencia E2E

| Salto del Flujo | Componente | Estatus | Evidencia |
| :--- | :--- | :--- | :--- |
| 1. Cliente UI | `SolicitarEnvioScreen` | 🟢 PASS | Interfaz captura coordenadas y datos |
| 2. Persistencia Trip | `/deliveryTrips/env_6d575072` | 🟢 PASS | Creado con `serviceType: X_TO_Y_DELIVERY` |
| 3. Proyección Order | `/orders/env_6d575072` | 🟢 PASS | Creado con `status: ready` y `serviceType: X_TO_Y_DELIVERY` |
| 4. Security Rules | `firestore.rules` | 🔴 **FAIL** | Rol `"DRIVER"` no incluido en `getRole() in [...]` de `/orders` |
| 5. Listener 4 (Pool) | `FirebaseManager.kt` | 🟡 BLOCKED | Código correcto, bloqueado por regla Firestore |
| 6. Courier UI Pool | `PedidosEntrantesScreen` | 🟡 BLOCKED | `Disponibles (0)` por causa de reglas Firestore |
| 7. Cloud Function | `notifyNewOrder` | 🔴 **FAIL** | Despliegue desactualizado en servidor (19 de agosto) |
| 8. FCM Message | Topic `available_orders` | 🔴 **FAIL** | Servidor no emitió `NEW_X_TO_Y_DELIVERY` |
| 9. Android Push | `DeliveryFirebaseMessagingService` | 🟡 WAITING | Servicio listo, mensaje no recibido del servidor |

---

## 9. Root Causes Identificadas

### 🎯 ROOT CAUSE #1 (Localización en Pool UI):
En `firestore.rules`, la lista de roles autorizados para consultar `/orders` y `/deliveryTrips` en pool incluye `["courier", "COURIER", "motorizado", "MOTORIZADO"]` pero omite `"DRIVER"` y `"driver"`, que es el rol canónico emitido por `setUserClaims` para todos los repartidores.

### 🎯 ROOT CAUSE #2 (Notificaciones FCM):
El paquete de Cloud Functions en Firebase Production no ha sido actualizado desde el 19 de agosto de 2026. La versión en ejecución descarta órdenes sin `businessId`.

---

## 10. Plan de Corrección Quirúrgico Propuesto

1. **Ajuste en `firestore.rules`:**
   Incluir `"DRIVER"`, `"driver"`, `"REPARTIDOR"`, `"repartidor"` dentro de la lista de roles autorizados en las reglas de lectura de `/orders` (línea 516) y `/deliveryTrips` (línea 573).
2. **Despliegue de Reglas y Cloud Functions:**
   - `firebase deploy --only firestore:rules`
   - `firebase deploy --only functions:notifyNewOrder,functions:notifyOrderStatusChange`
3. **Ajuste UX en Cliente (`SolicitarEnvioScreen.kt`):**
   Asegurar que los contenedores inferiores de:
   - Punto X & Punto Y (Map Picker Dialog)
   - Detalles del Envío Dialog
   - Formulario Principal
   respeten un viewport visible con `WindowInsets.safeDrawing` y padding ergonómico sin doble inset, conservando íntegro el botón `"📍 Usar mi ubicación actual"`.
