const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function inspect() {
  console.log("=== INSPECTING COURIER USER (6VkVNQ2yRzS67kEIYfyATkuwBiI3) ===");
  const userDoc = await db.collection("users").doc("6VkVNQ2yRzS67kEIYfyATkuwBiI3").get();
  if (!userDoc.exists) {
    console.log("User document NOT found in /users!");
  } else {
    console.log("User Data:", JSON.stringify(userDoc.data(), null, 2));
  }

  console.log("\n=== INSPECTING ORDER (env_6d575072) ===");
  const orderDoc = await db.collection("orders").doc("env_6d575072").get();
  if (!orderDoc.exists) {
    console.log("Order env_6d575072 NOT found in /orders!");
  } else {
    console.log("Order Data:", JSON.stringify(orderDoc.data(), null, 2));
  }
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error("Error inspecting:", err);
  process.exit(1);
});
