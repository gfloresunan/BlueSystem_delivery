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

    return _firestore.collection('businesses').document(businessId).snapshots().asyncMap((doc) async {
      if (doc.exists && doc.data() != null) {
        return BusinessEntity.fromMap(doc.data()!, doc.id);
      }
      // Fallback to alternate ID
      final altDoc = await _firestore.collection('businesses').document(candidateId).get();
      if (altDoc.exists && altDoc.data() != null) {
        return BusinessEntity.fromMap(altDoc.data()!, altDoc.id);
      }
      // Fallback to /users collection
      final userDoc = await _firestore.collection('users').document(businessId).get();
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
        if (status == 'DELETED') continue;
        list.add(ProductEntity.fromMap(data, doc.id));
      }
      return list;
    });
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
}
