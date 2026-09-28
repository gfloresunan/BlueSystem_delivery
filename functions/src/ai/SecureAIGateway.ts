/**
 * BlueSystem Delivery Enterprise — Secure AI Gateway (Cloud Function Callables)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */

import * as functions from "firebase-functions";
import {
  BackendExecutionContext,
  ConversationalGatewayRequestPayload,
  CustomerAIResponsePayload,
  GatewayRequestPayload,
  ToolResult,
} from "./types";
import { defaultCustomerAIService } from "./CustomerAIService";

/**
 * 1. Endpoint Callable para Despacho Directo de Herramientas Backend
 */
export const customerAIGateway = functions.https.onCall(
  async (data: GatewayRequestPayload, context): Promise<ToolResult> => {
    const authUid = context.auth?.uid || "";
    const isAuthenticated = Boolean(authUid);
    const appCheckVerified = Boolean(context.app);
    const confirmedByUser = Boolean(data.confirmedByUser);
    const confirmationToken = typeof data.confirmationToken === "string" ? data.confirmationToken : undefined;

    const executionContext: BackendExecutionContext = {
      authUid,
      isAuthenticated,
      appCheckVerified,
      confirmedByUser,
      confirmationToken,
      clientTimestamp: Date.now(),
    };

    return await defaultCustomerAIService.executeTool(data, executionContext);
  }
);

/**
 * 2. Endpoint Callable para Conversación Natural con Gemini Orquestado
 */
export const processCustomerAIChat = functions.https.onCall(
  async (data: ConversationalGatewayRequestPayload, context): Promise<CustomerAIResponsePayload> => {
    const authUid = context.auth?.uid || "";
    const isAuthenticated = Boolean(authUid);
    const appCheckVerified = Boolean(context.app);
    const confirmationToken = typeof data.confirmedToken === "string" ? data.confirmedToken : undefined;

    const executionContext: BackendExecutionContext = {
      authUid,
      isAuthenticated,
      appCheckVerified,
      confirmedByUser: Boolean(confirmationToken),
      confirmationToken,
      clientTimestamp: Date.now(),
    };

    return await defaultCustomerAIService.processConversationalChat(data, executionContext);
  }
);
