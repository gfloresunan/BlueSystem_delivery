const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

async function checkSLA() {
  const snap = await db.collection('orders').get();
  console.log(`Auditing SLA fields across ${snap.size} orders:`);
  
  let withSla = 0;
  let withTimestamps = 0;

  snap.forEach(d => {
    const data = d.data();
    if (data.slaMinutes !== undefined) {
      withSla++;
      console.log(`Order ${d.id}: slaMinutes = ${data.slaMinutes}`);
    }
    if (data.createdAt && (data.readyAt || data.deliveredAt || data.completedAt)) {
      withTimestamps++;
    }
  });

  console.log(`Orders with explicit slaMinutes: ${withSla}`);
  console.log(`Orders with completion timestamps: ${withTimestamps}`);
}

checkSLA().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
