const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectRecentWrites() {
    const snap = await db.collection('businesses')
        .orderBy('updatedAt', 'desc')
        .limit(10)
        .get();
    
    console.log('--- 10 MOST RECENTLY UPDATED BUSINESSES ---');
    snap.forEach(doc => {
        const d = doc.data();
        const t = d.updatedAt ? (d.updatedAt.toDate ? d.updatedAt.toDate() : new Date(d.updatedAt._seconds * 1000)) : null;
        console.log(`Doc ID: ${doc.id} | Name: "${d.name || d.comercioNombre}" | Time: ${t ? t.toISOString() : 'none'} | AppId: ${d.applicationId} | ownerUid: ${d.ownerUid}`);
    });
}

inspectRecentWrites().catch(console.error);
