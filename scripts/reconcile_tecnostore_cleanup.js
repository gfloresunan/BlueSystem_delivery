const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const isApply = process.argv.includes('--apply');
const isDryRun = process.argv.includes('--dry-run') || !isApply;

async function runCleanup() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log(`       TECNOSTORE DUPLICATION ROOT-CAUSE CLEANUP & RECONCILIATION ENGINE       `);
    console.log(`       MODE: ${isApply ? '🟢 APPLY (COMMITTING ATOMIC CHANGES)' : '🟡 DRY RUN (READ ONLY SIMULATION)'}`);
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const targetAppId = "icmP7k8O9gbqIvEa1ZWY";
    const canonicalTenantId = "ten_bluesystem_core";
    const canonicalBizId = "biz_canonical_tecnostore";
    const canonicalOrgId = "org_canonical_tecnostore";
    const canonicalBranchId = "br_canonical_tecnostore_main";
    const canonicalMemId = "mem_canonical_tecnostore_owner";

    // 1. Fetch all collections
    const [bizSnap, brSnap, memSnap, memsSnap, userSnap, orgSnap] = await Promise.all([
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('membership').get(),
        db.collection('memberships').get(),
        db.collection('users').get(),
        db.collection('organizations').get()
    ]);

    console.log(`Current Firestore Counts:`);
    console.log(`- Businesses: ${bizSnap.size}`);
    console.log(`- Branches: ${brSnap.size}`);
    console.log(`- Legacy Memberships: ${memSnap.size}`);
    console.log(`- V3 Memberships: ${memsSnap.size}`);
    console.log(`- Users: ${userSnap.size}`);
    console.log(`- Organizations: ${orgSnap.size}\n`);

    // 2. Identify duplicates vs canonicals
    const duplicateBizDocs = [];
    const duplicateBranchDocs = [];
    const duplicateMemDocs = [];
    const duplicateMemsDocs = [];
    const duplicateUserDocs = [];
    const duplicateOrgDocs = [];

    let canonicalOwnerUid = null;

    // Businesses
    bizSnap.forEach(doc => {
        const d = doc.data() || {};
        const name = (d.name || d.comercioNombre || d.nombre || '').trim();
        const isTecnostore = name === 'TECNOSTORE' || d.applicationId === targetAppId;
        const isAdminTecno = name === 'Admin Tecnostore' || (d.email && d.email.includes('tecnostore'));
        
        if (doc.id === canonicalBizId) return; // Keep canonical

        if (isTecnostore || isAdminTecno) {
            duplicateBizDocs.push({ id: doc.id, ref: doc.ref, data: d });
        }
    });

    // Branches
    brSnap.forEach(doc => {
        const d = doc.data() || {};
        const name = (d.name || d.branchName || d.nombre || '').trim();
        const bizName = (d.businessName || '').trim();
        const isTecnoBranch = bizName === 'TECNOSTORE' || name === 'TECNOSTORE' || 
            (d.businessId && duplicateBizDocs.some(b => b.id === d.businessId));

        if (doc.id === canonicalBranchId) return;

        if (isTecnoBranch) {
            duplicateBranchDocs.push({ id: doc.id, ref: doc.ref, data: d });
        }
    });

    // Memberships
    memSnap.forEach(doc => {
        const d = doc.data() || {};
        const isTecnoMem = d.businessName === 'TECNOSTORE' || 
            (d.businessId && duplicateBizDocs.some(b => b.id === d.businessId)) ||
            (d.email && d.email.includes('tecnostore'));

        if (doc.id === canonicalMemId) return;

        if (isTecnoMem) {
            duplicateMemDocs.push({ id: doc.id, ref: doc.ref, data: d });
        }
    });

    memsSnap.forEach(doc => {
        const d = doc.data() || {};
        const isTecnoMem = d.businessName === 'TECNOSTORE' || 
            (d.businessId && duplicateBizDocs.some(b => b.id === d.businessId)) ||
            (d.email && d.email.includes('tecnostore'));

        if (doc.id === canonicalMemId) return;

        if (isTecnoMem) {
            duplicateMemsDocs.push({ id: doc.id, ref: doc.ref, data: d });
        }
    });

    // Users
    userSnap.forEach(doc => {
        const d = doc.data() || {};
        const email = (d.email || '').toLowerCase().trim();
        const name = (d.name || d.nombre || '').trim();
        const isTecnoUser = email === 'tecnostore@bluesystemdelivery.com' || name === 'Admin Tecnostore';

        if (isTecnoUser) {
            if (!canonicalOwnerUid) {
                canonicalOwnerUid = doc.id;
            } else {
                duplicateUserDocs.push({ id: doc.id, ref: doc.ref, data: d });
            }
        }
    });

    if (!canonicalOwnerUid) {
        canonicalOwnerUid = "uid_tecnostore_owner_canonical";
    }

    // Organizations
    orgSnap.forEach(doc => {
        const d = doc.data() || {};
        const isTecnoOrg = (d.businessIds && d.businessIds.some(bid => duplicateBizDocs.some(b => b.id === bid))) ||
            (d.ownerUid && d.ownerUid === canonicalOwnerUid) ||
            (d.name === 'Grupo Flores' && d.ruc === 'J03100002372737');

        if (doc.id === canonicalOrgId) return;

        if (isTecnoOrg) {
            duplicateOrgDocs.push({ id: doc.id, ref: doc.ref, data: d });
        }
    });

    console.log(`Identified Entities for Consolidation:`);
    console.log(`- Canonical Business ID: ${canonicalBizId}`);
    console.log(`- Canonical Branch ID: ${canonicalBranchId}`);
    console.log(`- Canonical Organization ID: ${canonicalOrgId}`);
    console.log(`- Canonical Owner UID: ${canonicalOwnerUid}`);
    console.log(`- Canonical Membership ID: ${canonicalMemId}\n`);

    console.log(`Entities to Delete / Consolidate:`);
    console.log(`- Duplicate Businesses: ${duplicateBizDocs.length}`);
    console.log(`- Duplicate Branches: ${duplicateBranchDocs.length}`);
    console.log(`- Duplicate Legacy Memberships: ${duplicateMemDocs.length}`);
    console.log(`- Duplicate V3 Memberships: ${duplicateMemsDocs.length}`);
    console.log(`- Duplicate Users: ${duplicateUserDocs.length}`);
    console.log(`- Duplicate Organizations: ${duplicateOrgDocs.length}\n`);

    if (isDryRun) {
        console.log("🟡 DRY RUN COMPLETED. No changes were committed. Run with --apply to execute.");
        return;
    }

    console.log("🚀 EXECUTING ATOMIC APPLICATION RESTORATION AND BATCH CLEANUP...");

    // 1. Establish the Single Canonical TECNOSTORE Business
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('businesses').doc(canonicalBizId).set({
        id: canonicalBizId,
        businessId: canonicalBizId,
        tenantId: canonicalTenantId,
        orgId: canonicalOrgId,
        ownerUid: canonicalOwnerUid,
        name: "TECNOSTORE",
        legalName: "Grupo Flores",
        ruc: "J03100002372737",
        category: "tienda",
        departmentId: "dep_01_managua",
        departmentName: "Managua",
        municipalityId: "mun_0101_managua",
        municipalityName: "Managua",
        address: "De le entrada principal del residencial 3c al lago y 2c abajo",
        city: "Managua",
        zone: "Residencial Las Delicias",
        location: new admin.firestore.GeoPoint(12.161876331999524, -86.18354544469628),
        phone: "82397401",
        email: "tecnostore@bluesystemdelivery.com",
        documentUrls: [],
        lifecycleStatus: "ONBOARDING",
        wizardCompleted: false,
        onboardingStep: 0,
        applicationId: targetAppId,
        isOpen: false,
        isActive: true,
        branchIds: [canonicalBranchId],
        createdAt: now,
        updatedAt: now
    });
    console.log("✅ Canonical Business established.");

    // 2. Establish Canonical Branch
    await db.collection('branches').doc(canonicalBranchId).set({
        id: canonicalBranchId,
        branchId: canonicalBranchId,
        tenantId: canonicalTenantId,
        businessId: canonicalBizId,
        orgId: canonicalOrgId,
        name: "Sucursal Principal",
        branchName: "Sucursal Principal",
        departmentId: "dep_01_managua",
        departmentName: "Managua",
        municipalityId: "mun_0101_managua",
        municipalityName: "Managua",
        address: "De le entrada principal del residencial 3c al lago y 2c abajo",
        city: "Managua",
        zone: "Residencial Las Delicias",
        location: new admin.firestore.GeoPoint(12.161876331999524, -86.18354544469628),
        phone: "82397401",
        isPrimary: true,
        isActive: true,
        active: true,
        employeeIds: [],
        createdAt: now,
        updatedAt: now
    });
    console.log("✅ Canonical Branch established.");

    // 3. Establish Canonical Organization
    await db.collection('organizations').doc(canonicalOrgId).set({
        orgId: canonicalOrgId,
        tenantId: canonicalTenantId,
        name: "Grupo Flores",
        legalName: "Grupo Flores",
        ruc: "J03100002372737",
        ownerUid: canonicalOwnerUid,
        businessIds: [canonicalBizId],
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now
    });
    console.log("✅ Canonical Organization established.");

    // 4. Establish Canonical Owner User
    await db.collection('users').doc(canonicalOwnerUid).set({
        uid: canonicalOwnerUid,
        tenantId: canonicalTenantId,
        nombre: "Admin Tecnostore",
        name: "Admin Tecnostore",
        email: "tecnostore@bluesystemdelivery.com",
        telefono: "82397401",
        phone: "82397401",
        userType: "business",
        role: "business",
        rol: "business",
        eiamRole: "MERCHANT_OWNER",
        businessId: canonicalBizId,
        orgId: canonicalOrgId,
        branchId: canonicalBranchId,
        active: true,
        isActive: true,
        fechaRegistro: now,
        updatedAt: now
    }, { merge: true });
    console.log("✅ Canonical Owner User established.");

    // 5. Establish Canonical Memberships
    const memPayload = {
        membershipId: canonicalMemId,
        uid: canonicalOwnerUid,
        tenantId: canonicalTenantId,
        businessId: canonicalBizId,
        orgId: canonicalOrgId,
        branchId: canonicalBranchId,
        role: "MERCHANT_OWNER",
        status: "ACTIVE",
        permissions: [
            "VIEW_ORDERS", "MANAGE_ORDERS", "VIEW_MENU", "MANAGE_MENU",
            "VIEW_FINANCE", "EXPORT_REPORT", "MANAGE_EMPLOYEES", "MANAGE_SETTINGS",
            "VIEW_ANALYTICS", "CLOSE_CASH_REGISTER"
        ],
        createdAt: now,
        updatedAt: now
    };
    await db.collection('membership').doc(canonicalMemId).set(memPayload);
    await db.collection('memberships').doc(canonicalMemId).set({
        ...memPayload,
        schemaVersion: "3.0"
    });
    console.log("✅ Canonical Memberships (Legacy & V3) established.");

    // 6. Restore merchant_applications/icmP7k8O9gbqIvEa1ZWY
    await db.collection('merchant_applications').doc(targetAppId).set({
        appId: targetAppId,
        tenantId: canonicalTenantId,
        businessName: "TECNOSTORE",
        legalName: "Grupo Flores",
        ruc: "J03100002372737",
        address: "De le entrada principal del residencial 3c al lago y 2c abajo",
        city: "Managua",
        zone: "Residencial Las Delicias",
        category: "tienda",
        contactName: "Admin Tecnostore",
        phone: "82397401",
        email: "tecnostore@bluesystemdelivery.com",
        location: new admin.firestore.GeoPoint(12.161876331999524, -86.18354544469628),
        documents: [],
        documentUrls: [],
        rejectionReason: null,
        docsRequestedNote: "licencia de policia",
        reviewedBy: "admin",
        reviewedAt: now,
        provisionedBusinessId: canonicalBizId,
        provisionedUid: canonicalOwnerUid,
        status: "ONBOARDING",
        createdAt: now,
        updatedAt: now
    });
    console.log("✅ Merchant application restored in stable ONBOARDING status.");

    // 7. Delete duplicates in batches
    async function batchDelete(docs, label) {
        let count = 0;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = db.batch();
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
            count += chunk.length;
            console.log(`   [${label}] Deleted batch ${i / chunkSize + 1} (${count}/${docs.length})`);
        }
    }

    console.log("\nDeleting duplicate documents...");
    await batchDelete(duplicateBizDocs, "Businesses");
    await batchDelete(duplicateBranchDocs, "Branches");
    await batchDelete(duplicateMemDocs, "Legacy Memberships");
    await batchDelete(duplicateMemsDocs, "V3 Memberships");
    await batchDelete(duplicateUserDocs, "Users");
    await batchDelete(duplicateOrgDocs, "Organizations");

    // 8. Register Audit Event
    await db.collection('audit_events').add({
        event: "DUPLICATE_BUSINESS_CLEANED",
        domain: "IDENTITY",
        canonicalBusinessId: canonicalBizId,
        canonicalOwnerUid: canonicalOwnerUid,
        canonicalBranchId: canonicalBranchId,
        canonicalMembershipId: canonicalMemId,
        applicationId: targetAppId,
        deletedBusinessesCount: duplicateBizDocs.length,
        deletedBranchesCount: duplicateBranchDocs.length,
        deletedMembershipsCount: duplicateMemDocs.length,
        deletedUsersCount: duplicateUserDocs.length,
        triggeredBy: "ADMIN_FORENSIC_ENGINE",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log("       CLEANUP AND RECONCILIATION COMPLETED SUCCESSFULLY!                      ");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
}

runCleanup().catch(err => {
    console.error("Critical error in cleanup:", err);
    process.exit(1);
});
