import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "bluesystem-7c9af",
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutos de arrendamiento / lease
const MAX_ATTEMPTS = 3;

export interface ProcessCampaignResult {
  claimed: boolean;
  campaignId: string;
  status: string;
  successCount?: number;
  failureCount?: number;
  targetedDevices?: number;
  targetedUsers?: number;
  invalidTokenCount?: number;
  executionTimeMs?: number;
  skippedAlreadyAcceptedCount?: number;
  error?: string;
}

export type DeliveryStatus = "PENDING" | "SENDING" | "FCM_ACCEPTED" | "FAILED_RETRYABLE" | "FAILED_PERMANENT";

/**
 * Actualiza el heartbeat de arrendamiento para evitar que un segundo Worker asuma lease expirado en campañas largas
 */
async function updateLeaseHeartbeat(campaignRef: admin.firestore.DocumentReference) {
  try {
    await campaignRef.update({
      processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      leaseHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    Logger.warn("Error actualizando leaseHeartbeat", { error: err.message });
  }
}

/**
 * Genera la clave determinista de entrega por combinación única campaignId + uid + deviceId
 */
export function buildDeliveryKey(campaignId: string, uid: string, deviceId: string): string {
  const cleanUid = (uid || "unknown").trim();
  const cleanDeviceId = (deviceId || "default").trim();
  return `${campaignId}_${cleanUid}_${cleanDeviceId}`;
}

/**
 * Procesa de forma atómica, robusta e IDEMPOTENTE A NIVEL DE FCM una campaña en cola.
 */
export async function processCampaign(
  campaignId: string,
  workerId: string = `worker_${process.env.K_REVISION || "local"}_${Date.now()}`
): Promise<ProcessCampaignResult> {
  const startTime = Date.now();
  const campaignRef = db.collection("notification_campaigns").doc(campaignId);

  // ─── FASE 4 — LOCK / CLAIM ATÓMICO CON TRANSACCIÓN ──────────────────────────
  let campaignData: admin.firestore.DocumentData | null = null;

  try {
    const claimSuccess = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(campaignRef);
      if (!doc.exists) {
        return false;
      }

      const data = doc.data()!;
      const currentStatus = data.status || "QUEUED";
      const scheduledAt = data.scheduledAt ? data.scheduledAt.toDate() : null;
      const nextRetryAt = data.nextRetryAt ? data.nextRetryAt.toDate() : null;
      const lastHeartbeat = data.leaseHeartbeatAt || data.processingStartedAt;
      const lastHeartbeatDate = lastHeartbeat ? lastHeartbeat.toDate() : null;
      const now = new Date();

      // Verificar si la campaña es procesable
      let isClaimable = false;

      if (currentStatus === "QUEUED" || currentStatus === "TEST_QUEUED") {
        if (!scheduledAt || scheduledAt <= now) {
          isClaimable = true;
        }
      } else if (currentStatus === "RETRY") {
        if (!nextRetryAt || nextRetryAt <= now) {
          isClaimable = true;
        }
      } else if (currentStatus === "PROCESSING") {
        // Recuperación de lease abandonado si expiró el tiempo razonable sin heartbeat activo
        if (lastHeartbeatDate && now.getTime() - lastHeartbeatDate.getTime() > LEASE_DURATION_MS) {
          Logger.warn(`Recuperando campaña abandonada en status PROCESSING: ${campaignId}`, {
            module: "notificationQueueWorker",
            campaignId,
            lastHeartbeatDate,
          });
          isClaimable = true;
        }
      }

      if (!isClaimable) {
        return false;
      }

      // Adquirir lock atómico
      transaction.update(campaignRef, {
        status: "PROCESSING",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        leaseHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
        workerId: workerId,
        attempts: admin.firestore.FieldValue.increment(1),
        lastError: null,
      });

      campaignData = data;
      return true;
    });

    if (!claimSuccess || !campaignData) {
      return {
        claimed: false,
        campaignId,
        status: "IGNORED_OR_ALREADY_CLAIMED",
      };
    }

    Logger.info(`Lock adquirido exitosamente para campaña: ${campaignId} (Worker: ${workerId})`, {
      module: "notificationQueueWorker",
      campaignId,
      workerId,
    });
  } catch (err: any) {
    Logger.error(`Error adquiriendo lock para campaña ${campaignId}`, err, {
      module: "notificationQueueWorker",
      campaignId,
    });
    return {
      claimed: false,
      campaignId,
      status: "CLAIM_ERROR",
      error: err.message,
    };
  }

  // ─── FASE 5, 6 & 3.2 — RESOLUCIÓN DE TARGETS & DELIVERIES PERSISTENTES ────────
  const activeCampaignData = campaignData as admin.firestore.DocumentData;
  try {
    const {
      title,
      body,
      imageUrl,
      deepLink,
      destinationRoute,
      navigationRoute,
      destinationType,
      entityId,
      entityType,
      action,
      businessId,
      productId,
      couponId,
      supportConversationId,
      orderId,
      tripId,
      targetType,
      targetUids,
      targetSegment,
      category,
      type,
      priority,
      buttons,
    } = activeCampaignData;
    const currentAttempts = (activeCampaignData.attempts || 0) + 1;

    // 1. Obtener UIDs objetivos
    let uidsToFilter: string[] | null = null;
    const targetTypeLower = (targetType || "all").toString().toLowerCase().trim();
    const isPromotionalCampaign =
      (type || "").toString().toUpperCase() === "PROMOTION" ||
      (category || "").toString().toLowerCase() === "promociones" ||
      (category || "").toString().toLowerCase() === "marketing" ||
      (activeCampaignData.targetAudience || "").toString().toUpperCase() === "CUSTOMER" ||
      targetTypeLower === "customer" ||
      targetTypeLower === "cliente" ||
      targetTypeLower === "no_orders" ||
      targetTypeLower === "frequent_orders";

    const nonCustomerRoles = [
      "business", "comercio", "merchant", "merchant_owner", "owner",
      "manager", "store_manager", "courier", "motorizado", "driver",
      "admin", "super_admin", "supervisor", "operator"
    ];

    if (Array.isArray(targetUids) && targetUids.length > 0) {
      uidsToFilter = targetUids;
    } else if (targetTypeLower === "active_30_days") {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeUsersSnap = await db.collection("users").where("lastLogin", ">=", thirtyDaysAgo).get();
      uidsToFilter = activeUsersSnap.docs
        .filter((d) => {
          const uRole = (d.data().role || d.data().eiamRole || d.data().userType || "customer").toString().toLowerCase();
          return isPromotionalCampaign ? !nonCustomerRoles.includes(uRole) : true;
        })
        .map((d) => d.id);
    } else if (targetTypeLower === "no_orders") {
      const noOrdersSnap = await db.collection("users").where("orderCount", "==", 0).get();
      uidsToFilter = noOrdersSnap.docs
        .filter((d) => {
          const uRole = (d.data().role || d.data().eiamRole || d.data().userType || "customer").toString().toLowerCase();
          return !nonCustomerRoles.includes(uRole);
        })
        .map((d) => d.id);
    } else if (targetTypeLower === "frequent_orders") {
      const freqSnap = await db.collection("users").where("orderCount", ">=", 20).get();
      uidsToFilter = freqSnap.docs
        .filter((d) => {
          const uRole = (d.data().role || d.data().eiamRole || d.data().userType || "customer").toString().toLowerCase();
          return !nonCustomerRoles.includes(uRole);
        })
        .map((d) => d.id);
    }

    // 2. Consultar dispositivos activos en user_devices
    let validDevices: Array<{ docId: string; uid: string; deviceId: string; token: string; role: string }> = [];

    if (uidsToFilter !== null) {
      if (uidsToFilter.length > 0) {
        for (let i = 0; i < uidsToFilter.length; i += 30) {
          const chunk = uidsToFilter.slice(i, i + 30);
          const snap = await db
            .collection("user_devices")
            .where("isActive", "==", true)
            .where("uid", "in", chunk)
            .get();

          snap.forEach((doc) => {
            const d = doc.data();
            const token = d.fcmToken ? d.fcmToken.trim() : "";
            const uid = d.uid || doc.id.split("_")[0];
            const deviceId = d.deviceId || (doc.id.includes("_") ? doc.id.substring(uid.length + 1) : doc.id);
            const devRole = (d.role || d.userType || "").toString().toLowerCase();

            // Si es campaña promocional para clientes, excluir dispositivos de comercios o motorizados
            if (isPromotionalCampaign && nonCustomerRoles.includes(devRole)) {
              return;
            }

            if (token && token.length > 20) {
              validDevices.push({
                docId: doc.id,
                uid,
                deviceId,
                token,
                role: devRole,
              });
            }
          });
        }
      }
    } else {
      let query: admin.firestore.Query = db.collection("user_devices").where("isActive", "==", true);

      if (targetTypeLower === "segment" && targetSegment) {
        const segLower = targetSegment.toString().toLowerCase().trim();
        query = query.where("role", "==", segLower);
      } else if (["courier", "driver", "motorizado"].includes(targetTypeLower)) {
        query = query.where("role", "in", ["courier", "driver", "motorizado"]);
      } else if (["customer", "cliente"].includes(targetTypeLower)) {
        query = query.where("role", "in", ["customer", "cliente"]);
      } else if (["business", "comercio"].includes(targetTypeLower)) {
        query = query.where("role", "in", ["business", "comercio"]);
      } else if (["admin", "super_admin"].includes(targetTypeLower)) {
        query = query.where("role", "in", ["admin", "super_admin"]);
      } else if (targetTypeLower !== "all") {
        query = query.where("role", "==", targetTypeLower);
      } else if (targetTypeLower === "all" && isPromotionalCampaign) {
        // Campaña promocional general dirigida a 'all': restringir a clientes
        query = query.where("role", "in", ["customer", "cliente"]);
      }

      const snap = await query.get();
      snap.forEach((doc) => {
        const d = doc.data();
        const token = d.fcmToken ? d.fcmToken.trim() : "";
        const uid = d.uid || doc.id.split("_")[0];
        const deviceId = d.deviceId || (doc.id.includes("_") ? doc.id.substring(uid.length + 1) : doc.id);
        const devRole = (d.role || d.userType || "").toString().toLowerCase();

        if (isPromotionalCampaign && nonCustomerRoles.includes(devRole)) {
          return;
        }

        if (token && token.length > 20) {
          validDevices.push({
            docId: doc.id,
            uid,
            deviceId,
            token,
            role: devRole,
          });
        }
      });
    }

    // ─── FASE 3.2 — AUDITAR Y FILTRAR POR CAMPAIGN_DELIVERIES ───────────────
    // Cargar los delivery records existentes para esta campaña
    const existingDeliveriesSnap = await db
      .collection("campaign_deliveries")
      .where("campaignId", "==", campaignId)
      .get();

    const existingDeliveryStatusMap = new Map<string, DeliveryStatus>();
    existingDeliveriesSnap.forEach((dDoc) => {
      const data = dDoc.data();
      existingDeliveryStatusMap.set(dDoc.id, data.status as DeliveryStatus);
    });

    const devicesToDispatch: Array<{
      deliveryKey: string;
      docId: string;
      uid: string;
      deviceId: string;
      token: string;
    }> = [];

    let skippedAlreadyAcceptedCount = 0;
    const targetedUsersSet = new Set<string>();
    const seenTokensInDispatch = new Set<string>();

    validDevices.forEach((dev) => {
      targetedUsersSet.add(dev.uid);
      const deliveryKey = buildDeliveryKey(campaignId, dev.uid, dev.deviceId);
      const currentDeliveryStatus = existingDeliveryStatusMap.get(deliveryKey);

      if (currentDeliveryStatus === "FCM_ACCEPTED") {
        // IDEMPOTENCIA REAL: El mensaje ya fue aceptado por FCM para este dispositivo. OMITE REENVÍO.
        skippedAlreadyAcceptedCount++;
      } else if (currentDeliveryStatus === "FAILED_PERMANENT") {
        // Dispositivo con fallo irrecuperable previa (ej. NotRegistered). OMITE.
      } else if (seenTokensInDispatch.has(dev.token)) {
        // DEDUPLICACIÓN DE TOKEN: Mismo token físico ya registrado para despacho en esta campaña.
        Logger.info(`Omitiendo token duplicado para ${deliveryKey}`, { module: "notificationQueueWorker", campaignId, token: dev.token });
      } else {
        // Elegible para envío (PENDING, FAILED_RETRYABLE o Nuevo)
        seenTokensInDispatch.add(dev.token);
        devicesToDispatch.push({
          deliveryKey,
          docId: dev.docId,
          uid: dev.uid,
          deviceId: dev.deviceId,
          token: dev.token,
        });
      }
    });

    const targetedDevices = validDevices.length;
    const targetedUsers = targetedUsersSet.size;

    Logger.info(
      `Resolución de entregas para ${campaignId}: Total = ${targetedDevices}, Elegibles = ${devicesToDispatch.length}, Previamente FCM_ACCEPTED = ${skippedAlreadyAcceptedCount}`,
      { module: "notificationQueueWorker", campaignId, targetedDevices, dispatchCount: devicesToDispatch.length, skippedAlreadyAcceptedCount }
    );

    let successCount = skippedAlreadyAcceptedCount;
    let failureCount = 0;
    let invalidTokenCount = 0;

    // ─── FASE 7, 8 & 3.2 — PAYLOAD, HEARTBEAT Y ENVÍO BATCH FCM ─────────────
    if (devicesToDispatch.length > 0) {
      const dataMap: Record<string, string> = {
        campaignId: String(campaignId),
        notificationId: String(campaignId),
        title: String(title || ""),
        body: String(body || ""),
        type: String(type || "PROMOTION"),
        category: String(category || "Promociones"),
        priority: String(priority || "NORMAL"),
        action: String(action || (destinationType ? `OPEN_${destinationType}` : "OPEN_CAMPAIGN")),
        ...(destinationType ? { destinationType: String(destinationType) } : {}),
        ...(destinationRoute ? { destinationRoute: String(destinationRoute) } : {}),
        ...(entityId ? { entityId: String(entityId) } : {}),
        ...(entityType ? { entityType: String(entityType) } : {}),
        ...(businessId ? { businessId: String(businessId) } : {}),
        ...(productId ? { productId: String(productId) } : {}),
        ...(couponId ? { couponId: String(couponId) } : {}),
        ...(supportConversationId ? { supportConversationId: String(supportConversationId) } : {}),
        ...(orderId ? { orderId: String(orderId) } : {}),
        ...(tripId ? { tripId: String(tripId) } : {}),
        ...(imageUrl ? { imageUrl: String(imageUrl) } : {}),
        ...(deepLink ? { deepLink: String(deepLink) } : {}),
        ...(navigationRoute ? { navigationRoute: String(navigationRoute) } : {}),
        ...(buttons ? { buttonsJson: JSON.stringify(buttons) } : {}),
      };

      // Sprint 18.2: Data-Only FCM para Android (evita auto-generación duplicada por Google Play Services)
      const notificationPayload: admin.messaging.MulticastMessage = {
        tokens: [],
        data: dataMap,
        android: {
          priority: priority === "HIGH" || priority === "CRITICAL" ? "high" : "normal",
          directBootOk: true,
        } as any,
        apns: {
          payload: {
            aps: {
              alert: {
                title: String(title || ""),
                body: String(body || ""),
              },
              sound: "default",
              badge: 1,
              contentAvailable: true,
            },
          },
          headers: {
            "apns-priority": priority === "HIGH" || priority === "CRITICAL" ? "10" : "5",
          },
        },
      };

      for (let i = 0; i < devicesToDispatch.length; i += 500) {
        // Enviar Heartbeat antes de cada lote para prevenir expiración prematura de lease
        await updateLeaseHeartbeat(campaignRef);

        const chunkDevices = devicesToDispatch.slice(i, i + 500);
        const chunkTokens = chunkDevices.map((d) => d.token);

        // Pre-crear o marcar estado SENDING en campaign_deliveries
        const initBatch = db.batch();
        chunkDevices.forEach((dev) => {
          const dRef = db.collection("campaign_deliveries").doc(dev.deliveryKey);
          initBatch.set(
            dRef,
            {
              campaignId,
              uid: dev.uid,
              deviceId: dev.deviceId,
              status: "SENDING",
              attempts: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        });
        await initBatch.commit().catch((e) => Logger.warn("Error en batch init delivery records", { error: e.message }));

        // Ejecutar FCM Multicast
        const response = await messaging.sendEachForMulticast({
          ...notificationPayload,
          tokens: chunkTokens,
        });

        const deliveryBatch = db.batch();
        const deviceBatch = db.batch();
        let deviceOps = 0;

        response.responses.forEach((resp, idx) => {
          const targetDev = chunkDevices[idx];
          const dRef = db.collection("campaign_deliveries").doc(targetDev.deliveryKey);

          if (resp.success && resp.messageId) {
            // FCM_ACCEPTED: Aceptado por el proveedor FCM. Idempotente de aquí en adelante.
            successCount++;
            deliveryBatch.set(
              dRef,
              {
                status: "FCM_ACCEPTED",
                fcmMessageId: resp.messageId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastError: null,
              },
              { merge: true }
            );
          } else if (resp.error) {
            const errCode = resp.error.code || "";
            const errMessage = resp.error.message || "";
            const isInvalidToken =
              errCode.includes("registration-token-not-registered") ||
              errCode.includes("invalid-registration-token") ||
              errCode.includes("invalid-argument") ||
              errMessage.includes("NotRegistered") ||
              errMessage.includes("InvalidRegistration") ||
              errMessage.includes("invalid-argument");

            if (isInvalidToken) {
              failureCount++;
              invalidTokenCount++;

              // Marcar delivery como FAILED_PERMANENT
              deliveryBatch.set(
                dRef,
                {
                  status: "FAILED_PERMANENT",
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastError: `FCM Token Inválido: ${errMessage}`,
                },
                { merge: true }
              );

              // Inactivar token en user_devices
              const devRef = db.collection("user_devices").doc(targetDev.docId);
              deviceBatch.set(
                devRef,
                {
                  fcmToken: null,
                  isActive: false,
                  tokenStatus: "invalid",
                  lastCleanedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
              deviceOps++;
            } else {
              failureCount++;
              // Error transitorio: FAILED_RETRYABLE
              deliveryBatch.set(
                dRef,
                {
                  status: "FAILED_RETRYABLE",
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastError: errMessage || "Error transitorio FCM",
                },
                { merge: true }
              );
            }
          }
        });

        await deliveryBatch.commit();
        if (deviceOps > 0) {
          await deviceBatch.commit().catch((e) => Logger.warn("Error inactivando tokens inválidos", { error: e.message }));
        }
      }
    }

    // ─── FASE 13 — IDEMPOTENCIA NOTIFICACIONES IN-APP ───────────────────────
    const recipientUidsList = Array.from(targetedUsersSet);
    if (recipientUidsList.length > 0) {
      for (let i = 0; i < recipientUidsList.length; i += 500) {
        const chunk = recipientUidsList.slice(i, i + 500);
        const batch = db.batch();
        let opsInBatch = 0;

        chunk.forEach((uid) => {
          if (uid && !uid.startsWith("guest_") && !uid.startsWith("device_")) {
            // ID determinista campaignId garantiza idempotencia en buzón
            const userNotifRef = db.collection("users").doc(uid).collection("notifications").doc(campaignId);
            batch.set(
              userNotifRef,
              {
                id: campaignId,
                notificationId: campaignId,
                campaignId,
                title,
                body,
                category: category || "Promociones",
                type: type || "PROMOTION",
                priority: priority || "NORMAL",
                imageUrl: imageUrl || "",
                deepLink: deepLink || "",
                navigationRoute: navigationRoute || deepLink || "",
                destinationType: destinationType || "",
                destinationRoute: navigationRoute || deepLink || "",
                entityId: entityId || "",
                entityType: entityType || "",
                action: action || "",
                businessId: businessId || "",
                productId: productId || "",
                couponId: couponId || "",
                supportConversationId: supportConversationId || "",
                orderId: orderId || "",
                tripId: tripId || "",
                buttons: buttons || [],
                isRead: false,
                read: false,
                deletedByUser: false,
                visibilityStatus: "VISIBLE",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: activeCampaignData.expiresAt || null,
                version: 1,
              },
              { merge: true }
            );
            opsInBatch++;
          }
        });

        if (opsInBatch > 0) {
          await batch.commit();
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    // ─── FASE 12 — DETERMINACIÓN DE ESTADO FINAL DE CAMPAÑA ────────────────
    const finalDeliveriesSnap = await db
      .collection("campaign_deliveries")
      .where("campaignId", "==", campaignId)
      .get();

    let countPending = 0;
    let countSending = 0;
    let countAccepted = 0;
    let countFailedRetryable = 0;
    let countFailedPermanent = 0;

    finalDeliveriesSnap.forEach((dDoc) => {
      const st = dDoc.data().status as DeliveryStatus;
      if (st === "PENDING") countPending++;
      else if (st === "SENDING") countSending++;
      else if (st === "FCM_ACCEPTED") countAccepted++;
      else if (st === "FAILED_RETRYABLE") countFailedRetryable++;
      else if (st === "FAILED_PERMANENT") countFailedPermanent++;
    });

    const isFullyCompleted = countPending === 0 && countSending === 0 && countFailedRetryable === 0;

    if (isFullyCompleted || targetedDevices === 0) {
      // ── TERMINAL: Sin pendientes ni retryables ─────────────────────────────
      // Determinar si fue éxito TOTAL, PARCIAL o FALLIDO TOTAL.
      const deliveryRate = targetedDevices > 0 ? Number(((countAccepted / targetedDevices) * 100).toFixed(1)) : 100.0;

      // SENT: todos los dispositivos objetivo fueron aceptados por FCM (o no había dispositivos).
      // PARTIALLY_SENT: al menos uno fue aceptado, pero no todos (fallos permanentes sin retryable restante).
      // FAILED: ninguno fue aceptado después de agotar los intentos.
      const finalStatus: string =
        targetedDevices === 0
          ? "SENT"
          : countAccepted === targetedDevices
          ? "SENT"
          : countAccepted > 0
          ? "PARTIALLY_SENT"
          : "FAILED";

      await campaignRef.update({
        status: finalStatus,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        targetedUsers,
        targetedDevices,
        tokensSelected: targetedDevices,
        successCount: countAccepted,
        failureCount: countFailedPermanent + countFailedRetryable,
        invalidTokenCount,
        skippedAlreadyAcceptedCount,
        executionTimeMs,
        "analytics.sentCount": targetedUsers,
        "analytics.deliveredCount": countAccepted,
        "analytics.deliveryRate": deliveryRate,
      });

      Logger.info(`Campaña ${campaignId} finalizada como ${finalStatus}: ${countAccepted} FCM_ACCEPTED de ${targetedDevices} objetivo(s), ${skippedAlreadyAcceptedCount} omitidos previstamente`, {
        module: "notificationQueueWorker",
        campaignId,
        campaignStatus: finalStatus,
        countAccepted,
        targetedDevices,
        skippedAlreadyAcceptedCount,
        executionTimeMs,
      });

      return {
        claimed: true,
        campaignId,
        status: finalStatus,
        successCount: countAccepted,
        failureCount: countFailedPermanent + countFailedRetryable,
        targetedDevices,
        targetedUsers,
        invalidTokenCount,
        skippedAlreadyAcceptedCount,
        executionTimeMs,
      };
    } else if (currentAttempts < MAX_ATTEMPTS) {
      // ── RETRY: Aún hay retryables y quedan intentos disponibles ───────────
      const nextRetryAt = admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 1000);
      await campaignRef.update({
        status: "RETRY",
        nextRetryAt,
        successCount: countAccepted,
        failureCount: countFailedPermanent + countFailedRetryable,
        skippedAlreadyAcceptedCount,
        lastError: `Existen ${countFailedRetryable} entregas pendientes de reintento.`,
      });

      return {
        claimed: true,
        campaignId,
        status: "RETRY",
        successCount: countAccepted,
        failureCount: countFailedPermanent + countFailedRetryable,
        skippedAlreadyAcceptedCount,
        executionTimeMs,
      };
    } else {
      // ── AGOTADOS LOS INTENTOS con retryables sin resolver ─────────────────
      // Aplicar la misma semántica ternaria: PARTIALLY_SENT si hay al menos 1 aceptado.
      const finalStatus: string = countAccepted > 0 ? "PARTIALLY_SENT" : "FAILED";
      const deliveryRate = targetedDevices > 0 ? Number(((countAccepted / targetedDevices) * 100).toFixed(1)) : 0.0;

      await campaignRef.update({
        status: finalStatus,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        successCount: countAccepted,
        failureCount: countFailedPermanent + countFailedRetryable,
        skippedAlreadyAcceptedCount,
        "analytics.deliveredCount": countAccepted,
        "analytics.deliveryRate": deliveryRate,
        lastError: `Finalizado tras ${currentAttempts} intentos. ${countAccepted} FCM_ACCEPTED, ${countFailedRetryable} entregas sin completar.`,
      });

      return {
        claimed: true,
        campaignId,
        status: finalStatus,
        successCount: countAccepted,
        failureCount: countFailedPermanent + countFailedRetryable,
        skippedAlreadyAcceptedCount,
        executionTimeMs,
      };
    }
  } catch (procErr: any) {
    const executionTimeMs = Date.now() - startTime;
    const currentAttempts = (activeCampaignData?.attempts || 0) + 1;

    Logger.error(`Error durante el procesamiento de la campaña ${campaignId}`, procErr, {
      module: "notificationQueueWorker",
      campaignId,
      attempts: currentAttempts,
    });

    if (currentAttempts < MAX_ATTEMPTS) {
      const nextRetryAt = admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 1000);
      await campaignRef.update({
        status: "RETRY",
        nextRetryAt,
        lastError: procErr.message || "Error desconocido en worker",
      });

      return {
        claimed: true,
        campaignId,
        status: "RETRY",
        error: procErr.message,
        executionTimeMs,
      };
    } else {
      await campaignRef.update({
        status: "FAILED",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: `Falló tras ${currentAttempts} intentos. Error: ${procErr.message || "Error desconocido"}`,
      });

      return {
        claimed: true,
        campaignId,
        status: "FAILED",
        error: procErr.message,
        executionTimeMs,
      };
    }
  }
}
