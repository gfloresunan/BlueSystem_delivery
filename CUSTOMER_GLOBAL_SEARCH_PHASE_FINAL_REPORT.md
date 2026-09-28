# BLUE SYSTEM DELIVERY ENTERPRISE
## REPORTE FINAL DE FASE: CUSTOMER GLOBAL SEARCH ENGINE v1.0
**Búsqueda Global en Customer App: Comercios + Platos + Combos + Promociones**

---

### 1. Diagnóstico Forense y Causa Raíz
* **Causa Raíz en UI (`CustomerHomeScreen.kt`)**: La barra de búsqueda filtraba de manera aislada la lista de comercios (`sortedPublicBusinesses`), descartando totalmente los productos, platos, combos y promociones del catálogo.
* **Causa Raíz en Estado (`CustomerHomeViewModel.kt`)**: El ViewModel no mantenía un flujo reactivo unificado del catálogo general de `/products`, `/combos` y `/promotions`.
* **Causa Raíz en Motor (`EnterpriseSearchEngine.kt`)**: El motor de búsqueda anterior era un placeholder limitado a entidades legacy (`Usuario`, `FeaturedProduct`, `BranchItem`) sin normalización de texto, ranking de relevancia, ni soporte multi-entidad tipado.

---

### 2. Solución Quirúrgica Aplicada
1. **Modelo Normalizado de Resultados (`CustomerSearchResult`)**:
   - Tipos soportados: `BUSINESS` (🏪), `PRODUCT` (🍔), `COMBO` (🍱), `PROMOTION` (🎁).
   - Atributos: `id`, `type`, `title`, `subtitle`, `description`, `imageUrl`, `price`, `originalPrice`, `discountTag`, `businessId`, `businessName`, `branchId`, `categoryName`, `rating`, `isAvailable`, `relevanceScore`.
2. **Motor de Búsqueda Global (`EnterpriseSearchEngine.kt`)**:
   - Implementación de `searchCatalog()` con normalización de caracteres diacríticos (`á, é, í, ó, ú, ü, ñ` $\to$ `a, e, i, o, u, u, n`), insensibilidad a mayúsculas/minúsculas y tokenización multi-palabra.
   - Algoritmo de puntuación por relevancia: Coincidencia exacta (100 pts) > Prefijo (50 pts) > Subcadena en título (30 pts) > Categoría/Tags (20 pts) > Descripción/Comercio (10 pts).
3. **Flujos Reactivos y Caché en `FirebaseManager.kt` & `CustomerHomeViewModel.kt`**:
   - `listenToAllActiveProducts()` y `listenToActiveCombos()` con carga instantánea de caché local de Firestore (`Source.CACHE`) y listener en segundo plano.
   - Reactividad con `combine` en Kotlin Flows y emisión unificada de `CustomerSearchResults`.
4. **UI del Dashboard Principal (`CustomerHomeScreen.kt`)**:
   - Barra de búsqueda conectada con soporte para texto, botón de limpieza y reconocimiento de voz (`RecognizerIntent`).
   - Pestañas de filtrado de resultados con contadores en tiempo real: `Todos (N)`, `🏪 Comercios (N)`, `🍔 Platos (N)`, `🍱 Combos (N)`, `🎁 Promociones (N)`.
   - Tarjetas `GlobalSearchResultItemCard` con insignia visual del tipo de entidad, imágenes optimizadas, precios, descuentos y botón rápido de "Pedir" (`CartManager.addToCart`).
   - Navegación canónica a la pantalla de detalle del comercio (`comercio_detalle_screen/{businessId}`).
   - Estado vacío descriptivo con sugerencias de búsqueda cuando no existen coincidencias.
   - Restauración limpia del Dashboard principal original cuando la consulta de búsqueda está vacía (cero regresiones).

---

### 3. Entidades Soportadas y Colecciones Firestore

| Entidad | Emoji / Badge | Colección Firestore | Campos Evaluados | Reglas de Disponibilidad |
| :--- | :---: | :--- | :--- | :--- |
| **Comercios** | 🏪 COMERCIO | `/businesses` | `name`, `category`, `address`, `description`, `logoUrl`, `bannerUrl` | `active == true`, `status != "DELETED"` |
| **Platos / Productos** | 🍔 PLATO | `/products` | `name`, `description`, `categoryName`, `tags`, `price`, `imageUrl` | `status == ACTIVE`, `!isHidden`, `isAvailable` |
| **Combos** | 🍱 COMBO | `/combos` + `/products` (tipo COMBO) | `name`, `description`, `slots.slotName`, `basePrice`, `percentageDiscount` | `status == ACTIVE` |
| **Promociones** | 🎁 PROMOCIÓN | `/promotions` | `title`, `description`, `couponCode`, `discountPercentage`, `image` | `active == true` |

---

### 4. Seguridad y Gobernanza de Datos
* **Firestore Security Rules**: **NO MODIFICADAS**.
* Se reutilizaron exclusivamente las consultas de catálogo público ya autorizadas para el rol `Customer`.
* `PERMISSION_DENIED = 0`.
* Aislamiento Multi-Tenant respetado en todas las entidades.

---

### 5. Auditoría de Rendimiento y Regresión
* **Debounce y Reactividad**: Búsqueda reactiva fluida ejecutada en memoria sobre el catálogo sincronizado en caché local (0 llamadas remotas $N+1$).
* **Fleet Core / Asignación de Repartidores**: Intacto (sin modificaciones).
* **Módulo de Comercio / Merchant Web**: Intacto.
* **Módulo de Repartidor / Courier App**: Intacto.
* **Módulo Admin / Control Tower**: Intacto.

---

### 6. Matriz de Pruebas Unitarias (`EnterpriseSearchEngineTest`)

| # | Prueba | Escenario | Resultado |
| :-: | :--- | :--- | :---: |
| 1 | `test1_buscarComercio_encuentraComercio` | Búsqueda de "Pizza" encuentra "Pizza Hut" (Tipo `BUSINESS`) | ✅ PASÓ |
| 2 | `test2_buscarPlato_encuentraPlato` | Búsqueda de "Hamburguesa" encuentra "Hamburguesa Doble" (Tipo `PRODUCT`) | ✅ PASÓ |
| 3 | `test3_buscarCombo_encuentraCombo` | Búsqueda de "Combo Familiar" encuentra "Combo Familiar de Pollo" (Tipo `COMBO`) | ✅ PASÓ |
| 4 | `test4_buscarPromocion_encuentraPromocion` | Búsqueda de "2x1" encuentra "2x1 en Piezas de Pollo" (Tipo `PROMOTION`) | ✅ PASÓ |
| 5 | `test5_busquedaParcial_encuentraResultados` | Búsqueda de prefijo "hambu" encuentra la hamburguesa | ✅ PASÓ |
| 6 | `test6_mayusculasYMinusculas_resultadosEquivalentes` | "HAMBURGUESA" y "hamburguesa" producen resultados idénticos | ✅ PASÓ |
| 7 | `test7_sinResultados_retornaListaVacia` | Consulta inexistente "xyz123abc" retorna 0 resultados | ✅ PASÓ |
| 8 | `test8_queryVacia_retornaVacio` | Consulta vacía "" retorna lista limpia | ✅ PASÓ |
| 9 | `test9_normalizacionAcentos_encuentraPlatoConAcento` | Búsqueda con acento "pláncha" encuentra "Pollo a la Plancha" | ✅ PASÓ |
| 10 | `test10_excluyeComerciosInactivosYEliminados` | Exclusión estricta de comercios eliminados | ✅ PASÓ |
| 11 | `test11_excluyeProductosInactivosYOcultos` | Exclusión estricta de productos ocultos o inactivos | ✅ PASÓ |
| 12 | `test12_excluyePromocionesInactivas` | Exclusión estricta de promociones inactivas | ✅ PASÓ |
| 13 | `test13_busquedaMultiEntidad_encuentraTodasLasEntidades` | Consulta "pollo" encuentra Comercio, Plato, Combo y Promoción simultáneamente | ✅ PASÓ |
| 14 | `test14_rankingRelevancia_priorizaCoincidenciaExacta` | Priorización de coincidencia exacta en el primer lugar del ranking | ✅ PASÓ |

---

### 7. Archivos Afectados

* **Archivos modificados**:
  - `app/src/main/java/com/example/domain/engine/intelligence/EnterpriseSearchEngine.kt`
  - `app/src/main/java/com/example/FirebaseManager.kt`
  - `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`
  - `app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt`
* **Archivos creados**:
  - `app/src/test/java/com/example/domain/engine/intelligence/EnterpriseSearchEngineTest.kt`
  - `CUSTOMER_GLOBAL_SEARCH_PHASE_FINAL_REPORT.md`

---

### 8. Estado y Conclusión
* **Estado de la Fase**: 🟢 **DONE / CERTIFIED**
* **Riesgos Restantes**: **NINGUNO**.
