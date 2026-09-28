import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Interface representing the SSOT Canonical Contract of /promotions
 * directly matching Android com.example.domain.model.Promotion.kt
 */
interface PromotionEntity {
  id: string;
  businessId: string;
  businessName?: string;
  title: string;
  description: string;
  image: string;
  imageUrl?: string;
  active: boolean;
  isActive?: boolean;
  discountPercentage: number;
  couponCode: string;
  minOrderAmount: number;
  priority: number;
  startDate: string;
  endDate: string;
  tenantId?: string;
  createdAt?: any;
  updatedAt?: any;
}

function parsePromotionDocument(docId: string, data: Record<string, any>): PromotionEntity {
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

function isPromotionValidNow(promo: PromotionEntity, referenceTime: Date = new Date()): boolean {
  if (!promo.active) return false;
  if (promo.startDate) {
    const start = new Date(promo.startDate);
    if (!isNaN(start.getTime()) && referenceTime < start) return false;
  }
  if (promo.endDate) {
    const end = new Date(promo.endDate);
    if (!isNaN(end.getTime()) && referenceTime > end) return false;
  }
  return true;
}

describe('Enterprise Promotions SSOT Contract — Test Suite', () => {

  it('TEST 01: Promotion document deserializes with complete Android Promotion.kt contract fields', () => {
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

    assert.equal(promo.id, 'promo_123');
    assert.equal(promo.title, '20% OFF en Pizzas Familiares');
    assert.equal(promo.businessId, 'biz_pizza_01');
    assert.equal(promo.image, 'https://storage.googleapis.com/test-bucket/promos/pizza20.jpg');
    assert.equal(promo.active, true);
    assert.equal(promo.discountPercentage, 20);
    assert.equal(promo.couponCode, 'PIZZA20');
    assert.equal(promo.minOrderAmount, 250.0);
    assert.equal(promo.priority, 5);
  });

  it('TEST 02: Platform-wide global promotion has empty businessId and applies to all commerces', () => {
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
    assert.equal(promo.businessId, '');
    assert.equal(promo.couponCode, 'FREESHIP');
    assert.equal(promo.active, true);
  });

  it('TEST 03: Inactive promotion (active == false) is excluded from active evaluation', () => {
    const rawData = {
      title: 'Promo Expirada',
      businessId: 'biz_01',
      active: false,
      discountPercentage: 15
    };

    const promo = parsePromotionDocument('promo_inactive', rawData);
    assert.equal(promo.active, false);
    assert.equal(isPromotionValidNow(promo), false);
  });

  it('TEST 04: Promotion with future startDate is not yet valid', () => {
    const rawData = {
      title: 'Promo de Navidad',
      businessId: 'biz_01',
      active: true,
      startDate: '2026-12-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z'
    };

    const promo = parsePromotionDocument('promo_future', rawData);
    const now = new Date('2026-09-02T12:00:00Z');
    assert.equal(isPromotionValidNow(promo, now), false);
  });

  it('TEST 05: Promotion with past endDate is expired', () => {
    const rawData = {
      title: 'Promo de Agosto',
      businessId: 'biz_01',
      active: true,
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-08-31T23:59:59Z'
    };

    const promo = parsePromotionDocument('promo_past', rawData);
    const now = new Date('2026-09-02T12:00:00Z');
    assert.equal(isPromotionValidNow(promo, now), false);
  });

  it('TEST 06: Promotion currently in valid date window returns valid', () => {
    const rawData = {
      title: 'Promo Septiembre',
      businessId: 'biz_01',
      active: true,
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-09-30T23:59:59Z'
    };

    const promo = parsePromotionDocument('promo_valid', rawData);
    const now = new Date('2026-09-02T12:00:00Z');
    assert.equal(isPromotionValidNow(promo, now), true);
  });

  it('TEST 07: Fallback from legacy isActive attribute maintains full backward compatibility', () => {
    const rawData = {
      title: 'Promo Legacy',
      businessId: 'biz_01',
      isActive: true,
      imageUrl: 'https://test.com/legacy.png'
    };

    const promo = parsePromotionDocument('promo_legacy', rawData);
    assert.equal(promo.active, true);
    assert.equal(promo.image, 'https://test.com/legacy.png');
  });

  it('TEST 08: CouponCode is automatically sanitized (trimmed and uppercase)', () => {
    const rawData = {
      title: 'Promo Cupon',
      couponCode: '   combo50off   ',
      active: true
    };

    const promo = parsePromotionDocument('promo_code', rawData);
    assert.equal(promo.couponCode, 'COMBO50OFF');
  });
});
