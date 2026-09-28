const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectData() {
    console.log("=== INSPECTING ORDERS IN FIRESTORE ===");
    const ordersSnap = await db.collection('orders').get();
    console.log(`Total orders in /orders: ${ordersSnap.size}`);
    ordersSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`Order ID: ${doc.id}`);
        console.log(`  status: ${d.status}, estado: ${d.estado}`);
        console.log(`  businessId: ${d.businessId}, comercioId: ${d.comercioId}, restaurantId: ${d.restaurantId}, merchantId: ${d.merchantId}`);
        console.log(`  customerId: ${d.customerId}, customerName: ${d.customerName}`);
        console.log(`  assignedCourierId: ${d.assignedCourierId}, motorizadoId: ${d.motorizadoId}, driverName: ${d.driverName}`);
        console.log(`  createdAt: ${d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : 'none'}`);
        console.log('---');
    });

    console.log("\n=== INSPECTING COURIERS / MOTORIZADOS IN USERS & COURIERS ===");
    const usersSnap = await db.collection('users').get();
    console.log(`Total users in /users: ${usersSnap.size}`);
    usersSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.role === 'COURIER' || d.role === 'MOTORIZADO' || d.userType === 'motorizado' || d.userType === 'courier' || d.rol === 'motorizado' || d.rol === 'repartidor') {
            console.log(`Courier User ID: ${doc.id}`);
            console.log(`  name: ${d.name || d.nombre || d.displayName}`);
            console.log(`  role: ${d.role}, userType: ${d.userType}, rol: ${d.rol}`);
            console.log(`  driverId: ${d.driverId || d.codigoOperativo}`);
            console.log(`  licensePlate: ${d.licensePlate || d.placa || d.vehiculo}`);
            console.log(`  status: ${d.status || d.shiftState || d.courierState}, active: ${d.active}`);
            console.log('---');
        }
    });

    const couriersSnap = await db.collection('couriers').get();
    console.log(`Total documents in /couriers: ${couriersSnap.size}`);
    couriersSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`Courier Doc ID: ${doc.id}`);
        console.log(`  data:`, JSON.stringify(d));
    });

    console.log("\n=== INSPECTING BUSINESSES ===");
    const bizSnap = await db.collection('businesses').get();
    console.log(`Total businesses: ${bizSnap.size}`);
    bizSnap.docs.forEach(doc => {
        console.log(`Biz ID: ${doc.id}, name: ${doc.data().name || doc.data().comercioNombre}`);
    });
}

inspectData().catch(err => console.error(err));
