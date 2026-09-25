/// BLUE SYSTEM DELIVERY ENTERPRISE — APP CONFIG FOUNDATION
/// Platform-agnostic configuration contract mirroring backend AppConfigEntity.

enum PlatformType { android, ios, web }

enum EnvironmentType { development, staging, production }

enum AppConfigStatus { draft, active, deprecated, archived }

typedef AppPlatform = PlatformType;
typedef AppEnvironment = EnvironmentType;

class AppDistributionConfig {
  final String appName;
  final String shortName;
  final String applicationId; // Android package name (e.g. com.fitoni.express)
  final String? bundleId;     // iOS bundle ID (e.g. com.fitoni.express.ios)
  final String versionName;   // e.g. "2.2.0"
  final int buildNumber;       // e.g. 100

  const AppDistributionConfig({
    required this.appName,
    required this.shortName,
    required this.applicationId,
    this.bundleId,
    required this.versionName,
    required this.buildNumber,
  });

  factory AppDistributionConfig.fromMap(Map<String, dynamic> map) {
    return AppDistributionConfig(
      appName: map['appName'] as String? ?? 'BlueSystem Delivery',
      shortName: map['shortName'] as String? ?? 'BlueSystem',
      applicationId: map['applicationId'] as String? ?? 'com.example.bluesystem_delivery',
      bundleId: map['bundleId'] as String?,
      versionName: map['versionName'] as String? ?? '1.0.0',
      buildNumber: (map['buildNumber'] as num?)?.toInt() ?? 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'appName': appName,
      'shortName': shortName,
      'applicationId': applicationId,
      'bundleId': bundleId,
      'versionName': versionName,
      'buildNumber': buildNumber,
    };
  }
}

class AppProviderConfig {
  final String firebaseProjectId;
  final String firebaseAppId;
  final String mapsApiKey;
  final String? notificationSenderId;
  final String? apnsKeyId;

  const AppProviderConfig({
    required this.firebaseProjectId,
    required this.firebaseAppId,
    required this.mapsApiKey,
    this.notificationSenderId,
    this.apnsKeyId,
  });

  factory AppProviderConfig.fromMap(Map<String, dynamic> map) {
    return AppProviderConfig(
      firebaseProjectId: map['firebaseProjectId'] as String? ?? '',
      firebaseAppId: map['firebaseAppId'] as String? ?? '',
      mapsApiKey: map['mapsApiKey'] as String? ?? '',
      notificationSenderId: map['notificationSenderId'] as String?,
      apnsKeyId: map['apnsKeyId'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'firebaseProjectId': firebaseProjectId,
      'firebaseAppId': firebaseAppId,
      'mapsApiKey': mapsApiKey,
      'notificationSenderId': notificationSenderId,
      'apnsKeyId': apnsKeyId,
    };
  }
}

class AppConfigEntity {
  final String configId;
  final String tenantId;
  final String brandId;
  final PlatformType platform;
  final EnvironmentType environment;
  final AppDistributionConfig distribution;
  final AppProviderConfig providers;
  final Map<String, bool> featureFlags;
  final Map<String, dynamic>? runtimeThemeOverrides;
  final AppConfigStatus status;
  final String schemaVersion;
  final int createdAt;
  final int updatedAt;

  const AppConfigEntity({
    required this.configId,
    required this.tenantId,
    required this.brandId,
    required this.platform,
    required this.environment,
    required this.distribution,
    required this.providers,
    required this.featureFlags,
    this.runtimeThemeOverrides,
    required this.status,
    required this.schemaVersion,
    required this.createdAt,
    required this.updatedAt,
  });

  String get applicationId => distribution.applicationId;

  factory AppConfigEntity.createDefault({
    required String tenantId,
    required String brandId,
    String appName = 'BlueSystem Delivery',
    PlatformType platform = PlatformType.android,
    String? appId,
    EnvironmentType environment = EnvironmentType.production,
  }) {
    return AppConfigEntity(
      configId: 'cfg_${tenantId}_$brandId',
      tenantId: tenantId,
      brandId: brandId,
      platform: platform,
      environment: environment,
      distribution: AppDistributionConfig(
        appName: appName,
        shortName: appName,
        applicationId: appId ?? 'com.$brandId.delivery',
        versionName: '2.2.0',
        buildNumber: 100,
      ),
      providers: const AppProviderConfig(
        firebaseProjectId: 'bluesystem-7c9af',
        firebaseAppId: '',
        mapsApiKey: '',
      ),
      featureFlags: const {},
      status: AppConfigStatus.active,
      schemaVersion: '1.0',
      createdAt: 0,
      updatedAt: 0,
    );
  }

  factory AppConfigEntity.fromMap(Map<String, dynamic> map) {
    return AppConfigEntity(
      configId: map['configId'] as String? ?? '',
      tenantId: map['tenantId'] as String? ?? '',
      brandId: map['brandId'] as String? ?? '',
      platform: _parsePlatform(map['platform'] as String?),
      environment: _parseEnvironment(map['environment'] as String?),
      distribution: AppDistributionConfig.fromMap(
        (map['distribution'] as Map<String, dynamic>?) ?? {},
      ),
      providers: AppProviderConfig.fromMap(
        (map['providers'] as Map<String, dynamic>?) ?? {},
      ),
      featureFlags: (map['featureFlags'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v as bool),
          ) ??
          {},
      runtimeThemeOverrides: map['runtimeThemeOverrides'] as Map<String, dynamic>?,
      status: _parseStatus(map['status'] as String?),
      schemaVersion: map['schemaVersion'] as String? ?? '1.0',
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }

  static PlatformType _parsePlatform(String? value) {
    switch (value?.toUpperCase()) {
      case 'IOS':
        return PlatformType.ios;
      case 'WEB':
        return PlatformType.web;
      case 'ANDROID':
      default:
        return PlatformType.android;
    }
  }

  static EnvironmentType _parseEnvironment(String? value) {
    switch (value?.toUpperCase()) {
      case 'STAGING':
        return EnvironmentType.staging;
      case 'PRODUCTION':
        return EnvironmentType.production;
      case 'DEVELOPMENT':
      default:
        return EnvironmentType.development;
    }
  }

  static AppConfigStatus _parseStatus(String? value) {
    switch (value?.toUpperCase()) {
      case 'ACTIVE':
        return AppConfigStatus.active;
      case 'DEPRECATED':
        return AppConfigStatus.deprecated;
      case 'ARCHIVED':
        return AppConfigStatus.archived;
      case 'DRAFT':
      default:
        return AppConfigStatus.draft;
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'configId': configId,
      'tenantId': tenantId,
      'brandId': brandId,
      'platform': platform.name.toUpperCase(),
      'environment': environment.name.toUpperCase(),
      'distribution': distribution.toMap(),
      'providers': providers.toMap(),
      'featureFlags': featureFlags,
      'runtimeThemeOverrides': runtimeThemeOverrides,
      'status': status.name.toUpperCase(),
      'schemaVersion': schemaVersion,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
