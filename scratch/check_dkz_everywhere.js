const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}
const db = admin.firestore();

async function checkAllCollectionsForDkz() {
    const targetUid = 'dKZf5tyzpUMNPk1Wy92BQgp4aMF3';
    const collections = await db.listCollections();
    console.log(`Checking ${collections.length} root collections for ${targetUid}...`);
    
    for (const col of collections) {
        const snap = await col.get();
        let count = 0;
        snap.forEach(doc => {
            const dataStr = JSON.stringify(doc.data());
            if (dataStr.includes(targetUid) || doc.id === targetUid) {
                console.log(`Found in collection [${col.id}] Doc [${doc.id}]`);
                count++;
            }
        });
        if (count > 0) {
            console.log(`Collection ${col.id}: ${count} matches`);
        }
    }
    console.log('Check finished.');
}

checkAllCollectionsForDkz().catch(console.error);
