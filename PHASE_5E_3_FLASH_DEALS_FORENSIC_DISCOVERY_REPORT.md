# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE DE ARQUITECTURA Y DESCUBRIMIENTO
## FASE 5E.3 — FLASH DEALS SECTION FORENSIC DISCOVERY & EXTRACTION PLAN
### Customer App Android — Modularización Quirúrgica del Home

---

## 1. Executive Summary (Resumen Ejecutivo)
La **Fase 5E.3** establece el diagnóstico forense exhaustivo, el mapeo de dependencias de datos y la delimitación de fronteras de negocio de la sección **Ofertas Flash ⚡ (Flash Deals)** en la aplicación de clientes (`CustomerHomeScreen.kt`).

Esta auditoría se ejecuta bajo la directiva estricta de **`ZERO CODE MUTATION`** (0 mutaciones en código Kotlin, 0 mutaciones en reglas de seguridad de Firestore, 0 mutaciones en ViewModels y 0 mutaciones en repositorios/servicios). 

El descubrimiento demuestra que la sección Flash Deals es una sección visualmente rica pero arquitectónicamente limpia y desacoplada: consume un flujo de datos reactivo multi-colección consolidado por `FirebaseManager`, delega el renderizado individual al componente puro pre-extraído `FlashDealCard.kt` y gestiona la navegación al detalle del comercio asociado (`comercio_detalle_screen/{businessId}`) sin mutaciones transaccionales ni lógica de carrito inline.

---

## 2. Authorization (Autorización)
Esta auditoría ha sido ejecutada con base en el mandato oficial del **PROMPT MAESTRO — FASE 5E.3**, siguiendo la finalización y certificación exitosa de la **Fase 5E.2 (Home Categories Section Extraction)**.

---

## 3. Zero Mutation Declaration (Declaración de Cero Mutación)
Durante el desarrollo de esta fase de descubrimiento:
- 🚫 **0** archivos Kotlin modificados.
- 🚫 **0** archivos Kotlin creados.
- 🚫 **0** modificaciones en `firestore.rules` o `storage.rules`.
- 🚫 **0** cambios en modelos de datos (`Models.kt`).
- 🚫 **0** alteraciones en `CustomerHomeViewModel.kt` o `FirebaseManager.kt`.
- 🚫 **0** modificaciones en `CustomerHomeScreen.kt`.

---

## 4. Current Baseline (Línea Base Actual)
- **Archivo Principal:** `app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt`
- **Total de Líneas Actuales:** **1,070 líneas** (Post-Fase 5E.2).
- **Componentes de Sección Extraídos en `presentation/customer/home/`:**
  - `HomeHeader.kt` (Fase 5E.1)
  - `ExpressDeliveryBanner.kt` (Fase 5E.1)
  - `HomeCategoriesSection.kt` (Fase 5E.2)
- **Componente Card Extraído en `presentation/customer/components/`:**
  - `FlashDealCard.kt` (Fase 5A — 79 líneas, 100% puro).

---

## 5. Flash Deals Location (Localización Forense Exacta)
En `CustomerHomeScreen.kt`:
1. **Recolección de Estado Reactivo:**
   - Línea 95:
     ```kotlin
     val flashDeals by viewModel.flashDeals.collectAsState()
     ```
2. **Bloque Renderizador Inline:**
   - Líneas 784–832 (49 líneas de código):
     ```kotlin
     // 6. OFERTAS FLASH ⚡ (SPRINT 15)
     if (dashboardConfig.showFlashDeals) {
         Text(
             text = "Ofertas Flash ⚡ (Tiempo Limitado)",
             fontWeight = FontWeight.ExtraBold,
             fontSize = 18.sp,
             color = Color(0xFFD97706),
             modifier = Modifier.padding(horizontal = 16.dp)
         )
         Spacer(modifier = Modifier.height(10.dp))

         val dealsList = remember(flashDeals) {
             flashDeals
         }

         if (dealsList.isEmpty()) {
             Card(
                 modifier = Modifier
                     .fillMaxWidth()
                     .padding(horizontal = 16.dp),
                 colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                 shape = RoundedCornerShape(12.dp),
                 border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
             ) {
                 Text(
                     text = "No hay ofertas flash activas en este momento.",
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
                 items(dealsList) { deal ->
                     FlashDealCard(
                         title = deal.title,
                         discountTag = deal.discountTag,
                         price = deal.price,
                         originalPrice = deal.originalPrice,
                         onClick = { navController.navigate("comercio_detalle_screen/${deal.businessId}") }
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
Firestore (/flashDeals, /products, /businesses, /dashboard_config)
       │
       ▼ Realtime Listeners & Temporal Filtering
FirebaseManager.listenToFlashDeals()
       │
       ▼ Flow<List<FlashDeal>>
CustomerHomeViewModel (_flashDeals / flashDeals)
       │
       ▼ StateFlow.collectAsState()
CustomerHomeScreen.kt (Líneas 784-832)
       ├── Dashboard Feature Flag Check: dashboardConfig.showFlashDeals
       ├── Empty State Card (si dealsList.isEmpty())
       └── LazyRow (Horizontally scrollable)
              └── FlashDealCard (presentation/customer/components/FlashDealCard.kt)
                     └── onClick -> NavController.navigate("comercio_detalle_screen/{deal.businessId}")
```

---

## 7. UI Inventory (Inventario de UI)
1. **Header de Sección:**
   - Título: `"Ofertas Flash ⚡ (Tiempo Limitado)"`
   - Tipografía: `FontWeight.ExtraBold`, `18.sp`
   - Color: `Color(0xFFD97706)` (Ámbar intenso / Flash Accent)
   - Padding: `16.dp` horizontal.
2. **Estado Vacío (Empty State):**
   - Tarjeta contenedora `Card` con `surfaceContainerLow` y borde sutil `outlineVariant.copy(alpha = 0.5f)`.
   - Mensaje: `"No hay ofertas flash activas en este momento."` con `onSurfaceVariant` a `13.sp`.
3. **Lista de Ofertas (Active LazyRow):**
   - Disposición horizontal con `PaddingValues(horizontal = 16.dp)` y separación entre tarjetas de `14.dp`.
   - Itera sobre `dealsList` emitiendo `FlashDealCard`.
4. **Espaciadores:**
   - Superior al contenido: `10.dp`.
   - Inferior a la siguiente sección: `20.dp`.

---

## 8. Data Source (Fuente de Datos)
La fuente de datos es **100% Real y Canónica** en Firestore:
- **Colección Base:** `/flashDeals`
- **Colecciones de Enriquecimiento en Vivo:** `/products` y `/businesses`.
- **Colección de Configuración del Dashboard:** `/dashboard_config` (campo `showFlashDeals`).

---

## 9. Firestore Trace (Traza Forense de Firestore)
- **Colección:** `/flashDeals`
- **Document Schema (`FlashDeal`):**
  - `id`: `String` (ID del documento)
  - `title`: `String` (Título de la oferta)
  - `discountTag`: `String` (Etiqueta ej. `"-40% OFF"`)
  - `productName`: `String` (Nombre del producto vinculado)
  - `price`: `Double` (Precio flash promocional en Córdobas)
  - `originalPrice`: `Double` (Precio regular original)
  - `businessId`: `String` (ID del comercio emisor)
  - `businessName`: `String` (Nombre comercial)
  - `imageUrl`: `String` (URL de la imagen del producto/oferta)
  - `expiresAtMinutes`: `Int` (Minutos de duración máxima desde creación)
  - `productId`: `String` (ID del producto en `/products`)
  - `active`: `Boolean` (Flag maestro de activación)
  - `startAt`: `Timestamp?` (Fecha/hora de inicio de la oferta)
  - `endAt`: `Timestamp?` (Fecha/hora de finalización de la oferta)
  - `createdAt`: `Timestamp?` (Momento de registro)
- **Security Rules (`firestore.rules` Líneas 647-650):**
  ```
  match /flashDeals/{docId} {
    allow read: if true;
    allow write: if isAuthenticated() && (isPlatformAdmin() || isBusinessAdmin());
  }
  ```

---

## 10. Repository Trace (Traza del Repositorio)
`FirebaseManager.kt` implementa `listenToFlashDeals(): Flow<List<FlashDeal>>` (Líneas 1419–1534):
- Establece listeners concurrentes en `/flashDeals`, `/products` y `/businesses`.
- **Filtro de Expiración y Vigencia:**
  1. `if (!deal.active) return@forEach`
  2. `if (deal.startAt != null && startAt.time > nowMs) return@forEach` (No iniciada)
  3. `if (deal.endAt != null && endAt.time < nowMs) return@forEach` (Finalizada)
  4. `if (deal.expiresAtMinutes > 0 && createdAt + duration < nowMs) return@forEach` (Expirada por temporizador)
- **Sincronización de Disponibilidad:**
  - Valida el producto vinculado en `/products`: descarta si `liveProd.status == ProductStatus.INACTIVE` o `liveProd.isHidden == true`.
- **Cálculo de Precios y Tags:**
  - Si el producto real tiene precios dinámicos, recalcula `discountTag` como `-$pct%`.

---

## 11. ViewModel Trace (Traza del ViewModel)
`CustomerHomeViewModel.kt`:
- Declara:
  ```kotlin
  private val _flashDeals = MutableStateFlow<List<com.example.FlashDeal>>(emptyList())
  val flashDeals: StateFlow<List<com.example.FlashDeal>> = _flashDeals.asStateFlow()
  ```
- En `listenToDashboardData()`:
  ```kotlin
  launch { fm.listenToFlashDeals().collect { _flashDeals.value = it } }
  ```
- Ciclo de Vida: Vinculado a `viewModelScope`, se cancela automáticamente al destruirse la pantalla o refrescarse vía `refresh()`.

---

## 12. State Ownership (Propiedad del Estado)
- **Estado de Datos:** Propiedad de `CustomerHomeViewModel` (`flashDeals`).
- **Estado de Visibilidad:** Propiedad de `CustomerHomeViewModel` (`dashboardConfig.showFlashDeals`).
- **Estado UI Local:** `CustomerHomeScreen.kt` utiliza `val dealsList = remember(flashDeals) { flashDeals }`.
- **Conclusión:** El futuro componente `FlashDealsSection.kt` no poseerá ningún estado mutable interno; será un consumidor pasivo.

---

## 13. Pricing Trace (Traza de Precios)
- **Fuente Canónica:** `FlashDeal.price` (Precio de Oferta) y `FlashDeal.originalPrice` (Precio Regular).
- **Formateo Visual:** Ejecutado en `FlashDealCard.kt`:
  - `"C$ ${String.format("%.0f", price)}"`
  - `"C$ ${String.format("%.0f", originalPrice)}"` (con tachado `LineThrough`).
- **Integridad Financiera:** La UI no calcula precios de cobro; únicamente formatea números enteros provistos autoritativamente por el backend/repositorio.

---

## 14. Discount Trace (Traza de Descuentos)
- **Cálculo:** Realizado en `FirebaseManager.kt` (`-$pct%`) con fallback a `deal.discountTag`.
- **Renderizado:** Badge rectangular con bordes redondeados (`RoundedCornerShape(6.dp)`) sobre fondo ámbar `Color(0xFFD97706)`.
- **Clasificación:** 🟢 **backend-authoritative / repository-calculated**. La UI no contiene lógica matemática de descuento.

---

## 15. Availability Trace (Traza de Disponibilidad e Inventario)
- Las ofertas inactivas o vinculadas a productos ocultos/inactivos son filtradas en el repositorio antes de llegar a la UI.
- Si no hay ofertas disponibles, se activa el `Empty State Card`.

---

## 16. Expiration Trace (Traza de Expiración)
- El descarte de ofertas vencidas se realiza en tiempo real en la función combinadora de `FirebaseManager.listenToFlashDeals()`.
- La UI no mantiene timers activos ni hilos en segundo plano.

---

## 17. FlashDealCard Dependency (Dependencia de FlashDealCard)
- **Ubicación:** `app/src/main/java/com/example/presentation/customer/components/FlashDealCard.kt`
- **Líneas:** 79 líneas.
- **Firma:**
  ```kotlin
  @Composable
  fun FlashDealCard(
      title: String,
      discountTag: String,
      price: Double,
      originalPrice: Double,
      onClick: () -> Unit
  )
  ```
- **Evaluación de Pureza:** 🟢 **100% PURO**.
  - No contiene llamadas a Firestore ni a ViewModels.
  - No accede a `CartManager` ni a `NavController`.
  - Recibe primitivos (`String`, `Double`) y una lambda (`() -> Unit`).

---

## 18. CartManager Dependency (Dependencia de CartManager)
- **Hallazgo Crítico:** La interacción actual de Flash Deals **NO agrega productos directamente al carrito**. Al hacer clic sobre una tarjeta, se navega hacia la pantalla de detalle del comercio (`comercio_detalle_screen/{businessId}`), donde el cliente selecciona las opciones del producto y añade al carrito a través del flujo formal con validación de inventario y personalización.
- **Riesgo:** 🟢 **LOW RISK** (Sin cruce de frontera de carrito en esta sección).

---

## 19. Navigation Dependency (Dependencia de Navegación)
- **Ruta invocada:** `navController.navigate("comercio_detalle_screen/${deal.businessId}")`
- **Frontera:** El futuro componente `FlashDealsSection` no debe recibir `NavController`. En su lugar, emitirá el callback:
  ```kotlin
  onDealClick: (FlashDeal) -> Unit  // o onDealClick: (businessId: String) -> Unit
  ```
  y `CustomerHomeScreen` ejecutará la navegación.

---

## 20. Guest vs Authenticated Behavior (Comportamiento Guest vs Autenticado)
- **Invitado (Guest):** Puede ver las ofertas flash (`allow read: if true` en Firestore Rules) y al pulsar sobre una oferta puede navegar al comercio en modo catálogo.
- **Autenticado:** Mismo comportamiento de visualización y navegación al comercio.

---

## 21. Theme Audit (Auditoría de Tema y Colores)
- `MaterialTheme.colorScheme.surface` utilizado en `FlashDealCard`.
- `MaterialTheme.colorScheme.surfaceContainerLow` utilizado en la tarjeta de Empty State.
- `MaterialTheme.colorScheme.onSurfaceVariant` utilizado en el texto de Empty State.
- `MaterialTheme.colorScheme.primary` utilizado en el precio destacado.
- `Color(0xFFD97706)` (Ámbar 600) utilizado para el acento temático de ofertas relámpago ⚡.
- **Conclusión:** Compatible con Material 3 y Modo Oscuro nativo.

---

## 22. Image / Storage Audit (Auditoría de Imágenes)
- `FlashDealCard.kt` actualmente renderiza un layout compacto de tipografía + badges de descuento sin carga asíncrona de imagen (diseño de alta densidad para ofertas rápidas de texto y precio).
- El modelo `FlashDeal` transporta `imageUrl` para compatibilidad futura sin penalizar el rendimiento actual.

---

## 23. Accessibility Audit (Auditoría de Accesibilidad)
- Los textos respetan contrastes visuales adecuados en fondos claros y oscuros.
- El touch target de `FlashDealCard` cubre los 170.dp de ancho de la tarjeta completa.

---

## 24. Foldable / Responsive Audit (Auditoría de Pantallas Plegables)
- Utiliza `LazyRow` con `contentPadding = PaddingValues(horizontal = 16.dp)`, permitiendo desplazamiento fluido y visualización multitarjeta en pantallas extendidas (ej. Galaxy Z Fold 5 en modo desplegado y tablets).

---

## 25. Mock / Fake Detection (Detección de Datos Falsos)
- **Resultado:** 🟢 **0% Mock**. No existen llamadas a `loadMockDefaults()` ni datos hardcodeados en el flujo de Flash Deals. Todos los datos provienen de Firestore `/flashDeals` y `/products`.

---

## 26. Model Dependency Audit (Auditoría de Modelos)
- **Modelo Oficial:** `com.example.FlashDeal` (definido en `app/src/main/java/com/example/Models.kt`, línea 447).
- No existen modelos duplicados para este propósito en la capa de presentación.

---

## 27. Dependency Graph (Grafo de Dependencias)
```
FlashDealsSection (Candidato a Extracción)
  ├── Input: showFlashDeals (Boolean)
  ├── Input: flashDeals (List<FlashDeal>)
  ├── Callback: onDealClick ((businessId: String) -> Unit)
  │
  └── Dependencias UI Internas:
        ├── Text (Material 3)
        ├── Card (Material 3)
        ├── LazyRow (Compose Foundation)
        └── FlashDealCard (com.example.presentation.customer.components.FlashDealCard)
```

---

## 28. Dependency Matrix (Matriz de Dependencias y Riesgo)

| Elemento | Dependencia | Tipo | Nivel de Riesgo |
| :--- | :--- | :--- | :--- |
| **Flash Deals UI** | `CustomerHomeScreen` | Layout / Compose | 🟢 LOW |
| **FlashDealCard** | `components/FlashDealCard.kt` | UI Reusable | 🟢 LOW |
| **Pricing** | `FirebaseManager` (Readonly) | Autoritativo Backend | 🟢 LOW |
| **Cart** | N/A (Navega a comercio) | Desacoplado | 🟢 LOW |
| **FlashDeal Model** | `Models.kt` | Entidad de Datos | 🟢 LOW |
| **Firestore** | `/flashDeals` vía VM | Backend Persistente | 🟢 LOW |
| **Navigation** | `NavController` | Host Callback | 🟢 LOW |

---

## 29. Extraction Matrix (Matriz de Decisión de Extracción)

| Elemento | ¿Extraíble? | Riesgo | Acción Propuesta |
| :--- | :--- | :--- | :--- |
| **Título de Sección** | Sí | 🟢 LOW | Mover a `FlashDealsSection.kt` |
| **Empty State Card** | Sí | 🟢 LOW | Mover a `FlashDealsSection.kt` |
| **LazyRow** | Sí | 🟢 LOW | Mover a `FlashDealsSection.kt` |
| **Invocación FlashDealCard** | Sí | 🟢 LOW | Mover a `FlashDealsSection.kt` |
| **Navegación directa** | No | 🟡 MEDIUM | Delegar vía callback `onDealClick(businessId)` |
| **Firestore Listeners** | No | 🔴 CRITICAL | Mantener en `FirebaseManager` / `ViewModel` |
| **Feature Flag Flag Check** | Sí | 🟢 LOW | Pasar como parámetro `showFlashDeals: Boolean` |

---

## 30. Risk Matrix & Blast Radius (Matriz de Riesgo y Radio de Impacto)
- **Clasificación General:** 🟢 **LOW RISK**
- **Justificación:** La sección de Flash Deals es un consumidor unidireccional de datos con navegación simple hacia la pantalla de comercio. No contiene mutaciones transaccionales, no maneja cálculos de cupones, no modifica el estado del carrito ni realiza mutaciones sobre Firestore.

---

## 31. Protected Baselines (Líneas Base Protegidas)
Quedan formalmente protegidos e inmutables:
- `CustomerHomeViewModel.kt`
- `FirebaseManager.kt`
- `Models.kt`
- `FlashDealCard.kt`
- `firestore.rules`
- `CartManager.kt`
- Módulos extraídos previamente (`HomeHeader.kt`, `ExpressDeliveryBanner.kt`, `HomeCategoriesSection.kt`).

---

## 32. Proposed Architecture (Arquitectura Propuesta para Fase 5E.3-B)
```
CustomerHomeScreen.kt (Host Orchestrator)
       │
       ▼ Invoca
FlashDealsSection.kt (com.example.presentation.customer.home)
       │
       ▼ Itera
FlashDealCard.kt (com.example.presentation.customer.components)
```

---

## 33. Proposed Component API (Firma Propuesta del Nuevo Componente)
```kotlin
package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.FlashDeal
import com.example.presentation.customer.components.FlashDealCard

@Composable
fun FlashDealsSection(
    showFlashDeals: Boolean,
    flashDeals: List<FlashDeal>,
    onDealClick: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
)
```

---

## 34. Rollback Strategy (Estrategia de Rollback)
En caso de cualquier anomalía detectada durante la eventual fase de extracción (Fase 5E.3-B):
1. Eliminar el archivo `presentation/customer/home/FlashDealsSection.kt`.
2. Restaurar las 49 líneas inline de `CustomerHomeScreen.kt` (Líneas 784–832).
3. Tiempo de recuperación estimado: **< 1 minuto**.

---

## 35. Git Diff Audit (Auditoría de Cero Mutación de Código)
- **Archivos Modificados en `app/src/main/java/`:** 0
- **Archivos Modificados en `rules/`:** 0
- **Archivos Nuevos en `app/`:** 0
- **Estado:** 🟢 **ZERO CODE MUTATION VERIFIED**.

---

## 36. Final Recommendation (Recomendación Final)
### 🟢 **READY FOR EXTRACTION**
La sección de Ofertas Flash (`FlashDealsSection`) cumple con todos los criterios de pureza de presentación, aislamiento de estado y modularidad arquitectónica. Su extracción física hacia `presentation/customer/home/FlashDealsSection.kt` es 100% segura y reducirá aproximadamente 45 líneas del monolito `CustomerHomeScreen.kt`.

---

## 37. Human Approval Gate (Puerta de Aprobación Humana)
> [!IMPORTANT]
> **GATE DE SEGURIDAD OBLIGATORIO:** No se realizarán mutaciones de código en `CustomerHomeScreen.kt` ni se creará `FlashDealsSection.kt` hasta contar con la autorización explícita del usuario tras revisar este reporte forense.
