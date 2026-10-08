/// BLUE SYSTEM DELIVERY ENTERPRISE — PROMOTIONAL POPUP ENTITY
/// 1:1 Parity with Android PromotionalPopup.kt
/// Canonical Schema for /promotional_popups collection.

class PromotionalPopupEntity {
  final String id;
  final String title;
  final String description;
  final String imageUrl;
  final String actionType; // 'MERCHANT' | 'PRODUCT' | 'CATEGORY' | 'EXTERNAL_LINK' | 'DISMISS'
  final String actionTarget;
  final int priority;
  final String frequency; // 'ONCE' | 'ONCE_PER_SESSION' | 'ONCE_PER_DAY' | 'ALWAYS' | 'WHILE_ACTIVE'
  final String context; // 'CUSTOMER_HOME' | 'APP_OPEN'
  final List<String> placements; // 'DASHBOARD' | 'CATEGORIES' | 'SECTIONS'
  final List<String> targetCategoryIds;
  final List<String> targetSectionIds;
  final String status; // 'DRAFT' | 'PUBLISHED' | 'PAUSED'
  final String startDate;
  final String endDate;
  final bool active;
  final int deliveryVersion;
  final int cooldownMinutes;
  final dynamic createdAt;
  final dynamic updatedAt;

  const PromotionalPopupEntity({
    required this.id,
    this.title = '',
    this.description = '',
    this.imageUrl = '',
    this.actionType = 'DISMISS',
    this.actionTarget = '',
    this.priority = 10,
    this.frequency = 'ONCE_PER_SESSION',
    this.context = 'CUSTOMER_HOME',
    this.placements = const [],
    this.targetCategoryIds = const [],
    this.targetSectionIds = const [],
    this.status = '',
    this.startDate = '',
    this.endDate = '',
    this.active = true,
    this.deliveryVersion = 1,
    this.cooldownMinutes = 0,
    this.createdAt,
    this.updatedAt,
  });

  bool get isEffectivelyActive {
    if (status.isNotEmpty) {
      return status.toUpperCase() == 'PUBLISHED';
    }
    return active;
  }

  factory PromotionalPopupEntity.fromMap(Map<String, dynamic> map, String id) {
    List<String> parseList(dynamic raw) {
      if (raw is List) {
        return raw.map((e) => e.toString()).toList();
      }
      return [];
    }

    return PromotionalPopupEntity(
      id: id,
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? map['message'] as String? ?? '',
      imageUrl: map['imageUrl'] as String? ?? '',
      actionType: (map['actionType'] as String?)?.trim().toUpperCase() ?? 'DISMISS',
      actionTarget: map['actionTarget'] as String? ?? '',
      priority: (map['priority'] as num?)?.toInt() ?? 10,
      frequency: (map['frequency'] as String?)?.trim().toUpperCase() ?? 'ONCE_PER_SESSION',
      context: map['context'] as String? ?? 'CUSTOMER_HOME',
      placements: parseList(map['placements']),
      targetCategoryIds: parseList(map['targetCategoryIds']),
      targetSectionIds: parseList(map['targetSectionIds']),
      status: map['status'] as String? ?? '',
      startDate: map['startDate'] as String? ?? '',
      endDate: map['endDate'] as String? ?? '',
      active: map['active'] as bool? ?? true,
      deliveryVersion: (map['deliveryVersion'] as num?)?.toInt() ?? 1,
      cooldownMinutes: (map['cooldownMinutes'] as num?)?.toInt() ?? 0,
      createdAt: map['createdAt'],
      updatedAt: map['updatedAt'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'imageUrl': imageUrl,
      'actionType': actionType,
      'actionTarget': actionTarget,
      'priority': priority,
      'frequency': frequency,
      'context': context,
      'placements': placements,
      'targetCategoryIds': targetCategoryIds,
      'targetSectionIds': targetSectionIds,
      'status': status,
      'startDate': startDate,
      'endDate': endDate,
      'active': active,
      'deliveryVersion': deliveryVersion,
      'cooldownMinutes': cooldownMinutes,
    };
  }
}
