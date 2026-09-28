process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'bluesystem-7c9af';
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function inspectFritoni() {
    console.log('================================================================');
    console.log('  FASE 1 — READ-ONLY FORENSIC INSPECTION: FRITONI IDENTITY      ');
    console.log('================================================================\n');

    const uid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const email = 'fritonic@gmail.com';

    // 1. Firebase Auth User
    try {
        const authUser = await auth.getUser(uid);
        console.log('[1. Firebase Auth User]:', {
            uid: authUser.uid,
            email: authUser.email,
            customClaims: authUser.customClaims,
            disabled: authUser.disabled
        });
    } catch (e) {
        console.error('[1. Firebase Auth User Error]:', e.message);
    }

    // 2. /users/{uid}
    const userDoc = await db.collection('users').doc(uid).get();
    console.log('\n[2. /users/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2]:', userDoc.exists ? JSON.stringify(userDoc.data(), null, 2) : 'NOT FOUND');

    // 3. /membership where uid == uid
    const memSnap = await db.collection('membership').where('uid', '==', uid).get();
    console.log(`\n[3. /membership where uid == '${uid}'] (${memSnap.size} found):`);
    memSnap.forEach(d => console.log(`  Membership ${d.id}:`, JSON.stringify(d.data(), null, 2)));

    // 4. /businesses for Fritoni
    console.log('\n[4. /businesses matching FRITONI or ownerUid]:');
    const bizSnap = await db.collection('businesses').get();
    const fritoniBiz = [];
    bizSnap.forEach(d => {
        const data = d.data();
        const str = (JSON.stringify(data) + ' ' + d.id).toLowerCase();
        if (str.includes('fritoni') || data.ownerUid === uid) {
            fritoniBiz.push({ id: d.id, ...data });
        }
    });
    console.log(JSON.stringify(fritoniBiz, null, 2));

    // 5. /branches for Fritoni
    console.log('\n[5. /branches matching FRITONI or related businessIds]:');
    const brSnap = await db.collection('branches').get();
    const fritoniBranches = [];
    brSnap.forEach(d => {
        const data = d.data();
        const str = (JSON.stringify(data) + ' ' + d.id).toLowerCase();
        if (str.includes('fritoni') || fritoniBiz.some(b => b.id === data.businessId)) {
            fritoniBranches.push({ id: d.id, ...data });
        }
    });
    console.log(JSON.stringify(fritoniBranches, null, 2));

    // 6. /organizations for Fritoni
    console.log('\n[6. /organizations matching FRITONI or ownerUid]:');
    const orgSnap = await db.collection('organizations').get();
    const fritoniOrgs = [];
    orgSnap.forEach(d => {
        const data = d.data();
        const str = (JSON.stringify(data) + ' ' + d.id).toLowerCase();
        if (str.includes('fritoni') || data.ownerUid === uid || fritoniBiz.some(b => b.orgId === d.id)) {
            fritoniOrgs.push({ id: d.id, ...data });
        }
    });
    console.log(JSON.stringify(fritoniOrgs, null, 2));
}

inspectFritoni().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
