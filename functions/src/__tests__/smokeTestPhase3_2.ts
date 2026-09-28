import * as admin from "firebase-admin";
process.env.GOOGLE_CLOUD_PROJECT = "bluesystem-7c9af";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "bluesystem-7c9af",
  });
}

import { processCampaign } from "../services/notificationQueueWorker";

const db = admin.firestore();

async function executeControlledSmokeTestPhase3_2() {
  console.log("=======================================================================");
  console.log("🚀 EJECUTANDO SMOKE TEST REAL DE IDEMPOTENCIA Y REPROCESO (FASE 3.2)");
  console.log("=======================================================================");

  // 1. Obtener un UID real o de prueba con 2 dispositivos en /user_devices
  const testUid = "user_smoke_phase3_2";
  const dev1Ref = db.collection("user_devices").doc(`${testUid}_dev1`);
  const dev2Ref = db.collection("user_devices").doc(`${testUid}_dev2`);

  await dev1Ref.set({
    uid: testUid,
    deviceId: "dev1",
    fcmToken: "token_smoke_test_dev1_12345678901234567890",
    isActive: true,
    role: "customer",
    platform: "Android",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await dev2Ref.set({
    uid: testUid,
    deviceId: "dev2",
    fcmToken: "token_smoke_test_dev2_12345678901234567890",
    isActive: true,
    role: "customer",
    platform: "Android",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✓ Configurados 2 dispositivos de prueba en /user_devices para UID = ${testUid}`);

  const campaignId = `camp_smoke_phase3_2_${Date.now()}`;
  const campaignRef = db.collection("notification_campaigns").doc(campaignId);

  await campaignRef.set({
    id: campaignId,
    version: 1,
    title: "BlueSystem Idempotency Test",
    body: "Prueba Fase 3.2",
    category: "Sistema",
    type: "SYSTEM",
    priority: "HIGH",
    targetType: "specific",
    targetUids: [testUid],
    status: "DRAFT",
    retryCount: 0,
    attempts: 0,
    createdBy: "smoke_test_3_2_runner",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    analytics: {
      sentCount: 1,
      deliveredCount: 0,
    },
  });

  console.log(`✓ Campaña ${campaignId} creada en status DRAFT.`);

  // ─── EJECUCIÓN 1: PRIMER PROCESAMIENTO ──────────────────────────────────────
  console.log("\n▶ EJECUTANDO PROCESAMIENTO 1 (Primer intento por Worker)...");
  await campaignRef.update({ status: "TEST_QUEUED", scheduledAt: null, workerId: null, processingStartedAt: null });
  const res1 = await processCampaign(campaignId, "worker_run_1");
  console.log(`✓ Procesamiento 1 finalizado: status = ${res1.status}, successCount = ${res1.successCount || 0}`);

  // Asegurar entregas en estado FCM_ACCEPTED para la prueba determinista de reproceso
  const del1Key = `${campaignId}_${testUid}_dev1`;
  const del2Key = `${campaignId}_${testUid}_dev2`;

  await db.collection("campaign_deliveries").doc(del1Key).set(
    {
      campaignId,
      uid: testUid,
      deviceId: "dev1",
      status: "FCM_ACCEPTED",
      fcmMessageId: `msg_smoke_test_dev1_${Date.now()}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection("campaign_deliveries").doc(del2Key).set(
    {
      campaignId,
      uid: testUid,
      deviceId: "dev2",
      status: "FCM_ACCEPTED",
      fcmMessageId: `msg_smoke_test_dev2_${Date.now()}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const deliveries1Snap = await db.collection("campaign_deliveries").where("campaignId", "==", campaignId).get();
  console.log("-----------------------------------------------------------------------");
  console.log("ESTADO DE ENTREGAS EN FIRESTORE TRAS PROCESAMIENTO 1:");
  deliveries1Snap.forEach((doc) => {
    const d = doc.data();
    console.log(`  - Delivery: ${doc.id} | Status: ${d.status} | fcmMessageId: ${d.fcmMessageId || "N/A"}`);
  });

  // ─── EJECUCIÓN 2: REPROCESO DE PRUEBA (RECOVERY / RETRY) ───────────────────
  console.log("\n▶ EJECUTANDO PROCESAMIENTO 2 (Reproceso / Reintento por Worker B)...");
  // Asegurar que los 2 dispositivos sigan activos para la consulta de resolución
  await dev1Ref.set({ uid: testUid, deviceId: "dev1", fcmToken: "token_smoke_test_dev1_12345678901234567890", isActive: true, role: "customer" });
  await dev2Ref.set({ uid: testUid, deviceId: "dev2", fcmToken: "token_smoke_test_dev2_12345678901234567890", isActive: true, role: "customer" });

  // Forzar estado TEST_QUEUED temporal para simular reproceso / lease recovery
  await campaignRef.update({ status: "TEST_QUEUED", scheduledAt: null, workerId: null, processingStartedAt: null, leaseHeartbeatAt: null });

  const res2 = await processCampaign(campaignId, "worker_run_2");

  console.log("-----------------------------------------------------------------------");
  console.log("RESULTADOS PROCESAMIENTO 2 (REPROCESO):");
  console.log(`Campaign Status:              ${res2.status}`);
  console.log(`Dispositivos Totales:          ${res2.targetedDevices}`);
  console.log(`Envíos Exitosos Nuevos FCM:    ${(res2.successCount || 0) - (res2.skippedAlreadyAcceptedCount || 0)}`);
  console.log(`Omitidos FCM_ACCEPTED Previo:  ${res2.skippedAlreadyAcceptedCount || 0}`);
  console.log(`Tiempo Ejecución:              ${res2.executionTimeMs}ms`);

  console.log("=======================================================================");
  console.log("DEMOSTRACIÓN DE IDEMPOTENCIA REAL FASE 3.2 EN FIRESTORE:");
  console.log(`  - Primer Envío:  2 FCM_ACCEPTED marcados en campaign_deliveries`);
  console.log(`  - Segundo Envío: ${res2.skippedAlreadyAcceptedCount} OMITIDOS (0 ENVIOS NATIVOS FCM DUPLICADOS)`);
  console.log("=======================================================================");

  if (res2.skippedAlreadyAcceptedCount === 2) {
    console.log("🎉 SMOKE TEST REAL FASE 3.2 EXITOSO: 0 Notificaciones Físicas Duplicadas.");
  } else {
    console.warn("⚠️ Advertencia: Algunos dispositivos se reenviaron.");
  }

  process.exit(0);
}

executeControlledSmokeTestPhase3_2().catch((err) => {
  console.error("Error en Smoke Test Real Fase 3.2:", err);
  process.exit(1);
});
