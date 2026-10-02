/// BLUE SYSTEM DELIVERY ENTERPRISE — GAP-MAP-01 CONTRACT TESTS
/// Validates Fleet Map Screen, real-time GoogleMap rendering, courier telemetry streaming,
/// active markers, selection, and multi-tenant isolation (ADR-016 / 1:1 Android FlotaMapScreen.kt).

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/fleet/fleet_map_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/widgets/state_views.dart';

class MockFleetService implements IFleetService {
  final StreamController<List<CourierLocationEntity>> _couriersController =
      StreamController<List<CourierLocationEntity>>.broadcast();

  String? lastRequestedTenantId;

  void emitCouriers(List<CourierLocationEntity> couriers) {
    _couriersController.add(couriers);
  }

  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) {
    lastRequestedTenantId = tenantId;
    return _couriersController.stream;
  }

  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) {
    return Stream.value(null);
  }

  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}

  void dispose() {
    _couriersController.close();
  }
}

class DummyAuthService implements IAuthService {
  @override
  Stream<UserProfileEntity?> get authStateChanges => Stream.value(null);
  @override
  Future<UserProfileEntity?> getCurrentUser() async => null;
  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async => null;
  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async =>
      throw UnimplementedError();
  @override
  Future<UserProfileEntity> registerWithEmailPassword({
    required String email,
    required String password,
    required String name,
    required String phone,
  }) async =>
      throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken}) async =>
      throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithFacebookToken(String accessToken) async =>
      throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithGoogle() async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithFacebook() async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithApple() async => throw UnimplementedError();
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
  }) async =>
      null;
}

class MockSessionState extends SessionState {
  final CanonicalCustomClaimsV3? _mockClaims;
  final UserProfileEntity? _mockUser;
  final TenantEntity? _mockTenant;
  final bool _mockCanAccess;

  MockSessionState({
    CanonicalCustomClaimsV3? claims,
    UserProfileEntity? user,
    TenantEntity? tenant,
    bool canAccess = true,
  })  : _mockClaims = claims,
        _mockUser = user,
        _mockTenant = tenant,
        _mockCanAccess = canAccess,
        super(
          authService: DummyAuthService(),
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
  TenantEntity? get activeTenant => _mockTenant;
  @override
  bool canAccess(String moduleKey) => _mockCanAccess;
}

void main() {
  late MockFleetService mockFleetService;

  setUp(() {
    mockFleetService = MockFleetService();
  });

  tearDown(() {
    mockFleetService.dispose();
  });

  final sampleCouriers = <CourierLocationEntity>[
    CourierLocationEntity(
      courierId: 'courier_101',
      courierName: 'Carlos Repartidor',
      tenantId: 'ten_bluesystem_core',
      latitude: 12.136389,
      longitude: -86.251389,
      speed: 9.86,
      batteryLevel: 92,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      isOnline: true,
    ),
    CourierLocationEntity(
      courierId: 'courier_102',
      courierName: 'Maria Express',
      tenantId: 'ten_bluesystem_core',
      latitude: 12.140000,
      longitude: -86.260000,
      speed: 0.0,
      batteryLevel: 45,
      timestamp: DateTime.now().subtract(const Duration(minutes: 20)).millisecondsSinceEpoch,
      isOnline: false,
    ),
  ];

  testWidgets('GAP-MAP-01: UnauthorizedView is rendered when session cannot access FLEET', (tester) async {
    final session = MockSessionState(canAccess: false);

    await tester.pumpWidget(
      MaterialApp(
        home: FleetMapScreen(
          sessionState: session,
          fleetService: mockFleetService,
        ),
      ),
    );

    expect(find.byType(UnauthorizedView), findsOneWidget);
    expect(find.byType(FleetMapScreen), findsOneWidget);
  });

  testWidgets('GAP-MAP-01: ErrorView is rendered when tenantId is empty', (tester) async {
    final session = MockSessionState(
      canAccess: true,
      claims: null,
      tenant: null,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: FleetMapScreen(
          sessionState: session,
          fleetService: mockFleetService,
        ),
      ),
    );

    expect(find.byType(ErrorView), findsOneWidget);
    expect(find.text('Error de Contexto'), findsOneWidget);
  });

  testWidgets('GAP-MAP-01: Renders GoogleMap, courier tiles, and handles selection and telemetry', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final session = MockSessionState(
      canAccess: true,
      claims: const CanonicalCustomClaimsV3(
        role: EiamRole.admin,
        tenantId: 'ten_bluesystem_core',
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: FleetMapScreen(
          sessionState: session,
          fleetService: mockFleetService,
        ),
      ),
    );

    // Initial state is loading
    expect(find.byType(LoadingView), findsOneWidget);

    // Emit live couriers
    mockFleetService.emitCouriers(sampleCouriers);
    await tester.pumpAndSettle();

    // Verify tenant isolation in service call
    expect(mockFleetService.lastRequestedTenantId, equals('ten_bluesystem_core'));

    // Verify GoogleMap is rendered
    expect(find.byKey(const Key('fleet_map_widget')), findsOneWidget);
    expect(find.byType(GoogleMap), findsOneWidget);

    // Verify active count indicator (1 fresh, 1 stale)
    expect(find.text('Flota Activa: 1/2'), findsOneWidget);
    expect(find.text('Motorizados Registrados: 2'), findsOneWidget);

    // Verify courier tiles
    expect(find.byKey(const Key('courier_tile_courier_101')), findsOneWidget);
    expect(find.byKey(const Key('courier_tile_courier_102')), findsOneWidget);
    expect(find.text('Carlos Repartidor'), findsOneWidget);
    expect(find.text('Maria Express'), findsOneWidget);

    // Tap on courier_101 tile to focus
    await tester.tap(find.byKey(const Key('courier_tile_courier_101')));
    await tester.pumpAndSettle();

    // "Limpiar foco" button appears when selected
    expect(find.text('Limpiar foco'), findsOneWidget);

    // Clear focus
    await tester.tap(find.text('Limpiar foco'));
    await tester.pumpAndSettle();
    expect(find.text('Limpiar foco'), findsNothing);
  });

  testWidgets('GAP-MAP-01: Displays EmptyView when couriers list is empty', (tester) async {
    final session = MockSessionState(
      canAccess: true,
      claims: const CanonicalCustomClaimsV3(
        role: EiamRole.admin,
        tenantId: 'ten_bluesystem_core',
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: FleetMapScreen(
          sessionState: session,
          fleetService: mockFleetService,
        ),
      ),
    );

    mockFleetService.emitCouriers([]);
    await tester.pumpAndSettle();

    expect(find.byType(EmptyView), findsOneWidget);
    expect(find.text('Sin motorizados activos'), findsOneWidget);
  });
}
