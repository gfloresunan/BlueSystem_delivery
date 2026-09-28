// identityAdministrationService.js — BlueSystem Enterprise v2.2 / IAC v1.0
// Single Authoritative Writing & Governance Administration Service
// Conforms strictly to IDENTITY CONTRACT v1.0 (Locked Standard)

(function (global) {
    'use strict';

    // Registro global de bloqueos de ciclo de vida (in-flight deprovisioning / deletes)
    if (!global._iacLifecycleLocks) global._iacLifecycleLocks = new Set();

    const IdentityAdministrationService = {

        // ─── GESTIÓN DE BLOQUEOS DE CICLO DE VIDA (LIFECYCLE LOCKS) ─────────────
        lockBusinessLifecycle: function (businessId) {
            if (!businessId) return;
            global._iacLifecycleLocks.add(businessId);
            console.log(`[EIAM_GUARD] [LIFECYCLE_LOCKED] Comercio bloqueado por ciclo de vida: ${businessId}`);
        },

        unlockBusinessLifecycle: function (businessId) {
            if (!businessId) return;
            global._iacLifecycleLocks.delete(businessId);
            console.log(`[EIAM_GUARD] [LIFECYCLE_UNLOCKED] Comercio liberado de bloqueo: ${businessId}`);
        },

        isBusinessLifecycleLocked: function (businessId) {
            return businessId ? global._iacLifecycleLocks.has(businessId) : false;
        },

        // ─── VALIDACIÓN PREVIA DE CICLO DE VIDA (PRE-WRITE LIFECYCLE GUARD) ──────
        validateLifecyclePreconditions: async function (uid, actionName = 'MUTATION') {
            if (!uid) throw new Error(`[EIAM_GUARD] UID no válido para ${actionName}`);
            if (typeof db === 'undefined') throw new Error("[EIAM_GUARD] Firestore no inicializado");

            // 1. Obtener documento de usuario
            const userSnap = await db.collection('users').doc(uid).get().catch(() => null);
            if (!userSnap || !userSnap.exists) {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado ${actionName}: UID ${uid} no existe en /users.`);
                throw new Error(`[EIAM_GUARD] La identidad '${uid}' no existe en el sistema.`);
            }

            const userData = userSnap.data() || {};

            // 2. Verificar estado de borrado/deprovisionamiento de la identidad
            if (userData.isDeleted || userData.status === 'DELETED' || userData.lifecycleStatus === 'DEPROVISIONED') {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado ${actionName}: Identidad ${uid} está eliminada/deprovisionada.`);
                throw new Error(`[EIAM_GUARD] La identidad '${uid}' ha sido eliminada o desaprovisionada.`);
            }

            // 3. Verificar si el comercio asociado está bloqueado o eliminado
            const businessId = userData.businessId;
            if (businessId) {
                if (this.isBusinessLifecycleLocked(businessId)) {
                    console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado ${actionName}: Desaprovisionamiento en curso para businessId=${businessId}`);
                    throw new Error(`[EIAM_GUARD] Operación bloqueada: El comercio asociado '${businessId}' está en proceso de eliminación.`);
                }

                const bizSnap = await db.collection('businesses').doc(businessId).get().catch(() => null);
                if (!bizSnap || !bizSnap.exists) {
                    console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado ${actionName}: El comercio ${businessId} asociado al usuario ya no existe en /businesses.`);
                    throw new Error(`[EIAM_GUARD] Operación bloqueada: El comercio '${businessId}' asociado ya no existe.`);
                }

                const bizData = bizSnap.data() || {};
                if (bizData.isDeleted || bizData.status === 'DELETED' || bizData.lifecycleStatus === 'DEPROVISIONED') {
                    console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado ${actionName}: El comercio ${businessId} está marcado como DELETED.`);
                    throw new Error(`[EIAM_GUARD] Operación bloqueada: El comercio '${businessId}' ha sido eliminado.`);
                }
            }

            return { valid: true, userData };
        },

        // ─── 0. PREVIEW & DRY-RUN ENGINE ─────────────────────────────────────────
        previewOperation: async function (action, uid, payload = {}) {
            if (!uid) throw new Error("[IAC] UID es requerido para preflight");
            
            console.log(`[IAC] Ejecutando preflight/dry-run para acción: ${action} en UID: ${uid}`);
            
            let currentUserDoc = null;
            if (typeof db !== 'undefined') {
                const snap = await db.collection('users').doc(uid).get().catch(() => null);
                if (snap && snap.exists) currentUserDoc = snap.data();
            }

            const currentRole = currentUserDoc ? CanonicalIdentityResolver.resolveEiamRole(currentUserDoc) : 'CLIENT';
            const currentStatus = currentUserDoc ? CanonicalIdentityResolver.resolveIdentityStatus(currentUserDoc) : 'ACTIVE';

            let preview = {
                action,
                uid,
                current: { role: currentRole, status: currentStatus },
                target: {},
                risk: 'LOW',
                dependencies: 0,
                rollbackAvailable: true,
                allowed: true,
                warning: null
            };

            switch (action) {
                case 'UPDATE_ROLE':
                    const targetRole = CanonicalIdentityResolver.resolveEiamRole(payload.targetRole);
                    preview.target.role = targetRole;
                    preview.risk = (targetRole === 'SUPER_ADMIN' || targetRole === 'ADMIN') ? 'HIGH' : 'LOW';
                    if (targetRole === 'SUPER_ADMIN') {
                        preview.warning = "La designación de SUPER_ADMIN requiere reautenticación y autorización superior.";
                    }
                    break;

                case 'SET_STATUS':
                    const targetStatus = CanonicalIdentityResolver.resolveIdentityStatus({ status: payload.targetStatus });
                    preview.target.status = targetStatus;
                    preview.target.authDisabled = (targetStatus !== 'ACTIVE' && targetStatus !== 'PENDING');
                    preview.risk = (targetStatus === 'TERMINATED' || targetStatus === 'BLOCKED') ? 'MEDIUM' : 'LOW';
                    break;

                case 'TRANSFER_EMPLOYEE':
                    preview.target.businessId = payload.businessId || null;
                    preview.target.branchId = payload.branchId || null;
                    preview.risk = 'MEDIUM';
                    break;

                case 'RECONCILE_CLAIMS':
                    preview.target.action = 'TRIGGER_SET_USER_CLAIMS_V2';
                    preview.risk = 'LOW';
                    break;

                default:
                    preview.warning = "Acción no clasificada formalmente";
            }

            return preview;
        },

        // ─── 1. ACTUALIZACIÓN DE ROL CANÓNICO ────────────────────────────────────
        updateIdentityRole: async function (uid, targetRole, actorUid = 'ADMIN_PORTAL') {
            if (!uid || !targetRole) throw new Error("[IAC] UID y Rol son requeridos");
            if (typeof db === 'undefined') throw new Error("[IAC] Firestore no inicializado");

            // [EIAM_GUARD] Pre-validación de ciclo de vida
            await this.validateLifecyclePreconditions(uid, 'UPDATE_ROLE');

            const canonicalRole = CanonicalIdentityResolver.resolveEiamRole(targetRole);
            const legacyString = canonicalRole.toLowerCase();

            console.log(`[IAC_ROLE] [IDENTITY_SAVE] Actualizando rol canónico para ${uid} -> ${canonicalRole}`);

            // Pre-Snapshot para rollback
            const backup = await this.createIdentityBackup(uid, 'UPDATE_ROLE');

            // Dual-Write seguro durante Periodo de Compatibilidad (sanitizado)
            await db.collection('users').doc(uid).set({
                role: canonicalRole,       // CANONICAL
                eiamRole: canonicalRole,   // LEGACY COMPAT
                rol: legacyString,         // LEGACY COMPAT
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Registrar evento de auditoría estructurado
            await this.logIacAuditEvent({
                operationId: backup.operationId,
                action: 'UPDATE_ROLE',
                actorUid,
                targetUid: uid,
                before: { role: backup.snapshot.role || null },
                after: { role: canonicalRole },
                reason: 'Actualización canónica de rol via IAC'
            });

            return { success: true, canonicalRole, operationId: backup.operationId };
        },

        // ─── 2. ACTUALIZACIÓN DE ESTADO OPERACIONAL & AUTH SYNC ──────────────────
        setIdentityStatus: async function (uid, targetStatus, actorUid = 'ADMIN_PORTAL') {
            if (!uid) throw new Error("[IAC] UID es requerido");
            if (typeof db === 'undefined') throw new Error("[IAC] Firestore no inicializado");

            // [EIAM_GUARD] Pre-validación de ciclo de vida
            await this.validateLifecyclePreconditions(uid, 'SET_STATUS');

            let canonicalStatus = 'ACTIVE';
            let activeBool = true;

            if (typeof targetStatus === 'boolean') {
                activeBool = targetStatus;
                canonicalStatus = activeBool ? 'ACTIVE' : 'BLOCKED';
            } else if (typeof targetStatus === 'string') {
                canonicalStatus = CanonicalIdentityResolver.resolveIdentityStatus({ status: targetStatus });
                activeBool = (canonicalStatus === 'ACTIVE' || canonicalStatus === 'PENDING');
            }

            console.log(`[IAC_STATUS] [IDENTITY_SAVE] Actualizando estado canónico para ${uid} -> ${canonicalStatus} (active=${activeBool})`);

            // Pre-Snapshot para rollback
            const backup = await this.createIdentityBackup(uid, 'SET_STATUS');

            // Dual-Write seguro en /users
            await db.collection('users').doc(uid).set({
                status: canonicalStatus,   // CANONICAL
                isActive: activeBool,      // LEGACY COMPAT
                active: activeBool,        // LEGACY COMPAT
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Sincronizar con Auth.disabled mediante Cloud Function Callable
            if (typeof functionsService !== 'undefined' && functionsService.updateUser) {
                try {
                    // ROOT FIX: functionsService.updateUser espera 'isActive' como 5to argumento.
                    // Previamente se enviaba !activeBool invirtiendo la operación (desbloqueaba al suspender y bloqueaba al reactivar).
                    await functionsService.updateUser('setBlockStatus', uid, '', '', activeBool);

                    // Asegurar que el status canónico específico ('SUSPENDED'/'ACTIVE') se mantenga en /users
                    await db.collection('users').doc(uid).set({
                        status: canonicalStatus,
                        isActive: activeBool,
                        active: activeBool,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } catch (fnErr) {
                    console.warn("[IAC_STATUS] Aviso al sincronizar Auth.disabled via callable:", fnErr);
                }
            }

            // Registrar evento de auditoría
            await this.logIacAuditEvent({
                operationId: backup.operationId,
                action: 'SET_STATUS',
                actorUid,
                targetUid: uid,
                before: { status: backup.snapshot.status || null, isActive: backup.snapshot.isActive !== false },
                after: { status: canonicalStatus, isActive: activeBool },
                reason: `Estado operacional cambiado a ${canonicalStatus}`
            });

            return { success: true, canonicalStatus, isActive: activeBool, operationId: backup.operationId };
        },

        // ─── 3. ASIGNACIÓN & TRANSFERENCIA DE EMPLEADO (ATÓMICA) ──────────────────
        transferEmployee: async function (uid, businessId, branchId, actorUid = 'ADMIN_PORTAL') {
            if (!uid) throw new Error("[IAC] UID es requerido");
            if (typeof db === 'undefined') throw new Error("[IAC] Firestore no inicializado");

            // [EIAM_GUARD] Pre-validación de ciclo de vida
            await this.validateLifecyclePreconditions(uid, 'TRANSFER_EMPLOYEE');

            if (businessId) {
                if (this.isBusinessLifecycleLocked(businessId)) {
                    throw new Error(`[EIAM_GUARD] No se puede transferir: El comercio destino '${businessId}' está en proceso de eliminación.`);
                }
                const targetBizSnap = await db.collection('businesses').doc(businessId).get().catch(() => null);
                if (!targetBizSnap || !targetBizSnap.exists) {
                    throw new Error(`[EIAM_GUARD] No se puede transferir: El comercio destino '${businessId}' no existe.`);
                }
                const targetBizData = targetBizSnap.data() || {};
                if (targetBizData.isDeleted || targetBizData.status === 'DELETED' || targetBizData.lifecycleStatus === 'DEPROVISIONED') {
                    throw new Error(`[EIAM_GUARD] No se puede transferir: El comercio destino '${businessId}' está eliminado.`);
                }
            }

            console.log(`[IAC] [IDENTITY_SAVE] Transfiriendo empleado ${uid} a negocio: ${businessId}, sucursal: ${branchId}`);

            const backup = await this.createIdentityBackup(uid, 'TRANSFER_EMPLOYEE');
            const batch = db.batch();
            const userRef = db.collection('users').doc(uid);
            
            batch.set(userRef, {
                businessId: businessId || null,
                branchId: branchId || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const empSnap = await db.collection('employees').where('uid', '==', uid).get().catch(() => null);
            if (empSnap && !empSnap.empty) {
                empSnap.forEach(doc => {
                    batch.set(doc.ref, {
                        businessId: businessId || null,
                        branchId: branchId || null,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
            }

            await batch.commit();

            await this.logIacAuditEvent({
                operationId: backup.operationId,
                action: 'TRANSFER_EMPLOYEE',
                actorUid,
                targetUid: uid,
                before: { businessId: backup.snapshot.businessId || null, branchId: backup.snapshot.branchId || null },
                after: { businessId: businessId || null, branchId: branchId || null },
                reason: `Transferencia atómica a Comercio: ${businessId}, Sucursal: ${branchId}`
            });

            return { success: true, operationId: backup.operationId };
        },

        // ─── 4. GESTIÓN DE DISPOSITIVOS HARDWARE ──────────────────────────────────
        revokeDevice: async function (deviceId, actorUid = 'ADMIN_PORTAL') {
            if (!deviceId) throw new Error("[IAC] deviceId es requerido");
            if (typeof db === 'undefined') throw new Error("[IAC] Firestore no inicializado");

            console.log(`[IAC_DEVICE] Revocando hardware de dispositivo: ${deviceId}`);

            await db.collection('user_devices').doc(deviceId).set({
                isActive: false,
                isLocked: true,
                status: 'REVOKED',
                revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await this.logIacAuditEvent({
                operationId: `IAC-DEV-${Date.now()}`,
                action: 'REVOKE_DEVICE',
                actorUid,
                targetUid: deviceId,
                before: { status: 'ACTIVE' },
                after: { status: 'REVOKED', isLocked: true },
                reason: `Dispositivo hardware ${deviceId} revocado administrativamente`
            });

            return { success: true };
        },

        // ─── 5. RECONCILIACIÓN DE CLAIMS (TOUCH SINGLE WRITER) ───────────────────
        reconcileClaims: async function (uid, actorUid = 'ADMIN_PORTAL') {
            if (!uid) throw new Error("[IAC] UID es requerido");
            if (typeof db === 'undefined') throw new Error("[IAC] Firestore no inicializado");

            console.log(`[IAC_CLAIMS] Forzando propagación de Custom Claims canónicos para UID: ${uid}`);

            // Tocar el documento /users/{uid} con timestamp para disparar setUserClaims V2 en Cloud Functions
            await db.collection('users').doc(uid).set({
                claimsLastReconciled: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await this.logIacAuditEvent({
                operationId: `IAC-CLM-${Date.now()}`,
                action: 'RECONCILE_CLAIMS',
                actorUid,
                targetUid: uid,
                before: {},
                after: { triggeredClaimsRefresh: true },
                reason: 'Disparo de propagación canónica vía setUserClaims V2'
            });

            return { success: true };
        },

        // ─── 6. BACKUP LÓGICO & ROLLBACK ENGINE ─────────────────────────────────
        createIdentityBackup: async function (uid, actionName) {
            const operationId = `IAC-OP-${new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            let snapshot = {};

            if (typeof db !== 'undefined') {
                const snap = await db.collection('users').doc(uid).get().catch(() => null);
                if (snap && snap.exists) {
                    snapshot = snap.data();
                }
            }

            const backupRecord = {
                operationId,
                action: actionName,
                uid,
                snapshot,
                timestamp: new Date().toISOString()
            };

            // Almacenar en memoria de sesión para rollback rápido
            if (!global._iacRollbackStore) global._iacRollbackStore = new Map();
            global._iacRollbackStore.set(operationId, backupRecord);

            return backupRecord;
        },

        rollbackOperation: async function (operationId, actorUid = 'ADMIN_PORTAL') {
            if (!operationId) throw new Error("[IAC_ROLLBACK] operationId es requerido");
            if (!global._iacRollbackStore || !global._iacRollbackStore.has(operationId)) {
                throw new Error(`[IAC_ROLLBACK] Snapshot de operación ${operationId} no encontrado en store de sesión`);
            }

            const record = global._iacRollbackStore.get(operationId);
            const uid = record.uid;
            const previousState = record.snapshot;

            console.log(`[IAC_ROLLBACK] Revirtiendo operación ${operationId} para UID: ${uid}`);

            await db.collection('users').doc(uid).set({
                role: previousState.role || 'CLIENT',
                status: previousState.status || 'ACTIVE',
                isActive: previousState.isActive !== false,
                businessId: previousState.businessId || null,
                branchId: previousState.branchId || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await this.logIacAuditEvent({
                operationId: `ROLLBACK-${operationId}`,
                action: 'ROLLBACK_OPERATION',
                actorUid,
                targetUid: uid,
                before: { revertedOperationId: operationId },
                after: previousState,
                reason: `Reversión ejecutada para la operación ${operationId}`
            });

            return { success: true, restoredState: previousState };
        },

        // ─── 7. AUDITORÍA INMUTABLE ──────────────────────────────────────────────
        logIacAuditEvent: async function (event) {
            try {
                if (typeof db === 'undefined') return;
                await db.collection('audit_events').add({
                    ...event,
                    module: 'IDENTITY_ADMINISTRATION_CENTER',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    contractVersion: 'IDENTITY_CONTRACT_V1'
                });
            } catch (err) {
                console.warn("[IAC_AUDIT] No se pudo persistir evento de auditoría:", err);
            }
        }
    };

    global.IdentityAdministrationService = IdentityAdministrationService;
    global.identityAdministrationService = IdentityAdministrationService;

})(typeof window !== 'undefined' ? window : global);
