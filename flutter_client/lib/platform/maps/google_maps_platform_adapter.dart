/// BLUE SYSTEM DELIVERY ENTERPRISE — GOOGLE MAPS PLATFORM ADAPTER
/// Implements MapPlatformAdapter using google_maps_flutter for iOS / Android.
/// Connects to Google Maps iOS SDK and provides reactive camera / marker management.

import 'dart:async';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/trip_entity.dart';
import 'map_platform_adapter.dart';

class GoogleMapsPlatformAdapter implements MapPlatformAdapter {
  GoogleMapController? _controller;
  final Map<MarkerId, Marker> _markers = {};
  final Map<PolylineId, Polyline> _polylines = {};

  final Completer<GoogleMapController> _controllerCompleter = Completer<GoogleMapController>();

  void onMapCreated(GoogleMapController controller) {
    _controller = controller;
    if (!_controllerCompleter.isCompleted) {
      _controllerCompleter.complete(controller);
    }
    AppLogger.info('GoogleMapsPlatformAdapter', 'Google Map Controller bound successfully on iOS');
  }

  Set<Marker> get currentMarkers => _markers.values.toSet();
  Set<Polyline> get currentPolylines => _polylines.values.toSet();

  @override
  Future<void> initialize({required String apiKey}) async {
    AppLogger.info('GoogleMapsPlatformAdapter', 'Initializing Google Maps with provisioned key');
  }

  @override
  Future<LocationPoint?> getMapCenter() async {
    final controller = await _controllerCompleter.future;
    final bounds = await controller.getVisibleRegion();
    final centerLat = (bounds.northeast.latitude + bounds.southwest.latitude) / 2.0;
    final centerLng = (bounds.northeast.longitude + bounds.southwest.longitude) / 2.0;

    return LocationPoint(
      address: 'Centro del Mapa',
      latitude: centerLat,
      longitude: centerLng,
    );
  }

  @override
  Future<void> moveCameraTo(LocationPoint point, {double zoom = 15.0}) async {
    final controller = await _controllerCompleter.future;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: LatLng(point.latitude, point.longitude),
          zoom: zoom,
        ),
      ),
    );
  }

  @override
  Future<String> addMarker({
    required LocationPoint location,
    required String markerId,
    required String title,
    String? iconAsset,
  }) async {
    final mId = MarkerId(markerId);
    final marker = Marker(
      markerId: mId,
      position: LatLng(location.latitude, location.longitude),
      infoWindow: InfoWindow(title: title, snippet: location.address),
    );

    _markers[mId] = marker;
    return markerId;
  }

  @override
  Future<void> removeMarker(String markerId) async {
    _markers.remove(MarkerId(markerId));
  }

  @override
  Future<void> updateMarkerPosition(String markerId, LocationPoint newLocation) async {
    final mId = MarkerId(markerId);
    if (_markers.containsKey(mId)) {
      final old = _markers[mId]!;
      _markers[mId] = old.copyWith(
        positionParam: LatLng(newLocation.latitude, newLocation.longitude),
      );
    }
  }

  @override
  Future<void> drawRoute({
    required LocationPoint origin,
    required LocationPoint destination,
    required String routeId,
  }) async {
    final pId = PolylineId(routeId);
    final polyline = Polyline(
      polylineId: pId,
      points: [
        LatLng(origin.latitude, origin.longitude),
        LatLng(destination.latitude, destination.longitude),
      ],
      width: 4,
    );

    _polylines[pId] = polyline;
  }

  @override
  Future<void> clearRoute(String routeId) async {
    _polylines.remove(PolylineId(routeId));
  }

  @override
  Future<void> dispose() async {
    _controller?.dispose();
    _markers.clear();
    _polylines.clear();
  }
}
