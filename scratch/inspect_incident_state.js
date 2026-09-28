const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectCurrentState() {
    console.log("=== INSPECTING CURRENT FIRESTORE DATABASE STATE ===");
    
    const [appsSnap, bizSnap, memSnap, branchSnap] = await Promise.all([
        db.collection('merchant_applications').get(),
        db.collection('businesses').get(),
        db.collection('membership').get(),
        db.collection('branches').get(),
    ]);

    console.log(`Total merchant_applications: ${appsSnap.size}`);
    appsSnap.forEach(doc => {
        const d = doc.data();
        console.log(` - App ID: ${doc.id} | Business: "${d.businessName}" | Status: ${d.status} | provisionedBizId: ${d.provisionedBusinessId || 'NONE'} | error: ${d.provisioningError || 'NONE'}`);
    });

    console.log(`\nTotal businesses: ${bizSnap.size}`);
    const bizByName = {};
    bizSnap.forEach(doc => {
        const d = doc.data();
        const name = d.name || d.comercioNombre || doc.id;
        bizByName[name] = (bizByName[name] || 0) + 1;
    });
    console.log("Businesses breakdown by name:");
    Object.entries(bizByName).forEach(([name, count]) => {
        console.log(` - "${name}": ${count} document(s)`);
    });

    console.log(`\nTotal /membership: ${memSnap.size}`);
    const memByBiz = {};
    memSnap.forEach(doc => {
        const d = doc.data();
        const bId = d.businessId || 'UNKNOWN';
        memByBiz[bId] = (memByBiz[bId] || 0) + 1;
    });
    console.log(`Unique businessIds in /membership: ${Object.keys(memByBiz).length}`);

    console.log(`\nTotal branches: ${branchSnap.size}`);
}

inspectCurrentState()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Error inspecting:", err);
        process.exit(1);
    });
