# Phase 2D.27 — Authentication & EIAM v3 Integration Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `Firebase Auth Integration, Canonical Custom Claims v3, & Client Read-Only Invariant`

---

## 1. Auth & Claims Architecture

The Flutter client integrates with EIAM v3 strictly as a **consumer of claims**:

```
                  ┌───────────────────────────────┐
                  │      FIREBASE AUTH ENGINE     │
                  └───────────────┬───────────────┘
                                  │ (JWT Token + Custom Claims)
                                  ▼
                  ┌───────────────────────────────┐
                  │   CanonicalCustomClaimsV3     │
                  │   • role (EiamRole)           │
                  │   • tenantId, brandId         │
                  │   • orgId, businessId         │
                  │   • status, eiamVer: 3        │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │     SessionState / Context    │
                  │  (Read-Only Client Hydration) │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │      Reactive Gatekeeper      │
                  │ (Local UI Enforcement Check)  │
                  └───────────────────────────────┘
```

---

## 2. Invariant Verification

| Invariant | Audit Verification | Status |
| :--- | :--- | :--- |
| **Zero Client Claims Issuance** | Flutter client contains zero code calling `setCustomUserClaims` or backend admin APIs | 🟢 CONFIRMED |
| **Zero Client Claims Mutation** | Custom claims are hydrated read-only via `IdTokenResult.claims` | 🟢 CONFIRMED |
| **Role Enum Type Safety** | Exhaustive mapping for 12 canonical roles: `superAdmin`, `admin`, `auditor`, `support`, `owner`, `manager`, `supervisor`, `cashier`, `cook`, `driver`, `client`, `guest` | 🟢 CONFIRMED |
| **Fail-Closed Fallback** | Unrecognized roles or corrupted claim maps default safely to `EiamRole.guest` | 🟢 CONFIRMED |

---

## 3. Verdict

**AUTH VERDICT:** 🟢 VERIFIED & CERTIFIED (Read-only EIAM v3 consumption fully operational).
