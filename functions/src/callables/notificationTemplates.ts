/**
 * BlueSystem Delivery Enterprise / TuaniGo — Notification Templates Administration
 * Callables HTTPS para el Admin Web (Módulo Plantillas del Sistema)
 *
 * Funcionalidades:
 * 1. adminGetNotificationTemplates: Lista plantillas registradas (con defaults del sistema).
 * 2. adminSaveNotificationTemplate: Valida variables, versiona y guarda en Firestore.
 * 3. adminResetNotificationTemplate: Restaura título y cuerpo a los valores predeterminados de fábrica.
 * 4. adminSendTestNotificationTemplate: Envía push de prueba únicamente al administrador actual.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";
import {
  NotificationTemplateService,
  CANONICAL_TEMPLATE_DEFAULTS,
  NotificationTemplateDefinition,
} from "../services/notificationTemplateService";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── 1. CALLABLE: adminGetNotificationTemplates ──────────────────────────────

export const adminGetNotificationTemplates = functions.https.onCall(
  async (data: { domain?: string; audience?: string }, context) => {
    validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR", "admin", "super_admin", "auditor", "supervisor"],
      },
      "adminGetNotificationTemplates"
    );

    try {
      const templatesMap = new Map<string, NotificationTemplateDefinition>();

      // 1. Cargar defaults canónicos de memoria
      for (const [key, def] of Object.entries(CANONICAL_TEMPLATE_DEFAULTS)) {
        templatesMap.set(key, { ...def });
      }

      // 2. Sobrescribir con documentos existentes en Firestore
      const snap = await db.collection("notification_templates").get();
      snap.forEach((doc) => {
        const firestoreData = doc.data() as Partial<NotificationTemplateDefinition>;
        const key = doc.id;
        const base = templatesMap.get(key) || CANONICAL_TEMPLATE_DEFAULTS[key];

        if (base) {
          templatesMap.set(key, {
            ...base,
            ...firestoreData,
            eventKey: key,
            pushTitle: firestoreData.pushTitle || base.pushTitle,
            pushBody: firestoreData.pushBody || base.pushBody,
            defaultPushTitle: base.defaultPushTitle,
            defaultPushBody: base.defaultPushBody,
            allowedVariables: base.allowedVariables,
            action: base.action,
            destinationRoute: base.destinationRoute,
            category: base.category,
            priority: base.priority,
            enabled: firestoreData.enabled !== false,
            isCritical: base.isCritical,
            version: typeof firestoreData.version === "number" ? firestoreData.version : 1,
          });
        }
      });

      let list = Array.from(templatesMap.values());

      if (data?.domain && data.domain !== "ALL") {
        list = list.filter((t) => t.domain === data.domain);
      }
      if (data?.audience && data.audience !== "ALL") {
        list = list.filter((t) => t.audience === data.audience);
      }

      list.sort((a, b) => a.name.localeCompare(b.name));

      return {
        success: true,
        templates: list,
        total: list.length,
      };
    } catch (err: any) {
      Logger.error("Error en adminGetNotificationTemplates", err);
      throw new functions.https.HttpsError("internal", "Error al obtener plantillas de notificaciones.");
    }
  }
);

// ─── 2. CALLABLE: adminSaveNotificationTemplate ──────────────────────────────

export const adminSaveNotificationTemplate = functions.https.onCall(
  async (
    data: {
      eventKey: string;
      pushTitle: string;
      pushBody: string;
      enabled?: boolean;
    },
    context
  ) => {
    const { uid } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR", "admin", "super_admin", "auditor", "supervisor"],
        requiredFields: ["eventKey", "pushTitle", "pushBody"],
      },
      "adminSaveNotificationTemplate"
    );

    const eventKey = (data.eventKey || "").trim();
    const baseDefault = CANONICAL_TEMPLATE_DEFAULTS[eventKey];

    if (!baseDefault) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El EventKey '${eventKey}' no es un evento transaccional válido del sistema.`
      );
    }

    const titleTrimmed = (data.pushTitle || "").trim();
    const bodyTrimmed = (data.pushBody || "").trim();

    if (!titleTrimmed || !bodyTrimmed) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El título y el cuerpo de la notificación no pueden estar vacíos."
      );
    }

    // Validación de variables permitidas
    const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const detectedVariables: string[] = [];
    let match: RegExpExecArray | null;

    const fullText = `${titleTrimmed} ${bodyTrimmed}`;
    while ((match = regex.exec(fullText)) !== null) {
      detectedVariables.push(match[1]);
    }

    const invalidVariables = detectedVariables.filter((v) => !baseDefault.allowedVariables.includes(v));
    if (invalidVariables.length > 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Variables no permitidas para ${eventKey}: ${invalidVariables.join(", ")}. Permitidas: ${baseDefault.allowedVariables.join(", ")}`
      );
    }

    // Regla de Protección: Notificaciones Críticas no pueden ser desactivadas libremente
    const enabled = data.enabled !== undefined ? data.enabled : true;
    if (baseDefault.isCritical && enabled === false) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `La plantilla '${baseDefault.name}' es una notificación operacional crítica y no puede desactivarse.`
      );
    }

    try {
      const docRef = db.collection("notification_templates").doc(eventKey);
      const existingDoc = await docRef.get();
      const currentVersion = existingDoc.exists ? (existingDoc.data()?.version || 1) : 1;
      const newVersion = currentVersion + 1;

      const callerUser = await admin.auth().getUser(uid).catch(() => null);
      const callerEmail = callerUser?.email || "admin@tuanigo.com";

      const templatePayload: Partial<NotificationTemplateDefinition> = {
        eventKey,
        name: baseDefault.name,
        description: baseDefault.description,
        domain: baseDefault.domain,
        audience: baseDefault.audience,
        channels: baseDefault.channels,
        pushTitle: titleTrimmed,
        pushBody: bodyTrimmed,
        defaultPushTitle: baseDefault.defaultPushTitle,
        defaultPushBody: baseDefault.defaultPushBody,
        allowedVariables: baseDefault.allowedVariables,
        action: baseDefault.action,
        destinationRoute: baseDefault.destinationRoute,
        category: baseDefault.category,
        priority: baseDefault.priority,
        enabled,
        isCritical: baseDefault.isCritical,
        version: newVersion,
        updatedAt: FieldValue.serverTimestamp() as any,
        updatedBy: uid,
        updatedByEmail: callerEmail,
      };

      await docRef.set(templatePayload, { merge: true });

      // Guardar versión histórica inmutable
      await docRef.collection("versions").doc(`v${newVersion}`).set({
        ...templatePayload,
        savedAt: FieldValue.serverTimestamp(),
        savedBy: uid,
        savedByEmail: callerEmail,
      });

      // Invalidar memoria caché
      NotificationTemplateService.invalidateCache(eventKey);

      // Auditoría en /audit_events
      await db.collection("audit_events").add({
        event: "NOTIFICATION_TEMPLATE_UPDATED",
        eventKey,
        version: newVersion,
        title: titleTrimmed,
        body: bodyTrimmed,
        enabled,
        updatedBy: uid,
        updatedByEmail: callerEmail,
        timestamp: FieldValue.serverTimestamp(),
      });

      Logger.info(`[NOTIFICATION_TEMPLATE] Plantilla ${eventKey} actualizada a versión ${newVersion} por ${callerEmail}`);

      return {
        success: true,
        eventKey,
        version: newVersion,
        message: "Plantilla actualizada exitosamente.",
      };
    } catch (err: any) {
      Logger.error(`Error guardando template ${eventKey}`, err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", "Error interno al guardar la plantilla.");
    }
  }
);

// ─── 3. CALLABLE: adminResetNotificationTemplate ─────────────────────────────

export const adminResetNotificationTemplate = functions.https.onCall(
  async (data: { eventKey: string }, context) => {
    const { uid } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR", "admin", "super_admin", "auditor", "supervisor"],
        requiredFields: ["eventKey"],
      },
      "adminResetNotificationTemplate"
    );

    const eventKey = (data.eventKey || "").trim();
    const baseDefault = CANONICAL_TEMPLATE_DEFAULTS[eventKey];

    if (!baseDefault) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El EventKey '${eventKey}' no es válido.`
      );
    }

    try {
      const docRef = db.collection("notification_templates").doc(eventKey);
      const existingDoc = await docRef.get();
      const currentVersion = existingDoc.exists ? (existingDoc.data()?.version || 1) : 1;
      const newVersion = currentVersion + 1;

      const callerUser = await admin.auth().getUser(uid).catch(() => null);
      const callerEmail = callerUser?.email || "admin@tuanigo.com";

      const templatePayload: Partial<NotificationTemplateDefinition> = {
        eventKey,
        pushTitle: baseDefault.defaultPushTitle,
        pushBody: baseDefault.defaultPushBody,
        enabled: true,
        version: newVersion,
        updatedAt: FieldValue.serverTimestamp() as any,
        updatedBy: uid,
        updatedByEmail: callerEmail,
      };

      await docRef.set(templatePayload, { merge: true });

      // Guardar versión histórica
      await docRef.collection("versions").doc(`v${newVersion}`).set({
        ...templatePayload,
        resetToDefault: true,
        savedAt: FieldValue.serverTimestamp(),
        savedBy: uid,
        savedByEmail: callerEmail,
      });

      NotificationTemplateService.invalidateCache(eventKey);

      await db.collection("audit_events").add({
        event: "NOTIFICATION_TEMPLATE_RESET",
        eventKey,
        version: newVersion,
        restoredTitle: baseDefault.defaultPushTitle,
        restoredBody: baseDefault.defaultPushBody,
        updatedBy: uid,
        updatedByEmail: callerEmail,
        timestamp: FieldValue.serverTimestamp(),
      });

      Logger.info(`[NOTIFICATION_TEMPLATE] Plantilla ${eventKey} restaurada a predeterminado de fábrica (v${newVersion})`);

      return {
        success: true,
        eventKey,
        version: newVersion,
        pushTitle: baseDefault.defaultPushTitle,
        pushBody: baseDefault.defaultPushBody,
        message: "Plantilla restaurada a valores predeterminados.",
      };
    } catch (err: any) {
      Logger.error(`Error restaurando template ${eventKey}`, err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", "Error al restaurar plantilla.");
    }
  }
);

// ─── 4. CALLABLE: adminSendTestNotificationTemplate ──────────────────────────

export const adminSendTestNotificationTemplate = functions.https.onCall(
  async (data: { eventKey: string }, context) => {
    const { uid } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR", "admin", "super_admin", "auditor", "supervisor"],
        requiredFields: ["eventKey"],
      },
      "adminSendTestNotificationTemplate"
    );

    const eventKey = (data.eventKey || "").trim();
    const baseDefault = CANONICAL_TEMPLATE_DEFAULTS[eventKey];

    if (!baseDefault) {
      throw new functions.https.HttpsError("invalid-argument", `EventKey '${eventKey}' no válido.`);
    }

    try {
      // 1. Obtener tokens del administrador actual exclusivamente (CERO broadcast)
      const devicesSnap = await db
        .collection("user_devices")
        .where("uid", "==", uid)
        .where("isActive", "==", true)
        .get();

      const tokens: string[] = [];
      devicesSnap.forEach((doc) => {
        const d = doc.data();
        const t = (d.fcmToken || d.token || "").toString().trim();
        if (t && t.length > 20 && !tokens.includes(t)) {
          tokens.push(t);
        }
      });

      // 2. Variables de prueba representativas
      const testContext: Record<string, any> = {
        customerName: "Admin Test",
        orderCode: "PRUEBA-101",
        businessName: "Restaurante Demo TuaniGo",
        courierName: "Motorizado TuaniGo",
        total: "250.00",
        fulfillmentType: "🛵 Envío Delivery",
        destinationAddress: "Rotonda El Güegüense 2c al lago",
        originAddress: "Plaza España",
        courierEarnings: "55.00",
        distanceKm: "3.2",
        cancelReason: "Prueba de cancelación de sistema",
        rejectionReason: "Referencia ilegible en prueba",
        tripShortCode: "TRIP-77",
        amount: "150.00",
        packageDescription: "Documentos",
        payer: "Remitente",
        customerOffer: "80.00",
        radiusKm: "2.5",
        ticketId: "TKT-001",
        subject: "Consulta técnica de prueba",
        messageText: "Este es un mensaje de prueba del sistema.",
        senderName: "Soporte Central",
      };

      const resolved = await NotificationTemplateService.resolve(eventKey, testContext);

      let pushSent = false;
      let failureReason = "";

      if (tokens.length > 0) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: `[TEST] ${resolved.title}`,
            body: resolved.body,
          },
          data: {
            action: resolved.action,
            destinationRoute: resolved.destinationRoute,
            screen: resolved.destinationRoute,
            title: `[TEST] ${resolved.title}`,
            body: resolved.body,
            category: resolved.category,
            priority: resolved.priority,
            test: "true",
            eventKey,
          },
          android: {
            priority: "high",
            directBootOk: true,
          } as any,
        });

        pushSent = response.successCount > 0;
        if (!pushSent && response.failureCount > 0) {
          failureReason = response.responses[0]?.error?.message || "Fallo en despacho FCM";
        }
      } else {
        failureReason = "No se encontraron dispositivos activos registrados para tu usuario en /user_devices.";
      }

      // También persistir en buzón in-app del administrador como prueba
      const testNotifId = `test_${eventKey}_${Date.now()}`;
      await db.collection("users").doc(uid).collection("notifications").doc(testNotifId).set({
        id: testNotifId,
        notificationId: testNotifId,
        title: `[TEST] ${resolved.title}`,
        body: resolved.body,
        category: resolved.category,
        type: eventKey,
        action: resolved.action,
        destinationRoute: resolved.destinationRoute,
        isRead: false,
        read: false,
        deletedByUser: false,
        visibilityStatus: "VISIBLE",
        isTest: true,
        createdAt: FieldValue.serverTimestamp(),
        sentAt: FieldValue.serverTimestamp(),
      });

      // Auditoría
      await db.collection("audit_events").add({
        event: "NOTIFICATION_TEMPLATE_TEST_SENT",
        eventKey,
        targetUid: uid,
        deviceCount: tokens.length,
        pushSent,
        failureReason: failureReason || null,
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        eventKey,
        pushSent,
        deviceCount: tokens.length,
        resolvedTitle: resolved.title,
        resolvedBody: resolved.body,
        inAppSaved: true,
        message: pushSent
          ? `Notificación de prueba enviada a ${tokens.length} dispositivo(s).`
          : `Notificación guardada en buzón In-App. (Aviso Push: ${failureReason})`,
      };
    } catch (err: any) {
      Logger.error(`Error enviando test para ${eventKey}`, err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", "Error al enviar notificación de prueba.");
    }
  }
);
