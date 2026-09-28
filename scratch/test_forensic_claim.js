const testing = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

async function runForensicAudit() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('   FORENSIC AUDIT: FLEET POOL "ACEPTAR PEDIDO" PERMISSION_DENIED');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

  const testEnv = await testing.initializeTestEnvironment({
    projectId: 'bluesystem-courier-forensic',
    firestore: {
      rules: rules,
      host: '127.0.0.1',
      port: 8080
    }
  });

  const COURIER_UID = 'courier_henry_paz_123';
  const OTHER_COURIER_UID = 'courier_juan_456';
  const BIZ_ID = 'biz_tecnostore_1';
  const ORDER_ID_A = 'ORDER_READY_UNASSIGNED_NO_FIELDS';
  const ORDER_ID_B = 'ORDER_READY_NULL_ASSIGNED';
  const ORDER_ID_C = 'ORDER_READY_EMPTY_ASSIGNED';
  const ORDER_ID_D = 'ORDER_PREPARING';
  const ORDER_ID_E = 'ORDER_ASSIGNED_TO_OTHER';

  // Seed documents via Admin context (bypassing rules)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

    // 1. User doc
    await adminDb.collection('users').doc(COURIER_UID).set({
      email: 'henry@bluesystemdelivery.com',
      role: 'courier',
      userType: 'motorizado',
      tenantId: 'ten_bluesystem_core',
      operationalMunicipalityId: 'MANAGUA',
      isActive: true
    });

    // 2. Courier doc
    await adminDb.collection('couriers').doc(COURIER_UID).set({
      name: 'Henry Paz',
      phone: '+50588888888',
      tenantId: 'ten_bluesystem_core',
      operationalMunicipalityId: 'MANAGUA',
      active: true
    });

    // 3. Balance doc
    await adminDb.collection('courier_balances').doc(COURIER_UID).set({
      courierId: COURIER_UID,
      cashOutstandingCents: 0,
      effectiveCashLimitCents: 200000,
      canReceiveNewOrders: true,
      financialAccessState: 'ALLOW',
      hasOverdueClosure: false
    });

    // 4. Order A: Freshly created order by Merchant/Customer, ready in kitchen, no assignedCourierId / motorizadoId keys at all
    await adminDb.collection('orders').doc(ORDER_ID_A).set({
      businessId: BIZ_ID,
      branchId: 'br_1',
      customerId: 'cust_123',
      status: 'ready',
      estado: 'listo',
      serviceType: 'COMMERCE_DELIVERY',
      total: 350.0,
      commercialMunicipalityId: 'MANAGUA',
      tenantId: 'ten_bluesystem_core',
      createdAt: new Date()
    });

    // 5. Order B: Order with assignedCourierId: null, motorizadoId: null
    await adminDb.collection('orders').doc(ORDER_ID_B).set({
      businessId: BIZ_ID,
      branchId: 'br_1',
      customerId: 'cust_123',
      status: 'ready',
      estado: 'listo',
      serviceType: 'COMMERCE_DELIVERY',
      total: 250.0,
      assignedCourierId: null,
      motorizadoId: null,
      commercialMunicipalityId: 'MANAGUA',
      tenantId: 'ten_bluesystem_core',
      createdAt: new Date()
    });

    // 6. Order C: Order with assignedCourierId: "", motorizadoId: ""
    await adminDb.collection('orders').doc(ORDER_ID_C).set({
      businessId: BIZ_ID,
      branchId: 'br_1',
      customerId: 'cust_123',
      status: 'READY',
      serviceType: 'COMMERCE_DELIVERY',
      total: 180.0,
      assignedCourierId: '',
      motorizadoId: '',
      commercialMunicipalityId: 'MANAGUA',
      tenantId: 'ten_bluesystem_core',
      createdAt: new Date()
    });

    // 7. Order D: Preparing order
    await adminDb.collection('orders').doc(ORDER_ID_D).set({
      businessId: BIZ_ID,
      customerId: 'cust_123',
      status: 'preparing',
      total: 500.0,
      commercialMunicipalityId: 'MANAGUA'
    });

    // 8. Order E: Assigned to another courier
    await adminDb.collection('orders').doc(ORDER_ID_E).set({
      businessId: BIZ_ID,
      customerId: 'cust_123',
      status: 'courier_accepted',
      assignedCourierId: OTHER_COURIER_UID,
      motorizadoId: OTHER_COURIER_UID,
      total: 400.0,
      commercialMunicipalityId: 'MANAGUA'
    });
  });

  console.log('Database seeded successfully.\n');

  // Matrix of tokens to test
  const tokenVariations = [
    { name: 'Authenticated Courier with Custom Claim role=courier', auth: { uid: COURIER_UID, token: { role: 'courier', eiamRole: 'COURIER' } } },
    { name: 'Authenticated Courier WITHOUT Custom Claims (plain token)', auth: { uid: COURIER_UID, token: {} } },
    { name: 'Authenticated Courier with role=motorizado', auth: { uid: COURIER_UID, token: { role: 'motorizado' } } }
  ];

  for (const tVar of tokenVariations) {
    console.log(`\n======================================================================`);
    console.log(`TESTING TOKEN: ${tVar.name}`);
    console.log(`======================================================================`);

    const clientCtx = testEnv.authenticatedContext(tVar.auth.uid, tVar.auth.token);
    const db = clientCtx.firestore();

    // STEP 1: Test READ /courier_balances/{courierUid}
    try {
      await testing.assertSucceeds(db.collection('courier_balances').doc(COURIER_UID).get());
      console.log('  ✅ READ #1 /courier_balances/' + COURIER_UID + ' -> ALLOWED');
    } catch (err) {
      console.error('  ❌ READ #1 /courier_balances/' + COURIER_UID + ' -> DENIED:', err.message);
    }

    // STEP 2: Test READ /users/{courierUid}
    try {
      await testing.assertSucceeds(db.collection('users').doc(COURIER_UID).get());
      console.log('  ✅ READ #2 /users/' + COURIER_UID + ' -> ALLOWED');
    } catch (err) {
      console.error('  ❌ READ #2 /users/' + COURIER_UID + ' -> DENIED:', err.message);
    }

    // STEP 3: Test READ /couriers/{courierUid}
    try {
      await testing.assertSucceeds(db.collection('couriers').doc(COURIER_UID).get());
      console.log('  ✅ READ #3 /couriers/' + COURIER_UID + ' -> ALLOWED');
    } catch (err) {
      console.error('  ❌ READ #3 /couriers/' + COURIER_UID + ' -> DENIED:', err.message);
    }

    // STEP 4: Test READ /orders/{orderId}
    try {
      await testing.assertSucceeds(db.collection('orders').doc(ORDER_ID_A).get());
      console.log('  ✅ READ #4 /orders/' + ORDER_ID_A + ' (READY unassigned) -> ALLOWED');
    } catch (err) {
      console.error('  ❌ READ #4 /orders/' + ORDER_ID_A + ' -> DENIED:', err.message);
    }

    // STEP 5: Test UPDATE /orders/{orderId} (Claim Order A - no previous assigned fields)
    try {
      await testing.assertSucceeds(
        db.collection('orders').doc(ORDER_ID_A).update({
          status: 'courier_accepted',
          estado: 'aceptado_por_courier',
          courierPhase: 1,
          assignedCourierId: COURIER_UID,
          motorizadoId: COURIER_UID,
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
      );
      console.log('  ✅ UPDATE #1 /orders/' + ORDER_ID_A + ' (Claim Order A) -> ALLOWED');
    } catch (err) {
      console.error('  ❌ UPDATE #1 /orders/' + ORDER_ID_A + ' (Claim Order A) -> DENIED:', err.message);
    }

    // STEP 6: Test UPDATE /orders/{orderId} (Claim Order B - null fields)
    try {
      await testing.assertSucceeds(
        db.collection('orders').doc(ORDER_ID_B).update({
          status: 'courier_accepted',
          estado: 'aceptado_por_courier',
          courierPhase: 1,
          assignedCourierId: COURIER_UID,
          motorizadoId: COURIER_UID,
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
      );
      console.log('  ✅ UPDATE #2 /orders/' + ORDER_ID_B + ' (Claim Order B - null fields) -> ALLOWED');
    } catch (err) {
      console.error('  ❌ UPDATE #2 /orders/' + ORDER_ID_B + ' (Claim Order B) -> DENIED:', err.message);
    }

    // STEP 7: Test UPDATE /orders/{orderId} (Claim Order C - empty string fields)
    try {
      await testing.assertSucceeds(
        db.collection('orders').doc(ORDER_ID_C).update({
          status: 'courier_accepted',
          estado: 'aceptado_por_courier',
          courierPhase: 1,
          assignedCourierId: COURIER_UID,
          motorizadoId: COURIER_UID,
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
      );
      console.log('  ✅ UPDATE #3 /orders/' + ORDER_ID_C + ' (Claim Order C - empty string fields) -> ALLOWED');
    } catch (err) {
      console.error('  ❌ UPDATE #3 /orders/' + ORDER_ID_C + ' (Claim Order C) -> DENIED:', err.message);
    }

    // STEP 8: Test ADVERSARIAL: Claim Order E (Already assigned to OTHER courier) -> MUST BE DENIED
    try {
      await testing.assertFails(
        db.collection('orders').doc(ORDER_ID_E).update({
          status: 'courier_accepted',
          assignedCourierId: COURIER_UID,
          motorizadoId: COURIER_UID
        })
      );
      console.log('  🔒 SECURITY TEST #1: Courier A attempting to steal Order E assigned to Courier B -> CORRECTLY DENIED');
    } catch (err) {
      console.error('  ❌ SECURITY VULNERABILITY: Courier A was able to steal Order E:', err.message);
    }

    // STEP 9: Test Full Transaction (The exact client transaction from FirebaseManager.kt)
    try {
      await testing.assertSucceeds(
        db.runTransaction(async (transaction) => {
          const balanceDocRef = db.collection('courier_balances').doc(COURIER_UID);
          const courierDocRef = db.collection('users').doc(COURIER_UID);
          const courierProfileRef = db.collection('couriers').doc(COURIER_UID);
          const orderDocRef = db.collection('orders').doc(ORDER_ID_A);

          const bSnap = await transaction.get(balanceDocRef);
          const uSnap = await transaction.get(courierDocRef);
          const cSnap = await transaction.get(courierProfileRef);
          const oSnap = await transaction.get(orderDocRef);

          transaction.update(orderDocRef, {
            status: 'courier_accepted',
            estado: 'aceptado_por_courier',
            courierPhase: 1,
            assignedCourierId: COURIER_UID,
            motorizadoId: COURIER_UID,
            acceptedAt: new Date(),
            updatedAt: new Date()
          });
        })
      );
      console.log('  ✅ TRANSACTION #1: Full Transaction (aceptarPedido) -> ALLOWED');
    } catch (err) {
      console.error('  ❌ TRANSACTION #1: Full Transaction (aceptarPedido) -> DENIED:', err.message);
    }
  }

  await testEnv.cleanup();
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('   FORENSIC AUDIT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════════');
}

runForensicAudit().catch(err => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});
