const path = require('path');
const fs = require('fs');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function haltLoop() {
    console.log("=== HALTING CLOUD LOOP BY REMOVING TRIGGER ATOM ===");
    const targetAppId = "UEltaH08PPauMnMczNTa";
    
    // Clean duplicate businesses, branches, memberships
    const bizSnap = await db.collection('businesses').get();
    const bizBatch = db.batch();
    let keptDariano = false;
    let keptDarianoId = null;

    bizSnap.forEach(doc => {
        const d = doc.data();
        const name = (d.name || d.comercioNombre || "").trim();
        if (name === "El Dariano") {
            if (!keptDariano) {
                keptDariano = true;
                keptDarianoId = doc.id;
            } else {
                bizBatch.delete(doc.ref);
            }
        } else if (name === "Vicenta Gutierrez") {
            bizBatch.delete(doc.ref);
        }
    });
    await bizBatch.commit();
    console.log(`Preserved canonical business: ${keptDarianoId}`);

    // Clean branches
    const branchSnap = await db.collection('branches').get();
    const branchBatch = db.batch();
    let keptBranch = false;
    branchSnap.forEach(doc => {
        const d = doc.data();
        if (d.businessId === keptDarianoId) {
            if (!keptBranch) keptBranch = true;
            else branchBatch.delete(doc.ref);
        } else if (d.name === "El Dariano" || d.comercioNombre === "El Dariano") {
            branchBatch.delete(doc.ref);
        }
    });
    await branchBatch.commit();

    // Clean memberships
    const memSnap = await db.collection('membership').get();
    const memBatch = db.batch();
    let keptMem = false;
    memSnap.forEach(doc => {
        const d = doc.data();
        if (d.businessId === keptDarianoId) {
            if (!keptMem) keptMem = true;
            else {
                memBatch.delete(doc.ref);
                memBatch.delete(db.collection('memberships').doc(doc.id));
            }
        } else if (d.businessName === "El Dariano") {
            memBatch.delete(doc.ref);
            memBatch.delete(db.collection('memberships').doc(doc.id));
        }
    });
    await memBatch.commit();

    // Recreate the application with status ONBOARDING
    const rawBackup = fs.readFileSync(path.join(__dirname, '../scratch/saved_application_dariano.json'), 'utf8');
    const backupData = JSON.parse(rawBackup);
    delete backupData.provisioningError;
    delete backupData.provisioningErrorAt;
    
    await db.collection("merchant_applications").doc(targetAppId).set({
        ...backupData,
        status: "ONBOARDING",
        provisionedBusinessId: keptDarianoId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Re-created application ${targetAppId} in stable status ONBOARDING with canonical businessId ${keptDarianoId}`);
}

haltLoop()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
