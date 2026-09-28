const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function cleanExact() {
    const canonicalDarianoId = "06350408-8e44-4e51-b439-e87a41397b96";
    const targetAppId = "UEltaH08PPauMnMczNTa";

    const [bizSnap, branchSnap, memSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('membership').get(),
    ]);

    const batch = db.batch();

    bizSnap.forEach(doc => {
        const d = doc.data();
        const name = (d.name || d.comercioNombre || "").trim();
        if (name === "El Dariano") {
            if (doc.id !== canonicalDarianoId) {
                batch.delete(doc.ref);
            }
        } else if (name === "Vicenta Gutierrez") {
            batch.delete(doc.ref);
        }
    });

    branchSnap.forEach(doc => {
        const d = doc.data();
        if (d.businessId === canonicalDarianoId) {
            // keep 1 canonical branch
        } else if (d.comercioNombre === "El Dariano" || d.name === "El Dariano" || d.businessId !== canonicalDarianoId && d.name && d.name.includes("Dariano")) {
            batch.delete(doc.ref);
        }
    });

    memSnap.forEach(doc => {
        const d = doc.data();
        if (d.businessId && d.businessId !== canonicalDarianoId && (d.businessName === "El Dariano" || d.role === "MERCHANT_OWNER" && d.businessId.length === 36 && d.businessId !== "bbb760d5-a8f3-4700-9a96-f58f11f345ac" && d.businessId !== "e7dc911e-e587-4be9-a741-7d9d9828011f")) {
            batch.delete(doc.ref);
            batch.delete(db.collection('memberships').doc(doc.id));
        }
    });

    batch.update(db.collection("merchant_applications").doc(targetAppId), {
        status: "ONBOARDING",
        provisionedBusinessId: canonicalDarianoId,
        provisioningError: admin.firestore.FieldValue.delete(),
        provisioningErrorAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    console.log("Clean exact batch committed successfully!");
}

cleanExact()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
