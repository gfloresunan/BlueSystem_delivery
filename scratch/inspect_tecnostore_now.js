const { execSync } = require('child_process');
const path = require('path');

const token = execSync('gcloud auth print-access-token').toString().trim();
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function getAuthUserRest(identifier) {
    const isEmail = identifier.includes('@');
    const body = isEmail ? { email: [identifier] } : { localId: [identifier] };
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) {
        return data.users[0];
    }
    return null;
}

async function inspect() {
    console.log("=== INSPECCIÓN FORENSE TECNOSTORE & EIAM ===");
    
    // 1. Check user in Firestore by email
    const usersSnap = await db.collection("users").where("email", "==", "tecnostore@bluesystemdelivery.com").get();
    console.log(`\n1. Firestore /users (email=tecnostore@bluesystemdelivery.com): count=${usersSnap.size}`);
    let userDocId = null;
    usersSnap.forEach(d => {
        userDocId = d.id;
        console.log(`Doc ID: ${d.id}`, JSON.stringify(d.data(), null, 2));
    });

    // 2. Check Auth user
    let authUser = await getAuthUserRest("tecnostore@bluesystemdelivery.com");
    console.log("\n2. Auth user by email:");
    console.log(JSON.stringify(authUser, null, 2));

    if (userDocId && (!authUser || authUser.localId !== userDocId)) {
        console.log(`\n2b. Auth user by Firestore Doc ID (${userDocId}):`);
        const authByUid = await getAuthUserRest(userDocId);
        console.log(JSON.stringify(authByUid, null, 2));
    }

    // 3. Check Businesses
    const bizSnap = await db.collection("businesses").get();
    console.log(`\n3. Total businesses: ${bizSnap.size}`);
    bizSnap.forEach(d => {
        const data = d.data();
        if (d.id.includes("tecno") || (data.name && data.name.toLowerCase().includes("tecno")) || (data.email && data.email.includes("tecno"))) {
            console.log(`Biz ID: ${d.id}`, JSON.stringify(data, null, 2));
        }
    });

    // 4. Check Branches
    const brSnap = await db.collection("branches").get();
    console.log(`\n4. Branches matching tecno:`);
    brSnap.forEach(d => {
        const data = d.data();
        if (d.id.includes("tecno") || (data.name && data.name.toLowerCase().includes("tecno")) || (data.businessId && data.businessId.includes("tecno"))) {
            console.log(`Branch ID: ${d.id}`, JSON.stringify(data, null, 2));
        }
    });

    // 5. Check Membership
    const memSnap = await db.collection("membership").get();
    console.log(`\n5. Memberships matching tecno:`);
    memSnap.forEach(d => {
        const data = d.data();
        if (d.id.includes("tecno") || (data.businessId && data.businessId.includes("tecno")) || (data.email && data.email.includes("tecno")) || (data.uid && (data.uid === userDocId || (authUser && data.uid === authUser.localId)))) {
            console.log(`Membership ID: ${d.id}`, JSON.stringify(data, null, 2));
        }
    });
}

inspect().catch(err => {
    console.error("Error in inspection:", err);
    process.exit(1);
});
