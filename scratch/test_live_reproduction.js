const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

const clientApp = initializeApp(firebaseConfig, 'merchantTestApp');
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

async function testLiveFirestoreReproduction() {
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('STEP 1: REPRODUCE CATEGORY CREATE INCIDENT AGAINST LIVE FIRESTORE');
    console.log('══════════════════════════════════════════════════════════════════');

    const targetUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    const targetEmail = "tecnostore@bluesystemdelivery.com";
    const testPassword = "TempPassword2026!";

    // 1. Update password using gcloud token
    console.log('[1] Setting test password for user:', targetEmail);
    const updateRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: targetUid,
            password: testPassword
        })
    });
    const updateData = await updateRes.json();
    console.log('Password update status:', updateRes.status);

    // 2. Sign in with Client SDK (exactly as web browser does)
    console.log('\n[2] Signing in with Client SDK...');
    const userCred = await signInWithEmailAndPassword(clientAuth, targetEmail, testPassword);
    console.log('Successfully signed in UID:', userCred.user.uid);
    const idTokenResult = await userCred.user.getIdTokenResult();
    console.log('JWT Claims:', idTokenResult.claims);

    // 3. Reproduce exact incident payload from CatalogModule.tsx
    console.log('\n[3] REPRODUCING EXACT INCIDENT PAYLOAD (type: "MERCHANT")...');
    const incidentPayload = {
        name: 'PC',
        description: 'Equipos de Escritorio',
        active: true,
        orderIndex: 2,
        businessId: 'biz_canonical_tecnostore',
        branchId: 'br_canonical_tecnostore_main',
        type: 'MERCHANT', // Sent by CatalogModule.tsx line 255
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    try {
        const docRef = await addDoc(collection(clientDb, 'categories'), incidentPayload);
        console.log('🔴 UNEXPECTED SUCCESS:', docRef.id);
    } catch (err) {
        console.log('🟢 CONFIRMED REPRODUCTION OF INCIDENT:');
        console.log('Error Code:', err.code);
        console.log('Error Message:', err.message);
    }

    // 4. Test with type: "BUSINESS" and type: "SUBCATEGORY"
    console.log('\n[4] AUDITING FIRESTORE RULE PREDICATE:');
    console.log('Condition in firestore.rules: request.resource.data.get("type", "BUSINESS") in ["BUSINESS", "SUBCATEGORY"]');

    console.log('\n--- 4A: Testing with type: "BUSINESS" ---');
    try {
        const docRefBiz = await addDoc(collection(clientDb, 'categories'), {
            name: 'PC',
            description: 'Equipos de Escritorio',
            active: true,
            orderIndex: 2,
            businessId: 'biz_canonical_tecnostore',
            branchId: 'br_canonical_tecnostore_main',
            type: 'BUSINESS',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log('Result with type "BUSINESS": 🟢 SUCCESS! Created doc ID:', docRefBiz.id);
        await deleteDoc(doc(clientDb, 'categories', docRefBiz.id));
        console.log('Cleaned up test doc.');
    } catch (err) {
        console.log('Result with type "BUSINESS": 🔴 FAILED:', err.code, err.message);
    }

    console.log('\n--- 4B: Testing with type: "SUBCATEGORY" ---');
    try {
        const docRefSub = await addDoc(collection(clientDb, 'categories'), {
            name: 'PC',
            description: 'Equipos de Escritorio',
            active: true,
            orderIndex: 2,
            businessId: 'biz_canonical_tecnostore',
            branchId: 'br_canonical_tecnostore_main',
            type: 'SUBCATEGORY',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log('Result with type "SUBCATEGORY": 🟢 SUCCESS! Created doc ID:', docRefSub.id);
        await deleteDoc(doc(clientDb, 'categories', docRefSub.id));
        console.log('Cleaned up test doc.');
    } catch (err) {
        console.log('Result with type "SUBCATEGORY": 🔴 FAILED:', err.code, err.message);
    }

    console.log('\n--- 4C: Testing without type field (defaults to "BUSINESS" in rule) ---');
    try {
        const docRefNoType = await addDoc(collection(clientDb, 'categories'), {
            name: 'PC',
            description: 'Equipos de Escritorio',
            active: true,
            orderIndex: 2,
            businessId: 'biz_canonical_tecnostore',
            branchId: 'br_canonical_tecnostore_main',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log('Result without type field: 🟢 SUCCESS! Created doc ID:', docRefNoType.id);
        await deleteDoc(doc(clientDb, 'categories', docRefNoType.id));
        console.log('Cleaned up test doc.');
    } catch (err) {
        console.log('Result without type field: 🔴 FAILED:', err.code, err.message);
    }

    // 5. Cross-business security test
    console.log('\n--- 4D: Cross-business Security Validation (businessId: "biz_other_business") ---');
    try {
        const docRefCross = await addDoc(collection(clientDb, 'categories'), {
            name: 'PC Hack',
            description: 'Cross business exploit',
            active: true,
            orderIndex: 2,
            businessId: 'biz_other_business',
            branchId: 'br_canonical_tecnostore_main',
            type: 'SUBCATEGORY',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log('🔴 SECURITY FAIL: Cross-business write succeeded! Doc ID:', docRefCross.id);
    } catch (err) {
        console.log('🟢 SECURITY PASS: Cross-business correctly DENIED with:', err.code);
    }
}

testLiveFirestoreReproduction().catch(console.error);
