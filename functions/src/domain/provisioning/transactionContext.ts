/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TRANSACTION CONTEXT & COMPENSATION ENGINE (FASE 2D.4 / C2D.4)
 * Simulated Transaction Context, Rollback Stack, and Zero-Residual Compensation Engine
 * 
 * ZERO MUTATION / PURE IN-MEMORY SIMULATION
 */

import { ProvisioningRepositories } from './repositories';
import { ProvisioningAuditEvent, ProvisioningAuditStatus, FailureInjectionStep } from './models';

export type CompensationAction = () => Promise<void>;

export interface CompensationRecord {
  step: string;
  entityType: 'TENANT' | 'BRAND' | 'BUSINESS' | 'BRANCH' | 'SUBSCRIPTION' | 'MEMBERSHIP' | 'OTHER';
  entityId: string;
  action: CompensationAction;
  description: string;
}

export class ProvisioningTransactionContext {
  readonly requestId: string;
  readonly idempotencyKey: string;
  readonly tenantId: string;
  readonly failureInjection: FailureInjectionStep;
  private compensationStack: CompensationRecord[] = [];
  private auditEvents: ProvisioningAuditEvent[] = [];
  private createdEntityTracker: {
    tenants: string[];
    brands: string[];
    businesses: string[];
    branches: string[];
    subscriptions: string[];
    memberships: string[];
  } = {
    tenants: [],
    brands: [],
    businesses: [],
    branches: [],
    subscriptions: [],
    memberships: []
  };

  constructor(
    requestId: string,
    idempotencyKey: string,
    tenantId: string,
    failureInjection: FailureInjectionStep = 'NONE'
  ) {
    this.requestId = requestId;
    this.idempotencyKey = idempotencyKey;
    this.tenantId = tenantId;
    this.failureInjection = failureInjection;
  }

  pushCompensation(record: CompensationRecord): void {
    this.compensationStack.push(record);
  }

  getCompensationStack(): ReadonlyArray<CompensationRecord> {
    return [...this.compensationStack];
  }

  recordCreatedEntity(
    type: 'TENANT' | 'BRAND' | 'BUSINESS' | 'BRANCH' | 'SUBSCRIPTION' | 'MEMBERSHIP',
    id: string
  ): void {
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

  getCreatedEntityCount(): number {
    return (
      this.createdEntityTracker.tenants.length +
      this.createdEntityTracker.brands.length +
      this.createdEntityTracker.businesses.length +
      this.createdEntityTracker.branches.length +
      this.createdEntityTracker.subscriptions.length +
      this.createdEntityTracker.memberships.length
    );
  }

  recordAudit(
    operation: string,
    step: string,
    status: ProvisioningAuditStatus,
    reason?: string,
    details?: Record<string, any>
  ): ProvisioningAuditEvent {
    const event: ProvisioningAuditEvent = {
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

  getAuditTrail(): ProvisioningAuditEvent[] {
    return [...this.auditEvents];
  }

  shouldInjectFailure(step: FailureInjectionStep): boolean {
    return this.failureInjection === step;
  }
}

export class CompensationEngine {
  /**
   * Ejecuta el stack de compensación en orden inverso (LIFO) y valida que no quede estado residual.
   */
  static async executeCompensation(
    context: ProvisioningTransactionContext,
    repos: ProvisioningRepositories
  ): Promise<{ compensatedCount: number; errors: string[] }> {
    const stack = [...context.getCompensationStack()];
    let compensatedCount = 0;
    const errors: string[] = [];

    context.recordAudit('COMPENSATION', 'COMPENSATION_STARTED', 'SUCCESS', `Starting rollback of ${stack.length} steps`);

    // Invertir el stack para compensar en orden LIFO
    stack.reverse();

    for (const record of stack) {
      try {
        await record.action();
        compensatedCount++;
        context.recordAudit(
          'COMPENSATION',
          record.step,
          'REVERTED',
          `Compensated ${record.entityType}: ${record.entityId}`
        );
      } catch (err: any) {
        const errorMsg = `Compensation failed for ${record.entityType} (${record.entityId}): ${err.message || err}`;
        errors.push(errorMsg);
        context.recordAudit('COMPENSATION', record.step, 'FAILED', errorMsg);
      }
    }

    context.recordAudit(
      'COMPENSATION',
      'COMPENSATION_COMPLETED',
      errors.length === 0 ? 'SUCCESS' : 'FAILED',
      `Rollback complete. Compensated ${compensatedCount}/${stack.length} operations.`
    );

    return { compensatedCount, errors };
  }
}
