const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkPerla() {
    const emp = await db.collection('employees').doc('emp_1789428171516_q13k').get();
    console.log('Employee exists:', emp.exists, emp.data());
    const mem = await db.collection('membership').doc('mem_vbg7d4PwcEc5qe2KJ4kP2kfEXbq1_biz_canonical_tecnostore').get();
    console.log('Membership exists:', mem.exists, mem.data());
}

checkPerla().catch(console.error);
