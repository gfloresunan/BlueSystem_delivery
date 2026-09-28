/**
 * BlueSystem Delivery Enterprise — Sprint 18.1
 * Trigger: Merchant Application Approved → EIAM Auto-Provisioning
 *
 * Detecta cuando /merchant_applications/{appId} cambia status a "APPROVED"
 * y ejecuta la creación atómica de todas las entidades EIAM:
 * Organization → Business → Branch → User → Membership → Claims → Audit → Invitation
 *
 * ADR-011: Merchant Onboarding Portal & Lifecycle Architecture
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { EmailService } from "../services/emailService";
import { normalizeGeoLocation } from "../domain/geo/geoCatalog";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Tipos de Datos ──────────────────────────────────────────────────────────

interface MerchantApplication {
  appId: string;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  businessName: string;
  legalName: string;
  ruc: string;
  departmentId?: string;
  departmentName?: string;
  municipalityId?: string;
  municipalityName?: string;
  address: string;
  city: string;
  zone?: string;
  category: string;
  businessCategoryId?: string;
  categoria?: string;
  contactName: string;
  phone: string;
  email: string;
  location?: admin.firestore.GeoPoint;
  documentUrls?: string[];
  status: MerchantApplicationStatus;
  rejectionReason?: string;
  docsRequestedNote?: string;
  reviewedBy?: string;
  reviewedAt?: admin.firestore.Timestamp;
  organizationId?: string;
  orgId?: string;
  businessId?: string;
  branchId?: string;
  provisionedBusinessId?: string;
  provisionedUid?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

type MerchantApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "DOCS_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "ONBOARDING"
  | "ACTIVE";

type MerchantLifecycleStatus =
  | "ONBOARDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

// ─── Helper: Generar UUID v4 ──────────────────────────────────────────────────

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Helper: Contraseña temporal segura ───────────────────────────────────────

function generateTempPassword(): string {
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ─── Helper: Enviar Email de Invitación ───────────────────────────────────────

async function sendMerchantInvitationEmail(
  appId: string,
  email: string,
  contactName: string,
  businessName: string,
  businessId: string,
  tempPassword: string,
  firestoreDocId?: string
): Promise<void> {
  let activationLink: string | undefined;
  try {
    activationLink = await admin.auth().generatePasswordResetLink(email, {
      url: "https://merchant.bluesystemdelivery.com/login",
    });
  } catch (linkErr: any) {
    Logger.warn("[MERCHANT-ONBOARDING] No se pudo generar enlace dinámico de activación Firebase Auth", { appId, email, error: linkErr?.message });
  }

  // Enviar correo transaccional real de aprobación via EmailService corporativo
  try {
    await EmailService.sendApplicationApprovedEmail({
      appId,
      firestoreDocId,
      email,
      contactName,
      businessName,
      businessId,
      tempPassword,
      activationLink,
    });
  } catch (emailErr: any) {
    Logger.warn("[MERCHANT-ONBOARDING] Error al enviar correo de aprobación corporativo (no bloquea provisión)", { appId, error: emailErr?.message });
  }

  // También guardar en /invitations/{token} para tracking EIAM
  try {
    const token = generateUUID();
    await db.collection("invitations").doc(token).set({
      token,
      email,
      businessId,
      channel: "EMAIL",
      status: "SENT",
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      ),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (invErr: any) {
    Logger.warn("[MERCHANT-ONBOARDING] Error al registrar invitación (no bloquea provisión)", { appId, error: invErr?.message });
  }

  Logger.info(`[MERCHANT-ONBOARDING] Proceso de notificación de invitación concluido para ${email}`, {
    module: "sendMerchantInvitationEmail",
    businessId,
  });
}

// ─── TRIGGER PRINCIPAL: onMerchantApplicationApproved ─────────────────────────

/**
 * Se activa cuando /merchant_applications/{appId}.status cambia a "APPROVED".
 *
 * Ejecuta la provisión completa de identidad EIAM con aislamiento estricto de Tenant:
 * 1. Firebase Auth UID
 * 2. /users/{uid} (asociado a tenantId)
 * 3. /organizations/{orgId} (asociado a tenantId)
 * 4. /businesses/{businessId} (asociado a tenantId)
 * 5. /branches/{branchId} (asociado a tenantId)
 * 6. /membership/{membershipId} y /memberships/{membershipId} (asociados a tenantId)
 * 7. Custom Claims JWT (con tenantId)
 * 8. /audit_events/{id} (asociado a tenantId)
 * 9. Invitación por email
 * 10. application.status → ONBOARDING
 */
export const onMerchantApplicationApproved = functions.firestore
  .document("merchant_applications/{appId}")
  .onUpdate(async (change, context) => {
    const appId = context.params.appId;
    const before = change.before.data() as MerchantApplication | undefined;
    const after = change.after.data() as MerchantApplication | undefined;

    // ── Guardia: Solo procesar cuando cambia a APPROVED ──────────────────────
    if (!before || !after) return null;
    if (before.status === "APPROVED" && after.status === "APPROVED") return null;
    if (after.status !== "APPROVED") return null;

    // ── Guardia de Idempotencia Estricta ─────────────────────────────────────
    if (after.provisionedBusinessId || after.provisionedUid) {
      Logger.info(
        `[MERCHANT-ONBOARDING] Solicitud appId=${appId} ya fue provisionada (provisionedBusinessId=${after.provisionedBusinessId}). Asegurando estado ONBOARDING y omitiendo re-provisión idempotente.`,
        { module: "onMerchantApplicationApproved", appId }
      );
      if (after.status === "APPROVED") {
        await change.after.ref.update({
          status: "ONBOARDING",
          updatedAt: FieldValue.serverTimestamp()
        }).catch(() => null);
      }
      return null;
    }

    const applicationRef = change.after.ref;
    const resolvedTenantId = after.tenantId || "ten_bluesystem_core";

    Logger.info(
      `[MERCHANT-ONBOARDING] Iniciando provisión EIAM para appId=${appId}, tenantId=${resolvedTenantId}`,
      { module: "onMerchantApplicationApproved", appId, tenantId: resolvedTenantId }
    );

    let uid: string | null = null;
    const orgId = after.orgId || (after as any).organizationId || generateUUID();
    const businessId = after.businessId || after.provisionedBusinessId || generateUUID();
    const branchId = after.branchId || generateUUID();
    const membershipId = generateUUID();
    const tempPassword = generateTempPassword();

    try {
      // ── Paso 1: Crear o reutilizar usuario en Firebase Auth ────────────────
      // (Fuera de la transacción porque Firebase Auth no es transaccional)
      let userRecord: admin.auth.UserRecord;
      try {
        userRecord = await admin.auth().createUser({
          email: after.email,
          displayName: after.contactName,
          password: tempPassword,
          disabled: false,
        });
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-exists" || authErr.code === "auth/uid-already-exists") {
          userRecord = await admin.auth().getUserByEmail(after.email);

          // ── Validación Multi-campo de Seguridad EIAM ────────────────────────
          const existingUserDoc = await db.collection("users").doc(userRecord.uid).get();
          if (existingUserDoc.exists) {
            const existingData = existingUserDoc.data() || {};
            const existingTenant = existingData.tenantId;
            const existingRole = (existingData.eiamRole || existingData.role || "").toUpperCase();

            // Bloquear si pertenece a otro tenant
            if (existingTenant && existingTenant !== resolvedTenantId) {
              throw new Error(`[EIAM_SECURITY_VIOLATION] El usuario ${after.email} pertenece al tenant ${existingTenant}, diferente a ${resolvedTenantId}`);
            }
            // Bloquear si es un usuario con rol de administración global
            if (["SUPER_ADMIN", "ADMIN", "AUDITOR"].includes(existingRole)) {
              throw new Error(`[EIAM_SECURITY_VIOLATION] El usuario ${after.email} tiene rol de gobernanza global (${existingRole}) y no puede ser convertido en propietario de comercio`);
            }
          }

          Logger.info(
            `[MERCHANT-ONBOARDING] Usuario Auth ya existente validado y reutilizado para ${after.email}: ${userRecord.uid}`,
            { module: "onMerchantApplicationApproved", appId, uid: userRecord.uid, tenantId: resolvedTenantId }
          );

          // Invariante de Acceso Activo: Sincronizar contraseña temporal y asegurar estado habilitado
          await admin.auth().updateUser(userRecord.uid, {
            password: tempPassword,
            disabled: false,
          });
          Logger.info(
            `[MERCHANT-ONBOARDING] Usuario Auth existente sincronizado con contraseña temporal y habilitado para ${after.email}`,
            { module: "onMerchantApplicationApproved", uid: userRecord.uid }
          );
        } else {
          throw authErr;
        }
      }
      uid = userRecord.uid;

      Logger.info(
        `[MERCHANT-ONBOARDING] Firebase Auth UID asignado: ${uid}`,
        { module: "onMerchantApplicationApproved", appId, uid, tenantId: resolvedTenantId }
      );

      // ── Pasos 2–8: Escrituras atómicas en Firestore ───────────────────────
      await db.runTransaction(async (tx) => {
        const now = FieldValue.serverTimestamp();
        const geo = normalizeGeoLocation(
          after.departmentId,
          after.municipalityId || after.city
        );

        // Paso 2: /users/{uid} — Invariante de Identidad Activa
        tx.set(db.collection("users").doc(uid!), {
          uid,
          tenantId: resolvedTenantId,
          nombre: after.contactName,
          name: after.contactName,
          email: after.email,
          telefono: after.phone,
          phone: after.phone,
          userType: "business",
          role: "business",
          rol: "business",
          eiamRole: "MERCHANT_OWNER",
          businessId,
          orgId,
          branchId,
          departmentId: geo.departmentId,
          departmentName: geo.departmentName,
          municipalityId: geo.municipalityId,
          municipalityName: geo.municipalityName,
          status: "ACTIVE",
          lifecycleStatus: "ACTIVE",
          active: true,
          isActive: true,
          isDeleted: false,
          fechaRegistro: now,
          updatedAt: now,
        }, { merge: true });

        // Paso 3: /organizations/{orgId}
        tx.set(db.collection("organizations").doc(orgId), {
          orgId,
          tenantId: resolvedTenantId,
          name: after.legalName || after.businessName,
          legalName: after.legalName,
          ruc: after.ruc,
          ownerUid: uid,
          businessIds: [businessId],
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        });

        // Paso 4: /businesses/{businessId}
        tx.set(db.collection("businesses").doc(businessId), {
          businessId,
          tenantId: resolvedTenantId,
          orgId,
          ownerUid: uid,
          name: after.businessName,
          legalName: after.legalName,
          ruc: after.ruc,
          businessCategoryId: after.businessCategoryId || (after.category ? after.category.toLowerCase() : 'restaurante'),
          category: after.category,
          categoria: after.categoria || after.category,
          departmentId: geo.departmentId,
          departmentName: geo.departmentName,
          municipalityId: geo.municipalityId,
          municipalityName: geo.municipalityName,
          address: after.address,
          city: geo.municipalityName,
          zone: after.zone || "",
          location: after.location || null,
          phone: after.phone,
          email: after.email,
          documentUrls: after.documentUrls || [],
          // Ciclo de vida
          status: "ACTIVE",
          lifecycleStatus: "ONBOARDING" as MerchantLifecycleStatus,
          wizardCompleted: false,
          onboardingStep: 0,
          applicationId: appId,
          // Operaciones
          isOpen: false,
          isActive: true,
          active: true,
          branchIds: [branchId],
          createdAt: now,
          updatedAt: now,
        });

        // Paso 5: /branches/{branchId} — Sucursal Principal
        tx.set(db.collection("branches").doc(branchId), {
          branchId,
          tenantId: resolvedTenantId,
          businessId,
          orgId,
          name: "Sucursal Principal",
          departmentId: geo.departmentId,
          departmentName: geo.departmentName,
          municipalityId: geo.municipalityId,
          municipalityName: geo.municipalityName,
          address: after.address,
          city: geo.municipalityName,
          zone: after.zone || "",
          location: after.location || null,
          phone: after.phone,
          isPrimary: true,
          isActive: true,
          employeeIds: [],
          createdAt: now,
          updatedAt: now,
        });

        // Paso 5.5: /restaurant_settings/{businessId} — Configuración Operativa Privada (SSOT-01 Compliance)
        tx.set(db.collection("restaurant_settings").doc(businessId), {
          restaurantId: businessId,
          tenantId: resolvedTenantId,
          commercialName: after.businessName,
          legalName: after.legalName || after.businessName,
          phone: after.phone,
          email: after.email,
          businessCategoryId: after.businessCategoryId || (after.category ? after.category.toLowerCase() : 'restaurante'),
          category: after.category,
          categoria: after.categoria || after.category,
          departmentId: geo.departmentId,
          departmentName: geo.departmentName,
          municipalityId: geo.municipalityId,
          municipalityName: geo.municipalityName,
          address: after.address,
          city: geo.municipalityName,
          zone: after.zone || "",
          isOpen: false,
          deliveryFee: 0,
          maxDeliveryRadiusKm: 5,
          kitchenPrepTimeMinutes: 15,
          autoAcceptOrders: false,
          printReceiptOnOrder: false,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });

        // Paso 6: /membership/{membershipId} (Legacy) y /memberships/{membershipId} (V3)
        const membershipPayload = {
          membershipId,
          uid,
          tenantId: resolvedTenantId,
          businessId,
          orgId,
          branchId,
          role: "MERCHANT_OWNER",
          status: "ACTIVE",
          permissions: [
            "VIEW_ORDERS",
            "MANAGE_ORDERS",
            "VIEW_MENU",
            "MANAGE_MENU",
            "VIEW_FINANCE",
            "EXPORT_REPORT",
            "MANAGE_EMPLOYEES",
            "MANAGE_SETTINGS",
            "VIEW_ANALYTICS",
            "CLOSE_CASH_REGISTER",
          ],
          createdAt: now,
          updatedAt: now,
        };
        tx.set(db.collection("membership").doc(membershipId), membershipPayload);
        tx.set(db.collection("memberships").doc(membershipId), {
          ...membershipPayload,
          schemaVersion: "3.0",
        });

        // Paso 7: /audit_events/{auto}
        tx.set(db.collection("audit_events").doc(), {
          event: "BUSINESS_CREATED",
          domain: "IDENTITY",
          uid,
          tenantId: resolvedTenantId,
          businessId,
          orgId,
          branchId,
          membershipId,
          applicationId: appId,
          triggeredBy: after.reviewedBy || "SYSTEM",
          metadata: {
            businessName: after.businessName,
            email: after.email,
            category: after.category,
            tenantId: resolvedTenantId,
          },
          timestamp: now,
        });

        // Paso 8: Actualizar la application → ONBOARDING con IDs provisionados
        tx.update(applicationRef, {
          status: "ONBOARDING",
          tenantId: resolvedTenantId,
          provisionedUid: uid,
          provisionedBusinessId: businessId,
          updatedAt: now,
        });
      });

      Logger.info(
        `[MERCHANT-ONBOARDING] Transacción Firestore completada para appId=${appId}, tenantId=${resolvedTenantId}`,
        { module: "onMerchantApplicationApproved", uid, businessId, orgId, branchId, tenantId: resolvedTenantId }
      );

      // ── Paso 9: Custom Claims JWT con Tenant Context (fuera de transacción) ─
      await admin.auth().setCustomUserClaims(uid, {
        role: "OWNER",
        tenantId: resolvedTenantId,
        businessId,
        orgId,
        branchId,
        eiamVer: 3,
      });

      Logger.info(
        `[MERCHANT-ONBOARDING] Custom Claims JWT canónicos (OWNER) asignados para uid=${uid} (tenantId=${resolvedTenantId})`,
        { module: "onMerchantApplicationApproved", uid, tenantId: resolvedTenantId }
      );

      // ── Paso 10: Enviar invitación por email (No-bloqueante) ───────────────
      try {
        const publicAppId = after.appId || appId;
        await sendMerchantInvitationEmail(
          publicAppId,
          after.email,
          after.contactName,
          after.businessName,
          businessId,
          tempPassword,
          appId // firestoreDocId
        );
      } catch (emailErr: any) {
        Logger.warn("[MERCHANT-ONBOARDING] No se pudo enviar el correo de bienvenida", { appId, error: emailErr?.message });
      }

      // ── Paso 11: Notificar al admin que la provisión fue exitosa ──────────
      try {
        await db.collection("admin_notifications").add({
          type: "MERCHANT_PROVISIONED",
          title: "✅ Comercio Provisionado",
          body: `${after.businessName} ha sido configurado exitosamente. ID: ${businessId}`,
          applicationId: appId,
          businessId,
          uid,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (notifErr: any) {
        Logger.warn("[MERCHANT-ONBOARDING] No se pudo crear notificación administrativa", { appId, error: notifErr?.message });
      }

      Logger.info(
        `[MERCHANT-ONBOARDING] Provisión EIAM completa. ` +
          `appId=${appId} | uid=${uid} | businessId=${businessId} | orgId=${orgId} | branchId=${branchId}`,
        { module: "onMerchantApplicationApproved" }
      );

      return null;

    } catch (error: any) {
      Logger.error(
        `[MERCHANT-ONBOARDING] Error crítico en provisión EIAM. appId=${appId}`,
        error,
        { module: "onMerchantApplicationApproved", appId }
      );

      // ── Rollback: Eliminar el usuario de Firebase Auth si la transacción falló ──
      if (uid) {
        try {
          await admin.auth().deleteUser(uid);
          Logger.info(
            `[MERCHANT-ONBOARDING] Rollback: Firebase Auth UID ${uid} eliminado`,
            { module: "onMerchantApplicationApproved" }
          );
        } catch (rollbackError: any) {
          Logger.error(
            `[MERCHANT-ONBOARDING] Error en rollback de Firebase Auth uid=${uid}`,
            rollbackError,
            { module: "onMerchantApplicationApproved" }
          );
        }
      }

      // Marcar la application como FAILED (NUNCA APPROVED para evitar loop recursivo)
      try {
        await applicationRef.update({
          status: "FAILED",
          provisioningError: error.message || "Error desconocido en provisión EIAM",
          provisioningErrorAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (updateError: any) {
        Logger.error(
          "[MERCHANT-ONBOARDING] Error actualizando estado de error en application",
          updateError,
          { module: "onMerchantApplicationApproved" }
        );
      }

      return null;
    }
  });

// ─── TRIGGER SECUNDARIO: onMerchantApplicationStatusChanged ───────────────────

/**
 * Notifica al solicitante sobre cada cambio de estado en su solicitud.
 * Estados que generan notificación: UNDER_REVIEW, DOCS_REQUESTED, REJECTED
 */
export const onMerchantApplicationStatusChanged = functions.firestore
  .document("merchant_applications/{appId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as MerchantApplication | undefined;
    const after = change.after.data() as MerchantApplication | undefined;

    if (!before || !after) return null;
    if (before.status === after.status) return null;

    // No re-procesar APPROVED (ya lo maneja onMerchantApplicationApproved)
    // No notificar cambio a ONBOARDING/ACTIVE (son automáticos internos)
    const notifiableStatuses: MerchantApplicationStatus[] = [
      "UNDER_REVIEW",
      "DOCS_REQUESTED",
      "REJECTED",
    ];

    if (!notifiableStatuses.includes(after.status)) return null;

    const firestoreDocId = context.params.appId;
    const publicAppId = after.appId || firestoreDocId;

    if (after.status === "REJECTED") {
      await EmailService.sendApplicationRejectedEmail({
        appId: publicAppId,
        firestoreDocId,
        email: after.email,
        contactName: after.contactName,
        businessName: after.businessName,
        rejectionReason: after.rejectionReason || undefined,
      });
    } else if (after.status === "DOCS_REQUESTED") {
      await EmailService.sendDocsRequestedEmail({
        appId: publicAppId,
        firestoreDocId,
        email: after.email,
        contactName: after.contactName,
        businessName: after.businessName,
        docsNote: after.docsRequestedNote || undefined,
      });
    }

    Logger.info(
      `[MERCHANT-ONBOARDING] Notificación enviada al solicitante. status=${after.status}, email=${after.email}`,
      { module: "onMerchantApplicationStatusChanged", appId: firestoreDocId }
    );

    return null;
  });
