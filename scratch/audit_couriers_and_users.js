const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectCouriersAndUsers() {
    console.log('=== INSPECTING /couriers ===');
    const couriersSnap = await db.collection('couriers').get();
    console.log(`Total /couriers docs: ${couriersSnap.size}`);
    couriersSnap.forEach(d => {
        const data = d.data();
        console.log(`[couriers/${d.id}]:`, {
            name: data.name || data.nombre,
            plate: data.plate || data.vehicle?.plate || data.placa,
            tenantId: data.tenantId,
            status: data.status,
            isActive: data.isActive,
            isAvailable: data.isAvailable,
            approvalStatus: data.approvalStatus,
            onboardingStatus: data.onboardingStatus,
            shiftState: data.shiftState,
            courierState: data.courierState
        });
    });

    console.log('\n=== INSPECTING /users WHERE role == courier / driver / motorizado ===');
    const usersSnap = await db.collection('users').get();
    console.log(`Total /users docs in DB: ${usersSnap.size}`);
    
    const candidateCouriers = [];
    const nonCourierUsers = [];

    usersSnap.forEach(d => {
        const data = d.data();
        const r = String(data.role || '').toLowerCase();
        const ut = String(data.userType || '').toLowerCase();
        const rol = String(data.rol || '').toLowerCase();
        const eiam = String(data.eiamRole || '').toUpperCase();

        const isCandidate = 
            r.includes('courier') || r.includes('motorizado') || r.includes('driver') ||
            ut.includes('courier') || ut.includes('motorizado') || ut.includes('driver') ||
            rol.includes('courier') || rol.includes('motorizado') || rol.includes('driver') ||
            eiam === 'DRIVER';

        const summary = {
            id: d.id,
            name: data.name || data.nombre || data.displayName,
            email: data.email || data.correo,
            phone: data.phone || data.telefono,
            role: data.role,
            rol: data.rol,
            userType: data.userType,
            eiamRole: data.eiamRole,
            tenantId: data.tenantId,
            isActive: data.isActive,
            active: data.active,
            status: data.status,
            identityOrigin: data.identityOrigin,
            approvalStatus: data.approvalStatus,
            onboardingStatus: data.onboardingStatus,
            requestedRole: data.requestedRole,
            existsInCouriers: couriersSnap.docs.some(cd => cd.id === d.id)
        };

        if (isCandidate) {
            candidateCouriers.push(summary);
        } else {
            nonCourierUsers.push(summary);
        }
    });

    console.log(`\nFound ${candidateCouriers.length} user docs matching candidate courier strings:`);
    console.log(JSON.stringify(candidateCouriers, null, 2));

    console.log(`\nFound ${nonCourierUsers.length} other user docs. Sample of non-couriers:`);
    console.log(JSON.stringify(nonCourierUsers.slice(0, 10), null, 2));
}

inspectCouriersAndUsers().then(() => process.exit(0)).catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
