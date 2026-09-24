/// BLUE SYSTEM DELIVERY ENTERPRISE — MERCHANT & CATALOG FIRESTORE SERVICE
/// Implements IMerchantService with multi-tenant isolation.

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/catalog_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class MerchantFirestoreService implements IMerchantService {
  final FirebaseFirestore _firestore;

  MerchantFirestoreService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<List<ProductEntity>> watchProducts(String businessId, {required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching products for business: $businessId, tenant: $tenantId');
    return _firestore
        .collection('products')
        .where('businessId', isEqualTo: businessId)
        .where('tenantId', isEqualTo: tenantId)
        .snapshots()
        .map((snap) => snap.docs.map((d) => ProductEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<BranchEntity>> watchBranches(String businessId, {required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching branches for business: $businessId, tenant: $tenantId');
    return _firestore
        .collection('branches')
        .where('businessId', isEqualTo: businessId)
        .where('tenantId', isEqualTo: tenantId)
        .snapshots()
        .map((snap) => snap.docs.map((d) => BranchEntity.fromMap(d.data(), d.id)).toList());
  }

  @override
  Stream<List<PromotionEntity>> watchPromotions({required String tenantId}) {
    AppLogger.info('MerchantFirestoreService', 'Watching promotions for tenant: $tenantId');
    return _firestore
        .collection('promotions')
        .where('tenantId', isEqualTo: tenantId)
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snap) => snap.docs.map((d) => PromotionEntity.fromMap(d.data(), d.id)).toList());
  }
}
