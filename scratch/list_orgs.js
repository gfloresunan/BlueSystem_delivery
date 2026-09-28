process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'bluesystem-7c9af';
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function listOrgs() {
    const snap = await db.collection('organizations').get();
    console.log(`Total /organizations: ${snap.size}`);
    snap.forEach(d => console.log('Org:', d.id, JSON.stringify(d.data(), null, 2)));
}

listOrgs().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
