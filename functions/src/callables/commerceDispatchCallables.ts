/**
 * BlueSystem Delivery Enterprise — Commerce Progressive Dispatch Callables
 * Protocol: BSD-COMMERCE-PROGRESSIVE-DISPATCH-001
 *
 * Expone endpoints autoritativos para:
 * 1. claimCommerceOrder: Reclamo atómico por parte del motorizado.
 * 2. rejectCommerceOffer: Rechazo de oferta por parte del motorizado.
 * 3. assignCommerceOrderManual: Asignación administrativa manual.
 * 4. retryCommerceDispatch: Reintento manual tras timeout.
 * 5. getCommerceDispatchStatus: Consulta de telemetría de despacho para Control Tower.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  claimCommerceOrderAtomically,
  rejectCommerceOffer,
  assignCommerceOrderManual,
  retryCommerceDispatch,
  getCommerceProgressiveDispatchConfig,
} from "../services/commerceProgressiveDispatchEngine";
import { Logger } from "../shared/logger/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function isCallerAdmin(token: any): boolean {
  const rawRole = (token?.role || token?.eiamRole || "").toString().toUpperCase();
  return (
    rawRole === "ADMIN" ||
    rawRole === "SUPER_ADMIN" ||
    rawRole === "PLATFORM_ADMIN" ||
    rawRole === "AUDITOR" ||
    rawRole === "OPERATOR" ||
    rawRole === "SUPERVISOR" ||
    token?.admin === true ||
    token?.isSuperAdmin === true ||
    token?.isPlatformAdmin === true
  );
}

/**
 * 1. claimCommerceOrder
 * Reclamo atómico de orden de comercio por un motorizado elegible.
 */
export const claimCommerceOrder = functions.https.onCall(
  async (data: { orderId: string; courierName?: string; appVersion?: string }, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para aceptar el pedido."
      );
    }

    const courierId = context.auth.uid;
    const orderId = (data?.orderId || "").trim();
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El identificador del pedido (orderId) es obligatorio."
      );
    }

    const courierName = (data?.courierName || context.auth.token?.name || "").trim() || "Motorizado";
    const appVersion = (data?.appVersion || "").trim() || undefined;

    Logger.info(`[COMMERCE_DISPATCH_CALLABLE] Reclamo de orden ${orderId} por courier ${courierId} (appVersion: ${appVersion || "from_user_devices"})`);

    const result = await claimCommerceOrderAtomically(orderId, courierId, courierName, appVersion);

    if (!result.success) {
      return {
        success: false,
        code: result.code,
        message: result.message,
        minimumVersion: result.minimumVersion,
        updateUrl: result.updateUrl,
      };
    }

    return {
      success: true,
      code: result.code,
      message: result.message,
      orderId,
      assignedAt: result.assignedAt ? result.assignedAt.toDate().toISOString() : new Date().toISOString(),
    };
  }
);

/**
 * 2. rejectCommerceOffer
 * Rechazo explícito de oferta por el motorizado.
 */
export const rejectCommerceOfferCallable = functions.https.onCall(
  async (data: { orderId: string; reason?: string }, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para rechazar la oferta."
      );
    }

    const courierId = context.auth.uid;
    const orderId = (data?.orderId || "").trim();
    const reason = (data?.reason || "DECLINED_BY_COURIER").trim();

    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El identificador del pedido (orderId) es obligatorio."
      );
    }

    const result = await rejectCommerceOffer(orderId, courierId, reason);
    return result;
  }
);

/**
 * 3. assignCommerceOrderManual
 * Asignación manual de un motorizado por el Administrador / Supervisor.
 */
export const assignCommerceOrderManualCallable = functions.https.onCall(
  async (data: { orderId: string; courierId: string; reason?: string }, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para realizar esta operación."
      );
    }

    const isAdmin = isCallerAdmin(context.auth.token);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "No tienes permisos de Administrador para asignar motorizados manualmente."
      );
    }

    const orderId = (data?.orderId || "").trim();
    const courierId = (data?.courierId || "").trim();
    const reason = (data?.reason || "MANUAL_DISPATCH_ADMIN").trim();

    if (!orderId || !courierId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId y courierId son obligatorios."
      );
    }

    const actorUid = context.auth.uid;
    const result = await assignCommerceOrderManual(orderId, courierId, actorUid, { reason });

    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }

    return {
      success: true,
      message: result.message,
      orderId,
      courierId,
    };
  }
);

/**
 * 4. retryCommerceDispatch
 * Reintento de despacho progresivo tras TIMED_OUT.
 */
export const retryCommerceDispatchCallable = functions.https.onCall(
  async (data: { orderId: string }, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para reintentar la búsqueda."
      );
    }

    const orderId = (data?.orderId || "").trim();
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El identificador del pedido (orderId) es obligatorio."
      );
    }

    const callerUid = context.auth.uid;
    const isAdmin = isCallerAdmin(context.auth.token);

    // Si no es admin, verificar si es el comercio dueño de la orden
    if (!isAdmin) {
      const orderSnap = await db.collection("orders").doc(orderId).get();
      if (!orderSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Pedido no encontrado.");
      }
      const orderData = orderSnap.data() || {};
      const businessId = orderData.businessId || orderData.restaurantId;
      if (businessId !== callerUid && orderData.merchantUid !== callerUid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Solo el Administrador o el Comercio titular pueden reintentar la búsqueda."
        );
      }
    }

    const result = await retryCommerceDispatch(orderId, callerUid);
    return result;
  }
);

/**
 * 5. getCommerceDispatchStatus
 * Consulta del estado detallado de la sesión de búsqueda para Admin / Merchant.
 */
export const getCommerceDispatchStatusCallable = functions.https.onCall(
  async (data: { orderId: string }, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión para consultar el estado del despacho."
      );
    }

    const orderId = (data?.orderId || "").trim();
    if (!orderId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El identificador del pedido (orderId) es obligatorio."
      );
    }

    const sessionSnap = await db.collection("commerce_dispatch_sessions").doc(orderId).get();
    if (!sessionSnap.exists) {
      return {
        hasSession: false,
        status: "NO_SESSION",
      };
    }

    const session = sessionSnap.data() || {};
    const now = Date.now();
    const timeoutMillis = session.timeoutAt?.toMillis ? session.timeoutAt.toMillis() : 0;
    const nextExpansionMillis = session.nextExpansionAt?.toMillis ? session.nextExpansionAt.toMillis() : 0;

    const remainingTimeoutSec = Math.max(0, Math.floor((timeoutMillis - now) / 1000));
    const remainingStageSec = Math.max(0, Math.floor((nextExpansionMillis - now) / 1000));

    return {
      hasSession: true,
      sessionId: session.sessionId,
      orderId: session.orderId,
      status: session.status,
      currentStage: session.currentStage,
      currentRadiusKm: session.currentRadiusKm,
      attemptNumber: session.attemptNumber || 1,
      assignedCourierId: session.assignedCourierId || null,
      notifiedCouriersCount: session.notifiedCourierIds?.length || 0,
      activeOffersCount: session.activeOffersCount || 0,
      remainingTimeoutSeconds: remainingTimeoutSec,
      remainingStageSeconds: remainingStageSec,
      dispatchProfileVersion: session.dispatchProfileVersion,
    };
  }
);
