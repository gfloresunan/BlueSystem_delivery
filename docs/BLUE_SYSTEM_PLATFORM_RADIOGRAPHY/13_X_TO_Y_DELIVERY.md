# 13 — X → Y POINT-TO-POINT DELIVERY DOMAIN RADIOGRAPHY

**Domain:** Direct Package Shipping (`/deliveryTrips/{tripId}`)  
**Participating Actors:** Customer App (Sender), Courier App, Recipient (Tracking Link / SMS)  
**Baseline Freeze:** ADR-015 (Native Android Geocoder + FusedLocation + Haversine Engine)  
**Audit Reference:** FLOW-002

---

## 📦 1. Domain Separation & Architecture

Unlike Commerce Delivery, **X→Y Delivery** operates independently without any Merchant intermediary.

```mermaid
flowchart TD
    SENDER[Customer: SolicitarEnvioScreen] --> PIN_X[Select Origin Pin X on Map]
    SENDER --> PIN_Y[Select Destination Pin Y on Map]
    
    PIN_X & PIN_Y --> CALC[Haversine Pricing Engine: Base $35 + $15/km]
    CALC --> TRIP_CREATE[Write to /deliveryTrips/tripId (status: REQUESTED)]
    
    TRIP_CREATE --> FLEET_NOTIFY[Push to Active Couriers in Radius]
    FLEET_NOTIFY --> COURIER_CLAIM[Courier: claimTripAtomically]
    
    COURIER_CLAIM --> PICKUP[Route to X: Pick up Package]
    PICKUP --> TRANSIT[Route to Y: In Transit]
    TRANSIT --> POD[Delivery Verification: Photo & Recipient Signature]
    POD --> COMPLETE[Trip Marked COMPLETED]
```

---

## 💵 2. Independent Pricing Engine & Distance Matrix

- **Engine Location:** `GeoUtils.kt` & `functions/src/domain/trips/pricing.ts`
- **Formula:**
  $$	ext{Total Price} = 	ext{Base Price } ($35.00) + (	ext{Distance in km} 	imes $15.00)$$
- **Distance Calculation:** High-performance Haversine formula executed on validated geographic coordinates `(latX, lngX)` and `(latY, lngY)`.
- **Zero Places API Cost:** Coordinates resolved directly through Android Native Geocoder and Map Pin Dragging, enforcing strict zero-cost Places API governance.

---
*Evidence: verified in `app/src/main/java/com/example/ui/customer/SolicitarEnvioScreen.kt` and `GeoUtils.kt`.*
