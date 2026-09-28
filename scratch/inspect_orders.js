const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function inspect() {
  console.log('--- SEARCHING FOR ALL ORDERS ---');
  const snap = await db.collection('orders').get();
  console.log(`Total orders found: ${snap.size}`);
  snap.forEach(doc => {
    console.log(`\n================ ID: [${doc.id}] ================`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

inspect().then(() => {
  console.log('\nSUCCESS');
  process.exit(0);
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
