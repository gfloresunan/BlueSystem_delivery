/**
 * BlueSystem Delivery Enterprise — Unit Tests: Loyalty & Rewards Engine
 * Validates pure FIFO allocation, level calculation, points consistency, combo validation, and backward compatibility.
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";
import {
  calculateFifoAllocation,
  determineCustomerLevel,
  validateComboReward,
  LoyaltyLevelEntity,
  MerchantBalanceItem,
} from "../domain/loyalty/loyaltyEngine";

describe("Loyalty Engine — FIFO Allocation Policy & Consistency", () => {
  const sampleLevels: LoyaltyLevelEntity[] = [
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

  test("FIFO Allocation: Consumes from oldest merchant first (Fritoni 20, Chanchito 10 -> Consume 10)", () => {
    const merchants: MerchantBalanceItem[] = [
      { businessId: "fritoni", businessName: "Fritoni", pointsBalance: 20 },
      { businessId: "chanchito", businessName: "El Chanchito", pointsBalance: 10 },
    ];

    const result = calculateFifoAllocation(merchants, 10);

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

  test("FIFO Allocation: Consumes across multiple merchants when first is exhausted (Fritoni 20, Chanchito 10 -> Consume 25)", () => {
    const merchants: MerchantBalanceItem[] = [
      { businessId: "fritoni", businessName: "Fritoni", pointsBalance: 20 },
      { businessId: "chanchito", businessName: "El Chanchito", pointsBalance: 10 },
    ];

    const result = calculateFifoAllocation(merchants, 25);

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

  test("FIFO Allocation: Rejects when required points exceed total available", () => {
    const merchants: MerchantBalanceItem[] = [
      { businessId: "fritoni", businessName: "Fritoni", pointsBalance: 10 },
      { businessId: "chanchito", businessName: "El Chanchito", pointsBalance: 10 },
    ];

    const result = calculateFifoAllocation(merchants, 50);

    assert.strictEqual(result.isSufficient, false);
    assert.strictEqual(result.totalAllocated, 0);
    assert.deepStrictEqual(result.allocations, []);
  });

  test("Customer Level: Determined by lifetimePointsEarned, not available points", () => {
    // Caso: Cliente ganó 2,000 puntos en total (Platino) pero canjeó 1,500 y le quedan 500 disponibles
    const lifetimeEarned = 2000;

    const levelResult = determineCustomerLevel(lifetimeEarned, sampleLevels);

    assert.ok(levelResult.currentLevel !== null);
    assert.strictEqual(levelResult.currentLevel?.name, "Platino");
    assert.strictEqual(levelResult.nextLevel?.name, "Diamante");
    assert.strictEqual(levelResult.pointsToNext, 3000); // 5000 - 2000
  });

  test("Customer Level: Correct progression at boundaries", () => {
    // 0 pts -> Bronce
    assert.strictEqual(determineCustomerLevel(0, sampleLevels).currentLevel?.name, "Bronce");
    // 499 pts -> Bronce
    assert.strictEqual(determineCustomerLevel(499, sampleLevels).currentLevel?.name, "Bronce");
    // 500 pts -> Plata
    assert.strictEqual(determineCustomerLevel(500, sampleLevels).currentLevel?.name, "Plata");
    // 1000 pts -> Oro
    assert.strictEqual(determineCustomerLevel(1000, sampleLevels).currentLevel?.name, "Oro");
    // 5500 pts -> Diamante (Top level, no next)
    const topResult = determineCustomerLevel(5500, sampleLevels);
    assert.strictEqual(topResult.currentLevel?.name, "Diamante");
    assert.strictEqual(topResult.nextLevel, null);
    assert.strictEqual(topResult.pointsToNext, 0);
  });
});

describe("Loyalty Engine — Combo Reward Validation & Backward Compatibility", () => {
  test("Validates successful COMBO reward definition with multiple components", () => {
    const comboReward = {
      name: "Combo Fritoni",
      description: "Hamburguesa, Gaseosa, Papas y Delivery",
      rewardType: "COMBO" as const,
      pointsCost: 250,
      scope: "MERCHANT_SPECIFIC" as const,
      businessId: "fritoni",
      active: true,
      comboItems: [
        { type: "PRODUCT" as const, productId: "hamburguesa_001", quantity: 1, businessId: "fritoni" },
        { type: "PRODUCT" as const, productId: "gaseosa_001", quantity: 1, businessId: "fritoni" },
        { type: "PRODUCT" as const, productId: "papas_001", quantity: 1, businessId: "fritoni" },
        { type: "FREE_DELIVERY" as const },
      ],
    };

    const validation = validateComboReward(comboReward);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.error, undefined);
  });

  test("Rejects COMBO with empty components list", () => {
    const emptyCombo = {
      name: "Combo Vacío",
      description: "Sin items",
      rewardType: "COMBO" as const,
      pointsCost: 100,
      scope: "GLOBAL" as const,
      active: true,
      comboItems: [],
    };

    const validation = validateComboReward(emptyCombo);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error?.includes("al menos un componente"));
  });

  test("Rejects COMBO if product quantity is <= 0 or productId is empty", () => {
    const invalidQtyCombo = {
      name: "Combo Inválido",
      description: "Cantidad 0",
      rewardType: "COMBO" as const,
      pointsCost: 100,
      scope: "GLOBAL" as const,
      active: true,
      comboItems: [
        { type: "PRODUCT" as const, productId: "prod_1", quantity: 0 },
      ],
    };

    const validation = validateComboReward(invalidQtyCombo);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error?.includes("cantidad mayor a 0"));
  });

  test("Rejects COMBO if product belongs to different merchant in MERCHANT_SPECIFIC scope", () => {
    const mismatchedMerchantCombo = {
      name: "Combo Fritoni",
      description: "Contiene producto de Chanchito",
      rewardType: "COMBO" as const,
      pointsCost: 200,
      scope: "MERCHANT_SPECIFIC" as const,
      businessId: "fritoni",
      active: true,
      comboItems: [
        { type: "PRODUCT" as const, productId: "chanchito_ribs", quantity: 1, businessId: "chanchito" },
      ],
    };

    const validation = validateComboReward(mismatchedMerchantCombo);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error?.includes("no pertenece al comercio"));
  });

  test("Validates COMBO with discount components", () => {
    const discountCombo = {
      name: "Combo Mixto",
      description: "C$50 off y envío gratis",
      rewardType: "COMBO" as const,
      pointsCost: 150,
      scope: "GLOBAL" as const,
      active: true,
      comboItems: [
        { type: "FIXED_DISCOUNT" as const, value: 50 },
        { type: "FREE_DELIVERY" as const },
      ],
    };

    const validation = validateComboReward(discountCombo);
    assert.strictEqual(validation.valid, true);
  });

  test("Backward Compatibility: Non-combo rewards pass validateComboReward without error", () => {
    const fixedDiscount = {
      name: "C$50 Descuento",
      description: "Descuento directo",
      rewardType: "FIXED_DISCOUNT" as const,
      pointsCost: 50,
      scope: "GLOBAL" as const,
      active: true,
    };

    const freeDelivery = {
      name: "Envío Gratis",
      description: "Delivery 0",
      rewardType: "FREE_DELIVERY" as const,
      pointsCost: 100,
      scope: "GLOBAL" as const,
      active: true,
    };

    assert.strictEqual(validateComboReward(fixedDiscount).valid, true);
    assert.strictEqual(validateComboReward(freeDelivery).valid, true);
  });
});
