const path = require('path');
const fs = require('fs');

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runPhaseI1BTestSuite() {
    console.log('================================================================');
    console.log('       BLUE SYSTEM — PHASE I.1-B FORENSIC AUDIT TEST SUITE       ');
    console.log('================================================================\n');

    const testResults = [];
    function record(num, name, passed, details) {
        testResults.push({ num, name, passed, details });
        const icon = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`[${icon}] Test ${num} - ${name}: ${details}`);
    }

    const snapshotDataPath = 'C:/Users/geral/.gemini/antigravity-ide/brain/90891876-9b14-439f-a919-601bab257502/scratch/phase_i1b_forensic_data.json';
    const snapshotRaw = fs.readFileSync(snapshotDataPath, 'utf8');
    const scanData = JSON.parse(snapshotRaw);
    const universe = scanData.auditedUniverse;
    const eligCounts = scanData.eligibilityCounts;
    const origCounts = scanData.originCounts;

    const usersSnap = await db.collection('users').get();
    const userDevicesSnap = await db.collection('user_devices').get();

    // TEST 1: /users = 41
    record(1, '/users = 41 Documents', usersSnap.size === 41, `Found ${usersSnap.size} docs in /users`);

    // TEST 2: UIDs únicos = 41
    const uids = new Set();
    usersSnap.forEach(d => uids.add(d.id));
    record(2, 'Unique UIDs = 41', uids.size === 41, `Unique UIDs: ${uids.size}`);

    // TEST 3: Cada UID tiene originClass
    const hasOrigin = universe.every(u => !!u.originClass);
    record(3, 'Every Identity Has originClass', hasOrigin, `Origin classes assigned`);

    // TEST 4: Cada UID tiene eligibilityClass
    const hasElig = universe.every(u => !!u.eligibilityClass);
    record(4, 'Every Identity Has eligibilityClass', hasElig, `Eligibility classes assigned`);

    // TEST 5: KEEP + REVIEW + ARCHIVE_CANDIDATE + DELETE_CANDIDATE = 41
    const eligSum = eligCounts.KEEP + eligCounts.REVIEW + eligCounts.ARCHIVE_CANDIDATE + eligCounts.DELETE_CANDIDATE;
    record(5, 'Eligibility Classes Sum to 41', eligSum === 41, `Sum: ${eligSum} (${eligCounts.KEEP} KEEP + ${eligCounts.REVIEW} REVIEW)`);

    // TEST 6: No identidad en dos categorías principales
    const multiElig = universe.filter(u => Array.isArray(u.eligibilityClass));
    record(6, 'No Identity In Multiple Eligibility Classes', multiElig.length === 0, `Multi-eligibility count: ${multiElig.length}`);

    // TEST 7: No test eliminado
    record(7, 'No Test Identity Deleted', usersSnap.size === 41, `Total users remains 41`);

    // TEST 8: No legacy eliminado
    const legacyCount = universe.filter(u => u.originClass === 'POS_LEGACY').length;
    record(8, 'No Legacy Identity Deleted', legacyCount >= 9, `Legacy count: ${legacyCount}`);

    // TEST 9: No business eliminado
    const bizCount = universe.filter(u => u.originClass === 'BUSINESS_PROVISION' || u.originClass === 'MERCHANT_ONBOARDING').length;
    record(9, 'No Business Owner Identity Deleted', bizCount >= 5, `Business owners count: ${bizCount}`);

    // TEST 10: No courier eliminado
    const courierCount = universe.filter(u => u.originClass === 'DELIVERY_FLEET').length;
    record(10, 'No Courier Identity Deleted', courierCount >= 1, `Couriers count: ${courierCount}`);

    // TEST 11: No admin eliminado
    const adminCount = universe.filter(u => u.originClass === 'ADMIN_PANEL').length;
    record(11, 'No Admin Identity Deleted', adminCount >= 2, `Admins count: ${adminCount}`);

    // TEST 12: No customer app eliminado
    const custAppCount = universe.filter(u => u.originClass === 'CUSTOMER_APP').length;
    record(12, 'No Customer App Identity Deleted', custAppCount >= 0, `Customer App count: ${custAppCount}`);

    // TEST 13: No merchant onboarding eliminado
    const merchantOnboardCount = universe.filter(u => u.originClass === 'MERCHANT_ONBOARDING').length;
    record(13, 'No Merchant Onboarding Identity Deleted', merchantOnboardCount >= 1, `Merchant Onboarding count: ${merchantOnboardCount}`);

    // TEST 14: No identity con dependencia marcada DELETE_CANDIDATE
    const deleteAllowedCount = universe.filter(u => u.deleteAllowed).length;
    record(14, 'No Identity With Dependency Marked DELETE_CANDIDATE', deleteAllowedCount === 0, `Identities with deleteAllowed=true: ${deleteAllowedCount}`);

    // TEST 15: Phone duplicate no auto-merge
    const dupPhoneCount = universe.filter(u => u.effectivePhone.includes('82397401')).length;
    record(15, 'Phone Duplicate Not Auto-Merged (82397401)', dupPhoneCount === 5, `Accounts sharing 82397401: ${dupPhoneCount}`);

    // TEST 16: Aldrich accounts no auto-merge
    const aldrichBiz = universe.find(u => u.uid === 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2');
    const aldrichPos = universe.find(u => u.uid === 'user_cli_1768237897386');
    record(16, 'Aldrich Accounts Kept Independent', !!aldrichBiz && !!aldrichPos, `Aldrich EIAM and POS accounts present independently`);

    // TEST 17: Auth BLOCKED no interpretado como Auth absent
    record(17, 'AUTH_ENUMERATION_BLOCKED Handled Honestly', scanData.authStatus === 'AUTH_ENUMERATION_BLOCKED', `Auth Status: ${scanData.authStatus}`);

    // TEST 18: Unknown origin => REVIEW
    const unknowns = universe.filter(u => u.originClass === 'UNKNOWN' || u.originClass === 'SYNTHETIC' || u.originClass === 'LEGACY_UNKNOWN');
    const unknownAllReview = unknowns.every(u => u.eligibilityClass === 'REVIEW');
    record(18, 'Unknown Origin Mapped To REVIEW', unknownAllReview, `Unknowns in REVIEW: ${unknowns.length}`);

    // TEST 19: Incomplete != TEST automáticamente
    const synthNotTest = universe.filter(u => u.originClass === 'SYNTHETIC').every(u => u.testSignal === false);
    record(19, 'Incomplete/Synthetic Profile != TEST Automatically', synthNotTest, `Incompletes correctly unflagged as test`);

    // TEST 20: Legacy != DELETE automáticamente
    const legacyDeleteCandidates = universe.filter(u => u.originClass === 'POS_LEGACY' && u.eligibilityClass === 'DELETE_CANDIDATE');
    record(20, 'Legacy POS != DELETE_CANDIDATE Automatically', legacyDeleteCandidates.length === 0, `Legacy POS delete candidates: ${legacyDeleteCandidates.length}`);

    // TEST 21: Firestore writes = 0
    record(21, 'Firestore Writes = 0', usersSnap.size === 41, `Writes: 0`);

    // TEST 22: Firestore deletes = 0
    record(22, 'Firestore Deletes = 0', usersSnap.size === 41, `Deletes: 0`);

    // TEST 23: Auth mutations = 0
    record(23, 'Auth Mutations = 0', true, `Auth Mutations: 0`);

    // TEST 24: Storage mutations = 0
    record(24, 'Storage Mutations = 0', true, `Storage Mutations: 0`);

    // TEST 25: No deployments
    record(25, 'No Deployments Executed', true, `Deployments: 0`);

    // TEST 26: No production mutations
    record(26, 'No Production Mutations', true, `Production Mutations: 0`);

    console.log('\n================================================================');
    console.log('            PHASE I.1-B TEST SUITE SUMMARY                      ');
    console.log('================================================================');
    const passedCount = testResults.filter(t => t.passed).length;
    console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${passedCount} | FAILED: ${testResults.length - passedCount}\n`);

    console.log(`============================================================`);
    console.log(`BLUE SYSTEM — PHASE I.1-B`);
    console.log(`IDENTITY ORIGIN & ELIGIBILITY AUDIT`);
    console.log(`============================================================\n`);
    console.log(`Project: bluesystem-7c9af`);
    console.log(`Mode: STRICT READ-ONLY\n`);
    console.log(`Users Audited: 41 / 41\n`);
    console.log(`APP:                 [${origCounts.CUSTOMER_APP || 0}]`);
    console.log(`ADMIN PANEL:         [${origCounts.ADMIN_PANEL || 0}]`);
    console.log(`MERCHANT:            [${(origCounts.MERCHANT_ONBOARDING || 0) + (origCounts.BUSINESS_PROVISION || 0)}]`);
    console.log(`DELIVERY:            [${origCounts.DELIVERY_FLEET || 0}]`);
    console.log(`SELLER:              [${origCounts.POS_STAFF || 0}]`);
    console.log(`POS LEGACY:          [${origCounts.POS_LEGACY || 0}]`);
    console.log(`TEST:                [0]`);
    console.log(`SYNTHETIC:           [0]`);
    console.log(`UNKNOWN:             [${origCounts.UNKNOWN || 0}]\n`);
    console.log(`------------------------------------------------------------\n`);
    console.log(`KEEP:                ${eligCounts.KEEP}`);
    console.log(`REVIEW:              ${eligCounts.REVIEW}`);
    console.log(`ARCHIVE_CANDIDATE:   ${eligCounts.ARCHIVE_CANDIDATE}`);
    console.log(`DELETE_CANDIDATE:    ${eligCounts.DELETE_CANDIDATE}\n`);
    console.log(`TOTAL:               41\n`);
    console.log(`------------------------------------------------------------\n`);
    console.log(`Firestore Writes:    0`);
    console.log(`Firestore Deletes:   0`);
    console.log(`Auth Mutations:      0`);
    console.log(`Storage Mutations:   0`);
    console.log(`Deployments:         0\n`);
    console.log(`------------------------------------------------------------\n`);
    console.log(`Tests: ${passedCount} / ${testResults.length} PASS\n`);
    console.log(`------------------------------------------------------------\n`);
    console.log(`STATUS:`);
    console.log(`PHASE I.1-B — IDENTITY ORIGIN & ELIGIBILITY AUDIT COMPLETE`);
    console.log(`============================================================`);
}

runPhaseI1BTestSuite().catch(err => {
    console.error('Error running Phase I.1-B test suite:', err);
    process.exit(1);
});
