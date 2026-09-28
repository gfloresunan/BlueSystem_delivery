const { execSync } = require('child_process');

async function inspectLiveCourier() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('STEP 1: INSPECTING LIVE COURIER IDENTITY & FIRESTORE DOCUMENTS');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const token = execSync('gcloud auth print-access-token').toString().trim();
  const projectId = 'bluesystem-7c9af';

  // 1. Query Firestore for couriers in /users where role/userType is courier/motorizado
  console.log('[1] Fetching courier documents from Firestore...');
  const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`;
  const usersRes = await fetch(usersUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const usersData = await usersRes.json();

  const couriers = [];
  if (usersData.documents) {
    for (const doc of usersData.documents) {
      const fields = doc.fields || {};
      const role = fields.role?.stringValue || fields.userType?.stringValue || fields.eiamRole?.stringValue || '';
      const email = fields.email?.stringValue || '';
      const uid = doc.name.split('/').pop();
      if (role.toLowerCase().includes('courier') || role.toLowerCase().includes('motorizado') || role.toLowerCase().includes('driver') || email.includes('delivery') || email.includes('courier')) {
        couriers.push({
          uid,
          email,
          role,
          tenantId: fields.tenantId?.stringValue || fields.commercialTenantId?.stringValue || '',
          muni: fields.operationalMunicipalityId?.stringValue || fields.municipalityId?.stringValue || ''
        });
      }
    }
  }

  console.log(`Found ${couriers.length} courier users in /users:`, JSON.stringify(couriers, null, 2));

  // 2. Fetch recent orders in /orders with status READY / ready
  console.log('\n[2] Fetching READY orders in /orders...');
  const ordersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders`;
  const ordersRes = await fetch(ordersUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const ordersData = await ordersRes.json();

  const readyOrders = [];
  if (ordersData.documents) {
    for (const doc of ordersData.documents) {
      const fields = doc.fields || {};
      const status = fields.status?.stringValue || fields.estado?.stringValue || '';
      const orderId = doc.name.split('/').pop();
      const assignedCourierId = fields.assignedCourierId ? (fields.assignedCourierId.stringValue || (fields.assignedCourierId.nullValue !== undefined ? 'null' : 'other')) : 'UNDEFINED';
      const motorizadoId = fields.motorizadoId ? (fields.motorizadoId.stringValue || (fields.motorizadoId.nullValue !== undefined ? 'null' : 'other')) : 'UNDEFINED';
      
      readyOrders.push({
        orderId,
        status,
        assignedCourierId,
        motorizadoId,
        businessId: fields.businessId?.stringValue || '',
        commercialMunicipalityId: fields.commercialMunicipalityId?.stringValue || '',
        tenantId: fields.tenantId?.stringValue || ''
      });
    }
  }

  console.log(`Total orders checked: ${ordersData.documents?.length || 0}`);
  console.log('Sample orders:', JSON.stringify(readyOrders.slice(0, 10), null, 2));
}

inspectLiveCourier().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
