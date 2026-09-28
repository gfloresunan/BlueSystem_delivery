"use strict";
/**
 * BlueSystem Delivery Enterprise — HealthCheckScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Verificación programada cada hora de la salud de componentes (Firestore, Storage, FCM, Functions).
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
exports.healthCheckScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
exports.healthCheckScheduler = functions.pubsub
    .schedule("0 * * * *") // Cada hora
    .timeZone("America/Managua")
    .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_health_${Date.now()}`;
    logger_1.Logger.info("Inicio de ejecución de HealthCheckScheduler", {
        module: "HealthCheckScheduler",
        requestId,
    });
    try {
        // 1. Probar latencia de lectura/escritura en Firestore
        const pingDocRef = db.collection("system_health").doc("health_ping");
        const readStart = Date.now();
        await pingDocRef.set({
            lastPingAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "HEALTHY",
        });
        const dbLatencyMs = Date.now() - readStart;
        const duration = Date.now() - startTime;
        logger_1.Logger.info(`Health check del sistema OK. Latencia DB: ${dbLatencyMs}ms. Duración total: ${duration}ms`, {
            module: "HealthCheckScheduler",
            requestId,
            duration,
            dbLatencyMs,
        });
        await db.collection("system_metrics").add({
            service: "health_check",
            dbLatencyMs,
            totalDurationMs: duration,
            status: "HEALTHY",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        logger_1.Logger.error("Error en HealthCheckScheduler execution", error, {
            module: "HealthCheckScheduler",
            requestId,
        });
    }
});
//# sourceMappingURL=healthCheck.js.map