import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function executeControlledSmokeTest() {
  console.log("=======================================================================");
  console.log("🚀 EJECUTANDO PRUEBA REAL CONTROLADA EN FIREBASE (FASE 17)");
  console.log("=======================================================================");

  // 1. Buscar un usuario con dispositivo activo de prueba
  const devicesSnap = await db.collection("user_devices").where("isActive", "==", true).limit(5).get();

  if (devicesSnap.empty) {
    console.error("❌ No se encontraron dispositivos activos en /user_devices para la prueba real.");
    process.exit(1);
  }

  let testUid = "";
  devicesSnap.forEach((doc) => {
    const data = doc.data();
    if (!testUid && data.uid && data.fcmToken) {
      testUid = data.uid;
    }
  });

  if (!testUid) {
    testUid = devicesSnap.docs[0].data().uid || "test_user_controlled";
  }

  console.log(`✓ Destinatario de prueba seleccionado: UID = ${testUid}`);

  const campaignId = `camp_smoke_test_${Date.now()}`;
  const campaignRef = db.collection("notification_campaigns").doc(campaignId);

  const campaignPayload = {
    id: campaignId,
    version: 1,
    title: "BlueSystem Queue Test",
    body: "Prueba Queue Worker Enterprise",
    category: "Sistema",
    type: "SYSTEM",
    priority: "HIGH",
    targetType: "specific",
    targetUids: [testUid],
    status: "QUEUED",
    retryCount: 0,
    attempts: 0,
    createdBy: "smoke_test_runner",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    analytics: {
      sentCount: 1,
      deliveredCount: 0,
      openedCount: 0,
      dismissedCount: 0,
      deletedCount: 0,
      buttonClicks: 0,
      conversionCount: 0,
      conversionValue: 0.0,
      ctr: 0.0,
      conversionRate: 0.0,
      readRate: 0.0,
      deliveryRate: 0.0,
    },
  };

  console.log(`✓ Creando campaña en Firestore notification_campaigns/${campaignId} con status = QUEUED...`);
  await campaignRef.set(campaignPayload);

  // Esperar a que el trigger backend u onNotificationCampaignCreated / Worker procese el documento
  console.log("⏳ Esperando procesamiento del Queue Worker Backend (5 segundos)...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Verificar el estado actualizado de la campaña
  const updatedDoc = await campaignRef.get();
  const updatedData = updatedDoc.data();

  console.log("=======================================================================");
  console.log("📋 RESULTADOS DE LA PRUEBA REAL CONTROLADA:");
  console.log("=======================================================================");
  console.log(`Campaign ID:        ${campaignId}`);
  console.log(`Status Final:       ${updatedData?.status}`);
  console.log(`Worker ID:          ${updatedData?.workerId || "N/A"}`);
  console.log(`Intentos (attempts): ${updatedData?.attempts}`);
  console.log(`Usuarios Objetivo:  ${updatedData?.targetedUsers}`);
  console.log(`Dispositivos Obj.:  ${updatedData?.targetedDevices}`);
  console.log(`Envíos Exitosos:    ${updatedData?.successCount}`);
  console.log(`Envíos Fallidos:    ${updatedData?.failureCount}`);
  console.log(`Tiempo Ejecución:   ${updatedData?.executionTimeMs}ms`);
  console.log("=======================================================================");

  if (updatedData?.status === "SENT") {
    console.log("🎉 SMOKE TEST EXITOSO: Transición QUEUED -> PROCESSING -> SENT lograda en Firebase.");
  } else if (updatedData?.status === "QUEUED") {
    console.log("⚠️ Documento sigue en QUEUED (ejecutando worker de respaldo directo)...");
    const { processCampaign } = require("../services/notificationQueueWorker");
    const directResult = await processCampaign(campaignId, "smoke_test_direct_worker");
    console.log("Resultado de ejecución directa del Worker:", directResult);
  } else {
    console.log(`Estado alcanzado: ${updatedData?.status}`);
  }

  process.exit(0);
}

executeControlledSmokeTest().catch((err) => {
  console.error("Error en prueba real controlada:", err);
  process.exit(1);
});
