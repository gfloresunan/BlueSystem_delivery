/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TENANT DOMAIN RESOLUTION SUITE (FASE 2E)
 * Unit & Integration Tests for Domain Normalizer, Tenant Domain Resolver & Feature Gating
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  DomainNormalizer,
  TenantDomainResolver,
  DomainDataSource
} from '../domain/whitelabel/tenantDomainResolver';
import { TenantFeatureEngine } from '../domain/whitelabel/tenantFeatureEngine';
import { TenantDomainEntity, PlanTier } from '../domain/platform/models';

describe('Phase 2E — Multi-Tenant Domain Resolution Engine', () => {

  describe('1. DomainNormalizer', () => {
    it('should normalize hostnames with protocol, port and paths correctly', () => {
      assert.strictEqual(DomainNormalizer.normalize('https://volados.com:3000/dashboard?tab=orders'), 'volados.com');
      assert.strictEqual(DomainNormalizer.normalize('HTTP://DELIVERY.VOLADOS.COM:8080/'), 'delivery.volados.com');
      assert.strictEqual(DomainNormalizer.normalize('   volados.com.   '), 'volados.com');
      assert.strictEqual(DomainNormalizer.normalize(''), '');
      assert.strictEqual(DomainNormalizer.normalize(null), '');
    });

    it('should correctly identify platform root domains', () => {
      assert.strictEqual(DomainNormalizer.isPlatformDomain('localhost'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('127.0.0.1'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('www.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('app.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('admin.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('comercio.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('registro.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('merchant.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('onboarding.bluesystemdelivery.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('bluesystem.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('www.bluesystem.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('app.bluesystem.com'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('bluesystem-7c9af.web.app'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('bluesystem-7c9af-merchant.web.app'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('bluesystem-7c9af-apply.web.app'), true);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('volados.com'), false);
      assert.strictEqual(DomainNormalizer.isPlatformDomain('delivery.volados.com'), false);
    });

    it('should identify reserved subdomains', () => {
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('admin'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('api'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('comercio'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('registro'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('onboarding'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('merchant'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('governance'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('www'), true);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('volados'), false);
      assert.strictEqual(DomainNormalizer.isReservedSubdomain('restaurantexyz'), false);
    });
  });

  describe('2. TenantFeatureEngine (Subscription Plan Gating)', () => {
    it('should deny custom domains for STARTER and PROFESSIONAL plans', () => {
      const starterCheck = TenantFeatureEngine.isDomainTypeAllowed('STARTER', 'CUSTOM_DOMAIN');
      assert.strictEqual(starterCheck.allowed, false);

      const proCheck = TenantFeatureEngine.isDomainTypeAllowed('PROFESSIONAL', 'CUSTOM_DOMAIN');
      assert.strictEqual(proCheck.allowed, false);
    });

    it('should allow subdomains for PROFESSIONAL and ENTERPRISE plans', () => {
      const proSubCheck = TenantFeatureEngine.isDomainTypeAllowed('PROFESSIONAL', 'TENANT_SUBDOMAIN');
      assert.strictEqual(proSubCheck.allowed, true);

      const entSubCheck = TenantFeatureEngine.isDomainTypeAllowed('ENTERPRISE', 'TENANT_SUBDOMAIN');
      assert.strictEqual(entSubCheck.allowed, true);
    });

    it('should allow custom domains and full white-label on ENTERPRISE', () => {
      const entCustomCheck = TenantFeatureEngine.isDomainTypeAllowed('ENTERPRISE', 'CUSTOM_DOMAIN');
      assert.strictEqual(entCustomCheck.allowed, true);

      const features = TenantFeatureEngine.resolveFeaturesForTier('ENTERPRISE');
      assert.strictEqual(features.customDomainAllowed, true);
      assert.strictEqual(features.customBrandingAllowed, true);
      assert.strictEqual(features.maxCustomDomains > 1, true);
    });
  });

  describe('3. TenantDomainResolver (Resolution & Invariants)', () => {
    const mockDomains: Record<string, TenantDomainEntity> = {
      'volados.com': {
        domainId: 'volados_com',
        tenantId: 'tenant_volados',
        brandId: 'brand_volados',
        domain: 'volados.com',
        domainType: 'CUSTOM_DOMAIN',
        status: 'ACTIVE',
        isPrimary: true,
        isCustom: true,
        isSubdomain: false,
        dnsStatus: 'VERIFIED',
        sslStatus: 'ACTIVE',
        dnsInstructions: [],
        schemaVersion: '1.0',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        createdBy: 'user_admin',
        updatedBy: 'user_admin'
      },
      'pending.com': {
        domainId: 'pending_com',
        tenantId: 'tenant_pending',
        domain: 'pending.com',
        domainType: 'CUSTOM_DOMAIN',
        status: 'PENDING',
        isPrimary: false,
        isCustom: true,
        isSubdomain: false,
        dnsStatus: 'PENDING',
        sslStatus: 'PENDING',
        dnsInstructions: [],
        schemaVersion: '1.0',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        createdBy: 'user_admin',
        updatedBy: 'user_admin'
      },
      'suspended.com': {
        domainId: 'suspended_com',
        tenantId: 'tenant_suspended',
        domain: 'suspended.com',
        domainType: 'CUSTOM_DOMAIN',
        status: 'ACTIVE',
        isPrimary: true,
        isCustom: true,
        isSubdomain: false,
        dnsStatus: 'VERIFIED',
        sslStatus: 'ACTIVE',
        dnsInstructions: [],
        schemaVersion: '1.0',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        createdBy: 'user_admin',
        updatedBy: 'user_admin'
      }
    };

    const mockTenants: Record<string, { status: string; primaryBrandId?: string; planTier?: PlanTier }> = {
      'tenant_volados': { status: 'ACTIVE', primaryBrandId: 'brand_volados', planTier: 'ENTERPRISE' },
      'tenant_pending': { status: 'ACTIVE', primaryBrandId: 'brand_pending', planTier: 'ENTERPRISE' },
      'tenant_suspended': { status: 'SUSPENDED', primaryBrandId: 'brand_suspended', planTier: 'ENTERPRISE' }
    };

    const mockBrands: Record<string, { visual?: any }> = {
      'brand_volados': {
        visual: {
          primaryColor: '#FF6D00',
          secondaryColor: '#2979FF',
          logoUrl: 'https://storage.volados.com/logo.png'
        }
      }
    };

    const mockDataSource: DomainDataSource = {
      getDomainByName: async (domain: string) => mockDomains[domain] || null,
      getTenantById: async (tenantId: string) => mockTenants[tenantId] || null,
      getBrandById: async (brandId: string) => mockBrands[brandId] || null
    };

    it('should resolve platform root correctly', async () => {
      const resCanonical = await TenantDomainResolver.resolveDomain('bluesystemdelivery.com', mockDataSource);
      assert.strictEqual(resCanonical.status, 'FOUND');
      assert.strictEqual(resCanonical.isPlatformRoot, true);
      assert.strictEqual(resCanonical.tenantId, 'default_tenant');

      const res = await TenantDomainResolver.resolveDomain('app.bluesystemdelivery.com', mockDataSource);
      assert.strictEqual(res.status, 'FOUND');
      assert.strictEqual(res.isPlatformRoot, true);
      assert.strictEqual(res.tenantId, 'default_tenant');
    });

    it('should resolve active custom domain and hydrate branding', async () => {
      const res = await TenantDomainResolver.resolveDomain('volados.com:443', mockDataSource);
      assert.strictEqual(res.status, 'FOUND');
      assert.strictEqual(res.isPlatformRoot, false);
      assert.strictEqual(res.tenantId, 'tenant_volados');
      assert.strictEqual(res.brandId, 'brand_volados');
      assert.strictEqual(res.brandingConfig?.primaryColor, '#FF6D00');
    });

    it('should support www fallback for registered domains', async () => {
      const res = await TenantDomainResolver.resolveDomain('www.volados.com', mockDataSource);
      assert.strictEqual(res.status, 'FOUND');
      assert.strictEqual(res.tenantId, 'tenant_volados');
    });

    it('should fail-closed on unknown domain', async () => {
      const res = await TenantDomainResolver.resolveDomain('desconocido.com', mockDataSource);
      assert.strictEqual(res.status, 'UNKNOWN_DOMAIN');
      assert.strictEqual(res.tenantId, undefined);
    });

    it('should fail-closed on inactive domain (PENDING)', async () => {
      const res = await TenantDomainResolver.resolveDomain('pending.com', mockDataSource);
      assert.strictEqual(res.status, 'INACTIVE_DOMAIN');
      assert.strictEqual(res.domainEntity?.status, 'PENDING');
    });

    it('should fail-closed on suspended tenant', async () => {
      const res = await TenantDomainResolver.resolveDomain('suspended.com', mockDataSource);
      assert.strictEqual(res.status, 'SUSPENDED_TENANT');
    });
  });
});
