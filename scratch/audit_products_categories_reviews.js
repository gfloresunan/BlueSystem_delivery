const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function runAudit() {
    console.log("==================================================");
    console.log("FORENSIC AUDIT: PRODUCTS, CATEGORIES, REVIEWS");
    console.log("==================================================\n");

    const targetBusinesses = [
        { name: 'FRITONI', id: 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2' },
        { name: 'EL CHANCHITO', id: 'bbb760d5-a8f3-4700-9a96-f58f11f345ac' },
        { name: 'TECNOHOME', id: 'e7dc911e-e587-4be9-a741-7d9d9828011f' }
    ];

    // --- ISSUE 01: TENANT ISOLATION PER BUSINESS ---
    console.log("--- ISSUE 01: PRODUCTS BY BUSINESS (FIRESTORE QUERY) ---");
    for (const b of targetBusinesses) {
        console.log(`\nQuerying products for ${b.name} (businessId: ${b.id})...`);
        const snap = await db.collection('products').where('businessId', '==', b.id).get();
        console.log(`Found ${snap.size} products for ${b.name}:`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`  - Doc [${doc.id}]: name="${data.name || data.nombre}", price=${data.price || data.precio}, active=${data.active}, businessId=${data.businessId}`);
        });
    }

    // --- ISSUE 02: CATEGORY_ID DEPENDENCY AUDIT ---
    console.log("\n--- ISSUE 02: CATEGORY FIELD ANALYSIS (ALL PRODUCTS) ---");
    const allProductsSnap = await db.collection('products').get();
    console.log(`Total products in /products: ${allProductsSnap.size}`);
    let categoryIdOnlyCount = 0;
    let categoryNameCount = 0;
    let categoriaCount = 0;
    let categoryCount = 0;
    let categoryIdCount = 0;

    allProductsSnap.forEach(doc => {
        const data = doc.data();
        const hasCategoryName = !!data.categoryName;
        const hasCategoria = !!data.categoria;
        const hasCategory = !!data.category;
        const hasCategoryId = !!data.categoryId;

        if (hasCategoryName) categoryNameCount++;
        if (hasCategoria) categoriaCount++;
        if (hasCategory) categoryCount++;
        if (hasCategoryId) categoryIdCount++;

        if (hasCategoryId && !hasCategoryName && !hasCategoria && !hasCategory) {
            console.log(`WARNING: Product [${doc.id}] (${data.name}) relies EXCLUSIVELY on categoryId: "${data.categoryId}"`);
            categoryIdOnlyCount++;
        }
    });

    console.log(`Category Field Breakdown:`);
    console.log(`  - categoryName: ${categoryNameCount}`);
    console.log(`  - categoria:    ${categoriaCount}`);
    console.log(`  - category:     ${categoryCount}`);
    console.log(`  - categoryId:   ${categoryIdCount}`);
    console.log(`  - EXCLUSIVELY categoryId: ${categoryIdOnlyCount}`);

    if (categoryIdOnlyCount === 0) {
        console.log("\nRESULT: CATEGORY_ID = COMPATIBILITY GAP, NO IMPACT ON CURRENT PRODUCTION DATA");
    }

    // --- ISSUE 03: REVIEWS SOURCE OF TRUTH AUDIT ---
    console.log("\n--- ISSUE 03: REVIEWS LOCATION AUDIT ---");
    for (const b of targetBusinesses) {
        const subSnap = await db.collection('businesses').doc(b.id).collection('reviews').get();
        console.log(`Reviews in /businesses/${b.id}/reviews: ${subSnap.size}`);
        subSnap.forEach(doc => {
            const data = doc.data();
            console.log(`  - Subcoll Review [${doc.id}]: rating=${data.rating}, comment="${data.comment}", author="${data.userName || data.authorName}"`);
        });
    }

    const rootReviewsSnap = await db.collection('reviews').get();
    console.log(`\nTotal reviews in root /reviews: ${rootReviewsSnap.size}`);
    rootReviewsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  - Root Review [${doc.id}]: businessId=${data.businessId}, rating=${data.rating}, comment="${data.comment}"`);
    });
}

runAudit().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
