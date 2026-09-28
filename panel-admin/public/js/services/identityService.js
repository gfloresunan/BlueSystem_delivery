// Identity Service — BlueSystem Enterprise v2.2
// Capa de Servicios Canónica para Identity Lifecycle Management Engine
// Administra el ciclo de vida completo de la identidad, Custom Claims, Invitaciones y Sesiones

const identityService = {

    // ─── CONSULTAS DE IDENTIDAD & BUSQUEDA GLOBAL ─────────────────────────────

    // Normalización de Lectura de Identidad (Sin escrituras en Firestore)
    normalizeIdentity: (u) => {
        if (!u) return null;
        if (typeof CanonicalIdentityResolver !== 'undefined') {
            return CanonicalIdentityResolver.resolve(u);
        }
        if (typeof identityCanonicalService !== 'undefined' && identityCanonicalService.normalizeIdentity) {
            return identityCanonicalService.normalizeIdentity(u);
        }
        const docId = u.uid || u.id || '';
        const nombre = u.nombre || u.name || u.displayName || u.username || '';
        const effectiveName = String(nombre).trim() || 'Sin nombre';
        const email = u.email || u.mail || u.correo || '';
        const effectiveEmail = String(email).trim() || 'Sin correo';
        const phone = u.telefono || u.phone || u.phoneNumber || '';
        const effectivePhone = String(phone).trim() || 'N/A';
        const rawRole = u.role || u.eiamRole || u.rol || 'CLIENT';
        const canonicalRole = (typeof eiamAdapter !== 'undefined' && eiamAdapter.toEiamRole)
            ? eiamAdapter.toEiamRole(rawRole)
            : 'CLIENT';

        return {
            ...u,
            uid: docId,
            effectiveName,
            effectiveEmail,
            effectivePhone,
            role: canonicalRole,
            canonicalRole,
            status: u.isActive !== false ? 'ACTIVE' : 'BLOCKED',
            isActive: u.isActive !== false
        };
    },

    // Obtiene identidades unificadas de /users enriquecidas con datos de EIAM y normalizadas (Filtradas por población operacional)
    getIdentities: async (searchQuery = '', roleFilter = '', statusFilter = '', orgId = null) => {
        try {
            if (typeof db === 'undefined') return [];
            let snap = await db.collection('users').get();
            const list = [];

            snap.forEach(doc => {
                const rawData = { uid: doc.id, ...doc.data() };
                const u = identityService.normalizeIdentity(rawData);

                // Filtrar solo identidades operacionales si identityCanonicalService está disponible
                if (typeof identityCanonicalService !== 'undefined' && identityCanonicalService.isOperationalIdentity) {
                    if (!identityCanonicalService.isOperationalIdentity(u)) return;
                }

                let matchesQuery = true;
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    matchesQuery = u.effectiveName.toLowerCase().includes(q) ||
                                   u.effectiveEmail.toLowerCase().includes(q) ||
                                   u.effectivePhone.toLowerCase().includes(q) ||
                                   u.uid.toLowerCase().includes(q);
                }

                let matchesRole = true;
                if (roleFilter && roleFilter !== 'all') {
                    if (roleFilter === 'LEGACY_POS' || roleFilter === 'INCOMPLETE') {
                        matchesRole = u.identityType === roleFilter;
                    } else {
                        matchesRole = u.canonicalRole === roleFilter || u.rawRole === roleFilter || u.identityType === roleFilter;
                    }
                }

                let matchesStatus = true;
                if (statusFilter && statusFilter !== 'all') {
                    if (statusFilter === 'ACTIVE') matchesStatus = u.isActive !== false;
                    else if (statusFilter === 'SUSPENDED' || statusFilter === 'BLOCKED') matchesStatus = u.isActive === false;
                }

                if (matchesQuery && matchesRole && matchesStatus) {
                    list.push(u);
                }
            });

            // Ordenamiento en memoria por nombre efectivo ascendente
            list.sort((a, b) => a.effectiveName.localeCompare(b.effectiveName, 'es', { sensitivity: 'base' }));

            return list;
        } catch (e) {
            console.error("[IDENTITY_SERVICE] PERMISSION_DENIED al obtener identidades:", {
                code: e.code,
                message: e.message,
                collection: 'users',
                operation: 'getIdentities',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    // Suscripción Realtime a /users mediante listener reactivo unificado por Map<uid, identity> (Población Operacional)
    subscribeToIdentities: (onNext, onError) => {
        if (typeof identityCanonicalService !== 'undefined' && identityCanonicalService.subscribeToOperationalIdentities) {
            return identityCanonicalService.subscribeToOperationalIdentities(onNext, onError);
        }

        if (typeof db === 'undefined') {
            if (onNext) onNext([]);
            return () => {};
        }

        const identitiesMap = new Map();

        return db.collection('users').onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    identitiesMap.delete(docId);
                } else {
                    const norm = identityService.normalizeIdentity({ uid: docId, ...change.doc.data() });
                    if (['APP', 'ADMIN_PANEL', 'AFFILIATION'].includes(norm.identityOrigin)) {
                        identitiesMap.set(docId, norm);
                    } else {
                        identitiesMap.delete(docId);
                    }
                }
            });

            const list = Array.from(identitiesMap.values());
            list.sort((a, b) => a.effectiveName.localeCompare(b.effectiveName, 'es', { sensitivity: 'base' }));
            if (onNext) onNext(list);
        }, err => {
            console.error("[IDENTITY_SERVICE] Error en realtime listener /users:", err);
            if (onError) onError(err);
        });
    },

    // Obtiene el conjunto de datos 360° completo para una identidad única
    getIdentity360: async (uid) => {
        try {
            if (!uid || typeof db === 'undefined') return null;

            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) return null;
            const userData = { uid: userDoc.id, ...userDoc.data() };

            // Consultas concurrentes a colecciones relacionales EIAM
            const [empSnap, memSnap, devSnap, sessSnap, auditSnap, invSnap] = await Promise.all([
                db.collection('employees').where('uid', '==', uid).get().catch(() => null),
                db.collection('membership').where('uid', '==', uid).get().catch(() => null),
                db.collection('user_devices').where('uid', '==', uid).get().catch(() => null),
                db.collection('sessions').where('uid', '==', uid).get().catch(() => null),
                db.collection('audit_events').where('uid', '==', uid).limit(20).get().catch(() => null),
                db.collection('invitations').where('acceptedByUid', '==', uid).get().catch(() => null)
            ]);

            const employee = (empSnap && !empSnap.empty) ? { employeeId: empSnap.docs[0].id, ...empSnap.docs[0].data() } : null;
            const membership = (memSnap && !memSnap.empty) ? { membershipId: memSnap.docs[0].id, ...memSnap.docs[0].data() } : null;

            const devices = [];
            if (devSnap) devSnap.forEach(d => devices.push({ deviceId: d.id, ...d.data() }));

            const sessions = [];
            if (sessSnap) sessSnap.forEach(s => sessions.push({ sessionId: s.id, ...s.data() }));

            const auditEvents = [];
            if (auditSnap) {
                auditSnap.forEach(a => auditEvents.push({ eventId: a.id, ...a.data() }));
                auditEvents.sort((a, b) => {
                    const ta = a.timestamp ? (a.timestamp.seconds || a.timestamp) : 0;
                    const tb = b.timestamp ? (b.timestamp.seconds || b.timestamp) : 0;
                    return tb - ta;
                });
            }

            const invitations = [];
            if (invSnap) invSnap.forEach(i => invitations.push({ token: i.id, ...i.data() }));

            const rawRole = userData.eiamRole || userData.role || userData.rol || 'customer';
            const canonicalRole = (typeof eiamAdapter !== 'undefined' && eiamAdapter.toEiamRole)
                ? eiamAdapter.toEiamRole(rawRole)
                : 'customer';

            return {
                user: userData,
                employee,
                membership,
                devices,
                sessions,
                auditEvents,
                invitations,
                canonicalRole
            };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al obtener Identity 360°:", e);
            return null;
        }
    },

    // ─── ACCIONES CORPORATIVAS DE IDENTIDAD ──────────────────────────────────

    // Actualiza el rol EIAM y sincroniza en Dual-Write + Cloud Functions
    updateIdentityRole: async (uid, newEiamRole) => {
        try {
            if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.updateIdentityRole) {
                return await IdentityAdministrationService.updateIdentityRole(uid, newEiamRole);
            }

            // Fallback directo con EIAM Guard
            if (!uid) throw new Error("[IDENTITY_SERVICE] UID requerido");
            const userSnap = await db.collection('users').doc(uid).get().catch(() => null);
            if (!userSnap || !userSnap.exists) {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado updateIdentityRole: UID ${uid} no existe.`);
                throw new Error(`[EIAM_GUARD] Identidad '${uid}' no existe.`);
            }
            const userData = userSnap.data() || {};
            if (userData.isDeleted || userData.status === 'DELETED' || userData.lifecycleStatus === 'DEPROVISIONED') {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado updateIdentityRole: Identidad ${uid} está eliminada.`);
                throw new Error(`[EIAM_GUARD] Identidad '${uid}' ha sido eliminada.`);
            }

            const legacyRole = LegacyRoleAdapter.toLegacyString ? LegacyRoleAdapter.toLegacyString(newEiamRole) : 'customer';

            // Dual-Write Sync en /users/{uid}
            await db.collection('users').doc(uid).set({
                eiamRole: newEiamRole,
                role: legacyRole,
                rol: legacyRole,
                eiamRoleLevel: eiamAdapter.roles[newEiamRole] ? eiamAdapter.roles[newEiamRole].level : 1,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            if (typeof functionsService !== 'undefined' && functionsService.updateUser) {
                await functionsService.updateUser('setRole', uid, '', legacyRole);
            }

            await identityService.logAuditEvent(uid, 'ROLE_CHANGED', `Rol actualizado a ${newEiamRole}`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al actualizar rol de identidad:", e);
            throw e;
        }
    },

    // Transferir empleado a nueva sucursal / comercio
    transferEmployee: async (uid, businessId, branchId) => {
        try {
            if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.transferEmployee) {
                return await IdentityAdministrationService.transferEmployee(uid, businessId, branchId);
            }

            if (!uid) throw new Error("[IDENTITY_SERVICE] UID requerido");
            const userSnap = await db.collection('users').doc(uid).get().catch(() => null);
            if (!userSnap || !userSnap.exists) {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado transferEmployee: UID ${uid} no existe.`);
                throw new Error(`[EIAM_GUARD] Identidad '${uid}' no existe.`);
            }
            const userData = userSnap.data() || {};
            if (userData.isDeleted || userData.status === 'DELETED' || userData.lifecycleStatus === 'DEPROVISIONED') {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado transferEmployee: Identidad ${uid} está eliminada.`);
                throw new Error(`[EIAM_GUARD] Identidad '${uid}' ha sido eliminada.`);
            }

            const empSnap = await db.collection('employees').where('uid', '==', uid).get();
            if (!empSnap.empty) {
                const empId = empSnap.docs[0].id;
                await db.collection('employees').doc(empId).set({
                    businessId: businessId || null,
                    branchId: branchId || null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await db.collection('users').doc(uid).set({
                businessId: businessId || null,
                branchId: branchId || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await identityService.logAuditEvent(uid, 'BRANCH_TRANSFERRED', `Transferido a Comercio: ${businessId}, Sucursal: ${branchId}`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al transferir empleado:", e);
            throw e;
        }
    },

    // Cambiar estado de cuenta (Activar / Suspender / Bloquear)
    setIdentityStatus: async (uid, active) => {
        try {
            if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.setIdentityStatus) {
                return await IdentityAdministrationService.setIdentityStatus(uid, active);
            }

            if (!uid) throw new Error("[IDENTITY_SERVICE] UID requerido");
            const userSnap = await db.collection('users').doc(uid).get().catch(() => null);
            if (!userSnap || !userSnap.exists) {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado setIdentityStatus: UID ${uid} no existe.`);
                throw new Error(`[EIAM_GUARD] Identidad '${uid}' no existe.`);
            }
            const userData = userSnap.data() || {};
            if (userData.isDeleted || userData.status === 'DELETED' || userData.lifecycleStatus === 'DEPROVISIONED') {
                console.warn(`[EIAM_GUARD] [STALE_WRITE_BLOCKED] Abortado setIdentityStatus: Identidad ${uid} está eliminada.`);
                throw new Error(`[EIAM_GUARD] Identidad '${uid}' ha sido eliminada.`);
            }

            await db.collection('users').doc(uid).set({
                isActive: active,
                status: active ? 'ACTIVE' : 'BLOCKED',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            if (typeof functionsService !== 'undefined' && functionsService.updateUser) {
                await functionsService.updateUser('setBlockStatus', uid, '', '', !active);
            }

            await identityService.logAuditEvent(uid, active ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_SUSPENDED', `Estado cambiado a ${active ? 'ACTIVO' : 'BLOQUEADO'}`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al cambiar estado:", e);
            throw e;
        }
    },

    // Sincronizar Custom Claims JWT con Firebase Auth
    syncClaims: async (uid) => {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) throw new Error("Usuario no encontrado");
            const data = userDoc.data();
            const role = data.role || data.rol || 'customer';

            if (typeof functionsService !== 'undefined' && functionsService.updateUser) {
                await functionsService.updateUser('setRole', uid, '', role);
            }

            await identityService.logAuditEvent(uid, 'CLAIMS_SYNCED', 'Custom Claims resincronizados con Firebase Auth');
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al sincronizar claims:", e);
            throw e;
        }
    },

    // Revocar sesión remota
    revokeSession: async (sessionId, uid) => {
        try {
            await db.collection('sessions').doc(sessionId).delete();
            await identityService.logAuditEvent(uid, 'SESSION_REVOKED', `Sesión ${sessionId} revocada remotamente`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al revocar sesión:", e);
            throw e;
        }
    },

    // Revocar dispositivo confiable
    revokeDevice: async (deviceId, uid) => {
        try {
            if (typeof IdentityAdministrationService !== 'undefined') {
                return await IdentityAdministrationService.revokeDevice(deviceId, uid);
            }
            await db.collection('user_devices').doc(deviceId).set({
                isActive: false,
                isLocked: true,
                status: 'REVOKED',
                revokedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(() => null);

            await db.collection('devices').doc(deviceId).set({
                trusted: false,
                revokedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(() => null);

            await identityService.logAuditEvent(uid, 'DEVICE_REVOKED', `Dispositivo ${deviceId} marcado como no confiable`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al revocar dispositivo:", e);
            throw e;
        }
    },

    // ─── WORKFLOW DE INVITACIONES (STATE MACHINE) ────────────────────────────

    getInvitations: async () => {
        try {
            if (typeof db === 'undefined') return [];
            const snap = await db.collection('invitations').orderBy('createdAt', 'desc').get();
            const list = [];
            snap.forEach(doc => {
                list.push({ token: doc.id, ...doc.data() });
            });
            return list;
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al obtener invitaciones:", e);
            return [];
        }
    },

    createInvitation: async (invData) => {
        try {
            const token = 'inv_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
            const payload = {
                email: invData.email,
                telefono: invData.telefono || '',
                targetRole: invData.targetRole || 'CASHIER',
                businessId: invData.businessId || '',
                branchId: invData.branchId || '',
                orgId: invData.orgId || null,
                channel: invData.channel || 'EMAIL', // EMAIL | SMS | WHATSAPP | QR
                status: 'PENDING', // PENDING | SENT | VIEWED | ACCEPTED | EXPIRED | REVOKED
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: Date.now() + (72 * 60 * 60 * 1000) // 72 horas
            };

            await db.collection('invitations').doc(token).set(payload);
            return { success: true, token };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al crear invitación:", e);
            throw e;
        }
    },

    revokeInvitation: async (token) => {
        try {
            await db.collection('invitations').doc(token).set({
                status: 'REVOKED',
                revokedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al revocar invitación:", e);
            throw e;
        }
    },

    // ─── EMPLOYEES & STAFF ────────────────────────────────────────────────────

    getEmployees: async (businessId = null, orgId = null) => {
        try {
            if (typeof db === 'undefined') return [];
            let query = db.collection('employees');
            if (businessId && businessId !== 'all') query = query.where('businessId', '==', businessId);
            else if (orgId && orgId !== 'all') query = query.where('orgId', '==', orgId);
            const snap = await query.get();
            const list = [];
            snap.forEach(doc => {
                list.push({ employeeId: doc.id, ...doc.data() });
            });
            return list;
        } catch (e) {
            console.error("[IDENTITY_SERVICE] PERMISSION_DENIED al obtener empleados:", {
                code: e.code,
                message: e.message,
                collection: 'employees',
                operation: 'getEmployees',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    saveEmployee: async (empData) => {
        try {
            const employeeId = empData.employeeId || 'emp_' + Date.now();
            const payload = {
                nombre: empData.nombre || 'Empleado',
                email: empData.email || '',
                telefono: empData.telefono || '',
                uid: empData.uid || '',
                role: empData.role || 'CASHIER',
                businessId: empData.businessId || '',
                branchId: empData.branchId || '',
                orgId: empData.orgId || null,
                status: empData.status || 'ACTIVE',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('employees').doc(employeeId).set(payload, { merge: true });
            await identityService.logAuditEvent(empData.uid || employeeId, 'STAFF_SAVED', `Empleado ${empData.nombre} actualizado/creado`);
            return { success: true, employeeId };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al guardar empleado:", e);
            throw e;
        }
    },

    deleteEmployee: async (employeeId) => {
        try {
            await db.collection('employees').doc(employeeId).delete();
            await identityService.logAuditEvent(employeeId, 'STAFF_REMOVED', `Empleado ${employeeId} eliminado`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al eliminar empleado:", e);
            throw e;
        }
    },

    // ─── SESIONES ────────────────────────────────────────────────────────────

    getSessions: async () => {
        try {
            if (typeof db === 'undefined') return [];
            const snap = await db.collection('sessions').get();
            const list = [];
            snap.forEach(doc => {
                list.push({ sessionId: doc.id, ...doc.data() });
            });
            return list;
        } catch (e) {
            console.error("[IDENTITY_SERVICE] PERMISSION_DENIED al obtener sesiones:", {
                code: e.code,
                message: e.message,
                collection: 'sessions',
                operation: 'getSessions',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    revokeAllSessionsForUser: async (uid) => {
        try {
            const snap = await db.collection('sessions').where('uid', '==', uid).get();
            const batch = db.batch();
            snap.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            await identityService.logAuditEvent(uid, 'ALL_SESSIONS_REVOKED', `Todas las sesiones de ${uid} han sido revocadas.`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al revocar todas las sesiones:", e);
            throw e;
        }
    },

    // Obtiene dispositivos registrados desde la fuente canónica de producción /user_devices
    getDevices: async () => {
        try {
            if (typeof db === 'undefined') return [];
            const snap = await db.collection('user_devices').get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                const rawToken = data.fcmToken || '';
                const truncatedToken = rawToken.length > 16
                    ? `${rawToken.substring(0, 8)}...${rawToken.substring(rawToken.length - 6)}`
                    : (rawToken || 'Sin Token');
                list.push({
                    deviceId: doc.id,
                    uid: data.uid || doc.id,
                    truncatedToken,
                    trusted: data.isActive !== false && !data.isLocked,
                    ...data
                });
            });
            return list;
        } catch (e) {
            console.error("[IDENTITY_SERVICE] PERMISSION_DENIED al obtener dispositivos de /user_devices:", {
                code: e.code,
                message: e.message,
                collection: 'user_devices',
                operation: 'getDevices',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    // Suscripción Realtime a /user_devices
    subscribeToDevices: (onNext, onError) => {
        if (typeof db === 'undefined') {
            if (onNext) onNext([]);
            return () => {};
        }

        const devicesMap = new Map();

        return db.collection('user_devices').onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    devicesMap.delete(docId);
                } else {
                    const data = change.doc.data();
                    const rawToken = data.fcmToken || '';
                    const truncatedToken = rawToken.length > 16
                        ? `${rawToken.substring(0, 8)}...${rawToken.substring(rawToken.length - 6)}`
                        : (rawToken || 'Sin Token');
                    devicesMap.set(docId, {
                        deviceId: docId,
                        uid: data.uid || docId,
                        truncatedToken,
                        trusted: data.isActive !== false && !data.isLocked,
                        ...data
                    });
                }
            });

            const list = Array.from(devicesMap.values());
            if (onNext) onNext(list);
        }, err => {
            console.error("[IDENTITY_SERVICE] Error en realtime listener /user_devices:", err);
            if (onError) onError(err);
        });
    },

    toggleDeviceLock: async (deviceId, isLocked, uid = '') => {
        try {
            await db.collection('devices').doc(deviceId).set({
                trusted: !isLocked,
                isLocked: !!isLocked,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            await identityService.logAuditEvent(uid || deviceId, isLocked ? 'DEVICE_LOCKED' : 'DEVICE_UNLOCKED', `Dispositivo ${deviceId} ${isLocked ? 'bloqueado' : 'desbloqueado'}`);
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al cambiar estado de dispositivo:", e);
            throw e;
        }
    },

    deleteDevice: async (deviceId) => {
        try {
            await db.collection('devices').doc(deviceId).delete();
            return { success: true };
        } catch (e) {
            console.error("[IDENTITY_SERVICE] Error al eliminar dispositivo:", e);
            throw e;
        }
    },

    // ─── EVENTOS & AUDITORIA ──────────────────────────────────────────────────

    getAuditEvents: async (domainFilter = 'all', searchQuery = '', limitCount = 50) => {
        try {
            if (typeof db === 'undefined') return [];
            let query = db.collection('audit_events').orderBy('timestamp', 'desc').limit(limitCount);
            if (domainFilter && domainFilter !== 'all') {
                query = db.collection('audit_events').where('domain', '==', domainFilter).orderBy('timestamp', 'desc').limit(limitCount);
            }
            const snap = await query.get();
            const list = [];
            snap.forEach(doc => {
                const item = { eventId: doc.id, ...doc.data() };
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const match = (item.eventType || '').toLowerCase().includes(q) ||
                                  (item.description || '').toLowerCase().includes(q) ||
                                  (item.uid || '').toLowerCase().includes(q) ||
                                  (item.domain || '').toLowerCase().includes(q);
                    if (match) list.push(item);
                } else {
                    list.push(item);
                }
            });
            return list;
        } catch (e) {
            console.error("[IDENTITY_SERVICE] PERMISSION_DENIED al obtener audit_events:", {
                code: e.code,
                message: e.message,
                collection: 'audit_events',
                operation: 'getAuditEvents',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    // ─── EIAM-ADMIN — Estado Canónico y Auditoría Administrativa ─────────────

    // Resuelve el estado efectivo de una identidad desde múltiples campos Firestore.
    // Elimina el bug de "undefined" en la UI cuando no existe campo status explícito.
    getEffectiveUserStatus: (u) => {
        if (!u) return 'UNKNOWN';
        // Prioridad 1: campo status explícito con valor canónico EIAM
        const canonicalStatuses = ['ACTIVE', 'BLOCKED', 'SUSPENDED', 'PENDING', 'DISABLED'];
        if (u.status && canonicalStatuses.includes(String(u.status).toUpperCase())) {
            return String(u.status).toUpperCase();
        }
        // Prioridad 2: campo isActive booleano
        if (u.isActive === false || u.active === false) return 'BLOCKED';
        if (u.isActive === true || u.active === true) return 'ACTIVE';
        // Fallback seguro: sin campo status ni isActive → asumir ACTIVE
        return 'ACTIVE';
    },

    // Escribe un evento de auditoría estructurado EIAM-ADMIN en /audit_events.
    // Contrato de audit: actorUid, actorRole, targetUid, action, before, after, timestamp, reason.
    // SEGURIDAD: Jamás incluir contraseñas en before/after.
    logAdminAudit: async (params) => {
        try {
            if (typeof db === 'undefined') return;
            const actor = firebase.auth().currentUser;
            const actorRole = (window.AuthReadyGate && window.AuthReadyGate.claims)
                ? (window.AuthReadyGate.claims.role || 'admin')
                : 'admin';
            await db.collection('audit_events').add({
                action: params.action,
                domain: 'IDENTITY_ADMIN',
                actorUid: actor ? actor.uid : 'system',
                actorRole,
                targetUid: params.targetUid || '',
                before: params.before || {},
                after: params.after || {},
                reason: params.reason || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn('[IDENTITY_SERVICE] No se pudo guardar admin audit event:', e);
        }
    },

    // ─── TIMELINE UNIFICADO DE AUDITORIA ────────────────────────────────────

    logAuditEvent: async (uid, eventType, description, domain = 'SECURITY') => {
        try {
            if (typeof db === 'undefined') return;
            await db.collection('audit_events').add({
                uid,
                eventType,
                domain,
                description,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                executorUid: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'system'
            });
        } catch (e) {
            console.warn("[IDENTITY_SERVICE] No se pudo guardar audit event:", e);
        }
    }
};

window.identityService = identityService;

