"use strict";
/**
 * BlueSystem Delivery Enterprise — Backfill & Migración de OrderCode (BSD-HUMAN-ORDER-CODE-001)
 * Idempotente, seguro, auditable y con soporte para simulación previa (Dry-Run).
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
exports.adminBackfillOrderCodes = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const orderCodeUtils_1 = require("../shared/orderCodeUtils");
const db = admin.firestore();
function isPlatformAdmin(context) {
    if (!context.auth)
        return false;
    const token = context.auth.token || {};
    const role = (token.role || token.eiamRole || "").toString().toUpperCase();
    return (["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"].includes(role) ||
        token.admin === true ||
        token.isSuperAdmin === true);
}
exports.adminBackfillOrderCodes = functions.https.onCall(async (data, context) => {
    if (!isPlatformAdmin(context)) {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores de plataforma pueden ejecutar la migración de orderCode.");
    }
    const dryRun = (data === null || data === void 0 ? void 0 : data.dryRun) !== false; // Por defecto dryRun es true (seguridad first)
    const limit = Math.min(Number(data === null || data === void 0 ? void 0 : data.batchLimit) || 500, 1000);
    const specificBiz = ((data === null || data === void 0 ? void 0 : data.specificBusinessId) || "").trim();
    let query = db.collection("orders");
    if (specificBiz) {
        query = query.where("businessId", "==", specificBiz);
    }
    const snap = await query.get();
    let totalScanned = 0;
    let totalToMigrate = 0;
    let totalSkippedAlreadyHasCode = 0;
    let totalSkippedXToY = 0;
    let totalSkippedNoBusiness = 0;
    // Agrupar órdenes pendientes de código por businessId
    const businessOrdersMap = new Map();
    snap.docs.forEach((docSnap) => {
        totalScanned++;
        const d = docSnap.data();
        // Ignorar encomiendas X→Y
        if (d.serviceType === "X_TO_Y_DELIVERY") {
            totalSkippedXToY++;
            return;
        }
        // Si ya tiene orderCode, respetar inmutabilidad (Idempotencia)
        if (d.orderCode && typeof d.orderCode === "string" && d.orderCode.trim().length > 0) {
            totalSkippedAlreadyHasCode++;
            return;
        }
        const bizId = (d.businessId || "").toString().trim();
        if (!bizId) {
            totalSkippedNoBusiness++;
            return;
        }
        totalToMigrate++;
        // Extraer timestamp
        let createdAtMs = 0;
        if (d.createdAt && typeof d.createdAt.toMillis === "function") {
            createdAtMs = d.createdAt.toMillis();
        }
        else if (d.createdAt instanceof Date) {
            createdAtMs = d.createdAt.getTime();
        }
        else if (typeof d.createdAt === "number") {
            createdAtMs = d.createdAt;
        }
        else {
            createdAtMs = Date.now();
        }
        if (!businessOrdersMap.has(bizId)) {
            businessOrdersMap.set(bizId, []);
        }
        businessOrdersMap.get(bizId).push({
            id: docSnap.id,
            ref: docSnap.ref,
            createdAtMs,
        });
    });
    const breakdownByBusiness = [];
    // Procesar cada comercio en orden cronológico
    const allUpdates = [];
    const counterUpdates = [];
    for (const [bizId, orderList] of businessOrdersMap.entries()) {
        // Ordenar por fecha de creación ascendente para mantener secuencia histórica correcta
        orderList.sort((a, b) => a.createdAtMs - b.createdAtMs);
        // Obtener o resolver prefijo y secuencia actual del comercio
        const counterRef = db.collection("counters").doc(`orders_${bizId}`);
        const counterDoc = await counterRef.get();
        let prefix = "";
        let currentSeq = 1;
        if (counterDoc.exists) {
            const cData = counterDoc.data() || {};
            prefix = cData.orderCodePrefix || "";
            currentSeq = Number(cData.nextSequence) || 1;
        }
        if (!prefix) {
            const bizDoc = await db.collection("businesses").doc(bizId).get();
            const bizData = bizDoc.exists ? bizDoc.data() : {};
            prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, bizId);
        }
        const startingSeq = currentSeq;
        let runningSeq = currentSeq;
        let startSample = "";
        let endSample = "";
        orderList.slice(0, limit).forEach((ordItem) => {
            const generated = (0, orderCodeUtils_1.formatOrderCode)(prefix, runningSeq);
            if (!startSample)
                startSample = generated.orderCode;
            endSample = generated.orderCode;
            allUpdates.push({
                ref: ordItem.ref,
                data: {
                    orderCode: generated.orderCode,
                    orderShortCode: generated.orderShortCode,
                    orderSequence: generated.orderSequence,
                    orderCodePrefix: generated.orderCodePrefix,
                },
            });
            runningSeq++;
        });
        const endingSeq = runningSeq - 1;
        breakdownByBusiness.push({
            businessId: bizId,
            prefix,
            ordersCount: orderList.length,
            startingSequence: startingSeq,
            endingSequence: endingSeq,
            sampleCodeStart: startSample,
            sampleCodeEnd: endSample,
        });
        counterUpdates.push({
            ref: counterRef,
            data: {
                businessId: bizId,
                orderCodePrefix: prefix,
                lastSequence: endingSeq,
                nextSequence: runningSeq,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
        });
    }
    // Si NO es simulación, ejecutar en lotes atómicos
    if (!dryRun && allUpdates.length > 0) {
        const BATCH_SIZE = 400;
        for (let i = 0; i < allUpdates.length; i += BATCH_SIZE) {
            const chunk = allUpdates.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            chunk.forEach((item) => {
                batch.update(item.ref, item.data);
            });
            await batch.commit();
        }
        // Actualizar contadores
        for (let i = 0; i < counterUpdates.length; i += BATCH_SIZE) {
            const chunk = counterUpdates.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            chunk.forEach((item) => {
                batch.set(item.ref, item.data, { merge: true });
            });
            await batch.commit();
        }
    }
    return {
        dryRun,
        totalScanned,
        totalToMigrate,
        totalMigratedApplied: dryRun ? 0 : allUpdates.length,
        totalSkippedAlreadyHasCode,
        totalSkippedXToY,
        totalSkippedNoBusiness,
        businessesCount: businessOrdersMap.size,
        breakdownByBusiness,
    };
});
//# sourceMappingURL=orderCodeBackfill.js.map