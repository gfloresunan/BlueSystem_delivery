"use strict";
/**
 * BlueSystem Delivery Enterprise — Customer Dashboard Aggregation & Backfill
 * Protocolo: BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001 (Phases 7 & 13)
 *
 * Módulo aislado para la agregación de ventas (unitsSold30d) y backfill histórico seguro.
 * NO toca ni modifica el archivo congelado orders.ts (ADR-015/ADR-016).
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
exports.adminBackfillHistoricalBusinessData = exports.adminRecalculateUnitsSold30d = exports.onOrderDeliveredForDashboard = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Trigger reactivo: cuando una orden pasa a 'delivered' o 'completed',
 * incrementa atómicamente la métrica unitsSold30d en el comercio.
 */
exports.onOrderDeliveredForDashboard = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (!afterData)
        return;
    const beforeStatus = ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) || (beforeData === null || beforeData === void 0 ? void 0 : beforeData.estado) || "").toLowerCase().trim();
    const afterStatus = (afterData.status || afterData.estado || "").toLowerCase().trim();
    const isQualified = (afterStatus === "delivered" || afterStatus === "completed" || afterStatus === "entregado");
    const wasQualified = (beforeStatus === "delivered" || beforeStatus === "completed" || beforeStatus === "entregado");
    // Solo actuar en la transición hacia estado calificado
    if (!isQualified || wasQualified)
        return;
    // Exclusiones estrictas del Addendum P0-06
    if (afterData.isTest === true || afterData.testOrder === true) {
        functions.logger.info(`[DASHBOARD_AGGREGATION] Orden excluida por ser de prueba: ${context.params.orderId}`);
        return;
    }
    const businessId = afterData.businessId || afterData.comercioId || afterData.restaurantId;
    if (!businessId) {
        functions.logger.warn(`[DASHBOARD_AGGREGATION] Orden calificada sin businessId: ${context.params.orderId}`);
        return;
    }
    // Calcular suma de quantity de los ítems
    let totalItems = 0;
    const items = afterData.items || afterData.productos || [];
    if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
            const qty = Number(it.quantity || it.cantidad || 1);
            totalItems += (Number.isFinite(qty) && qty > 0) ? qty : 1;
        }
    }
    else {
        totalItems = 1;
    }
    try {
        const batch = db.batch();
        const bizRef = db.collection("businesses").doc(businessId);
        const userRef = db.collection("users").doc(businessId);
        batch.set(bizRef, {
            unitsSold30d: admin.firestore.FieldValue.increment(totalItems),
            lastSaleAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        batch.set(userRef, {
            unitsSold30d: admin.firestore.FieldValue.increment(totalItems),
            lastSaleAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await batch.commit();
        functions.logger.info(`[DASHBOARD_AGGREGATION] unitsSold30d incrementado +${totalItems} para comercio: ${businessId}`);
    }
    catch (err) {
        functions.logger.error(`[DASHBOARD_AGGREGATION] Error actualizando unitsSold30d para ${businessId}:`, err);
    }
});
/**
 * Callable administrativo: Recalcula de forma autoritativa la métrica unitsSold30d
 * para todos los comercios considerando órdenes entregadas en los últimos 30 días.
 */
exports.adminRecalculateUnitsSold30d = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Se requiere autenticación.");
    }
    // Verificar rol de administrador
    const callerClaims = context.auth.token || {};
    const isPlatformAdmin = callerClaims.role === "ADMIN" || callerClaims.role === "SUPER_ADMIN" || callerClaims.admin === true;
    if (!isPlatformAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Acceso exclusivo para administradores de plataforma.");
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);
    functions.logger.info(`[DASHBOARD_AGGREGATION] Iniciando recalculo de unitsSold30d desde ${thirtyDaysAgo.toISOString()}`);
    const snapshot = await db.collection("orders")
        .where("createdAt", ">=", thirtyDaysTimestamp)
        .get();
    const businessSalesMap = new Map();
    for (const doc of snapshot.docs) {
        const o = doc.data();
        const st = (o.status || o.estado || "").toLowerCase().trim();
        if (st !== "delivered" && st !== "completed" && st !== "entregado")
            continue;
        if (o.isTest === true || o.testOrder === true)
            continue;
        const bizId = o.businessId || o.comercioId || o.restaurantId;
        if (!bizId)
            continue;
        let orderItems = 0;
        const items = o.items || o.productos || [];
        if (Array.isArray(items) && items.length > 0) {
            for (const it of items) {
                const qty = Number(it.quantity || it.cantidad || 1);
                orderItems += (Number.isFinite(qty) && qty > 0) ? qty : 1;
            }
        }
        else {
            orderItems = 1;
        }
        const currentTotal = businessSalesMap.get(bizId) || 0;
        businessSalesMap.set(bizId, currentTotal + orderItems);
    }
    // Actualizar por lotes (batches de 500)
    let updatedCount = 0;
    let batch = db.batch();
    let opCount = 0;
    for (const [bizId, units] of businessSalesMap.entries()) {
        const bizRef = db.collection("businesses").doc(bizId);
        batch.set(bizRef, { unitsSold30d: units, unitsSold30dRecalculatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        opCount++;
        updatedCount++;
        if (opCount >= 450) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
        }
    }
    if (opCount > 0) {
        await batch.commit();
    }
    functions.logger.info(`[DASHBOARD_AGGREGATION] Recalculo finalizado exitosamente. Comercios actualizados: ${updatedCount}`);
    return { success: true, updatedBusinessesCount: updatedCount };
});
/**
 * Callable administrativo: Backfill conservador histórico para activatedAt (Phase 13).
 * Identificado formalmente como HISTORICAL CONSERVATIVE BACKFILL.
 */
exports.adminBackfillHistoricalBusinessData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Se requiere autenticación.");
    }
    const callerClaims = context.auth.token || {};
    const isPlatformAdmin = callerClaims.role === "ADMIN" || callerClaims.role === "SUPER_ADMIN" || callerClaims.admin === true;
    if (!isPlatformAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Acceso exclusivo para administradores de plataforma.");
    }
    const businessesSnap = await db.collection("businesses").get();
    let backfilledCount = 0;
    let batch = db.batch();
    let opCount = 0;
    for (const doc of businessesSnap.docs) {
        const biz = doc.data();
        const updates = {};
        // Si no tiene unitsSold30d, inicializar en 0
        if (biz.unitsSold30d === undefined || biz.unitsSold30d === null) {
            updates.unitsSold30d = 0;
        }
        // Si no tiene activatedAt, realizar backfill conservador a partir de createdAt o registeredAt
        if (!biz.activatedAt) {
            const fallbackTime = biz.createdAt || biz.registeredAt || biz.updatedAt;
            if (fallbackTime) {
                updates.activatedAt = fallbackTime;
                updates.activatedAtBackfillType = "HISTORICAL_CONSERVATIVE_BACKFILL";
                updates.activatedAtBackfilledAt = admin.firestore.FieldValue.serverTimestamp();
            }
        }
        if (Object.keys(updates).length > 0) {
            batch.set(doc.ref, updates, { merge: true });
            opCount++;
            backfilledCount++;
            if (opCount >= 450) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }
    }
    if (opCount > 0) {
        await batch.commit();
    }
    functions.logger.info(`[DASHBOARD_BACKFILL] Backfill conservador completado. Documentos actualizados: ${backfilledCount}`);
    return { success: true, backfilledCount };
});
//# sourceMappingURL=dashboardAggregation.js.map