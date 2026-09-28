const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function verifyState() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       POST-CLEANUP DATABASE INTEGRITY & EXACT POPULATION VERIFICATION         ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const [bizSnap, brSnap, memSnap, memsSnap, userSnap, orgSnap, appSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('membership').get(),
        db.collection('memberships').get(),
        db.collection('users').get(),
        db.collection('organizations').get(),
        db.collection('merchant_applications').get()
    ]);

    console.log(`TOTAL BUSINESSES: ${bizSnap.size}`);
    bizSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  * [${doc.id}] "${d.name || d.comercioNombre}" (status: ${d.status}, lifecycle: ${d.lifecycleStatus}, ownerUid: ${d.ownerUid})`);
    });

    console.log(`\nTOTAL BRANCHES: ${brSnap.size}`);
    brSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  * [${doc.id}] "${d.name || d.branchName}" -> bizId: ${d.businessId} (isPrimary: ${d.isPrimary})`);
    });

    console.log(`\nTOTAL LEGACY MEMBERSHIPS: ${memSnap.size}`);
    memSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  * [${doc.id}] role: ${d.role}, status: ${d.status}, bizId: ${d.businessId}, uid: ${d.uid}`);
    });

    console.log(`\nTOTAL V3 MEMBERSHIPS: ${memsSnap.size}`);
    memsSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  * [${doc.id}] role: ${d.role}, status: ${d.status}, bizId: ${d.businessId}, uid: ${d.uid}`);
    });

    console.log(`\nTECNOSTORE USERS in /users:`);
    let tecnoUserCount = 0;
    userSnap.forEach(doc => {
        const d = doc.data();
        const email = (d.email || '').toLowerCase();
        if (email.includes('tecnostore') || (d.name && d.name.includes('Tecnostore'))) {
            tecnoUserCount++;
            console.log(`  * [${doc.id}] "${d.name || d.nombre}" (${d.email}) role: ${d.role}, eiamRole: ${d.eiamRole}, bizId: ${d.businessId}`);
        }
    });
    console.log(`Total Tecnostore users: ${tecnoUserCount}`);

    console.log(`\nTOTAL MERCHANT APPLICATIONS: ${appSnap.size}`);
    appSnap.forEach(doc => {
        const d = doc.data();
        console.log(`  * [${doc.id}] "${d.businessName}" status: ${d.status}, provisionedBizId: ${d.provisionedBusinessId}`);
    });
}

verifyState().catch(console.error);
