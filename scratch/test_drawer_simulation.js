// Simular entorno browser completo y diagnosticar cada paso
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
        const found = domElements[id] || null;
        console.log(`[DOM getElementById] lookup "${id}": ${found ? 'FOUND' : 'NULL'}`);
        return found;
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

async function testDrawerOpen(uid) {
    console.log(`\n================ TEST DRAWER OPEN for UID: ${uid} ================`);
    
    // Llamar open
    await global.identityAdminDrawer.open(uid);
    
    const drawerEl = domElements['drawer-identity-admin'];
    const isSpinner = drawerEl && drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
    console.log(`¿Quedó en spinner?: ${isSpinner ? '❌ SÍ (LOADING INFINITO)' : '🟢 NO (CARGÓ CONTENIDO)'}`);
}

async function run() {
    await testDrawerOpen('04JAKPrmXjg7s2CDiT3kUPOhBwn2'); // Admin Tecnostore
}

run().catch(console.error);
