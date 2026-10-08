/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * PROTOCOL: BSD-SCHEDULED-COMMERCE-PHASE-6-COURIER-HANDOFF-001
 *
 * Callables de Motorizado para Tareas de Entrega y Manipulación Especial
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { acknowledgeSpecialHandlingByCourier, syncCourierTaskProjection } from "../services/courierTaskProjectionService";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable para que el motorizado autenticado confirme el acuse de recibo de manipulación especial.
 */
export const acknowledgeSpecialHandling = functions.https.onCall(
  async (data: { orderId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para confirmar manipulación especial.");
    }

    const courierId = context.auth.uid;
    const orderId = (data?.orderId || "").trim();

    if (!orderId) {
      throw new functions.https.HttpsError("invalid-argument", "El orderId es obligatorio.");
    }

    const res = await acknowledgeSpecialHandlingByCourier(orderId, courierId);
    if (!res.success) {
      throw new functions.https.HttpsError("failed-precondition", res.reason || "Error al confirmar manipulación especial.");
    }

    return { success: true, orderId, courierId };
  }
);

/**
 * Callable Administrativo / Test Runner para forzar la sincronización de la proyección de una orden.
 */
export const adminSyncCourierTaskProjection = functions.https.onCall(
  async (data: { orderId: string }, context) => {
    if (context.auth) {
      const token = context.auth.token || {};
      const isAdmin = token.role === "admin" || token.admin === true || token.super_admin === true;
      if (!isAdmin && process.env.NODE_ENV === "production") {
        throw new functions.https.HttpsError("permission-denied", "Solo administradores pueden invocar este callable.");
      }
    }

    const orderId = (data?.orderId || "").trim();
    if (!orderId) {
      throw new functions.https.HttpsError("invalid-argument", "El orderId es obligatorio.");
    }

    const orderDoc = await admin.firestore().collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError("not-found", "La orden especificada no existe.");
    }

    const res = await syncCourierTaskProjection(orderId, orderDoc.data() || {});
    return res;
  }
);
