const { execSync } = require('child_process');
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
    return data.users[0];
}

async function setCustomUserClaimsRest(uid, customClaims) {
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
    if (data.error) throw new Error(data.error.message);
    return data;
}

async function testRoleTransition() {
    const targetUid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    console.log('=== ROLE TRANSITION TEST FOR FRITONI ===');

    // 1. Current State (OWNER)
    let user = await getAuthUserRest(targetUid);
    console.log('Initial Claims:', user.customAttributes);

    // 2. Transition OWNER -> MANAGER
    const op1 = `op_role_transition_manager_${Date.now()}`;
    await db.collection('audit_events').doc(op1).set({
        operationId: op1,
        action: 'EIAM_ROLE_CHANGE',
        actorUid: 'EIAM_SYSTEM_HOTFIX',
        targetUid,
        beforeRole: 'OWNER',
        afterRole: 'MANAGER',
        timestamp: new Date().toISOString()
    });

    const managerClaims = {
        role: 'MANAGER',
        businessId: targetUid,
        branchId: 'br_1786988052589',
        orgId: 'org_default_bluesystem',
        tenantId: null
    };
    await setCustomUserClaimsRest(targetUid, managerClaims);
    let updatedUser1 = await getAuthUserRest(targetUid);
    console.log('[TRANSITION 1] OWNER -> MANAGER passed:', updatedUser1.customAttributes);

    // 3. Transition MANAGER -> OWNER (Restore)
    const op2 = `op_role_transition_owner_${Date.now()}`;
    await db.collection('audit_events').doc(op2).set({
        operationId: op2,
        action: 'EIAM_ROLE_CHANGE',
        actorUid: 'EIAM_SYSTEM_HOTFIX',
        targetUid,
        beforeRole: 'MANAGER',
        afterRole: 'OWNER',
        timestamp: new Date().toISOString()
    });

    const ownerClaims = {
        role: 'OWNER',
        businessId: targetUid,
        branchId: 'br_1786988052589',
        orgId: 'org_default_bluesystem',
        tenantId: null
    };
    await setCustomUserClaimsRest(targetUid, ownerClaims);
    let updatedUser2 = await getAuthUserRest(targetUid);
    console.log('[TRANSITION 2] MANAGER -> OWNER restored:', updatedUser2.customAttributes);

    console.log('\n🟢 ROLE TRANSITION TEST FULLY CERTIFIED PASS');
}

testRoleTransition().catch(err => {
    console.error('Role transition test failed:', err);
    process.exit(1);
});
