/// BLUE SYSTEM DELIVERY ENTERPRISE — MERCHANT FINANCIAL PARITY CONTRACT TEST
/// BSD-MERCHANT-ORDER-FINANCIAL-VISIBILITY-RESPONSIVE-UX-001 (ADR-019)
/// 1:1 Parity between Android (MerchantOrder.kt / MerchantOrdersViewModel.kt) and iOS Flutter.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/merchant/merchant_dashboard_screen.dart';

class MockMerchantTestService implements IMerchantService {
  final BusinessEntity business;

  MockMerchantTestService(this.business);

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) => Stream.value(business);

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) => Stream.value([]);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class MockOrderTestService implements IOrderService {
  final List<OrderEntity> orders;

  MockOrderTestService(this.orders);

  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) {
    return Stream.value(orders);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class DummyAuthService implements IAuthService {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class DummyPlatformService implements ITenantService, IBrandService, ISubscriptionService, IAppConfigService {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class MockTestSessionState extends SessionState {
  final CanonicalCustomClaimsV3? _mockClaims;
  final UserProfileEntity? _mockUser;

  MockTestSessionState({
    CanonicalCustomClaimsV3? claims,
    UserProfileEntity? user,
  })  : _mockClaims = claims,
        _mockUser = user,
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
  bool canAccess(String moduleKey) => true;
}

void main() {
  group('BSD-MERCHANT-ORDER-FINANCIAL-VISIBILITY Parity Tests', () {
    test('OrderEntity.productSubtotal isolates net merchant product value from customer total', () {
      // Pedido con items C$ 300, descuento C$ 50, deliveryFee C$ 60, tip C$ 20 -> Total cliente = C$ 330
      final orderWithGross = OrderEntity.fromMap({
        'subtotal': 300.0,
        'discount': 50.0,
        'merchantGrossSales': 250.0,
        'deliveryFee': 60.0,
        'courierTip': 20.0,
        'total': 330.0,
        'items': [
          {'name': 'Producto A', 'price': 150.0, 'quantity': 2, 'subtotal': 300.0}
        ],
      }, 'ord_001');

      expect(orderWithGross.total, 330.0);
      expect(orderWithGross.merchantGrossSales, 250.0);
      expect(orderWithGross.productSubtotal, 250.0); // Prioridad Canónica 1
    });

    test('OrderEntity.productSubtotal falls back to subtotal - discount when grossSales not present', () {
      final orderSubtotal = OrderEntity.fromMap({
        'subtotal': 400.0,
        'discount': 30.0,
        'deliveryFee': 50.0,
        'total': 420.0,
        'items': [],
      }, 'ord_002');

      expect(orderSubtotal.total, 420.0);
      expect(orderSubtotal.productSubtotal, 370.0); // 400 - 30
    });

    test('OrderEntity.productSubtotal granular item sum fallback', () {
      final orderGranular = OrderEntity.fromMap({
        'subtotal': 0.0,
        'discount': 20.0,
        'deliveryFee': 40.0,
        'total': 220.0,
        'items': [
          {'name': 'Item 1', 'price': 100.0, 'quantity': 2} // 200
        ],
      }, 'ord_003');

      expect(orderGranular.productSubtotal, 180.0); // 200 - 20
    });
  });

  group('MerchantDashboardScreen Financial & Branding Widget Parity Tests', () {
    testWidgets('Dashboard renders productSubtotal in Ventas de Hoy and Order Tiles', (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1400));

      final testBiz = BusinessEntity.fromMap({
        'businessId': 'biz_tecno',
        'name': 'TecnoStore Managua',
        'category': 'Tecnología',
        'logoUrl': '',
        'isOpen': true,
        'tenantId': 'ten_bluesystem_core',
      }, 'biz_tecno');

      // Pedido entregado: valor productos C$ 250, pero total cliente C$ 330
      final deliveredOrder = OrderEntity.fromMap({
        'status': 'DELIVERED',
        'subtotal': 300.0,
        'discount': 50.0,
        'merchantGrossSales': 250.0,
        'deliveryFee': 60.0,
        'courierTip': 20.0,
        'total': 330.0,
        'paymentMethod': 'CASH',
        'items': [
          {'name': 'Mouse Inalámbrico', 'price': 300.0, 'quantity': 1, 'subtotal': 300.0}
        ],
      }, 'ord_deliv');

      // Pedido activo: valor productos C$ 150
      final activeOrder = OrderEntity.fromMap({
        'status': 'PENDING',
        'subtotal': 150.0,
        'discount': 0.0,
        'merchantGrossSales': 150.0,
        'deliveryFee': 40.0,
        'total': 190.0,
        'paymentMethod': 'CASH',
        'items': [
          {'name': 'Cable USB-C', 'price': 150.0, 'quantity': 1, 'subtotal': 150.0}
        ],
      }, 'ord_active');

      final session = MockTestSessionState(
        claims: const CanonicalCustomClaimsV3(
          role: EiamRole.owner,
          tenantId: 'ten_bluesystem_core',
          businessId: 'biz_tecno',
        ),
        user: const UserProfileEntity(
          uid: 'usr_merchant',
          email: 'merchant@test.com',
          role: EiamRole.owner,
          displayName: 'Propietario Tecno',
          isVerified: true,
          createdAt: 1000,
          updatedAt: 1000,
        ),
      );

      final merchantService = MockMerchantTestService(testBiz);
      final orderService = MockOrderTestService([deliveredOrder, activeOrder]);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDashboardScreen(
            sessionState: session,
            merchantService: merchantService,
            orderService: orderService,
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // 1. Verificar Header con categoría de Tecnología (Emoji 💻) y Nombre
      expect(find.text('💻'), findsOneWidget);
      expect(find.text('TecnoStore Managua'), findsOneWidget);

      // 2. Verificar KPI "Ventas de Hoy" y "Ticket Promedio": Deben ser C$ 250 (productSubtotal), NO C$ 330 (cliente total)
      expect(find.text('Ventas de Hoy'), findsOneWidget);
      expect(find.text('Ticket Promedio'), findsOneWidget);
      expect(find.text('C\$ 250'), findsNWidgets(2));

      // 3. Verificar Pedido Activo en Lista: Debe reflejar Valor Productos
      expect(find.text('💰 C\$ 150'), findsOneWidget);
      expect(find.text('Valor Productos (CASH):'), findsOneWidget);
      expect(find.text('C\$ 150'), findsWidgets);
    });
  });
}
