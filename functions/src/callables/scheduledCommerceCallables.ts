/**
 * BlueSystem Delivery Enterprise — Scheduled Commerce Authoritative Callables
 * Protocol: BSD-SCHEDULED-COMMERCE-PHASE-3-CUSTOMER-FLOW-001
 *
 * 1. getScheduledSlotAvailability: Consulta autoritativa de slots y capacidad en tiempo real.
 * 2. reserveScheduledSlot: Reserva atómica de capacidad de slot con protección contra overbooking e idempotencia.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const DEFAULT_TIMEZONE = "America/Managua";
const DEFAULT_MIN_LEAD_TIME_MINUTES = 60;
const DEFAULT_MAX_ADVANCE_DAYS = 14;
const DEFAULT_SLOT_DURATION_MINUTES = 60;
const DEFAULT_MAX_ORDERS_PER_SLOT = 5;

interface ScheduledOrdersConfig {
  minLeadTimeMinutes?: number;
  maxAdvanceDays?: number;
  slotDurationMinutes?: number;
  maxOrdersPerSlot?: number;
  blockedDates?: string[];
}

/**
 * 1. getScheduledSlotAvailability
 * Devuelve los slots válidos y su capacidad para un comercio en una fecha específica.
 */
export const getScheduledSlotAvailability = functions.https.onCall(
  async (data: { businessId: string; dateIso: string }, context) => {
    const businessId = (data?.businessId || "").trim();
    const dateIso = (data?.dateIso || "").trim(); // YYYY-MM-DD

    if (!businessId || !dateIso) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "businessId y dateIso son requeridos."
      );
    }

    // 1. Lectura autoritativa del comercio
    const bizDoc = await db.collection("businesses").doc(businessId).get();
    if (!bizDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Comercio no encontrado.");
    }

    const bizData = bizDoc.data() || {};
    const scheduledOrdersEnabled = bizData.scheduledOrdersEnabled === true;
    if (!scheduledOrdersEnabled) {
      return {
        enabled: false,
        reason: "Este comercio no tiene habilitada la programación de pedidos.",
        slots: [],
      };
    }

    const config: ScheduledOrdersConfig =
      bizData.scheduledOrdersConfig || bizData.scheduledConfig || {};

    const minLeadTime = config.minLeadTimeMinutes ?? DEFAULT_MIN_LEAD_TIME_MINUTES;
    const maxAdvanceDays = config.maxAdvanceDays ?? DEFAULT_MAX_ADVANCE_DAYS;
    const slotDuration = config.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES;
    const maxOrdersPerSlot = config.maxOrdersPerSlot ?? DEFAULT_MAX_ORDERS_PER_SLOT;
    const blockedDates: string[] = Array.isArray(config.blockedDates)
      ? config.blockedDates
      : [];

    if (blockedDates.includes(dateIso)) {
      return {
        enabled: true,
        isBlockedDate: true,
        reason: "La fecha seleccionada no está disponible.",
        slots: [],
      };
    }

    // Consultar documentos de capacidad existentes para la fecha
    const capSnapshot = await db
      .collection("merchant_slot_capacities")
      .where("businessId", "==", businessId)
      .where("targetDate", "==", dateIso)
      .get();

    const reservedCountsMap: Record<string, number> = {};
    capSnapshot.docs.forEach((doc) => {
      const d = doc.data();
      if (d.slotKey) {
        reservedCountsMap[d.slotKey] = Number(d.reservedCount || 0);
      }
    });

    return {
      enabled: true,
      businessId,
      dateIso,
      maxOrdersPerSlot,
      slotDurationMinutes: slotDuration,
      minLeadTimeMinutes: minLeadTime,
      maxAdvanceDays,
      reservedCounts: reservedCountsMap,
    };
  }
);

/**
 * 2. reserveScheduledSlot
 * Transacción autoritativa en Firestore que valida TOCTOU, capacidad y reserva el slot.
 */
export const reserveScheduledSlot = functions.https.onCall(
  async (
    data: {
      businessId: string;
      slotKey: string;
      targetDate: string;
      orderId?: string;
      idempotencyKey?: string;
    },
    context
  ) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para reservar un horario de entrega."
      );
    }

    const customerUid = context.auth.uid;
    const businessId = (data?.businessId || "").trim();
    const slotKey = (data?.slotKey || "").trim();
    const targetDate = (data?.targetDate || "").trim();
    const orderId = (data?.orderId || "").trim();
    const idempotencyKey = (data?.idempotencyKey || "").trim();

    if (!businessId || !slotKey || !targetDate) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "businessId, slotKey y targetDate son obligatorios."
      );
    }

    const slotDocRef = db
      .collection("merchant_slot_capacities")
      .doc(`${businessId}_${slotKey}`);
    const bizDocRef = db.collection("businesses").doc(businessId);

    return await db.runTransaction(async (transaction) => {
      // 1. TOCTOU: Re-verificar comercio y capacidad
      const bizDoc = await transaction.get(bizDocRef);
      if (!bizDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Comercio no encontrado.");
      }

      const bizData = bizDoc.data() || {};
      if (bizData.scheduledOrdersEnabled !== true) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "El comercio ya no tiene habilitada la programación de pedidos."
        );
      }

      const config: ScheduledOrdersConfig =
        bizData.scheduledOrdersConfig || bizData.scheduledConfig || {};
      const maxAllowed = config.maxOrdersPerSlot ?? DEFAULT_MAX_ORDERS_PER_SLOT;

      // 2. Leer slot doc
      const slotDoc = await transaction.get(slotDocRef);
      const slotData = slotDoc.exists ? slotDoc.data() || {} : {};
      const currentReserved = Number(slotData.reservedCount || 0);
      const orderIds: string[] = Array.isArray(slotData.orderIds)
        ? slotData.orderIds
        : [];
      const idempotencyKeys: string[] = Array.isArray(slotData.idempotencyKeys)
        ? slotData.idempotencyKeys
        : [];

      // Idempotencia: si ya fue reservado con la misma clave, retornar éxito sin duplicar conteo
      if (
        (idempotencyKey && idempotencyKeys.includes(idempotencyKey)) ||
        (orderId && orderIds.includes(orderId))
      ) {
        return {
          success: true,
          idempotent: true,
          slotKey,
          reservedCount: currentReserved,
          maxCapacity: maxAllowed,
        };
      }

      // Verificación de capacidad
      if (currentReserved >= maxAllowed) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "El horario seleccionado se acaba de agotar. Por favor elige otro horario disponible."
        );
      }

      // Actualizar conteo
      const updatedOrderIds = orderId ? [...orderIds, orderId] : orderIds;
      const updatedIdempotencyKeys = idempotencyKey
        ? [...idempotencyKeys, idempotencyKey]
        : idempotencyKeys;

      const updatePayload: Record<string, any> = {
        businessId,
        slotKey,
        targetDate,
        reservedCount: currentReserved + 1,
        maxCapacity: maxAllowed,
        orderIds: updatedOrderIds,
        idempotencyKeys: updatedIdempotencyKeys,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(slotDocRef, updatePayload, { merge: true });

      return {
        success: true,
        idempotent: false,
        slotKey,
        reservedCount: currentReserved + 1,
        maxCapacity: maxAllowed,
      };
    });
  }
);

/**
 * Función Núcleo Reutilizable: Liberación autoritativa de capacidad de slot
 * Resuelve la Deuda P1 identificada en Fase 3V:
 * - Cancelación de orden -> libera exactamente 1 cupo.
 * - Rechazo de orden -> libera exactamente 1 cupo.
 * - Concurrencia segura: reservedCount jamás se vuelve negativo (Math.max(0, count - 1)).
 * - Idempotencia estricta: capacityReleased = true previene dobles liberaciones ante retries.
 */
export async function executeAuthoritativeCapacityRelease(
  orderId: string,
  reason: string
): Promise<{ success: boolean; released: boolean; slotKey?: string; remainingCount?: number; reason?: string }> {
  if (!orderId) {
    return { success: false, released: false, reason: "ORDER_ID_REQUIRED" };
  }

  const orderRef = db.collection("orders").doc(orderId);

  return await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      return { success: false, released: false, reason: "ORDER_NOT_FOUND" };
    }

    const orderData = orderDoc.data() || {};
    const isScheduled =
      orderData.fulfillmentTiming?.mode === "SCHEDULED" ||
      orderData.schedulingType === "scheduled" ||
      orderData.isScheduled === true;

    if (!isScheduled) {
      return { success: true, released: false, reason: "NOT_A_SCHEDULED_ORDER" };
    }

    // Idempotencia: si ya fue liberado previamente, no decrementar de nuevo
    if (orderData.capacityReleased === true) {
      return { success: true, released: false, reason: "ALREADY_RELEASED" };
    }

    const businessId = (orderData.businessId || "").toString().trim();
    if (!businessId) {
      return { success: false, released: false, reason: "NO_BUSINESS_ID" };
    }

    // Resolver slotKey canónica
    let slotKey = (orderData.slotKey || "").toString().trim();
    if (!slotKey && orderData.fulfillmentTiming?.windowStartAt) {
      const wStart = orderData.fulfillmentTiming.windowStartAt.toDate
        ? orderData.fulfillmentTiming.windowStartAt.toDate()
        : new Date(orderData.fulfillmentTiming.windowStartAt);
      if (!isNaN(wStart.getTime())) {
        const y = wStart.getFullYear();
        const m = String(wStart.getMonth() + 1).padStart(2, "0");
        const d = String(wStart.getDate()).padStart(2, "0");
        const hr = String(wStart.getHours()).padStart(2, "0");
        const min = String(wStart.getMinutes()).padStart(2, "0");
        slotKey = `${y}-${m}-${d}_${hr}${min}`;
      }
    }

    let remainingCount = 0;
    if (slotKey) {
      const slotDocRef = db
        .collection("merchant_slot_capacities")
        .doc(`${businessId}_${slotKey}`);
      const slotDoc = await transaction.get(slotDocRef);

      if (slotDoc.exists) {
        const slotData = slotDoc.data() || {};
        const currentCount = Number(slotData.reservedCount || 0);
        remainingCount = Math.max(0, currentCount - 1); // Invariante: jamás negativo
        const currentOrderIds: string[] = Array.isArray(slotData.orderIds)
          ? slotData.orderIds.filter((id) => id !== orderId)
          : [];

        transaction.update(slotDocRef, {
          reservedCount: remainingCount,
          orderIds: currentOrderIds,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Marcar la orden como liberada atómicamente
    transaction.update(orderRef, {
      capacityReleased: true,
      capacityReleasedAt: admin.firestore.FieldValue.serverTimestamp(),
      capacityReleaseReason: reason,
    });

    return {
      success: true,
      released: true,
      slotKey: slotKey || undefined,
      remainingCount,
      reason,
    };
  });
}

/**
 * 3. releaseScheduledSlotCapacity
 * Callable HTTPS para liberación autoritativa de capacidad de slot
 */
export const releaseScheduledSlotCapacity = functions.https.onCall(
  async (
    data: {
      orderId: string;
      reason?: string;
    },
    context
  ) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para liberar capacidad de slot."
      );
    }

    const orderId = (data?.orderId || "").trim();
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId es obligatorio."
      );
    }

    const reason = (data?.reason || "CALLABLE_REQUEST").trim();
    try {
      const result = await executeAuthoritativeCapacityRelease(orderId, reason);
      return result;
    } catch (err: any) {
      throw new functions.https.HttpsError("internal", err.message || "Error liberando capacidad.");
    }
  }
);
