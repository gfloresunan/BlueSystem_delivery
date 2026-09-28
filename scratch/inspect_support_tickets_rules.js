const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function inspectSupportAndUser() {
    console.log('=== INSPECTING USER & SUPPORT TICKETS ===\n');

    // 1. Find user by email
    try {
        const userRecord = await auth.getUserByEmail('familiaflorescenteno@gmail.com');
        console.log(`Auth User found: UID=${userRecord.uid}, Email=${userRecord.email}`);
        console.log(`Custom claims:`, userRecord.customClaims);
        
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        console.log(`User Doc in /users/${userRecord.uid}: exists=${userDoc.exists}`);
        if (userDoc.exists) {
            console.log(`Data:`, userDoc.data());
        }
    } catch (e) {
        console.error('Error finding user:', e.message);
    }

    // 2. Check /support_tickets collection
    const ticketsSnap = await db.collection('support_tickets').get();
    console.log(`\n/support_tickets count: ${ticketsSnap.size}`);
    ticketsSnap.forEach(t => {
        console.log(`Ticket: ${t.id} =>`, t.data());
    });
}

inspectSupportAndUser().catch(console.error);
