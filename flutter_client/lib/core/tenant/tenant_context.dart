/// BLUE SYSTEM DELIVERY ENTERPRISE — TENANT CONTEXT FOUNDATION
/// Strictly isolated Multi-Tenant Core Contract.

enum CommercialModel { marketplace, agency, whiteLabelCommerce, enterprise }

enum TenantStatus { draft, active, suspended, migrationPending, archived }

class TenantEntity {
  final String tenantId;
  final String name;
  final String legalName;
  final String slug;
  final CommercialModel type;
  final TenantStatus status;
  final String? primaryBrandId;
  final String? subscriptionId;
  final String? defaultAppConfigId;
  final Map<String, dynamic>? metadata;
  final String schemaVersion;
  final int createdAt;
  final int updatedAt;
  final String createdBy;
  final String updatedBy;

  const TenantEntity({
    required this.tenantId,
    required this.name,
    required this.legalName,
    required this.slug,
    required this.type,
    required this.status,
    this.primaryBrandId,
    this.subscriptionId,
    this.defaultAppConfigId,
    this.metadata,
    required this.schemaVersion,
    required this.createdAt,
    required this.updatedAt,
    required this.createdBy,
    required this.updatedBy,
  });

  bool get isActive => status == TenantStatus.active;

  factory TenantEntity.fromMap(Map<String, dynamic> map) {
    return TenantEntity(
      tenantId: map['tenantId'] as String? ?? '',
      name: map['name'] as String? ?? '',
      legalName: map['legalName'] as String? ?? '',
      slug: map['slug'] as String? ?? '',
      type: _parseType(map['type'] as String?),
      status: _parseStatus(map['status'] as String?),
      primaryBrandId: map['primaryBrandId'] as String?,
      subscriptionId: map['subscriptionId'] as String?,
      defaultAppConfigId: map['defaultAppConfigId'] as String?,
      metadata: map['metadata'] as Map<String, dynamic>?,
      schemaVersion: map['schemaVersion'] as String? ?? '1.0',
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
      createdBy: map['createdBy'] as String? ?? '',
      updatedBy: map['updatedBy'] as String? ?? '',
    );
  }

  static CommercialModel _parseType(String? value) {
    switch (value?.toUpperCase()) {
      case 'AGENCY':
        return CommercialModel.agency;
      case 'WHITE_LABEL_COMMERCE':
        return CommercialModel.whiteLabelCommerce;
      case 'ENTERPRISE':
        return CommercialModel.enterprise;
      case 'MARKETPLACE':
      default:
        return CommercialModel.marketplace;
    }
  }

  static TenantStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACTIVE':
        return TenantStatus.active;
      case 'SUSPENDED':
        return TenantStatus.suspended;
      case 'MIGRATION_PENDING':
        return TenantStatus.migrationPending;
      case 'ARCHIVED':
        return TenantStatus.archived;
      case 'DRAFT':
      default:
        return TenantStatus.draft;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'tenantId': tenantId,
      'name': name,
      'legalName': legalName,
      'slug': slug,
      'type': type.name.toUpperCase(),
      'status': status.name.toUpperCase(),
      'primaryBrandId': primaryBrandId,
      'subscriptionId': subscriptionId,
      'defaultAppConfigId': defaultAppConfigId,
      'metadata': metadata,
      'schemaVersion': schemaVersion,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'createdBy': createdBy,
      'updatedBy': updatedBy,
    };
  }
}
