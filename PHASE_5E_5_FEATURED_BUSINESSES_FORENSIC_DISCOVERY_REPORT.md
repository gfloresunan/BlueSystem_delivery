# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE DE ARQUITECTURA Y DESCUBRIMIENTO
## FASE 5E.5 — FEATURED BUSINESSES / BRANCHES FORENSIC DISCOVERY & EXTRACTION PLAN
### Customer App Android — Modularización Quirúrgica del Catálogo del Home

---

## 1. Executive Summary (Resumen Ejecutivo)
La **Fase 5E.5** ejecuta una radiografía forense exhaustiva y de solo lectura sobre la sección **Comercios Destacados ⭐ (Featured Businesses)** dentro de `CustomerHomeScreen.kt`.

La auditoría se ejecuta bajo el régimen estricto de **`AUDIT-FIRST / ZERO CODE MUTATION`** (0 mutaciones en código fuente, 0 mutaciones en Firestore, 0 mutaciones en reglas de seguridad, 0 mutaciones en Storage y 0 despliegues).

El diagnóstico confirma que la sección de Comercios Destacados consume el catálogo de comercios públicos en tiempo real (`publicBusinesses`), deriva los destacados mediante el predicado canónico `it.getEffectiveIsFeatured()`, delega la representación de cada comercio al componente puro `PublicBusinessCard.kt`, y orquesta de forma desacoplada la navegación a la pantalla de detalle (`comercio_detalle_screen/{business.id}`) y la alternancia de favoritos (`viewModel.toggleFavorite(business.id)`).

---

## 2. Authorization (Autorización)
Esta auditoría ha sido ejecutada con base en el mandato oficial del **PROMPT MAESTRO — FASE 5E.5**, tras la certificación de la **Fase 5E.4-B (Discounted Products Section Extraction)**.

---

## 3. Zero Mutation Declaration (Declaración de Cero Mutación)
Durante toda la ejecución de esta fase de descubrimiento:
- 🚫 **0** archivos Kotlin modificados.
- 🚫 **0** archivos Kotlin creados (no se ha creado `FeaturedBusinessesSection.kt`).
- 🚫 **0** modificaciones en `firestore.rules` o `storage.rules`.
- 🚫 **0** modificaciones en modelos (`Models.kt`, `BusinessRepository.kt`).
- 🚫 **0** modificaciones en `CustomerHomeViewModel.kt`, `FirebaseManager.kt` o `CartManager.kt`.
- 🚫 **0** modificaciones en `CustomerHomeScreen.kt`.
- 🚫 **0** despliegues a Firebase (`firebase deploy`).

---

## 4. Current Baseline (Línea Base Actual)
- **Fase 5.0 Inicial:** `CustomerHomeScreen.kt` = 2,601 líneas.
- **Fase 5E.4-B Certificada:** `CustomerHomeScreen.kt` = 1,130 líneas.
- **Líneas Actuales Inspeccionadas:** **1,130 líneas** en `CustomerHomeScreen.kt`.

---

## 5. Exact Code Location (Localización Forense Exacta)
En `CustomerHomeScreen.kt`:
1. **Recolección de Estado Reactivo:**
   - Línea 92:
     ```kotlin
     val publicBusinesses by viewModel.publicBusinesses.collectAsState()
     val dashboardConfig by viewModel.dashboardConfig.collectAsState()
     val favoriteIds by viewModel.favoriteIds.collectAsState()
     ```
2. **Bloque Renderizador Inline:**
   - Líneas 840–885 (46 líneas de código):
     ```kotlin
     // 5. COMERCIOS DESTACADOS
     val featuredPublicList = remember(publicBusinesses) {
         publicBusinesses.filter { it.getEffectiveIsFeatured() }
     }

     if (dashboardConfig.showFeaturedBusinesses) {
         Text(
             text = "Comercios Destacados ⭐",
             fontWeight = FontWeight.Bold,
             fontSize = 18.sp,
             color = Color(0xFF1E293B),
             modifier = Modifier.padding(horizontal = 16.dp)
         )
         Spacer(modifier = Modifier.height(12.dp))

         if (featuredPublicList.isEmpty()) {
             Card(
                 modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                 colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                 border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                 shape = RoundedCornerShape(12.dp)
             ) {
                 Text(
                     text = "No hay comercios destacados configurados actualmente.",
                     color = Color.Gray,
                     fontSize = 13.sp,
                     modifier = Modifier.padding(16.dp)
                 )
             }
         } else {
             LazyRow(
                 contentPadding = PaddingValues(horizontal = 16.dp),
                 horizontalArrangement = Arrangement.spacedBy(16.dp)
             ) {
                 items(featuredPublicList) { business ->
                     PublicBusinessCard(
                         business = business,
                         isFavorite = favoriteIds.contains(business.id),
                         onToggleFavorite = { viewModel.toggleFavorite(business.id) },
                         onClick = { navController.navigate("comercio_detalle_screen/${business.id}") }
                     )
                 }
             }
         }
         Spacer(modifier = Modifier.height(20.dp))
     }
     ```

---

## 6. Current Architecture (Arquitectura Actual)
```
Firestore (/businesses + /dashboard_config + /users/{uid}/favorites)
       │
       ▼ Realtime Listeners
FirebaseManager.listenToPublicCatalogBusinesses()
       │
       ▼ Flow<List<BusinessInfo>>
CustomerHomeViewModel (_publicBusinesses / favoriteIds / dashboardConfig)
       │
       ▼ StateFlow.collectAsState()
CustomerHomeScreen.kt (Líneas 840-885)
       ├── Derivación: featuredPublicList = publicBusinesses.filter { it.getEffectiveIsFeatured() }
       ├── Feature Flag: dashboardConfig.showFeaturedBusinesses
       ├── Empty State Card (si featuredPublicList.isEmpty())
       └── LazyRow (Separación 16.dp)
              └── PublicBusinessCard (presentation/customer/components/PublicBusinessCard.kt)
                     ├── isFavorite = favoriteIds.contains(business.id)
                     ├── onToggleFavorite -> viewModel.toggleFavorite(business.id)
                     └── onClick -> NavController.navigate("comercio_detalle_screen/${business.id}")
```

---

## 7. Data Source (Fuente de Datos)
- **Colección Base:** `/businesses`
- **Configuración de Dashboard:** `/dashboard_config` (`showFeaturedBusinesses`).
- **Colección de Favoritos:** `/users/{uid}/favorites` (documentos con ID = `businessId`).

---

## 8. Firestore Trace (Traza Forense de Firestore)
- **Colección:** `/businesses`
- **Esquema de Documento (`BusinessInfo`):**
  - `id`: `String` (ID del documento)
  - `name` / `nombre` / `comercioNombre`: `String` (Nombre comercial)
  - `category` / `categoria`: `String` (Categoría principal)
  - `address` / `direccion`: `String` (Dirección física)
  - `logoUrl` / `photoUrl` / `avatarUrl`: `String` (URL del logotipo)
  - `bannerUrl` / `coverUrl` / `portadaUrl`: `String` (URL de la portada)
  - `isOpen` / `abierto`: `Boolean` (Indicador de apertura)
  - `isFeatured` / `featured`: `Boolean` (Indicador de comercio destacado)
  - `isActive` / `active` / `status` / `lifecycleStatus`: `Boolean` / `String` (Estado operativo)
  - `rating` / `ratingAverage`: `Double` (Calificación promedio)
- **Reglas de Seguridad (`firestore.rules`):**
  ```
  match /businesses/{bizId} {
    allow read: if true;
    allow write: if isAuthenticated() && (isPlatformAdmin() || isBusinessAdmin());
  }
  ```

---

## 9. Repository Trace (Traza de Repositorio)
`FirebaseManager.kt` implementa `listenToPublicCatalogBusinesses()` (Líneas 1097–1135):
1. **Carga Instantánea desde Caché:** Lee `/businesses` con `Source.CACHE` para despliegue en 0ms.
2. **SnapshotListener Continuo:** Escucha cambios en tiempo real y descarta documentos inválidos mediante `parsed.isValidPublicCatalogItem()` (`getEffectiveIsActive() && getEffectiveName().isNotBlank()`).

---

## 10. ViewModel Trace (Traza en CustomerHomeViewModel)
En `CustomerHomeViewModel.kt`:
- **Declaración:**
  ```kotlin
  private val _publicBusinesses = MutableStateFlow<List<com.example.data.repository.BusinessInfo>>(emptyList())
  val publicBusinesses: StateFlow<List<com.example.data.repository.BusinessInfo>> = _publicBusinesses.asStateFlow()
  ```
- **Suscripción:** En `listenToDashboardData()`:
  ```kotlin
  launch { fm.listenToPublicCatalogBusinesses().collect { _publicBusinesses.value = it } }
  ```
- **Favoritos:**
  ```kotlin
  private val _favoriteIds = MutableStateFlow<Set<String>>(emptySet())
  val favoriteIds: StateFlow<Set<String>> = _favoriteIds.asStateFlow()
  ```

---

## 11. Business vs Branch Analysis (Análisis Comercio vs Sucursal) 🏢
- **`BusinessInfo` (Comercio / Merchant):** Representa la entidad comercial de primer orden (`/businesses/{businessId}`). Es la unidad consumida por la sección de Comercios Destacados.
- **`BranchItem` (Sucursal Física):** Representa una sucursal geográfica individual (`/branches/{branchId}`). Se utiliza dentro del flujo detallado del comercio cuando este cuenta con múltiples sedes.
- **Veredicto:** La sección de Comercios Destacados opera **exclusivamente sobre `BusinessInfo`**. No existe riesgo de colisión ni ambigüedad entre `businessId` y `branchId` a este nivel.

---

## 12. businessId / branchId Navigation Analysis
- La tarjeta `PublicBusinessCard` utiliza `business.id` (ID canónico del comercio en `/businesses`).
- La navegación apunta a `"comercio_detalle_screen/${business.id}"`.
- Si el comercio tiene sucursales, la pantalla `ComercioDetalleScreen` gestiona la selección de sucursal (`branches`).

---

## 13. Availability Analysis (Disponibilidad y Horarios) 🟢
- `PublicBusinessCard.kt` evalúa:
  ```kotlin
  val isOpen = business.getEffectiveIsOpen() // (isOpen && abierto)
  ```
- Renderiza un badge visual sobre el banner:
  - `ABIERTO 🟢` (Fondo `Color(0xFF10B981)`)
  - `CERRADO 🔴` (Fondo `Color(0xFF64748B)`)
- No se bloquea la navegación si el comercio está cerrado; el cliente puede consultar el menú pero no emitir órdenes inmediatas.

---

## 14. Navigation Analysis (Auditoría de Navegación)
- **Ruta invocada:** `navController.navigate("comercio_detalle_screen/${business.id}")`.
- **Frontera de Extracción:** El futuro componente `FeaturedBusinessesSection.kt` **NO debe recibir `NavController`**. Expondrá el callback:
  ```kotlin
  onBusinessClick: (businessId: String) -> Unit
  ```
  y `CustomerHomeScreen` ejecutará la navegación hacia la ruta existente.

---

## 15. Favorites Analysis (Auditoría de Favoritos) ❤️
- **Estado:** `isFavorite = favoriteIds.contains(business.id)`.
- **Acción:** Al pulsar el icono de corazón en `PublicBusinessCard`, se dispara `onToggleFavorite: () -> Unit`.
- **Backend:** `CustomerHomeViewModel.toggleFavorite(businessId)` añade o elimina el documento `/users/{uid}/favorites/{businessId}` de forma asíncrona.
- **Comportamiento en Guest:** Si el usuario es invitado (`auth.currentUser == null`), `toggleFavorite()` retorna de forma segura sin mutaciones de base de datos ni excepciones.
- **Frontera de Extracción:** `FeaturedBusinessesSection.kt` recibirá:
  - `favoriteIds: Set<String>`
  - `onToggleFavorite: (businessId: String) -> Unit`

---

## 16. Cart / Product Interaction Audit (Interacción con Carrito) 🛒
- **Hallazgo:** La tarjeta `PublicBusinessCard` **NO interactúa con `CartManager`**.
- No agrega productos directamente al carrito.
- Su única función es navegar a la vista de detalle del comercio.
- **Riesgo:** 🟢 **LOW RISK** (Cero dependencias transaccionales de carrito).

---

## 17. Multi-Commerce Analysis (Carrito Multi-Comercio)
- Al no interactuar con el carrito en esta sección, no altera el contexto activo ni genera conflictos de pedidos entre múltiples comercios.

---

## 18. PublicBusinessCard Audit (Auditoría del Componente Card)
- **Ubicación:** `app/src/main/java/com/example/presentation/customer/components/PublicBusinessCard.kt` (184 líneas).
- **Firma:**
  ```kotlin
  @Composable
  fun PublicBusinessCard(
      business: BusinessInfo,
      isFavorite: Boolean = false,
      onToggleFavorite: () -> Unit = {},
      onClick: () -> Unit
  )
  ```
- **Pureza UI:** 🟢 **100% PURO**. No contiene accesos a Firebase, ViewModels, CartManager ni NavController.

---

## 19. Guest vs Authenticated Matrix (Matriz Invitado vs Autenticado)

| Función | Modo Guest | Modo Autenticado | Comportamiento |
| :--- | :---: | :---: | :--- |
| **Ver comercios destacados** | ✅ | ✅ | Lectura pública en `/businesses` |
| **Ver estado Abierto/Cerrado** | ✅ | ✅ | Renderizado idéntico |
| **Navegar al comercio** | ✅ | ✅ | Abre catálogo del comercio |
| **Alternar Favorito (❤️)** | ⚠️ No-op | ✅ Persiste | Guest retorna silenciosamente sin error |
| **Comprar en comercio** | ❌ (Login) | ✅ | Checkout protegido |

---

## 20. Loading / Empty / Error States
- **Empty State:** Si `featuredPublicList.isEmpty()`, renderiza una tarjeta `Card` con el mensaje `"No hay comercios destacados configurados actualmente."` y texto gris (`Color.Gray`).
- **Loading State:** Manejado a nivel de pantalla / pull-to-refresh.

---

## 21. Mock / Fake Audit (Auditoría de Mocks)
- **Resultado:** 🟢 **0% Mock**. Todos los datos provienen de documentos reales en `/businesses`.

---

## 22. Hidden Business Logic Audit (Lógica Oculta en UI)
- **Filtro de Destacados:** En `CustomerHomeScreen.kt`, línea 842:
  ```kotlin
  val featuredPublicList = remember(publicBusinesses) {
      publicBusinesses.filter { it.getEffectiveIsFeatured() }
  }
  ```
- **Dictamen:** Es una derivación puramente de presentación (`Derived UI State`). Al modularizar en `FeaturedBusinessesSection.kt`, el componente puede recibir directamente `publicBusinesses` y calcular `featuredPublicList` internamente, o recibir la lista filtrada desde el host.

---

## 23. Theme & Design System Audit 🎨
- `MaterialTheme.colorScheme.surface` en la tarjeta.
- `MaterialTheme.colorScheme.surfaceContainerLow` en Empty State Card.
- `MaterialTheme.colorScheme.outlineVariant` en bordes.
- `Color(0xFF1E293B)` (Slate 800) en el título.
- `Color(0xFFD97706)` (Ámbar) para el rating ⭐.
- `Color(0xFF10B981)` (Esmeralda) para `"ABIERTO 🟢"`.
- `Color(0xFFFF2D55)` para el corazón de favorito activo.
- **Clasificación:** 🟢 **Theme Compliant**.

---

## 24. Accessibility & Foldable Audit (Accesibilidad y Plegables)
- `AsyncImage` con `contentDescription = name`.
- `IconButton` de favoritos con `contentDescription = "Favorito"`.
- `LazyRow` con `PaddingValues(horizontal = 16.dp)` y `spacedBy(16.dp)` para navegación horizontal fluida en dispositivos normales y plegables (Galaxy Z Fold 5).

---

## 25. Dependency Graph (Grafo de Dependencias)
```
CustomerHomeScreen.kt (Host Orchestrator)
 │
 ├── collects viewModel.publicBusinesses
 ├── collects viewModel.dashboardConfig
 ├── collects viewModel.favoriteIds
 │
 └── FeaturedBusinessesSection.kt (com.example.presentation.customer.home)
       ├── Input: showFeaturedBusinesses: Boolean
       ├── Input: publicBusinesses: List<BusinessInfo>
       ├── Input: favoriteIds: Set<String>
       ├── Callback: onBusinessClick: (businessId: String) -> Unit
       ├── Callback: onToggleFavorite: (businessId: String) -> Unit
       │
       └── PublicBusinessCard.kt (com.example.presentation.customer.components)
             ├── isFavorite = favoriteIds.contains(business.id)
             ├── onToggleFavorite -> onToggleFavorite(business.id)
             └── onClick -> onBusinessClick(business.id)
```

---

## 26. Candidate Component API (Firma Propuesta del Nuevo Componente)
```kotlin
package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.BusinessInfo
import com.example.presentation.customer.components.PublicBusinessCard

@Composable
fun FeaturedBusinessesSection(
    showFeaturedBusinesses: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
)
```

---

## 27. Extraction Matrix (Matriz de Decisión de Extracción)

| Elemento | ¿Extraíble? | Nivel de Riesgo | Acción Propuesta |
| :--- | :---: | :---: | :--- |
| **Título y Espaciadores** | Sí | 🟢 LOW | Mover a `FeaturedBusinessesSection.kt` |
| **Empty State Card** | Sí | 🟢 LOW | Mover a `FeaturedBusinessesSection.kt` |
| **Filtrado `it.getEffectiveIsFeatured()`** | Sí | 🟢 LOW | Encapsular en `FeaturedBusinessesSection.kt` |
| **LazyRow** | Sí | 🟢 LOW | Mover a `FeaturedBusinessesSection.kt` |
| **PublicBusinessCard** | Sí | 🟢 LOW | Reutilizar dentro de `FeaturedBusinessesSection.kt` |
| **Navegación al Comercio** | No | 🟡 MEDIUM | Delegar vía callback `onBusinessClick(business.id)` |
| **Toggle de Favoritos** | No | 🟡 MEDIUM | Delegar vía callback `onToggleFavorite(business.id)` |
| **Firestore Listener** | No | 🔴 CRITICAL | Mantener inmutable en `FirebaseManager` |
| **ViewModel State** | No | 🔴 CRITICAL | Mantener inmutable en `CustomerHomeViewModel` |

---

## 28. Risk Matrix & Blast Radius (Matriz de Riesgo y Radio de Impacto)
- **Clasificación General:** 🟢 **LOW RISK (con Callbacks Controlados)**.
- **Radio de Impacto:** Aislado a la UI de Home; no afecta persistencia de favoritos, no altera Firestore Rules ni interactúa con CartManager.

---

## 29. Protected Baselines (Líneas Base Protegidas)
Quedan formalmente protegidos e inmutables:
- `CustomerHomeViewModel.kt`
- `FirebaseManager.kt`
- `CartManager.kt`
- `PublicBusinessCard.kt`
- `Models.kt`
- `BusinessRepository.kt`
- `firestore.rules`
- `storage.rules`
- Componentes previamente extraídos (`HomeHeader.kt`, `ExpressDeliveryBanner.kt`, `HomeCategoriesSection.kt`, `FlashDealsSection.kt`, `DiscountedProductsSection.kt`).

---

## 30. Rollback Strategy (Estrategia de Rollback)
En caso de cualquier eventualidad tras una futura extracción (Fase 5E.5-B):
1. Eliminar `app/src/main/java/com/example/presentation/customer/home/FeaturedBusinessesSection.kt`.
2. Restaurar las 46 líneas inline en `CustomerHomeScreen.kt` (Líneas 840–885).

---

## 31. Zero Mutation Verification (Verificación de Cero Mutación)
- **Archivos Modificados en `app/`:** 0
- **Archivos Nuevos en `app/`:** 0
- **Estado:** 🟢 **ZERO CODE MUTATION VERIFIED**.

---

## 32. Final Recommendation (Recomendación Final)
### 🟢 **READY FOR EXTRACTION (CONTROLLED CALLBACK EXTRACTION)**
La sección de Comercios Destacados (`Featured Businesses`) es apta para su extracción modular hacia `presentation/customer/home/FeaturedBusinessesSection.kt`. La delegación de `onBusinessClick` y `onToggleFavorite` asegura una separación limpia de responsabilidades y reducirá ~40 líneas netas adicionales de `CustomerHomeScreen.kt`.

---

## 33. Human Approval Gate (Puerta de Aprobación Humana)
> [!IMPORTANT]
> **GATE DE SEGURIDAD OBLIGATORIO:** No se realizarán mutaciones de código en `CustomerHomeScreen.kt` ni se creará `FeaturedBusinessesSection.kt` hasta contar con la autorización explícita del usuario tras revisar este reporte forense.
