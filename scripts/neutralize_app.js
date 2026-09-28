const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function neutralizeApplication() {
    const targetAppId = "UEltaH08PPauMnMczNTa";
    await db.collection("merchant_applications").doc(targetAppId).set({
        status: "ONBOARDING",
        provisionedBusinessId: "biz_canonical_eldariano_001",
        provisioningError: admin.firestore.FieldValue.delete(),
        provisioningErrorAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("Application neutralized to status ONBOARDING.");
}

neutralizeApplication()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
