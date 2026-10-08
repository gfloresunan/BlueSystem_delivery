/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PROTOCOL: BSD-SCHEDULED-COMMERCE-PHASE-6-COURIER-HANDOFF-001
 *
 * Core Domain Service: Proyección Server-Authoritative de Tareas de Motorizado (Courier Task)
 *
 * INVARIANTES ARQUITECTÓNICAS MANDATORIAS:
 * 1. SINGLE SOURCE OF TRUTH: /orders/{orderId} permanece como único SSOT del pedido comercial.
 * 2. ROLE-SCOPED READ MODEL: /courier_tasks/{orderId} es un modelo derivado de solo lectura
 *    diseñado bajo el principio de menor privilegio (Least Privilege).
 * 3. ZERO PRIVATE GIFT LEAK: giftDetails.message y giftDetails.cardTemplateId JAMÁS
 *    se incluyen en la proyección ni viajan por red hacia el motorizado.
 * 4. ASSIGNMENT-LOCKED: La proyección solo existe/activa cuando hay un motorizado asignado
 *    (assignedCourierId). Órdenes en pending/preparing carecen de proyección de motorizado.
 * 5. REASSIGNMENT ISOLATION: Si se reasigna a un nuevo motorizado B, la proyección actualiza
 *    assignedCourierId = B; el motorizado anterior A pierde acceso de lectura inmediatamente.
 * 6. TERMINAL SANITIZATION: Al cancelarse o completarse, la tarea pasa a isActive = false.
 */

import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { SpecialHandlingType } from "../domain/orders/scheduledOrderContract";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (_) {}

function removeUndefinedFields<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields) as any;
  } else if (obj !== null && typeof obj === "object" && !(obj instanceof admin.firestore.Timestamp)) {
    const clean: any = {};
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (v !== undefined) {
        clean[k] = removeUndefinedFields(v);
      }
    }
    return clean;
  }
  return obj;
}

export interface CourierTaskPickup {
  businessName: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  branchId?: string;
}

export interface CourierTaskDelivery {
  recipientName: string;
  recipientPhone: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  reference?: string;
  deliveryInstructions?: string;
  isThirdPartyRecipient: boolean;
}

export interface CourierTaskFulfillment {
  isScheduled: boolean;
  windowStartAt?: admin.firestore.Timestamp | null;
  windowEndAt?: admin.firestore.Timestamp | null;
  timezone?: string;
}

export interface CourierTaskSpecialHandling {
  type: SpecialHandlingType;
  fragile: boolean;
  keepUpright: boolean;
  temperatureSensitive: boolean;
  handlingNote?: string;
  acknowledgementRequired: boolean;
  acknowledged: boolean;
  acknowledgedAt?: admin.firestore.Timestamp | null;
  acknowledgedByCourierId?: string;
}

export interface CourierTaskOperational {
  status: string; // ASSIGNED | IN_TRANSIT | DELIVERED | CANCELLED
  assignedCourierId: string;
  previousCourierId?: string;
  assignedAt?: admin.firestore.Timestamp | null;
  pickupReadyAt?: admin.firestore.Timestamp | null;
  pickedUpAt?: admin.firestore.Timestamp | null;
  deliveredAt?: admin.firestore.Timestamp | null;
  cancelledAt?: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp | null;
  updatedAt: admin.firestore.Timestamp;
  isActive: boolean;
}

export interface CourierTask {
  id: string; // Idéntico a orderId
  orderId: string;
  orderCode: string;
  orderShortCode: string;
  serviceType: "COMMERCE_DELIVERY";
  businessId: string;
  branchId: string;
  tenantId: string;
  cityId: string;
  municipalityId: string;
  departmentId: string;

  pickup: CourierTaskPickup;
  delivery: CourierTaskDelivery;
  fulfillment: CourierTaskFulfillment;
  specialHandling: CourierTaskSpecialHandling;
  operational: CourierTaskOperational;

  pagoMetodo: string;
  total: number;
  deliveryFee: number;
  tipAmount: number;
  courierEarnings: number;
  itemsSummary: Array<{
    name: string;
    quantity: number;
  }>;
}

export const PROHIBITED_COURIER_FIELDS = [
  "giftDetails.message",
  "giftDetails.cardTemplateId",
  "cardTemplateId",
  "paymentMethodToken",
  "adminMetadata",
  "fcmToken",
];

/**
 * Evalúa si una orden debe generar una proyección activa de motorizado.
 * Regla: Solo si tiene motorizado asignado y NO es de encomienda X->Y.
 */
export function shouldCreateCourierTask(orderData: Record<string, any>): boolean {
  if (!orderData) return false;
  if (orderData.serviceType === "X_TO_Y_DELIVERY") return false;
  const rawStatus = (orderData.status || orderData.estado || "").toString().toLowerCase().trim();
  if (["pending", "pendiente", "preparing", "preparando"].includes(rawStatus) && !orderData.assignedCourierId) {
    return false;
  }
  const assigned = (
    orderData.assignedCourierId ||
    orderData.motorizadoId ||
    orderData.courierId ||
    ""
  ).toString().trim();
  return Boolean(assigned);
}

/**
 * Mapea la información de manipulación especial sanitizada.
 */
export function mapSpecialHandlingProjection(orderData: Record<string, any>): CourierTaskSpecialHandling {
  const sh = orderData?.specialHandling || {};
  const rawType = (sh.type || "STANDARD").toString().toUpperCase().trim() as SpecialHandlingType;
  const isFragile = Boolean(sh.fragile);
  const isKeepUpright = Boolean(sh.keepUpright);
  const isTempSensitive = Boolean(sh.temperatureSensitive);
  const ackRequired = rawType !== "STANDARD" || isFragile || isKeepUpright || isTempSensitive;
  return {
    type: rawType,
    fragile: isFragile,
    keepUpright: isKeepUpright,
    temperatureSensitive: isTempSensitive,
    handlingNote: sh.handlingNote || undefined,
    acknowledgementRequired: ackRequired,
    acknowledged: Boolean(sh.acknowledged),
  };
}

// ─── FUNCIÓN PURA: CONSTRUCTOR DE LA PROYECCIÓN ──────────────────────────────

/**
 * Construye de forma puramente funcional la proyección CourierTask a partir de una orden canónica.
 * Aplica filtro estricto anti-PII:
 * - Omite giftDetails.message y giftDetails.cardTemplateId.
 * - Resuelve el contacto operacional según Buyer vs Recipient.
 */
export function buildAuthoritativeCourierTask(
  orderIdOrData: string | Record<string, any>,
  maybeOrderData?: Record<string, any>,
  existingTask?: Record<string, any> | null
): CourierTask | null {
  const orderData = typeof orderIdOrData === "object" ? orderIdOrData : (maybeOrderData || {});
  const orderId = typeof orderIdOrData === "string" ? orderIdOrData : (orderData.id || orderData.orderId || "ord_unknown");

  const assignedCourierId = (
    orderData.assignedCourierId ||
    orderData.motorizadoId ||
    orderData.courierId ||
    ""
  ).toString().trim();

  // Invariante: Sin motorizado asignado, no debe existir proyección activa
  if (!assignedCourierId) {
    return null;
  }

  const rawStatus = (orderData.status || orderData.estado || "assigned").toString().toLowerCase().trim();
  const isTerminal = ["delivered", "entregado", "completed", "completado", "cancelled", "cancelado", "rejected", "rechazado"].includes(rawStatus);

  // 1. Pickup
  const originLat = Number(
    orderData.businessLatitude ||
    orderData.origin?.latitude ||
    orderData.origen?.coordenadas?.latitud ||
    0
  );
  const originLng = Number(
    orderData.businessLongitude ||
    orderData.origin?.longitude ||
    orderData.origen?.coordenadas?.longitud ||
    0
  );

  const pickup: CourierTaskPickup = {
    businessName: (orderData.businessName || orderData.nombreComercio || "Comercio").toString().trim(),
    address: (orderData.businessAddress || orderData.origen?.direccion || orderData.origin?.address || "").toString().trim(),
    coordinates: {
      latitude: originLat,
      longitude: originLng,
    },
    phone: (orderData.businessPhone || orderData.telefonoComercio || "").toString().trim() || undefined,
    branchId: (orderData.branchId || "").toString().trim() || undefined,
  };

  // 2. Delivery & Contacto (Buyer vs Recipient Privacy)
  const destLat = Number(
    orderData.destinationLatitude ||
    orderData.latitude ||
    orderData.destination?.latitude ||
    orderData.destino?.coordenadas?.latitud ||
    0
  );
  const destLng = Number(
    orderData.destinationLongitude ||
    orderData.longitude ||
    orderData.destination?.longitude ||
    orderData.destino?.coordenadas?.longitud ||
    0
  );

  const recipientObj = orderData.recipient || {};
  const isGift = Boolean(orderData.giftDetails?.isGift);
  const giftRecipientName = (orderData.giftDetails?.recipientName || orderData.recipientName || recipientObj.name || "").toString().trim();
  const giftRecipientPhone = (orderData.giftDetails?.recipientPhone || orderData.recipientPhone || recipientObj.phone || "").toString().trim();

  const isThirdParty = Boolean((recipientObj.isThirdParty && recipientObj.name) || (isGift && giftRecipientName) || orderData.recipientName);

  // Regla de Menor Privilegio: Si hay destinatario (regalo o tercero), usar sus datos; sino comprador.
  const recipientName = isThirdParty && giftRecipientName
    ? giftRecipientName
    : String(orderData.customerName || orderData.nombreCliente || "Cliente").trim();

  const recipientPhone = isThirdParty && giftRecipientPhone
    ? giftRecipientPhone
    : String(orderData.customerPhone || orderData.telefonoCliente || "").trim();

  const deliveryInstructions = String(
    recipientObj.deliveryInstructions ||
    orderData.deliveryInstructions ||
    orderData.instruccionesEntrega ||
    orderData.notes ||
    orderData.deliveryNote ||
    ""
  ).trim();

  const delivery: CourierTaskDelivery = {
    recipientName,
    recipientPhone,
    address: String(orderData.destinationAddress || orderData.destination?.address || orderData.direccion || "").trim(),
    coordinates: {
      latitude: destLat,
      longitude: destLng,
    },
    reference: String(orderData.destinationReference || orderData.referencia || "").trim() || undefined,
    deliveryInstructions: deliveryInstructions || undefined,
    isThirdPartyRecipient: isThirdParty,
  };

  // 3. Fulfillment / Programación
  const fulfillmentTiming = orderData.fulfillmentTiming || {};
  const isScheduled = String(fulfillmentTiming.mode || "").toUpperCase() === "SCHEDULED";

  let windowStartAt = fulfillmentTiming.windowStartAt || null;
  if (!windowStartAt && fulfillmentTiming.windowStartIso) {
    try {
      windowStartAt = admin.firestore.Timestamp.fromDate(new Date(fulfillmentTiming.windowStartIso));
    } catch (_) {}
  }

  let windowEndAt = fulfillmentTiming.windowEndAt || null;
  if (!windowEndAt && fulfillmentTiming.windowEndIso) {
    try {
      windowEndAt = admin.firestore.Timestamp.fromDate(new Date(fulfillmentTiming.windowEndIso));
    } catch (_) {}
  }

  const fulfillment: CourierTaskFulfillment = {
    isScheduled,
    windowStartAt,
    windowEndAt,
    timezone: fulfillmentTiming.timezone || "America/Managua",
  };

  // 4. Special Handling & Acknowledgement
  const specialHandlingRaw = orderData.specialHandling || {};
  const rawType = (specialHandlingRaw.type || "STANDARD").toString().toUpperCase().trim() as SpecialHandlingType;
  const isFragile = Boolean(specialHandlingRaw.fragile);
  const isKeepUpright = Boolean(specialHandlingRaw.keepUpright);
  const isTempSensitive = Boolean(specialHandlingRaw.temperatureSensitive);

  const ackRequired = rawType !== "STANDARD" || isFragile || isKeepUpright || isTempSensitive;

  // Preservar estado previo de acknowledgement si no cambió el motorizado
  const prevAck = existingTask?.specialHandling?.acknowledged === true &&
                  existingTask?.specialHandling?.acknowledgedByCourierId === assignedCourierId;

  const specialHandling: CourierTaskSpecialHandling = {
    type: rawType,
    fragile: isFragile,
    keepUpright: isKeepUpright,
    temperatureSensitive: isTempSensitive,
    handlingNote: specialHandlingRaw.handlingNote ? String(specialHandlingRaw.handlingNote).trim() : undefined,
    acknowledgementRequired: ackRequired,
    acknowledged: prevAck,
    acknowledgedAt: prevAck ? (existingTask?.specialHandling?.acknowledgedAt || null) : null,
    acknowledgedByCourierId: prevAck ? assignedCourierId : undefined,
  };

  // 5. Items Summary (Solo nombres y cantidades para verificación de bulto, sin precios por ítem)
  const rawItems = Array.isArray(orderData.items) ? orderData.items : [];
  const itemsSummary = rawItems.map((it: any) => ({
    name: String(it.name || it.nombre || it.title || "Producto").trim(),
    quantity: Number(it.quantity || it.cantidad || 1),
  }));

  // 6. Operational State
  const previousCourierId = existingTask?.operational?.assignedCourierId !== assignedCourierId
    ? existingTask?.operational?.assignedCourierId
    : existingTask?.operational?.previousCourierId;

  const operational: CourierTaskOperational = {
    status: rawStatus.toUpperCase(),
    assignedCourierId,
    previousCourierId: previousCourierId || undefined,
    assignedAt: orderData.assignedAt || existingTask?.operational?.assignedAt || admin.firestore.Timestamp.now(),
    pickupReadyAt: orderData.pickupReadyAt || existingTask?.operational?.pickupReadyAt || null,
    pickedUpAt: orderData.pickedUpAt || existingTask?.operational?.pickedUpAt || null,
    deliveredAt: orderData.deliveredAt || existingTask?.operational?.deliveredAt || null,
    cancelledAt: orderData.cancelledAt || existingTask?.operational?.cancelledAt || null,
    createdAt: existingTask?.operational?.createdAt || orderData.createdAt || admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    isActive: !isTerminal,
  };

  return removeUndefinedFields<CourierTask>({
    id: orderId,
    orderId,
    orderCode: String(orderData.orderCode || "").trim(),
    orderShortCode: String(orderData.orderShortCode || "").trim(),
    serviceType: "COMMERCE_DELIVERY",
    businessId: String(orderData.businessId || "").trim(),
    branchId: String(orderData.branchId || "").trim(),
    tenantId: String(orderData.tenantId || orderData.commercialTenantId || "default").trim(),
    cityId: String(orderData.cityId || orderData.commercialMunicipalityId || "").trim(),
    municipalityId: String(orderData.commercialMunicipalityId || orderData.municipalityId || "").trim(),
    departmentId: String(orderData.departmentId || "").trim(),

    pickup,
    delivery,
    fulfillment,
    specialHandling,
    operational,

    pagoMetodo: String(orderData.pagoMetodo || orderData.paymentMethod || "CASH").trim(),
    total: Number(orderData.total || 0),
    deliveryFee: Number(orderData.deliveryFee || orderData.costoEnvio || 0),
    tipAmount: Number(orderData.tipAmount || orderData.tip || 0),
    courierEarnings: Number(orderData.courierTotalEarnings || orderData.courierEarnings || orderData.deliveryFee || 0),
    itemsSummary,
  });
}

// ─── GESTIÓN ATÓMICA DE LA PROYECCIÓN EN FIRESTORE ──────────────────────────

/**
 * Sincroniza de forma server-authoritative la proyección /courier_tasks/{orderId}
 * cuando un pedido cambia de estado o asignación.
 */
export async function syncCourierTaskProjection(
  orderId: string,
  orderData: Record<string, any>
): Promise<{ success: boolean; taskId?: string; action: "CREATED" | "UPDATED" | "REVOKED" | "NOOP"; reason?: string }> {
  const cleanOrderId = (orderId || "").trim();
  if (!cleanOrderId) {
    return { success: false, action: "NOOP", reason: "INVALID_ORDER_ID" };
  }

  const assignedCourierId = (
    orderData.assignedCourierId ||
    orderData.motorizadoId ||
    orderData.courierId ||
    ""
  ).toString().trim();

  const taskRef = db.collection("courier_tasks").doc(cleanOrderId);
  const existingSnap = await taskRef.get();
  const existingTask = existingSnap.exists ? existingSnap.data() : null;

  // CASO 1: Desasignación o Cancelación previa a asignación -> Revocar / desactivar tarea
  if (!assignedCourierId) {
    if (existingTask && existingTask.operational?.isActive) {
      await taskRef.set(
        {
          operational: {
            ...existingTask.operational,
            assignedCourierId: "",
            previousCourierId: existingTask.operational.assignedCourierId,
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
      Logger.info(`[COURIER_TASK_REVOKED] Tarea revocada para orderId=${cleanOrderId} (sin courier asignado)`);
      return { success: true, taskId: cleanOrderId, action: "REVOKED" };
    }
    return { success: true, action: "NOOP", reason: "UNASSIGNED_ORDER_NO_TASK" };
  }

  // CASO 2: Construir proyección autoritativa filtrada
  const projection = buildAuthoritativeCourierTask(cleanOrderId, orderData, existingTask);
  if (!projection) {
    return { success: false, action: "NOOP", reason: "FAILED_TO_BUILD_PROJECTION" };
  }

  // Validar si es creación inicial o actualización/reasignación
  const isNew = !existingSnap.exists;
  const isReassignment = existingTask && existingTask.operational?.assignedCourierId !== assignedCourierId;

  await taskRef.set(projection);

  if (isNew) {
    Logger.info(`[COURIER_TASK_CREATED] Tarea creada para orderId=${cleanOrderId}, courierUid=${assignedCourierId}`);
    return { success: true, taskId: cleanOrderId, action: "CREATED" };
  } else if (isReassignment) {
    Logger.info(
      `[COURIER_TASK_REASSIGNED] Tarea reasignada de ${existingTask?.operational?.assignedCourierId} a ${assignedCourierId} para orderId=${cleanOrderId}`
    );
    return { success: true, taskId: cleanOrderId, action: "UPDATED" };
  } else {
    Logger.info(`[COURIER_TASK_UPDATED] Tarea actualizada para orderId=${cleanOrderId}, status=${projection.operational.status}`);
    return { success: true, taskId: cleanOrderId, action: "UPDATED" };
  }
}

/**
 * Registra el acuse de recibo de manipulación especial por parte del motorizado.
 */
export async function acknowledgeSpecialHandlingByCourier(
  orderId: string,
  courierId: string
): Promise<{ success: boolean; reason?: string }> {
  const cleanOrderId = (orderId || "").trim();
  const cleanCourierId = (courierId || "").trim();

  if (!cleanOrderId || !cleanCourierId) {
    return { success: false, reason: "INVALID_PARAMETERS" };
  }

  const taskRef = db.collection("courier_tasks").doc(cleanOrderId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) {
    return { success: false, reason: "TASK_NOT_FOUND" };
  }

  const taskData = taskSnap.data() || {};
  if (taskData.operational?.assignedCourierId !== cleanCourierId) {
    return { success: false, reason: "COURIER_NOT_ASSIGNED_TO_TASK" };
  }

  const now = admin.firestore.Timestamp.now();

  // Actualizar atómicamente la proyección y la orden canónica
  const orderRef = db.collection("orders").doc(cleanOrderId);

  await db.runTransaction(async (transaction) => {
    transaction.update(taskRef, {
      "specialHandling.acknowledged": true,
      "specialHandling.acknowledgedAt": now,
      "specialHandling.acknowledgedByCourierId": cleanCourierId,
      "operational.updatedAt": now,
    });

    transaction.update(orderRef, {
      "specialHandling.acknowledged": true,
      "specialHandling.acknowledgedAt": now,
      "specialHandling.acknowledgedByCourierId": cleanCourierId,
      updatedAt: now,
    });
  });

  Logger.info(`[SPECIAL_HANDLING_ACK] Courier ${cleanCourierId} confirmó manipulación especial para ${cleanOrderId}`);
  return { success: true };
}
