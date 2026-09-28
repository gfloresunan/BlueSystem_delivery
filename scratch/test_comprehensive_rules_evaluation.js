const { execSync } = require('child_process');
const fs = require('fs');
const token = execSync('gcloud auth print-access-token').toString().trim();

async function runComprehensiveRulesSuiteV2() {
    const projectId = 'bluesystem-7c9af';
    const localContent = fs.readFileSync('firestore.rules', 'utf8');

    // Create candidate optimized rules
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

    patched = patched.replace(
        `    function isBusinessAdmin() {
      return getRole() in ["OWNER", "MANAGER", "MERCHANT_OWNER", "MERCHANT_MANAGER", "TENANT_ADMIN", "owner", "manager", "merchant_owner", "merchant_manager", "tenant_admin"] ||
             request.auth.token.get("eiamRole", "") in ["OWNER", "MANAGER", "MERCHANT_OWNER", "MERCHANT_MANAGER", "TENANT_ADMIN", "owner", "manager", "merchant_owner", "merchant_manager", "tenant_admin"] ||
             request.auth.token.get("role", "") in ["OWNER", "MANAGER", "MERCHANT_OWNER", "MERCHANT_MANAGER", "TENANT_ADMIN", "owner", "manager", "merchant_owner", "merchant_manager", "tenant_admin"];
    }`,
        `    function isBusinessAdmin() {
      return getRole() in ["OWNER", "MANAGER", "MERCHANT_OWNER", "MERCHANT_MANAGER", "TENANT_ADMIN", "owner", "manager", "merchant_owner", "merchant_manager", "tenant_admin"];
    }`
    );

    // Guard courier branch with isCourierOrDriver check
    patched = patched.replace(
        `                        // Repartidor/Motorizado: Separación de Reclamo Inicial vs Operación en Curso (BSD-C4-002)
                        (
                          (
                            isPlatformAdmin() ||`,
        `                        // Repartidor/Motorizado: Separación de Reclamo Inicial vs Operación en Curso (BSD-C4-002)
                        (
                          (isPlatformAdmin() || getRole() in ["courier", "COURIER", "motorizado", "MOTORIZADO", "driver", "DRIVER", "repartidor", "REPARTIDOR"]) &&
                          (
                            isPlatformAdmin() ||`
    );

    // Test order doc
    const orderDoc = {
        businessId: "90169f49-9d0c-4571-97a5-5f19032a6f42",
        tenantId: "ten_bluesystem_core",
        customerId: "YO76WMtN2XRnZDd9aEarFSnWDip1",
        status: "ready",
        estado: "listo",
        total: 4560,
        commercialMunicipalityId: "MANAGUA"
    };

    const courierUid = "9QHYGkSa3nWiJ7KfPkccjjuIaYp2";
    const customerUid = "YO76WMtN2XRnZDd9aEarFSnWDip1";
    const adminUid = "admin_super_user";
    const merchantUid = "merchant_owner_user";

    const testCases = [
        {
            name: "1. Courier claims ready order (Fleet Pool)",
            expectation: "ALLOW",
            request: {
                auth: { uid: courierUid, token: { uid: courierUid, role: "courier", tenantId: "ten_bluesystem_core" } },
                method: "update",
                path: "/databases/(default)/documents/orders/BS2KwLtLRKQAwUALZMEE",
                resource: {
                    data: {
                        ...orderDoc,
                        assignedCourierId: courierUid,
                        motorizadoId: courierUid,
                        status: "courier_accepted",
                        estado: "aceptado_por_courier",
                        courierPhase: 1,
                        acceptedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                }
            },
            resource: { data: orderDoc }
        },
        {
            name: "2. Customer updates unreadCustomerCount",
            expectation: "ALLOW",
            request: {
                auth: { uid: customerUid, token: { uid: customerUid, role: "customer" } },
                method: "update",
                path: "/databases/(default)/documents/orders/BS2KwLtLRKQAwUALZMEE",
                resource: {
                    data: {
                        ...orderDoc,
                        unreadCustomerCount: 0
                    }
                }
            },
            resource: { data: orderDoc }
        },
        {
            name: "3. Platform Admin updates order status",
            expectation: "ALLOW",
            request: {
                auth: { uid: adminUid, token: { uid: adminUid, role: "SUPER_ADMIN" } },
                method: "update",
                path: "/databases/(default)/documents/orders/BS2KwLtLRKQAwUALZMEE",
                resource: {
                    data: {
                        ...orderDoc,
                        status: "preparing",
                        estado: "preparando"
                    }
                }
            },
            resource: { data: orderDoc }
        },
        {
            name: "4. Merchant Owner updates kitchen notes & status",
            expectation: "ALLOW",
            request: {
                auth: { uid: merchantUid, token: { uid: merchantUid, role: "OWNER", businessId: "90169f49-9d0c-4571-97a5-5f19032a6f42", tenantId: "ten_bluesystem_core" } },
                method: "update",
                path: "/databases/(default)/documents/orders/BS2KwLtLRKQAwUALZMEE",
                resource: {
                    data: {
                        ...orderDoc,
                        status: "ready",
                        estado: "listo",
                        notasCocina: "Sin cebolla"
                    }
                }
            },
            resource: { data: orderDoc }
        },
        {
            name: "5. Adversarial: Unrelated customer tries to steal order claim",
            expectation: "DENY",
            request: {
                auth: { uid: "attacker_123", token: { uid: "attacker_123", role: "customer" } },
                method: "update",
                path: "/databases/(default)/documents/orders/BS2KwLtLRKQAwUALZMEE",
                resource: {
                    data: {
                        ...orderDoc,
                        assignedCourierId: "attacker_123"
                    }
                }
            },
            resource: { data: orderDoc }
        }
    ];

    const body = {
        source: {
            files: [{ name: 'firestore.rules', content: patched }]
        },
        testSuite: {
            testCases: testCases.map(tc => ({
                expectation: tc.expectation,
                expressionReportLevel: "NONE",
                request: tc.request,
                resource: tc.resource
            }))
        }
    };

    console.log(`Sending ${testCases.length} test cases with hardened courier role guard...`);
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
    console.log('\n--- COMPREHENSIVE RULES SUITE V2 RESULTS ---');
    let allPassed = true;
    (resJson.testResults || []).forEach((tr, i) => {
        const tc = testCases[i];
        const pass = tr.state === 'SUCCESS';
        if (!pass) allPassed = false;
        console.log(`${pass ? '✅' : '❌'} Test [${tc.name}]: Expected ${tc.expectation} -> ${tr.state}`);
        if (!pass) {
            console.log('   Error Position:', tr.errorPosition);
            console.log('   Debug Messages:', tr.debugMessages);
        }
    });

    console.log(`\nOVERALL SCORECARD: ${allPassed ? '🟢 ALL TESTS PASSED (100%)' : '🔴 TESTS FAILED'}`);
}

runComprehensiveRulesSuiteV2().catch(console.error);
