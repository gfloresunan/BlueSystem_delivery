# Auditoría Forense: Causa Raíz de Dispatch y Descubrimiento de Motorizados X→Y
**Documento de Referencia:** `BSD_X2Y_DYNAMIC_DISPATCH_ROOT_CAUSE_AUDIT.md`  
**Identificador de Incidencia:** `BSD-X2Y-DYNAMIC-DISPATCH-RADIUS-001`  
**Ecosistema:** BlueSystem Delivery Enterprise v2.2  
**Fecha:** 2026-09-21  
**Auditor:** Senior Developer & Auditor de BlueSystem  
**Estado:** AUDITORÍA READ-ONLY FINALIZADA / ANTES DE IMPLEMENTACIÓN  

---

## 0. Reconocimiento Formal del Frozen Core Financiero
Se reconoce formal y explícitamente que:
- **`BSD-X2Y-FINANCIAL-FROZEN-CORE-001` (ADR-026)** se encuentra estrictamente **CONGELADO E INMUTABLE**.
- Esta auditoría y posterior implementación **NO tocan ni autorizan modificaciones** sobre:
  - `/system_config/global.xToYPricing`
  - `routingService.ts`
  - `RealRoutingEngine.kt`
  - `SolicitarEnvioScreen.kt` (contrato de precios/fórmulas)
  - `pricingSnapshot` (SSOT inmutable)
  - `trips.ts` (lógica contable de `onTripCompleted`)
  - `financial_events`, `courier_cash_ledger`, `courier_balances`, `courier_daily_closures`, depósitos bancarios ni liquidaciones mercantiles.
  - Las 10 Invariantes Financieras de Dominio B (X→Y).

El alcance de esta intervención se circunscribe estrictamente a: **Courier Discovery, Geospatial Query, Escalabilidad de Radio Dinámico, Offer Lifecycle, Máquina de Estados de Dispatch, Timeouts, Protección de Carrera (Race Condition Protection) y UX de Cliente / Motorizado**.

---

## 1. Respuesta a la Pregunta Central
> **¿Por qué el delivery X→Y de la captura no llegó al motorizado que se estaba utilizando para la prueba?**

A través de la inspección forense exhaustiva de código y reglas de seguridad de Firestore, se concluye con evidencia objetiva irrefutable que existieron **dos causas raíz técnicas críticas (Root Causes)** que impidieron de forma concurrente que la oferta llegara a la bandeja del motorizado:

### Causa Raíz 1 (Bloqueo de Seguridad en Firestore Rules - Principal):
En [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L603-L608):
```text
match /deliveryTrips/{tripId} {
  allow read: if isAuthenticated() && (
      isPlatformAdmin() ||
      currentUid() == resource.data.customerId ||
      currentUid() == resource.data.assignedCourierId
  );
```
Cuando el motorizado en la app ejecuta su listener de bolsa X→Y en [`FirebaseManager.kt:L789`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L789):
```kotlin
val listenerXToYPool = db.collection("deliveryTrips")
    .whereIn("status", listOf("PENDING", "pending", "READY", "ready", "listo", "LISTO"))
    .addSnapshotListener { snapshot, error ->
        if (error != null) return@addSnapshotListener
        ...
```
Firestore evalúa si el usuario autenticado tiene permisos para leer los documentos retornados por la consulta. Como la regla exige que `currentUid() == resource.data.assignedCourierId`, y un viaje recién creado **aún no tiene courier asignado (`assignedCourierId == null` o `""`)**, la consulta falla de inmediato con `PERMISSION_DENIED`.  
En [`FirebaseManager.kt:L792`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L792), el listener descarta silenciosamente el error (`if (error != null) return@addSnapshotListener`), por lo que `poolTripsMap` permanece **completamente vacío (`size = 0`)**.

### Causa Raíz 2 (Desconexión de Dominio en Consulta de /orders - Secundaria):
La solicitud X→Y también crea un documento espejo en `/orders/{orderId}` ([`MainActivity.kt:L829`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L829)). Sin embargo:
1. El listener principal de órdenes de la app motorizado ([`FirebaseManager.kt:L698`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L698)) filtra obligatoriamente por `.whereEqualTo("commercialMunicipalityId", normMuni)`. El payload de X→Y **no genera `commercialMunicipalityId`** (porque es punto a punto, sin sucursal comercial), por lo que la consulta de `/orders` nunca incluye este viaje.
2. Adicionalmente, el filtro local de `/orders` en [`FirebaseManager.kt:L615`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L615) descarta explícitamente cualquier orden con `serviceType == "X_TO_Y_DELIVERY"`.

---

## 2. Análisis Punto por Punto de los Factores Investigados

| Factor Auditado | Estado | Evidencia y Hallazgo Técnico |
| :--- | :---: | :--- |
| **A. Distancia** | ℹ️ No Evaluada | Ni en [`FirebaseManager.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L626-L641) ni en el backend existe actualmente una condición operativa que filtre las encomiendas X→Y por distancia del motorizado. El "Radio de 5 km" mostrado en la app del cliente era puramente un texto estático e indicador visual hardcodeado en [`EsperandoRepartidorScreen.kt:L320`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/EsperandoRepartidorScreen.kt#L320). |
| **B. Disponibilidad** | 🟢 Disponible | Si el motorizado no tiene orden activa asignada y su saldo no excede el límite de efectivo (`isFinanciallyEligible == true`), su estado operativo es `available`. |
| **C. Estado Online** | 🟢 EN LÍNEA | La captura del motorizado muestra el badge superior `EN LÍNEA` con selector de turno activo. En la vista [`PedidosEntrantesScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/PedidosEntrantesScreen.kt#L642-L685) se renderizó el estado `EMPTY` ("Esperando pedidos en Managua..."), no el estado `OFFLINE` ("Estás desconectado"). |
| **D. Ubicación** | ⚠️ Estática | La app de motorizado solo actualiza activamente su telemetría en `/ubicaciones_repartidores` cuando está dentro de [`RutaActivaScreen.kt:L333`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt#L333). En reposo sobre el dashboard, no existe worker de emisión GPS continuo a Firestore. |
| **E. Geospatial Query** | 🔴 Inexistente | No existe consulta geoespacial (`geohash`, `ST_Distance`, ni bounding box) en la consulta de `/deliveryTrips`. El listener de Android consulta toda la colección por `status in ['PENDING', 'READY']`. |
| **F. Tenant / Ciudad** | 🟢 Compatible | En [`FirebaseManager.kt:L637`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L637), si `order.municipalityId` está en blanco (caso de X→Y), `isSameMunicipality` evalúa a `true`, permitiendo compatibilidad general. |
| **G. Estado del Courier** | 🟢 Libre | El courier no tenía ruta activa (`activeRouteOrder == null`) ni órdenes asignadas pendientes (`assignedOrders.isEmpty()`). |
| **H. Notificación FCM** | 🟡 Emitida a Topic | [`functions/src/triggers/orders.ts:L225`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/orders.ts#L225) emitió `NEW_X_TO_Y_DELIVERY` al topic `available_orders`. La notificación puede haber llegado al dispositivo, pero al abrir la app la bandeja dependía del listener de Firestore que estaba bloqueado por `PERMISSION_DENIED`. |
| **I. Claim / UI** | 🔴 Bandeja Vacía | Al estar bloqueada la lectura en Firestore por reglas de seguridad, `ordersState.poolOrders` tuvo longitud 0, renderizando la UI de lista vacía ("Disponibles (0)"). |
| **J. Listener** | 🔴 Fallo Silencioso | [`listenerXToYPool`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L789) recibió error de permisos y no emitió elementos. |

---

## 3. Matriz de Clarificación: "Activo" vs "Elegible"
La pantalla del cliente mostraba:
```text
Radio de 5 km • 01:40 • 5 activos
```
### ¿Qué significa realmente "5 activos" en el código actual?
En [`EsperandoRepartidorScreen.kt:L142-L156`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/EsperandoRepartidorScreen.kt#L142-L156):
```kotlin
db.collection("ubicaciones_repartidores")
    .limit(20)
    .addSnapshotListener { snap, _ ->
        val list = mutableListOf<CourierLiveMarker>()
        for (doc in snap.documents) {
            val lat = doc.getDouble("latitud") ?: ...
            val lng = doc.getDouble("longitud") ?: ...
            if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
                list.add(CourierLiveMarker(doc.id, lat, lng, name))
            }
        }
        liveCouriers = list
    }
```
**Conclusión Forense:** El contador "5 activos" representa **cualquier documento en la colección `/ubicaciones_repartidores` que contenga coordenadas distintas de cero**, sin importar:
1. Si el motorizado está a 1 km o a 80 km de distancia del Punto X.
2. Si su última ubicación fue hace 5 minutos o hace 3 meses.
3. Si el motorizado está en turno `ONLINE` o desconectado `OFFLINE`.
4. Si está bloqueado financieramente por mora o límite de efectivo.
5. Si ya se encuentra ocupado realizando otro pedido.

### Matriz Forense de Clasificación Operacional

| Courier | Online (Turno) | Disponible (Sin ruta) | Ubicación Fresca (<10m) | Distancia a X (<= 5 km) | Sin Bloqueo Financiero | ¿Realmente Elegible X→Y? |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** (Prueba) | ✅ SÍ | ✅ SÍ | ⚠️ Incierta | ⚠️ Sin filtrar | ✅ SÍ | 🔴 Bloqueado por Rule Firestore |
| **B** (Histórico) | ❌ NO | ❌ NO | ❌ Stale (>24h) | ❌ Fuera radio | ❓ | ❌ Inelegible |
| **C** (Ocupado) | ✅ SÍ | ❌ Ocupado | ✅ SÍ | ✅ Dentro | ✅ SÍ | ❌ Inelegible (Ocupado) |
| **D** (Bloqueado) | ✅ SÍ | ✅ SÍ | ✅ SÍ | ✅ Dentro | ❌ Excede Límite | ❌ Inelegible (Finanzas) |
| **E** (Lejano) | ✅ SÍ | ✅ SÍ | ✅ SÍ | ❌ 18 km | ✅ SÍ | ❌ Inelegible (Fuera de 5 km) |

---

## 4. Auditoría de Componentes del Flujo X→Y

### 4.1. Creación del Viaje (`MainActivity.kt`)
- Al confirmar el envío en [`MainActivity.kt:L898`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L898), se guarda en `/deliveryTrips/{tripId}` con estado inicial `"PENDING"` (o `"PAYMENT_VERIFYING"` si es transferencia).
- Posee los campos canónicos: `tripId`, `origin` (`address`, `latitude`, `longitude`), `destination` (`address`, `latitude`, `longitude`), `pricingSnapshot`, `customerOffer`, `payer`, `createdAt`.
- **GAP Identificado:** No inicializa el bloque canónico de dispatch (`dispatchStage`, `dispatchRadiusKm`, `firstExpansionAt`, `timeoutAt`).

### 4.2. Motor de Elegibilidad (`FleetEligibilityEngine.kt`)
- Existe el método [`evaluateXToYTripEligibility`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/engine/FleetEligibilityEngine.kt#L165-L215), que valida:
  1. Restricciones financieras (`canReceiveNewOrders`, `cashOutstandingCents < effectiveCashLimitCents`, sin mora).
  2. Estado `isOnline` y `isActive`.
  3. Ausencia de asignación concurrente (`activeAssignmentId.isNullOrEmpty()`).
  4. Frescura de ubicación GPS (`lastLocationUpdateMs <= 10 min`).
  5. Distancia haversine (`distKm <= maxRadiusKm`).
- **GAP Identificado:** Este método puramente de dominio **no estaba siendo consumido por `FirebaseManager.kt` ni por ningún worker de despacho en tiempo real**, existiendo solo en pruebas unitarias.

### 4.3. Reclamación Atómica (`claimTripAtomically`)
- [`FirebaseManager.kt:L135-L158`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L135-L158) implementa una transacción atómica `runTransaction` que previene colisiones entre dos motorizados.
- **GAP Identificado:** Actualmente no verifica si el viaje ya expiró por timeout (`status == "CANCELLED"`), lo que podría permitir una condición de carrera si el timeout y el reclamo ocurren en el mismo segundo.

### 4.4. Reglas de Seguridad (`firestore.rules`)
- En la raíz [`firestore.rules:L604`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L604), la regla de lectura sobre `/deliveryTrips/{tripId}` prohíbe que cualquier usuario que no sea el cliente o el courier **ya asignado** lea el documento.
- Debe corregirse de forma quirúrgica para permitir lectura pública o a usuarios autenticados cuando `resource.data.status in ['PENDING', 'pending', 'READY', 'ready']`, permitiendo que el Fleet Pool de motorizados escuche viajes disponibles, exactamente igual a como opera `/orders`.

---

## 5. Próximos Pasos Técnicos
Una vez aprobada esta auditoría, se procederá con la **Fase de Planificación e Implementación Quirúrgica**:
1. Ajuste de regla en `firestore.rules` para permitir que el pool de motorizados lea `/deliveryTrips` pendientes.
2. Definición del modelo canónico de despacho en `/deliveryTrips`:
   - `dispatchStage`: `SEARCHING_5KM` (0-3 min) → `EXPANDED_15KM` (3-6 min) → `EXPANDED_30KM` (6-10 min) → `TIMEOUT` (10 min).
   - `dispatchRadiusKm`: 5 → 15 → 30.
   - `dispatchCreatedAt`: SSOT inmutable para cálculo de tiempo transcurrido (`now - createdAt`).
3. Sincronización reactiva del radio dinámico en la UI del cliente (`EsperandoRepartidorScreen.kt`):
   - Círculo de Google Maps adaptativo (5 km → 15 km → 30 km).
   - Conteo verificado de motorizados (solo aquellos con distancia haversine $\le$ radio activo).
   - Pantalla de indisponibilidad tras los 10 minutos con botón de nueva solicitud.
4. Integración de `FleetEligibilityEngine.evaluateXToYTripEligibility` en el flujo de motorizados para que solo vean y reciban pedidos cuyo origen esté dentro del radio dinámico vigente del viaje.
5. Blindaje de carrera atómica en `claimTripAtomically` contra cancelación por timeout.
6. Cloud Function / Scheduler o Callable autoritativo para garantizar que si el cliente cierra la app, el timeout a los 10 minutos se ejecute de forma server-authoritative.
