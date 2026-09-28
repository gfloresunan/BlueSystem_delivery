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

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";
import { validateCallableContext } from "../shared/middleware/validator";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BusinessCategory {
  readonly id: string;
  name: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  showInOnboarding: boolean;
  legacyAliases: string[];
  readonly createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  readonly createdBy: string;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedBy: string;
}

export const CANONICAL_SEED_BUSINESS_CATEGORIES: Omit<BusinessCategory, "createdAt" | "updatedAt" | "createdBy" | "updatedBy">[] = [
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
export function generateCanonicalSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 40);
}

// ─── 1. CALLABLE: adminSaveBusinessCategory ───────────────────────────────────

export const adminSaveBusinessCategory = functions.https.onCall(
  async (
    data: {
      id?: string;
      name: string;
      icon: string;
      sortOrder: number;
      showInOnboarding?: boolean;
      legacyAliases?: string[];
    },
    context
  ) => {
    const authCtx = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR"],
      },
      "adminSaveBusinessCategory"
    );

    if (!data.name || typeof data.name !== "string" || data.name.trim().length < 3) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El nombre del rubro debe tener al menos 3 caracteres."
      );
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
    const targetSlug = isEdit ? data.id!.trim().toLowerCase() : generateCanonicalSlug(cleanName);

    if (!targetSlug) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "No se pudo generar un identificador canónico válido a partir del nombre."
      );
    }

    const categoryRef = db.collection("business_categories").doc(targetSlug);
    const auditRef = db.collection("audit_events").doc();
    const batch = db.batch();

    const existingDoc = await categoryRef.get();

    if (!isEdit) {
      // ── MODO CREACIÓN ──────────────────────────────────────────────────────
      if (existingDoc.exists) {
        throw new functions.https.HttpsError(
          "already-exists",
          `Ya existe un rubro comercial con el identificador canónico '${targetSlug}'.`
        );
      }

      // Preparar alias con inclusión del nombre oficial
      const initialAliases = Array.from(new Set([cleanName, targetSlug, ...cleanAliases]));

      const newCategoryData: BusinessCategory = {
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
          email: context.auth?.token?.email || "admin@bluesystem.com",
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

      Logger.info(`[BUSINESS_CATEGORIES] Creado rubro '${targetSlug}' por admin ${authCtx.uid}`);
      return { success: true, id: targetSlug, action: "CREATED" };
    } else {
      // ── MODO EDICIÓN ────────────────────────────────────────────────────────
      if (!existingDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `El rubro comercial '${targetSlug}' no existe para modificar.`
        );
      }

      const existingData = existingDoc.data() as BusinessCategory;

      // Invariante de negocio: si active es false, showInOnboarding DEBE ser false
      const effectiveShowInOnboarding = existingData.active === false ? false : cleanShowInOnboarding;

      const diff: Record<string, { oldValue: any; newValue: any }> = {};
      if (existingData.name !== cleanName) diff.name = { oldValue: existingData.name, newValue: cleanName };
      if (existingData.icon !== cleanIcon) diff.icon = { oldValue: existingData.icon, newValue: cleanIcon };
      if (existingData.sortOrder !== cleanOrder) diff.sortOrder = { oldValue: existingData.sortOrder, newValue: cleanOrder };
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
          email: context.auth?.token?.email || "admin@bluesystem.com",
          role: authCtx.role,
        },
        timestamp: now,
        metadata: {
          id: targetSlug,
          diff,
        },
      });

      await batch.commit();

      Logger.info(`[BUSINESS_CATEGORIES] Actualizado rubro '${targetSlug}' por admin ${authCtx.uid}`);
      return { success: true, id: targetSlug, action: "UPDATED", diff };
    }
  }
);

// ─── 2. CALLABLE: adminToggleBusinessCategoryStatus ───────────────────────────

export const adminToggleBusinessCategoryStatus = functions.https.onCall(
  async (
    data: {
      categoryId: string;
      active: boolean;
      showInOnboarding?: boolean;
    },
    context
  ) => {
    const authCtx = validateCallableContext(
      context,
      data,
      {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR"],
      },
      "adminToggleBusinessCategoryStatus"
    );

    const categoryId = (data.categoryId || "").trim().toLowerCase();
    if (!categoryId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El identificador categoryId es obligatorio."
      );
    }

    const categoryRef = db.collection("business_categories").doc(categoryId);
    const existingDoc = await categoryRef.get();

    if (!existingDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `El rubro comercial '${categoryId}' no existe.`
      );
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
        email: context.auth?.token?.email || "admin@bluesystem.com",
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

    Logger.info(`[BUSINESS_CATEGORIES] Estado de '${categoryId}' cambiado a active=${targetActive} por ${authCtx.uid}`);
    return { success: true, categoryId, active: targetActive, showInOnboarding: targetShowInOnboarding };
  }
);

// ─── 3. CALLABLE: adminSeedBusinessCategories ─────────────────────────────────

export const adminSeedBusinessCategories = functions.https.onCall(
  async (_data: Record<string, unknown>, context) => {
    const authCtx = validateCallableContext(
      context,
      _data,
      {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN"],
      },
      "adminSeedBusinessCategories"
    );

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

    for (const cat of CANONICAL_SEED_BUSINESS_CATEGORIES) {
      const docRef = db.collection("business_categories").doc(cat.id);
      batch.set(docRef, {
        ...cat,
        createdAt: now,
        createdBy: authCtx.uid,
        updatedAt: now,
        updatedBy: authCtx.uid,
      });
    }

    batch.set(auditRef, {
      eventId: auditRef.id,
      eventType: "BUSINESS_CATEGORY_CREATED",
      entityType: "BUSINESS_CATEGORY",
      entityId: "INITIAL_SEED_BATCH",
      actor: {
        uid: authCtx.uid,
        email: context.auth?.token?.email || "admin@bluesystem.com",
        role: authCtx.role,
      },
      timestamp: now,
      metadata: {
        seededCategoriesCount: CANONICAL_SEED_BUSINESS_CATEGORIES.length,
        categories: CANONICAL_SEED_BUSINESS_CATEGORIES.map((c) => c.id),
      },
    });

    await batch.commit();

    Logger.info(`[BUSINESS_CATEGORIES] Inicializado seed inicial de 6 rubros por ${authCtx.uid}`);
    return {
      success: true,
      seeded: true,
      count: CANONICAL_SEED_BUSINESS_CATEGORIES.length,
      categories: CANONICAL_SEED_BUSINESS_CATEGORIES.map((c) => c.id),
    };
  }
);

// ─── 4. CALLABLE: adminGetBusinessCategories ──────────────────────────────────

export const adminGetBusinessCategories = functions.https.onCall(
  async (_data: Record<string, unknown>, context) => {
    validateCallableContext(
      context,
      _data,
      {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR", "OPERATOR"],
      },
      "adminGetBusinessCategories"
    );

    const snap = await db.collection("business_categories").orderBy("sortOrder", "asc").get();
    const categories: any[] = [];

    snap.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, count: categories.length, categories };
  }
);
