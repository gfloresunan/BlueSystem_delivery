/// BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 AUTH & CLAIMS CONTEXT
/// Canonical Claims & Active Tenant Context for Multi-Platform Clients.

enum EiamRole {
  superAdmin,
  admin,
  auditor,
  support,
  owner,
  manager,
  supervisor,
  cashier,
  cook,
  driver,
  client,
  guest,
}

enum MembershipStatus {
  invited,
  active,
  suspended,
  revoked,
  expired,
  pendingMigration,
}

class MembershipV3Entity {
  final String membershipId;
  final String uid;
  final String tenantId;
  final String? brandId;
  final String? organizationId;
  final String? businessId;
  final String? branchId;
  final EiamRole role;
  final MembershipStatus status;
  final List<String> permissions;
  final String? invitedBy;
  final int? invitedAt;
  final int? acceptedAt;
  final int? revokedAt;
  final String? revokedBy;
  final String? revokedReason;
  final int createdAt;
  final int updatedAt;
  final String schemaVersion;

  const MembershipV3Entity({
    required this.membershipId,
    required this.uid,
    required this.tenantId,
    this.brandId,
    this.organizationId,
    this.businessId,
    this.branchId,
    required this.role,
    required this.status,
    required this.permissions,
    this.invitedBy,
    this.invitedAt,
    this.acceptedAt,
    this.revokedAt,
    this.revokedBy,
    this.revokedReason,
    required this.createdAt,
    required this.updatedAt,
    required this.schemaVersion,
  });

  bool get isActive => status == MembershipStatus.active;

  factory MembershipV3Entity.fromMap(Map<String, dynamic> map) {
    return MembershipV3Entity(
      membershipId: map['membershipId'] as String? ?? '',
      uid: map['uid'] as String? ?? '',
      tenantId: map['tenantId'] as String? ?? '',
      brandId: map['brandId'] as String?,
      organizationId: map['organizationId'] as String?,
      businessId: map['businessId'] as String?,
      branchId: map['branchId'] as String?,
      role: _parseRole(map['role'] as String?),
      status: _parseStatus(map['status'] as String?),
      permissions: (map['permissions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      invitedBy: map['invitedBy'] as String?,
      invitedAt: (map['invitedAt'] as num?)?.toInt(),
      acceptedAt: (map['acceptedAt'] as num?)?.toInt(),
      revokedAt: (map['revokedAt'] as num?)?.toInt(),
      revokedBy: map['revokedBy'] as String?,
      revokedReason: map['revokedReason'] as String?,
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
      schemaVersion: map['schemaVersion'] as String? ?? '3.0',
    );
  }

  static EiamRole _parseRole(String? value) {
    switch (value?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return EiamRole.superAdmin;
      case 'ADMIN':
        return EiamRole.admin;
      case 'AUDITOR':
        return EiamRole.auditor;
      case 'SUPPORT':
        return EiamRole.support;
      case 'OWNER':
        return EiamRole.owner;
      case 'MANAGER':
        return EiamRole.manager;
      case 'SUPERVISOR':
        return EiamRole.supervisor;
      case 'CASHIER':
        return EiamRole.cashier;
      case 'COOK':
        return EiamRole.cook;
      case 'DRIVER':
        return EiamRole.driver;
      case 'CLIENT':
        return EiamRole.client;
      case 'GUEST':
      default:
        return EiamRole.guest;
    }
  }

  static MembershipStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACTIVE':
        return MembershipStatus.active;
      case 'SUSPENDED':
        return MembershipStatus.suspended;
      case 'REVOKED':
        return MembershipStatus.revoked;
      case 'EXPIRED':
        return MembershipStatus.expired;
      case 'PENDING_MIGRATION':
        return MembershipStatus.pendingMigration;
      case 'INVITED':
      default:
        return MembershipStatus.invited;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'membershipId': membershipId,
      'uid': uid,
      'tenantId': tenantId,
      'brandId': brandId,
      'organizationId': organizationId,
      'businessId': businessId,
      'branchId': branchId,
      'role': role.name.toUpperCase(),
      'status': status.name.toUpperCase(),
      'permissions': permissions,
      'invitedBy': invitedBy,
      'invitedAt': invitedAt,
      'acceptedAt': acceptedAt,
      'revokedAt': revokedAt,
      'revokedBy': revokedBy,
      'revokedReason': revokedReason,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'schemaVersion': schemaVersion,
    };
  }
}

class CanonicalCustomClaimsV3 {
  final EiamRole role;
  final String? tenantId;
  final String? brandId;
  final String? orgId;
  final String? businessId;
  final String? branchId;
  final String status;
  final int eiamVer;

  const CanonicalCustomClaimsV3({
    required this.role,
    this.tenantId,
    this.brandId,
    this.orgId,
    this.businessId,
    this.branchId,
    this.status = 'ACTIVE',
    this.eiamVer = 3,
  });

  bool get isPlatformAdmin =>
      role == EiamRole.superAdmin ||
      role == EiamRole.admin ||
      role == EiamRole.auditor ||
      role == EiamRole.support;

  bool get isBusinessAdmin =>
      role == EiamRole.owner || role == EiamRole.manager;

  factory CanonicalCustomClaimsV3.fromTokenMap(Map<String, dynamic> tokenClaims) {
    final rawRole = tokenClaims['role'] ?? tokenClaims['eiamRole'];
    return CanonicalCustomClaimsV3(
      role: MembershipV3Entity._parseRole(rawRole as String?),
      tenantId: tokenClaims['tenantId'] as String?,
      brandId: tokenClaims['brandId'] as String?,
      orgId: tokenClaims['orgId'] as String?,
      businessId: tokenClaims['businessId'] as String?,
      branchId: tokenClaims['branchId'] as String?,
      status: tokenClaims['status'] as String? ?? 'ACTIVE',
      eiamVer: (tokenClaims['eiamVer'] as num?)?.toInt() ?? 3,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'role': role.name.toUpperCase(),
      'tenantId': tenantId,
      'brandId': brandId,
      'orgId': orgId,
      'businessId': businessId,
      'branchId': branchId,
      'status': status,
      'eiamVer': eiamVer,
    };
  }
}
