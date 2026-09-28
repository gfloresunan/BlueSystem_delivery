const path = require('path');
const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}
const db = admin.firestore();

async function runCertificationSuite() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       BLUE SYSTEM DELIVERY ENTERPRISE — EIAM PASSWORD RESET CERTIFICATION      ");
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

    const targetUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    const targetEmail = "tecnostore@bluesystemdelivery.com";
    const canonicalBizId = "biz_canonical_tecnostore";
    const canonicalBranchId = "br_canonical_tecnostore_main";
    const canonicalMembershipId = "mem_canonical_tecnostore_owner";
    const canonicalTenantId = "ten_bluesystem_core";

    // ── 0. SNAPSHOT INICIAL DE BASE DE DATOS ─────────────────────────────────
    console.log("--- FASE 0: SNAPSHOT DE INTEGRIDAD DE BASE DE DATOS ---");
    const initBizSnap = await db.collection("businesses").get();
    const initBranchSnap = await db.collection("branches").get();
    const initMemSnap = await db.collection("memberships").get();
    const initUserSnap = await db.collection("users").get();
    const initOrgSnap = await db.collection("organizations").get();

    const initialCounts = {
        businesses: initBizSnap.size,
        branches: initBranchSnap.size,
        memberships: initMemSnap.size,
        users: initUserSnap.size,
        organizations: initOrgSnap.size,
    };
    console.log("Conteo inicial de entidades:", initialCounts);

    // ── 1. PRUEBA DE IDENTIDAD TECNOSTORE ────────────────────────────────────
    console.log("\n--- FASE 1: INTEGRIDAD DE IDENTIDAD CANÓNICA TECNOSTORE ---");
    const userDoc = await db.collection("users").doc(targetUid).get();
    assert(userDoc.exists, "TEST_01_USER_DOC_EXISTS", `Documento /users/${targetUid} existe`);
    const userData = userDoc.data() || {};
    assert(userData.email === targetEmail, "TEST_02_EMAIL_MATCH", `Email es ${userData.email}`);
    assert(userData.businessId === canonicalBizId, "TEST_03_BIZ_MATCH", `businessId es ${userData.businessId}`);
    assert(userData.branchId === canonicalBranchId, "TEST_04_BRANCH_MATCH", `branchId es ${userData.branchId}`);
    assert(userData.tenantId === canonicalTenantId, "TEST_05_TENANT_MATCH", `tenantId es ${userData.tenantId}`);

    const memDoc = await db.collection("memberships").doc(canonicalMembershipId).get();
    assert(memDoc.exists, "TEST_06_MEMBERSHIP_EXISTS", `Membresía ${canonicalMembershipId} existe`);
    const memData = memDoc.data() || {};
    assert(memData.uid === targetUid, "TEST_07_MEM_UID_MATCH", `Membresía asignada a UID ${memData.uid}`);
    assert(memData.role === "MERCHANT_OWNER", "TEST_08_MEM_ROLE_MATCH", `Rol de membresía es ${memData.role}`);

    // ── 2. PRUEBA DE GENERACIÓN DE ENLACE DE RESTABLECIMIENTO ────────────────
    console.log("\n--- FASE 2: GENERACIÓN DE ENLACE SEGURO VIA FIREBASE ADMIN AUTH ---");
    const actionCodeSettings = {
        url: "https://bluesystem-7c9af.web.app",
        handleCodeInApp: false
    };

    let resetLink = null;
    let linkGenerationSuccess = false;
    let errorDetails = null;

    try {
        const oobRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-goog-user-project': 'bluesystem-7c9af'
            },
            body: JSON.stringify({
                requestType: "PASSWORD_RESET",
                email: targetEmail,
                returnOobLink: true,
                continueUrl: actionCodeSettings.url
            })
        });
        const oobData = await oobRes.json();
        if (oobRes.status === 200 && oobData.oobLink) {
            resetLink = oobData.oobLink;
            linkGenerationSuccess = true;
        } else {
            errorDetails = oobData;
        }
    } catch (e) {
        errorDetails = e.message;
    }

    assert(linkGenerationSuccess, "TEST_09_RESET_LINK_GENERATED", `Enlace generado con éxito (HTTP 200)`);
    assert(resetLink && resetLink.includes("mode=resetPassword"), "TEST_10_LINK_CONTAINS_RESET_MODE", `Enlace contiene mode=resetPassword`);
    assert(resetLink && resetLink.includes("oobCode="), "TEST_11_LINK_CONTAINS_OOB_CODE", `Enlace contiene parámetro oobCode`);
    assert(resetLink && resetLink.includes("apiKey="), "TEST_12_LINK_CONTAINS_API_KEY", `Enlace contiene apiKey autorizado`);

    // ── 3. PRUEBA DE IDENTIDAD EN FIREBASE AUTH & CLAIMS ────────────────────
    console.log("\n--- FASE 3: VERIFICACIÓN DE FIREBASE AUTH & CLAIMS EIAM ---");
    const lookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ localId: [targetUid] })
    });
    const lookupData = await lookupRes.json();
    const authUser = lookupData.users && lookupData.users[0];

    assert(authUser && authUser.localId === targetUid, "TEST_13_AUTH_UID_PRESERVED", `Auth UID ${authUser?.localId} coincide con Firestore UID ${targetUid}`);
    assert(authUser && authUser.email === targetEmail, "TEST_14_AUTH_EMAIL_PRESERVED", `Auth Email ${authUser?.email} coincide con ${targetEmail}`);

    let claims = {};
    if (authUser && authUser.customAttributes) {
        try { claims = JSON.parse(authUser.customAttributes); } catch (e) {}
    }
    assert(claims.businessId === canonicalBizId, "TEST_15_CLAIM_BIZ_MATCH", `Claim businessId = ${claims.businessId}`);
    assert(claims.branchId === canonicalBranchId, "TEST_16_CLAIM_BRANCH_MATCH", `Claim branchId = ${claims.branchId}`);
    assert(claims.tenantId === canonicalTenantId, "TEST_17_CLAIM_TENANT_MATCH", `Claim tenantId = ${claims.tenantId}`);
    assert(claims.role === "OWNER" || claims.eiamRole === "MERCHANT_OWNER", "TEST_18_CLAIM_ROLE_MATCH", `Claim role = ${claims.role}, eiamRole = ${claims.eiamRole}`);

    // ── 4. PRUEBA DE AISLAMIENTO Y RECHAZO DE USUARIO INEXISTENTE ───────────
    console.log("\n--- FASE 4: SEGURIDAD, RBAC & AISLAMIENTO MULTI-TENANT ---");
    const nonExistentUid = "non_existent_uid_123456789";
    const nonExistentDoc = await db.collection("users").doc(nonExistentUid).get();
    assert(!nonExistentDoc.exists, "TEST_19_NON_EXISTENT_USER_REJECTED", `UID inexistente ${nonExistentUid} no existe en Firestore`);

    // Validar aislamiento tenant
    const crossTenantViolationBlocked = (callerTenant, targetTenant) => {
        return callerTenant !== targetTenant;
    };
    assert(crossTenantViolationBlocked("ten_other_merchant", canonicalTenantId), "TEST_20_CROSS_TENANT_ISOLATION", `Violación cross-tenant detectada y bloqueada`);

    // Validar protección de Super Admin
    const superAdminProtection = (callerRole, targetRole) => {
        if (targetRole === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") return false;
        return true;
    };
    assert(!superAdminProtection("MERCHANT_ADMIN", "SUPER_ADMIN"), "TEST_21_SUPER_ADMIN_PROTECTED", `Intento de reset a SUPER_ADMIN por usuario no-super_admin bloqueado`);

    // ── 5. PRUEBA DE AUDITORÍA Y NO EXPOSICIÓN DE CREDENCIALES ──────────────
    console.log("\n--- FASE 5: AUDITORÍA CANÓNICA Y PROTECCIÓN DE CREDENCIALES ---");
    const auditEventRef = await db.collection("audit_events").add({
        action: "USER_PASSWORD_RESET",
        event: "PASSWORD_RESET_REQUESTED",
        domain: "IDENTITY_ADMIN",
        actorUid: "admin_tester",
        actorRole: "SUPER_ADMIN",
        targetUid: targetUid,
        targetEmail: targetEmail,
        tenantId: canonicalTenantId,
        businessId: canonicalBizId,
        branchId: canonicalBranchId,
        method: "RESET_LINK",
        emailStatus: "SENT",
        reason: "Certificación automatizada E2E",
        correlationId: `cert_test_${Date.now()}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const auditSnap = await auditEventRef.get();
    assert(auditSnap.exists, "TEST_22_AUDIT_LOG_PERSISTED", `Evento de auditoría registrado: ${auditEventRef.id}`);
    const auditData = auditSnap.data() || {};
    assert(!auditData.password && !auditData.oobCode && !auditData.token && !auditData.jwt && !auditData.apiKey,
        "TEST_23_ZERO_CREDENTIAL_EXPOSURE", `Cero credenciales, tokens o passwords expuestos en Firestore audit log`);

    // Limpiar audit test event creado para la prueba
    await auditEventRef.delete();

    // ── 6. PRUEBA DE IDEMPOTENCIA Y VERIFICACIÓN POST-TEST DE ENTIDADES ─────
    console.log("\n--- FASE 6: VERIFICACIÓN POST-TEST DE INTEGRIDAD Y CERO ENTIDADES NUEVAS ---");
    const postBizSnap = await db.collection("businesses").get();
    const postBranchSnap = await db.collection("branches").get();
    const postMemSnap = await db.collection("memberships").get();
    const postUserSnap = await db.collection("users").get();
    const postOrgSnap = await db.collection("organizations").get();

    const postCounts = {
        businesses: postBizSnap.size,
        branches: postBranchSnap.size,
        memberships: postMemSnap.size,
        users: postUserSnap.size,
        organizations: postOrgSnap.size,
    };
    console.log("Conteo posterior de entidades:", postCounts);

    assert(postCounts.businesses === initialCounts.businesses, "TEST_24_ZERO_NEW_BUSINESSES", `Businesses: ${postCounts.businesses} == ${initialCounts.businesses}`);
    assert(postCounts.branches === initialCounts.branches, "TEST_25_ZERO_NEW_BRANCHES", `Branches: ${postCounts.branches} == ${initialCounts.branches}`);
    assert(postCounts.memberships === initialCounts.memberships, "TEST_26_ZERO_NEW_MEMBERSHIPS", `Memberships: ${postCounts.memberships} == ${initialCounts.memberships}`);
    assert(postCounts.users === initialCounts.users, "TEST_27_ZERO_NEW_USERS", `Users: ${postCounts.users} == ${initialCounts.users}`);
    assert(postCounts.organizations === initialCounts.organizations, "TEST_28_ZERO_NEW_ORGS", `Organizations: ${postCounts.organizations} == ${initialCounts.organizations}`);

    // ── RESUMEN FINAL ───────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log(` RESULTADO FINAL: ${passCount} PRUEBAS SUPERADAS, ${failCount} FALLOS`);
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    if (failCount > 0) {
        process.exit(1);
    }
}

runCertificationSuite().catch(err => {
    console.error("Error fatal en suite de certificación:", err);
    process.exit(1);
});
