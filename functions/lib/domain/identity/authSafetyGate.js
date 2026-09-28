"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Auth Safety Gate & Mutation Barrier
 *
 * Barrera arquitectónica infranqueable que garantiza CERO mutaciones accidentales en Firebase Auth.
 * Modo obligatorio: DISABLED.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthSafetyGate = exports.DisabledAuthClaimsMutationGateway = exports.AuthMutationBlockedError = void 0;
class AuthMutationBlockedError extends Error {
    constructor(message = 'Firebase Auth mutations are strictly DISABLED in this phase/environment.') {
        super(`[AUTH_SAFETY_GATE_BLOCKED] ${message}`);
        this.name = 'AuthMutationBlockedError';
    }
}
exports.AuthMutationBlockedError = AuthMutationBlockedError;
/**
 * Gateway Deshabilitado (Barrera de Seguridad Fase 2C.4)
 * Bloquea cualquier intento de mutación y lanza un error controlado.
 */
class DisabledAuthClaimsMutationGateway {
    constructor() {
        this.attemptedMutations = 0;
    }
    async setCustomUserClaims(uid, _claims) {
        this.attemptedMutations++;
        throw new AuthMutationBlockedError(`Intento de llamada a setCustomUserClaims para UID '${uid}' bloqueado por la barrera de seguridad.`);
    }
    async revokeRefreshTokens(uid) {
        this.attemptedMutations++;
        throw new AuthMutationBlockedError(`Intento de llamada a revokeRefreshTokens para UID '${uid}' bloqueado por la barrera de seguridad.`);
    }
    isMutationEnabled() {
        return false;
    }
    getAttemptedMutationsCount() {
        return this.attemptedMutations;
    }
}
exports.DisabledAuthClaimsMutationGateway = DisabledAuthClaimsMutationGateway;
/**
 * Fábrica de Gateway Seguro
 */
class AuthSafetyGate {
    /**
     * Obtiene el gateway activo (Siempre retorna DisabledAuthClaimsMutationGateway en Fase 2C.4)
     */
    static getGateway() {
        return this.instance;
    }
    /**
     * Verifica si las mutaciones están habilitadas
     */
    static isMutationPermitted() {
        return false;
    }
}
exports.AuthSafetyGate = AuthSafetyGate;
AuthSafetyGate.instance = new DisabledAuthClaimsMutationGateway();
//# sourceMappingURL=authSafetyGate.js.map