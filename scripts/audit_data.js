const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runAudit() {
    console.log('================================================================');
    console.log('           BLUESYSTEM GOVERNANCE DATA MODEL AUDIT               ');
    console.log('================================================================\n');

    const collections = ['organizations', 'businesses', 'branches', 'merchant_applications', 'users', 'memberships'];

    for (const colName of collections) {
        console.log(`\n--- COLLECTION: /${colName} ---`);
        try {
            const snap = await db.collection(colName).get();
            console.log(`Total documents found: ${snap.size}`);
            snap.forEach(doc => {
                const data = doc.data();
                console.log(`\nDoc ID: [${doc.id}]`);
                console.log(JSON.stringify(data, null, 2));
            });
        } catch (err) {
            console.error(`Error querying ${colName}:`, err.message);
        }
    }
}

runAudit().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
