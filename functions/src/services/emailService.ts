/**
 * BlueSystem Delivery Enterprise — Sistema Centralizado de Email Transaccional Enterprise
 * Protocolo: BSD-ACT20-TRANSACTIONAL-EMAIL-ENTERPRISE-001
 *
 * Características:
 * 1. ONE EMAIL SERVICE: Único punto centralizado de despacho transaccional.
 * 2. SMTP CORPORATIVO: mail.bluesystemdelivery.com:465 (SSL/TLS nativo, noreply@bluesystemdelivery.com).
 * 3. TEMPLATE ENGINE: Resolución dinámica de plantillas (/email_templates), validación de variables y sanitización HTML.
 * 4. IDEMPOTENCY & LOGS: Control de concurrencia y persistencia unificada en /email_events/{eventId}.
 * 5. RETRY & ERROR CLASSIFICATION: Reintentos controlados con backoff exponencial y clasificación estricta de errores.
 * 6. ZERO CREDENTIAL EXPOSURE: Ninguna contraseña ni credencial en logs o base de datos.
 */

import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { Logger } from "../shared/logger/logger";
import { SecretService } from "../config/secretManager";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Tipos y Modelos Canónicos ────────────────────────────────────────────────

export type EmailEventStatus = "QUEUED" | "SENDING" | "SENT" | "FAILED" | "RETRYING" | "SKIPPED";

export type EmailErrorCategory =
  | "AUTHENTICATION_ERROR"
  | "CONNECTION_ERROR"
  | "TIMEOUT"
  | "TLS_ERROR"
  | "SMTP_4XX"
  | "SMTP_5XX"
  | "INVALID_RECIPIENT"
  | "CONFIGURATION_ERROR"
  | "TEMPLATE_ERROR"
  | "VARIABLE_ERROR"
  | "UNKNOWN";

export interface EmailEventResult {
  success: boolean;
  status: "SENT" | "SKIPPED" | "FAILED";
  eventId?: string;
  providerMessageId?: string;
  error?: string;
  errorCategory?: EmailErrorCategory;
  attempts?: number;
}

export interface EmailTemplateDefinition {
  templateId: string;
  version: number;
  name: string;
  description: string;
  audience: "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN" | "SYSTEM";
  eventType: string;
  subject: string;
  title: string;
  htmlContent: string;
  plainTextContent?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  allowedVariables: string[];
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  tenantId?: string;
  updatedAt?: any;
  updatedBy?: string;
}

// ─── 1. Sanitizador HTML y Validador de Seguridad ─────────────────────────────

export class HtmlSanitizer {
  /**
   * Sanitiza código HTML eliminando etiquetas y atributos peligrosos (XSS, scripts, iframes).
   */
  public static sanitize(html: string): string {
    if (!html) return "";
    let sanitized = html;

    // Eliminar etiquetas script, iframe, object, embed, applet, form
    sanitized = sanitized.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "");
    sanitized = sanitized.replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "");
    sanitized = sanitized.replace(/<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "");
    sanitized = sanitized.replace(/<\s*embed[^>]*>[\s\S]*?<\s*\/\s*embed\s*>/gi, "");
    sanitized = sanitized.replace(/<\s*applet[^>]*>[\s\S]*?<\s*\/\s*applet\s*>/gi, "");
    sanitized = sanitized.replace(/<\s*form[^>]*>[\s\S]*?<\s*\/\s*form\s*>/gi, "");

    // Eliminar manejadores de eventos JavaScript (onclick, onerror, onload, onmouseover, etc.)
    sanitized = sanitized.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
    sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]+/gi, "");

    // Eliminar pseudoprotocolos peligrosos en enlaces (javascript:, data:, vbscript:)
    sanitized = sanitized.replace(/href\s*=\s*(['"])\s*(javascript|data|vbscript):.*?\1/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'src=""');

    return sanitized;
  }

  /**
   * Valida que una URL utilice estrictamente protocolos seguros (https:// o mailto:).
   */
  public static isSafeUrl(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.trim().toLowerCase();
    return cleanUrl.startsWith("https://") || cleanUrl.startsWith("mailto:");
  }

  /**
   * Convierte HTML básico a texto plano estructurado.
   */
  public static htmlToPlainText(html: string): string {
    if (!html) return "";
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<hr\s*[\/]?>/gi, "\n----------------------------------------\n")
      .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, "$3 ($2)")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

// ─── 2. Abstracción de Transporte SMTP ────────────────────────────────────────

export interface EmailTransport {
  send(options: {
    to: string;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string; response?: string }>;
  verifyConnection(): Promise<boolean>;
}

export class SmtpEmailTransport implements EmailTransport {
  private transporter: nodemailer.Transporter | null = null;
  private currentConfigKey = "";

  private async getTransporter(): Promise<nodemailer.Transporter> {
    const host = process.env.SMTP_HOST || "mail.bluesystemdelivery.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER || "noreply@bluesystemdelivery.com";

    let password = "";
    try {
      password = await SecretService.getInstance().getSecret("SMTP_PASSWORD");
    } catch {
      password = process.env.SMTP_PASSWORD || "";
    }

    const configKey = `${host}:${port}:${user}:${password ? "set" : "empty"}`;

    if (this.transporter && this.currentConfigKey === configKey) {
      return this.transporter;
    }

    if (!password) {
      Logger.warn("[EMAIL-SMTP] ⚠️ SMTP_PASSWORD no configurada en Secret Manager ni en variables de entorno.");
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true para 465 SSL/TLS nativo
      auth: {
        user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_STRICT_TLS === "true",
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });

    this.currentConfigKey = configKey;
    return this.transporter;
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      return true;
    } catch (err: any) {
      Logger.error("[EMAIL-SMTP] Fallo en la verificación de conexión SMTP:", err?.message);
      return false;
    }
  }

  public async verifyConnectionDetailed(): Promise<{
    success: boolean;
    phase: "CONFIG" | "DNS_NETWORK" | "TLS" | "AUTH" | "UNKNOWN" | "CONNECTED";
    errorCategory: EmailErrorCategory;
    errorMessage?: string;
    details: {
      host: string;
      port: number;
      user: string;
      passwordStatus: "CONFIGURED" | "MISSING";
    };
  }> {
    const host = process.env.SMTP_HOST || "mail.bluesystemdelivery.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER || "noreply@bluesystemdelivery.com";

    let password = "";
    try {
      password = await SecretService.getInstance().getSecret("SMTP_PASSWORD");
    } catch {
      password = process.env.SMTP_PASSWORD || "";
    }

    const maskedUser = user.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`);
    const details = {
      host,
      port,
      user: maskedUser,
      passwordStatus: (password && password.trim().length > 0 ? "CONFIGURED" : "MISSING") as "CONFIGURED" | "MISSING",
    };

    if (!password || password.trim().length === 0) {
      Logger.warn("[EMAIL-SMTP] Diagnóstico: Falta configuración de SMTP_PASSWORD en el runtime.", {
        host,
        port,
        user: maskedUser,
      });
      return {
        success: false,
        phase: "CONFIG",
        errorCategory: "CONFIGURATION_ERROR",
        errorMessage: "La variable SMTP_PASSWORD no está disponible en las variables de entorno ni en Secret Manager.",
        details,
      };
    }

    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      Logger.info("[EMAIL-SMTP] 🟢 Verificación SMTP exitosa contra el servidor corporativo.", {
        host,
        port,
        user: maskedUser,
      });
      return {
        success: true,
        phase: "CONNECTED",
        errorCategory: "UNKNOWN",
        errorMessage: undefined,
        details,
      };
    } catch (err: any) {
      const errorCategory = EmailErrorClassifier.classify(err);
      let phase: "CONFIG" | "DNS_NETWORK" | "TLS" | "AUTH" | "UNKNOWN" = "UNKNOWN";

      if (errorCategory === "AUTHENTICATION_ERROR") phase = "AUTH";
      else if (errorCategory === "TLS_ERROR") phase = "TLS";
      else if (errorCategory === "CONNECTION_ERROR" || errorCategory === "TIMEOUT") phase = "DNS_NETWORK";
      else if (errorCategory === "CONFIGURATION_ERROR") phase = "CONFIG";

      Logger.error(`[EMAIL-SMTP] 🔴 Fallo en verificación SMTP (${phase}): ${err?.message}`, {
        host,
        port,
        user: maskedUser,
        errorCategory,
      });

      return {
        success: false,
        phase,
        errorCategory,
        errorMessage: err?.message || "Error al conectar con el servidor SMTP corporativo.",
        details,
      };
    }
  }

  public async send(options: {
    to: string;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string; response?: string }> {
    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: `"${options.fromName}" <${options.fromEmail}>`,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      messageId: info.messageId || `smtp_${Date.now()}`,
      response: info.response,
    };
  }
}

// ─── 3. Clasificador de Errores SMTP & Template ───────────────────────────────

export class EmailErrorClassifier {
  public static classify(error: any): EmailErrorCategory {
    if (!error) return "UNKNOWN";
    const msg = (error.message || "").toLowerCase();
    const code = (error.code || "").toString().toLowerCase();

    if (msg.includes("auth") || msg.includes("535") || msg.includes("credentials") || msg.includes("invalid login")) {
      return "AUTHENTICATION_ERROR";
    }
    if (msg.includes("certificate") || msg.includes("tls") || msg.includes("ssl") || code === "esocket") {
      return "TLS_ERROR";
    }
    if (msg.includes("timeout") || msg.includes("etimedout") || code === "etimedout") {
      return "TIMEOUT";
    }
    if (msg.includes("econnrefused") || msg.includes("enotfound") || msg.includes("connection")) {
      return "CONNECTION_ERROR";
    }
    if (msg.includes("variable") || msg.includes("missing variable") || msg.includes("unknown variable")) {
      return "VARIABLE_ERROR";
    }
    if (msg.includes("template") || msg.includes("sanitize")) {
      return "TEMPLATE_ERROR";
    }
    if (msg.includes("recipient") || msg.includes("550") || msg.includes("553") || msg.includes("mailbox")) {
      return "INVALID_RECIPIENT";
    }
    if (msg.includes("421") || msg.includes("450") || msg.includes("451") || msg.includes("452")) {
      return "SMTP_4XX";
    }
    if (msg.includes("500") || msg.includes("501") || msg.includes("502") || msg.includes("503") || msg.includes("504")) {
      return "SMTP_5XX";
    }
    return "UNKNOWN";
  }

  public static isPermanentError(category: EmailErrorCategory): boolean {
    return (
      category === "INVALID_RECIPIENT" ||
      category === "VARIABLE_ERROR" ||
      category === "TEMPLATE_ERROR" ||
      category === "CONFIGURATION_ERROR"
    );
  }
}

// ─── 4. Motor de Plantillas Dinámico Enterprise ───────────────────────────────

export class EmailTemplateEngine {
  private static defaultTemplates: Record<string, EmailTemplateDefinition> = {
    // 1. Cliente: Bienvenida
    customer_welcome: {
      templateId: "customer_welcome",
      version: 1,
      name: "Bienvenida a Cliente",
      description: "Enviado cuando un usuario cliente completa su registro en la aplicación.",
      audience: "CUSTOMER",
      eventType: "CUSTOMER_REGISTERED",
      subject: "¡Te damos la bienvenida a {{platformName}}!",
      title: "¡Bienvenido a la mejor experiencia gastronómica!",
      htmlContent: `
        <p>Hola <strong>{{customerName}}</strong>,</p>
        <p>Tu cuenta en <strong>{{platformName}}</strong> ha sido creada exitosamente. Ya puedes explorar los mejores comercios, disfrutar ofertas exclusivas y recibir tus pedidos con entrega express.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 24px 0; border: 1px solid #334155;">
          <p style="margin: 0; font-size: 13px; color: #94A3B8;">Usuario registrado:</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #38BDF8; font-weight: 700;">{{email}}</p>
        </div>
      `,
      buttonLabel: "Explorar Comercios",
      buttonUrl: "https://bluesystemdelivery.com",
      allowedVariables: ["customerName", "email", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 2. Comercio: Solicitud Recibida
    merchant_application_received: {
      templateId: "merchant_application_received",
      version: 1,
      name: "Comercio — Solicitud Recibida",
      description: "Confirmación de recepción de solicitud de afiliación comercial.",
      audience: "MERCHANT",
      eventType: "MERCHANT_REGISTERED",
      subject: "Solicitud Recibida — {{businessName}} | {{platformName}}",
      title: "¡Hemos recibido tu solicitud de afiliación comercial!",
      htmlContent: `
        <p>Hola <strong>{{contactName}}</strong>,</p>
        <p>Confirmamos la recepción exitosa de la solicitud de afiliación comercial para <strong>{{businessName}}</strong>.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #38BDF8;">
          <p style="margin: 0; font-size: 12px; color: #94A3B8; font-weight: 700; text-transform: uppercase;">Número de Trámite / ID Solicitud</p>
          <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 16px; color: #38BDF8; font-weight: 700;">{{appId}}</p>
        </div>
        <p>Nuestro equipo de gobernanza revisará los datos e información legal de tu negocio en un plazo de <strong>24 a 48 horas</strong>.</p>
      `,
      buttonLabel: "Consultar Estado del Trámite",
      buttonUrl: "https://registro.bluesystemdelivery.com/status?email={{email}}",
      allowedVariables: ["appId", "email", "contactName", "businessName", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 3. Comercio: Solicitud Aprobada
    merchant_application_approved: {
      templateId: "merchant_application_approved",
      version: 1,
      name: "Comercio — Aprobación & Activación",
      description: "Notificación oficial de aprobación y aprovisionamiento EIAM del comercio.",
      audience: "MERCHANT",
      eventType: "MERCHANT_APPROVED",
      subject: "🎉 ¡Tu comercio ha sido aprobado! — {{businessName}} | {{platformName}}",
      title: "🎉 ¡Tu comercio ha sido aprobado exitosamente!",
      htmlContent: `
        <p>Estimado/a <strong>{{contactName}}</strong>,</p>
        <p>Nos alegra informarte que la solicitud de afiliación para <strong>{{businessName}}</strong> ha sido aprobada por el Centro de Gobernanza. Tus entidades EIAM y sucursal principal han sido configuradas.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
          <h3 style="color: #38BDF8; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Datos de Acceso Comercial</h3>
          <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Usuario / Email:</strong> {{email}}</p>
          <p style="margin: 8px 0; font-size: 13px; color: #CBD5E1;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background-color: #1E293B; padding: 3px 8px; border-radius: 4px; color: #38BDF8; font-weight: 700; letter-spacing: 0.5px; border: 1px solid #475569;">{{tempPassword}}</span></p>
          <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Business ID:</strong> <span style="font-family: monospace;">{{businessId}}</span></p>
        </div>
        <p style="color: #F59E0B; font-size: 13px; font-weight: 600;">
          ⚠️ Por razones de seguridad, ingresa a la plataforma con estas credenciales y cambia tu contraseña desde tu perfil al iniciar sesión.
        </p>
      `,
      buttonLabel: "Ingresar a Merchant Web",
      buttonUrl: "https://comercio.bluesystemdelivery.com",
      allowedVariables: ["appId", "email", "contactName", "businessName", "businessId", "tempPassword", "activationLink", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 4. Comercio: Rechazado
    merchant_application_rejected: {
      templateId: "merchant_application_rejected",
      version: 1,
      name: "Comercio — Solicitud No Aprobada",
      description: "Notificación de rechazo de solicitud de comercio con motivo.",
      audience: "MERCHANT",
      eventType: "MERCHANT_APPLICATION_REJECTED",
      subject: "Actualización sobre tu solicitud comercial — {{businessName}}",
      title: "Actualización sobre tu solicitud de afiliación",
      htmlContent: `
        <p>Estimado/a <strong>{{contactName}}</strong>,</p>
        <p>Te informamos que luego de la evaluación de la solicitud para <strong>{{businessName}}</strong> (ID: <span style="font-family: monospace;">{{appId}}</span>), esta no ha sido aprobada en este momento.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <p style="margin: 0; font-size: 12px; color: #F87171; font-weight: 700; text-transform: uppercase;">Motivo de la Decisión</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #E2E8F0; line-height: 1.5;">{{rejectionReason}}</p>
        </div>
        <p>Si consideras que existe algún error o deseas enviar información actualizada, puedes responder a este correo o contactarnos en {{supportEmail}}.</p>
      `,
      buttonLabel: "Contactar a Soporte",
      buttonUrl: "mailto:{{supportEmail}}",
      allowedVariables: ["appId", "email", "contactName", "businessName", "rejectionReason", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 5. Comercio: Documentos Requeridos
    merchant_application_docs_requested: {
      templateId: "merchant_application_docs_requested",
      version: 1,
      name: "Comercio — Documentación Adicional Requerida",
      description: "Notificación solicitando documentos o correcciones al postulante.",
      audience: "MERCHANT",
      eventType: "MERCHANT_DOCS_REQUESTED",
      subject: "📑 Necesitamos documentación adicional — {{businessName}} | {{platformName}}",
      title: "Documentos Adicionales Requeridos",
      htmlContent: `
        <p>Hola <strong>{{contactName}}</strong>,</p>
        <p>El equipo de gobernanza está revisando la solicitud de <strong>{{businessName}}</strong> y requiere la siguiente información o documentos adicionales:</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p style="margin: 0; font-size: 12px; color: #F59E0B; font-weight: 700; text-transform: uppercase;">Instrucciones del Equipo de Gobernanza</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #E2E8F0; line-height: 1.5;">{{docsNote}}</p>
        </div>
      `,
      buttonLabel: "Adjuntar Documentación",
      buttonUrl: "https://registro.bluesystemdelivery.com/status?email={{email}}",
      allowedVariables: ["appId", "email", "contactName", "businessName", "docsNote", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 6. Motorizado: Solicitud Recibida
    courier_application_received: {
      templateId: "courier_application_received",
      version: 1,
      name: "Motorizado — Solicitud Recibida",
      description: "Confirmación de registro de aspirante a motorizado.",
      audience: "COURIER",
      eventType: "COURIER_REGISTERED",
      subject: "Solicitud de Repartidor Recibida — {{platformName}}",
      title: "¡Hemos recibido tu solicitud para unirte a la flota!",
      htmlContent: `
        <p>Hola <strong>{{candidateName}}</strong>,</p>
        <p>Confirmamos la recepción de tu solicitud para integrarte como motorizado repartidor en <strong>{{platformName}}</strong>.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>ID Solicitud:</strong> <span style="font-family: monospace; color: #38BDF8;">{{appId}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Placa Registrada:</strong> <span style="font-family: monospace;">{{plate}}</span></p>
        </div>
        <p>Nuestro equipo validará tus documentos y antecedentes en un lapso de 24 a 48 horas hábiles.</p>
      `,
      buttonLabel: "Ver Estado de Solicitud",
      buttonUrl: "https://bluesystemdelivery.com",
      allowedVariables: ["appId", "email", "candidateName", "plate", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 7. Motorizado: Solicitud Aprobada
    courier_application_approved: {
      templateId: "courier_application_approved",
      version: 1,
      name: "Motorizado — Aprobación & Activación",
      description: "Aprobación oficial de repartidor con credenciales de acceso a la Courier App.",
      audience: "COURIER",
      eventType: "COURIER_APPROVED",
      subject: "🎉 ¡Tu solicitud de repartidor ha sido aprobada! — {{platformName}}",
      title: "🎉 ¡Bienvenido a la Flota de Repartidores!",
      htmlContent: `
        <p>Estimado/a <strong>{{candidateName}}</strong>,</p>
        <p>Nos complace informarte que tu solicitud como motorizado ha sido <strong>aprobada exitosamente</strong>. Tu cuenta operativa ha sido habilitada.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #10B981;">
          <h3 style="color: #34D399; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Detalles de Acceso</h3>
          <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Usuario / Email:</strong> {{email}}</p>
          <p style="margin: 8px 0; font-size: 13px; color: #CBD5E1;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background-color: #1E293B; padding: 3px 8px; border-radius: 4px; color: #34D399; font-weight: 700; letter-spacing: 0.5px; border: 1px solid #059669;">{{tempPassword}}</span></p>
          <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Placa Registrada:</strong> {{plate}}</p>
          <p style="margin: 6px 0; font-size: 13px; color: #CBD5E1;"><strong>Courier ID:</strong> <span style="font-family: monospace;">{{courierId}}</span></p>
        </div>
        <p style="color: #94A3B8; font-size: 13px; line-height: 1.5;">
          Descarga o abre la aplicación de repartidores en tu dispositivo móvil e inicia sesión con estas credenciales para comenzar tu turno y recibir órdenes de entrega.
        </p>
      `,
      buttonLabel: "",
      buttonUrl: "",
      allowedVariables: ["appId", "email", "candidateName", "plate", "courierId", "tempPassword", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 8. Motorizado: Solicitud Rechazada
    courier_application_rejected: {
      templateId: "courier_application_rejected",
      version: 1,
      name: "Motorizado — Solicitud No Aprobada",
      description: "Notificación de rechazo de postulación de motorizado.",
      audience: "COURIER",
      eventType: "COURIER_APPLICATION_REJECTED",
      subject: "Actualización de Solicitud de Repartidor — {{platformName}}",
      title: "Actualización de tu postulación",
      htmlContent: `
        <p>Estimado/a <strong>{{candidateName}}</strong>,</p>
        <p>Te informamos que luego de la evaluación de tu postulación como repartidor (ID: {{appId}}), esta no ha sido aprobada.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <p style="margin: 0; font-size: 12px; color: #F87171; font-weight: 700; text-transform: uppercase;">Motivo</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #E2E8F0; line-height: 1.5;">{{rejectionReason}}</p>
        </div>
      `,
      buttonLabel: "Contactar a Soporte",
      buttonUrl: "mailto:{{supportEmail}}",
      allowedVariables: ["appId", "email", "candidateName", "rejectionReason", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 9. Usuario: Restablecimiento de Contraseña
    user_password_reset: {
      templateId: "user_password_reset",
      version: 1,
      name: "Seguridad — Restablecimiento de Contraseña",
      description: "Enlace seguro de un solo uso para restablecer la contraseña.",
      audience: "SYSTEM",
      eventType: "USER_PASSWORD_RESET",
      subject: "🔑 Restablecimiento de Contraseña — {{platformName}}",
      title: "Solicitud de Restablecimiento de Contraseña",
      htmlContent: `
        <p>Hola <strong>{{contactName}}</strong>,</p>
        <p>Se ha generado una solicitud segura para restablecer la contraseña de acceso a tu cuenta (<strong>{{email}}</strong>).</p>
        {{reasonNote}}
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
          <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 600;">ENLACE DIRECTO (Si el botón no funciona):</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #818CF8; word-break: break-all; font-family: monospace;">{{resetLink}}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
          ⚠ Este enlace es de un solo uso y expirará por seguridad. Tu contraseña actual permanecerá activa hasta que confirmes el cambio.
        </p>
      `,
      buttonLabel: "Restablecer mi Contraseña",
      buttonUrl: "{{resetLink}}",
      allowedVariables: ["email", "contactName", "resetLink", "reasonNote", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 10. Admin: Correo de Prueba
    admin_test_email: {
      templateId: "admin_test_email",
      version: 1,
      name: "Administración — Prueba de Entrega SMTP",
      description: "Correo de prueba enviado manualmente desde el Control Center de Administración.",
      audience: "ADMIN",
      eventType: "EMAIL_TEST_SENT",
      subject: "🧪 Correo de Prueba SMTP Corporativo — {{platformName}}",
      title: "Prueba de Conectividad SMTP Corporativa Exitosa",
      htmlContent: `
        <p>Hola,</p>
        <p>Este es un correo de prueba generado exitosamente desde el módulo <strong>Email Templates Enterprise</strong> del Control Center.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #6366F1;">
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Servidor SMTP:</strong> mail.bluesystemdelivery.com:465 (SSL/TLS)</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Remitente:</strong> noreply@bluesystemdelivery.com</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Destinatario de Prueba:</strong> {{recipient}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Fecha y Hora:</strong> {{testTimestamp}}</p>
        </div>
      `,
      buttonLabel: "Acceder al Panel de Control",
      buttonUrl: "https://bluesystemdelivery.com",
      allowedVariables: ["recipient", "testTimestamp", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 11. Cliente: Verificación de Correo Electrónico
    customer_email_verification: {
      templateId: "customer_email_verification",
      version: 1,
      name: "Cliente — Verificación de Correo",
      description: "Enlace corporativo seguro para verificar la dirección de correo electrónico del cliente.",
      audience: "CUSTOMER",
      eventType: "CUSTOMER_EMAIL_VERIFICATION",
      subject: "🔒 Verifica tu Correo Electrónico — {{platformName}}",
      title: "Verificación de Correo Electrónico",
      htmlContent: `
        <p>Hola <strong>{{customerName}}</strong>,</p>
        <p>Para garantizar la seguridad de tu cuenta en <strong>{{platformName}}</strong> y recibir los comprobantes oficiales de tus pedidos, por favor confirma tu dirección de correo electrónico pulsando el botón a continuación:</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
          <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 600;">ENLACE DIRECTO DE VERIFICACIÓN:</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #38BDF8; word-break: break-all; font-family: monospace;">{{verificationLink}}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
          Si tú no creaste una cuenta en {{platformName}}, puedes ignorar este mensaje con total seguridad.
        </p>
      `,
      buttonLabel: "Verificar mi Correo Electrónico",
      buttonUrl: "{{verificationLink}}",
      allowedVariables: ["customerName", "email", "verificationLink", "platformName", "tenantName", "supportEmail", "year"],
      status: "ACTIVE",
    },

    // 12. Administración: Verificación de Transferencia Bancaria X→Y
    x2y_transfer_verification: {
      templateId: "x2y_transfer_verification",
      version: 1,
      name: "Administración — Verificación de Transferencia X→Y",
      description: "Notificación de comprobante de transferencia pendiente de revisión para encomienda express X→Y.",
      audience: "ADMIN",
      eventType: "X_TO_Y_TRANSFER_VERIFICATION_REQUIRED",
      subject: "🔔 BlueSystem — Transferencia X→Y pendiente de verificación",
      title: "TRANSFERENCIA PENDIENTE DE VERIFICACIÓN",
      htmlContent: `
        <p>Hola,</p>
        <p>Se ha registrado una nueva encomienda punto a punto pagada mediante transferencia bancaria que requiere verificación manual antes de liberar el despacho a la flota de repartidores.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #3B82F6;">
          <h3 style="color: #60A5FA; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Detalles de la Encomienda Express</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Encomienda:</strong> <span style="font-family: monospace; color: #38BDF8;">#{{tripIdShort}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Servicio:</strong> Delivery Express X → Y</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Remitente:</strong> {{senderName}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Destinatario:</strong> {{recipientName}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Monto:</strong> <span style="font-weight: 700; color: #34D399;">C$ {{amount}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Referencia:</strong> <span style="font-family: monospace;">{{referenceNumber}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Fecha:</strong> {{formattedDate}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Estado:</strong> <span style="color: #FBBF24; font-weight: 700;">PENDIENTE DE VERIFICACIÓN</span></p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
          El comprobante está disponible para revisión y aprobación en el Panel Administrativo.
        </p>
      `,
      buttonLabel: "REVISAR TRANSFERENCIA",
      buttonUrl: "https://bluesystemdelivery.com/panel-admin/public/dashboard.html#deliveryExpress-transfer-verification?tripId={{tripId}}",
      allowedVariables: [
        "tripId",
        "tripIdShort",
        "senderName",
        "recipientName",
        "amount",
        "referenceNumber",
        "formattedDate",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },

    // 13. Liquidaciones: Depósito de Cierre Diario Registrado (Pendiente de Verificación)
    courier_closure_submitted: {
      templateId: "courier_closure_submitted",
      version: 1,
      name: "Liquidaciones — Depósito de Cierre Registrado",
      description: "Notificación a supervisores y finanzas cuando un motorizado registra comprobante de depósito bancario.",
      audience: "ADMIN",
      eventType: "COURIER_CLOSURE_SUBMITTED",
      subject: "🔔 Cierre y Depósito Pendiente — {{courierName}} (C$ {{depositAmount}}) | {{platformName}}",
      title: "DEPÓSITO BANCARIO DE CIERRE REGISTRADO",
      htmlContent: `
        <p>Hola,</p>
        <p>El motorizado <strong>{{courierName}}</strong> ha registrado su comprobante de depósito bancario para el cierre operacional de fecha <strong>{{businessDate}}</strong>. El expediente se encuentra en estado <strong>PENDIENTE DE VERIFICACIÓN</strong>.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #3B82F6;">
          <h3 style="color: #60A5FA; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Detalles del Motorizado & Depósito</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Motorizado:</strong> {{courierName}} (ID: <span style="font-family: monospace; color: #38BDF8;">{{courierId}}</span>)</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Placa / Teléfono:</strong> {{plate}} | {{phone}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Cierre ID:</strong> <span style="font-family: monospace; color: #94A3B8;">{{closureId}}</span></p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Monto Esperado (Custodia Sistema):</strong> <span style="font-weight: 700; color: #94A3B8;">C$ {{expectedAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 14px; color: #CBD5E1;"><strong>Monto Depositado en Banco:</strong> <span style="font-weight: 700; color: #34D399; font-size: 15px;">C$ {{depositAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Diferencia Calculada:</strong> <span style="font-weight: 700; color: #F59E0B;">C$ {{discrepancyAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Institución Bancaria:</strong> {{bankName}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Referencia de Transferencia:</strong> <span style="font-family: monospace; color: #FBBF24;">{{bankReference}}</span></p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
          <p style="margin: 4px 0; font-size: 12px; color: #94A3B8;"><strong>Resumen Operacional:</strong> {{totalOrders}} pedidos restaurante, {{totalTrips}} entregas express | Ganancia Courier: C$ {{courierEarnings}} | Custodia Neta: C$ {{netCustody}}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #94A3B8;"><strong>Estado Conciliación:</strong> <span style="font-weight: 700; color: #38BDF8;">{{reconciliationStatus}}</span></p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
          El comprobante bancario adjunto y el arqueo completo están disponibles para revisión y aprobación en el Panel Administrativo.
        </p>
      `,
      buttonLabel: "REVISAR Y APROBAR CIERRE",
      buttonUrl: "{{adminDashboardUrl}}",
      allowedVariables: [
        "courierName",
        "courierId",
        "plate",
        "phone",
        "closureId",
        "businessDate",
        "expectedAmount",
        "depositAmount",
        "discrepancyAmount",
        "bankName",
        "bankReference",
        "courierEarnings",
        "netCustody",
        "totalOrders",
        "totalTrips",
        "reconciliationStatus",
        "adminDashboardUrl",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },
    courier_daily_closure_submitted: {
      templateId: "courier_daily_closure_submitted",
      version: 1,
      name: "Liquidaciones — Depósito de Cierre Registrado (Canónico)",
      description: "Alias canónico de courier_closure_submitted.",
      audience: "ADMIN",
      eventType: "COURIER_CLOSURE_SUBMITTED",
      subject: "🔔 Cierre y Depósito Pendiente — {{courierName}} (C$ {{depositAmount}}) | {{platformName}}",
      title: "DEPÓSITO BANCARIO DE CIERRE REGISTRADO",
      htmlContent: `
        <p>Hola,</p>
        <p>El motorizado <strong>{{courierName}}</strong> ha registrado su comprobante de depósito bancario para el cierre operacional de fecha <strong>{{businessDate}}</strong>. El expediente se encuentra en estado <strong>PENDIENTE DE VERIFICACIÓN</strong>.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #3B82F6;">
          <h3 style="color: #60A5FA; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Detalles del Motorizado & Depósito</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Motorizado:</strong> {{courierName}} (ID: <span style="font-family: monospace; color: #38BDF8;">{{courierId}}</span>)</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Placa / Teléfono:</strong> {{plate}} | {{phone}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Cierre ID:</strong> <span style="font-family: monospace; color: #94A3B8;">{{closureId}}</span></p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Monto Esperado:</strong> <span style="font-weight: 700; color: #94A3B8;">C$ {{expectedAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 14px; color: #CBD5E1;"><strong>Monto Depositado en Banco:</strong> <span style="font-weight: 700; color: #34D399; font-size: 15px;">C$ {{depositAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Diferencia Calculada:</strong> <span style="font-weight: 700; color: #F59E0B;">C$ {{discrepancyAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Institución Bancaria:</strong> {{bankName}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Referencia de Transferencia:</strong> <span style="font-family: monospace; color: #FBBF24;">{{bankReference}}</span></p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
          <p style="margin: 4px 0; font-size: 12px; color: #94A3B8;"><strong>Resumen Operacional:</strong> {{totalOrders}} pedidos restaurante, {{totalTrips}} entregas express | Ganancia Courier: C$ {{courierEarnings}} | Custodia Neta: C$ {{netCustody}}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #94A3B8;"><strong>Estado Conciliación:</strong> <span style="font-weight: 700; color: #38BDF8;">{{reconciliationStatus}}</span></p>
        </div>
      `,
      buttonLabel: "REVISAR Y APROBAR CIERRE",
      buttonUrl: "{{adminDashboardUrl}}",
      allowedVariables: [
        "courierName",
        "courierId",
        "plate",
        "phone",
        "closureId",
        "businessDate",
        "expectedAmount",
        "depositAmount",
        "discrepancyAmount",
        "bankName",
        "bankReference",
        "courierEarnings",
        "netCustody",
        "totalOrders",
        "totalTrips",
        "reconciliationStatus",
        "adminDashboardUrl",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },

    // 14. Liquidaciones: Depósito y Cierre Diario Verificado y Liquidado
    courier_deposit_verified: {
      templateId: "courier_deposit_verified",
      version: 1,
      name: "Liquidaciones — Cierre y Depósito Verificado",
      description: "Notificación oficial al motorizado y administración al verificar y liquidar el cierre diario.",
      audience: "COURIER",
      eventType: "COURIER_CLOSURE_VERIFIED",
      subject: "✅ Cierre Diario Verificado y Liquidado — Acta {{actNumber}} | {{platformName}}",
      title: "CIERRE DIARIO Y DEPÓSITO LIQUIDADO",
      htmlContent: `
        <p>Estimado/a <strong>{{courierName}}</strong>,</p>
        <p>Te informamos que tu cierre de caja diario del <strong>{{businessDate}}</strong> ha sido <strong>verificado y liquidado formalmente</strong> por la administración financiera. El saldo de efectivo bajo custodia ha sido conciliado en el balance.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #10B981;">
          <h3 style="color: #34D399; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase;">Acta Oficial de Liquidación</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Número de Acta:</strong> <span style="font-family: monospace; color: #38BDF8; font-weight: 700;">{{actNumber}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Código de Validación:</strong> <span style="font-family: monospace; color: #FBBF24;">{{verificationCode}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Monto Liquidado / Conciliado:</strong> <span style="font-weight: 700; color: #34D399;">C$ {{depositAmount}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Verificado por:</strong> {{verifiedByName}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Fecha y Hora de Verificación:</strong> {{verifiedAt}}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
          El Acta Oficial en formato PDF se encuentra disponible para consulta y descarga tanto en la aplicación de repartidores como en el panel administrativo.
        </p>
      `,
      buttonLabel: "VER ACTA OFICIAL",
      buttonUrl: "{{adminDashboardUrl}}",
      allowedVariables: [
        "courierName",
        "courierId",
        "closureId",
        "businessDate",
        "depositAmount",
        "expectedAmount",
        "actNumber",
        "verificationCode",
        "verifiedByName",
        "verifiedAt",
        "adminDashboardUrl",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },
    courier_daily_closure_verified: {
      templateId: "courier_daily_closure_verified",
      version: 1,
      name: "Liquidaciones — Cierre y Depósito Verificado (Canónico)",
      description: "Alias canónico de courier_deposit_verified.",
      audience: "COURIER",
      eventType: "COURIER_CLOSURE_VERIFIED",
      subject: "✅ Cierre Diario Verificado y Liquidado — Acta {{actNumber}} | {{platformName}}",
      title: "CIERRE DIARIO Y DEPÓSITO LIQUIDADO",
      htmlContent: `
        <p>Estimado/a <strong>{{courierName}}</strong>,</p>
        <p>Tu cierre de caja diario del <strong>{{businessDate}}</strong> ha sido verificado y liquidado formalmente.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #10B981;">
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Número de Acta:</strong> <span style="font-family: monospace; color: #38BDF8;">{{actNumber}}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Código de Validación:</strong> {{verificationCode}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Monto Liquidado:</strong> C$ {{depositAmount}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Verificado por:</strong> {{verifiedByName}}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #CBD5E1;"><strong>Fecha:</strong> {{verifiedAt}}</p>
        </div>
      `,
      buttonLabel: "VER ACTA OFICIAL",
      buttonUrl: "{{adminDashboardUrl}}",
      allowedVariables: [
        "courierName",
        "courierId",
        "closureId",
        "businessDate",
        "depositAmount",
        "expectedAmount",
        "actNumber",
        "verificationCode",
        "verifiedByName",
        "verifiedAt",
        "adminDashboardUrl",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },

    // 15. Liquidaciones: Cierre Diario Rechazado / Observado
    courier_closure_rejected: {
      templateId: "courier_closure_rejected",
      version: 1,
      name: "Liquidaciones — Cierre Diario Observado o Rechazado",
      description: "Notificación al motorizado cuando el cierre diario no es aprobado y requiere subsanación.",
      audience: "COURIER",
      eventType: "COURIER_CLOSURE_REJECTED",
      subject: "⚠️ Cierre Diario Observado — {{courierName}} | {{platformName}}",
      title: "CIERRE DIARIO OBSERVADO O NO APROBADO",
      htmlContent: `
        <p>Estimado/a <strong>{{courierName}}</strong>,</p>
        <p>Te informamos que tu cierre de caja diario correspondiente a la fecha <strong>{{businessDate}}</strong> (ID: <span style="font-family: monospace;">{{closureId}}</span>) ha sido <strong>observado o rechazado</strong> por el equipo de supervisión.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 18px; margin: 20px 0; border-left: 4px solid #EF4444; border: 1px solid #334155;">
          <h3 style="color: #F87171; font-size: 13px; margin: 0 0 10px 0; text-transform: uppercase;">Motivo de la Observación</h3>
          <p style="margin: 0; font-size: 14px; color: #E2E8F0; line-height: 1.5;">{{rejectionReason}}</p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
          <p style="margin: 4px 0; font-size: 12px; color: #94A3B8;"><strong>Revisado por:</strong> {{reviewedByName}}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.5;">
          Por favor comunícate a la brevedad con tu supervisor de operaciones o acércate a la mesa de control para regularizar la discrepancia de efectivo o comprobante.
        </p>
      `,
      buttonLabel: "CONSULTAR ESTADO",
      buttonUrl: "{{adminDashboardUrl}}",
      allowedVariables: [
        "courierName",
        "courierId",
        "closureId",
        "businessDate",
        "rejectionReason",
        "reviewedByName",
        "adminDashboardUrl",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },
    courier_daily_closure_rejected: {
      templateId: "courier_daily_closure_rejected",
      version: 1,
      name: "Liquidaciones — Cierre Diario Observado o Rechazado (Canónico)",
      description: "Alias canónico de courier_closure_rejected.",
      audience: "COURIER",
      eventType: "COURIER_CLOSURE_REJECTED",
      subject: "⚠️ Cierre Diario Observado — {{courierName}} | {{platformName}}",
      title: "CIERRE DIARIO OBSERVADO",
      htmlContent: `
        <p>Estimado/a <strong>{{courierName}}</strong>,</p>
        <p>Tu cierre de caja diario del <strong>{{businessDate}}</strong> ha sido observado.</p>
        <div style="background-color: #0F172A; border-radius: 12px; padding: 18px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <p style="margin: 0; font-size: 14px; color: #E2E8F0;">{{rejectionReason}}</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #94A3B8;">Revisado por: {{reviewedByName}}</p>
        </div>
      `,
      buttonLabel: "CONSULTAR ESTADO",
      buttonUrl: "{{adminDashboardUrl}}",
      allowedVariables: [
        "courierName",
        "courierId",
        "closureId",
        "businessDate",
        "rejectionReason",
        "reviewedByName",
        "adminDashboardUrl",
        "platformName",
        "tenantName",
        "supportEmail",
        "year",
      ],
      status: "ACTIVE",
    },
  };

  private static customDb: any = null;

  public static setDb(dbInstance: any): void {
    this.customDb = dbInstance;
  }

  private static getFirestore() {
    return this.customDb || db;
  }

  /**
   * Obtiene la lista de todas las plantillas predeterminadas del sistema.
   */
  public static getSystemTemplates(): EmailTemplateDefinition[] {
    return Object.values(this.defaultTemplates);
  }

  /**
   * Resuelve la plantilla activa desde Firestore (/email_templates/{templateId}) o fallback a template inmutable del sistema.
   */
  public static async resolveTemplate(
    templateId: string,
    tenantId?: string
  ): Promise<EmailTemplateDefinition> {
    const firestore = this.getFirestore();

    // 1. Intentar resolver override de Tenant si existe
    if (tenantId && tenantId !== "ten_bluesystem_core") {
      try {
        if (this.customDb || admin.apps.length > 0) {
          const tenantTemplateDoc = await firestore
            .collection("email_templates")
            .doc(`${tenantId}_${templateId}`)
            .get();

          if (tenantTemplateDoc.exists) {
            const tData = (typeof tenantTemplateDoc.data === "function" ? tenantTemplateDoc.data() : tenantTemplateDoc.data) as EmailTemplateDefinition;
            if (tData && tData.status === "ACTIVE") {
              return tData;
            }
          }
        }
      } catch (err: any) {
        Logger.warn(`[EMAIL-TEMPLATE] Error consultando override de tenant ${tenantId} para ${templateId}:`, err?.message);
      }
    }

    // 2. Intentar resolver plantilla global en Firestore
    try {
      if (this.customDb || admin.apps.length > 0) {
        const globalDoc = await firestore.collection("email_templates").doc(templateId).get();
        if (globalDoc.exists) {
          const gData = (typeof globalDoc.data === "function" ? globalDoc.data() : globalDoc.data) as EmailTemplateDefinition;
          if (gData && gData.status === "ACTIVE") {
            return gData;
          }
        }
      }
    } catch (err: any) {
      Logger.warn(`[EMAIL-TEMPLATE] Error consultando plantilla global ${templateId} en Firestore:`, err?.message);
    }

    // 3. Fallback seguro a plantilla base del sistema
    const fallback = this.defaultTemplates[templateId];
    if (fallback) {
      return fallback;
    }

    throw new Error(`[TEMPLATE_ERROR] Plantilla '${templateId}' no encontrada en Firestore ni en templates del sistema.`);
  }

  /**
   * Valida que todas las variables en la plantilla correspondan al diccionario permitido.
   */
  public static validateVariables(
    templateText: string,
    allowedVariables: string[]
  ): { isValid: boolean; invalidVariables: string[] } {
    const varRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const foundVariables = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = varRegex.exec(templateText)) !== null) {
      foundVariables.add(match[1]);
    }

    const allowedSet = new Set(allowedVariables);
    const invalidVariables: string[] = [];

    for (const v of foundVariables) {
      if (!allowedSet.has(v)) {
        invalidVariables.push(v);
      }
    }

    return {
      isValid: invalidVariables.length === 0,
      invalidVariables,
    };
  }

  /**
   * Renderiza el contenido HTML y Plain Text reemplazando variables con valores sanitizados y envolviendo en el contenedor Enterprise.
   */
  public static render(
    template: EmailTemplateDefinition,
    variables: Record<string, string>,
    branding?: {
      platformName?: string;
      tenantName?: string;
      primaryColor?: string;
      supportEmail?: string;
      logoUrl?: string;
    }
  ): { subject: string; html: string; text: string } {
    const platformName = branding?.platformName || "BlueSystem Delivery";
    const tenantName = branding?.tenantName || "BlueSystem Platform";
    const primaryColor = branding?.primaryColor || "#38BDF8";
    const supportEmail = branding?.supportEmail || "soporte@bluesystemdelivery.com";
    const year = new Date().getFullYear().toString();

    const mergedVars: Record<string, string> = {
      platformName,
      tenantName,
      supportEmail,
      year,
      ...variables,
    };

    // 1. Validar variables contra allowedVariables de la plantilla
    const combinedContent = `${template.subject} ${template.title} ${template.htmlContent} ${template.buttonUrl || ""}`;
    const validation = this.validateVariables(combinedContent, template.allowedVariables);
    if (!validation.isValid) {
      Logger.warn(
        `[EMAIL-TEMPLATE] Advertencia: Plantilla ${template.templateId} contiene variables no declaradas:`,
        validation.invalidVariables
      );
    }

    // 2. Reemplazo de variables
    let renderedSubject = template.subject;
    let renderedTitle = template.title;
    let renderedBodyHtml = template.htmlContent;
    let renderedButtonUrl = template.buttonUrl || "";

    for (const [key, val] of Object.entries(mergedVars)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      const cleanVal = typeof val === "string" ? val : String(val || "");
      renderedSubject = renderedSubject.replace(regex, cleanVal);
      renderedTitle = renderedTitle.replace(regex, cleanVal);
      renderedBodyHtml = renderedBodyHtml.replace(regex, cleanVal);
      renderedButtonUrl = renderedButtonUrl.replace(regex, cleanVal);
    }

    // 3. Sanitización de contenido
    renderedBodyHtml = HtmlSanitizer.sanitize(renderedBodyHtml);

    // 4. Bloque CTA seguro
    let buttonHtml = "";
    if (template.buttonLabel && renderedButtonUrl) {
      const isSafe = HtmlSanitizer.isSafeUrl(renderedButtonUrl);
      const safeUrl = isSafe ? renderedButtonUrl : "#";
      buttonHtml = `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${safeUrl}" style="background-color: #0284C7; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">${template.buttonLabel}</a>
        </div>
      `;
    }

    // 5. Envoltorio Maestro HTML Responsive Enterprise (Dark Theme Corporativo)
    const masterHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${renderedSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0B0F19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #334155; background-color: #0F172A;">
              <h1 style="color: ${primaryColor}; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">${platformName}</h1>
              <p style="color: #94A3B8; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">${tenantName}</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #F8FAFC; font-size: 18px; font-weight: 700; margin: 0 0 20px 0; line-height: 1.4;">${renderedTitle}</h2>
              <div style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
                ${renderedBodyHtml}
              </div>
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #0F172A; border-top: 1px solid #334155;">
              <p style="color: #64748B; font-size: 12px; margin: 0 0 8px 0; line-height: 1.5;">
                © ${year} ${platformName} Enterprise. Todos los derechos reservados.
              </p>
              <p style="color: #475569; font-size: 11px; margin: 0;">
                Soporte y Consultas: <a href="mailto:${supportEmail}" style="color: #38BDF8; text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const plainText = HtmlSanitizer.htmlToPlainText(masterHtml);

    return {
      subject: renderedSubject,
      html: masterHtml,
      text: plainText,
    };
  }
}

// ─── 5. Servicio Principal: EmailService (Singleton con Idempotencia Atómica) ───

export class EmailService {
  private static transport: EmailTransport = new SmtpEmailTransport();
  private static customDb: any = null;

  /**
   * Permite inyectar un transporte personalizado (útil para pruebas unitarias).
   */
  public static setTransport(customTransport: EmailTransport): void {
    this.transport = customTransport;
  }

  /**
   * Permite inyectar una instancia de base de datos personalizada para pruebas.
   */
  public static setDb(dbInstance: any): void {
    this.customDb = dbInstance;
  }

  private static getFirestore() {
    return this.customDb || db;
  }

  /**
   * Envío centralizado y atómico con Idempotencia, Retry Backoff y Auditoría.
   */
  public static async sendTransactionalEmail(params: {
    eventId: string;
    eventType: string;
    recipient: string;
    recipientUid?: string;
    templateId: string;
    variables: Record<string, string>;
    tenantId?: string;
    entityType?: "MERCHANT_APPLICATION" | "COURIER_APPLICATION" | "USER" | "SYSTEM" | "X_TO_Y_DELIVERY" | "ORDER" | "COURIER_CLOSURE";
    entityId?: string;
    maxRetries?: number;
  }): Promise<EmailEventResult> {
    const {
      eventId,
      eventType,
      recipient,
      recipientUid,
      templateId,
      variables,
      tenantId = "ten_bluesystem_core",
      entityType = "SYSTEM",
      entityId = eventId,
      maxRetries = 3,
    } = params;

    const firestore = this.getFirestore();
    const eventRef = firestore.collection("email_events").doc(eventId);

    // ── 1. Control de Idempotencia Atómica con Firestore ────────────────────────
    const eventSnap = await eventRef.get();
    if (eventSnap.exists && eventSnap.data()?.status === "SENT") {
      const existingMessageId = eventSnap.data()?.providerMessageId || "IDEMPOTENT_SKIPPED";
      Logger.info(
        `[EMAIL-SERVICE] ℹ️ Idempotencia activa: Evento ${eventId} (${eventType}) ya fue entregado. Omitiendo duplicado.`,
        { module: "EmailService", eventId, eventType, providerMessageId: existingMessageId }
      );
      return {
        success: true,
        status: "SKIPPED",
        eventId,
        providerMessageId: existingMessageId,
      };
    }

    // ── 2. Resolución y Renderizado de Plantilla ────────────────────────────────
    let renderedSubject = "";
    let renderedHtml = "";
    let renderedText = "";
    let templateVersion = 1;

    try {
      const template = await EmailTemplateEngine.resolveTemplate(templateId, tenantId);
      templateVersion = template.version;
      const rendered = EmailTemplateEngine.render(template, variables, {
        platformName: "BlueSystem Delivery",
        tenantName: "BlueSystem Platform",
        primaryColor: "#38BDF8",
        supportEmail: "soporte@bluesystemdelivery.com",
      });
      renderedSubject = rendered.subject;
      renderedHtml = rendered.html;
      renderedText = rendered.text;
    } catch (tplErr: any) {
      const errCat = EmailErrorClassifier.classify(tplErr);
      Logger.error(`[EMAIL-SERVICE] 🔴 Error resolviendo plantilla ${templateId}:`, tplErr?.message);

      await eventRef.set(
        {
          eventId,
          eventType,
          recipient,
          recipientUid: recipientUid || null,
          tenantId,
          entityType,
          entityId,
          templateId,
          templateVersion,
          status: "FAILED",
          error: tplErr?.message,
          errorCategory: errCat,
          failedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        success: false,
        status: "FAILED",
        eventId,
        error: tplErr?.message,
        errorCategory: errCat,
      };
    }

    // ── 3. Registrar Inicio de Envío ────────────────────────────────────────────
    await eventRef.set(
      {
        eventId,
        eventType,
        recipient,
        recipientUid: recipientUid || null,
        tenantId,
        entityType,
        entityId,
        templateId,
        templateVersion,
        subject: renderedSubject,
        status: "SENDING",
        attempt: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // ── 4. Bucle de Envío con Reintentos y Backoff Progresivo ──────────────────
    let attempt = 0;
    let lastError: any = null;
    let lastErrorCategory: EmailErrorCategory = "UNKNOWN";

    const emailFrom = process.env.SMTP_USER || "noreply@bluesystemdelivery.com";
    const emailFromName = process.env.EMAIL_FROM_NAME || "BlueSystem Delivery";
    const emailReplyTo = process.env.EMAIL_REPLY_TO || "soporte@bluesystemdelivery.com";

    while (attempt < maxRetries) {
      attempt++;
      try {
        Logger.info(
          `[EMAIL-SERVICE] Intento ${attempt}/${maxRetries} enviando ${eventType} a ${recipient} vía SMTP Corporativo...`
        );

        const result = await this.transport.send({
          to: recipient,
          fromEmail: emailFrom,
          fromName: emailFromName,
          replyTo: emailReplyTo,
          subject: renderedSubject,
          html: renderedHtml,
          text: renderedText,
        });

        const providerMessageId = result.messageId;

        // ── 5. Registro de Éxito en /email_events ──────────────────────────────
        await eventRef.set(
          {
            status: "SENT",
            providerMessageId,
            attempts: attempt,
            sentAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            error: null,
            errorCategory: null,
          },
          { merge: true }
        );

        // Mirror de compatibilidad en subcolecciones históricas
        await this.syncHistoricalSubcollection({
          entityType,
          entityId,
          eventType,
          status: "SENT",
          providerMessageId,
          recipient,
          subject: renderedSubject,
        });

        Logger.info(
          `[EMAIL-SERVICE] 🟢 Correo enviado exitosamente vía SMTP. eventId=${eventId}, messageId=${providerMessageId}`,
          { module: "EmailService", eventId, eventType, recipient, providerMessageId }
        );

        return {
          success: true,
          status: "SENT",
          eventId,
          providerMessageId,
          attempts: attempt,
        };
      } catch (err: any) {
        lastError = err;
        lastErrorCategory = EmailErrorClassifier.classify(err);
        const errMsg = err?.message || "Error desconocido en transporte SMTP";

        Logger.warn(
          `[EMAIL-SERVICE] ⚠️ Fallo en intento ${attempt}/${maxRetries} enviando ${eventId}: ${errMsg} [${lastErrorCategory}]`
        );

        // Si es un error permanente, no reintentar
        if (EmailErrorClassifier.isPermanentError(lastErrorCategory)) {
          break;
        }

        // Backoff exponencial antes del próximo intento (1s, 2s, 4s)
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }

    // ── 6. Registro de Fallo Permanente tras agotar reintentos ──────────────────
    const finalErrorMessage = lastError?.message || "Fallo en la entrega tras reintentos máximos.";

    await eventRef.set(
      {
        status: "FAILED",
        error: finalErrorMessage,
        errorCategory: lastErrorCategory,
        attempts: attempt,
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Mirror de compatibilidad en subcolecciones históricas
    await this.syncHistoricalSubcollection({
      entityType,
      entityId,
      eventType,
      status: "FAILED",
      error: finalErrorMessage,
      recipient,
      subject: renderedSubject,
    });

    Logger.error(
      `[EMAIL-SERVICE] 🔴 Error definitivo enviando correo ${eventId}. Error: ${finalErrorMessage} [${lastErrorCategory}]`,
      lastError,
      { module: "EmailService", eventId, eventType, recipient }
    );

    return {
      success: false,
      status: "FAILED",
      eventId,
      error: finalErrorMessage,
      errorCategory: lastErrorCategory,
      attempts: attempt,
    };
  }

  /**
   * Sincroniza el resultado con las subcolecciones históricas de compatibilidad.
   */
  private static async syncHistoricalSubcollection(data: {
    entityType: string;
    entityId: string;
    eventType: string;
    status: string;
    providerMessageId?: string;
    error?: string;
    recipient: string;
    subject: string;
  }): Promise<void> {
    try {
      const firestore = this.getFirestore();
      if (data.entityType === "MERCHANT_APPLICATION") {
        const subRef = firestore
          .collection("merchant_applications")
          .doc(data.entityId)
          .collection("email_events")
          .doc(data.eventType);

        await subRef.set(
          {
            eventType: data.eventType,
            appId: data.entityId,
            recipient: data.recipient,
            subject: data.subject,
            status: data.status,
            providerMessageId: data.providerMessageId || null,
            error: data.error || null,
            updatedAt: FieldValue.serverTimestamp(),
            ...(data.status === "SENT" ? { sentAt: FieldValue.serverTimestamp() } : {}),
            ...(data.status === "FAILED" ? { failedAt: FieldValue.serverTimestamp() } : {}),
          },
          { merge: true }
        );
      } else if (data.entityType === "USER") {
        const subRef = firestore
          .collection("users")
          .doc(data.entityId)
          .collection("email_events")
          .doc(`${data.eventType}_${Date.now()}`);

        await subRef.set(
          {
            eventType: data.eventType,
            uid: data.entityId,
            recipient: data.recipient,
            subject: data.subject,
            status: data.status,
            providerMessageId: data.providerMessageId || null,
            error: data.error || null,
            updatedAt: FieldValue.serverTimestamp(),
            ...(data.status === "SENT" ? { sentAt: FieldValue.serverTimestamp() } : {}),
          },
          { merge: true }
        );
      }
    } catch (syncErr: any) {
      Logger.warn("[EMAIL-SERVICE] Aviso al sincronizar subcolección histórica:", syncErr?.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS CANÓNICOS DE ALTO NIVEL (CLIENTE, COMERCIO, MOTORIZADO, ADMIN)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 1. Cliente: Bienvenida tras Registro ──────────────────────────────────
  public static async sendCustomerWelcomeEmail(data: {
    uid: string;
    email: string;
    customerName: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `cust_welcome_${data.uid}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "CUSTOMER_REGISTERED",
      recipient: data.email,
      recipientUid: data.uid,
      templateId: "customer_welcome",
      tenantId: data.tenantId,
      entityType: "USER",
      entityId: data.uid,
      variables: {
        customerName: data.customerName || "Cliente",
        email: data.email,
      },
    });
  }

  // ─── 2. Comercio: Solicitud Recibida ───────────────────────────────────────
  public static async sendApplicationReceivedEmail(data: {
    appId: string;
    firestoreDocId?: string;
    email: string;
    contactName: string;
    businessName: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `merch_rcv_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "MERCHANT_REGISTERED",
      recipient: data.email,
      templateId: "merchant_application_received",
      tenantId: data.tenantId,
      entityType: "MERCHANT_APPLICATION",
      entityId: data.firestoreDocId || data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        contactName: data.contactName,
        businessName: data.businessName,
      },
    });
  }

  // ─── 3. Comercio: Solicitud Aprobada ───────────────────────────────────────
  public static async sendApplicationApprovedEmail(data: {
    appId: string;
    firestoreDocId?: string;
    email: string;
    contactName: string;
    businessName: string;
    businessId: string;
    tempPassword?: string;
    activationLink?: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `merch_appr_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "MERCHANT_APPROVED",
      recipient: data.email,
      templateId: "merchant_application_approved",
      tenantId: data.tenantId,
      entityType: "MERCHANT_APPLICATION",
      entityId: data.firestoreDocId || data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        contactName: data.contactName,
        businessName: data.businessName,
        businessId: data.businessId,
        tempPassword: data.tempPassword || "Configurar en el portal",
        activationLink: data.activationLink || "https://comercio.bluesystemdelivery.com",
      },
    });
  }

  // ─── 4. Comercio: Solicitud Rechazada ──────────────────────────────────────
  public static async sendApplicationRejectedEmail(data: {
    appId: string;
    firestoreDocId?: string;
    email: string;
    contactName: string;
    businessName: string;
    rejectionReason?: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `merch_rej_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "MERCHANT_APPLICATION_REJECTED",
      recipient: data.email,
      templateId: "merchant_application_rejected",
      tenantId: data.tenantId,
      entityType: "MERCHANT_APPLICATION",
      entityId: data.firestoreDocId || data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        contactName: data.contactName,
        businessName: data.businessName,
        rejectionReason:
          data.rejectionReason?.trim() ||
          "La solicitud no cumple con los requisitos comerciales o legales establecidos actualmente.",
      },
    });
  }

  // ─── 5. Comercio: Documentos Requeridos ────────────────────────────────────
  public static async sendDocsRequestedEmail(data: {
    appId: string;
    firestoreDocId?: string;
    email: string;
    contactName: string;
    businessName: string;
    docsNote?: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `merch_docs_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "MERCHANT_DOCS_REQUESTED",
      recipient: data.email,
      templateId: "merchant_application_docs_requested",
      tenantId: data.tenantId,
      entityType: "MERCHANT_APPLICATION",
      entityId: data.firestoreDocId || data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        contactName: data.contactName,
        businessName: data.businessName,
        docsNote:
          data.docsNote?.trim() ||
          "Requerimos actualizar o adjuntar documentación legal adicional para completar la revisión.",
      },
    });
  }

  // ─── 6. Motorizado: Solicitud Recibida ─────────────────────────────────────
  public static async sendCourierApplicationReceivedEmail(data: {
    appId: string;
    email: string;
    candidateName: string;
    plate: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `courier_rcv_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "COURIER_REGISTERED",
      recipient: data.email,
      templateId: "courier_application_received",
      tenantId: data.tenantId,
      entityType: "COURIER_APPLICATION",
      entityId: data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        candidateName: data.candidateName,
        plate: data.plate,
      },
    });
  }

  // ─── 7. Motorizado: Solicitud Aprobada ─────────────────────────────────────
  public static async sendCourierApplicationApprovedEmail(data: {
    appId: string;
    email: string;
    candidateName: string;
    plate: string;
    courierId: string;
    tempPassword?: string;
    activationLink?: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `courier_appr_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "COURIER_APPROVED",
      recipient: data.email,
      templateId: "courier_application_approved",
      tenantId: data.tenantId,
      entityType: "COURIER_APPLICATION",
      entityId: data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        candidateName: data.candidateName,
        plate: data.plate,
        courierId: data.courierId,
        tempPassword: data.tempPassword || "",
      },
    });
  }

  // ─── 8. Motorizado: Solicitud Rechazada ────────────────────────────────────
  public static async sendCourierApplicationRejectedEmail(data: {
    appId: string;
    email: string;
    candidateName: string;
    rejectionReason?: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `courier_rej_${data.appId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "COURIER_APPLICATION_REJECTED",
      recipient: data.email,
      templateId: "courier_application_rejected",
      tenantId: data.tenantId,
      entityType: "COURIER_APPLICATION",
      entityId: data.appId,
      variables: {
        appId: data.appId,
        email: data.email,
        candidateName: data.candidateName,
        rejectionReason:
          data.rejectionReason?.trim() ||
          "La solicitud de motorizado no cumple con los requisitos operativos requeridos.",
      },
    });
  }

  // ─── 9. Usuario / Admin: Restablecimiento de Contraseña ────────────────────
  public static async sendPasswordResetEmail(data: {
    uid: string;
    email: string;
    contactName?: string;
    resetLink: string;
    reason?: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `pwd_reset_${data.uid}_${Date.now()}`;
    const reasonNote = data.reason
      ? `<p style="color: #94A3B8; font-size: 13px; margin: 8px 0 0 0;"><strong>Motivo:</strong> ${HtmlSanitizer.sanitize(data.reason)}</p>`
      : "";

    return this.sendTransactionalEmail({
      eventId,
      eventType: "USER_PASSWORD_RESET",
      recipient: data.email,
      recipientUid: data.uid,
      templateId: "user_password_reset",
      tenantId: data.tenantId,
      entityType: "USER",
      entityId: data.uid,
      variables: {
        email: data.email,
        contactName: data.contactName || "Usuario",
        resetLink: data.resetLink,
        reasonNote,
      },
    });
  }

  // ─── 10. Admin: Envío de Correo de Prueba ──────────────────────────────────
  public static async sendTestEmail(data: {
    templateId: string;
    recipient: string;
    sampleVariables?: Record<string, string>;
    adminUid: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `test_email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sampleVars: Record<string, string> = {
      recipient: data.recipient,
      testTimestamp: new Date().toLocaleString("es-NI"),
      customerName: "Juan Pérez (Prueba)",
      contactName: "Contacto Demo",
      businessName: "Restaurante Demo",
      candidateName: "Motorizado Demo",
      appId: "demo_app_12345",
      businessId: "biz_demo_12345",
      courierId: "courier_demo_12345",
      tempPassword: "DemoPassword123#",
      plate: "M 123456",
      resetLink: "https://bluesystemdelivery.com/reset-demo",
      rejectionReason: "Prueba de motivo de rechazo",
      docsNote: "Prueba de solicitud de documentos",
      ...(data.sampleVariables || {}),
    };

    return this.sendTransactionalEmail({
      eventId,
      eventType: "EMAIL_TEST_SENT",
      recipient: data.recipient,
      recipientUid: data.adminUid,
      templateId: data.templateId,
      tenantId: data.tenantId,
      entityType: "SYSTEM",
      entityId: data.adminUid,
      variables: sampleVars,
    });
  }

  // ─── 11. Cliente: Envío de Correo de Verificación Corporativo ─────────────
  public static async sendCorporateVerificationEmail(data: {
    uid: string;
    email: string;
    customerName: string;
    verificationLink: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `cust_verif_${data.uid}_${Date.now()}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "CUSTOMER_EMAIL_VERIFICATION",
      recipient: data.email,
      recipientUid: data.uid,
      templateId: "customer_email_verification",
      tenantId: data.tenantId,
      entityType: "USER",
      entityId: data.uid,
      variables: {
        customerName: data.customerName || "Cliente",
        email: data.email,
        verificationLink: data.verificationLink,
      },
    });
  }

  // ─── 12. Administración: Verificación de Transferencia Bancaria X→Y ───────
  public static async sendXToYTransferVerificationEmail(data: {
    tripId: string;
    recipientEmail: string;
    senderName: string;
    recipientName: string;
    amount: number;
    referenceNumber: string;
    formattedDate: string;
    tenantId?: string;
  }): Promise<EmailEventResult> {
    const eventId = `x2y_transfer_verification_${data.tripId}`;
    return this.sendTransactionalEmail({
      eventId,
      eventType: "X_TO_Y_TRANSFER_VERIFICATION_REQUIRED",
      recipient: data.recipientEmail,
      templateId: "x2y_transfer_verification",
      tenantId: data.tenantId,
      entityType: "X_TO_Y_DELIVERY",
      entityId: data.tripId,
      variables: {
        tripId: data.tripId,
        tripIdShort: data.tripId.slice(-6).toUpperCase(),
        senderName: data.senderName,
        recipientName: data.recipientName,
        amount: data.amount.toFixed(2),
        referenceNumber: data.referenceNumber || "S/R",
        formattedDate: data.formattedDate,
      },
    });
  }
}
