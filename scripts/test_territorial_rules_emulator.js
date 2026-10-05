const testing = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function runTerritorialRulesEmulatorTests() {
  console.log('========================================================================');
  console.log('🧪 SUITE DE CERTIFICACIÓN DE FIRESTORE RULES CON EMULATOR REAL (EIAM)');
  console.log('Colecciones: /territorial_pricing_policies y /pricing_quotes');
  console.log('========================================================================');

  const rules = fs.readFileSync('firestore.rules', 'utf8');

  const testEnv = await testing.initializeTestEnvironment({
    projectId: 'bluesystem-territorial-emulator-test',
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

  const POLICY_ID = 'NI_MATAGALPA_CIUDAD_DARIO';
  const QUOTE_ID = 'quote_emu_test_101';
  const CUSTOMER_UID = 'cust_emulator_client_001';
  const ATTACKER_UID = 'cust_emulator_attacker_999';
  const COURIER_UID = 'courier_emulator_driver_002';
  const MERCHANT_UID = 'merchant_owner_003';
  const ADMIN_UID = 'admin_platform_004';
  const SUPER_ADMIN_UID = 'super_admin_root_005';

  try {
    // 0. Setup inicial en DB deshabilitando reglas (Admin SDK bypass)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.collection('territorial_pricing_policies').doc(POLICY_ID).set({
        countryCode: 'NI',
        departmentId: 'MATAGALPA',
        municipalityId: 'CIUDAD_DARIO',
        pricingMode: 'FLAT',
        fixedDeliveryFee: 40.0,
        currency: 'NIO',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      await adminDb.collection('pricing_quotes').doc(QUOTE_ID).set({
        quoteId: QUOTE_ID,
        customerId: CUSTOMER_UID,
        businessId: 'biz_store_dario',
        municipalityId: 'CIUDAD_DARIO',
        deliveryFee: 40.0,
        pricingMode: 'FLAT',
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });
    });

    // Contextos autenticados
    const customerDb = testEnv.authenticatedContext(CUSTOMER_UID, { role: 'CUSTOMER' }).firestore();
    const attackerDb = testEnv.authenticatedContext(ATTACKER_UID, { role: 'CUSTOMER' }).firestore();
    const courierDb = testEnv.authenticatedContext(COURIER_UID, { role: 'COURIER' }).firestore();
    const merchantDb = testEnv.authenticatedContext(MERCHANT_UID, { role: 'MERCHANT_OWNER', businessId: 'biz_store_dario' }).firestore();
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { role: 'ADMIN' }).firestore();
    const superAdminDb = testEnv.authenticatedContext(SUPER_ADMIN_UID, { role: 'SUPER_ADMIN' }).firestore();
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    // ── SEC-TERR-01: Customer read /territorial_pricing_policies -> DENY ──
    try {
      await testing.assertFails(customerDb.collection('territorial_pricing_policies').doc(POLICY_ID).get());
      assert(true, 'SEC-TERR-01: Customer read /territorial_pricing_policies -> DENY');
    } catch (e) {
      assert(false, `SEC-TERR-01 failed: ${e.message}`);
    }

    // ── SEC-TERR-02: Customer create/update /territorial_pricing_policies -> DENY ──
    try {
      await testing.assertFails(customerDb.collection('territorial_pricing_policies').doc('NI_MANAGUA_MANAGUA').set({ fixedDeliveryFee: 1.0 }));
      assert(true, 'SEC-TERR-02: Customer create/update /territorial_pricing_policies -> DENY');
    } catch (e) {
      assert(false, `SEC-TERR-02 failed: ${e.message}`);
    }

    // ── SEC-TERR-03: Courier read /territorial_pricing_policies -> DENY ──
    try {
      await testing.assertFails(courierDb.collection('territorial_pricing_policies').doc(POLICY_ID).get());
      assert(true, 'SEC-TERR-03: Courier read /territorial_pricing_policies -> DENY');
    } catch (e) {
      assert(false, `SEC-TERR-03 failed: ${e.message}`);
    }

    // ── SEC-TERR-04: Merchant read/write /territorial_pricing_policies -> DENY ──
    try {
      await testing.assertFails(merchantDb.collection('territorial_pricing_policies').doc(POLICY_ID).get());
      await testing.assertFails(merchantDb.collection('territorial_pricing_policies').doc(POLICY_ID).update({ fixedDeliveryFee: 100 }));
      assert(true, 'SEC-TERR-04: Merchant read/write /territorial_pricing_policies -> DENY');
    } catch (e) {
      assert(false, `SEC-TERR-04 failed: ${e.message}`);
    }

    // ── SEC-TERR-05: Platform Admin read /territorial_pricing_policies -> ALLOW ──
    try {
      await testing.assertSucceeds(adminDb.collection('territorial_pricing_policies').doc(POLICY_ID).get());
      assert(true, 'SEC-TERR-05: Platform Admin read /territorial_pricing_policies -> ALLOW');
    } catch (e) {
      assert(false, `SEC-TERR-05 failed: ${e.message}`);
    }

    // ── SEC-TERR-06: Platform Admin create/update /territorial_pricing_policies -> ALLOW ──
    try {
      await testing.assertSucceeds(adminDb.collection('territorial_pricing_policies').doc('NI_LEON_LEON').set({
        countryCode: 'NI',
        departmentId: 'LEON',
        municipalityId: 'LEON',
        pricingMode: 'DISTANCE',
        isActive: true
      }));
      assert(true, 'SEC-TERR-06: Platform Admin create/update /territorial_pricing_policies -> ALLOW');
    } catch (e) {
      assert(false, `SEC-TERR-06 failed: ${e.message}`);
    }

    // ── SEC-TERR-07: Platform Admin delete without SuperAdmin -> DENY ──
    try {
      await testing.assertFails(adminDb.collection('territorial_pricing_policies').doc('NI_LEON_LEON').delete());
      assert(true, 'SEC-TERR-07: Platform Admin delete without SuperAdmin -> DENY');
    } catch (e) {
      assert(false, `SEC-TERR-07 failed: ${e.message}`);
    }

    // ── SEC-TERR-08: SuperAdmin delete /territorial_pricing_policies -> ALLOW ──
    try {
      await testing.assertSucceeds(superAdminDb.collection('territorial_pricing_policies').doc('NI_LEON_LEON').delete());
      assert(true, 'SEC-TERR-08: SuperAdmin delete /territorial_pricing_policies -> ALLOW');
    } catch (e) {
      assert(false, `SEC-TERR-08 failed: ${e.message}`);
    }

    // ── SEC-QUOTE-01: Customer read on /pricing_quotes -> DENY (Zero Customer Read) ──
    try {
      await testing.assertFails(customerDb.collection('pricing_quotes').doc(QUOTE_ID).get());
      assert(true, 'SEC-QUOTE-01: Customer read on /pricing_quotes -> DENY (Zero Customer Read)');
    } catch (e) {
      assert(false, `SEC-QUOTE-01 failed: ${e.message}`);
    }

    // ── SEC-QUOTE-01b: Courier read on /pricing_quotes -> DENY ──
    try {
      await testing.assertFails(courierDb.collection('pricing_quotes').doc(QUOTE_ID).get());
      assert(true, 'SEC-QUOTE-01b: Courier read on /pricing_quotes -> DENY');
    } catch (e) {
      assert(false, `SEC-QUOTE-01b failed: ${e.message}`);
    }

    // ── SEC-QUOTE-01c: Merchant read on /pricing_quotes -> DENY ──
    try {
      await testing.assertFails(merchantDb.collection('pricing_quotes').doc(QUOTE_ID).get());
      assert(true, 'SEC-QUOTE-01c: Merchant read on /pricing_quotes -> DENY');
    } catch (e) {
      assert(false, `SEC-QUOTE-01c failed: ${e.message}`);
    }

    // ── SEC-QUOTE-02: Platform Admin read on /pricing_quotes -> ALLOW (Audit/Support) ──
    try {
      await testing.assertSucceeds(adminDb.collection('pricing_quotes').doc(QUOTE_ID).get());
      assert(true, 'SEC-QUOTE-02: Platform Admin read on /pricing_quotes -> ALLOW (EIAM Audit/Support)');
    } catch (e) {
      assert(false, `SEC-QUOTE-02 failed: ${e.message}`);
    }

    // ── SEC-QUOTE-03: Client write to /pricing_quotes -> DENY (Admin SDK only) ──
    try {
      await testing.assertFails(customerDb.collection('pricing_quotes').doc('fake_quote_001').set({ deliveryFee: 1.0 }));
      await testing.assertFails(attackerDb.collection('pricing_quotes').doc(QUOTE_ID).update({ deliveryFee: 1.0 }));
      await testing.assertFails(adminDb.collection('pricing_quotes').doc('admin_quote_001').set({ deliveryFee: 1.0 }));
      assert(true, 'SEC-QUOTE-03: Client write to /pricing_quotes -> DENY (Admin SDK only)');
    } catch (e) {
      assert(false, `SEC-QUOTE-03 failed: ${e.message}`);
    }

  } finally {
    await testEnv.cleanup();
  }

  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTerritorialRulesEmulatorTests().catch((err) => {
  console.error('Fatal error running rules emulator tests:', err);
  process.exit(1);
});
