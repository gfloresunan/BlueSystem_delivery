const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const token = execSync('gcloud auth print-access-token').toString().trim();

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function getAuthUserRest(uid) {
    try {
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
                } catch (e) { }
            }
            return {
                uid: u.localId,
                email: u.email || null,
                disabled: u.disabled || false,
                customClaims
            };
        }
        return null;
    } catch (e) {
        return { error: e.message };
    }
}

async function runAudit() {
    console.log('=== STARTING MERCHANT & IDENTITY FORENSIC AUDIT ===');

    // Fetch all users from Firestore
    const usersSnap = await db.collection('users').get();
    console.log(`Total /users in Firestore: ${usersSnap.size}`);

    // Fetch all memberships from Firestore
    const membershipsSnap = await db.collection('membership').get();
    console.log(`Total /membership in Firestore: ${membershipsSnap.size}`);

    const membershipsByUid = {};
    membershipsSnap.forEach(doc => {
        const data = doc.data();
        const uid = data.uid;
        if (!membershipsByUid[uid]) membershipsByUid[uid] = [];
        membershipsByUid[uid].push({
            id: doc.id,
            businessId: data.businessId || null,
            branchId: data.branchId || null,
            role: data.role || null,
            status: data.status || null,
            permissions: data.permissions || []
        });
    });

    const auditResults = [];

    for (const doc of usersSnap.docs) {
        const uid = doc.id;
        const uData = doc.data();

        // Get Auth data
        let authUser = await getAuthUserRest(uid);
        let authErrStr = authUser && authUser.error ? authUser.error : null;

        const customClaims = (authUser && authUser.customClaims) ? authUser.customClaims : {};

        const userAudit = {
            uid,
            email: uData.email || (authUser ? authUser.email : null) || 'N/A',
            firestore: {
                role: uData.role ?? uData.eiamRole ?? uData.rol ?? uData.userType ?? null,
                status: uData.status ?? (uData.isActive === false ? 'BLOCKED' : 'ACTIVE'),
                businessId: uData.businessId ?? uData.eiamBusinessId ?? null,
                branchId: uData.branchId ?? null,
                orgId: uData.orgId ?? uData.organizationId ?? null,
                tenantId: uData.tenantId ?? null,
                rawDoc: uData
            },
            auth: {
                exists: !!authUser,
                disabled: authUser ? authUser.disabled : null,
                err: authErrStr,
                customClaims: {
                    role: customClaims.role ?? null,
                    businessId: customClaims.businessId ?? null,
                    branchId: customClaims.branchId ?? null,
                    orgId: customClaims.orgId ?? null,
                    tenantId: customClaims.tenantId ?? null,
                    raw: customClaims
                }
            },
            memberships: membershipsByUid[uid] || []
        };

        auditResults.push(userAudit);
    }

    // Also check if there are Auth users not in Firestore /users
    // List auth users
    let authUsersList = [];
    try {
        const listResult = await admin.auth().listUsers(1000);
        authUsersList = listResult.users;
    } catch (err) {
        console.error('Error listing Auth users:', err.message);
    }

    console.log(`Total Auth users in Firebase Auth: ${authUsersList.length}`);

    // Output Audit Data as JSON file in scratch
    fs.writeFileSync('scratch/merchant_claims_audit.json', JSON.stringify(auditResults, null, 2));
    console.log('Saved audit results to scratch/merchant_claims_audit.json');

    // Print target user FRITONI (dlRY2ZVUqPR2Fxoc3cazcOxxRJg2) and all Merchant accounts
    const fritoniUser = auditResults.find(u => u.uid === 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2');
    console.log('\n==================================================');
    console.log('FRITONI TARGET USER AUDIT (dlRY2ZVUqPR2Fxoc3cazcOxxRJg2)');
    console.log('==================================================');
    console.log(JSON.stringify(fritoniUser, null, 2));

    console.log('\n==================================================');
    console.log('ALL MERCHANT USERS (ROLE OWNER / MANAGER / BUSINESS / MERCHANT)');
    console.log('==================================================');
    const merchantUsers = auditResults.filter(u => {
        const r = String(u.firestore.role).toLowerCase();
        const cr = String(u.auth.customClaims.role).toLowerCase();
        const hasBizMembership = u.memberships.length > 0;
        return r.includes('owner') || r.includes('business') || r.includes('merchant') || r.includes('manager') ||
               cr.includes('owner') || cr.includes('business') || cr.includes('merchant') || cr.includes('manager') ||
               hasBizMembership;
    });

    merchantUsers.forEach(u => {
        console.log(`\nUID: ${u.uid} | Email: ${u.email}`);
        console.log(`  Firestore -> role: ${u.firestore.role}, status: ${u.firestore.status}, businessId: ${u.firestore.businessId}, branchId: ${u.firestore.branchId}, orgId: ${u.firestore.orgId}, tenantId: ${u.firestore.tenantId}`);
        console.log(`  Auth Claims -> role: ${u.auth.customClaims.role}, businessId: ${u.auth.customClaims.businessId}, branchId: ${u.auth.customClaims.branchId}, orgId: ${u.auth.customClaims.orgId}, tenantId: ${u.auth.customClaims.tenantId}`);
        console.log(`  Auth disabled: ${u.auth.disabled}`);
        console.log(`  Memberships (${u.memberships.length}):`, JSON.stringify(u.memberships));
    });

    // Check businesses collection
    const bizSnap = await db.collection('businesses').get();
    console.log(`\nTotal businesses in Firestore: ${bizSnap.size}`);
    bizSnap.forEach(d => {
        console.log(`Business ID: ${d.id} | Name: ${d.data().nombre || d.data().name || 'N/A'} | lifecycleStatus: ${d.data().lifecycleStatus} | wizardCompleted: ${d.data().wizardCompleted}`);
    });
}

runAudit().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
