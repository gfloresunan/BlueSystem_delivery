import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { advanceTripDispatch } from "../services/xToYDispatchEngine";
import { Logger } from "../shared/logger/logger";

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
export const xToYDispatchScheduler = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    Logger.info("[X2Y_SCHEDULER] Iniciando revisión periódica de encomiendas X→Y activas");

    try {
      // Consultar viajes pendientes sin motorizado asignado
      const pendingTripsSnap = await db
        .collection("deliveryTrips")
        .where("status", "in", ["PENDING", "pending"])
        .limit(50)
        .get();

      if (pendingTripsSnap.empty) {
        Logger.info("[X2Y_SCHEDULER] No hay encomiendas X→Y pendientes de asignación.");
        return null;
      }

      let processedCount = 0;
      let timedOutCount = 0;
      let expandedCount = 0;

      for (const doc of pendingTripsSnap.docs) {
        const tripData = doc.data() || {};
        const assigned = tripData.assignedCourierId || tripData.courierId || tripData.motorizadoId;

        // Omitir si ya tiene motorizado asignado
        if (assigned) continue;

        try {
          const res = await advanceTripDispatch(doc.id);
          processedCount++;
          if (res.stage === "TIMEOUT") timedOutCount++;
          if (res.stage === "EXPANDED_15KM" || res.stage === "EXPANDED_30KM") expandedCount++;
        } catch (tripErr: any) {
          Logger.error(`[X2Y_SCHEDULER] Error procesando viaje ${doc.id}`, tripErr);
        }
      }

      const durationMs = Date.now() - startTime;
      Logger.info(
        `[X2Y_SCHEDULER] Fin de ejecución (${durationMs}ms): Procesados=${processedCount}, Expansiones=${expandedCount}, Timeouts=${timedOutCount}`
      );
    } catch (err: any) {
      Logger.error("[X2Y_SCHEDULER] Error general en xToYDispatchScheduler", err);
    }

    return null;
  });
