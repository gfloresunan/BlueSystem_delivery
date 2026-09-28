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
exports.syncExistingBusinesses = exports.onUserStoreWrite = void 0;
exports.projectSingleStore = projectSingleStore;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const VALID_BUSINESS_ROLES = new Set([
    "business",
    "comercio",
    "restaurant",
    "merchant",
]);
/**
 * Auxiliar: Extrae y proyecta un comercio individual desde /users a /businesses y /branches.
 */
async function projectSingleStore(userId, data) {
    const isDeletedDoc = !data || data.status === "DELETED" || data.lifecycleStatus === "DELETED" || data.lifecycleStatus === "DEPROVISIONED" || data.isDeleted === true;
    if (isDeletedDoc) {
        // Si el documento fue eliminado explícitamente, borrar su proyección en /businesses y sus sucursales
        await db.collection("businesses").doc(userId).delete().catch(() => null);
        const oldBranchesSnap = await db.collection("branches").where("businessId", "==", userId).get();
        const batch = db.batch();
        oldBranchesSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit().catch(() => null);
        return;
    }
    // ── REGLA CRÍTICA EIAM: USER ≠ BUSINESS ───────────────────────────────────
    // NUNCA proyectar usuarios EIAM, propietarios (MERCHANT_OWNER / OWNER), administradores,
    // repartidores ni clientes hacia la colección /businesses.
    const rawRole = (data.eiamRole || data.role || data.rol || data.userType || "").toString().toLowerCase().trim();
    const isEiamOrUserIdentity = Boolean(data.eiamRole ||
        data.businessId ||
        data.orgId ||
        data.branchId ||
        data.membershipId ||
        data.tenantId ||
        [
            "merchant_owner",
            "owner",
            "manager",
            "cashier",
            "cook",
            "driver",
            "courier",
            "admin",
            "super_admin",
            "superadmin",
            "auditor",
            "support",
            "soporte",
            "client",
            "customer",
            "user",
            "usuario"
        ].includes(rawRole));
    if (isEiamOrUserIdentity) {
        // ── BLINDAJE CANÓNICO (BSD-IR-2026-0907-01) ──────────────────────────────
        // NUNCA clasificar como "spurious" ni eliminar un comercio legítimo por ausencia
        // de applicationId, coincidencia de nombre o coincidencia de businessId.
        const existingBizDoc = await db.collection("businesses").doc(userId).get();
        if (existingBizDoc.exists) {
            const bizData = existingBizDoc.data() || {};
            // 1. Verificar estado activo en /businesses
            const isBizActive = bizData.active !== false && bizData.isActive !== false && bizData.status !== "DELETED" && bizData.lifecycleStatus !== "DELETED" && bizData.lifecycleStatus !== "DEPROVISIONED";
            // 2. Verificar si tiene sucursales registradas en /branches
            const branchesSnap = await db.collection("branches").where("businessId", "==", userId).limit(1).get();
            const hasBranches = !branchesSnap.empty;
            // 3. Verificar si tiene membresía EIAM en /membership
            const memSnap = await db.collection("membership").where("businessId", "==", userId).limit(1).get();
            const hasMembership = !memSnap.empty;
            // 4. Verificar si la entidad en /users conserva identidad o rol comercial
            const isOwnerOrLegacyMerchant = (data.role === "business" ||
                data.rol === "business" ||
                data.userType === "business" ||
                Boolean(data.comercioNombre) ||
                Array.isArray(data.branches));
            // Si existe CUALQUIER indicio de negocio legítimo, ABORTAR cualquier eliminación
            if (isBizActive || hasBranches || hasMembership || isOwnerOrLegacyMerchant) {
                console.log(`[BUSINESS_PROJECTION_SHIELD] userId=${userId} es un negocio legítimo en /businesses (active=${isBizActive}, branches=${hasBranches}, membership=${hasMembership}, legacyMerchant=${isOwnerOrLegacyMerchant}). ABORTANDO DELETE.`);
                return;
            }
            // 5. Solamente permitir delete cuando exista evidencia inequívoca de proyección espuria generada automáticamente
            const isExplicitSpurious = bizData.isAutoProjected === true && !hasBranches && !hasMembership && !isBizActive;
            if (isExplicitSpurious) {
                console.warn(`[BUSINESS_PROJECTION] Eliminando proyección espuria confirmada para userId=${userId}`);
                await db.collection("businesses").doc(userId).delete().catch(() => null);
            }
        }
        return;
    }
    const roleStr = (data.rol || data.role || data.userType || "").toString().toLowerCase();
    const isBusinessDoc = VALID_BUSINESS_ROLES.has(roleStr) || Boolean(data.comercioNombre) || Array.isArray(data.branches);
    if (!isBusinessDoc) {
        return;
    }
    const isActive = data.active !== false && data.isActive !== false;
    const nombre = data.comercioNombre || data.nombre || data.name || "Comercio Sin Nombre";
    const logoUrl = data.logoUrl || data.photoUrl || data.logo || "";
    const bannerUrl = data.bannerUrl || data.portadaUrl || data.coverUrl || "";
    const categoria = data.categoria || data.category || "Restaurante";
    const description = data.descripcion || data.description || "";
    const rawCount = data.ratingCount;
    const ratingCount = typeof rawCount === "number" ? rawCount : (rawCount ? Number(rawCount) : 0);
    const rawRating = data.averageRating !== undefined ? data.averageRating : data.rating;
    const rating = ratingCount > 0 ? Number(rawRating || 0) : 0;
    const deliveryFee = Number(data.deliveryFee || data.costoEnvioBase || 35);
    const estimatedDeliveryTime = Number(data.avgPrepTimeMinutes || data.tiempoEstimadoMinutos || 15);
    const isOpen = data.isOpen === true || data.abierto === true;
    const isFeatured = data.isFeatured !== undefined
        ? Boolean(data.isFeatured)
        : (data.featured !== undefined ? Boolean(data.featured) : (data.destacado === true));
    const geo = (0, geoCatalog_1.normalizeGeoLocation)(data.departmentId || data.departamento || data.department, data.municipalityId || data.municipio || data.municipality || data.city || data.ciudad);
    const latVal = Number(data.latitude || (data.location && data.location.latitude) || data.lat || 0);
    const lngVal = Number(data.longitude || (data.location && data.location.longitude) || data.lng || 0);
    const googleMapsUrl = data.googleMapsUrl || ((latVal !== 0 && lngVal !== 0) ? `https://www.google.com/maps/search/?api=1&query=${latVal},${lngVal}` : "");
    const placeId = data.placeId || "";
    const address = data.address || data.direccion || "";
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
        address: address,
        direccion: address,
        departmentId: geo.departmentId,
        departmentName: geo.departmentName,
        municipalityId: geo.municipalityId,
        municipalityName: geo.municipalityName,
        cityId: geo.municipalityId,
        city: geo.municipalityName,
        latitude: latVal,
        longitude: lngVal,
        lat: latVal,
        lng: lngVal,
        location: (latVal !== 0 && lngVal !== 0) ? { latitude: latVal, longitude: lngVal } : null,
        googleMapsUrl: googleMapsUrl,
        placeId: placeId,
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
        featured: isFeatured,
        destacado: isFeatured,
        updatedAt: FieldValue.serverTimestamp(),
    };
    // 1. Escribir o actualizar /businesses/{userId}
    await db.collection("businesses").doc(userId).set(publicBusinessDto, { merge: true });
    // 2. Proyección de sucursales a /branches
    const branchesArray = Array.isArray(data.branches) ? data.branches : [];
    const existingBranchesSnap = await db.collection("branches").where("businessId", "==", userId).get();
    const currentBranchIds = new Set();
    const branchBatch = db.batch();
    branchesArray.forEach((b, index) => {
        const branchId = b.id || `${userId}_br_${index}`;
        currentBranchIds.add(branchId);
        const branchRef = db.collection("branches").doc(branchId);
        const isBranchActive = isActive && b.active !== false;
        const branchGeo = (0, geoCatalog_1.normalizeGeoLocation)(b.departmentId || b.departamento || geo.departmentId, b.municipalityId || b.municipio || b.city || geo.municipalityId);
        const branchDto = {
            id: branchId,
            branchId: branchId,
            businessId: userId,
            businessName: nombre,
            branchName: b.name || b.branchName || `Sucursal ${index + 1}`,
            name: b.name || b.branchName || `Sucursal ${index + 1}`,
            departmentId: branchGeo.departmentId,
            departmentName: branchGeo.departmentName,
            municipalityId: branchGeo.municipalityId,
            municipalityName: branchGeo.municipalityName,
            cityId: branchGeo.municipalityId,
            city: branchGeo.municipalityName,
            address: b.address || b.direccion || "",
            phone: b.phone || b.telefono || "",
            lat: Number(b.lat || b.latitude || 0),
            lng: Number(b.lng || b.longitude || 0),
            prepTimeMinutes: Number(b.prepTimeMinutes || estimatedDeliveryTime),
            isOpen: b.isOpen !== false,
            rating: Number(b.rating || rating),
            active: isBranchActive,
            isActive: isBranchActive,
            updatedAt: FieldValue.serverTimestamp(),
        };
        branchBatch.set(branchRef, branchDto, { merge: true });
    });
    // Limpiar sucursales que ya no existan en el arreglo
    existingBranchesSnap.docs.forEach((doc) => {
        if (!currentBranchIds.has(doc.id)) {
            branchBatch.delete(doc.ref);
        }
    });
    await branchBatch.commit();
}
/**
 * Trigger: Proyección Automática en Vivo de /users/{userId} a /businesses/{userId} y /branches
 */
exports.onUserStoreWrite = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    if (!change.after.exists) {
        await projectSingleStore(userId, null);
        return null;
    }
    const data = change.after.data();
    await projectSingleStore(userId, data);
    return null;
});
/**
 * Callable Function: Ejecuta la sincronización inicial masiva para comercios existentes en /users
 * Protegida con autenticación y rol de Administrador de Plataforma.
 */
exports.syncExistingBusinesses = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debe estar autenticado para ejecutar esta función.");
    }
    const token = context.auth.token || {};
    const role = (token.role || token.rol || "").toString().toLowerCase();
    const isAdmin = token.admin === true ||
        token.isSuperAdmin === true ||
        ["admin", "super_admin", "auditor"].includes(role);
    if (!isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Acceso denegado. Se requieren privilegios de Administrador de Plataforma para ejecutar la sincronización masiva.");
    }
    const usersSnap = await db.collection("users").get();
    let count = 0;
    for (const doc of usersSnap.docs) {
        const docData = doc.data();
        const roleStr = (docData.rol || docData.role || docData.userType || "").toString().toLowerCase();
        const isBiz = VALID_BUSINESS_ROLES.has(roleStr) || Boolean(docData.comercioNombre) || Array.isArray(docData.branches);
        if (isBiz) {
            await projectSingleStore(doc.id, docData);
            count++;
        }
    }
    return {
        success: true,
        processedStores: count,
        message: `Sincronizados ${count} comercios desde /users hacia /businesses y /branches.`,
    };
});
//# sourceMappingURL=businessProjection.js.map