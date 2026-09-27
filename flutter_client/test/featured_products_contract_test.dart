import 'package:flutter_test/flutter_test.dart';
import 'package:bluesystem_delivery_flutter/domain/entities/catalog_entity.dart';

void main() {
  group('GAP-CAT-01: Featured Products & Fixtures Filter Contract Tests', () {
    // Helper function that mirrors the combined resolution logic from MerchantFirestoreService.watchFeaturedProducts
    List<ProductEntity> filterAndCombineFeaturedProducts({
      required Map<String, Map<String, dynamic>> configuredFeaturedDocs,
      required Map<String, Map<String, dynamic>> realProductsMap,
      required Map<String, String> businessNamesMap,
      required String tenantId,
    }) {
      final resultList = <ProductEntity>[];
      final handledProductIds = <String>{};

      // 1. Process elements configured explicitly in /featuredProducts (1:1 Android FirebaseManager.kt:1957)
      for (final entry in configuredFeaturedDocs.entries) {
        final docId = entry.key;
        final fpData = entry.value;

        final isActive = fpData['active'] as bool? ?? fpData['isActive'] as bool? ?? true;
        if (!isActive) continue;

        final pId = (fpData['productId'] as String? ?? '').trim().isNotEmpty
            ? (fpData['productId'] as String).trim()
            : docId;

        final liveProdData = realProductsMap[pId];

        if (liveProdData != null) {
          final liveStatus = (liveProdData['status'] as String? ?? '').trim().toUpperCase();
          final liveLifecycle = (liveProdData['lifecycleStatus'] as String? ?? '').trim().toUpperCase();
          final liveIsActive = liveProdData['active'] as bool? ?? liveProdData['isActive'] as bool? ?? true;
          final liveIsAvail = liveProdData['isAvailable'] as bool? ?? liveProdData['available'] as bool? ?? true;
          final isHidden = liveProdData['isHidden'] as bool? ?? false;

          if (liveStatus == 'DELETED' ||
              liveLifecycle == 'DELETED' ||
              liveStatus == 'INACTIVE' ||
              !liveIsActive ||
              !liveIsAvail ||
              isHidden) {
            continue;
          }

          final name = (liveProdData['name'] as String? ??
                  liveProdData['nombre'] as String? ??
                  fpData['name'] as String? ??
                  '')
              .trim();
          final price = (liveProdData['price'] as num?)?.toDouble() ??
              (liveProdData['precio'] as num?)?.toDouble() ??
              0.0;
          final bId = (liveProdData['businessId'] as String? ?? fpData['businessId'] as String? ?? '').trim();

          final product = ProductEntity.fromMap({
            ...liveProdData,
            'productId': pId,
            'name': name,
            'price': price,
            'businessId': bId,
            'businessName': businessNamesMap[bId] ?? (fpData['businessName'] as String? ?? 'Comercio'),
            'isPopular': true,
          }, pId);

          if (!product.isValidPublicProduct()) continue;

          // Multi-tenant check
          final prodTenant = product.tenantId.trim();
          if (tenantId.isNotEmpty &&
              prodTenant.isNotEmpty &&
              prodTenant != 'GLOBAL' &&
              prodTenant != tenantId) {
            continue;
          }

          resultList.add(product);
          handledProductIds.add(pId);
        } else {
          final name = (fpData['name'] as String? ?? fpData['nombre'] as String? ?? '').trim();
          final price = (fpData['price'] as num?)?.toDouble() ?? (fpData['precio'] as num?)?.toDouble() ?? 0.0;
          final bId = (fpData['businessId'] as String? ?? '').trim();

          final product = ProductEntity.fromMap({
            ...fpData,
            'productId': pId,
            'name': name,
            'price': price,
            'businessId': bId,
            'businessName': businessNamesMap[bId] ?? (fpData['businessName'] as String? ?? 'Comercio'),
            'isPopular': true,
          }, pId);

          if (!product.isValidPublicProduct()) continue;

          final prodTenant = product.tenantId.trim();
          if (tenantId.isNotEmpty &&
              prodTenant.isNotEmpty &&
              prodTenant != 'GLOBAL' &&
              prodTenant != tenantId) {
            continue;
          }

          resultList.add(product);
          handledProductIds.add(pId);
        }
      }

      // 2. Process products in /products with isPopular/isTopSeller/isFeatured flags (1:1 Android FirebaseManager.kt:1996)
      for (final entry in realProductsMap.entries) {
        final pId = entry.key;
        if (handledProductIds.contains(pId)) continue;

        final prodData = entry.value;

        final isFeaturedFlag = (prodData['isPopular'] as bool? ?? false) ||
            (prodData['isTopSeller'] as bool? ?? false) ||
            (prodData['isFeatured'] as bool? ?? false) ||
            (prodData['destacado'] as bool? ?? false) ||
            (prodData['popular'] as bool? ?? false);

        if (!isFeaturedFlag) continue;

        final status = (prodData['status'] as String? ?? '').trim().toUpperCase();
        final lifecycle = (prodData['lifecycleStatus'] as String? ?? '').trim().toUpperCase();
        final isActive = prodData['active'] as bool? ?? prodData['isActive'] as bool? ?? true;
        final isAvail = prodData['isAvailable'] as bool? ?? prodData['available'] as bool? ?? true;
        final isHidden = prodData['isHidden'] as bool? ?? false;

        if (status == 'DELETED' ||
            lifecycle == 'DELETED' ||
            status == 'INACTIVE' ||
            !isActive ||
            !isAvail ||
            isHidden) {
          continue;
        }

        final bId = (prodData['businessId'] as String? ??
                prodData['restaurantId'] as String? ??
                prodData['comercioId'] as String? ??
                '')
            .trim();
        final bName = businessNamesMap[bId] ?? (prodData['businessName'] as String? ?? 'Comercio');

        final product = ProductEntity.fromMap({
          ...prodData,
          'productId': pId,
          'businessId': bId,
          'businessName': bName,
          'isPopular': true,
        }, pId);

        if (!product.isValidPublicProduct()) continue;

        final prodTenant = product.tenantId.trim();
        if (tenantId.isNotEmpty &&
            prodTenant.isNotEmpty &&
            prodTenant != 'GLOBAL' &&
            prodTenant != tenantId) {
          continue;
        }

        resultList.add(product);
        handledProductIds.add(pId);
      }

      return resultList;
    }

    test('Identifies and discards test fixtures ("aldrich", "matio", "test", "prueba")', () {
      final aldrich = ProductEntity.fromMap({
        'name': 'aldrich',
        'price': 0.0,
        'businessId': 'biz_test',
        'isAvailable': true,
      }, 'p_aldrich');

      final matio = ProductEntity.fromMap({
        'name': 'matio',
        'price': 0.0,
        'businessId': 'biz_test',
        'isAvailable': true,
      }, 'p_matio');

      final legitimateDish = ProductEntity.fromMap({
        'name': 'Plato Mixto Cerdo y Res',
        'price': 280.0,
        'businessId': 'biz_chanchito',
        'isAvailable': true,
      }, 'p_real');

      expect(aldrich.isTestFixture(), isTrue);
      expect(aldrich.isValidPublicProduct(), isFalse);

      expect(matio.isTestFixture(), isTrue);
      expect(matio.isValidPublicProduct(), isFalse);

      expect(legitimateDish.isTestFixture(), isFalse);
      expect(legitimateDish.isValidPublicProduct(), isTrue);
    });

    test('Discards products with price <= 0 or empty businessId', () {
      final zeroPrice = ProductEntity.fromMap({
        'name': 'Hamburguesa Gratis Demo',
        'price': 0.0,
        'businessId': 'biz_fritoni',
        'isAvailable': true,
      }, 'p_free');

      final orphanProduct = ProductEntity.fromMap({
        'name': 'Papas Fritas Huérfanas',
        'price': 60.0,
        'businessId': '',
        'isAvailable': true,
      }, 'p_orphan');

      expect(zeroPrice.isValidPublicProduct(), isFalse);
      expect(orphanProduct.isValidPublicProduct(), isFalse);
    });

    test('Discards products marked DELETED, INACTIVE, or isHidden', () {
      final configuredFeatured = {
        'fp_1': {
          'productId': 'prod_deleted',
          'active': true,
        },
        'fp_2': {
          'productId': 'prod_hidden',
          'active': true,
        },
      };

      final realProducts = {
        'prod_deleted': {
          'name': 'Producto Eliminado',
          'price': 100.0,
          'businessId': 'biz_1',
          'status': 'DELETED',
          'isAvailable': true,
        },
        'prod_hidden': {
          'name': 'Producto Oculto',
          'price': 150.0,
          'businessId': 'biz_1',
          'status': 'ACTIVE',
          'isHidden': true,
          'isAvailable': true,
        },
      };

      final results = filterAndCombineFeaturedProducts(
        configuredFeaturedDocs: configuredFeatured,
        realProductsMap: realProducts,
        businessNamesMap: {'biz_1': 'Restaurante Central'},
        tenantId: 'ten_core',
      );

      expect(results, isEmpty);
    });

    test('Enriches featured products with canonical businessName from /businesses', () {
      final configuredFeatured = {
        'fp_star': {
          'productId': 'prod_carne_asada',
          'active': true,
        },
      };

      final realProducts = {
        'prod_carne_asada': {
          'name': 'Carne Asada con Tajadas',
          'price': 250.0,
          'businessId': 'biz_el_chanchito',
          'status': 'ACTIVE',
          'isAvailable': true,
          'imageUrl': 'https://storage.googleapis.com/bluesystem/carne.jpg',
        },
      };

      final businessNames = {
        'biz_el_chanchito': 'El Chanchito Restaurante',
      };

      final results = filterAndCombineFeaturedProducts(
        configuredFeaturedDocs: configuredFeatured,
        realProductsMap: realProducts,
        businessNamesMap: businessNames,
        tenantId: 'ten_core',
      );

      expect(results.length, equals(1));
      expect(results.first.name, equals('Carne Asada con Tajadas'));
      expect(results.first.businessName, equals('El Chanchito Restaurante'));
      expect(results.first.isPopular, isTrue);
    });

    test('Includes popular catalog items from /products without duplicating configured featured items', () {
      final configuredFeatured = {
        'fp_star': {
          'productId': 'prod_1',
          'active': true,
        },
      };

      final realProducts = {
        'prod_1': {
          'name': 'Producto Destacado Explícito',
          'price': 200.0,
          'businessId': 'biz_1',
          'status': 'ACTIVE',
          'isAvailable': true,
          'isPopular': true,
        },
        'prod_2': {
          'name': 'Producto Popular Orgánico',
          'price': 180.0,
          'businessId': 'biz_1',
          'status': 'ACTIVE',
          'isAvailable': true,
          'isTopSeller': true,
        },
        'prod_normal': {
          'name': 'Producto Normal No Destacado',
          'price': 90.0,
          'businessId': 'biz_1',
          'status': 'ACTIVE',
          'isAvailable': true,
          'isPopular': false,
          'isTopSeller': false,
        },
      };

      final results = filterAndCombineFeaturedProducts(
        configuredFeaturedDocs: configuredFeatured,
        realProductsMap: realProducts,
        businessNamesMap: {'biz_1': 'Restaurante Central'},
        tenantId: 'ten_core',
      );

      expect(results.length, equals(2));
      final names = results.map((p) => p.name).toList();
      expect(names, contains('Producto Destacado Explícito'));
      expect(names, contains('Producto Popular Orgánico'));
      expect(names.contains('Producto Normal No Destacado'), isFalse);
    });

    test('Enforces multi-tenant isolation on featured products', () {
      final realProducts = {
        'prod_mga': {
          'name': 'Plato Managua',
          'price': 150.0,
          'businessId': 'biz_mga',
          'status': 'ACTIVE',
          'isAvailable': true,
          'isPopular': true,
          'tenantId': 'ten_managua',
        },
        'prod_leon': {
          'name': 'Plato León',
          'price': 160.0,
          'businessId': 'biz_leon',
          'status': 'ACTIVE',
          'isAvailable': true,
          'isPopular': true,
          'tenantId': 'ten_leon',
        },
      };

      final resultsMga = filterAndCombineFeaturedProducts(
        configuredFeaturedDocs: {},
        realProductsMap: realProducts,
        businessNamesMap: {'biz_mga': 'Biz MGA', 'biz_leon': 'Biz León'},
        tenantId: 'ten_managua',
      );

      expect(resultsMga.length, equals(1));
      expect(resultsMga.first.name, equals('Plato Managua'));
    });
  });
}
