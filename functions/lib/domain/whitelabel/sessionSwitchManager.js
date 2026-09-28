"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — SESSION & TENANT SWITCH MANAGER (FASE 2D.5 / C2D.5)
 * Pure Deterministic Session Switch Simulation & Cache Isolation Controller
 *
 * ZERO RESIDUAL MEMORY / ZERO CROSS-TENANT CONTAMINATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSwitchManager = void 0;
const clientExperienceResolver_1 = require("./clientExperienceResolver");
class SessionSwitchManager {
    constructor() {
        this.activeSnapshot = null;
        this.switchHistory = [];
    }
    /**
     * Carga una nueva sesión de Tenant/Brand, purgando instantáneamente cualquier estado previo.
     */
    switchSession(session, now = Date.now()) {
        const previousTenantId = this.activeSnapshot ? this.activeSnapshot.tenantId : null;
        // 1. Purga atómica de estado anterior
        this.activeSnapshot = null;
        // 2. Síntesis de nueva instantánea
        const newSnapshot = clientExperienceResolver_1.ClientExperienceResolver.resolveSnapshot(session.tenant, session.brand, session.subscription, session.membership, session.initialConfig, now);
        this.activeSnapshot = newSnapshot;
        this.switchHistory.push({
            fromTenantId: previousTenantId,
            toTenantId: session.tenant.tenantId,
            timestamp: now
        });
        return newSnapshot;
    }
    /**
     * Retorna la instantánea activa actual.
     */
    getActiveSnapshot() {
        return this.activeSnapshot ? JSON.parse(JSON.stringify(this.activeSnapshot)) : null;
    }
    /**
     * Limpia y cierra la sesión completamente.
     */
    clearSession() {
        this.activeSnapshot = null;
    }
    /**
     * Retorna el historial de cambios de sesión.
     */
    getSwitchHistory() {
        return [...this.switchHistory];
    }
}
exports.SessionSwitchManager = SessionSwitchManager;
//# sourceMappingURL=sessionSwitchManager.js.map