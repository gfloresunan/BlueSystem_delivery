/// BLUE SYSTEM DELIVERY ENTERPRISE — BLOQUE 5 TESTS
/// Protocol: BSD-FLUTTER-ANDROID-FULL-PARITY-001 (Phase 3 / Block 5)
/// Scope: Merchant Dashboard, KDS Kitchen Display System, Live Catalog & Store Hours.
/// Validates 1:1 Android parity against:
///   - com.example.presentation.business.BusinessDashboardScreen.kt
///   - com.example.presentation.business.orders.MerchantOperationsCenterScreen.kt
///   - com.example.presentation.business.menu.CategoryMenuScreen.kt

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/merchant/merchant_dashboard_screen.dart';

// ─── MOCK IMPLEMENTATIONS ───────────────────────────────────────────────────

class MockMerchantServiceForBlock5 implements IMerchantService {
  final List<ProductEntity> products;
  final BusinessEntity business;
  String? lastUpdatedProductId;
  String? lastUpdatedName;
  double? lastUpdatedPrice;

  MockMerchantServiceForBlock5({
    required this.products,
    required this.business,
  });

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) => Stream.value(business);

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) =>
      Stream.value(products);

  @override
  Future<void> updateProductQuick(
    String productId, {
    required String name,
    required double price,
  }) async {
    lastUpdatedProductId = productId;
    lastUpdatedName = name;
    lastUpdatedPrice = price;
  }

  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) => Stream.value([business]);
  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) => Stream.value(products);
  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) => Stream.value([]);
  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId}) async => products;
  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<BranchEntity>> watchAllBranches({required String tenantId}) => Stream.value([]);
  @override
  Stream<DashboardConfigEntity> watchDashboardConfig({String? tenantId}) =>
      Stream.value(const DashboardConfigEntity());
  @override
  Stream<List<FlashDealEntity>> watchFlashDeals({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchDiscountedProducts({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<CategoryEntity>> watchCategories({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<HomeEditorialAdEntity>> watchHomeEditorialAds({String? tenantId}) => Stream.value([]);
  @override
  Stream<List<HomeServiceCategoryEntity>> watchHomeServiceCategories({String? tenantId}) => Stream.value([]);
  @override
  Future<List<BusinessEntity>> getActiveBusinesses({String? tenantId}) async => [business];
}

class MockOrderServiceForBlock5 implements IOrderService {
  final List<OrderEntity> orders;
  String? lastUpdatedOrderId;
  OrderStatus? lastUpdatedStatus;

  MockOrderServiceForBlock5({required this.orders});

  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) =>
      Stream.value(orders);

  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    lastUpdatedOrderId = orderId;
    lastUpdatedStatus = status;
  }

  @override
  Future<OrderEntity?> getOrderById(String orderId) async => null;
  @override
  Stream<OrderEntity?> watchOrder(String orderId) => Stream.value(null);
  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) => Stream.value([]);
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'mock_ord';
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async => true;
}

class MockAuthServiceForBlock5 implements IAuthService {
  @override
  Stream<UserProfileEntity?> get authStateChanges => Stream.value(null);
  @override
  Future<UserProfileEntity?> getCurrentUser() async => null;
  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async => null;
  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async => throw UnimplementedError();
  @override
  Future<UserProfileEntity> registerWithEmailPassword({
    required String email,
    required String password,
    required String name,
    required String phone,
  }) async => throw UnimplementedError();
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

class MockPlatformServiceForBlock5
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

class MockSessionStateForBlock5 extends SessionState {
  final CanonicalCustomClaimsV3? _mockClaims;
  final UserProfileEntity? _mockUser;
  final bool _mockCanAccess;

  MockSessionStateForBlock5({
    CanonicalCustomClaimsV3? claims,
    UserProfileEntity? user,
    bool canAccess = true,
  })  : _mockClaims = claims,
        _mockUser = user,
        _mockCanAccess = canAccess,
        super(
          authService: MockAuthServiceForBlock5(),
          tenantService: MockPlatformServiceForBlock5(),
          brandService: MockPlatformServiceForBlock5(),
          subscriptionService: MockPlatformServiceForBlock5(),
          appConfigService: MockPlatformServiceForBlock5(),
        );

  @override
  CanonicalCustomClaimsV3? get claims => _mockClaims;
  @override
  UserProfileEntity? get currentUser => _mockUser;
  @override
  bool canAccess(String moduleKey) => _mockCanAccess;
}

// ─── TEST SUITE ─────────────────────────────────────────────────────────────

void main() {
  const testTenantId = 'ten_bluesystem_core';
  const testBusinessId = 'biz_fritoni_01';

  final sampleBusiness = BusinessEntity.fromMap({
    'businessId': testBusinessId,
    'name': 'Fritanga Fritoni Central',
    'address': 'Rotonda Cristo Rey 2c al sur',
    'phone': '2255-7788',
    'isOpen': true,
    'tenantId': testTenantId,
  }, testBusinessId);

  final sampleProducts = [
    ProductEntity.fromMap({
      'productId': 'prod_carne_asada',
      'businessId': testBusinessId,
      'name': 'Carne Asada Clásica',
      'description': 'Plato típico con tajadas, gallopinto y queso frito',
      'price': 220.0,
      'category': 'Carnes',
      'categoryName': 'Carnes',
      'isAvailable': true,
      'tenantId': testTenantId,
    }, 'prod_carne_asada'),
    ProductEntity.fromMap({
      'productId': 'prod_cerdo_asado',
      'businessId': testBusinessId,
      'name': 'Cerdo Asado Tipitapa',
      'description': 'Marinado en naranja agria y achiote',
      'price': 190.0,
      'category': 'Carnes',
      'categoryName': 'Carnes',
      'isAvailable': false,
      'tenantId': testTenantId,
    }, 'prod_cerdo_asado'),
    ProductEntity.fromMap({
      'productId': 'prod_cacao_leche',
      'businessId': testBusinessId,
      'name': 'Cacao con Leche Bien Helado',
      'description': 'Refresco tradicional 500ml',
      'price': 60.0,
      'category': 'Bebidas',
      'categoryName': 'Bebidas',
      'isAvailable': true,
      'tenantId': testTenantId,
    }, 'prod_cacao_leche'),
  ];

  final sampleOrders = [
    const OrderEntity(
      orderId: 'ORD-PENDING-101',
      tenantId: testTenantId,
      customerId: 'cust_01',
      customerName: 'Carlos Potosme',
      customerPhone: '8877-6655',
      businessId: testBusinessId,
      businessName: 'Fritanga Fritoni Central',
      deliveryAddress: 'Colonia Centroamérica casa #12',
      items: [
        OrderItemEntity(
          productId: 'prod_carne_asada',
          title: 'Carne Asada Clásica',
          quantity: 2,
          unitPrice: 220.0,
          subtotal: 440.0,
          notes: 'Carne bien cocida, tajadas bien tostadas',
        ),
      ],
      subtotal: 440.0,
      deliveryFee: 45.0,
      discount: 0.0,
      total: 485.0,
      status: OrderStatus.pending,
      paymentMethod: PaymentMethod.cash,
      isPaid: false,
      createdAt: 1000,
      updatedAt: 1000,
    ),
    const OrderEntity(
      orderId: 'ORD-PREPARING-202',
      tenantId: testTenantId,
      customerId: 'cust_02',
      customerName: 'Silvia Morales',
      customerPhone: '8999-1122',
      businessId: testBusinessId,
      businessName: 'Fritanga Fritoni Central',
      deliveryAddress: 'Altamira D’Este calle principal',
      items: [
        OrderItemEntity(
          productId: 'prod_cacao_leche',
          title: 'Cacao con Leche Bien Helado',
          quantity: 3,
          unitPrice: 60.0,
          subtotal: 180.0,
          notes: 'Con poco azúcar por favor',
        ),
      ],
      subtotal: 180.0,
      deliveryFee: 45.0,
      discount: 0.0,
      total: 225.0,
      status: OrderStatus.preparing,
      paymentMethod: PaymentMethod.cash,
      isPaid: false,
      createdAt: 1200,
      updatedAt: 1200,
    ),
    const OrderEntity(
      orderId: 'ORD-DELIVERED-303',
      tenantId: testTenantId,
      customerId: 'cust_03',
      customerName: 'Roberto Gómez',
      customerPhone: '8444-3322',
      businessId: testBusinessId,
      businessName: 'Fritanga Fritoni Central',
      deliveryAddress: 'Los Robles costado sur',
      items: [
        OrderItemEntity(
          productId: 'prod_carne_asada',
          title: 'Carne Asada Clásica',
          quantity: 1,
          unitPrice: 220.0,
          subtotal: 220.0,
        ),
      ],
      subtotal: 220.0,
      deliveryFee: 45.0,
      discount: 0.0,
      total: 265.0,
      status: OrderStatus.delivered,
      paymentMethod: PaymentMethod.cash,
      isPaid: true,
      createdAt: 800,
      updatedAt: 800,
    ),
  ];

  SessionState createMerchantSession() {
    return MockSessionStateForBlock5(
      user: const UserProfileEntity(
        uid: 'user_merchant_owner',
        email: 'owner@fritoni.com',
        displayName: 'Don Fritoni',
        role: EiamRole.owner,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      ),
      claims: const CanonicalCustomClaimsV3(
        role: EiamRole.owner,
        tenantId: testTenantId,
        businessId: testBusinessId,
      ),
    );
  }

  group('BLOQUE 5 — Subtask 1: Merchant Dashboard & Live KPIs (1:1 Android BusinessDashboardScreen.kt)', () {
    testWidgets('Renders KPI cards with today sales, active orders, and average ticket', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final session = createMerchantSession();
      final mockMerchant = MockMerchantServiceForBlock5(products: sampleProducts, business: sampleBusiness);
      final mockOrders = MockOrderServiceForBlock5(orders: sampleOrders);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDashboardScreen(
            sessionState: session,
            merchantService: mockMerchant,
            orderService: mockOrders,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Business Name & Live Operational Header
      expect(find.text('Fritanga Fritoni Central'), findsOneWidget);
      expect(find.text('ABIERTO AHORA'), findsOneWidget);
      expect(find.text('Tu local está recibiendo pedidos'), findsOneWidget);

      // Verify 4 KPI Cards
      expect(find.text('Métricas de Hoy'), findsOneWidget);
      expect(find.text('Ventas de Hoy'), findsOneWidget);
      // Completed order product subtotal is 220 (deliveryFee 45 is excluded per BSD-MERCHANT-ORDER-FINANCIAL-VISIBILITY)
      expect(find.text('C\$ 220'), findsWidgets);

      expect(find.text('Pedidos Activos'), findsOneWidget);
      // Active orders: pending (1) + preparing (1) = 2
      expect(find.text('2'), findsOneWidget);

      expect(find.text('Ticket Promedio'), findsOneWidget);
      expect(find.text('Total Pedidos'), findsOneWidget);
      // Total orders: 3
      expect(find.text('3'), findsOneWidget);

      // Verify Active Orders section in Dashboard
      expect(find.byKey(const Key('merchant_pending_orders_header_title')), findsOneWidget);
      expect(find.byKey(const Key('merchant_pending_orders_view_all_button')), findsOneWidget);
    });
  });

  group('BLOQUE 5 — Subtask 2: Kitchen Display System (KDS / Pantalla de Cocina)', () {
    testWidgets('Toggles KDS mode, displays comanda with kitchen notes, and advances kitchen lifecycle', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final session = createMerchantSession();
      final mockMerchant = MockMerchantServiceForBlock5(products: sampleProducts, business: sampleBusiness);
      final mockOrders = MockOrderServiceForBlock5(orders: sampleOrders);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDashboardScreen(
            sessionState: session,
            merchantService: mockMerchant,
            orderService: mockOrders,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Navigate to Pedidos Tab (index 1)
      await tester.tap(find.text('Pedidos'));
      await tester.pumpAndSettle();

      // Verify Orders filter chips are displayed
      expect(find.text('Todos (3)'), findsOneWidget);
      expect(find.text('Nuevos (1)'), findsOneWidget);
      expect(find.text('En Cocina'), findsOneWidget);
      expect(find.text('Esperando Repartidor'), findsOneWidget);

      // Verify KDS Kitchen Mode Toggle button is present
      final kdsToggleBtn = find.byKey(const Key('merchant_toggle_kitchen_mode_btn'));
      expect(kdsToggleBtn, findsOneWidget);
      expect(find.text('Modo Cocina'), findsOneWidget);

      // Activate KDS Modo Cocina
      await tester.tap(kdsToggleBtn);
      await tester.pumpAndSettle();

      // KDS Banner and Active status
      expect(find.text('KDS Activo'), findsOneWidget);
      expect(find.text('PANTALLA DE COCINA (KDS) — COMANDAS VISUALES'), findsOneWidget);

      // Check comanda item notes callout (Kitchen Notes)
      expect(find.byKey(const Key('kitchen_notes_box_prod_carne_asada')), findsOneWidget);
      expect(find.text('Nota cocina: Carne bien cocida, tajadas bien tostadas'), findsOneWidget);

      expect(find.byKey(const Key('kitchen_notes_box_prod_cacao_leche')), findsOneWidget);
      expect(find.text('Nota cocina: Con poco azúcar por favor'), findsOneWidget);

      // KDS Action 1: Pending order -> Accept & Send to Kitchen
      final prepareBtn = find.byKey(const Key('merchant_order_prepare_btn_ORD-PENDING-101'));
      expect(prepareBtn, findsOneWidget);
      expect(find.text('COCINAR PEDIDO 👨‍🍳'), findsOneWidget);

      await tester.tap(prepareBtn);
      await tester.pumpAndSettle();

      expect(mockOrders.lastUpdatedOrderId, equals('ORD-PENDING-101'));
      expect(mockOrders.lastUpdatedStatus, equals(OrderStatus.preparing));

      // KDS Action 2: Preparing order -> Mark Ready for Courier Pickup
      final readyBtn = find.byKey(const Key('merchant_order_ready_btn_ORD-PREPARING-202'));
      expect(readyBtn, findsOneWidget);
      expect(find.text('PLATO LISTO PARA DESPACHO 🔔'), findsOneWidget);

      await tester.tap(readyBtn);
      await tester.pumpAndSettle();

      expect(mockOrders.lastUpdatedOrderId, equals('ORD-PREPARING-202'));
      expect(mockOrders.lastUpdatedStatus, equals(OrderStatus.readyForPickup));
    });
  });

  group('BLOQUE 5 — Subtask 3: Real-time Catalog & Menu Management (1:1 Android CategoryMenuScreen.kt)', () {
    testWidgets('Lists catalog products, filters by category, toggles availability, and updates price/name via Quick Edit', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final session = createMerchantSession();
      final mockMerchant = MockMerchantServiceForBlock5(products: sampleProducts, business: sampleBusiness);
      final mockOrders = MockOrderServiceForBlock5(orders: sampleOrders);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDashboardScreen(
            sessionState: session,
            merchantService: mockMerchant,
            orderService: mockOrders,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Navigate to Menú Tab (index 2)
      await tester.tap(find.text('Menú'));
      await tester.pumpAndSettle();

      // Verify Products are listed
      expect(find.text('Carne Asada Clásica'), findsOneWidget);
      expect(find.text('Cerdo Asado Tipitapa'), findsOneWidget);
      expect(find.text('Cacao con Leche Bien Helado'), findsOneWidget);

      // Verify Category Filters (Carnes, Bebidas)
      expect(find.byKey(const Key('menu_category_filter_TODAS')), findsOneWidget);
      expect(find.byKey(const Key('menu_category_filter_Carnes')), findsOneWidget);
      expect(find.byKey(const Key('menu_category_filter_Bebidas')), findsOneWidget);

      // Filter by Bebidas
      await tester.tap(find.byKey(const Key('menu_category_filter_Bebidas')));
      await tester.pumpAndSettle();

      expect(find.text('Cacao con Leche Bien Helado'), findsOneWidget);
      expect(find.text('Carne Asada Clásica'), findsNothing);

      // Return to TODAS
      await tester.tap(find.byKey(const Key('menu_category_filter_TODAS')));
      await tester.pumpAndSettle();

      expect(find.text('Carne Asada Clásica'), findsOneWidget);

      // Verify availability switch keys
      final switchCarne = find.byKey(const Key('product_availability_switch_prod_carne_asada'));
      expect(switchCarne, findsOneWidget);

      // Toggle product availability
      await tester.tap(switchCarne);
      await tester.pumpAndSettle();

      // Quick Edit Product Modal
      final quickEditBtn = find.byKey(const Key('quick_edit_btn_prod_carne_asada'));
      expect(quickEditBtn, findsOneWidget);

      await tester.tap(quickEditBtn);
      await tester.pumpAndSettle();

      // Verify Quick Edit Dialog
      expect(find.text('Edición Rápida'), findsOneWidget);
      expect(find.byKey(const Key('quick_edit_name_field')), findsOneWidget);
      expect(find.byKey(const Key('quick_edit_price_field')), findsOneWidget);

      // Enter new name and price
      await tester.enterText(find.byKey(const Key('quick_edit_name_field')), 'Carne Asada Especial Fritoni');
      await tester.enterText(find.byKey(const Key('quick_edit_price_field')), '250');
      await tester.pumpAndSettle();

      // Save
      await tester.tap(find.byKey(const Key('quick_edit_save_btn')));
      await tester.pumpAndSettle();

      // Verify service called with updated values
      expect(mockMerchant.lastUpdatedProductId, equals('prod_carne_asada'));
      expect(mockMerchant.lastUpdatedName, equals('Carne Asada Especial Fritoni'));
      expect(mockMerchant.lastUpdatedPrice, equals(250.0));
      expect(find.text('✅ Producto "Carne Asada Especial Fritoni" actualizado a C\$ 250'), findsOneWidget);
    });
  });

  group('BLOQUE 5 — Subtask 4: Store Operational Status (Apertura / Cierre del Local)', () {
    testWidgets('Toggles store status between open and closed with live UI feedback', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final session = createMerchantSession();
      final mockMerchant = MockMerchantServiceForBlock5(products: sampleProducts, business: sampleBusiness);
      final mockOrders = MockOrderServiceForBlock5(orders: sampleOrders);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDashboardScreen(
            sessionState: session,
            merchantService: mockMerchant,
            orderService: mockOrders,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Initially open
      expect(find.text('ABIERTO AHORA'), findsOneWidget);
      expect(find.text('Abierto'), findsOneWidget);

      final statusSwitch = find.byKey(const Key('merchant_store_status_switch'));
      expect(statusSwitch, findsOneWidget);

      // Toggle store closed
      await tester.tap(statusSwitch);
      await tester.pumpAndSettle();

      expect(find.text('CERRADO'), findsOneWidget);
      expect(find.text('Cerrado'), findsOneWidget);
      expect(find.text('Recepción de pedidos pausada'), findsOneWidget);

      // Toggle store open again
      await tester.tap(statusSwitch);
      await tester.pumpAndSettle();

      expect(find.text('ABIERTO AHORA'), findsOneWidget);
      expect(find.text('Abierto'), findsOneWidget);
      expect(find.text('Tu local está recibiendo pedidos'), findsOneWidget);
    });
  });
}
