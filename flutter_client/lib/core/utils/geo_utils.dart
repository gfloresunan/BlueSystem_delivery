import 'dart:math' as math;

/// BLUE SYSTEM DELIVERY ENTERPRISE — GEOGRAPHIC UTILITIES (1:1 ANDROID PARITY)
/// Implements Haversine distance engine and coordinate validation matching Android GeoUtils.kt.
class GeoUtils {
  static const double earthRadiusKm = 6371.0;

  /// Calculates the Haversine distance in kilometers between two geographic coordinates.
  static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      return 0.0;
    }

    final dLat = _degreesToRadians(lat2 - lat1);
    final dLon = _degreesToRadians(lon2 - lon1);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degreesToRadians(lat1)) *
            math.cos(_degreesToRadians(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  /// Validates whether latitude and longitude are non-zero valid world coordinates.
  static bool isValidCoordinate(double lat, double lon) {
    if (lat == 0.0 && lon == 0.0) return false;
    if (lat < -90.0 || lat > 90.0) return false;
    if (lon < -180.0 || lon > 180.0) return false;
    return true;
  }

  static double _degreesToRadians(double degrees) {
    return degrees * (math.pi / 180.0);
  }
}
