import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { EmailService } from "../services/emailService";

// ─── Helper: Resolver EiamRole canónico desde datos de Firestore ──────────────
export function resolveEiamRole(data: FirebaseFirestore.DocumentData | string): string {
  if (typeof data === "string") {
    return mapRoleStringToEiam(data);
  }
  if (!data) return "CLIENT";

  // Prioridad Canónica: 1. role -> 2. eiamRole -> 3. rol -> 4. userType
  const raw = (data.role ?? data.eiamRole ?? data.rol ?? data.userType ?? "").toString().toLowerCase().trim();
  return mapRoleStringToEiam(raw);
}

function mapRoleStringToEiam(raw: string): string {
  const str = raw.toLowerCase().trim();
  const mapping: Record<string, string> = {
    // Plataforma
    super_admin: "SUPER_ADMIN",
    superadmin: "SUPER_ADMIN",
    gerente_general: "SUPER_ADMIN",
    admin: "ADMIN",
    administrator: "ADMIN",
    auditor: "AUDITOR",
    support: "SUPPORT",
    soporte: "SUPPORT",

    // Comercio (MERCHANT_OWNER y business normalizados canónicamente a OWNER)
    owner: "OWNER",
    business: "OWNER",
    comercio: "OWNER",
    merchant: "OWNER",
    negocio: "OWNER",
    empresa: "OWNER",
    propietario: "OWNER",
    business_owner: "OWNER",
    merchant_owner: "OWNER",

    // Staff de Comercio
    manager: "MANAGER",
    gerente: "MANAGER",
    supervisor: "SUPERVISOR",
    cashier: "CASHIER",
    cajero: "CASHIER",
    caja: "CASHIER",
    seller: "CASHIER",
    cook: "COOK",
    cocinero: "COOK",
    cocina: "COOK",
    kitchen: "COOK",

    // Externos / Logística / Consumidores
    driver: "DRIVER",
    motorizado: "DRIVER",
    courier: "DRIVER",
    repartidor: "DRIVER",
    deliverer: "DRIVER",
    client: "CLIENT",
    customer: "CLIENT",
    cliente: "CLIENT",
    user: "CLIENT",
    usuario: "CLIENT",
    guest: "GUEST",
    anonymous: "GUEST",
    invitado: "GUEST",
  };

  return mapping[str] ?? "CLIENT";
}

// ─── Helper: Resolver Estado de Identidad Canónico ────────────────────────────
export function resolveIdentityStatus(data: FirebaseFirestore.DocumentData): string {
  if (!data) return "ACTIVE";
  if (data.status && typeof data.status === "string") {
    const s = data.status.toUpperCase().trim();
    if (["ACTIVE", "PENDING", "BLOCKED", "SUSPENDED", "TERMINATED", "DELETED", "DISABLED"].includes(s)) {
      return (s === "DELETED" || s === "DISABLED") ? "BLOCKED" : s;
    }
  }
  if (data.isActive === false || data.active === false || data.isDeleted === true || data.lifecycleStatus === "DEPROVISIONED") {
    return "BLOCKED";
  }
  return "ACTIVE";
}

// ─── Trigger Canónico Único: setUserClaims V2 (/users/{uid} onWrite) ─────────
export const setUserClaims = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const data = change.after.exists ? change.after.data() : null;

    if (!data) {
      // Documento eliminado → limpiar claims
      await admin.auth().setCustomUserClaims(uid, {});
      functions.logger.info(`[EIAM_CANONICAL] Claims limpiados para usuario eliminado: ${uid}`);
      return;
    }

    // Resolver EiamRole y Status canónicos desde los campos de Firestore
    const eiamRole = resolveEiamRole(data);
    let status = resolveIdentityStatus(data);

    // Invariante de Claims: Construir payload completo con contexto de tenant garantizado
    const businessId = data.businessId ?? data.eiamBusinessId ?? null;
    const claims = {
      role: eiamRole,
      businessId,
      branchId: data.branchId ?? null,
      orgId: data.orgId ?? data.organizationId ?? null,
      tenantId: data.tenantId ?? null,
    };

    // ── MERCHANT ACTIVE ACCESS INVARIANT CHECK ────────────────────────────────
    // Si es un comerciante (OWNER o tiene businessId), verificar el estado de su negocio
    if (businessId && (eiamRole === "OWNER" || eiamRole === "MANAGER")) {
      try {
        const bizSnap = await admin.firestore().collection("businesses").doc(businessId).get();
        if (bizSnap.exists) {
          const bizData = bizSnap.data() || {};
          const isBizActive = (bizData.status === "ACTIVE" || bizData.lifecycleStatus === "ACTIVE" || bizData.lifecycleStatus === "ONBOARDING") && bizData.isActive !== false;
          
          if (isBizActive && status !== "ACTIVE" && status !== "PENDING") {
            // El negocio está activo pero el usuario tenía status corrupto/residual → AUTO-RECONCILIAR
            functions.logger.warn(
              `[MERCHANT_ACTIVE_INVARIANT] Auto-reconciliando identidad para uid=${uid}: businessId=${businessId} está ACTIVE pero user.status era ${status}. Forzando ACTIVE.`
            );
            status = "ACTIVE";
            await change.after.ref.set({
              status: "ACTIVE",
              isActive: true,
              active: true,
              isDeleted: false,
              lifecycleStatus: "ACTIVE",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          } else if (!isBizActive && status === "ACTIVE") {
            // El negocio está suspendido/desactivado pero el usuario estaba ACTIVE → Sincronizar a SUSPENDED
            functions.logger.info(
              `[MERCHANT_ACTIVE_INVARIANT] Sincronizando suspensión para uid=${uid}: businessId=${businessId} no está activo.`
            );
            status = "SUSPENDED";
          }
        }
      } catch (bizErr: any) {
        functions.logger.warn(`[MERCHANT_ACTIVE_INVARIANT] Aviso al verificar businessId=${businessId}:`, bizErr);
      }
    }

    await admin.auth().setCustomUserClaims(uid, claims);

    // Sincronización Fail-Closed de Auth.disabled con estado operacional
    const shouldBeDisabled = status !== "ACTIVE" && status !== "PENDING";
    try {
      const authUser = await admin.auth().getUser(uid);
      if (authUser.disabled !== shouldBeDisabled) {
        await admin.auth().updateUser(uid, { disabled: shouldBeDisabled });
        functions.logger.info(
          `[EIAM_STATUS_SYNC] Auth.disabled sincronizado para uid=${uid}: disabled=${shouldBeDisabled} (status=${status})`
        );
      }
    } catch (authErr: any) {
      functions.logger.warn(`[EIAM_STATUS_SYNC] Aviso al sincronizar Auth.disabled para uid=${uid}:`, authErr);
    }

    // Dispatch Correo Transaccional de Bienvenida para nuevos Clientes
    const isNewUser = !change.before.exists && change.after.exists;
    if (isNewUser && eiamRole === "CLIENT") {
      const customerName = data.nombre || data.name || "Cliente";
      if (data.email) {
        try {
          await EmailService.sendCustomerWelcomeEmail({
            uid,
            email: data.email,
            customerName,
            tenantId: data.tenantId || undefined,
          });
        } catch (welcomeErr: any) {
          functions.logger.warn(`[CUSTOMER_WELCOME] Error enviando correo de bienvenida para uid=${uid}:`, welcomeErr?.message);
        }
      }

      // ─── WELCOME_FIRST_REGISTRATION_V1 (In-App + Multidispositivo Push con TTL 72h) ───
      try {
        await dispatchWelcomeNotification(uid, customerName);
      } catch (welcomeNotifErr: any) {
        functions.logger.warn(`[WELCOME_FIRST_REGISTRATION] Error generando bienvenida In-App/FCM para uid=${uid}:`, welcomeNotifErr?.message);
      }
    }

    functions.logger.info(
      `[EIAM_CANONICAL] Claims V2 asignados para uid=${uid}: role=${eiamRole}, businessId=${claims.businessId}, branchId=${claims.branchId}, status=${status}`
    );
  });

// ─── Trigger: /membership/{membershipId} onWrite (Business Context Audit) ─────
// Regla Invariante: /membership NO muta Custom Claims directamente (evita race conditions)
export const setMembershipClaims = functions.firestore
  .document("membership/{membershipId}")
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return;

    const uid = data.uid;
    if (!uid) return;

    functions.logger.info(
      `[EIAM_MEMBERSHIP_CONTEXT] Membership auditada para uid=${uid}, businessId=${data.businessId}, role=${data.role}, status=${data.status}. (Claims delegados a /users trigger canónico)`
    );
  });

import { NotificationTemplateService } from "../services/notificationTemplateService";

/**
 * Despacha de forma server-authoritative e idempotente la notificación de bienvenida
 * al buzón /users/{uid}/notifications/WELCOME_CUSTOMER con TTL de 72 horas.
 */
async function dispatchWelcomeNotification(uid: string, customerName: string): Promise<void> {
  const db = admin.firestore();
  const notifRef = db.collection("users").doc(uid).collection("notifications").doc("WELCOME_CUSTOMER");
  const legacyRef = db.collection("users").doc(uid).collection("notifications").doc("WELCOME_FIRST_REGISTRATION_V1");

  const [docSnap, legacySnap] = await Promise.all([notifRef.get(), legacyRef.get()]);
  if (docSnap.exists || legacySnap.exists) {
    functions.logger.info(`[WELCOME_CUSTOMER] Notificación de bienvenida ya existe para uid=${uid}. Omitiendo recreación.`);
    return;
  }

  const resolved = await NotificationTemplateService.resolve("WELCOME_CUSTOMER", {
    customerName: customerName || "Cliente",
  });

  const now = Date.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + 72 * 60 * 60 * 1000);

  // Consultar si ya existen tokens activos al momento del registro
  const devicesSnap = await db.collection("user_devices")
    .where("uid", "==", uid)
    .where("isActive", "==", true)
    .get();

  const tokens: string[] = [];
  devicesSnap.forEach((d) => {
    const t = (d.data()?.fcmToken || d.data()?.token || "").toString().trim();
    if (t && t.length > 20 && !tokens.includes(t)) {
      tokens.push(t);
    }
  });

  let pushSent = false;
  if (tokens.length > 0) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: resolved.title, body: resolved.body },
        data: {
          action: "WELCOME_CUSTOMER",
          type: "WELCOME_CUSTOMER",
          destinationType: "CUSTOMER_HOME",
          route: resolved.destinationRoute || "customer_dashboard",
          screen: resolved.destinationRoute || "customer_dashboard",
          title: resolved.title,
          body: resolved.body,
          notificationId: "WELCOME_CUSTOMER",
          priority: "NORMAL",
        },
        android: {
          priority: "normal",
          directBootOk: true,
          notification: {
            channelId: "order_status_channel",
            icon: "ic_notification",
          },
        } as any,
        apns: {
          payload: {
            aps: {
              alert: { title: resolved.title, body: resolved.body },
              sound: "default",
              badge: 1,
            },
          },
        },
      });
      pushSent = true;
      functions.logger.info(`[WELCOME_CUSTOMER] Push enviado inmediatamente a ${tokens.length} dispositivo(s) de uid=${uid}`);
    } catch (pushErr: any) {
      functions.logger.warn(`[WELCOME_CUSTOMER] Error enviando push de bienvenida para uid=${uid}:`, pushErr?.message);
    }
  }

  // Persistir documento en buzón In-App
  await notifRef.set({
    id: "WELCOME_CUSTOMER",
    notificationId: "WELCOME_CUSTOMER",
    type: "WELCOME_CUSTOMER",
    category: resolved.category,
    title: resolved.title,
    body: resolved.body,
    priority: resolved.priority,
    action: resolved.action,
    destinationType: "CUSTOMER_HOME",
    destinationRoute: resolved.destinationRoute || "customer_dashboard",
    source: "SYSTEM",
    isRead: false,
    read: false,
    deletedByUser: false,
    visibilityStatus: "VISIBLE",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    pushSent,
    version: 1,
  });

  functions.logger.info(`[WELCOME_CUSTOMER] Creada notificación in-app para uid=${uid} (pushSent=${pushSent}) con expiración en 72h`);
}

/**
 * Trigger: onUserDeviceCreatedSyncWelcome (/user_devices/{deviceDocId})
 * Resuelve la condición de carrera entre el registro del usuario y el registro de su token FCM.
 * Si un cliente tiene pendiente su Push de bienvenida (pushSent === false), lo despacha de inmediato
 * de forma atómica e idempotente.
 */
export const onUserDeviceCreatedSyncWelcome = functions.firestore
  .document("user_devices/{deviceDocId}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after || after.isActive !== true) return null;

    const uid = (after.uid || "").toString().trim();
    if (!uid || uid.startsWith("guest_") || uid.startsWith("device_")) return null;

    const token = (after.fcmToken || after.token || "").toString().trim();
    if (!token || token.length < 20) return null;

    const db = admin.firestore();
    const welcomeRef = db.collection("users").doc(uid).collection("notifications").doc("WELCOME_CUSTOMER");

    // Transacción atómica para evitar duplicados en retries o dispositivos simultáneos
    let shouldSend = false;
    let notifTitle = "👋 ¡Bienvenido a TuaniGo!";
    let notifBody = "Tu nueva forma de pedir, enviar y moverte está aquí. Descubrí comercios, solicitá entregas y disfrutá TuaniGo.";

    try {
      await db.runTransaction(async (transaction) => {
        const notifSnap = await transaction.get(welcomeRef);
        if (!notifSnap.exists) return;
        const data = notifSnap.data() || {};
        if (data.pushSent === true) return;

        notifTitle = data.title || notifTitle;
        notifBody = data.body || notifBody;

        transaction.update(welcomeRef, {
          pushSent: true,
          pushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        shouldSend = true;
      });
    } catch (err: any) {
      functions.logger.warn(`[WELCOME_CUSTOMER] Error en transacción de sync de dispositivo para uid=${uid}:`, err?.message);
      return null;
    }

    if (!shouldSend) return null;

    try {
      await admin.messaging().sendEachForMulticast({
        tokens: [token],
        notification: { title: notifTitle, body: notifBody },
        data: {
          action: "WELCOME_CUSTOMER",
          type: "WELCOME_CUSTOMER",
          destinationType: "CUSTOMER_HOME",
          route: "customer_dashboard",
          screen: "customer_dashboard",
          title: notifTitle,
          body: notifBody,
          notificationId: "WELCOME_CUSTOMER",
          priority: "NORMAL",
        },
        android: {
          priority: "normal",
          directBootOk: true,
          notification: {
            channelId: "order_status_channel",
            icon: "ic_notification",
          },
        } as any,
        apns: {
          payload: {
            aps: {
              alert: { title: notifTitle, body: notifBody },
              sound: "default",
              badge: 1,
            },
          },
        },
      });
      functions.logger.info(`[WELCOME_CUSTOMER] Push diferido de bienvenida entregado exitosamente a dispositivo para uid=${uid}`);
    } catch (pushErr: any) {
      functions.logger.warn(`[WELCOME_CUSTOMER] Error despachando push diferido:`, pushErr?.message);
    }

    return null;
  });


