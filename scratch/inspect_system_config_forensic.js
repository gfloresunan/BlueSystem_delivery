const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectSystemConfig() {
    console.log("=== INSPECCIÓN FORENSE /system_config/global ===");
    const docRef = db.collection('system_config').doc('global');
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        console.log("DOCUMENTO /system_config/global NO EXISTE EN FIRESTORE");
    } else {
        console.log("DOCUMENTO /system_config/global EXISTE:");
        const data = docSnap.data();
        console.log(JSON.stringify(data, null, 2));
        
        console.log("\n--- DETALLE DE TIPOS Y CAMPOS RELEVANTES ---");
        console.log("additionalChargeEnabled:", data.additionalChargeEnabled, `(tipo: ${typeof data.additionalChargeEnabled})`);
        console.log("additionalChargeAmount:", data.additionalChargeAmount, `(tipo: ${typeof data.additionalChargeAmount})`);
        console.log("additionalChargeDescription:", data.additionalChargeDescription, `(tipo: ${typeof data.additionalChargeDescription})`);
        console.log("additionalChargePolicyId:", data.additionalChargePolicyId, `(tipo: ${typeof data.additionalChargePolicyId})`);
        console.log("additionalChargePolicyVersion:", data.additionalChargePolicyVersion, `(tipo: ${typeof data.additionalChargePolicyVersion})`);
        console.log("maintenanceMode:", data.maintenanceMode, `(tipo: ${typeof data.maintenanceMode})`);
        console.log("minimumVersion:", data.minimumVersion, `(tipo: ${typeof data.minimumVersion})`);
        console.log("allowGuest:", data.allowGuest, `(tipo: ${typeof data.allowGuest})`);
    }

    console.log("\n=== INSPECCIÓN DE OTROS DOCUMENTOS EN /system_config ===");
    const colSnap = await db.collection('system_config').get();
    colSnap.forEach(d => {
        console.log(`Doc ID: ${d.id} -> keys:`, Object.keys(d.data()));
    });
}

inspectSystemConfig().catch(err => {
    console.error("Error inspecting system_config:", err);
    process.exit(1);
});
