import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { processCampaign } from "../services/notificationQueueWorker";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();

/**
 * Cloud Scheduler: Worker periódico para procesar campañas en QUEUED, RETRY y recuperar PROCESSING colgadas.
 * Se ejecuta cada 1 minuto.
 */
export const notificationQueueScheduler = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    const workerId = `scheduler_${Date.now()}`;

    Logger.info("Inicio de ejecución de notificationQueueScheduler", {
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

      const candidateDocIds = new Set<string>();
      queuedSnap.forEach((d) => candidateDocIds.add(d.id));
      retrySnap.forEach((d) => candidateDocIds.add(d.id));
      processingSnap.forEach((d) => candidateDocIds.add(d.id));

      if (candidateDocIds.size === 0) {
        Logger.info("No hay campañas pendientes ni en cola para procesar.", {
          module: "notificationQueueScheduler",
          workerId,
          duration: Date.now() - startTime,
        });
        return;
      }

      let processedCount = 0;
      for (const campaignId of candidateDocIds) {
        const result = await processCampaign(campaignId, workerId);
        if (result.claimed) {
          processedCount++;
        }
      }

      const duration = Date.now() - startTime;
      Logger.audit(
        "NOTIFICATION_QUEUE_SCHEDULER_RUN",
        "notificationQueueScheduler",
        { candidateCount: candidateDocIds.size, processedCount },
        { module: "notificationQueueScheduler", workerId, duration }
      );
    } catch (error: any) {
      Logger.error("Error en notificationQueueScheduler execution", error, {
        module: "notificationQueueScheduler",
        workerId,
      });
    }
  });
