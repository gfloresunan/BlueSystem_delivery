const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken } = require('firebase/auth');
const { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } = require('firebase/firestore');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

const clientApp = initializeApp(firebaseConfig, 'clientTestApp');
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

async function runReproduction() {
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('REPRODUCING INCIDENT: BSD-MERCHANT-CATEGORY-CREATE-PERMISSION');
    console.log('══════════════════════════════════════════════════════════════════');

    const uid = '04JAKPrmXjg7s2CDiT3kUPOhBwn2';
    // Create custom token with the exact user claims
    const customClaims = {
        role: 'OWNER',
        businessId: 'biz_canonical_tecnostore',
        branchId: 'br_canonical_tecnostore_main',
        orgId: 'org_1787895553815',
        tenantId: 'ten_bluesystem_core'
    };

    console.log('[STEP 1] Generating Custom Token with user claims:');
    console.log('Claims:', JSON.stringify(customClaims, null, 2));
    const customToken = await admin.auth().createCustomToken(uid, customClaims);

    console.log('\n[STEP 2] Signing in Client SDK as Merchant Owner:');
    const userCred = await signInWithCustomToken(clientAuth, customToken);
    const tokenResult = await userCred.user.getIdTokenResult();
    console.log('Signed in UID:', userCred.user.uid);
    console.log('Decoded Token Claims in JWT:', JSON.stringify(tokenResult.claims, null, 2));

    console.log('\n[STEP 3] Attempting exact CatalogModule.tsx Category Creation Payload:');
    const exactCatalogModulePayload = {
        name: 'PC',
        description: 'Equipos de Escritorio',
        active: true,
        orderIndex: 2,
        businessId: 'biz_canonical_tecnostore',
        branchId: 'br_canonical_tecnostore_main',
        type: 'MERCHANT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    console.log('Payload:', exactCatalogModulePayload);

    try {
        const docRef = await addDoc(collection(clientDb, 'categories'), exactCatalogModulePayload);
        console.log('🔴 UNEXPECTED SUCCESS: Document created with ID:', docRef.id);
    } catch (err) {
        console.log('🟢 EXPECTED REPRODUCTION OF PERMISSION DENIED:');
        console.log('Error Code:', err.code);
        console.log('Error Message:', err.message);
    }

    console.log('\n[STEP 4] Testing Hypothesis: Is `type` the failing predicate?');

    // Test 4A: Without `type` (or type: 'BUSINESS' / type: 'SUBCATEGORY')
    const payloadSubcategory = {
        name: 'PC',
        description: 'Equipos de Escritorio',
        active: true,
        orderIndex: 2,
        businessId: 'biz_canonical_tecnostore',
        branchId: 'br_canonical_tecnostore_main',
        type: 'SUBCATEGORY',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    console.log('--- Test 4A: payload with type: "SUBCATEGORY" ---');
    try {
        const docRefA = await addDoc(collection(clientDb, 'categories'), payloadSubcategory);
        console.log('Result: SUCCESS! ID =', docRefA.id);
        // Clean up test doc
        await deleteDoc(doc(clientDb, 'categories', docRefA.id));
        console.log('Cleaned up test doc:', docRefA.id);
    } catch (err) {
        console.log('Result: FAILED ->', err.code, err.message);
    }

    const payloadBusiness = {
        name: 'PC',
        description: 'Equipos de Escritorio',
        active: true,
        orderIndex: 2,
        businessId: 'biz_canonical_tecnostore',
        branchId: 'br_canonical_tecnostore_main',
        type: 'BUSINESS',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    console.log('--- Test 4B: payload with type: "BUSINESS" ---');
    try {
        const docRefB = await addDoc(collection(clientDb, 'categories'), payloadBusiness);
        console.log('Result: SUCCESS! ID =', docRefB.id);
        // Clean up test doc
        await deleteDoc(doc(clientDb, 'categories', docRefB.id));
        console.log('Cleaned up test doc:', docRefB.id);
    } catch (err) {
        console.log('Result: FAILED ->', err.code, err.message);
    }

    // Test 4C: Cross-business attempt (Business A creating category for Business B)
    console.log('--- Test 4C: Security Cross-Business check (businessId: "biz_other") ---');
    const crossBusinessPayload = {
        name: 'PC Intruder',
        description: 'Equipos de Escritorio',
        active: true,
        orderIndex: 2,
        businessId: 'biz_other_comercio',
        branchId: 'br_other',
        type: 'SUBCATEGORY',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    try {
        const docRefC = await addDoc(collection(clientDb, 'categories'), crossBusinessPayload);
        console.log('🔴 SECURITY VULNERABILITY: Cross-business create succeeded! ID =', docRefC.id);
    } catch (err) {
        console.log('🟢 SECURITY PASS: Cross-business blocked as expected ->', err.code);
    }
}

runReproduction().catch(console.error);
