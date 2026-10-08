/// BLUE SYSTEM DELIVERY ENTERPRISE — BLOQUE 2 CONTRACT & PARITY TESTS
/// Validates:
/// 1. Product Options / Variants Dialog with Kitchen Notes (ComercioDetalleScreen.kt parity)
/// 2. AddressManagerScreen Full-Screen CRUD & Default Toggle (AddressManagerScreen.kt parity)
/// 3. Saved Address Quick-Select in Cart Checkout (CheckoutStepContent.kt parity)
/// 4. Order Live Tracking Screen Telemetry (OrderDetailScreen.kt parity)

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/design_system/buttons/bs_buttons.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/courier_location_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/order_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/saved_address_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/dialogs/product_options_dialog.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/address/address_manager_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/orders/order_live_tracking_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/shell/app_shell.dart';

// ─── MOCKS ───────────────────────────────────────────────────────────────────

class MockUserService implements IUserService {
  final List<SavedAddressEntity> _addresses;
  final StreamController<List<SavedAddressEntity>> _addressController =
      StreamController<List<SavedAddressEntity>>.broadcast();

  SavedAddressEntity? lastSavedAddress;
  String? lastDefaultAddressId;
  String? lastDeletedAddressId;

  MockUserService({List<SavedAddressEntity>? initialAddresses})
      : _addresses = initialAddresses != null ? List.from(initialAddresses) : [] {
    _addressController.add(_addresses);
  }

  @override
  Stream<UserProfileEntity?> watchProfile(String uid) => Stream.value(
        UserProfileEntity(
          uid: uid,
          email: 'cliente@bluesystem.com',
          displayName: 'Carlos Cliente',
          role: EiamRole.client,
          phoneNumber: '+50588889999',
          isVerified: true,
          createdAt: 0,
          updatedAt: 0,
        ),
      );

  @override
  Future<void> updateProfile(String uid, {required String displayName, String? phoneNumber}) async {}

  @override
  Stream<List<SavedAddressEntity>> watchAddresses(String uid) async* {
    yield List<SavedAddressEntity>.from(_addresses);
    yield* _addressController.stream;
  }

  @override
  Future<void> saveAddress(String uid, SavedAddressEntity address) async {
    lastSavedAddress = address;
    _addresses.removeWhere((a) => a.id == address.id);
    _addresses.add(address);
    _addressController.add(_addresses);
  }

  @override
  Future<void> setDefaultAddress(String uid, String addressId) async {
    lastDefaultAddressId = addressId;
    for (int i = 0; i < _addresses.length; i++) {
      final a = _addresses[i];
      _addresses[i] = a.copyWith(isDefault: a.id == addressId);
    }
    _addressController.add(_addresses);
  }

  @override
  Future<void> deleteAddress(String uid, String addressId) async {
    lastDeletedAddressId = addressId;
    _addresses.removeWhere((a) => a.id == addressId);
    _addressController.add(_addresses);
  }

  @override
  Stream<Set<String>> watchFavoriteBusinessIds(String uid) => Stream.value(<String>{});

  @override
  Future<void> toggleFavoriteBusiness(String uid, String businessId, {String? businessName}) async {}

  void dispose() {
    _addressController.close();
  }
}

class MockMerchantService implements IMerchantService {
  final BusinessEntity? business;
  final List<ProductEntity> products;

  MockMerchantService({this.business, this.products = const []});

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) => Stream.value(business);
  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) => Stream.value(products);
  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) => Stream.value(products);
  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<BranchEntity>> watchAllBranches({required String tenantId}) => Stream.value([]);
  @override
  Stream<DashboardConfigEntity> watchDashboardConfig({String? tenantId}) => Stream.value(const DashboardConfigEntity());
  @override
  Stream<List<FlashDealEntity>> watchFlashDeals({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchDiscountedProducts({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<CategoryEntity>> watchCategories({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) => Stream.value([]);
  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId}) async => products;
  @override
  Future<void> updateProductQuick(String productId, {required String name, required double price}) async {}
  @override
  Stream<List<HomeEditorialAdEntity>> watchHomeEditorialAds({String? tenantId}) => Stream.value([]);
  @override
  Stream<List<HomeServiceCategoryEntity>> watchHomeServiceCategories({String? tenantId}) => Stream.value([]);
  @override
  Future<List<BusinessEntity>> getActiveBusinesses({String? tenantId}) async => business != null ? [business!] : [];
}

class MockOrderService implements IOrderService {
  final StreamController<OrderEntity?> _orderController = StreamController<OrderEntity?>.broadcast();
  OrderEntity? initialOrder;

  MockOrderService({this.initialOrder}) {
    if (initialOrder != null) _orderController.add(initialOrder);
  }

  @override
  Stream<OrderEntity?> watchOrder(String orderId) => _orderController.stream;
  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) =>
      Stream.value(initialOrder != null ? [initialOrder!] : []);
  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) => Stream.value([]);
  @override
  Future<OrderEntity?> getOrderById(String orderId) async => initialOrder;
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'ORD-TEST-999';
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async => true;
  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {}

  void emitOrder(OrderEntity order) => _orderController.add(order);
  void dispose() => _orderController.close();
}

class MockFleetService implements IFleetService {
  final StreamController<CourierLocationEntity?> _courierController =
      StreamController<CourierLocationEntity?>.broadcast();

  void emitCourierLocation(CourierLocationEntity loc) => _courierController.add(loc);

  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) => _courierController.stream;
  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) => Stream.value([]);
  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}

  void dispose() => _courierController.close();
}

class DummyTripService implements ITripService {
  @override
  Stream<List<TripEntity>> watchCustomerTrips(String customerId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<TripEntity>> watchCourierAssignedTrips(String courierId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<TripEntity>> watchEligibleTrips({required String tenantId}) => Stream.value([]);
  @override
  Future<TripEntity?> getTripById(String tripId) async => null;
  @override
  Stream<TripEntity?> watchTrip(String tripId) => Stream.value(null);
  @override
  Future<String> createTrip(Map<String, dynamic> tripData) async => 'trip_1';
  @override
  Future<bool> claimTripAtomically(String tripId, String courierId, String courierName) async => true;
  @override
  Future<void> updateTripStatus(String tripId, TripStatus status) async {}
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
  }) async => null;
}

class MockSessionState extends SessionState {
  final CanonicalCustomClaimsV3? _mockClaims;
  final UserProfileEntity? _mockUser;
  final bool _mockCanAccess;

  MockSessionState({
    CanonicalCustomClaimsV3? claims,
    UserProfileEntity? user,
    bool canAccess = true,
  })  : _mockClaims = claims,
        _mockUser = user,
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
  bool canAccess(String moduleKey) => _mockCanAccess;
  @override
  bool get isGuestMode => false;
  @override
  AuthStatus get status => AuthStatus.authenticated;
  @override
  bool get isAuthenticated => true;
}

// ─── MAIN TEST SUITE ─────────────────────────────────────────────────────────

void main() {
  group('BLOQUE 2: Product Options & Variants Modal with Kitchen Notes', () {
    testWidgets('Validates required options, adds kitchen notes, and accumulates prices', (tester) async {
      ProductEntity? capturedProduct;
      String? capturedBusiness;

      const product = ProductEntity(
        productId: 'prod_pizza_artesanal',
        tenantId: 'ten_core',
        businessId: 'biz_pizza_hut',
        name: 'Pizza Suprema Especial',
        description: 'Pizza con pepperoni, champiñones y pimientos',
        price: 220.0,
        category: 'Pizzas',
        createdAt: 0,
        updatedAt: 0,
        optionGroups: [
          {
            'id': 'grp_tamano',
            'name': 'Tamaño',
            'isRequired': true,
            'maxSelection': 1,
            'options': [
              {'id': 'opt_mediana', 'name': 'Mediana (8 Porciones)', 'additionalPrice': 0.0, 'isDefault': true},
              {'id': 'opt_familiar', 'name': 'Familiar (12 Porciones)', 'additionalPrice': 90.0},
            ],
          },
          {
            'id': 'grp_extras',
            'name': 'Ingredientes Extra',
            'isRequired': false,
            'maxSelection': 2,
            'options': [
              {'id': 'opt_queso_extra', 'name': 'Queso Extra', 'additionalPrice': 35.0},
              {'id': 'opt_tocino', 'name': 'Tocino', 'additionalPrice': 45.0},
            ],
          },
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (ctx) => ElevatedButton(
                key: const Key('open_options_btn'),
                onPressed: () {
                  showProductOptionsBottomSheet(
                    context: ctx,
                    product: product,
                    businessName: 'Pizza Hut Centroamérica',
                    onAddToCart: (prod, biz) {
                      capturedProduct = prod;
                      capturedBusiness = biz;
                    },
                  );
                },
                child: const Text('Abrir Opciones'),
              ),
            ),
          ),
        ),
      );

      // Open bottom sheet
      await tester.tap(find.byKey(const Key('open_options_btn')));
      await tester.pumpAndSettle();

      // Check header info
      expect(find.text('Pizza Suprema Especial'), findsOneWidget);
      expect(find.text('Precio Base: C\$ 220'), findsOneWidget);
      expect(find.text('Obligatorio'), findsOneWidget);
      expect(find.text('Opcional'), findsOneWidget);

      // Default option is selected (Mediana 0.0) -> current total is 220
      expect(find.text('Agregar al Carrito • C\$ 220'), findsOneWidget);

      // Select "Familiar" (+C$ 90)
      await tester.tap(find.byKey(const Key('option_opt_familiar')));
      await tester.pumpAndSettle();
      expect(find.text('Agregar al Carrito • C\$ 310'), findsOneWidget);

      // Select "Queso Extra" (+C$ 35)
      await tester.tap(find.byKey(const Key('option_opt_queso_extra')));
      await tester.pumpAndSettle();
      expect(find.text('Agregar al Carrito • C\$ 345'), findsOneWidget);

      // Enter kitchen notes
      await tester.enterText(
        find.byKey(const Key('product_options_notes_field')),
        'Por favor masa bien tostada y orilla crujiente',
      );
      await tester.pumpAndSettle();

      // Tap add to cart
      await tester.tap(find.byKey(const Key('add_configured_product_button')));
      await tester.pumpAndSettle();

      // Verify captured product
      expect(capturedBusiness, equals('Pizza Hut Centroamérica'));
      expect(capturedProduct, isNotNull);
      expect(capturedProduct!.selectedOptions.length, equals(2));
      expect(capturedProduct!.calculatedTotalPrice, equals(345.0));
      expect(capturedProduct!.description, contains('Nota: Por favor masa bien tostada'));
    });
  });

  group('BLOQUE 2: AddressManagerScreen (1:1 Android Parity)', () {
    testWidgets('Lists addresses with default badge, adds new address, and sets default', (tester) async {
      final initialAddresses = [
        const SavedAddressEntity(
          id: 'addr_casa',
          userId: 'user_101',
          label: 'Casa',
          fullAddress: 'Colonia Los Robles, Casa 45',
          instructions: 'Portón café, timbre arriba',
          isDefault: true,
          latitude: 12.128,
          longitude: -86.262,
          createdAt: 1000,
          updatedAt: 1000,
        ),
        const SavedAddressEntity(
          id: 'addr_trabajo',
          userId: 'user_101',
          label: 'Trabajo',
          fullAddress: 'Edificio Invercasa, Piso 3',
          instructions: 'Entregar en recepción',
          isDefault: false,
          latitude: 12.115,
          longitude: -86.271,
          createdAt: 2000,
          updatedAt: 2000,
        ),
      ];

      final mockUserService = MockUserService(initialAddresses: initialAddresses);

      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: AddressManagerScreen(
            userId: 'user_101',
            userService: mockUserService,
            onBack: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify header and existing addresses
      expect(find.text('Mis Direcciones'), findsOneWidget);
      expect(find.text('Gestiona tus lugares de entrega'), findsOneWidget);
      expect(find.text('Colonia Los Robles, Casa 45'), findsOneWidget);
      expect(find.text('Edificio Invercasa, Piso 3'), findsOneWidget);
      expect(find.byKey(const Key('default_badge_addr_casa')), findsOneWidget);

      // Open new address dialog via AppBar button
      await tester.tap(find.byKey(const Key('add_new_address_appbar_btn')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('address_editor_dialog')), findsOneWidget);
      expect(find.text('Nueva Dirección'), findsOneWidget);

      // Choose "Oficina" label chip
      await tester.tap(find.byKey(const Key('chip_label_Oficina')));
      await tester.pumpAndSettle();

      // Enter full address and instructions
      await tester.enterText(
        find.byKey(const Key('address_full_field')),
        'Centro Corporativo Banpro, Módulo 5',
      );
      await tester.enterText(
        find.byKey(const Key('address_instructions_field')),
        'Torre A, preguntar por Carlos',
      );

      // Toggle default switch
      await tester.tap(find.byKey(const Key('address_default_switch')));
      await tester.pumpAndSettle();

      // Save
      await tester.tap(find.byKey(const Key('address_save_confirm_button')));
      await tester.pumpAndSettle();

      // Verify service called
      expect(mockUserService.lastSavedAddress, isNotNull);
      expect(mockUserService.lastSavedAddress!.label, equals('Oficina'));
      expect(mockUserService.lastSavedAddress!.fullAddress, equals('Centro Corporativo Banpro, Módulo 5'));
      expect(mockUserService.lastSavedAddress!.instructions, equals('Torre A, preguntar por Carlos'));
      expect(mockUserService.lastSavedAddress!.isDefault, isTrue);

      // Test Popup Menu on "addr_trabajo" to set as default
      await tester.tap(find.byKey(const Key('address_menu_addr_trabajo')));
      await tester.pumpAndSettle();

      expect(find.text('Marcar como principal'), findsOneWidget);
      await tester.tap(find.text('Marcar como principal'));
      await tester.pumpAndSettle();

      expect(mockUserService.lastDefaultAddressId, equals('addr_trabajo'));

      mockUserService.dispose();
    });
  });

  group('BLOQUE 2: Saved Address Quick-Select in Cart Checkout', () {
    testWidgets('Quick select chip populates delivery address in checkout modal', (tester) async {
      final savedAddresses = [
        const SavedAddressEntity(
          id: 'addr_1',
          userId: 'usr_client_1',
          label: 'Casa',
          fullAddress: 'Bello Horizonte, Etapa IV, Casa C-12',
          isDefault: true,
          latitude: 12.145,
          longitude: -86.230,
          createdAt: 1000,
          updatedAt: 1000,
        ),
      ];

      const mockUser = UserProfileEntity(
        uid: 'usr_client_1',
        email: 'cliente@bsd.com',
        displayName: 'Cliente VIP',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      );

      final sessionState = MockSessionState(
        user: mockUser,
        claims: const CanonicalCustomClaimsV3(
          role: EiamRole.client,
          tenantId: 'ten_core',
        ),
      );

      const business = BusinessEntity(
        businessId: 'biz_restaurante_1',
        tenantId: 'ten_core',
        name: 'El Asador Criollo',
        category: 'Carnes',
        deliveryFee: 45.0,
        address: 'Villa Fontana, Managua',
        phone: '2222-1111',
        description: 'Especialidad en carnes a la parrilla',
        latitude: 12.12,
        longitude: -86.26,
        rating: 4.8,
        ratingCount: 50,
      );

      final mockUserService = MockUserService(initialAddresses: savedAddresses);
      final mockMerchantService = MockMerchantService(business: business);
      final mockOrderService = MockOrderService();
      final mockFleetService = MockFleetService();
      final mockTripService = DummyTripService();

      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: AppShell(
            sessionState: sessionState,
            orderService: mockOrderService,
            tripService: mockTripService,
            fleetService: mockFleetService,
            merchantService: mockMerchantService,
            userService: mockUserService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Add item to cart via AppShell state
      final appShellState = tester.state(find.byType(AppShell)) as dynamic;
      const product = ProductEntity(
        productId: 'prod_churrasco',
        tenantId: 'ten_core',
        businessId: 'biz_restaurante_1',
        name: 'Churrasco Especial',
        description: 'Corte jugoso',
        price: 320.0,
        category: 'Carnes',
        createdAt: 0,
        updatedAt: 0,
      );

      appShellState.addToCart(product, 'El Asador Criollo');
      await tester.pumpAndSettle();

      // Open Cart Dialog
      final cartBtn = find.byType(BSCartButton);
      expect(cartBtn, findsOneWidget);
      await tester.tap(cartBtn);
      await tester.pumpAndSettle();

      // In decoupled 2-step checkout, advance to Step 2 (Delivery)
      final continueBtn = find.text('Continuar a Entrega (Paso 2)');
      if (continueBtn.evaluate().isNotEmpty) {
        await tester.tap(continueBtn);
        await tester.pumpAndSettle();
      }

      // Verify quick select address chip is rendered
      final quickChip = find.byKey(const Key('quick_select_address_addr_1'));
      expect(quickChip, findsOneWidget);

      // Tap quick select chip
      await tester.ensureVisible(quickChip);
      await tester.pumpAndSettle();
      await tester.tap(quickChip);
      await tester.pumpAndSettle();

      // Verify delivery address textfield now has the saved address
      final addressField = tester.widget<TextField>(find.byKey(const Key('checkout_delivery_address_field')));
      expect(addressField.controller?.text, equals('Bello Horizonte, Etapa IV, Casa C-12'));

      mockUserService.dispose();
      mockOrderService.dispose();
      mockFleetService.dispose();
    });
  });

  group('BLOQUE 2: Order Live Tracking Screen (OrderDetailScreen.kt parity)', () {
    testWidgets('Displays order stepper, items, and listens to courier telemetry', (tester) async {
      const order = OrderEntity(
        orderId: 'ORD-TRACK-404',
        tenantId: 'ten_core',
        customerId: 'usr_client_1',
        customerName: 'Carlos Cliente',
        customerPhone: '88888888',
        businessId: 'biz_restaurante_1',
        businessName: 'El Asador Criollo',
        status: OrderStatus.dispatched,
        assignedCourierId: 'courier_007',
        items: [],
        total: 365.0,
        deliveryFee: 45.0,
        subtotal: 320.0,
        discount: 0.0,
        paymentMethod: PaymentMethod.cash,
        isPaid: false,
        deliveryAddress: 'Bello Horizonte, Etapa IV',
        createdAt: 1000,
        updatedAt: 1000,
      );

      final mockOrderService = MockOrderService(initialOrder: order);
      final mockFleetService = MockFleetService();

      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

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

      await tester.pumpAndSettle();

      // Header and order number
      expect(find.text('Seguimiento en Vivo 🛵'), findsOneWidget);
      expect(find.text('Pedido #ORD-TRAC'), findsOneWidget);

      // Status Stepper
      expect(find.text('En Camino'), findsOneWidget);

      // Emit live telemetry for courier_007
      mockFleetService.emitCourierLocation(
        CourierLocationEntity(
          courierId: 'courier_007',
          latitude: 12.138,
          longitude: -86.248,
          speed: 8.5,
          timestamp: DateTime.now().millisecondsSinceEpoch,
          isOnline: true,
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Verify GPS live badge
      expect(find.text('GPS En Vivo'), findsOneWidget);

      mockOrderService.dispose();
      mockFleetService.dispose();
    });
  });
}
