const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function traceDiff() {
    let lastData = null;
    const unsub = db.collection('merchant_applications').doc('icmP7k8O9gbqIvEa1ZWY')
        .onSnapshot(snap => {
            const data = snap.data();
            if (!lastData) {
                console.log('Initial data:', JSON.stringify(data, null, 2));
                lastData = data;
                return;
            }
            const diff = {};
            for (const key of Object.keys(data)) {
                if (JSON.stringify(data[key]) !== JSON.stringify(lastData[key])) {
                    diff[key] = { from: lastData[key], to: data[key] };
                }
            }
            for (const key of Object.keys(lastData)) {
                if (!(key in data)) {
                    diff[key] = { from: lastData[key], to: undefined };
                }
            }
            console.log(`[DIFF @ ${new Date().toISOString()}] Changes:`, JSON.stringify(diff, null, 2));
            lastData = data;
        });

    setTimeout(() => {
        unsub();
        process.exit(0);
    }, 6000);
}

traceDiff().catch(console.error);
