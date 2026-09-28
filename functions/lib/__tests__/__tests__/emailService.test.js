"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const emailService_1 = require("../services/emailService");
// Mock Transport para pruebas unitarias sin dependencias externas
class MockEmailTransport {
    constructor() {
        this.sentEmails = [];
        this.shouldFail = false;
        this.failCount = 0;
        this.customErrorMessage = "SMTP Connection Failed";
    }
    async send(options) {
        if (this.shouldFail) {
            this.failCount++;
            throw new Error(this.customErrorMessage);
        }
        const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.sentEmails.push({ ...options, messageId });
        return { messageId, response: "250 OK: Message queued" };
    }
    async verifyConnection() {
        return !this.shouldFail;
    }
}
// Mock Firestore in-memory
class MockFirestore {
    constructor() {
        this.store = new Map();
    }
    collection(colName) {
        const store = this.store;
        return {
            doc: (docId) => {
                const fullPath = `${colName}/${docId}`;
                return {
                    get: async () => {
                        const data = store.get(fullPath);
                        return {
                            exists: !!data,
                            data: () => data,
                        };
                    },
                    set: async (data, options) => {
                        if (options?.merge && store.has(fullPath)) {
                            store.set(fullPath, { ...store.get(fullPath), ...data });
                        }
                        else {
                            store.set(fullPath, data);
                        }
                    },
                    collection: (subColName) => {
                        return {
                            doc: (subDocId) => {
                                const subPath = `${fullPath}/${subColName}/${subDocId}`;
                                return {
                                    get: async () => {
                                        const data = store.get(subPath);
                                        return {
                                            exists: !!data,
                                            data: () => data,
                                        };
                                    },
                                    set: async (data, options) => {
                                        if (options?.merge && store.has(subPath)) {
                                            store.set(subPath, { ...store.get(subPath), ...data });
                                        }
                                        else {
                                            store.set(subPath, data);
                                        }
                                    },
                                };
                            },
                        };
                    },
                };
            },
        };
    }
}
(0, node_test_1.describe)("Actividad #20 — Sistema de Email Transaccional Enterprise (Unit & E2E)", () => {
    let mockTransport;
    let mockDb;
    (0, node_test_1.beforeEach)(() => {
        mockTransport = new MockEmailTransport();
        mockDb = new MockFirestore();
        emailService_1.EmailService.setTransport(mockTransport);
        emailService_1.EmailService.setDb(mockDb);
        emailService_1.EmailTemplateEngine.setDb(mockDb);
    });
    // ─── 1. HTML Sanitizer & Security Tests ─────────────────────────────────────
    (0, node_test_1.test)("HtmlSanitizer should remove dangerous scripts, iframes and onclick handlers", () => {
        const dirtyHtml = `
      <div>
        <h1>Hola</h1>
        <script>alert('XSS');</script>
        <iframe src="https://malicious.com"></iframe>
        <a href="javascript:alert(1)" onclick="stealCookies()">Clic aquí</a>
        <p>Texto seguro</p>
      </div>
    `;
        const cleanHtml = emailService_1.HtmlSanitizer.sanitize(dirtyHtml);
        assert.strictEqual(cleanHtml.includes("<script>"), false);
        assert.strictEqual(cleanHtml.includes("<iframe>"), false);
        assert.strictEqual(cleanHtml.includes("javascript:"), false);
        assert.strictEqual(cleanHtml.includes("onclick="), false);
        assert.strictEqual(cleanHtml.includes("Texto seguro"), true);
    });
    (0, node_test_1.test)("HtmlSanitizer.isSafeUrl should only accept https:// and mailto: schemes", () => {
        assert.strictEqual(emailService_1.HtmlSanitizer.isSafeUrl("https://bluesystemdelivery.com"), true);
        assert.strictEqual(emailService_1.HtmlSanitizer.isSafeUrl("mailto:soporte@bluesystemdelivery.com"), true);
        assert.strictEqual(emailService_1.HtmlSanitizer.isSafeUrl("http://insecure.com"), false);
        assert.strictEqual(emailService_1.HtmlSanitizer.isSafeUrl("javascript:alert(1)"), false);
        assert.strictEqual(emailService_1.HtmlSanitizer.isSafeUrl("data:text/html,evil"), false);
    });
    (0, node_test_1.test)("HtmlSanitizer.htmlToPlainText should generate clean readable plain text", () => {
        const html = `<h2>Bienvenido</h2><p>Hola <strong>Juan</strong>,<br>Tu pedido está listo.</p><a href="https://ejemplo.com">Ver pedido</a>`;
        const text = emailService_1.HtmlSanitizer.htmlToPlainText(html);
        assert.strictEqual(text.includes("Bienvenido"), true);
        assert.strictEqual(text.includes("Hola Juan"), true);
        assert.strictEqual(text.includes("https://ejemplo.com"), true);
        assert.strictEqual(text.includes("<strong>"), false);
    });
    // ─── 2. Template Engine & Variable Validation Tests ─────────────────────────
    (0, node_test_1.test)("EmailTemplateEngine should validate declared variables and detect invalid ones", () => {
        const allowed = ["customerName", "email", "platformName"];
        const validText = "Hola {{customerName}}, tu correo es {{email}} en {{platformName}}";
        const res1 = emailService_1.EmailTemplateEngine.validateVariables(validText, allowed);
        assert.strictEqual(res1.isValid, true);
        assert.strictEqual(res1.invalidVariables.length, 0);
        const invalidText = "Hola {{customerNam}}, tu password es {{secretPassword}}";
        const res2 = emailService_1.EmailTemplateEngine.validateVariables(invalidText, allowed);
        assert.strictEqual(res2.isValid, false);
        assert.deepStrictEqual(res2.invalidVariables, ["customerNam", "secretPassword"]);
    });
    (0, node_test_1.test)("EmailTemplateEngine should resolve all 10 canonical system templates", async () => {
        const templates = [
            "customer_welcome",
            "merchant_application_received",
            "merchant_application_approved",
            "merchant_application_rejected",
            "merchant_application_docs_requested",
            "courier_application_received",
            "courier_application_approved",
            "courier_application_rejected",
            "user_password_reset",
            "admin_test_email",
        ];
        for (const tId of templates) {
            const tpl = await emailService_1.EmailTemplateEngine.resolveTemplate(tId);
            assert.ok(tpl, `Template ${tId} should exist`);
            assert.strictEqual(tpl.templateId, tId);
            assert.strictEqual(tpl.status, "ACTIVE");
            assert.ok(tpl.allowedVariables.length > 0);
        }
    });
    (0, node_test_1.test)("EmailTemplateEngine.render should produce responsive HTML with branding and plain text fallback", async () => {
        const tpl = await emailService_1.EmailTemplateEngine.resolveTemplate("customer_welcome");
        const rendered = emailService_1.EmailTemplateEngine.render(tpl, {
            customerName: "Carlos Pérez",
            email: "carlos@ejemplo.com",
        });
        assert.strictEqual(rendered.subject.includes("BlueSystem Delivery"), true);
        assert.strictEqual(rendered.html.includes("Carlos Pérez"), true);
        assert.strictEqual(rendered.html.includes("carlos@ejemplo.com"), true);
        assert.strictEqual(rendered.html.includes("<!DOCTYPE html>"), true);
        assert.ok(rendered.text.length > 0);
    });
    // ─── 3. Error Classifier Tests ──────────────────────────────────────────────
    (0, node_test_1.test)("EmailErrorClassifier should classify SMTP and template error categories", () => {
        assert.strictEqual(emailService_1.EmailErrorClassifier.classify(new Error("535 5.7.8 Authentication credentials invalid")), "AUTHENTICATION_ERROR");
        assert.strictEqual(emailService_1.EmailErrorClassifier.classify(new Error("Connection timeout ETIMEDOUT")), "TIMEOUT");
        assert.strictEqual(emailService_1.EmailErrorClassifier.classify(new Error("certificate has expired TLS")), "TLS_ERROR");
        assert.strictEqual(emailService_1.EmailErrorClassifier.classify(new Error("550 No such user here recipient")), "INVALID_RECIPIENT");
        assert.strictEqual(emailService_1.EmailErrorClassifier.classify(new Error("unknown variable in template")), "VARIABLE_ERROR");
    });
    // ─── 4. Functional Dispatch Flows Tests ──────────────────────────────────────
    (0, node_test_1.test)("Customer Welcome Email should dispatch successfully", async () => {
        const result = await emailService_1.EmailService.sendCustomerWelcomeEmail({
            uid: `test_user_${Date.now()}`,
            email: "cliente.test@ejemplo.com",
            customerName: "Ana Martínez",
        });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, "SENT");
        assert.ok(result.providerMessageId);
        assert.strictEqual(mockTransport.sentEmails.length, 1);
        assert.strictEqual(mockTransport.sentEmails[0].to, "cliente.test@ejemplo.com");
    });
    (0, node_test_1.test)("Merchant Application Approved Email should dispatch successfully", async () => {
        const appId = `app_merch_${Date.now()}`;
        const result = await emailService_1.EmailService.sendApplicationApprovedEmail({
            appId,
            email: "restaurante@ejemplo.com",
            contactName: "Roberto Gomez",
            businessName: "Tacos El Pro",
            businessId: "biz_tacos_123",
            activationLink: "https://comercio.bluesystemdelivery.com/activate",
        });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, "SENT");
        assert.strictEqual(mockTransport.sentEmails[0].to, "restaurante@ejemplo.com");
    });
    (0, node_test_1.test)("Courier Application Received & Approved Emails should dispatch successfully", async () => {
        const appId = `app_courier_${Date.now()}`;
        // Received
        const resRcv = await emailService_1.EmailService.sendCourierApplicationReceivedEmail({
            appId,
            email: "motorizado@ejemplo.com",
            candidateName: "Mario Silva",
            plate: "M 889900",
        });
        assert.strictEqual(resRcv.success, true);
        assert.strictEqual(resRcv.status, "SENT");
        // Approved
        const resAppr = await emailService_1.EmailService.sendCourierApplicationApprovedEmail({
            appId,
            email: "motorizado@ejemplo.com",
            candidateName: "Mario Silva",
            plate: "M 889900",
            courierId: "courier_123",
            tempPassword: "SecureTempPassword456!",
        });
        assert.strictEqual(resAppr.success, true);
        assert.strictEqual(resAppr.status, "SENT");
        assert.strictEqual(mockTransport.sentEmails.length, 2);
        // Verificación de credenciales temporales y eliminación de botón web
        assert.strictEqual(mockTransport.sentEmails[1].html.includes("SecureTempPassword456!"), true);
        assert.strictEqual(mockTransport.sentEmails[1].html.includes("Abrir App de Repartidor"), false);
        assert.strictEqual(mockTransport.sentEmails[1].html.includes("https://bluesystemdelivery.com"), false);
    });
    (0, node_test_1.test)("Password Reset Email should dispatch with secure one-time link", async () => {
        const result = await emailService_1.EmailService.sendPasswordResetEmail({
            uid: "user_test_pwd",
            email: "usuario@ejemplo.com",
            contactName: "Laura Diaz",
            resetLink: "https://bluesystemdelivery.com/reset?token=secureToken123",
            reason: "Restablecimiento solicitado por soporte",
        });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, "SENT");
        assert.strictEqual(mockTransport.sentEmails[0].html.includes("https://bluesystemdelivery.com/reset?token=secureToken123"), true);
    });
    (0, node_test_1.test)("Admin Test Email should dispatch with sample data to explicit recipient", async () => {
        const result = await emailService_1.EmailService.sendTestEmail({
            templateId: "admin_test_email",
            recipient: "admin.test@bluesystemdelivery.com",
            adminUid: "admin_super_123",
        });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, "SENT");
        assert.strictEqual(mockTransport.sentEmails[0].to, "admin.test@bluesystemdelivery.com");
    });
    // ─── 5. Idempotency & Failure Resilience Tests ──────────────────────────────
    (0, node_test_1.test)("Idempotency: duplicate send of same eventId should return SKIPPED without resending", async () => {
        const eventId = `idempotent_test_event_${Date.now()}`;
        // Primer envío
        const res1 = await emailService_1.EmailService.sendTransactionalEmail({
            eventId,
            eventType: "CUSTOMER_REGISTERED",
            recipient: "dup@ejemplo.com",
            templateId: "customer_welcome",
            variables: { customerName: "Pedro", email: "dup@ejemplo.com" },
        });
        assert.strictEqual(res1.status, "SENT");
        assert.strictEqual(mockTransport.sentEmails.length, 1);
        // Segundo envío (idéntico eventId)
        const res2 = await emailService_1.EmailService.sendTransactionalEmail({
            eventId,
            eventType: "CUSTOMER_REGISTERED",
            recipient: "dup@ejemplo.com",
            templateId: "customer_welcome",
            variables: { customerName: "Pedro", email: "dup@ejemplo.com" },
        });
        assert.strictEqual(res2.status, "SKIPPED");
        assert.strictEqual(res2.success, true);
        // El transporte NO debe haber recibido un segundo correo
        assert.strictEqual(mockTransport.sentEmails.length, 1);
    });
    (0, node_test_1.test)("Retry Policy: transient failures should trigger retries up to maxRetries", async () => {
        mockTransport.shouldFail = true;
        mockTransport.customErrorMessage = "Connection timeout ETIMEDOUT";
        const eventId = `retry_test_${Date.now()}`;
        const res = await emailService_1.EmailService.sendTransactionalEmail({
            eventId,
            eventType: "COURIER_REGISTERED",
            recipient: "retry@ejemplo.com",
            templateId: "courier_application_received",
            variables: { appId: "app_1", email: "retry@ejemplo.com", candidateName: "Test", plate: "M 123" },
            maxRetries: 2,
        });
        assert.strictEqual(res.success, false);
        assert.strictEqual(res.status, "FAILED");
        assert.strictEqual(res.errorCategory, "TIMEOUT");
        assert.strictEqual(mockTransport.failCount, 2);
    });
});
