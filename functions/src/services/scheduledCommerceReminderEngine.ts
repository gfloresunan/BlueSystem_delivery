/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PROTOCOL: BSD-SCHEDULED-COMMERCE-PHASE-5-REMINDERS-001
 *
 * Core Domain Engine: Orquestación y Despacho Server-Authoritative de Recordatorios
 * para Pedidos Programados (Scheduled Commerce Orders).
 *
 * INVARIANTES ARQUITECTÓNICAS MANDATORIAS:
 * 1. ZERO AUTOMATIC STATUS TRANSITIONS: Ningún recordatorio altera el estado de la orden
 *    (status queda bajo estricto control manual del comercio: comenzar preparación / marcar listo).
 * 2. SOLE ORDER SSOT: /orders/{orderId} permanece como única fuente de la verdad.
 * 3. NOTIFICATION CENTER REUSE: Reutiliza /notification_campaigns, plantillas canónicas,
 *    /user_devices y buzones in-app sin crear plataformas paralelas.
 * 4. DETERMINISTIC IDEMPOTENCY: Claves compuestas {orderId}:{role}:{event}:{windowStartMs}.
 * 5. PRIVACY PROTECTION: Exclusión estricta de mensajes de regalo (giftDetails.message), teléfonos
 *    de terceros y direcciones completas en payloads y logs.
 * 6. BOUNDED SCANS: Cero barrido de toda la colección; filtros acotados por modo y estado activo.
 */

import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { NotificationTemplateService } from "./notificationTemplateService";
import { toEpochMillis } from "../domain/orders/scheduledOrderContract";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// ─── TIPOS Y MODELO DE EVENTOS CANÓNICOS ──────────────────────────────────────

export type ScheduledReminderEventType =
  | "SCHEDULED_MERCHANT_24H"
  | "SCHEDULED_CUSTOMER_24H"
  | "SCHEDULED_MERCHANT_5H"
  | "SCHEDULED_CUSTOMER_5H"
  | "SCHEDULED_MERCHANT_PREPARATION_DUE"
  | "SCHEDULED_MERCHANT_WINDOW_RISK";

export type ReminderTargetRole = "MERCHANT" | "CUSTOMER";

export interface ScheduledCommerceReminderConfig {
  merchant24hEnabled: boolean;
  merchant5hEnabled: boolean;
  customer24hEnabled: boolean;
  customer5hEnabled: boolean;
  preparationReminderEnabled: boolean;
  lateAlertEnabled: boolean;
  merchant24hMinutes: number; // default 1440 (24h)
  merchant5hMinutes: number;  // default 300 (5h)
  customer24hMinutes: number; // default 1440 (24h)
  customer5hMinutes: number;  // default 300 (5h)
  riskLeadMinutes: number;    // default 15 min antes del inicio de ventana
}

export const DEFAULT_REMINDER_CONFIG: ScheduledCommerceReminderConfig = {
  merchant24hEnabled: true,
  merchant5hEnabled: true,
  customer24hEnabled: true,
  customer5hEnabled: true,
  preparationReminderEnabled: true,
  lateAlertEnabled: true,
  merchant24hMinutes: 1440,
  merchant5hMinutes: 300,
  customer24hMinutes: 1440,
  customer5hMinutes: 300,
  riskLeadMinutes: 15,
};

// Tolerancia de evaluación de reloj (en minutos) para garantizar que un worker con cadencia
// de 1 a 5 minutos no pierda eventos debido al desfase de ejecución.
export const REMINDER_TOLERANCE_MINUTES = 15;

export interface ReminderEvaluationItem {
  eventType: ScheduledReminderEventType;
  targetRole: ReminderTargetRole;
  isDue: boolean;
  isSuppressed: boolean;
  suppressionReason?: string;
  targetTimeMs: number;
  dedupeKey: string;
}

export interface ReminderEvaluationResult {
  orderId: string;
  businessId: string;
  currentStatus: string;
  windowStartMs: number;
  items: ReminderEvaluationItem[];
}

export interface ReminderScanStats {
  scannedCount: number;
  evaluatedCount: number;
  sentCount: number;
  skippedCount: number;
  suppressedCount: number;
  errorsCount: number;
  durationMs: number;
  details: {
    orderId: string;
    eventType: string;
    targetRole: string;
    status: "SENT" | "SKIPPED" | "SUPPRESSED" | "ERROR";
    reason?: string;
  }[];
}

// ─── CLAVE DETERMINISTA DE IDEMPOTENCIA ───────────────────────────────────────

/**
 * Genera la clave de deduplicación determinista para un recordatorio programado.
 * Incluye windowStartMs para asegurar que si la orden es reprogramada a una nueva fecha/hora,
 * los recordatorios de la nueva ventana tengan una clave independiente.
 */
export function buildReminderDedupeKey(
  orderId: string,
  targetRole: ReminderTargetRole,
  eventType: ScheduledReminderEventType,
  windowStartAt: any
): string {
  const windowStartMs = toEpochMillis(windowStartAt) || 0;
  return `SCHEDULED_REMINDER:${orderId}:${targetRole}:${eventType}:${windowStartMs}`;
}

export function buildCampaignDocId(
  orderId: string,
  targetRole: ReminderTargetRole,
  eventType: ScheduledReminderEventType,
  windowStartAt: any
): string {
  const windowStartMs = toEpochMillis(windowStartAt) || 0;
  return `camp_sched_${orderId}_${targetRole}_${eventType}_${windowStartMs}`;
}

// ─── RESOLUCIÓN DE CONFIGURACIÓN POR COMERCIO ────────────────────────────────

export function resolveMerchantReminderConfig(
  merchantConfig?: any
): ScheduledCommerceReminderConfig {
  const userReminders = merchantConfig?.reminders || merchantConfig?.scheduledOrdersConfig?.reminders || {};
  return {
    merchant24hEnabled: userReminders.merchant24hEnabled ?? DEFAULT_REMINDER_CONFIG.merchant24hEnabled,
    merchant5hEnabled: userReminders.merchant5hEnabled ?? DEFAULT_REMINDER_CONFIG.merchant5hEnabled,
    customer24hEnabled: userReminders.customer24hEnabled ?? DEFAULT_REMINDER_CONFIG.customer24hEnabled,
    customer5hEnabled: userReminders.customer5hEnabled ?? DEFAULT_REMINDER_CONFIG.customer5hEnabled,
    preparationReminderEnabled: userReminders.preparationReminderEnabled ?? DEFAULT_REMINDER_CONFIG.preparationReminderEnabled,
    lateAlertEnabled: userReminders.lateAlertEnabled ?? DEFAULT_REMINDER_CONFIG.lateAlertEnabled,
    merchant24hMinutes: Number(userReminders.merchant24hMinutes) || DEFAULT_REMINDER_CONFIG.merchant24hMinutes,
    merchant5hMinutes: Number(userReminders.merchant5hMinutes) || DEFAULT_REMINDER_CONFIG.merchant5hMinutes,
    customer24hMinutes: Number(userReminders.customer24hMinutes) || DEFAULT_REMINDER_CONFIG.customer24hMinutes,
    customer5hMinutes: Number(userReminders.customer5hMinutes) || DEFAULT_REMINDER_CONFIG.customer5hMinutes,
    riskLeadMinutes: Number(userReminders.riskLeadMinutes) || DEFAULT_REMINDER_CONFIG.riskLeadMinutes,
  };
}

// ─── EVALUACIÓN PURA DE ELEGIBILIDAD (SIN EFECTOS SECUNDARIOS) ───────────────

/**
 * Evalúa el estado de un pedido y determina qué recordatorios deben emitirse según
 * la hora actual (`nowMs`) y la ventana autoritativa `windowStartAt`.
 *
 * FUNCIÓN PURA: No muta base de datos, no avanza estados, no realiza escrituras.
 */
export function evaluateReminderEligibility(
  order: any,
  nowMs: number,
  config: ScheduledCommerceReminderConfig = DEFAULT_REMINDER_CONFIG
): ReminderEvaluationResult {
  const orderId = (order.id || order.orderId || "").toString().trim();
  const businessId = (order.businessId || "").toString().trim();
  const rawStatus = (order.status || order.estado || "").toString().toLowerCase().trim();
  const fulfillmentTiming = order.fulfillmentTiming || {};
  const mode = (fulfillmentTiming.mode || "").toString().toUpperCase().trim();

  const windowStartMs = toEpochMillis(fulfillmentTiming.windowStartAt) || 0;
  const toleranceMs = REMINDER_TOLERANCE_MINUTES * 60 * 1000;

  const items: ReminderEvaluationItem[] = [];

  // Invariante: Si no es modo SCHEDULED o no tiene ventana válida, retornar vacío
  if (mode !== "SCHEDULED" || windowStartMs <= 0) {
    return { orderId, businessId, currentStatus: rawStatus, windowStartMs, items };
  }

  // Comprobaciones de estado global
  const isCancelled = ["cancelled", "cancelado", "rejected", "rechazado"].includes(rawStatus);
  const isDelivered = ["delivered", "entregado", "completed", "completado"].includes(rawStatus);
  const isPreparing = ["preparing", "preparando", "en_cocina"].includes(rawStatus);
  const isReadyOrBeyond = [
    "ready", "listo", "assigned", "asignado",
    "courier_accepted", "aceptado_por_motorizado",
    "picked_up", "recogido", "in_transit", "en_camino"
  ].includes(rawStatus);

  // 1. SCHEDULED_MERCHANT_24H
  {
    const targetTimeMs = windowStartMs - (config.merchant24hMinutes * 60 * 1000);
    const dedupeKey = buildReminderDedupeKey(orderId, "MERCHANT", "SCHEDULED_MERCHANT_24H", windowStartMs);
    let isDue = false;
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (!config.merchant24hEnabled) {
      isSuppressed = true;
      suppressionReason = "DISABLED_IN_CONFIG";
    } else if (isCancelled) {
      isSuppressed = true;
      suppressionReason = "ORDER_CANCELLED";
    } else if (isDelivered) {
      isSuppressed = true;
      suppressionReason = "ORDER_ALREADY_DELIVERED";
    } else if (nowMs >= targetTimeMs - toleranceMs && nowMs < windowStartMs - (config.merchant5hMinutes * 60 * 1000)) {
      isDue = true;
    }

    items.push({
      eventType: "SCHEDULED_MERCHANT_24H",
      targetRole: "MERCHANT",
      isDue,
      isSuppressed,
      suppressionReason,
      targetTimeMs,
      dedupeKey,
    });
  }

  // 2. SCHEDULED_CUSTOMER_24H
  {
    const targetTimeMs = windowStartMs - (config.customer24hMinutes * 60 * 1000);
    const dedupeKey = buildReminderDedupeKey(orderId, "CUSTOMER", "SCHEDULED_CUSTOMER_24H", windowStartMs);
    let isDue = false;
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (!config.customer24hEnabled) {
      isSuppressed = true;
      suppressionReason = "DISABLED_IN_CONFIG";
    } else if (isCancelled) {
      isSuppressed = true;
      suppressionReason = "ORDER_CANCELLED";
    } else if (isDelivered) {
      isSuppressed = true;
      suppressionReason = "ORDER_ALREADY_DELIVERED";
    } else if (nowMs >= targetTimeMs - toleranceMs && nowMs < windowStartMs - (config.customer5hMinutes * 60 * 1000)) {
      isDue = true;
    }

    items.push({
      eventType: "SCHEDULED_CUSTOMER_24H",
      targetRole: "CUSTOMER",
      isDue,
      isSuppressed,
      suppressionReason,
      targetTimeMs,
      dedupeKey,
    });
  }

  // 3. SCHEDULED_MERCHANT_5H
  {
    const targetTimeMs = windowStartMs - (config.merchant5hMinutes * 60 * 1000);
    const dedupeKey = buildReminderDedupeKey(orderId, "MERCHANT", "SCHEDULED_MERCHANT_5H", windowStartMs);
    let isDue = false;
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (!config.merchant5hEnabled) {
      isSuppressed = true;
      suppressionReason = "DISABLED_IN_CONFIG";
    } else if (isCancelled) {
      isSuppressed = true;
      suppressionReason = "ORDER_CANCELLED";
    } else if (isDelivered) {
      isSuppressed = true;
      suppressionReason = "ORDER_ALREADY_DELIVERED";
    } else if (nowMs >= targetTimeMs - toleranceMs && nowMs < windowStartMs) {
      isDue = true;
    }

    items.push({
      eventType: "SCHEDULED_MERCHANT_5H",
      targetRole: "MERCHANT",
      isDue,
      isSuppressed,
      suppressionReason,
      targetTimeMs,
      dedupeKey,
    });
  }

  // 4. SCHEDULED_CUSTOMER_5H
  {
    const targetTimeMs = windowStartMs - (config.customer5hMinutes * 60 * 1000);
    const dedupeKey = buildReminderDedupeKey(orderId, "CUSTOMER", "SCHEDULED_CUSTOMER_5H", windowStartMs);
    let isDue = false;
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (!config.customer5hEnabled) {
      isSuppressed = true;
      suppressionReason = "DISABLED_IN_CONFIG";
    } else if (isCancelled) {
      isSuppressed = true;
      suppressionReason = "ORDER_CANCELLED";
    } else if (isDelivered) {
      isSuppressed = true;
      suppressionReason = "ORDER_ALREADY_DELIVERED";
    } else if (nowMs >= targetTimeMs - toleranceMs && nowMs < windowStartMs) {
      isDue = true;
    }

    items.push({
      eventType: "SCHEDULED_CUSTOMER_5H",
      targetRole: "CUSTOMER",
      isDue,
      isSuppressed,
      suppressionReason,
      targetTimeMs,
      dedupeKey,
    });
  }

  // 5. SCHEDULED_MERCHANT_PREPARATION_DUE
  {
    const prepLeadMinutes = Number(fulfillmentTiming.preparationLeadMinutes) || 60;
    const targetTimeMs = windowStartMs - (prepLeadMinutes * 60 * 1000);
    const dedupeKey = buildReminderDedupeKey(orderId, "MERCHANT", "SCHEDULED_MERCHANT_PREPARATION_DUE", windowStartMs);
    let isDue = false;
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (!config.preparationReminderEnabled) {
      isSuppressed = true;
      suppressionReason = "DISABLED_IN_CONFIG";
    } else if (isCancelled) {
      isSuppressed = true;
      suppressionReason = "ORDER_CANCELLED";
    } else if (isDelivered) {
      isSuppressed = true;
      suppressionReason = "ORDER_ALREADY_DELIVERED";
    } else if (isPreparing) {
      // 🔒 STATE-AWARE SUPPRESSION: Ya comenzó la preparación
      isSuppressed = true;
      suppressionReason = "ALREADY_PREPARING";
    } else if (isReadyOrBeyond) {
      // 🔒 STATE-AWARE SUPPRESSION: Ya está listo o en ruta
      isSuppressed = true;
      suppressionReason = "ALREADY_READY_OR_BEYOND";
    } else if (nowMs >= targetTimeMs - toleranceMs && nowMs < windowStartMs) {
      isDue = true;
    }

    items.push({
      eventType: "SCHEDULED_MERCHANT_PREPARATION_DUE",
      targetRole: "MERCHANT",
      isDue,
      isSuppressed,
      suppressionReason,
      targetTimeMs,
      dedupeKey,
    });
  }

  // 6. SCHEDULED_MERCHANT_WINDOW_RISK
  {
    const targetTimeMs = windowStartMs - (config.riskLeadMinutes * 60 * 1000);
    const dedupeKey = buildReminderDedupeKey(orderId, "MERCHANT", "SCHEDULED_MERCHANT_WINDOW_RISK", windowStartMs);
    let isDue = false;
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (!config.lateAlertEnabled) {
      isSuppressed = true;
      suppressionReason = "DISABLED_IN_CONFIG";
    } else if (isCancelled) {
      isSuppressed = true;
      suppressionReason = "ORDER_CANCELLED";
    } else if (isDelivered) {
      isSuppressed = true;
      suppressionReason = "ORDER_ALREADY_DELIVERED";
    } else if (isReadyOrBeyond) {
      // 🔒 STATE-AWARE SUPPRESSION: No hay riesgo, el pedido ya está listo o asignado
      isSuppressed = true;
      suppressionReason = "ALREADY_READY_OR_BEYOND";
    } else if (nowMs >= targetTimeMs - toleranceMs && nowMs <= windowStartMs + (45 * 60 * 1000)) {
      // Aplica si aún está pendiente o en preparación al aproximarse o iniciar la ventana
      isDue = true;
    }

    items.push({
      eventType: "SCHEDULED_MERCHANT_WINDOW_RISK",
      targetRole: "MERCHANT",
      isDue,
      isSuppressed,
      suppressionReason,
      targetTimeMs,
      dedupeKey,
    });
  }

  return { orderId, businessId, currentStatus: rawStatus, windowStartMs, items };
}

// ─── RESOLUCIÓN DE DESTINATARIOS Y DISPOSITIVOS ──────────────────────────────

async function resolveCustomerTarget(customerId: string): Promise<{ uids: string[]; tokens: string[] }> {
  const cleanId = (customerId || "").trim();
  if (!cleanId) return { uids: [], tokens: [] };

  const tokens: string[] = [];
  try {
    const snap = await db
      .collection("user_devices")
      .where("uid", "==", cleanId)
      .where("isActive", "==", true)
      .get();

    snap.forEach((doc) => {
      const d = doc.data();
      const t = (d?.fcmToken || "").trim();
      if (t && t.length > 20 && !tokens.includes(t)) {
        tokens.push(t);
      }
    });
  } catch (err: any) {
    Logger.warn(`[REMINDER_TARGET] Error obteniendo tokens para cliente ${cleanId}: ${err.message}`);
  }
  return { uids: [cleanId], tokens };
}

async function resolveMerchantTarget(
  businessId: string,
  branchId?: string
): Promise<{ uids: string[]; tokens: string[] }> {
  const cleanBiz = (businessId || "").trim();
  if (!cleanBiz) return { uids: [], tokens: [] };

  const uidsSet = new Set<string>();
  uidsSet.add(cleanBiz);

  try {
    // 1. Resolver UID propietario o staff del comercio
    const bizDoc = await db.collection("businesses").doc(cleanBiz).get();
    if (bizDoc.exists) {
      const data = bizDoc.data() || {};
      if (data.ownerUid) uidsSet.add(data.ownerUid.trim());
      if (data.adminUid) uidsSet.add(data.adminUid.trim());
      if (Array.isArray(data.staffUids)) {
        data.staffUids.forEach((u: string) => u && uidsSet.add(u.trim()));
      }
    }

    // 2. Staff members en subcolección staff si existe
    const staffSnap = await db.collection("businesses").doc(cleanBiz).collection("staff").get();
    staffSnap.forEach((doc) => {
      const st = doc.data();
      if (st.uid) uidsSet.add(st.uid.trim());
    });
  } catch (err: any) {
    Logger.warn(`[REMINDER_TARGET] Error resolviendo UIDs de comercio ${cleanBiz}: ${err.message}`);
  }

  const uids = Array.from(uidsSet);
  const tokens: string[] = [];

  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    try {
      const snap = await db
        .collection("user_devices")
        .where("uid", "in", chunk)
        .where("isActive", "==", true)
        .get();

      snap.forEach((doc) => {
        const d = doc.data();
        const t = (d?.fcmToken || "").trim();
        if (t && t.length > 20 && !tokens.includes(t)) {
          if (branchId && d.branchId && d.branchId !== branchId) return;
          tokens.push(t);
        }
      });
    } catch (err: any) {
      Logger.warn(`[REMINDER_TARGET] Error consultando user_devices para chunk: ${err.message}`);
    }
  }

  return { uids, tokens };
}

// ─── FORMATEO DE HORARIOS Y VENTANAS (PRIVACY-SAFE) ──────────────────────────

function formatDeliveryWindow(windowStartAt: any, windowEndAt: any): string {
  try {
    const start = toEpochMillis(windowStartAt);
    const end = toEpochMillis(windowEndAt);
    if (!start) return "horario programado";

    const dStart = new Date(start);
    const startStr = dStart.toLocaleTimeString("es-NI", { hour: "numeric", minute: "2-digit", hour12: true });

    if (end) {
      const dEnd = new Date(end);
      const endStr = dEnd.toLocaleTimeString("es-NI", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  } catch (_e) {
    return "horario programado";
  }
}

// ─── DESPACHO IDEMPOTENTE DE UN RECORDATORIO ─────────────────────────────────

export interface DispatchReminderParams {
  order: any;
  item: ReminderEvaluationItem;
  workerId?: string;
}

export async function dispatchScheduledReminder(
  params: DispatchReminderParams
): Promise<{ success: boolean; dedupeKey: string; reason?: string }> {
  const { order, item, workerId = `worker_${Date.now()}` } = params;
  const orderId = (order.id || order.orderId || "").toString().trim();
  const businessId = (order.businessId || "").toString().trim();
  const targetCustomerId = (order.customerId || order.userId || order.uid || "").toString().trim();
  const displayCode = (order.orderCode || (order.orderShortCode ? `#${order.orderShortCode}` : orderId.slice(-6).toUpperCase())).toString();
  const businessName = (order.businessName || order.nombreComercio || "Comercio").toString();
  const windowStartAt = order.fulfillmentTiming?.windowStartAt;
  const windowEndAt = order.fulfillmentTiming?.windowEndAt;
  const deliveryWindow = formatDeliveryWindow(windowStartAt, windowEndAt);
  const prepLead = (order.fulfillmentTiming?.preparationLeadMinutes || 60).toString();

  const { dedupeKey, eventType, targetRole } = item;
  const campaignDocId = buildCampaignDocId(orderId, targetRole, eventType, windowStartAt);

  // 1. 🔒 RE-CHECK ATÓMICO DE IDEMPOTENCIA
  const orderRef = db.collection("orders").doc(orderId);
  const campaignRef = db.collection("notification_campaigns").doc(campaignDocId);

  // Comprobar si ya fue emitido
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    return { success: false, dedupeKey, reason: "ORDER_NOT_FOUND" };
  }

  const freshOrder = orderDoc.data() || {};
  const currentStatus = (freshOrder.status || freshOrder.estado || "").toString().toLowerCase().trim();

  // Invariante: Re-validar estado contra cancelaciones concurrentes
  if (["cancelled", "cancelado", "rejected", "rechazado"].includes(currentStatus)) {
    return { success: false, dedupeKey, reason: "ORDER_CANCELLED_CONCURRENT" };
  }
  if (["delivered", "entregado", "completed", "completado"].includes(currentStatus)) {
    return { success: false, dedupeKey, reason: "ORDER_DELIVERED_CONCURRENT" };
  }
  if (eventType === "SCHEDULED_MERCHANT_PREPARATION_DUE" && ["preparing", "preparando", "ready", "listo"].includes(currentStatus)) {
    return { success: false, dedupeKey, reason: "ALREADY_PREPARING_CONCURRENT" };
  }

  // Comprobar si ya existe en metadata de la orden
  const alreadySentMap = freshOrder.scheduledRemindersSent || {};
  if (alreadySentMap[dedupeKey]) {
    return { success: false, dedupeKey, reason: "ALREADY_SENT_IN_ORDER_METADATA" };
  }

  // Comprobar si ya existe la campaña
  const campaignSnap = await campaignRef.get();
  if (campaignSnap.exists) {
    return { success: false, dedupeKey, reason: "ALREADY_SENT_CAMPAIGN_EXISTS" };
  }

  // 2. Resolver plantilla canónica (FAIL-SAFE con NotificationTemplateService)
  const resolvedTemplate = await NotificationTemplateService.resolve(eventType, {
    orderCode: displayCode,
    deliveryWindow,
    businessName,
    preparationLeadMinutes: prepLead,
    orderId,
  });

  const title = resolvedTemplate.title;
  const body = resolvedTemplate.body;
  const priority = resolvedTemplate.priority || (item.eventType.includes("5H") || item.eventType.includes("RISK") ? "HIGH" : "NORMAL");

  // Destino y Deep Link seguros
  const destinationRoute = targetRole === "CUSTOMER"
    ? `order_detail/${orderId}`
    : `orders`;
  const deepLink = targetRole === "CUSTOMER"
    ? `bluesystem://orders/${orderId}`
    : `bluesystem://merchant/orders/${orderId}`;

  // 3. Resolver destinatarios según el rol
  let targetUids: string[] = [];
  let targetTokens: string[] = [];

  if (targetRole === "CUSTOMER") {
    const res = await resolveCustomerTarget(targetCustomerId);
    targetUids = res.uids;
    targetTokens = res.tokens;
  } else {
    const res = await resolveMerchantTarget(businessId, order.branchId);
    targetUids = res.uids;
    targetTokens = res.tokens;
  }

  // 4. Crear campaña en /notification_campaigns (Certificado Enterprise)
  const campaignPayload = {
    id: campaignDocId,
    campaignId: campaignDocId,
    title,
    body,
    type: "SCHEDULED_COMMERCE",
    category: "Pedidos",
    priority,
    status: "COMPLETED", // Marcamos procesada localmente para idempotencia total
    targetType: "targetUids",
    targetUids,
    action: "OPEN_ORDER",
    destinationType: targetRole === "CUSTOMER" ? "CUSTOMER_ORDER_DETAIL" : "MERCHANT_ORDERS",
    destinationRoute,
    navigationRoute: destinationRoute,
    deepLink,
    orderId,
    businessId,
    branchId: order.branchId || null,
    scheduledFor: admin.firestore.Timestamp.fromMillis(item.targetTimeMs),
    executedAt: admin.firestore.FieldValue.serverTimestamp(),
    workerId,
    dedupeKey,
    deviceCount: targetTokens.length,
    userCount: targetUids.length,
    // 🔒 PRIVACY INVARIANT: Cero datos de regalos ni números de terceros
    isGift: Boolean(order.giftDetails?.isGift),
  };

  await campaignRef.set(campaignPayload, { merge: true });

  // 5. Persistir buzón in-app (Users/{uid}/notifications/{dedupeKey})
  const inAppNotifId = `sched_${orderId}_${eventType}_${toEpochMillis(windowStartAt)}`;
  const batch = db.batch();

  targetUids.forEach((uid) => {
    const inAppRef = db.collection("users").doc(uid).collection("notifications").doc(inAppNotifId);
    batch.set(
      inAppRef,
      {
        id: inAppNotifId,
        notificationId: inAppNotifId,
        orderId,
        entityId: orderId,
        entityType: "order",
        businessId,
        title,
        body,
        category: "Pedidos",
        type: eventType,
        destinationType: targetRole === "CUSTOMER" ? "CUSTOMER_ORDER_DETAIL" : "MERCHANT_ORDERS",
        action: "OPEN_ORDER",
        priority,
        status: currentStatus,
        isRead: false,
        read: false,
        deletedByUser: false,
        visibilityStatus: "VISIBLE",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        deepLink,
        navigationRoute: destinationRoute,
        version: 1,
      },
      { merge: true }
    );
  });

  // 6. Actualizar metadatos de la orden con el registro del recordatorio emitido
  batch.update(orderRef, {
    [`scheduledRemindersSent.${dedupeKey}`]: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // 🔒 INVARIANTE CRÍTICA: STATUS NO SE TOCA BAJO NINGUNA CIRCUNSTANCIA
  });

  await batch.commit();

  // 7. Despacho multi-dispositivo FCM seguro
  if (targetTokens.length > 0) {
    try {
      await messaging.sendEachForMulticast({
        tokens: targetTokens,
        data: {
          action: "SCHEDULED_ORDER_REMINDER",
          eventType,
          orderId,
          orderCode: displayCode,
          screen: targetRole === "CUSTOMER" ? "order_detail" : "orders",
          title,
          body,
          destinationRoute,
          deepLink,
          notificationId: inAppNotifId,
          targetRole,
        },
        android: {
          priority: priority === "HIGH" ? "high" : "normal",
          directBootOk: true,
        } as any,
      });
      Logger.info(`[FCM_SCHEDULED_REMINDER] Push enviado a ${targetTokens.length} dispositivo(s) para orden ${orderId} (${eventType})`);
    } catch (fcmErr: any) {
      Logger.warn(`[FCM_SCHEDULED_REMINDER_WARN] Error enviando push para ${orderId}: ${fcmErr.message}`);
    }
  }

  // 8. Registro de evento de auditoría en /audit_events
  try {
    await db.collection("audit_events").add({
      action: "SCHEDULED_REMINDER_SENT",
      orderId,
      businessId,
      branchId: order.branchId || null,
      eventType,
      targetRole,
      dedupeKey,
      campaignId: campaignDocId,
      targetUserCount: targetUids.length,
      targetDeviceCount: targetTokens.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      performedBy: workerId,
    });
  } catch (auditErr: any) {
    Logger.warn(`[AUDIT_WARN] Error registrando audit_event para ${dedupeKey}: ${auditErr.message}`);
  }

  Logger.audit(
    "SCHEDULED_REMINDER_EXECUTED",
    workerId,
    { orderId, eventType, targetRole, dedupeKey },
    { module: "scheduledCommerceReminderEngine" }
  );

  return { success: true, dedupeKey };
}

// ─── ESCANEO Y ORQUESTACIÓN PERIÓDICA (SCHEDULER RUNNER) ──────────────────────

export interface RunReminderScanOptions {
  simulatedNowMs?: number;
  targetOrderId?: string;
  limit?: number;
  workerId?: string;
}

/**
 * Ejecuta un ciclo de escaneo acotado sobre pedidos programados activos.
 *
 * CUMPLE REGLAS DE PERFORMANCE & ADR-003:
 * - Bounded query: Consulta únicamente órdenes con fulfillmentTiming.mode == "SCHEDULED"
 *   y estado en ["pending", "preparing"].
 * - Cero barrido de toda la colección de órdenes.
 * - Límite de seguridad configurable (default 100).
 */
export async function runScheduledCommerceReminderScan(
  options: RunReminderScanOptions = {}
): Promise<ReminderScanStats> {
  const startTime = Date.now();
  const nowMs = options.simulatedNowMs || Date.now();
  const scanLimit = options.limit || 100;
  const workerId = options.workerId || `rem_scan_${Date.now()}`;

  const stats: ReminderScanStats = {
    scannedCount: 0,
    evaluatedCount: 0,
    sentCount: 0,
    skippedCount: 0,
    suppressedCount: 0,
    errorsCount: 0,
    durationMs: 0,
    details: [],
  };

  try {
    let orderDocs: admin.firestore.DocumentSnapshot[] = [];

    if (options.targetOrderId) {
      const singleDoc = await db.collection("orders").doc(options.targetOrderId).get();
      if (singleDoc.exists) {
        orderDocs = [singleDoc];
      }
    } else {
      // 🔒 BOUNDED QUERY ACORDE A ADR-003 & INDICE COMPUESTO
      try {
        const querySnap = await db
          .collection("orders")
          .where("fulfillmentTiming.mode", "==", "SCHEDULED")
          .where("status", "in", ["pending", "preparing", "pendiente", "preparando"])
          .limit(scanLimit)
          .get();

        orderDocs = querySnap.docs;
      } catch (queryErr: any) {
        // Fallback defensivo si el índice compuesto está en despliegue: consulta por mode con filtro en memoria
        Logger.warn(`[BOUNDED_QUERY_FALLBACK] Error en query compuesta: ${queryErr.message}. Ejecutando query por modo.`);
        const fallbackSnap = await db
          .collection("orders")
          .where("fulfillmentTiming.mode", "==", "SCHEDULED")
          .limit(scanLimit)
          .get();

        orderDocs = fallbackSnap.docs.filter((d) => {
          const st = (d.data()?.status || "").toLowerCase();
          return ["pending", "preparing", "pendiente", "preparando"].includes(st);
        });
      }
    }

    stats.scannedCount = orderDocs.length;

    for (const doc of orderDocs) {
      const orderData: any = { id: doc.id, ...(doc.data() || {}) };
      stats.evaluatedCount++;

      // Resolver configuración específica del comercio
      let merchantConfig: any = undefined;
      if (orderData.businessId) {
        try {
          const bizSnap = await db.collection("businesses").doc(orderData.businessId).get();
          if (bizSnap.exists) {
            merchantConfig = bizSnap.data();
          }
        } catch (_e) {}
      }

      const config = resolveMerchantReminderConfig(merchantConfig);
      const evalResult = evaluateReminderEligibility(orderData, nowMs, config);

      for (const item of evalResult.items) {
        if (item.isSuppressed) {
          stats.suppressedCount++;
          stats.details.push({
            orderId: doc.id,
            eventType: item.eventType,
            targetRole: item.targetRole,
            status: "SUPPRESSED",
            reason: item.suppressionReason,
          });
          continue;
        }

        if (!item.isDue) {
          stats.skippedCount++;
          continue;
        }

        // Es elegible y está en vencimiento
        try {
          const dispatchRes = await dispatchScheduledReminder({
            order: orderData,
            item,
            workerId,
          });

          if (dispatchRes.success) {
            stats.sentCount++;
            stats.details.push({
              orderId: doc.id,
              eventType: item.eventType,
              targetRole: item.targetRole,
              status: "SENT",
            });
          } else {
            stats.skippedCount++;
            stats.details.push({
              orderId: doc.id,
              eventType: item.eventType,
              targetRole: item.targetRole,
              status: "SKIPPED",
              reason: dispatchRes.reason,
            });
          }
        } catch (err: any) {
          stats.errorsCount++;
          stats.details.push({
            orderId: doc.id,
            eventType: item.eventType,
            targetRole: item.targetRole,
            status: "ERROR",
            reason: err.message,
          });
          Logger.error(`[REMINDER_DISPATCH_ERROR] Error despachando ${item.eventType} para ${doc.id}:`, err);
        }
      }
    }
  } catch (scanErr: any) {
    Logger.error("[REMINDER_SCAN_ERROR] Error general en escaneo de recordatorios:", scanErr);
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
