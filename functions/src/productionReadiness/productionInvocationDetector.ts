/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D.7 PRODUCTION READINESS CERTIFICATION
 * Production Invocation Detector
 *
 * PURPOSE: Intercepts and registers any attempt to call production SDKs.
 * Any invocation count > 0 is a CRITICAL NO-GO condition.
 *
 * MODE: LOCAL / IN-MEMORY / SIMULATED / ZERO-PRODUCTION
 */

export interface ProductionInvocationRecord {
  service: string;
  method: string;
  timestamp: number;
  callStack?: string;
  blocked: boolean;
}

export class ProductionInvocationDetector {
  private static _invocations: ProductionInvocationRecord[] = [];
  private static _isActive: boolean = true;

  // ─── Tracked services ───────────────────────────────────────────────────────
  static readonly TRACKED_SERVICES = [
    'Firestore.production',
    'FirebaseAuth.production',
    'ClaimsService.production',
    'ProvisioningService.production',
    'RulesDeployment',
    'HostingDeployment',
    'FunctionsDeployment',
    'RoomMigration',
    'StorageProduction',
    'FCMProduction',
  ] as const;

  /**
   * Records an attempt to call a production service.
   * Always blocks in certification mode and records the attempt.
   */
  static recordAttempt(service: string, method: string): never {
    const record: ProductionInvocationRecord = {
      service,
      method,
      timestamp: Date.now(),
      callStack: new Error().stack,
      blocked: true,
    };
    this._invocations.push(record);
    throw new Error(
      `🚨 PRODUCTION_INVOCATION_BLOCKED: Attempted call to [${service}.${method}] ` +
      `during C2D.7 Production Readiness Certification. ` +
      `All production SDK calls are FORBIDDEN in this phase. ` +
      `STATUS: NO-GO`
    );
  }

  /** Returns total count of production invocation attempts. */
  static getTotalInvocations(): number {
    return this._invocations.length;
  }

  /** Returns all recorded invocations. */
  static getInvocationLog(): ReadonlyArray<ProductionInvocationRecord> {
    return [...this._invocations];
  }

  /** Returns whether any production SDK was called. */
  static hasViolations(): boolean {
    return this._invocations.length > 0;
  }

  /**
   * Verifies the zero-invocation invariant.
   * Throws if any production service was called.
   */
  static assertZeroInvocations(): void {
    if (this._invocations.length > 0) {
      const summary = this._invocations.map(
        i => `  - [${i.service}.${i.method}] at ${new Date(i.timestamp).toISOString()}`
      ).join('\n');
      throw new Error(
        `PRODUCTION_INVOCATION_AUDIT_FAILURE: ${this._invocations.length} production ` +
        `SDK invocation(s) detected during C2D.7.\nLog:\n${summary}\nSTATUS: NO-GO`
      );
    }
  }

  /** Resets detector state for test isolation. */
  static reset(): void {
    this._invocations = [];
  }

  /** Builds the zero-production audit report. */
  static buildAuditReport(): {
    totalAttempts: number;
    hasViolations: boolean;
    status: 'PASS' | 'NO-GO';
    log: ReadonlyArray<ProductionInvocationRecord>;
  } {
    return {
      totalAttempts: this._invocations.length,
      hasViolations: this._invocations.length > 0,
      status: this._invocations.length === 0 ? 'PASS' : 'NO-GO',
      log: this.getInvocationLog(),
    };
  }
}

/**
 * Simulated production service stubs — all throw via ProductionInvocationDetector.
 * These simulate what would happen if production SDKs were mistakenly imported.
 */
export const SimulatedProductionFirestore = {
  collection: (_path: string) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'collection'),
  doc: (_path: string) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'doc'),
  add: (_data: unknown) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'add'),
  set: (_data: unknown) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'set'),
  update: (_data: unknown) => ProductionInvocationDetector.recordAttempt('Firestore.production', 'update'),
  delete: () => ProductionInvocationDetector.recordAttempt('Firestore.production', 'delete'),
};

export const SimulatedProductionAuth = {
  createUser: (_data: unknown) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'createUser'),
  deleteUser: (_uid: string) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'deleteUser'),
  updateUser: (_data: unknown) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'updateUser'),
  setCustomUserClaims: (_uid: string, _claims: unknown) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'setCustomUserClaims'),
  revokeRefreshTokens: (_uid: string) => ProductionInvocationDetector.recordAttempt('FirebaseAuth.production', 'revokeRefreshTokens'),
};

export const SimulatedClaimsService = {
  issue: (_claims: unknown) => ProductionInvocationDetector.recordAttempt('ClaimsService.production', 'issue'),
  revoke: (_uid: string) => ProductionInvocationDetector.recordAttempt('ClaimsService.production', 'revoke'),
  mutate: (_uid: string, _data: unknown) => ProductionInvocationDetector.recordAttempt('ClaimsService.production', 'mutate'),
};

export const SimulatedProvisioningService = {
  provision: (_request: unknown) => ProductionInvocationDetector.recordAttempt('ProvisioningService.production', 'provision'),
  deprovision: (_tenantId: string) => ProductionInvocationDetector.recordAttempt('ProvisioningService.production', 'deprovision'),
};

export const SimulatedRulesDeployment = {
  deploy: () => ProductionInvocationDetector.recordAttempt('RulesDeployment', 'deploy'),
  publish: () => ProductionInvocationDetector.recordAttempt('RulesDeployment', 'publish'),
};

export const SimulatedHostingDeployment = {
  deploy: () => ProductionInvocationDetector.recordAttempt('HostingDeployment', 'deploy'),
  release: () => ProductionInvocationDetector.recordAttempt('HostingDeployment', 'release'),
};

export const SimulatedRoomMigration = {
  migrate: () => ProductionInvocationDetector.recordAttempt('RoomMigration', 'migrate'),
  runMigration: () => ProductionInvocationDetector.recordAttempt('RoomMigration', 'runMigration'),
};
