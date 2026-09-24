/// BLUE SYSTEM DELIVERY ENTERPRISE — BANNER FIRESTORE SERVICE
/// Real-time listener and caching for promotional banners (/banners).
/// Consumes the same Firestore SSOT collection updated by Admin Web (banners.js).

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/banner_entity.dart';

abstract class IBannerService {
  Stream<List<BannerEntity>> watchActiveBanners();
  Future<List<BannerEntity>> getActiveBanners();
}

class BannerFirestoreService implements IBannerService {
  final FirebaseFirestore _firestore;

  BannerFirestoreService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<List<BannerEntity>> watchActiveBanners() {
    return _firestore
        .collection('banners')
        .where('isActive', isEqualTo: true)
        .orderBy('priority', descending: false)
        .snapshots()
        .map((snapshot) {
          final banners = snapshot.docs
              .map((doc) => BannerEntity.fromMap(doc.data(), doc.id))
              .toList();
          AppLogger.info('BannerFirestoreService', 'Active banners stream emitted ${banners.length} banners');
          return banners;
        })
        .handleError((error, st) {
          AppLogger.error('BannerFirestoreService', 'Error in watchActiveBanners stream', error, st);
          // Fallback query without ordering if composite index is pending
          return <BannerEntity>[];
        });
  }

  @override
  Future<List<BannerEntity>> getActiveBanners() async {
    try {
      final snapshot = await _firestore
          .collection('banners')
          .where('isActive', isEqualTo: true)
          .get();

      final banners = snapshot.docs
          .map((doc) => BannerEntity.fromMap(doc.data(), doc.id))
          .toList();
      banners.sort((a, b) => a.priority.compareTo(b.priority));
      return banners;
    } catch (e, st) {
      AppLogger.error('BannerFirestoreService', 'Failed getting active banners', e, st);
      return [];
    }
  }
}
