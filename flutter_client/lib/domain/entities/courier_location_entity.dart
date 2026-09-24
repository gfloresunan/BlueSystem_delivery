/// BLUE SYSTEM DELIVERY ENTERPRISE — COURIER LOCATION TELEMETRY ENTITY
/// Canonical schema for live GPS tracking (/ubicaciones_repartidores/{courierId}).

class CourierLocationEntity {
  final String courierId;
  final String? tenantId;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final int timestamp;
  final bool isOnline;
  final String? activeOrderId;
  final String? activeTripId;

  const CourierLocationEntity({
    required this.courierId,
    this.tenantId,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.speed,
    this.heading,
    required this.timestamp,
    required this.isOnline,
    this.activeOrderId,
    this.activeTripId,
  });

  bool get isFresh {
    final diffMs = DateTime.now().millisecondsSinceEpoch - timestamp;
    return diffMs <= (10 * 60 * 1000); // 10 minutes max freshness threshold (ADR-016)
  }

  factory CourierLocationEntity.fromMap(Map<String, dynamic> map, String id) {
    return CourierLocationEntity(
      courierId: id,
      tenantId: map['tenantId'] as String?,
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      accuracy: (map['accuracy'] as num?)?.toDouble(),
      speed: (map['speed'] as num?)?.toDouble(),
      heading: (map['heading'] as num?)?.toDouble(),
      timestamp: (map['timestamp'] as num?)?.toInt() ?? 0,
      isOnline: map['isOnline'] as bool? ?? false,
      activeOrderId: map['activeOrderId'] as String?,
      activeTripId: map['activeTripId'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'tenantId': tenantId,
        'latitude': latitude,
        'longitude': longitude,
        'accuracy': accuracy,
        'speed': speed,
        'heading': heading,
        'timestamp': timestamp,
        'isOnline': isOnline,
        'activeOrderId': activeOrderId,
        'activeTripId': activeTripId,
      };
}
