const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectDariano() {
    const doc = await db.collection('businesses').doc('00552e8b-3473-413c-9594-793fdb42dfdd').get();
    console.log(`=== BUSINESS: 00552e8b-3473-413c-9594-793fdb42dfdd ===`);
    console.log(JSON.stringify(doc.data(), null, 2));
}

inspectDariano().catch(console.error);
