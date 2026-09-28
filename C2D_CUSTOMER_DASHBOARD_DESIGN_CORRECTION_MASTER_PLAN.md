# BLUE SYSTEM DELIVERY ENTERPRISE
# C2D — CUSTOMER DASHBOARD DESIGN & CORRECTION MASTER PLAN
## DISEÑO TÉCNICO, CORRECCIÓN, GOBERNANZA, ANTI-DUPLICACIÓN Y CERTIFICACIÓN E2E

**Protocolo:** `BSD-C2D-CUSTOMER-DASHBOARD-DESIGN-CORRECTION-001`  
**Nombre Oficial:** C2D — Diseño, Corrección y Gobernanza del Customer Dashboard  
**Tipo de Actividad:** DESIGN / ARCHITECTURE / CORRECTION PLANNING  
**Modo:** AUDIT-FIRST / READ-ONLY / ZERO CODE MUTATION / ZERO DB MUTATION / ZERO DEPLOYMENT  
**Fecha:** 2026-09-07  
**Auditor & Diseñador Principal:** Senior Developer & Auditor de BlueSystem v2.1 Enterprise  
**Estado:** 🟢 **MASTER PLAN FINALIZED / READY FOR HUMAN REVIEW**

---

## 01. Executive Decision

La auditoría forense integral (`CUSTOMER_DASHBOARD_BLOCKS_FORENSIC_AUDIT_REPORT.md`) evidenció que el Customer Dashboard de BlueSystem Delivery Enterprise cuenta con una sólida base cartográfica y de despacho logístico (C28/C29), pero sufre de una **fragmentación crítica entre el catálogo administrativo, las reglas de Firestore, la semántica de datos en memoria y la gobernanza de servicios transversales como X→Y Delivery**.

### Decisiones Estratégicas Clave:
1. **Gobernanza Híbrida de X→Y (Capacidad + Feed):** Se aprueba formalmente la **Arquitectura Híbrida**. `X_TO_Y_DELIVERY` se mantiene como Módulo de Capacidad de Plataforma en el Gatekeeper (Nivel Servicio), pero se integra formalmente en el contrato canónico del feed (`EXPRESS_DELIVERY` en `CANONICAL_DEFAULT_SECTION_ORDER`) para otorgar al Admin Panel control total sobre su visibilidad y orden vertical en la Home, separando tajantemente `serviceEnabled` de `homeVisible`.
2. **Implementación Integral de `QUICK_REORDER`:** Se rechaza la eliminación de `QUICK_REORDER`. Se diseñará el componente reactivo `QuickReorderSection.kt` con validación estricta de 7 capas (existencia de comercio, disponibilidad horaria, catálogo activo, stock, precio actual, variantes y reconstrucción atómica de carrito en `CartManager`).
3. **Saneamiento Inmediato de Seguridad en Analíticas:** Se diseña la regla canónica de Firestore para `/dashboardAnalytics/{docId}` que desbloquea la telemetría del dispositivo móvil sin abrir brechas de seguridad (restringiendo a contadores atómicos incrementales `views`, `clicks`, `orders` y validación de tipos).
4. **Eliminación de Falsas Promesas Comerciales (Semántica Real):** Se prohíbe el uso de heurísticas engañosas en memoria (`isOpen && isVerified` como "Mismo Precio", `rating` como "Más Vendidos", `isFeatured` como "Recomendados", y `.reversed()` como "Nuevos"). Se definen esquemas de datos autoritativos en base de datos.
5. **Motor de Anti-Duplicación (Anti-Jank & Anti-Fatigue):** Se introduce el `DashboardDeduplicationEngine` con prioridad decreciente para limitar la aparición de un mismo comercio a un máximo de 2 secciones en el scroll vertical.
6. **Aislamiento y Blindaje Absoluto:** Ningún componente certificado de la flota Courier (ADR-016), torre de control (ADR-013), cotizador nativo Haversine (ADR-015) o conciliación de caja (ADR-018) será mutado durante la ejecución de las correcciones del Home.

---

## 02. Audit Input

El presente plan toma como entrada irrefutable los diagnósticos documentados en `CUSTOMER_DASHBOARD_BLOCKS_FORENSIC_AUDIT_REPORT.md`:

- **Contrato Canónico:** 14 bloques declarados en `Models.kt:751`.
- **Bloque Fantasma:** `QUICK_REORDER` omitido en el `when (sectionId)` de `CustomerHomeFeedSection.kt:52-229`.
- **X→Y Desacoplado:** `ExpressDeliveryBanner` renderizado de forma estática fuera del feed dinámico (`CustomerHomeFeedSection.kt:231-236`) sin toggle en `dashboardManager.js`.
- **Bloqueo Silencioso de Analíticas:** `/dashboardAnalytics` rechazado con `PERMISSION_DENIED` en runtime por omisión de regla en `firestore.rules:1331`.
- **Deriva Semántica Cuádruple:** `SAME_PRICE` (línea 30), `TOP_SELLING` (línea 72), `RECOMMENDED` (línea 114) y `NEW_BUSINESSES` (línea 157) operan sobre transformaciones artificiales en memoria en `CuratedBusinessSections.kt`.
- **Caché Desconectada:** `DashboardCacheManager.kt` no posee referencias en el proyecto.
- **Alcance Multi-Tenant Ausente:** `/dashboard/configuration` es 100% global, bloqueando la personalización por tenant o marca white-label.

---

## 03. Current Architecture

```mermaid
flowchart TD
    subgraph Admin_Web [Panel Admin Web]
        DM[dashboardManager.js]
    end

    subgraph Firestore_DB [Cloud Firestore]
        ConfigDoc[dashboard/configuration (GLOBAL)]
        BannersColl[/banners]
        BranchesColl[/branches]
        FeaturedColl[/featuredProducts]
        FlashColl[/flashDeals]
        BizColl[/businesses]
        AnalyticsColl[/dashboardAnalytics - BLOCKED]
    end

    subgraph Customer_Android [App Android Cliente]
        FM[FirebaseManager.kt]
        VM[CustomerHomeViewModel.kt]
        Screen[CustomerHomeScreen.kt]
        Feed[CustomerHomeFeedSection.kt]
        Engine[NearbyMerchantEngine.kt]
        Curated[CuratedBusinessSections.kt]
        Express[ExpressDeliveryBanner.kt - FIXED]
        AllBiz[AllBusinessesSection.kt - FIXED]
    end

    DM -->|setDoc merge| ConfigDoc
    ConfigDoc -->|SnapshotListener| FM
    FM -->|listenToDashboardConfig| VM
    VM --> Screen
    Screen --> Feed
    Feed -->|when sectionId| Curated
    Feed -->|when sectionId| Engine
    Feed -.->|MISSING BRANCH| QR[QUICK_REORDER: NO RENDERER]
    Feed --> Express
    Feed --> AllBiz
```

---

## 04. Root Causes

1. **Causa Raíz de X→Y:** Se desarrolló de forma modular independiente (ADR-015) para resolver la logística punto a punto del Courier (C28/C29). Al integrarse en el Customer Home, se colocó como un banner de llamada a la acción visual rápido sin actualizar el contrato canónico de `DashboardConfig` ni el JavaScript del Admin Panel.
2. **Causa Raíz de `QUICK_REORDER`:** Se diseñó el contrato de datos en el Sprint 15, pero la implementación de la UI de reconstrucción de órdenes complejas requería validación de menú y stock; la tarea quedó inconclusa y se omitió la rama en el `when` para evitar pantallas en blanco, dejando el contrato huérfano.
3. **Causa Raíz de `/dashboardAnalytics`:** Se creó la clase cliente `DashboardAnalyticsTracker` durante la optimización de métricas, pero se omitió registrar la cláusula `match /dashboardAnalytics/{docId}` en `firestore.rules`.
4. **Causa Raíz de Deriva Semántica:** Falta de agregaciones determinísticas en backend. Para no penalizar lecturas de Firestore con queries N+1, se recurrió a filtros rápidos en memoria sobre la lista general de comercios (`publicBusinesses`).

---

## 05. Architectural Principles

1. **Inviolabilidad de Módulos Congelados (Zero Regresión):** Ningún cambio en el Customer Dashboard puede afectar el ciclo de órdenes comerciales (`orders`), encomiendas X→Y (`deliveryTrips`), ruteo de Courier (`RutaActivaScreen`), torre de control (`DeliveryControlTowerModule.tsx`) ni liquidaciones contables (`merchantSettlement.ts`).
2. **Separación de Tres Niveles: Capacidad $\ne$ Disponibilidad $\ne$ Visibilidad:**
   - **Nivel 1 — Capacidad (Entitlement):** ¿El tenant/sistema tiene contratado el servicio en el Gatekeeper?
   - **Nivel 2 — Disponibilidad Operativa (Service Status):** ¿Hay motorizados activos o el servicio está pausado por clima/contingencia?
   - **Nivel 3 — Visibilidad de Feed (UI Placement):** ¿Dónde y cómo se muestra el banner de acceso en la Home?
3. **Verdad Semántica Absoluta:** Prohibido mostrar badges de "Mismo Precio" o "Más Vendidos" si no están respaldados por evidencia contable y transaccional auditable.
4. **Presupuesto de Lecturas $0 Maps Cost:** Preservar la arquitectura de caché inteligente, geocodificación nativa Android y cálculo Haversine puro en memoria sin llamadas externas tarificadas.

---

## 06. Target Architecture

```mermaid
flowchart TD
    subgraph Governance_Layer [Capa de Gobernanza & Entitlements]
        GK[Gatekeeper Engine: ModuleCatalog]
        TenantSub[Tenant Subscription: X_TO_Y_DELIVERY]
    end

    subgraph Admin_Control [Dashboard Manager Enterprise v2.3]
        DM_Gen[Configuración General & Toggles]
        DM_Order[Orden de Bloques: 15 Secciones Canónicas]
        DM_Services[Customer Services: X->Y Availability]
    end

    subgraph Data_Layer [Firestore Authoritative Collections]
        FS_DashConfig[/dashboard/configuration]
        FS_Analytics[/dashboardAnalytics (Security Rule ALLOW)]
        FS_DailyAggs[/daily_merchant_analytics]
        FS_Orders[/orders]
    end

    subgraph Presentation_Layer [Customer Android Home]
        Dedupe[DashboardDeduplicationEngine]
        FeedOrch[CustomerHomeFeedSection - 15 Dynamic Renderers]
        QR_View[QuickReorderSection - 7-Layer Validator]
        XY_View[ExpressDeliveryBanner - Dynamic Controlled]
    end

    Governance_Layer --> Admin_Control
    Admin_Control --> FS_DashConfig
    FS_DashConfig --> Presentation_Layer
    Presentation_Layer --> Dedupe
    Dedupe --> FeedOrch
    FeedOrch --> QR_View
    FeedOrch --> XY_View
    Presentation_Layer -->|Track Events| FS_Analytics
```

---

## 07. Corrections Now (Acciones Inmediatas P0 / P1)

| ID | Problema | Prioridad | Causa Raíz | Archivo(s) Afectado(s) | Solución Propuesta | Riesgo Regresión | Test de Validación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CORR-01** | `QUICK_REORDER` huérfano | **P1** | Falta rama en `when (sectionId)` de `CustomerHomeFeedSection.kt` | `CustomerHomeFeedSection.kt`, `QuickReorderSection.kt` | Implementar `QuickReorderSection` con listener a últimas 3 órdenes completadas del UID | Bajo | `CustomerFeedReorderTest` |
| **CORR-02** | `/dashboardAnalytics` bloqueado por Rules | **P0** | Falta bloque `match` en `firestore.rules` | `firestore.rules` | Agregar `match /dashboardAnalytics/{docId}` con validación de schema e incrementos atómicos | Nulo | `DashboardAnalyticsSecurityTest` |
| **CORR-03** | Inclusión de `EXPRESS_DELIVERY` en feed | **P1** | Banner colocado estático fuera de bucle | `Models.kt`, `CustomerHomeFeedSection.kt`, `dashboardManager.js` | Incorporar `EXPRESS_DELIVERY` a `CANONICAL_DEFAULT_SECTION_ORDER` y vincular toggle `showExpressDeliveryBanner` | Muy Bajo | `ExpressDeliveryFeedPlacementTest` |
| **CORR-04** | Falta filtro `isActive` en Banners | **P2** | `listenToPromotionalBanners` no filtra | `FirebaseManager.kt:1486` | Agregar `.whereEqualTo("active", true)` o filtrar en deserialización | Bajo | `BannerActiveFilterTest` |

---

## 08. Redesign Required (Componentes a Rediseñar)

### 1. Motor de Recomendaciones y Agregaciones Semánticas
- **Problema:** Cálculos arbitrarios en memoria en `CuratedBusinessSections.kt`.
- **Rediseño:**
  - `SAME_PRICE`: Requiere campo `priceParityVerified: Boolean` y `parityAuditedAt: Timestamp` en `/businesses/{id}`. Mientras no esté verificado por auditoría comercial, el comercio no califica para la sección.
  - `TOP_SELLING`: Consumirá el campo agregado `monthlySalesCount: Int` actualizado semanalmente por Cloud Function desde `/orders`.
  - `NEW_BUSINESSES`: Filtrará `activatedAt >= Timestamp.now() - 30 days`.
  - `RECOMMENDED`: Motor de afinidad determinista en cliente basado en categorías de las últimas 5 órdenes del usuario.

### 2. Dashboard Analytics Pipeline
- **Problema:** Cero registro de impresiones (`views`), métricas CTR falsas.
- **Rediseño:** Ingesta de impresiones con debounce reactivo (`LaunchedEffect`) al entrar la sección al viewport visible.

---

## 09. Frozen Modules (Baseline Inmutable v2.2/v2.3 Enterprise)

Los siguientes componentes quedan **FORMALMENTE DECLARADOS CONGELADOS** y tienen prohibida cualquier modificación durante esta C2D:

1. **X→Y Courier Routing & Execution Engine (ADR-015 / ADR-016 / C29):**
   - `SolicitarEnvioScreen.kt` (resolución GPS nativa y cotizador Haversine).
   - `orders.ts` (Cloud Function `notifyNewOrder` y bifurcación C30 `NEW_X_TO_Y_DELIVERY`).
   - `DeliveryFirebaseMessagingService.kt` (canal de alarma prioritario).
   - `PedidosEntrantesScreen.kt` y `RutaActivaScreen.kt` (Fase 1 Punto X $\rightarrow$ Fase 2 Punto Y).
2. **Merchant Financial Settlement Lifecycle (ADR-019):**
   - `functions/src/callables/merchantSettlement.ts`.
   - `useSettlements.ts` y `financeCenter.js`.
3. **Control Tower & Dispatch Radar (ADR-013 / ADR-016):**
   - `DeliveryControlTowerModule.tsx` y motor CartoDB Voyager.
4. **Courier Cash Closure & Official Act PDF Export (ADR-018):**
   - `CourierCashClosureScreen.kt` y `/courier_cash_ledger`.

---

## 10. Explicit No-Touch Scope

Queda estrictamente prohibido alterar o refactorizar:
- `MainActivity.kt` (salvo que sea para registrar un nuevo DeepLink explícitamente probado).
- Esquemas de bases de datos de autenticación o roles (`users`, `roles`, `permissions`).
- Colección `/deliveryTrips` (estructura y campos inmutables).
- Lógica de cálculo de comisiones o tarifas de motorizados.
- Gradle scripts o dependencias globales.

---

## 11. X→Y Governance Design

Se establece la matriz formal de separación de estados para el servicio Punto A $\rightarrow$ Punto B:

```text
                               ┌────────────────────────────────┐
                               │  TENANT SUBSCRIPTION           │
                               │  X_TO_Y_DELIVERY Entitled?     │
                               └───────────────┬────────────────┘
                                               │
                                      YES      │      NO
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
        ┌───────────────────────────────┐              ┌───────────────────────────────┐
        │ SYSTEM / OPS AVAILABILITY     │              │ SERVICE DISABLED              │
        │ xToYServiceEnabled == true?   │              │ Banner Hidden / Route 403     │
        └───────────────┬───────────────┘              └───────────────────────────────┘
                        │
               YES      │      NO
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ DASHBOARD MANAGER (UI)       │ │ OPS PAUSED                   │
│ showExpressDeliveryBanner?   │ │ Banner Shows 'Pausado'       │
└──────────────┬───────────────┘ └──────────────────────────────┘
               │
        YES    │    NO
   ┌───────────┴───────────┐
   ▼                       ▼
┌─────────────────────┐ ┌───────────────────────────────────────┐
│ BANNER VISIBLE EN   │ │ BANNER OCULTO EN HOME FEED            │
│ HOME FEED SEGÚN     │ │ (Servicio accesible por Menú Perfil   │
│ SECTION ORDER       │ │ si xToYServiceEnabled == true)        │
└─────────────────────┘ └───────────────────────────────────────┘
```

### Matriz de Comportamiento:

| Service Enabled | Home Visible | Posición Feed | Menú Perfil | Creación `/deliveryTrips` | Resultado para el Cliente |
| :---: | :---: | :---: | :---: | :---: | :--- |
| `true` | `true` | Según `sectionOrder` | Activo | Permitido | Flujo estándar óptimo. Banner visible y operable. |
| `true` | `false` | No se dibuja | Activo | Permitido | Home limpia. Servicio disponible para clientes habituales vía Menú. |
| `false` | `true` | Según `sectionOrder` | Badge "Pausado" | Bloqueado | Banner informativo: *"Servicio temporalmente no disponible"*. |
| `false` | `false` | No se dibuja | Oculto | Bloqueado | Servicio totalmente deshabilitado para el tenant. |

---

## 12. Dashboard Manager Target Design

Evolución de la interfaz administrativa en [panel-admin/public/js/dashboard/dashboardManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/dashboardManager.js):

1. **Ampliación del Catálogo de Secciones (15 Bloques Canónicos):**
   Se agrega `EXPRESS_DELIVERY` al catálogo `allToggles` y `defaultSectionOrder`:
   ```javascript
   { 
     key: 'showExpressDeliveryBanner', 
     id: 'EXPRESS_DELIVERY', 
     label: 'Envíos Punto A → B (Express X→Y) 🚚', 
     icon: '📦', 
     desc: 'Banner interactivo para solicitar mensajería y paquetería entre particulares.' 
   }
   ```
2. **Pestaña de Orden de Bloques:**
   Permite arrastrar o mover con botones $\blacktriangle / \blacktriangledown$ el bloque `EXPRESS_DELIVERY` a cualquier posición vertical (arriba de categorías, entre ofertas flash, o al final).
3. **Sección Nueva: "Disponibilidad de Servicios de Plataforma":**
   Switch maestro para `xToYServiceEnabled` (independiente de la visibilidad visual del banner).

---

## 13. 14-Block Resolution Plan (+ Block 15: Express Delivery)

### 01. `BANNERS` (Banners Promocionales)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar. Añadir filtro de expiración (`endAt >= now`).

### 02. `CATEGORIES` (Categorías Comerciales)
- **Estado:** 🟡 Impreciso.
- **Acción:** Renombrar en Admin a "Categorías de Negocios" para clarificar que filtra restaurantes/tiendas, no platillos individuales.

### 03. `BRANCHES` (Sucursales por Comercio)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar. Añadir ordenamiento por distancia al cliente si tiene dirección activa.

### 04. `NEARBY` (Comercios Cerca de Ti)
- **Estado:** 🟢 Excelencia Técnica.
- **Acción:** Congelar motor `NearbyMerchantEngine.kt`. Mantener radios dinámicos (5 $\rightarrow$ 10 $\rightarrow$ 15 km).

### 05. `FEATURED_BUSINESSES` (Comercios Destacados)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar. Criterio canónico: `isFeatured == true`.

### 06. `FEATURED_PRODUCTS` (Productos Estrella)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar la sincronización dual entre `/featuredProducts` y `/products`.

### 07. `FLASH_DEALS` (Ofertas Flash)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar el validador estricto de timestamps en cliente.

### 08. `PROMOTIONS` (Productos con Descuento)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar el botón de compra directa (`CartManager.addToCart`).

### 09. `SAME_PRICE` (Mismo Precio que en Local)
- **Estado:** 🟤 Brecha Semántica.
- **Acción:** Exigir `store.priceParityVerified == true`. Si el comercio no está certificado, se oculta de este bloque.

### 10. `TOP_SELLING` (Los Más Vendidos)
- **Estado:** 🟤 Brecha Semántica.
- **Acción:** Sustituir ordenamiento por `rating` por el campo `salesVolume30d` indexado.

### 11. `RECOMMENDED` (Recomendados para ti)
- **Estado:** 🟤 Brecha Semántica.
- **Acción:** Implementar motor de afinidad en cliente. Si es usuario nuevo sin órdenes, mostrar fallback etiquetado como "Populares de la plataforma".

### 12. `NEW_BUSINESSES` (Comercios Nuevos)
- **Estado:** 🟤 Brecha Semántica.
- **Acción:** Filtrar por `store.activatedAt >= (now - 30 days)`.

### 13. `QUICK_REORDER` (Volver a Pedir)
- **Estado:** 🔴 Bloque Roto / Fantasma.
- **Acción:** **IMPLEMENTAR DEFINITIVAMENTE**. Diseñar `QuickReorderSection.kt` conectado a `/orders` del cliente con validación previa de precios y catálogo.

### 14. `FAVORITES` (Tus Comercios Favoritos)
- **Estado:** 🟢 Real / Funcional.
- **Acción:** Preservar. Conectado a subcolección `/users/{uid}/favorites`.

### 15. `EXPRESS_DELIVERY` (Envíos Punto A → B / Encomiendas X→Y)
- **Estado:** 🔵 Brecha de Configuración.
- **Acción:** **INCORPORAR FORMALMENTE AL FEED DINÁMICO** como elemento configurable gobernado por el Dashboard Manager.

---

## 14. Analytics Architecture

### Cláusula de Seguridad en `firestore.rules`:
```javascript
match /dashboardAnalytics/{docId} {
  allow read: if isPlatformAdmin();
  allow create, update: if isAuthenticated() &&
    request.resource.data.keys().hasOnly(['itemId', 'itemName', 'itemType', 'lastUpdated', 'views', 'clicks', 'orders', 'revenue']) &&
    request.resource.data.itemType in ['banner', 'business', 'product', 'deal', 'branch', 'express_delivery', 'order'] &&
    request.resource.data.lastUpdated is timestamp;
  allow delete: if isPlatformAdmin();
}
```

### Eventos Específicos para X→Y:
- `express_delivery_view`: Impresión del banner en pantalla.
- `express_delivery_click`: Clic en "SOLICITAR DELIVERY".
- `x_to_y_quote_calculated`: Cotización exitosa de distancia y tarifa.
- `x_to_y_trip_created`: Creación y confirmación del envío.

---

## 15. Anti-Duplication Architecture

Para erradicar la fatiga visual provocada por comercios repetidos en múltiples secciones consecutivas, se diseña el `DashboardDeduplicationEngine`:

```kotlin
object DashboardDeduplicationEngine {
    private const val MAX_REPETITIONS_PER_MERCHANT = 2

    fun filterFeedBusinesses(
        candidateBusinesses: List<BusinessInfo>,
        alreadyRenderedMerchantIds: MutableMap<String, Int>,
        sectionPriority: Int // 1: Cerca de Ti, 2: Destacados, 3: Curados
    ): List<BusinessInfo> {
        return candidateBusinesses.filter { biz ->
            val currentCount = alreadyRenderedMerchantIds.getOrDefault(biz.id, 0)
            if (currentCount < MAX_REPETITIONS_PER_MERCHANT) {
                alreadyRenderedMerchantIds[biz.id] = currentCount + 1
                true
            } else {
                false
            }
        }
    }
}
```

- **Prioridad 1 (Sin Restricción):** Comercios Cerca de Ti y Favoritos.
- **Prioridad 2 (Filtrado Anti-Saturación):** Mismo Precio, Recomendados y Nuevos.

---

## 16. Multi-Tenant Strategy

Evolución modular hacia soporte multi-tenant sin romper la compatibilidad actual:

1. **Resolución Jerárquica en Tres Capas:**
   $$\text{Configuración Aplicada} = \text{Tenant Override} \ \oplus \ \text{Brand Override} \ \oplus \ \text{Global Default}$$
2. **Ruta en Firestore:**
   - Global: `/dashboard/configuration` (Baseline actual).
   - Tenant-specific: `/tenants/{tenantId}/dashboard/configuration`.
3. **Cero Migración Forzada:** Si el documento del tenant no existe, el cliente retrocede transparentemente al documento global `/dashboard/configuration`.

---

## 17. Cache Strategy

1. **Deprecación de `DashboardCacheManager.kt`:**
   Dado que el SDK de Firebase Firestore implementa persistencia offline nativa mediante cache en disco indexado (SQLite en Android), mantener un serializador secundario en SharedPreferences introduce riesgo de split-brain y desfase de estados.
2. **Decisión:** Retirar formalmente `DashboardCacheManager.kt` o convertirlo en un snapshot de diagnóstico para testing unitario. La persistencia oficial continuará siendo Firestore Local Persistence con emisión inmediata `Source.CACHE` garantizada.

---

## 18. Data Contracts

### Actualización de `Models.kt`:
```kotlin
// Inclusión canónica del Bloque 15
companion object {
    val CANONICAL_DEFAULT_SECTION_ORDER: List<String> = listOf(
        "BANNERS",
        "CATEGORIES",
        "BRANCHES",
        "NEARBY",
        "FEATURED_BUSINESSES",
        "FEATURED_PRODUCTS",
        "FLASH_DEALS",
        "PROMOTIONS",
        "SAME_PRICE",
        "TOP_SELLING",
        "RECOMMENDED",
        "NEW_BUSINESSES",
        "QUICK_REORDER",
        "FAVORITES",
        "EXPRESS_DELIVERY" // <- Bloque 15 Incorporado
    )
}

data class DashboardConfig(
    // Toggles existentes...
    val showExpressDeliveryBanner: Boolean = true,
    val xToYServiceEnabled: Boolean = true,
    val sectionOrder: List<String> = CANONICAL_DEFAULT_SECTION_ORDER
)
```

---

## 19. Firestore Impact

- **Modificación de Documento Existente:** `/dashboard/configuration` incorporará los campos aditivos `showExpressDeliveryBanner: true` y `xToYServiceEnabled: true`.
- **Nuevas Colecciones:** Ninguna. Cero costo de migración de base de datos.
- **Seguridad:** Modificación de `firestore.rules` para incorporar `/dashboardAnalytics`.

---

## 20. Cloud Functions Impact

- **Cero Modificación en Backend Operativo:** Las funciones certificadas `notifyNewOrder`, `onOrderStatusChanged`, `claimOrderCallable` y `trips.ts` permanecen **estrictamente inalteradas**.
- **Agregación Futura (Opcional):** Cloud Function programada para calcular semanalmente `salesVolume30d` en `/businesses/{id}`.

---

## 21. Customer App Impact

Archivos modificados quirúrgicamente en la fase de implementación:
1. `app/src/main/java/com/example/Models.kt`: Adición de `EXPRESS_DELIVERY` y toggles.
2. `app/src/main/java/com/example/presentation/customer/home/CustomerHomeFeedSection.kt`:
   - Integración de rama `"EXPRESS_DELIVERY"` dentro del ciclo `when (sectionId)`.
   - Eliminación del banner fijo al pie del feed.
   - Creación de la rama `"QUICK_REORDER"` llamando a `QuickReorderSection`.
3. `app/src/main/java/com/example/presentation/customer/home/QuickReorderSection.kt` (Nuevo Composable modular).
4. `app/src/main/java/com/example/presentation/customer/home/CuratedBusinessSections.kt`: Sustitución de heurísticas por validaciones de contrato.

---

## 22. Admin App Impact

Archivos modificados en el panel administrativo:
1. `panel-admin/public/js/dashboard/dashboardManager.js`:
   - Registro de `showExpressDeliveryBanner` en `allToggles`.
   - Registro de `EXPRESS_DELIVERY` en `defaultSectionOrder`.
   - Visualización de live sync y feedback instantáneo.

---

## 23. Migration Strategy

- **Tipo:** **SAFE DEFAULT (Zero Data Migration).**
- **Mecanismo:** La función `getNormalizedSectionOrder()` ya contempla la anexión automática de cualquier ID canónico ausente:
  ```kotlin
  CANONICAL_DEFAULT_SECTION_ORDER.forEach { canonicalId ->
      if (!result.contains(canonicalId)) {
          result.add(canonicalId)
      }
  }
  ```
- Al agregar `EXPRESS_DELIVERY` al código Kotlin, las apps existentes que lean un documento de configuración antiguo que aún no tenga `EXPRESS_DELIVERY` en su lista lo colocarán automáticamente al final del feed de forma segura, preservando la paridad visual.

---

## 24. Compatibility Strategy

- **Backward Compatibility:** 100% garantizada. Documentos antiguos de Firestore funcionan sin lanzar excepciones (`@IgnoreExtraProperties` previene fallos de deserialización).
- **Offline Compatibility:** Si la app inicia sin conexión, el fallback de `DashboardConfig()` contiene la lista completa con los 15 bloques canónicos.

---

## 25. Test Strategy

Suite de pruebas automatizadas a ejecutar previa certificación:
1. `DashboardConfigContractTest.kt`: Valida que `CANONICAL_DEFAULT_SECTION_ORDER` posea exactamente 15 elementos y que `getNormalizedSectionOrder()` no descarte ningún ID canónico.
2. `QuickReorderValidatorTest.kt`: Simula una orden pasada con un platillo descontinuado y verifica que no permita reordenar productos inactivos.
3. `XToYGovernanceIntegrationTest.kt`: Verifica que al apagar `showExpressDeliveryBanner` el banner desaparezca del feed sin romper la ruta `solicitar_envio_form`.
4. `DashboardAnalyticsSecurityTest.ts`: Ejecuta suite en emulador de Firestore validando que el cliente pueda incrementar métricas y que se rechacen campos no autorizados.

---

## 26. Regression Strategy

Protocolo de verificación post-cambio sobre los flujos críticos:
1. **Flujo de Restaurante (Commerce Delivery):** Login $\rightarrow$ Selección de platillo $\rightarrow$ Carrito $\rightarrow$ Checkout $\rightarrow$ Recepción en KDS $\rightarrow$ Asignación Courier. (Debe operar idéntico).
2. **Flujo de Encomienda (X→Y Delivery):** Acceso a `SolicitarEnvioScreen` $\rightarrow$ Selección en mapa $\rightarrow$ Cotización $\rightarrow$ Creación en `/orders` y `/deliveryTrips` $\rightarrow$ Alerta sonora FCM en Courier $\rightarrow$ Aceptación en `PedidosEntrantesScreen`. (Debe operar idéntico).
3. **Flujo de Cierre Financiero:** Cierre de caja de Courier y Liquidaciones de Comercios sin alteración.

---

## 27. Certification Gates

Para declarar aprobada la implementación de la C2D, se deben superar los siguientes 5 Gates:

- **GATE 1 — CONTRACT INTEGRITY:** 15 bloques canónicos mapeados biunívocamente entre Kotlin, JavaScript y Firestore.
- **GATE 2 — ZERO GHOST BLOCKS:** `QUICK_REORDER` y `EXPRESS_DELIVERY` cuentan con composables renderizados y probados.
- **GATE 3 — SECURITY AUDIT:** Cero errores `PERMISSION_DENIED` en Logcat al interactuar con banners o comercios.
- **GATE 4 — DATA TRUTH:** `SAME_PRICE` y `TOP_SELLING` demuestran respaldo en campos de Firestore.
- **GATE 5 — PHYSICAL E2E:** Flujo completo validado en dispositivo real físico (Galaxy Z Fold 5 u homólogo).

---

## 28. Rollback Strategy

Si se detecta cualquier regresión funcional en la app de clientes:
1. **Rollback de UI Móvil:** Revertir el commit de `CustomerHomeFeedSection.kt` para restaurar el feed dinámico anterior con `ExpressDeliveryBanner` fijo al pie.
2. **Rollback de Configuración:** `dashboardManager.js` puede guardar la lista previa de 14 elementos sin afectar el backend.
3. **Persistencia Intacta:** Como no se mutan esquemas de base de datos ni Cloud Functions, el rollback es puramente a nivel de presentación con riesgo 0 de corrupción de datos.

---

## 29. Implementation Sequence

La ejecución de las correcciones debe seguir estrictamente este orden secuencial por fases:

```text
[FASE 0: Baseline Freeze] ──► Congelar módulos operativos y registrar commit limpio.
            │
[FASE 1: Security Rules]  ──► Desplegar regla canónica para /dashboardAnalytics.
            │
[FASE 2: Model & Contract]──► Actualizar Models.kt (15 bloques canónicos y toggles).
            │
[FASE 3: Quick Reorder]   ──► Implementar QuickReorderSection con validación de catálogo.
            │
[FASE 4: X→Y Governance]  ──► Integrar ExpressDeliveryBanner dentro del feed dinámico.
            │
[FASE 5: Admin Panel]     ──► Actualizar dashboardManager.js con el switch y reordenamiento.
            │
[FASE 6: Semantic Cleanup]──► Sustituir heurísticas engañosas por validaciones reales.
            │
[FASE 7: Anti-Duplication]──► Integrar DashboardDeduplicationEngine en el Home Feed.
            │
[FASE 8: Certificación]   ──► Ejecución de suite de tests y validación física E2E.
```

---

## 30. Final Decision Table

| Elemento | Acción | Razón Técnica | Prioridad | Riesgo | Fase de Ejecución |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `BANNERS` | **Mantener** | Funciona correctamente. Añadir filtro `active`. | P2 | Bajo | Fase 2 |
| `CATEGORIES` | **Mantener** | Clarificar semántica de rubro comercial. | P3 | Muy Bajo | Fase 6 |
| `BRANCHES` | **Mantener** | Operación correcta multi-sede. | P3 | Bajo | Fase 6 |
| `NEARBY` | **Congelar** | Motor Haversine certificado y óptimo. | P3 | Nulo | Fase 0 |
| `FEATURED_BUSINESSES` | **Mantener** | Criterio `isFeatured` válido. | P3 | Bajo | Fase 6 |
| `FEATURED_PRODUCTS` | **Mantener** | Sincronización dual catálogo/destacados funcional. | P2 | Bajo | Fase 6 |
| `FLASH_DEALS` | **Mantener** | Validación temporal estricta autoritativa. | P2 | Bajo | Fase 6 |
| `PROMOTIONS` | **Mantener** | Descuento regular de catálogo con Add-to-Cart. | P2 | Bajo | Fase 6 |
| `SAME_PRICE` | **Rediseñar** | Eliminar reclamo engañoso; exigir certificación. | P2 | Medio | Fase 6 |
| `TOP_SELLING` | **Rediseñar** | Migrar de rating a volumen de ventas agregado. | P2 | Medio | Fase 6 |
| `RECOMMENDED` | **Rediseñar** | Implementar afinidad por historial de categorías. | P2 | Medio | Fase 6 |
| `NEW_BUSINESSES` | **Rediseñar** | Migrar de `.reversed()` a `activatedAt >= now - 30d`.| P2 | Bajo | Fase 6 |
| `QUICK_REORDER` | **Implementar**| Bloque fantasma roto; construir componente real. | **P1** | Medio | Fase 3 |
| `FAVORITES` | **Mantener** | Conexión a `/users/{uid}/favorites` funcional. | P2 | Bajo | Fase 6 |
| `EXPRESS_DELIVERY` | **Incorporar** | Integrar formalmente en feed dinámico con toggle. | **P1** | Bajo | Fase 4 |
| `ANALYTICS` | **Corregir** | Desbloquear permisos en `firestore.rules`. | **P0** | Bajo | Fase 1 |
| `CACHE` | **Deprecar** | Retirar `DashboardCacheManager.kt` huérfano. | P3 | Nulo | Fase 2 |
| `MULTITENANT` | **Preparar** | Definir arquitectura jerárquica de configuración. | P3 | Bajo | Fase 7 |

---

## 31. Executive Verdict

```text
============================================================
C2D CUSTOMER DASHBOARD — FINAL ARCHITECTURAL VERDICT
============================================================

CURRENT STATE:
Arquitectura híbrida parcialmente funcional. 8 bloques operan con
éxito, 4 presentan deriva semántica, 1 está totalmente roto por
omisión de renderer (QUICK_REORDER), la telemetría analítica está
bloqueada por Security Rules, y X→Y Delivery opera a la perfección
en backend pero está rígidamente desgobernado en la interfaz móvil.

PRIMARY ARCHITECTURAL GAP:
Desconexión entre los Módulos de Capacidad de Plataforma (Gatekeeper:
X_TO_Y_DELIVERY) y el catálogo de visualización del feed dinámico
(dashboardManager.js / Models.kt).

PRIMARY FUNCTIONAL GAP:
QUICK_REORDER posee contrato y toggle administrativo activo pero
carece por completo de renderizado visual en la aplicación móvil.

PRIMARY DATA GAP:
Escrituras de clientes en /dashboardAnalytics rechazadas silenciosamente
por falta de reglas en firestore.rules, y heurísticas en memoria
que prometen falsamente 'Mismo Precio' y 'Más Vendidos'.

PRIMARY UX GAP:
Saturación y fatiga visual por clonación de los mismos comercios en
hasta 6 carruseles verticales simultáneos.

PRIMARY GOVERNANCE GAP:
Ausencia de control administrativo sobre la presencia y posición del
banner de Envíos Express (X→Y) en la pantalla principal.

QUICK_REORDER:
IMPLEMENT (Construcción formal de QuickReorderSection con 7 capas de validación).

X→Y:
HYBRID (Service Capability en Gatekeeper + Dynamic Controlled Block en Feed).

X→Y HOME VISIBILITY:
Gobernada por toggle 'showExpressDeliveryBanner' y posición en 'sectionOrder'.

X→Y SERVICE ENABLEMENT:
Gobernado independientemente por 'xToYServiceEnabled' y Entitlement de Tenant.

ANALYTICS:
Desbloqueo seguro vía firestore.rules con validación de schema e incrementos atómicos.

SAME_PRICE:
Exigencia de certificación comercial 'priceParityVerified == true'.

TOP_SELLING:
Cálculo basado en volumen de órdenes agregadas (salesVolume30d), no en rating.

RECOMMENDED:
Afinidad basada en historial de categorías del cliente con fallback para usuarios nuevos.

NEW_BUSINESSES:
Filtro estricto por fecha de activación (activatedAt >= now - 30 días).

ANTI-DUPLICATION:
Integración de DashboardDeduplicationEngine (máximo 2 apariciones por comercio).

MULTITENANT:
Resolución jerárquica (Tenant Override -> Brand Override -> Global Default).

FROZEN MODULES:
Fleet Core, Courier Pool, SolicitarEnvioScreen, notifyNewOrder, RutaActivaScreen,
Merchant Settlement Lifecycle, Control Tower, Courier Cash Closure.

NO-TOUCH MODULES:
Esquemas de autenticación y roles, colección /deliveryTrips, pricing engine
Haversine ($35 + km * $15), comisiones de motorizados.

IMPLEMENTATION READY:
YES (Plan maestro exhaustivo, cerrado, trazable y sin ambigüedades técnicas).

BLOCKERS BEFORE IMPLEMENTATION:
Autorización formal humana para apertura de ventana operativa de mutación de código.

============================================================
```
