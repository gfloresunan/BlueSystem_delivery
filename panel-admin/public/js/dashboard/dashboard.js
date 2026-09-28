// Centralized Auth Ready Gate & Governance Session Manager — BlueSystem Delivery Enterprise v5.1.0
window.AuthReadyGate = {
    isReady: false,
    user: null,
    claims: null,
    role: null,
    isPlatformAdmin: false,
    _promise: null,

    init: function() {
        if (this._promise) return this._promise;

        this._promise = new Promise((resolve, reject) => {
            if (typeof auth === 'undefined' || !auth) {
                console.error("[AUTH_READY_GATE] Firebase Auth no está disponible.");
                return reject(new Error("Firebase Auth no disponible"));
            }

            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    this.isReady = false;
                    this.user = null;
                    this.claims = null;
                    this.isPlatformAdmin = false;
                    window.location.href = 'index.html';
                    return reject(new Error("No user authenticated"));
                }

                try {
                    this.user = user;

                    // 1. Paso Obligatorio: Refresco de Token JWT (IdToken Refresh)
                    await user.getIdToken(true);

                    // 2. Obtener Token Result y Custom Claims reales
                    const tokenResult = await user.getIdTokenResult();
                    this.claims = tokenResult.claims || {};

                    // REGLA CANÓNICA: Validar Custom Claims Reales del JWT
                    const claimRole = (this.claims.role || this.claims.eiamRole || '').toUpperCase();
                    const isAdminClaim = this.claims.admin === true;
                    const isSuperAdminClaim = this.claims.isSuperAdmin === true;

                    const allowedAdminRoles = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT', 'SUPERVISOR', 'OPERATOR', 'OPERATIONS'];
                    const isPlatformAdmin = allowedAdminRoles.includes(claimRole) ||
                                          isAdminClaim ||
                                          isSuperAdminClaim ||
                                          this.claims.supervisor === true ||
                                          this.claims.isPlatformAdmin === true;

                    if (!isPlatformAdmin) {
                        console.error("[AUTH_READY_GATE] ⛔ AUTH_CLAIMS_INVALID: El usuario no cuenta con claims de administración en su token JWT.", {
                            uid: user.uid,
                            email: user.email,
                            claims: this.claims
                        });

                        this.isReady = false;
                        this.isPlatformAdmin = false;
                        this.showAuthClaimsInvalidUI(user.email, claimRole || 'UNDEFINED');
                        return reject(new Error("AUTH_CLAIMS_INVALID"));
                    }

                    this.role = (this.claims.role || this.claims.eiamRole || (isAdminClaim ? 'admin' : (isSuperAdminClaim ? 'super_admin' : 'admin'))).toLowerCase();
                    this.isPlatformAdmin = true;
                    this.isReady = true;

                    console.log("[AUTH_READY_GATE] 🟢 AUTH READY CERTIFIED:", {
                        uid: user.uid,
                        email: user.email,
                        role: this.role,
                        claims: this.claims,
                        isPlatformAdmin: this.isPlatformAdmin
                    });

                    // Actualizar UI del Header
                    const emailEl = document.getElementById('adminEmail');
                    if (emailEl) emailEl.textContent = user.email;

                    const roleBadge = document.getElementById('adminRoleBadge');
                    if (roleBadge) roleBadge.textContent = this.role.toUpperCase() + ' CONTROL';

                    const avatarInitials = document.getElementById('userAvatarInitials');
                    if (avatarInitials) avatarInitials.textContent = (user.email || 'OP')[0].toUpperCase();

                    dashboardController.configureTabs(this.role);
                    dashboardController.switchTab('liveOperations');

                    resolve({
                        user: this.user,
                        claims: this.claims,
                        role: this.role,
                        isPlatformAdmin: this.isPlatformAdmin
                    });
                } catch (err) {
                    console.error("[AUTH_READY_GATE] Error durante la inicialización de Auth Ready:", err);
                    this.isReady = false;
                    reject(err);
                }
            });
        });

        return this._promise;
    },

    waitUntilReady: async function() {
        if (this.isReady) return { user: this.user, claims: this.claims, role: this.role, isPlatformAdmin: this.isPlatformAdmin };
        return await this.init();
    },

    showAuthClaimsInvalidUI: function(email, roleName) {
        document.body.innerHTML = `
            <div class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-6 font-sans select-none">
                <div class="bg-slate-900 border border-rose-500/40 p-8 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-center">
                    <span class="text-5xl">⛔</span>
                    <h2 class="text-xl font-bold text-rose-400">AUTH_CLAIMS_INVALID</h2>
                    <p class="text-xs text-slate-300">La cuenta <strong>${email}</strong> no posee privilegios administrativos validados en el token JWT (Rol evaluado: "<code class="text-amber-400">${roleName}</code>").</p>
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono text-left space-y-1">
                        <p><strong class="text-slate-200">Error:</strong> Custom Claims JWT insuficientes para acceso a Control Center</p>
                        <p><strong class="text-slate-200">Mitigación:</strong> Sincronizar Custom Claims en servidor (syncClaims).</p>
                    </div>
                    <button onclick="window.dashboardLogout()" class="w-full bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-lg text-xs font-bold transition">
                        Cerrar Sesión e Intentar Nuevo Login
                    </button>
                </div>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.AuthReadyGate.init().catch(err => {
        console.warn("[AUTH_READY_GATE] Bootstrap detenido:", err.message);
    });
});

const dashboardController = {
    currentTab: null,

    getModule: (id) => {
        const modName = id + 'Module';
        if (window[modName]) return window[modName];

        switch (id) {
            case 'liveOperations': return window.liveOperationsModule || (typeof liveOperationsModule !== 'undefined' ? liveOperationsModule : null);
            case 'liveMap': return window.liveMapModule || (typeof liveMapModule !== 'undefined' ? liveMapModule : null);
            case 'heatmapAnalytics': return window.heatmapAnalyticsModule || (typeof heatmapAnalyticsModule !== 'undefined' ? heatmapAnalyticsModule : null);
            case 'liveOrders': return window.liveOrdersModule || (typeof liveOrdersModule !== 'undefined' ? liveOrdersModule : null);
            case 'liveCouriers': return window.liveCouriersModule || (typeof liveCouriersModule !== 'undefined' ? liveCouriersModule : null);
            case 'courierCashControl': return window.courierCashControlModule || (typeof courierCashControlModule !== 'undefined' ? courierCashControlModule : null);
            case 'deliveryExpress': return window.deliveryExpressModule || (typeof deliveryExpressModule !== 'undefined' ? deliveryExpressModule : null);
            case 'liveRestaurants': return window.liveRestaurantsModule || (typeof liveRestaurantsModule !== 'undefined' ? liveRestaurantsModule : null);
            case 'liveCustomers': return window.liveCustomersModule || (typeof liveCustomersModule !== 'undefined' ? liveCustomersModule : null);
            case 'incidentsCenter': return window.incidentsCenterModule || (typeof incidentsCenterModule !== 'undefined' ? incidentsCenterModule : null);
            case 'opsTools': return window.opsToolsModule || (typeof opsToolsModule !== 'undefined' ? opsToolsModule : null);
            case 'notifications': return window.notificationsModule || (typeof notificationsModule !== 'undefined' ? notificationsModule : null);
            case 'analytics': return window.analyticsModule || (typeof analyticsModule !== 'undefined' ? analyticsModule : null);
            case 'users': return window.usersModule || (typeof usersModule !== 'undefined' ? usersModule : null);
            case 'promotions': return window.promotionsModule || (typeof promotionsModule !== 'undefined' ? promotionsModule : null);
            case 'dynamicMenu': return window.dynamicMenuModule || (typeof dynamicMenuModule !== 'undefined' ? dynamicMenuModule : null);
            case 'commerceAnnouncements': return window.commerceAnnouncementsModule || (typeof commerceAnnouncementsModule !== 'undefined' ? commerceAnnouncementsModule : null);
            case 'businessCategories': return window.businessCategoriesModule || (typeof businessCategoriesModule !== 'undefined' ? businessCategoriesModule : null);
            case 'categories': return window.categoriesModule || (typeof categoriesModule !== 'undefined' ? categoriesModule : null);
            case 'dashboardManager': return window.dashboardManagerModule || (typeof dashboardManagerModule !== 'undefined' ? dashboardManagerModule : null);
            case 'commerceIntelligence': return window.commerceIntelligenceModule || (typeof commerceIntelligenceModule !== 'undefined' ? commerceIntelligenceModule : null);
            case 'profileManager': return window.profileManagerModule || (typeof profileManagerModule !== 'undefined' ? profileManagerModule : null);
            case 'audit': return window.auditModule || (typeof auditModule !== 'undefined' ? auditModule : null);
            case 'config': return window.configModule || (typeof configModule !== 'undefined' ? configModule : null);
            case 'health': return window.healthModule || (typeof healthModule !== 'undefined' ? healthModule : null);
            case 'governanceCenter': return window.governanceCenterModule || (typeof governanceCenterModule !== 'undefined' ? governanceCenterModule : null);
            case 'rolesAndPermissions': return window.rolesAndPermissionsModule || (typeof rolesAndPermissionsModule !== 'undefined' ? rolesAndPermissionsModule : null);
            case 'financeCenter': return window.financeCenterModule || (typeof financeCenterModule !== 'undefined' ? financeCenterModule : null);
            case 'domains': return window.domainsModule || (typeof domainsModule !== 'undefined' ? domainsModule : null);
            case 'emailTemplates': return window.emailTemplatesModule || (typeof emailTemplatesModule !== 'undefined' ? emailTemplatesModule : null);
            case 'supportCenter': return window.supportCenterModule || (typeof supportCenterModule !== 'undefined' ? supportCenterModule : null);
            case 'brandManager': return window.brandManagerModule || (typeof brandManagerModule !== 'undefined' ? brandManagerModule : null);
            case 'subscriptionManager': return window.subscriptionManagerModule || (typeof subscriptionManagerModule !== 'undefined' ? subscriptionManagerModule : null);
            case 'appConfigManager': return window.appConfigManagerModule || (typeof appConfigManagerModule !== 'undefined' ? appConfigManagerModule : null);
            case 'buildEngine': return window.buildEngineManagerModule || (typeof buildEngineManagerModule !== 'undefined' ? buildEngineManagerModule : null);
            case 'appUpdateCenter': return window.appUpdateCenterModule || (typeof appUpdateCenterModule !== 'undefined' ? appUpdateCenterModule : null);
            case 'reputationBI': return window.reputationBIModule || (typeof reputationBIModule !== 'undefined' ? reputationBIModule : null);
            default: return null;
        }
    },

    configureTabs: (role) => {
        const fullTabs = [
            'governanceCenter', 'rolesAndPermissions', 'financeCenter', 'domains', 'emailTemplates', 'brandManager', 'subscriptionManager', 'appConfigManager', 'buildEngine', 'appUpdateCenter', 'liveOperations', 'liveMap', 'heatmapAnalytics', 'liveOrders', 'supportCenter', 'liveCouriers', 'courierCashControl', 'deliveryExpress',
            'liveRestaurants', 'liveCustomers', 'incidentsCenter',
            'opsTools', 'notifications', 'analytics', 'reputationBI', 'users', 'promotions', 'dynamicMenu', 'commerceAnnouncements', 'businessCategories', 'categories', 'dashboardManager', 'commerceIntelligence', 'profileManager', 'audit', 'config', 'health'
        ];

        const allowedTabs = {
            super_admin: fullTabs,
            admin: fullTabs,
            auditor: ['governanceCenter', 'rolesAndPermissions', 'financeCenter', 'domains', 'emailTemplates', 'brandManager', 'subscriptionManager', 'appConfigManager', 'buildEngine', 'appUpdateCenter', 'liveOperations', 'liveMap', 'heatmapAnalytics', 'liveOrders', 'supportCenter', 'liveCouriers', 'courierCashControl', 'deliveryExpress', 'incidentsCenter', 'reputationBI', 'users', 'businessCategories', 'commerceAnnouncements', 'audit', 'health'],
            supervisor: ['financeCenter', 'liveOperations', 'liveMap', 'heatmapAnalytics', 'liveOrders', 'supportCenter', 'liveCouriers', 'courierCashControl', 'deliveryExpress', 'incidentsCenter', 'opsTools', 'reputationBI', 'users', 'notifications'],
            operator: ['liveOperations', 'liveMap', 'liveOrders', 'supportCenter', 'liveCouriers', 'courierCashControl', 'deliveryExpress', 'opsTools', 'users', 'notifications'],
            support: ['liveOrders', 'supportCenter', 'liveCouriers', 'liveCustomers', 'incidentsCenter', 'users', 'notifications']
        };

        const tabs = allowedTabs[role] || fullTabs;
        const navContainer = document.getElementById('sidebar-nav');
        if (!navContainer) return;
        navContainer.innerHTML = '';

        // Estructura de Navegación por Categorías
        const menuCategories = [
            {
                title: '🏛 GOBERNANZA EMPRESARIAL',
                items: [
                    { id: 'governanceCenter', label: 'Governance Center', icon: '🏛️' },
                    { id: 'rolesAndPermissions', label: 'Roles & Permisos (RBAC)', icon: '🛡️' },
                    { id: 'financeCenter', label: 'Centro Financiero', icon: '💰' },
                    { id: 'domains', label: 'Dominios & White Label', icon: '🌐' },
                    { id: 'emailTemplates', label: 'Plantillas Email & SMTP', icon: '✉️' },
                    { id: 'brandManager', label: 'Brand Manager', icon: '🎨' },
                    { id: 'subscriptionManager', label: 'Suscripciones & Features', icon: '💳' },
                    { id: 'appConfigManager', label: 'Configuración de Apps', icon: '📱' },
                    { id: 'buildEngine', label: 'Build Engine', icon: '⚙️' },
                    { id: 'appUpdateCenter', label: 'App Update Center', icon: '🚀' }
                ]
            },
            {
                title: 'OPERACIONES EN VIVO',
                items: [
                    { id: 'liveOperations', label: 'Ops Dashboard', icon: '📊' },
                    { id: 'liveMap', label: 'Mapa & Flota 4K', icon: '🗺️' },
                    { id: 'heatmapAnalytics', label: 'Zonas Calientes (Heatmap)', icon: '🔥' },
                    { id: 'liveOrders', label: 'Monitor Pedidos', icon: '📦' },
                    { id: 'supportCenter', label: 'Centro de Soporte 24/7', icon: '🎧' },
                    { id: 'incidentsCenter', label: 'Incidencias', icon: '⚠️' }
                ]
            },
            {
                title: 'LOGÍSTICA & FLOTA',
                items: [
                    { id: 'liveCouriers', label: 'Motorizados', icon: '🛵' },
                    { id: 'courierCashControl', label: 'Caja de Motorizados', icon: '💰' },
                    { id: 'deliveryExpress', label: 'Delivery Express (X→Y)', icon: '⚡' },
                    { id: 'liveCustomers', label: 'Clientes', icon: '👤' },
                    { id: 'opsTools', label: 'Herramientas Ops', icon: '🛠️' }
                ]
            },
            {
                title: 'CATÁLOGO & COMERCIO',
                items: [
                    { id: 'businessCategories', label: 'Rubros Comerciales (Master)', icon: '🏛️' },
                    { id: 'liveRestaurants', label: 'Comercios & Sucursales', icon: '🏪' },
                    { id: 'promotions', label: 'Promociones (Banners & Popups)', icon: '📢' },
                    { id: 'dynamicMenu', label: 'Menú Dinámico App', icon: '🍔' },
                    { id: 'commerceAnnouncements', label: 'Anuncios de Comercios', icon: '📣' },
                    { id: 'categories', label: 'Categorías', icon: '🏷️' },
                    { id: 'dashboardManager', label: 'Dashboard Manager', icon: '🎨' },
                    { id: 'commerceIntelligence', label: 'Commerce Intelligence', icon: '🧠' },
                    { id: 'profileManager', label: 'Profile Manager', icon: '👤' }
                ]
            },
            {
                title: 'SISTEMA & AUDITORÍA',
                items: [
                    { id: 'users', label: 'Usuarios & Roles', icon: '👥' },
                    { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
                    { id: 'analytics', label: 'Reportes & Analítica', icon: '📊' },
                    { id: 'reputationBI', label: 'Reputación & Rankings BI', icon: '🏆' },
                    { id: 'audit', label: 'Auditoría', icon: '🛡️' },
                    { id: 'config', label: 'Configuración', icon: '⚙️' },
                    { id: 'health', label: 'Monitor Salud', icon: '🩺' }
                ]
            }
        ];

        menuCategories.forEach(cat => {
            const validItems = cat.items.filter(item => tabs.includes(item.id));
            if (validItems.length > 0) {
                let catHtml = `
                    <div class="space-y-1">
                        <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1">${cat.title}</p>
                `;
                validItems.forEach(cfg => {
                    catHtml += `
                        <a href="#" id="tab-btn-${cfg.id}" onclick="dashboardController.switchTab('${cfg.id}')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800/80 hover:text-white transition duration-150">
                            <span class="text-sm">${cfg.icon}</span>
                            <span>${cfg.label}</span>
                        </a>
                    `;
                });
                catHtml += `</div>`;
                navContainer.innerHTML += catHtml;
            }
        });
    },

    switchTab: (tabId) => {
        if (dashboardController.currentTab) {
            const prevMod = dashboardController.getModule(dashboardController.currentTab);
            if (prevMod && typeof prevMod.destroy === 'function') {
                try { prevMod.destroy(); } catch (e) { console.warn('Error en destroy de módulo previo:', e); }
            }

            const prevBtn = document.getElementById(`tab-btn-${dashboardController.currentTab}`);
            if (prevBtn) {
                prevBtn.classList.remove('bg-indigo-600/20', 'text-indigo-300', 'border', 'border-indigo-500/30');
                prevBtn.classList.add('text-slate-400');
            }
        }

        const newBtn = document.getElementById(`tab-btn-${tabId}`);
        if (newBtn) {
            newBtn.classList.remove('text-slate-400');
            newBtn.classList.add('bg-indigo-600/20', 'text-indigo-300', 'border', 'border-indigo-500/30');
        }

        dashboardController.currentTab = tabId;

        const mod = dashboardController.getModule(tabId);
        if (mod && typeof mod.render === 'function') {
            mod.render();
        } else {
            console.warn(`Módulo '${tabId}' no se encuentra cargado aún.`);
        }
    },

    logout: () => {
        window.dashboardLogout();
    }
};

window.dashboardController = dashboardController;
