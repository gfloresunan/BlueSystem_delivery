# C2D26 — CURRENT FLUTTER STATE ASSESSMENT

**Phase:** C2D.26  
**Repository Layer:** `flutter_client/`  
**Classification:** TRACK B (Multi-Platform Commercial Client)  

---

## 1. Architectural Overview

The current Flutter codebase in `flutter_client/` represents the certified foundation from C2D.25E.5. It is cleanly partitioned into domain, data, core, presentation, and platform layers:

```
flutter_client/
├── lib/
│   ├── core/
│   │   ├── auth/          -> Canonical EIAM v3 claims & membership entities
│   │   ├── brand/         -> BrandEntity & BrandVisualConfig
│   │   ├── config/        -> AppConfigEntity & distribution/provider settings
│   │   ├── errors/        -> AppExceptions (TenantMismatch, GatekeeperDenied)
│   │   ├── gatekeeper/    -> Pure fail-closed authorization engine
│   │   ├── observability/ -> AppLogger with sanitization
│   │   ├── subscription/  -> SubscriptionEntity, quotas, and feature flags
│   │   └── tenant/        -> ActiveTenantContext & isolation checks
│   ├── data/
│   │   └── services/      -> Firestore, Functions, and Auth integrations
│   ├── domain/
│   │   ├── entities/      -> OrderEntity, TripEntity, CourierLocationEntity, UserProfileEntity
│   │   └── services/      -> Core service interfaces
│   ├── platform/
│   │   ├── gps/           -> PlatformGpsAdapter
│   │   ├── notifications/ -> PlatformNotificationAdapter
│   │   └── storage/       -> SecureStorageAdapter
│   ├── presentation/
│   │   ├── theme/         -> BrandThemeBuilder (Dynamic Material 3)
│   │   └── widgets/       -> GatekeeperGuard
│   └── main.dart          -> Base foundation entrypoint
└── test/
    ├── brand_hydration_test.dart
    └── gatekeeper_test.dart
```

---

## 2. Capability Readiness Matrix

| Feature Area | Foundation State (C2D.25E.5) | C2D.26 Target State |
|---|---|---|
| **App Shell & Routing** | Basic Scaffold in `main.dart` | Responsive dynamic shell, session lifecycle, route guards |
| **Authentication UI** | Service layer only | Complete multi-tenant login screen, dynamic brand styling |
| **Home / Dashboard** | None | Commercial overview, tenant & brand badges, Gatekeeper cards |
| **Orders Module** | Service & Entity | Full UI list, realtime streams, status filters, detail dialog |
| **Trips (X→Y)** | Service & Entity | Trips list, X→Y route info, realtime tracking screen |
| **Merchant / Catalog** | Not implemented | Product & catalog domain entities, merchant dashboard |
| **Courier / Fleet** | Service & Entity | Courier operational dashboard, active fleet map |
| **Platform Adapters** | Interfaces defined | Hardened multiplatform adapters for GPS, Maps, and FCM/APNs |
| **Test Coverage** | 2 test suites | 11 comprehensive unit and contract test suites |

---

## 3. Governance Compliance

- **Zero Physical Build:** Confirmed.
- **Zero APK / AAB / IPA:** Confirmed.
- **Zero Duplicated Logic:** Confirmed (Core backend retains state machine & pricing).
