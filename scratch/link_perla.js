const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function linkPerlaUid() {
    const uid = 'vbg7d4PwcEc5qe2KJ4kP2kfEXbq1';
    const empId = 'emp_1789431569608_en35';
    await db.collection('employees').doc(empId).update({
        uid: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ ${empId} vinculado con UID: ${uid}`);
}

linkPerlaUid().catch(console.error);
