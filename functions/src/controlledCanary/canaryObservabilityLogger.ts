/**
 * ══════════════════════════════════════════════════════════════════════════════
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.9
 * CANARY OBSERVABILITY & SECRET SCRUBBING LOGGER
 *
 * PURPOSE: 16 canonical event types for tracking controlled canary execution.
 *          Automatic secret scrubbing prevents any credentials, tokens, or JWTs
 *          from entering audit streams.
 *
 * GOVERNANCE: Pure in-memory logging. Zero unauthorized telemetry leaks.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type {
  CanaryObservabilityEvent,
  CanaryObservabilityEventType,
  CanaryTrafficContext,
} from './canaryModels';

const FORBIDDEN_SECRET_PATTERNS = [
  /password/i,
  /bearer\s+[a-z0-9\-_\.]+/i,
  /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+/i, // JWT pattern
  /private[_-]?key/i,
  /api[_-]?key/i,
  /secret/i,
  /credential/i,
];

export class CanaryObservabilityLogger {
  private static readonly events: CanaryObservabilityEvent[] = [];
  private static readonly trafficLogs: CanaryTrafficContext[] = [];

  /**
   * Logs an observability event with automated secret scrubbing.
   */
  static log(
    type: CanaryObservabilityEventType,
    reason: string,
    details?: {
      tenantId?: string;
      brandId?: string;
      candidateId?: string;
      requestId?: string;
      module?: string;
      role?: string;
      decision?: string;
    }
  ): CanaryObservabilityEvent {
    this.assertNoSecrets(reason);
    if (details) {
      for (const val of Object.values(details)) {
        if (typeof val === 'string') {
          this.assertNoSecrets(val);
        }
      }
    }

    const event: CanaryObservabilityEvent = {
      eventId: `canary-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      tenantId: details?.tenantId,
      brandId: details?.brandId,
      candidateId: details?.candidateId,
      requestId: details?.requestId,
      module: details?.module,
      role: details?.role,
      decision: details?.decision,
      reason,
      timestamp: Date.now(),
    };

    this.events.push(event);
    return event;
  }

  /**
   * Logs canary traffic context tagging.
   */
  static logTraffic(ctx: CanaryTrafficContext): void {
    this.assertNoSecrets(ctx.scope);
    this.trafficLogs.push(ctx);
  }

  /**
   * Asserts that a text content contains zero secrets.
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

  static getEvents(): CanaryObservabilityEvent[] {
    return [...this.events];
  }

  static getTrafficLogs(): CanaryTrafficContext[] {
    return [...this.trafficLogs];
  }

  static clear(): void {
    this.events.length = 0;
    this.trafficLogs.length = 0;
  }
}
