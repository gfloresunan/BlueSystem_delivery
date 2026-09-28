"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROVISIONING REPOSITORIES (FASE 2D.4 / C2D.4)
 * Repository Interfaces and In-Memory Simulation Implementations
 *
 * STRICT ZERO-PRODUCTION MUTATION: No Firestore, Auth, or Claims SDK connections.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuditRepository = exports.InMemoryIdempotencyRepository = exports.InMemoryMembershipRepository = exports.InMemorySubscriptionRepository = exports.InMemoryBranchRepository = exports.InMemoryBusinessRepository = exports.InMemoryBrandRepository = exports.InMemoryTenantRepository = exports.ProductionInvocationDetector = void 0;
exports.createInMemoryRepositories = createInMemoryRepositories;
// ─── 2. ZERO-PRODUCTION-CONNECTION SAFETY GUARD ──────────────────────────────
class ProductionInvocationDetector {
    static assertNoProductionAccess() {
        if (this.productionAccessAttempted) {
            throw new Error('FATAL SECURITY VIOLATION: Production repository or service connection detected during C2D.4 simulation!');
        }
    }
    static flagProductionAttempt() {
        this.productionAccessAttempted = true;
    }
    static reset() {
        this.productionAccessAttempted = false;
    }
    static hasProductionBeenAttempted() {
        return this.productionAccessAttempted;
    }
}
exports.ProductionInvocationDetector = ProductionInvocationDetector;
ProductionInvocationDetector.productionAccessAttempted = false;
// ─── 3. IN-MEMORY REPOSITORY IMPLEMENTATIONS ─────────────────────────────────
class InMemoryTenantRepository {
    constructor() {
        this.store = new Map();
    }
    async save(tenant) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(tenant.tenantId, JSON.parse(JSON.stringify(tenant)));
    }
    async findById(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(tenantId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async findBySlug(slug) {
        ProductionInvocationDetector.assertNoProductionAccess();
        for (const item of this.store.values()) {
            if (item.slug === slug) {
                return JSON.parse(JSON.stringify(item));
            }
        }
        return null;
    }
    async delete(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(tenantId);
    }
    async count() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemoryTenantRepository = InMemoryTenantRepository;
class InMemoryBrandRepository {
    constructor() {
        this.store = new Map();
    }
    async save(brand) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(brand.brandId, JSON.parse(JSON.stringify(brand)));
    }
    async findById(brandId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(brandId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async findByTenantId(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const results = [];
        for (const item of this.store.values()) {
            if (item.tenantId === tenantId) {
                results.push(JSON.parse(JSON.stringify(item)));
            }
        }
        return results;
    }
    async delete(brandId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(brandId);
    }
    async count() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemoryBrandRepository = InMemoryBrandRepository;
class InMemoryBusinessRepository {
    constructor() {
        this.store = new Map();
    }
    async save(business) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(business.businessId, JSON.parse(JSON.stringify(business)));
    }
    async findById(businessId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(businessId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async findByTenantId(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const results = [];
        for (const item of this.store.values()) {
            if (item.tenantId === tenantId) {
                results.push(JSON.parse(JSON.stringify(item)));
            }
        }
        return results;
    }
    async delete(businessId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(businessId);
    }
    async count() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemoryBusinessRepository = InMemoryBusinessRepository;
class InMemoryBranchRepository {
    constructor() {
        this.store = new Map();
    }
    async save(branch) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(branch.branchId, JSON.parse(JSON.stringify(branch)));
    }
    async findById(branchId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(branchId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async findByBusinessId(businessId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const results = [];
        for (const item of this.store.values()) {
            if (item.businessId === businessId) {
                results.push(JSON.parse(JSON.stringify(item)));
            }
        }
        return results;
    }
    async delete(branchId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(branchId);
    }
    async count() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemoryBranchRepository = InMemoryBranchRepository;
class InMemorySubscriptionRepository {
    constructor() {
        this.store = new Map();
    }
    async save(subscription) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(subscription.subscriptionId, JSON.parse(JSON.stringify(subscription)));
    }
    async findById(subscriptionId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(subscriptionId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async findByTenantId(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        for (const item of this.store.values()) {
            if (item.tenantId === tenantId) {
                return JSON.parse(JSON.stringify(item));
            }
        }
        return null;
    }
    async delete(subscriptionId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(subscriptionId);
    }
    async count() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemorySubscriptionRepository = InMemorySubscriptionRepository;
class InMemoryMembershipRepository {
    constructor() {
        this.store = new Map();
    }
    async save(membership) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(membership.membershipId, JSON.parse(JSON.stringify(membership)));
    }
    async findById(membershipId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(membershipId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async findByTenantId(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const results = [];
        for (const item of this.store.values()) {
            if (item.tenantId === tenantId) {
                results.push(JSON.parse(JSON.stringify(item)));
            }
        }
        return results;
    }
    async delete(membershipId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(membershipId);
    }
    async count() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemoryMembershipRepository = InMemoryMembershipRepository;
class InMemoryIdempotencyRepository {
    constructor() {
        this.store = new Map();
    }
    async save(idempotencyKey, result, payloadHash) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.set(idempotencyKey, {
            result: JSON.parse(JSON.stringify(result)),
            payloadHash
        });
    }
    async findByKey(idempotencyKey) {
        ProductionInvocationDetector.assertNoProductionAccess();
        const item = this.store.get(idempotencyKey);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    async delete(idempotencyKey) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.store.delete(idempotencyKey);
    }
    clear() {
        this.store.clear();
    }
}
exports.InMemoryIdempotencyRepository = InMemoryIdempotencyRepository;
class InMemoryAuditRepository {
    constructor() {
        this.logs = [];
    }
    async record(event) {
        ProductionInvocationDetector.assertNoProductionAccess();
        this.logs.push(JSON.parse(JSON.stringify(event)));
    }
    async findByRequestId(requestId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        return this.logs
            .filter(l => l.requestId === requestId)
            .map(l => JSON.parse(JSON.stringify(l)));
    }
    async findByTenantId(tenantId) {
        ProductionInvocationDetector.assertNoProductionAccess();
        return this.logs
            .filter(l => l.tenantId === tenantId)
            .map(l => JSON.parse(JSON.stringify(l)));
    }
    async clear() {
        this.logs = [];
    }
}
exports.InMemoryAuditRepository = InMemoryAuditRepository;
function createInMemoryRepositories() {
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
//# sourceMappingURL=repositories.js.map