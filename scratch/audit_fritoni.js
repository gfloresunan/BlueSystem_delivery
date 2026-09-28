const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');
const { execSync } = require('child_process');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function runAudit() {
    console.log('====================================================');
    console.log('🔍 INICIANDO AUDITORIA FORENSE DE IDENTIDAD - FRITONI');
    console.log('====================================================\n');

    // 1. Audit Firebase Auth Users
    console.log('--- 1. FIREBASE AUTHENTICATION SEARCH ---');
    const emailsToSearch = ['fritoni@gmail.com', 'fritonic@gmail.com'];
    const authResults = {};

    for (const email of emailsToSearch) {
        try {
            const userRecord = await auth.getUserByEmail(email);
            authResults[email] = {
                found: true,
                uid: userRecord.uid,
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                disabled: userRecord.disabled,
                displayName: userRecord.displayName,
                phoneNumber: userRecord.phoneNumber,
                customClaims: userRecord.customClaims,
                providerData: userRecord.providerData.map(p => ({
                    providerId: p.providerId,
                    uid: p.uid,
                    email: p.email
                })),
                creationTime: userRecord.metadata.creationTime,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                lastRefreshTime: userRecord.metadata.lastRefreshTime
            };
        } catch (e) {
            authResults[email] = {
                found: false,
                error: e.code || e.message
            };
        }
    }
    console.log(JSON.stringify(authResults, null, 2));

    // Also check UID variations in Auth
    const uidsToSearch = [
        'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2',
        'd1rY2ZVUqPR2FXoc3czc0cXXRJg2',
        'd1rY2ZVUqPR2Fxoc3cazcOxxRJg2',
        'dlRY2ZVUqPR2FXoc3czc0cXXRJg2'
    ];
    console.log('\n--- 1.1 SEARCH AUTH BY UID ---');
    for (const uid of uidsToSearch) {
        try {
            const u = await auth.getUser(uid);
            console.log(`Auth UID [${uid}] FOUND -> Email: ${u.email}, Disabled: ${u.disabled}, Claims: ${JSON.stringify(u.customClaims)}`);
        } catch (e) {
            console.log(`Auth UID [${uid}] NOT FOUND (${e.code || e.message})`);
        }
    }

    // 2. Audit Firestore Collections
    console.log('\n--- 2. FIRESTORE SEARCH ACROSS COLLECTIONS ---');
    const collectionsToSearch = [
        'users',
        'membership',
        'businesses',
        'organizations',
        'branches',
        'merchant_applications',
        'merchants',
        'commerce',
        'shops',
        'user_devices',
        'audit_events'
    ];

    for (const colName of collectionsToSearch) {
        try {
            const colRef = db.collection(colName);
            // Search by ID or query by fields
            const docs = [];
            
            // Check direct doc IDs
            for (const uid of uidsToSearch) {
                const docSnap = await colRef.doc(uid).get();
                if (docSnap.exists) {
                    docs.push({ id: docSnap.id, source: 'direct_doc_id', data: docSnap.data() });
                }
            }

            // Also query collection if not too massive
            const snap = await colRef.get();
            snap.forEach(d => {
                const data = d.data();
                const str = JSON.stringify(data).toLowerCase();
                const matches = str.includes('fritoni') || 
                                str.includes('fritonic') || 
                                uidsToSearch.some(u => str.includes(u.toLowerCase()));
                if (matches) {
                    if (!docs.some(existing => existing.id === d.id)) {
                        docs.push({ id: d.id, source: 'content_match', data });
                    }
                }
            });

            console.log(`\nColección [${colName}]: ${docs.length} documentos encontrados`);
            for (const doc of docs) {
                console.log(`  > Doc ID: ${doc.id} (match: ${doc.source})`);
                console.log(`    Data:`, JSON.stringify(doc.data, null, 2));
            }
        } catch (e) {
            console.log(`Error buscando en colección [${colName}]:`, e.message);
        }
    }

    console.log('\n====================================================');
    console.log('AUDITORIA FORENSE FINALIZADA');
    console.log('====================================================');
}

runAudit().catch(err => {
    console.error('Fatal Error during audit:', err);
});
