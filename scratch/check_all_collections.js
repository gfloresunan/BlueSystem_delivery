const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkAllCollections() {
    console.log('=== CHECKING ALL BUSINESS-RELATED COLLECTIONS ===\n');

    // 1. /businesses
    const bSnap = await db.collection('businesses').get();
    console.log(`=== /businesses (${bSnap.size} docs) ===`);
    bSnap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Name: "${data.name || data.nombre || data.comercioNombre}" | Category: "${data.category || data.categoria}" | Status: "${data.status}" | Lifecycle: "${data.lifecycleStatus}" | Active: ${data.isActive}/${data.active} | Featured: ${data.isFeatured}`);
    });

    // 2. /users where role in ['business', 'comercio', 'restaurant', 'MERCHANT_OWNER']
    const uSnap = await db.collection('users').get();
    console.log(`\n=== /users (${uSnap.size} docs total) ===`);
    uSnap.forEach(d => {
        const data = d.data();
        if (data.rol === 'business' || data.rol === 'comercio' || data.role === 'MERCHANT_OWNER' || data.role === 'OWNER' || data.businessId || data.comercioId) {
            console.log(`User ID: ${d.id} | Email: ${data.email} | Name: "${data.nombre || data.displayName}" | Rol: ${data.rol || data.role} | businessId: ${data.businessId} | status: ${data.status}`);
        }
    });

    // 3. Check if there are any other collections like 'commerces', 'tiendas', 'pharmacies'
    const colList = await db.listCollections();
    console.log('\n=== Root Collections in Firestore ===');
    console.log(colList.map(c => c.id).join(', '));
}

checkAllCollections().catch(console.error);
