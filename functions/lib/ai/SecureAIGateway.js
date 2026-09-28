"use strict";
/**
 * BlueSystem Delivery Enterprise — Secure AI Gateway (Cloud Function Callables)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */
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
exports.processCustomerAIChat = exports.customerAIGateway = void 0;
const functions = __importStar(require("firebase-functions"));
const CustomerAIService_1 = require("./CustomerAIService");
/**
 * 1. Endpoint Callable para Despacho Directo de Herramientas Backend
 */
exports.customerAIGateway = functions.https.onCall(async (data, context) => {
    var _a;
    const authUid = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || "";
    const isAuthenticated = Boolean(authUid);
    const appCheckVerified = Boolean(context.app);
    const confirmedByUser = Boolean(data.confirmedByUser);
    const confirmationToken = typeof data.confirmationToken === "string" ? data.confirmationToken : undefined;
    const executionContext = {
        authUid,
        isAuthenticated,
        appCheckVerified,
        confirmedByUser,
        confirmationToken,
        clientTimestamp: Date.now(),
    };
    return await CustomerAIService_1.defaultCustomerAIService.executeTool(data, executionContext);
});
/**
 * 2. Endpoint Callable para Conversación Natural con Gemini Orquestado
 */
exports.processCustomerAIChat = functions.https.onCall(async (data, context) => {
    var _a;
    const authUid = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || "";
    const isAuthenticated = Boolean(authUid);
    const appCheckVerified = Boolean(context.app);
    const confirmationToken = typeof data.confirmedToken === "string" ? data.confirmedToken : undefined;
    const executionContext = {
        authUid,
        isAuthenticated,
        appCheckVerified,
        confirmedByUser: Boolean(confirmationToken),
        confirmationToken,
        clientTimestamp: Date.now(),
    };
    return await CustomerAIService_1.defaultCustomerAIService.processConversationalChat(data, executionContext);
});
//# sourceMappingURL=SecureAIGateway.js.map