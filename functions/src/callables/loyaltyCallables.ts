/**
 * BlueSystem Delivery Enterprise — Backend Callables: Loyalty Callables & Redemption Engine v1.0
 * Authoritative, atomic, and multi-tenant loyalty reward redemption and management.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  LoyaltyRewardEntity,
  calculateFifoAllocation,
  MerchantBalanceItem,
  validateComboReward,
  LoyaltyComboItemEntity,
} from "../domain/loyalty/loyaltyEngine";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * Helper: Verifica si el caller es Platform Admin
 */
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

/**
 * Helper: Genera un código de cupón único y legible
 */
function generateCouponCode(prefix: string = "REW"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}

/**
 * 1. CALLABLE: Canjear Recompensa de Fidelidad (Autoritativo Server-Side)
 */
export const redeemLoyaltyReward = functions.https.onCall(async (data: { rewardId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión para canjear recompensas.");
  }

  const customerId = context.auth.uid;
  const rewardId = (data.rewardId || "").trim();

  if (!rewardId) {
    throw new functions.https.HttpsError("invalid-argument", "El identificador de la recompensa es requerido.");
  }

  // 1. Obtener la recompensa
  const rewardRef = db.collection("loyalty_rewards").doc(rewardId);
  const rewardSnap = await rewardRef.get();

  if (!rewardSnap.exists) {
    throw new functions.https.HttpsError("not-found", "La recompensa solicitada no existe.");
  }

  const reward = { id: rewardSnap.id, ...rewardSnap.data() } as LoyaltyRewardEntity;

  if (!reward.active) {
    throw new functions.https.HttpsError("failed-precondition", "Esta recompensa no se encuentra activa actualmente.");
  }

  const nowMs = Date.now();
  if (reward.startAt) {
    const startMs = reward.startAt.toMillis ? reward.startAt.toMillis() : new Date(reward.startAt).getTime();
    if (nowMs < startMs) {
      throw new functions.https.HttpsError("failed-precondition", "Esta recompensa aún no está disponible.");
    }
  }

  if (reward.endAt) {
    const endMs = reward.endAt.toMillis ? reward.endAt.toMillis() : new Date(reward.endAt).getTime();
    if (nowMs > endMs) {
      throw new functions.https.HttpsError("failed-precondition", "Esta recompensa ha expirado.");
    }
  }

  if (reward.maxRedemptions && reward.maxRedemptions > 0) {
    const count = reward.currentRedemptionsCount || 0;
    if (count >= reward.maxRedemptions) {
      throw new functions.https.HttpsError("resource-exhausted", "Esta recompensa ha alcanzado el límite máximo de canjes disponibles.");
    }
  }

  // Comprobar límite por cliente
  if (reward.maxRedemptionsPerCustomer && reward.maxRedemptionsPerCustomer > 0) {
    const userRedemptionsSnap = await db
      .collection("loyalty_redemptions")
      .where("rewardId", "==", rewardId)
      .where("customerId", "==", customerId)
      .get();

    if (userRedemptionsSnap.size >= reward.maxRedemptionsPerCustomer) {
      throw new functions.https.HttpsError("already-exists", "Has alcanzado el límite de canjes permitidos para este premio.");
    }
  }

  const pointsCost = Number(reward.pointsCost) || 0;
  if (pointsCost <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "El costo en puntos de la recompensa es inválido.");
  }

  // Validar consistencia si es COMBO
  let comboSnapshot: LoyaltyComboItemEntity[] = [];
  if (reward.rewardType === "COMBO") {
    const comboValidation = validateComboReward(reward);
    if (!comboValidation.valid) {
      throw new functions.https.HttpsError("failed-precondition", comboValidation.error || "Definición de combo inválida.");
    }
    // Validar productos y construir snapshot inmutable
    const items = reward.comboItems || [];
    for (const item of items) {
      if (item.type === "PRODUCT") {
        const prodSnap = await db.collection("products").doc(item.productId!).get();
        if (!prodSnap.exists) {
          throw new functions.https.HttpsError("not-found", `El producto ${item.productId} incluido en el combo ya no está disponible.`);
        }
        const prodData = prodSnap.data() || {};
        if (reward.scope === "MERCHANT_SPECIFIC" && reward.businessId && prodData.businessId && prodData.businessId !== reward.businessId) {
          throw new functions.https.HttpsError("failed-precondition", `El producto ${prodData.name || item.productId} no pertenece a ${reward.businessName || reward.businessId}.`);
        }
        comboSnapshot.push({
          type: "PRODUCT",
          productId: item.productId,
          productName: prodData.name || item.productName || "Producto",
          quantity: Number(item.quantity) || 1,
          businessId: prodData.businessId || reward.businessId || undefined,
          businessName: prodData.businessName || reward.businessName || undefined,
        });
      } else {
        comboSnapshot.push({
          type: item.type,
          value: item.value ? Number(item.value) : undefined,
          quantity: item.quantity ? Number(item.quantity) : 1,
        });
      }
    }
  }

  const globalSummaryRef = db.collection("users").doc(customerId).collection("loyaltySummary").doc("global");
  const redemptionRef = db.collection("loyalty_redemptions").doc();
  const couponRef = db.collection("coupons").doc();
  const txRef = db.collection("users").doc(customerId).collection("loyaltyTransactions").doc();

  let generatedCouponCode = generateCouponCode(reward.rewardType === "COMBO" ? "CMB" : "REW");
  let newGlobalBalance = 0;
  let finalAllocations: Array<{ businessId: string; businessName: string; points: number }> = [];

  // 2. Transacción Atómica Firestore
  await db.runTransaction(async (transaction) => {
    const globalSnap = await transaction.get(globalSummaryRef);
    const currentGlobal = globalSnap.exists ? Number(globalSnap.data()?.globalPointsBalance || 0) : 0;
    const currentGlobalRedeemed = globalSnap.exists ? Number(globalSnap.data()?.lifetimePointsRedeemed || 0) : 0;

    if (currentGlobal < pointsCost) {
      throw new functions.https.HttpsError("failed-precondition", `Puntos insuficientes. Tienes ${currentGlobal} puntos y necesitas ${pointsCost}.`);
    }

    const now = FieldValue.serverTimestamp();

    if (reward.scope === "MERCHANT_SPECIFIC") {
      const targetBusinessId = (reward.businessId || "").trim();
      if (!targetBusinessId) {
        throw new functions.https.HttpsError("invalid-argument", "Recompensa de comercio específico sin businessId configurado.");
      }

      const merchantRef = db.collection("users").doc(customerId).collection("loyalty").doc(targetBusinessId);
      const merchantSnap = await transaction.get(merchantRef);
      const currentMerchant = merchantSnap.exists ? Number(merchantSnap.data()?.pointsBalance || 0) : 0;
      const currentMerchantRedeemed = merchantSnap.exists ? Number(merchantSnap.data()?.lifetimePointsRedeemed || 0) : 0;

      if (currentMerchant < pointsCost) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Puntos insuficientes en ${reward.businessName || "este comercio"}. Tienes ${currentMerchant} pts y necesitas ${pointsCost} pts.`
        );
      }

      const updatedMerchant = currentMerchant - pointsCost;
      newGlobalBalance = currentGlobal - pointsCost;

      // Actualizar balance comercial
      transaction.set(
        merchantRef,
        {
          pointsBalance: updatedMerchant,
          lifetimePointsRedeemed: currentMerchantRedeemed + pointsCost,
          updatedAt: now,
        },
        { merge: true }
      );

      finalAllocations = [
        {
          businessId: targetBusinessId,
          businessName: reward.businessName || "Comercio",
          points: -pointsCost,
        },
      ];
    } else {
      // Alcance GLOBAL: Consumo determinista FIFO de los saldos comerciales
      const merchantCollectionRef = db.collection("users").doc(customerId).collection("loyalty");
      const merchantSnaps = await transaction.get(merchantCollectionRef);

      const merchantItems: MerchantBalanceItem[] = [];
      merchantSnaps.forEach((doc) => {
        const d = doc.data();
        merchantItems.push({
          businessId: doc.id,
          businessName: d.businessName || "Comercio",
          pointsBalance: Number(d.pointsBalance || 0),
          lifetimePointsEarned: Number(d.lifetimePointsEarned || 0),
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });

      const fifoResult = calculateFifoAllocation(merchantItems, pointsCost);
      if (!fifoResult.isSufficient) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Consistencia de saldo: No se pudo asignar el consumo comercial de ${pointsCost} puntos.`
        );
      }

      // Aplicar las deducciones a cada comercio
      for (const alloc of fifoResult.allocations) {
        const docRef = db.collection("users").doc(customerId).collection("loyalty").doc(alloc.businessId);
        const rem = fifoResult.remainingBalances.get(alloc.businessId) ?? 0;
        transaction.set(
          docRef,
          {
            pointsBalance: rem,
            lifetimePointsRedeemed: FieldValue.increment(alloc.points),
            updatedAt: now,
          },
          { merge: true }
        );
      }

      finalAllocations = fifoResult.allocations.map((a) => ({
        businessId: a.businessId,
        businessName: a.businessName,
        points: -a.points,
      }));

      newGlobalBalance = currentGlobal - pointsCost;
    }

    // Actualizar globalSummary
    transaction.set(
      globalSummaryRef,
      {
        globalPointsBalance: newGlobalBalance,
        lifetimePointsRedeemed: currentGlobalRedeemed + pointsCost,
        updatedAt: now,
      },
      { merge: true }
    );

    // Incrementar contador en la recompensa
    transaction.update(rewardRef, {
      currentRedemptionsCount: FieldValue.increment(1),
      updatedAt: now,
    });

    // Calcular expiración del cupón (default 30 días)
    const validityDays = reward.validityDays || 30;
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    // Crear cupón real en /coupons
    const couponDiscountType = reward.rewardType === "COMBO" 
      ? "COMBO" 
      : (reward.discountType || (reward.rewardType === "FREE_DELIVERY" ? "FREE_DELIVERY" : "FIXED_AMOUNT"));
    const couponDiscountValue = reward.rewardType === "COMBO"
      ? 0
      : (reward.discountValue || (reward.rewardType === "FREE_DELIVERY" ? 0 : 50));

    transaction.set(couponRef, {
      id: couponRef.id,
      code: generatedCouponCode,
      title: reward.name,
      description: reward.description || `Recompensa canjeada por ${pointsCost} puntos`,
      rewardType: reward.rewardType,
      comboSnapshot: reward.rewardType === "COMBO" ? comboSnapshot : null,
      scope: reward.scope,
      businessId: reward.scope === "MERCHANT_SPECIFIC" ? reward.businessId : null,
      businessName: reward.businessName || null,
      discountType: couponDiscountType,
      discountValue: couponDiscountValue,
      minimumOrderAmount: 0,
      maximumDiscountAmount: null,
      startsAt: now,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      isActive: true,
      active: true,
      usageLimit: 1,
      usageCount: 0,
      perCustomerLimit: 1,
      customerId: customerId,
      sourceRewardId: rewardId,
      createdBy: "LOYALTY_SYSTEM",
      createdAt: now,
    });

    // Crear documento en /loyalty_redemptions
    transaction.set(redemptionRef, {
      id: redemptionRef.id,
      redemptionId: redemptionRef.id,
      customerId,
      rewardId,
      rewardName: reward.name,
      rewardType: reward.rewardType,
      comboSnapshot: reward.rewardType === "COMBO" ? comboSnapshot : null,
      scope: reward.scope,
      businessId: reward.businessId || null,
      businessName: reward.businessName || null,
      pointsRedeemed: pointsCost,
      couponId: couponRef.id,
      couponCode: generatedCouponCode,
      discountType: couponDiscountType,
      discountValue: couponDiscountValue,
      status: "AVAILABLE",
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    // Crear transacción inmutable en el ledger
    transaction.set(txRef, {
      transactionId: txRef.id,
      customerId,
      businessId: reward.businessId || "GLOBAL",
      businessName: reward.businessName || "Recompensa Global",
      rewardId,
      rewardType: reward.rewardType,
      couponId: couponRef.id,
      couponCode: generatedCouponCode,
      type: "REDEEM",
      points: -pointsCost,
      balanceBefore: currentGlobal,
      balanceAfter: newGlobalBalance,
      scope: reward.scope,
      allocation: finalAllocations,
      comboSnapshot: reward.rewardType === "COMBO" ? comboSnapshot : null,
      description: `Canje de ${reward.rewardType === "COMBO" ? "Combo" : "Premio"}: ${reward.name}`,
      idempotencyKey: redemptionRef.id,
      createdAt: now,
    });
  });

  // Auditoría
  await db.collection("audit_events").add({
    event: reward.rewardType === "COMBO" ? "LOYALTY_COMBO_REDEEMED" : "LOYALTY_POINTS_REDEEMED",
    customerId,
    rewardId,
    rewardType: reward.rewardType,
    pointsRedeemed: pointsCost,
    couponCode: generatedCouponCode,
    scope: reward.scope,
    businessId: reward.businessId || null,
    timestamp: FieldValue.serverTimestamp(),
  });

  functions.logger.info(`[LOYALTY] Canje exitoso: Cliente ${customerId} canjeó ${reward.rewardType} ${rewardId} (${pointsCost} pts). Cupón emitido: ${generatedCouponCode}`);

  return {
    success: true,
    message: "¡Premio canjeado con éxito!",
    couponCode: generatedCouponCode,
    pointsRedeemed: pointsCost,
    remainingGlobalPoints: newGlobalBalance,
    rewardName: reward.name,
    rewardType: reward.rewardType,
    comboSnapshot: reward.rewardType === "COMBO" ? comboSnapshot : undefined,
    allocation: finalAllocations,
  };
});

/**
 * 2. CALLABLE: Guardar / Editar Recompensa (Platform Admin)
 */
export const adminSaveLoyaltyReward = functions.https.onCall(async (data: LoyaltyRewardEntity, context) => {
  if (!isPlatformAdmin(context)) {
    throw new functions.https.HttpsError("permission-denied", "Acceso denegado. Se requiere rol administrativo.");
  }

  // Validación de Combo si aplica
  if (data.rewardType === "COMBO") {
    const validation = validateComboReward(data);
    if (!validation.valid) {
      throw new functions.https.HttpsError("invalid-argument", validation.error || "Configuración de combo inválida.");
    }
  }

  const rewardId = data.id || db.collection("loyalty_rewards").doc().id;
  const rewardRef = db.collection("loyalty_rewards").doc(rewardId);

  const payload: Partial<LoyaltyRewardEntity> = {
    id: rewardId,
    name: (data.name || "").trim(),
    description: (data.description || "").trim(),
    imageUrl: data.imageUrl || "",
    rewardType: data.rewardType || "FIXED_DISCOUNT",
    pointsCost: Number(data.pointsCost) || 50,
    scope: data.scope || "GLOBAL",
    businessId: data.scope === "MERCHANT_SPECIFIC" ? data.businessId || null : null,
    businessName: data.scope === "MERCHANT_SPECIFIC" ? data.businessName || null : null,
    discountType: data.discountType || "FIXED_AMOUNT",
    discountValue: Number(data.discountValue) || 0,
    active: data.active !== false,
    validityDays: Number(data.validityDays) || 30,
    maxRedemptions: data.maxRedemptions ? Number(data.maxRedemptions) : null,
    maxRedemptionsPerCustomer: data.maxRedemptionsPerCustomer ? Number(data.maxRedemptionsPerCustomer) : null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.rewardType === "COMBO" && Array.isArray(data.comboItems)) {
    payload.comboItems = data.comboItems.map((item) => ({
      type: item.type,
      productId: item.productId || undefined,
      productName: item.productName || undefined,
      quantity: Number(item.quantity) || 1,
      value: item.value ? Number(item.value) : undefined,
      businessId: item.businessId || undefined,
      businessName: item.businessName || undefined,
    }));
  }

  const existing = await rewardRef.get();
  if (!existing.exists) {
    payload.currentRedemptionsCount = 0;
    payload.createdBy = context.auth?.uid || "ADMIN";
    payload.createdAt = FieldValue.serverTimestamp();
  }

  await rewardRef.set(payload, { merge: true });

  await db.collection("audit_events").add({
    event: existing.exists 
      ? (data.rewardType === "COMBO" ? "LOYALTY_COMBO_UPDATED" : "LOYALTY_REWARD_UPDATED") 
      : (data.rewardType === "COMBO" ? "LOYALTY_COMBO_CREATED" : "LOYALTY_REWARD_CREATED"),
    rewardId,
    rewardType: payload.rewardType,
    name: payload.name,
    actor: context.auth?.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, rewardId };
});

/**
 * 2b. CALLABLE: Eliminar Recompensa de Fidelidad (Platform Admin)
 */
export const adminDeleteLoyaltyReward = functions.https.onCall(async (data: { rewardId: string }, context) => {
  if (!isPlatformAdmin(context)) {
    throw new functions.https.HttpsError("permission-denied", "Acceso denegado. Se requiere rol administrativo.");
  }

  const rewardId = (data?.rewardId || "").trim();
  if (!rewardId) {
    throw new functions.https.HttpsError("invalid-argument", "ID de recompensa requerido.");
  }

  const rewardRef = db.collection("loyalty_rewards").doc(rewardId);
  const snap = await rewardRef.get();
  if (!snap.exists) {
    return { success: true, rewardId };
  }

  const rewardData = snap.data() || {};
  await rewardRef.delete();

  await db.collection("audit_events").add({
    event: "LOYALTY_REWARD_DELETED",
    rewardId,
    name: rewardData.name || null,
    actor: context.auth?.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, rewardId };
});

/**
 * 2c. CALLABLE: Listar Recompensas de Fidelidad (Platform Admin Read-Only)
 */
export const adminListLoyaltyRewards = functions.https.onCall(async (_data, context) => {
  if (!isPlatformAdmin(context)) {
    throw new functions.https.HttpsError("permission-denied", "Acceso denegado. Se requiere rol administrativo.");
  }

  const snap = await db.collection("loyalty_rewards").get();
  const rewards = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { success: true, rewards };
});

/**
 * 3. CALLABLE: Guardar / Editar Nivel de Fidelidad (Platform Admin)
 */
export const adminSaveLoyaltyLevel = functions.https.onCall(async (data: any, context) => {
  if (!isPlatformAdmin(context)) {
    throw new functions.https.HttpsError("permission-denied", "Acceso denegado. Se requiere rol administrativo.");
  }

  const levelId = data.id || db.collection("loyalty_levels").doc().id;
  const levelRef = db.collection("loyalty_levels").doc(levelId);

  const payload = {
    id: levelId,
    name: (data.name || "").trim(),
    description: (data.description || "").trim(),
    minPoints: Number(data.minPoints) || 0,
    maxPoints: Number(data.maxPoints) || 0,
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    icon: data.icon || "🏆",
    sortOrder: Number(data.sortOrder) || 1,
    active: data.active !== false,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const existing = await levelRef.get();
  if (!existing.exists) {
    (payload as any).createdAt = FieldValue.serverTimestamp();
  }

  await levelRef.set(payload, { merge: true });

  await db.collection("audit_events").add({
    event: existing.exists ? "LOYALTY_LEVEL_UPDATED" : "LOYALTY_LEVEL_CREATED",
    levelId,
    name: payload.name,
    actor: context.auth?.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, levelId };
});

/**
 * 4. CALLABLE: Ajuste Manual de Puntos (Platform Admin con Auditoría)
 */
export const adminManualPointsAdjustment = functions.https.onCall(async (data: any, context) => {
  if (!isPlatformAdmin(context)) {
    throw new functions.https.HttpsError("permission-denied", "Acceso denegado. Se requiere rol administrativo.");
  }

  const customerId = (data.customerId || "").trim();
  const businessId = (data.businessId || "GLOBAL").trim();
  const businessName = (data.businessName || "Ajuste Administrativo").trim();
  const adjustmentPoints = Number(data.adjustmentPoints) || 0;
  const reason = (data.reason || "").trim();

  if (!customerId || adjustmentPoints === 0 || !reason) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan parámetros requeridos (customerId, adjustmentPoints != 0, reason).");
  }

  const adminUid = context.auth?.uid || "ADMIN";
  const globalRef = db.collection("users").doc(customerId).collection("loyaltySummary").doc("global");
  const txRef = db.collection("users").doc(customerId).collection("loyaltyTransactions").doc();

  await db.runTransaction(async (transaction) => {
    const globalSnap = await transaction.get(globalRef);
    const currentGlobal = globalSnap.exists ? Number(globalSnap.data()?.globalPointsBalance || 0) : 0;
    const currentLifetimeEarned = globalSnap.exists ? Number(globalSnap.data()?.lifetimePointsEarned || 0) : 0;

    const newGlobal = Math.max(0, currentGlobal + adjustmentPoints);
    const now = FieldValue.serverTimestamp();

    if (businessId !== "GLOBAL") {
      const merchantRef = db.collection("users").doc(customerId).collection("loyalty").doc(businessId);
      const merchantSnap = await transaction.get(merchantRef);
      const currentMerchant = merchantSnap.exists ? Number(merchantSnap.data()?.pointsBalance || 0) : 0;
      const currentMerchantEarned = merchantSnap.exists ? Number(merchantSnap.data()?.lifetimePointsEarned || 0) : 0;
      const newMerchant = Math.max(0, currentMerchant + adjustmentPoints);

      transaction.set(
        merchantRef,
        {
          customerId,
          businessId,
          businessName,
          pointsBalance: newMerchant,
          lifetimePointsEarned: adjustmentPoints > 0 ? currentMerchantEarned + adjustmentPoints : currentMerchantEarned,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    transaction.set(
      globalRef,
      {
        customerId,
        globalPointsBalance: newGlobal,
        lifetimePointsEarned: adjustmentPoints > 0 ? currentLifetimeEarned + adjustmentPoints : currentLifetimeEarned,
        updatedAt: now,
      },
      { merge: true }
    );

    transaction.set(txRef, {
      transactionId: txRef.id,
      customerId,
      businessId,
      businessName,
      type: "ADJUSTMENT",
      points: adjustmentPoints,
      balanceBefore: currentGlobal,
      balanceAfter: newGlobal,
      scope: businessId === "GLOBAL" ? "GLOBAL" : "MERCHANT_SPECIFIC",
      allocation: [{ businessId, businessName, points: adjustmentPoints }],
      description: `Ajuste Administrativo: ${reason}`,
      adminId: adminUid,
      createdAt: now,
    });
  });

  await db.collection("audit_events").add({
    event: "LOYALTY_MANUAL_ADJUSTMENT",
    customerId,
    businessId,
    adjustmentPoints,
    reason,
    adminId: adminUid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, customerId, adjustmentPoints };
});
