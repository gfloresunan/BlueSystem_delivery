const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function inspectFleetCore() {
  console.log("=== INSPECTING FIRESTORE ORDERS FOR FLEET CORE AUDIT ===");
  
  const ordersSnap = await db.collection('orders').get();
  console.log(`Total orders in /orders collection: ${ordersSnap.size}`);

  ordersSnap.docs.forEach((doc, idx) => {
    const d = doc.data();
    console.log(`\n--- Order #${idx + 1} [ID: ${doc.id}] ---`);
    console.log(`businessId:`, d.businessId);
    console.log(`comercioId:`, d.comercioId);
    console.log(`restaurantId:`, d.restaurantId);
    console.log(`merchantId:`, d.merchantId);
    console.log(`branchId:`, d.branchId);
    console.log(`restaurantBranchId:`, d.restaurantBranchId);
    console.log(`status:`, d.status);
    console.log(`estado:`, d.estado);
    console.log(`assignedCourierId:`, d.assignedCourierId);
    console.log(`motorizadoId:`, d.motorizadoId);
    console.log(`courierId:`, d.courierId);
    console.log(`driverId:`, d.driverId);
    console.log(`driverName / assignedCourierName:`, d.driverName || d.assignedCourierName || d.motorizadoNombre);
    console.log(`assignedCourierPlate / motorizadoPlaca:`, d.assignedCourierPlate || d.motorizadoPlaca);
    console.log(`createdAt:`, d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : 'N/A');
  });

  // Now test exact queries from Android app
  console.log("\n=== TESTING ANDROID APP FIRESTORE QUERIES ===");

  // Query 1: FirebaseManager.obtenerPedidoOfrecido (status == "ready")
  const q1 = await db.collection('orders').where('status', '==', 'ready').get();
  console.log(`\nQuery 1: where("status", "==", "ready")`);
  console.log(`DOCUMENTS RETURNED = ${q1.size}`);
  q1.docs.forEach(doc => console.log(`  - Doc ID: ${doc.id}, status: ${doc.data().status}, assignedCourierId: ${doc.data().assignedCourierId}`));

  // Query 2: FirebaseManager.listenToAssignedOrders (assignedCourierId == motorizadoId, status in ["in_transit", "ready"])
  const henryPazUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
  const q2 = await db.collection('orders')
    .where('assignedCourierId', '==', henryPazUid)
    .where('status', 'in', ['in_transit', 'ready'])
    .get();
  console.log(`\nQuery 2: where("assignedCourierId", "==", "${henryPazUid}").whereIn("status", ["in_transit", "ready"])`);
  console.log(`DOCUMENTS RETURNED = ${q2.size}`);

  // Query 3: What if status is "assigned"?
  const q3 = await db.collection('orders').where('status', 'in', ['ready', 'assigned', 'in_transit']).get();
  console.log(`\nQuery 3 (Proposed Fix Query): whereIn("status", ["ready", "assigned", "in_transit"])`);
  console.log(`DOCUMENTS RETURNED = ${q3.size}`);
  q3.docs.forEach(doc => {
    const d = doc.data();
    console.log(`  - Doc ID: ${doc.id}, status: ${d.status}, assignedCourierId: ${d.assignedCourierId}, motorizadoId: ${d.motorizadoId}`);
  });

  // Query /users for couriers/drivers
  console.log("\n=== INSPECTING COURIER USERS IN /users ===");
  const usersSnap = await db.collection('users').get();
  const couriers = [];
  usersSnap.docs.forEach(doc => {
    const d = doc.data();
    const r = String(d.role || d.rol || d.userType || '').toLowerCase();
    if (r.includes('courier') || r.includes('motorizado') || r.includes('driver')) {
      couriers.push({
        uid: doc.id,
        nombre: d.nombre || d.name || d.displayName,
        email: d.email,
        userType: d.userType,
        role: d.role || d.rol,
        driverId: d.driverId || d.codigoOperativo || (`DRV-${doc.id.substring(0, 4).toUpperCase()}`),
        licensePlate: d.licensePlate || d.placa || d.vehiculo || 'M 123456',
        active: d.active
      });
    }
  });
  console.log(`Found ${couriers.length} courier users:`, JSON.stringify(couriers, null, 2));

  // Query /deliveryTrips if any
  try {
    const tripsSnap = await db.collection('deliveryTrips').get();
    console.log(`\nTotal trips in /deliveryTrips collection: ${tripsSnap.size}`);
    tripsSnap.docs.forEach((doc, idx) => {
      console.log(`  - Trip #${idx + 1} ID: ${doc.id}`, doc.data());
    });
  } catch (e) {
    console.log("No /deliveryTrips collection found or empty.");
  }
}

inspectFleetCore().catch(console.error);
