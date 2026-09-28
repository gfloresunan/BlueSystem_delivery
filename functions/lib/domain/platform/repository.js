"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Repositorio Aislado en Memoria / Staging para Entidades Raíz
 *
 * Garantiza integridad referencial, unicidad de slugs y reglas de inmutabilidad
 * sin interactuar con colecciones operacionales existentes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformRepository = void 0;
const validators_1 = require("./validators");
class PlatformRepository {
    constructor() {
        this.tenants = new Map();
        this.brands = new Map();
        this.subscriptions = new Map();
        this.appConfigs = new Map();
        this.releases = new Map();
    }
    // ─── 1. TENANT REPOSITORY ───────────────────────────────────────────────────
    async createTenant(tenant) {
        const val = (0, validators_1.validateTenant)(tenant);
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
        this.tenants.set(tenant.tenantId, Object.assign({}, tenant));
        return Object.assign({}, tenant);
    }
    async getTenant(tenantId) {
        const doc = this.tenants.get(tenantId);
        return doc ? Object.assign({}, doc) : null;
    }
    async updateTenant(tenantId, updates, updatedBy) {
        const existing = await this.getTenant(tenantId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Tenant '${tenantId}' no encontrado.`);
        }
        const immutabilityVal = (0, validators_1.validateImmutability)(existing, updates, ['tenantId', 'createdAt', 'createdBy', 'schemaVersion']);
        if (!immutabilityVal.isValid) {
            throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
        }
        const merged = Object.assign(Object.assign(Object.assign({}, existing), updates), { updatedAt: Date.now(), updatedBy });
        const val = (0, validators_1.validateTenant)(merged);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Actualización de Tenant inválida: ${val.errors.join('; ')}`);
        }
        this.tenants.set(tenantId, merged);
        return Object.assign({}, merged);
    }
    async archiveTenant(tenantId, updatedBy) {
        return this.updateTenant(tenantId, { status: 'ARCHIVED' }, updatedBy);
    }
    // ─── 2. BRAND REPOSITORY ────────────────────────────────────────────────────
    async createBrand(brand) {
        const val = (0, validators_1.validateBrand)(brand);
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
        const duplicateSlug = Array.from(this.brands.values()).find(b => b.tenantId === brand.tenantId && b.slug === brand.slug && b.status !== 'ARCHIVED');
        if (duplicateSlug) {
            throw new Error(`[DUPLICATE_SLUG] El slug de marca '${brand.slug}' ya existe dentro del tenant '${brand.tenantId}'.`);
        }
        this.brands.set(brand.brandId, Object.assign({}, brand));
        return Object.assign({}, brand);
    }
    async getBrand(brandId) {
        const doc = this.brands.get(brandId);
        return doc ? Object.assign({}, doc) : null;
    }
    async updateBrand(brandId, updates, updatedBy) {
        const existing = await this.getBrand(brandId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Brand '${brandId}' no encontrada.`);
        }
        const immutabilityVal = (0, validators_1.validateImmutability)(existing, updates, ['brandId', 'tenantId', 'createdAt', 'createdBy', 'schemaVersion']);
        if (!immutabilityVal.isValid) {
            throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
        }
        const merged = Object.assign(Object.assign(Object.assign({}, existing), updates), { updatedAt: Date.now(), updatedBy });
        const val = (0, validators_1.validateBrand)(merged);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Actualización de Brand inválida: ${val.errors.join('; ')}`);
        }
        this.brands.set(brandId, merged);
        return Object.assign({}, merged);
    }
    // ─── 3. SUBSCRIPTION REPOSITORY ─────────────────────────────────────────────
    async createSubscription(sub) {
        const val = (0, validators_1.validateSubscription)(sub);
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
        this.subscriptions.set(sub.subscriptionId, Object.assign({}, sub));
        return Object.assign({}, sub);
    }
    async getSubscription(subId) {
        const doc = this.subscriptions.get(subId);
        return doc ? Object.assign({}, doc) : null;
    }
    // ─── 4. APP CONFIG REPOSITORY ───────────────────────────────────────────────
    async createAppConfig(config) {
        const val = (0, validators_1.validateAppConfig)(config);
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
            const duplicateAppId = Array.from(this.appConfigs.values()).find(c => c.platform === 'ANDROID' && c.distribution.applicationId === config.distribution.applicationId && c.status !== 'ARCHIVED');
            if (duplicateAppId) {
                throw new Error(`[DUPLICATE_APP_ID] El applicationId '${config.distribution.applicationId}' ya está registrado en la AppConfig '${duplicateAppId.configId}'.`);
            }
        }
        this.appConfigs.set(config.configId, Object.assign({}, config));
        return Object.assign({}, config);
    }
    async getAppConfig(configId) {
        const doc = this.appConfigs.get(configId);
        return doc ? Object.assign({}, doc) : null;
    }
    // ─── 5. RELEASE REPOSITORY ──────────────────────────────────────────────────
    async createRelease(release) {
        const val = (0, validators_1.validateRelease)(release);
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
        const duplicateBuild = Array.from(this.releases.values()).find(r => r.configId === release.configId && r.version === release.version && r.buildNumber === release.buildNumber);
        if (duplicateBuild) {
            throw new Error(`[DUPLICATE_RELEASE_BUILD] Ya existe la Release '${duplicateBuild.releaseId}' para la versión ${release.version} build ${release.buildNumber}.`);
        }
        this.releases.set(release.releaseId, Object.assign({}, release));
        return Object.assign({}, release);
    }
    async getRelease(releaseId) {
        const doc = this.releases.get(releaseId);
        return doc ? Object.assign({}, doc) : null;
    }
    async publishRelease(releaseId, releasedBy) {
        const existing = await this.getRelease(releaseId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Release '${releaseId}' no encontrada.`);
        }
        if (existing.status === 'RELEASED') {
            throw new Error(`[ALREADY_RELEASED] La Release '${releaseId}' ya fue publicada y es inmutable.`);
        }
        const updated = Object.assign(Object.assign({}, existing), { status: 'RELEASED', releasedAt: Date.now(), releasedBy, updatedAt: Date.now() });
        this.releases.set(releaseId, updated);
        return Object.assign({}, updated);
    }
    async updateRelease(releaseId, updates) {
        const existing = await this.getRelease(releaseId);
        if (!existing) {
            throw new Error(`[NOT_FOUND] Release '${releaseId}' no encontrada.`);
        }
        if (existing.status === 'RELEASED' || existing.status === 'ARCHIVED') {
            throw new Error(`[IMMUTABILITY_ERROR] Una Release en estado '${existing.status}' es estrictamente inmutable.`);
        }
        const immutabilityVal = (0, validators_1.validateImmutability)(existing, updates, ['releaseId', 'tenantId', 'brandId', 'configId', 'platform', 'createdAt', 'createdBy']);
        if (!immutabilityVal.isValid) {
            throw new Error(`[IMMUTABILITY_ERROR] ${immutabilityVal.errors.join('; ')}`);
        }
        const merged = Object.assign(Object.assign(Object.assign({}, existing), updates), { updatedAt: Date.now() });
        const val = (0, validators_1.validateRelease)(merged);
        if (!val.isValid) {
            throw new Error(`[VALIDATION_ERROR] Actualización de Release inválida: ${val.errors.join('; ')}`);
        }
        this.releases.set(releaseId, merged);
        return Object.assign({}, merged);
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
exports.PlatformRepository = PlatformRepository;
//# sourceMappingURL=repository.js.map