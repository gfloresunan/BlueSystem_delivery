# BSD-IOS-FLUTTER-CROSS-PLATFORM-DESIGN-SYSTEM-001
# BLUE SYSTEM CROSS-PLATFORM DESIGN SYSTEM
## Android Canonical Reference → Flutter iOS Unified Experience
### Mandato: UN SOLO PRODUCTO — UNA SOLA IDENTIDAD — UNA SOLA EXPERIENCIA — TRES ROLES — DOS PLATAFORMAS — UN SOLO CORE — UN SOLO SSOT

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO MAESTRO
El presente protocolo formaliza la auditoría, normalización, especificación técnica e implementación del **BlueSystem Cross-Platform Design System (BSDS)** para la aplicación móvil Flutter iOS.

Tomando como **fuente visual y UX canónica e inmutable** la aplicación nativa Android certificada (`/app/**`, Kotlin, Jetpack Compose, Material 3), se ha establecido una arquitectura de tokens centralizada en `flutter_client/lib/core/design_system/`. Esta arquitectura garantiza que cualquier usuario que transicione de Android a iPhone experimente exactamente la misma identidad corporativa, jerarquía de información, comportamiento operativo y coherencia multi-rol (Cliente, Motorizado y Comercio).

---

## 2. GOBERNANZA Y BLINDAJE DE CORE (FROZEN CORE CHECK)
Bajo las reglas estrictas de gobernanza arquitectónica:
- 🟢 **Android Core (`/app/**`):** 0 archivos modificados (0 bytes alterados).
- 🟢 **Cloud Functions (`/functions/**`):** 0 archivos modificados.
- 🟢 **Firestore Rules (`firestore.rules`):** Inmutables (0 modificaciones).
- 🟢 **Storage Rules (`storage.rules`):** Inmutables (0 modificaciones).
- 🟢 **SSOT / Contratos de Negocio:** 0 modificaciones.
- 🟢 **Alcance de Modificación:** Restringido al 100% dentro de `flutter_client/**`.

---

## 3. AUDITORÍA VISUAL ANDROID CANÓNICA (SOURCE OF TRUTH)
Se ejecutó una inspección forense exhaustiva de los módulos de tema y vistas Android:
1. `app/src/main/java/com/example/ui/theme/Color.kt`
2. `app/src/main/java/com/example/ui/theme/Theme.kt`
3. `app/src/main/java/com/example/ui/theme/Type.kt`
4. `app/src/main/java/com/example/eiam/presentation/ui/bsds/theme/BSDSTheme.kt`
5. `app/src/main/java/com/example/presentation/customer/**` (HomeHeader, PublicBusinessCard, StarProductCard)
6. `app/src/main/java/com/example/presentation/courier/CourierMainDashboardScreen.kt`
7. `app/src/main/java/com/example/presentation/business/dashboard/MerchantOperationsDashboardScreen.kt`

### Hallazgos Canónicos:
- **Azules Corporativos:** Primario `#0D47A1` (BluePrimary), Secundario `#0288D1` (BlueSecondary), Terciario `#00B0FF`.
- **Fondo Cliente:** `#F4F7FA` (BgLightApp) con superficies `#FFFFFF`.
- **Fondo Operativo Motorizado:** `#020617` (BSDSBgDark) con tarjetas `#0F172A`, bordes `#1E293B` y acentos índigo `#6366F1` / `#818CF8`.
- **Fondo Operativo Comercio:** `#F8FAFC` con acento operacional `#2563EB`.
- **Acento Cart FAB Central:** `#FF2D55` (FabAccent).
- **Semántica de Estado:** Éxito `#10B981` / `#34D399`, Alerta `#F59E0B` / `#FBBF24`, Error `#EF4444` / `#DC2626`.
- **Tipografía Oficial:** Familia *Poppins* con escala jerárquica display, headline, title, body, label y price.
- **Geometría de Bordes:** 8dp (extraSmall), 12dp (small), 16/18dp (card medium), 24dp (sheet large), 28dp (floating extraLarge), 999dp (pill).

---

## 4. INVENTARIO DE DESIGN TOKENS Y ARQUITECTURA FLUTTER
Se estructuró la capa centralizada en `flutter_client/lib/core/design_system/`:

```
lib/core/design_system/
├── colors/
│   └── bs_colors.dart           # Tokens de color, gradientes y resolutores canónicos
├── typography/
│   └── bs_typography.dart       # Escala Poppins completa (display, headline, title, body, label, price)
├── spacing/
│   └── bs_spacing.dart          # Grilla modular 4dp/8dp (xxs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24)
├── dimensions/
│   └── bs_dimensions.dart       # Touch targets (44/48dp), avatares, tarjetas e iconos
├── radius/
│   └── bs_radius.dart           # Radios canónicos 8dp, 12dp, 16dp, 18dp, 24dp, 28dp, pill
├── elevation/
│   └── bs_elevation.dart        # Sombras y elevaciones card, floating, bottom nav, cart FAB
├── icons/
│   └── bs_icon_registry.dart    # BlueSystemIconRegistry cross-platform unificado
├── buttons/
│   └── bs_buttons.dart          # BSButton (primary, secondary, outlined, danger, success, text), BSIconButton, BSCartButton
├── badges/
│   └── bs_badges.dart           # BSBadge, BSStatusBadge, OpenBadge, ClosedBadge, RatingBadge, DistanceBadge, DiscountBadge
├── cards/
│   └── bs_cards.dart            # BSCard, BSMerchantCard (1:1 Android), BSProductCard, BSKpiCard
├── inputs/
│   └── bs_inputs.dart           # BSInput (validación, password toggle), BSSearchField (voice mic pill)
├── dialogs/
│   └── bs_dialogs.dart          # BSDialog (20dp corners, acciones primarias/secundarias)
├── sheets/
│   └── bs_sheets.dart           # BSBottomSheet (24dp top radius, handle bar, iOS safe insets)
├── states/
│   └── bs_states.dart           # BSLoading, BSEmptyState, BSErrorState, BSOfflineBanner
├── navigation/
│   └── bs_navigation.dart       # BSBottomNavigation, BSBottomNavItem, BSHeader, BSSectionHeader, BSLocationSelector, BSAvatar
├── themes/
│   └── bs_theme.dart            # M3 LightTheme (Customer/Merchant), CourierDarkTheme (Motorizado)
└── bsds_theme.dart              # Barrel export unificado
```

---

## 5. TABLA CANÓNICA DE TOKENS

| Categoría | Token BSDS | Valor Canónico | Equivalente Android |
| :--- | :--- | :--- | :--- |
| **Color** | `BSColors.primary` | `#0D47A1` | `com.example.ui.theme.BluePrimary` |
| **Color** | `BSColors.secondary` | `#0288D1` | `com.example.ui.theme.BlueSecondary` |
| **Color** | `BSColors.tertiary` | `#00B0FF` | `com.example.ui.theme.BlueTertiary` |
| **Color** | `BSColors.bgLight` | `#F4F7FA` | `com.example.ui.theme.BgLightApp` |
| **Color** | `BSColors.surfaceLight` | `#FFFFFF` | `com.example.ui.theme.SurfaceLight` |
| **Color** | `BSColors.bgDark` | `#020617` | `BSDSBgDark` |
| **Color** | `BSColors.surfaceDark` | `#0F172A` | `BSDSSurfaceDark` |
| **Color** | `BSColors.cartFabAccent` | `#FF2D55` | `com.example.ui.theme.FabAccent` |
| **Color** | `BSColors.courierAccent` | `#6366F1` | `CourierMainDashboardScreen.kt (Indicator)` |
| **Color** | `BSColors.success` | `#10B981` | `com.example.ui.theme.StatusSuccess` |
| **Color** | `BSColors.warning` | `#F59E0B` | `com.example.ui.theme.StatusWarning` |
| **Color** | `BSColors.error` | `#EF4444` | `com.example.ui.theme.StatusError` |
| **Borde** | `BSRadius.sm` | `8.0 dp` | `BSDSShapes.extraSmall` |
| **Borde** | `BSRadius.md` | `12.0 dp` | `BSDSShapes.small` |
| **Borde** | `BSRadius.cardLg` | `18.0 dp` | `BSDSShapes.medium` |
| **Borde** | `BSRadius.sheet` | `24.0 dp` | `BSDSShapes.large` |
| **Borde** | `BSRadius.floating` | `28.0 dp` | `BSDSShapes.extraLarge` |
| **Spacing** | `BSSpacing.sm` | `8.0 dp` | Grid base Android |
| **Spacing** | `BSSpacing.md` | `12.0 dp` | Padding cards Android |
| **Spacing** | `BSSpacing.lg` | `16.0 dp` | Padding screen Android |
| **Spacing** | `BSSpacing.xxl` | `24.0 dp` | Margen de secciones |

---

## 6. PARIDAD VISUAL Y UX POR ROL

### A. Customer (Cliente)
- **Header:** Gradiente canónico `[#0D47A1 -> #0288D1]`, avatar circular con iniciales, saludo dinámico ("Hola, {Nombre}"), selector de ubicación (`BSLocationSelector`) y badges de notificaciones/carrito.
- **Navegación:** `BSBottomNavigation` con barra curva blanca, elevación 8dp, pestañas (Inicio, Favorito, [Spacer], Pedidos, Mi Perfil) y el icónico botón flotante central `BSCartButton` en `#FF2D55` con badge numérico en `#0D47A1`.
- **Descubrimiento:** Buscador redondeado tipo píldora (`BSSearchField`) con micrófono, carrusel de banners desde `/banners`, categorías horizontales, "Comercios Cerca de Ti" con badge "Ampliado a 15 km", "Comercios Destacados", "Productos Estrella" y catálogo completo de comercios.
- **Tarjetas de Comercio:** Implementación 1:1 de `PublicBusinessCard.kt`:
  - Banner superior 105-135dp.
  - Badge "ABIERTO 🟢" / "CERRADO 🔴" en esquina superior izquierda.
  - Botón de corazón para favoritos en esquina superior derecha.
  - Nombre, rating ⭐, categoría, dirección 📍 y tarifa de envío "🚚 Envío C$ XX".

### B. Courier (Motorizado Operativo)
- **Tema:** Modo Oscuro Operacional inmutable (`#020617` fondo, `#0F172A` tarjetas, `#6366F1` acento).
- **Indicador de Turno:** Switch reactivo "En Línea 🟢" / "Fuera de Línea 🔴".
- **Navegación:** Barra oscura 4 destinos: Pedidos (cola de asignación/pool), Envíos (viajes activos X→Y), Flota / GPS (telemetría y mapa), Mi Perfil (arqueo de caja y vehículo asignado).

### C. Merchant (Comercio Aliado)
- **Tema:** Modo Operativo Profesional Claro (`#F8FAFC` fondo, `#FFFFFF` tarjetas).
- **Control de Negocio:** Switch atómico "Abierto / Cerrado", selector de 5 módulos canónicos (Dashboard, Pedidos, Menú, Finanzas, Ajustes), tarjetas KPI (`BSKpiCard`) con volumen de ventas, pedidos en tiempo real y disponibilidad de stock.

---

## 7. MATRIZ DE CERTIFICACIÓN DE PARIDAD CROSS-PLATFORM

| Área Auditada | Android Canónico (Kotlin/Compose) | iOS Flutter Implementado | Resultado |
| :--- | :--- | :--- | :---: |
| **Colores Corporativos** | `Color.kt` / `BSDSTheme.kt` | `BSColors` en `bs_colors.dart` | 🟢 **PASS** |
| **Tipografía** | Poppins (Display/Head/Title/Body) | `BSTypography` en `bs_typography.dart` | 🟢 **PASS** |
| **Iconografía** | Material Symbols Canónicos | `BSIconRegistry` unificado | 🟢 **PASS** |
| **Botones** | Elevados, Outlined, Danger, FAB | `BSButton`, `BSIconButton`, `BSCartButton` | 🟢 **PASS** |
| **Tarjetas** | PublicBusinessCard, StarProductCard | `BSMerchantCard`, `BSProductCard`, `BSKpiCard` | 🟢 **PASS** |
| **Barra de Navegación** | Curved Bottom Bar + Floating Cart | `BSBottomNavigation` + `BSCartButton` | 🟢 **PASS** |
| **Customer Experience** | CommercialHomeScreen.kt | `commercial_home_screen.dart` | 🟢 **PASS** |
| **Courier Experience** | CourierMainDashboardScreen.kt | `courier_dashboard_screen.dart` + M3 Dark | 🟢 **PASS** |
| **Merchant Experience** | MerchantOperationsDashboardScreen.kt | `merchant_dashboard_screen.dart` | 🟢 **PASS** |
| **Autenticación** | AuthScreen.kt (Social, Email, Guest) | `login_screen.dart` con tokens BSDS | 🟢 **PASS** |
| **Safe Area & Insets** | WindowInsets Android | `SafeArea` iOS + notch + dynamic island | 🟢 **PASS** |
| **Accesibilidad** | Touch target min 48dp | `BSDimensions.minTouchTarget` (44/48dp) | 🟢 **PASS** |
| **Datos Reales / SSOT** | Firestore `/businesses`, `/orders` | Streaming idéntico desde Firestore | 🟢 **PASS** |
| **Mocks Prohibidos** | 0 mocks | 0 mocks introducidos | 🟢 **PASS** |

---

## 8. REGRESIÓN Y ANÁLISIS DE CÓDIGO ESTÁTICO
Se ejecutó la suite de análisis estático oficial mediante el SDK de Flutter (Dart 3.13.4):

```bash
& "C:\flutter_windows_3.47.5-stable\flutter\bin\flutter.bat" analyze lib/
Analyzing lib...                                                
No issues found! (ran in 7.5s)
```

- **Errores de compilación:** 0
- **Advertencias de análisis:** 0
- **Lints pendientes:** 0

---

## 9. VEREDICTO FINAL DE EMISIÓN

### 🟢 GREEN — CROSS-PLATFORM DESIGN CERTIFIED

El Design System Cross-Platform de BlueSystem Delivery queda formalmente certificado y congelado como **Baseline Oficial v2.2 Enterprise**.

A partir de este momento, queda prohibido en `flutter_client/**` crear vistas o componentes con colores, estilos, tamaños o bordes ad-hoc; todo nuevo desarrollo deberá consumir obligatoriamente los tokens y widgets de `lib/core/design_system/bsds_theme.dart`.
