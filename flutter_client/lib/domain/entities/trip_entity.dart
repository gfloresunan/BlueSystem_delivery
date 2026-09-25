/// BLUE SYSTEM DELIVERY ENTERPRISE — TRIP DOMAIN ENTITY (X→Y Delivery)
/// Canonical schema for Point-to-Point delivery trips (/deliveryTrips/{tripId}).

enum TripStatus {
  requested,
  offered,
  assigned,
  onWayToOrigin,
  arrivedAtOrigin,
  goodsPickedUp,
  onWayToDestination,
  arrivedAtDestination,
  completed,
  cancelled,
}

class LocationPoint {
  final String address;
  final double latitude;
  final double longitude;
  final String? reference;
  final String? contactName;
  final String? contactPhone;

  const LocationPoint({
    this.address = '',
    required this.latitude,
    required this.longitude,
    this.reference,
    this.contactName,
    this.contactPhone,
  });

  factory LocationPoint.fromMap(Map<String, dynamic> map) {
    return LocationPoint(
      address: map['address'] as String? ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      reference: map['reference'] as String?,
      contactName: map['contactName'] as String?,
      contactPhone: map['contactPhone'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        'reference': reference,
        'contactName': contactName,
        'contactPhone': contactPhone,
      };
}

class TripEntity {
  final String tripId;
  final String tenantId;
  final String? brandId;
  final String customerId;
  final String? assignedCourierId;
  final LocationPoint origin;
  final LocationPoint destination;
  final double distanceKm;
  final double basePrice;
  final double distancePrice;
  final double totalPrice;
  final TripStatus status;
  final String? packageDescription;
  final int createdAt;
  final int updatedAt;

  String get originAddress => origin.address;
  String get destinationAddress => destination.address;
  double get fare => totalPrice;

  const TripEntity({
    required this.tripId,
    required this.tenantId,
    this.brandId,
    required this.customerId,
    this.assignedCourierId,
    required this.origin,
    required this.destination,
    required this.distanceKm,
    required this.basePrice,
    required this.distancePrice,
    required this.totalPrice,
    required this.status,
    this.packageDescription,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TripEntity.fromMap(Map<String, dynamic> map, String id) {
    final originMap = (map['origin'] as Map<String, dynamic>?) ?? {
      'address': map['originAddress'] as String? ?? map['address'] as String? ?? '',
      'latitude': (map['originLat'] as num?)?.toDouble() ?? 0.0,
      'longitude': (map['originLng'] as num?)?.toDouble() ?? 0.0,
    };
    final destMap = (map['destination'] as Map<String, dynamic>?) ?? {
      'address': map['destinationAddress'] as String? ?? '',
      'latitude': (map['destinationLat'] as num?)?.toDouble() ?? 0.0,
      'longitude': (map['destinationLng'] as num?)?.toDouble() ?? 0.0,
    };
    final fare = (map['totalPrice'] as num?)?.toDouble() ?? (map['fare'] as num?)?.toDouble() ?? 35.0;

    return TripEntity(
      tripId: id,
      tenantId: map['tenantId'] as String? ?? '',
      brandId: map['brandId'] as String?,
      customerId: map['customerId'] as String? ?? '',
      assignedCourierId: map['assignedCourierId'] as String? ?? map['courierId'] as String?,
      origin: LocationPoint.fromMap(originMap),
      destination: LocationPoint.fromMap(destMap),
      distanceKm: (map['distanceKm'] as num?)?.toDouble() ?? 0.0,
      basePrice: (map['basePrice'] as num?)?.toDouble() ?? fare,
      distancePrice: (map['distancePrice'] as num?)?.toDouble() ?? 0.0,
      totalPrice: fare,
      status: _parseStatus(map['status'] as String?),
      packageDescription: map['packageDescription'] as String?,
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }

  static TripStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'OFFERED':
        return TripStatus.offered;
      case 'ASSIGNED':
        return TripStatus.assigned;
      case 'ON_WAY_TO_ORIGIN':
        return TripStatus.onWayToOrigin;
      case 'ARRIVED_ORIGIN':
        return TripStatus.arrivedAtOrigin;
      case 'PICKED_UP':
        return TripStatus.goodsPickedUp;
      case 'ON_WAY_DESTINATION':
        return TripStatus.onWayToDestination;
      case 'ARRIVED_DESTINATION':
        return TripStatus.arrivedAtDestination;
      case 'COMPLETED':
        return TripStatus.completed;
      case 'CANCELLED':
        return TripStatus.cancelled;
      case 'REQUESTED':
      default:
        return TripStatus.requested;
    }
  }

  Map<String, dynamic> toMap() => {
        'tenantId': tenantId,
        'brandId': brandId,
        'customerId': customerId,
        'assignedCourierId': assignedCourierId,
        'origin': origin.toMap(),
        'destination': destination.toMap(),
        'distanceKm': distanceKm,
        'basePrice': basePrice,
        'distancePrice': distancePrice,
        'totalPrice': totalPrice,
        'status': status.name.toUpperCase(),
        'packageDescription': packageDescription,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}
