/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.3)
 * Suite de Pruebas Unitarias Exhaustivas para Dual-Read Membership Resolver (TC-D01 a TC-D20)
 */

import {
  DualReadMembershipResolver,
  InMemoryMembershipDataSource
} from '../domain/identity/dualReadResolver';
import { MembershipV3Entity, LegacyMembershipRecord } from '../domain/identity/models';

export async function runDualReadTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS DUAL-READ RESOLVER (FASE 2C.3)');
  console.log('============================================================\n');

  try {
    const ds = new InMemoryMembershipDataSource();
    const resolver = new DualReadMembershipResolver(ds);

    const validV3: MembershipV3Entity = {
      membershipId: 'mem_v3_001',
      uid: 'usr_alpha',
      tenantId: 'tenant_alpha_001',
      brandId: 'brand_alpha_express',
      organizationId: 'org_alpha_holding',
      businessId: 'biz_alpha_burger',
      branchId: 'branch_central',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: '3.0'
    };

    const validLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_leg_001',
      uid: 'usr_beta',
      businessId: 'biz_beta_pizza',
      orgId: 'org_beta_group',
      branchId: 'branch_south',
      role: 'merchant_owner',
      status: 'ACTIVE',
      permissions: ['VIEW_ORDERS']
    };

    // TC-D01: Solo V3 existe → RESOLVED_V3
    ds.seedV3(validV3);
    const resD01 = await resolver.resolveByMembershipId('usr_alpha', 'mem_v3_001');
    assert(
      resD01.status === 'RESOLVED_V3' && resD01.source === 'V3' && resD01.membership?.tenantId === 'tenant_alpha_001',
      'TC-D01: Solo V3 existe -> RESOLVED_V3'
    );

    // TC-D02: Solo Legacy existe → RESOLVED_LEGACY
    ds.seedLegacy(validLegacy);
    ds.seedBusinessTenantMapping('biz_beta_pizza', {
      tenantId: 'tenant_beta_002',
      brandId: 'brand_beta_crust',
      organizationId: 'org_beta_group'
    });
    const resD02 = await resolver.resolveByMembershipId('usr_beta', 'mem_leg_001');
    assert(
      resD02.status === 'RESOLVED_LEGACY' && resD02.source === 'LEGACY' && resD02.membership?.tenantId === 'tenant_beta_002',
      'TC-D02: Solo Legacy existe -> RESOLVED_LEGACY'
    );

    // TC-D03: Ninguna existe → NOT_FOUND
    const resD03 = await resolver.resolveByMembershipId('usr_ghost', 'mem_non_existent');
    assert(
      resD03.status === 'NOT_FOUND' && resD03.membership === null,
      'TC-D03: Ninguna existe -> NOT_FOUND'
    );

    // TC-D04: V3 existe pero está inválida → INVALID
    const invalidV3: any = {
      membershipId: 'mem_invalid_v3',
      uid: 'usr_gamma',
      tenantId: '', // Inválido
      role: 'OWNER',
      schemaVersion: '3.0'
    };
    ds.seedV3(invalidV3);
    const resD04 = await resolver.resolveByMembershipId('usr_gamma', 'mem_invalid_v3');
    assert(
      resD04.status === 'INVALID' && resD04.membership === null,
      'TC-D04: V3 existe pero está inválida -> INVALID'
    );

    // TC-D05: Legacy existe pero tenant no resoluble → MIGRATION_PENDING
    const unresolvableLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_unresolvable_01',
      uid: 'usr_delta',
      businessId: 'biz_unmapped_orphan',
      role: 'cashier',
      status: 'ACTIVE'
    };
    ds.seedLegacy(unresolvableLegacy);
    const resD05 = await resolver.resolveByMembershipId('usr_delta', 'mem_unresolvable_01');
    assert(
      resD05.status === 'MIGRATION_PENDING' && resD05.membership === null,
      'TC-D05: Legacy existe pero tenant no resoluble -> MIGRATION_PENDING (Fail-Closed)'
    );

    // TC-D06: Legacy ambiguo → AMBIGUOUS
    const ambiguousLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_ambiguous_01',
      uid: 'usr_epsilon',
      businessId: 'biz_disputed_001',
      role: 'owner',
      status: 'ACTIVE'
    };
    ds.seedLegacy(ambiguousLegacy);
    ds.seedBusinessTenantMapping('biz_disputed_001', {
      tenantId: 'tenant_disputed_01',
      isAmbiguous: true
    });
    const resD06 = await resolver.resolveByMembershipId('usr_epsilon', 'mem_ambiguous_01');
    assert(
      resD06.status === 'AMBIGUOUS' && resD06.membership === null,
      'TC-D06: Legacy con disputa/ambigüedad -> AMBIGUOUS'
    );

    // TC-D07: tenant_bluesystem_default → NEVER_RESOLVE
    const fakeDefaultLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_fake_default',
      uid: 'usr_zeta',
      businessId: 'biz_fake_001',
      role: 'manager',
      status: 'ACTIVE'
    };
    ds.seedLegacy(fakeDefaultLegacy);
    ds.seedBusinessTenantMapping('biz_fake_001', {
      tenantId: 'tenant_bluesystem_default'
    });
    const resD07 = await resolver.resolveByMembershipId('usr_zeta', 'mem_fake_default');
    assert(
      resD07.status === 'NEVER_RESOLVE' && resD07.membership === null,
      'TC-D07: Intento de resolución a tenant_bluesystem_default -> NEVER_RESOLVE'
    );

    // TC-D08: Membership pertenece a otro UID → SECURITY_MISMATCH
    const resD08 = await resolver.resolveByMembershipId('usr_attacker', 'mem_v3_001');
    assert(
      resD08.status === 'SECURITY_MISMATCH' && resD08.membership === null,
      'TC-D08: Membership de otro UID -> SECURITY_MISMATCH (Anti-Spoofing)'
    );

    // TC-D09: V3 ACTIVE → V3 preferida
    const resD09 = await resolver.resolveActiveMembership('usr_alpha');
    assert(
      resD09.status === 'RESOLVED_V3' && resD09.membership?.membershipId === 'mem_v3_001',
      'TC-D09: V3 ACTIVE -> V3 preferida sobre cualquier otra'
    );

    // TC-D10: V3 SUSPENDED + Legacy ACTIVE → NO resolución silenciosa / preserva estado V3
    const suspendedV3: MembershipV3Entity = {
      ...validV3,
      membershipId: 'mem_suspended_001',
      uid: 'usr_suspended_user',
      status: 'SUSPENDED'
    };
    ds.seedV3(suspendedV3);
    const resD10 = await resolver.resolveByMembershipId('usr_suspended_user', 'mem_suspended_001');
    assert(
      resD10.status === 'RESOLVED_V3' && resD10.membership?.status === 'SUSPENDED',
      'TC-D10: V3 SUSPENDED preserva su estado y no se convierte silenciosamente a ACTIVE'
    );

    // TC-D11: V3 y Legacy coinciden → RESOLVED_V3
    const matchingLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_v3_001',
      uid: 'usr_alpha',
      businessId: 'biz_alpha_burger',
      branchId: 'branch_central',
      role: 'owner',
      status: 'ACTIVE'
    };
    ds.seedLegacy(matchingLegacy);
    const resD11 = await resolver.resolveByMembershipId('usr_alpha', 'mem_v3_001');
    assert(
      resD11.status === 'RESOLVED_V3' && !resD11.conflict,
      'TC-D11: V3 y Legacy coincidentes -> RESOLVED_V3 sin conflicto'
    );

    // TC-D12: V3 y Legacy tienen conflicto → AMBIGUOUS
    const conflictingLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_v3_001',
      uid: 'usr_alpha',
      businessId: 'biz_alpha_burger',
      branchId: 'branch_central',
      role: 'cook', // Discrepancia: V3 es OWNER, Legacy dice COOK
      status: 'ACTIVE'
    };
    ds.seedLegacy(conflictingLegacy);
    const resD12 = await resolver.resolveByMembershipId('usr_alpha', 'mem_v3_001');
    assert(
      resD12.status === 'AMBIGUOUS' && resD12.conflict !== undefined && resD12.conflict.discrepantFields.some(f => f.includes('role')),
      'TC-D12: V3 y Legacy con discrepancia en roles -> AMBIGUOUS con detalle'
    );

    // TC-D13: brandId ausente → null, sin inventar brand
    const noBrandLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_no_brand',
      uid: 'usr_no_brand',
      businessId: 'biz_no_brand_01',
      role: 'owner',
      status: 'ACTIVE'
    };
    ds.seedLegacy(noBrandLegacy);
    ds.seedBusinessTenantMapping('biz_no_brand_01', {
      tenantId: 'tenant_nobrand_100',
      brandId: null // Sin marca
    });
    const resD13 = await resolver.resolveByMembershipId('usr_no_brand', 'mem_no_brand');
    assert(
      resD13.status === 'RESOLVED_LEGACY' && resD13.membership?.brandId === null,
      'TC-D13: brandId ausente se preserva como null sin inventar marca ficticia'
    );

    // TC-D14: businessId legacy válido → adaptación correcta
    assert(
      resD02.membership?.businessId === 'biz_beta_pizza',
      'TC-D14: businessId legacy válido adaptado correctamente'
    );

    // TC-D15: branchId legacy válido → adaptación correcta
    assert(
      resD02.membership?.branchId === 'branch_south',
      'TC-D15: branchId legacy válido adaptado correctamente'
    );

    // TC-D16: organizationId legacy válido → adaptación correcta
    assert(
      resD02.membership?.organizationId === 'org_beta_group',
      'TC-D16: organizationId legacy válido adaptado correctamente'
    );

    // TC-D17: status REVOKED no se convierte en ACTIVE
    const revokedLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_revoked_leg',
      uid: 'usr_revoked',
      businessId: 'biz_beta_pizza',
      role: 'cashier',
      status: 'REVOKED'
    };
    ds.seedLegacy(revokedLegacy);
    const resD17 = await resolver.resolveByMembershipId('usr_revoked', 'mem_revoked_leg');
    assert(
      resD17.membership?.status === 'REVOKED',
      'TC-D17: status REVOKED se preserva fielmente'
    );

    // TC-D18: status EXPIRED no se convierte en ACTIVE
    const expiredLegacy: LegacyMembershipRecord = {
      membershipId: 'mem_expired_leg',
      uid: 'usr_expired',
      businessId: 'biz_beta_pizza',
      role: 'driver',
      status: 'EXPIRED'
    };
    ds.seedLegacy(expiredLegacy);
    const resD18 = await resolver.resolveByMembershipId('usr_expired', 'mem_expired_leg');
    assert(
      resD18.membership?.status === 'EXPIRED',
      'TC-D18: status EXPIRED se preserva fielmente'
    );

    // TC-D19: UID spoofing en resolveByUidAndTenant → rechazado
    const resD19 = await resolver.resolveByUidAndTenant('usr_attacker', 'tenant_alpha_001');
    assert(
      resD19.status === 'NOT_FOUND' && resD19.membership === null,
      'TC-D19: Intento de resolución cruzada por UID y Tenant ajeno rechazado'
    );

    // TC-D20: resolver no ejecuta ninguna escritura (writeCount === 0)
    assert(
      ds.writeCount === 0,
      'TC-D20: Verificación de CERO escrituras (writeCount === 0) en toda la ejecución'
    );

  } catch (err: any) {
    console.error('Error fatal durante la ejecución de pruebas Dual-Read:', err);
    errors.push(err.message || String(err));
    failed++;
  }

  console.log('\n============================================================');
  console.log(`📊 RESUMEN DE PRUEBAS DUAL-READ: ${passed} PASARON | ${failed} FALLARON`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}

// Auto-ejecución si se corre directamente
if (require.main === module) {
  runDualReadTests().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
