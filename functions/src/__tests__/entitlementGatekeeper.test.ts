/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ENTITLEMENT & SUBSCRIPTION GATEKEEPER TESTS (FASE 2D.3)
 * Suite de Pruebas Unitarias para Evaluación de Suscripciones, Entitlements, Cuotas y Seguridad
 */

import { SubscriptionEntity } from '../domain/platform/models';
import { GatekeeperContext } from '../domain/gatekeeper/models';
import {
  canAccessModule,
  hasEntitlement,
  checkQuota,
  resolveEffectiveCapabilities
} from '../domain/gatekeeper/gatekeeper';
import { PLAN_CATALOG } from '../domain/gatekeeper/catalog';

export async function runEntitlementGatekeeperTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS ENTITLEMENT GATEKEEPER (FASE 2D.3)');
  console.log('============================================================\n');

  const now = 1700000000000; // Mock current timestamp fixed

  const baseActiveSub: SubscriptionEntity = {
    subscriptionId: 'sub_pro_001',
    tenantId: 'tenant_alpha',
    planId: 'plan_pro',
    planName: 'Professional Plan',
    planTier: 'PROFESSIONAL',
    status: 'ACTIVE',
    startDate: now - 100000,
    endDate: now + 10000000,
    billingCycle: 'MONTHLY',
    enabledFeatures: [
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
    ],
    disabledFeatures: [],
    limits: {
      maxBusinesses: 3,
      maxBranches: 5,
      maxUsers: 15,
      maxCouriers: 10,
      maxOrders: 2000,
      maxStorageMb: 2000,
      maxApiRequests: 10000
    },
    schemaVersion: '1.0',
    createdAt: now - 100000,
    updatedAt: now - 100000,
    createdBy: 'usr_admin',
    updatedBy: 'usr_admin'
  };

  const baseContext: GatekeeperContext = {
    uid: 'usr_owner_001',
    membershipId: 'mem_001',
    tenantId: 'tenant_alpha',
    role: 'OWNER',
    subscription: baseActiveSub
  };

  try {
    // ─── 1. SUBSCRIPTION LIFECYCLE (TC-S01 a TC-S05) ───────────────────────────
    console.log('--- 1. CICLO DE VIDA DE SUSCRIPCIÓN ---');

    // TC-S01: Suscripción activa permite acceso
    const resS01 = canAccessModule(baseContext, 'ORDERS', now);
    assert(resS01.allowed && resS01.reason === 'ALLOWED', 'TC-S01: Suscripción activa permite acceso');

    // TC-S02: Suscripción expirada por fecha deniega acceso
    const expiredContext: GatekeeperContext = {
      ...baseContext,
      subscription: { ...baseActiveSub, endDate: now - 1000 }
    };
    const resS02 = canAccessModule(expiredContext, 'ORDERS', now);
    assert(!resS02.allowed && resS02.reason === 'SUBSCRIPTION_EXPIRED', 'TC-S02: Suscripción expirada por fecha es denegada');

    // TC-S03: Suscripción suspendida deniega acceso
    const suspendedContext: GatekeeperContext = {
      ...baseContext,
      subscription: { ...baseActiveSub, status: 'SUSPENDED' }
    };
    const resS03 = canAccessModule(suspendedContext, 'ORDERS', now);
    assert(!resS03.allowed && resS03.reason === 'SUBSCRIPTION_INACTIVE', 'TC-S03: Suscripción suspendida es denegada');

    // TC-S04: Suscripción cancelada deniega acceso
    const cancelledContext: GatekeeperContext = {
      ...baseContext,
      subscription: { ...baseActiveSub, status: 'CANCELLED' }
    };
    const resS04 = canAccessModule(cancelledContext, 'ORDERS', now);
    assert(!resS04.allowed && resS04.reason === 'SUBSCRIPTION_INACTIVE', 'TC-S04: Suscripción cancelada es denegada');

    // TC-S05: Suscripción futura aún no iniciada deniega acceso
    const futureContext: GatekeeperContext = {
      ...baseContext,
      subscription: { ...baseActiveSub, startDate: now + 50000 }
    };
    const resS05 = canAccessModule(futureContext, 'ORDERS', now);
    assert(!resS05.allowed && resS05.reason === 'SUBSCRIPTION_FUTURE', 'TC-S05: Suscripción futura es denegada');

    // ─── 2. ENTITLEMENTS CONTRACTUALES (TC-E01 a TC-E05) ────────────────────────
    console.log('\n--- 2. ENTITLEMENTS CONTRACTUALES ---');

    // TC-E01: Entitlement presente en suscripción
    const resE01 = hasEntitlement(baseContext, 'CONTROL_TOWER', now);
    assert(resE01.allowed && resE01.reason === 'ALLOWED', 'TC-E01: Entitlement presente en suscripción');

    // TC-E02: Entitlement ausente en plan básico
    const starterSub: SubscriptionEntity = {
      ...baseActiveSub,
      planTier: 'STARTER',
      enabledFeatures: ['ORDERS', 'CATALOG', 'CUSTOMERS'] // No incluye CONTROL_TOWER ni ANALYTICS
    };
    const starterContext: GatekeeperContext = {
      ...baseContext,
      subscription: starterSub
    };
    const resE02 = canAccessModule(starterContext, 'CONTROL_TOWER', now);
    assert(!resE02.allowed && resE02.reason === 'ENTITLEMENT_MISSING', 'TC-E02: Módulo sin entitlement contratado es denegado (Default Deny)');

    // TC-E03: Módulo desconocido en catálogo
    const resE03 = canAccessModule(baseContext, 'UNKNOWN_FEATURE_XYZ', now);
    assert(!resE03.allowed && resE03.reason === 'MODULE_UNKNOWN', 'TC-E03: Módulo desconocido en catálogo es denegado');

    // TC-E04: Módulo explícitamente bloqueado en disabledFeatures
    const blockedSub: SubscriptionEntity = {
      ...baseActiveSub,
      enabledFeatures: ['ORDERS', 'CONTROL_TOWER', 'GPS_TRACKING'],
      disabledFeatures: ['CONTROL_TOWER'] // Override explícito de exclusión
    };
    const blockedContext: GatekeeperContext = {
      ...baseContext,
      subscription: blockedSub
    };
    const resE04 = canAccessModule(blockedContext, 'CONTROL_TOWER', now);
    assert(!resE04.allowed && resE04.reason === 'ENTITLEMENT_MISSING', 'TC-E04: Módulo en disabledFeatures es revocado');

    // TC-E05: Intento de bypass con comodines ('*', 'ALL')
    const wildcardSub: SubscriptionEntity = {
      ...baseActiveSub,
      enabledFeatures: ['*' as any, 'ALL' as any]
    };
    const wildcardContext: GatekeeperContext = {
      ...baseContext,
      subscription: wildcardSub
    };
    const resE05 = canAccessModule(wildcardContext, 'ANALYTICS', now);
    assert(!resE05.allowed && resE05.reason === 'ENTITLEMENT_MISSING', 'TC-E05: Comodines wildcard (*, ALL) son ignorados por seguridad');

    // ─── 3. AISLAMIENTO TENANT Y CONTEXTO (TC-T01 a TC-T04) ────────────────────
    console.log('\n--- 3. AISLAMIENTO MULTI-TENANT ---');

    // TC-T01: Mismo tenant
    const resT01 = canAccessModule(baseContext, 'ORDERS', now);
    assert(resT01.allowed, 'TC-T01: Contexto con tenant coincidente permitido');

    // TC-T02: Cross-Tenant Attempt (Usuario de Tenant B usando suscripción de Tenant A)
    const crossTenantContext: GatekeeperContext = {
      ...baseContext,
      tenantId: 'tenant_beta', // Diferente de baseActiveSub.tenantId ('tenant_alpha')
      subscription: baseActiveSub
    };
    const resT02 = canAccessModule(crossTenantContext, 'ORDERS', now);
    assert(!resT02.allowed && resT02.reason === 'TENANT_MISMATCH', 'TC-T02: Intento Cross-Tenant detectado y bloqueado (TENANT_MISMATCH)');

    // TC-T03: Suscripción nula / ausente
    const noSubContext: GatekeeperContext = {
      ...baseContext,
      subscription: null
    };
    const resT03 = canAccessModule(noSubContext, 'ORDERS', now);
    assert(!resT03.allowed && resT03.reason === 'SUBSCRIPTION_MISSING', 'TC-T03: Contexto sin suscripción bloqueado');

    // TC-T04: Contexto con UID vacío
    const invalidContext: GatekeeperContext = {
      ...baseContext,
      uid: ''
    };
    const resT04 = canAccessModule(invalidContext, 'ORDERS', now);
    assert(!resT04.allowed && resT04.reason === 'CONTEXT_INVALID', 'TC-T04: Contexto corrupto bloqueado');

    // ─── 4. SEGURIDAD DE ROLES Y CONFINAMIENTO (TC-R01 a TC-R05) ────────────────
    console.log('\n--- 4. CONFINAMIENTO DE ROLES ---');

    // TC-R01: OWNER puede acceder a finanzas si está contratado
    const resR01 = canAccessModule({ ...baseContext, role: 'OWNER' }, 'FINANCE', now);
    assert(resR01.allowed, 'TC-R01: OWNER autorizado en FINANCE');

    // TC-R02: MANAGER puede acceder a despacho
    const resR02 = canAccessModule({ ...baseContext, role: 'MANAGER' }, 'CONTROL_TOWER', now);
    assert(resR02.allowed, 'TC-R02: MANAGER autorizado en CONTROL_TOWER');

    // TC-R03: CASHIER tiene acceso a X_TO_Y pero NO a CONTROL_TOWER
    const cashierContext: GatekeeperContext = { ...baseContext, role: 'CASHIER' };
    const resR03a = canAccessModule(cashierContext, 'X_TO_Y_DELIVERY', now);
    const resR03b = canAccessModule(cashierContext, 'CONTROL_TOWER', now);
    assert(resR03a.allowed && !resR03b.allowed && resR03b.reason === 'ROLE_UNAUTHORIZED', 'TC-R03: CASHIER autorizado en POS/X-to-Y pero bloqueado en Control Tower');

    // TC-R04: ADMIN tiene acceso a catálogo y finanzas
    const adminContext: GatekeeperContext = { ...baseContext, role: 'ADMIN' };
    const resR04 = canAccessModule(adminContext, 'CATALOG', now);
    assert(resR04.allowed, 'TC-R04: ADMIN autorizado en CATALOG');

    // TC-R05: COOK Confinement (COOK puede ver pedidos KDS pero no finanzas ni control tower)
    const cookContext: GatekeeperContext = { ...baseContext, role: 'COOK' };
    const resR05a = canAccessModule(cookContext, 'ORDERS', now);
    const resR05b = canAccessModule(cookContext, 'FINANCE', now);
    const resR05c = canAccessModule(cookContext, 'CONTROL_TOWER', now);
    assert(
      resR05a.allowed &&
      !resR05b.allowed && resR05b.reason === 'ROLE_UNAUTHORIZED' &&
      !resR05c.allowed && resR05c.reason === 'ROLE_UNAUTHORIZED',
      'TC-R05: COOK estrictamente confinado a KDS (Bloqueado en Finanzas y Control Tower)'
    );

    // ─── 5. PREVENCIÓN DE ESCALAMIENTO DE PRIVILEGIOS (TC-P01 a TC-P05) ────────
    console.log('\n--- 5. PREVENCIÓN DE ESCALAMIENTO DE PRIVILEGIOS ---');

    // TC-P01: Rol falso o inyectado
    const fakeRoleContext: GatekeeperContext = { ...baseContext, role: 'SUPER_HACKER' };
    const resP01 = canAccessModule(fakeRoleContext, 'FINANCE', now);
    assert(!resP01.allowed && resP01.reason === 'ROLE_UNAUTHORIZED', 'TC-P01: Rol falso denegado');

    // TC-P02: Inyección de módulo no contratado por OWNER
    const resP02 = canAccessModule(starterContext, 'ANALYTICS', now);
    assert(!resP02.allowed && resP02.reason === 'ENTITLEMENT_MISSING', 'TC-P02: OWNER no puede acceder a módulos fuera de su plan (Owner no es omnipotente)');

    // TC-P03: Inyección de subscripción ajena
    const resP03 = canAccessModule({ ...baseContext, tenantId: 'tenant_victim' }, 'ORDERS', now);
    assert(!resP03.allowed && resP03.reason === 'TENANT_MISMATCH', 'TC-P03: Sustitución de Tenant ID rechazada');

    // TC-P04: Intersección estricta de capacidades calculadas
    const cookCapabilities = resolveEffectiveCapabilities(cookContext, now);
    const hasFinanceInCook = cookCapabilities.some(c => c.startsWith('FINANCE:'));
    const hasOrdersInCook = cookCapabilities.some(c => c.startsWith('ORDERS:'));
    assert(hasOrdersInCook && !hasFinanceInCook, 'TC-P04: resolveEffectiveCapabilities confina exactamente las acciones del rol');

    // TC-P05: Enterprise Holding Capabilities
    const enterpriseSub: SubscriptionEntity = {
      ...baseActiveSub,
      planTier: 'ENTERPRISE',
      enabledFeatures: PLAN_CATALOG.ENTERPRISE.defaultEntitlements,
      limits: PLAN_CATALOG.ENTERPRISE.defaultQuotas
    };
    const enterpriseContext: GatekeeperContext = {
      ...baseContext,
      subscription: enterpriseSub
    };
    const resP05 = canAccessModule(enterpriseContext, 'MULTI_BRAND', now);
    assert(resP05.allowed, 'TC-P05: Plan ENTERPRISE habilita MULTI_BRAND');

    // ─── 6. QUOTA ENGINE (TC-Q01 a TC-Q05) ─────────────────────────────────────
    console.log('\n--- 6. QUOTA ENGINE ---');

    // TC-Q01: Dentro del límite de cuota (Uso: 1, Límite: 3, Petición: 1)
    const resQ01 = checkQuota(baseContext, 'maxBusinesses', 1, 1, now);
    assert(resQ01.allowed && resQ01.reason === 'QUOTA_AVAILABLE' && resQ01.remaining === 1, 'TC-Q01: Cuota disponible');

    // TC-Q02: Cuota exactamente alcanzada (Uso: 3, Límite: 3, Petición: 1)
    const resQ02 = checkQuota(baseContext, 'maxBusinesses', 1, 3, now);
    assert(!resQ02.allowed && resQ02.reason === 'QUOTA_REACHED', 'TC-Q02: Cuota alcanzada deniega incremento');

    // TC-Q03: Cuota excedida (Uso: 2, Límite: 3, Petición: 2 -> Total 4 > 3)
    const resQ03 = checkQuota(baseContext, 'maxBusinesses', 2, 2, now);
    assert(!resQ03.allowed && resQ03.reason === 'QUOTA_EXCEEDED', 'TC-Q03: Cuota excedida deniega incremento');

    // TC-Q04: Cuota no definida en contrato (Default Deny)
    const resQ04 = checkQuota(baseContext, 'nonExistentQuotaKey', 1, 0, now);
    assert(!resQ04.allowed && resQ04.reason === 'QUOTA_UNDEFINED', 'TC-Q04: Cuota indefinida resulta en DENY');

    // TC-Q05: Cuota ilimitada (-1) en Plan Enterprise
    const resQ05 = checkQuota(enterpriseContext, 'maxOrders', 50000, 100000, now);
    assert(resQ05.allowed && resQ05.reason === 'QUOTA_AVAILABLE' && resQ05.remaining === -1, 'TC-Q05: Cuota ilimitada (-1) en Enterprise siempre disponible');

  } catch (err: any) {
    failed++;
    const msg = `Excepción inesperada: ${err.message || err}`;
    console.error(msg);
    errors.push(msg);
  }

  console.log('\n============================================================');
  console.log(`📊 RESULTADOS: ${passed} PASS, ${failed} FAIL`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}

if (require.main === module) {
  runEntitlementGatekeeperTests().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
