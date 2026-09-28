# BLUESYSTEM DELIVERY ENTERPRISE
## GOVERNANCE CENTER — TENANT DEPROVISIONING IMPLEMENTATION PRECHECK (FASE 0)
**Document ID:** `TENANT_DEPROVISIONING_IMPLEMENTATION_PRECHECK.md`  
**Date:** August 12, 2026  
**Status:** FASE 0 COMPLETED — INITIAL SNAPSHOT REGISTERED  

---

### 1. SECURITY & INTEGRITY SNAPSHOT

* **Firebase Project ID:** `bluesystem-7c9af`
* **`firestore.rules` SHA256:** `7786EF1B8D2133A9DC8ADD1B901FF9B848F20C563C4EB54C0FA9CD94A4C206F7`
* **Security Rules Modification Policy:** NO MODIFICATIONS TO `firestore.rules` (Security Baseline V1.1 remains strictly unchanged).

---

### 2. EXISTING CLOUD FUNCTIONS INVENTORY

#### Triggers (Firestore & Auth)
- `notifyNewOrder`, `notifyOrderStatusChange`, `onPaymentStatusUpdated`, `onOrderDelivered`
- `setUserClaims`, `setMembershipClaims`
- `onMerchantApplicationApproved`, `onMerchantApplicationStatusChanged`

#### Callables (HTTPS)
- `adminUpdateUser`, `diagnoseFcmSystem`
- `sendPushNotification`
- `submitMerchantApplication`, `updateMerchantWizardStep`, `completeMerchantWizard`, `getMerchantApplicationStatus`

#### Schedulers (Cron Tasks)
- `archiveOrdersScheduler`, `auditCleanupScheduler`, `notificationCleanupScheduler`, `dashboardAggregatorScheduler`, `healthCheckScheduler`

---

### 3. FILES TARGETED FOR IMPLEMENTATION

1. `functions/src/callables/admin.ts` — Implement `deprovisionTenant` callable Cloud Function.
2. `functions/src/index.ts` — Export `deprovisionTenant` function.
3. `panel-admin/public/js/dashboard/liveRestaurants.js` — Replace direct `deleteDoc()` / `updateDoc()` calls with `deprovisionTenant` Callable.
4. `panel-admin/public/js/services/governanceService.js` — Delegate `deleteBusiness` and `updateMerchantLifecycleStatus` to backend.

---

### 4. DATA SCHEMAS & DOCUMENT STRUCTURE SNAPSHOT

- **`/users/{uid}`**: `uid`, `email`, `role`, `userType`, `rol`, `eiamRole`, `businessId`, `branchId`, `isActive`, `active`, `comercioNombre`, `branches`, `assignedUsers`.
- **`/businesses/{businessId}`**: `businessId`, `name`, `status`, `lifecycleStatus`, `ownerUid`, `orgId`, `active`, `isActive`, `isDeleted`, `suspensionReason`.
- **`/branches/{branchId}`**: `branchId`, `businessId`, `name`, `active`, `isDeleted`, `status`.
- **`/employees/{employeeId}`**: `employeeId`, `businessId`, `uid`, `role`, `status`, `active`, `isDeleted`.
- **`/membership/{membershipId}`**: `membershipId`, `businessId`, `uid`, `role`, `status`.
- **`/sessions/{sessionId}`**: `sessionId`, `uid`, `createdAt`, `lastActive`.
- **`/devices/{deviceId}` & `/user_devices/{docId}`**: `deviceId`, `uid`, `fcmToken`, `isActive`, `platform`.
- **`/orders/{orderId}`**: `orderId`, `businessId`, `customerId`, `status`, `subtotal`, `total`, `commission`, `deliveryFee`, `createdAt`.
- **`/audit_events/{eventId}`**: `eventId`, `event`, `domain`, `businessId`, `actorUid`, `actorRole`, `timestamp`, `operationId`, `mode`.

---

### 5. PRECHECK VERIFICATION

- [x] `firestore.rules` SHA256 captured
- [x] Environment and files inventoried
- [x] Zero changes applied to `firestore.rules`
- [x] Ready to proceed to FASE 1 (Cloud Function Implementation)
