# C2D26 — COMMERCIAL CLIENT ARCHITECTURE

**Phase:** C2D.26  
**Architecture Classification:** TRACK B — Multi-Platform Client Layer  

---

## 1. System Topology

```
                               ┌────────────────────────┐
                               │    BLUE SYSTEM CORE    │
                               │  - Firestore           │
                               │  - Cloud Functions     │
                               │  - Firebase Auth       │
                               │  - EIAM v3 Engine      │
                               └───────────┬────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   TRACK A: ANDROID      │                   │    TRACK B: FLUTTER     │
       │   Reference Client      │                   │    Commercial Client    │
       │   app/                  │                   │    flutter_client/      │
       └─────────────────────────┘                   └────────────┬────────────┘
                                                                  │
                                           ┌──────────────────────┴──────────────────────┐
                                           ▼                                             ▼
                               ┌─────────────────────────┐                   ┌─────────────────────────┐
                               │     Flutter Android     │                   │       Flutter iOS       │
                               │     (Platform Layer)    │                   │     (Platform Layer)    │
                               └─────────────────────────┘                   └─────────────────────────┘
```

---

## 2. Layered Client Structure

1. **Presentation Layer (`lib/presentation/`)**:
   - `screens/`: `LoginScreen`, `CommercialHomeScreen`, `OrdersScreen`, `TripsScreen`, `MerchantDashboardScreen`, `CourierDashboardScreen`, `FleetMapScreen`.
   - `shell/`: `AppShell` with reactive bottom navigation, offline banner, and user context.
   - `providers/`: `SessionState` ChangeNotifier state container.
   - `theme/`: `BrandThemeBuilder` synthesizing Material 3 dynamic color schemes from `BrandVisualConfig`.
   - `widgets/`: `GatekeeperGuard`, `LoadingView`, `EmptyView`, `ErrorView`, `OfflineBanner`, `UnauthorizedView`.

2. **Domain Layer (`lib/domain/`)**:
   - `entities/`: `OrderEntity`, `TripEntity`, `CourierLocationEntity`, `UserProfileEntity`, `ProductEntity`, `BranchEntity`, `PromotionEntity`.
   - `services/`: Clean Architecture interfaces (`IAuthService`, `ITenantService`, `IBrandService`, `ISubscriptionService`, `IAppConfigService`, `IOrderService`, `ITripService`, `IFleetService`, `IMerchantService`, etc.).

3. **Data Layer (`lib/data/`)**:
   - `services/`: `FirestoreOperationsService`, `FirebaseAuthService`, `FirestorePlatformService`, `MerchantFirestoreService`, `CloudFunctionsService`.

4. **Core Layer (`lib/core/`)**:
   - `auth/`: `CanonicalCustomClaimsV3`, `MembershipV3Entity`, `EiamRole`.
   - `tenant/`: `ActiveTenantContext`, `TenantEntity`.
   - `brand/`: `BrandEntity`, `BrandVisualConfig`, `BrandMetadata`.
   - `subscription/`: `SubscriptionEntity`, `SubscriptionQuotas`, `PlanTier`.
   - `gatekeeper/`: `GatekeeperEngine`, `AccessDecision`, `GatekeeperContext`.
   - `config/`: `AppConfigEntity`, `DistributionConfig`, `ProvidersConfig`.
   - `observability/`: `AppLogger` with sanitized structured output.
   - `errors/`: `TenantIsolationException`, `GatekeeperDeniedException`.

5. **Platform Layer (`lib/platform/`)**:
   - `gps/`: `PlatformGpsAdapter`.
   - `maps/`: `MapPlatformAdapter` + `SentinelMapAdapter`.
   - `notifications/`: `PlatformNotificationAdapter`.
   - `storage/`: `SecureStorageAdapter`.
