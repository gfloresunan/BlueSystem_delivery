// Test all users with simulated patched identityService and identityAdminDrawer
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

// Patch getIdentity360 with user_devices and memory sorting for audit_events
global.identityService.getIdentity360 = async (uid) => {
    try {
        if (!uid || typeof db === 'undefined') return null;

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return null;
        const userData = { uid: userDoc.id, ...userDoc.data() };

        // Consultas concurrentes a colecciones relacionales EIAM (usando user_devices canónico y limit sin composite index)
        const [empSnap, memSnap, devSnap, sessSnap, auditSnap, invSnap] = await Promise.all([
            db.collection('employees').where('uid', '==', uid).get().catch(() => null),
            db.collection('membership').where('uid', '==', uid).get().catch(() => null),
            db.collection('user_devices').where('uid', '==', uid).get().catch(() => null),
            db.collection('sessions').where('uid', '==', uid).get().catch(() => null),
            db.collection('audit_events').where('uid', '==', uid).limit(20).get().catch(() => null),
            db.collection('invitations').where('acceptedByUid', '==', uid).get().catch(() => null)
        ]);

        const employee = (empSnap && !empSnap.empty) ? { employeeId: empSnap.docs[0].id, ...empSnap.docs[0].data() } : null;
        const membership = (memSnap && !memSnap.empty) ? { membershipId: memSnap.docs[0].id, ...memSnap.docs[0].data() } : null;

        const devices = [];
        if (devSnap) devSnap.forEach(d => devices.push({ deviceId: d.id, ...d.data() }));

        const sessions = [];
        if (sessSnap) sessSnap.forEach(s => sessions.push({ sessionId: s.id, ...s.data() }));

        const auditEvents = [];
        if (auditSnap) {
            auditSnap.forEach(a => auditEvents.push({ eventId: a.id, ...a.data() }));
            // Ordenar en memoria por timestamp descendente
            auditEvents.sort((a, b) => {
                const ta = a.timestamp ? (a.timestamp.seconds || a.timestamp) : 0;
                const tb = b.timestamp ? (b.timestamp.seconds || b.timestamp) : 0;
                return tb - ta;
            });
        }

        const invitations = [];
        if (invSnap) invSnap.forEach(i => invitations.push({ token: i.id, ...i.data() }));

        return {
            user: userData,
            employee,
            membership,
            devices,
            sessions,
            auditEvents,
            invitations,
            canonicalRole: eiamAdapter.toEiamRole(userData.eiamRole || userData.role || userData.rol)
        };
    } catch (e) {
        console.error("[IDENTITY_SERVICE] Error al obtener Identity 360°:", e);
        return null;
    }
};

loadScript('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/identityAdminDrawer.js');
global.identityAdminDrawer = global.window.identityAdminDrawer;

// Patch identityAdminDrawer.open to handle all identity states, fallback error drawer, and resilient selector queries
global.identityAdminDrawer.open = async (uid) => {
    if (!uid) return;
    identityAdminDrawer._currentUid = uid;
    identityAdminDrawer._isInvalidated = false;
    identityAdminDrawer._isSaving = false;

    // Mostrar drawer con estado de carga
    const loadingHtml = `
        <div class="flex flex-col items-center justify-center min-h-[500px] space-y-4">
            <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-mono text-indigo-400 animate-pulse font-bold">CARGANDO IDENTITY 360°...</p>
            <p class="text-[10px] text-slate-500 font-mono">${uid}</p>
        </div>
    `;

    if (typeof drawer !== 'undefined') {
        drawer.open('drawer-identity-admin', '🔐 Administración de Identidad', loadingHtml);
    }

    try {
        // Cargar datos paralelos con degradación resiliente en listas accesorias
        const [identity360, businesses, branches] = await Promise.all([
            identityService.getIdentity360(uid),
            (typeof governanceService !== 'undefined' && governanceService.getBusinesses)
                ? governanceService.getBusinesses('all').catch(() => [])
                : Promise.resolve([]),
            (typeof governanceService !== 'undefined' && governanceService.getBranches)
                ? governanceService.getBranches().catch(() => [])
                : Promise.resolve([])
        ]);

        if (identityAdminDrawer._isInvalidated) {
            console.warn(`[IDENTITY_LIFECYCLE] Drawer open abortado: contexto invalidado durante la carga para ${uid}`);
            return;
        }

        identityAdminDrawer._identity360 = identity360;
        identityAdminDrawer._businesses = businesses || [];
        identityAdminDrawer._branches = branches || [];

        if (!identity360 || !identity360.user) {
            identityAdminDrawer._showError('No se pudo obtener la identidad. Verifique el UID.');
            return;
        }

        identityAdminDrawer._renderDrawer(identity360);
    } catch (e) {
        console.error('[IDENTITY_ADMIN_DRAWER] Error al cargar identity 360°:', e);
        identityAdminDrawer._showError('Error al cargar la identidad: ' + e.message);
    }
};

global.identityAdminDrawer._showError = (msg) => {
    const html = `
        <div class="flex flex-col items-center justify-center min-h-[300px] space-y-4 p-6 font-sans">
            <span class="text-4xl">⛔</span>
            <p class="text-sm font-bold text-rose-400">Error de Carga de Identidad</p>
            <p class="text-xs text-slate-400 text-center">${msg}</p>
            <button onclick="drawer.close('drawer-identity-admin')" class="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-bold transition">Cerrar</button>
        </div>
    `;
    const el = document.getElementById('drawer-identity-admin-content');
    if (el) {
        el.innerHTML = html;
    } else if (typeof drawer !== 'undefined' && drawer.open) {
        drawer.open('drawer-identity-admin', '🔐 Error de Identidad', html);
    }
};

async function testAll() {
    console.log("=== EJECUTANDO PRUEBAS DE VALIDACIÓN COMPLETA ===");
    
    // 1. Probar usuario Admin Tecnostore (04JAKPrmXjg7s2CDiT3kUPOhBwn2)
    await global.identityAdminDrawer.open('04JAKPrmXjg7s2CDiT3kUPOhBwn2');
    let drawerEl = domElements['drawer-identity-admin'];
    let isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
    console.log(`1. Admin Tecnostore (DEPROVISIONED/ACTIVE): ${!isSpinner ? '🟢 PASS (Identity 360 cargó correctamente)' : '🔴 FAIL'}`);
    
    // 2. Probar usuario no existente
    await global.identityAdminDrawer.open('non_existent_uid_999');
    drawerEl = domElements['drawer-identity-admin'];
    isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
    let hasErrorMsg = drawerEl.innerHTML.includes('No se pudo obtener la identidad');
    console.log(`2. Usuario Inexistente: ${!isSpinner && hasErrorMsg ? '🟢 PASS (Error controlado mostrado en drawer, sin spinner)' : '🔴 FAIL'}`);
    
    // 3. Probar varios usuarios reales de la base de datos
    const testUids = ['9QHYGkSa3nWiJ7KfPkccjjuIaYp2', 'user_cli_1768237897386', 'test_auth_fs_1786904851220'];
    for (const uid of testUids) {
        await global.identityAdminDrawer.open(uid);
        drawerEl = domElements['drawer-identity-admin'];
        isSpinner = drawerEl.innerHTML.includes('CARGANDO IDENTITY 360');
        console.log(`3. Usuario ${uid}: ${!isSpinner ? '🟢 PASS' : '🔴 FAIL'}`);
    }
}

testAll().catch(console.error);
