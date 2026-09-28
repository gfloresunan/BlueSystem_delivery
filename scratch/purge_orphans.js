const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function purgeLoopOrphans() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       PURGA ATÓMICA DE USUARIOS Y ORGANIZACIONES HUÉRFANAS DE BUCLE           ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const [userSnap, orgSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('organizations').get()
    ]);

    const canonicalOwnerUids = new Set([
        'IARgLc7GMPSkHnSS2Vmv1KpByDR2', // El Dariano
        'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2', // El Chanchito
        '04JAKPrmXjg7s2CDiT3kUPOhBwn2', // TECNOSTORE
        'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2', // FRITONI
        'XWNzPT5p6fbf7reFdFBNTZoQrY42'  // Variedades TECNOHOME
    ]);

    const canonicalOrgIds = new Set([
        'org_canonical_tecnostore',
        'org_default_bluesystem',
        'org_1787895553815'
    ]);

    const orphanUserDocs = [];
    userSnap.forEach(doc => {
        const d = doc.data();
        if (canonicalOwnerUids.has(doc.id)) return;
        if (d.eiamRole === 'MERCHANT_OWNER' || d.name === 'Admin Tecnostore' || (d.email && d.email.includes('tecnostore'))) {
            orphanUserDocs.push(doc.ref);
        }
    });

    const orphanOrgDocs = [];
    orgSnap.forEach(doc => {
        const d = doc.data();
        if (canonicalOrgIds.has(doc.id)) return;
        if (d.name === 'Grupo Flores' || d.ruc === 'J03100002372737' || !canonicalOwnerUids.has(d.ownerUid)) {
            orphanOrgDocs.push(doc.ref);
        }
    });

    console.log(`Orphan users to delete: ${orphanUserDocs.length}`);
    console.log(`Orphan orgs to delete: ${orphanOrgDocs.length}`);

    async function batchDelete(refs, label) {
        let count = 0;
        const chunkSize = 400;
        for (let i = 0; i < refs.length; i += chunkSize) {
            const chunk = refs.slice(i, i + chunkSize);
            const batch = db.batch();
            chunk.forEach(r => batch.delete(r));
            await batch.commit();
            count += chunk.length;
            console.log(`   [${label}] Deleted ${count}/${refs.length}`);
        }
    }

    await batchDelete(orphanUserDocs, "Users");
    await batchDelete(orphanOrgDocs, "Organizations");

    console.log("\nPurge completed successfully!");
}

purgeLoopOrphans().catch(console.error);
