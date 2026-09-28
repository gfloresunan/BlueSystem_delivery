/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CLIENT DOMAIN RESOLVER (FASE 2E)
 * Pure Deterministic Client-Side Hostname Normalizer & Cached Domain Resolution
 */

import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { WebDomainResolutionResult, WebTenantDomainEntity } from './types';
import { DEFAULT_BRAND_CONFIG } from '../branding/defaultBrand';

export class ClientDomainNormalizer {
  private static readonly PORT_REGEX = /:\d+$/;
  private static readonly PROTOCOL_REGEX = /^https?:\/\//i;
  private static readonly TRAILING_DOT_REGEX = /\.+$/;

  static normalize(rawInput: string | null | undefined): string {
    if (!rawInput || typeof rawInput !== 'string') return '';
    let clean = rawInput.trim().toLowerCase();
    clean = clean.replace(this.PROTOCOL_REGEX, '');
    const slashIdx = clean.indexOf('/');
    if (slashIdx !== -1) clean = clean.substring(0, slashIdx);
    const queryIdx = clean.indexOf('?');
    if (queryIdx !== -1) clean = clean.substring(0, queryIdx);
    clean = clean.replace(this.PORT_REGEX, '');
    clean = clean.replace(this.TRAILING_DOT_REGEX, '');
    return clean;
  }

  static isPlatformDomain(hostname: string, platformRootDomain: string = 'bluesystemdelivery.com'): boolean {
    const norm = this.normalize(hostname);
    if (!norm) return false;
    return (
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
    );
  }
}

// In-Memory Cache de Dominios para evitar queries repetitivas en render cycles
const DOMAIN_CACHE = new Map<string, WebDomainResolutionResult>();

export class ClientDomainResolver {
  static async resolveCurrentDomain(
    overrideHostname?: string,
    platformRootDomain: string = 'bluesystemdelivery.com'
  ): Promise<WebDomainResolutionResult> {
    const rawHostname = overrideHostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    const normalized = ClientDomainNormalizer.normalize(rawHostname);

    if (DOMAIN_CACHE.has(normalized)) {
      return DOMAIN_CACHE.get(normalized)!;
    }

    // 1. Caso Plataforma / Localhost
    if (ClientDomainNormalizer.isPlatformDomain(normalized, platformRootDomain)) {
      const result: WebDomainResolutionResult = {
        status: 'RESOLVED',
        hostname: normalized,
        tenantId: 'default_tenant',
        brandId: 'default_bluesystem_brand',
        isPlatformRoot: true,
        displayName: 'BlueSystem Delivery',
        branding: { ...DEFAULT_BRAND_CONFIG }
      };
      DOMAIN_CACHE.set(normalized, result);
      return result;
    }

    try {
      // 2. Query Firestore /tenantDomains
      const q = query(
        collection(db, 'tenantDomains'),
        where('domain', '==', normalized),
        limit(1)
      );
      let snap = await getDocs(q);

      // Si no encuentra y empieza con www., intentar sin www.
      if (snap.empty && normalized.startsWith('www.')) {
        const withoutWww = normalized.replace(/^www\./, '');
        const qWww = query(
          collection(db, 'tenantDomains'),
          where('domain', '==', withoutWww),
          limit(1)
        );
        snap = await getDocs(qWww);
      }

      if (snap.empty) {
        const result: WebDomainResolutionResult = {
          status: 'UNKNOWN_DOMAIN',
          hostname: normalized,
          isPlatformRoot: false,
          errorDetail: `El dominio '${normalized}' no está registrado en la plataforma.`
        };
        DOMAIN_CACHE.set(normalized, result);
        return result;
      }

      const domainData = snap.docs[0].data() as WebTenantDomainEntity;

      // 3. Validar estado del dominio
      if (domainData.status !== 'ACTIVE') {
        const result: WebDomainResolutionResult = {
          status: 'INACTIVE_DOMAIN',
          hostname: normalized,
          tenantId: domainData.tenantId,
          brandId: domainData.brandId || undefined,
          domainEntity: domainData,
          isPlatformRoot: false,
          errorDetail: `El dominio '${normalized}' se encuentra inactivo (${domainData.status}).`
        };
        DOMAIN_CACHE.set(normalized, result);
        return result;
      }

      // 4. Validar estado del Tenant
      const tenantDoc = await getDoc(doc(db, 'tenants', domainData.tenantId));
      if (!tenantDoc.exists()) {
        const result: WebDomainResolutionResult = {
          status: 'CONFIGURATION_ERROR',
          hostname: normalized,
          tenantId: domainData.tenantId,
          isPlatformRoot: false,
          errorDetail: `El tenant asociado '${domainData.tenantId}' no existe.`
        };
        DOMAIN_CACHE.set(normalized, result);
        return result;
      }

      const tenantData = tenantDoc.data();
      if (tenantData?.status === 'SUSPENDED' || tenantData?.status === 'ARCHIVED') {
        const result: WebDomainResolutionResult = {
          status: 'SUSPENDED_TENANT',
          hostname: normalized,
          tenantId: domainData.tenantId,
          isPlatformRoot: false,
          errorDetail: `El tenant '${domainData.tenantId}' se encuentra suspendido.`
        };
        DOMAIN_CACHE.set(normalized, result);
        return result;
      }

      // 5. Cargar branding de marca
      const targetBrandId = domainData.brandId || tenantData?.primaryBrandId;
      let brandVisual: any = null;
      let brandDisplayName = tenantData?.name || domainData.tenantId.toUpperCase();

      if (targetBrandId) {
        try {
          const brandDoc = await getDoc(doc(db, 'brands', targetBrandId));
          if (brandDoc.exists()) {
            const bData = brandDoc.data();
            brandVisual = bData?.visual;
            if (bData?.displayName) brandDisplayName = bData.displayName;
          }
        } catch {
          // Fallback a branding por defecto
        }
      }

      const result: WebDomainResolutionResult = {
        status: 'RESOLVED',
        hostname: normalized,
        tenantId: domainData.tenantId,
        brandId: targetBrandId || 'brand_default',
        domainEntity: domainData,
        isPlatformRoot: false,
        displayName: brandDisplayName,
        branding: brandVisual || { ...DEFAULT_BRAND_CONFIG }
      };

      DOMAIN_CACHE.set(normalized, result);
      return result;
    } catch (err: any) {
      const result: WebDomainResolutionResult = {
        status: 'CONFIGURATION_ERROR',
        hostname: normalized,
        isPlatformRoot: false,
        errorDetail: `Error al resolver dominio: ${err.message || 'Error desconocido'}`
      };
      return result;
    }
  }
}
