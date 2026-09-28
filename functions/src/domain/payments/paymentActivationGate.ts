/**
 * BlueSystem Delivery Enterprise — Payment Activation Gate Engine
 * 
 * SSOT for Payment Method Authorization & Pre-Bank Certification.
 * Governs CARD availability and guarantees Zero False Payment Risk.
 */

import {
  PaymentActivationStatus,
  PaymentGateEvaluation,
  PaymentValidationResult,
  CanonicalPaymentMethod,
} from "./paymentTypes";

/**
 * Baseline inmutable de activación de pasarela bancaria.
 * Mientras no se completen todos los prerrequisitos de certificación bancaria,
 * CARD permanece estrictamente desactivada.
 */
export const DEFAULT_PAYMENT_ACTIVATION_STATUS: PaymentActivationStatus = {
  cardEnabled: false,
  gatewayConfigured: false,
  gatewayAdapterAvailable: false,
  sandboxCertified: false,
  webhookVerified: false,
  securityReviewed: false,
  e2eCertified: false,
  governanceApproved: false,
  productionCredentialsConfigured: false,
  killSwitchActive: false,
};

/**
 * Evalúa las 8+ condiciones del Payment Activation Gate.
 * Retorna si CARD está autorizada y la lista detallada de motivos de bloqueo si no lo está.
 */
export function evaluatePaymentActivationGate(
  customStatus?: Partial<PaymentActivationStatus>
): PaymentGateEvaluation {
  const current: PaymentActivationStatus = {
    ...DEFAULT_PAYMENT_ACTIVATION_STATUS,
    ...customStatus,
  };

  const blockedReasons: string[] = [];

  if (current.killSwitchActive) {
    blockedReasons.push("CARD_PAYMENTS_KILL_SWITCH_ACTIVE: Desactivación de emergencia activada.");
  }
  if (!current.cardEnabled) {
    blockedReasons.push("CARD_DISABLED: Método de pago con tarjeta inactivo globalmente.");
  }
  if (!current.gatewayConfigured) {
    blockedReasons.push("GATEWAY_NOT_CONFIGURED: Sin configuración bancaria institucional.");
  }
  if (!current.gatewayAdapterAvailable) {
    blockedReasons.push("ADAPTER_UNAVAILABLE: Adaptador de pasarela bancaria no implementado.");
  }
  if (!current.sandboxCertified) {
    blockedReasons.push("SANDBOX_NOT_CERTIFIED: Certificación en ambiente de pruebas pendiente.");
  }
  if (!current.webhookVerified) {
    blockedReasons.push("WEBHOOK_NOT_VERIFIED: Verificación criptográfica de webhooks no completada.");
  }
  if (!current.securityReviewed) {
    blockedReasons.push("SECURITY_REVIEW_PENDING: Auditoría de seguridad y Zero Sensitive Data pendiente.");
  }
  if (!current.e2eCertified) {
    blockedReasons.push("E2E_NOT_CERTIFIED: Certificación E2E tripartita pendiente.");
  }
  if (!current.governanceApproved) {
    blockedReasons.push("GOVERNANCE_NOT_APPROVED: Aprobación formal de gobernanza (ADR-014) pendiente.");
  }
  if (!current.productionCredentialsConfigured) {
    blockedReasons.push("PRODUCTION_CREDENTIALS_MISSING: Secretos y credenciales de producción no configurados.");
  }

  const isAllowed = blockedReasons.length === 0;

  return {
    isAllowed,
    status: current,
    blockedReasons,
  };
}

/**
 * Consulta rápida de disponibilidad de pagos con tarjeta.
 */
export function isCardPaymentAllowed(customStatus?: Partial<PaymentActivationStatus>): boolean {
  return evaluatePaymentActivationGate(customStatus).isAllowed;
}

/**
 * Normaliza y valida una solicitud de método de pago previa a la creación de orden.
 * Defensa primaria autoritativa en Backend.
 */
export function validatePaymentRequest(
  rawMethod: string | undefined | null,
  customStatus?: Partial<PaymentActivationStatus>
): PaymentValidationResult {
  const method = (rawMethod || "efectivo").toString().trim().toLowerCase();

  // 1. Flujo CASH (Efectivo) — 100% Permitido y Certificado
  if (method === "efectivo" || method === "cash") {
    return {
      isValid: true,
      authoritativePaymentMethod: "efectivo",
      authoritativePaymentStatus: "PENDING",
    };
  }

  // 2. Flujo CARD (Tarjeta) — Requiere pase por PaymentActivationGate
  if (method === "tarjeta" || method === "card") {
    const gateEval = evaluatePaymentActivationGate(customStatus);
    if (!gateEval.isAllowed) {
      const isKillSwitch = customStatus?.killSwitchActive === true;
      return {
        isValid: false,
        errorCode: isKillSwitch
          ? "PAYMENT_GATEWAY_KILL_SWITCH_ACTIVE"
          : "PAYMENT_GATEWAY_NOT_AVAILABLE",
        errorMessage: isKillSwitch
          ? "Los pagos con tarjeta están temporalmente deshabilitados por mantenimiento de emergencia."
          : "El método de pago con tarjeta no está disponible actualmente. Por favor, selecciona Efectivo.",
        authoritativePaymentMethod: "tarjeta",
        authoritativePaymentStatus: "FAILED",
      };
    }

    return {
      isValid: true,
      authoritativePaymentMethod: "tarjeta",
      authoritativePaymentStatus: "PENDING",
    };
  }

  // 3. Flujos Manuales de Encomiendas X→Y (Billetera / Transferencia)
  if (method === "billetera" || method === "wallet") {
    return {
      isValid: true,
      authoritativePaymentMethod: "billetera",
      authoritativePaymentStatus: "PENDING",
    };
  }

  if (method === "transferencia" || method === "bank_transfer" || method === "transfer") {
    return {
      isValid: true,
      authoritativePaymentMethod: "transferencia",
      authoritativePaymentStatus: "PENDING",
    };
  }

  // 4. Método Desconocido
  return {
    isValid: false,
    errorCode: "INVALID_PAYMENT_METHOD",
    errorMessage: `Método de pago '${rawMethod}' no soportado por la plataforma.`,
    authoritativePaymentMethod: "efectivo",
    authoritativePaymentStatus: "FAILED",
  };
}
