/**
 * BlueSystem Delivery Enterprise — Tipos y Contratos de IA Backend (C3-C / C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */

export type ToolResultStatus =
  | "COMPLETED"
  | "FAILED"
  | "REQUIRES_CONFIRMATION"
  | "REQUIRES_DISAMBIGUATION"
  | "UNAUTHORIZED";

export type AIErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "TOOL_NOT_FOUND"
  | "TOOL_NOT_ELIGIBLE"
  | "INVALID_ARGUMENT"
  | "REQUIRES_CONFIRMATION"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_ACTIVE"
  | "TRACKING_UNAVAILABLE"
  | "COUPON_INVALID"
  | "GEMINI_UNAVAILABLE"
  | "GEMINI_TIMEOUT"
  | "GEMINI_INVALID_RESPONSE"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface AIErrorPayload {
  code: AIErrorCode;
  userMessage: string;
  technicalReason?: string;
  recoverable?: boolean;
  requiresClarification?: boolean;
  suggestedAction?: string;
}

export interface ToolResult {
  toolId: string;
  status: ToolResultStatus;
  success: boolean;
  sanitizedLlmContext: string;
  rawOutputSummary?: string;
  uiPayload?: Record<string, string>;
  error?: AIErrorPayload;
}

export interface BackendExecutionContext {
  authUid: string;
  isAuthenticated: boolean;
  appCheckVerified: boolean;
  confirmedByUser: boolean;
  confirmationToken?: string;
  clientTimestamp?: number;
}

export type BackendToolAuthorizationLevel =
  | "LEVEL_0_PUBLIC_READ"
  | "LEVEL_1_AUTH_CUSTOMER_READ"
  | "LEVEL_2_AUTH_CUSTOMER_MUTATION"
  | "LEVEL_3_USER_CONFIRMATION_REQUIRED"
  | "LEVEL_4_SERVER_FINANCIAL_MUTATION";

export interface BackendToolDefinition {
  toolId: string;
  description: string;
  authorizationLevel: BackendToolAuthorizationLevel;
  requiresAuthentication: boolean;
  requiresConfirmation: boolean;
  sourceReference: string;
}

export interface GatewayRequestPayload {
  toolId: string;
  parameters: Record<string, any>;
  confirmedByUser?: boolean;
  confirmationToken?: string;
}

export interface PendingConfirmationPayload {
  confirmationId: string;
  toolId: string;
  summary: string;
  parameters: Record<string, any>;
  confirmationToken: string;
  expiresAt: number;
  financialBreakdown?: {
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
}

export interface AIActionPayload {
  type: string;
  payload: Record<string, string>;
}

export interface CustomerAIResponsePayload {
  text: string;
  intent: string;
  cards?: Array<Record<string, any>>;
  actions?: AIActionPayload[];
  pendingConfirmation?: PendingConfirmationPayload;
  errors?: AIErrorPayload[];
  executionId: string;
}

export interface ChatMessagePayload {
  role: "user" | "model" | "system";
  content: string;
}

export interface ConversationalGatewayRequestPayload {
  message: string;
  conversationHistory?: ChatMessagePayload[];
  confirmedToken?: string;
  customerLat?: number;
  customerLng?: number;
}
