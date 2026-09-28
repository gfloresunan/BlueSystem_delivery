"use strict";
/**
 * BlueSystem Delivery Enterprise — Server-Authoritative Review & Rating Engine
 * Protocol: BSD-ORDER-CLOSURE-RATING-QUIRURGICAL-FIX-001
 * Etapas 2.3 & 2.4: Authoritative Review Submission, Idempotency & Atomic Aggregates
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
exports.submitOrderReview = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
exports.submitOrderReview = functions.https.onCall(async (data, context) => {
    // 1. Validar autenticación
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión para calificar un pedido o encomienda.");
    }
    const callerUid = context.auth.uid;
    // 2. Validar payload
    const rawId = ((data === null || data === void 0 ? void 0 : data.tripId) || (data === null || data === void 0 ? void 0 : data.orderId) || "").trim();
    if (!rawId) {
        throw new functions.https.HttpsError("invalid-argument", "El identificador del pedido o viaje (orderId / tripId) es obligatorio.");
    }
    let businessRating = null;
    if ((data === null || data === void 0 ? void 0 : data.businessRating) !== undefined && (data === null || data === void 0 ? void 0 : data.businessRating) !== null && Number(data === null || data === void 0 ? void 0 : data.businessRating) > 0) {
        const bRate = Number(data.businessRating);
        if (!Number.isInteger(bRate) || bRate < 1 || bRate > 5) {
            throw new functions.https.HttpsError("invalid-argument", "La calificación del comercio debe ser un número entero entre 1 y 5 estrellas.");
        }
        businessRating = bRate;
    }
    let courierRating = null;
    if ((data === null || data === void 0 ? void 0 : data.courierRating) !== undefined && (data === null || data === void 0 ? void 0 : data.courierRating) !== null && Number(data === null || data === void 0 ? void 0 : data.courierRating) > 0) {
        const cRate = Number(data.courierRating);
        if (!Number.isInteger(cRate) || cRate < 1 || cRate > 5) {
            throw new functions.https.HttpsError("invalid-argument", "La calificación del repartidor debe ser un número entero entre 1 y 5 estrellas.");
        }
        courierRating = cRate;
    }
    if (businessRating === null && courierRating === null) {
        throw new functions.https.HttpsError("invalid-argument", "Debes ingresar al menos una calificación válida para el servicio o el repartidor.");
    }
    const comments = ((data === null || data === void 0 ? void 0 : data.comments) || "").toString().trim().slice(0, 1000);
    const courierComments = ((data === null || data === void 0 ? void 0 : data.courierComments) || "").toString().trim().slice(0, 1000);
    // 3. Ejecutar transacción atómica server-authoritative
    return await db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d, _e, _f;
        // Determinar si el documento pertenece a /deliveryTrips (X→Y) o /orders (Comercio)
        const explicitXToY = Boolean((data === null || data === void 0 ? void 0 : data.tripId) || (data === null || data === void 0 ? void 0 : data.reviewType) === "X_TO_Y");
        let isXToY = explicitXToY;
        let orderSnap = null;
        let tripSnap = null;
        if (isXToY) {
            const tripRef = db.collection("deliveryTrips").doc(rawId);
            tripSnap = await transaction.get(tripRef);
            if (!tripSnap.exists) {
                throw new functions.https.HttpsError("not-found", "La encomienda X→Y no fue encontrada.");
            }
        }
        else {
            const orderRef = db.collection("orders").doc(rawId);
            orderSnap = await transaction.get(orderRef);
            if (!orderSnap.exists) {
                // Fallback resiliente: verificar si existe en /deliveryTrips
                const tripRef = db.collection("deliveryTrips").doc(rawId);
                tripSnap = await transaction.get(tripRef);
                if (tripSnap.exists) {
                    isXToY = true;
                }
                else {
                    throw new functions.https.HttpsError("not-found", "El pedido no fue encontrado.");
                }
            }
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        // Resolver perfil del cliente para nombre y avatar canónico
        const callerUserSnap = await transaction.get(db.collection("users").doc(callerUid));
        const callerUserData = callerUserSnap.exists ? callerUserSnap.data() : {};
        const customerPhotoUrl = ((callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.photoUrl) || (callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.foto) || (callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.profileImageUrl) || "").toString().trim();
        // ────────────────────────────────────────────────────────────────────────
        // RAMA A: RESEÑA DE ENCOMIENDA X→Y (DOMINIO B)
        // ────────────────────────────────────────────────────────────────────────
        if (isXToY && tripSnap && tripSnap.exists) {
            const tripData = tripSnap.data() || {};
            const customerId = (tripData.customerId || tripData.clienteId || "").toString().trim();
            if (customerId && customerId !== callerUid) {
                throw new functions.https.HttpsError("permission-denied", "No tienes autorización para calificar una encomienda ajena.");
            }
            const rawStatus = (tripData.status || tripData.estado || "").toString().toLowerCase().trim();
            const isDelivered = ["delivered", "entregado", "completed", "completado"].includes(rawStatus) || Boolean(tripData.deliveredAt);
            if (!isDelivered) {
                throw new functions.https.HttpsError("failed-precondition", "La encomienda aún no ha sido entregada al destinatario.");
            }
            // Idempotencia: Verificar en /reviews/{rawId}
            const reviewRef = db.collection("reviews").doc(rawId);
            const reviewSnap = await transaction.get(reviewRef);
            if (reviewSnap.exists && (((_a = reviewSnap.data()) === null || _a === void 0 ? void 0 : _a.courierRating) || ((_b = reviewSnap.data()) === null || _b === void 0 ? void 0 : _b.rating))) {
                throw new functions.https.HttpsError("already-exists", "Ya valoraste esta encomienda anteriormente.");
            }
            const canonicalCourierId = (tripData.assignedCourierId ||
                tripData.courierId ||
                tripData.motorizadoId ||
                (data === null || data === void 0 ? void 0 : data.courierId) ||
                "").toString().trim();
            const customerName = ((callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.name) ||
                (callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.nombre) ||
                (callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.displayName) ||
                tripData.senderName ||
                "Cliente Delivery Express").toString().trim();
            const effectiveCourierRating = (_c = courierRating !== null && courierRating !== void 0 ? courierRating : businessRating) !== null && _c !== void 0 ? _c : 5;
            const effectiveComment = courierComments || comments;
            // Actualizar agregados del motorizado si existe
            if (canonicalCourierId) {
                const courierRef = db.collection("couriers").doc(canonicalCourierId);
                const userCourierRef = db.collection("users").doc(canonicalCourierId);
                const [courierSnapDoc, userCourierSnapDoc] = await Promise.all([
                    transaction.get(courierRef),
                    transaction.get(userCourierRef)
                ]);
                const currentCourierData = courierSnapDoc.exists
                    ? courierSnapDoc.data()
                    : (userCourierSnapDoc.exists ? userCourierSnapDoc.data() : {});
                const currentCourierCount = Number((currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.ratingCount) || 0);
                const currentCourierStars = Number((_d = currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.totalRatingStars) !== null && _d !== void 0 ? _d : (Number((currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.averageRating) || (currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.rating) || 0) * currentCourierCount));
                const newCourierCount = currentCourierCount + 1;
                const newCourierTotalStars = currentCourierStars + effectiveCourierRating;
                const newCourierAverage = Math.round((newCourierTotalStars / newCourierCount) * 10) / 10;
                const courierUpdate = {
                    ratingCount: newCourierCount,
                    totalRatingStars: newCourierTotalStars,
                    averageRating: newCourierAverage,
                    rating: newCourierAverage,
                    updatedAt: now,
                };
                if (courierSnapDoc.exists) {
                    transaction.update(courierRef, courierUpdate);
                }
                else {
                    transaction.set(courierRef, courierUpdate, { merge: true });
                }
                if (userCourierSnapDoc.exists) {
                    transaction.update(userCourierRef, courierUpdate);
                }
                // Subcolección de reseñas del motorizado
                const courierReviewRef = db.collection("couriers").doc(canonicalCourierId).collection("reviews").doc(rawId);
                transaction.set(courierReviewRef, {
                    id: rawId,
                    orderId: rawId,
                    tripId: rawId,
                    reviewType: "X_TO_Y",
                    courierId: canonicalCourierId,
                    uid: callerUid,
                    userName: customerName,
                    authorName: customerName,
                    userPhotoUrl: customerPhotoUrl,
                    rating: effectiveCourierRating,
                    comment: effectiveComment,
                    date: new Date().toLocaleDateString("es-ES"),
                    createdAt: now,
                }, { merge: true });
            }
            // Escribir en raíz /reviews/{rawId}
            transaction.set(reviewRef, {
                id: rawId,
                tripId: rawId,
                orderId: null,
                reviewType: "X_TO_Y",
                customerId: callerUid,
                customerName: customerName,
                courierId: canonicalCourierId,
                courierRating: effectiveCourierRating,
                rating: effectiveCourierRating,
                courierComments: effectiveComment,
                comment: effectiveComment,
                createdAt: now,
                updatedAt: now,
            }, { merge: true });
            // Actualizar encomienda canónica /deliveryTrips/{rawId}
            const tripRef = db.collection("deliveryTrips").doc(rawId);
            transaction.update(tripRef, {
                hasBeenRated: true,
                ratedAt: now,
                courierRating: effectiveCourierRating,
                courierRatingComment: effectiveComment,
                hasRatedCourier: true,
                updatedAt: now,
            });
            // Actualizar espejo en /orders/{rawId} si existiese
            const mirrorOrderRef = db.collection("orders").doc(rawId);
            transaction.set(mirrorOrderRef, {
                hasBeenRated: true,
                ratedAt: now,
                courierRating: effectiveCourierRating,
                hasRatedCourier: true,
                updatedAt: now,
            }, { merge: true });
            return {
                success: true,
                tripId: rawId,
                reviewType: "X_TO_Y",
                courierRating: effectiveCourierRating,
            };
        }
        // ────────────────────────────────────────────────────────────────────────
        // RAMA B: RESEÑA DE PEDIDO DE COMERCIO (DOMINIO A)
        // ────────────────────────────────────────────────────────────────────────
        const orderData = (orderSnap === null || orderSnap === void 0 ? void 0 : orderSnap.data()) || {};
        const orderId = rawId;
        // Validar pertenencia del cliente (Ownership)
        const customerId = (orderData.clienteId || orderData.customerId || "").toString().trim();
        if (customerId && customerId !== callerUid) {
            throw new functions.https.HttpsError("permission-denied", "No tienes autorización para calificar un pedido ajeno.");
        }
        // Validar entrega física estricta (Elegibilidad)
        const rawStatus = (orderData.status || orderData.estado || "").toString().toLowerCase().trim();
        let isPhysicallyDelivered = false;
        if (rawStatus === "delivered" || rawStatus === "entregado") {
            isPhysicallyDelivered = true;
        }
        else if (rawStatus === "completed" || rawStatus === "completado") {
            isPhysicallyDelivered = Boolean(orderData.deliveredAt);
        }
        if (!isPhysicallyDelivered) {
            throw new functions.https.HttpsError("failed-precondition", "El pedido aún no ha sido entregado físicamente al cliente.");
        }
        // Validar documento previo de review (Idempotencia granular)
        const reviewRef = db.collection("reviews").doc(orderId);
        const reviewSnap = await transaction.get(reviewRef);
        const existingReview = reviewSnap.exists ? reviewSnap.data() : null;
        const bizAlreadyRated = Boolean((existingReview === null || existingReview === void 0 ? void 0 : existingReview.businessRating) || orderData.rating > 0);
        const courierAlreadyRated = Boolean((existingReview === null || existingReview === void 0 ? void 0 : existingReview.courierRating) || orderData.courierRating > 0);
        const willRateBiz = businessRating !== null && !bizAlreadyRated;
        const willRateCourier = courierRating !== null && !courierAlreadyRated;
        if (!willRateBiz && !willRateCourier) {
            throw new functions.https.HttpsError("already-exists", "Las calificaciones enviadas ya han sido registradas previamente para este pedido.");
        }
        // Resolver identidades canónicas
        const businessId = (orderData.businessId || orderData.restaurantId || orderData.comercioId || (data === null || data === void 0 ? void 0 : data.businessId) || "").toString().trim();
        const canonicalCourierId = (orderData.assignedCourierId || orderData.motorizadoId || (data === null || data === void 0 ? void 0 : data.courierId) || "").toString().trim();
        const customerName = ((callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.name) || (callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.nombre) || (callerUserData === null || callerUserData === void 0 ? void 0 : callerUserData.displayName) || orderData.customerName || "Cliente BlueSystem").toString().trim();
        // Leer documentos de agregados para Comercio
        const bizRef = businessId ? db.collection("businesses").doc(businessId) : null;
        const userBizRef = businessId ? db.collection("users").doc(businessId) : null;
        const bizSnap = bizRef ? await transaction.get(bizRef) : null;
        const userBizSnap = userBizRef ? await transaction.get(userBizRef) : null;
        // Leer documentos de agregados para Motorizado (si aplica)
        const courierRef = canonicalCourierId ? db.collection("couriers").doc(canonicalCourierId) : null;
        const userCourierRef = canonicalCourierId ? db.collection("users").doc(canonicalCourierId) : null;
        const courierSnap = courierRef ? await transaction.get(courierRef) : null;
        const userCourierSnap = userCourierRef ? await transaction.get(userCourierRef) : null;
        // Calcular nuevos agregados de Comercio y guardar en subcolección canónica /businesses/{id}/reviews
        if (willRateBiz && businessRating !== null && bizRef && bizSnap) {
            const currentBizData = bizSnap.exists ? bizSnap.data() : ((userBizSnap === null || userBizSnap === void 0 ? void 0 : userBizSnap.exists) ? userBizSnap.data() : {});
            const currentCount = Number((currentBizData === null || currentBizData === void 0 ? void 0 : currentBizData.ratingCount) || 0);
            const currentTotalStars = Number((_e = currentBizData === null || currentBizData === void 0 ? void 0 : currentBizData.totalRatingStars) !== null && _e !== void 0 ? _e : (Number((currentBizData === null || currentBizData === void 0 ? void 0 : currentBizData.averageRating) || (currentBizData === null || currentBizData === void 0 ? void 0 : currentBizData.rating) || 0) * currentCount));
            const newCount = currentCount + 1;
            const newTotalStars = currentTotalStars + businessRating;
            const newAverage = Math.round((newTotalStars / newCount) * 10) / 10;
            const bizUpdate = {
                ratingCount: newCount,
                totalRatingStars: newTotalStars,
                averageRating: newAverage,
                rating: newAverage,
                updatedAt: now,
            };
            if (bizSnap.exists) {
                transaction.update(bizRef, bizUpdate);
            }
            else {
                transaction.set(bizRef, bizUpdate, { merge: true });
            }
            if (userBizRef && userBizSnap && userBizSnap.exists) {
                transaction.update(userBizRef, bizUpdate);
            }
            // Escritura canónica en subcolección del comercio para "Opiniones y Reseñas"
            const bizReviewRef = db.collection("businesses").doc(businessId).collection("reviews").doc(orderId);
            transaction.set(bizReviewRef, {
                id: orderId,
                businessId: businessId,
                branchId: orderData.branchId || "",
                uid: callerUid,
                userName: customerName,
                authorName: customerName,
                userPhotoUrl: customerPhotoUrl,
                rating: Number(businessRating),
                comment: comments,
                date: new Date().toLocaleDateString("es-ES"),
                createdAt: now,
            }, { merge: true });
        }
        // Calcular nuevos agregados de Motorizado y guardar en subcolección /couriers/{id}/reviews
        if (willRateCourier && courierRating !== null && canonicalCourierId && courierRef) {
            const currentCourierData = courierSnap && courierSnap.exists ? courierSnap.data() : ((userCourierSnap === null || userCourierSnap === void 0 ? void 0 : userCourierSnap.exists) ? userCourierSnap.data() : {});
            const currentCourierCount = Number((currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.ratingCount) || 0);
            const currentCourierStars = Number((_f = currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.totalRatingStars) !== null && _f !== void 0 ? _f : (Number((currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.averageRating) || (currentCourierData === null || currentCourierData === void 0 ? void 0 : currentCourierData.rating) || 0) * currentCourierCount));
            const newCourierCount = currentCourierCount + 1;
            const newCourierTotalStars = currentCourierStars + courierRating;
            const newCourierAverage = Math.round((newCourierTotalStars / newCourierCount) * 10) / 10;
            const courierUpdate = {
                ratingCount: newCourierCount,
                totalRatingStars: newCourierTotalStars,
                averageRating: newCourierAverage,
                rating: newCourierAverage,
                updatedAt: now,
            };
            if (courierSnap && courierSnap.exists) {
                transaction.update(courierRef, courierUpdate);
            }
            else {
                transaction.set(courierRef, courierUpdate, { merge: true });
            }
            if (userCourierRef && userCourierSnap && userCourierSnap.exists) {
                transaction.update(userCourierRef, courierUpdate);
            }
            // Escritura en subcolección de reseñas del motorizado
            const courierReviewRef = db.collection("couriers").doc(canonicalCourierId).collection("reviews").doc(orderId);
            transaction.set(courierReviewRef, {
                id: orderId,
                orderId: orderId,
                courierId: canonicalCourierId,
                uid: callerUid,
                userName: customerName,
                authorName: customerName,
                userPhotoUrl: customerPhotoUrl,
                rating: Number(courierRating),
                comment: courierComments || comments,
                date: new Date().toLocaleDateString("es-ES"),
                createdAt: now,
            }, { merge: true });
        }
        // Escribir documento de review en raíz /reviews/{orderId}
        const reviewPayload = {
            id: orderId,
            orderId: orderId,
            tripId: null,
            reviewType: "COMMERCE",
            customerId: callerUid,
            customerName: customerName,
            businessId: businessId,
            courierId: canonicalCourierId,
            updatedAt: now,
        };
        if (!existingReview) {
            reviewPayload.createdAt = now;
            reviewPayload.timestamp = now;
        }
        if (willRateBiz && businessRating !== null) {
            reviewPayload.businessRating = businessRating;
            reviewPayload.rating = businessRating;
            reviewPayload.comments = comments;
            reviewPayload.comment = comments;
        }
        if (willRateCourier && courierRating !== null) {
            reviewPayload.courierRating = courierRating;
            reviewPayload.courierComments = courierComments || (comments && !willRateBiz ? comments : "");
        }
        transaction.set(reviewRef, reviewPayload, { merge: true });
        // Actualizar orden canónica
        const orderRef = db.collection("orders").doc(orderId);
        const orderUpdate = {
            hasBeenRated: true,
            ratedAt: now,
            updatedAt: now,
        };
        if (willRateBiz && businessRating !== null) {
            orderUpdate.rating = businessRating;
            orderUpdate.ratingComment = comments;
            orderUpdate.hasRatedBusiness = true;
        }
        if (willRateCourier && courierRating !== null) {
            orderUpdate.courierRating = courierRating;
            orderUpdate.courierRatingComment = courierComments || (comments && !willRateBiz ? comments : "");
            orderUpdate.hasRatedCourier = true;
        }
        transaction.update(orderRef, orderUpdate);
        return {
            success: true,
            orderId: orderId,
            reviewType: "COMMERCE",
            businessRating: willRateBiz ? businessRating : ((existingReview === null || existingReview === void 0 ? void 0 : existingReview.businessRating) || null),
            courierRating: willRateCourier ? courierRating : ((existingReview === null || existingReview === void 0 ? void 0 : existingReview.courierRating) || null),
        };
    });
});
//# sourceMappingURL=reviews.js.map