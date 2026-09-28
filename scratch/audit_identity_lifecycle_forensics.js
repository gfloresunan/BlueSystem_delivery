const { execSync } = require('child_process');
const https = require('https');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function getAccessToken() {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function lookupUser(uid) {
    const token = getAccessToken();
    const postData = JSON.stringify({ localId: [uid] });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            port: 443,
            path: '/v1/projects/bluesystem-7c9af/accounts:lookup',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-goog-user-project': 'bluesystem-7c9af',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.users && parsed.users[0] ? parsed.users[0] : null);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function runIdentityLifecycleForensics() {
    console.log('================================================================================');
    console.log('  SPRINT 17.5.3 — FORENSIC AUDIT: IDENTITY LIFECYCLE & DEPROVISIONING           ');
    console.log('================================================================================\n');

    const targetUids = [
        { name: 'Junior Flores', uid: 'XWNzPT5p6fbf7reFdFBNTZoQrY42' },
        { name: 'Aldrich Flores', uid: 'qtlV8m8wj0ed0tQFXKzjfXKzQ5g2' },
        { name: 'Kimberly Flores', uid: '8O8hJe5kSzNQxUkLwwkCsipGmAI3' },
        { name: 'FRITONI Owner', uid: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2' },
        { name: 'Kim (Biz ID)', uid: '1768243841542' },
        { name: 'Chepita (Biz ID)', uid: '1769029559449' }
    ];

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 1: AUDITAR HISTORIAL DE /membership (TODOS LOS STATUS)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- FASE 1: HISTORIAL COMPLETO DE /membership ---');
    const allMembershipsSnap = await db.collection('membership').get();
    console.log(`Total documentos en /membership: ${allMembershipsSnap.size}`);

    const allMemberships = [];
    allMembershipsSnap.forEach(d => allMemberships.push({ id: d.id, ...d.data() }));

    for (const target of targetUids) {
        const userMemberships = allMemberships.filter(m => m.uid === target.uid || m.businessId === target.uid || m.id.includes(target.uid));
        console.log(`\n🔍 Identidad: ${target.name} (${target.uid}) -> ${userMemberships.length} membresía(s) encontrada(s):`);
        userMemberships.forEach(m => {
            console.log(`   - [ID: ${m.id}] role=${m.role}, status=${m.status}, businessId=${m.businessId}, orgId=${m.orgId}, branchId=${m.branchId}, email=${m.email}`);
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 2: AUDITAR /audit_events (HISTORIAL DE DEPROVISIONING & ROLE CHANGES)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- FASE 2: AUDITORÍA DE /audit_events ---');
    const auditSnap = await db.collection('audit_events').get();
    console.log(`Total eventos en /audit_events: ${auditSnap.size}`);

    const auditEvents = [];
    auditSnap.forEach(d => auditEvents.push({ id: d.id, ...d.data() }));

    // Filtrar eventos por targetUid, actorUid o businessId de interés
    for (const target of targetUids) {
        const relatedEvents = auditEvents.filter(e => 
            e.targetUid === target.uid || 
            e.actorUid === target.uid || 
            e.businessId === target.uid ||
            (e.details && JSON.stringify(e.details).includes(target.uid)) ||
            (e.reason && e.reason.includes(target.uid))
        );

        console.log(`\n📜 Eventos de Auditoría para ${target.name} (${target.uid}) -> ${relatedEvents.length} eventos:`);
        relatedEvents.forEach(e => {
            const timeStr = e.timestamp ? (e.timestamp.toDate ? e.timestamp.toDate().toISOString() : JSON.stringify(e.timestamp)) : 'No Time';
            console.log(`   - [${timeStr}] Event: ${e.event || e.eventType || e.action}, Actor: ${e.actorUid}, Target: ${e.targetUid}, Biz: ${e.businessId}, Reason: ${e.reason || 'N/A'}`);
            if (e.before || e.after) {
                console.log(`     before: ${JSON.stringify(e.before)}, after: ${JSON.stringify(e.after)}`);
            }
        });
    }

    // Buscar también eventos generales de DEPROVISIONING o ROLE_CHANGED en todo el audit log
    console.log('\n📜 Todos los eventos de DEPROVISIONING / MEMBERSHIP / TENANT en la plataforma:');
    const systemLifecycleEvents = auditEvents.filter(e => {
        const str = (e.event || e.eventType || e.action || '').toUpperCase();
        return str.includes('DEPROVISION') || str.includes('MEMBERSHIP') || str.includes('TERMINAT') || str.includes('ROLE');
    });
    systemLifecycleEvents.forEach(e => {
        const timeStr = e.timestamp ? (e.timestamp.toDate ? e.timestamp.toDate().toISOString() : JSON.stringify(e.timestamp)) : 'No Time';
        console.log(`   - [${timeStr}] Event: ${e.event || e.eventType || e.action} | Target: ${e.targetUid} | Biz: ${e.businessId} | Actor: ${e.actorUid} | Reason: ${e.reason || 'N/A'}`);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 3: AUDITAR FIREBASE AUTH (DISABLED vs CUSTOM CLAIMS vs LAST SIGN-IN)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- FASE 3: ESTADO REAL EN FIREBASE AUTH ---');
    for (const target of targetUids) {
        try {
            const authUser = await lookupUser(target.uid);
            if (!authUser) {
                console.log(`\n👤 ${target.name} (${target.uid}): ❌ NO EXISTE EN FIREBASE AUTH`);
            } else {
                const claims = authUser.customAttributes ? JSON.parse(authUser.customAttributes) : {};
                const lastLogin = authUser.lastLoginAt ? new Date(parseInt(authUser.lastLoginAt)).toISOString() : 'Never';
                const created = authUser.createdAt ? new Date(parseInt(authUser.createdAt)).toISOString() : 'Unknown';
                console.log(`\n👤 ${target.name} (${target.uid}):`);
                console.log(`   Email: ${authUser.email}`);
                console.log(`   Disabled: ${authUser.disabled ? '🔴 YES (ACCOUNT DISABLED)' : '🟢 NO (ACTIVE ACCOUNT)'}`);
                console.log(`   Custom Claims:`, claims);
                console.log(`   Created: ${created} | Last Login: ${lastLogin}`);
            }
        } catch (e) {
            console.error(`   Error consultando Auth para ${target.uid}:`, e.message);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FASE 4: AUDITAR NEGOCIOS CERTIFICADOS Y ORGANIZACIONES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- FASE 4: VINCULACIÓN DE NEGOCIOS Y ORGANIZACIONES ---');
    
    // Variedades TECNOHOME
    const tecnoBiz = await db.collection('businesses').doc('e7dc911e-e587-4be9-a741-7d9d9828011f').get();
    console.log('\n🏪 Variedades TECNOHOME (/businesses/e7dc911e-e587-4be9-a741-7d9d9828011f):');
    if (tecnoBiz.exists) {
        const d = tecnoBiz.data();
        console.log(`   ownerUid: ${d.ownerUid}, orgId: ${d.orgId}, status: ${d.status}, lifecycleStatus: ${d.lifecycleStatus}`);
    }

    // El Chanchito
    const chanchitoBiz = await db.collection('businesses').doc('bbb760d5-a8f3-4700-9a96-f58f11f345ac').get();
    console.log('\n🏪 El Chanchito (/businesses/bbb760d5-a8f3-4700-9a96-f58f11f345ac):');
    if (chanchitoBiz.exists) {
        const d = chanchitoBiz.data();
        console.log(`   ownerUid: ${d.ownerUid}, orgId: ${d.orgId}, status: ${d.status}, lifecycleStatus: ${d.lifecycleStatus}`);
    }

    // Organizaciones
    const orgsSnap = await db.collection('organizations').get();
    console.log('\n🏢 Organizaciones registradas en Firestore:');
    orgsSnap.forEach(d => {
        const o = d.data();
        console.log(`   - Org ID: ${d.id} | Name: ${o.name} | ownerUid: ${o.ownerUid} | businessIds: ${JSON.stringify(o.businessIds)} | status: ${o.status}`);
    });
}

runIdentityLifecycleForensics().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
