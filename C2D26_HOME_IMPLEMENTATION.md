# C2D26 — HOME / DASHBOARD IMPLEMENTATION

**Module:** Commercial Home Dashboard  
**File:** `flutter_client/lib/presentation/screens/home/commercial_home_screen.dart`  

---

## 1. Features & Design

1. **Context Banner:** Displays active user name, role chip (e.g. `OWNER`, `MANAGER`), active brand name, and tenant identifier.
2. **Subscription Tier:** Highlights active plan (e.g. `Professional (TIER 2)`) with a verified badge.
3. **Gatekeeper Module Grid:**
   - Pedidos (`ORDERS`)
   - Envíos X→Y (`TRIPS`)
   - Comercio (`CATALOG`)
   - Flota & GPS (`FLEET`)
   - Cards dynamically indicate whether the module is enabled in the active subscription or locked with a lock icon.
4. **Activity Summary:** High-level key performance metrics.
