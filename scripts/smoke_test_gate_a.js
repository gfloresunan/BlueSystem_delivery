const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af',
  });
}

const db = admin.firestore();

// Import the routing service directly from compiled functions or via ts-node / built js
// Let's check if functions/lib exists or import compiled JS
let routingService;
try {
  routingService = require(path.join(__dirname, '../functions/lib/services/routingService'));
} catch (e) {
  // If lib not built, we can require through ts-node or verify built files
  console.log('Compiling / loading routingService...');
}

async function runSmokeTests() {
  console.log('========================================================================');
  console.log('🚀 GATE A POST-DEPLOYMENT SMOKE TESTS & INERTNESS VERIFICATION');
  console.log('========================================================================\n');

  // STEP 1: Verify /system_config/global
  console.log('--- 1. VERIFICACIÓN DE FEATURE FLAG (/system_config/global) ---');
  const cfgDoc = await db.collection('system_config').doc('global').get();
  const cfgData = cfgDoc.data() || {};
  const commercePricing = cfgData.commerceDeliveryPricing || {};
  const isTerritorialEnabled = commercePricing.territorialPricingEnabled === true;
  console.log(`territorialPricingEnabled: ${isTerritorialEnabled}`);
  if (isTerritorialEnabled) {
    throw new Error('FALLO CRÍTICO: territorialPricingEnabled está activo en /system_config/global!');
  }
  console.log(`✅ Feature flag territorialPricingEnabled = false (CONFIRMADO)\n`);

  // STEP 2: Verify /territorial_pricing_policies is EMPTY
  console.log('--- 2. VERIFICACIÓN DE COLECCIÓN /territorial_pricing_policies ---');
  const policiesSnap = await db.collection('territorial_pricing_policies').get();
  console.log(`Cantidad de documentos en /territorial_pricing_policies: ${policiesSnap.size}`);
  if (!policiesSnap.empty) {
    throw new Error(`FALLO CRÍTICO: /territorial_pricing_policies NO está vacía (${policiesSnap.size} docs encontrados)!`);
  }
  console.log(`✅ Colección /territorial_pricing_policies está 100% VACÍA (0 docs)\n`);

  // STEP 3: Verify /pricing_quotes is EMPTY
  console.log('--- 3. VERIFICACIÓN DE COLECCIÓN /pricing_quotes ---');
  const quotesSnapBefore = await db.collection('pricing_quotes').get();
  console.log(`Cantidad inicial de documentos en /pricing_quotes: ${quotesSnapBefore.size}`);
  if (!quotesSnapBefore.empty) {
    throw new Error(`FALLO CRÍTICO: /pricing_quotes contiene documentos previos (${quotesSnapBefore.size} docs)!`);
  }
  console.log(`✅ Colección /pricing_quotes está 100% VACÍA (0 docs)\n`);

  // STEP 4: Test 3 Municipalities (Managua, León, Estelí)
  console.log('--- 4. EJECUCIÓN DE SMOKE TESTS POR MUNICIPIO ---');
  const testCities = [
    {
      name: 'Managua',
      departmentId: 'MANAGUA',
      municipalityId: 'MANAGUA',
      origin: { latitude: 12.1264, longitude: -86.2657 }, // Metrocentro
      destination: { latitude: 12.1035, longitude: -86.2512 }, // Galerías Santo Domingo
    },
    {
      name: 'León',
      departmentId: 'LEON',
      municipalityId: 'LEON',
      origin: { latitude: 12.4355, longitude: -86.8794 }, // Catedral de León
      destination: { latitude: 12.4412, longitude: -86.8732 }, // Parque San Juan
    },
    {
      name: 'Estelí',
      departmentId: 'ESTELI',
      municipalityId: 'ESTELI',
      origin: { latitude: 13.0917, longitude: -86.3575 }, // Parque Central Estelí
      destination: { latitude: 13.0782, longitude: -86.3521 }, // Salida Sur
    },
  ];

  if (!routingService) {
    // If functions/lib is not present, we build or test using ts-node or verify lib
    throw new Error('routingService lib could not be loaded directly');
  }

  for (const city of testCities) {
    console.log(`\nProbando ruta en [${city.name}] (${city.departmentId} / ${city.municipalityId}):`);
    const options = {
      origin: city.origin,
      destination: city.destination,
      transportProfile: 'TWO_WHEELER',
      tenantId: 'default',
      departmentId: city.departmentId,
      municipalityId: city.municipalityId,
    };

    const result = await routingService.calculateCommerceDeliveryRoute(options);
    const snap = result.pricingSnapshot;

    console.log(`   - Distance: ${result.routeDistanceMeters}m (${snap.distanceKm} km)`);
    console.log(`   - Duration: ${result.routeDurationSeconds}s`);
    console.log(`   - Provider: ${result.routingProvider}`);
    console.log(`   - Pricing Mode: ${snap.pricingMode}`);
    console.log(`   - Delivery Fee (Cliente): C$ ${result.calculatedFee}`);
    console.log(`   - Courier Earnings (Motorizado): C$ ${snap.courierEarnings}`);
    console.log(`   - Fixed Delivery Fee: ${snap.fixedDeliveryFee}`);
    console.log(`   - Pricing Policy ID: ${snap.pricingPolicyId}`);

    // VALIDACIONES ESTRICTAS:
    if (snap.pricingMode !== 'DISTANCE') {
      throw new Error(`[${city.name}] FALLO: pricingMode esperado DISTANCE, pero se obtuvo ${snap.pricingMode}`);
    }
    if (snap.pricingPolicyId !== null) {
      throw new Error(`[${city.name}] FALLO: pricingPolicyId esperado null, pero se obtuvo ${snap.pricingPolicyId}`);
    }
    if (snap.fixedDeliveryFee !== null) {
      throw new Error(`[${city.name}] FALLO: fixedDeliveryFee esperado null, pero se obtuvo ${snap.fixedDeliveryFee}`);
    }
    if (typeof result.calculatedFee !== 'number' || result.calculatedFee <= 0) {
      throw new Error(`[${city.name}] FALLO: deliveryFee inválido o no positivo (${result.calculatedFee})`);
    }
    if (typeof snap.courierEarnings !== 'number' || snap.courierEarnings <= 0) {
      throw new Error(`[${city.name}] FALLO: courierEarnings inválido o no positivo (${snap.courierEarnings})`);
    }
    if (!result.routeDistanceMeters || result.routeDistanceMeters <= 0) {
      throw new Error(`[${city.name}] FALLO: routeDistanceMeters inválido`);
    }

    console.log(`   ✅ [${city.name}] Smoke test OK: DISTANCE baseline intacto.`);
  }

  // STEP 5: Verify post-execution writes to /pricing_quotes
  console.log('\n--- 5. VERIFICACIÓN POST-EJECUCIÓN DE /pricing_quotes (ZERO WRITES) ---');
  const quotesSnapAfter = await db.collection('pricing_quotes').get();
  console.log(`Cantidad final de documentos en /pricing_quotes: ${quotesSnapAfter.size}`);
  if (quotesSnapAfter.size !== quotesSnapBefore.size) {
    throw new Error(`FALLO CRÍTICO: Se crearon ${quotesSnapAfter.size - quotesSnapBefore.size} pricing_quotes en Gate A inerte!`);
  }
  console.log(`✅ Cero writes a /pricing_quotes (0 documentos creados).\n`);

  // STEP 6: Verify post-execution /territorial_pricing_policies
  console.log('--- 6. VERIFICACIÓN POST-EJECUCIÓN DE /territorial_pricing_policies (ZERO POLICIES) ---');
  const policiesSnapAfter = await db.collection('territorial_pricing_policies').get();
  console.log(`Cantidad final de documentos en /territorial_pricing_policies: ${policiesSnapAfter.size}`);
  if (policiesSnapAfter.size !== 0) {
    throw new Error(`FALLO CRÍTICO: /territorial_pricing_policies ya no está vacía!`);
  }
  console.log(`✅ /territorial_pricing_policies sigue 100% VACÍA (0 políticas creadas).\n`);

  console.log('========================================================================');
  console.log('🎉 VEREDICTO FINAL GATE A: 100% CERTIFICADO, INERTE Y OPERACIONALMENTE CONFORME');
  console.log('========================================================================');
}

runSmokeTests().catch(err => {
  console.error('\n❌ ERROR EN SMOKE TESTS:', err);
  process.exit(1);
});
