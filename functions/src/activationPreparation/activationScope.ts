/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION SCOPE ENFORCER
 *
 * PURPOSE: Validates that no out-of-scope operation is attempted during the
 *          controlled activation preparation. Enforces MINIMUM VIABLE ACTIVATION
 *          SCOPE and prevents accidental scope expansion.
 *
 * GOVERNANCE: Any out-of-scope operation → BLOCKED + GOVERNANCE_VIOLATION
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ActivationScopeDefinition,
  ActivationIncludedItem,
  ActivationExcludedItem,
  GovernanceViolation,
} from './activationModels';

// ─── MINIMUM VIABLE ACTIVATION SCOPE ─────────────────────────────────────────

export const MINIMUM_VIABLE_ACTIVATION_SCOPE: ActivationScopeDefinition = {
  included: [
    'CORE_BACKEND',
    'TENANT',
    'BRAND',
    'BUSINESS',
    'BRANCH',
    'SUBSCRIPTION',
    'ENTITLEMENTS',
    'MEMBERSHIP',
    'GATEKEEPER',
    'WEB_EXPERIENCE',
    'ANDROID_EXPERIENCE',
    'INITIAL_CONFIGURATION',
  ] as ActivationIncludedItem[],
  explicitlyExcluded: [
    'ADDITIONAL_TENANTS',
    'ADDITIONAL_BRANDS',
    'ADDITIONAL_USERS',
    'BULK_PROVISIONING',
    'MIGRATION',
    'MASS_CLAIMS_ROLLOUT',
    'GENERAL_CANARY',
    'MARKETPLACE_WIDE_ACTIVATION',
  ] as ActivationExcludedItem[],
  minimumViableScope: true,
};

// ─── Scope Validator ──────────────────────────────────────────────────────────

export interface ScopeValidationResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly violation?: GovernanceViolation;
}

export class ActivationScopeValidator {
  private readonly scope: ActivationScopeDefinition;

  constructor(scope: ActivationScopeDefinition = MINIMUM_VIABLE_ACTIVATION_SCOPE) {
    this.scope = scope;
  }

  isIncluded(operation: string): boolean {
    return this.scope.included.includes(operation as ActivationIncludedItem);
  }

  isExplicitlyExcluded(operation: string): boolean {
    return this.scope.explicitlyExcluded.includes(operation as ActivationExcludedItem);
  }

  validate(operation: string): ScopeValidationResult {
    if (this.isExplicitlyExcluded(operation)) {
      const violation: GovernanceViolation = {
        violationType: 'UNEXPECTED_SDK_INVOCATION',
        severity: 'CRITICAL',
        detectedAt: Date.now(),
        details: `Operation "${operation}" is EXPLICITLY EXCLUDED from the first activation scope`,
        blockedOperation: operation,
      };
      return {
        allowed: false,
        reason: `SCOPE_VIOLATION: "${operation}" is explicitly excluded from MINIMUM_VIABLE_ACTIVATION_SCOPE`,
        violation,
      };
    }

    if (!this.isIncluded(operation)) {
      return {
        allowed: false,
        reason: `SCOPE_UNRECOGNIZED: "${operation}" is not in the defined activation scope`,
      };
    }

    return {
      allowed: true,
      reason: `"${operation}" is within MINIMUM_VIABLE_ACTIVATION_SCOPE`,
    };
  }

  /**
   * Validates that the scope is truly minimum viable — no scope creep.
   * Returns false if scope contains items beyond MINIMUM_VIABLE_ACTIVATION_SCOPE.
   */
  validateNoScopeCreep(): boolean {
    const allowedItems = new Set(MINIMUM_VIABLE_ACTIVATION_SCOPE.included);
    return this.scope.included.every(item => allowedItems.has(item));
  }

  /**
   * Returns a summary of what is and is NOT in scope.
   */
  getScopeSummary(): {
    included: ActivationIncludedItem[];
    excluded: ActivationExcludedItem[];
    minimumViable: boolean;
  } {
    return {
      included: [...this.scope.included],
      excluded: [...this.scope.explicitlyExcluded],
      minimumViable: this.scope.minimumViableScope,
    };
  }
}

// ─── Static Scope Guards (no instance needed) ─────────────────────────────────

const _defaultValidator = new ActivationScopeValidator();

export function isOperationInScope(operation: string): boolean {
  return _defaultValidator.isIncluded(operation);
}

export function isOperationExcluded(operation: string): boolean {
  return _defaultValidator.isExplicitlyExcluded(operation);
}

export function validateScopeOperation(operation: string): ScopeValidationResult {
  return _defaultValidator.validate(operation);
}
