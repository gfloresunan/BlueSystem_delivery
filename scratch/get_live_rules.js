const { GoogleAuth } = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/google-auth-library');

async function getLiveRules() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const projectId = 'bluesystem-7c9af';

    try {
        const res = await client.request({
            url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`
        });
        console.log('Releases:', JSON.stringify(res.data, null, 2));

        const firestoreRelease = res.data.releases.find(r => r.name.includes('cloud.firestore'));
        if (firestoreRelease) {
            console.log('\nCurrent Firestore ruleset:', firestoreRelease.rulesetName);
            const rulesetRes = await client.request({
                url: `https://firebaserules.googleapis.com/v1/${firestoreRelease.rulesetName}`
            });
            const source = rulesetRes.data.source.files[0].content;
            console.log('\n--- LIVE RULES CONTAINS "support_tickets"? ---');
            console.log(source.includes('support_tickets'));
            if (source.includes('support_tickets')) {
                const lines = source.split('\n');
                const idx = lines.findIndex(l => l.includes('support_tickets'));
                console.log('Context:\n', lines.slice(Math.max(0, idx - 5), idx + 25).join('\n'));
            } else {
                console.log('⚠️ support_tickets is NOT in the live deployed Firestore rules!');
            }
        }
    } catch (err) {
        console.error('Error fetching live rules:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}

getLiveRules().catch(console.error);
