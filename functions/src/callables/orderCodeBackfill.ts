/**
 * BlueSystem Delivery Enterprise — Backfill & Migración de OrderCode (BSD-HUMAN-ORDER-CODE-001)
 * Idempotente, seguro, auditable y con soporte para simulación previa (Dry-Run).
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { resolveBusinessPrefix, formatOrderCode } from "../shared/orderCodeUtils";

const db = admin.firestore();

function isPlatformAdmin(context: functions.https.CallableContext): boolean {
  if (!context.auth) return false;
  const token = context.auth.token || {};
  const role = (token.role || token.eiamRole || "").toString().toUpperCase();
  return (
    ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT"].includes(role) ||
    token.admin === true ||
    token.isSuperAdmin === true
  );
}

export const adminBackfillOrderCodes = functions.https.onCall(
  async (
    data: {
      dryRun?: boolean;
      batchLimit?: number;
      specificBusinessId?: string;
    },
    context
  ) => {
    if (!isPlatformAdmin(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores de plataforma pueden ejecutar la migración de orderCode."
      );
    }

    const dryRun = data?.dryRun !== false; // Por defecto dryRun es true (seguridad first)
    const limit = Math.min(Number(data?.batchLimit) || 500, 1000);
    const specificBiz = (data?.specificBusinessId || "").trim();

    let query: admin.firestore.Query = db.collection("orders");

    if (specificBiz) {
      query = query.where("businessId", "==", specificBiz);
    }

    const snap = await query.get();

    let totalScanned = 0;
    let totalToMigrate = 0;
    let totalSkippedAlreadyHasCode = 0;
    let totalSkippedXToY = 0;
    let totalSkippedNoBusiness = 0;

    // Agrupar órdenes pendientes de código por businessId
    const businessOrdersMap = new Map<string, Array<{ id: string; ref: admin.firestore.DocumentReference; createdAtMs: number }>>();

    snap.docs.forEach((docSnap) => {
      totalScanned++;
      const d = docSnap.data();

      // Ignorar encomiendas X→Y
      if (d.serviceType === "X_TO_Y_DELIVERY") {
        totalSkippedXToY++;
        return;
      }

      // Si ya tiene orderCode, respetar inmutabilidad (Idempotencia)
      if (d.orderCode && typeof d.orderCode === "string" && d.orderCode.trim().length > 0) {
        totalSkippedAlreadyHasCode++;
        return;
      }

      const bizId = (d.businessId || "").toString().trim();
      if (!bizId) {
        totalSkippedNoBusiness++;
        return;
      }

      totalToMigrate++;

      // Extraer timestamp
      let createdAtMs = 0;
      if (d.createdAt && typeof d.createdAt.toMillis === "function") {
        createdAtMs = d.createdAt.toMillis();
      } else if (d.createdAt instanceof Date) {
        createdAtMs = d.createdAt.getTime();
      } else if (typeof d.createdAt === "number") {
        createdAtMs = d.createdAt;
      } else {
        createdAtMs = Date.now();
      }

      if (!businessOrdersMap.has(bizId)) {
        businessOrdersMap.set(bizId, []);
      }
      businessOrdersMap.get(bizId)!.push({
        id: docSnap.id,
        ref: docSnap.ref,
        createdAtMs,
      });
    });

    const breakdownByBusiness: Array<{
      businessId: string;
      prefix: string;
      ordersCount: number;
      startingSequence: number;
      endingSequence: number;
      sampleCodeStart: string;
      sampleCodeEnd: string;
    }> = [];

    // Procesar cada comercio en orden cronológico
    const allUpdates: Array<{
      ref: admin.firestore.DocumentReference;
      data: {
        orderCode: string;
        orderShortCode: string;
        orderSequence: number;
        orderCodePrefix: string;
      };
    }> = [];

    const counterUpdates: Array<{
      ref: admin.firestore.DocumentReference;
      data: {
        businessId: string;
        orderCodePrefix: string;
        lastSequence: number;
        nextSequence: number;
        updatedAt: admin.firestore.FieldValue;
      };
    }> = [];

    for (const [bizId, orderList] of businessOrdersMap.entries()) {
      // Ordenar por fecha de creación ascendente para mantener secuencia histórica correcta
      orderList.sort((a, b) => a.createdAtMs - b.createdAtMs);

      // Obtener o resolver prefijo y secuencia actual del comercio
      const counterRef = db.collection("counters").doc(`orders_${bizId}`);
      const counterDoc = await counterRef.get();

      let prefix = "";
      let currentSeq = 1;

      if (counterDoc.exists) {
        const cData = counterDoc.data() || {};
        prefix = cData.orderCodePrefix || "";
        currentSeq = Number(cData.nextSequence) || 1;
      }

      if (!prefix) {
        const bizDoc = await db.collection("businesses").doc(bizId).get();
        const bizData = bizDoc.exists ? bizDoc.data() : {};
        prefix = resolveBusinessPrefix(bizData, bizId);
      }

      const startingSeq = currentSeq;
      let runningSeq = currentSeq;
      let startSample = "";
      let endSample = "";

      orderList.slice(0, limit).forEach((ordItem) => {
        const generated = formatOrderCode(prefix, runningSeq);
        if (!startSample) startSample = generated.orderCode;
        endSample = generated.orderCode;

        allUpdates.push({
          ref: ordItem.ref,
          data: {
            orderCode: generated.orderCode,
            orderShortCode: generated.orderShortCode,
            orderSequence: generated.orderSequence,
            orderCodePrefix: generated.orderCodePrefix,
          },
        });

        runningSeq++;
      });

      const endingSeq = runningSeq - 1;

      breakdownByBusiness.push({
        businessId: bizId,
        prefix,
        ordersCount: orderList.length,
        startingSequence: startingSeq,
        endingSequence: endingSeq,
        sampleCodeStart: startSample,
        sampleCodeEnd: endSample,
      });

      counterUpdates.push({
        ref: counterRef,
        data: {
          businessId: bizId,
          orderCodePrefix: prefix,
          lastSequence: endingSeq,
          nextSequence: runningSeq,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    // Si NO es simulación, ejecutar en lotes atómicos
    if (!dryRun && allUpdates.length > 0) {
      const BATCH_SIZE = 400;
      for (let i = 0; i < allUpdates.length; i += BATCH_SIZE) {
        const chunk = allUpdates.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((item) => {
          batch.update(item.ref, item.data);
        });
        await batch.commit();
      }

      // Actualizar contadores
      for (let i = 0; i < counterUpdates.length; i += BATCH_SIZE) {
        const chunk = counterUpdates.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((item) => {
          batch.set(item.ref, item.data, { merge: true });
        });
        await batch.commit();
      }
    }

    return {
      dryRun,
      totalScanned,
      totalToMigrate,
      totalMigratedApplied: dryRun ? 0 : allUpdates.length,
      totalSkippedAlreadyHasCode,
      totalSkippedXToY,
      totalSkippedNoBusiness,
      businessesCount: businessOrdersMap.size,
      breakdownByBusiness,
    };
  }
);
