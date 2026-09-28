// Test detailed step-by-step
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
        const el = {
            id: '',
            className: '',
            innerHTML: '',
            classList: {
                remove: () => {},
                add: () => {}
            },
            querySelector: () => ({ classList: { remove: () => {}, add: () => {} } })
        };
        return el;
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

async function testStepByStep(uid) {
    console.log(`=== TEST STEP BY STEP FOR UID: ${uid} ===`);
    
    console.log("1. Calling identityService.getIdentity360(uid)...");
    const id360 = await global.identityService.getIdentity360(uid);
    console.log("id360 result:", id360 ? "OBJECT PRESENT" : "NULL");
    if (id360) {
        console.log("user:", JSON.stringify(id360.user, null, 2));
    }
    
    console.log("2. Calling governanceService.getBusinesses('all')...");
    try {
        const biz = await global.governanceService.getBusinesses('all');
        console.log(`getBusinesses count: ${biz.length}`);
    } catch (e) {
        console.log(`❌ getBusinesses THREW ERROR:`, e.message);
    }
    
    console.log("3. Calling governanceService.getBranches()...");
    try {
        const br = await global.governanceService.getBranches();
        console.log(`getBranches count: ${br.length}`);
    } catch (e) {
        console.log(`❌ getBranches THREW ERROR:`, e.message);
    }
    
    console.log("4. Testing _renderDrawer directly...");
    try {
        global.identityAdminDrawer._identity360 = id360;
        global.identityAdminDrawer._businesses = [];
        global.identityAdminDrawer._branches = [];
        global.identityAdminDrawer._renderDrawer(id360);
        console.log("✅ _renderDrawer completed successfully without throwing!");
    } catch (e) {
        console.log(`❌ _renderDrawer THREW ERROR:`, e);
    }
}

testStepByStep('04JAKPrmXjg7s2CDiT3kUPOhBwn2').catch(console.error);
