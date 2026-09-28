const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function getLiveRules() {
    const projectId = 'bluesystem-7c9af';

    try {
        const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': projectId
            }
        });
        const releasesData = await res.json();

        const firestoreRelease = releasesData.releases.find(r => r.name.includes('cloud.firestore'));
        if (firestoreRelease) {
            console.log('\nCurrent Firestore ruleset:', firestoreRelease.rulesetName);
            const rulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/${firestoreRelease.rulesetName}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-goog-user-project': projectId
                }
            });
            const rulesetData = await rulesetRes.json();
            const source = rulesetData.source.files[0].content;
            console.log('Total rules length (characters):', source.length);
            
            const lines = source.split('\n');
            const matchIdx = lines.findIndex(l => l.includes('match /orders/{orderId}'));
            console.log('match /orders/{orderId} found at line:', matchIdx + 1);
            if (matchIdx !== -1) {
                console.log('--- LIVE /orders/{orderId} RULES (Lines ' + (matchIdx + 1) + ' to ' + (matchIdx + 100) + ') ---');
                console.log(lines.slice(matchIdx, matchIdx + 100).join('\n'));
            }
        }
    } catch (err) {
        console.error('Error fetching live rules:', err.message);
    }
}

getLiveRules().catch(console.error);
