const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectEmailEvents() {
    console.log('=== INSPECCIÓN DE /email_events ===');
    const snap = await db.collection('email_events').orderBy('createdAt', 'desc').limit(15).get();
    console.log(`Eventos encontrados: ${snap.size}`);
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`- EventId: ${doc.id}`);
        console.log(`  Type: ${d.eventType}, Recipient: ${d.recipient}, Status: ${d.status}`);
        console.log(`  Error: ${d.error || 'none'}, Category: ${d.errorCategory || 'none'}`);
        console.log(`  ProviderMessageId: ${d.providerMessageId || 'none'}`);
        console.log(`  CreatedAt: ${d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt}`);
    });
}

inspectEmailEvents().catch(console.error);
