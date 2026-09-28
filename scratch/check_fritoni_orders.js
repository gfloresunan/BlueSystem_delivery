const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

async function main() {
  const snap = await db.collection('orders').get();
  console.log('Total orders count:', snap.size);

  const businessCounts = {};
  const ordersList = [];

  snap.forEach(doc => {
    const d = doc.data();
    const bId = d.businessId || d.restaurantId || 'sin_id';
    const bName = d.businessName || d.restaurantName || d.comercioNombre || 'Sin nombre';
    businessCounts[bName + ' (' + bId + ')'] = (businessCounts[bName + ' (' + bId + ')'] || 0) + 1;

    ordersList.push({
      id: doc.id,
      businessId: bId,
      businessName: bName,
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      platform: d.platform,
      source: d.source,
      status: d.status || d.estado,
      total: d.total || d.totalAmount,
      items: (d.items || d.products || []).map(i => ({
        name: i.name || i.nombre || i.title,
        quantity: i.quantity || i.cantidad || 1,
        price: i.price || i.precio
      }))
    });
  });

  console.log('\n--- CONTEO POR COMERCIO ---');
  console.log(JSON.stringify(businessCounts, null, 2));

  console.log('\n--- DETALLE DE PEDIDOS DE FRITONI O CON PRODUCTO FRITANGA ---');
  const fritoniOrders = ordersList.filter(o => {
    const isFritoni = (o.businessName && o.businessName.toLowerCase().includes('fritoni')) ||
                      (o.businessId && o.businessId.toLowerCase().includes('fritoni'));
    const hasFritanga = o.items.some(i => i.name && i.name.toLowerCase().includes('fritanga'));
    return isFritoni || hasFritanga;
  });

  console.log(JSON.stringify(fritoniOrders, null, 2));

  console.log('\n--- TODOS LOS PEDIDOS DETALLADOS ---');
  ordersList.forEach((o, idx) => {
    console.log(`\n[${idx + 1}] ID: ${o.id} | Comercio: ${o.businessName} (${o.businessId}) | Total: ${o.total} | Platform: ${o.platform} | Status: ${o.status}`);
    console.log(`    Items:`, o.items.map(i => `${i.name} x${i.quantity} ($${i.price})`).join(', '));
  });
}

main().catch(err => console.error(err));
