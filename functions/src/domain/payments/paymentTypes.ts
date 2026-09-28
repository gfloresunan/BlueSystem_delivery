/**
 * BlueSystem Delivery Enterprise — Canonical Payment Types
 * Architecture: Hexagonal / Ports & Adapters (ADR-003 & Phase 2 Hardening)
 */

export type CanonicalPaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export type CanonicalPaymentMethod =
  | "efectivo"
  | "tarjeta"
  | "billetera"
  | "transferencia";

export type PaymentMethodCategory = "CASH" | "CARD" | "WALLET" | "BANK_TRANSFER";

export interface PaymentActivationStatus {
  cardEnabled: boolean;
  gatewayConfigured: boolean;
  gatewayAdapterAvailable: boolean;
  sandboxCertified: boolean;
  webhookVerified: boolean;
  securityReviewed: boolean;
  e2eCertified: boolean;
  governanceApproved: boolean;
  productionCredentialsConfigured: boolean;
  killSwitchActive: boolean;
}

export interface PaymentGateEvaluation {
  isAllowed: boolean;
  status: PaymentActivationStatus;
  blockedReasons: string[];
}

export type PaymentErrorCode =
  | "PAYMENT_GATEWAY_NOT_AVAILABLE"
  | "PAYMENT_GATEWAY_KILL_SWITCH_ACTIVE"
  | "UNAUTHORIZED_PAYMENT_STATE"
  | "INVALID_PAYMENT_METHOD"
  | "INSUFFICIENT_CASH_AMOUNT"
  | "DUPLICATE_PAYMENT_INTENT";

export interface PaymentValidationResult {
  isValid: boolean;
  errorCode?: PaymentErrorCode;
  errorMessage?: string;
  authoritativePaymentMethod: CanonicalPaymentMethod;
  authoritativePaymentStatus: CanonicalPaymentStatus;
}
