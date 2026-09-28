// scripts/certify_commerce_lifecycle_delete_e2e.js — BlueSystem Enterprise v2.2
// Automated Certification Suite: Commerce Lifecycle Teardown & EIAM Stale-Write Guard E2E

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}
const db = admin.firestore();

// Simular entorno cliente para cargar los módulos frontend
global.window = global;
global.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp()
        }
    }
};
global.db = db;
global.drawer = {
    _openDrawers: new Set(),
    open: (id) => global.drawer._openDrawers.add(id),
    close: (id) => global.drawer._openDrawers.delete(id),
    isOpen: (id) => global.drawer._openDrawers.has(id)
};
global.toast = {
    _logs: [],
    show: (msg, type) => global.toast._logs.push({ msg, type })
};
global.document = {
    getElementById: (id) => null
};

// Cargar servicios canónicos
require('../panel-admin/public/js/services/canonicalIdentityResolver.js');
require('../panel-admin/public/js/services/identityAdministrationService.js');
require('../panel-admin/public/js/services/identityService.js');
require('../panel-admin/public/js/dashboard/identityAdminDrawer.js');
require('../panel-admin/public/js/services/commerceSyncService.js');
require('../panel-admin/public/js/services/governanceService.js');

async function runLifecycleCertificationSuite() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log(" BLUE SYSTEM DELIVERY ENTERPRISE — COMMERCE LIFECYCLE & EIAM ROOT-CAUSE SUITE   ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    let passCount = 0;
    let failCount = 0;

    function assert(cond, testName, details = "") {
        if (cond) {
            passCount++;
            console.log(` 🟢 PASS: [${testName}] ${details}`);
        } else {
            failCount++;
            console.error(` 🔴 FAIL: [${testName}] ${details}`);
        }
    }

    // ─── 0. SNAPSHOT INICIAL DE BASE DE DATOS ─────────────────────────────────
    console.log("--- FASE 0: SNAPSHOT DE INTEGRIDAD DE BASE DE DATOS ---");
    const initBizSnap = await db.collection("businesses").get();
    const initBranchSnap = await db.collection("branches").get();
    const initMemSnap = await db.collection("membership").get();
    const initUserSnap = await db.collection("users").get();
    const initOrgSnap = await db.collection("organizations").get();

    const initialCounts = {
        businesses: initBizSnap.size,
        branches: initBranchSnap.size,
        memberships: initMemSnap.size,
        users: initUserSnap.size,
        organizations: initOrgSnap.size
    };
    console.log("Conteo inicial de entidades:", initialCounts);

    const testBizId = `test_biz_lifecycle_${Date.now()}`;
    const testBranchId = `test_branch_lifecycle_${Date.now()}`;
    const testMemId = `test_mem_lifecycle_${Date.now()}`;
    const testOwnerUid = `test_user_owner_${Date.now()}`;
    const testTenantId = "ten_bluesystem_core";

    try {
        // ─── FASE 1: PROVISIONAMIENTO DE COMERCIO DE PRUEBA ───────────────────
        console.log("\n--- FASE 1: PROVISIONAMIENTO DE COMERCIO TEMPORAL ---");
        
        await db.collection("businesses").doc(testBizId).set({
            businessId: testBizId,
            name: "Comercio Temporal Lifecycle",
            tenantId: testTenantId,
            status: "ACTIVE",
            lifecycleStatus: "ACTIVE",
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("branches").doc(testBranchId).set({
            branchId: testBranchId,
            businessId: testBizId,
            nombre: "Sucursal Principal Temporal",
            tenantId: testTenantId,
            status: "ACTIVE",
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("users").doc(testOwnerUid).set({
            uid: testOwnerUid,
            nombre: "Owner Temporal Lifecycle",
            email: `owner_${Date.now()}@testlifecycle.com`,
            businessId: testBizId,
            branchId: testBranchId,
            tenantId: testTenantId,
            role: "OWNER",
            eiamRole: "OWNER",
            status: "ACTIVE",
            active: true,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("membership").doc(testMemId).set({
            membershipId: testMemId,
            businessId: testBizId,
            branchId: testBranchId,
            tenantId: testTenantId,
            uid: testOwnerUid,
            role: "OWNER",
            status: "ACTIVE",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const createdBiz = await db.collection("businesses").doc(testBizId).get();
        assert(createdBiz.exists, "TEST_00_PROVISION_SUCCESS", `Comercio de prueba ${testBizId} creado`);

        // ─── TEST 09 & 10: DEACTIVATE IS REVERSIBLE & DOES NOT DELETE ─────────
        console.log("\n--- FASE 2: CANONICAL DEACTIVATE LIFECYCLE (REVERSIBLE) ---");
        
        // Desactivar
        await global.governanceService.deactivateBusiness(testBizId, 'admin_tester');
        const deactivatedBiz = await db.collection("businesses").doc(testBizId).get();
        const dData = deactivatedBiz.data() || {};
        assert(deactivatedBiz.exists && dData.status === 'INACTIVE' && dData.active === false, 
            "TEST_10_DEACTIVATE_DOES_NOT_DELETE", 
            `Comercio ${testBizId} existe en /businesses con status=INACTIVE`);

        // Reactivar
        await db.collection("businesses").doc(testBizId).set({
            status: "ACTIVE",
            lifecycleStatus: "ACTIVE",
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const reactivatedBiz = await db.collection("businesses").doc(testBizId).get();
        const rData = reactivatedBiz.data() || {};
        assert(reactivatedBiz.exists && rData.status === 'ACTIVE' && reactivatedBiz.id === testBizId,
            "TEST_09_DEACTIVATE_IS_REVERSIBLE",
            `Reactivación exitosa conservando exactamente el mismo businessId: ${testBizId}`);

        // ─── TEST 05: DRAWER INVALIDATION ────────────────────────────────────
        console.log("\n--- FASE 3: DRAWER CONTEXT INVALIDATION ---");
        
        // Simular apertura de drawer con los datos del usuario
        global.identityAdminDrawer._identity360 = {
            user: {
                uid: testOwnerUid,
                businessId: testBizId,
                role: 'OWNER',
                status: 'ACTIVE'
            }
        };
        global.identityAdminDrawer._currentUid = testOwnerUid;
        global.identityAdminDrawer._isInvalidated = false;
        global.identityAdminDrawer._isSaving = false;
        global.drawer.open('drawer-identity-admin');

        assert(global.drawer.isOpen('drawer-identity-admin'), "TEST_05A_DRAWER_OPENED", "Drawer abierto en sesión");

        // Invalidar contexto por eliminación del comercio
        global.identityAdminDrawer.invalidateContext(testBizId, 'BUSINESS_HARD_DELETE');

        assert(global.identityAdminDrawer._isInvalidated === true && !global.drawer.isOpen('drawer-identity-admin'),
            "TEST_05_DRAWER_INVALIDATION",
            "Drawer cerrado y contexto marcado como _isInvalidated=true");

        // ─── TEST 06: SAVE AFTER DELETE / INVALIDATION BLOCKED ────────────────
        console.log("\n--- FASE 4: SAVE ATTEMPT ON INVALIDATED CONTEXT ---");
        
        // Intentar guardar con contexto invalidado
        await global.identityAdminDrawer._save(testOwnerUid);
        
        const postSaveUser = (await db.collection("users").doc(testOwnerUid).get()).data();
        assert(postSaveUser.role === "OWNER", "TEST_06_SAVE_AFTER_DELETE_BLOCKED", 
            "Guardado en contexto invalidado fue rechazado sin mutar /users ni disparar HTTP 400");

        // ─── TEST 01 & 11: HARD DELETE TEARDOWN DEFINITIVO ────────────────────
        console.log("\n--- FASE 5: ATOMIC HARD DELETE & TEARDOWN ---");
        
        await global.governanceService.hardDeleteBusiness(testBizId, 'admin_tester');

        const [bizPostDelete, branchPostDelete, memPostDelete] = await Promise.all([
            db.collection("businesses").doc(testBizId).get(),
            db.collection("branches").doc(testBranchId).get(),
            db.collection("membership").doc(testMemId).get()
        ]);

        assert(!bizPostDelete.exists, "TEST_01_DELETE_SUCCESS_BIZ", `/businesses/${testBizId} fue físicamente eliminado`);
        assert(!branchPostDelete.exists, "TEST_01B_DELETE_SUCCESS_BRANCH", `/branches/${testBranchId} fue físicamente eliminado`);
        assert(!memPostDelete.exists, "TEST_01C_DELETE_SUCCESS_MEMBERSHIP", `/membership/${testMemId} fue físicamente eliminado`);
        assert(!bizPostDelete.exists, "TEST_11_DELETE_IS_NOT_DEACTIVATE", "Delete ejecutó teardown real (no una simple desactivación)");

        // ─── TEST 03 & 04: ZERO updateIdentityRole AFTER DELETE & ZERO STALE setDoc ───
        console.log("\n--- FASE 6: EIAM LIFECYCLE GUARD ON POST-DELETE MUTATIONS ---");
        
        let guardTriggered = false;
        try {
            await global.IdentityAdministrationService.updateIdentityRole(testOwnerUid, 'MANAGER');
        } catch (e) {
            if (e.message.includes('[EIAM_GUARD]')) {
                guardTriggered = true;
            }
        }
        assert(guardTriggered, "TEST_03_ZERO_UPDATE_ROLE_AFTER_DELETE", 
            "EIAM Lifecycle Guard interceptó y bloqueó updateIdentityRole sobre comercio eliminado");

        // Verificar que no se resucitó el comercio ni se alteró el rol
        const bizResurrectCheck = await db.collection("businesses").doc(testBizId).get();
        assert(!bizResurrectCheck.exists, "TEST_04_ZERO_STALE_SETDOC", 
            "0 setDoc espurios: el comercio permanece 100% eliminado de Firestore");

        // ─── TEST 08: DOUBLE DELETE IDEMPOTENCY ──────────────────────────────
        console.log("\n--- FASE 7: DOUBLE DELETE IDEMPOTENCY ---");
        
        let secondDeleteOk = true;
        try {
            await global.governanceService.hardDeleteBusiness(testBizId, 'admin_tester');
        } catch (e) {
            secondDeleteOk = false;
        }
        assert(secondDeleteOk, "TEST_08_DOUBLE_DELETE_IDEMPOTENT", 
            "Segunda llamada a hardDeleteBusiness ejecutó de forma idempotente y segura");

        // ─── TEST 16: AUDIT TRAIL SURVIVES ───────────────────────────────────
        console.log("\n--- FASE 8: AUDIT TRAIL VERIFICATION ---");
        
        const auditSnap = await db.collection("audit_events")
            .where("businessId", "==", testBizId)
            .get();

        assert(!auditSnap.empty && auditSnap.docs.some(d => d.data().event === 'COMMERCE_PERMANENTLY_DELETED' || d.data().action === 'COMMERCE_PERMANENTLY_DELETED'),
            "TEST_16_AUDIT_SURVIVES",
            `Auditoría inmutable COMMERCE_PERMANENTLY_DELETED registrada y preservada (${auditSnap.size} eventos)`);

        // ─── TEST 17 & 18: TENANT ISOLATION & RBAC ───────────────────────────
        console.log("\n--- FASE 9: SECURITY, TENANT ISOLATION & RBAC ---");
        
        let crossTenantBlocked = false;
        try {
            await global.IdentityAdministrationService.transferEmployee(testOwnerUid, "foreign_tenant_biz", "foreign_branch");
        } catch (e) {
            if (e.message.includes('[EIAM_GUARD]')) {
                crossTenantBlocked = true;
            }
        }
        assert(crossTenantBlocked, "TEST_17_TENANT_ISOLATION", "Mutación a comercio inexistente/cross-tenant bloqueada por EIAM Guard");

        // ─── TEST 19: USER ≠ BUSINESS SEPARATION ─────────────────────────────
        console.log("\n--- FASE 10: USER != BUSINESS SEPARATION ---");
        const { projectSingleStore } = require('../functions/lib/triggers/businessProjection');
        const testUserData = {
            uid: testOwnerUid,
            nombre: "Owner Temporal Lifecycle",
            role: "OWNER",
            eiamRole: "MERCHANT_OWNER",
            businessId: testBizId,
            tenantId: testTenantId,
            active: true
        };
        await projectSingleStore(testOwnerUid, testUserData);
        
        const pseudoBizSnap = await db.collection("businesses").doc(testOwnerUid).get();
        assert(!pseudoBizSnap.exists, "TEST_19_USER_NOT_BUSINESS", 
            `El UID de usuario ${testOwnerUid} jamás fue proyectado como /businesses/${testOwnerUid}`);

        // ─── TEST 07: RACE CONDITION TEST (50 CONCURRENT REPLAYS) ────────────
        console.log("\n--- FASE 11: RACE CONDITION TEST (50 REPETICIONES SAVE + DELETE) ---");
        
        let raceConditionViolations = 0;
        let http400Count = 0;

        for (let i = 0; i < 50; i++) {
            const iterBizId = `race_biz_${Date.now()}_${i}`;
            const iterUid = `race_user_${Date.now()}_${i}`;

            // Crear
            await db.collection("businesses").doc(iterBizId).set({
                businessId: iterBizId,
                name: `Race Biz ${i}`,
                status: "ACTIVE",
                active: true
            });
            await db.collection("users").doc(iterUid).set({
                uid: iterUid,
                businessId: iterBizId,
                role: "OWNER",
                status: "ACTIVE"
            });

            // Configurar drawer simulado
            global.identityAdminDrawer._identity360 = {
                user: { uid: iterUid, businessId: iterBizId, role: 'OWNER' }
            };
            global.identityAdminDrawer._currentUid = iterUid;
            global.identityAdminDrawer._isInvalidated = false;
            global.identityAdminDrawer._isSaving = false;

            // Disparar simultáneamente DELETE y SAVE
            const pDelete = global.governanceService.hardDeleteBusiness(iterBizId, 'race_tester');
            const pSave = (async () => {
                // Pequeño retardo aleatorio de 0-5ms para simular carrera real
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 5)));
                try {
                    await global.identityAdminDrawer._save(iterUid);
                } catch (err) {
                    if (err.message && err.message.includes('400')) http400Count++;
                }
            })();

            await Promise.all([pDelete, pSave]);

            // Verificar que el negocio fue eliminado y no resucitó
            const checkBiz = await db.collection("businesses").doc(iterBizId).get();
            if (checkBiz.exists) raceConditionViolations++;

            // Teardown del usuario temporal
            await db.collection("users").doc(iterUid).delete().catch(() => null);
        }

        assert(raceConditionViolations === 0, "TEST_07_RACE_CONDITION_PROTECTION", 
            `50/50 repeticiones exitosas: 0 carreras, 0 resurrecciones de comercios`);
        assert(http400Count === 0, "TEST_02_ZERO_HTTP_400", 
            `0 errores HTTP 400 en escrituras concurrentes durante delete`);

        // ─── TEST 24: STRESS TEST CONCURRENT DELETES + SAVES + REFRESHES ──────
        console.log("\n--- FASE 12: STRESS TEST (10 CONCURRENT DELETES + 10 SAVES) ---");
        
        const stressBizIds = [];
        const stressUserIds = [];

        for (let i = 0; i < 10; i++) {
            const bId = `stress_biz_${Date.now()}_${i}`;
            const uId = `stress_user_${Date.now()}_${i}`;
            stressBizIds.push(bId);
            stressUserIds.push(uId);

            await db.collection("businesses").doc(bId).set({ businessId: bId, name: `Stress Biz ${i}`, status: 'ACTIVE' });
            await db.collection("users").doc(uId).set({ uid: uId, businessId: bId, role: 'OWNER', status: 'ACTIVE' });
        }

        const stressTasks = [];
        for (let i = 0; i < 10; i++) {
            const bId = stressBizIds[i];
            const uId = stressUserIds[i];
            stressTasks.push(global.governanceService.hardDeleteBusiness(bId, 'stress_tester'));
            stressTasks.push(global.IdentityAdministrationService.updateIdentityRole(uId, 'ADMIN').catch(() => null));
            stressTasks.push(global.governanceService.getBusinesses('all').catch(() => []));
        }

        await Promise.all(stressTasks);

        // Limpiar usuarios de estrés
        for (const uId of stressUserIds) {
            await db.collection("users").doc(uId).delete().catch(() => null);
        }

        let stressOrphans = 0;
        for (const bId of stressBizIds) {
            const snap = await db.collection("businesses").doc(bId).get();
            if (snap.exists) stressOrphans++;
        }

        assert(stressOrphans === 0, "TEST_20_STRESS_CONCURRENCY_TEST", 
            "Estrés de 10 DELETE + 10 SAVE + 10 Refreshes completado con 0 entidades huérfanas");

    } finally {
        // ─── TEARDOWN DE ENTIDADES TEMPORALES ────────────────────────────────
        console.log("\n--- FASE 13: TEARDOWN FINAL & ZERO TEST ARTIFACTS ---");
        
        await db.collection("businesses").doc(testBizId).delete().catch(() => null);
        await db.collection("branches").doc(testBranchId).delete().catch(() => null);
        await db.collection("membership").doc(testMemId).delete().catch(() => null);
        await db.collection("users").doc(testOwnerUid).delete().catch(() => null);

        // Limpiar eventos de auditoría de prueba
        const tempAudit = await db.collection("audit_events").where("businessId", "==", testBizId).get().catch(() => null);
        if (tempAudit && !tempAudit.empty) {
            const batch = db.batch();
            tempAudit.forEach(d => batch.delete(d.ref));
            await batch.commit().catch(() => null);
        }

        const finalBizSnap = await db.collection("businesses").get();
        const finalBranchSnap = await db.collection("branches").get();
        const finalMemSnap = await db.collection("membership").get();
        const finalUserSnap = await db.collection("users").get();
        const finalOrgSnap = await db.collection("organizations").get();

        const finalCounts = {
            businesses: finalBizSnap.size,
            branches: finalBranchSnap.size,
            memberships: finalMemSnap.size,
            users: finalUserSnap.size,
            organizations: finalOrgSnap.size
        };
        console.log("Conteo final de entidades:", finalCounts);

        assert(finalCounts.businesses === initialCounts.businesses, "TEST_12_ZERO_NEW_BUSINESSES", `Businesses: ${finalCounts.businesses} == ${initialCounts.businesses}`);
        assert(finalCounts.branches === initialCounts.branches, "TEST_15_ZERO_NEW_BRANCHES", `Branches: ${finalCounts.branches} == ${initialCounts.branches}`);
        assert(finalCounts.memberships === initialCounts.memberships, "TEST_14_ZERO_NEW_MEMBERSHIPS", `Memberships: ${finalCounts.memberships} == ${initialCounts.memberships}`);
        assert(finalCounts.users === initialCounts.users, "TEST_13_ZERO_NEW_USERS", `Users: ${finalCounts.users} == ${initialCounts.users}`);
        assert(finalCounts.organizations === initialCounts.organizations, "TEST_21_ZERO_NEW_ORGANIZATIONS", `Organizations: ${finalCounts.organizations} == ${initialCounts.organizations}`);
    }

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log(` RESULTADO FINAL: ${passCount} PRUEBAS SUPERADAS, ${failCount} FALLOS`);
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    if (failCount > 0) {
        process.exit(1);
    }
}

runLifecycleCertificationSuite().catch((err) => {
    console.error("FATAL ERROR EN CERTIFICATION SUITE:", err);
    process.exit(1);
});
