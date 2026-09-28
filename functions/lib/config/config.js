"use strict";
/**
 * BlueSystem Delivery Enterprise — Unified App Config
 * Sprint 17.1 Infrastructure Foundation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfig = void 0;
const environment_1 = require("./environment");
const secretManager_1 = require("./secretManager");
class AppConfig {
    static get env() {
        return (0, environment_1.getEnvironment)();
    }
    static async getSecret(key) {
        return secretManager_1.secretService.getSecret(key);
    }
    static async getGoogleMapsKey() {
        return this.getSecret("GOOGLE_MAPS_API_KEY");
    }
    static async getFcmServerKey() {
        return this.getSecret("FCM_SERVER_KEY");
    }
    static async getJwtSigningSecret() {
        return this.getSecret("JWT_SIGNING_SECRET");
    }
}
exports.AppConfig = AppConfig;
//# sourceMappingURL=config.js.map