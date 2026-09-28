/**
 * BlueSystem Delivery Enterprise — Merchant Financial Settlement Lifecycle
 * Protocol: BSD-FINANCE-MERCHANT-SETTLEMENT-001
 * 
 * Implementación formal, determinística, auditable e inmutable del ciclo de
 * liquidación financiera entre BlueSystem Delivery y cada comercio afiliado.
 * 
 * Consume y consolida:
 *   - /financial_events (SSOT Contable General)
 *   - /merchant_summaries/{businessId} (Documento Agregado)
 *   - /platform_config/fees & /system_config/global (Comisiones contractuales)
 * 
 * Reglas Críticas:
 *   1. Toda cantidad se opera en CENTAVOS ENTEROS (integer cents) para evitar float issues.
 *   2. Una liquidación CERRADA / FROZEN jamás debe modificarse o recalcularse.
 *   3. Aislamiento Multi-Tenant: un comercio solo puede interactuar con sus propias liquidaciones.
 *   4. Ninguna transición arbitraria permitida en la máquina de estados.
 *   5. Registro inmutable en /audit_events en cada transición crítica.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";
import { EmailService } from "../services/emailService";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

// ─── Tipos de Dominio ─────────────────────────────────────────────────────────

export type SettlementStatus =
  | "DRAFT"
  | "PREPARED"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "CLOSED"
  | "DISPUTED"
  | "UNDER_REVIEW"
  | "RESOLVED";

export type PeriodType = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";

export interface SettlementHistoryEntry {
  fromStatus: SettlementStatus;
  toStatus: SettlementStatus;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  timestamp: admin.firestore.Timestamp;
  note?: string;
}

export interface DisputeData {
  disputedAt: admin.firestore.Timestamp;
  disputedByUid: string;
  disputedByEmail: string;
  reason: string;
  claimedDifferenceCents: number;
  description: string;
  evidenceUrl?: string | null;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  resolution?: string | null;
  resolvedByUid?: string | null;
  resolvedAt?: admin.firestore.Timestamp | null;
  adjustmentAppliedCents?: number;
}

// ─── Helpers de Aislamiento y Roles ──────────────────────────────────────────

function isCallerPlatformAdmin(context: functions.https.CallableContext): boolean {
  const token = (context.auth?.token || {}) as any;
  const role = (token.role || token.eiamRole || "").toString().toUpperCase();
  return (
    token.admin === true ||
    token.isSuperAdmin === true ||
    token.supervisor === true ||
    ["SUPER_ADMIN", "ADMIN", "AUDITOR", "PLATFORM_ADMIN", "SUPERVISOR"].includes(role)
  );
}

async function resolveCallerBusinessId(
  context: functions.https.CallableContext
): Promise<string | null> {
  if (!context.auth) return null;
  const token = (context.auth.token || {}) as any;
  if (token.businessId && typeof token.businessId === "string") {
    return token.businessId;
  }
  // Fallback: verificar documento de usuario en Firestore
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.exists) {
    const data = userDoc.data() || {};
    return data.businessId || data.eiamBusinessId || null;
  }
  return null;
}

/**
 * Registra un evento inmutable en /audit_events
 */
async function recordAuditEvent(params: {
  action: string;
  businessId: string;
  settlementId: string;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const auditRef = db.collection("audit_events").doc();
    await auditRef.set({
      eventId: auditRef.id,
      timestamp: FieldValue.serverTimestamp(),
      domain: "MERCHANT_SETTLEMENT",
      action: params.action,
      businessId: params.businessId,
      settlementId: params.settlementId,
      actorUid: params.actorUid,
      actorRole: params.actorRole,
      actorEmail: params.actorEmail || "unknown",
      metadata: params.metadata || {},
      immutable: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    functions.logger.error("[SETTLEMENT_AUDIT_ERROR] Error registrando audit_event:", err);
  }
}

/**
 * Resuelve autoritativamente el UID y correo del propietario del comercio.
 */
async function resolveMerchantOwner(businessId: string): Promise<{
  ownerUid: string | null;
  ownerEmail: string | null;
  businessName: string;
}> {
  let ownerUid: string | null = null;
  let ownerEmail: string | null = null;
  let businessName = businessId;

  try {
    const bizSnap = await db.collection("businesses").doc(businessId).get();
    if (bizSnap.exists) {
      const bData = bizSnap.data() || {};
      businessName = bData.name || bData.nombre || bData.businessName || businessId;
      ownerUid = bData.ownerUid || bData.userId || bData.createdByUid || null;
      ownerEmail = bData.email || bData.correo || null;
    }

    if (!ownerUid) {
      const userByBizQuery = await db
        .collection("users")
        .where("businessId", "==", businessId)
        .limit(1)
        .get();
      if (!userByBizQuery.empty) {
        const uDoc = userByBizQuery.docs[0];
        ownerUid = uDoc.id;
        ownerEmail = ownerEmail || uDoc.data().email || null;
      } else {
        const userByBizIds = await db
          .collection("users")
          .where("businessIds", "array-contains", businessId)
          .limit(1)
          .get();
        if (!userByBizIds.empty) {
          const uDoc = userByBizIds.docs[0];
          ownerUid = uDoc.id;
          ownerEmail = ownerEmail || uDoc.data().email || null;
        }
      }
    }

    if (!ownerUid) {
      const directUserDoc = await db.collection("users").doc(businessId).get();
      if (directUserDoc.exists) {
        ownerUid = directUserDoc.id;
        ownerEmail = ownerEmail || directUserDoc.data()?.email || null;
      }
    }

    if (ownerUid && !ownerEmail) {
      const uDoc = await db.collection("users").doc(ownerUid).get();
      if (uDoc.exists) {
        ownerEmail = uDoc.data()?.email || null;
      }
    }
  } catch (err: any) {
    functions.logger.warn(
      `[SETTLEMENT_NOTIFICATION] Error resolviendo owner para businessId ${businessId}:`,
      err?.message
    );
  }

  return { ownerUid, ownerEmail, businessName };
}

/**
 * Encola notificación Push (vía /notification_campaigns) y despacho de Email de forma no-bloqueante e idempotente.
 */
async function enqueueSettlementPaymentNotification(params: {
  settlementId: string;
  businessId: string;
  paidCents: number;
  transferReference: string;
  bankName: string;
}): Promise<void> {
  const { settlementId, businessId, paidCents, transferReference, bankName } = params;
  try {
    const { ownerUid, ownerEmail, businessName } = await resolveMerchantOwner(businessId);

    // 1. Encolar notificación Push idempotente en /notification_campaigns
    const campaignDocId = `settlement_${settlementId}_PAYMENT_REGISTERED`;
    const campaignRef = db.collection("notification_campaigns").doc(campaignDocId);
    const campaignSnap = await campaignRef.get();

    if (!campaignSnap.exists && ownerUid) {
      await campaignRef.set({
        id: campaignDocId,
        campaignId: campaignDocId,
        title: "💰 Pago de liquidación registrado",
        body: "Se ha registrado una transferencia para tu liquidación comercial. Revisa el comprobante y confirma la recepción.",
        type: "FINANCIAL",
        category: "Liquidaciones",
        priority: "HIGH",
        status: "QUEUED",
        targetType: "targetUids",
        targetUids: [ownerUid],
        action: "SETTLEMENT_PAYMENT_REGISTERED",
        destinationType: "SCREEN",
        destinationRoute: "settlements",
        navigationRoute: "settlements",
        deepLink: `bluesystem://merchant/settlements/${settlementId}`,
        settlementId,
        businessId,
        entityType: "SETTLEMENT",
        entityId: settlementId,
        createdAt: FieldValue.serverTimestamp(),
        scheduledAt: FieldValue.serverTimestamp(),
        attempts: 0,
      });
      functions.logger.info(
        `[SETTLEMENT_NOTIFICATION] Campaña Push encolada: ${campaignDocId} para UID ${ownerUid}`
      );
    }

    // 2. Intento no-bloqueante de Email Transaccional Corporativo
    if (ownerEmail) {
      try {
        const amountNio = (paidCents / 100).toFixed(2);
        await EmailService.sendTransactionalEmail({
          eventId: `settlement_payment_${settlementId}`,
          eventType: "SETTLEMENT_PAYMENT_REGISTERED",
          recipient: ownerEmail,
          recipientUid: ownerUid || undefined,
          templateId: "settlement_payment_registered",
          variables: {
            businessName: businessName || "Estimado Comercio",
            settlementId,
            amountNio,
            bankName: bankName || "Transferencia Bancaria",
            reference: transferReference || "N/A",
            portalUrl: "https://comercio.bluesystemdelivery.com",
            supportEmail: "soporte@bluesystemdelivery.com",
            year: new Date().getFullYear().toString(),
            platformName: "BlueSystem Delivery",
            tenantName: "BlueSystem Platform",
          },
          entityType: "SYSTEM",
          entityId: settlementId,
        });
        functions.logger.info(
          `[SETTLEMENT_EMAIL] Correo transaccional enviado a ${ownerEmail} para settlement ${settlementId}`
        );
      } catch (emailErr: any) {
        functions.logger.warn(
          `[SETTLEMENT_EMAIL] Error no-bloqueante al enviar email para settlement ${settlementId}:`,
          emailErr?.message
        );
      }
    }
  } catch (err: any) {
    functions.logger.error(
      `[SETTLEMENT_NOTIFICATION_ERROR] Error en enqueueSettlementPaymentNotification para ${settlementId}:`,
      err
    );
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// 1. CALLABLE: adminGeneratePreSettlement
// ══════════════════════════════════════════════════════════════════════════════

export const adminGeneratePreSettlement = functions.https.onCall(
  async (data, context) => {
    // 1. Validación de Roles de Admin
    if (!context.auth || !isCallerPlatformAdmin(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores de plataforma pueden generar pre-liquidaciones."
      );
    }

    const {
      businessId,
      notes,
    } = data || {};

    const startDate = data?.startDate || data?.periodStart;
    const endDate = data?.endDate || data?.periodEnd;
    const periodType = (data?.periodType || data?.settlementPeriod || "CUSTOM") as PeriodType;

    if (!businessId || typeof businessId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "businessId es requerido.");
    }

    if (!startDate || !endDate) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "startDate y endDate son requeridos (formato YYYY-MM-DD o ISO)."
      );
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new functions.https.HttpsError("invalid-argument", "Fechas inválidas provistas.");
    }

    if (start.getTime() > end.getTime()) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La fecha de inicio no puede ser posterior a la fecha de corte."
      );
    }

    const startTimestamp = Timestamp.fromDate(start);
    const endTimestamp = Timestamp.fromDate(end);

    // 2. Verificar que el comercio exista
    const bizDoc = await db.collection("businesses").doc(businessId).get();
    if (!bizDoc.exists) {
      throw new functions.https.HttpsError("not-found", `Comercio no encontrado: ${businessId}`);
    }
    const bizData = bizDoc.data() || {};
    const businessName = bizData.name || bizData.nombre || bizData.comercioNombre || businessId;
    const orgId = bizData.orgId || bizData.tenantId || null;
    const tenantId = bizData.tenantId || bizData.orgId || null;

    // 3. Protección contra solapamiento con liquidaciones CERRADAS
    const existingClosedQuery = await db
      .collection("merchant_settlements")
      .where("businessId", "==", businessId)
      .where("isFrozen", "==", true)
      .get();

    for (const doc of existingClosedQuery.docs) {
      const s = doc.data();
      const sStart = (s.periodStart as admin.firestore.Timestamp)?.toDate?.() || new Date(0);
      const sEnd = (s.periodEnd as admin.firestore.Timestamp)?.toDate?.() || new Date(0);

      // Verificación de solapamiento estricto
      if (start <= sEnd && end >= sStart) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `El rango solicitado (${startDate} a ${endDate}) se solapa con la liquidación cerrada #${doc.id} (${sStart.toISOString().slice(0, 10)} al ${sEnd.toISOString().slice(0, 10)}).`
        );
      }
    }

    // 4. Query a /financial_events en el rango de corte con resiliencia de índice
    let eventsDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[];
    try {
      const eventsQuery = await db
        .collection("financial_events")
        .where("businessId", "==", businessId)
        .where("createdAt", ">=", startTimestamp)
        .where("createdAt", "<=", endTimestamp)
        .get();
      eventsDocs = eventsQuery.docs;
    } catch (indexErr: any) {
      functions.logger.warn(
        "[SETTLEMENT_INDEX_FALLBACK] Índice compuesto no listo, ejecutando consulta por businessId y filtro temporal:",
        indexErr?.message
      );
      const allBizEvents = await db
        .collection("financial_events")
        .where("businessId", "==", businessId)
        .get();
      const startMs = startTimestamp.toMillis();
      const endMs = endTimestamp.toMillis();
      eventsDocs = allBizEvents.docs.filter((docSnap) => {
        const cAt = docSnap.data().createdAt;
        if (!cAt) return false;
        const ms = typeof cAt.toMillis === "function" ? cAt.toMillis() : new Date(cAt).getTime();
        return ms >= startMs && ms <= endMs;
      });
    }

    let grossSalesCents = 0;
    let platformFeesCents = 0;
    let discountsCents = 0;
    let adjustmentsCents = 0;
    const orderIds = new Set<string>();
    const includedEventIds: string[] = [];

    eventsDocs.forEach((docSnap) => {
      const ev = docSnap.data();
      // Omitir si ya pertenece a otra liquidación cerrada
      if (ev.settlementStatus === "SETTLED" && ev.settlementId) {
        return;
      }

      const amountCents = Number(ev.amountCents || 0);
      includedEventIds.push(docSnap.id);

      if (ev.orderId) {
        orderIds.add(ev.orderId);
      }

      if (ev.eventType === "ORDER_REVENUE") {
        grossSalesCents += amountCents;
      } else if (ev.eventType === "PLATFORM_FEE") {
        platformFeesCents += amountCents;
      } else if (ev.eventType === "REFUND") {
        discountsCents += amountCents;
      } else if (ev.eventType === "ADJUSTMENT") {
        if (ev.direction === "CREDIT") {
          adjustmentsCents += amountCents;
        } else {
          adjustmentsCents -= amountCents;
        }
      }
    });

    // 5. Cálculo determinístico del neto en centavos
    const netPayableCents = Math.max(
      0,
      grossSalesCents - platformFeesCents - discountsCents + adjustmentsCents
    );

    const now = FieldValue.serverTimestamp();
    const callerUid = context.auth.uid;
    const callerEmail = context.auth.token.email || "admin@bluesystem.com";

    // 6. Verificar si ya existe un DRAFT o PREPARED no cerrado para actualizarlo
    const existingDraftQuery = await db
      .collection("merchant_settlements")
      .where("businessId", "==", businessId)
      .where("isFrozen", "==", false)
      .where("status", "in", ["DRAFT", "PREPARED"])
      .limit(1)
      .get();

    let settlementId: string;
    let settlementRef: admin.firestore.DocumentReference;
    const historyEntry: SettlementHistoryEntry = {
      fromStatus: "DRAFT",
      toStatus: "PREPARED",
      actorUid: callerUid,
      actorRole: "ADMIN",
      actorEmail: callerEmail,
      timestamp: Timestamp.now(),
      note: notes || "Pre-liquidación generada por administrador.",
    };

    if (!existingDraftQuery.empty) {
      settlementRef = existingDraftQuery.docs[0].ref;
      settlementId = settlementRef.id;
      await settlementRef.update({
        periodType,
        periodStart: startTimestamp,
        periodEnd: endTimestamp,
        cutoffAt: now,
        grossSalesCents,
        platformFeesCents,
        discountsCents,
        adjustmentsCents,
        netPayableCents,
        ordersCount: orderIds.size,
        includedEventIds: includedEventIds.slice(0, 500), // límite de seguridad de tamaño
        status: "PREPARED",
        updatedAt: now,
        updatedByUid: callerUid,
        history: FieldValue.arrayUnion(historyEntry),
      });
    } else {
      settlementRef = db.collection("merchant_settlements").doc();
      settlementId = settlementRef.id;
      await settlementRef.set({
        settlementId,
        businessId,
        businessName,
        orgId,
        tenantId,
        currency: "NIO",
        periodType,
        periodStart: startTimestamp,
        periodEnd: endTimestamp,
        cutoffAt: now,
        grossSalesCents,
        platformFeesCents,
        discountsCents,
        adjustmentsCents,
        netPayableCents,
        ordersCount: orderIds.size,
        includedEventIds: includedEventIds.slice(0, 500),
        status: "PREPARED",
        isFrozen: false,
        frozenAt: null,
        paidCents: null,
        paymentDate: null,
        bankName: null,
        transferReference: null,
        receiptUrl: null,
        receiptPath: null,
        paidByUid: null,
        paidByName: null,
        paidAt: null,
        confirmedBy: null,
        dispute: null,
        createdAt: now,
        createdByUid: callerUid,
        updatedAt: now,
        history: [historyEntry],
      });
    }

    await recordAuditEvent({
      action: "SETTLEMENT_PREPARED",
      businessId,
      settlementId,
      actorUid: callerUid,
      actorRole: "ADMIN",
      actorEmail: callerEmail,
      metadata: {
        grossSalesCents,
        platformFeesCents,
        netPayableCents,
        ordersCount: orderIds.size,
        startDate,
        endDate,
      },
    });

    return {
      success: true,
      settlementId,
      businessId,
      grossSalesCents,
      platformFeesCents,
      discountsCents,
      adjustmentsCents,
      netPayableCents,
      ordersCount: orderIds.size,
      status: "PREPARED",
    };
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. CALLABLE: adminRecordSettlementPayment
// ══════════════════════════════════════════════════════════════════════════════

export const adminRecordSettlementPayment = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !isCallerPlatformAdmin(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores pueden registrar pagos de liquidación."
      );
    }

    const {
      settlementId,
      paidCents,
      bankName,
      transferReference,
      paymentDate, // ISO string
      receiptPath,
      notes,
    } = data || {};

    const receiptUrl = data?.receiptUrl || data?.transferReceiptUrl || null;
    const allowDiscrepancy = Boolean(data?.allowDiscrepancy ?? data?.allowPartialPayment ?? false);
    const discrepancyReason = data?.discrepancyReason || data?.exceptionReason || null;

    if (!settlementId || typeof settlementId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "settlementId es obligatorio.");
    }

    if (typeof paidCents !== "number" || paidCents <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "paidCents debe ser un entero positivo en centavos."
      );
    }

    if (!transferReference || !bankName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "bankName y transferReference son obligatorios para documentar la transferencia bancaria."
      );
    }

    const callerUid = context.auth.uid;
    const callerEmail = context.auth.token.email || "admin@bluesystem.com";

    return await db.runTransaction(async (transaction) => {
      const settlementRef = db.collection("merchant_settlements").doc(settlementId);
      const settlementSnap = await transaction.get(settlementRef);

      if (!settlementSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Liquidación no encontrada.");
      }

      const settlement = settlementSnap.data() || {};

      // Inmutabilidad estricta
      if (settlement.isFrozen === true || settlement.status === "CLOSED") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Esta liquidación ya fue CERRADA Y CONGELADA. No puede alterarse su pago."
        );
      }

      // Máquina de estados: Solo se puede pagar desde PREPARED, AWAITING_PAYMENT o RESOLVED
      const allowedFrom = ["PREPARED", "AWAITING_PAYMENT", "RESOLVED", "DRAFT"];
      if (!allowedFrom.includes(settlement.status)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `No se puede registrar pago desde el estado actual: ${settlement.status}`
        );
      }

      // Regla Crítica: Validar monto pagado contra neto liquidado
      const expectedNetCents = Number(settlement.netPayableCents || 0);
      const diffCents = paidCents - expectedNetCents;

      if (diffCents !== 0 && !allowDiscrepancy) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Monto transferido (C$ ${(paidCents / 100).toFixed(2)}) diferente al monto liquidado (C$ ${(expectedNetCents / 100).toFixed(2)}). Diferencia: C$ ${(diffCents / 100).toFixed(2)}. Requiere confirmación de excepción explícita.`
        );
      }

      const now = FieldValue.serverTimestamp();
      const pDate = paymentDate ? Timestamp.fromDate(new Date(paymentDate)) : Timestamp.now();

      const historyEntry: SettlementHistoryEntry = {
        fromStatus: settlement.status,
        toStatus: "AWAITING_CONFIRMATION",
        actorUid: callerUid,
        actorRole: "ADMIN",
        actorEmail: callerEmail,
        timestamp: Timestamp.now(),
        note: notes || `Pago registrado por referencia #${transferReference} (${bankName}).`,
      };

      transaction.update(settlementRef, {
        paidCents,
        bankName,
        transferReference,
        paymentDate: pDate,
        receiptUrl: receiptUrl || null,
        receiptPath: receiptPath || null,
        paidByUid: callerUid,
        paidByName: callerEmail,
        paidAt: now,
        hasDiscrepancy: diffCents !== 0,
        discrepancyCents: diffCents,
        discrepancyReason: diffCents !== 0 ? (discrepancyReason || "Ajuste documentado") : null,
        status: "AWAITING_CONFIRMATION",
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry),
      });

      return {
        success: true,
        settlementId,
        businessId: settlement.businessId || data.businessId || "unknown",
        status: "AWAITING_CONFIRMATION",
        paidCents,
        diffCents,
      };
    }).then(async (result) => {
      const resolvedBusinessId = result.businessId || data.businessId || "unknown";
      await recordAuditEvent({
        action: "SETTLEMENT_PAYMENT_RECORDED",
        businessId: resolvedBusinessId,
        settlementId,
        actorUid: callerUid,
        actorRole: "ADMIN",
        actorEmail: callerEmail,
        metadata: {
          paidCents,
          transferReference,
          bankName,
          receiptUrl: receiptUrl || null,
        },
      });

      // Notificación post-pago Push + Email (no-bloqueante)
      await enqueueSettlementPaymentNotification({
        settlementId,
        businessId: resolvedBusinessId,
        paidCents,
        transferReference,
        bankName,
      });

      return result;
    });
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. CALLABLE: merchantConfirmSettlement
// ══════════════════════════════════════════════════════════════════════════════

export const merchantConfirmSettlement = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debe autenticarse para confirmar la liquidación."
      );
    }

    const { settlementId, notes } = data || {};
    if (!settlementId || typeof settlementId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "settlementId es obligatorio.");
    }

    const callerUid = context.auth.uid;
    const callerEmail = context.auth.token.email || "comercio@bluesystem.com";
    const callerBusinessId = await resolveCallerBusinessId(context);
    const isAdmin = isCallerPlatformAdmin(context);

    return await db.runTransaction(async (transaction) => {
      const settlementRef = db.collection("merchant_settlements").doc(settlementId);
      const settlementSnap = await transaction.get(settlementRef);

      if (!settlementSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Liquidación no encontrada.");
      }

      const settlement = settlementSnap.data() || {};
      const settlementBizId = settlement.businessId;

      // 1. Aislamiento Multi-Tenant Absoluto
      if (!isAdmin && (!callerBusinessId || callerBusinessId !== settlementBizId)) {
        Logger.security(
          "CROSS_TENANT_SETTLEMENT_VIOLATION",
          "ERROR",
          { callerUid, callerBusinessId, targetBusinessId: settlementBizId, settlementId },
          { module: "merchantSettlement" }
        );
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tiene autorización para confirmar liquidaciones de otro comercio."
        );
      }

      // 2. Idempotencia: Si ya está cerrada y confirmada, retornar OK
      if (settlement.status === "CLOSED" && settlement.isFrozen === true) {
        functions.logger.info(`[SETTLEMENT_IDEMPOTENT] Liquidación #${settlementId} ya estaba confirmada y cerrada.`);
        return {
          success: true,
          idempotent: true,
          settlementId,
          status: "CLOSED",
          isFrozen: true,
        };
      }

      // 3. Máquina de estados: Solo puede confirmarse si está en AWAITING_CONFIRMATION o PAID
      if (settlement.status !== "AWAITING_CONFIRMATION" && settlement.status !== "PAID") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `La liquidación no puede confirmarse en su estado actual: ${settlement.status}. Debe haber un pago registrado pendiente de confirmación.`
        );
      }

      // 4. Bloqueo si hay disputa abierta
      if (settlement.status === "DISPUTED") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No puede confirmarse una liquidación con una disputa abierta. La disputa debe ser resuelta previamente."
        );
      }

      const now = FieldValue.serverTimestamp();
      const confirmedPayload = {
        confirmedAt: Timestamp.now(),
        confirmedByUid: callerUid,
        confirmedByEmail: callerEmail,
        notes: notes || "Conforme con la liquidación y transferencia recibida.",
      };

      const historyEntry: SettlementHistoryEntry = {
        fromStatus: settlement.status,
        toStatus: "CLOSED",
        actorUid: callerUid,
        actorRole: isAdmin ? "ADMIN_PROXY" : "MERCHANT_OWNER",
        actorEmail: callerEmail,
        timestamp: Timestamp.now(),
        note: notes || "Liquidación confirmada por el comercio. Período cerrado y congelado.",
      };

      // 5. Cierre y Congelamiento Inmutable
      transaction.update(settlementRef, {
        status: "CLOSED",
        isFrozen: true,
        frozenAt: now,
        confirmedBy: confirmedPayload,
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry),
      });

      // 6. Impacto Atómico en /merchant_summaries/{businessId}
      // Se descuenta el monto liquidado del saldo acumulado 'pendingSettlementCents'
      const netCents = Number(settlement.netPayableCents || 0);
      const summaryRef = db.collection("merchant_summaries").doc(settlementBizId);
      transaction.set(
        summaryRef,
        {
          pendingSettlementCents: FieldValue.increment(-netCents),
          lastSettlementId: settlementId,
          lastSettledAt: now,
          lastUpdatedAt: now,
        },
        { merge: true }
      );

      return {
        success: true,
        settlementId,
        businessId: settlementBizId,
        status: "CLOSED",
        isFrozen: true,
        confirmedBy: confirmedPayload,
      };
    }).then(async (result) => {
      await recordAuditEvent({
        action: "SETTLEMENT_CONFIRMED",
        businessId: result.businessId,
        settlementId,
        actorUid: callerUid,
        actorRole: isAdmin ? "ADMIN_PROXY" : "MERCHANT_OWNER",
        actorEmail: callerEmail,
        metadata: {
          notes: notes || "",
          frozenAt: new Date().toISOString(),
        },
      });
      return result;
    });
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. CALLABLE: merchantDisputeSettlement
// ══════════════════════════════════════════════════════════════════════════════

export const merchantDisputeSettlement = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debe autenticarse para abrir una disputa."
      );
    }

    const {
      settlementId,
      reason,
      claimedDifferenceCents,
      description,
      evidenceUrl,
    } = data || {};

    if (!settlementId || typeof settlementId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "settlementId es requerido.");
    }

    if (!reason || !description) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Motivo (reason) y descripción detallada de la discrepancia son obligatorios."
      );
    }

    const callerUid = context.auth.uid;
    const callerEmail = context.auth.token.email || "comercio@bluesystem.com";
    const callerBusinessId = await resolveCallerBusinessId(context);
    const isAdmin = isCallerPlatformAdmin(context);

    return await db.runTransaction(async (transaction) => {
      const settlementRef = db.collection("merchant_settlements").doc(settlementId);
      const settlementSnap = await transaction.get(settlementRef);

      if (!settlementSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Liquidación no encontrada.");
      }

      const settlement = settlementSnap.data() || {};
      const settlementBizId = settlement.businessId;

      // Aislamiento de Tenant
      if (!isAdmin && (!callerBusinessId || callerBusinessId !== settlementBizId)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tiene permisos para disputar liquidaciones de otro comercio."
        );
      }

      // Regla Crítica: Una liquidación congelada no puede reabrirse arbitrariamente
      if (settlement.isFrozen === true || settlement.status === "CLOSED") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Esta liquidación ya está cerrada y congelada para auditoría. No se pueden abrir disputas directamente sobre registros inmutables."
        );
      }

      const now = FieldValue.serverTimestamp();
      const disputePayload: DisputeData = {
        disputedAt: Timestamp.now(),
        disputedByUid: callerUid,
        disputedByEmail: callerEmail,
        reason,
        claimedDifferenceCents: Number(claimedDifferenceCents || 0),
        description,
        evidenceUrl: evidenceUrl || null,
        status: "OPEN",
        resolution: null,
        resolvedByUid: null,
        resolvedAt: null,
      };

      const historyEntry: SettlementHistoryEntry = {
        fromStatus: settlement.status,
        toStatus: "DISPUTED",
        actorUid: callerUid,
        actorRole: isAdmin ? "ADMIN" : "MERCHANT_OWNER",
        actorEmail: callerEmail,
        timestamp: Timestamp.now(),
        note: `Disputa abierta por comercio: ${reason} - ${description}`,
      };

      transaction.update(settlementRef, {
        status: "DISPUTED",
        dispute: disputePayload,
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry),
      });

      return {
        success: true,
        settlementId,
        status: "DISPUTED",
        dispute: disputePayload,
      };
    }).then(async (result) => {
      await recordAuditEvent({
        action: "SETTLEMENT_DISPUTED",
        businessId: callerBusinessId || "unknown",
        settlementId,
        actorUid: callerUid,
        actorRole: isAdmin ? "ADMIN" : "MERCHANT_OWNER",
        actorEmail: callerEmail,
        metadata: {
          reason,
          claimedDifferenceCents: Number(claimedDifferenceCents || 0),
          description,
        },
      });
      return result;
    });
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. CALLABLE: adminResolveSettlementDispute
// ══════════════════════════════════════════════════════════════════════════════

export const adminResolveSettlementDispute = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !isCallerPlatformAdmin(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores pueden resolver disputas de liquidación."
      );
    }

    const {
      settlementId,
      resolutionAction, // "ACCEPT_CLAIM" | "REJECT_CLAIM" | "REQUEST_RECONFIRMATION"
      resolutionNotes,
      adjustmentCents = 0,
    } = data || {};

    if (!settlementId || !resolutionAction || !resolutionNotes) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "settlementId, resolutionAction y resolutionNotes son requeridos."
      );
    }

    const callerUid = context.auth.uid;
    const callerEmail = context.auth.token.email || "admin@bluesystem.com";

    return await db.runTransaction(async (transaction) => {
      const settlementRef = db.collection("merchant_settlements").doc(settlementId);
      const settlementSnap = await transaction.get(settlementRef);

      if (!settlementSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Liquidación no encontrada.");
      }

      const settlement = settlementSnap.data() || {};

      if (settlement.status !== "DISPUTED" && settlement.status !== "UNDER_REVIEW") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `La liquidación no está en disputa (estado actual: ${settlement.status}).`
        );
      }

      const now = FieldValue.serverTimestamp();
      const adj = Number(adjustmentCents || 0);
      let nextStatus: SettlementStatus = "AWAITING_CONFIRMATION";

      const updatedDispute = {
        ...(settlement.dispute || {}),
        status: resolutionAction === "REJECT_CLAIM" ? "REJECTED" : "RESOLVED",
        resolution: resolutionNotes,
        resolvedByUid: callerUid,
        resolvedAt: Timestamp.now(),
        adjustmentAppliedCents: adj,
      };

      let newAdjustmentsCents = Number(settlement.adjustmentsCents || 0);
      let newNetPayableCents = Number(settlement.netPayableCents || 0);

      if (resolutionAction === "ACCEPT_CLAIM" && adj !== 0) {
        newAdjustmentsCents += adj;
        newNetPayableCents = Math.max(
          0,
          Number(settlement.grossSalesCents || 0) -
            Number(settlement.platformFeesCents || 0) -
            Number(settlement.discountsCents || 0) +
            newAdjustmentsCents
        );
        // Si cambió el neto y ya se había pagado, puede requerir pago complementario
        if (Number(settlement.paidCents || 0) < newNetPayableCents) {
          nextStatus = "AWAITING_PAYMENT";
        }
      }

      const historyEntry: SettlementHistoryEntry = {
        fromStatus: settlement.status,
        toStatus: nextStatus,
        actorUid: callerUid,
        actorRole: "ADMIN",
        actorEmail: callerEmail,
        timestamp: Timestamp.now(),
        note: `Disputa resuelta (${resolutionAction}): ${resolutionNotes}`,
      };

      transaction.update(settlementRef, {
        status: nextStatus,
        dispute: updatedDispute,
        adjustmentsCents: newAdjustmentsCents,
        netPayableCents: newNetPayableCents,
        updatedAt: now,
        history: FieldValue.arrayUnion(historyEntry),
      });

      return {
        success: true,
        settlementId,
        businessId: settlement.businessId || "unknown",
        status: nextStatus,
        resolutionAction,
        netPayableCents: newNetPayableCents,
      };
    }).then(async (result) => {
      await recordAuditEvent({
        action: "SETTLEMENT_RESOLVED",
        businessId: result.businessId,
        settlementId,
        actorUid: callerUid,
        actorRole: "ADMIN",
        actorEmail: callerEmail,
        metadata: {
          resolutionAction,
          resolutionNotes,
          adjustmentCents,
        },
      });
      return result;
    });
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 6. CALLABLE: adminConfigureMerchantSettlement
// ══════════════════════════════════════════════════════════════════════════════

export const adminConfigureMerchantSettlement = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !isCallerPlatformAdmin(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores pueden configurar la periodicidad de liquidación."
      );
    }

    const {
      businessId,
      bankDetails,
    } = data || {};

    const periodType = (data?.periodType || data?.settlementPeriod || "WEEKLY") as PeriodType;
    const cutoffDay = Number(data?.cutoffDay ?? data?.cutoffDayOfWeek ?? 1);

    if (!businessId) {
      throw new functions.https.HttpsError("invalid-argument", "businessId es requerido.");
    }

    const callerUid = context.auth.uid;
    const now = FieldValue.serverTimestamp();

    const configRef = db.collection("merchant_settlement_configs").doc(businessId);
    await configRef.set(
      {
        businessId,
        periodType,
        cutoffDay: Number(cutoffDay || 1),
        bankDetails: bankDetails || null,
        updatedAt: now,
        updatedByUid: callerUid,
      },
      { merge: true }
    );

    return { success: true, businessId, periodType, cutoffDay };
  }
);
