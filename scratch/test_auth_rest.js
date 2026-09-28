const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function testLookup() {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({
            localId: ['dlRY2ZVUqPR2Fxoc3cazcOxxRJg2']
        })
    });
    const data = await res.json();
    console.log('Lookup FRITONI response:', JSON.stringify(data, null, 2));
}

testLookup();
