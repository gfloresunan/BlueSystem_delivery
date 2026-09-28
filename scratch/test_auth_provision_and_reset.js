const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function testAuthProvisionAndResetLink() {
    console.log("=== PRUEBA DE PROVISIÓN AUTH Y GENERACIÓN DE ENLACE DE RESET ===");
    const targetUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    const targetEmail = "tecnostore@bluesystemdelivery.com";
    const displayName = "Admin Tecnostore";

    console.log("1. Verificando si existe en Auth...");
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
    const existsInAuth = lookupData.users && lookupData.users.length > 0;
    console.log("Existe en Auth:", existsInAuth);

    if (!existsInAuth) {
        console.log(`2. Creando Auth record para UID canónico ${targetUid}...`);
        const createRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-goog-user-project': 'bluesystem-7c9af'
            },
            body: JSON.stringify({
                localId: targetUid,
                email: targetEmail,
                displayName: displayName,
                emailVerified: true
            })
        });
        const createData = await createRes.json();
        console.log("Create account status:", createRes.status, createData);

        console.log("3. Asignando Custom Claims EIAM a la cuenta creada...");
        const claims = {
            role: "OWNER",
            eiamRole: "MERCHANT_OWNER",
            businessId: "biz_canonical_tecnostore",
            branchId: "br_canonical_tecnostore_main",
            tenantId: "ten_bluesystem_core",
            orgId: "org_canonical_tecnostore"
        };
        const claimsRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:setCustomUserClaims', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-goog-user-project': 'bluesystem-7c9af'
            },
            body: JSON.stringify({
                localId: targetUid,
                customAttributes: JSON.stringify(claims)
            })
        });
        console.log("Set claims status:", claimsRes.status);
    }

    console.log("\n4. Generando enlace de recuperación de contraseña (sendOobCode)...");
    const oobRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: targetEmail,
            returnOobLink: true,
            continueUrl: "https://bluesystem-7c9af.web.app"
        })
    });
    const oobData = await oobRes.json();
    console.log("sendOobCode status:", oobRes.status);
    console.log("sendOobCode respuesta:", {
        kind: oobData.kind,
        email: oobData.email,
        hasOobCode: !!oobData.oobCode,
        hasOobLink: !!oobData.oobLink,
        oobLinkSample: oobData.oobLink ? oobData.oobLink.substring(0, 60) + '...' : null
    });
}

testAuthProvisionAndResetLink().catch(console.error);
