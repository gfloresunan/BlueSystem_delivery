/// BLUE SYSTEM DELIVERY ENTERPRISE — SCHEDULED ORDER DOMAIN ENTITIES
/// 1:1 Parity with Android Models.kt (FulfillmentTiming, RecipientInfo, GiftDetails, SpecialHandling)
/// Canonical Data Contract for Scheduled Commerce (ADR Scheduled Commerce V1).

class FulfillmentTimingEntity {
  final String mode; // 'IMMEDIATE' | 'SCHEDULED'
  final DateTime? windowStartAt;
  final DateTime? windowEndAt;
  final String timezone;
  final DateTime? createdAt;
  final int? preparationLeadMinutes;
  final int? dispatchLeadMinutes;

  const FulfillmentTimingEntity({
    this.mode = 'IMMEDIATE',
    this.windowStartAt,
    this.windowEndAt,
    this.timezone = 'America/Managua',
    this.createdAt,
    this.preparationLeadMinutes,
    this.dispatchLeadMinutes,
  });

  bool get isScheduled => mode.toUpperCase() == 'SCHEDULED';

  factory FulfillmentTimingEntity.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const FulfillmentTimingEntity();
    final modeStr = (map['mode'] as String?)?.trim().toUpperCase() ?? 'IMMEDIATE';
    return FulfillmentTimingEntity(
      mode: modeStr,
      windowStartAt: _parseTimestamp(map['windowStartAt']),
      windowEndAt: _parseTimestamp(map['windowEndAt']),
      timezone: map['timezone'] as String? ?? 'America/Managua',
      createdAt: _parseTimestamp(map['createdAt']),
      preparationLeadMinutes: (map['preparationLeadMinutes'] as num?)?.toInt(),
      dispatchLeadMinutes: (map['dispatchLeadMinutes'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'mode': mode,
      'windowStartAt': windowStartAt?.toIso8601String(),
      'windowEndAt': windowEndAt?.toIso8601String(),
      'timezone': timezone,
      'createdAt': createdAt?.toIso8601String(),
      if (preparationLeadMinutes != null) 'preparationLeadMinutes': preparationLeadMinutes,
      if (dispatchLeadMinutes != null) 'dispatchLeadMinutes': dispatchLeadMinutes,
    };
  }

  static DateTime? _parseTimestamp(dynamic val) {
    if (val == null) return null;
    if (val is DateTime) return val;
    if (val is int) return DateTime.fromMillisecondsSinceEpoch(val);
    if (val is num) return DateTime.fromMillisecondsSinceEpoch(val.toInt());
    if (val is String) return DateTime.tryParse(val);
    try {
      // Duck-typing for cloud_firestore Timestamp
      final seconds = (val as dynamic).seconds as int?;
      final nanoseconds = (val as dynamic).nanoseconds as int? ?? 0;
      if (seconds != null) {
        return DateTime.fromMillisecondsSinceEpoch(seconds * 1000 + (nanoseconds / 1000000).round());
      }
    } catch (_) {}
    return null;
  }
}

class RecipientInfoEntity {
  final bool isThirdParty;
  final String name;
  final String phone;
  final String deliveryInstructions;

  const RecipientInfoEntity({
    this.isThirdParty = false,
    this.name = '',
    this.phone = '',
    this.deliveryInstructions = '',
  });

  factory RecipientInfoEntity.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const RecipientInfoEntity();
    return RecipientInfoEntity(
      isThirdParty: map['isThirdParty'] as bool? ?? false,
      name: map['name'] as String? ?? '',
      phone: map['phone'] as String? ?? '',
      deliveryInstructions: map['deliveryInstructions'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'isThirdParty': isThirdParty,
      'name': name,
      'phone': phone,
      'deliveryInstructions': deliveryInstructions,
    };
  }
}

class GiftDetailsEntity {
  final bool isGift;
  final String senderName;
  final bool isAnonymous;
  final String message;
  final String cardTemplateId;

  const GiftDetailsEntity({
    this.isGift = false,
    this.senderName = '',
    this.isAnonymous = false,
    this.message = '',
    this.cardTemplateId = '',
  });

  factory GiftDetailsEntity.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const GiftDetailsEntity();
    return GiftDetailsEntity(
      isGift: map['isGift'] as bool? ?? false,
      senderName: map['senderName'] as String? ?? '',
      isAnonymous: map['isAnonymous'] as bool? ?? false,
      message: map['message'] as String? ?? '',
      cardTemplateId: map['cardTemplateId'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'isGift': isGift,
      'senderName': senderName,
      'isAnonymous': isAnonymous,
      'message': message,
      'cardTemplateId': cardTemplateId,
    };
  }
}

class SpecialHandlingEntity {
  final String type; // STANDARD, FLOWERS, CAKE, BALLOONS, FRAGILE, CUSTOM
  final bool fragile;
  final bool keepUpright;
  final bool temperatureSensitive;
  final String handlingNote;

  const SpecialHandlingEntity({
    this.type = 'STANDARD',
    this.fragile = false,
    this.keepUpright = false,
    this.temperatureSensitive = false,
    this.handlingNote = '',
  });

  factory SpecialHandlingEntity.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const SpecialHandlingEntity();
    return SpecialHandlingEntity(
      type: (map['type'] as String?)?.trim().toUpperCase() ?? 'STANDARD',
      fragile: map['fragile'] as bool? ?? false,
      keepUpright: map['keepUpright'] as bool? ?? false,
      temperatureSensitive: map['temperatureSensitive'] as bool? ?? false,
      handlingNote: map['handlingNote'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'fragile': fragile,
      'keepUpright': keepUpright,
      'temperatureSensitive': temperatureSensitive,
      'handlingNote': handlingNote,
    };
  }
}
