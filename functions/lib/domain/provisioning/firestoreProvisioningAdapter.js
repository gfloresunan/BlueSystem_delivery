"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAuditRepository = exports.FirestoreIdempotencyRepository = exports.FirestoreMembershipRepository = exports.FirestoreSubscriptionRepository = exports.FirestoreBranchRepository = exports.FirestoreBusinessRepository = exports.FirestoreBrandRepository = exports.FirestoreTenantRepository = exports.ControlledFirestoreBatchEngine = void 0;
exports.createControlledFirestoreProvisioningAdapter = createControlledFirestoreProvisioningAdapter;
const repositories_1 = require("./repositories");
class ControlledFirestoreBatchEngine {
    constructor(mode = 'EMULATOR_CONTROLLED') {
        this.mode = mode;
        this.documents = new Map();
        this.auditLogs = [];
        this.idempotencyStore = new Map();
        if (mode === 'PRODUCTION_EXECUTED') {
            repositories_1.ProductionInvocationDetector.flagProductionAttempt();
        }
    }
    setDocument(collection, docId, data) {
        if (this.mode === 'PRODUCTION_EXECUTED') {
            repositories_1.ProductionInvocationDetector.assertNoProductionAccess();
        }
        const key = `${collection}/${docId}`;
        this.documents.set(key, JSON.parse(JSON.stringify(data)));
    }
    getDocument(collection, docId) {
        const key = `${collection}/${docId}`;
        const item = this.documents.get(key);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    deleteDocument(collection, docId) {
        if (this.mode === 'PRODUCTION_EXECUTED') {
            repositories_1.ProductionInvocationDetector.assertNoProductionAccess();
        }
        const key = `${collection}/${docId}`;
        this.documents.delete(key);
    }
    queryCollection(collection, filterFn) {
        const results = [];
        const prefix = `${collection}/`;
        for (const [key, val] of this.documents.entries()) {
            if (key.startsWith(prefix) && filterFn(val)) {
                results.push(JSON.parse(JSON.stringify(val)));
            }
        }
        return results;
    }
    recordAudit(event) {
        this.auditLogs.push(JSON.parse(JSON.stringify(event)));
    }
    getAudits(filterFn) {
        return this.auditLogs.filter(filterFn).map(e => JSON.parse(JSON.stringify(e)));
    }
    saveIdempotency(key, result, payloadHash) {
        this.idempotencyStore.set(key, {
            result: JSON.parse(JSON.stringify(result)),
            payloadHash
        });
    }
    getIdempotency(key) {
        const item = this.idempotencyStore.get(key);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }
    deleteIdempotency(key) {
        this.idempotencyStore.delete(key);
    }
    clear() {
        this.documents.clear();
        this.auditLogs = [];
        this.idempotencyStore.clear();
    }
    getDocumentCount(collection) {
        if (!collection)
            return this.documents.size;
        const prefix = `${collection}/`;
        let count = 0;
        for (const key of this.documents.keys()) {
            if (key.startsWith(prefix))
                count++;
        }
        return count;
    }
}
exports.ControlledFirestoreBatchEngine = ControlledFirestoreBatchEngine;
class FirestoreTenantRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(tenant) {
        this.engine.setDocument('tenants', tenant.tenantId, tenant);
    }
    async findById(tenantId) {
        return this.engine.getDocument('tenants', tenantId);
    }
    async findBySlug(slug) {
        const results = this.engine.queryCollection('tenants', t => t.slug === slug);
        return results.length > 0 ? results[0] : null;
    }
    async delete(tenantId) {
        this.engine.deleteDocument('tenants', tenantId);
    }
    async count() {
        return this.engine.getDocumentCount('tenants');
    }
}
exports.FirestoreTenantRepository = FirestoreTenantRepository;
class FirestoreBrandRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(brand) {
        this.engine.setDocument('brands', brand.brandId, brand);
    }
    async findById(brandId) {
        return this.engine.getDocument('brands', brandId);
    }
    async findByTenantId(tenantId) {
        return this.engine.queryCollection('brands', b => b.tenantId === tenantId);
    }
    async delete(brandId) {
        this.engine.deleteDocument('brands', brandId);
    }
    async count() {
        return this.engine.getDocumentCount('brands');
    }
}
exports.FirestoreBrandRepository = FirestoreBrandRepository;
class FirestoreBusinessRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(business) {
        this.engine.setDocument('businesses', business.businessId, business);
    }
    async findById(businessId) {
        return this.engine.getDocument('businesses', businessId);
    }
    async findByTenantId(tenantId) {
        return this.engine.queryCollection('businesses', b => b.tenantId === tenantId);
    }
    async delete(businessId) {
        this.engine.deleteDocument('businesses', businessId);
    }
    async count() {
        return this.engine.getDocumentCount('businesses');
    }
}
exports.FirestoreBusinessRepository = FirestoreBusinessRepository;
class FirestoreBranchRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(branch) {
        this.engine.setDocument('branches', branch.branchId, branch);
    }
    async findById(branchId) {
        return this.engine.getDocument('branches', branchId);
    }
    async findByBusinessId(businessId) {
        return this.engine.queryCollection('branches', b => b.businessId === businessId);
    }
    async delete(branchId) {
        this.engine.deleteDocument('branches', branchId);
    }
    async count() {
        return this.engine.getDocumentCount('branches');
    }
}
exports.FirestoreBranchRepository = FirestoreBranchRepository;
class FirestoreSubscriptionRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(subscription) {
        this.engine.setDocument('subscriptions', subscription.subscriptionId, subscription);
    }
    async findById(subscriptionId) {
        return this.engine.getDocument('subscriptions', subscriptionId);
    }
    async findByTenantId(tenantId) {
        const results = this.engine.queryCollection('subscriptions', s => s.tenantId === tenantId);
        return results.length > 0 ? results[0] : null;
    }
    async delete(subscriptionId) {
        this.engine.deleteDocument('subscriptions', subscriptionId);
    }
    async count() {
        return this.engine.getDocumentCount('subscriptions');
    }
}
exports.FirestoreSubscriptionRepository = FirestoreSubscriptionRepository;
class FirestoreMembershipRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(membership) {
        this.engine.setDocument('memberships', membership.membershipId, membership);
    }
    async findById(membershipId) {
        return this.engine.getDocument('memberships', membershipId);
    }
    async findByTenantId(tenantId) {
        return this.engine.queryCollection('memberships', m => m.tenantId === tenantId);
    }
    async delete(membershipId) {
        this.engine.deleteDocument('memberships', membershipId);
    }
    async count() {
        return this.engine.getDocumentCount('memberships');
    }
}
exports.FirestoreMembershipRepository = FirestoreMembershipRepository;
class FirestoreIdempotencyRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async save(idempotencyKey, result, payloadHash) {
        this.engine.saveIdempotency(idempotencyKey, result, payloadHash);
    }
    async findByKey(idempotencyKey) {
        return this.engine.getIdempotency(idempotencyKey);
    }
    async delete(idempotencyKey) {
        this.engine.deleteIdempotency(idempotencyKey);
    }
}
exports.FirestoreIdempotencyRepository = FirestoreIdempotencyRepository;
class FirestoreAuditRepository {
    constructor(engine) {
        this.engine = engine;
    }
    async record(event) {
        this.engine.recordAudit(event);
    }
    async findByRequestId(requestId) {
        return this.engine.getAudits(e => e.requestId === requestId);
    }
    async findByTenantId(tenantId) {
        return this.engine.getAudits(e => e.tenantId === tenantId);
    }
    async clear() {
        // Audit clear
    }
}
exports.FirestoreAuditRepository = FirestoreAuditRepository;
function createControlledFirestoreProvisioningAdapter(mode = 'EMULATOR_CONTROLLED') {
    const engine = new ControlledFirestoreBatchEngine(mode);
    const repos = {
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
//# sourceMappingURL=firestoreProvisioningAdapter.js.map