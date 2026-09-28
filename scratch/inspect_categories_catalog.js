const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectCategories() {
    console.log('=== /categories COLLECTION ===');
    const snap = await db.collection('categories').get();
    console.log(`Total categories: ${snap.size}`);
    snap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Name: "${data.name}" | Type: "${data.type}" | Active: ${data.active} | showInHome: ${data.showInHome} | icon: "${data.icon}" | slug: "${data.slug}" | isFeatured: ${data.isFeatured}`);
    });
}

inspectCategories().catch(console.error);
