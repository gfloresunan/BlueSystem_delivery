# Phase 2D.27 — Firestore Schema & Collection Contracts Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Canonical Collection Schemas, Field Types, Timestamps & Zero Parallel Collections`

---

## 1. Collection Contract Inventory

The Flutter client accesses only canonical, pre-existing Firestore collections:

| Collection Path | Flutter Service / Entity | Core Purpose | Zero-Fork Check | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/orders` | `FirestoreOperationsService` / `OrderEntity` | Commerce Order Lifecycle | 🟢 No `/flutter_orders` | 🟢 CANONICAL |
| `/deliveryTrips` | `FirestoreOperationsService` / `TripEntity` | X→Y Point-to-Point Delivery | 🟢 No `/flutter_trips` | 🟢 CANONICAL |
| `/ubicaciones_repartidores`| `FirestoreOperationsService` / `CourierLocation`| Real-Time Courier Telemetry | 🟢 No parallel sink | 🟢 CANONICAL |
| `/tenants` | `FirestorePlatformService` / `TenantEntity` | Multi-Tenant Organization | 🟢 No parallel metadata | 🟢 CANONICAL |
| `/brands` | `FirestorePlatformService` / `BrandEntity` | White-label Visual Configurations | 🟢 No parallel brands | 🟢 CANONICAL |
| `/subscriptions` | `FirestorePlatformService` / `SubscriptionEntity`| Feature Entitlements & Quotas | 🟢 No parallel plans | 🟢 CANONICAL |
| `/app_configs` | `FirestorePlatformService` / `AppConfigEntity` | Multi-Platform Dynamic Config | 🟢 No parallel configs | 🟢 CANONICAL |
| `/users` | `FirebaseAuthService` / `UserProfileEntity` | User Profiles & Settings | 🟢 No `/flutter_users` | 🟢 CANONICAL |
| `/user_devices` | `PlatformNotificationAdapter` | Multi-Device Push Token Sink | 🟢 Standard Multidevice | 🟢 CANONICAL |

---

## 2. Invariants & Security Rules Alignment

1. **Schema Exactness:** Field names (`tenantId`, `brandId`, `businessId`, `createdAt`, `updatedAt`, `status`, `deliveryFee`, `total`) match exact camelCase and integer/double conventions of BlueSystem Core.
2. **Security Rules Compliance:** All queries are filtered by `tenantId` to comply with `firestore.rules` (EIAM v2.2/v3).
3. **Verdict:** 🟢 VERIFIED & CERTIFIED.
