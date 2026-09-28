const fs = require('fs');
const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runFullMatrixAudit() {
    const report = {
        timestamp: new Date().toISOString(),
        organizations: [],
        businesses: [],
        branches: [],
        merchant_applications: [],
        users_with_business_role: [],
        users_all_summary: { total: 0, roles: {} }
    };

    // 1. Organizations
    const orgSnap = await db.collection('organizations').get();
    orgSnap.forEach(doc => {
        report.organizations.push({ id: doc.id, ...doc.data() });
    });

    // 2. Businesses
    const bizSnap = await db.collection('businesses').get();
    bizSnap.forEach(doc => {
        report.businesses.push({ id: doc.id, ...doc.data() });
    });

    // 3. Branches
    const brSnap = await db.collection('branches').get();
    brSnap.forEach(doc => {
        report.branches.push({ id: doc.id, ...doc.data() });
    });

    // 4. Merchant Applications
    const appSnap = await db.collection('merchant_applications').get();
    appSnap.forEach(doc => {
        report.merchant_applications.push({ id: doc.id, ...doc.data() });
    });

    // 5. Users
    const uSnap = await db.collection('users').get();
    report.users_all_summary.total = uSnap.size;
    uSnap.forEach(doc => {
        const data = doc.data();
        const r = (data.role || data.rol || data.userType || '').toLowerCase();
        report.users_all_summary.roles[r] = (report.users_all_summary.roles[r] || 0) + 1;

        if (['business', 'comercio', 'restaurant', 'owner', 'merchant_owner'].includes(r) || data.comercioNombre || data.businessId) {
            report.users_with_business_role.push({ id: doc.id, ...data });
        }
    });

    const outputPath = path.join(__dirname, 'governance_audit_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`FULL AUDIT DUMP SAVED TO ${outputPath}`);
    console.log(`Summary:
    Organizations: ${report.organizations.length}
    Businesses: ${report.businesses.length}
    Branches: ${report.branches.length}
    Merchant Applications: ${report.merchant_applications.length}
    Users with Business role/fields: ${report.users_with_business_role.length}
    Total Users: ${report.users_all_summary.total}
    `);
}

runFullMatrixAudit().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Audit error:', err);
    process.exit(1);
});
