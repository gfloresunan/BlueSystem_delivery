const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

// 5 canonical certified couriers
const CANONICAL_COURIER_UIDS = new Set([
    '6VkVNQ2yRzS67kEIYfyATkuwBiI3', // Juan Delivery
    '9QHYGkSa3nWiJ7KfPkccjjuIaYp2', // Henry Paz
    'C6adh99jAXNqXJpIZaGFJJ5kFh72', // Delivery Pedro Flores
    'kpENhRwdmocYZsYZonmfWTWvdnC2', // Delivery Mario Flores
    'rCpnpzQVcoPDoUdU4cJE1HpuLGA2'  // Delivery Managua Flores
]);

function getAccessToken() {
    return execSync('gcloud auth print-access-token').toString().trim();
}

async function getAllAuthAccounts() {
    const token = getAccessToken();
    const url = 'https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:batchGet?maxResults=1000';
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af'
        }
    });
    const data = await res.json();
    return data.users || [];
}

async function safeGetCollection(collName) {
    try {
        const snap = await db.collection(collName).get();
        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return items;
    } catch (e) {
        console.warn(`Collection ${collName} could not be retrieved: ${e.message}`);
        return [];
    }
}

async function runAudit() {
    console.log('====================================================================');
    console.log(' PROTOCOL BSD-PRODUCTION-IDENTITY-DATA-CLEANUP-FORENSIC-001         ');
    console.log(' PHASE 0: FULL PRODUCTION SNAPSHOT & INVENTORY                      ');
    console.log(' PHASE 1: CANONICAL IDENTITY CLASSIFICATION & DEPENDENCY GRAPH     ');
    console.log(' MODE: READ-ONLY (ZERO MUTATIONS)                                  ');
    console.log('====================================================================\n');

    // 1. Snapshot Auth
    console.log('1. Fetching Firebase Auth Users...');
    const authUsers = await getAllAuthAccounts();
    console.log(`-> Total Firebase Auth accounts: ${authUsers.length}`);

    // 2. Snapshot Firestore Collections
    console.log('2. Fetching Firestore collections...');
    const collectionsToFetch = [
        'users', 'couriers', 'courier_balances', 'businesses', 'merchants',
        'branches', 'employees', 'membership', 'organizations', 'roles',
        'permissions', 'invitations', 'sessions', 'devices', 'user_devices',
        'orders', 'deliveryTrips', 'reviews', 'financial_events',
        'merchant_summaries', 'audit_events', 'courier_applications',
        'ubicaciones_repartidores', 'system_config', 'notification_campaigns'
    ];

    const store = {};
    for (const col of collectionsToFetch) {
        process.stdout.write(`Fetching ${col}... `);
        store[col] = await safeGetCollection(col);
        console.log(`(${store[col].length} docs)`);
    }

    // 3. Build lookup indexes
    const authByUid = new Map();
    const authByEmail = new Map();
    authUsers.forEach(u => {
        authByUid.set(u.localId, u);
        if (u.email) authByEmail.set(u.email.toLowerCase().trim(), u);
    });

    const usersByUid = new Map(store.users.map(u => [u.id, u]));
    const couriersByUid = new Map(store.couriers.map(c => [c.id, c]));
    const balancesByUid = new Map(store.courier_balances.map(b => [b.id, b]));
    const businessesById = new Map(store.businesses.map(b => [b.id, b]));
    const merchantsById = new Map(store.merchants.map(m => [m.id, m]));

    // Dependency sets by UID
    const ordersAsCustomer = new Map();
    const ordersAsCourier = new Map();
    const ordersAsMerchant = new Map();
    store.orders.forEach(o => {
        const custId = o.customerId || o.clientId || o.userId;
        if (custId) {
            if (!ordersAsCustomer.has(custId)) ordersAsCustomer.set(custId, []);
            ordersAsCustomer.get(custId).push(o.id);
        }
        const courId = o.assignedCourierId || o.courierId || o.motorizadoId || o.driverId;
        if (courId) {
            if (!ordersAsCourier.has(courId)) ordersAsCourier.set(courId, []);
            ordersAsCourier.get(courId).push(o.id);
        }
        const bizId = o.businessId || o.commerceId || o.merchantId;
        if (bizId) {
            if (!ordersAsMerchant.has(bizId)) ordersAsMerchant.set(bizId, []);
            ordersAsMerchant.get(bizId).push(o.id);
        }
    });

    const tripsAsCourier = new Map();
    store.deliveryTrips.forEach(t => {
        const cId = t.courierId || t.assignedCourierId || t.driverId;
        if (cId) {
            if (!tripsAsCourier.has(cId)) tripsAsCourier.set(cId, []);
            tripsAsCourier.get(cId).push(t.id);
        }
    });

    const reviewsAsSubject = new Map();
    const reviewsAsAuthor = new Map();
    store.reviews.forEach(r => {
        const authId = r.authorId || r.userId || r.customerId;
        if (authId) {
            if (!reviewsAsAuthor.has(authId)) reviewsAsAuthor.set(authId, []);
            reviewsAsAuthor.get(authId).push(r.id);
        }
        const targetId = r.courierId || r.motorizadoId || r.businessId;
        if (targetId) {
            if (!reviewsAsSubject.has(targetId)) reviewsAsSubject.set(targetId, []);
            reviewsAsSubject.get(targetId).push(r.id);
        }
    });

    const membershipsByUid = new Map();
    store.membership.forEach(m => {
        const uid = m.userId || m.uid || m.id;
        if (uid) {
            if (!membershipsByUid.has(uid)) membershipsByUid.set(uid, []);
            membershipsByUid.get(uid).push(m);
        }
    });

    const employeesByUid = new Map();
    store.employees.forEach(e => {
        const uid = e.userId || e.uid || e.id;
        if (uid) {
            if (!employeesByUid.has(uid)) employeesByUid.set(uid, []);
            employeesByUid.get(uid).push(e);
        }
    });

    const userDevicesByUid = new Map();
    store.user_devices.forEach(d => {
        const uid = d.userId || d.uid || (d.id && d.id.includes('_') ? d.id.split('_')[0] : null);
        if (uid) {
            if (!userDevicesByUid.has(uid)) userDevicesByUid.set(uid, []);
            userDevicesByUid.get(uid).push(d.id);
        }
    });

    const applicationsByUid = new Map();
    store.courier_applications.forEach(a => {
        const uid = a.userId || a.uid || a.applicantId || a.id;
        if (uid) {
            if (!applicationsByUid.has(uid)) applicationsByUid.set(uid, []);
            applicationsByUid.get(uid).push(a.id);
        }
    });

    const auditEventsByUid = new Map();
    store.audit_events.forEach(ae => {
        const uid = ae.actorUid || ae.userId || ae.uid;
        if (uid) {
            if (!auditEventsByUid.has(uid)) auditEventsByUid.set(uid, []);
            auditEventsByUid.get(uid).push(ae.id);
        }
    });

    // 4. Gather Universe of all known UIDs
    const allDiscoveredUids = new Set([
        ...authByUid.keys(),
        ...usersByUid.keys(),
        ...couriersByUid.keys(),
        ...balancesByUid.keys()
    ]);

    console.log(`\n3. Universe of unique identities to classify: ${allDiscoveredUids.size} UIDs`);

    const manifestItems = [];
    const classificationCounts = {};
    const proposedActionCounts = {};

    for (const uid of allDiscoveredUids) {
        const auth = authByUid.get(uid) || null;
        const userDoc = usersByUid.get(uid) || null;
        const courierDoc = couriersByUid.get(uid) || null;
        const balanceDoc = balancesByUid.get(uid) || null;

        // Custom claims
        let customClaims = {};
        if (auth && auth.customAttributes) {
            try {
                customClaims = JSON.parse(auth.customAttributes);
            } catch (e) {
                customClaims = {};
            }
        }

        // Gather dependency facts
        const dependencies = {
            hasAuth: !!auth,
            hasUserDoc: !!userDoc,
            hasCourierDoc: !!courierDoc,
            hasCourierBalance: !!balanceDoc,
            ordersAsCustomerCount: (ordersAsCustomer.get(uid) || []).length,
            ordersAsCourierCount: (ordersAsCourier.get(uid) || []).length,
            tripsAsCourierCount: (tripsAsCourier.get(uid) || []).length,
            reviewsAsAuthorCount: (reviewsAsAuthor.get(uid) || []).length,
            reviewsAsSubjectCount: (reviewsAsSubject.get(uid) || []).length,
            membershipsCount: (membershipsByUid.get(uid) || []).length,
            employeesCount: (employeesByUid.get(uid) || []).length,
            userDevicesCount: (userDevicesByUid.get(uid) || []).length,
            applicationsCount: (applicationsByUid.get(uid) || []).length,
            auditEventsCount: (auditEventsByUid.get(uid) || []).length,
            isReferencedInBusiness: businessesById.has(uid) || (userDoc && businessesById.has(userDoc.businessId)),
            isReferencedInMerchant: merchantsById.has(uid) || (userDoc && merchantsById.has(userDoc.businessId))
        };

        const totalOperationalReferences =
            dependencies.ordersAsCustomerCount +
            dependencies.ordersAsCourierCount +
            dependencies.tripsAsCourierCount +
            dependencies.reviewsAsAuthorCount +
            dependencies.reviewsAsSubjectCount +
            dependencies.membershipsCount +
            dependencies.employeesCount +
            dependencies.applicationsCount;

        // Determine Identity attributes
        const email = (auth?.email || userDoc?.email || courierDoc?.email || '').toLowerCase().trim();
        const displayName = auth?.displayName || userDoc?.name || userDoc?.nombre || userDoc?.displayName || courierDoc?.name || courierDoc?.nombre || courierDoc?.displayName || '';
        const role = String(userDoc?.role || userDoc?.rol || userDoc?.userType || userDoc?.eiamRole || customClaims.role || customClaims.eiamRole || '').toUpperCase().trim();
        const businessId = userDoc?.businessId || courierDoc?.businessId || customClaims.businessId || '';

        // Classification Logic according to strict section 4 & 5
        let classification = 'UNKNOWN';
        let proposedAction = 'REVIEW_REQUIRED';
        let reason = '';
        let risk = 'HIGH';

        // 1. SUPER_ADMIN check
        const isSuperAdminClaim = customClaims.role === 'SUPER_ADMIN' || customClaims.eiamRole === 'SUPER_ADMIN' || customClaims.isSuperAdmin === true;
        const isSuperAdminRole = role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || role === 'GERENTE_GENERAL';
        if (isSuperAdminClaim || isSuperAdminRole || email === 'admin@bluesystemdelivery.com' || email === 'gerencia@bluesystemdelivery.com') {
            classification = 'SUPER_ADMIN';
            proposedAction = 'KEEP';
            reason = 'Plataforma Core — Super Administrador operativo inmutable.';
            risk = 'ZERO';
        }
        // 2. ADMIN check
        else if (role === 'ADMIN' || role === 'ADMINISTRATOR' || role === 'AUDITOR' || customClaims.role === 'ADMIN') {
            classification = 'ADMIN';
            proposedAction = 'KEEP';
            reason = 'Personal administrativo de plataforma con rol EIAM activo.';
            risk = 'ZERO';
        }
        // 3. COURIER_REAL check
        else if (CANONICAL_COURIER_UIDS.has(uid)) {
            classification = 'COURIER_REAL';
            proposedAction = 'KEEP';
            reason = 'Courier canónico certificado de la flota operacional activa.';
            risk = 'ZERO';
        }
        // 4. MERCHANT_OWNER_REAL check
        else if (
            businessesById.has(uid) ||
            merchantsById.has(uid) ||
            (businessId && businessesById.has(businessId) && (role === 'OWNER' || role === 'BUSINESS' || role === 'MERCHANT'))
        ) {
            classification = 'MERCHANT_OWNER_REAL';
            proposedAction = 'KEEP';
            reason = 'Propietario / Representante legal de comercio real activo con catálogo y operaciones.';
            risk = 'ZERO';
        }
        // 5. MERCHANT_STAFF_REAL check
        else if (
            dependencies.employeesCount > 0 ||
            dependencies.membershipsCount > 0 ||
            (businessId && businessesById.has(businessId) && (role === 'MANAGER' || role === 'SUPERVISOR' || role === 'CASHIER' || role === 'COOK' || role === 'SELLER'))
        ) {
            classification = 'MERCHANT_STAFF_REAL';
            proposedAction = 'KEEP';
            reason = 'Personal operativo de comercio vinculado mediante /employees o /membership.';
            risk = 'ZERO';
        }
        // 6. Non-courier stub in /couriers (Check the 54 known contaminating docs)
        else if (courierDoc && !CANONICAL_COURIER_UIDS.has(uid)) {
            // Check what other presence it has
            if (role === 'OWNER' || businessesById.has(uid)) {
                classification = 'MERCHANT_OWNER_REAL';
                proposedAction = 'DELETE_COURIER_PROFILE_ONLY';
                reason = 'Comercio real con stub erróneo en /couriers. Conservar /users y Auth, eliminar únicamente /couriers/{uid}.';
                risk = 'LOW';
            } else if (role === 'ADMIN') {
                classification = 'ADMIN';
                proposedAction = 'DELETE_COURIER_PROFILE_ONLY';
                reason = 'Administrador con stub residual en /couriers. Conservar /users y Auth, eliminar únicamente /couriers/{uid}.';
                risk = 'LOW';
            } else if (role === 'CLIENT' || role === 'CUSTOMER' || dependencies.ordersAsCustomerCount > 0) {
                classification = 'CUSTOMER_REAL';
                proposedAction = 'DELETE_COURIER_PROFILE_ONLY';
                reason = 'Cliente real / histórico con stub erróneo en /couriers. Conservar /users y Auth, eliminar únicamente /couriers/{uid}.';
                risk = 'LOW';
            } else if (!userDoc && !auth && totalOperationalReferences === 0) {
                classification = 'STUB';
                proposedAction = 'DELETE_COURIER_PROFILE_ONLY';
                reason = 'Stub huérfano en /couriers sin documento en /users, sin cuenta Auth y sin dependencias operacionales.';
                risk = 'LOW';
            } else if (userDoc && !auth && totalOperationalReferences === 0 && (userDoc.role === 'CLIENT' || !userDoc.role)) {
                classification = 'STUB';
                proposedAction = 'DELETE_COURIER_PROFILE_ONLY';
                reason = 'Stub de sincronización POS o prueba en /couriers. Retener usuario /users como histórico o revisar, eliminar únicamente /couriers/{uid}.';
                risk = 'LOW';
            } else {
                classification = 'STUB';
                proposedAction = 'DELETE_COURIER_PROFILE_ONLY';
                reason = 'Documento en /couriers que no representa un courier operacional. Retener usuario y Auth.';
                risk = 'LOW';
            }
        }
        // 7. CUSTOMER_REAL check
        else if (
            role === 'CLIENT' ||
            role === 'CUSTOMER' ||
            dependencies.ordersAsCustomerCount > 0 ||
            dependencies.reviewsAsAuthorCount > 0
        ) {
            // Is it a legitimate customer?
            if (dependencies.ordersAsCustomerCount > 0 || auth || dependencies.userDevicesCount > 0) {
                classification = 'CUSTOMER_REAL';
                proposedAction = 'KEEP';
                reason = 'Cliente real del sistema con pedidos, cuenta Auth o dispositivos registrados.';
                risk = 'ZERO';
            } else {
                // Customer profile in /users without Auth and 0 orders (e.g. legacy POS customer created offline)
                classification = 'LEGACY_VALID';
                proposedAction = 'KEEP';
                reason = 'Cliente importado del sistema POS offline; se conserva para trazabilidad de ventas históricas.';
                risk = 'ZERO';
            }
        }
        // 8. TEST / DEMO ACCOUNT
        else if (
            email.includes('test') || email.includes('demo') || email.includes('prueba') ||
            displayName.toLowerCase().includes('test') || displayName.toLowerCase().includes('prueba') ||
            uid.startsWith('test_') || uid.startsWith('demo_')
        ) {
            if (totalOperationalReferences > 0) {
                classification = 'TEST_ACCOUNT';
                proposedAction = 'REVIEW_REQUIRED';
                reason = 'Cuenta de prueba pero con referencias en órdenes o auditoría de producción. Retener.';
                risk = 'HIGH';
            } else {
                classification = 'TEST_ACCOUNT';
                proposedAction = 'REVIEW_REQUIRED';
                reason = 'Cuenta de prueba sin dependencias operacionales.';
                risk = 'MEDIUM';
            }
        }
        // 9. ORPHAN
        else if (!auth && totalOperationalReferences === 0) {
            classification = 'ORPHAN';
            proposedAction = 'REVIEW_REQUIRED';
            reason = 'Documento en Firestore sin cuenta Auth correspondiente y sin referencias operacionales.';
            risk = 'MEDIUM';
        }
        // 10. SYSTEM_SERVICE
        else if (email.includes('firebase') || email.includes('service') || uid.includes('system')) {
            classification = 'SYSTEM_SERVICE';
            proposedAction = 'KEEP';
            reason = 'Cuenta de servicio del sistema o infraestructura.';
            risk = 'ZERO';
        }
        else {
            classification = 'UNKNOWN';
            proposedAction = 'REVIEW_REQUIRED';
            reason = 'Identidad no determinística según reglas automáticas; requiere análisis manual.';
            risk = 'HIGH';
        }

        // Track counts
        classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
        proposedActionCounts[proposedAction] = (proposedActionCounts[proposedAction] || 0) + 1;

        manifestItems.push({
            uid,
            email: email || null,
            displayName: displayName || null,
            role: role || null,
            classification,
            proposedAction,
            reason,
            risk,
            firestoreDocuments: {
                users: !!userDoc,
                couriers: !!courierDoc,
                courier_balances: !!balanceDoc
            },
            authAccount: auth ? {
                email: auth.email || null,
                disabled: auth.disabled || false,
                emailVerified: auth.emailVerified || false,
                lastLoginAt: auth.lastLoginAt || null,
                createdAt: auth.createdAt || null
            } : null,
            dependencies,
            rollbackReference: {
                hasUserSnapshot: !!userDoc,
                hasCourierSnapshot: !!courierDoc
            }
        });
    }

    console.log('\n====================================================================');
    console.log(' DRY RUN SUMMARY REPORT (ZERO DATA WRITTEN OR DELETED)             ');
    console.log('====================================================================');
    console.log(`Total Firebase Auth: ${authUsers.length}`);
    console.log(`Total /users:        ${store.users.length}`);
    console.log(`Total /couriers:     ${store.couriers.length}`);
    console.log(`Total Identities:    ${manifestItems.length}\n`);

    console.log('--- CLASSIFICATION BREAKDOWN ---');
    for (const [k, v] of Object.entries(classificationCounts)) {
        console.log(`  ${k.padEnd(25)}: ${v}`);
    }

    console.log('\n--- PROPOSED ACTIONS BREAKDOWN ---');
    for (const [k, v] of Object.entries(proposedActionCounts)) {
        console.log(`  ${k.padEnd(30)}: ${v}`);
    }

    // Check Multiple Super Admin Candidates
    const superAdmins = manifestItems.filter(i => i.classification === 'SUPER_ADMIN');
    console.log(`\nSuper Admins identified: ${superAdmins.length}`);
    superAdmins.forEach(sa => console.log(`  -> ${sa.uid} (${sa.email}) - ${sa.displayName}`));

    // Write Full Manifest JSON
    const manifestPath = path.join(__dirname, '../BSD-PRODUCTION-IDENTITY-CLEANUP-MANIFEST.json');
    fs.writeFileSync(manifestPath, JSON.stringify({
        protocol: 'BSD-PRODUCTION-IDENTITY-DATA-CLEANUP-FORENSIC-001',
        timestamp: new Date().toISOString(),
        totalAuthUsers: authUsers.length,
        totalFirestoreUsers: store.users.length,
        totalFirestoreCouriers: store.couriers.length,
        totalClassifiedIdentities: manifestItems.length,
        classificationSummary: classificationCounts,
        proposedActionSummary: proposedActionCounts,
        superAdminCandidates: superAdmins.map(sa => ({ uid: sa.uid, email: sa.email, name: sa.displayName })),
        manifest: manifestItems
    }, null, 2), 'utf8');
    console.log(`\n-> Manifest written to: BSD-PRODUCTION-IDENTITY-CLEANUP-MANIFEST.json`);

    // Write Audit Snapshot JSON
    const auditSnapshotPath = path.join(__dirname, '../BSD-PRODUCTION-IDENTITY-CLEANUP-AUDIT.json');
    fs.writeFileSync(auditSnapshotPath, JSON.stringify({
        protocol: 'BSD-PRODUCTION-IDENTITY-DATA-CLEANUP-FORENSIC-001',
        timestamp: new Date().toISOString(),
        collectionCounts: Object.fromEntries(Object.entries(store).map(([k, v]) => [k, v.length])),
        authUsersSnapshot: authUsers.map(u => ({
            uid: u.localId,
            email: u.email,
            displayName: u.displayName,
            disabled: u.disabled,
            createdAt: u.createdAt,
            lastLoginAt: u.lastLoginAt,
            customAttributes: u.customAttributes
        })),
        usersSnapshot: store.users,
        couriersSnapshot: store.couriers,
        courierBalancesSnapshot: store.courier_balances
    }, null, 2), 'utf8');
    console.log(`-> Audit Snapshot written to: BSD-PRODUCTION-IDENTITY-CLEANUP-AUDIT.json`);

    console.log('\n====================================================================');
    console.log(' AUDIT & SNAPSHOT COMPLETED WITH ZERO MUTATIONS                    ');
    console.log('====================================================================');
}

runAudit().catch(e => {
    console.error('Audit failed:', e);
    process.exit(1);
});
