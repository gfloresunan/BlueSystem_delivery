/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Suite de Pruebas Unitarias Exhaustivas para Claims V3 Engine & Auth Safety Gate (TC-C01 a TC-C20)
 */

import {
  DualReadMembershipResolver,
  InMemoryMembershipDataSource
} from '../domain/identity/dualReadResolver';
import { MembershipV3Entity, LegacyMembershipRecord, CanonicalCustomClaimsV3, ActiveTenantContext } from '../domain/identity/models';
import { ActiveContextDeriver } from '../domain/identity/activeContextDeriver';
import { ClaimsV3Builder } from '../domain/identity/claimsV3Builder';
import { ClaimsV3Validator } from '../domain/identity/claimsV3Validator';
import { ClaimsSizeGuard } from '../domain/identity/claimsSizeGuard';
import { ClaimsSimulationEngine } from '../domain/identity/claimsSimulationEngine';
import { AuthSafetyGate, AuthMutationBlockedError } from '../domain/identity/authSafetyGate';

export async function runClaimsV3EngineTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS CLAIMS V3 ENGINE (FASE 2C.4)');
  console.log('============================================================\n');

  try {
    const ds = new InMemoryMembershipDataSource();
    const resolver = new DualReadMembershipResolver(ds);
    const engine = new ClaimsSimulationEngine(resolver);

    const validV3: MembershipV3Entity = {
      membershipId: 'mem_v3_alpha',
      uid: 'usr_alpha_100',
      tenantId: 'ten_fitoni_77a',
      brandId: 'br_fitoni_express',
      organizationId: 'org_fitoni_holding',
      businessId: 'biz_fitoni_burger',
      branchId: 'br_sucursal_central',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'VIEW_FINANCE'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: '3.0'
    };

    const validLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_leg_beta',
      uid: 'usr_beta_200',
      businessId: 'biz_tacos_01',
      orgId: 'org_tacos_group',
      branchId: 'branch_north',
      role: 'manager',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS']
    };

    ds.seedV3(validV3);
    ds.seedLegacy(validLegacy);
    ds.seedBusinessTenantMapping('biz_tacos_01', {
      tenantId: 'ten_tacos_88b',
      brandId: 'br_tacos_grill',
      organizationId: 'org_tacos_group'
    });

    // ─── TC-C01 a TC-C04: ACTIVE CONTEXT & RESOLUTION PIPELINE ───────────────
    console.log('--- TEST TC-C01 a TC-C04: ACTIVE CONTEXT & CLAIMS DERIVATION ---');
    // TC-C01: Membership V3 válida → Active Context + Claims V3
    const resC01 = await engine.simulateForMembership('usr_alpha_100', 'mem_v3_alpha');
    assert(
      resC01.success &&
      resC01.context?.tenantId === 'ten_fitoni_77a' &&
      resC01.claims?.eiamVer === 3 &&
      resC01.claims?.role === 'OWNER',
      'TC-C01: Membership V3 válida produce Active Context y Claims V3 canónicos'
    );

    // TC-C02: Membership Legacy resoluble → Legacy Context + Claims Derivados
    const resC02 = await engine.simulateForMembership('usr_beta_200', 'mem_leg_beta');
    assert(
      resC02.success &&
      resC02.context?.tenantId === 'ten_tacos_88b' &&
      resC02.claims?.eiamVer === 3 &&
      resC02.claims?.role === 'MANAGER',
      'TC-C02: Membership Legacy resoluble deriva Contexto y Claims V3 válidos'
    );

    // TC-C03: MIGRATION_PENDING → FAIL
    const unresolvableLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_unmapped',
      uid: 'usr_gamma_300',
      businessId: 'biz_orphan',
      role: 'cashier',
      status: 'ACTIVE'
    };
    ds.seedLegacy(unresolvableLegacy);
    const resC03 = await engine.simulateForMembership('usr_gamma_300', 'mem_unmapped');
    assert(
      !resC03.success && resC03.context === null && resC03.claims === null,
      'TC-C03: MIGRATION_PENDING falla cerradamente sin producir Context ni Claims'
    );

    // TC-C04: AMBIGUOUS → FAIL
    const ambiguousLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_ambiguous',
      uid: 'usr_delta_400',
      businessId: 'biz_conflict_biz',
      role: 'owner',
      status: 'ACTIVE'
    };
    ds.seedLegacy(ambiguousLegacy);
    ds.seedBusinessTenantMapping('biz_conflict_biz', {
      tenantId: 'ten_conflict_01',
      isAmbiguous: true
    });
    const resC04 = await engine.simulateForMembership('usr_delta_400', 'mem_ambiguous');
    assert(
      !resC04.success && resC04.context === null && resC04.claims === null,
      'TC-C04: Estado AMBIGUOUS falla cerradamente sin generar Claims'
    );

    // ─── TC-C05 a TC-C11: SECURITY & LIFECYCLE GUARDS ────────────────────────
    console.log('\n--- TEST TC-C05 a TC-C11: SECURITY & LIFECYCLE GUARDS ---');
    // TC-C05: UID incorrecto → FAIL
    const resC05 = await engine.simulateForMembership('usr_attacker', 'mem_v3_alpha');
    assert(
      !resC05.success && resC05.resolutionResult.status === 'SECURITY_MISMATCH',
      'TC-C05: UID cruzado/spoofing bloqueado (SECURITY_MISMATCH)'
    );

    // TC-C06: Tenant ficticio (tenant_bluesystem_default) → FAIL
    const fakeDefaultLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_fake_default',
      uid: 'usr_fake',
      businessId: 'biz_fake',
      role: 'owner',
      status: 'ACTIVE'
    };
    ds.seedLegacy(fakeDefaultLegacy);
    ds.seedBusinessTenantMapping('biz_fake', {
      tenantId: 'tenant_bluesystem_default'
    });
    const resC06 = await engine.simulateForMembership('usr_fake', 'mem_fake_default');
    assert(
      !resC06.success && resC06.claims === null,
      'TC-C06: Intento de resolución a tenant_bluesystem_default bloqueado'
    );

    // TC-C07: Tenant inexistente / no encontrado → FAIL
    const resC07 = await engine.simulateForMembership('usr_non_existent', 'mem_not_found');
    assert(
      !resC07.success && resC07.resolutionResult.status === 'NOT_FOUND',
      'TC-C07: Membresía inexistente resulta en NOT_FOUND y falla simulación'
    );

    // TC-C08: Tenant vacío o whitespace → FAIL
    const invalidTenantMembership: MembershipV3Entity = {
      ...validV3,
      membershipId: 'mem_empty_tenant',
      tenantId: '   '
    };
    const resC08Derive = ActiveContextDeriver.deriveFromMembershipEntity(invalidTenantMembership);
    assert(
      !resC08Derive.success && resC08Derive.context === null,
      'TC-C08: tenantId con solo espacios rechazado por ActiveContextDeriver'
    );

    // TC-C09: Membership SUSPENDED → FAIL (No active context)
    const suspendedV3: MembershipV3Entity = {
      ...validV3,
      membershipId: 'mem_suspended',
      uid: 'usr_susp',
      status: 'SUSPENDED'
    };
    const resC09Derive = ActiveContextDeriver.deriveFromMembershipEntity(suspendedV3);
    assert(
      !resC09Derive.success && resC09Derive.context === null,
      'TC-C09: Membresía SUSPENDED no produce Active Context'
    );

    // TC-C10: Membership REVOKED → FAIL (No active context)
    const revokedV3: MembershipV3Entity = {
      ...validV3,
      membershipId: 'mem_revoked',
      uid: 'usr_revk',
      status: 'REVOKED'
    };
    const resC10Derive = ActiveContextDeriver.deriveFromMembershipEntity(revokedV3);
    assert(
      !resC10Derive.success && resC10Derive.context === null,
      'TC-C10: Membresía REVOKED no produce Active Context'
    );

    // TC-C11: Role inválido → FAIL
    const invalidRoleClaims: any = {
      role: 'SUPER_HACKER',
      tenantId: 'ten_001',
      status: 'ACTIVE',
      eiamVer: 3
    };
    const resC11Val = ClaimsV3Validator.validate(invalidRoleClaims);
    assert(
      !resC11Val.isValid && resC11Val.errors.some(e => e.includes('role')),
      'TC-C11: Rol no reconocido rechazado por ClaimsV3Validator'
    );

    // ─── TC-C12 a TC-C15: ROLE & SCOPE POLICIES ──────────────────────────────
    console.log('\n--- TEST TC-C12 a TC-C15: SCOPE POLICIES & PLATFORM ROLE GUARD ---');
    // TC-C12: brandId = null + OWNER → VALID
    const ownerTenantScopeClaims: CanonicalCustomClaimsV3 = {
      role: 'OWNER',
      tenantId: 'ten_001',
      brandId: null, // Tenant-wide
      orgId: null,
      businessId: 'biz_001',
      branchId: null,
      status: 'ACTIVE',
      eiamVer: 3
    };
    const resC12Val = ClaimsV3Validator.validate(ownerTenantScopeClaims);
    assert(resC12Val.isValid, 'TC-C12: brandId null permitido para rol OWNER en scope de tenant');

    // TC-C13: brandId = null + Platform Admin → VALID
    const platformAdminClaims = ClaimsV3Builder.buildPlatformClaims('SUPER_ADMIN');
    const resC13Val = ClaimsV3Validator.validate(platformAdminClaims);
    assert(resC13Val.isValid && platformAdminClaims.tenantId === null, 'TC-C13: SUPER_ADMIN con tenantId=null es válido');

    // TC-C14: tenantId = null + CLIENT → VALID GLOBAL CLIENT SCOPE (NOT ADMIN)
    const clientClaims = ClaimsV3Builder.buildGlobalClientClaims();
    const resC14Val = ClaimsV3Validator.validate(clientClaims);
    assert(
      resC14Val.isValid && clientClaims.role === 'CLIENT' && !ClaimsV3Validator.isPlatformRole(clientClaims.role),
      'TC-C14: tenantId=null + CLIENT es válido como cliente global pero NO otorga permisos de admin'
    );

    // TC-C15: tenantId = null + rol comercial (OWNER) → FAIL (Platform Role Guard)
    const forgedClaims: any = {
      role: 'OWNER',
      tenantId: null, // Violación: rol comercial sin tenant
      status: 'ACTIVE',
      eiamVer: 3
    };
    const resC15Val = ClaimsV3Validator.validate(forgedClaims);
    assert(
      !resC15Val.isValid && resC15Val.errors.some(e => e.includes('requiere obligatoriamente un tenantId')),
      'TC-C15: Platform Role Guard bloquea rol comercial con tenantId=null'
    );

    // ─── TC-C16 a TC-C18: CLAIMS SIZE GUARD ──────────────────────────────────
    console.log('\n--- TEST TC-C16 a TC-C18: CLAIMS SIZE GUARD & 1000-BYTE BUDGET ---');
    // TC-C16: Claims < 800 bytes → PASS
    const standardClaims: CanonicalCustomClaimsV3 = {
      role: 'OWNER',
      tenantId: 'ten_fitoni_77a',
      brandId: 'br_fitoni_express',
      orgId: 'org_fitoni_holding',
      businessId: 'biz_fitoni_burger',
      branchId: 'br_sucursal_central',
      status: 'ACTIVE',
      eiamVer: 3
    };
    const resC16Size = ClaimsSizeGuard.evaluate(standardClaims);
    assert(
      resC16Size.isValid && resC16Size.status === 'PASS' && resC16Size.byteSize < 200,
      `TC-C16: Claims estándar (${resC16Size.byteSize} bytes) pasan con status PASS (< 800 bytes)`
    );

    // TC-C17: Claims 800–999 bytes → PASS + WARNING
    const largeClaims: any = {
      ...standardClaims,
      paddingField: 'A'.repeat(700)
    };
    const resC17Size = ClaimsSizeGuard.evaluate(largeClaims);
    assert(
      resC17Size.isValid && resC17Size.status === 'PASS_WITH_WARNING' && resC17Size.byteSize >= 800 && resC17Size.byteSize < 1000,
      `TC-C17: Claims grandes (${resC17Size.byteSize} bytes) emiten PASS_WITH_WARNING (800-999 bytes)`
    );

    // TC-C18: Claims >= 1000 bytes → FAIL (REJECT)
    const oversizedClaims: any = {
      ...standardClaims,
      oversizedPadding: 'X'.repeat(950)
    };
    const resC18Size = ClaimsSizeGuard.evaluate(oversizedClaims);
    assert(
      !resC18Size.isValid && resC18Size.status === 'FAIL_OVERSIZED' && resC18Size.byteSize >= 1000,
      `TC-C18: Claims sobredimensionados (${resC18Size.byteSize} bytes) son estrictamente RECHAZADOS (FAIL_OVERSIZED)`
    );

    // ─── TC-C19 a TC-C20: DETERMINISM & ZERO-MUTATION AUTH GATE ──────────────
    console.log('\n--- TEST TC-C19 a TC-C20: DETERMINISM & AUTH SAFETY GATE ---');
    // TC-C19: Determinismo: misma entrada produce exactamente misma salida
    const sampleContext: ActiveTenantContext = {
      tenantId: 'ten_sample_01',
      brandId: 'br_sample_01',
      organizationId: 'org_sample_01',
      businessId: 'biz_sample_01',
      branchId: 'branch_sample_01',
      role: 'CASHIER',
      membershipId: 'mem_sample_01',
      status: 'ACTIVE'
    };
    const claimsOut1 = ClaimsV3Builder.buildCanonicalClaims(sampleContext);
    const claimsOut2 = ClaimsV3Builder.buildCanonicalClaims(sampleContext);
    assert(
      JSON.stringify(claimsOut1) === JSON.stringify(claimsOut2),
      'TC-C19: Determinismo garantizado (Misma entrada -> Exactamente misma salida)'
    );

    // TC-C20: Verificación de CERO mutaciones y Auth Safety Gate activado
    const gateway = AuthSafetyGate.getGateway();
    let gateBlocked = false;
    try {
      await gateway.setCustomUserClaims('usr_test', { role: 'HACKED' });
    } catch (e: any) {
      if (e instanceof AuthMutationBlockedError) {
        gateBlocked = true;
      }
    }
    assert(
      gateBlocked && !gateway.isMutationEnabled() && ds.writeCount === 0,
      'TC-C20: Auth Safety Gate bloquea físicamente mutaciones (Zero Auth & DB Mutation)'
    );

  } catch (err: any) {
    console.error('Error fatal durante la ejecución de pruebas Claims V3:', err);
    errors.push(err.message || String(err));
    failed++;
  }

  console.log('\n============================================================');
  console.log(`📊 RESUMEN DE PRUEBAS CLAIMS V3: ${passed} PASARON | ${failed} FALLARON`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}

// Auto-ejecución si se corre directamente
if (require.main === module) {
  runClaimsV3EngineTests().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
