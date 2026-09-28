const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function syncPerlaDocs() {
    const uid = 'vbg7d4PwcEc5qe2KJ4kP2kfEXbq1';
    const payload = {
        employeeId: 'emp_1789428171516_q13k',
        uid: uid,
        businessId: 'biz_canonical_tecnostore',
        tenantId: 'org_1787895553815',
        branchId: 'br_canonical_tecnostore_main',
        branchName: 'Sucursal Principal',
        displayName: 'Perla Centeno',
        email: 'perlactalavera@gmail.com',
        phone: '86146525',
        role: 'COOK',
        status: 'ACTIVE',
        active: true,
        pin: '1939',
        permissions: ['ORDERS_KDS', 'STOCK_REPORT', 'PREP_STATUS'],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('employees').doc('emp_1789428171516_q13k').set(payload, { merge: true });
    await db.collection('employees').doc('emp_1789431569608_en35').set({
        ...payload,
        employeeId: 'emp_1789431569608_en35'
    }, { merge: true });

    console.log('✅ Documentos de Perla Centeno sincronizados con UID y PIN 1939.');
}

syncPerlaDocs().catch(console.error);
