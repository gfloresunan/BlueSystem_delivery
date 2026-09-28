# REPORTE DE AUDITORÍA FORENSE READ-ONLY
## BSD-X2Y-COURIER-DISCOVERY-REGRESSION-ROOT-CAUSE-001

**Estado:** AUDITORÍA COMPLETADA (READ-ONLY)  
**ID de Incidente:** BSD-X2Y-COURIER-DISCOVERY-REGRESSION-AUDIT-001  
**Dominio:** Dominio B — Envíos X→Y (`/deliveryTrips`) ↔ Fleet Pool Courier  
**Fecha:** 22 de Septiembre de 2026  
**Severidad:** ALTA (Bloqueo operacional de recepción de encomiendas X→Y por motorizados en línea)  
**Reglas de Intervención:** READ-ONLY. CERO MODIFICACIONES DE CÓDIGO. CERO DEPLOY. FROZEN CORE BLINDADO.

---

### RESUMEN EJECUTIVO DEL INCIDENTE

Durante una prueba de certificación del flujo X→Y bajo la implementación `BSD-X2Y-DYNAMIC-DISPATCH-RADIUS-001`, un cliente creó una encomienda express. La pantalla del cliente mostró:
- *"Buscando motorizados cercanos..."*
- *"Radio cercano 5 km"*
- *"3 disponible(s)"*

Simultáneamente, un motorizado de prueba ubicado físicamente a menos de 5 km del origen X, en estado EN LÍNEA, observó en su pantalla:
- *"🟢 Disponibles (0)"*
- *"🛵 No hay pedidos disponibles"*

El motorizado nunca recibió la tarjeta de la encomienda ni notificación FCM, y tras 10 minutos la orden fue cancelada por timeout (`NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT`).

---

### FASE 1 — AUDITORÍA DEL DOCUMENTO REAL EN FIRESTORE

Se auditó el documento real generado durante la prueba física: `/deliveryTrips/env_f1292707`.

#### Payload Completo Inspeccionado (Extracto Forense Canónico)
```json
{
  "id": "env_f1292707",
  "tripId": "env_f1292707",
  "serviceType": "X_TO_Y_DELIVERY",
  "status": "CANCELLED",
  "estado": "cancelado",
  "cancelReason": "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT",
  "customerId": "SlFFl3rNi4RBxJIoxqOhcuwyzcS2",
  "deliveryFee": 186.5,
  "customerOffer": 186.5,
  "origin": {
    "address": "4P4H+7W7, Pista de La Unan, Managua 14172, Nicaragua",
    "latitude": 12.105636361900222,
    "longitude": -86.27011209726334
  },
  "destination": {
    "address": "5R78+469, Managua 11046, Nicaragua",
    "latitude": 12.162992546085075,
    "longitude": -86.18431963026524
  },
  "createdAt": { "_seconds": 1790091722, "_nanoseconds": 921000000 },
  "dispatchStage": "TIMEOUT",
  "dispatchRadiusKm": 30,
  "eligibleCouriers": [],
  "eligibleCouriersCount": 0,
  "candidateCouriersCount": 0,
  "dispatch": {
    "stage": "TIMEOUT",
    "radiusKm": 30,
    "eligibleCount": 0,
    "timedOutAt": { "_seconds": 1790092325, "_nanoseconds": 855000000 }
  },
  "cancelledAt": { "_seconds": 1790092325, "_nanoseconds": 855000000 }
}
```

#### Hallazgos del Documento:
1. **`eligibleCouriers: []`**: El array de motorizados autorizados a ver y reclamar el pedido quedó **totalmente vacío** desde la etapa inicial de 5 km hasta el timeout de 30 km.
2. **UID del Courier de Prueba**: El UID del motorizado en prueba (`rCpnpzQVcoPDoUdU4cJE1HpuLGA2`) **NUNCA fue insertado en `eligibleCouriers`**.
3. **`assignedCourierId`**: Nulo / inexistente. Ningún motorizado pudo ver ni reclamar el viaje.

---

### FASE 2 — AUDITORÍA DEL MOTOR DE DISPATCH BACKEND

Se auditaron los componentes:
- `functions/src/services/xToYDispatchEngine.ts`
- `functions/src/triggers/xToYDispatch.ts`
- `functions/src/schedulers/xToYDispatchScheduler.ts`

#### 1. Comportamiento de `discoverEligibleCouriers`
En `xToYDispatchEngine.ts` (líneas 79-152), el motor consulta `/ubicaciones_repartidores` y aplica 5 filtros obligatorios:
1. Coordenadas válidas (`lat`, `lng` $\neq 0$ y no `NaN`).
2. **Frescura GPS estricta:**
   ```typescript
   if (lastUpdateMs > 0 && nowMs - lastUpdateMs > X2Y_DISPATCH_CONFIG.MAX_GPS_STALE_MS) {
       // Ubicación obsoleta (> 10 min)
       continue;
   }
   ```
   Donde `X2Y_DISPATCH_CONFIG.MAX_GPS_STALE_MS = 10 * 60 * 1000` (10 minutos).
3. Distancia geodésica Haversine $\le \text{maxRadiusKm}$.
4. Perfil operacional activo y online (`isOnline !== false`, `isActive !== false`, sin pedido activo).
5. Elegibilidad financiera (`courier_balances`: sin bloqueo, sin cierre vencido, dentro de límite de efectivo).

#### 2. Evidencia Forense de Telemetría Real en `/ubicaciones_repartidores`
Se ejecutó una inspección directa sobre la base de datos de producción:
```
6VkVNQ2yRzS67kEIYfyATkuwBiI3 | lat: 12.1384534 | lng: -86.2905092 | ageMinutes: 35802 | isStale: true
9QHYGkSa3nWiJ7KfPkccjjuIaYp2 | lat: 12.1055100 | lng: -86.2697717 | ageMinutes: 25773 | isStale: true
C6adh99jAXNqXJpIZaGFJJ5kFh72 | lat: 12.1617192 | lng: -86.1835468 | ageMinutes: 36599 | isStale: true
kpENhRwdmocYZsYZonmfWTWvdnC2 | lat: 12.1617230 | lng: -86.1835553 | ageMinutes: 34207 | isStale: true
rCpnpzQVcoPDoUdU4cJE1HpuLGA2 | lat: 12.1056484 | lng: -86.2700568 | ageMinutes:  1179 | isStale: true
```

**Resultado de la prueba del motor:**
```javascript
discoverEligibleCouriers(12.1056, -86.2701, 5.0)  => []
discoverEligibleCouriers(12.1056, -86.2701, 15.0) => []
discoverEligibleCouriers(12.1056, -86.2701, 30.0) => []
```

El motor descartó al 100% de los motorizados porque la última actualización de telemetría de `rCpnpzQVcoPDoUdU4cJE1HpuLGA2` tenía **1,179 minutos (~19.6 horas) de antigüedad**.

#### 3. Determinación de "3 disponible(s)" en la Pantalla del Cliente
El mensaje *"3 disponible(s)"* observado en el cliente **NO REPRESENTA**:
- ❌ Candidatos calculados por el backend (el backend calculó 0).
- ❌ `eligibleCouriers` reales (estaba vacío `[]`).
- ❌ Couriers que recibieron FCM (recibieron 0).

**Representa exclusivamente:**
En `EsperandoRepartidorScreen.kt` (líneas 137-140 y 366-373):
1. El backend escribe `eligibleCouriersCount` y `dispatch.eligibleCount`, pero **NO escribe `candidateCouriersCount`** (quedó en `0` por inicialización de `MainActivity.kt`).
2. Al evaluar `candidateCouriersCount > 0` como falso, la UI del cliente ejecuta un fallback a `candidatesInRadius.size`.
3. `candidatesInRadius` consulta directamente `/ubicaciones_repartidores` **sin validar frescura GPS, sin validar si el motorizado está online ni su elegibilidad financiera**.
4. Contó 3 documentos con coordenadas guardadas a $<5\text{ km}$ del origen:
   - `rCpnpzQVcoPDoUdU4cJE1HpuLGA2` (a 10 metros, guardado hace 19.6 horas).
   - `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` (a 20 metros, guardado hace 17 días).
   - `6VkVNQ2yRzS67kEIYfyATkuwBiI3` (a 4.26 km, guardado hace 24 días).
5. Mostró un número engañoso (*"3 disponible(s)"*) mientras para el servidor había 0 candidatos.

---

### FASE 3 — AUDITAR FIRESTORE RULES

Se revisó la regla canónica en `firestore.rules` (líneas 603-613):
```javascript
match /deliveryTrips/{tripId} {
  allow read: if isAuthenticated() && (
      isPlatformAdmin() ||
      currentUid() == resource.data.customerId ||
      currentUid() == resource.data.assignedCourierId ||
      resource.data.get("eligibleCouriers", []).hasAny([currentUid()]) ||
      (
        resource.data.get("status", "") in ["PENDING", "pending", "READY", "ready", "listo", "LISTO"] &&
        !resource.data.keys().hasAny(["eligibleCouriers"])
      )
  );
```

#### Análisis de Seguridad y Compatibilidad con Android:
1. **Aislamiento Multi-Tenant y por Courier:** La regla exige que `currentUid()` esté en `resource.data.eligibleCouriers`. Esto es formalmente correcto y seguro.
2. **Query de Android:** En `FirebaseManager.kt` (línea 819):
   ```kotlin
   db.collection("deliveryTrips").whereArrayContains("eligibleCouriers", motorizadoId)
   ```
   Esta consulta es **100% compatible** con la regla `resource.data.get("eligibleCouriers", []).hasAny([currentUid()])`.
3. **Punto de Bloqueo:** Como el motor de dispatch no insertó el UID del motorizado en `eligibleCouriers` debido a la comprobación de frescura GPS, la consulta de Android devuelve exactamente **0 documentos** (sin error de `PERMISSION_DENIED`, simplemente 0 resultados legítimos).

---

### FASE 4 — AUDITAR FIREBASEMANAGER.KT

Se auditaron los flujos de `FirebaseManager.kt`:

1. **`obtenerFlujoPedidosCourier(motorizadoId)`** (líneas 580-849):
   - Escucha 1: `courier_balances/{motorizadoId}` (evalúa `isFinanciallyEligible`).
   - Escucha 2: `orders` donde `assignedCourierId == motorizadoId` (`assignedOrdersMap`).
   - Escucha 3: `orders` donde `motorizadoId == motorizadoId` (`legacyOrdersMap`).
   - Escucha 4: `deliveryTrips` donde `assignedCourierId == motorizadoId` (`assignedTripsMap`).
   - **Escucha 5 (Fleet Pool X→Y):**
     ```kotlin
     val listenerXToYPool = db.collection("deliveryTrips")
         .whereArrayContains("eligibleCouriers", motorizadoId)
         .addSnapshotListener { snapshot, error ->
             ...
             snapshot?.documents?.forEach { doc ->
                 val status = (doc.getString("status") ?: "").uppercase()
                 val assigned = doc.getString("assignedCourierId") ?: doc.getString("courierId") ?: ""
                 if (status in listOf("PENDING", "READY", "LISTO") && assigned.isBlank()) {
                     poolTripsMap[doc.id] = parsePedidoOfrecido(doc)
                 }
             }
             updateState()
         }
     ```
2. **Filtrado en `updateState()`** (líneas 655-670):
   ```kotlin
   val poolXToYOrders = if (!isFinanciallyEligible) {
       emptyList()
   } else {
       poolTripsMap.values.filter { order ->
           val isNotRejected = !isRejected(order)
           val isReady = normalizeOrderStatus(order.status) in listOf("ready", "pending")
           val isUnassigned = order.assignedCourierId.isEmpty() && order.motorizadoId.isEmpty()
           val isXToY = order.serviceType == "X_TO_Y_DELIVERY"
           val isSameMunicipality = courierEffectiveMuni.isBlank() || orderEffectiveMuni.isBlank() || courierEffectiveMuni == orderEffectiveMuni
           isNotRejected && isReady && isUnassigned && isXToY && isSameMunicipality
       }
   }
   ```
3. **Estado Unificado Emitido:**
   ```kotlin
   val poolOrders = (poolCommerceOrders + poolXToYOrders).distinctBy { it.id }
   ```
   Si `poolXToYOrders` tuviera el viaje, se emite con `CourierUiStatus.POOL_ORDERS`.

**Conclusión de Fase 4:** La lógica interna de `FirebaseManager.kt` para procesar viajes X→Y es **correcta**. El problema es que `poolTripsMap` recibe 0 documentos porque `eligibleCouriers` en Firestore está vacío.

---

### FASE 5 — AUDITAR MAINACTIVITY.KT Y COURIER VIEWMODEL

Se auditó cómo se alimenta la UI del Courier:
1. `MainActivity.kt` invoca `CourierMainDashboardScreen`.
2. `CourierMainDashboardScreen.kt` (línea 75) consume:
   ```kotlin
   val ordersState by viewModel.courierOrdersState.collectAsStateWithLifecycle()
   val pedidoActivo by viewModel.courierPedidoActivo.collectAsStateWithLifecycle()
   ```
3. `CourierViewModel.kt` (línea 266-291):
   `courierOrdersState` proviene directamente de `firebaseManager.obtenerFlujoPedidosCourier(uid)`.
   `courierPedidoActivo` mapea el primer pedido de `assignedOrders` o `poolOrders`.
4. `CourierMainDashboardScreen.kt` (línea 445):
   Entrega `ordersState` y `pedidoActivo` a `PedidosEntrantesScreen`.
5. **Comprobación Legacy `obtenerPedidoOfrecido`:** Se confirmó que `obtenerPedidoOfrecido(motorizadoId)` ya no es utilizado como puente en `MainActivity.kt` ni en `CourierMainDashboardScreen.kt`. La UI consume el StateFlow unificado reactivo.

---

### FASE 6 — AUDITAR PEDIDOSENTRANTESSCREEN

Se auditó `PedidosEntrantesScreen.kt`:
1. **Líneas 309-315:**
   ```kotlin
   val effectiveOrdersList = if (ordersState.poolOrders.isNotEmpty()) {
       ordersState.poolOrders
   } else if (ordersState.assignedOrders.isNotEmpty()) {
       ordersState.assignedOrders
   } else {
       emptyList()
   }
   ```
2. **Línea 339:**
   `val activePedido = activeOrderFromState ?: pedidoActivo`
3. **Línea 542:**
   `if (activePedido == null)` -> Renderiza tarjeta de espera:
   - Línea 655: `text = "🛵 No hay pedidos disponibles"`
4. **Pestaña Superior de Conteo en `CourierMainDashboardScreen.kt` (línea 362):**
   `"🟢 Disponibles (${ordersState.poolOrders.size})"` -> Muestra `Disponibles (0)`.

**Conclusión de Fase 6:** La pantalla no descarta incorrectamente el pedido X→Y. Si `ordersState.poolOrders` contuviera el pedido, la pantalla lo renderizaría inmediatamente.

---

### FASE 7 — AUDITAR FCM

1. En `xToYDispatchEngine.ts` (línea 171): `notifyTargetedCouriers` consulta `user_devices` donde `uid in courierUids`.
2. Como `discoverEligibleCouriers` arrojó 0 candidatos, `courierUids` fue `[]`.
3. `notifyTargetedCouriers` retornó en la línea 179 (`if (courierUids.length === 0) return;`).
4. **Conclusión FCM:** Ningún push fue emitido porque el motor de elegibilidad no autorizó a ningún candidato.

---

### FASE 8 — COMPARACIÓN LEGACY VS NUEVO

| COMPONENTE / ASPECTO | ARQUITECTURA LEGACY (C30) | ARQUITECTURA NUEVA (C32 / Dynamic Radius) | ESTADO DE INTEGRACIÓN ACTUAL |
| :--- | :--- | :--- | :--- |
| **Colección Canónica Productora** | `/orders` | `/deliveryTrips` | ✅ Correcto en backend y cliente creador. |
| **`serviceType`** | `X_TO_Y_DELIVERY` | `X_TO_Y_DELIVERY` | ✅ Consistente en ambos lados. |
| **Status Inicial (Efectivo)** | `ready` | `PENDING` | ✅ Soportado por `listenerXToYPool` y `normalizeOrderStatus`. |
| **Mecanismo de Descubrimiento** | Consulta particionada por `commercialMunicipalityId` | `eligibleCouriers` poblado por `xToYDispatchEngine` | ⚠️ **PUNTO DE QUIEBRE:** Motor descarta couriers por GPS no fresco. |
| **Transmisión GPS del Courier Idle** | Inexistente (solo en ruta activa) | Requiere GPS fresco $\le 10\text{ min}$ | 🔴 **RUPTURA PRINCIPAL:** El courier en Dashboard no actualiza `/ubicaciones_repartidores`. |
| **Contador de Candidatos en Cliente** | N/A | `candidateCouriersCount` | 🔴 **DESALINEACIÓN:** Backend escribe `eligibleCouriersCount`; cliente hace fallback engañoso. |
| **Listener del Courier Pool** | `orders` con `status in ['ready']` | `deliveryTrips` con `eligibleCouriers array-contains UID` | ✅ Conectado y compilado en `FirebaseManager.kt`. |
| **Consumo en Courier UI** | `CourierOrdersState` | `CourierOrdersState` (`poolOrders`) | ✅ Integrado a través de `CourierViewModel`. |

---

### FASE 9 — DETERMINACIÓN DE LA CAUSA RAÍZ (ROOT CAUSE)

#### 🔴 ROOT CAUSE PRIMARIA (Causa Raíz de la Falta de Tarjeta en el Courier)
**La app del Courier no transmite telemetría GPS a `/ubicaciones_repartidores` mientras el motorizado está en reposo / en espera ("EN LÍNEA") en el Dashboard.**
- La solicitud de actualizaciones GPS continuas (`requestLocationUpdates`) y la escritura a `/ubicaciones_repartidores` solo existen en `RutaActivaScreen.kt` (cuando ya existe un pedido asignado en ruta).
- En `PedidosEntrantesScreen.kt` y `CourierMainDashboardScreen.kt`, el hardware GPS solo se lee una vez para centrar la cámara en el mapa local, pero **nunca se persiste en Firestore**.
- Al crearse la encomienda X→Y, el backend ejecuta `xToYDispatchEngine.ts` que exige:
  ```typescript
  if (lastUpdateMs > 0 && nowMs - lastUpdateMs > X2Y_DISPATCH_CONFIG.MAX_GPS_STALE_MS) { continue; }
  ```
- Dado que el motorizado de prueba no realizaba una ruta activa desde el día anterior, su timestamp en `/ubicaciones_repartidores` tenía **19.6 horas de antigüedad**.
- El motor lo consideró **GPS obsoleto / inactivo**, devolviendo `eligibleCouriers = []`.
- Al estar `eligibleCouriers` vacío, el listener del Courier `whereArrayContains("eligibleCouriers", motorizadoId)` no recibió ningún documento, dejando `poolOrders` en 0.

#### 🟡 ROOT CAUSE SECUNDARIA (Causa Raíz de la Información Falsa en la Pantalla del Cliente)
**Desalineación del campo de conteo entre Backend y Pantalla del Cliente con fallback a datos históricos no filtrados.**
1. En `xToYDispatchEngine.ts` (línea 353), el backend actualiza:
   `eligibleCouriersCount: candidateUids.length` y `dispatch.eligibleCount: candidateUids.length`.
   **Nunca actualiza `candidateCouriersCount`** (que permanece en `0` en el documento).
2. En `EsperandoRepartidorScreen.kt` (línea 137), el cliente busca:
   `snap.getLong("candidateCouriersCount")`, recibiendo `0`.
3. Al ser 0, la línea 373 ejecuta un fallback a `candidatesInRadius.size`, el cual cuenta ciegamente todos los documentos de `/ubicaciones_repartidores` a menos de 5 km **sin verificar frescura GPS ni estado online**.
4. Esto produjo que el cliente viera *"3 disponible(s)"* mientras el backend tenía 0 candidatos elegibles.

#### 🟢 COMPONENTES CORRECTOS QUE NO DEBEN MODIFICARSE (FROZEN)
- ✅ `ADR-026` y arquitectura tarifaria SSOT (Routing, PricingSnapshot, Haversine de tarificación).
- ✅ Motor financiero, `courier_balances`, arqueo, depósitos, cierre y liquidación.
- ✅ Reglas de seguridad en `firestore.rules` (la regla `currentUid() in eligibleCouriers` es óptima y previene fugas de datos).
- ✅ Máquina de estados de despacho temporal (5 km $\to$ 15 km $\to$ 30 km $\to$ 10 min timeout).
- ✅ Integración StateFlow de `FirebaseManager.kt` $\to$ `CourierViewModel.kt` $\to$ `CourierMainDashboardScreen.kt`.

---

### FASE 10 — PLAN DE REPARACIÓN MÍNIMO (PROPUESTA NO IMPLEMENTADA)

Para restablecer la cadena completa de extremo a extremo sin alterar contratos arquitectónicos, se requerirá una intervención quirúrgica mínima de dos pasos:

#### Paso 1: Latido GPS Periódico del Courier en Estado "EN LÍNEA" (Android)
En `PedidosEntrantesScreen.kt` / `CourierMainDashboardScreen.kt`:
- Cuando el switch esté en `isOnline == true` y la pantalla esté activa, registrar un callback de ubicación ligero con `fusedLocationClient.requestLocationUpdates` (intervalo 30s-60s) o actualizar `/ubicaciones_repartidores/{motorizadoId}` con:
  ```kotlin
  val locData = mapOf(
      "motorizadoId" to motorizadoId,
      "coordenadas" to mapOf("latitud" to loc.latitude, "longitud" to loc.longitude),
      "latitud" to loc.latitude,
      "longitud" to loc.longitude,
      "estado" to "disponible",
      "ultimaActualizacion" to com.google.firebase.Timestamp.now()
  )
  db.collection("ubicaciones_repartidores").document(motorizadoId).set(locData, SetOptions.merge())
  ```
- Al pasar a `isOnline == false` o salir de la pantalla (`onDispose`), detener el listener GPS.

#### Paso 2: Unificación del Nombre de Campo en Backend y Cliente (Cloud Functions / Android)
- En `xToYDispatchEngine.ts`: Añadir `candidateCouriersCount: candidateUids.length` en la transacción atómica de actualización de `/deliveryTrips` para mantener paridad con el campo que lee `EsperandoRepartidorScreen.kt`.
- En `EsperandoRepartidorScreen.kt`: Leer tanto `candidateCouriersCount` como `eligibleCouriersCount` o `dispatch.eligibleCount`.
- En `EsperandoRepartidorScreen.kt`: En el fallback de `candidatesInRadius`, ignorar ubicaciones con más de 10 minutos de antigüedad para evitar mostrar falsos positivos de motorizados que se desconectaron hace horas o días.

---

### PLAN DE PRUEBA FÍSICA E2E POST-REPARACIÓN (VERIFICACIÓN FUTURA)

1. Abrir app Courier con cuenta `rCpnpzQVcoPDoUdU4cJE1HpuLGA2`.
2. Verificar en Firestore que `/ubicaciones_repartidores/rCpnpzQVcoPDoUdU4cJE1HpuLGA2` tenga `ultimaActualizacion` con timestamp del minuto actual.
3. Abrir app Cliente y crear una encomienda X→Y a menos de 5 km.
4. **Verificar en Backend:**
   - Logcat/Logs de Cloud Function: `[X2Y_DISPATCH] Dispatch inicial completado para env_xxx: stage=SEARCHING_5KM, candidatos=1`.
   - Documento `/deliveryTrips/{id}`: `eligibleCouriers` contiene `["rCpnpzQVcoPDoUdU4cJE1HpuLGA2"]`.
5. **Verificar en Cliente:** Pantalla muestra *"Radio cercano 5 km • 1 disponible(s)"*.
6. **Verificar en Courier:**
   - La pestaña superior pasa a *"🟢 Disponibles (1)"*.
   - `PedidosEntrantesScreen` dibuja la tarjeta flotante de la encomienda con remitente, destino y oferta.
   - Sonido y vibración activados.
7. **Verificar Reclamo:** Motorizado pulsa *"ACEPTAR"* $\to$ transacción atómica de `claimTripAtomically` $\to$ asignación formal exitosa.

---
**FIN DEL REPORTE DE AUDITORÍA FORENSE**
