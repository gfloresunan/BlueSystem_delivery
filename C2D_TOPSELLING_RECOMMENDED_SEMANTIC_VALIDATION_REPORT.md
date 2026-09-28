# AUDITORÍA FORENSE SEMÁNTICA: TOP_SELLING 🔥 vs RECOMMENDED 🎯
**Protocolo:** `BSD-C2D-CUSTOMER-DASHBOARD-TOPSELLING-RECOMMENDED-SEMANTIC-VALIDATION-001`  
**Proyecto:** BlueSystem Delivery Enterprise  
**Módulo:** C2D — Customer Dashboard  
**Fecha:** 2026-09-07  
**Modo:** READ-ONLY AUDIT • ZERO CODE MUTATION • ZERO PRODUCTION DB MUTATION  

---

## 01. Executive Summary

Se ha ejecutado una auditoría forense semántica profunda y de solo lectura sobre los bloques **🔥 TOP_SELLING ("Los Más Vendidos")** y **🎯 RECOMMENDED ("Recomendados para ti")** en la aplicación móvil de clientes Android y en el backend de Cloud Functions de BlueSystem Delivery Enterprise.

El objetivo central consistió en responder a dos interrogantes críticas de arquitectura de producto:
1. **¿TOP_SELLING realmente selecciona los comercios por volumen de unidades vendidas en los últimos 30 días (`unitsSold30d`) de forma canónica y diferenciada?**
2. **¿RECOMMENDED realmente calcula una recomendación personalizada consumiendo el perfil e historial de órdenes del usuario mediante el algoritmo contractual $0.40 C_{\text{affinity}} + 0.25 R_{\text{norm}} + 0.20 P_{\text{geo}} + 0.15 F_{\text{trusted}}$?**

### Hallazgo Primario Inapelable
- **TOP_SELLING (Mecánica Local):** El código del composable en Android (`CuratedBusinessSections.kt:85-94` y `CustomerHomeFeedSection.kt:73-78`) **SÍ implementa** el ordenamiento descendente por `unitsSold30d` (`publicBusinesses.filter { it.isOpen && it.unitsSold30d > 0 }.sortedByDescending { it.unitsSold30d }`). Sin embargo, el pipeline backend **NO tiene implementada la Scheduled Cloud Function diaria `aggregateTopSellingDaily` (02:00 UTC)**; en su lugar opera un trigger reactivo `onOrderDeliveredForDashboard` que únicamente incrementa (`FieldValue.increment`) y un callable HTTPS manual `adminRecalculateUnitsSold30d`. En entornos donde no se ha corrido el backfill/recalculo, todos los comercios tienen `unitsSold30d = 0`, disparando el fallback silencioso `sortedByDescending { it.rating }`.
- **RECOMMENDED (Mecánica Semántica):** **🔴 FALSA PERSONALIZACIÓN / GRAVE MISMATCH SEMÁNTICO.** El código en producción (`CuratedBusinessSections.kt:134-145` y `CustomerHomeFeedSection.kt:79-86`) **NO consume el historial de órdenes del usuario ni su ubicación GPS**. En su lugar, utiliza un *placeholder* estático donde:
  - $C_{\text{affinity}}$ (40%) fue sustituido por `if (biz.getEffectiveIsFeatured()) 40.0 else 20.0`.
  - $P_{\text{geo}}$ (20%) está **hardcodeado como constante `20.0`** para todos los comercios sin calcular distancias.
  - $F_{\text{trusted}}$ (15%) evalúa únicamente `isVerified` (15.0 o 0.0).
  - $R_{\text{norm}}$ (25%) evalúa `(rating / 5.0) * 25.0` en lugar de la fórmula contractual $(rating - 3.5)/1.5$.
  - Los parámetros recibidos por la función ni siquiera aceptan el ID del usuario, ni su historial ni su geolocalización. El resultado para un usuario que consume exclusivamente Pizza es **idéntico al de un usuario que consume Sushi**, y a su vez **idéntico para un usuario nuevo**.

---

## 02. Scope

- **Inspección de UI/Composables:**
  - `app/src/main/java/com/example/presentation/customer/home/CuratedBusinessSections.kt`
  - `app/src/main/java/com/example/presentation/customer/home/CustomerHomeFeedSection.kt`
  - `app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt`
- **Inspección de Dominio y Deduplicación:**
  - `app/src/main/java/com/example/domain/engine/dashboard/DashboardDeduplicationEngine.kt`
- **Inspección de Repositorio y Modelo de Datos:**
  - `app/src/main/java/com/example/data/repository/BusinessRepository.kt` (`BusinessInfo`, `toBusinessInfoSafely`)
- **Inspección de Backend / Cloud Functions:**
  - `functions/src/triggers/dashboardAggregation.ts`
  - `functions/src/index.ts`
  - `functions/src/schedulers/*`
- **Inspección de Suites de Pruebas:**
  - `app/src/test/java/com/example/domain/dashboard/DashboardDeduplicationEngineTest.kt`
  - `functions/src/__tests__/*`

---

## 03. Baseline Documental Obligatorio

La especificación canónica establece:
- **`TOP_SELLING`**: Métrica canónica `unitsSold30d = \sum_{orders\ last\ 30d} (\sum item.quantity)` para órdenes con `status == delivered OR completed`, `createdAt >= now - 30 days`, `isTest != true`, excluyendo `cancelled`, `rejected` y `refunded`. Actualizado por una Scheduled Cloud Function nocturna.
- **`RECOMMENDED`**: Puntuación multivariable determinista:
  $$S_{\text{merchant}} = 0.40 C_{\text{affinity}} + 0.25 R_{\text{norm}} + 0.20 P_{\text{geo}} + 0.15 F_{\text{trusted}}$$
  - $C_{\text{affinity}}$ (40%): Categoría #1 de las últimas 5 órdenes = 1.0; Categoría #2 = 0.6; Sin coincidencia = 0.0.
  - $R_{\text{norm}}$ (25%): $(rating - 3.5) / 1.5$.
  - $P_{\text{geo}}$ (20%): $\le 2\text{ km} \to 1.0$; $2-5\text{ km} \to 0.7$; $5-10\text{ km} \to 0.4$; $> 10\text{ km} \to 0.1$.
  - $F_{\text{trusted}}$ (15%): `isVerified && isFeatured \to 1.0`; `solo isVerified \to 0.5`; ninguno $\to 0.0$.

---

## 04. TOP_SELLING Contract

- **Nivel:** Comercio (`Business-Level`).
- **Métrica Exclusiva:** `unitsSold30d: Int`.
- **Comportamiento Esperado:** Filtrar comercios abiertos con `unitsSold30d > 0` $\to$ ordenar descendente por `unitsSold30d` $\to$ tomar $N$ elementos.
- **Prohibiciones Contractuales:** No clasificar por `rating`, `isFeatured`, `createdAt`, `isPopular` ni orden aleatorio/alfabético, salvo política de fallback explícita y auditada.

---

## 05. TOP_SELLING Code Inspection

### Componente: `TopSellingSection`
- **Archivo:** `app/src/main/java/com/example/presentation/customer/home/CuratedBusinessSections.kt`
- **Líneas:** 74–121
- **Firma:**
  ```kotlin
  @Composable
  fun TopSellingSection(
      showTopSelling: Boolean,
      publicBusinesses: List<BusinessInfo>,
      favoriteIds: Set<String>,
      onBusinessClick: (businessId: String) -> Unit,
      onToggleFavorite: (businessId: String) -> Unit,
      modifier: Modifier = Modifier
  )
  ```
- **Implementación Interna (Líneas 85–94):**
  ```kotlin
  val topList = remember(publicBusinesses) {
      // Business-Level ordenado por métrica canónica unitsSold30d (Addendum P0-06)
      publicBusinesses.filter { it.isOpen && it.unitsSold30d > 0 }
          .sortedByDescending { it.unitsSold30d }
          .ifEmpty {
              // Fallback determinista para entornos previos a backfill de unitsSold30d
              publicBusinesses.filter { it.isOpen }.sortedByDescending { it.rating }
          }
          .take(10)
  }
  ```
- **Filtro Previsto en Feed (`CustomerHomeFeedSection.kt:73-77`):**
  ```kotlin
  val topSellingPool = publicBusinesses.filter { it.isOpen && it.unitsSold30d > 0 }
      .sortedByDescending { it.unitsSold30d }
      .ifEmpty {
          publicBusinesses.filter { it.isOpen }.sortedByDescending { it.rating }
      }
  ```
- **Evaluación de Código:**
  - **A. Fuente:** `publicBusinesses` suministrado por `BusinessRepository.publicBusinesses`.
  - **B. Campo Utilizado:** `it.unitsSold30d`.
  - **C. Ordenamiento:** `sortedByDescending { it.unitsSold30d }`.
  - **D. Límite:** `take(10)`.
  - **E. Filtros:** `it.isOpen && it.unitsSold30d > 0`.
  - **F. Fallback:** Si la lista es vacía, recurre a `publicBusinesses.filter { it.isOpen }.sortedByDescending { it.rating }`.

---

## 06. TOP_SELLING Data Pipeline

Cadena de Trazabilidad de `unitsSold30d`:
1. **Colección Fuente:** `/orders/{orderId}`
2. **Trigger / Escritor:** `functions/src/triggers/dashboardAggregation.ts:18-79` (`onOrderDeliveredForDashboard`)
3. **Condición de Calificación:** `status` transiciona a `delivered`, `completed` o `entregado`, y `isTest !== true`.
4. **Mutación:** `admin.firestore.FieldValue.increment(totalItems)` sobre `/businesses/{businessId}` y `/users/{businessId}`.
5. **Deserialización Android:** `BusinessInfo.unitsSold30d` en `BusinessRepository.kt:98`.
6. **Consumo en UI:** `CustomerHomeFeedSection.kt:73` y `CuratedBusinessSections.kt:88`.

---

## 07. unitsSold30d Verification

- **Presencia en Modelo Android:** ✅ Presente en `BusinessInfo` (`BusinessRepository.kt:98`).
- **Deserialización Automática:** `doc.toObject(BusinessInfo::class.java)` deserializa `unitsSold30d`.
- **Vulnerabilidad Detectada en Fallback Manual (`BusinessRepository.kt:344-400`):**
  En caso de que `toObject()` arroje excepción (por ejemplo por discrepancias en tipos de datos de Firestore en comercios legacy), el bloque `catch` ejecuta una construcción manual de `BusinessInfo` donde los campos canónicos `unitsSold30d`, `priceParityVerified` y `activatedAt` **no son leídos del DocumentSnapshot**, asignándoseles los valores default (`0`, `false`, `null`).

---

## 08. Scheduled Function Verification

- **Función Requerida por Contrato:** `aggregateTopSellingDaily` (Scheduled Cron diario a las 02:00 UTC).
- **Estado en Repositorio:** 🔴 **NO EXISTE**.
  - No existe ningún archivo ni declaración `pubsub.schedule("0 2 * * *")` para `aggregateTopSellingDaily`.
  - Los schedulers en `functions/src/schedulers/` son:
    - `notificationQueue.ts` (cada 1 minuto).
    - `notificationCleanup.ts` (04:00 AM diario).
    - `healthCheck.ts` (cada 1 hora).
- **Mecanismos Existentes en su Lugar:**
  1. `onOrderDeliveredForDashboard` (Trigger reactivo Firestore `onUpdate` en `orders/{orderId}`):
     Incrementa atómicamente con `FieldValue.increment(totalItems)`.
     *Limitación crítica:* Un contador acumulativo por `increment` **nunca resta** órdenes que salieron de la ventana de 30 días móviles. Tiende a crecer monótonamente en el tiempo a menos que se invoque el callable.
  2. `adminRecalculateUnitsSold30d` (HTTPS Callable `onCall`):
     Realiza la consulta determinística `where("createdAt", ">=", thirtyDaysTimestamp)` sobre órdenes entregadas y actualiza en batches.
     *Limitación crítica:* Es un endpoint administrativo bajo demanda; no se ejecuta automáticamente de forma programada.

---

## 09. TOP_SELLING Ranking Test

### Dataset Simulado
- Comercio A: `unitsSold30d = 500`, `rating = 3.8`, `isOpen = true`
- Comercio B: `unitsSold30d = 300`, `rating = 4.9`, `isOpen = true`
- Comercio C: `unitsSold30d = 100`, `rating = 4.5`, `isOpen = true`
- Comercio D: `unitsSold30d = 50`,  `rating = 4.7`, `isOpen = true`
- Comercio E: `unitsSold30d = 10`,  `rating = 5.0`, `isOpen = true`

### Resultado Evaluado en Código
- **Con datos de ventas poblados (`unitsSold30d > 0`):**
  Orden resultante: **A (500) $\to$ B (300) $\to$ C (100) $\to$ D (50) $\to$ E (10)**.
  - Inmunidad al rating: **A** (rating 3.8) precede a **B** (rating 4.9) y a **E** (rating 5.0).
  - El criterio dominante es estrictamente `unitsSold30d`.
- **Con datos de ventas en cero (`unitsSold30d == 0` para todos):**
  La condición `it.unitsSold30d > 0` filtra todos los comercios.
  `ifEmpty` toma el control: Orden resultante: **E (5.0) $\to$ B (4.9) $\to$ D (4.7) $\to$ C (4.5) $\to$ A (3.8)**.
  *Veredicto de Ranking:* El algoritmo local es correcto, pero depende 100% de la disponibilidad de datos de ventas reales.

---

## 10. RECOMMENDED Contract

El contrato estipula la fórmula:
$$S = 0.40 C_{\text{affinity}} + 0.25 R_{\text{norm}} + 0.20 P_{\text{geo}} + 0.15 F_{\text{trusted}}$$
Exige personalización activa:
- Consumir el historial del usuario logueado (últimas 5 órdenes completadas).
- Evaluar la afinidad hacia las categorías más consumidas por el cliente.
- Calcular la distancia geográfica real Haversine entre el cliente y el comercio.
- Combinar verificación y distinción de destacados.

---

## 11. RECOMMENDED Code Inspection

### Componente: `RecommendedSection`
- **Archivo:** `app/src/main/java/com/example/presentation/customer/home/CuratedBusinessSections.kt`
- **Líneas:** 124–173
- **Firma del Composable:**
  ```kotlin
  @Composable
  fun RecommendedSection(
      showRecommended: Boolean,
      publicBusinesses: List<BusinessInfo>,
      favoriteIds: Set<String>,
      onBusinessClick: (businessId: String) -> Unit,
      onToggleFavorite: (businessId: String) -> Unit,
      modifier: Modifier = Modifier
  )
  ```
- **Implementación Real (Líneas 134–145):**
  ```kotlin
  val recommendedList = remember(publicBusinesses) {
      // Baseline Técnico Ponderado (Addendum S-02):
      // 40% Categoría/Featured + 25% Rating + 20% Distancia/Apertura + 15% Verificación
      publicBusinesses.filter { it.isOpen }.map { biz ->
          val catScore = if (biz.getEffectiveIsFeatured()) 40.0 else 20.0
          val ratingScore = (biz.getEffectiveRating().coerceIn(0.0, 5.0) / 5.0) * 25.0
          val proximityScore = 20.0
          val verificationScore = if (biz.getEffectiveIsVerified()) 15.0 else 0.0
          val totalScore = catScore + ratingScore + proximityScore + verificationScore
          Pair(biz, totalScore)
      }.sortedByDescending { it.second }.map { it.first }.take(10)
  }
  ```
- **Cálculo en Feed (`CustomerHomeFeedSection.kt:79-86`):**
  Idéntica fórmula estática replicada en `recommendedPool`.

---

## 12. Category Affinity Verification ($C_{\text{affinity}}$ — 40%)

- **Requisito Contractual:**
  Analizar las últimas 5 órdenes completadas del cliente:
  - Categoría #1 $\to 1.0$ (40 puntos).
  - Categoría #2 $\to 0.6$ (24 puntos).
  - Sin afinidad $\to 0.0$ (0 puntos).
- **Realidad en Código:**
  ```kotlin
  val catScore = if (biz.getEffectiveIsFeatured()) 40.0 else 20.0
  ```
- **Evidencia:**
  - Cero lectura de órdenes pasadas del usuario.
  - Cero comparación con la categoría del comercio.
  - Se utiliza `isFeatured` (destacado) como sustituto directo.
- **Resultado:** 🔴 **SEMANTIC FAILURE / REEMPLAZO POR MOCK HEURÍSTICO**.

---

## 13. Rating Verification ($R_{\text{norm}}$ — 25%)

- **Requisito Contractual:**
  $$R_{\text{norm}} = \frac{rating - 3.5}{1.5} \times 25.0$$
- **Realidad en Código:**
  ```kotlin
  val ratingScore = (biz.getEffectiveRating().coerceIn(0.0, 5.0) / 5.0) * 25.0
  ```
- **Evidencia:**
  Se implementó una escala lineal simple de 0 a 5.0 normalizada a 25 puntos, en lugar de la fórmula acotada contractual con umbral de 3.5.
- **Resultado:** 🟡 **DISCREPANCIA DE FÓRMULA MATEMÁTICA**.

---

## 14. Geo Verification ($P_{\text{geo}}$ — 20%)

- **Requisito Contractual:**
  Cálculo de distancia real usuario $\leftrightarrow$ comercio:
  $\le 2\text{ km} \to 20\text{ pts}$; $2-5\text{ km} \to 14\text{ pts}$; $5-10\text{ km} \to 8\text{ pts}$; $> 10\text{ km} \to 2\text{ pts}$.
- **Realidad en Código:**
  ```kotlin
  val proximityScore = 20.0
  ```
- **Evidencia:**
  El valor de proximidad es una **constante fija hardcodeada en 20.0** para todos los comercios sin importar dónde se encuentre el usuario ni dónde esté el comercio.
- **Resultado:** 🔴 **SEMANTIC FAILURE / CONSTANT PSEUDO-FEATURE**.

---

## 15. Trust Verification ($F_{\text{trusted}}$ — 15%)

- **Requisito Contractual:**
  `isVerified && isFeatured \to 15.0`; `solo isVerified \to 7.5`; `ninguno \to 0.0`.
- **Realidad en Código:**
  ```kotlin
  val verificationScore = if (biz.getEffectiveIsVerified()) 15.0 else 0.0
  ```
- **Evidencia:**
  Solo evalúa `isVerified`. El atributo `isFeatured` fue absorbido indebidamente en el cálculo de categoría.
- **Resultado:** 🟠 **PARCIAL / MISMATCH ESTRUCTURAL**.

---

## 16. User History Verification

- **Inspección en `CustomerHomeScreen.kt`:**
  - El composable `CustomerHomeScreen` obtiene `val recentOrders by viewModel.recentOrders.collectAsState()`.
  - `recentOrders` se pasa a `CustomerHomeFeedSection(..., recentOrders = recentOrders)`.
  - En `CustomerHomeFeedSection.kt`, `recentOrders` **se pasa exclusivamente a `QuickReorderSection`** (línea 271).
  - En ningún momento `recentOrders` ni el ID del cliente se inyectan en `curatedFeedResult` ni en `RecommendedSection`.
- **Resultado:** 🔴 **USER CONTEXT 100% DESCONECTADO DEL MOTOR DE RECOMENDACIÓN**.

---

## 17. Cold Start Verification

- **Comportamiento en Usuario Nuevo (Sin Órdenes):**
  Dado que el algoritmo no consulta `recentOrders`, un usuario recién registrado con 0 órdenes recibe **exactamente la misma lista y el mismo orden** que un usuario antiguo con 100 órdenes.
- **Transparencia Semántica:**
  El bloque se titula "Recomendados para ti 🎯", pero entrega una lista estática ponderada de popularidad/rating global.
- **Resultado:** 🔴 **FALSA PERSONALIZACIÓN EN COLD START Y WARM USER**.

---

## 18. Memoization / State Verification

- **Observación en `CuratedBusinessSections.kt:134`:**
  ```kotlin
  val recommendedList = remember(publicBusinesses) { ... }
  ```
- **Observación en `CustomerHomeFeedSection.kt:59`:**
  ```kotlin
  val curatedFeedResult = remember(publicBusinesses, orderedSections) { ... }
  ```
- **Fallas de Dependencia:**
  Los bloques `remember` solo tienen como clave `publicBusinesses` y `orderedSections`.
  Aun si se cambiara el usuario en la sesión, si la lista de comercios no cambia, `recommendedList` no se recalcula en recomposición.

---

## 19. Controlled Dataset Evaluation

Consideremos el siguiente dataset controlado para comparar el comportamiento teórico vs el código real:

| Comercio | Categoría | unitsSold30d | Rating | Distancia | Verified | Featured |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Comercio A** | Sushi | 1000 | 3.8 | 8.0 km | Sí | No |
| **Comercio B** | Pizza | 100 | 4.9 | 1.0 km | Sí | Sí |
| **Comercio C** | Pizza | 50 | 4.8 | 2.0 km | Sí | No |
| **Comercio D** | Tacos | 10 | 4.2 | 0.5 km | No | No |

### Perfil de Usuario de Prueba:
- **USER_A (Amante de la Pizza):** Últimas 5 órdenes completadas fueron todas de Pizza.
- **USER_B (Amante del Sushi):** Últimas 5 órdenes completadas fueron todas de Sushi.

### Evaluación Teórica Contractual:
- **TOP_SELLING Contractual:**
  Ordena por `unitsSold30d`: **A (1000) $\to$ B (100) $\to$ C (50) $\to$ D (10)**.
- **RECOMMENDED Contractual para USER_A (Pizza):**
  - Comercio B (Pizza, 4.9, 1km, Verif+Feat): $0.40(1.0) + 0.25(0.93) + 0.20(1.0) + 0.15(1.0) = 40 + 23.3 + 20 + 15 = \mathbf{98.3}$
  - Comercio C (Pizza, 4.8, 2km, Verif): $0.40(1.0) + 0.25(0.86) + 0.20(1.0) + 0.15(0.5) = 40 + 21.6 + 20 + 7.5 = \mathbf{89.1}$
  - Comercio A (Sushi, 3.8, 8km, Verif): $0.40(0.0) + 0.25(0.20) + 0.20(0.4) + 0.15(0.5) = 0 + 5.0 + 8.0 + 7.5 = \mathbf{20.5}$
  - Orden Contractual USER_A: **B $\to$ C $\to$ D $\to$ A**
- **RECOMMENDED Contractual para USER_B (Sushi):**
  - Comercio A (Sushi) recibe $0.40(1.0) = 40\text{ pts}$ de afinidad de categoría, elevando drásticamente su posición.
  - Orden Contractual USER_B: **A o B según ponderación geográfica**.

### Evaluación en el Código Actual en Producción:
Cálculo ejecutado por la fórmula real en `CuratedBusinessSections.kt`:
$$\text{Score} = (\text{isFeatured} ? 40 : 20) + \left(\frac{\text{rating}}{5} \times 25\right) + 20 + (\text{isVerified} ? 15 : 0)$$

- **Comercio B:** $40 + (4.9/5 \times 25 = 24.5) + 20 + 15 = \mathbf{99.5}$
- **Comercio C:** $20 + (4.8/5 \times 25 = 24.0) + 20 + 15 = \mathbf{79.0}$
- **Comercio A:** $20 + (3.8/5 \times 25 = 19.0) + 20 + 15 = \mathbf{74.0}$
- **Comercio D:** $20 + (4.2/5 \times 25 = 21.0) + 20 + 0 = \mathbf{61.0}$

**Resultado en Código Actual:**
- Para USER_A: **B (99.5) $\to$ C (79.0) $\to$ A (74.0) $\to$ D (61.0)**
- Para USER_B: **B (99.5) $\to$ C (79.0) $\to$ A (74.0) $\to$ D (61.0)**
- Para USUARIO NUEVO: **B (99.5) $\to$ C (79.0) $\to$ A (74.0) $\to$ D (61.0)**

---

## 20. Differential Test Result

| Caso de Prueba | Entrada de Prueba | TOP_SELLING (Código Actual) | RECOMMENDED (Código Actual) | ¿Son Diferentes? | ¿Cumple Semántica Real? |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Caso 1: Con Ventas Pobladas** | Dataset Controlado con `unitsSold30d > 0` | **A $\to$ B $\to$ C $\to$ D** | **B $\to$ C $\to$ A $\to$ D** | 🟢 **SÍ** | 🟡 Parcial (TOP_SELLING cumple, RECOMMENDED usa fórmula estática) |
| **Caso 2: Ventas en Cero (Pre-Backfill)** | Dataset con `unitsSold30d == 0` | **B (4.9) $\to$ C (4.8) $\to$ D (4.2) $\to$ A (3.8)** *(por fallback de rating)* | **B (99.5) $\to$ C (79.0) $\to$ A (74.0) $\to$ D (61.0)** | 🟡 Ligeramente (A y D permutan por `verified`) | 🔴 Fallo (Ambos actúan como proxies de rating/destacado) |
| **Caso 3: Cambio de Usuario (Pizza vs Sushi)** | Mismos comercios, diferente historial de órdenes del cliente | **Invariable** (esperado por contrato) | **IDÉNTICO** (B $\to$ C $\to$ A $\to$ D para ambos usuarios) | 🔴 **NO HAY DIFERENCIA** | 🔴 **FALSA PERSONALIZACIÓN** |

---

## 21. Automated Tests

- **Ejecución de Pruebas Unitarias Android (`:app:testCoreDebugUnitTest`):**
  - Se ejecutó `com.example.domain.dashboard.DashboardDeduplicationEngineTest`.
  - **Resultado:** 🟢 **BUILD SUCCESSFUL** (35 actionable tasks, 1 executed, 34 up-to-date en 26s).
  - La suite existente valida la deduplicación M=2 entre secciones curadas, pero **no contiene aserciones sobre el cálculo algorítmico de afinidad de usuario**.
- **Ejecución de Pruebas Backend Functions (`npm test`):**
  - **Resultado:** 🟢 **39 tests pasados, 0 fallos**.
  - No existen pruebas unitarias para `dashboardAggregation.ts` ni para la inexistente función cron `aggregateTopSellingDaily`.

---

## 22. Findings (Clasificación de Hallazgos)

### 🔴 P1 — Hallazgo Semántico Crítico: Falsa Personalización en RECOMMENDED
- **Ubicación:** `CuratedBusinessSections.kt:134-145` y `CustomerHomeFeedSection.kt:79-86`.
- **Causa Raíz:** El algoritmo $0.40 C + 0.25 R + 0.20 P + 0.15 F$ fue reemplazado por una fórmula local basada únicamente en `isFeatured`, `rating` y `isVerified`, con proximidad constante (20.0). El historial de órdenes del usuario no se pasa al cálculo.
- **Impacto:** Todos los usuarios de la plataforma ven exactamente los mismos comercios recomendados en el mismo orden, violando la promesa de "Recomendados para ti".

### 🔴 P1 — Hallazgo de Pipeline de Datos: Ausencia de Scheduled Cloud Function
- **Ubicación:** `functions/src/triggers/dashboardAggregation.ts` e `index.ts`.
- **Causa Raíz:** La Scheduled Function `aggregateTopSellingDaily` (02:00 UTC) nunca fue creada. Solo existen el trigger reactivo `onOrderDeliveredForDashboard` (que acumula sin restar órdenes vencidas) y el callable manual `adminRecalculateUnitsSold30d`.
- **Impacto:** Sin ejecución del callable manual, los comercios permanecen con `unitsSold30d = 0` (o desactualizado), forzando a `TopSellingSection` a operar permanentemente en modo fallback por `rating`.

### 🟠 P2 — Hallazgo de Resiliencia: Omisión en Deserialización Manual
- **Ubicación:** `BusinessRepository.kt:344-400` (`toBusinessInfoSafely`).
- **Causa Raíz:** Si `doc.toObject(BusinessInfo::class.java)` falla y cae en el bloque `catch`, la instanciación manual no mapea `unitsSold30d`, `priceParityVerified` ni `activatedAt`.

---

## 23. Semantic Matrix

| Elemento de Auditoría | TOP_SELLING 🔥 | RECOMMENDED 🎯 |
| :--- | :--- | :--- |
| **Fuente de Datos** | `publicBusinesses` | `publicBusinesses` |
| **Consume Input de Usuario** | No (Por contrato) | 🔴 No (Debería Sí por contrato) |
| **Consume Historial de Órdenes** | No (Por contrato) | 🔴 No (Ignora `recentOrders`) |
| **Utiliza `unitsSold30d`** | 🟢 Sí (`it.unitsSold30d > 0`) | No requerido |
| **Utiliza Rating** | Solo en Fallback si ventas = 0 | Escala lineal 0–25 |
| **Utiliza Distancia Geográfica** | No | 🔴 Hardcodeado constante `20.0` |
| **Utiliza Afinidad de Categoría** | No | 🔴 Sustituido por `isFeatured` |
| **Utiliza Verificación** | No | Evalúa `isVerified` (15.0 / 0.0) |
| **Ordenamiento** | `unitsSold30d DESC` | `totalScore DESC` (estático) |
| **Comportamiento en Cold Start** | N/A | Idéntico a usuario antiguo |
| **¿Existe Personalización Real?** | N/A | 🔴 **FALSA PERSONALIZACIÓN** |

---

## 24. Code-to-Contract Matrix

| Contrato | Código Real | Evidencia | Resultado |
| :--- | :--- | :--- | :---: |
| **TOP_SELLING: Campo `unitsSold30d`** | `it.unitsSold30d` | `CuratedBusinessSections.kt:87` | 🟢 **PASS** |
| **TOP_SELLING: Orden `DESC`** | `sortedByDescending { it.unitsSold30d }` | `CuratedBusinessSections.kt:88` | 🟢 **PASS** |
| **TOP_SELLING: Límite de carrusel** | `take(10)` | `CuratedBusinessSections.kt:93` | 🟢 **PASS** |
| **TOP_SELLING: Ventana 30 días en agregador** | `createdAt >= thirtyDaysTimestamp` | `dashboardAggregation.ts:104` | 🟢 **PASS (en callable)** |
| **TOP_SELLING: Exclusión órdenes de prueba** | `isTest === true \|\| testOrder === true` | `dashboardAggregation.ts:36, 113` | 🟢 **PASS** |
| **TOP_SELLING: Scheduled Function (02:00 UTC)** | **Inexistente** (Solo trigger + callable) | `functions/src/` | 🔴 **FAIL** |
| **RECOMMENDED: Afinidad Categoría 40%** | `if (biz.getEffectiveIsFeatured()) 40.0` | `CuratedBusinessSections.kt:138` | 🔴 **FAIL** |
| **RECOMMENDED: Normalización Rating 25%** | `(rating / 5.0) * 25.0` | `CuratedBusinessSections.kt:139` | 🟡 **MISMATCH** |
| **RECOMMENDED: Geo Proximidad 20%** | `val proximityScore = 20.0` (Constante) | `CuratedBusinessSections.kt:140` | 🔴 **FAIL** |
| **RECOMMENDED: Confianza / Verificación 15%** | `if (isVerified) 15.0 else 0.0` | `CuratedBusinessSections.kt:141` | 🟠 **PARTIAL** |
| **RECOMMENDED: Historial de Usuario** | **No se recibe ni se procesa** | `CuratedBusinessSections.kt:124` | 🔴 **FAIL** |
| **RECOMMENDED: Diferenciación entre usuarios** | **Idéntico para todos los usuarios** | Análisis diferencial | 🔴 **FAIL** |

---

## 25. Certification Gates

- **Gate A (TOP_SELLING Algoritmo Local):** 🟢 **PASS**. El código de ordenamiento por `unitsSold30d` existe y opera según diseño.
- **Gate B (TOP_SELLING Pipeline Backend):** 🔴 **FAIL**. Falta el Cloud Scheduler para el recalculo diario automático a las 02:00 UTC; actualmente depende de ejecución manual del callable.
- **Gate C (RECOMMENDED Algoritmo Contractual):** 🔴 **FAIL**. El código no implementa el cálculo $0.40 C + 0.25 R + 0.20 P + 0.15 F$ con datos de usuario reales; utiliza un scoring estático sobre metadatos del comercio.
- **Gate D (Prueba Diferencial Multi-Usuario):** 🔴 **FAIL**. No existe variación en recomendaciones cuando dos usuarios tienen historiales de compra opuestos.

---

## 26. Final Verdict

El estado técnico oficial resultante de esta auditoría forense es:
**🟠 PARTIAL / CODE CORRECT FOR TOP_SELLING LOCAL • SEMANTIC FAILURE FOR RECOMMENDED**

1. **TOP_SELLING:**
   - La implementación en Kotlin es correcta a nivel de código local y prioriza `unitsSold30d`.
   - El pipeline de datos está incompleto por falta del scheduler diario a las 02:00 UTC.
2. **RECOMMENDED:**
   - La implementación actual es un **placeholder heurístico estático**.
   - No existe personalización real vinculada al historial o ubicación del usuario cliente.
   - Decir "Recomendados para ti" con el código actual constituye una representación inexacta de la semántica contractual.

---

## 27. Required Follow-up (Actividad Futura de Ingeniería)

*Nota: Conforme a la regla maestra de esta auditoría, NO se ha modificado una sola línea de código en esta sesión. Se proponen las siguientes actividades formales aisladas:*

1. **Actividad Backend — Cloud Scheduler:**
   - Implementar `functions/src/schedulers/topSellingScheduler.ts` con cron `.schedule("0 2 * * *").timeZone("UTC")` que invoque la lógica de recalculo de `unitsSold30d` de los últimos 30 días móviles.
2. **Actividad Android — Motor de Recomendación Personalizado:**
   - Crear `RecommendationEngine.kt` en el módulo de dominio cliente que tome:
     `(publicBusinesses: List<BusinessInfo>, userRecentOrders: List<Pedido>, userLocation: Location?)`.
   - Calcular $C_{\text{affinity}}$ analizando los ítems y comercios de las últimas 5 órdenes completadas del cliente.
   - Calcular $P_{\text{geo}}$ utilizando la distancia Haversine real contra las coordenadas del comercio.
   - Aplicar la normalización contractual $R_{\text{norm}} = (rating - 3.5)/1.5$.
   - Pasar `recentOrders` y coordenadas del usuario a `CustomerHomeFeedSection` y `RecommendedSection`.
3. **Corrección Menor en Repositorio:**
   - Incluir los campos `unitsSold30d`, `priceParityVerified` y `activatedAt` en el bloque manual de fallback de `BusinessRepository.kt:toBusinessInfoSafely`.

---

```text
============================================================
 BLUE SYSTEM DELIVERY ENTERPRISE
 C2D CUSTOMER DASHBOARD
 TOP SELLING / RECOMMENDED
 SEMANTIC VALIDATION
============================================================

TOP_SELLING IMPLEMENTATION        : PASS
unitsSold30d                     : PASS
30-DAY AGGREGATION               : PASS (En Callable Manual)
SCHEDULED FUNCTION               : FAIL (No Existe Cron Diario)
TOP_SELLING DESC RANKING         : PASS

RECOMMENDED IMPLEMENTATION       : FAIL (Falsa Personalización)
CATEGORY AFFINITY 40%            : FAIL (Reemplazado por isFeatured)
RATING 25%                       : FAIL (Fórmula Desviada)
GEO 20%                          : FAIL (Constante 20.0 Hardcodeada)
TRUST 15%                        : PARTIAL (Solo isVerified)
USER HISTORY                     : FAIL (Ignorado por Completo)
COLD START                       : FAIL (Idéntico a Usuario Activo)

CONTROLLED DATASET               : PASS (Evaluado en Código)
DIFFERENTIAL TEST                : FAIL (Multi-Usuario no se Diferencia)

TOP_SELLING ≠ RECOMMENDED        : PASS (Con Ventas Pobladas) / FAIL (Sin Ventas)

SEMANTIC P0 BLOCKERS             : 0
SEMANTIC P1 BLOCKERS             : 2 (Falsa Recomendación + Sin Cron)
SEMANTIC P2 FINDINGS             : 2 (Fallback toObject + Fallback Rating)

CODE MUTATION                    : NONE
PRODUCTION DB MUTATION           : NONE
PRODUCTION DEPLOYMENT            : NONE

============================================================
FINAL VERDICT
============================================================

🟠 PARTIAL

============================================================
```
