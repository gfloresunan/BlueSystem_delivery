/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.11 CERTIFICATION
 * CERT-G01: Gatekeeper UI Shield & Route Guard Certification
 * 
 * Regla:
 * Un módulo no contratado no aparece en navegación y tampoco puede ser accedido
 * mediante manipulación directa de ruta/URL/estado (Principio de Default Deny).
 */

import { GatekeeperContext } from '../domain/gatekeeper/models';
import { canAccessModule, hasEntitlement, resolveEffectiveCapabilities } from '../domain/gatekeeper/gatekeeper';
import { SubscriptionEntity } from '../domain/platform/models';

export function runCertG01GatekeeperShieldTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CERT-G01] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CERT-G01] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🛡️ RUNNING CERT-G01: GATEKEEPER UI SHIELD & ROUTE GUARD');
  console.log('======================================================================\n');

  const now = 1700000000000;

  const starterSubscription: SubscriptionEntity = {
    subscriptionId: 'sub_starter_01',
    tenantId: 'tenant_starter',
    planId: 'plan_starter',
    planName: 'Starter Plan',
    planTier: 'STARTER',
    status: 'ACTIVE',
    startDate: 1690000000000,
    endDate: null,
    billingCycle: 'MONTHLY',
    enabledFeatures: ['ORDERS', 'CATALOG', 'CUSTOMERS'],
    disabledFeatures: ['FINANCE', 'CONTROL_TOWER', 'REPORTS'],
    limits: { maxBusinesses: 1, maxBranches: 1, maxUsers: 3, maxCouriers: 2, maxOrders: 300, maxStorageMb: 500, maxApiRequests: 1000 },
    schemaVersion: '1.0',
    createdAt: 1690000000000,
    updatedAt: 1690000000000,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const starterContext: GatekeeperContext = {
    uid: 'usr_owner_starter',
    membershipId: 'mem_starter_01',
    tenantId: 'tenant_starter',
    role: 'OWNER',
    subscription: starterSubscription
  };

  // Test 1: Módulo permitido en plan Starter (ORDERS) -> ALLOW
  const accessOrders = canAccessModule(starterContext, 'ORDERS', now);
  assert(
    accessOrders.allowed === true && accessOrders.reason === 'ALLOWED',
    'Módulo ORDERS con rol OWNER y suscripción STARTER activa es PERMITIDO'
  );

  // Test 2: Módulo no contratado (FINANCE) -> DENY (ENTITLEMENT_MISSING)
  const accessFinance = canAccessModule(starterContext, 'FINANCE', now);
  assert(
    accessFinance.allowed === false && accessFinance.reason === 'ENTITLEMENT_MISSING',
    'Módulo FINANCE en plan STARTER es DENEGADO con ENTITLEMENT_MISSING'
  );

  // Test 3: Módulo Control Tower no contratado -> DENY (ENTITLEMENT_MISSING)
  const accessControlTower = canAccessModule(starterContext, 'CONTROL_TOWER', now);
  assert(
    accessControlTower.allowed === false && accessControlTower.reason === 'ENTITLEMENT_MISSING',
    'Módulo CONTROL_TOWER en plan STARTER es DENEGADO'
  );

  // Test 4: Restricción estricta de Rol (COOK intentando acceder a CATALOG o FINANCE) -> ROLE_UNAUTHORIZED
  const cookContext: GatekeeperContext = {
    uid: 'usr_cook_01',
    membershipId: 'mem_cook_01',
    tenantId: 'tenant_starter',
    role: 'COOK',
    subscription: starterSubscription
  };

  const cookAccessOrders = canAccessModule(cookContext, 'ORDERS', now);
  assert(
    cookAccessOrders.allowed === true,
    'Rol COOK puede acceder a ORDERS (KDS)'
  );

  const cookAccessCatalog = canAccessModule(cookContext, 'CATALOG', now);
  assert(
    cookAccessCatalog.allowed === false && cookAccessCatalog.reason === 'ROLE_UNAUTHORIZED',
    'Rol COOK es DENEGADO en CATALOG con ROLE_UNAUTHORIZED'
  );

  // Test 5: Suscripción Suspendida o Vencida -> Bloqueo Global Fail-Closed
  const suspendedSub: SubscriptionEntity = {
    ...starterSubscription,
    status: 'SUSPENDED'
  };
  const suspendedContext: GatekeeperContext = {
    ...starterContext,
    subscription: suspendedSub
  };

  const suspendedAccess = canAccessModule(suspendedContext, 'ORDERS', now);
  assert(
    suspendedAccess.allowed === false && suspendedAccess.reason === 'SUBSCRIPTION_INACTIVE',
    'Suscripción SUSPENDED bloquea acceso a ORDERS con SUBSCRIPTION_INACTIVE'
  );

  // Test 6: Invariante de Tenant Mismatch en Gatekeeper
  const mismatchContext: GatekeeperContext = {
    ...starterContext,
    tenantId: 'tenant_attacker',
    subscription: starterSubscription // Perteneciente a 'tenant_starter'
  };
  const mismatchAccess = canAccessModule(mismatchContext, 'ORDERS', now);
  assert(
    mismatchAccess.allowed === false && mismatchAccess.reason === 'TENANT_MISMATCH',
    'Discrepancia entre Context TenantId y Subscription TenantId produce TENANT_MISMATCH estricto'
  );

  return { passed, failed, errors };
}
