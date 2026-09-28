"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — AUTOMATED PROVISIONING PIPELINE (FASE 2D.4 / C2D.4)
 * Canonical Transactional, Idempotent, and Compensable Provisioning Orchestrator
 *
 * ONE CORE / ZERO FORKS / STRICT IN-MEMORY SIMULATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvisioningEngine = void 0;
const models_1 = require("../platform/models");
const validators_1 = require("../platform/validators");
const validators_2 = require("../identity/validators");
const catalog_1 = require("../gatekeeper/catalog");
const gatekeeper_1 = require("../gatekeeper/gatekeeper");
const transactionContext_1 = require("./transactionContext");
const invariantsValidator_1 = require("./invariantsValidator");
class ProvisioningEngine {
    /**
     * Helper: Calcula un hash simple y determinista del payload para idempotencia.
     */
    static computePayloadHash(req) {
        const payload = {
            tenantType: req.tenantType,
            tenant: req.tenant,
            brand: req.brand,
            business: req.business,
            branch: req.branch,
            subscription: req.subscription,
            initialOwner: req.initialOwner,
            initialConfiguration: req.initialConfiguration,
            requestedBy: req.requestedBy
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    /**
     * Valida la estructura y formato sintáctico de la solicitud de aprovisionamiento.
     */
    static validateRequest(req) {
        const errors = [];
        if (!req.requestId || typeof req.requestId !== 'string' || req.requestId.trim().length === 0) {
            errors.push('requestId es obligatorio.');
        }
        if (!req.idempotencyKey || typeof req.idempotencyKey !== 'string' || req.idempotencyKey.trim().length === 0) {
            errors.push('idempotencyKey es obligatorio.');
        }
        if (!req.tenantType || !['MARKETPLACE', 'AGENCY', 'WHITE_LABEL_COMMERCE', 'ENTERPRISE'].includes(req.tenantType)) {
            errors.push(`tenantType inválido: ${req.tenantType}.`);
        }
        // Validación básica de Tenant
        if (!req.tenant || !req.tenant.tenantId || req.tenant.tenantId.trim() === '') {
            errors.push('tenant.tenantId es obligatorio y no puede ser vacío.');
        }
        else if (req.tenant.tenantId === '*' || req.tenant.tenantId === 'ALL' || req.tenant.tenantId.toLowerCase() === 'null') {
            errors.push('tenant.tenantId no puede ser comodín (*, ALL, null).');
        }
        // Validación básica de Brand
        if (!req.brand || !req.brand.brandId || req.brand.brandId.trim() === '') {
            errors.push('brand.brandId es obligatorio.');
        }
        // Validación básica de Business
        if (!req.business || !req.business.businessId || req.business.businessId.trim() === '') {
            errors.push('business.businessId es obligatorio.');
        }
        // Validación básica de Branch
        if (!req.branch || !req.branch.branchId || req.branch.branchId.trim() === '') {
            errors.push('branch.branchId es obligatorio.');
        }
        // Validación básica de Subscription
        if (!req.subscription || !req.subscription.subscriptionId || req.subscription.subscriptionId.trim() === '') {
            errors.push('subscription.subscriptionId es obligatorio.');
        }
        if (!req.subscription || !req.subscription.planTier || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'].includes(req.subscription.planTier)) {
            errors.push('subscription.planTier es obligatorio y debe ser un PlanTier válido.');
        }
        // Validación básica de Owner
        if (!req.initialOwner || !req.initialOwner.uid || req.initialOwner.uid.trim() === '') {
            errors.push('initialOwner.uid es obligatorio.');
        }
        // Validación de InitialConfiguration (Cero credenciales / secretos)
        if (req.initialConfiguration) {
            const configStr = JSON.stringify(req.initialConfiguration).toLowerCase();
            if (configStr.includes('password') ||
                configStr.includes('private_key') ||
                configStr.includes('secret') ||
                configStr.includes('token') ||
                configStr.includes('jwt')) {
                errors.push('InitialTenantConfiguration no puede contener secretos, contraseñas o tokens.');
            }
        }
        else {
            errors.push('initialConfiguration es obligatorio.');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Ejecuta el pipeline completo de aprovisionamiento de forma determinista, transaccional y compensable.
     */
    static async provisionTenant(request, repos, failureInjection = 'NONE') {
        var _a, _b, _c;
        const payloadHash = this.computePayloadHash(request);
        // ─── PASO 0: VERIFICACIÓN DE IDEMPOTENCIA ─────────────────────────────────
        const existingEntry = await repos.idempotencyRepo.findByKey(request.idempotencyKey);
        if (existingEntry) {
            if (existingEntry.payloadHash === payloadHash) {
                // Replay determinista exacto
                await repos.auditRepo.record({
                    eventId: `evt_replay_${Date.now()}`,
                    requestId: request.requestId,
                    idempotencyKey: request.idempotencyKey,
                    tenantId: request.tenant.tenantId,
                    operation: 'PROVISION_TENANT',
                    step: 'IDEMPOTENT_REPLAY',
                    status: 'REPLAYED',
                    reason: 'Exact idempotencyKey match with identical payload hash',
                    timestamp: Date.now()
                });
                return Object.assign(Object.assign({}, existingEntry.result), { status: 'REPLAYED' });
            }
            else {
                // Conflicto de Idempotencia: misma clave con diferente carga
                const conflictResult = {
                    requestId: request.requestId,
                    idempotencyKey: request.idempotencyKey,
                    status: 'CONFLICT',
                    errorDetails: ['IDEMPOTENCY_CONFLICT: Key already used with different payload.'],
                    auditTrail: [],
                    timestamp: Date.now()
                };
                await repos.auditRepo.record({
                    eventId: `evt_conflict_${Date.now()}`,
                    requestId: request.requestId,
                    idempotencyKey: request.idempotencyKey,
                    tenantId: request.tenant.tenantId,
                    operation: 'PROVISION_TENANT',
                    step: 'IDEMPOTENCY_CHECK',
                    status: 'FAILED',
                    reason: 'Mismatched payload hash for existing idempotency key',
                    timestamp: Date.now()
                });
                return conflictResult;
            }
        }
        // ─── INICIO DE TRANSACCIÓN SIMULADA ──────────────────────────────────────
        const context = new transactionContext_1.ProvisioningTransactionContext(request.requestId, request.idempotencyKey, request.tenant.tenantId, failureInjection);
        context.recordAudit('PROVISIONING', 'PROVISIONING_STARTED', 'SUCCESS', 'Pipeline initialized');
        try {
            // ─── PASO 1: VALIDACIÓN DE SOLICITUD ────────────────────────────────────
            if (context.shouldInjectFailure('VALIDATION')) {
                throw new Error('SIMULATED_FAILURE: Injected at VALIDATION step');
            }
            const reqValidation = this.validateRequest(request);
            if (!reqValidation.isValid) {
                throw new Error(`VALIDATION_FAILED: ${reqValidation.errors.join('; ')}`);
            }
            context.recordAudit('PROVISIONING', 'REQUEST_VALIDATED', 'SUCCESS', 'Syntactic schema valid');
            // ─── PASO 2: RESOLUCIÓN DE MODELO COMERCIAL Y PLAN ──────────────────────
            const commercialModel = request.tenantType;
            const planDef = catalog_1.PLAN_CATALOG[request.subscription.planTier];
            if (!planDef) {
                throw new Error(`PLAN_NOT_FOUND: PlanTier ${request.subscription.planTier} does not exist in catalog.`);
            }
            // Resolver Entitlements y Cuotas
            let effectiveEntitlements;
            let effectiveQuotas = Object.assign({}, planDef.defaultQuotas);
            if (request.subscription.planTier === 'CUSTOM') {
                if (!request.subscription.customFeatures || request.subscription.customFeatures.length === 0) {
                    effectiveEntitlements = [...planDef.defaultEntitlements];
                }
                else {
                    // Validar que no contenga comodines
                    for (const feat of request.subscription.customFeatures) {
                        if (feat === '*' || feat === 'ALL' || feat === 'SUPER') {
                            throw new Error('WILDCARD_ENTITLEMENT_DENIED: Custom plan cannot use wildcard modules.');
                        }
                        if (!(feat in catalog_1.MODULE_CATALOG)) {
                            throw new Error(`INVALID_ENTITLEMENT: Module ${feat} not found in Module Catalog.`);
                        }
                    }
                    effectiveEntitlements = [...request.subscription.customFeatures];
                }
                if (request.subscription.customQuotas) {
                    effectiveQuotas = Object.assign(Object.assign({}, effectiveQuotas), request.subscription.customQuotas);
                }
            }
            else {
                effectiveEntitlements = [...planDef.defaultEntitlements];
            }
            context.recordAudit('PROVISIONING', 'PLAN_RESOLVED', 'SUCCESS', `Plan ${request.subscription.planTier} resolved with ${effectiveEntitlements.length} features`);
            // ─── PASO 3: CREAR TENANT ───────────────────────────────────────────────
            if (context.shouldInjectFailure('TENANT')) {
                throw new Error('SIMULATED_FAILURE: Injected at TENANT creation step');
            }
            // Validar que no exista ya un tenant con el mismo ID o slug
            const existingTenant = await repos.tenantRepo.findById(request.tenant.tenantId);
            if (existingTenant) {
                throw new Error(`TENANT_ALREADY_EXISTS: Tenant ID ${request.tenant.tenantId} already in use.`);
            }
            const existingSlug = await repos.tenantRepo.findBySlug(request.tenant.slug);
            if (existingSlug) {
                throw new Error(`SLUG_ALREADY_EXISTS: Tenant slug ${request.tenant.slug} already in use.`);
            }
            const tenantEntity = {
                tenantId: request.tenant.tenantId,
                name: request.tenant.name,
                legalName: request.tenant.legalName,
                slug: request.tenant.slug,
                type: commercialModel,
                status: 'ACTIVE',
                primaryBrandId: request.brand.brandId,
                subscriptionId: request.subscription.subscriptionId,
                schemaVersion: '1.0',
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt,
                createdBy: request.requestedBy,
                updatedBy: request.requestedBy
            };
            const tenantValidation = (0, validators_1.validateTenant)(tenantEntity);
            if (!tenantValidation.isValid) {
                throw new Error(`TENANT_SCHEMA_INVALID: ${tenantValidation.errors.join('; ')}`);
            }
            await repos.tenantRepo.save(tenantEntity);
            context.recordCreatedEntity('TENANT', tenantEntity.tenantId);
            context.pushCompensation({
                step: 'COMPENSATE_TENANT',
                entityType: 'TENANT',
                entityId: tenantEntity.tenantId,
                description: 'Delete tenant from repository',
                action: async () => repos.tenantRepo.delete(tenantEntity.tenantId)
            });
            context.recordAudit('PROVISIONING', 'TENANT_PLANNED', 'SUCCESS', `Tenant ${tenantEntity.tenantId} created`);
            // ─── PASO 4: CREAR BRAND ────────────────────────────────────────────────
            if (context.shouldInjectFailure('BRAND')) {
                throw new Error('SIMULATED_FAILURE: Injected at BRAND creation step');
            }
            const visualConfig = Object.assign(Object.assign({}, models_1.DEFAULT_BRAND_CONFIG), (request.brand.visual || {}));
            const brandEntity = {
                brandId: request.brand.brandId,
                tenantId: tenantEntity.tenantId,
                displayName: request.brand.displayName,
                shortName: request.brand.shortName,
                slug: request.brand.slug,
                visual: visualConfig,
                metadata: {
                    supportEmail: ((_a = request.brand.metadata) === null || _a === void 0 ? void 0 : _a.supportEmail) || 'support@bluesystem.io',
                    supportPhone: ((_b = request.brand.metadata) === null || _b === void 0 ? void 0 : _b.supportPhone) || '+1234567890',
                    website: (_c = request.brand.metadata) === null || _c === void 0 ? void 0 : _c.website
                },
                status: 'ACTIVE',
                schemaVersion: '1.0',
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt,
                createdBy: request.requestedBy,
                updatedBy: request.requestedBy
            };
            const brandValidation = (0, validators_1.validateBrand)(brandEntity);
            if (!brandValidation.isValid) {
                throw new Error(`BRAND_SCHEMA_INVALID: ${brandValidation.errors.join('; ')}`);
            }
            await repos.brandRepo.save(brandEntity);
            context.recordCreatedEntity('BRAND', brandEntity.brandId);
            context.pushCompensation({
                step: 'COMPENSATE_BRAND',
                entityType: 'BRAND',
                entityId: brandEntity.brandId,
                description: 'Delete brand from repository',
                action: async () => repos.brandRepo.delete(brandEntity.brandId)
            });
            context.recordAudit('PROVISIONING', 'BRAND_PLANNED', 'SUCCESS', `Brand ${brandEntity.brandId} created`);
            // ─── PASO 5: CREAR BUSINESS ─────────────────────────────────────────────
            if (context.shouldInjectFailure('BUSINESS')) {
                throw new Error('SIMULATED_FAILURE: Injected at BUSINESS creation step');
            }
            // Validar que el brandId del business coincida con la marca del tenant
            if (request.business.brandId !== brandEntity.brandId) {
                throw new Error(`SECURITY_MISMATCH: Business brandId (${request.business.brandId}) does not match created Brand (${brandEntity.brandId})`);
            }
            const businessSlug = `${request.tenant.slug}-${request.business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const businessEntity = {
                businessId: request.business.businessId,
                tenantId: tenantEntity.tenantId,
                brandId: brandEntity.brandId,
                orgId: request.business.organizationId || null,
                name: request.business.name,
                slug: businessSlug.replace(/^-+|-+$/g, '') || 'biz-default',
                category: request.business.category,
                settings: {
                    deliveryRadiusKm: request.business.deliveryRadiusKm || 10,
                    currency: request.initialConfiguration.currency,
                    timezone: request.initialConfiguration.timezone,
                    locale: request.initialConfiguration.locale,
                    autoAcceptOrders: request.initialConfiguration.orderSettings.autoAcceptOrders
                },
                status: 'ACTIVE',
                schemaVersion: '1.0',
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt,
                createdBy: request.requestedBy,
                updatedBy: request.requestedBy
            };
            const bizValidation = (0, validators_1.validateBusiness)(businessEntity);
            if (!bizValidation.isValid) {
                throw new Error(`BUSINESS_SCHEMA_INVALID: ${bizValidation.errors.join('; ')}`);
            }
            await repos.businessRepo.save(businessEntity);
            context.recordCreatedEntity('BUSINESS', businessEntity.businessId);
            context.pushCompensation({
                step: 'COMPENSATE_BUSINESS',
                entityType: 'BUSINESS',
                entityId: businessEntity.businessId,
                description: 'Delete business from repository',
                action: async () => repos.businessRepo.delete(businessEntity.businessId)
            });
            context.recordAudit('PROVISIONING', 'BUSINESS_PLANNED', 'SUCCESS', `Business ${businessEntity.businessId} created`);
            // ─── PASO 6: CREAR BRANCH ───────────────────────────────────────────────
            if (context.shouldInjectFailure('BRANCH')) {
                throw new Error('SIMULATED_FAILURE: Injected at BRANCH creation step');
            }
            if (request.branch.businessId !== businessEntity.businessId) {
                throw new Error(`SECURITY_MISMATCH: Branch businessId (${request.branch.businessId}) does not match Business (${businessEntity.businessId})`);
            }
            const branchEntity = {
                branchId: request.branch.branchId,
                businessId: businessEntity.businessId,
                tenantId: tenantEntity.tenantId,
                brandId: brandEntity.brandId,
                name: request.branch.name,
                address: request.branch.address,
                coordinates: request.branch.coordinates || { latitude: 19.4326, longitude: -99.1332 },
                isMainBranch: request.branch.isMainBranch,
                status: 'ACTIVE',
                schemaVersion: '1.0',
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt,
                createdBy: request.requestedBy,
                updatedBy: request.requestedBy
            };
            const branchValidation = (0, validators_1.validateBranch)(branchEntity);
            if (!branchValidation.isValid) {
                throw new Error(`BRANCH_SCHEMA_INVALID: ${branchValidation.errors.join('; ')}`);
            }
            await repos.branchRepo.save(branchEntity);
            context.recordCreatedEntity('BRANCH', branchEntity.branchId);
            context.pushCompensation({
                step: 'COMPENSATE_BRANCH',
                entityType: 'BRANCH',
                entityId: branchEntity.branchId,
                description: 'Delete branch from repository',
                action: async () => repos.branchRepo.delete(branchEntity.branchId)
            });
            context.recordAudit('PROVISIONING', 'BRANCH_PLANNED', 'SUCCESS', `Branch ${branchEntity.branchId} created`);
            // ─── PASO 7: CREAR SUBSCRIPTION ─────────────────────────────────────────
            if (context.shouldInjectFailure('SUBSCRIPTION')) {
                throw new Error('SIMULATED_FAILURE: Injected at SUBSCRIPTION creation step');
            }
            const subscriptionEntity = {
                subscriptionId: request.subscription.subscriptionId,
                tenantId: tenantEntity.tenantId,
                planId: `plan_${request.subscription.planTier.toLowerCase()}`,
                planName: request.subscription.planName || planDef.planName,
                planTier: request.subscription.planTier,
                status: 'ACTIVE',
                startDate: request.subscription.startDate || request.requestedAt,
                endDate: request.subscription.endDate || null,
                billingCycle: request.subscription.billingCycle,
                enabledFeatures: effectiveEntitlements,
                disabledFeatures: [],
                limits: effectiveQuotas,
                schemaVersion: '1.0',
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt,
                createdBy: request.requestedBy,
                updatedBy: request.requestedBy
            };
            const subValidation = (0, validators_1.validateSubscription)(subscriptionEntity);
            if (!subValidation.isValid) {
                throw new Error(`SUBSCRIPTION_SCHEMA_INVALID: ${subValidation.errors.join('; ')}`);
            }
            await repos.subscriptionRepo.save(subscriptionEntity);
            context.recordCreatedEntity('SUBSCRIPTION', subscriptionEntity.subscriptionId);
            context.pushCompensation({
                step: 'COMPENSATE_SUBSCRIPTION',
                entityType: 'SUBSCRIPTION',
                entityId: subscriptionEntity.subscriptionId,
                description: 'Delete subscription from repository',
                action: async () => repos.subscriptionRepo.delete(subscriptionEntity.subscriptionId)
            });
            context.recordAudit('PROVISIONING', 'SUBSCRIPTION_PLANNED', 'SUCCESS', `Subscription ${subscriptionEntity.subscriptionId} created`);
            // ─── PASO 8: RESOLUCIÓN DE ENTITLEMENTS ─────────────────────────────────
            if (context.shouldInjectFailure('ENTITLEMENTS')) {
                throw new Error('SIMULATED_FAILURE: Injected at ENTITLEMENTS step');
            }
            context.recordAudit('PROVISIONING', 'ENTITLEMENTS_RESOLVED', 'SUCCESS', `Validated ${effectiveEntitlements.length} entitlements against catalog`);
            // ─── PASO 9: CREAR MEMBERSHIP ───────────────────────────────────────────
            if (context.shouldInjectFailure('MEMBERSHIP')) {
                throw new Error('SIMULATED_FAILURE: Injected at MEMBERSHIP creation step');
            }
            const ownerRole = request.initialOwner.role;
            const gateContext = {
                uid: request.initialOwner.uid,
                membershipId: `mem_${tenantEntity.tenantId}_${request.initialOwner.uid}`,
                tenantId: tenantEntity.tenantId,
                role: ownerRole,
                subscription: subscriptionEntity
            };
            const effectiveCaps = (0, gatekeeper_1.resolveEffectiveCapabilities)(gateContext, request.requestedAt);
            const membershipEntity = {
                membershipId: `mem_${tenantEntity.tenantId}_${request.initialOwner.uid}`,
                uid: request.initialOwner.uid,
                tenantId: tenantEntity.tenantId,
                brandId: brandEntity.brandId,
                businessId: businessEntity.businessId,
                branchId: branchEntity.branchId,
                role: ownerRole,
                status: 'ACTIVE',
                permissions: effectiveCaps,
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt,
                schemaVersion: '3.0'
            };
            const memValidation = (0, validators_2.validateMembershipV3)(membershipEntity);
            if (!memValidation.isValid) {
                throw new Error(`MEMBERSHIP_SCHEMA_INVALID: ${memValidation.errors.join('; ')}`);
            }
            await repos.membershipRepo.save(membershipEntity);
            context.recordCreatedEntity('MEMBERSHIP', membershipEntity.membershipId);
            context.pushCompensation({
                step: 'COMPENSATE_MEMBERSHIP',
                entityType: 'MEMBERSHIP',
                entityId: membershipEntity.membershipId,
                description: 'Delete membership from repository',
                action: async () => repos.membershipRepo.delete(membershipEntity.membershipId)
            });
            context.recordAudit('PROVISIONING', 'MEMBERSHIP_PLANNED', 'SUCCESS', `Membership ${membershipEntity.membershipId} created for UID ${membershipEntity.uid}`);
            // ─── PASO 10: APLICAR INITIAL CONFIGURATION ─────────────────────────────
            if (context.shouldInjectFailure('INITIAL_CONFIGURATION')) {
                throw new Error('SIMULATED_FAILURE: Injected at INITIAL_CONFIGURATION step');
            }
            context.recordAudit('PROVISIONING', 'CONFIGURATION_APPLIED', 'SUCCESS', 'Initial settings applied');
            // ─── PASO 11: VALIDACIÓN COMPLETA DEL AGREGADO (INVARIANTES) ────────────
            if (context.shouldInjectFailure('FINAL_VALIDATION')) {
                throw new Error('SIMULATED_FAILURE: Injected at FINAL_VALIDATION step');
            }
            const aggregate = {
                tenant: tenantEntity,
                brand: brandEntity,
                businesses: [businessEntity],
                branches: [branchEntity],
                subscription: subscriptionEntity,
                entitlements: effectiveEntitlements,
                memberships: [membershipEntity],
                initialConfiguration: request.initialConfiguration,
                status: 'ACTIVE',
                createdAt: request.requestedAt,
                updatedAt: request.requestedAt
            };
            const invariantResult = invariantsValidator_1.ProvisioningInvariantsValidator.validate(aggregate);
            if (!invariantResult.isValid) {
                throw new Error(`INVARIANTS_VIOLATED: ${invariantResult.violations.join('; ')}`);
            }
            context.recordAudit('PROVISIONING', 'VALIDATION_COMPLETED', 'SUCCESS', 'All 15 invariants strictly verified');
            context.recordAudit('PROVISIONING', 'PROVISIONING_SIMULATED', 'SUCCESS', 'Provisioning completed successfully in-memory');
            const finalResult = {
                requestId: request.requestId,
                idempotencyKey: request.idempotencyKey,
                status: 'COMPLETED',
                aggregate,
                auditTrail: context.getAuditTrail(),
                timestamp: Date.now()
            };
            // Persistir auditoría en el repositorio
            for (const event of finalResult.auditTrail) {
                await repos.auditRepo.record(event);
            }
            // Guardar en repositorio de idempotencia
            await repos.idempotencyRepo.save(request.idempotencyKey, finalResult, payloadHash);
            return finalResult;
        }
        catch (err) {
            const errorMsg = err.message || String(err);
            context.recordAudit('PROVISIONING', 'PROVISIONING_FAILED', 'FAILED', errorMsg);
            // Ejecutar compensación inversa (Rollback)
            const compResult = await transactionContext_1.CompensationEngine.executeCompensation(context, repos);
            const failedResult = {
                requestId: request.requestId,
                idempotencyKey: request.idempotencyKey,
                status: 'COMPENSATED',
                failureStep: failureInjection,
                errorDetails: [errorMsg, ...compResult.errors],
                auditTrail: context.getAuditTrail(),
                timestamp: Date.now()
            };
            for (const event of failedResult.auditTrail) {
                await repos.auditRepo.record(event);
            }
            return failedResult;
        }
    }
}
exports.ProvisioningEngine = ProvisioningEngine;
//# sourceMappingURL=provisioningPipeline.js.map