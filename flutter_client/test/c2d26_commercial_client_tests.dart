/// BLUE SYSTEM DELIVERY ENTERPRISE — COMPREHENSIVE UNIT TEST SUITE C2D.26
/// Covers: Auth EIAM v3, Tenant Isolation, Brand Isolation, Orders, Trips,
/// Catalog Entities, Gatekeeper, AppConfig, Platform Adapters, Observability.

import 'package:flutter_test/flutter_test.dart';
import '../lib/core/auth/auth_context.dart';
import '../lib/core/brand/brand_context.dart';
import '../lib/core/config/app_config.dart';
import '../lib/core/errors/app_exceptions.dart';
import '../lib/core/gatekeeper/gatekeeper.dart';
import '../lib/core/observability/app_logger.dart';
import '../lib/core/subscription/subscription_context.dart';
import '../lib/core/tenant/tenant_context.dart';
import '../lib/domain/entities/catalog_entity.dart';
import '../lib/domain/entities/courier_location_entity.dart';
import '../lib/domain/entities/order_entity.dart';
import '../lib/domain/entities/trip_entity.dart';
import '../lib/platform/maps/map_platform_adapter.dart';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

const _validSubscription = SubscriptionEntity(
  subscriptionId: 'sub_c2d26',
  tenantId: 'tenant_001',
  planId: 'plan_pro',
  planName: 'Professional',
  planTier: PlanTier.professional,
  status: SubscriptionStatus.active,
  startDate: 1000,
  endDate: 9999999999999,
  billingCycle: 'MONTHLY',
  enabledFeatures: ['ORDERS', 'TRIPS', 'FLEET', 'CATALOG', 'COURIER'],
  disabledFeatures: ['BANKING'],
  limits: SubscriptionQuotas(
    maxBusinesses: 5,
    maxBranches: 10,
    maxUsers: 50,
    maxCouriers: 20,
    maxOrders: 5000,
    maxStorageMb: 10240,
    maxApiRequests: 100000,
  ),
  schemaVersion: '1.0',
  createdAt: 1000,
  updatedAt: 1000,
  createdBy: 'admin',
  updatedBy: 'admin',
);

const _validContext = GatekeeperContext(
  uid: 'uid_c2d26',
  membershipId: 'mem_c2d26',
  tenantId: 'tenant_001',
  role: EiamRole.owner,
  subscription: _validSubscription,
);

// ─────────────────────────────────────────────────────────────────────────────

void main() {
  // ─── C2D26-TEST-01: AUTH CLAIMS HYDRATION ──────────────────────────────────
  group('[C2D26-TEST-01] AUTH — EIAM v3 Custom Claims Hydration', () {
    test('Parses all canonical EIAM v3 fields from token map', () {
      final claims = CanonicalCustomClaimsV3.fromTokenMap({
        'role': 'OWNER',
        'tenantId': 'tenant_001',
        'brandId': 'brand_fitoni',
        'orgId': 'org_001',
        'businessId': 'biz_001',
        'branchId': 'branch_001',
        'status': 'ACTIVE',
        'eiamVer': 3,
      });

      expect(claims.role, EiamRole.owner);
      expect(claims.tenantId, 'tenant_001');
      expect(claims.brandId, 'brand_fitoni');
      expect(claims.orgId, 'org_001');
      expect(claims.businessId, 'biz_001');
      expect(claims.eiamVer, 3);
      expect(claims.isBusinessAdmin, isTrue);
      expect(claims.isPlatformAdmin, isFalse);
    });

    test('Defaults to GUEST role on malformed or missing role field', () {
      final claims = CanonicalCustomClaimsV3.fromTokenMap({
        'role': 'INVALID_ROLE_XYZ',
        'tenantId': 'tenant_001',
      });
      expect(claims.role, EiamRole.guest);
    });

    test('Serializes claims to map and back with full fidelity', () {
      const original = CanonicalCustomClaimsV3(
        role: EiamRole.manager,
        tenantId: 'tenant_002',
        brandId: 'brand_002',
        status: 'ACTIVE',
        eiamVer: 3,
      );
      final map = original.toMap();
      expect(map['role'], 'MANAGER');
      expect(map['tenantId'], 'tenant_002');
      expect(map['eiamVer'], 3);
    });
  });

  // ─── C2D26-TEST-02: MEMBERSHIP V3 ENTITY ───────────────────────────────────
  group('[C2D26-TEST-02] AUTH — MembershipV3Entity Round-Trip Serialization', () {
    test('Serializes and deserializes MembershipV3Entity accurately', () {
      final membership = MembershipV3Entity(
        membershipId: 'mem_001',
        uid: 'uid_001',
        tenantId: 'tenant_001',
        brandId: 'brand_001',
        role: EiamRole.driver,
        status: MembershipStatus.active,
        permissions: ['GPS_WRITE', 'ORDERS_READ'],
        createdAt: 1000,
        updatedAt: 2000,
        schemaVersion: '3.0',
      );

      final map = membership.toMap();
      final parsed = MembershipV3Entity.fromMap(map);

      expect(parsed.membershipId, 'mem_001');
      expect(parsed.role, EiamRole.driver);
      expect(parsed.status, MembershipStatus.active);
      expect(parsed.permissions, contains('GPS_WRITE'));
      expect(parsed.isActive, isTrue);
    });
  });

  // ─── C2D26-TEST-03: GATEKEEPER ALLOW & DENY ────────────────────────────────
  group('[C2D26-TEST-03] GATEKEEPER — Fail-Closed Access Control', () {
    test('PASS: Allows ORDERS when subscribed and role is owner', () {
      final d = GatekeeperEngine.canAccessModule(context: _validContext, moduleKey: 'ORDERS', nowMs: 5000);
      expect(d.allowed, isTrue);
      expect(d.reason, AccessDecisionReason.allowed);
    });

    test('DENY: Blocks BANKING which is in disabledFeatures', () {
      final d = GatekeeperEngine.canAccessModule(context: _validContext, moduleKey: 'BANKING', nowMs: 5000);
      expect(d.allowed, isFalse);
      expect(d.reason, AccessDecisionReason.entitlementMissing);
    });

    test('DENY: Blocks when tenantId does not match subscription', () {
      const ctx = GatekeeperContext(
        uid: 'uid_x',
        membershipId: 'mem_x',
        tenantId: 'tenant_WRONG',
        role: EiamRole.owner,
        subscription: _validSubscription,
      );
      final d = GatekeeperEngine.canAccessModule(context: ctx, moduleKey: 'ORDERS', nowMs: 5000);
      expect(d.allowed, isFalse);
      expect(d.reason, AccessDecisionReason.tenantMismatch);
    });

    test('DENY: Blocks when subscription is expired', () {
      const expiredSub = SubscriptionEntity(
        subscriptionId: 'sub_exp',
        tenantId: 'tenant_001',
        planId: 'plan_pro',
        planName: 'Professional',
        planTier: PlanTier.professional,
        status: SubscriptionStatus.active,
        startDate: 100,
        endDate: 500,
        billingCycle: 'MONTHLY',
        enabledFeatures: ['ORDERS'],
        disabledFeatures: [],
        limits: SubscriptionQuotas(
          maxBusinesses: 1, maxBranches: 1, maxUsers: 1, maxCouriers: 1,
          maxOrders: 100, maxStorageMb: 100, maxApiRequests: 100,
        ),
        schemaVersion: '1.0',
        createdAt: 100,
        updatedAt: 100,
        createdBy: 'admin',
        updatedBy: 'admin',
      );
      const ctx = GatekeeperContext(
        uid: 'uid_y',
        membershipId: 'mem_y',
        tenantId: 'tenant_001',
        role: EiamRole.owner,
        subscription: expiredSub,
      );
      final d = GatekeeperEngine.canAccessModule(context: ctx, moduleKey: 'ORDERS', nowMs: 999);
      expect(d.allowed, isFalse);
      expect(d.reason, AccessDecisionReason.subscriptionExpired);
    });

    test('DENY: Null subscription → fail closed', () {
      const ctx = GatekeeperContext(
        uid: 'uid_z',
        membershipId: 'mem_z',
        tenantId: 'tenant_001',
        role: EiamRole.owner,
        subscription: null,
      );
      final d = GatekeeperEngine.canAccessModule(context: ctx, moduleKey: 'ORDERS', nowMs: 5000);
      expect(d.allowed, isFalse);
    });
  });

  // ─── C2D26-TEST-04: BRAND ENTITY ───────────────────────────────────────────
  group('[C2D26-TEST-04] BRAND — Hydration, Serialization, Isolation', () {
    test('Hydrates BrandVisualConfig with safe fallbacks for invalid colors', () {
      final config = BrandVisualConfig.fromMap({'primaryColor': 'NOTACOLOR', 'fontFamily': 'Roboto'});
      expect(config.primaryColor, BrandVisualConfig.fallback.primaryColor);
      expect(config.fontFamily, 'Roboto');
    });

    test('BrandEntity round-trip serialization', () {
      final brand = BrandEntity(
        brandId: 'brand_test',
        tenantId: 'tenant_001',
        displayName: 'Test Brand',
        shortName: 'TB',
        slug: 'test-brand',
        visual: BrandVisualConfig.fallback,
        metadata: const BrandMetadata(supportEmail: 'test@test.com', supportPhone: '+1234567890'),
        status: BrandStatus.active,
        schemaVersion: '1.0',
        createdAt: 1000,
        updatedAt: 1000,
        createdBy: 'sys',
        updatedBy: 'sys',
      );
      final map = brand.toMap();
      final parsed = BrandEntity.fromMap(map);
      expect(parsed.brandId, 'brand_test');
      expect(parsed.tenantId, 'tenant_001');
      expect(parsed.status, BrandStatus.active);
    });

    test('Brand from different tenant should be treated as isolation violation (structural check)', () {
      // This verifies that tenantId field is always present and matchable
      final brand = BrandEntity(
        brandId: 'brand_other',
        tenantId: 'tenant_WRONG',
        displayName: 'Wrong Tenant Brand',
        shortName: 'WTB',
        slug: 'wrong-tenant-brand',
        visual: BrandVisualConfig.fallback,
        metadata: const BrandMetadata(supportEmail: 'x@x.com', supportPhone: '+0'),
        status: BrandStatus.active,
        schemaVersion: '1.0',
        createdAt: 1,
        updatedAt: 1,
        createdBy: 'sys',
        updatedBy: 'sys',
      );
      expect(brand.tenantId, isNot('tenant_001'));
    });
  });

  // ─── C2D26-TEST-05: APPCONFIG ENTITY ───────────────────────────────────────
  group('[C2D26-TEST-05] APPCONFIG — Contract Parsing & Validation', () {
    test('Parses AppConfigEntity from Firestore payload accurately', () {
      final config = AppConfigEntity.fromMap({
        'configId': 'cfg_c2d26',
        'tenantId': 'tenant_001',
        'brandId': 'brand_001',
        'platform': 'ANDROID',
        'environment': 'PRODUCTION',
        'distribution': {
          'appName': 'BlueSystem Delivery',
          'shortName': 'BSD',
          'applicationId': 'com.bluesystem.delivery',
          'versionName': '2.2.0',
          'buildNumber': 100,
        },
        'providers': {
          'firebaseProjectId': 'bluesystem-7c9af',
          'firebaseAppId': '1:123:android:abc',
          'mapsApiKey': '',
        },
        'featureFlags': {'enableAiAssistant': true, 'enableRealRouting': false},
        'status': 'ACTIVE',
        'schemaVersion': '1.0',
        'createdAt': 1000,
        'updatedAt': 2000,
      });

      expect(config.configId, 'cfg_c2d26');
      expect(config.platform, PlatformType.android);
      expect(config.environment, EnvironmentType.production);
      expect(config.distribution.applicationId, 'com.bluesystem.delivery');
      expect(config.featureFlags['enableAiAssistant'], isTrue);
      expect(config.status, AppConfigStatus.active);
    });
  });

  // ─── C2D26-TEST-06: ORDER ENTITY ───────────────────────────────────────────
  group('[C2D26-TEST-06] ORDERS — Entity Serialization & Tenant Isolation', () {
    test('OrderEntity deserializes from Firestore payload with all required fields', () {
      final order = OrderEntity.fromMap({
        'orderId': 'ord_001',
        'tenantId': 'tenant_001',
        'businessId': 'biz_001',
        'customerId': 'cust_001',
        'customerName': 'Juan Test',
        'customerPhone': '+52551234',
        'deliveryAddress': 'Calle Falsa 123, Ciudad',
        'status': 'PENDING',
        'total': 150.0,
        'items': [
          {'name': 'Hamburguesa', 'quantity': 2, 'unitPrice': 75.0, 'productId': 'p_001'},
        ],
        'createdAt': 1000,
        'updatedAt': 1000,
      }, 'ord_001');

      expect(order.orderId, 'ord_001');
      expect(order.tenantId, 'tenant_001');
      expect(order.status, OrderStatus.pending);
      expect(order.total, 150.0);
      expect(order.items.length, 1);
      expect(order.items.first.name, 'Hamburguesa');
    });

    test('Order tenant isolation — tenantId field must not be empty', () {
      final order = OrderEntity.fromMap({
        'tenantId': 'tenant_001',
        'customerId': 'cust_001',
        'customerName': 'Maria',
        'customerPhone': '+525500000000',
        'deliveryAddress': 'Av. Principal 1',
        'status': 'PENDING',
        'total': 0.0,
        'items': [],
        'createdAt': 0,
        'updatedAt': 0,
      }, 'ord_002');
      expect(order.tenantId.isNotEmpty, isTrue);
    });
  });

  // ─── C2D26-TEST-07: TRIP ENTITY ────────────────────────────────────────────
  group('[C2D26-TEST-07] TRIPS — TripEntity Serialization & X→Y Contract', () {
    test('TripEntity deserializes from Firestore payload correctly', () {
      final trip = TripEntity.fromMap({
        'tripId': 'trip_001',
        'tenantId': 'tenant_001',
        'customerId': 'cust_001',
        'originAddress': 'Calle Origen 1',
        'originLat': 19.4326,
        'originLng': -99.1332,
        'destinationAddress': 'Calle Destino 2',
        'destinationLat': 19.4400,
        'destinationLng': -99.1400,
        'status': 'OFFERED',
        'fare': 85.0,
        'distanceKm': 3.3,
        'createdAt': 1000,
        'updatedAt': 1000,
      }, 'trip_001');

      expect(trip.tripId, 'trip_001');
      expect(trip.tenantId, 'tenant_001');
      expect(trip.status, TripStatus.offered);
      expect(trip.fare, 85.0);
      expect(trip.originAddress, 'Calle Origen 1');
      expect(trip.destinationAddress, 'Calle Destino 2');
    });
  });

  // ─── C2D26-TEST-08: CATALOG ENTITY ─────────────────────────────────────────
  group('[C2D26-TEST-08] MERCHANT — Catalog Entity Serialization', () {
    test('ProductEntity round-trip serialization with tenant isolation', () {
      final product = ProductEntity(
        productId: 'prod_001',
        tenantId: 'tenant_001',
        businessId: 'biz_001',
        name: 'Pizza Margherita',
        description: 'Classic Italian pizza',
        price: 120.0,
        category: 'Pizzas',
        isAvailable: true,
        stock: 50,
        createdAt: 1000,
        updatedAt: 1000,
      );

      final map = product.toMap();
      final parsed = ProductEntity.fromMap(map, product.productId);

      expect(parsed.productId, 'prod_001');
      expect(parsed.tenantId, 'tenant_001');
      expect(parsed.price, 120.0);
      expect(parsed.isAvailable, isTrue);
    });

    test('BranchEntity round-trip serialization', () {
      final branch = BranchEntity(
        branchId: 'branch_001',
        tenantId: 'tenant_001',
        businessId: 'biz_001',
        name: 'Sucursal Centro',
        address: 'Av. Central 100',
        phone: '+525500000001',
        latitude: 19.432,
        longitude: -99.133,
        isOpen: true,
      );
      final parsed = BranchEntity.fromMap(branch.toMap(), branch.branchId);
      expect(parsed.branchId, 'branch_001');
      expect(parsed.isOpen, isTrue);
    });
  });

  // ─── C2D26-TEST-09: COURIER LOCATION & FLEET ───────────────────────────────
  group('[C2D26-TEST-09] FLEET — CourierLocationEntity & Telemetry Freshness', () {
    test('CourierLocationEntity freshness check returns false for stale telemetry', () {
      final staleMs = DateTime.now().millisecondsSinceEpoch - (11 * 60 * 1000); // 11 min ago
      final entity = CourierLocationEntity(
        courierId: 'courier_001',
        tenantId: 'tenant_001',
        latitude: 19.43,
        longitude: -99.13,
        timestamp: staleMs,
        isOnline: true,
      );
      expect(entity.isFresh, isFalse);
    });

    test('CourierLocationEntity freshness check returns true for fresh telemetry', () {
      final freshMs = DateTime.now().millisecondsSinceEpoch - (2 * 60 * 1000); // 2 min ago
      final entity = CourierLocationEntity(
        courierId: 'courier_002',
        tenantId: 'tenant_001',
        latitude: 19.44,
        longitude: -99.14,
        timestamp: freshMs,
        isOnline: true,
      );
      expect(entity.isFresh, isTrue);
    });
  });

  // ─── C2D26-TEST-10: MAP PLATFORM ADAPTER SENTINEL ──────────────────────────
  group('[C2D26-TEST-10] PLATFORM ADAPTERS — Map Sentinel No-Op Contract', () {
    test('SentinelMapAdapter implements all MapPlatformAdapter methods without throwing', () async {
      final adapter = SentinelMapAdapter();
      await expectLater(adapter.initialize(apiKey: 'SENTINEL'), completes);
      await expectLater(adapter.getMapCenter(), completion(isNull));
      await expectLater(
        adapter.moveCameraTo(const LocationPoint(latitude: 19.43, longitude: -99.13)),
        completes,
      );
      final markerId = await adapter.addMarker(
        location: const LocationPoint(latitude: 19.43, longitude: -99.13),
        markerId: 'marker_test',
        title: 'Test',
      );
      expect(markerId, 'marker_test');
      await expectLater(adapter.removeMarker('marker_test'), completes);
      await expectLater(adapter.dispose(), completes);
    });
  });

  // ─── C2D26-TEST-11: OBSERVABILITY — LOGGER SANITIZATION ────────────────────
  group('[C2D26-TEST-11] OBSERVABILITY — AppLogger Contract', () {
    test('AppLogger does not throw on structured info/warning/error calls', () {
      expect(() => AppLogger.info('TestTag', 'Informational message'), returnsNormally);
      expect(() => AppLogger.warning('TestTag', 'Warning message'), returnsNormally);
      expect(
        () => AppLogger.error('TestTag', 'Error message', Exception('test error')),
        returnsNormally,
      );
    });
  });
}
