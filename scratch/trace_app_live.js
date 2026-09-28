const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function traceAppUpdates() {
    console.log('Listening to merchant_applications/icmP7k8O9gbqIvEa1ZWY for 15 seconds...');
    const unsub = db.collection('merchant_applications').doc('icmP7k8O9gbqIvEa1ZWY')
        .onSnapshot(snap => {
            const d = snap.data();
            console.log(`[SNAPSHOT @ ${new Date().toISOString()}] status: ${d.status} | error: "${d.provisioningError}" | bizId: ${d.provisionedBusinessId} | uid: ${d.provisionedUid}`);
        });

    setTimeout(() => {
        unsub();
        console.log('Done.');
        process.exit(0);
    }, 15000);
}

traceAppUpdates().catch(console.error);
