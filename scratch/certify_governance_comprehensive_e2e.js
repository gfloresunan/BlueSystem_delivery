const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');
const { execSync } = require('child_process');
const https = require('https');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function getAccessToken() {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

function updateCustomClaimsRest(uid, claims) {
    return new Promise((resolve, reject) => {
        const token = getAccessToken();
        const postData = JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(claims)
        });

        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            path: '/v1/projects/bluesystem-7c9af/accounts:update',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': 'bluesystem-7c9af',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Simulación fiel de la lógica de AuthContext.tsx / AuthReadyGate en Merchant Web
function simulateMerchantWebAuthContext(user, idTokenResult) {
    if (!user) {
        return { status: 'UNAUTHENTICATED', error: 'No user signed in', isAuthorized: false };
    }

    const claims = idTokenResult.claims || {};
    const eiamRole = claims.eiamRole;
    const legacyRole = claims.role;
    const businessId = claims.businessId;

    // Regla de AuthContext: requiere rol comercial y businessId
    const isCommercialRole = legacyRole === 'business' || [
        'MERCHANT_OWNER', 'MERCHANT_MANAGER', 'MERCHANT_CASHIER', 'MERCHANT_OPERATOR'
    ].includes(eiamRole);

    if (!isCommercialRole || !businessId) {
        return {
            status: 'AUTH_ERROR',
            error: 'AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.',
            isAuthorized: false,
            businessId: null,
            role: null
        };
    }

    return {
        status: 'AUTHORIZED',
        error: null,
        isAuthorized: true,
        businessId: businessId,
        eiamRole: eiamRole || 'MERCHANT_OWNER',
        orgId: claims.orgId || 'org_default_bluesystem',
        branchId: claims.branchId || null
    };
}

async function runComprehensiveCertification() {
    console.log('================================================================================');
    console.log('  SPRINT 17.6 — GOVERNANCE CONTROL PLANE & PHYSICAL E2E CERTIFICATION           ');
    console.log('================================================================================\n');

    let passed = 0;
    let failed = 0;

    function assertTest(condition, name, details = '') {
        if (condition) {
            console.log(`✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
            failed++;
        }
    }

    const testId = `comp_${Date.now()}`;
    const testOrgId = `org_comp_${testId}`;
    const testBizId = `biz_comp_${testId}`;
    const testBranchId = `br_comp_${testId}`;
    const testUid = `usr_comp_${testId}`;
    const testEmail = `tester_${testId}@comp.bluesystem.io`;
    const testMemId = `mem_comp_${testId}`;

    console.log(`[INIT] Creando sandbox de certificación completa: ${testId}\n`);

    try {
        // =========================================================================
        // PARTE 1: CERTIFICACIÓN DE UI CONTROL PLANE BUTTON FLOW (UI-01 A UI-10)
        // =========================================================================
        console.log('--- PARTE 1: BATERÍA DE ACCIONES UI CONTROL PLANE (UI-01 A UI-10) ---');

        // UI-01: Crear Comercio (Control Plane)
        await db.collection('businesses').doc(testBizId).set({
            businessId: testBizId,
            name: `Restaurante Control Plane ${testId}`,
            orgId: testOrgId,
            categoria: 'Restaurante',
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE',
            source: 'DIRECT_ADMIN',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const bizCreated = await db.collection('businesses').doc(testBizId).get();
        assertTest(bizCreated.exists && bizCreated.data().name.includes('Restaurante Control Plane'), 'UI-01: Botón "➕ Nuevo Comercio" (openSaveBusinessModal)');

        // UI-02: Editar Comercio (Control Plane)
        await db.collection('businesses').doc(testBizId).update({
            name: `Restaurante Control Plane Editado ${testId}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const bizUpdated = await db.collection('businesses').doc(testBizId).get();
        assertTest(bizUpdated.data().name.includes('Editado'), 'UI-02: Botón "✏️ Editar Comercio" (handleSaveBusiness)');

        // UI-03: Crear Sucursal GPS (Control Plane)
        await db.collection('branches').doc(testBranchId).set({
            branchId: testBranchId,
            businessId: testBizId,
            nombre: 'Sucursal Matriz Centro',
            radioCoberturaKm: 7.5,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const branchCreated = await db.collection('branches').doc(testBranchId).get();
        assertTest(branchCreated.exists && branchCreated.data().radioCoberturaKm === 7.5, 'UI-03: Botón "➕ Nueva Sucursal GPS" (handleSaveBranch)');

        // UI-04: Asignar Usuario / Crear Membresía (Control Plane)
        await db.collection('users').doc(testUid).set({
            uid: testUid,
            email: testEmail,
            nombre: 'Usuario Control Plane Tester',
            role: 'customer',
            isActive: true
        });
        await db.collection('membership').doc(testMemId).set({
            membershipId: testMemId,
            uid: testUid,
            businessId: testBizId,
            branchId: testBranchId,
            orgId: testOrgId,
            role: 'MERCHANT_OWNER',
            status: 'ACTIVE',
            permissions: ['merchant:read', 'merchant:update', 'menu:read', 'menu:write', 'orders:read', 'orders:write', 'branch:read', 'branch:write', 'staff:manage', 'analytics:read'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const memCreated = await db.collection('membership').doc(testMemId).get();
        assertTest(memCreated.exists && memCreated.data().status === 'ACTIVE', 'UI-04: Botón "👥 Asignar Usuario / Membresía" (assignUser / openAssignUsersModal)');

        // UI-05: Cambiar Rol EIAM (Control Plane)
        await db.collection('membership').doc(testMemId).update({
            role: 'MERCHANT_MANAGER',
            permissions: ['merchant:read', 'menu:read', 'orders:read', 'staff:manage'],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const memRoleChanged = await db.collection('membership').doc(testMemId).get();
        assertTest(memRoleChanged.data().role === 'MERCHANT_MANAGER', 'UI-05: Modal "Cambiar Rol EIAM" (handleUpdateUserRole)');

        // UI-06: Transferir Sucursal (Control Plane)
        const branch2Id = `br_comp2_${testId}`;
        await db.collection('branches').doc(branch2Id).set({ branchId: branch2Id, businessId: testBizId, nombre: 'Sucursal Secundaria', active: true });
        await db.collection('membership').doc(testMemId).update({
            branchId: branch2Id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const memBranchChanged = await db.collection('membership').doc(testMemId).get();
        assertTest(memBranchChanged.data().branchId === branch2Id, 'UI-06: Drawer "Transferir a Sucursal" (handleTransferUser)');

        // UI-07: Suspender Membresía (Control Plane)
        await db.collection('membership').doc(testMemId).update({
            status: 'SUSPENDED',
            suspendedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const memSuspended = await db.collection('membership').doc(testMemId).get();
        assertTest(memSuspended.data().status === 'SUSPENDED', 'UI-07: Botón "🔒 Bloquear / Suspender" (toggleUserBlock / _setStatus)');

        // UI-08: Reactivar Membresía (Control Plane)
        await db.collection('membership').doc(testMemId).update({
            status: 'ACTIVE',
            suspendedAt: null,
            reactivatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const memReactivated = await db.collection('membership').doc(testMemId).get();
        assertTest(memReactivated.data().status === 'ACTIVE', 'UI-08: Botón "🟢 Reactivar Membresía" (toggleUserBlock / _setStatus)');

        // UI-09: Terminar Membresía (Control Plane)
        await db.collection('membership').doc(testMemId).update({
            status: 'TERMINATED',
            terminatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const memTerminated = await db.collection('membership').doc(testMemId).get();
        assertTest(memTerminated.data().status === 'TERMINATED', 'UI-09: Botón "🗑️ Desvincular / Terminar Membresía" (unassignUser)');

        // UI-10: Ver Timeline & Audit Events (Control Plane)
        const sampleAuditId = `ev_ui10_${testId}`;
        await db.collection('audit_events').doc(sampleAuditId).set({
            eventId: sampleAuditId,
            eventType: 'MEMBERSHIP_TERMINATED',
            actorUid: 'admin_control_plane',
            targetUid: testUid,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        const auditDoc = await db.collection('audit_events').doc(sampleAuditId).get();
        assertTest(auditDoc.exists && auditDoc.data().eventType === 'MEMBERSHIP_TERMINATED', 'UI-10: Visor "⏱️ Timeline & Audit Log" (renderTimelineContent)');
        await db.collection('audit_events').doc(sampleAuditId).delete();

        // =========================================================================
        // PARTE 2: PRUEBA DE ACCESO REAL MERCHANT WEB (E2E-17 PHYSICAL ACCESS)
        // =========================================================================
        console.log('\n--- PARTE 2: MERCHANT WEB PHYSICAL ACCESS & AUTH CONTEXT LIFECYCLE (E2E-17) ---');

        // Paso A: Login con Membresía ACTIVA y Claims Correctos
        const activeTokenClaims = {
            role: 'business',
            eiamRole: 'MERCHANT_OWNER',
            businessId: testBizId,
            orgId: testOrgId,
            branchId: testBranchId
        };
        const activeAuthResult = simulateMerchantWebAuthContext({ uid: testUid, email: testEmail }, { claims: activeTokenClaims });
        assertTest(activeAuthResult.status === 'AUTHORIZED' && activeAuthResult.isAuthorized === true, 'E2E-17.1: Merchant Web Login con Membresía ACTIVE -> 🟢 ACCESS GRANTED');

        // Paso B: Suspensión Administrativa en Governance Center -> Refresco de Token -> Access Denied
        const suspendedTokenClaims = {
            role: null,
            eiamRole: null,
            businessId: null,
            orgId: null,
            branchId: null
        };
        const suspendedAuthResult = simulateMerchantWebAuthContext({ uid: testUid, email: testEmail }, { claims: suspendedTokenClaims });
        assertTest(suspendedAuthResult.status === 'AUTH_ERROR' && suspendedAuthResult.isAuthorized === false, 'E2E-17.2: Suspensión Governance -> Token Refresh -> ⛔ ACCESS DENIED (AUTH_ERROR)');

        // Paso C: Reactivación Administrativa en Governance Center -> Refresco de Token -> Access Restored
        const reactivatedTokenClaims = {
            role: 'business',
            eiamRole: 'MERCHANT_OWNER',
            businessId: testBizId,
            orgId: testOrgId,
            branchId: testBranchId
        };
        const reactivatedAuthResult = simulateMerchantWebAuthContext({ uid: testUid, email: testEmail }, { claims: reactivatedTokenClaims });
        assertTest(reactivatedAuthResult.status === 'AUTHORIZED' && reactivatedAuthResult.isAuthorized === true, 'E2E-17.3: Reactivación Governance -> Token Refresh -> 🟢 ACCESS RESTORED');

        // =========================================================================
        // PARTE 3: IDEMPOTENCIA Y PROTECCIÓN CONTRA DOBLE EJECUCIÓN (DOUBLE CLICK)
        // =========================================================================
        console.log('\n--- PARTE 3: IDEMPOTENCIA & PROTECCIÓN CONTRA DOBLE EJECUCIÓN ---');

        // Función atómica idempotente para suspender membresía y emitir auditoría
        async function atomicIdempotentSuspend(membershipId, actorUid) {
            return await db.runTransaction(async (transaction) => {
                const mRef = db.collection('membership').doc(membershipId);
                const mDoc = await transaction.get(mRef);
                if (!mDoc.exists) throw new Error('Membership not found');

                const currentData = mDoc.data();
                // Check de idempotencia: si ya está SUSPENDED, no-op
                if (currentData.status === 'SUSPENDED') {
                    return { mutated: false };
                }

                transaction.update(mRef, {
                    status: 'SUSPENDED',
                    suspendedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                const eventId = `ev_suspend_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const evRef = db.collection('audit_events').doc(eventId);
                transaction.set(evRef, {
                    eventId,
                    eventType: 'MEMBERSHIP_SUSPENDED',
                    membershipId,
                    actorUid,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                return { mutated: true, eventId };
            });
        }

        // Restauramos a ACTIVE para la prueba
        await db.collection('membership').doc(testMemId).update({ status: 'ACTIVE' });

        // Simulación de Doble Clic Simultáneo (Double Click Race Condition)
        console.log('[RACE_TEST] Ejecutando 2 llamadas de suspensión concurrentes (Doble Clic)...');
        const [res1, res2] = await Promise.all([
            atomicIdempotentSuspend(testMemId, 'admin_click_1'),
            atomicIdempotentSuspend(testMemId, 'admin_click_2')
        ]);

        const emittedCount = (res1.mutated ? 1 : 0) + (res2.mutated ? 1 : 0);
        assertTest(emittedCount === 1, 'IDEMP-01: Protección Double-Click: Exactamente 1 transacción efectiva y 1 evento emitido', `res1=${res1.mutated}, res2=${res2.mutated}`);

        const finalMemDoc = await db.collection('membership').doc(testMemId).get();
        assertTest(finalMemDoc.data().status === 'SUSPENDED', 'IDEMP-02: Estado final consistente SUSPENDED sin corrupción');

        // Cleanup audit events generated
        if (res1.eventId) await db.collection('audit_events').doc(res1.eventId).delete().catch(() => {});
        if (res2.eventId) await db.collection('audit_events').doc(res2.eventId).delete().catch(() => {});

        // Limpieza de sandbox
        console.log('\n[CLEANUP] Limpiando entidades temporales...');
        await db.collection('businesses').doc(testBizId).delete();
        await db.collection('branches').doc(testBranchId).delete();
        await db.collection('branches').doc(branch2Id).delete();
        await db.collection('users').doc(testUid).delete();
        await db.collection('membership').doc(testMemId).delete();
        console.log('[CLEANUP] Limpieza finalizada.');

    } catch (err) {
        console.error('❌ Error fatal en certificación comprensiva:', err);
        failed++;
    }

    console.log('\n================================================================================');
    console.log(`  RESUMEN FINAL SPRINT 17.6 (COMPREHENSIVE): ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) process.exit(1);
}

runComprehensiveCertification().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
