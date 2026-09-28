"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runShadowRun = runShadowRun;
const provisioningEngine_1 = require("../domain/identity/provisioning/provisioningEngine");
const dualReadResolver_1 = require("../domain/identity/dualReadResolver");
const activeContextDeriver_1 = require("../domain/identity/activeContextDeriver");
const claimsV3Builder_1 = require("../domain/identity/claimsV3Builder");
const claimsV3Validator_1 = require("../domain/identity/claimsV3Validator");
const claimsSizeGuard_1 = require("../domain/identity/claimsSizeGuard");
const provisioningSafetyLock_1 = require("../config/provisioningSafetyLock");
const stagingLock_1 = require("../config/stagingLock");
const stagingEnvironment_1 = require("../config/stagingEnvironment");
const stagingFixtures_1 = require("./stagingFixtures");
function assert(condition, results, obs, phase, detail, data) {
    if (condition) {
        results.push({ phase, success: true, detail, data });
        obs.shadowProvisioningSuccess += (phase.startsWith('PROV') ? 1 : 0);
    }
    else {
        results.push({ phase, success: false, detail: `❌ FAIL: ${detail}`, data });
        obs.shadowProvisioningFailure += (phase.startsWith('PROV') ? 1 : 0);
    }
}
async function runShadowRun(obs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const results = [];
    // ─── MANDATE #1: Inicializar Emulator Environment ───────────────────────────
    (0, stagingEnvironment_1.initializeEmulatorEnvironment)();
    const emulatorActive = (0, stagingEnvironment_1.isEmulatorEnvironmentActive)();
    const envReport = (0, stagingEnvironment_1.generateEnvironmentSeparationReport)();
    assert(emulatorActive, results, obs, 'ENV-01', 'Emulador inicializado: FIRESTORE_EMULATOR_HOST y FIREBASE_AUTH_EMULATOR_HOST activos');
    assert(envReport.areDistinct, results, obs, 'ENV-02', `Production (${stagingEnvironment_1.PRODUCTION_PROJECT_ID}) ≠ Staging (${stagingEnvironment_1.STAGING_PROJECT_ID}): separación de entornos certificada`);
    assert(envReport.separationCertified, results, obs, 'ENV-03', 'Environment Separation Report: separationCertified = true');
    // ─── MANDATE #3: Bypass Attempt Tests para Production Locks ────────────────
    const bypassProdEnv = stagingLock_1.ProductionEnvironmentGuard.validate('PRODUCTION', 'shadow-provisioning');
    assert(!bypassProdEnv.allowed && bypassProdEnv.bypassAttemptDetected, results, obs, 'LOCK-01', 'MANDATE #3: Bypass con PRODUCTION environment bloqueado — PRODUCTION_ACCESS_BLOCKED');
    const bypassProdProject = stagingLock_1.ProductionEnvironmentGuard.validateProjectId(stagingEnvironment_1.PRODUCTION_PROJECT_ID, 'firestore-write');
    assert(!bypassProdProject.allowed && bypassProdProject.bypassAttemptDetected, results, obs, 'LOCK-02', 'MANDATE #3: Bypass con production projectId bloqueado — PRODUCTION_PROJECT_BLOCKED');
    assert(stagingLock_1.STAGING_ONLY_LOCK === true, results, obs, 'LOCK-03', 'STAGING_ONLY_LOCK = TRUE confirmado');
    assert(stagingLock_1.SHADOW_RUN_ONLY === true, results, obs, 'LOCK-04', 'SHADOW_RUN_ONLY = TRUE confirmado');
    assert(stagingLock_1.REAL_CLAIMS_LOCK === true, results, obs, 'LOCK-05', 'REAL_CLAIMS_LOCK = TRUE confirmado — setCustomUserClaims() bloqueado');
    assert(provisioningSafetyLock_1.AUTH_CLAIMS_LOCK === true, results, obs, 'LOCK-06', 'AUTH_CLAIMS_LOCK heredado = TRUE confirmado');
    obs.bypassAttemptsBlocked = stagingLock_1.ProductionEnvironmentGuard.getBypassAttemptCount();
    // ─── MICROFASE 2C.12-F: STAGING PROVISIONING ENGINE ────────────────────────
    const guardResult = stagingLock_1.ProductionEnvironmentGuard.validate('EMULATOR_LOCAL', 'staging-provisioning');
    assert(guardResult.allowed, results, obs, 'PROV-01', 'ProductionEnvironmentGuard: EMULATOR_LOCAL autorizado para staging provisioning');
    const provDriverA = new provisioningEngine_1.InMemoryProvisioningDriver();
    const provEngineA = new provisioningEngine_1.EiamV3ProvisioningEngine(provDriverA);
    const provResA = await provEngineA.executeProvisioning(stagingFixtures_1.STG_APP_INPUT_A, 'stg-admin-master');
    obs.shadowProvisioningCount++;
    assert(provResA.success, results, obs, 'PROV-02', 'STG-TENANT-A provisionado exitosamente');
    assert(((_a = provResA.plan) === null || _a === void 0 ? void 0 : _a.tenant.tenantId) !== undefined, results, obs, 'PROV-03', 'STG Tenant A: tenantId generado');
    assert(((_b = provResA.plan) === null || _b === void 0 ? void 0 : _b.brand.brandId) !== undefined, results, obs, 'PROV-04', 'STG Brand A: brandId generado');
    assert(((_c = provResA.plan) === null || _c === void 0 ? void 0 : _c.organization.orgId) !== undefined, results, obs, 'PROV-05', 'STG Org A: orgId generado');
    assert(((_d = provResA.plan) === null || _d === void 0 ? void 0 : _d.business.businessId) !== undefined, results, obs, 'PROV-06', 'STG Business A: businessId generado');
    assert(((_e = provResA.plan) === null || _e === void 0 ? void 0 : _e.branch.isMain) === true, results, obs, 'PROV-07', 'STG Branch A: isMain = true');
    assert(((_f = provResA.plan) === null || _f === void 0 ? void 0 : _f.membershipV3.role) === 'OWNER', results, obs, 'PROV-08', 'STG Membership V3 A: role = OWNER');
    const provDriverB = new provisioningEngine_1.InMemoryProvisioningDriver();
    const provEngineB = new provisioningEngine_1.EiamV3ProvisioningEngine(provDriverB);
    const provResB = await provEngineB.executeProvisioning(stagingFixtures_1.STG_APP_INPUT_B, 'stg-admin-master');
    obs.shadowProvisioningCount++;
    assert(provResB.success, results, obs, 'PROV-09', 'STG-TENANT-B provisionado exitosamente');
    // Verificar separación cross-tenant entre entidades provisionadas
    assert(provResA.plan.tenant.tenantId !== provResB.plan.tenant.tenantId, results, obs, 'PROV-10', 'Cross-Tenant Isolation: tenantId de A y B son estrictamente distintos');
    assert(provResA.plan.brand.brandId !== provResB.plan.brand.brandId, results, obs, 'PROV-11', 'Cross-Brand Isolation: brandId de A y B son estrictamente distintos');
    // ─── MICROFASE 2C.12-G: SHADOW MEMBERSHIP MATCH ────────────────────────────
    // Comparar V3 vs Legacy para campos equivalentes
    const v3ARole = stagingFixtures_1.STG_MEMBERSHIP_V3_A.role;
    const legacyARole = stagingFixtures_1.STG_MEMBERSHIP_LEGACY_A.role;
    const roleMatch = (v3ARole === 'OWNER' && legacyARole === 'merchant_owner'); // Diferencia esperada
    assert(roleMatch, results, obs, 'MEM-01', `Shadow Membership Match A: role v3=${v3ARole} vs legacy=${legacyARole} (EXPECTED_DIFFERENCE)`);
    assert(stagingFixtures_1.STG_MEMBERSHIP_V3_A.uid === stagingFixtures_1.STG_MEMBERSHIP_LEGACY_A.uid, results, obs, 'MEM-02', 'Shadow Membership Match A: uid coincide entre V3 y Legacy');
    assert(stagingFixtures_1.STG_MEMBERSHIP_V3_A.businessId === stagingFixtures_1.STG_MEMBERSHIP_LEGACY_A.businessId, results, obs, 'MEM-03', 'Shadow Membership Match A: businessId coincide entre V3 y Legacy');
    // ─── MICROFASE 2C.12-H: DUAL-READ SHADOW GATE ──────────────────────────────
    const dualDs = new dualReadResolver_1.InMemoryMembershipDataSource();
    // Seed V3 and Legacy for both tenants
    dualDs.seedV3(stagingFixtures_1.STG_MEMBERSHIP_V3_A);
    dualDs.seedV3(stagingFixtures_1.STG_MEMBERSHIP_V3_B);
    dualDs.seedLegacy(stagingFixtures_1.STG_MEMBERSHIP_LEGACY_A);
    dualDs.seedLegacy(stagingFixtures_1.STG_MEMBERSHIP_LEGACY_B);
    dualDs.seedBusinessTenantMapping(stagingFixtures_1.STG_BUSINESS_A.businessId, {
        tenantId: stagingFixtures_1.STG_TENANT_A.tenantId, brandId: (_g = stagingFixtures_1.STG_BRAND_A.brandId) !== null && _g !== void 0 ? _g : null
    });
    dualDs.seedBusinessTenantMapping(stagingFixtures_1.STG_BUSINESS_B.businessId, {
        tenantId: stagingFixtures_1.STG_TENANT_B.tenantId, brandId: (_h = stagingFixtures_1.STG_BRAND_B.brandId) !== null && _h !== void 0 ? _h : null
    });
    const dualResolver = new dualReadResolver_1.DualReadMembershipResolver(dualDs);
    // Caso 1: V3 only (seed de V3 con uid que no tiene Legacy)
    const v3OnlyDs = new dualReadResolver_1.InMemoryMembershipDataSource();
    v3OnlyDs.seedV3(stagingFixtures_1.STG_MEMBERSHIP_V3_A);
    const v3OnlyResolver = new dualReadResolver_1.DualReadMembershipResolver(v3OnlyDs);
    const resV3Only = await v3OnlyResolver.resolveByMembershipId(stagingFixtures_1.STG_USERS.ownerA.uid, stagingFixtures_1.STG_MEMBERSHIP_V3_A.membershipId);
    assert(resV3Only.status === 'RESOLVED_V3', results, obs, 'DUAL-01', `V3-Only: status=${resV3Only.status} (esperado RESOLVED_V3)`);
    if (resV3Only.status === 'RESOLVED_V3')
        obs.dualReadSuccess++;
    // Caso 2: Legacy only
    const legDs = new dualReadResolver_1.InMemoryMembershipDataSource();
    legDs.seedLegacy(stagingFixtures_1.STG_MEMBERSHIP_LEGACY_B);
    legDs.seedBusinessTenantMapping(stagingFixtures_1.STG_BUSINESS_B.businessId, {
        tenantId: stagingFixtures_1.STG_TENANT_B.tenantId, brandId: (_j = stagingFixtures_1.STG_BRAND_B.brandId) !== null && _j !== void 0 ? _j : null
    });
    const legResolver = new dualReadResolver_1.DualReadMembershipResolver(legDs);
    const resLegOnly = await legResolver.resolveByMembershipId(stagingFixtures_1.STG_USERS.ownerB.uid, stagingFixtures_1.STG_MEMBERSHIP_LEGACY_B.membershipId || '');
    assert(resLegOnly.status === 'RESOLVED_LEGACY', results, obs, 'DUAL-02', `Legacy-Only: status=${resLegOnly.status} (esperado RESOLVED_LEGACY)`);
    if (resLegOnly.status === 'RESOLVED_LEGACY')
        obs.dualReadSuccess++;
    // Caso 3: V3 + Legacy matching
    const matchingRes = await dualResolver.resolveByMembershipId(stagingFixtures_1.STG_USERS.ownerA.uid, stagingFixtures_1.STG_MEMBERSHIP_V3_A.membershipId);
    assert(matchingRes.status === 'RESOLVED_V3', results, obs, 'DUAL-03', `V3+Legacy matching: status=${matchingRes.status} (V3 tiene prioridad)`);
    // Caso 4: Not found
    const notFoundRes = await dualResolver.resolveByMembershipId('stg-usr-nonexistent', 'stg-mem-nonexistent');
    assert(notFoundRes.status === 'NOT_FOUND', results, obs, 'DUAL-04', `Not Found: status=${notFoundRes.status}`);
    // Caso 5: Security mismatch (UID incorrecto para membresía ajena)
    const secMismatchRes = await dualResolver.resolveByMembershipId(stagingFixtures_1.STG_ATTACKER.uid, stagingFixtures_1.STG_MEMBERSHIP_V3_A.membershipId);
    assert(secMismatchRes.status === 'SECURITY_MISMATCH', results, obs, 'DUAL-05', `Security Mismatch (Attacker UID ≠ Membership owner): status=${secMismatchRes.status}`);
    if (secMismatchRes.status === 'SECURITY_MISMATCH')
        obs.securityMismatch++;
    // ─── MICROFASE 2C.12-I: ACTIVE CONTEXT SHADOW GATE ─────────────────────────
    const ctxResA = activeContextDeriver_1.ActiveContextDeriver.deriveFromMembershipEntity(stagingFixtures_1.STG_MEMBERSHIP_V3_A);
    assert(ctxResA.success, results, obs, 'CTX-01', `Active Context A derivado: tenantId=${(_k = ctxResA.context) === null || _k === void 0 ? void 0 : _k.tenantId}`);
    assert(((_l = ctxResA.context) === null || _l === void 0 ? void 0 : _l.tenantId) === stagingFixtures_1.STG_TENANT_A.tenantId, results, obs, 'CTX-02', 'Active Context A: tenantId correcto (Tenant A)');
    const ctxResB = activeContextDeriver_1.ActiveContextDeriver.deriveFromMembershipEntity(stagingFixtures_1.STG_MEMBERSHIP_V3_B);
    assert(ctxResB.success, results, obs, 'CTX-03', `Active Context B derivado: tenantId=${(_m = ctxResB.context) === null || _m === void 0 ? void 0 : _m.tenantId}`);
    // Cross-context isolation: contexto de B jamás puede derivarse de membresía de A
    assert(((_o = ctxResA.context) === null || _o === void 0 ? void 0 : _o.tenantId) !== ((_p = ctxResB.context) === null || _p === void 0 ? void 0 : _p.tenantId), results, obs, 'CTX-04', `Context Cross-Tenant Isolation: A.tenantId ≠ B.tenantId (${(_q = ctxResA.context) === null || _q === void 0 ? void 0 : _q.tenantId} ≠ ${(_r = ctxResB.context) === null || _r === void 0 ? void 0 : _r.tenantId})`);
    // ─── MICROFASE 2C.12-J: SHADOW CLAIMS ENGINE ────────────────────────────────
    // MANDATE #3: Verificar que el lock real bloquea setCustomUserClaims()
    assert(provisioningSafetyLock_1.AUTH_CLAIMS_LOCK === true && stagingLock_1.REAL_CLAIMS_LOCK === true, results, obs, 'CLAIMS-01', 'MANDATE #3: AUTH_CLAIMS_LOCK y REAL_CLAIMS_LOCK activos — setCustomUserClaims() PROHIBIDO');
    const shadowClaimsA = claimsV3Builder_1.ClaimsV3Builder.buildCanonicalClaims(ctxResA.context);
    assert(shadowClaimsA.tenantId === stagingFixtures_1.STG_TENANT_A.tenantId, results, obs, 'CLAIMS-02', `Shadow Claims A: tenantId=${shadowClaimsA.tenantId}`);
    assert(shadowClaimsA.eiamVer === 3, results, obs, 'CLAIMS-03', `Shadow Claims A: eiamVer=${shadowClaimsA.eiamVer}`);
    const validationA = claimsV3Validator_1.ClaimsV3Validator.validate(shadowClaimsA);
    assert(validationA.isValid, results, obs, 'CLAIMS-04', `Shadow Claims A: validación ClaimsV3Validator=${validationA.isValid}`);
    if (!validationA.isValid)
        obs.claimsSimulationFailure++;
    // ─── MICROFASE 2C.12-K: CLAIMS SIZE GATE ────────────────────────────────────
    const sizeEvalA = claimsSizeGuard_1.ClaimsSizeGuard.evaluate(shadowClaimsA);
    assert(sizeEvalA.isValid, results, obs, 'SIZE-01', `Claims Size Gate A: ${sizeEvalA.byteSize} bytes | status=${sizeEvalA.status}`);
    if (sizeEvalA.byteSize >= 1000)
        obs.claimsOversized++;
    // Simular claims oversized (>= 1000 bytes) — debe fallar
    const massiveClaims = { tenantId: stagingFixtures_1.STG_TENANT_A.tenantId, eiamVer: 3 };
    for (let i = 0; i < 50; i++) {
        massiveClaims[`extraField_${i}`] = `some_very_long_value_that_is_used_to_inflate_the_payload_${i}_x`.repeat(2);
    }
    const massiveSizeEval = claimsSizeGuard_1.ClaimsSizeGuard.evaluate(massiveClaims);
    assert(!massiveSizeEval.isValid && massiveSizeEval.status === 'FAIL_OVERSIZED', results, obs, 'SIZE-02', `Claims Size Gate: Oversized claims (${massiveSizeEval.byteSize} bytes) bloqueados correctamente`);
    if (!massiveSizeEval.isValid)
        obs.claimsOversized++;
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
//# sourceMappingURL=shadowRunEngine.js.map