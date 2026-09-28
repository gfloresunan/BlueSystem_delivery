const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}
const db = admin.firestore();

async function inspectTecnostoreIdentity() {
    console.log("=== INSPECCIÓN DE IDENTIDAD TECNOSTORE ===");
    
    // 1. Check Firestore /users
    console.log("\n1. Firestore doc /users/04JAKPrmXjg7s2CDiT3kUPOhBwn2:");
    const userDoc = await db.collection("users").doc("04JAKPrmXjg7s2CDiT3kUPOhBwn2").get();
    if (userDoc.exists) {
        console.log("User doc encontrado:", userDoc.data());
    } else {
        console.log("User doc NO existe en Firestore!");
    }

    // 2. Search Firestore /users by email
    console.log("\n2. Buscando en Firestore /users por email tecnostore@bluesystemdelivery.com:");
    const userByEmailSnap = await db.collection("users").where("email", "==", "tecnostore@bluesystemdelivery.com").get();
    console.log(`Encontrados ${userByEmailSnap.size} docs en /users con ese email:`);
    userByEmailSnap.forEach(d => console.log(` - ID: ${d.id}`, d.data()));

    // 3. Search Auth by email
    console.log("\n3. Buscando en Auth por email tecnostore@bluesystemdelivery.com:");
    const emailLookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ email: ["tecnostore@bluesystemdelivery.com"] })
    });
    const emailLookupData = await emailLookupRes.json();
    console.log("Auth lookup por email:", JSON.stringify(emailLookupData, null, 2));

    // 4. Check memberships
    console.log("\n4. Buscando memberships para tecnostore:");
    const memSnap = await db.collection("memberships").where("businessId", "==", "biz_canonical_tecnostore").get();
    console.log(`Encontradas ${memSnap.size} memberships:`);
    memSnap.forEach(d => console.log(` - ID: ${d.id}`, d.data()));

    // 5. Test sendOobCode directly if email is found or with any email
    console.log("\n5. Probando sendOobCode para tecnostore@bluesystemdelivery.com:");
    const oobRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: "tecnostore@bluesystemdelivery.com"
        })
    });
    const oobData = await oobRes.json();
    console.log("sendOobCode resultado:", oobRes.status, JSON.stringify(oobData, null, 2));
}

inspectTecnostoreIdentity().catch(console.error);
