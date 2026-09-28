/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Auth Safety Gate & Mutation Barrier
 * 
 * Barrera arquitectónica infranqueable que garantiza CERO mutaciones accidentales en Firebase Auth.
 * Modo obligatorio: DISABLED.
 */

export class AuthMutationBlockedError extends Error {
  constructor(message: string = 'Firebase Auth mutations are strictly DISABLED in this phase/environment.') {
    super(`[AUTH_SAFETY_GATE_BLOCKED] ${message}`);
    this.name = 'AuthMutationBlockedError';
  }
}

export interface AuthClaimsMutationGateway {
  setCustomUserClaims(uid: string, claims: object | null): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
  isMutationEnabled(): boolean;
  getAttemptedMutationsCount(): number;
}

/**
 * Gateway Deshabilitado (Barrera de Seguridad Fase 2C.4)
 * Bloquea cualquier intento de mutación y lanza un error controlado.
 */
export class DisabledAuthClaimsMutationGateway implements AuthClaimsMutationGateway {
  private attemptedMutations = 0;

  async setCustomUserClaims(uid: string, _claims: object | null): Promise<void> {
    this.attemptedMutations++;
    throw new AuthMutationBlockedError(
      `Intento de llamada a setCustomUserClaims para UID '${uid}' bloqueado por la barrera de seguridad.`
    );
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    this.attemptedMutations++;
    throw new AuthMutationBlockedError(
      `Intento de llamada a revokeRefreshTokens para UID '${uid}' bloqueado por la barrera de seguridad.`
    );
  }

  isMutationEnabled(): boolean {
    return false;
  }

  getAttemptedMutationsCount(): number {
    return this.attemptedMutations;
  }
}

/**
 * Fábrica de Gateway Seguro
 */
export class AuthSafetyGate {
  private static instance: AuthClaimsMutationGateway = new DisabledAuthClaimsMutationGateway();

  /**
   * Obtiene el gateway activo (Siempre retorna DisabledAuthClaimsMutationGateway en Fase 2C.4)
   */
  static getGateway(): AuthClaimsMutationGateway {
    return this.instance;
  }

  /**
   * Verifica si las mutaciones están habilitadas
   */
  static isMutationPermitted(): boolean {
    return false;
  }
}
