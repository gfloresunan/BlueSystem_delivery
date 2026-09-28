const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

initializeApp();
const db = getFirestore();
const storage = getStorage();

async function checkCouriers() {
  const couriersSnap = await db.collection("couriers").get();
  console.log(`Total couriers: ${couriersSnap.size}`);
  
  for (const doc of couriersSnap.docs) {
    const c = doc.data();
    console.log(`\nCourier: ${doc.id} - ${c.name || c.nombre}`);
    console.log(`  photoUrl: ${c.photoUrl || c.fotoUrl || 'NONE'}`);
    console.log(`  applicationId: ${c.applicationId || 'NONE'}`);

    let appDoc = null;
    if (c.applicationId) {
      const snap = await db.collection("courier_applications").doc(c.applicationId).get();
      if (snap.exists) appDoc = snap.data();
    }
    if (!appDoc && c.email) {
      const snap = await db.collection("courier_applications").where("personal.email", "==", c.email).limit(1).get();
      if (!snap.empty) appDoc = snap.docs[0].data();
    }

    if (appDoc) {
      console.log(`  Found courier_application: ${appDoc.applicationId}`);
      console.log(`  profilePhoto:`, JSON.stringify(appDoc.documents?.profilePhoto));
    } else {
      console.log(`  No courier_application found.`);
    }
  }
}

checkCouriers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
