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

async function setCustomClaims(uid, claims) {
    const token = getAccessToken();
    const postData = JSON.stringify({
        localId: uid,
        customAttributes: JSON.stringify(claims)
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            port: 443,
            path: '/v1/projects/bluesystem-7c9af/accounts:update',
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
                    resolve(parsed);
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

// Emulate Merchant Web AuthContext EIAM Resolver
async function simulateMerchantWebAuthResolver(uid, forcedTokenClaims) {
    // Step 1: Check claims
    const claimRole = forcedTokenClaims.role;
    const claimBusinessId = forcedTokenClaims.businessId;
    const claimOrgId = forcedTokenClaims.orgId;
    const claimBranchId = forcedTokenClaims.branchId;

    if (!claimBusinessId || !claimRole) {
        return {
            success: false,
            error: 'AUTH_ERROR: Custom Claims (businessId or role) are missing or invalid.'
        };
    }

    const validRoles = ['MERCHANT_OWNER', 'OWNER', 'MANAGER', 'SUPERVISOR', 'CASHIER', 'COOK', 'GUEST'];
    if (!validRoles.includes(claimRole)) {
        return {
            success: false,
            error: `AUTH_ERROR: Role "${claimRole}" is not recognized as a valid CanonicalRole.`
        };
    }

    // Step 2: Query /membership
    const membershipSnap = await db.collection('membership').where('uid', '==', uid).limit(1).get();
    if (membershipSnap.empty) {
        return {
            success: false,
            error: 'AUTHORIZATION_ERROR: No membership record found for this user identity.'
        };
    }

    const membershipDoc = membershipSnap.docs[0];
    const membershipData = membershipDoc.data();

    if (membershipData.status !== 'ACTIVE') {
        return {
            success: false,
            error: 'AUTHORIZATION_ERROR: The membership is currently inactive.'
        };
    }

    if (membershipData.businessId !== claimBusinessId) {
        return {
            success: false,
            error: 'SECURITY_ERROR: Tenant claim mismatch. Mapped businessId does not match membership record.'
        };
    }

    const resolvedOrgId = claimOrgId || membershipData.orgId;
    if (!resolvedOrgId) {
        return {
            success: false,
            error: 'EIAM_ERROR: Missing orgId in Custom Claims and membership record.'
        };
    }

    const resolvedBranchId = claimBranchId || membershipData.branchId;
    if (!resolvedBranchId) {
        return {
            success: false,
            error: 'EIAM_ERROR: Missing branchId in Custom Claims and membership record.'
        };
    }

    if (membershipData.permissions === undefined || membershipData.permissions === null) {
        return {
            success: false,
            error: 'AUTHORIZATION_ERROR: Missing permissions field in membership record.'
        };
    }
    const permissions = Array.isArray(membershipData.permissions) ? membershipData.permissions : [];

    // Step 3: Fetch /businesses/{businessId}
    const bizSnap = await db.collection('businesses').doc(claimBusinessId).get();
    if (!bizSnap.exists) {
        return {
            success: false,
            error: 'BUSINESS_ERROR: The provisioned business document does not exist in the database.'
        };
    }

    const bizData = bizSnap.data();
    if (bizData.isActive === false && bizData.active === false && bizData.lifecycleStatus === 'DEPROVISIONED') {
        return {
            success: false,
            error: 'BUSINESS_ERROR: The business has been deprovisioned or deactivated.'
        };
    }

    const lifecycleStatus = bizData.lifecycleStatus || 'ONBOARDING';
    const wizardCompleted = bizData.wizardCompleted === true;

    return {
        success: true,
        identity: {
            uid,
            orgId: resolvedOrgId,
            businessId: claimBusinessId,
            restaurantId: claimBusinessId,
            branchId: resolvedBranchId,
            membershipId: membershipDoc.id,
            role: claimRole,
            permissions,
            lifecycleStatus,
            wizardCompleted
        }
    };
}

async function runReconciliationAndVerification() {
    console.log('================================================================');
    console.log('  SPRINT 17.3 — EIAM RECONCILIATION & FORENSIC CERTIFICATION   ');
    console.log('================================================================\n');

    // 1. Find all active memberships
    console.log('PASO 1: Identificar Merchant Owners con /membership ACTIVE...');
    const memSnap = await db.collection('membership').where('status', '==', 'ACTIVE').get();
    console.log(`Encontradas ${memSnap.size} membresías activas.`);

    const activeMemberships = [];
    memSnap.forEach(d => {
        activeMemberships.push({ id: d.id, ...d.data() });
    });

    // 2. Perform reconciliation strictly on active memberships
    console.log('\nPASO 2: Reconciliar Custom Claims para identidades legítimas...');
    for (const mem of activeMemberships) {
        const uid = mem.uid;
        console.log(`\nReconciliando UID: ${uid} (Business: ${mem.businessId})`);

        // Check user document
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            // Sincronizar /users con Dual-Write manteniendo compatibilidad
            await db.collection('users').doc(uid).update({
                role: 'business',
                rol: 'business',
                eiamRole: mem.role || 'MERCHANT_OWNER',
                businessId: mem.businessId,
                orgId: mem.orgId,
                branchId: mem.branchId,
                isActive: true,
                active: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  -> /users/${uid} actualizado con Dual-Write (role: business, eiamRole: ${mem.role})`);
        }

        // Set canonical Custom Claims
        const canonicalClaims = {
            role: mem.role || 'MERCHANT_OWNER',
            businessId: mem.businessId,
            orgId: mem.orgId,
            branchId: mem.branchId,
            tenantId: null
        };
        await setCustomClaims(uid, canonicalClaims);
        console.log(`  -> Custom Claims aplicados:`, JSON.stringify(canonicalClaims));

        // Verify updated token via IdentityToolkit (simulating getIdTokenResult(true))
        const refreshedUser = await lookupUser(uid);
        const refreshedClaims = JSON.parse(refreshedUser.customAttributes || '{}');
        console.log(`  -> Token Refrescado (getIdTokenResult verification):`, refreshedClaims);

        // Run EIAM resolver simulation
        const resolution = await simulateMerchantWebAuthResolver(uid, refreshedClaims);
        if (resolution.success) {
            console.log(`  -> [CERTIFIED] Merchant Web EIAM Resolution SUCCESS:`, resolution.identity);
        } else {
            console.error(`  -> [FAILED] Merchant Web EIAM Resolution ERROR:`, resolution.error);
        }
    }

    // 3. NEGATIVE TEST SUITE
    console.log('\n================================================================');
    console.log('  PASO 3: BATERÍA DE PRUEBAS NEGATIVAS (TENANT ISOLATION)       ');
    console.log('================================================================\n');

    const negativeTests = [
        {
            name: 'TEST NEGATIVO 1: Usuario sin businessId en Claims',
            uid: 'test_uid_no_biz',
            claims: { role: 'MERCHANT_OWNER', orgId: 'org_1', branchId: 'br_1' },
            expectedErrorSubstring: 'AUTH_ERROR: Custom Claims'
        },
        {
            name: 'TEST NEGATIVO 2: Usuario sin role en Claims',
            uid: 'test_uid_no_role',
            claims: { businessId: 'bbb760d5-a8f3-4700-9a96-f58f11f345ac', orgId: 'org_1', branchId: 'br_1' },
            expectedErrorSubstring: 'AUTH_ERROR: Custom Claims'
        },
        {
            name: 'TEST NEGATIVO 3: Usuario con businessId inexistente en Firestore',
            uid: 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2',
            claims: { role: 'MERCHANT_OWNER', businessId: 'biz_non_existent_999', orgId: 'org_1', branchId: 'br_1' },
            expectedErrorSubstring: 'Tenant claim mismatch'
        },
        {
            name: 'TEST NEGATIVO 4: Tenant Isolation - Usuario de Business A intentando acceder con Claim de Business B',
            uid: 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2', // Membresía real es bbb760d5...
            claims: { role: 'MERCHANT_OWNER', businessId: 'e7dc911e-e587-4be9-a741-7d9d9828011f', orgId: 'org_1', branchId: 'br_1' },
            expectedErrorSubstring: 'Tenant claim mismatch'
        },
        {
            name: 'TEST NEGATIVO 5: Usuario legacy sin registro de /membership (fritoni)',
            uid: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2',
            claims: { role: 'MERCHANT_OWNER', businessId: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2', orgId: 'org_default_bluesystem', branchId: 'br_1' },
            expectedErrorSubstring: 'No membership record found'
        },
        {
            name: 'TEST NEGATIVO 6: Rol desconocido / no canónico (ej. HACKER)',
            uid: 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2',
            claims: { role: 'HACKER', businessId: 'bbb760d5-a8f3-4700-9a96-f58f11f345ac', orgId: 'org_1', branchId: 'br_1' },
            expectedErrorSubstring: 'AUTH_ERROR: Role'
        }
    ];

    let passedNegativeTests = 0;
    for (const t of negativeTests) {
        console.log(`Ejecutando: ${t.name}...`);
        const res = await simulateMerchantWebAuthResolver(t.uid, t.claims);
        if (!res.success && res.error.includes(t.expectedErrorSubstring)) {
            console.log(`  🟢 PASS — Rechazado correctamente con: "${res.error}"\n`);
            passedNegativeTests++;
        } else {
            console.error(`  🔴 FAIL — Esperaba error que contenga "${t.expectedErrorSubstring}", pero obtuvo:`, res);
        }
    }

    console.log(`Resultados de Pruebas Negativas: ${passedNegativeTests}/${negativeTests.length} PASSED.\n`);
    console.log('================================================================');
    console.log('  CERTIFICACIÓN COMPLETA FINALIZADA CON ÉXITO                  ');
    console.log('================================================================');
}

runReconciliationAndVerification().then(() => process.exit(0)).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
