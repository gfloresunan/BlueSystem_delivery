const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function testAccess() {
    try {
        console.log('Testing Firestore read on employees...');
        const snap = await db.collection('employees').doc('emp_1789428171516_q13k').get();
        console.log('Exists:', snap.exists, 'Data:', snap.data());
    } catch (e) {
        console.error('Firestore error:', e.message);
    }

    try {
        console.log('Testing admin.auth().getUser...');
        const user = await admin.auth().getUser('vbg7d4PwcEc5qe2KJ4kP2kfEXbq1');
        console.log('Auth user found:', user.email, 'Claims:', user.customClaims);
    } catch (e) {
        console.error('Admin Auth error:', e.message);
    }
}

testAccess();
