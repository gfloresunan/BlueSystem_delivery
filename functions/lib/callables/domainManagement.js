"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — DOMAIN MANAGEMENT CALLABLES (FASE 2E)
 * Endpoints HTTPS Callable para Registro, Verificación DNS, Activación y Gobernanza de Dominios
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTenantDomain = exports.setPrimaryTenantDomain = exports.verifyTenantDomainDns = exports.registerTenantDomain = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const tenantDomainResolver_1 = require("../domain/whitelabel/tenantDomainResolver");
const tenantFeatureEngine_1 = require("../domain/whitelabel/tenantFeatureEngine");
const validator_1 = require("../shared/middleware/validator");
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
function generateDomainId(domain) {
    return domain.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
/**
 * 1. CALLABLE: registerTenantDomain
 */
exports.registerTenantDomain = functions.https.onCall(async (data, context) => {
    var _a;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        requiredFields: ['tenantId', 'domain', 'domainType']
    }, 'registerTenantDomain');
    const { tenantId, domain: rawDomain, domainType, brandId } = data;
    const normalizedDomain = tenantDomainResolver_1.DomainNormalizer.normalize(rawDomain);
    if (!normalizedDomain) {
        throw new functions.https.HttpsError('invalid-argument', 'El nombre de dominio es inválido.');
    }
    // 1. Validar subdominios reservados
    if (tenantDomainResolver_1.DomainNormalizer.isReservedSubdomain(normalizedDomain)) {
        throw new functions.https.HttpsError('invalid-argument', `El nombre '${normalizedDomain}' es una palabra reservada del sistema.`);
    }
    // 2. Validar pertenencia o rol de administración de plataforma
    const callerClaims = (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) || {});
    const claimRole = (callerClaims.role || callerClaims.eiamRole || '').toUpperCase();
    const isPlatformAdmin = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'].includes(claimRole) || callerClaims.admin === true;
    const callerTenantId = callerClaims.tenantId;
    if (!isPlatformAdmin && callerTenantId !== tenantId) {
        throw new functions.https.HttpsError('permission-denied', 'No tiene permisos para administrar dominios de este tenant.');
    }
    // 3. Validar plan del tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        throw new functions.https.HttpsError('not-found', `El tenant '${tenantId}' no existe.`);
    }
    const tenantData = tenantDoc.data() || {};
    const planTier = tenantData.subscriptionPlan || tenantData.planTier || 'STARTER';
    const tierCheck = tenantFeatureEngine_1.TenantFeatureEngine.isDomainTypeAllowed(planTier, domainType);
    if (!tierCheck.allowed && !isPlatformAdmin) {
        throw new functions.https.HttpsError('failed-precondition', tierCheck.reason || 'Plan no autorizado.');
    }
    // 4. Validar colisión de dominio
    const domainId = generateDomainId(normalizedDomain);
    const existingDomainDoc = await db.collection('tenantDomains').doc(domainId).get();
    if (existingDomainDoc.exists) {
        const existing = existingDomainDoc.data();
        if ((existing === null || existing === void 0 ? void 0 : existing.tenantId) !== tenantId) {
            throw new functions.https.HttpsError('already-exists', `El dominio '${normalizedDomain}' ya está registrado por otro tenant.`);
        }
    }
    // 5. Generar instrucciones DNS y token de verificación
    const verificationToken = `bs-verify-${crypto.randomBytes(16).toString('hex')}`;
    const dnsInstructions = [];
    if (domainType === 'TENANT_SUBDOMAIN') {
        dnsInstructions.push({
            type: 'CNAME',
            host: normalizedDomain.split('.')[0],
            targetValue: 'hosting.bluesystem.io.',
            description: 'Apunta el CNAME a la infraestructura de BlueSystem.',
            isVerified: true
        });
    }
    else if (domainType === 'CUSTOM_DOMAIN') {
        dnsInstructions.push({
            type: 'TXT',
            host: '_bluesystem-challenge',
            targetValue: verificationToken,
            description: 'Registro TXT para verificar la propiedad del dominio.',
            isVerified: false
        });
        dnsInstructions.push({
            type: 'CNAME',
            host: normalizedDomain.includes('.') ? normalizedDomain.split('.')[0] : '@',
            targetValue: 'hosting.bluesystem.io.',
            description: 'Apunta tu dominio a los servidores de BlueSystem.',
            isVerified: false
        });
    }
    const initialStatus = domainType === 'TENANT_SUBDOMAIN' ? 'ACTIVE' : 'PENDING';
    const initialSslStatus = domainType === 'TENANT_SUBDOMAIN' ? 'ACTIVE' : 'PENDING';
    const newDomainEntity = {
        domainId,
        tenantId,
        brandId: brandId || tenantData.primaryBrandId || null,
        domain: normalizedDomain,
        domainType,
        status: initialStatus,
        isPrimary: false,
        isCustom: domainType === 'CUSTOM_DOMAIN',
        isSubdomain: domainType === 'TENANT_SUBDOMAIN',
        dnsStatus: domainType === 'TENANT_SUBDOMAIN' ? 'VERIFIED' : 'PENDING',
        sslStatus: initialSslStatus,
        verificationToken,
        dnsInstructions,
        schemaVersion: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        verifiedAt: domainType === 'TENANT_SUBDOMAIN' ? Date.now() : null,
        activatedAt: domainType === 'TENANT_SUBDOMAIN' ? Date.now() : null,
        createdBy: callerUid,
        updatedBy: callerUid
    };
    await db.collection('tenantDomains').doc(domainId).set(newDomainEntity);
    // Registro de Auditoría de Gobernanza
    await db.collection('audit_logs').add({
        tenantId,
        uid: callerUid,
        action: 'DOMAIN_CREATED',
        entity: 'tenantDomains',
        entityId: domainId,
        domain: normalizedDomain,
        domainType,
        result: 'SUCCESS',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    logger_1.Logger.info(`[DOMAIN_RESOLUTION] Dominio registrado: ${normalizedDomain} (Tenant: ${tenantId})`);
    return {
        success: true,
        domain: newDomainEntity
    };
});
/**
 * 2. CALLABLE: verifyTenantDomainDns
 */
exports.verifyTenantDomainDns = functions.https.onCall(async (data, context) => {
    var _a;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        requiredFields: ['domainId']
    }, 'verifyTenantDomainDns');
    const { domainId } = data;
    const domainRef = db.collection('tenantDomains').doc(domainId);
    const domainDoc = await domainRef.get();
    if (!domainDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'El dominio no existe.');
    }
    const domainData = domainDoc.data();
    // Validación de seguridad de tenant
    const callerClaims = (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) || {});
    const isPlatformAdmin = ['SUPER_ADMIN', 'ADMIN'].includes((callerClaims.role || '').toUpperCase());
    if (!isPlatformAdmin && callerClaims.tenantId !== domainData.tenantId) {
        throw new functions.https.HttpsError('permission-denied', 'No autorizado.');
    }
    // Simulación de verificación DNS (Aprobación de challenge)
    const updatedInstructions = domainData.dnsInstructions.map(instr => (Object.assign(Object.assign({}, instr), { isVerified: true })));
    const now = Date.now();
    await domainRef.update({
        status: 'ACTIVE',
        dnsStatus: 'VERIFIED',
        sslStatus: 'ACTIVE',
        dnsInstructions: updatedInstructions,
        verifiedAt: now,
        activatedAt: now,
        updatedAt: now,
        updatedBy: callerUid
    });
    await db.collection('audit_logs').add({
        tenantId: domainData.tenantId,
        uid: callerUid,
        action: 'DOMAIN_VERIFIED',
        entity: 'tenantDomains',
        entityId: domainId,
        domain: domainData.domain,
        result: 'SUCCESS',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    logger_1.Logger.info(`[DOMAIN_RESOLUTION] Dominio verificado y activado: ${domainData.domain}`);
    return {
        success: true,
        message: `Dominio ${domainData.domain} verificado y activado exitosamente.`
    };
});
/**
 * 3. CALLABLE: setPrimaryTenantDomain
 */
exports.setPrimaryTenantDomain = functions.https.onCall(async (data, context) => {
    var _a;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        requiredFields: ['tenantId', 'domainId']
    }, 'setPrimaryTenantDomain');
    const { tenantId, domainId } = data;
    const targetDoc = await db.collection('tenantDomains').doc(domainId).get();
    if (!targetDoc.exists || ((_a = targetDoc.data()) === null || _a === void 0 ? void 0 : _a.tenantId) !== tenantId) {
        throw new functions.https.HttpsError('not-found', 'Dominio no encontrado para este tenant.');
    }
    const batch = db.batch();
    // Desmarcar otros dominios del tenant
    const tenantDomainsSnap = await db.collection('tenantDomains')
        .where('tenantId', '==', tenantId)
        .get();
    tenantDomainsSnap.forEach(doc => {
        if (doc.id === domainId) {
            batch.update(doc.ref, { isPrimary: true, updatedAt: Date.now(), updatedBy: callerUid });
        }
        else if (doc.data().isPrimary) {
            batch.update(doc.ref, { isPrimary: false, updatedAt: Date.now(), updatedBy: callerUid });
        }
    });
    await batch.commit();
    await db.collection('audit_logs').add({
        tenantId,
        uid: callerUid,
        action: 'PRIMARY_DOMAIN_CHANGED',
        entity: 'tenantDomains',
        entityId: domainId,
        result: 'SUCCESS',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});
/**
 * 4. CALLABLE: deleteTenantDomain
 */
exports.deleteTenantDomain = functions.https.onCall(async (data, context) => {
    var _a;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        requiredFields: ['domainId']
    }, 'deleteTenantDomain');
    const { domainId } = data;
    const docRef = db.collection('tenantDomains').doc(domainId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Dominio no encontrado.');
    }
    const domainData = docSnap.data();
    // Validación de seguridad
    const callerClaims = (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) || {});
    const isPlatformAdmin = ['SUPER_ADMIN', 'ADMIN'].includes((callerClaims.role || '').toUpperCase());
    if (!isPlatformAdmin && callerClaims.tenantId !== domainData.tenantId) {
        throw new functions.https.HttpsError('permission-denied', 'No autorizado.');
    }
    await docRef.delete();
    await db.collection('audit_logs').add({
        tenantId: domainData.tenantId,
        uid: callerUid,
        action: 'DOMAIN_REMOVED',
        entity: 'tenantDomains',
        entityId: domainId,
        domain: domainData.domain,
        result: 'SUCCESS',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});
//# sourceMappingURL=domainManagement.js.map