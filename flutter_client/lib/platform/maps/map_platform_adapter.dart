/// BLUE SYSTEM DELIVERY ENTERPRISE — MAP PLATFORM ADAPTER
/// Multiplatform abstraction for map rendering — Android / iOS strategy separation.
/// NOTE: No Google Maps API provisioning performed in this phase (C2D.26).
/// External API key configuration is deferred to C2D.27 (provisioning phase).

import '../../domain/entities/trip_entity.dart';

/// Abstract contract for all map operations in the Flutter client.
/// Both Android and iOS adapters must implement this interface.
abstract class MapPlatformAdapter {
  /// Initializes the map provider with a given API key.
  Future<void> initialize({required String apiKey});

  /// Returns the current center coordinates of the map view.
  Future<LocationPoint?> getMapCenter();

  /// Moves the map camera to a specific location.
  Future<void> moveCameraTo(LocationPoint point, {double zoom = 15.0});

  /// Places a marker at the specified location.
  Future<String> addMarker({
    required LocationPoint location,
    required String markerId,
    required String title,
    String? iconAsset,
  });

  /// Removes a marker by its ID.
  Future<void> removeMarker(String markerId);

  /// Updates an existing marker's position (for live courier tracking).
  Future<void> updateMarkerPosition(String markerId, LocationPoint newLocation);

  /// Draws a polyline route between origin and destination.
  Future<void> drawRoute({
    required LocationPoint origin,
    required LocationPoint destination,
    required String routeId,
  });

  /// Clears a specific route polyline from the map.
  Future<void> clearRoute(String routeId);

  /// Disposes the map controller and releases resources.
  Future<void> dispose();
}

/// Sentinel implementation — placeholder used when map provisioning has not been completed.
/// GOVERNANCE: This adapter is used in C2D.26 to satisfy architectural contracts
/// without triggering actual API usage or provisioning.
///
/// 🟡 GAP: MAP_PROVISIONING — Full adapter implementation blocked pending:
///   1. Google Maps API key provisioning (C2D.27)
///   2. Physical device validation (ADR-015)
class SentinelMapAdapter implements MapPlatformAdapter {
  @override
  Future<void> initialize({required String apiKey}) async {
    // SENTINEL — no external call made
  }

  @override
  Future<LocationPoint?> getMapCenter() async => null;

  @override
  Future<void> moveCameraTo(LocationPoint point, {double zoom = 15.0}) async {}

  @override
  Future<String> addMarker({
    required LocationPoint location,
    required String markerId,
    required String title,
    String? iconAsset,
  }) async => markerId;

  @override
  Future<void> removeMarker(String markerId) async {}

  @override
  Future<void> updateMarkerPosition(String markerId, LocationPoint newLocation) async {}

  @override
  Future<void> drawRoute({
    required LocationPoint origin,
    required LocationPoint destination,
    required String routeId,
  }) async {}

  @override
  Future<void> clearRoute(String routeId) async {}

  @override
  Future<void> dispose() async {}
}
