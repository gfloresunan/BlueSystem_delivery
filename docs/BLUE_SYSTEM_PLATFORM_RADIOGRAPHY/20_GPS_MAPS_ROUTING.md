# 20 — GPS TELEMETRY, MAPS & ROUTING SPECIFICATION

**Components:** `LocationTrackingService.kt`, `GeoUtils.kt`, `LiveMap.tsx`, `MapLocationPickerDialog.kt`  
**Baselines:** ADR-013, ADR-015, ADR-016

---

## 📡 1. High-Frequency Telemetry & Dynamic Bearing

```mermaid
flowchart LR
    GPS[Courier Device GPS] --> SVC[LocationTrackingService.kt]
    SVC --> BEARING[Calculate Bearing & Speed]
    BEARING --> THRESHOLD{Is Active Route?}
    
    THRESHOLD --> |Yes: In Delivery| FAST[Sync every 5 seconds]
    THRESHOLD --> |No: Idle| SLOW[Sync every 60 seconds]
    
    FAST & SLOW --> FIRESTORE[Write to /ubicaciones_repartidores/{courierId}]
    FIRESTORE --> APP_LISTENERS[Targeted Listeners: Customer Tracking & Control Tower]
```

---

## 🛣️ 2. Distance & ETA Resolution

- **Distance Engine:** Haversine great-circle distance algorithm implemented natively in `GeoUtils.kt`.
- **ETA Computation:** Estimated transit time computed dynamically based on straight-line distance adjusted by urban traffic factor (typically $1.35 	imes 	ext{distance} / 25	ext{ km/h}$).
- **Polyline Rendering:** Native Android Google Maps polyline connecting `Origin` $ightarrow$ `Courier LatLng` $ightarrow$ `Destination`.

---
*Evidence: source code of `app/src/main/java/com/example/service/LocationTrackingService.kt` and `GeoUtils.kt`.*
