const { execSync } = require('child_process');
const https = require('https');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

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

async function reprovisionFritoni() {
    console.log('========================================================================');
    console.log('  SPRINT 17.5.1 — CANONICAL RE-PROVISIONING FOR FRITONI (MERCHANT OWNER)');
    console.log('========================================================================\n');

    const uid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const email = 'fritonic@gmail.com';
    const businessId = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const orgId = 'org_default_bluesystem';
    const primaryBranchId = 'br_1786988052589'; // Fritoni Boer (OPERATIONAL)
    const correlationId = `reprov_${Date.now()}`;
    const membershipId = `mem_fritoni_${uid}`;

    const canonicalPermissions = [
        "VIEW_ORDERS",
        "MANAGE_ORDERS",
        "VIEW_MENU",
        "MANAGE_MENU",
        "VIEW_FINANCE",
        "EXPORT_REPORT",
        "MANAGE_EMPLOYEES",
        "MANAGE_SETTINGS",
        "VIEW_ANALYTICS",
        "CLOSE_CASH_REGISTER"
    ];

    const now = FieldValue.serverTimestamp();
    const batch = db.batch();

    // 1. /organizations/org_default_bluesystem
    const orgRef = db.collection('organizations').doc(orgId);
    batch.set(orgRef, {
        orgId,
        name: 'FRITONI Holding',
        legalName: 'FRITONI S.A.',
        ownerUid: uid,
        businessIds: [businessId],
        status: 'ACTIVE',
        updatedAt: now,
    }, { merge: true });

    // 2. /membership/{membershipId}
    const memRef = db.collection('membership').doc(membershipId);
    batch.set(memRef, {
        id: membershipId,
        uid,
        email,
        businessId,
        orgId,
        branchId: primaryBranchId,
        role: 'MERCHANT_OWNER',
        status: 'ACTIVE',
        permissions: canonicalPermissions,
        createdAt: now,
        updatedAt: now,
    });

    // 3. /users/{uid} (Normalización no destructiva)
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
        role: 'business',
        rol: 'business',
        eiamRole: 'MERCHANT_OWNER',
        userType: 'business',
        isActive: true,
        active: true,
        status: 'ACTIVE',
        businessId,
        orgId,
        branchId: primaryBranchId,
        updatedAt: now,
    }, { merge: true });

    // 4. /businesses/{businessId} (Asegurar vinculación canónica de org y branches)
    const bizRef = db.collection('businesses').doc(businessId);
    batch.set(bizRef, {
        businessId,
        ownerUid: uid,
        orgId,
        branchIds: [primaryBranchId, 'br_1786993038705'],
        lifecycleStatus: 'ACTIVE',
        status: 'ACTIVE',
        isActive: true,
        active: true,
        updatedAt: now,
    }, { merge: true });

    // 5. /branches/{primaryBranchId} (Asegurar vinculación canónica)
    const branchRef = db.collection('branches').doc(primaryBranchId);
    batch.set(branchRef, {
        branchId: primaryBranchId,
        businessId,
        orgId,
        isPrimary: true,
        isActive: true,
        active: true,
        status: 'OPERATIONAL',
        updatedAt: now,
    }, { merge: true });

    // 6. /audit_events
    const auditRef = db.collection('audit_events').doc();
    batch.set(auditRef, {
        event: 'MERCHANT_LEGACY_REPROVISIONED',
        eventType: 'MERCHANT_LEGACY_REPROVISIONED',
        domain: 'IDENTITY',
        actorUid: 'SYSTEM_MIGRATION',
        targetUid: uid,
        businessId,
        orgId,
        branchId: primaryBranchId,
        membershipId,
        previousRole: 'business',
        newRole: 'MERCHANT_OWNER',
        status: 'ACTIVE',
        correlationId,
        reason: 'Canonical EIAM v2.2 legacy merchant re-provisioning',
        timestamp: now,
    });

    await batch.commit();
    console.log('✅ [Firestore] Batch commit exitoso en /organizations, /membership, /users, /businesses, /branches y /audit_events.');

    // 7. Custom Claims en Firebase Auth vía REST
    const customClaimsPayload = {
        role: 'MERCHANT_OWNER',
        businessId,
        orgId,
        branchId: primaryBranchId,
        tenantId: null
    };

    await setCustomClaims(uid, customClaimsPayload);
    console.log(`✅ [Firebase Auth] Custom Claims actualizados para uid=${uid}:`, JSON.stringify(customClaimsPayload, null, 2));

    // Verificación Read-Back
    const userAuthAfter = await lookupUser(uid);
    const memSnapAfter = await memRef.get();
    const userDocAfter = await userRef.get();

    console.log('\n--- VERIFICACIÓN READ-BACK ---');
    console.log('Auth customAttributes:', userAuthAfter?.customAttributes);
    console.log('Membership Status:', memSnapAfter.data()?.status, 'Role:', memSnapAfter.data()?.role);
    console.log('User eiamRole:', userDocAfter.data()?.eiamRole, 'businessId:', userDocAfter.data()?.businessId);
}

reprovisionFritoni().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
