const { execSync } = require('child_process');
const fs = require('fs');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function traceRulesAST() {
    const projectId = 'bluesystem-7c9af';
    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";

    // 1. Get current ruleset source
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

    // 2. Get live order doc
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

    console.log('Test State:', testResult.state);
    console.log('Keys in testResult:', Object.keys(testResult));

    function collectExpressions(node, list = []) {
        if (!node) return list;
        if (node.sourcePosition) {
            const lineNum = node.sourcePosition.line;
            const lineContent = lines[lineNum - 1] ? lines[lineNum - 1].trim() : '';
            const val = node.values ? node.values.map(v => v.value).join(', ') : '';
            list.push({ lineNum, lineContent, val, sourcePosition: node.sourcePosition });
        }
        if (node.children) {
            for (const c of node.children) collectExpressions(c, list);
        }
        return list;
    }

    const rootNodes = testResult.visitedExpressions || testResult.expressionReports || [];
    console.log('Total root nodes:', rootNodes.length);
    const allNodes = [];
    for (const r of rootNodes) {
        collectExpressions(r, allNodes);
    }

    console.log('\n--- EVALUATED RULES LINES (Filtered to lines 670 - 720) ---');
    const filtered = allNodes.filter(n => n.lineNum >= 670 && n.lineNum <= 720);
    for (const item of filtered) {
        console.log(`L${item.lineNum} [val: ${item.val}] -> ${item.lineContent}`);
    }

    if (filtered.length === 0) {
        console.log('No expressions found in range 670-720! Printing all evaluated lines:');
        const uniqueLines = [...new Set(allNodes.map(n => n.lineNum))].sort((a, b) => a - b);
        for (const l of uniqueLines) {
            console.log(`Line ${l}: ${lines[l - 1]}`);
        }
    }
}

traceRulesAST().catch(console.error);
