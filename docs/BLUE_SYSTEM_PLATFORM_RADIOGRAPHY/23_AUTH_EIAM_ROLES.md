# 23 — AUTHENTICATION & ENTERPRISE IAM (EIAM) SPECIFICATION

**Identity Provider:** Firebase Authentication  
**Access Control:** Custom Claims + Firestore Multi-Tenant Gate  
**Roles Baseline:** EIAM v2.1 / v3

---

## 👥 1. Role Hierarchy & Claims Schema

```json
{
  "uid": "usr_alpha_999",
  "email": "manager@fritoni.com",
  "claims": {
    "role": "MERCHANT_ADMIN",
    "tenantId": "tenant_enterprise_01",
    "businessId": "biz_fritoni_group",
    "branchId": "branch_central_01",
    "permissions": ["orders:read", "orders:write", "menu:manage", "finance:read"]
  }
}
```

---

## 🔐 2. Platform Role Definitions

1. **`CUSTOMER`:** End-user consumer. Has read access to active merchants/products and CRUD access only to their own orders and addresses.
2. **`COURIER`:** Fleet driver. Has read access to Fleet Pool orders and write access to their own assigned trips and GPS location.
3. **`MERCHANT_ADMIN` / `BRANCH_STAFF`:** Store operator. Restricted to their specific `tenantId` and `businessId`.
4. **`PLATFORM_ADMIN` / `SUPER_ADMIN`:** Global system administrator with unconstrained governance over all tenants, users, and fees.

---
*Evidence: verified in `panel-admin/public/js/services/identityService.js` and `firestore.rules`.*
