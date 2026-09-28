# BLUE SYSTEM DELIVERY ENTERPRISE
## SECURITY BASELINE V1.1 — AUTHORITATIVE CANONICAL SPECIFICATION

```text
Project:          BlueSystem Delivery Enterprise
Firebase Project: bluesystem-7c9af
Target Module:    Firestore Security Rules (firestore.rules)
Release Version:  Security Baseline V1.1 (Certification Correction Release)
Release Date:     2026-08-12
Auditor / Lead:   Senior Developer & Auditor de BlueSystem
Status:           🟢 SECURITY BASELINE V1.1 — CLOSED & CERTIFIED
Deployment:       cloud.firestore (firestore:rules ONLY)
Test Suite:       38 / 38 Mandatory Attack Tests PASSED (100% Success)
```

---

### 1. EXECUTIVE SUMMARY & CANONICAL GOVERNANCE STATEMENT

This document constitutes the **CANONICAL SECURITY BASELINE V1.1** for **BlueSystem Delivery Enterprise**. It serves as the single, authoritative **Source of Truth** for all data access policies, field authorization rules, tenant boundaries, and financial integrity constraints across the entire platform.

#### Summary of Baseline V1.1 Certification Corrections
Following the real code inventory across Merchant Web, Android App, Cloud Functions, and Governance Center, Baseline V1.1 resolves all remaining open certification items:

1. **Product Internal Metrics Segregation (`/products`):** Segregated `estimatedCost`, `totalRevenue`, `salesCount`, and `minStockAlert` into a protected subcollection `/products/{productId}/internal_metrics/{docId}` (`allow read: if isAuthenticated() && (ownsBusiness(...) || isPlatformAdmin())`), preventing unauthenticated marketplace buyers and competitors from scraping internal product margins or revenue metrics.
2. **Audit Event Field Protections (`/audit_events`):** Enforced field integrity rules on `severity` (restricting forgery of `CRITICAL_P0` system alerts), `targetUid` (blocking cross-tenant target tagging), and `timestamp` (blocking backdating or future-dating beyond ±5 minutes of `request.time`).
3. **Expanded 38-Test Suite:** Expanded the mandatory security test suite from 30 to 38 tests (`node scripts/test_rules_emulator.js`), achieving 100% pass status.

---

### 2. REAL CODE INVENTORY & CONSUMER COMPATIBILITY MAP

Prior to rule modification, a full code inventory was conducted to ensure zero breaking changes across all client applications:

```text
                         REAL CODE CONSUMER INVENTORY
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
 MERCHANT WEB                   ANDROID APP                    CLOUD FUNCTIONS
 [CatalogModule.tsx]            [Product.kt / Wizard]          [orders.ts / merchant.ts]
 - Reads public fields:         - Merchant Owner/Manager       - Admin SDK accesses
   id, name, price, active,       edits estimatedCost &          internal_metrics via
   stockStatus, category.         minStockAlert in Wizard.       privileged Admin SDK
 - Does NOT read internal       - Segregated to subcollection    (Bypasses rules safely).
   cost/revenue metrics.          /internal_metrics.
```

---

### 3. PHASE 1 — COMPLETE ACTOR MODEL & CLAIMS MAPPING

The EIAM v2.2 (Enterprise Identity & Access Management) actor hierarchy normalizes all JWT custom claims and user document roles across the platform.

| Canonical Actor | Normalized JWT Claim Aliases | Platform Scope | Organization Scope | Tenant Business Scope | Branch Scope | Allowed Collections |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **ANONYMOUS** | Unauthenticated | None | None | None | None | Read `/products` public catalog; Get `/invitations/{token}` by ID. |
| **CUSTOMER** | `role: "CUSTOMER"`, `rol: "cliente"`, `userType: "cliente"` | None | None | Own Orders / Account | Self | Read `/products`; Write `/users/{uid}`, `/orders` (Client branch). |
| **COURIER** | `role: "DRIVER"`, `rol: "motorizado"`, `userType: "motorizado"` | None | None | Assigned Orders | Active Route | Read assigned `/orders`, `/branches`; Update assigned `/orders` delivery fields. |
| **CASHIER** | `role: "CASHIER"`, `rol: "cajero"`, `eiamRole: "CASHIER"` | None | Tenant | Own Business | Assigned Branch | Read/Update assigned `/orders` (Kitchen/POS fields), `/products` stock toggles. |
| **COOK** | `role: "COOK"`, `rol: "cocinero"`, `eiamRole: "COOK"` | None | Tenant | Own Business | Assigned Branch | Read/Update assigned `/orders` (Kitchen notes/status), `/products` stock toggles. |
| **SUPERVISOR**| `role: "SUPERVISOR"`, `eiamRole: "SUPERVISOR"` | None | Tenant | Own Business | Assigned Branch | Manage branch operational orders, kitchen notes, catalog stock availability. |
| **MANAGER** | `role: "MANAGER"`, `eiamRole: "MANAGER"` | None | Holding/Org | Own Business | All Branches | Full Tenant Admin: `/businesses`, `/branches`, `/employees`, `/invitations`, `/products`. |
| **OWNER** | `role: "OWNER"`, `rol: "owner"`, `eiamRole: "OWNER"` | None | Holding/Org | Own Business | All Branches | Full Tenant Admin: `/businesses`, `/branches`, `/membership`, `/employees`, `/invitations`, `/products`. |
| **AUDITOR** | `role: "AUDITOR"`, `rol: "auditor"` | Global Read | Global Read | Global Read | Global Read | Read access to all 21 collections for compliance & audit logs. |
| **SUPPORT** | `role: "SUPPORT"`, `rol: "support"` | Global Read | Global Read | Global Read | Global Read | Read access to all customer/merchant tickets and operational states. |
| **ADMIN** | `role: "ADMIN"`, `admin: true` | Global Admin | Global Admin | Global Admin | Global Admin | Full administrative access across all collections except role history deletes. |
| **SUPER_ADMIN**| `role: "SUPER_ADMIN"`, `isSuperAdmin: true` | Absolute | Absolute | Absolute | Absolute | Unrestricted global access including hard deletes and system config. |

---

### 4. PHASE 2 — COMPLETE COLLECTION MATRIX

Evaluation of all 21 Firestore collections defined in `firestore.rules`:

| Collection Path | Read Policy | List Policy | Create Policy | Update Policy | Delete Policy | Tenant Boundary Guard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/organizations/{orgId}` | Auth (Platform Admin / Org Owner / Member) | Auth | Platform Admin / Org Owner | Platform Admin / Org Owner | Super Admin | `getOrgId() == orgId \|\| ownerUid == currentUid()` |
| `/users/{uid}` | Self / Platform Admin | Platform Admin | Self (`currentUid() == uid`) | Self (Identity keys locked) | Super Admin | `currentUid() == uid` |
| `/users/{uid}/role_history` | Self / Platform Admin | Platform Admin | Platform Admin | Platform Admin | Platform Admin | `currentUid() == uid \|\| isPlatformAdmin()` |
| `/users/{uid}/preferences` | Self Only | Self Only | Self Only | Self Only | Self Only | `currentUid() == uid` |
| `/users/{uid}/notificationSettings` | Self Only | Self Only | Self Only | Self Only | Self Only | `currentUid() == uid` |
| `/users/{uid}/shoppingCart` | Self Only | Self Only | Self Only | Self Only | Self Only | `currentUid() == uid` |
| `/users/{uid}/favorites` | Self Only | Self Only | Self Only | Self Only | Self Only | `currentUid() == uid` |
| `/users/{uid}/addresses` | Self Only | Self Only | Self Only | Self Only | Self Only | `currentUid() == uid` |
| `/users/{uid}/devices` | Self Only | Self Only | Self Only | Self Only | Self Only | `currentUid() == uid` |
| `/businesses/{businessId}` | Auth (Tenant / Admin) | Auth | Platform Admin / Business Admin | Platform Admin / Business Admin | Super Admin | `ownsBusiness(businessId)` |
| `/branches/{branchId}` | Auth (Tenant Staff / Admin) | Auth | Platform Admin / Business Admin | Platform Admin / Business Admin | Super Admin / Owner | `resource.data.businessId == getBusinessId()` |
| `/membership/{membershipId}`| Self / Tenant Owner / Admin | Auth | Platform Admin / Business Admin | Platform Admin / Business Admin | Super Admin / Owner | `resource.data.businessId == getBusinessId()` |
| `/employees/{employeeId}` | Self / Tenant Owner / Admin | Auth | Platform Admin / Business Admin | Platform Admin / Business Admin | Super Admin / Owner | `resource.data.businessId == getBusinessId()` |
| `/invitations/{token}` | **Public (`get: if true`)** | Platform Admin / Tenant Admin | Platform Admin / Business Admin | Whitelist Acceptance / Tenant Admin | Platform Admin / Business Admin | `resource.data.businessId == getBusinessId()` |
| `/sessions/{sessionId}` | Self / Platform Admin | Platform Admin | Self Only | Platform Admin | Platform Admin | `currentUid() == resource.data.uid` |
| `/devices/{deviceId}` | Self / Platform Admin | Platform Admin | Self / Platform Admin | Self / Platform Admin | Self / Super Admin | `resource.data.uid == currentUid()` |
| `/user_devices/{docId}` | Self / Platform Admin | Platform Admin | Self / Platform Admin | Self / Platform Admin | Self / Platform Admin | `resource.data.uid == currentUid()` |
| `/orders/{orderId}` | Customer / Tenant / Courier / Admin | Auth | Server-Controlled Fields Blocked | Role-Scoped Diff (Whitelist) | Super Admin | `ownsBusiness(resource.data.businessId)` |
| `/products/{productId}` | **Public (`read: if true`)** | **Public** | Platform Admin / Business Admin | Business Admin / Staff Stock Toggles | Platform Admin / Business Admin | `isWritingOwnBusinessId()` |
| `/products/{productId}/internal_metrics/{docId}` | **Tenant Owner / Admin Only** | Auth | Platform Admin / Business Admin | Platform Admin / Business Admin | Platform Admin / Business Admin | `ownsBusiness(resource.data.businessId)` |
| `/audit_events/{eventId}` | Self / Tenant / Admin | Auth | Actor Role, Severity & Timestamp Verified | Platform Admin | Platform Admin | `request.resource.data.uid == currentUid()` |
| `/roles/{roleId}` | Platform Admin / Business Admin | Auth | Platform Admin | Platform Admin | Platform Admin | `isPlatformAdmin()` |
| `/permissions/{docId}` | Platform Admin / Business Admin | Auth | Platform Admin | Platform Admin | Platform Admin | `isPlatformAdmin()` |

---

### 5. PHASE 3 & 4 — ORDERS AUTHORIZATION & FIELD INTEGRITY MODEL

#### Complete Orders Field Classification Table

| Field Name | Data Type | Customer Create | Merchant Staff Create | Merchant Admin Update | Staff Update | Courier Update | Platform Admin | Backend Server Controlled |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `customerId` / `clienteId` | String | 🔒 Own UID | 🔒 Unrestricted | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `businessId` | String | ✅ Target | 🔒 Own Tenant | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `branchId` | String | ✅ Target | 🔒 Own Branch | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `items` | Array | ✅ Cart Items | ✅ POS Items | ✅ Operational | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `subtotal` | Double | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **Server Engine** |
| `total` | Double | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **Server Engine** |
| `commission` | Double | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **EIAM Engine** |
| `deliveryFee` | Double | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **Geo Engine** |
| `paymentStatus` | String | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **Stripe Webhook** |
| `paymentMethod` | String | ✅ Customer Choice | ✅ Cash/POS | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `assignedCourierId` | String | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **Auto-Dispatcher**|
| `motorizadoId` | String | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ **Auto-Dispatcher**|
| `status` / `estado` | String | 🔒 `pending` only | 🔒 `pending` only | ✅ Operational | ✅ Operational | ✅ Delivery Flow | ✅ Full | ✅ Allowed |
| `historialEstados` | Array | 🔒 System | 🔒 System | ✅ Appended | ✅ Appended | ✅ Appended | ✅ Full | ✅ Allowed |
| `notasCocina` | String | ✅ Customer Note | ✅ POS Note | ✅ Operational | ✅ Kitchen Note | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `ubicacionRepartidor` | Map | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Active GPS | ✅ Full | ✅ Allowed |
| `createdAt` | Timestamp | 🔒 System | 🔒 System | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |
| `deliveredAt` | Timestamp | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Delivery Finish| ✅ Full | ✅ Allowed |
| `completedAt` | Timestamp | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | 🔒 **BLOCKED** | ✅ Full | ✅ Allowed |

---

### 6. PHASE 7 — AUDIT EVENTS TRAIL INTEGRITY (`/audit_events/{eventId}`)

#### Deployed Rule Code ([firestore.rules:L316-L339](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L316-L339))

```firestore
match /audit_events/{eventId} {
  allow read: if isAuthenticated() &&
                 (currentUid() == resource.data.uid ||
                  ownsBusiness(resource.data.businessId) ||
                  isPlatformAdmin());

  allow create: if isAuthenticated() && (
                   // Audit Event Actor Role, Severity, Target UID, & Timestamp validation (Baseline V1.1)
                   isPlatformAdmin() ||
                   (request.resource.data.uid == currentUid() &&
                    request.resource.data.get("actorRole", getRole()) == getRole() &&
                    (!request.resource.data.keys().hasAny(["businessId"]) ||
                     request.resource.data.businessId == null ||
                     request.resource.data.businessId == getBusinessId()) &&
                    !request.resource.data.get("event", "").matches("^(SYSTEM_|SUPER_ADMIN_).*") &&
                    request.resource.data.get("severity", "INFO") in ["INFO", "LOW", "MEDIUM", "HIGH", "WARNING", "ERROR", "info", "warning", "error"] &&
                    (!request.resource.data.keys().hasAny(["targetUid"]) ||
                     request.resource.data.targetUid == currentUid() ||
                     isPlatformAdmin() ||
                     ownsBusiness(request.resource.data.get("targetBusinessId", getBusinessId()))) &&
                    (!request.resource.data.keys().hasAny(["timestamp"]) ||
                     (request.resource.data.timestamp >= request.time - duration.value(5, "m") &&
                      request.resource.data.timestamp <= request.time + duration.value(5, "m"))))
                 );

  allow update, delete: if isPlatformAdmin();
}
```

---

### 7. PHASE 10 — MANDATORY 38 ATTACK TEST SUITE (100% SUCCESS)

Executed via automated test runner `scripts/test_rules_emulator.js`:

```text
═══════════════════════════════════════════════════════════════════════════════
   BLUESYSTEM ENTERPRISE — FIRESTORE SECURITY RULES EMULATOR TEST SUITE
   Baseline V1.1 Execution — 38 Mandatory Attack Scenarios
═══════════════════════════════════════════════════════════════════════════════

Evaluating rules file: C:\Users\geral\OneDrive\Escritorio\TECNOCOMP 2026\Sistemas\BlueSystem_delivery\firestore.rules
Rules Size: 20352 bytes

[TEST 01] Customer creates order with total manipulation                    Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 02] Customer creates order with subtotal manipulation                 Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 03] Customer sets paymentStatus=paid on create                        Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 04] Cashier creates financial order with total                        Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 05] Cook creates financial order with total                           Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 06] Supervisor creates financial order with total                     Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 07] Owner changes order total on update                               Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 08] Owner changes order commission on update                          Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 09] Courier changes order total on update                             Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 10] Customer changes businessId on order update                       Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 11] Staff changes businessId on order update                          Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 12] Cross-tenant order read (Business A vs Business B)                Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 13] Cross-tenant product mutation (Business A vs Business B)          Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 14] Cashier creates SUPER_ADMIN audit event                           Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 15] Customer creates SUPER_ADMIN audit event                          Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 16] Cross-tenant audit event creation                                 Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 17] Invitation targetRole escalation to OWNER                         Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 18] Invitation businessId tampering on acceptance                     Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 19] Invitation arbitrary field injection on acceptance                Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 20] Legitimate invitation acceptance (acceptedByUid, status, acceptedAt) Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 21] Anonymous invitation LIST query                                   Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 22] Public invitation GET by valid token ID                           Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 23] Cashier modifies product.price or cost                            Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 24] Cook deletes product document                                     Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 25] Courier modifies order status within allowed delivery flow        Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 26] Cashier modifies allowed operational fields (status, notasCocina) Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 27] Customer creates legitimate order without server fields           Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 28] Owner operates own business resources                             Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 29] Owner accesses other business resources                           Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 30] Platform Admin global access across all collections               Expected: ALLOW -> Result: ALLOW 🟢 PASS
[TEST 31] Anonymous reads product internal_metrics/estimatedCost            Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 32] Anonymous reads product internal_metrics/totalRevenue             Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 33] Anonymous reads product internal_metrics/salesCount               Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 34] Anonymous reads product internal_metrics/minStockAlert            Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 35] Cashier forges audit event severity CRITICAL_P0                   Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 36] Cashier sets arbitrary targetUid outside tenant                   Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 37] Cashier backdates audit event timestamp (-1 hour)                 Expected: DENY  -> Result: DENY 🟢 PASS
[TEST 38] Cashier future-dates audit event timestamp (+1 day)               Expected: DENY  -> Result: DENY 🟢 PASS

═══════════════════════════════════════════════════════════════════════════════
RESULTS: 38 / 38 MANDATORY ATTACK TESTS PASSED (100% SUCCESS)
═══════════════════════════════════════════════════════════════════════════════
```

---

### 8. PRODUCTION DEPLOYMENT LOG

* **Target Firebase Project:** `bluesystem-7c9af`
* **Deploy Command Executed:** `firebase deploy --only firestore:rules --project bluesystem-7c9af`
* **Deployment Output:**
  ```text
  === Deploying to 'bluesystem-7c9af'...
  i  deploying firestore
  i  cloud.firestore: checking firestore.rules for compilation errors...
  +  cloud.firestore: rules file firestore.rules compiled successfully
  i  firestore: uploading rules firestore.rules...
  +  firestore: released rules firestore.rules to cloud.firestore
  +  Deploy complete!
  ```

---

### 9. FINAL CERTIFICATION VERDICT

```text
═══════════════════════════════════════════════════════════════════════════════
   BLUESYSTEM ENTERPRISE — SECURITY BASELINE V1.1 CERTIFICATION
═══════════════════════════════════════════════════════════════════════════════

OFFICIAL STATUS:       🟢 SECURITY BASELINE V1.1 — CLOSED & CERTIFIED

FIREBASE PROJECT:      bluesystem-7c9af
DEPLOY TARGET:         cloud.firestore (firestore:rules ONLY)
RULES COMPILATION:     PASS (0 errors)
EMULATOR TEST SUITE:   38 / 38 MANDATORY ATTACK TESTS PASSED (100%)
CROSS-TENANT BOUNDARY: STRICTLY ENFORCED
FINANCIAL INTEGRITY:   FULLY PROTECTED (Client & Merchant Staff Lock)
PRODUCT METRICS LOCK:  SUBCOLLECTION /internal_metrics DENIED TO PUBLIC
AUDIT TRAIL INTEGRITY: ROLE, SEVERITY, TARGET UID & TIMESTAMP BACKDATE BLOCKED
INVITATION ACCEPTANCE: STRICT WHITELIST HASONLY ENFORCED

CANONICAL BASELINE:    SECURITY_BASELINE_V1.md ESTABLISHED AS SOLE SOURCE OF TRUTH

FINAL VERDICT:         🟢 SECURITY BASELINE V1.1 — CLOSED & CERTIFIED
═══════════════════════════════════════════════════════════════════════════════
```
