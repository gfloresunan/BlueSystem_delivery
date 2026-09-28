"use strict";
/**
 * BlueSystem Delivery Enterprise — TopSellingScheduler
 * Actividad: BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001 (P1-01)
 *
 * Título oficial: aggregateTopSellingDaily
 * Trigger: Scheduled Cloud Function diaria a las 02:00 UTC (0 2 * * *)
 *
 * Cumplimiento del Contrato Canónico:
 * 1. Ventana móvil exacta de 30 días (now - 30 days).
 * 2. Agregación autoritativa de unidades vendidas (sum of item.quantity).
 * 3. Filtrado estricto de órdenes calificadas:
 *    - Aceptados: delivered, completed, entregado.
 *    - Excluidos: cancelled, rejected, refunded, in_transit, preparing, pending, test.
 *    - Excluidos: isTest === true || testOrder === true.
 * 4. Zero Reset obligatorio: Comercios sin ventas calificadas en la ventana móvil quedan en unitsSold30d = 0.
 * 5. Idempotencia estricta: Múltiples ejecuciones recalculan el valor exacto de la ventana sin incrementos duplicados.
 * 6. Batching seguro en Firestore (lotes <= 450).
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
exports.aggregateTopSellingDaily = exports.TOP_SELLING_WINDOW_DAYS = exports.TOP_SELLING_TIMEZONE = exports.TOP_SELLING_CRON_SCHEDULE = void 0;
exports.calculateAuthoritativeUnitsSold30d = calculateAuthoritativeUnitsSold30d;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
function getDb() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.firestore();
}
exports.TOP_SELLING_CRON_SCHEDULE = "0 2 * * *";
exports.TOP_SELLING_TIMEZONE = "UTC";
exports.TOP_SELLING_WINDOW_DAYS = 30;
/**
 * Función pura determinista para cálculo y agregación autoritativa de unidades vendidas.
 * Diseñada para permitir testeo unitario exhaustivo sin dependencias de I/O.
 */
function calculateAuthoritativeUnitsSold30d(orders, eligibleBusinessIds, now = new Date()) {
    const windowMs = exports.TOP_SELLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoTime = now.getTime() - windowMs;
    // 1. Inicializar todos los comercios elegibles en 0 (ZERO RESET CONTRACTUAL)
    const totals = new Map();
    for (const bId of eligibleBusinessIds) {
        if (bId && bId.trim().length > 0) {
            totals.set(bId.trim(), 0);
        }
    }
    // 2. Procesar órdenes calificadas dentro de la ventana móvil
    for (const order of orders) {
        // Excluir órdenes de prueba
        if (order.isTest === true || order.testOrder === true) {
            continue;
        }
        // Validar estado terminal calificado
        const rawStatus = (order.status || order.estado || "").toLowerCase().trim();
        const isQualified = rawStatus === "delivered" ||
            rawStatus === "completed" ||
            rawStatus === "entregado";
        if (!isQualified) {
            continue;
        }
        // Validar ventana temporal de 30 días
        let orderTimeMs = null;
        if (order.createdAt) {
            if (typeof order.createdAt.toMillis === "function") {
                orderTimeMs = order.createdAt.toMillis();
            }
            else if (order.createdAt instanceof Date) {
                orderTimeMs = order.createdAt.getTime();
            }
            else if (typeof order.createdAt === "number") {
                orderTimeMs = order.createdAt;
            }
            else if (typeof order.createdAt === "string") {
                const parsed = Date.parse(order.createdAt);
                if (!isNaN(parsed))
                    orderTimeMs = parsed;
            }
            else if (typeof order.createdAt._seconds === "number") {
                orderTimeMs = order.createdAt._seconds * 1000;
            }
        }
        // Si la orden tiene fecha fuera de la ventana móvil (> 30 días), queda excluida
        if (orderTimeMs !== null && orderTimeMs < thirtyDaysAgoTime) {
            continue;
        }
        // Extraer businessId
        const businessId = (order.businessId ||
            order.comercioId ||
            order.restaurantId ||
            "").trim();
        if (!businessId) {
            continue;
        }
        // Calcular suma de quantity de los ítems
        let totalItemsInOrder = 0;
        const items = order.items || order.productos || [];
        if (Array.isArray(items) && items.length > 0) {
            for (const it of items) {
                const qtyRaw = it.quantity !== undefined ? it.quantity : it.cantidad;
                const qty = Number(qtyRaw);
                totalItemsInOrder += Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
            }
        }
        else {
            totalItemsInOrder = 1;
        }
        const currentUnits = totals.get(businessId) || 0;
        totals.set(businessId, currentUnits + totalItemsInOrder);
    }
    return totals;
}
/**
 * Scheduled Cloud Function: aggregateTopSellingDaily
 * Se ejecuta diariamente a las 02:00 UTC.
 */
exports.aggregateTopSellingDaily = functions.pubsub
    .schedule(exports.TOP_SELLING_CRON_SCHEDULE)
    .timeZone(exports.TOP_SELLING_TIMEZONE)
    .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `top_selling_${Date.now()}`;
    functions.logger.info("[TOP_SELLING_SCHEDULER] Iniciando agregación diaria de Top Selling", {
        requestId,
        schedule: exports.TOP_SELLING_CRON_SCHEDULE,
        timeZone: exports.TOP_SELLING_TIMEZONE,
    });
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - exports.TOP_SELLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const thirtyDaysTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);
        const db = getDb();
        // 1. Obtener todos los comercios para aplicar Zero Reset y asegurar cobertura universal
        const businessesSnap = await db.collection("businesses").get();
        const eligibleBusinessIds = [];
        businessesSnap.forEach((doc) => {
            eligibleBusinessIds.push(doc.id);
        });
        // 2. Consultar órdenes en ventana de 30 días
        const ordersSnap = await db
            .collection("orders")
            .where("createdAt", ">=", thirtyDaysTimestamp)
            .get();
        const ordersData = [];
        ordersSnap.forEach((doc) => {
            const d = doc.data();
            d.id = doc.id;
            ordersData.push(d);
        });
        // 3. Ejecutar cálculo autoritativo determinista
        const totalsMap = calculateAuthoritativeUnitsSold30d(ordersData, eligibleBusinessIds, now);
        // 4. Escritura Server-Authoritative en batches (máximo 450 por lote)
        let updatedCount = 0;
        let batch = db.batch();
        let opCount = 0;
        for (const [bizId, units] of totalsMap.entries()) {
            const bizRef = db.collection("businesses").doc(bizId);
            const userRef = db.collection("users").doc(bizId);
            const payload = {
                unitsSold30d: units,
                unitsSold30dRecalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
                unitsSold30dPipelineVersion: "v2.2_AUTHORITATIVE_DAILY",
            };
            batch.set(bizRef, payload, { merge: true });
            batch.set(userRef, payload, { merge: true });
            opCount += 2;
            updatedCount++;
            if (opCount >= 400) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }
        if (opCount > 0) {
            await batch.commit();
        }
        const durationMs = Date.now() - startTime;
        functions.logger.info(`[TOP_SELLING_SCHEDULER] Agregación completada exitosamente. Comercios actualizados: ${updatedCount} en ${durationMs}ms`, {
            requestId,
            updatedCount,
            durationMs,
        });
        return {
            success: true,
            updatedBusinessesCount: updatedCount,
            durationMs,
        };
    }
    catch (error) {
        functions.logger.error("[TOP_SELLING_SCHEDULER] Error crítico en aggregateTopSellingDaily:", error);
        throw error;
    }
});
