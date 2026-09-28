const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const crypto = require("crypto");

initializeApp();
const db = getFirestore();
const storage = getStorage();

async function syncPhotos() {
  console.log("Iniciando sincronización de fotos de motorizados...");
  const bucket = storage.bucket("bluesystem-7c9af.firebasestorage.app");
  
  const couriersSnap = await db.collection("couriers").get();
  let updated = 0;

  for (const doc of couriersSnap.docs) {
    const c = doc.data();
    const uid = doc.id;
    let appDoc = null;

    if (c.applicationId) {
      const snap = await db.collection("courier_applications").doc(c.applicationId).get();
      if (snap.exists) appDoc = snap.data();
    }
    if (!appDoc && c.email) {
      const snap = await db.collection("courier_applications").where("personal.email", "==", c.email).limit(1).get();
      if (!snap.empty) appDoc = snap.docs[0].data();
    }

    if (appDoc && appDoc.documents?.profilePhoto) {
      const profile = appDoc.documents.profilePhoto;
      let photoUrl = profile.downloadUrl || "";
      const storagePath = profile.storagePath;

      if (!photoUrl && storagePath) {
        try {
          const file = bucket.file(storagePath);
          const [exists] = await file.exists();
          if (exists) {
            const [metadata] = await file.getMetadata();
            let token = metadata.metadata?.firebaseStorageDownloadTokens;
            if (!token) {
              token = crypto.randomUUID();
              await file.setMetadata({
                metadata: { firebaseStorageDownloadTokens: token }
              });
            }
            photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
          }
        } catch (err) {
          console.warn(`Error en storage para ${uid}:`, err.message);
        }
      }

      if (photoUrl) {
        console.log(`✅ Sincronizando foto para: ${c.name || c.nombre} (${uid})`);
        console.log(`   URL: ${photoUrl}`);

        await db.collection("couriers").doc(uid).set({
          photoUrl,
          photoURL: photoUrl,
          fotoUrl: photoUrl,
          profilePhotoUrl: photoUrl,
          profilePhotoStoragePath: storagePath || ""
        }, { merge: true });

        await db.collection("users").doc(uid).set({
          photoUrl,
          photoURL: photoUrl,
          fotoUrl: photoUrl,
          profilePhotoUrl: photoUrl,
          profilePhotoStoragePath: storagePath || ""
        }, { merge: true });

        updated++;
      }
    }
  }

  console.log(`\n🎉 Sincronización finalizada. ${updated} motorizados actualizados con su foto de perfil.`);
}

syncPhotos().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
