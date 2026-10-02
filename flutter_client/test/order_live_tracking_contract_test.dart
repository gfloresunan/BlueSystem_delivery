/// BLUE SYSTEM DELIVERY ENTERPRISE — GAP-TRK-01 CONTRACT TESTS
/// Validates Live Order Tracking, Courier GPS telemetry (/ubicaciones_repartidores/{courierId}),
/// Origin/Destination markers, and live status stepper (1:1 Android OrderDetailScreen.kt).

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/orders/orders_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/orders/order_live_tracking_screen.dart';

class MockOrderService implements IOrderService {
  final OrderEntity order;

  MockOrderService(this.order);

  @override
  Stream<OrderEntity?> watchOrder(String orderId) => Stream.value(order);

  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) =>
      Stream.value([order]);

  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) => Stream.value([]);
  @override
  Future<OrderEntity?> getOrderById(String orderId) async => order;
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => order.orderId;
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async => true;
  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {}
}

class MockFleetService implements IFleetService {
  final StreamController<CourierLocationEntity?> _courierController =
      StreamController<CourierLocationEntity?>.broadcast();

  void emitLocation(CourierLocationEntity? loc) => _courierController.add(loc);

  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) {
    return _courierController.stream;
  }

  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) => Stream.value([]);

  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}

  void dispose() {
    _courierController.close();
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

SessionState createCustomerSession() {
  final session = MockSessionState();
  session.currentUser = const UserProfileEntity(
    uid: 'cust_999',
    email: 'cliente@bluesystem.com',
    displayName: 'Carlos Cliente',
    role: EiamRole.client,
    activeTenantId: 'ten_core',
    isVerified: true,
    createdAt: 0,
    updatedAt: 0,
  );
  session.claims = const CanonicalCustomClaimsV3(
    role: EiamRole.client,
    tenantId: 'ten_core',
  );
  return session;
}

void main() {
  group('GAP-TRK-01: Live Order Tracking Domain & Markers Contract Tests', () {
    test('CourierLocationEntity accurately evaluates freshness threshold (ADR-016)', () {
      final nowMs = DateTime.now().millisecondsSinceEpoch;

      final freshLoc = CourierLocationEntity(
        courierId: 'courier_1',
        latitude: 12.1364,
        longitude: -86.2514,
        timestamp: nowMs - (2 * 60 * 1000), // 2 minutes ago
        isOnline: true,
        speed: 8.5, // m/s = 30.6 km/h
      );

      expect(freshLoc.isFresh, true);
      expect(freshLoc.speedKmh, closeTo(30.6, 0.1));

      final staleLoc = CourierLocationEntity(
        courierId: 'courier_2',
        latitude: 12.1364,
        longitude: -86.2514,
        timestamp: nowMs - (15 * 60 * 1000), // 15 minutes ago (> 10 min threshold)
        isOnline: true,
      );

      expect(staleLoc.isFresh, false);
    });

    test('OrderEntity contains merchant and delivery coordinates for dual markers', () {
      final orderData = {
        'orderId': 'ord_geo_1',
        'tenantId': 'ten_core',
        'businessId': 'biz_pizza',
        'businessName': 'Pizzería Napolitana',
        'deliveryAddress': 'De la Rotonda 2c al Norte',
        'deliveryLat': 12.1450,
        'deliveryLng': -86.2620,
        'merchantLat': 12.1380,
        'merchantLng': -86.2540,
        'assignedCourierId': 'courier_88',
        'status': 'DISPATCHED',
      };

      final order = OrderEntity.fromMap(orderData, 'ord_geo_1');
      expect(order.businessName, 'Pizzería Napolitana');
      expect(order.merchantLat, 12.1380);
      expect(order.merchantLng, -86.2540);
      expect(order.deliveryLat, 12.1450);
      expect(order.deliveryLng, -86.2620);
      expect(order.assignedCourierId, 'courier_88');
      expect(order.status, OrderStatus.dispatched);
    });
  });

  group('GAP-TRK-01: Live Order Tracking Screen Widget Tests', () {
    testWidgets('Displays Live Tracking Screen with Stepper, Telemetry Badge, and Order Details', (tester) async {
      const order = OrderEntity(
        orderId: 'ord_tracking_test',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        businessName: 'Hamburguesas Rock',
        customerId: 'cust_999',
        customerName: 'Carlos Cliente',
        customerPhone: '88888888',
        deliveryAddress: 'Residencial Las Colinas #12',
        deliveryLat: 12.1450,
        deliveryLng: -86.2620,
        merchantLat: 12.1380,
        merchantLng: -86.2540,
        assignedCourierId: 'courier_88',
        status: OrderStatus.dispatched,
        items: [
          OrderItemEntity(productId: 'p1', title: 'Hamburguesa Doble', quantity: 2, unitPrice: 120.0, subtotal: 240.0),
        ],
        subtotal: 240.0,
        deliveryFee: 45.0,
        discount: 0.0,
        total: 285.0,
        paymentMethod: PaymentMethod.card,
        isPaid: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final mockOrderService = MockOrderService(order);
      final mockFleetService = MockFleetService();

      await tester.pumpWidget(
        MaterialApp(
          home: OrderLiveTrackingScreen(
            initialOrder: order,
            orderService: mockOrderService,
            fleetService: mockFleetService,
            onBack: () {},
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Header title and order code
      expect(find.text('Seguimiento en Vivo 🛵'), findsOneWidget);
      expect(find.text('Pedido #ORD_TRAC'), findsOneWidget);

      // Top Stepper states
      expect(find.text('Confirmado'), findsOneWidget);
      expect(find.text('En Cocina'), findsOneWidget);
      expect(find.text('En Camino'), findsOneWidget);
      expect(find.text('Entregado'), findsOneWidget);

      // Bottom Info Card
      expect(find.text('Hamburguesas Rock'), findsOneWidget);
      expect(find.text('1 artículo(s) • Total: C\$ 285'), findsOneWidget);
      expect(find.text('Residencial Las Colinas #12'), findsOneWidget);

      // Initially, courier location hasn't emitted, so shows 'Conectando GPS...'
      expect(find.text('Conectando GPS...'), findsOneWidget);

      // Now emit fresh courier location
      mockFleetService.emitLocation(
        CourierLocationEntity(
          courierId: 'courier_88',
          latitude: 12.1400,
          longitude: -86.2580,
          speed: 8.5, // 30.6 km/h
          timestamp: DateTime.now().millisecondsSinceEpoch,
          isOnline: true,
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Telemetry badge should now say 'GPS En Vivo'
      expect(find.text('GPS En Vivo'), findsOneWidget);
      expect(find.text('⚡ ~30 km/h'), findsOneWidget);

      mockFleetService.dispose();
    });

    testWidgets('OrdersScreen provides navigation button to open Live Tracking Screen', (tester) async {
      const order = OrderEntity(
        orderId: 'ord_list_1',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        businessName: 'Tacos Express',
        customerId: 'cust_999',
        customerName: 'Carlos Cliente',
        customerPhone: '88888888',
        deliveryAddress: 'Rotonda Metrocentro 1c Abajo',
        assignedCourierId: 'courier_88',
        status: OrderStatus.dispatched,
        items: [],
        subtotal: 150.0,
        deliveryFee: 45.0,
        discount: 0.0,
        total: 195.0,
        paymentMethod: PaymentMethod.cash,
        isPaid: false,
        createdAt: 0,
        updatedAt: 0,
      );

      final mockOrderService = MockOrderService(order);
      final mockFleetService = MockFleetService();

      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: OrdersScreen(
            sessionState: createCustomerSession(),
            orderService: mockOrderService,
            fleetService: mockFleetService,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Tap on order card to open detail sheet
      final cardFinder = find.byKey(const Key('order_card_ord_list_1'));
      expect(cardFinder, findsOneWidget);
      await tester.tap(cardFinder);
      await tester.pumpAndSettle();

      // Button to open Live Tracking should be present
      final trackingBtn = find.byKey(const Key('open_live_tracking_ord_list_1'));
      expect(trackingBtn, findsOneWidget);
      expect(find.text('Ver Seguimiento en Vivo 🛵'), findsOneWidget);

      // Tap tracking button
      await tester.tap(trackingBtn);
      await tester.pumpAndSettle();

      // OrderLiveTrackingScreen should now be in tree
      expect(find.byType(OrderLiveTrackingScreen), findsOneWidget);

      mockFleetService.dispose();
    });
  });
}
