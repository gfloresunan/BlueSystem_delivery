# C2D26 — DELIVERY TRIPS IMPLEMENTATION (X→Y)

**Module:** Point-to-Point Envíos X→Y  
**File:** `flutter_client/lib/presentation/screens/trips/trips_screen.dart`  

---

## 1. Technical Capabilities

1. **Canonical Schema:** Directly binds to `/deliveryTrips` using `TripEntity`.
2. **Realtime Updates:** Listens to customer trips with multi-tenant isolation (`tenantId == ctx.tenantId`).
3. **Route Timeline:** Displays origin and destination addresses with status badges (`OFFERED`, `ASSIGNED`, `ON_WAY_TO_ORIGIN`, `PICKED_UP`, `DELIVERED`).
4. **Fare Display:** Authoritative fare received from backend core; no client-side pricing recalculation.
5. **Assigned Courier Indicator:** Renders assigned courier status when matched.
