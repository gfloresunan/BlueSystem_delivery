/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.8
 * ACTIVATION OBSERVABILITY LOGGER
 *
 * PURPOSE: 13 canonical observability events for activation lifecycle tracking.
 *          Strict secret scrubbing prevents credential or PII leakage.
 *
 * GOVERNANCE: Pure in-memory event emitter. Zero production logging integrations.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ActivationObservabilityEvent,
  ActivationObservabilityEventType,
} from './activationModels';

const FORBIDDEN_SECRET_PATTERNS = [
  /password/i,
  /bearer\s+[a-z0-9\-_\.]+/i,
  /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+/i, // JWT pattern
  /private[_-]?key/i,
  /api[_-]?key/i,
  /secret/i,
  /service_account/i,
];

export class ActivationObservabilityLogger {
  private static readonly eventStore: ActivationObservabilityEvent[] = [];

  /**
   * Logs a structured activation observability event after scrubbing for secrets.
   */
  static log(
    type: ActivationObservabilityEventType,
    reason: string,
    details?: {
      tenantId?: string;
      brandId?: string;
      candidateId?: string;
      module?: string;
      role?: string;
      decision?: string;
    }
  ): ActivationObservabilityEvent {
    this.assertNoSecrets(reason);
    if (details) {
      for (const val of Object.values(details)) {
        if (typeof val === 'string') {
          this.assertNoSecrets(val);
        }
      }
    }

    const event: ActivationObservabilityEvent = {
      eventId: `act-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      tenantId: details?.tenantId,
      brandId: details?.brandId,
      candidateId: details?.candidateId,
      module: details?.module,
      role: details?.role,
      decision: details?.decision,
      reason,
      timestamp: Date.now(),
    };

    this.eventStore.push(event);
    return event;
  }

  /**
   * Asserts that a text string does not match any forbidden credential/secret pattern.
   */
  static assertNoSecrets(content: string): void {
    for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
      if (pattern.test(content)) {
        throw new Error(
          `OBSERVABILITY_SECURITY_VIOLATION: Event content contains forbidden secret pattern "${pattern.source}"`
        );
      }
    }
  }

  static getEvents(): ActivationObservabilityEvent[] {
    return [...this.eventStore];
  }

  static getEventsByType(type: ActivationObservabilityEventType): ActivationObservabilityEvent[] {
    return this.eventStore.filter(e => e.type === type);
  }

  static clear(): void {
    this.eventStore.length = 0;
  }
}
