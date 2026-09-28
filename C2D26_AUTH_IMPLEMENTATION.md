# C2D26 — AUTHENTICATION IMPLEMENTATION

**Module:** EIAM v3 Authentication & Claims Hydration  
**File:** `flutter_client/lib/presentation/screens/auth/login_screen.dart`  

---

## 1. Flow & Architecture

1. **User Credentials:** User inputs email and password.
2. **Backend Authentication:** `FirebaseAuthService.signInWithEmailPassword()` authenticates against Firebase Auth.
3. **Claims Hydration:** Custom claims are read and parsed into `CanonicalCustomClaimsV3`.
4. **Context Hydration:**
   - Active `TenantEntity` fetched from `/tenants/{tenantId}`.
   - Active `SubscriptionEntity` fetched from `/subscriptions/{tenantId}`.
   - Active `BrandEntity` fetched from `/brands/{brandId}`.
   - Active `AppConfigEntity` resolved from `/app_configs`.
5. **Gatekeeper Context:** Initialized with active user UID, membershipId, tenantId, brandId, and role.
6. **Error Handling:** Invalid credentials, suspended accounts, or expired tokens present localized user feedback.
