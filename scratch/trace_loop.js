const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function traceLoop() {
    console.log('=== TRACE MERCHANT APPLICATION LOOP ===');
    const docRef = db.collection('merchant_applications').doc('icmP7k8O9gbqIvEa1ZWY');
    const doc = await docRef.get();
    console.log('Current state of icmP7k8O9gbqIvEa1ZWY:', JSON.stringify(doc.data(), null, 2));

    // Also check if there are recent audit_events
    const recentAudit = await db.collection('audit_events')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    console.log(`\nLast 10 audit events:`);
    recentAudit.forEach(d => {
        const data = d.data();
        const t = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp._seconds * 1000)) : null;
        console.log(`[${t ? t.toISOString() : 'no time'}] event: ${data.event} | appId: ${data.applicationId} | bizId: ${data.businessId} | uid: ${data.uid}`);
    });
}

traceLoop().catch(console.error);
