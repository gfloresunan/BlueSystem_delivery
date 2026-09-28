/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — SESSION & TENANT SWITCH MANAGER (FASE 2D.5 / C2D.5)
 * Pure Deterministic Session Switch Simulation & Cache Isolation Controller
 * 
 * ZERO RESIDUAL MEMORY / ZERO CROSS-TENANT CONTAMINATION
 */

import { TenantEntity, BrandEntity, SubscriptionEntity } from '../platform/models';
import { MembershipV3Entity } from '../identity/models';
import { ClientExperienceResolver } from './clientExperienceResolver';
import { ClientExperienceSnapshot } from './models';
import { InitialTenantConfiguration } from '../provisioning/models';

export interface UserSessionContext {
  tenant: TenantEntity;
  brand: BrandEntity;
  subscription: SubscriptionEntity;
  membership: MembershipV3Entity;
  initialConfig?: InitialTenantConfiguration;
}

export class SessionSwitchManager {
  private activeSnapshot: ClientExperienceSnapshot | null = null;
  private switchHistory: { fromTenantId: string | null; toTenantId: string; timestamp: number }[] = [];

  /**
   * Carga una nueva sesión de Tenant/Brand, purgando instantáneamente cualquier estado previo.
   */
  switchSession(session: UserSessionContext, now: number = Date.now()): ClientExperienceSnapshot {
    const previousTenantId = this.activeSnapshot ? this.activeSnapshot.tenantId : null;

    // 1. Purga atómica de estado anterior
    this.activeSnapshot = null;

    // 2. Síntesis de nueva instantánea
    const newSnapshot = ClientExperienceResolver.resolveSnapshot(
      session.tenant,
      session.brand,
      session.subscription,
      session.membership,
      session.initialConfig,
      now
    );

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
  getActiveSnapshot(): ClientExperienceSnapshot | null {
    return this.activeSnapshot ? JSON.parse(JSON.stringify(this.activeSnapshot)) : null;
  }

  /**
   * Limpia y cierra la sesión completamente.
   */
  clearSession(): void {
    this.activeSnapshot = null;
  }

  /**
   * Retorna el historial de cambios de sesión.
   */
  getSwitchHistory(): ReadonlyArray<{ fromTenantId: string | null; toTenantId: string; timestamp: number }> {
    return [...this.switchHistory];
  }
}
