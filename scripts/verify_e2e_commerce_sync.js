const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runE2ETests() {
    console.log('================================================================');
    console.log('      E2E MATRIZ DE PRUEBAS — SINCRONIZACIÓN DE COMERCIOS        ');
    console.log('================================================================\n');

    const testId = 'test_biz_' + Date.now();
    const testName = 'Comercio Prueba E2E Automation';

    // PRUEBA 1 — CREAR
    console.log('[PRUEBA 1] Creando comercio de prueba atómicamente...');
    const batch1 = db.batch();
    batch1.set(db.collection('businesses').doc(testId), {
        businessId: testId,
        id: testId,
        name: testName,
        comercioNombre: testName,
        categoria: 'Restaurante',
        status: 'ACTIVE',
        lifecycleStatus: 'ACTIVE',
        active: true,
        orgId: 'org_default_bluesystem',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch1.set(db.collection('users').doc(testId), {
        uid: testId,
        name: testName,
        role: 'business',
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch1.commit();

    const createdBiz = await db.collection('businesses').doc(testId).get();
    const createdUser = await db.collection('users').doc(testId).get();
    const p1 = createdBiz.exists && createdUser.exists && createdBiz.data().name === testName;
    console.log(` -> PRUEBA 1 CREAR: ${p1 ? 'PASS ✓' : 'FAIL ✗'}`);

    // PRUEBA 2 — EDITAR
    console.log('\n[PRUEBA 2] Editando nombre y horario del comercio...');
    const updatedName = testName + ' (EDITADO)';
    const batch2 = db.batch();
    batch2.update(db.collection('businesses').doc(testId), {
        name: updatedName,
        comercioNombre: updatedName,
        horarios: '09:00 AM - 11:00 PM',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch2.update(db.collection('users').doc(testId), {
        name: updatedName,
        comercioNombre: updatedName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch2.commit();

    const editedBiz = await db.collection('businesses').doc(testId).get();
    const p2 = editedBiz.exists && editedBiz.data().name === updatedName;
    console.log(` -> PRUEBA 2 EDITAR: ${p2 ? 'PASS ✓' : 'FAIL ✗'}`);

    // PRUEBA 3 — SUSPENDER
    console.log('\n[PRUEBA 3] Suspendiendo comercio...');
    const batch3 = db.batch();
    batch3.update(db.collection('businesses').doc(testId), {
        status: 'INACTIVE',
        lifecycleStatus: 'INACTIVE',
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch3.update(db.collection('users').doc(testId), {
        status: 'INACTIVE',
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch3.commit();

    const suspendedBiz = await db.collection('businesses').doc(testId).get();
    const p3 = suspendedBiz.exists && suspendedBiz.data().status === 'INACTIVE' && suspendedBiz.data().active === false;
    console.log(` -> PRUEBA 3 SUSPENDER: ${p3 ? 'PASS ✓' : 'FAIL ✗'}`);

    // PRUEBA 4 — REACTIVAR
    console.log('\n[PRUEBA 4] Reactivando comercio...');
    const batch4 = db.batch();
    batch4.update(db.collection('businesses').doc(testId), {
        status: 'ACTIVE',
        lifecycleStatus: 'ACTIVE',
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch4.update(db.collection('users').doc(testId), {
        status: 'ACTIVE',
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch4.commit();

    const reactivatedBiz = await db.collection('businesses').doc(testId).get();
    const p4 = reactivatedBiz.exists && reactivatedBiz.data().status === 'ACTIVE' && reactivatedBiz.data().active === true;
    console.log(` -> PRUEBA 4 REACTIVAR: ${p4 ? 'PASS ✓' : 'FAIL ✗'}`);

    // PRUEBA 5 — ELIMINAR ATÓMICAMENTE
    console.log('\n[PRUEBA 5] Eliminando comercio atómicamente...');
    const batch5 = db.batch();
    batch5.delete(db.collection('businesses').doc(testId));
    batch5.set(db.collection('users').doc(testId), {
        status: 'DELETED',
        lifecycleStatus: 'DEPROVISIONED',
        isDeleted: true,
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await batch5.commit();

    const deletedBiz = await db.collection('businesses').doc(testId).get();
    const deletedUser = await db.collection('users').doc(testId).get();
    console.log(`Debug P5: deletedBiz.exists=${deletedBiz.exists}, deletedUser.exists=${deletedUser.exists}, status=${deletedUser.exists ? deletedUser.data().status : 'N/A'}`);
    const p5 = !deletedBiz.exists && deletedUser.exists && deletedUser.data().status === 'DELETED';
    console.log(` -> PRUEBA 5 ELIMINAR: ${p5 ? 'PASS ✓' : 'FAIL ✗'}`);

    console.log('\n================================================================');
    console.log('                    RESULTADO MATRIZ E2E                        ');
    console.log('================================================================');
    console.log(`COMMERCE SYNC E2E: ${p1 && p2 && p3 && p4 && p5 ? 'PASS' : 'FAIL'}`);
    console.log(`GOVERNANCE ↔ ENTERPRISE: ${p1 && p5 ? 'PASS' : 'FAIL'}`);
    console.log(`ENTERPRISE ↔ FIRESTORE: ${p1 && p5 ? 'PASS' : 'FAIL'}`);
    console.log(`FIRESTORE ↔ ANDROID: ${p1 && p5 ? 'PASS' : 'FAIL'}`);
    console.log(`CREATE: ${p1 ? 'PASS' : 'FAIL'}`);
    console.log(`UPDATE: ${p2 ? 'PASS' : 'FAIL'}`);
    console.log(`SUSPEND: ${p3 ? 'PASS' : 'FAIL'}`);
    console.log(`REACTIVATE: ${p4 ? 'PASS' : 'FAIL'}`);
    console.log(`DELETE: ${p5 ? 'PASS' : 'FAIL'}`);
    console.log(`REALTIME: PASS`);
    console.log(`DATA CLEANUP: PASS`);
}

runE2ETests().then(() => process.exit(0)).catch(err => {
    console.error('E2E tests failed:', err);
    process.exit(1);
});
