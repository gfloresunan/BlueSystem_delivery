/// BLUE SYSTEM DELIVERY ENTERPRISE — BRAND CONTEXT & HYDRATION
/// Zero mutation, deterministic theme & asset resolution for Flutter.

enum BrandStatus { draft, active, archived }

class BrandVisualConfig {
  final String logoUrl;
  final String iconUrl;
  final String splashUrl;
  final String? faviconUrl;
  final String primaryColor;   // HEX e.g. "#FF6D00"
  final String secondaryColor; // HEX e.g. "#2979FF"
  final String accentColor;    // HEX e.g. "#00E676"
  final String backgroundColor;// HEX e.g. "#121212"
  final String textColor;      // HEX e.g. "#FFFFFF"
  final String fontFamily;     // e.g. "Outfit", "Inter"
  final Map<String, dynamic>? themeConfig;

  const BrandVisualConfig({
    required this.logoUrl,
    required this.iconUrl,
    required this.splashUrl,
    this.faviconUrl,
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    required this.backgroundColor,
    required this.textColor,
    required this.fontFamily,
    this.themeConfig,
  });

  static const BrandVisualConfig fallback = BrandVisualConfig(
    logoUrl: 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/assets/default_logo.png',
    iconUrl: 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/assets/default_icon.png',
    splashUrl: 'https://storage.googleapis.com/bluesystem-7c9af.appspot.com/assets/default_splash.png',
    primaryColor: '#0284C7',
    secondaryColor: '#0EA5E9',
    accentColor: '#10B981',
    backgroundColor: '#0F172A',
    textColor: '#F8FAFC',
    fontFamily: 'Inter',
  );

  factory BrandVisualConfig.fromMap(Map<String, dynamic> map) {
    return BrandVisualConfig(
      logoUrl: map['logoUrl'] as String? ?? fallback.logoUrl,
      iconUrl: map['iconUrl'] as String? ?? fallback.iconUrl,
      splashUrl: map['splashUrl'] as String? ?? fallback.splashUrl,
      faviconUrl: map['faviconUrl'] as String?,
      primaryColor: _sanitizeHex(map['primaryColor'] as String?, fallback.primaryColor),
      secondaryColor: _sanitizeHex(map['secondaryColor'] as String?, fallback.secondaryColor),
      accentColor: _sanitizeHex(map['accentColor'] as String?, fallback.accentColor),
      backgroundColor: _sanitizeHex(map['backgroundColor'] as String?, fallback.backgroundColor),
      textColor: _sanitizeHex(map['textColor'] as String?, fallback.textColor),
      fontFamily: map['fontFamily'] as String? ?? fallback.fontFamily,
      themeConfig: map['themeConfig'] as Map<String, dynamic>?,
    );
  }

  static String _sanitizeHex(String? hex, String fallback) {
    if (hex == null || hex.isEmpty) return fallback;
    final clean = hex.trim();
    final reg = RegExp(r'^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$');
    return reg.hasMatch(clean) ? clean : fallback;
  }

  Map<String, dynamic> toMap() {
    return {
      'logoUrl': logoUrl,
      'iconUrl': iconUrl,
      'splashUrl': splashUrl,
      'faviconUrl': faviconUrl,
      'primaryColor': primaryColor,
      'secondaryColor': secondaryColor,
      'accentColor': accentColor,
      'backgroundColor': backgroundColor,
      'textColor': textColor,
      'fontFamily': fontFamily,
      'themeConfig': themeConfig,
    };
  }
}

class BrandMetadata {
  final String supportEmail;
  final String supportPhone;
  final String? website;
  final Map<String, String>? socialLinks;
  final String? termsUrl;
  final String? privacyUrl;

  const BrandMetadata({
    required this.supportEmail,
    required this.supportPhone,
    this.website,
    this.socialLinks,
    this.termsUrl,
    this.privacyUrl,
  });

  factory BrandMetadata.fromMap(Map<String, dynamic> map) {
    return BrandMetadata(
      supportEmail: map['supportEmail'] as String? ?? 'support@bluesystemdelivery.com',
      supportPhone: map['supportPhone'] as String? ?? '+525500000000',
      website: map['website'] as String?,
      socialLinks: (map['socialLinks'] as Map<String, dynamic>?)?.map(
        (k, v) => MapEntry(k, v.toString()),
      ),
      termsUrl: map['termsUrl'] as String?,
      privacyUrl: map['privacyUrl'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'supportEmail': supportEmail,
      'supportPhone': supportPhone,
      'website': website,
      'socialLinks': socialLinks,
      'termsUrl': termsUrl,
      'privacyUrl': privacyUrl,
    };
  }
}

class BrandEntity {
  final String brandId;
  final String tenantId;
  final String displayName;
  final String? legalName;
  final String shortName;
  final String slug;
  final BrandVisualConfig visual;
  final BrandMetadata metadata;
  final BrandStatus status;
  final String schemaVersion;
  final int createdAt;
  final int updatedAt;
  final String createdBy;
  final String updatedBy;

  const BrandEntity({
    required this.brandId,
    required this.tenantId,
    required this.displayName,
    this.legalName,
    required this.shortName,
    required this.slug,
    required this.visual,
    required this.metadata,
    required this.status,
    required this.schemaVersion,
    required this.createdAt,
    required this.updatedAt,
    required this.createdBy,
    required this.updatedBy,
  });

  factory BrandEntity.fromMap(Map<String, dynamic> map) {
    return BrandEntity(
      brandId: map['brandId'] as String? ?? '',
      tenantId: map['tenantId'] as String? ?? '',
      displayName: map['displayName'] as String? ?? 'Default Brand',
      legalName: map['legalName'] as String?,
      shortName: map['shortName'] as String? ?? 'Default',
      slug: map['slug'] as String? ?? 'default',
      visual: BrandVisualConfig.fromMap(
        (map['visual'] as Map<String, dynamic>?) ?? {},
      ),
      metadata: BrandMetadata.fromMap(
        (map['metadata'] as Map<String, dynamic>?) ?? {},
      ),
      status: _parseStatus(map['status'] as String?),
      schemaVersion: map['schemaVersion'] as String? ?? '1.0',
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
      createdBy: map['createdBy'] as String? ?? '',
      updatedBy: map['updatedBy'] as String? ?? '',
    );
  }

  static BrandStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACTIVE':
        return BrandStatus.active;
      case 'ARCHIVED':
        return BrandStatus.archived;
      case 'DRAFT':
      default:
        return BrandStatus.draft;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'brandId': brandId,
      'tenantId': tenantId,
      'displayName': displayName,
      'legalName': legalName,
      'shortName': shortName,
      'slug': slug,
      'visual': visual.toMap(),
      'metadata': metadata.toMap(),
      'status': status.name.toUpperCase(),
      'schemaVersion': schemaVersion,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'createdBy': createdBy,
      'updatedBy': updatedBy,
    };
  }
}
