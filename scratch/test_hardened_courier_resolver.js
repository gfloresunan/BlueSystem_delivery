const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function resolveEiamRole(dataOrString) {
    if (!dataOrString) return null;
    let raw = '';
    if (typeof dataOrString === 'string') {
        raw = dataOrString;
    } else if (typeof dataOrString === 'object') {
        raw = dataOrString.role || dataOrString.eiamRole || dataOrString.rol || dataOrString.userType || '';
    }
    const str = String(raw).toLowerCase().trim();
    if (!str) return null;

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

/**
 * Hardened Canonical Courier Eligibility Resolver
 */
function isCanonicalCourier(courierData, userData) {
    const c = courierData || {};
    const u = userData || {};

    const userRole = resolveEiamRole(u);

    // 1. REGLA CRÍTICA DE ROL INCOMPATIBLE:
    // Si existe perfil de usuario con rol explícito de Comercio, Admin, Staff, o Cliente,
    // se RECHAZA INMEDIATAMENTE. Cero tolerancia.
    if (userRole && userRole !== 'DRIVER') {
        return { isEligible: false, reason: `INCOMPATIBLE_ROLE_${userRole}` };
    }

    // 2. EXCLUSIÓN DE CLIENTES HISTÓRICOS / POS
    const uid = c.id || c.uid || u.uid || u.id || '';
    if (uid.startsWith('user_cli_') || uid.startsWith('user_cliente') || uid.startsWith('USR-CL-') || uid.startsWith('USR-')) {
        return { isEligible: false, reason: 'LEGACY_CLIENT_PREFIX' };
    }

    // 3. CALIFICACIÓN POSITIVA DE DOMINIO COURIER:
    // Camino A: Identidad DRIVER en EIAM con perfil courier activo
    const isEiamDriver = (userRole === 'DRIVER');

    // Camino B: Ficha de aprovisionamiento formal de Onboarding completa
    const isApprovedOnboarding = Boolean(
        (c.approvalStatus === 'APPROVED' || c.onboardingStatus === 'approved') &&
        (c.plate || c.vehicle?.plate || c.licensePlate) &&
        c.applicationId
    );

    if (!isEiamDriver && !isApprovedOnboarding) {
        // Es un stub sin identidad ni aprovisionamiento
        return { isEligible: false, reason: 'NOT_PROVISIONED_STUB' };
    }

    // 4. VERIFICACIÓN DE ESTADO ACTIVO (Sin suspensiones ni bloqueos)
    const isSuspended =
        c.status === 'SUSPENDED' || c.status === 'BLOCKED' || c.isActive === false || c.active === false ||
        u.status === 'SUSPENDED' || u.status === 'BLOCKED' || u.isActive === false || u.active === false;

    if (isSuspended) {
        return { isEligible: false, reason: 'SUSPENDED_OR_INACTIVE' };
    }

    // 5. Debe tener nombre identificable
    const name = c.name || c.nombre || u.name || u.nombre || '';
    if (!name.trim() || name === 'Sin nombre') {
        return { isEligible: false, reason: 'MISSING_NAME' };
    }

    return { isEligible: true, reason: isApprovedOnboarding ? 'CERTIFIED_ONBOARDING' : 'CERTIFIED_EIAM_DRIVER' };
}

async function runHardenedTest() {
    console.log('=== EVALUATING 59 CANDIDATES WITH HARDENED RESOLVER ===\n');
    const couriersSnap = await db.collection('couriers').get();
    const usersSnap = await db.collection('users').get();
    const usersMap = new Map();
    usersSnap.forEach(d => usersMap.set(d.id, d.data()));

    const couriersMap = new Map();
    couriersSnap.forEach(d => couriersMap.set(d.id, { id: d.id, ...d.data() }));

    const allIds = new Set([...couriersMap.keys()]);
    usersSnap.forEach(d => {
        if (resolveEiamRole(d.data()) === 'DRIVER') {
            allIds.add(d.id);
        }
    });

    const accepted = [];
    const rejectedByCategory = {};

    for (const id of allIds) {
        const cData = couriersMap.get(id);
        const uData = usersMap.get(id);

        const result = isCanonicalCourier(cData, uData);
        const name = (cData && (cData.name || cData.nombre)) || (uData && (uData.name || uData.nombre)) || id;

        if (result.isEligible) {
            const plate = (cData && (cData.plate || cData.vehicle?.plate)) || (uData && uData.placa) || 'N/A';
            const tenantId = (cData && cData.tenantId) || (uData && uData.tenantId) || 'GLOBAL';
            accepted.push({ id, name, plate, tenantId, qualification: result.reason });
        } else {
            const cat = result.reason;
            rejectedByCategory[cat] = rejectedByCategory[cat] || [];
            rejectedByCategory[cat].push({ id, name });
        }
    }

    console.log(`TOTAL EVALUATED: ${allIds.size}`);
    console.log(`TOTAL ACCEPTED: ${accepted.length}`);
    console.log(`TOTAL REJECTED: ${allIds.size - accepted.length}\n`);

    console.log('=== ACCEPTED COURIERS (EXACTLY 5 EXPECTED) ===');
    console.log(JSON.stringify(accepted, null, 2));

    console.log('\n=== REJECTED ENTITIES BY CATEGORY ===');
    for (const [cat, items] of Object.entries(rejectedByCategory)) {
        console.log(`\n-- CATEGORY: ${cat} (${items.length} entities) --`);
        items.forEach(it => console.log(`   [${it.id}] ${it.name}`));
    }
}

runHardenedTest().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
