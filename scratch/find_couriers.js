const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function findCouriersOnly() {
    console.log("=== COURIERS / MOTORIZADOS FOUND IN DATABASE ===");
    const usersSnap = await db.collection('users').get();
    let count = 0;
    usersSnap.docs.forEach(doc => {
        const d = doc.data();
        const r = String(d.role || '').toLowerCase();
        const ut = String(d.userType || '').toLowerCase();
        const rol = String(d.rol || '').toLowerCase();

        if (r.includes('courier') || r.includes('motorizado') || ut.includes('courier') || ut.includes('motorizado') || rol.includes('courier') || rol.includes('motorizado')) {
            count++;
            console.log(`[COURIER USER] ID: ${doc.id}`);
            console.log(`  Name: ${d.name || d.nombre || d.displayName}`);
            console.log(`  Email: ${d.email}`);
            console.log(`  Role: ${d.role}, userType: ${d.userType}, rol: ${d.rol}`);
            console.log(`  Driver ID: ${d.driverId || d.codigoOperativo || ('DRV-' + doc.id.substring(0, 4).toUpperCase())}`);
            console.log(`  License Plate: ${d.licensePlate || d.placa || d.vehiculo || 'M 123456'}`);
            console.log(`  Status/Shift: ${d.status || d.shiftState || d.courierState || 'Disponible'}`);
            console.log('---');
        }
    });
    console.log(`Total couriers found in /users: ${count}`);

    const couriersSnap = await db.collection('couriers').get();
    console.log(`Total documents in /couriers: ${couriersSnap.size}`);
    couriersSnap.docs.forEach(doc => {
        console.log(`[COURIER DOC] ID: ${doc.id}, data:`, doc.data());
    });
}

findCouriersOnly().catch(err => console.error(err));
