# C2D.25E.5 — CURRENT FLUTTER STATE REPORT
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Estado de Implementación de Flutter

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUTTER FOUNDATION STATE BREAKDOWN                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Flutter Project Root: /flutter_client/                                      │
│ Foundation Status: 🟢 IMPLEMENTED & STRUCTURALLY COMPLETE                   │
│ Build Status: 🔒 LOCKED (0 Builds Executed / No APK / No IPA)                │
│ Codebase Model: Single Multi-Platform Codebase (Android & iOS)              │
│ Target Platforms: FLUTTER ANDROID / FLUTTER IOS                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Inventario de Componentes Flutter Implementados

1. **Configuración de Proyecto (`flutter_client/`)**:
   - `pubspec.yaml`: Dependencias canónicas de Firebase, Capacidades de Plataforma y Testing.
   - `analysis_options.yaml`: Reglas estrictas de linting Dart.
   - `lib/main.dart`: Bootstrap desacoplado con resolución dinámica de temas de marca.

2. **Capa Core (`flutter_client/lib/core/`)**:
   - `config/app_config.dart`: Contratos `AppConfigEntity`, `AppDistributionConfig`, `AppProviderConfig`.
   - `tenant/tenant_context.dart`: Contratos `TenantEntity`, `CommercialModel`, `TenantStatus`.
   - `brand/brand_context.dart`: Contratos `BrandEntity`, `BrandVisualConfig`, fallback canónico seguro.
   - `subscription/subscription_context.dart`: `SubscriptionEntity`, `SubscriptionQuotas`, flags y módulos.
   - `auth/auth_context.dart`: `MembershipV3Entity`, `CanonicalCustomClaimsV3`, roles EIAM v3.
   - `gatekeeper/gatekeeper.dart`: `GatekeeperEngine`, `AccessDecision`, directiva `canAccessModule`.
   - `errors/app_exceptions.dart`: Jerarquía de excepciones tipadas (`TenantIsolationException`, `GatekeeperDeniedException`, etc.).
   - `observability/app_logger.dart`: Logger estructurado con sanitización estricta de PII.

3. **Capa de Dominio (`flutter_client/lib/domain/`)**:
   - `entities/order_entity.dart`: Contrato canónico de pedidos `/orders`.
   - `entities/trip_entity.dart`: Contrato canónico de viajes X→Y `/deliveryTrips`.
   - `entities/courier_location_entity.dart`: Contrato de telemetría GPS `/ubicaciones_repartidores`.
   - `entities/user_profile_entity.dart`: Contrato de usuario `/users`.
   - `services/core_service_interfaces.dart`: Interfaces abstractas puras para todos los servicios del Core.

4. **Capa de Datos (`flutter_client/lib/data/`)**:
   - `services/firebase_auth_service.dart`: Integración Firebase Auth + JWT Claims.
   - `services/firestore_platform_service.dart`: Persistencia e hidratación de Tenants, Brands, Subscriptions y AppConfigs.
   - `services/firestore_operations_service.dart`: Transacciones y streams en tiempo real de Pedidos, Viajes y Flota.
   - `services/cloud_functions_service.dart`: Invocación de Callables de backend (Cambio de tenant, cupones, ruteo).

5. **Capa de Adaptadores de Plataforma (`flutter_client/lib/platform/`)**:
   - `gps/gps_adapter.dart`: Geolocalización y stream de posición con permisos seguros.
   - `notifications/notification_adapter.dart`: Manejo de tokens FCM y notificaciones locales.
   - `storage/secure_storage_adapter.dart`: Almacenamiento cifrado (EncryptedSharedPreferences / iOS Keychain).

6. **Capa de Presentación & Temas (`flutter_client/lib/presentation/`)**:
   - `theme/brand_theme_builder.dart`: Sintetizador de `ThemeData` Material 3 a partir de `BrandVisualConfig`.
   - `widgets/gatekeeper_guard.dart`: Widget guardián que evalúa permisos del Gatekeeper reactivamente.

7. **Pruebas Unitarias Estáticas (`flutter_client/test/`)**:
   - `gatekeeper_test.dart`: Validación de directivas de suscripción, expiración y aislamiento.
   - `brand_hydration_test.dart`: Validación de serialización, fallbacks y parseo de configuraciones.

---

### 3. Matriz de Estado de Artefactos

| Artefacto | Estado | Justificación de Gobernanza |
| :--- | :--- | :--- |
| **Flutter Foundation Code** | 🟢 READY | Implementado respetando todos los contratos del Core |
| **Flutter Android Artifact (APK/AAB)** | 🔒 NOT BUILT | Bloqueado por Gobernanza (Fase de Fundación) |
| **Flutter iOS Artifact (IPA)** | 🔒 NOT BUILT | Bloqueado por Gobernanza (Fase de Fundación) |
| **Android Native Reference App** | 🟢 PROTECTED | Intacta en `app/`, Track A activo |
