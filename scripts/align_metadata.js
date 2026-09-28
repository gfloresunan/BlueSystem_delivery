const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function alignGovernanceMetadata() {
    const darianoBizId = "00552e8b-3473-413c-9594-793fdb42dfdd";
    const darianoOrgId = "1c2f0691-7643-49ad-b564-6a9d6be864d9";
    const darianoBranchId = "ce4e4f60-9e78-47dd-bf3c-42a46479a39e";
    const targetAppId = "UEltaH08PPauMnMczNTa";

    // 1. Align Business
    await db.collection("businesses").doc(darianoBizId).set({
        source: "ADR_011",
        applicationId: targetAppId,
        orgId: darianoOrgId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Align Branch
    await db.collection("branches").doc("br_1786993038705").set({
        orgId: "org_default_bluesystem"
    }, { merge: true });

    // 3. Align Application
    await db.collection("merchant_applications").doc(targetAppId).set({
        businessId: darianoBizId,
        provisionedBusinessId: darianoBizId,
        organizationId: darianoOrgId,
        branchId: darianoBranchId,
        source: "ADR_011",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Metadata alignment complete!");
}

alignGovernanceMetadata()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
