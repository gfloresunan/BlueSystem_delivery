const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkTimestamps() {
    const bizSnap = await db.collection('businesses').get();
    console.log(`Total businesses: ${bizSnap.size}`);

    const tecnostoreBiz = [];
    const darianoBiz = [];
    const adminTecnostoreBiz = [];
    const otherBiz = [];

    bizSnap.forEach(doc => {
        const d = doc.data();
        const name = (d.name || d.comercioNombre || d.nombre || '').trim();
        if (name === 'TECNOSTORE') tecnostoreBiz.push({ id: doc.id, ...d });
        else if (name === 'El Dariano') darianoBiz.push({ id: doc.id, ...d });
        else if (name === 'Admin Tecnostore') adminTecnostoreBiz.push({ id: doc.id, ...d });
        else otherBiz.push({ id: doc.id, ...d });
    });

    console.log(`\nCounts by name in /businesses:`);
    console.log(`- TECNOSTORE: ${tecnostoreBiz.length}`);
    console.log(`- Admin Tecnostore: ${adminTecnostoreBiz.length}`);
    console.log(`- El Dariano: ${darianoBiz.length}`);
    console.log(`- Others: ${otherBiz.length}`);
    otherBiz.forEach(b => console.log(`  * ${b.id}: "${b.name || b.comercioNombre}" (lifecycle: ${b.lifecycleStatus}, status: ${b.status})`));

    // Check users
    const userSnap = await db.collection('users').get();
    console.log(`\nTotal users: ${userSnap.size}`);
    const tecnoUsers = [];
    userSnap.forEach(doc => {
        const d = doc.data();
        if ((d.email && d.email.includes('tecnostore')) || (d.name && d.name.includes('Tecnostore')) || (d.nombre && d.nombre.includes('Tecnostore'))) {
            tecnoUsers.push({ id: doc.id, ...d });
        }
    });
    console.log(`Users with tecnostore email/name: ${tecnoUsers.length}`);

    // Check branches
    const branchSnap = await db.collection('branches').get();
    console.log(`\nTotal branches: ${branchSnap.size}`);

    // Check memberships
    const memSnap = await db.collection('membership').get();
    console.log(`Total legacy memberships: ${memSnap.size}`);
}

checkTimestamps().catch(console.error);
