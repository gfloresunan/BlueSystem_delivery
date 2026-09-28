"use strict";
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
exports.notificationQueueScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const notificationQueueWorker_1 = require("../services/notificationQueueWorker");
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
/**
 * Cloud Scheduler: Worker periódico para procesar campañas en QUEUED, RETRY y recuperar PROCESSING colgadas.
 * Se ejecuta cada 1 minuto.
 */
exports.notificationQueueScheduler = functions.pubsub
    .schedule("every 1 minutes")
    .timeZone("America/Managua")
    .onRun(async (context) => {
    const startTime = Date.now();
    const workerId = `scheduler_${Date.now()}`;
    logger_1.Logger.info("Inicio de ejecución de notificationQueueScheduler", {
        module: "notificationQueueScheduler",
        workerId,
    });
    try {
        // 1. Campañas en QUEUED
        const queuedSnap = await db
            .collection("notification_campaigns")
            .where("status", "==", "QUEUED")
            .limit(20)
            .get();
        // 2. Campañas en RETRY
        const retrySnap = await db
            .collection("notification_campaigns")
            .where("status", "==", "RETRY")
            .limit(20)
            .get();
        // 3. Campañas en PROCESSING (para detectar abandonadas)
        const processingSnap = await db
            .collection("notification_campaigns")
            .where("status", "==", "PROCESSING")
            .limit(20)
            .get();
        const candidateDocIds = new Set();
        queuedSnap.forEach((d) => candidateDocIds.add(d.id));
        retrySnap.forEach((d) => candidateDocIds.add(d.id));
        processingSnap.forEach((d) => candidateDocIds.add(d.id));
        if (candidateDocIds.size === 0) {
            logger_1.Logger.info("No hay campañas pendientes ni en cola para procesar.", {
                module: "notificationQueueScheduler",
                workerId,
                duration: Date.now() - startTime,
            });
            return;
        }
        let processedCount = 0;
        for (const campaignId of candidateDocIds) {
            const result = await (0, notificationQueueWorker_1.processCampaign)(campaignId, workerId);
            if (result.claimed) {
                processedCount++;
            }
        }
        const duration = Date.now() - startTime;
        logger_1.Logger.audit("NOTIFICATION_QUEUE_SCHEDULER_RUN", "notificationQueueScheduler", { candidateCount: candidateDocIds.size, processedCount }, { module: "notificationQueueScheduler", workerId, duration });
    }
    catch (error) {
        logger_1.Logger.error("Error en notificationQueueScheduler execution", error, {
            module: "notificationQueueScheduler",
            workerId,
        });
    }
});
//# sourceMappingURL=notificationQueue.js.map