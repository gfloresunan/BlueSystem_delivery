/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Suite de Verificación Integral de Schemas, Integridad Referencial e Inmutabilidad
 */

import { PlatformRepository } from '../domain/platform/repository';
import {
  TenantEntity,
  BrandEntity,
  SubscriptionEntity,
  AppConfigEntity,
  ReleaseEntity
} from '../domain/platform/models';

export async function runPlatformFoundationTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  const repo = new PlatformRepository();
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n============================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS DE SCHEMAS RAÍZ (FASE 2B)');
  console.log('============================================================\n');

  try {
    // ─── TEST SUITE 1: TENANT LIFECYCLE & VALIDATION ─────────────────────────
    console.log('--- TEST SUITE 1: TENANT LIFECYCLE ---');
    const tenantA: TenantEntity = {
      tenantId: 'tenant_test_001',
      name: 'Tenant Alpha Corp',
      legalName: 'Alpha Corporation S.A.',
      slug: 'alpha-corp',
      type: 'WHITE_LABEL_COMMERCE',
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin_sys',
      updatedBy: 'admin_sys'
    };

    const createdTenantA = await repo.createTenant(tenantA);
    assert(createdTenantA.tenantId === 'tenant_test_001', 'Tenant A creado exitosamente');

    // Duplicate ID rejection
    try {
      await repo.createTenant(tenantA);
      assert(false, 'Debería rechazar duplicado de tenantId');
    } catch (e: any) {
      assert(e.message.includes('DUPLICATE_ID'), 'Rechaza duplicado de tenantId');
    }

    // Duplicate slug rejection
    try {
      await repo.createTenant({
        ...tenantA,
        tenantId: 'tenant_test_002',
        name: 'Another Tenant with same slug'
      });
      assert(false, 'Debería rechazar duplicado de slug');
    } catch (e: any) {
      assert(e.message.includes('DUPLICATE_SLUG'), 'Rechaza duplicado de slug');
    }

    // Immutability: Attempt to change tenantId or createdAt
    try {
      await repo.updateTenant('tenant_test_001', { tenantId: 'tenant_hacked' as any }, 'admin_sys');
      assert(false, 'Debería rechazar mutación de tenantId');
    } catch (e: any) {
      assert(e.message.includes('IMMUTABILITY_ERROR'), 'Rechaza mutación de campo inmutable tenantId');
    }

    // Soft delete / Archive
    const archivedTenant = await repo.archiveTenant('tenant_test_001', 'admin_sys');
    assert(archivedTenant.status === 'ARCHIVED', 'Tenant archivado correctamente');

    // Reactivate for subsequent relational tests
    await repo.updateTenant('tenant_test_001', { status: 'ACTIVE' }, 'admin_sys');

    // ─── TEST SUITE 2: BRAND LIFECYCLE & REFERENTIAL INTEGRITY ───────────────
    console.log('\n--- TEST SUITE 2: BRAND LIFECYCLE & INTEGRITY ---');
    
    // Attempt brand creation with non-existent tenant
    try {
      await repo.createBrand({
        brandId: 'brand_orphan',
        tenantId: 'tenant_non_existent',
        displayName: 'Orphan Brand',
        shortName: 'Orphan',
        slug: 'orphan-brand',
        visual: {
          logoUrl: 'https://storage.googleapis.com/logo.png',
          iconUrl: 'https://storage.googleapis.com/icon.png',
          splashUrl: 'https://storage.googleapis.com/splash.png',
          primaryColor: '#FF6D00',
          secondaryColor: '#2979FF',
          accentColor: '#00E676',
          backgroundColor: '#121212',
          textColor: '#FFFFFF'
        },
        metadata: {
          supportEmail: 'support@orphan.com',
          supportPhone: '+50588881111'
        },
        status: 'ACTIVE',
        schemaVersion: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'admin_sys',
        updatedBy: 'admin_sys'
      });
      assert(false, 'Debería rechazar Brand huérfana');
    } catch (e: any) {
      assert(e.message.includes('REFERENTIAL_INTEGRITY'), 'Rechaza Brand con tenantId inexistente');
    }

    // Create valid brand under Tenant Alpha
    const brandA1: BrandEntity = {
      brandId: 'brand_test_alpha_express',
      tenantId: 'tenant_test_001',
      displayName: 'Alpha Express Delivery',
      shortName: 'AlphaExpress',
      slug: 'alpha-express',
      visual: {
        logoUrl: 'https://storage.googleapis.com/alpha-logo.png',
        iconUrl: 'https://storage.googleapis.com/alpha-icon.png',
        splashUrl: 'https://storage.googleapis.com/alpha-splash.png',
        primaryColor: '#FF5722',
        secondaryColor: '#03A9F4',
        accentColor: '#4CAF50',
        backgroundColor: '#121212',
        textColor: '#FFFFFF'
      },
      metadata: {
        supportEmail: 'support@alphaexpress.com',
        supportPhone: '+50588882222'
      },
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin_sys',
      updatedBy: 'admin_sys'
    };

    const createdBrandA1 = await repo.createBrand(brandA1);
    assert(createdBrandA1.brandId === 'brand_test_alpha_express', 'Brand A1 creada exitosamente');

    // ─── TEST SUITE 3: SUBSCRIPTION & LIMITS ─────────────────────────────────
    console.log('\n--- TEST SUITE 3: SUBSCRIPTION & LIMITS ---');
    const subA: SubscriptionEntity = {
      subscriptionId: 'sub_test_alpha_pro',
      tenantId: 'tenant_test_001',
      planId: 'plan_pro_enterprise',
      planName: 'Professional Delivery Tier',
      planTier: 'PROFESSIONAL',
      status: 'ACTIVE',
      startDate: Date.now(),
      billingCycle: 'MONTHLY',
      enabledFeatures: ['ORDERS', 'CATALOG', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'NOTIFICATIONS'],
      disabledFeatures: ['X_TO_Y_DELIVERY', 'GOVERNANCE'],
      limits: {
        maxBusinesses: 10,
        maxBranches: 25,
        maxUsers: 50,
        maxCouriers: 20,
        maxOrders: 25000,
        maxStorageMb: 10000,
        maxApiRequests: 500000
      },
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin_sys',
      updatedBy: 'admin_sys'
    };

    const createdSub = await repo.createSubscription(subA);
    assert(createdSub.subscriptionId === 'sub_test_alpha_pro', 'Subscription creada exitosamente');

    // ─── TEST SUITE 4: APP CONFIG & APPLICATION ID UNIQUENESS ────────────────
    console.log('\n--- TEST SUITE 4: APP CONFIG ---');
    const appConfigA: AppConfigEntity = {
      configId: 'appcfg_alpha_android_prod',
      tenantId: 'tenant_test_001',
      brandId: 'brand_test_alpha_express',
      platform: 'ANDROID',
      environment: 'PRODUCTION',
      distribution: {
        appName: 'Alpha Express',
        shortName: 'Alpha',
        applicationId: 'com.alphaexpress.delivery',
        versionName: '1.0.0',
        buildNumber: 100
      },
      providers: {
        firebaseProjectId: 'bluesystem-7c9af',
        firebaseAppId: '1:123456789:android:abcdef',
        mapsApiKey: 'AIzaSyD-TEST-KEY'
      },
      featureFlags: {
        enableCashOnDelivery: true,
        enableSmartDispatch: true
      },
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin_sys',
      updatedBy: 'admin_sys'
    };

    const createdAppConfig = await repo.createAppConfig(appConfigA);
    assert(createdAppConfig.configId === 'appcfg_alpha_android_prod', 'AppConfig creada exitosamente');

    // Duplicate applicationId rejection for Android
    try {
      await repo.createAppConfig({
        ...appConfigA,
        configId: 'appcfg_alpha_duplicate_app_id'
      });
      assert(false, 'Debería rechazar applicationId duplicado');
    } catch (e: any) {
      assert(e.message.includes('DUPLICATE_APP_ID'), 'Rechaza applicationId duplicado en Android');
    }

    // ─── TEST SUITE 5: RELEASE LIFECYCLE & IMMUTABILITY ──────────────────────
    console.log('\n--- TEST SUITE 5: RELEASE LIFECYCLE & IMMUTABILITY ---');
    const releaseA: ReleaseEntity = {
      releaseId: 'rel_alpha_v1_0_0_b100',
      tenantId: 'tenant_test_001',
      brandId: 'brand_test_alpha_express',
      configId: 'appcfg_alpha_android_prod',
      platform: 'ANDROID',
      version: '1.0.0',
      buildNumber: 100,
      environment: 'PRODUCTION',
      artifactType: 'AAB',
      status: 'READY',
      artifactUrl: 'gs://bluesystem-7c9af-artifacts/releases/alpha-v1.0.0.aab',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin_sys'
    };

    const createdRelease = await repo.createRelease(releaseA);
    assert(createdRelease.status === 'READY', 'Release creada en estado READY');

    // Publish release (transition to RELEASED)
    const publishedRelease = await repo.publishRelease('rel_alpha_v1_0_0_b100', 'lead_release_manager');
    assert(publishedRelease.status === 'RELEASED', 'Release publicada exitosamente');

    // Attempt modification on a RELEASED release (Must fail)
    try {
      await repo.updateRelease('rel_alpha_v1_0_0_b100', { releaseNotes: 'Hacked Notes' });
      assert(false, 'Debería rechazar mutación en Release ya publicada');
    } catch (e: any) {
      assert(e.message.includes('IMMUTABILITY_ERROR'), 'Rechaza mutación de Release en estado RELEASED');
    }

    // ─── TEST SUITE 6: TENANT ISOLATION VERIFICATION ─────────────────────────
    console.log('\n--- TEST SUITE 6: TENANT ISOLATION (CROSS-TENANT ACCESS) ---');
    // Create Tenant B
    await repo.createTenant({
      tenantId: 'tenant_test_002',
      name: 'Tenant Beta Logistics',
      legalName: 'Beta Logistics S.A.',
      slug: 'beta-logistics',
      type: 'AGENCY',
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'admin_sys',
      updatedBy: 'admin_sys'
    });

    // Attempt to link a Brand from Tenant B to AppConfig of Tenant A
    try {
      await repo.createAppConfig({
        configId: 'appcfg_cross_tenant_hacked',
        tenantId: 'tenant_test_002', // Tenant B
        brandId: 'brand_test_alpha_express', // Brand of Tenant A!
        platform: 'ANDROID',
        environment: 'PRODUCTION',
        distribution: {
          appName: 'Hacked App',
          shortName: 'Hacked',
          applicationId: 'com.hacked.delivery',
          versionName: '1.0.0',
          buildNumber: 1
        },
        providers: {
          firebaseProjectId: 'bluesystem-7c9af',
          firebaseAppId: '1:999:android:hacked',
          mapsApiKey: 'AIzaSyD-HACKED'
        },
        featureFlags: {},
        status: 'ACTIVE',
        schemaVersion: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'admin_sys',
        updatedBy: 'admin_sys'
      });
      assert(false, 'Debería rechazar cruce de Tenant A con Brand de Tenant B');
    } catch (e: any) {
      assert(e.message.includes('CROSS_TENANT_VIOLATION'), 'Rechaza vinculación cross-tenant de Brand y AppConfig');
    }

  } catch (unexpectedError: any) {
    failed++;
    errors.push(`Error inesperado durante la ejecución: ${unexpectedError.message}`);
    console.error('💥 ERROR INESPERADO:', unexpectedError);
  }

  console.log('\n============================================================');
  console.log(`📊 RESULTADOS DE LA SUITE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}

// Ejecución autónoma si se ejecuta directamente
if (require.main === module) {
  runPlatformFoundationTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
