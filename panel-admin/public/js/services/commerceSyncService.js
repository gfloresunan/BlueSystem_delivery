// Commerce Sync Service — BlueSystem Enterprise v2.2
// Servicio de Sincronización Atómica en Lote (WriteBatch) entre /users, /businesses y /branches.
// Garantiza consistencia ACID E2E y actualización en vivo para la App Android.

(function (window) {
    const commerceSyncService = {
        /**
         * Guarda o actualiza atómicamente un comercio en /businesses (y opcionalmente /users si existe como legacy)
         * Soporta contexto organizacional aditivo: orgId, tenantId, brandId, branchId, membershipId, actorUid, actorRole.
         */
        saveStoreAtomic: async (storeId, data, contextOptions = {}) => {
            if (typeof db === 'undefined') throw new Error("Firestore db no está disponible");
            const batch = db.batch();

            const targetId = storeId || ('biz_' + Date.now());
            const businessRef = db.collection('businesses').doc(targetId);

            // 1. Resolución de Identidad y Contexto del Actor
            const authClaims = (window.AuthReadyGate && window.AuthReadyGate.claims) || {};
            const actorUid = contextOptions.actorUid || 
                (window.AuthReadyGate && window.AuthReadyGate.user ? window.AuthReadyGate.user.uid : null) ||
                (typeof auth !== 'undefined' && auth && auth.currentUser ? auth.currentUser.uid : 'ADMIN');
            const actorRole = contextOptions.actorRole ||
                (window.AuthReadyGate && (window.AuthReadyGate.role || authClaims.role || authClaims.eiamRole)) ||
                'ADMIN';

            // 2. Resolución Organizacional Canónica (Holding / Tenant / Brand)
            const effectiveOrgId = data.orgId || contextOptions.orgId || null;
            const effectiveTenantId = data.tenantId || contextOptions.tenantId || null;
            const effectiveBrandId = data.brandId || contextOptions.brandId || null;
            const effectiveBranchId = data.branchId || contextOptions.branchId || null;
            const effectiveMembershipId = data.membershipId || contextOptions.membershipId || null;

            console.log(`[COMMERCE_SYNC] Iniciando guardado de comercio: targetId=${targetId}, isEdit=${Boolean(storeId)}, orgId=${effectiveOrgId || 'N/A'}, tenantId=${effectiveTenantId || 'N/A'}`);

            const isFeaturedBool = Boolean(data.isFeatured);
            const latVal = Number(data.latitude || (data.location && data.location.latitude) || data.lat || 0);
            const lngVal = Number(data.longitude || (data.location && data.location.longitude) || data.lng || 0);
            const deptId = data.departmentId || null;
            const deptName = data.departmentName || (deptId && window.GeoCatalog ? window.GeoCatalog.getDepartmentName(deptId) : (deptId || ''));
            const muniId = data.municipalityId || null;
            const muniName = data.municipalityName || (deptId && muniId && window.GeoCatalog ? window.GeoCatalog.getMunicipalityName(deptId, muniId) : (data.city || muniId || ''));
            const gMapsUrl = data.googleMapsUrl || ((latVal !== 0 && lngVal !== 0) ? `https://www.google.com/maps/search/?api=1&query=${latVal},${lngVal}` : '');

            const businessPayload = {
                businessId: targetId,
                id: targetId,
                name: data.name,
                comercioNombre: data.name,
                nombre: data.name,
                email: data.email,
                telefono: data.phone,
                phone: data.phone,
                direccion: data.address,
                address: data.address,
                departmentId: deptId,
                departmentName: deptName,
                department: deptName || deptId,
                departamento: deptName || deptId,
                municipalityId: muniId,
                municipalityName: muniName,
                municipality: muniName || muniId,
                municipio: muniName || muniId,
                cityId: muniId,
                city: muniName || data.city || muniId || '',
                ciudad: muniName || data.city || muniId || '',
                latitude: latVal,
                longitude: lngVal,
                lat: latVal,
                lng: lngVal,
                location: (latVal !== 0 && lngVal !== 0) ? { latitude: latVal, longitude: lngVal } : (data.location || null),
                googleMapsUrl: gMapsUrl,
                placeId: data.placeId || '',
                formattedAddress: data.formattedAddress || data.address || '',
                zone: data.zone || '',
                businessCategoryId: data.businessCategoryId || (data.category ? String(data.category).toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'restaurante'),
                categoria: data.category,
                category: data.category,
                descripcion: data.description || '',
                description: data.description || '',
                deliveryFee: data.deliveryFee,
                costoEnvioBase: data.deliveryFee,
                avgPrepTimeMinutes: data.prepTime,
                tiempoEstimadoMinutos: data.prepTime,
                isOpen: data.isOpen,
                abierto: data.isOpen,
                active: data.isActive,
                isActive: data.isActive,
                status: data.isActive ? 'ACTIVE' : 'INACTIVE',
                lifecycleStatus: data.isActive ? 'ACTIVE' : 'INACTIVE',
                isFeatured: isFeaturedBool,
                featured: isFeaturedBool,
                destacado: isFeaturedBool,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Inclusión aditiva de contexto organizacional (sin crear datos ficticios)
            if (effectiveOrgId) {
                businessPayload.orgId = effectiveOrgId;
            } else if (effectiveOrgId === null && data.orgId === null) {
                businessPayload.orgId = null;
            }

            if (effectiveTenantId) {
                businessPayload.tenantId = effectiveTenantId;
            }

            if (effectiveBrandId) {
                businessPayload.brandId = effectiveBrandId;
            }

            if (data.logoUrl) {
                businessPayload.logoUrl = data.logoUrl;
                businessPayload.photoUrl = data.logoUrl;
            }
            if (data.bannerUrl) {
                businessPayload.bannerUrl = data.bannerUrl;
                businessPayload.portadaUrl = data.bannerUrl;
                businessPayload.coverUrl = data.bannerUrl;
            }

            if (!storeId) {
                businessPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                businessPayload.rating = 5.0;
                businessPayload.averageRating = 5.0;
                businessPayload.ratingCount = 1;
            }

            // 1. Escritura Canónica SSOT: /businesses/{targetId}
            batch.set(businessRef, businessPayload, { merge: true });

            // 2. Sincronización Secundaria Condicionada: SOLO si el documento legacy /users/{targetId} ya existe
            let hasLegacyUser = false;
            if (storeId) {
                const userRef = db.collection('users').doc(targetId);
                const userDoc = await userRef.get().catch(() => null);
                if (userDoc && userDoc.exists) {
                    hasLegacyUser = true;
                    const userPayload = {
                        nombre: data.name,
                        name: data.name,
                        comercioNombre: data.name,
                        email: data.email,
                        telefono: data.phone,
                        phone: data.phone,
                        direccion: data.address,
                        address: data.address,
                        departmentId: deptId,
                        departmentName: deptName,
                        municipalityId: muniId,
                        municipalityName: muniName,
                        city: muniName || data.city || muniId || '',
                        latitude: latVal,
                        longitude: lngVal,
                        lat: latVal,
                        lng: lngVal,
                        location: (latVal !== 0 && lngVal !== 0) ? { latitude: latVal, longitude: lngVal } : (data.location || null),
                        googleMapsUrl: gMapsUrl,
                        placeId: data.placeId || '',
                        categoria: data.category,
                        category: data.category,
                        descripcion: data.description || '',
                        description: data.description || '',
                        deliveryFee: data.deliveryFee,
                        costoEnvioBase: data.deliveryFee,
                        avgPrepTimeMinutes: data.prepTime,
                        tiempoEstimadoMinutos: data.prepTime,
                        isOpen: data.isOpen,
                        abierto: data.isOpen,
                        active: data.isActive,
                        isActive: data.isActive,
                        isFeatured: isFeaturedBool,
                        featured: isFeaturedBool,
                        destacado: isFeaturedBool,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    if (data.logoUrl) {
                        userPayload.logoUrl = data.logoUrl;
                        userPayload.photoUrl = data.logoUrl;
                    }
                    if (data.bannerUrl) {
                        userPayload.bannerUrl = data.bannerUrl;
                        userPayload.portadaUrl = data.bannerUrl;
                        userPayload.coverUrl = data.bannerUrl;
                    }
                    batch.set(userRef, userPayload, { merge: true });
                }
            }

            // 3. Auditoría Canónica EIAM en /audit_events
            const auditRef = db.collection('audit_events').doc();
            const auditAction = storeId ? 'BUSINESS_UPDATED' : 'BUSINESS_CREATED';
            batch.set(auditRef, {
                event: auditAction,
                action: auditAction,
                domain: 'GOVERNANCE',
                operation: 'saveStore',
                actorUid: actorUid || 'SYSTEM',
                actorRole: actorRole || 'ADMIN',
                uid: actorUid || 'SYSTEM',
                triggeredBy: actorUid || 'SYSTEM',
                businessId: targetId,
                orgId: effectiveOrgId || null,
                tenantId: effectiveTenantId || null,
                brandId: effectiveBrandId || null,
                branchId: effectiveBranchId || null,
                membershipId: effectiveMembershipId || null,
                targetCollection: 'businesses',
                targetDocument: targetId,
                payloadKeys: Object.keys(data).filter(k => !k.includes('password')),
                result: 'SUCCESS',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();

            // 4. Telemetría Canónica 12 Atributos EIAM
            console.log(`[ADMIN_BUSINESS_EDIT] operation=saveStore, actorUid=${actorUid || 'SYSTEM'}, actorRole=${actorRole || 'ADMIN'}, orgId=${effectiveOrgId || 'N/A'}, tenantId=${effectiveTenantId || 'N/A'}, brandId=${effectiveBrandId || 'N/A'}, businessId=${targetId}, branchId=${effectiveBranchId || 'N/A'}, membershipId=${effectiveMembershipId || 'N/A'}, collection=businesses, document=${targetId}, result=SUCCESS`);
            console.log(`[COMMERCE_SYNC] ✅ Comercio ${targetId} guardado atómicamente en /businesses${hasLegacyUser ? ' (y sincronizado con legacy /users)' : ''}`);
            return targetId;
        },

        /**
         * Cambia atómicamente el estado activo/inactivo de un comercio en /businesses y /users (si existe)
         */
        toggleStoreActiveAtomic: async (storeId, newState) => {
            if (!storeId) return;
            const batch = db.batch();

            const businessRef = db.collection('businesses').doc(storeId);
            const payload = {
                active: newState,
                isActive: newState,
                status: newState ? 'ACTIVE' : 'INACTIVE',
                lifecycleStatus: newState ? 'ACTIVE' : 'INACTIVE',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            batch.set(businessRef, payload, { merge: true });

            const userRef = db.collection('users').doc(storeId);
            const userDoc = await userRef.get().catch(() => null);
            if (userDoc && userDoc.exists) {
                batch.set(userRef, { 
                    active: newState, 
                    isActive: newState, 
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                }, { merge: true });
            }

            await batch.commit();
            console.log(`[COMMERCE_SYNC] ✅ Estado de activo (${newState}) sincronizado atómicamente para ${storeId}`);
        },

        /**
         * Actualiza las imágenes (logo/banner) atómicamente en /businesses y /users (si existe)
         */
        saveStoreImagesAtomic: async (storeId, logoUrl, bannerUrl) => {
            if (!storeId) return;
            const batch = db.batch();

            const businessRef = db.collection('businesses').doc(storeId);
            const imagePayload = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (logoUrl) {
                imagePayload.logoUrl = logoUrl;
                imagePayload.photoUrl = logoUrl;
                imagePayload.optimizedLogoUrl = logoUrl;
            }
            if (bannerUrl) {
                imagePayload.bannerUrl = bannerUrl;
                imagePayload.portadaUrl = bannerUrl;
                imagePayload.coverUrl = bannerUrl;
                imagePayload.optimizedBannerUrl = bannerUrl;
            }
            batch.set(businessRef, imagePayload, { merge: true });

            const userRef = db.collection('users').doc(storeId);
            const userDoc = await userRef.get().catch(() => null);
            if (userDoc && userDoc.exists) {
                batch.set(userRef, imagePayload, { merge: true });
            }

            await batch.commit();
            console.log(`[COMMERCE_SYNC] ✅ Imágenes actualizadas atómicamente para ${storeId}`);
        },

        /**
         * Agrega una sucursal atómicamente en /branches y en el arreglo legado users.branches (si existe)
         */
        addBranchAtomic: async (storeId, storeName, branchData, currentBranchesArray = []) => {
            if (!storeId) return;
            const batch = db.batch();

            const branchId = 'br_' + Date.now();
            const branchName = branchData.name || branchData.nombre || 'Sucursal Principal';
            const branchAddress = branchData.direccion || branchData.address || '';
            const branchPhone = branchData.telefono || branchData.phone || '';
            const locationGPS = branchData.locationGPS || { lat: 12.136389, lng: -86.251389 };

            const branchDocPayload = {
                branchId: branchId,
                id: branchId,
                businessId: storeId,
                businessName: storeName || 'Comercio',
                name: branchName,
                nombre: branchName,
                branchName: branchName,
                address: branchAddress,
                direccion: branchAddress,
                phone: branchPhone,
                telefono: branchPhone,
                locationGPS: locationGPS,
                latitude: locationGPS.lat || 12.136389,
                longitude: locationGPS.lng || -86.251389,
                deliveryRadiusKm: parseFloat(branchData.radioCoberturaKm || 5),
                radioCoberturaKm: parseFloat(branchData.radioCoberturaKm || 5),
                prepTimeMinutes: parseInt(branchData.prepTimeMinutes || 15),
                isOpen: branchData.isOpen !== false,
                abierto: branchData.isOpen !== false,
                active: true,
                isActive: true,
                status: 'OPERATIONAL',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const branchRef = db.collection('branches').doc(branchId);
            batch.set(branchRef, branchDocPayload);

            const userRef = db.collection('users').doc(storeId);
            const userDoc = await userRef.get().catch(() => null);
            if (userDoc && userDoc.exists) {
                const newBranchItemLegacy = {
                    branchId: branchId,
                    id: branchId,
                    name: branchName,
                    nombre: branchName,
                    direccion: branchAddress,
                    telefono: branchPhone,
                    locationGPS: locationGPS,
                    active: true,
                    createdAt: new Date().toISOString()
                };
                const updatedLegacyBranches = [...currentBranchesArray, newBranchItemLegacy];
                batch.set(userRef, {
                    branches: updatedLegacyBranches,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();
            console.log(`[COMMERCE_SYNC] ✅ Sucursal ${branchId} creada atómicamente en /branches`);
            return branchId;
        },

        /**
         * Elimina o desactiva atómicamente una sucursal en /branches y /users (si existe)
         */
        deleteBranchAtomic: async (storeId, branchIndex, currentBranchesArray = []) => {
            if (!storeId || branchIndex < 0 || branchIndex >= currentBranchesArray.length) return;
            const batch = db.batch();

            const targetBranch = currentBranchesArray[branchIndex];
            const branchId = targetBranch.branchId || targetBranch.id;

            if (branchId) {
                const branchRef = db.collection('branches').doc(branchId);
                batch.set(branchRef, {
                    active: false,
                    isActive: false,
                    status: 'DELETED',
                    deleted: true,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            const userRef = db.collection('users').doc(storeId);
            const userDoc = await userRef.get().catch(() => null);
            if (userDoc && userDoc.exists) {
                const updatedLegacyBranches = [...currentBranchesArray];
                updatedLegacyBranches.splice(branchIndex, 1);
                batch.set(userRef, {
                    branches: updatedLegacyBranches,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();
            console.log(`[COMMERCE_SYNC] ✅ Sucursal ${branchId || branchIndex} desactivada/eliminada atómicamente`);
        },

        /**
         * Realtime subscription canónica a /businesses
         */
        subscribeToBusinesses: (callback, orgId = 'all', includeDeleted = false) => {
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
                console.error("[COMMERCE_SYNC] Error en Realtime Businesses Listener:", err);
            });
        },

        /**
         * Actualiza el estado de ciclo de vida atómicamente en /businesses y /users
         */
        updateMerchantLifecycleStatus: async (businessId, newStatus, reason = '', adminUid = 'admin') => {
            if (!businessId) throw new Error("ID de comercio no proporcionado.");
            if (typeof db === 'undefined') throw new Error("Firestore db no está disponible");

            const batch = db.batch();
            const businessRef = db.collection('businesses').doc(businessId);
            const userRef = db.collection('users').doc(businessId);

            const isActive = newStatus === 'ACTIVE';
            const payload = {
                status: newStatus,
                lifecycleStatus: newStatus,
                active: isActive,
                isActive: isActive,
                suspensionReason: reason || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            batch.set(businessRef, payload, { merge: true });
            
            const userDoc = await userRef.get().catch(() => null);
            if (userDoc && userDoc.exists) {
                batch.set(userRef, {
                    active: isActive,
                    isActive: isActive,
                    status: newStatus,
                    lifecycleStatus: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            const auditRef = db.collection('audit_events').doc();
            batch.set(auditRef, {
                event: `BUSINESS_${newStatus}`,
                domain: 'SECURITY',
                businessId,
                triggeredBy: adminUid,
                reason,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            console.log(`[COMMERCE_SYNC] Estado de ciclo de vida (${newStatus}) actualizado atómicamente para ${businessId}`);
            return { success: true, businessId, newStatus };
        },

        /**
         * Alterna el estado destacado (isFeatured) de un comercio en /businesses y /users
         */
        toggleStoreFeaturedAtomic: async (storeId, newFeaturedState) => {
            if (!storeId) throw new Error("ID de comercio no proporcionado.");
            if (typeof db === 'undefined') throw new Error("Firestore db no está disponible");
            const isFeaturedBool = Boolean(newFeaturedState);
            const batch = db.batch();

            const businessRef = db.collection('businesses').doc(storeId);
            batch.set(businessRef, {
                isFeatured: isFeaturedBool,
                featured: isFeaturedBool,
                destacado: isFeaturedBool,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const userRef = db.collection('users').doc(storeId);
            const userDoc = await userRef.get().catch(() => null);
            if (userDoc && userDoc.exists) {
                batch.set(userRef, {
                    isFeatured: isFeaturedBool,
                    featured: isFeaturedBool,
                    destacado: isFeaturedBool,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();
            console.log(`[COMMERCE_SYNC] ✅ isFeatured=${isFeaturedBool} actualizado para ${storeId} en /businesses (y /users)`);
            return { success: true, storeId, isFeatured: isFeaturedBool };
        },

        /**
         * Elimina atómicamente un comercio de /businesses, /branches, /membership y desasigna en /users
         */
        deleteCommerceAtomic: async (storeId, options = {}) => {
            if (!storeId) throw new Error("ID de comercio no proporcionado para eliminación.");
            if (typeof db === 'undefined') throw new Error("Firestore db no está disponible");

            console.log(`[BUSINESS_DELETE] Iniciando eliminación física definitiva para businessId=${storeId}`);

            // 0. Bloqueo de ciclo de vida e invalidación de drawer
            if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.lockBusinessLifecycle) {
                IdentityAdministrationService.lockBusinessLifecycle(storeId);
            }
            if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.invalidateContext) {
                identityAdminDrawer.invalidateContext(storeId, 'BUSINESS_HARD_DELETE');
            }

            try {
                const batch = db.batch();

                // 1. Eliminar físicamente /businesses/{storeId}
                const businessRef = db.collection('businesses').doc(storeId);
                batch.delete(businessRef);

                // 2. Desactivar / Marcar borrado en /users/{storeId} solo si existía como negocio legacy
                const userRef = db.collection('users').doc(storeId);
                const userDoc = await userRef.get().catch(() => null);
                if (userDoc && userDoc.exists) {
                    const uData = userDoc.data() || {};
                    if (uData.role === 'business' || uData.userType === 'business' || uData.role === 'OWNER') {
                        batch.set(userRef, {
                            active: false,
                            isActive: false,
                            status: 'DELETED',
                            lifecycleStatus: 'DEPROVISIONED',
                            isDeleted: true,
                            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                }

                // 3. Eliminar sucursales en /branches vinculadas
                const branchesSnap = await db.collection('branches').where('businessId', '==', storeId).get().catch(() => null);
                if (branchesSnap && !branchesSnap.empty) {
                    branchesSnap.forEach(bDoc => {
                        batch.delete(bDoc.ref);
                    });
                }

                // 4. Eliminar membresías en /membership vinculadas
                const memSnap = await db.collection('membership').where('businessId', '==', storeId).get().catch(() => null);
                if (memSnap && !memSnap.empty) {
                    memSnap.forEach(mDoc => {
                        batch.delete(mDoc.ref);
                    });
                }

                await batch.commit();

                // 5. Registrar evento de auditoría canónico en /audit_events (inmutable)
                await db.collection('audit_events').add({
                    event: 'COMMERCE_PERMANENTLY_DELETED',
                    action: 'COMMERCE_PERMANENTLY_DELETED',
                    domain: 'GOVERNANCE',
                    businessId: storeId,
                    actorUid: options.actorUid || 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    contractVersion: 'IDENTITY_CONTRACT_V1'
                }).catch((err) => console.warn("[COMMERCE_SYNC] Aviso de auditoría:", err));

                console.log(`[BUSINESS_DELETE] ✅ Comercio ${storeId} eliminado atómicamente en /businesses, /branches, /membership.`);
                return { success: true, storeId, mode: 'HARD_DELETE' };
            } finally {
                if (typeof IdentityAdministrationService !== 'undefined' && IdentityAdministrationService.unlockBusinessLifecycle) {
                    IdentityAdministrationService.unlockBusinessLifecycle(storeId);
                }
            }
        }
    };

    window.commerceSyncService = commerceSyncService;
    console.log('[COMMERCE_SYNC] Servicio de Sincronización Atómica en Lote inicializado');
})(typeof window !== 'undefined' ? window : this);
