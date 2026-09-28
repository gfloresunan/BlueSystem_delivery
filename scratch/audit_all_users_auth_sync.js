const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}
const db = admin.firestore();

async function auditAllUsers() {
    console.log("=== AUDITORÍA COMPLETA FIRESTORE /users vs FIREBASE AUTH ===");
    
    // Get all firestore users
    const usersSnap = await db.collection("users").get();
    console.log(`Total usuarios en Firestore /users: ${usersSnap.size}`);

    // Get all Auth users via Identity Toolkit
    const authLookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:batchGet?maxResults=1000', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af'
        }
    });
    const authData = await authLookupRes.json();
    const authUsers = authData.users || [];
    console.log(`Total usuarios en Firebase Auth: ${authUsers.length}`);

    const authMapByUid = new Map();
    const authMapByEmail = new Map();
    authUsers.forEach(u => {
        authMapByUid.set(u.localId, u);
        if (u.email) authMapByEmail.set(u.email.toLowerCase(), u);
    });

    let authBackedCount = 0;
    let firestoreOnlyCount = 0;
    const firestoreOnlyList = [];

    usersSnap.forEach(doc => {
        const u = doc.data();
        const uid = doc.id;
        const email = (u.email || '').toLowerCase();

        const authByUid = authMapByUid.get(uid);
        const authByEmail = email ? authMapByEmail.get(email) : null;

        if (authByUid) {
            authBackedCount++;
        } else {
            firestoreOnlyCount++;
            firestoreOnlyList.push({
                uid,
                email: u.email,
                name: u.nombre || u.name,
                role: u.role || u.rol || u.eiamRole,
                businessId: u.businessId,
                authHasSameEmailWithDifferentUid: authByEmail ? authByEmail.localId : null
            });
        }
    });

    console.log(`\nResultados:`);
    console.log(` - AUTH_BACKED (UID coincide): ${authBackedCount}`);
    console.log(` - FIRESTORE_ONLY (UID no en Auth): ${firestoreOnlyCount}`);
    console.log(`\nDetalle de usuarios FIRESTORE_ONLY:`);
    firestoreOnlyList.forEach(item => {
        console.log(` -> UID: ${item.uid}, Email: ${item.email}, Name: ${item.name}, Role: ${item.role}, Biz: ${item.businessId}`);
        if (item.authHasSameEmailWithDifferentUid) {
            console.log(`    ⚠ ATENCIÓN: Mismo email existe en Auth con otro UID: ${item.authHasSameEmailWithDifferentUid}`);
        }
    });
}

auditAllUsers().catch(console.error);
