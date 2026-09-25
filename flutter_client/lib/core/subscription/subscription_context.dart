/// BLUE SYSTEM DELIVERY ENTERPRISE — SUBSCRIPTION CONTEXT & QUOTAS
/// Mirrors backend CapabilityModule and SubscriptionEntity limits.

enum PlanTier { starter, professional, enterprise, custom }

enum SubscriptionStatus { draft, active, trial, suspended, pastDue, cancelled, archived }

enum CapabilityModule {
  orders,
  catalog,
  customers,
  promotions,
  finance,
  reports,
  controlTower,
  fleetCore,
  gpsTracking,
  xToYDelivery,
  kds,
  notifications,
  analytics,
  governance,
  multiBranch,
  multiBrand,
  multiMerchant,
  apiAccess,
  settings,
  staff,
  dashboard,
  onboarding,
}

class SubscriptionQuotas {
  final int maxBusinesses; // -1 = unlimited
  final int maxBranches;   // -1 = unlimited
  final int maxUsers;      // -1 = unlimited
  final int maxCouriers;   // -1 = unlimited
  final int maxOrders;
  final int maxStorageMb;
  final int maxApiRequests;

  const SubscriptionQuotas({
    required this.maxBusinesses,
    required this.maxBranches,
    required this.maxUsers,
    required this.maxCouriers,
    required this.maxOrders,
    required this.maxStorageMb,
    required this.maxApiRequests,
  });

  static const starter = SubscriptionQuotas(
    maxBusinesses: 1,
    maxBranches: 1,
    maxUsers: 5,
    maxCouriers: 2,
    maxOrders: 500,
    maxStorageMb: 1024,
    maxApiRequests: 10000,
  );

  static const professional = SubscriptionQuotas(
    maxBusinesses: 3,
    maxBranches: 10,
    maxUsers: 25,
    maxCouriers: 10,
    maxOrders: 5000,
    maxStorageMb: 10240,
    maxApiRequests: 100000,
  );

  static const enterprise = SubscriptionQuotas(
    maxBusinesses: -1,
    maxBranches: -1,
    maxUsers: -1,
    maxCouriers: -1,
    maxOrders: -1,
    maxStorageMb: -1,
    maxApiRequests: -1,
  );

  factory SubscriptionQuotas.fromMap(Map<String, dynamic> map) {
    return SubscriptionQuotas(
      maxBusinesses: (map['maxBusinesses'] as num?)?.toInt() ?? 1,
      maxBranches: (map['maxBranches'] as num?)?.toInt() ?? 1,
      maxUsers: (map['maxUsers'] as num?)?.toInt() ?? 5,
      maxCouriers: (map['maxCouriers'] as num?)?.toInt() ?? 2,
      maxOrders: (map['maxOrders'] as num?)?.toInt() ?? 500,
      maxStorageMb: (map['maxStorageMb'] as num?)?.toInt() ?? 1024,
      maxApiRequests: (map['maxApiRequests'] as num?)?.toInt() ?? 10000,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'maxBusinesses': maxBusinesses,
      'maxBranches': maxBranches,
      'maxUsers': maxUsers,
      'maxCouriers': maxCouriers,
      'maxOrders': maxOrders,
      'maxStorageMb': maxStorageMb,
      'maxApiRequests': maxApiRequests,
    };
  }
}

class SubscriptionEntity {
  final String subscriptionId;
  final String tenantId;
  final String planId;
  final String planName;
  final PlanTier planTier;
  final SubscriptionStatus status;
  final int startDate;
  final int? endDate;
  final String billingCycle;
  final List<String> enabledFeatures;
  final List<String> disabledFeatures;
  final Map<String, bool>? featureOverrides;
  final SubscriptionQuotas limits;
  final Map<String, dynamic>? metadata;
  final String schemaVersion;
  final int createdAt;
  final int updatedAt;
  final String createdBy;
  final String updatedBy;

  const SubscriptionEntity({
    required this.subscriptionId,
    required this.tenantId,
    required this.planId,
    required this.planName,
    required this.planTier,
    required this.status,
    required this.startDate,
    this.endDate,
    required this.billingCycle,
    required this.enabledFeatures,
    required this.disabledFeatures,
    this.featureOverrides,
    required this.limits,
    this.metadata,
    required this.schemaVersion,
    required this.createdAt,
    required this.updatedAt,
    required this.createdBy,
    required this.updatedBy,
  });

  bool get isActive =>
      (status == SubscriptionStatus.active || status == SubscriptionStatus.trial);

  bool isFeatureEnabled(String featureKey) {
    if (disabledFeatures.contains(featureKey.toUpperCase())) return false;
    if (featureOverrides != null && featureOverrides!.containsKey(featureKey)) {
      return featureOverrides![featureKey]!;
    }
    return enabledFeatures.contains(featureKey.toUpperCase());
  }

  factory SubscriptionEntity.fromMap(Map<String, dynamic> map) {
    return SubscriptionEntity(
      subscriptionId: map['subscriptionId'] as String? ?? '',
      tenantId: map['tenantId'] as String? ?? '',
      planId: map['planId'] as String? ?? '',
      planName: map['planName'] as String? ?? 'Standard',
      planTier: _parseTier(map['planTier'] as String?),
      status: _parseStatus(map['status'] as String?),
      startDate: (map['startDate'] as num?)?.toInt() ?? 0,
      endDate: (map['endDate'] as num?)?.toInt(),
      billingCycle: map['billingCycle'] as String? ?? 'MONTHLY',
      enabledFeatures: (map['enabledFeatures'] as List<dynamic>?)
              ?.map((e) => e.toString().toUpperCase())
              .toList() ??
          [],
      disabledFeatures: (map['disabledFeatures'] as List<dynamic>?)
              ?.map((e) => e.toString().toUpperCase())
              .toList() ??
          [],
      featureOverrides: (map['featureOverrides'] as Map<String, dynamic>?)?.map(
        (k, v) => MapEntry(k, v as bool),
      ),
      limits: SubscriptionQuotas.fromMap(
        (map['limits'] as Map<String, dynamic>?) ?? {},
      ),
      metadata: map['metadata'] as Map<String, dynamic>?,
      schemaVersion: map['schemaVersion'] as String? ?? '1.0',
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
      createdBy: map['createdBy'] as String? ?? '',
      updatedBy: map['updatedBy'] as String? ?? '',
    );
  }

  static PlanTier _parseTier(String? value) {
    switch (value?.toUpperCase()) {
      case 'STARTER':
        return PlanTier.starter;
      case 'ENTERPRISE':
        return PlanTier.enterprise;
      case 'CUSTOM':
        return PlanTier.custom;
      case 'PROFESSIONAL':
      default:
        return PlanTier.professional;
    }
  }

  static SubscriptionStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACTIVE':
        return SubscriptionStatus.active;
      case 'TRIAL':
        return SubscriptionStatus.trial;
      case 'SUSPENDED':
        return SubscriptionStatus.suspended;
      case 'PAST_DUE':
        return SubscriptionStatus.pastDue;
      case 'CANCELLED':
        return SubscriptionStatus.cancelled;
      case 'ARCHIVED':
        return SubscriptionStatus.archived;
      case 'DRAFT':
      default:
        return SubscriptionStatus.draft;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'subscriptionId': subscriptionId,
      'tenantId': tenantId,
      'planId': planId,
      'planName': planName,
      'planTier': planTier.name.toUpperCase(),
      'status': status.name.toUpperCase(),
      'startDate': startDate,
      'endDate': endDate,
      'billingCycle': billingCycle,
      'enabledFeatures': enabledFeatures,
      'disabledFeatures': disabledFeatures,
      'featureOverrides': featureOverrides,
      'limits': limits.toMap(),
      'metadata': metadata,
      'schemaVersion': schemaVersion,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'createdBy': createdBy,
      'updatedBy': updatedBy,
    };
  }
}
