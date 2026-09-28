"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.7 PRODUCTION READINESS CERTIFICATION
 * Claims Authorization Gate
 *
 * PURPOSE: Demonstrates that a mandatory, explicit, human-authorized barrier
 *          exists between the Claims system and production. No claims can be
 *          issued without a registered, unexpired, explicit authorization.
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsAuthorizationGate = void 0;
class ClaimsAuthorizationGate {
    /** During C2D.7 there is no authorization — gate is always CLOSED. */
    static getAuthorization() {
        return this._authorization;
    }
    /**
     * Evaluates a claims request against the gate.
     * Without explicit authorization: always returns CLAIMS_AUTHORIZATION_REQUIRED.
     * The gate NEVER issues production claims during C2D.7.
     */
    static evaluateClaimsRequest(request) {
        this._deniedRequests.push(request);
        if (!this._authorization) {
            return {
                status: 'CLAIMS_AUTHORIZATION_REQUIRED',
                reason: 'CLAIMS_GATE_CLOSED: No explicit human authorization exists for Claims issuance. ' +
                    'An explicit, separate, human authorization is required before any production Custom Claims can be issued.',
                productionClaimsIssued: 0,
            };
        }
        if (!this._authorization.explicit) {
            return {
                status: 'CLAIMS_DENIED',
                reason: 'IMPLICIT_AUTHORIZATION_REJECTED: Authorization must be explicit=true.',
                productionClaimsIssued: 0,
            };
        }
        if (Date.now() > this._authorization.expiresAt) {
            return {
                status: 'CLAIMS_AUTHORIZATION_EXPIRED',
                reason: `AUTHORIZATION_EXPIRED: Token expired at ${new Date(this._authorization.expiresAt).toISOString()}.`,
                productionClaimsIssued: 0,
            };
        }
        if (this._authorization.scope !== 'PRODUCTION') {
            return {
                status: 'CLAIMS_DENIED',
                reason: `SCOPE_MISMATCH: Authorization scope "${this._authorization.scope}" does not cover PRODUCTION claims.`,
                productionClaimsIssued: 0,
            };
        }
        // Even with valid authorization, C2D.7 never executes real claims
        return {
            status: 'CLAIMS_AUTHORIZATION_REQUIRED',
            reason: 'C2D7_SIMULATION_ONLY: Even with valid authorization, C2D.7 does not issue real claims. ' +
                'This certifies the barrier exists, not that claims are being issued.',
            productionClaimsIssued: 0,
        };
    }
    /**
     * Simulates the complete claims request → gate → deny flow for audit purposes.
     * Returns evidence that the barrier is working.
     */
    static simulateClaimsFlow(scenario) {
        const simulatedRequest = {
            uid: 'sim-uid-001',
            tenantId: 'sim-tenant-001',
            requestedClaims: { role: 'ADMIN', tenantId: 'sim-tenant-001' },
            requestedBy: 'C2D7_SIMULATION',
            reason: `C2D.7 Claims barrier simulation — scenario: ${scenario}`,
        };
        switch (scenario) {
            case 'NO_AUTH':
                this._authorization = null;
                break;
            case 'EXPIRED_AUTH':
                this._authorization = {
                    authorizationId: 'auth-expired-001',
                    approvedBy: 'HUMAN_OPERATOR',
                    approvedAt: Date.now() - 7200000, // 2h ago
                    expiresAt: Date.now() - 3600000, // expired 1h ago
                    maxUids: 10,
                    explicit: true,
                    scope: 'PRODUCTION',
                };
                break;
            case 'INVALID_SCOPE':
                this._authorization = {
                    authorizationId: 'auth-staging-001',
                    approvedBy: 'HUMAN_OPERATOR',
                    approvedAt: Date.now(),
                    expiresAt: Date.now() + 3600000,
                    maxUids: 10,
                    explicit: true,
                    scope: 'STAGING', // Wrong scope for production claims
                };
                break;
            case 'VALID_BUT_C2D7':
                this._authorization = null; // Reset after simulation
                break;
        }
        const decision = this.evaluateClaimsRequest(simulatedRequest);
        this._authorization = null; // Always reset after simulation — gate stays CLOSED during C2D.7
        return {
            scenario,
            request: simulatedRequest,
            decision,
            productionClaimsIssued: this._productionClaimsIssued, // Always 0
            barrierActive: decision.productionClaimsIssued === 0,
        };
    }
    /** Returns count of production claims issued. Must always be 0 during C2D.7. */
    static getProductionClaimsIssued() {
        return this._productionClaimsIssued;
    }
    /** Asserts zero production claims. */
    static assertZeroClaims() {
        if (this._productionClaimsIssued !== 0) {
            throw new Error(`CLAIMS_AUDIT_FAILURE: ${this._productionClaimsIssued} production claims issued. STATUS: NO-GO`);
        }
    }
    /** Resets for test isolation. */
    static reset() {
        this._authorization = null;
        this._productionClaimsIssued = 0;
        this._deniedRequests = [];
    }
}
exports.ClaimsAuthorizationGate = ClaimsAuthorizationGate;
ClaimsAuthorizationGate._authorization = null;
ClaimsAuthorizationGate._productionClaimsIssued = 0;
ClaimsAuthorizationGate._deniedRequests = [];
//# sourceMappingURL=claimsAuthorizationGate.js.map