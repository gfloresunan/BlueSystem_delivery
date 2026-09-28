const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectThe5Couriers() {
    const courierIds = [
        'C6adh99jAXNqXJpIZaGFJJ5kFh72', // Pedro Flores
        'rCpnpzQVcoPDoUdU4cJE1HpuLGA2', // Managua Flores
        'kpENhRwdmocYZsYZonmfWTWvdnC2', // Mario Flores
        '9QHYGkSa3nWiJ7KfPkccjjuIaYp2', // Henry Paz
        '6VkVNQ2yRzS67kEIYfyATkuwBiI3'  // Juan Delivery
    ];

    for (const id of courierIds) {
        console.log(`\n======================================================`);
        console.log(`COURIER ID: ${id}`);
        const cDoc = await db.collection('couriers').doc(id).get();
        const uDoc = await db.collection('users').doc(id).get();
        const bDoc = await db.collection('courier_balances').doc(id).get();

        console.log('--- /couriers doc exists:', cDoc.exists);
        if (cDoc.exists) console.log(JSON.stringify(cDoc.data(), null, 2));

        console.log('--- /users doc exists:', uDoc.exists);
        if (uDoc.exists) console.log(JSON.stringify(uDoc.data(), null, 2));

        console.log('--- /courier_balances doc exists:', bDoc.exists);
        if (bDoc.exists) console.log(JSON.stringify(bDoc.data(), null, 2));
    }
}

inspectThe5Couriers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
