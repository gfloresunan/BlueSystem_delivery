const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectAdminTecnostore() {
    const snap = await db.collection('businesses').where('name', '==', 'Admin Tecnostore').limit(2).get();
    snap.forEach(doc => {
        console.log(`[businesses/${doc.id}]`, JSON.stringify(doc.data(), null, 2));
    });

    const userSnap = await db.collection('users').where('name', '==', 'Admin Tecnostore').limit(2).get();
    userSnap.forEach(doc => {
        console.log(`[users/${doc.id}]`, JSON.stringify(doc.data(), null, 2));
    });
}

inspectAdminTecnostore().catch(console.error);
