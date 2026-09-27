/// BLUE SYSTEM DELIVERY ENTERPRISE — BANNER FIRESTORE SERVICE
/// Real-time listener and caching for promotional banners (/banners).
/// Consumes the same Firestore SSOT collection updated by Admin Web (banners.js).

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/banner_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class BannerFirestoreService implements IBannerService {
  final FirebaseFirestore _firestore;

  BannerFirestoreService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<List<BannerEntity>> watchActiveBanners({String? tenantId}) {
    return _firestore
        .collection('banners')
        .snapshots()
        .map((snapshot) {
          final banners = snapshot.docs
              .map((doc) => BannerEntity.fromMap(doc.data(), doc.id))
              .where((b) {
                // 1. In-memory Active Status Filter (1:1 Android parity Models.kt / SmartBannerEngine.kt)
                if (!b.isActive) return false;

                // 2. Multi-Tenant Scope Isolation (if tenant specified on banner)
                if (tenantId != null &&
                    tenantId.isNotEmpty &&
                    b.tenantId.isNotEmpty &&
                    b.tenantId != 'GLOBAL' &&
                    b.tenantId != tenantId) {
                  return false;
                }
                return true;
              })
              .toList();

          // 3. In-memory Priority Sorting (Ascending: 0 = Featured, 1 = Normal)
          banners.sort((a, b) => a.priority.compareTo(b.priority));
          AppLogger.info('BannerFirestoreService', 'Active banners stream emitted ${banners.length} banners');
          return banners;
        })
        .handleError((error, st) {
          AppLogger.error('BannerFirestoreService', 'Error in watchActiveBanners stream', error, st);
          throw error;
        });
  }

  @override
  Future<List<BannerEntity>> getActiveBanners({String? tenantId}) async {
    try {
      final snapshot = await _firestore.collection('banners').get();

      final banners = snapshot.docs
          .map((doc) => BannerEntity.fromMap(doc.data(), doc.id))
          .where((b) {
            if (!b.isActive) return false;
            if (tenantId != null &&
                tenantId.isNotEmpty &&
                b.tenantId.isNotEmpty &&
                b.tenantId != 'GLOBAL' &&
                b.tenantId != tenantId) {
              return false;
            }
            return true;
          })
          .toList();

      banners.sort((a, b) => a.priority.compareTo(b.priority));
      return banners;
    } catch (e, st) {
      AppLogger.error('BannerFirestoreService', 'Failed getting active banners', e, st);
      rethrow;
    }
  }
}
