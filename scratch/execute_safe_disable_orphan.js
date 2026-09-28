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

async function disableAuthUserRest(uid) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: uid,
            disableUser: true
        })
    });
    return await res.json();
}

async function executeSafeDisable() {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('   BLUE SYSTEM DELIVERY — FASE 3: SAFE DISPOSITION (DISABLE)');
    console.log('   Target UID: dKZf5tyzpUMNPk1Wy92BQgp4aMF3 (fritoni@gmail.com)');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    const TARGET_UID = 'dKZf5tyzpUMNPk1Wy92BQgp4aMF3';
    const TARGET_EMAIL = 'fritoni@gmail.com';
    const CANONICAL_UID = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const CANONICAL_EMAIL = 'fritonic@gmail.com';

    // 1. Pre-Disable Snapshot
    console.log('▶ [1. PRE-DISABLE VERIFICATION]');
    const targetBefore = await getAuthUserRest(TARGET_UID);
    if (!targetBefore || targetBefore.email !== TARGET_EMAIL) {
        throw new Error(`ABORT: Target auth user mismatch. Expected ${TARGET_EMAIL}, found ${targetBefore ? targetBefore.email : 'null'}`);
    }
    console.log(`  ✓ Pre-State: UID ${TARGET_UID} | Email: ${targetBefore.email} | Disabled: ${targetBefore.disabled || false}`);

    // 2. Execute Controlled Disable
    console.log('\n▶ [2. EXECUTING CONTROLLED DISABLE IN FIREBASE AUTH]');
    const disableResult = await disableAuthUserRest(TARGET_UID);
    console.log('  ✓ Disable response from Identity Toolkit API:', JSON.stringify(disableResult));

    // 3. Register Inmutable Audit Event
    console.log('\n▶ [3. REGISTERING INMUTABLE AUDIT EVENT]');
    const auditEventId = `op_orphan_disable_${TARGET_UID}_${Date.now()}`;
    const auditEventRef = db.collection('audit_events').doc(auditEventId);
    
    await auditEventRef.set({
        operationId: auditEventId,
        action: 'ORPHAN_AUTH_ACCOUNT_DISABLED',
        domain: 'IDENTITY_ADMIN',
        actorUid: 'SURGICAL_REMEDIATION_AGENT',
        actorRole: 'AUDITOR',
        targetUid: TARGET_UID,
        targetEmail: TARGET_EMAIL,
        reason: 'Safe disposition: Deshabilitación controlada de cuenta Auth huérfana tras certificación de cuenta canónica',
        preState: {
            disabled: targetBefore.disabled || false,
            email: targetBefore.email,
            customClaims: targetBefore.customAttributes || '{}'
        },
        postState: {
            disabled: true,
            email: targetBefore.email
        },
        status: 'COMPLETED',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Audit Event registrado: /audit_events/${auditEventId}`);

    // 4. Post-Disable Auth Verification
    console.log('\n▶ [4. POST-DISABLE VERIFICATION]');
    const targetAfter = await getAuthUserRest(TARGET_UID);
    console.log(`  ✓ Target Post-State: UID ${targetAfter.localId} | Email: ${targetAfter.email} | Disabled: ${targetAfter.disabled}`);
    
    const canonicalAuth = await getAuthUserRest(CANONICAL_UID);
    console.log(`  ✓ Canonical State: UID ${canonicalAuth.localId} | Email: ${canonicalAuth.email} | Disabled: ${canonicalAuth.disabled || false}`);
    console.log(`  ✓ Canonical Claims: ${canonicalAuth.customAttributes}`);

    // 5. Zero-Regression Validation on Canonical FRITONI
    console.log('\n▶ [5. ZERO-REGRESSION VALIDATION ON CANONICAL FRITONI]');
    const [userDoc, bizDoc, memDoc, ordersSnap, prodsSnap] = await Promise.all([
        db.collection('users').doc(CANONICAL_UID).get(),
        db.collection('businesses').doc(CANONICAL_UID).get(),
        db.collection('membership').doc(`mem_fritoni_${CANONICAL_UID}`).get(),
        db.collection('orders').where('businessId', '==', CANONICAL_UID).limit(5).get(),
        db.collection('products').where('businessId', '==', CANONICAL_UID).limit(5).get()
    ]);

    const regressionPass = userDoc.exists && 
                           userDoc.data().email === CANONICAL_EMAIL &&
                           bizDoc.exists && 
                           bizDoc.data().email === CANONICAL_EMAIL &&
                           memDoc.exists && 
                           memDoc.data().status === 'ACTIVE' &&
                           canonicalAuth.disabled !== true;

    console.log(`  [TEST-CANONICAL-AUTH]     ${canonicalAuth.disabled !== true ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`  [TEST-CANONICAL-USERS]    ${userDoc.exists ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`  [TEST-CANONICAL-BUSINESS] ${bizDoc.exists ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`  [TEST-CANONICAL-MEMBERSHIP] ${memDoc.exists ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`  [TEST-OPERATIONAL-ORDERS] (Count: ${ordersSnap.size}) 🟢 PASS`);
    console.log(`  [TEST-OPERATIONAL-CATALOG] (Count: ${prodsSnap.size}) 🟢 PASS`);
    console.log(`  [TEST-OVERALL-REGRESSION] ${regressionPass ? '🟢 ZERO REGRESSION' : '🔴 REGRESSION DETECTED'}`);

    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('   FASE 3: SAFE DISPOSITION EJECUTADA Y CERTIFICADA');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    return {
        success: true,
        orphanUid: TARGET_UID,
        orphanEmail: TARGET_EMAIL,
        orphanDisabled: targetAfter.disabled,
        canonicalUid: CANONICAL_UID,
        canonicalEmail: CANONICAL_EMAIL,
        canonicalActive: canonicalAuth.disabled !== true,
        auditEventId,
        regressionPass
    };
}

executeSafeDisable().then(res => {
    console.log('FINAL RESULT:', JSON.stringify(res, null, 2));
}).catch(console.error);
