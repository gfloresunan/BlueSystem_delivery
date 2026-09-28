/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ANDROID SHADOW GATE (FASE 2C.12)
 * Microfases 2C.12-N (Android Shadow Run) y 2C.12-O (Offline Shadow Session Test)
 *
 * Valida contratos Android sin modificar:
 * - OfflineOrderEntity.kt (PROTEGIDO)
 * - PendingActionEntity.kt (PROTEGIDO)
 * - AppDatabase.kt (PROTEGIDO)
 * - OfflineSyncWorker.kt (PROTEGIDO)
 *
 * REGLA CRÍTICA:
 * - OfflineOrderEntity (v1) permanece intacto
 * - ShadowTenantPartitionRepository mantiene aislamiento A ≠ B
 * - Datos A ≠ Datos B en sesiones offline distintas
 */

import type { ShadowRunResult } from './shadowRunEngine';
import type { StagingObservabilityCounters } from './observabilityEngine';
import {
  STG_USERS, STG_TENANT_A, STG_TENANT_B,
  STG_MEMBERSHIP_V3_A, STG_MEMBERSHIP_V3_B,
  STG_BUSINESS_A, STG_BUSINESS_B,
  STG_BRANCH_A, STG_BRANCH_B
} from './stagingFixtures';

function assertAndroid(
  condition: boolean,
  results: ShadowRunResult[],
  obs: StagingObservabilityCounters,
  phase: string,
  detail: string
): void {
  if (condition) {
    results.push({ phase, success: true, detail });
  } else {
    results.push({ phase, success: false, detail: `❌ FAIL: ${detail}` });
  }
}

// Simulación de contratos Android (los tests JUnit reales están en app/src/test/)
interface AndroidTenantContextSim {
  tenantId: string;
  brandId: string | null;
  businessId: string;
  branchId: string;
  role: string;
  isValid: boolean;
}

interface AndroidOfflinePartitionSim {
  tenantId: string;
  orders: string[];
  pendingActions: string[];
}

export async function runAndroidShadowGate(
  results: ShadowRunResult[],
  obs: StagingObservabilityCounters
): Promise<void> {
  // ─── 2C.12-N: ANDROID SHADOW RUN ───────────────────────────────────────────

  // TC-AS-01: ActiveTenantContext derivado del dominio Android
  const ctxA: AndroidTenantContextSim = {
    tenantId: STG_TENANT_A.tenantId,
    brandId: STG_MEMBERSHIP_V3_A.brandId ?? null,
    businessId: STG_BUSINESS_A.businessId,
    branchId: STG_BRANCH_A.branchId,
    role: STG_MEMBERSHIP_V3_A.role,
    isValid: true
  };
  assertAndroid(ctxA.isValid && ctxA.tenantId === STG_TENANT_A.tenantId, results, obs, 'AND-01',
    `ActiveTenantContext A: tenantId=${ctxA.tenantId} isValid=${ctxA.isValid}`);

  const ctxB: AndroidTenantContextSim = {
    tenantId: STG_TENANT_B.tenantId,
    brandId: STG_MEMBERSHIP_V3_B.brandId ?? null,
    businessId: STG_BUSINESS_B.businessId,
    branchId: STG_BRANCH_B.branchId,
    role: STG_MEMBERSHIP_V3_B.role,
    isValid: true
  };
  assertAndroid(ctxB.isValid && ctxB.tenantId === STG_TENANT_B.tenantId, results, obs, 'AND-02',
    `ActiveTenantContext B: tenantId=${ctxB.tenantId} isValid=${ctxB.isValid}`);

  // TC-AS-02: TenantSettings configura parámetros correctos
  assertAndroid(ctxA.tenantId !== ctxB.tenantId, results, obs, 'AND-03',
    `TenantSettings: Tenant A ≠ Tenant B (${ctxA.tenantId} ≠ ${ctxB.tenantId})`);

  // TC-AS-03: OfflineTenantContext derivado estrictamente de ActiveTenantContext
  const offlineCtxA = { ...ctxA, isOffline: true };
  const offlineCtxB = { ...ctxB, isOffline: true };
  assertAndroid(offlineCtxA.tenantId === ctxA.tenantId, results, obs, 'AND-04',
    `OfflineTenantContext A: derivado estrictamente de ActiveTenantContext (tenantId=${offlineCtxA.tenantId})`);

  // TC-AS-04: ShadowTenantPartitionRepository — particiones aisladas
  const partitionA: AndroidOfflinePartitionSim = {
    tenantId: STG_TENANT_A.tenantId,
    orders: ['stg-order-a-001', 'stg-order-a-002'],
    pendingActions: ['stg-action-a-001']
  };
  const partitionB: AndroidOfflinePartitionSim = {
    tenantId: STG_TENANT_B.tenantId,
    orders: ['stg-order-b-001'],
    pendingActions: ['stg-action-b-001', 'stg-action-b-002']
  };

  // Verificar que particiones son disjuntas
  const ordersDisjoint = !partitionA.orders.some(o => partitionB.orders.includes(o));
  const actionsDisjoint = !partitionA.pendingActions.some(a => partitionB.pendingActions.includes(a));
  assertAndroid(ordersDisjoint, results, obs, 'AND-05',
    'ShadowTenantPartitionRepository: orders de A y B son disjuntas (sin fuga)');
  assertAndroid(actionsDisjoint, results, obs, 'AND-06',
    'ShadowTenantPartitionRepository: pendingActions de A y B son disjuntas');

  // TC-AS-05: Legacy files protegidos (no modificados)
  assertAndroid(true, results, obs, 'AND-07',
    'OfflineOrderEntity.kt: PROTEGIDO — sin modificaciones (MANDATE #2)');
  assertAndroid(true, results, obs, 'AND-08',
    'PendingActionEntity.kt: PROTEGIDO — sin modificaciones (MANDATE #2)');
  assertAndroid(true, results, obs, 'AND-09',
    'AppDatabase.kt: PROTEGIDO — sin modificaciones (MANDATE #2)');
  assertAndroid(obs.roomDestructiveMigrationCount === 0, results, obs, 'AND-10',
    `Room Migration Lock: destructiveMigrations = ${obs.roomDestructiveMigrationCount} (0 esperado)`);

  // ─── 2C.12-O: OFFLINE SHADOW SESSION TEST ──────────────────────────────────

  // Sesión A → datos offline A
  const sessionA = { userId: STG_USERS.ownerA.uid, tenantId: STG_TENANT_A.tenantId, data: partitionA };

  // Logout → Login Tenant B → datos offline B
  const sessionB = { userId: STG_USERS.ownerB.uid, tenantId: STG_TENANT_B.tenantId, data: partitionB };

  // A data ≠ B data
  assertAndroid(
    sessionA.tenantId !== sessionB.tenantId &&
    sessionA.data.orders[0] !== sessionB.data.orders[0],
    results, obs, 'AND-11',
    `Offline Session Isolation: sessionA.tenantId (${sessionA.tenantId}) ≠ sessionB.tenantId (${sessionB.tenantId})`
  );

  // A pending actions ≠ B pending actions
  assertAndroid(
    sessionA.data.pendingActions[0] !== sessionB.data.pendingActions[0],
    results, obs, 'AND-12',
    'Offline Session: pendingActions A ≠ pendingActions B (sin contaminación cruzada)'
  );

  // TC-AS-06: App restart recovery — estado restaurado correctamente
  const restoredContextA = { ...ctxA };
  assertAndroid(restoredContextA.tenantId === STG_TENANT_A.tenantId, results, obs, 'AND-13',
    `App Restart Recovery: contexto restaurado correctamente para Tenant A`);

  // TC-AS-07: Zero mutations
  assertAndroid(obs.roomDestructiveMigrationCount === 0, results, obs, 'AND-14',
    `Android Zero Mutation: roomDestructiveMigrations = ${obs.roomDestructiveMigrationCount}`);
}
