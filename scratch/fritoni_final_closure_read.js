const { execSync } = require('child_process');
const fs = require('fs');

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const uid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
const businessId = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
const branchId = 'br_1786988052589';

async function fetchSnapshot() {
    console.log('=== READING FRITONI DATA SNAPSHOT (READ-ONLY) ===');
    const snapshot = {
        timestamp: new Date().toISOString(),
        targetUid: uid,
        targetBusinessId: businessId,
        targetBranchId: branchId,
        auth: null,
        userDoc: null,
        businessDoc: null,
        branchDoc: null,
        restaurantSettingsDoc: null,
        memberships: [],
        categories: [],
        products: [],
        auditEvents: []
    };

    // 1. Auth User & Claims
    try {
        const authUser = await admin.auth().getUser(uid);
        snapshot.auth = {
            uid: authUser.uid,
            email: authUser.email,
            emailVerified: authUser.emailVerified,
            disabled: authUser.disabled,
            customClaims: authUser.customClaims || {}
        };
    } catch (e) {
        snapshot.auth = { error: e.message };
    }

    // 2. /users/{uid}
    try {
        const uDoc = await db.collection('users').doc(uid).get();
        snapshot.userDoc = uDoc.exists ? uDoc.data() : null;
    } catch (e) {
        snapshot.userDoc = { error: e.message };
    }

    // 3. /businesses/{businessId}
    try {
        const bDoc = await db.collection('businesses').doc(businessId).get();
        snapshot.businessDoc = bDoc.exists ? bDoc.data() : null;
    } catch (e) {
        snapshot.businessDoc = { error: e.message };
    }

    // 4. /branches/{branchId}
    try {
        const brDoc = await db.collection('branches').doc(branchId).get();
        snapshot.branchDoc = brDoc.exists ? brDoc.data() : null;
    } catch (e) {
        snapshot.branchDoc = { error: e.message };
    }

    // 5. /restaurant_settings/{businessId}
    try {
        const rsDoc = await db.collection('restaurant_settings').doc(businessId).get();
        snapshot.restaurantSettingsDoc = rsDoc.exists ? rsDoc.data() : null;
    } catch (e) {
        snapshot.restaurantSettingsDoc = { error: e.message };
    }

    // 6. /membership
    try {
        const memSnap = await db.collection('membership').where('businessId', '==', businessId).get();
        memSnap.forEach(d => snapshot.memberships.push({ id: d.id, ...d.data() }));
    } catch (e) {
        snapshot.memberships = [{ error: e.message }];
    }

    // 7. /categories
    try {
        const catSnap = await db.collection('categories').where('businessId', '==', businessId).get();
        catSnap.forEach(d => snapshot.categories.push({ id: d.id, ...d.data() }));
    } catch (e) {
        snapshot.categories = [{ error: e.message }];
    }

    // 8. /products
    try {
        const prodSnap = await db.collection('products').where('businessId', '==', businessId).get();
        prodSnap.forEach(d => snapshot.products.push({ id: d.id, ...d.data() }));
    } catch (e) {
        snapshot.products = [{ error: e.message }];
    }

    // 9. /audit_events
    try {
        const auditSnap = await db.collection('audit_events').where('businessId', '==', businessId).get();
        auditSnap.forEach(d => snapshot.auditEvents.push({ id: d.id, ...d.data() }));
    } catch (e) {
        snapshot.auditEvents = [{ error: e.message }];
    }

    fs.writeFileSync('scratch/fritoni_snapshot.json', JSON.stringify(snapshot, null, 2));
    console.log('Saved snapshot to scratch/fritoni_snapshot.json');
}

fetchSnapshot().catch(err => {
    console.error('Snapshot failed:', err);
    process.exit(1);
});
