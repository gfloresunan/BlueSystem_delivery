"use strict";
/**
 * BlueSystem Delivery Enterprise — Environment Configuration
 * Sprint 17.1 Infrastructure Foundation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironment = void 0;
const getEnvironment = () => {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    const projectId = process.env.GCP_PROJECT || process.env.FIREBASE_CONFIG
        ? JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId || "bluesystem-7c9af"
        : "bluesystem-7c9af";
    return {
        env,
        projectId,
        region: process.env.FUNCTION_REGION || "us-central1",
        isStaging: env === "staging" || projectId.includes("staging"),
        isProduction: env === "production" && !projectId.includes("staging"),
        logLevel: process.env.LOG_LEVEL || "INFO",
    };
};
exports.getEnvironment = getEnvironment;
//# sourceMappingURL=environment.js.map