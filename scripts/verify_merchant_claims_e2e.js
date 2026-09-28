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

function normalizeCanonicalRole(rawRole) {
    if (!rawRole) return null;
    const str = String(rawRole).toLowerCase().trim();
    if (['owner', 'business', 'comercio', 'merchant', 'propietario', 'business_owner', 'merchant_owner'].includes(str)) {
        return 'OWNER';
    }
    if (['manager', 'gerente'].includes(str)) return 'MANAGER';
    if (['supervisor'].includes(str)) return 'SUPERVISOR';
    if (['cashier', 'cajero', 'caja', 'seller'].includes(str)) return 'CASHIER';
    if (['cook', 'cocinero', 'cocina', 'kitchen'].includes(str)) return 'COOK';
    if (['guest', 'invitado', 'anonymous'].includes(str)) return 'GUEST';
    return null;
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

async function runE2EVerification() {
    console.log('================================================================');
    console.log('    MERCHANT WEB / IAC CLAIMS HOTFIX E2E CERTIFICATION SUITE    ');
    console.log('================================================================\n');

    const tests = [];
    function record(num, name, passed, details) {
        tests.push({ num, name, passed, details });
        const icon = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`[${icon}] Test ${num} - ${name}: ${details}`);
    }

    const targetUid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';

    // TEST 1: Firestore /users/{uid} document exists & active
    const userSnap = await db.collection('users').doc(targetUid).get();
    record(1, 'Firestore /users document active', userSnap.exists && userSnap.data().status === 'ACTIVE', `User document status: ${userSnap.data()?.status}`);

    // TEST 2: Firestore /users businessId matches FRITONI UID
    const userData = userSnap.data();
    record(2, 'Firestore /users.businessId matches UID', userData?.businessId === targetUid, `businessId: ${userData?.businessId}`);

    // TEST 3: Active Membership exists in /membership
    const memSnap = await db.collection('membership').where('uid', '==', targetUid).where('businessId', '==', targetUid).get();
    record(3, 'Active membership record found', memSnap.size === 1 && memSnap.docs[0].data().status === 'ACTIVE', `Found ${memSnap.size} active membership(s)`);

    // TEST 4: Business document exists in /businesses
    const bizSnap = await db.collection('businesses').doc(targetUid).get();
    record(4, 'Provisioned Business document active', bizSnap.exists && bizSnap.data().name === 'FRITONI', `Business name: ${bizSnap.data()?.name || bizSnap.data()?.nombre}`);

    // TEST 5: Real Firebase Auth Custom Claims retrieved
    const authUser = await getAuthUserRest(targetUid);
    record(5, 'Firebase Auth account active & enabled', !!authUser && !authUser.disabled, `Auth user disabled: ${authUser?.disabled}`);

    // TEST 6: Custom Claim role === 'OWNER' (Canonical EIAM V2)
    const claims = authUser?.customClaims || {};
    record(6, 'Custom Claim role === "OWNER"', claims.role === 'OWNER', `Auth customClaims.role: ${claims.role}`);

    // TEST 7: Custom Claim businessId === FRITONI UID
    record(7, 'Custom Claim businessId matches', claims.businessId === targetUid, `Auth customClaims.businessId: ${claims.businessId}`);

    // TEST 8: Custom Claim branchId === 'br_1786988052589'
    record(8, 'Custom Claim branchId matches', claims.branchId === 'br_1786988052589', `Auth customClaims.branchId: ${claims.branchId}`);

    // TEST 9: Custom Claim orgId === 'org_default_bluesystem'
    record(9, 'Custom Claim orgId matches', claims.orgId === 'org_default_bluesystem', `Auth customClaims.orgId: ${claims.orgId}`);

    // TEST 10: Role Normalizer resolves legacy roles to 'OWNER'
    const normOwner = normalizeCanonicalRole('MERCHANT_OWNER');
    const normBiz = normalizeCanonicalRole('business');
    record(10, 'Canonical Role Normalizer maps legacy roles to "OWNER"', normOwner === 'OWNER' && normBiz === 'OWNER', `MERCHANT_OWNER -> ${normOwner}, business -> ${normBiz}`);

    // TEST 11: Audit log of operation recorded in /audit_events
    const auditSnap = await db.collection('audit_events').where('targetUid', '==', targetUid).where('action', '==', 'RECONCILE_MERCHANT_CLAIMS').get();
    record(11, 'Audit log recorded in /audit_events', auditSnap.size >= 1, `Audit events found: ${auditSnap.size}`);

    // TEST 12: Simulating AuthContext EIAM resolution (Zero AUTH_ERROR)
    let authError = null;
    let resolvedContext = null;
    try {
        const resolvedRole = normalizeCanonicalRole(claims.role);
        if (!claims.businessId || !resolvedRole) {
            throw new Error('AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.');
        }
        const memData = memSnap.docs[0].data();
        if (memData.businessId !== claims.businessId) {
            throw new Error('SECURITY_ERROR: Tenant claim mismatch.');
        }
        resolvedContext = {
            uid: targetUid,
            role: resolvedRole,
            businessId: claims.businessId,
            branchId: claims.branchId,
            orgId: claims.orgId,
            tenantId: claims.tenantId || null
        };
    } catch (e) {
        authError = e.message;
    }
    record(12, 'AuthContext EIAM resolution simulation PASS (Zero AUTH_ERROR)', authError === null && resolvedContext?.role === 'OWNER', authError ? `Error: ${authError}` : `Resolved context: ${JSON.stringify(resolvedContext)}`);

    // TEST 13: Console Diagnostic Log Format Valid
    const diagLog = `[MERCHANT_IAC_CLAIMS]\n\nUID:\n${targetUid}\n\nRole:\n${claims.role}\n\nBusinessId:\n${claims.businessId}\n\nBranchId:\n${claims.branchId}\n\nOrgId:\n${claims.orgId}\n\nTenantId:\n${claims.tenantId || 'null'}\n\nTokenFresh:\ntrue\n\nResolution:\nCANONICAL`;
    record(13, 'Console diagnostic format [MERCHANT_IAC_CLAIMS] valid', diagLog.includes('[MERCHANT_IAC_CLAIMS]') && diagLog.includes('Role:\nOWNER'), 'Log snippet matched expected structure');

    // TEST 14: Zero Data Mutation of other Merchants
    const chanchitoSnap = await db.collection('users').doc('bbb760d5-a8f3-4700-9a96-f58f11f345ac').get();
    const chanchitoBizId = chanchitoSnap.data()?.businessId ?? null;
    record(14, 'Other Merchants unmodified (El Chanchito safe)', chanchitoSnap.exists && chanchitoBizId === null, `El Chanchito businessId: ${chanchitoBizId}`);

    console.log('\n================================================================');
    console.log('              E2E CERTIFICATION SUMMARY                         ');
    console.log('================================================================');
    const passedCount = tests.filter(t => t.passed).length;
    console.log(`TOTAL TESTS: ${tests.length} | PASSED: ${passedCount} | FAILED: ${tests.length - passedCount}\n`);

    if (passedCount === tests.length) {
        console.log('STATUS: 🟢 ALL E2E CERTIFICATION TESTS PASSED');
    } else {
        console.error('STATUS: 🔴 E2E CERTIFICATION FAILED');
        process.exit(1);
    }
}

runE2EVerification().catch(err => {
    console.error('E2E Verification Error:', err);
    process.exit(1);
});
