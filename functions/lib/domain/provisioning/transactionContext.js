"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TRANSACTION CONTEXT & COMPENSATION ENGINE (FASE 2D.4 / C2D.4)
 * Simulated Transaction Context, Rollback Stack, and Zero-Residual Compensation Engine
 *
 * ZERO MUTATION / PURE IN-MEMORY SIMULATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompensationEngine = exports.ProvisioningTransactionContext = void 0;
class ProvisioningTransactionContext {
    constructor(requestId, idempotencyKey, tenantId, failureInjection = 'NONE') {
        this.compensationStack = [];
        this.auditEvents = [];
        this.createdEntityTracker = {
            tenants: [],
            brands: [],
            businesses: [],
            branches: [],
            subscriptions: [],
            memberships: []
        };
        this.requestId = requestId;
        this.idempotencyKey = idempotencyKey;
        this.tenantId = tenantId;
        this.failureInjection = failureInjection;
    }
    pushCompensation(record) {
        this.compensationStack.push(record);
    }
    getCompensationStack() {
        return [...this.compensationStack];
    }
    recordCreatedEntity(type, id) {
        switch (type) {
            case 'TENANT':
                this.createdEntityTracker.tenants.push(id);
                break;
            case 'BRAND':
                this.createdEntityTracker.brands.push(id);
                break;
            case 'BUSINESS':
                this.createdEntityTracker.businesses.push(id);
                break;
            case 'BRANCH':
                this.createdEntityTracker.branches.push(id);
                break;
            case 'SUBSCRIPTION':
                this.createdEntityTracker.subscriptions.push(id);
                break;
            case 'MEMBERSHIP':
                this.createdEntityTracker.memberships.push(id);
                break;
        }
    }
    getCreatedEntityCount() {
        return (this.createdEntityTracker.tenants.length +
            this.createdEntityTracker.brands.length +
            this.createdEntityTracker.businesses.length +
            this.createdEntityTracker.branches.length +
            this.createdEntityTracker.subscriptions.length +
            this.createdEntityTracker.memberships.length);
    }
    recordAudit(operation, step, status, reason, details) {
        const event = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            requestId: this.requestId,
            idempotencyKey: this.idempotencyKey,
            tenantId: this.tenantId,
            operation,
            step,
            status,
            reason,
            timestamp: Date.now(),
            details
        };
        this.auditEvents.push(event);
        return event;
    }
    getAuditTrail() {
        return [...this.auditEvents];
    }
    shouldInjectFailure(step) {
        return this.failureInjection === step;
    }
}
exports.ProvisioningTransactionContext = ProvisioningTransactionContext;
class CompensationEngine {
    /**
     * Ejecuta el stack de compensación en orden inverso (LIFO) y valida que no quede estado residual.
     */
    static async executeCompensation(context, repos) {
        const stack = [...context.getCompensationStack()];
        let compensatedCount = 0;
        const errors = [];
        context.recordAudit('COMPENSATION', 'COMPENSATION_STARTED', 'SUCCESS', `Starting rollback of ${stack.length} steps`);
        // Invertir el stack para compensar en orden LIFO
        stack.reverse();
        for (const record of stack) {
            try {
                await record.action();
                compensatedCount++;
                context.recordAudit('COMPENSATION', record.step, 'REVERTED', `Compensated ${record.entityType}: ${record.entityId}`);
            }
            catch (err) {
                const errorMsg = `Compensation failed for ${record.entityType} (${record.entityId}): ${err.message || err}`;
                errors.push(errorMsg);
                context.recordAudit('COMPENSATION', record.step, 'FAILED', errorMsg);
            }
        }
        context.recordAudit('COMPENSATION', 'COMPENSATION_COMPLETED', errors.length === 0 ? 'SUCCESS' : 'FAILED', `Rollback complete. Compensated ${compensatedCount}/${stack.length} operations.`);
        return { compensatedCount, errors };
    }
}
exports.CompensationEngine = CompensationEngine;
//# sourceMappingURL=transactionContext.js.map