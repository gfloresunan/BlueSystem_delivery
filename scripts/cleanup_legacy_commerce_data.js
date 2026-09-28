const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function cleanupLegacyData() {
    console.log('================================================================');
    console.log('       BLUESYSTEM COMMERCE DATA PURIFICATION & RECONCILIATION   ');
    console.log('================================================================\n');

    // 1. Identify all documents in /businesses
    const bizSnap = await db.collection('businesses').get();
    console.log(`Total documents in /businesses: ${bizSnap.size}`);

    const batch = db.batch();
    let mutationCount = 0;

    bizSnap.forEach(doc => {
        const d = doc.data();
        const docId = doc.id;
        const isDeleted = d.status === 'DELETED' || d.lifecycleStatus === 'DELETED' || d.lifecycleStatus === 'DEPROVISIONED' || d.isDeleted === true || d.active === false;

        if (isDeleted && (d.name === 'Chepita' || d.comercioNombre === 'Chepita' || d.name === 'Henry Paz' || docId === '1769029559449' || docId === '1768878763084')) {
            console.log(`[PURGE] Physical delete for residual deleted business document: /businesses/${docId} (${d.name || d.comercioNombre})`);
            batch.delete(doc.ref);
            mutationCount++;
        }
    });

    // 2. Identify corresponding documents in /users matching residual deleted stores
    const usersSnap = await db.collection('users').get();
    console.log(`Total documents in /users: ${usersSnap.size}`);

    usersSnap.forEach(doc => {
        const d = doc.data();
        const docId = doc.id;

        if (docId === '1769029559449' || docId === '1768878763084' || ((d.name === 'Chepita' || d.comercioNombre === 'Chepita') && (d.status === 'DELETED' || d.isDeleted === true))) {
            console.log(`[PURGE] Marking residual deleted user account as DEPROVISIONED / DELETED: /users/${docId} (${d.name || d.comercioNombre})`);
            batch.set(doc.ref, {
                status: 'DELETED',
                lifecycleStatus: 'DEPROVISIONED',
                isDeleted: true,
                active: false,
                isActive: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            mutationCount++;
        }
    });

    if (mutationCount > 0) {
        await batch.commit();
        console.log(`\n✅ Data purification successful! Executed ${mutationCount} atomic mutations.`);
    } else {
        console.log('\nNo residual records required mutations.');
    }

    // 3. Verification Audit
    console.log('\n=== POST-CLEANUP VERIFICATION ===');
    const postBizSnap = await db.collection('businesses').get();
    const activeBiz = [];
    postBizSnap.forEach(doc => {
        const d = doc.data();
        const isDel = d.status === 'DELETED' || d.lifecycleStatus === 'DELETED' || d.lifecycleStatus === 'DEPROVISIONED' || d.isDeleted === true;
        if (!isDel) {
            activeBiz.push({ id: doc.id, name: d.name || d.comercioNombre, status: d.status, active: d.active });
        }
    });

    console.log(`Active Canonical Businesses in /businesses: ${activeBiz.length}`);
    activeBiz.forEach(b => console.log(` - ID: ${b.id} | Name: ${b.name} | Status: ${b.status}`));
}

cleanupLegacyData().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
