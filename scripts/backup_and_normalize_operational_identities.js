const fs = require('fs');
const path = require('path');
const admin = require('c:/Users/geral/OneDrive/Escritorio/TECNOCOMP 2026/Sistemas/BlueSystem_delivery/functions/node_modules/firebase-admin');

if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({
        projectId: 'bluesystem-7c9af'
    });
}

const db = admin.firestore();

// 13 Operational Identities reconciled from real evidence
const OPERATIONAL_MAPPING = {
    // ADMIN_PANEL
    "XWsjzZe8lsfthRQ5PgbDzlqA2nX2": {
        identityOrigin: "ADMIN_PANEL",
        createdVia: "ADMIN_PANEL",
        originClassification: "ADMIN_PANEL",
        originEvidence: "Admin Panel creation & administrative user credentials (Gerald Flores)"
    },
    "admin_initial": {
        identityOrigin: "ADMIN_PANEL",
        createdVia: "ADMIN_PANEL",
        originClassification: "ADMIN_PANEL",
        originEvidence: "Initial system admin account with 256 sales records (Admin Gerald Flores)"
    },
    // AFFILIATION
    "XWNzPT5p6fbf7reFdFBNTZoQrY42": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Merchant application rkul8qqr6ljKyf8W7eXW & business e7dc911e-e587-4be9-a741-7d9d9828011f (Junior Flores)"
    },
    "qtlV8m8wj0ed0tQFXKzjfXKzQ5g2": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Merchant application McIq7vqVMwDlcLiw4q36 & business bbb760d5-a8f3-4700-9a96-f58f11f345ac (Aldrich Flores)"
    },
    "1768243841542": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Business merchant profile 1768243841542 with 27 registered sales (Kim)"
    },
    "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Merchant business account fritonic@gmail.com linked to commerce dlRY2ZVUqPR2Fxoc3cazcOxxRJg2 (FRITONI)"
    },
    "8O8hJe5kSzNQxUkLwwkCsipGmAI3": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Merchant business account kim@gmail.com linked to commerce 8O8hJe5kSzNQxUkLwwkCsipGmAI3 (kimberly Flores)"
    },
    "1768878763084": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Merchant POS Seller profile 1768878763084 with 65 registered sales (Henry Paz)"
    },
    "1769029559449": {
        identityOrigin: "AFFILIATION",
        createdVia: "MERCHANT_AFFILIATION",
        originClassification: "AFFILIATION",
        originEvidence: "Merchant POS Seller profile 1769029559449 with 8 registered sales (Chepita)"
    },
    // APP
    "3Wt0XdzeOTfG1OXn72ApIhVbE5i1": {
        identityOrigin: "APP",
        createdVia: "APP",
        originClassification: "APP",
        originEvidence: "App signup with registered Android device and 1 completed order (Kimberly Flores Centeno)"
    },
    "9QHYGkSa3nWiJ7KfPkccjjuIaYp2": {
        identityOrigin: "APP",
        createdVia: "APP",
        originClassification: "APP",
        originEvidence: "Courier app registration with phone 82397401 and device registration (Henry Paz)"
    },
    "dbX1tvV2WNdFv4KWMbWNW8lngDI2": {
        identityOrigin: "APP",
        createdVia: "APP",
        originClassification: "APP",
        originEvidence: "Android App registration with device record in user_devices (Gerald Jose Flores Gutierrez)"
    },
    "h00PIZpMgxSaqSVnYpRLPq0DYGC3": {
        identityOrigin: "APP",
        createdVia: "APP",
        originClassification: "APP",
        originEvidence: "Customer app account itedvirtual@gmail.com with 1 order (ITED Virtual)"
    }
};

const NON_OPERATIONAL_MAPPING = {
    "test_auth_fs_1786904851220": {
        identityOrigin: "TEST",
        createdVia: "TEST_SCRIPT",
        originClassification: "TEST",
        originEvidence: "Synthetic/automation test user profile"
    },
    "test_biz_1786904636301": {
        identityOrigin: "TEST",
        createdVia: "TEST_SCRIPT",
        originClassification: "TEST",
        originEvidence: "Synthetic/automation test commerce user profile"
    },
    "test_biz_1786904659755": {
        identityOrigin: "TEST",
        createdVia: "TEST_SCRIPT",
        originClassification: "TEST",
        originEvidence: "Synthetic/automation test commerce user profile"
    }
};

async function backupAndNormalize() {
    console.log("==================================================================");
    console.log("1. BACKUP / SNAPSHOT CREATION OF /users DOCUMENTS");
    console.log("==================================================================");

    const usersSnap = await db.collection('users').get();
    const backupData = [];

    usersSnap.forEach(doc => {
        backupData.push({
            uid: doc.id,
            originalData: doc.data(),
            proposedFields: OPERATIONAL_MAPPING[doc.id] || NON_OPERATIONAL_MAPPING[doc.id] || {
                identityOrigin: "LEGACY_PREEXISTING",
                createdVia: "POS_DESKTOP_LEGACY",
                originClassification: "LEGACY_PREEXISTING",
                originEvidence: "Legacy desktop POS record without auth or operational activity"
            }
        });
    });

    const backupPath = path.join(__dirname, '..', 'users_snapshot_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ Snapshot of ${backupData.length} documents saved to: ${backupPath}`);

    console.log("\n==================================================================");
    console.log("2. NORMALIZING identityOrigin ON LEGITIMATE OPERATIONAL USERS");
    console.log("==================================================================");

    let updatedCount = 0;
    const batch = db.batch();

    backupData.forEach(item => {
        const ref = db.collection('users').doc(item.uid);
        const orig = item.originalData;
        const proposed = item.proposedFields;

        // Merge ONLY identityOrigin, createdVia, originClassification, originEvidence if not matching
        const fieldsToUpdate = {};
        if (!orig.identityOrigin || orig.identityOrigin !== proposed.identityOrigin) {
            fieldsToUpdate.identityOrigin = proposed.identityOrigin;
        }
        if (!orig.createdVia || orig.createdVia !== proposed.createdVia) {
            fieldsToUpdate.createdVia = proposed.createdVia;
        }
        if (!orig.originClassification || orig.originClassification !== proposed.originClassification) {
            fieldsToUpdate.originClassification = proposed.originClassification;
        }
        if (!orig.originEvidence || orig.originEvidence !== proposed.originEvidence) {
            fieldsToUpdate.originEvidence = proposed.originEvidence;
        }

        if (Object.keys(fieldsToUpdate).length > 0) {
            batch.set(ref, fieldsToUpdate, { merge: true });
            updatedCount++;
            console.log(`Updating ${item.uid} (${orig.nombre || orig.name || item.uid}) -> ${JSON.stringify(fieldsToUpdate)}`);
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`\n✅ Normalization successful: ${updatedCount} documents updated in Firestore /users.`);
    } else {
        console.log(`\nℹ No updates needed: all documents already match canonical identityOrigin.`);
    }
}

backupAndNormalize().catch(err => {
    console.error("❌ Error in backup and normalization script:", err);
    process.exit(1);
});
