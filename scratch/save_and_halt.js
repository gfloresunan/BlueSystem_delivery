const path = require('path');
const fs = require('fs');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function saveAndHalt() {
    const targetAppId = "icmP7k8O9gbqIvEa1ZWY";
    const appRef = db.collection("merchant_applications").doc(targetAppId);
    const snap = await appRef.get();
    if (snap.exists) {
        fs.writeFileSync(path.join(__dirname, '../scratch/saved_application_tecnostore.json'), JSON.stringify(snap.data(), null, 2));
        console.log("Saved application backup to scratch/saved_application_tecnostore.json");
        await appRef.delete();
        console.log("Deleted merchant_applications/icmP7k8O9gbqIvEa1ZWY to HALT cloud trigger.");
    }
}

saveAndHalt()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
