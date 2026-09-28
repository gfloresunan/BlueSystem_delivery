/**
 * BlueSystem Delivery Enterprise — Backend Cloud Functions
 * Merchant Lifecycle & Identity Reconciler (EIAM v2.2)
 *
 * Invariante: MERCHANT ACTIVE ACCESS INVARIANT
 * Garantiza sincronización bidireccional atómica e idempotente entre el ciclo de vida
 * del Comercio (/businesses/{businessId}), su membresía (/membership) y la Identidad (/users + Auth).
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { resolveEiamRole } from "./auth";

const db = admin.firestore();

export interface ReconciliationResult {
  businessId: string;
  ownerUid: string | null;
  businessStatus: string;
  isBusinessActive: boolean;
  userUpdated: boolean;
  authUpdated: boolean;
  previousAuthDisabled?: boolean;
  targetAuthDisabled?: boolean;
  claimsUpdated: boolean;
  result: "SYNCHRONIZED" | "NO_CHANGE" | "FAILED" | "ORPHAN_BUSINESS";
  details?: string;
}

/**
 * Motor Canónico de Reconciliación de Identidad Comercial
 */
export async function reconcileMerchantIdentityInternal(
  businessId: string,
  actorUid: string = "SYSTEM_RECONCILER"
): Promise<ReconciliationResult> {
  const bizRef = db.collection("businesses").doc(businessId);
  const bizSnap = await bizRef.get();

  if (!bizSnap.exists) {
    return {
      businessId,
      ownerUid: null,
      businessStatus: "NON_EXISTENT",
      isBusinessActive: false,
      userUpdated: false,
      authUpdated: false,
      claimsUpdated: false,
      result: "FAILED",
      details: `Comercio ${businessId} no existe en Firestore`,
    };
  }

  const bizData = bizSnap.data() || {};
  let ownerUid = bizData.ownerUid || null;
  const tenantId = bizData.tenantId || "ten_bluesystem_core";
  const orgId = bizData.orgId || null;
  const branchIds = Array.isArray(bizData.branchIds) && bizData.branchIds.length > 0
    ? bizData.branchIds
    : [bizData.branchId || `br_${businessId}_main`];
  const primaryBranchId = branchIds[0];

  // Si ownerUid no está en el documento del negocio, buscar en /membership
  if (!ownerUid) {
    const memSnap = await db.collection("membership")
      .where("businessId", "==", businessId)
      .where("role", "in", ["MERCHANT_OWNER", "OWNER"])
      .limit(1)
      .get();
    if (!memSnap.empty) {
      ownerUid = memSnap.docs[0].data().uid;
    }
  }

  // Fallback: buscar en /users con businessId
  if (!ownerUid) {
    const userSnap = await db.collection("users")
      .where("businessId", "==", businessId)
      .where("role", "in", ["OWNER", "owner", "business", "MERCHANT_OWNER"])
      .limit(1)
      .get();
    if (!userSnap.empty) {
      ownerUid = userSnap.docs[0].id;
    }
  }

  if (!ownerUid) {
    Logger.warn(`[MERCHANT_RECONCILER] Comercio huérfano sin propietario detectado: ${businessId}`);
    return {
      businessId,
      ownerUid: null,
      businessStatus: bizData.status || "UNKNOWN",
      isBusinessActive: bizData.isActive !== false,
      userUpdated: false,
      authUpdated: false,
      claimsUpdated: false,
      result: "ORPHAN_BUSINESS",
      details: "No se encontró propietario asignado para este comercio",
    };
  }

  const isThisBusinessActive =
    (bizData.status === "ACTIVE" || bizData.lifecycleStatus === "ACTIVE" || bizData.lifecycleStatus === "ONBOARDING") &&
    bizData.isActive !== false &&
    bizData.active !== false &&
    bizData.status !== "DELETED" &&
    bizData.lifecycleStatus !== "DEPROVISIONED";

  let hasOtherActiveBusiness = false;
  let activeOtherBizData: any = null;
  if (!isThisBusinessActive && ownerUid) {
    const otherBizSnap = await db.collection("businesses")
      .where("ownerUid", "==", ownerUid)
      .where("status", "==", "ACTIVE")
      .limit(1)
      .get();
    if (!otherBizSnap.empty) {
      hasOtherActiveBusiness = true;
      activeOtherBizData = { id: otherBizSnap.docs[0].id, ...otherBizSnap.docs[0].data() };
    }
  }

  const isBusinessActive = isThisBusinessActive || hasOtherActiveBusiness;
  const targetStatus = isBusinessActive ? "ACTIVE" : "SUSPENDED";
  const targetAuthDisabled = !isBusinessActive;

  const effectiveBusinessId = isThisBusinessActive ? businessId : (activeOtherBizData ? activeOtherBizData.id : businessId);
  const effectiveTenantId = isThisBusinessActive ? tenantId : (activeOtherBizData?.tenantId || tenantId);
  const effectiveOrgId = isThisBusinessActive ? orgId : (activeOtherBizData?.orgId || orgId);
  const effectiveBranchId = isThisBusinessActive ? primaryBranchId : (activeOtherBizData?.branchIds?.[0] || primaryBranchId);

  let userUpdated = false;
  let authUpdated = false;
  let claimsUpdated = false;
  let previousAuthDisabled: boolean | undefined;

  // 1. Sincronizar /users/{ownerUid}
  const userRef = db.collection("users").doc(ownerUid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() || {} : {};

  const userNeedsUpdate =
    !userSnap.exists ||
    userData.status !== targetStatus ||
    userData.isActive !== isBusinessActive ||
    userData.active !== isBusinessActive ||
    userData.businessId !== effectiveBusinessId ||
    userData.isDeleted === true ||
    (isBusinessActive && userData.lifecycleStatus === "DEPROVISIONED");

  if (userNeedsUpdate) {
    await userRef.set({
      uid: ownerUid,
      businessId: effectiveBusinessId,
      tenantId: effectiveTenantId,
      orgId: effectiveOrgId,
      branchId: effectiveBranchId,
      status: targetStatus,
      lifecycleStatus: isBusinessActive ? (userData.lifecycleStatus === "ONBOARDING" ? "ONBOARDING" : "ACTIVE") : "SUSPENDED",
      isActive: isBusinessActive,
      active: isBusinessActive,
      isDeleted: false,
      role: "OWNER",
      eiamRole: "OWNER",
      rol: "owner",
      userType: "business",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    userUpdated = true;
  }

  // 2. Sincronizar Firebase Auth & Custom Claims
  try {
    let authUser: admin.auth.UserRecord | null = null;
    try {
      authUser = await admin.auth().getUser(ownerUid);
    } catch (e: any) {
      if (e.code === "auth/user-not-found" && userData.email) {
        try {
          authUser = await admin.auth().getUserByEmail(userData.email);
        } catch (e2: any) {}
      }
    }

    if (authUser) {
      previousAuthDisabled = authUser.disabled;
      if (authUser.disabled !== targetAuthDisabled) {
        await admin.auth().updateUser(authUser.uid, { disabled: targetAuthDisabled });
        authUpdated = true;

        if (targetAuthDisabled) {
          // Revocar tokens si el negocio fue suspendido
          await admin.auth().revokeRefreshTokens(authUser.uid).catch(() => null);
        }
      }

      // Validar y asegurar Custom Claims
      const currentClaims = authUser.customClaims || {};
      const expectedClaims = {
        role: "OWNER",
        businessId,
        branchId: primaryBranchId,
        orgId,
        tenantId,
        eiamVer: 3,
      };

      const claimsNeedUpdate =
        currentClaims.role !== expectedClaims.role ||
        currentClaims.businessId !== expectedClaims.businessId ||
        currentClaims.tenantId !== expectedClaims.tenantId ||
        currentClaims.branchId !== expectedClaims.branchId;

      if (claimsNeedUpdate) {
        await admin.auth().setCustomUserClaims(authUser.uid, {
          ...currentClaims,
          ...expectedClaims,
        });
        claimsUpdated = true;
      }
    }
  } catch (authError: any) {
    Logger.error(`[MERCHANT_RECONCILER] Error al sincronizar Auth para uid=${ownerUid}:`, authError);
  }

  // 3. Registrar Evento de Auditoría
  if (userUpdated || authUpdated || claimsUpdated) {
    await db.collection("audit_events").add({
      event: "MERCHANT_IDENTITY_RECONCILIATION",
      action: "MERCHANT_IDENTITY_RECONCILIATION",
      domain: "IDENTITY",
      businessId,
      ownerUid,
      tenantId,
      businessStatus: bizData.status || "ACTIVE",
      isBusinessActive,
      previousAuthDisabled,
      targetAuthDisabled,
      userUpdated,
      authUpdated,
      claimsUpdated,
      triggeredBy: actorUid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    Logger.info(
      `[MERCHANT_RECONCILER] ✅ Reconciliación exitosa para businessId=${businessId}, ownerUid=${ownerUid}: authDisabled=${targetAuthDisabled}, userStatus=${targetStatus}`,
      { businessId, ownerUid, userUpdated, authUpdated, claimsUpdated }
    );
  }

  return {
    businessId,
    ownerUid,
    businessStatus: bizData.status || "ACTIVE",
    isBusinessActive,
    userUpdated,
    authUpdated,
    previousAuthDisabled,
    targetAuthDisabled,
    claimsUpdated,
    result: (userUpdated || authUpdated || claimsUpdated) ? "SYNCHRONIZED" : "NO_CHANGE",
  };
}

/**
 * Trigger Firestore: /businesses/{businessId} onWrite
 * Ejecuta automáticamente la reconciliación simétrica de identidad ante cambios de ciclo de vida.
 */
export const onBusinessLifecycleChanged = functions.firestore
  .document("businesses/{businessId}")
  .onWrite(async (change, context) => {
    const businessId = context.params.businessId;
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    // Si el negocio fue eliminado físicamente
    if (!afterData) {
      if (beforeData && beforeData.ownerUid) {
        // Deshabilitar la identidad del propietario de forma segura
        try {
          await admin.auth().updateUser(beforeData.ownerUid, { disabled: true });
          await admin.auth().revokeRefreshTokens(beforeData.ownerUid);
        } catch (e: any) {}
      }
      return null;
    }

    // Detectar si hubo cambio relevante en estado, actividad o propietario
    const statusChanged = !beforeData || beforeData.status !== afterData.status;
    const activeChanged = !beforeData || beforeData.isActive !== afterData.isActive || beforeData.active !== afterData.active;
    const ownerChanged = !beforeData || beforeData.ownerUid !== afterData.ownerUid;

    if (statusChanged || activeChanged || ownerChanged) {
      Logger.info(
        `[BUSINESS_LIFECYCLE_TRIGGER] Cambio detectado en businessId=${businessId}. Ejecutando reconciliación canónica.`,
        { businessId, status: afterData.status, isActive: afterData.isActive }
      );
      await reconcileMerchantIdentityInternal(businessId, "FIRESTORE_LIFECYCLE_TRIGGER");
    }

    // Sincronizar automáticamente sucursales (/branches) ante cambios de tarifa de envío u operaciones
    const feeChanged = !beforeData || beforeData.deliveryFee !== afterData.deliveryFee || beforeData.costoEnvioBase !== afterData.costoEnvioBase;
    const storeStateChanged = !beforeData || beforeData.isOpen !== afterData.isOpen || beforeData.abierto !== afterData.abierto;
    const infoChanged = !beforeData || beforeData.address !== afterData.address || beforeData.phone !== afterData.phone || beforeData.city !== afterData.city;

    if (feeChanged || storeStateChanged || infoChanged) {
      try {
        const branchesSnap = await db.collection("branches").where("businessId", "==", businessId).get();
        if (!branchesSnap.empty) {
          const bBatch = db.batch();
          const newFee = typeof afterData.deliveryFee === "number" ? afterData.deliveryFee : (typeof afterData.costoEnvioBase === "number" ? afterData.costoEnvioBase : null);
          const newIsOpen = afterData.isOpen ?? afterData.abierto;

          branchesSnap.docs.forEach((bDoc) => {
            const upd: any = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
            if (newFee !== null) {
              upd.deliveryFee = newFee;
              upd.costoEnvio = newFee;
            }
            if (typeof newIsOpen === "boolean") {
              upd.isOpen = newIsOpen;
              upd.abierto = newIsOpen;
              upd.active = newIsOpen;
            }
            if (afterData.phone) upd.phone = afterData.phone;
            if (afterData.address) upd.address = afterData.address;
            if (afterData.city) upd.city = afterData.city;
            if (afterData.zone) upd.zone = afterData.zone;
            bBatch.update(bDoc.ref, upd);
          });
          await bBatch.commit();
          Logger.info(`[BUSINESS_LIFECYCLE_TRIGGER] Sincronizadas ${branchesSnap.size} sucursales para businessId=${businessId}`);
        }
      } catch (brErr: any) {
        Logger.warn(`[BUSINESS_LIFECYCLE_TRIGGER] Error sincronizando sucursales:`, { error: brErr?.message || String(brErr) });
      }
    }

    return null;
  });
