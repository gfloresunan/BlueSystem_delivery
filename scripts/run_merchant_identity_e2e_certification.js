const { execSync } = require('child_process');
const path = require('path');

const token = execSync('gcloud auth print-access-token').toString().trim();
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function getAuthUserRest(uid) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ localId: [uid] })
    });
    const data = await res.json();
    return data.users ? data.users[0] : null;
}

async function getAuthUserByEmailRest(email) {
    const res = await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:lookup', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-goog-user-project': 'bluesystem-7c9af'
        },
        body: JSON.stringify({ email: [email] })
    });
    const data = await res.json();
    return data.users ? data.users[0] : null;
}

async function runMasterCertification() {
    console.log("============================================================");
    console.log("BLUE SYSTEM DELIVERY");
    console.log("MERCHANT IDENTITY INTEGRITY CERTIFICATION");
    console.log("============================================================\n");

    let allTestsPassed = true;
    const testResults = [];

    function recordTest(name, passed, details = "") {
        testResults.push({ name, passed, details });
        console.log(`[${passed ? '🟢 PASS' : '🔴 FAIL'}] ${name} ${details ? '— ' + details : ''}`);
        if (!passed) allTestsPassed = false;
    }

    // ── SECTION 1: VERIFICACIÓN ESPECÍFICA TECNOSTORE ─────────────────────────
    console.log("--- SECCIÓN 1: AUDITORÍA FORENSE TECNOSTORE ---");
    const tecnoOwnerUid = "04JAKPrmXjg7s2CDiT3kUPOhBwn2";
    const tecnoBizId = "biz_canonical_tecnostore";

    const [tecnoAuth, tecnoUserSnap, tecnoBizSnap, tecnoMemSnap] = await Promise.all([
        getAuthUserRest(tecnoOwnerUid),
        db.collection("users").doc(tecnoOwnerUid).get(),
        db.collection("businesses").doc(tecnoBizId).get(),
        db.collection("membership").where("businessId", "==", tecnoBizId).get()
    ]);

    const tecnoUser = tecnoUserSnap.data();
    const tecnoBiz = tecnoBizSnap.data();

    // Invariant Check 1: Auth user exists
    recordTest("INVARIANT 1: ACTIVE merchant -> Auth user exists", Boolean(tecnoAuth), `UID: ${tecnoOwnerUid}`);

    // Invariant Check 2: Auth disabled == false
    recordTest("INVARIANT 2: ACTIVE merchant -> Auth disabled == false", tecnoAuth?.disabled === false, `disabled=${tecnoAuth?.disabled}`);

    // Invariant Check 3: Valid EIAM Claims
    let claims = {};
    try { claims = JSON.parse(tecnoAuth?.customAttributes || "{}"); } catch (e) {}
    recordTest("INVARIANT 3: ACTIVE merchant -> valid EIAM claims", claims.role === "OWNER", `Role: ${claims.role}`);

    // Invariant Check 4: claims.businessId == business.id
    recordTest("INVARIANT 4: claims.businessId == business.id", claims.businessId === tecnoBizId, `claims.bizId=${claims.businessId}`);

    // Invariant Check 5: claims.tenantId == business.tenantId
    recordTest("INVARIANT 5: claims.tenantId == business.tenantId", claims.tenantId === tecnoBiz?.tenantId, `tenantId=${claims.tenantId}`);

    // Invariant Check 6: Firestore /users status == ACTIVE && isActive == true
    recordTest("INVARIANT 6: Firestore /users status == ACTIVE", tecnoUser?.status === "ACTIVE" && tecnoUser?.isActive === true, `status=${tecnoUser?.status}, isActive=${tecnoUser?.isActive}`);

    // Invariant Check 7: Firestore /businesses status == ACTIVE
    recordTest("INVARIANT 7: Firestore /businesses status == ACTIVE", tecnoBiz?.status === "ACTIVE" && tecnoBiz?.isActive === true, `status=${tecnoBiz?.status}, isActive=${tecnoBiz?.isActive}`);

    // ── SECTION 2: AUDITORÍA DE DERIVA (DRIFT) DE TODOS LOS COMERCIOS ─────────
    console.log("\n--- SECCIÓN 2: AUDITORÍA DE DERIVA DE COMERCIOS EXISTENTES ---");
    const allBizSnap = await db.collection("businesses").get();
    const driftReport = [];

    for (const bDoc of allBizSnap.docs) {
        const b = bDoc.data();
        const bId = bDoc.id;
        const bName = b.name || b.comercioNombre || 'Sin nombre';
        const isBizActive = (b.status === "ACTIVE" || b.lifecycleStatus === "ACTIVE") && b.isActive !== false;
        
        let ownerUid = b.ownerUid;
        if (!ownerUid) {
            const mSnap = await db.collection("membership").where("businessId", "==", bId).limit(1).get();
            if (!mSnap.empty) ownerUid = mSnap.docs[0].data().uid;
        }

        let authState = "NO_OWNER";
        let isConsistent = true;

        if (ownerUid) {
            const aUser = await getAuthUserRest(ownerUid);
            if (!aUser) {
                authState = "AUTH_NOT_FOUND";
                isConsistent = false;
            } else {
                const aDisabled = aUser.disabled === true;
                authState = aDisabled ? "AUTH_DISABLED" : "AUTH_ENABLED";
                
                // Invariante: si el negocio está activo, auth no debe estar deshabilitado
                if (isBizActive && aDisabled) {
                    isConsistent = false;
                }
                // Invariante: si el negocio está suspendido, auth debe estar deshabilitado
                if (!isBizActive && !aDisabled && b.status === "SUSPENDED") {
                    isConsistent = false;
                }
            }
        }

        driftReport.push({
            businessId: bId,
            name: bName,
            status: b.status || 'UNKNOWN',
            isActive: b.isActive !== false,
            ownerUid: ownerUid || 'N/A',
            authState,
            isConsistent
        });
    }

    console.log(`Total comercios analizados: ${driftReport.length}`);
    console.log(`Comercios consistentes: ${driftReport.filter(d => d.isConsistent).length}`);
    console.log(`Comercios con inconsistencia: ${driftReport.filter(d => !d.isConsistent).length}`);
    driftReport.forEach(d => {
        console.log(`- [${d.isConsistent ? '🟢 OK' : '🔴 DRIFT'}] ${d.name} (${d.businessId}): bizStatus=${d.status}, authState=${d.authState}`);
    });

    const hasDrift = driftReport.some(d => !d.isConsistent);
    recordTest("IDENTITY DRIFT AUDIT: Zero active businesses with disabled Auth", !hasDrift, `Drift count: ${driftReport.filter(d => !d.isConsistent).length}`);

    // ── SECTION 3: VEREDICTO FINAL ───────────────────────────────────────────
    console.log("\n============================================================");
    console.log(`FINAL RESULT: ${allTestsPassed ? '🟢 CERTIFIED' : '🔴 NOT CERTIFIED'}`);
    console.log("============================================================\n");

    if (!allTestsPassed) {
        process.exit(1);
    }
}

runMasterCertification().catch(err => {
    console.error("Master certification error:", err);
    process.exit(1);
});
