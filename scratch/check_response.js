const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function checkResponse() {
    const projectId = 'bluesystem-7c9af';
    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";

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

    const docRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${testOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-goog-user-project': projectId }
    });
    const orderDoc = await docRes.json();

    function fromFirestoreDoc(fields) {
        const out = {};
        for (const [k, v] of Object.entries(fields)) {
            if (v.stringValue !== undefined) out[k] = v.stringValue;
            else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue, 10);
            else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
            else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
            else if (v.timestampValue !== undefined) out[k] = v.timestampValue;
            else if (v.mapValue !== undefined) out[k] = fromFirestoreDoc(v.mapValue.fields || {});
            else if (v.arrayValue !== undefined) out[k] = (v.arrayValue.values || []).map(x => x.stringValue || x.integerValue || x);
            else if (v.nullValue !== undefined) out[k] = null;
        }
        return out;
    }

    const currentDocData = fromFirestoreDoc(orderDoc.fields);
    const updatedDocData = {
        ...currentDocData,
        assignedCourierId: targetUid,
        motorizadoId: targetUid,
        status: "courier_accepted",
        estado: "aceptado_por_courier",
        courierPhase: 1
    };

    const body = {
        source: source,
        testSuite: {
            testCases: [
                {
                    expectation: "ALLOW",
                    expressionReportLevel: "VISITED",
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
                        },
                        method: "update",
                        path: `/databases/(default)/documents/orders/${testOrderId}`,
                        resource: { data: updatedDocData }
                    },
                    resource: { data: currentDocData }
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
    console.log('Top-level response keys:', Object.keys(resJson));
    if (resJson.testResults) {
        console.log('testResults length:', resJson.testResults.length);
        const tr = resJson.testResults[0];
        console.log('tr keys:', Object.keys(tr));
        console.log('State:', tr.state);
        console.log('Error position:', tr.errorPosition);
        console.log('Visited expressions length:', (tr.visitedExpressions || []).length);
        console.log('First 3 visited expressions:');
        console.log(JSON.stringify((tr.visitedExpressions || []).slice(0, 3), null, 2));
    } else {
        console.log('Error response:', JSON.stringify(resJson, null, 2));
    }
}

checkResponse().catch(console.error);
