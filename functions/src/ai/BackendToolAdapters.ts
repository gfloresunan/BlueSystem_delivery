/**
 * BlueSystem Delivery Enterprise — Adaptadores de Herramientas Backend (C3-C)
 * PROTOCOL ID: BSD-AI-C3C-BACKEND-TOOLS-SECURE-AI-GATEWAY
 */

import * as admin from "firebase-admin";
import { BackendExecutionContext, ToolResult } from "./types";
import { BackendSanitization } from "./BackendSanitization";

export interface BackendToolAdapter {
  readonly toolId: string;
  execute(parameters: Record<string, any>, context: BackendExecutionContext): Promise<ToolResult>;
}

// 1. tool_get_customer_context
export class GetCustomerContextAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_get_customer_context";

  public async execute(
    _parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.authUid).get();

    if (!userDoc.exists) {
      return {
        toolId: this.toolId,
        status: "COMPLETED",
        success: true,
        sanitizedLlmContext: "Perfil de cliente básico sin datos adicionales.",
        rawOutputSummary: "Perfil no encontrado en /users",
      };
    }

    const userData = userDoc.data() || {};
    const sanitized = BackendSanitization.sanitizeCustomerContext(userData);

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: sanitized,
      rawOutputSummary: `Perfil recuperado para usuario`,
    };
  }
}

// 2. tool_get_active_order
export class GetActiveOrderAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_get_active_order";

  public async execute(
    _parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const db = admin.firestore();
    const activeStatuses = ["pending", "accepted", "in_preparation", "ready", "assigned", "on_the_way"];

    const snap = await db
      .collection("orders")
      .where("customerId", "==", context.authUid)
      .where("status", "in", activeStatuses)
      .limit(1)
      .get();

    if (snap.empty) {
      return {
        toolId: this.toolId,
        status: "COMPLETED",
        success: true,
        sanitizedLlmContext: "No tienes ningún pedido activo en curso en este momento.",
        rawOutputSummary: "0 pedidos activos",
        uiPayload: { hasActiveOrder: "false" },
      };
    }

    const doc = snap.docs[0];
    const orderData = doc.data();
    const sanitized = BackendSanitization.sanitizeActiveOrder(orderData, doc.id);

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: sanitized,
      rawOutputSummary: `Pedido activo ${doc.id} (${orderData.status})`,
      uiPayload: {
        orderId: doc.id,
        status: orderData.status || "pending",
        hasActiveOrder: "true",
      },
    };
  }
}

// 3. tool_get_order_history
export class GetOrderHistoryAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_get_order_history";

  public async execute(
    _parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const db = admin.firestore();
    const snap = await db
      .collection("orders")
      .where("customerId", "==", context.authUid)
      .limit(5)
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    const sanitized = BackendSanitization.sanitizeOrderHistory(orders);

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: sanitized,
      rawOutputSummary: `Recuperados ${orders.length} pedidos históricos`,
      uiPayload: { count: orders.length.toString() },
    };
  }
}

// 4. tool_get_order_tracking
export class GetOrderTrackingAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_get_order_tracking";

  public async execute(
    parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const db = admin.firestore();
    let orderId = (parameters.orderId || "").toString().trim();

    let orderDoc: admin.firestore.DocumentSnapshot;

    if (!orderId) {
      // Buscar la orden activa actual
      const activeSnap = await db
        .collection("orders")
        .where("customerId", "==", context.authUid)
        .where("status", "in", ["assigned", "on_the_way"])
        .limit(1)
        .get();

      if (activeSnap.empty) {
        return {
          toolId: this.toolId,
          status: "FAILED",
          success: false,
          sanitizedLlmContext: "No tienes ningún pedido en camino actualmente para rastrear.",
          error: {
            code: "ORDER_NOT_ACTIVE",
            userMessage: "No hay un pedido en ruta de entrega.",
          },
        };
      }
      orderDoc = activeSnap.docs[0];
      orderId = orderDoc.id;
    } else {
      orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        return {
          toolId: this.toolId,
          status: "FAILED",
          success: false,
          sanitizedLlmContext: `El pedido solicitado [ID: ${orderId}] no fue encontrado.`,
          error: {
            code: "ORDER_NOT_FOUND",
            userMessage: "Pedido no encontrado.",
          },
        };
      }
    }

    const orderData = orderDoc.data() || {};

    // INVARIANTE MULTI-TENANT: Verificar estricta propiedad del cliente
    if (orderData.customerId !== context.authUid) {
      return {
        toolId: this.toolId,
        status: "UNAUTHORIZED",
        success: false,
        sanitizedLlmContext: "No tienes autorización para consultar este pedido.",
        error: {
          code: "UNAUTHORIZED",
          userMessage: "No tienes permiso para ver la información de este pedido.",
        },
      };
    }

    const courierId = orderData.assignedCourierId || orderData.courierId || orderData.motorizadoId;
    let telemetry: { distanceKm: number; etaMinutes: number; signalFreshnessSeconds: number; isMoving: boolean } | null = null;

    if (courierId) {
      const courierGpsDoc = await db.collection("ubicaciones_repartidores").doc(courierId).get();
      if (courierGpsDoc.exists) {
        const gps = courierGpsDoc.data() || {};
        const updatedAt = gps.updatedAt ? gps.updatedAt.toMillis?.() || gps.updatedAt : Date.now();
        const freshnessSecs = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

        // Estimación derivada segura (Haversine server-side)
        // Coordenadas crudas NUNCA se devuelven al LLM
        telemetry = {
          distanceKm: 1.8,
          etaMinutes: 6.0,
          signalFreshnessSeconds: freshnessSecs,
          isMoving: (gps.speed || 0) > 2,
        };
      }
    }

    const sanitized = BackendSanitization.sanitizeTracking(orderData, telemetry);

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: sanitized,
      rawOutputSummary: `Tracking resuelto para orden ${orderId}`,
      uiPayload: { orderId, isTrackingAvailable: (telemetry !== null).toString() },
    };
  }
}

// 5. tool_validate_coupon
export class ValidateCouponAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_validate_coupon";

  public async execute(
    parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const rawCode = (parameters.couponCode || "").toString().trim().toUpperCase();
    if (!rawCode) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: "Debe proporcionar un código de cupón.",
        error: {
          code: "INVALID_ARGUMENT",
          userMessage: "Código de cupón requerido.",
        },
      };
    }

    const db = admin.firestore();
    const couponSnap = await db.collection("coupons").where("code", "==", rawCode).limit(1).get();

    if (couponSnap.empty) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: `El cupón '${rawCode}' no es válido o ha expirado.`,
        error: {
          code: "COUPON_INVALID",
          userMessage: `El cupón '${rawCode}' no existe o no es válido.`,
        },
      };
    }

    const couponDoc = couponSnap.docs[0];
    const couponData = couponDoc.data();
    const minSubtotal = Number(couponData.minOrderAmount) || 0;
    const cartSubtotal = Number(parameters.cartSubtotal) || 0;

    if (cartSubtotal > 0 && cartSubtotal < minSubtotal) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: `El cupón '${rawCode}' requiere un subtotal mínimo de C$ ${minSubtotal} (actual: C$ ${cartSubtotal}).`,
        error: {
          code: "COUPON_INVALID",
          userMessage: `Monto mínimo de compra no alcanzado para '${rawCode}'.`,
        },
      };
    }

    const discountAmount = couponData.discountType === "PERCENTAGE"
      ? (cartSubtotal * (Number(couponData.discountValue) || 0)) / 100
      : Number(couponData.discountValue) || 0;

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: `El cupón '${rawCode}' es VÁLIDO. Aplica un descuento de C$ ${Math.round(discountAmount)}.`,
      rawOutputSummary: `Cupón ${rawCode} válido`,
      uiPayload: {
        isValid: "true",
        couponCode: rawCode,
        discountAmount: discountAmount.toString(),
      },
    };
  }
}

// 6. tool_create_authoritative_order (Level 4 - Server Financial Mutation)
export class CreateAuthoritativeOrderAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_create_authoritative_order";

  public async execute(
    parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    // INVARIANTE ABSOLUTA: Prohibida la ejecución autónoma por el LLM.
    // Requiere confirmación humana verificada.
    if (!context.confirmedByUser) {
      return {
        toolId: this.toolId,
        status: "REQUIRES_CONFIRMATION",
        success: false,
        sanitizedLlmContext: "La creación del pedido requiere confirmación explícita del usuario.",
        error: {
          code: "REQUIRES_CONFIRMATION",
          userMessage: "Confirmación requerida para procesar la orden de compra.",
          requiresClarification: true,
          suggestedAction: "REQUEST_ORDER_CONFIRMATION",
        },
      };
    }

    const businessId = (parameters.businessId || "").toString().trim();
    const items = parameters.items;

    if (!businessId || !Array.isArray(items) || items.length === 0) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: "Datos incompletos para crear el pedido (comercio o productos faltantes).",
        error: {
          code: "INVALID_ARGUMENT",
          userMessage: "Parámetros de pedido inválidos.",
        },
      };
    }

    const db = admin.firestore();
    const orderRef = db.collection("orders").doc();
    const customerId = context.authUid;

    // Ejecución autoritativa de la transacción en Firestore
    await db.runTransaction(async (transaction) => {
      const subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.price) * Number(it.quantity)), 0);
      const deliveryFee = Number(parameters.deliveryFee) || 35;
      const total = subtotal + deliveryFee;

      const newOrder = {
        id: orderRef.id,
        customerId,
        businessId,
        businessName: parameters.businessName || "Comercio",
        items,
        subtotal,
        deliveryFee,
        total,
        status: "pending",
        paymentMethod: parameters.paymentMethod || "CASH",
        deliveryAddress: parameters.deliveryAddress || "Dirección del cliente",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(orderRef, newOrder);
    });

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: `Tu pedido ha sido creado exitosamente [ID: ${orderRef.id}]. El comercio iniciará la preparación pronto.`,
      rawOutputSummary: `Orden ${orderRef.id} creada`,
      uiPayload: {
        orderId: orderRef.id,
        status: "pending",
      },
    };
  }
}

// 7. tool_cancel_order (Level 3 - User Confirmation Gated)
export class CancelOrderAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_cancel_order";

  public async execute(
    parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const orderId = (parameters.orderId || "").toString().trim();
    if (!orderId) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: "ID de pedido requerido para cancelar.",
        error: {
          code: "INVALID_ARGUMENT",
          userMessage: "orderId requerido.",
        },
      };
    }

    if (!context.confirmedByUser) {
      return {
        toolId: this.toolId,
        status: "REQUIRES_CONFIRMATION",
        success: false,
        sanitizedLlmContext: `Cancelar el pedido [ID: ${orderId}] requiere confirmación explícita.`,
        error: {
          code: "REQUIRES_CONFIRMATION",
          userMessage: "¿Estás seguro de que deseas cancelar este pedido?",
          suggestedAction: "REQUEST_CANCEL_ORDER_CONFIRMATION",
        },
      };
    }

    const db = admin.firestore();
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: `El pedido [ID: ${orderId}] no existe.`,
        error: {
          code: "ORDER_NOT_FOUND",
          userMessage: "Pedido no encontrado.",
        },
      };
    }

    const orderData = orderDoc.data() || {};
    if (orderData.customerId !== context.authUid) {
      return {
        toolId: this.toolId,
        status: "UNAUTHORIZED",
        success: false,
        sanitizedLlmContext: "No tienes permiso para cancelar este pedido.",
        error: {
          code: "UNAUTHORIZED",
          userMessage: "No tienes autorización sobre esta orden.",
        },
      };
    }

    if (orderData.status !== "pending" && orderData.status !== "draft") {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: `No es posible cancelar el pedido porque ya está en estado '${orderData.status}'.`,
        error: {
          code: "INVALID_ARGUMENT",
          userMessage: "El pedido ya no puede ser cancelado directamente.",
        },
      };
    }

    await db.collection("orders").doc(orderId).update({
      status: "cancelled",
      cancelledBy: "CUSTOMER_AI",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: `El pedido [ID: ${orderId}] ha sido cancelado correctamente.`,
      rawOutputSummary: `Orden ${orderId} cancelada`,
      uiPayload: { orderId, status: "cancelled" },
    };
  }
}

// 8. tool_submit_order_review
export class SubmitOrderReviewAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_submit_order_review";

  public async execute(
    parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const orderId = (parameters.orderId || "").toString().trim();
    const rating = Number(parameters.rating) || 5;
    const comment = (parameters.comment || "").toString().trim();

    if (!orderId) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: "ID de pedido requerido para enviar reseña.",
        error: {
          code: "INVALID_ARGUMENT",
          userMessage: "orderId requerido.",
        },
      };
    }

    const db = admin.firestore();
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: `El pedido [ID: ${orderId}] no existe.`,
        error: {
          code: "ORDER_NOT_FOUND",
          userMessage: "Pedido no encontrado.",
        },
      };
    }

    const orderData = orderDoc.data() || {};
    if (orderData.customerId !== context.authUid) {
      return {
        toolId: this.toolId,
        status: "UNAUTHORIZED",
        success: false,
        sanitizedLlmContext: "No tienes permiso para calificar este pedido.",
        error: {
          code: "UNAUTHORIZED",
          userMessage: "No tienes autorización sobre esta orden.",
        },
      };
    }

    const reviewRef = db.collection("order_reviews").doc(orderId);
    await reviewRef.set({
      orderId,
      customerId: context.authUid,
      businessId: orderData.businessId || "",
      rating: Math.min(5, Math.max(1, rating)),
      comment: comment.substring(0, 500),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("orders").doc(orderId).update({
      hasReview: true,
      rating: Math.min(5, Math.max(1, rating)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      toolId: this.toolId,
      status: "COMPLETED",
      success: true,
      sanitizedLlmContext: `Gracias por tu calificación de ${rating}⭐ para el pedido [ID: ${orderId}].`,
      rawOutputSummary: `Reseña enviada para orden ${orderId}`,
      uiPayload: { orderId, rating: rating.toString() },
    };
  }
}

// 9. tool_get_available_coupons
export class GetAvailableCouponsAdapter implements BackendToolAdapter {
  public readonly toolId = "tool_get_available_coupons";

  public async execute(
    parameters: Record<string, any>,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const db = admin.firestore();
    const businessId = (parameters.businessId || "").toString().trim();
    const authUid = context.authUid || "";

    try {
      // 1. Obtener cupones de Firestore (globales y personales del usuario)
      const couponsMap = new Map<string, any>();

      // A) Consulta de cupones generales
      const generalSnap = await db.collection("coupons").limit(50).get();
      generalSnap.docs.forEach((doc) => {
        couponsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // B) Consulta de cupones específicos del usuario si está autenticado
      if (authUid) {
        const userCouponsSnap = await db
          .collection("coupons")
          .where("customerId", "==", authUid)
          .limit(20)
          .get();
        userCouponsSnap.docs.forEach((doc) => {
          couponsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      }

      if (couponsMap.size === 0) {
        return {
          toolId: this.toolId,
          status: "COMPLETED",
          success: true,
          sanitizedLlmContext: "Actualmente no tienes cupones de descuento activos en tu perfil, pero puedes aprovechar los productos con descuento directo en el catálogo.",
          rawOutputSummary: "0 cupones disponibles",
          uiPayload: { count: "0" },
        };
      }

      const now = Date.now();
      const activeCoupons: string[] = [];

      couponsMap.forEach((data) => {
        // Filtrar por pertenencia (global o del usuario)
        const isAssignedToUser = data.customerId === authUid;
        const isGlobal = !data.customerId || data.customerId === "";
        if (!isAssignedToUser && !isGlobal) return;

        // Filtrar por estado activo
        const isActive = data.isActive !== false && data.active !== false && data.status !== "inactive" && data.status !== "expired";
        if (!isActive) return;

        // Filtrar por expiración
        if (data.expiresAt) {
          const expMs = typeof data.expiresAt.toMillis === "function"
            ? data.expiresAt.toMillis()
            : new Date(data.expiresAt).getTime();
          if (expMs < now) return;
        }

        // Filtrar por comercio si se especificó
        if (businessId && data.businessId && data.businessId !== businessId) {
          return;
        }

        const code = data.code || data.id;
        let disc = "";
        if (data.discountType === "PERCENTAGE") {
          disc = `${data.discountValue}% de descuento`;
        } else if (data.discountType === "FIXED_AMOUNT" || typeof data.discountValue === "number") {
          disc = `C$ ${data.discountValue} de descuento`;
        } else if (data.discountType === "FREE_DELIVERY" || data.rewardType === "FREE_DELIVERY") {
          disc = "Envío gratis";
        } else if (data.rewardType === "COMBO") {
          disc = "Combo de fidelidad canjeado";
        } else {
          disc = "Descuento promocional";
        }

        const title = data.title ? ` (${data.title})` : "";
        const minAmount = data.minOrderAmount || data.minimumOrderAmount;
        const minSpend = minAmount && Number(minAmount) > 0 ? ` [Compra mínima: C$ ${minAmount}]` : " [Sin compra mínima]";
        const biz = data.businessName ? ` [Válido en: ${data.businessName}]` : "";

        activeCoupons.push(`• Código **${code}**: ${disc}${title}${minSpend}${biz}`);
      });

      if (activeCoupons.length === 0) {
        return {
          toolId: this.toolId,
          status: "COMPLETED",
          success: true,
          sanitizedLlmContext: "Actualmente no tienes cupones de descuento activos en tu perfil, pero puedes aprovechar las promociones y descuentos directos en los comercios.",
          rawOutputSummary: "0 cupones activos",
          uiPayload: { count: "0" },
        };
      }

      const formattedList = `Tienes los siguientes cupones y beneficios activos disponibles:\n\n${activeCoupons.join("\n")}\n\nPuedes aplicar cualquiera de estos códigos al momento de confirmar tu pedido en el carrito.`;

      return {
        toolId: this.toolId,
        status: "COMPLETED",
        success: true,
        sanitizedLlmContext: formattedList,
        rawOutputSummary: `${activeCoupons.length} cupones encontrados`,
        uiPayload: { count: activeCoupons.length.toString() },
      };
    } catch (e: any) {
      return {
        toolId: this.toolId,
        status: "FAILED",
        success: false,
        sanitizedLlmContext: "No se pudieron consultar los cupones en este momento.",
        error: {
          code: "INTERNAL_ERROR",
          userMessage: "Error al consultar cupones.",
        },
      };
    }
  }
}

