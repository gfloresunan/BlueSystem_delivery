const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function traceAllVisitedLines() {
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
    const lines = source.files[0].content.split('\n');

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
        courierPhase: 1,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

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
                                role: "courier",
                                eiamRole: "courier",
                                tenantId: "ten_bluesystem_core",
                                muni: "MANAGUA"
                            }
                        },
                        method: "update",
                        path: `/databases/(default)/documents/orders/${testOrderId}`,
                        time: new Date().toISOString(),
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
    const testResult = resJson.testResults[0];

    const visitedMap = new Map();
    function scan(node) {
        if (!node) return;
        if (node.sourcePosition) {
            const line = node.sourcePosition.line;
            const vals = (node.values || []).map(v => v.value);
            if (!visitedMap.has(line)) visitedMap.set(line, []);
            visitedMap.get(line).push({ pos: node.sourcePosition, vals });
        }
        if (node.children) {
            for (const c of node.children) scan(c);
        }
    }

    for (const r of testResult.visitedExpressions || []) {
        scan(r);
    }

    const sortedLines = [...visitedMap.keys()].sort((a, b) => a - b);
    for (const l of sortedLines) {
        const lineContent = lines[l - 1] ? lines[l - 1].trim() : '';
        const entries = visitedMap.get(l);
        const valSummary = entries.map(e => e.vals.join('/')).join(' | ');
        console.log(`L${String(l).padStart(4)}: [${valSummary}] ${lineContent}`);
    }
}

traceAllVisitedLines().catch(console.error);
