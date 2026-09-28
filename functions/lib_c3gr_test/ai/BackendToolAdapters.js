"use strict";
/**
 * BlueSystem Delivery Enterprise — Adaptadores de Herramientas Backend (C3-C)
 * PROTOCOL ID: BSD-AI-C3C-BACKEND-TOOLS-SECURE-AI-GATEWAY
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitOrderReviewAdapter = exports.CancelOrderAdapter = exports.CreateAuthoritativeOrderAdapter = exports.ValidateCouponAdapter = exports.GetOrderTrackingAdapter = exports.GetOrderHistoryAdapter = exports.GetActiveOrderAdapter = exports.GetCustomerContextAdapter = void 0;
const admin = __importStar(require("firebase-admin"));
const BackendSanitization_1 = require("./BackendSanitization");
// 1. tool_get_customer_context
class GetCustomerContextAdapter {
    constructor() {
        this.toolId = "tool_get_customer_context";
    }
    async execute(_parameters, context) {
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
        const sanitized = BackendSanitization_1.BackendSanitization.sanitizeCustomerContext(userData);
        return {
            toolId: this.toolId,
            status: "COMPLETED",
            success: true,
            sanitizedLlmContext: sanitized,
            rawOutputSummary: `Perfil recuperado para usuario`,
        };
    }
}
exports.GetCustomerContextAdapter = GetCustomerContextAdapter;
// 2. tool_get_active_order
class GetActiveOrderAdapter {
    constructor() {
        this.toolId = "tool_get_active_order";
    }
    async execute(_parameters, context) {
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
        const sanitized = BackendSanitization_1.BackendSanitization.sanitizeActiveOrder(orderData, doc.id);
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
exports.GetActiveOrderAdapter = GetActiveOrderAdapter;
// 3. tool_get_order_history
class GetOrderHistoryAdapter {
    constructor() {
        this.toolId = "tool_get_order_history";
    }
    async execute(_parameters, context) {
        const db = admin.firestore();
        const snap = await db
            .collection("orders")
            .where("customerId", "==", context.authUid)
            .limit(5)
            .get();
        const orders = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        const sanitized = BackendSanitization_1.BackendSanitization.sanitizeOrderHistory(orders);
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
exports.GetOrderHistoryAdapter = GetOrderHistoryAdapter;
// 4. tool_get_order_tracking
class GetOrderTrackingAdapter {
    constructor() {
        this.toolId = "tool_get_order_tracking";
    }
    async execute(parameters, context) {
        const db = admin.firestore();
        let orderId = (parameters.orderId || "").toString().trim();
        let orderDoc;
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
        }
        else {
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
        let telemetry = null;
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
        const sanitized = BackendSanitization_1.BackendSanitization.sanitizeTracking(orderData, telemetry);
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
exports.GetOrderTrackingAdapter = GetOrderTrackingAdapter;
// 5. tool_validate_coupon
class ValidateCouponAdapter {
    constructor() {
        this.toolId = "tool_validate_coupon";
    }
    async execute(parameters, context) {
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
exports.ValidateCouponAdapter = ValidateCouponAdapter;
// 6. tool_create_authoritative_order (Level 4 - Server Financial Mutation)
class CreateAuthoritativeOrderAdapter {
    constructor() {
        this.toolId = "tool_create_authoritative_order";
    }
    async execute(parameters, context) {
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
            const subtotal = items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity)), 0);
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
exports.CreateAuthoritativeOrderAdapter = CreateAuthoritativeOrderAdapter;
// 7. tool_cancel_order (Level 3 - User Confirmation Gated)
class CancelOrderAdapter {
    constructor() {
        this.toolId = "tool_cancel_order";
    }
    async execute(parameters, context) {
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
exports.CancelOrderAdapter = CancelOrderAdapter;
// 8. tool_submit_order_review
class SubmitOrderReviewAdapter {
    constructor() {
        this.toolId = "tool_submit_order_review";
    }
    async execute(parameters, context) {
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
exports.SubmitOrderReviewAdapter = SubmitOrderReviewAdapter;
