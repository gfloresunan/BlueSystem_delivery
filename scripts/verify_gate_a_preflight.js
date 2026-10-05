const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af',
  });
}

const db = admin.firestore();

async function main() {
  console.log('========================================================================');
  console.log('🔍 PREFLIGHT DE VERIFICACIÓN OPERACIONAL PARA GATE A (READ-ONLY)');
  console.log('========================================================================\n');

  // 1. Verificar /system_config/global
  const cfgDoc = await db.collection('system_config').doc('global').get();
  const cfgData = cfgDoc.data() || {};
  const commercePricing = cfgData.commerceDeliveryPricing || {};
  const territorialPricingEnabled = commercePricing.territorialPricingEnabled === true;

  console.log(`1. /system_config/global:`);
  console.log(`   - exists: ${cfgDoc.exists}`);
  console.log(`   - territorialPricingEnabled: ${territorialPricingEnabled} (Must be FALSE)`);
  console.log(`   - customerPricePerKm: C$ ${commercePricing.customerPricePerKm ?? cfgData.customerDeliveryRatePerKm ?? 'default'}`);
  console.log(`   - courierPricePerKm: C$ ${commercePricing.courierPricePerKm ?? cfgData.courierRatePerKm ?? 'default'}`);

  // 2. Verificar /territorial_pricing_policies
  const policiesSnap = await db.collection('territorial_pricing_policies').get();
  console.log(`\n2. /territorial_pricing_policies:`);
  console.log(`   - Document count: ${policiesSnap.size} (Must be 0 / EMPTY)`);
  if (!policiesSnap.empty) {
    policiesSnap.forEach(d => console.log(`     * ID: ${d.id}`));
  }

  // 3. Verificar /pricing_quotes
  const quotesSnap = await db.collection('pricing_quotes').get();
  console.log(`\n3. /pricing_quotes:`);
  console.log(`   - Document count: ${quotesSnap.size} (Must be 0 / EMPTY)`);

  console.log('\n========================================================================');
  const isGateAReady = !territorialPricingEnabled && policiesSnap.size === 0 && quotesSnap.size === 0;
  console.log(`VEREDICTO PRE-DEPLOY GATE A: ${isGateAReady ? '🟢 100% INERTE Y LISTO PARA DEPLOY' : '🔴 NO INERTE (ATENCIÓN)'}`);
  console.log('========================================================================');

  process.exit(isGateAReady ? 0 : 1);
}

main().catch(err => {
  console.error('Error en preflight:', err);
  process.exit(1);
});
