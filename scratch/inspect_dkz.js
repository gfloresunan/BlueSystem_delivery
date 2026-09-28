const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}
const db = admin.firestore();

async function inspectSecondUser() {
    const uid = 'dKZf5tyzpUMNPk1Wy92BQgp4aMF3';
    console.log(`=== INSPECTING FIRESTORE FOR UID: ${uid} (fritoni@gmail.com) ===\n`);

    const collections = [
        'users',
        'membership',
        'businesses',
        'organizations',
        'branches',
        'merchant_applications',
        'merchants',
        'commerce',
        'shops',
        'user_devices',
        'audit_events',
        'orders',
        'products'
    ];

    for (const colName of collections) {
        const colRef = db.collection(colName);
        const docSnap = await colRef.doc(uid).get();
        if (docSnap.exists) {
            console.log(`[${colName}] Direct Doc Exists (${uid}):`, JSON.stringify(docSnap.data(), null, 2));
        }

        const querySnap = await colRef.where('email', '==', 'fritoni@gmail.com').get();
        if (!querySnap.empty) {
            querySnap.forEach(d => {
                console.log(`[${colName}] Query by email (fritoni@gmail.com) Doc [${d.id}]:`, JSON.stringify(d.data(), null, 2));
            });
        }

        const querySnap2 = await colRef.where('uid', '==', uid).get();
        if (!querySnap2.empty) {
            querySnap2.forEach(d => {
                if (d.id !== uid) {
                    console.log(`[${colName}] Query by uid (${uid}) Doc [${d.id}]:`, JSON.stringify(d.data(), null, 2));
                }
            });
        }
    }

    // Check what /users/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2 has in field email
    const uDoc = await db.collection('users').doc('dlRY2ZVUqPR2Fxoc3cazcOxxRJg2').get();
    console.log('\n=== FIRESTORE /users/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2 email field ===');
    console.log('email in /users doc:', uDoc.data().email);
    console.log('assignedUsers in /users doc:', JSON.stringify(uDoc.data().assignedUsers, null, 2));

    // Check /businesses/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2
    const bDoc = await db.collection('businesses').doc('dlRY2ZVUqPR2Fxoc3cazcOxxRJg2').get();
    console.log('\n=== FIRESTORE /businesses/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2 email field ===');
    console.log('email in /businesses doc:', bDoc.data().email);

    // Check /membership
    const mSnap = await db.collection('membership').where('businessId', '==', 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2').get();
    console.log('\n=== FIRESTORE /membership for businessId ===');
    mSnap.forEach(d => {
        console.log(`membership doc [${d.id}]:`, JSON.stringify(d.data(), null, 2));
    });
}

inspectSecondUser().catch(console.error);
