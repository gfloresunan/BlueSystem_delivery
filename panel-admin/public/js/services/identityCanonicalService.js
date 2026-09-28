// identityCanonicalService.js — BlueSystem Enterprise v2.2
// Servicio Canónico Resolver de Identidades Operacionales y Ciclo de Vida Definitivo
// Garantiza la alineación 100% entre Usuarios & Roles y Governance Center

const identityCanonicalService = {

    // ─── CLASIFICACIÓN Y RESOLVER CANÓNICO ────────────────────────────────────

    // Normaliza cualquier documento de usuario al modelo canónico
    normalizeIdentity: (u) => {
        if (!u) return null;
        if (typeof CanonicalIdentityResolver !== 'undefined') {
            return CanonicalIdentityResolver.resolve(u);
        }

        const uid = u.uid || u.id || '';
        const nombre = (u.nombre || u.name || u.displayName || u.username || '').trim() || 'Sin nombre';
        const email = (u.email || u.mail || u.correo || '').trim() || 'Sin correo';
        const phone = (u.telefono || u.phone || u.phoneNumber || '').trim() || 'N/A';
        const rawRole = u.role || u.eiamRole || u.rol || 'undefined';
        const canonicalRole = (typeof eiamAdapter !== 'undefined' && eiamAdapter.toEiamRole)
            ? eiamAdapter.toEiamRole(rawRole)
            : 'CLIENT';

        return {
            ...u,
            uid,
            effectiveName: nombre,
            effectiveEmail: email,
            effectivePhone: phone,
            rawRole,
            canonicalRole,
            role: canonicalRole,
            status: u.isActive !== false ? 'ACTIVE' : 'BLOCKED',
            isActive: u.isActive !== false,
            identityOrigin: u.identityOrigin || u.createdVia || 'UNKNOWN'
        };
    },

    // Determina si una identidad pertenece a la población operacional canónica actual (APP + ADMIN_PANEL + AFFILIATION)
    isOperationalIdentity: (user) => {
        if (!user) return false;
        if (typeof CanonicalIdentityResolver !== 'undefined') {
            return CanonicalIdentityResolver.isOperationalIdentity(user);
        }
        const norm = identityCanonicalService.normalizeIdentity(user);
        const origin = norm.identityOrigin || 'UNKNOWN';

        // Población Operacional Canónica: APP, ADMIN_PANEL, AFFILIATION
        return ['APP', 'ADMIN_PANEL', 'AFFILIATION'].includes(origin);
    },

    // Determina el origen oficial evidenciado
    getIdentitySource: (user) => {
        if (!user) return 'UNKNOWN';
        const norm = identityCanonicalService.normalizeIdentity(user);
        return norm.identityOrigin || 'UNKNOWN';
    },

    // ─── SUSCRIPCIONES REALTIME RECONCILIADAS (docChanges) ───────────────────

    // Suscripción Realtime a Identidades Operacionales Canónicas (Users & Roles = Governance Center)
    subscribeToOperationalIdentities: (onNext, onError) => {
        if (typeof db === 'undefined') {
            if (onNext) onNext([]);
            return () => {};
        }

        const opMap = new Map();

        return db.collection('users').onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    opMap.delete(docId);
                } else {
                    const norm = identityCanonicalService.normalizeIdentity({ uid: docId, ...change.doc.data() });
                    if (identityCanonicalService.isOperationalIdentity(norm)) {
                        opMap.set(docId, norm);
                    } else {
                        opMap.delete(docId);
                    }
                }
            });

            const list = Array.from(opMap.values());
            list.sort((a, b) => a.effectiveName.localeCompare(b.effectiveName, 'es', { sensitivity: 'base' }));
            if (onNext) onNext(list);
        }, err => {
            console.error("[IDENTITY_CANONICAL_SERVICE] Error en listener de identidades operacionales:", err);
            if (onError) onError(err);
        });
    },

    // Suscripción Realtime a Registros No Operacionales / Legacy POS / Unknown
    subscribeToNonOperationalIdentities: (onNext, onError) => {
        if (typeof db === 'undefined') {
            if (onNext) onNext([]);
            return () => {};
        }

        const nonOpMap = new Map();

        return db.collection('users').onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    nonOpMap.delete(docId);
                } else {
                    const norm = identityCanonicalService.normalizeIdentity({ uid: docId, ...change.doc.data() });
                    if (!identityCanonicalService.isOperationalIdentity(norm)) {
                        nonOpMap.set(docId, norm);
                    } else {
                        nonOpMap.delete(docId);
                    }
                }
            });

            const list = Array.from(nonOpMap.values());
            list.sort((a, b) => a.effectiveName.localeCompare(b.effectiveName, 'es', { sensitivity: 'base' }));
            if (onNext) onNext(list);
        }, err => {
            console.error("[IDENTITY_CANONICAL_SERVICE] Error en listener de identidades no operacionales:", err);
            if (onError) onError(err);
        });
    },

    // Suscripción Realtime a TODAS las identidades físicamente existentes en /users (41)
    subscribeToAllIdentities: (onNext, onError) => {
        if (typeof db === 'undefined') {
            if (onNext) onNext([]);
            return () => {};
        }

        const allMap = new Map();

        return db.collection('users').onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const docId = change.doc.id;
                if (change.type === 'removed') {
                    allMap.delete(docId);
                } else {
                    const norm = identityCanonicalService.normalizeIdentity({ uid: docId, ...change.doc.data() });
                    allMap.set(docId, norm);
                }
            });

            const list = Array.from(allMap.values());
            list.sort((a, b) => a.effectiveName.localeCompare(b.effectiveName, 'es', { sensitivity: 'base' }));
            if (onNext) onNext(list);
        }, err => {
            console.error("[IDENTITY_CANONICAL_SERVICE] Error en listener de todas las identidades:", err);
            if (onError) onError(err);
        });
    },

    // ─── OPERACIONES DE ELIMINACIÓN REAL (HARD DELETE VS SOFT DELETE) ─────────

    // Desactivación Lógica (Soft Delete)
    deactivateIdentity: async (uid, reason = 'Administrativo') => {
        if (!uid || typeof db === 'undefined') throw new Error('UID de identidad no válido');
        await db.collection('users').doc(uid).set({
            isActive: false,
            active: false,
            status: 'BLOCKED',
            lifecycleStatus: 'DEACTIVATED',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await db.collection('audit_events').add({
            event: 'IDENTITY_DEACTIVATED',
            domain: 'GOVERNANCE',
            targetUid: uid,
            reason,
            actorUid: (firebase.auth().currentUser || {}).uid || 'admin',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, mode: 'SOFT_DELETE' };
    },

    // Eliminación Definitiva Real (Hard Delete)
    deleteIdentityPermanently: async (uid, options = {}) => {
        if (!uid || typeof db === 'undefined') throw new Error('UID de identidad no válido');
        const currentUser = firebase.auth().currentUser;
        const actorUid = currentUser ? currentUser.uid : 'admin';

        // 1. Obtener datos previos para validación de seguridad y auditoría (si el documento existe)
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const effectiveName = userData.nombre || userData.name || userData.displayName || uid;

        // 2. Comprobar protección contra eliminación accidental si es propietario de un comercio activo
        if (userData.businessId && !options.overrideSafety) {
            const bizDoc = await db.collection('businesses').doc(userData.businessId).get();
            if (bizDoc.exists && (bizDoc.data().active !== false && bizDoc.data().status !== 'DELETED')) {
                throw new Error(`Protección activada: La identidad ${effectiveName} es propietaria del comercio activo ${bizDoc.data().name || userData.businessId}. Desasigne el comercio primero.`);
            }
        }

        // 3. Ejecutar Hard Delete mediante Cloud Function segura en navegador (o Admin SDK en servidor)
        let cfResult = null;

        if (typeof functionsService !== 'undefined' && functionsService.updateUser) {
            cfResult = await functionsService.updateUser('deleteUser', uid);
        } else {
            // Entorno Node / Fallback directo
            await db.collection('users').doc(uid).delete();
            try {
                const devsSnap = await db.collection('user_devices').where('uid', '==', uid).get();
                if (!devsSnap.empty) {
                    const batch = db.batch();
                    devsSnap.forEach(dDoc => batch.delete(dDoc.ref));
                    await batch.commit();
                }
            } catch (e) {
                console.warn(`[HARD_DELETE] Limpieza parcial de dispositivos para ${uid}:`, e.message);
            }

            await db.collection('audit_events').add({
                event: 'IDENTITY_HARD_DELETE',
                domain: 'GOVERNANCE',
                targetUid: uid,
                targetName: effectiveName,
                actorUid,
                identityType: 'FIRESTORE_ONLY',
                authDeleted: false,
                authDeletion: 'NOT_APPLICABLE',
                firestoreDeleted: true,
                historicalDataPreserved: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            cfResult = {
                success: true,
                uid,
                identityType: 'FIRESTORE_ONLY',
                authDeleted: false,
                authDeletion: 'NOT_APPLICABLE',
                firestoreDeleted: true,
                devicesDeleted: true,
                result: 'FIRESTORE_ONLY_HARD_DELETE_SUCCESS'
            };
        }

        console.log(`[HARD_DELETE] Identidad ${uid} (${effectiveName}) procesada exitosamente (${cfResult.identityType || 'HARD_DELETE'}).`);
        return cfResult || { success: true, mode: 'HARD_DELETE', targetUid: uid };
    },

    // Eliminación Definitiva Real de Comercio (Hard Delete Business)
    deleteBusinessPermanently: async (businessId, options = {}) => {
        if (!businessId || typeof db === 'undefined') throw new Error('ID de comercio no válido');
        const currentUser = firebase.auth().currentUser;
        const actorUid = currentUser ? currentUser.uid : 'admin';

        // 1. Validar existencia del comercio
        const bizDoc = await db.collection('businesses').doc(businessId).get();
        if (!bizDoc.exists) {
            throw new Error(`El comercio ${businessId} no existe en Firestore`);
        }

        const bizData = bizDoc.data();
        const bizName = bizData.name || bizData.comercioNombre || businessId;

        // 2. Validar que no existan pedidos activos pendientes
        const activeOrders = await db.collection('orders')
            .where('businessId', '==', businessId)
            .where('status', 'in', ['PENDING', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'ON_THE_WAY'])
            .get().catch(() => null);

        if (activeOrders && !activeOrders.empty && !options.overrideSafety) {
            throw new Error(`No se puede eliminar el comercio ${bizName}: Posee ${activeOrders.size} pedidos activos en curso.`);
        }

        // 3. Eliminar sucursales asociadas en /branches
        try {
            const branchSnap = await db.collection('branches').where('businessId', '==', businessId).get();
            const batch = db.batch();
            branchSnap.forEach(bDoc => batch.delete(bDoc.ref));
            if (!branchSnap.empty) await batch.commit();
        } catch (e) {
            console.warn(`[HARD_DELETE] Limpieza parcial de sucursales para ${businessId}:`, e.message);
        }

        // 4. Hard Delete físico del comercio en /businesses y actualización en /users
        await db.collection('businesses').doc(businessId).delete();
        await db.collection('users').doc(businessId).set({
            active: false,
            isActive: false,
            status: 'DELETED',
            lifecycleStatus: 'DEPROVISIONED',
            isDeleted: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => null);

        // 5. Registrar evento de auditoría
        await db.collection('audit_events').add({
            event: 'BUSINESS_HARD_DELETE',
            domain: 'GOVERNANCE',
            targetBusinessId: businessId,
            targetBusinessName: bizName,
            actorUid,
            historicalDataPreserved: true,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[HARD_DELETE] Comercio ${businessId} (${bizName}) eliminado permanentemente de Firestore.`);
        return { success: true, mode: 'HARD_DELETE', targetBusinessId: businessId };
    }
};

if (typeof window !== 'undefined') {
    window.identityCanonicalService = identityCanonicalService;
}
