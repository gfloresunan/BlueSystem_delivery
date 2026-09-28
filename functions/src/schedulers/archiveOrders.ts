/**
 * BlueSystem Delivery Enterprise — ArchiveOrdersScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Cumplimiento incondicional de ADR-003:
 * Traslada pedidos terminados (delivered/cancelled) con antigüedad >90 días
 * desde la colección activa /orders a /orders_archive.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();

export const archiveOrdersScheduler = functions.pubsub
  .schedule("0 2 * * *") // Ejecución diaria a las 2:00 AM
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_archive_${Date.now()}`;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    Logger.info("Inicio de ejecución de ArchiveOrdersScheduler", {
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
        Logger.info("No hay pedidos para archivar superados los 90 días.", {
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
        batch.set(archiveRef, {
          ...data,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          archivedBy: "ArchiveOrdersScheduler",
        });
        batch.delete(doc.ref);
        archivedCount++;
      });

      await batch.commit();

      const duration = Date.now() - startTime;
      Logger.audit(
        "ARCHIVE_ORDERS_90_DAYS",
        "ArchiveOrdersScheduler",
        { archivedCount, thresholdDate: ninetyDaysAgo.toISOString() },
        { module: "ArchiveOrdersScheduler", requestId, duration }
      );
    } catch (error: any) {
      Logger.error("Error en ArchiveOrdersScheduler execution", error, {
        module: "ArchiveOrdersScheduler",
        requestId,
      });
    }
  });
