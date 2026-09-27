/// BLUE SYSTEM DELIVERY ENTERPRISE — X→Y DELIVERY PRICING ENGINE
/// Canonical Implementation strictly conforming to ADR-026 (BSD-X2Y-FINANCIAL-FROZEN-CORE-001)
/// Ecuación Canónica Inmutable: 35.0 + (distanceKm * 10.0)
/// Certified Benchmark: 14.91 km -> C$ 184.10 exact.

class XToYPricingEngine {
  /// Base Fee in NIO (Córdobas) strictly per ADR-026
  static const double baseFee = 35.0;

  /// Price per Kilometer in NIO (Córdobas) strictly per ADR-026
  static const double pricePerKm = 10.0;

  /// Currency
  static const String currency = 'NIO';

  /// Policy Identifier
  static const String pricingPolicy = 'ADR-026_SSOT_FAIL_CLOSED';

  /// Engine Version
  static const String pricingVersion = 'v2.0';

  /// Calculates the canonical trip fee strictly per ADR-026.
  /// Formula: 35.0 + (distanceKm * 10.0)
  static double calculateFee(double distanceKm) {
    if (distanceKm <= 0.0) {
      return baseFee;
    }
    final raw = baseFee + (distanceKm * pricePerKm);
    return double.parse(raw.toStringAsFixed(2));
  }

  /// Validates whether a custom customer offer is acceptable.
  /// Invariant: Customer offer cannot be below the ADR-026 base fee ($35.0).
  static bool isValidOffer(double offerAmount, double calculatedFee) {
    if (offerAmount < baseFee) {
      return false;
    }
    return true;
  }

  /// Builds the authoritative pricing snapshot dictionary for Firestore /deliveryTrips persistence.
  static Map<String, dynamic> buildPricingSnapshot({
    required double distanceKm,
    required double calculatedAmount,
    double? customOffer,
  }) {
    final effectiveTotal = customOffer ?? calculatedAmount;
    final distanceMeters = (distanceKm * 1000.0).round();
    final courierEarnings = double.parse((effectiveTotal * 0.85).toStringAsFixed(2));
    final platformRevenue = double.parse((effectiveTotal * 0.15).toStringAsFixed(2));

    return {
      'baseFee': baseFee,
      'perKmRate': pricePerKm,
      'pricePerKm': pricePerKm,
      'calculatedAmount': calculatedAmount,
      'rawCalculatedTotal': calculatedAmount,
      'roundingAdjustment': 0.0,
      'courierEarnings': courierEarnings,
      'platformRevenue': platformRevenue,
      'currency': currency,
      'distanceKm': distanceKm,
      'routeDistanceMeters': distanceMeters,
      'routeDistanceKm': distanceKm,
      'calculationPolicy': pricingPolicy,
      'configVersion': pricingVersion,
      'calculatedAt': DateTime.now().toUtc().toIso8601String(),
    };
  }
}
