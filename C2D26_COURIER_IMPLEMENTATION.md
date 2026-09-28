# C2D26 — COURIER / MOTORIZADO IMPLEMENTATION

**Module:** Courier Operational Dashboard  
**File:** `flutter_client/lib/presentation/screens/courier/courier_dashboard_screen.dart`  

---

## 1. Technical Capabilities

1. **Availability Toggle:** Switch controlling courier online/offline status with visual telemetry notice.
2. **Assigned Orders Queue:** Streams assigned commerce delivery orders from `/orders` (`status in ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DISPATCHED']`).
3. **Assigned Trips Queue:** Streams active X→Y point-to-point delivery trips from `/deliveryTrips`.
4. **Telemetry Standard Compliance (ADR-016):** Integrates conceptually with `/ubicaciones_repartidores/{courierId}` without modifying core backend rules.
5. **No Local Settlement:** Financial settlement logic is deferred to Core backend.
