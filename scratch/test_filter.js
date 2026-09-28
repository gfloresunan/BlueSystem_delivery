const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

function isTestOrNonCommerce(orderId, data) {
  if (!orderId || !data) return true;
  if (data.serviceType === 'X_TO_Y_DELIVERY') return true;
  if (data.isTest === true) return true;

  const idLower = orderId.toLowerCase();
  if (
    idLower.startsWith('env_') ||
    idLower.startsWith('ped_e2e_') ||
    idLower.startsWith('ped_ux_') ||
    idLower.startsWith('ped_val_') ||
    idLower.startsWith('ord_e2e_') ||
    idLower.startsWith('test_')
  ) {
    return true;
  }

  const cust = (data.customerName || data.userName || '').toString().toLowerCase();
  if (
    cust.includes('ited virtual') ||
    cust.includes('test') ||
    cust.includes('prueba')
  ) {
    return true;
  }

  const bName = (data.businessName || data.restaurantName || '').toString().toLowerCase();
  if (bName.includes('punto de recogida x') || bName.includes('prueba')) {
    return true;
  }

  const bId = (data.businessId || data.restaurantId || '').toString().trim();
  if (!bId || bId === 'unknown' || bId === 'sin_id') {
    return true;
  }

  return false;
}

async function verify() {
  const snap = await db.collection('orders').get();
  console.log(`Total orders in DB: ${snap.size}`);

  const passed = [];
  const rejected = [];

  snap.forEach(doc => {
    const d = doc.data();
    if (isTestOrNonCommerce(doc.id, d)) {
      rejected.push({ id: doc.id, cust: d.customerName || d.userName, bName: d.businessName, total: d.total });
    } else {
      let rawItems = d.items || d.products || [];
      let itemsArr = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'object' ? Object.values(rawItems) : []);
      passed.push({
        id: doc.id,
        cust: d.customerName || d.userName,
        bName: d.businessName,
        total: d.total,
        dishes: itemsArr.map(i => `${i.name || i.productName || i.nombre} (x${i.quantity || i.cantidad || 1})`)
      });
    }
  });

  console.log(`\n=== PASSED AS 100% REAL COMMERCE SALES (${passed.length}) ===`);
  passed.forEach(p => {
    console.log(`[${p.id}] ${p.bName} | Cliente: ${p.cust} | Total: ${p.total}`);
    console.log(`    Platos: ${p.dishes.join(', ')}`);
  });

  console.log(`\n=== REJECTED AS TEST / MOCK / COURIER (${rejected.length}) ===`);
  rejected.forEach(r => {
    console.log(`[${r.id}] ${r.bName} | Cliente: ${r.cust} | Total: ${r.total}`);
  });
}

verify().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
