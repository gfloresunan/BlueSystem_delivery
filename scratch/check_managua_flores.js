const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkManaguaFlores() {
    const id = 'rCpnpzQVcoPDoUdU4cJE1HpuLGA2';
    console.log(`\n======================================================`);
    console.log(`INSPECTING COURIER: Delivery Managua Flores (UID: ${id})`);
    console.log(`======================================================`);

    const cDoc = await db.collection('couriers').doc(id).get();
    const uDoc = await db.collection('users').doc(id).get();
    const bDoc = await db.collection('courier_balances').doc(id).get();
    const gDoc = await db.collection('system_config').doc('global').get();

    console.log('\n--- /system_config/global ---');
    console.log(JSON.stringify(gDoc.data(), null, 2));

    console.log('\n--- /couriers/' + id + ' ---');
    if (cDoc.exists) {
        const d = cDoc.data();
        console.log({
            name: d.name,
            cashLimit: d.cashLimit,
            cashLimitCents: d.cashLimitCents,
            customCashLimitCents: d.customCashLimitCents,
            cashLimitUpdatedAt: d.cashLimitUpdatedAt,
            cashLimitUpdatedBy: d.cashLimitUpdatedBy
        });
    } else {
        console.log('Document does not exist');
    }

    console.log('\n--- /users/' + id + ' ---');
    if (uDoc.exists) {
        const d = uDoc.data();
        console.log({
            name: d.name,
            cashLimit: d.cashLimit,
            cashLimitCents: d.cashLimitCents,
            customCashLimitCents: d.customCashLimitCents
        });
    } else {
        console.log('Document does not exist');
    }

    console.log('\n--- /courier_balances/' + id + ' ---');
    if (bDoc.exists) {
        const d = bDoc.data();
        console.log({
            courierName: d.courierName,
            cashOutstandingCents: d.cashOutstandingCents,
            effectiveCashLimitCents: d.effectiveCashLimitCents,
            customCashLimitCents: d.customCashLimitCents,
            cashLimitCents: d.cashLimitCents,
            cashLimit: d.cashLimit,
            financialAccessState: d.financialAccessState,
            canReceiveNewOrders: d.canReceiveNewOrders,
            financialAccessReason: d.financialAccessReason,
            hasOverdueClosure: d.hasOverdueClosure,
            overdueClosureDate: d.overdueClosureDate,
            lastEvaluatedAt: d.lastEvaluatedAt
        });
    } else {
        console.log('Document does not exist');
    }
}

checkManaguaFlores().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
