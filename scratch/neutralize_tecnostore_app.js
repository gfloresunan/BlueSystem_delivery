const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function neutralizeTecnostore() {
    const targetAppId = "icmP7k8O9gbqIvEa1ZWY";
    const appRef = db.collection("merchant_applications").doc(targetAppId);

    // Keep writing ONBOARDING for a few seconds until loop stops
    for (let i = 0; i < 5; i++) {
        await appRef.set({
            status: "ONBOARDING",
            provisionedBusinessId: "biz_canonical_tecnostore_001",
            provisionedUid: "uid_canonical_tecnostore_001",
            provisioningError: admin.firestore.FieldValue.delete(),
            provisioningErrorAt: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Lock attempt ${i + 1} written.`);
        await new Promise(r => setTimeout(r, 600));
    }

    const finalSnap = await appRef.get();
    console.log("Final state:", finalSnap.data().status, "provisionedBusinessId:", finalSnap.data().provisionedBusinessId);
}

neutralizeTecnostore()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
