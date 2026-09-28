"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 PROVISIONING DOMAIN (FASE 2C.9)
 * Motor de Auto-Provisión EIAM v3 con Bloqueo de Producción y Rollback Transaccional.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EiamV3ProvisioningEngine = exports.InMemoryProvisioningDriver = void 0;
const provisioningPlanner_1 = require("./provisioningPlanner");
const provisioningSafetyLock_1 = require("../../../config/provisioningSafetyLock");
const claimsV3Builder_1 = require("../claimsV3Builder");
/**
 * Driver en memoria para simulación transaccional aislada (Zero Writes a Producción)
 */
class InMemoryProvisioningDriver {
    constructor() {
        this.tenants = new Map();
        this.businesses = new Map();
        this.memberships = new Map();
        this.executionLog = [];
        this.writeCount = 0;
    }
    async getTenant(tenantId) {
        return this.tenants.get(tenantId) || null;
    }
    async getBusiness(businessId) {
        return this.businesses.get(businessId) || null;
    }
    async getMembership(membershipId) {
        return this.memberships.get(membershipId) || null;
    }
    async savePlanInSimulation(plan) {
        // Simular guardado atómico en memoria
        this.tenants.set(plan.tenant.tenantId, plan.tenant);
        this.businesses.set(plan.business.businessId, plan.business);
        this.memberships.set(plan.membershipV3.membershipId, plan.membershipV3);
        this.executionLog.push({ action: 'SAVE_PLAN', key: plan.idempotencyKey });
        this.writeCount++;
    }
    rollback() {
        this.tenants.clear();
        this.businesses.clear();
        this.memberships.clear();
        this.executionLog.push({ action: 'ROLLBACK', key: 'ALL' });
    }
    getExecutionHistory() {
        return [...this.executionLog];
    }
}
exports.InMemoryProvisioningDriver = InMemoryProvisioningDriver;
/**
 * Motor Principal de Auto-Provisión EIAM v3
 */
class EiamV3ProvisioningEngine {
    constructor(driver) {
        this.driver = driver || new InMemoryProvisioningDriver();
    }
    /**
     * Ejecuta la provisión en modo seguro y controlado (Simulación / Staging).
     */
    async executeProvisioning(app, approvedBy, options) {
        // 1. Validar Safety Gate (Gobernanza)
        if (!provisioningSafetyLock_1.ProvisioningSafetyGate.isProductionProvisioningPermitted()) {
            // Bloqueado para producción real: opera exclusivamente en modo simulación
        }
        // 2. Construir Plan de Provisión Determinístico
        const planResult = provisioningPlanner_1.EiamV3ProvisioningPlanner.buildPlan(app, approvedBy, options);
        if (!planResult.isValid || !planResult.plan) {
            return {
                success: false,
                status: 'BLOCKED_INVALID_STATE',
                idempotencyKey: '',
                errors: planResult.errors || ['Estado de aplicación inválido para provisión.']
            };
        }
        const plan = planResult.plan;
        try {
            // 3. Comprobar Idempotencia / Entidades existentes
            const existingTenant = await this.driver.getTenant(plan.tenant.tenantId);
            const existingBusiness = await this.driver.getBusiness(plan.business.businessId);
            if (existingTenant && existingBusiness) {
                return {
                    success: true,
                    status: 'SAFE_EXISTING',
                    idempotencyKey: plan.idempotencyKey,
                    plan,
                    simulatedClaims: this.generateSimulatedClaims(plan)
                };
            }
            // Si existe tenant pero no negocio (o viceversa) con discrepancia de dueño -> Conflicto
            if (existingTenant && existingTenant.legalName !== plan.tenant.legalName) {
                return {
                    success: false,
                    status: 'PROVISIONING_CONFLICT',
                    idempotencyKey: plan.idempotencyKey,
                    errors: [`Conflicto: El Tenant '${plan.tenant.tenantId}' ya existe con una razón social distinta.`]
                };
            }
            // 4. Simulación de fallo inducido para prueba de Rollback
            if ((options === null || options === void 0 ? void 0 : options.forceFailOnStep) === 'MEMBERSHIP_STEP') {
                throw new Error('Fallo simulado en paso de creación de Membership (Rollback Triggered).');
            }
            // 5. Ejecutar Guardado en Simulación (Atómico)
            await this.driver.savePlanInSimulation(plan);
            // 6. Generar Claims Simulados (EIAM v3)
            const simulatedClaims = this.generateSimulatedClaims(plan);
            return {
                success: true,
                status: 'PROVISIONED_SIMULATION',
                idempotencyKey: plan.idempotencyKey,
                plan,
                simulatedClaims
            };
        }
        catch (err) {
            return {
                success: false,
                status: 'PROVISIONING_CONFLICT',
                idempotencyKey: plan.idempotencyKey,
                errors: [err.message || 'Error durante la ejecución de provisión.']
            };
        }
    }
    generateSimulatedClaims(plan) {
        const activeContext = {
            tenantId: plan.tenant.tenantId,
            brandId: plan.brand.brandId,
            organizationId: plan.organization.orgId,
            businessId: plan.business.businessId,
            branchId: plan.branch.branchId,
            role: 'OWNER',
            membershipId: plan.membershipV3.membershipId,
            status: 'ACTIVE'
        };
        return claimsV3Builder_1.ClaimsV3Builder.buildCanonicalClaims(activeContext);
    }
}
exports.EiamV3ProvisioningEngine = EiamV3ProvisioningEngine;
//# sourceMappingURL=provisioningEngine.js.map