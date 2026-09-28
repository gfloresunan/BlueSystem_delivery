import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * Callable HTTPS: executeCourierSettlement
 *
 * Permite a un supervisor o administrador ejecutar formalmente el arqueo y liquidación
 * física de caja de un repartidor.
 *
 * Garantiza idempotencia estricta mediante `settlementOperationId`.
 */
export const executeCourierSettlement = functions.https.onCall(async (data, context) => {
  // 1. Verificación de Autenticación y Rol de Supervisor/Admin
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para realizar un arqueo.");
  }

  const callerUid = context.auth.uid;
  const token = context.auth.token || {};
  const isSuperAdmin = token.role === "SUPER_ADMIN" || token.superadmin === true;
  const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || isSuperAdmin;
  const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;

  if (!isSupervisor) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo supervisores o administradores están autorizados para ejecutar arqueos de caja."
    );
  }

  const {
    settlementOperationId,
    courierId,
    countedAmountCents,
    branchId,
    receiptNumber,
    notes,
    discrepancyAction, // "CARRY_FORWARD" | "PAYROLL_DEDUCTION" | "ADMIN_WAIVE"
  } = data || {};

  if (!settlementOperationId || typeof settlementOperationId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "settlementOperationId es obligatorio.");
  }

  if (!courierId || typeof courierId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "courierId es obligatorio.");
  }

  if (typeof countedAmountCents !== "number" || countedAmountCents < 0) {
    throw new functions.https.HttpsError("invalid-argument", "countedAmountCents debe ser un entero no negativo.");
  }

  // 2. Transacción Atómica en Firestore con Idempotencia
  try {
    return await db.runTransaction(async (transaction) => {
      // A. Verificar si el settlementOperationId ya fue procesado
      const existingSettlementQuery = db
        .collection("courier_settlements")
        .where("settlementOperationId", "==", settlementOperationId)
        .limit(1);

      const existingSnap = await transaction.get(existingSettlementQuery);
      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        functions.logger.info(
          `[SETTLEMENT_IDEMPOTENT] Arqueo ya procesado previamente: opId=${settlementOperationId}, settlementId=${existingDoc.id}`
        );
        return {
          success: true,
          settlementId: existingDoc.id,
          idempotent: true,
          data: existingDoc.data(),
        };
      }

      // B. Obtener Balance actual del Courier
      const balanceRef = db.collection("courier_balances").doc(courierId);
      const balanceSnap = await transaction.get(balanceRef);

      const currentBalanceData = balanceSnap.exists ? balanceSnap.data() || {} : {};
      const expectedAmountCents: number = Number(currentBalanceData.cashOutstandingCents || 0);
      const courierName: string = currentBalanceData.courierName || "Repartidor";

      const differenceCents = countedAmountCents - expectedAmountCents;
      const isSquare = differenceCents === 0;

      const now = FieldValue.serverTimestamp();
      const settlementRef = db.collection("courier_settlements").doc();
      const settlementId = settlementRef.id;

      // C. Asiento en Subledger: CASH_HANDOVER (Débito por el efectivo físicamente contado)
      const handoverLedgerRef = db.collection("courier_cash_ledger").doc();
      transaction.set(handoverLedgerRef, {
        entryId: handoverLedgerRef.id,
        courierId,
        courierName,
        settlementId,
        settlementOperationId,
        sourceDomain: "SETTLEMENT",
        eventType: "CASH_HANDOVER",
        direction: "DEBIT", // Reduce pasivo vivo
        amountCents: countedAmountCents,
        currency: "NIO",
        description: `Arqueo de caja físico #${receiptNumber || settlementId.slice(-6).toUpperCase()}`,
        idempotencyKey: `settle_${settlementOperationId}_handover`,
        createdAt: now,
        createdByUid: callerUid,
        createdByType: "SUPERVISOR",
      });

      let reliefCents = 0;
      // D. Manejo de Discrepancia si existe faltante y acción de condonación / deducción
      if (differenceCents < 0 && (discrepancyAction === "PAYROLL_DEDUCTION" || discrepancyAction === "ADMIN_WAIVE")) {
        reliefCents = Math.abs(differenceCents);
        const reliefLedgerRef = db.collection("courier_cash_ledger").doc();
        transaction.set(reliefLedgerRef, {
          entryId: reliefLedgerRef.id,
          courierId,
          courierName,
          settlementId,
          settlementOperationId,
          sourceDomain: "SETTLEMENT",
          eventType: discrepancyAction === "PAYROLL_DEDUCTION" ? "DISCREPANCY_RELIEF" : "MANUAL_ADJUSTMENT",
          direction: "DEBIT",
          amountCents: reliefCents,
          currency: "NIO",
          description: `Ajuste por diferencia de arqueo (${discrepancyAction}): C$ ${(reliefCents / 100).toFixed(2)}`,
          idempotencyKey: `settle_${settlementOperationId}_relief`,
          createdAt: now,
          createdByUid: callerUid,
          createdByType: "SUPERVISOR",
        });
      }

      // E. Actualizar /courier_balances/{courierId}
      const newOutstandingCents = Math.max(0, expectedAmountCents - countedAmountCents - reliefCents);
      transaction.set(
        balanceRef,
        {
          courierId,
          courierName,
          cashOutstandingCents: newOutstandingCents,
          totalSettledCents: FieldValue.increment(countedAmountCents),
          totalAdjustmentsCents: FieldValue.increment(reliefCents),
          lastSettlementId: settlementId,
          lastSettledAt: now,
          updatedAt: now,
          reconciliationStatus: "IN_SYNC",
        },
        { merge: true }
      );

      // F. Crear Documento de Arqueo en /courier_settlements
      const settlementData = {
        settlementId,
        settlementOperationId,
        courierId,
        courierName,
        supervisorUid: callerUid,
        branchId: branchId || null,
        expectedAmountCents,
        countedAmountCents,
        differenceCents,
        discrepancyAction: differenceCents !== 0 ? (discrepancyAction || "CARRY_FORWARD") : "NONE",
        currency: "NIO",
        status: isSquare ? "SETTLED" : "DISCREPANCY",
        receiptNumber: receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        notes: notes || "",
        createdAt: now,
        verifiedAt: now,
      };

      transaction.set(settlementRef, settlementData);

      // G. Auditoría Inmutable en /audit_events
      const auditRef = db.collection("audit_events").doc();
      transaction.set(auditRef, {
        event: "COURIER_SETTLEMENT_EXECUTED",
        settlementId,
        settlementOperationId,
        courierId,
        supervisorUid: callerUid,
        expectedCents: expectedAmountCents,
        countedCents: countedAmountCents,
        diffCents: differenceCents,
        timestamp: now,
      });

      functions.logger.info(
        `[SETTLEMENT_SUCCESS] Arqueo completado: id=${settlementId}, courier=${courierId}, esperado=${expectedAmountCents}¢, contado=${countedAmountCents}¢, diff=${differenceCents}¢`
      );

      return {
        success: true,
        settlementId,
        idempotent: false,
        expectedAmountCents,
        countedAmountCents,
        differenceCents,
        status: settlementData.status,
      };
    });
  } catch (err: any) {
    functions.logger.error(`[SETTLEMENT_ERROR] Error ejecutando arqueo: ${err.message}`, err);
    throw new functions.https.HttpsError("internal", err.message || "Error al procesar el arqueo.");
  }
});

/**
 * Callable HTTPS: recalculateCourierBalance
 *
 * Reconstruye el balance de un motorizado a partir de la suma algebraica
 * de todos sus asientos en /courier_cash_ledger.
 */
export const recalculateCourierBalance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  const token = context.auth.token || {};
  const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || token.role === "SUPER_ADMIN";

  if (!isPlatformAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden forzar recálculo.");
  }

  const { courierId } = data || {};
  if (!courierId || typeof courierId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "courierId es obligatorio.");
  }

  try {
    const ledgerSnap = await db
      .collection("courier_cash_ledger")
      .where("courierId", "==", courierId)
      .get();

    let totalCredits = 0;
    let totalDebits = 0;

    ledgerSnap.forEach((doc) => {
      const d = doc.data();
      const amt = Number(d.amountCents || 0);
      if (d.direction === "CREDIT") {
        totalCredits += amt;
      } else if (d.direction === "DEBIT") {
        totalDebits += amt;
      }
    });

    const netOutstandingCents = Math.max(0, totalCredits - totalDebits);

    const balanceRef = db.collection("courier_balances").doc(courierId);
    await balanceRef.set(
      {
        courierId,
        cashOutstandingCents: netOutstandingCents,
        totalCollectedCents: totalCredits,
        totalSettledCents: totalDebits,
        recalculatedAt: FieldValue.serverTimestamp(),
        reconciliationStatus: "IN_SYNC",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      courierId,
      totalCreditsCents: totalCredits,
      totalDebitsCents: totalDebits,
      netOutstandingCents,
      entriesCount: ledgerSnap.size,
    };
  } catch (err: any) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});
