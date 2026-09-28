/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Repositorio Aislado en Memoria / Staging para Entidades Raíz
 * 
 * Garantiza integridad referencial, unicidad de slugs y reglas de inmutabilidad
 * sin interactuar con colecciones operacionales existentes.
 */

import {
  TenantEntity,
  BrandEntity,
  SubscriptionEntity,
  AppConfigEntity,
  ReleaseEntity
} from './models';
import {
  validateTenant,
  validateBrand,
  validateSubscription,
  validateAppConfig,
  validateRelease,
  validateImmutability
} from './validators';

export class PlatformRepository {
  private tenants = new Map<string, TenantEntity>();
  private brands = new Map<string, BrandEntity>();
  private subscriptions = new Map<string, SubscriptionEntity>();
  private appConfigs = new Map<string, AppConfigEntity>();
  private releases = new Map<string, ReleaseEntity>();

  // ─── 1. TENANT REPOSITORY ───────────────────────────────────────────────────
  async createTenant(tenant: TenantEntity): Promise<TenantEntity> {
    const val = validateTenant(tenant);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Tenant inválido: ${val.errors.join('; ')}`);
    }

    if (this.tenants.has(tenant.tenantId)) {
      throw new Error(`[DUPLICATE_ID] Ya existe un Tenant con ID '${tenant.tenantId}'.`);
    }

    // Validación de unicidad de Slug
    const duplicateSlug = Array.from(this.tenants.values()).find(t => t.slug === tenant.slug && t.status !== 'ARCHIVED');
    if (duplicateSlug) {
      throw new Error(`[DUPLICATE_SLUG] El slug '${tenant.slug}' ya se encuentra en uso por el tenant '${duplicateSlug.tenantId}'.`);
    }

    this.tenants.set(tenant.tenantId, { ...tenant });
    return { ...tenant };
  }

  async getTenant(tenantId: string): Promise<TenantEntity | null> {
    const doc = this.tenants.get(tenantId);
    return doc ? { ...doc } : null;
  }

  async updateTenant(tenantId: string, updates: Partial<TenantEntity>, updatedBy: string): Promise<TenantEntity> {
    const existing = await this.getTenant(tenantId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Tenant '${tenantId}' no encontrado.`);
    }

    const immutabilityVal = validateImmutability(existing, updates, ['tenantId', 'createdAt', 'createdBy', 'schemaVersion']);
    if (!immutabilityVal.isValid) {
      throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
    }

    const merged: TenantEntity = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
      updatedBy
    };

    const val = validateTenant(merged);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Actualización de Tenant inválida: ${val.errors.join('; ')}`);
    }

    this.tenants.set(tenantId, merged);
    return { ...merged };
  }

  async archiveTenant(tenantId: string, updatedBy: string): Promise<TenantEntity> {
    return this.updateTenant(tenantId, { status: 'ARCHIVED' }, updatedBy);
  }

  // ─── 2. BRAND REPOSITORY ────────────────────────────────────────────────────
  async createBrand(brand: BrandEntity): Promise<BrandEntity> {
    const val = validateBrand(brand);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Brand inválida: ${val.errors.join('; ')}`);
    }

    // Integridad Referencial: El Tenant debe existir
    const tenant = await this.getTenant(brand.tenantId);
    if (!tenant) {
      throw new Error(`[REFERENTIAL_INTEGRITY] El Tenant '${brand.tenantId}' no existe.`);
    }

    if (this.brands.has(brand.brandId)) {
      throw new Error(`[DUPLICATE_ID] Ya existe una Brand con ID '${brand.brandId}'.`);
    }

    // Unicidad de Slug por Tenant
    const duplicateSlug = Array.from(this.brands.values()).find(
      b => b.tenantId === brand.tenantId && b.slug === brand.slug && b.status !== 'ARCHIVED'
    );
    if (duplicateSlug) {
      throw new Error(`[DUPLICATE_SLUG] El slug de marca '${brand.slug}' ya existe dentro del tenant '${brand.tenantId}'.`);
    }

    this.brands.set(brand.brandId, { ...brand });
    return { ...brand };
  }

  async getBrand(brandId: string): Promise<BrandEntity | null> {
    const doc = this.brands.get(brandId);
    return doc ? { ...doc } : null;
  }

  async updateBrand(brandId: string, updates: Partial<BrandEntity>, updatedBy: string): Promise<BrandEntity> {
    const existing = await this.getBrand(brandId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Brand '${brandId}' no encontrada.`);
    }

    const immutabilityVal = validateImmutability(existing, updates, ['brandId', 'tenantId', 'createdAt', 'createdBy', 'schemaVersion']);
    if (!immutabilityVal.isValid) {
      throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
    }

    const merged: BrandEntity = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
      updatedBy
    };

    const val = validateBrand(merged);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Actualización de Brand inválida: ${val.errors.join('; ')}`);
    }

    this.brands.set(brandId, merged);
    return { ...merged };
  }

  // ─── 3. SUBSCRIPTION REPOSITORY ─────────────────────────────────────────────
  async createSubscription(sub: SubscriptionEntity): Promise<SubscriptionEntity> {
    const val = validateSubscription(sub);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Subscription inválida: ${val.errors.join('; ')}`);
    }

    const tenant = await this.getTenant(sub.tenantId);
    if (!tenant) {
      throw new Error(`[REFERENTIAL_INTEGRITY] El Tenant '${sub.tenantId}' no existe.`);
    }

    if (this.subscriptions.has(sub.subscriptionId)) {
      throw new Error(`[DUPLICATE_ID] Ya existe una Subscription con ID '${sub.subscriptionId}'.`);
    }

    this.subscriptions.set(sub.subscriptionId, { ...sub });
    return { ...sub };
  }

  async getSubscription(subId: string): Promise<SubscriptionEntity | null> {
    const doc = this.subscriptions.get(subId);
    return doc ? { ...doc } : null;
  }

  // ─── 4. APP CONFIG REPOSITORY ───────────────────────────────────────────────
  async createAppConfig(config: AppConfigEntity): Promise<AppConfigEntity> {
    const val = validateAppConfig(config);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] AppConfig inválida: ${val.errors.join('; ')}`);
    }

    const tenant = await this.getTenant(config.tenantId);
    if (!tenant) {
      throw new Error(`[REFERENTIAL_INTEGRITY] El Tenant '${config.tenantId}' no existe.`);
    }

    const brand = await this.getBrand(config.brandId);
    if (!brand) {
      throw new Error(`[REFERENTIAL_INTEGRITY] La Brand '${config.brandId}' no existe.`);
    }
    if (brand.tenantId !== config.tenantId) {
      throw new Error(`[CROSS_TENANT_VIOLATION] La Brand '${config.brandId}' no pertenece al Tenant '${config.tenantId}'.`);
    }

    if (this.appConfigs.has(config.configId)) {
      throw new Error(`[DUPLICATE_ID] Ya existe una AppConfig con ID '${config.configId}'.`);
    }

    // Unicidad de ApplicationId en Android
    if (config.platform === 'ANDROID') {
      const duplicateAppId = Array.from(this.appConfigs.values()).find(
        c => c.platform === 'ANDROID' && c.distribution.applicationId === config.distribution.applicationId && c.status !== 'ARCHIVED'
      );
      if (duplicateAppId) {
        throw new Error(`[DUPLICATE_APP_ID] El applicationId '${config.distribution.applicationId}' ya está registrado en la AppConfig '${duplicateAppId.configId}'.`);
      }
    }

    this.appConfigs.set(config.configId, { ...config });
    return { ...config };
  }

  async getAppConfig(configId: string): Promise<AppConfigEntity | null> {
    const doc = this.appConfigs.get(configId);
    return doc ? { ...doc } : null;
  }

  // ─── 5. RELEASE REPOSITORY ──────────────────────────────────────────────────
  async createRelease(release: ReleaseEntity): Promise<ReleaseEntity> {
    const val = validateRelease(release);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Release inválida: ${val.errors.join('; ')}`);
    }

    const appConfig = await this.getAppConfig(release.configId);
    if (!appConfig) {
      throw new Error(`[REFERENTIAL_INTEGRITY] La AppConfig '${release.configId}' no existe.`);
    }
    if (appConfig.tenantId !== release.tenantId || appConfig.brandId !== release.brandId) {
      throw new Error(`[CROSS_TENANT_VIOLATION] La AppConfig no coincide con el Tenant o Brand de la Release.`);
    }

    if (this.releases.has(release.releaseId)) {
      throw new Error(`[DUPLICATE_ID] Ya existe una Release con ID '${release.releaseId}'.`);
    }

    // Unicidad de versión + buildNumber por AppConfig
    const duplicateBuild = Array.from(this.releases.values()).find(
      r => r.configId === release.configId && r.version === release.version && r.buildNumber === release.buildNumber
    );
    if (duplicateBuild) {
      throw new Error(`[DUPLICATE_RELEASE_BUILD] Ya existe la Release '${duplicateBuild.releaseId}' para la versión ${release.version} build ${release.buildNumber}.`);
    }

    this.releases.set(release.releaseId, { ...release });
    return { ...release };
  }

  async getRelease(releaseId: string): Promise<ReleaseEntity | null> {
    const doc = this.releases.get(releaseId);
    return doc ? { ...doc } : null;
  }

  async publishRelease(releaseId: string, releasedBy: string): Promise<ReleaseEntity> {
    const existing = await this.getRelease(releaseId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Release '${releaseId}' no encontrada.`);
    }
    if (existing.status === 'RELEASED') {
      throw new Error(`[ALREADY_RELEASED] La Release '${releaseId}' ya fue publicada y es inmutable.`);
    }

    const updated: ReleaseEntity = {
      ...existing,
      status: 'RELEASED',
      releasedAt: Date.now(),
      releasedBy,
      updatedAt: Date.now()
    };

    this.releases.set(releaseId, updated);
    return { ...updated };
  }

  async updateRelease(releaseId: string, updates: Partial<ReleaseEntity>): Promise<ReleaseEntity> {
    const existing = await this.getRelease(releaseId);
    if (!existing) {
      throw new Error(`[NOT_FOUND] Release '${releaseId}' no encontrada.`);
    }

    if (existing.status === 'RELEASED' || existing.status === 'ARCHIVED') {
      throw new Error(`[IMMUTABILITY_ERROR] Una Release en estado '${existing.status}' es estrictamente inmutable.`);
    }

    const immutabilityVal = validateImmutability(existing, updates, ['releaseId', 'tenantId', 'brandId', 'configId', 'platform', 'createdAt', 'createdBy']);
    if (!immutabilityVal.isValid) {
      throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
    }

    const merged: ReleaseEntity = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    const val = validateRelease(merged);
    if (!val.isValid) {
      throw new Error(`[VALIDATION_ERROR] Actualización de Release inválida: ${val.errors.join('; ')}`);
    }

    this.releases.set(releaseId, merged);
    return { ...merged };
  }

  // ─── RESET PARA ENTORNOS DE TEST ───────────────────────────────────────────
  clearAll() {
    this.tenants.clear();
    this.brands.clear();
    this.subscriptions.clear();
    this.appConfigs.clear();
    this.releases.clear();
  }
}
