const { execSync } = require('child_process');
const https = require('https');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');
const fs = require('fs');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function getAccessToken() {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function lookupAllAuthUsers(uids) {
    const token = getAccessToken();
    const chunkSize = 100;
    const allUsers = [];

    for (let i = 0; i < uids.length; i += chunkSize) {
        const chunk = uids.slice(i, i + chunkSize);
        const postData = JSON.stringify({ localId: chunk });

        const result = await new Promise((resolve, reject) => {
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
                res.on('data', c => body += c);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve(parsed.users || []);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        allUsers.push(...result);
    }

    return allUsers;
}

// Also check if we can query the full account list directly
async function downloadFullAuthAccounts() {
    const token = getAccessToken();
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            port: 443,
            path: '/v1/projects/bluesystem-7c9af/accounts:batchGet?maxResults=1000',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': 'bluesystem-7c9af'
            }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.users || []);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runReadOnlySnapshotAudit() {
    console.log('====================================================');
    console.log('BLUESYSTEM IDENTITY MIGRATION READINESS AUDIT');
    console.log('PHASE: 4.0');
    console.log('PROJECT: bluesystem-7c9af');
    console.log('MODE: STRICT READ-ONLY');
    console.log('PRODUCTION MUTATION: FORBIDDEN');
    console.log('====================================================\n');

    // 1. Fetch Firestore collections
    console.log('1. Reading Firestore collections in READ-ONLY mode...');
    const [usersSnap, memSnap, empSnap, bizSnap, branchSnap, userDevSnap, devSnap, orgSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('membership').get(),
        db.collection('employees').get(),
        db.collection('businesses').get(),
        db.collection('branches').get(),
        db.collection('user_devices').get(),
        db.collection('devices').get(),
        db.collection('organizations').get()
    ]);

    const firestoreUsers = [];
    usersSnap.forEach(d => {
        firestoreUsers.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /users: ${firestoreUsers.length}`);

    const memberships = [];
    memSnap.forEach(d => {
        memberships.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /membership: ${memberships.length}`);

    const employees = [];
    empSnap.forEach(d => {
        employees.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /employees: ${employees.length}`);

    const businesses = [];
    bizSnap.forEach(d => {
        businesses.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /businesses: ${businesses.length}`);

    const branches = [];
    branchSnap.forEach(d => {
        branches.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /branches: ${branches.length}`);

    const userDevices = [];
    userDevSnap.forEach(d => {
        userDevices.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /user_devices: ${userDevices.length}`);

    const legacyDevices = [];
    devSnap.forEach(d => {
        legacyDevices.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /devices (legacy): ${legacyDevices.length}`);

    const organizations = [];
    orgSnap.forEach(d => {
        organizations.push({ id: d.id, ...d.data() });
    });
    console.log(`-> Total /organizations: ${organizations.length}`);

    // 2. Fetch all Auth users
    console.log('\n2. Fetching Firebase Auth accounts via IdentityToolkit API with quota project...');
    let rawAuthUsers = await downloadFullAuthAccounts().catch(() => []);
    if (!rawAuthUsers.length) {
        console.log('batchGet returned 0, attempting lookup via all Firestore UIDs + membership UIDs...');
        const allKnownUids = Array.from(new Set([
            ...firestoreUsers.map(u => u.id),
            ...firestoreUsers.map(u => u.uid).filter(Boolean),
            ...memberships.map(m => m.uid).filter(Boolean),
            ...employees.map(e => e.uid).filter(Boolean)
        ]));
        console.log(`Looking up ${allKnownUids.length} known UIDs...`);
        rawAuthUsers = await lookupAllAuthUsers(allKnownUids);
    }
    console.log(`-> Total Auth Users fetched: ${rawAuthUsers.length}`);

    const authUsers = rawAuthUsers.map(u => {
        let claims = {};
        if (u.customAttributes) {
            try {
                claims = JSON.parse(u.customAttributes);
            } catch (e) {
                claims = { raw: u.customAttributes };
            }
        }
        return {
            uid: u.localId,
            email: u.email || null,
            emailVerified: u.emailVerified || false,
            displayName: u.displayName || null,
            phoneNumber: u.phoneNumber || null,
            disabled: u.disabled || false,
            providerData: (u.providerUserInfo || []).map(p => p.providerId),
            createdAt: u.createdAt || null,
            lastLoginAt: u.lastLoginAt || null,
            customClaims: claims
        };
    });

    const snapshot = {
        timestamp: new Date().toISOString(),
        projectId: 'bluesystem-7c9af',
        authUsers,
        firestoreUsers,
        memberships,
        employees,
        businesses,
        branches,
        userDevices,
        legacyDevices,
        organizations
    };

    const outPath = 'c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/scratch/raw_snapshot_phase_4_0.json';
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
    console.log(`\n✅ Snapshot exported to ${outPath} (Size: ${(fs.statSync(outPath).size / 1024).toFixed(2)} KB)`);

    process.exit(0);
}

runReadOnlySnapshotAudit().catch(err => {
    console.error('Error during read-only audit snapshot:', err);
    process.exit(1);
});
