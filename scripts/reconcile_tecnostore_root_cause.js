const { execSync } = require('child_process');
const path = require('path');

const token = execSync('gcloud auth print-access-token').toString().trim();
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function getAuthUserRest(uid) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ localId: [uid] })
    });
    const data = await res.json();
    return data.users ? data.users[0] : null;
}

async function updateAuthUserRest(uid, updates) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: uid,
            disableUser: updates.disabled === true ? true : (updates.disabled === false ? false : undefined),
            customAttributes: updates.customClaims ? JSON.stringify(updates.customClaims) : undefined
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(`Error updating Auth user: ${data.error.message}`);
    return data;
}

async function repairTecnostore() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       REPARACIÓN ROOT-CAUSE ATÓMICA DE TECNOSTORE (INVARIANTE EIAM)          ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    const ownerUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    const businessId = "biz_canonical_tecnostore";
    const tenantId = "ten_bluesystem_core";
    const orgId = "org_1787895553815";
    const branchId = "br_canonical_tecnostore_main";
    const membershipId = "mem_canonical_tecnostore_owner";

    // 1. Snapshot previo de Auth
    const preAuth = await getAuthUserRest(ownerUid);
    console.log("1. Estado previo Auth:", {
        uid: preAuth?.localId,
        email: preAuth?.email,
        disabled: preAuth?.disabled,
        customAttributes: preAuth?.customAttributes
    });

    // 2. Reparar Auth (disabled: false + Custom Claims canónicos)
    const canonicalClaims = {
        role: "OWNER",
        businessId: businessId,
        branchId: branchId,
        orgId: orgId,
        tenantId: tenantId,
        eiamVer: 3
    };

    await updateAuthUserRest(ownerUid, {
        disabled: false,
        customClaims: canonicalClaims
    });
    console.log("✅ Firebase Auth habilitado (disabled -> false) y Claims actualizados.");

    // 3. Reparar /users/{ownerUid}
    await db.collection("users").doc(ownerUid).set({
        uid: ownerUid,
        nombre: "Admin Tecnostore",
        name: "Admin Tecnostore",
        email: "tecnostore@bluesystemdelivery.com",
        telefono: "82397401",
        phone: "82397401",
        userType: "business",
        role: "OWNER",
        eiamRole: "OWNER",
        rol: "owner",
        businessId: businessId,
        tenantId: tenantId,
        orgId: orgId,
        branchId: branchId,
        status: "ACTIVE",
        lifecycleStatus: "ACTIVE",
        active: true,
        isActive: true,
        isDeleted: false,
        deletedAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("✅ Firestore /users/{ownerUid} restaurado a ACTIVE.");

    // 4. Asegurar /businesses/{businessId}
    await db.collection("businesses").doc(businessId).set({
        businessId: businessId,
        id: businessId,
        ownerUid: ownerUid,
        status: "ACTIVE",
        lifecycleStatus: "ACTIVE",
        isActive: true,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("✅ Firestore /businesses/{businessId} verificado ACTIVE.");

    // 5. Asegurar /membership
    await db.collection("membership").doc(membershipId).set({
        membershipId: membershipId,
        uid: ownerUid,
        businessId: businessId,
        tenantId: tenantId,
        orgId: orgId,
        branchId: branchId,
        role: "MERCHANT_OWNER",
        status: "ACTIVE",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("✅ Firestore /membership verificado ACTIVE.");

    // 6. Registrar Evento de Auditoría
    await db.collection("audit_events").add({
        event: "MERCHANT_IDENTITY_RECONCILIATION",
        action: "MERCHANT_IDENTITY_RECONCILIATION",
        domain: "IDENTITY",
        businessId: businessId,
        ownerUid: ownerUid,
        tenantId: tenantId,
        businessStatus: "ACTIVE",
        isBusinessActive: true,
        previousAuthDisabled: preAuth?.disabled ?? true,
        targetAuthDisabled: false,
        userUpdated: true,
        authUpdated: true,
        claimsUpdated: true,
        triggeredBy: "ADMIN_ROOT_CAUSE_REPAIR_ENGINE",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Evento de auditoría registrado.");

    // 7. Verificación Posterior
    const postAuth = await getAuthUserRest(ownerUid);
    const postUser = (await db.collection("users").doc(ownerUid).get()).data();
    const postBiz = (await db.collection("businesses").doc(businessId).get()).data();

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log("       VERIFICACIÓN DE INVARIANTE POST-REPARACIÓN                              ");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log(`- Auth disabled: ${postAuth?.disabled} (Esperado: false) -> ${postAuth?.disabled === false ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`- User status: ${postUser?.status} (Esperado: ACTIVE) -> ${postUser?.status === 'ACTIVE' ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`- User isActive: ${postUser?.isActive} (Esperado: true) -> ${postUser?.isActive === true ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`- Biz status: ${postBiz?.status} (Esperado: ACTIVE) -> ${postBiz?.status === 'ACTIVE' ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`- Biz isActive: ${postBiz?.isActive} (Esperado: true) -> ${postBiz?.isActive === true ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`- Claims: ${postAuth?.customAttributes}\n`);
}

repairTecnostore().catch(err => {
    console.error("Error repairing Tecnostore:", err);
    process.exit(1);
});
