# Phase 2D.27 — Cloud Functions Contracts & API Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Callable HTTPS Functions, Payload Schemas, Idempotency & Error Mapping`

---

## 1. Callable Functions Interface Comparison

| Callable Function Name | Backend Definition (`functions/src/`) | Flutter Wrapper (`CloudFunctionsService`) | Payload Validation | Auth / Context Required |
| :--- | :--- | :--- | :--- | :--- |
| `switchActiveTenantContext` | `functions/src/callables/identity.ts` | `switchTenantContext()` | `{ tenantId, brandId?, businessId?, branchId? }` | `isAuthenticated()` |
| `validateCouponCode` | `functions/src/callables/coupons.ts` | `validateCoupon()` | `{ code, tenantId, orderTotal }` | `isAuthenticated()` |
| `calculateDeliveryRouteCallable` | `functions/src/callables/calculateDeliveryRoute.ts` | `calculateDeliveryRoute()` | `{ origin: {lat, lng}, destination: {lat, lng}, tenantId }` | `isAuthenticated()` |

---

## 2. Error Contract & Mapping

In `flutter_client/lib/data/services/cloud_functions_service.dart`:
- `FirebaseFunctionsException` errors are intercepted and translated into strongly typed `BlueSystemException` instances.
- Error codes (`permissionDenied`, `invalidArgument`, `serverInternalError`) map deterministically into user-friendly localized messages.

---

## 3. Verdict

**CLOUD FUNCTIONS VERDICT:** 🟢 VERIFIED & ALIGNED.
