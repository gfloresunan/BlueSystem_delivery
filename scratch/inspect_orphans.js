const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectOrphans() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       INSPECCIÓN DE USUARIOS Y ORGANIZACIONES HUÉRFANAS GENERADAS EN LOOP      ");
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

    let loopUsers = 0;
    let legitimateUsers = 0;
    const loopUserDocs = [];

    userSnap.forEach(doc => {
        const d = doc.data();
        if (canonicalOwnerUids.has(doc.id)) {
            legitimateUsers++;
        } else if (d.eiamRole === 'MERCHANT_OWNER' || d.name === 'Admin Tecnostore' || (d.email && d.email.includes('tecnostore'))) {
            loopUsers++;
            loopUserDocs.push(doc);
        } else {
            legitimateUsers++;
        }
    });

    let loopOrgs = 0;
    let legitimateOrgs = 0;
    const loopOrgDocs = [];

    orgSnap.forEach(doc => {
        const d = doc.data();
        if (canonicalOrgIds.has(doc.id)) {
            legitimateOrgs++;
        } else if (d.name === 'Grupo Flores' || d.ruc === 'J03100002372737' || !canonicalOwnerUids.has(d.ownerUid)) {
            loopOrgs++;
            loopOrgDocs.push(doc);
        } else {
            legitimateOrgs++;
        }
    });

    console.log(`Usuarios en /users: Total=${userSnap.size} | Legítimos=${legitimateUsers} | Huérfanos de Loop=${loopUsers}`);
    console.log(`Organizaciones en /organizations: Total=${orgSnap.size} | Legítimas=${legitimateOrgs} | Huérfanas de Loop=${loopOrgs}`);
}

inspectOrphans().catch(console.error);
