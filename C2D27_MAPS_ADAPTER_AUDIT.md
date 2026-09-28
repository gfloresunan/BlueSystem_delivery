# Phase 2D.27 — Maps Adapter & Sentinel Architecture Audit

**Protocol ID:** `BSD-C2D27-FLUTTER-INTEGRATION-EXTERNAL-PROVISIONING-READINESS-001`  
**Phase:** `C2D.27 — Flutter Integration & External Provisioning Readiness`  
**Scope:** `MapPlatformAdapter Contract, SentinelMapAdapter Stub & Cartographic Fallback`

---

## 1. Adapter Contract & Sentinel Stub

In `flutter_client/lib/platform/maps/map_platform_adapter.dart`:

```dart
abstract class MapPlatformAdapter {
  Future<void> initialize({required String apiKey});
  Future<LocationPoint?> getMapCenter();
  Future<void> moveCameraTo(LocationPoint point, {double zoom = 15.0});
  Future<String> addMarker({required LocationPoint location, required String markerId, required String title, String? iconAsset});
  Future<void> removeMarker(String markerId);
  Future<void> updateMarkerPosition(String markerId, LocationPoint newLocation);
  Future<void> drawRoute({required LocationPoint origin, required LocationPoint destination, required String routeId});
  Future<void> clearRoute(String routeId);
  Future<void> dispose();
}
```

`SentinelMapAdapter` implements all methods safely as no-ops / null-returns without making external Google Maps API requests or triggering rendering exceptions.

---

## 2. Governance Alignment & Gap Classification

- **Status in C2D.27:** Sentinel adapter guarantees fail-safe operation during non-provisioned testing.
- **Classification:** `GAP-MAPS-01` (Android GCP key restriction) and `GAP-MAPS-02` (iOS Maps SDK enablement) remain cataloged as `BLOCKED_EXTERNAL`.
- **Verdict:** 🟢 VERIFIED (Code contract satisfied without violating freeze rules).
