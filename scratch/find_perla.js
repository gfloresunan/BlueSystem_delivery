const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function findPerlaEmployees() {
    const snap = await db.collection('employees').where('email', '==', 'perlactalavera@gmail.com').get();
    console.log(`Found ${snap.size} employees for perlactalavera@gmail.com:`);
    snap.forEach(d => console.log(d.id, d.data()));

    const allSnap = await db.collection('employees').get();
    console.log(`Total employees in collection: ${allSnap.size}`);
    allSnap.forEach(d => console.log(`- ${d.id}: email=${d.data().email}, uid=${d.data().uid}, role=${d.data().role}`));
}

findPerlaEmployees().catch(console.error);
