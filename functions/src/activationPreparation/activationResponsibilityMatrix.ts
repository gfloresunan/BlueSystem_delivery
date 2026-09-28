/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION RESPONSIBILITY MATRIX
 *
 * PURPOSE: Defines explicit RACI/Responsibility assignments (Owner, Approver,
 *          Executor, Observer) for all activation critical paths.
 *          Unassigned roles are strictly marked UNDEFINED (governance gaps).
 *
 * GOVERNANCE: Non-assumptive governance model. Gaps must be surfaced explicitly.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ActivationResponsibilityMatrix,
  ResponsibilityEntry,
  ResponsibilityActor,
} from './activationModels';

export class ActivationResponsibilityMatrixBuilder {
  /**
   * Constructs the formal responsibility matrix for controlled activation.
   */
  static buildMatrix(assignments?: Partial<Record<string, Partial<ResponsibilityEntry>>>): ActivationResponsibilityMatrix {
    const now = Date.now();
    const defaultEntries: ResponsibilityEntry[] = [
      {
        responsibility: 'Activation',
        owner: assignments?.['Activation']?.owner ?? 'LEAD_ARCHITECT',
        approver: assignments?.['Activation']?.approver ?? 'SYSTEM_OWNER',
        executor: assignments?.['Activation']?.executor ?? 'RELEASE_ENGINEER',
        observer: assignments?.['Activation']?.observer ?? 'SECURITY_AUDITOR',
      },
      {
        responsibility: 'Deployment',
        owner: assignments?.['Deployment']?.owner ?? 'DEVOPS_LEAD',
        approver: assignments?.['Deployment']?.approver ?? 'SYSTEM_OWNER',
        executor: assignments?.['Deployment']?.executor ?? 'CI_CD_SERVICE_ACTOR',
        observer: assignments?.['Deployment']?.observer ?? 'SECURITY_AUDITOR',
      },
      {
        responsibility: 'Claims',
        owner: assignments?.['Claims']?.owner ?? 'SECURITY_LEAD',
        approver: assignments?.['Claims']?.approver ?? 'SYSTEM_OWNER',
        executor: assignments?.['Claims']?.executor ?? 'CLAIMS_ENGINE_SERVICE',
        observer: assignments?.['Claims']?.observer ?? 'AUDIT_LOG_COLLECTOR',
      },
      {
        responsibility: 'Migration',
        owner: assignments?.['Migration']?.owner ?? 'DATABASE_LEAD',
        approver: assignments?.['Migration']?.approver ?? 'SYSTEM_OWNER',
        executor: assignments?.['Migration']?.executor ?? 'MIGRATION_RUNNER',
        observer: assignments?.['Migration']?.observer ?? 'DATA_AUDITOR',
      },
      {
        responsibility: 'Rollback',
        owner: assignments?.['Rollback']?.owner ?? 'INCIDENT_COMMANDER',
        approver: assignments?.['Rollback']?.approver ?? 'LEAD_ARCHITECT',
        executor: assignments?.['Rollback']?.executor ?? 'AUTOMATED_ROLLBACK_ENGINE',
        observer: assignments?.['Rollback']?.observer ?? 'ALL_STAKEHOLDERS',
      },
      {
        responsibility: 'Security',
        owner: assignments?.['Security']?.owner ?? 'SECURITY_OFFICER',
        approver: assignments?.['Security']?.approver ?? 'SYSTEM_OWNER',
        executor: assignments?.['Security']?.executor ?? 'SECURITY_AGENT',
        observer: assignments?.['Security']?.observer ?? 'COMPLIANCE_OFFICER',
      },
    ];

    const entries = defaultEntries.map(entry => {
      const custom = assignments?.[entry.responsibility];
      if (!custom) return entry;
      return {
        responsibility: entry.responsibility,
        owner: custom.owner ?? entry.owner,
        approver: custom.approver ?? entry.approver,
        executor: custom.executor ?? entry.executor,
        observer: custom.observer ?? entry.observer,
      };
    });

    const governanceGaps: string[] = [];
    for (const entry of entries) {
      const roles: Array<[string, ResponsibilityActor]> = [
        ['owner', entry.owner],
        ['approver', entry.approver],
        ['executor', entry.executor],
        ['observer', entry.observer],
      ];
      for (const [roleName, actor] of roles) {
        if (actor === 'UNDEFINED' || !actor || actor.trim().length === 0) {
          governanceGaps.push(`${entry.responsibility}.${roleName} is UNDEFINED`);
        }
      }
    }

    return {
      matrixId: `resp-matrix-${now}`,
      entries,
      governanceGaps,
      timestamp: now,
    };
  }
}
