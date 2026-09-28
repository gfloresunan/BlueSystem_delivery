const { execSync } = require('child_process');
const path = require('path');

let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error('Error getting gcloud token:', e.message);
}

const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function getAuthUserByEmail(email) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ email: [email] })
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) {
        return data.users[0];
    }
    return null;
}

async function getAuthUserByUid(uid) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ localId: [uid] })
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) {
        return data.users[0];
    }
    return null;
}

async function inspectFull() {
    console.log("=== INSPECT TECNOSTORE & MERCHANT PROVISIONING STATE ===");

    // 1. Check Auth for tecnostore@bluesystemdelivery.com
    const authUser = await getAuthUserByEmail("tecnostore@bluesystemdelivery.com");
    console.log("\n1. Auth User for tecnostore@bluesystemdelivery.com:");
    console.log(JSON.stringify(authUser, null, 2));

    // 2. Check /users in Firestore for tecnostore@bluesystemdelivery.com
    const usersSnap = await db.collection("users").where("email", "==", "tecnostore@bluesystemdelivery.com").get();
    console.log(`\n2. Firestore /users matching email: ${usersSnap.size}`);
    usersSnap.forEach(doc => {
        console.log(`User [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
    });

    // 3. Check /businesses in Firestore
    const bizSnap = await db.collection("businesses").get();
    console.log(`\n3. Total /businesses in Firestore: ${bizSnap.size}`);
    bizSnap.forEach(doc => {
        const d = doc.data();
        if (doc.id.includes("tecno") || (d.name && d.name.toLowerCase().includes("tecno")) || (d.email && d.email.includes("tecno"))) {
            console.log(`Business [${doc.id}]:`, JSON.stringify(d, null, 2));
        }
    });

    // 4. Check /merchant_applications in Firestore
    const appSnap = await db.collection("merchant_applications").get();
    console.log(`\n4. Total /merchant_applications: ${appSnap.size}`);
    appSnap.forEach(doc => {
        const d = doc.data();
        if (doc.id.includes("tecno") || (d.businessName && d.businessName.toLowerCase().includes("tecno")) || (d.email && d.email.includes("tecno"))) {
            console.log(`Application [${doc.id}]:`, JSON.stringify(d, null, 2));
        }
    });

    // 5. Check /memberships and /membership
    const memSnap = await db.collection("membership").get();
    console.log(`\n5. Total legacy /membership: ${memSnap.size}`);
    memSnap.forEach(doc => {
        const d = doc.data();
        if (doc.id.includes("tecno") || (d.businessName && d.businessName.toLowerCase().includes("tecno")) || (d.email && d.email && d.email.includes("tecno")) || (d.businessId && d.businessId.includes("tecno"))) {
            console.log(`Membership [${doc.id}]:`, JSON.stringify(d, null, 2));
        }
    });

    // 6. Check /audit_events
    const auditSnap = await db.collection("audit_events").orderBy("timestamp", "desc").limit(10).get();
    console.log(`\n6. Last 10 audit_events:`);
    auditSnap.forEach(doc => {
        console.log(`Audit [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
    });
}

inspectFull().catch(console.error);
