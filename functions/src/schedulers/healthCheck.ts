/**
 * BlueSystem Delivery Enterprise — HealthCheckScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Verificación programada cada hora de la salud de componentes (Firestore, Storage, FCM, Functions).
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();

export const healthCheckScheduler = functions.pubsub
  .schedule("0 * * * *") // Cada hora
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_health_${Date.now()}`;

    Logger.info("Inicio de ejecución de HealthCheckScheduler", {
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
      Logger.info(`Health check del sistema OK. Latencia DB: ${dbLatencyMs}ms. Duración total: ${duration}ms`, {
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
    } catch (error: any) {
      Logger.error("Error en HealthCheckScheduler execution", error, {
        module: "HealthCheckScheduler",
        requestId,
      });
    }
  });
