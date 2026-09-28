const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runE2EInspection() {
    console.log('=== BLUESYSTEM LIVE ENTITY DISCOVERY FOR E2E CERTIFICATION ===\n');

    // 1. Users & Roles
    console.log('--- 1. USERS & IDENTITIES ---');
    const usersSnap = await db.collection('users').limit(10).get();
    console.log(`Total users sample: ${usersSnap.size}`);
    usersSnap.forEach(d => {
        const u = d.data();
        console.log(`User [${d.id}]: email=${u.email}, role=${u.role || u.userType}, name=${u.name || u.displayName}, tenant=${u.tenantId || u.activeTenantId}`);
    });

    // 2. Businesses
    console.log('\n--- 2. BUSINESSES & COMMERCE ---');
    const bizSnap = await db.collection('businesses').limit(10).get();
    console.log(`Total businesses sample: ${bizSnap.size}`);
    bizSnap.forEach(d => {
        const b = d.data();
        console.log(`Business [${d.id}]: name=${b.name || b.nombre}, tenant=${b.tenantId}, isOpen=${b.isOpen || b.abierto}, deliveryFee=${b.deliveryFee}`);
    });

    // 3. Couriers
    console.log('\n--- 3. COURIERS & FLEET ---');
    const courierSnap = await db.collection('couriers').limit(5).get();
    console.log(`Total couriers sample: ${courierSnap.size}`);
    courierSnap.forEach(d => {
        const c = d.data();
        console.log(`Courier [${d.id}]: name=${c.name || c.nombre}, tenant=${c.tenantId || c.commercialTenantId}, muni=${c.operationalMunicipalityId || c.municipalityId || c.city}, active=${c.isActive || c.active}`);
    });

    // 4. Orders
    console.log('\n--- 4. COMMERCE ORDERS ---');
    const orderSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(5).get();
    console.log(`Recent orders count: ${orderSnap.size}`);
    orderSnap.forEach(d => {
        const o = d.data();
        console.log(`Order [${d.id}]: status=${o.status}, customerId=${o.customerId || o.userId}, bizId=${o.businessId || o.restaurantId}, deliveryFee=${o.deliveryFee}, total=${o.total}`);
    });

    // 5. DeliveryTrips (X->Y)
    console.log('\n--- 5. X->Y DELIVERY TRIPS ---');
    const tripSnap = await db.collection('deliveryTrips').orderBy('createdAt', 'desc').limit(5).get();
    console.log(`Recent trips count: ${tripSnap.size}`);
    tripSnap.forEach(d => {
        const t = d.data();
        console.log(`Trip [${d.id}]: status=${t.status}, customerId=${t.customerId || t.userId}, baseFee=${t.pricingSnapshot ? t.pricingSnapshot.baseFee : t.baseFee}, pricePerKm=${t.pricingSnapshot ? t.pricingSnapshot.pricePerKm : t.pricePerKm}, total=${t.totalAmount || t.pricingSnapshot?.total}`);
    });

    // 6. User Devices (Multidevice FCM)
    console.log('\n--- 6. USER DEVICES ---');
    const devSnap = await db.collection('user_devices').where('isActive', '==', true).limit(5).get();
    console.log(`Active user_devices sample: ${devSnap.size}`);
    devSnap.forEach(d => {
        const dev = d.data();
        console.log(`Device [${d.id}]: uid=${dev.uid}, role=${dev.role}, platform=${dev.platform}, fcmToken=${dev.fcmToken ? dev.fcmToken.substring(0, 15) + '...' : 'none'}, token=${dev.token ? dev.token.substring(0, 15) + '...' : 'none'}`);
    });

    // 7. Courier Daily Closures (ADR-018)
    console.log('\n--- 7. COURIER DAILY CLOSURES ---');
    const closureSnap = await db.collection('courier_daily_closures').orderBy('closureDate', 'desc').limit(5).get().catch(e => db.collection('courier_daily_closures').limit(5).get());
    console.log(`Recent closures count: ${closureSnap.size}`);
    closureSnap.forEach(d => {
        const cl = d.data();
        console.log(`Closure [${d.id}]: courierId=${cl.courierId}, status=${cl.status}, actNumber=${cl.actNumber}, cashOutstanding=${cl.cashOutstandingCents}`);
    });

    // 8. Organizations / Multi-Tenant Context
    console.log('\n--- 8. ORGANIZATIONS / TENANTS ---');
    const orgSnap = await db.collection('organizations').limit(5).get();
    console.log(`Organizations count: ${orgSnap.size}`);
    orgSnap.forEach(d => {
        const org = d.data();
        console.log(`Org [${d.id}]: name=${org.name}, status=${org.status}`);
    });
}

runE2EInspection().then(() => process.exit(0)).catch(e => {
    console.error('Inspection failed:', e);
    process.exit(1);
});
