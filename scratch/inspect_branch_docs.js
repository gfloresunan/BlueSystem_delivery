const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectBranches() {
    const branchIds = [
        '30945c9c-3aee-4e45-b35d-a998b57cf2fa',
        '794f7c02-8077-40a8-b260-2fdd27a6f35d'
    ];

    console.log('=== BRANCH DOCS BY ID ===\n');
    for (const id of branchIds) {
        const doc = await db.collection('branches').doc(id).get();
        console.log(`Branch ${id}:`, doc.exists ? JSON.stringify(doc.data(), null, 2) : 'NOT FOUND');
    }
}

inspectBranches().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
