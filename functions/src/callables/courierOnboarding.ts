/**
 * BlueSystem Delivery Enterprise — Courier Onboarding & Verification
 * Callable: submitCourierApplication + getCourierApplicationStatus
 *
 * Recibe y valida solicitudes públicas de aspirantes a motorizados con:
 * - Validación exhaustiva de campos y documentos
 * - Normalización canónica de placa y cédula
 * - Prevención estricta de duplicados (Cédula, Placa, Email, Teléfono)
 * - Persistencia segura en /courier_applications
 * - Registro de trazabilidad en /audit_events
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { normalizeGeoLocation } from "../domain/geo/geoCatalog";
import { EmailService } from "../services/emailService";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CourierDocumentItem {
  name: string;
  type: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface CourierApplicationPayload {
  applicationId?: string;
  tenantId?: string;
  tenantSlug?: string;
  personal: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    department?: string;
    city?: string;
    departmentId?: string;
    departmentName?: string;
    municipalityId?: string;
    municipalityName?: string;
    nationalId: string;
  };
  vehicle: {
    brand: string;
    model: string;
    plate: string;
    year?: string | number;
    color?: string;
  };
  documents: {
    idFront: CourierDocumentItem;
    idBack: CourierDocumentItem;
    profilePhoto: CourierDocumentItem;
    registration: CourierDocumentItem;
    insurance: CourierDocumentItem;
    driverLicense: CourierDocumentItem;
  };
}

// ─── Helpers de Normalización ─────────────────────────────────────────────────

function normalizePlate(raw: string): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/\s+/g, "").trim();
}

function normalizeNationalId(raw: string): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/\s+/g, "").trim();
}

// ─── CALLABLE: submitCourierApplication ────────────────────────────────────────

/**
 * Recibe la solicitud desde el Portal Web de Registro de Motorizados.
 * Endpoint público: valida los datos, valida el Tenant server-side, previene duplicados y persiste en /courier_applications.
 */
export const submitCourierApplication = functions.https.onCall(
  async (data: CourierApplicationPayload) => {
    Logger.info("[COURIER-ONBOARDING] Recibiendo solicitud de motorizado", {
      email: data?.personal?.email,
      plate: data?.vehicle?.plate,
      tenantId: data?.tenantId,
      tenantSlug: data?.tenantSlug,
    });

    // 1. Validar presencia de objetos raíz
    if (!data || !data.personal || !data.vehicle || !data.documents) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Estructura de solicitud incompleta. Se requieren datos personales, de vehículo y documentos."
      );
    }

    const { personal, vehicle, documents } = data;

    // 2. Validar campos personales obligatorios
    if (
      !personal.firstName?.trim() ||
      !personal.lastName?.trim() ||
      !personal.phone?.trim() ||
      !personal.email?.trim() ||
      !personal.department?.trim() ||
      !personal.city?.trim() ||
      !personal.nationalId?.trim()
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Todos los campos de información personal son obligatorios."
      );
    }

    // 3. Validar formato de email
    const cleanEmail = personal.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El formato del correo electrónico es inválido."
      );
    }

    // 4. Validar datos de motocicleta
    const cleanPlate = normalizePlate(vehicle.plate);
    if (!vehicle.brand?.trim() || !vehicle.model?.trim() || !cleanPlate) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Los datos de la motocicleta (marca, modelo y placa) son obligatorios."
      );
    }

    // 5. Validar formato de cédula
    const cleanNationalId = normalizeNationalId(personal.nationalId);
    if (cleanNationalId.length < 8) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El número de cédula debe tener un formato válido."
      );
    }

    // ─── Validación y Resolución Confiable del Tenant (Zero Trust Server-Side) ────
    let resolvedTenantId = "ten_bluesystem_core";
    let resolvedTenantSlug = "bluesystem";
    let resolvedTenantName = "BlueSystem Platform";

    if (data.tenantId && typeof data.tenantId === "string" && data.tenantId.trim()) {
      const targetTenantId = data.tenantId.trim();
      const tenantDoc = await db.collection("tenants").doc(targetTenantId).get();
      if (!tenantDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `El tenant '${targetTenantId}' no existe en el sistema.`
        );
      }
      const tenantData = tenantDoc.data()!;
      if (tenantData.status !== "ACTIVE") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `El tenant '${targetTenantId}' no se encuentra en estado ACTIVE (Estado actual: ${tenantData.status}).`
        );
      }
      resolvedTenantId = tenantDoc.id;
      resolvedTenantSlug = tenantData.slug || targetTenantId;
      resolvedTenantName = tenantData.name || tenantData.legalName || "Tenant";
    } else if (data.tenantSlug && typeof data.tenantSlug === "string" && data.tenantSlug.trim()) {
      const targetSlug = data.tenantSlug.toLowerCase().trim();
      const tenantSnap = await db
        .collection("tenants")
        .where("slug", "==", targetSlug)
        .limit(1)
        .get();

      if (tenantSnap.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          `No se encontró ninguna empresa asociada al identificador '${targetSlug}'.`
        );
      }
      const tenantDoc = tenantSnap.docs[0];
      const tenantData = tenantDoc.data();
      if (tenantData.status !== "ACTIVE") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `La empresa '${targetSlug}' no se encuentra activa para recibir solicitudes de motorizados.`
        );
      }
      resolvedTenantId = tenantDoc.id;
      resolvedTenantSlug = tenantData.slug || targetSlug;
      resolvedTenantName = tenantData.name || tenantData.legalName || "Tenant";
    }

    // 6. Validar que los 6 documentos requeridos estén presentes y completos
    const requiredDocKeys: (keyof typeof documents)[] = [
      "idFront",
      "idBack",
      "profilePhoto",
      "registration",
      "insurance",
      "driverLicense",
    ];

    for (const docKey of requiredDocKeys) {
      const doc = documents[docKey];
      if (!doc || !doc.storagePath || !doc.storagePath.trim()) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Falta el documento requerido: ${docKey}. Asegúrate de cargar todos los archivos solicitados.`
        );
      }
    }

    // 7. Control de Duplicidad en Base de Datos (Hard Block por Tenant / Global)
    // A) Validar duplicidad de Cédula en solicitudes activas
    const existingIdSnap = await db
      .collection("courier_applications")
      .where("personal.nationalId", "==", cleanNationalId)
      .where("tenantId", "==", resolvedTenantId)
      .where("status", "in", ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED"])
      .limit(1)
      .get();

    if (!existingIdSnap.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Ya existe una solicitud registrada o aprobada con este número de cédula para esta empresa."
      );
    }

    // B) Validar duplicidad de Placa en solicitudes activas
    const existingPlateSnap = await db
      .collection("courier_applications")
      .where("vehicle.plate", "==", cleanPlate)
      .where("tenantId", "==", resolvedTenantId)
      .where("status", "in", ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED"])
      .limit(1)
      .get();

    if (!existingPlateSnap.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        `La placa ${cleanPlate} ya está registrada en una solicitud activa para esta empresa.`
      );
    }

    // C) Validar duplicidad de Email en solicitudes activas
    const existingEmailSnap = await db
      .collection("courier_applications")
      .where("personal.email", "==", cleanEmail)
      .where("tenantId", "==", resolvedTenantId)
      .where("status", "in", ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED"])
      .limit(1)
      .get();

    if (!existingEmailSnap.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Ya existe una solicitud registrada con este correo electrónico para esta empresa."
      );
    }

    // D) Regla Normativa de 48 Horas para Solicitudes Rechazadas (Cooldown)
    // Si la solicitud anterior fue rechazada (ej. por documentos faltantes o ilegibles),
    // normar que debe esperar 48 horas para ingresar una nueva solicitud, salvo que el admin
    // la haya reactivado o eliminado desde el panel administrativo.
    const COOLDOWN_HOURS = 48;
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

    const rejectedSnap = await db
      .collection("courier_applications")
      .where("tenantId", "==", resolvedTenantId)
      .where("status", "==", "REJECTED")
      .where("personal.email", "==", cleanEmail)
      .limit(1)
      .get();

    let priorRejectedDoc: FirebaseFirestore.DocumentData | null = rejectedSnap.empty ? null : rejectedSnap.docs[0].data();

    if (!priorRejectedDoc) {
      const rejectedIdSnap = await db
        .collection("courier_applications")
        .where("tenantId", "==", resolvedTenantId)
        .where("status", "==", "REJECTED")
        .where("personal.nationalId", "==", cleanNationalId)
        .limit(1)
        .get();
      if (!rejectedIdSnap.empty) {
        priorRejectedDoc = rejectedIdSnap.docs[0].data();
      }
    }

    if (priorRejectedDoc) {
      const rejectionTimestamp =
        priorRejectedDoc.reviewedAt?.toMillis?.() ||
        priorRejectedDoc.updatedAt?.toMillis?.() ||
        priorRejectedDoc.createdAt?.toMillis?.() ||
        0;

      const elapsedMs = Date.now() - rejectionTimestamp;

      if (elapsedMs < cooldownMs) {
        const remainingHours = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / (60 * 60 * 1000)));
        const reasonText = priorRejectedDoc.rejectionReason
          ? ` Motivo registrado: "${priorRejectedDoc.rejectionReason}".`
          : "";

        throw new functions.https.HttpsError(
          "failed-precondition",
          `Tu solicitud anterior fue rechazada.${reasonText} Por normativa operativa, debes esperar 48 horas para presentar una nueva solicitud (tiempo restante: aprox. ${remainingHours} h). Si necesitas actualizar tus documentos o reactivar tu trámite antes, por favor comunícate con la administración.`
        );
      }
    }

    // 8. Generar identificador de solicitud
    const appId =
      data.applicationId && typeof data.applicationId === "string" && data.applicationId.startsWith("courier_app_")
        ? data.applicationId
        : `courier_app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const geo = normalizeGeoLocation(
      personal.departmentId || personal.department,
      personal.municipalityId || personal.city
    );

    const applicationDoc = {
      applicationId: appId,
      tenantId: resolvedTenantId,
      tenantSlug: resolvedTenantSlug,
      tenantName: resolvedTenantName,
      personal: {
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        fullName: `${personal.firstName.trim()} ${personal.lastName.trim()}`,
        phone: personal.phone.trim(),
        email: cleanEmail,
        departmentId: geo.departmentId,
        departmentName: geo.departmentName,
        municipalityId: geo.municipalityId,
        municipalityName: geo.municipalityName,
        department: geo.departmentName,
        city: geo.municipalityName,
        nationalId: cleanNationalId,
      },
      vehicle: {
        brand: vehicle.brand.trim(),
        model: vehicle.model.trim(),
        plate: cleanPlate,
        year: vehicle.year ? String(vehicle.year).trim() : "",
        color: vehicle.color ? vehicle.color.trim() : "",
      },
      documents: {
        idFront: documents.idFront,
        idBack: documents.idBack,
        profilePhoto: documents.profilePhoto,
        registration: documents.registration,
        insurance: documents.insurance,
        driverLicense: documents.driverLicense,
      },
      status: "PENDING_REVIEW",
      onboardingStatus: "pending_review",
      source: "WEB_PORTAL",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 9. Persistir solicitud en Firestore
    await db.collection("courier_applications").doc(appId).set(applicationDoc);

    // 10. Registrar evento de auditoría
    try {
      await db.collection("audit_events").add({
        event: "COURIER_APPLICATION_SUBMITTED",
        domain: "COURIER_ONBOARDING",
        applicationId: appId,
        tenantId: resolvedTenantId,
        candidateName: `${personal.firstName.trim()} ${personal.lastName.trim()}`,
        email: cleanEmail,
        plate: cleanPlate,
        nationalId: cleanNationalId,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (auditErr) {
      Logger.warn("[COURIER-ONBOARDING] No se pudo registrar auditoría de envío", { error: auditErr });
    }

    // 11. Dispatch correo transaccional de confirmación de recepción
    try {
      await EmailService.sendCourierApplicationReceivedEmail({
        appId,
        email: cleanEmail,
        candidateName: `${personal.firstName.trim()} ${personal.lastName.trim()}`,
        plate: cleanPlate,
        tenantId: resolvedTenantId,
      });
    } catch (emailErr: any) {
      Logger.warn("[COURIER-ONBOARDING] Error dispatching courier received email (no bloquea solicitud):", emailErr?.message);
    }

    Logger.info(`[COURIER-ONBOARDING] Solicitud creada exitosamente appId=${appId}, tenantId=${resolvedTenantId}`, {
      appId,
      tenantId: resolvedTenantId,
      email: cleanEmail,
    });

    return {
      success: true,
      applicationId: appId,
      message: "Solicitud de motorizado recibida exitosamente. Está en revisión por el equipo de Governance.",
    };
  }
);

// ─── CALLABLE: getCourierApplicationStatus ─────────────────────────────────────

/**
 * Consulta de estado público de una solicitud de motorizado por Email + Cédula o Application ID.
 */
export const getCourierApplicationStatus = functions.https.onCall(
  async (data: { email?: string; nationalId?: string; applicationId?: string }) => {
    if (!data) {
      throw new functions.https.HttpsError("invalid-argument", "Parámetros de consulta requeridos.");
    }

    let snap: FirebaseFirestore.QuerySnapshot;

    if (data.applicationId && data.applicationId.trim()) {
      const doc = await db.collection("courier_applications").doc(data.applicationId.trim()).get();
      if (!doc.exists) {
        throw new functions.https.HttpsError("not-found", "No se encontró ninguna solicitud con ese ID.");
      }
      const item = doc.data();
      return {
        applicationId: doc.id,
        status: item?.status || "UNKNOWN",
        onboardingStatus: item?.onboardingStatus || "unknown",
        createdAt: item?.createdAt || null,
        candidateName: item?.personal?.fullName || `${item?.personal?.firstName || ""} ${item?.personal?.lastName || ""}`.trim(),
        rejectionReason: item?.rejectionReason || null,
      };
    }

    if (!data.email || !data.nationalId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Se requiere correo electrónico y número de cédula para consultar el estado."
      );
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const cleanNationalId = normalizeNationalId(data.nationalId);

    snap = await db
      .collection("courier_applications")
      .where("personal.email", "==", cleanEmail)
      .where("personal.nationalId", "==", cleanNationalId)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "No se encontró ninguna solicitud que coincida con ese correo y número de cédula."
      );
    }

    const doc = snap.docs[0];
    const item = doc.data();

    return {
      applicationId: doc.id,
      status: item.status || "UNKNOWN",
      onboardingStatus: item.onboardingStatus || "unknown",
      createdAt: item.createdAt || null,
      candidateName: item.personal?.fullName || `${item.personal?.firstName || ""} ${item.personal?.lastName || ""}`.trim(),
      rejectionReason: item.rejectionReason || null,
    };
  }
);

// ─── CALLABLE: adminDeleteCourierApplication ─────────────────────────────────

/**
 * Callable HTTPS: adminDeleteCourierApplication
 * Permite a un Administrador o Supervisor eliminar/purgar definitivamente una solicitud
 * de motorizado (útil para solicitudes rechazadas, duplicadas o pruebas), liberando
 * de inmediato la cédula, correo electrónico y placa en el sistema.
 */
export const adminDeleteCourierApplication = functions.https.onCall(
  async (data: { firestoreDocId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Debes iniciar sesión con una cuenta administrativa para realizar esta operación."
      );
    }

    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isPlatformAdmin =
      token.role === "PLATFORM_ADMIN" ||
      token.admin === true ||
      token.role === "SUPER_ADMIN" ||
      token.role === "admin";

    if (!isPlatformAdmin) {
      const userDoc = await db.collection("users").doc(callerUid).get();
      const userData = userDoc.data() || {};
      const userRole = (userData.role || userData.tipo || "").toLowerCase();
      if (!["admin", "platform_admin", "super_admin", "supervisor"].includes(userRole)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Solo los administradores del sistema pueden eliminar solicitudes de motorizados."
        );
      }
    }

    if (!data || !data.firestoreDocId || typeof data.firestoreDocId !== "string" || !data.firestoreDocId.trim()) {
      throw new functions.https.HttpsError("invalid-argument", "ID de documento Firestore no válido.");
    }

    const docId = data.firestoreDocId.trim();
    const appRef = db.collection("courier_applications").doc(docId);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      throw new functions.https.HttpsError("not-found", "La solicitud de motorizado no existe en el sistema.");
    }

    const appData = appDoc.data() || {};

    // Seguridad de Datos: si la solicitud ya está aprobada y tiene un motorizado activo aprovisionado, prevenimos borrado accidental
    if (appData.status === "APPROVED" && appData.provisionedUid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Esta solicitud ya fue aprobada y tiene un motorizado activo en la flota. Por integridad de datos, gestiona el motorizado desde el módulo de Flota en lugar de purgar el expediente."
      );
    }

    // Registrar evento de auditoría formal
    try {
      await db.collection("audit_events").add({
        action: "COURIER_APPLICATION_PURGED",
        actorUid: callerUid,
        domain: "COURIER_GOVERNANCE",
        metadata: {
          applicationId: appData.applicationId || docId,
          email: appData.personal?.email,
          nationalId: appData.personal?.nationalId,
          plate: appData.vehicle?.plate,
          previousStatus: appData.status,
          candidateName: appData.personal?.fullName || `${appData.personal?.firstName || ""} ${appData.personal?.lastName || ""}`.trim(),
          purgedAt: new Date().toISOString(),
        },
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (auditErr: any) {
      Logger.warn("[COURIER-ONBOARDING] No se pudo registrar auditoría de eliminación:", { error: auditErr?.message || String(auditErr) });
    }

    // Eliminación física autoritativa vía Admin SDK
    await appRef.delete();

    Logger.info(`[COURIER-ONBOARDING] Solicitud docId=${docId} eliminada definitivamente por admin=${callerUid}`);

    return {
      success: true,
      message: "Solicitud de motorizado eliminada definitivamente. La cédula, correo y placa han sido liberados para nuevos trámites.",
    };
  }
);

