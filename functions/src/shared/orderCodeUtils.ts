import * as admin from "firebase-admin";

/**
 * Normaliza y resuelve el prefijo operativo estable de un comercio.
 * Regla:
 * - 3 o 4 caracteres alfanuméricos en MAYÚSCULAS.
 * - Sin espacios ni caracteres especiales.
 * - Si el comercio ya tiene orderCodePrefix o codePrefix válido, se reutiliza.
 * - Si no existe, se genera a partir del nombre comercial y se normaliza.
 */
export function resolveBusinessPrefix(businessData: any, businessId: string): string {
  // 1. Reutilizar si ya existe en el documento del comercio
  const existingPrefix = (businessData?.orderCodePrefix || businessData?.codePrefix || "").toString().trim().toUpperCase();
  const cleanedExisting = existingPrefix.replace(/[^A-Z0-9]/g, "");
  if (cleanedExisting.length >= 2 && cleanedExisting.length <= 4) {
    return cleanedExisting;
  }

  // 2. Generación controlada basada en el nombre
  const rawName = (businessData?.nombre || businessData?.name || businessData?.comercioNombre || "").toString().trim();
  const cleanWords = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
    .replace(/[^A-Za-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  let prefix = "";
  if (cleanWords.length >= 3) {
    prefix = cleanWords.slice(0, 3).map((w: string) => w[0]).join("");
  } else if (cleanWords.length === 2) {
    const w1 = cleanWords[0];
    const w2 = cleanWords[1];
    prefix = (w1.substring(0, 2) + w2.substring(0, 1));
  } else if (cleanWords.length === 1) {
    prefix = cleanWords[0].substring(0, 3);
  }

  if (prefix.length < 3) {
    const fallback = rawName.replace(/[^A-Za-z0-9]/g, "").substring(0, 3) ||
      businessId.replace(/[^A-Za-z0-9]/g, "").substring(0, 3) ||
      "ORD";
    prefix = fallback;
  }

  prefix = prefix.toUpperCase().padEnd(3, "X").substring(0, 4);
  return prefix;
}

/**
 * Formatea un identificador humano completo a partir del prefijo y secuencia.
 * Formato obligatorio: [PREFIJO][SECUENCIA DE 6 DÍGITOS]
 * Ejemplo: FRT000026
 */
export function formatOrderCode(prefix: string, sequence: number): {
  orderCode: string;
  orderShortCode: string;
  orderSequence: number;
  orderCodePrefix: string;
} {
  const cleanPrefix = (prefix || "ORD").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4);
  const safeSeq = Math.max(1, Math.floor(sequence || 1));
  const seqPadded = String(safeSeq).padStart(6, "0");
  const orderCode = `${cleanPrefix}${seqPadded}`;
  const orderShortCode = seqPadded.slice(-4);

  return {
    orderCode,
    orderShortCode,
    orderSequence: safeSeq,
    orderCodePrefix: cleanPrefix,
  };
}

/**
 * Asigna la siguiente secuencia atómica para un comercio dentro de una transacción Firestore.
 */
export async function getNextOrderCodeInTransaction(
  transaction: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  businessId: string,
  businessData?: any
): Promise<{
  orderCode: string;
  orderShortCode: string;
  orderSequence: number;
  orderCodePrefix: string;
}> {
  const counterRef = db.collection("counters").doc(`orders_${businessId}`);
  const counterDoc = await transaction.get(counterRef);

  let prefix = "";
  if (counterDoc.exists && counterDoc.data()?.orderCodePrefix) {
    prefix = counterDoc.data()?.orderCodePrefix;
  } else {
    // Si no está en el contador, consultar el negocio o resolver
    if (!businessData) {
      const bizDoc = await transaction.get(db.collection("businesses").doc(businessId));
      businessData = bizDoc.exists ? bizDoc.data() : {};
    }
    prefix = resolveBusinessPrefix(businessData, businessId);
  }

  const currentSeq = counterDoc.exists ? (Number(counterDoc.data()?.nextSequence) || 1) : 1;
  const sequence = currentSeq;
  const nextSeq = currentSeq + 1;

  const result = formatOrderCode(prefix, sequence);

  transaction.set(
    counterRef,
    {
      businessId,
      orderCodePrefix: prefix,
      lastSequence: sequence,
      nextSequence: nextSeq,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return result;
}
