const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function testIdentityToolkit() {
    const targetUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    console.log("1. Buscando usuario por UID:", targetUid);

    const lookupRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ localId: [targetUid] })
    });
    const lookupData = await lookupRes.json();
    console.log("Lookup result:", JSON.stringify(lookupData, null, 2));

    if (!lookupData.users || lookupData.users.length === 0) {
        console.error("Usuario no encontrado en Firebase Auth");
        return;
    }

    const user = lookupData.users[0];
    const email = user.email;
    console.log("Email objetivo:", email);

    console.log("\n2. Probando /accounts:sendOobCode para PASSWORD_RESET con token OAuth...");
    const oobRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: email,
            returnOobLink: true
        })
    });
    const oobData = await oobRes.json();
    console.log("sendOobCode status:", oobRes.status);
    console.log("sendOobCode response:", JSON.stringify(oobData, null, 2));
}

testIdentityToolkit().catch(console.error);
