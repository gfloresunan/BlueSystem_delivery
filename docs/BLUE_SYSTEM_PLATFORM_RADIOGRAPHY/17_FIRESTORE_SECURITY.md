# 17 — FIRESTORE SECURITY RULES & MULTI-TENANT ISOLATION

**File Reference:** `firestore.rules` (Workspace Root)  
**Security Baseline:** EIAM v2.1/v3 Role-Based & Tenant-Scoped Access Control  
**Audit Reference:** SEC-001

---

## 🔒 1. Security Architecture & Boundary Verification

The Firestore rules enforce strict cryptographic identity and boundary isolation:

1. **Tenant Isolation:** Users with `request.auth.token.tenantId` can only read and write documents within their matching tenant scope.
2. **Merchant Scoping:** A merchant cashier or store manager can only mutate `/orders` where `resource.data.businessId == request.auth.token.businessId`.
3. **Courier Isolation:** A courier can only update their own GPS in `/ubicaciones_repartidores/{courierId}` when `request.auth.uid == courierId`.
4. **Customer Privacy:** A customer can only read their own order documents (`resource.data.customerId == request.auth.uid`).
5. **Admin Gate:** Only users with custom claim `request.auth.token.admin == true` can modify `/system_config`, `/tenants`, and `/audit_events`.

---
*Evidence: validated directly from active `firestore.rules`.*
