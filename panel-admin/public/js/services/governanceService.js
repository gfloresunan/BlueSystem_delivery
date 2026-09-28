// Governance Service — BlueSystem Delivery Enterprise v2.2
// Capa de Servicios Desacoplada (Clean Architecture) para Governance Center
// Aísla completamente la UI (governanceCenter.js) de las llamadas directas a Firestore.

const governanceService = {

    // ─── ORGANIZATIONS (EMPRESAS / TENANTS) ───────────────────────────────────

    // Obtiene todas las empresas registradas
    getOrganizations: async () => {
        try {
            if (typeof db === 'undefined') return [];
            const snap = await db.collection('organizations').orderBy('nombre', 'asc').get();
            const list = [];
            snap.forEach(doc => {
                list.push({ orgId: doc.id, ...doc.data() });
            });

            // No inyectar organizaciones ficticias: si la BD no tiene registros, retornar lista vacía (UNKNOWN / Sin Holding)
            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] PERMISSION_DENIED al obtener organizaciones:", {
                code: e.code,
                message: e.message,
                collection: 'organizations',
                operation: 'getOrganizations',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    // Guardar o actualizar empresa
    saveOrganization: async (orgData) => {
        try {
            const orgId = orgData.orgId || 'org_' + Date.now();
            const payload = {
                nombre: orgData.nombre || 'Nueva Empresa',
                ownerUid: orgData.ownerUid || 'admin',
                status: orgData.status || 'ACTIVE',
                plan: orgData.plan || 'Enterprise',
                contactoEmail: orgData.contactoEmail || '',
                contactoTelefono: orgData.contactoTelefono || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!orgData.orgId) {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            await db.collection('organizations').doc(orgId).set(payload, { merge: true });
            return { success: true, orgId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al guardar organización:", e);
            throw e;
        }
    },

    // ─── BUSINESSES (COMERCIOS / MARCAS) ──────────────────────────────────────

    // Obtiene todos los comercios, opcionalmente filtrados por orgId (Multi-Tenant)
    // Realtime Subscription Canónica a Comercios (/businesses)
    subscribeToBusinesses: (callback, orgId = 'all', includeDeleted = false) => {
        if (typeof commerceSyncService !== 'undefined' && commerceSyncService.subscribeToBusinesses) {
            return commerceSyncService.subscribeToBusinesses(callback, orgId, includeDeleted);
        }
        if (typeof db === 'undefined') return () => {};
        let query = db.collection('businesses');
        if (orgId && orgId !== 'all') {
            query = query.where('orgId', '==', orgId);
        }
        return query.onSnapshot(snap => {
            const list = [];
            snap.forEach(doc => {
                const data = doc.data() || {};
                const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.lifecycleStatus === 'DEPROVISIONED' || data.isDeleted === true || data.active === false;
                if (isDeleted && !includeDeleted) return;

                const canonicalName = data.name || data.comercioNombre || data.businessName || data.nombre || 'Comercio Sin Nombre';
                list.push({
                    businessId: doc.id,
                    id: doc.id,
                    ...data,
                    name: canonicalName,
                    comercioNombre: canonicalName,
                    orgId: data.orgId || null,
                    source: data.source || (data.applicationId ? 'ADR_011' : 'DIRECT_ADMIN'),
                    status: data.status || 'ACTIVE'
                });
            });
            if (typeof callback === 'function') callback(list);
        }, err => {
            console.error("[GOVERNANCE_SERVICE] Error en Realtime Businesses Listener:", err);
        });
    },

    // Obtiene todos los comercios (Fuente Canónica: /businesses)
    getBusinesses: async (orgId = null, includeDeleted = false) => {
        try {
            if (typeof db === 'undefined') return [];
            let query = db.collection('businesses');
            if (orgId && orgId !== 'all') {
                query = query.where('orgId', '==', orgId);
            }
            const snap = await query.get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.lifecycleStatus === 'DEPROVISIONED' || data.isDeleted === true || data.active === false;
                if (isDeleted && !includeDeleted) return;

                const canonicalName = data.name || data.comercioNombre || data.businessName || data.nombre || 'Comercio Sin Nombre';
                list.push({
                    businessId: doc.id,
                    id: doc.id,
                    ...data,
                    name: canonicalName, // FUENTE CANÓNICA
                    comercioNombre: canonicalName, // retrocompatibilidad para UI legacy
                    orgId: data.orgId || null,
                    source: data.source || (data.applicationId ? 'ADR_011' : 'DIRECT_ADMIN'),
                    status: data.status || 'ACTIVE'
                });
            });

            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] PERMISSION_DENIED al obtener comercios:", {
                code: e.code,
                message: e.message,
                collection: 'businesses',
                operation: 'getBusinesses',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    // Guardar o actualizar comercio (Vía commerceSyncService Canónico)
    saveBusiness: async (bizData, contextOptions = {}) => {
        try {
            const businessId = bizData.businessId || null;
            const canonicalName = bizData.name || bizData.comercioNombre || bizData.nombre || 'Nuevo Comercio';
            
            const syncPayload = {
                name: canonicalName,
                category: bizData.categoria || bizData.category || 'Restaurante',
                email: bizData.email || bizData.contactoEmail || '',
                phone: bizData.telefono || bizData.phone || '',
                address: bizData.direccion || bizData.address || '',
                description: bizData.descripcion || bizData.description || '',
                deliveryFee: bizData.deliveryFee || bizData.costoEnvioBase || 35,
                prepTime: bizData.avgPrepTimeMinutes || bizData.tiempoEstimadoMinutos || 15,
                isOpen: bizData.isOpen !== false,
                isActive: bizData.status !== 'DELETED' && bizData.status !== 'INACTIVE',
                orgId: bizData.orgId || null,
                tenantId: bizData.tenantId || null,
                brandId: bizData.brandId || null
            };

            const actorUid = contextOptions.actorUid || 
                (window.AuthReadyGate && window.AuthReadyGate.user ? window.AuthReadyGate.user.uid : null) ||
                (typeof firebase !== 'undefined' && firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
            const actorRole = contextOptions.actorRole ||
                (window.AuthReadyGate && window.AuthReadyGate.role) || 'ADMIN';

            const opts = {
                actorUid,
                actorRole,
                orgId: bizData.orgId || null,
                tenantId: bizData.tenantId || null,
                brandId: bizData.brandId || null,
                branchId: bizData.branchId || null,
                membershipId: bizData.membershipId || null
            };

            if (typeof commerceSyncService !== 'undefined' && commerceSyncService.saveStoreAtomic) {
                const resId = await commerceSyncService.saveStoreAtomic(businessId, syncPayload, opts);
                return { success: true, businessId: resId };
            }

            const targetId = businessId || 'biz_' + Date.now();
            const payload = {
                businessId: targetId,
                id: targetId,
                name: canonicalName,
                comercioNombre: canonicalName,
                orgId: bizData.orgId || null,
                categoria: bizData.categoria || 'Restaurante',
                status: bizData.status || 'ACTIVE',
                lifecycleStatus: bizData.lifecycleStatus || 'ACTIVE',
                active: bizData.status !== 'DELETED' && bizData.status !== 'INACTIVE',
                isActive: bizData.status !== 'DELETED' && bizData.status !== 'INACTIVE',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (bizData.tenantId) payload.tenantId = bizData.tenantId;
            if (bizData.brandId) payload.brandId = bizData.brandId;

            await db.collection('businesses').doc(targetId).set(payload, { merge: true });
            return { success: true, businessId: targetId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al guardar comercio:", e);
            throw e;
        }
    },

    // ─── BRANCHES (SUCURSALES / PUNTOS GPS) ────────────────────────────────────

    // Obtiene sucursales con resolución de Comercio Relacionado
    getBranches: async (businessId = null, orgId = null, includeDeleted = false) => {
        try {
            if (typeof db === 'undefined') return [];
            let query = db.collection('branches');
            if (businessId && businessId !== 'all') {
                query = query.where('businessId', '==', businessId);
            } else if (orgId && orgId !== 'all') {
                query = query.where('orgId', '==', orgId);
            }
            const snap = await query.get();

            // Cargar comercios en memoria para resolver nombre del comercio relacionado
            const bizList = await governanceService.getBusinesses('all', true).catch(() => []);
            const bizMap = {};
            bizList.forEach(b => { bizMap[b.businessId] = b.name; });

            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                const isDeleted = data.status === 'DELETED' || data.active === false || !data.businessId;
                if (isDeleted && !includeDeleted) return;

                // Fuente Canónica: data.name | Fallback Legacy
                const canonicalName = data.name || data.nombre || data.branchName || 'Sucursal Sin Nombre';
                const parentBizName = bizMap[data.businessId] || 'Comercio Sin Asignar';

                list.push({
                    branchId: doc.id,
                    ...data,
                    name: canonicalName, // FUENTE CANÓNICA
                    nombre: canonicalName, // retrocompatibilidad UI
                    businessName: parentBizName,
                    comercioNombre: parentBizName,
                    orgId: data.orgId || null,
                    status: data.status || 'OPERATIONAL'
                });
            });
            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] PERMISSION_DENIED al obtener sucursales:", {
                code: e.code,
                message: e.message,
                collection: 'branches',
                operation: 'getBranches',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    // Guardar o actualizar sucursal (Escribe estrictamente el esquema canónico 'name')
    saveBranch: async (branchData) => {
        try {
            const branchId = branchData.branchId || 'br_' + Date.now();
            const canonicalName = branchData.name || branchData.nombre || 'Sucursal Principal';
            const payload = {
                name: canonicalName, // FUENTE CANÓNICA
                nombre: canonicalName, // retrocompatibilidad
                businessId: branchData.businessId || '',
                orgId: branchData.orgId || null,
                managerUid: branchData.managerUid || '',
                direccion: branchData.direccion || '',
                telefono: branchData.telefono || '',
                locationGPS: branchData.locationGPS || { lat: 12.136389, lng: -86.251389 },
                radioCoberturaKm: parseFloat(branchData.radioCoberturaKm || 5),
                capacidadCocinaMax: parseInt(branchData.capacidadCocinaMax || 50),
                status: branchData.status || 'OPERATIONAL',
                active: branchData.status !== 'DELETED',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('branches').doc(branchId).set(payload, { merge: true });
            return { success: true, branchId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al guardar sucursal:", e);
            throw e;
        }
    },

    // ─── METRICAS CONSOLIDADAS DE GOBERNANZA ─────────────────────────────────

    getConsolidatedMetrics: async (orgId = null) => {
        try {
            const [orgs, bizs, branches] = await Promise.all([
                governanceService.getOrganizations(),
                governanceService.getBusinesses(orgId),
                governanceService.getBranches(null, orgId)
            ]);

            let totalUsers = 0;
            let totalEmployees = 0;
            let totalInvitations = 0;

            if (typeof db !== 'undefined') {
                const [uSnap, eSnap, iSnap] = await Promise.all([
                    db.collection('users').get().catch(() => ({ size: 0 })),
                    db.collection('employees').get().catch(() => ({ size: 0 })),
                    db.collection('invitations').get().catch(() => ({ size: 0 }))
                ]);
                totalUsers = uSnap.size || 0;
                totalEmployees = eSnap.size || 0;
                totalInvitations = iSnap.size || 0;
            }

            return {
                totalOrganizations: orgs.length,
                totalBusinesses: bizs.length,
                activeBusinesses: bizs.filter(b => b.status === 'ACTIVE' || b.active !== false).length,
                totalBranches: branches.length,
                totalUsers,
                totalEmployees,
                pendingInvitations: totalInvitations,
                openRisks: 0
            };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al calcular métricas consolidadas:", e);
            return {
                totalOrganizations: 0, totalBusinesses: 0, activeBusinesses: 0,
                totalBranches: 0, totalUsers: 0, totalEmployees: 0, pendingInvitations: 0, openRisks: 0
            };
        }
    },

    // ─── MERCHANT APPLICATIONS (SOLICITUDES DE AFILIACIÓN — ADR-011 & TENANT ISOLATION) ─

    getMerchantApplications: async (statusFilter = 'all', tenantId = null) => {
        try {
            if (typeof db === 'undefined') return [];

            // Sincronización con AuthReadyGate si aún no está inicializado
            if (window.AuthReadyGate && !window.AuthReadyGate.isReady && window.AuthReadyGate.waitUntilReady) {
                await window.AuthReadyGate.waitUntilReady();
            }

            let query = db.collection('merchant_applications');
            
            // Resolución de Tenant Context para aislamiento multi-inquilino
            const claims = (window.AuthReadyGate && window.AuthReadyGate.claims) || {};
            const rawRole = (claims.role || claims.eiamRole || (window.AuthReadyGate && window.AuthReadyGate.role) || '').toString().toUpperCase();
            const isPlatformAdmin = (window.AuthReadyGate && window.AuthReadyGate.isPlatformAdmin === true) ||
                ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT', 'SUPERVISOR', 'OPERATOR', 'OPERATIONS'].includes(rawRole) ||
                claims.admin === true ||
                claims.isSuperAdmin === true ||
                claims.isPlatformAdmin === true;

            let activeTenantId = null;
            if (tenantId && tenantId !== 'all') {
                activeTenantId = tenantId;
            } else if (!isPlatformAdmin) {
                activeTenantId = claims.tenantId || null;
            }

            if (activeTenantId && activeTenantId !== 'all') {
                query = query.where('tenantId', '==', activeTenantId);
            }

            if (statusFilter && statusFilter !== 'all') {
                query = query.where('status', '==', statusFilter);
            }
            const snap = await query.get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({
                    ...data,
                    firestoreDocId: doc.id,
                    appId: data.appId || data.applicationId || doc.id,
                    applicationId: data.applicationId || data.appId || doc.id,
                    tenantId: data.tenantId || 'ten_bluesystem_core',
                    documents: Array.isArray(data.documents) ? data.documents : []
                });
            });
            list.sort((a, b) => {
                const tA = a.createdAt ? (a.createdAt.seconds || 0) : 0;
                const tB = b.createdAt ? (b.createdAt.seconds || 0) : 0;
                return tB - tA;
            });
            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] PERMISSION_DENIED al obtener solicitudes de afiliación:", {
                code: e.code,
                message: e.message,
                collection: 'merchant_applications',
                operation: 'getMerchantApplications',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    getMerchantApplicationById: async (firestoreDocId) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de documento Firestore no válido.");
        }
        try {
            const doc = await db.collection('merchant_applications').doc(firestoreDocId).get();
            if (!doc.exists) throw new Error("La solicitud no existe en el sistema.");
            const data = doc.data();
            return {
                ...data,
                firestoreDocId: doc.id,
                appId: data.appId || data.applicationId || doc.id,
                applicationId: data.applicationId || data.appId || doc.id,
                documents: Array.isArray(data.documents) ? data.documents : []
            };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al obtener solicitud por ID:", e);
            throw e;
        }
    },

    // Aprobación Canónica EIAM (Single Authority: Admin actualiza status -> Trigger Cloud Function aprovisiona)
    approveMerchantApplication: async (firestoreDocId, adminUid = null) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('merchant_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            if (!appDoc.exists) throw new Error("La solicitud de comercio no existe en Firestore.");
            const appData = appDoc.data();

            if (appData.status === 'APPROVED' || appData.status === 'ONBOARDING' || appData.status === 'ACTIVE') {
                throw new Error("Esta solicitud ya fue aprobada previamente.");
            }

            // ÚNICA AUTORIDAD (GAP-02 Solved):
            // Solo actualizamos /merchant_applications a status = 'APPROVED'.
            // El trigger Cloud Function 'onMerchantApplicationApproved' ejecuta el aprovisionamiento atómico EIAM:
            // Auth User + Organizations + Businesses + Branches + Restaurant Settings + Membership + Claims + Emails + Audit.
            await appRef.update({
                status: 'APPROVED',
                reviewedBy: currentAdminUid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registro de evento de auditoría
            try {
                await governanceService.logAuditEvent('MERCHANT_APPLICATION_APPROVED', {
                    applicationId: appData.appId || appData.applicationId || firestoreDocId,
                    businessName: appData.businessName,
                    email: appData.email,
                    reviewedBy: currentAdminUid
                });
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al aprobar solicitud de comercio:", e);
            throw e;
        }
    },

    rejectMerchantApplication: async (firestoreDocId, reason, adminUid = null) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        if (!reason || reason.trim() === '') {
            throw new Error("Se requiere especificar el motivo del rechazo.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('merchant_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            const appData = appDoc.exists ? appDoc.data() : {};

            await appRef.update({
                status: 'REJECTED',
                rejectionReason: reason.trim(),
                reviewedBy: currentAdminUid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registro de evento de auditoría
            try {
                await governanceService.logAuditEvent('MERCHANT_APPLICATION_REJECTED', {
                    applicationId: appData.appId || appData.applicationId || firestoreDocId,
                    businessName: appData.businessName,
                    reason: reason.trim(),
                    reviewedBy: currentAdminUid
                });
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al rechazar solicitud de comercio:", e);
            throw e;
        }
    },

    requestDocsMerchantApplication: async (firestoreDocId, note, adminUid = null) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        if (!note || note.trim() === '') {
            throw new Error("Se requiere especificar la nota o documentos solicitados.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('merchant_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            const appData = appDoc.exists ? appDoc.data() : {};

            await appRef.update({
                status: 'DOCS_REQUESTED',
                docsRequestedNote: note.trim(),
                reviewedBy: currentAdminUid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registro de evento de auditoría
            try {
                await governanceService.logAuditEvent('DOCUMENT_REQUESTED', {
                    applicationId: appData.appId || appData.applicationId || firestoreDocId,
                    businessName: appData.businessName,
                    docsRequestedNote: note.trim(),
                    reviewedBy: currentAdminUid
                });
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al solicitar documentos:", e);
            throw e;
        }
    },

    // Actualiza el estado de revisión de un documento individual (APPROVED / REJECTED)
    updateApplicationDocumentStatus: async (firestoreDocId, storagePath, newStatus, reason = null, adminUid = null) => {
        if (!firestoreDocId || !storagePath || !['APPROVED', 'REJECTED', 'PENDING_REVIEW'].includes(newStatus)) {
            throw new Error("[GOVERNANCE_SERVICE] Parámetros no válidos para actualización de documento.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('merchant_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            if (!appDoc.exists) throw new Error("La solicitud no existe en Firestore.");
            const appData = appDoc.data();
            const documents = Array.isArray(appData.documents) ? [...appData.documents] : [];

            let matchedDoc = null;
            const updatedDocs = documents.map(d => {
                if (d.storagePath === storagePath) {
                    matchedDoc = {
                        ...d,
                        status: newStatus,
                        rejectionReason: newStatus === 'REJECTED' ? (reason || 'Documento no válido') : null,
                        reviewedBy: currentAdminUid,
                        reviewedAt: new Date().toISOString()
                    };
                    return matchedDoc;
                }
                return d;
            });

            if (!matchedDoc) {
                throw new Error("El documento no se encontró en el expediente.");
            }

            await appRef.update({
                documents: updatedDocs,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Auditoría
            const auditAction = newStatus === 'APPROVED' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED';
            try {
                await governanceService.logAuditEvent(auditAction, {
                    applicationId: appData.appId || appData.applicationId || firestoreDocId,
                    documentName: matchedDoc.name,
                    documentType: matchedDoc.documentType || matchedDoc.type,
                    storagePath,
                    reason: reason || null,
                    reviewedBy: currentAdminUid
                });
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Error registrando auditoría de documento:", auditErr);
            }

            return { success: true, updatedDocument: matchedDoc };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al actualizar estado del documento:", e);
            throw e;
        }
    },

    // Resuelve la URL de descarga segura de Firebase Storage verificando permisos administrativos
    getSecureDocumentDownloadUrl: async (storagePath, applicationId = null) => {
        if (!storagePath || typeof storagePath !== 'string') {
            throw new Error("Ruta de almacenamiento no válida.");
        }
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error("No hay una sesión administrativa activa.");
        }

        // Sanitización básica: evitar escapes de ruta maliciosos
        if (storagePath.includes('..') || storagePath.startsWith('/')) {
            throw new Error("Ruta de documento no permitida.");
        }

        try {
            const storageInstance = (typeof storage !== 'undefined') ? storage : firebase.storage();
            const fileRef = storageInstance.ref(storagePath);
            const downloadUrl = await fileRef.getDownloadURL();
            return downloadUrl;
        } catch (err) {
            console.error("[GOVERNANCE_SERVICE] Error al obtener URL segura de Storage:", err);
            if (err.code === 'storage/unauthorized' || err.code === 'storage/permission-denied') {
                throw new Error("Acceso denegado (403): Su cuenta no cuenta con rol de Administrador para visualizar este documento confidencial.");
            }
            if (err.code === 'storage/object-not-found') {
                throw new Error("Documento no encontrado (404): El archivo no existe o fue eliminado del Storage.");
            }
            throw new Error("No fue posible cargar el documento: " + (err.message || 'Error de red o Storage.'));
        }
    },

    // ─── COURIER APPLICATIONS (SOLICITUDES DE MOTORIZADOS & TENANT ISOLATION) ─

    getCourierApplications: async (statusFilter = 'all', tenantId = null) => {
        try {
            if (typeof db === 'undefined') return [];

            // Sincronización con AuthReadyGate si aún no está inicializado
            if (window.AuthReadyGate && !window.AuthReadyGate.isReady && window.AuthReadyGate.waitUntilReady) {
                await window.AuthReadyGate.waitUntilReady();
            }

            let query = db.collection('courier_applications');

            // Resolución de Tenant Context para aislamiento multi-inquilino
            const claims = (window.AuthReadyGate && window.AuthReadyGate.claims) || {};
            const rawRole = (claims.role || claims.eiamRole || (window.AuthReadyGate && window.AuthReadyGate.role) || '').toString().toUpperCase();
            const isPlatformAdmin = (window.AuthReadyGate && window.AuthReadyGate.isPlatformAdmin === true) ||
                ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT', 'SUPERVISOR', 'OPERATOR', 'OPERATIONS'].includes(rawRole) ||
                claims.admin === true ||
                claims.isSuperAdmin === true ||
                claims.isPlatformAdmin === true;

            let activeTenantId = null;
            if (tenantId && tenantId !== 'all') {
                activeTenantId = tenantId;
            } else if (!isPlatformAdmin) {
                activeTenantId = claims.tenantId || null;
            }

            if (activeTenantId && activeTenantId !== 'all') {
                query = query.where('tenantId', '==', activeTenantId);
            }

            if (statusFilter && statusFilter !== 'all') {
                query = query.where('status', '==', statusFilter);
            }
            const snap = await query.get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({
                    ...data,
                    firestoreDocId: doc.id,
                    applicationId: data.applicationId || doc.id,
                    tenantId: data.tenantId || 'ten_bluesystem_core',
                    personal: data.personal || {},
                    vehicle: data.vehicle || {},
                    documents: data.documents || {}
                });
            });
            list.sort((a, b) => {
                const tA = a.createdAt ? (a.createdAt.seconds || 0) : 0;
                const tB = b.createdAt ? (b.createdAt.seconds || 0) : 0;
                return tB - tA;
            });
            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al obtener solicitudes de motorizados:", {
                code: e.code,
                message: e.message,
                collection: 'courier_applications',
                operation: 'getCourierApplications',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    getCourierApplicationById: async (firestoreDocId) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de documento Firestore no válido.");
        }
        try {
            const doc = await db.collection('courier_applications').doc(firestoreDocId).get();
            if (!doc.exists) throw new Error("La solicitud de motorizado no existe en el sistema.");
            const data = doc.data();
            return {
                ...data,
                firestoreDocId: doc.id,
                applicationId: data.applicationId || doc.id,
                personal: data.personal || {},
                vehicle: data.vehicle || {},
                documents: data.documents || {}
            };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al obtener solicitud de motorizado por ID:", e);
            throw e;
        }
    },

    // Aprobación Canónica de Motorizado (Single Authority -> Trigger Cloud Function aprovisiona en Auth/Users/Couriers)
    approveCourierApplication: async (firestoreDocId, adminUid = null) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('courier_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            if (!appDoc.exists) throw new Error("La solicitud de motorizado no existe en Firestore.");
            const appData = appDoc.data();

            if (appData.status === 'APPROVED') {
                throw new Error("Esta solicitud ya fue aprobada previamente.");
            }

            await appRef.update({
                status: 'APPROVED',
                onboardingStatus: 'approved',
                reviewedBy: currentAdminUid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            try {
                await governanceService.logAuditEvent('COURIER_APPLICATION_APPROVED', {
                    applicationId: appData.applicationId || firestoreDocId,
                    candidateName: appData.personal?.fullName || `${appData.personal?.firstName || ''} ${appData.personal?.lastName || ''}`.trim(),
                    email: appData.personal?.email,
                    plate: appData.vehicle?.plate,
                    reviewedBy: currentAdminUid
                }, 'COURIER_GOVERNANCE');
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al aprobar solicitud de motorizado:", e);
            throw e;
        }
    },

    rejectCourierApplication: async (firestoreDocId, reason, adminUid = null) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        if (!reason || reason.trim() === '') {
            throw new Error("Se requiere especificar el motivo del rechazo.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('courier_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            const appData = appDoc.exists ? appDoc.data() : {};

            await appRef.update({
                status: 'REJECTED',
                onboardingStatus: 'rejected',
                rejectionReason: reason.trim(),
                reviewedBy: currentAdminUid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            try {
                await governanceService.logAuditEvent('COURIER_APPLICATION_REJECTED', {
                    applicationId: appData.applicationId || firestoreDocId,
                    candidateName: appData.personal?.fullName || 'Motorizado',
                    rejectionReason: reason.trim(),
                    reviewedBy: currentAdminUid
                }, 'COURIER_GOVERNANCE');
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al rechazar solicitud de motorizado:", e);
            throw e;
        }
    },

    // Reactivación / Reabrir Solicitud Rechazada (devuelve a PENDING_REVIEW para subsanar docs)
    reopenCourierApplication: async (firestoreDocId, adminUid = null) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const appRef = db.collection('courier_applications').doc(firestoreDocId);
            const appDoc = await appRef.get();
            if (!appDoc.exists) throw new Error("La solicitud de motorizado no existe en Firestore.");
            const appData = appDoc.data() || {};

            await appRef.update({
                status: 'PENDING_REVIEW',
                onboardingStatus: 'pending',
                rejectionReason: firebase.firestore.FieldValue.delete(),
                reopenedBy: currentAdminUid,
                reopenedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            try {
                await governanceService.logAuditEvent('COURIER_APPLICATION_REOPENED', {
                    applicationId: appData.applicationId || firestoreDocId,
                    candidateName: appData.personal?.fullName || `${appData.personal?.firstName || ''} ${appData.personal?.lastName || ''}`.trim(),
                    previousStatus: appData.status,
                    reopenedBy: currentAdminUid
                }, 'COURIER_GOVERNANCE');
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al reactivar solicitud de motorizado:", e);
            throw e;
        }
    },

    // Eliminación Definitiva / Purga de Solicitud (vía Callable Admin con Admin SDK)
    deleteCourierApplication: async (firestoreDocId) => {
        if (!firestoreDocId || typeof firestoreDocId !== 'string' || firestoreDocId.trim() === '') {
            throw new Error("[GOVERNANCE_SERVICE] ID de solicitud Firestore requerido.");
        }
        try {
            const callable = firebase.functions().httpsCallable('adminDeleteCourierApplication');
            const result = await callable({ firestoreDocId: firestoreDocId.trim() });
            return result.data;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al eliminar solicitud de motorizado:", e);
            throw e;
        }
    },

    // ─── COURIER PROFILE REQUESTS (MODIFICACIONES DE PERFIL) ─────────────────

    getCourierProfileRequests: async (statusFilter = 'all') => {
        try {
            if (typeof db === 'undefined') return [];
            let query = db.collection('courier_profile_requests');
            if (statusFilter && statusFilter !== 'all') {
                query = query.where('status', '==', statusFilter);
            }
            const snap = await query.get();
            const list = [];
            snap.forEach(doc => {
                const data = doc.data();
                list.push({
                    ...data,
                    firestoreDocId: doc.id,
                    requestId: data.requestId || doc.id,
                    oldValues: data.oldValues || {},
                    newValues: data.newValues || {},
                    documents: data.documents || {}
                });
            });
            list.sort((a, b) => {
                const tA = a.createdAt ? (a.createdAt.seconds || 0) : 0;
                const tB = b.createdAt ? (b.createdAt.seconds || 0) : 0;
                return tB - tA;
            });
            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al obtener solicitudes de modificación de perfil:", e);
            throw e;
        }
    },

    getCourierProfileRequestById: async (firestoreDocId) => {
        if (!firestoreDocId) throw new Error("ID de solicitud requerido.");
        try {
            const doc = await db.collection('courier_profile_requests').doc(firestoreDocId).get();
            if (!doc.exists) throw new Error("La solicitud de perfil no existe.");
            const data = doc.data();
            return {
                ...data,
                firestoreDocId: doc.id,
                requestId: data.requestId || doc.id,
                oldValues: data.oldValues || {},
                newValues: data.newValues || {},
                documents: data.documents || {}
            };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al obtener solicitud de perfil por ID:", e);
            throw e;
        }
    },

    approveCourierProfileRequest: async (firestoreDocId, adminUid = null) => {
        if (!firestoreDocId) throw new Error("ID de solicitud requerido.");
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            await db.runTransaction(async (tx) => {
                const reqRef = db.collection('courier_profile_requests').doc(firestoreDocId);
                const reqDoc = await tx.get(reqRef);
                if (!reqDoc.exists) throw new Error("La solicitud no existe en Firestore.");
                const reqData = reqDoc.data();

                if (reqData.status === 'APPROVED' && reqData.appliedAt) {
                    throw new Error("Esta solicitud ya fue aprobada y aplicada previamente.");
                }

                const courierId = reqData.courierId;
                if (!courierId) throw new Error("La solicitud no contiene un courierId válido.");

                const courierRef = db.collection('couriers').doc(courierId);
                const userRef = db.collection('users').doc(courierId);

                const courierDoc = await tx.get(courierRef);
                const currentVehicle = courierDoc.exists ? (courierDoc.data()?.vehicle || {}) : {};

                const newVals = reqData.newValues || {};
                const now = firebase.firestore.FieldValue.serverTimestamp();

                // 1. /couriers/{courierId}
                const courierUpdates = {
                    updatedAt: now
                };
                if (newVals.name) courierUpdates.name = newVals.name;
                if (newVals.phone) courierUpdates.phone = newVals.phone;
                if (newVals.email) courierUpdates.email = newVals.email;
                if (newVals.nationalId) courierUpdates.nationalId = newVals.nationalId;
                if (newVals.city) courierUpdates.city = newVals.city;
                if (newVals.department) courierUpdates.department = newVals.department;

                const targetBrand = newVals.vehicleBrand || newVals.brand || '';
                const targetModel = newVals.vehicleModel || newVals.model || '';
                const targetPlate = (newVals.vehiclePlate || newVals.plate || newVals.placa || '').replace(/\s+/g, '').toUpperCase();
                const targetYear = newVals.vehicleYear || newVals.year || null;
                const targetColor = newVals.vehicleColor || newVals.color || '';

                const isVehicleUpdate = Boolean(targetPlate || targetBrand || targetModel || targetYear || targetColor);
                const finalBrand = targetBrand || currentVehicle.brand || '';
                const finalModel = targetModel || currentVehicle.model || '';
                const finalPlate = targetPlate || currentVehicle.plate || '';
                const finalYear  = targetYear  || currentVehicle.year  || 2024;
                const finalColor = targetColor || currentVehicle.color  || currentVehicle.vehicleColor || 'Negro';

                if (isVehicleUpdate) {
                    const updatedVehicle = {
                        ...currentVehicle,
                        brand: finalBrand,
                        model: finalModel,
                        plate: finalPlate,
                        year:  finalYear,
                        color: finalColor,
                    };
                    courierUpdates.vehicle = updatedVehicle;
                    // Escribir SIEMPRE los campos planos — nunca dejar vacíos en el documento raíz
                    if (finalPlate) courierUpdates.plate = finalPlate;
                    if (finalBrand) courierUpdates.vehicleBrand = finalBrand;
                    if (finalModel) courierUpdates.vehicleModel = finalModel;
                    courierUpdates.vehicleYear  = finalYear;
                    courierUpdates.vehicleColor = finalColor;
                }
                tx.set(courierRef, courierUpdates, { merge: true });

                // 2. /users/{courierId}
                const userUpdates = {
                    updatedAt: now
                };
                if (newVals.name) {
                    userUpdates.name = newVals.name;
                    userUpdates.nombre = newVals.name;
                }
                if (newVals.phone) {
                    userUpdates.phone = newVals.phone;
                    userUpdates.telefono = newVals.phone;
                }
                if (newVals.email) userUpdates.email = newVals.email;
                if (newVals.nationalId) userUpdates.nationalId = newVals.nationalId;
                if (newVals.city) userUpdates.city = newVals.city;
                if (isVehicleUpdate) {
                    if (finalPlate) {
                        userUpdates.vehiclePlate = finalPlate;
                        userUpdates.placa = finalPlate;
                    }
                    if (finalBrand) userUpdates.vehicleBrand = finalBrand;
                    if (finalModel) userUpdates.vehicleModel = finalModel;
                    userUpdates.vehicleYear  = finalYear;
                    userUpdates.year         = finalYear;
                    userUpdates.vehicleColor = finalColor;
                    userUpdates.color        = finalColor;
                }
                tx.set(userRef, userUpdates, { merge: true });

                // 3. /courier_profile_requests/{firestoreDocId}
                tx.update(reqRef, {
                    status: 'APPROVED',
                    reviewedBy: currentAdminUid,
                    reviewedAt: now,
                    appliedAt: now,
                    updatedAt: now
                });

                // 4. /audit_events
                const auditRef = db.collection('audit_events').doc();
                tx.set(auditRef, {
                    event: 'COURIER_PROFILE_REQUEST_APPROVED',
                    domain: 'COURIER_PROFILE',
                    courierId,
                    requestId: reqData.requestId || firestoreDocId,
                    triggeredBy: currentAdminUid,
                    oldValues: reqData.oldValues || {},
                    newValues: reqData.newValues || {},
                    timestamp: now
                });
            });

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al aprobar solicitud de modificación de perfil:", e);
            throw e;
        }
    },

    rejectCourierProfileRequest: async (firestoreDocId, reason, adminUid = null) => {
        if (!firestoreDocId) throw new Error("ID de solicitud requerido.");
        if (!reason || !reason.trim()) throw new Error("Se requiere especificar el motivo del rechazo.");
        const currentAdminUid = adminUid || (firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'ADMIN');
        try {
            const reqRef = db.collection('courier_profile_requests').doc(firestoreDocId);
            const reqDoc = await reqRef.get();
            const reqData = reqDoc.exists ? reqDoc.data() : {};
            const courierId = reqData.courierId || 'UNKNOWN';
            const now = firebase.firestore.FieldValue.serverTimestamp();

            await reqRef.update({
                status: 'REJECTED',
                rejectionReason: reason.trim(),
                reviewedBy: currentAdminUid,
                reviewedAt: now,
                updatedAt: now
            });

            try {
                await governanceService.logAuditEvent('COURIER_PROFILE_REQUEST_REJECTED', {
                    requestId: reqData.requestId || firestoreDocId,
                    courierId,
                    rejectionReason: reason.trim(),
                    reviewedBy: currentAdminUid,
                    oldValues: reqData.oldValues || {},
                    newValues: reqData.newValues || {}
                }, 'COURIER_PROFILE');
            } catch (auditErr) {
                console.warn("[GOVERNANCE_SERVICE] Advertencia al registrar auditoría de rechazo:", auditErr);
            }

            return { success: true, firestoreDocId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al rechazar solicitud de modificación de perfil:", e);
            throw e;
        }
    },

    // Registra un evento de auditoría en /audit_events
    logAuditEvent: async (action, metadata = {}, domain = 'ONBOARDING_GOVERNANCE') => {
        try {
            if (typeof db === 'undefined') return;
            const actor = firebase.auth().currentUser;
            const actorRole = (window.AuthReadyGate && window.AuthReadyGate.claims)
                ? (window.AuthReadyGate.claims.role || 'admin')
                : 'ADMIN';

            await db.collection('audit_events').add({
                action,
                event: action,
                domain,
                actorUid: actor ? actor.uid : 'SYSTEM',
                actorRole,
                uid: actor ? actor.uid : 'SYSTEM',
                triggeredBy: actor ? actor.uid : 'SYSTEM',
                metadata,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn('[GOVERNANCE_SERVICE] No se pudo guardar evento de auditoría:', e);
        }
    },

    updateMerchantLifecycleStatus: async (businessId, newStatus, reason = '', adminUid = 'admin') => {
        try {
            if (typeof commerceSyncService !== 'undefined' && commerceSyncService.updateMerchantLifecycleStatus) {
                return await commerceSyncService.updateMerchantLifecycleStatus(businessId, newStatus, reason, adminUid);
            }

            await db.collection('businesses').doc(businessId).update({
                lifecycleStatus: newStatus,
                status: newStatus,
                suspensionReason: reason || null,
                active: newStatus === 'ACTIVE',
                isActive: newStatus === 'ACTIVE',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, businessId, newStatus };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al actualizar estado de ciclo de vida:", e);
            throw e;
        }
    },

    deleteOrganization: async (orgId) => {
        try {
            await db.collection('organizations').doc(orgId).delete();
            await db.collection('audit_events').add({
                event: 'ORGANIZATION_DELETED',
                domain: 'GOVERNANCE',
                orgId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al eliminar organización:", e);
            throw e;
        }
    },

    // Desactivar Solo (Soft Deactivation - Reversible con el mismo businessId)
    deactivateBusiness: async (businessId, adminUid = 'admin') => {
        if (!businessId) throw new Error("ID de comercio no proporcionado.");
        
        console.log(`[BUSINESS_DEACTIVATE] Desactivando comercio ${businessId}`);
        if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.invalidateContext) {
            identityAdminDrawer.invalidateContext(businessId, 'BUSINESS_DEACTIVATE');
        }

        if (typeof commerceSyncService !== 'undefined' && commerceSyncService.updateMerchantLifecycleStatus) {
            return await commerceSyncService.updateMerchantLifecycleStatus(businessId, 'INACTIVE', 'Desactivado desde Governance Center', adminUid);
        }

        await db.collection('businesses').doc(businessId).set({
            status: 'INACTIVE',
            lifecycleStatus: 'INACTIVE',
            active: false,
            isActive: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await db.collection('audit_events').add({
            event: 'BUSINESS_DEACTIVATED',
            action: 'BUSINESS_DEACTIVATED',
            domain: 'GOVERNANCE',
            businessId,
            actorUid: adminUid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            contractVersion: 'IDENTITY_CONTRACT_V1'
        }).catch(() => null);

        return { success: true, businessId, mode: 'DEACTIVATE' };
    },

    // Eliminación Definitiva Real (Hard Delete) — 🔴 BORRADO FÍSICO REAL EN FIRESTORE (Irreversible)
    hardDeleteBusiness: async (businessId, adminUid = 'admin') => {
        if (!businessId) throw new Error("ID de comercio no proporcionado.");

        console.log(`[BUSINESS_DELETE] Solicitando Hard Delete para businessId=${businessId}`);
        if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.invalidateContext) {
            identityAdminDrawer.invalidateContext(businessId, 'BUSINESS_HARD_DELETE');
        }

        if (typeof commerceSyncService !== 'undefined' && commerceSyncService.deleteCommerceAtomic) {
            return await commerceSyncService.deleteCommerceAtomic(businessId, { actorUid: adminUid });
        }

        // Fallback directo
        if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.lockBusinessLifecycle) {
            IdentityAdministrationService.lockBusinessLifecycle(businessId);
        }

        try {
            const batch = db.batch();
            batch.delete(db.collection('businesses').doc(businessId));

            const branchSnap = await db.collection('branches').where('businessId', '==', businessId).get().catch(() => null);
            if (branchSnap && !branchSnap.empty) {
                branchSnap.forEach(bDoc => batch.delete(bDoc.ref));
            }

            const memSnap = await db.collection('membership').where('businessId', '==', businessId).get().catch(() => null);
            if (memSnap && !memSnap.empty) {
                memSnap.forEach(mDoc => batch.delete(mDoc.ref));
            }

            await batch.commit();

            await db.collection('audit_events').add({
                event: 'COMMERCE_PERMANENTLY_DELETED',
                action: 'COMMERCE_PERMANENTLY_DELETED',
                domain: 'GOVERNANCE',
                businessId,
                actorUid: adminUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                contractVersion: 'IDENTITY_CONTRACT_V1'
            }).catch(() => null);

            return { success: true, businessId, mode: 'HARD_DELETE' };
        } finally {
            if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.unlockBusinessLifecycle) {
                IdentityAdministrationService.unlockBusinessLifecycle(businessId);
            }
        }
    },

    // Compatibilidad legacy (alias a hardDeleteBusiness)
    deleteBusiness: async (businessId, adminUid = 'admin') => {
        return await governanceService.hardDeleteBusiness(businessId, adminUid);
    },

    deleteBranch: async (branchId, adminUid = 'admin') => {
        try {
            await db.collection('branches').doc(branchId).update({
                status: 'DELETED',
                active: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('audit_events').add({
                event: 'BRANCH_SOFT_DELETED',
                domain: 'GOVERNANCE',
                branchId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al eliminar sucursal:", e);
            throw e;
        }
    },

    // ─── ROLES & PERMISSIONS ──────────────────────────────────────────────────

    getRoles: async () => {
        try {
            if (typeof db === 'undefined') return [];
            const snap = await db.collection('roles').get();
            const list = [];
            snap.forEach(doc => {
                list.push({ roleId: doc.id, ...doc.data() });
            });
            if (list.length === 0) {
                // Roles canónicos iniciales si la colección en Firestore está vacía
                const defaults = [
                    { roleId: 'SUPER_ADMIN', nombre: 'Super Administrador', level: 10, isSystem: true, permissionsCount: 8 },
                    { roleId: 'ADMIN', nombre: 'Administrador Plataforma', level: 9, isSystem: true, permissionsCount: 8 },
                    { roleId: 'OWNER', nombre: 'Propietario Comercio', level: 6, isSystem: true, permissionsCount: 7 },
                    { roleId: 'MANAGER', nombre: 'Gerente Sucursal', level: 5, isSystem: true, permissionsCount: 6 },
                    { roleId: 'SUPERVISOR', nombre: 'Supervisor Turno', level: 4, isSystem: true, permissionsCount: 4 },
                    { roleId: 'CASHIER', nombre: 'Cajero / POS', level: 3, isSystem: true, permissionsCount: 2 },
                    { roleId: 'COOK', nombre: 'Cocinero / KDS', level: 3, isSystem: true, permissionsCount: 1 },
                    { roleId: 'DRIVER', nombre: 'Repartidor / Driver', level: 2, isSystem: true, permissionsCount: 1 }
                ];
                return defaults;
            }
            return list;
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] PERMISSION_DENIED al obtener roles:", {
                code: e.code,
                message: e.message,
                collection: 'roles',
                operation: 'getRoles',
                uid: (firebase.auth().currentUser || {}).uid,
                claims: window.AuthReadyGate ? window.AuthReadyGate.claims : null
            });
            throw e;
        }
    },

    saveRole: async (roleData) => {
        try {
            const roleId = roleData.roleId || 'ROLE_' + (roleData.nombre || '').toUpperCase().replace(/\s+/g, '_');
            const payload = {
                nombre: roleData.nombre,
                level: parseInt(roleData.level || 3),
                descripcion: roleData.descripcion || '',
                isSystem: false,
                permissions: roleData.permissions || [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('roles').doc(roleId).set(payload, { merge: true });
            await db.collection('audit_events').add({
                event: 'ROLE_SAVED',
                domain: 'SECURITY',
                roleId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, roleId };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al guardar rol:", e);
            throw e;
        }
    },

    deleteRole: async (roleId) => {
        try {
            await db.collection('roles').doc(roleId).delete();
            await db.collection('audit_events').add({
                event: 'ROLE_DELETED',
                domain: 'SECURITY',
                roleId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al eliminar rol:", e);
            throw e;
        }
    },

    savePermissionMatrix: async (matrix) => {
        try {
            await db.collection('permissions').doc('matrix').set({
                matrix,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            await db.collection('audit_events').add({
                event: 'PERMISSION_MATRIX_UPDATED',
                domain: 'SECURITY',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (e) {
            console.error("[GOVERNANCE_SERVICE] Error al guardar matriz de permisos:", e);
            throw e;
        }
    }
};

window.governanceService = governanceService;


