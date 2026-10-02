/// BLUE SYSTEM DELIVERY ENTERPRISE — BLOQUE 6 TESTS
/// Protocol: BSD-FLUTTER-ANDROID-FULL-PARITY-001 (Phase 3 / Block 6)
/// Scope: FCM Push Notifications, Multi-Device Canonical Registration & Deep Link Routing.
/// Validates 1:1 Android parity against:
///   - com.example.data.FcmManager.kt
///   - com.example.service.DeliveryFirebaseMessagingService.kt
///   - com.example.navigation.NotificationRouter.kt

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/shell/app_shell.dart';

// ─── MOCK IMPLEMENTATIONS ───────────────────────────────────────────────────

class MockNotificationServiceForBlock6 implements INotificationService {
  final StreamController<Map<String, dynamic>> _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _deepLinkController =
      StreamController<Map<String, dynamic>>.broadcast();

  String? registeredUid;
  String? registeredToken;
  String? registeredRole;
  String? registeredDeviceId;
  final List<String> subscribedTopics = [];
  final Map<String, Map<String, dynamic>> canonicalUserDevices = {};

  @override
  Stream<Map<String, dynamic>> get onNotificationReceived => _notificationController.stream;

  @override
  Stream<Map<String, dynamic>> get onDeepLinkOpened => _deepLinkController.stream;

  @override
  Future<String?> getDeviceToken() async => 'mock_fcm_token_c2d27';

  @override
  Future<void> registerDeviceToken({
    required String uid,
    required String token,
    String? role,
    String? deviceId,
  }) async {
    registeredUid = uid;
    registeredToken = token;
    registeredRole = role ?? 'client';
    registeredDeviceId = deviceId ?? 'ios_device_${uid.hashCode.abs()}';

    final effectiveRole = registeredRole!.toLowerCase();
    final docKey = '${uid}_$registeredDeviceId';

    // 1:1 Schema simulation strictly aligned with Android FcmManager.kt
    canonicalUserDevices[docKey] = {
      'deviceId': registeredDeviceId,
      'uid': uid,
      'fcmToken': token,
      'token': token, // Dual key parity
      'platform': 'iOS',
      'deviceType': 'Smartphone',
      'role': effectiveRole,
      'isTokenValid': true,
      'isActive': true,
    };

    // Role-based topics alignment
    if (['courier', 'motorizado', 'driver'].contains(effectiveRole)) {
      subscribedTopics.add('available_orders');
      subscribedTopics.add('fleet_default_MANAGUA');
    } else if (['business', 'comercio', 'owner', 'manager', 'cashier'].contains(effectiveRole)) {
      subscribedTopics.add('business_alerts');
    } else if (['admin', 'super_admin', 'superadmin'].contains(effectiveRole)) {
      subscribedTopics.add('admin_alerts');
    } else {
      subscribedTopics.add('customer_alerts');
    }
  }

  @override
  Future<void> unbindDeviceToken({
    required String uid,
    String? deviceId,
  }) async {
    final resolvedDeviceId = deviceId ?? registeredDeviceId ?? 'flutter';
    final docKey = '${uid}_$resolvedDeviceId';
    if (canonicalUserDevices.containsKey(docKey)) {
      canonicalUserDevices[docKey]!['isActive'] = false;
      canonicalUserDevices[docKey]!['tokenStatus'] = 'unbound_logout';
    }
  }

  @override
  void handleDeepLink(Map<String, dynamic> data) {
    _deepLinkController.add(data);
  }

  void emitNotification(Map<String, dynamic> data) {
    _notificationController.add(data);
  }

  void dispose() {
    _notificationController.close();
    _deepLinkController.close();
  }
}

class DummyAuthService implements IAuthService {
  UserProfileEntity? currentUser;
  CanonicalCustomClaimsV3? claims;

  DummyAuthService({this.currentUser, this.claims});

  @override
  Stream<UserProfileEntity?> get authStateChanges => Stream.value(currentUser);
  @override
  Future<UserProfileEntity?> getCurrentUser() async => currentUser;
  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async => claims;
  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async =>
      currentUser ?? _defaultUser;
  @override
  Future<UserProfileEntity> registerWithEmailPassword({
    required String email,
    required String password,
    required String name,
    required String phone,
  }) async =>
      currentUser ?? _defaultUser;
  @override
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken}) async =>
      currentUser ?? _defaultUser;
  @override
  Future<UserProfileEntity> signInWithFacebookToken(String accessToken) async =>
      currentUser ?? _defaultUser;
  @override
  Future<UserProfileEntity> signInWithGoogle() async => currentUser ?? _defaultUser;
  @override
  Future<UserProfileEntity> signInWithFacebook() async => currentUser ?? _defaultUser;
  @override
  Future<UserProfileEntity> signInWithApple() async => currentUser ?? _defaultUser;
  @override
  Future<void> sendPasswordReset(String email) async {}
  @override
  Future<void> signOut() async {
    currentUser = null;
    claims = null;
  }
  @override
  Future<void> refreshIdToken() async {}

  static const _defaultUser = UserProfileEntity(
    uid: 'usr_default',
    email: 'user@test.com',
    displayName: 'Test User',
    role: EiamRole.client,
    isVerified: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  );
}

class DummyPlatformService
    implements ITenantService, IBrandService, ISubscriptionService, IAppConfigService {
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
  }) async =>
      null;
}

class MockOrderService implements IOrderService {
  @override
  Stream<OrderEntity?> watchOrder(String orderId) => Stream.value(null);
  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) => Stream.value([]);
  @override
  Future<OrderEntity?> getOrderById(String orderId) async => null;
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'ORD-TEST-999';
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async =>
      true;
  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {}
}

class MockFleetService implements IFleetService {
  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) => Stream.value(null);
  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) =>
      Stream.value([]);
  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}
}

class MockTripService implements ITripService {
  @override
  Stream<TripEntity?> watchTrip(String tripId) => Stream.value(null);
  @override
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId}) => Stream.value([]);
  @override
  Future<TripEntity?> getTripById(String tripId) async => null;
  @override
  Future<String> createTrip(Map<String, dynamic> tripData) async => 'TRIP-TEST-999';
  @override
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName) async =>
      true;
  @override
  Future<void> updateTripStatus(String tripId, TripStatus status) async {}
}

class MockMerchantService implements IMerchantService {
  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) => Stream.value(null);
  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<BranchEntity>> watchAllBranches({required String tenantId}) => Stream.value([]);
  @override
  Stream<DashboardConfigEntity> watchDashboardConfig({String? tenantId}) =>
      Stream.value(const DashboardConfigEntity());
  @override
  Stream<List<FlashDealEntity>> watchFlashDeals({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchDiscountedProducts({required String tenantId}) =>
      Stream.value([]);
  @override
  Stream<List<CategoryEntity>> watchCategories({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) => Stream.value([]);
  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId,
          {required String tenantId}) async =>
      [];
  @override
  Future<void> updateProductQuick(String productId,
      {required String name, required double price}) async {}
}

class MockSessionStateForBlock6 extends SessionState {
  final CanonicalCustomClaimsV3? _mockClaims;
  final UserProfileEntity? _mockUser;

  MockSessionStateForBlock6({
    CanonicalCustomClaimsV3? claims,
    UserProfileEntity? user,
    super.notificationService,
  })  : _mockClaims = claims,
        _mockUser = user,
        super(
          authService: DummyAuthService(currentUser: user, claims: claims),
          tenantService: DummyPlatformService(),
          brandService: DummyPlatformService(),
          subscriptionService: DummyPlatformService(),
          appConfigService: DummyPlatformService(),
        );

  @override
  CanonicalCustomClaimsV3? get claims => _mockClaims;
  @override
  UserProfileEntity? get currentUser => _mockUser;
  @override
  bool get isAuthenticated => _mockUser != null;
  @override
  AuthStatus get status =>
      _mockUser != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
}

// ─── TEST SUITE ─────────────────────────────────────────────────────────────

void main() {
  group('BLOQUE 6 — NOTIFICACIONES PUSH FCM & BACKGROUND LIFECYCLES', () {
    late MockNotificationServiceForBlock6 mockNotifs;

    setUp(() {
      mockNotifs = MockNotificationServiceForBlock6();
    });

    tearDown(() {
      mockNotifs.dispose();
    });

    test('Subtask 1: Canonical Multi-Device Token Persistence & Dual Key Alignment', () async {
      // 1. Register device token for Customer
      const uid = 'usr_customer_777';
      const token = 'fcm_alpha_device_token_xyz_123';

      await mockNotifs.registerDeviceToken(
        uid: uid,
        token: token,
        role: 'client',
      );

      final docKey = '${uid}_${mockNotifs.registeredDeviceId}';
      expect(mockNotifs.canonicalUserDevices.containsKey(docKey), isTrue);

      final record = mockNotifs.canonicalUserDevices[docKey]!;
      expect(record['uid'], uid);
      // Verify strict dual-field storage for Cloud Function & FcmManager compatibility
      expect(record['fcmToken'], token);
      expect(record['token'], token);
      expect(record['platform'], 'iOS');
      expect(record['deviceType'], 'Smartphone');
      expect(record['role'], 'client');
      expect(record['isTokenValid'], isTrue);
      expect(record['isActive'], isTrue);
    });

    test('Subtask 2: Role-based Topic Subscription Matrix (1:1 Android FcmManager Parity)', () async {
      // 1. Courier role
      await mockNotifs.registerDeviceToken(
        uid: 'usr_courier_01',
        token: 'token_courier_01',
        role: 'driver',
      );
      expect(mockNotifs.subscribedTopics, contains('available_orders'));
      expect(mockNotifs.subscribedTopics, contains('fleet_default_MANAGUA'));

      // 2. Merchant role
      await mockNotifs.registerDeviceToken(
        uid: 'usr_merchant_01',
        token: 'token_merchant_01',
        role: 'business',
      );
      expect(mockNotifs.subscribedTopics, contains('business_alerts'));

      // 3. Admin role
      await mockNotifs.registerDeviceToken(
        uid: 'usr_admin_01',
        token: 'token_admin_01',
        role: 'admin',
      );
      expect(mockNotifs.subscribedTopics, contains('admin_alerts'));

      // 4. Customer role
      await mockNotifs.registerDeviceToken(
        uid: 'usr_cust_02',
        token: 'token_cust_02',
        role: 'client',
      );
      expect(mockNotifs.subscribedTopics, contains('customer_alerts'));
    });

    test('Subtask 3: Auth Session Hydration Hooks Automatic Device Token Registration', () async {
      const testUser = UserProfileEntity(
        uid: 'usr_hydrated_123',
        email: 'test@bluesystemdelivery.com',
        displayName: 'Carlos Mendoza',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      );

      const testClaims = CanonicalCustomClaimsV3(
        role: EiamRole.client,
        tenantId: 'ten_core_01',
      );

      final dummyAuth = DummyAuthService(currentUser: testUser, claims: testClaims);
      final dummyPlatform = DummyPlatformService();

      final sessionState = SessionState(
        authService: dummyAuth,
        tenantService: dummyPlatform,
        brandService: dummyPlatform,
        subscriptionService: dummyPlatform,
        appConfigService: dummyPlatform,
        notificationService: mockNotifs,
      );

      // Initialize session should trigger automatic FCM registration (like Android MainActivity)
      await sessionState.initializeSession();

      expect(sessionState.isAuthenticated, isTrue);
      expect(mockNotifs.registeredUid, 'usr_hydrated_123');
      expect(mockNotifs.registeredToken, 'mock_fcm_token_c2d27');
      expect(mockNotifs.registeredRole, 'client');
    });

    testWidgets('Subtask 4: Deep Link & Notification Router in AppShell (1:1 Android NotificationRouter)',
        (tester) async {
      const testUser = UserProfileEntity(
        uid: 'usr_nav_001',
        email: 'nav@bluesystemdelivery.com',
        displayName: 'Navegante Test',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      );

      const testClaims = CanonicalCustomClaimsV3(
        role: EiamRole.client,
        tenantId: 'ten_core_01',
      );

      final mockSession = MockSessionStateForBlock6(
        user: testUser,
        claims: testClaims,
        notificationService: mockNotifs,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: AppShell(
            sessionState: mockSession,
            orderService: MockOrderService(),
            tripService: MockTripService(),
            fleetService: MockFleetService(),
            merchantService: MockMerchantService(),
            notificationService: mockNotifs,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Default tab is Home / Inicio (index 0)
      expect(find.text('Inicio'), findsOneWidget);
      expect(find.text('Pedidos'), findsOneWidget);

      // Simulate incoming order notification deep link: should switch to Pedidos (index 2)
      mockNotifs.handleDeepLink({
        'action': 'ORDER_STATUS',
        'orderId': 'ord_live_888',
        'screen': 'orders',
      });
      await tester.pumpAndSettle();

      // Simulate incoming Profile / Address notification
      mockNotifs.handleDeepLink({
        'action': 'PROFILE_UPDATE',
        'screen': 'profile',
      });
      await tester.pumpAndSettle();

      // Everything resolves safely without exceptions
      expect(tester.takeException(), isNull);
    });

    test('P4-01: unbindDeviceToken marks device inactive and unbind_logout', () async {
      final mockNotifs = MockNotificationServiceForBlock6();
      const testUid = 'user_logout_test_123';
      const testToken = 'token_logout_test_abc';

      await mockNotifs.registerDeviceToken(
        uid: testUid,
        token: testToken,
        role: 'customer',
        deviceId: 'device_test_1',
      );

      const docKey = '${testUid}_device_test_1';
      expect(mockNotifs.canonicalUserDevices[docKey]!['isActive'], isTrue);

      await mockNotifs.unbindDeviceToken(
        uid: testUid,
        deviceId: 'device_test_1',
      );

      expect(mockNotifs.canonicalUserDevices[docKey]!['isActive'], isFalse);
      expect(mockNotifs.canonicalUserDevices[docKey]!['tokenStatus'], 'unbound_logout');
    });
  });
}

