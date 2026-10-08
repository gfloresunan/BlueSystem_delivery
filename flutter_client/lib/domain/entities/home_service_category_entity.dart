/// BLUE SYSTEM DELIVERY ENTERPRISE — HOME SERVICE CATEGORY DOMAIN ENTITY
/// 1:1 Parity with Android Models.kt (HomeServiceCategory)
/// Canonical schema for Explora Servicios & Category Hub (/home_service_categories).
/// Protocol: BSD-CUSTOMER-SERVICE-CATEGORY-HUB-001 / ADR-036.

class HomeServiceCategoryEntity {
  final String id;
  final String name;
  final String slug;
  final bool isActive;
  final String icon;
  final String iconType; // 'EMOJI' | 'IMAGE_URL'
  final String iconUrl;
  final String imageUrl;
  final String backgroundStyle;
  final int row; // 1 = Fila superior (3 cols grandes), 2 = Fila inferior (4 cols compactas)
  final int position;
  final String displaySize; // 'LARGE' | 'COMPACT'
  final String navigationType; // 'MERCHANT_LIST' | 'CATEGORY_LANDING' | 'X_TO_Y' | 'COMING_SOON' | 'DEEPLINK'
  final String navigationTarget;
  final String merchantCategoryBinding;
  final bool showFeaturedContent;
  final String featuredTitle;
  final List<String> featuredProductIds;
  final String badgeText;
  final String subtitle;
  final String comingSoonMessage;
  final dynamic createdAt;
  final dynamic updatedAt;

  const HomeServiceCategoryEntity({
    required this.id,
    required this.name,
    required this.slug,
    this.isActive = true,
    this.icon = '',
    this.iconType = 'EMOJI',
    this.iconUrl = '',
    this.imageUrl = '',
    this.backgroundStyle = 'DEFAULT',
    this.row = 1,
    this.position = 1,
    this.displaySize = 'LARGE',
    this.navigationType = 'CATEGORY_LANDING',
    this.navigationTarget = '',
    this.merchantCategoryBinding = '',
    this.showFeaturedContent = false,
    this.featuredTitle = '',
    this.featuredProductIds = const [],
    this.badgeText = '',
    this.subtitle = '',
    this.comingSoonMessage = '',
    this.createdAt,
    this.updatedAt,
  });

  String get effectiveImageUrl {
    if (iconUrl.toLowerCase().startsWith('http')) return iconUrl;
    if (imageUrl.toLowerCase().startsWith('http')) return imageUrl;
    return '';
  }

  String get effectiveEmoji {
    if (iconUrl.isNotEmpty && !iconUrl.toLowerCase().startsWith('http')) return iconUrl;
    if (icon.isNotEmpty && !icon.toLowerCase().startsWith('http') && icon != '📁') return icon;
    return '📦';
  }

  String get effectiveDisplayTitle {
    if (name.trim().isNotEmpty) return name;
    if (slug.isNotEmpty) {
      return slug[0].toUpperCase() + slug.substring(1);
    }
    return '';
  }

  factory HomeServiceCategoryEntity.fromMap(Map<String, dynamic> map, String id) {
    final active = map['active'] as bool? ?? map['isActive'] as bool? ?? true;
    final rowVal = (map['row'] as num?)?.toInt() ?? 1;
    final posVal = (map['position'] as num?)?.toInt() ?? (map['order'] as num?)?.toInt() ?? 1;
    final slugVal = map['slug'] as String? ?? '';

    List<String> prodIds = [];
    if (map['featuredProductIds'] is List) {
      prodIds = (map['featuredProductIds'] as List).map((e) => e.toString()).toList();
    }

    return HomeServiceCategoryEntity(
      id: id,
      name: map['name'] as String? ?? '',
      slug: slugVal,
      isActive: active,
      icon: (map['icon'] as String?)?.replaceAll('📁', '').trim() ?? '',
      iconType: map['iconType'] as String? ?? 'EMOJI',
      iconUrl: map['iconUrl'] as String? ?? '',
      imageUrl: map['imageUrl'] as String? ?? '',
      backgroundStyle: map['backgroundStyle'] as String? ?? 'DEFAULT',
      row: rowVal,
      position: posVal,
      displaySize: map['displaySize'] as String? ?? (rowVal == 1 ? 'LARGE' : 'COMPACT'),
      navigationType: map['navigationType'] as String? ?? 'CATEGORY_LANDING',
      navigationTarget: map['navigationTarget'] as String? ?? '',
      merchantCategoryBinding: map['merchantCategoryBinding'] as String? ?? slugVal,
      showFeaturedContent: map['showFeaturedContent'] as bool? ?? false,
      featuredTitle: map['featuredTitle'] as String? ?? '',
      featuredProductIds: prodIds,
      badgeText: map['badgeText'] as String? ?? '',
      subtitle: map['subtitle'] as String? ?? '',
      comingSoonMessage: map['comingSoonMessage'] as String? ?? '',
      createdAt: map['createdAt'],
      updatedAt: map['updatedAt'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'isActive': isActive,
      'icon': icon,
      'iconType': iconType,
      'iconUrl': iconUrl,
      'imageUrl': imageUrl,
      'backgroundStyle': backgroundStyle,
      'row': row,
      'position': position,
      'displaySize': displaySize,
      'navigationType': navigationType,
      'navigationTarget': navigationTarget,
      'merchantCategoryBinding': merchantCategoryBinding,
      'showFeaturedContent': showFeaturedContent,
      'featuredTitle': featuredTitle,
      'featuredProductIds': featuredProductIds,
      'badgeText': badgeText,
      'subtitle': subtitle,
      'comingSoonMessage': comingSoonMessage,
    };
  }
}
