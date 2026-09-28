const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function inspect() {
  console.log('--- ALL ORDERS IN /orders ---');
  const snap = await db.collection('orders').get();
  console.log(`Total orders found: ${snap.size}`);

  const counts = {};
  snap.forEach(doc => {
    const d = doc.data();
    const bName = d.businessName || d.restaurantName || d.comercioNombre || 'Sin nombre';
    const bId = d.businessId || d.restaurantId || 'sin_id';
    const key = `${bName} [${bId}]`;
    counts[key] = (counts[key] || 0) + 1;

    console.log(`\nDoc ID: ${doc.id}`);
    console.log(`  Business: ${key}`);
    console.log(`  Created: ${d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : JSON.stringify(d.createdAt)}`);
    console.log(`  Platform: ${d.platform} | Source: ${d.source} | Status: ${d.status}`);
    console.log(`  Total: ${d.total} | Subtotal: ${d.subtotal} | DeliveryFee: ${d.deliveryFee}`);
    console.log(`  serviceType: ${d.serviceType}`);
    const items = d.items || d.products || [];
    console.log(`  Items (${items.length}):`, items.map(i => `${i.name || i.nombre || i.title} x${i.quantity || i.cantidad || 1} ($${i.price || i.precio})`).join(' | '));
  });

  console.log('\n--- SUMMARY COUNTS ---');
  console.log(JSON.stringify(counts, null, 2));
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
