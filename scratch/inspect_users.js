const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectCouriers() {
    console.log("=== ALL USERS IN FIRESTORE ===");
    const usersSnap = await db.collection('users').get();
    usersSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`User ID: ${doc.id}`);
        console.log(`  name/nombre: ${d.name || d.nombre || d.displayName}`);
        console.log(`  email: ${d.email}`);
        console.log(`  role: ${d.role}, userType: ${d.userType}, rol: ${d.rol}`);
        console.log(`  driverId/codigoOperativo: ${d.driverId || d.codigoOperativo}`);
        console.log(`  licensePlate/placa/vehiculo: ${d.licensePlate || d.placa || d.vehiculo}`);
        console.log(`  status/shiftState: ${d.status || d.shiftState || d.courierState}, active: ${d.active}`);
        console.log('---');
    });
}

inspectCouriers().catch(err => console.error(err));
