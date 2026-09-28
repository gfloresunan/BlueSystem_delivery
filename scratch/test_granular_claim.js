const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, updateDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

const courierApp = initializeApp(firebaseConfig, 'granularClaimApp');
const courierAuth = getAuth(courierApp);
const courierDb = getFirestore(courierApp);

async function runGranularTests() {
    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const targetEmail = "hpaz@gmail.com";
    const testPassword = "TempPassword2026!";
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";

    console.log('[1] Signing in...');
    await signInWithEmailAndPassword(courierAuth, targetEmail, testPassword);
    console.log('✅ Authenticated as', targetUid);

    const orderRef = doc(courierDb, 'orders', testOrderId);
    const snap = await getDoc(orderRef);
    console.log('Order current state:', {
        status: snap.data().status,
        estado: snap.data().estado,
        assignedCourierId: snap.data().assignedCourierId,
        motorizadoId: snap.data().motorizadoId,
        serviceType: snap.data().serviceType
    });

    const testPayloads = [
        { name: '1. Only assignedCourierId', payload: { assignedCourierId: targetUid } },
        { name: '2. Only motorizadoId', payload: { motorizadoId: targetUid } },
        { name: '3. Both assignedCourierId & motorizadoId', payload: { assignedCourierId: targetUid, motorizadoId: targetUid } },
        { name: '4. Status courier_accepted + assignedCourierId + motorizadoId', payload: { status: 'courier_accepted', estado: 'aceptado_por_courier', assignedCourierId: targetUid, motorizadoId: targetUid } },
        { name: '5. Phase 1 + timestamps', payload: { status: 'courier_accepted', estado: 'aceptado_por_courier', courierPhase: 1, assignedCourierId: targetUid, motorizadoId: targetUid, acceptedAt: serverTimestamp(), updatedAt: serverTimestamp() } },
    ];

    for (const test of testPayloads) {
        console.log(`\n--- Testing ${test.name} ---`);
        try {
            await updateDoc(orderRef, test.payload);
            console.log(`✅ ${test.name} SUCCEEDED!`);
            break; // Stop after first success so we don't mess up state
        } catch (e) {
            console.log(`❌ ${test.name} FAILED: ${e.code} - ${e.message}`);
        }
    }
}

runGranularTests().catch(console.error);
