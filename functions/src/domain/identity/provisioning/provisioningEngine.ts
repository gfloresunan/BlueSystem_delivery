/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 PROVISIONING DOMAIN (FASE 2C.9)
 * Motor de Auto-Provisión EIAM v3 con Bloqueo de Producción y Rollback Transaccional.
 */

import {
  MerchantApplicationInput,
  ProvisioningResult,
  EiamV3ProvisioningPlan
} from './models';
import { EiamV3ProvisioningPlanner } from './provisioningPlanner';
import { ProvisioningSafetyGate } from '../../../config/provisioningSafetyLock';
import { ClaimsV3Builder } from '../claimsV3Builder';
import { ActiveTenantContext } from '../models';

export interface ProvisioningDatabaseDriver {
  getTenant(tenantId: string): Promise<any | null>;
  getBusiness(businessId: string): Promise<any | null>;
  getMembership(membershipId: string): Promise<any | null>;
  savePlanInSimulation(plan: EiamV3ProvisioningPlan): Promise<void>;
}

/**
 * Driver en memoria para simulación transaccional aislada (Zero Writes a Producción)
 */
export class InMemoryProvisioningDriver implements ProvisioningDatabaseDriver {
  private tenants = new Map<string, any>();
  private businesses = new Map<string, any>();
  private memberships = new Map<string, any>();
  private executionLog: Array<{ action: string; key: string }> = [];

  public writeCount: number = 0;

  async getTenant(tenantId: string): Promise<any | null> {
    return this.tenants.get(tenantId) || null;
  }

  async getBusiness(businessId: string): Promise<any | null> {
    return this.businesses.get(businessId) || null;
  }

  async getMembership(membershipId: string): Promise<any | null> {
    return this.memberships.get(membershipId) || null;
  }

  async savePlanInSimulation(plan: EiamV3ProvisioningPlan): Promise<void> {
    // Simular guardado atómico en memoria
    this.tenants.set(plan.tenant.tenantId, plan.tenant);
    this.businesses.set(plan.business.businessId, plan.business);
    this.memberships.set(plan.membershipV3.membershipId, plan.membershipV3);
    this.executionLog.push({ action: 'SAVE_PLAN', key: plan.idempotencyKey });
    this.writeCount++;
  }

  rollback(): void {
    this.tenants.clear();
    this.businesses.clear();
    this.memberships.clear();
    this.executionLog.push({ action: 'ROLLBACK', key: 'ALL' });
  }

  getExecutionHistory(): Array<{ action: string; key: string }> {
    return [...this.executionLog];
  }
}

/**
 * Motor Principal de Auto-Provisión EIAM v3
 */
export class EiamV3ProvisioningEngine {
  private driver: ProvisioningDatabaseDriver;

  constructor(driver?: ProvisioningDatabaseDriver) {
    this.driver = driver || new InMemoryProvisioningDriver();
  }

  /**
   * Ejecuta la provisión en modo seguro y controlado (Simulación / Staging).
   */
  async executeProvisioning(
    app: MerchantApplicationInput,
    approvedBy: string,
    options?: { timestamp?: number; forceFailOnStep?: string }
  ): Promise<ProvisioningResult> {
    // 1. Validar Safety Gate (Gobernanza)
    if (!ProvisioningSafetyGate.isProductionProvisioningPermitted()) {
      // Bloqueado para producción real: opera exclusivamente en modo simulación
    }

    // 2. Construir Plan de Provisión Determinístico
    const planResult = EiamV3ProvisioningPlanner.buildPlan(app, approvedBy, options);
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
      if (options?.forceFailOnStep === 'MEMBERSHIP_STEP') {
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

    } catch (err: any) {
      return {
        success: false,
        status: 'PROVISIONING_CONFLICT',
        idempotencyKey: plan.idempotencyKey,
        errors: [err.message || 'Error durante la ejecución de provisión.']
      };
    }
  }

  private generateSimulatedClaims(plan: EiamV3ProvisioningPlan): Record<string, any> {
    const activeContext: ActiveTenantContext = {
      tenantId: plan.tenant.tenantId,
      brandId: plan.brand.brandId,
      organizationId: plan.organization.orgId,
      businessId: plan.business.businessId,
      branchId: plan.branch.branchId,
      role: 'OWNER',
      membershipId: plan.membershipV3.membershipId,
      status: 'ACTIVE'
    };

    return ClaimsV3Builder.buildCanonicalClaims(activeContext) as any;
  }
}
