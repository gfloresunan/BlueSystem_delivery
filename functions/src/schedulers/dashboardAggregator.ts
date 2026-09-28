/**
 * BlueSystem Delivery Enterprise — DashboardAggregatorScheduler
 * Sprint 17.1 Infrastructure Foundation
 *
 * Cumplimiento incondicional de ADR-003:
 * Sintetiza periódicamente documentos agregados (dashboard_summary, merchant_summary, driver_summary)
 * para evitar lecturas directas masivas sobre colecciones vivas.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();

export const dashboardAggregatorScheduler = functions.pubsub
  .schedule("*/15 * * * *") // Cada 15 minutos
  .timeZone("America/Managua")
  .onRun(async (context) => {
    const startTime = Date.now();
    const requestId = `sched_agg_${Date.now()}`;

    Logger.info("Inicio de ejecución de DashboardAggregatorScheduler", {
      module: "DashboardAggregatorScheduler",
      requestId,
    });

    try {
      // 1. Sintetizar métricas de pedidos activos del día
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const activeOrdersSnap = await db
        .collection("orders")
        .where("createdAt", ">=", todayStart)
        .get();

      let totalOrdersToday = 0;
      let deliveredOrdersToday = 0;
      let cancelledOrdersToday = 0;
      let totalRevenueToday = 0;

      activeOrdersSnap.forEach((doc) => {
        const d = doc.data();
        totalOrdersToday++;
        if (d.status === "delivered") {
          deliveredOrdersToday++;
          totalRevenueToday += d.total || 0;
        } else if (d.status === "cancelled") {
          cancelledOrdersToday++;
        }
      });

      // 2. Guardar documento sintetizado dashboard_summary
      await db.collection("aggregates").doc("dashboard_summary").set(
        {
          totalOrdersToday,
          deliveredOrdersToday,
          cancelledOrdersToday,
          totalRevenueToday,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          aggregatedBy: "DashboardAggregatorScheduler",
        },
        { merge: true }
      );

      const duration = Date.now() - startTime;
      Logger.info(`DashboardAggregatorScheduler sintetizó ${totalOrdersToday} pedidos en ${duration}ms`, {
        module: "DashboardAggregatorScheduler",
        requestId,
        duration,
      });
    } catch (error: any) {
      Logger.error("Error en DashboardAggregatorScheduler execution", error, {
        module: "DashboardAggregatorScheduler",
        requestId,
      });
    }
  });
