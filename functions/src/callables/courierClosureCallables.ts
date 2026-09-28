import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function resolveCourierName(uid: string): Promise<string> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const u = userDoc.data() || {};
      const name = u.name || u.nombre || u.displayName || u.fullName || u.email;
      if (name && name.trim() && name !== "Repartidor" && name !== "Motorizado") {
        return name.trim();
      }
    }
    const courierDoc = await db.collection("couriers").doc(uid).get();
    if (courierDoc.exists) {
      const c = courierDoc.data() || {};
      const name = c.name || c.nombre || c.displayName;
      if (name && name.trim() && name !== "Repartidor" && name !== "Motorizado") {
        return name.trim();
      }
    }
    const balanceDoc = await db.collection("courier_balances").doc(uid).get();
    if (balanceDoc.exists) {
      const b = balanceDoc.data() || {};
      if (b.courierName && b.courierName !== "Repartidor" && b.courierName !== "Motorizado") {
        return b.courierName;
      }
    }
  } catch (err) {
    functions.logger.warn(`Error resolving courier name for ${uid}`, err);
  }
  return "Motorizado";
}

/**
 * Callable HTTPS: initiateCourierDailyClosure
 *
 * Inicia el proceso formal de cierre diario de un motorizado para una fecha operacional dada.
 * Recupera los asientos en /courier_cash_ledger correspondientes a la fecha, calcula el monto
 * esperado autoritativamente en servidor y genera el registro en /courier_daily_closures.
 *
 * Idempotencia: `closureOperationId`.
 */
export const initiateCourierDailyClosure = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para realizar el cierre diario.");
  }

  const callerUid = context.auth.uid;
  const token = context.auth.token || {};
  const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || token.role === "SUPER_ADMIN";
  const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;

  const {
    closureOperationId,
    courierId,
    businessDate, // YYYY-MM-DD
    shift,        // "MORNING" | "AFTERNOON" | "FULL_DAY"
  } = data || {};

  if (!closureOperationId || typeof closureOperationId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "closureOperationId es obligatorio.");
  }

  const targetCourierId = courierId || callerUid;

  // Si no es supervisor/admin, solo puede cerrar su propia jornada
  if (targetCourierId !== callerUid && !isSupervisor) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No está autorizado para iniciar el cierre de otro motorizado."
    );
  }

  if (!businessDate || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new functions.https.HttpsError("invalid-argument", "businessDate debe tener formato YYYY-MM-DD.");
  }

  try {
    const courierRealName = await resolveCourierName(targetCourierId);

    return await db.runTransaction(async (transaction) => {
      // 1. Verificación de Idempotencia por closureOperationId
      const existingOpQuery = db
        .collection("courier_daily_closures")
        .where("closureOperationId", "==", closureOperationId)
        .limit(1);

      const existingOpSnap = await transaction.get(existingOpQuery);
      if (!existingOpSnap.empty) {
        const doc = existingOpSnap.docs[0];
        functions.logger.info(`[CLOSURE_IDEMPOTENT] Cierre ya iniciado previamente: opId=${closureOperationId}, docId=${doc.id}`);
        return { success: true, idempotent: true, closureId: doc.id, data: doc.data() };
      }

      // 2. Verificar si ya existe un cierre para este courier en esta businessDate
      const existingDateQuery = db
        .collection("courier_daily_closures")
        .where("courierId", "==", targetCourierId)
        .where("businessDate", "==", businessDate)
        .limit(1);

      const existingDateSnap = await transaction.get(existingDateQuery);
      if (!existingDateSnap.empty) {
        const doc = existingDateSnap.docs[0];
        return { success: true, idempotent: true, closureId: doc.id, data: doc.data(), alreadyClosed: true };
      }

      // 3. Obtener Balance y Nombre del Courier
      const balanceRef = db.collection("courier_balances").doc(targetCourierId);
      const balanceSnap = await transaction.get(balanceRef);
      const balanceData = balanceSnap.exists ? balanceSnap.data() || {} : {};
      const courierName = courierRealName || balanceData.courierName || "Motorizado";

      // 4. Obtener colecciones y asientos en /courier_cash_ledger
      const ledgerQuery = db
        .collection("courier_cash_ledger")
        .where("courierId", "==", targetCourierId);

      const ledgerSnap = await transaction.get(ledgerQuery);
      let expectedAmountCents = Number(balanceData.cashOutstandingCents || 0);
      let totalCashCollectedCents = 0;
      let totalCompensatedCents = 0;
      let totalEarningsCents = 0;
      let totalDistanceEarningsCents = 0;
      let totalBonusEarningsCents = 0;
      let totalTipEarningsCents = 0;
      const includedOrderIds: string[] = [];
      const includedTripIds: string[] = [];

      ledgerSnap.forEach((doc) => {
        const d = doc.data();
        if (d.eventType === "ORDER_CASH_COLLECTED" || d.eventType === "TRIP_CASH_COLLECTED") {
          totalCashCollectedCents += Number(d.amountCents || 0);
        }
        totalCompensatedCents += Number(d.compensatedCents || 0);
        totalEarningsCents += Number(d.earningsCents || 0);
        totalDistanceEarningsCents += Number(d.distanceEarningsCents || 0);
        totalBonusEarningsCents += Number(d.bonusEarningsCents || 0);
        totalTipEarningsCents += Number(d.tipEarningsCents || 0);

        if (d.orderId && !includedOrderIds.includes(d.orderId)) {
          includedOrderIds.push(d.orderId);
        }
        if (d.tripId && !includedTripIds.includes(d.tripId)) {
          includedTripIds.push(d.tripId);
        }
      });

      const now = FieldValue.serverTimestamp();
      const closureRef = db.collection("courier_daily_closures").doc();
      const closureId = closureRef.id;

      const closureData = {
        closureId,
        closureOperationId,
        courierId: targetCourierId,
        courierName,
        businessDate,
        shift: shift || "FULL_DAY",
        status: "OPEN",
        expectedAmountCents,
        totalCashCollectedCents,
        totalCompensatedCents,
        totalEarningsCents,
        totalDistanceEarningsCents,
        totalBonusEarningsCents,
        totalTipEarningsCents,
        courierPayableBalanceCents: Number(balanceData.courierPayableBalanceCents || 0),
        ordersCount: includedOrderIds.length + includedTripIds.length,
        includedOrderIds,
        includedTripIds,
        countedAmountCents: 0,
        differenceCents: 0,
        discrepancyAction: "NONE",
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(closureRef, closureData);

      functions.logger.info(
        `[CLOSURE_INITIATED] Cierre iniciado: closureId=${closureId}, courier=${targetCourierId}, fecha=${businessDate}, esperado=${expectedAmountCents}¢, recaudado=${totalCashCollectedCents}¢, compensado=${totalCompensatedCents}¢, ganancias=${totalEarningsCents}¢, pedidos=${closureData.ordersCount}`
      );

      return {
        success: true,
        idempotent: false,
        closureId,
        expectedAmountCents,
        totalCashCollectedCents,
        totalCompensatedCents,
        totalEarningsCents,
        ordersCount: closureData.ordersCount,
        businessDate,
      };
    });
  } catch (err: any) {
    functions.logger.error(`[CLOSURE_INIT_ERROR] Error iniciando cierre: ${err.message}`, err);
    throw new functions.https.HttpsError("internal", err.message || "Error al iniciar el cierre diario.");
  }
});

/**
 * Callable HTTPS: registerBankDepositReceipt
 *
 * Registra formalmente los datos de la transferencia/depósito bancario y la URL del voucher
 * en Firebase Storage, calculando la diferencia contra el monto contado en mesa.
 */
export const registerBankDepositReceipt = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para registrar el depósito bancario.");
  }

  const callerUid = context.auth.uid;
  const token = context.auth.token || {};
  const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || token.role === "SUPER_ADMIN";
  const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;

  const {
    closureId,
    bankName,
    accountReference,
    bankReference,
    depositDate,
    depositTime,
    depositAmountCents,
    receiptStoragePath,
    receiptDownloadUrl,
    receiptFileHash,
    notes,
  } = data || {};

  if (!closureId || typeof closureId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "closureId es obligatorio.");
  }

  if (!bankName || typeof bankName !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "bankName es obligatorio.");
  }

  if (!bankReference || typeof bankReference !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "bankReference es obligatorio.");
  }

  if (typeof depositAmountCents !== "number" || depositAmountCents <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "depositAmountCents debe ser un entero positivo.");
  }

  try {
    return await db.runTransaction(async (transaction) => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      const closureSnap = await transaction.get(closureRef);

      if (!closureSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El cierre especificado no existe.");
      }

      const closure = closureSnap.data() || {};

      // Validación de propiedad
      if (closure.courierId !== callerUid && !isSupervisor) {
        throw new functions.https.HttpsError("permission-denied", "No está autorizado para modificar este cierre.");
      }

      // El monto de referencia para el depósito es lo contado/entregado en el settlement (o lo esperado si no hubo settlement)
      const baseCountedCents: number = Number(closure.countedAmountCents || closure.expectedAmountCents || 0);
      const depositDiscrepancyCents = depositAmountCents - baseCountedCents;

      const now = FieldValue.serverTimestamp();
      const bankDepositId = `dep_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const bankDeposit = {
        bankDepositId,
        bankName: bankName.trim(),
        accountReference: (accountReference || "").trim(),
        bankReference: bankReference.trim(),
        depositDate: depositDate || new Date().toISOString().split("T")[0],
        depositTime: depositTime || new Date().toISOString().split("T")[1].substring(0, 5),
        depositAmountCents,
        depositDiscrepancyCents,
        receiptStoragePath: receiptStoragePath || "",
        receiptDownloadUrl: receiptDownloadUrl || "",
        receiptFileHash: receiptFileHash || null,
        uploadedAt: now,
        uploadedByUid: callerUid,
        notes: (notes || "").trim(),
      };

      const newStatus = "PENDING_ADMIN_VERIFICATION";

      transaction.update(closureRef, {
        bankDeposit,
        status: newStatus,
        updatedAt: now,
      });

      // Actualizar balance de courier a PENDING_AUDIT
      const balanceRef = db.collection("courier_balances").doc(closure.courierId);
      transaction.set(
        balanceRef,
        {
          status: "PENDING_AUDIT",
          lastDepositVoucher: bankReference.trim(),
          lastDepositAmountCents: depositAmountCents,
          lastDepositDate: depositDate || new Date().toISOString().split("T")[0],
          updatedAt: now,
        },
        { merge: true }
      );

      // Auditoría inmutable
      const auditRef = db.collection("audit_events").doc();
      transaction.set(auditRef, {
        event: "BANK_DEPOSIT_RECEIPT_REGISTERED",
        closureId,
        courierId: closure.courierId,
        bankDepositId,
        depositAmountCents,
        depositDiscrepancyCents,
        bankReference,
        timestamp: now,
      });

      functions.logger.info(
        `[BANK_DEPOSIT_REGISTERED] Depósito registrado: closureId=${closureId}, courier=${closure.courierId}, monto=${depositAmountCents}¢, diff=${depositDiscrepancyCents}¢`
      );

      return {
        success: true,
        closureId,
        bankDepositId,
        depositDiscrepancyCents,
        status: newStatus,
      };
    });
  } catch (err: any) {
    functions.logger.error(`[BANK_DEPOSIT_ERROR] Error registrando depósito: ${err.message}`, err);
    throw new functions.https.HttpsError("internal", err.message || "Error al registrar comprobante de depósito.");
  }
});

/**
 * Callable HTTPS: verifyCourierDailyClosure
 *
 * Permite a un supervisor/administrador verificar y aprobar el cierre diario (emitiendo el Acta Oficial)
 * o rechazarlo formalmente con motivo auditable.
 */
export const verifyCourierDailyClosure = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para verificar el cierre.");
  }

  const callerUid = context.auth.uid;
  const token = context.auth.token || {};
  const isSuperAdmin = token.role === "SUPER_ADMIN" || token.superadmin === true;
  const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || isSuperAdmin;
  const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;

  if (!isSupervisor) {
    throw new functions.https.HttpsError("permission-denied", "Solo supervisores o administradores pueden verificar cierres.");
  }

  const { closureId, action, rejectionReason } = data || {};

  if (!closureId || typeof closureId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "closureId es obligatorio.");
  }

  if (action !== "VERIFY" && action !== "REJECT") {
    throw new functions.https.HttpsError("invalid-argument", "action debe ser 'VERIFY' o 'REJECT'.");
  }

  if (action === "REJECT" && (!rejectionReason || typeof rejectionReason !== "string")) {
    throw new functions.https.HttpsError("invalid-argument", "rejectionReason es obligatorio al rechazar un cierre.");
  }

  try {
    return await db.runTransaction(async (transaction) => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      const closureSnap = await transaction.get(closureRef);

      if (!closureSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El cierre no existe.");
      }

      const closure = closureSnap.data() || {};
      const now = FieldValue.serverTimestamp();

      let courierDisplayName = closure.courierName;
      if (!courierDisplayName || courierDisplayName === "Repartidor" || courierDisplayName === "Motorizado" || courierDisplayName === "Courier") {
        courierDisplayName = await resolveCourierName(closure.courierId);
      }

      if (action === "REJECT") {
        transaction.update(closureRef, {
          courierName: courierDisplayName,
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
          verifiedByUid: callerUid,
          verifiedAt: now,
          updatedAt: now,
        });

        // Auditoría
        const auditRef = db.collection("audit_events").doc();
        transaction.set(auditRef, {
          event: "COURIER_CLOSURE_REJECTED",
          closureId,
          courierId: closure.courierId,
          courierName: courierDisplayName,
          supervisorUid: callerUid,
          reason: rejectionReason.trim(),
          timestamp: now,
        });

        return { success: true, closureId, status: "REJECTED" };
      }

      // Emisión de Acta Oficial Inmutable
      const actDateStr = (closure.businessDate || new Date().toISOString().split("T")[0]).replace(/-/g, "");
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const actNumber = `ACTA-CASH-${actDateStr}-${closure.courierId.slice(-4).toUpperCase()}-${randomSuffix}`;
      const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const officialAct = {
        actNumber,
        issuedAt: now,
        verificationCode,
        courierName: courierDisplayName,
        supervisorUid: callerUid,
        supervisorName: token.name || "Supervisor de Operaciones",
      };

      // ─── Asiento de Débito en /courier_cash_ledger y Actualización de Balance ─────
      const depositAmountCents: number = Number(
        closure.bankDeposit?.depositAmountCents || closure.countedAmountCents || closure.expectedAmountCents || 0
      );

      if (depositAmountCents > 0) {
        const depositLedgerRef = db.collection("courier_cash_ledger").doc();
        transaction.set(depositLedgerRef, {
          entryId: depositLedgerRef.id,
          courierId: closure.courierId,
          courierName: courierDisplayName,
          closureId,
          sourceDomain: "BANK_DEPOSIT",
          eventType: "BANK_DEPOSIT_SETTLED",
          direction: "DEBIT", // Reduce pasivo de custodia
          amountCents: depositAmountCents,
          currency: "NIO",
          description: `Depósito bancario validado [${closure.bankDeposit?.bankName || "Banco"} ref: ${closure.bankDeposit?.bankReference || "N/A"}] — Acta ${actNumber}`,
          idempotencyKey: `closure_${closureId}_deposit_settled`,
          createdAt: now,
          createdByUid: callerUid,
          createdByType: "SUPERVISOR",
        });

        const balanceRef = db.collection("courier_balances").doc(closure.courierId);
        transaction.set(
          balanceRef,
          {
            courierName: courierDisplayName,
            cashOutstandingCents: FieldValue.increment(-depositAmountCents),
            totalSettledCents: FieldValue.increment(depositAmountCents),
            lastSettlementId: closureId,
            lastSettledAt: now,
            updatedAt: now,
          },
          { merge: true }
        );
      }

      transaction.update(closureRef, {
        courierName: courierDisplayName,
        status: "VERIFIED",
        officialAct,
        verifiedByUid: callerUid,
        verifiedByName: token.name || "Supervisor de Operaciones",
        verifiedAt: now,
        updatedAt: now,
      });

      // Auditoría
      const auditRef = db.collection("audit_events").doc();
      transaction.set(auditRef, {
        event: "COURIER_CLOSURE_VERIFIED",
        closureId,
        courierId: closure.courierId,
        actNumber,
        verificationCode,
        depositAmountCents,
        supervisorUid: callerUid,
        timestamp: now,
      });

      functions.logger.info(`[CLOSURE_VERIFIED] Cierre aprobado con éxito: closureId=${closureId}, actNumber=${actNumber}, montoLiquidado=${depositAmountCents}¢`);

      return {
        success: true,
        closureId,
        status: "VERIFIED",
        officialAct,
        settledAmountCents: depositAmountCents,
      };
    });
  } catch (err: any) {
    functions.logger.error(`[CLOSURE_VERIFY_ERROR] Error verificando cierre: ${err.message}`, err);
    throw new functions.https.HttpsError("internal", err.message || "Error al verificar el cierre.");
  }
});

/**
 * Callable HTTPS: generateOfficialClosureActPdf
 *
 * Genera la estructura de datos autoritativa o HTML renderizable del Acta Oficial de Cierre.
 */
export const generateOfficialClosureActPdf = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  const { closureId } = data || {};
  if (!closureId || typeof closureId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "closureId es obligatorio.");
  }

  const closureSnap = await db.collection("courier_daily_closures").doc(closureId).get();
  if (!closureSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El cierre no existe.");
  }

  const closure = closureSnap.data() || {};

  return {
    success: true,
    actNumber: closure.officialAct?.actNumber || "PENDIENTE",
    verificationCode: closure.officialAct?.verificationCode || "N/A",
    businessDate: closure.businessDate,
    courierName: closure.courierName,
    courierId: closure.courierId,
    expectedAmount: (Number(closure.expectedAmountCents || 0) / 100).toFixed(2),
    countedAmount: (Number(closure.countedAmountCents || 0) / 100).toFixed(2),
    differenceAmount: (Number(closure.differenceCents || 0) / 100).toFixed(2),
    bankName: closure.bankDeposit?.bankName || "N/A",
    bankReference: closure.bankDeposit?.bankReference || "N/A",
    depositAmount: closure.bankDeposit ? (Number(closure.bankDeposit.depositAmountCents || 0) / 100).toFixed(2) : "0.00",
    status: closure.status,
    issuedAt: closure.officialAct?.issuedAt || null,
  };
});
