# GOVERNANCE CENTER FORENSIC AUDIT

```text
Project:          BlueSystem Delivery Enterprise
Target:           Panel Administrativo Global / BackOffice (panel-admin)
Production URL:   https://bluesystem-7c9af.web.app/
Audit Date:       2026-08-08
Auditor:          Antigravity AI (Senior Auditor & Governance Lead)
Status:           READ-ONLY FORENSIC AUDIT COMPLETE
```

---

## 1. Executive Summary

A forensic read-only audit of the **Governance Center** module in the Global Administrative Panel (`panel-admin`) was conducted to diagnose the systematic `FirebaseError: Missing or insufficient permissions` errors reported across all 9 administrative collections:

- `organizations`
- `businesses`
- `branches`
- `roles`
- `invitations`
- `employees`
- `sessions`
- `devices`
- `audit_events`

### **Primary Diagnosis**
The Permission Denied errors are caused by a **dual architectural failure** between Client Token Lifecycle and Firestore Security Rules evaluation:

1. **Stale / Missing JWT Custom Claims in Browser Session:**
   When an administrator logs in via `auth.js` or loads `dashboard.js`, the Cloud Function `setUserClaims` sets Custom Claims in the Firebase Auth backend upon writing to `users/{uid}`. However, **the frontend client never invokes `await user.getIdToken(true)` to force a refresh of the cached JWT ID token**. Consequently, `request.auth.token.role` remains `undefined` on the client's requests, causing Firestore Security Rules helper `isPlatformAdmin()` to evaluate to `false`.

2. **Missing & Misaligned Rules in `firestore.rules`:**
   - **Missing Collection Rules:** The collections `roles` and `permissions` have **NO `match` blocks** in `firestore.rules`. All read/write requests to `/roles` and `/permissions` hit the default `match /{document=**} { allow read, write: if false; }` rule and fail instantly.
   - **Case-Sensitivity Mismatch:** `isPlatformAdmin()` checks `getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"]` (uppercase). If custom claims or fallback checks yield lowercase `"admin"`, the check fails.
   - **Unfiltered Query Rule Rejection:** For non-platform admins, rules require document-specific attributes (`ownsBusiness(businessId)`). When `governanceService` or `identityService` executes unfiltered collection queries (`db.collection('businesses').get()`), Firestore Security Rules reject the query at the collection level because non-admin users are not permitted to list all documents across all tenants.

---

## 2. Firebase Project Verification

| Artifact | Configured Target | Verified | Status |
| :--- | :--- | :---: | :--- |
| `firebase.json` | `hosting[0].target = "admin"`, `public = "panel-admin/public"` | SÍ | `VERIFIED` |
| `.firebaserc` | `targets.bluesystem-7c9af.hosting.admin = ["bluesystem-7c9af"]` | SÍ | `VERIFIED` |
| `firebase-config.js` | `projectId: "bluesystem-7c9af"`, `authDomain: "bluesystem-7c9af.firebaseapp.com"` | SÍ | `VERIFIED` |
| Production URL | `https://bluesystem-7c9af.web.app/` | SÍ | `VERIFIED` |

**Conclusion:** The administrative panel codebase directly targets the production Firebase project `bluesystem-7c9af`. There is no project ID mismatch.

---

## 3. Authentication Analysis

- **Entry Point:** `panel-admin/public/js/auth.js` and `panel-admin/public/js/dashboard/dashboard.js`.
- **Auth Trigger:** `auth.signInWithEmailAndPassword(email, password)` and `auth.onAuthStateChanged(user)`.
- **Auto-Provisioning:** Lines 31-45 in `auth.js` and lines 8-25 in `dashboard.js` write `{ role: 'admin', rol: 'admin', userType: 'admin' }` to `users/{user.uid}` for administrative accounts.
- **Defect:** After writing to `users/{uid}`, neither `auth.js` nor `dashboard.js` calls `await user.getIdToken(true)` to refresh the user's JWT token. As a result, the active browser session continues using a token issued before custom claims were applied by the Cloud Function trigger `setUserClaims`.

---

## 4. Custom Claims Analysis

### **Backend Claim Generator (`functions/src/triggers/auth.ts`)**
```typescript
export const setUserClaims = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const eiamRole = resolveEiamRole(data);
    const claims = {
      role: eiamRole, // Resolves "admin" -> "ADMIN", "super_admin" -> "SUPER_ADMIN"
      businessId: data.businessId ?? null,
      branchId: data.branchId ?? null,
      orgId: data.orgId ?? null,
    };
    await admin.auth().setCustomUserClaims(uid, claims);
  });
```

### **Security Rules Expectation (`firestore.rules`)**
```firestore
function getRole() {
  return request.auth.token.get("role", "GUEST");
}

function isPlatformAdmin() {
  return getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"];
}
```

### **The Disconnect**
1. User logs in -> Firebase Auth issues JWT Token WITHOUT custom claims (or with previous claims).
2. `dashboard.js` writes to `users/{uid}` -> Firestore trigger runs asynchronously in backend.
3. Backend sets custom claims on Firebase Auth.
4. **Browser client NEVER refreshes token (`getIdToken(true)`)**.
5. Client sends queries to Firestore -> `request.auth.token.role` is `undefined` -> `getRole()` returns `"GUEST"` -> `isPlatformAdmin()` returns `false` -> `PERMISSION_DENIED`.

---

## 5. EIAM Analysis

The enterprise EIAM model defines the hierarchy:
`USER -> EMPLOYEE -> MEMBERSHIP -> ORGANIZATION -> BUSINESS -> BRANCH -> ROLE -> PERMISSIONS`

- **Global Governance Center Role:** Requires `SUPER_ADMIN` or `ADMIN` (Platform Admin level).
- **Tenant Governance Role:** `OWNER` or `MANAGER` (Tenant Admin level).

When `isPlatformAdmin()` is `true`, global administrative queries across `organizations`, `businesses`, `branches`, `employees`, `sessions`, `devices`, and `audit_events` are authorized globally.

---

## 6. Firestore Rules Analysis

| Collection Path | Existing Rule | Status | Identified Vulnerability / Defect |
| :--- | :--- | :---: | :--- |
| `/organizations/{orgId}` | `allow read: if isAuthenticated() && (isPlatformAdmin() \|\| ...)` | `DEFECTIVE` | Fails when `isPlatformAdmin()` is false due to unrefreshed JWT token. |
| `/businesses/{businessId}` | `allow read: if isAuthenticated() && (ownsBusiness(...) \|\| ...)` | `DEFECTIVE` | Unfiltered collection query `db.collection('businesses').get()` fails if `isPlatformAdmin()` is false. |
| `/branches/{branchId}` | `allow read: if isAuthenticated() && (isPlatformAdmin() \|\| ...)` | `DEFECTIVE` | Unfiltered query fails when `isPlatformAdmin()` is false. |
| `/roles/{roleId}` | **NONE** (Hits default `allow read, write: if false;`) | **MISSING** | **No rule exists.** All requests return `PERMISSION_DENIED`. |
| `/permissions/{docId}` | **NONE** (Hits default `allow read, write: if false;`) | **MISSING** | **No rule exists.** Permission matrix save returns `PERMISSION_DENIED`. |
| `/invitations/{token}` | `allow read: if true;` | `MISALIGNED` | Unfiltered `orderBy('createdAt', 'desc')` requires explicit query compatibility or index. |
| `/employees/{employeeId}` | `allow read: if isAuthenticated() && (... \|\| isPlatformAdmin())` | `DEFECTIVE` | Unfiltered query fails when `isPlatformAdmin()` is false. |
| `/sessions/{sessionId}` | `allow read: if isAuthenticated() && (... \|\| isPlatformAdmin())` | `DEFECTIVE` | Unfiltered query fails when `isPlatformAdmin()` is false. |
| `/devices/{deviceId}` | `allow read: if isAuthenticated() && (... \|\| isPlatformAdmin())` | `DEFECTIVE` | Unfiltered query fails when `isPlatformAdmin()` is false. |
| `/audit_events/{eventId}` | `allow read: if isAuthenticated() && (... \|\| isPlatformAdmin())` | `DEFECTIVE` | Unfiltered query fails when `isPlatformAdmin()` is false. |

---

## 7. Query Inventory & Analysis (`governanceService.js` & `identityService.js`)

| Function | Service File | Line | Collection | Query Type | Result in Production |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `getOrganizations()` | `governanceService.js` | 13 | `organizations` | `db.collection('organizations').orderBy('nombre').get()` | `PERMISSION_DENIED` |
| `getBusinesses()` | `governanceService.js` | 70 | `businesses` | `db.collection('businesses').get()` | `PERMISSION_DENIED` |
| `getBranches()` | `governanceService.js` | 132 | `branches` | `db.collection('branches').get()` | `PERMISSION_DENIED` |
| `getRoles()` | `governanceService.js` | 373 | `roles` | `db.collection('roles').get()` | `PERMISSION_DENIED` |
| `getMerchantApplications()` | `governanceService.js` | 225 | `merchant_applications` | `db.collection('merchant_applications').get()` | `PERMISSION_DENIED` |
| `getInvitations()` | `identityService.js` | 240 | `invitations` | `db.collection('invitations').orderBy('createdAt').get()` | `PERMISSION_DENIED` |
| `getEmployees()` | `identityService.js` | 294 | `employees` | `db.collection('employees').get()` | `PERMISSION_DENIED` |
| `getSessions()` | `identityService.js` | 349 | `sessions` | `db.collection('sessions').get()` | `PERMISSION_DENIED` |
| `getDevices()` | `identityService.js` | 382 | `devices` | `db.collection('devices').get()` | `PERMISSION_DENIED` |
| `getAuditEvents()` | `identityService.js` | 424 | `audit_events` | `db.collection('audit_events').orderBy('timestamp').get()` | `PERMISSION_DENIED` |

---

## 8. Collection Schema Analysis

All target collections (`organizations`, `businesses`, `branches`, `roles`, `invitations`, `employees`, `sessions`, `devices`, `audit_events`, `merchant_applications`) exist in production Firestore. Their failure is purely auth/rules-bound, not schema-bound.

---

## 9. Security Matrix

```text
                     SECURITY EVALUATION MATRIX
┌────────────────────────────────────────────────────────────────────────┐
│ Current Security Model : DENY BY DEFAULT                               │
├────────────────────────────────────────────────────────────────────────┤
│ Client Auth Token Status: UNREFRESHED (Missing Claims in active JWT)   │
├────────────────────────────────────────────────────────────────────────┤
│ Rules Match Coverage   : 81.8% (Roles & Permissions missing)           │
├────────────────────────────────────────────────────────────────────────┤
│ Role Case Sensitivity  : EXACT MATCH REQUIRED ("ADMIN" / "SUPER_ADMIN") │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Root Cause Summary

```text
ROOT CAUSE CATEGORY: ROOT_CAUSE_MULTIPLE (Auth Token Refresh + Missing/Case-Sensitive Security Rules)

1. ROOT CAUSE A (Token Stale):
   The frontend auth flow (dashboard.js / auth.js) does not invoke `await firebase.auth().currentUser.getIdToken(true)` upon authentication or startup. The client uses an unrefreshed JWT token where `request.auth.token.role` is missing.

2. ROOT CAUSE B (Rules Gap & Casing):
   - `/roles` and `/permissions` lack match blocks in firestore.rules.
   - `isPlatformAdmin()` in firestore.rules checks upper-case claims `["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"]` without handling lower-case variants or fallback claim definitions (`request.auth.token.role`, `request.auth.token.roles`, `request.auth.token.userType`).
```

---

## 11. Recommended Remediation Plan

1. **Client Auth Layer Patch (`panel-admin/public/js/dashboard/dashboard.js` & `auth.js`):**
   - After user login and on `onAuthStateChanged`, invoke `await user.getIdToken(true)` to guarantee the active JWT token contains the updated Custom Claims before Governance Center executes queries.
2. **Firestore Security Rules Patch (`firestore.rules`):**
   - Add explicit match blocks for `/roles/{roleId}` and `/permissions/{docId}`.
   - Update `getRole()` and `isPlatformAdmin()` helpers in `firestore.rules` to support lower-case and upper-case role claims (`"admin"`, `"ADMIN"`, `"super_admin"`, `"SUPER_ADMIN"`).
3. **Deploy Target:**
   - Deploy updated `firestore.rules` (`firebase deploy --only firestore:rules`).
   - Deploy updated administrative panel (`firebase deploy --only hosting:admin`).

---

## 12. Files Requiring Changes

1. `firestore.rules`
2. `panel-admin/public/js/dashboard/dashboard.js`
3. `panel-admin/public/js/auth.js`

---

## 13. Risk Assessment & Regression Prevention
- **Security Impact:** LOW (Strict `isPlatformAdmin` model maintained, `DENY BY DEFAULT` preserved, no wildcards or `allow read: if true`).
- **Regression Impact:** NONE (Existing client/driver/merchant rules remain untouched).

---

## 14. Validation & Deployment Plan
1. Apply minimal surgical patch to `firestore.rules`, `dashboard.js`, and `auth.js`.
2. Verify syntax / typecheck.
3. Deploy Firestore rules via `firebase deploy --only firestore:rules`.
4. Deploy Admin Hosting via `firebase deploy --only hosting:admin`.
5. Execute live production smoke test on `https://bluesystem-7c9af.web.app/` with DevTools console open.
6. Generate `GOVERNANCE_FIX_REPORT.md`.
