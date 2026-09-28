"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM FOUNDATION LAYER (FASE 2B)
 * Validadores Puros de Dominio para Schemas Raíz Multi-Brand
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTenant = validateTenant;
exports.validateBrand = validateBrand;
exports.validateSubscription = validateSubscription;
exports.validateAppConfig = validateAppConfig;
exports.validateRelease = validateRelease;
exports.validateImmutability = validateImmutability;
exports.validateOrganization = validateOrganization;
exports.validateBusiness = validateBusiness;
exports.validateBranch = validateBranch;
exports.validateEntitlement = validateEntitlement;
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const APP_ID_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const VALID_COMMERCIAL_MODELS = ['MARKETPLACE', 'AGENCY', 'WHITE_LABEL_COMMERCE', 'ENTERPRISE'];
const VALID_TENANT_STATUSES = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'MIGRATION_PENDING', 'ARCHIVED'];
const VALID_BRAND_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const VALID_SUBSCRIPTION_STATUSES = ['DRAFT', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'ARCHIVED'];
const VALID_PLAN_TIERS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
const VALID_PLATFORMS = ['ANDROID', 'IOS', 'WEB'];
const VALID_ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'];
const VALID_APP_CONFIG_STATUSES = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'];
const VALID_RELEASE_STATUSES = ['DRAFT', 'READY', 'BUILDING', 'BUILD_SUCCESS', 'BUILD_FAILED', 'RELEASED', 'ROLLED_BACK', 'ARCHIVED'];
const VALID_ARTIFACT_TYPES = ['APK', 'AAB', 'IPA', 'WEB_BUNDLE'];
// ─── VALIDACIÓN: TENANT ───────────────────────────────────────────────────────
function validateTenant(tenant) {
    const errors = [];
    if (!tenant.tenantId || typeof tenant.tenantId !== 'string' || tenant.tenantId.trim().length === 0) {
        errors.push('tenantId es obligatorio y debe ser un string no vacío.');
    }
    if (!tenant.name || typeof tenant.name !== 'string' || tenant.name.trim().length < 2) {
        errors.push('name es obligatorio (mínimo 2 caracteres).');
    }
    if (!tenant.legalName || typeof tenant.legalName !== 'string' || tenant.legalName.trim().length < 2) {
        errors.push('legalName es obligatorio (mínimo 2 caracteres).');
    }
    if (!tenant.slug || !SLUG_REGEX.test(tenant.slug)) {
        errors.push('slug es inválido. Debe contener solo caracteres alfanuméricos en minúsculas y guiones (ej. "fitoni-corp").');
    }
    if (!tenant.type || !VALID_COMMERCIAL_MODELS.includes(tenant.type)) {
        errors.push(`type es inválido. Valores permitidos: ${VALID_COMMERCIAL_MODELS.join(', ')}.`);
    }
    if (!tenant.status || !VALID_TENANT_STATUSES.includes(tenant.status)) {
        errors.push(`status es inválido. Valores permitidos: ${VALID_TENANT_STATUSES.join(', ')}.`);
    }
    if (!tenant.schemaVersion || tenant.schemaVersion !== '1.0') {
        errors.push('schemaVersion es obligatorio y debe ser "1.0".');
    }
    if (!tenant.createdAt || typeof tenant.createdAt !== 'number' || tenant.createdAt <= 0) {
        errors.push('createdAt es obligatorio y debe ser un timestamp epoch ms válido.');
    }
    if (!tenant.createdBy || typeof tenant.createdBy !== 'string' || tenant.createdBy.trim().length === 0) {
        errors.push('createdBy es obligatorio.');
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: BRAND ────────────────────────────────────────────────────────
function validateBrand(brand) {
    const errors = [];
    if (!brand.brandId || typeof brand.brandId !== 'string' || brand.brandId.trim().length === 0) {
        errors.push('brandId es obligatorio.');
    }
    if (!brand.tenantId || typeof brand.tenantId !== 'string' || brand.tenantId.trim().length === 0) {
        errors.push('tenantId es obligatorio.');
    }
    if (!brand.displayName || typeof brand.displayName !== 'string' || brand.displayName.trim().length < 2) {
        errors.push('displayName es obligatorio (mínimo 2 caracteres).');
    }
    if (!brand.shortName || typeof brand.shortName !== 'string' || brand.shortName.trim().length < 2) {
        errors.push('shortName es obligatorio (mínimo 2 caracteres).');
    }
    if (!brand.slug || !SLUG_REGEX.test(brand.slug)) {
        errors.push('slug es inválido. Debe contener solo letras minúsculas, números y guiones.');
    }
    if (!brand.status || !VALID_BRAND_STATUSES.includes(brand.status)) {
        errors.push(`status es inválido. Valores permitidos: ${VALID_BRAND_STATUSES.join(', ')}.`);
    }
    // Validación de Visual Config
    if (!brand.visual) {
        errors.push('visual es obligatorio.');
    }
    else {
        if (!brand.visual.primaryColor || !HEX_COLOR_REGEX.test(brand.visual.primaryColor)) {
            errors.push('visual.primaryColor debe ser un color HEX válido (ej. "#FF6D00").');
        }
        if (!brand.visual.secondaryColor || !HEX_COLOR_REGEX.test(brand.visual.secondaryColor)) {
            errors.push('visual.secondaryColor debe ser un color HEX válido.');
        }
        if (!brand.visual.accentColor || !HEX_COLOR_REGEX.test(brand.visual.accentColor)) {
            errors.push('visual.accentColor debe ser un color HEX válido.');
        }
        if (!brand.visual.backgroundColor || !HEX_COLOR_REGEX.test(brand.visual.backgroundColor)) {
            errors.push('visual.backgroundColor debe ser un color HEX válido.');
        }
        if (!brand.visual.textColor || !HEX_COLOR_REGEX.test(brand.visual.textColor)) {
            errors.push('visual.textColor debe ser un color HEX válido.');
        }
    }
    // Validación de Metadatos
    if (!brand.metadata) {
        errors.push('metadata es obligatorio.');
    }
    else {
        if (!brand.metadata.supportEmail || !brand.metadata.supportEmail.includes('@')) {
            errors.push('metadata.supportEmail debe ser un correo electrónico válido.');
        }
        if (!brand.metadata.supportPhone || brand.metadata.supportPhone.trim().length < 5) {
            errors.push('metadata.supportPhone es obligatorio.');
        }
    }
    if (!brand.schemaVersion || brand.schemaVersion !== '1.0') {
        errors.push('schemaVersion debe ser "1.0".');
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: SUBSCRIPTION ─────────────────────────────────────────────────
function validateSubscription(sub) {
    const errors = [];
    if (!sub.subscriptionId || typeof sub.subscriptionId !== 'string' || sub.subscriptionId.trim().length === 0) {
        errors.push('subscriptionId es obligatorio.');
    }
    if (!sub.tenantId || typeof sub.tenantId !== 'string' || sub.tenantId.trim().length === 0) {
        errors.push('tenantId es obligatorio.');
    }
    if (!sub.planId || typeof sub.planId !== 'string') {
        errors.push('planId es obligatorio.');
    }
    if (!sub.planTier || !VALID_PLAN_TIERS.includes(sub.planTier)) {
        errors.push(`planTier es inválido. Valores permitidos: ${VALID_PLAN_TIERS.join(', ')}.`);
    }
    if (!sub.status || !VALID_SUBSCRIPTION_STATUSES.includes(sub.status)) {
        errors.push(`status es inválido. Valores permitidos: ${VALID_SUBSCRIPTION_STATUSES.join(', ')}.`);
    }
    if (!sub.startDate || typeof sub.startDate !== 'number' || sub.startDate <= 0) {
        errors.push('startDate es obligatorio y debe ser un timestamp válido.');
    }
    if (!sub.billingCycle || !['MONTHLY', 'ANNUAL', 'CUSTOM'].includes(sub.billingCycle)) {
        errors.push('billingCycle es inválido.');
    }
    if (!Array.isArray(sub.enabledFeatures)) {
        errors.push('enabledFeatures debe ser un array.');
    }
    if (!sub.limits || typeof sub.limits !== 'object') {
        errors.push('limits es obligatorio.');
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: APP CONFIG ───────────────────────────────────────────────────
function validateAppConfig(config) {
    const errors = [];
    if (!config.configId || typeof config.configId !== 'string') {
        errors.push('configId es obligatorio.');
    }
    if (!config.tenantId || typeof config.tenantId !== 'string') {
        errors.push('tenantId es obligatorio.');
    }
    if (!config.brandId || typeof config.brandId !== 'string') {
        errors.push('brandId es obligatorio.');
    }
    if (!config.platform || !VALID_PLATFORMS.includes(config.platform)) {
        errors.push(`platform es inválido. Valores permitidos: ${VALID_PLATFORMS.join(', ')}.`);
    }
    if (!config.environment || !VALID_ENVIRONMENTS.includes(config.environment)) {
        errors.push(`environment es inválido. Valores permitidos: ${VALID_ENVIRONMENTS.join(', ')}.`);
    }
    if (!config.status || !VALID_APP_CONFIG_STATUSES.includes(config.status)) {
        errors.push(`status es inválido. Valores permitidos: ${VALID_APP_CONFIG_STATUSES.join(', ')}.`);
    }
    // Validación de Distribución
    if (!config.distribution) {
        errors.push('distribution es obligatorio.');
    }
    else {
        if (!config.distribution.appName || config.distribution.appName.trim().length < 2) {
            errors.push('distribution.appName es obligatorio.');
        }
        if (config.platform === 'ANDROID') {
            if (!config.distribution.applicationId || !APP_ID_REGEX.test(config.distribution.applicationId)) {
                errors.push('distribution.applicationId debe ser un package name válido de Android (ej: "com.fitoni.express").');
            }
        }
        if (config.platform === 'IOS') {
            if (!config.distribution.bundleId || !APP_ID_REGEX.test(config.distribution.bundleId)) {
                errors.push('distribution.bundleId debe ser un bundle identifier válido de iOS.');
            }
        }
    }
    // Validación de Providers
    if (!config.providers) {
        errors.push('providers es obligatorio.');
    }
    else {
        if (!config.providers.firebaseProjectId || config.providers.firebaseProjectId.trim().length === 0) {
            errors.push('providers.firebaseProjectId es obligatorio.');
        }
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: RELEASE ──────────────────────────────────────────────────────
function validateRelease(release) {
    const errors = [];
    if (!release.releaseId || typeof release.releaseId !== 'string') {
        errors.push('releaseId es obligatorio.');
    }
    if (!release.tenantId || typeof release.tenantId !== 'string') {
        errors.push('tenantId es obligatorio.');
    }
    if (!release.brandId || typeof release.brandId !== 'string') {
        errors.push('brandId es obligatorio.');
    }
    if (!release.configId || typeof release.configId !== 'string') {
        errors.push('configId es obligatorio.');
    }
    if (!release.platform || !VALID_PLATFORMS.includes(release.platform)) {
        errors.push(`platform es inválido. Valores permitidos: ${VALID_PLATFORMS.join(', ')}.`);
    }
    if (!release.version || !SEMVER_REGEX.test(release.version)) {
        errors.push('version debe cumplir con el formato SemVer X.Y.Z (ej. "1.0.0").');
    }
    if (!release.buildNumber || typeof release.buildNumber !== 'number' || release.buildNumber <= 0) {
        errors.push('buildNumber debe ser un entero positivo mayor a 0.');
    }
    if (!release.environment || !VALID_ENVIRONMENTS.includes(release.environment)) {
        errors.push(`environment es inválido. Valores permitidos: ${VALID_ENVIRONMENTS.join(', ')}.`);
    }
    if (!release.artifactType || !VALID_ARTIFACT_TYPES.includes(release.artifactType)) {
        errors.push(`artifactType es inválido. Valores permitidos: ${VALID_ARTIFACT_TYPES.join(', ')}.`);
    }
    if (!release.status || !VALID_RELEASE_STATUSES.includes(release.status)) {
        errors.push(`status es inválido. Valores permitidos: ${VALID_RELEASE_STATUSES.join(', ')}.`);
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: INMUTABILIDAD EN ACTUALIZACIONES ─────────────────────────────
function validateImmutability(existingDoc, updatedDoc, immutableFields) {
    const errors = [];
    for (const field of immutableFields) {
        if (updatedDoc[field] !== undefined && updatedDoc[field] !== existingDoc[field]) {
            errors.push(`El campo inmutable '${String(field)}' no puede ser modificado (Valor original: ${existingDoc[field]}, Intento: ${updatedDoc[field]}).`);
        }
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: ORGANIZATION ────────────────────────────────────────────────
function validateOrganization(org) {
    const errors = [];
    if (!org.orgId || typeof org.orgId !== 'string' || org.orgId.trim().length === 0) {
        errors.push('orgId es obligatorio y debe ser un string no vacío.');
    }
    if (!org.tenantId || typeof org.tenantId !== 'string' || org.tenantId.trim().length === 0) {
        errors.push('tenantId es obligatorio.');
    }
    if (!org.displayName || typeof org.displayName !== 'string' || org.displayName.trim().length < 2) {
        errors.push('displayName es obligatorio (mínimo 2 caracteres).');
    }
    if (!org.slug || !SLUG_REGEX.test(org.slug)) {
        errors.push('slug es inválido.');
    }
    if (!org.status || !['ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(org.status)) {
        errors.push('status es inválido.');
    }
    if (!Array.isArray(org.businessIds)) {
        errors.push('businessIds debe ser un array.');
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: BUSINESS ────────────────────────────────────────────────────
function validateBusiness(biz) {
    const errors = [];
    if (!biz.businessId || typeof biz.businessId !== 'string' || biz.businessId.trim().length === 0) {
        errors.push('businessId es obligatorio y debe ser un string no vacío.');
    }
    if (!biz.tenantId || typeof biz.tenantId !== 'string' || biz.tenantId.trim().length === 0) {
        errors.push('tenantId es obligatorio.');
    }
    if (!biz.name || typeof biz.name !== 'string' || biz.name.trim().length < 2) {
        errors.push('name es obligatorio (mínimo 2 caracteres).');
    }
    if (!biz.slug || !SLUG_REGEX.test(biz.slug)) {
        errors.push('slug es inválido.');
    }
    if (!biz.status || !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(biz.status)) {
        errors.push('status es inválido.');
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: BRANCH ──────────────────────────────────────────────────────
function validateBranch(branch) {
    const errors = [];
    if (!branch.branchId || typeof branch.branchId !== 'string' || branch.branchId.trim().length === 0) {
        errors.push('branchId es obligatorio.');
    }
    if (!branch.businessId || typeof branch.businessId !== 'string' || branch.businessId.trim().length === 0) {
        errors.push('businessId es obligatorio.');
    }
    if (!branch.tenantId || typeof branch.tenantId !== 'string' || branch.tenantId.trim().length === 0) {
        errors.push('tenantId es obligatorio.');
    }
    if (!branch.name || typeof branch.name !== 'string' || branch.name.trim().length < 2) {
        errors.push('name es obligatorio (mínimo 2 caracteres).');
    }
    if (!branch.address || typeof branch.address !== 'string' || branch.address.trim().length < 5) {
        errors.push('address es obligatorio (mínimo 5 caracteres).');
    }
    if (typeof branch.isMainBranch !== 'boolean') {
        errors.push('isMainBranch debe ser un booleano.');
    }
    if (!branch.status || !['ACTIVE', 'INACTIVE', 'MAINTENANCE'].includes(branch.status)) {
        errors.push('status es inválido.');
    }
    return { isValid: errors.length === 0, errors };
}
// ─── VALIDACIÓN: ENTITLEMENT ─────────────────────────────────────────────────
function validateEntitlement(entitlement) {
    const errors = [];
    if (!entitlement.entitlementId || typeof entitlement.entitlementId !== 'string') {
        errors.push('entitlementId es obligatorio.');
    }
    if (!entitlement.tenantId || typeof entitlement.tenantId !== 'string') {
        errors.push('tenantId es obligatorio.');
    }
    if (!entitlement.subscriptionId || typeof entitlement.subscriptionId !== 'string') {
        errors.push('subscriptionId es obligatorio.');
    }
    if (!entitlement.module || typeof entitlement.module !== 'string') {
        errors.push('module es obligatorio.');
    }
    if (!Array.isArray(entitlement.grantedCapabilities)) {
        errors.push('grantedCapabilities debe ser un array.');
    }
    if (!entitlement.status || !['ACTIVE', 'REVOKED', 'EXPIRED'].includes(entitlement.status)) {
        errors.push('status es inválido.');
    }
    return { isValid: errors.length === 0, errors };
}
//# sourceMappingURL=validators.js.map