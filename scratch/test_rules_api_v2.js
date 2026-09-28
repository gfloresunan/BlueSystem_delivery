const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function testRulesApiFormat() {
    const projectId = 'bluesystem-7c9af';
    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";

    // Get current ruleset source
    const relRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const relData = await relRes.json();
    const firestoreRelease = relData.releases.find(r => r.name.includes('cloud.firestore'));
    const rsRes = await fetch(`https://firebaserules.googleapis.com/v1/${firestoreRelease.rulesetName}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const rsData = await rsRes.json();
    const source = rsData.source;

    // Test API format for Firebase Rules v1:
    // testSuite: { testCases: [ { request: { auth: ..., path: ..., method: ... } } ] }
    // According to Google API docs:
    // TestCase has:
    // request: object (the request object in rules)
    // resource: object (the resource object in rules)
    // functionMocks: array
    // expectation: "ALLOW" or "DENY"
    // expressionReportLevel: "VISITED" or "ALL"
    
    // Note: in Rules Test API, request.path is represented as a string or subfields.
    const body = {
        source: source,
        testSuite: {
            testCases: [
                {
                    expectation: "ALLOW",
                    expressionReportLevel: "FULL",
                    request: {
                        auth: {
                            uid: targetUid,
                            token: {
                                uid: targetUid,
                                role: "courier"
                            }
                        },
                        method: "update",
                        path: `/databases/(default)/documents/orders/${testOrderId}`,
                        time: new Date().toISOString()
                    }
                }
            ]
        }
    };

    const evalRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}:test`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': projectId
        },
        body: JSON.stringify(body)
    });

    const resJson = await evalRes.json();
    console.log('Result:', JSON.stringify(resJson, null, 2));
}

testRulesApiFormat().catch(console.error);
