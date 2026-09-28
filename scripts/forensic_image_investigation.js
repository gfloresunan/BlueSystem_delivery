const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af',
        storageBucket: 'bluesystem-7c9af.firebasestorage.app'
    });
}

const db = admin.firestore();
const storage = admin.storage();

async function runForensicInvestigation() {
    console.log('================================================================');
    console.log('       BLUESYSTEM FORENSIC IMAGE ORIGIN INVESTIGATION          ');
    console.log('================================================================\n');

    const targetProductIds = ['prod_217c8bb3', 'prod_a197e8cc'];

    console.log('--- 1. DIRECT FIRESTORE INSPECTION (/products) ---');
    for (const pid of targetProductIds) {
        const docRef = db.collection('products').doc(pid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            console.log(`\n[EXISTS] Product Document: /products/${pid}`);
            const data = docSnap.data();
            console.log(JSON.stringify({
                id: docSnap.id,
                productId: data.productId,
                businessId: data.businessId,
                name: data.name,
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl,
                imageVariants: data.imageVariants,
                images: data.images,
                cover: data.cover,
                coverUrl: data.coverUrl,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                status: data.status,
                active: data.active,
                rawDoc: data
            }, null, 2));
        } else {
            console.log(`\n[NOT FOUND] Product Document: /products/${pid}`);
        }
    }

    console.log('\n--- 2. SCAN ALL PRODUCTS IN /products ---');
    const allProductsSnap = await db.collection('products').get();
    console.log(`Total documents in /products: ${allProductsSnap.size}`);
    const localPathProducts = [];
    const httpsProducts = [];
    const otherProducts = [];

    allProductsSnap.forEach(doc => {
        const data = doc.data();
        const img = data.imageUrl || '';
        const entry = {
            id: doc.id,
            productId: data.productId,
            businessId: data.businessId,
            name: data.name,
            imageUrl: data.imageUrl,
            thumbnailUrl: data.thumbnailUrl,
            hasImageVariants: !!data.imageVariants,
            hasImagesArray: !!data.images
        };
        if (img.startsWith('file://') || img.startsWith('/data/')) {
            localPathProducts.push(entry);
        } else if (img.startsWith('https://') || img.startsWith('http://')) {
            httpsProducts.push(entry);
        } else {
            otherProducts.push(entry);
        }
    });

    console.log(`\nProducts with local path (${localPathProducts.length}):`);
    console.log(JSON.stringify(localPathProducts, null, 2));

    console.log(`\nProducts with HTTPS path (${httpsProducts.length}):`);
    console.log(JSON.stringify(httpsProducts, null, 2));

    if (otherProducts.length > 0) {
        console.log(`\nProducts with other/empty imageUrl (${otherProducts.length}):`);
        console.log(JSON.stringify(otherProducts, null, 2));
    }

    console.log('\n--- 3. INSPECT PROMOTIONS / FEATURED / FLASH DEALS ---');
    const promoCollections = ['featuredProducts', 'flashDeals', 'promotions', 'starProducts'];
    for (const col of promoCollections) {
        try {
            const snap = await db.collection(col).get();
            console.log(`\nCollection /${col} count: ${snap.size}`);
            snap.forEach(doc => {
                console.log(`Doc ID: [${doc.id}] =>`, JSON.stringify(doc.data(), null, 2));
            });
        } catch (e) {
            console.log(`Collection /${col} error: ${e.message}`);
        }
    }

    console.log('\n--- 4. FIREBASE STORAGE INSPECTION ---');
    try {
        let bucket = storage.bucket();
        console.log(`Checking bucket: ${bucket.name}`);
        const [files] = await bucket.getFiles({ maxResults: 100 });
        console.log(`Found ${files.length} files in bucket:`);
        files.forEach(f => {
            console.log(` - ${f.name} (${f.metadata.size} bytes, updated: ${f.metadata.updated})`);
        });

        // Search specifically for target products
        for (const pid of targetProductIds) {
            console.log(`\nSearching storage for references to ${pid}:`);
            const matchedFiles = files.filter(f => f.name.includes(pid));
            if (matchedFiles.length > 0) {
                for (const mf of matchedFiles) {
                    console.log(` [MATCH] File: ${mf.name}`);
                    // Check if signed / public URL or download token exists
                    const meta = await mf.getMetadata();
                    console.log(` Metadata:`, JSON.stringify({
                        name: mf.name,
                        contentType: meta[0].contentType,
                        downloadTokens: meta[0].metadata?.firebaseStorageDownloadTokens
                    }, null, 2));
                }
            } else {
                console.log(` [NO MATCH] No file matching ${pid} found in root listing.`);
                // Search with prefix
                const [prefixFiles] = await bucket.getFiles({ prefix: `media/products/` });
                console.log(` Total files with prefix media/products/: ${prefixFiles.length}`);
                prefixFiles.forEach(f => {
                    if (f.name.includes(pid)) {
                        console.log(` [PREFIX MATCH] ${f.name}`);
                    }
                });
            }
        }
    } catch (storageErr) {
        console.error('Storage inspection error:', storageErr.message);
        // Try fallback bucket name bluesystem-7c9af.appspot.com
        try {
            console.log('Trying fallback bucket: bluesystem-7c9af.appspot.com');
            const bucket2 = storage.bucket('bluesystem-7c9af.appspot.com');
            const [files2] = await bucket2.getFiles({ maxResults: 100 });
            console.log(`Found ${files2.length} files in fallback bucket:`);
            files2.forEach(f => {
                console.log(` - ${f.name}`);
            });
        } catch (storageErr2) {
            console.error('Fallback storage bucket error:', storageErr2.message);
        }
    }
}

runForensicInvestigation().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
