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

async function runGovernanceDriftAudit() {
    console.log('========================================================================');
    console.log('  SPRINT 17.5.2 — GOVERNANCE IDENTITY CONSISTENCY & DRIFT AUDIT         ');
    console.log('========================================================================\n');

    // 1. Get all businesses
    const bizSnap = await db.collection('businesses').get();
    console.log(`[Total Businesses in Firestore]: ${bizSnap.size}\n`);

    // 2. Get all memberships
    const memSnap = await db.collection('membership').get();
    const memberships = [];
    memSnap.forEach(d => memberships.push({ id: d.id, ...d.data() }));

    // 3. Get all branches
    const brSnap = await db.collection('branches').get();
    const branches = [];
    brSnap.forEach(d => branches.push({ id: d.id, ...d.data() }));

    // 4. Get all organizations
    const orgSnap = await db.collection('organizations').get();
    const organizations = [];
    orgSnap.forEach(d => organizations.push({ id: d.id, ...d.data() }));

    const auditResults = [];

    for (const doc of bizSnap.docs) {
        const biz = { id: doc.id, ...doc.data() };
        const bizId = biz.id;
        const bizName = biz.name || biz.comercioNombre || bizId;
        const ownerUid = biz.ownerUid;

        console.log(`------------------------------------------------------------------------`);
        console.log(`🏪 BUSINESS: ${bizName} (ID: ${bizId})`);
        console.log(`   lifecycleStatus: ${biz.lifecycleStatus || biz.status}, wizardCompleted: ${biz.wizardCompleted}`);

        // Find active memberships for this business
        const bizMemberships = memberships.filter(m => m.businessId === bizId);
        const activeOwnerMem = bizMemberships.find(m => m.role === 'MERCHANT_OWNER' && m.status === 'ACTIVE');

        // Check Branches
        const bizBranches = branches.filter(b => b.businessId === bizId && b.active !== false && b.status !== 'DELETED');
        const primaryBranch = bizBranches.find(b => b.isPrimary) || bizBranches[0];

        // Check Org
        const bizOrg = organizations.find(o => o.id === biz.orgId || (o.businessIds && o.businessIds.includes(bizId)));

        // Check Auth User Claims if ownerUid exists or membership uid exists
        const targetUid = activeOwnerMem ? activeOwnerMem.uid : ownerUid;
        let authUser = null;
        let claims = {};

        if (targetUid) {
            try {
                authUser = await lookupUser(targetUid);
                if (authUser && authUser.customAttributes) {
                    claims = JSON.parse(authUser.customAttributes);
                }
            } catch (e) {
                console.error(`   Error looking up Auth user ${targetUid}:`, e.message);
            }
        }

        // Evaluate Drift Matrix
        const matrix = {
            businessId: bizId,
            businessName: bizName,
            targetUid,
            authExists: !!authUser,
            membershipExists: !!activeOwnerMem,
            membershipActive: activeOwnerMem ? activeOwnerMem.status === 'ACTIVE' : false,
            membershipRoleValid: activeOwnerMem ? ['MERCHANT_OWNER', 'OWNER'].includes(activeOwnerMem.role) : false,
            membershipOrgIdCoherent: activeOwnerMem ? (activeOwnerMem.orgId === biz.orgId || !!activeOwnerMem.orgId) : false,
            membershipBranchValid: activeOwnerMem ? !!activeOwnerMem.branchId : false,
            claimsExist: Object.keys(claims).length > 0,
            claimsRoleMatch: claims.role === 'MERCHANT_OWNER' || claims.role === 'OWNER',
            claimsBusinessIdMatch: claims.businessId === bizId,
            branchActive: bizBranches.length > 0,
            orgActive: !!bizOrg,
            hasDrift: false,
            driftReasons: []
        };

        // Determine if there is drift
        if (!matrix.membershipExists) {
            matrix.hasDrift = true;
            matrix.driftReasons.push('MISSING_CANONICAL_MEMBERSHIP');
        }
        if (!matrix.authExists && matrix.targetUid) {
            matrix.hasDrift = true;
            matrix.driftReasons.push('AUTH_USER_NOT_FOUND');
        }
        if (!matrix.claimsBusinessIdMatch) {
            matrix.hasDrift = true;
            matrix.driftReasons.push(`CLAIMS_BUSINESS_ID_MISMATCH (claims.businessId=${claims.businessId} vs bizId=${bizId})`);
        }
        if (!matrix.claimsRoleMatch) {
            matrix.hasDrift = true;
            matrix.driftReasons.push(`CLAIMS_ROLE_INVALID (claims.role=${claims.role})`);
        }
        if (!matrix.branchActive) {
            matrix.hasDrift = true;
            matrix.driftReasons.push('NO_ACTIVE_BRANCHES');
        }

        console.log(`   Memberships found: ${bizMemberships.length} (Active Owner: ${activeOwnerMem ? '✅ YES (' + activeOwnerMem.email + ')' : '❌ NO'})`);
        console.log(`   Branches found: ${bizBranches.length} (Primary: ${primaryBranch ? primaryBranch.name : 'NONE'})`);
        console.log(`   Organization: ${bizOrg ? bizOrg.name + ' (' + bizOrg.id + ')' : 'NONE'}`);
        console.log(`   Claims: role=${claims.role}, businessId=${claims.businessId}, orgId=${claims.orgId}, branchId=${claims.branchId}`);
        console.log(`   STATUS: ${matrix.hasDrift ? '⚠️ IDENTITY DRIFT (' + matrix.driftReasons.join(', ') + ')' : '🟢 CANONICAL EIAM COMPLIANT'}`);

        auditResults.push(matrix);
    }

    console.log('\n========================================================================');
    console.log('  SUMMARY OF GOVERNANCE IDENTITY DRIFT AUDIT                           ');
    console.log('========================================================================');
    const compliant = auditResults.filter(r => !r.hasDrift);
    const withDrift = auditResults.filter(r => r.hasDrift);

    console.log(`Total Businesses Analyzed: ${auditResults.length}`);
    console.log(`🟢 Canonical EIAM Compliant: ${compliant.length}`);
    compliant.forEach(c => console.log(`   - ${c.businessName} (${c.businessId})`));

    console.log(`⚠️ Identity Drift Detected: ${withDrift.length}`);
    withDrift.forEach(d => console.log(`   - ${d.businessName} (${d.businessId}) -> Reasons: ${d.driftReasons.join(', ')}`));
    console.log('========================================================================\n');
}

runGovernanceDriftAudit().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
