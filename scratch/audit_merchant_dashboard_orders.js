const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function run() {
  console.log('=== AUDITORIA FORENSE DE PEDIDOS Y MERCHANT DASHBOARD ===');
  
  // 1. List all businesses
  const bizSnap = await db.collection('businesses').get();
  console.log(`Total businesses: ${bizSnap.size}`);
  bizSnap.forEach(b => {
    const d = b.data();
    console.log(`- Business ID: [${b.id}], name: "${d.name || d.nombre}", tenantId: ${d.tenantId}, status: ${d.status}`);
  });

  // 2. Fetch all orders and inspect their details
  const ordersSnap = await db.collection('orders').get();
  console.log(`\nTotal orders in /orders: ${ordersSnap.size}`);

  const now = new Date();
  console.log(`Current Server Time (UTC): ${now.toISOString()}`);
  console.log(`Current Local Time (assuming UTC-6 Managua): ${new Date(now.getTime() - 6 * 3600000).toISOString()}`);

  ordersSnap.docs.forEach(docSnap => {
    const ord = docSnap.data();
    const id = docSnap.id;
    const createdAtRaw = ord.createdAt;
    let createdAtDate = null;
    if (createdAtRaw) {
      createdAtDate = createdAtRaw.toDate ? createdAtRaw.toDate() : new Date(createdAtRaw);
    }
    const deliveredAtRaw = ord.deliveredAt || ord.completedAt || ord.entregadoAt || ord.updatedAt;
    let deliveredAtDate = null;
    if (deliveredAtRaw) {
      deliveredAtDate = deliveredAtRaw.toDate ? deliveredAtRaw.toDate() : new Date(deliveredAtRaw);
    }

    console.log(`\n------------------------------------------------------------`);
    console.log(`Order ID: ${id}`);
    console.log(`  businessId: ${ord.businessId} | comercioId: ${ord.comercioId} | restaurantId: ${ord.restaurantId}`);
    console.log(`  status: ${ord.status} | estado: ${ord.estado}`);
    console.log(`  createdAt: ${createdAtDate ? createdAtDate.toISOString() : 'NULL'} (raw: ${JSON.stringify(createdAtRaw)})`);
    console.log(`  deliveredAt: ${deliveredAtDate ? deliveredAtDate.toISOString() : 'NULL'}`);
    console.log(`  completedAt: ${ord.completedAt?.toDate ? ord.completedAt.toDate().toISOString() : ord.completedAt}`);
    console.log(`  total: ${ord.total} | totalAmount: ${ord.totalAmount} | subtotal: ${ord.subtotal}`);
    console.log(`  merchantGrossSales: ${ord.merchantGrossSales}`);
    console.log(`  customerName: ${ord.customerName || ord.clienteNombre} | customerId: ${ord.customerId || ord.clienteId}`);
    console.log(`  items: ${JSON.stringify(ord.items || ord.itemsSummary || ord.products)}`);
  });
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
