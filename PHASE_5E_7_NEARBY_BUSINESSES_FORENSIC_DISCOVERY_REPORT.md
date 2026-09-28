# PHASE 5E.7 — NEARBY BUSINESSES & SECONDARY DISCOVERY SECTIONS FORENSIC DISCOVERY REPORT
**BlueSystem Delivery v2.2 Enterprise — Mobile Android Customer Experience**  
**Fecha:** 2026-08-24  
**Investigador / Auditor:** Senior Developer & Auditor de BlueSystem  
**Estado:** 🟢 DISCOVERY COMPLETE (Zero Mutation Confirmed)

---

## 1. Executive Summary

En cumplimiento estricto con el protocolo de ingeniería, la **Fase 5E.7** ejecutó una auditoría forense exhaustiva y de solo lectura (*Zero Mutation Protocol*) sobre las secciones de **Comercios Cercanos ("Comercios Cerca de Ti")** y los **Mecanismos de Descubrimiento Secundario (Descubrimiento por Categorías y Búsqueda Global)** dentro del archivo central [`CustomerHomeScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt).

El análisis determinó que:
1. La sección principal de "Comercios Cerca de Ti" se compone de un encabezado tipográfico M3 y un `LazyRow` horizontal que renderiza tarjetas reutilizables [`PublicBusinessCard`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/components/PublicBusinessCard.kt).
2. Los datos provienen del flujo en tiempo real `/businesses` emitido por [`FirebaseManager.listenToPublicCatalogBusinesses()`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L1097-L1135) y expuesto por [`CustomerHomeViewModel.publicBusinesses`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt#L58-L59).
3. No existen solicitudes invasivas de permisos de ubicación en tiempo de ejecución (`ACCESS_FINE_LOCATION`) dentro de la pantalla Home para renderizar Comercios Cercanos; la ubicación se extrae de forma pasiva a través de la dirección predeterminada del usuario (`defaultAddressDoc`).
4. Existe lógica derivada de filtrado y ordenamiento en Compose (`sortedPublicBusinesses`, `filteredPublicBusinesses`, `filteredProductsForCategory`), la cual procesa la dualidad de categorías de tipo `PRODUCT` vs `BUSINESS`.
5. La sección principal de Comercios Cercanos es completamente desacoplable y de **BAJO RIESGO (LOW RISK)** para su extracción en la Fase 5E.7-B.

---

## 2. Authorization & Scope

* **Fase Activa:** FASE 5E.7 — NEARBY BUSINESSES & SECONDARY DISCOVERY SECTIONS FORENSIC DISCOVERY.
* **Fase Futura (NO autorizada en esta etapa):** FASE 5E.7-B — NEARBY BUSINESSES & SECONDARY DISCOVERY SECTION EXTRACTION.
* **Alcance:** Exclusivamente diagnóstico forense, trazabilidad de datos, auditoría de dependencias, análisis GPS/geográfico y formulación de matriz de extracción.

---

## 3. Zero Mutation Declaration

Durante la ejecución de la Fase 5E.7 se ha mantenido invariabilidad absoluta en todos los componentes del sistema:
* **Código Fuente Android:** 0 mutaciones (0 líneas modificadas en [`CustomerHomeScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt) u otros archivos).
* **Componentes UI Creados:** 0 (No se creó `NearbyBusinessesSection.kt`).
* **Firestore Data:** 0 mutaciones / 0 escrituras.
* **Firestore Security Rules:** 0 mutaciones (`firestore.rules` intacto).
* **Storage Rules:** 0 mutaciones (`storage.rules` intacto).
* **Despliegues / Migraciones:** 0 ejecuciones.

---

## 4. Current Baseline Architecture

El tab principal (Home) de [`CustomerHomeScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt) organiza sus secciones dentro de un `PullToRefreshBox` con `Column(Modifier.verticalScroll(rememberScrollState()))`:

```
CustomerHomeScreen
 ├── 1. TopBar & HomeHeader (Certificado 5E.1)
 ├── 2. BannersSection (Dinámico Firestore)
 ├── 3. HomeCategoriesSection (Certificado 5E.2)
 ├── 4. CONDICIONAL DE DESCUBRIMIENTO & COMERCIOS CERCANOS:
 │    ├── if (searchQueryText.isNotBlank()) -> Global Search Engine View
 │    ├── else if (selectedCategoryFilter.isNotBlank()) ->
 │    │     ├── if (isProductCategoryDomain) -> Product Category Discovery View
 │    │     └── else -> Business Category Discovery View
 │    └── else -> "Comercios Cerca de Ti 🏢" (LazyRow de PublicBusinessCard)
 ├── 5. FeaturedBusinessesSection (Certificado 5E.5B)
 ├── 6. StarProductsSection (Certificado 5E.6B)
 ├── 7. FlashDealsSection (Certificado 5E.3B)
 ├── 8. DiscountedProductsSection (Certificado 5E.4B)
 └── 9. ExpressDeliveryBanner (Certificado 5E.1)
```

---

## 5. Exact Code Location in `CustomerHomeScreen.kt`

### A. Recolección de Estado y Derivación de Datos
* **Líneas 94-99:** Recolección de `publicBusinesses`, `branches`, `defaultAddressDoc`.
* **Líneas 173-176:** Extracción de coordenadas de cliente (`customerLat`, `customerLng`, `hasCustomerLocation`).
* **Líneas 179-188:** `sortedPublicBusinesses` (Ordenamiento por proximidad GPS).
* **Líneas 191-204:** `isProductCategoryDomain` (Clasificación de categoría PRODUCT vs BUSINESS).
* **Líneas 207-227:** `filteredProductsForCategory` (Filtrado de productos según categoría seleccionada).
* **Líneas 230-282:** `filteredPublicBusinesses` (Filtrado de comercios por texto de búsqueda, slug de categoría y correlación de productos).

### B. Bloque UI: "Comercios Cerca de Ti" (Home Base)
* **Línea de Inicio:** Línea 805 (`Text("Comercios Cerca de Ti 🏢", ...)`)
* **Línea de Fin:** Línea 838 (`Spacer(modifier = Modifier.height(20.dp))`)
* **Estructura Interna:**
  ```kotlin
  Text(text = "Comercios Cerca de Ti 🏢", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 16.dp))
  Spacer(modifier = Modifier.height(10.dp))
  if (filteredPublicBusinesses.isEmpty()) {
      Text(text = "No hay comercios disponibles en este momento.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 16.dp))
  } else {
      LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
          items(filteredPublicBusinesses) { business ->
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
  ```

### C. Bloque UI: Descubrimiento Secundario por Categoría
* **Dominio PRODUCT (Líneas 627-763):** Header con conteo + Columna vertical de `ProductCard` + LazyRow horizontal secundario de comercios disponibles que venden dicha categoría (`PublicBusinessCard`).
* **Dominio BUSINESS (Líneas 764-803):** Header con conteo + LazyRow horizontal de `PublicBusinessCard`.

---

## 6. UI Inventory & Cards

| Componente | Tipo | Entidad Consumida | Click Action | Favorito Action | Carrito Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Header Cercanos** | Text | N/A | N/A | N/A | N/A |
| **PublicBusinessCard** | Card M3 | `BusinessInfo` | Navega a `comercio_detalle_screen/{id}` | `viewModel.toggleFavorite(id)` | N/A |
| **ProductCard (Categorías)** | Card M3 | `Product` | Navega a `comercio_detalle_screen/{businessId}` | N/A | `CartManager.addToCart(...)` / `decrementQuantity` |
| **GlobalSearchResultItemCard** | Card M3 | `CustomerSearchResultItem` | Navega a `comercio_detalle_screen/{bizId}` | N/A | `CartManager.addToCart(...)` (si es producto/combo) |

---

## 7. GPS & Location Forensic Audit

| Parámetro | Hallazgo Forense |
| :--- | :--- |
| **Tipo de Ubicación** | Ubicación pasiva guardada en la dirección por defecto del cliente (`defaultAddressDoc`). |
| **Origen Coordenadas** | `defaultAddressDoc?.latitude` y `defaultAddressDoc?.longitude` desde Firestore `/users/{uid}/addresses`. |
| **Solicitud de Permisos en Home** | **NINGUNA**. No se invoca `rememberLauncherForActivityResult` para `ACCESS_FINE_LOCATION` dentro de `CustomerHomeScreen.kt` para renderizar comercios. |
| **Dónde se piden permisos** | En [`AddressManagerScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/AddressManagerScreen.kt#L804-L809) y flujos operativos de motorizado. |
| **Comportamiento si no hay GPS** | `hasCustomerLocation = false`; la lista se muestra sin ordenamiento y con tarifa base de delivery ($40 vs $35). |
| **Cálculo de Distancia** | Actualmente estático/orientativo (`4.8` km en línea 184). No hay cómputo trigonométrico pesado en UI. |

---

## 8. Business vs Branch Forensic

* **Entidad Mostrada:** `BusinessInfo` (perteneciente a la colección raíz `/businesses`).
* **Entidad de Coordenadas:** Las coordenadas de entrega son del usuario; los comercios tienen dirección de texto (`getEffectiveAddress()`).
* **Sucursales (`BranchItem`):** El ViewModel recolecta `_branches` desde `/branches`, pero la UI de Comercios Cercanos y Categorías en el Home opera a nivel `BusinessInfo` (un comercio raíz). La selección de sucursal específica ocurre en la pantalla de detalle del comercio o al agregar productos al carrito con contexto de sucursal.

---

## 9. Availability / Open-Closed Status Forensic

* **Cálculo:** `business.getEffectiveIsOpen()`, evaluando `isOpen && abierto`.
* **Badge Visual en Card:**
  * `ABIERTO 🟢` (Fondo verde `#10B981`)
  * `CERRADO 🔴` (Fondo gris `#64748B`)
* **Comportamiento Operativo:** Un comercio cerrado continúa visible en el carrusel de Comercios Cercanos y permite navegación al catálogo para consulta, preservando la experiencia de descubrimiento.

---

## 10. Favorites & Cart Forensic

* **Favoritos:**
  * Estado: `val favoriteIds by viewModel.favoriteIds.collectAsState()` (Set de String IDs).
  * Persistencia: `/users/{uid}/favorites/{businessId}` gestionado por `CustomerHomeViewModel.toggleFavorite()`.
  * UI: `PublicBusinessCard` recibe `isFavorite = favoriteIds.contains(business.id)` y emite callback `onToggleFavorite`.
  * **Aislamiento:** La UI no toca Firestore directamente.
* **Carrito en "Comercios Cerca de Ti":**
  * **ZERO CART DEPENDENCY:** Las tarjetas de comercios cercanos no agregan ítems directamente al carrito; su única acción es navegación al detalle del comercio.

---

## 11. Firestore & Security Rules Audit

### Trazabilidad de Colecciones
| Colección | Operación | Fuente | Propósito |
| :--- | :--- | :--- | :--- |
| `/businesses` | Read (Cache + Snapshot) | `FirebaseManager.listenToPublicCatalogBusinesses()` | Lista de comercios activos con catálogo público. |
| `/users/{uid}/addresses` | Read (Snapshot) | `CustomerHomeViewModel.addressesListener` | Dirección predeterminada y coordenadas del cliente. |
| `/users/{uid}/favorites` | Read / Write | `CustomerHomeViewModel.favoritesListener` | Marcadores de comercios favoritos del usuario. |
| `/dashboard_config` | Read (Snapshot) | `FirebaseManager.listenToDashboardConfig()` | Flags de visibilidad de secciones. |

### Auditoría de `firestore.rules`
* **`/businesses/{businessId}`:** `allow read: if true;` (Acceso público para e-Commerce marketplace).
* **`/users/{uid}/favorites/{doc}`:** `allow read, write: if isAuthenticated() && currentUid() == uid;`.
* **`/users/{uid}/addresses/{addressId}`:** `allow read, write: if isAuthenticated() && currentUid() == uid;`.
* **Veredicto:** 100% de cumplimiento. Cero mutaciones de reglas requeridas.

---

## 12. Guest vs Authenticated Matrix

| Acción | Guest | Authenticated | Observación |
| :--- | :---: | :---: | :--- |
| **Ver Comercios Cerca de Ti** | ✅ Permitido | ✅ Permitido | Catálogo 100% público. |
| **Filtrar por Categoría** | ✅ Permitido | ✅ Permitido | Funciona en memoria local. |
| **Buscar Globalmente** | ✅ Permitido | ✅ Permitido | Ejecutado por `EnterpriseSearchEngine`. |
| **Navegar a Detalle de Comercio** | ✅ Permitido | ✅ Permitido | Ruta pública `comercio_detalle_screen/{id}`. |
| **Toggle Favorito** | ❌ Redirige | ✅ Permitido | Guest no tiene UID en Firestore. |
| **Agregar Producto a Carrito** | ❌ Redirige a Login | ✅ Permitido | Protegido en diálogo y cards. |
| **Checkout / Pedido** | ❌ Redirige a Login | ✅ Permitido | Requiere autenticación y dirección. |

---

## 13. Accessibility, Responsive & Foldable Audit

* **Accesibilidad:** `PublicBusinessCard` cuenta con `contentDescription` en imágenes y badges con alto contraste.
* **Touch Targets:** Botón de favorito de 32dp con área táctil cómoda.
* **Diseño Responsivo:** Las tarjetas tienen ancho fijo de `240.dp` dentro de un `LazyRow` con espaciado horizontal de `14.dp` y padding de `16.dp`, lo que garantiza un desplazamiento fluido tanto en dispositivos estándar como en pantallas anchas y plegables (Galaxy Z Fold 5).

---

## 14. Extraction Decision Matrix

| Elemento | Extraíble | Riesgo | Destino Recomendado | Razón Técnica |
| :--- | :---: | :---: | :--- | :--- |
| **Header "Comercios Cerca de Ti"** | ✅ Sí | 🟢 LOW | `NearbyBusinessesSection.kt` | UI pura / Material 3. |
| **LazyRow Comercios Cercanos** | ✅ Sí | 🟢 LOW | `NearbyBusinessesSection.kt` | Renderiza `PublicBusinessCard` con callbacks puros. |
| **Estado Vacío ("No hay comercios")** | ✅ Sí | 🟢 LOW | `NearbyBusinessesSection.kt` | Presentación pura. |
| **PublicBusinessCard** | ❌ No | 🟢 LOW | Componente compartido existente | Ya modularizado en `components/PublicBusinessCard.kt`. |
| **Cálculo de Categoría PRODUCT/BIZ** | ⚠️ Opcional | 🟡 MEDIUM | `CustomerHomeScreen.kt` o Helper | Lógica de enrutamiento visual según categoría seleccionada. |
| **EnterpriseSearchEngine** | ❌ No | 🔴 HIGH | Dominio / ViewModel | Pertenece a la capa de inteligencia. |
| **Listeners Firestore / ViewModel** | ❌ No | 🔴 HIGH | `CustomerHomeViewModel` | Inmutable según ADR-003. |

---

## 15. Candidate Architecture (Propuesta para Fase 5E.7-B)

```
com.example.presentation.customer.home/
 ├── HomeHeader.kt                    (Fase 5E.1)
 ├── HomeCategoriesSection.kt         (Fase 5E.2)
 ├── FlashDealsSection.kt             (Fase 5E.3B)
 ├── DiscountedProductsSection.kt     (Fase 5E.4B)
 ├── FeaturedBusinessesSection.kt     (Fase 5E.5B)
 ├── StarProductsSection.kt           (Fase 5E.6B)
 ├── ExpressDeliveryBanner.kt         (Fase 5E.1)
 └── [CANDIDATO 5E.7-B] NearbyBusinessesSection.kt
```

### Firma Candidata del Componente:
```kotlin
package com.example.presentation.customer.home

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.data.repository.BusinessInfo

@Composable
fun NearbyBusinessesSection(
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
)
```

---

## 16. Blast Radius & Protected Baselines

### Blast Radius Estimado
* **Archivos Afectados en Extracción (5E.7-B):**
  1. `CustomerHomeScreen.kt` (Reemplazo de líneas 805-838 por `NearbyBusinessesSection(...)`).
  2. `NearbyBusinessesSection.kt` (Nuevo archivo en paquete `com.example.presentation.customer.home`).
* **Impacto en Otros Módulos:** **0%** (Cero impacto en Pedidos, Repartidor, Comercio, Admin, Auth, Firestore).

### Módulos Estrictamente Blindados (Inmutables)
* `CustomerHomeViewModel.kt`
* `FirebaseManager.kt`
* `BusinessRepository.kt`
* `CartManager.kt`
* `Models.kt`
* `PublicBusinessCard.kt`
* `firestore.rules`
* `storage.rules`

---

## 17. Final Recommendation & Human Approval Gate

```
============================================================
FASE 5E.7 — NEARBY BUSINESSES FORENSIC DISCOVERY
============================================================

STATUS:
🟢 DISCOVERY COMPLETE

Code Mutation:
0

Firestore Mutation:
0

Rules Mutation:
0

Storage Mutation:
0

Deploy:
0

Candidate Component:
NOT CREATED (Awaiting Phase 5E.7-B Authorization)

Risk Classification:
🟢 LOW (Nearby Businesses Carousel)
🟡 MEDIUM (Secondary Category Discovery View)

Extraction Recommendation:
READY FOR EXTRACTION (FASE 5E.7-B)

Human Approval:
REQUIRED
============================================================
END OF FASE 5E.7
============================================================
```
