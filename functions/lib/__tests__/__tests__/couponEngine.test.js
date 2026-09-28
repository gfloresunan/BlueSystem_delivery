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
const couponEngine_1 = require("../domain/coupons/couponEngine");
const expect = (actual) => ({
    toBe: (expected) => assert.strictEqual(actual, expected),
    toEqual: (expected) => assert.deepStrictEqual(actual, expected),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toBeTruthy: () => assert.ok(actual),
    toBeFalsy: () => assert.ok(!actual),
    toBeLessThanOrEqual: (expected) => assert.ok(actual <= expected),
    toBeGreaterThan: (expected) => assert.ok(actual > expected),
});
(0, node_test_1.describe)("Enterprise Coupon Engine v1.0 — Test Suite", () => {
    const baseContext = {
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
    const validGlobalCoupon = {
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
    (0, node_test_1.test)("TEST 01: Cupón global válido aplica descuento porcentual correcto", () => {
        const result = (0, couponEngine_1.evaluateCoupon)(validGlobalCoupon, baseContext);
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(60); // 20% of 300
        expect(result.deliveryDiscountAmount).toBe(0);
        expect(result.finalTotal).toBe(285); // 300 - 60 + 45
        expect(result.appliedCouponSnapshot?.code).toBe("GLOBAL20");
    });
    (0, node_test_1.test)("TEST 02: Cupón con código no coincidente es rechazado", () => {
        const result = (0, couponEngine_1.evaluateCoupon)(validGlobalCoupon, {
            ...baseContext,
            couponCode: "INVALID_CODE",
        });
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("INVALID_COUPON");
        expect(result.discountAmount).toBe(0);
        expect(result.finalTotal).toBe(345);
    });
    (0, node_test_1.test)("TEST 03: Cupón específico de comercio aplicado a su comercio autorizado", () => {
        const merchantCoupon = {
            ...validGlobalCoupon,
            code: "FARMACIA15",
            scope: "MERCHANT_SPECIFIC",
            businessId: "BIZ_FARMACIA_001",
            discountValue: 15,
        };
        const result = (0, couponEngine_1.evaluateCoupon)(merchantCoupon, {
            ...baseContext,
            couponCode: "FARMACIA15",
            businessId: "BIZ_FARMACIA_001",
        });
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(45); // 15% of 300
        expect(result.finalTotal).toBe(300); // 300 - 45 + 45
    });
    (0, node_test_1.test)("TEST 04: Cupón específico aplicado a comercio incorrecto falla con COUPON_BUSINESS_MISMATCH", () => {
        const merchantCoupon = {
            ...validGlobalCoupon,
            code: "FARMACIA15",
            scope: "MERCHANT_SPECIFIC",
            businessId: "BIZ_FARMACIA_001",
        };
        const result = (0, couponEngine_1.evaluateCoupon)(merchantCoupon, {
            ...baseContext,
            couponCode: "FARMACIA15",
            businessId: "BIZ_BURGER_OTHER",
        });
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("COUPON_BUSINESS_MISMATCH");
        expect(result.discountAmount).toBe(0);
    });
    (0, node_test_1.test)("TEST 05: Monto mínimo no alcanzado falla con MINIMUM_ORDER_NOT_REACHED", () => {
        const result = (0, couponEngine_1.evaluateCoupon)(validGlobalCoupon, {
            ...baseContext,
            cartSubtotal: 150, // Minimum is 200
        });
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("MINIMUM_ORDER_NOT_REACHED");
        expect(result.discountAmount).toBe(0);
    });
    (0, node_test_1.test)("TEST 06: Cupón expirado falla con EXPIRED_COUPON", () => {
        const expiredCoupon = {
            ...validGlobalCoupon,
            expiresAt: 1724000000000, // In the past relative to 1724490000000
        };
        const result = (0, couponEngine_1.evaluateCoupon)(expiredCoupon, baseContext);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("EXPIRED_COUPON");
    });
    (0, node_test_1.test)("TEST 07: Cupón inactivo falla con INACTIVE_COUPON", () => {
        const inactiveCoupon = {
            ...validGlobalCoupon,
            isActive: false,
        };
        const result = (0, couponEngine_1.evaluateCoupon)(inactiveCoupon, baseContext);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("INACTIVE_COUPON");
    });
    (0, node_test_1.test)("TEST 08: Límite global de usos alcanzado falla con USAGE_LIMIT_REACHED", () => {
        const maxedOutCoupon = {
            ...validGlobalCoupon,
            usageLimit: 10,
            usageCount: 10,
        };
        const result = (0, couponEngine_1.evaluateCoupon)(maxedOutCoupon, baseContext);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("USAGE_LIMIT_REACHED");
    });
    (0, node_test_1.test)("TEST 09: Límite por cliente alcanzado falla con CUSTOMER_LIMIT_REACHED", () => {
        const result = (0, couponEngine_1.evaluateCoupon)(validGlobalCoupon, {
            ...baseContext,
            customerPreviousRedemptionCount: 3, // perCustomerLimit is 3
        });
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("CUSTOMER_LIMIT_REACHED");
    });
    (0, node_test_1.test)("TEST 10: Descuento porcentual respeta maximumDiscountAmount", () => {
        const cappedCoupon = {
            ...validGlobalCoupon,
            discountValue: 50, // 50% of 300 = 150
            maximumDiscountAmount: 80, // Cap at 80
        };
        const result = (0, couponEngine_1.evaluateCoupon)(cappedCoupon, baseContext);
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(80);
        expect(result.finalTotal).toBe(265); // 300 - 80 + 45
    });
    (0, node_test_1.test)("TEST 11: Descuento monto fijo nunca supera subtotal (total >= 0)", () => {
        const fixedCoupon = {
            ...validGlobalCoupon,
            discountType: "FIXED_AMOUNT",
            discountValue: 500, // Larger than subtotal (300)
        };
        const result = (0, couponEngine_1.evaluateCoupon)(fixedCoupon, baseContext);
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(300); // Capped at subtotal
        expect(result.finalTotal).toBe(45); // Subtotal (0) + DeliveryFee (45)
    });
    (0, node_test_1.test)("TEST 12: Descuento de envío gratis (FREE_DELIVERY)", () => {
        const freeDeliveryCoupon = {
            ...validGlobalCoupon,
            discountType: "FREE_DELIVERY",
            discountValue: 0,
        };
        const result = (0, couponEngine_1.evaluateCoupon)(freeDeliveryCoupon, baseContext);
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(0);
        expect(result.deliveryDiscountAmount).toBe(45);
        expect(result.finalTotal).toBe(300); // 300 + 0 delivery
    });
    (0, node_test_1.test)("TEST 13: Productos aplicables elegibles calculan descuento solo sobre productos autorizados", () => {
        const productSpecificCoupon = {
            ...validGlobalCoupon,
            applicableProductIds: ["PROD_BURGER"],
        };
        const mixedContext = {
            ...baseContext,
            cartSubtotal: 400,
            items: [
                { productId: "PROD_BURGER", productName: "Burger", price: 150, quantity: 1 }, // 150 eligible
                { productId: "PROD_DRINK", productName: "Soda", price: 250, quantity: 1 }, // 250 not eligible
            ],
        };
        const result = (0, couponEngine_1.evaluateCoupon)(productSpecificCoupon, mixedContext);
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(30); // 20% of 150
        expect(result.finalTotal).toBe(415); // 400 - 30 + 45
    });
    (0, node_test_1.test)("TEST 14: Carrito sin productos elegibles falla con PRODUCT_NOT_ELIGIBLE", () => {
        const productSpecificCoupon = {
            ...validGlobalCoupon,
            applicableProductIds: ["PROD_PIZZA_ONLY"],
        };
        const result = (0, couponEngine_1.evaluateCoupon)(productSpecificCoupon, baseContext);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("PRODUCT_NOT_ELIGIBLE");
    });
    (0, node_test_1.test)("TEST 15: Promoción existente no apilable con cupón no apilable falla", () => {
        const nonStackableCoupon = {
            ...validGlobalCoupon,
            stackable: false,
        };
        const result = (0, couponEngine_1.evaluateCoupon)(nonStackableCoupon, {
            ...baseContext,
            existingPromotionDiscount: 50,
        });
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("PROMOTION_NOT_STACKABLE");
    });
    (0, node_test_1.test)("TEST 16: Promoción existente y cupón apilables se combinan correctamente", () => {
        const stackableCoupon = {
            ...validGlobalCoupon,
            stackable: true,
        };
        const result = (0, couponEngine_1.evaluateCoupon)(stackableCoupon, {
            ...baseContext,
            existingPromotionDiscount: 50,
            isPromotionStackable: true,
        });
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(60);
        expect(result.finalTotal).toBe(235); // (300 - 50 - 60) + 45 = 190 + 45 = 235
    });
    (0, node_test_1.test)("TEST 17: Normalización de mayúsculas y espacios en código", () => {
        const result = (0, couponEngine_1.evaluateCoupon)(validGlobalCoupon, {
            ...baseContext,
            couponCode: "  global20  ",
        });
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(60);
    });
    (0, node_test_1.test)("TEST 18: Fecha futura no válida falla con COUPON_NOT_YET_VALID", () => {
        const futureCoupon = {
            ...validGlobalCoupon,
            startsAt: 1725000000000, // Future relative to context
        };
        const result = (0, couponEngine_1.evaluateCoupon)(futureCoupon, baseContext);
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("COUPON_NOT_YET_VALID");
    });
    (0, node_test_1.test)("TEST 19: Sucursal restringida con mismatch falla con BRANCH_MISMATCH", () => {
        const branchRestrictedCoupon = {
            ...validGlobalCoupon,
            branchIds: ["BRANCH_SOUTH", "BRANCH_NORTH"],
        };
        const result = (0, couponEngine_1.evaluateCoupon)(branchRestrictedCoupon, {
            ...baseContext,
            branchId: "BRANCH_CENTRAL", // Not in authorized list
        });
        expect(result.isValid).toBe(false);
        expect(result.errorCode).toBe("BRANCH_MISMATCH");
    });
    (0, node_test_1.test)("TEST 20: Categoría aplicable elegible aplica descuento", () => {
        const categoryCoupon = {
            ...validGlobalCoupon,
            applicableCategoryIds: ["CAT_FOOD"],
        };
        const result = (0, couponEngine_1.evaluateCoupon)(categoryCoupon, baseContext);
        expect(result.isValid).toBe(true);
        expect(result.discountAmount).toBe(60);
    });
});
