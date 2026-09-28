const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function neutralizeLiveLoop() {
    console.log("=== NEUTRALIZING LIVE CLOUD FUNCTION TRIGGER ATOM ===");
    const targetAppId = "icmP7k8O9gbqIvEa1ZWY";
    const appRef = db.collection("merchant_applications").doc(targetAppId);
    
    const doc = await appRef.get();
    if (!doc.exists) {
        console.error("Target application not found!");
        process.exit(1);
    }

    const data = doc.data();
    console.log("Current status:", data.status, "provisionedBusinessId:", data.provisionedBusinessId);

    // Set to stable ONBOARDING status so onMerchantApplicationApproved trigger will not fire
    await appRef.set({
        ...data,
        status: "ONBOARDING",
        provisionedBusinessId: data.provisionedBusinessId || "biz_tecnostore_canonical",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Successfully neutralized application status to 'ONBOARDING'. Loop halted.");
}

neutralizeLiveLoop()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
