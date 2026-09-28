// canonicalIdentityResolver.js — BlueSystem Enterprise v2.2 / FASE 3
// Unified Canonical Identity Resolver & Diagnostic Reconciliation Engine
// Conforms strictly to IDENTITY CONTRACT v1.0 (Locked Standard)

(function (global) {
    'use strict';

    const CanonicalIdentityResolver = {

        // ─── 1. RESOLVER DE ROL CANÓNICO (EIAM) ──────────────────────────────────
        resolveEiamRole: function (dataOrString) {
            if (!dataOrString) return 'CLIENT';
            
            let raw = '';
            if (typeof dataOrString === 'string') {
                raw = dataOrString;
            } else if (typeof dataOrString === 'object') {
                // Prioridad Canónica: 1. role -> 2. eiamRole -> 3. rol -> 4. userType
                raw = dataOrString.role || dataOrString.eiamRole || dataOrString.rol || dataOrString.userType || '';
            }

            const str = String(raw).toLowerCase().trim();
            const mapping = {
                // Plataforma (Levels 7-10)
                'super_admin': 'SUPER_ADMIN',
                'superadmin': 'SUPER_ADMIN',
                'gerente_general': 'SUPER_ADMIN',
                'admin': 'ADMIN',
                'administrator': 'ADMIN',
                'auditor': 'AUDITOR',
                'support': 'SUPPORT',
                'soporte': 'SUPPORT',

                // Comercio (Level 6: OWNER - MERCHANT_OWNER normalizado a OWNER)
                'owner': 'OWNER',
                'business': 'OWNER',
                'comercio': 'OWNER',
                'merchant': 'OWNER',
                'negocio': 'OWNER',
                'empresa': 'OWNER',
                'propietario': 'OWNER',
                'business_owner': 'OWNER',
                'merchant_owner': 'OWNER',

                // Staff de Comercio (Levels 3-5)
                'manager': 'MANAGER',
                'gerente': 'MANAGER',
                'supervisor': 'SUPERVISOR',
                'cashier': 'CASHIER',
                'cajero': 'CASHIER',
                'caja': 'CASHIER',
                'seller': 'CASHIER',
                'cook': 'COOK',
                'cocinero': 'COOK',
                'cocina': 'COOK',
                'kitchen': 'COOK',

                // Externos / Logística / Consumidores (Levels 0-2)
                'driver': 'DRIVER',
                'motorizado': 'DRIVER',
                'courier': 'DRIVER',
                'repartidor': 'DRIVER',
                'deliverer': 'DRIVER',
                'client': 'CLIENT',
                'customer': 'CLIENT',
                'cliente': 'CLIENT',
                'user': 'CLIENT',
                'usuario': 'CLIENT',
                'guest': 'GUEST',
                'anonymous': 'GUEST',
                'invitado': 'GUEST'
            };

            return mapping[str] || 'CLIENT';
        },

        // ─── 2. RESOLVER DE ESTADO CANÓNICO ──────────────────────────────────────
        resolveIdentityStatus: function (data) {
            if (!data) return 'ACTIVE';
            
            if (data.status && typeof data.status === 'string') {
                const s = data.status.toUpperCase().trim();
                if (['ACTIVE', 'PENDING', 'BLOCKED', 'SUSPENDED', 'TERMINATED'].includes(s)) {
                    return s;
                }
            }

            // Fallback para campos legacy
            if (data.isActive === false || data.active === false) {
                return 'BLOCKED';
            }
            if (data.lifecycleStatus === 'DEACTIVATED') return 'SUSPENDED';
            if (data.lifecycleStatus === 'DEPROVISIONED') return 'TERMINATED';

            return 'ACTIVE';
        },

        // ─── 3. RESOLVER CANÓNICO DE IDENTIDAD COMPLETA ──────────────────────────
        // Transforma cualquier documento en bruto al estándar canónico sin mutar la BD
        resolve: function (rawUser) {
            if (!rawUser) return null;
            
            const uid = rawUser.uid || rawUser.id || '';
            const nombre = (rawUser.nombre || rawUser.name || rawUser.displayName || rawUser.username || '').trim() || 'Sin nombre';
            const email = (rawUser.email || rawUser.mail || rawUser.correo || '').trim() || 'Sin correo';
            const telefono = (rawUser.telefono || rawUser.phone || rawUser.phoneNumber || '').trim() || 'N/A';

            const canonicalRole = CanonicalIdentityResolver.resolveEiamRole(rawUser);
            const canonicalStatus = CanonicalIdentityResolver.resolveIdentityStatus(rawUser);
            const isActive = (canonicalStatus === 'ACTIVE');

            // Determinar tipo de identidad para presentación
            let identityType = 'UNKNOWN';
            if (uid.startsWith('user_cli_') || uid.startsWith('user_cliente') || uid.startsWith('USR-CL-') || uid.startsWith('USR-') || rawUser.relatedClientId) {
                identityType = 'LEGACY_POS';
            } else if (['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT'].includes(canonicalRole)) {
                identityType = 'ADMIN';
            } else if (['OWNER', 'MANAGER', 'SUPERVISOR', 'CASHIER', 'COOK'].includes(canonicalRole)) {
                identityType = 'BUSINESS';
            } else if (canonicalRole === 'DRIVER') {
                identityType = 'COURIER';
            } else if (canonicalRole === 'CLIENT' || canonicalRole === 'GUEST') {
                identityType = (nombre === 'Sin nombre' && email === 'Sin correo') ? 'GUEST' : 'CUSTOMER';
            }

            // Determinar origen de identidad
            let identityOrigin = rawUser.identityOrigin || rawUser.originClassification || rawUser.createdVia;
            if (!identityOrigin || !['APP', 'ADMIN_PANEL', 'AFFILIATION', 'LEGACY_PREEXISTING', 'TEST', 'UNKNOWN'].includes(identityOrigin)) {
                if (uid.startsWith('test_') || nombre.toLowerCase().includes('test') || email.toLowerCase().includes('test')) {
                    identityOrigin = 'TEST';
                } else if (identityType === 'LEGACY_POS') {
                    identityOrigin = 'LEGACY_PREEXISTING';
                } else if (identityType === 'BUSINESS' || rawUser.businessId || rawUser.orgId || rawUser.merchantApplicationId) {
                    identityOrigin = 'AFFILIATION';
                } else if (identityType === 'ADMIN') {
                    identityOrigin = 'ADMIN_PANEL';
                } else if (identityType === 'COURIER' || identityType === 'CUSTOMER' || rawUser.fechaRegistro || rawUser.appVersion) {
                    identityOrigin = 'APP';
                } else {
                    identityOrigin = 'UNKNOWN';
                }
            }

            const roleInfo = (typeof eiamAdapter !== 'undefined' && eiamAdapter.roles && eiamAdapter.roles[canonicalRole])
                ? eiamAdapter.roles[canonicalRole]
                : { level: 1, label: 'Cliente' };

            return {
                ...rawUser,
                uid,
                email,
                nombre,
                telefono,
                effectiveName: nombre,
                effectiveEmail: email,
                effectivePhone: telefono,
                role: canonicalRole,
                rawRole: rawUser.role || rawUser.eiamRole || rawUser.rol || 'undefined',
                canonicalRole,
                roleLevel: roleInfo.level || 1,
                roleLabel: roleInfo.label || 'Cliente',
                status: canonicalStatus,
                displayStatus: canonicalStatus,
                isActive,
                businessId: rawUser.businessId || rawUser.eiamBusinessId || null,
                branchId: rawUser.branchId || null,
                orgId: rawUser.orgId || rawUser.organizationId || null,
                tenantId: rawUser.tenantId || null,
                identityType,
                identityOrigin,
                createdVia: rawUser.createdVia || identityOrigin,
                originClassification: identityOrigin
            };
        },

        // ─── 4. CLASIFICACIÓN DE POBLACIÓN OPERACIONAL ────────────────────────────
        isOperationalIdentity: function (user) {
            if (!user) return false;
            const norm = CanonicalIdentityResolver.resolve(user);
            const origin = norm.identityOrigin || 'UNKNOWN';
            return ['APP', 'ADMIN_PANEL', 'AFFILIATION'].includes(origin);
        },

        // ─── 5. DIAGNÓSTICO DE RECONCILIACIÓN DE CLAIMS ───────────────────────────
        reconcileIdentityClaims: function (userDoc, tokenClaims) {
            if (!userDoc) return { status: 'MISSING', reason: 'Usuario no existe en Firestore' };
            if (!tokenClaims) return { status: 'MISSING', reason: 'Token claims no presentes' };

            const norm = CanonicalIdentityResolver.resolve(userDoc);
            const mismatches = [];

            if (tokenClaims.role !== norm.role) {
                mismatches.push(`role mismatch (claims: ${tokenClaims.role} vs firestore: ${norm.role})`);
            }
            if (norm.businessId && tokenClaims.businessId !== norm.businessId) {
                mismatches.push(`businessId mismatch (claims: ${tokenClaims.businessId} vs firestore: ${norm.businessId})`);
            }
            if (norm.branchId && tokenClaims.branchId !== norm.branchId) {
                mismatches.push(`branchId mismatch (claims: ${tokenClaims.branchId} vs firestore: ${norm.branchId})`);
            }

            if (mismatches.length > 0) {
                return { status: 'MISMATCH', mismatches, isStale: true };
            }
            return { status: 'MATCH', isStale: false };
        },

        // ─── 6. DIAGNÓSTICO DE RECONCILIACIÓN DE ESTADO / AUTH ────────────────────
        reconcileIdentityStatus: function (userDoc, authDisabled) {
            if (!userDoc) return { status: 'UNKNOWN' };
            const norm = CanonicalIdentityResolver.resolve(userDoc);
            const shouldBeDisabled = (norm.status !== 'ACTIVE' && norm.status !== 'PENDING');

            if (typeof authDisabled === 'boolean' && authDisabled !== shouldBeDisabled) {
                return {
                    status: 'DESYNCHRONIZED_LOCK',
                    operationalStatus: norm.status,
                    authDisabled: authDisabled,
                    expectedDisabled: shouldBeDisabled
                };
            }

            return {
                status: 'CONSISTENT',
                operationalStatus: norm.status,
                authDisabled: authDisabled
            };
        },

        // ─── 7. RESOLVER CANÓNICO DE MOTORIZADO OPERACIONAL (ELEGIBILIDAD) ────────
        // BSD-COURIER-ELIGIBILITY-SOURCE-OF-TRUTH-FORENSIC-001
        isCanonicalCourier: function (courierData, userData) {
            const c = courierData || {};
            const u = userData || {};

            const userRole = CanonicalIdentityResolver.resolveEiamRole(u);

            // 1. REGLA CRÍTICA DE ROL INCOMPATIBLE:
            // Si el perfil de usuario tiene rol explícito de Comercio, Admin, Staff o Cliente,
            // se RECHAZA INMEDIATAMENTE. Cero tolerancia.
            if (u && Object.keys(u).length > 0) {
                const rawRole = u.role || u.eiamRole || u.rol || u.userType || '';
                if (rawRole && userRole !== 'DRIVER') {
                    return { isEligible: false, reason: `INCOMPATIBLE_ROLE_${userRole}` };
                }
            }

            // 2. EXCLUSIÓN DE IDENTIDADES CLIENTE / POS LEGACY
            const uid = String(c.id || c.uid || c.courierId || u.uid || u.id || '');
            if (uid.startsWith('user_cli_') || uid.startsWith('user_cliente') || uid.startsWith('USR-CL-') || uid.startsWith('USR-')) {
                return { isEligible: false, reason: 'LEGACY_CLIENT_PREFIX' };
            }

            // 3. CALIFICACIÓN POSITIVA DE DOMINIO COURIER
            // Camino A: Identidad DRIVER en EIAM
            const isEiamDriver = (userRole === 'DRIVER');

            // Camino B: Ficha de aprovisionamiento formal de Onboarding completa
            const isApprovedOnboarding = Boolean(
                (c.approvalStatus === 'APPROVED' || c.onboardingStatus === 'approved') &&
                (c.plate || (c.vehicle && c.vehicle.plate) || c.licensePlate) &&
                c.applicationId
            );

            if (!isEiamDriver && !isApprovedOnboarding) {
                return { isEligible: false, reason: 'NOT_PROVISIONED_STUB' };
            }

            // 4. VERIFICACIÓN DE ESTADO ACTIVO (Sin suspensiones ni bloqueos)
            const isSuspended =
                c.status === 'SUSPENDED' || c.status === 'BLOCKED' || c.isActive === false || c.active === false ||
                u.status === 'SUSPENDED' || u.status === 'BLOCKED' || u.isActive === false || u.active === false;

            if (isSuspended) {
                return { isEligible: false, reason: 'SUSPENDED_OR_INACTIVE' };
            }

            // 5. Nombre identificable
            const name = String(c.name || c.nombre || u.name || u.nombre || '').trim();
            if (!name || name === 'Sin nombre') {
                return { isEligible: false, reason: 'MISSING_NAME' };
            }

            return { isEligible: true, reason: isApprovedOnboarding ? 'CERTIFIED_ONBOARDING' : 'CERTIFIED_EIAM_DRIVER' };
        }
    };

    global.CanonicalIdentityResolver = CanonicalIdentityResolver;
    global.resolveEiamRole = CanonicalIdentityResolver.resolveEiamRole;
    global.resolveIdentityStatus = CanonicalIdentityResolver.resolveIdentityStatus;
    global.isCanonicalCourier = CanonicalIdentityResolver.isCanonicalCourier;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CanonicalIdentityResolver;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

