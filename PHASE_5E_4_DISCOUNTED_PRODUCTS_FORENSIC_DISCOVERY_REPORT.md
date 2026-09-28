# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE DE ARQUITECTURA Y DESCUBRIMIENTO
## FASE 5E.4 — DISCOUNTED PRODUCTS FORENSIC DISCOVERY & EXTRACTION PLAN
### Customer App Android — Modularización Quirúrgica del Catálogo del Home

---

## 1. Executive Summary (Resumen Ejecutivo)
La **Fase 5E.4** ejecuta una radiografía forense integral y un mapeo de dependencias de la sección **Productos con Descuentos 🏷️ (Discounted Products)** en la aplicación de clientes (`CustomerHomeScreen.kt`).

La investigación se realiza bajo la estricta directiva de **`AUDIT-FIRST / ZERO CODE MUTATION`** (0 mutaciones de código Kotlin, 0 mutaciones en Firestore, 0 mutaciones en reglas de seguridad, 0 mutaciones en almacenamiento y 0 deployments).

El diagnóstico confirma que la sección consume una lista reactiva de productos reales con descuento (`StateFlow<List<FeaturedProduct>>`) sincronizada en tiempo real mediante `FirebaseManager.listenToDiscountedProducts()`, renderiza sus elementos mediante el componente modular puro `ProductPromoCard.kt`, y delega tanto la navegación al comercio (`navController.navigate`) como la adición al carrito (`CartManager.addToCart`) a nivel del Composable host.

---

## 2. Authorization (Autorización)
Esta auditoría ha sido ejecutada con base en el mandato oficial del **PROMPT MAESTRO — FASE 5E.4**, siguiendo la certificación de la **Fase 5E.3-B (Flash Deals Section Extraction)**.

---

## 3. Zero Mutation Declaration (Declaración de Cero Mutación)
Durante el desarrollo de esta fase de descubrimiento:
- 🚫 **0** archivos Kotlin modificados.
- 🚫 **0** archivos Kotlin creados (no se ha creado `DiscountedProductsSection.kt`).
- 🚫 **0** modificaciones en `firestore.rules` o `storage.rules`.
- 🚫 **0** cambios en modelos de datos (`Models.kt`).
- 🚫 **0** alteraciones en `CustomerHomeViewModel.kt`, `FirebaseManager.kt` o `CartManager.kt`.
- 🚫 **0** modificaciones en `CustomerHomeScreen.kt`.
- 🚫 **0** ejecuciones de `firebase deploy` o deployments externos.

---

## 4. Current Baseline (Línea Base Actual)
- **Fase 5.0 Inicial:** `CustomerHomeScreen.kt` = 2,601 líneas.
- **Fase 5E.3-B Certificada:** `CustomerHomeScreen.kt` = 1,183 líneas.
- **Líneas Actuales Inspeccionadas:** **1,183 líneas** en `CustomerHomeScreen.kt`.

---

## 5. Exact Code Location (Localización Forense Exacta)
En `CustomerHomeScreen.kt`:
1. **Recolección de Estado Reactivo:**
   - Línea 98:
     ```kotlin
     val discountedProducts by viewModel.discountedProducts.collectAsState()
     ```
2. **Bloque Renderizador Inline:**
   - Líneas 947–1017 (71 líneas de código):
     ```kotlin
     // 7. PRODUCTOS CON DESCUENTOS (CAMBIADO DE PRECIOS IMPERDIBLES %)
     Text(
         text = "Productos con Descuentos 🏷️",
         fontWeight = FontWeight.Bold,
         fontSize = 18.sp,
         color = Color(0xFF1E293B),
         modifier = Modifier.padding(horizontal = 16.dp)
     )
     Spacer(modifier = Modifier.height(12.dp))

     val promoItemsList = remember(discountedProducts) {
         discountedProducts
     }

     if (promoItemsList.isEmpty()) {
         Card(
             modifier = Modifier
                 .fillMaxWidth()
                 .padding(horizontal = 16.dp),
             colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
             shape = RoundedCornerShape(12.dp),
             border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
         ) {
             Text(
                 text = "No hay productos con descuentos configurados actualmente.",
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
             items(promoItemsList) { prod ->
                 val formattedPrice = "C$ ${String.format("%.2f", prod.price)}"
                 val formattedOriginalPrice = if (prod.originalPrice != null && prod.originalPrice > prod.price) {
                     "C$ ${String.format("%.2f", prod.originalPrice)}"
                 } else ""
                 val discountPct = if (prod.originalPrice != null && prod.originalPrice > prod.price && prod.originalPrice > 0.0) {
                     (((prod.originalPrice - prod.price) / prod.originalPrice) * 100).toInt()
                 } else 0
                 val discountTag = if (discountPct > 0) "-$discountPct%" else ""

                 ProductPromoCard(
                     name = prod.name,
                     price = formattedPrice,
                     originalPrice = formattedOriginalPrice,
                     imageUrl = prod.imageUrl,
                     discountTag = discountTag,
                     onClick = {
                         if (prod.businessId.isNotBlank()) {
                             navController.navigate("comercio_detalle_screen/${prod.businessId}")
                         }
                     },
                     onAddToCart = {
                         CartManager.addToCart(
                             productId = prod.productId.ifBlank { prod.id },
                             productName = prod.name,
                             price = prod.price,
                             quantity = 1,
                             businessId = prod.businessId,
                             businessName = prod.businessName
                         )
                         Toast.makeText(context, "¡${prod.name} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                     }
                 )
             }
         }
     }
     ```

---

## 6. UI Inventory (Inventario de UI)
1. **Título de Sección:**
   - Texto: `"Productos con Descuentos 🏷️"`
   - Tipografía: `FontWeight.Bold`, `18.sp`
   - Color: `Color(0xFF1E293B)` (Slate 800)
   - Padding: `16.dp` horizontal.
2. **Espaciador Superior:** `12.dp`.
3. **Estado Vacío (Empty State):**
   - Tarjeta `Card` con `surfaceContainerLow`, `RoundedCornerShape(12.dp)` y borde `outlineVariant.copy(alpha = 0.5f)`.
   - Mensaje: `"No hay productos con descuentos configurados actualmente."` con `onSurfaceVariant` a `13.sp`.
4. **Contenedor Desplazable (LazyRow):**
   - Disposición horizontal con `PaddingValues(horizontal = 16.dp)` y separación entre tarjetas de `14.dp`.
   - Itera sobre `promoItemsList` emitiendo `ProductPromoCard`.
5. **Componente de Tarjeta (`ProductPromoCard.kt`):**
   - Ancho fijo de `160.dp`, sombra de `4.dp`, esquinas redondeadas `16.dp`.
   - Imagen del producto con Coil `AsyncImage` (110.dp de alto) con fallback a gradiente azul + icono `Icons.Default.Fastfood`.
   - Badge rojo superior izquierdo `Color(0xFFFF2D55)` con el tag de porcentaje (ej: `"-20%"`).
   - Título del producto (`14.sp`, `Bold`, 1 línea con elipsis).
   - Fila de Precios: Precio actual en rojo (`14.sp`, `Black`), Precio anterior tachado en gris (`11.sp`, `LineThrough`).
   - Botón CTA: `"Agregar 🛒"` (`11.sp`, `Bold`, color `MaterialTheme.colorScheme.primary`).

---

## 7. Data Source (Fuente de Datos)
- **100% Realtime Firestore.**
- Colecciones base: `/products` (catálogo activo) y `/businesses` (nombres comerciales de comercios).

---

## 8. ViewModel Trace (Traza en CustomerHomeViewModel)
En `CustomerHomeViewModel.kt`:
- **Declaración:**
  ```kotlin
  private val _discountedProducts = MutableStateFlow<List<com.example.FeaturedProduct>>(emptyList())
  val discountedProducts: StateFlow<List<com.example.FeaturedProduct>> = _discountedProducts.asStateFlow()
  ```
- **Carga Reactiva:**
  En `listenToDashboardData()`:
  ```kotlin
  launch { fm.listenToDiscountedProducts().collect { _discountedProducts.value = it } }
  ```
- **Ciclo de Vida:** Gestionado en `viewModelScope`, se cancela automáticamente al cerrarse la pantalla o reiniciarse con `refresh()`.

---

## 9. Repository Trace (Traza en FirebaseManager)
En `FirebaseManager.kt` (Líneas 1536–1592):
```kotlin
fun listenToDiscountedProducts(): Flow<List<FeaturedProduct>> = callbackFlow {
    val realProductsMap = mutableMapOf<String, Product>()
    val businessNamesMap = mutableMapOf<String, String>()

    fun emitCombined() {
        val list = realProductsMap.values.filter { prod ->
            prod.originalPrice != null && prod.originalPrice > prod.price && prod.price > 0.0 &&
            prod.status != ProductStatus.INACTIVE && !prod.isHidden
        }.map { prod ->
            val bName = businessNamesMap[prod.businessId]?.ifBlank { null } ?: "Comercio"
            FeaturedProduct(
                id = prod.id,
                productId = prod.id,
                name = prod.name,
                price = prod.price,
                originalPrice = prod.originalPrice,
                imageUrl = prod.getMainImage(),
                rating = prod.rating,
                businessId = prod.businessId,
                businessName = bName,
                categoryName = prod.categoryName,
                isPopular = prod.isPopular
            )
        }
        trySend(list)
    }

    val lBiz = db.collection("businesses").addSnapshotListener { snapshot, _ -> ... }
    val lProducts = db.collection("products").addSnapshotListener { snapshot, _ -> ... }

    awaitClose {
        lBiz.remove()
        lProducts.remove()
    }
}
```

---

## 10. Firestore Collections (Colecciones y Reglas de Seguridad)

| Colección | Operación | Regla en `firestore.rules` | Actor |
| :--- | :--- | :--- | :--- |
| `/products` | Read | `allow read: if true;` | Público (Guest / Auth) |
| `/products` | Write | `allow write: if isAuthenticated() && (isPlatformAdmin() || isBusinessAdmin());` | Admin / Merchant |
| `/businesses` | Read | `allow read: if true;` | Público (Guest / Auth) |
| `/businesses` | Write | `allow write: if isAuthenticated() && (isPlatformAdmin() || isBusinessAdmin());` | Admin / Merchant |

---

## 11. Pricing Authority (Autoridad de Precios) 💰
- **Precio Actual:** `prod.price` (procede directamente del documento en `/products`).
- **Precio Regular Anterior:** `prod.originalPrice` (procede de `/products`).
- **Clasificación:** 🟢 **Backend-authoritative**.
- La UI únicamente formatea las cifras para presentación en pantalla (`"C$ ${String.format("%.2f", prod.price)}"`).

---

## 12. Discount Calculation Audit (Auditoría de Descuento)
- En `CustomerHomeScreen.kt` líneas 987–990 se realiza el cálculo visual del porcentaje:
  ```kotlin
  val discountPct = if (prod.originalPrice != null && prod.originalPrice > prod.price && prod.originalPrice > 0.0) {
      (((prod.originalPrice - prod.price) / prod.originalPrice) * 100).toInt()
  } else 0
  val discountTag = if (discountPct > 0) "-$discountPct%" else ""
  ```
- **Clasificación:** 🟠 **UI-calculated presentation tag**.
- **Impacto Financiero:** **Cero**. El porcentaje es solo un indicador visual (`"-$discountPct%"`). El precio real enviado al carrito es `prod.price` (Double numérico exacto provisto por el backend).

---

## 13. Product & Business Dependencies (Dependencias de Productos y Comercios)
- **Modelo de Datos:** `com.example.FeaturedProduct` (definido en `Models.kt`, línea 431).
- **Campos Utilizados:** `id`, `productId`, `name`, `price`, `originalPrice`, `imageUrl`, `businessId`, `businessName`.
- **Comportamiento si el comercio no tiene nombre:** El repositorio asigna fallback `"Comercio"`.
- **Comportamiento si `businessId` está vacío:** El clic no realiza navegación para evitar rutas inválidas.

---

## 14. Inventory & Availability Trace (Traza de Inventario y Disponibilidad)
- El repositorio `FirebaseManager` descarta proactivamente cualquier producto con:
  - `prod.status == ProductStatus.INACTIVE`
  - `prod.isHidden == true`
  - `prod.price <= 0.0`
  - `prod.originalPrice == null || prod.originalPrice <= prod.price`
- La UI solo recibe productos válidos, activos y efectivamente descontados.

---

## 15. ProductPromoCard Audit (Auditoría de ProductPromoCard)
- **Ubicación:** `app/src/main/java/com/example/presentation/customer/components/ProductPromoCard.kt` (137 líneas).
- **Pureza UI:** 🟢 **100% PURO**.
  - No accede a Firestore ni a ViewModels.
  - No invoca `CartManager` ni `NavController`.
  - Recibe parámetros de presentación y dos lambdas de acción: `onClick: () -> Unit` y `onAddToCart: () -> Unit`.

---

## 16. CartManager Dependency (Frontera Crítica de Carrito) 🛒
- **Interacción Actual:** Al hacer clic en el botón `"Agregar 🛒"` de la tarjeta, `CustomerHomeScreen.kt` ejecuta:
  ```kotlin
  onAddToCart = {
      CartManager.addToCart(
          productId = prod.productId.ifBlank { prod.id },
          productName = prod.name,
          price = prod.price,
          quantity = 1,
          businessId = prod.businessId,
          businessName = prod.businessName
      )
      Toast.makeText(context, "¡${prod.name} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
  }
  ```
- **Diseño de Aislamiento para Extracción:**
  El futuro componente `DiscountedProductsSection.kt` **NO debe contener `CartManager` ni `Toast`**.
  Debe exponer el callback:
  ```kotlin
  onAddToCart: (FeaturedProduct) -> Unit
  ```
  y `CustomerHomeScreen.kt` continuará ejecutando `CartManager.addToCart` y mostrando el `Toast`.

---

## 17. Navigation Dependency (Dependencia de Navegación) 🧭
- **Ruta Invocada:** `navController.navigate("comercio_detalle_screen/${prod.businessId}")`.
- **Diseño de Aislamiento para Extracción:**
  `DiscountedProductsSection.kt` **NO debe recibir `NavController`**.
  Expondrá el callback:
  ```kotlin
  onProductClick: (businessId: String) -> Unit
  ```
  y `CustomerHomeScreen.kt` resolverá la navegación.

---

## 18. Guest vs Authenticated Matrix (Matriz de Invitado vs Autenticado)

| Acción | Modo Guest | Modo Autenticado | Observación |
| :--- | :---: | :---: | :--- |
| **Ver productos descontados** | ✅ | ✅ | Lectura pública permitida por Firestore Rules |
| **Ver precios y descuentos** | ✅ | ✅ | Renderizado idéntico |
| **Pulsar tarjeta (abrir comercio)** | ✅ | ✅ | Navega a `comercio_detalle_screen/{id}` en modo catálogo |
| **Pulsar "Agregar 🛒"** | ✅ | ✅ | `CartManager` soporta carrito local en memoria para invitados |
| **Proceder a Checkout / Pagar** | ❌ | ✅ | El diálogo de checkout exige inicio de sesión |

---

## 19. Dashboard Feature Flag (Configuración del Dashboard)
- En `CustomerHomeScreen.kt`, la sección se renderiza de forma predeterminada como bloque continuo en el Home.
- Si `discountedProducts` está vacío, se activa automáticamente el `Empty State Card`.

---

## 20. Theme & Design System Audit (Auditoría de Tema) 🎨
- `MaterialTheme.colorScheme.surface` en `ProductPromoCard`.
- `MaterialTheme.colorScheme.surfaceContainerLow` en Empty State Card y contenedor de imagen.
- `MaterialTheme.colorScheme.onSurfaceVariant` en texto de Empty State.
- `MaterialTheme.colorScheme.primary` en botón CTA de compra.
- `Color(0xFFFF2D55)` (Rojo Carmesí) utilizado como acento visual de descuentos.
- `Color(0xFF1E293B)` (Slate 800) en título de sección.
- **Clasificación:** 🟢 **Theme Compliant**.

---

## 21. Accessibility & Responsive Audit (Accesibilidad y Plegables)
- `AsyncImage` cuenta con `contentDescription = name`.
- Botón `"Agregar 🛒"` tiene un área táctil completa de ancho 100% de la tarjeta (`fillMaxWidth()`).
- `LazyRow` con espaciado de `14.dp` y padding horizontal de `16.dp` para soporte en teléfonos y pantallas extendidas (Foldable / Tablets).

---

## 22. Mock / Fake Audit (Auditoría de Datos Falsos)
- **Resultado:** 🟢 **0% Mock**. Todos los productos y precios provienen de datos reales en Firestore (`/products` y `/businesses`).

---

## 23. Business Logic in UI (Lógica de Negocio en UI)
- **Hallazgo:** El cálculo del porcentaje `discountPct = (((originalPrice - price) / originalPrice) * 100).toInt()` y el formateo de strings residen actualmente dentro de la función inline de `CustomerHomeScreen.kt`.
- **Dictamen:** Al extraer `DiscountedProductsSection.kt`, esta lógica de formateo visual se encapsulará limpiamente dentro del nuevo archivo sin alterar la fuente de datos ni introducir mutaciones transaccionales.

---

## 24. Dependency Graph (Grafo de Dependencias)
```
CustomerHomeScreen.kt (Host Orchestrator)
 │
 ├── collects viewModel.discountedProducts
 │
 └── DiscountedProductsSection.kt (com.example.presentation.customer.home)
       ├── Input: discountedProducts: List<FeaturedProduct>
       ├── Callback: onProductClick: (businessId: String) -> Unit
       ├── Callback: onAddToCart: (product: FeaturedProduct) -> Unit
       │
       └── ProductPromoCard.kt (com.example.presentation.customer.components)
             ├── onClick -> onProductClick(prod.businessId)
             └── onAddToCart -> onAddToCart(prod)
```

---

## 25. Extraction Matrix (Matriz de Decisión de Extracción)

| Elemento | ¿Extraíble? | Nivel de Riesgo | Acción Propuesta |
| :--- | :---: | :---: | :--- |
| **Título y Espaciadores** | Sí | 🟢 LOW | Mover a `DiscountedProductsSection.kt` |
| **Empty State Card** | Sí | 🟢 LOW | Mover a `DiscountedProductsSection.kt` |
| **LazyRow** | Sí | 🟢 LOW | Mover a `DiscountedProductsSection.kt` |
| **Formateo de Precios y Tags** | Sí | 🟢 LOW | Mover a `DiscountedProductsSection.kt` |
| **ProductPromoCard** | Sí | 🟢 LOW | Utilizar dentro de `DiscountedProductsSection.kt` |
| **Navegación al Comercio** | No | 🟡 MEDIUM | Delegar vía callback `onProductClick(businessId)` |
| **Adición al Carrito (CartManager)** | No | 🟡 MEDIUM | Delegar vía callback `onAddToCart(prod)` |
| **Firestore Listener** | No | 🔴 CRITICAL | Mantener inmutable en `FirebaseManager` |
| **ViewModel StateFlow** | No | 🔴 CRITICAL | Mantener inmutable en `CustomerHomeViewModel` |

---

## 26. Risk Matrix & Blast Radius (Matriz de Riesgo y Radio de Impacto)
- **Clasificación General:** 🟢 **LOW RISK** (con callbacks controlados para Carrito y Navegación).
- **Radio de Impacto:** Limitado exclusivamente a la sección visual de `CustomerHomeScreen.kt`. No afecta la base de datos, las reglas de seguridad, el motor de búsqueda ni la persistencia del carrito.

---

## 27. Protected Baselines (Líneas Base Protegidas)
Quedan formalmente protegidos e inmutables:
- `CustomerHomeViewModel.kt`
- `FirebaseManager.kt`
- `CartManager.kt`
- `ProductPromoCard.kt`
- `Models.kt`
- `firestore.rules`
- `storage.rules`
- Componentes previamente extraídos (`HomeHeader.kt`, `ExpressDeliveryBanner.kt`, `HomeCategoriesSection.kt`, `FlashDealsSection.kt`).

---

## 28. Candidate Component API (Firma Propuesta del Componente)
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
import com.example.presentation.customer.components.ProductPromoCard

@Composable
fun DiscountedProductsSection(
    discountedProducts: List<FeaturedProduct>,
    onProductClick: (businessId: String) -> Unit,
    onAddToCart: (FeaturedProduct) -> Unit,
    modifier: Modifier = Modifier
)
```

---

## 29. Rollback Strategy (Estrategia de Rollback)
En caso de requerir reversión tras la futura Fase 5E.4-B:
1. Eliminar `app/src/main/java/com/example/presentation/customer/home/DiscountedProductsSection.kt`.
2. Restaurar las 71 líneas inline originales en `CustomerHomeScreen.kt` (Líneas 947–1017).

---

## 30. Zero Mutation Verification (Verificación de Cero Mutación)
- **Archivos Modificados en el Workspace:** **0**
- **Archivos Nuevos en `app/`:** **0**
- **Estado:** 🟢 **ZERO CODE MUTATION VERIFIED**.

---

## 31. Final Recommendation (Recomendación Final)
### 🟢 **READY FOR EXTRACTION (CONTROLLED CALLBACK EXTRACTION)**
La sección "Productos con Descuentos" está lista para ser extraída físicamente hacia `presentation/customer/home/DiscountedProductsSection.kt`. La delegación de `onProductClick` y `onAddToCart` mediante lambdas garantiza una separación limpia de responsabilidades y reduce ~60 líneas adicionales del monolito `CustomerHomeScreen.kt`.

---

## 32. Human Approval Gate (Puerta de Aprobación Humana)
> [!IMPORTANT]
> **GATE DE SEGURIDAD OBLIGATORIO:** No se realizarán mutaciones de código en `CustomerHomeScreen.kt` ni se creará `DiscountedProductsSection.kt` hasta contar con la autorización explícita del usuario tras revisar este reporte forense.
