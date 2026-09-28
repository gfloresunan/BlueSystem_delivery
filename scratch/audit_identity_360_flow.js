const { execSync } = require('child_process');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runAudit() {
    console.log("=== SIMULACIÓN FORENSE DE IDENTITY 360 ===");
    
    // 1. Obtener lista de usuarios
    const usersSnap = await db.collection("users").get();
    console.log(`Total usuarios en /users: ${usersSnap.size}`);
    
    const sampleUsers = [];
    usersSnap.forEach(d => {
        sampleUsers.push({ id: d.id, ...d.data() });
    });
    
    // 2. Simular getIdentity360 para varios usuarios
    for (const u of sampleUsers) {
        const uid = u.id;
        console.log(`\n--- Probando UID: ${uid} (${u.email || u.nombre || 'Sin email/nombre'}) Role: ${u.role || u.eiamRole} ---`);
        
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                console.log(`❌ userDoc NO existe para ${uid}`);
                continue;
            }
            const userData = { uid: userDoc.id, ...userDoc.data() };
            
            const [empSnap, memSnap, devSnap, sessSnap, auditSnap, invSnap] = await Promise.all([
                db.collection('employees').where('uid', '==', uid).get().catch(e => { console.log('employees err:', e.message); return null; }),
                db.collection('membership').where('uid', '==', uid).get().catch(e => { console.log('membership err:', e.message); return null; }),
                db.collection('devices').where('uid', '==', uid).get().catch(e => { console.log('devices err:', e.message); return null; }),
                db.collection('sessions').where('uid', '==', uid).get().catch(e => { console.log('sessions err:', e.message); return null; }),
                db.collection('audit_events').where('uid', '==', uid).orderBy('timestamp', 'desc').limit(20).get().catch(e => { console.log('audit_events err (expected if composite index needed):', e.message); return null; }),
                db.collection('invitations').where('acceptedByUid', '==', uid).get().catch(e => { console.log('invitations err:', e.message); return null; })
            ]);
            
            const employee = (empSnap && !empSnap.empty) ? { employeeId: empSnap.docs[0].id, ...empSnap.docs[0].data() } : null;
            const membership = (memSnap && !memSnap.empty) ? { membershipId: memSnap.docs[0].id, ...memSnap.docs[0].data() } : null;
            const devices = [];
            if (devSnap) devSnap.forEach(d => devices.push({ deviceId: d.id, ...d.data() }));
            const sessions = [];
            if (sessSnap) sessSnap.forEach(s => sessions.push({ sessionId: s.id, ...s.data() }));
            const auditEvents = [];
            if (auditSnap) auditSnap.forEach(a => auditEvents.push({ eventId: a.id, ...a.data() }));
            const invitations = [];
            if (invSnap) invSnap.forEach(i => invitations.push({ token: i.id, ...i.data() }));

            const identity360 = {
                user: userData,
                employee,
                membership,
                devices,
                sessions,
                auditEvents,
                invitations,
                canonicalRole: userData.role || userData.eiamRole
            };
            
            console.log(`✅ Identity360 obtenido con éxito. membership=${!!membership}, auditEvents=${auditEvents.length}, devices=${devices.length}`);
        } catch (err) {
            console.error(`❌ Error al procesar UID ${uid}:`, err);
        }
    }
}

runAudit().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
