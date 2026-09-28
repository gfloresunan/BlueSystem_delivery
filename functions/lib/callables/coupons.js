"use strict";
/**
 * BlueSystem Delivery Enterprise — Backend Callables: Coupon Engine v1.0
 * Secure, multi-tenant, and authoritative HTTPS Callables.
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
exports.createAuthoritativeOrder = exports.redeemCouponAtomic = exports.toggleCouponStatus = exports.createOrUpdateCoupon = exports.validateCouponCode = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const couponEngine_1 = require("../domain/coupons/couponEngine");
const paymentActivationGate_1 = require("../domain/payments/paymentActivationGate");
const orderCodeUtils_1 = require("../shared/orderCodeUtils");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/**
 * Helper: Verifica si el caller es Platform Admin
 */
function isPlatformAdmin(context) {
    if (!context.auth)
        return false;
    const token = context.auth.token || {};
    const role = (token.role || token.eiamRole || "").toString().toUpperCase();
    return (["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"].includes(role) ||
        token.admin === true ||
        token.isSuperAdmin === true);
}
/**
 * Helper: Obtiene el businessId del token
 */
function getCallerBusinessId(context) {
    var _a;
    if (!context.auth)
        return null;
    return ((_a = context.auth.token) === null || _a === void 0 ? void 0 : _a.businessId) || null;
}
/**
 * 1. CALLABLE: Validar Código de Cupón (Autoritativo Server-Side)
 */
exports.validateCouponCode = functions.https.onCall(async (data, context) => {
    var _a;
    const rawCode = (data.couponCode || "").trim().toUpperCase();
    if (!rawCode) {
        return {
            isValid: false,
            errorCode: "INVALID_COUPON",
            errorMessage: "Código de cupón vacío.",
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, (data.cartSubtotal || 0) + (data.deliveryFee || 0)),
        };
    }
    const businessId = (data.businessId || "").trim();
    const customerId = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || data.customerId || "";
    // 1. Buscar en la colección canónica /coupons
    const couponSnap = await db
        .collection("coupons")
        .where("code", "==", rawCode)
        .limit(1)
        .get();
    if (couponSnap.empty) {
        return {
            isValid: false,
            errorCode: "INVALID_COUPON",
            errorMessage: `El cupón '${rawCode}' no existe o no es válido.`,
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, (data.cartSubtotal || 0) + (data.deliveryFee || 0)),
        };
    }
    const doc = couponSnap.docs[0];
    const couponData = Object.assign({ id: doc.id }, doc.data());
    // 2. Si el cupón tiene límite por cliente, contar redenciones previas en /coupon_redemptions
    let customerRedemptionCount = 0;
    if (customerId && couponData.perCustomerLimit && couponData.perCustomerLimit > 0) {
        const redemptionsSnap = await db
            .collection("coupon_redemptions")
            .where("couponId", "==", doc.id)
            .where("customerId", "==", customerId)
            .where("status", "in", ["APPLIED", "CONFIRMED", "REDEEMED"])
            .get();
        customerRedemptionCount = redemptionsSnap.size;
    }
    // 3. Ejecutar evaluación pura con el contexto
    const evalContext = {
        couponCode: rawCode,
        businessId,
        branchId: data.branchId,
        customerId,
        cartSubtotal: Number(data.cartSubtotal) || 0,
        deliveryFee: Number(data.deliveryFee) || 0,
        items: data.items || [],
        currentTimestamp: Date.now(),
        customerPreviousRedemptionCount: customerRedemptionCount,
        existingPromotionDiscount: Number(data.existingPromotionDiscount) || 0,
        isPromotionStackable: data.isPromotionStackable,
    };
    return (0, couponEngine_1.evaluateCoupon)(couponData, evalContext);
});
/**
 * 2. CALLABLE: Crear o Actualizar Cupón (Admin Global o Merchant Específico)
 */
exports.createOrUpdateCoupon = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Se requiere autenticación para gestionar cupones.");
    }
    const isAdmin = isPlatformAdmin(context);
    const callerBusinessId = getCallerBusinessId(context);
    const code = (data.code || "").trim().toUpperCase();
    if (!code) {
        throw new functions.https.HttpsError("invalid-argument", "El código del cupón es obligatorio.");
    }
    const scope = data.scope || "GLOBAL";
    // Validar autorización de Scope
    if (scope === "GLOBAL" && !isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Solo los administradores de plataforma pueden crear o modificar cupones globales.");
    }
    if (scope === "MERCHANT_SPECIFIC") {
        const targetBizId = data.businessId || callerBusinessId;
        if (!targetBizId) {
            throw new functions.https.HttpsError("invalid-argument", "Los cupones específicos de comercio deben tener un businessId asignado.");
        }
        if (!isAdmin && callerBusinessId !== targetBizId) {
            throw new functions.https.HttpsError("permission-denied", "No tienes permisos para gestionar cupones de otro comercio.");
        }
    }
    const couponRef = data.couponId
        ? db.collection("coupons").doc(data.couponId)
        : db.collection("coupons").doc();
    const now = FieldValue.serverTimestamp();
    // Comprobar colisión de código en documentos distintos
    const existingCodeSnap = await db
        .collection("coupons")
        .where("code", "==", code)
        .get();
    for (const snapDoc of existingCodeSnap.docs) {
        if (snapDoc.id !== couponRef.id) {
            throw new functions.https.HttpsError("already-exists", `Ya existe otro cupón registrado con el código '${code}'.`);
        }
    }
    const couponPayload = {
        code,
        scope,
        businessId: scope === "MERCHANT_SPECIFIC" ? (data.businessId || callerBusinessId) : null,
        branchIds: data.branchIds || [],
        discountType: data.discountType || "PERCENTAGE",
        discountValue: Number(data.discountValue) || 0,
        minimumOrderAmount: Number(data.minimumOrderAmount) || 0,
        maximumDiscountAmount: data.maximumDiscountAmount !== undefined && data.maximumDiscountAmount !== null ? Number(data.maximumDiscountAmount) : null,
        startsAt: data.startsAt ? (typeof data.startsAt === "string" ? new Date(data.startsAt) : data.startsAt) : now,
        expiresAt: data.expiresAt ? (typeof data.expiresAt === "string" ? new Date(data.expiresAt) : data.expiresAt) : new Date(Date.now() + 365 * 24 * 3600 * 1000),
        isActive: data.isActive !== false,
        usageLimit: data.usageLimit !== undefined && data.usageLimit !== null ? Number(data.usageLimit) : null,
        usageCount: data.usageCount || 0,
        perCustomerLimit: data.perCustomerLimit !== undefined && data.perCustomerLimit !== null ? Number(data.perCustomerLimit) : null,
        applicableProductIds: data.applicableProductIds || [],
        applicableCategoryIds: data.applicableCategoryIds || [],
        stackable: data.stackable === true,
        priority: Number(data.priority) || 1,
        description: data.description || "",
        updatedAt: now,
        updatedBy: context.auth.uid,
    };
    if (!data.couponId) {
        couponPayload.createdAt = now;
        couponPayload.createdBy = context.auth.uid;
        couponPayload.usageCount = 0;
    }
    await couponRef.set(couponPayload, { merge: true });
    // Registro de Auditoría
    await db.collection("audit_events").add({
        event: data.couponId ? "COUPON_UPDATED" : "COUPON_CREATED",
        domain: "COMMERCE_INTELLIGENCE",
        couponId: couponRef.id,
        code,
        scope,
        businessId: couponPayload.businessId,
        actorUid: context.auth.uid,
        timestamp: now,
    });
    return {
        success: true,
        couponId: couponRef.id,
        code,
        message: `Cupón ${code} guardado exitosamente.`,
    };
});
/**
 * 3. CALLABLE: Activar o Desactivar Cupón
 */
exports.toggleCouponStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
    }
    if (!data.couponId) {
        throw new functions.https.HttpsError("invalid-argument", "couponId requerido.");
    }
    const couponRef = db.collection("coupons").doc(data.couponId);
    const snap = await couponRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError("not-found", "Cupón no encontrado.");
    }
    const couponData = snap.data() || {};
    const isAdmin = isPlatformAdmin(context);
    const callerBizId = getCallerBusinessId(context);
    if (couponData.scope === "GLOBAL" && !isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden cambiar el estado de cupones globales.");
    }
    if (couponData.scope === "MERCHANT_SPECIFIC" && !isAdmin && couponData.businessId !== callerBizId) {
        throw new functions.https.HttpsError("permission-denied", "No puedes modificar cupones de otro comercio.");
    }
    await couponRef.update({
        isActive: data.isActive,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
    });
    return {
        success: true,
        couponId: data.couponId,
        isActive: data.isActive,
    };
});
/**
 * 4. CALLABLE: Redención Atómica e Idempotente de Cupón para una Orden
 */
exports.redeemCouponAtomic = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado.");
    }
    const customerId = context.auth.uid;
    const orderId = (data.orderId || "").trim();
    const rawCode = (data.couponCode || "").trim().toUpperCase();
    if (!orderId || !rawCode) {
        throw new functions.https.HttpsError("invalid-argument", "orderId y couponCode son obligatorios para la redención.");
    }
    const redemptionDocId = `${orderId}_${rawCode}`;
    const redemptionRef = db.collection("coupon_redemptions").doc(redemptionDocId);
    return await db.runTransaction(async (transaction) => {
        var _a;
        // 1. Verificar idempotencia: si ya fue redimido para esta orden
        const existingRedemption = await transaction.get(redemptionRef);
        if (existingRedemption.exists) {
            return {
                success: true,
                isAlreadyRedeemed: true,
                redemptionId: redemptionDocId,
                discountAmount: ((_a = existingRedemption.data()) === null || _a === void 0 ? void 0 : _a.discountAmount) || 0,
            };
        }
        // 2. Leer el cupón en la transacción
        const couponQuery = db.collection("coupons").where("code", "==", rawCode).limit(1);
        const couponQuerySnap = await transaction.get(couponQuery);
        if (couponQuerySnap.empty) {
            throw new functions.https.HttpsError("not-found", `Cupón '${rawCode}' no existe.`);
        }
        const couponDocSnap = couponQuerySnap.docs[0];
        const couponData = Object.assign({ id: couponDocSnap.id }, couponDocSnap.data());
        // 3. Evaluar reglas del cupón
        const evalResult = (0, couponEngine_1.evaluateCoupon)(couponData, {
            couponCode: rawCode,
            businessId: data.businessId,
            branchId: data.branchId,
            customerId,
            cartSubtotal: Number(data.cartSubtotal) || 0,
            deliveryFee: Number(data.deliveryFee) || 0,
            items: data.items || [],
            currentTimestamp: Date.now(),
        });
        if (!evalResult.isValid) {
            throw new functions.https.HttpsError("failed-precondition", evalResult.errorMessage || "Cupón no elegible.");
        }
        // 4. Incrementar uso del cupón atómicamente
        transaction.update(couponDocSnap.ref, {
            usageCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        });
        // 5. Guardar registro de redención
        const totalDiscount = evalResult.discountAmount + evalResult.deliveryDiscountAmount;
        transaction.set(redemptionRef, {
            redemptionId: redemptionDocId,
            idempotencyKey: redemptionDocId,
            couponId: couponDocSnap.id,
            code: rawCode,
            orderId,
            customerId,
            businessId: data.businessId || couponData.businessId || null,
            branchId: data.branchId || null,
            discountAmount: totalDiscount,
            discountType: couponData.discountType,
            status: "CONFIRMED",
            redeemedAt: FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            isAlreadyRedeemed: false,
            redemptionId: redemptionDocId,
            discountAmount: totalDiscount,
            appliedCouponSnapshot: evalResult.appliedCouponSnapshot,
        };
    });
});
/**
 * 5. CALLABLE: Authoritative Pre-Creation Checkout (ADR Enterprise Pre-Write Authority)
 * Realiza la validación, cálculo de totales, redención e inserción de /orders/{orderId}
 * dentro de una única transacción atómica en el servidor (Zero-Window Exposure).
 */
exports.createAuthoritativeOrder = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado.");
    }
    const customerId = context.auth.uid;
    const businessId = (data.businessId || "").trim();
    if (!businessId || !data.items || data.items.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "businessId y lista de items son obligatorios.");
    }
    const orderRef = db.collection("orders").doc();
    const rawCode = (data.couponCode || "").trim().toUpperCase();
    // 0. Validación autoritativa de Método de Pago mediante Payment Activation Gate
    const paymentValidation = (0, paymentActivationGate_1.validatePaymentRequest)(data.paymentMethod);
    if (!paymentValidation.isValid) {
        throw new functions.https.HttpsError("failed-precondition", paymentValidation.errorMessage || "PAYMENT_GATEWAY_NOT_AVAILABLE");
    }
    // Obtener perfil del cliente
    const userDoc = await db.collection("users").doc(customerId).get();
    const customerName = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.nombre) || ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName) || "Cliente";
    const customerPhone = ((_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.telefono) || ((_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.phone) || "";
    return await db.runTransaction(async (transaction) => {
        // 1. Calcular subtotal de items de forma estricta
        const subtotal = data.items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity)), 0);
        const deliveryFee = Number(data.deliveryFee) || 0;
        let couponDiscount = 0;
        let deliveryDiscount = 0;
        let appliedSnapshot = null;
        // 2. Si se proporciona cupón, validar y redimir atómicamente
        if (rawCode) {
            const couponQuery = db.collection("coupons").where("code", "==", rawCode).limit(1);
            const couponSnap = await transaction.get(couponQuery);
            if (couponSnap.empty) {
                throw new functions.https.HttpsError("not-found", `El cupón '${rawCode}' no existe.`);
            }
            const couponDoc = couponSnap.docs[0];
            const couponData = Object.assign({ id: couponDoc.id }, couponDoc.data());
            const evalResult = (0, couponEngine_1.evaluateCoupon)(couponData, {
                couponCode: rawCode,
                businessId,
                branchId: data.branchId,
                customerId,
                cartSubtotal: subtotal,
                deliveryFee,
                items: data.items,
                currentTimestamp: Date.now(),
            });
            if (!evalResult.isValid) {
                throw new functions.https.HttpsError("failed-precondition", evalResult.errorMessage || "Cupón no elegible.");
            }
            couponDiscount = evalResult.discountAmount;
            deliveryDiscount = evalResult.deliveryDiscountAmount;
            appliedSnapshot = evalResult.appliedCouponSnapshot;
            // Registrar redención
            const redemptionDocId = `${orderRef.id}_${rawCode}`;
            const redemptionRef = db.collection("coupon_redemptions").doc(redemptionDocId);
            transaction.set(redemptionRef, {
                redemptionId: redemptionDocId,
                idempotencyKey: redemptionDocId,
                couponId: couponDoc.id,
                code: rawCode,
                orderId: orderRef.id,
                customerId,
                businessId: couponData.businessId || businessId,
                branchId: data.branchId || null,
                discountAmount: couponDiscount + deliveryDiscount,
                discountType: couponData.discountType,
                status: "CONFIRMED",
                redeemedAt: FieldValue.serverTimestamp(),
            });
            // Incrementar uso del cupón
            transaction.update(couponDoc.ref, {
                usageCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        // 3. Generar Consecutivo Operativo Humano Atómico por Comercio (BSD-HUMAN-ORDER-CODE-001)
        const orderCodeData = await (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(transaction, db, businessId);
        // 4. Calcular Total Definitivo Autoritativo
        const effectiveDelivery = Math.max(0, deliveryFee - deliveryDiscount);
        const effectiveSubtotal = Math.max(0, subtotal - couponDiscount);
        const total = Math.round((effectiveSubtotal + effectiveDelivery) * 100) / 100;
        const orderData = {
            pedidoId: orderRef.id,
            orderCode: orderCodeData.orderCode,
            orderShortCode: orderCodeData.orderShortCode,
            orderSequence: orderCodeData.orderSequence,
            orderCodePrefix: orderCodeData.orderCodePrefix,
            customerId,
            clienteId: customerId,
            userId: customerId,
            uid: customerId,
            customerName,
            customerPhone,
            businessId,
            branchId: data.branchId || "",
            items: data.items.map((it) => ({
                productId: it.productId,
                productName: it.productName,
                price: it.price,
                quantity: it.quantity,
                subtotal: it.price * it.quantity,
                imageUrl: it.imageUrl || "",
            })),
            subtotal,
            deliveryFee,
            couponCode: rawCode || "",
            couponDiscount: couponDiscount + deliveryDiscount,
            promotionDiscount: 0,
            totalDiscount: couponDiscount + deliveryDiscount,
            coupon: appliedSnapshot || {},
            total,
            status: "pending",
            estado: "pendiente",
            paymentMethod: paymentValidation.authoritativePaymentMethod,
            paymentStatus: paymentValidation.authoritativePaymentStatus,
            paymentVerified: false,
            addressId: data.addressId || "",
            address: data.deliveryAddress || "Managua, Nicaragua",
            deliveryAddress: data.deliveryAddress || "Managua, Nicaragua",
            destinationAddress: data.deliveryAddress || "Managua, Nicaragua",
            fullAddress: data.fullAddress || data.deliveryAddress || "Managua, Nicaragua",
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            instructions: data.instructions || "",
            deliveryInstructions: data.instructions || "",
            createdAt: FieldValue.serverTimestamp(),
            courierPhase: 1,
            hasBeenRated: false,
            authoritativeCheckout: true,
        };
        transaction.set(orderRef, orderData);
        return {
            success: true,
            orderId: orderRef.id,
            orderCode: orderCodeData.orderCode,
            orderShortCode: orderCodeData.orderShortCode,
            orderSequence: orderCodeData.orderSequence,
            orderCodePrefix: orderCodeData.orderCodePrefix,
            subtotal,
            deliveryFee,
            couponDiscount: couponDiscount + deliveryDiscount,
            total,
            paymentMethod: paymentValidation.authoritativePaymentMethod,
            paymentStatus: paymentValidation.authoritativePaymentStatus,
        };
    });
});
//# sourceMappingURL=coupons.js.map