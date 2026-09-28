const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function runAudit() {
    console.log('=== STARTING FORENSIC INSPECTION OF EIAM & MERCHANT USERS ===\n');

    // 1. Get all businesses
    const bizSnap = await db.collection('businesses').get();
    console.log(`[Firestore] Total /businesses found: ${bizSnap.size}`);
    const businesses = [];
    bizSnap.forEach(doc => {
        const d = doc.data();
        businesses.push({
            id: doc.id,
            name: d.name,
            ownerUid: d.ownerUid,
            orgId: d.orgId,
            lifecycleStatus: d.lifecycleStatus,
            wizardCompleted: d.wizardCompleted,
            branchIds: d.branchIds,
            isActive: d.isActive
        });
    });
    console.log('Businesses:', JSON.stringify(businesses, null, 2));

    // 2. Get all memberships
    const memSnap = await db.collection('membership').get();
    console.log(`\n[Firestore] Total /membership found: ${memSnap.size}`);
    const memberships = [];
    memSnap.forEach(doc => {
        const d = doc.data();
        memberships.push({
            id: doc.id,
            uid: d.uid,
            businessId: d.businessId,
            orgId: d.orgId,
            branchId: d.branchId,
            role: d.role,
            status: d.status,
            permissions: d.permissions
        });
    });
    console.log('Memberships:', JSON.stringify(memberships, null, 2));

    // 3. Get all organizations
    const orgSnap = await db.collection('organizations').get();
    console.log(`\n[Firestore] Total /organizations found: ${orgSnap.size}`);
    const orgs = [];
    orgSnap.forEach(doc => {
        const d = doc.data();
        orgs.push({
            id: doc.id,
            name: d.name,
            ownerUid: d.ownerUid,
            businessIds: d.businessIds,
            status: d.status
        });
    });
    console.log('Organizations:', JSON.stringify(orgs, null, 2));

    // 4. Get all branches
    const branchSnap = await db.collection('branches').get();
    console.log(`\n[Firestore] Total /branches found: ${branchSnap.size}`);
    const branches = [];
    branchSnap.forEach(doc => {
        const d = doc.data();
        branches.push({
            id: doc.id,
            businessId: d.businessId,
            orgId: d.orgId,
            name: d.name,
            isPrimary: d.isPrimary,
            isActive: d.isActive
        });
    });
    console.log('Branches:', JSON.stringify(branches, null, 2));

    // 5. Get all merchant / business related users from /users
    const usersSnap = await db.collection('users').get();
    console.log(`\n[Firestore] Total /users found: ${usersSnap.size}`);
    
    // Find all users that might be merchants or referenced by businesses / memberships
    const merchantUids = new Set();
    businesses.forEach(b => { if (b.ownerUid) merchantUids.add(b.ownerUid); });
    memberships.forEach(m => { if (m.uid) merchantUids.add(m.uid); });
    orgs.forEach(o => { if (o.ownerUid) merchantUids.add(o.ownerUid); });

    usersSnap.forEach(doc => {
        const d = doc.data();
        const r = (d.eiamRole || d.role || d.rol || d.userType || '').toLowerCase();
        if (['business', 'merchant', 'owner', 'merchant_owner', 'manager', 'cashier', 'cook'].some(x => r.includes(x)) || d.businessId) {
            merchantUids.add(doc.id);
        }
    });

    console.log(`\nIdentified ${merchantUids.size} relevant Merchant/Business UIDs for inspection:`, Array.from(merchantUids));

    // 6. Inspect each UID in Firestore and Firebase Auth (Custom Claims)
    console.log('\n=== DETAILED USER × CLAIMS × FIRESTORE COMPARISON ===');
    for (const uid of merchantUids) {
        console.log(`\n--------------------------------------------------`);
        console.log(`UID: ${uid}`);

        // Firestore /users/{uid}
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const ud = userDoc.data();
            console.log(`  [Firestore /users]: exists = true`);
            console.log(`    email: ${ud.email}`);
            console.log(`    role: ${ud.role} | rol: ${ud.rol} | eiamRole: ${ud.eiamRole} | userType: ${ud.userType}`);
            console.log(`    businessId: ${ud.businessId} | orgId: ${ud.orgId} | branchId: ${ud.branchId}`);
            console.log(`    isActive: ${ud.isActive} | active: ${ud.active}`);
        } else {
            console.log(`  [Firestore /users]: NOT FOUND`);
        }

        // Firestore /employees/{uid}
        const empDoc = await db.collection('employees').doc(uid).get();
        if (empDoc.exists) {
            const ed = empDoc.data();
            console.log(`  [Firestore /employees]: exists = true`);
            console.log(`    role: ${ed.role} | businessId: ${ed.businessId} | status: ${ed.status}`);
        } else {
            console.log(`  [Firestore /employees]: NOT FOUND`);
        }

        // Firestore /membership query by uid
        const memQuery = await db.collection('membership').where('uid', '==', uid).get();
        console.log(`  [Firestore /membership]: ${memQuery.size} records found`);
        memQuery.forEach(doc => {
            const md = doc.data();
            console.log(`    Doc ID: ${doc.id} -> role: ${md.role}, businessId: ${md.businessId}, orgId: ${md.orgId}, branchId: ${md.branchId}, status: ${md.status}, permissions: ${JSON.stringify(md.permissions)}`);
        });

        // Firebase Auth Record & Custom Claims
        try {
            const authUser = await auth.getUser(uid);
            console.log(`  [Firebase Auth]: exists = true`);
            console.log(`    email: ${authUser.email}`);
            console.log(`    disabled: ${authUser.disabled}`);
            console.log(`    customClaims:`, JSON.stringify(authUser.customClaims, null, 2));
        } catch (err) {
            console.log(`  [Firebase Auth]: ERROR fetching user - ${err.message}`);
        }
    }

    console.log('\n=== INSPECTION COMPLETE ===');
}

runAudit().then(() => process.exit(0)).catch(err => {
    console.error('Fatal audit error:', err);
    process.exit(1);
});
