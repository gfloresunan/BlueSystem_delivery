const testing = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function runPhase3CTests() {
  console.log('================================================================');
  console.log('🧪 SUITE DE CERTIFICACIÓN FASE 3C: FIRESTORE RULES DELIVERYTRIPS');
  console.log('================================================================');

  const rules = fs.readFileSync('firestore.rules', 'utf8');

  const testEnv = await testing.initializeTestEnvironment({
    projectId: 'bluesystem-x2y-rules-test',
    firestore: {
      rules: rules,
      host: '127.0.0.1',
      port: 8080
    }
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const COURIER_UID = 'courier_motorizado_123';
  const CUSTOMER_UID = 'customer_client_456';
  const TRIP_ID = 'trip_env_test_001';

  try {
    // Setup inicial con Admin (bypass rules)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.collection('deliveryTrips').doc(TRIP_ID).set({
        tripId: TRIP_ID,
        serviceType: 'X_TO_Y_DELIVERY',
        customerId: CUSTOMER_UID,
        assignedCourierId: COURIER_UID,
        motorizadoId: COURIER_UID,
        courierId: COURIER_UID,
        status: 'in_transit',
        estado: 'en_camino',
        courierPhase: 2,
        pricingSnapshot: {
          baseFee: 35.0,
          pricePerKm: 10.0,
          calculatedAmount: 85.0,
          courierEarnings: 49.4,
          platformRevenue: 35.6
        },
        deliveryFee: 85.0,
        canonicalPrice: 85.0,
        paymentStatus: 'pending',
        paymentVerified: false,
        cashReceived: 0,
        createdAt: new Date().toISOString()
      });

      // Crear también una orden de Commerce para Test D
      await adminDb.collection('orders').doc('order_comm_test_001').set({
        orderId: 'order_comm_test_001',
        businessId: 'biz_store_1',
        customerId: CUSTOMER_UID,
        assignedCourierId: COURIER_UID,
        status: 'in_transit',
        total: 250.0,
        createdAt: new Date().toISOString()
      });
    });

    const courierCtx = testEnv.authenticatedContext(COURIER_UID, {
      role: 'COURIER',
      courierId: COURIER_UID
    });
    const courierDb = courierCtx.firestore();

    const clientCtx = testEnv.authenticatedContext(CUSTOMER_UID, {
      role: 'CUSTOMER'
    });
    const clientDb = clientCtx.firestore();

    // ── TEST A: X→Y OPERACIONAL (Repartidor completa encomienda con campos operativos) ──
    console.log('\n--- TEST A: X→Y CIERRE OPERACIONAL CANÓNICO ---');
    try {
      await testing.assertSucceeds(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          status: 'completed',
          estado: 'completado',
          courierPhase: 3,
          deliveredAt: new Date(),
          completedAt: new Date(),
          updatedAt: new Date(),
          historialEstados: [
            { status: 'delivered', estado: 'entregado', timestamp: new Date().toISOString() },
            { status: 'completed', estado: 'completado', timestamp: new Date().toISOString() }
          ],
          cashReceived: 100.0,
          changeGiven: 15.0,
          cashCollectedNet: 85.0,
          cashDiscrepancy: false,
          discrepancyAmount: 0.0
        })
      );
      assert(true, 'Test A: El repartidor pudo actualizar los campos operativos de cierre en deliveryTrips');
    } catch (e) {
      assert(false, `Test A: Falló actualización operativa: ${e.message}`);
    }

    // ── TEST B: ATAQUE FINANCIERO (Intento de inyectar financialReconciliationStatus) ──
    console.log('\n--- TEST B: ATAQUE FINANCIERO (financialReconciliationStatus) ---');
    try {
      await testing.assertFails(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          financialReconciliationStatus: 'RECONCILED_OK'
        })
      );
      assert(true, 'Test B1: Courier bloqueado al intentar escribir financialReconciliationStatus (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test B1: No se bloqueó financialReconciliationStatus: ${e.message}`);
    }

    try {
      await testing.assertFails(
        clientDb.collection('deliveryTrips').doc(TRIP_ID).update({
          financialReconciliationStatus: 'RECONCILED_OK'
        })
      );
      assert(true, 'Test B2: Cliente bloqueado al intentar escribir financialReconciliationStatus (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test B2: No se bloqueó a Cliente: ${e.message}`);
    }

    // ── TEST C: PROTECCIÓN DE SSOT FINANCIERA (pricingSnapshot, deliveryFee, canonicalPrice) ──
    console.log('\n--- TEST C: PROTECCIÓN DE SSOT FINANCIERA ---');
    try {
      await testing.assertFails(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          pricingSnapshot: { fake: true }
        })
      );
      assert(true, 'Test C1: Mutación de pricingSnapshot rechazada para courier (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test C1: Error: ${e.message}`);
    }

    try {
      await testing.assertFails(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          deliveryFee: 10.0
        })
      );
      assert(true, 'Test C2: Mutación de deliveryFee rechazada para courier (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test C2: Error: ${e.message}`);
    }

    try {
      await testing.assertFails(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          canonicalPrice: 10.0
        })
      );
      assert(true, 'Test C3: Mutación de canonicalPrice rechazada para courier (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test C3: Error: ${e.message}`);
    }

    try {
      await testing.assertFails(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          courierEarnings: 999.0
        })
      );
      assert(true, 'Test C4: Mutación de courierEarnings rechazada para courier (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test C4: Error: ${e.message}`);
    }

    try {
      await testing.assertFails(
        courierDb.collection('deliveryTrips').doc(TRIP_ID).update({
          platformRevenue: 0.0
        })
      );
      assert(true, 'Test C5: Mutación de platformRevenue rechazada para courier (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test C5: Error: ${e.message}`);
    }

    // ── TEST D: REGLAS DE COMMERCE INTACTAS ──
    console.log('\n--- TEST D: VERIFICACIÓN COMMERCE ORDERS ---');
    try {
      // Intentar que un usuario no autorizado o courier modifique el total de una orden Commerce
      await testing.assertFails(
        courierDb.collection('orders').doc('order_comm_test_001').update({
          total: 1.0
        })
      );
      assert(true, 'Test D: Mutación financiera en orders Commerce bloqueada como siempre (PERMISSION_DENIED)');
    } catch (e) {
      assert(false, `Test D: Error en regla Commerce: ${e.message}`);
    }

  } finally {
    await testEnv.cleanup();
  }

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL SUITE FASE 3C: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3CTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
