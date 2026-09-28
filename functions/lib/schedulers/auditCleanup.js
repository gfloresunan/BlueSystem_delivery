"use strict";
/**
 * BlueSystem Delivery Enterprise — AuditCleanupScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Limpieza semanal de logs de auditoría y tokens de sesión expirados (>180 días).
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
exports.auditCleanupScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
exports.auditCleanupScheduler = functions.pubsub
    .schedule("0 3 * * 0") // Ejecución semanal los Domingos a las 3:00 AM
    .timeZone("America/Managua")
    .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_audit_clean_${Date.now()}`;
    const oneHundredEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    logger_1.Logger.info("Inicio de ejecución de AuditCleanupScheduler", {
        module: "AuditCleanupScheduler",
        requestId,
    });
    try {
        const snap = await db
            .collection("audit_logs")
            .where("timestamp", "<=", oneHundredEightyDaysAgo)
            .limit(500)
            .get();
        if (snap.empty) {
            logger_1.Logger.info("No hay logs de auditoría expirados para purgar.", {
                module: "AuditCleanupScheduler",
                requestId,
                duration: Date.now() - startTime,
            });
            return;
        }
        const batch = db.batch();
        let deletedCount = 0;
        snap.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        await batch.commit();
        const duration = Date.now() - startTime;
        logger_1.Logger.audit("AUDIT_LOGS_CLEANUP_180_DAYS", "AuditCleanupScheduler", { deletedCount, thresholdDate: oneHundredEightyDaysAgo.toISOString() }, { module: "AuditCleanupScheduler", requestId, duration });
    }
    catch (error) {
        logger_1.Logger.error("Error en AuditCleanupScheduler execution", error, {
            module: "AuditCleanupScheduler",
            requestId,
        });
    }
});
//# sourceMappingURL=auditCleanup.js.map