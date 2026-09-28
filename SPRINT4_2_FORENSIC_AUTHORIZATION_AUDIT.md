# BLUE SYSTEM DELIVERY ENTERPRISE
## SPRINT 4.2 — FORENSIC AUTHORIZATION MATRIX AUDIT REPORT
### READ-ONLY FORENSIC SECURITY REVIEW

```text
Project:          BlueSystem Delivery Enterprise
Firebase Project: bluesystem-7c9af
Target Module:    Firestore Security Rules (firestore.rules) & Authorization Matrices
Audit Date:       2026-08-12
Auditor / Lead:   Senior Developer & Auditor de BlueSystem
Audit Type:       READ-ONLY Forensic Discovery & Multi-Matrix Security Audit
Execution Mode:   STRICTLY READ-ONLY (NO CODE/RULE MODIFICATIONS, NO DEPLOY)
Final Status:     🟡 FINDINGS — REMEDIATION REQUIRED
```

---

### 1. EXECUTIVE SUMMARY & AUDIT CONTEXT

Following the Sprint 4.1 deployment, a comprehensive **READ-ONLY forensic audit** was conducted across the entire authorization surface of `firestore.rules`, cross-referencing:
1. Deployed [firestore.rules](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules)
2. Android Data Models ([Models.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt), [MenuProduct.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/menu/MenuProduct.kt), [Product.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/Product.kt))
3. Merchant Web Types ([types.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/types.ts))
4. Governance Services ([governanceService.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js))

#### Execution Compliance Verification
- ❌ **NO** files were modified.
- ❌ **NO** `firestore.rules` edits were made.
- ❌ **NO** Cloud Functions, Frontend, or Auth changes were applied.
- ❌ **NO** `firebase deploy` commands were executed.

---

### 2. NEWLY DISCOVERED FINDINGS (SPRINT 4.2)

#### 🔴 Finding F-4.2-01 (P1 High): Merchant Staff / Admin Manual Order Create Bypasses Financial & Courier Controls

```text
FINDING ID:          F-4.2-01
SEVERITY:            P1 (High - Financial & Assignment Integrity Violation)
COLLECTION:          /orders/{orderId}
CURRENT RULE:        firestore.rules L273: (isWritingOwnBusinessId() && (isBusinessAdmin() || isBusinessStaff()))
ACTOR:               CASHIER, COOK, SUPERVISOR, MANAGER, OWNER
ATTACK PAYLOAD:      { customerId: "target_uid", businessId: "own_biz", status: "delivered", total: 1, subtotal: 1, paymentStatus: "paid", commission: 0, deliveryFee: 0, assignedCourierId: "courier_123" }
EXPECTED:            DENY on setting server-controlled financial/assignment fields during manual order creation.
ACTUAL:              ALLOW (200) — The rule branch contains zero key restrictions for merchant staff/admin order creation.
ROOT CAUSE:          The merchant staff order create branch checks only isWritingOwnBusinessId(), omitting field blacklist/whitelist controls.
BUSINESS IMPACT:     Cashiers or staff can manually insert orders pre-marked as paid, with zero commission, zero delivery fee, and false courier assignments directly into Firestore.
SECURITY IMPACT:     Bypasses financial accounting, commission settlement, and auto-dispatcher logic.
RECOMMENDED FIX:     Apply strict field whitelist (or server-controlled field blacklist) to merchant staff order creation.
```

---

#### 🟡 Finding F-4.2-02 (P1 Medium): Public Data Exposure of Product Cost, Margin, and Sales Metrics

```text
FINDING ID:          F-4.2-02
SEVERITY:            P1 (Medium - Business Confidentiality & Public Data Exposure)
COLLECTION:          /products/{productId}
CURRENT RULE:        firestore.rules L297: allow read: if true;
ACTOR:               Anonymous Marketplace User / Competitor / Public Scraper
ATTACK PAYLOAD:      getDoc(doc(db, "products", "prod_123"))
EXPECTED:            Public can read product catalog info (name, price, image, description), but NOT internal cost/margin metrics.
ACTUAL:              ALLOW (200) — Unauthenticated users receive the entire document, including estimatedCost, totalRevenue, salesCount, and minStockAlert.
ROOT CAUSE:          Product document schema mixes public marketplace data with merchant internal operational & financial metrics.
BUSINESS IMPACT:     Competitors can scrape exact product margins (estimatedCost), total revenue generated per product (totalRevenue), and sales volume (salesCount).
SECURITY IMPACT:     Public exposure of sensitive merchant financial metrics and inventory thresholds.
RECOMMENDED FIX:     Segregate internal metrics into a restricted subcollection (/products/{productId}/internal_metrics/{doc}) or clean document payload.
```

---

#### 🟡 Finding F-4.2-03 (P1 Medium): Audit Event Semantic & Target Identity Forgery

```text
FINDING ID:          F-4.2-03
SEVERITY:            P1 (Medium - Log Tampering & Audit Trail Pollution)
COLLECTION:          /audit_events/{eventId}
CURRENT RULE:        firestore.rules L318-327 (Validates uid, actorRole, and businessId, but unvalidates event, domain, targetUid, severity)
ACTOR:               CASHIER, COOK, CUSTOMER
ATTACK PAYLOAD:      { uid: currentUid(), actorRole: getRole(), businessId: getBusinessId(), event: "SECURITY_BREACH_ALERT", domain: "SYSTEM", severity: "CRITICAL_P0", targetUid: "victim_admin_uid" }
EXPECTED:            DENY on forging high-severity system alerts or arbitrary target UIDs.
ACTUAL:              ALLOW (200) — User can inject arbitrary event names, high severity levels, and target UIDs into audit logs.
ROOT CAUSE:          Rule validates actor identity and tenant boundary, but leaves log event semantics and target metadata unrestricted.
BUSINESS IMPACT:     Malicious users can pollute audit logs with false security breach alerts or frame other users by setting arbitrary targetUid.
SECURITY IMPACT:     Loss of audit log semantic integrity and potential alert fatigue/distraction for security operations.
RECOMMENDED FIX:     Restrict non-admin audit event creation to whitelisted event types and validate targetUid boundaries.
```

---

### 3. P0 — ORDER CREATE ACTOR AUTHORIZATION MATRIX

Evaluating order creation permissions across all system actors against [firestore.rules:L266-L276](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L266-L276):

| Field / Property | Customer | Cashier | Cook | Supervisor | Manager | Owner | Courier | Platform Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Can Create Order?** | ✅ YES | 🚨 YES | 🚨 YES | 🚨 YES | 🚨 YES | 🚨 YES | 🔒 NO | ✅ YES |
| `customerId` / `clienteId` | 🔒 Own UID Only | 🚨 Arbitrary | 🚨 Arbitrary | 🚨 Arbitrary | 🚨 Arbitrary | 🚨 Arbitrary | 🔒 DENY | ✅ Any UID |
| `businessId` | ✅ Target Biz | 🔒 Own Biz | 🔒 Own Biz | 🔒 Own Biz | 🔒 Own Biz | 🔒 Own Biz | 🔒 DENY | ✅ Any Biz |
| `status` | 🔒 `pending` only | 🚨 Arbitrary | 🚨 Arbitrary | 🚨 Arbitrary | 🚨 Arbitrary | 🚨 Arbitrary | 🔒 DENY | ✅ Any |
| `subtotal` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `total` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `commission` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `deliveryFee` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `paymentStatus` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `assignedCourierId` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `motorizadoId` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `deliveredAt` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |
| `completedAt` | 🔒 **BLOCKED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🚨 **ALLOWED** | 🔒 DENY | ✅ Any |

* **Analysis:** While Customer order creation is strictly hardened against field injections, the merchant staff branch `(isWritingOwnBusinessId() && (isBusinessAdmin() || isBusinessStaff()))` allows cashiers, cooks, and managers to create orders with arbitrary totals, payment statuses, and courier assignments directly in Firestore.

---

### 4. P1 — FINANCIAL FIELD INTEGRITY MATRIX

Inventory of all financial fields extracted from codebase models ([Models.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt), [types.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/shared/types.ts)):

| Financial Field | Client Controlled? | Merchant Controlled? | Backend Controlled? | Immutable? | Derived? | Firestore Rules Protection Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `subtotal` | 🔒 Blocked Create | 🚨 Unrestricted Create | ✅ Server Calc | 🔒 Immutable on Update | Yes (Items Sum) | 🟢 Protected for Client & Update |
| `total` | 🔒 Blocked Create | 🚨 Unrestricted Create | ✅ Server Calc | 🔒 Immutable on Update | Yes (Subtotal+Fee-Disc) | 🟢 Protected for Client & Update |
| `deliveryFee` / `costoEnvio` | 🔒 Blocked Create | 🚨 Unrestricted Create | ✅ Geo Engine | 🔒 Immutable on Update | Yes (Distance) | 🟢 Protected for Client & Update |
| `commission` | 🔒 Blocked Create | 🚨 Unrestricted Create | ✅ EIAM Engine | 🔒 Immutable on Update | Yes (Plan %) | 🟢 Protected for Client & Update |
| `paymentStatus` | 🔒 Blocked Create | 🚨 Unrestricted Create | ✅ Webhook Gate | 🔒 State Transition | No | 🟢 Protected for Client & Update |
| `amountPaid` | ⚠️ Unchecked | ⚠️ Unchecked | ✅ Payment Engine | No | No | 🟡 Unchecked in Rules |
| `cashReceived` | ⚠️ Unchecked | ⚠️ Unchecked | ❌ POS Input | No | No | 🟡 Unchecked in Rules |
| `changeNeeded` | ⚠️ Unchecked | ⚠️ Unchecked | ✅ Server Calc | No | Yes | 🟡 Unchecked in Rules |
| `refundAmount` | 🔒 Unrestricted | 🔒 Unrestricted | ✅ Refund Trigger | 🔒 Immutable | Yes | 🟡 Unchecked on Create |

---

### 5. P1 — ORDER IDENTITY INTEGRITY MATRIX

| Identity Field | Customer Permission | Merchant Staff Permission | Courier Permission | Platform Admin | Rule Guard Evidence |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `customerId` / `clienteId` | Create (Own UID), Update (DENY) | Create (Unrestricted), Update (DENY) | Create (DENY), Update (DENY) | Full Control | `!diff().affectedKeys().hasAny(["customerId", "clienteId"])` |
| `businessId` | Create (Target), Update (DENY) | Create (Own Only), Update (DENY) | Create (DENY), Update (DENY) | Full Control | `ownsBusiness(...) && !diff().hasAny(["businessId"])` |
| `assignedCourierId` / `motorizadoId` | Create (DENY), Update (DENY) | Create (Unrestricted), Update (DENY) | Create (DENY), Update (DENY) | Full Control | `!keys().hasAny(["assignedCourierId", ...])` |
| `createdAt` | Create (Set), Update (DENY) | Create (Set), Update (DENY) | Create (DENY), Update (DENY) | Full Control | `!diff().affectedKeys().hasAny(["createdAt"])` |

---

### 6. P1 — AUDIT EVENTS FIELD INTEGRITY MATRIX (`/audit_events/{eventId}`)

Evaluation of `/audit_events/{eventId}` document fields against [firestore.rules:L315-L330](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L315-L330):

| Audit Event Field | Client Controlled? | Rule Protection Guard | Integrity Risk | Security Classification |
| :--- | :---: | :--- | :--- | :---: |
| `uid` | 🔒 NO | `request.resource.data.uid == currentUid()` | 🔒 Cannot forge actor UID | 🟢 HARDENED |
| `actorRole` | 🔒 NO | `request.resource.data.get("actorRole", getRole()) == getRole()` | 🔒 Cannot forge higher roles | 🟢 HARDENED |
| `businessId` | 🔒 NO | `request.resource.data.businessId == getBusinessId()` | 🔒 Tenant isolated | 🟢 HARDENED |
| `event` | 🚨 YES | **Unvalidated** in rules | 🚨 Arbitrary event names | 🟡 UNPROTECTED SEMANTICS |
| `domain` | 🚨 YES | **Unvalidated** in rules | 🚨 Arbitrary domain names | 🟡 UNPROTECTED SEMANTICS |
| `severity` | 🚨 YES | **Unvalidated** in rules | 🚨 Can inject `CRITICAL_P0` | 🟡 UNPROTECTED SEMANTICS |
| `targetUid` | 🚨 YES | **Unvalidated** in rules | 🚨 Can target non-tenant UIDs | 🟡 UNPROTECTED TARGET |
| `timestamp` / `createdAt` | 🚨 YES | **Unvalidated** in rules | 🚨 Can backdate or future date | 🟡 UNPROTECTED TIMESTAMPS |

---

### 7. P1 — PRODUCT PUBLIC READ DATA EXPOSURE MATRIX

Analysis of public access to `/products/{productId}` ([firestore.rules:L297](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L297)):

| Product Field | Public Readable? | Business Sensitivity | Intended Exposure | Risk Level |
| :--- | :---: | :---: | :---: | :---: |
| `name`, `description`, `imageUrl` | ✅ YES | Public Marketplace | Public Catalog | 🟢 Intended Public |
| `price`, `originalPrice`, `category` | ✅ YES | Public Marketplace | Public Catalog | 🟢 Intended Public |
| `isAvailable`, `stockStatus`, `allergens` | ✅ YES | Public Marketplace | Public Catalog | 🟢 Intended Public |
| `estimatedCost` | 🚨 **YES** | **Internal Financial** | **Merchant Admin Only** | 🔴 **PUBLIC EXPOSURE (P1)** |
| `totalRevenue` | 🚨 **YES** | **Internal Financial** | **Merchant Admin Only** | 🔴 **PUBLIC EXPOSURE (P1)** |
| `salesCount` | 🚨 **YES** | **Sensitive Business Metric** | **Merchant Admin Only** | 🟡 **PUBLIC EXPOSURE (P1)** |
| `minStockAlert` | 🚨 **YES** | **Internal Operations** | **Merchant Admin Only** | 🟡 **PUBLIC EXPOSURE (P1)** |

---

### 8. P1 — INVITATION AUTHORIZATION MATRIX (`/invitations/{token}`)

Evaluating `/invitations/{token}` operations against [firestore.rules:L196-L220](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L196-L220):

| Operation / Field | Public Anonymous | Invited User (`INVITEE`) | Merchant Admin (`OWNER`/`MANAGER`) | Platform Admin |
| :--- | :---: | :---: | :---: | :---: |
| **GET Single Invitation (`allow get`)** | ✅ ALLOW (`if true`) | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW |
| **LIST Invitations (`allow list`)** | 🔒 DENY | 🔒 DENY | 🔒 Own Tenant Only | ✅ Global List |
| **CREATE Invitation (`allow create`)** | 🔒 DENY | 🔒 DENY | ✅ Own Tenant Only | ✅ Global Create |
| **UPDATE `acceptedByUid`** | 🔒 DENY | ✅ Set (Own UID Only) | ✅ Manage | ✅ Manage |
| **UPDATE `status`** | 🔒 DENY | ✅ `"ACCEPTED"` Only | ✅ Manage | ✅ Manage |
| **UPDATE `acceptedAt`** | 🔒 DENY | ✅ Set Timestamp | ✅ Manage | ✅ Manage |
| **UPDATE `email`, `targetRole`, `businessId`** | 🔒 DENY | 🔒 **DENY (`hasOnly`)** | ✅ Manage | ✅ Manage |
| **DELETE Invitation (`allow delete`)** | 🔒 DENY | 🔒 DENY | ✅ Own Tenant Only | ✅ Global Delete |

---

### 9. MULTI-TENANT ISOLATION MATRIX

Testing cross-tenant boundaries between **Business A** and **Business B**:

| Collection | Tenant Action | Tenant A User -> Business A | Tenant A User -> Business B | Platform Admin | Isolation Result |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `/orders` | READ | ✅ ALLOW | 🔒 **DENY** (`ownsBusiness` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/orders` | CREATE | ✅ ALLOW | 🔒 **DENY** (`isWritingOwnBusinessId` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/orders` | UPDATE | ✅ ALLOW | 🔒 **DENY** (`ownsBusiness` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/products` | READ | ✅ ALLOW | 🔓 **PUBLIC READ (Marketplace)** | ✅ ALLOW | 🟢 Public Catalog |
| `/products` | CREATE | ✅ ALLOW | 🔒 **DENY** (`isWritingOwnBusinessId` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/products` | UPDATE | ✅ ALLOW | 🔒 **DENY** (`isWritingOwnBusinessId` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/products` | DELETE | ✅ ALLOW | 🔒 **DENY** (`ownsBusiness` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/audit_events` | READ | ✅ ALLOW | 🔒 **DENY** (`ownsBusiness` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/audit_events` | CREATE | ✅ ALLOW | 🔒 **DENY** (`businessId == getBusinessId()`) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/invitations` | LIST | ✅ ALLOW | 🔒 **DENY** (`businessId == getBusinessId()`) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |
| `/invitations` | UPDATE | ✅ ALLOW | 🔒 **DENY** (`isWritingOwnBusinessId` fails) | ✅ ALLOW | 🟢 STRICTLY ISOLATED |

---

### 10. RECOMMENDED REMEDIATION PLAN (PROPOSED SPRINT 4.3)

When authorization for Sprint 4.3 remediation is requested, the following surgical patches should be applied:

1. **Merchant Staff Order Create Hardening (`/orders/{orderId}`):**
   - Apply strict field restrictions on merchant staff/admin order creation to prevent manual insertion of pre-paid or uncommissioned orders.
2. **Product Internal Metrics Segregation (`/products/{productId}`):**
   - Move `estimatedCost`, `totalRevenue`, `salesCount`, and `minStockAlert` out of the public `/products` document or restrict client fields via custom rule payload filters.
3. **Audit Event Semantic Whitelisting (`/audit_events/{eventId}`):**
   - Restrict non-admin audit log creation to whitelisted event types (`event in [...]`) and validate `timestamp` freshness.

---

### 🛑 STOP CONDITION ALCANZADA

La auditoría forense **Sprint 4.2 Read-Only** ha finalizado.
- ❌ **NO** se modificaron archivos de código ni reglas.
- ❌ **NO** se ejecutaron comandos de despliegue.

**Estado Final de Auditoría:** 🟡 **FINDINGS — REMEDIATION REQUIRED** (Se identificaron 3 hallazgos P1 para consideración en el próximo Sprint 4.3).
