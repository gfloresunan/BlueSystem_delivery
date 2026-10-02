/// BLUE SYSTEM DELIVERY ENTERPRISE — GAP-COU-01 CONTRACT TESTS
/// Validates Courier Order State Stepper, canonical state progression, and action buttons (1:1 Android RutaActivaScreen.kt).

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/courier/courier_dashboard_screen.dart';

class MockOrderService implements IOrderService {
  final List<OrderEntity> assignedOrders;
  final List<Map<String, dynamic>> updateCalls = [];

  MockOrderService({this.assignedOrders = const []});

  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) {
    return Stream.value(assignedOrders);
  }

  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    updateCalls.add({'orderId': orderId, 'status': status});
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
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) => Stream.value([]);
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'mock_order';
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async => true;
}

class MockTripService implements ITripService {
  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) => Stream.value([]);
  @override
  Future<TripEntity?> getTripById(String tripId) async => null;
  @override
  Stream<TripEntity?> watchTrip(String tripId) => Stream.value(null);
  @override
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId}) => Stream.value([]);
  @override
  Future<String> createTrip(Map<String, dynamic> tripData) async => 'mock_trip';
  @override
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName) async => true;
  @override
  Future<void> updateTripStatus(String tripId, TripStatus status) async {}
}

class MockFleetService implements IFleetService {
  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) => Stream.value([]);
  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) => Stream.value(null);
  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}
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
  }) async => throw UnimplementedError();
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
  }) async => null;
}

class MockSessionState extends SessionState {
  UserProfileEntity? _mockUser;
  CanonicalCustomClaimsV3? _mockClaims;
  AuthStatus _mockStatus = AuthStatus.authenticated;

  MockSessionState({
    UserProfileEntity? user,
    CanonicalCustomClaimsV3? claims,
    AuthStatus status = AuthStatus.authenticated,
  })  : _mockUser = user,
        _mockClaims = claims,
        _mockStatus = status,
        super(
          authService: DummyAuthService(),
          tenantService: DummyPlatformService(),
          brandService: DummyPlatformService(),
          subscriptionService: DummyPlatformService(),
          appConfigService: DummyPlatformService(),
        );

  @override
  UserProfileEntity? get currentUser => _mockUser;
  set currentUser(UserProfileEntity? val) => _mockUser = val;

  @override
  CanonicalCustomClaimsV3? get claims => _mockClaims;
  set claims(CanonicalCustomClaimsV3? val) => _mockClaims = val;

  @override
  AuthStatus get status => _mockStatus;
  set status(AuthStatus val) => _mockStatus = val;

  @override
  bool get isAuthenticated => _mockStatus == AuthStatus.authenticated;
}

SessionState createCourierSession() {
  final session = MockSessionState();
  session.currentUser = const UserProfileEntity(
    uid: 'courier_123',
    email: 'motorizado@bluesystem.com',
    displayName: 'Carlos Repartidor',
    role: EiamRole.driver,
    activeTenantId: 'ten_core',
    isVerified: true,
    createdAt: 0,
    updatedAt: 0,
  );
  session.claims = const CanonicalCustomClaimsV3(
    role: EiamRole.driver,
    tenantId: 'ten_core',
  );
  return session;
}

void main() {
  group('GAP-COU-01: Order State Parsing & Canonical Progression Tests', () {
    test('OrderEntity parses canonical status strings and aliases (1:1 Android parity)', () {
      expect(OrderEntity.fromMap({'status': 'ACCEPTED'}, '1').status, OrderStatus.accepted);
      expect(OrderEntity.fromMap({'status': 'COURIER_ACCEPTED'}, '2').status, OrderStatus.accepted);
      expect(OrderEntity.fromMap({'status': 'ASIGNADO'}, '3').status, OrderStatus.accepted);

      expect(OrderEntity.fromMap({'status': 'PREPARING'}, '4').status, OrderStatus.preparing);
      expect(OrderEntity.fromMap({'status': 'PREPARANDO'}, '5').status, OrderStatus.preparing);

      expect(OrderEntity.fromMap({'status': 'READY_FOR_PICKUP'}, '6').status, OrderStatus.readyForPickup);
      expect(OrderEntity.fromMap({'status': 'LISTO'}, '7').status, OrderStatus.readyForPickup);
      expect(OrderEntity.fromMap({'status': 'PICKED_UP'}, '8').status, OrderStatus.readyForPickup);

      expect(OrderEntity.fromMap({'status': 'DISPATCHED'}, '9').status, OrderStatus.dispatched);
      expect(OrderEntity.fromMap({'status': 'IN_TRANSIT'}, '10').status, OrderStatus.dispatched);
      expect(OrderEntity.fromMap({'status': 'EN_CAMINO'}, '11').status, OrderStatus.dispatched);

      expect(OrderEntity.fromMap({'status': 'ARRIVED_AT_CUSTOMER'}, '12').status, OrderStatus.arrivedAtCustomer);
      expect(OrderEntity.fromMap({'status': 'EN_DESTINO'}, '13').status, OrderStatus.arrivedAtCustomer);

      expect(OrderEntity.fromMap({'status': 'DELIVERED'}, '14').status, OrderStatus.delivered);
      expect(OrderEntity.fromMap({'status': 'COMPLETED'}, '15').status, OrderStatus.delivered);
      expect(OrderEntity.fromMap({'status': 'ENTREGADO'}, '16').status, OrderStatus.delivered);
    });
  });

  group('GAP-COU-01: Courier Order Stepper Widget & State Transition Tests', () {
    testWidgets('Displays Stepper and advances order from ACCEPTED to READY_FOR_PICKUP', (tester) async {
      const order = OrderEntity(
        orderId: 'ord_step_1',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        customerId: 'cust_1',
        customerName: 'Juan Pérez',
        customerPhone: '88888888',
        deliveryAddress: 'Colonia Centroamérica #45',
        assignedCourierId: 'courier_123',
        status: OrderStatus.accepted,
        items: [],
        subtotal: 200.0,
        deliveryFee: 45.0,
        discount: 0.0,
        total: 245.0,
        paymentMethod: PaymentMethod.card,
        isPaid: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final mockOrderService = MockOrderService(assignedOrders: [order]);

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: createCourierSession(),
            orderService: mockOrderService,
            tripService: MockTripService(),
            fleetService: MockFleetService(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Stepper labels should be visible
      expect(find.text('Asignado'), findsOneWidget);
      expect(find.text('En Comercio'), findsOneWidget);
      expect(find.text('En Ruta'), findsOneWidget);
      expect(find.text('Entregado'), findsOneWidget);

      // Button for accepted state
      final actionBtn = find.byKey(const Key('courier_action_btn_ord_step_1'));
      expect(actionBtn, findsOneWidget);
      expect(find.text('Estoy en el comercio — CONFIRMAR RECOGIDA 📦'), findsOneWidget);

      // Tap action button
      await tester.tap(actionBtn);
      await tester.pumpAndSettle();

      // updateOrderStatus called with readyForPickup
      expect(mockOrderService.updateCalls.length, 1);
      expect(mockOrderService.updateCalls.first['orderId'], 'ord_step_1');
      expect(mockOrderService.updateCalls.first['status'], OrderStatus.readyForPickup);
    });

    testWidgets('Advances order from READY_FOR_PICKUP to DISPATCHED (In Transit)', (tester) async {
      const order = OrderEntity(
        orderId: 'ord_step_2',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        customerId: 'cust_1',
        customerName: 'Juan Pérez',
        customerPhone: '88888888',
        deliveryAddress: 'Colonia Centroamérica #45',
        assignedCourierId: 'courier_123',
        status: OrderStatus.readyForPickup,
        items: [],
        subtotal: 180.0,
        deliveryFee: 45.0,
        discount: 0.0,
        total: 225.0,
        paymentMethod: PaymentMethod.card,
        isPaid: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final mockOrderService = MockOrderService(assignedOrders: [order]);

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: createCourierSession(),
            orderService: mockOrderService,
            tripService: MockTripService(),
            fleetService: MockFleetService(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('INICIAR RUTA AL CLIENTE 🚀'), findsOneWidget);

      final actionBtn = find.byKey(const Key('courier_action_btn_ord_step_2'));
      await tester.tap(actionBtn);
      await tester.pumpAndSettle();

      expect(mockOrderService.updateCalls.length, 1);
      expect(mockOrderService.updateCalls.first['status'], OrderStatus.dispatched);
    });

    testWidgets('Advances order from DISPATCHED to ARRIVED_AT_CUSTOMER', (tester) async {
      const order = OrderEntity(
        orderId: 'ord_step_3',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        customerId: 'cust_1',
        customerName: 'Juan Pérez',
        customerPhone: '88888888',
        deliveryAddress: 'Colonia Centroamérica #45',
        assignedCourierId: 'courier_123',
        status: OrderStatus.dispatched,
        items: [],
        subtotal: 180.0,
        deliveryFee: 45.0,
        discount: 0.0,
        total: 225.0,
        paymentMethod: PaymentMethod.card,
        isPaid: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final mockOrderService = MockOrderService(assignedOrders: [order]);

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: createCourierSession(),
            orderService: mockOrderService,
            tripService: MockTripService(),
            fleetService: MockFleetService(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Llegué donde el Cliente 📍'), findsOneWidget);

      final actionBtn = find.byKey(const Key('courier_action_btn_ord_step_3'));
      await tester.tap(actionBtn);
      await tester.pumpAndSettle();

      expect(mockOrderService.updateCalls.length, 1);
      expect(mockOrderService.updateCalls.first['status'], OrderStatus.arrivedAtCustomer);
    });

    testWidgets('Prompts cash confirmation dialog on terminal DELIVERED transition when payment is CASH', (tester) async {
      const order = OrderEntity(
        orderId: 'ord_cash_terminal',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        customerId: 'cust_1',
        customerName: 'Juan Pérez',
        customerPhone: '88888888',
        deliveryAddress: 'Colonia Centroamérica #45',
        assignedCourierId: 'courier_123',
        status: OrderStatus.arrivedAtCustomer,
        items: [],
        subtotal: 200.0,
        deliveryFee: 45.0,
        discount: 0.0,
        total: 245.0,
        paymentMethod: PaymentMethod.cash,
        isPaid: false,
        createdAt: 0,
        updatedAt: 0,
      );

      final mockOrderService = MockOrderService(assignedOrders: [order]);

      await tester.pumpWidget(
        MaterialApp(
          home: CourierDashboardScreen(
            sessionState: createCourierSession(),
            orderService: mockOrderService,
            tripService: MockTripService(),
            fleetService: MockFleetService(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('COBRAR C\$ 245 Y ENTREGAR 💵'), findsOneWidget);

      final actionBtn = find.byKey(const Key('courier_action_btn_ord_cash_terminal'));
      await tester.tap(actionBtn);
      await tester.pumpAndSettle();

      // Dialog should be open
      expect(find.text('Confirmar Cobro en Efectivo'), findsOneWidget);
      expect(find.text('C\$ 245'), findsWidgets);

      // Confirm delivery in dialog
      await tester.tap(find.text('Confirmar Entrega'));
      await tester.pumpAndSettle();

      expect(mockOrderService.updateCalls.length, 1);
      expect(mockOrderService.updateCalls.first['status'], OrderStatus.delivered);
    });
  });
}
