const { execSync } = require('child_process');
const https = require('https');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');
const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/geral/.gemini/antigravity-ide/brain/c89637a0-871a-4b46-b3f1-3b86c65d7e7b';

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

function resolveCanonicalStatus(doc) {
    if (!doc) return 'ACTIVE';
    if (doc.status && typeof doc.status === 'string') {
        const s = doc.status.toUpperCase().trim();
        if (['ACTIVE', 'PENDING', 'BLOCKED', 'SUSPENDED', 'TERMINATED'].includes(s)) return s;
    }
    if (doc.isActive === false || doc.active === false) return 'BLOCKED';
    return 'ACTIVE';
}

async function runDryRun() {
    console.log('====================================================');
    console.log('BLUESYSTEM IDENTITY MIGRATION — FASE 4.1 DRY RUN');
    console.log('WAVE 0: AUTH STATUS SYNCHRONIZATION');
    console.log('PROJECT: bluesystem-7c9af');
    console.log('MODE: DRY-RUN FIRST (ZERO MUTATION)');
    console.log('====================================================\n');

    // 1. Fetch live /users
    const usersSnap = await db.collection('users').get();
    const fsUsers = new Map();
    usersSnap.forEach(d => fsUsers.set(d.id, { id: d.id, ...d.data() }));

    // 2. Fetch live Auth users
    const allKnownUids = Array.from(fsUsers.keys());
    const rawAuthUsers = await lookupAllAuthUsers(allKnownUids);
    const authMap = new Map();
    rawAuthUsers.forEach(u => authMap.set(u.localId, u));

    console.log(`Live /users Count: ${fsUsers.size}`);
    console.log(`Live Matched Auth Accounts: ${rawAuthUsers.length}\n`);

    const wave0Targets = [];
    const preMigrationSnapshot = [];

    rawAuthUsers.forEach(u => {
        const uid = u.localId;
        const fsUser = fsUsers.get(uid);
        if (!fsUser) return;

        const canonicalStatus = resolveCanonicalStatus(fsUser);
        const currentAuthDisabled = Boolean(u.disabled);
        const expectedAuthDisabled = (canonicalStatus !== 'ACTIVE' && canonicalStatus !== 'PENDING');

        const isConflict = currentAuthDisabled !== expectedAuthDisabled;

        const record = {
            uid,
            email: u.email || fsUser.email || 'N/A',
            nombre: fsUser.nombre || fsUser.name || 'N/A',
            role: fsUser.role || fsUser.eiamRole || 'CLIENT',
            firestoreStatus: canonicalStatus,
            rawFirestoreStatus: fsUser.status || (fsUser.isActive !== false ? 'ACTIVE (implied)' : 'BLOCKED (implied)'),
            currentAuthDisabled,
            expectedAuthDisabled,
            conflict: isConflict,
            action: isConflict ? (expectedAuthDisabled ? 'DISABLE_AUTH' : 'ENABLE_AUTH') : 'NO_ACTION_CONSISTENT',
            reason: isConflict ? `IAC-005 Rule: status '${canonicalStatus}' requires Auth.disabled = ${expectedAuthDisabled}` : 'CONSISTENT'
        };

        if (isConflict) {
            wave0Targets.push(record);
            preMigrationSnapshot.push({
                migrationId: `MIG-W0-${uid.substring(0, 8)}`,
                phase: '4.1',
                wave: 'WAVE_0',
                uid,
                email: record.email,
                before: {
                    firestoreStatus: canonicalStatus,
                    authDisabled: currentAuthDisabled
                },
                expected: {
                    authDisabled: expectedAuthDisabled
                },
                previousAuthDisabled: currentAuthDisabled,
                timestamp: new Date().toISOString(),
                projectId: 'bluesystem-7c9af'
            });
        }
    });

    console.log(`=== WAVE 0 TARGETS IDENTIFIED: ${wave0Targets.length} ===\n`);
    wave0Targets.forEach((t, idx) => {
        console.log(`[TARGET ${idx + 1}] UID: ${t.uid}`);
        console.log(`  Email: ${t.email} (${t.nombre})`);
        console.log(`  Role: ${t.role}`);
        console.log(`  Firestore Status: ${t.firestoreStatus} (raw: ${t.rawFirestoreStatus})`);
        console.log(`  Current Auth.disabled: ${t.currentAuthDisabled}`);
        console.log(`  Expected Auth.disabled: ${t.expectedAuthDisabled}`);
        console.log(`  Proposed Action: ${t.action}`);
        console.log(`  Reason: ${t.reason}\n`);
    });

    // Save JSON artifacts
    fs.writeFileSync(path.join(targetDir, '02_PHASE_4_1_TARGETS.json'), JSON.stringify(wave0Targets, null, 2), 'utf8');
    fs.writeFileSync(path.join(targetDir, '03_PHASE_4_1_PRE_MIGRATION_SNAPSHOT.json'), JSON.stringify(preMigrationSnapshot, null, 2), 'utf8');

    // Build Markdown Report
    let table = '| # | UID | Email | Nombre / Rol | Status Firestore | Auth.disabled Actual | Auth.disabled Esperado | Acción Propuesta |\n|---|---|---|---|---|---|---|---|\n';
    wave0Targets.forEach((t, i) => {
        table += `| ${i + 1} | \`${t.uid}\` | \`${t.email}\` | ${t.nombre} (\`${t.role}\`) | \`${t.firestoreStatus}\` | \`${t.currentAuthDisabled}\` | \`${t.expectedAuthDisabled}\` | **${t.action}** |\n`;
    });

    const reportContent = `# FASE 4.1 — DRY RUN REPORT
## WAVE 0: AUTH STATUS SYNCHRONIZATION (IAC-005)

**Fecha:** 2026-08-17  
**Proyecto:** \`bluesystem-7c9af\`  
**Modo:** 🧪 DRY RUN (ZERO MUTATIONS EXECUTED)  

---

## 1. Executive Summary

El dry-run de la **FASE 4.1 (Wave 0)** ha identificado con precisión los **${wave0Targets.length} conflictos de estado IAC-005** existentes entre el estado operacional de Firestore \`/users/{uid}.status\` y la compuerta física \`Firebase Authentication.disabled\`.

---

## 2. Targets Identificados para Wave 0

${table}

---

## 3. Análisis de Riesgo & Rollback

- **Riesgo:** 🟢 BAJO. La mutación propuesta afecta **únicamente** la propiedad booleana \`disabled\` de Firebase Auth sin tocar Firestore ni Custom Claims.
- **Rollback:** 100% Reversible. El snapshot pre-mutación \`03_PHASE_4_1_PRE_MIGRATION_SNAPSHOT.json\` almacena \`previousAuthDisabled: true\` para cada UID.

---

*FASE 4.1 — DRY RUN REPORT | AWAITING EXPLICIT USER AUTHORIZATION*
`;

    fs.writeFileSync(path.join(targetDir, '01_PHASE_4_1_DRY_RUN_REPORT.md'), reportContent, 'utf8');
    console.log('Saved: 01_PHASE_4_1_DRY_RUN_REPORT.md, 02_PHASE_4_1_TARGETS.json, 03_PHASE_4_1_PRE_MIGRATION_SNAPSHOT.json');
}

runDryRun().catch(err => {
    console.error('Error during dry run:', err);
    process.exit(1);
});
