const admin = require("./node_modules/firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "bluesystem-7c9af",
  });
}

const db = admin.firestore();

const VALID_BUSINESS_ROLES = new Set([
  "business",
  "comercio",
  "restaurant",
  "merchant",
  "owner",
  "seller",
]);

async function runSync() {
  console.log("Iniciando migración con regla estricta de isFeatured...");
  const usersSnap = await db.collection("users").get();
  let count = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data() || {};
    const userId = doc.id;
    const roleStr = (data.rol || data.role || data.userType || "").toString().toLowerCase();
    const isBiz = VALID_BUSINESS_ROLES.has(roleStr) || Boolean(data.comercioNombre) || Array.isArray(data.branches);

    if (isBiz) {
      const isActive = data.active !== false && data.isActive !== false;
      const nombre = data.comercioNombre || data.nombre || data.name || "Comercio Sin Nombre";
      const logoUrl = data.logoUrl || data.photoUrl || data.logo || "";
      const bannerUrl = data.bannerUrl || data.portadaUrl || data.coverUrl || "";
      const categoria = data.categoria || data.category || "Restaurante";
      const description = data.descripcion || data.description || "";
      const rating = Number(data.rating || data.averageRating || 4.8);
      const ratingCount = Number(data.ratingCount || 15);
      const deliveryFee = Number(data.deliveryFee || data.costoEnvioBase || 35);
      const estimatedDeliveryTime = Number(data.avgPrepTimeMinutes || data.tiempoEstimadoMinutos || 15);
      const isOpen = data.isOpen === true || data.abierto === true;
      
      // REGLA ESTRICTA: Solo es destacado si el administrador lo estableció como true explícitamente
      const isFeatured = data.isFeatured === true || data.destacado === true;

      const publicBusinessDto = {
        id: userId,
        businessId: userId,
        nombre: nombre,
        name: nombre,
        comercioNombre: nombre,
        logoUrl: logoUrl,
        photoUrl: logoUrl,
        bannerUrl: bannerUrl,
        portadaUrl: bannerUrl,
        coverUrl: bannerUrl,
        categoria: categoria,
        category: categoria,
        descripcion: description,
        description: description,
        rating: rating,
        averageRating: rating,
        ratingCount: ratingCount,
        deliveryFee: deliveryFee,
        costoEnvioBase: deliveryFee,
        avgPrepTimeMinutes: estimatedDeliveryTime,
        tiempoEstimadoMinutos: estimatedDeliveryTime,
        deliveryTime: `${estimatedDeliveryTime} min`,
        isActive: isActive,
        active: isActive,
        isOpen: isOpen,
        abierto: isOpen,
        isFeatured: isFeatured,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("businesses").doc(userId).set(publicBusinessDto, { merge: true });
      console.log(`[SYNC OK] ${nombre} -> isFeatured: ${isFeatured}`);
      count++;
    }
  }

  console.log(`=== RE-SINCRONIZACIÓN EXITOSA === Total: ${count}`);
}

runSync().catch(err => {
  console.error("Error en re-sincronización:", err);
  process.exit(1);
});
