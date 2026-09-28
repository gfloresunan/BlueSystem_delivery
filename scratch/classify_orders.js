const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function classifyAllOrders() {
  const snap = await db.collection('orders').get();
  console.log(`Total orders in /orders: ${snap.size}\n`);

  const realOrders = [];
  const testOrders = [];
  const xtoYTrips = [];

  snap.forEach(doc => {
    const id = doc.id;
    const d = doc.data();
    const cName = (d.customerName || d.userName || '').toLowerCase();
    const isTestId = id.startsWith('ped_e2e_') ||
                     id.startsWith('ped_ux_') ||
                     id.startsWith('ped_val_') ||
                     id.startsWith('ord_e2e_') ||
                     id.startsWith('test_');
    const isTestCustomer = cName.includes('ited virtual') || cName.includes('test') || cName.includes('prueba');
    const isXtoY = d.serviceType === 'X_TO_Y_DELIVERY' || id.startsWith('env_') || d.businessName === 'Punto de Recogida X';

    let rawItems = d.items || d.products || [];
    let itemsArr = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'object' ? Object.values(rawItems) : []);
    const orderInfo = {
      id,
      businessName: d.businessName || d.restaurantName || 'Sin nombre',
      businessId: d.businessId,
      customer: d.customerName || d.userName,
      created: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      total: d.total || d.totalAmount,
      items: itemsArr.map(i => i.name || i.productName || i.nombre)
    };

    if (isXtoY) {
      xtoYTrips.push(orderInfo);
    } else if (isTestId || isTestCustomer) {
      testOrders.push(orderInfo);
    } else {
      realOrders.push(orderInfo);
    }
  });

  console.log(`=== PEDIDOS REALES DE CLIENTES (${realOrders.length}) ===`);
  realOrders.forEach(o => {
    console.log(`[${o.id}] ${o.businessName} | Cliente: ${o.customer} | C$ ${o.total} | Platos: ${o.items.join(', ')}`);
  });

  console.log(`\n=== PEDIDOS DE PRUEBAS / TESTS INYECTADOS (${testOrders.length}) ===`);
  testOrders.forEach(o => {
    console.log(`[${o.id}] ${o.businessName} | Cliente: ${o.customer} | C$ ${o.total} | Platos: ${o.items.join(', ')}`);
  });

  console.log(`\n=== ENVÍOS DE MENSAJERÍA X->Y COURIER (${xtoYTrips.length}) ===`);
  xtoYTrips.forEach(o => {
    console.log(`[${o.id}] ${o.businessName} | Cliente: ${o.customer} | C$ ${o.total}`);
  });
}

classifyAllOrders().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
