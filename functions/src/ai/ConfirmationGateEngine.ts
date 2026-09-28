/**
 * BlueSystem Delivery Enterprise — Motor Criptográfico de Confirmación Humana (C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 *
 * Garantiza que:
 * 1. Una confirmación esté criptográficamente ligada a authUid + toolId + params + expiresAt.
 * 2. Un token de confirmación de una operación NO pueda usarse para otra operación (Anti-Tampering).
 * 3. Un token de confirmación de un usuario NO pueda usarse por otro usuario (Multi-Tenant Protection).
 * 4. Un token consumido quede invalidado inmediatamente (Anti-Replay).
 *
 * C3-GR GAP-C3G-02: AI_CONFIRMATION_SECRET es OBLIGATORIA en el entorno.
 * Si la variable no está configurada, el motor opera en FAIL-CLOSED:
 * - createPendingConfirmation() lanza excepción AI_SECRET_NOT_CONFIGURED
 * - validateConfirmationToken() retorna INVALID_TOKEN
 * NUNCA se genera un token con un secreto predecible o hardcoded.
 *
 * NOTA DE AUDITORÍA DISTRIBUIDA (GAP-C3GR-DISTRIBUTED-REPLAY):
 * El consumedTokens Set opera a nivel de instancia de proceso. En entornos con
 * múltiples instancias concurrentes de Cloud Functions, el mismo token podría
 * ser aceptado en dos instancias distintas dentro del TTL. El riesgo es bajo
 * dado el TTL de 5 minutos y el ciclo de vida de las instancias, pero debe
 * considerarse para una mitigación futura (token de uso-único en Firestore).
 * C3-D está LOCKED — esta mitigación se propone para una fase posterior.
 */

import * as crypto from "crypto";
import { PendingConfirmationPayload } from "./types";

export interface ConfirmationValidationResult {
  isValid: boolean;
  errorCode?: "EXPIRED" | "INVALID_TOKEN" | "ALREADY_CONSUMED" | "UID_MISMATCH" | "TOOL_MISMATCH";
  errorMessage?: string;
}

export class ConfirmationGateEngine {
  private static readonly consumedTokens: Set<string> = new Set();

  /**
   * Obtiene el secreto del servidor de forma segura.
   * FAIL-CLOSED: Si AI_CONFIRMATION_SECRET no está configurada, lanza excepción.
   * NUNCA retorna un secreto hardcoded o predecible.
   */
  private static getSecret(): string {
    const secret = process.env.AI_CONFIRMATION_SECRET;
    if (!secret || secret.trim().length === 0) {
      throw new Error(
        "AI_SECRET_NOT_CONFIGURED: La variable de entorno AI_CONFIRMATION_SECRET es obligatoria " +
        "y no está configurada en este entorno. El motor de confirmación opera en FAIL-CLOSED."
      );
    }
    return secret;
  }

  /**
   * Verifica si el secreto de confirmación está correctamente configurado.
   * Útil para healthchecks y tests.
   */
  public static isSecretConfigured(): boolean {
    const secret = process.env.AI_CONFIRMATION_SECRET;
    return Boolean(secret && secret.trim().length > 0);
  }

  private static hashParameters(parameters: Record<string, any>): string {
    const sortedKeys = Object.keys(parameters).sort();
    const sortedObj: Record<string, any> = {};
    sortedKeys.forEach((key) => {
      sortedObj[key] = parameters[key];
    });
    return crypto.createHash("sha256").update(JSON.stringify(sortedObj)).digest("hex");
  }

  private static generateHmacToken(authUid: string, toolId: string, paramsHash: string, expiresAt: number): string {
    const payload = `${authUid}:${toolId}:${paramsHash}:${expiresAt}`;
    // getSecret() lanza AI_SECRET_NOT_CONFIGURED si la variable no está configurada — fail-closed
    return crypto.createHmac("sha256", this.getSecret()).update(payload).digest("hex");
  }

  /**
   * Genera un paquete de confirmación pendiente vinculada criptográficamente.
   */
  public static createPendingConfirmation(
    authUid: string,
    toolId: string,
    summary: string,
    parameters: Record<string, any>,
    financialBreakdown?: {
      subtotal: number;
      deliveryFee: number;
      discount: number;
      total: number;
    },
    ttlMs: number = 300000 // 5 minutos por defecto
  ): PendingConfirmationPayload {
    const confirmationId = `conf_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const expiresAt = Date.now() + ttlMs;
    const paramsHash = this.hashParameters(parameters);
    const confirmationToken = `${expiresAt}.${paramsHash}.${this.generateHmacToken(authUid, toolId, paramsHash, expiresAt)}`;

    return {
      confirmationId,
      toolId,
      summary,
      parameters,
      confirmationToken,
      expiresAt,
      financialBreakdown,
    };
  }

  /**
   * Valida autoritativamente el token de confirmación antes de ejecutar mutaciones Level 3 / Level 4.
   * FAIL-CLOSED: Si AI_CONFIRMATION_SECRET no está configurada, retorna INVALID_TOKEN.
   */
  public static validateConfirmationToken(
    authUid: string,
    toolId: string,
    parameters: Record<string, any>,
    tokenString: string
  ): ConfirmationValidationResult {
    // Fail-closed: sin secreto configurado, ningún token puede ser válido
    if (!this.isSecretConfigured()) {
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Servicio de confirmación no disponible: secreto no configurado." };
    }

    if (!tokenString || typeof tokenString !== "string") {
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Token de confirmación ausente o malformado." };
    }

    if (this.consumedTokens.has(tokenString)) {
      return { isValid: false, errorCode: "ALREADY_CONSUMED", errorMessage: "Este token de confirmación ya ha sido utilizado." };
    }

    const parts = tokenString.split(".");
    if (parts.length !== 3) {
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Estructura de token inválida." };
    }

    const [expiresAtStr, claimedParamsHash, claimedHmac] = parts;
    const expiresAt = Number(expiresAtStr);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { isValid: false, errorCode: "EXPIRED", errorMessage: "El tiempo para confirmar esta acción ha expirado." };
    }

    const actualParamsHash = this.hashParameters(parameters);
    if (claimedParamsHash !== actualParamsHash) {
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Los parámetros de la operación no coinciden con la confirmación original." };
    }

    let expectedHmac: string;
    try {
      expectedHmac = this.generateHmacToken(authUid, toolId, actualParamsHash, expiresAt);
    } catch {
      // getSecret() falló — fail-closed
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Servicio de confirmación no disponible." };
    }

    if (claimedHmac.length !== expectedHmac.length) {
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Firma criptográfica de confirmación inválida." };
    }

    if (!crypto.timingSafeEqual(Buffer.from(claimedHmac, "hex"), Buffer.from(expectedHmac, "hex"))) {
      return { isValid: false, errorCode: "INVALID_TOKEN", errorMessage: "Firma criptográfica de confirmación inválida." };
    }

    // Invalida el token para evitar ataques de repetición (Anti-Replay)
    this.consumedTokens.add(tokenString);

    return { isValid: true };
  }

  public static resetConsumedTokens() {
    this.consumedTokens.clear();
  }
}
