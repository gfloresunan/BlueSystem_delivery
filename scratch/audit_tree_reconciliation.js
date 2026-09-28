const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function fullForensicAudit() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("        AUDITORÍA FORENSE MATEMÁTICA Y TRAZABILIDAD EXACTA DE COLECCIONES       ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const [bizSnap, brSnap, memSnap, userSnap, orgSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('membership').get(),
        db.collection('users').get(),
        db.collection('organizations').get()
    ]);

    console.log("1. ANÁLISIS DE /businesses (Total actual: " + bizSnap.size + ")");
    const bizActive = [];
    const bizHistorical = [];
    bizSnap.forEach(doc => {
        const d = doc.data();
        const isDeprovisioned = d.status === 'DELETED' || d.lifecycleStatus === 'DEPROVISIONED';
        if (isDeprovisioned) {
            bizHistorical.push({ id: doc.id, name: d.name || d.comercioNombre, status: d.status, lifecycle: d.lifecycleStatus });
        } else {
            bizActive.push({ id: doc.id, name: d.name || d.comercioNombre, status: d.status, lifecycle: d.lifecycleStatus, ownerUid: d.ownerUid });
        }
    });
    console.log("   - Comercios Activos (" + bizActive.length + "):");
    bizActive.forEach(b => console.log(`     * [${b.id}] "${b.name}" (ownerUid: ${b.ownerUid})`));
    console.log("   - Comercios Históricos Desprovisionados (" + bizHistorical.length + "):");
    bizHistorical.forEach(b => console.log(`     * [${b.id}] "${b.name}" (status: ${b.status}, lifecycle: ${b.lifecycle})`));

    console.log("\n2. ANÁLISIS DE /branches (Total actual: " + brSnap.size + ")");
    brSnap.forEach(doc => {
        const d = doc.data();
        console.log(`   * [${doc.id}] "${d.name || d.branchName}" | businessId: ${d.businessId} | isPrimary: ${d.isPrimary}`);
    });

    console.log("\n3. ANÁLISIS DE /membership (Total actual: " + memSnap.size + ")");
    memSnap.forEach(doc => {
        const d = doc.data();
        console.log(`   * [${doc.id}] role: ${d.role} | status: ${d.status} | businessId: ${d.businessId} | uid: ${d.uid}`);
    });

    console.log("\n4. ANÁLISIS DE /users (Total actual: " + userSnap.size + ")");
    const usersByType = {};
    userSnap.forEach(doc => {
        const d = doc.data();
        const type = d.eiamRole || d.role || d.rol || d.userType || 'unspecified';
        usersByType[type] = (usersByType[type] || 0) + 1;
    });
    console.log("   - Desglose de usuarios por rol/tipo:", usersByType);

    console.log("\n5. ANÁLISIS DE /organizations (Total actual: " + orgSnap.size + ")");
    orgSnap.forEach(doc => {
        const d = doc.data();
        console.log(`   * [${doc.id}] "${d.name || d.legalName}" | ownerUid: ${d.ownerUid} | businesses: ${JSON.stringify(d.businessIds)}`);
    });

    console.log("\n6. RECONCILIACIÓN POR COMERCIO CANÓNICO:");
    for (const biz of bizActive) {
        console.log(`\n======================================================`);
        console.log(`EMPRESA: ${biz.name} (ID: ${biz.id})`);
        console.log(`======================================================`);
        
        // Branches
        const bizBranches = [];
        brSnap.forEach(doc => {
            if (doc.data().businessId === biz.id) {
                bizBranches.push({ id: doc.id, ...doc.data() });
            }
        });
        console.log(`Sucursales vinculadas en /branches (${bizBranches.length}):`);
        bizBranches.forEach(br => console.log(`  - [${br.id}] "${br.name || br.branchName}" (primary: ${br.isPrimary})`));
        if (bizBranches.length === 0) {
            console.log(`  ⚠️ ATENCIÓN: Este comercio no tiene documento en /branches (verificar si usa sucursal interna o legacy)`);
        }

        // Memberships
        const bizMemberships = [];
        memSnap.forEach(doc => {
            if (doc.data().businessId === biz.id) {
                bizMemberships.push({ id: doc.id, ...doc.data() });
            }
        });
        console.log(`Membresías vinculadas en /membership (${bizMemberships.length}):`);
        bizMemberships.forEach(m => console.log(`  - [${m.id}] role: ${m.role} | status: ${m.status} | uid: ${m.uid}`));

        // Owner User
        if (biz.ownerUid) {
            const ownerDoc = await db.collection('users').doc(biz.ownerUid).get();
            if (ownerDoc.exists) {
                const od = ownerDoc.data();
                console.log(`Propietario /users/${biz.ownerUid}: "${od.name || od.nombre}" (${od.email}) role: ${od.role}, eiamRole: ${od.eiamRole}`);
            } else {
                console.log(`⚠️ Propietario /users/${biz.ownerUid} NO existe en Firestore`);
            }
        } else {
            console.log(`⚠️ ownerUid no especificado en /businesses/${biz.id}`);
        }
    }
}

fullForensicAudit().catch(console.error);
