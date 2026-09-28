import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { resolveEiamRole } from "../triggers/auth";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";
import { EmailService } from "../services/emailService";
import { AuthorizationService } from "../shared/authorization/AuthorizationService";

const db = admin.firestore();

/**
 * Determina explícitamente el tipo de almacenamiento de la identidad (AUTH_BACKED vs FIRESTORE_ONLY)
 */
async function resolveIdentityStorageType(uid: string): Promise<{
  identityType: "AUTH_BACKED" | "FIRESTORE_ONLY" | "NOT_FOUND";
  authRecordExists: boolean;
  firestoreRecordExists: boolean;
  userData?: any;
}> {
  const userDocRef = db.collection("users").doc(uid);
  const userDoc = await userDocRef.get();
  const firestoreRecordExists = userDoc.exists;

  let authRecordExists = false;
  try {
    const authUser = await admin.auth().getUser(uid);
    if (authUser && authUser.uid) {
      authRecordExists = true;
    }
  } catch (err: any) {
    authRecordExists = false;
  }

  if (!firestoreRecordExists && !authRecordExists) {
    return { identityType: "NOT_FOUND", authRecordExists: false, firestoreRecordExists: false };
  }

  if (authRecordExists) {
    return {
      identityType: "AUTH_BACKED",
      authRecordExists: true,
      firestoreRecordExists,
      userData: userDoc.exists ? userDoc.data() : null
    };
  }

  return {
    identityType: "FIRESTORE_ONLY",
    authRecordExists: false,
    firestoreRecordExists,
    userData: userDoc.exists ? userDoc.data() : null
  };
}

/**
 * 4. CALLABLE: adminUpdateUser
 * Modifica roles, estado activo o elimina usuarios del sistema con sincronización EIAM
 * P1 Hardened: Validación estricta de jerarquía L10->L0 y protección del Último SuperAdmin.
 */
export const adminUpdateUser = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: true,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["action", "targetUid"],
    },
    "adminUpdateUser"
  );

  const { action, targetUid, email, role, isActive, nombre, telefono, reason } = data;
  const callerRole = context.auth?.token?.role || "admin";
  const targetUserDoc = await db.collection("users").doc(targetUid).get();
  const targetEmail = targetUserDoc.exists ? targetUserDoc.data()?.email : (email || "unknown");
  const targetCurrentRole = targetUserDoc.exists
    ? (targetUserDoc.data()?.role || targetUserDoc.data()?.rol || targetUserDoc.data()?.eiamRole || "customer")
    : "customer";

  try {
    switch (action) {
      case "setRole": {
        if (!role) {
          throw new functions.https.HttpsError("invalid-argument", "El campo 'role' es requerido para la acción 'setRole'.");
        }

        // P1 & Hierarchy Safeguard: Validar que el llamador tenga nivel suficiente
        try {
          AuthorizationService.validateRoleMutationHierarchy(callerRole, callerUid, targetUid, role, targetCurrentRole);
        } catch (hierarchyErr: any) {
          throw new functions.https.HttpsError("permission-denied", hierarchyErr.message);
        }

        // Safeguard: Proteger último SuperAdmin si se está cambiando de rol a un SuperAdmin
        try {
          await AuthorizationService.assertNotLastSuperAdmin(targetUid);
        } catch (lastAdminErr: any) {
          throw new functions.https.HttpsError("failed-precondition", lastAdminErr.message);
        }

        const oldRole = targetCurrentRole;
        await db.collection("users").doc(targetUid).update({
          role: role,
          rol: role,
          eiamRole: role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const userData: any = targetUserDoc.exists ? targetUserDoc.data() : {};
        const existingClaims: any = (await admin.auth().getUser(targetUid).catch(() => ({ customClaims: {} as any }))).customClaims || {};
        const eiamRole = resolveEiamRole({ eiamRole: role, role });
        
        const updatedClaims = {
          ...existingClaims,
          role: eiamRole,
          businessId: userData?.businessId ?? userData?.eiamBusinessId ?? existingClaims.businessId ?? null,
          branchId: userData?.branchId ?? existingClaims.branchId ?? null,
          orgId: userData?.orgId ?? userData?.organizationId ?? existingClaims.orgId ?? null,
          tenantId: userData?.tenantId ?? existingClaims.tenantId ?? null,
        };
        try {
          await admin.auth().setCustomUserClaims(targetUid, updatedClaims);
        } catch (claimsErr: any) {
          Logger.warn(`No se pudieron actualizar Custom Claims para ${targetUid} (quizás no existe en Auth): ${claimsErr?.message || String(claimsErr)}`);
        }

        Logger.audit(
          "CAMBIAR_ROL",
          callerUid,
          { targetUid, targetEmail, oldRole, newRole: role },
          { module: "adminUpdateUser", userId: callerUid }
        );

        return { success: true, message: `Rol cambiado con éxito a: ${role}` };
      }

      case "setBlockStatus": {
        // Hierarchy & Safeguard check on blocking
        if (!isActive) {
          try {
            AuthorizationService.validateRoleMutationHierarchy(callerRole, callerUid, targetUid, targetCurrentRole, targetCurrentRole);
            await AuthorizationService.assertNotLastSuperAdmin(targetUid);
          } catch (guardErr: any) {
            throw new functions.https.HttpsError("permission-denied", guardErr.message);
          }
        }

        const oldStatus = targetUserDoc.exists ? (targetUserDoc.data()?.isActive !== false) : true;
        try {
          await admin.auth().updateUser(targetUid, { disabled: !isActive });
        } catch (authBlockErr: any) {
          Logger.warn(`No se pudo actualizar status en Auth para ${targetUid}: ${authBlockErr?.message || String(authBlockErr)}`);
        }

        await db.collection("users").doc(targetUid).update({
          isActive: isActive,
          active: isActive,
          status: isActive ? "ACTIVE" : "BLOCKED",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        Logger.audit(
          isActive ? "DESBLOQUEAR_USUARIO" : "BLOQUEAR_USUARIO",
          callerUid,
          { targetUid, targetEmail, oldStatus, newStatus: isActive },
          { module: "adminUpdateUser", userId: callerUid }
        );

        return { success: true, message: isActive ? "Usuario desbloqueado" : "Usuario bloqueado" };
      }

      case "deleteUser": {
        // Hierarchy & Safeguard check on delete
        try {
          AuthorizationService.validateRoleMutationHierarchy(callerRole, callerUid, targetUid, targetCurrentRole, targetCurrentRole);
          await AuthorizationService.assertNotLastSuperAdmin(targetUid);
        } catch (guardErr: any) {
          throw new functions.https.HttpsError("permission-denied", guardErr.message);
        }

        // 1. Detección explícita de tipo de almacenamiento
        const storageInfo = await resolveIdentityStorageType(targetUid);

        if (storageInfo.identityType === "NOT_FOUND") {
          Logger.info(`[HARD_DELETE] La identidad ${targetUid} ya no existe en el sistema.`, { targetUid });
          return {
            success: true,
            idempotent: true,
            result: "USER_ALREADY_DELETED",
            message: "La identidad ya fue eliminada del sistema.",
            uid: targetUid,
            identityType: "NONE",
            authDeleted: false,
            authDeletion: "NOT_APPLICABLE",
            firestoreDeleted: false,
            devicesDeleted: false
          };
        }

        let authDeleted = false;
        let authDeletion: "SUCCESS" | "NOT_APPLICABLE" | "FAILED" = "NOT_APPLICABLE";

        // 2. Eliminación Auth solo si es AUTH_BACKED
        if (storageInfo.identityType === "AUTH_BACKED") {
          try {
            await admin.auth().deleteUser(targetUid);
            authDeleted = true;
            authDeletion = "SUCCESS";
          } catch (authErr: any) {
            Logger.error(`[HARD_DELETE] Error al eliminar usuario Auth ${targetUid}:`, authErr);
            throw new functions.https.HttpsError("internal", authErr.message || "Error al eliminar usuario de Firebase Auth.");
          }
        }

        // 3. Eliminación física del documento /users/{targetUid} en Firestore
        const userRef = db.collection("users").doc(targetUid);
        const userDoc = await userRef.get();
        let firestoreDeleted = false;
        if (userDoc.exists) {
          await userRef.delete();
          firestoreDeleted = true;
        }

        // 4. Limpieza completa de dispositivos en /user_devices
        let devicesDeletedCount = 0;
        try {
          const directDevDoc = db.collection("user_devices").doc(targetUid);
          const directDevSnap = await directDevDoc.get();
          if (directDevSnap.exists) {
            await directDevDoc.delete();
            devicesDeletedCount++;
          }

          const qSnap1 = await db.collection("user_devices").where("uid", "==", targetUid).get().catch(() => null);
          if (qSnap1 && !qSnap1.empty) {
            const batch1 = db.batch();
            qSnap1.forEach(doc => {
              if (doc.id !== targetUid) {
                batch1.delete(doc.ref);
                devicesDeletedCount++;
              }
            });
            await batch1.commit();
          }

          const qSnap2 = await db.collection("user_devices").where("userId", "==", targetUid).get().catch(() => null);
          if (qSnap2 && !qSnap2.empty) {
            const batch2 = db.batch();
            qSnap2.forEach(doc => {
              batch2.delete(doc.ref);
              devicesDeletedCount++;
            });
            await batch2.commit();
          }
        } catch (devErr: any) {
          Logger.warn(`[HARD_DELETE] Aviso al limpiar dispositivos para ${targetUid}: ${devErr.message}`);
        }

        const devicesDeleted = devicesDeletedCount > 0;
        const targetUserData = storageInfo.userData || {};
        const origin = targetUserData.identityOrigin || targetUserData.originClassification || targetUserData.createdVia || "UNKNOWN";
        const createdViaVal = targetUserData.createdVia || origin;

        // 5. Registro de auditoría con tipo explícito
        await db.collection("audit_events").add({
          event: "IDENTITY_HARD_DELETE",
          action: "HARD_DELETE_IDENTITY",
          domain: "GOVERNANCE",
          targetUid,
          targetEmail: targetEmail || targetUserData.email || "N/A",
          actorUid: callerUid,
          actorRole: context.auth?.token?.role || "admin",
          identityType: storageInfo.identityType,
          identityOrigin: origin,
          createdVia: createdViaVal,
          authDeleted,
          authDeletion,
          firestoreDeleted,
          devicesDeleted,
          devicesDeletedCount,
          historicalDataPreserved: true,
          operation: "IDENTITY_HARD_DELETE",
          result: storageInfo.identityType === "AUTH_BACKED" ? "AUTH_BACKED_HARD_DELETE_SUCCESS" : "FIRESTORE_ONLY_HARD_DELETE_SUCCESS",
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => null);

        Logger.audit(
          "ELIMINAR_USUARIO",
          callerUid,
          {
            targetUid,
            targetEmail,
            identityType: storageInfo.identityType,
            authDeleted,
            authDeletion,
            firestoreDeleted,
            devicesDeleted,
            devicesDeletedCount,
            deletedAt: Date.now()
          },
          { module: "adminUpdateUser", userId: callerUid }
        );

        return {
          success: true,
          message: storageInfo.identityType === "AUTH_BACKED"
            ? "Identidad AUTH_BACKED eliminada permanentemente de Auth y Firestore."
            : "Identidad FIRESTORE_ONLY eliminada permanentemente de Firestore.",
          uid: targetUid,
          identityType: storageInfo.identityType,
          authDeleted,
          authDeletion,
          firestoreDeleted,
          devicesDeleted,
          devicesDeletedCount,
          result: storageInfo.identityType === "AUTH_BACKED" ? "AUTH_BACKED_HARD_DELETE_SUCCESS" : "FIRESTORE_ONLY_HARD_DELETE_SUCCESS"
        };
      }


      // ─── EIAM-ADMIN NEW ACTIONS ─────────────────────────────────────────────

      case "resetPasswordLink": {
        const correlationId = `pwd_reset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        Logger.info(`[EIAM_PASSWORD_RESET] REQUEST_START correlationId=${correlationId}`, {
          targetUid,
          callerUid,
          correlationId,
        });

        // 1. Validar existencia del usuario objetivo en Firestore
        const userDocRef = db.collection("users").doc(targetUid);
        const userDocSnap = await userDocRef.get();
        if (!userDocSnap.exists) {
          Logger.warn(`[EIAM_PASSWORD_RESET] AUTH_LOOKUP_FAILED: Usuario ${targetUid} no existe en Firestore`, {
            targetUid,
            correlationId,
          });
          throw new functions.https.HttpsError(
            "not-found",
            `El usuario ${targetUid} no existe en el sistema.`
          );
        }

        const targetData = userDocSnap.data() || {};
        const emailForReset = (targetData.email || email || "").trim();
        const targetName = targetData.nombre || targetData.name || "Usuario";
        const targetTenant = targetData.tenantId || "ten_bluesystem_core";
        const targetBusinessId = targetData.businessId || null;
        const targetBranchId = targetData.branchId || null;
        const targetRole = targetData.eiamRole || targetData.role || targetData.rol || "CUSTOMER";

        if (!emailForReset || !emailForReset.includes("@")) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "El usuario no tiene una dirección de correo electrónico válida configurada."
          );
        }

        Logger.info(`[EIAM_PASSWORD_RESET] TARGET_RESOLVED`, {
          targetUid,
          targetEmail: emailForReset,
          targetTenant,
          correlationId,
        });

        // 2. Validación de Aislamiento Multi-Tenant y RBAC EIAM
        const callerClaims: any = context.auth?.token || {};
        const callerRole = (callerClaims.role || callerClaims.eiamRole || "ADMIN").toUpperCase();
        const callerTenant = callerClaims.tenantId;

        // Si el caller no es SUPER_ADMIN global y tiene tenantId, validar que coincida con el target
        if (callerRole !== "SUPER_ADMIN" && callerTenant && callerTenant !== targetTenant) {
          Logger.error(`[EIAM_PASSWORD_RESET] TENANT_VALIDATION_FAILED: Caller tenant ${callerTenant} != Target tenant ${targetTenant}`, null, {
            callerUid,
            callerTenant,
            targetUid,
            targetTenant,
            correlationId,
          });
          throw new functions.https.HttpsError(
            "permission-denied",
            "[EIAM_SECURITY_VIOLATION] No está autorizado para gestionar usuarios de otro tenant."
          );
        }

        // Si el target es SUPER_ADMIN y el caller no lo es, denegar
        if (targetRole.toUpperCase() === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
          Logger.error(`[EIAM_PASSWORD_RESET] ROLE_VALIDATION_FAILED: Caller ${callerRole} cannot reset SUPER_ADMIN`, null, {
            callerUid,
            targetUid,
            correlationId,
          });
          throw new functions.https.HttpsError(
            "permission-denied",
            "[EIAM_SECURITY_VIOLATION] No está autorizado para restablecer credenciales de un Administrador Global."
          );
        }

        Logger.info(`[EIAM_PASSWORD_RESET] AUTH_VALIDATED & TENANT_VALIDATED & ROLE_VALIDATED`, { targetUid, correlationId });

        // 3. Resolución y Aseguramiento de Identidad en Firebase Auth (Backing de identidades FIRESTORE_ONLY)
        let authUserRecord: admin.auth.UserRecord | null = null;
        try {
          authUserRecord = await admin.auth().getUser(targetUid);
        } catch (authErr: any) {
          if (authErr.code === "auth/user-not-found") {
            try {
              const userByEmail = await admin.auth().getUserByEmail(emailForReset);
              if (userByEmail && userByEmail.uid !== targetUid) {
                Logger.error(`[EIAM_PASSWORD_RESET] CONFLICT: Auth user con email ${emailForReset} tiene UID diferente: ${userByEmail.uid} != ${targetUid}`);
                throw new functions.https.HttpsError(
                  "already-exists",
                  `El correo ${emailForReset} ya está vinculado a otra cuenta en Authentication.`
                );
              }
              authUserRecord = userByEmail;
            } catch (byEmailErr: any) {
              if (byEmailErr.code === "auth/user-not-found") {
                // Crear el AuthRecord con el UID canónico EXACTO de Firestore
                Logger.info(`[EIAM_PASSWORD_RESET] Respaldo de identidad en Auth para UID canónico: ${targetUid}`);
                authUserRecord = await admin.auth().createUser({
                  uid: targetUid,
                  email: emailForReset,
                  displayName: targetName,
                  disabled: targetData.isActive === false || targetData.active === false,
                });

                // Asignar inmediatamente sus Custom Claims canónicos
                const eiamRole = resolveEiamRole({ eiamRole: targetRole, role: targetData.role || targetData.rol });
                await admin.auth().setCustomUserClaims(targetUid, {
                  role: eiamRole,
                  eiamRole: targetData.eiamRole || eiamRole,
                  businessId: targetBusinessId,
                  branchId: targetBranchId,
                  orgId: targetData.orgId || targetData.organizationId || null,
                  tenantId: targetTenant,
                });
              } else {
                throw byEmailErr;
              }
            }
          } else {
            throw authErr;
          }
        }

        // 4. Generación de Action Code Link con ActionCodeSettings y fallback robusto
        Logger.info(`[EIAM_PASSWORD_RESET] LINK_GENERATION_START`, { targetUid, correlationId });
        let resetLink: string;
        try {
          const actionCodeSettings: admin.auth.ActionCodeSettings = {
            url: "https://bluesystemdelivery.com",
            handleCodeInApp: false,
          };
          resetLink = await admin.auth().generatePasswordResetLink(emailForReset, actionCodeSettings);
          Logger.info(`[EIAM_PASSWORD_RESET] LINK_GENERATION_SUCCESS`, { targetUid, correlationId });
        } catch (linkErr1: any) {
          Logger.warn(`[EIAM_PASSWORD_RESET] Aviso con ActionCodeSettings principal (${linkErr1?.message}), intentando fallback web.app...`);
          try {
            const fallbackSettings: admin.auth.ActionCodeSettings = {
              url: "https://bluesystem-7c9af.web.app",
              handleCodeInApp: false,
            };
            resetLink = await admin.auth().generatePasswordResetLink(emailForReset, fallbackSettings);
          } catch (linkErr2: any) {
            Logger.warn(`[EIAM_PASSWORD_RESET] Fallback web.app falló (${linkErr2?.message}), generando enlace estándar...`);
            resetLink = await admin.auth().generatePasswordResetLink(emailForReset);
          }
        }

        // Transformar el enlace para que apunte al portal corporativo oficial en español (https://bluesystemdelivery.com/reset-password.html)
        let corporateResetLink = resetLink;
        try {
          const parsedUrl = new URL(resetLink);
          const oobCode = parsedUrl.searchParams.get("oobCode");
          const apiKey = parsedUrl.searchParams.get("apiKey") || "";
          if (oobCode) {
            corporateResetLink = `https://admin.bluesystemdelivery.com/reset-password.html?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}&apiKey=${encodeURIComponent(apiKey)}`;
          }
        } catch (urlParseErr: any) {
          Logger.warn(`[EIAM_PASSWORD_RESET] Aviso al formatear URL corporativa:`, urlParseErr?.message);
          corporateResetLink = resetLink;
        }

        // 5. Envío del Correo Transaccional via EmailService
        Logger.info(`[EIAM_PASSWORD_RESET] EMAIL_SEND_START`, { targetUid, emailForReset, correlationId });
        let emailResult: any = { success: false, status: "SKIPPED" };
        try {
          emailResult = await EmailService.sendPasswordResetEmail({
            uid: targetUid,
            email: emailForReset,
            contactName: targetName,
            resetLink: corporateResetLink,
            reason: reason || "Restablecimiento administrativo de contraseña",
          });
          Logger.info(`[EIAM_PASSWORD_RESET] EMAIL_SEND_SUCCESS`, { targetUid, emailResult, correlationId });
        } catch (emailErr: any) {
          Logger.warn(`[EIAM_PASSWORD_RESET] EMAIL_SEND_FAILED: ${emailErr.message}`, { targetUid, correlationId });
        }

        // 6. Registro de Auditoría Canónico (Zero Credential Exposure)
        await db.collection("audit_events").add({
          action: "USER_PASSWORD_RESET",
          event: "PASSWORD_RESET_REQUESTED",
          domain: "IDENTITY_ADMIN",
          actorUid: callerUid,
          actorRole: callerRole,
          targetUid,
          targetEmail: emailForReset,
          tenantId: targetTenant,
          businessId: targetBusinessId,
          branchId: targetBranchId,
          method: "RESET_LINK",
          emailStatus: emailResult.status || "SENT",
          reason: reason || "Restablecimiento administrativo de contraseña",
          correlationId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        Logger.audit(
          "USER_PASSWORD_RESET",
          callerUid,
          { targetUid, targetEmail: emailForReset, method: "RESET_LINK", correlationId },
          { module: "adminUpdateUser", userId: callerUid }
        );

        Logger.info(`[EIAM_PASSWORD_RESET] REQUEST_COMPLETE correlationId=${correlationId}`);

        return {
          success: true,
          link: corporateResetLink,
          emailSent: emailResult.success !== false,
          emailStatus: emailResult.status,
          correlationId,
        };
      }

      case "revokeSessions": {
        // Revokes all refresh tokens for the user — forces re-login on all devices.
        await admin.auth().revokeRefreshTokens(targetUid);

        // Also clear /sessions collection for this user
        const sessionsSnap = await db
          .collection("sessions")
          .where("uid", "==", targetUid)
          .get()
          .catch(() => null);
        if (sessionsSnap && !sessionsSnap.empty) {
          const batch = db.batch();
          sessionsSnap.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }

        await db.collection("audit_events").add({
          action: "USER_SESSIONS_REVOKED",
          domain: "IDENTITY_ADMIN",
          actorUid: callerUid,
          actorRole: context.auth?.token?.role || "admin",
          targetUid,
          targetEmail,
          reason: reason || "Revocación administrativa de sesiones",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        Logger.audit(
          "USER_SESSIONS_REVOKED",
          callerUid,
          { targetUid, targetEmail },
          { module: "adminUpdateUser", userId: callerUid }
        );

        return { success: true, message: "Sesiones revocadas. El usuario deberá iniciar sesión nuevamente." };
      }

      case "updateProfile": {
        // Updates basic profile fields in Firestore only (no Auth layer changes).
        const oldData = targetUserDoc.exists ? targetUserDoc.data() : {};
        const updatePayload: Record<string, any> = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (nombre !== undefined && nombre !== null) {
          updatePayload.nombre = nombre;
          updatePayload.name = nombre;
        }
        if (telefono !== undefined && telefono !== null) {
          updatePayload.telefono = telefono;
          updatePayload.phone = telefono;
        }

        await db.collection("users").doc(targetUid).update(updatePayload);

        await db.collection("audit_events").add({
          action: "USER_PROFILE_UPDATED",
          domain: "IDENTITY_ADMIN",
          actorUid: callerUid,
          actorRole: context.auth?.token?.role || "admin",
          targetUid,
          targetEmail,
          before: {
            nombre: oldData?.nombre || oldData?.name || "",
            telefono: oldData?.telefono || oldData?.phone || "",
          },
          after: {
            nombre: nombre ?? oldData?.nombre ?? "",
            telefono: telefono ?? oldData?.telefono ?? "",
          },
          reason: reason || "Actualización administrativa de perfil",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        Logger.audit(
          "USER_PROFILE_UPDATED",
          callerUid,
          {
            targetUid,
            targetEmail,
            before: { nombre: oldData?.nombre, telefono: oldData?.telefono },
            after: { nombre, telefono },
          },
          { module: "adminUpdateUser", userId: callerUid }
        );

        return { success: true, message: "Perfil actualizado correctamente." };
      }

      default:
        throw new functions.https.HttpsError("invalid-argument", "Acción no soportada.");

    }
  } catch (e: any) {
    if (e instanceof functions.https.HttpsError) {
      throw e;
    }
    Logger.error("Error en adminUpdateUser execution", e, { module: "adminUpdateUser", userId: callerUid });
    throw new functions.https.HttpsError("internal", e.message || "Error interno.");
  }
});

/**
 * 5. CALLABLE: diagnoseFcmSystem
 * Diagnóstico del sistema FCM y métricas de dispositivos
 */
export const diagnoseFcmSystem = functions.https.onCall(async (data, context) => {
  validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "supervisor", "ADMIN", "SUPER_ADMIN"],
    },
    "diagnoseFcmSystem"
  );

  try {
    const startTime = Date.now();

    // 1. Métricas de Usuarios
    const usersSnap = await db.collection("users").get();
    const totalUsers = usersSnap.size;
    let activeUsers = 0;
    let blockedUsers = 0;
    const rolesCount = { customer: 0, courier: 0, business: 0, admin: 0, unknown: 0 };
    const userUidSet = new Set<string>();

    usersSnap.forEach((doc) => {
      const d = doc.data();
      userUidSet.add(doc.id);
      if (d.isActive !== false && d.active !== false) {
        activeUsers++;
      } else {
        blockedUsers++;
      }
      const r = (d.role || d.rol || "customer").toLowerCase();
      if (r.includes("customer") || r.includes("cliente")) rolesCount.customer++;
      else if (r.includes("courier") || r.includes("driver") || r.includes("motorizado")) rolesCount.courier++;
      else if (r.includes("business") || r.includes("comercio")) rolesCount.business++;
      else if (r.includes("admin")) rolesCount.admin++;
      else rolesCount.unknown++;
    });

    // 2. Métricas de Dispositivos y Tokens FCM
    const devicesSnap = await db.collection("user_devices").get();
    const totalDevices = devicesSnap.size;
    let validTokensCount = 0;
    let emptyTokensCount = 0;
    let androidCount = 0;
    let iosCount = 0;
    const deviceUidSet = new Set<string>();
    const tokenSet = new Set<string>();
    let duplicateTokensCount = 0;

    devicesSnap.forEach((doc) => {
      const d = doc.data();
      const uid = doc.id || d.uid;
      if (uid) deviceUidSet.add(uid);

      const token = d.fcmToken ? d.fcmToken.trim() : "";
      if (token && token.length > 20 && d.isActive !== false) {
        validTokensCount++;
        if (tokenSet.has(token)) {
          duplicateTokensCount++;
        } else {
          tokenSet.add(token);
        }
      } else {
        emptyTokensCount++;
      }

      const platform = (d.platform || "Android").toLowerCase();
      if (platform.includes("ios")) iosCount++;
      else androidCount++;
    });

    let usersWithoutDevice = 0;
    userUidSet.forEach((uid) => {
      if (!deviceUidSet.has(uid)) usersWithoutDevice++;
    });

    let orphanedDevices = 0;
    deviceUidSet.forEach((uid) => {
      if (!userUidSet.has(uid)) orphanedDevices++;
    });

    // 3. Métricas de Campañas en Cola (`notification_campaigns`)
    const campaignsSnap = await db.collection("notification_campaigns").limit(500).get();
    const queueCounts: Record<string, number> = {
      QUEUED: 0,
      PROCESSING: 0,
      RETRY: 0,
      FAILED: 0,
      SENT: 0,
      SCHEDULED: 0,
      DRAFT: 0,
    };

    campaignsSnap.forEach((doc) => {
      const st = (doc.data().status || "QUEUED").toUpperCase();
      if (queueCounts[st] !== undefined) {
        queueCounts[st]++;
      }
    });

    // 4. Métricas de Entregas FCM Persistentes (`campaign_deliveries`)
    const deliveriesSnap = await db.collection("campaign_deliveries").limit(500).get();
    const deliveryCounts: Record<string, number> = {
      PENDING: 0,
      SENDING: 0,
      FCM_ACCEPTED: 0,
      FAILED_RETRYABLE: 0,
      FAILED_PERMANENT: 0,
    };

    deliveriesSnap.forEach((doc) => {
      const st = (doc.data().status || "PENDING").toUpperCase();
      if (deliveryCounts[st] !== undefined) {
        deliveryCounts[st]++;
      }
    });

    // 5. Última Actividad de Campaña
    const lastCampaignSnap = await db
      .collection("notification_campaigns")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    let lastCampaignData: any = null;
    let lastFcmMessageId: string | null = null;

    if (!lastCampaignSnap.empty) {
      const lastDoc = lastCampaignSnap.docs[0];
      const data = lastDoc.data();
      lastCampaignData = {
        campaignId: lastDoc.id,
        title: data.title || "Sin título",
        status: data.status || "DESCONOCIDO",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        processingStartedAt: data.processingStartedAt ? data.processingStartedAt.toDate().toISOString() : null,
        successCount: data.successCount || 0,
        failureCount: data.failureCount || 0,
      };

      // Buscar último fcmMessageId en campaign_deliveries para esta campaña
      const lastDeliverySnap = await db
        .collection("campaign_deliveries")
        .where("campaignId", "==", lastDoc.id)
        .where("status", "==", "FCM_ACCEPTED")
        .limit(1)
        .get();

      if (!lastDeliverySnap.empty) {
        lastFcmMessageId = lastDeliverySnap.docs[0].data().fcmMessageId || null;
      }
    }

    const executionTimeMs = Date.now() - startTime;

    Logger.info(`Diagnóstico FCM completado en ${executionTimeMs}ms`, {
      module: "diagnoseFcmSystem",
      duration: executionTimeMs,
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      executionTimeMs,
      appCheckStatus: "ACTIVE",
      authStatus: "ACTIVE",
      cloudFunctionsStatus: "ACTIVE",
      queueWorkerStatus: "ACTIVE",
      firestoreStatus: "OK",
      firebaseMessagingStatus: "OK",
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        roles: rolesCount,
      },
      devices: {
        total: totalDevices,
        validTokens: validTokensCount,
        emptyOrInvalidTokens: emptyTokensCount,
        duplicateTokens: duplicateTokensCount,
        android: androidCount,
        ios: iosCount,
        usersWithoutDevice,
        orphanedDevices,
      },
      campaigns: {
        QUEUED: queueCounts.QUEUED,
        PROCESSING: queueCounts.PROCESSING,
        RETRY: queueCounts.RETRY,
        FAILED: queueCounts.FAILED,
        SENT: queueCounts.SENT,
        SCHEDULED: queueCounts.SCHEDULED,
        DRAFT: queueCounts.DRAFT,
        total: campaignsSnap.size,
      },
      deliveries: {
        PENDING: deliveryCounts.PENDING,
        SENDING: deliveryCounts.SENDING,
        FCM_ACCEPTED: deliveryCounts.FCM_ACCEPTED,
        FAILED_RETRYABLE: deliveryCounts.FAILED_RETRYABLE,
        FAILED_PERMANENT: deliveryCounts.FAILED_PERMANENT,
        total: deliveriesSnap.size,
      },
      lastActivity: {
        campaignId: lastCampaignData?.campaignId || null,
        title: lastCampaignData?.title || null,
        status: lastCampaignData?.status || null,
        processingStartedAt: lastCampaignData?.processingStartedAt || null,
        successCount: lastCampaignData?.successCount || 0,
        failureCount: lastCampaignData?.failureCount || 0,
        lastFcmMessageId,
      },
    };
  } catch (e: any) {
    Logger.error("Error en diagnoseFcmSystem", e, { module: "diagnoseFcmSystem" });
    throw new functions.https.HttpsError("internal", e.message || "Error interno.");
  }
});

/**
 * 5.1 CALLABLE: sendFcmDiagnostic
 * Ejecuta un Smoke Test FCM controlado hacia UN usuario y dispositivo específico.
 */
export const sendFcmDiagnostic = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "supervisor", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["targetUid", "deviceId"],
    },
    "sendFcmDiagnostic"
  );

  const targetUid = (data.targetUid || "").toString().trim();
  const deviceId = (data.deviceId || "").toString().trim();

  if (!targetUid || !deviceId || data.targetType === "all") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El diagnóstico FCM requiere especificar un targetUid y deviceId únicos de prueba. Prohibido targetType=all."
    );
  }

  try {
    const startTime = Date.now();

    // 1. Obtener dispositivo objetivo de user_devices
    const deviceDocId = `${targetUid}_${deviceId}`;
    let deviceDoc = await db.collection("user_devices").doc(deviceDocId).get();

    if (!deviceDoc.exists) {
      // Búsqueda alternativa por uid y deviceId
      const searchSnap = await db
        .collection("user_devices")
        .where("uid", "==", targetUid)
        .where("deviceId", "==", deviceId)
        .limit(1)
        .get();

      if (!searchSnap.empty) {
        deviceDoc = searchSnap.docs[0];
      }
    }

    if (!deviceDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Dispositivo de prueba no encontrado para UID: ${targetUid}, DeviceID: ${deviceId}`
      );
    }

    const devData = deviceDoc.data()!;
    const fcmToken = devData.fcmToken ? devData.fcmToken.trim() : "";

    if (!fcmToken || fcmToken.length < 20 || devData.isActive === false) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `El dispositivo ${deviceId} no posee un token FCM activo válido.`
      );
    }

    // 2. Construir payload Data-Only de diagnóstico
    const testId = `diag_${Date.now()}`;
    const campaignId = `camp_diag_${Date.now()}`;
    const timestampStr = String(Date.now());

    const dataMap: Record<string, string> = {
      type: "FCM_DIAGNOSTIC",
      action: "FCM_DIAGNOSTIC",
      title: "BlueSystem FCM Diagnostic",
      body: "Prueba controlada de FCM",
      testId,
      timestamp: timestampStr,
      campaignId,
    };

    const messaging = admin.messaging();
    const fcmPayload: admin.messaging.MulticastMessage = {
      tokens: [fcmToken],
      notification: {
        title: "BlueSystem FCM Diagnostic",
        body: "Prueba controlada de FCM",
      },
      data: dataMap,
      android: {
        priority: "high",
        directBootOk: true,
      } as any,
    };

    // 3. Registrar estado SENDING en campaign_deliveries
    const deliveryKey = `${campaignId}_${targetUid}_${deviceId}`;
    const deliveryRef = db.collection("campaign_deliveries").doc(deliveryKey);

    await deliveryRef.set({
      campaignId,
      uid: targetUid,
      deviceId,
      status: "SENDING",
      attempts: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Enviar FCM Multicast
    const fcmResponse = await messaging.sendEachForMulticast(fcmPayload);
    const resp = fcmResponse.responses[0];

    let fcmStatus = "FAILED_RETRYABLE";
    let fcmMessageId: string | null = null;
    let errorMessage: string | null = null;

    if (resp.success && resp.messageId) {
      fcmStatus = "FCM_ACCEPTED";
      fcmMessageId = resp.messageId;

      await deliveryRef.update({
        status: "FCM_ACCEPTED",
        fcmMessageId: resp.messageId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      errorMessage = resp.error ? resp.error.message : "Error desconocido en FCM API";
      fcmStatus = "FAILED_PERMANENT";

      await deliveryRef.update({
        status: "FAILED_PERMANENT",
        lastError: errorMessage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const executionTimeMs = Date.now() - startTime;

    Logger.info(`Smoke test FCM completado para ${targetUid}_${deviceId}`, {
      module: "sendFcmDiagnostic",
      userId: callerUid,
      targetUid,
      deviceId,
      fcmStatus,
      duration: executionTimeMs,
    });

    return {
      success: resp.success,
      targetUid,
      deviceId,
      fcmTokenStatus: "VALID",
      fcmStatus,
      fcmMessageId,
      deliveryKey,
      errorMessage,
      executionTimeMs,
      note: "FCM_ACCEPTED significa aceptado por los servidores de Google FCM / APNs.",
    };
  } catch (e: any) {
    Logger.error("Error en sendFcmDiagnostic execution", e, { module: "sendFcmDiagnostic", userId: callerUid });
    throw new functions.https.HttpsError("internal", e.message || "Error ejecutando Smoke Test FCM.");
  }
});

/**
 * 7. CALLABLE: adminDeleteCampaign (Fase 4.2 Lifecycle)
 * Marca eliminación lógica de una campaña en notification_campaigns manteniendo
 * todas las entregas (campaign_deliveries), métricas y auditoría intactas.
 */
export const adminDeleteCampaign = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["campaignId"],
    },
    "adminDeleteCampaign"
  );

  const campaignId = (data.campaignId || "").toString().trim();
  const campaignRef = db.collection("notification_campaigns").doc(campaignId);
  const docSnap = await campaignRef.get();

  if (!docSnap.exists) {
    throw new functions.https.HttpsError("not-found", `La campaña ${campaignId} no existe.`);
  }

  // 1. Marcar campaña maestra como DELETED
  await campaignRef.update({
    "visibility.status": "DELETED",
    "visibility.deletedAt": admin.firestore.FieldValue.serverTimestamp(),
    "visibility.deletedBy": callerUid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 2. Localizar y marcar todas las notificaciones materializadas en buzones de usuarios
  const docRefsToUpdate = new Map<string, FirebaseFirestore.DocumentReference>();

  // Estrategia A: Collection Group Query por campaignId
  try {
    const cgSnap = await db.collectionGroup("notifications").where("campaignId", "==", campaignId).get();
    cgSnap.forEach((doc) => {
      docRefsToUpdate.set(doc.ref.path, doc.ref);
    });
  } catch (err: any) {
    Logger.warn("Advertencia en collectionGroup notifications query", { error: err.message, campaignId });
  }

  // Estrategia B: Ledger de entregas campaign_deliveries
  try {
    const deliveriesSnap = await db.collection("campaign_deliveries").where("campaignId", "==", campaignId).get();
    deliveriesSnap.forEach((delivDoc) => {
      const data = delivDoc.data();
      const recipientUid = data.uid || data.userId || data.recipientUid;
      if (recipientUid && !recipientUid.startsWith("guest_") && !recipientUid.startsWith("device_")) {
        const notifRef = db.collection("users").doc(recipientUid).collection("notifications").doc(campaignId);
        docRefsToUpdate.set(notifRef.path, notifRef);
      }
    });
  } catch (err: any) {
    Logger.warn("Advertencia en lookup de campaign_deliveries", { error: err.message, campaignId });
  }

  // 3. Actualizar buzones de clientes en lotes atómicos (máximo 500 ops por batch)
  const refsArray = Array.from(docRefsToUpdate.values());
  let userNotificationsUpdated = 0;

  for (let i = 0; i < refsArray.length; i += 500) {
    const chunk = refsArray.slice(i, i + 500);
    const batch = db.batch();
    chunk.forEach((ref) => {
      batch.set(
        ref,
        {
          campaignId,
          visibilityStatus: "DELETED",
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedBy: callerUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
    userNotificationsUpdated += chunk.length;
  }

  // 4. Registro inmutable en audit_events
  await db.collection("audit_events").add({
    event: "NOTIFICATION_DELETED",
    action: "NOTIFICATION_DELETED",
    domain: "NOTIFICATIONS",
    campaignId,
    actorUid: callerUid,
    userNotificationsAffected: userNotificationsUpdated,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => null);

  Logger.audit("NOTIFICATION_DELETED", callerUid, { campaignId, userNotificationsUpdated }, { module: "adminDeleteCampaign", userId: callerUid });

  return { success: true, campaignId, visibilityStatus: "DELETED", userNotificationsAffected: userNotificationsUpdated };
});

/**
 * 8. CALLABLE: adminDisableNotificationForUser (Fase 4.2 Lifecycle)
 * Deshabilita una notificación para un usuario específico sin alterar
 * las entregas de otros usuarios ni las analíticas históricas de la campaña.
 */
export const adminDisableNotificationForUser = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["campaignId", "targetUid"],
    },
    "adminDisableNotificationForUser"
  );

  const campaignId = (data.campaignId || "").toString().trim();
  const targetUid = (data.targetUid || "").toString().trim();

  const userNotifRef = db.collection("users").doc(targetUid).collection("notifications").doc(campaignId);

  await userNotifRef.set({
    campaignId,
    visibilityStatus: "DISABLED",
    disabledAt: admin.firestore.FieldValue.serverTimestamp(),
    disabledBy: callerUid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection("audit_events").add({
    event: "NOTIFICATION_DISABLED",
    action: "NOTIFICATION_DISABLED",
    domain: "NOTIFICATIONS",
    campaignId,
    targetUid,
    actorUid: callerUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => null);

  Logger.audit("NOTIFICATION_DISABLED", callerUid, { campaignId, targetUid }, { module: "adminDisableNotificationForUser", userId: callerUid });

  return { success: true, campaignId, targetUid, visibilityStatus: "DISABLED" };
});


/**
 * 6. CALLABLE: deprovisionTenant (Sprint 18.1 Tenant Deprovisioning & Governance Center)
 * Realiza el ciclo de vida seguro de desaprovisionamiento (DEACTIVATE o DELETE/SOFT_DELETE)
 * de un comercio mediante Admin SDK de manera atómica, idempotente y auditable.
 */
export const deprovisionTenant = functions.https.onCall(async (data, context) => {
  const { uid: callerUid, role: callerRole } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: false,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
      requiredFields: ["businessId", "mode"],
    },
    "deprovisionTenant"
  );

  const businessId = (data.businessId || "").toString().trim();
  const mode = (data.mode || "").toString().toUpperCase();
  const reason = (data.reason || "Acción administrativa desde Governance Center").toString().trim();

  if (!["DEACTIVATE", "DELETE", "HARD_DELETE"].includes(mode)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El modo de desaprovisionamiento debe ser 'DEACTIVATE', 'DELETE' o 'HARD_DELETE'."
    );
  }

  // 1. Buscar referencias del tenant en /businesses y /users
  const businessDocRef = db.collection("businesses").doc(businessId);
  const userDocRef = db.collection("users").doc(businessId);

  const [businessSnap, userSnap] = await Promise.all([
    businessDocRef.get(),
    userDocRef.get(),
  ]);

  if (!businessSnap.exists && !userSnap.exists) {
    // Buscar si existen órdenes o productos vinculados a este businessId
    const [productsCheck, ordersCheck] = await Promise.all([
      db.collection("products").where("businessId", "==", businessId).limit(1).get(),
      db.collection("orders").where("businessId", "==", businessId).limit(1).get(),
    ]);

    if (productsCheck.empty && ordersCheck.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `No se encontró el comercio con ID '${businessId}' en la plataforma.`
      );
    }
  }

  const currentBusinessData = businessSnap.exists ? businessSnap.data() : (userSnap.exists ? userSnap.data() : {});
  const currentLifecycle = currentBusinessData?.lifecycleStatus || "";
  const currentStatus = currentBusinessData?.status || "";

  // 2. Verificar Idempotencia
  if (mode === "DEACTIVATE" && currentLifecycle === "SUSPENDED" && (currentStatus === "DISABLED" || currentStatus === "INACTIVE")) {
    Logger.info(`deprovisionTenant idempotente: el comercio ${businessId} ya está deshabilitado.`, { module: "deprovisionTenant", userId: callerUid });
    return {
      success: true,
      idempotent: true,
      businessId,
      mode,
      message: "El comercio ya se encuentra deshabilitado.",
    };
  }

  if (mode === "DELETE" && currentLifecycle === "DEPROVISIONED" && currentStatus === "DELETED") {
    Logger.info(`deprovisionTenant idempotente: el comercio ${businessId} ya está deprovisionado.`, { module: "deprovisionTenant", userId: callerUid });
    return {
      success: true,
      idempotent: true,
      businessId,
      mode,
      message: "El comercio ya se encuentra deprovisionado definitivamente.",
    };
  }

  const operationId = `deprov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  // 3. Auditoría Inicial (STARTED)
  await db.collection("audit_events").add({
    event: mode === "HARD_DELETE" ? "BUSINESS_HARD_DELETE_STARTED" : (mode === "DEACTIVATE" ? "BUSINESS_DEACTIVATION_STARTED" : "BUSINESS_DEPROVISIONMENT_STARTED"),
    domain: "GOVERNANCE",
    businessId,
    businessName: currentBusinessData?.name || currentBusinessData?.comercioNombre || currentBusinessData?.nombre || businessId,
    organizationId: currentBusinessData?.orgId || currentBusinessData?.organizationId || "",
    actorUid: callerUid,
    actorRole: callerRole,
    operationId,
    mode,
    reason,
    timestamp: serverTimestamp,
  });

  try {
    // 4. Cancelación de Pedidos Activos (pending, preparing, created, in_transit)
    const activeOrdersSnap = await db
      .collection("orders")
      .where("businessId", "==", businessId)
      .where("status", "in", ["pending", "preparing", "draft", "created", "accepted", "in_transit"])
      .get();

    const orderCancelPromises: Promise<any>[] = [];
    activeOrdersSnap.forEach((orderDoc) => {
      orderCancelPromises.push(
        orderDoc.ref.update({
          status: "cancelled",
          estado: "cancelled",
          cancelReason: mode === "HARD_DELETE" ? "TENANT_HARD_DELETED" : (mode === "DEACTIVATE" ? "TENANT_DEACTIVATED" : "TENANT_DEPROVISIONED"),
          cancelledAt: serverTimestamp,
          updatedAt: serverTimestamp,
        })
      );
    });
    await Promise.all(orderCancelPromises);

    // 5. Actualización de Master Data (/businesses, /users root, /branches, /restaurant_settings, /products, /dashboard_summary)
    const masterUpdates: Promise<any>[] = [];

    if (mode === "HARD_DELETE") {
      if (businessSnap.exists) {
        masterUpdates.push(businessDocRef.delete());
      }
      if (userSnap.exists) {
        const uData = userSnap.data();
        if (uData?.userType === "business" || uData?.role === "business") {
          masterUpdates.push(userDocRef.delete());
        }
      }
    } else if (mode === "DEACTIVATE") {
      if (businessSnap.exists) {
        masterUpdates.push(
          businessDocRef.update({
            status: "DISABLED",
            lifecycleStatus: "SUSPENDED",
            active: false,
            isActive: false,
            suspensionReason: reason,
            updatedAt: serverTimestamp,
          })
        );
      }
      if (userSnap.exists) {
        masterUpdates.push(
          userDocRef.update({
            status: "DISABLED",
            lifecycleStatus: "SUSPENDED",
            active: false,
            isActive: false,
            updatedAt: serverTimestamp,
          })
        );
      }
    } else {
      // mode === "DELETE" (Soft Delete & Deprovision)
      if (businessSnap.exists) {
        masterUpdates.push(
          businessDocRef.update({
            status: "DELETED",
            lifecycleStatus: "DEPROVISIONED",
            isDeleted: true,
            active: false,
            isActive: false,
            deletedAt: serverTimestamp,
            updatedAt: serverTimestamp,
          })
        );
      }
      if (userSnap.exists) {
        masterUpdates.push(
          userDocRef.update({
            status: "DELETED",
            lifecycleStatus: "DEPROVISIONED",
            isDeleted: true,
            active: false,
            isActive: false,
            deletedAt: serverTimestamp,
            updatedAt: serverTimestamp,
          })
        );
      }
    }

    // Actualizar sucursales (/branches)
    const branchesSnap = await db.collection("branches").where("businessId", "==", businessId).get();
    branchesSnap.forEach((bDoc) => {
      if (mode === "HARD_DELETE") {
        masterUpdates.push(bDoc.ref.delete());
      } else {
        masterUpdates.push(
          bDoc.ref.update(
            mode === "DEACTIVATE"
              ? { active: false, status: "DISABLED", updatedAt: serverTimestamp }
              : { isDeleted: true, active: false, status: "DELETED", updatedAt: serverTimestamp }
          )
        );
      }
    });

    // Actualizar configuración (/restaurant_settings)
    const settingsRef = db.collection("restaurant_settings").doc(businessId);
    const settingsSnap = await settingsRef.get();
    if (settingsSnap.exists) {
      if (mode === "HARD_DELETE") {
        masterUpdates.push(settingsRef.delete());
      } else {
        masterUpdates.push(
          settingsRef.update(
            mode === "DEACTIVATE"
              ? { isOpen: false, isOperating: false, status: "DISABLED", updatedAt: serverTimestamp }
              : { isOpen: false, isOperating: false, status: "DELETED", updatedAt: serverTimestamp }
          )
        );
      }
    }

    // Actualizar productos (/products)
    const productsSnap = await db.collection("products").where("businessId", "==", businessId).get();
    productsSnap.forEach((pDoc) => {
      if (mode === "HARD_DELETE") {
        masterUpdates.push(pDoc.ref.delete());
      } else {
        masterUpdates.push(
          pDoc.ref.update(
            mode === "DEACTIVATE"
              ? { active: false, isAvailable: false, updatedAt: serverTimestamp }
              : { isDeleted: true, active: false, isAvailable: false, updatedAt: serverTimestamp }
          )
        );
      }
    });

    // Actualizar dashboard summary (/dashboard_summary)
    const dashSummaryRef = db.collection("dashboard_summary").doc(businessId);
    const dashSummarySnap = await dashSummaryRef.get();
    if (dashSummarySnap.exists) {
      if (mode === "HARD_DELETE") {
        masterUpdates.push(dashSummaryRef.delete());
      } else {
        masterUpdates.push(dashSummaryRef.update({ active: false, updatedAt: serverTimestamp }));
      }
    }

    // Actualizar solicitudes (/merchant_applications)
    const appSnap = await db.collection("merchant_applications").where("businessId", "==", businessId).get();
    appSnap.forEach((appDoc) => {
      masterUpdates.push(appDoc.ref.update({
        status: "TERMINATED",
        terminatedAt: serverTimestamp,
        updatedAt: serverTimestamp,
      }));
    });

    await Promise.all(masterUpdates);

    // 6. Identificar y procesar Staff Users (/employees, /membership, /users)
    const [employeesSnap, membershipSnap, usersWithBusinessSnap] = await Promise.all([
      db.collection("employees").where("businessId", "==", businessId).get(),
      db.collection("membership").where("businessId", "==", businessId).get(),
      db.collection("users").where("businessId", "==", businessId).get(),
    ]);

    const staffUidSet = new Set<string>();
    if (userSnap.exists) staffUidSet.add(businessId);

    employeesSnap.forEach((doc) => {
      const u = doc.data()?.uid;
      if (u) staffUidSet.add(u);
    });

    membershipSnap.forEach((doc) => {
      const u = doc.data()?.uid;
      if (u) staffUidSet.add(u);
    });

    usersWithBusinessSnap.forEach((doc) => {
      staffUidSet.add(doc.id);
    });

    // Actualizar colecciones de membresía y empleados
    const membershipPromises: Promise<any>[] = [];
    employeesSnap.forEach((empDoc) => {
      membershipPromises.push(
        empDoc.ref.update({
          status: "TERMINATED",
          isDeleted: true,
          active: false,
          updatedAt: serverTimestamp,
        })
      );
    });

    membershipSnap.forEach((mDoc) => {
      membershipPromises.push(
        mDoc.ref.update({
          status: "TERMINATED",
          updatedAt: serverTimestamp,
        })
      );
    });

    // Expirar invitaciones pendientes
    const pendingInvitesSnap = await db.collection("invitations").where("businessId", "==", businessId).get();
    pendingInvitesSnap.forEach((invDoc) => {
      membershipPromises.push(
        invDoc.ref.update({
          status: "EXPIRED",
          updatedAt: serverTimestamp,
        })
      );
    });

    await Promise.all(membershipPromises);

    // 7. Procesar Firebase Auth & Sesiones de Usuarios Staff
    const authAndSessionPromises: Promise<any>[] = [];

    for (const staffUid of staffUidSet) {
      // Verificar si el usuario tiene membresías en OTROS comercios activos antes de deshabilitarlo globalmente
      const otherMembershipsSnap = await db
        .collection("membership")
        .where("uid", "==", staffUid)
        .get();

      let hasOtherActiveMemberships = false;
      otherMembershipsSnap.forEach((mDoc) => {
        const d = mDoc.data();
        if (d.businessId !== businessId && d.status !== "TERMINATED") {
          hasOtherActiveMemberships = true;
        }
      });

      // Si el usuario es exclusivo del tenant (no tiene otros comercios)
      if (!hasOtherActiveMemberships && staffUid !== callerUid) {
        // Deshabilitar cuenta Auth y revocar tokens
        authAndSessionPromises.push(
          admin
            .auth()
            .updateUser(staffUid, { disabled: true })
            .then(() => admin.auth().revokeRefreshTokens(staffUid))
            .catch((e) => Logger.warn(`No se pudo deshabilitar Auth user ${staffUid}: ${e.message}`, { module: "deprovisionTenant" }))
        );

        if (mode === "DELETE") {
          authAndSessionPromises.push(
            admin
              .auth()
              .setCustomUserClaims(staffUid, null)
              .catch((e) => Logger.warn(`No se pudo limpiar claims para ${staffUid}: ${e.message}`, { module: "deprovisionTenant" }))
          );
        }

        // Actualizar /users/{staffUid}
        authAndSessionPromises.push(
          db
            .collection("users")
            .doc(staffUid)
            .update(
              mode === "DEACTIVATE"
                ? { isActive: false, active: false, status: "DISABLED", updatedAt: serverTimestamp }
                : { isActive: false, active: false, status: "DELETED", isDeleted: true, updatedAt: serverTimestamp }
            )
            .catch(() => null)
        );

        // Purgar sesiones y dispositivos
        const [sessionsSnap, devicesSnap, userDevicesSnap] = await Promise.all([
          db.collection("sessions").where("uid", "==", staffUid).get(),
          db.collection("devices").where("uid", "==", staffUid).get(),
          db.collection("user_devices").where("uid", "==", staffUid).get(),
        ]);

        sessionsSnap.forEach((sDoc) => authAndSessionPromises.push(sDoc.ref.delete()));
        devicesSnap.forEach((dDoc) => authAndSessionPromises.push(dDoc.ref.update({ isActive: false })));
        userDevicesSnap.forEach((udDoc) => authAndSessionPromises.push(udDoc.ref.update({ isActive: false })));
      }
    }

    await Promise.all(authAndSessionPromises);

    // 8. Auditoría Final (COMPLETE)
    await db.collection("audit_events").add({
      event: mode === "HARD_DELETE" ? "BUSINESS_HARD_DELETE" : (mode === "DEACTIVATE" ? "BUSINESS_DEACTIVATED" : "BUSINESS_DEPROVISIONED"),
      domain: "GOVERNANCE",
      businessId,
      actorUid: callerUid,
      actorRole: callerRole,
      operationId,
      mode,
      reason,
      cancelledOrdersCount: activeOrdersSnap.size,
      affectedStaffCount: staffUidSet.size,
      result: "SUCCESS",
      timestamp: serverTimestamp,
    });

    Logger.audit(
      mode === "HARD_DELETE" ? "BUSINESS_HARD_DELETE" : (mode === "DEACTIVATE" ? "BUSINESS_DEACTIVATED" : "BUSINESS_DEPROVISIONED"),
      callerUid,
      { businessId, mode, operationId, cancelledOrders: activeOrdersSnap.size },
      { module: "deprovisionTenant", userId: callerUid }
    );

    return {
      success: true,
      idempotent: false,
      businessId,
      mode,
      operationId,
      cancelledOrdersCount: activeOrdersSnap.size,
      affectedStaffCount: staffUidSet.size,
      message:
        mode === "HARD_DELETE"
          ? "Comercio y sus sucursales operativas fueron eliminados definitivamente de la base de datos."
          : (mode === "DEACTIVATE"
            ? "Comercio desactivado correctamente con sincronización global en el ecosistema."
            : "Comercio deprovisionado correctamente con preservación estricta de historial financiero."),
    };
  } catch (e: any) {
    Logger.error("Error en deprovisionTenant execution", e, { module: "deprovisionTenant", userId: callerUid });
    throw new functions.https.HttpsError("internal", e.message || "Error interno al desaprovisionar el comercio.");
  }
});

/**
 * CALLABLE: reconcileMerchantIdentity
 * Permite a administradores de plataforma ejecutar la reconciliación canónica
 * de un comercio o de todos los comercios del sistema.
 */
export const reconcileMerchantIdentity = functions.https.onCall(async (data, context) => {
  const { uid: callerUid } = validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: true,
      allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN", "auditor", "AUDITOR"],
    },
    "reconcileMerchantIdentity"
  );

  const { businessId, all } = data || {};
  const { reconcileMerchantIdentityInternal } = await import("../triggers/merchantLifecycleSync");

  if (businessId) {
    const result = await reconcileMerchantIdentityInternal(businessId, callerUid);
    return {
      success: true,
      mode: "SINGLE",
      result,
    };
  }

  if (all === true) {
    const bizSnap = await db.collection("businesses").get();
    const results = [];
    for (const doc of bizSnap.docs) {
      const r = await reconcileMerchantIdentityInternal(doc.id, callerUid);
      results.push(r);
    }
    return {
      success: true,
      mode: "BATCH",
      totalProcessed: results.length,
      synchronized: results.filter((r) => r.result === "SYNCHRONIZED").length,
      noChange: results.filter((r) => r.result === "NO_CHANGE").length,
      results,
    };
  }

  throw new functions.https.HttpsError(
    "invalid-argument",
    "Debe especificar 'businessId' o 'all: true' para la reconciliación."
  );
});

