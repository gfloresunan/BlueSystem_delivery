# AUDITORÍA FORENSE DE ARQUITECTURA DE EMAIL TRANSACCIONAL ENTERPRISE
## ACTIVIDAD #20 — PROTOCOLO BSD-ACT20-TRANSACTIONAL-EMAIL-ENTERPRISE-001

**PROYECTO:** BlueSystem Delivery Enterprise  
**FIREBASE PROJECT:** `bluesystem-7c9af`  
**FECHA:** 2026-08-31  
**ESTADO:** FASE 0 — FORENSIC DISCOVERY COMPLETED  
**AUDITOR:** Senior Developer & Auditor de BlueSystem  

---

## 1. EMAIL SYSTEM FOUND (ESTADO ACTUAL DEL CÓDIGO)

### 1.1 Ubicación del Servicio Central Existente
- **Archivo:** `functions/src/services/emailService.ts` (Compilado en `functions/lib/services/emailService.js`)
- **Líneas:** 543 líneas de TypeScript.
- **Clase:** `EmailService` (Exportada como singleton/métodos estáticos).
- **Transporte Actual:** `@sendgrid/mail` (SendGrid Web API v3).
- **Dependencias en `functions/package.json`:**
  - `@sendgrid/mail`: `^7.7.0`
  - `@google-cloud/secret-manager`: `^6.3.0`
  - `firebase-admin`: `^11.8.0`
  - `firebase-functions`: `^4.3.1`
- **Secretos Actuales:** `SENDGRID_API_KEY` (leída vía `process.env.SENDGRID_API_KEY`).
- **Remitentes Configurados:**
  - `EMAIL_FROM`: `notificaciones@tecnocomp.com.ni`
  - `EMAIL_FROM_NAME`: `BlueSystem Delivery`
  - `EMAIL_REPLY_TO`: `soporte@tecnocomp.com.ni`

---

## 2. EXISTING TRIGGERS & INVOCATIONS (MATRIZ DE DISPARADORES)

| Trigger / Callable | Evento de Negocio | Método `EmailService` Invocado | Colección / Destino | Estado Actual |
|---|---|---|---|---|
| `submitMerchantApplication` (`functions/src/callables/merchant.ts:247`) | Recepción de Solicitud de Comercio | `EmailService.sendApplicationReceivedEmail` | `/merchant_applications/{appId}/email_events/merchant_application_received` | 🟢 WORKING (SendGrid) |
| `onMerchantApplicationApproved` (`functions/src/triggers/merchantApplications.ts:116`) | Aprobación de Comercio y Provisión EIAM | `EmailService.sendApplicationApprovedEmail` | `/merchant_applications/{appId}/email_events/merchant_application_approved` | 🟢 WORKING (SendGrid) |
| `onMerchantApplicationStatusChanged` (`functions/src/triggers/merchantApplications.ts:599`) | Rechazo de Solicitud de Comercio | `EmailService.sendApplicationRejectedEmail` | `/merchant_applications/{appId}/email_events/merchant_application_rejected` | 🟢 WORKING (SendGrid) |
| `onMerchantApplicationStatusChanged` (`functions/src/triggers/merchantApplications.ts:607`) | Solicitud de Documentos Adicionales | `EmailService.sendDocsRequestedEmail` | `/merchant_applications/{appId}/email_events/merchant_application_docs_requested` | 🟢 WORKING (SendGrid) |
| `adminUpdateUser` (`functions/src/callables/admin.ts:420`) | Restablecimiento Administrativo de Contraseña | `EmailService.sendPasswordResetEmail` | `/users/{uid}/email_events/{eventId}` | 🟢 WORKING (SendGrid) |
| `submitCourierApplication` (`functions/src/callables/courierOnboarding.ts`) | Recepción de Solicitud de Motorizado | *Ninguno* | *Sin email transaccional* | 🔴 MISSING |
| `onCourierApplicationApproved` (`functions/src/triggers/courierApplications.ts`) | Aprobación de Motorizado | *Ninguno* | *Sin email transaccional* | 🔴 MISSING |
| `onCourierApplicationStatusChanged` (`functions/src/triggers/courierApplications.ts`) | Cambio de Estado Motorizado | *Ninguno* | *Sin email transaccional* | 🔴 MISSING |
| `AuthManager.registrarUsuario` (Android/Web Signup) | Registro de Cliente / Usuario | *Ninguno en backend* | *Sin email de bienvenida* | 🔴 MISSING |

---

## 3. EXISTING TEMPLATES (PLANTILLAS EXISTENTES)

| Template ID | Audiencia | Evento | Ubicación | Estado |
|---|---|---|---|---|
| `merchant_application_received` | Comercio | Recepción de Solicitud | Hardcoded HTML en `emailService.ts:175-206` | 🟡 LEGACY (Hardcoded) |
| `merchant_application_approved` | Comercio | Aprobación & Provisión | Hardcoded HTML en `emailService.ts:220-268` | 🟡 LEGACY (Hardcoded) |
| `merchant_application_rejected` | Comercio | Rechazo de Solicitud | Hardcoded HTML en `emailService.ts:280-314` | 🟡 LEGACY (Hardcoded) |
| `merchant_application_docs_requested` | Comercio | Docs Requeridos | Hardcoded HTML en `emailService.ts:325-358` | 🟡 LEGACY (Hardcoded) |
| `user_password_reset` / `password_reset` | Usuario / Admin | Reset de Contraseña | Hardcoded HTML en `emailService.ts:502-538` | 🟡 LEGACY (Hardcoded) |
| `customer_welcome` | Cliente | Registro Inicial | *No existe* | 🔴 MISSING |
| `customer_email_verification` | Cliente | Verificación de Email | Firebase Auth nativo (`sendEmailVerification`) | 🟢 WORKING (Auth) |
| `courier_application_received` | Motorizado | Registro Inicial | *No existe* | 🔴 MISSING |
| `courier_application_approved` | Motorizado | Aprobación Inicial | *No existe* | 🔴 MISSING |
| `courier_application_rejected` | Motorizado | Rechazo Inicial | *No existe* | 🔴 MISSING |

---

## 4. EXISTING AUTHENTICATION ARCHITECTURE

| Flujo | Implementación Canónica | Almacenamiento de Credenciales | Estado |
|---|---|---|---|
| Customer Login & Registro | Firebase Auth (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`) | Firebase Auth Secure Identity | 🟢 CANONICAL |
| Customer Email Verification | Firebase Auth (`user.sendEmailVerification()`, `user.reload()`) | Firebase Auth Secure Tokens | 🟢 CANONICAL |
| Customer Password Reset | Firebase Auth (`auth.sendPasswordResetEmail()`) | Firebase Auth Secure Action Codes | 🟢 CANONICAL |
| Admin Password Reset Link | Firebase Auth Admin SDK (`admin.auth().generatePasswordResetLink()`) | ActionCodeSettings + One-time secure URL | 🟢 CANONICAL |
| Merchant Provisioning | Firebase Auth Admin SDK (`admin.auth().createUser()` + `generatePasswordResetLink()`) | Server-side temp password / Reset link | 🟢 CANONICAL |
| Courier Provisioning | Firebase Auth Admin SDK (`admin.auth().createUser()`) | Server-side temp password | 🟢 CANONICAL |
| Password Storage en Firestore | **PROHIBIDO** | **Ninguna contraseña en texto plano en DB** | 🟢 ZERO EXPOSURE |

---

## 5. EXISTING SECRETS & SECRET MANAGEMENT

| Secret Key | Ubicación | Consumidor | Estado |
|---|---|---|---|
| `SENDGRID_API_KEY` | GCP Secret Manager / `process.env.SENDGRID_API_KEY` | `EmailService.ts` | 🟢 OPERACIONAL |
| `SMTP_API_KEY` | Definido en `functions/src/config/secretManager.ts:17` | `SecretService` | 🟡 DECLARADO |
| `SMTP_PASSWORD` | Requerido por Actividad #20 (`mail.bluesystemdelivery.com`) | `SecretService` / `EmailService` | 🟡 POR CONFIGURAR |
| `SMTP_USER` | `noreply@bluesystemdelivery.com` | `EmailService` | 🟢 ESTÁNDAR |
| `SMTP_HOST` | `mail.bluesystemdelivery.com` | `EmailService` | 🟢 ESTÁNDAR |
| `SMTP_PORT` | `465` (SSL/TLS) | `EmailService` | 🟢 ESTÁNDAR |

---

## 6. EXISTING EMAIL LOGS & IDEMPOTENCY

| Colección | Estructura de Documentos | Mecanismo de Idempotencia | Estado |
|---|---|---|---|
| `/merchant_applications/{appId}/email_events/{eventType}` | `eventType, appId, recipient, subject, status, providerMessageId, sentAt, failedAt` | Verifica `status === 'SENT'` antes de reenviar; retorna `status: 'SKIPPED'` | 🟢 WORKING (Subcolección) |
| `/users/{uid}/email_events/{eventId}` | `eventType, uid, recipient, subject, status, providerMessageId, sentAt, failedAt` | EventId con timestamp (`${eventType}_${Date.now()}`) | 🟡 PARCIAL (Sin deduplicación estricta de ventana) |
| `/email_events/{eventId}` (Canónica Global) | *No existe colección raíz centralizada unificada* | N/A | 🔴 MISSING CENTRAL LOG |

---

## 7. EVALUACIÓN TÉCNICA: SENDGRID → SMTP CORPORATIVO

1. **Infraestructura SMTP Corporativa:**
   - Host: `mail.bluesystemdelivery.com`
   - Puerto: `465` (SSL/TLS nativo)
   - Usuario: `noreply@bluesystemdelivery.com`
   - Seguridad: Certificado SSL/TLS válido, autenticación requerida.
2. **Decisión Arquitectónica:**
   - **Opción C + E:** Evolucionar `functions/src/services/emailService.ts` integrando una abstracción de transporte (`EmailTransport` con `SmtpEmailTransport` basado en `nodemailer`).
   - Reemplazar SendGrid como transportador primario por defecto usando SMTP corporativo (`mail.bluesystemdelivery.com:465`).
   - Mantener compatibilidad transparente para que todas las funciones que llaman a `EmailService` no sufran cambios de firma de métodos, pero se beneficien del nuevo motor de plantillas y SMTP seguro.
   - Centralizar el log de eventos en la colección raíz canónica `/email_events/{eventId}` manteniendo la trazabilidad histórica.

---

## 8. GAP ANALYSIS & MATRIZ DE RIESGOS

| Componente | Clasificación | Diagnóstico | Acción Requerida |
|---|---|---|---|
| `emailService.ts` | 🟢 WORKING / EVOLVABLE | Posee lógica de idempotencia y llamadas operativas, pero está atado a SendGrid y tiene plantillas HTML hardcodeadas. | Evolucionar a SMTP corporativo + Template Engine dinámico sin crear servicios paralelos. |
| Motor de Plantillas | 🔴 MISSING | No existe un Template Engine centralizado con resolución dinámica, variables validadas y sanitización HTML. | Implementar `EmailTemplateEngine` en backend con validación estricta de variables y sanitización. |
| Admin Web Email Templates | 🔴 MISSING | El Admin Web no posee interfaz para listar, previsualizar, editar y probar plantillas de correo. | Implementar módulo `emailTemplatesModule` en `panel-admin/public/js/dashboard/emailTemplates.js` y registrarlo en `dashboard.js`. |
| Colección Canónica `/email_events` | 🔴 MISSING | Los eventos están dispersos en subcolecciones de usuarios y solicitudes. | Estandarizar persistencia en `/email_events/{eventId}` con soporte de idempotencia atómica y retry policy. |
| Courier Email Events | 🔴 MISSING | Las solicitudes y aprobaciones de motorizados no disparaban correos transaccionales. | Integrar `EmailService.sendCourierApplicationReceivedEmail` y `EmailService.sendCourierApplicationApprovedEmail`. |
| Customer Welcome Email | 🔴 MISSING | El registro de clientes no dispara correo transaccional de bienvenida. | Integrar trigger de bienvenida en Cloud Functions para nuevos clientes (`customer_welcome`). |
| Secret Management | 🟢 WORKING | `SecretService` gestiona GCP Secret Manager y fallbacks de forma segura sin exponer credenciales en frontend. | Incorporar `SMTP_PASSWORD` y configuración SMTP en `SecretService`. |
| Reglas Firestore | 🟡 MISSING RULES | No existen reglas explícitas para `/email_events` y `/email_templates`. | Agregar reglas de seguridad: lectura restringida a Platform Admins, escritura exclusiva backend (Admin SDK). |

---

## 9. CONCLUSIÓN DE LA FASE 0

La arquitectura existente posee bases sólidas (EIAM, Idempotencia, Secret Manager, Cloud Functions unificadas). La Actividad #20 puede implementarse con **cambios quirúrgicos y cero duplicidad** evolucionando `functions/src/services/emailService.ts`, agregando el `EmailTemplateEngine`, incorporando el transporte SMTP corporativo `mail.bluesystemdelivery.com:465`, completando los eventos transaccionales faltantes de Customer y Courier, y habilitando el módulo de gestión en el Admin Web.
