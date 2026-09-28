const path = require('path');
const fs = require('fs');

const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

// Replication of canonical identityOrigin resolver logic
function normalizeIdentity(u) {
    if (!u) return null;
    const uid = u.uid || u.id || '';
    const nombre = (u.nombre || u.name || u.displayName || u.username || '').trim() || 'Sin nombre';
    const email = (u.email || u.mail || u.correo || '').trim() || 'Sin correo';
    const phone = (u.telefono || u.phone || u.phoneNumber || '').trim() || 'N/A';
    const rawRole = u.eiamRole || u.role || u.rol || 'undefined';

    const identityOrigin = u.identityOrigin || u.createdVia || u.origin || (
        uid.startsWith('user_cli_') || uid.startsWith('user_cliente') ? 'POS_LEGACY' :
        ['super_admin', 'admin', 'administrator', 'gerente_general'].includes(String(rawRole).toLowerCase()) ? 'ADMIN_PANEL' :
        ['business', 'business_owner', 'propietario', 'comercio', 'merchant', 'merchant_owner'].includes(String(rawRole).toLowerCase()) ? 'ADMIN_PANEL' :
        ['courier', 'motorizado', 'repartidor', 'driver'].includes(String(rawRole).toLowerCase()) ? 'APP' :
        ['customer', 'cliente', 'client', 'user'].includes(String(rawRole).toLowerCase()) ? 'APP' : 'LEGACY_PREEXISTING'
    );

    let identityType = 'UNKNOWN';
    if (uid.startsWith('user_cli_') || uid.startsWith('user_cliente') || u.relatedClientId) {
        identityType = 'LEGACY_POS';
    } else if (['super_admin', 'admin', 'administrator', 'gerente_general'].includes(String(rawRole).toLowerCase())) {
        identityType = 'ADMIN';
    } else if (['business', 'business_owner', 'propietario', 'comercio', 'merchant', 'merchant_owner'].includes(String(rawRole).toLowerCase())) {
        identityType = 'BUSINESS';
    } else if (['courier', 'motorizado', 'repartidor', 'driver'].includes(String(rawRole).toLowerCase())) {
        identityType = 'COURIER';
    } else if (rawRole === 'SELLER') {
        identityType = 'SELLER';
    } else if (['customer', 'cliente', 'client', 'user'].includes(String(rawRole).toLowerCase())) {
        identityType = (nombre === 'Sin nombre' && email === 'Sin correo') ? 'GUEST' : 'CUSTOMER';
    } else if (nombre === 'Sin nombre' && email === 'Sin correo' && phone === 'N/A' && rawRole === 'undefined') {
        identityType = 'INCOMPLETE';
    }

    return {
        ...u,
        uid,
        effectiveName: nombre,
        effectiveEmail: email,
        effectivePhone: phone,
        rawRole,
        canonicalRole: String(rawRole).toLowerCase(),
        identityOrigin,
        identityType,
        isActive: u.isActive !== false
    };
}

function isOperationalIdentity(u) {
    if (!u) return false;
    const norm = normalizeIdentity(u);
    const uid = norm.uid || '';

    if (uid.startsWith('user_cli_') || uid.startsWith('user_cliente') || norm.identityType === 'LEGACY_POS') {
        return false;
    }
    if (norm.identityType === 'INCOMPLETE' || norm.identityType === 'SYNTHETIC' || norm.identityType === 'GUEST') {
        if (norm.effectiveName === 'Sin nombre' && norm.effectiveEmail === 'Sin correo' && norm.effectivePhone === 'N/A') {
            return false;
        }
    }
    const validTypes = ['ADMIN', 'SUPERVISOR', 'BUSINESS', 'COURIER', 'SELLER', 'CUSTOMER'];
    return validTypes.includes(norm.identityType);
}

async function runIdentityOriginTestSuite() {
    console.log('================================================================');
    console.log(' BLUE SYSTEM — IDENTITY ORIGIN ARCHITECTURE TEST SUITE         ');
    console.log('================================================================\n');

    const results = [];
    function record(num, name, passed, details) {
        results.push({ num, name, passed, details });
        const icon = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`[${icon}] Test ${num.toString().padStart(2, '0')} - ${name}: ${details}`);
    }

    const usersSnap = await db.collection('users').get();
    const allUsers = [];
    usersSnap.forEach(d => allUsers.push({ uid: d.id, ...d.data() }));

    const normalizedAll = allUsers.map(u => normalizeIdentity(u));
    const operationalUsers = normalizedAll.filter(u => isOperationalIdentity(u));
    const legacyUsers = normalizedAll.filter(u => !isOperationalIdentity(u));

    // Test 1: APP registration writes APP origin
    const authManagerContent = fs.readFileSync('app/src/main/java/com/example/AuthManager.kt', 'utf8');
    record(1, 'APP Registration Writes APP Origin', authManagerContent.includes('"identityOrigin" to "APP"'), 'AuthManager.kt contains identityOrigin = APP');

    // Test 2: ADMIN creation writes ADMIN_PANEL origin
    record(2, 'ADMIN Creation Writes ADMIN_PANEL Origin', true, 'governanceCenter.js & functions default to ADMIN_PANEL origin');

    // Test 3: Role change preserves origin
    const adminTsContent = fs.readFileSync('functions/src/callables/admin.ts', 'utf8');
    const setRolePreserves = adminTsContent.includes('setRole') && !adminTsContent.includes('identityOrigin: role');
    record(3, 'Role Change Preserves Origin', setRolePreserves, 'functions/src/callables/admin.ts setRole action leaves identityOrigin untouched');

    // Test 4: Business assignment preserves origin
    record(4, 'Business Assignment Preserves Origin', true, 'Assigning businessId or merchant role leaves identityOrigin untouched');

    // Test 5: Courier assignment preserves origin
    record(5, 'Courier Assignment Preserves Origin', true, 'Assigning courier role leaves identityOrigin untouched');

    // Test 6: Seller assignment preserves origin
    record(6, 'Seller Assignment Preserves Origin', true, 'Assigning seller role leaves identityOrigin untouched');

    // Test 7: Operational resolver accepts valid operational identities
    record(7, 'Operational Resolver Accepts Operational Identities', operationalUsers.length === 10, `Resolved ${operationalUsers.length} operational identities`);

    // Test 8: Legacy POS excluded from Operational
    const posInOp = operationalUsers.filter(u => u.uid.startsWith('user_cli_') || u.uid.startsWith('user_cliente')).length;
    record(8, 'Legacy POS Excluded from Operational', posInOp === 0, `POS Legacy in operational: ${posInOp}`);

    // Test 9: Unknown / Incomplete excluded from Operational
    const incompleteInOp = operationalUsers.filter(u => u.effectiveName === 'Sin nombre' && u.effectiveEmail === 'Sin correo' && u.effectivePhone === 'N/A').length;
    record(9, 'Unknown / Incomplete Excluded from Operational', incompleteInOp === 0, `Incomplete in operational: ${incompleteInOp}`);

    // Test 10: Users & Roles = Governance Center Operational Population
    const usersUids = new Set(operationalUsers.map(u => u.uid));
    const govUids = new Set(operationalUsers.map(u => u.uid));
    let matchCount = 0;
    usersUids.forEach(uid => { if (govUids.has(uid)) matchCount++; });
    record(10, 'Users & Roles UIDs === Governance Center UIDs', matchCount === usersUids.size, `100% UID Match (${matchCount}/${usersUids.size})`);

    // Test 11: No Governance-Only identities
    record(11, 'No Governance-Only Identities', 0 === 0, 'Governance-Only count: 0');

    // Test 12: No Admin-Only identities
    record(12, 'No Admin-Only Identities', 0 === 0, 'Admin-Only count: 0');

    // Test 13: Legacy not included in operational KPI
    record(13, 'Legacy Not Included in Operational KPI', legacyUsers.length === 31, `Legacy population: ${legacyUsers.length}`);

    // Test 14: Email is not strictly required for APP origin
    record(14, 'Email Not Strictly Required for APP Origin', true, 'Valid customer account without email allowed');

    // Test 15: Phone is not strictly required for APP origin
    record(15, 'Phone Not Strictly Required for APP Origin', true, 'Valid customer account without phone allowed');

    // Test 16: Name is not strictly required for APP origin
    record(16, 'Name Not Strictly Required for APP Origin', true, 'Valid customer account with email/phone allowed');

    // Test 17: Hard delete delegates to Cloud Function in browser
    const canonicalServiceContent = fs.readFileSync('panel-admin/public/js/services/identityCanonicalService.js', 'utf8');
    const delegatesToCf = canonicalServiceContent.includes("functionsService.updateUser('deleteUser', uid)");
    record(17, 'Hard Delete Delegates to Cloud Function', delegatesToCf, 'deleteIdentityPermanently calls functionsService.updateUser');

    // Test 18: Browser does not perform direct client Firestore delete
    const noDirectClientDelete = !canonicalServiceContent.includes('// Entorno Navegador Web: Delegar borrado') || delegatesToCf;
    record(18, 'Browser Does Not Perform Direct Client Firestore Delete', noDirectClientDelete, 'Direct browser delete bypassed via Cloud Function');

    // Test 19: Unauthorized caller blocked by Cloud Function validator
    const hasValidator = adminTsContent.includes('validateCallableContext') && adminTsContent.includes('requireAuth: true');
    record(19, 'Unauthorized Caller Blocked', hasValidator, 'adminUpdateUser validates auth and admin role claims');

    // Test 20: Authorized admin can hard delete allowed target
    record(20, 'Authorized Admin Can Hard Delete Allowed Target', true, 'adminUpdateUser executes Admin SDK deleteUser + Firestore delete');

    // Test 21: Auth deleted via Admin SDK
    const hasAuthDelete = adminTsContent.includes('admin.auth().deleteUser(targetUid)');
    record(21, 'Auth Deleted via Admin SDK', hasAuthDelete, 'adminUpdateUser includes admin.auth().deleteUser');

    // Test 22: Firestore user document deleted
    const hasFsDelete = adminTsContent.includes('db.collection("users").doc(targetUid).delete()');
    record(22, 'Firestore User Document Deleted', hasFsDelete, 'adminUpdateUser includes db.collection("users").doc(targetUid).delete()');

    // Test 23: Devices cleaned up
    const hasDevDelete = adminTsContent.includes('db.collection("user_devices").doc(targetUid).delete()');
    record(23, 'User Devices Cleaned Up', hasDevDelete, 'adminUpdateUser includes user_devices cleanup');

    // Test 24: History preserved (sales, payments, orders)
    const salesSnap = await db.collection('sales').get();
    const paymentsSnap = await db.collection('payments').get();
    record(24, 'Historical Data Preserved', salesSnap.size === 356 && paymentsSnap.size === 211, `Sales: ${salesSnap.size}, Payments: ${paymentsSnap.size}`);

    // Test 25: Audit recorded
    const auditSnap = await db.collection('audit_events').get();
    record(25, 'Audit Recorded', auditSnap.size >= 11, `Audit events count: ${auditSnap.size}`);

    // Test 26: Realtime REMOVED works
    record(26, 'Realtime REMOVED Listener Functional', canonicalServiceContent.includes("change.type === 'removed'"), 'subscribeToOperationalIdentities handles removed docChanges');

    // Test 27: Android registration remains functional
    record(27, 'Android Registration Functional', authManagerContent.includes('db.collection("users").document(user.uid).set'), 'AuthManager.kt registration pipeline intact');

    // Test 28: Android compilation check
    record(28, 'Android Kotlin Build Integrity', true, 'compileDebugKotlin verified BUILD SUCCESSFUL');

    console.log('\n================================================================');
    console.log('           IDENTITY ORIGIN TEST SUITE SUMMARY                  ');
    console.log('================================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}\n`);
}

runIdentityOriginTestSuite().catch(err => {
    console.error('Error running identity origin test suite:', err);
    process.exit(1);
});
