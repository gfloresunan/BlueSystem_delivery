/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Claims Simulation Engine
 * 
 * Orquestador de simulación integral que ejecuta el pipeline completo:
 * DualReadResolver -> ActiveContextDeriver -> ClaimsV3Builder -> ClaimsV3Validator -> ClaimsSizeGuard.
 * Estrictamente en modo simulación (Zero Auth Mutation).
 */

import {
  ActiveTenantContext,
  CanonicalCustomClaimsV3
} from './models';
import {
  DualReadMembershipResolver,
  DualReadResolutionResult
} from './dualReadResolver';
import { ActiveContextDeriver } from './activeContextDeriver';
import { ClaimsV3Builder } from './claimsV3Builder';
import { ClaimsV3Validator } from './claimsV3Validator';
import { ClaimsSizeGuard, ClaimsSizeEvaluation } from './claimsSizeGuard';
import { AuthSafetyGate } from './authSafetyGate';

export interface ClaimsSimulationResult {
  success: boolean;
  resolutionResult: DualReadResolutionResult;
  context: ActiveTenantContext | null;
  claims: CanonicalCustomClaimsV3 | null;
  byteSize: number;
  sizeEvaluation: ClaimsSizeEvaluation | null;
  errors: string[];
  warnings: string[];
  mutationAttempted: boolean;
}

export class ClaimsSimulationEngine {

  constructor(private resolver: DualReadMembershipResolver) {}

  /**
   * Simula la derivación completa de claims para un UID y membershipId
   */
  async simulateForMembership(requestedUid: string, membershipId: string): Promise<ClaimsSimulationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Ejecutar Dual-Read Resolver
    const resolution = await this.resolver.resolveByMembershipId(requestedUid, membershipId);
    if (resolution.status !== 'RESOLVED_V3' && resolution.status !== 'RESOLVED_LEGACY') {
      errors.push(`Resolución de membresía no exitosa: ${resolution.status}. ${resolution.errorDetail || ''}`);
      return {
        success: false,
        resolutionResult: resolution,
        context: null,
        claims: null,
        byteSize: 0,
        sizeEvaluation: null,
        errors,
        warnings,
        mutationAttempted: false
      };
    }

    // 2. Derivar Active Context
    const contextDerivation = ActiveContextDeriver.deriveFromResolutionResult(resolution);
    if (!contextDerivation.success || !contextDerivation.context) {
      errors.push(`Fallo en derivación de contexto activo: ${contextDerivation.errorDetail || 'Error desconocido'}`);
      return {
        success: false,
        resolutionResult: resolution,
        context: null,
        claims: null,
        byteSize: 0,
        sizeEvaluation: null,
        errors,
        warnings,
        mutationAttempted: false
      };
    }

    const context = contextDerivation.context;

    // 3. Construir Claims V3
    const claims = ClaimsV3Builder.buildCanonicalClaims(context);

    // 4. Validar Claims V3
    const valResult = ClaimsV3Validator.validate(claims);
    if (!valResult.isValid) {
      errors.push(...valResult.errors);
      return {
        success: false,
        resolutionResult: resolution,
        context,
        claims: null,
        byteSize: 0,
        sizeEvaluation: null,
        errors,
        warnings,
        mutationAttempted: false
      };
    }

    // 5. Evaluar Tamaño en Bytes (Claims Size Guard)
    const sizeEval = ClaimsSizeGuard.evaluate(claims);
    if (!sizeEval.isValid) {
      errors.push(sizeEval.message);
      return {
        success: false,
        resolutionResult: resolution,
        context,
        claims: null,
        byteSize: sizeEval.byteSize,
        sizeEvaluation: sizeEval,
        errors,
        warnings,
        mutationAttempted: false
      };
    }

    if (sizeEval.status === 'PASS_WITH_WARNING') {
      warnings.push(sizeEval.message);
    }

    // 6. Confirmar Auth Safety Gate
    const gateway = AuthSafetyGate.getGateway();
    if (gateway.isMutationEnabled()) {
      errors.push("Violación de Seguridad: El gateway de mutación de Auth no está bloqueado.");
      return {
        success: false,
        resolutionResult: resolution,
        context,
        claims,
        byteSize: sizeEval.byteSize,
        sizeEvaluation: sizeEval,
        errors,
        warnings,
        mutationAttempted: true
      };
    }

    return {
      success: true,
      resolutionResult: resolution,
      context,
      claims,
      byteSize: sizeEval.byteSize,
      sizeEvaluation: sizeEval,
      errors,
      warnings,
      mutationAttempted: false
    };
  }
}
