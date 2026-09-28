const fs = require('fs');
const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

function isLocalPath(str) {
    if (!str || typeof str !== 'string') return false;
    const t = str.trim();
    return t.startsWith('file://') ||
           t.startsWith('/data/user/') ||
           t.startsWith('/data/data/') ||
           t.startsWith('/storage/emulated/') ||
           t.startsWith('content://');
}

async function reconcileLegacyProductImages() {
    console.log('================================================================');
    console.log('    BLUESYSTEM RECONCILIATION: LEGACY LOCAL IMAGE SANEAMIENTO   ');
    console.log('================================================================\n');

    const targetProductIds = ['prod_217c8bb3', 'prod_a197e8cc'];
    const snapshotBackup = {
        timestamp: new Date().toISOString(),
        products: {},
        featuredProducts: {}
    };

    console.log('--- PASO 1: BACKUP PREVIO DE SEGURIDAD ---');
    for (const pid of targetProductIds) {
        const docSnap = await db.collection('products').doc(pid).get();
        if (docSnap.exists) {
            snapshotBackup.products[pid] = docSnap.data();
            console.log(`[BACKUP] Producto guardado: ${pid} (${docSnap.data().name})`);
        }
    }

    const fpSnap = await db.collection('featuredProducts').doc('prod_217c8bb3').get();
    if (fpSnap.exists) {
        snapshotBackup.featuredProducts['prod_217c8bb3'] = fpSnap.data();
        console.log(`[BACKUP] FeaturedProduct guardado: prod_217c8bb3`);
    }

    const backupDir = path.join(__dirname, '../scratch');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, 'legacy_images_pre_reconciliation_snapshot.json');
    fs.writeFileSync(backupFile, JSON.stringify(snapshotBackup, null, 2), 'utf8');
    console.log(`Snapshot de respaldo escrito en: ${backupFile}\n`);

    console.log('--- PASO 2: SANEAMIENTO QUIRÚRGICO DE PRODUCTOS ---');
    const batch = db.batch();

    for (const pid of targetProductIds) {
        const ref = db.collection('products').doc(pid);
        const docSnap = await ref.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log(`Sanitizando /products/${pid}...`);
            batch.update(ref, {
                imageUrl: "",
                thumbnailUrl: "",
                images: [],
                mainImage: "",
                storagePath: "",
                imageVariants: {},
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    if (fpSnap.exists) {
        console.log(`Sanitizando /featuredProducts/prod_217c8bb3...`);
        const fpRef = db.collection('featuredProducts').doc('prod_217c8bb3');
        batch.update(fpRef, {
            imageUrl: ""
        });
    }

    await batch.commit();
    console.log('✅ Batch de saneamiento ejecutado con éxito en Firestore.\n');

    console.log('--- PASO 3: AUDITORÍA DE VERIFICACIÓN POST-SANEAMIENTO ---');
    let contaminatedCount = 0;

    const allProductsSnap = await db.collection('products').get();
    allProductsSnap.forEach(doc => {
        const d = doc.data();
        const img = d.imageUrl || '';
        const thumb = d.thumbnailUrl || '';
        const main = d.mainImage || '';
        const imgs = d.images || [];

        if (isLocalPath(img) || isLocalPath(thumb) || isLocalPath(main) || imgs.some(isLocalPath)) {
            console.error(`❌ [CONTAMINATED] Producto aún tiene ruta local: ${doc.id}`);
            contaminatedCount++;
        }
    });

    const allFpSnap = await db.collection('featuredProducts').get();
    allFpSnap.forEach(doc => {
        const d = doc.data();
        if (isLocalPath(d.imageUrl)) {
            console.error(`❌ [CONTAMINATED] FeaturedProduct aún tiene ruta local: ${doc.id}`);
            contaminatedCount++;
        }
    });

    const allFdSnap = await db.collection('flashDeals').get();
    allFdSnap.forEach(doc => {
        const d = doc.data();
        if (isLocalPath(d.imageUrl)) {
            console.error(`❌ [CONTAMINATED] FlashDeal aún tiene ruta local: ${doc.id}`);
            contaminatedCount++;
        }
    });

    if (contaminatedCount === 0) {
        console.log('🎉 AUDITORÍA POST-SANEAMIENTO EXITOSA: 0 rutas locales residuales en Firestore.');
    } else {
        console.error(`⚠️ ATENCIÓN: Se detectaron ${contaminatedCount} documentos contaminados.`);
        process.exit(1);
    }
}

reconcileLegacyProductImages().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Error en reconciliación:', err);
    process.exit(1);
});
