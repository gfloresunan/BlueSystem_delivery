const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, updateDoc, runTransaction, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

const courierApp = initializeApp(firebaseConfig, 'courierForensicApp');
const courierAuth = getAuth(courierApp);
const courierDb = getFirestore(courierApp);

async function testLiveClaim() {
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('STEP 2: TESTING LIVE COURIER AUTH & TRANSACTION STEPS');
    console.log('══════════════════════════════════════════════════════════════════\n');

    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const targetEmail = "hpaz@gmail.com";
    const testPassword = "TempPassword2026!";

    // 1. Set temporary password using gcloud token
    console.log('[1] Setting test password for courier user:', targetEmail);
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
    console.log('Password update HTTP status:', updateRes.status);

    // 2. Sign in as Courier using Firebase Client SDK
    console.log('\n[2] Signing in as Courier with Firebase Client SDK...');
    const userCred = await signInWithEmailAndPassword(courierAuth, targetEmail, testPassword);
    console.log('Authenticated Courier UID:', userCred.user.uid);
    const idTokenResult = await userCred.user.getIdTokenResult(true);
    console.log('JWT Custom Claims:', JSON.stringify(idTokenResult.claims, null, 2));

    // 3. Isolated step-by-step reads
    console.log('\n[3] ISOLATED TRANSACTION READ TESTS:');

    // READ 1: /courier_balances/{uid}
    try {
        console.log('Testing READ #1: /courier_balances/' + targetUid);
        const balSnap = await getDoc(doc(courierDb, 'courier_balances', targetUid));
        console.log('  -> READ #1 Result: ✅ SUCCESS! Exists:', balSnap.exists(), balSnap.data());
    } catch (e) {
        console.log('  -> READ #1 Result: ❌ FAILED:', e.code, e.message);
    }

    // READ 2: /users/{uid}
    try {
        console.log('Testing READ #2: /users/' + targetUid);
        const userSnap = await getDoc(doc(courierDb, 'users', targetUid));
        console.log('  -> READ #2 Result: ✅ SUCCESS! Exists:', userSnap.exists(), userSnap.data());
    } catch (e) {
        console.log('  -> READ #2 Result: ❌ FAILED:', e.code, e.message);
    }

    // READ 3: /couriers/{uid}
    try {
        console.log('Testing READ #3: /couriers/' + targetUid);
        const cSnap = await getDoc(doc(courierDb, 'couriers', targetUid));
        console.log('  -> READ #3 Result: ✅ SUCCESS! Exists:', cSnap.exists(), cSnap.data());
    } catch (e) {
        console.log('  -> READ #3 Result: ❌ FAILED:', e.code, e.message);
    }

    // READ 4: /orders/BS2KwLtLRKQAwUALZMEE (Target READY order)
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";
    try {
        console.log('Testing READ #4: /orders/' + testOrderId);
        const oSnap = await getDoc(doc(courierDb, 'orders', testOrderId));
        console.log('  -> READ #4 Result: ✅ SUCCESS! Exists:', oSnap.exists(), oSnap.data());
    } catch (e) {
        console.log('  -> READ #4 Result: ❌ FAILED:', e.code, e.message);
    }

    // 4. Test atomic update (Dry run transaction)
    console.log('\n[4] TESTING FULL TRANSACTION (aceptarPedido simulation)...');
    try {
        await runTransaction(courierDb, async (transaction) => {
            const bRef = doc(courierDb, 'courier_balances', targetUid);
            const uRef = doc(courierDb, 'users', targetUid);
            const cRef = doc(courierDb, 'couriers', targetUid);
            const oRef = doc(courierDb, 'orders', testOrderId);

            const bSnap = await transaction.get(bRef);
            console.log('  Txn Step 1 (balance): exists=', bSnap.exists());

            const uSnap = await transaction.get(uRef);
            console.log('  Txn Step 2 (user): exists=', uSnap.exists());

            const cSnap = await transaction.get(cRef);
            console.log('  Txn Step 3 (courier): exists=', cSnap.exists());

            const oSnap = await transaction.get(oRef);
            console.log('  Txn Step 4 (order): exists=', oSnap.exists());

            const updatePayload = {
                status: "courier_accepted",
                estado: "aceptado_por_courier",
                courierPhase: 1,
                assignedCourierId: targetUid,
                motorizadoId: targetUid,
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            console.log('  Txn Step 5 (update payload):', updatePayload);
            transaction.update(oRef, updatePayload);
        });
        console.log('🟢 TRANSACTION COMPLETED SUCCESSFULLY!');
    } catch (e) {
        console.log('🔴 TRANSACTION FAILED:');
        console.log('  Code:', e.code);
        console.log('  Message:', e.message);
    }
}

testLiveClaim().catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});
