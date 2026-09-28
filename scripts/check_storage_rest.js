async function checkStorage() {
    const buckets = [
        'bluesystem-7c9af.firebasestorage.app',
        'bluesystem-7c9af.appspot.com'
    ];

    const prefixes = [
        '',
        'media/',
        'media/products/',
        'products/',
        'commerce_assets/',
        'commerce_assets/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2/'
    ];

    const targetProductIds = ['prod_217c8bb3', 'prod_a197e8cc'];

    for (const bucket of buckets) {
        console.log(`\n======================================================`);
        console.log(`CHECKING STORAGE BUCKET: ${bucket}`);
        console.log(`======================================================`);

        for (const prefix of prefixes) {
            const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`;
            try {
                const res = await fetch(url);
                console.log(`Prefix: [${prefix}] -> HTTP Status: ${res.status} ${res.statusText}`);
                if (res.ok) {
                    const data = await res.json();
                    const items = data.items || [];
                    const prefixesList = data.prefixes || [];
                    console.log(`  Items count: ${items.length}, Sub-prefixes: ${JSON.stringify(prefixesList)}`);
                    items.forEach(item => {
                        console.log(`  - File: ${item.name} (bucket: ${item.bucket}, updated: ${item.updated}, size: ${item.size})`);
                    });
                } else {
                    const errText = await res.text();
                    console.log(`  Error: ${errText}`);
                }
            } catch (e) {
                console.error(`  Fetch error for prefix ${prefix}:`, e.message);
            }
        }

        // Test specific target paths
        console.log(`\n--- Direct Search for target products in ${bucket} ---`);
        for (const pid of targetProductIds) {
            const candidatePaths = [
                `media/products/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2/${pid}/original_1200.webp`,
                `media/products/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2/${pid}/thumb_300.webp`,
                `media/products/${pid}/original_1200.webp`,
                `products/${pid}/original_1200.webp`,
                `products/${pid}.webp`,
                `products/${pid}_cover.webp`,
                `commerce_assets/dlRY2ZVUqPR2Fxoc3cazcOxxRJg2/${pid}.webp`,
                `commerce_assets/${pid}.webp`
            ];

            for (const cPath of candidatePaths) {
                const directUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cPath)}`;
                try {
                    const res = await fetch(directUrl);
                    if (res.ok) {
                        const meta = await res.json();
                        console.log(`  [EXISTS] ${cPath}`);
                        console.log(`   Metadata:`, JSON.stringify(meta, null, 2));
                        console.log(`   Download URL: https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cPath)}?alt=media&token=${meta.downloadTokens}`);
                    } else if (res.status === 404) {
                        // Not found
                    } else {
                        console.log(`  [${res.status}] ${cPath}: ${await res.text()}`);
                    }
                } catch (e) {
                    console.log(`  [ERROR] ${cPath}: ${e.message}`);
                }
            }
        }
    }
}

checkStorage().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
