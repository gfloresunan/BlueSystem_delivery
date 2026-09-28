# AUDITORÍA FORENSE DE CAUSA RAÍZ: DASHBOARD DELIVERY EXPRESS X→Y
## BlueSystem Delivery Enterprise v6.2.0
### Referencia: BSD-X2Y-CONTROL-TOWER-OPERATIONAL-TRUTH-001
### Alcance: Admin Web → Delivery Express X→Y → Encomiendas en Vivo

---

## 1. Declaración de Cumplimiento e Inmutabilidad del Frozen Core
Se reconoce formalmente que el dominio financiero:
- **`BSD-X2Y-FINANCIAL-FROZEN-CORE-001`**
- **`ADR-026`**

permanece **COMPLETAMENTE CONGELADO E INMUTABLE**.
No se ha modificado ni se modificará ninguna de las siguientes entidades:
- `/system_config/global.xToYPricing`
- `routingService.ts`
- `RealRoutingEngine.kt`
- `SolicitarEnvioScreen.kt`
- `pricingSnapshot` (estructuras, tipos y políticas de cálculo)
- `trips.ts` (lógica financiera)
- `/financial_events`
- `/courier_cash_ledger`
- `/courier_balances`
- Procesos de arqueo, cierre, depósito bancario y liquidación (`closure`, `deposit`, `settlement`).
- Ninguna de las 10 invariantes financieras canónicas:
  $$\text{CUSTOMER\_TOTAL} = \text{COURIER\_EARNINGS} + \text{PLATFORM\_REVENUE}$$
  $$\text{COURIER\_EARNINGS} = \text{DISTANCE} \times \text{PRICE\_PER\_KM}$$
  $$\text{PLATFORM\_REVENUE} = \text{BASE\_FEE}$$
  $$\text{CASH\_COLLECTED} = \text{CUSTOMER\_TOTAL}\quad (\text{en efectivo})$$

Esta auditoría y su posterior intervención se limitan **estricta y quirúrgicamente a la verdad operacional, visualización, reactividad en tiempo real, historial, paginación, filtros y asignación administrativa** en el panel de control (`panel-admin/public/js/dashboard/deliveryExpress.js`).

---

## 2. Diagnóstico de la Fuente de Verdad del Dashboard

### 2.1. ¿De dónde obtiene actualmente el Dashboard sus datos?
El módulo `deliveryExpress.js` se conecta a Firestore exclusivamente a través de:
```javascript
const tripsRef = db.collection('deliveryTrips');
deliveryExpressModule.unsubscribeTrips = tripsRef
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => { ... });
```

Las cuatro métricas superiores se calculan en memoria en `updateKpis()`:
- **Total Encomiendas (9)**: `trips.length` (tamaño de la muestra de los últimos 50 viajes).
- **En Tránsito / Activas (4)**: `trips.filter(t => ['ASSIGNED', 'EN_ROUTE_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes((t.status || '').toUpperCase())).length`.
- **Por Asignar (0)**: `trips.filter(t => (t.status || '').toUpperCase() === 'PENDING').length`.
- **Tarifas Acumuladas (C$ 1918.78)**: Suma de montos autoritativos de los documentos leídos.

### 2.2. Colección `/delivery_express_summaries`
- **Estatus en Firestore**: **0 documentos** (la colección no existe ni contiene registros).
- **Rol en el Sistema**: En `deliveryExpress.js` línea 86 aparece una mención en texto estático HTML: `Históricos consolidados globales: /delivery_express_summaries (ADR-003)`.
- **Dictamen**:
  - No es una fuente operacional en tiempo real ni un snapshot activo.
  - La interfaz la mencionaba como referencia conceptual a ADR-003, pero **ningún listener ni query de JavaScript la consume**.
  - La fuente primaria y autoritativa de encomiendas X→Y es y debe ser **/deliveryTrips**.

---

## 3. Matriz Exhaustiva de los 9 Viajes Reales en Firestore

A continuación se presenta la evidencia forense recopilada directamente desde Firestore (cotejando `/deliveryTrips` vs `/orders`):

| ID Documento | ID Corto | Status (`/deliveryTrips`) | Estado (`/deliveryTrips`) | Status (`/orders`) | Courier ID Real | Courier Nombre Resuelto | Distancia | Monto | Fecha Creación |
|---|---|---|---|---|---|---|---|---|---|
| `env_01e2a61e` | `#E2A61E` | `picked_up` | `recogido` | `completed` | `6VkVNQ2yRzS67kEIYfyATkuwBiI3` | Juan Delivery | 11.29 km (Est.) | C$ 204.30 | 2026-08-28 06:06:48 |
| `env_1d7efd7b` | `#7EFD7B` | `CANCELLED` | *n/a* | *NO_ORDER* | *Sin asignar* | Sin asignar | 11.29 km (Est.) | C$ 204.30 | 2026-08-25 04:22:43 |
| `env_1ddcd55b` | `#DCD55B` | `picked_up` | `recogido` | `completed` | `rCpnpzQVcoPDoUdU4cJE1HpuLGA2` | Delivery Managua Flores | 15.54 km (Vial) | C$ 268.03 | 2026-09-17 14:52:07 |
| `env_4f2479ca` | `#2479CA` | `CANCELLED` | *n/a* | `cancelled` | *Sin asignar* | Sin asignar | 9.60 km (Est.) | C$ 179.01 | 2026-08-25 03:26:33 |
| `env_6291f4f2` | `#91F4F2` | `completed` | `completado` | `completed` | `6VkVNQ2yRzS67kEIYfyATkuwBiI3` | Juan Delivery | 11.29 km (Est.) | C$ 204.30 | 2026-08-25 05:59:42 |
| `env_6d575072` | `#575072` | `completed` | `completado` | `completed` | `6VkVNQ2yRzS67kEIYfyATkuwBiI3` | Juan Delivery | 11.29 km (Est.) | C$ 204.30 | 2026-08-25 05:41:07 |
| `env_a7d0c338` | `#D0C338` | `CANCELLED` | *n/a* | `ready` | *Sin asignar* | Sin asignar | 11.29 km (Est.) | C$ 204.30 | 2026-08-25 05:27:13 |
| `env_d443c261` | `#43C261` | `in_transit` | `en_camino` | `completed` | `rCpnpzQVcoPDoUdU4cJE1HpuLGA2` | Delivery Managua Flores | 15.41 km (Vial) | C$ 266.15 | 2026-09-18 14:39:24 |
| `env_f920846b` | `#20846B` | `in_transit` | `en_camino` | `completed` | `rCpnpzQVcoPDoUdU4cJE1HpuLGA2` | Delivery Managua Flores | 14.91 km (Vial) | C$ 184.10 | 2026-09-21 20:17:05 |

---

## 4. Análisis de Causa Raíz de los Problemas Observados

### 4.1. Problema: Viaje #20846B aparece como "EN TRÁNSITO" y "Motorizado: Por asignar"
1. **Mecanismo de Creación**: En `MainActivity.kt:829` y `MainActivity.kt:898`, al solicitar una encomienda X→Y, el cliente escribió simultáneamente en `/orders/{id}` y `/deliveryTrips/{id}`.
2. **Aceptación del Motorizado**: En `FirebaseManager.kt:920-958`, el método `aceptarPedido(pedidoId, motorizadoId)` evalúa:
   ```kotlin
   val orderSnap = transaction.get(orderDocRef)
   if (orderSnap.exists()) {
       transaction.update(orderDocRef, mapOf(
           "status" to "courier_accepted",
           "assignedCourierId" to resolvedMotorizadoId,
           ...
       ))
   } else {
       val tripSnap = transaction.get(tripDocRef)
       ...
   }
   ```
   Como `/orders/{id}` existía, `aceptarPedido` actualizó **únicamente el documento `/orders`**, asignando `assignedCourierId = "rCpnpzQVcoPDoUdU4cJE1HpuLGA2"`. El documento `/deliveryTrips/{id}` **no fue tocado** en la asignación, quedando sin courier asignado.
3. **Recogida en Origen (Pickup)**: En `RutaActivaScreen.kt:1319`, al confirmar la recogida, se actualizaron ambos documentos con `status: "in_transit"`, `estado: "en_camino"`, `courierPhase: 2`, pero sin escribir `assignedCourierId`.
4. **Entrega Final (Delivery)**: En `RutaActivaScreen.kt:1385-1406`, al confirmar la entrega, la app intentó actualizar `/orders` y `/deliveryTrips` con el mapa `finalUpdates`, el cual incluía:
   `"changeGiven"`, `"cashCollectedNet"`, `"discrepancyAmount"`, `"financialReconciliationStatus"`.
   - En `/orders`, la regla de Firestore (`firestore.rules:581`) contenía estos campos en su `.hasOnly(...)`, por lo que **la orden se completó exitosamente** (`status: "completed"`, `deliveredAt: 1790022269`).
   - En `/deliveryTrips`, la regla de Firestore (`firestore.rules:614`) **no tenía esos 4 campos** en su lista permitida de `.hasOnly(...)`.
   - Consecuencia: Firestore rechazó la escritura con `PERMISSION_DENIED`. El documento `/deliveryTrips/env_f920846b` quedó permanentemente detenido en `status: "in_transit"` sin courier asignado.
5. **Impacto en el Dashboard**: Dado que `deliveryExpress.js` leía ciegamente `deliveryTrips.status` y `deliveryTrips.assignedCourierId`, mostraba `#20846B` como `EN TRÁNSITO` y `Por asignar`.

### 4.2. Problema: Viajes Históricos con "Distancia: 0.00 km"
- Los viajes `#E2A61E`, `#91F4F2`, `#575072`, `#7EFD7B` y `#D0C338` fueron creados en fases preliminares antes de la introducción del objeto `pricingSnapshot`.
- `deliveryExpress.js:459-461` evaluaba exclusivamente:
  ```javascript
  const distKm = t.pricingSnapshot?.routeDistanceKm != null
      ? Number(t.pricingSnapshot.routeDistanceKm).toFixed(2)
      : (t.routeDistanceMeters ? (Number(t.routeDistanceMeters) / 1000).toFixed(2) : '0.00');
  ```
- Al ser nulos ambos campos, caía al fallback estático `'0.00'`.
- Sin embargo, los documentos contienen las coordenadas exactas de `origin` y `destination`. La fórmula Haversine entre `(12.1618, -86.1836)` y `(12.1056, -86.2701)` arroja exactamente **11.29 km**, y la tarifa registrada fue $35 + (11.2865 \times \$15) = \text{C\$ } 204.30$.
- El fallback debe calcular la distancia geodésica a partir de las coordenadas cuando la métrica de ruta no esté denormalizada.

### 4.3. Problema: KPIs Inconsistentes
- `EN TRÁNSITO / ACTIVAS`: Contaba como activas 4 encomiendas (`env_01e2a61e`, `env_1ddcd55b`, `env_d443c261`, `env_f920846b`) debido a que permanecían en `picked_up` e `in_transit` en `/deliveryTrips`.
- `POR ASIGNAR`: Marcaba 0 porque solo buscaba `'PENDING'`, ignorando el hecho de que viajes en tránsito aparecían sin motorizado.

---

## 5. Diseño Quirúrgico de la Solución (Sin Migración Masiva)

Siguiendo el principio de cambio mínimo y la prohibición expresa de mutar Firestore de forma destructiva o empírica, la solución se implementa en la **capa de gobernanza y visualización del Control Tower**:

```
           FIRESTORE SSOT
                 │
                 ▼
          /deliveryTrips ─── (Lectura reactiva /onSnapshot)
                 │
                 ▼
     OPERATIONAL STATE RESOLVER
     ├── 1. Normalización de Status (PENDING, READY, ASSIGNED, IN_TRANSIT, DELIVERED, COMPLETED, CANCELLED)
     ├── 2. Resolución de Identidad de Motorizado (Caché en memoria couriersCache sin N+1)
     ├── 3. Enlace con Espejo /orders (Recuperación de estado verídico y UID de courier)
     └── 4. Estimación Geodésica Resiliente (Haversine ante ausencia de pricingSnapshot)
                 │
                 ▼
          ADMIN CONTROL TOWER
     ├── Vista Paginada (10 por página con cursores limpios)
     ├── Filtro Temporal por Rango de Fechas (createdAt canónico)
     ├── Buscador Multicampo (ID, remitente, destinatario, teléfonos, courier)
     └── Asignación Manual Atómica (db.runTransaction con lock de concurrencia)
```

---

## 6. Conclusiones y Próximos Pasos
La auditoría confirma con evidencia matemática y forense cada uno de los síntomas reportados. Se procede a la implementación del parche quirúrgico en `deliveryExpress.js` respetando plenamente el Frozen Core de `ADR-026`.
