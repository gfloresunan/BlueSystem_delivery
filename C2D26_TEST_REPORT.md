# C2D26 — TEST REPORT

**Phase:** C2D.26  
**Test Execution Mode:** Static / Unit — NO physical build executed  

---

## Test Suite Summary

| Test ID | Category | Objective | Method | Status |
|---|---|---|---|---|
| **C2D26-TEST-01** | AUTH | EIAM v3 claims hydration and role parsing | Unit — `CanonicalCustomClaimsV3.fromTokenMap` | ✅ PASS |
| **C2D26-TEST-02** | AUTH | MembershipV3Entity round-trip serialization | Unit — toMap/fromMap cycle | ✅ PASS |
| **C2D26-TEST-03a** | GATEKEEPER | Allows access when module enabled and role is owner | Unit — `GatekeeperEngine.canAccessModule` | ✅ PASS |
| **C2D26-TEST-03b** | GATEKEEPER | Denies BANKING (disabledFeatures) | Unit — entitlementMissing path | ✅ PASS |
| **C2D26-TEST-03c** | GATEKEEPER | Tenant mismatch → deny | Unit — tenantMismatch path | ✅ PASS |
| **C2D26-TEST-03d** | GATEKEEPER | Expired subscription → deny | Unit — subscriptionExpired path | ✅ PASS |
| **C2D26-TEST-03e** | GATEKEEPER | Null subscription → fail closed | Unit — null guard | ✅ PASS |
| **C2D26-TEST-04a** | BRAND | BrandVisualConfig safe fallbacks | Unit — fromMap with invalid color | ✅ PASS |
| **C2D26-TEST-04b** | BRAND | BrandEntity round-trip | Unit — toMap/fromMap cycle | ✅ PASS |
| **C2D26-TEST-04c** | BRAND | Brand tenant isolation structural check | Unit — tenantId field presence | ✅ PASS |
| **C2D26-TEST-05** | APPCONFIG | AppConfigEntity contract parsing | Unit — fromMap Firestore payload | ✅ PASS |
| **C2D26-TEST-06a** | ORDERS | OrderEntity deserialization | Unit — fromMap with full payload | ✅ PASS |
| **C2D26-TEST-06b** | ORDERS | Order tenant isolation — tenantId not empty | Unit — field validation | ✅ PASS |
| **C2D26-TEST-07** | TRIPS | TripEntity X→Y contract parsing | Unit — fromMap with X→Y fields | ✅ PASS |
| **C2D26-TEST-08a** | MERCHANT | ProductEntity round-trip | Unit — toMap/fromMap cycle | ✅ PASS |
| **C2D26-TEST-08b** | MERCHANT | BranchEntity round-trip | Unit — toMap/fromMap cycle | ✅ PASS |
| **C2D26-TEST-09a** | FLEET | CourierLocation stale telemetry → isFresh false | Unit — timestamp check | ✅ PASS |
| **C2D26-TEST-09b** | FLEET | CourierLocation fresh telemetry → isFresh true | Unit — timestamp check | ✅ PASS |
| **C2D26-TEST-10** | PLATFORM ADAPTERS | SentinelMapAdapter no-op contract | Unit — all methods complete | ✅ PASS |
| **C2D26-TEST-11** | OBSERVABILITY | AppLogger info/warning/error no-throw | Unit — structured log calls | ✅ PASS |

---

## Blocked Tests

| Test | Reason | Classification |
|---|---|---|
| Physical login UI test | Requires device/emulator | `BLOCKED_BY_GOVERNANCE` |
| Realtime stream integration test | Requires live Firebase connection | `BLOCKED_BY_GOVERNANCE` |
| Map rendering test | Requires API key provisioning (C2D.27) | `BLOCKED_BY_GOVERNANCE` |

---

## Governance Confirmation

- `flutter build` executed: **0**
- `flutter run` executed: **0**
- APK generated: **0**
- Gradle executed: **0**
