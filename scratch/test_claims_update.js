const { execSync } = require('child_process');

function getAccessToken() {
    return execSync('gcloud auth print-access-token').toString().trim();
}

async function testClaimsUpdate() {
    const token = getAccessToken();
    const uid = 'vbg7d4PwcEc5qe2KJ4kP2kfEXbq1';
    const claims = {
        role: 'COOK',
        userType: 'merchant',
        businessId: 'biz_canonical_tecnostore',
        branchId: 'br_canonical_tecnostore_main',
        orgId: 'org_1787895553815',
        tenantId: 'org_1787895553815'
    };

    console.log('Setting customAttributes for UID:', uid);
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(claims)
        })
    });

    const data = await res.json();
    console.log('Update response:', JSON.stringify(data, null, 2));

    // Verify
    const getRes = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-goog-user-project': 'bluesystem-7c9af',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            localId: [uid]
        })
    });
    const getData = await getRes.json();
    console.log('Lookup verification:', JSON.stringify(getData.users?.[0]?.customAttributes, null, 2));
}

testClaimsUpdate().catch(console.error);
