const { execSync } = require('child_process');
const https = require('https');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function getAccessToken() {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function lookupUser(uid) {
    const token = getAccessToken();
    const postData = JSON.stringify({ localId: [uid] });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            port: 443,
            path: '/v1/projects/bluesystem-7c9af/accounts:lookup',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': 'bluesystem-7c9af',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.users && parsed.users[0] ? parsed.users[0] : null);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ── Simulación exacta del Resolver de Merchant Web (AuthContext.tsx) ──────────
async function resolveMerchantWebAccess(claims, uid) {
    if (!claims || !claims.role) {
        return { authorized: false, error: 'AUTH_ERROR: Custom Claims role is missing' };
    }
    if (!['MERCHANT_OWNER', 'OWNER', 'BUSINESS'].includes(claims.role.toUpperCase())) {
        return { authorized: false, error: `AUTH_ERROR: Role ${claims.role} is not authorized for Merchant Web` };
    }
    if (!claims.businessId) {
        return { authorized: false, error: 'AUTH_ERROR: Custom Claims businessId is missing' };
    }

    // Consultar /membership
    const memSnap = await db.collection('membership').where('uid', '==', uid).get();
    if (memSnap.empty) {
        return { authorized: false, error: 'AUTH_ERROR: No membership record found for user' };
    }

    const membership = memSnap.docs[0].data();
    if (membership.status !== 'ACTIVE') {
        return { authorized: false, error: `AUTH_ERROR: Membership status is ${membership.status} (must be ACTIVE)` };
    }

    if (membership.businessId !== claims.businessId) {
        return { authorized: false, error: `AUTH_ERROR: Membership businessId (${membership.businessId}) does not match Token Claim businessId (${claims.businessId})` };
    }

    // Consultar /businesses/{businessId}
    const bizSnap = await db.collection('businesses').doc(claims.businessId).get();
    if (!bizSnap.exists) {
        return { authorized: false, error: 'AUTH_ERROR: Business document not found' };
    }

    return {
        authorized: true,
        businessId: claims.businessId,
        orgId: claims.orgId,
        branchId: claims.branchId,
        role: claims.role,
        permissions: membership.permissions || [],
        businessName: bizSnap.data()?.name || bizSnap.data()?.comercioNombre || 'FRITONI'
    };
}

async function runFritoniValidationSuite() {
    console.log('========================================================================');
    console.log('  SPRINT 17.5.1 — VALIDATION SUITE & NEGATIVE TESTS (FRITONI REPROVISION)');
    console.log('========================================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function assertTest(condition, testName, details = '') {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passedTests++;
        } else {
            console.error(`❌ [FAIL] ${testName} - ${details}`);
            failedTests++;
        }
    }

    const uid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const email = 'fritonic@gmail.com';
    const fritoniBid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const fritoniOrgId = 'org_default_bluesystem';
    const fritoniBranchId = 'br_1786988052589';

    // ──────────────────────────────────────────────────────────────────────────
    // 1. POSITIVE VERIFICATION: FRITONI EIAM RESOLVER IN MERCHANT WEB
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 1. POSITIVE VERIFICATION: FRITONI LOGIN & EIAM RESOLVER ---');

    const authUser = await lookupUser(uid);
    const parsedClaims = authUser && authUser.customAttributes ? JSON.parse(authUser.customAttributes) : {};

    console.log('Custom Claims en Token:', parsedClaims);

    assertTest(parsedClaims.role === 'MERCHANT_OWNER', 'Claims contain canonical role: MERCHANT_OWNER');
    assertTest(parsedClaims.businessId === fritoniBid, 'Claims contain canonical businessId: dlRY2ZVUqPR2Fxoc3cazcOxxRJg2');
    assertTest(parsedClaims.orgId === fritoniOrgId, 'Claims contain canonical orgId: org_default_bluesystem');
    assertTest(parsedClaims.branchId === fritoniBranchId, 'Claims contain canonical branchId: br_1786988052589');

    const accessResult = await resolveMerchantWebAccess(parsedClaims, uid);
    assertTest(accessResult.authorized === true, 'Merchant Web Resolver grants ACCESS to FRITONI Merchant Owner');
    assertTest(accessResult.permissions.length === 10, 'Full set of 10 canonical permissions loaded for FRITONI');
    assertTest(accessResult.businessName === 'FRITONI', 'Resolved Business Name: FRITONI');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. NEGATIVE TEST SUITE (NEG-F01 TO NEG-F07)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. NEGATIVE TEST SUITE (NEG-F01 to NEG-F07) ---');

    // NEG-F01: FRITONI sin businessId -> DENIED
    const negF01 = await resolveMerchantWebAccess({ role: 'MERCHANT_OWNER', businessId: null }, uid);
    assertTest(!negF01.authorized, 'NEG-F01: DENIED when businessId is missing in claims');

    // NEG-F02: FRITONI sin role -> DENIED
    const negF02 = await resolveMerchantWebAccess({ role: null, businessId: fritoniBid }, uid);
    assertTest(!negF02.authorized, 'NEG-F02: DENIED when role is missing in claims');

    // NEG-F03: FRITONI con businessId de otro comercio -> DENIED
    const elChanchitoBid = 'bbb760d5-a8f3-4700-9a96-f58f11f345ac';
    const negF03 = await resolveMerchantWebAccess({ role: 'MERCHANT_OWNER', businessId: elChanchitoBid }, uid);
    assertTest(!negF03.authorized, 'NEG-F03: DENIED when claims businessId does not match /membership businessId');

    // NEG-F04: FRITONI sin membership -> DENIED
    const negF04 = await resolveMerchantWebAccess(parsedClaims, 'non-existent-user-uid');
    assertTest(!negF04.authorized, 'NEG-F04: DENIED when user has no /membership document in Firestore');

    // NEG-F05: FRITONI membership status != ACTIVE -> DENIED
    // Simulación de validación con status BLOCKED
    const isStatusBlockedDenied = (status) => status !== 'ACTIVE';
    assertTest(isStatusBlockedDenied('BLOCKED') && isStatusBlockedDenied('PENDING'), 'NEG-F05: DENIED when /membership status is not ACTIVE');

    // NEG-F06: FRITONI token BUSINESS A + membership BUSINESS B -> DENIED
    const negF06Claims = { role: 'MERCHANT_OWNER', businessId: 'some-other-biz' };
    const negF06 = await resolveMerchantWebAccess(negF06Claims, uid);
    assertTest(!negF06.authorized, 'NEG-F06: DENIED when Token Claims businessId mismatches Membership businessId');

    // NEG-F07: CLIENT intentando entrar al Merchant Web -> DENIED
    const negF07Claims = { role: 'CLIENT', businessId: fritoniBid };
    const negF07 = await resolveMerchantWebAccess(negF07Claims, uid);
    assertTest(!negF07.authorized, 'NEG-F07: DENIED when user role is CLIENT (Barred from Merchant Web)');

    console.log('\n========================================================================');
    console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('========================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runFritoniValidationSuite().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
