# C2D26 — APPLICATION SHELL IMPLEMENTATION

**Module:** Application Shell & Bootstrap  
**File:** `flutter_client/lib/presentation/screens/shell/app_shell.dart`  

---

## 1. Responsibilities

The `AppShell` serves as the root authenticated container for all commercial screens:
1. **Dynamic Brand Identity:** Renders the active brand's display name and logo directly in the AppBar.
2. **Session Lifecycle Awareness:** Reacts instantly to auth state transitions (`uninitialized`, `authenticating`, `authenticated`, `unauthenticated`, `error`).
3. **Gatekeeper Route Gating:** Evaluates module permissions on navigation tabs (`ORDERS`, `TRIPS`, `FLEET`). Modules not enabled in the current tenant's subscription render as disabled or display `UnauthorizedView`.
4. **Offline Detection:** Displays `OfflineBanner` when network connectivity is lost without allowing unauthenticated bypass.
5. **Multi-Platform Navigation:** Adapts navigation between `NavigationBar` (mobile) and responsive containers.
