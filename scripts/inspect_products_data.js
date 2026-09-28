const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectProducts() {
    console.log('================ PRODUCTS INSPECTION ================');
    const snap = await db.collection('products').get();
    console.log(`Total products: ${snap.size}`);
    snap.forEach(doc => {
        console.log(`\n--- Product ID: [${doc.id}] ---`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

inspectProducts().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
