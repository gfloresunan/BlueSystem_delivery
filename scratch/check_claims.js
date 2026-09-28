const { execSync } = require('child_process');

let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error('Error getting gcloud token:', e.message);
}

async function checkCanonicalClaims() {
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
    console.log('Canonical user claims:', data.users[0].customAttributes);
}

checkCanonicalClaims().catch(console.error);
