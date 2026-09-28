const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function inspect() {
  const snap = await db.collection('orders').get();
  console.log(`Total orders found: ${snap.size}`);

  snap.forEach(doc => {
    const d = doc.data();
    let rawItems = d.items || d.products;
    let itemsArr = [];
    if (Array.isArray(rawItems)) {
      itemsArr = rawItems;
    } else if (rawItems && typeof rawItems === 'object') {
      itemsArr = Object.values(rawItems);
    }

    const itemNames = itemsArr.map(i => `${i.name || i.nombre || i.title || 'Item'} (x${i.quantity || i.cantidad || 1})`).join(', ');

    console.log(`[${doc.id}]`);
    console.log(`  businessId: ${d.businessId || d.restaurantId} | businessName: ${d.businessName || d.restaurantName}`);
    console.log(`  created: ${d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt}`);
    console.log(`  total: ${d.total || d.totalAmount} | subtotal: ${d.subtotal} | fee: ${d.deliveryFee}`);
    console.log(`  serviceType: ${d.serviceType} | status: ${d.status}`);
    console.log(`  items: ${itemNames || 'NONE'}`);
    console.log(`  orderNumber: ${d.orderNumber} | customerName: ${d.customerName || d.userName}`);
    console.log('---');
  });
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
