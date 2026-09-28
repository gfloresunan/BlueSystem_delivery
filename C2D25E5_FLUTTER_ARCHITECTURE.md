# C2D.25E.5 — FLUTTER TARGET ARCHITECTURE SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Arquitectura de Código Único Multiplataforma

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ONE FLUTTER CODEBASE ARCHITECTURAL STACK                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [PRESENTATION LAYER]                                                      │
│   Material 3 • Dynamic Brand Theming • Widgets • Gatekeeper Guards          │
│                                │                                            │
│   [APPLICATION / CONTROLLERS]                                               │
│   State Management • Use Cases • ViewModels • Session Controllers           │
│                                │                                            │
│   [DOMAIN LAYER (Contracts & Entities)]                                     │
│   OrderEntity • TripEntity • TenantEntity • BrandEntity • Service Interfaces│
│                                │                                            │
│   [DATA / INFRASTRUCTURE LAYER]                                             │
│   Firebase Auth • Firestore Repositories • Cloud Functions Callables        │
│                                │                                            │
│   [PLATFORM ADAPTER LAYER]                                                  │
│   ┌────────────────────────────┴────────────────────────────┐               │
│   │                                                         │               │
│   ▼                                                         ▼               │
│ Android Native Hardware                               iOS Native Hardware   │
│ (FusedLocation, FCM, EncryptedPrefs)          (CoreLocation, APNs, Keychain)│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Estructura de Directorios del Proyecto Flutter

```text
flutter_client/
│
├── pubspec.yaml                 # Dependencias y metadatos del cliente
├── analysis_options.yaml        # Reglas de linting enterprise
│
├── lib/
│   ├── main.dart                # Entrypoint y bootstrap de la app
│   │
│   ├── core/                    # Módulos transversales del sistema
│   │   ├── config/              # AppConfigEntity y distribución
│   │   ├── tenant/              # Contexto de Tenant y modelo comercial
│   │   ├── brand/               # Contexto de Marca y BrandVisualConfig
│   │   ├── subscription/        # Planes, cuotas y módulos de suscripción
│   │   ├── auth/                # EIAM v3, Custom Claims y Roles
│   │   ├── gatekeeper/          # Evaluador puro de directivas de acceso
│   │   ├── errors/              # Excepciones tipadas y mapeo de errores
│   │   └── observability/       # Logger estructurado y auditoría segura
│   │
│   ├── domain/                  # Entidades de dominio e interfaces
│   │   ├── entities/            # Order, Trip, CourierLocation, UserProfile
│   │   └── services/            # Interfaces IAuthService, IOrderService, etc.
│   │
│   ├── data/                    # Implementaciones concretas de servicios
│   │   └── services/            # FirebaseAuthService, FirestorePlatformService, etc.
│   │
│   ├── platform/                # Adaptadores de capacidades del SO
│   │   ├── gps/                 # PlatformGpsAdapter (Geolocator)
│   │   ├── notifications/       # PlatformNotificationAdapter (FCM/APNs)
│   │   └── storage/             # PlatformSecureStorage (KeyStore/Keychain)
│   │
│   └── presentation/            # Capa visual reactiva
│       ├── theme/               # BrandThemeBuilder (Material 3)
│       └── widgets/             # GatekeeperGuard, BrandLogo, etc.
│
└── test/                        # Pruebas unitarias de contratos y aislamiento
    ├── gatekeeper_test.dart     # Verificación de directivas de seguridad
    └── brand_hydration_test.dart# Verificación de temas y serialización
```
