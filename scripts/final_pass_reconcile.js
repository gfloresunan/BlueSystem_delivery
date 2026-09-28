const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function exactLoop() {
    const targetAppId = "UEltaH08PPauMnMczNTa";
    
    while (true) {
        const bizSnap = await db.collection('businesses').get();
        let canonicalDarianoId = null;
        const toDeleteBiz = [];

        bizSnap.forEach(doc => {
            const d = doc.data();
            const name = (d.name || d.comercioNombre || "").trim();
            if (name === "El Dariano") {
                if (!canonicalDarianoId) {
                    canonicalDarianoId = doc.id;
                } else {
                    toDeleteBiz.push(doc.id);
                }
            } else if (name === "Vicenta Gutierrez") {
                toDeleteBiz.push(doc.id);
            }
        });

        console.log(`Current: Canonical Dariano = ${canonicalDarianoId}, To Delete = ${toDeleteBiz.length}`);

        if (toDeleteBiz.length === 0) {
            console.log("No more duplicates found!");
            break;
        }

        // Clean branches
        const branchSnap = await db.collection('branches').get();
        const toDeleteBranches = [];
        let keptBranch = false;
        branchSnap.forEach(doc => {
            const d = doc.data();
            if (d.businessId === canonicalDarianoId) {
                if (!keptBranch) keptBranch = true;
                else toDeleteBranches.push(doc.id);
            } else if (toDeleteBiz.includes(d.businessId)) {
                toDeleteBranches.push(doc.id);
            }
        });

        // Clean membership
        const memSnap = await db.collection('membership').get();
        const toDeleteMem = [];
        let keptMem = false;
        memSnap.forEach(doc => {
            const d = doc.data();
            if (d.businessId === canonicalDarianoId) {
                if (!keptMem) keptMem = true;
                else toDeleteMem.push(doc.id);
            } else if (toDeleteBiz.includes(d.businessId)) {
                toDeleteMem.push(doc.id);
            }
        });

        // Delete in small chunks
        for (const id of toDeleteBiz) {
            await db.collection('businesses').doc(id).delete().catch(() => {});
        }
        for (const id of toDeleteBranches) {
            await db.collection('branches').doc(id).delete().catch(() => {});
        }
        for (const id of toDeleteMem) {
            await db.collection('membership').doc(id).delete().catch(() => {});
            await db.collection('memberships').doc(id).delete().catch(() => {});
        }

        await db.collection("merchant_applications").doc(targetAppId).update({
            status: "ONBOARDING",
            provisionedBusinessId: canonicalDarianoId,
            provisioningError: admin.firestore.FieldValue.delete(),
            provisioningErrorAt: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

exactLoop()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
