"use strict";
/**
 * BlueSystem Delivery Enterprise — Unit Tests: Loyalty & Rewards Engine
 * Validates pure FIFO allocation, level calculation, points consistency, combo validation, and backward compatibility.
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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const loyaltyEngine_1 = require("../domain/loyalty/loyaltyEngine");
(0, node_test_1.describe)("Loyalty Engine — FIFO Allocation Policy & Consistency", () => {
    const sampleLevels = [
        {
            id: "bronce",
            name: "Bronce",
            description: "Nivel inicial de bienvenida",
            minPoints: 0,
            maxPoints: 499,
            benefits: ["Acumula 10 pts por pedido"],
            icon: "🥉",
            sortOrder: 1,
            active: true,
        },
        {
            id: "plata",
            name: "Plata",
            description: "Cliente frecuente",
            minPoints: 500,
            maxPoints: 999,
            benefits: ["5% de descuento en comercios seleccionados"],
            icon: "🥈",
            sortOrder: 2,
            active: true,
        },
        {
            id: "oro",
            name: "Oro",
            description: "Cliente VIP",
            minPoints: 1000,
            maxPoints: 1999,
            benefits: ["Atención prioritaria", "Ofertas exclusivas"],
            icon: "🥇",
            sortOrder: 3,
            active: true,
        },
        {
            id: "platino",
            name: "Platino",
            description: "Cliente Elite",
            minPoints: 2000,
            maxPoints: 4999,
            benefits: ["Delivery gratis mensual", "Acceso a eventos"],
            icon: "🏆",
            sortOrder: 4,
            active: true,
        },
        {
            id: "diamante",
            name: "Diamante",
            description: "Máxima categoría",
            minPoints: 5000,
            maxPoints: 0, // Sin tope
            benefits: ["Beneficios ilimitados"],
            icon: "💎",
            sortOrder: 5,
            active: true,
        },
    ];
    (0, node_test_1.test)("FIFO Allocation: Consumes from oldest merchant first (Fritoni 20, Chanchito 10 -> Consume 10)", () => {
        const merchants = [
            { businessId: "fritoni", businessName: "Fritoni", pointsBalance: 20 },
            { businessId: "chanchito", businessName: "El Chanchito", pointsBalance: 10 },
        ];
        const result = (0, loyaltyEngine_1.calculateFifoAllocation)(merchants, 10);
        assert.strictEqual(result.isSufficient, true);
        assert.strictEqual(result.totalAllocated, 10);
        assert.deepStrictEqual(result.allocations, [
            { businessId: "fritoni", businessName: "Fritoni", points: 10 },
        ]);
        assert.strictEqual(result.remainingBalances.get("fritoni"), 10);
        assert.strictEqual(result.remainingBalances.get("chanchito"), 10);
        // Sum of remaining = 20 (consistent with 30 - 10)
        const sumRemaining = Array.from(result.remainingBalances.values()).reduce((a, b) => a + b, 0);
        assert.strictEqual(sumRemaining, 20);
    });
    (0, node_test_1.test)("FIFO Allocation: Consumes across multiple merchants when first is exhausted (Fritoni 20, Chanchito 10 -> Consume 25)", () => {
        const merchants = [
            { businessId: "fritoni", businessName: "Fritoni", pointsBalance: 20 },
            { businessId: "chanchito", businessName: "El Chanchito", pointsBalance: 10 },
        ];
        const result = (0, loyaltyEngine_1.calculateFifoAllocation)(merchants, 25);
        assert.strictEqual(result.isSufficient, true);
        assert.strictEqual(result.totalAllocated, 25);
        assert.deepStrictEqual(result.allocations, [
            { businessId: "fritoni", businessName: "Fritoni", points: 20 },
            { businessId: "chanchito", businessName: "El Chanchito", points: 5 },
        ]);
        assert.strictEqual(result.remainingBalances.get("fritoni"), 0);
        assert.strictEqual(result.remainingBalances.get("chanchito"), 5);
        // Sum of remaining = 5 (consistent with 30 - 25)
        const sumRemaining = Array.from(result.remainingBalances.values()).reduce((a, b) => a + b, 0);
        assert.strictEqual(sumRemaining, 5);
    });
    (0, node_test_1.test)("FIFO Allocation: Rejects when required points exceed total available", () => {
        const merchants = [
            { businessId: "fritoni", businessName: "Fritoni", pointsBalance: 10 },
            { businessId: "chanchito", businessName: "El Chanchito", pointsBalance: 10 },
        ];
        const result = (0, loyaltyEngine_1.calculateFifoAllocation)(merchants, 50);
        assert.strictEqual(result.isSufficient, false);
        assert.strictEqual(result.totalAllocated, 0);
        assert.deepStrictEqual(result.allocations, []);
    });
    (0, node_test_1.test)("Customer Level: Determined by lifetimePointsEarned, not available points", () => {
        // Caso: Cliente ganó 2,000 puntos en total (Platino) pero canjeó 1,500 y le quedan 500 disponibles
        const lifetimeEarned = 2000;
        const levelResult = (0, loyaltyEngine_1.determineCustomerLevel)(lifetimeEarned, sampleLevels);
        assert.ok(levelResult.currentLevel !== null);
        assert.strictEqual(levelResult.currentLevel?.name, "Platino");
        assert.strictEqual(levelResult.nextLevel?.name, "Diamante");
        assert.strictEqual(levelResult.pointsToNext, 3000); // 5000 - 2000
    });
    (0, node_test_1.test)("Customer Level: Correct progression at boundaries", () => {
        // 0 pts -> Bronce
        assert.strictEqual((0, loyaltyEngine_1.determineCustomerLevel)(0, sampleLevels).currentLevel?.name, "Bronce");
        // 499 pts -> Bronce
        assert.strictEqual((0, loyaltyEngine_1.determineCustomerLevel)(499, sampleLevels).currentLevel?.name, "Bronce");
        // 500 pts -> Plata
        assert.strictEqual((0, loyaltyEngine_1.determineCustomerLevel)(500, sampleLevels).currentLevel?.name, "Plata");
        // 1000 pts -> Oro
        assert.strictEqual((0, loyaltyEngine_1.determineCustomerLevel)(1000, sampleLevels).currentLevel?.name, "Oro");
        // 5500 pts -> Diamante (Top level, no next)
        const topResult = (0, loyaltyEngine_1.determineCustomerLevel)(5500, sampleLevels);
        assert.strictEqual(topResult.currentLevel?.name, "Diamante");
        assert.strictEqual(topResult.nextLevel, null);
        assert.strictEqual(topResult.pointsToNext, 0);
    });
});
(0, node_test_1.describe)("Loyalty Engine — Combo Reward Validation & Backward Compatibility", () => {
    (0, node_test_1.test)("Validates successful COMBO reward definition with multiple components", () => {
        const comboReward = {
            name: "Combo Fritoni",
            description: "Hamburguesa, Gaseosa, Papas y Delivery",
            rewardType: "COMBO",
            pointsCost: 250,
            scope: "MERCHANT_SPECIFIC",
            businessId: "fritoni",
            active: true,
            comboItems: [
                { type: "PRODUCT", productId: "hamburguesa_001", quantity: 1, businessId: "fritoni" },
                { type: "PRODUCT", productId: "gaseosa_001", quantity: 1, businessId: "fritoni" },
                { type: "PRODUCT", productId: "papas_001", quantity: 1, businessId: "fritoni" },
                { type: "FREE_DELIVERY" },
            ],
        };
        const validation = (0, loyaltyEngine_1.validateComboReward)(comboReward);
        assert.strictEqual(validation.valid, true);
        assert.strictEqual(validation.error, undefined);
    });
    (0, node_test_1.test)("Rejects COMBO with empty components list", () => {
        const emptyCombo = {
            name: "Combo Vacío",
            description: "Sin items",
            rewardType: "COMBO",
            pointsCost: 100,
            scope: "GLOBAL",
            active: true,
            comboItems: [],
        };
        const validation = (0, loyaltyEngine_1.validateComboReward)(emptyCombo);
        assert.strictEqual(validation.valid, false);
        assert.ok(validation.error?.includes("al menos un componente"));
    });
    (0, node_test_1.test)("Rejects COMBO if product quantity is <= 0 or productId is empty", () => {
        const invalidQtyCombo = {
            name: "Combo Inválido",
            description: "Cantidad 0",
            rewardType: "COMBO",
            pointsCost: 100,
            scope: "GLOBAL",
            active: true,
            comboItems: [
                { type: "PRODUCT", productId: "prod_1", quantity: 0 },
            ],
        };
        const validation = (0, loyaltyEngine_1.validateComboReward)(invalidQtyCombo);
        assert.strictEqual(validation.valid, false);
        assert.ok(validation.error?.includes("cantidad mayor a 0"));
    });
    (0, node_test_1.test)("Rejects COMBO if product belongs to different merchant in MERCHANT_SPECIFIC scope", () => {
        const mismatchedMerchantCombo = {
            name: "Combo Fritoni",
            description: "Contiene producto de Chanchito",
            rewardType: "COMBO",
            pointsCost: 200,
            scope: "MERCHANT_SPECIFIC",
            businessId: "fritoni",
            active: true,
            comboItems: [
                { type: "PRODUCT", productId: "chanchito_ribs", quantity: 1, businessId: "chanchito" },
            ],
        };
        const validation = (0, loyaltyEngine_1.validateComboReward)(mismatchedMerchantCombo);
        assert.strictEqual(validation.valid, false);
        assert.ok(validation.error?.includes("no pertenece al comercio"));
    });
    (0, node_test_1.test)("Validates COMBO with discount components", () => {
        const discountCombo = {
            name: "Combo Mixto",
            description: "C$50 off y envío gratis",
            rewardType: "COMBO",
            pointsCost: 150,
            scope: "GLOBAL",
            active: true,
            comboItems: [
                { type: "FIXED_DISCOUNT", value: 50 },
                { type: "FREE_DELIVERY" },
            ],
        };
        const validation = (0, loyaltyEngine_1.validateComboReward)(discountCombo);
        assert.strictEqual(validation.valid, true);
    });
    (0, node_test_1.test)("Backward Compatibility: Non-combo rewards pass validateComboReward without error", () => {
        const fixedDiscount = {
            name: "C$50 Descuento",
            description: "Descuento directo",
            rewardType: "FIXED_DISCOUNT",
            pointsCost: 50,
            scope: "GLOBAL",
            active: true,
        };
        const freeDelivery = {
            name: "Envío Gratis",
            description: "Delivery 0",
            rewardType: "FREE_DELIVERY",
            pointsCost: 100,
            scope: "GLOBAL",
            active: true,
        };
        assert.strictEqual((0, loyaltyEngine_1.validateComboReward)(fixedDiscount).valid, true);
        assert.strictEqual((0, loyaltyEngine_1.validateComboReward)(freeDelivery).valid, true);
    });
});
