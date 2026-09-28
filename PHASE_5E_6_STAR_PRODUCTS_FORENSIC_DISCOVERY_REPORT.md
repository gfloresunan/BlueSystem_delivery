# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE DE ARQUITECTURA Y DESCUBRIMIENTO
## FASE 5E.6 — STAR PRODUCTS SECTION FORENSIC DISCOVERY & EXTRACTION PLAN
### Customer App Android — Modularización Quirúrgica del Catálogo del Home

---

## 1. Executive Summary (Resumen Ejecutivo)
La **Fase 5E.6** ejecuta una radiografía forense exhaustiva y de solo lectura sobre la sección **Productos Estrella ⭐ (Star Products / Featured Products)** dentro de `CustomerHomeScreen.kt`.

La auditoría se realiza bajo el régimen estricto de **`AUDIT-FIRST / ZERO CODE MUTATION`** (0 mutaciones en código fuente, 0 mutaciones en Firestore, 0 mutaciones en reglas de seguridad, 0 mutaciones en Storage y 0 despliegues).

El diagnóstico forense revela que la sección de Productos Estrella consume el flujo reactivo `featuredProducts` desde `CustomerHomeViewModel`, el cual es alimentado en tiempo real por `FirebaseManager.listenToFeaturedProducts()`. Dicha sección orquesta la visualización de los productos destacados en una lista horizontal (`LazyRow`) utilizando la tarjeta pura `StarProductCard.kt`. Al pulsar un producto, el flujo navega a la pantalla de detalle del comercio (`comercio_detalle_screen/{star.businessId}`).

La sección **no realiza mutaciones de carrito directas**, no implementa lógica financiera ni cálculo de descuentos en UI, y presenta un nivel de riesgo catalogado formalmente como 🟢 **LOW RISK**, haciéndola óptima para una extracción modular controlada.

---

## 2. Authorization (Autorización)
Esta auditoría ha sido ejecutada en cumplimiento del mandato oficial del **PROMPT MAESTRO — FASE 5E.6**, tras la certificación de la **Fase 5E.5-B (Featured Businesses Section Extraction)**.

---

## 3. Zero Mutation Declaration (Declaración de Cero Mutación)
Durante toda la ejecución de esta fase de descubrimiento:
- 🚫 **0** archivos Kotlin modificados.
- 🚫 **0** archivos Kotlin creados (no se ha creado `StarProductsSection.kt`).
- 🚫 **0** modificaciones en `firestore.rules` o `storage.rules`.
- 🚫 **0** modificaciones en modelos (`Models.kt`, `BusinessRepository.kt`).
- 🚫 **0** modificaciones en `CustomerHomeViewModel.kt`, `FirebaseManager.kt` o `CartManager.kt`.
- 🚫 **0** modificaciones en `CustomerHomeScreen.kt`.
- 🚫 **0** despliegues a Firebase (`firebase deploy`).

---

## 4. Current Baseline (Línea Base Actual)
- **Línea base actual de `CustomerHomeScreen.kt`:** **1,096 líneas**.
- **Componentes modulares previamente certificados en `presentation/customer/home/`:**
  1. `HomeHeader.kt` (Fase 5C)
  2. `ExpressDeliveryBanner.kt` (Fase 5D)
  3. `HomeCategoriesSection.kt` (Fase 5E.2)
  4. `FlashDealsSection.kt` (Fase 5E.3-B)
  5. `DiscountedProductsSection.kt` (Fase 5E.4-B)
  6. `FeaturedBusinessesSection.kt` (Fase 5E.5-B)

---

## 5. Exact Code Location (Localización Forense Exacta)
En `CustomerHomeScreen.kt`:
1. **Recolección de Estado Reactivo:**
   - Línea 95–96:
     ```kotlin
     val dashboardConfig by viewModel.dashboardConfig.collectAsState()
     val featuredProducts by viewModel.featuredProducts.collectAsState()
     ```
2. **Bloque Renderizador Inline:**
   - Líneas 853–902 (50 líneas de código):
     ```kotlin
     // 5. PRODUCTOS ESTRELLA (SPRINT 15)
     if (dashboardConfig.showFeaturedProducts) {
         Text(
             text = "Productos Estrella ⭐",
             fontWeight = FontWeight.ExtraBold,
             fontSize = 18.sp,
             color = Color(0xFF0F172A),
             modifier = Modifier.padding(horizontal = 16.dp)
         )
         Spacer(modifier = Modifier.height(10.dp))

         val starList = remember(featuredProducts) {
             featuredProducts
         }

         if (starList.isEmpty()) {
             Card(
                 modifier = Modifier
                     .fillMaxWidth()
                     .padding(horizontal = 16.dp),
                 colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                 shape = RoundedCornerShape(12.dp),
                 border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
             ) {
                 Text(
                     text = "No hay productos estrella configurados actualmente.",
                     color = MaterialTheme.colorScheme.onSurfaceVariant,
                     fontSize = 13.sp,
                     modifier = Modifier.padding(16.dp)
                 )
             }
         } else {
             LazyRow(
                 contentPadding = PaddingValues(horizontal = 16.dp),
                 horizontalArrangement = Arrangement.spacedBy(14.dp)
             ) {
                 items(starList) { star ->
                     StarProductCard(
                         name = star.name,
                         price = star.price,
                         originalPrice = star.originalPrice,
                         businessName = star.businessName,
                         imageUrl = star.imageUrl,
                         onClick = { navController.navigate("comercio_detalle_screen/${star.businessId}") }
                     )
                 }
             }
         }
         Spacer(modifier = Modifier.height(20.dp))
     }
     ```

---

## 6. State Ownership (Propiedad del Estado)
- **`dashboardConfig`:** `StateFlow<DashboardConfig>` en `CustomerHomeViewModel`, alimentado desde la colección `/dashboard_config`. El flag `showFeaturedProducts` controla la visibilidad.
- **`featuredProducts`:** `StateFlow<List<FeaturedProduct>>` en `CustomerHomeViewModel`, alimentado por `FirebaseManager.listenToFeaturedProducts()`.
- **`starList`:** Derivado localmente mediante `remember(featuredProducts) { featuredProducts }` en el Composable.

---

## 7. Data Source & Firestore Trace (Fuente de Datos y Flujo Firestore)
`FirebaseManager.listenToFeaturedProducts()` combina en tiempo real tres fuentes de Firestore:
1. **`/featuredProducts`:** Documentos explícitamente configurados por la administración con atributos `active == true`.
2. **`/products`:** Documentos de catálogo general con `(isPopular || isTopSeller)` y `status != INACTIVE && !isHidden`.
3. **`/businesses`:** Mapa reactivo de nombres de comercio (`doc.id -> name/nombre`) para enriquecer `businessName`.

---

## 8. Model Audit (Auditoría del Modelo)
- **Modelo:** `FeaturedProduct`
- **Ubicación:** `app/src/main/java/com/example/Models.kt` (Líneas 430–444).
- **Esquema:**
  ```kotlin
  @IgnoreExtraProperties
  data class FeaturedProduct(
      val id: String = "",
      val name: String = "",
      val price: Double = 0.0,
      val originalPrice: Double? = null,
      val imageUrl: String = "",
      val rating: Double = 4.9,
      val businessId: String = "",
      val businessName: String = "",
      val categoryName: String = "",
      val isPopular: Boolean = true,
      val productId: String = "",
      val active: Boolean = true
  )
  ```

---

## 9. Business ID / Branch ID Analysis 🏢
- **`star.businessId`:** Identifica unívocamente el comercio de origen en `/businesses/{businessId}`.
- **Navegación:** Se ejecuta directamente hacia `"comercio_detalle_screen/${star.businessId}"`.
- **Sucursales (`branchId`):** La selección de sucursales físicas se gestiona dentro de `ComercioDetalleScreen`, manteniendo a la sección de Productos Estrella libre de complejidad multisede.

---

## 10. Pricing & Discount Authority Audit 💰
- **`price: Double`:** Proviene directamente del backend (`liveProd.price` o `fp.price`).
- **`originalPrice: Double?`:** Proviene del backend (`liveProd.originalPrice ?: fp.originalPrice`).
- **Cálculos en UI:** 🟢 **0% Cálculos**. No existen multiplicaciones, porcentajes ni deducciones en Compose.
- **Formato:** `String.format("%.0f", price)` en `StarProductCard.kt`.
- **Dictamen:** 🟢 **Backend-Authoritative Pricing**.

---

## 11. Inventory & Availability Audit (Inventario y Disponibilidad) 📦
- El filtro de disponibilidad se ejecuta a nivel de repositorio en `FirebaseManager.kt`:
  ```kotlin
  val isProdActive = liveProd.status != ProductStatus.INACTIVE && !liveProd.isHidden
  ```
- Productos inactivos u ocultos son excluidos automáticamente antes de llegar al ViewModel y al UI.

---

## 12. Cart Forensic Audit (Auditoría del Carrito) 🛒
- **Hallazgo:** `StarProductCard` **NO incluye botón "Agregar al Carrito" ni interactúa con `CartManager`**.
- La tarjeta es un punto de entrada informativo que redirige al usuario a la pantalla del comercio (`onClick`).
- **Riesgo:** 🟢 **ZERO CART RISK**.

---

## 13. Navigation Audit (Auditoría de Navegación) 🧭
- **Ruta invocada:** `navController.navigate("comercio_detalle_screen/${star.businessId}")`.
- **Frontera de Extracción:** El futuro componente `StarProductsSection.kt` **NO debe recibir `NavController`**, sino el callback limpio:
  ```kotlin
  onProductClick: (businessId: String) -> Unit
  ```

---

## 14. Favorites Audit (Auditoría de Favoritos) ❤️
- **Hallazgo:** `StarProductCard` no dispone de botón de favoritos ni consume `favoriteIds`. No existen dependencias con favoritos en este bloque.

---

## 15. StarProductCard Audit (Auditoría del Componente Card)
- **Ubicación:** `app/src/main/java/com/example/presentation/customer/components/StarProductCard.kt` (104 líneas).
- **Firma:**
  ```kotlin
  @Composable
  fun StarProductCard(
      name: String,
      price: Double,
      originalPrice: Double?,
      businessName: String,
      imageUrl: String,
      onClick: () -> Unit
  )
  ```
- **Pureza UI:** 🟢 **100% Pure UI**. Sin dependencias a Firebase, ViewModels, CartManager ni NavController.

---

## 16. Guest vs Authenticated Matrix (Matriz de Permisos)

| Acción | Modo Guest | Modo Autenticado | Comportamiento |
| :--- | :---: | :---: | :--- |
| **Visualizar Productos Estrella** | ✅ | ✅ | Lectura pública de `/featuredProducts` y `/products` |
| **Consultar Precios y Negocio** | ✅ | ✅ | Renderizado idéntico |
| **Navegar al Comercio** | ✅ | ✅ | Redirige al catálogo de la tienda |
| **Agregar al Carrito** | ❌ (Desde comercio) | ✅ (Desde comercio) | No aplica en Home |

---

## 17. Loading, Empty & Error States
- **Loading:** Coordinado globalmente por la pantalla de Home / Pull-to-refresh.
- **Empty State:** `Card` con texto `"No hay productos estrella configurados actualmente."` sobre contenedor `surfaceContainerLow`.
- **Error State:** Fallback a lista vacía (`emptyList()`).

---

## 18. Mock / Fake Audit
- **Dictamen:** 🟢 **0% Mock**. Todos los registros provienen de listeners reales de Firestore.

---

## 19. Hidden Business Logic Audit (Auditoría de Lógica Oculta)
- **Línea 864:** `val starList = remember(featuredProducts) { featuredProducts }`
- **Clasificación:** 🟢 **Pure Presentation State**. No existen transformaciones financieras ni lógica de negocio oculta en el bloque UI.

---

## 20. Theme & Accessibility Audit 🎨♿
- **Theme:** `MaterialTheme.colorScheme.surface`, `surfaceContainerLow`, `outlineVariant`, `onSurface`, `onSurfaceVariant`, `primary`, `Color(0xFF0F172A)` (Título Slate 900), `Color(0xFFEF4444)` (Badge Estrella Rojo).
- **Accesibilidad:** `AsyncImage` con `contentDescription = name`.
- **Responsividad:** `LazyRow` con `PaddingValues(horizontal = 16.dp)` y espaciado de `14.dp`.

---

## 21. Dependency Graph (Grafo de Dependencias)
```
Firestore (/featuredProducts + /products + /businesses + /dashboard_config)
       │
       ▼
FirebaseManager.listenToFeaturedProducts()
       │
       ▼ Flow<List<FeaturedProduct>>
CustomerHomeViewModel (_featuredProducts / _dashboardConfig)
       │
       ▼ StateFlow.collectAsState()
CustomerHomeScreen.kt (Host Orchestrator)
       │
       └── StarProductsSection.kt (com.example.presentation.customer.home)
             ├── showFeaturedProducts: Boolean
             ├── featuredProducts: List<FeaturedProduct>
             ├── onProductClick: (businessId: String) -> Unit
             │
             └── StarProductCard.kt (com.example.presentation.customer.components)
```

---

## 22. Candidate Component API (Firma Propuesta para Fase 5E.6-B)
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
import com.example.FeaturedProduct
import com.example.presentation.customer.components.StarProductCard

@Composable
fun StarProductsSection(
    showFeaturedProducts: Boolean,
    featuredProducts: List<FeaturedProduct>,
    onProductClick: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
)
```

---

## 23. Extraction Matrix (Matriz de Decisión de Extracción)

| Elemento | ¿Extraíble? | Riesgo | Acción Propuesta |
| :--- | :---: | :---: | :--- |
| **Título y Espaciadores** | Sí | 🟢 LOW | Mover a `StarProductsSection.kt` |
| **Condición de visibilidad** | Sí | 🟢 LOW | Encapsular en `StarProductsSection.kt` |
| **Empty State Card** | Sí | 🟢 LOW | Mover a `StarProductsSection.kt` |
| **LazyRow** | Sí | 🟢 LOW | Mover a `StarProductsSection.kt` |
| **StarProductCard** | Sí | 🟢 LOW | Reutilizar dentro de `StarProductsSection.kt` |
| **Navegación al Comercio** | No | 🟡 MEDIUM | Delegar vía callback `onProductClick(star.businessId)` |
| **ViewModel State** | No | 🔴 CRITICAL | Mantener inmutable en `CustomerHomeViewModel` |
| **Firestore Listeners** | No | 🔴 CRITICAL | Mantener inmutable en `FirebaseManager` |

---

## 24. Risk Matrix & Blast Radius
- **Clasificación:** 🟢 **LOW RISK**.
- **Radio de Impacto:** Estrictamente limitado a la presentación del Home; sin efectos secundarios en transacciones, persistencia o navegación global.

---

## 25. Rollback Strategy
En caso de eventualidades durante la Fase 5E.6-B:
1. Eliminar `app/src/main/java/com/example/presentation/customer/home/StarProductsSection.kt`.
2. Restaurar las 50 líneas inline en `CustomerHomeScreen.kt` (Líneas 853–902).

---

## 26. Zero Mutation Verification
- **Archivos Modificados en `app/`:** 0
- **Archivos Nuevos en `app/`:** 0
- **Estado:** 🟢 **ZERO CODE MUTATION CONFIRMED**.

---

## 27. Final Recommendation (Recomendación Final)
### 🟢 **READY FOR EXTRACTION (CONTROLLED CALLBACK EXTRACTION)**
La sección Productos Estrella reúne todas las condiciones de pureza visual y desacoplamiento para ser extraída físicamente hacia `presentation/customer/home/StarProductsSection.kt`. La extracción reducirá ~38 líneas netas adicionales en `CustomerHomeScreen.kt`.

---

## 28. Human Approval Gate (Puerta de Aprobación Humana)
> [!IMPORTANT]
> **GATE DE SEGURIDAD OBLIGATORIO:** No se realizarán modificaciones de código ni se creará `StarProductsSection.kt` hasta contar con la aprobación y autorización expresa del usuario.
