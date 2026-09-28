/**
 * BlueSystem Delivery Enterprise — Email Templates & SMTP Administration
 * Callables HTTPS para el Admin Web (Módulo Email Templates)
 *
 * Funcionalidades:
 * 1. adminGetEmailTemplates: Lista plantillas registradas (con defaults del sistema).
 * 2. adminSaveEmailTemplate: Valida variables, sanitiza HTML y guarda versión.
 * 3. adminSendTestEmail: Dispara correo de prueba seguro con datos ficticios.
 * 4. adminGetEmailEventsHistory: Consulta historial de entregas (/email_events).
 * 5. adminVerifySmtpConnection: Verifica conectividad y autenticación con el servidor SMTP.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";
import {
  EmailService,
  EmailTemplateEngine,
  EmailTemplateDefinition,
  HtmlSanitizer,
  SmtpEmailTransport,
} from "../services/emailService";

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── 1. CALLABLE: adminGetEmailTemplates ──────────────────────────────────────

export const adminGetEmailTemplates = functions.https.onCall(
  async (data: { tenantId?: string }, context) => {
    validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
      },
      "adminGetEmailTemplates"
    );

    try {
      const systemDefaults = EmailTemplateEngine.getSystemTemplates();
      const templatesMap = new Map<string, EmailTemplateDefinition>();

      // Cargar defaults
      for (const t of systemDefaults) {
        templatesMap.set(t.templateId, { ...t });
      }

      // Cargar overrides en Firestore
      const snap = await db.collection("email_templates").get();
      snap.forEach((doc) => {
        const customData = doc.data() as EmailTemplateDefinition;
        if (customData && customData.templateId) {
          templatesMap.set(customData.templateId, {
            ...templatesMap.get(customData.templateId),
            ...customData,
          });
        }
      });

      return {
        success: true,
        templates: Array.from(templatesMap.values()),
      };
    } catch (err: any) {
      Logger.error("[EMAIL-ADMIN] Error listando plantillas:", err?.message);
      throw new functions.https.HttpsError("internal", "Error al obtener plantillas de correo.");
    }
  }
);

// ─── 2. CALLABLE: adminSaveEmailTemplate ──────────────────────────────────────

export const adminSaveEmailTemplate = functions.https.onCall(
  async (
    data: {
      templateId: string;
      subject: string;
      title: string;
      htmlContent: string;
      buttonLabel?: string;
      buttonUrl?: string;
      status: "ACTIVE" | "INACTIVE";
      allowedVariables?: string[];
      tenantId?: string;
    },
    context
  ) => {
    const { uid } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
        requiredFields: ["templateId", "subject", "htmlContent"],
      },
      "adminSaveEmailTemplate"
    );

    const templateId = data.templateId.trim();

    // 1. Obtener la definición base para conocer variables permitidas
    let baseTemplate: EmailTemplateDefinition | undefined;
    try {
      baseTemplate = await EmailTemplateEngine.resolveTemplate(templateId);
    } catch {
      // Si no existe, usar las variables enviadas
    }

    const allowedVariables =
      data.allowedVariables || baseTemplate?.allowedVariables || ["platformName", "tenantName", "supportEmail", "year"];

    // 2. Validación estricta de variables en subject, title, html y buttonUrl
    const fullContent = `${data.subject} ${data.title || ""} ${data.htmlContent} ${data.buttonUrl || ""}`;
    const validation = EmailTemplateEngine.validateVariables(fullContent, allowedVariables);

    if (!validation.isValid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Variables inválidas o no permitidas detectadas: ${validation.invalidVariables.join(", ")}`
      );
    }

    // 3. Validación de URL en botón CTA
    if (data.buttonUrl && data.buttonUrl.trim()) {
      const isSafe = HtmlSanitizer.isSafeUrl(data.buttonUrl.trim());
      const hasVariableUrl = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(data.buttonUrl);
      if (!isSafe && !hasVariableUrl) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "La URL del botón debe utilizar el protocolo seguro https:// o una variable permitida."
        );
      }
    }

    // 4. Sanitización de HTML
    const sanitizedHtml = HtmlSanitizer.sanitize(data.htmlContent);

    // 5. Incrementar versión y persistir
    const docRef = db.collection("email_templates").doc(templateId);
    const existingDoc = await docRef.get();
    const currentVersion = existingDoc.exists ? (existingDoc.data()?.version || 1) : (baseTemplate?.version || 1);
    const newVersion = currentVersion + 1;

    const templatePayload: Partial<EmailTemplateDefinition> = {
      templateId,
      version: newVersion,
      name: baseTemplate?.name || templateId,
      description: baseTemplate?.description || "",
      audience: baseTemplate?.audience || "SYSTEM",
      eventType: baseTemplate?.eventType || "CUSTOM",
      subject: data.subject.trim(),
      title: (data.title || "").trim(),
      htmlContent: sanitizedHtml,
      buttonLabel: (data.buttonLabel || "").trim(),
      buttonUrl: (data.buttonUrl || "").trim(),
      allowedVariables,
      status: data.status || "ACTIVE",
      tenantId: data.tenantId || "ten_bluesystem_core",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    };

    await docRef.set(templatePayload, { merge: true });

    // 6. Guardar versión histórica inmutable
    await docRef.collection("versions").doc(`v${newVersion}`).set({
      ...templatePayload,
      savedAt: FieldValue.serverTimestamp(),
      savedBy: uid,
    });

    // 7. Registro en auditoría
    try {
      await db.collection("audit_events").add({
        event: "EMAIL_TEMPLATE_UPDATED",
        domain: "EMAIL_ADMIN",
        templateId,
        version: newVersion,
        actorUid: uid,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch {
      // No bloqueante
    }

    Logger.info(`[EMAIL-ADMIN] Plantilla ${templateId} actualizada a versión ${newVersion} por ${uid}`);

    return {
      success: true,
      templateId,
      version: newVersion,
      message: `Plantilla ${templateId} guardada exitosamente (v${newVersion}).`,
    };
  }
);

// ─── 3. CALLABLE: adminSendTestEmail ──────────────────────────────────────────

export const adminSendTestEmail = functions.https.onCall(
  async (
    data: {
      templateId: string;
      recipient: string;
      sampleVariables?: Record<string, string>;
      tenantId?: string;
    },
    context
  ) => {
    const { uid } = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
        requiredFields: ["templateId", "recipient"],
      },
      "adminSendTestEmail"
    );

    const cleanRecipient = data.recipient.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanRecipient)) {
      throw new functions.https.HttpsError("invalid-argument", "El formato del correo destinatario es inválido.");
    }

    try {
      const result = await EmailService.sendTestEmail({
        templateId: data.templateId,
        recipient: cleanRecipient,
        sampleVariables: data.sampleVariables,
        adminUid: uid,
        tenantId: data.tenantId,
      });

      return result;
    } catch (err: any) {
      Logger.error("[EMAIL-ADMIN] Error en envío de prueba:", err?.message);
      throw new functions.https.HttpsError("internal", `Fallo al enviar correo de prueba: ${err?.message}`);
    }
  }
);

// ─── 4. CALLABLE: adminGetEmailEventsHistory ──────────────────────────────────

export const adminGetEmailEventsHistory = functions.https.onCall(
  async (
    data: {
      limit?: number;
      eventType?: string;
      status?: string;
      recipient?: string;
    },
    context
  ) => {
    validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
      },
      "adminGetEmailEventsHistory"
    );

    try {
      const maxLimit = Math.min(data?.limit || 50, 100);
      let query: FirebaseFirestore.Query = db.collection("email_events").orderBy("createdAt", "desc").limit(maxLimit);

      if (data?.eventType) {
        query = query.where("eventType", "==", data.eventType.trim());
      }
      if (data?.status) {
        query = query.where("status", "==", data.status.trim().toUpperCase());
      }

      const snap = await query.get();
      const events: any[] = [];

      snap.forEach((doc) => {
        const item = doc.data();
        events.push({
          eventId: doc.id,
          eventType: item.eventType || "UNKNOWN",
          recipient: item.recipient || "",
          subject: item.subject || "",
          templateId: item.templateId || "",
          templateVersion: item.templateVersion || 1,
          status: item.status || "UNKNOWN",
          attempts: item.attempts || item.attempt || 1,
          providerMessageId: item.providerMessageId || null,
          error: item.error || null,
          errorCategory: item.errorCategory || null,
          createdAt: item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : null,
          sentAt: item.sentAt?.toDate ? item.sentAt.toDate().toISOString() : null,
          failedAt: item.failedAt?.toDate ? item.failedAt.toDate().toISOString() : null,
        });
      });

      return {
        success: true,
        events,
      };
    } catch (err: any) {
      Logger.error("[EMAIL-ADMIN] Error consultando historial:", err?.message);
      throw new functions.https.HttpsError("internal", "Error al obtener historial de entregas de email.");
    }
  }
);

// ─── 5. CALLABLE: adminVerifySmtpConnection ───────────────────────────────────

export const adminVerifySmtpConnection = functions.https.onCall(async (data, context) => {
  validateCallableContext(
    context,
    data,
    {
      requireAuth: true,
      requireAppCheck: true,
      allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
    },
    "adminVerifySmtpConnection"
  );

  try {
    const transport = new SmtpEmailTransport();
    const result = await transport.verifyConnectionDetailed();

    return {
      success: result.success,
      host: result.details.host,
      port: result.details.port,
      user: result.details.user,
      passwordStatus: result.details.passwordStatus,
      phase: result.phase,
      status: result.success ? "CONNECTED" : "FAILED",
      errorCategory: result.errorCategory,
      message: result.success
        ? `Conexión y autenticación SMTP exitosa (${result.details.host}:${result.details.port}).`
        : (result.errorMessage || "No se pudo establecer conexión con el servidor SMTP corporativo."),
    };
  } catch (err: any) {
    return {
      success: false,
      status: "FAILED",
      phase: "UNKNOWN",
      error: err?.message || "Error desconocido verificando SMTP",
    };
  }
});
