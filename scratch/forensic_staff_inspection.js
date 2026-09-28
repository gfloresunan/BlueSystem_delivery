const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function getAccessToken() {
    return execSync('gcloud auth print-access-token').toString().trim();
}

async function getAllAuthAccounts() {
    try {
        const token = getAccessToken();
        const url = 'https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:batchGet?maxResults=1000';
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': 'bluesystem-7c9af'
            }
        });
        const data = await res.json();
        return data.users || [];
    } catch (e) {
        console.error('Error fetching auth accounts:', e.message);
        return [];
    }
}

async function runForensicAudit() {
    console.log('=== FASE 1: FORENSIC TRACE — AUDITORÍA DE AUTH Y STAFF ===\n');

    const authUsers = await getAllAuthAccounts();
    console.log(`[Firebase Auth] Total cuentas encontradas: ${authUsers.length}`);

    // Buscar Perla Centeno en Auth
    const perlaAuth = authUsers.find(u => u.email === 'perlactalavera@gmail.com');
    if (perlaAuth) {
        console.log('✅ Firebase Auth cuenta para perlactalavera@gmail.com:');
        console.log(`   localId (UID): ${perlaAuth.localId}`);
        console.log(`   email: ${perlaAuth.email}`);
        console.log(`   displayName: ${perlaAuth.displayName}`);
        console.log(`   disabled: ${perlaAuth.disabled}`);
        console.log(`   customAttributes (Claims): ${perlaAuth.customAttributes}`);
        console.log(`   passwordHash: ${perlaAuth.passwordHash ? 'EXISTS (Has Password)' : 'NONE'}`);
        console.log(`   providerUserInfo:`, JSON.stringify(perlaAuth.providerUserInfo));
    } else {
        console.log('❌ NO existe cuenta en Firebase Auth para perlactalavera@gmail.com');
    }

    console.log('\n=== FIN ===');
    process.exit(0);
}

runForensicAudit();
