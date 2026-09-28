"use strict";
/**
 * BlueSystem Delivery Enterprise — Business Categories Global Platform Master
 * Sovereign Collection: /business_categories/{id} (SSOT)
 *
 * Callables HTTPS para el Admin Web (Gobernanza de Rubros Comerciales)
 *
 * Funcionalidades:
 * 1. adminSaveBusinessCategory: Crea o actualiza un rubro con auditoría atómica.
 * 2. adminToggleBusinessCategoryStatus: Pausa o activa un rubro con auditoría atómica.
 * 3. adminSeedBusinessCategories: Inicializa exactamente los 6 rubros oficiales si la colección está vacía.
 * 4. adminGetBusinessCategories: Consulta autoritativa del catálogo maestro para el panel administrativo.
 */
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
exports.adminGetBusinessCategories = exports.adminSeedBusinessCategories = exports.adminToggleBusinessCategoryStatus = exports.adminSaveBusinessCategory = exports.CANONICAL_SEED_BUSINESS_CATEGORIES = void 0;
exports.generateCanonicalSlug = generateCanonicalSlug;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
exports.CANONICAL_SEED_BUSINESS_CATEGORIES = [
    {
        id: "restaurante",
        name: "Restaurante / Comida",
        icon: "🍔",
        sortOrder: 1,
        active: true,
        showInOnboarding: true,
        legacyAliases: ["Restaurante", "Restaurantes", "restaurante", "RESTAURANT", "Comida Rápida"],
    },
    {
        id: "farmacia",
        name: "Farmacia",
        icon: "💊",
        sortOrder: 2,
        active: true,
        showInOnboarding: true,
        legacyAliases: ["Farmacia", "Farmacias", "farmacia", "PHARMACY"],
    },
    {
        id: "supermercado",
        name: "Supermercado / Mini Super",
        icon: "🛒",
        sortOrder: 3,
        active: true,
        showInOnboarding: true,
        legacyAliases: ["Supermercado", "Supermercados", "supermercado", "SUPERMARKET"],
    },
    {
        id: "licoreria",
        name: "Licorería",
        icon: "🍾",
        sortOrder: 4,
        active: true,
        showInOnboarding: true,
        legacyAliases: ["Licorería", "Licorerias", "licoreria", "LIQUOR_STORE"],
    },
    {
        id: "tienda",
        name: "Tienda / Abarrotes",
        icon: "🏪",
        sortOrder: 5,
        active: true,
        showInOnboarding: true,
        legacyAliases: ["Tienda", "Tiendas", "tienda", "CONVENIENCE"],
    },
    {
        id: "otra",
        name: "Otra categoría",
        icon: "📦",
        sortOrder: 6,
        active: true,
        showInOnboarding: true,
        legacyAliases: ["Otra", "Otras", "otra", "OTHER"],
    },
];
/**
 * Normaliza un nombre a un slug alfanumérico seguro para Document ID.
 */
function generateCanonicalSlug(name) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .substring(0, 40);
}
// ─── 1. CALLABLE: adminSaveBusinessCategory ───────────────────────────────────
exports.adminSaveBusinessCategory = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    const authCtx = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR"],
    }, "adminSaveBusinessCategory");
    if (!data.name || typeof data.name !== "string" || data.name.trim().length < 3) {
        throw new functions.https.HttpsError("invalid-argument", "El nombre del rubro debe tener al menos 3 caracteres.");
    }
    const cleanName = data.name.trim();
    const cleanIcon = (data.icon || "🏷️").trim();
    const cleanOrder = typeof data.sortOrder === "number" ? data.sortOrder : 1;
    const cleanShowInOnboarding = data.showInOnboarding !== false;
    const cleanAliases = Array.isArray(data.legacyAliases)
        ? data.legacyAliases.map((a) => String(a).trim()).filter(Boolean)
        : [];
    const now = FieldValue.serverTimestamp();
    const isEdit = Boolean(data.id && data.id.trim());
    const targetSlug = isEdit ? data.id.trim().toLowerCase() : generateCanonicalSlug(cleanName);
    if (!targetSlug) {
        throw new functions.https.HttpsError("invalid-argument", "No se pudo generar un identificador canónico válido a partir del nombre.");
    }
    const categoryRef = db.collection("business_categories").doc(targetSlug);
    const auditRef = db.collection("audit_events").doc();
    const batch = db.batch();
    const existingDoc = await categoryRef.get();
    if (!isEdit) {
        // ── MODO CREACIÓN ──────────────────────────────────────────────────────
        if (existingDoc.exists) {
            throw new functions.https.HttpsError("already-exists", `Ya existe un rubro comercial con el identificador canónico '${targetSlug}'.`);
        }
        // Preparar alias con inclusión del nombre oficial
        const initialAliases = Array.from(new Set([cleanName, targetSlug, ...cleanAliases]));
        const newCategoryData = {
            id: targetSlug,
            name: cleanName,
            icon: cleanIcon,
            sortOrder: cleanOrder,
            active: true,
            showInOnboarding: cleanShowInOnboarding,
            legacyAliases: initialAliases,
            createdAt: now,
            createdBy: authCtx.uid,
            updatedAt: now,
            updatedBy: authCtx.uid,
        };
        batch.set(categoryRef, newCategoryData);
        // Auditoría Atómica Indivisible
        batch.set(auditRef, {
            eventId: auditRef.id,
            eventType: "BUSINESS_CATEGORY_CREATED",
            entityType: "BUSINESS_CATEGORY",
            entityId: targetSlug,
            actor: {
                uid: authCtx.uid,
                email: ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || "admin@bluesystem.com",
                role: authCtx.role,
            },
            timestamp: now,
            metadata: {
                id: targetSlug,
                name: cleanName,
                icon: cleanIcon,
                sortOrder: cleanOrder,
                showInOnboarding: cleanShowInOnboarding,
            },
        });
        await batch.commit();
        logger_1.Logger.info(`[BUSINESS_CATEGORIES] Creado rubro '${targetSlug}' por admin ${authCtx.uid}`);
        return { success: true, id: targetSlug, action: "CREATED" };
    }
    else {
        // ── MODO EDICIÓN ────────────────────────────────────────────────────────
        if (!existingDoc.exists) {
            throw new functions.https.HttpsError("not-found", `El rubro comercial '${targetSlug}' no existe para modificar.`);
        }
        const existingData = existingDoc.data();
        // Invariante de negocio: si active es false, showInOnboarding DEBE ser false
        const effectiveShowInOnboarding = existingData.active === false ? false : cleanShowInOnboarding;
        const diff = {};
        if (existingData.name !== cleanName)
            diff.name = { oldValue: existingData.name, newValue: cleanName };
        if (existingData.icon !== cleanIcon)
            diff.icon = { oldValue: existingData.icon, newValue: cleanIcon };
        if (existingData.sortOrder !== cleanOrder)
            diff.sortOrder = { oldValue: existingData.sortOrder, newValue: cleanOrder };
        if (existingData.showInOnboarding !== effectiveShowInOnboarding) {
            diff.showInOnboarding = { oldValue: existingData.showInOnboarding, newValue: effectiveShowInOnboarding };
        }
        if (JSON.stringify(existingData.legacyAliases || []) !== JSON.stringify(cleanAliases)) {
            diff.legacyAliases = { oldValue: existingData.legacyAliases || [], newValue: cleanAliases };
        }
        batch.update(categoryRef, {
            name: cleanName,
            icon: cleanIcon,
            sortOrder: cleanOrder,
            showInOnboarding: effectiveShowInOnboarding,
            legacyAliases: cleanAliases.length > 0 ? cleanAliases : existingData.legacyAliases || [cleanName],
            updatedAt: now,
            updatedBy: authCtx.uid,
        });
        // Auditoría Atómica Indivisible
        batch.set(auditRef, {
            eventId: auditRef.id,
            eventType: "BUSINESS_CATEGORY_UPDATED",
            entityType: "BUSINESS_CATEGORY",
            entityId: targetSlug,
            actor: {
                uid: authCtx.uid,
                email: ((_d = (_c = context.auth) === null || _c === void 0 ? void 0 : _c.token) === null || _d === void 0 ? void 0 : _d.email) || "admin@bluesystem.com",
                role: authCtx.role,
            },
            timestamp: now,
            metadata: {
                id: targetSlug,
                diff,
            },
        });
        await batch.commit();
        logger_1.Logger.info(`[BUSINESS_CATEGORIES] Actualizado rubro '${targetSlug}' por admin ${authCtx.uid}`);
        return { success: true, id: targetSlug, action: "UPDATED", diff };
    }
});
// ─── 2. CALLABLE: adminToggleBusinessCategoryStatus ───────────────────────────
exports.adminToggleBusinessCategoryStatus = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const authCtx = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR"],
    }, "adminToggleBusinessCategoryStatus");
    const categoryId = (data.categoryId || "").trim().toLowerCase();
    if (!categoryId) {
        throw new functions.https.HttpsError("invalid-argument", "El identificador categoryId es obligatorio.");
    }
    const categoryRef = db.collection("business_categories").doc(categoryId);
    const existingDoc = await categoryRef.get();
    if (!existingDoc.exists) {
        throw new functions.https.HttpsError("not-found", `El rubro comercial '${categoryId}' no existe.`);
    }
    const targetActive = Boolean(data.active);
    // Invariante de negocio inviolable: Si active es false, showInOnboarding FORZOSAMENTE es false
    const targetShowInOnboarding = targetActive ? (data.showInOnboarding !== false) : false;
    const now = FieldValue.serverTimestamp();
    const auditRef = db.collection("audit_events").doc();
    const batch = db.batch();
    batch.update(categoryRef, {
        active: targetActive,
        showInOnboarding: targetShowInOnboarding,
        updatedAt: now,
        updatedBy: authCtx.uid,
    });
    const eventType = targetActive ? "BUSINESS_CATEGORY_ACTIVATED" : "BUSINESS_CATEGORY_DEACTIVATED";
    batch.set(auditRef, {
        eventId: auditRef.id,
        eventType,
        entityType: "BUSINESS_CATEGORY",
        entityId: categoryId,
        actor: {
            uid: authCtx.uid,
            email: ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || "admin@bluesystem.com",
            role: authCtx.role,
        },
        timestamp: now,
        metadata: {
            categoryId,
            active: targetActive,
            showInOnboarding: targetShowInOnboarding,
        },
    });
    await batch.commit();
    logger_1.Logger.info(`[BUSINESS_CATEGORIES] Estado de '${categoryId}' cambiado a active=${targetActive} por ${authCtx.uid}`);
    return { success: true, categoryId, active: targetActive, showInOnboarding: targetShowInOnboarding };
});
// ─── 3. CALLABLE: adminSeedBusinessCategories ─────────────────────────────────
exports.adminSeedBusinessCategories = functions.https.onCall(async (_data, context) => {
    var _a, _b;
    const authCtx = (0, validator_1.validateCallableContext)(context, _data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN"],
    }, "adminSeedBusinessCategories");
    const snapshot = await db.collection("business_categories").get();
    if (!snapshot.empty) {
        return {
            success: true,
            seeded: false,
            message: `La colección /business_categories ya contiene ${snapshot.size} rubros. No se requiere inicialización.`,
            existingCount: snapshot.size,
        };
    }
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    const auditRef = db.collection("audit_events").doc();
    for (const cat of exports.CANONICAL_SEED_BUSINESS_CATEGORIES) {
        const docRef = db.collection("business_categories").doc(cat.id);
        batch.set(docRef, Object.assign(Object.assign({}, cat), { createdAt: now, createdBy: authCtx.uid, updatedAt: now, updatedBy: authCtx.uid }));
    }
    batch.set(auditRef, {
        eventId: auditRef.id,
        eventType: "BUSINESS_CATEGORY_CREATED",
        entityType: "BUSINESS_CATEGORY",
        entityId: "INITIAL_SEED_BATCH",
        actor: {
            uid: authCtx.uid,
            email: ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || "admin@bluesystem.com",
            role: authCtx.role,
        },
        timestamp: now,
        metadata: {
            seededCategoriesCount: exports.CANONICAL_SEED_BUSINESS_CATEGORIES.length,
            categories: exports.CANONICAL_SEED_BUSINESS_CATEGORIES.map((c) => c.id),
        },
    });
    await batch.commit();
    logger_1.Logger.info(`[BUSINESS_CATEGORIES] Inicializado seed inicial de 6 rubros por ${authCtx.uid}`);
    return {
        success: true,
        seeded: true,
        count: exports.CANONICAL_SEED_BUSINESS_CATEGORIES.length,
        categories: exports.CANONICAL_SEED_BUSINESS_CATEGORIES.map((c) => c.id),
    };
});
// ─── 4. CALLABLE: adminGetBusinessCategories ──────────────────────────────────
exports.adminGetBusinessCategories = functions.https.onCall(async (_data, context) => {
    (0, validator_1.validateCallableContext)(context, _data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR", "OPERATOR"],
    }, "adminGetBusinessCategories");
    const snap = await db.collection("business_categories").orderBy("sortOrder", "asc").get();
    const categories = [];
    snap.forEach((doc) => {
        categories.push(Object.assign({ id: doc.id }, doc.data()));
    });
    return { success: true, count: categories.length, categories };
});
//# sourceMappingURL=businessCategories.js.map