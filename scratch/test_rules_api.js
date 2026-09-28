const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function testRulesApi() {
    const projectId = 'bluesystem-7c9af';
    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";

    // 1. Get current ruleset name
    const relRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const relData = await relRes.json();
    const rulesetName = relData.releases.find(r => r.name.includes('cloud.firestore')).rulesetName;
    console.log('Current ruleset:', rulesetName);

    // Get source of ruleset
    const rsRes = await fetch(`https://firebaserules.googleapis.com/v1/${rulesetName}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const rsData = await rsRes.json();
    const source = rsData.source;

    // 2. Fetch the live order doc
    const docRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${testOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const orderDoc = await docRes.json();

    const testPayload = {
        name: `projects/${projectId}/databases/(default)/documents/orders/${testOrderId}`,
        fields: {
            ...orderDoc.fields,
            assignedCourierId: { stringValue: targetUid },
            motorizadoId: { stringValue: targetUid },
            status: { stringValue: 'courier_accepted' },
            estado: { stringValue: 'aceptado_por_courier' },
            courierPhase: { integerValue: '1' }
        }
    };

    const testRequest = {
        source: source,
        testSuite: {
            testCases: [
                {
                    expectation: "ALLOW",
                    request: {
                        auth: {
                            uid: targetUid,
                            token: {
                                uid: targetUid,
                                role: "courier",
                                eiamRole: "courier",
                                tenantId: "ten_bluesystem_core",
                                muni: "MANAGUA"
                            }
                        }
                    },
                    functionMocks: [],
                    path: `projects/${projectId}/databases/(default)/documents/orders/${testOrderId}`,
                    resource: orderDoc,
                    destination: testPayload,
                    method: "UPDATE"
                }
            ]
        }
    };

    console.log('\nSending test suite to firebaserules.googleapis.com:test...');
    const evalRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}:test`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': projectId
        },
        body: JSON.stringify(testRequest)
    });

    const evalData = await evalRes.json();
    console.log('Test result:', JSON.stringify(evalData, null, 2));
}

testRulesApi().catch(console.error);
