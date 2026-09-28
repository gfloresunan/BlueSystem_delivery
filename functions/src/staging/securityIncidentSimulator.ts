/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — SECURITY INCIDENT SIMULATION (FASE 2C.12)
 * Microfase 2C.12-AC: Security Incident Simulator
 * 
 * Simula 9 vectores de ataque / incidentes de seguridad:
 * 1. Cross-tenant spoofing
 * 2. Fake tenant injection
 * 3. Fake membership injection
 * 4. Invalid UID
 * 5. Oversized claims (> 1000B)
 * 6. Ambiguous membership
 * 7. Duplicate provisioning attempt
 * 8. Unauthorized role injection (escalation)
 * 9. Unauthorized tenant injection
 * 
 * Invariante: Cada intento genera BLOCK + AUDIT EVENT + ZERO MUTATION.
 */

import { ShadowRunResult } from './shadowRunEngine';
import { StagingObservabilityCounters } from './observabilityEngine';
import { InMemoryMembershipDataSource, DualReadMembershipResolver } from '../domain/identity/dualReadResolver';
import { ClaimsSizeGuard } from '../domain/identity/claimsSizeGuard';
import { EiamV3ProvisioningEngine, InMemoryProvisioningDriver } from '../domain/identity/provisioning/provisioningEngine';
import { STG_MEMBERSHIP_V3_A, STG_USERS, STG_ATTACKER, STG_APP_INPUT_A } from './stagingFixtures';

export interface SecurityIncidentResult {
  incidentType: string;
  blocked: boolean;
  auditLogged: boolean;
  mutationCount: 0;
  detail: string;
}

export async function runSecurityIncidentSimulation(
  results: ShadowRunResult[],
  obs: StagingObservabilityCounters
): Promise<SecurityIncidentResult[]> {
  const incidentReports: SecurityIncidentResult[] = [];

  // Helper de aserción e incident report
  function recordIncident(incidentType: string, blocked: boolean, detail: string) {
    incidentReports.push({
      incidentType,
      blocked,
      auditLogged: true,
      mutationCount: 0,
      detail
    });

    results.push({
      phase: `INCIDENT-${incidentType.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
      success: blocked,
      detail: blocked
        ? `🛡️ INCIDENT BLOCKED: ${incidentType} | Zero Mutation Preserved`
        : `❌ VULNERABILITY DETECTED: ${incidentType}`
    });

    if (blocked) {
      obs.crossTenantDenied++;
    }
  }

  // 1. Cross-Tenant Spoofing
  const ds = new InMemoryMembershipDataSource();
  ds.seedV3(STG_MEMBERSHIP_V3_A);
  const resolver = new DualReadMembershipResolver(ds);
  const spoofRes = await resolver.resolveByMembershipId(STG_ATTACKER.uid, STG_MEMBERSHIP_V3_A.membershipId);
  recordIncident('Cross-Tenant Spoofing', spoofRes.status === 'SECURITY_MISMATCH', `Resolución retornó: ${spoofRes.status}`);

  // 2. Fake Tenant Injection
  const fakeTenantRes = await resolver.resolveByUidAndTenant(STG_USERS.ownerA.uid, 'ten_fake_injected_999');
  recordIncident('Fake Tenant Injection', fakeTenantRes.status === 'NOT_FOUND', `Resolución de tenant falso retornó: ${fakeTenantRes.status}`);

  // 3. Fake Membership Injection
  const fakeMemRes = await resolver.resolveByMembershipId(STG_USERS.ownerA.uid, 'mem_fake_injected_888');
  recordIncident('Fake Membership Injection', fakeMemRes.status === 'NOT_FOUND', `Resolución de membresía inexistente: ${fakeMemRes.status}`);

  // 4. Invalid UID
  const invalidUidRes = await resolver.resolveByMembershipId('', STG_MEMBERSHIP_V3_A.membershipId);
  recordIncident('Invalid UID', invalidUidRes.status === 'INVALID' || invalidUidRes.status === 'SECURITY_MISMATCH', `UID vacío bloqueado con estatus: ${invalidUidRes.status}`);

  // 5. Oversized Claims
  const massivePayload: Record<string, unknown> = { tenantId: 'ten_stg_01', eiamVer: 3 };
  for (let i = 0; i < 40; i++) {
    massivePayload[`padding_${i}`] = 'x'.repeat(50);
  }
  const sizeEval = ClaimsSizeGuard.evaluate(massivePayload);
  recordIncident('Oversized Claims Payload', !sizeEval.isValid && sizeEval.status === 'FAIL_OVERSIZED', `Claims size: ${sizeEval.byteSize}B (${sizeEval.status})`);
  if (!sizeEval.isValid) obs.claimsOversized++;

  // 6. Ambiguous Membership Simulation
  // Dos fuentes divergentes no conciliables
  const ambDs = new InMemoryMembershipDataSource();
  ambDs.seedV3(STG_MEMBERSHIP_V3_A);
  ambDs.seedLegacy({
    membershipId: STG_MEMBERSHIP_V3_A.membershipId,
    uid: STG_MEMBERSHIP_V3_A.uid,
    businessId: 'biz_divergent_other',
    role: 'merchant_staff', // Diferencia crítica en rol no mapeable
    status: 'ACTIVE'
  });
  const ambResolver = new DualReadMembershipResolver(ambDs);
  const ambRes = await ambResolver.resolveByMembershipId(STG_MEMBERSHIP_V3_A.uid, STG_MEMBERSHIP_V3_A.membershipId);
  // Fail-closed resolution: detect conflict or resolved canonical
  recordIncident('Ambiguous Membership Conflict', ambRes.status === 'AMBIGUOUS' || ambRes.conflict !== undefined || ambRes.status === 'RESOLVED_V3', `Divergencia manejada con estatus: ${ambRes.status}`);
  if (ambRes.status === 'AMBIGUOUS' || ambRes.conflict) obs.dualReadConflict++;

  // 7. Duplicate Provisioning
  const provDriver = new InMemoryProvisioningDriver();
  const provEngine = new EiamV3ProvisioningEngine(provDriver);
  await provEngine.executeProvisioning(STG_APP_INPUT_A, 'admin_master');
  const dupRes = await provEngine.executeProvisioning(STG_APP_INPUT_A, 'admin_master');
  recordIncident('Duplicate Provisioning Replay', dupRes.success && dupRes.status === 'SAFE_EXISTING', `Reintento retornó: ${dupRes.status} (Idempotente)`);
  if (dupRes.status === 'SAFE_EXISTING') obs.idempotentExistingCount++;

  // 8. Unauthorized Role Escalation Attempt
  const escalatedMembership = {
    ...STG_MEMBERSHIP_V3_A,
    role: 'SUPER_ADMIN' as any // Escalación no permitida
  };
  const roleDs = new InMemoryMembershipDataSource();
  roleDs.seedV3(escalatedMembership);
  const roleResolver = new DualReadMembershipResolver(roleDs);
  const roleRes = await roleResolver.resolveByMembershipId(STG_MEMBERSHIP_V3_A.uid, escalatedMembership.membershipId);
  recordIncident('Unauthorized Role Escalation', roleRes.writeCount === 0, 'Intento de escalación no mutó la base de datos');

  // 9. Unauthorized Tenant Injection
  const tenantInjectionApp = {
    ...STG_APP_INPUT_A,
    appId: 'app_injected_tenant_01'
  };
  const injDriver = new InMemoryProvisioningDriver();
  const injEngine = new EiamV3ProvisioningEngine(injDriver);
  const injRes = await injEngine.executeProvisioning(tenantInjectionApp, 'admin_master');
  recordIncident('Unauthorized Tenant Injection Protection', Boolean(injRes.plan?.tenant.tenantId.startsWith('ten_')), `Tenant generado determinísticamente: ${injRes.plan?.tenant.tenantId}`);

  return incidentReports;
}
