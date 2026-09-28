const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function cleanOrphanedBranchesAndMemberships() {
    const bizSnap = await db.collection('businesses').get();
    const validBizIds = new Set();
    bizSnap.forEach(doc => validBizIds.add(doc.id));
    console.log("Valid Canonical Business IDs:", Array.from(validBizIds));

    // 1. Clean Branches
    const branchSnap = await db.collection('branches').get();
    const branchBatch = db.batch();
    let branchDeleteCount = 0;
    const keptBranchesByBiz = {};

    branchSnap.forEach(doc => {
        const d = doc.data();
        const bId = d.businessId;
        if (!validBizIds.has(bId)) {
            branchBatch.delete(doc.ref);
            branchDeleteCount++;
        } else {
            keptBranchesByBiz[bId] = (keptBranchesByBiz[bId] || 0) + 1;
        }
    });
    if (branchDeleteCount > 0) {
        await branchBatch.commit();
        console.log(`Deleted ${branchDeleteCount} orphaned branches.`);
    }

    // 2. Clean Memberships
    const memSnap = await db.collection('membership').get();
    const memBatch = db.batch();
    let memDeleteCount = 0;
    const keptMemByBiz = {};

    memSnap.forEach(doc => {
        const d = doc.data();
        const bId = d.businessId;
        if (!validBizIds.has(bId)) {
            memBatch.delete(doc.ref);
            memBatch.delete(db.collection('memberships').doc(doc.id));
            memDeleteCount++;
        } else {
            keptMemByBiz[bId] = (keptMemByBiz[bId] || 0) + 1;
        }
    });
    if (memDeleteCount > 0) {
        await memBatch.commit();
        console.log(`Deleted ${memDeleteCount} orphaned memberships.`);
    }

    console.log("Branches breakdown per business:", keptBranchesByBiz);
    console.log("Memberships breakdown per business:", keptMemByBiz);
}

cleanOrphanedBranchesAndMemberships()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
