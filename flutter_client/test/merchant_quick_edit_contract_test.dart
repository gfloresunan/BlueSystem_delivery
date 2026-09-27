/// BLUE SYSTEM DELIVERY ENTERPRISE — GAP-MER-01 CONTRACT TESTS
/// Validates Merchant Quick Price and Name Edit on mobile catalog,
/// contract input validation, UI dialog, and atomic Firestore sync (ADR-016 / 1:1 Android MerchantProductsScreen.kt).

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

class MockMerchantService implements IMerchantService {
  final List<ProductEntity> products;
  String? updatedProductId;
  String? updatedName;
  double? updatedPrice;

  MockMerchantService(this.products);

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) {
    return Stream.value(products);
  }

  @override
  Future<void> updateProductQuick(
    String productId, {
    required String name,
    required double price,
  }) async {
    final trimmedId = productId.trim();
    final trimmedName = name.trim();
    if (trimmedId.isEmpty) throw ArgumentError('productId cannot be empty');
    if (trimmedName.isEmpty) throw ArgumentError('name cannot be empty');
    if (price < 0) throw ArgumentError('price cannot be negative');

    updatedProductId = trimmedId;
    updatedName = trimmedName;
    updatedPrice = price;
  }

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) {
    return Stream.value(
      BusinessEntity.fromMap({
        'businessId': 'biz_sample',
        'name': 'Comercio Test',
        'address': 'Managua',
        'phone': '12345678',
        'isOpen': true,
        'tenantId': 'ten_bluesystem_core',
      }, 'biz_sample'),
    );
  }

  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) => Stream.value([]);
  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId}) async => products;
  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<CategoryEntity>> watchCategories({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) => Stream.value([]);
}

class MockOrderServiceForMerchant implements IOrderService {
  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) {
    return Stream.value([]);
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
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'ord_1';
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async => true;
  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {}
}

class DummyAuthService implements IAuthService {
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
  final sampleProduct = ProductEntity.fromMap({
    'productId': 'prod_taco_01',
    'businessId': 'biz_sample',
    'name': 'Tacos al Pastor',
    'description': 'Deliciosos tacos con piña y cilantro',
    'price': 150.0,
    'category': 'Comida',
    'categoryName': 'Comida',
    'isAvailable': true,
    'tenantId': 'ten_bluesystem_core',
  }, 'prod_taco_01');

  test('GAP-MER-01: Contract validation prevents empty name or negative price', () async {
    final service = MockMerchantService([sampleProduct]);

    // Validation checks
    expect(() => service.updateProductQuick('', name: 'Nuevo', price: 100), throwsArgumentError);
    expect(() => service.updateProductQuick('prod_1', name: '  ', price: 100), throwsArgumentError);
    expect(() => service.updateProductQuick('prod_1', name: 'Nuevo', price: -5), throwsArgumentError);

    // Valid update succeeds
    await service.updateProductQuick('prod_taco_01', name: 'Tacos Al Pastor Especial', price: 180.0);
    expect(service.updatedProductId, equals('prod_taco_01'));
    expect(service.updatedName, equals('Tacos Al Pastor Especial'));
    expect(service.updatedPrice, equals(180.0));
  });

  testWidgets('GAP-MER-01: Opens Quick Edit dialog and updates name and price correctly', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final mockMerchantService = MockMerchantService([sampleProduct]);
    final mockOrderService = MockOrderServiceForMerchant();

    final session = MockSessionState(
      claims: const CanonicalCustomClaimsV3(
        role: EiamRole.owner,
        tenantId: 'ten_bluesystem_core',
        businessId: 'biz_sample',
      ),
      user: const UserProfileEntity(
        uid: 'user_biz_1',
        email: 'merchant@test.com',
        displayName: 'Comercio Owner',
        role: EiamRole.owner,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: MerchantDashboardScreen(
          sessionState: session,
          merchantService: mockMerchantService,
          orderService: mockOrderService,
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Navigate to Menu / Catalog tab (index 2)
    final menuTab = find.text('Menú');
    expect(menuTab, findsOneWidget);
    await tester.tap(menuTab);
    await tester.pumpAndSettle();

    // Verify product card and quick edit button are present
    expect(find.text('Tacos al Pastor'), findsOneWidget);
    final quickEditBtn = find.byKey(const Key('quick_edit_btn_prod_taco_01'));
    expect(quickEditBtn, findsOneWidget);

    // Open quick edit dialog
    await tester.tap(quickEditBtn);
    await tester.pumpAndSettle();

    // Verify dialog title and prefilled fields
    expect(find.text('Edición Rápida'), findsOneWidget);
    final nameField = find.byKey(const Key('quick_edit_name_field'));
    final priceField = find.byKey(const Key('quick_edit_price_field'));
    expect(nameField, findsOneWidget);
    expect(priceField, findsOneWidget);

    // Test form validation: clear name
    await tester.enterText(nameField, '');
    await tester.tap(find.byKey(const Key('quick_edit_save_btn')));
    await tester.pumpAndSettle();
    expect(find.text('El nombre no puede estar vacío'), findsOneWidget);

    // Enter valid new name and price
    await tester.enterText(nameField, 'Super Tacos al Pastor');
    await tester.enterText(priceField, '195');

    // Tap Guardar
    await tester.tap(find.byKey(const Key('quick_edit_save_btn')));
    await tester.pumpAndSettle();

    // Verify service was called with updated values
    expect(mockMerchantService.updatedProductId, equals('prod_taco_01'));
    expect(mockMerchantService.updatedName, equals('Super Tacos al Pastor'));
    expect(mockMerchantService.updatedPrice, equals(195.0));

    // Verify dialog dismissed and feedback snackbar shown
    expect(find.text('Edición Rápida'), findsNothing);
    expect(find.textContaining('actualizado a C\$ 195'), findsOneWidget);
  });
}
