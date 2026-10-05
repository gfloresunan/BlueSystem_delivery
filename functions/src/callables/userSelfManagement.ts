import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Callable HTTPS: deleteMyAccount
 * Cumplimiento Apple Guideline 5.1.1(v) y Google Play User Data Policy.
 * Permite a cualquier usuario autenticado (Cliente o Motorizado) solicitar la
 * eliminación definitiva de su cuenta de forma self-service.
 *
 * Mantiene la integridad financiera y contable (ADR-003, ADR-019, ADR-026):
 * 1. Valida que no existan pedidos o viajes activos en curso.
 * 2. Valida que no exista saldo pendiente de liquidación en caja para motorizados.
 * 3. Anonimiza datos personales (PII) en /users/{uid}.
 * 4. Elimina tokens multidevice en /user_devices.
 * 5. Elimina el registro de autenticación en Firebase Auth (admin.auth().deleteUser).
 * 6. Preserva el histórico de pedidos contables con referencia anonimizada.
 */
export const deleteMyAccount = functions.https.onCall(async (_data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debe iniciar sesión para solicitar la eliminación de su cuenta."
    );
  }

  const uid = context.auth.uid;
  const userEmail = context.auth.token.email || "unknown";

  // 1. Validar que no existan pedidos comerciales en curso
  const activeOrdersSnap = await db
    .collection("orders")
    .where("customerUid", "==", uid)
    .where("status", "in", ["PENDING", "ACCEPTED", "IN_PREPARATION", "READY_FOR_PICKUP", "ON_THE_WAY"])
    .limit(1)
    .get();

  if (!activeOrdersSnap.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No puede eliminar su cuenta mientras tenga pedidos en curso. Espere a que finalicen o cancele los pedidos pendientes."
    );
  }

  // 2. Validar que no existan viajes X→Y activos en curso
  const activeTripsSnap = await db
    .collection("deliveryTrips")
    .where("customerId", "==", uid)
    .where("status", "in", ["REQUESTED", "ASSIGNED", "PICKING_UP", "IN_TRANSIT"])
    .limit(1)
    .get();

  if (!activeTripsSnap.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No puede eliminar su cuenta mientras tenga envíos X→Y en curso."
    );
  }

  // 3. Validar si es motorizado con saldo pendiente o viajes activos
  const courierTripsSnap = await db
    .collection("deliveryTrips")
    .where("courierId", "==", uid)
    .where("status", "in", ["ASSIGNED", "PICKING_UP", "IN_TRANSIT"])
    .limit(1)
    .get();

  if (!courierTripsSnap.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No puede eliminar su cuenta mientras tenga entregas asignadas activas."
    );
  }

  const balanceDoc = await db.collection("courier_balances").doc(uid).get();
  if (balanceDoc.exists) {
    const cashOutstanding = balanceDoc.data()?.cashOutstandingCents || 0;
    if (cashOutstanding > 0) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Debe liquidar su saldo pendiente de caja (C$ ${(cashOutstanding / 100).toFixed(2)}) antes de proceder con la eliminación de cuenta.`
      );
    }
  }

  // 4. Batch de anonimización en Firestore
  const batch = db.batch();
  const userRef = db.collection("users").doc(uid);

  batch.set(
    userRef,
    {
      name: "Usuario Eliminado",
      nombre: "Usuario Eliminado",
      displayName: "Usuario Eliminado",
      fullName: "Usuario Eliminado",
      email: `deleted_${uid.substring(0, 8)}@bluesystem.anonymized`,
      phone: "",
      telefono: "",
      photoUrl: null,
      photoURL: null,
      profilePicture: null,
      fcmTokens: [],
      fcmToken: null,
      addresses: [],
      direcciones: [],
      accountStatus: "DELETED",
      status: "DELETED",
      isDeleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Registro de auditoría inmutable
  const auditRef = db.collection("audit_events").doc();
  batch.set(auditRef, {
    eventType: "USER_SELF_ACCOUNT_DELETION",
    targetUid: uid,
    performedBy: uid,
    previousEmail: userEmail,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    platformCompliance: ["APPLE_GUIDELINE_5.1.1(v)", "GOOGLE_PLAY_DATA_SAFETY"],
  });

  await batch.commit();

  // 5. Limpieza de dispositivos en /user_devices
  try {
    const devicesSnap = await db.collection("user_devices").where("userId", "==", uid).get();
    if (!devicesSnap.empty) {
      const devBatch = db.batch();
      devicesSnap.docs.forEach((doc) => devBatch.delete(doc.ref));
      await devBatch.commit();
    }
  } catch (err) {
    functions.logger.warn(`No se pudieron purgar dispositivos de /user_devices para ${uid}:`, err);
  }

  // 6. Eliminación en Firebase Auth
  try {
    await admin.auth().deleteUser(uid);
    functions.logger.info(`Usuario ${uid} eliminado exitosamente de Firebase Auth por solicitud propia.`);
  } catch (authErr: any) {
    functions.logger.error(`Error eliminando usuario ${uid} de Firebase Auth:`, authErr);
    // Si ya no existe en Auth, continuamos
    if (authErr.code !== "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "internal",
        "Error al completar la eliminación de credenciales de autenticación."
      );
    }
  }

  return {
    success: true,
    message: "Su cuenta ha sido eliminada y sus datos personales han sido anonimizados correctamente.",
  };
});
