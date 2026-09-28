const { execSync } = require('child_process');

let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error('Error getting gcloud token:', e.message);
}

async function generatePasswordResetLinkRest(email) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:sendOobCode', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: email,
            returnOobLink: true
        })
    });
    const data = await res.json();
    return data;
}

async function verifyClaims() {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ localId: ['dlRY2ZVUqPR2Fxoc3cazcOxxRJg2'] })
    });
    const data = await res.json();
    const user = data.users[0];
    console.log('User Auth Record:', user.email, 'UID:', user.localId);
    console.log('Raw Custom Attributes:', user.customAttributes);
    const parsed = JSON.parse(user.customAttributes);
    console.log('Parsed Claims:', parsed);
    
    console.log('\n--- EVALUATING CLAIMS ---');
    console.log('role == OWNER:', parsed.role === 'OWNER');
    console.log('businessId == dlRY2ZVUqPR2Fxoc3cazcOxxRJg2:', parsed.businessId === 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2');
    console.log('branchId == br_1786988052589:', parsed.branchId === 'br_1786988052589');
    console.log('orgId == org_default_bluesystem:', parsed.orgId === 'org_default_bluesystem');
    
    console.log('\n--- GENERATING OFFICIAL AUTH PASSWORD RESET LINK ---');
    const resetRes = await generatePasswordResetLinkRest('fritonic@gmail.com');
    console.log('Reset Link REST Response:', JSON.stringify(resetRes, null, 2));
}

verifyClaims().catch(console.error);
