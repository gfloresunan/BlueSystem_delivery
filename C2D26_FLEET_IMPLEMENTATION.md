# C2D26 — FLEET & TELEMETRY IMPLEMENTATION

**Module:** Fleet Visibility & Live Courier Tracking  
**File:** `flutter_client/lib/presentation/screens/fleet/fleet_map_screen.dart`  

---

## 1. Technical Capabilities

1. **Telemetry Feed:** Streams active couriers from `/ubicaciones_repartidores` where `tenantId == ctx.tenantId` and `isOnline == true`.
2. **Freshness TTL Check:** Evaluates `CourierLocationEntity.isFresh` ($\le 10$ minutes) to flag stale GPS updates.
3. **Multi-Platform Map Container:** Implements visual map viewport placeholder cleanly decoupled via `MapPlatformAdapter` pending API key provisioning (C2D.27).
4. **Courier Metrics:** Displays live speed (km/h) and battery level (%).
5. **Fail-Closed Gatekeeper:** Requires `FLEET` permission in subscription.
