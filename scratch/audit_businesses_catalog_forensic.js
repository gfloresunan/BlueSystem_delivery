const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectAllBusinesses() {
    console.log('=== FORENSIC READ-ONLY AUDIT: /businesses COLLECTION ===\n');
    const snap = await db.collection('businesses').get();
    console.log(`Total documents in /businesses: ${snap.size}\n`);

    snap.forEach(doc => {
        const d = doc.data();
        console.log(`--- Document ID: ${doc.id} ---`);
        console.log(`  name: "${d.name || d.comercioNombre || d.nombre}"`);
        console.log(`  category: "${d.category || d.categoria || d.categorySlug || d.categoryId}"`);
        console.log(`  isActive: ${d.isActive} | active: ${d.active} | status: "${d.status}" | lifecycleStatus: "${d.lifecycleStatus}" | isDeleted: ${d.isDeleted}`);
        console.log(`  isOpen: ${d.isOpen} | abierto: ${d.abierto}`);
        console.log(`  isFeatured: ${d.isFeatured} | featured: ${d.featured}`);
        console.log(`  tenantId: "${d.tenantId}" | orgId: "${d.orgId || d.organizationId}"`);
        console.log(`  raw fields:`, Object.keys(d).sort());
        console.log('');
    });
}

inspectAllBusinesses().catch(console.error);
