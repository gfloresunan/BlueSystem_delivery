const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function analyzeAllCandidates() {
    const couriersSnap = await db.collection('couriers').get();
    const usersSnap = await db.collection('users').get();
    const usersMap = new Map();
    usersSnap.forEach(d => usersMap.set(d.id, d.data()));

    console.log('=== REAL COURIER CANDIDATES IN /couriers ===');
    couriersSnap.forEach(d => {
        const c = d.data();
        const u = usersMap.get(d.id) || {};
        
        // Checks if this doc has real courier attributes
        const hasCourierAttributes = Boolean(
            c.plate || c.vehicle || c.approvalStatus === 'APPROVED' || 
            c.onboardingStatus === 'approved' || c.applicationId ||
            c.isAvailable !== undefined || c.isOnline !== undefined
        );

        if (hasCourierAttributes) {
            console.log(`COURIER DOC [${d.id}]:`, {
                name: c.name || u.name,
                plate: c.plate || c.vehicle?.plate,
                tenantId: c.tenantId || u.tenantId,
                approvalStatus: c.approvalStatus,
                onboardingStatus: c.onboardingStatus,
                isActive: c.isActive,
                userRole: u.role,
                userEiamRole: u.eiamRole,
                userUserType: u.userType
            });
        }
    });

    console.log('\n=== REAL COURIER CANDIDATES IN /users ===');
    usersSnap.forEach(d => {
        const u = d.data();
        const r = String(u.role || '').toLowerCase();
        const ut = String(u.userType || '').toLowerCase();
        const rol = String(u.rol || '').toLowerCase();
        const eiam = String(u.eiamRole || '').toUpperCase();

        const isDriver = ['courier', 'motorizado', 'driver', 'repartidor'].includes(r) ||
                         ['courier', 'motorizado', 'driver', 'repartidor'].includes(ut) ||
                         ['courier', 'motorizado', 'driver', 'repartidor'].includes(rol) ||
                         eiam === 'DRIVER';

        if (isDriver) {
            console.log(`USER DOC [${d.id}]:`, {
                name: u.name,
                role: u.role,
                eiamRole: u.eiamRole,
                userType: u.userType,
                tenantId: u.tenantId,
                isActive: u.isActive,
                approvalStatus: u.approvalStatus
            });
        }
    });
}

analyzeAllCandidates().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
