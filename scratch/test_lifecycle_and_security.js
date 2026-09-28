const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

const clientApp = initializeApp(firebaseConfig, 'lifecycleTestApp');
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

async function runComprehensiveLifecycleTest() {
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('TEST SUITE: CATEGORY CRUD FULL LIFECYCLE & SECURITY VALIDATION');
    console.log('══════════════════════════════════════════════════════════════════');

    const targetEmail = "tecnostore@bluesystemdelivery.com";
    const testPassword = "TempPassword2026!";

    console.log('[1] Autenticando como Admin Tecnostore...');
    const userCred = await signInWithEmailAndPassword(clientAuth, targetEmail, testPassword);
    console.log('Autenticado UID:', userCred.user.uid);
    const idTokenResult = await userCred.user.getIdTokenResult();
    const activeBusinessId = idTokenResult.claims.businessId;
    const activeBranchId = idTokenResult.claims.branchId;
    console.log('Claims -> role:', idTokenResult.claims.role, 'businessId:', activeBusinessId, 'branchId:', activeBranchId);

    // ─── TEST CAT-PERM-001: CREATE ───
    console.log('\n--- TEST 1: CREATE CATEGORY "PC" (type: "SUBCATEGORY") ---');
    const newCategoryPayload = {
        name: 'PC',
        description: 'Equipos de Escritorio',
        active: true,
        orderIndex: 2,
        businessId: activeBusinessId,
        branchId: activeBranchId || null,
        type: 'SUBCATEGORY',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    let createdCatId = null;
    try {
        const docRef = await addDoc(collection(clientDb, 'categories'), newCategoryPayload);
        createdCatId = docRef.id;
        console.log('🟢 PASS [CREATE]: Categoría creada con ID:', createdCatId);
    } catch (err) {
        console.error('🔴 FAIL [CREATE]: Error creando categoría:', err.code, err.message);
        return;
    }

    // ─── TEST 2: READ / PERSISTENCE ───
    console.log('\n--- TEST 2: READ & PERSISTENCE VALIDATION ---');
    try {
        const docSnap = await getDoc(doc(clientDb, 'categories', createdCatId));
        if (docSnap.exists() && docSnap.data().name === 'PC' && docSnap.data().businessId === activeBusinessId) {
            console.log('🟢 PASS [READ & PERSISTENCE]: Categoría persiste correctamente en Firestore:');
            console.log('Datos:', docSnap.data());
        } else {
            console.error('🔴 FAIL [READ & PERSISTENCE]: Datos no coinciden:', docSnap.data());
        }
    } catch (err) {
        console.error('🔴 FAIL [READ & PERSISTENCE]:', err.code, err.message);
    }

    // ─── TEST 3: QUERY BY BUSINESSID ───
    console.log('\n--- TEST 3: QUERY LOCAL CATEGORIES ---');
    try {
        const qLocal = query(
            collection(clientDb, 'categories'),
            where('businessId', '==', activeBusinessId)
        );
        const snapLocal = await getDocs(qLocal);
        const found = snapLocal.docs.some(d => d.id === createdCatId);
        console.log(`Categorías encontradas para ${activeBusinessId}: ${snapLocal.size}`);
        if (found) {
            console.log('🟢 PASS [QUERY]: Categoría encontrada en la query local del comercio.');
        } else {
            console.error('🔴 FAIL [QUERY]: Categoría no encontrada en query local.');
        }
    } catch (err) {
        console.error('🔴 FAIL [QUERY]:', err.code, err.message);
    }

    // ─── TEST 4: UPDATE (PC -> Computadoras) ───
    console.log('\n--- TEST 4: UPDATE CATEGORY ("PC" -> "Computadoras") ---');
    try {
        await updateDoc(doc(clientDb, 'categories', createdCatId), {
            name: 'Computadoras',
            description: 'Equipos de Escritorio y Laptops',
            active: true,
            orderIndex: 2,
            updatedAt: serverTimestamp(),
        });
        const updatedSnap = await getDoc(doc(clientDb, 'categories', createdCatId));
        if (updatedSnap.data().name === 'Computadoras') {
            console.log('🟢 PASS [UPDATE]: Categoría actualizada exitosamente a "Computadoras".');
        } else {
            console.error('🔴 FAIL [UPDATE]: Nombre no actualizado:', updatedSnap.data());
        }
    } catch (err) {
        console.error('🔴 FAIL [UPDATE]: Error actualizando categoría:', err.code, err.message);
    }

    // ─── TEST 5: DELETE ───
    console.log('\n--- TEST 5: DELETE CATEGORY ---');
    try {
        await deleteDoc(doc(clientDb, 'categories', createdCatId));
        const deletedSnap = await getDoc(doc(clientDb, 'categories', createdCatId));
        if (!deletedSnap.exists()) {
            console.log('🟢 PASS [DELETE]: Categoría eliminada exitosamente.');
        } else {
            console.error('🔴 FAIL [DELETE]: Documento aún existe.');
        }
    } catch (err) {
        console.error('🔴 FAIL [DELETE]: Error eliminando categoría:', err.code, err.message);
    }

    // ─── TEST 6: CROSS-BUSINESS SECURITY (CREATE / UPDATE / DELETE ON OTHER BUSINESS) ───
    console.log('\n--- TEST 6: CROSS-BUSINESS ISOLATION SECURITY ---');
    
    // 6A: Create for other business
    console.log('6A: Intento de CREAR categoría para Business B ("biz_other_tenant")...');
    try {
        await addDoc(collection(clientDb, 'categories'), {
            name: 'Injected Category',
            description: 'Cross-tenant injection',
            active: true,
            orderIndex: 1,
            businessId: 'biz_other_tenant',
            type: 'SUBCATEGORY',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.error('🔴 FAIL [SECURITY]: Cross-business CREATE no fue bloqueado.');
    } catch (err) {
        console.log('🟢 PASS [SECURITY]: Cross-business CREATE bloqueado con:', err.code);
    }

    // 6B: Update existing category of other business (e.g. Fritanga NICA dlRY2ZVUqPR2Fxoc3cazcOxxRJg2)
    console.log('6B: Intento de ACTUALIZAR categoría de otro comercio ("5fnue8TC4iZlKoz33VTq")...');
    try {
        await updateDoc(doc(clientDb, 'categories', '5fnue8TC4iZlKoz33VTq'), {
            name: 'Hacked Name',
            updatedAt: serverTimestamp(),
        });
        console.error('🔴 FAIL [SECURITY]: Cross-business UPDATE no fue bloqueado.');
    } catch (err) {
        console.log('🟢 PASS [SECURITY]: Cross-business UPDATE bloqueado con:', err.code);
    }

    // 6C: Delete category of other business
    console.log('6C: Intento de ELIMINAR categoría de otro comercio ("5fnue8TC4iZlKoz33VTq")...');
    try {
        await deleteDoc(doc(clientDb, 'categories', '5fnue8TC4iZlKoz33VTq'));
        console.error('🔴 FAIL [SECURITY]: Cross-business DELETE no fue bloqueado.');
    } catch (err) {
        console.log('🟢 PASS [SECURITY]: Cross-business DELETE bloqueado con:', err.code);
    }

    console.log('\n══════════════════════════════════════════════════════════════════');
    console.log('ALL CRUD & SECURITY LIFECYCLE TESTS COMPLETE');
    console.log('══════════════════════════════════════════════════════════════════');
}

runComprehensiveLifecycleTest().catch(console.error);
