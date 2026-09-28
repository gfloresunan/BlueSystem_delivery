import * as admin from "firebase-admin";

process.env.GOOGLE_CLOUD_PROJECT = "bluesystem-7c9af";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "bluesystem-7c9af",
  });
}

const db = admin.firestore();

async function runPhase4RealSmokeTest() {
  console.log("=======================================================================");
  console.log("🚀 EJECUTANDO SMOKE TEST REAL EN FIREBASE PARA FASE 4");
  console.log("=======================================================================");

  // 1. Probar telemetría real en notification_campaigns y campaign_deliveries
  const campaignsSnap = await db.collection("notification_campaigns").limit(10).get();
  console.log(`✓ Campañas registradas en Firestore: ${campaignsSnap.size}`);

  const deliveriesSnap = await db.collection("campaign_deliveries").limit(10).get();
  console.log(`✓ Entregas registradas en campaign_deliveries: ${deliveriesSnap.size}`);

  const devicesSnap = await db.collection("user_devices").where("isActive", "==", true).limit(5).get();
  console.log(`✓ Dispositivos activos en user_devices: ${devicesSnap.size}`);

  console.log("=======================================================================");
  console.log("🎉 SMOKE TEST REAL FASE 4 DE TELEMETRÍA Y CONECTIVIDAD COMPLETADO");
  console.log("=======================================================================");
  process.exit(0);
}

runPhase4RealSmokeTest().catch((err) => {
  console.error("Error en Smoke Test Real Fase 4:", err);
  process.exit(1);
});
