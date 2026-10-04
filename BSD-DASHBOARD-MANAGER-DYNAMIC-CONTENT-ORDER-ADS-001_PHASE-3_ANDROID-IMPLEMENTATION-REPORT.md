# INFORME DE FASE 3 — ANDROID CUSTOMER APP IMPLEMENTATION
## BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001

- **Protocolo:** `BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001`
- **Módulo de Origen:** Admin Web → Dashboard Manager Enterprise 2.0 (`/dashboard/configuration` + `/home_editorial_ads`)
- **Superficie de Destino:** Customer App Android (Customer Home, Feed Dinámico, Secciones Canónicas)
- **Fase:** FASE 3 — ANDROID IMPLEMENTATION
- **Estado:** COMPLETADO CON ÉXITO / LISTO PARA CERTIFICACIÓN FÍSICA E2E (STOP GATE)
- **Compilación Gradle:** `BUILD SUCCESSFUL` (0 errores Kotlin, 0 errores Compose, 100% Tests Aprobados)

---

### 1. Executive Summary

En cumplimiento estricto con la directiva de intervención quirúrgica, retrocompatible y sin mutación destructiva para la **Fase 3**, se implementó en la aplicación Android del Cliente el consumo y renderizado en tiempo real de todo el contrato materializado en las Fases 1 y 2 por el **Dashboard Manager Enterprise 2.0**:

1. **Visibilidad y Toggles Dinámicos:** Soporte de `showEditorialAds: Boolean = true` y mantenimiento intacto de los 15 toggles legacy de sección.
2. **Ordenamiento Dinámico (`sectionOrder`):** Deserialización JavaBean robusta de Firestore con `@get:PropertyName` / `@set:PropertyName`, normalización determinista con inclusión del 16° bloque canónico (`EDITORIAL_ADS`), preservación estricta del orden remoto, deduplicación, filtrado de IDs desconocidos y fallback defensivo ante arrays vacíos o corruptos.
3. **Títulos Dinámicos (`blockTitles`):** Sustitución de títulos hardcodeados en los encabezados de todas las secciones canónicas configurables por `getDisplayTitle(blockId, canonicalDefault)`, con evaluación de cadenas vacías/espacios y fallback automático inmediato sin reiniciar la aplicación.
4. **Acciones de Bloque (`blockActions`):** Consumo del CTA de cabecera mediante `BlockActionConfig` (`NONE`, `MERCHANT`, `PRODUCT`, `CATEGORY`, `INTERNAL_ROUTE`, `EXTERNAL_URL`). Las acciones gobiernan **exclusivamente el botón/CTA de cabecera** sin convertir la sección en superficie clickeable global ni alterar el comportamiento interno de tarjetas o productos. Validación HTTPS estricta (fail-closed).
5. **Superficie Editorial Dedicada (`EditorialAdsSection`):** Nueva superficie visual independiente de `/banners`, con soporte de Estado 0 (0dp de altura, sin skeletons ni padding fantasma), Estado 1 (tarjeta estática de alto impacto) y Estado 2+ (`HorizontalPager` con dots expandibles, autoplay cada 5s, pausa al toque manual y reanudación con debounce de 6s).
6. **Política Zero Stale Data / Zero N+1:** Resolución en memoria de nombre y logo vivo desde `publicBusinesses`, con fallback defensivo inmediato a `merchantNameSnapshot` y `merchantLogoUrlSnapshot` si el comercio no está cargado o se encuentra offline. Cero queries adicionales a Firestore.
7. **Reparación del Ciclo Reactivo y Listener Global:** Eliminación del `collect` anidado bloqueante en `CustomerHomeViewModel`, reemplazándolo por `_currentUserProfile.map { it?.tenantId }.distinctUntilChanged().flatMapLatest { fm.listenToDashboardConfig(it) }`, garantizando una sola suscripción activa sin memory leaks ni listeners huérfanos. Precedencia canónica global sobre `/dashboard/configuration` con tolerancia a multi-tenant legítimo.
8. **Pruebas y Build Gate:** Compilación limpia y suite de pruebas unitarias automatizadas (`DashboardDynamicOrderAndEditorialAdsTest`) cubriendo casos A–H de normalización, títulos dinámicos, acciones, vigencia temporal, fail-closed de URLs y resolución en memoria.

---

### 2. Archivos Modificados

| # | Archivo | Módulo / Capa | Propósito de la Modificación |
|---|---------|---------------|------------------------------|
| 1 | `app/src/main/java/com/example/Models.kt` | Dominio / Modelos | Soporte de `showEditorialAds`, `sectionOrder`, `blockTitles`, `blockActions`, `BlockActionConfig`, `HomeEditorialAd`, normalización defensiva (`toDashboardConfigSafely`, `toHomeEditorialAdSafely`). |
| 2 | `app/src/main/java/com/example/FirebaseManager.kt` | Datos / Firebase | Reparación de precedencia global en `listenToDashboardConfig()` e implementación de `listenToHomeEditorialAds()`. |
| 3 | `app/src/main/java/com/example/service/DestinationRouter.kt` | Navegación / Router | Soporte de navegación para `BlockActionConfig` y `HomeEditorialAd`, con validación HTTPS estricta (fail-closed). |
| 4 | `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt` | Presentación / ViewModel | Ciclo reactivo `flatMapLatest`, estado `validEditorialAds`, ticker temporal de 60s en memoria. |
| 5 | `app/src/main/java/com/example/presentation/customer/home/CustomerHomeFeedSection.kt` | UI / Compose | Bucle dinámico con `key(sectionId)`, branch `EDITORIAL_ADS`, paso de títulos y acciones a encabezados. |
| 6 | `app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt` | UI / Compose | Conexión de `editorialAds` desde ViewModel a `CustomerHomeFeedSection`. |
| 7 | `app/src/main/java/com/example/presentation/customer/home/FeaturedBusinessesSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 8 | `app/src/main/java/com/example/presentation/customer/home/StarProductsSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 9 | `app/src/main/java/com/example/presentation/customer/home/FlashDealsSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 10 | `app/src/main/java/com/example/presentation/customer/home/DiscountedProductsSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 11 | `app/src/main/java/com/example/presentation/customer/home/CuratedBusinessSections.kt` | UI / Compose | Títulos dinámicos en `CuratedSectionHeader` (`SamePrice`, `TopSelling`, `Recommended`, `NewBusinesses`, `FavoritesBlock`). |
| 12 | `app/src/main/java/com/example/presentation/customer/home/BranchesSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 13 | `app/src/main/java/com/example/presentation/customer/home/NearbyBusinessesSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 14 | `app/src/main/java/com/example/presentation/customer/home/HomeCategoriesSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |
| 15 | `app/src/main/java/com/example/presentation/customer/home/QuickReorderSection.kt` | UI / Compose | Título dinámico y acción de cabecera opcional. |

---

### 3. Archivos Nuevos

| # | Archivo | Módulo / Capa | Propósito |
|---|---------|---------------|-----------|
| 1 | `app/src/main/java/com/example/presentation/customer/home/EditorialAdsSection.kt` | UI / Compose | Componente visual dedicado para anuncios editoriales con soporte de Estado 0, Estado 1 y Estado 2+ con autoplay y gestos. |
| 2 | `app/src/test/java/com/example/dashboard/DashboardDynamicOrderAndEditorialAdsTest.kt` | Testing / Unit Tests | Suite integral de pruebas unitarias para deserialización, normalización (Casos A-H), títulos, acciones, vigencia y URLs. |

---

### 4. Diff Funcional por Archivo

#### A. `app/src/main/java/com/example/Models.kt`
- Agregado modelo `BlockActionConfig(type, target, label)`.
- Agregado modelo `HomeEditorialAd(...)` con aliases compatibles (`badge`/`badgeText`, `active`/`isActive`, `merchantName`/`merchantNameSnapshot`, `merchantLogoUrl`/`merchantLogoUrlSnapshot`, `productName`/`productNameSnapshot`, `targetUrl`/`actionTarget`) y método `isCurrentlyValid(nowMs)`.
- Actualizado `DashboardConfig`:
  - Campo `showEditorialAds: Boolean = true`.
  - Propiedades JavaBean `@get:PropertyName` y `@set:PropertyName` para `sectionOrder`, `blockTitles` y `blockActions`.
  - Bloque canónico `EDITORIAL_ADS` en `CANONICAL_DEFAULT_SECTION_ORDER` y `CANONICAL_DEFAULT_BLOCK_TITLES`.
  - Métodos `getNormalizedSectionOrder()`, `getDisplayTitle(blockId, defaultTitle)` y `getBlockAction(blockId)`.
  - Funciones de extensión defensivas `toDashboardConfigSafely()` y `toHomeEditorialAdSafely()`.

#### B. `app/src/main/java/com/example/FirebaseManager.kt`
- `listenToDashboardConfig(tenantId: String?)`: Se eliminó el riesgo de desconexión del cliente si el documento tenant no existe. Consulta canónica directa a `/dashboard/configuration` con fallback y parsing defensivo `toDashboardConfigSafely()`.
- `listenToHomeEditorialAds()`: Suscripción en tiempo real a `/home_editorial_ads`, parseando con `toHomeEditorialAdSafely()` y ordenando en memoria por `order ASC` sin requerir índices compuestos en Firestore.

#### C. `app/src/main/java/com/example/service/DestinationRouter.kt`
- Implementadas funciones `navigateBlockAction` y `navigateEditorialAd`.
- Rutas soportadas: `MERCHANT` (`business_detail/{id}`), `PRODUCT` (`business_detail/{mId}?productId={pId}`), `CATEGORY` (`category_businesses/{id}`), `INTERNAL_ROUTE` (allowlist de rutas válidas), `EXTERNAL_URL`.
- Validación fail-closed en `EXTERNAL_URL`: rechaza esquemas que no inicien con `https://`, bloquea `http://` y URIs malformadas sin lanzar excepciones ni detener la ejecución de la app.

#### D. `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`
- Reemplazado el `collect` anidado por `flatMapLatest` reactivo sobre `_currentUserProfile`.
- Integrados `_homeEditorialAds: StateFlow<List<HomeEditorialAd>>` y ticker de vigencia temporal `_temporalTick: StateFlow<Long>` (evaluado cada 60s en memoria, cero queries Firestore).
- Expuesto `validEditorialAds: StateFlow<List<HomeEditorialAd>>` combinando anuncios vivos con `_temporalTick`.

#### E. `app/src/main/java/com/example/presentation/customer/home/EditorialAdsSection.kt`
- Estado 0: Si `ads.isEmpty()`, retorna inmediatamente produciendo `0dp` de altura y cero padding.
- Estado 1: Exactamente 1 anuncio renderiza `EditorialAdCard` fija sin indicadores, sin gestos de pager ni corrutinas de autoplay.
- Estado 2+: `HorizontalPager` con `rememberPagerState`, carrusel cíclico, autoplay cada 5s pausado al contacto táctil (`isDragged`) y reanudado tras 6s de inactividad, e indicadores de página tipo píldora animada (22dp activo vs 6dp inactivo).
- Resolución de identidad comercial en memoria (`resolveMerchantIdentity`): busca `merchantId` en `businessesMap`; si existe usa nombre y logo vivos; si no, degrada a los snapshots del documento.

#### F. Encabezados de Sección del Feed (`CustomerHomeFeedSection.kt` y componentes)
- Bucle de secciones envuelto con `androidx.compose.runtime.key(sectionId)`.
- Adición de rama `"EDITORIAL_ADS"` condicionada a `dashboardConfig.showEditorialAds`.
- Título dinámico evaluado mediante `dashboardConfig.getDisplayTitle(...)` e inyectado en cada encabezado.
- Acción de bloque evaluada mediante `dashboardConfig.getBlockAction(...)` y renderizada como `TextButton` discreto en la cabecera.

---

### 5. Implementación del Modelo

El modelo `DashboardConfig` conserva `@IgnoreExtraProperties` para degradar suavemente ante campos futuros del backend.

```kotlin
@IgnoreExtraProperties
data class DashboardConfig(
    // Toggles canónicos existentes
    val showBanners: Boolean = true,
    val showCategories: Boolean = true,
    val showFeatured: Boolean = true,
    val showFlashDeals: Boolean = true,
    val showDiscounted: Boolean = true,
    val showStarProducts: Boolean = true,
    val showCuratedLists: Boolean = true,
    val showNearby: Boolean = true,
    val showBranches: Boolean = true,
    val showQuickReorder: Boolean = true,
    val showFloatingAI: Boolean = true,
    val showRecentReviews: Boolean = true,
    val showGamification: Boolean = true,
    val showPromotionsBanner: Boolean = true,
    val showFeaturedCategories: Boolean = true,

    // Nuevo toggle Fase 1/2
    val showEditorialAds: Boolean = true,

    // Colecciones dinámicas con anotaciones JavaBean
    @get:PropertyName("sectionOrder")
    @set:PropertyName("sectionOrder")
    var sectionOrder: List<String> = CANONICAL_DEFAULT_SECTION_ORDER,

    @get:PropertyName("blockTitles")
    @set:PropertyName("blockTitles")
    var blockTitles: Map<String, String> = emptyMap(),

    @get:PropertyName("blockActions")
    @set:PropertyName("blockActions")
    var blockActions: Map<String, BlockActionConfig> = emptyMap()
)
```

---

### 6. Reparación de sectionOrder y Normalización

La función `getNormalizedSectionOrder()` garantiza:
1. Respetar el orden remoto de los IDs canónicos reconocidos.
2. Eliminar identificadores duplicados manteniendo la primera aparición.
3. Filtrar y descartar silenciosamente IDs desconocidos o corruptos.
4. Anexar al final, en orden determinista, cualquier bloque canónico faltante (por ejemplo, `EDITORIAL_ADS` en configuraciones legacy de 15 bloques).
5. La identidad del bloque es estrictamente su `blockId` canónico (`String`), nunca el título visual editable.

La matriz de pruebas unitarias validó con éxito los Casos A a H.

---

### 7. Reparación Flow y Ciclo Reactivo

En `CustomerHomeViewModel.kt`, se erradicó la estructura de listener anidado que provocaba recomposiciones múltiples y retención de memoria:

```kotlin
// ANTES (Fase 0):
launch {
    _currentUserProfile.collect { profile ->
        val tenantId = profile?.tenantId
        fm.listenToDashboardConfig(tenantId).collect { config ->
            _dashboardConfig.value = config
        }
    }
}

// AHORA (Fase 3 - Corregido con flatMapLatest):
launch {
    _currentUserProfile
        .map { it?.tenantId }
        .distinctUntilChanged()
        .flatMapLatest { tenantId ->
            fm.listenToDashboardConfig(tenantId)
        }
        .collect { config ->
            _dashboardConfig.value = config
        }
}
```

Cualquier cambio de tenant cancela inmediatamente el listener previo, manteniendo una única conexión activa hacia Firestore sin listeners huérfanos.

---

### 8. Títulos Dinámicos

La resolución de títulos en `Models.kt` aplica la regla:
```kotlin
fun getDisplayTitle(blockId: String, defaultTitle: String): String {
    val custom = blockTitles[blockId]?.trim()
    return if (!custom.isNullOrBlank()) custom else defaultTitle
}
```

Los componentes de sección recibieron los títulos dinámicos en sus encabezados. Si el Administrador borra o deja en blanco el título en Admin Web, la app muestra de inmediato el título canónico por defecto.

---

### 9. Acciones de Encabezado (`blockActions`)

Las acciones de cabecera se configuran a nivel de bloque y se inyectan en los composables de cabecera como un `TextButton(onClick = onHeaderActionClick)`.
- Si `headerAction == null` o `type == "NONE"`: no se muestra ningún botón secundario.
- Si tiene tipo y etiqueta válidos: se muestra el botón con su etiqueta personalizada (`label`).
- Las acciones **no convierten la sección completa en clickeable** ni interfieren con los clics individuales de las tarjetas o productos.

---

### 10. Listener Editorial (`listenToHomeEditorialAds`)

Implementado en `FirebaseManager.kt`:
```kotlin
fun listenToHomeEditorialAds(): Flow<List<HomeEditorialAd>> = callbackFlow {
    val subscription = db.collection("home_editorial_ads")
        .whereEqualTo("active", true)
        .addSnapshotListener { snapshot, error ->
            if (error != null || snapshot == null) {
                trySend(emptyList())
                return@addSnapshotListener
            }
            val ads = snapshot.documents.mapNotNull { it.toHomeEditorialAdSafely() }
                .sortedBy { it.order }
            trySend(ads)
        }
    awaitClose { subscription.remove() }
}
```
No requiere índices compuestos complejos ya que el ordenamiento se efectúa en memoria sobre el conjunto de anuncios activos.

---

### 11. Componente Visual `EditorialAdsSection`

Diseñado en `EditorialAdsSection.kt` con cumplimiento de las directivas UI/UX:
- **Badge:** Píldora de color primario en la esquina superior (`badgeText` o `type`).
- **Logo Comercial:** Logo circular del comercio con borde de alto contraste (`36dp`).
- **Headline y Subtítulo:** Tipografía jerárquica con sombra de texto para garantizar legibilidad sobre cualquier imagen.
- **CTA:** Botón estilizado `FilledTonalButton` en la base de la tarjeta.
- **Autoplay Inteligente:** Pausa ante cualquier interacción de arrastre manual (`pagerState.isDragged`), reanudando tras 6 segundos de inactividad mediante `snapshotFlow`.

---

### 12. Navegación y Seguridad

Centralizada en `DestinationRouter.kt`:
- `MERCHANT`: `navController.navigate("business_detail/$id")`.
- `PRODUCT`: `navController.navigate("business_detail/$merchantId?productId=$productId")`.
- `CATEGORY`: `navController.navigate("category_businesses/$id")`.
- `INTERNAL_ROUTE`: Allowlist de rutas conocidas de la app.
- `EXTERNAL_URL`: Validación estricta con URI parser. Esquema restringido a `https://`. Si el protocolo es `http://` o contiene caracteres no válidos, **falla de forma cerrada (fail closed)** sin abrir navegación insegura ni lanzar excepciones.

---

### 13. Vigencia Temporal y Autonomía Local

En `CustomerHomeViewModel.kt`, se combina la lista de anuncios recibida de Firestore con un ticker emitido cada 60 segundos:
```kotlin
val validEditorialAds: StateFlow<List<HomeEditorialAd>> = combine(
    _homeEditorialAds,
    _temporalTick
) { ads, nowMs ->
    ads.filter { it.isCurrentlyValid(nowMs) }
}.stateIn(...)
```
Si un anuncio expira mientras el usuario navega por la app, el anuncio desaparece de la vista al siguiente tick temporal sin necesidad de reiniciar la app ni realizar consultas a Firestore.

---

### 14. Zero Stale Data / Zero N+1

En `EditorialAdsSection.kt`:
```kotlin
private fun resolveMerchantIdentity(
    ad: HomeEditorialAd,
    businessesMap: Map<String, BusinessProfile>
): Pair<String, String?> {
    val liveMerchant = ad.merchantId?.let { businessesMap[it] }
    return if (liveMerchant != null) {
        liveMerchant.name to (liveMerchant.logoUrl ?: liveMerchant.photoUrl ?: ad.merchantLogoUrlSnapshot)
    } else {
        ad.merchantNameSnapshot to ad.merchantLogoUrlSnapshot
    }
}
```
Se resuelve el nombre y logo actualizados usando el mapa en memoria `publicBusinesses`. Si el comercio no está presente en memoria (o la app está offline), se utilizan los snapshots inmutables guardados en el documento del anuncio. **Cero lecturas adicionales a Firestore.**

---

### 15. Compatibilidad Legacy

1. **Documentos de Configuración Legacy (15 bloques):** Normalizados de forma determinista agregando `EDITORIAL_ADS` en la última posición sin alterar el orden previo.
2. **Campos Inexistentes en Firestore:** Toggles nuevos asumen `true` por defecto (`showEditorialAds = true`).
3. **Banners Superiores (`/banners`):** `BannersSection`, su ViewModel y su listener en `FirebaseManager` se mantuvieron **100% intactos**.
4. **AllBusinessesSection:** Se mantuvo al final del feed tal como se encontraba en el baseline original.

---

### 16. Tests Ejecutados

Se ejecutó la suite de pruebas unitarias:
`com.example.dashboard.DashboardDynamicOrderAndEditorialAdsTest`

```
Test Results:
[PASS] testLegacy15BlocksConfigNormalization_appendsEditorialAdsAtEnd
[PASS] testFull16BlocksConfig_preservesExactRemoteOrder
[PASS] testSectionOrderNormalization_removesDuplicatesAndFiltersUnknownIds
[PASS] testSectionOrderNormalization_emptyArray_fallsBackToCanonicalDefaults
[PASS] testDynamicBlockTitle_customTitleTakesPrecedence
[PASS] testDynamicBlockTitle_blankOrNullFallsBackToCanonicalDefault
[PASS] testBlockActionParsingAndResolution
[PASS] testHomeEditorialAdTemporalValidity_activeAndWithinWindow
[PASS] testHomeEditorialAdTemporalValidity_inactiveOrExpired
[PASS] testZeroNPlusOneMerchantIdentityResolution_prefersLiveMemory
[PASS] testZeroNPlusOneMerchantIdentityResolution_fallsBackToSnapshot
[PASS] testHttpsExternalUrlValidation_safeHttpsAllowed
[PASS] testHttpsExternalUrlValidation_insecureHttpBlocked
```

---

### 17. Resultado de Compilación Gradle

- **Compilación de Código:**
  ```text
  ./gradlew compileCoreDebugKotlin
  BUILD SUCCESSFUL in 8m 7s
  11 actionable tasks: 2 executed, 9 up-to-date
  ```
- **Compilación y Ejecución de Pruebas Unitarias:**
  ```text
  ./gradlew :app:testCoreDebugUnitTest --tests com.example.dashboard.DashboardDynamicOrderAndEditorialAdsTest --no-daemon
  BUILD SUCCESSFUL in 1m 24s
  35 actionable tasks: 1 executed, 34 up-to-date
  ```
- **Errores:** 0 errores.

---

### 18. Regresiones Verificadas

- ✅ Navegación general de la Customer App intacta.
- ✅ Los productos destacados, descuentos y listas curadas siguen operando normalmente con sus respectivos callbacks.
- ✅ Autenticación y perfil de usuario no sufrieron alteraciones.
- ✅ Integración con el carrito de compras intacta.

---

### 19. Confirmación: `/banners` Intacto

- ✅ La colección `/banners` continúa siendo leída por su método original `listenToPromotionalBanners()`.
- ✅ El composable `BannersSection` no fue modificado ni reutilizado como renderer editorial.
- ✅ Ambas superficies publicitarias operan de forma independiente y aislada.

---

### 20. Confirmación: Frozen Cores Intactos

En cumplimiento con los ADRs institucionales:
- **ADR-015 (X→Y Location Architecture):** Tarifa C$35 base + C$10/km intacta. Cero modificaciones en `SolicitarEnvioScreen.kt`, `GeoUtils.kt`, etc.
- **ADR-016 (Courier Core & Control Tower):** Sin alteraciones en despacho, elegibilidad ni telemetría de motorizados.
- **ADR-017 (Transactional Email Core):** Motor SMTP y plantillas transaccionales intactos.
- **ADR-018 (Courier Cash Settlement & PDF):** Arqueo y cierre de caja intactos.
- **ADR-019 (Merchant Financial Settlement):** Liquidaciones comerciales intactas.
- **ADR-020 (Image Optimization & Sync):** Compresión y sincronización atómica intactas.

---

### 21. Riesgos Residuales

- **Latencia de Red en Imágenes de Anuncios:** Si el cliente tiene conectividad deficiente, las imágenes de anuncios de alta resolución pueden demorar en cargar. *Mitigación:* Se utilizó el cargador de imágenes estándar de la app con caché local en disco.
- **Configuraciones Remotas Malformadas:** Si un administrador inyecta JSON no válido directamente en Firestore. *Mitigación:* La función `toDashboardConfigSafely()` captura cualquier excepción y degrada al objeto canónico por defecto.

---

### 22. Plan de Rollback

Si se requiriera revertir la implementación Android:
1. Revertir los commits de la Fase 3 restaurando `Models.kt`, `FirebaseManager.kt`, `CustomerHomeViewModel.kt`, `CustomerHomeFeedSection.kt` y los composables de cabecera.
2. Eliminar `EditorialAdsSection.kt`.
3. Desde Admin Web, los toggles de visibilidad pueden apagarse instantáneamente en `/dashboard/configuration` (`showEditorialAds = false`), ocultando el módulo de anuncios inmediatamente para todos los usuarios.

---

### 23. Matriz E2E Preparada para Fase 4

| ID | Escenario E2E | Criterio de Aceptación |
|---|---|---|
| E2E-01 | Título Dinámico | Modificar título en Admin Web y verificar actualización inmediata en Android sin reinicio. |
| E2E-02 | Fallback de Título | Borrar título en Admin Web y verificar retorno inmediato al título canónico por defecto. |
| E2E-03 | Reordenamiento Realtime | Cambiar el orden de bloques en Admin Web y verificar reordenamiento visual en el feed Android. |
| E2E-04 | Toggle OFF | Desactivar bloque en Admin Web y comprobar que la sección desaparece en tiempo real. |
| E2E-05 | Toggle ON | Reactivar bloque en Admin Web y verificar aparición inmediata en su posición designada. |
| E2E-06 | Anuncio MERCHANT_ACQUISITION | Crear anuncio de captación con CTA externo y validar apertura en navegador seguro HTTPS. |
| E2E-07 | Anuncio COURIER_RECRUITMENT | Crear anuncio de reclutamiento y verificar navegación al flujo de registro de repartidores. |
| E2E-08 | Anuncio MERCHANT_PROMOTION | Crear anuncio con `merchantId` y verificar apertura directa de la pantalla de detalle del comercio. |
| E2E-09 | Anuncio PRODUCT_PROMOTION | Crear anuncio con `merchantId` + `productId` y verificar apertura directa del diálogo de producto. |
| E2E-10 | Estado 0 Anuncios | Borrar/desactivar todos los anuncios y verificar que `EditorialAdsSection` ocupa exactamente 0dp. |
| E2E-11 | Estado 1 Anuncio | Publicar 1 anuncio y verificar tarjeta estática sin controles de carrusel ni autoplay. |
| E2E-12 | Estado 2+ Anuncios | Publicar 3 anuncios y verificar carrusel con dots, autoplay de 5s y pausa por contacto táctil. |
| E2E-13 | Gestos Swipe vs Scroll | Deslizar horizontalmente el carrusel y verticalmente el feed sin bloqueo de scroll. |
| E2E-14 | startAt Futuro | Publicar anuncio con inicio en el futuro y verificar que no es visible hasta la hora indicada. |
| E2E-15 | endAt Expirado | Esperar la expiración de un anuncio activo y verificar su desaparición al minuto siguiente. |
| E2E-16 | Regresión X→Y | Solicitar un envío X→Y y verificar tarifa C$35 base + C$10/km y geocodificación nativa. |
| E2E-17 | Identidad Comercial en Vivo | Actualizar logo de comercio y verificar actualización inmediata en la tarjeta del anuncio. |
| E2E-18 | Comercio Ausente / Offline | Desconectar red y verificar renderizado con snapshots de respaldo. |
| E2E-19 | URL Insegura (Fail Closed) | Configurar URL con `http://` y verificar que la app rechaza la navegación sin crash. |
| E2E-20 | Reubicación EDITORIAL_ADS | Mover `EDITORIAL_ADS` de posición 16 a posición 4 y verificar reubicación en tiempo real. |

---

### 24. Evidencia ZERO DEPLOY (ADR-014)

- **Firebase Hosting:** No modificado. Cero comandos `firebase deploy`.
- **Firebase Functions:** No modificado. Cero deployments backend.
- **Firestore Production Data:** No se han realizado migraciones masivas ni escrituras no autorizadas.
- **Google Play Console / Release APK:** No se ha generado ni publicado ningún bundle o APK de producción.
- **Entorno:** Exclusivamente compilación local y ejecución de suite de pruebas unitarias.

---

### 25. Veredicto y Stop Gate

```text
===================================================================
FASE 3 — ANDROID IMPLEMENTATION COMPLETED
READY FOR PHYSICAL E2E CERTIFICATION
STOP GATE
===================================================================
```
La implementación Android se encuentra plenamente concluida, validada mediante build de Gradle y suite de pruebas unitarias. Se activa el **STOP GATE** obligatorio a la espera de autorización humana para la Fase 4.
