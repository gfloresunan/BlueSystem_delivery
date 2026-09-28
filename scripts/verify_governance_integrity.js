const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function verifyIntegrity() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       GOVERNANCE CENTER INTEGRITY & RELATIONSHIP CERTIFICATION SUITE           ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const [bizSnap, brSnap, appSnap, orgSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('merchant_applications').get(),
        db.collection('organizations').get()
    ]);

    const orgMap = new Map();
    orgSnap.forEach(doc => orgMap.set(doc.id, doc.data()));

    const bizMap = new Map();
    bizSnap.forEach(doc => bizMap.set(doc.id, doc.data()));

    const branchMap = new Map();
    brSnap.forEach(doc => branchMap.set(doc.id, doc.data()));

    const appMap = new Map();
    appSnap.forEach(doc => appMap.set(doc.id, doc.data()));

    let errors = [];
    let assertionsCount = 0;

    function assert(condition, message) {
        assertionsCount++;
        if (!condition) {
            errors.push(message);
            console.log(` 🔴 FAIL: ${message}`);
        } else {
            console.log(` 🟢 PASS: ${message}`);
        }
    }

    console.log("1. VALIDANDO CLIENTES Y COMERCIOS DE GOBERNANZA (/businesses)...");
    bizSnap.forEach(doc => {
        const b = doc.data();
        if (b.status === 'DELETED' || b.lifecycleStatus === 'DELETED') return; // Skip deleted

        assert(doc.id != null && doc.id !== '', `Business ID de [${doc.id}] es válido`);
        assert(b.name != null && b.name !== '' && b.name !== 'undefined', `Business [${doc.id}] tiene name canónico válido: "${b.name}"`);
        assert(b.orgId != null && b.orgId !== '' && b.orgId !== 'undefined', `Business [${doc.id}] tiene orgId válido: "${b.orgId}"`);
        assert(b.source === 'ADR_011' || b.source === 'DIRECT_ADMIN', `Business [${doc.id}] tiene fuente válida: "${b.source}"`);
        assert(orgMap.has(b.orgId) || b.orgId === 'org_default_bluesystem', `Business [${doc.id}] orgId "${b.orgId}" existe en /organizations`);
    });

    console.log("\n2. VALIDANDO SUCURSALES Y COBERTURA GPS (/branches)...");
    brSnap.forEach(doc => {
        const br = doc.data();
        if (br.status === 'DELETED' || br.active === false) return; // Skip deleted

        assert(doc.id != null && doc.id !== '', `Branch ID de [${doc.id}] es válido`);
        assert(br.name != null && br.name !== '' && br.name !== 'undefined', `Branch [${doc.id}] tiene name canónico válido: "${br.name}"`);
        assert(br.businessId != null && br.businessId !== '' && br.businessId !== 'undefined', `Branch [${doc.id}] tiene businessId válido: "${br.businessId}"`);
        assert(br.orgId != null && br.orgId !== '' && br.orgId !== 'undefined', `Branch [${doc.id}] tiene orgId válido: "${br.orgId}"`);
        assert(bizMap.has(br.businessId), `Branch [${doc.id}] businessId "${br.businessId}" existe en /businesses`);
    });

    console.log("\n3. VALIDANDO VÍNCULOS DE SOLICITUDES ADR-011 (/merchant_applications)...");
    appSnap.forEach(doc => {
        const app = doc.data();
        if (app.status === 'ONBOARDING' || app.status === 'APPROVED') {
            assert(app.businessId != null && app.businessId !== '', `Solicitud [${doc.id}] tiene businessId vinculado: "${app.businessId}"`);
            assert(app.organizationId != null && app.organizationId !== '', `Solicitud [${doc.id}] tiene organizationId vinculado: "${app.organizationId}"`);
            assert(app.branchId != null && app.branchId !== '', `Solicitud [${doc.id}] tiene branchId vinculado: "${app.branchId}"`);

            if (app.businessId) assert(bizMap.has(app.businessId), `Solicitud [${doc.id}] businessId "${app.businessId}" existe en /businesses`);
            if (app.branchId) assert(branchMap.has(app.branchId), `Solicitud [${doc.id}] branchId "${app.branchId}" existe en /branches`);
        }
    });

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log(`  RESUMEN DE VERIFICACIÓN: ${assertionsCount - errors.length} / ${assertionsCount} PRUEBAS PASADAS`);
    console.log("═══════════════════════════════════════════════════════════════════════════════");

    if (errors.length > 0) {
        console.error(`\n❌ SE ENCONTRARON ${errors.length} ERRORES DE INTEGRIDAD REFERENCIAL.`);
        process.exit(1);
    } else {
        console.log("\n✅ CERTIFICACIÓN EXITOSA DE MODELO DE DATOS Y GOBERNANZA ENTERPRISE V2.2.");
        process.exit(0);
    }
}

verifyIntegrity().catch(err => {
    console.error("Error en suite de integridad:", err);
    process.exit(1);
});
