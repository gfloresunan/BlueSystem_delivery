const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function cleanAllDuplicates() {
    console.log("Starting full database reconciliation...");
    const targetAppId = "UEltaH08PPauMnMczNTa";

    // 1. Businesses
    const bizSnap = await db.collection('businesses').get();
    let keptDarianoId = null;
    const bizBatch = db.batch();
    const deletedBizIds = new Set();

    bizSnap.forEach(doc => {
        const d = doc.data();
        const name = (d.name || d.comercioNombre || "").trim();
        if (name === "El Dariano") {
            if (!keptDarianoId) {
                keptDarianoId = doc.id;
                console.log(`Keeping canonical El Dariano: ${doc.id}`);
            } else {
                bizBatch.delete(doc.ref);
                deletedBizIds.add(doc.id);
            }
        } else if (name === "Vicenta Gutierrez") {
            bizBatch.delete(doc.ref);
            deletedBizIds.add(doc.id);
        }
    });

    await bizBatch.commit();
    console.log(`Deleted ${deletedBizIds.size} duplicate businesses.`);

    // 2. Branches
    const branchSnap = await db.collection('branches').get();
    const branchBatch = db.batch();
    let keptDarianoBranch = false;
    let branchDeleteCount = 0;

    branchSnap.forEach(doc => {
        const d = doc.data();
        if (d.businessId === keptDarianoId) {
            if (!keptDarianoBranch) {
                keptDarianoBranch = true;
                console.log(`Keeping canonical branch: ${doc.id}`);
            } else {
                branchBatch.delete(doc.ref);
                branchDeleteCount++;
            }
        } else if (deletedBizIds.has(d.businessId) || d.comercioNombre === "El Dariano" || d.name === "El Dariano") {
            branchBatch.delete(doc.ref);
            branchDeleteCount++;
        }
    });

    if (branchDeleteCount > 0) {
        await branchBatch.commit();
        console.log(`Deleted ${branchDeleteCount} duplicate branches.`);
    }

    // 3. Memberships
    const memSnap = await db.collection('membership').get();
    const memBatch = db.batch();
    let keptDarianoMem = false;
    let memDeleteCount = 0;

    memSnap.forEach(doc => {
        const d = doc.data();
        if (d.businessId === keptDarianoId) {
            if (!keptDarianoMem) {
                keptDarianoMem = true;
                console.log(`Keeping canonical membership: ${doc.id}`);
            } else {
                memBatch.delete(doc.ref);
                memBatch.delete(db.collection('memberships').doc(doc.id));
                memDeleteCount++;
            }
        } else if (deletedBizIds.has(d.businessId)) {
            memBatch.delete(doc.ref);
            memBatch.delete(db.collection('memberships').doc(doc.id));
            memDeleteCount++;
        }
    });

    if (memDeleteCount > 0) {
        await memBatch.commit();
        console.log(`Deleted ${memDeleteCount} duplicate memberships.`);
    }

    // 4. Update Application
    await db.collection("merchant_applications").doc(targetAppId).set({
        status: "ONBOARDING",
        provisionedBusinessId: keptDarianoId,
        provisioningError: admin.firestore.FieldValue.delete(),
        provisioningErrorAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Reconciliation finished successfully.");
}

cleanAllDuplicates()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
