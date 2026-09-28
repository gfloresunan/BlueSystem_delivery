const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function inspectDoc() {
  const tripIds = ["env_f1292707", "env_5c6a226a"];
  for (const id of tripIds) {
    console.log(`\n================= TRIP ${id} =================`);
    const doc = await db.collection("deliveryTrips").doc(id).get();
    if (!doc.exists) {
      console.log("NOT FOUND");
      continue;
    }
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2));
  }
}

inspectDoc().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
