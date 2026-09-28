const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkProducts() {
    const snap = await db.collection('products').where('businessId', '==', 'bbb760d5-a8f3-4700-9a96-f58f11f345ac').get();
    console.log(`Found ${snap.size} products for El Chanchito:`);
    snap.forEach(d => console.log('Product doc ID:', d.id, d.data().name));
}

checkProducts().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
