# REPORTE DE CORRECCIÓN SEMÁNTICA: TOP_SELLING 🔥 vs RECOMMENDED 🎯
**Protocolo Oficial:** `BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001`  
**Proyecto:** BlueSystem Delivery Enterprise  
**Módulo:** C2D — Customer Dashboard  
**Fecha de Ejecución:** 2026-09-07  
**Modo:** CONTROLLED ENGINEERING CORRECTION • ZERO PRODUCTION DB MUTATION • NO AUTO-ROLLOUT  

---

## 01. Executive Summary

En cumplimiento estricto del protocolo `BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001`, se ha completado la remediación de ingeniería sobre los dos hallazgos de severidad P1 identificados en la auditoría forense precedente:
1. **P1-01 — TOP_SELLING Data Pipeline:** Implementación de la Scheduled Cloud Function canónica `aggregateTopSellingDaily` (02:00 UTC), cálculo autoritativo en ventana móvil de 30 días, filtrado de órdenes calificadas, zero reset para comercios sin ventas recientes, e idempotencia absoluta. Se eliminó formalmente el fallback engañoso a rating.
2. **P1-02 — RECOMMENDED Semantic Failure:** Creación e integración del motor de dominio puro `RecommendationEngine.kt`, restaurando la ecuación contractual multivariable $S = 0.40 C_{\text{affinity}} + 0.25 R_{\text{norm}} + 0.20 P_{\text{geo}} + 0.15 F_{\text{trusted}}$ conectado a las últimas 5 órdenes completadas del cliente autenticado y su ubicación GPS.
3. **P2 — Repository Fallback:** Corrección en `BusinessRepository.kt` (`toBusinessInfoSafely`) preservando `unitsSold30d`, `priceParityVerified` y `activatedAt` ante fallos de deserialización directa.

Todas las suites de regresión existentes pasaron con 100% de éxito (39/39 backend, 23/23 Android), y se certificaron 14 nuevos tests backend (T01–T14) y 20 nuevos tests Android (R01–R18, Controlled Dataset y Fallback Test), alcanzando un total de **53/53 tests en Backend** y **43/43 tests en Android**.

---

## 02. Authorization
- **Actividad:** `BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001`
- **Autorización de Plan:** Aprobado por el usuario sobre `implementation_plan.md`.
- **Alcance Autorizado:** Exclusivamente la corrección de TOP_SELLING, RECOMMENDED y la resiliencia del repositorio de comercios.
- **Alcance No Autorizado:** Modificaciones a Quick Reorder, X→Y, Control Tower, Liquidaciones, Cupones, Lealtad o Reglas de Firestore.

---

## 03. Baseline Before Mutation
- **Fecha:** 2026-09-07
- **Workspace:** Snapshot local `BlueSystem_delivery`.
- **Backend Baseline:** 39 tests passing, 0 failures, 0 skipped (`Enterprise Coupon Engine`, `Loyalty Engine`, `Promotions SSOT`).
- **Android Baseline:** 23 tests passing, 0 failures (`DashboardConfigOrderTest`, `DashboardDeduplicationEngineTest`, `QuickReorderEngineTest`, `QuickReorderXToYIndependenceTest`).
- **Frozen Modules Baseline:** ADR-013 a ADR-020 intactos.

---

## 04. Findings Being Corrected
- **🔴 P1-01 (TOP_SELLING):** Ausencia de la Scheduled Cloud Function para recálculo diario de la ventana móvil de 30 días, dependencia de un contador acumulativo monótono y presencia de un fallback silencioso por rating.
- **🔴 P1-02 (RECOMMENDED):** Falsa personalización mediante heurística fija (`isFeatured` = 40 pts, proximidad constante = 20.0 pts, rating lineal / 5.0, historial de usuario y coordenadas GPS desconectados).
- **🟡 P2 (Repository):** Omisión de `unitsSold30d`, `priceParityVerified` y `activatedAt` en el bloque de parsing manual de `toBusinessInfoSafely`.

---

## 05. Track A — TopSelling

### 06. Scheduler
- **Archivo:** `functions/src/schedulers/topSellingScheduler.ts`
- **Función:** `aggregateTopSellingDaily`
- **Schedule Cron:** `0 2 * * *`
- **Timezone:** `UTC`
- **Exportación:** Exportada limpiamente en `functions/src/index.ts`.

### 07. Query
- **Colección:** `/orders`
- **Filtro de fecha:** `where("createdAt", ">=", thirtyDaysTimestamp)`
- **Condición temporal:** `now - 30 days` (30 días móviles exactos).

### 08. 30-Day Aggregation
- **Función de cálculo puro:** `calculateAuthoritativeUnitsSold30d(orders, eligibleBusinessIds, now)`
- **Estados calificados:** `delivered`, `completed`, `entregado` (case-insensitive, trimmed).
- **Estados excluidos:** `cancelled`, `rejected`, `refunded`, `in_transit`, `preparing`, `pending`, `test`.
- **Órdenes de prueba excluidas:** `isTest === true || testOrder === true`.
- **Métrica acumulada:** Suma estricta de `item.quantity` (o `item.cantidad`).

### 09. Zero Reset
- Todos los comercios existentes en `/businesses` son leídos e inicializados con `unitsSold30d = 0`.
- Si un comercio tuvo 100 ventas hace 31 días y 0 ventas en los últimos 30 días, el recálculo actualiza autoritativamente su valor a `0`.
- Evita valores stale o contadores históricos no expirados.

### 10. Idempotency
- La función no hace incrementos reactivos (`FieldValue.increment`), sino que establece el valor absoluto calculado de la ventana (`unitsSold30d: units`).
- Ejecutar la función N veces produce exactamente el mismo resultado determinístico.

### 11. Ranking
- La UI en Android (`CuratedBusinessSections.kt` y `CustomerHomeFeedSection.kt`) ordena estrictamente por:
  `publicBusinesses.filter { it.isOpen && it.unitsSold30d > 0 }.sortedByDescending { it.unitsSold30d }.take(10)`
- El ranking refleja con exactitud el volumen de unidades vendidas.

### 12. Fallback Decision
- **Comportamiento previo:** `.ifEmpty { publicBusinesses.filter { it.isOpen }.sortedByDescending { it.rating } }`
- **Comportamiento corregido:** Fallback de rating **ELIMINADO**. Si no hay comercios con ventas en la ventana móvil, la lista resultante es vacía y la sección se oculta limpiamente (`if (topList.isEmpty()) return`).
- **Justificación:** Cero etiquetado falso. Una sección titulada "Los Más Vendidos 🔥" no debe exhibir comercios sin ventas ordenados por rating.

---

## 13. Track B — Recommended

### 14. RecommendationEngine
- **Ubicación:** `app/src/main/java/com/example/domain/engine/dashboard/RecommendationEngine.kt`
- **Naturaleza:** Objeto de dominio Kotlin puro, sin dependencias de Android UI, Composable, Navigation ni llamadas directas a Firestore.

### 15. Category Affinity ($C_{\text{affinity}}$ — 40%)
- Consume las últimas 5 órdenes completadas del cliente autenticado.
- Mapea `order.businessId` a la categoría canónica del comercio (`getEffectiveCategory()`).
- Ponderación:
  - Categoría #1 más consumida $\to 1.0$ (40.0 pts)
  - Categoría #2 más consumida $\to 0.6$ (24.0 pts)
  - Otras / Sin coincidencia $\to 0.0$ (0.0 pts)
- Desempate de categorías por recencia cronológica de la orden.

### 16. Rating ($R_{\text{norm}}$ — 25%)
- Fórmula contractual implementada:
  $$R_{\text{norm}} = \left(\frac{\text{rating} - 3.5}{1.5}\right).\text{coerceIn}(0.0, 1.0) \times 25.0$$
- rating 5.0 $\to$ 25.0 pts
- rating 4.25 $\to$ 12.5 pts
- rating $\le$ 3.5 $\to$ 0.0 pts

### 17. Geo ($P_{\text{geo}}$ — 20%)
- Distancia Haversine real (`GeoUtils.calculateDistance`):
  - $\le 2.0\text{ km} \to 20.0\text{ pts}$
  - $2.0 - 5.0\text{ km} \to 14.0\text{ pts}$
  - $5.0 - 10.0\text{ km} \to 8.0\text{ pts}$
  - $> 10.0\text{ km} \to 2.0\text{ pts}$
  - Ubicación no disponible o coordenadas inválidas $\to 0.0\text{ pts}$ (neutral honesto, eliminación de 20.0 constante).

### 18. Trust ($F_{\text{trusted}}$ — 15%)
- `isVerified && isFeatured` $\to 15.0\text{ pts}$
- Solo `isVerified` $\to 7.5\text{ pts}$
- Ninguno $\to 0.0\text{ pts}$

### 19. User History
- `CustomerHomeScreen.kt` inyecta `recentOrders` (stream reactivo de órdenes del usuario) y coordenadas del cliente (`customerLat`, `customerLng`) en `CustomerHomeFeedSection`.
- Cadena de trazabilidad: `auth.currentUser.uid` $\to$ `/orders?customerId=uid` $\to$ `CustomerHomeScreen` $\to$ `CustomerHomeFeedSection` $\to$ `RecommendationEngine`.

### 20. Cold Start
- Si el usuario tiene 0 órdenes (`recentOrders.isEmpty()`), $C_{\text{affinity}} = 0.0\text{ pts}$.
- El ranking se resuelve honestamente por las demás dimensiones ($R_{\text{norm}} + P_{\text{geo}} + F_{\text{trusted}}$).
- Cero fabricación de afinidades inexistentes y cero duplicación forzada de TOP_SELLING.

### 21. Location Change
- Al cambiar las coordenadas del usuario (`customerLat`, `customerLng`), el bloque `remember(..., customerLat, customerLng)` invalida la caché y recalcula la distancia y puntaje geoespacial de cada comercio.

### 22. Multi-User Differential
- Dos usuarios (USER_A Pizza vs USER_B Sushi) evaluando el mismo catálogo de comercios reciben rankings personalizados y divergentes en función del peso de sus señales de compra histórica.

### 23. Memoization
- Las claves del `remember` en `CustomerHomeFeedSection.kt` ahora incluyen:
  `remember(publicBusinesses, orderedSections, recentOrders, customerLat, customerLng)`
- La recomposición reevalúa las recomendaciones si cambia el usuario o su ubicación física.

---

## 24. UI Integration
- `CuratedBusinessSections.kt`:
  - `RecommendedSection` consume directamente la lista pre-calculada y deduplicada, eliminando el bloque interno redundante que calculaba la heurística antigua.
  - `TopSellingSection` elimina el fallback a rating y oculta la fila si no hay comercios con ventas.
- `CustomerHomeFeedSection.kt`:
  - `curatedFeedResult.recommendedBusinesses` es alimentado por `RecommendationEngine.calculateRecommendations(...)`.

---

## 25. Repository Compatibility
- En `BusinessRepository.kt` (`toBusinessInfoSafely`):
  - `unitsSold30d` se extrae de `unitsSold30d` o `unidadesVendidas30d`.
  - `priceParityVerified` se extrae de `priceParityVerified` o `mismoPrecioVerificado`.
  - `priceParityVerifiedAt`, `activatedAt`, `approvedAt` y `createdAt` se extraen y asignan al constructor de `BusinessInfo`.

---

## 26. Automated Tests

### Backend Tests (`functions/src/__tests__/topSellingScheduler.test.ts`)
| Test ID | Nombre / Descripción | Resultado |
| :--- | :--- | :---: |
| **T01** | 30-day window: Incluye órdenes dentro de la ventana de 30 días | 🟢 PASS |
| **T02** | old order expiration: Excluye órdenes con más de 30 días de antigüedad | 🟢 PASS |
| **T03** | delivered qualified: Califica órdenes `delivered` y `entregado` | 🟢 PASS |
| **T04** | completed qualified: Califica órdenes `completed` | 🟢 PASS |
| **T05** | cancelled exclusion: Excluye absolutamente órdenes canceladas | 🟢 PASS |
| **T06** | rejected exclusion: Excluye órdenes rechazadas | 🟢 PASS |
| **T07** | refunded exclusion: Excluye órdenes reembolsadas | 🟢 PASS |
| **T08** | test order exclusion: Excluye órdenes con `isTest` o `testOrder` | 🟢 PASS |
| **T09** | quantity aggregation: Suma correcta de unidades vendidas por ítem | 🟢 PASS |
| **T10** | zero reset: Comercios sin ventas en los últimos 30 días quedan en 0 | 🟢 PASS |
| **T11** | idempotency: Múltiples ejecuciones producen el mismo valor exacto | 🟢 PASS |
| **T12** | descending ranking: Ordenamiento correcto por `unitsSold30d` DESC | 🟢 PASS |
| **T13** | rating immunity: Comercio con más ventas y menor rating precede a mayor rating | 🟢 PASS |
| **T14** | scheduler configuration: Cron `0 2 * * *` y Timezone `UTC` | 🟢 PASS |

### Android Tests (`app/src/test/java/com/example/domain/dashboard/`)
| Test ID | Nombre / Descripción | Resultado |
| :--- | :--- | :---: |
| **R01** | Category #1 affinity yields exactly 40 points | 🟢 PASS |
| **R02** | Category #2 affinity yields exactly 24 points | 🟢 PASS |
| **R03** | No affinity yields 0 points for category | 🟢 PASS |
| **R04** | Rating normalization computes contractual points correctly | 🟢 PASS |
| **R05** | Geo distance LTE 2km yields 20 points | 🟢 PASS |
| **R06** | Geo distance 2 to 5km yields 14 points | 🟢 PASS |
| **R07** | Geo distance 5 to 10km yields 8 points | 🟢 PASS |
| **R08** | Geo distance GT 10km yields 2 points | 🟢 PASS |
| **R09** | Trust verified and featured yields 15 points | 🟢 PASS |
| **R10** | Trust verified only yields 7.5 points | 🟢 PASS |
| **R11** | Trust neither verified nor featured yields 0 points | 🟢 PASS |
| **R12** | User history extracts top categories from last 5 completed orders | 🟢 PASS |
| **R13** | Multi-User Differential Test (Pizza lover vs Sushi lover) | 🟢 PASS |
| **R14** | Cold start yields deterministic ranking without fake affinity | 🟢 PASS |
| **R15** | Null location yields 0 geo points safely | 🟢 PASS |
| **R16** | Deterministic tie-breaker (rating DESC, businessId ASC) | 🟢 PASS |
| **R17** | Total recommendation score strictly bounded in 0 to 100 | 🟢 PASS |
| **R18** | Recomputation after context change updates ranking immediately | 🟢 PASS |
| **CTRL**| Controlled Dataset Test (Comercios A, B, C, D) | 🟢 PASS |
| **P2**  | BusinessRepositoryFallbackTest (resilience and metadata retention) | 🟢 PASS |

---

## 27. Differential Dataset Evaluation

Dataset Evaluado (Secciones 52–56):
- **Comercio A (Sushi):** Sales = 1000, Rating = 3.8, Dist = 8.0 km, Verified = Sí, Featured = No
- **Comercio B (Pizza):** Sales = 100, Rating = 4.9, Dist = 1.0 km, Verified = Sí, Featured = Sí
- **Comercio C (Pizza):** Sales = 50, Rating = 4.8, Dist = 2.0 km, Verified = Sí, Featured = No
- **Comercio D (Tacos):** Sales = 10, Rating = 4.2, Dist = 0.5 km, Verified = No, Featured = No

### Resultados Verificados:
- **TOP_SELLING:** **A (1000) $\to$ B (100) $\to$ C (50) $\to$ D (10)** (Comercio A lidera con inmunidad al rating).
- **RECOMMENDED para USER_A (Pizza x 5):** **B (98.3) $\to$ C (89.1) $\to$ D $\to$ A** (B y C lideran por afinidad de categoría 40%).
- **RECOMMENDED para USER_B (Sushi x 5):** Comercio A asciende con +40 pts por Sushi, cambiando radicalmente su posición relativa frente al escenario Pizza.

---

## 28. Regression Suite Verification
- **Backend Regression:** 39/39 tests aprobados. Total con nuevos tests: **53/53 PASS** (0 failures).
- **Android Dashboard Regression:** 23/23 tests aprobados (`DashboardConfigOrderTest`, `DashboardDeduplicationEngineTest`, `QuickReorderEngineTest`, `QuickReorderXToYIndependenceTest`). Total con nuevos tests: **43/43 PASS** (0 failures).

---

## 29. Frozen Modules Integrity (ADR-013 a ADR-020)
- `orders.ts` (Triggers congelados): **INTACTO**
- `liveMap.js` & `DeliveryControlTowerModule.tsx` (ADR-013): **INTACTO**
- `SolicitarEnvioScreen.kt` & `GeoUtils.kt` (ADR-015): **INTACTO**
- `FleetEligibilityEngine.kt` & Courier Core (ADR-016): **INTACTO**
- `EmailService.ts` (ADR-017): **INTACTO**
- `CourierCashClosureScreen.kt` & `courierCashControl.js` (ADR-018): **INTACTO**
- `merchantSettlement.ts` (ADR-019): **INTACTO**
- `_compressImageFile` & `commerceSyncService.js` (ADR-020): **INTACTO**

---

## 30. Security & Production Safety
- El scheduler es server-side, ejecutado bajo permisos de servicio de Firebase PubSub / Cloud Scheduler.
- `unitsSold30d` no puede ser escrito por clientes móviles.
- Cero PII expuesta en logs.
- Cero mutaciones sobre bases de datos de producción durante esta actividad.
- Despliegue productivo: **LOCKED / NOT EXECUTED** (ADR-014).

---

## 31. Gate Matrix

| Gate | Descripción | Esperado | Observado | Resultado |
| :--- | :--- | :---: | :---: | :---: |
| **GATE A** | Baseline Integrity | Tests verificados | 39 Backend / 23 Android | 🟢 PASS |
| **GATE B** | TopSelling Scheduler | Cloud Function `aggregateTopSellingDaily` | Presente en `topSellingScheduler.ts` | 🟢 PASS |
| **GATE C** | 30-Day Window | Filtro móvil `now - 30d` | Verificado en T01 y T02 | 🟢 PASS |
| **GATE D** | Qualified Orders | Solo estados terminales válidos | Verificado en T03 y T04 | 🟢 PASS |
| **GATE E** | Zero Reset | Ventas expiradas reset a 0 | Verificado en T10 | 🟢 PASS |
| **GATE F** | Idempotency | No duplicación por reejecución | Verificado en T11 | 🟢 PASS |
| **GATE G** | TopSelling Ranking | `unitsSold30d` DESC | Verificado en T12 | 🟢 PASS |
| **GATE H** | No Rating Proxy | Eliminado fallback a rating | Verificado estáticamente y en UI | 🟢 PASS |
| **GATE I** | RecommendationEngine Exists | Motor puro en `domain/engine/dashboard` | `RecommendationEngine.kt` creado | 🟢 PASS |
| **GATE J** | Category Affinity 40% | 40 pts #1, 24 pts #2 | Verificado en R01, R02, R03 | 🟢 PASS |
| **GATE K** | Rating 25% | Normalizado acotado en 3.5 | Verificado en R04 | 🟢 PASS |
| **GATE L** | Geo 20% | Haversine por tramos | Verificado en R05 a R08 | 🟢 PASS |
| **GATE M** | Trust 15% | Verified + Featured combinados | Verificado en R09 a R11 | 🟢 PASS |
| **GATE N** | User History | Conectado a 5 órdenes del usuario | Verificado en R12 | 🟢 PASS |
| **GATE O** | Cold Start | Determinista sin falsa afinidad | Verificado en R14 | 🟢 PASS |
| **GATE P** | Location Change | Recomputa al variar coordenadas | Verificado en feed memoization | 🟢 PASS |
| **GATE Q** | Multi-User Differential | Rankings divergentes para Pizza vs Sushi | Verificado en R13 y Controlled Dataset | 🟢 PASS |
| **GATE R** | Deterministic Ranking | Desempate por rating y businessId | Verificado en R16 | 🟢 PASS |
| **GATE S** | UI Integration | Composable consume motor directamente | Verificado en `CuratedBusinessSections` | 🟢 PASS |
| **GATE T** | Repository Compatibility | `toBusinessInfoSafely` preserva C2D | Verificado en `BusinessRepositoryFallbackTest` | 🟢 PASS |
| **GATE U** | Regression Suite | Cero regresiones | 53/53 Backend, 43/43 Android PASS | 🟢 PASS |
| **GATE V** | Frozen Modules | ADR-013 a ADR-020 intactos | 0 violaciones | 🟢 PASS |
| **GATE W** | Production Safety | Cero despliegues no autorizados | LOCKED | 🟢 PASS |

---

## 32. Dictamen Final Obligatorio

============================================================  
BLUE SYSTEM DELIVERY ENTERPRISE  
C2D CUSTOMER DASHBOARD  
SEMANTIC CORRECTION  
TOP_SELLING + RECOMMENDED  
============================================================  

ACTIVITY:  
BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001  

P1-01 TOP_SELLING PIPELINE  
Scheduled Function              : PASS  
30-Day Rolling Window           : PASS  
Qualified Orders                : PASS  
Zero Reset                      : PASS  
Idempotency                     : PASS  
Canonical unitsSold30d          : PASS  
Ranking DESC                    : PASS  
Rating Proxy Removed/Formalized : PASS  

P1-02 RECOMMENDED  
RecommendationEngine            : PASS  
Category Affinity 40%           : PASS  
Rating 25%                      : PASS  
Geo 20%                         : PASS  
Trust 15%                       : PASS  
User History                    : PASS  
Cold Start                      : PASS  
Location Context                : PASS  
Multi-User Differential         : PASS  
Deterministic Ranking           : PASS  

INTEGRATION  
UI Integration                  : PASS  
Memoization                     : PASS  
Repository Compatibility        : PASS  

TESTS  
Existing Regression             : PASS  
New Semantic Tests              : PASS  
Differential Tests              : PASS  

FROZEN ADR-013 → ADR-020         : INTACT  

P1-01 CLOSED                    : YES  
P1-02 CLOSED                    : YES  

P0 BLOCKERS                     : 0  
P1 BLOCKERS                     : 0  
P2 FINDINGS                     : 0 (Fixed & Verified)  

CODE MUTATION                   : CONTROLLED / DOCUMENTED  
PRODUCTION DB MUTATION          : NONE  
PRODUCTION DEPLOYMENT           : NOT EXECUTED  

============================================================  
FINAL VERDICT  
============================================================  

🟢 CORRECTION COMPLETE  

============================================================  
NEXT AUTHORIZED PHASE  
============================================================  
SEMANTIC CORRECTION COMPLETE  
        ↓  
POST-CORRECTION AUDIT  
        ↓  
SEMANTIC CERTIFICATION  
        ↓  
FINAL PHYSICAL CERTIFICATION  
        ↓  
SEPARATE HUMAN DEPLOYMENT ORDER  
