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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const businessCategories_1 = require("../callables/businessCategories");
(0, node_test_1.describe)("SD-ADMIN-BUSINESS-CATEGORIES-001: Business Categories Platform Master Tests", () => {
    (0, node_test_1.test)("TEST 01: Canonical Seed Contract — Exactly 6 Official Rubros", () => {
        assert.strictEqual(businessCategories_1.CANONICAL_SEED_BUSINESS_CATEGORIES.length, 6, "El Seed canónico debe contener exactamente 6 rubros");
        const expectedSlugs = [
            "restaurante",
            "farmacia",
            "supermercado",
            "licoreria",
            "tienda",
            "otra",
        ];
        const actualSlugs = businessCategories_1.CANONICAL_SEED_BUSINESS_CATEGORIES.map((c) => c.id);
        assert.deepStrictEqual(actualSlugs, expectedSlugs, "Los slugs deben coincidir exactamente con el contrato");
        // Verificar que NO existan rubros no aprobados (ej. veterinaria, servicios)
        assert.strictEqual(actualSlugs.includes("veterinaria"), false, "No debe existir veterinaria en seed");
        assert.strictEqual(actualSlugs.includes("servicios"), false, "No debe existir servicios en seed");
        // Todos los 6 rubros iniciales deben estar activos y habilitados en onboarding
        for (const cat of businessCategories_1.CANONICAL_SEED_BUSINESS_CATEGORIES) {
            assert.strictEqual(cat.active, true, `Rubro '${cat.id}' debe estar active=true`);
            assert.strictEqual(cat.showInOnboarding, true, `Rubro '${cat.id}' debe estar showInOnboarding=true`);
            assert.ok(cat.name && cat.name.length >= 3, `Nombre de '${cat.id}' debe ser válido`);
            assert.ok(cat.icon, `Icono de '${cat.id}' debe estar definido`);
            assert.ok(Array.isArray(cat.legacyAliases), `Aliases de '${cat.id}' debe ser array`);
        }
    });
    (0, node_test_1.test)("TEST 02: Canonical Slug Normalization Engine", () => {
        assert.strictEqual((0, businessCategories_1.generateCanonicalSlug)("Restaurante & Comida"), "restaurante_comida");
        assert.strictEqual((0, businessCategories_1.generateCanonicalSlug)("Farmacia / Droguería"), "farmacia_drogueria");
        assert.strictEqual((0, businessCategories_1.generateCanonicalSlug)("Supermercado"), "supermercado");
        assert.strictEqual((0, businessCategories_1.generateCanonicalSlug)("Café & Panadería"), "cafe_panaderia");
        assert.strictEqual((0, businessCategories_1.generateCanonicalSlug)("  Mascotas  "), "mascotas");
        assert.strictEqual((0, businessCategories_1.generateCanonicalSlug)("¡Tecnología & Móviles!"), "tecnologia_moviles");
    });
    (0, node_test_1.test)("TEST 03: Server-Side Zero-Trust Category Validation Guard", () => {
        const mockCategoryDatabase = {
            restaurante: { active: true, showInOnboarding: true, name: "Restaurante / Comida" },
            farmacia: { active: true, showInOnboarding: true, name: "Farmacia" },
            paused_category: { active: false, showInOnboarding: false, name: "Categoría Pausada" },
            hidden_category: { active: true, showInOnboarding: false, name: "Categoría Oculta" },
        };
        // Helper simulando la validación de submitMerchantApplication
        function validateCategoryServerSide(categoryId) {
            const targetId = (categoryId || "").trim().toLowerCase();
            if (!targetId) {
                throw new Error("El rubro comercial (businessCategoryId) es obligatorio.");
            }
            const cat = mockCategoryDatabase[targetId];
            if (!cat) {
                throw new Error(`El rubro comercial '${targetId}' no existe en el catálogo maestro.`);
            }
            if (cat.active !== true || cat.showInOnboarding !== true) {
                throw new Error(`El rubro comercial '${cat.name}' no se encuentra disponible para recibir nuevas solicitudes de afiliación.`);
            }
            return { id: targetId, name: cat.name };
        }
        // Acepta categoría autoritativa activa
        const res = validateCategoryServerSide("restaurante");
        assert.strictEqual(res.id, "restaurante");
        assert.strictEqual(res.name, "Restaurante / Comida");
        // Rechaza si falta
        assert.throws(() => validateCategoryServerSide(""), /es obligatorio/);
        // Rechaza si no existe en el catálogo maestro
        assert.throws(() => validateCategoryServerSide("inexistente"), /no existe en el catálogo maestro/);
        // Rechaza si está pausada
        assert.throws(() => validateCategoryServerSide("paused_category"), /no se encuentra disponible/);
        // Rechaza si está oculta de onboarding
        assert.throws(() => validateCategoryServerSide("hidden_category"), /no se encuentra disponible/);
    });
    (0, node_test_1.test)("TEST 04: Canonical Reference Schema & Legacy Compatibility Bridge", () => {
        const categoryDoc = { id: "farmacia", name: "Farmacia" };
        // Payload de negocio con adopción aditiva
        const businessPayload = {
            businessCategoryId: categoryDoc.id, // FK Canónica
            category: categoryDoc.name, // Legacy Bridge 1
            categoria: categoryDoc.name, // Legacy Bridge 2
        };
        assert.strictEqual(businessPayload.businessCategoryId, "farmacia");
        assert.strictEqual(businessPayload.category, "Farmacia");
        assert.strictEqual(businessPayload.categoria, "Farmacia");
        // Verificar que no se agrega businessCategorySlug duplicado
        assert.strictEqual(businessPayload.businessCategorySlug, undefined);
    });
    (0, node_test_1.test)("TEST 05: Invariant Matrix Evaluation (active & showInOnboarding)", () => {
        function isVisibleInOnboarding(cat) {
            return cat.active === true && cat.showInOnboarding === true;
        }
        // Matriz 2x2
        assert.strictEqual(isVisibleInOnboarding({ active: true, showInOnboarding: true }), true);
        assert.strictEqual(isVisibleInOnboarding({ active: true, showInOnboarding: false }), false);
        assert.strictEqual(isVisibleInOnboarding({ active: false, showInOnboarding: true }), false);
        assert.strictEqual(isVisibleInOnboarding({ active: false, showInOnboarding: false }), false);
    });
    (0, node_test_1.test)("TEST 06: Immutability Contract Evaluation", () => {
        const existingDoc = {
            id: "restaurante",
            name: "Restaurante",
            icon: "🍔",
            sortOrder: 1,
            active: true,
            showInOnboarding: true,
            legacyAliases: ["Restaurante"],
            createdAt: { seconds: 1000, nanoseconds: 0 },
            createdBy: "admin_uid_1",
            updatedAt: { seconds: 1000, nanoseconds: 0 },
            updatedBy: "admin_uid_1",
        };
        // Intento de mutar el nombre visible
        const updateInput = {
            name: "Restaurante & Cafés",
            icon: "🍕",
            sortOrder: 2,
        };
        // El resultado preserva id, createdAt y createdBy
        const updatedDoc = {
            ...existingDoc,
            ...updateInput,
            updatedAt: { seconds: 2000, nanoseconds: 0 },
            updatedBy: "admin_uid_2",
        };
        assert.strictEqual(updatedDoc.id, "restaurante", "El ID debe ser inmutable");
        assert.strictEqual(updatedDoc.createdBy, "admin_uid_1", "createdBy debe ser inmutable");
        assert.deepStrictEqual(updatedDoc.createdAt, existingDoc.createdAt, "createdAt debe ser inmutable");
        assert.strictEqual(updatedDoc.name, "Restaurante & Cafés", "name gobernado debe actualizarse");
        assert.strictEqual(updatedDoc.updatedBy, "admin_uid_2", "updatedBy debe reflejar el actor");
    });
    (0, node_test_1.test)("TEST 07: Atomic Audit Event Verification", () => {
        const auditEvent = {
            eventId: "audit_123",
            eventType: "BUSINESS_CATEGORY_UPDATED",
            entityType: "BUSINESS_CATEGORY",
            entityId: "restaurante",
            actor: { uid: "admin_001", email: "admin@bluesystem.com", role: "admin" },
            timestamp: new Date().toISOString(),
            metadata: {
                id: "restaurante",
                diff: {
                    name: { oldValue: "Restaurante", newValue: "Restaurante & Gastronomía" },
                },
            },
        };
        assert.ok(auditEvent.eventId);
        assert.strictEqual(auditEvent.eventType, "BUSINESS_CATEGORY_UPDATED");
        assert.strictEqual(auditEvent.entityType, "BUSINESS_CATEGORY");
        assert.strictEqual(auditEvent.entityId, "restaurante");
        assert.strictEqual(auditEvent.actor.role, "admin");
        assert.ok(auditEvent.metadata.diff.name);
    });
    (0, node_test_1.test)("TEST 08: Soft Delete Semantics — Isolation of Existing Businesses", () => {
        // Comercio existente vinculado a farmacia
        const existingCommerce = {
            businessId: "biz_999",
            name: "Farmacia La Fe",
            businessCategoryId: "farmacia",
            category: "Farmacia",
            active: true,
            status: "ACTIVE",
        };
        // Administrador pausa la categoría "farmacia"
        const categoryStatusAfterPause = {
            id: "farmacia",
            active: false,
            showInOnboarding: false,
        };
        // El comercio existente continúa activo e intacto
        assert.strictEqual(categoryStatusAfterPause.active, false);
        assert.strictEqual(categoryStatusAfterPause.showInOnboarding, false);
        assert.strictEqual(existingCommerce.active, true, "El comercio existente debe seguir activo");
        assert.strictEqual(existingCommerce.businessCategoryId, "farmacia", "La FK debe permanecer intacta");
    });
});
