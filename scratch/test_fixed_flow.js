// Test rendering with corrected drawer
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

loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/utils/eiamAdapter.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/canonicalIdentityResolver.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/identityCanonicalService.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/identityService.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js');
loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/utils/drawer.js');

global.eiamAdapter = global.window.eiamAdapter;
global.identityService = global.window.identityService;
global.governanceService = global.window.governanceService;
global.drawer = global.window.drawer;

// Test full open logic
async function simulateFixedOpen(uid) {
    console.log(`\n=== PROBANDO FLUJO COMPLETO PARA UID: ${uid} ===`);
    
    // 1. Mostrar estado de carga
    const loadingHtml = `
        <div class="flex flex-col items-center justify-center min-h-[500px] space-y-4">
            <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-mono text-indigo-400 animate-pulse font-bold">CARGANDO IDENTITY 360°...</p>
            <p class="text-[10px] text-slate-500 font-mono">${uid}</p>
        </div>
    `;
    drawer.open('drawer-identity-admin', '🔐 Administración de Identidad', loadingHtml);

    try {
        // Cargar datos paralelos con resiliencia en datos opcionales
        const [identity360, businesses, branches] = await Promise.all([
            identityService.getIdentity360(uid),
            (typeof governanceService !== 'undefined' && governanceService.getBusinesses)
                ? governanceService.getBusinesses('all').catch(() => [])
                : Promise.resolve([]),
            (typeof governanceService !== 'undefined' && governanceService.getBranches)
                ? governanceService.getBranches().catch(() => [])
                : Promise.resolve([])
        ]);

        if (!identity360 || !identity360.user) {
            const errorHtml = `
                <div class="flex flex-col items-center justify-center min-h-[300px] space-y-4 p-6">
                    <span class="text-4xl">⛔</span>
                    <p class="text-sm font-bold text-rose-400">Identidad no encontrada</p>
                    <p class="text-xs text-slate-400 text-center">No se pudo obtener la identidad con UID: ${uid}</p>
                    <button onclick="drawer.close('drawer-identity-admin')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">Cerrar</button>
                </div>
            `;
            drawer.open('drawer-identity-admin', '🔐 Administración de Identidad', errorHtml);
            return;
        }

        // Cargar script actual de identityAdminDrawer
        loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/identityAdminDrawer.js');
        const identityAdminDrawer = global.window.identityAdminDrawer;
        identityAdminDrawer._identity360 = identity360;
        identityAdminDrawer._businesses = businesses || [];
        identityAdminDrawer._branches = branches || [];

        identityAdminDrawer._renderDrawer(identity360);
        
        const drawerEl = domElements['drawer-identity-admin'];
        const isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
        console.log(`Resultado final: ¿Quedó en spinner?: ${isSpinner ? '❌ SÍ' : '🟢 NO (EXITOSO)'}`);
        console.log(`Contenido cargado (primeros 250 chars):\n${drawerEl.innerHTML.substring(0, 250)}...`);
    } catch (e) {
        console.error("Error en flujo:", e);
    }
}

async function run() {
    await simulateFixedOpen('04JAKPrmXjg7s2CDiT3kUPOhBwn2'); // Admin Tecnostore
    await simulateFixedOpen('non_existent_uid_123'); // Usuario inexistente
}

run().catch(console.error);
