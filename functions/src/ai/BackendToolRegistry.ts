/**
 * BlueSystem Delivery Enterprise — Registro Autoritativo de Herramientas Backend
 * PROTOCOL ID: BSD-AI-C3C-BACKEND-TOOLS-SECURE-AI-GATEWAY
 *
 * Mapeo 1:1 con el ToolRegistry canónico congelado en C3-A.
 */

import { BackendToolDefinition } from "./types";

export class BackendToolRegistry {
  private static readonly backendTools: Map<string, BackendToolDefinition> = new Map([
    [
      "tool_get_customer_context",
      {
        toolId: "tool_get_customer_context",
        description: "Obtiene el perfil básico, dirección principal y puntos de lealtad del cliente autenticado.",
        authorizationLevel: "LEVEL_1_AUTH_CUSTOMER_READ",
        requiresAuthentication: true,
        requiresConfirmation: false,
        sourceReference: "/users/{authUid}",
      },
    ],
    [
      "tool_get_active_order",
      {
        toolId: "tool_get_active_order",
        description: "Recupera la orden activa en curso del cliente autenticado.",
        authorizationLevel: "LEVEL_1_AUTH_CUSTOMER_READ",
        requiresAuthentication: true,
        requiresConfirmation: false,
        sourceReference: "/orders (where customerId == authUid)",
      },
    ],
    [
      "tool_get_order_history",
      {
        toolId: "tool_get_order_history",
        description: "Recupera los últimos 5 pedidos finalizados del cliente autenticado.",
        authorizationLevel: "LEVEL_1_AUTH_CUSTOMER_READ",
        requiresAuthentication: true,
        requiresConfirmation: false,
        sourceReference: "/orders (history, limit 5)",
      },
    ],
    [
      "tool_get_order_tracking",
      {
        toolId: "tool_get_order_tracking",
        description: "Recupera la telemetría derivada de entrega para una orden activa del cliente autenticado.",
        authorizationLevel: "LEVEL_2_AUTH_CUSTOMER_MUTATION", // Baseline C2-B canónico
        requiresAuthentication: true,
        requiresConfirmation: false,
        sourceReference: "/orders/{orderId} + /ubicaciones_repartidores",
      },
    ],
    [
      "tool_validate_coupon",
      {
        toolId: "tool_validate_coupon",
        description: "Valida autoritativamente un cupón de descuento en base al subtotal y comercio.",
        authorizationLevel: "LEVEL_1_AUTH_CUSTOMER_READ",
        requiresAuthentication: true,
        requiresConfirmation: false,
        sourceReference: "validateCouponCode / /coupons",
      },
    ],
    [
      "tool_create_authoritative_order",
      {
        toolId: "tool_create_authoritative_order",
        description: "Crea una orden autoritativa server-side mediante transacción financiera. Requiere confirmación humana previa.",
        authorizationLevel: "LEVEL_4_SERVER_FINANCIAL_MUTATION",
        requiresAuthentication: true,
        requiresConfirmation: true,
        sourceReference: "createAuthoritativeOrder / /orders transaction",
      },
    ],
    [
      "tool_cancel_order",
      {
        toolId: "tool_cancel_order",
        description: "Cancela una orden activa del cliente autenticado si aún está en estado pendiente. Requiere confirmación.",
        authorizationLevel: "LEVEL_3_USER_CONFIRMATION_REQUIRED",
        requiresAuthentication: true,
        requiresConfirmation: true,
        sourceReference: "/orders/{orderId} cancel mutation",
      },
    ],
    [
      "tool_submit_order_review",
      {
        toolId: "tool_submit_order_review",
        description: "Registra una calificación y reseña para un pedido entregado perteneciente al cliente autenticado.",
        authorizationLevel: "LEVEL_2_AUTH_CUSTOMER_MUTATION",
        requiresAuthentication: true,
        requiresConfirmation: false,
        sourceReference: "/order_reviews/{orderId}",
      },
    ],
    [
      "tool_get_available_coupons",
      {
        toolId: "tool_get_available_coupons",
        description: "Consulta los cupones de descuento y promociones activas disponibles para el cliente.",
        authorizationLevel: "LEVEL_1_AUTH_CUSTOMER_READ",
        requiresAuthentication: false,
        requiresConfirmation: false,
        sourceReference: "/coupons",
      },
    ],
  ]);

  private static readonly localOnlyTools = new Set([
    "tool_search_products",
    "tool_search_businesses",
    "tool_resolve_catalog_entity",
    "tool_get_product_detail",
    "tool_get_business_detail",
    "tool_get_nearby_businesses",
    "tool_get_cart",
    "tool_add_to_cart",
    "tool_update_cart_quantity",
    "tool_remove_from_cart",
    "tool_clear_cart",
  ]);

  public static getTool(toolId: string): BackendToolDefinition | undefined {
    return this.backendTools.get(toolId);
  }

  public static isRegisteredBackendTool(toolId: string): boolean {
    return this.backendTools.has(toolId);
  }

  public static isLocalOnlyTool(toolId: string): boolean {
    return this.localOnlyTools.has(toolId);
  }

  public static getAllBackendTools(): BackendToolDefinition[] {
    return Array.from(this.backendTools.values());
  }
}
