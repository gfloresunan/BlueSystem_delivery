const { execSync } = require('child_process');
const fs = require('fs');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function traceDetailedAST() {
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

    function printNode(node, depth = 0) {
        if (!node) return;
        const indent = '  '.repeat(depth);
        const pos = node.sourcePosition || {};
        const line = pos.line || 0;
        const lineStr = lines[line - 1] ? lines[line - 1].trim() : '';
        const vals = (node.values || []).map(v => JSON.stringify(v.value)).join(', ');
        if (line >= 690 && line <= 712) {
            console.log(`${indent}L${line}: [${vals}] | Code: "${lineStr}" (cols ${pos.column}-${pos.endOffset})`);
        }
        if (node.children) {
            for (const c of node.children) printNode(c, depth + 1);
        }
    }

    console.log('--- DETAILED AST HIERARCHY (Lines 690-712) ---');
    for (const r of testResult.visitedExpressions || []) {
        printNode(r, 0);
    }
}

traceDetailedAST().catch(console.error);
