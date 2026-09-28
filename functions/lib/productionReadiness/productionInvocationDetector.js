"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.7 PRODUCTION READINESS CERTIFICATION
 * Production Invocation Detector
 *
 * PURPOSE: Intercepts and registers any attempt to call production SDKs.
 * Any invocation count > 0 is a CRITICAL NO-GO condition.
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatedRoomMigration = exports.SimulatedHostingDeployment = exports.SimulatedRulesDeployment = exports.SimulatedProvisioningService = exports.SimulatedClaimsService = exports.SimulatedProductionAuth = exports.SimulatedProductionFirestore = exports.ProductionInvocationDetector = void 0;
class ProductionInvocationDetector {
    /**
     * Records an attempt to call a production service.
     * Always blocks in certification mode and records the attempt.
     */
    static recordAttempt(service, method) {
        const record = {
            service,
            method,
            timestamp: Date.now(),
            callStack: new Error().stack,
            blocked: true,
        };
        this._invocations.push(record);
        throw new Error(`🚨 PRODUCTION_INVOCATION_BLOCKED: Attempted call to [${service}.${method}] ` +
            `during C2D.7 Production Readiness Certification. ` +
            `All production SDK calls are FORBIDDEN in this phase. ` +
            `STATUS: NO-GO`);
    }
    /** Returns total count of production invocation attempts. */
    static getTotalInvocations() {
        return this._invocations.length;
    }
    /** Returns all recorded invocations. */
    static getInvocationLog() {
        return [...this._invocations];
    }
    /** Returns whether any production SDK was called. */
    static hasViolations() {
        return this._invocations.length > 0;
    }
    /**
     * Verifies the zero-invocation invariant.
     * Throws if any production service was called.
     */
    static assertZeroInvocations() {
        if (this._invocations.length > 0) {
            const summary = this._invocations.map(i => `  - [${i.service}.${i.method}] at ${new Date(i.timestamp).toISOString()}`).join('\n');
            throw new Error(`PRODUCTION_INVOCATION_AUDIT_FAILURE: ${this._invocations.length} production ` +
                `SDK invocation(s) detected during C2D.7.\nLog:\n${summary}\nSTATUS: NO-GO`);
        }
    }
    /** Resets detector state for test isolation. */
    static reset() {
        this._invocations = [];
    }
    /** Builds the zero-production audit report. */
    static buildAuditReport() {
        return {
            totalAttempts: this._invocations.length,
            hasViolations: this._invocations.length > 0,
            status: this._invocations.length === 0 ? 'PASS' : 'NO-GO',
            log: this.getInvocationLog(),
        };
    }
}
exports.ProductionInvocationDetector = ProductionInvocationDetector;
ProductionInvocationDetector._invocations = [];
ProductionInvocationDetector._isActive = true;
// ─── Tracked services ───────────────────────────────────────────────────────
ProductionInvocationDetector.TRACKED_SERVICES = [
    'Firestore.production',
    'FirebaseAuth.production',
    'ClaimsService.production',
    'ProvisioningService.production',
    'RulesDeployment',
    'HostingDeployment',
    'FunctionsDeployment',
    'RoomMigration',
    'StorageProduction',
    'FCMProduction',
];
/**
 * Simulated production service stubs — all throw via ProductionInvocationDetector.
 * These simulate what would happen if production SDKs were mistakenly imported.
 */
exports.SimulatedProductionFirestore = {
    collection: (_path) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'collection'),
    doc: (_path) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'doc'),
    add: (_data) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'add'),
    set: (_data) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'set'),
    update: (_data) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'update'),
    delete: () => ProductionInvocationDetector.recordAttempt('Firestore.production', 'delete'),
};
exports.SimulatedProductionAuth = {
    createUser: (_data) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'createUser'),
    deleteUser: (_uid) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'deleteUser'),
    updateUser: (_data) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'updateUser'),
    setCustomUserClaims: (_uid, _claims) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'setCustomUserClaims'),
    revokeRefreshTokens: (_uid) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'revokeRefreshTokens'),
};
exports.SimulatedClaimsService = {
    issue: (_claims) => ProductionInvocationDetector.recordAttempt('ClaimsService.production', 'issue'),
    revoke: (_uid) => ProductionInvocationDetector.recordAttempt('ClaimsService.production', 'revoke'),
    mutate: (_uid, _data) => ProductionInvocationDetector.recordAttempt('ClaimsService.production', 'mutate'),
};
exports.SimulatedProvisioningService = {
    provision: (_request) => ProductionInvocationDetector.recordAttempt('ProvisioningService.production', 'provision'),
    deprovision: (_tenantId) => ProductionInvocationDetector.recordAttempt('ProvisioningService.production', 'deprovision'),
};
exports.SimulatedRulesDeployment = {
    deploy: () => ProductionInvocationDetector.recordAttempt('RulesDeployment', 'deploy'),
    publish: () => ProductionInvocationDetector.recordAttempt('RulesDeployment', 'publish'),
};
exports.SimulatedHostingDeployment = {
    deploy: () => ProductionInvocationDetector.recordAttempt('HostingDeployment', 'deploy'),
    release: () => ProductionInvocationDetector.recordAttempt('HostingDeployment', 'release'),
};
exports.SimulatedRoomMigration = {
    migrate: () => ProductionInvocationDetector.recordAttempt('RoomMigration', 'migrate'),
    runMigration: () => ProductionInvocationDetector.recordAttempt('RoomMigration', 'runMigration'),
};
//# sourceMappingURL=productionInvocationDetector.js.map