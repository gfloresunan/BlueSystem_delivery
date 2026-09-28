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

async function runPhase3Audit() {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('   BLUE SYSTEM DELIVERY — FASE 3: ORPHAN AUTH ACCOUNT FORENSIC AUDIT');
    console.log('   Target: fritoni@gmail.com (UID: dKZf5tyzpUMNPk1Wy92BQgp4aMF3)');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    const TARGET_UID = 'dKZf5tyzpUMNPk1Wy92BQgp4aMF3';
    const TARGET_EMAIL = 'fritoni@gmail.com';
    const CANONICAL_UID = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const CANONICAL_EMAIL = 'fritonic@gmail.com';

    // ─── 1. FIREBASE AUTH SNAPSHOT ─────────────────────────────────────────────
    console.log('▶ [1. AUTH SNAPSHOT]');
    const authRecord = await getAuthUserRest(TARGET_UID);
    if (!authRecord) {
        console.log(`  Target Auth Record NOT FOUND for UID ${TARGET_UID}`);
    } else {
        console.log('  Target Auth Record Found:');
        console.log(`    - UID: ${authRecord.localId}`);
        console.log(`    - Email: ${authRecord.email}`);
        console.log(`    - Email Verified: ${authRecord.emailVerified || false}`);
        console.log(`    - Disabled: ${authRecord.disabled || false}`);
        console.log(`    - CreatedAt: ${new Date(Number(authRecord.createdAt)).toISOString()} (${authRecord.createdAt})`);
        console.log(`    - LastLoginAt: ${authRecord.lastLoginAt ? new Date(Number(authRecord.lastLoginAt)).toISOString() : 'Never'} (${authRecord.lastLoginAt || 'N/A'})`);
        console.log(`    - PasswordUpdatedAt: ${authRecord.passwordUpdatedAt ? new Date(Number(authRecord.passwordUpdatedAt)).toISOString() : 'N/A'}`);
        console.log(`    - Custom Claims: ${authRecord.customAttributes || '{}'}`);
        console.log(`    - Provider Data: ${JSON.stringify(authRecord.providerUserInfo || [])}`);
    }

    // ─── 2. DEEP FIRESTORE CROSS-COLLECTION AUDIT ──────────────────────────────
    console.log('\n▶ [2. FIRESTORE CROSS-COLLECTION AUDIT]');
    
    const domainAuditResults = {};

    const targetCollections = [
        'users',
        'businesses',
        'membership',
        'organizations',
        'branches',
        'orders',
        'deliveryTrips',
        'couriers',
        'user_devices',
        'merchant_applications',
        'invitations',
        'products',
        'audit_events'
    ];

    for (const colName of targetCollections) {
        const colRef = db.collection(colName);
        const matches = [];

        try {
            // 1. Direct doc ID lookup
            const directSnap = await colRef.doc(TARGET_UID).get();
            if (directSnap.exists) {
                matches.push({ type: 'DIRECT_DOC_ID', docId: directSnap.id, data: directSnap.data() });
            }

            // 2. Query collection for references
            const snap = await colRef.get();
            snap.forEach(doc => {
                const data = doc.data();
                const str = JSON.stringify(data);
                const strLower = str.toLowerCase();
                
                // Exclude the direct doc if already captured
                if (doc.id === TARGET_UID) return;

                if (str.includes(TARGET_UID) || strLower.includes(TARGET_EMAIL.toLowerCase())) {
                    // Classify field match
                    matches.push({
                        type: 'CONTENT_REFERENCE',
                        docId: doc.id,
                        matchedUid: str.includes(TARGET_UID),
                        matchedEmail: strLower.includes(TARGET_EMAIL.toLowerCase()),
                        dataSnippet: {
                            id: doc.id,
                            businessId: data.businessId,
                            ownerUid: data.ownerUid,
                            email: data.email,
                            action: data.action || data.event,
                            timestamp: data.timestamp || data.createdAt
                        }
                    });
                }
            });

            domainAuditResults[colName] = matches;
            console.log(`  ✓ Colección [${colName}]: ${matches.length} referencias encontradas`);
            if (matches.length > 0) {
                matches.forEach(m => {
                    console.log(`    ➔ Doc [${m.docId}] (Type: ${m.type}, Matched UID: ${m.matchedUid}, Matched Email: ${m.matchedEmail})`);
                    if (colName === 'audit_events') {
                        console.log(`      Audit Action: ${m.dataSnippet.action}, Details:`, JSON.stringify(m.dataSnippet));
                    }
                });
            }
        } catch (e) {
            console.log(`  ⚠ Error en colección [${colName}]: ${e.message}`);
            domainAuditResults[colName] = { error: e.message };
        }
    }

    // ─── 3. REPOSITORY CODE & TESTS SCAN ───────────────────────────────────────
    console.log('\n▶ [3. CODEBASE / CONFIGURATION / TEST SEARCH]');
    
    return {
        authRecord,
        domainAuditResults
    };
}

runPhase3Audit().then(res => {
    console.log('\nAudit completed successfully.');
}).catch(console.error);
