import * as admin from "firebase-admin";

process.env.GOOGLE_CLOUD_PROJECT = "bluesystem-7c9af";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "bluesystem-7c9af",
  });
}

const db = admin.firestore();

async function inspectPhase4_1Operational() {
  console.log("=== INSPECCIÓN OPERACIONAL FASE 4.1 ===");
  const now = new Date().toISOString();
  console.log(`Fecha/Hora: ${now}`);
  console.log(`Firebase Project: bluesystem-7c9af`);
  console.log(`URL Admin Panel: https://bluesystem-7c9af.web.app/dashboard.html`);

  // 1. Devices and Tokens
  const devicesSnap = await db.collection("user_devices").get();
  console.log(`\n--- USER DEVICES (Total: ${devicesSnap.size}) ---`);
  let validTokens = 0;
  let emptyInvalid = 0;
  let androidCount = 0;
  let iosCount = 0;

  devicesSnap.forEach(doc => {
    const d = doc.data();
    const token = (d.fcmToken || "").trim();
    if (token.length > 20 && d.isActive !== false) {
      validTokens++;
    } else {
      emptyInvalid++;
    }
    const platform = (d.platform || "Android").toLowerCase();
    if (platform.includes("ios")) iosCount++;
    else androidCount++;
    console.log(`Device Doc: ${doc.id} | UID: ${d.uid} | DeviceID: ${d.deviceId} | Platform: ${d.platform} | TokenValid: ${token.length > 20} | Active: ${d.isActive !== false}`);
  });

  // 2. Campaigns
  const campaignsSnap = await db.collection("notification_campaigns").orderBy("createdAt", "desc").limit(10).get();
  console.log(`\n--- NOTIFICATION CAMPAIGNS (Recientes: ${campaignsSnap.size}) ---`);
  const queueCounts: Record<string, number> = { QUEUED: 0, PROCESSING: 0, RETRY: 0, FAILED: 0, SENT: 0, SCHEDULED: 0, DRAFT: 0 };

  campaignsSnap.forEach(doc => {
    const d = doc.data();
    const st = (d.status || "QUEUED").toUpperCase();
    if (queueCounts[st] !== undefined) queueCounts[st]++;
    console.log(`Campaign ID: ${doc.id} | Title: "${d.title}" | Status: ${d.status} | Target: ${d.targetType} | Success: ${d.successCount || 0} | Failure: ${d.failureCount || 0} | Created: ${d.createdAt ? d.createdAt.toDate().toISOString() : 'N/A'}`);
  });

  // 3. Deliveries Ledger
  const deliveriesSnap = await db.collection("campaign_deliveries").orderBy("updatedAt", "desc").limit(10).get();
  console.log(`\n--- CAMPAIGN DELIVERIES (Recientes: ${deliveriesSnap.size}) ---`);
  const deliveryCounts: Record<string, number> = { PENDING: 0, SENDING: 0, FCM_ACCEPTED: 0, FAILED_RETRYABLE: 0, FAILED_PERMANENT: 0 };

  deliveriesSnap.forEach(doc => {
    const d = doc.data();
    const st = (d.status || "PENDING").toUpperCase();
    if (deliveryCounts[st] !== undefined) deliveryCounts[st]++;
    console.log(`Delivery Key: ${doc.id} | Campaign: ${d.campaignId} | UID: ${d.uid} | Device: ${d.deviceId} | Status: ${d.status} | FCM Msg ID: ${d.fcmMessageId || 'N/A'}`);
  });

  console.log("\n=== RESUMEN TELEMETRÍA BACKEND ===");
  console.log(`Devices Total: ${devicesSnap.size} | Tokens Válidos: ${validTokens} | Inválidos/Vacíos: ${emptyInvalid}`);
  console.log(`Campañas por Estado: QUEUED=${queueCounts.QUEUED}, PROCESSING=${queueCounts.PROCESSING}, SENT=${queueCounts.SENT}, FAILED=${queueCounts.FAILED}`);
  console.log(`Deliveries por Estado: FCM_ACCEPTED=${deliveryCounts.FCM_ACCEPTED}, FAILED_PERMANENT=${deliveryCounts.FAILED_PERMANENT}, SENDING=${deliveryCounts.SENDING}`);
}

inspectPhase4_1Operational().catch(err => {
  console.error("Error inspecting:", err);
  process.exit(1);
});
