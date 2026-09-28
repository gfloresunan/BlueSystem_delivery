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
exports.xToYDispatchScheduler = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const xToYDispatchEngine_1 = require("../services/xToYDispatchEngine");
const logger_1 = require("../shared/logger/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Cloud Scheduler: Worker periódico para gestión del ciclo de vida del despacho X→Y.
 * Se ejecuta cada 1 minuto (America/Managua).
 *
 * Garantiza de forma server-authoritative:
 * 1. Progresión a EXPANDED_15KM (>= 3 min)
 * 2. Progresión a EXPANDED_30KM (>= 6 min)
 * 3. Cancelación atómica por TIMEOUT (>= 10 min) aún si la app del cliente o couriers está cerrada.
 */
exports.xToYDispatchScheduler = functions.pubsub
    .schedule("every 1 minutes")
    .timeZone("America/Managua")
    .onRun(async (context) => {
    const startTime = Date.now();
    logger_1.Logger.info("[X2Y_SCHEDULER] Iniciando revisión periódica de encomiendas X→Y activas");
    try {
        // Consultar viajes pendientes sin motorizado asignado
        const pendingTripsSnap = await db
            .collection("deliveryTrips")
            .where("status", "in", ["PENDING", "pending"])
            .limit(50)
            .get();
        if (pendingTripsSnap.empty) {
            logger_1.Logger.info("[X2Y_SCHEDULER] No hay encomiendas X→Y pendientes de asignación.");
            return null;
        }
        let processedCount = 0;
        let timedOutCount = 0;
        let expandedCount = 0;
        for (const doc of pendingTripsSnap.docs) {
            const tripData = doc.data() || {};
            const assigned = tripData.assignedCourierId || tripData.courierId || tripData.motorizadoId;
            // Omitir si ya tiene motorizado asignado
            if (assigned)
                continue;
            try {
                const res = await (0, xToYDispatchEngine_1.advanceTripDispatch)(doc.id);
                processedCount++;
                if (res.stage === "TIMEOUT")
                    timedOutCount++;
                if (res.stage === "EXPANDED_15KM" || res.stage === "EXPANDED_30KM")
                    expandedCount++;
            }
            catch (tripErr) {
                logger_1.Logger.error(`[X2Y_SCHEDULER] Error procesando viaje ${doc.id}`, tripErr);
            }
        }
        const durationMs = Date.now() - startTime;
        logger_1.Logger.info(`[X2Y_SCHEDULER] Fin de ejecución (${durationMs}ms): Procesados=${processedCount}, Expansiones=${expandedCount}, Timeouts=${timedOutCount}`);
    }
    catch (err) {
        logger_1.Logger.error("[X2Y_SCHEDULER] Error general en xToYDispatchScheduler", err);
    }
    return null;
});
//# sourceMappingURL=xToYDispatchScheduler.js.map