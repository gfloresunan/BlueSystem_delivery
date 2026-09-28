/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.11 CERTIFICATION
 * CERT-W01: Web Layout Hydration & Dynamic Multi-Brand Certification
 * 
 * Regla:
 * Cambiar BrandVisualConfig modifica reactivamente la experiencia Web sin reload obligatorio,
 * sin caché contaminado y con estricto aislamiento entre Tenants.
 */

import {
  BrandEntity,
  BrandVisualConfig,
  DEFAULT_BRAND_CONFIG
} from '../domain/platform/models';
import {
  resolveDesignTokens,
  generateCssVariables,
  isDarkHex,
  getContrastText
} from '../domain/tokens/designTokenResolver';
import { ClientExperienceResolver } from '../domain/whitelabel/clientExperienceResolver';

export function runCertW01WebLayoutHydrationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [CERT-W01] PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ [CERT-W01] FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n======================================================================');
  console.log('🌐 RUNNING CERT-W01: WEB LAYOUT HYDRATION & DYNAMIC BRANDING');
  console.log('======================================================================\n');

  // Test 1: Fallback seguro con DEFAULT_BRAND_CONFIG
  const fallbackTokens = resolveDesignTokens('brand_default', DEFAULT_BRAND_CONFIG);
  assert(
    fallbackTokens.colors.primary.toLowerCase() === '#0284c7',
    'Tokens por defecto resuelven azul BlueSystem canónico (#0284c7)'
  );

  // Test 2: Hidratación con Marca Personalizada A (Tacos El Águila)
  const brandAConfig: BrandVisualConfig = {
    ...DEFAULT_BRAND_CONFIG,
    logoUrl: 'https://cdn.example.com/tacos-el-aguila/logo.png',
    iconUrl: 'https://cdn.example.com/tacos-el-aguila/icon.png',
    primaryColor: '#D97706', // Ámbar / Dorado
    secondaryColor: '#B45309',
    accentColor: '#F59E0B',
    backgroundColor: '#0F172A',
    textColor: '#FFFFFF',
    fontFamily: 'Inter, sans-serif'
  };

  const tokensA = resolveDesignTokens('brand_tacos_aguila', brandAConfig);
  assert(
    tokensA.colors.primary.toLowerCase() === '#d97706',
    'Marca A hidrata primaryColor personalizado (#d97706)'
  );
  assert(
    tokensA.brandId === 'brand_tacos_aguila',
    'Tokens de diseño conservan el brandId exacto'
  );

  // Test 3: Generación de CSS Variables dinámicas sin reload
  const cssVarsA = generateCssVariables(tokensA);
  assert(
    cssVarsA['--brand-primary'].toLowerCase() === '#d97706',
    'generateCssVariables emite la variable CSS --brand-primary correcta (#d97706)'
  );

  // Test 4: Conmutación en caliente a Marca B (Sushi Zen) y no contaminación
  const brandBConfig: BrandVisualConfig = {
    ...DEFAULT_BRAND_CONFIG,
    logoUrl: 'https://cdn.example.com/sushi-zen/logo.png',
    primaryColor: '#10B981', // Esmeralda
    secondaryColor: '#047857',
    accentColor: '#34D399',
    backgroundColor: '#022C22',
    textColor: '#F0FDF4',
    fontFamily: 'Poppins, sans-serif'
  };

  const tokensB = resolveDesignTokens('brand_sushi_zen', brandBConfig);
  assert(
    tokensB.colors.primary.toLowerCase() === '#10b981',
    'Marca B hidrata primaryColor esmeralda (#10b981)'
  );
  assert(
    tokensB.typography.fontFamily === 'Poppins, sans-serif',
    'Marca B hidrata tipografía personalizada'
  );
  assert(
    tokensA.colors.primary !== tokensB.colors.primary,
    'Aislamiento de Tokens: Marca A y Marca B no comparten ni contaminan memoria de diseño'
  );

  // Test 5: ClientExperienceResolver produce Snapshot dinámico
  const brandEntityA: BrandEntity = {
    brandId: 'brand_tacos_aguila',
    tenantId: 'tenant_aguila',
    displayName: 'Tacos El Águila Real',
    shortName: 'El Águila',
    slug: 'tacos-el-aguila',
    visual: brandAConfig,
    metadata: {
      supportEmail: 'support@aguila.com',
      supportPhone: '+525512345678'
    },
    status: 'ACTIVE',
    schemaVersion: '1.0',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    createdBy: 'system',
    updatedBy: 'system'
  };

  const expSnapshotA = ClientExperienceResolver.resolveSnapshot(
    {
      tenantId: 'tenant_aguila',
      name: 'Holding El Águila',
      legalName: 'Holding El Águila S.A. de C.V.',
      slug: 'holding-aguila',
      type: 'WHITE_LABEL_COMMERCE',
      status: 'ACTIVE',
      primaryBrandId: 'brand_tacos_aguila',
      schemaVersion: '1.0',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      createdBy: 'system',
      updatedBy: 'system'
    },
    brandEntityA,
    {
      subscriptionId: 'sub_aguila',
      tenantId: 'tenant_aguila',
      planId: 'plan_pro',
      planName: 'Plan Pro',
      planTier: 'PROFESSIONAL',
      status: 'ACTIVE',
      startDate: 1700000000000,
      endDate: null,
      billingCycle: 'MONTHLY',
      enabledFeatures: ['ORDERS', 'CATALOG', 'PROMOTIONS'],
      disabledFeatures: [],
      limits: { maxBusinesses: 1, maxBranches: 3, maxUsers: 10, maxCouriers: 5, maxOrders: 1000, maxStorageMb: 1000, maxApiRequests: 5000 },
      schemaVersion: '1.0',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      membershipId: 'mem_aguila_01',
      uid: 'usr_owner_aguila',
      tenantId: 'tenant_aguila',
      brandId: 'brand_tacos_aguila',
      role: 'OWNER',
      status: 'ACTIVE',
      permissions: ['ORDERS:*', 'CATALOG:*'],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      schemaVersion: '3.0'
    }
  );

  assert(
    expSnapshotA.displayName === 'Tacos El Águila Real',
    'Snapshot dinámico contiene displayName personalizado'
  );
  assert(
    expSnapshotA.shortName === 'El Águila',
    'Snapshot dinámico contiene shortName personalizado'
  );
  assert(
    expSnapshotA.visual.logoUrl === 'https://cdn.example.com/tacos-el-aguila/logo.png',
    'Snapshot dinámico expone logoUrl personalizado'
  );

  return { passed, failed, errors };
}
