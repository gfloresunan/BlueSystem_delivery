/// BLUE SYSTEM DELIVERY ENTERPRISE — SAVED ADDRESS DOMAIN ENTITY
/// Canonical schema for customer delivery addresses (/users/{uid}/addresses/{addressId}).
/// Conforms 1:1 with Android Address model (Models.kt:667 / AddressRepository.kt).

class SavedAddressEntity {
  final String id;
  final String userId;
  final String label; // e.g. "Casa", "Trabajo", "Oficina", "Otro"
  final String fullAddress;
  final String instructions;
  final bool isDefault;
  final double latitude;
  final double longitude;
  final int createdAt;
  final int updatedAt;

  const SavedAddressEntity({
    required this.id,
    required this.userId,
    this.label = 'Casa',
    required this.fullAddress,
    this.instructions = '',
    this.isDefault = false,
    this.latitude = 0.0,
    this.longitude = 0.0,
    required this.createdAt,
    required this.updatedAt,
  });

  static int _parseTimestamp(dynamic val) {
    if (val == null) return DateTime.now().millisecondsSinceEpoch;
    if (val is num) return val.toInt();
    if (val is String) {
      final parsed = num.tryParse(val);
      if (parsed != null) return parsed.toInt();
      final date = DateTime.tryParse(val);
      if (date != null) return date.millisecondsSinceEpoch;
    }
    try {
      final ms = (val as dynamic).millisecondsSinceEpoch;
      if (ms is num) return ms.toInt();
    } catch (_) {}
    return DateTime.now().millisecondsSinceEpoch;
  }

  factory SavedAddressEntity.fromMap(Map<String, dynamic> map, String id) {
    final rawDefault = map['isDefault'] ?? map['default'] ?? map['predeterminada'] ?? map['isPrimary'];
    final bool parsedDefault = rawDefault == true || rawDefault?.toString().toLowerCase() == 'true';

    final lat = (map['latitude'] as num?)?.toDouble() ??
        (map['lat'] as num?)?.toDouble() ??
        0.0;
    final lng = (map['longitude'] as num?)?.toDouble() ??
        (map['lng'] as num?)?.toDouble() ??
        0.0;

    return SavedAddressEntity(
      id: id,
      userId: map['userId'] as String? ?? map['uid'] as String? ?? '',
      label: map['label'] as String? ?? map['etiqueta'] as String? ?? 'Casa',
      fullAddress: map['fullAddress'] as String? ?? map['address'] as String? ?? map['direccion'] as String? ?? '',
      instructions: map['instructions'] as String? ?? map['indicaciones'] as String? ?? map['deliveryInstructions'] as String? ?? '',
      isDefault: parsedDefault,
      latitude: lat,
      longitude: lng,
      createdAt: _parseTimestamp(map['createdAt']),
      updatedAt: _parseTimestamp(map['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'userId': userId,
        'label': label,
        'fullAddress': fullAddress,
        'instructions': instructions,
        'isDefault': isDefault,
        'latitude': latitude,
        'longitude': longitude,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  SavedAddressEntity copyWith({
    String? id,
    String? userId,
    String? label,
    String? fullAddress,
    String? instructions,
    bool? isDefault,
    double? latitude,
    double? longitude,
    int? createdAt,
    int? updatedAt,
  }) {
    return SavedAddressEntity(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      label: label ?? this.label,
      fullAddress: fullAddress ?? this.fullAddress,
      instructions: instructions ?? this.instructions,
      isDefault: isDefault ?? this.isDefault,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
