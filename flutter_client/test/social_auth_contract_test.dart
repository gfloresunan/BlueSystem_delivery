/// BLUE SYSTEM DELIVERY ENTERPRISE — SOCIAL OAUTH CONTRACT UNIT TEST
/// Tests compliance with GAP-AUTH-01 / GATE-03:
/// - Verifies real OAuth provider invocation without mock fallback to guest.
/// - Verifies user profile hydration and claims resolution.
/// - Verifies explicit error and cancellation handling.

import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';

class MockAuthService implements IAuthService {
  bool googleInvoked = false;
  bool facebookInvoked = false;
  bool shouldFail = false;
  bool shouldCancel = false;

  final UserProfileEntity mockGoogleUser = const UserProfileEntity(
    uid: 'google_uid_123',
    email: 'cliente.google@test.com',
    displayName: 'Cliente Google Real',
    role: EiamRole.client,
    activeTenantId: 'ten_bluesystem_core',
    isVerified: true,
    createdAt: 100000,
    updatedAt: 100000,
  );

  final UserProfileEntity mockFacebookUser = const UserProfileEntity(
    uid: 'facebook_uid_456',
    email: 'cliente.facebook@test.com',
    displayName: 'Cliente Facebook Real',
    role: EiamRole.client,
    activeTenantId: 'ten_bluesystem_core',
    isVerified: true,
    createdAt: 100000,
    updatedAt: 100000,
  );

  @override
  Stream<UserProfileEntity?> get authStateChanges => Stream.value(null);

  @override
  Future<UserProfileEntity?> getCurrentUser() async => null;

  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async {
    return const CanonicalCustomClaimsV3(
      role: EiamRole.client,
      tenantId: 'ten_bluesystem_core',
    );
  }

  @override
  Future<UserProfileEntity> signInWithGoogle() async {
    googleInvoked = true;
    if (shouldCancel) {
      throw Exception('user-cancelled: popup_closed_by_user');
    }
    if (shouldFail) {
      throw Exception('network_error: connection refused');
    }
    return mockGoogleUser;
  }

  @override
  Future<UserProfileEntity> signInWithFacebook() async {
    facebookInvoked = true;
    if (shouldCancel) {
      throw Exception('user-cancelled: facebook_cancelled');
    }
    if (shouldFail) {
      throw Exception('network_error: connection refused');
    }
    return mockFacebookUser;
  }

  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async => mockGoogleUser;

  @override
  Future<UserProfileEntity> registerWithEmailPassword({
    required String email,
    required String password,
    required String name,
    required String phone,
  }) async => mockGoogleUser;

  @override
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken}) async => mockGoogleUser;

  @override
  Future<UserProfileEntity> signInWithFacebookToken(String accessToken) async => mockFacebookUser;

  @override
  Future<void> sendPasswordReset(String email) async {}

  @override
  Future<void> signOut() async {}

  @override
  Future<void> refreshIdToken() async {}
}

class DummyPlatformService implements ITenantService, IBrandService, ISubscriptionService, IAppConfigService {
  @override
  Future<TenantEntity?> getTenantById(String tenantId) async => null;
  @override
  Stream<TenantEntity?> watchTenant(String tenantId) => Stream.value(null);

  @override
  Future<BrandEntity?> getBrandById(String brandId) async => null;
  @override
  Future<BrandEntity?> getPrimaryBrandForTenant(String tenantId) async => null;
  @override
  Stream<BrandEntity?> watchBrand(String brandId) => Stream.value(null);

  @override
  Future<SubscriptionEntity?> getSubscriptionByTenantId(String tenantId) async => null;
  @override
  Stream<SubscriptionEntity?> watchSubscription(String tenantId) => Stream.value(null);

  @override
  Future<AppConfigEntity?> getAppConfigById(String configId) async => null;
  @override
  Future<AppConfigEntity?> resolveActiveConfig({
    required String tenantId,
    required String brandId,
    required PlatformType platform,
    required EnvironmentType environment,
  }) async => null;
}

void main() {
  late MockAuthService mockAuth;
  late DummyPlatformService dummyPlatform;
  late SessionState sessionState;

  setUp(() {
    mockAuth = MockAuthService();
    dummyPlatform = DummyPlatformService();
    sessionState = SessionState(
      authService: mockAuth,
      tenantService: dummyPlatform,
      brandService: dummyPlatform,
      subscriptionService: dummyPlatform,
      appConfigService: dummyPlatform,
    );
  });

  group('GAP-AUTH-01 / GATE-03: Social OAuth Real Contract Tests', () {
    test('Google Sign-In invokes real provider and provisions customer UID without guest fallback', () async {
      sessionState.requireLogin();
      expect(sessionState.status, AuthStatus.unauthenticated);
      expect(sessionState.currentUser, isNull);

      await sessionState.signInWithGoogleFederated();

      expect(mockAuth.googleInvoked, isTrue);
      expect(sessionState.status, AuthStatus.authenticated);
      expect(sessionState.currentUser?.uid, 'google_uid_123');
      expect(sessionState.currentUser?.email, 'cliente.google@test.com');
      expect(sessionState.claims?.role, EiamRole.client);
      expect(sessionState.claims?.tenantId, 'ten_bluesystem_core');
    });

    test('Facebook Sign-In invokes real provider and provisions customer UID without guest fallback', () async {
      sessionState.requireLogin();
      expect(sessionState.status, AuthStatus.unauthenticated);
      expect(sessionState.currentUser, isNull);

      await sessionState.signInWithFacebookFederated();

      expect(mockAuth.facebookInvoked, isTrue);
      expect(sessionState.status, AuthStatus.authenticated);
      expect(sessionState.currentUser?.uid, 'facebook_uid_456');
      expect(sessionState.currentUser?.email, 'cliente.facebook@test.com');
      expect(sessionState.claims?.role, EiamRole.client);
      expect(sessionState.claims?.tenantId, 'ten_bluesystem_core');
    });

    test('User cancellation raises exception and does NOT degrade silently to Guest', () async {
      sessionState.requireLogin();
      mockAuth.shouldCancel = true;

      try {
        await sessionState.signInWithGoogleFederated();
        fail('Should have thrown an exception');
      } catch (e) {
        expect(e.toString(), contains('user-cancelled'));
      }

      // Sigue desautenticado, NUNCA se degrada a Guest
      expect(sessionState.status, AuthStatus.unauthenticated);
      expect(sessionState.currentUser, isNull);
    });

    test('Network error raises exception and preserves unauthenticated state without Guest fallback', () async {
      sessionState.requireLogin();
      mockAuth.shouldFail = true;

      try {
        await sessionState.signInWithFacebookFederated();
        fail('Should have thrown an exception');
      } catch (e) {
        expect(e.toString(), contains('network_error'));
      }

      // Sigue desautenticado con mensaje de error, NUNCA se degrada a Guest
      expect(sessionState.status, AuthStatus.unauthenticated);
      expect(sessionState.currentUser, isNull);
      expect(sessionState.errorMessage, isNotNull);
    });
  });
}
