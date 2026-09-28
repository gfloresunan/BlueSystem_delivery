const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

// Replication of CanonicalIdentityResolver.resolveEiamRole
function resolveEiamRole(dataOrString) {
    if (!dataOrString) return 'CLIENT';
    let raw = '';
    if (typeof dataOrString === 'string') {
        raw = dataOrString;
    } else if (typeof dataOrString === 'object') {
        raw = dataOrString.role || dataOrString.eiamRole || dataOrString.rol || dataOrString.userType || '';
    }
    const str = String(raw).toLowerCase().trim();
    const mapping = {
        'super_admin': 'SUPER_ADMIN', 'superadmin': 'SUPER_ADMIN', 'gerente_general': 'SUPER_ADMIN',
        'admin': 'ADMIN', 'administrator': 'ADMIN', 'auditor': 'AUDITOR', 'support': 'SUPPORT',
        'owner': 'OWNER', 'business': 'OWNER', 'comercio': 'OWNER', 'merchant': 'OWNER',
        'manager': 'MANAGER', 'supervisor': 'SUPERVISOR', 'cashier': 'CASHIER', 'seller': 'CASHIER', 'cook': 'COOK',
        'driver': 'DRIVER', 'motorizado': 'DRIVER', 'courier': 'DRIVER', 'repartidor': 'DRIVER', 'deliverer': 'DRIVER',
        'client': 'CLIENT', 'customer': 'CLIENT', 'cliente': 'CLIENT', 'user': 'CLIENT', 'guest': 'GUEST'
    };
    return mapping[str] || 'CLIENT';
}

function isValidCourier(courierDocData, userDocData) {
    const c = courierDocData || {};
    const u = userDocData || {};

    // 1. Role verification in /users (if user doc exists)
    const userRole = resolveEiamRole(u);
    
    // Explicitly reject non-driver roles if user profile exists
    if (userDocData && userRole !== 'DRIVER' && userRole !== 'CLIENT') {
        // It's ADMIN, OWNER, MANAGER, CASHIER, etc.
        return false;
    }

    // If user is explicitly a CLIENT/CUSTOMER and has NO courier approval/vehicle in /couriers
    const hasCourierCredentials = Boolean(
        c.approvalStatus === 'APPROVED' ||
        c.onboardingStatus === 'approved' ||
        c.applicationId ||
        c.plate ||
        c.vehicle?.plate ||
        c.licensePlate ||
        u.approvalStatus === 'APPROVED' ||
        userRole === 'DRIVER'
    );

    if (!hasCourierCredentials) {
        return false;
    }

    // If user exists and is CLIENT, but has NO approved courier profile or plate
    if (userDocData && userRole === 'CLIENT' && !(c.approvalStatus === 'APPROVED' || c.plate || c.vehicle?.plate)) {
        return false;
    }

    // Reject pure stubs (only name/displayName and nothing else)
    const cKeys = Object.keys(c).filter(k => !['name', 'nombre', 'displayName', 'updatedAt'].includes(k));
    if (cKeys.length === 0 && userRole !== 'DRIVER') {
        return false;
    }

    // Check suspension / block
    const isSuspended = 
        c.status === 'SUSPENDED' || c.status === 'BLOCKED' || c.isActive === false || c.active === false ||
        u.status === 'SUSPENDED' || u.status === 'BLOCKED' || u.isActive === false || u.active === false;

    // Must have a valid identifier / name
    const name = c.name || c.nombre || u.name || u.nombre;
    if (!name || name === 'Sin nombre') return false;

    return true;
}

async function testFilter() {
    const couriersSnap = await db.collection('couriers').get();
    const usersSnap = await db.collection('users').get();
    const usersMap = new Map();
    usersSnap.forEach(d => usersMap.set(d.id, d.data()));

    const couriersMap = new Map();
    couriersSnap.forEach(d => couriersMap.set(d.id, d.data()));

    // Collect all candidate IDs from /couriers and users with role == DRIVER
    const allIds = new Set([...couriersMap.keys()]);
    usersSnap.forEach(d => {
        if (resolveEiamRole(d.data()) === 'DRIVER') {
            allIds.add(d.id);
        }
    });

    console.log(`Total candidate IDs evaluated: ${allIds.size}`);

    const validCouriers = [];
    const rejectedEntities = [];

    for (const id of allIds) {
        const cData = couriersMap.get(id);
        const uData = usersMap.get(id);

        if (isValidCourier(cData, uData)) {
            const name = (cData && (cData.name || cData.nombre)) || (uData && (uData.name || uData.nombre));
            const plate = (cData && (cData.plate || cData.vehicle?.plate)) || (uData && uData.placa) || 'N/A';
            const tenantId = (cData && cData.tenantId) || (uData && uData.tenantId) || 'GLOBAL';
            validCouriers.push({ id, name, plate, tenantId });
        } else {
            const name = (cData && (cData.name || cData.nombre)) || (uData && (uData.name || uData.nombre)) || id;
            rejectedEntities.push({ id, name, userRole: uData ? resolveEiamRole(uData) : 'NO_USER' });
        }
    }

    console.log(`\n=== VALID COURIERS (${validCouriers.length}) ===`);
    console.log(JSON.stringify(validCouriers, null, 2));

    console.log(`\n=== REJECTED ENTITIES (${rejectedEntities.length}) ===`);
    console.log(JSON.stringify(rejectedEntities, null, 2));
}

testFilter().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
