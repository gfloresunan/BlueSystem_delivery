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
exports.onNotificationCampaignUpdated = exports.onNotificationCampaignCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const notificationQueueWorker_1 = require("../services/notificationQueueWorker");
const logger_1 = require("../shared/logger/logger");
/**
 * 1. TRIGGER: Nueva campaña creada en notification_campaigns/{campaignId} con status = "QUEUED"
 */
exports.onNotificationCampaignCreated = functions.firestore
    .document("notification_campaigns/{campaignId}")
    .onCreate(async (snap, context) => {
    const campaignId = context.params.campaignId;
    const data = snap.data();
    if (!data || data.status !== "QUEUED") {
        return null;
    }
    logger_1.Logger.info(`Trigger onCreate detectó campaña en cola QUEUED: ${campaignId}`, {
        module: "notificationQueueTrigger",
        campaignId,
    });
    return (0, notificationQueueWorker_1.processCampaign)(campaignId, `trigger_create_${context.eventId}`);
});
/**
 * 2. TRIGGER: Campaña actualizada a status = "QUEUED" (ej: desde Borrador o Reintento manual)
 */
exports.onNotificationCampaignUpdated = functions.firestore
    .document("notification_campaigns/{campaignId}")
    .onUpdate(async (change, context) => {
    const campaignId = context.params.campaignId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    if (!afterData)
        return null;
    // Solo reaccionar cuando el estado cambie a QUEUED desde otro estado diferente a QUEUED/PROCESSING
    if (beforeData.status !== "QUEUED" && afterData.status === "QUEUED") {
        logger_1.Logger.info(`Trigger onUpdate detectó cambio a status QUEUED para campaña: ${campaignId}`, {
            module: "notificationQueueTrigger",
            campaignId,
            previousStatus: beforeData.status,
        });
        return (0, notificationQueueWorker_1.processCampaign)(campaignId, `trigger_update_${context.eventId}`);
    }
    return null;
});
//# sourceMappingURL=notificationQueue.js.map