const { execSync } = require('child_process');

let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error('Error getting gcloud token:', e.message);
}

async function setClaimsRest(uid, customClaims) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(customClaims)
        })
    });
    return await res.json();
}

async function getAuthUserRest(uid) {
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
    return data.users ? data.users[0] : null;
}

async function main() {
    const uid = 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2';
    const canonicalClaims = {
        role: 'OWNER',
        businessId: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2',
        branchId: 'br_1786988052589',
        orgId: 'org_default_bluesystem',
        tenantId: null
    };

    console.log('Setting canonical claims on', uid);
    const updateRes = await setClaimsRest(uid, canonicalClaims);
    console.log('Update res:', updateRes);

    const user = await getAuthUserRest(uid);
    console.log('Verified Claims:', user.customAttributes);
}

main().catch(console.error);
