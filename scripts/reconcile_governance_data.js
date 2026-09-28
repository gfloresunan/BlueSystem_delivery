const fs = require('fs');
const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');

if (!isDryRun && !isApply) {
    console.log("⚠️ Debes especificar --dry-run o --apply");
    console.log("Ejemplo: node scripts/reconcile_governance_data.js --dry-run");
    process.exit(1);
}

async function reconcileData() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log(`       GOVERNANCE RECONCILIATION ENGINE — MODE: ${isDryRun ? 'DRY RUN (READ ONLY)' : 'APPLY (MUTATING)'}`);
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const batch = db.batch();
    const stats = {
        businesses: { total: 0, adr011: 0, directAdmin: 0, deleted: 0, updateOps: [] },
        branches: { total: 0, valid: 0, orphan: 0, updateOps: [] },
        applications: { total: 0, onboarding: 0, rejected: 0, pending: 0, updateOps: [] },
        actions: { updateBusinesses: 0, updateBranches: 0, updateApplications: 0, archiveBranches: 0, archiveBusinesses: 0 }
    };

    // 1. Fetch collections
    const [bizSnap, brSnap, appSnap, orgSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('merchant_applications').get(),
        db.collection('organizations').get()
    ]);

    const orgIds = new Set();
    orgSnap.forEach(d => orgIds.add(d.id));
    if (!orgIds.has('org_default_bluesystem')) orgIds.add('org_default_bluesystem');

    // Mappings
    const appToBizMap = {
        'McIq7vqVMwDlcLiw4q36': { businessId: 'bbb760d5-a8f3-4700-9a96-f58f11f345ac', orgId: '1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8', branchId: '30945c9c-3aee-4e45-b35d-a998b57cf2fa' },
        'rkul8qqr6ljKyf8W7eXW': { businessId: 'e7dc911e-e587-4be9-a741-7d9d9828011f', orgId: '75b145e5-17ec-4248-a085-c962a408db86', branchId: '794f7c02-8077-40a8-b260-2fdd27a6f35d' }
    };

    // --- RECONCILE BUSINESSES ---
    stats.businesses.total = bizSnap.size;
    bizSnap.forEach(doc => {
        const b = doc.data();
        const docId = doc.id;

        // Canonical name resolution
        const canonicalName = b.name || b.comercioNombre || b.businessName || b.nombre || 'Comercio Sin Nombre';

        // Check if legacy DELETED
        const isDeleted = b.lifecycleStatus === 'DELETED' || canonicalName === 'Henry Paz' || b.active === false && !b.applicationId && canonicalName !== 'kimberly Flores' && canonicalName !== 'Kim';

        let source = b.source;
        if (!source) {
            source = (b.applicationId || docId === 'bbb760d5-a8f3-4700-9a96-f58f11f345ac' || docId === 'e7dc911e-e587-4be9-a741-7d9d9828011f') ? 'ADR_011' : 'DIRECT_ADMIN';
        }

        if (isDeleted) {
            stats.businesses.deleted++;
            stats.actions.archiveBusinesses++;
        } else if (source === 'ADR_011') {
            stats.businesses.adr011++;
        } else {
            stats.businesses.directAdmin++;
        }

        let targetOrgId = b.orgId;
        if (!targetOrgId || targetOrgId === 'undefined') {
            targetOrgId = 'org_default_bluesystem';
        }

        const updatePayload = {
            name: canonicalName, // Fuente Canónica
            orgId: targetOrgId,
            source: source,
            status: isDeleted ? 'DELETED' : (b.status || 'ACTIVE'),
            lifecycleStatus: isDeleted ? 'DELETED' : (b.lifecycleStatus || 'ACTIVE'),
            active: isDeleted ? false : (b.active !== false),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (b.applicationId) updatePayload.applicationId = b.applicationId;
        if (docId === 'bbb760d5-a8f3-4700-9a96-f58f11f345ac') updatePayload.applicationId = 'McIq7vqVMwDlcLiw4q36';
        if (docId === 'e7dc911e-e587-4be9-a741-7d9d9828011f') updatePayload.applicationId = 'rkul8qqr6ljKyf8W7eXW';

        stats.businesses.updateOps.push({ docId, payload: updatePayload, canonicalName });
        stats.actions.updateBusinesses++;

        if (isApply) {
            const ref = db.collection('businesses').doc(docId);
            batch.set(ref, updatePayload, { merge: true });
        }
    });

    // --- RECONCILE BRANCHES ---
    stats.branches.total = brSnap.size;
    brSnap.forEach(doc => {
        const br = doc.data();
        const docId = doc.id;

        const canonicalName = br.name || br.nombre || br.branchName || 'Sucursal Sin Nombre';
        let businessId = br.businessId;
        let orgId = br.orgId || 'org_default_bluesystem';

        // Fix missing businessId for known FRITONI branches
        if (docId === 'br_1786029236396' || docId === 'br_1786029268906') {
            businessId = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2'; // FRITONI business ID
        }

        const isOrphan = !businessId || businessId === 'undefined';

        if (isOrphan) {
            stats.branches.orphan++;
            stats.actions.archiveBranches++;
        } else {
            stats.branches.valid++;
        }

        const updatePayload = {
            name: canonicalName, // Fuente Canónica
            businessId: businessId || null,
            orgId: orgId,
            status: isOrphan ? 'DELETED' : (br.status || 'OPERATIONAL'),
            active: !isOrphan && (br.active !== false),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        stats.branches.updateOps.push({ docId, payload: updatePayload, canonicalName, isOrphan });
        stats.actions.updateBranches++;

        if (isApply) {
            const ref = db.collection('branches').doc(docId);
            batch.set(ref, updatePayload, { merge: true });
        }
    });

    // --- RECONCILE MERCHANT APPLICATIONS ---
    stats.applications.total = appSnap.size;
    appSnap.forEach(doc => {
        const app = doc.data();
        const docId = doc.id;

        if (app.status === 'ONBOARDING' || app.status === 'APPROVED') stats.applications.onboarding++;
        else if (app.status === 'REJECTED') stats.applications.rejected++;
        else stats.applications.pending++;

        const mapping = appToBizMap[docId];
        const updatePayload = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (mapping) {
            updatePayload.organizationId = mapping.orgId;
            updatePayload.businessId = mapping.businessId;
            updatePayload.branchId = mapping.branchId;
        }

        stats.applications.updateOps.push({ docId, payload: updatePayload, businessName: app.businessName, mapping });
        stats.actions.updateApplications++;

        if (isApply) {
            const ref = db.collection('merchant_applications').doc(docId);
            batch.set(ref, updatePayload, { merge: true });
        }
    });

    // EXECUTE BATCH IF APPLY
    if (isApply) {
        await batch.commit();
        console.log("✅ CAMBIOS APLICADOS EN FIRESTORE CON ÉXITO.\n");
    } else {
        console.log("ℹ️  NO SE HAN MODIFICADO DATOS EN FIRESTORE (MODO DRY-RUN)\n");
    }

    // PRINT SUMMARY REPORT EXACTLY AS REQUESTED
    console.log("════════════════ GOVERNANCE RECONCILIATION SUMMARY ════════════════\n");

    console.log("BUSINESSES");
    console.log("--------------------------------");
    console.log(`${stats.businesses.total} encontrados`);
    console.log(`${stats.businesses.adr011} ADR-011`);
    console.log(`${stats.businesses.directAdmin} DIRECT_ADMIN`);
    console.log(`${stats.businesses.deleted} DELETED\n`);

    console.log("BRANCHES");
    console.log("--------------------------------");
    console.log(`${stats.branches.total} encontrados`);
    console.log(`${stats.branches.valid} válidos`);
    console.log(`${stats.branches.orphan} HUÉRFANOS\n`);

    console.log("MERCHANT APPLICATIONS");
    console.log("--------------------------------");
    console.log(`${stats.applications.total} encontrados`);
    console.log(`${stats.applications.onboarding} ONBOARDING`);
    console.log(`${stats.applications.rejected} REJECTED\n`);

    console.log("ACCIONES PROPUESTAS / EJECUTADAS");
    console.log("--------------------------------");
    console.log(`UPDATE businesses: ${stats.actions.updateBusinesses}`);
    console.log(`UPDATE branches: ${stats.actions.updateBranches}`);
    console.log(`UPDATE applications: ${stats.actions.updateApplications}`);
    console.log(`ARCHIVE branches: ${stats.actions.archiveBranches}`);
    console.log(`ARCHIVE businesses: ${stats.actions.archiveBusinesses}\n`);

    if (isDryRun) {
        console.log("--------------------------------");
        console.log("NO SE HAN MODIFICADO DATOS (DRY RUN CERTIFICADO)");
        console.log("Para aplicar los cambios en Firestore ejecuta:");
        console.log("node scripts/reconcile_governance_data.js --apply\n");
    }
}

reconcileData().then(() => process.exit(0)).catch(err => {
    console.error("Error en script de reconciliación:", err);
    process.exit(1);
});
