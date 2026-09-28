# 30 — ROLE AND PERMISSION MATRIX (EIAM)

**Security Baseline:** EIAM v2.1/v3 & Firestore Security Rules

---

## 👥 Capability Matrix by Role

| Platform Feature / Action | Customer | Courier | Merchant Staff | Merchant Admin | Platform Admin |
|---|---|---|---|---|---|
| **Browse Stores & Products** | ✅ `READ` | ✅ `READ` | ✅ `READ` | ✅ `READ` | ✅ `READ` |
| **Create Commerce Order** | ✅ `CREATE` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` |
| **Request X→Y Delivery Trip** | ✅ `CREATE` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` |
| **View Fleet Pool** | ❌ `DENIED` | ✅ `READ` | ❌ `DENIED` | ❌ `DENIED` | ✅ `MANAGE` |
| **Claim Fleet Order** | ❌ `DENIED` | ✅ `EXECUTE` | ❌ `DENIED` | ❌ `DENIED` | ✅ `MANAGE` |
| **Broadcast Courier GPS** | ❌ `DENIED` | ✅ `WRITE` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` |
| **Manage Merchant Kanban** | ❌ `DENIED` | ❌ `DENIED` | ✅ `EXECUTE` | ✅ `EXECUTE` | ✅ `MANAGE` |
| **Edit Menu & Catalog** | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ✅ `MANAGE` | ✅ `MANAGE` |
| **View Financial Ledger** | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ✅ `READ` (Own) | ✅ `MANAGE` (All) |
| **Provision Tenants & Brands** | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ✅ `MANAGE` |
| **Issue Custom Claims** | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ❌ `DENIED` | ✅ `MANAGE` |

---
*Evidence: validated from `firestore.rules` and `panel-admin/public/js/services/securityService.js`.*
