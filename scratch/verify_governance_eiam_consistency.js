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

async function runGovernanceConsistencySuite() {
    console.log('================================================================================');
    console.log('  SPRINT 17.5.2 — GOVERNANCE IDENTITY CONSISTENCY & LEGACY DRIFT VERIFICATION  ');
    console.log('================================================================================\n');

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

    const certifiedBusinesses = [
        {
            name: 'El Chanchito',
            businessId: 'bbb760d5-a8f3-4700-9a96-f58f11f345ac',
            ownerUid: 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2',
            orgId: '1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8',
            primaryBranchId: '30945c9c-3aee-4e45-b35d-a998b57cf2fa'
        },
        {
            name: 'FRITONI',
            businessId: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2',
            ownerUid: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2',
            orgId: 'org_default_bluesystem',
            primaryBranchId: 'br_1786988052589'
        },
        {
            name: 'Variedades TECNOHOME',
            businessId: 'e7dc911e-e587-4be9-a741-7d9d9828011f',
            ownerUid: 'XWNzPT5p6fbf7reFdFBNTZoQrY42',
            orgId: '75b145e5-17ec-4248-a085-c962a408db86',
            primaryBranchId: '794f7c02-8077-40a8-b260-2fdd27a6f35d'
        }
    ];

    // ──────────────────────────────────────────────────────────────────────────
    // BLOQUE 1: CONSISTENCIA CANÓNICA DE COMERCIOS CERTIFICADOS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- BLOQUE 1: CONSISTENCIA EIAM DE COMERCIOS CERTIFICADOS ---');

    for (const biz of certifiedBusinesses) {
        console.log(`\nVerificando Comercio: ${biz.name} (${biz.businessId})...`);

        // 1. /businesses doc
        const bDoc = await db.collection('businesses').doc(biz.businessId).get();
        assertTest(bDoc.exists && (bDoc.data()?.status === 'ACTIVE' || bDoc.data()?.lifecycleStatus === 'ACTIVE'), `[${biz.name}] /businesses exists & status == ACTIVE`);

        // 2. /membership doc
        const memSnap = await db.collection('membership')
            .where('businessId', '==', biz.businessId)
            .where('uid', '==', biz.ownerUid)
            .get();
        
        assertTest(!memSnap.empty, `[${biz.name}] /membership exists for ownerUid=${biz.ownerUid}`);
        const mem = memSnap.empty ? {} : memSnap.docs[0].data();
        assertTest(mem.status === 'ACTIVE', `[${biz.name}] /membership status == 'ACTIVE'`);
        assertTest(mem.role === 'MERCHANT_OWNER', `[${biz.name}] /membership role == 'MERCHANT_OWNER'`);
        assertTest(Array.isArray(mem.permissions) && mem.permissions.length === 10, `[${biz.name}] /membership has 10 canonical permissions`);

        // 3. /branches
        const brDoc = await db.collection('branches').doc(biz.primaryBranchId).get();
        assertTest(brDoc.exists && brDoc.data()?.businessId === biz.businessId, `[${biz.name}] Primary branch ${biz.primaryBranchId} exists and matches businessId`);

        // 4. Custom Claims
        const authUser = await lookupUser(biz.ownerUid);
        const claims = authUser && authUser.customAttributes ? JSON.parse(authUser.customAttributes) : {};
        assertTest(claims.role === 'MERCHANT_OWNER', `[${biz.name}] Firebase Auth Claims role == 'MERCHANT_OWNER'`);
        assertTest(claims.businessId === biz.businessId, `[${biz.name}] Firebase Auth Claims businessId == '${biz.businessId}'`);
        assertTest(claims.orgId === biz.orgId, `[${biz.name}] Firebase Auth Claims orgId == '${biz.orgId}'`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BLOQUE 2: DETECCIÓN DE DRIFT Y RESILENCIA EN GOVERNANCE CENTER
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- BLOQUE 2: AUDITORÍA DE DRIFT & GOBERNANZA EIAM ---');

    // 1. Simulación de Resolver de Identidad Empresarial en Governance Center
    function resolveGovernanceMerchantIdentity(businessDoc, membershipsList) {
        const bizId = businessDoc.id;
        const activeMemberships = membershipsList.filter(m => m.businessId === bizId && m.status === 'ACTIVE');

        if (activeMemberships.length === 0) {
            return {
                status: 'IDENTITY_DRIFT',
                owner: null,
                activeCount: 0,
                isCompliant: false,
                reason: 'No active /membership found for business'
            };
        }

        const ownerMem = activeMemberships.find(m => m.role === 'MERCHANT_OWNER');
        return {
            status: 'CANONICAL_EIAM_COMPLIANT',
            owner: ownerMem || activeMemberships[0],
            activeCount: activeMemberships.length,
            isCompliant: true
        };
    }

    // Probar comercio canónico (FRITONI)
    const allMembershipsSnap = await db.collection('membership').get();
    const allMemberships = [];
    allMembershipsSnap.forEach(d => allMemberships.push({ id: d.id, ...d.data() }));

    const fritoniBizDoc = await db.collection('businesses').doc('dlRY2ZVUqPR2Fxoc3cazcOxxRJg2').get();
    const fritoniGovResult = resolveGovernanceMerchantIdentity(fritoniBizDoc, allMemberships);

    assertTest(fritoniGovResult.isCompliant === true, 'Governance Center resolves FRITONI as CANONICAL_EIAM_COMPLIANT');
    assertTest(fritoniGovResult.owner.uid === 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2', 'Governance Center resolves FRITONI owner from /membership SSOT');

    // Probar comercio sin membresía (Legacy Drift)
    const driftBizMock = { id: 'legacy_biz_drift_test', data: () => ({ name: 'Comercio Antiguo Sin Membership' }) };
    const driftResult = resolveGovernanceMerchantIdentity(driftBizMock, allMemberships);
    assertTest(driftResult.status === 'IDENTITY_DRIFT', 'Governance Center flags business without membership as IDENTITY_DRIFT');
    assertTest(driftResult.owner === null, 'Governance Center does NOT display owner when membership is missing (No false positives)');

    // Probar membresía con status 'TERMINATED'
    const terminatedMemMock = [{ businessId: 'legacy_terminated_biz', uid: 'user_123', status: 'TERMINATED', role: 'MERCHANT_OWNER' }];
    const terminatedResult = resolveGovernanceMerchantIdentity({ id: 'legacy_terminated_biz' }, terminatedMemMock);
    assertTest(terminatedResult.status === 'IDENTITY_DRIFT', 'Terminated membership is excluded from active governance count');

    console.log('\n================================================================================');
    console.log(`  RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runGovernanceConsistencySuite().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
