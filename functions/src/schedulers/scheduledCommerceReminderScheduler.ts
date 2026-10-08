/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PROTOCOL: BSD-SCHEDULED-COMMERCE-PHASE-5-REMINDERS-001
 *
 * Cloud Scheduler & Trigger Callable:
 * Orquestador periódico de recordatorios y notificaciones de pedidos programados.
 *
 * Se ejecuta periódicamente cada 5 minutos (America/Managua).
 * Bounded query y control estricto de concurrencia e idempotencia.
 * ZERO AUTOMATIC STATUS TRANSITIONS: El estado del pedido jamás es mutado.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { runScheduledCommerceReminderScan } from "../services/scheduledCommerceReminderEngine";
import { Logger } from "../shared/logger/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 1. Cloud Scheduler: Escaneo periódico de recordatorios de pedidos programados.
 * Ejecuta cada 5 minutos en zona horaria America/Managua.
 */
export const scheduledCommerceReminderScheduler = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const workerId = `sched_cron_${Date.now()}`;
    Logger.info("[SCHEDULED_COMMERCE_REMINDER_SCHEDULER] Iniciando escaneo periódico de recordatorios", {
      workerId,
    });

    try {
      const stats = await runScheduledCommerceReminderScan({ workerId });
      Logger.info(
        `[SCHEDULED_COMMERCE_REMINDER_SCHEDULER] Fin de ciclo (${stats.durationMs}ms): Escaneados=${stats.scannedCount}, Evaluados=${stats.evaluatedCount}, Enviados=${stats.sentCount}, Omitidos=${stats.skippedCount}, Suprimidos=${stats.suppressedCount}, Errores=${stats.errorsCount}`
      );
    } catch (err: any) {
      Logger.error("[SCHEDULED_COMMERCE_REMINDER_SCHEDULER] Error crítico en escaneo de recordatorios:", err);
    }

    return null;
  });

/**
 * 2. Callable Administrativo / Test Runner: Dispara el escaneo de forma autoritativa
 * bajo demanda, con soporte opcional de timestamp simulado y orden específica.
 */
export const adminTriggerScheduledCommerceReminders = functions.https.onCall(
  async (
    data: {
      simulatedNowMs?: number;
      targetOrderId?: string;
      limit?: number;
    },
    context
  ) => {
    // Si la llamada viene de cliente autenticado, validar que sea admin
    if (context.auth) {
      const token = context.auth.token || {};
      const isAdmin = token.role === "admin" || token.admin === true || token.super_admin === true;
      if (!isAdmin && process.env.NODE_ENV === "production") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Solo administradores pueden ejecutar este disparador en producción."
        );
      }
    }

    const workerId = `admin_call_${Date.now()}`;
    try {
      const stats = await runScheduledCommerceReminderScan({
        simulatedNowMs: data?.simulatedNowMs ? Number(data.simulatedNowMs) : undefined,
        targetOrderId: data?.targetOrderId ? String(data.targetOrderId).trim() : undefined,
        limit: data?.limit ? Number(data.limit) : 50,
        workerId,
      });

      return {
        success: true,
        stats,
      };
    } catch (err: any) {
      throw new functions.https.HttpsError("internal", err.message || "Error ejecutando escaneo de recordatorios.");
    }
  }
);
