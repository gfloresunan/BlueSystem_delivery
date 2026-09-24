/// BLUE SYSTEM DELIVERY ENTERPRISE — GATEKEEPER & ISOLATION UNIT TESTS
import 'package:flutter_test/flutter_test.dart';
import '../lib/core/auth/auth_context.dart';
import '../lib/core/gatekeeper/gatekeeper.dart';
import '../lib/core/subscription/subscription_context.dart';

void main() {
  group('Gatekeeper Engine Pure Evaluation Tests', () {
    const validSubscription = SubscriptionEntity(
      subscriptionId: 'sub_001',
      tenantId: 'tenant_001',
      planId: 'plan_pro',
      planName: 'Professional',
      planTier: PlanTier.professional,
      status: SubscriptionStatus.active,
      startDate: 100000,
      endDate: 999999999999,
      billingCycle: 'MONTHLY',
      enabledFeatures: ['ORDERS', 'CATALOG', 'CONTROL_TOWER'],
      disabledFeatures: ['KDS'],
      limits: SubscriptionQuotas(
        maxBusinesses: 2,
        maxBranches: 2,
        maxUsers: 10,
        maxCouriers: 5,
        maxOrders: 1000,
        maxStorageMb: 2048,
        maxApiRequests: 20000,
      ),
      schemaVersion: '1.0',
      createdAt: 100000,
      updatedAt: 100000,
      createdBy: 'admin',
      updatedBy: 'admin',
    );

    test('Allows access when module is enabled in subscription and role is authorized', () {
      const ctx = GatekeeperContext(
        uid: 'user_123',
        membershipId: 'mem_123',
        tenantId: 'tenant_001',
        role: EiamRole.owner,
        subscription: validSubscription,
      );

      final decision = GatekeeperEngine.canAccessModule(
        context: ctx,
        moduleKey: 'ORDERS',
        nowMs: 200000,
      );

      expect(decision.allowed, isTrue);
      expect(decision.reason, AccessDecisionReason.allowed);
    });

    test('Denies access when subscription tenant does not match context tenant', () {
      const ctx = GatekeeperContext(
        uid: 'user_123',
        membershipId: 'mem_123',
        tenantId: 'tenant_DIFFERENT',
        role: EiamRole.owner,
        subscription: validSubscription,
      );

      final decision = GatekeeperEngine.canAccessModule(
        context: ctx,
        moduleKey: 'ORDERS',
        nowMs: 200000,
      );

      expect(decision.allowed, isFalse);
      expect(decision.reason, AccessDecisionReason.tenantMismatch);
    });

    test('Denies access when module is explicitly disabled in subscription', () {
      const ctx = GatekeeperContext(
        uid: 'user_123',
        membershipId: 'mem_123',
        tenantId: 'tenant_001',
        role: EiamRole.cook,
        subscription: validSubscription,
      );

      final decision = GatekeeperEngine.canAccessModule(
        context: ctx,
        moduleKey: 'KDS', // Disabled in subscription
        nowMs: 200000,
      );

      expect(decision.allowed, isFalse);
      expect(decision.reason, AccessDecisionReason.entitlementMissing);
    });

    test('Denies access when subscription is expired', () {
      const expiredSubscription = SubscriptionEntity(
        subscriptionId: 'sub_exp',
        tenantId: 'tenant_001',
        planId: 'plan_pro',
        planName: 'Professional',
        planTier: PlanTier.professional,
        status: SubscriptionStatus.active,
        startDate: 1000,
        endDate: 5000, // Expired relative to nowMs
        billingCycle: 'MONTHLY',
        enabledFeatures: ['ORDERS'],
        disabledFeatures: [],
        limits: SubscriptionQuotas(
          maxBusinesses: 1,
          maxBranches: 1,
          maxUsers: 1,
          maxCouriers: 1,
          maxOrders: 100,
          maxStorageMb: 100,
          maxApiRequests: 100,
        ),
        schemaVersion: '1.0',
        createdAt: 1000,
        updatedAt: 1000,
        createdBy: 'admin',
        updatedBy: 'admin',
      );

      const ctx = GatekeeperContext(
        uid: 'user_123',
        membershipId: 'mem_123',
        tenantId: 'tenant_001',
        role: EiamRole.owner,
        subscription: expiredSubscription,
      );

      final decision = GatekeeperEngine.canAccessModule(
        context: ctx,
        moduleKey: 'ORDERS',
        nowMs: 10000, // Greater than endDate
      );

      expect(decision.allowed, isFalse);
      expect(decision.reason, AccessDecisionReason.subscriptionExpired);
    });
  });
}
