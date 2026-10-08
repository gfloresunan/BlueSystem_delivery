import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  expandCommerceDispatchStage,
  processCommerceDispatchTimeouts,
  getCommerceProgressiveDispatchConfig,
} from "../services/commerceProgressiveDispatchEngine";
import { Logger } from "../shared/logger/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Scheduler: Worker periódico para gestión del ciclo de vida del despacho progresivo de COMMERCE DELIVERY.
 * Se ejecuta cada 1 minuto (America/Managua).
 *
 * Cumple con el protocolo BSD-COMMERCE-PROGRESSIVE-DISPATCH-001:
 * 1. Procesa timeouts autoritativos (timeoutAt <= now) de forma atómica.
 * 2. Expande etapas progresivas (Stage 1 -> 2 -> 3 -> 4...) según nextExpansionAt.
 * 3. Descubre nuevos couriers elegibles en cada nuevo radio de búsqueda.
 * 4. Idempotencia: evita dobles expansiones si dos workers corren en paralelo.
 * 5. Cost Control: solo consulta sesiones en status "SEARCHING".
 */
export const commerceProgressiveDispatchScheduler = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    Logger.info("[COMMERCE_DISPATCH_SCHEDULER] Iniciando ciclo de despacho progresivo Commerce");

    try {
      // 1. Procesar timeouts globales de sesiones vencidas
      const timedOutCount = await processCommerceDispatchTimeouts();
      if (timedOutCount > 0) {
        Logger.info(`[COMMERCE_DISPATCH_SCHEDULER] Timeouts procesados: ${timedOutCount}`);
      }

      // 2. Consultar sesiones SEARCHING que requieren expansión de radio
      const now = admin.firestore.Timestamp.now();
      const searchingSnap = await db
        .collection("commerce_dispatch_sessions")
        .where("status", "==", "SEARCHING")
        .limit(100)
        .get();

      if (searchingSnap.empty) {
        Logger.info("[COMMERCE_DISPATCH_SCHEDULER] No hay sesiones activas en este ciclo.");
        return null;
      }

      const nowMs = now.toMillis();
      const eligibleForExpansionDocs = searchingSnap.docs.filter((doc) => {
        const data = doc.data();
        const nextMs = data.nextExpansionAt?.toMillis ? data.nextExpansionAt.toMillis() : 0;
        return nextMs > 0 && nextMs <= nowMs;
      });

      if (eligibleForExpansionDocs.length === 0) {
        Logger.info("[COMMERCE_DISPATCH_SCHEDULER] No hay sesiones que requieran expansión en este ciclo.");
        return null;
      }

      let expandedCount = 0;
      let failedCount = 0;

      for (const doc of eligibleForExpansionDocs) {
        const sessionId = doc.id;
        try {
          const res = await expandCommerceDispatchStage(sessionId);
          if (res.success && res.newStage) {
            expandedCount++;
            Logger.info(
              `[COMMERCE_DISPATCH_SCHEDULER] Sesión ${sessionId} expandida a Stage ${res.newStage} (${res.newRadiusKm}km). Notificados: ${res.couriersNotified}`
            );
          }
        } catch (stageErr: any) {
          failedCount++;
          Logger.error(`[COMMERCE_DISPATCH_SCHEDULER] Error expandiendo sesión ${sessionId}:`, stageErr);
        }
      }

      const durationMs = Date.now() - startTime;
      Logger.info(
        `[COMMERCE_DISPATCH_SCHEDULER] Fin ciclo (${durationMs}ms): Expansiones=${expandedCount}, Errores=${failedCount}, Timeouts=${timedOutCount}`
      );
    } catch (err: any) {
      Logger.error("[COMMERCE_DISPATCH_SCHEDULER] Error general en scheduler:", err);
    }

    return null;
  });
