/**
 * BlueSystem Delivery Enterprise — Courier Profile Management
 * Trigger: onCourierProfileRequestStatusChanged
 *
 * Gestión atómica, idempotente y segura de solicitudes de actualización de perfil de motorizados.
 * /courier_profile_requests/{requestId} (APPROVED) ──> /couriers/{uid} + /users/{uid} + /audit_events + FCM
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const messaging = admin.messaging();

export interface CourierProfileRequestDoc {
  requestId: string;
  courierId: string;
  tenantId?: string;
  requestType: "VEHICLE_CHANGE" | "PERSONAL_DATA" | "FULL_PROFILE";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  oldValues: {
    name?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    vehicleYear?: number;
    vehicleColor?: string;
    department?: string;
    city?: string;
  };
  newValues: {
    name?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    vehicleYear?: number;
    vehicleColor?: string;
    department?: string;
    city?: string;
  };
  documents?: Record<string, any>;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: admin.firestore.Timestamp;
  appliedAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Helper: Envía notificación FCM directa a los dispositivos activos del motorizado
 */
async function sendCourierNotification(uid: string, title: string, body: string, actionData: Record<string, string> = {}) {
  try {
    // 1. Notificación interna en subcolección de usuario
    await db.collection("users").doc(uid).collection("notifications").add({
      title,
      body,
      type: "PROFILE_UPDATE",
      read: false,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      data: actionData,
    });

    // 2. Dispositivos push activos
    const devicesSnap = await db.collection("user_devices")
      .where("uid", "==", uid)
      .where("isActive", "==", true)
      .get();

    const tokens: string[] = [];
    devicesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && data.fcmToken.length > 20) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length > 0) {
      await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title,
          body,
        },
        data: {
          action: "PROFILE_UPDATE",
          screen: "courier_dashboard",
          ...actionData,
        },
        android: {
          priority: "high",
        },
      });
      Logger.info(`[COURIER-PROFILE] Push FCM enviado a ${tokens.length} dispositivo(s) de uid=${uid}`);
    }
  } catch (err: any) {
    Logger.warn(`[COURIER-PROFILE] Advertencia al enviar notificación a uid=${uid}`, { error: err?.message || err });
  }
}

/**
 * TRIGGER: onCourierProfileRequestStatusChanged
 * Monitorea cambios de estado en /courier_profile_requests/{requestId}
 */
export const onCourierProfileRequestStatusChanged = functions.firestore
  .document("courier_profile_requests/{requestId}")
  .onUpdate(async (change, context) => {
    const requestId = context.params.requestId;
    const before = change.before.data() as CourierProfileRequestDoc | undefined;
    const after = change.after.data() as CourierProfileRequestDoc | undefined;

    if (!before || !after) return null;
    if (before.status === after.status) return null;

    const courierId = after.courierId;
    if (!courierId) {
      Logger.error(`[COURIER-PROFILE] Solicitud requestId=${requestId} no tiene courierId asignado.`);
      return null;
    }

    Logger.info(`[COURIER-PROFILE] Transición de estado en solicitud requestId=${requestId}: ${before.status} -> ${after.status}`, {
      requestId,
      courierId,
      oldStatus: before.status,
      newStatus: after.status,
    });

    // ── CASO 1: APROBACIÓN ADMINISTRATIVA ────────────────────────────────────
    if (after.status === "APPROVED" && before.status !== "APPROVED") {
      // Idempotencia: Verificar si ya fue aplicado
      if (after.appliedAt) {
        Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} ya fue aplicada previamente. Omitiendo.`, { requestId });
        return null;
      }

      try {
        await db.runTransaction(async (tx) => {
          const now = FieldValue.serverTimestamp();
          const reqRef = db.collection("courier_profile_requests").doc(requestId);
          const courierRef = db.collection("couriers").doc(courierId);
          const userRef = db.collection("users").doc(courierId);

          const courierSnap = await tx.get(courierRef);
          const userSnap = await tx.get(userRef);

          const newVals = after.newValues || {};

          // Construir mapa de actualización para /couriers/{courierId}
          const courierUpdates: Record<string, any> = {
            updatedAt: now,
          };

          if (newVals.name) courierUpdates.name = newVals.name;
          if (newVals.phone) courierUpdates.phone = newVals.phone;
          if (newVals.email) courierUpdates.email = newVals.email;
          if (newVals.nationalId) courierUpdates.nationalId = newVals.nationalId;
          if (newVals.city) courierUpdates.city = newVals.city;
          if (newVals.department) courierUpdates.department = newVals.department;

          // Datos de vehículo
          if (newVals.vehiclePlate || newVals.vehicleBrand || newVals.vehicleModel || newVals.vehicleYear || newVals.vehicleColor) {
            const currentVehicle = courierSnap.exists ? courierSnap.data()?.vehicle || {} : {};
            const updatedVehicle = {
              ...currentVehicle,
              brand: newVals.vehicleBrand || currentVehicle.brand || "",
              model: newVals.vehicleModel || currentVehicle.model || "",
              plate: newVals.vehiclePlate || currentVehicle.plate || "",
              year: newVals.vehicleYear || currentVehicle.year || 2024,
              color: newVals.vehicleColor || currentVehicle.color || "",
            };
            courierUpdates.vehicle = updatedVehicle;
            if (newVals.vehiclePlate) courierUpdates.plate = newVals.vehiclePlate;
            if (newVals.vehicleBrand) courierUpdates.vehicleBrand = newVals.vehicleBrand;
            if (newVals.vehicleModel) courierUpdates.vehicleModel = newVals.vehicleModel;
            if (newVals.vehicleYear) courierUpdates.vehicleYear = newVals.vehicleYear;
            if (newVals.vehicleColor) courierUpdates.vehicleColor = newVals.vehicleColor;
          }

          tx.set(courierRef, courierUpdates, { merge: true });

          // Construir mapa de actualización para /users/{courierId}
          const userUpdates: Record<string, any> = {
            updatedAt: now,
          };

          if (newVals.name) {
            userUpdates.name = newVals.name;
            userUpdates.nombre = newVals.name;
          }
          if (newVals.phone) {
            userUpdates.phone = newVals.phone;
            userUpdates.telefono = newVals.phone;
          }
          if (newVals.email) userUpdates.email = newVals.email;
          if (newVals.nationalId) userUpdates.nationalId = newVals.nationalId;
          if (newVals.city) userUpdates.city = newVals.city;
          if (newVals.vehiclePlate) {
            userUpdates.vehiclePlate = newVals.vehiclePlate;
            userUpdates.placa = newVals.vehiclePlate;
          }
          if (newVals.vehicleBrand) userUpdates.vehicleBrand = newVals.vehicleBrand;
          if (newVals.vehicleModel) userUpdates.vehicleModel = newVals.vehicleModel;
          if (newVals.vehicleYear) {
            userUpdates.vehicleYear = newVals.vehicleYear;
            userUpdates.year = newVals.vehicleYear;
          }
          if (newVals.vehicleColor) {
            userUpdates.vehicleColor = newVals.vehicleColor;
            userUpdates.color = newVals.vehicleColor;
          }

          tx.set(userRef, userUpdates, { merge: true });

          // Marcar solicitud como aplicada
          tx.update(reqRef, {
            appliedAt: now,
            updatedAt: now,
          });

          // Registrar Auditoría Inmutable
          const auditRef = db.collection("audit_events").doc();
          tx.set(auditRef, {
            event: "COURIER_PROFILE_REQUEST_APPROVED",
            domain: "COURIER_PROFILE",
            courierId,
            requestId,
            triggeredBy: after.reviewedBy || "ADMIN",
            oldValues: after.oldValues || {},
            newValues: after.newValues || {},
            timestamp: now,
          });
        });

        // Enviar notificación Push FCM al motorizado
        await sendCourierNotification(
          courierId,
          "✅ Perfil Actualizado Exitosamente",
          "Tu solicitud de modificación de información y/o vehículo ha sido aprobada por Administración.",
          { requestId, status: "APPROVED" }
        );

        Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} aprobada y aplicada atómicamente para courierId=${courierId}`);
      } catch (err: any) {
        Logger.error(`[COURIER-PROFILE] Error aplicando aprobación de perfil para requestId=${requestId}`, {
          requestId,
          error: err?.message || err,
        });
        throw err;
      }
    }

    // ── CASO 2: RECHAZO ADMINISTRATIVO ───────────────────────────────────────
    else if (after.status === "REJECTED" && before.status !== "REJECTED") {
      const reason = after.rejectionReason || "Información o documentación inconsistente.";

      try {
        // Registrar Auditoría Inmutable
        await db.collection("audit_events").add({
          event: "COURIER_PROFILE_REQUEST_REJECTED",
          domain: "COURIER_PROFILE",
          courierId,
          requestId,
          triggeredBy: after.reviewedBy || "ADMIN",
          rejectionReason: reason,
          oldValues: after.oldValues || {},
          newValues: after.newValues || {},
          timestamp: FieldValue.serverTimestamp(),
        });

        // Enviar notificación Push FCM al motorizado
        await sendCourierNotification(
          courierId,
          "⚠️ Solicitud de Modificación No Aprobada",
          `Tu solicitud de cambio requiere corrección. Motivo: ${reason}`,
          { requestId, status: "REJECTED", reason }
        );

        Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} rechazada correctamente con motivo: ${reason}`);
      } catch (auditErr: any) {
        Logger.warn(`[COURIER-PROFILE] Error registrando auditoría de rechazo para requestId=${requestId}`, { error: auditErr });
      }
    }

    return null;
  });
