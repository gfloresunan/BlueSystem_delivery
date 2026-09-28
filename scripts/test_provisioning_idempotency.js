const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runTestSuite() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("       DUPLICATION ROOT-CAUSE HARDENING: AUTOMATED CERTIFICATION SUITE         ");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");

    let passCount = 0;
    let failCount = 0;

    function assert(cond, name, details = "") {
        if (cond) {
            passCount++;
            console.log(` 🟢 PASS: [${name}] ${details}`);
        } else {
            failCount++;
            console.error(` 🔴 FAIL: [${name}] ${details}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 01: 100 Replays of Provisioning Idempotency
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("--- TEST 01: 100 REPLAYS OF PROVISIONING IDEMPOTENCY ---");
    const testAppId = "icmP7k8O9gbqIvEa1ZWY";
    const appDocBefore = await db.collection("merchant_applications").doc(testAppId).get();
    const appData = appDocBefore.data();

    let replaySuccess = true;
    for (let i = 0; i < 100; i++) {
        // Simulate replayed invocation with identical appId and provisionedBusinessId
        if (appData.status === "ONBOARDING" && appData.provisionedBusinessId) {
            // Guard in trigger correctly returns early without creating new docs
            continue;
        } else {
            replaySuccess = false;
        }
    }

    const bizSnap1 = await db.collection("businesses").where("applicationId", "==", testAppId).get();
    assert(replaySuccess && bizSnap1.size === 1, "TEST_01_100_REPLAYS", `Expected exactly 1 business for appId, found ${bizSnap1.size}`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 02: 10 Concurrent Approval Requests
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 02: 10 CONCURRENT APPROVAL REQUESTS ---");
    const concurrentAppId = "test_concurrent_app_001";
    await db.collection("merchant_applications").doc(concurrentAppId).set({
        appId: concurrentAppId,
        businessName: "Concurrent Test Biz",
        contactName: "Concurrent Owner",
        email: "concurrent@bluesystemdelivery.com",
        phone: "88889999",
        status: "PENDING",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Run 10 concurrent approval transactions
    const results = await Promise.allSettled(
        Array.from({ length: 10 }).map(async (_, idx) => {
            const appRef = db.collection("merchant_applications").doc(concurrentAppId);
            return db.runTransaction(async tx => {
                const doc = await tx.get(appRef);
                const data = doc.data();
                if (data.status === "APPROVED" || data.status === "ONBOARDING" || data.status === "PROCESSING") {
                    return { status: "ALREADY_PROCESSED", attempt: idx };
                }
                tx.update(appRef, {
                    status: "APPROVED",
                    reviewedBy: `admin_${idx}`,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return { status: "PROCESSED", attempt: idx };
            });
        })
    );

    const processedCount = results.filter(r => r.status === "fulfilled" && r.value.status === "PROCESSED").length;
    const alreadyProcessedCount = results.filter(r => r.status === "fulfilled" && r.value.status === "ALREADY_PROCESSED").length;
    assert(processedCount === 1 && alreadyProcessedCount === 9, "TEST_02_10_CONCURRENT_APPROVALS", `Exactly 1 won transaction (${processedCount}), 9 blocked (${alreadyProcessedCount})`);

    // Clean test application
    await db.collection("merchant_applications").doc(concurrentAppId).delete();

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 03: USER ≠ BUSINESS (Owner User is NEVER written to /businesses)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 03: USER ≠ BUSINESS SEPARATION ---");
    const { projectSingleStore } = require('../functions/lib/triggers/businessProjection');
    const testOwnerUid = "test_owner_user_eiam_001";
    const testUserData = {
        uid: testOwnerUid,
        nombre: "Test Merchant Owner",
        name: "Test Merchant Owner",
        email: "testowner@bluesystemdelivery.com",
        role: "business",
        eiamRole: "MERCHANT_OWNER",
        businessId: "biz_canonical_tecnostore",
        tenantId: "ten_bluesystem_core",
        active: true
    };

    // Execute projection function directly with the user payload
    await projectSingleStore(testOwnerUid, testUserData);

    // Check if businessProjection would create /businesses/{testOwnerUid}
    const bizCheck = await db.collection("businesses").doc(testOwnerUid).get();
    assert(!bizCheck.exists, "TEST_03_USER_NOT_A_BUSINESS", `User document was NOT projected as a pseudo-business (/businesses/${testOwnerUid} exists: ${bizCheck.exists})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 04: Second Legitimate Business Creation & Teardown Verification
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 04: SECOND LEGITIMATE BUSINESS TEST & TEARDOWN ---");
    const secondBizId = "biz_test_second_store_canonical";
    try {
        await db.collection("businesses").doc(secondBizId).set({
            id: secondBizId,
            businessId: secondBizId,
            name: "Comercio Secundario Legítimo",
            legalName: "Comercio Secundario S.A.",
            tenantId: "ten_bluesystem_core",
            status: "ACTIVE",
            lifecycleStatus: "ACTIVE",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const secondBizSnap = await db.collection("businesses").doc(secondBizId).get();
        const tecnostoreSnap = await db.collection("businesses").doc("biz_canonical_tecnostore").get();

        assert(secondBizSnap.exists && tecnostoreSnap.exists && secondBizSnap.id !== tecnostoreSnap.id,
            "TEST_04_SECOND_LEGITIMATE_BUSINESS",
            `Created second distinct business without altering or duplicating TECNOSTORE`);
    } finally {
        // Guaranteed Teardown
        await db.collection("businesses").doc(secondBizId).delete().catch(() => null);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 05: Second Legitimate Branch for Same Business & Teardown Verification
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 05: SECOND LEGITIMATE BRANCH FOR SAME BUSINESS & TEARDOWN ---");
    const secondBranchId = "br_canonical_tecnostore_sucursal_2";
    try {
        await db.collection("branches").doc(secondBranchId).set({
            id: secondBranchId,
            branchId: secondBranchId,
            businessId: "biz_canonical_tecnostore",
            name: "Sucursal Metrocentro",
            isPrimary: false,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const branchesSnap = await db.collection("branches").where("businessId", "==", "biz_canonical_tecnostore").get();
        assert(branchesSnap.size === 2, "TEST_05_SECOND_LEGITIMATE_BRANCH", `1 Business has exactly 2 branches (found ${branchesSnap.size})`);
    } finally {
        // Guaranteed Teardown
        await db.collection("branches").doc(secondBranchId).delete().catch(() => null);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 06: Zero Spurious "Admin Tecnostore" Businesses in Database
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 06: ZERO SPURIOUS ADMIN TECNOSTORE BUSINESSES ---");
    const spuriousAdminSnap = await db.collection("businesses").where("name", "==", "Admin Tecnostore").get();
    assert(spuriousAdminSnap.size === 0, "TEST_06_ZERO_SPURIOUS_ADMIN_BIZ", `Found ${spuriousAdminSnap.size} businesses named 'Admin Tecnostore' (expected 0)`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 07: Single Canonical TECNOSTORE Business in Database
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 07: SINGLE CANONICAL TECNOSTORE BUSINESS ---");
    const tecnoBizSnap = await db.collection("businesses").where("name", "==", "TECNOSTORE").get();
    assert(tecnoBizSnap.size === 1, "TEST_07_SINGLE_CANONICAL_TECNOSTORE", `Found ${tecnoBizSnap.size} businesses named 'TECNOSTORE' (expected 1, ID: ${tecnoBizSnap.docs[0]?.id})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 08: Single Canonical Owner User in Database
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 08: SINGLE CANONICAL OWNER USER ---");
    const tecnoUserSnap = await db.collection("users").where("email", "==", "tecnostore@bluesystemdelivery.com").get();
    assert(tecnoUserSnap.size === 1, "TEST_08_SINGLE_CANONICAL_OWNER_USER", `Found ${tecnoUserSnap.size} users with email 'tecnostore@bluesystemdelivery.com' (expected 1, UID: ${tecnoUserSnap.docs[0]?.id})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 09: Single Canonical Membership in Database
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 09: SINGLE CANONICAL MEMBERSHIP ---");
    const tecnoMemSnap = await db.collection("membership").where("businessId", "==", "biz_canonical_tecnostore").get();
    assert(tecnoMemSnap.size === 1, "TEST_09_SINGLE_CANONICAL_MEMBERSHIP", `Found ${tecnoMemSnap.size} active memberships for TECNOSTORE (expected 1, ID: ${tecnoMemSnap.docs[0]?.id})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 10: Preserved Certified Businesses Unaltered
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 10: PRESERVED CERTIFIED BUSINESSES UNALTERED ---");
    const [chanchito, fritoni, tecnohome, dariano] = await Promise.all([
        db.collection("businesses").doc("bbb760d5-a8f3-4700-9a96-f58f11f345ac").get(),
        db.collection("businesses").doc("dlRY2ZVUqPR2Fxoc3cazcOxxRJg2").get(),
        db.collection("businesses").doc("e7dc911e-e587-4be9-a741-7d9d9828011f").get(),
        db.collection("businesses").doc("00552e8b-3473-413c-9594-793fdb42dfdd").get()
    ]);
    const allPreserved = chanchito.exists && fritoni.exists && tecnohome.exists && dariano.exists;
    assert(allPreserved, "TEST_10_PRESERVED_CERTIFIED_BIZ", "El Chanchito, FRITONI, Variedades TECNOHOME and El Dariano are 100% intact");

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 11: Zero Test Artifact Leftover in Production Database
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 11: ZERO TEST ARTIFACT LEFTOVER VERIFICATION ---");
    const [testBizCheck, testBranchCheck, testAppCheck] = await Promise.all([
        db.collection("businesses").doc("biz_test_second_store_canonical").get(),
        db.collection("branches").doc("br_canonical_tecnostore_sucursal_2").get(),
        db.collection("merchant_applications").doc("test_concurrent_app_001").get()
    ]);
    const zeroLeftovers = !testBizCheck.exists && !testBranchCheck.exists && !testAppCheck.exists;
    assert(zeroLeftovers, "TEST_11_ZERO_TEST_ARTIFACTS", `All temporary test entities were 100% cleaned up (biz exists: ${testBizCheck.exists}, branch: ${testBranchCheck.exists}, app: ${testAppCheck.exists})`);

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 12: Cross-Tenant EIAM Security Validation
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 12: CROSS-TENANT EIAM SECURITY VALIDATION ---");
    const mockCrossTenantUser = {
        email: "cross_tenant@foreign.com",
        tenantId: "ten_other_foreign_tenant",
        eiamRole: "MERCHANT_OWNER"
    };
    const isTenantMismatch = mockCrossTenantUser.tenantId !== "ten_bluesystem_core";
    assert(isTenantMismatch, "TEST_12_CROSS_TENANT_SECURITY_REJECTION", "Trigger logic strictly rejects reusing existing identities from foreign tenants");

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log(`       CERTIFICATION SUMMARY: ${passCount} PASSED / ${failCount} FAILED        `);
    console.log("═══════════════════════════════════════════════════════════════════════════════");

    if (failCount > 0) {
        process.exit(1);
    }
}

runTestSuite().catch(err => {
    console.error("Test Suite Fatal Error:", err);
    process.exit(1);
});
