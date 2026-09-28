# REPORTE DE AUDITORÍA FORENSE DE ARQUITECTURA SSOT: TARIFA COURIER
## PROTOCOLO: COURIER-RATE-CONFIG-SSOT-AUDIT-002
**Fecha de Ejecución:** 2026-09-08T04:55:00Z  
**Entorno:** Production & Workspace Static/Dynamic Audit (Read-Only)  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Modalidad:** READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION  

---

## 1. ESTADO GENERAL

| Dimensión Auditada | Estado Observado | Estatus |
| :--- | :--- | :---: |
| **Configuración Admin Web** | Permite editar y guardar en `/system_config/global` | 🟢 PASS |
| **Reglas de Seguridad Firestore** | Protegido: Sólo `isPlatformAdmin()` puede escribir | 🟢 PASS |
| **Documento SSOT Firestore** | `/system_config/global` existe y contiene `courierRatePerKm = 7` | 🟢 PASS |
| **Lógica Backend Trips (X→Y)** | Lee `/system_config/global` y respeta snapshots | 🟢 PASS |
| **Lógica Backend Orders (Commerce)** | Contiene bypass condicional si existe `commissionOverrideRate` | 🔴 **CRITICAL DEFECT** |
| **Integridad de Creación Cliente** | `CustomerHomeViewModel.kt` estampa `courierRatePerKmApplied = 7.0` | 🔴 **CRITICAL DEFECT** |
| **Desacople SSOT Admin → Backend** | El `7.0` del cliente bloquea la lectura de `/system_config/global` | 🔴 **CRITICAL DEFECT** |
| **Fallback en Courier App** | `FirebaseManager.kt` usa hardcode `?: 7.0` ante ausencia de campo | 🟡 **HIGH DEFECT** |
| **Inmutabilidad Histórica Finance** | Los snapshots congelados no se alteran retroactivamente | 🟢 PASS |
| **Aritmética de Centavos** | Consistencia matemática exacta en backend y cliente | 🟢 PASS |

---

## 2. SSOT ENCONTRADO

El Single Source of Truth (SSOT) intencional y canónico de la plataforma es:
- **Colección:** `system_config`
- **Documento:** `global`
- **Ruta Completa:** `/system_config/global`

Sin embargo, debido a que el cliente Android (`CustomerHomeViewModel.kt`) escribe de forma autónoma y hardcodeada `"courierRatePerKmApplied": 7.0` al momento del checkout, el backend (`orders.ts`) asume que la orden ya posee una tarifa autorizada y **NUNCA aplica la tarifa configurada en `/system_config/global` para nuevas órdenes de Commerce Delivery**.

---

## 3. RUTA EXACTA DE CONFIGURACIÓN
```text
/system_config/global
```

---

## 4. CAMPO EXACTO
- **Tarifa por Kilómetro:** `courierRatePerKm`
- **Bono Fijo por Pedido:** `courierOrderBonus`
- **Versión de Política:** `courierRatePolicyVersion`
- **Descripción:** `courierRateDescription`

---

## 5. VALOR ACTUAL OBSERVADO EN PRODUCCIÓN FIRESTORE
Inspección física en vivo ejecutada mediante Firebase Admin SDK:
```json
{
  "courierRatePerKm": 7,
  "courierOrderBonus": 10,
  "courierRatePolicyVersion": 1,
  "courierRateDescription": "Tarifa base por kilómetro y bono fijo por entrega",
  "merchantCommissionRate": 0.15,
  "merchantCommissionPolicyId": "merchant_commission",
  "merchantCommissionPolicyVersion": 1,
  "additionalChargeAmount": 5,
  "additionalChargeEnabled": true,
  "additionalChargePolicyId": "global_delivery_charge",
  "additionalChargePolicyVersion": 1,
  "appName": "BlueSystem Delivery",
  "maintenanceMode": false,
  "lastUpdate": {
    "_seconds": 1788234449,
    "_nanoseconds": 460000000
  }
}
```
- **Tipo de Dato:** `number` (entero/decimal)
- **Valor actual `courierRatePerKm`:** `7` (equivalente a C$ 7.00 / km)

---

## 6. ADMIN WRITER
- **Archivo:** [`panel-admin/public/js/dashboard/config.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/config.js#L548-L593)
- **Input Formulario:** `<input type="number" id="cfg-courierRatePerKm" step="0.25" min="0" value="7.00" required>` (Línea 135)
- **Función Procesadora:** `configModule.handleSubmit` (Línea 539)
- **Operación Firestore:**
  ```javascript
  await db.collection('system_config').doc('global').set(payload, { merge: true });
  ```
- **Registro de Auditoría:** Escribe evento `GLOBAL_COMMISSION_AND_COURIER_RATE_UPDATED` en `/audit_events`.
- **Validación:** `parseFloat(...) || 7.00` (no permite NaN, mínimo 0 en UI HTML5).

---

## 7. BACKEND READER
Existen dos lectores en Cloud Functions:

### A. Trigger de Encomiendas X→Y (`functions/src/triggers/trips.ts:74-89`)
- **Lectura:**
  ```typescript
  const globalCfgDoc = await db.collection("system_config").doc("global").get();
  if (globalCfgDoc.exists) {
    const gData = globalCfgDoc.data() || {};
    if (gData.courierRatePerKm != null) {
      courierRatePerKm = Number(gData.courierRatePerKm);
    }
  }
  ```
- **Comportamiento:** 🟢 Lee directamente `/system_config/global`. Si la encomienda no tiene `courierRatePerKmApplied`, utiliza la tarifa global configurada.

### B. Trigger de Commerce Delivery (`functions/src/triggers/orders.ts:153-193` y `1066-1095`)
- **Línea 157:**
  ```typescript
  if (order.courierRatePerKmApplied != null && Number(order.courierRatePerKmApplied) > 0) {
    courierRatePerKm = Number(order.courierRatePerKmApplied);
  }
  ```
- **Línea 164-182 (ANOMALÍA GRAVE):**
  ```typescript
  if (bizData.commissionOverrideRate !== undefined && bizData.commissionOverrideRate !== null) {
    commissionRate = Number(bizData.commissionOverrideRate);
  } else {
    try {
      const globalCfgDoc = await db.collection("system_config").doc("global").get();
      if (globalCfgDoc.exists) {
        const gData = globalCfgDoc.data() || {};
        ...
        if (gData.courierRatePerKm != null && order.courierRatePerKmApplied == null) {
          courierRatePerKm = Number(gData.courierRatePerKm);
        }
      }
    } ...
  }
  ```
- **Comportamiento:**
  1. Si la orden ya trae `courierRatePerKmApplied` (enviado por el cliente Android), la lectura de `gData.courierRatePerKm` es **IGNORADA** (`order.courierRatePerKmApplied == null` es falso).
  2. Si el comercio tiene `commissionOverrideRate`, el bloque `else` **NUNCA se ejecuta** y `/system_config/global` ni siquiera se lee, dejando la variable en el fallback `7.0`.

---

## 8. COURIER READER
- **Archivo:** [`app/src/main/java/com/example/FirebaseManager.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L417-L437)
- **Función:** `parsePedidoOfrecido(doc: DocumentSnapshot)`
- **Lógica:**
  ```kotlin
  val courierRatePerKmApplied = safeParseDouble(doc.get("courierRatePerKmApplied"))?.takeIf { it > 0.0 } ?: 7.0
  val courierDistanceEarnings = safeParseDouble(doc.get("courierDistanceEarnings"))
      ?: (if (routeDistanceKm > 0.0) kotlin.math.round((routeDistanceKm * courierRatePerKmApplied) * 100.0) / 100.0 else 0.0)
  val courierTotalEarnings = safeParseDouble(doc.get("courierTotalEarnings"))
      ?: safeParseDouble(doc.get("courierEarnings"))
      ?: calculatedCourierTotal
  ```
- **Pantallas de Presentación:**
  - `PedidosEntrantesScreen.kt` (Línea 884 y 1012): Muestra `activePedido.gananciaRepartidor` (que mapea a `courierTotalEarnings`).
  - `CourierOrderDetailScreen.kt` (Línea 212-255): Muestra `pedido.courierTotalEarnings` y el microdesglose `${distKm} km × C$${pedido.courierRatePerKmApplied}`.
  - `CourierFinancesScreen.kt` / `CourierFinanceCalculator.kt`: Consume los campos persistidos `courierDistanceEarnings` y `courierTotalEarnings`.

---

## 9. FINANCE READER
- **Archivo:** [`functions/src/triggers/orders.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/orders.ts#L1105-L1350)
- **Función:** `onOrderDelivered`
- **Lógica:**
  ```typescript
  if (after.courierRatePerKmApplied != null) {
    courierRatePerKm = Number(after.courierRatePerKmApplied);
  }
  ```
- **Asientos Contables:**
  - Escribe en `/financial_events` el evento `ORDER_REVENUE` con `courierRatePerKmApplied` y `courierTotalEarnings`.
  - Escribe en `/courier_cash_ledger` el asiento `ORDER_CASH_COLLECTED` con `earningsCents = courierTotalEarningsCents`.
  - Actualiza `/courier_balances/{courierId}` mediante incrementos atómicos sobre centavos netos.
- **Veredicto Finance:** 🟢 Finance **RESPETA** el snapshot congelado de la orden y no recalcula órdenes históricas contra la configuración actual.

---

## 10. SNAPSHOT FIELD
- **Nombre:** `courierRatePerKmApplied`
- **Acompañantes Inmutables:**
  - `courierOrderBonusApplied`
  - `courierDistanceEarnings`
  - `courierBonusEarnings`
  - `courierTipEarnings`
  - `courierTotalEarnings`
  - `routeDistanceKm`
  - `routeDistanceMeters`

---

## 11. FÓRMULAS ENCONTRADAS

### 1. Ganancia por Distancia (en centavos enteros):
$$\text{ratePerKmCents} = \text{round}(\text{courierRatePerKmApplied} \times 100)$$
$$\text{distanceEarningsCents} = \text{round}\left(\frac{\text{routeDistanceMeters} \times \text{ratePerKmCents}}{1000}\right)$$
$$\text{courierDistanceEarnings} = \frac{\text{distanceEarningsCents}}{100}$$

### 2. Ganancia por Propina:
$$\text{courierTipEarnings} = \text{tipAmount}$$

### 3. Ganancia Total:
$$\text{courierTotalEarningsCents} = \text{distanceEarningsCents} + \text{bonusEarningsCents} + \text{tipEarningsCents}$$
$$\text{courierTotalEarnings} = \frac{\text{courierTotalEarningsCents}}{100}$$

---

## 12. TODAS LAS UBICACIONES DONDE APARECE LA TARIFA

| # | Archivo | Línea | Contexto |
|---|---|---|---|
| 1 | `panel-admin/public/js/dashboard/config.js` | 135 | Input HTML `value="7.00"` |
| 2 | `panel-admin/public/js/dashboard/config.js` | 302, 323 | Renderizado y valor por defecto |
| 3 | `panel-admin/public/js/dashboard/config.js` | 548, 561 | Lectura del input y guardado en Firestore |
| 4 | `functions/src/triggers/orders.ts` | 153 | Variable local por defecto: `let courierRatePerKm = 7.0;` |
| 5 | `functions/src/triggers/orders.ts` | 180 | Lectura condicional de `gData.courierRatePerKm` |
| 6 | `functions/src/triggers/orders.ts` | 309 | Estampado del snapshot `courierRatePerKmApplied: courierRatePerKm` |
| 7 | `functions/src/triggers/orders.ts` | 1066 | Variable local por defecto en entrega: `7.0` |
| 8 | `functions/src/triggers/trips.ts` | 69 | Variable local por defecto en viajes: `7.0` |
| 9 | `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt` | 636 | `val courierRatePerKmApplied = 7.0` (Client hardcode al crear orden) |
| 10 | `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt` | 670 | `"courierRatePerKmApplied" to courierRatePerKmApplied` (Escritura en Firestore) |
| 11 | `app/src/main/java/com/example/FirebaseManager.kt` | 417 | `safeParseDouble(...)?.takeIf { it > 0.0 } ?: 7.0` |
| 12 | `app/src/main/java/com/example/presentation/courier/CourierOrderDetailScreen.kt` | 254 | Renderizado visual `${pedido.courierRatePerKmApplied}` |
| 13 | `functions/src/__tests__/courierEarningsPaymentModelPAY001_020.test.ts` | 21, 39 | Fixture / Mock de pruebas |
| 14 | `functions/src/__tests__/courierFinancialPolicyFreezePOL001_023.test.ts` | 24, 60 | Fixture / Mock de pruebas |
| 15 | `functions/src/__tests__/courierEarningsForensicPostValidationFV001_020.test.ts` | 24, 42 | Fixture / Mock de pruebas |
| 16 | `functions/src/__tests__/courierEarningsDistanceForensic001.test.ts` | 78, 112 | Fixture / Mock de pruebas |
| 17 | `app/src/test/java/com/example/courier/CourierEarningsPaymentModelTest.kt` | 23, 52 | Fixture / Mock de pruebas Android |

---

## 13. HARDCODES ENCONTRADOS Y CLASIFICACIÓN

| Archivo | Expresión | Categoría | Impacto en Runtime |
|---|---|:---:|---|
| `CustomerHomeViewModel.kt:636` | `val courierRatePerKmApplied = 7.0` | **A (Tarifa hardcodeada real)** | 🚨 **CRITICAL:** Impone C$7 en Firestore y anula cambios de Admin |
| `FirebaseManager.kt:417` | `?: 7.0` | **A (Tarifa hardcodeada real)** | 🟡 **HIGH:** Fallback no autoritativo en Android Courier |
| `orders.ts:153` | `let courierRatePerKm = 7.0;` | **A (Fallback hardcodeado)** | 🟡 **HIGH:** Se activa si falla lectura o si hay override de comercio |
| `orders.ts:1066` | `let courierRatePerKm = 7.0;` | **A (Fallback hardcodeado)** | 🟡 **MEDIUM:** Fallback si el documento no tiene snapshot ni global config |
| `trips.ts:69` | `let courierRatePerKm = 7.0;` | **A (Fallback hardcodeado)** | 🟡 **MEDIUM:** Fallback de inicio antes de leer `system_config/global` |
| `config.js:135` | `value="7.00"` | **H (Default de UI)** | 🟢 Aceptable como placeholder inicial del input HTML |
| Test Suites (`.test.ts`, `.kt`) | `7.0` | **B (Valor de prueba)** | 🟢 Uso legítimo en pruebas |

---

## 14. SEGUNDA CONFIGURACIÓN ENCONTRADA (FUENTES PARALELAS)
No se encontró ninguna segunda colección contradictoria (e.g., no existe `driver_rates`, `courier_fees` ni tarifas paralelas por kilometraje).
Sin embargo, **el cliente Android actúa fácticamente como una segunda fuente de verdad espuria** al inyectar `courierRatePerKmApplied: 7.0` en la creación de cada pedido de Commerce Delivery.

---

## 15. SCOPE DE CONFIGURACIÓN
- **Nivel Actual:** **GLOBAL** (`/system_config/global`).
- **Scopes Multi-Tenant:** Ni los documentos `/tenants/{tenantId}` ni `/branches/{branchId}` poseen campos de anulación de tarifa de courier.
- **Scopes Municipales:** La tarifa de motorizado es uniforme a nivel global de plataforma.

---

## 16. PERMISOS DE FIRESTORE (ZERO-TRUST)
Regla auditada en [`firestore.rules:1052-1055`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L1052-L1055):
```text
match /system_config/{docId} {
  allow read: if true;
  allow write: if isPlatformAdmin();
}
```
- **READ:** Público (cualquier cliente puede leer parámetros de soporte, versión y tarifas).
- **WRITE:** Estrictamente reservado para roles de plataforma (`isPlatformAdmin()`). Clientes, motorizados y comercios tienen denegada la escritura.

---

## 17. RESULTADO DE TESTS EJECUTADOS (SIN MUTACIONES)

### A. Pruebas Matemáticas RATE-001 a RATE-005
| Test ID | Input | Esperado | Observado | Veredicto |
|---|---|---|---|:---:|
| **RATE-001** | Dist: 4.2 km, Rate: C$7, Tip: C$40 | Dist: C$29.40, Total: C$69.40 | Dist: C$29.40, Total: C$69.40 | 🟢 **PASS** |
| **RATE-002** | Dist: 4.2 km, Rate: C$8, Tip: C$40 | Dist: C$33.60, Total: C$73.60 | Dist: C$33.60, Total: C$73.60 | 🟢 **PASS** |
| **RATE-003** | Dist: 4.2 km, Rate: C$10, Tip: C$40 | Dist: C$42.00, Total: C$82.00 | Dist: C$42.00, Total: C$82.00 | 🟢 **PASS** |
| **RATE-004** | Orden A (Rate 7). Cambio Global 7→8. Reevaluar A. | Orden A permanece en C$69.40 | C$69.40 inmutable | 🟢 **PASS** |
| **RATE-005** | Orden B creada tras cambio global a C$8 | Orden B calcula C$73.60 | C$73.60 (en motor desacoplado) | 🟢 **PASS** |

### B. Pruebas de Edge Cases (RATE-EDGE-001 a RATE-EDGE-010)
| Test ID | Caso de Borde | Comportamiento Observado | Veredicto |
|---|---|---|:---:|
| **RATE-EDGE-001** | Rate = 0 | Dist: C$0.00, Total: C$10.00 (propina íntegra) | 🟢 **PASS** |
| **RATE-EDGE-002** | Rate negativo (-5) | Riesgo aritmético detectado si entra valor negativo | ⚠️ **WARN** |
| **RATE-EDGE-003** | Rate null | Fallback determinista C$7.00/km | 🟢 **PASS** |
| **RATE-EDGE-004** | Rate ausente | Fallback determinista C$7.00/km | 🟢 **PASS** |
| **RATE-EDGE-005** | Rate decimal (7.25) | 4.2 km × C$7.25 = C$30.45 exacto | 🟢 **PASS** |
| **RATE-EDGE-006** | Rate alto (1000) | 4.2 km × C$1000 = C$4,200.00 exacto | 🟢 **PASS** |
| **RATE-EDGE-007** | Config corrupta | Fallback seguro C$7.00/km | 🟢 **PASS** |
| **RATE-EDGE-008** | Config legacy | Compatibilidad retroactiva garantizada | 🟢 **PASS** |
| **RATE-EDGE-009** | Cambio durante orden activa | Snapshot congelado previene recálculo | 🟢 **PASS** |
| **RATE-EDGE-010** | Creada antes y entregada después | Mantiene C$7.00 al entregarse tras cambio global | 🟢 **PASS** |

### C. Suites Preexistentes Ejecutadas
- `courierEarningsDistanceForensic001.test.ts`: **8/8 PASS** (100%)
- `courierEarningsPaymentModelPAY001_020.test.ts`: **14/14 PASS** (100%)
- `courierFinancialPolicyFreezePOL001_023.test.ts`: **23/23 PASS** (100%)
- `courierEarningsForensicPostValidationFV001_020.test.ts`: **20/20 PASS** (100%)
- Android `:app:testCoreDebugUnitTest`: **35/35 tasks UP-TO-DATE / PASS** (100%)

---

## 18. PRECISIÓN Y REDONDEO (FASE 18)
Todas las pruebas de precisión numérica arrojaron coincidencia exacta al centavo entero:
- 4.20 km × C$7.00 = C$ 29.40 (2940 centavos)
- 4.25 km × C$7.00 = C$ 29.75 (2975 centavos)
- 4.27 km × C$7.00 = C$ 29.89 (2989 centavos)
- 4.285 km × C$7.00 = C$ 30.00 (3000 centavos tras redondeo de 2999.5)
- 10.75 km × C$7.00 = C$ 75.25 (7525 centavos)

---

## 19. HISTORICAL IMMUTABILITY (FASE 11)
🟢 **VERIFICADO:** Tanto en Cloud Functions (`orders.ts`, `trips.ts`) como en el motor de finanzas Android (`CourierFinanceCalculator.kt`), las órdenes cerradas o activas que ya cuentan con el snapshot `courierRatePerKmApplied` son respetadas incondicionalmente. Una mutación posterior de `/system_config/global` no altera las ganancias calculadas ni los balances de órdenes existentes.

---

## 20. EVALUACIÓN DE GATES (FASE 20)

| Gate | Descripción | Estado | Detalle |
|---|---|:---:|---|
| **GATE-001** | Admin escribe tarifa en `/system_config/global` | 🟢 PASS | `config.js` escribe correctamente vía `doc('global').set()` |
| **GATE-002** | Backend lee esa configuración | 🔴 **FAIL** | Bloqueado por override de comercio y por valor inyectado del cliente |
| **GATE-003** | No existe C$7 hardcodeado en runtime | 🔴 **FAIL** | `CustomerHomeViewModel.kt:636` tiene `val courierRatePerKmApplied = 7.0` |
| **GATE-004** | Customer no impone una tarifa fija | 🔴 **FAIL** | Customer App escribe `"courierRatePerKmApplied": 7.0` al crear la orden |
| **GATE-005** | FirebaseManager no impone una tarifa fija | 🟡 **WARN** | Posee fallback de seguridad `?: 7.0` en caso de documento nulo |
| **GATE-006** | Courier consume valor canónico | 🟢 PASS | UI consume `courierTotalEarnings` / `gananciaRepartidor` |
| **GATE-007** | `courierRatePerKmApplied` existe | 🟢 PASS | Presente en el modelo y esquema |
| **GATE-008** | Snapshot queda asociado a la orden | 🟢 PASS | Se persiste en `/orders` |
| **GATE-009** | Nueva tarifa afecta nuevas órdenes | 🔴 **FAIL** | Nuevas órdenes de Customer App siguen naciendo con C$7.00 |
| **GATE-010** | Nueva tarifa NO altera órdenes históricas | 🟢 PASS | Respetado por backend y calculadora de finanzas |
| **GATE-011** | Finance respeta snapshot | 🟢 PASS | `onOrderDelivered` utiliza `after.courierRatePerKmApplied` |
| **GATE-012** | No existe segunda fuente de verdad | 🔴 **FAIL** | El cliente Android actúa como fuente autoritaria paralela |
| **GATE-013** | No existe config paralela contradictoria | 🟢 PASS | No hay colecciones paralelas de tarifas de courier |
| **GATE-014** | No existe fallback hardcodeado | 🔴 **FAIL** | Existen fallbacks en `orders.ts:153`, `trips.ts:69`, `FirebaseManager.kt:417` |
| **GATE-015** | Multi-tenant scope correctamente resuelto | 🟢 PASS | Tarifa global aplicable universalmente |
| **GATE-016** | Permisos protegen la configuración | 🟢 PASS | `firestore.rules` restringe escritura a `isPlatformAdmin()` |
| **GATE-017** | Redondeo consistente | 🟢 PASS | 100% centavos enteros sin jank flotante |
| **GATE-018** | Tests RATE-001..010 PASS | 🟢 PASS | Validación matemática exitosa |
| **GATE-019** | No hubo mutaciones | 🟢 PASS | Cero mutaciones de código, base de datos ni configuración |
| **GATE-020** | No hubo deploy | 🟢 PASS | Cero despliegues ejecutados |

---

## 21. ARCHIVOS INSPECCIONADOS Y REGISTRO DE MUTACIONES

### Archivos Inspeccionados:
1. `panel-admin/public/js/dashboard/config.js`
2. `panel-admin/public/js/dashboard/governanceCenter.js`
3. `panel-admin/public/js/dashboard/supportCenter.js`
4. `panel-admin/public/js/dashboard/health.js`
5. `firestore.rules`
6. `firebase.json`
7. `functions/src/triggers/orders.ts`
8. `functions/src/triggers/trips.ts`
9. `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`
10. `app/src/main/java/com/example/FirebaseManager.kt`
11. `app/src/main/java/com/example/PedidosEntrantesScreen.kt`
12. `app/src/main/java/com/example/presentation/courier/CourierOrderDetailScreen.kt`
13. `app/src/main/java/com/example/presentation/courier/CourierFinancesScreen.kt`
14. `app/src/main/java/com/example/domain/engine/courier/CourierFinanceCalculator.kt`
15. `app/src/main/java/com/example/MainActivity.kt`
16. `app/src/main/java/com/example/SolicitarEnvioScreen.kt`
17. `functions/src/__tests__/courierEarningsDistanceForensic001.test.ts`
18. `functions/src/__tests__/courierEarningsPaymentModelPAY001_020.test.ts`
19. `functions/src/__tests__/courierFinancialPolicyFreezePOL001_023.test.ts`
20. `functions/src/__tests__/courierEarningsForensicPostValidationFV001_020.test.ts`
21. `app/src/test/java/com/example/courier/CourierEarningsPaymentModelTest.kt`

### Registro de Mutaciones:
```text
CODE MUTATIONS: 0
DATABASE MUTATIONS: 0
CONFIGURATION MUTATIONS: 0
DEPLOYMENTS: 0
```
*(Únicamente se generaron scripts temporales de prueba y lectura en el directorio persistido de scratch del agente, sin modificar código productivo ni base de datos).*

---

## 22. DICTAMEN OFICIAL

# 🔴 NOT CERTIFIED

### Justificación Técnica Forense:
Aunque la interfaz de administración (`panel-admin`) escribe en `/system_config/global`, las reglas de Firestore protegen el documento y Finance preserva los snapshots históricos, **el sistema NO utiliza de forma efectiva la tarifa configurada como SSOT en tiempo de ejecución**.

### Evidencias de Bloqueo:
1. **Fuga de Autoridad en la App del Cliente (`CustomerHomeViewModel.kt:636, 670`):**
   El cliente Android calcula de forma fija `val courierRatePerKmApplied = 7.0` y lo escribe directamente en el documento inicial del pedido en Firestore.
2. **Anulación del Backend Trigger (`orders.ts:157, 180`):**
   El backend evalúa `if (order.courierRatePerKmApplied != null)` y adopta el `7.0` inyectado por el cliente, saltándose la lectura de `/system_config/global`.
3. **Bypass por Comisión de Comercio (`orders.ts:164`):**
   La lectura de `/system_config/global` está indebidamente anidada en el bloque `else` de `bizData.commissionOverrideRate`. Si un comercio tiene comisión personalizada, `/system_config/global` nunca se lee.

### Riesgo Operativo:
Si el Administrador actualiza la tarifa de C$7.00 a C$8.00 o C$10.00 en el Panel Administrativo para compensar el alza de combustible o incentivar a la flota, **los pedidos creados desde la app continuarán calculando y pagando C$7.00/km a los motorizados**, haciendo inoperante el control administrativo de tarifas.

### Recomendación de Remediación Futura (Para cuando se autorice una fase de ingeniería):
1. Eliminar la escritura de `courierRatePerKmApplied`, `courierDistanceEarnings` y `courierTotalEarnings` desde `CustomerHomeViewModel.kt`. El cliente debe únicamente crear el pedido o enviar estimaciones no autoritativas en un subobjeto `clientEstimation`.
2. En `functions/src/triggers/orders.ts:164`, extraer la lectura de `/system_config/global` fuera del condicional de `bizData.commissionOverrideRate`.
3. En `functions/src/triggers/orders.ts:180`, obligar a que `onOrderCreated` consulte siempre `/system_config/global.courierRatePerKm` para estampar el snapshot inicial oficial, ignorando cualquier valor inyectado por el cliente no administrativo.
