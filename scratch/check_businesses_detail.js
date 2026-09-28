const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkAllBusinessesAndApps() {
    console.log('=== ALL /businesses DOCS ===');
    const bSnap = await db.collection('businesses').get();
    bSnap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}`);
        console.log(`  Name: ${data.name || data.nombre || data.comercioNombre}`);
        console.log(`  Category: ${data.category || data.categoria}`);
        console.log(`  Status: ${data.status} | Lifecycle: ${data.lifecycleStatus} | Active: ${data.isActive}/${data.active}`);
        console.log(`  isFeatured: ${data.isFeatured} | featured: ${data.featured}`);
        console.log(`  isOpen: ${data.isOpen} | abierto: ${data.abierto}`);
        console.log(`  isDeleted: ${data.isDeleted}`);
    });

    console.log('\n=== /merchant_applications ===');
    const mSnap = await db.collection('merchant_applications').get();
    mSnap.forEach(d => {
        const data = d.data();
        console.log(`App ID: ${d.id} | Name: ${data.businessName || data.name} | Category: ${data.category} | Status: ${data.status}`);
    });
}

checkAllBusinessesAndApps().catch(console.error);
