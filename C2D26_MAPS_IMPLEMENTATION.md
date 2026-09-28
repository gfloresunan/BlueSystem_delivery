# C2D26 — MAPS ARCHITECTURE & IMPLEMENTATION

**Module:** Multiplatform Maps Abstraction  
**File:** `flutter_client/lib/platform/maps/map_platform_adapter.dart`  

---

## 1. Architectural Strategy

1. **Zero External Provisioning:** In accordance with C2D.26 governance, no external Google Cloud API keys or Maps SDK builds are configured during this phase.
2. **Abstract Interface:** `MapPlatformAdapter` declares standard operations (`initialize`, `moveCameraTo`, `addMarker`, `updateMarkerPosition`, `drawRoute`, `clearRoute`, `dispose`).
3. **Sentinel Implementation:** `SentinelMapAdapter` fulfills all interface contracts as a safe no-op implementation for pure unit testing and initial layout verification.
4. **Target Multi-Platform Map Providers:**
   - Android: Google Maps Flutter / Mapbox / CartoDB.
   - iOS: Apple Maps / Google Maps iOS SDK.
5. **Zero Proprietary Hardcoding:** Domain and Presentation layers depend solely on `MapPlatformAdapter`.
