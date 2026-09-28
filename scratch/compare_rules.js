const { execSync } = require('child_process');
const fs = require('fs');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function downloadLiveRules() {
    const projectId = 'bluesystem-7c9af';
    const relRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const relData = await relRes.json();
    const firestoreRelease = relData.releases.find(r => r.name.includes('cloud.firestore'));
    console.log('Active release:', firestoreRelease);

    const rsRes = await fetch(`https://firebaserules.googleapis.com/v1/${firestoreRelease.rulesetName}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const rsData = await rsRes.json();
    const liveContent = rsData.source.files[0].content;
    
    fs.writeFileSync('scratch/live_firestore_downloaded.rules', liveContent);
    console.log('Saved live rules to scratch/live_firestore_downloaded.rules. Total bytes:', liveContent.length);

    // Compare with local firestore.rules
    const localContent = fs.readFileSync('firestore.rules', 'utf8');
    console.log('Local firestore.rules total bytes:', localContent.length);

    if (liveContent === localContent) {
        console.log('🟢 Local firestore.rules is IDENTICAL to live deployed rules!');
    } else {
        console.log('⚠️ Local firestore.rules is DIFFERENT from live deployed rules!');
    }
}

downloadLiveRules().catch(console.error);
