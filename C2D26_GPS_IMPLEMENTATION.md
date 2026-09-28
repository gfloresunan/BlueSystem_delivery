# C2D26 — GPS PLATFORM ADAPTER IMPLEMENTATION

**Module:** Multiplatform GPS / Location  
**File:** `flutter_client/lib/platform/gps/gps_adapter.dart`  

---

## 1. Abstraction Design

```
                       PlatformGpsAdapter (Abstract)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       AndroidGpsAdapter (Platform)             IosGpsAdapter (Platform)
       (FusedLocationProviderClient)            (CoreLocation)
```

1. **Clean Separation:** Platform-specific APIs are wrapped behind `ILocationService` and `PlatformGpsAdapter`.
2. **Permissions:** `checkLocationPermission()` and `requestLocationPermission()` decoupled from domain logic.
3. **Telemetry Streaming:** Streams `LocationPoint(latitude, longitude, timestamp, speed, heading, accuracy)`.
4. **Accuracy Thresholds:** Filters low-accuracy fixes before publishing to `/ubicaciones_repartidores`.
