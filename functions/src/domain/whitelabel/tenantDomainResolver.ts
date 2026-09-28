/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TENANT DOMAIN RESOLUTION ENGINE (FASE 2E)
 * Pure Deterministic Hostname Normalizer, Domain Registry Matcher & Invariant Enforcement
 * 
 * STRICT INVARIANTS:
 * 1. Zero Mutation of underlying Operational Data.
 * 2. Fail-Closed on unknown, suspended or invalid domains.
 * 3. Domain is NOT Authorization (Domain == Context only).
 */

import {
  TenantDomainEntity,
  DomainStatus,
  DomainType,
  BrandVisualConfig,
  PlanTier,
  TenantFeatureConfig,
  DEFAULT_BRAND_CONFIG,
  RESERVED_SUBDOMAINS
} from '../platform/models';
import { BrandHydrationResolver } from './brandHydrationResolver';
import { TenantFeatureEngine } from './tenantFeatureEngine';

export interface DomainResolutionOutput {
  status: 'FOUND' | 'UNKNOWN_DOMAIN' | 'INACTIVE_DOMAIN' | 'SUSPENDED_TENANT' | 'CONFIGURATION_ERROR';
  tenantId?: string;
  brandId?: string;
  domainEntity?: TenantDomainEntity;
  brandingConfig?: BrandVisualConfig;
  planTier?: PlanTier;
  features?: TenantFeatureConfig;
  isPlatformRoot: boolean;
  errorDetail?: string;
}

export interface DomainDataSource {
  getDomainByName(domain: string): Promise<TenantDomainEntity | null>;
  getTenantById(tenantId: string): Promise<{ status: string; primaryBrandId?: string; planTier?: PlanTier } | null>;
  getBrandById(brandId: string): Promise<{ visual?: Partial<BrandVisualConfig> } | null>;
}

export class DomainNormalizer {
  private static readonly PORT_REGEX = /:\d+$/;
  private static readonly PROTOCOL_REGEX = /^https?:\/\//i;
  private static readonly TRAILING_DOT_REGEX = /\.+$/;
  private static readonly LEADING_TRAILING_SLASHES = /^\/+|\/+$/g;

  /**
   * Normaliza cualquier cadena de hostname o URL a su forma canónica:
   * - Elimina protocolo (http://, https://)
   * - Elimina path o query strings
   * - Elimina puertos (:3000, :8080)
   * - Elimina puntos finales
   * - Convierte a minúsculas y trim
   */
  static normalize(rawInput: string | null | undefined): string {
    if (!rawInput || typeof rawInput !== 'string') {
      return '';
    }

    let clean = rawInput.trim().toLowerCase();

    // Eliminar protocolo si viene incluido
    clean = clean.replace(this.PROTOCOL_REGEX, '');

    // Eliminar path si viene incluido (ej: hostname/path -> hostname)
    const slashIdx = clean.indexOf('/');
    if (slashIdx !== -1) {
      clean = clean.substring(0, slashIdx);
    }

    // Eliminar query string o hash si quedó
    const queryIdx = clean.indexOf('?');
    if (queryIdx !== -1) clean = clean.substring(0, queryIdx);
    const hashIdx = clean.indexOf('#');
    if (hashIdx !== -1) clean = clean.substring(0, hashIdx);

    // Eliminar puerto
    clean = clean.replace(this.PORT_REGEX, '');

    // Eliminar puntos finales
    clean = clean.replace(this.TRAILING_DOT_REGEX, '');

    return clean;
  }

  /**
   * Valida si un subdominio es una palabra reservada del sistema.
   */
  static isReservedSubdomain(subdomain: string): boolean {
    const norm = this.normalize(subdomain);
    return RESERVED_SUBDOMAINS.includes(norm);
  }

  /**
   * Identifica si un hostname corresponde a la plataforma BlueSystem raíz o a un entorno local/staging.
   */
  static isPlatformDomain(hostname: string, platformRootDomain: string = 'bluesystemdelivery.com'): boolean {
    const norm = this.normalize(hostname);
    if (!norm) return false;

    if (
      norm === 'localhost' ||
      norm === '127.0.0.1' ||
      norm === platformRootDomain ||
      norm === `www.${platformRootDomain}` ||
      norm === `app.${platformRootDomain}` ||
      norm === `admin.${platformRootDomain}` ||
      norm === `comercio.${platformRootDomain}` ||
      norm === `registro.${platformRootDomain}` ||
      norm === `merchant.${platformRootDomain}` ||
      norm === `onboarding.${platformRootDomain}` ||
      norm === 'bluesystemdelivery.com' ||
      norm === 'www.bluesystemdelivery.com' ||
      norm === 'app.bluesystemdelivery.com' ||
      norm === 'admin.bluesystemdelivery.com' ||
      norm === 'comercio.bluesystemdelivery.com' ||
      norm === 'registro.bluesystemdelivery.com' ||
      norm === 'merchant.bluesystemdelivery.com' ||
      norm === 'onboarding.bluesystemdelivery.com' ||
      norm === 'bluesystem.com' ||
      norm === 'www.bluesystem.com' ||
      norm === 'app.bluesystem.com' ||
      norm === 'admin.bluesystem.com' ||
      norm === 'comercio.bluesystem.com' ||
      norm === 'registro.bluesystem.com' ||
      norm.endsWith('.web.app') ||
      norm.endsWith('.firebaseapp.com')
    ) {
      return true;
    }

    return false;
  }
}

export class TenantDomainResolver {
  /**
   * Resuelve el contexto de Tenant completo a partir de un hostname crudo.
   */
  static async resolveDomain(
    rawHostname: string,
    dataSource: DomainDataSource,
    platformRootDomain: string = 'bluesystemdelivery.com'
  ): Promise<DomainResolutionOutput> {
    const normalized = DomainNormalizer.normalize(rawHostname);

    if (!normalized) {
      return {
        status: 'UNKNOWN_DOMAIN',
        isPlatformRoot: false,
        errorDetail: 'Hostname no proporcionado o inválido.'
      };
    }

    // 1. Caso: Dominio Raíz de Plataforma / Localhost / Staging genérico
    if (DomainNormalizer.isPlatformDomain(normalized, platformRootDomain)) {
      return {
        status: 'FOUND',
        tenantId: 'default_tenant',
        brandId: 'default_bluesystem_brand',
        isPlatformRoot: true,
        brandingConfig: { ...DEFAULT_BRAND_CONFIG },
        planTier: 'ENTERPRISE',
        features: TenantFeatureEngine.resolveFeaturesForTier('ENTERPRISE')
      };
    }

    // 2. Buscar en el registro de dominios (/tenantDomains)
    let domainRecord: TenantDomainEntity | null = null;
    try {
      domainRecord = await dataSource.getDomainByName(normalized);

      // Si no encontró y empieza con 'www.', probar sin 'www.'
      if (!domainRecord && normalized.startsWith('www.')) {
        const withoutWww = normalized.replace(/^www\./, '');
        domainRecord = await dataSource.getDomainByName(withoutWww);
      }
    } catch (err: any) {
      return {
        status: 'CONFIGURATION_ERROR',
        isPlatformRoot: false,
        errorDetail: `Error al consultar datasource de dominios: ${err.message || 'Error desconocido'}`
      };
    }

    if (!domainRecord) {
      return {
        status: 'UNKNOWN_DOMAIN',
        isPlatformRoot: false,
        errorDetail: `El dominio '${normalized}' no está registrado en BlueSystem Platform.`
      };
    }

    // 3. Validar estado del dominio
    if (domainRecord.status !== 'ACTIVE') {
      return {
        status: 'INACTIVE_DOMAIN',
        tenantId: domainRecord.tenantId,
        brandId: domainRecord.brandId || undefined,
        domainEntity: domainRecord,
        isPlatformRoot: false,
        errorDetail: `El dominio '${normalized}' se encuentra en estado ${domainRecord.status}.`
      };
    }

    // 4. Validar estado del Tenant propietario
    let tenantInfo = null;
    try {
      tenantInfo = await dataSource.getTenantById(domainRecord.tenantId);
    } catch (err: any) {
      return {
        status: 'CONFIGURATION_ERROR',
        tenantId: domainRecord.tenantId,
        isPlatformRoot: false,
        errorDetail: `Error al validar tenant ${domainRecord.tenantId}: ${err.message}`
      };
    }

    if (!tenantInfo) {
      return {
        status: 'CONFIGURATION_ERROR',
        tenantId: domainRecord.tenantId,
        isPlatformRoot: false,
        errorDetail: `El tenant '${domainRecord.tenantId}' asociado al dominio no existe.`
      };
    }

    if (tenantInfo.status === 'SUSPENDED' || tenantInfo.status === 'ARCHIVED') {
      return {
        status: 'SUSPENDED_TENANT',
        tenantId: domainRecord.tenantId,
        isPlatformRoot: false,
        errorDetail: `El tenant '${domainRecord.tenantId}' se encuentra suspendido.`
      };
    }

    // 5. Hidratar marca y branding
    const targetBrandId = domainRecord.brandId || tenantInfo.primaryBrandId || 'brand_default';
    let brandData = null;
    try {
      brandData = await dataSource.getBrandById(targetBrandId);
    } catch {
      brandData = null;
    }

    const { visual } = BrandHydrationResolver.hydrateVisualConfig(brandData?.visual);
    const planTier: PlanTier = tenantInfo.planTier || 'ENTERPRISE';
    const features = TenantFeatureEngine.resolveFeaturesForTier(planTier);

    return {
      status: 'FOUND',
      tenantId: domainRecord.tenantId,
      brandId: targetBrandId,
      domainEntity: domainRecord,
      brandingConfig: visual,
      planTier,
      features,
      isPlatformRoot: false
    };
  }
}
