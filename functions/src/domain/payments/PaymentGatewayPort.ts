/**
 * BlueSystem Delivery Enterprise — Canonical Payment Gateway Port
 * Architecture: Hexagonal / Ports & Adapters (ADR-003, ADR-014, Phase 3 Bank Readiness)
 * 
 * Defines the agnostic interface contract that any institutional bank or gateway
 * provider (BAC, LAFISE, Banpro, etc.) must fulfill.
 */

import { CanonicalPaymentStatus } from "./paymentTypes";

export interface MoneyAmount {
  amountInCents: number; // Integer cents to prevent floating point inaccuracies
  currency: "NIO" | "USD";
}

export interface CreatePaymentIntentRequest {
  orderId: string;
  amount: MoneyAmount;
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  description: string;
  idempotencyKey: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  success: boolean;
  intentId: string;
  clientSecret?: string;
  checkoutUrl?: string;
  status: CanonicalPaymentStatus;
  rawResponse?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface AuthorizePaymentRequest {
  intentId: string;
  token?: string;
  idempotencyKey: string;
  amount: MoneyAmount;
}

export interface AuthorizePaymentResult {
  success: boolean;
  transactionId: string;
  authCode?: string;
  status: CanonicalPaymentStatus; // AUTHORIZED or FAILED
  requires3DS?: boolean;
  redirect3DSUrl?: string;
  rawResponse?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface CapturePaymentRequest {
  transactionId: string;
  amount: MoneyAmount;
  idempotencyKey: string;
}

export interface CapturePaymentResult {
  success: boolean;
  transactionId: string;
  settlementId?: string;
  status: CanonicalPaymentStatus; // PAID or FAILED
  rawResponse?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface VoidPaymentRequest {
  transactionId: string;
  reason?: string;
  idempotencyKey: string;
}

export interface VoidPaymentResult {
  success: boolean;
  transactionId: string;
  status: CanonicalPaymentStatus; // CANCELLED or FAILED
  rawResponse?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundPaymentRequest {
  transactionId: string;
  amount: MoneyAmount;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId: string;
  transactionId: string;
  amountRefunded: MoneyAmount;
  status: CanonicalPaymentStatus; // REFUNDED or FAILED
  rawResponse?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  transactionId: string;
  orderId: string;
  status: CanonicalPaymentStatus;
  amount: MoneyAmount;
  authCode?: string;
  settlementId?: string;
  paidAt?: string;
  rawResponse?: any;
  errorCode?: string;
  errorMessage?: string;
}

export interface WebhookVerificationRequest {
  rawBody: string | Buffer;
  signature: string;
  headers: Record<string, string | string[] | undefined>;
  timestamp?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventType?: string;
  transactionId?: string;
  orderId?: string;
  status?: CanonicalPaymentStatus;
  amount?: MoneyAmount;
  rejectionReason?: string;
}

/**
 * Agnostic Port Contract for Bank Payment Gateways.
 * The core domain only interacts with this port.
 */
export interface PaymentGatewayPort {
  readonly gatewayName: string;
  readonly isSandbox: boolean;

  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResult>;
  authorizePayment(request: AuthorizePaymentRequest): Promise<AuthorizePaymentResult>;
  capturePayment(request: CapturePaymentRequest): Promise<CapturePaymentResult>;
  voidPayment(request: VoidPaymentRequest): Promise<VoidPaymentResult>;
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
  verifyWebhook(request: WebhookVerificationRequest): Promise<WebhookVerificationResult>;
}
