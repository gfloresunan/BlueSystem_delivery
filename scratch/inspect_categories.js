const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function checkCategories() {
    console.log("--- CATEGORIES COLLECTION IN FIRESTORE ---");
    const catSnap = await db.collection('categories').get();
    console.log(`Total documents in /categories: ${catSnap.size}`);
    catSnap.forEach(d => {
        console.log(`  - Cat [${d.id}]:`, JSON.stringify(d.data()));
    });

    console.log("\n--- SAMPLE PRODUCTS WITH CATEGORY_ID ---");
    const prodSnap = await db.collection('products').get();
    prodSnap.forEach(d => {
        const data = d.data();
        if (data.categoryId) {
            console.log(`  - Prod [${d.id}] (${data.name || data.nombre}): categoryId="${data.categoryId}", categoryName="${data.categoryName}", categoria="${data.categoria}", category="${data.category}"`);
        }
    });
}

checkCategories().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
