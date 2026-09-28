/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.11 CERTIFICATION
 * CERT-X01: Vertical Slice Cross-Tenant Isolation Certification
 * 
 * Regla:
 * TENANT A (Brand A, Business A, Orders A, Users A)
 *       X
 * TENANT B (Brand B, Business B, Orders B, Users B)
 * 
 * A -> B = STRICT DENIAL
 * B -> A = STRICT DENIAL
 * Cero fugas (0 LEAKS) en Web, Backend, Firestore Adapter, Gatekeeper, Brand y Órdenes.
 */

import {
  TenantEntity,
  BrandEntity,
  SubscriptionEntity,
  DEFAULT_BRAND_CONFIG
} from '../domain/platform/models';
import { MembershipV3Entity } from '../domain/identity/models';
import { GatekeeperContext } from '../domain/gatekeeper/models';
import { canAccessModule } from '../domain/gatekeeper/gatekeeper';
import { resolveDesignTokens } from '../domain/tokens/designTokenResolver';
import { createControlledFirestoreProvisioningAdapter } from '../domain/provisioning/firestoreProvisioningAdapter';

export async function runCertX01CrossTenantIsolationTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CERT-X01] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CERT-X01] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🔒 RUNNING CERT-X01: VERTICAL SLICE CROSS-TENANT ISOLATION');
  console.log('======================================================================\n');

  const now = 1700000000000;
  const { repos } = createControlledFirestoreProvisioningAdapter('EMULATOR_CONTROLLED');

  // 1. Configurar Tenant A (Pizzería Napoli)
  const tenantA: TenantEntity = {
    tenantId: 'tenant_napoli',
    name: 'Pizzería Napoli',
    legalName: 'Pizzería Napoli S.A. de C.V.',
    slug: 'pizzeria-napoli',
    type: 'WHITE_LABEL_COMMERCE',
    status: 'ACTIVE',
    primaryBrandId: 'brand_napoli',
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const brandA: BrandEntity = {
    brandId: 'brand_napoli',
    tenantId: 'tenant_napoli',
    displayName: 'Pizzería Napoli Original',
    shortName: 'Napoli',
    slug: 'napoli-original',
    visual: {
      ...DEFAULT_BRAND_CONFIG,
      primaryColor: '#DC2626',
      secondaryColor: '#991B1B'
    },
    metadata: {
      supportEmail: 'support@napoli.com',
      supportPhone: '+525512345678'
    },
    status: 'ACTIVE',
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const subA: SubscriptionEntity = {
    subscriptionId: 'sub_napoli',
    tenantId: 'tenant_napoli',
    planId: 'plan_pro',
    planName: 'Professional',
    planTier: 'PROFESSIONAL',
    status: 'ACTIVE',
    startDate: now,
    endDate: null,
    billingCycle: 'MONTHLY',
    enabledFeatures: ['ORDERS', 'CATALOG', 'FINANCE', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING'],
    disabledFeatures: [],
    limits: { maxBusinesses: 2, maxBranches: 5, maxUsers: 10, maxCouriers: 5, maxOrders: 1000, maxStorageMb: 1000, maxApiRequests: 5000 },
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const memA: MembershipV3Entity = {
    membershipId: 'mem_napoli_owner',
    uid: 'usr_napoli_owner',
    tenantId: 'tenant_napoli',
    brandId: 'brand_napoli',
    role: 'OWNER',
    status: 'ACTIVE',
    permissions: ['ORDERS:*', 'FINANCE:*'],
    createdAt: now,
    updatedAt: now,
    schemaVersion: '3.0'
  };

  // 2. Configurar Tenant B (Texas Burgers)
  const tenantB: TenantEntity = {
    tenantId: 'tenant_texas',
    name: 'Texas Burgers',
    legalName: 'Texas Burgers & Smokehouse LLC',
    slug: 'texas-burgers',
    type: 'WHITE_LABEL_COMMERCE',
    status: 'ACTIVE',
    primaryBrandId: 'brand_texas',
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const brandB: BrandEntity = {
    brandId: 'brand_texas',
    tenantId: 'tenant_texas',
    displayName: 'Texas Burgers & Ribs',
    shortName: 'Texas',
    slug: 'texas-burgers',
    visual: {
      ...DEFAULT_BRAND_CONFIG,
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706'
    },
    metadata: {
      supportEmail: 'support@texas.com',
      supportPhone: '+525598765432'
    },
    status: 'ACTIVE',
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const subB: SubscriptionEntity = {
    subscriptionId: 'sub_texas',
    tenantId: 'tenant_texas',
    planId: 'plan_starter',
    planName: 'Starter',
    planTier: 'STARTER',
    status: 'ACTIVE',
    startDate: now,
    endDate: null,
    billingCycle: 'MONTHLY',
    enabledFeatures: ['ORDERS', 'CATALOG', 'CUSTOMERS'],
    disabledFeatures: ['FINANCE', 'CONTROL_TOWER'],
    limits: { maxBusinesses: 1, maxBranches: 1, maxUsers: 3, maxCouriers: 2, maxOrders: 300, maxStorageMb: 500, maxApiRequests: 1000 },
    schemaVersion: '1.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const memB: MembershipV3Entity = {
    membershipId: 'mem_texas_cashier',
    uid: 'usr_texas_cashier',
    tenantId: 'tenant_texas',
    brandId: 'brand_texas',
    role: 'CASHIER',
    status: 'ACTIVE',
    permissions: ['ORDERS:*'],
    createdAt: now,
    updatedAt: now,
    schemaVersion: '3.0'
  };

  // Guardar en repositorio
  await repos.tenantRepo.save(tenantA);
  await repos.tenantRepo.save(tenantB);
  await repos.brandRepo.save(brandA);
  await repos.brandRepo.save(brandB);
  await repos.subscriptionRepo.save(subA);
  await repos.subscriptionRepo.save(subB);
  await repos.membershipRepo.save(memA);
  await repos.membershipRepo.save(memB);

  // Test 1: Aislamiento en Repositorio de Marcas
  const brandsOfA = await repos.brandRepo.findByTenantId('tenant_napoli');
  const brandsOfB = await repos.brandRepo.findByTenantId('tenant_texas');

  assert(
    brandsOfA.length === 1 && brandsOfA[0].brandId === 'brand_napoli',
    'Repositorio Firestore: Consulta por Tenant A retorna exclusivamente marcas de Tenant A'
  );
  assert(
    brandsOfB.length === 1 && brandsOfB[0].brandId === 'brand_texas',
    'Repositorio Firestore: Consulta por Tenant B retorna exclusivamente marcas de Tenant B'
  );

  // Test 2: Aislamiento en Tokens de Diseño Web
  const tokensA = resolveDesignTokens(brandA.brandId, brandA.visual);
  const tokensB = resolveDesignTokens(brandB.brandId, brandB.visual);

  assert(
    tokensA.colors.primary.toLowerCase() === '#dc2626' && tokensB.colors.primary.toLowerCase() === '#f59e0b',
    'Web Tokens: Los colores y estilos no se mezclan entre Tenant A y Tenant B'
  );

  // Test 3: Ataque Cross-Tenant Gatekeeper (Usuario B intentando usar suscripción de Tenant A)
  const maliciousContext: GatekeeperContext = {
    uid: 'usr_texas_cashier',
    membershipId: 'mem_texas_cashier',
    tenantId: 'tenant_texas',
    role: 'CASHIER',
    subscription: subA // Suscripción ajena de Tenant Napoli
  };

  const maliciousDecision = canAccessModule(maliciousContext, 'CONTROL_TOWER', now);
  assert(
    maliciousDecision.allowed === false && maliciousDecision.reason === 'TENANT_MISMATCH',
    'Gatekeeper Shield: Intento de suplantar suscripción entre Tenants produce TENANT_MISMATCH inmediato'
  );

  // Test 4: Aislamiento de Membresías
  const membershipsOfA = await repos.membershipRepo.findByTenantId('tenant_napoli');
  assert(
    membershipsOfA.every(m => m.tenantId === 'tenant_napoli'),
    'Membresías: Cero miembros de Tenant B son visibles bajo el alcance de Tenant A'
  );

  // Test 5: Aislamiento de Suscripciones
  const subLookupBFromA = await repos.subscriptionRepo.findByTenantId('tenant_napoli');
  assert(
    subLookupBFromA?.subscriptionId === 'sub_napoli' && subLookupBFromA?.tenantId === 'tenant_napoli',
    'Suscripciones: La consulta de suscripción permanece estrictamente aislada'
  );

  return { passed, failed, errors };
}
