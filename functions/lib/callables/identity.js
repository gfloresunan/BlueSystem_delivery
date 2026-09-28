"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.5)
 * Callable Function: switchActiveTenantContext
 *
 * Permite a un usuario autenticado cambiar su contexto activo de Tenant/Membership.
 * Estrictamente en modo SIMULATION ONLY (AuthSafetyGate LOCKED / Zero Auth Mutation).
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
exports.switchActiveTenantContext = exports.FirestoreReadOnlyMembershipDataSource = void 0;
exports.validateSwitchContextInput = validateSwitchContextInput;
exports.defaultTenantValidator = defaultTenantValidator;
exports.executeSwitchActiveTenantContext = executeSwitchActiveTenantContext;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const dualReadResolver_1 = require("../domain/identity/dualReadResolver");
const activeContextDeriver_1 = require("../domain/identity/activeContextDeriver");
const claimsV3Builder_1 = require("../domain/identity/claimsV3Builder");
const claimsV3Validator_1 = require("../domain/identity/claimsV3Validator");
const claimsSizeGuard_1 = require("../domain/identity/claimsSizeGuard");
const authSafetyGate_1 = require("../domain/identity/authSafetyGate");
/**
 * Validador estricto de Input (Zero Trust)
 * Rechaza cualquier campo manipulado o desconocido (role, tenantId, businessId, claims, etc.)
 */
function validateSwitchContextInput(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { isValid: false, error: 'El cuerpo de la solicitud debe ser un objeto JSON válido.' };
    }
    // Lista de campos prohibidos que un cliente malicioso podría intentar inyectar
    const forbiddenFields = [
        'tenantId',
        'brandId',
        'organizationId',
        'orgId',
        'businessId',
        'branchId',
        'role',
        'status',
        'permissions',
        'isAdmin',
        'isSuperAdmin',
        'activeContext',
        'claims',
        'uid'
    ];
    for (const forbidden of forbiddenFields) {
        if (forbidden in data) {
            return {
                isValid: false,
                error: `Violación de Seguridad: Parámetro prohibido '${forbidden}' detectado en la solicitud.`
            };
        }
    }
    // Validar que solo contenga targetMembershipId
    const allowedKeys = Object.keys(data);
    for (const key of allowedKeys) {
        if (key !== 'targetMembershipId') {
            return {
                isValid: false,
                error: `Parámetro desconocido o no permitido '${key}' en la solicitud.`
            };
        }
    }
    if (typeof data.targetMembershipId !== 'string' || data.targetMembershipId.trim().length === 0) {
        return {
            isValid: false,
            error: "targetMembershipId es obligatorio y no puede estar vacío ni contener solo espacios."
        };
    }
    return {
        isValid: true,
        targetMembershipId: data.targetMembershipId.trim()
    };
}
/**
 * Driver de Firestore de solo lectura para producción / staging
 */
class FirestoreReadOnlyMembershipDataSource {
    constructor(db) {
        this.db = db || admin.firestore();
    }
    async getV3MembershipById(membershipId) {
        const doc = await this.db.collection('memberships').doc(membershipId).get();
        return doc.exists ? doc.data() : null;
    }
    async getV3MembershipsByUid(uid) {
        const snap = await this.db.collection('memberships').where('uid', '==', uid).get();
        return snap.docs.map(d => d.data());
    }
    async getLegacyMembershipById(membershipId) {
        const doc = await this.db.collection('membership').doc(membershipId).get();
        return doc.exists ? doc.data() : null;
    }
    async getLegacyMembershipsByUid(uid) {
        const snap = await this.db.collection('membership').where('uid', '==', uid).get();
        return snap.docs.map(d => d.data());
    }
    async resolveTenantContextForBusiness(businessId) {
        if (!businessId)
            return null;
        const bizDoc = await this.db.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists)
            return null;
        const bizData = bizDoc.data();
        return {
            tenantId: (bizData === null || bizData === void 0 ? void 0 : bizData.tenantId) || null,
            brandId: (bizData === null || bizData === void 0 ? void 0 : bizData.brandId) || null,
            organizationId: (bizData === null || bizData === void 0 ? void 0 : bizData.orgId) || null,
            isAmbiguous: false
        };
    }
}
exports.FirestoreReadOnlyMembershipDataSource = FirestoreReadOnlyMembershipDataSource;
/**
 * Validador de Tenant (Comprueba existencia y estado ACTIVE sin mutación)
 */
async function defaultTenantValidator(tenantId, customCheck) {
    if (!tenantId || tenantId.trim().length === 0)
        return false;
    const tid = tenantId.toLowerCase();
    if (tid.includes('default') || tid.includes('tenant_bluesystem_default'))
        return false;
    if (customCheck) {
        return customCheck(tenantId);
    }
    // En ejecución Firebase
    try {
        const tenantDoc = await admin.firestore().collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists)
            return false;
        const data = tenantDoc.data();
        return (data === null || data === void 0 ? void 0 : data.status) === 'ACTIVE';
    }
    catch (_a) {
        return false;
    }
}
/**
 * Orquestador Core del Context Switching (Totalmente testeable y desacoplado)
 */
async function executeSwitchActiveTenantContext(data, callerUid, options) {
    // 1. Validar autenticación
    if (!callerUid || typeof callerUid !== 'string' || callerUid.trim().length === 0) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado.');
    }
    // 2. Validar Input (Zero Trust)
    const inputValidation = validateSwitchContextInput(data);
    if (!inputValidation.isValid || !inputValidation.targetMembershipId) {
        throw new functions.https.HttpsError('invalid-argument', inputValidation.error || 'Argumento inválido.');
    }
    const targetMembershipId = inputValidation.targetMembershipId;
    // 3. Obtener Resolver
    const resolver = (options === null || options === void 0 ? void 0 : options.resolver) || new dualReadResolver_1.DualReadMembershipResolver(new FirestoreReadOnlyMembershipDataSource());
    // 4. Resolver Membresía
    const resolution = await resolver.resolveByMembershipId(callerUid, targetMembershipId);
    if (resolution.status === 'NOT_FOUND') {
        throw new functions.https.HttpsError('not-found', `La membresía '${targetMembershipId}' no fue encontrada.`);
    }
    if (resolution.status === 'SECURITY_MISMATCH') {
        throw new functions.https.HttpsError('permission-denied', 'Violación de Seguridad: La membresía no pertenece al usuario autenticado.');
    }
    if (resolution.status === 'NEVER_RESOLVE') {
        throw new functions.https.HttpsError('permission-denied', 'Violación de Gobernanza: Intento de resolución a tenant default ficticio bloqueado.');
    }
    if (resolution.status === 'MIGRATION_PENDING') {
        throw new functions.https.HttpsError('failed-precondition', 'La membresía especificada se encuentra pendiente de migración a Multi-Tenant.');
    }
    if (resolution.status === 'AMBIGUOUS' || resolution.status === 'INVALID' || !resolution.membership) {
        throw new functions.https.HttpsError('permission-denied', `La membresía no puede ser procesada (Estado: ${resolution.status}).`);
    }
    const membership = resolution.membership;
    // 5. Validar Tenant en base de datos
    const isTenantValid = await defaultTenantValidator(membership.tenantId, options === null || options === void 0 ? void 0 : options.tenantValidator);
    if (!isTenantValid) {
        throw new functions.https.HttpsError('permission-denied', `El Tenant '${membership.tenantId}' no existe o no se encuentra en estado ACTIVE.`);
    }
    // 6. Derivar Active Context
    const contextResult = activeContextDeriver_1.ActiveContextDeriver.deriveFromMembershipEntity(membership);
    if (!contextResult.success || !contextResult.context) {
        throw new functions.https.HttpsError('permission-denied', `Fallo al derivar contexto activo: ${contextResult.errorDetail || 'Error de estado'}`);
    }
    const activeContext = contextResult.context;
    // 7. Construir Claims V3
    const claims = claimsV3Builder_1.ClaimsV3Builder.buildCanonicalClaims(activeContext);
    // 8. Validar Claims V3
    const claimsValidation = claimsV3Validator_1.ClaimsV3Validator.validate(claims);
    if (!claimsValidation.isValid) {
        throw new functions.https.HttpsError('permission-denied', `Fallo en validación de Claims: ${claimsValidation.errors.join('; ')}`);
    }
    // 9. Claims Size Guard
    const sizeEval = claimsSizeGuard_1.ClaimsSizeGuard.evaluate(claims);
    if (!sizeEval.isValid) {
        throw new functions.https.HttpsError('internal', `Error de Presupuesto: ${sizeEval.message}`);
    }
    // 10. Auth Safety Gate: Garantizar que no se mute Auth en Fase 2C.5
    const safetyGate = authSafetyGate_1.AuthSafetyGate.getGateway();
    if (safetyGate.isMutationEnabled()) {
        throw new functions.https.HttpsError('internal', 'Violación de Seguridad: El AuthSafetyGate no está en modo LOCKED.');
    }
    // 11. Retornar Respuesta Canónica en modo SIMULATION
    return {
        success: true,
        activeTenantId: activeContext.tenantId,
        activeBrandId: activeContext.brandId,
        activeOrgId: activeContext.organizationId,
        activeBusinessId: activeContext.businessId,
        activeBranchId: activeContext.branchId,
        activeRole: activeContext.role,
        membershipId: activeContext.membershipId,
        eiamVer: 3,
        tokenRefreshRequired: true,
        simulation: true
    };
}
/**
 * Cloud Function Callable HTTPS Oficial
 */
exports.switchActiveTenantContext = functions.https.onCall(async (data, context) => {
    var _a;
    const callerUid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    return executeSwitchActiveTenantContext(data, callerUid);
});
//# sourceMappingURL=identity.js.map