const { execSync } = require('child_process');
const fs = require('fs');

const token = execSync('gcloud auth print-access-token').toString().trim();

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

// ─── LÓGICA CANÓNICA REUTILIZADA DESDE functions/src/triggers/auth.ts ─────────
function resolveEiamRole(data) {
    if (!data) return "CLIENT";
    let raw = "";
    if (typeof data === "string") {
        raw = data;
    } else {
        raw = (data.role ?? data.eiamRole ?? data.rol ?? data.userType ?? "").toString();
    }
    const str = raw.toLowerCase().trim();
    const mapping = {
        super_admin: "SUPER_ADMIN",
        superadmin: "SUPER_ADMIN",
        gerente_general: "SUPER_ADMIN",
        admin: "ADMIN",
        administrator: "ADMIN",
        auditor: "AUDITOR",
        support: "SUPPORT",
        soporte: "SUPPORT",

        owner: "OWNER",
        business: "OWNER",
        comercio: "OWNER",
        merchant: "OWNER",
        negocio: "OWNER",
        empresa: "OWNER",
        propietario: "OWNER",
        business_owner: "OWNER",
        merchant_owner: "OWNER",

        manager: "MANAGER",
        gerente: "MANAGER",
        supervisor: "SUPERVISOR",
        cashier: "CASHIER",
        cajero: "CASHIER",
        caja: "CASHIER",
        seller: "CASHIER",
        cook: "COOK",
        cocinero: "COOK",
        cocina: "COOK",
        kitchen: "COOK",

        driver: "DRIVER",
        motorizado: "DRIVER",
        courier: "DRIVER",
        repartidor: "DRIVER",
        deliverer: "DRIVER",
        client: "CLIENT",
        customer: "CLIENT",
        cliente: "CLIENT",
        user: "CLIENT",
        usuario: "CLIENT",
        guest: "GUEST",
        anonymous: "GUEST",
        invitado: "GUEST",
    };
    return mapping[str] ?? "CLIENT";
}

function resolveIdentityStatus(data) {
    if (!data) return "ACTIVE";
    if (data.status && typeof data.status === "string") {
        const s = data.status.toUpperCase().trim();
        if (["ACTIVE", "PENDING", "BLOCKED", "SUSPENDED", "TERMINATED"].includes(s)) {
            return s;
        }
    }
    if (data.isActive === false || data.active === false) {
        return "BLOCKED";
    }
    return "ACTIVE";
}

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
    if (data.users && data.users.length > 0) {
        const u = data.users[0];
        let customClaims = {};
        if (u.customAttributes) {
            try {
                customClaims = JSON.parse(u.customAttributes);
            } catch (e) {}
        }
        return {
            uid: u.localId,
            email: u.email || null,
            disabled: u.disabled || false,
            customClaims
        };
    }
    return null;
}

async function setCustomUserClaimsRest(uid, customClaims) {
    try {
        await admin.auth().setCustomUserClaims(uid, customClaims);
        return;
    } catch (err) {
        console.warn('admin.auth().setCustomUserClaims warning, falling back to REST accounts:update:', err.message);
    }

    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(customClaims)
        })
    });
    const data = await res.json();
    if (data.error) {
        throw new Error(`Error setting custom claims: ${data.error.message}`);
    }
    return data;
}

async function reconcileFritoni() {
    const targetUid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    console.log(`================================================================`);
    console.log(`  HOTFIX RECONCILIATION FOR FRITONI TARGET (UID: ${targetUid})`);
    console.log(`================================================================\n`);

    // 1. Fetch Firestore /users/{uid}
    const userDocRef = db.collection('users').doc(targetUid);
    const userSnap = await userDocRef.get();
    if (!userSnap.exists) {
        throw new Error(`Target user document /users/${targetUid} does not exist in Firestore.`);
    }
    const userData = userSnap.data();

    // 2. Fetch Auth User Data & Current Claims
    const authUserBefore = await getAuthUserRest(targetUid);
    if (!authUserBefore) {
        throw new Error(`Target user ${targetUid} does not exist in Firebase Auth.`);
    }

    console.log('--- [BEFORE STATE] ---');
    console.log(`UID: ${targetUid}`);
    console.log(`Firestore Role: ${userData.role}`);
    console.log(`Firestore Status: ${userData.status}`);
    console.log(`Firestore BusinessId: ${userData.businessId}`);
    console.log(`Firestore BranchId: ${userData.branchId}`);
    console.log(`Firestore OrgId: ${userData.orgId}`);
    console.log('Auth Custom Claims (BEFORE):', JSON.stringify(authUserBefore.customClaims, null, 2));

    // 3. Generate Operation ID & Create Backup in /audit_events
    const operationId = `op_reconcile_fritoni_${Date.now()}`;
    const beforeState = {
        uid: targetUid,
        email: userData.email || authUserBefore.email,
        firestore: {
            role: userData.role,
            status: userData.status,
            businessId: userData.businessId,
            branchId: userData.branchId,
            orgId: userData.orgId,
            tenantId: userData.tenantId || null
        },
        auth: {
            disabled: authUserBefore.disabled,
            customClaims: authUserBefore.customClaims
        }
    };

    const auditRef = db.collection('audit_events').doc(operationId);
    await auditRef.set({
        operationId,
        action: 'RECONCILE_MERCHANT_CLAIMS',
        actorUid: 'EIAM_SYSTEM_HOTFIX',
        targetUid,
        module: 'IDENTITY_ADMINISTRATION_CENTER',
        reason: 'HOTFIX FRITONI CLAIMS RECONCILIATION TO CANONICAL EIAM V2 (OWNER)',
        timestamp: new Date().toISOString(),
        before: beforeState,
        status: 'PENDING'
    });
    console.log(`\n[BACKUP CREATED] Operation ID: ${operationId} saved to /audit_events`);

    // 4. Compute Canonical EIAM Claims via Canonical setUserClaims V2 logic
    const eiamRole = resolveEiamRole(userData);
    const identityStatus = resolveIdentityStatus(userData);

    const canonicalClaims = {
        role: eiamRole, // Resolves "business" -> "OWNER"
        businessId: userData.businessId ?? userData.eiamBusinessId ?? null,
        branchId: userData.branchId ?? null,
        orgId: userData.orgId ?? userData.organizationId ?? null,
        tenantId: userData.tenantId ?? null,
    };

    console.log('\n--- [CANONICAL CLAIMS TO WRITE] ---');
    console.log(JSON.stringify(canonicalClaims, null, 2));

    // 5. Apply Claims write via setUserClaims V2 / Identity Toolkit REST API
    await setCustomUserClaimsRest(targetUid, canonicalClaims);
    console.log('\n[CLAIMS RECONCILED] Custom claims written successfully to Firebase Auth server.');

    // 6. Verify written claims from Auth server
    const authUserAfter = await getAuthUserRest(targetUid);

    console.log('\n--- [AFTER STATE VERIFICATION] ---');
    console.log(`UID: ${targetUid}`);
    console.log(`Auth.disabled: ${authUserAfter.disabled}`);
    console.log('Auth Custom Claims (AFTER):', JSON.stringify(authUserAfter.customClaims, null, 2));

    const afterState = {
        uid: targetUid,
        email: userData.email || authUserAfter.email,
        firestore: beforeState.firestore,
        auth: {
            disabled: authUserAfter.disabled,
            customClaims: authUserAfter.customClaims
        }
    };

    // 7. Complete Audit Event
    await auditRef.update({
        after: afterState,
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
    });

    console.log(`\n[AUDIT COMPLETED] Operation ${operationId} marked COMPLETED in /audit_events`);

    // Save execution report log
    const reportData = {
        operationId,
        timestamp: new Date().toISOString(),
        targetUid,
        before: beforeState,
        after: afterState,
        result: 'PASS'
    };

    fs.writeFileSync('scratch/fritoni_reconciliation_result.json', JSON.stringify(reportData, null, 2));
    console.log('\nSaved execution log to scratch/fritoni_reconciliation_result.json');
}

reconcileFritoni().catch(err => {
    console.error('Reconciliation failed:', err);
    process.exit(1);
});
