# C2D26 — MERCHANT & COMMERCE IMPLEMENTATION

**Module:** Merchant Dashboard, Catalog, Branches & Promotions  
**File:** `flutter_client/lib/presentation/screens/merchant/merchant_dashboard_screen.dart`  

---

## 1. Technical Capabilities

1. **Tabbed Commercial Management:**
   - **Productos:** Streams products from `/products` scoped by `businessId` and `tenantId`. Shows stock, pricing, and availability.
   - **Sucursales:** Streams branches from `/branches` scoped by `businessId` and `tenantId`. Shows address, phone, and open/closed status.
   - **Promociones:** Streams active promotions from `/promotions` scoped by `tenantId`.
2. **Gatekeeper Integration:** Requires `CATALOG` entitlement in the active subscription. Renders `UnauthorizedView` on denial.
3. **Multi-Tenant Scoping:** All operations strictly bound to `tenantId`.
