const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectMediaRegistry() {
    console.log('================ MEDIA REGISTRY INSPECTION ================');
    const cols = ['media_registry', 'media', 'uploads', 'media_metrics'];
    for (const c of cols) {
        try {
            const snap = await db.collection(c).get();
            console.log(`\nCollection /${c} total docs: ${snap.size}`);
            snap.forEach(doc => {
                console.log(`Doc [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
            });
        } catch (e) {
            console.log(`Collection /${c} error:`, e.message);
        }
    }
}

inspectMediaRegistry().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
