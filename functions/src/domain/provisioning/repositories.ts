/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROVISIONING REPOSITORIES (FASE 2D.4 / C2D.4)
 * Repository Interfaces and In-Memory Simulation Implementations
 * 
 * STRICT ZERO-PRODUCTION MUTATION: No Firestore, Auth, or Claims SDK connections.
 */

import {
  TenantEntity,
  BrandEntity,
  BusinessEntity,
  BranchEntity,
  SubscriptionEntity,
  EntitlementEntity
} from '../platform/models';
import { MembershipV3Entity } from '../identity/models';
import { ProvisioningAuditEvent, ProvisioningResult } from './models';

// ─── 1. REPOSITORY INTERFACES ────────────────────────────────────────────────
export interface ITenantRepository {
  save(tenant: TenantEntity): Promise<void>;
  findById(tenantId: string): Promise<TenantEntity | null>;
  findBySlug(slug: string): Promise<TenantEntity | null>;
  delete(tenantId: string): Promise<void>;
  count(): Promise<number>;
}

export interface IBrandRepository {
  save(brand: BrandEntity): Promise<void>;
  findById(brandId: string): Promise<BrandEntity | null>;
  findByTenantId(tenantId: string): Promise<BrandEntity[]>;
  delete(brandId: string): Promise<void>;
  count(): Promise<number>;
}

export interface IBusinessRepository {
  save(business: BusinessEntity): Promise<void>;
  findById(businessId: string): Promise<BusinessEntity | null>;
  findByTenantId(tenantId: string): Promise<BusinessEntity[]>;
  delete(businessId: string): Promise<void>;
  count(): Promise<number>;
}

export interface IBranchRepository {
  save(branch: BranchEntity): Promise<void>;
  findById(branchId: string): Promise<BranchEntity | null>;
  findByBusinessId(businessId: string): Promise<BranchEntity[]>;
  delete(branchId: string): Promise<void>;
  count(): Promise<number>;
}

export interface ISubscriptionRepository {
  save(subscription: SubscriptionEntity): Promise<void>;
  findById(subscriptionId: string): Promise<SubscriptionEntity | null>;
  findByTenantId(tenantId: string): Promise<SubscriptionEntity | null>;
  delete(subscriptionId: string): Promise<void>;
  count(): Promise<number>;
}

export interface IMembershipRepository {
  save(membership: MembershipV3Entity): Promise<void>;
  findById(membershipId: string): Promise<MembershipV3Entity | null>;
  findByTenantId(tenantId: string): Promise<MembershipV3Entity[]>;
  delete(membershipId: string): Promise<void>;
  count(): Promise<number>;
}

export interface IIdempotencyRepository {
  save(idempotencyKey: string, result: ProvisioningResult, payloadHash: string): Promise<void>;
  findByKey(idempotencyKey: string): Promise<{ result: ProvisioningResult; payloadHash: string } | null>;
  delete(idempotencyKey: string): Promise<void>;
}

export interface IAuditRepository {
  record(event: ProvisioningAuditEvent): Promise<void>;
  findByRequestId(requestId: string): Promise<ProvisioningAuditEvent[]>;
  findByTenantId(tenantId: string): Promise<ProvisioningAuditEvent[]>;
  clear(): Promise<void>;
}

// ─── 2. ZERO-PRODUCTION-CONNECTION SAFETY GUARD ──────────────────────────────
export class ProductionInvocationDetector {
  private static productionAccessAttempted = false;

  static assertNoProductionAccess(): void {
    if (this.productionAccessAttempted) {
      throw new Error('FATAL SECURITY VIOLATION: Production repository or service connection detected during C2D.4 simulation!');
    }
  }

  static flagProductionAttempt(): void {
    this.productionAccessAttempted = true;
  }

  static reset(): void {
    this.productionAccessAttempted = false;
  }

  static hasProductionBeenAttempted(): boolean {
    return this.productionAccessAttempted;
  }
}

// ─── 3. IN-MEMORY REPOSITORY IMPLEMENTATIONS ─────────────────────────────────

export class InMemoryTenantRepository implements ITenantRepository {
  private store: Map<string, TenantEntity> = new Map();

  async save(tenant: TenantEntity): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(tenant.tenantId, JSON.parse(JSON.stringify(tenant)));
  }

  async findById(tenantId: string): Promise<TenantEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(tenantId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    for (const item of this.store.values()) {
      if (item.slug === slug) {
        return JSON.parse(JSON.stringify(item));
      }
    }
    return null;
  }

  async delete(tenantId: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(tenantId);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryBrandRepository implements IBrandRepository {
  private store: Map<string, BrandEntity> = new Map();

  async save(brand: BrandEntity): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(brand.brandId, JSON.parse(JSON.stringify(brand)));
  }

  async findById(brandId: string): Promise<BrandEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(brandId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findByTenantId(tenantId: string): Promise<BrandEntity[]> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const results: BrandEntity[] = [];
    for (const item of this.store.values()) {
      if (item.tenantId === tenantId) {
        results.push(JSON.parse(JSON.stringify(item)));
      }
    }
    return results;
  }

  async delete(brandId: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(brandId);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryBusinessRepository implements IBusinessRepository {
  private store: Map<string, BusinessEntity> = new Map();

  async save(business: BusinessEntity): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(business.businessId, JSON.parse(JSON.stringify(business)));
  }

  async findById(businessId: string): Promise<BusinessEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(businessId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findByTenantId(tenantId: string): Promise<BusinessEntity[]> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const results: BusinessEntity[] = [];
    for (const item of this.store.values()) {
      if (item.tenantId === tenantId) {
        results.push(JSON.parse(JSON.stringify(item)));
      }
    }
    return results;
  }

  async delete(businessId: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(businessId);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryBranchRepository implements IBranchRepository {
  private store: Map<string, BranchEntity> = new Map();

  async save(branch: BranchEntity): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(branch.branchId, JSON.parse(JSON.stringify(branch)));
  }

  async findById(branchId: string): Promise<BranchEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(branchId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findByBusinessId(businessId: string): Promise<BranchEntity[]> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const results: BranchEntity[] = [];
    for (const item of this.store.values()) {
      if (item.businessId === businessId) {
        results.push(JSON.parse(JSON.stringify(item)));
      }
    }
    return results;
  }

  async delete(branchId: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(branchId);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemorySubscriptionRepository implements ISubscriptionRepository {
  private store: Map<string, SubscriptionEntity> = new Map();

  async save(subscription: SubscriptionEntity): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(subscription.subscriptionId, JSON.parse(JSON.stringify(subscription)));
  }

  async findById(subscriptionId: string): Promise<SubscriptionEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(subscriptionId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findByTenantId(tenantId: string): Promise<SubscriptionEntity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    for (const item of this.store.values()) {
      if (item.tenantId === tenantId) {
        return JSON.parse(JSON.stringify(item));
      }
    }
    return null;
  }

  async delete(subscriptionId: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(subscriptionId);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryMembershipRepository implements IMembershipRepository {
  private store: Map<string, MembershipV3Entity> = new Map();

  async save(membership: MembershipV3Entity): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(membership.membershipId, JSON.parse(JSON.stringify(membership)));
  }

  async findById(membershipId: string): Promise<MembershipV3Entity | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(membershipId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findByTenantId(tenantId: string): Promise<MembershipV3Entity[]> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const results: MembershipV3Entity[] = [];
    for (const item of this.store.values()) {
      if (item.tenantId === tenantId) {
        results.push(JSON.parse(JSON.stringify(item)));
      }
    }
    return results;
  }

  async delete(membershipId: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(membershipId);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryIdempotencyRepository implements IIdempotencyRepository {
  private store: Map<string, { result: ProvisioningResult; payloadHash: string }> = new Map();

  async save(idempotencyKey: string, result: ProvisioningResult, payloadHash: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.set(idempotencyKey, {
      result: JSON.parse(JSON.stringify(result)),
      payloadHash
    });
  }

  async findByKey(idempotencyKey: string): Promise<{ result: ProvisioningResult; payloadHash: string } | null> {
    ProductionInvocationDetector.assertNoProductionAccess();
    const item = this.store.get(idempotencyKey);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async delete(idempotencyKey: string): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.store.delete(idempotencyKey);
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryAuditRepository implements IAuditRepository {
  private logs: ProvisioningAuditEvent[] = [];

  async record(event: ProvisioningAuditEvent): Promise<void> {
    ProductionInvocationDetector.assertNoProductionAccess();
    this.logs.push(JSON.parse(JSON.stringify(event)));
  }

  async findByRequestId(requestId: string): Promise<ProvisioningAuditEvent[]> {
    ProductionInvocationDetector.assertNoProductionAccess();
    return this.logs
      .filter(l => l.requestId === requestId)
      .map(l => JSON.parse(JSON.stringify(l)));
  }

  async findByTenantId(tenantId: string): Promise<ProvisioningAuditEvent[]> {
    ProductionInvocationDetector.assertNoProductionAccess();
    return this.logs
      .filter(l => l.tenantId === tenantId)
      .map(l => JSON.parse(JSON.stringify(l)));
  }

  async clear(): Promise<void> {
    this.logs = [];
  }
}

// ─── 4. REPOSITORY CONTAINER FIXTURE ─────────────────────────────────────────
export interface ProvisioningRepositories {
  tenantRepo: ITenantRepository;
  brandRepo: IBrandRepository;
  businessRepo: IBusinessRepository;
  branchRepo: IBranchRepository;
  subscriptionRepo: ISubscriptionRepository;
  membershipRepo: IMembershipRepository;
  idempotencyRepo: IIdempotencyRepository;
  auditRepo: IAuditRepository;
}

export function createInMemoryRepositories(): ProvisioningRepositories {
  return {
    tenantRepo: new InMemoryTenantRepository(),
    brandRepo: new InMemoryBrandRepository(),
    businessRepo: new InMemoryBusinessRepository(),
    branchRepo: new InMemoryBranchRepository(),
    subscriptionRepo: new InMemorySubscriptionRepository(),
    membershipRepo: new InMemoryMembershipRepository(),
    idempotencyRepo: new InMemoryIdempotencyRepository(),
    auditRepo: new InMemoryAuditRepository()
  };
}
