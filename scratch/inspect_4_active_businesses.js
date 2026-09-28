const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectActive4() {
    const ids = [
        '00552e8b-3473-413c-9594-793fdb42dfdd',
        'bbb760d5-a8f3-4700-9a96-f58f11f345ac',
        'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2',
        'e7dc911e-e587-4be9-a741-7d9d9828011f'
    ];

    for (const id of ids) {
        const doc = await db.collection('businesses').doc(id).get();
        console.log(`=== BUSINESS: ${id} ===`);
        console.log(JSON.stringify(doc.data(), null, 2));
    }
}

inspectActive4().catch(console.error);
