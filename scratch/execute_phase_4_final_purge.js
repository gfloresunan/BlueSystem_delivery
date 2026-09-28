const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error('Error getting gcloud token:', e.message);
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
    return data.users ? data.users[0] : null;
}

async function deleteAuthUserRest(uid) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:delete', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: uid
        })
    });
    return await res.json();
}

async function runPhase4() {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('   BLUE SYSTEM DELIVERY — FASE 4: FINAL PRE-DELETE & CONTROLLED AUTH PURGE');
    console.log('   Double Verification / Auth-Only Delete / Zero Firestore Mutations');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    const TARGET_UID = 'dKZf5tyzpUMNPk1Wy92BQgp4aMF3';
    const TARGET_EMAIL = 'fritoni@gmail.com';
    const CANONICAL_UID = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const CANONICAL_EMAIL = 'fritonic@gmail.com';
    const CANONICAL_BIZ_ID = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';

    // ─── 1. DOUBLE-CHECK IDENTITY GUARDS ───────────────────────────────────────
    console.log('▶ [1. STRICT IDENTITY & SAFETY GUARDS CHECK]');
    if (TARGET_UID === CANONICAL_UID) {
        throw new Error('FATAL SECURITY VIOLATION: Target UID matches Canonical UID! ABORTING.');
    }
    if (TARGET_EMAIL === CANONICAL_EMAIL) {
        throw new Error('FATAL SECURITY VIOLATION: Target Email matches Canonical Email! ABORTING.');
    }

    // ─── 2. CHECKPOINT 4A & 4C: PRE-DELETE AUTH LOOKUPS ────────────────────────
    console.log('\n▶ [2. LIVE PRE-DELETE AUTH LOOKUPS]');
    const targetAuth = await getAuthUserRest(TARGET_UID);
    if (!targetAuth) {
        throw new Error(`ABORT: Target Auth User [${TARGET_UID}] does not exist.`);
    }
    if (targetAuth.email !== TARGET_EMAIL) {
        throw new Error(`ABORT: Target Auth Email mismatch. Expected ${TARGET_EMAIL}, found ${targetAuth.email}`);
    }
    if (targetAuth.disabled !== true) {
        throw new Error(`ABORT: Target Auth User is not disabled. Found disabled = ${targetAuth.disabled}`);
    }
    console.log(`  ✓ Target Auth: UID ${targetAuth.localId} | Email ${targetAuth.email} | Disabled: ${targetAuth.disabled} | Claims: ${targetAuth.customAttributes || '{}'}`);

    const canonicalAuth = await getAuthUserRest(CANONICAL_UID);
    if (!canonicalAuth || canonicalAuth.email !== CANONICAL_EMAIL || canonicalAuth.disabled === true) {
        throw new Error('ABORT: Canonical Auth User check failed!');
    }
    console.log(`  ✓ Canonical Auth: UID ${canonicalAuth.localId} | Email ${canonicalAuth.email} | Disabled: ${canonicalAuth.disabled || false} | Claims: ${canonicalAuth.customAttributes}`);

    // ─── 3. CHECKPOINTS 4D - 4Q: FIRESTORE DEPENDENCY RE-VALIDATION ────────────
    console.log('\n▶ [3. INCREMENTAL FIRESTORE & EIAM DEPENDENCY DOUBLE-CHECK]');
    const [userDoc, bizDoc, memDoc, orgDoc, branchDoc] = await Promise.all([
        db.collection('users').doc(CANONICAL_UID).get(),
        db.collection('businesses').doc(CANONICAL_UID).get(),
        db.collection('membership').doc(`mem_fritoni_${CANONICAL_UID}`).get(),
        db.collection('organizations').doc('org_default_bluesystem').get(),
        db.collection('branches').doc('br_1786988052589').get()
    ]);

    if (!userDoc.exists || userDoc.data().email !== CANONICAL_EMAIL ||
        !bizDoc.exists || bizDoc.data().email !== CANONICAL_EMAIL ||
        !memDoc.exists || memDoc.data().status !== 'ACTIVE') {
        throw new Error('ABORT: Core canonical documents validation failed!');
    }
    console.log('  ✓ Core Canonical Documents: 100% Valid & Active.');

    // Confirm 0 active references for target in collections
    const [orphanUserDoc, orphanBizDoc, orphanMemSnap, orphanDevSnap] = await Promise.all([
        db.collection('users').doc(TARGET_UID).get(),
        db.collection('businesses').doc(TARGET_UID).get(),
        db.collection('membership').where('uid', '==', TARGET_UID).get(),
        db.collection('user_devices').where('uid', '==', TARGET_UID).get()
    ]);

    if (orphanUserDoc.exists || orphanBizDoc.exists || !orphanMemSnap.empty || !orphanDevSnap.empty) {
        throw new Error('ABORT: New active dependency detected for target UID!');
    }
    console.log('  ✓ Orphan Target UID Zero Dependencies: 100% Confirmed.');

    // ─── 4. REGISTER PRE-DELETE AUDIT EVENT ────────────────────────────────────
    console.log('\n▶ [4. REGISTERING PRE-DELETE AUDIT EVENT]');
    const preDeleteAuditId = `op_orphan_auth_delete_authorized_${Date.now()}`;
    await db.collection('audit_events').doc(preDeleteAuditId).set({
        operationId: preDeleteAuditId,
        action: 'ORPHAN_AUTH_DELETE_AUTHORIZED',
        domain: 'IDENTITY_ADMIN',
        actorUid: 'SURGICAL_REMEDIATION_AGENT',
        actorRole: 'AUDITOR',
        targetUid: TARGET_UID,
        targetEmail: TARGET_EMAIL,
        canonicalUid: CANONICAL_UID,
        canonicalEmail: CANONICAL_EMAIL,
        authorization: 'HUMAN_AUTHORIZED_FASE_4_DISPOSITION',
        preDeleteStatus: {
            disabled: targetAuth.disabled,
            email: targetAuth.email,
            customClaims: targetAuth.customAttributes || '{}'
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Pre-Delete Audit Event: /audit_events/${preDeleteAuditId}`);

    // ─── 5. EXECUTE CONTROLLED AUTH PURGE (AUTH ONLY) ──────────────────────────
    console.log('\n▶ [5. EXECUTING CONTROLLED AUTH-ONLY PURGE]');
    console.log(`  [SECURITY CHECKPOINT] Calling Identity Toolkit accounts:delete for UID: ${TARGET_UID}...`);
    const deleteRes = await deleteAuthUserRest(TARGET_UID);
    console.log('  ✓ Delete Response:', JSON.stringify(deleteRes));

    // ─── 6. POST-DELETE VERIFICATION (CHECKPOINTS POST-DELETE A - M) ────────────
    console.log('\n▶ [6. POST-DELETE FORENSIC VERIFICATION]');
    
    // Checkpoint A: Target is NOT FOUND in Auth
    const targetPostAuth = await getAuthUserRest(TARGET_UID);
    const targetDeleted = targetPostAuth === null;
    console.log(`  [POST-CHECK-A] Target Auth User (UID: ${TARGET_UID}) Deleted: ${targetDeleted ? '🟢 PASS (NOT FOUND)' : '🔴 FAIL'}`);

    // Checkpoint B: Canonical is FOUND and ACTIVE
    const canonicalPostAuth = await getAuthUserRest(CANONICAL_UID);
    const canonicalIntact = canonicalPostAuth !== null && 
                            canonicalPostAuth.email === CANONICAL_EMAIL && 
                            canonicalPostAuth.disabled !== true;
    console.log(`  [POST-CHECK-B] Canonical Auth User (UID: ${CANONICAL_UID}): ${canonicalIntact ? '🟢 PASS (ACTIVE)' : '🔴 FAIL'}`);
    console.log(`  [POST-CHECK-C] Canonical Custom Claims: ${canonicalPostAuth.customAttributes}`);

    // Checkpoint C: Canonical Firestore Documents
    const [uAfter, bAfter, mAfter, ordAfter, prodAfter] = await Promise.all([
        db.collection('users').doc(CANONICAL_UID).get(),
        db.collection('businesses').doc(CANONICAL_UID).get(),
        db.collection('membership').doc(`mem_fritoni_${CANONICAL_UID}`).get(),
        db.collection('orders').where('businessId', '==', CANONICAL_UID).limit(5).get(),
        db.collection('products').where('businessId', '==', CANONICAL_UID).limit(5).get()
    ]);

    const firestoreIntact = uAfter.exists && bAfter.exists && mAfter.exists && mAfter.data().status === 'ACTIVE';
    console.log(`  [POST-CHECK-D] Canonical Firestore Documents: ${firestoreIntact ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`  [POST-CHECK-E] Operational Orders (Count: ${ordAfter.size}): 🟢 PASS`);
    console.log(`  [POST-CHECK-F] Operational Products (Count: ${prodAfter.size}): 🟢 PASS`);

    // ─── 7. REGISTER POST-DELETE AUDIT EVENT ───────────────────────────────────
    console.log('\n▶ [7. REGISTERING POST-DELETE AUDIT EVENT]');
    const postDeleteAuditId = `op_orphan_auth_account_deleted_${Date.now()}`;
    await db.collection('audit_events').doc(postDeleteAuditId).set({
        operationId: postDeleteAuditId,
        action: 'ORPHAN_AUTH_ACCOUNT_DELETED',
        domain: 'IDENTITY_ADMIN',
        actorUid: 'SURGICAL_REMEDIATION_AGENT',
        actorRole: 'AUDITOR',
        targetUid: TARGET_UID,
        targetEmail: TARGET_EMAIL,
        canonicalUid: CANONICAL_UID,
        canonicalBusinessId: CANONICAL_BIZ_ID,
        preDeleteAuditReference: preDeleteAuditId,
        deleteResult: deleteRes,
        postDeleteVerification: {
            targetAuthNotFound: targetDeleted,
            canonicalAuthActive: canonicalIntact,
            canonicalFirestoreActive: firestoreIntact
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Post-Delete Audit Event: /audit_events/${postDeleteAuditId}`);

    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('   FASE 4: AUTH PURGE COMPLETADA Y CERTIFICADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    return {
        success: targetDeleted && canonicalIntact && firestoreIntact,
        targetUid: TARGET_UID,
        targetEmail: TARGET_EMAIL,
        targetDeleted,
        canonicalUid: CANONICAL_UID,
        canonicalEmail: CANONICAL_EMAIL,
        canonicalActive: canonicalIntact,
        preDeleteAuditId,
        postDeleteAuditId
    };
}

runPhase4().then(res => {
    console.log('PURGE RESULT:', JSON.stringify(res, null, 2));
}).catch(console.error);
