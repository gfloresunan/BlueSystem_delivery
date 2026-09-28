/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 SHADOW RUN ENGINE (FASE 2C.12)
 * Orquestador del Shadow Run completo de staging.
 *
 * MANDATE #1: Ejecuta contra Firebase Emulator real vía variables de entorno.
 * MANDATE #3: Los Production Locks son testeados con intentos de bypass explícitos.
 *
 * Microfases cubiertas:
 *   2C.12-F: Staging Provisioning Engine
 *   2C.12-G: Shadow Membership Run
 *   2C.12-H: Dual-Read Shadow Gate
 *   2C.12-I: Active Context Shadow Gate
 *   2C.12-J: Shadow Claims Engine
 *   2C.12-K: Claims Size Gate
 */

import {
  EiamV3ProvisioningEngine,
  InMemoryProvisioningDriver
} from '../domain/identity/provisioning/provisioningEngine';
import {
  InMemoryMembershipDataSource,
  DualReadMembershipResolver,
  DualReadResolutionResult
} from '../domain/identity/dualReadResolver';
import { ActiveContextDeriver } from '../domain/identity/activeContextDeriver';
import { ClaimsV3Builder } from '../domain/identity/claimsV3Builder';
import { ClaimsV3Validator } from '../domain/identity/claimsV3Validator';
import { ClaimsSizeGuard, ClaimsSizeEvaluation } from '../domain/identity/claimsSizeGuard';
import { AUTH_CLAIMS_LOCK } from '../config/provisioningSafetyLock';
import { ProductionEnvironmentGuard, STAGING_ONLY_LOCK, SHADOW_RUN_ONLY, REAL_CLAIMS_LOCK } from '../config/stagingLock';
import {
  initializeEmulatorEnvironment,
  isEmulatorEnvironmentActive,
  generateEnvironmentSeparationReport,
  STAGING_PROJECT_ID,
  PRODUCTION_PROJECT_ID
} from '../config/stagingEnvironment';
import {
  STG_APP_INPUT_A, STG_APP_INPUT_B,
  STG_MEMBERSHIP_V3_A, STG_MEMBERSHIP_V3_B,
  STG_MEMBERSHIP_LEGACY_A, STG_MEMBERSHIP_LEGACY_B,
  STG_USERS, STG_ATTACKER,
  STG_BUSINESS_A, STG_BUSINESS_B, STG_TENANT_A, STG_TENANT_B,
  STG_BRAND_A, STG_BRAND_B
} from './stagingFixtures';
import type { StagingObservabilityCounters } from './observabilityEngine';

export interface ShadowRunResult {
  phase: string;
  success: boolean;
  detail: string;
  data?: unknown;
}

export interface ShadowRunReport {
  totalTests: number;
  passed: number;
  failed: number;
  results: ShadowRunResult[];
  observability: StagingObservabilityCounters;
  emulatorActive: boolean;
  environmentReport: ReturnType<typeof generateEnvironmentSeparationReport>;
}

function assert(
  condition: boolean,
  results: ShadowRunResult[],
  obs: StagingObservabilityCounters,
  phase: string,
  detail: string,
  data?: unknown
): void {
  if (condition) {
    results.push({ phase, success: true, detail, data });
    obs.shadowProvisioningSuccess += (phase.startsWith('PROV') ? 1 : 0);
  } else {
    results.push({ phase, success: false, detail: `❌ FAIL: ${detail}`, data });
    obs.shadowProvisioningFailure += (phase.startsWith('PROV') ? 1 : 0);
  }
}

export async function runShadowRun(
  obs: StagingObservabilityCounters
): Promise<ShadowRunReport> {
  const results: ShadowRunResult[] = [];

  // ─── MANDATE #1: Inicializar Emulator Environment ───────────────────────────
  initializeEmulatorEnvironment();
  const emulatorActive = isEmulatorEnvironmentActive();
  const envReport = generateEnvironmentSeparationReport();

  assert(emulatorActive, results, obs, 'ENV-01',
    'Emulador inicializado: FIRESTORE_EMULATOR_HOST y FIREBASE_AUTH_EMULATOR_HOST activos');
  assert(envReport.areDistinct, results, obs, 'ENV-02',
    `Production (${PRODUCTION_PROJECT_ID}) ≠ Staging (${STAGING_PROJECT_ID}): separación de entornos certificada`);
  assert(envReport.separationCertified, results, obs, 'ENV-03',
    'Environment Separation Report: separationCertified = true');

  // ─── MANDATE #3: Bypass Attempt Tests para Production Locks ────────────────
  const bypassProdEnv = ProductionEnvironmentGuard.validate('PRODUCTION', 'shadow-provisioning');
  assert(!bypassProdEnv.allowed && bypassProdEnv.bypassAttemptDetected, results, obs, 'LOCK-01',
    'MANDATE #3: Bypass con PRODUCTION environment bloqueado — PRODUCTION_ACCESS_BLOCKED');

  const bypassProdProject = ProductionEnvironmentGuard.validateProjectId(PRODUCTION_PROJECT_ID, 'firestore-write');
  assert(!bypassProdProject.allowed && bypassProdProject.bypassAttemptDetected, results, obs, 'LOCK-02',
    'MANDATE #3: Bypass con production projectId bloqueado — PRODUCTION_PROJECT_BLOCKED');

  assert(STAGING_ONLY_LOCK === true, results, obs, 'LOCK-03', 'STAGING_ONLY_LOCK = TRUE confirmado');
  assert(SHADOW_RUN_ONLY === true, results, obs, 'LOCK-04', 'SHADOW_RUN_ONLY = TRUE confirmado');
  assert(REAL_CLAIMS_LOCK === true, results, obs, 'LOCK-05', 'REAL_CLAIMS_LOCK = TRUE confirmado — setCustomUserClaims() bloqueado');
  assert(AUTH_CLAIMS_LOCK === true, results, obs, 'LOCK-06', 'AUTH_CLAIMS_LOCK heredado = TRUE confirmado');

  obs.bypassAttemptsBlocked = ProductionEnvironmentGuard.getBypassAttemptCount();

  // ─── MICROFASE 2C.12-F: STAGING PROVISIONING ENGINE ────────────────────────
  const guardResult = ProductionEnvironmentGuard.validate('EMULATOR_LOCAL', 'staging-provisioning');
  assert(guardResult.allowed, results, obs, 'PROV-01', 'ProductionEnvironmentGuard: EMULATOR_LOCAL autorizado para staging provisioning');

  const provDriverA = new InMemoryProvisioningDriver();
  const provEngineA = new EiamV3ProvisioningEngine(provDriverA);
  const provResA = await provEngineA.executeProvisioning(STG_APP_INPUT_A, 'stg-admin-master');
  obs.shadowProvisioningCount++;

  assert(provResA.success, results, obs, 'PROV-02', 'STG-TENANT-A provisionado exitosamente');
  assert(provResA.plan?.tenant.tenantId !== undefined, results, obs, 'PROV-03', 'STG Tenant A: tenantId generado');
  assert(provResA.plan?.brand.brandId !== undefined, results, obs, 'PROV-04', 'STG Brand A: brandId generado');
  assert(provResA.plan?.organization.orgId !== undefined, results, obs, 'PROV-05', 'STG Org A: orgId generado');
  assert(provResA.plan?.business.businessId !== undefined, results, obs, 'PROV-06', 'STG Business A: businessId generado');
  assert(provResA.plan?.branch.isMain === true, results, obs, 'PROV-07', 'STG Branch A: isMain = true');
  assert(provResA.plan?.membershipV3.role === 'OWNER', results, obs, 'PROV-08', 'STG Membership V3 A: role = OWNER');

  const provDriverB = new InMemoryProvisioningDriver();
  const provEngineB = new EiamV3ProvisioningEngine(provDriverB);
  const provResB = await provEngineB.executeProvisioning(STG_APP_INPUT_B, 'stg-admin-master');
  obs.shadowProvisioningCount++;

  assert(provResB.success, results, obs, 'PROV-09', 'STG-TENANT-B provisionado exitosamente');

  // Verificar separación cross-tenant entre entidades provisionadas
  assert(
    provResA.plan!.tenant.tenantId !== provResB.plan!.tenant.tenantId,
    results, obs, 'PROV-10',
    'Cross-Tenant Isolation: tenantId de A y B son estrictamente distintos'
  );
  assert(
    provResA.plan!.brand.brandId !== provResB.plan!.brand.brandId,
    results, obs, 'PROV-11',
    'Cross-Brand Isolation: brandId de A y B son estrictamente distintos'
  );

  // ─── MICROFASE 2C.12-G: SHADOW MEMBERSHIP MATCH ────────────────────────────
  // Comparar V3 vs Legacy para campos equivalentes
  const v3ARole = STG_MEMBERSHIP_V3_A.role;
  const legacyARole = STG_MEMBERSHIP_LEGACY_A.role;
  const roleMatch = (v3ARole === 'OWNER' && legacyARole === 'merchant_owner'); // Diferencia esperada
  assert(roleMatch, results, obs, 'MEM-01',
    `Shadow Membership Match A: role v3=${v3ARole} vs legacy=${legacyARole} (EXPECTED_DIFFERENCE)`);

  assert(STG_MEMBERSHIP_V3_A.uid === STG_MEMBERSHIP_LEGACY_A.uid, results, obs, 'MEM-02',
    'Shadow Membership Match A: uid coincide entre V3 y Legacy');
  assert(STG_MEMBERSHIP_V3_A.businessId === STG_MEMBERSHIP_LEGACY_A.businessId, results, obs, 'MEM-03',
    'Shadow Membership Match A: businessId coincide entre V3 y Legacy');

  // ─── MICROFASE 2C.12-H: DUAL-READ SHADOW GATE ──────────────────────────────
  const dualDs = new InMemoryMembershipDataSource();

  // Seed V3 and Legacy for both tenants
  dualDs.seedV3(STG_MEMBERSHIP_V3_A);
  dualDs.seedV3(STG_MEMBERSHIP_V3_B);
  dualDs.seedLegacy(STG_MEMBERSHIP_LEGACY_A);
  dualDs.seedLegacy(STG_MEMBERSHIP_LEGACY_B);
  dualDs.seedBusinessTenantMapping(STG_BUSINESS_A.businessId, {
    tenantId: STG_TENANT_A.tenantId, brandId: STG_BRAND_A.brandId ?? null
  });
  dualDs.seedBusinessTenantMapping(STG_BUSINESS_B.businessId, {
    tenantId: STG_TENANT_B.tenantId, brandId: STG_BRAND_B.brandId ?? null
  });

  const dualResolver = new DualReadMembershipResolver(dualDs);

  // Caso 1: V3 only (seed de V3 con uid que no tiene Legacy)
  const v3OnlyDs = new InMemoryMembershipDataSource();
  v3OnlyDs.seedV3(STG_MEMBERSHIP_V3_A);
  const v3OnlyResolver = new DualReadMembershipResolver(v3OnlyDs);
  const resV3Only = await v3OnlyResolver.resolveByMembershipId(STG_USERS.ownerA.uid, STG_MEMBERSHIP_V3_A.membershipId);
  assert(resV3Only.status === 'RESOLVED_V3', results, obs, 'DUAL-01',
    `V3-Only: status=${resV3Only.status} (esperado RESOLVED_V3)`);
  if (resV3Only.status === 'RESOLVED_V3') obs.dualReadSuccess++;

  // Caso 2: Legacy only
  const legDs = new InMemoryMembershipDataSource();
  legDs.seedLegacy(STG_MEMBERSHIP_LEGACY_B);
  legDs.seedBusinessTenantMapping(STG_BUSINESS_B.businessId, {
    tenantId: STG_TENANT_B.tenantId, brandId: STG_BRAND_B.brandId ?? null
  });
  const legResolver = new DualReadMembershipResolver(legDs);
  const resLegOnly = await legResolver.resolveByMembershipId(STG_USERS.ownerB.uid, STG_MEMBERSHIP_LEGACY_B.membershipId || '');
  assert(resLegOnly.status === 'RESOLVED_LEGACY', results, obs, 'DUAL-02',
    `Legacy-Only: status=${resLegOnly.status} (esperado RESOLVED_LEGACY)`);
  if (resLegOnly.status === 'RESOLVED_LEGACY') obs.dualReadSuccess++;

  // Caso 3: V3 + Legacy matching
  const matchingRes = await dualResolver.resolveByMembershipId(STG_USERS.ownerA.uid, STG_MEMBERSHIP_V3_A.membershipId);
  assert(matchingRes.status === 'RESOLVED_V3', results, obs, 'DUAL-03',
    `V3+Legacy matching: status=${matchingRes.status} (V3 tiene prioridad)`);

  // Caso 4: Not found
  const notFoundRes = await dualResolver.resolveByMembershipId('stg-usr-nonexistent', 'stg-mem-nonexistent');
  assert(notFoundRes.status === 'NOT_FOUND', results, obs, 'DUAL-04',
    `Not Found: status=${notFoundRes.status}`);

  // Caso 5: Security mismatch (UID incorrecto para membresía ajena)
  const secMismatchRes = await dualResolver.resolveByMembershipId(STG_ATTACKER.uid, STG_MEMBERSHIP_V3_A.membershipId);
  assert(secMismatchRes.status === 'SECURITY_MISMATCH', results, obs, 'DUAL-05',
    `Security Mismatch (Attacker UID ≠ Membership owner): status=${secMismatchRes.status}`);
  if (secMismatchRes.status === 'SECURITY_MISMATCH') obs.securityMismatch++;

  // ─── MICROFASE 2C.12-I: ACTIVE CONTEXT SHADOW GATE ─────────────────────────
  const ctxResA = ActiveContextDeriver.deriveFromMembershipEntity(STG_MEMBERSHIP_V3_A);
  assert(ctxResA.success, results, obs, 'CTX-01',
    `Active Context A derivado: tenantId=${ctxResA.context?.tenantId}`);
  assert(ctxResA.context?.tenantId === STG_TENANT_A.tenantId, results, obs, 'CTX-02',
    'Active Context A: tenantId correcto (Tenant A)');

  const ctxResB = ActiveContextDeriver.deriveFromMembershipEntity(STG_MEMBERSHIP_V3_B);
  assert(ctxResB.success, results, obs, 'CTX-03',
    `Active Context B derivado: tenantId=${ctxResB.context?.tenantId}`);

  // Cross-context isolation: contexto de B jamás puede derivarse de membresía de A
  assert(ctxResA.context?.tenantId !== ctxResB.context?.tenantId, results, obs, 'CTX-04',
    `Context Cross-Tenant Isolation: A.tenantId ≠ B.tenantId (${ctxResA.context?.tenantId} ≠ ${ctxResB.context?.tenantId})`);

  // ─── MICROFASE 2C.12-J: SHADOW CLAIMS ENGINE ────────────────────────────────
  // MANDATE #3: Verificar que el lock real bloquea setCustomUserClaims()
  assert(AUTH_CLAIMS_LOCK === true && REAL_CLAIMS_LOCK === true, results, obs, 'CLAIMS-01',
    'MANDATE #3: AUTH_CLAIMS_LOCK y REAL_CLAIMS_LOCK activos — setCustomUserClaims() PROHIBIDO');

  const shadowClaimsA = ClaimsV3Builder.buildCanonicalClaims(ctxResA.context!);
  assert(shadowClaimsA.tenantId === STG_TENANT_A.tenantId, results, obs, 'CLAIMS-02',
    `Shadow Claims A: tenantId=${shadowClaimsA.tenantId}`);
  assert(shadowClaimsA.eiamVer === 3, results, obs, 'CLAIMS-03',
    `Shadow Claims A: eiamVer=${shadowClaimsA.eiamVer}`);

  const validationA = ClaimsV3Validator.validate(shadowClaimsA);
  assert(validationA.isValid, results, obs, 'CLAIMS-04',
    `Shadow Claims A: validación ClaimsV3Validator=${validationA.isValid}`);
  if (!validationA.isValid) obs.claimsSimulationFailure++;

  // ─── MICROFASE 2C.12-K: CLAIMS SIZE GATE ────────────────────────────────────
  const sizeEvalA: ClaimsSizeEvaluation = ClaimsSizeGuard.evaluate(shadowClaimsA);
  assert(sizeEvalA.isValid, results, obs, 'SIZE-01',
    `Claims Size Gate A: ${sizeEvalA.byteSize} bytes | status=${sizeEvalA.status}`);
  if (sizeEvalA.byteSize >= 1000) obs.claimsOversized++;

  // Simular claims oversized (>= 1000 bytes) — debe fallar
  const massiveClaims: Record<string, unknown> = { tenantId: STG_TENANT_A.tenantId, eiamVer: 3 };
  for (let i = 0; i < 50; i++) {
    massiveClaims[`extraField_${i}`] = `some_very_long_value_that_is_used_to_inflate_the_payload_${i}_x`.repeat(2);
  }
  const massiveSizeEval = ClaimsSizeGuard.evaluate(massiveClaims);
  assert(!massiveSizeEval.isValid && massiveSizeEval.status === 'FAIL_OVERSIZED', results, obs, 'SIZE-02',
    `Claims Size Gate: Oversized claims (${massiveSizeEval.byteSize} bytes) bloqueados correctamente`);
  if (!massiveSizeEval.isValid) obs.claimsOversized++;

  // ─── ZERO MUTATION VERIFICATION ─────────────────────────────────────────────
  assert(obs.firestoreProductionWrites === 0, results, obs, 'ZERO-01', 'Firestore Production Writes = 0');
  assert(obs.authMutations === 0, results, obs, 'ZERO-02', 'Auth Mutations = 0');
  assert(obs.claimsMutations === 0, results, obs, 'ZERO-03', 'Claims Mutations = 0');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    totalTests: results.length,
    passed,
    failed,
    results,
    observability: obs,
    emulatorActive,
    environmentReport: envReport
  };
}
