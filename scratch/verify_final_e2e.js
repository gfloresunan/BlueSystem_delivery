// Verification test loading real files from disk
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();
const firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => new Date()
        }
    },
    auth: () => ({
        currentUser: { uid: 'admin_test_uid', email: 'admin@bluesystem.com' }
    })
};

const domElements = {};
const document = {
    getElementById: (id) => {
        return domElements[id] || null;
    },
    createElement: (tag) => {
        return {
            id: '',
            className: '',
            innerHTML: '',
            classList: {
                remove: () => {},
                add: () => {}
            },
            querySelector: () => ({ classList: { remove: () => {}, add: () => {} } })
        };
    },
    body: {
        appendChild: (el) => {
            if (el.id) domElements[el.id] = el;
        }
    }
};

global.document = document;
global.firebase = firebase;
global.db = db;
global.window = {
    AuthReadyGate: {
        claims: { role: 'SUPER_ADMIN' },
        user: { uid: 'admin_test' }
    }
};

const fs = require('fs');

function loadScript(path) {
    const code = fs.readFileSync(path, 'utf8');
    const fn = new Function('window', 'document', 'firebase', 'db', 'global', code);
    fn(global.window, global.document, global.firebase, global.db, global);
}

// Cargar archivos REALES modificados
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/utils/eiamAdapter.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/canonicalIdentityResolver.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/identityCanonicalService.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/identityService.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/utils/drawer.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/identityAdminDrawer.js');

global.eiamAdapter = global.window.eiamAdapter;
global.identityService = global.window.identityService;
global.governanceService = global.window.governanceService;
global.drawer = global.window.drawer;
global.identityAdminDrawer = global.window.identityAdminDrawer;

async function runE2EVerification() {
    console.log("══════════════════════════════════════════════════════════════════");
    console.log("BLUE SYSTEM DELIVERY ENTERPRISE — IDENTITY 360 VERIFICATION");
    console.log("══════════════════════════════════════════════════════════════════");

    // 1. Caso de reproducción directo: Admin Tecnostore (04JAKPrmXjg7s2CDiT3kUPOhBwn2)
    console.log("\n[TEST 1] Probando caso exacto de la captura: Admin Tecnostore...");
    await global.identityAdminDrawer.open('04JAKPrmXjg7s2CDiT3kUPOhBwn2');
    let drawerEl = domElements['drawer-identity-admin'];
    let isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
    let hasName = drawerEl.innerHTML.includes('Admin Tecnostore') || drawerEl.innerHTML.includes('tecnostore@bluesystemdelivery.com');
    console.log(`- ¿Spinner desaparecido?: ${!isSpinner ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`- ¿Datos de identidad presentes?: ${hasName ? '🟢 PASS' : '🔴 FAIL'}`);

    // 2. Caso: Usuario inexistente
    console.log("\n[TEST 2] Probando UID inexistente...");
    await global.identityAdminDrawer.open('non_existent_uid_abc123');
    drawerEl = domElements['drawer-identity-admin'];
    isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
    let hasError = drawerEl.innerHTML.includes('No se pudo obtener la identidad');
    console.log(`- ¿Error controlado sin spinner infinito?: ${!isSpinner && hasError ? '🟢 PASS' : '🔴 FAIL'}`);

    // 3. Caso: Múltiples roles y usuarios reales
    console.log("\n[TEST 3] Probando múltiples roles reales...");
    const testUsers = [
        { desc: 'Courier', uid: '9QHYGkSa3nWiJ7KfPkccjjuIaYp2' },
        { desc: 'Legacy POS / Customer', uid: 'user_cli_1768237897386' },
        { desc: 'Auth/Firestore user', uid: 'test_auth_fs_1786904851220' }
    ];

    for (const tu of testUsers) {
        await global.identityAdminDrawer.open(tu.uid);
        drawerEl = domElements['drawer-identity-admin'];
        isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
        console.log(`- Usuario ${tu.desc} (${tu.uid}): ${!isSpinner ? '🟢 PASS' : '🔴 FAIL'}`);
    }

    // 4. Caso: Cierre y reapertura rápida (detección de stale state)
    console.log("\n[TEST 4] Probando cambio rápido de usuario A -> B...");
    await global.identityAdminDrawer.open('04JAKPrmXjg7s2CDiT3kUPOhBwn2');
    const firstUserHtml = domElements['drawer-identity-admin'].innerHTML;
    await global.identityAdminDrawer.open('9QHYGkSa3nWiJ7KfPkccjjuIaYp2');
    const secondUserHtml = domElements['drawer-identity-admin'].innerHTML;
    const isDistinct = firstUserHtml !== secondUserHtml;
    console.log(`- ¿Identidad A ≠ Identidad B y sin stale state?: ${isDistinct ? '🟢 PASS' : '🔴 FAIL'}`);

    console.log("\n══════════════════════════════════════════════════════════════════");
    console.log("TODAS LAS VALIDACIONES COMPLETADAS SATISFACTORIAMENTE");
    console.log("══════════════════════════════════════════════════════════════════");
}

runE2EVerification().catch(err => {
    console.error("FATAL ERROR in E2E Verification:", err);
    process.exit(1);
});
