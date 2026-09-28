const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function inspect() {
  console.log("=== INSPECTING LATEST /orders ===");
  const ordersSnap = await db.collection("orders").orderBy("createdAt", "desc").limit(5).get();
  if (ordersSnap.empty) {
    console.log("No orders found in /orders");
  } else {
    ordersSnap.forEach(doc => {
      console.log(`[ORDER] ID: ${doc.id}, serviceType: ${doc.data().serviceType}, status: ${doc.data().status}, customerId: ${doc.data().customerId}, deliveryFee: ${doc.data().deliveryFee}, createdAt: ${doc.data().createdAt}`);
    });
  }

  console.log("\n=== INSPECTING LATEST /deliveryTrips ===");
  const tripsSnap = await db.collection("deliveryTrips").orderBy("createdAt", "desc").limit(5).get();
  if (tripsSnap.empty) {
    console.log("No trips found in /deliveryTrips");
  } else {
    tripsSnap.forEach(doc => {
      console.log(`[TRIP] ID: ${doc.id}, serviceType: ${doc.data().serviceType}, status: ${doc.data().status}, customerId: ${doc.data().customerId}, deliveryFee: ${doc.data().deliveryFee}`);
    });
  }

  console.log("\n=== INSPECTING /ubicaciones_repartidores ===");
  const locSnap = await db.collection("ubicaciones_repartidores").get();
  locSnap.forEach(doc => {
    console.log(`[COURIER] ID: ${doc.id}, estado: ${doc.data().estadoDisponibilidad}, lat: ${doc.data().latitud}, lng: ${doc.data().longitud}, updated: ${doc.data().actualizadoEn}`);
  });
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error("Error inspecting:", err);
  process.exit(1);
});
