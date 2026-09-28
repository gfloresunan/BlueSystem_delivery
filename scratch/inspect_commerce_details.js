const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectCommerceDetails() {
    const businessIds = [
        'bbb760d5-a8f3-4700-9a96-f58f11f345ac',
        'e7dc911e-e587-4be9-a741-7d9d9828011f'
    ];

    console.log('=== DETAILED BUSINESS & OPERATIONAL DATA INSPECTION ===\n');

    for (const bid of businessIds) {
        console.log(`================ BUSINESS: ${bid} ================`);
        
        // 1. /businesses/{bid}
        const bDoc = await db.collection('businesses').doc(bid).get();
        console.log('[businesses]:', JSON.stringify(bDoc.data(), null, 2));

        // 2. /restaurant_settings/{bid}
        const sDoc = await db.collection('restaurant_settings').doc(bid).get();
        console.log('[restaurant_settings]:', sDoc.exists ? JSON.stringify(sDoc.data(), null, 2) : 'NOT FOUND');

        // 3. /branches where businessId == bid
        const brSnap = await db.collection('branches').where('businessId', '==', bid).get();
        console.log(`[branches] (${brSnap.size} found):`);
        brSnap.forEach(d => console.log(`  Branch ${d.id}:`, JSON.stringify(d.data(), null, 2)));

        // 4. /categories where businessId == bid
        const catSnap = await db.collection('categories').where('businessId', '==', bid).get();
        console.log(`[categories] (${catSnap.size} found):`);
        catSnap.forEach(d => console.log(`  Category ${d.id}:`, JSON.stringify(d.data(), null, 2)));

        // 5. /products where businessId == bid
        const pSnap = await db.collection('products').where('businessId', '==', bid).get();
        console.log(`[products] (${pSnap.size} found):`);
        pSnap.forEach(d => console.log(`  Product ${d.id}:`, JSON.stringify(d.data(), null, 2)));
        
        console.log('\n');
    }
}

inspectCommerceDetails().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
