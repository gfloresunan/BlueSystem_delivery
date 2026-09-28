/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — AUTOMATED TENANT PROVISIONING & LIFECYCLE TESTS (FASE 2D.4 / C2D.4)
 * Comprehensive Unit & Integration Test Suite (TC-P01 to TC-P40)
 * 
 * 100% IN-MEMORY / ZERO-PRODUCTION-MUTATION / REVERSIBLE & TRANSACTIONAL CERTIFICATION
 */

import {
  ProvisioningRequest,
  InitialTenantConfiguration
} from '../domain/provisioning/models';
import {
  createInMemoryRepositories,
  ProductionInvocationDetector
} from '../domain/provisioning/repositories';
import { ProvisioningEngine } from '../domain/provisioning/provisioningPipeline';
import { TenantLifecycleStateMachine } from '../domain/provisioning/lifecycleStateMachine';
import { canAccessModule, checkQuota } from '../domain/gatekeeper/gatekeeper';
import { PLAN_CATALOG } from '../domain/gatekeeper/catalog';

export async function runAutomatedTenantProvisioningTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('\n======================================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS AUTOMATED TENANT PROVISIONING (FASE 2D.4)');
  console.log('======================================================================\n');

  const now = 1700000000000;

  const validConfig: InitialTenantConfiguration = {
    locale: 'es_MX',
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    deliverySettings: {
      defaultRadiusKm: 10,
      baseFare: 35.0,
      perKmFare: 15.0,
      autoDispatchEnabled: true
    },
    orderSettings: {
      preparationTimeMinutes: 20,
      allowScheduledOrders: true,
      autoAcceptOrders: false
    },
    brandingDefaults: {
      primaryColor: '#0284C7',
      secondaryColor: '#0EA5E9',
      appName: 'BlueSystem Express'
    },
    notificationPreferences: {
      orderStatusUpdates: true,
      promotionalPush: true,
      soundAlertsEnabled: true
    },
    operationalDefaults: {
      operatingHours: {
        open: '08:00',
        close: '22:00'
      },
      cashDrawerClosingRequired: true
    }
  };

  const createBaseRequest = (overrides?: Partial<ProvisioningRequest>): ProvisioningRequest => ({
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tenantType: 'WHITE_LABEL_COMMERCE',
    tenant: {
      tenantId: 'tenant_fitoni_corp',
      name: 'Fitoni Corporation',
      legalName: 'Fitoni Express S.A. de C.V.',
      slug: 'fitoni-express-corp',
      type: 'WHITE_LABEL_COMMERCE'
    },
    brand: {
      brandId: 'brand_fitoni_exp',
      displayName: 'Fitoni Express',
      shortName: 'Fitoni',
      slug: 'fitoni-express',
      visual: {
        primaryColor: '#FF6D00',
        secondaryColor: '#2979FF',
        accentColor: '#00E676',
        backgroundColor: '#121212',
        textColor: '#FFFFFF',
        logoUrl: 'https://storage.googleapis.com/fitoni/logo.png',
        iconUrl: 'https://storage.googleapis.com/fitoni/icon.png',
        splashUrl: 'https://storage.googleapis.com/fitoni/splash.png'
      },
      metadata: {
        supportEmail: 'soporte@fitoni.com',
        supportPhone: '+525512345678',
        website: 'https://fitoni.com'
      }
    },
    business: {
      businessId: 'biz_fitoni_central',
      brandId: 'brand_fitoni_exp',
      name: 'Fitoni Burger Central',
      category: 'FAST_FOOD',
      deliveryRadiusKm: 12
    },
    branch: {
      branchId: 'branch_fitoni_polanco',
      businessId: 'biz_fitoni_central',
      name: 'Fitoni Polanco',
      address: 'Av. Masaryk 100, Polanco, CDMX',
      city: 'CDMX',
      coordinates: {
        latitude: 19.4326,
        longitude: -99.1332
      },
      isMainBranch: true
    },
    subscription: {
      subscriptionId: 'sub_fitoni_custom',
      planTier: 'CUSTOM',
      planName: 'Fitoni White-Label Custom Plan',
      billingCycle: 'MONTHLY',
      startDate: now,
      endDate: now + 31536000000,
      customFeatures: [
        'ORDERS',
        'CATALOG',
        'CUSTOMERS',
        'PROMOTIONS',
        'FINANCE',
        'REPORTS',
        'CONTROL_TOWER',
        'FLEET_CORE',
        'GPS_TRACKING',
        'X_TO_Y_DELIVERY'
      ]
    },
    initialOwner: {
      uid: 'usr_fitoni_ceo_001',
      role: 'OWNER',
      email: 'ceo@fitoni.com',
      displayName: 'CEO Fitoni'
    },
    initialConfiguration: validConfig,
    requestedBy: 'usr_platform_admin',
    requestedAt: now,
    ...overrides
  });

  try {
    // ─── BLOQUE 1: VALIDACIÓN DE CONTRATOS SINTÁCTICOS (TC-P01 a TC-P15) ────────
    console.log('--- 1. VALIDACIÓN DE CONTRATOS SINTÁCTICOS ---');

    // TC-P01: Solicitud de aprovisionamiento válida
    const reqP01 = createBaseRequest();
    const valP01 = ProvisioningEngine.validateRequest(reqP01);
    assert(valP01.isValid && valP01.errors.length === 0, 'TC-P01: Solicitud de aprovisionamiento válida');

    // TC-P02: Tenant inválido (tenantId vacío o comodín)
    const reqP02 = createBaseRequest({
      tenant: { ...reqP01.tenant, tenantId: '' }
    });
    const valP02 = ProvisioningEngine.validateRequest(reqP02);
    assert(!valP02.isValid && valP02.errors.some(e => e.includes('tenant.tenantId')), 'TC-P02: Tenant con tenantId vacío es rechazado');

    const reqP02b = createBaseRequest({
      tenant: { ...reqP01.tenant, tenantId: '*' }
    });
    const valP02b = ProvisioningEngine.validateRequest(reqP02b);
    assert(!valP02b.isValid && valP02b.errors.some(e => e.includes('comodín')), 'TC-P02b: Tenant con comodín (*) es rechazado');

    // TC-P03: Brand inválida (brandId vacío)
    const reqP03 = createBaseRequest({
      brand: { ...reqP01.brand, brandId: '' }
    });
    const valP03 = ProvisioningEngine.validateRequest(reqP03);
    assert(!valP03.isValid && valP03.errors.some(e => e.includes('brand.brandId')), 'TC-P03: Brand con brandId vacío es rechazada');

    // TC-P04: Business inválido (businessId vacío)
    const reqP04 = createBaseRequest({
      business: { ...reqP01.business, businessId: '' }
    });
    const valP04 = ProvisioningEngine.validateRequest(reqP04);
    assert(!valP04.isValid && valP04.errors.some(e => e.includes('business.businessId')), 'TC-P04: Business con businessId vacío es rechazado');

    // TC-P05: Branch inválido (branchId vacío)
    const reqP05 = createBaseRequest({
      branch: { ...reqP01.branch, branchId: '' }
    });
    const valP05 = ProvisioningEngine.validateRequest(reqP05);
    assert(!valP05.isValid && valP05.errors.some(e => e.includes('branch.branchId')), 'TC-P05: Branch con branchId vacío es rechazada');

    // TC-P06: Suscripción inválida (planTier inválido)
    const reqP06 = createBaseRequest({
      subscription: { ...reqP01.subscription, planTier: 'INVALID_TIER' as any }
    });
    const valP06 = ProvisioningEngine.validateRequest(reqP06);
    assert(!valP06.isValid && valP06.errors.some(e => e.includes('planTier')), 'TC-P06: Suscripción con planTier inválido es rechazada');

    // TC-P07: Membresía / Propietario inicial inválido (uid vacío)
    const reqP07 = createBaseRequest({
      initialOwner: { ...reqP01.initialOwner, uid: '' }
    });
    const valP07 = ProvisioningEngine.validateRequest(reqP07);
    assert(!valP07.isValid && valP07.errors.some(e => e.includes('initialOwner.uid')), 'TC-P07: InitialOwner con uid vacío es rechazado');

    // TC-P08: Referencia Cross-Tenant en Pipeline (Ejecución rechazada con SECURITY_MISMATCH)
    const reposP08 = createInMemoryRepositories();
    const reqP08 = createBaseRequest({
      business: { ...reqP01.business, brandId: 'alien_brand_different_tenant' }
    });
    const resP08 = await ProvisioningEngine.provisionTenant(reqP08, reposP08);
    assert(resP08.status === 'COMPENSATED' && resP08.errorDetails?.some(e => e.includes('SECURITY_MISMATCH')), 'TC-P08: Referencia Cross-Tenant rechazada con SECURITY_MISMATCH');

    // TC-P09: Referencia Cross-Brand en Branch (Branch a negocio inexistente o ajeno)
    const reposP09 = createInMemoryRepositories();
    const reqP09 = createBaseRequest({
      branch: { ...reqP01.branch, businessId: 'alien_biz_999' }
    });
    const resP09 = await ProvisioningEngine.provisionTenant(reqP09, reposP09);
    assert(resP09.status === 'COMPENSATED' && resP09.errorDetails?.some(e => e.includes('SECURITY_MISMATCH')), 'TC-P09: Branch referenciando negocio ajeno es rechazada');

    // TC-P10: Rol inicial no canónico rechazado
    const reposP10 = createInMemoryRepositories();
    const reqP10 = createBaseRequest({
      initialOwner: { ...reqP01.initialOwner, role: 'GOD_MODE' as any }
    });
    const resP10 = await ProvisioningEngine.provisionTenant(reqP10, reposP10);
    assert(resP10.status === 'COMPENSATED' && resP10.errorDetails?.some(e => e.includes('MEMBERSHIP_SCHEMA_INVALID')), 'TC-P10: Rol falso o no canónico es rechazado');

    // TC-P11: Entitlement inexistente en Catálogo rechazado
    const reposP11 = createInMemoryRepositories();
    const reqP11 = createBaseRequest({
      subscription: {
        ...reqP01.subscription,
        customFeatures: ['ORDERS', 'SUPER_QUANTUM_TELEPORT' as any]
      }
    });
    const resP11 = await ProvisioningEngine.provisionTenant(reqP11, reposP11);
    assert(resP11.status === 'COMPENSATED' && resP11.errorDetails?.some(e => e.includes('INVALID_ENTITLEMENT')), 'TC-P11: Entitlement inexistente en catálogo es rechazado');

    // TC-P12: Wildcard entitlement (* o ALL) rechazado en Custom Plan
    const reposP12 = createInMemoryRepositories();
    const reqP12 = createBaseRequest({
      subscription: {
        ...reqP01.subscription,
        customFeatures: ['*'] as any
      }
    });
    const resP12 = await ProvisioningEngine.provisionTenant(reqP12, reposP12);
    assert(resP12.status === 'COMPENSATED' && resP12.errorDetails?.some(e => e.includes('WILDCARD_ENTITLEMENT_DENIED')), 'TC-P12: Wildcard entitlement (*) en Custom Plan es rechazado');

    // TC-P13: Missing Subscription bloquea acceso en Gatekeeper
    const gateResP13 = canAccessModule({
      uid: 'usr_test',
      membershipId: 'mem_test',
      tenantId: 'ten_test',
      role: 'OWNER',
      subscription: null
    }, 'ORDERS', now);
    assert(!gateResP13.allowed && gateResP13.reason === 'SUBSCRIPTION_MISSING', 'TC-P13: Missing Subscription produce SUBSCRIPTION_MISSING');

    // TC-P14: Expired Subscription bloquea acceso en Gatekeeper
    const gateResP14 = canAccessModule({
      uid: 'usr_test',
      membershipId: 'mem_test',
      tenantId: 'ten_test',
      role: 'OWNER',
      subscription: {
        subscriptionId: 'sub_exp',
        tenantId: 'ten_test',
        planId: 'plan_starter',
        planName: 'Starter',
        planTier: 'STARTER',
        status: 'ACTIVE',
        startDate: now - 100000,
        endDate: now - 1000, // Expirada
        billingCycle: 'MONTHLY',
        enabledFeatures: ['ORDERS'],
        disabledFeatures: [],
        limits: PLAN_CATALOG.STARTER.defaultQuotas,
        schemaVersion: '1.0',
        createdAt: now - 100000,
        updatedAt: now - 100000,
        createdBy: 'usr_admin',
        updatedBy: 'usr_admin'
      }
    }, 'ORDERS', now);
    assert(!gateResP14.allowed && gateResP14.reason === 'SUBSCRIPTION_EXPIRED', 'TC-P14: Expired Subscription produce SUBSCRIPTION_EXPIRED');

    // TC-P15: Quota Exceeded bloquea operaciones adicionales
    const quotaResP15 = checkQuota({
      uid: 'usr_test',
      membershipId: 'mem_test',
      tenantId: 'ten_test',
      role: 'OWNER',
      subscription: {
        subscriptionId: 'sub_pro',
        tenantId: 'ten_test',
        planId: 'plan_pro',
        planName: 'Pro',
        planTier: 'PROFESSIONAL',
        status: 'ACTIVE',
        startDate: now - 10000,
        endDate: now + 1000000,
        billingCycle: 'MONTHLY',
        enabledFeatures: ['ORDERS'],
        disabledFeatures: [],
        limits: { ...PLAN_CATALOG.PROFESSIONAL.defaultQuotas, maxBusinesses: 3 },
        schemaVersion: '1.0',
        createdAt: now - 10000,
        updatedAt: now - 10000,
        createdBy: 'usr_admin',
        updatedBy: 'usr_admin'
      }
    }, 'maxBusinesses', 3, 1, now);
    assert(!quotaResP15.allowed && quotaResP15.reason === 'QUOTA_EXCEEDED', 'TC-P15: Quota Exceeded produce QUOTA_EXCEEDED');

    // ─── BLOQUE 2: EJECUCIÓN TRANSACCIONAL E IDEMPOTENCIA (TC-P16 a TC-P18) ─────
    console.log('--- 2. EJECUCIÓN TRANSACCIONAL E IDEMPOTENCIA ---');

    // TC-P16: Aprovisionamiento simulado exitoso completo
    const reposP16 = createInMemoryRepositories();
    const reqP16 = createBaseRequest({
      idempotencyKey: 'idemp_key_success_001'
    });
    const resP16 = await ProvisioningEngine.provisionTenant(reqP16, reposP16);
    assert(resP16.status === 'COMPLETED' && !!resP16.aggregate, 'TC-P16: Aprovisionamiento simulado exitoso completado');
    assert(await reposP16.tenantRepo.count() === 1, 'TC-P16: Tenant persistido en memoria (1)');
    assert(await reposP16.brandRepo.count() === 1, 'TC-P16: Brand persistida en memoria (1)');
    assert(await reposP16.businessRepo.count() === 1, 'TC-P16: Business persistido en memoria (1)');
    assert(await reposP16.branchRepo.count() === 1, 'TC-P16: Branch persistida en memoria (1)');
    assert(await reposP16.subscriptionRepo.count() === 1, 'TC-P16: Subscription persistida en memoria (1)');
    assert(await reposP16.membershipRepo.count() === 1, 'TC-P16: Membership persistida en memoria (1)');

    // TC-P17: Idempotent Replay (Misma idempotencyKey y mismo payload)
    const resP17 = await ProvisioningEngine.provisionTenant(reqP16, reposP16);
    assert(resP17.status === 'REPLAYED', 'TC-P17: Reintento idéntico retorna status REPLAYED determinista');
    assert(await reposP16.tenantRepo.count() === 1, 'TC-P17: No duplica Tenant en memoria (mantiene 1)');

    // TC-P18: Idempotency Conflict (Misma idempotencyKey con diferente payload)
    const conflictReq = createBaseRequest({
      idempotencyKey: 'idemp_key_success_001', // Misma clave
      tenant: { ...reqP16.tenant, name: 'Different Changed Name' }
    });
    const resP18 = await ProvisioningEngine.provisionTenant(conflictReq, reposP16);
    assert(resP18.status === 'CONFLICT', 'TC-P18: Misma idempotencyKey con payload diferente produce CONFLICT');

    // ─── BLOQUE 3: FAILURE INJECTION & COMPENSACIÓN (TC-P19 a TC-P30) ───────────
    console.log('--- 3. FAILURE INJECTION & COMPENSACIÓN ---');

    // TC-P19: Fallo inyectado en TENANT
    const reposP19 = createInMemoryRepositories();
    const resP19 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP19, 'TENANT');
    assert(resP19.status === 'COMPENSATED', 'TC-P19: Fallo en TENANT es compensado');
    assert(await reposP19.tenantRepo.count() === 0, 'TC-P19: 0 estado residual de Tenant');

    // TC-P20: Fallo inyectado en BRAND
    const reposP20 = createInMemoryRepositories();
    const resP20 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP20, 'BRAND');
    assert(resP20.status === 'COMPENSATED', 'TC-P20: Fallo en BRAND es compensado');
    assert(await reposP20.tenantRepo.count() === 0, 'TC-P20: Tenant creado previamente es revertido (0 residual)');
    assert(await reposP20.brandRepo.count() === 0, 'TC-P20: 0 estado residual de Brand');

    // TC-P21: Fallo inyectado en BUSINESS
    const reposP21 = createInMemoryRepositories();
    const resP21 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP21, 'BUSINESS');
    assert(resP21.status === 'COMPENSATED', 'TC-P21: Fallo en BUSINESS es compensado');
    assert(await reposP21.tenantRepo.count() === 0 && await reposP21.brandRepo.count() === 0, 'TC-P21: Tenant y Brand revertidos (0 residual)');

    // TC-P22: Fallo inyectado en BRANCH
    const reposP22 = createInMemoryRepositories();
    const resP22 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP22, 'BRANCH');
    assert(resP22.status === 'COMPENSATED', 'TC-P22: Fallo en BRANCH es compensado');
    assert(await reposP22.businessRepo.count() === 0, 'TC-P22: Business revertido (0 residual)');

    // TC-P23: Fallo inyectado en SUBSCRIPTION
    const reposP23 = createInMemoryRepositories();
    const resP23 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP23, 'SUBSCRIPTION');
    assert(resP23.status === 'COMPENSATED', 'TC-P23: Fallo en SUBSCRIPTION es compensado');
    assert(await reposP23.branchRepo.count() === 0 && await reposP23.businessRepo.count() === 0, 'TC-P23: Branch y Business revertidos');

    // TC-P24: Fallo inyectado en ENTITLEMENTS
    const reposP24 = createInMemoryRepositories();
    const resP24 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP24, 'ENTITLEMENTS');
    assert(resP24.status === 'COMPENSATED', 'TC-P24: Fallo en ENTITLEMENTS es compensado');
    assert(await reposP24.subscriptionRepo.count() === 0, 'TC-P24: Subscription revertida');

    // TC-P25: Fallo inyectado en MEMBERSHIP
    const reposP25 = createInMemoryRepositories();
    const resP25 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP25, 'MEMBERSHIP');
    assert(resP25.status === 'COMPENSATED', 'TC-P25: Fallo en MEMBERSHIP es compensado');
    assert(await reposP25.membershipRepo.count() === 0 && await reposP25.tenantRepo.count() === 0, 'TC-P25: Todo el stack es compensado en reversa');

    // TC-P26: Fallo inyectado en INITIAL_CONFIGURATION
    const reposP26 = createInMemoryRepositories();
    const resP26 = await ProvisioningEngine.provisionTenant(createBaseRequest(), reposP26, 'INITIAL_CONFIGURATION');
    assert(resP26.status === 'COMPENSATED', 'TC-P26: Fallo en INITIAL_CONFIGURATION es compensado');

    // TC-P27: Compensación completa deja repositorios limpios
    assert(
      await reposP26.tenantRepo.count() === 0 &&
      await reposP26.brandRepo.count() === 0 &&
      await reposP26.businessRepo.count() === 0 &&
      await reposP26.branchRepo.count() === 0 &&
      await reposP26.subscriptionRepo.count() === 0 &&
      await reposP26.membershipRepo.count() === 0,
      'TC-P27: Full compensation leaves all repositories at 0 entities'
    );

    // TC-P28: No entidades huérfanas en agregados fallidos
    assert(await reposP25.branchRepo.count() === 0, 'TC-P28: No orphan branches after rollback');

    // TC-P29: No duplicate entities (Intento de aprovisionar con ID existente sin idempotencia)
    const reqP29a = createBaseRequest({ idempotencyKey: 'idemp_29a', tenant: { ...reqP01.tenant, tenantId: 'ten_dup_check' } });
    const reqP29b = createBaseRequest({ idempotencyKey: 'idemp_29b', tenant: { ...reqP01.tenant, tenantId: 'ten_dup_check' } });
    const reposP29 = createInMemoryRepositories();
    await ProvisioningEngine.provisionTenant(reqP29a, reposP29);
    const resP29b = await ProvisioningEngine.provisionTenant(reqP29b, reposP29);
    assert(resP29b.status === 'COMPENSATED' && resP29b.errorDetails?.some(e => e.includes('TENANT_ALREADY_EXISTS')), 'TC-P29: Detección y bloqueo de Tenant ID duplicado');

    // TC-P30: Salida determinista para misma entrada
    const reqP30 = createBaseRequest({ requestedAt: 1700000000000 });
    const hash1 = ProvisioningEngine.computePayloadHash(reqP30);
    const hash2 = ProvisioningEngine.computePayloadHash(reqP30);
    assert(hash1 === hash2, 'TC-P30: Deterministic payload hash generation');

    // ─── BLOQUE 4: SIMULACIÓN DE 4 MODELOS COMERCIALES (TC-P31 a TC-P34) ────────
    console.log('--- 4. SIMULACIÓN DE 4 MODELOS COMERCIALES ---');

    // TC-P31: MARKETPLACE Model
    const reposP31 = createInMemoryRepositories();
    const reqP31 = createBaseRequest({
      tenantType: 'MARKETPLACE',
      tenant: { ...reqP01.tenant, tenantId: 'ten_mkt_01', type: 'MARKETPLACE', slug: 'mkt-delivery-mexico' },
      subscription: { ...reqP01.subscription, planTier: 'PROFESSIONAL' }
    });
    const resP31 = await ProvisioningEngine.provisionTenant(reqP31, reposP31);
    assert(resP31.status === 'COMPLETED' && resP31.aggregate?.tenant.type === 'MARKETPLACE', 'TC-P31: Marketplace model provisioning successful');

    // TC-P32: AGENCY Model
    const reposP32 = createInMemoryRepositories();
    const reqP32 = createBaseRequest({
      tenantType: 'AGENCY',
      tenant: { ...reqP01.tenant, tenantId: 'ten_agy_01', type: 'AGENCY', slug: 'agency-digital-delivery' },
      subscription: { ...reqP01.subscription, planTier: 'ENTERPRISE' }
    });
    const resP32 = await ProvisioningEngine.provisionTenant(reqP32, reposP32);
    assert(resP32.status === 'COMPLETED' && resP32.aggregate?.tenant.type === 'AGENCY', 'TC-P32: Agency model provisioning successful');

    // TC-P33: WHITE LABEL Model (Fitoni Express)
    const reposP33 = createInMemoryRepositories();
    const reqP33 = createBaseRequest({
      tenantType: 'WHITE_LABEL_COMMERCE',
      tenant: { ...reqP01.tenant, tenantId: 'ten_wl_fitoni', type: 'WHITE_LABEL_COMMERCE', slug: 'fitoni-express' },
      subscription: { ...reqP01.subscription, planTier: 'CUSTOM' }
    });
    const resP33 = await ProvisioningEngine.provisionTenant(reqP33, reposP33);
    assert(resP33.status === 'COMPLETED' && resP33.aggregate?.brand.displayName === 'Fitoni Express', 'TC-P33: White-Label model (Fitoni Express) provisioning successful');

    // TC-P34: ENTERPRISE Model (Holding multi-marca)
    const reposP34 = createInMemoryRepositories();
    const reqP34 = createBaseRequest({
      tenantType: 'ENTERPRISE',
      tenant: { ...reqP01.tenant, tenantId: 'ten_ent_holding', type: 'ENTERPRISE', slug: 'holding-food-group' },
      subscription: { ...reqP01.subscription, planTier: 'ENTERPRISE' }
    });
    const resP34 = await ProvisioningEngine.provisionTenant(reqP34, reposP34);
    assert(resP34.status === 'COMPLETED' && resP34.aggregate?.subscription.planTier === 'ENTERPRISE', 'TC-P34: Enterprise holding provisioning successful');

    // ─── BLOQUE 5: LIFECYCLE, SEGURIDAD, AUDITORÍA Y ZERO-PROD (TC-P35 a TC-P40)
    console.log('--- 5. LIFECYCLE, SEGURIDAD, AUDITORÍA Y ZERO-PROD ---');

    // TC-P35: Lifecycle State Machine Transitions
    const trans1 = TenantLifecycleStateMachine.evaluateTransition('PROVISIONING', 'ACTIVE');
    assert(trans1.allowed, 'TC-P35: Transition PROVISIONING -> ACTIVE is allowed');

    const trans2 = TenantLifecycleStateMachine.evaluateTransition('ACTIVE', 'SUSPENDED');
    assert(trans2.allowed, 'TC-P35: Transition ACTIVE -> SUSPENDED is allowed');

    const trans3 = TenantLifecycleStateMachine.evaluateTransition('SUSPENDED', 'ACTIVE');
    assert(trans3.allowed, 'TC-P35: Transition SUSPENDED -> ACTIVE is allowed');

    const trans4 = TenantLifecycleStateMachine.evaluateTransition('ACTIVE', 'CANCELLED');
    assert(trans4.allowed, 'TC-P35: Transition ACTIVE -> CANCELLED is allowed');

    const trans5 = TenantLifecycleStateMachine.evaluateTransition('CANCELLED', 'ARCHIVED');
    assert(trans5.allowed, 'TC-P35: Transition CANCELLED -> ARCHIVED is allowed');

    const transIllegal = TenantLifecycleStateMachine.evaluateTransition('ARCHIVED', 'ACTIVE');
    assert(!transIllegal.allowed && transIllegal.reason.includes('LIFECYCLE_TRANSITION_DENIED'), 'TC-P35: Illegal transition ARCHIVED -> ACTIVE is blocked');

    // TC-P36: Security Boundary / Owner no es omnipotente
    const starterContext = {
      uid: 'usr_owner_starter',
      membershipId: 'mem_starter',
      tenantId: 'ten_starter',
      role: 'OWNER' as const,
      subscription: {
        subscriptionId: 'sub_starter',
        tenantId: 'ten_starter',
        planId: 'plan_starter',
        planName: 'Starter',
        planTier: 'STARTER' as const,
        status: 'ACTIVE' as const,
        startDate: now,
        endDate: now + 1000000,
        billingCycle: 'MONTHLY' as const,
        enabledFeatures: ['ORDERS', 'CATALOG', 'CUSTOMERS'] as any,
        disabledFeatures: [],
        limits: PLAN_CATALOG.STARTER.defaultQuotas,
        schemaVersion: '1.0',
        createdAt: now,
        updatedAt: now,
        createdBy: 'admin',
        updatedBy: 'admin'
      }
    };
    const accessAnalytics = canAccessModule(starterContext, 'ANALYTICS', now);
    assert(!accessAnalytics.allowed && accessAnalytics.reason === 'ENTITLEMENT_MISSING', 'TC-P36: OWNER en Plan Starter bloqueado en ANALYTICS (Owner no es omnipotente)');

    // TC-P37: Validación de Cuotas
    const quotaCheck = checkQuota(starterContext, 'maxBranches', 1, 1, now);
    assert(!quotaCheck.allowed && (quotaCheck.reason === 'QUOTA_REACHED' || quotaCheck.reason === 'QUOTA_EXCEEDED'), 'TC-P37: Starter quota validation blocks branch limit breach');

    // TC-P38: Eventos de Auditoría estructurados registrados
    const auditLogs = await reposP16.auditRepo.findByRequestId(reqP16.requestId);
    assert(auditLogs.length > 0 && auditLogs.some(l => l.step === 'PROVISIONING_STARTED') && auditLogs.some(l => l.step === 'VALIDATION_COMPLETED'), 'TC-P38: Structured audit events recorded without PII/Secrets');

    // TC-P39: Zero Secret Leakage en configuración y auditoría
    const allAuditStr = JSON.stringify(auditLogs).toLowerCase();
    const hasAuditSecrets = allAuditStr.includes('password') || allAuditStr.includes('token') || allAuditStr.includes('private_key');
    assert(!hasAuditSecrets, 'TC-P39: Zero secret leakage in audit logs or configuration');

    // TC-P40: Production Repository & Services Never Invoked
    assert(!ProductionInvocationDetector.hasProductionBeenAttempted(), 'TC-P40: Zero-production-connection certified (No production SDKs invoked)');

  } catch (err: any) {
    failed++;
    const msg = `Excepción inesperada en tests de provisioning: ${err.message || err}`;
    console.error(msg);
    errors.push(msg);
  }

  console.log('\n======================================================================');
  console.log(`📊 RESULTADOS AUTOMATED TENANT PROVISIONING: ${passed} PASS, ${failed} FAIL`);
  console.log('======================================================================\n');

  return { passed, failed, errors };
}

if (require.main === module) {
  runAutomatedTenantProvisioningTests().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
