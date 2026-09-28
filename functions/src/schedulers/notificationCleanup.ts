/**
 * BlueSystem Delivery Enterprise — NotificationCleanupScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Purga nocturna de tokens FCM declarados inválidos y dispositivos huérfanos.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();

export const notificationCleanupScheduler = functions.pubsub
  .schedule("0 4 * * *") // Ejecución diaria a las 4:00 AM
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_notif_clean_${Date.now()}`;

    Logger.info("Inicio de ejecución de NotificationCleanupScheduler", {
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
        Logger.info("No hay dispositivos o tokens inválidos para limpiar.", {
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
      Logger.audit(
        "NOTIFICATION_DEVICES_PURGE",
        "NotificationCleanupScheduler",
        { cleanedCount },
        { module: "NotificationCleanupScheduler", requestId, duration }
      );
    } catch (error: any) {
      Logger.error("Error en NotificationCleanupScheduler execution", error, {
        module: "NotificationCleanupScheduler",
        requestId,
      });
    }
  });
