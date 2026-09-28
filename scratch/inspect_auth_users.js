const { execSync } = require('child_process');
const https = require('https');

function getAccessToken() {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function lookupUsers(uids) {
    const token = getAccessToken();
    const postData = JSON.stringify({
        localId: uids
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            port: 443,
            path: '/v1/projects/bluesystem-7c9af/accounts:lookup',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': 'bluesystem-7c9af',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function run() {
    const uids = [
        'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2', // Aldrich Flores / El Chanchito
        'XWNzPT5p6fbf7reFdFBNTZoQrY42', // Junior Flores / Variedades TECNOHOME
        'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2', // FRITONI
        '8O8hJe5kSzNQxUkLwwkCsipGmAI3',
        '1768243841542',
        '1769029559449'
    ];

    console.log('Fetching Firebase Auth user records via IdentityToolkit API...');
    const result = await lookupUsers(uids);
    
    if (!result.users) {
        console.log('No users returned or error:', result);
        return;
    }

    console.log(`\n=== FIREBASE AUTH USERS & CUSTOM CLAIMS (${result.users.length} found) ===\n`);
    for (const u of result.users) {
        console.log(`----------------------------------------`);
        console.log(`UID: ${u.localId}`);
        console.log(`Email: ${u.email}`);
        console.log(`DisplayName: ${u.displayName}`);
        console.log(`Disabled: ${u.disabled}`);
        console.log(`CustomAttributes (Claims Raw): ${u.customAttributes}`);
        if (u.customAttributes) {
            try {
                const parsedClaims = JSON.parse(u.customAttributes);
                console.log(`Parsed Custom Claims:`, JSON.stringify(parsedClaims, null, 2));
            } catch (e) {
                console.log(`Error parsing customAttributes:`, e);
            }
        } else {
            console.log(`Custom Claims: NONE (undefined/null)`);
        }
    }
}

run().catch(console.error);
