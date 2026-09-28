/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — FIRESTORE PROVISIONING ADAPTER (FASE 2D.11)
 * Adaptador Transaccional para Aprovisionamiento de Tenants e Idempotencia
 * 
 * ══════════════════════════════════════════════════════════════════════════════════
 * TAXONOMÍA DE EJECUCIÓN OBLIGATORIA (ADR-014):
 * - IN-MEMORY:            Ejecución pura en memoria para pruebas unitarias.
 * - EMULATOR/CONTROLLED:   Ejecución en Firestore Emulator o Sandboxed Batch Adapter.
 * - PRODUCTION-OBSERVED:  Auditoría en modo solo-lectura contra configuración productiva.
 * - PRODUCTION-EXECUTED:  MUTACIÓN PRODUCTIVA (ESTRICTAMENTE BLOQUEADA / HUMAN STOP).
 * ══════════════════════════════════════════════════════════════════════════════════
 */

import {
  TenantEntity,
  BrandEntity,
  BusinessEntity,
  BranchEntity,
  SubscriptionEntity,
} from '../platform/models';
import { MembershipV3Entity } from '../identity/models';
import { ProvisioningAuditEvent, ProvisioningResult } from './models';
import {
  ITenantRepository,
  IBrandRepository,
  IBusinessRepository,
  IBranchRepository,
  ISubscriptionRepository,
  IMembershipRepository,
  IIdempotencyRepository,
  IAuditRepository,
  ProvisioningRepositories,
  ProductionInvocationDetector
} from './repositories';

export type ProvisioningEnvironmentMode =
  | 'IN_MEMORY'
  | 'EMULATOR_CONTROLLED'
  | 'PRODUCTION_OBSERVED'
  | 'PRODUCTION_EXECUTED';

export class ControlledFirestoreBatchEngine {
  private documents: Map<string, any> = new Map();
  private auditLogs: ProvisioningAuditEvent[] = [];
  private idempotencyStore: Map<string, { result: ProvisioningResult; payloadHash: string }> = new Map();

  constructor(public readonly mode: ProvisioningEnvironmentMode = 'EMULATOR_CONTROLLED') {
    if (mode === 'PRODUCTION_EXECUTED') {
      ProductionInvocationDetector.flagProductionAttempt();
    }
  }

  setDocument(collection: string, docId: string, data: any): void {
    if (this.mode === 'PRODUCTION_EXECUTED') {
      ProductionInvocationDetector.assertNoProductionAccess();
    }
    const key = `${collection}/${docId}`;
    this.documents.set(key, JSON.parse(JSON.stringify(data)));
  }

  getDocument(collection: string, docId: string): any | null {
    const key = `${collection}/${docId}`;
    const item = this.documents.get(key);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  deleteDocument(collection: string, docId: string): void {
    if (this.mode === 'PRODUCTION_EXECUTED') {
      ProductionInvocationDetector.assertNoProductionAccess();
    }
    const key = `${collection}/${docId}`;
    this.documents.delete(key);
  }

  queryCollection(collection: string, filterFn: (data: any) => boolean): any[] {
    const results: any[] = [];
    const prefix = `${collection}/`;
    for (const [key, val] of this.documents.entries()) {
      if (key.startsWith(prefix) && filterFn(val)) {
        results.push(JSON.parse(JSON.stringify(val)));
      }
    }
    return results;
  }

  recordAudit(event: ProvisioningAuditEvent): void {
    this.auditLogs.push(JSON.parse(JSON.stringify(event)));
  }

  getAudits(filterFn: (e: ProvisioningAuditEvent) => boolean): ProvisioningAuditEvent[] {
    return this.auditLogs.filter(filterFn).map(e => JSON.parse(JSON.stringify(e)));
  }

  saveIdempotency(key: string, result: ProvisioningResult, payloadHash: string): void {
    this.idempotencyStore.set(key, {
      result: JSON.parse(JSON.stringify(result)),
      payloadHash
    });
  }

  getIdempotency(key: string): { result: ProvisioningResult; payloadHash: string } | null {
    const item = this.idempotencyStore.get(key);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  deleteIdempotency(key: string): void {
    this.idempotencyStore.delete(key);
  }

  clear(): void {
    this.documents.clear();
    this.auditLogs = [];
    this.idempotencyStore.clear();
  }

  getDocumentCount(collection?: string): number {
    if (!collection) return this.documents.size;
    const prefix = `${collection}/`;
    let count = 0;
    for (const key of this.documents.keys()) {
      if (key.startsWith(prefix)) count++;
    }
    return count;
  }
}

export class FirestoreTenantRepository implements ITenantRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(tenant: TenantEntity): Promise<void> {
    this.engine.setDocument('tenants', tenant.tenantId, tenant);
  }

  async findById(tenantId: string): Promise<TenantEntity | null> {
    return this.engine.getDocument('tenants', tenantId);
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    const results = this.engine.queryCollection('tenants', t => t.slug === slug);
    return results.length > 0 ? results[0] : null;
  }

  async delete(tenantId: string): Promise<void> {
    this.engine.deleteDocument('tenants', tenantId);
  }

  async count(): Promise<number> {
    return this.engine.getDocumentCount('tenants');
  }
}

export class FirestoreBrandRepository implements IBrandRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(brand: BrandEntity): Promise<void> {
    this.engine.setDocument('brands', brand.brandId, brand);
  }

  async findById(brandId: string): Promise<BrandEntity | null> {
    return this.engine.getDocument('brands', brandId);
  }

  async findByTenantId(tenantId: string): Promise<BrandEntity[]> {
    return this.engine.queryCollection('brands', b => b.tenantId === tenantId);
  }

  async delete(brandId: string): Promise<void> {
    this.engine.deleteDocument('brands', brandId);
  }

  async count(): Promise<number> {
    return this.engine.getDocumentCount('brands');
  }
}

export class FirestoreBusinessRepository implements IBusinessRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(business: BusinessEntity): Promise<void> {
    this.engine.setDocument('businesses', business.businessId, business);
  }

  async findById(businessId: string): Promise<BusinessEntity | null> {
    return this.engine.getDocument('businesses', businessId);
  }

  async findByTenantId(tenantId: string): Promise<BusinessEntity[]> {
    return this.engine.queryCollection('businesses', b => b.tenantId === tenantId);
  }

  async delete(businessId: string): Promise<void> {
    this.engine.deleteDocument('businesses', businessId);
  }

  async count(): Promise<number> {
    return this.engine.getDocumentCount('businesses');
  }
}

export class FirestoreBranchRepository implements IBranchRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(branch: BranchEntity): Promise<void> {
    this.engine.setDocument('branches', branch.branchId, branch);
  }

  async findById(branchId: string): Promise<BranchEntity | null> {
    return this.engine.getDocument('branches', branchId);
  }

  async findByBusinessId(businessId: string): Promise<BranchEntity[]> {
    return this.engine.queryCollection('branches', b => b.businessId === businessId);
  }

  async delete(branchId: string): Promise<void> {
    this.engine.deleteDocument('branches', branchId);
  }

  async count(): Promise<number> {
    return this.engine.getDocumentCount('branches');
  }
}

export class FirestoreSubscriptionRepository implements ISubscriptionRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(subscription: SubscriptionEntity): Promise<void> {
    this.engine.setDocument('subscriptions', subscription.subscriptionId, subscription);
  }

  async findById(subscriptionId: string): Promise<SubscriptionEntity | null> {
    return this.engine.getDocument('subscriptions', subscriptionId);
  }

  async findByTenantId(tenantId: string): Promise<SubscriptionEntity | null> {
    const results = this.engine.queryCollection('subscriptions', s => s.tenantId === tenantId);
    return results.length > 0 ? results[0] : null;
  }

  async delete(subscriptionId: string): Promise<void> {
    this.engine.deleteDocument('subscriptions', subscriptionId);
  }

  async count(): Promise<number> {
    return this.engine.getDocumentCount('subscriptions');
  }
}

export class FirestoreMembershipRepository implements IMembershipRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(membership: MembershipV3Entity): Promise<void> {
    this.engine.setDocument('memberships', membership.membershipId, membership);
  }

  async findById(membershipId: string): Promise<MembershipV3Entity | null> {
    return this.engine.getDocument('memberships', membershipId);
  }

  async findByTenantId(tenantId: string): Promise<MembershipV3Entity[]> {
    return this.engine.queryCollection('memberships', m => m.tenantId === tenantId);
  }

  async delete(membershipId: string): Promise<void> {
    this.engine.deleteDocument('memberships', membershipId);
  }

  async count(): Promise<number> {
    return this.engine.getDocumentCount('memberships');
  }
}

export class FirestoreIdempotencyRepository implements IIdempotencyRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async save(idempotencyKey: string, result: ProvisioningResult, payloadHash: string): Promise<void> {
    this.engine.saveIdempotency(idempotencyKey, result, payloadHash);
  }

  async findByKey(idempotencyKey: string): Promise<{ result: ProvisioningResult; payloadHash: string } | null> {
    return this.engine.getIdempotency(idempotencyKey);
  }

  async delete(idempotencyKey: string): Promise<void> {
    this.engine.deleteIdempotency(idempotencyKey);
  }
}

export class FirestoreAuditRepository implements IAuditRepository {
  constructor(private engine: ControlledFirestoreBatchEngine) {}

  async record(event: ProvisioningAuditEvent): Promise<void> {
    this.engine.recordAudit(event);
  }

  async findByRequestId(requestId: string): Promise<ProvisioningAuditEvent[]> {
    return this.engine.getAudits(e => e.requestId === requestId);
  }

  async findByTenantId(tenantId: string): Promise<ProvisioningAuditEvent[]> {
    return this.engine.getAudits(e => e.tenantId === tenantId);
  }

  async clear(): Promise<void> {
    // Audit clear
  }
}

export function createControlledFirestoreProvisioningAdapter(
  mode: ProvisioningEnvironmentMode = 'EMULATOR_CONTROLLED'
): { repos: ProvisioningRepositories; engine: ControlledFirestoreBatchEngine } {
  const engine = new ControlledFirestoreBatchEngine(mode);
  const repos: ProvisioningRepositories = {
    tenantRepo: new FirestoreTenantRepository(engine),
    brandRepo: new FirestoreBrandRepository(engine),
    businessRepo: new FirestoreBusinessRepository(engine),
    branchRepo: new FirestoreBranchRepository(engine),
    subscriptionRepo: new FirestoreSubscriptionRepository(engine),
    membershipRepo: new FirestoreMembershipRepository(engine),
    idempotencyRepo: new FirestoreIdempotencyRepository(engine),
    auditRepo: new FirestoreAuditRepository(engine)
  };

  return { repos, engine };
}
