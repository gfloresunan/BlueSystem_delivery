/// BLUE SYSTEM DELIVERY ENTERPRISE — MERCHANT & CATALOG FIRESTORE SERVICE
/// Implements IMerchantService with multi-tenant isolation and 1:1 Android parity.

import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/catalog_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class MerchantFirestoreService implements IMerchantService {
  final FirebaseFirestore _firestore;

  MerchantFirestoreService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<List<BusinessEntity>> watchBusinesses({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching canonical businesses for tenant: $tenantId');
    return _firestore.collection('businesses').snapshots().map((snap) {
      final list = <BusinessEntity>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        final entity = BusinessEntity.fromMap(data, doc.id);

        // Strict 1:1 Android Parity Filter (ADR-016 / BusinessRepository.kt)
        if (!entity.isValidPublicCatalogItem()) continue;

        // Filter test fixtures / E2E mock creations
        final isTesting = data['isTesting'] as bool? ?? data['isTest'] as bool? ?? false;
        if (isTesting) continue;
        if (entity.name.contains('Certificado E2E') || entity.name.contains('Certificación E2E')) continue;

        list.add(entity);
      }
      return list;
    });
  }

  @override
  Stream<BusinessEntity?> watchBusiness(String businessId) {
    if (businessId.isEmpty) return Stream.value(null);

    final candidateId = businessId.startsWith('biz_')
        ? businessId.substring(4)
        : 'biz_$businessId';

    return _firestore.collection('businesses').doc(businessId).snapshots().asyncMap((doc) async {
      if (doc.exists && doc.data() != null) {
        return BusinessEntity.fromMap(doc.data()!, doc.id);
      }
      // Fallback to alternate ID
      final altDoc = await _firestore.collection('businesses').doc(candidateId).get();
      if (altDoc.exists && altDoc.data() != null) {
        return BusinessEntity.fromMap(altDoc.data()!, altDoc.id);
      }
      // Fallback to /users collection
      final userDoc = await _firestore.collection('users').doc(businessId).get();
      if (userDoc.exists && userDoc.data() != null) {
        return BusinessEntity.fromMap(userDoc.data()!, userDoc.id);
      }
      return null;
    });
  }

  @override
  Future<List<ProductEntity>> getProductsForBusiness(String businessId, {required String tenantId}) async {
    try {
      final candidateIds = <String>{businessId.trim()};
      if (businessId.startsWith('biz_')) {
        candidateIds.add(businessId.substring(4).trim());
      } else {
        candidateIds.add('biz_${businessId.trim()}');
      }

      final resultsMap = <String, ProductEntity>{};

      for (final bId in candidateIds) {
        if (bId.isEmpty) continue;
        // 1. Where businessId == bId
        final snap1 = await _firestore.collection('products').where('businessId', isEqualTo: bId).get();
        for (final d in snap1.docs) {
          final p = ProductEntity.fromMap(d.data(), d.id);
          if (p.isAvailable && !d.data()['status'].toString().toUpperCase().contains('DELETED')) {
            resultsMap[p.productId] = p;
          }
        }
        // 2. Where restaurantId == bId
        final snap2 = await _firestore.collection('products').where('restaurantId', isEqualTo: bId).get();
        for (final d in snap2.docs) {
          final p = ProductEntity.fromMap(d.data(), d.id);
          if (p.isAvailable && !d.data()['status'].toString().toUpperCase().contains('DELETED')) {
            resultsMap[p.productId] = p;
          }
        }
        // 3. Where comercioId == bId
        final snap3 = await _firestore.collection('products').where('comercioId', isEqualTo: bId).get();
        for (final d in snap3.docs) {
          final p = ProductEntity.fromMap(d.data(), d.id);
          if (p.isAvailable && !d.data()['status'].toString().toUpperCase().contains('DELETED')) {
            resultsMap[p.productId] = p;
          }
        }
      }

      return resultsMap.values.toList();
    } catch (e, st) {
      AppLogger.error('MerchantFirestoreService', 'Error getting products for business: $businessId', e, st);
      return [];
    }
  }

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching real products for business: $businessId');
    if (businessId.isEmpty) return Stream.value([]);

    // Query candidate IDs across businessId, restaurantId, and comercioId
    final candidateIds = <String>{businessId.trim()};
    if (businessId.startsWith('biz_')) {
      candidateIds.add(businessId.substring(4).trim());
    } else {
      candidateIds.add('biz_${businessId.trim()}');
    }

    // Stream all products where businessId is in candidateIds
    return _firestore.collection('products').snapshots().map((snap) {
      final list = <ProductEntity>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        final status = (data['status'] as String? ?? '').trim().toUpperCase();
        if (status == 'DELETED') continue;

        final docBizId = (data['businessId'] as String? ?? '').trim();
        final docRestId = (data['restaurantId'] as String? ?? '').trim();
        final docComId = (data['comercioId'] as String? ?? '').trim();

        final matches = candidateIds.contains(docBizId) ||
            candidateIds.contains(docRestId) ||
            candidateIds.contains(docComId);

        if (matches) {
          list.add(ProductEntity.fromMap(data, doc.id));
        }
      }
      return list;
    });
  }

  @override
  Stream<List<ProductEntity>> watchAllActiveProducts({required String tenantId}) {
    return _firestore.collection('products').snapshots().map((snap) {
      final list = <ProductEntity>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        final status = (data['status'] as String? ?? '').trim().toUpperCase();
        final lifecycle = (data['lifecycleStatus'] as String? ?? '').trim().toUpperCase();
        if (status == 'DELETED' || lifecycle == 'DELETED' || status == 'INACTIVE') continue;

        final product = ProductEntity.fromMap(data, doc.id);
        if (!product.isValidPublicProduct()) continue;

        if (tenantId.isNotEmpty &&
            product.tenantId.isNotEmpty &&
            product.tenantId != 'GLOBAL' &&
            product.tenantId != tenantId) {
          continue;
        }

        list.add(product);
      }
      return list;
    });
  }

  @override
  Stream<List<ProductEntity>> watchFeaturedProducts({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching canonical featured products for tenant: $tenantId');

    // ignore: close_sinks
    late StreamController<List<ProductEntity>> controller;
    StreamSubscription? subFeatured;
    StreamSubscription? subProducts;
    StreamSubscription? subBusinesses;

    final configuredFeaturedDocs = <String, Map<String, dynamic>>{};
    final realProductsMap = <String, Map<String, dynamic>>{};
    final businessNamesMap = <String, String>{};

    void emitCombined() {
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

          if (liveStatus == 'DELETED' || liveLifecycle == 'DELETED' || liveStatus == 'INACTIVE' || !liveIsActive || !liveIsAvail || isHidden) {
            continue;
          }

          final name = (liveProdData['name'] as String? ?? liveProdData['nombre'] as String? ?? fpData['name'] as String? ?? '').trim();
          final price = (liveProdData['price'] as num?)?.toDouble() ?? (liveProdData['precio'] as num?)?.toDouble() ?? 0.0;
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
          if (tenantId.isNotEmpty && prodTenant.isNotEmpty && prodTenant != 'GLOBAL' && prodTenant != tenantId) {
            continue;
          }

          resultList.add(product);
          handledProductIds.add(pId);
        } else {
          // Backup snapshot from /featuredProducts doc directly if /products hasn't loaded yet
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
          if (tenantId.isNotEmpty && prodTenant.isNotEmpty && prodTenant != 'GLOBAL' && prodTenant != tenantId) {
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

        if (status == 'DELETED' || lifecycle == 'DELETED' || status == 'INACTIVE' || !isActive || !isAvail || isHidden) {
          continue;
        }

        final bId = (prodData['businessId'] as String? ?? prodData['restaurantId'] as String? ?? prodData['comercioId'] as String? ?? '').trim();
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
        if (tenantId.isNotEmpty && prodTenant.isNotEmpty && prodTenant != 'GLOBAL' && prodTenant != tenantId) {
          continue;
        }

        resultList.add(product);
        handledProductIds.add(pId);
      }

      if (!controller.isClosed) {
        controller.add(resultList);
      }
    }

    controller = StreamController<List<ProductEntity>>.broadcast(
      onListen: () {
        subBusinesses = _firestore.collection('businesses').snapshots().listen(
          (snap) {
            for (final doc in snap.docs) {
              final data = doc.data();
              final name = (data['name'] as String? ?? data['nombre'] as String? ?? '').trim();
              if (name.isNotEmpty) businessNamesMap[doc.id] = name;
            }
            emitCombined();
          },
          onError: (e, st) {
            AppLogger.error('MerchantFirestoreService', 'Error watching businesses for featured products', e, st);
          },
        );

        subFeatured = _firestore.collection('featuredProducts').snapshots().listen(
          (snap) {
            configuredFeaturedDocs.clear();
            for (final doc in snap.docs) {
              configuredFeaturedDocs[doc.id] = doc.data();
            }
            emitCombined();
          },
          onError: (e, st) {
            AppLogger.error('MerchantFirestoreService', 'Error watching featuredProducts', e, st);
            // Non-fatal if collection is empty or unpopulated; fallback to realProductsMap
            emitCombined();
          },
        );

        subProducts = _firestore.collection('products').snapshots().listen(
          (snap) {
            realProductsMap.clear();
            for (final doc in snap.docs) {
              realProductsMap[doc.id] = doc.data();
            }
            emitCombined();
          },
          onError: (e, st) {
            AppLogger.error('MerchantFirestoreService', 'Error watching products for featured products', e, st);
            if (!controller.isClosed) controller.addError(e, st);
          },
        );
      },
      onCancel: () async {
        await subFeatured?.cancel();
        await subProducts?.cancel();
        await subBusinesses?.cancel();
        await controller.close();
      },
    );

    return controller.stream;
  }

  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching branches for business: $businessId');
    final candidateIds = <String>{businessId.trim()};
    if (businessId.startsWith('biz_')) {
      candidateIds.add(businessId.substring(4).trim());
    } else {
      candidateIds.add('biz_${businessId.trim()}');
    }

    return _firestore.collection('branches').snapshots().map((snap) {
      final list = <BranchEntity>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        final bId = (data['businessId'] as String? ?? '').trim();
        if (candidateIds.contains(bId)) {
          list.add(BranchEntity.fromMap(data, doc.id));
        }
      }
      return list;
    });
  }

  @override
  Stream<List<BranchEntity>> watchAllBranches({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching all active branches');
    return _firestore.collection('branches').snapshots().map((snap) {
      final list = <BranchEntity>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        final isActive = data['active'] as bool? ?? data['isActive'] as bool? ?? true;
        if (!isActive) continue;
        list.add(BranchEntity.fromMap(data, doc.id));
      }
      return list;
    });
  }

  @override
  Stream<DashboardConfigEntity> watchDashboardConfig({String? tenantId}) {
    final effectiveTenantId = tenantId?.trim().isNotEmpty == true && tenantId != 'GLOBAL'
        ? tenantId!.trim()
        : null;

    if (effectiveTenantId != null) {
      // 1:1 Android FirebaseManager.kt: Continuously track global config as base and merge tenant overrides
      return _firestore
          .collection('dashboard')
          .doc('configuration')
          .snapshots()
          .asyncExpand((globalSnap) {
        final globalConfig = (globalSnap.exists && globalSnap.data() != null)
            ? DashboardConfigEntity.fromMap(globalSnap.data()!)
            : const DashboardConfigEntity();

        return _firestore
            .collection('tenants')
            .doc(effectiveTenantId)
            .collection('dashboard')
            .doc('configuration')
            .snapshots()
            .map((tenantSnap) {
          if (tenantSnap.exists && tenantSnap.data() != null) {
            try {
              return DashboardConfigEntity.fromMap(tenantSnap.data()!, base: globalConfig);
            } catch (e) {
              AppLogger.warn('MerchantFirestoreService', 'Error parsing tenant config, fallback to global: $e');
              return globalConfig;
            }
          }
          return globalConfig;
        });
      });
    }

    return _firestore
        .collection('dashboard')
        .doc('configuration')
        .snapshots()
        .map((snap) {
      if (snap.exists && snap.data() != null) {
        return DashboardConfigEntity.fromMap(snap.data()!);
      }
      return const DashboardConfigEntity();
    });
  }

  @override
  Stream<List<FlashDealEntity>> watchFlashDeals({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching flash deals from /flashDeals');

    // ignore: close_sinks
    late StreamController<List<FlashDealEntity>> controller;
    StreamSubscription? subDeals;
    StreamSubscription? subProducts;
    StreamSubscription? subBusinesses;

    final configuredDeals = <String, Map<String, dynamic>>{};
    final realProductsMap = <String, Map<String, dynamic>>{};
    final businessNamesMap = <String, String>{};

    void emitCombined() {
      final resultList = <FlashDealEntity>[];

      for (final entry in configuredDeals.entries) {
        final docId = entry.key;
        final dealData = entry.value;

        final rawDeal = FlashDealEntity.fromMap(dealData, docId);
        if (!rawDeal.isCurrentlyValid()) continue;

        final pId = rawDeal.productId.isNotEmpty ? rawDeal.productId : docId;
        final liveProdData = realProductsMap[pId];

        if (liveProdData != null) {
          final liveStatus = (liveProdData['status'] as String? ?? '').trim().toUpperCase();
          final liveIsActive = liveProdData['active'] as bool? ?? liveProdData['isActive'] as bool? ?? true;
          final liveIsAvail = liveProdData['isAvailable'] as bool? ?? liveProdData['available'] as bool? ?? true;
          final isHidden = liveProdData['isHidden'] as bool? ?? false;

          if (liveStatus == 'DELETED' || liveStatus == 'INACTIVE' || !liveIsActive || !liveIsAvail || isHidden) {
            continue;
          }

          final bId = (liveProdData['businessId'] as String? ?? rawDeal.businessId).trim();
          final bName = businessNamesMap[bId] ?? rawDeal.businessName;
          final imgUrl = (liveProdData['imageUrl'] as String? ?? rawDeal.imageUrl).trim();
          final livePrice = (liveProdData['price'] as num?)?.toDouble() ?? rawDeal.price;
          final effectiveOrig = rawDeal.originalPrice > 0.0
              ? rawDeal.originalPrice
              : ((liveProdData['originalPrice'] as num?)?.toDouble() ?? livePrice);
          final effectiveFlash = rawDeal.price > 0.0 ? rawDeal.price : livePrice;

          String calcDiscountTag = rawDeal.discountTag;
          if (effectiveOrig > effectiveFlash && effectiveOrig > 0.0) {
            final pct = (((effectiveOrig - effectiveFlash) / effectiveOrig) * 100).toInt();
            calcDiscountTag = '-$pct%';
          }

          resultList.add(
            rawDeal.copyWith(
              productId: pId,
              title: rawDeal.title.isNotEmpty ? rawDeal.title : (liveProdData['name'] as String? ?? 'Oferta'),
              productName: (liveProdData['name'] as String? ?? rawDeal.productName),
              price: effectiveFlash,
              originalPrice: effectiveOrig,
              discountTag: calcDiscountTag,
              businessId: bId,
              businessName: bName,
              imageUrl: imgUrl,
            ),
          );
        } else if (rawDeal.title.isNotEmpty && rawDeal.price > 0) {
          final bName = businessNamesMap[rawDeal.businessId] ?? rawDeal.businessName;
          resultList.add(rawDeal.copyWith(businessName: bName));
        }
      }

      if (!controller.isClosed) {
        controller.add(resultList);
      }
    }

    controller = StreamController<List<FlashDealEntity>>.broadcast(
      onListen: () {
        subBusinesses = _firestore.collection('businesses').snapshots().listen(
          (snap) {
            for (final doc in snap.docs) {
              final data = doc.data();
              final name = (data['name'] as String? ?? data['nombre'] as String? ?? '').trim();
              if (name.isNotEmpty) businessNamesMap[doc.id] = name;
            }
            emitCombined();
          },
          onError: (e, st) => AppLogger.error('MerchantFirestoreService', 'Error in watchFlashDeals businesses', e, st),
        );

        subDeals = _firestore.collection('flashDeals').snapshots().listen(
          (snap) {
            configuredDeals.clear();
            for (final doc in snap.docs) {
              configuredDeals[doc.id] = doc.data();
            }
            emitCombined();
          },
          onError: (e, st) {
            AppLogger.error('MerchantFirestoreService', 'Error in watchFlashDeals', e, st);
            if (!controller.isClosed) controller.add([]);
          },
        );

        subProducts = _firestore.collection('products').snapshots().listen(
          (snap) {
            realProductsMap.clear();
            for (final doc in snap.docs) {
              realProductsMap[doc.id] = doc.data();
            }
            emitCombined();
          },
          onError: (e, st) => AppLogger.error('MerchantFirestoreService', 'Error in watchFlashDeals products', e, st),
        );
      },
      onCancel: () async {
        await subDeals?.cancel();
        await subProducts?.cancel();
        await subBusinesses?.cancel();
        await controller.close();
      },
    );

    return controller.stream;
  }

  @override
  Stream<List<ProductEntity>> watchDiscountedProducts({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching discounted products for tenant: $tenantId');

    // ignore: close_sinks
    late StreamController<List<ProductEntity>> controller;
    StreamSubscription? subProducts;
    StreamSubscription? subBusinesses;

    final realProductsMap = <String, Map<String, dynamic>>{};
    final businessNamesMap = <String, String>{};

    void emitCombined() {
      final list = <ProductEntity>[];

      for (final entry in realProductsMap.entries) {
        final prodData = entry.value;
        final origPrice = (prodData['originalPrice'] as num?)?.toDouble() ??
            (prodData['precioOriginal'] as num?)?.toDouble();
        final price = (prodData['price'] as num?)?.toDouble() ??
            (prodData['precio'] as num?)?.toDouble() ??
            0.0;

        if (origPrice == null || origPrice <= price || price <= 0.0) continue;

        final status = (prodData['status'] as String? ?? '').trim().toUpperCase();
        final isHidden = prodData['isHidden'] as bool? ?? false;
        final isActive = prodData['active'] as bool? ?? prodData['isActive'] as bool? ?? true;
        if (status == 'INACTIVE' || status == 'DELETED' || isHidden || !isActive) continue;

        final bId = (prodData['businessId'] as String? ?? prodData['restaurantId'] as String? ?? '').trim();
        final bName = businessNamesMap[bId] ?? (prodData['businessName'] as String? ?? 'Comercio');

        final product = ProductEntity.fromMap({
          ...prodData,
          'productId': entry.key,
          'businessId': bId,
          'businessName': bName,
          'originalPrice': origPrice,
          'price': price,
          'hasDiscount': true,
        }, entry.key);

        if (!product.isValidPublicProduct()) continue;
        list.add(product);
      }

      if (!controller.isClosed) {
        controller.add(list);
      }
    }

    controller = StreamController<List<ProductEntity>>.broadcast(
      onListen: () {
        subBusinesses = _firestore.collection('businesses').snapshots().listen(
          (snap) {
            for (final doc in snap.docs) {
              final data = doc.data();
              final name = (data['name'] as String? ?? data['nombre'] as String? ?? '').trim();
              if (name.isNotEmpty) businessNamesMap[doc.id] = name;
            }
            emitCombined();
          },
          onError: (e, st) => AppLogger.error('MerchantFirestoreService', 'Error in watchDiscountedProducts businesses', e, st),
        );

        subProducts = _firestore.collection('products').snapshots().listen(
          (snap) {
            realProductsMap.clear();
            for (final doc in snap.docs) {
              realProductsMap[doc.id] = doc.data();
            }
            emitCombined();
          },
          onError: (e, st) {
            AppLogger.error('MerchantFirestoreService', 'Error in watchDiscountedProducts', e, st);
            if (!controller.isClosed) controller.addError(e, st);
          },
        );
      },
      onCancel: () async {
        await subProducts?.cancel();
        await subBusinesses?.cancel();
        await controller.close();
      },
    );

    return controller.stream;
  }

  @override
  Stream<List<CategoryEntity>> watchCategories({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching categories from /categories');
    return _firestore.collection('categories').snapshots().map((snap) {
      final list = <CategoryEntity>[];
      for (final doc in snap.docs) {
        final cat = CategoryEntity.fromMap(doc.data(), doc.id);
        if (cat.active) {
          list.add(cat);
        }
      }
      list.sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
      return list;
    });
  }

  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching promotions for tenant: $tenantId');
    return _firestore
        .collection('promotions')
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => PromotionEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<HomeEditorialAdEntity>> watchHomeEditorialAds({String? tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching home editorial ads from /home_editorial_ads');
    return _firestore
        .collection('home_editorial_ads')
        .snapshots()
        .map((snap) {
          final ads = snap.docs.map((d) => HomeEditorialAdEntity.fromMap(d.data(), id: d.id)).where((ad) {
            // 1. In-memory Active Status & Temporal Filter (1:1 Android parity)
            if (!ad.isCurrentlyValid()) return false;

            // 2. Multi-Tenant Scope Isolation (if tenant specified on ad)
            if (tenantId != null &&
                tenantId.isNotEmpty &&
                tenantId != 'GLOBAL' &&
                ad.tenantId != null &&
                ad.tenantId!.isNotEmpty &&
                ad.tenantId != 'GLOBAL' &&
                ad.tenantId != tenantId) {
              return false;
            }
            return true;
          }).toList();

          // 3. Deterministic order sorting (ascending)
          ads.sort((a, b) => a.order.compareTo(b.order));
          return ads;
        })
        .handleError((e, st) {
          AppLogger.error('MerchantFirestoreService', 'Error in watchHomeEditorialAds', e, st);
          return <HomeEditorialAdEntity>[];
        });
  }

  @override
  Future<void> updateProductQuick(
    String productId, {
    required String name,
    required double price,
  }) async {
    final trimmedId = productId.trim();
    final trimmedName = name.trim();

    if (trimmedId.isEmpty) {
      throw ArgumentError('productId cannot be empty');
    }
    if (trimmedName.isEmpty) {
      throw ArgumentError('name cannot be empty');
    }
    if (price < 0) {
      throw ArgumentError('price cannot be negative');
    }

    AppLogger.info('MerchantFirestoreService', 'Quick updating product $trimmedId: name="$trimmedName", price=$price');

    await _firestore.collection('products').doc(trimmedId).update({
      'name': trimmedName,
      'nombre': trimmedName,
      'price': price,
      'precio': price,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}

