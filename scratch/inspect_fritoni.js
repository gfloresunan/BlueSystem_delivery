const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function inspectFritoni() {
  console.log('=== INSPECTING FRITONI (dlRY2ZVUqPR2Fxoc3cazcOxxRJg2) ORDERS ===');
  const snap = await db.collection('orders')
    .where('businessId', '==', 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2')
    .get();

  console.log(`Found ${snap.size} orders for Fritoni:`);
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`\nDoc ID: ${doc.id}`);
    console.log(`  Customer: ${d.customerName || d.userName}`);
    console.log(`  Created: ${d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt}`);
    console.log(`  Total: ${d.total} | Subtotal: ${d.subtotal}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  Items:`, JSON.stringify(d.items || d.products));
    console.log(`  Is Test ID?:`, doc.id.startsWith('ped_e2e_') || doc.id.startsWith('ped_ux_') || doc.id.startsWith('test_'));
  });
}

inspectFritoni().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
