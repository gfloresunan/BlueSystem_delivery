const { execSync } = require('child_process');
const fs = require('fs');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function testOptimizedRules() {
    const projectId = 'bluesystem-7c9af';
    const targetUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const testOrderId = "BS2KwLtLRKQAwUALZMEE";

    // Read local rules
    const localContent = fs.readFileSync('firestore.rules', 'utf8');

    // Let's create an optimized version of the rules where:
    // 1. isPlatformAdmin is concise
    // 2. /orders/{orderId} update checks role branches cleanly without huge redundant chains
    
    // For test purposes, let's create a test rules source and send it to the Rules Test API
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

    // Replace the /orders/{orderId} update block with an optimized, non-bloated version
    // Let's see: In localContent, optimize isPlatformAdmin and orders update rule
    const optimizedContent = localContent; // We will test modifying specific functions

    // Let's test with the optimized rules
    // Specifically, let's replace isPlatformAdmin with a concise check:
    let patched = localContent.replace(
        `    function isPlatformAdmin() {
      return isAuthenticated() && (
        getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "SUPERVISOR", "OPERATOR", "OPERATIONS", "super_admin", "admin", "auditor", "support", "supervisor", "operator", "operations"] ||
        request.auth.token.get("eiamRole", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "SUPERVISOR", "OPERATOR", "OPERATIONS", "super_admin", "admin", "auditor", "support", "supervisor", "operator", "operations"] ||
        request.auth.token.get("role", "") in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "SUPERVISOR", "OPERATOR", "OPERATIONS", "super_admin", "admin", "auditor", "support", "supervisor", "operator", "operations"] ||
        request.auth.token.get("admin", false) == true ||
        request.auth.token.get("isSuperAdmin", false) == true ||
        request.auth.token.get("supervisor", false) == true ||
        request.auth.token.get("isPlatformAdmin", false) == true
      );
    }`,
        `    function isPlatformAdmin() {
      return isAuthenticated() && (
        getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "SUPERVISOR", "OPERATOR", "OPERATIONS", "super_admin", "admin", "auditor", "support", "supervisor", "operator", "operations"] ||
        request.auth.token.get("admin", false) == true ||
        request.auth.token.get("isSuperAdmin", false) == true
      );
    }`
    );

    const body = {
        source: {
            files: [{ name: 'firestore.rules', content: patched }]
        },
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
    const tr = resJson.testResults[0];
    console.log('Optimized isPlatformAdmin result:');
    console.log('State:', tr.state);
    console.log('Error position:', tr.errorPosition);
    console.log('Debug messages:', tr.debugMessages);
}

testOptimizedRules().catch(console.error);
