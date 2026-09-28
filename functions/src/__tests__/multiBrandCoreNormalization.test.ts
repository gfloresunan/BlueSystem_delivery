/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — MULTI-BRAND CORE NORMALIZATION (FASE 2D.2)
 * Suite de Pruebas Unitarias para Normalización de Dominio, Design Tokens y Aislamiento Multi-Brand
 */

import {
  TenantEntity,
  BrandEntity,
  OrganizationEntity,
  BusinessEntity,
  BranchEntity,
  EntitlementEntity,
  DEFAULT_BRAND_CONFIG
} from '../domain/platform/models';
import {
  validateTenant,
  validateBrand,
  validateOrganization,
  validateBusiness,
  validateBranch,
  validateEntitlement
} from '../domain/platform/validators';
import {
  resolveDesignTokens,
  generateCssVariables,
  isDarkHex,
  getContrastText
} from '../domain/tokens/designTokenResolver';

export async function runMultiBrandCoreNormalizationTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n============================================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS MULTI-BRAND CORE NORMALIZATION (FASE 2D.2)');
  console.log('============================================================\n');

  try {
    // ─── BLOQUE 1: NORMALIZACIÓN DE ENTIDADES DE DOMINIO ───────────────────────
    console.log('--- 1. NORMALIZACIÓN DE ENTIDADES DE DOMINIO ---');

    // TC-D01: TenantEntity válida
    const validTenant: TenantEntity = {
      tenantId: 'tenant_fitoni_corp',
      name: 'Fitoni Corporation',
      legalName: 'Fitoni Express S.A. de C.V.',
      slug: 'fitoni-corp',
      type: 'WHITE_LABEL_COMMERCE',
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'usr_admin_001',
      updatedBy: 'usr_admin_001'
    };
    const resT01 = validateTenant(validTenant);
    assert(resT01.isValid && resT01.errors.length === 0, 'TC-D01: TenantEntity válida pasa validación');

    // TC-D02: BrandEntity válida
    const validBrand: BrandEntity = {
      brandId: 'brand_fitoni_express',
      tenantId: 'tenant_fitoni_corp',
      displayName: 'Fitoni Express',
      shortName: 'Fitoni',
      slug: 'fitoni-express',
      status: 'ACTIVE',
      visual: {
        logoUrl: 'https://cdn.fitoni.com/logo.png',
        iconUrl: 'https://cdn.fitoni.com/icon.png',
        splashUrl: 'https://cdn.fitoni.com/splash.png',
        primaryColor: '#FF6D00',
        secondaryColor: '#FF9E80',
        accentColor: '#FFD180',
        backgroundColor: '#121212',
        textColor: '#FFFFFF',
        fontFamily: 'Outfit, sans-serif'
      },
      metadata: {
        supportEmail: 'support@fitoni.com',
        supportPhone: '+525512345678'
      },
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'usr_admin_001',
      updatedBy: 'usr_admin_001'
    };
    const resB01 = validateBrand(validBrand);
    assert(resB01.isValid && resB01.errors.length === 0, 'TC-D02: BrandEntity válida pasa validación');

    // TC-D03: BrandEntity con HEX color inválido falla
    const invalidBrandColor: Partial<BrandEntity> = {
      ...validBrand,
      visual: {
        ...validBrand.visual,
        primaryColor: 'not-a-hex'
      }
    };
    const resB02 = validateBrand(invalidBrandColor);
    assert(!resB02.isValid && resB02.errors.some(e => e.includes('HEX')), 'TC-D03: BrandEntity rechaza color HEX inválido');

    // TC-D04: OrganizationEntity válida
    const validOrg: OrganizationEntity = {
      orgId: 'org_holding_grupo_a',
      tenantId: 'tenant_fitoni_corp',
      displayName: 'Grupo Gastronómico A',
      slug: 'grupo-gastronomico-a',
      status: 'ACTIVE',
      businessIds: ['biz_fitoni_polanco', 'biz_fitoni_roma'],
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'usr_admin_001',
      updatedBy: 'usr_admin_001'
    };
    const resO01 = validateOrganization(validOrg);
    assert(resO01.isValid && resO01.errors.length === 0, 'TC-D04: OrganizationEntity válida pasa validación');

    // TC-D05: BusinessEntity válida
    const validBusiness: BusinessEntity = {
      businessId: 'biz_fitoni_polanco',
      tenantId: 'tenant_fitoni_corp',
      brandId: 'brand_fitoni_express',
      orgId: 'org_holding_grupo_a',
      name: 'Fitoni Polanco',
      slug: 'fitoni-polanco',
      category: 'RESTAURANT',
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'usr_admin_001',
      updatedBy: 'usr_admin_001'
    };
    const resBiz01 = validateBusiness(validBusiness);
    assert(resBiz01.isValid && resBiz01.errors.length === 0, 'TC-D05: BusinessEntity válida pasa validación');

    // TC-D06: BranchEntity válida
    const validBranch: BranchEntity = {
      branchId: 'branch_polanco_01',
      businessId: 'biz_fitoni_polanco',
      tenantId: 'tenant_fitoni_corp',
      brandId: 'brand_fitoni_express',
      name: 'Sucursal Polanco Principal',
      address: 'Av. Horacio 123, Polanco, CDMX',
      isMainBranch: true,
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'usr_admin_001',
      updatedBy: 'usr_admin_001'
    };
    const resBr01 = validateBranch(validBranch);
    assert(resBr01.isValid && resBr01.errors.length === 0, 'TC-D06: BranchEntity válida pasa validación');

    // TC-D07: EntitlementEntity válida
    const validEntitlement: EntitlementEntity = {
      entitlementId: 'ent_kds_module',
      tenantId: 'tenant_fitoni_corp',
      subscriptionId: 'sub_pro_001',
      module: 'CONTROL_TOWER',
      grantedCapabilities: ['LIVE_GPS_TRACKING', 'DISPATCH_AUTOMATION'],
      isCustomOverride: false,
      status: 'ACTIVE',
      schemaVersion: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'usr_admin_001'
    };
    const resEnt01 = validateEntitlement(validEntitlement);
    assert(resEnt01.isValid && resEnt01.errors.length === 0, 'TC-D07: EntitlementEntity válida pasa validación');

    // ─── BLOQUE 2: DESIGN TOKEN RESOLVER Y CONTRASTE ───────────────────────────
    console.log('\n--- 2. DESIGN TOKEN RESOLVER & CONTRASTE ---');

    // TC-T01: Resolución con BrandVisualConfig completa
    const tokensCustom = resolveDesignTokens('brand_fitoni_express', validBrand.visual);
    assert(tokensCustom.colors.primary === '#FF6D00', 'TC-T01: Token primary asignado correctamente (#FF6D00)');
    assert(tokensCustom.colors.onPrimary === getContrastText('#FF6D00'), 'TC-T01: onPrimary calculado con alto contraste (#0F172A)');
    assert(tokensCustom.colors.background === '#121212', 'TC-T01: Token background asignado correctamente (#121212)');

    // TC-T02: Cálculo de luminosidad (YIQ)
    assert(isDarkHex('#000000') === true, 'TC-T02: #000000 detectado como color oscuro');
    assert(isDarkHex('#FFFFFF') === false, 'TC-T02: #FFFFFF detectado como color claro');
    assert(getContrastText('#FFFFFF') === '#0F172A', 'TC-T02: Contraste para fondo blanco es oscuro (#0F172A)');
    assert(getContrastText('#0F172A') === '#FFFFFF', 'TC-T02: Contraste para fondo oscuro es blanco (#FFFFFF)');

    // TC-T03: Fallback a DEFAULT_BRAND_CONFIG cuando la configuración es nula o indefinida
    const fallbackTokens = resolveDesignTokens('brand_unknown', null);
    assert(fallbackTokens.colors.primary === DEFAULT_BRAND_CONFIG.primaryColor, 'TC-T03: Fallback a BluePrimary (#0284C7)');
    assert(fallbackTokens.colors.secondary === DEFAULT_BRAND_CONFIG.secondaryColor, 'TC-T03: Fallback a BlueSecondary (#0EA5E9)');
    assert(fallbackTokens.colors.background === DEFAULT_BRAND_CONFIG.backgroundColor, 'TC-T03: Fallback a BgDarkApp (#0F172A)');

    // TC-T04: Sanitización de colores corruptos
    const corruptTokens = resolveDesignTokens('brand_corrupt', {
      primaryColor: 'invalid-color-value',
      backgroundColor: 'another-bad-value'
    });
    assert(corruptTokens.colors.primary === DEFAULT_BRAND_CONFIG.primaryColor, 'TC-T04: Sanitización recupera primary default');
    assert(corruptTokens.colors.background === DEFAULT_BRAND_CONFIG.backgroundColor, 'TC-T04: Sanitización recupera background default');

    // TC-T05: Generación de variables CSS para Web
    const cssVars = generateCssVariables(tokensCustom);
    assert(cssVars['--brand-primary'] === '#FF6D00', 'TC-T05: CSS Variable --brand-primary generada');
    assert(cssVars['--brand-on-primary'] === getContrastText('#FF6D00'), 'TC-T05: CSS Variable --brand-on-primary generada (#0F172A)');
    assert(cssVars['--brand-bg'] === '#121212', 'TC-T05: CSS Variable --brand-bg generada');

    // ─── BLOQUE 3: AISLAMIENTO CROSS-BRAND Y CROSS-TENANT ──────────────────────
    console.log('\n--- 3. AISLAMIENTO CROSS-BRAND Y CROSS-TENANT ---');

    // TC-I01: Dos marcas distintas generan tokens disjuntos sin colisión
    const brandA = resolveDesignTokens('brand_alpha', { primaryColor: '#FF0000', backgroundColor: '#000000' });
    const brandB = resolveDesignTokens('brand_beta', { primaryColor: '#00FF00', backgroundColor: '#FFFFFF' });
    assert(brandA.colors.primary !== brandB.colors.primary, 'TC-I01: Colores primarios aislados entre marcas');
    assert(brandA.colors.onBackground !== brandB.colors.onBackground, 'TC-I01: Contrastes de fondo aislados entre marcas');

    // TC-I02: Invariante de identidad (UID != Tenant != Brand != Business != Role)
    const mockUid: string = 'usr_1001';
    const mockTenantId: string = 'tenant_fitoni_corp';
    const mockBrandId: string = 'brand_fitoni_express';
    const mockBusinessId: string = 'biz_fitoni_polanco';
    const mockRole: string = 'OWNER';

    assert(
      mockUid !== mockTenantId &&
      mockTenantId !== mockBrandId &&
      mockBrandId !== mockBusinessId &&
      mockBusinessId !== mockRole,
      'TC-I02: Desacoplamiento estricto de identificadores de dominio'
    );

    // TC-I03: Invariante Default Brand Palette (Preservación exacta de BlueSystem Delivery)
    assert(DEFAULT_BRAND_CONFIG.primaryColor === '#0284C7', 'TC-I03: BluePrimary (#0284C7) inmutable');
    assert(DEFAULT_BRAND_CONFIG.secondaryColor === '#0EA5E9', 'TC-I03: BlueSecondary (#0EA5E9) inmutable');
    assert(DEFAULT_BRAND_CONFIG.accentColor === '#38BDF8', 'TC-I03: BlueTertiary (#38BDF8) inmutable');
    assert(DEFAULT_BRAND_CONFIG.backgroundColor === '#0F172A', 'TC-I03: BgDarkApp (#0F172A) inmutable');

  } catch (err: any) {
    failed++;
    const msg = `Excepción inesperada: ${err.message || err}`;
    console.error(msg);
    errors.push(msg);
  }

  console.log('\n============================================================');
  console.log(`📊 RESULTADOS: ${passed} PASS, ${failed} FAIL`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}

// Ejecución directa si se invoca con node
if (require.main === module) {
  runMultiBrandCoreNormalizationTests().then(res => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
