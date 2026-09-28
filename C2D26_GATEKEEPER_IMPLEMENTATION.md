# C2D26 — GATEKEEPER IMPLEMENTATION

**Module:** Fail-Closed Gatekeeper Engine  
**Files:** `flutter_client/lib/core/gatekeeper/gatekeeper.dart`, `flutter_client/lib/presentation/widgets/gatekeeper_guard.dart`  

---

## 1. Engine Directives

```
   Gatekeeper Evaluation Order:
   1. Check Context Authenticity (UID != empty, Role valid)
   2. Check Tenant Match (ctx.tenantId == subscription.tenantId)
   3. Check Subscription Expiration (nowMs <= subscription.endDate)
   4. Check Explicit Feature Disablement (disabledFeatures.contains(moduleKey))
   5. Check Explicit Feature Enablement (enabledFeatures.contains(moduleKey))
   6. Check Role Permissions (role == superAdmin || role.hasPermission(moduleKey))
   7. IF ANY CHECK FAILS -> DENY (Fail-Closed)
```

2. **UI Widgets:** `GatekeeperGuard` conditionally renders child widgets or returns a fallback view if denied.
