/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.11 CERTIFICATION
 * CERT-P01: Controlled Firestore Provisioning Adapter & Idempotent Execution Certification
 * 
 * ══════════════════════════════════════════════════════════════════════════════════
 * TAXONOMÍA DE EJECUCIÓN:
 * - IN-MEMORY:            Ejecución pura en memoria para pruebas unitarias.
 * - EMULATOR/CONTROLLED:   Ejecución en Firestore Emulator o Sandboxed Batch Adapter.
 * - PRODUCTION-OBSERVED:  Auditoría en modo solo-lectura contra configuración productiva.
 * - PRODUCTION-EXECUTED:  MUTACIÓN PRODUCTIVA (ESTRICTAMENTE BLOQUEADA / HUMAN STOP).
 * ══════════════════════════════════════════════════════════════════════════════════
 */

import { ProvisioningRequest } from '../domain/provisioning/models';
import { ProvisioningEngine } from '../domain/provisioning/provisioningPipeline';
import { createControlledFirestoreProvisioningAdapter } from '../domain/provisioning/firestoreProvisioningAdapter';
import { ProductionInvocationDetector } from '../domain/provisioning/repositories';

export async function runCertP01ProvisioningExecutionTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CERT-P01] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CERT-P01] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('📦 RUNNING CERT-P01: CONTROLLED FIRESTORE PROVISIONING ADAPTER & IDEMPOTENCY');
  console.log('======================================================================\n');

  // Reset detector state
  ProductionInvocationDetector.reset();

  const { repos } = createControlledFirestoreProvisioningAdapter('EMULATOR_CONTROLLED');

  const baseRequest: ProvisioningRequest = {
    requestId: 'req_cert_p01_001',
    idempotencyKey: 'idemp_key_cert_p01_alpha',
    tenantType: 'WHITE_LABEL_COMMERCE',
    tenant: {
      tenantId: 'tenant_cert_p01',
      name: 'Comercio Certificado P01',
      legalName: 'Comercio Certificado S.A. de C.V.',
      slug: 'comercio-cert-p01',
      type: 'WHITE_LABEL_COMMERCE'
    },
    brand: {
      brandId: 'brand_cert_p01',
      displayName: 'CertBrand Alpha',
      shortName: 'CertBrand',
      slug: 'cert-brand-alpha',
      visual: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1D4ED8'
      }
    },
    business: {
      businessId: 'biz_cert_p01',
      name: 'Matriz P01',
      brandId: 'brand_cert_p01',
      category: 'RESTAURANT',
      deliveryRadiusKm: 12
    },
    branch: {
      branchId: 'branch_cert_p01',
      businessId: 'biz_cert_p01',
      name: 'Sucursal Centro',
      address: 'Av. Reforma 123, Piso 4',
      city: 'Ciudad de México',
      isMainBranch: true
    },
    subscription: {
      subscriptionId: 'sub_cert_p01',
      planTier: 'PROFESSIONAL',
      billingCycle: 'MONTHLY'
    },
    initialOwner: {
      uid: 'usr_cert_owner_001',
      email: 'owner@certbrand.com',
      displayName: 'Owner Cert',
      role: 'OWNER'
    },
    initialConfiguration: {
      currency: 'MXN',
      locale: 'es_MX',
      timezone: 'America/Mexico_City',
      deliverySettings: {
        defaultRadiusKm: 10,
        baseFare: 35,
        perKmFare: 15,
        autoDispatchEnabled: true
      },
      orderSettings: {
        preparationTimeMinutes: 20,
        allowScheduledOrders: true,
        autoAcceptOrders: true
      },
      notificationPreferences: {
        orderStatusUpdates: true,
        promotionalPush: true,
        soundAlertsEnabled: true
      },
      operationalDefaults: {
        cashDrawerClosingRequired: true
      }
    },
    requestedAt: 1700000000000,
    requestedBy: 'operator_cert_01'
  };

  // Test 1: Ejecución Inicial Exitosa (SUCCESS / COMPLETED)
  const result1 = await ProvisioningEngine.provisionTenant(baseRequest, repos);
  assert(
    result1.status === 'COMPLETED' && result1.aggregate !== undefined,
    'Primer aprovisionamiento se completa con éxito (COMPLETED) a través de Firestore Adapter'
  );
  assert(
    await repos.tenantRepo.count() === 1,
    'El Tenant fue persistido correctamente en el adaptador'
  );
  assert(
    await repos.brandRepo.count() === 1,
    'La Marca fue persistida correctamente en el adaptador'
  );
  assert(
    await repos.membershipRepo.count() === 1,
    'La Membresía V3 del Owner fue persistida en el adaptador'
  );

  // Test 2: Replay Determinista de Idempotencia (REPLAYED)
  const result2 = await ProvisioningEngine.provisionTenant(baseRequest, repos);
  assert(
    result2.status === 'REPLAYED',
    'Reintento con misma idempotencyKey y mismo payload retorna status REPLAYED'
  );
  assert(
    await repos.tenantRepo.count() === 1,
    'Idempotencia: No se duplican documentos de Tenant tras el replay'
  );

  // Test 3: Conflicto de Idempotencia (CONFLICT)
  const conflictingRequest: ProvisioningRequest = {
    ...baseRequest,
    tenantType: 'MARKETPLACE' // Carga distinta con misma idempotencyKey
  };
  const resultConflict = await ProvisioningEngine.provisionTenant(conflictingRequest, repos);
  assert(
    resultConflict.status === 'CONFLICT',
    'Solicitud con misma idempotencyKey pero diferente payloadHash genera CONFLICT'
  );

  // Test 4: Inyección de Falla y Compensación Atómica Inversa (COMPENSATED)
  const failureRequest: ProvisioningRequest = {
    ...baseRequest,
    requestId: 'req_cert_p01_fail_002',
    idempotencyKey: 'idemp_key_fail_test_002',
    tenant: {
      ...baseRequest.tenant,
      tenantId: 'tenant_fail_002',
      slug: 'tenant-fail-002'
    },
    brand: {
      ...baseRequest.brand,
      brandId: 'brand_fail_002'
    },
    business: {
      ...baseRequest.business,
      businessId: 'biz_fail_002',
      brandId: 'brand_fail_002'
    },
    branch: {
      ...baseRequest.branch,
      branchId: 'branch_fail_002',
      businessId: 'biz_fail_002'
    },
    subscription: {
      ...baseRequest.subscription,
      subscriptionId: 'sub_fail_002'
    }
  };

  const resultCompensated = await ProvisioningEngine.provisionTenant(
    failureRequest,
    repos,
    'BRANCH' // Inyectar fallo en paso de Branch
  );

  assert(
    resultCompensated.status === 'COMPENSATED',
    'Fallo inyectado en BRANCH ejecuta compensación inversa y retorna COMPENSATED'
  );
  assert(
    await repos.tenantRepo.findById('tenant_fail_002') === null,
    'Compensación: El Tenant intermedio fue eliminado del repositorio tras el rollback'
  );
  assert(
    await repos.brandRepo.findById('brand_fail_002') === null,
    'Compensación: La Brand intermedia fue eliminada del repositorio tras el rollback'
  );

  // Test 5: Taxonomía de Entornos y Bloqueo de Mutación en Producción
  assert(
    ProductionInvocationDetector.hasProductionBeenAttempted() === false,
    'Zero-Production Safety: No se invocaron mutaciones en repositorios de producción real'
  );

  return { passed, failed, errors };
}
