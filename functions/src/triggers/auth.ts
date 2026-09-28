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

/**
 * Despacha de forma server-authoritative e idempotente la notificación de bienvenida
 * al buzón /users/{uid}/notifications/WELCOME_FIRST_REGISTRATION_V1 con TTL de 72 horas.
 */
async function dispatchWelcomeNotification(uid: string, customerName: string): Promise<void> {
  const db = admin.firestore();
  const notifRef = db.collection("users").doc(uid).collection("notifications").doc("WELCOME_FIRST_REGISTRATION_V1");
  const doc = await notifRef.get();
  if (doc.exists) {
    functions.logger.info(`[WELCOME_FIRST_REGISTRATION] Notificación ya existe para uid=${uid}. Omitiendo recreación.`);
    return;
  }

  const now = Date.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + 72 * 60 * 60 * 1000);
  const title = "¡Bienvenido a BlueSystem! 👋";
  const body = `Hola ${customerName}, estamos felices de tenerte. Descubre comercios, productos y ofertas cerca de ti.`;

  await notifRef.set({
    id: "WELCOME_FIRST_REGISTRATION_V1",
    notificationId: "WELCOME_FIRST_REGISTRATION_V1",
    type: "WELCOME_FIRST_REGISTRATION",
    category: "Sistema",
    title,
    body,
    priority: "NORMAL",
    action: "OPEN_HOME",
    destinationType: "CUSTOMER_HOME",
    destinationRoute: "customer_dashboard",
    source: "SYSTEM",
    isRead: false,
    read: false,
    deletedByUser: false,
    visibilityStatus: "VISIBLE",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    version: 1,
  });

  functions.logger.info(`[WELCOME_FIRST_REGISTRATION] Creada notificación in-app para uid=${uid} con expiración en 72h`);

  // Despachar Push si existen tokens registrados para el cliente
  try {
    const devicesSnap = await db.collection("user_devices")
      .where("uid", "==", uid)
      .where("isActive", "==", true)
      .get();

    const tokens: string[] = [];
    devicesSnap.forEach((d) => {
      const t = d.data()?.fcmToken?.trim();
      if (t && t.length > 20 && !tokens.includes(t)) {
        tokens.push(t);
      }
    });

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          action: "WELCOME_FIRST_REGISTRATION",
          type: "WELCOME_FIRST_REGISTRATION",
          destinationType: "CUSTOMER_HOME",
          route: "customer_dashboard",
          screen: "customer_dashboard",
          title,
          body,
          notificationId: "WELCOME_FIRST_REGISTRATION_V1",
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
              alert: { title, body },
              sound: "default",
              badge: 1,
            },
          },
        },
      });
      functions.logger.info(`[WELCOME_FIRST_REGISTRATION] Push enviado a ${tokens.length} dispositivo(s) de uid=${uid}`);
    }
  } catch (pushErr: any) {
    functions.logger.warn(`[WELCOME_FIRST_REGISTRATION] Error enviando push de bienvenida para uid=${uid}: ${pushErr?.message}`);
  }
}

