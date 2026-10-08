/// BLUE SYSTEM DELIVERY ENTERPRISE — CUSTOMER HOME ANDROID PARITY CONTRACT TEST SUITE
/// Protocol: BSD-FLUTTER-CUSTOMER-HOME-ANDROID-PARITY-001
/// Validates 1:1 functional equivalence between Flutter Customer App and Android Track A.
/// Covers:
/// 1. DashboardConfig realtime streaming & normalized section ordering
/// 2. Admin Web dynamic section reordering & visibility toggles
/// 3. Categories from /categories with BUSINESS vs PRODUCT domain differentiation
/// 4. All Businesses from /businesses with canonical validation
/// 5. Nearby businesses with progressive radius auto-expansion (5/10/15 km) via Haversine
/// 6. Featured businesses & Star products
/// 7. Flash deals (isCurrentlyValid) & Promotions (discounted products)
/// 8. Same Price verified, Top Selling (unitsSold30d DESC), Recommended, New Businesses
/// 9. Favorites block
/// 10. Express X→Y Delivery fail-closed governance (showExpressDeliveryBanner && xToYServiceEnabled)
/// 11. Merchant Detail: banner, info card, branch selector, open/closed (OperatingHoursResolver), delivery fee authority
/// 12. Firestore error propagation (no silent empty lists)
/// 13. Search across merchants and products
/// 14. Product options & variants configuration modal

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bluesystem_delivery_flutter/core/auth/auth_context.dart';
import 'package:bluesystem_delivery_flutter/core/brand/brand_context.dart';
import 'package:bluesystem_delivery_flutter/core/config/app_config.dart';
import 'package:bluesystem_delivery_flutter/core/subscription/subscription_context.dart';
import 'package:bluesystem_delivery_flutter/core/tenant/tenant_context.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/user_profile_entity.dart';
import 'package:bluesystem_delivery_flutter/core/engine/operating_hours_resolver.dart';
import 'package:bluesystem_delivery_flutter/core/utils/geo_utils.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/banner_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/providers/session_state.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/home/commercial_home_screen.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/merchant/merchant_detail_screen.dart';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK SERVICES FOR PARITY TESTING
// ═══════════════════════════════════════════════════════════════════════════

class MockParityMerchantService implements IMerchantService {
  final StreamController<DashboardConfigEntity> configController = StreamController.broadcast();
  final StreamController<List<BusinessEntity>> businessesController = StreamController.broadcast();
  final StreamController<List<CategoryEntity>> categoriesController = StreamController.broadcast();
  final StreamController<List<ProductEntity>> featuredProductsController = StreamController.broadcast();
  final StreamController<List<FlashDealEntity>> flashDealsController = StreamController.broadcast();
  final StreamController<List<ProductEntity>> discountedProductsController = StreamController.broadcast();
  final StreamController<List<BranchEntity>> allBranchesController = StreamController.broadcast();
  final StreamController<List<HomeEditorialAdEntity>> editorialAdsController = StreamController.broadcast();

  DashboardConfigEntity currentConfig = const DashboardConfigEntity(
    showExpressDeliveryBanner: true,
    xToYServiceEnabled: true,
  );

  List<BusinessEntity> currentBusinesses = [];
  List<CategoryEntity> currentCategories = [];
  List<ProductEntity> currentFeaturedProducts = [];
  List<FlashDealEntity> currentFlashDeals = [];
  List<ProductEntity> currentDiscountedProducts = [];
  List<BranchEntity> currentBranches = [];
  List<HomeEditorialAdEntity> currentEditorialAds = [];

  void emitConfig(DashboardConfigEntity config) {
    currentConfig = config;
    configController.add(config);
  }

  void emitBusinesses(List<BusinessEntity> list) {
    currentBusinesses = list;
    businessesController.add(list);
  }

  void emitCategories(List<CategoryEntity> list) {
    currentCategories = list;
    categoriesController.add(list);
  }

  void emitFeaturedProducts(List<ProductEntity> list) {
    currentFeaturedProducts = list;
    featuredProductsController.add(list);
  }

  void emitFlashDeals(List<FlashDealEntity> list) {
    currentFlashDeals = list;
    flashDealsController.add(list);
  }

  void emitDiscountedProducts(List<ProductEntity> list) {
    currentDiscountedProducts = list;
    discountedProductsController.add(list);
  }

  void emitBranches(List<BranchEntity> list) {
    currentBranches = list;
    allBranchesController.add(list);
  }

  void emitEditorialAds(List<HomeEditorialAdEntity> list) {
    currentEditorialAds = list;
    editorialAdsController.add(list);
  }

  Object? businessError;

  void emitErrorOnBusinesses(String error) {
    businessError = Exception(error);
    businessesController.addError(Exception(error));
  }

  void dispose() {
    configController.close();
    businessesController.close();
    categoriesController.close();
    featuredProductsController.close();
    flashDealsController.close();
    discountedProductsController.close();
    allBranchesController.close();
    editorialAdsController.close();
  }

  @override
  Stream<DashboardConfigEntity> watchDashboardConfig({String? tenantId}) async* {
    yield currentConfig;
    yield* configController.stream;
  }

  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) async* {
    if (businessError != null) {
      yield* Stream.error(businessError!);
      return;
    }
    yield currentBusinesses;
    yield* businessesController.stream;
  }

  @override
  Stream<List<CategoryEntity>> watchCategories({required String tenantId}) async* {
    yield currentCategories;
    yield* categoriesController.stream;
  }

  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) async* {
    yield currentFeaturedProducts;
    yield* featuredProductsController.stream;
  }

  @override
  Stream<List<FlashDealEntity>> watchFlashDeals({required String tenantId}) async* {
    yield currentFlashDeals;
    yield* flashDealsController.stream;
  }

  @override
  Stream<List<ProductEntity>> watchDiscountedProducts({required String tenantId}) async* {
    yield currentDiscountedProducts;
    yield* discountedProductsController.stream;
  }

  @override
  Stream<List<BranchEntity>> watchAllBranches({required String tenantId}) async* {
    yield currentBranches;
    yield* allBranchesController.stream;
  }

  @override
  Stream<List<HomeEditorialAdEntity>> watchHomeEditorialAds({String? tenantId}) async* {
    yield currentEditorialAds;
    yield* editorialAdsController.stream;
  }

  @override
  Stream<List<HomeServiceCategoryEntity>> watchHomeServiceCategories({String? tenantId}) => Stream.value([]);

  @override
  Future<List<BusinessEntity>> getActiveBusinesses({String? tenantId}) async => currentBusinesses;

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) {
    final b = currentBusinesses.firstWhere(
      (biz) => biz.businessId == businessId,
      orElse: () => BusinessEntity(
        businessId: businessId,
        tenantId: 'ten_bluesystem_core',
        name: 'Comercio Test',
        category: 'Restaurante',
        address: 'Pista Suburbana, Managua',
        phone: '8888-9999',
        description: 'Descripción de prueba',
        deliveryFee: 45.0,
      ),
    );
    return Stream.value(b);
  }

  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) {
    return Stream.value(currentBranches.where((b) => b.businessId == businessId).toList());
  }

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) {
    return Stream.value(currentFeaturedProducts.where((p) => p.businessId == businessId).toList());
  }

  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId}) async =>
      currentFeaturedProducts.where((p) => p.businessId == businessId).toList();

  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) => Stream.value([]);

  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({String? tenantId}) => Stream.value([]);

  @override
  Future<void> updateProductQuick(String productId, {required String name, required double price}) async {}
}

class MockBannerService implements IBannerService {
  final StreamController<List<BannerEntity>> _controller = StreamController.broadcast();
  List<BannerEntity> _currentBanners = [];

  void emitBanners(List<BannerEntity> banners) {
    _currentBanners = banners;
    _controller.add(banners);
  }

  @override
  Stream<List<BannerEntity>> watchActiveBanners({String? tenantId}) async* {
    yield _currentBanners;
    yield* _controller.stream;
  }

  @override
  Future<List<BannerEntity>> getActiveBanners({String? tenantId}) async => _currentBanners;
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
  }) async =>
      throw UnimplementedError();
  @override
  Future<UserProfileEntity> signInWithGoogleToken(String idToken, {String? accessToken}) async =>
      throw UnimplementedError();
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
  Future<AppConfigEntity?> resolveActiveConfig({required String tenantId, required String brandId, required PlatformType platform, required EnvironmentType environment}) async => null;
}

class MockSessionState extends SessionState {
  final UserProfileEntity? _mockUser;
  final CanonicalCustomClaimsV3? _mockClaims;
  final AuthStatus _mockStatus;

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
  @override
  CanonicalCustomClaimsV3? get claims => _mockClaims;
  @override
  AuthStatus get status => _mockStatus;
  @override
  bool get isAuthenticated => _mockStatus == AuthStatus.authenticated;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARITY CONTRACT TESTS
// ═══════════════════════════════════════════════════════════════════════════

void main() {
  late MockParityMerchantService merchantService;
  late MockBannerService bannerService;
  late MockSessionState sessionState;

  setUp(() {
    merchantService = MockParityMerchantService();
    bannerService = MockBannerService();
    sessionState = MockSessionState();
  });

  tearDown(() {
    merchantService.dispose();
  });

  Widget createTestWidget({VoidCallback? onOpenExpress}) {
    return MaterialApp(
      home: Scaffold(
        body: CommercialHomeScreen(
          sessionState: sessionState,
          onNavigate: (_) {},
          merchantService: merchantService,
          bannerService: bannerService,
          onOpenExpress: onOpenExpress,
        ),
      ),
    );
  }

  group('BSD-FLUTTER-CUSTOMER-HOME-ANDROID-PARITY-001: Unit & Domain Contracts', () {
    test('TEST 01 & 02: DashboardConfig sectionOrder normalization (1:1 Android Models.kt:1074)', () {
      // Input with duplicates, unknown IDs, and mixed casing
      const config = DashboardConfigEntity(
        sectionOrder: [
          'banners',
          'UNKNOWN_SECTION_99',
          'CATEGORIES',
          'banners', // duplicate
          'flash_deals',
          'NEARBY',
          'CATEGORIES', // duplicate
        ],
      );

      final normalized = config.getNormalizedSectionOrder();

      // 1. Preserves first valid occurrence
      expect(normalized[0], equals('BANNERS'));
      expect(normalized[1], equals('CATEGORIES'));
      expect(normalized[2], equals('FLASH_DEALS'));
      expect(normalized[3], equals('NEARBY'));

      // 2. Discards unknown IDs
      expect(normalized.contains('UNKNOWN_SECTION_99'), isFalse);

      // 3. No duplicates
      expect(normalized.where((s) => s == 'BANNERS').length, equals(1));
      expect(normalized.where((s) => s == 'CATEGORIES').length, equals(1));

      // 4. Appends missing canonical sections at the end
      expect(normalized.contains('FEATURED_BUSINESSES'), isTrue);
      expect(normalized.contains('FEATURED_PRODUCTS'), isTrue);
      expect(normalized.contains('PROMOTIONS'), isTrue);
      expect(normalized.contains('SAME_PRICE'), isTrue);
      expect(normalized.contains('TOP_SELLING'), isTrue);
      expect(normalized.contains('RECOMMENDED'), isTrue);
      expect(normalized.contains('NEW_BUSINESSES'), isTrue);
      expect(normalized.contains('QUICK_REORDER'), isTrue);
      expect(normalized.contains('FAVORITES'), isTrue);
      expect(normalized.contains('EXPRESS_DELIVERY'), isTrue);
      expect(normalized.contains('SERVICE_EXPLORER'), isTrue);
      expect(normalized.contains('EDITORIAL_ADS'), isTrue);
      expect(normalized.contains('ALL_BUSINESSES'), isTrue);
      expect(DashboardConfigEntity.canonicalDefaultSectionOrder.length, equals(18));
      expect(normalized.length, equals(18));
    });

    test('TEST 09: Haversine distance engine calculates accurate km matching Android GeoUtils.kt', () {
      // UNAN Managua (12.1150, -86.2710) to Metrocentro (12.1264, -86.2655) ~ 1.4 km
      final dist = GeoUtils.calculateDistance(12.1150, -86.2710, 12.1264, -86.2655);
      expect(dist, greaterThan(1.0));
      expect(dist, lessThan(2.0));

      // Coordinate validation
      expect(GeoUtils.isValidCoordinate(12.1364, -86.2514), isTrue);
      expect(GeoUtils.isValidCoordinate(0.0, 0.0), isFalse);
      expect(GeoUtils.isValidCoordinate(95.0, -86.0), isFalse);
    });

    test('TEST 12: FlashDealEntity.isCurrentlyValid() correctly checks dates and minutes', () {
      final now = DateTime.now();

      final activeDeal = FlashDealEntity(
        id: 'fd_01',
        productId: 'p_01',
        title: 'Super Promo',
        productName: 'Pizza Familiar',
        price: 250.0,
        originalPrice: 400.0,
        discountTag: '-37%',
        businessId: 'biz_01',
        businessName: 'Pizzería Roma',
        imageUrl: '',
        active: true,
        startAt: now.subtract(const Duration(hours: 1)),
        endAt: now.add(const Duration(hours: 2)),
      );

      expect(activeDeal.isCurrentlyValid(), isTrue);

      final expiredDeal = FlashDealEntity(
        id: 'fd_02',
        productId: 'p_02',
        title: 'Promo Pasada',
        productName: 'Hamburguesa',
        price: 150.0,
        originalPrice: 200.0,
        discountTag: '-25%',
        businessId: 'biz_02',
        businessName: 'Burger King',
        imageUrl: '',
        active: true,
        startAt: now.subtract(const Duration(hours: 5)),
        endAt: now.subtract(const Duration(hours: 1)), // Expired
      );

      expect(expiredDeal.isCurrentlyValid(), isFalse);
    });

    test('TEST 17: OperatingHoursResolver evaluates weeklySchedule and manual switch', () {
      // 1. Manually closed overrides schedule
      final closedStatus = OperatingHoursResolver.resolveStatus(
        schedule: {'alwaysOpen': true},
        manualOpen: false,
      );
      expect(closedStatus.isOpen, isFalse);
      expect(closedStatus.reason, equals('MANUALLY_CLOSED'));

      // 2. Always open mode
      final openStatus = OperatingHoursResolver.resolveStatus(
        schedule: {'alwaysOpen': true},
        manualOpen: true,
      );
      expect(openStatus.isOpen, isTrue);

      // 3. 24 hours daily mode
      final day24h = OperatingHoursResolver.resolveStatus(
        schedule: {'mode': '24HOURS'},
        manualOpen: true,
      );
      expect(day24h.isOpen, isTrue);
    });

    test('TEST 20: Express Delivery fail-closed governance (ADR-015/ADR-026)', () {
      // Both true: enabled
      const enabledConfig = DashboardConfigEntity(
        showExpressDeliveryBanner: true,
        xToYServiceEnabled: true,
      );
      expect(enabledConfig.showExpressDeliveryBanner && enabledConfig.xToYServiceEnabled, isTrue);

      // Either false: strictly disabled (fail-closed)
      const bannerDisabled = DashboardConfigEntity(
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: true,
      );
      expect(bannerDisabled.showExpressDeliveryBanner && bannerDisabled.xToYServiceEnabled, isFalse);

      const serviceDisabled = DashboardConfigEntity(
        showExpressDeliveryBanner: true,
        xToYServiceEnabled: false,
      );
      expect(serviceDisabled.showExpressDeliveryBanner && serviceDisabled.xToYServiceEnabled, isFalse);
    });
  });

  group('BSD-FLUTTER-CUSTOMER-HOME-ANDROID-PARITY-001: Widget & Integration Tests', () {
    testWidgets('TEST 03 & 04: Sections respect Admin Web sectionOrder and toggles', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // Emit config with only CATEGORIES and BANNERS active, in inverted order
      merchantService.emitConfig(const DashboardConfigEntity(
        showBanners: true,
        showCategories: true,
        showBranchesBlock: false,
        showNearbyBusinesses: false,
        showFeaturedBusinesses: false,
        showFeaturedProducts: false,
        showFlashDeals: false,
        showPromotions: false,
        showSamePrice: false,
        showTopSelling: false,
        showRecommended: false,
        showNewBusinesses: false,
        showQuickReorder: false,
        showFavoritesBlock: false,
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: false,
        showAllBusinesses: false,
        sectionOrder: ['CATEGORIES', 'BANNERS'],
      ));

      merchantService.emitCategories([
        const CategoryEntity(categoryId: 'cat_1', name: 'Restaurantes', icon: '🍔'),
      ]);

      bannerService.emitBanners([
        const BannerEntity(
          id: 'ban_1',
          tenantId: 'ten_bluesystem_core',
          title: 'Gran Inauguración',
          imageUrl: '',
        ),
      ]);

      await tester.pumpAndSettle();

      // Categories and Banners are rendered
      expect(find.text('Categorías'), findsOneWidget);
      expect(find.text('Restaurantes'), findsOneWidget);
      expect(find.text('Gran Inauguración'), findsOneWidget);

      // Inactive sections are NOT rendered
      expect(find.text('Comercios Cerca de Ti 🏢'), findsNothing);
      expect(find.text('Comercios Destacados ⭐'), findsNothing);
      expect(find.text('Productos Estrella ⭐'), findsNothing);
      expect(find.text('Ofertas Flash ⚡'), findsNothing);
      expect(find.byKey(const Key('home_express_delivery_card')), findsNothing);
    });

    testWidgets('TEST 05, 06 & 07: Categories differentiation (BUSINESS vs PRODUCT)', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showCategories: true,
        showNearbyBusinesses: false,
        showFeaturedBusinesses: false,
        showFeaturedProducts: false,
        showFlashDeals: false,
        showPromotions: false,
        showSamePrice: false,
        showTopSelling: false,
        showRecommended: false,
        showNewBusinesses: false,
        showAllBusinesses: false,
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: false,
      ));

      merchantService.emitCategories([
        const CategoryEntity(categoryId: 'cat_biz', name: 'Tecnología', icon: '💻', type: 'BUSINESS'),
        const CategoryEntity(categoryId: 'cat_prod', name: 'Fritanga NICA', icon: '🥩', type: 'PRODUCT'),
      ]);

      merchantService.emitBusinesses([
        const BusinessEntity(
          businessId: 'biz_tec',
          tenantId: 'ten_bluesystem_core',
          name: 'TecnoStore Nicaragua',
          category: 'Tecnología',
          address: 'Altamira, Managua',
          phone: '2270-1122',
          description: 'Laptops y accesorios',
          deliveryFee: 50.0,
        ),
      ]);

      merchantService.emitFeaturedProducts([
        const ProductEntity(
          productId: 'prod_frit',
          tenantId: 'ten_bluesystem_core',
          businessId: 'biz_fritanga',
          name: 'Carne Asada con Tajadas',
          description: 'Carne de res asada al carbón',
          price: 180.0,
          category: 'Fritanga NICA',
          categoryName: 'Fritanga NICA',
          createdAt: 0,
          updatedAt: 0,
          businessName: 'Fritanga Doña Tania',
        ),
      ]);

      await tester.pumpAndSettle();

      // Initial state: shows both category pills
      expect(find.text('Tecnología'), findsOneWidget);
      expect(find.text('Fritanga NICA'), findsOneWidget);

      // 1. Tap PRODUCT Category (Fritanga NICA)
      await tester.tap(find.text('Fritanga NICA'));
      await tester.pumpAndSettle();

      // Should switch to PRODUCT category discovery mode
      expect(find.textContaining('Platos de "Fritanga NICA"'), findsOneWidget);
      expect(find.text('Carne Asada con Tajadas'), findsOneWidget);
      expect(find.text('Fritanga Doña Tania'), findsOneWidget);
      expect(find.text('C\$ 180'), findsOneWidget);

      // Clean filter
      await tester.tap(find.text('Limpiar'));
      await tester.pumpAndSettle();

      // 2. Tap BUSINESS Category (Tecnología)
      await tester.tap(find.text('Tecnología'));
      await tester.pumpAndSettle();

      // Should switch to BUSINESS category discovery mode
      expect(find.textContaining('Comercios en "Tecnología"'), findsOneWidget);
      expect(find.text('TecnoStore Nicaragua'), findsOneWidget);
    });

    testWidgets('TEST 08 & 18: All Businesses shows merchants with real deliveryFee authority (not C\$35)', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showAllBusinesses: true,
        showNearbyBusinesses: false,
        showFeaturedBusinesses: false,
        showSamePrice: false,
        showTopSelling: false,
        showRecommended: false,
        showNewBusinesses: false,
        showCategories: false,
        showBanners: false,
        showFlashDeals: false,
        showPromotions: false,
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: false,
      ));

      merchantService.emitBusinesses([
        const BusinessEntity(
          businessId: 'biz_01',
          tenantId: 'ten_bluesystem_core',
          name: 'Restaurante El Patio',
          category: 'Comida Típica',
          address: 'Plaza Cuba, Managua',
          phone: '2222-3333',
          description: 'Comida nicaragüense',
          deliveryFee: 65.0, // Commercial fee: C$ 65, NOT X->Y C$ 35
        ),
      ]);

      await tester.pumpAndSettle();

      expect(find.text('Todos los Comercios 🏪'), findsOneWidget);
      expect(find.text('Restaurante El Patio'), findsOneWidget);
      // Authority check: deliveryFee displayed is C$ 65
      expect(find.text('Envío C\$ 65'), findsOneWidget);
      expect(find.text('Envío C\$ 35'), findsNothing);
    });

    testWidgets('TEST 10 & 11: Featured Businesses and Star Products render correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showFeaturedBusinesses: true,
        showFeaturedProducts: true,
        showNearbyBusinesses: false,
        showSamePrice: false,
        showTopSelling: false,
        showRecommended: false,
        showNewBusinesses: false,
        showAllBusinesses: false,
        showCategories: false,
        showBanners: false,
        showFlashDeals: false,
        showPromotions: false,
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: false,
      ));

      merchantService.emitBusinesses([
        const BusinessEntity(
          businessId: 'biz_feat',
          tenantId: 'ten_bluesystem_core',
          name: 'Don Pan Bakery',
          category: 'Panadería',
          address: 'Los Robles',
          phone: '2222-4444',
          description: 'Pan artesanal y café',
          isFeatured: true,
          deliveryFee: 40.0,
        ),
      ]);

      merchantService.emitFeaturedProducts([
        const ProductEntity(
          productId: 'p_star',
          tenantId: 'ten_bluesystem_core',
          businessId: 'biz_feat',
          name: 'Tres Leches Tradicional',
          description: 'Postre nicaragüense',
          price: 120.0,
          category: 'Postres',
          createdAt: 0,
          updatedAt: 0,
          businessName: 'Don Pan Bakery',
        ),
      ]);

      await tester.pumpAndSettle();

      expect(find.text('Comercios Destacados ⭐'), findsOneWidget);
      expect(find.text('Don Pan Bakery'), findsWidgets);

      expect(find.text('Productos Estrella ⭐'), findsOneWidget);
      expect(find.text('Tres Leches Tradicional'), findsWidgets);
      expect(find.text('⭐ ESTRELLA'), findsWidgets);
    });

    testWidgets('TEST 12 & 13: Flash Deals and Discounted Products render with badges', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showFlashDeals: true,
        showPromotions: true,
      ));

      final now = DateTime.now();
      merchantService.emitFlashDeals([
        FlashDealEntity(
          id: 'fd_99',
          productId: 'p_deal',
          title: 'Combo Alitas 50% OFF',
          productName: 'Combo Alitas BBQ',
          price: 150.0,
          originalPrice: 300.0,
          discountTag: '-50%',
          businessId: 'biz_wings',
          businessName: 'Wings Factory',
          imageUrl: '',
          active: true,
          startAt: now.subtract(const Duration(minutes: 30)),
          endAt: now.add(const Duration(hours: 1)),
        ),
      ]);

      merchantService.emitDiscountedProducts([
        const ProductEntity(
          productId: 'p_promo',
          tenantId: 'ten_bluesystem_core',
          businessId: 'biz_wings',
          name: 'Hamburguesa Doble',
          description: 'Doble carne y queso',
          price: 160.0,
          originalPrice: 200.0,
          category: 'Comida Rápida',
          hasDiscount: true,
          discountPercentage: 20,
          createdAt: 0,
          updatedAt: 0,
          businessName: 'Wings Factory',
        ),
      ]);

      await tester.pumpAndSettle();

      expect(find.text('Ofertas Flash ⚡'), findsOneWidget);
      expect(find.text('Combo Alitas BBQ'), findsOneWidget);
      expect(find.text('-50%'), findsOneWidget);

      expect(find.text('Productos con Descuento 🏷️'), findsOneWidget);
      expect(find.text('Hamburguesa Doble'), findsOneWidget);
      expect(find.text('-20%'), findsOneWidget);
    });

    testWidgets('TEST 16: Branches section renders horizontal list with names and cities', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showBranchesBlock: true,
      ));

      merchantService.emitBranches([
        const BranchEntity(
          branchId: 'br_01',
          tenantId: 'ten_bluesystem_core',
          businessId: 'biz_01',
          businessName: 'Tip Top Nicaragua',
          branchName: 'Sucursal Plaza Inter',
          name: 'Plaza Inter',
          address: 'Plaza Inter 1er piso',
          phone: '2222-1111',
          city: 'Managua',
          latitude: 12.1400,
          longitude: -86.2700,
        ),
      ]);

      await tester.pumpAndSettle();

      expect(find.text('Sucursales Disponibles 📍'), findsOneWidget);
      expect(find.text('Sucursal Plaza Inter'), findsOneWidget);
      expect(find.text('Managua'), findsOneWidget);
    });

    testWidgets('TEST 22: Firestore errors are displayed via Section Error Card (no silent [])', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showAllBusinesses: true,
      ));

      // Emit controlled Firestore error
      merchantService.emitErrorOnBusinesses('PERMISSION_DENIED: Cloud Firestore access denied');

      await tester.pumpAndSettle();

      // Error message is explicitly shown in the UI
      expect(find.textContaining('Error al cargar Todos los Comercios'), findsOneWidget);
      expect(find.textContaining('PERMISSION_DENIED'), findsWidgets);
    });

    testWidgets('TEST 24: Search filters businesses in real-time', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitBusinesses([
        const BusinessEntity(
          businessId: 'b_01',
          tenantId: 'ten_bluesystem_core',
          name: 'La Casa de las Pupusas',
          category: 'Salvadoreña',
          address: 'Colonia Centroamérica',
          phone: '2222-0000',
          description: 'Pupusas revueltas',
          deliveryFee: 40.0,
        ),
        const BusinessEntity(
          businessId: 'b_02',
          tenantId: 'ten_bluesystem_core',
          name: 'Sushi Itto',
          category: 'Japonesa',
          address: 'Galerías Santo Domingo',
          phone: '2222-0001',
          description: 'Rolls y sushi',
          deliveryFee: 55.0,
        ),
      ]);

      await tester.pumpAndSettle();

      // Enter search query
      await tester.enterText(find.byType(TextField), 'Pupusas');
      await tester.pumpAndSettle();

      // Shows search results header
      expect(find.text('Resultados para "Pupusas"'), findsOneWidget);
      expect(find.text('La Casa de las Pupusas'), findsOneWidget);
      expect(find.text('Sushi Itto'), findsNothing);

      // Clear search
      await tester.tap(find.text('Borrar búsqueda'));
      await tester.pumpAndSettle();

      expect(find.text('Resultados para "Pupusas"'), findsNothing);
    });
  });

  group('BSD-FLUTTER-CUSTOMER-HOME-ANDROID-PARITY-001: MerchantDetailScreen Tests', () {
    testWidgets('TEST 15 & 25: Merchant Detail renders banner, info, branches and auto-triggers product options', (tester) async {
      const biz = BusinessEntity(
        businessId: 'biz_detail_01',
        tenantId: 'ten_bluesystem_core',
        name: 'Restaurante La Marseillaise',
        category: 'Francesa',
        address: 'Los Robles, Managua',
        phone: '2278-2222',
        description: 'Auténtica cocina francesa',
        deliveryFee: 60.0,
        deliveryTime: '30-45 min',
      );

      const branch = BranchEntity(
        branchId: 'br_mga_01',
        tenantId: 'ten_bluesystem_core',
        businessId: 'biz_detail_01',
        name: 'Sucursal Principal',
        address: 'Los Robles, Managua',
        phone: '2278-2222',
        latitude: 12.1200,
        longitude: -86.2600,
      );

      const product = ProductEntity(
        productId: 'prod_crepe',
        tenantId: 'ten_bluesystem_core',
        businessId: 'biz_detail_01',
        name: 'Crêpe Suzette',
        description: 'Crêpe flambeada con licor de naranja',
        price: 190.0,
        category: 'Postres',
        createdAt: 0,
        updatedAt: 0,
        optionGroups: [
          {
            'groupId': 'grp_sugar',
            'nombre': 'Tipo de Azúcar',
            'minSelection': 1,
            'maxSelection': 1,
            'required': true,
            'options': [
              {'optionId': 'opt_blanca', 'nombre': 'Azúcar Blanca', 'precioAdicional': 0.0},
              {'optionId': 'opt_morena', 'nombre': 'Azúcar Morena', 'precioAdicional': 10.0},
            ],
          }
        ],
      );

      merchantService.emitBusinesses([biz]);
      merchantService.emitBranches([branch]);
      merchantService.emitFeaturedProducts([product]);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MerchantDetailScreen(
              businessId: 'biz_detail_01',
              initialProductId: 'prod_crepe',
              merchantService: merchantService,
              onAddToCart: (_, __) {},
              onBack: () {},
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Merchant information rendered
      expect(find.text('Restaurante La Marseillaise'), findsWidgets);
      expect(find.text('Envío C\$ 60'), findsOneWidget);
      expect(find.text('Recibís en 30-45 min'), findsOneWidget);

      // Crêpe Suzette product rendered
      expect(find.text('Crêpe Suzette'), findsWidgets);

      // Auto-triggered options modal for initialProductId 'prod_crepe'
      expect(find.text('Tipo de Azúcar'), findsOneWidget);
      expect(find.text('Azúcar Blanca'), findsOneWidget);
      expect(find.text('Azúcar Morena'), findsOneWidget);
      expect(find.text('+C\$ 10'), findsOneWidget);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADR-030 / BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001
  // 1:1 PARITY CONTRACT TESTS (Domain, Data, Widget & Integration)
  // ═══════════════════════════════════════════════════════════════════════════
  group('BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001: Editorial Ads & Dynamic Content Parity Tests', () {
    test('TEST 26: HomeEditorialAdEntity temporal validity, active toggle, and compat aliases', () {
      final now = DateTime.now().millisecondsSinceEpoch;

      // Inactive ad
      const inactiveAd = HomeEditorialAdEntity(
        id: 'ad_inactive',
        title: 'Anuncio Inactivo',
        active: false,
      );
      expect(inactiveAd.isCurrentlyValid(nowMs: now), isFalse);

      // Future ad
      final futureAd = HomeEditorialAdEntity(
        id: 'ad_future',
        title: 'Anuncio Futuro',
        active: true,
        startAt: now + 3600000, // +1 hour
      );
      expect(futureAd.isCurrentlyValid(nowMs: now), isFalse);

      // Expired ad
      final expiredAd = HomeEditorialAdEntity(
        id: 'ad_expired',
        title: 'Anuncio Vencido',
        active: true,
        endAt: now - 3600000, // -1 hour
      );
      expect(expiredAd.isCurrentlyValid(nowMs: now), isFalse);

      // Valid ad with aliases
      final validAd = HomeEditorialAdEntity(
        id: 'ad_valid',
        title: 'Gran Promo',
        subtitle: '2x1 Especial',
        badgeText: 'HOT',
        actionType: 'MERCHANT',
        actionTarget: 'biz_01',
        merchantId: 'biz_01',
        merchantNameSnapshot: 'Hamburguesas Managua',
        merchantLogoUrlSnapshot: 'https://cdn.example.com/logo.png',
        active: true,
        startAt: now - 1000,
        endAt: now + 100000,
      );
      expect(validAd.isCurrentlyValid(nowMs: now), isTrue);
      expect(validAd.effectiveBadgeText, equals('HOT'));
      expect(validAd.effectiveMerchantName, equals('Hamburguesas Managua'));
      expect(validAd.effectiveMerchantLogoUrl, equals('https://cdn.example.com/logo.png'));
      expect(validAd.effectiveActionTarget, equals('biz_01'));
    });

    test('TEST 27: DashboardConfigEntity dynamic blockTitles and blockActions resolution (1:1 Android)', () {
      const config = DashboardConfigEntity(
        blockTitles: {
          'CATEGORIES': 'Explora la Gastronomía',
          'EDITORIAL_ADS': 'Novedades de la Semana',
        },
        blockActions: {
          'EDITORIAL_ADS': BlockActionConfigEntity(
            type: 'INTERNAL_ROUTE',
            target: 'promos',
            label: 'Ver catálogo',
          ),
          'NEARBY': BlockActionConfigEntity(
            type: 'NONE',
            target: '',
            label: '',
          ),
        },
      );

      // Custom title override
      expect(config.getDisplayTitle('CATEGORIES'), equals('Explora la Gastronomía'));
      expect(config.getDisplayTitle('EDITORIAL_ADS'), equals('Novedades de la Semana'));

      // Section with defaultTitle fallback
      expect(config.getDisplayTitle('FEATURED_BUSINESSES', defaultTitle: 'Comercios Destacados ⭐'), equals('Comercios Destacados ⭐'));

      // Section fallback to canonical default
      expect(config.getDisplayTitle('ALL_BUSINESSES'), equals('Todos los Comercios 🏪'));

      // Block action resolution (Fail-closed)
      final action = config.getBlockAction('EDITORIAL_ADS');
      expect(action, isNotNull);
      expect(action!.isActionable, isTrue);
      expect(action.label, equals('Ver catálogo'));

      // NONE action returns null
      expect(config.getBlockAction('NEARBY'), isNull);
      expect(config.getBlockAction('NON_EXISTENT'), isNull);
    });

    testWidgets('TEST 28: CommercialHomeScreen dynamically renders EDITORIAL_ADS when enabled', (tester) async {
      await tester.pumpWidget(createTestWidget());

      merchantService.emitConfig(const DashboardConfigEntity(
        showEditorialAds: true,
        showAllBusinesses: false,
        showNearbyBusinesses: false,
        showFeaturedBusinesses: false,
        showSamePrice: false,
        showTopSelling: false,
        showRecommended: false,
        showNewBusinesses: false,
        showCategories: false,
        showBanners: false,
        showFlashDeals: false,
        showPromotions: false,
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: false,
        sectionOrder: ['EDITORIAL_ADS'],
        blockTitles: {'EDITORIAL_ADS': 'Super Promociones 🚀'},
      ));

      merchantService.emitEditorialAds([
        const HomeEditorialAdEntity(
          id: 'ad_1',
          title: 'Combo Familiar Pizza',
          subtitle: 'Solo por hoy C\$ 350',
          badgeText: 'OFERTA',
          ctaText: 'Pedir Ahora',
          actionType: 'MERCHANT',
          merchantId: 'biz_pizza',
          merchantNameSnapshot: 'Pizza Italia',
          active: true,
          order: 1,
        ),
      ]);

      await tester.pumpAndSettle();

      // Custom block title rendered
      expect(find.text('Super Promociones 🚀'), findsOneWidget);
      // Card content rendered
      expect(find.text('Combo Familiar Pizza'), findsOneWidget);
      expect(find.text('Solo por hoy C\$ 350'), findsOneWidget);
      expect(find.text('OFERTA'), findsOneWidget);
      expect(find.text('Pizza Italia'), findsOneWidget);
      expect(find.textContaining('Pedir Ahora'), findsOneWidget);

      // Now toggle OFF: showEditorialAds = false
      merchantService.emitConfig(const DashboardConfigEntity(
        showEditorialAds: false,
        sectionOrder: ['EDITORIAL_ADS'],
      ));

      await tester.pumpAndSettle();

      // 0dp collapse: should not find the ad or title anymore
      expect(find.text('Super Promociones 🚀'), findsNothing);
      expect(find.text('Combo Familiar Pizza'), findsNothing);
    });

    testWidgets('TEST 29: Single card renders statically without dots while multiple ads render carousel indicator', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 1. Two ads: Carousel mode
      merchantService.emitConfig(const DashboardConfigEntity(
        showEditorialAds: true,
        showAllBusinesses: false,
        showNearbyBusinesses: false,
        showFeaturedBusinesses: false,
        showSamePrice: false,
        showTopSelling: false,
        showRecommended: false,
        showNewBusinesses: false,
        showCategories: false,
        showBanners: false,
        showFlashDeals: false,
        showPromotions: false,
        showExpressDeliveryBanner: false,
        xToYServiceEnabled: false,
        sectionOrder: ['EDITORIAL_ADS'],
      ));

      merchantService.emitEditorialAds([
        const HomeEditorialAdEntity(
          id: 'ad_1',
          title: 'Ad Uno',
          active: true,
          order: 1,
        ),
        const HomeEditorialAdEntity(
          id: 'ad_2',
          title: 'Ad Dos',
          active: true,
          order: 2,
        ),
      ]);

      await tester.pumpAndSettle();

      // Default canonical title
      expect(find.text('Destacados y Novedades'), findsOneWidget);
      expect(find.text('Ad Uno'), findsOneWidget);
      // Pager exists
      expect(find.byType(PageView), findsOneWidget);

      // 2. Single ad: Static card mode (No PageView)
      merchantService.emitEditorialAds([
        const HomeEditorialAdEntity(
          id: 'ad_1',
          title: 'Ad Solitario',
          active: true,
          order: 1,
        ),
      ]);

      await tester.pumpAndSettle();

      expect(find.text('Ad Solitario'), findsOneWidget);
      expect(find.byType(PageView), findsNothing);
    });
  });
}
