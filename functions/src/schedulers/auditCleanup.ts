/**
 * BlueSystem Delivery Enterprise — AuditCleanupScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Limpieza semanal de logs de auditoría y tokens de sesión expirados (>180 días).
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();

export const auditCleanupScheduler = functions.pubsub
  .schedule("0 3 * * 0") // Ejecución semanal los Domingos a las 3:00 AM
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_audit_clean_${Date.now()}`;
    const oneHundredEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    Logger.info("Inicio de ejecución de AuditCleanupScheduler", {
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
        Logger.info("No hay logs de auditoría expirados para purgar.", {
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
      Logger.audit(
        "AUDIT_LOGS_CLEANUP_180_DAYS",
        "AuditCleanupScheduler",
        { deletedCount, thresholdDate: oneHundredEightyDaysAgo.toISOString() },
        { module: "AuditCleanupScheduler", requestId, duration }
      );
    } catch (error: any) {
      Logger.error("Error en AuditCleanupScheduler execution", error, {
        module: "AuditCleanupScheduler",
        requestId,
      });
    }
  });
