/// BLUE SYSTEM DELIVERY ENTERPRISE — APP UPDATE RESOLVER
/// 1:1 Parity with Android AppUpdateResolver.kt (ADR-038 Pillar 13 / BSD-APP-UPDATE-CENTER-ARCHITECTURE-001).
/// Centralized engine for resolving remote update state and role-aware policies.

class RoleUpdatePolicyEntity {
  final bool enabled;
  final String minimumVersion;
  final String latestVersion;
  final bool forceUpdate;
  final String updateType;
  final String? title;
  final String? message;

  const RoleUpdatePolicyEntity({
    this.enabled = true,
    this.minimumVersion = '1.0.0',
    this.latestVersion = '1.0.0',
    this.forceUpdate = false,
    this.updateType = 'OPTIONAL',
    this.title,
    this.message,
  });

  factory RoleUpdatePolicyEntity.fromMap(Map<String, dynamic> map) {
    return RoleUpdatePolicyEntity(
      enabled: map['enabled'] as bool? ?? true,
      minimumVersion: map['minimumVersion'] as String? ?? '1.0.0',
      latestVersion: map['latestVersion'] as String? ?? '1.0.0',
      forceUpdate: map['forceUpdate'] as bool? ?? false,
      updateType: map['updateType'] as String? ?? 'OPTIONAL',
      title: map['title'] as String?,
      message: map['message'] as String?,
    );
  }
}

class AppUpdateConfigEntity {
  final bool enabled;
  final String minimumVersion;
  final String latestVersion;
  final bool forceUpdate;
  final String updateType; // 'OPTIONAL' | 'FORCED'
  final String title;
  final String message;
  final String storeUrl;
  final List<String> targetPlatforms;
  final String? startAt;
  final String? endAt;
  final Map<String, RoleUpdatePolicyEntity>? rolePolicies;

  const AppUpdateConfigEntity({
    this.enabled = true,
    this.minimumVersion = '1.0.0',
    this.latestVersion = '1.0.0',
    this.forceUpdate = false,
    this.updateType = 'OPTIONAL',
    this.title = 'Actualización disponible',
    this.message = 'Una nueva versión de TuaniGo está disponible con mejoras importantes.',
    this.storeUrl = '',
    this.targetPlatforms = const ['ALL'],
    this.startAt,
    this.endAt,
    this.rolePolicies,
  });

  factory AppUpdateConfigEntity.fromMap(Map<String, dynamic> map) {
    Map<String, RoleUpdatePolicyEntity>? policies;
    if (map['rolePolicies'] is Map) {
      policies = {};
      (map['rolePolicies'] as Map).forEach((k, v) {
        if (v is Map) {
          policies![k.toString().toLowerCase()] = RoleUpdatePolicyEntity.fromMap(Map<String, dynamic>.from(v));
        }
      });
    }

    final platforms = (map['targetPlatforms'] as List<dynamic>?)?.map((e) => e.toString().toUpperCase()).toList() ??
        ['ALL'];

    return AppUpdateConfigEntity(
      enabled: map['enabled'] as bool? ?? true,
      minimumVersion: map['minimumVersion'] as String? ?? '1.0.0',
      latestVersion: map['latestVersion'] as String? ?? '1.0.0',
      forceUpdate: map['forceUpdate'] as bool? ?? false,
      updateType: map['updateType'] as String? ?? 'OPTIONAL',
      title: map['title'] as String? ?? 'Actualización disponible',
      message: map['message'] as String? ?? 'Una nueva versión de TuaniGo está disponible con mejoras importantes.',
      storeUrl: map['storeUrl'] as String? ?? '',
      targetPlatforms: platforms,
      startAt: map['startAt'] as String?,
      endAt: map['endAt'] as String?,
      rolePolicies: policies,
    );
  }
}

abstract class AppUpdateResolution {
  const AppUpdateResolution();
}

class NoUpdateResolution extends AppUpdateResolution {
  const NoUpdateResolution();
}

class OptionalUpdateResolution extends AppUpdateResolution {
  final String title;
  final String message;
  final String latestVersion;
  final String currentVersion;
  final String storeUrl;
  final bool allowDismiss;

  const OptionalUpdateResolution({
    required this.title,
    required this.message,
    required this.latestVersion,
    required this.currentVersion,
    required this.storeUrl,
    this.allowDismiss = true,
  });
}

class ForcedUpdateResolution extends AppUpdateResolution {
  final String title;
  final String message;
  final String minimumVersion;
  final String latestVersion;
  final String currentVersion;
  final String storeUrl;

  const ForcedUpdateResolution({
    required this.title,
    required this.message,
    required this.minimumVersion,
    required this.latestVersion,
    required this.currentVersion,
    required this.storeUrl,
  });
}

class AppUpdateResolver {
  static const String platformIos = 'IOS';
  static const String platformAndroid = 'ANDROID';
  static const String platformAll = 'ALL';

  /// Resolves the update state given the installed version and remote configuration.
  /// Enforces Strictest-Wins evaluation across global and role policies.
  static AppUpdateResolution resolve({
    required String installedVersion,
    required AppUpdateConfigEntity? config,
    String currentPlatform = platformIos,
    int? currentTimeMillis,
    String? userRole,
    String defaultStoreUrl = 'https://apps.apple.com/app/tuanigo',
  }) {
    if (config == null || !config.enabled) {
      return const NoUpdateResolution();
    }

    final targetPlatforms = config.targetPlatforms.map((p) => p.trim().toUpperCase()).toList();
    final platformMatches = targetPlatforms.isEmpty ||
        targetPlatforms.contains(platformAll) ||
        targetPlatforms.contains(currentPlatform.trim().toUpperCase());

    if (!platformMatches) {
      return const NoUpdateResolution();
    }

    final now = currentTimeMillis ?? DateTime.now().millisecondsSinceEpoch;
    if (!_isWithinScheduleWindow(config.startAt, config.endAt, now)) {
      return const NoUpdateResolution();
    }

    final safeInstalled = installedVersion.trim().isNotEmpty ? installedVersion.trim() : '1.0.0';
    final safeLatest = config.latestVersion.trim().isNotEmpty ? config.latestVersion.trim() : safeInstalled;
    final safeMin = config.minimumVersion.trim().isNotEmpty ? config.minimumVersion.trim() : safeInstalled;

    final cmpLatest = compareSemVer(safeInstalled, safeLatest);
    final cmpMin = compareSemVer(safeInstalled, safeMin);

    final storeUrl = config.storeUrl.trim().isNotEmpty ? config.storeUrl.trim() : defaultStoreUrl;

    // 1. Evaluación Global Base
    final isGlobalForced = (cmpMin < 0) || (cmpLatest < 0 && (config.forceUpdate || config.updateType.toUpperCase() == 'FORCED'));

    // 2. Evaluación de Política por Rol
    final normalizedRole = userRole?.trim().toLowerCase();
    RoleUpdatePolicyEntity? rolePolicy;
    if (normalizedRole != null && config.rolePolicies != null) {
      rolePolicy = config.rolePolicies![normalizedRole];
    }

    bool isRoleForced = false;
    bool isRoleOptional = false;

    if (rolePolicy != null && rolePolicy.enabled) {
      final roleMin = rolePolicy.minimumVersion.trim().isNotEmpty ? rolePolicy.minimumVersion.trim() : safeMin;
      final roleCmpMin = compareSemVer(safeInstalled, roleMin);
      final roleLatest = rolePolicy.latestVersion.trim().isNotEmpty ? rolePolicy.latestVersion.trim() : safeLatest;
      final roleCmpLatest = compareSemVer(safeInstalled, roleLatest);

      isRoleForced = (roleCmpMin < 0) || (roleCmpLatest < 0 && (rolePolicy.forceUpdate || rolePolicy.updateType.toUpperCase() == 'FORCED'));
      isRoleOptional = !isRoleForced && roleCmpLatest < 0;
    }

    // 3. Strictest-Wins Combinator
    if (isGlobalForced || isRoleForced) {
      final title = (isRoleForced && rolePolicy != null && rolePolicy.title != null) ? rolePolicy.title! : config.title;
      final message = (isRoleForced && rolePolicy != null && rolePolicy.message != null) ? rolePolicy.message! : config.message;
      final minVer = (isRoleForced && rolePolicy != null && rolePolicy.minimumVersion.isNotEmpty)
          ? rolePolicy.minimumVersion
          : safeMin;

      return ForcedUpdateResolution(
        title: title,
        message: message,
        minimumVersion: minVer,
        latestVersion: safeLatest,
        currentVersion: safeInstalled,
        storeUrl: storeUrl,
      );
    }

    // 4. Actualización Opcional
    if (cmpLatest < 0 || isRoleOptional) {
      final title = (isRoleOptional && rolePolicy != null && rolePolicy.title != null) ? rolePolicy.title! : config.title;
      final message = (isRoleOptional && rolePolicy != null && rolePolicy.message != null) ? rolePolicy.message! : config.message;

      return OptionalUpdateResolution(
        title: title,
        message: message,
        latestVersion: safeLatest,
        currentVersion: safeInstalled,
        storeUrl: storeUrl,
        allowDismiss: true,
      );
    }

    return const NoUpdateResolution();
  }

  /// Compares two SemVer strings (e.g. "1.1.0" vs "1.2.0").
  /// Returns negative if v1 < v2, zero if v1 == v2, positive if v1 > v2.
  static int compareSemVer(String v1, String v2) {
    final clean1 = v1.split('-').first.trim();
    final clean2 = v2.split('-').first.trim();

    final parts1 = clean1.split('.').map((p) => int.tryParse(p) ?? 0).toList();
    final parts2 = clean2.split('.').map((p) => int.tryParse(p) ?? 0).toList();

    while (parts1.length < 3) {
      parts1.add(0);
    }
    while (parts2.length < 3) {
      parts2.add(0);
    }

    for (int i = 0; i < 3; i++) {
      if (parts1[i] < parts2[i]) return -1;
      if (parts1[i] > parts2[i]) return 1;
    }
    return 0;
  }

  static bool _isWithinScheduleWindow(String? startAt, String? endAt, int nowMs) {
    if (startAt != null && startAt.isNotEmpty) {
      try {
        final start = DateTime.parse(startAt).millisecondsSinceEpoch;
        if (nowMs < start) return false;
      } catch (_) {}
    }
    if (endAt != null && endAt.isNotEmpty) {
      try {
        final end = DateTime.parse(endAt).millisecondsSinceEpoch;
        if (nowMs > end) return false;
      } catch (_) {}
    }
    return true;
  }
}
