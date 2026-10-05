/// BLUE SYSTEM DELIVERY ENTERPRISE — GAP-PRO-01 CONTRACT TESTS
/// Validates Customer Profile personal data edit, saved delivery addresses CRUD,
/// and default address assignment with multi-tenant SSOT (1:1 Android ProfileScreen.kt / AddressRepository.kt).

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
import 'package:bluesystem_delivery_flutter/domain/entities/saved_address_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/trip_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/shell/app_shell.dart';

class MockUserService implements IUserService {
  final StreamController<List<SavedAddressEntity>> _addressesController =
      StreamController<List<SavedAddressEntity>>.broadcast();

  List<SavedAddressEntity> _addresses = [];
  String? updatedProfileUid;
  String? updatedProfileName;
  String? updatedProfilePhone;
  String? deletedAddressId;
  String? defaultAddressId;
  SavedAddressEntity? savedAddress;

  MockUserService(List<SavedAddressEntity> initial) {
    _addresses = List.from(initial);
  }

  void emitCurrentAddresses() {
    _addressesController.add(_addresses);
  }

  @override
  Stream<UserProfileEntity?> watchProfile(String uid) => Stream.value(null);

  @override
  Future<void> updateProfile(String uid, {required String displayName, String? phoneNumber}) async {
    final trimmedUid = uid.trim();
    final trimmedName = displayName.trim();
    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (trimmedName.isEmpty) throw ArgumentError('displayName cannot be empty');

    updatedProfileUid = trimmedUid;
    updatedProfileName = trimmedName;
    updatedProfilePhone = phoneNumber?.trim();
  }

  @override
  Stream<List<SavedAddressEntity>> watchAddresses(String uid) {
    // Emit initial on listen
    Future.microtask(() => _addressesController.add(_addresses));
    return _addressesController.stream;
  }

  @override
  Future<void> saveAddress(String uid, SavedAddressEntity address) async {
    final trimmedUid = uid.trim();
    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (address.fullAddress.trim().isEmpty) throw ArgumentError('fullAddress cannot be empty');

    final newAddr = address.id.isEmpty
        ? address.copyWith(id: 'addr_${DateTime.now().millisecondsSinceEpoch}')
        : address;

    savedAddress = newAddr;
    _addresses.add(newAddr);
    _addressesController.add(_addresses);
  }

  @override
  Future<void> deleteAddress(String uid, String addressId) async {
    final trimmedUid = uid.trim();
    final trimmedAddressId = addressId.trim();
    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (trimmedAddressId.isEmpty) throw ArgumentError('addressId cannot be empty');

    deletedAddressId = trimmedAddressId;
    _addresses.removeWhere((a) => a.id == trimmedAddressId);
    _addressesController.add(_addresses);
  }

  @override
  Future<void> setDefaultAddress(String uid, String addressId) async {
    final trimmedUid = uid.trim();
    final trimmedAddressId = addressId.trim();
    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (trimmedAddressId.isEmpty) throw ArgumentError('addressId cannot be empty');

    defaultAddressId = trimmedAddressId;
    _addresses = _addresses.map((a) => a.copyWith(isDefault: a.id == trimmedAddressId)).toList();
    _addressesController.add(_addresses);
  }

  @override
  Stream<Set<String>> watchFavoriteBusinessIds(String uid) => Stream.value(<String>{});

  @override
  Future<void> toggleFavoriteBusiness(String uid, String businessId, {String? businessName}) async {}

  void dispose() {
    _addressesController.close();
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

class DummyOrderService implements IOrderService {
  @override
  Stream<List<OrderEntity>> watchCustomerOrders(String customerId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchBusinessOrders(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchCourierAssignedOrders(String courierId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<OrderEntity>> watchEligibleOrders({required String tenantId}) => Stream.value([]);
  @override
  Future<OrderEntity?> getOrderById(String orderId) async => null;
  @override
  Stream<OrderEntity?> watchOrder(String orderId) => Stream.value(null);
  @override
  Future<String> createOrder(Map<String, dynamic> orderData) async => 'ord_1';
  @override
  Future<bool> claimOrderAtomically(String orderId, String courierId, String courierName) async => true;
  @override
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {}
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

class DummyFleetService implements IFleetService {
  @override
  Stream<List<CourierLocationEntity>> watchActiveCouriers({required String tenantId}) => Stream.value([]);
  @override
  Stream<CourierLocationEntity?> watchCourierLocation(String courierId) => Stream.value(null);
  @override
  Future<void> publishCourierTelemetry(CourierLocationEntity telemetry) async {}
}

class DummyMerchantService implements IMerchantService {
  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) => Stream.value([]);
  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) => Stream.value(null);
  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) => Stream.value([]);
  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) => Stream.value([]);
  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId}) async => [];
  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) => Stream.value([]);
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
  Future<void> updateProductQuick(String productId, {required String name, required double price}) async {}
  @override
  Stream<List<HomeEditorialAdEntity>> watchHomeEditorialAds({String? tenantId}) => Stream.value([]);
}

class MockSessionState extends SessionState {
  final CanonicalCustomClaimsV3? _mockClaims;
  UserProfileEntity? _mockUser;
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
  @override
  bool get isGuestMode => _mockUser == null;
  @override
  AuthStatus get status => AuthStatus.authenticated;
  @override
  bool get isAuthenticated => true;
  @override
  void updateCurrentUser(UserProfileEntity user) {
    _mockUser = user;
    notifyListeners();
  }
}

void main() {
  late MockUserService mockUserService;

  const sampleAddress1 = SavedAddressEntity(
    id: 'addr_home',
    userId: 'user_cust_01',
    label: 'Casa',
    fullAddress: 'Colonia Los Robles, Casa #12',
    instructions: 'Portón negro',
    isDefault: true,
    latitude: 12.130000,
    longitude: -86.250000,
    createdAt: 1000,
    updatedAt: 1000,
  );

  const sampleAddress2 = SavedAddressEntity(
    id: 'addr_work',
    userId: 'user_cust_01',
    label: 'Trabajo',
    fullAddress: 'Edificio Pellas, Piso 5',
    instructions: 'Recepción principal',
    isDefault: false,
    latitude: 12.140000,
    longitude: -86.260000,
    createdAt: 2000,
    updatedAt: 2000,
  );

  setUp(() {
    mockUserService = MockUserService([sampleAddress1, sampleAddress2]);
  });

  tearDown(() {
    mockUserService.dispose();
  });

  test('GAP-PRO-01: Contract validation rejects empty uid or fields', () async {
    // updateProfile validation
    expect(() => mockUserService.updateProfile('', displayName: 'Carlos'), throwsArgumentError);
    expect(() => mockUserService.updateProfile('usr_1', displayName: '   '), throwsArgumentError);

    // saveAddress validation
    expect(() => mockUserService.saveAddress('', sampleAddress1), throwsArgumentError);
    expect(
      () => mockUserService.saveAddress('usr_1', sampleAddress1.copyWith(fullAddress: ' ')),
      throwsArgumentError,
    );

    // deleteAddress validation
    expect(() => mockUserService.deleteAddress('', 'addr_1'), throwsArgumentError);
    expect(() => mockUserService.deleteAddress('usr_1', ''), throwsArgumentError);

    // setDefaultAddress validation
    expect(() => mockUserService.setDefaultAddress('', 'addr_1'), throwsArgumentError);
    expect(() => mockUserService.setDefaultAddress('usr_1', ''), throwsArgumentError);
  });

  testWidgets('GAP-PRO-01: Edit Profile dialog updates displayName and phoneNumber', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final session = MockSessionState(
      claims: const CanonicalCustomClaimsV3(
        role: EiamRole.client,
        tenantId: 'ten_bluesystem_core',
      ),
      user: const UserProfileEntity(
        uid: 'user_cust_01',
        email: 'cliente@test.com',
        displayName: 'Juan Perez',
        phoneNumber: '88889999',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: AppShell(
          sessionState: session,
          orderService: DummyOrderService(),
          tripService: DummyTripService(),
          fleetService: DummyFleetService(),
          merchantService: DummyMerchantService(),
          userService: mockUserService,
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Navigate to Profile tab (index 3 in curved bottom bar)
    final profileTab = find.byIcon(Icons.person_rounded);
    expect(profileTab, findsOneWidget);
    await tester.tap(profileTab);
    await tester.pumpAndSettle();

    // Verify current user details
    expect(find.text('Juan Perez'), findsOneWidget);
    expect(find.text('cliente@test.com'), findsOneWidget);

    // Tap "Mi Perfil" tile
    final myProfileTile = find.byKey(const Key('profile_tile_my_profile'));
    expect(myProfileTile, findsOneWidget);
    await tester.tap(myProfileTile);
    await tester.pumpAndSettle();

    // Verify dialog opens
    expect(find.text('Editar Perfil'), findsOneWidget);
    final nameField = find.byKey(const Key('edit_profile_name_field'));
    final phoneField = find.byKey(const Key('edit_profile_phone_field'));
    expect(nameField, findsOneWidget);
    expect(phoneField, findsOneWidget);

    // Edit fields
    await tester.enterText(nameField, 'Juan Carlos Perez');
    await tester.enterText(phoneField, '88776655');

    // Save
    await tester.tap(find.byKey(const Key('edit_profile_save_btn')));
    await tester.pumpAndSettle();

    // Verify service was called
    expect(mockUserService.updatedProfileUid, equals('user_cust_01'));
    expect(mockUserService.updatedProfileName, equals('Juan Carlos Perez'));
    expect(mockUserService.updatedProfilePhone, equals('88776655'));

    // Verify UI updated
    expect(find.text('Editar Perfil'), findsNothing);
    expect(find.text('Juan Carlos Perez'), findsOneWidget);
  });

  testWidgets('GAP-PRO-01: Saved Addresses modal allows listing, setting default, and adding new address', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final session = MockSessionState(
      claims: const CanonicalCustomClaimsV3(
        role: EiamRole.client,
        tenantId: 'ten_bluesystem_core',
      ),
      user: const UserProfileEntity(
        uid: 'user_cust_01',
        email: 'cliente@test.com',
        displayName: 'Juan Perez',
        phoneNumber: '88889999',
        role: EiamRole.client,
        isVerified: true,
        createdAt: 0,
        updatedAt: 0,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: AppShell(
          sessionState: session,
          orderService: DummyOrderService(),
          tripService: DummyTripService(),
          fleetService: DummyFleetService(),
          merchantService: DummyMerchantService(),
          userService: mockUserService,
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Navigate to Profile tab
    final profileTab = find.byIcon(Icons.person_rounded);
    await tester.tap(profileTab);
    await tester.pumpAndSettle();

    // Tap "Mis direcciones"
    final addressesTile = find.byKey(const Key('profile_tile_saved_addresses'));
    expect(addressesTile, findsOneWidget);
    await tester.tap(addressesTile);
    await tester.pumpAndSettle();

    // Verify Modal header and address cards
    expect(find.text('Mis Direcciones Guardadas'), findsOneWidget);
    expect(find.byKey(const Key('address_tile_addr_home')), findsOneWidget);
    expect(find.byKey(const Key('address_tile_addr_work')), findsOneWidget);
    expect(find.text('PREDETERMINADA'), findsOneWidget);

    // Set "Trabajo" as default
    final setDefaultBtn = find.byKey(const Key('set_default_btn_addr_work'));
    expect(setDefaultBtn, findsOneWidget);
    await tester.tap(setDefaultBtn);
    await tester.pumpAndSettle();
    expect(mockUserService.defaultAddressId, equals('addr_work'));

    // Tap "Nueva" address button
    final addAddressBtn = find.byKey(const Key('add_address_btn'));
    expect(addAddressBtn, findsOneWidget);
    await tester.tap(addAddressBtn);
    await tester.pumpAndSettle();

    // Fill new address dialog
    expect(find.text('Nueva Dirección'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('address_label_field')), 'Gimnasio');
    await tester.enterText(find.byKey(const Key('address_full_field')), 'Plaza España, Módulo B');
    await tester.enterText(find.byKey(const Key('address_instructions_field')), 'Entregar en portería');

    // Save address
    await tester.tap(find.byKey(const Key('save_address_btn')));
    await tester.pumpAndSettle();

    // Verify service received new address
    expect(mockUserService.savedAddress?.label, equals('Gimnasio'));
    expect(mockUserService.savedAddress?.fullAddress, equals('Plaza España, Módulo B'));
    expect(mockUserService.savedAddress?.instructions, equals('Entregar en portería'));

    // Delete address "addr_home"
    final deleteBtn = find.byKey(const Key('delete_address_btn_addr_home'));
    expect(deleteBtn, findsOneWidget);
    await tester.tap(deleteBtn);
    await tester.pumpAndSettle();
    expect(mockUserService.deletedAddressId, equals('addr_home'));
  });
}
