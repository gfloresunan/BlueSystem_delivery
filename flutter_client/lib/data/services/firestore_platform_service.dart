/// BLUE SYSTEM DELIVERY ENTERPRISE — FIRESTORE PLATFORM SERVICE
/// Implementations of ITenantService, IBrandService, ISubscriptionService, and IAppConfigService.

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/brand/brand_context.dart';
import '../../core/config/app_config.dart';
import '../../core/errors/app_exceptions.dart';
import '../../core/observability/app_logger.dart';
import '../../core/subscription/subscription_context.dart';
import '../../core/tenant/tenant_context.dart';
import '../../domain/services/core_service_interfaces.dart';

class FirestorePlatformService
    implements ITenantService, IBrandService, ISubscriptionService, IAppConfigService {
  final FirebaseFirestore _firestore;

  FirestorePlatformService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  // ─── 1. TENANT SERVICE ───────────────────────────────────────────────────────
  @override
  Future<TenantEntity?> getTenantById(String tenantId) async {
    try {
      final doc = await _firestore.collection('tenants').doc(tenantId).get();
      if (!doc.exists) return null;
      return TenantEntity.fromMap(doc.data()!);
    } catch (e, st) {
      AppLogger.error('FirestorePlatformService', 'Error getting tenant $tenantId', e, st);
      return null;
    }
  }

  @override
  Stream<TenantEntity?> watchTenant(String tenantId) {
    return _firestore.collection('tenants').doc(tenantId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return TenantEntity.fromMap(doc.data()!);
    });
  }

  // ─── 2. BRAND SERVICE ────────────────────────────────────────────────────────
  @override
  Future<BrandEntity?> getBrandById(String brandId) async {
    try {
      final doc = await _firestore.collection('brands').doc(brandId).get();
      if (!doc.exists) return null;
      return BrandEntity.fromMap(doc.data()!);
    } catch (e, st) {
      AppLogger.error('FirestorePlatformService', 'Error getting brand $brandId', e, st);
      return null;
    }
  }

  @override
  Future<BrandEntity?> getPrimaryBrandForTenant(String tenantId) async {
    try {
      final tenant = await getTenantById(tenantId);
      if (tenant != null && tenant.primaryBrandId != null) {
        final brand = await getBrandById(tenant.primaryBrandId!);
        if (brand != null && brand.tenantId == tenantId) {
          return brand;
        }
      }

      // Query brands collection scoped to tenant
      final snap = await _firestore
          .collection('brands')
          .where('tenantId', isEqualTo: tenantId)
          .where('status', isEqualTo: 'ACTIVE')
          .limit(1)
          .get();

      if (snap.docs.isNotEmpty) {
        return BrandEntity.fromMap(snap.docs.first.data());
      }
      return null;
    } catch (e, st) {
      AppLogger.error('FirestorePlatformService', 'Error getting primary brand for $tenantId', e, st);
      return null;
    }
  }

  @override
  Stream<BrandEntity?> watchBrand(String brandId) {
    return _firestore.collection('brands').doc(brandId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return BrandEntity.fromMap(doc.data()!);
    });
  }

  // ─── 3. SUBSCRIPTION SERVICE ─────────────────────────────────────────────────
  @override
  Future<SubscriptionEntity?> getSubscriptionByTenantId(String tenantId) async {
    try {
      final snap = await _firestore
          .collection('subscriptions')
          .where('tenantId', isEqualTo: tenantId)
          .limit(1)
          .get();

      if (snap.docs.isNotEmpty) {
        return SubscriptionEntity.fromMap(snap.docs.first.data());
      }
      return null;
    } catch (e, st) {
      AppLogger.error('FirestorePlatformService', 'Error getting subscription for $tenantId', e, st);
      return null;
    }
  }

  @override
  Stream<SubscriptionEntity?> watchSubscription(String tenantId) {
    return _firestore
        .collection('subscriptions')
        .where('tenantId', isEqualTo: tenantId)
        .limit(1)
        .snapshots()
        .map((snap) {
      if (snap.docs.isEmpty) return null;
      return SubscriptionEntity.fromMap(snap.docs.first.data());
    });
  }

  // ─── 4. APP CONFIG SERVICE ───────────────────────────────────────────────────
  @override
  Future<AppConfigEntity?> getAppConfigById(String configId) async {
    try {
      final doc = await _firestore.collection('app_configs').doc(configId).get();
      if (!doc.exists) return null;
      return AppConfigEntity.fromMap(doc.data()!);
    } catch (e, st) {
      AppLogger.error('FirestorePlatformService', 'Error getting app config $configId', e, st);
      return null;
    }
  }

  @override
  Future<AppConfigEntity?> resolveActiveConfig({
    required String tenantId,
    required String brandId,
    required PlatformType platform,
    required EnvironmentType environment,
  }) async {
    try {
      final snap = await _firestore
          .collection('app_configs')
          .where('tenantId', isEqualTo: tenantId)
          .where('brandId', isEqualTo: brandId)
          .where('platform', isEqualTo: platform.name.toUpperCase())
          .where('environment', isEqualTo: environment.name.toUpperCase())
          .where('status', isEqualTo: 'ACTIVE')
          .limit(1)
          .get();

      if (snap.docs.isNotEmpty) {
        return AppConfigEntity.fromMap(snap.docs.first.data());
      }
      return null;
    } catch (e, st) {
      AppLogger.error('FirestorePlatformService', 'Error resolving config for tenant: $tenantId', e, st);
      return null;
    }
  }
}
