const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkMario() {
    const uDoc = await db.collection('users').doc('kpENhRwdmocYZsYZonmfWTWvdnC2').get();
    console.log('users/kpENhRwdmocYZsYZonmfWTWvdnC2 exists:', uDoc.exists);
    if (uDoc.exists) console.log('user data:', uDoc.data());

    const cDoc = await db.collection('couriers').doc('kpENhRwdmocYZsYZonmfWTWvdnC2').get();
    console.log('couriers/kpENhRwdmocYZsYZonmfWTWvdnC2 exists:', cDoc.exists);
    if (cDoc.exists) console.log('courier data:', cDoc.data());
}

checkMario().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
