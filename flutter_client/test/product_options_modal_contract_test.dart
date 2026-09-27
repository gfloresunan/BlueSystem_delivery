/// BLUE SYSTEM DELIVERY ENTERPRISE — GAP-CAT-02 CONTRACT TESTS
/// Validates Product Options / Variants parsing, price calculation, and modal selection (1:1 Android ComercioDetalleScreen.kt).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';
import 'package:bluesystem_delivery_flutter/domain/services/core_service_interfaces.dart';
import 'package:bluesystem_delivery_flutter/presentation/screens/merchant/merchant_detail_screen.dart';

class MockMerchantService implements IMerchantService {
  final List<ProductEntity> products;
  final List<BranchEntity> branches;
  final BusinessEntity? business;

  MockMerchantService({
    this.products = const [],
    this.branches = const [],
    this.business,
  });

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) => Stream.value(business);

  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) =>
      Stream.value(branches);

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) =>
      Stream.value(products);

  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) => Stream.value([]);

  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) => Stream.value(products);

  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) => Stream.value([]);

  @override
  Stream<List<BranchEntity>> watchAllBranches({required String tenantId}) => Stream.value(branches);

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
}

void main() {
  group('GAP-CAT-02: Product Options & Variants Domain Contract Tests', () {
    test('OptionItemEntity & OptionGroupEntity parse raw map conforming to Android OptionGroupDto', () {
      final rawGroup = {
        'id': 'grp_tamano',
        'restaurantId': 'biz_pizza',
        'name': 'Tamaño de Pizza',
        'description': 'Selecciona el tamaño',
        'minSelection': 1,
        'maxSelection': 1,
        'isRequired': true,
        'options': [
          {
            'id': 'opt_mediana',
            'groupId': 'grp_tamano',
            'name': 'Mediana (8 Porciones)',
            'additionalPrice': 0.0,
            'isDefault': true,
          },
          {
            'id': 'opt_familiar',
            'groupId': 'grp_tamano',
            'name': 'Familiar (12 Porciones)',
            'additionalPrice': 80.0,
            'isDefault': false,
          },
        ],
      };

      final group = OptionGroupEntity.fromMap(rawGroup);
      expect(group.id, 'grp_tamano');
      expect(group.name, 'Tamaño de Pizza');
      expect(group.isRequired, true);
      expect(group.isSingleChoice, true);
      expect(group.options.length, 2);

      final opt1 = group.options[0];
      expect(opt1.name, 'Mediana (8 Porciones)');
      expect(opt1.additionalPrice, 0.0);
      expect(opt1.isFree, true);
      expect(opt1.isDefault, true);

      final opt2 = group.options[1];
      expect(opt2.name, 'Familiar (12 Porciones)');
      expect(opt2.additionalPrice, 80.0);
      expect(opt2.isFree, false);
    });

    test('ProductEntity parses optionGroups into parsedOptionGroups correctly', () {
      final rawProduct = {
        'productId': 'prod_hamburguesa',
        'name': 'Hamburguesa Suprema',
        'price': 150.0,
        'optionGroups': [
          {
            'id': 'grp_extra',
            'name': 'Extras',
            'isRequired': false,
            'maxSelection': 3,
            'options': [
              {'id': 'opt_queso', 'name': 'Queso Extra', 'additionalPrice': 25.0},
              {'id': 'opt_tocino', 'name': 'Tocino Crujiente', 'additionalPrice': 35.0},
            ],
          },
        ],
      };

      final product = ProductEntity.fromMap(rawProduct, 'prod_hamburguesa');
      expect(product.optionGroups.length, 1);
      expect(product.parsedOptionGroups.length, 1);
      expect(product.parsedOptionGroups.first.name, 'Extras');
      expect(product.parsedOptionGroups.first.options.length, 2);
    });

    test('ProductEntity.calculatedTotalPrice accumulates selectedOptions on top of base price', () {
      const baseProduct = ProductEntity(
        productId: 'prod_1',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        name: 'Pizza Especial',
        description: 'Deliciosa pizza',
        price: 200.0,
        category: 'Pizzas',
        createdAt: 0,
        updatedAt: 0,
      );

      expect(baseProduct.calculatedTotalPrice, 200.0);

      final configuredProduct = baseProduct.copyWith(
        selectedOptions: [
          const SelectedOptionEntity(
            optionGroupId: 'grp_size',
            optionGroupName: 'Tamaño',
            optionId: 'opt_fam',
            optionName: 'Familiar',
            additionalPrice: 80.0,
            finalPrice: 80.0,
          ),
          const SelectedOptionEntity(
            optionGroupId: 'grp_cheese',
            optionGroupName: 'Borde',
            optionId: 'opt_borde',
            optionName: 'Borde de Queso',
            additionalPrice: 40.0,
            finalPrice: 40.0,
          ),
        ],
      );

      expect(configuredProduct.calculatedTotalPrice, 320.0);
    });
  });

  group('GAP-CAT-02: Widget & Modal Interaction Tests', () {
    testWidgets('Tapping + on product WITHOUT options calls onAddToCart directly', (tester) async {
      ProductEntity? addedProduct;
      String? addedBiz;

      const productWithoutOptions = ProductEntity(
        productId: 'prod_simple',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        businessName: 'Mi Tienda',
        name: 'Gaseosa 500ml',
        description: 'Bebida fría',
        price: 35.0,
        category: 'Bebidas',
        isAvailable: true,
        createdAt: 0,
        updatedAt: 0,
        optionGroups: [],
      );

      final mockService = MockMerchantService(
        products: [productWithoutOptions],
        business: const BusinessEntity(
          businessId: 'biz_1',
          tenantId: 'ten_core',
          name: 'Mi Tienda',
          category: 'Restaurante',
          address: 'Managua',
          phone: '1234',
          description: '',
        ),
      );

      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDetailScreen(
            businessId: 'biz_1',
            merchantService: mockService,
            onAddToCart: (p, b) {
              addedProduct = p;
              addedBiz = b;
            },
            onBack: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Find the add button for the simple product
      final addBtn = find.byKey(const Key('product_add_prod_simple'));
      expect(addBtn, findsOneWidget);

      await tester.tap(addBtn);
      await tester.pump();

      expect(addedProduct, isNotNull);
      expect(addedProduct!.productId, 'prod_simple');
      expect(addedBiz, 'Mi Tienda');
      // No bottom sheet modal should be shown
      expect(find.byKey(const Key('add_configured_product_button')), findsNothing);
    });

    testWidgets('Tapping + on product WITH options opens Options Bottom Sheet and enforces required choice', (tester) async {
      ProductEntity? addedProduct;

      const productWithOptions = ProductEntity(
        productId: 'prod_opt',
        tenantId: 'ten_core',
        businessId: 'biz_1',
        businessName: 'Pizzería Central',
        name: 'Pizza Artesanal',
        description: 'Masa madre',
        price: 250.0,
        category: 'Pizzas',
        isAvailable: true,
        createdAt: 0,
        updatedAt: 0,
        optionGroups: [
          {
            'id': 'grp_size',
            'name': 'Tamaño Obligatorio',
            'isRequired': true,
            'maxSelection': 1,
            'options': [
              {'id': 'opt_med', 'name': 'Mediana', 'additionalPrice': 0.0},
              {'id': 'opt_fam', 'name': 'Familiar', 'additionalPrice': 90.0},
            ],
          },
        ],
      );

      final mockService = MockMerchantService(
        products: [productWithOptions],
        business: const BusinessEntity(
          businessId: 'biz_1',
          tenantId: 'ten_core',
          name: 'Pizzería Central',
          category: 'Restaurante',
          address: 'Managua',
          phone: '1234',
          description: '',
        ),
      );

      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: MerchantDetailScreen(
            businessId: 'biz_1',
            merchantService: mockService,
            onAddToCart: (p, _) {
              addedProduct = p;
            },
            onBack: () {},
          ),
        ),
      );

      await tester.pumpAndSettle();

      final addBtn = find.byKey(const Key('product_add_prod_opt'));
      expect(addBtn, findsOneWidget);

      // Tap + button
      await tester.tap(addBtn);
      await tester.pumpAndSettle();

      // Bottom sheet modal should be opened
      expect(find.text('Tamaño Obligatorio'), findsOneWidget);
      expect(find.text('Mediana'), findsOneWidget);
      expect(find.text('Familiar'), findsOneWidget);
      expect(find.text('+C\$ 90'), findsOneWidget);

      final confirmBtn = find.byKey(const Key('add_configured_product_button'));
      expect(confirmBtn, findsOneWidget);

      // Initially no option is selected and it is required, so button should prompt to select
      expect(find.text('Selecciona las opciones requeridas'), findsOneWidget);

      // Select 'Familiar' (+C$ 90)
      final famOption = find.byKey(const Key('option_opt_fam'));
      await tester.tap(famOption);
      await tester.pumpAndSettle();

      // Button should now show the total: 250 + 90 = 340
      expect(find.text('Agregar al Carrito • C\$ 340'), findsOneWidget);

      // Tap confirm button
      await tester.tap(confirmBtn);
      await tester.pumpAndSettle();

      // Modal closed, onAddToCart invoked with selected option
      expect(addedProduct, isNotNull);
      expect(addedProduct!.selectedOptions.length, 1);
      expect(addedProduct!.selectedOptions.first.optionId, 'opt_fam');
      expect(addedProduct!.selectedOptions.first.additionalPrice, 90.0);
      expect(addedProduct!.calculatedTotalPrice, 340.0);
    });
  });
}
