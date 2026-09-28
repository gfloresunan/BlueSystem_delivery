# Phase 2D.27 — Current Integration State Report

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Track B Commercial Flutter Client Integration State & Touchpoints`

---

## 1. Architectural Posture

The current integration state represents the convergence of the **Track B Commercial Multi-Platform Foundation** with the authoritative **Blue System Core Backend**:

```
                              ┌───────────────────────────────────┐
                              │     AUTHORITATIVE CORE BACKEND    │
                              │ (Firestore / Functions / EIAM v3) │
                              └─────────────────┬─────────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
            ┌──────────▼──────────┐                           ┌──────────▼──────────┐
            │       TRACK A       │                           │       TRACK B       │
            │   Android Native    │                           │  Commercial Flutter │
            │  Reference Client   │                           │     Client Core     │
            │       (app/)        │                           │  (flutter_client/)  │
            └──────────┬──────────┘                           └──────────┬──────────┘
                       │                                                 │
          ┌────────────┴────────────┐                       ┌────────────┴────────────┐
          │                         │                       │                         │
  [Pure Native Kotlin]      [Isolated Config]       [Platform Adapters]       [Presentation & Theme]
   • Orders / Trips SSOT     • google-services       • GPS (Geolocator)        • Dynamic App Shell
   • Control Tower v2.2      • Target SDK 34         • Maps (Sentinel Stub)    • BrandThemeBuilder
   • Official Act PDF        • Maps Native SDK       • Push (FCM + APNs)       • Reactive Gatekeeper
                                                     • Secure Storage          • Session State
```

---

## 2. Integration Touchpoint Inventory

| Touchpoint | Interface Class | Core Target | Implementation State | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `FirebaseAuthService` | Firebase Auth + Custom Claims | Complete EIAM v3 parser | 🟢 VERIFIED (Static & Contract) |
| **Active Tenant Switch** | `CloudFunctionsService` | `switchActiveTenantContext` | Type-safe callable wrapper | 🟢 VERIFIED (Contract Aligned) |
| **Catalog & Products** | `FirestorePlatformService` | `/tenants/{id}/products` | Paged query abstraction | 🟢 VERIFIED (Schema Aligned) |
| **Orders Lifecycle** | `FirestoreOperationsService`| `/orders` | Canonical schema mapping | 🟢 VERIFIED (Schema Aligned) |
| **Trips Lifecycle (X→Y)**| `FirestoreOperationsService`| `/deliveryTrips` | Canonical schema mapping | 🟢 VERIFIED (Schema Aligned) |
| **Courier Telemetry** | `FirestoreOperationsService`| `/ubicaciones_repartidores` | High-frequency GPS sink | 🟢 VERIFIED (Schema Aligned) |
| **Promotions & Coupons**| `CloudFunctionsService` | `validateCouponCode` | Authoritative validation | 🟢 VERIFIED (Contract Aligned) |
| **Distance & Routing** | `CloudFunctionsService` | `calculateDeliveryRouteCallable` | Backend distance matrix | 🟢 VERIFIED (Contract Aligned) |
| **Push Notifications** | `PlatformNotificationAdapter`| `/users` + `/user_devices` | Multi-device FCM/APNs | 🟢 HARDENED & VERIFIED |
| **Encrypted Storage** | `PlatformSecureStorage` | Keystore (And) / Keychain (iOS)| AES encrypted preferences | 🟢 VERIFIED (Adapter Interface) |

---

## 3. Boundary & Invariant Assessment

1. **Zero Domain Duplication:** The Flutter client does not compute delivery fares, discount mechanics, order transition validations, or token claims generation.
2. **Track A Non-Interference:** The directory `app/` has zero modified files, preserving the Android Native Reference client baseline.
3. **Multi-Tenant Partitioning:** All data queries mandate `tenantId` parameterization matching active token claims.
