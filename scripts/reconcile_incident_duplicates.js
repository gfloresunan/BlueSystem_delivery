const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function reconcileIncidentDuplicates() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("          FORENSIC DATA RECONCILIATION — EL DARIANO RECOVERY SUITE              ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const targetAppId = "UEltaH08PPauMnMczNTa";
    const appDoc = await db.collection("merchant_applications").doc(targetAppId).get();
    if (!appDoc.exists) {
        console.error("Application not found:", targetAppId);
        return;
    }
    const appData = appDoc.data();
    console.log(`Target Application: ${targetAppId} ("${appData.businessName}")`);
    
    // We will keep 1 canonical businessId
    const canonicalBusinessId = appData.provisionedBusinessId || "1184cc0a-878d-4fca-8133-1503f6227540";
    console.log(`Canonical Business ID to PRESERVE: ${canonicalBusinessId}`);

    // 1. Fetch all businesses
    console.log("\n1. Scanning businesses...");
    const bizSnap = await db.collection('businesses').get();
    const businessesToDelete = [];
    let preservedBiz = null;

    bizSnap.forEach(doc => {
        const d = doc.data();
        const name = (d.name || d.comercioNombre || "").trim();
        
        if (name === "El Dariano") {
            if (doc.id === canonicalBusinessId) {
                preservedBiz = doc;
            } else {
                businessesToDelete.push(doc.id);
            }
        } else if (name === "Vicenta Gutierrez" || doc.id.length === 28) {
            // Check if this is a user projection doc
            if (d.eiamRole || d.role === "business" || name === "Vicenta Gutierrez") {
                businessesToDelete.push(doc.id);
            }
        }
    });

    // If canonical was somehow not found in loop, pick the first one from toDelete to preserve
    if (!preservedBiz && businessesToDelete.length > 0) {
        const idToKeep = businessesToDelete.shift();
        console.log(`Selected ${idToKeep} as canonical business to preserve.`);
    }

    console.log(` - Preserving Canonical Business: ${canonicalBusinessId}`);
    console.log(` - Duplicate/Phantom Businesses to Delete: ${businessesToDelete.length}`);

    // 2. Fetch branches
    console.log("\n2. Scanning branches...");
    const branchSnap = await db.collection('branches').get();
    const branchesToDelete = [];
    let preservedBranchCount = 0;

    branchSnap.forEach(doc => {
        const d = doc.data();
        const bId = d.businessId;
        if (bId === canonicalBusinessId) {
            if (preservedBranchCount === 0) {
                preservedBranchCount++;
            } else {
                branchesToDelete.push(doc.id);
            }
        } else if (businessesToDelete.includes(bId)) {
            branchesToDelete.push(doc.id);
        }
    });

    console.log(` - Preserved Canonical Branches: ${preservedBranchCount}`);
    console.log(` - Duplicate Branches to Delete: ${branchesToDelete.length}`);

    // 3. Fetch membership
    console.log("\n3. Scanning membership collections...");
    const memSnap = await db.collection('membership').get();
    const memToDelete = [];
    let preservedMemCount = 0;

    memSnap.forEach(doc => {
        const d = doc.data();
        const bId = d.businessId;
        if (bId === canonicalBusinessId) {
            if (preservedMemCount === 0) {
                preservedMemCount++;
            } else {
                memToDelete.push(doc.id);
            }
        } else if (businessesToDelete.includes(bId)) {
            memToDelete.push(doc.id);
        }
    });

    console.log(` - Preserved Canonical Memberships: ${preservedMemCount}`);
    console.log(` - Duplicate Memberships to Delete: ${memToDelete.length}`);

    // 4. Batch Delete in chunks of 450
    async function deleteInBatches(collectionName, ids) {
        if (ids.length === 0) return;
        console.log(`Deleting ${ids.length} docs from /${collectionName}...`);
        const chunkSize = 400;
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            const batch = db.batch();
            chunk.forEach(id => {
                batch.delete(db.collection(collectionName).doc(id));
            });
            await batch.commit();
            console.log(` - Batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(ids.length / chunkSize)} committed (${chunk.length} docs)`);
        }
    }

    await deleteInBatches('businesses', businessesToDelete);
    await deleteInBatches('branches', branchesToDelete);
    await deleteInBatches('membership', memToDelete);
    await deleteInBatches('memberships', memToDelete);

    // 5. Update Application Document to healthy ONBOARDING status
    console.log("\n4. Updating target application to ONBOARDING status...");
    await db.collection("merchant_applications").doc(targetAppId).update({
        status: "ONBOARDING",
        provisionedBusinessId: canonicalBusinessId,
        provisioningError: admin.firestore.FieldValue.delete(),
        provisioningErrorAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Reconciliation Completed Successfully!");
}

reconcileIncidentDuplicates()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Error during reconciliation:", err);
        process.exit(1);
    });
