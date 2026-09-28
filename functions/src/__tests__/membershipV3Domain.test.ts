/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Suite de Pruebas Unitarias para Modelos, Validadores, Repositorio y Adaptador de Membresías
 */

import { MembershipV3Entity, CanonicalCustomClaimsV3, ActiveTenantContext, LegacyMembershipRecord } from '../domain/identity/models';
import {
  validateMembershipV3,
  validateMembershipImmutability,
  validateCustomClaimsV3,
  validateActiveTenantContext
} from '../domain/identity/validators';
import { MembershipRepositoryInMemory } from '../domain/identity/repository';
import { LegacyMembershipAdapter } from '../domain/identity/adapter';

export async function runMembershipV3Tests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS MEMBERSHIP V3 (FASE 2C.2)');
  console.log('============================================================\n');

  try {
    const baseValidMembership: MembershipV3Entity = {
      membershipId: 'mem_test_001',
      uid: 'usr_test_001',
      tenantId: 'tenant_alpha_001',
      brandId: 'brand_alpha_express',
      organizationId: 'org_alpha_group',
      businessId: 'biz_alpha_burger',
      branchId: 'branch_central',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'VIEW_FINANCE'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: '3.0'
    };

    // TC-M01: Membership válida
    console.log('--- TEST TC-M01 a TC-M12: VALIDACIONES ESTRUCTURALES ---');
    const resM01 = validateMembershipV3(baseValidMembership);
    assert(resM01.isValid && resM01.errors.length === 0, 'TC-M01: Membership válida pasa validación');

    // TC-M02: membershipId ausente
    const resM02 = validateMembershipV3({ ...baseValidMembership, membershipId: undefined as any });
    assert(!resM02.isValid && resM02.errors.some(e => e.includes('membershipId')), 'TC-M02: membershipId ausente rechazado');

    // TC-M03: uid ausente
    const resM03 = validateMembershipV3({ ...baseValidMembership, uid: '' });
    assert(!resM03.isValid && resM03.errors.some(e => e.includes('uid')), 'TC-M03: uid ausente rechazado');

    // TC-M04: tenantId ausente
    const resM04 = validateMembershipV3({ ...baseValidMembership, tenantId: undefined as any });
    assert(!resM04.isValid && resM04.errors.some(e => e.includes('tenantId')), 'TC-M04: tenantId ausente rechazado');

    // TC-M05: role inválido
    const resM05 = validateMembershipV3({ ...baseValidMembership, role: 'INVALID_ROLE' as any });
    assert(!resM05.isValid && resM05.errors.some(e => e.includes('role')), 'TC-M05: role inválido rechazado');

    // TC-M06: status inválido
    const resM06 = validateMembershipV3({ ...baseValidMembership, status: 'INVALID_STATUS' as any });
    assert(!resM06.isValid && resM06.errors.some(e => e.includes('status')), 'TC-M06: status inválido rechazado');

    // TC-M07: schemaVersion incorrecta
    const resM07 = validateMembershipV3({ ...baseValidMembership, schemaVersion: '2.0' as any });
    assert(!resM07.isValid && resM07.errors.some(e => e.includes('schemaVersion')), 'TC-M07: schemaVersion incorrecta rechazada');

    // TC-M08: permissions no array
    const resM08 = validateMembershipV3({ ...baseValidMembership, permissions: 'ALL' as any });
    assert(!resM08.isValid && resM08.errors.some(e => e.includes('permissions')), 'TC-M08: permissions no array rechazado');

    // TC-M09: branchId null permitido
    const resM09 = validateMembershipV3({ ...baseValidMembership, branchId: null });
    assert(resM09.isValid, 'TC-M09: branchId null permitido (todas las sucursales)');

    // TC-M10: brandId null permitido
    const resM10 = validateMembershipV3({ ...baseValidMembership, brandId: null });
    assert(resM10.isValid, 'TC-M10: brandId null permitido (todas las marcas del tenant)');

    // TC-M11: tenantId vacío rechazado
    const resM11 = validateMembershipV3({ ...baseValidMembership, tenantId: '   ' });
    assert(!resM11.isValid && resM11.errors.some(e => e.includes('tenantId')), 'TC-M11: tenantId con solo espacios rechazado');

    // TC-M12: membershipId vacío rechazado
    const resM12 = validateMembershipV3({ ...baseValidMembership, membershipId: '   ' });
    assert(!resM12.isValid && resM12.errors.some(e => e.includes('membershipId')), 'TC-M12: membershipId con solo espacios rechazado');

    // ─── TC-M13 a TC-M16: LEGACY ADAPTER TESTS ───────────────────────────────
    console.log('\n--- TEST TC-M13 a TC-M16: LEGACY ADAPTER ---');
    const legacySample: LegacyMembershipRecord = {
      membershipId: 'mem_legacy_001',
      uid: 'usr_leg_123',
      businessId: 'biz_leg_456',
      orgId: 'org_leg_789',
      branchId: 'branch_leg_01',
      role: 'business_owner',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS']
    };

    // TC-M13: Transformación Legacy → V3 válida
    const resM13 = LegacyMembershipAdapter.transformLegacyToV3(legacySample, {
      tenantId: 'tenant_resolved_777',
      brandId: 'brand_resolved_888',
      organizationId: 'org_leg_789'
    });
    assert(
      resM13.resolutionStatus === 'RESOLVED' &&
      resM13.entity !== null &&
      resM13.entity.role === 'OWNER' &&
      resM13.entity.tenantId === 'tenant_resolved_777',
      'TC-M13: Transformación Legacy -> V3 válida'
    );

    // TC-M14: Legacy sin tenant resoluble → MIGRATION_PENDING
    const resM14 = LegacyMembershipAdapter.transformLegacyToV3(legacySample, undefined);
    assert(
      resM14.resolutionStatus === 'MIGRATION_PENDING' && resM14.entity === null,
      'TC-M14: Legacy sin tenant resoluble resulta en MIGRATION_PENDING (Fail-Closed)'
    );

    // TC-M15: Legacy ambiguo → AMBIGUOUS
    const resM15 = LegacyMembershipAdapter.transformLegacyToV3(legacySample, {
      tenantId: 'tenant_ambiguous_001',
      isAmbiguous: true
    });
    assert(
      resM15.resolutionStatus === 'AMBIGUOUS' && resM15.entity === null,
      'TC-M15: Legacy con conflicto de titularidad resulta en AMBIGUOUS'
    );

    // TC-M16: Nunca generar tenant default
    const resM16 = LegacyMembershipAdapter.transformLegacyToV3(legacySample, {
      tenantId: 'tenant_bluesystem_default'
    });
    assert(
      resM16.resolutionStatus === 'MIGRATION_PENDING' && resM16.entity === null,
      'TC-M16: Intento de resolución a tenant_bluesystem_default es estrictamente bloqueado'
    );

    // ─── TC-M17 a TC-M18: CLAIMS & CONTEXT VALIDATION ────────────────────────
    console.log('\n--- TEST TC-M17 a TC-M18: CLAIMS V3 & ACTIVE CONTEXT ---');
    // TC-M17: Claims V3 estructuralmente válidos
    const validClaims: CanonicalCustomClaimsV3 = {
      role: 'OWNER',
      tenantId: 'tenant_alpha_001',
      brandId: 'brand_alpha_express',
      orgId: 'org_alpha_group',
      businessId: 'biz_alpha_burger',
      branchId: 'branch_central',
      status: 'ACTIVE',
      eiamVer: 3
    };
    const resM17 = validateCustomClaimsV3(validClaims);
    assert(resM17.isValid, 'TC-M17: Claims V3 estructuralmente válidos');

    // TC-M18: ActiveTenantContext válido
    const validContext: ActiveTenantContext = {
      tenantId: 'tenant_alpha_001',
      brandId: 'brand_alpha_express',
      organizationId: 'org_alpha_group',
      businessId: 'biz_alpha_burger',
      branchId: 'branch_central',
      role: 'OWNER',
      membershipId: 'mem_test_001',
      status: 'ACTIVE'
    };
    const resM18 = validateActiveTenantContext(validContext);
    assert(resM18.isValid, 'TC-M18: ActiveTenantContext válido');

    // ─── REPOSITORY INTEGRATION TESTS ─────────────────────────────────────────
    console.log('\n--- TEST SUITE: MEMBERSHIP REPOSITORY CONTRACT ---');
    const repo = new MembershipRepositoryInMemory();
    await repo.createMembership(baseValidMembership);
    assert(true, 'Crear membresía inicial en repositorio');

    // Inmutabilidad
    const immutabilityRes = validateMembershipImmutability(baseValidMembership, { tenantId: 'tenant_modified_002' });
    assert(!immutabilityRes.isValid && immutabilityRes.errors.some(e => e.includes('tenantId')), 'Rechazar mutación de tenantId inmutable');

    // Duplicado de membresía en mismo tenant
    try {
      await repo.createMembership({
        ...baseValidMembership,
        membershipId: 'mem_test_002'
      });
      assert(false, 'Debería rechazar membresía duplicada para mismo UID en mismo Tenant');
    } catch (e: any) {
      assert(e.message.includes('[CONFLICT]'), 'Rechazo de doble membresía activa en mismo Tenant');
    }

    // Consulta por UID y Tenant
    const foundMem = await repo.getMembershipByUidAndTenant('usr_test_001', 'tenant_alpha_001');
    assert(foundMem !== null && foundMem.membershipId === 'mem_test_001', 'Consulta getMembershipByUidAndTenant retorna documento correcto');

    // Actualización de estado a REVOKED
    const revokedMem = await repo.updateMembershipStatus('mem_test_001', 'REVOKED', 'admin_security', 'Infracción de contrato');
    assert(revokedMem.status === 'REVOKED' && revokedMem.revokedBy === 'admin_security', 'Actualización a REVOKED con metadatos de auditoría');

  } catch (err: any) {
    console.error('Error fatal durante la ejecución de pruebas:', err);
    errors.push(err.message || String(err));
    failed++;
  }

  console.log('\n============================================================');
  console.log(`📊 RESUMEN DE PRUEBAS: ${passed} PASARON | ${failed} FALLARON`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}

// Auto-ejecución si se corre directamente con ts-node o node
if (require.main === module) {
  runMembershipV3Tests().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
