/// BLUE SYSTEM DELIVERY ENTERPRISE — SUBSCRIPTION & ENTITLEMENT GATEKEEPER
/// Evaluates module access based on Role, Subscription Entitlements, and Tenant Isolation.

import '../auth/auth_context.dart';
import '../subscription/subscription_context.dart';

enum AccessDecisionReason {
  allowed,
  subscriptionMissing,
  subscriptionInactive,
  subscriptionExpired,
  subscriptionFuture,
  tenantMismatch,
  brandMismatch,
  entitlementMissing,
  moduleUnknown,
  roleUnauthorized,
  contextInvalid,
}

class GatekeeperContext {
  final String uid;
  final String membershipId;
  final String tenantId;
  final String? brandId;
  final String? organizationId;
  final String? businessId;
  final String? branchId;
  final EiamRole role;
  final SubscriptionEntity? subscription;
  final List<String>? entitlements;

  const GatekeeperContext({
    required this.uid,
    required this.membershipId,
    required this.tenantId,
    this.brandId,
    this.organizationId,
    this.businessId,
    this.branchId,
    required this.role,
    this.subscription,
    this.entitlements,
  });

  bool get isValid {
    if (role == EiamRole.guest) return true;
    if (role == EiamRole.client || role == EiamRole.driver) {
      return uid.isNotEmpty;
    }
    return uid.isNotEmpty && membershipId.isNotEmpty && tenantId.isNotEmpty;
  }
}

class AccessDecision {
  final bool allowed;
  final AccessDecisionReason reason;
  final String? module;
  final int timestamp;

  const AccessDecision({
    required this.allowed,
    required this.reason,
    this.module,
    required this.timestamp,
  });

  static AccessDecision allow(String module) => AccessDecision(
        allowed: true,
        reason: AccessDecisionReason.allowed,
        module: module,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );

  static AccessDecision deny(AccessDecisionReason reason, {String? module}) =>
      AccessDecision(
        allowed: false,
        reason: reason,
        module: module,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );
}

class GatekeeperEngine {
  /// Evaluates whether a user can access a specific module.
  static AccessDecision canAccessModule({
    required GatekeeperContext context,
    required String moduleKey,
    int? nowMs,
  }) {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    final normalizedModule = moduleKey.toUpperCase();

    // 1. Platform Admin Bypass (Platform Level Only)
    if (context.role == EiamRole.superAdmin ||
        context.role == EiamRole.admin ||
        context.role == EiamRole.auditor) {
      return AccessDecision.allow(moduleKey);
    }

    // 2. Driver / Courier Direct Access (Fleet Operations)
    if (context.role == EiamRole.driver) {
      const driverAllowedModules = [
        'COURIER',
        'ORDERS',
        'TRIPS',
        'FLEET',
        'FLEET_CORE',
        'CONTROL_TOWER',
      ];
      if (driverAllowedModules.contains(normalizedModule)) {
        return AccessDecision.allow(moduleKey);
      }
    }

    // 3. Client / Guest Direct Access (Commercial Catalog & Tracking)
    if (context.role == EiamRole.client || context.role == EiamRole.guest) {
      const clientAllowedModules = [
        'HOME',
        'CATALOG',
        'COMMERCIAL_CATALOG',
        'ORDERS',
        'TRIPS',
      ];
      if (clientAllowedModules.contains(normalizedModule)) {
        return AccessDecision.allow(moduleKey);
      }
    }

    // 4. Structural Context Validation for B2B Merchant modules
    if (!context.isValid) {
      return AccessDecision.deny(
        AccessDecisionReason.contextInvalid,
        module: moduleKey,
      );
    }

    // 5. Subscription Verification (B2B SaaS Tenants)
    final sub = context.subscription;
    if (sub == null) {
      return AccessDecision.deny(
        AccessDecisionReason.subscriptionMissing,
        module: moduleKey,
      );
    }

    // 4. Tenant Isolation Check
    if (sub.tenantId != context.tenantId) {
      return AccessDecision.deny(
        AccessDecisionReason.tenantMismatch,
        module: moduleKey,
      );
    }

    // 5. Subscription Status Check
    if (sub.status == SubscriptionStatus.suspended ||
        sub.status == SubscriptionStatus.cancelled ||
        sub.status == SubscriptionStatus.archived) {
      return AccessDecision.deny(
        AccessDecisionReason.subscriptionInactive,
        module: moduleKey,
      );
    }

    if (sub.status == SubscriptionStatus.pastDue) {
      return AccessDecision.deny(
        AccessDecisionReason.subscriptionExpired,
        module: moduleKey,
      );
    }

    if (sub.status != SubscriptionStatus.active &&
        sub.status != SubscriptionStatus.trial) {
      return AccessDecision.deny(
        AccessDecisionReason.subscriptionInactive,
        module: moduleKey,
      );
    }

    // 6. Temporal Boundary Checks
    if (sub.startDate > now) {
      return AccessDecision.deny(
        AccessDecisionReason.subscriptionFuture,
        module: moduleKey,
      );
    }

    if (sub.endDate != null && sub.endDate! < now) {
      return AccessDecision.deny(
        AccessDecisionReason.subscriptionExpired,
        module: moduleKey,
      );
    }

    // 7. Entitlement Feature Check
    final normalizedModule = moduleKey.toUpperCase();
    if (!sub.isFeatureEnabled(normalizedModule)) {
      return AccessDecision.deny(
        AccessDecisionReason.entitlementMissing,
        module: moduleKey,
      );
    }

    // 8. Role-Module Mapping Check
    if (!_isRoleAuthorizedForModule(context.role, normalizedModule)) {
      return AccessDecision.deny(
        AccessDecisionReason.roleUnauthorized,
        module: moduleKey,
      );
    }

    return AccessDecision.allow(moduleKey);
  }

  static bool _isRoleAuthorizedForModule(EiamRole role, String module) {
    switch (module) {
      case 'GOVERNANCE':
      case 'SETTINGS':
      case 'FINANCE':
        return role == EiamRole.owner ||
            role == EiamRole.manager ||
            role == EiamRole.admin ||
            role == EiamRole.superAdmin;
      case 'CONTROL_TOWER':
      case 'FLEET_CORE':
        return role == EiamRole.owner ||
            role == EiamRole.manager ||
            role == EiamRole.supervisor ||
            role == EiamRole.driver ||
            role == EiamRole.admin;
      case 'KDS':
        return role == EiamRole.cook ||
            role == EiamRole.manager ||
            role == EiamRole.owner ||
            role == EiamRole.cashier;
      case 'ORDERS':
      case 'CATALOG':
      default:
        return true;
    }
  }
}
