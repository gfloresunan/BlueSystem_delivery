const { execSync } = require('child_process');
const fs = require('fs');

const token = execSync('gcloud auth print-access-token').toString().trim();
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function getAuthUserByEmail(email) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ email: [email] })
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) {
        const u = data.users[0];
        let customClaims = {};
        if (u.customAttributes) {
            try {
                customClaims = JSON.parse(u.customAttributes);
            } catch (e) {}
        }
        return {
            uid: u.localId,
            email: u.email || null,
            disabled: u.disabled || false,
            customClaims
        };
    }
    return null;
}

async function runAudit() {
    console.log('=== STEP 1 & 2 & 3: USER & AUTH AUDIT ===');
    const user = await getAuthUserByEmail('tecnostore@bluesystemdelivery.com');
    console.log('Auth User:', JSON.stringify(user, null, 2));

    if (!user) {
        console.log('User not found by email, searching in /users collection:');
        const uSnap = await db.collection('users').where('email', '==', 'tecnostore@bluesystemdelivery.com').get();
        uSnap.forEach(d => console.log('users doc:', d.id, d.data()));
    } else {
        console.log('\n--- Membership in Firestore ---');
        const memSnap = await db.collection('membership').where('uid', '==', user.uid).get();
        memSnap.forEach(d => console.log('membership doc:', d.id, d.data()));

        console.log('\n--- User doc in /users ---');
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            console.log('/users/' + user.uid + ':', userDoc.data());
        }

        console.log('\n--- Business doc in /businesses ---');
        const bizId = user.customClaims.businessId;
        if (bizId) {
            const bizDoc = await db.collection('businesses').doc(bizId).get();
            console.log('/businesses/' + bizId + ':', bizDoc.exists ? bizDoc.data() : 'NOT FOUND');
        }
    }

    console.log('\n=== EXISTING CATEGORIES IN /categories ===');
    const catSnap = await db.collection('categories').limit(15).get();
    console.log('Total categories sample:', catSnap.size);
    catSnap.forEach(d => {
        console.log('Cat ID:', d.id, 'Data:', d.data());
    });
}

runAudit().catch(console.error);
