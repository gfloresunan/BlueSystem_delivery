/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TENANT LIFECYCLE STATE MACHINE (FASE 2D.4 / C2D.4)
 * Pure Deterministic State Machine & Lifecycle Operations
 * 
 * ZERO MUTATION / PURE IN-MEMORY SIMULATION
 */

import { TenantLifecycleState, LifecycleTransitionResult } from './models';

/**
 * Matriz canónica de transiciones legales de ciclo de vida de un Tenant:
 * 
 * PROVISIONING -> ACTIVE, CANCELLED
 * ACTIVE        -> SUSPENDED, CANCELLED
 * SUSPENDED     -> ACTIVE, CANCELLED, ARCHIVED
 * CANCELLED     -> ARCHIVED
 * ARCHIVED      -> (Terminal, ninguna transición permitida)
 */
const LEGAL_TRANSITIONS: Record<TenantLifecycleState, ReadonlyArray<TenantLifecycleState>> = Object.freeze({
  PROVISIONING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED', 'ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [] // Terminal
});

export class TenantLifecycleStateMachine {
  /**
   * Evalúa si una transición entre dos estados de ciclo de vida es válida.
   */
  static evaluateTransition(
    fromState: TenantLifecycleState,
    toState: TenantLifecycleState
  ): LifecycleTransitionResult {
    // 1. Identidad: transición al mismo estado es idempotente pero no es un cambio de estado
    if (fromState === toState) {
      return {
        allowed: true,
        fromState,
        toState,
        reason: 'IDEMPOTENT_NOOP'
      };
    }

    // 2. Validar contra la matriz de transiciones legales
    const allowedNextStates = LEGAL_TRANSITIONS[fromState];
    if (!allowedNextStates || !allowedNextStates.includes(toState)) {
      return {
        allowed: false,
        fromState,
        toState,
        reason: `LIFECYCLE_TRANSITION_DENIED: Cannot transition from ${fromState} to ${toState}`
      };
    }

    return {
      allowed: true,
      fromState,
      toState,
      reason: 'VALID_TRANSITION'
    };
  }

  /**
   * Operación pura: Aprovisionar (Crea en estado PROVISIONING)
   */
  static provision(): { state: TenantLifecycleState; result: LifecycleTransitionResult } {
    return {
      state: 'PROVISIONING',
      result: {
        allowed: true,
        fromState: 'PROVISIONING',
        toState: 'PROVISIONING',
        reason: 'INITIAL_PROVISIONING_STATE'
      }
    };
  }

  /**
   * Operación pura: Activar Tenant (PROVISIONING -> ACTIVE o SUSPENDED -> ACTIVE)
   */
  static activate(currentState: TenantLifecycleState): { state: TenantLifecycleState; result: LifecycleTransitionResult } {
    const transition = this.evaluateTransition(currentState, 'ACTIVE');
    return {
      state: transition.allowed ? 'ACTIVE' : currentState,
      result: transition
    };
  }

  /**
   * Operación pura: Suspender Tenant (ACTIVE -> SUSPENDED)
   */
  static suspend(currentState: TenantLifecycleState): { state: TenantLifecycleState; result: LifecycleTransitionResult } {
    const transition = this.evaluateTransition(currentState, 'SUSPENDED');
    return {
      state: transition.allowed ? 'SUSPENDED' : currentState,
      result: transition
    };
  }

  /**
   * Operación pura: Reanudar Tenant (SUSPENDED -> ACTIVE)
   */
  static resume(currentState: TenantLifecycleState): { state: TenantLifecycleState; result: LifecycleTransitionResult } {
    return this.activate(currentState);
  }

  /**
   * Operación pura: Cancelar Tenant (ACTIVE/SUSPENDED/PROVISIONING -> CANCELLED)
   */
  static cancel(currentState: TenantLifecycleState): { state: TenantLifecycleState; result: LifecycleTransitionResult } {
    const transition = this.evaluateTransition(currentState, 'CANCELLED');
    return {
      state: transition.allowed ? 'CANCELLED' : currentState,
      result: transition
    };
  }

  /**
   * Operación pura: Archivar Tenant (CANCELLED/SUSPENDED -> ARCHIVED)
   */
  static archive(currentState: TenantLifecycleState): { state: TenantLifecycleState; result: LifecycleTransitionResult } {
    const transition = this.evaluateTransition(currentState, 'ARCHIVED');
    return {
      state: transition.allowed ? 'ARCHIVED' : currentState,
      result: transition
    };
  }
}
