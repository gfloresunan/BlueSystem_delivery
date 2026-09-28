/**
 * BlueSystem Delivery Enterprise — Backend Triggers: Loyalty & Points Engine v1.0
 * Authoritative, idempotent, and transactional loyalty points awarding.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * TRIGGER: onOrderCompletedAwardLoyalty
 * 
 * Se dispara cuando un pedido de comercio (/orders/{orderId}) pasa a estado 'completed' / 'completado'.
 * Otorga de manera atómica e idempotente +10 puntos al comercio y +10 puntos al saldo global del cliente.
 */
export const onOrderCompletedAwardLoyalty = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    if (!before || !after) return null;

    // 1. Normalización robusta de estado (status / estado)
    const prevStatus = (before.status || before.estado || "").toString().toLowerCase().trim();
    const currStatus = (after.status || after.estado || "").toString().toLowerCase().trim();

    const isCompletedNow = currStatus === "completed" || currStatus === "completado";
    const wasCompletedBefore = prevStatus === "completed" || prevStatus === "completado";

    // Solo reaccionar a la transición que alcanza 'completed'
    if (!isCompletedNow || wasCompletedBefore) {
      return null;
    }

    const customerId = (after.customerId || after.userId || after.uid || after.clienteId || "").toString().trim();
    const businessId = (after.businessId || after.comercioId || "").toString().trim();
    const businessName = (after.businessName || after.comercioNombre || "Comercio").toString().trim();

    if (!customerId || !businessId) {
      functions.logger.warn(`[LOYALTY] Pedido ${orderId} completado pero falta customerId (${customerId}) o businessId (${businessId}). Omitiendo acumulación.`);
      return null;
    }

    // 2. Transacción Firestore Atómica con Doble Barrera de Idempotencia
    const awardDocId = `${customerId}_${orderId}`;
    const awardRef = db.collection("loyalty_awards").doc(awardDocId);

    try {
      await db.runTransaction(async (transaction) => {
        // Barrera 1: Comprobar si ya existe el premio emitido para esta orden
        const awardSnap = await transaction.get(awardRef);
        if (awardSnap.exists) {
          functions.logger.info(`[LOYALTY_IDEMPOTENCY] El pedido ${orderId} ya otorgó puntos previamente a ${customerId}. Omitiendo.`);
          return;
        }

        const now = FieldValue.serverTimestamp();
        const POINTS_PER_ORDER = 10;

        // Referencias a los documentos del cliente
        const merchantLoyaltyRef = db
          .collection("users")
          .doc(customerId)
          .collection("loyalty")
          .doc(businessId);

        const globalSummaryRef = db
          .collection("users")
          .doc(customerId)
          .collection("loyaltySummary")
          .doc("global");

        const txRef = db
          .collection("users")
          .doc(customerId)
          .collection("loyaltyTransactions")
          .doc();

        // Lecturas dentro de la transacción
        const merchantSnap = await transaction.get(merchantLoyaltyRef);
        const globalSnap = await transaction.get(globalSummaryRef);

        const currentMerchantBalance = merchantSnap.exists ? Number(merchantSnap.data()?.pointsBalance || 0) : 0;
        const currentMerchantLifetime = merchantSnap.exists ? Number(merchantSnap.data()?.lifetimePointsEarned || 0) : 0;
        const currentMerchantOrders = merchantSnap.exists ? Number(merchantSnap.data()?.completedOrdersCount || 0) : 0;

        const currentGlobalBalance = globalSnap.exists ? Number(globalSnap.data()?.globalPointsBalance || 0) : 0;
        const currentGlobalLifetime = globalSnap.exists ? Number(globalSnap.data()?.lifetimePointsEarned || 0) : 0;

        const newMerchantBalance = currentMerchantBalance + POINTS_PER_ORDER;
        const newGlobalBalance = currentGlobalBalance + POINTS_PER_ORDER;

        // Escritura 1: Balance del comercio
        transaction.set(
          merchantLoyaltyRef,
          {
            customerId,
            businessId,
            businessName,
            businessLogoUrl: after.businessLogo || after.logoUrl || "",
            pointsBalance: newMerchantBalance,
            lifetimePointsEarned: currentMerchantLifetime + POINTS_PER_ORDER,
            lifetimePointsRedeemed: merchantSnap.exists ? Number(merchantSnap.data()?.lifetimePointsRedeemed || 0) : 0,
            completedOrdersCount: currentMerchantOrders + 1,
            updatedAt: now,
            createdAt: merchantSnap.exists ? (merchantSnap.data()?.createdAt || now) : now,
          },
          { merge: true }
        );

        // Escritura 2: Resumen global materializado
        transaction.set(
          globalSummaryRef,
          {
            customerId,
            globalPointsBalance: newGlobalBalance,
            lifetimePointsEarned: currentGlobalLifetime + POINTS_PER_ORDER,
            lifetimePointsRedeemed: globalSnap.exists ? Number(globalSnap.data()?.lifetimePointsRedeemed || 0) : 0,
            updatedAt: now,
          },
          { merge: true }
        );

        // Escritura 3: Documento de Idempotencia
        transaction.set(awardRef, {
          awardId: awardDocId,
          orderId,
          customerId,
          businessId,
          businessName,
          pointsAwarded: POINTS_PER_ORDER,
          awardedAt: now,
        });

        // Escritura 4: Ledger de transacciones inmutable con allocation explícito
        transaction.set(txRef, {
          transactionId: txRef.id,
          customerId,
          businessId,
          businessName,
          orderId,
          type: "EARN",
          points: POINTS_PER_ORDER,
          balanceBefore: currentGlobalBalance,
          balanceAfter: newGlobalBalance,
          scope: "MERCHANT_SPECIFIC",
          allocation: [
            {
              businessId,
              businessName,
              points: POINTS_PER_ORDER,
            },
          ],
          description: `Compra en ${businessName} (Pedido #${orderId.slice(-6).toUpperCase()})`,
          idempotencyKey: awardDocId,
          createdAt: now,
        });
      });

      // Auditoría fuera de la transacción
      await db.collection("audit_events").add({
        event: "LOYALTY_POINTS_EARNED",
        orderId,
        customerId,
        businessId,
        points: 10,
        source: "ORDER_COMPLETED",
        timestamp: FieldValue.serverTimestamp(),
      });

      functions.logger.info(`[LOYALTY] +10 puntos otorgados exitosamente al cliente ${customerId} por pedido ${orderId} en ${businessName}.`);
    } catch (error: any) {
      functions.logger.error(`[LOYALTY_ERROR] Error otorgando puntos de fidelidad para pedido ${orderId}: ${error.message}`, error);
    }

    return null;
  });
