import * as functions from "firebase-functions";
import { processCampaign } from "../services/notificationQueueWorker";
import { Logger } from "../shared/logger/logger";

/**
 * 1. TRIGGER: Nueva campaña creada en notification_campaigns/{campaignId} con status = "QUEUED"
 */
export const onNotificationCampaignCreated = functions.firestore
  .document("notification_campaigns/{campaignId}")
  .onCreate(async (snap, context) => {
    const campaignId = context.params.campaignId;
    const data = snap.data();

    if (!data || data.status !== "QUEUED") {
      return null;
    }

    Logger.info(`Trigger onCreate detectó campaña en cola QUEUED: ${campaignId}`, {
      module: "notificationQueueTrigger",
      campaignId,
    });

    return processCampaign(campaignId, `trigger_create_${context.eventId}`);
  });

/**
 * 2. TRIGGER: Campaña actualizada a status = "QUEUED" (ej: desde Borrador o Reintento manual)
 */
export const onNotificationCampaignUpdated = functions.firestore
  .document("notification_campaigns/{campaignId}")
  .onUpdate(async (change, context) => {
    const campaignId = context.params.campaignId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (!afterData) return null;

    // Solo reaccionar cuando el estado cambie a QUEUED desde otro estado diferente a QUEUED/PROCESSING
    if (beforeData.status !== "QUEUED" && afterData.status === "QUEUED") {
      Logger.info(`Trigger onUpdate detectó cambio a status QUEUED para campaña: ${campaignId}`, {
        module: "notificationQueueTrigger",
        campaignId,
        previousStatus: beforeData.status,
      });

      return processCampaign(campaignId, `trigger_update_${context.eventId}`);
    }

    return null;
  });
