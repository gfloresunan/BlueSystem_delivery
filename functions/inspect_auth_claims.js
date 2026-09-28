const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "bluesystem-7c9af"
  });
}

async function inspectAuth() {
  const uid = "6VkVNQ2yRzS67kEIYfyATkuwBiI3";
  try {
    const userRecord = await admin.auth().getUser(uid);
    console.log("=== FIREBASE AUTH RECORD ===");
    console.log("UID:", userRecord.uid);
    console.log("Email:", userRecord.email);
    console.log("Custom Claims:", JSON.stringify(userRecord.customClaims, null, 2));
  } catch (err) {
    console.error("Error getting user from auth:", err);
  }
}

inspectAuth().then(() => process.exit(0)).catch(() => process.exit(1));
