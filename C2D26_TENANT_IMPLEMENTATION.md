# C2D26 — TENANT ISOLATION IMPLEMENTATION

**Module:** Multi-Tenant Core Isolation  
**Files:** `flutter_client/lib/core/tenant/tenant_context.dart`, `flutter_client/lib/core/errors/app_exceptions.dart`  

---

## 1. Multi-Tenant Enforcement

1. **Token Claims Origin:** `tenantId` is extracted strictly from authenticated Firebase token claims (`CanonicalCustomClaimsV3.tenantId`).
2. **Context Binding:** Bound into `ActiveTenantContext` and passed down to all Firestore operations.
3. **Query Invariant:** Every Firestore collection query must append `.where('tenantId', isEqualTo: tenantId)`.
4. **Mismatch Guard:** If an entity's `tenantId` does not match the active session, `TenantIsolationException` is thrown immediately.
