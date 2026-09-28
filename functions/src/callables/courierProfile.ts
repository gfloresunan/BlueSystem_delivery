/**
 * BlueSystem Delivery Enterprise — Courier Profile Management
 * Callables: submitCourierProfileUpdateRequest & reviewCourierProfileUpdateRequest
 *
 * Recepción y validación de solicitudes de modificación de perfil de motorizados.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export interface SubmitProfileRequestPayload {
  courierId: string;
  requestType: "VEHICLE_CHANGE" | "PERSONAL_DATA" | "FULL_PROFILE";
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
  documents?: {
    registration?: { name: string; storagePath: string; contentType?: string; size?: number };
    insurance?: { name: string; storagePath: string; contentType?: string; size?: number };
    driverLicense?: { name: string; storagePath: string; contentType?: string; size?: number };
    idFront?: { name: string; storagePath: string; contentType?: string; size?: number };
    idBack?: { name: string; storagePath: string; contentType?: string; size?: number };
    profilePhoto?: { name: string; storagePath: string; contentType?: string; size?: number };
  };
}

function normalizePlate(raw: string): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/\s+/g, "").trim();
}

/**
 * CALLABLE: submitCourierProfileUpdateRequest
 * Permite a un motorizado autenticado solicitar la modificación de sus datos sensibles o vehículo.
 */
export const submitCourierProfileUpdateRequest = functions.https.onCall(
  async (data: SubmitProfileRequestPayload, context) => {
    const { uid: callerUid, role } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: false,
        requiredFields: ["courierId", "requestType", "newValues"],
      },
      "submitCourierProfileUpdateRequest"
    );

    const courierId = data.courierId.trim();

    // Seguridad de Identidad: Solo el propio motorizado o un administrador pueden emitir la solicitud
    const isPlatformAdmin = ["ADMIN", "SUPER_ADMIN", "AUDITOR", "admin", "super_admin"].includes(role);
    if (callerUid !== courierId && !isPlatformAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "No tienes autorización para solicitar modificaciones en el perfil de otro motorizado."
      );
    }

    const { requestType, newValues, documents } = data;

    // Validar existencia del motorizado oficial en Firestore
    const courierDocRef = db.collection("couriers").doc(courierId);
    const courierSnap = await courierDocRef.get();
    if (!courierSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "El expediente de motorizado no existe en el sistema oficial."
      );
    }

    const currentCourierData = courierSnap.data() || {};
    const currentVehicle = currentCourierData.vehicle || {};

    // Construir mapa de Old Values oficiales
    const oldValues = {
      name: currentCourierData.name || "",
      phone: currentCourierData.phone || "",
      email: currentCourierData.email || "",
      nationalId: currentCourierData.nationalId || "",
      vehicleBrand: currentCourierData.vehicleBrand || currentVehicle.brand || "",
      vehicleModel: currentCourierData.vehicleModel || currentVehicle.model || "",
      vehiclePlate: currentCourierData.plate || currentVehicle.plate || "",
      vehicleYear: currentCourierData.vehicleYear || currentVehicle.year || 2024,
      vehicleColor: currentCourierData.vehicleColor || currentVehicle.color || "",
      department: currentCourierData.departmentName || currentCourierData.department || "",
      city: currentCourierData.municipalityName || currentCourierData.city || "",
    };

    // Validaciones específicas si hay cambio de placa
    if (newValues.vehiclePlate) {
      const cleanPlate = normalizePlate(newValues.vehiclePlate);
      newValues.vehiclePlate = cleanPlate;

      if (cleanPlate.length < 3) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "La placa vehicular ingresada no tiene un formato válido."
        );
      }

      // Validar si la nueva placa ya está registrada en otro motorizado activo
      const existingPlateSnap = await db
        .collection("couriers")
        .where("plate", "==", cleanPlate)
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (!existingPlateSnap.empty && existingPlateSnap.docs[0].id !== courierId) {
        throw new functions.https.HttpsError(
          "already-exists",
          `La placa ${cleanPlate} ya se encuentra registrada y activa en la flota.`
        );
      }
    }

    // Verificar si ya tiene una solicitud PENDING_REVIEW del mismo tipo
    const pendingSnap = await db
      .collection("courier_profile_requests")
      .where("courierId", "==", courierId)
      .where("status", "==", "PENDING_REVIEW")
      .limit(1)
      .get();

    if (!pendingSnap.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Ya tienes una solicitud de modificación pendiente de revisión administrativa."
      );
    }

    const requestId = `cpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = FieldValue.serverTimestamp();

    const requestDoc = {
      requestId,
      courierId,
      requestType,
      status: "PENDING_REVIEW",
      oldValues,
      newValues,
      documents: documents || {},
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("courier_profile_requests").doc(requestId).set(requestDoc);

    // Registro de auditoría
    try {
      await db.collection("audit_events").add({
        event: "COURIER_PROFILE_REQUEST_SUBMITTED",
        domain: "COURIER_PROFILE",
        courierId,
        requestId,
        requestType,
        oldValues,
        newValues,
        triggeredBy: callerUid,
        timestamp: now,
      });
    } catch (auditErr) {
      Logger.warn("[COURIER-PROFILE] Advertencia registrando auditoría de solicitud", { error: auditErr });
    }

    Logger.info(`[COURIER-PROFILE] Solicitud creada exitosamente requestId=${requestId} para courierId=${courierId}`);

    return {
      success: true,
      requestId,
      message: "Tu solicitud de modificación ha sido radicada correctamente y está pendiente de validación administrativa.",
    };
  }
);

/**
 * CALLABLE: reviewCourierProfileUpdateRequest
 * Permite a administradores de plataforma aprobar o rechazar solicitudes de perfil.
 */
export const reviewCourierProfileUpdateRequest = functions.https.onCall(
  async (
    data: { requestId: string; decision: "APPROVE" | "REJECT"; rejectionReason?: string },
    context
  ) => {
    const { uid: adminUid } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "admin", "super_admin"],
        requiredFields: ["requestId", "decision"],
      },
      "reviewCourierProfileUpdateRequest"
    );

    const { requestId, decision, rejectionReason } = data;

    const reqRef = db.collection("courier_profile_requests").doc(requestId);
    const reqSnap = await reqRef.get();

    if (!reqSnap.exists) {
      throw new functions.https.HttpsError("not-found", "La solicitud de perfil no existe.");
    }

    const reqData = reqSnap.data() || {};
    if (reqData.status !== "PENDING_REVIEW") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `La solicitud ya fue procesada previamente con estado: ${reqData.status}`
      );
    }

    if (decision === "REJECT" && (!rejectionReason || !rejectionReason.trim())) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Se requiere especificar un motivo obligatorio para el rechazo."
      );
    }

    const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = FieldValue.serverTimestamp();

    await reqRef.update({
      status: newStatus,
      reviewedBy: adminUid,
      reviewedAt: now,
      rejectionReason: decision === "REJECT" ? (rejectionReason ? rejectionReason.trim() : "") : null,
      updatedAt: now,
    });

    Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} revisada por admin=${adminUid} con decisión=${newStatus}`);

    return {
      success: true,
      requestId,
      status: newStatus,
      message: `Solicitud marcada exitosamente como ${newStatus}.`,
    };
  }
);
