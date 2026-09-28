/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.11 CERTIFICATION
 * FIRST TENANT CONTROLLED VERTICAL SLICE E2E TEST SUITE
 * 
 * Pipeline:
 * SYNTHETIC TENANT -> AUTH -> MEMBERSHIP -> TENANT CONTEXT -> SUBSCRIPTION ->
 * ENTITLEMENTS -> GATEKEEPER -> BRAND -> DESIGN TOKENS -> WEB EXPERIENCE ->
 * CATALOG -> ORDERS -> NOTIFICATIONS -> BACKEND -> FIRESTORE ADAPTER ->
 * OBSERVABILITY -> ROLLBACK
 */

import {
  BrandEntity,
  SubscriptionEntity,
  DEFAULT_BRAND_CONFIG
} from '../domain/platform/models';
import { GatekeeperContext } from '../domain/gatekeeper/models';
import { canAccessModule } from '../domain/gatekeeper/gatekeeper';
import { ClientExperienceResolver } from '../domain/whitelabel/clientExperienceResolver';
import { EntitlementDrivenNavigationResolver } from '../domain/whitelabel/navigationResolver';
import { ProvisioningEngine } from '../domain/provisioning/provisioningPipeline';
import { ProvisioningRequest } from '../domain/provisioning/models';
import { createControlledFirestoreProvisioningAdapter } from '../domain/provisioning/firestoreProvisioningAdapter';
import { ProductionInvocationDetector } from '../domain/provisioning/repositories';

export async function runVerticalSliceE2ETests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [VERTICAL-SLICE] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [VERTICAL-SLICE] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🚀 RUNNING FIRST TENANT VERTICAL SLICE E2E CERTIFICATION (CONTROLLED)');
  console.log('======================================================================\n');

  const now = 1700000000000;
  const { repos } = createControlledFirestoreProvisioningAdapter('EMULATOR_CONTROLLED');

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO 1: TENANT DEMO A (Plan Professional)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- ESCENARIO 1: TENANT DEMO A (PROFESSIONAL PLAN SLICE) ---');

  const reqA: ProvisioningRequest = {
    requestId: 'req_vs_001',
    idempotencyKey: 'idemp_vs_001',
    tenantType: 'WHITE_LABEL_COMMERCE',
    tenant: {
      tenantId: 'tenant_demo_a',
      name: 'Pizzería Bella Italia',
      legalName: 'Bella Italia Gastronomía S.A.',
      slug: 'bella-italia',
      type: 'WHITE_LABEL_COMMERCE'
    },
    brand: {
      brandId: 'brand_demo_a',
      displayName: 'Bella Italia Ristorante',
      shortName: 'Bella Italia',
      slug: 'bella-italia-ristorante',
      visual: {
        primaryColor: '#059669', // Esmeralda Italiano
        secondaryColor: '#047857'
      }
    },
    business: {
      businessId: 'biz_demo_a',
      brandId: 'brand_demo_a',
      name: 'Matriz Bella Italia',
      category: 'RESTAURANT',
      deliveryRadiusKm: 15
    },
    branch: {
      branchId: 'branch_demo_a',
      businessId: 'biz_demo_a',
      name: 'Sucursal Polanco',
      address: 'Masaryk 400',
      city: 'CDMX',
      isMainBranch: true
    },
    subscription: {
      subscriptionId: 'sub_demo_a',
      planTier: 'PROFESSIONAL',
      billingCycle: 'MONTHLY'
    },
    initialOwner: {
      uid: 'usr_owner_demo_a',
      email: 'owner@bellaitalia.com',
      displayName: 'Marco Rossi',
      role: 'OWNER'
    },
    initialConfiguration: {
      currency: 'MXN',
      locale: 'es_MX',
      timezone: 'America/Mexico_City',
      deliverySettings: {
        defaultRadiusKm: 15,
        baseFare: 35,
        perKmFare: 15,
        autoDispatchEnabled: true
      },
      orderSettings: {
        preparationTimeMinutes: 25,
        allowScheduledOrders: true,
        autoAcceptOrders: true
      },
      notificationPreferences: {
        orderStatusUpdates: true,
        promotionalPush: true,
        soundAlertsEnabled: true
      },
      operationalDefaults: {
        cashDrawerClosingRequired: true
      }
    },
    requestedAt: now,
    requestedBy: 'operator_demo_e2e'
  };

  const provResultA = await ProvisioningEngine.provisionTenant(reqA, repos);
  assert(
    provResultA.status === 'COMPLETED' && provResultA.aggregate !== undefined,
    'Aprovisionamiento controlado de Tenant Demo A completado exitosamente'
  );

  const aggregateA = provResultA.aggregate!;
  assert(
    aggregateA.tenant.tenantId === 'tenant_demo_a',
    'Tenant Demo A creado con ID exacto'
  );

  // Resolver Experiencia Web de Tenant Demo A
  const clientExpA = ClientExperienceResolver.resolveSnapshot(
    aggregateA.tenant,
    aggregateA.brand,
    aggregateA.subscription,
    aggregateA.memberships[0]
  );

  assert(
    clientExpA.displayName === 'Bella Italia Ristorante',
    'Web Experience: displayName de Brand A hidrata correctamente'
  );
  assert(
    clientExpA.designTokens.colors.primary.toLowerCase() === '#059669',
    'Web Experience: primaryColor esmeralda hidrata en design tokens'
  );

  // Navegación Gobernada por Entitlements en Plan Pro
  const gateContextA: GatekeeperContext = {
    uid: aggregateA.memberships[0].uid,
    membershipId: aggregateA.memberships[0].membershipId,
    tenantId: aggregateA.tenant.tenantId,
    role: aggregateA.memberships[0].role,
    subscription: aggregateA.subscription
  };

  const navA = EntitlementDrivenNavigationResolver.resolveNavigation(gateContextA, now);

  assert(
    navA.some(n => n.id === 'nav_orders') && navA.some(n => n.id === 'nav_control_tower') && navA.some(n => n.id === 'nav_finance'),
    'Navegación: Plan Professional incluye nav_orders, nav_control_tower y nav_finance'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO 2: CAMBIO DE BRAND DENTRO DEL MISMO TENANT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- ESCENARIO 2: BRAND SWITCHING (CLEAN HYDRATION) ---');

  const brandB: BrandEntity = {
    brandId: 'brand_demo_b',
    tenantId: 'tenant_demo_a',
    displayName: 'Bella Italia Trattoria Express',
    shortName: 'Trattoria',
    slug: 'bella-italia-trattoria',
    visual: {
      ...DEFAULT_BRAND_CONFIG,
      logoUrl: 'https://cdn.example.com/trattoria/logo.png',
      primaryColor: '#7C3AED', // Púrpura Express
      secondaryColor: '#6D28D9'
    },
    metadata: {
      supportEmail: 'support@trattoria.com',
      supportPhone: '+525511223344'
    },
    status: 'ACTIVE',
    schemaVersion: '1.0',
    createdAt: now + 1000,
    updatedAt: now + 1000,
    createdBy: 'operator',
    updatedBy: 'operator'
  };

  await repos.brandRepo.save(brandB);

  const clientExpB = ClientExperienceResolver.resolveSnapshot(
    aggregateA.tenant,
    brandB,
    aggregateA.subscription,
    { ...aggregateA.memberships[0], brandId: 'brand_demo_b' }
  );

  assert(
    clientExpB.displayName === 'Bella Italia Trattoria Express',
    'Brand Switch: Nuevo displayName refleja la nueva marca'
  );
  assert(
    clientExpB.designTokens.colors.primary.toLowerCase() === '#7c3aed',
    'Brand Switch: Nuevo color púrpura (#7c3aed) sustituye al verde esmeralda'
  );
  assert(
    clientExpB.visual.logoUrl === 'https://cdn.example.com/trattoria/logo.png',
    'Brand Switch: Logo de marca anterior desaparece y es reemplazado'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO 3: MÓDULO NO CONTRATADO (STARTER PLAN SIN FINANZAS)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- ESCENARIO 3: UNENTITLED MODULE SHIELD ---');

  const subStarter: SubscriptionEntity = {
    subscriptionId: 'sub_demo_starter',
    tenantId: 'tenant_demo_a',
    planId: 'plan_starter',
    planName: 'Starter Plan',
    planTier: 'STARTER',
    status: 'ACTIVE',
    startDate: now,
    endDate: null,
    billingCycle: 'MONTHLY',
    enabledFeatures: ['ORDERS', 'CATALOG'],
    disabledFeatures: ['FINANCE', 'CONTROL_TOWER', 'REPORTS'],
    limits: { maxBusinesses: 1, maxBranches: 1, maxUsers: 3, maxCouriers: 2, maxOrders: 300, maxStorageMb: 500, maxApiRequests: 1000 },
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const starterGateContext: GatekeeperContext = {
    uid: 'usr_owner_demo_a',
    membershipId: 'mem_demo_a_01',
    tenantId: 'tenant_demo_a',
    role: 'OWNER',
    subscription: subStarter
  };

  const financeDecision = canAccessModule(starterGateContext, 'FINANCE', now);
  assert(
    financeDecision.allowed === false && financeDecision.reason === 'ENTITLEMENT_MISSING',
    'Gatekeeper Shield: Módulo FINANCE es DENEGADO para plan Starter'
  );

  const navStarter = EntitlementDrivenNavigationResolver.resolveNavigation(starterGateContext, now);

  assert(
    !navStarter.some(n => n.id === 'nav_finance') && !navStarter.some(n => n.id === 'nav_control_tower'),
    'Navegación: Módulos finance y control-tower quedan completamente OCULTOS en el sidebar'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO 4: CROSS-TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- ESCENARIO 4: STRICT CROSS-TENANT ISOLATION ---');

  const crossContext: GatekeeperContext = {
    uid: 'usr_attacker',
    membershipId: 'mem_attacker',
    tenantId: 'tenant_attacker',
    role: 'OWNER',
    subscription: aggregateA.subscription // Perteneciente a 'tenant_demo_a'
  };

  const crossDecision = canAccessModule(crossContext, 'ORDERS', now);
  assert(
    crossDecision.allowed === false && crossDecision.reason === 'TENANT_MISMATCH',
    'Aislamiento: Intento de cruce de suscripción entre Tenants genera TENANT_MISMATCH'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO 5: PROVISIONING IDEMPOTENCY REPLAY & CONFLICT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- ESCENARIO 5: PROVISIONING IDEMPOTENCY & CONFLICT ---');

  // Replay exacto
  const replayRes = await ProvisioningEngine.provisionTenant(reqA, repos);
  assert(
    replayRes.status === 'REPLAYED',
    'Provisioning Idempotente: Misma clave y payload produce REPLAYED determinista'
  );

  // Conflicto por cambio de payload
  const conflictReq = { ...reqA, tenantType: 'AGENCY' as const };
  const conflictRes = await ProvisioningEngine.provisionTenant(conflictReq, repos);
  assert(
    conflictRes.status === 'CONFLICT',
    'Provisioning Idempotente: Misma clave con payload modificado produce CONFLICT'
  );

  // Seguridad de no mutación productiva
  assert(
    ProductionInvocationDetector.hasProductionBeenAttempted() === false,
    'Zero-Production: Cero intentos o conexiones a infraestructura productiva real'
  );

  return { passed, failed, errors };
}
