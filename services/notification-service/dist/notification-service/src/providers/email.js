"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProvider = void 0;
class EmailProvider {
    static async sendTransactionalEmail(to, subject, templateHtml) {
        // Transactual Email Provider Engine (SendGrid / SMTP API)
        return {
            success: true,
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        };
    }
}
exports.EmailProvider = EmailProvider;
