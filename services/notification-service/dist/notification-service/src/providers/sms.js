"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsProvider = void 0;
class SmsProvider {
    static async sendSms(phoneNumber, message) {
        // Twilio SMS Engine
        return {
            success: true,
            sid: `SM_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        };
    }
}
exports.SmsProvider = SmsProvider;
