"use strict";
/**
 * BlueSystem Delivery Enterprise — ArchiveOrdersScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Cumplimiento incondicional de ADR-003:
 * Traslada pedidos terminados (delivered/cancelled) con antigüedad >90 días
 * desde la colección activa /orders a /orders_archive.
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
exports.archiveOrdersScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
exports.archiveOrdersScheduler = functions.pubsub
    .schedule("0 2 * * *") // Ejecución diaria a las 2:00 AM
    .timeZone("America/Managua")
    .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_archive_${Date.now()}`;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    logger_1.Logger.info("Inicio de ejecución de ArchiveOrdersScheduler", {
        module: "ArchiveOrdersScheduler",
        requestId,
    });
    try {
        const snap = await db
            .collection("orders")
            .where("createdAt", "<=", ninetyDaysAgo)
            .limit(500)
            .get();
        if (snap.empty) {
            logger_1.Logger.info("No hay pedidos para archivar superados los 90 días.", {
                module: "ArchiveOrdersScheduler",
                requestId,
                duration: Date.now() - startTime,
            });
            return;
        }
        let archivedCount = 0;
        const batch = db.batch();
        snap.forEach((doc) => {
            const data = doc.data();
            const archiveRef = db.collection("orders_archive").doc(doc.id);
            batch.set(archiveRef, Object.assign(Object.assign({}, data), { archivedAt: admin.firestore.FieldValue.serverTimestamp(), archivedBy: "ArchiveOrdersScheduler" }));
            batch.delete(doc.ref);
            archivedCount++;
        });
        await batch.commit();
        const duration = Date.now() - startTime;
        logger_1.Logger.audit("ARCHIVE_ORDERS_90_DAYS", "ArchiveOrdersScheduler", { archivedCount, thresholdDate: ninetyDaysAgo.toISOString() }, { module: "ArchiveOrdersScheduler", requestId, duration });
    }
    catch (error) {
        logger_1.Logger.error("Error en ArchiveOrdersScheduler execution", error, {
            module: "ArchiveOrdersScheduler",
            requestId,
        });
    }
});
//# sourceMappingURL=archiveOrders.js.map