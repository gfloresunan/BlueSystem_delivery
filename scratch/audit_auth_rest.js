const { execSync } = require('child_process');

let token;
try {
    token = execSync('gcloud auth print-access-token').toString().trim();
} catch (e) {
    console.error('Error getting gcloud token:', e.message);
    process.exit(1);
}

async function lookupAuthUserByEmail(email) {
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
    return data;
}

async function lookupAuthUserByUid(uid) {
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
    return data;
}

async function queryAllAuthUsers() {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:batchGet?maxResults=1000', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        }
    });
    const data = await res.json();
    return data;
}

async function main() {
    console.log('=== 1. LOOKUP BY EMAIL: fritoni@gmail.com ===');
    const res1 = await lookupAuthUserByEmail('fritoni@gmail.com');
    console.log(JSON.stringify(res1, null, 2));

    console.log('\n=== 2. LOOKUP BY EMAIL: fritonic@gmail.com ===');
    const res2 = await lookupAuthUserByEmail('fritonic@gmail.com');
    console.log(JSON.stringify(res2, null, 2));

    console.log('\n=== 3. LOOKUP BY UID: dlRY2ZVUqPR2Fxoc3cazcOxxRJg2 ===');
    const res3 = await lookupAuthUserByUid('dlRY2ZVUqPR2Fxoc3cazcOxxRJg2');
    console.log(JSON.stringify(res3, null, 2));

    console.log('\n=== 4. LOOKUP BY UID: d1rY2ZVUqPR2FXoc3czc0cXXRJg2 (from user prompt) ===');
    const res4 = await lookupAuthUserByUid('d1rY2ZVUqPR2FXoc3czc0cXXRJg2');
    console.log(JSON.stringify(res4, null, 2));

    console.log('\n=== 5. SCANNING ALL AUTH USERS FOR FRITONI / FRITONIC ===');
    const allUsers = await queryAllAuthUsers();
    if (allUsers && allUsers.users) {
        console.log(`Total Auth Users in project: ${allUsers.users.length}`);
        const matches = allUsers.users.filter(u => {
            const s = JSON.stringify(u).toLowerCase();
            return s.includes('friton') || s.includes('dlry') || s.includes('d1ry');
        });
        console.log(`Found ${matches.length} matching users in Auth:`);
        console.log(JSON.stringify(matches, null, 2));
    } else {
        console.log('batchGet response:', allUsers);
    }
}

main().catch(err => {
    console.error('Fatal error in REST auth lookup:', err);
});
