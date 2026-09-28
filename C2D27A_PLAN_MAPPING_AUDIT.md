# 💳 C2D.27A — PLAN MAPPING & COMMERCIAL ENTITLEMENT AUDIT

**Protocol ID:** `BSD-C2D27A-PLAN-MAPPING-AUDIT-001`  
**Execution Mode:** `READ-ONLY-FIRST / ZERO-MUTATION`

---

## 1. UI Labels vs Canonical Platform Architecture

In the admin panel (`governanceCenter.js`), the "Plan Corporativo" select dropdown contains 3 options:
1. `Enterprise MultiTenant`
2. `Corporate Gold`
3. `Standard Tenant`

### Canonical Platform Tiers (`functions/src/domain/platform/models.ts` & `catalog.ts`):
- `STARTER`: Single business, 1 branch, 3 users, 2 couriers, 300 orders/mo. Core modules only (`ORDERS`, `CATALOG`, `CUSTOMERS`).
- `PROFESSIONAL`: 3 businesses, 5 branches, 15 users, 10 couriers, 3,000 orders/mo. Logistics, dispatch & finance (`CONTROL_TOWER`, `FLEET_CORE`, `GPS_TRACKING`, `X_TO_Y_DELIVERY`, `PROMOTIONS`, `FINANCE`, `REPORTS`, `NOTIFICATIONS`).
- `ENTERPRISE`: Unlimited businesses, branches, users, couriers, orders. Advanced BI, Governance, Multi-Branch, Multi-Brand, API Access (`ANALYTICS`, `GOVERNANCE`, `MULTI_BRANCH`, `MULTI_BRAND`, `API_ACCESS`).
- `CUSTOM`: Bespoke contracts with custom quotas and capabilities.

---

## 2. Forensic Code Tracing

### What happens to the selected value:
- In `governanceCenter.js` line 622:
  ```javascript
  plan: document.getElementById('org-plan').value
  ```
- Passed directly to `governanceService.saveOrganization(orgData)`:
  ```javascript
  plan: orgData.plan || 'Enterprise'
  ```
- Saved directly to `/organizations/{orgId}.plan`:
  ```javascript
  await db.collection('organizations').doc(orgId).set(payload, { merge: true });
  ```

### Audit Findings:
1. **Zero Transformation:** The UI string is stored directly as raw text in Firestore without validation against enum `PlanTier`.
2. **Zero Downstream Impact:** No listener or Cloud Function reacts to `/organizations/{orgId}.plan`.
3. **Decoupled Architecture:** Subscriptions and Gatekeeper quotas are managed separately in `/subscriptions` through `subscriptionManager.js`.
