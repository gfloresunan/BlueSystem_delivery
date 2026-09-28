const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkTemplates() {
    console.log('=== INSPECCIÓN DE /email_templates ===');
    const snap = await db.collection('email_templates').get();
    console.log(`Total plantillas en Firestore: ${snap.size}`);
    snap.forEach(doc => {
        console.log(`- ${doc.id} (status: ${doc.data().status}, name: ${doc.data().name})`);
    });
}

checkTemplates().catch(console.error);
