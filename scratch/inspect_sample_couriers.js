const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

async function inspectSampleCouriersDocs() {
    const ids = ['04JAKPrmXjg7s2CDiT3kUPOhBwn2', '1768226535785', 'dlRY2ZVUqPR2Fxoc3cazcOxxRJg2', 'admin_initial', 'C6adh99jAXNqXJpIZaGFJJ5kFh72'];
    for (const id of ids) {
        const doc = await db.collection('couriers').doc(id).get();
        console.log(`=== couriers/${id} ===`);
        console.log(doc.data());
    }
}

inspectSampleCouriersDocs().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
