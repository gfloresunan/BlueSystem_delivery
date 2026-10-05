// BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001 (ADR-030 1:1 Parity)
// Dart domain entity matching Android Models.kt: HomeEditorialAd & BlockActionConfig

class BlockActionConfigEntity {
  final String type; // NONE, MERCHANT, PRODUCT, CATEGORY, INTERNAL_ROUTE, EXTERNAL_URL
  final String target;
  final String label;

  const BlockActionConfigEntity({
    this.type = 'NONE',
    this.target = '',
    this.label = '',
  });

  bool get isActionable {
    final t = type.trim().toUpperCase();
    return t.isNotEmpty && t != 'NONE' && target.trim().isNotEmpty;
  }

  factory BlockActionConfigEntity.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const BlockActionConfigEntity();
    return BlockActionConfigEntity(
      type: map['type']?.toString().trim() ?? 'NONE',
      target: map['target']?.toString().trim() ?? '',
      label: map['label']?.toString().trim() ?? '',
    );
  }

  Map<String, dynamic> toMap() => {
    'type': type,
    'target': target,
    'label': label,
  };
}

class HomeEditorialAdEntity {
  final String id;
  final String type;
  final String title;
  final String subtitle;
  final String badgeText;
  final String ctaText;
  final String imageUrl;
  final String actionType; // NONE, MERCHANT, PRODUCT, CATEGORY, INTERNAL_ROUTE, EXTERNAL_URL
  final String actionTarget;
  final String merchantId;
  final String merchantNameSnapshot;
  final String merchantLogoUrlSnapshot;
  final String productId;
  final String productNameSnapshot;
  final double? productPrice;
  final bool active;
  final int order;
  final int? startAt; // Epoch ms
  final int? endAt;   // Epoch ms
  final String? targetCity;
  final String? tenantId;
  final String? targetPlatform;
  final int? createdAt;
  final int? updatedAt;
  final String? createdBy;

  // Compat aliases
  final String? badge;
  final bool? isActive;
  final String? merchantName;
  final String? merchantLogoUrl;
  final String? productName;
  final String? targetId;
  final String? targetRoute;
  final String? targetUrl;

  const HomeEditorialAdEntity({
    this.id = '',
    this.type = 'GENERIC_EDITORIAL',
    this.title = '',
    this.subtitle = '',
    this.badgeText = '',
    this.ctaText = '',
    this.imageUrl = '',
    this.actionType = 'NONE',
    this.actionTarget = '',
    this.merchantId = '',
    this.merchantNameSnapshot = '',
    this.merchantLogoUrlSnapshot = '',
    this.productId = '',
    this.productNameSnapshot = '',
    this.productPrice,
    this.active = true,
    this.order = 0,
    this.startAt,
    this.endAt,
    this.targetCity,
    this.tenantId,
    this.targetPlatform,
    this.createdAt,
    this.updatedAt,
    this.createdBy,
    this.badge,
    this.isActive,
    this.merchantName,
    this.merchantLogoUrl,
    this.productName,
    this.targetId,
    this.targetRoute,
    this.targetUrl,
  });

  String get effectiveBadgeText => badgeText.isNotEmpty ? badgeText : (badge ?? '');
  bool get effectiveIsActive => isActive ?? active;
  String get effectiveMerchantName => merchantNameSnapshot.isNotEmpty ? merchantNameSnapshot : (merchantName ?? '');
  String get effectiveMerchantLogoUrl => merchantLogoUrlSnapshot.isNotEmpty ? merchantLogoUrlSnapshot : (merchantLogoUrl ?? '');
  String get effectiveProductName => productNameSnapshot.isNotEmpty ? productNameSnapshot : (productName ?? '');
  String get effectiveActionTarget => actionTarget.isNotEmpty ? actionTarget : (targetUrl ?? targetRoute ?? targetId ?? '');

  bool isCurrentlyValid({int? nowMs}) {
    if (!effectiveIsActive) return false;
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    if (startAt != null && now < startAt!) return false;
    if (endAt != null && now > endAt!) return false;
    return true;
  }

  factory HomeEditorialAdEntity.fromMap(Map<String, dynamic> map, {String id = ''}) {
    int? parseEpochMs(dynamic val) {
      if (val == null) return null;
      if (val is int) return val;
      if (val is num) return val.toInt();
      // Handle Firebase Timestamp or DateTime
      if (val is DateTime) return val.millisecondsSinceEpoch;
      if (val.runtimeType.toString() == 'Timestamp') {
        try {
          return (val as dynamic).millisecondsSinceEpoch as int;
        } catch (_) {}
      }
      if (val is String) {
        final parsed = int.tryParse(val);
        if (parsed != null) return parsed;
        final dt = DateTime.tryParse(val);
        if (dt != null) return dt.millisecondsSinceEpoch;
      }
      return null;
    }

    double? parseDouble(dynamic val) {
      if (val == null) return null;
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val);
      return null;
    }

    return HomeEditorialAdEntity(
      id: id.isNotEmpty ? id : (map['id']?.toString() ?? ''),
      type: map['type']?.toString() ?? 'GENERIC_EDITORIAL',
      title: map['title']?.toString() ?? '',
      subtitle: map['subtitle']?.toString() ?? '',
      badgeText: map['badgeText']?.toString() ?? '',
      ctaText: map['ctaText']?.toString() ?? '',
      imageUrl: map['imageUrl']?.toString() ?? '',
      actionType: map['actionType']?.toString() ?? 'NONE',
      actionTarget: map['actionTarget']?.toString() ?? '',
      merchantId: map['merchantId']?.toString() ?? '',
      merchantNameSnapshot: map['merchantNameSnapshot']?.toString() ?? '',
      merchantLogoUrlSnapshot: map['merchantLogoUrlSnapshot']?.toString() ?? '',
      productId: map['productId']?.toString() ?? '',
      productNameSnapshot: map['productNameSnapshot']?.toString() ?? '',
      productPrice: parseDouble(map['productPrice']),
      active: map['active'] is bool ? (map['active'] as bool) : true,
      order: (map['order'] as num?)?.toInt() ?? 0,
      startAt: parseEpochMs(map['startAt']),
      endAt: parseEpochMs(map['endAt']),
      targetCity: map['targetCity']?.toString(),
      tenantId: map['tenantId']?.toString(),
      targetPlatform: map['targetPlatform']?.toString(),
      createdAt: parseEpochMs(map['createdAt']),
      updatedAt: parseEpochMs(map['updatedAt']),
      createdBy: map['createdBy']?.toString(),
      badge: map['badge']?.toString(),
      isActive: map['isActive'] is bool ? (map['isActive'] as bool) : null,
      merchantName: map['merchantName']?.toString(),
      merchantLogoUrl: map['merchantLogoUrl']?.toString(),
      productName: map['productName']?.toString(),
      targetId: map['targetId']?.toString(),
      targetRoute: map['targetRoute']?.toString(),
      targetUrl: map['targetUrl']?.toString(),
    );
  }
}
