# C2D26 — SECURITY AUDIT

**Phase:** C2D.26 — Flutter Commercial Client Implementation  
**Classification:** ENTERPRISE SECURITY AUDIT — READ-ONLY ANALYSIS  

---

## 1. Threat Surface Analysis

| Threat Vector | Mitigation in Flutter Client | Status |
|---|---|---|
| **Tenant Crossover** | All Firestore queries include `where('tenantId', isEqualTo: tenantId)`. `TenantIsolationException` thrown on mismatch. | 🟢 MITIGATED |
| **Brand Crossover** | Brand resolved exclusively from authenticated claims `brandId`. No cross-brand data accessible via UI. | 🟢 MITIGATED |
| **Unauthorized Module Access** | `GatekeeperEngine.canAccessModule()` evaluated before every screen render. Fail-closed on null subscription. | 🟢 MITIGATED |
| **Subscription Bypass via UI** | UI module visibility is enforced server-side through Gatekeeper. UI-only hiding is supplementary, never sole guard. | 🟢 MITIGATED |
| **Malformed / Missing Claims** | `CanonicalCustomClaimsV3.fromTokenMap()` defaults to `EiamRole.guest` on any parse failure. | 🟢 MITIGATED |
| **Expired Session** | Firebase Auth SDK handles token expiry. `refreshIdToken()` callable. Expired session → `unauthenticated` state. | 🟢 MITIGATED |
| **Token / Secret Exposure in Logs** | `AppLogger` accepts only structured messages. No raw token, password, or key logging. | 🟢 MITIGATED |
| **Private Key Storage** | `flutter_secure_storage` used for device-local token persistence. Plaintext storage prohibited. | 🟢 MITIGATED |
| **FCM Token Leakage** | Token registration via `registerDeviceToken` goes to backend service, not stored client-side unencrypted. | 🟢 MITIGATED |
| **PII in Logs** | Logger does not print email, phone, or address fields. Only UIDs and tenant IDs included in structured logs. | 🟢 MITIGATED |
| **Insecure Maps API Key** | Maps API key is loaded from `AppConfigEntity.providers.mapsApiKey` retrieved from Firestore (backend-controlled). Not hardcoded. | 🟢 MITIGATED |
| **Duplicate Business Logic Client-Side** | Pricing, state transitions, and settlement delegated exclusively to Cloud Functions. Zero local computation of fares. | 🟢 MITIGATED |

---

## 2. Outstanding Risks

| Risk ID | Description | Priority | Resolution |
|---|---|---|---|
| **RISK-01** | Maps API key delivery via Firestore requires Firestore rules to restrict read access. | P2 | Validated via existing EIAM v3 Firestore rules (backend-controlled). |
| **RISK-02** | SentinelMapAdapter is a stub — no security concern, but must be replaced before production provisioning. | P3 | Blocked pending C2D.27. |

---

## 3. Security Verdict

```
TENANT CROSSOVER:       🟢 PROTECTED
BRAND CROSSOVER:        🟢 PROTECTED
SUBSCRIPTION BYPASS:    🟢 PROTECTED
SECRET EXPOSURE:        🟢 CLEAN
PII IN LOGS:            🟢 CLEAN
GATEKEEPER:             🟢 FAIL-CLOSED
SESSION EXPIRY:         🟢 HANDLED
```
