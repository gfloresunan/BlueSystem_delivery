/// BLUE SYSTEM DELIVERY ENTERPRISE — BLOQUE 4 TEST SUITE (COURIER & LIVE ROUTING)
/// Validates:
/// 1. Courier Availability & Real-Time Telemetry Publishing (ADR-016)
/// 2. Commerce Order Claiming, 4-Stage Stepper Transitions & POD Confirmation
/// 3. X→Y Express Trip Claiming, Sequential Lifecycle & POD Confirmation
/// 4. Turn-by-Turn GPS Navigation Launcher & ADR-018 Daily Cash Closure Preservation

import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/data/services/courier_cash_closure_service.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_balance_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/courier/courier_dashboard_screen.dart';

// ─── MOCKS ───────────────────────────────────────────────────────────────────

class MockFleetService implements IFleetService {
  CourierLocationEntity? lastPublishedTelemetry;
  final StreamController<CourierLocationEntity?> _courierController =
      StreamController<CourierLocationEntity?>.broadcast();

  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) =>
      _courierController.stream;

  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) =>
      Stream.value([]);

  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {
    lastPublishedTelemetry = telemetry;
    _courierController.add(telemetry);
  }

  void dispose() => _courierController.close();
}

class MockOrderService implements IOrderService {
  final List<OrderEntity> _eligibleOrders;
  final List<OrderEntity> _assignedOrders;

  final StreamController<List<OrderEntity>> _eligibleController =
      StreamController<List<OrderEntity>>.broadcast();
  final StreamController<List<OrderEntity>> _assignedController =
      StreamController<List<OrderEntity>>.broadcast();

  String? lastClaimedOrderId;
  String? lastUpdatedOrderId;
  OrderStatus? lastUpdatedStatus;

  MockOrderService({
    List<OrderEntity>? eligibleOrders,
    List<OrderEntity>? assignedOrders,
  })  : _eligibleOrders = eligibleOrders != null ? List.from(eligibleOrders) : [],
        _assignedOrders = assignedOrders != null ? List.from(assignedOrders) : [];

  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) async* {
    yield _eligibleOrders;
    yield* _eligibleController.stream;
  }

  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) async* {
    yield _assignedOrders;
    yield* _assignedController.stream;
  }

  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async {
    lastClaimedOrderId = orderId;
    final idx = _eligibleOrders.indexWhere((o) => o.orderId == orderId);
    if (idx != -1) {
      final claimed = _eligibleOrders.removeAt(idx);
      _eligibleController.add(_eligibleOrders);
      _assignedOrders.add(claimed);
      _assignedController.add(_assignedOrders);
      return true;
    }
    return false;
  }

  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    lastUpdatedOrderId = orderId;
    lastUpdatedStatus = status;
    final idx = _assignedOrders.indexWhere((o) => o.orderId == orderId);
    if (idx != -1) {
      final old = _assignedOrders[idx];
      final updated = OrderEntity(
        orderId: old.orderId,
        tenantId: old.tenantId,
        brandId: old.brandId,
        businessId: old.businessId,
        businessName: old.businessName,
        branchId: old.branchId,
        customerId: old.customerId,
        customerName: old.customerName,
        customerPhone: old.customerPhone,
        deliveryAddress: old.deliveryAddress,
        deliveryLat: old.deliveryLat,
        deliveryLng: old.deliveryLng,
        assignedCourierId: old.assignedCourierId,
        items: old.items,
        subtotal: old.subtotal,
        deliveryFee: old.deliveryFee,
        discount: old.discount,
        total: old.total,
        status: status,
        paymentMethod: old.paymentMethod,
        isPaid: old.isPaid,
        createdAt: old.createdAt,
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
      _assignedOrders[idx] = updated;
      _assignedController.add(_assignedOrders);
    }
  }

  @override
  Future<OrderEntity?> getOrderById(String orderId) async => null;
  @override
  Stream<OrderEntity?> watchOrder(String orderId) => Stream.value(null);
  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'ORD-NEW';

  void dispose() {
    _eligibleController.close();
    _assignedController.close();
  }
}

class MockTripService implements ITripService {
  final List<TripEntity> _eligibleTrips;
  final List<TripEntity> _assignedTrips;

  final StreamController<List<TripEntity>> _eligibleController =
      StreamController<List<TripEntity>>.broadcast();
  final StreamController<List<TripEntity>> _assignedController =
      StreamController<List<TripEntity>>.broadcast();

  String? lastClaimedTripId;
  String? lastUpdatedTripId;
  TripStatus? lastUpdatedStatus;

  MockTripService({
    List<TripEntity>? eligibleTrips,
    List<TripEntity>? assignedTrips,
  })  : _eligibleTrips = eligibleTrips != null ? List.from(eligibleTrips) : [],
        _assignedTrips = assignedTrips != null ? List.from(assignedTrips) : [];

  @override
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId}) async* {
    yield _eligibleTrips;
    yield* _eligibleController.stream;
  }

  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) async* {
    yield _assignedTrips;
    yield* _assignedController.stream;
  }

  @override
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName) async {
    lastClaimedTripId = tripId;
    final idx = _eligibleTrips.indexWhere((t) => t.tripId == tripId);
    if (idx != -1) {
      final claimed = _eligibleTrips.removeAt(idx);
      final assigned = TripEntity(
        tripId: claimed.tripId,
        tenantId: claimed.tenantId,
        customerId: claimed.customerId,
        assignedCourierId: courierId,
        origin: claimed.origin,
        destination: claimed.destination,
        distanceKm: claimed.distanceKm,
        basePrice: claimed.basePrice,
        distancePrice: claimed.distancePrice,
        totalPrice: claimed.totalPrice,
        status: TripStatus.assigned,
        packageDescription: claimed.packageDescription,
        createdAt: claimed.createdAt,
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
      _eligibleController.add(_eligibleTrips);
      _assignedTrips.add(assigned);
      _assignedController.add(_assignedTrips);
      return true;
    }
    return false;
  }

  @override
  Future<void> updateTripStatus(String tripId, TripStatus status) async {
    lastUpdatedTripId = tripId;
    lastUpdatedStatus = status;
    final idx = _assignedTrips.indexWhere((t) => t.tripId == tripId);
    if (idx != -1) {
      final old = _assignedTrips[idx];
      final updated = TripEntity(
        tripId: old.tripId,
        tenantId: old.tenantId,
        customerId: old.customerId,
        assignedCourierId: old.assignedCourierId,
        origin: old.origin,
        destination: old.destination,
        distanceKm: old.distanceKm,
        basePrice: old.basePrice,
        distancePrice: old.distancePrice,
        totalPrice: old.totalPrice,
        status: status,
        packageDescription: old.packageDescription,
        createdAt: old.createdAt,
        updatedAt: DateTime.now().millisecondsSinceEpoch,
      );
      _assignedTrips[idx] = updated;
      _assignedController.add(_assignedTrips);
    }
  }

  @override
  Future<TripEntity?> getTripById(String tripId) async => null;
  @override
  Stream<TripEntity?> watchTrip(String tripId) => Stream.value(null);
  @override
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId}) => Stream.value([]);
  @override
  Future<String> createTrip(Map<String, dynamic> tripData) async => 'TRIP-NEW';

  void dispose() {
    _eligibleController.close();
    _assignedController.close();
  }
}

class MockCashClosureService implements ICourierCashClosureService {
  final CourierBalanceEntity balance;
  String? lastInitiatedClosureRef;

  MockCashClosureService({required this.balance});

  @override
  Stream<CourierBalanceEntity?> watchCourierBalance(String courierId) =>
      Stream.value(balance);

  @override
  Future<CourierBalanceEntity?> getCourierBalance(String courierId) async => balance;

  @override
  Stream<List<CourierDailyClosureEntity>> watchClosureHistory(String courierId) =>
      Stream.value([]);

  @override
  Future<String> uploadDepositReceipt({
    required String courierId,
    required File imageFile,
    String? closureId,
  }) async => 'https://storage.googleapis.com/...';

  @override
  Future<String> generateOfficialActDocument({
    required String courierId,
    required String courierName,
    required int totalCollectedCents,
    required String bankReference,
    required String depositReceiptUrl,
  }) async {
    return 'Número de Acta: ACTA-CASH-TEST-999\nDeposit: $bankReference';
  }

  @override
  Future<Map<String, dynamic>> initiateDailyClosure({
    required String courierId,
    required String bankReference,
    required String receiptUrl,
    required int totalCollectedCents,
    String? bankName,
    String? businessDate,
    String? shift,
    String? notes,
  }) async {
    lastInitiatedClosureRef = bankReference;
    return {'status': 'success', 'closureId': 'CLOSURE-TEST-001'};
  }

  @override
  Future<Map<String, dynamic>> registerBankDepositReceipt({
    required String closureId,
    required String bankName,
    required String bankReference,
    required int depositAmountCents,
    required String receiptDownloadUrl,
    String? receiptStoragePath,
    String? depositDate,
    String? notes,
  }) async {
    return {'status': 'success', 'closureId': closureId};
  }
}

class DummySessionState extends SessionState {
  final UserProfileEntity? _user;
  final CanonicalCustomClaimsV3? _claims;

  DummySessionState({UserProfileEntity? user, CanonicalCustomClaimsV3? claims})
      : _user = user,
        _claims = claims,
        super(
          authService: _StubAuthService(),
          tenantService: _StubPlatformService(),
          brandService: _StubPlatformService(),
          subscriptionService: _StubPlatformService(),
          appConfigService: _StubPlatformService(),
        );

  @override
  UserProfileEntity? get currentUser => _user;
  @override
  CanonicalCustomClaimsV3? get claims => _claims;
  @override
  bool get isAuthenticated => true;
  @override
  bool get isGuestMode => false;
}

class _StubAuthService implements IAuthService {
  @override
  Stream<UserProfileEntity?> get authStateChanges => Stream.value(null);
  @override
  Future<UserProfileEntity?> getCurrentUser() async => null;
  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async => null;
  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> registerWithEmailPassword({required String email, required String password, required String name, required String phone}) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken}) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithFacebookToken(String accessToken) async => throw UnimplementedError();
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

class _StubPlatformService implements ITenantService, IBrandService, ISubscriptionService, IAppConfigService {
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
  Future<AppConfigEntity?> resolveActiveConfig({required String tenantId, required String brandId, required PlatformType platform, required EnvironmentType environment}) async => null;
}

// ─── TEST SUITE ─────────────────────────────────────────────────────────────

void main() {
  const testCourier = UserProfileEntity(
    uid: 'courier_oper_99',
    email: 'courier@bluesystemdelivery.com',
    displayName: 'Carlos Repartidor',
    role: EiamRole.driver,
    isVerified: true,
    createdAt: 1000,
    updatedAt: 1000,
  );

  final sessionState = DummySessionState(
    user: testCourier,
    claims: const CanonicalCustomClaimsV3(
      role: EiamRole.driver,
      tenantId: 'ten_bluesystem_core',
    ),
  );

  group('BLOQUE 4 — Subtask 1: Courier Availability & Live Telemetry (ADR-016)', () {
    testWidgets('Toggling availability publishes live GPS telemetry to /ubicaciones_repartidores', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockFleet = MockFleetService();
      final mockOrders = MockOrderService();
      final mockTrips = MockTripService();

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: sessionState,
            orderService: mockOrders,
            tripService: mockTrips,
            fleetService: mockFleet,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Initially offline
      expect(find.text('Fuera de Línea'), findsOneWidget);
      expect(find.text('No Disponible'), findsOneWidget);

      // Toggle switch to online
      await tester.tap(find.byKey(const Key('courier_availability_switch')));
      await tester.pumpAndSettle();

      // Verify status flipped to online
      expect(find.text('En Línea'), findsOneWidget);
      expect(find.text('Disponible para Entregas'), findsOneWidget);

      // Verify telemetry published with ADR-016 canon
      expect(mockFleet.lastPublishedTelemetry, isNotNull);
      expect(mockFleet.lastPublishedTelemetry!.courierId, equals('courier_oper_99'));
      expect(mockFleet.lastPublishedTelemetry!.isOnline, isTrue);
      expect(mockFleet.lastPublishedTelemetry!.tenantId, equals('ten_bluesystem_core'));
      expect(mockFleet.lastPublishedTelemetry!.courierName, equals('Carlos Repartidor'));

      mockFleet.dispose();
      mockOrders.dispose();
      mockTrips.dispose();
    });
  });

  group('BLOQUE 4 — Subtask 2: Commerce Order Lifecycle, Stepper & Proof of Delivery (POD)', () {
    testWidgets('Claims eligible order, advances 4-step stepper and completes with POD', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const eligibleOrder = OrderEntity(
        orderId: 'ORD-READY-001',
        tenantId: 'ten_bluesystem_core',
        customerId: 'cust_77',
        customerName: 'Cliente Prueba',
        customerPhone: '8888-9999',
        businessId: 'biz_tipitapa',
        businessName: 'Tipitapa Express',
        assignedCourierId: null,
        deliveryAddress: 'Del Palí 2c al sur, Managua',
        items: [],
        subtotal: 200.0,
        deliveryFee: 50.0,
        discount: 0.0,
        total: 250.0,
        status: OrderStatus.readyForPickup,
        paymentMethod: PaymentMethod.cash,
        isPaid: false,
        createdAt: 1000,
        updatedAt: 1000,
      );

      final mockFleet = MockFleetService();
      final mockOrders = MockOrderService(eligibleOrders: [eligibleOrder]);
      final mockTrips = MockTripService();

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: sessionState,
            orderService: mockOrders,
            tripService: mockTrips,
            fleetService: mockFleet,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Toggle online so eligible orders section appears
      await tester.tap(find.byKey(const Key('courier_availability_switch')));
      await tester.pumpAndSettle();

      expect(find.text('Pedidos Listos para Tomar'), findsOneWidget);
      expect(find.text('Del Palí 2c al sur, Managua'), findsOneWidget);

      // Tap Tomar to claim order atomically
      await tester.tap(find.text('Tomar').first);
      await tester.pumpAndSettle();

      expect(mockOrders.lastClaimedOrderId, equals('ORD-READY-001'));
      expect(find.text('¡Pedido tomado con éxito!'), findsOneWidget);

      // Now order is in assigned queue
      expect(find.text('C\$ 250'), findsOneWidget);
      expect(find.text('💵 Efectivo contra entrega'), findsOneWidget);

      // Step: readyForPickup -> Next: 'INICIAR RUTA AL CLIENTE 🚀'
      expect(find.text('INICIAR RUTA AL CLIENTE 🚀'), findsOneWidget);
      await tester.tap(find.byKey(const Key('courier_action_btn_ORD-READY-001')));
      await tester.pumpAndSettle();

      expect(mockOrders.lastUpdatedStatus, equals(OrderStatus.dispatched));

      // Step: dispatched -> Next: 'Llegué donde el Cliente 📍'
      expect(find.text('Llegué donde el Cliente 📍'), findsOneWidget);
      await tester.tap(find.byKey(const Key('courier_action_btn_ORD-READY-001')));
      await tester.pumpAndSettle();

      expect(mockOrders.lastUpdatedStatus, equals(OrderStatus.arrivedAtCustomer));

      // Step: arrivedAtCustomer -> Next: 'COBRAR C$ 250 Y ENTREGAR 💵'
      expect(find.text('COBRAR C\$ 250 Y ENTREGAR 💵'), findsOneWidget);
      await tester.tap(find.byKey(const Key('courier_action_btn_ORD-READY-001')));
      await tester.pumpAndSettle();

      // Verify Proof of Delivery (POD) Dialog opened
      expect(find.text('Confirmar Entrega (POD)'), findsWidgets);
      expect(find.text('Total cobrado en efectivo:'), findsOneWidget);
      expect(find.byKey(const Key('pod_recipient_name_input')), findsOneWidget);

      // Enter recipient name & notes
      await tester.enterText(find.byKey(const Key('pod_recipient_name_input')), 'Doña María López');
      await tester.enterText(find.byKey(const Key('pod_notes_input')), 'Entregado en puerta principal');
      await tester.pumpAndSettle();

      // Submit POD
      await tester.tap(find.byKey(const Key('pod_confirm_submit_button')));
      await tester.pumpAndSettle();

      // Status transitioned to delivered
      expect(mockOrders.lastUpdatedStatus, equals(OrderStatus.delivered));

      mockFleet.dispose();
      mockOrders.dispose();
      mockTrips.dispose();
    });
  });

  group('BLOQUE 4 — Subtask 3: X→Y Express Trip Lifecycle & Navigation', () {
    testWidgets('Claims eligible trip, advances X→Y route, tests turn-by-turn navigation and completes', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const eligibleTrip = TripEntity(
        tripId: 'TRIP-EXP-88',
        tenantId: 'ten_bluesystem_core',
        customerId: 'cust_88',
        assignedCourierId: null,
        origin: LocationPoint(address: 'Metrocentro Managua', latitude: 12.136, longitude: -86.251),
        destination: LocationPoint(address: 'Galerías Santo Domingo', latitude: 12.105, longitude: -86.248),
        distanceKm: 5.2,
        basePrice: 35.0,
        distancePrice: 52.0,
        totalPrice: 87.0,
        status: TripStatus.requested,
        packageDescription: 'Documentos urgentes',
        createdAt: 1000,
        updatedAt: 1000,
      );

      final mockFleet = MockFleetService();
      final mockOrders = MockOrderService();
      final mockTrips = MockTripService(eligibleTrips: [eligibleTrip]);

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: sessionState,
            orderService: mockOrders,
            tripService: mockTrips,
            fleetService: mockFleet,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Toggle online
      await tester.tap(find.byKey(const Key('courier_availability_switch')));
      await tester.pumpAndSettle();

      expect(find.text('Envíos Express X→Y Disponibles'), findsOneWidget);
      expect(find.text('C\$ 87.00'), findsOneWidget);

      // Claim trip
      await tester.tap(find.byKey(const Key('claim_trip_btn_TRIP-EXP-88')));
      await tester.pumpAndSettle();

      expect(mockTrips.lastClaimedTripId, equals('TRIP-EXP-88'));
      expect(find.text('¡Envío express tomado con éxito!'), findsOneWidget);

      // Active trip card is displayed
      expect(find.text('Envío Express #TRIP-EXP-88'), findsOneWidget);
      expect(find.text('X: Metrocentro Managua'), findsOneWidget);
      expect(find.text('Y: Galerías Santo Domingo'), findsOneWidget);

      // Test Turn-by-Turn Navigation Action
      expect(find.byKey(const Key('trip_navigate_btn_TRIP-EXP-88')), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip_navigate_btn_TRIP-EXP-88')));
      await tester.pumpAndSettle();

      expect(find.text('Navegar: Destino Envío Express'), findsOneWidget);
      await tester.tap(find.byKey(const Key('open_maps_button')));
      await tester.pumpAndSettle();

      // Modal bottom sheet dismissed
      expect(find.text('Navegar: Destino Envío Express'), findsNothing);

      // Advance trip: requested -> goodsPickedUp
      await tester.tap(find.byKey(const Key('trip_action_btn_TRIP-EXP-88')));
      await tester.pumpAndSettle();

      expect(mockTrips.lastUpdatedStatus, equals(TripStatus.goodsPickedUp));

      // Advance trip: goodsPickedUp -> onWayToDestination
      expect(find.text('INICIAR RUTA AL DESTINO 🚀'), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip_action_btn_TRIP-EXP-88')));
      await tester.pumpAndSettle();

      expect(mockTrips.lastUpdatedStatus, equals(TripStatus.onWayToDestination));

      // Advance trip: onWayToDestination -> arrivedAtDestination
      expect(find.text('Llegué a Destino 📍'), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip_action_btn_TRIP-EXP-88')));
      await tester.pumpAndSettle();

      expect(mockTrips.lastUpdatedStatus, equals(TripStatus.arrivedAtDestination));

      // Complete trip with POD
      expect(find.text('CONFIRMAR ENTREGA (POD) Y FINALIZAR ✅'), findsOneWidget);
      await tester.tap(find.byKey(const Key('trip_action_btn_TRIP-EXP-88')));
      await tester.pumpAndSettle();

      // Fill POD dialog
      expect(find.text('Confirmar Entrega Envío Express (POD)'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('pod_recipient_name_input')), 'Carlos Gómez');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('pod_confirm_submit_button')));
      await tester.pumpAndSettle();

      expect(mockTrips.lastUpdatedStatus, equals(TripStatus.completed));

      mockFleet.dispose();
      mockOrders.dispose();
      mockTrips.dispose();
    });
  });

  group('BLOQUE 4 — Subtask 4: Cash Balance & ADR-018 Arqueo Closure Preservation', () {
    testWidgets('Preserves ADR-018 cash closure dialog, calculates Cordobas and initiates closure', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const balance = CourierBalanceEntity(
        courierId: 'courier_oper_99',
        cashOutstandingCents: 154000, // C$ 1,540.00
        effectiveCashLimitCents: 300000, // C$ 3,000.00
      );

      final mockFleet = MockFleetService();
      final mockOrders = MockOrderService();
      final mockTrips = MockTripService();
      final mockCash = MockCashClosureService(balance: balance);

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: sessionState,
            orderService: mockOrders,
            tripService: mockTrips,
            fleetService: mockFleet,
            cashClosureService: mockCash,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check balance card
      expect(find.byKey(const Key('courier_balance_card_title')), findsOneWidget);
      expect(find.text('C\$ 1540.00'), findsOneWidget);
      expect(find.text('OPERATIVO'), findsOneWidget);

      // Open ADR-018 daily closure
      await tester.tap(find.byKey(const Key('courier_daily_closure_button')));
      await tester.pumpAndSettle();

      expect(find.text('Iniciar Cierre Diario (Arqueo)'), findsOneWidget);
      expect(find.text('C\$ 1540.00'), findsWidgets);

      // Submit closure
      await tester.enterText(find.byKey(const Key('cash_closure_ref_input')), 'DEP-BANPRO-998877');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('cash_closure_submit_button')));
      await tester.pumpAndSettle();

      expect(mockCash.lastInitiatedClosureRef, equals('DEP-BANPRO-998877'));
      expect(find.text('✅ Cierre y Número de Acta: ACTA-CASH-TEST-999.'), findsOneWidget);

      mockFleet.dispose();
      mockOrders.dispose();
      mockTrips.dispose();
    });
  });
}
