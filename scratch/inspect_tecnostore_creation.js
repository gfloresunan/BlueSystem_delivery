const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectTecnostore() {
    console.log('=== INSPECT TECNOSTORE APPLICATIONS & TIMESTAMPS ===');

    const appSnap = await db.collection('merchant_applications').get();
    appSnap.forEach(doc => {
        console.log(`Application [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
    });

    const auditSnap = await db.collection('audit_events')
        .where('event', '==', 'BUSINESS_CREATED')
        .get();
    console.log(`Total BUSINESS_CREATED audit events: ${auditSnap.size}`);

    // Sample first 5 and last 5 audit events
    const docs = auditSnap.docs;
    console.log('\n--- First 3 BUSINESS_CREATED events ---');
    docs.slice(0, 3).forEach(d => console.log(d.id, JSON.stringify(d.data(), null, 2)));
    console.log('\n--- Last 3 BUSINESS_CREATED events ---');
    docs.slice(-3).forEach(d => console.log(d.id, JSON.stringify(d.data(), null, 2)));

    // Check timestamps distribution
    if (docs.length > 0) {
        const timestamps = docs.map(d => {
            const t = d.data().timestamp;
            return t ? (t.toDate ? t.toDate() : new Date(t._seconds * 1000)) : null;
        }).filter(Boolean);
        timestamps.sort((a, b) => a - b);
        console.log(`Earliest event: ${timestamps[0]}`);
        console.log(`Latest event: ${timestamps[timestamps.length - 1]}`);
    }
}

inspectTecnostore().catch(console.error);
