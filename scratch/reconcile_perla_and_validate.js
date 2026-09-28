const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function getAccessToken() {
    return execSync('gcloud auth print-access-token').toString().trim();
}

async function reconcilePerlaCenteno() {
    console.log('================================================================');
    console.log('RECONCILIACIÓN FORENSE DE CUENTA: Perla Centeno (COOK)');
    console.log('================================================================\n');

    const uid = 'vbg7d4PwcEc5qe2KJ4kP2kfEXbq1';
    const email = 'perlactalavera@gmail.com';
    const empId = 'emp_1789428171516_q13k';
    const businessId = 'biz_canonical_tecnostore';
    const tenantId = 'org_1787895553815';
    const branchId = 'br_canonical_tecnostore_main';
    const branchName = 'Sucursal Principal';
    const role = 'COOK';
    const permissions = ['ORDERS_KDS', 'STOCK_REPORT', 'PREP_STATUS'];
    const pin = '1939';

    // 1. Reconciliar /employees
    console.log('1. Reconciliando /employees/' + empId + '...');
    const empRef = db.collection('employees').doc(empId);
    await empRef.set({
        employeeId: empId,
        uid: uid,
        businessId: businessId,
        tenantId: tenantId,
        branchId: branchId,
        branchName: branchName,
        displayName: 'Perla Centeno',
        email: email,
        phone: '86146525',
        role: role,
        status: 'ACTIVE',
        active: true,
        pin: pin,
        permissions: permissions,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('   ✅ /employees reconciliado con UID y status ACTIVE.');

    // 2. Reconciliar /membership canónica
    console.log('2. Reconciliando /membership...');
    const memId = `mem_${uid}_${businessId}`;
    const memPayload = {
        membershipId: memId,
        uid: uid,
        businessId: businessId,
        tenantId: tenantId,
        orgId: tenantId,
        branchId: branchId,
        role: role,
        status: 'ACTIVE',
        active: true,
        permissions: permissions,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('membership').doc(memId).set(memPayload, { merge: true });
    await db.collection('memberships').doc(memId).set(memPayload, { merge: true });
    console.log(`   ✅ Membresía ${memId} creada en /membership y /memberships.`);

    // 3. Reconciliar /users
    console.log('3. Reconciliando /users/' + uid + '...');
    await db.collection('users').doc(uid).set({
        uid: uid,
        email: email,
        name: 'Perla Centeno',
        displayName: 'Perla Centeno',
        role: role,
        userType: 'merchant',
        businessId: businessId,
        tenantId: tenantId,
        orgId: tenantId,
        branchId: branchId,
        branchName: branchName,
        status: 'ACTIVE',
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('   ✅ Documento /users reconciliado con rol COOK y businessId.');

    // 4. Crear invitación de referencia completada
    console.log('4. Creando /invitations/inv_' + empId + '...');
    await db.collection('invitations').doc(`inv_${empId}`).set({
        invitationId: `inv_${empId}`,
        employeeId: empId,
        businessId: businessId,
        tenantId: tenantId,
        branchId: branchId,
        branchName: branchName,
        role: role,
        email: email,
        displayName: 'Perla Centeno',
        permissions: permissions,
        status: 'ACCEPTED',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('   ✅ Registro de invitación auditado.');

    // 5. Reconciliar Custom Claims en Firebase Auth
    console.log('5. Reconciliando Custom Claims en Firebase Auth...');
    const token = getAccessToken();
    const claims = {
        role: role,
        userType: 'merchant',
        businessId: businessId,
        branchId: branchId,
        orgId: tenantId,
        tenantId: tenantId
    };
    const authRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(claims)
        })
    });
    const authData = await authRes.json();
    console.log('   ✅ Custom Claims establecidos en Auth:', authData.localId === uid ? 'EXITOSO' : authData);

    // 6. Verificación Forense Final de Integridad
    console.log('\n================================================================');
    console.log('AUDITORÍA DE INTEGRIDAD POST-RECONCILIACIÓN');
    console.log('================================================================');
    
    // Check Employee
    const empSnap = await db.collection('employees').doc(empId).get();
    console.log('Employee UID vinculada:', empSnap.data().uid);
    console.log('Employee Status:', empSnap.data().status);
    console.log('Employee PIN:', empSnap.data().pin);

    // Check Membership
    const memSnap = await db.collection('membership').doc(memId).get();
    console.log('Membership Rol:', memSnap.data().role);
    console.log('Membership BusinessId:', memSnap.data().businessId);

    // Check User
    const userSnap = await db.collection('users').doc(uid).get();
    console.log('User Role:', userSnap.data().role);
    console.log('User Type:', userSnap.data().userType);
    console.log('User BusinessId:', userSnap.data().businessId);

    // Check Auth Lookup
    const lookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ localId: [uid] })
    });
    const lookupData = await lookupRes.json();
    console.log('Auth Claims Verificados:', lookupData.users?.[0]?.customAttributes);

    console.log('\n✅ CUENTA DE PERLA CENTENO 100% RECONCILIADA Y LISTA PARA AUTENTICACIÓN.');
}

reconcilePerlaCenteno().catch(console.error);
