# BLUE SYSTEM DELIVERY ENTERPRISE
## BUSINESS INTEGRITY & FIELD-LEVEL AUTHORIZATION AUDIT REPORT

```text
Project:          BlueSystem Delivery Enterprise
Firebase Project: bluesystem-7c9af
Target Module:    Firestore Security Rules (firestore.rules) & Data Integrity
Audit Date:       2026-08-12
Auditor / Lead:   Senior Developer & Auditor de BlueSystem
Audit Type:       Read-Only Field-Level Security & Adversarial Vulnerability Audit
Status:           DISCOVERY COMPLETE — FIELD-LEVEL VULNERABILITIES IDENTIFIED
```

---

### 1. EXECUTIVE SUMMARY & AUDIT CONTEXT

Following the deployment of Firestore Security Rules Phase P0 (Sprint 2), this forensic audit performed a deep, field-level security review of resource mutations (`create`, `update`) across core collections (`/orders`, `/invitations`, `/products`, `/audit_events`).

While collection-level tenant isolation is now enforced, inspecting document diffs, state transitions, and payload field injections revealed **3 NEW CRITICAL FIELD-LEVEL VULNERABILITIES (P0)** and **2 HIGH-RISK ROLE CONTROL DEFECTS (P1)**:

1. **Invitation Hijacking Attack (`/invitations` update — P0):** `currentUid() == request.resource.data.get("acceptedByUid", "")` checks incoming request data rather than existing resource data, allowing ANY authenticated user to hijack pending invitations, accept them under their own UID, and modify target roles.
2. **Order Financial & Identity Mutation (`/orders` update — P0):** Lack of field diff restrictions (`affectedKeys()`) allows any merchant staff member (`CASHIER`, `COOK`) or courier to modify order `total`, `commission`, `paymentStatus`, `customerId`, and `businessId` retroactively.
3. **Audit Event Role Forgery (`/audit_events` create — P0):** Lack of `actorRole` validation allows any authenticated user to create audit log entries claiming `actorRole = "SUPER_ADMIN"` or `"PLATFORM_ADMIN"`.
4. **Product Price & Cost Alteration by Operational Staff (`/products` update — P1):** Cashiers and cooks (`isBusinessStaff()`) have full permission to alter product prices, costs, and delete menu items.
5. **Unvalidated Client-Controlled Order Fields (`/orders` create — P1):** Customers can inject `assignedCourierId`, `paymentStatus = "paid"`, `deliveryFee = 0`, and `commission = 0` during order creation.

---

### 2. ORDERS ACTOR & FIELD-LEVEL MATRIX

#### Orders Actor Permissions
```text
                    ORDERS FIELD & ACTOR AUTHORIZATION
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     CUSTOMER       MERCHANT        ADMIN
        │              │              │
        ▼              ▼              ▼
 customerId == UID  businessId == own   isPlatformAdmin
 status == pending  staff authorized    (Global Override)
 NO price override  NO identity change
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
            FIELD DIFF SECURITY RULES
```

#### Orders Field-Level Attack & Validation Matrix

| Order Field | Written on CREATE by | Modifiable on UPDATE by | Client / Server Controlled | Security Rule Status | Risk / Vulnerability |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `customerId` | Customer | Merchant / Courier / Admin | Client | ⚠️ Validated on Create | 🔴 **UNPROTECTED on Update** (Identity swap) |
| `clienteId` | Customer | Merchant / Courier / Admin | Client | ⚠️ Validated on Create | 🔴 **UNPROTECTED on Update** (Identity swap) |
| `businessId` | Customer / Merchant | Merchant / Courier / Admin | Client | 🚨 **NOT VALIDATED on Customer Create** | 🔴 **UNPROTECTED on Update** (Tenant swap) |
| `status` / `estado` | Customer / Merchant | Merchant / Courier / Admin | Client | ⚠️ Validated on Create | 🔴 **NO STATE MACHINE** (Arbitrary state jump) |
| `subtotal` / `total` | Customer / Merchant | Merchant / Courier / Admin | Client | 🚨 **CLIENT CONTROLLED** | 🔴 **FINANCIAL FRAUD** (Prices modifiable) |
| `commission` | Customer / Merchant | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **FINANCIAL FRAUD** (Fee bypass) |
| `deliveryFee` | Customer / Merchant | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **FINANCIAL FRAUD** (Fee bypass) |
| `paymentStatus` | Customer / Merchant | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **PAYMENT BYPASS** (Set `paid` without pay) |
| `assignedCourierId` | Customer / Merchant | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **COURIER FORGERY** |
| `motorizadoId` | Customer / Merchant | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **COURIER FORGERY** |
| `deliveredAt` | Courier / Admin | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **TIMESTAMP FRAUD** |
| `createdAt` | System / Client | Merchant / Courier / Admin | Server | 🚨 **CLIENT CONTROLLED** | 🔴 **TIMESTAMP FRAUD** |

---

### 3. ORDER STATE MACHINE & TRANSITION MATRIX

Extracted from real application codebase (`app/src/main/java/com/example`, `functions/src/triggers/orders.ts`):

| Current Order State | Valid Next State | Permitted Actor | Execution Channel | Enforced in Rules? |
| :--- | :--- | :--- | :--- | :---: |
| `[None]` | `pending` / `draft` / `created` | Customer / Merchant | App / Web Checkout | ⚠️ Partial (`status in [...]`) |
| `pending` | `confirmed` / `accepted` | Merchant Admin / Staff | Merchant Web / KDS | 🚨 **NO** (Any status allowed) |
| `confirmed` | `preparing` | Merchant Cook / Staff | KDS Screen | 🚨 **NO** (Any status allowed) |
| `preparing` | `ready` | Merchant Cook / Staff | KDS Screen | 🚨 **NO** (Any status allowed) |
| `ready` | `assigned` | Cloud Function / Courier | Auto-Dispatcher | 🚨 **NO** (Any status allowed) |
| `assigned` | `in_transit` | Courier / Motorizado | Delivery App | 🚨 **NO** (Any status allowed) |
| `in_transit` | `delivered` | Courier / Motorizado | Delivery App | 🚨 **NO** (Any status allowed) |
| Any active state | `cancelled` | Customer / Merchant / Admin | Apps / Merchant Web | 🚨 **NO** (Any status allowed) |

---

### 4. INVITATION SECURITY & ACCEPTANCE ATTACK AUDIT

#### The Invitation Hijacking Attack Vulnerability
* **Regla Actual (Línea 200):**
  ```firestore
  allow update: if isAuthenticated() &&
                   (isBusinessAdmin() ||
                    currentUid() == request.resource.data.get("acceptedByUid", ""));
  ```
* **Mecanismo del Ataque:** `request.resource.data.get("acceptedByUid", "")` evalúa los datos del borrador entrante enviado por el cliente en lugar de evaluar el documento existente en Firestore (`resource.data`).
* **Secuencia de Explotación:**
  1. Un atacante autenticado (`User X`) obtiene el `token` de una invitación pendiente en estado `PENDING` destinada a otro empleado (`acceptedByUid = null`, `email = "target@corp.com"`, `targetRole = "MANAGER"`).
  2. `User X` envía una solicitud `updateDoc` estableciendo:
     `acceptedByUid = "USER_X"`, `status = "ACCEPTED"`, `targetRole = "OWNER"`.
  3. `firestore.rules` evalúa `currentUid() == request.resource.data.acceptedByUid` -> `"USER_X" == "USER_X"` -> `true`.
  4. La regla concede la actualización, **secuestrando la invitación y elevando el rol de User X a OWNER de Merchant A**.
* **Veredicto:** 🔴 **CRITICAL SECURITY VIOLATION (P0 Invitation Hijacking & Privilege Escalation)**.

#### Invitation Field Integrity Matrix

| Field in `/invitations` | Modifiable by Business Admin? | Modifiable by Accepting User? | Target Security Constraint Required |
| :--- | :---: | :---: | :--- |
| `acceptedByUid` | ✅ ALLOW | ⚠️ Self UID Only | `resource.data.status == "PENDING" && request.resource.data.acceptedByUid == currentUid()` |
| `status` | ✅ ALLOW | ⚠️ `"ACCEPTED"` Only | Must transition from `"PENDING"` -> `"ACCEPTED"` |
| `email` | ✅ ALLOW | 🚨 **MUST BE IMMUTABLE** | `!request.resource.data.diff(resource.data).affectedKeys().hasAny(["email"])` |
| `businessId` | ✅ ALLOW | 🚨 **MUST BE IMMUTABLE** | `!request.resource.data.diff(resource.data).affectedKeys().hasAny(["businessId"])` |
| `branchId` | ✅ ALLOW | 🚨 **MUST BE IMMUTABLE** | `!request.resource.data.diff(resource.data).affectedKeys().hasAny(["branchId"])` |
| `targetRole` | ✅ ALLOW | 🚨 **MUST BE IMMUTABLE** | `!request.resource.data.diff(resource.data).affectedKeys().hasAny(["targetRole"])` |
| `token` | ❌ IMMUTABLE | 🚨 **MUST BE IMMUTABLE** | `!request.resource.data.diff(resource.data).affectedKeys().hasAny(["token"])` |
| `expiresAt` | ✅ ALLOW | 🚨 **MUST BE IMMUTABLE** | `!request.resource.data.diff(resource.data).affectedKeys().hasAny(["expiresAt"])` |

---

### 5. PRODUCT AUTHORIZATION MATRIX BY STAFF ROLES

Evaluating `/products/{productId}` write operations:

| Operation | Platform Admin | Merchant OWNER | Merchant MANAGER | Merchant SUPERVISOR | Merchant CASHIER | Merchant COOK | Risk Level |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **CREATE Product** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🟡 Cashier/Cook can create products |
| **UPDATE Price** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 Cashier/Cook can alter menu prices |
| **UPDATE Cost** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 Cashier/Cook can alter cost margins |
| **UPDATE Stock** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🟢 Intended for inventory management |
| **DELETE Product** | ✅ ALLOW | ✅ ALLOW | ✅ ALLOW | 🚨 **ALLOW** | 🚨 **ALLOW** | 🚨 **ALLOW** | 🔴 Cashier/Cook can delete menu items |

---

### 6. AUDIT EVENT FIELD INTEGRITY & ROLE FORGERY

Evaluating `/audit_events/{eventId}` payload field injections:

```firestore
allow create: if isAuthenticated() && (
                 isPlatformAdmin() ||
                 (request.resource.data.uid == currentUid() &&
                  (!request.resource.data.keys().hasAny(["businessId"]) ||
                   request.resource.data.businessId == null ||
                   request.resource.data.businessId == getBusinessId()))
               );
```

* **Vulnerabilidad de Falsificación de Rol:** La regla valida `uid` y `businessId`, pero **NO valida `request.resource.data.actorRole`**.
* **Impacto Adversarial:** Un cajero o cliente autenticado puede enviar un documento a `/audit_events` estableciendo `actorRole = "SUPER_ADMIN"` o `actorRole = "PLATFORM_ADMIN"`, creando registros de auditoría falsos que imputan acciones críticas a los administradores globales.
* **Solución Requerida:** Validar `request.resource.data.get("actorRole", getRole()) == getRole()`.

---

### 7. CLOUD FUNCTIONS SERVER-CONTROLLED VS CLIENT-WRITTEN FIELDS

| Resource Collection | Field Name | Client Written? | Cloud Function / Server Controlled | Risk / Recommended Boundary |
| :--- | :--- | :---: | :---: | :--- |
| `/orders` | `commission` | ❌ NO | ✅ Admin SDK (Cloud Function) | Block client writes via `diff().affectedKeys()` |
| `/orders` | `deliveryFee` | ❌ NO | ✅ Admin SDK (Geo Engine) | Block client writes via `diff().affectedKeys()` |
| `/orders` | `paymentStatus` | ❌ NO | ✅ Admin SDK (Stripe/PayPal Webhook)| Block client writes via `diff().affectedKeys()` |
| `/orders` | `assignedCourierId`| ❌ NO | ✅ Admin SDK (Auto-Dispatcher) | Block customer/merchant direct writes |
| `/orders` | `deliveredAt` | ❌ NO | ✅ Admin SDK / Delivery Trigger | Block client backdating or early completion |
| `/invitations` | `acceptedByUid` | ⚠️ Controlled | ✅ Admin SDK / Verification Flow | Restrict to `resource.data.status == "PENDING"` |
| `/dashboard_summary`| All fields | ❌ NO | ✅ Cloud Function (`dashboardAggregator`) | Fully protected (`allow write: if isPlatformAdmin()`) |
| `/financial_events` | All fields | ❌ NO | ✅ Cloud Function (Finance Trigger) | Fully protected (`allow write: if isPlatformAdmin()`) |
| `/merchant_summaries`| All fields | ❌ NO | ✅ Cloud Function (Finance Trigger) | Fully protected (`allow write: if isPlatformAdmin()`) |

---

### 8. SEVERITY CLASSIFICATION OF DISCOVERED DEFECTS

#### 🔴 Severidad P0 (Vulnerabilidades Críticas de Integridad y Ataque)
1. **`/invitations` Hijacking Attack:** Explotación de `request.resource.data.acceptedByUid` para secuestrar invitaciones pendientes y elevar privilegios a `OWNER`.
2. **`/orders` Retroactive Financial & Identity Mutation:** Ausencia de restricción de campos en `update`, permitiendo alterar `total`, `commission`, `paymentStatus`, `customerId`, y `businessId`.
3. **`/audit_events` Actor Role Forgery:** Ausencia de validación de `actorRole`, permitiendo atribuir logs falsos a `SUPER_ADMIN`.

#### 🟡 Severidad P1 (Alta — Defectos de Control de Acceso y Campos)
1. **`/products` Price & Cost Alteration by Staff:** Cajeros y cocineros pueden alterar precios, costos y eliminar productos.
2. **`/orders` Unvalidated Client-Controlled Fields on Create:** Clientes pueden inyectar `paymentStatus = "paid"`, `assignedCourierId`, y montos de tarifa durante `create`.

#### 🟢 Severidad P2 (Informativa / Arquitectura de Estado)
1. **Order State Machine Enforcement:** Transiciones de estado de pedido no forzadas a nivel de reglas Firestore.

---

### 9. RECOMMENDED REMEDIATION (FOR FUTURE SPRINT)

```firestore
// 1. Hardened /invitations/{token} Update Rule
match /invitations/{token} {
  allow get: if true;
  allow list: if isAuthenticated() && (isPlatformAdmin() || (isBusinessAdmin() && resource.data.businessId == getBusinessId()));
  allow create: if isAuthenticated() && isBusinessAdmin() && isWritingOwnBusinessId();

  allow update: if isAuthenticated() && (
                   isBusinessAdmin() ||
                   (resource.data.status == "PENDING" &&
                    request.resource.data.acceptedByUid == currentUid() &&
                    request.resource.data.status == "ACCEPTED" &&
                    !request.resource.data.diff(resource.data).affectedKeys()
                      .hasAny(["email", "targetRole", "businessId", "branchId", "orgId", "token", "expiresAt"]))
                 );
  allow delete: if isAuthenticated() && isBusinessAdmin();
}

// 2. Hardened /orders/{orderId} Update Rule
match /orders/{orderId} {
  allow update: if isAuthenticated() && (
                   isPlatformAdmin() ||
                   (ownsBusiness(resource.data.businessId) &&
                    !request.resource.data.diff(resource.data).affectedKeys()
                      .hasAny(["customerId", "clienteId", "businessId", "createdAt"])) ||
                   ((currentUid() == resource.data.assignedCourierId || currentUid() == resource.data.motorizadoId) &&
                    request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(["status", "estado", "historialEstados", "ubicacionRepartidor", "deliveredAt"]))
                 );
}

// 3. Hardened /audit_events/{eventId} Create Rule
match /audit_events/{eventId} {
  allow create: if isAuthenticated() && (
                   isPlatformAdmin() ||
                   (request.resource.data.uid == currentUid() &&
                    (!request.resource.data.keys().hasAny(["actorRole"]) ||
                     request.resource.data.actorRole == getRole()) &&
                    (!request.resource.data.keys().hasAny(["businessId"]) ||
                     request.resource.data.businessId == null ||
                     request.resource.data.businessId == getBusinessId()))
                 );
}
```

---

### 10. AUDIT VERDICT

```text
═══════════════════════════════════════════════════════════════════════════════
   BUSINESS INTEGRITY & FIELD AUTHORIZATION AUDIT VERDICT
═══════════════════════════════════════════════════════════════════════════════

STATUS:                DISCOVERY COMPLETE — REMEDIATION REQUIRED IN FUTURE SPRINT

NEW FIELD-LEVEL P0 VULNERABILITIES IDENTIFIED:
1. /invitations:  Hijacking Attack & Privilege Escalation via request.resource.data
2. /orders:       Unrestricted update of total, commission, paymentStatus & IDs
3. /audit_events: Actor role forgery (SUPER_ADMIN role injection)

NEW P1 ROLE CONTROL DEFECTS:
1. /products:     Cashier/Cook staff can alter prices, costs, and delete menu items
2. /orders:       Client-controlled financial & courier fields on create

NO FILES MODIFIED:     YES
NO DEPLOY:             YES
FINAL STATUS:          DISCOVERY REPORT GENERATED — AWAITING REMEDIATION SPRINT
═══════════════════════════════════════════════════════════════════════════════
```
