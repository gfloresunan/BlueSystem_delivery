const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "bluesystem-7c9af"
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function runComprehensiveAudit() {
  console.log("==================================================");
  console.log("C32 — COMPREHENSIVE FORENSIC AUDIT");
  console.log("==================================================");

  // 1. Orders
  console.log("\n--- LATEST 5 /orders ---");
  const ordersSnap = await db.collection("orders").orderBy("createdAt", "desc").limit(5).get();
  for (const doc of ordersSnap.docs) {
    const d = doc.data();
    console.log(`[ORDER] ${doc.id}:`, {
      serviceType: d.serviceType,
      status: d.status,
      customerId: d.customerId,
      assignedCourierId: d.assignedCourierId,
      motorizadoId: d.motorizadoId,
      driverId: d.driverId,
      deliveryFee: d.deliveryFee,
      paymentMethod: d.paymentMethod,
      origin: d.origin,
      destination: d.destination,
      deliveryType: d.deliveryType,
      senderName: d.senderName,
      recipientName: d.recipientName,
      createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : null
    });
  }

  // 2. DeliveryTrips
  console.log("\n--- LATEST 5 /deliveryTrips ---");
  const tripsSnap = await db.collection("deliveryTrips").orderBy("createdAt", "desc").limit(5).get();
  for (const doc of tripsSnap.docs) {
    const d = doc.data();
    console.log(`[TRIP] ${doc.id}:`, {
      serviceType: d.serviceType,
      status: d.status,
      customerId: d.customerId,
      assignedCourierId: d.assignedCourierId,
      motorizadoId: d.motorizadoId,
      driverId: d.driverId,
      deliveryFee: d.deliveryFee,
      pricing: d.pricing,
      origin: d.origin,
      destination: d.destination,
      createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : null
    });
  }

  // 3. Ubicaciones Repartidores
  console.log("\n--- /ubicaciones_repartidores ---");
  const ubicSnap = await db.collection("ubicaciones_repartidores").get();
  for (const doc of ubicSnap.docs) {
    const d = doc.data();
    console.log(`[UBICACION] ${doc.id}:`, d);
    try {
      const authUser = await auth.getUser(doc.id);
      console.log(`  -> Auth for ${doc.id}: email=${authUser.email}, claims=${JSON.stringify(authUser.customClaims)}`);
    } catch (e) {
      console.log(`  -> Auth for ${doc.id}: Error ${e.message}`);
    }
    const userDoc = await db.collection("users").doc(doc.id).get();
    if (userDoc.exists) {
      console.log(`  -> /users/${doc.id}:`, {
        role: userDoc.data().role,
        userType: userDoc.data().userType,
        isOnline: userDoc.data().isOnline,
        isActive: userDoc.data().isActive,
        fcmToken: userDoc.data().fcmToken ? (userDoc.data().fcmToken.substring(0, 15) + "...") : null,
        activeAssignmentId: userDoc.data().activeAssignmentId
      });
    }
  }

  // 4. All Users with role == 'courier' or 'motorizado' or 'repartidor' or 'driver'
  console.log("\n--- COURIER USERS IN /users ---");
  const usersSnap = await db.collection("users").get();
  for (const doc of usersSnap.docs) {
    const d = doc.data();
    if (d.role === 'courier' || d.role === 'motorizado' || d.userType === 'courier' || d.userType === 'motorizado' || d.isCourier) {
      console.log(`[USER COURIER] ${doc.id}:`, {
        displayName: d.displayName || d.name,
        email: d.email,
        phone: d.phone,
        role: d.role,
        userType: d.userType,
        isOnline: d.isOnline,
        isActive: d.isActive,
        activeAssignmentId: d.activeAssignmentId,
        fcmToken: d.fcmToken ? (d.fcmToken.substring(0, 15) + "...") : null
      });
    }
  }
}

runComprehensiveAudit().then(() => process.exit(0)).catch(e => {
  console.error("Audit error:", e);
  process.exit(1);
});
