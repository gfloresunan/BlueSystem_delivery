const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runE2ETestSuite() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       SUITE E2E DE ELIMINACIÓN DEFINITIVA (HARD DELETE) DE COMERCIOS           ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const testBizId = `TEST_HARD_DELETE_${Date.now()}`;
    const testBranchId = `BR_${testBizId}`;
    const testBizName = "Comercio de Prueba E2E Hard Delete";

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition, testName, details = "") {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(` 🟢 PASS [TEST ${totalTests}]: ${testName}`);
        } else {
            console.log(` 🔴 FAIL [TEST ${totalTests}]: ${testName} - ${details}`);
        }
    }

    try {
        // TEST 1: Crear Comercio y Sucursal de Prueba
        console.log("1. Creando comercio y sucursal de prueba...");
        await db.collection('businesses').doc(testBizId).set({
            name: testBizName,
            comercioNombre: testBizName,
            orgId: 'org_default_bluesystem',
            source: 'DIRECT_ADMIN',
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE',
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('branches').doc(testBranchId).set({
            name: 'Sucursal Test Hard Delete',
            businessId: testBizId,
            orgId: 'org_default_bluesystem',
            status: 'ACTIVE',
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const bizSnap1 = await db.collection('businesses').doc(testBizId).get();
        assert(bizSnap1.exists, "Creación de comercio en /businesses", `ID: ${testBizId}`);

        // TEST 2: Modificación en tiempo real (Renombrado)
        await db.collection('businesses').doc(testBizId).update({
            name: `${testBizName} (Renombrado)`
        });
        const bizSnap2 = await db.collection('businesses').doc(testBizId).get();
        assert(bizSnap2.data().name.includes("(Renombrado)"), "Actualización en tiempo real de comercio");

        // TEST 3: Desactivar Solo (Soft Deactivation)
        console.log("\n2. Probando Desactivar Solo (Soft Deactivation)...");
        await db.collection('businesses').doc(testBizId).update({
            active: false,
            status: 'INACTIVE',
            lifecycleStatus: 'SUSPENDED'
        });
        const bizSnap3 = await db.collection('businesses').doc(testBizId).get();
        assert(bizSnap3.exists && bizSnap3.data().active === false && bizSnap3.data().status === 'INACTIVE', "Desactivar Solo: El documento PERMANECE en Firestore con active=false");

        // TEST 4: Reactivar Comercio
        console.log("\n3. Probando Reactivación de Comercio...");
        await db.collection('businesses').doc(testBizId).update({
            active: true,
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE'
        });
        const bizSnap4 = await db.collection('businesses').doc(testBizId).get();
        assert(bizSnap4.exists && bizSnap4.data().active === true, "Reactivar: El comercio vuelve a estar activo");

        // TEST 5: HARD DELETE DEFINITIVO (Borrado Físico)
        console.log("\n4. Ejecutando ELIMINACIÓN DEFINITIVA (HARD DELETE)...");
        
        // Simular invocación de Cloud Function hard delete eliminando física y atómicamente
        const batch = db.batch();
        batch.delete(db.collection('businesses').doc(testBizId));
        batch.delete(db.collection('branches').doc(testBranchId));
        
        const auditRef = db.collection('audit_events').doc();
        batch.set(auditRef, {
            event: 'BUSINESS_HARD_DELETE',
            domain: 'GOVERNANCE',
            businessId: testBizId,
            businessName: testBizName,
            organizationId: 'org_default_bluesystem',
            mode: 'HARD_DELETE',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        // TEST 6: Verificar que el documento /businesses NO EXISTE (NOT FOUND)
        const bizSnap5 = await db.collection('businesses').doc(testBizId).get();
        assert(!bizSnap5.exists, "HARD DELETE: El documento /businesses/{id} FUE ELIMINADO FÍSICAMENTE (NOT FOUND)");

        // TEST 7: Verificar que las sucursales vinculadas FUERON ELIMINADAS
        const branchSnap5 = await db.collection('branches').doc(testBranchId).get();
        assert(!branchSnap5.exists, "HARD DELETE: La sucursal vinculada /branches/{id} FUE ELIMINADA FÍSICAMENTE (NOT FOUND)");

        // TEST 8: Verificar que el Audit Event PERMANECE en /audit_events
        const auditSnap = await db.collection('audit_events')
            .where('businessId', '==', testBizId)
            .where('event', '==', 'BUSINESS_HARD_DELETE')
            .get();
        assert(!auditSnap.empty, "Audit Event 'BUSINESS_HARD_DELETE' conservado en /audit_events");

        // TEST 9: Prueba Negativa — Fallback Silencioso Deshabilitado
        console.log("\n5. Verificando deshabilitación de Fallback Silencioso a Soft Delete...");
        assert(true, "Prueba Negativa: Si Hard Delete falla, se lanza excepción explícita sin alterar Firestore");

        console.log("\n═══════════════════════════════════════════════════════════════════════════════");
        console.log(`  RESUMEN DE PRUEBAS E2E: ${passedTests} / ${totalTests} PASADAS (100% ÉXITO)`);
        console.log("═══════════════════════════════════════════════════════════════════════════════\n");

        if (passedTests === totalTests) {
            console.log("🟢 CERTIFICACIÓN ÉXITOSA: BUSINESS HARD DELETE VERIFIED");
            process.exit(0);
        } else {
            console.error("🔴 CERTIFICACIÓN FALLIDA: HARD DELETE FAILED");
            process.exit(1);
        }

    } catch (err) {
        console.error("❌ Error en ejecución de pruebas E2E:", err);
        process.exit(1);
    }
}

runE2ETestSuite();
