"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * Staff Identity & Authentication Lifecycle Callables
 * Protocolo: BSD-MERCHANT-STAFF-AUTH-LIFECYCLE-001
 *
 * Características:
 * - UNA IDENTIDAD = UN UID = UN EMPLEADO = UNA MEMBRESÍA = UN ROL = UNA SUPERFICIE OPERATIVA
 * - Soporte para Invitación y Activación Canónica de Empleados
 * - Soporte para Acceso Operacional Seguro con PIN POS/KDS vía Custom Tokens
 * - Reconciliación Automática e Idempotente de Personal Existente
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
exports.getStaffInvitationDetails = exports.adminResendStaffInvitation = exports.acceptStaffInvitation = exports.authenticateWithStaffPin = exports.adminInviteStaffMember = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const emailService_1 = require("../services/emailService");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const pinAttemptMap = new Map();
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos
function checkPinRateLimit(key) {
    const now = Date.now();
    const record = pinAttemptMap.get(key);
    if (!record) {
        return { allowed: true };
    }
    if (record.lockedUntil > now) {
        const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
        return { allowed: false, remainingSeconds };
    }
    if (record.lockedUntil <= now && record.attempts >= MAX_PIN_ATTEMPTS) {
        // Expiró el bloqueo, resetear
        pinAttemptMap.delete(key);
        return { allowed: true };
    }
    return { allowed: true };
}
function recordPinFailure(key) {
    const now = Date.now();
    const record = pinAttemptMap.get(key) || { attempts: 0, lockedUntil: 0 };
    record.attempts += 1;
    if (record.attempts >= MAX_PIN_ATTEMPTS) {
        record.lockedUntil = now + PIN_LOCKOUT_MS;
        logger_1.Logger.warn(`[STAFF_PIN_RATE_LIMIT] Bloqueo activado para clave '${key}' por ${PIN_LOCKOUT_MS / 1000}s debido a ${record.attempts} intentos fallidos.`);
    }
    pinAttemptMap.set(key, record);
}
function resetPinAttempts(key) {
    pinAttemptMap.delete(key);
}
const ROLE_DEFAULT_PERMISSIONS = {
    MANAGER: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'REPORTS', 'CONTROL_TOWER', 'STAFF_VIEW', 'DASHBOARD'],
    SUPERVISOR: ['ORDERS', 'CONTROL_TOWER', 'CUSTOMERS', 'NOTIFICATIONS', 'DASHBOARD'],
    CASHIER: ['ORDERS', 'CATALOG_VIEW', 'CUSTOMERS', 'RECEIPT_PRINT', 'DASHBOARD'],
    COOK: ['ORDERS', 'ORDERS_KDS', 'STOCK_REPORT', 'PREP_STATUS', 'DASHBOARD'],
};
const ROLE_DEFINITIONS = {
    MANAGER: { title: 'Gerente de Sucursal', defaultPermissions: ROLE_DEFAULT_PERMISSIONS.MANAGER },
    SUPERVISOR: { title: 'Supervisor de Turno', defaultPermissions: ROLE_DEFAULT_PERMISSIONS.SUPERVISOR },
    CASHIER: { title: 'Cajero / Operador POS', defaultPermissions: ROLE_DEFAULT_PERMISSIONS.CASHIER },
    COOK: { title: 'Cocinero / Operador KDS', defaultPermissions: ROLE_DEFAULT_PERMISSIONS.COOK },
};
exports.adminInviteStaffMember = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    const callerUid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!callerUid) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado.');
    }
    const { businessId, displayName, email, role, pin } = data;
    if (!businessId || !displayName || !email || !role || !pin) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan campos obligatorios: businessId, displayName, email, role, pin.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();
    const cleanRole = role.trim().toUpperCase();
    if (!/^\d{4}$/.test(cleanPin)) {
        throw new functions.https.HttpsError('invalid-argument', 'El PIN debe ser exactamente de 4 dígitos numéricos.');
    }
    if (!['MANAGER', 'SUPERVISOR', 'CASHIER', 'COOK'].includes(cleanRole)) {
        throw new functions.https.HttpsError('invalid-argument', `Rol inválido '${cleanRole}'. Roles permitidos: MANAGER, SUPERVISOR, CASHIER, COOK.`);
    }
    // 1. Verificar Autorización del Llamador (Zero-Trust Multi-Tenant)
    const callerClaims = (((_b = context.auth) === null || _b === void 0 ? void 0 : _b.token) || {});
    const callerRole = (callerClaims.role || '').toString().toUpperCase();
    const callerBusinessId = callerClaims.businessId;
    let isAuthorized = false;
    if (['SUPER_ADMIN', 'ADMIN'].includes(callerRole)) {
        isAuthorized = true;
    }
    else if (['OWNER', 'MANAGER', 'MERCHANT_OWNER'].includes(callerRole) && callerBusinessId === businessId) {
        isAuthorized = true;
    }
    else {
        // Fallback: comprobar si es owner directo en /businesses/{businessId}
        const bizDoc = await db.collection('businesses').doc(businessId).get();
        if (bizDoc.exists && ((_c = bizDoc.data()) === null || _c === void 0 ? void 0 : _c.ownerUid) === callerUid) {
            isAuthorized = true;
        }
    }
    if (!isAuthorized) {
        throw new functions.https.HttpsError('permission-denied', 'No tienes autorización para gestionar personal en este comercio.');
    }
    // 2. Obtener datos del comercio para heredar tenantId / orgId
    const bizSnap = await db.collection('businesses').doc(businessId).get();
    if (!bizSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'El comercio especificado no existe.');
    }
    const bizData = bizSnap.data() || {};
    const tenantId = bizData.tenantId || bizData.orgId || 'ten_bluesystem_core';
    const orgId = bizData.orgId || tenantId;
    const businessName = bizData.name || 'Comercio BlueSystem';
    // 3. Crear o Reutilizar Usuario en Firebase Authentication (Idempotente)
    let authUser;
    try {
        authUser = await admin.auth().getUserByEmail(cleanEmail);
        logger_1.Logger.info(`[STAFF_AUTH] Usuario Auth preexistente detectado para ${cleanEmail} (UID: ${authUser.uid})`);
    }
    catch (err) {
        if (err.code === 'auth/user-not-found') {
            logger_1.Logger.info(`[STAFF_AUTH] Creando nueva cuenta Auth para ${cleanEmail}...`);
            authUser = await admin.auth().createUser({
                email: cleanEmail,
                displayName: displayName.trim(),
                disabled: false,
            });
        }
        else {
            throw new functions.https.HttpsError('internal', `Error consultando Firebase Auth: ${err.message}`);
        }
    }
    const employeeUid = authUser.uid;
    const branchId = data.branchId || null;
    const branchName = data.branchName || (branchId ? 'Sucursal Asignada' : 'Todas las sucursales');
    const employeeId = data.employeeId || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const membershipId = `mem_${employeeUid}_${businessId}`;
    const token = `inv_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const effectivePermissions = data.permissions && data.permissions.length > 0
        ? data.permissions
        : (ROLE_DEFAULT_PERMISSIONS[cleanRole] || ['ORDERS', 'DASHBOARD']);
    const now = FieldValue.serverTimestamp();
    // 4. Escritura Atómica en Firestore (Batch)
    const batch = db.batch();
    // a) /employees/{employeeId}
    const empRef = db.collection('employees').doc(employeeId);
    batch.set(empRef, {
        employeeId,
        uid: employeeUid,
        businessId,
        tenantId,
        orgId,
        branchId,
        branchName,
        displayName: displayName.trim(),
        email: cleanEmail,
        phone: (data.phone || '').trim(),
        role: cleanRole,
        status: 'ACTIVE',
        pin: cleanPin,
        permissions: effectivePermissions,
        invitedBy: callerUid,
        invitedAt: now,
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    // b) /membership/{membershipId} (Legacy)
    const memRef = db.collection('membership').doc(membershipId);
    batch.set(memRef, {
        membershipId,
        uid: employeeUid,
        businessId,
        orgId,
        tenantId,
        branchId,
        role: cleanRole,
        status: 'ACTIVE',
        permissions: effectivePermissions,
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    // c) /memberships/{membershipId} (V3)
    const memV3Ref = db.collection('memberships').doc(membershipId);
    batch.set(memV3Ref, {
        membershipId,
        uid: employeeUid,
        businessId,
        orgId,
        tenantId,
        branchId,
        role: cleanRole,
        status: 'ACTIVE',
        permissions: effectivePermissions,
        schemaVersion: '3.0',
        createdAt: now,
        updatedAt: now,
    }, { merge: true });
    // d) /users/{uid}
    const userRef = db.collection('users').doc(employeeUid);
    batch.set(userRef, {
        uid: employeeUid,
        email: cleanEmail,
        displayName: displayName.trim(),
        name: displayName.trim(),
        nombre: displayName.trim(),
        phone: (data.phone || '').trim(),
        telefono: (data.phone || '').trim(),
        role: cleanRole,
        rol: cleanRole,
        eiamRole: cleanRole,
        businessId,
        branchId,
        tenantId,
        orgId,
        status: 'ACTIVE',
        isActive: true,
        active: true,
        isDeleted: false,
        updatedAt: now,
    }, { merge: true });
    // e) /invitations/{token}
    const invRef = db.collection('invitations').doc(token);
    batch.set(invRef, {
        token,
        email: cleanEmail,
        targetRole: cleanRole,
        role: cleanRole,
        businessId,
        branchId,
        orgId,
        tenantId,
        employeeId,
        invitedBy: callerUid,
        channel: 'EMAIL',
        status: 'PENDING',
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)), // 72 horas
        createdAt: now,
    });
    // f) /audit_events
    const auditRef = db.collection('audit_events').doc();
    batch.set(auditRef, {
        event: 'STAFF_MEMBER_INVITED',
        domain: 'IDENTITY',
        actorUid: callerUid,
        targetUid: employeeUid,
        employeeId,
        businessId,
        branchId,
        role: cleanRole,
        timestamp: now,
    });
    await batch.commit();
    logger_1.Logger.info(`[STAFF_AUTH] Registros en Firestore creados atómicamente para ${cleanEmail} (empId: ${employeeId})`);
    // 5. Emitir Custom Claims Canónicos de forma Inmediata
    const claims = {
        role: cleanRole,
        businessId,
        branchId: branchId || null,
        orgId,
        tenantId,
    };
    await admin.auth().setCustomUserClaims(employeeUid, claims);
    logger_1.Logger.info(`[STAFF_AUTH] Custom Claims emitidos para ${employeeUid}:`, claims);
    // 6. Generar enlace seguro de activación de cuenta
    const activationLink = `https://comercio.bluesystemdelivery.com/accept-invite?token=${token}`;
    // 7. Enviar correo transaccional de invitación con EmailService (No bloqueante)
    let emailResult = null;
    const roleTitle = ((_d = ROLE_DEFINITIONS[cleanRole]) === null || _d === void 0 ? void 0 : _d.title) || cleanRole;
    try {
        const eventId = `staff_inv_${employeeId}_${Date.now()}`;
        emailResult = await emailService_1.EmailService.sendTransactionalEmail({
            eventId,
            eventType: 'STAFF_INVITATION_SENT',
            recipient: cleanEmail,
            recipientUid: employeeUid,
            templateId: 'staff_invitation',
            tenantId,
            entityType: 'USER',
            entityId: employeeUid,
            variables: {
                employeeName: displayName.trim(),
                businessName,
                branchName,
                roleTitle,
                email: cleanEmail,
                activationLink,
            },
        });
        logger_1.Logger.info(`[STAFF_AUTH] Correo transaccional de invitación despachado a ${cleanEmail} (Status: ${emailResult.status}, EventId: ${eventId})`);
    }
    catch (emailErr) {
        logger_1.Logger.error(`[STAFF_AUTH] Fallo al despachar email de invitación a ${cleanEmail}: ${emailErr.message}`);
        emailResult = {
            success: false,
            status: 'FAILED',
            error: emailErr.message,
        };
    }
    return {
        success: true,
        employeeId,
        uid: employeeUid,
        token,
        activationLink,
        pin: cleanPin,
        emailStatus: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.status) || 'PENDING',
        emailSent: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.status) === 'SENT',
        emailProviderMessageId: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.providerMessageId) || null,
        emailError: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.error) || null,
        message: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.status) === 'SENT'
            ? `Colaborador '${displayName}' registrado e invitación enviada por correo a ${cleanEmail}.`
            : `Colaborador '${displayName}' registrado, pero hubo un detalle con el envío de correo: ${(emailResult === null || emailResult === void 0 ? void 0 : emailResult.error) || 'Pendiente'}.`,
    };
});
exports.authenticateWithStaffPin = functions.https.onCall(async (data, context) => {
    var _a;
    let { businessId, pin, email } = data;
    if (!pin || (!businessId && !email)) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requiere el PIN de 4 dígitos y el correo o identificador de comercio.');
    }
    const cleanPin = pin.trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!/^\d{4}$/.test(cleanPin)) {
        throw new functions.https.HttpsError('invalid-argument', 'El PIN debe consistir exactamente en 4 dígitos numéricos.');
    }
    const rateLimitKey = `${businessId || 'no_biz'}_${cleanEmail || 'global'}_${cleanPin}`;
    const rateCheck = checkPinRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
        throw new functions.https.HttpsError('resource-exhausted', `Demasiados intentos erróneos con este PIN. Terminal bloqueada por ${rateCheck.remainingSeconds} segundos.`);
    }
    // 1. Buscar colaborador en /employees
    let empQuery = db.collection('employees').where('pin', '==', cleanPin);
    if (businessId && businessId.trim()) {
        empQuery = empQuery.where('businessId', '==', businessId.trim());
    }
    if (cleanEmail) {
        empQuery = empQuery.where('email', '==', cleanEmail);
    }
    const empSnap = await empQuery.get();
    if (empSnap.empty) {
        recordPinFailure(rateLimitKey);
        logger_1.Logger.warn(`[STAFF_PIN] PIN incorrecto o no encontrado para email=${cleanEmail}, businessId=${businessId}`);
        throw new functions.https.HttpsError('not-found', 'PIN incorrecto o ningún colaborador activo coincide con este identificador.');
    }
    // Tomar el empleado activo correspondiente
    const activeEmpDocs = empSnap.docs.filter(d => {
        const status = (d.data().status || '').toUpperCase();
        const active = d.data().active !== false;
        return status === 'ACTIVE' && active;
    });
    if (activeEmpDocs.length === 0) {
        recordPinFailure(rateLimitKey);
        throw new functions.https.HttpsError('permission-denied', 'El colaborador asociado a este PIN se encuentra inactivo o suspendido.');
    }
    const empDoc = activeEmpDocs[0];
    const empData = empDoc.data();
    businessId = businessId || empData.businessId;
    if (!businessId) {
        throw new functions.https.HttpsError('failed-precondition', 'No se pudo determinar el comercio asociado a este empleado.');
    }
    let employeeUid = empData.uid;
    const employeeEmail = empData.email;
    const employeeRole = (empData.role || 'CASHIER').toUpperCase();
    const branchId = empData.branchId || null;
    // Resetear rate-limiting tras acierto
    resetPinAttempts(rateLimitKey);
    // 2. Verificar estado del comercio
    const bizDoc = await db.collection('businesses').doc(businessId).get();
    if (!bizDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'El comercio no existe.');
    }
    const bizData = bizDoc.data() || {};
    const bizStatus = (bizData.status || '').toUpperCase();
    const bizLifecycle = (bizData.lifecycleStatus || '').toUpperCase();
    if (bizStatus !== 'ACTIVE' && bizLifecycle !== 'ACTIVE' && bizLifecycle !== 'ONBOARDING') {
        throw new functions.https.HttpsError('failed-precondition', 'El comercio se encuentra inactivo o suspendido.');
    }
    const tenantId = bizData.tenantId || bizData.orgId || 'ten_bluesystem_core';
    const orgId = bizData.orgId || tenantId;
    // 3. Reconciliación Forense Automática de UID si estaba ausente en /employees
    if (!employeeUid && employeeEmail) {
        try {
            const authUser = await admin.auth().getUserByEmail(employeeEmail);
            employeeUid = authUser.uid;
            await empDoc.ref.update({ uid: employeeUid, updatedAt: FieldValue.serverTimestamp() });
            logger_1.Logger.info(`[STAFF_PIN] UID ${employeeUid} auto-reconciliado en /employees/${empDoc.id}`);
        }
        catch (authErr) {
            if (authErr.code === 'auth/user-not-found') {
                // Crear usuario Auth de forma segura
                const newAuth = await admin.auth().createUser({
                    email: employeeEmail,
                    displayName: empData.displayName || 'Colaborador',
                    disabled: false,
                });
                employeeUid = newAuth.uid;
                await empDoc.ref.update({ uid: employeeUid, updatedAt: FieldValue.serverTimestamp() });
                logger_1.Logger.info(`[STAFF_PIN] Usuario Auth creado y asignado ${employeeUid} para ${employeeEmail}`);
            }
            else {
                throw new functions.https.HttpsError('internal', `Error resolviendo Auth para empleado: ${authErr.message}`);
            }
        }
    }
    if (!employeeUid) {
        throw new functions.https.HttpsError('failed-precondition', 'No se pudo asociar una identidad de seguridad válida para este colaborador.');
    }
    // 4. Garantizar Membresía y Custom Claims
    const membershipId = `mem_${employeeUid}_${businessId}`;
    const memRef = db.collection('membership').doc(membershipId);
    const memSnap = await memRef.get();
    const effectivePermissions = empData.permissions || ROLE_DEFAULT_PERMISSIONS[employeeRole] || ['ORDERS', 'DASHBOARD'];
    if (!memSnap.exists || ((_a = memSnap.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'ACTIVE') {
        await memRef.set({
            membershipId,
            uid: employeeUid,
            businessId,
            orgId,
            tenantId,
            branchId,
            role: employeeRole,
            status: 'ACTIVE',
            permissions: effectivePermissions,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        await db.collection('memberships').doc(membershipId).set({
            membershipId,
            uid: employeeUid,
            businessId,
            orgId,
            tenantId,
            branchId,
            role: employeeRole,
            status: 'ACTIVE',
            permissions: effectivePermissions,
            schemaVersion: '3.0',
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        logger_1.Logger.info(`[STAFF_PIN] Membresía activa asegurada para uid=${employeeUid}`);
    }
    // Sincronizar /users/{uid}
    await db.collection('users').doc(employeeUid).set({
        uid: employeeUid,
        email: employeeEmail,
        displayName: empData.displayName,
        role: employeeRole,
        rol: employeeRole,
        eiamRole: employeeRole,
        businessId,
        branchId,
        tenantId,
        orgId,
        status: 'ACTIVE',
        isActive: true,
        active: true,
        isDeleted: false,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    // Emitir Custom Claims
    const claims = {
        role: employeeRole,
        businessId,
        branchId,
        orgId,
        tenantId,
    };
    await admin.auth().setCustomUserClaims(employeeUid, claims);
    // 5. Generar Custom Token oficial de Firebase Auth firmado
    const customToken = await admin.auth().createCustomToken(employeeUid, claims);
    logger_1.Logger.info(`[STAFF_PIN] Custom Token generado exitosamente para empleado ${empData.displayName} (UID: ${employeeUid}, Rol: ${employeeRole})`);
    // 6. Registrar evento de auditoría
    await db.collection('audit_events').doc().set({
        event: 'STAFF_PIN_AUTHENTICATED',
        domain: 'IDENTITY',
        uid: employeeUid,
        businessId,
        branchId,
        role: employeeRole,
        timestamp: FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        customToken,
        uid: employeeUid,
        role: employeeRole,
        displayName: empData.displayName,
        email: employeeEmail,
        businessId,
        branchId,
    };
});
exports.acceptStaffInvitation = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    const { token, password } = data;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'El token de invitación es obligatorio.');
    }
    const invDoc = await db.collection('invitations').doc(token.trim()).get();
    if (!invDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'La invitación no existe o es inválida.');
    }
    const invData = invDoc.data() || {};
    const email = invData.email;
    const businessId = invData.businessId;
    const branchId = invData.branchId || null;
    const targetRole = (invData.targetRole || invData.role || 'CASHIER').toUpperCase();
    const employeeId = invData.employeeId;
    let callerUid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (invData.status === 'ACCEPTED') {
        // Idempotencia segura: Si ya fue aceptada por esta misma identidad
        let isSameUser = false;
        if (callerUid && invData.acceptedByUid === callerUid) {
            isSameUser = true;
        }
        if (!isSameUser && email) {
            try {
                const existingUser = await admin.auth().getUserByEmail(email);
                if (invData.acceptedByUid === existingUser.uid) {
                    callerUid = existingUser.uid;
                    isSameUser = true;
                }
            }
            catch (_d) { }
        }
        if (isSameUser && callerUid) {
            const claims = {
                role: targetRole,
                businessId,
                branchId,
                orgId: invData.orgId || 'org_tecnostore',
                tenantId: invData.tenantId || 'ten_bluesystem_core',
            };
            let customToken = null;
            try {
                customToken = await admin.auth().createCustomToken(callerUid, claims);
            }
            catch (e) {
                logger_1.Logger.warn(`[ACCEPT_STAFF_INVITE] Fallback token signing en reintento idempotente: ${e.message}`);
            }
            return {
                success: true,
                customToken,
                email,
                uid: callerUid,
                role: targetRole,
                businessId,
                branchId,
                message: 'Invitación previamente aceptada. Sesión restaurada.',
            };
        }
        throw new functions.https.HttpsError('failed-precondition', 'Esta invitación ya fue utilizada previamente.');
    }
    if (invData.status === 'REVOKED') {
        throw new functions.https.HttpsError('failed-precondition', 'Esta invitación fue revocada por el administrador.');
    }
    const expiresAt = ((_c = (_b = invData.expiresAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || new Date(invData.expiresAt);
    if (expiresAt && Date.now() > expiresAt.getTime()) {
        await invDoc.ref.update({ status: 'EXPIRED' });
        throw new functions.https.HttpsError('failed-precondition', 'La invitación ha expirado.');
    }
    // Si viene con contraseña para establecerla en Auth:
    if (password) {
        if (password.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
        }
        try {
            let authUser;
            try {
                authUser = await admin.auth().getUserByEmail(email);
                await admin.auth().updateUser(authUser.uid, { password, disabled: false });
            }
            catch (e) {
                if (e.code === 'auth/user-not-found') {
                    authUser = await admin.auth().createUser({ email, password, disabled: false });
                }
                else {
                    throw e;
                }
            }
            callerUid = authUser.uid;
        }
        catch (err) {
            throw new functions.https.HttpsError('internal', `Error configurando credenciales de acceso: ${err.message}`);
        }
    }
    if (!callerUid) {
        try {
            const authUser = await admin.auth().getUserByEmail(email);
            callerUid = authUser.uid;
        }
        catch (_e) {
            throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión o establecer tu contraseña para aceptar la invitación.');
        }
    }
    // Obtener datos del comercio
    const bizSnap = await db.collection('businesses').doc(businessId).get();
    const bizData = bizSnap.data() || {};
    const tenantId = bizData.tenantId || bizData.orgId || 'ten_bluesystem_core';
    const orgId = bizData.orgId || tenantId;
    const membershipId = `mem_${callerUid}_${businessId}`;
    const now = FieldValue.serverTimestamp();
    const effectivePermissions = ROLE_DEFAULT_PERMISSIONS[targetRole] || ['ORDERS', 'DASHBOARD'];
    // Escritura en batch
    const batch = db.batch();
    // Actualizar invitación
    batch.update(invDoc.ref, {
        status: 'ACCEPTED',
        acceptedByUid: callerUid,
        acceptedAt: now,
    });
    // Actualizar empleado si existe employeeId
    if (employeeId) {
        const empRef = db.collection('employees').doc(employeeId);
        batch.set(empRef, {
            uid: callerUid,
            status: 'ACTIVE',
            updatedAt: now,
        }, { merge: true });
    }
    // Membresías
    const memRef = db.collection('membership').doc(membershipId);
    batch.set(memRef, {
        membershipId,
        uid: callerUid,
        businessId,
        orgId,
        tenantId,
        branchId,
        role: targetRole,
        status: 'ACTIVE',
        permissions: effectivePermissions,
        updatedAt: now,
    }, { merge: true });
    const memV3Ref = db.collection('memberships').doc(membershipId);
    batch.set(memV3Ref, {
        membershipId,
        uid: callerUid,
        businessId,
        orgId,
        tenantId,
        branchId,
        role: targetRole,
        status: 'ACTIVE',
        permissions: effectivePermissions,
        schemaVersion: '3.0',
        updatedAt: now,
    }, { merge: true });
    // Usuario
    const userRef = db.collection('users').doc(callerUid);
    batch.set(userRef, {
        uid: callerUid,
        email,
        role: targetRole,
        rol: targetRole,
        eiamRole: targetRole,
        businessId,
        branchId,
        tenantId,
        orgId,
        status: 'ACTIVE',
        isActive: true,
        active: true,
        isDeleted: false,
        updatedAt: now,
    }, { merge: true });
    await batch.commit();
    // Emitir Custom Claims
    const claims = {
        role: targetRole,
        businessId,
        branchId,
        orgId,
        tenantId,
    };
    await admin.auth().setCustomUserClaims(callerUid, claims);
    // Generar Custom Token para inicio de sesión inmediato (con manejo defensivo)
    let customToken = null;
    try {
        customToken = await admin.auth().createCustomToken(callerUid, claims);
    }
    catch (tokenErr) {
        logger_1.Logger.warn(`[ACCEPT_STAFF_INVITE] Aviso de IAM al firmar Custom Token para UID ${callerUid}: ${tokenErr.message}`);
    }
    return {
        success: true,
        customToken,
        email,
        uid: callerUid,
        role: targetRole,
        businessId,
        branchId,
        message: 'Invitación aceptada exitosamente.',
    };
});
exports.adminResendStaffInvitation = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    const callerUid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!callerUid) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión como administrador de comercio.');
    }
    const { employeeId, businessId } = data;
    if (!employeeId || !businessId) {
        throw new functions.https.HttpsError('invalid-argument', 'employeeId y businessId son obligatorios.');
    }
    // 1. Validar permisos del actor sobre el comercio
    const tokenClaims = (((_b = context.auth) === null || _b === void 0 ? void 0 : _b.token) || {});
    const callerRole = (tokenClaims.role || tokenClaims.eiamRole || '').toUpperCase();
    const callerBiz = tokenClaims.businessId;
    if (callerRole !== 'SUPERADMIN' && callerRole !== 'ADMIN_PLATFORM') {
        if (callerBiz !== businessId) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permisos de administración en este comercio.');
        }
        if (callerRole !== 'OWNER' && callerRole !== 'MANAGER' && callerRole !== 'SUPERVISOR') {
            throw new functions.https.HttpsError('permission-denied', 'Tu rol no tiene privilegios para reenviar invitaciones.');
        }
    }
    // 2. Localizar empleado
    const empRef = db.collection('employees').doc(employeeId.trim());
    const empSnap = await empRef.get();
    if (!empSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'El colaborador especificado no existe.');
    }
    const empData = empSnap.data() || {};
    if (empData.businessId !== businessId) {
        throw new functions.https.HttpsError('permission-denied', 'El colaborador no pertenece a este comercio.');
    }
    const cleanEmail = (empData.email || '').trim().toLowerCase();
    const displayName = empData.displayName || 'Colaborador';
    const role = (empData.role || 'CASHIER').toUpperCase();
    const employeeUid = empData.uid;
    const branchName = empData.branchName || 'Todas las sucursales';
    const branchId = empData.branchId || null;
    const tenantId = empData.tenantId || 'ten_bluesystem_core';
    // Obtener nombre del comercio
    const bizSnap = await db.collection('businesses').doc(businessId).get();
    const businessName = ((_c = bizSnap.data()) === null || _c === void 0 ? void 0 : _c.name) || ((_d = bizSnap.data()) === null || _d === void 0 ? void 0 : _d.nombre) || 'Comercio BlueSystem';
    // 3. Generar nuevo token seguro manteniendo identidad idempotente
    const token = `inv_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const now = FieldValue.serverTimestamp();
    await db.collection('invitations').doc(token).set({
        token,
        email: cleanEmail,
        targetRole: role,
        role,
        businessId,
        branchId,
        tenantId,
        employeeId,
        invitedBy: callerUid,
        channel: 'EMAIL',
        status: 'PENDING',
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
        createdAt: now,
        resendCount: admin.firestore.FieldValue.increment(1),
    });
    const activationLink = `https://comercio.bluesystemdelivery.com/accept-invite?token=${token}`;
    const roleTitle = ((_e = ROLE_DEFINITIONS[role]) === null || _e === void 0 ? void 0 : _e.title) || role;
    // 4. Enviar correo transaccional
    let emailResult = null;
    try {
        const eventId = `staff_resend_${employeeId}_${Date.now()}`;
        emailResult = await emailService_1.EmailService.sendTransactionalEmail({
            eventId,
            eventType: 'STAFF_INVITATION_SENT',
            recipient: cleanEmail,
            recipientUid: employeeUid || undefined,
            templateId: 'staff_invitation',
            tenantId,
            entityType: 'USER',
            entityId: employeeUid || employeeId,
            variables: {
                employeeName: displayName,
                businessName,
                branchName,
                roleTitle,
                email: cleanEmail,
                activationLink,
            },
        });
        logger_1.Logger.info(`[STAFF_AUTH] Reenvío de invitación exitoso a ${cleanEmail} (Status: ${emailResult.status})`);
    }
    catch (emailErr) {
        logger_1.Logger.error(`[STAFF_AUTH] Error en reenvío a ${cleanEmail}: ${emailErr.message}`);
        emailResult = {
            success: false,
            status: 'FAILED',
            error: emailErr.message,
        };
    }
    // Registrar en auditoría
    await db.collection('audit_events').doc().set({
        event: 'STAFF_INVITATION_RESENT',
        domain: 'IDENTITY',
        actorUid: callerUid,
        targetUid: employeeUid || null,
        employeeId,
        businessId,
        emailStatus: emailResult === null || emailResult === void 0 ? void 0 : emailResult.status,
        timestamp: now,
    });
    return {
        success: true,
        token,
        activationLink,
        emailStatus: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.status) || 'PENDING',
        emailSent: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.status) === 'SENT',
        emailProviderMessageId: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.providerMessageId) || null,
        emailError: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.error) || null,
        message: (emailResult === null || emailResult === void 0 ? void 0 : emailResult.status) === 'SENT'
            ? `Invitación reenviada exitosamente a ${cleanEmail}.`
            : `Invitación generada, pero el correo no pudo entregarse: ${(emailResult === null || emailResult === void 0 ? void 0 : emailResult.error) || 'Detalle en proveedor'}.`,
    };
});
exports.getStaffInvitationDetails = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    const { token } = data;
    if (!token || typeof token !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'El token de invitación es requerido.');
    }
    const cleanToken = token.trim();
    const invSnap = await db.collection('invitations').doc(cleanToken).get();
    if (!invSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'La invitación no existe o el enlace es inválido.');
    }
    const invData = invSnap.data() || {};
    if (invData.status === 'ACCEPTED') {
        throw new functions.https.HttpsError('failed-precondition', 'Esta invitación ya fue utilizada previamente.');
    }
    if (invData.status === 'REVOKED') {
        throw new functions.https.HttpsError('failed-precondition', 'Esta invitación fue revocada por el administrador.');
    }
    const expiresAt = ((_b = (_a = invData.expiresAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(invData.expiresAt);
    if (expiresAt && Date.now() > expiresAt.getTime()) {
        throw new functions.https.HttpsError('failed-precondition', 'La invitación ha expirado.');
    }
    // Resolver nombre del comercio
    let businessName = 'Comercio BlueSystem';
    if (invData.businessId) {
        try {
            const bizSnap = await db.collection('businesses').doc(invData.businessId).get();
            if (bizSnap.exists) {
                businessName = ((_c = bizSnap.data()) === null || _c === void 0 ? void 0 : _c.name) || ((_d = bizSnap.data()) === null || _d === void 0 ? void 0 : _d.nombre) || businessName;
            }
        }
        catch (_f) {
            // Fallback
        }
    }
    const role = (invData.targetRole || invData.role || 'CASHIER').toUpperCase();
    const roleTitle = ((_e = ROLE_DEFINITIONS[role]) === null || _e === void 0 ? void 0 : _e.title) || role;
    return {
        valid: true,
        email: invData.email,
        businessId: invData.businessId,
        businessName,
        branchId: invData.branchId || null,
        branchName: invData.branchName || 'Todas las sucursales',
        role,
        roleTitle,
        status: invData.status,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
    };
});
//# sourceMappingURL=staffAuth.js.map