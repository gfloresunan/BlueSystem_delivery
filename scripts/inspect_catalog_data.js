const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectCatalog() {
    console.log('================ CATALOG FORENSIC INSPECTION ================');

    const targetCollections = ['businesses', 'branches', 'categories', 'featuredProducts', 'flashDeals'];

    for (const colName of targetCollections) {
        console.log(`\n================ Collection: /${colName} ================`);
        const snap = await db.collection(colName).get();
        console.log(`Total items: ${snap.size}`);
        snap.forEach(doc => {
            console.log(`\n--- Doc ID: [${doc.id}] ---`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }
}

inspectCatalog().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
