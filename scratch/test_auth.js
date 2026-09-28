process.env.GOOGLE_CLOUD_PROJECT = 'bluesystem-7c9af';
process.env.GCLOUD_PROJECT = 'bluesystem-7c9af';

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

async function testAuth() {
    try {
        const uids = [
            'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2',
            'XWNzPT5p6fbf7reFdFBNTZoQrY42',
            'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2'
        ];
        for (const uid of uids) {
            const user = await admin.auth().getUser(uid);
            console.log(`UID ${uid}:`, {
                email: user.email,
                disabled: user.disabled,
                customClaims: user.customClaims
            });
        }
    } catch (e) {
        console.error('Auth error:', e.message);
    }
}

testAuth();
