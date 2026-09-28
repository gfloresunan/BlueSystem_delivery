/**
 * BlueSystem Delivery Enterprise — Courier Onboarding & Verification
 * Triggers: Courier Application Approved & Status Changed
 *
 * Aprovisionamiento atómico e idempotente de motorizados:
 * /courier_applications/{appId} (APPROVED) ──> Firebase Auth + /users/{uid} + /couriers/{uid} + Claims + /audit_events
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { normalizeGeoLocation } from "../domain/geo/geoCatalog";
import { EmailService } from "../services/emailService";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CourierApplicationDoc {
  applicationId: string;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  personal: {
    firstName: string;
    lastName: string;
    fullName: string;
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
    year?: string;
    color?: string;
  };
  documents: Record<string, any>;
  status: "PENDING_REVIEW" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DOCS_REQUESTED";
  onboardingStatus?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: admin.firestore.Timestamp;
  provisionedUid?: string;
  provisionedCourierId?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// ─── Helper: Generar contraseña temporal segura ───────────────────────────────

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ─── TRIGGER: onCourierApplicationApproved ────────────────────────────────────

/**
 * Detecta cuando una solicitud pasa a status = "APPROVED" y ejecuta el aprovisionamiento
 * atómico e idempotente dentro del dominio Courier y Users existente con aislamiento de Tenant.
 */
export const onCourierApplicationApproved = functions.firestore
  .document("courier_applications/{appId}")
  .onUpdate(async (change, context) => {
    const appId = context.params.appId;
    const before = change.before.data() as CourierApplicationDoc | undefined;
    const after = change.after.data() as CourierApplicationDoc | undefined;

    if (!before || !after) return null;

    // Guardia 1: Solo actuar en la transición hacia APPROVED
    if (before.status === "APPROVED") return null;
    if (after.status !== "APPROVED") return null;

    // Guardia 2: Idempotencia estricta — si ya fue provisionado, no duplicar
    if (after.provisionedUid && after.provisionedCourierId) {
      Logger.info(`[COURIER-ONBOARDING] Solicitud appId=${appId} ya fue provisionada previamente. Omitiendo.`, {
        appId,
        uid: after.provisionedUid,
      });
      return null;
    }

    const resolvedTenantId = after.tenantId || "ten_bluesystem_core";

    Logger.info(`[COURIER-ONBOARDING] Iniciando aprovisionamiento de motorizado para appId=${appId}, tenantId=${resolvedTenantId}`, {
      appId,
      tenantId: resolvedTenantId,
      email: after.personal.email,
      plate: after.vehicle.plate,
    });

    let uid: string;
    const tempPassword = generateTempPassword();

    try {
      // 1. Resolver o Crear usuario en Firebase Auth
      let existingAuthUser: admin.auth.UserRecord | null = null;
      try {
        existingAuthUser = await admin.auth().getUserByEmail(after.personal.email);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") {
          throw err;
        }
      }

      if (existingAuthUser) {
        uid = existingAuthUser.uid;
        Logger.info(`[COURIER-ONBOARDING] Usuario Firebase Auth existente encontrado: ${uid}`, { appId, uid, tenantId: resolvedTenantId });

        // Invariante de Acceso Activo: Sincronizar contraseña temporal y asegurar estado habilitado
        await admin.auth().updateUser(uid, {
          password: tempPassword,
          disabled: false,
        });
        Logger.info(`[COURIER-ONBOARDING] Usuario Auth existente sincronizado con contraseña temporal y habilitado para ${after.personal.email}`, { appId, uid });
      } else {
        const newUser = await admin.auth().createUser({
          email: after.personal.email,
          displayName: after.personal.fullName,
          password: tempPassword,
          disabled: false,
        });
        uid = newUser.uid;
        Logger.info(`[COURIER-ONBOARDING] Nuevo usuario Firebase Auth creado: ${uid}`, { appId, uid, tenantId: resolvedTenantId });
      }

      // 1.5. Resolver URL pública de Foto de Perfil
      let resolvedPhotoUrl = after.documents?.profilePhoto?.downloadUrl || "";
      const profileStoragePath = after.documents?.profilePhoto?.storagePath;

      if (!resolvedPhotoUrl && profileStoragePath) {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(profileStoragePath);
          const [exists] = await file.exists();
          if (exists) {
            const [metadata] = await file.getMetadata();
            let token = metadata.metadata?.firebaseStorageDownloadTokens;
            if (!token) {
              const crypto = require("crypto");
              token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
              await file.setMetadata({
                metadata: { firebaseStorageDownloadTokens: token },
              });
            }
            resolvedPhotoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(profileStoragePath)}?alt=media&token=${token}`;
          }
        } catch (storageErr: any) {
          Logger.warn("[COURIER-ONBOARDING] No se pudo resolver token público de Storage para foto de perfil:", {
            error: storageErr?.message,
          });
        }
      }

      // Sincronizar photoURL en Firebase Auth si está disponible
      if (resolvedPhotoUrl) {
        try {
          await admin.auth().updateUser(uid, { photoURL: resolvedPhotoUrl });
          Logger.info(`[COURIER-ONBOARDING] photoURL sincronizado en Firebase Auth para ${after.personal.email}`, { uid, resolvedPhotoUrl });
        } catch (authPhotoErr: any) {
          Logger.warn("[COURIER-ONBOARDING] No se pudo actualizar photoURL en Firebase Auth:", { error: authPhotoErr?.message });
        }
      }

      // 2. Transacción Atómica en Firestore
      await db.runTransaction(async (tx) => {
        const now = FieldValue.serverTimestamp();
        const userRef = db.collection("users").doc(uid);
        const courierRef = db.collection("couriers").doc(uid);
        const appRef = db.collection("courier_applications").doc(appId);

        const geo = normalizeGeoLocation(
          after.personal.departmentId || after.personal.department,
          after.personal.municipalityId || after.personal.city
        );

        // A) /users/{uid} — Identidad canónica con Tenant Context
        tx.set(
          userRef,
          {
            uid,
            tenantId: resolvedTenantId,
            name: after.personal.fullName,
            nombre: after.personal.fullName,
            email: after.personal.email,
            phone: after.personal.phone,
            telefono: after.personal.phone,
            photoUrl: resolvedPhotoUrl || "",
            photoURL: resolvedPhotoUrl || "",
            fotoUrl: resolvedPhotoUrl || "",
            profilePhotoUrl: resolvedPhotoUrl || "",
            profilePhotoStoragePath: profileStoragePath || "",
            userType: "driver",
            role: "courier",
            rol: "courier",
            eiamRole: "DRIVER",
            nationalId: after.personal.nationalId,
            departmentId: geo.departmentId,
            departmentName: geo.departmentName,
            municipalityId: geo.municipalityId,
            municipalityName: geo.municipalityName,
            cityId: geo.municipalityId,
            city: geo.municipalityName,
            vehicleBrand: after.vehicle.brand,
            vehicleModel: after.vehicle.model,
            vehiclePlate: after.vehicle.plate,
            vehicleYear: after.vehicle.year || "",
            vehicleColor: after.vehicle.color || "",
            placa: after.vehicle.plate,
            active: true,
            isActive: true,
            isApproved: true,
            approvalStatus: "APPROVED",
            identityOrigin: "ONBOARDING_PORTAL",
            createdVia: "ONBOARDING_PORTAL",
            applicationId: appId,
            updatedAt: now,
          },
          { merge: true }
        );

        // B) /couriers/{uid} — Dominio canónico de motorizados con Tenant Context
        // REGLA CRÍTICA: isAvailable = false (la aprobación documental NO activa disponibilidad operativa)
        tx.set(
          courierRef,
          {
            courierId: uid,
            tenantId: resolvedTenantId,
            name: after.personal.fullName,
            phone: after.personal.phone,
            email: after.personal.email,
            photoUrl: resolvedPhotoUrl || "",
            photoURL: resolvedPhotoUrl || "",
            fotoUrl: resolvedPhotoUrl || "",
            profilePhotoUrl: resolvedPhotoUrl || "",
            profilePhotoStoragePath: profileStoragePath || "",
            nationalId: after.personal.nationalId,
            departmentId: geo.departmentId,
            departmentName: geo.departmentName,
            municipalityId: geo.municipalityId,
            municipalityName: geo.municipalityName,
            cityId: geo.municipalityId,
            city: geo.municipalityName,
            vehicle: {
              brand: after.vehicle.brand,
              model: after.vehicle.model,
              plate: after.vehicle.plate,
              year: after.vehicle.year || "",
              color: after.vehicle.color || "",
            },
            plate: after.vehicle.plate,
            vehicleBrand: after.vehicle.brand,
            vehicleModel: after.vehicle.model,
            vehicleYear: after.vehicle.year || "",
            vehicleColor: after.vehicle.color || "",
            isAvailable: false,
            isActive: true,
            isApproved: true,
            approvalStatus: "APPROVED",
            onboardingStatus: "approved",
            applicationId: appId,
            approvedBy: after.reviewedBy || "ADMIN",
            approvedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        // C) /courier_applications/{appId} — Marcado de aprovisionamiento
        tx.update(appRef, {
          provisionedUid: uid,
          provisionedCourierId: uid,
          tenantId: resolvedTenantId,
          status: "APPROVED",
          onboardingStatus: "approved",
          updatedAt: now,
        });

        // D) /audit_events — Auditoría inmutable de plataforma
        const auditRef = db.collection("audit_events").doc();
        tx.set(auditRef, {
          event: "COURIER_APPLICATION_APPROVED",
          domain: "COURIER_ONBOARDING",
          uid,
          courierId: uid,
          tenantId: resolvedTenantId,
          applicationId: appId,
          triggeredBy: after.reviewedBy || "ADMIN",
          metadata: {
            candidateName: after.personal.fullName,
            email: after.personal.email,
            plate: after.vehicle.plate,
            nationalId: after.personal.nationalId,
            tenantId: resolvedTenantId,
          },
          timestamp: now,
        });
      });

      // 3. Asignación Canónica de Custom Claims JWT con Tenant Context
      await admin.auth().setCustomUserClaims(uid, {
        role: "courier",
        userType: "driver",
        eiamRole: "DRIVER",
        tenantId: resolvedTenantId,
        isApproved: true,
        eiamVer: 3,
      });

      // 4. Dispatch Correo Transaccional de Aprobación de Motorizado
      try {
        await EmailService.sendCourierApplicationApprovedEmail({
          appId,
          email: after.personal.email,
          candidateName: after.personal.fullName,
          plate: after.vehicle.plate,
          courierId: uid,
          tempPassword,
          tenantId: resolvedTenantId,
        });
      } catch (emailErr: any) {
        Logger.warn("[COURIER-ONBOARDING] Error enviando correo de aprobación (no bloquea provisión):", emailErr?.message);
      }

      Logger.info(`[COURIER-ONBOARDING] Aprovisionamiento EIAM completado exitosamente para motorizado uid=${uid}, tenantId=${resolvedTenantId}`, {
        appId,
        uid,
        tenantId: resolvedTenantId,
      });

      return { success: true, uid };
    } catch (error: any) {
      Logger.error(`[COURIER-ONBOARDING] Error crítico aprovisionando motorizado appId=${appId}`, {
        appId,
        error: error?.message || error,
      });
      throw error;
    }
  });

// ─── TRIGGER: onCourierApplicationStatusChanged ───────────────────────────────

/**
 * Registra auditoría y trazabilidad en cambios de estado (REJECTED, UNDER_REVIEW, DOCS_REQUESTED).
 */
export const onCourierApplicationStatusChanged = functions.firestore
  .document("courier_applications/{appId}")
  .onUpdate(async (change, context) => {
    const appId = context.params.appId;
    const before = change.before.data() as CourierApplicationDoc | undefined;
    const after = change.after.data() as CourierApplicationDoc | undefined;

    if (!before || !after) return null;
    if (before.status === after.status) return null;

    Logger.info(`[COURIER-ONBOARDING] Cambio de estado en solicitud appId=${appId}: ${before.status} -> ${after.status}`, {
      appId,
      oldStatus: before.status,
      newStatus: after.status,
      rejectionReason: after.rejectionReason,
    });

    const eventName =
      after.status === "REJECTED"
        ? "COURIER_APPLICATION_REJECTED"
        : after.status === "UNDER_REVIEW"
        ? "COURIER_APPLICATION_UNDER_REVIEW"
        : after.status === "DOCS_REQUESTED"
        ? "COURIER_APPLICATION_DOCS_REQUESTED"
        : "COURIER_APPLICATION_STATUS_CHANGED";

    if (after.status === "REJECTED" && after.personal?.email) {
      try {
        await EmailService.sendCourierApplicationRejectedEmail({
          appId,
          email: after.personal.email,
          candidateName: after.personal?.fullName || "Aspirante",
          rejectionReason: after.rejectionReason || undefined,
          tenantId: after.tenantId || "ten_bluesystem_core",
        });
      } catch (emailErr: any) {
        Logger.warn("[COURIER-ONBOARDING] Error enviando correo de rechazo motorizado:", emailErr?.message);
      }
    }

    try {
      await db.collection("audit_events").add({
        event: eventName,
        domain: "COURIER_ONBOARDING",
        applicationId: appId,
        previousStatus: before.status,
        newStatus: after.status,
        rejectionReason: after.rejectionReason || null,
        reviewedBy: after.reviewedBy || "SYSTEM",
        candidateName: after.personal?.fullName || "Aspirante",
        email: after.personal?.email || "",
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (auditErr) {
      Logger.warn("[COURIER-ONBOARDING] Error registrando auditoría de cambio de estado", { error: auditErr });
    }

    return null;
  });
