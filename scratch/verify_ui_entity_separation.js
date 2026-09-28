const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function verifyUiEntitySeparation() {
    console.log('================================================================================');
    console.log('  VERIFICACIÓN DE SEPARACIÓN SEMÁNTICA DE ENTIDADES (4 CONCEPTOS EIAM)          ');
    console.log('================================================================================\n');

    let passed = 0;
    let failed = 0;

    function assertTest(condition, name) {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name}`);
            failed++;
        }
    }

    // 1. Concepto 1: Usuario / Identidad (Firebase Auth + /users)
    const userDoc = await db.collection('users').doc('XWNzPT5p6fbf7reFdFBNTZoQrY42').get();
    assertTest(userDoc.exists, 'Concepto 1 (Usuario): Documento /users/XWNzPT5p... representa a la PERSONA (Junior Flores)');

    // 2. Concepto 2: Membresía (/membership)
    const memSnap = await db.collection('membership').where('uid', '==', 'XWNzPT5p6fbf7reFdFBNTZoQrY42').get();
    assertTest(!memSnap.empty && memSnap.docs[0].data().status === 'ACTIVE', 'Concepto 2 (Membresía): /membership representa la RELACIÓN LABORAL/PROPIEDAD (MERCHANT_OWNER - ACTIVE)');

    // 3. Concepto 3: Comercio Canónico (/businesses/{uuid})
    const canonicalBizDoc = await db.collection('businesses').doc('e7dc911e-e587-4be9-a741-7d9d9828011f').get();
    assertTest(canonicalBizDoc.exists && canonicalBizDoc.data().status === 'ACTIVE', 'Concepto 3 (Comercio Canónico): /businesses/e7dc911e... representa la EMPRESA ACTIVA (Variedades TECNOHOME)');

    // 4. Concepto 4: Comercio Legacy Remanente (/businesses/{uid})
    const legacyBizDoc = await db.collection('businesses').doc('XWNzPT5p6fbf7reFdFBNTZoQrY42').get();
    assertTest(legacyBizDoc.exists && legacyBizDoc.data().lifecycleStatus === 'DEPROVISIONED', 'Concepto 4 (Legacy Business): /businesses/XWNzPT5p... representa el REGISTRO HISTÓRICO PURGADO (DEPROVISIONED)');

    console.log('\n================================================================================');
    console.log(`  RESULTADOS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) process.exit(1);
}

verifyUiEntitySeparation().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
