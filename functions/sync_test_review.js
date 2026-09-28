const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkAndSync() {
  const orderId = "cMK55rKnMxoKs14ZwhSH";
  console.log(`Checking order: ${orderId}`);
  const orderDoc = await db.collection("orders").doc(orderId).get();
  if (!orderDoc.exists) {
    console.log("Order not found!");
    return;
  }
  const orderData = orderDoc.data();
  console.log("Order data:", {
    businessId: orderData.businessId,
    courierId: orderData.assignedCourierId || orderData.courierId,
    hasBeenRated: orderData.hasBeenRated,
    hasRatedBusiness: orderData.hasRatedBusiness,
    hasRatedCourier: orderData.hasRatedCourier,
    rating: orderData.rating,
    ratingComment: orderData.ratingComment,
    courierRating: orderData.courierRating,
    courierRatingComment: orderData.courierRatingComment
  });

  const reviewDoc = await db.collection("reviews").doc(orderId).get();
  if (reviewDoc.exists) {
    console.log("Found in /reviews:", reviewDoc.data());
    const rData = reviewDoc.data();
    const businessId = orderData.businessId || rData.businessId;
    if (businessId) {
      const bizRevRef = db.collection("businesses").doc(businessId).collection("reviews").doc(orderId);
      const bizRevDoc = await bizRevRef.get();
      if (!bizRevDoc.exists) {
        console.log(`Copying review to /businesses/${businessId}/reviews/${orderId}`);
        // get user name
        let userName = rData.userName || "Cliente";
        let userPhotoUrl = rData.userPhotoUrl || "";
        if (orderData.customerId) {
          const userDoc = await db.collection("users").doc(orderData.customerId).get();
          if (userDoc.exists) {
            const u = userDoc.data();
            userName = u.name || u.nombre || u.displayName || userName;
            userPhotoUrl = u.photoUrl || u.avatarUrl || u.profilePicture || userPhotoUrl;
          }
        }
        await bizRevRef.set({
          orderId,
          businessId,
          userId: orderData.customerId || rData.userId || "",
          userName,
          authorName: userName,
          userPhotoUrl,
          rating: rData.businessRating || rData.rating || orderData.rating || 5,
          comment: rData.comments || rData.comment || orderData.ratingComment || "",
          date: rData.createdAt ? new Date(rData.createdAt._seconds ? rData.createdAt._seconds * 1000 : rData.createdAt).toLocaleDateString("es-ES") : new Date().toLocaleDateString("es-ES"),
          createdAt: rData.createdAt || admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("Successfully written to business subcollection!");
      } else {
        console.log("Already exists in /businesses subcollection:", bizRevDoc.data());
      }
    }
  } else {
    console.log("No doc in /reviews for this order.");
  }
}

checkAndSync().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
