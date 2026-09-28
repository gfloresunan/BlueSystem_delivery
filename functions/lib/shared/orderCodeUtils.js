"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBusinessPrefix = resolveBusinessPrefix;
exports.formatOrderCode = formatOrderCode;
exports.getNextOrderCodeInTransaction = getNextOrderCodeInTransaction;
const admin = __importStar(require("firebase-admin"));
/**
 * Normaliza y resuelve el prefijo operativo estable de un comercio.
 * Regla:
 * - 3 o 4 caracteres alfanuméricos en MAYÚSCULAS.
 * - Sin espacios ni caracteres especiales.
 * - Si el comercio ya tiene orderCodePrefix o codePrefix válido, se reutiliza.
 * - Si no existe, se genera a partir del nombre comercial y se normaliza.
 */
function resolveBusinessPrefix(businessData, businessId) {
    // 1. Reutilizar si ya existe en el documento del comercio
    const existingPrefix = ((businessData === null || businessData === void 0 ? void 0 : businessData.orderCodePrefix) || (businessData === null || businessData === void 0 ? void 0 : businessData.codePrefix) || "").toString().trim().toUpperCase();
    const cleanedExisting = existingPrefix.replace(/[^A-Z0-9]/g, "");
    if (cleanedExisting.length >= 2 && cleanedExisting.length <= 4) {
        return cleanedExisting;
    }
    // 2. Generación controlada basada en el nombre
    const rawName = ((businessData === null || businessData === void 0 ? void 0 : businessData.nombre) || (businessData === null || businessData === void 0 ? void 0 : businessData.name) || (businessData === null || businessData === void 0 ? void 0 : businessData.comercioNombre) || "").toString().trim();
    const cleanWords = rawName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar tildes
        .replace(/[^A-Za-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);
    let prefix = "";
    if (cleanWords.length >= 3) {
        prefix = cleanWords.slice(0, 3).map((w) => w[0]).join("");
    }
    else if (cleanWords.length === 2) {
        const w1 = cleanWords[0];
        const w2 = cleanWords[1];
        prefix = (w1.substring(0, 2) + w2.substring(0, 1));
    }
    else if (cleanWords.length === 1) {
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
function formatOrderCode(prefix, sequence) {
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
async function getNextOrderCodeInTransaction(transaction, db, businessId, businessData) {
    var _a, _b, _c;
    const counterRef = db.collection("counters").doc(`orders_${businessId}`);
    const counterDoc = await transaction.get(counterRef);
    let prefix = "";
    if (counterDoc.exists && ((_a = counterDoc.data()) === null || _a === void 0 ? void 0 : _a.orderCodePrefix)) {
        prefix = (_b = counterDoc.data()) === null || _b === void 0 ? void 0 : _b.orderCodePrefix;
    }
    else {
        // Si no está en el contador, consultar el negocio o resolver
        if (!businessData) {
            const bizDoc = await transaction.get(db.collection("businesses").doc(businessId));
            businessData = bizDoc.exists ? bizDoc.data() : {};
        }
        prefix = resolveBusinessPrefix(businessData, businessId);
    }
    const currentSeq = counterDoc.exists ? (Number((_c = counterDoc.data()) === null || _c === void 0 ? void 0 : _c.nextSequence) || 1) : 1;
    const sequence = currentSeq;
    const nextSeq = currentSeq + 1;
    const result = formatOrderCode(prefix, sequence);
    transaction.set(counterRef, {
        businessId,
        orderCodePrefix: prefix,
        lastSequence: sequence,
        nextSequence: nextSeq,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return result;
}
//# sourceMappingURL=orderCodeUtils.js.map