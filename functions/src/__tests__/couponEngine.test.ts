import { describe, test } from "node:test";
import * as assert from "node:assert";
import {
  evaluateCoupon,
  CouponEntity,
  CouponEvaluationContext,
} from "../domain/coupons/couponEngine";

const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toBeNull: () => assert.strictEqual(actual, null),
  toBeDefined: () => assert.notStrictEqual(actual, undefined),
  toBeTruthy: () => assert.ok(actual),
  toBeFalsy: () => assert.ok(!actual),
  toBeLessThanOrEqual: (expected: number) => assert.ok(actual <= expected),
  toBeGreaterThan: (expected: number) => assert.ok(actual > expected),
});

describe("Enterprise Coupon Engine v1.0 — Test Suite", () => {
  const baseContext: CouponEvaluationContext = {
    couponCode: "GLOBAL20",
    businessId: "BIZ_RESTAURANT_001",
    branchId: "BRANCH_CENTRAL",
    customerId: "USER_CUST_123",
    cartSubtotal: 300,
    deliveryFee: 45,
    items: [
      {
        productId: "PROD_BURGER",
        productName: "Hamburguesa Doble",
        price: 150,
        quantity: 2,
        categoryId: "CAT_FOOD",
      },
    ],
    currentTimestamp: 1724490000000, // Fixed time
  };

  const validGlobalCoupon: CouponEntity = {
    code: "GLOBAL20",
    scope: "GLOBAL",
    businessId: null,
    discountType: "PERCENTAGE",
    discountValue: 20,
    minimumOrderAmount: 200,
    maximumDiscountAmount: null,
    startsAt: 1724000000000,
    expiresAt: 1725000000000,
    isActive: true,
    usageLimit: 100,
    usageCount: 10,
    perCustomerLimit: 3,
  };

  test("TEST 01: Cupón global válido aplica descuento porcentual correcto", () => {
    const result = evaluateCoupon(validGlobalCoupon, baseContext);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(60); // 20% of 300
    expect(result.deliveryDiscountAmount).toBe(0);
    expect(result.finalTotal).toBe(285); // 300 - 60 + 45
    expect(result.appliedCouponSnapshot?.code).toBe("GLOBAL20");
  });

  test("TEST 02: Cupón con código no coincidente es rechazado", () => {
    const result = evaluateCoupon(validGlobalCoupon, {
      ...baseContext,
      couponCode: "INVALID_CODE",
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INVALID_COUPON");
    expect(result.discountAmount).toBe(0);
    expect(result.finalTotal).toBe(345);
  });

  test("TEST 03: Cupón específico de comercio aplicado a su comercio autorizado", () => {
    const merchantCoupon: CouponEntity = {
      ...validGlobalCoupon,
      code: "FARMACIA15",
      scope: "MERCHANT_SPECIFIC",
      businessId: "BIZ_FARMACIA_001",
      discountValue: 15,
    };
    const result = evaluateCoupon(merchantCoupon, {
      ...baseContext,
      couponCode: "FARMACIA15",
      businessId: "BIZ_FARMACIA_001",
    });
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(45); // 15% of 300
    expect(result.finalTotal).toBe(300); // 300 - 45 + 45
  });

  test("TEST 04: Cupón específico aplicado a comercio incorrecto falla con COUPON_BUSINESS_MISMATCH", () => {
    const merchantCoupon: CouponEntity = {
      ...validGlobalCoupon,
      code: "FARMACIA15",
      scope: "MERCHANT_SPECIFIC",
      businessId: "BIZ_FARMACIA_001",
    };
    const result = evaluateCoupon(merchantCoupon, {
      ...baseContext,
      couponCode: "FARMACIA15",
      businessId: "BIZ_BURGER_OTHER",
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("COUPON_BUSINESS_MISMATCH");
    expect(result.discountAmount).toBe(0);
  });

  test("TEST 05: Monto mínimo no alcanzado falla con MINIMUM_ORDER_NOT_REACHED", () => {
    const result = evaluateCoupon(validGlobalCoupon, {
      ...baseContext,
      cartSubtotal: 150, // Minimum is 200
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("MINIMUM_ORDER_NOT_REACHED");
    expect(result.discountAmount).toBe(0);
  });

  test("TEST 06: Cupón expirado falla con EXPIRED_COUPON", () => {
    const expiredCoupon: CouponEntity = {
      ...validGlobalCoupon,
      expiresAt: 1724000000000, // In the past relative to 1724490000000
    };
    const result = evaluateCoupon(expiredCoupon, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("EXPIRED_COUPON");
  });

  test("TEST 07: Cupón inactivo falla con INACTIVE_COUPON", () => {
    const inactiveCoupon: CouponEntity = {
      ...validGlobalCoupon,
      isActive: false,
    };
    const result = evaluateCoupon(inactiveCoupon, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INACTIVE_COUPON");
  });

  test("TEST 08: Límite global de usos alcanzado falla con USAGE_LIMIT_REACHED", () => {
    const maxedOutCoupon: CouponEntity = {
      ...validGlobalCoupon,
      usageLimit: 10,
      usageCount: 10,
    };
    const result = evaluateCoupon(maxedOutCoupon, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("USAGE_LIMIT_REACHED");
  });

  test("TEST 09: Límite por cliente alcanzado falla con CUSTOMER_LIMIT_REACHED", () => {
    const result = evaluateCoupon(validGlobalCoupon, {
      ...baseContext,
      customerPreviousRedemptionCount: 3, // perCustomerLimit is 3
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("CUSTOMER_LIMIT_REACHED");
  });

  test("TEST 10: Descuento porcentual respeta maximumDiscountAmount", () => {
    const cappedCoupon: CouponEntity = {
      ...validGlobalCoupon,
      discountValue: 50, // 50% of 300 = 150
      maximumDiscountAmount: 80, // Cap at 80
    };
    const result = evaluateCoupon(cappedCoupon, baseContext);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(80);
    expect(result.finalTotal).toBe(265); // 300 - 80 + 45
  });

  test("TEST 11: Descuento monto fijo nunca supera subtotal (total >= 0)", () => {
    const fixedCoupon: CouponEntity = {
      ...validGlobalCoupon,
      discountType: "FIXED_AMOUNT",
      discountValue: 500, // Larger than subtotal (300)
    };
    const result = evaluateCoupon(fixedCoupon, baseContext);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(300); // Capped at subtotal
    expect(result.finalTotal).toBe(45); // Subtotal (0) + DeliveryFee (45)
  });

  test("TEST 12: Descuento de envío gratis (FREE_DELIVERY)", () => {
    const freeDeliveryCoupon: CouponEntity = {
      ...validGlobalCoupon,
      discountType: "FREE_DELIVERY",
      discountValue: 0,
    };
    const result = evaluateCoupon(freeDeliveryCoupon, baseContext);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(0);
    expect(result.deliveryDiscountAmount).toBe(45);
    expect(result.finalTotal).toBe(300); // 300 + 0 delivery
  });

  test("TEST 13: Productos aplicables elegibles calculan descuento solo sobre productos autorizados", () => {
    const productSpecificCoupon: CouponEntity = {
      ...validGlobalCoupon,
      applicableProductIds: ["PROD_BURGER"],
    };
    const mixedContext: CouponEvaluationContext = {
      ...baseContext,
      cartSubtotal: 400,
      items: [
        { productId: "PROD_BURGER", productName: "Burger", price: 150, quantity: 1 }, // 150 eligible
        { productId: "PROD_DRINK", productName: "Soda", price: 250, quantity: 1 }, // 250 not eligible
      ],
    };
    const result = evaluateCoupon(productSpecificCoupon, mixedContext);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(30); // 20% of 150
    expect(result.finalTotal).toBe(415); // 400 - 30 + 45
  });

  test("TEST 14: Carrito sin productos elegibles falla con PRODUCT_NOT_ELIGIBLE", () => {
    const productSpecificCoupon: CouponEntity = {
      ...validGlobalCoupon,
      applicableProductIds: ["PROD_PIZZA_ONLY"],
    };
    const result = evaluateCoupon(productSpecificCoupon, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("PRODUCT_NOT_ELIGIBLE");
  });

  test("TEST 15: Promoción existente no apilable con cupón no apilable falla", () => {
    const nonStackableCoupon: CouponEntity = {
      ...validGlobalCoupon,
      stackable: false,
    };
    const result = evaluateCoupon(nonStackableCoupon, {
      ...baseContext,
      existingPromotionDiscount: 50,
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("PROMOTION_NOT_STACKABLE");
  });

  test("TEST 16: Promoción existente y cupón apilables se combinan correctamente", () => {
    const stackableCoupon: CouponEntity = {
      ...validGlobalCoupon,
      stackable: true,
    };
    const result = evaluateCoupon(stackableCoupon, {
      ...baseContext,
      existingPromotionDiscount: 50,
      isPromotionStackable: true,
    });
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(60);
    expect(result.finalTotal).toBe(235); // (300 - 50 - 60) + 45 = 190 + 45 = 235
  });

  test("TEST 17: Normalización de mayúsculas y espacios en código", () => {
    const result = evaluateCoupon(validGlobalCoupon, {
      ...baseContext,
      couponCode: "  global20  ",
    });
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(60);
  });

  test("TEST 18: Fecha futura no válida falla con COUPON_NOT_YET_VALID", () => {
    const futureCoupon: CouponEntity = {
      ...validGlobalCoupon,
      startsAt: 1725000000000, // Future relative to context
    };
    const result = evaluateCoupon(futureCoupon, baseContext);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("COUPON_NOT_YET_VALID");
  });

  test("TEST 19: Sucursal restringida con mismatch falla con BRANCH_MISMATCH", () => {
    const branchRestrictedCoupon: CouponEntity = {
      ...validGlobalCoupon,
      branchIds: ["BRANCH_SOUTH", "BRANCH_NORTH"],
    };
    const result = evaluateCoupon(branchRestrictedCoupon, {
      ...baseContext,
      branchId: "BRANCH_CENTRAL", // Not in authorized list
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("BRANCH_MISMATCH");
  });

  test("TEST 20: Categoría aplicable elegible aplica descuento", () => {
    const categoryCoupon: CouponEntity = {
      ...validGlobalCoupon,
      applicableCategoryIds: ["CAT_FOOD"],
    };
    const result = evaluateCoupon(categoryCoupon, baseContext);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(60);
  });
});
