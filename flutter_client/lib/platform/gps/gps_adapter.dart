/// BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM GPS ADAPTER (iOS / Multiplatform)
/// Abstracts native CoreLocation on iOS and FusedLocation on Android.
/// Implements ADR-015 and ADR-016 compliant background telemetry.

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/errors/app_exceptions.dart';
import '../../core/observability/app_logger.dart';
import '../../domain/entities/trip_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class PlatformGpsAdapter implements ILocationService {
  @override
  Future<bool> checkLocationPermission() async {
    final permission = await Geolocator.checkPermission();
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  @override
  Future<bool> requestLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  @override
  Future<LocationPoint> getCurrentDeviceLocation() async {
    final hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      final granted = await requestLocationPermission();
      if (!granted) {
        throw PlatformCapabilityException(
          capability: 'GPS_LOCATION',
          reason: 'Permisos de ubicación denegados por el usuario en iOS.',
        );
      }
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      return LocationPoint(
        address: 'Posición Actual',
        latitude: pos.latitude,
        longitude: pos.longitude,
      );
    } catch (e, st) {
      AppLogger.error('PlatformGpsAdapter', 'Failed getting current position', e, st);
      throw PlatformCapabilityException(
        capability: 'GPS_LOCATION',
        reason: e.toString(),
      );
    }
  }

  @override
  Stream<LocationPoint> get livePositionStream {
    // Configuración especializada para iOS CoreLocation con fondo continuo
    late final LocationSettings locationSettings;

    if (defaultTargetPlatform == TargetPlatform.iOS) {
      locationSettings = AppleSettings(
        accuracy: LocationAccuracy.high,
        activityType: ActivityType.automotiveNavigation,
        distanceFilter: 10,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    } else {
      locationSettings = const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      );
    }

    return Geolocator.getPositionStream(locationSettings: locationSettings).map(
      (pos) => LocationPoint(
        address: 'Posición en Tiempo Real',
        latitude: pos.latitude,
        longitude: pos.longitude,
      ),
    );
  }
}
