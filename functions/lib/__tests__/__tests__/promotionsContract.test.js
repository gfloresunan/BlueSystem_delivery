"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
function parsePromotionDocument(docId, data) {
    const activeVal = data.active !== undefined ? Boolean(data.active) : (data.isActive !== undefined ? Boolean(data.isActive) : true);
    return {
        id: docId,
        businessId: String(data.businessId || ''),
        businessName: data.businessName ? String(data.businessName) : undefined,
        title: String(data.title || ''),
        description: String(data.description || ''),
        image: String(data.image || data.imageUrl || ''),
        imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
        active: activeVal,
        isActive: activeVal,
        discountPercentage: Number(data.discountPercentage) || 0,
        couponCode: String(data.couponCode || '').trim().toUpperCase(),
        minOrderAmount: Number(data.minOrderAmount) || 0,
        priority: Number(data.priority) || 10,
        startDate: String(data.startDate || ''),
        endDate: String(data.endDate || ''),
        tenantId: String(data.tenantId || 'GLOBAL'),
    };
}
function isPromotionValidNow(promo, referenceTime = new Date()) {
    if (!promo.active)
        return false;
    if (promo.startDate) {
        const start = new Date(promo.startDate);
        if (!isNaN(start.getTime()) && referenceTime < start)
            return false;
    }
    if (promo.endDate) {
        const end = new Date(promo.endDate);
        if (!isNaN(end.getTime()) && referenceTime > end)
            return false;
    }
    return true;
}
(0, node_test_1.describe)('Enterprise Promotions SSOT Contract — Test Suite', () => {
    (0, node_test_1.it)('TEST 01: Promotion document deserializes with complete Android Promotion.kt contract fields', () => {
        const rawData = {
            title: '20% OFF en Pizzas Familiares',
            businessId: 'biz_pizza_01',
            businessName: 'Pizzería Bella',
            description: 'Aplica de lunes a viernes en tamaño grande y familiar',
            image: 'https://storage.googleapis.com/test-bucket/promos/pizza20.jpg',
            active: true,
            discountPercentage: 20,
            couponCode: 'PIZZA20',
            minOrderAmount: 250.0,
            priority: 5,
            startDate: '2026-09-01T00:00:00Z',
            endDate: '2026-09-30T23:59:59Z',
            tenantId: 'TENANT_DEFAULT'
        };
        const promo = parsePromotionDocument('promo_123', rawData);
        strict_1.default.equal(promo.id, 'promo_123');
        strict_1.default.equal(promo.title, '20% OFF en Pizzas Familiares');
        strict_1.default.equal(promo.businessId, 'biz_pizza_01');
        strict_1.default.equal(promo.image, 'https://storage.googleapis.com/test-bucket/promos/pizza20.jpg');
        strict_1.default.equal(promo.active, true);
        strict_1.default.equal(promo.discountPercentage, 20);
        strict_1.default.equal(promo.couponCode, 'PIZZA20');
        strict_1.default.equal(promo.minOrderAmount, 250.0);
        strict_1.default.equal(promo.priority, 5);
    });
    (0, node_test_1.it)('TEST 02: Platform-wide global promotion has empty businessId and applies to all commerces', () => {
        const rawData = {
            title: 'Festival de Delivery Gratis',
            businessId: '',
            description: 'Envío sin costo en compras mayores a C$ 300',
            image: 'https://storage.googleapis.com/test/promo.jpg',
            active: true,
            discountPercentage: 0,
            couponCode: 'FREESHIP',
            minOrderAmount: 300.0,
            priority: 1
        };
        const promo = parsePromotionDocument('promo_global', rawData);
        strict_1.default.equal(promo.businessId, '');
        strict_1.default.equal(promo.couponCode, 'FREESHIP');
        strict_1.default.equal(promo.active, true);
    });
    (0, node_test_1.it)('TEST 03: Inactive promotion (active == false) is excluded from active evaluation', () => {
        const rawData = {
            title: 'Promo Expirada',
            businessId: 'biz_01',
            active: false,
            discountPercentage: 15
        };
        const promo = parsePromotionDocument('promo_inactive', rawData);
        strict_1.default.equal(promo.active, false);
        strict_1.default.equal(isPromotionValidNow(promo), false);
    });
    (0, node_test_1.it)('TEST 04: Promotion with future startDate is not yet valid', () => {
        const rawData = {
            title: 'Promo de Navidad',
            businessId: 'biz_01',
            active: true,
            startDate: '2026-12-01T00:00:00Z',
            endDate: '2026-12-31T23:59:59Z'
        };
        const promo = parsePromotionDocument('promo_future', rawData);
        const now = new Date('2026-09-02T12:00:00Z');
        strict_1.default.equal(isPromotionValidNow(promo, now), false);
    });
    (0, node_test_1.it)('TEST 05: Promotion with past endDate is expired', () => {
        const rawData = {
            title: 'Promo de Agosto',
            businessId: 'biz_01',
            active: true,
            startDate: '2026-08-01T00:00:00Z',
            endDate: '2026-08-31T23:59:59Z'
        };
        const promo = parsePromotionDocument('promo_past', rawData);
        const now = new Date('2026-09-02T12:00:00Z');
        strict_1.default.equal(isPromotionValidNow(promo, now), false);
    });
    (0, node_test_1.it)('TEST 06: Promotion currently in valid date window returns valid', () => {
        const rawData = {
            title: 'Promo Septiembre',
            businessId: 'biz_01',
            active: true,
            startDate: '2026-09-01T00:00:00Z',
            endDate: '2026-09-30T23:59:59Z'
        };
        const promo = parsePromotionDocument('promo_valid', rawData);
        const now = new Date('2026-09-02T12:00:00Z');
        strict_1.default.equal(isPromotionValidNow(promo, now), true);
    });
    (0, node_test_1.it)('TEST 07: Fallback from legacy isActive attribute maintains full backward compatibility', () => {
        const rawData = {
            title: 'Promo Legacy',
            businessId: 'biz_01',
            isActive: true,
            imageUrl: 'https://test.com/legacy.png'
        };
        const promo = parsePromotionDocument('promo_legacy', rawData);
        strict_1.default.equal(promo.active, true);
        strict_1.default.equal(promo.image, 'https://test.com/legacy.png');
    });
    (0, node_test_1.it)('TEST 08: CouponCode is automatically sanitized (trimmed and uppercase)', () => {
        const rawData = {
            title: 'Promo Cupon',
            couponCode: '   combo50off   ',
            active: true
        };
        const promo = parsePromotionDocument('promo_code', rawData);
        strict_1.default.equal(promo.couponCode, 'COMBO50OFF');
    });
});
