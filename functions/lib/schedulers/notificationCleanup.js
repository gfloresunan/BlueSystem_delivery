"use strict";
/**
 * BlueSystem Delivery Enterprise — NotificationCleanupScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Purga nocturna de tokens FCM declarados inválidos y dispositivos huérfanos.
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
exports.notificationCleanupScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
exports.notificationCleanupScheduler = functions.pubsub
    .schedule("0 4 * * *") // Ejecución diaria a las 4:00 AM
    .timeZone("America/Managua")
    .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_notif_clean_${Date.now()}`;
    logger_1.Logger.info("Inicio de ejecución de NotificationCleanupScheduler", {
        module: "NotificationCleanupScheduler",
        requestId,
    });
    try {
        // 1. Dispositivos con token explícitamente marcado como 'invalid' o desactivados
        const snap = await db
            .collection("user_devices")
            .where("isActive", "==", false)
            .limit(500)
            .get();
        if (snap.empty) {
            logger_1.Logger.info("No hay dispositivos o tokens inválidos para limpiar.", {
                module: "NotificationCleanupScheduler",
                requestId,
                duration: Date.now() - startTime,
            });
            return;
        }
        const batch = db.batch();
        let cleanedCount = 0;
        snap.forEach((doc) => {
            batch.delete(doc.ref);
            cleanedCount++;
        });
        await batch.commit();
        const duration = Date.now() - startTime;
        logger_1.Logger.audit("NOTIFICATION_DEVICES_PURGE", "NotificationCleanupScheduler", { cleanedCount }, { module: "NotificationCleanupScheduler", requestId, duration });
    }
    catch (error) {
        logger_1.Logger.error("Error en NotificationCleanupScheduler execution", error, {
            module: "NotificationCleanupScheduler",
            requestId,
        });
    }
});
//# sourceMappingURL=notificationCleanup.js.map