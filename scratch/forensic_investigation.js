const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runForensicAudit() {
    console.log('=== FORENSIC AUDIT START ===');

    // 1. Fetch all collections
    const [bizSnap, userSnap, memSnap, memsSnap, branchSnap, appSnap, orgSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('users').get(),
        db.collection('membership').get(),
        db.collection('memberships').get(),
        db.collection('branches').get(),
        db.collection('merchant_applications').get(),
        db.collection('organizations').get()
    ]);

    console.log(`Total businesses: ${bizSnap.size}`);
    console.log(`Total users: ${userSnap.size}`);
    console.log(`Total membership (legacy): ${memSnap.size}`);
    console.log(`Total memberships (v3): ${memsSnap.size}`);
    console.log(`Total branches: ${branchSnap.size}`);
    console.log(`Total merchant_applications: ${appSnap.size}`);
    console.log(`Total organizations: ${orgSnap.size}`);

    console.log('\n--- ALL BUSINESSES ---');
    bizSnap.forEach(doc => {
        const d = doc.data();
        console.log(`ID: ${doc.id} | Name: "${d.name || d.comercioNombre || d.nombre}" | status: ${d.status} | lifecycle: ${d.lifecycleStatus} | ownerUid: ${d.ownerUid} | email: ${d.email} | appId: ${d.applicationId}`);
    });

    console.log('\n--- TECNOSTORE / ADMIN TECNOSTORE MATCHES ---');
    console.log('--- in /businesses:');
    bizSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore')) {
            console.log(`[BUSINESS] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    console.log('\n--- in /users:');
    userSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore') || (d.email && d.email.includes('tecnostore'))) {
            console.log(`[USER] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    console.log('\n--- in /membership:');
    memSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore')) {
            console.log(`[MEMBERSHIP legacy] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    console.log('\n--- in /memberships:');
    memsSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore')) {
            console.log(`[MEMBERSHIPS v3] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    console.log('\n--- in /branches:');
    branchSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore')) {
            console.log(`[BRANCH] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    console.log('\n--- in /merchant_applications:');
    appSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore')) {
            console.log(`[APP] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    console.log('\n--- in /organizations:');
    orgSnap.forEach(doc => {
        const d = doc.data();
        const str = JSON.stringify(d).toLowerCase();
        if (str.includes('tecno') || str.includes('tecnostore')) {
            console.log(`[ORG] docId: ${doc.id}`, JSON.stringify(d, null, 2));
        }
    });

    // Check Firebase Auth
    try {
        console.log('\n--- FIREBASE AUTH USERS ---');
        const listUsers = await admin.auth().listUsers(1000);
        console.log(`Total Auth users: ${listUsers.users.length}`);
        listUsers.users.forEach(u => {
            if ((u.email && u.email.toLowerCase().includes('tecno')) || (u.displayName && u.displayName.toLowerCase().includes('tecno'))) {
                console.log(`[AUTH USER] uid: ${u.uid} | email: ${u.email} | name: ${u.displayName} | disabled: ${u.disabled} | claims:`, u.customClaims);
            }
        });
    } catch (authErr) {
        console.error('Error listing auth users:', authErr);
    }

    console.log('\n=== FORENSIC AUDIT END ===');
}

runForensicAudit().catch(console.error);
