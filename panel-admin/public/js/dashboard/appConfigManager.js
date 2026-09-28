// App Configuration Manager — Commercial Product Configuration Foundation v1.0.0
// BlueSystem Delivery Enterprise — Phase 2D.23 (C2D.23)
// Single Core / Zero Forks / Configuration-Driven Product Assembly

const appConfigManagerModule = {
    appConfigs: [],
    tenants: [],
    brands: [],
    subscriptions: [],
    searchTerm: '',
    selectedTenantFilter: 'all',
    selectedPlatformFilter: 'all',
    selectedEnvFilter: 'all',
    selectedStatusFilter: 'all',
    currentEditingConfig: null,
    unsubscribeConfigs: null,

    render: async () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Auth Ready Gate check
        if (!window.AuthReadyGate || !window.AuthReadyGate.isReady) {
            try {
                if (window.AuthReadyGate && typeof window.AuthReadyGate.waitUntilReady === 'function') {
                    await window.AuthReadyGate.waitUntilReady();
                } else {
                    throw new Error("AuthReadyGate no inicializado");
                }
            } catch (err) {
                container.innerHTML = `
                    <div class="bg-slate-900 border border-rose-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl font-sans my-8">
                        <span class="text-5xl">⛔</span>
                        <h3 class="text-lg font-bold text-rose-400">Acceso Denegado</h3>
                        <p class="text-xs text-slate-300 max-w-md mx-auto">App Configuration Manager requiere privilegios de Platform Admin validados.</p>
                    </div>
                `;
                return;
            }
        }

        container.innerHTML = `
            <div class="space-y-6 font-sans select-none">
                <!-- Header -->
                <div class="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">📱</span>
                            <div>
                                <h2 class="text-2xl font-black text-white tracking-tight">App Configuration Manager</h2>
                                <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Commercial Product Configuration & Assembly Foundation (C2D.23)</p>
                            </div>
                        </div>
                        <p class="text-xs text-slate-400 mt-1 max-w-2xl">
                            Ensamblaje y administración de especificaciones de producto: vinculación de Tenant + Brand + Subscription + Platform + Providers para compilaciones futuras.
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button onclick="appConfigManagerModule.openConfigModal(null)" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                            <span>✨</span> Nueva Configuración de App
                        </button>
                    </div>
                </div>

                <!-- Filters & Search Bar -->
                <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div class="relative w-full md:w-72">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">🔍</span>
                        <input type="text" id="ac-search-input" value="${appConfigManagerModule.searchTerm}" oninput="appConfigManagerModule.onSearch(this.value)" placeholder="Buscar por app name, package, ID..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono">
                    </div>

                    <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[11px] text-slate-400 font-bold">🏢 Tenant:</span>
                            <select id="ac-tenant-filter" onchange="appConfigManagerModule.onTenantFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todos</option>
                            </select>
                        </div>

                        <div class="flex items-center gap-1.5">
                            <span class="text-[11px] text-slate-400 font-bold">📱 Plataforma:</span>
                            <select id="ac-platform-filter" onchange="appConfigManagerModule.onPlatformFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todas</option>
                                <option value="ANDROID">ANDROID</option>
                                <option value="IOS">IOS (Schema)</option>
                                <option value="WEB">WEB</option>
                            </select>
                        </div>

                        <div class="flex items-center gap-1.5">
                            <span class="text-[11px] text-slate-400 font-bold">🌐 Entorno:</span>
                            <select id="ac-env-filter" onchange="appConfigManagerModule.onEnvFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todos</option>
                                <option value="DEVELOPMENT">DEVELOPMENT</option>
                                <option value="STAGING">STAGING</option>
                                <option value="PRODUCTION">PRODUCTION</option>
                            </select>
                        </div>

                        <div class="flex items-center gap-1.5">
                            <span class="text-[11px] text-slate-400 font-bold">⚡ Estado:</span>
                            <select id="ac-status-filter" onchange="appConfigManagerModule.onStatusFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todos</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="DRAFT">DRAFT</option>
                                <option value="DEPRECATED">DEPRECATED</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- App Configurations Grid -->
                <div id="ac-configs-container" class="space-y-4">
                    <div class="flex items-center justify-center p-12">
                        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>

            <!-- Modal App Config Editor -->
            <div id="ac-modal-backdrop" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
                <div id="ac-modal-content" class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
                    <!-- Dynamic Modal Content -->
                </div>
            </div>
        `;

        await appConfigManagerModule.loadInitialData();
        appConfigManagerModule.renderConfigsList();
    },

    loadInitialData: async () => {
        try {
            // Load Tenants, Brands, Subscriptions
            const tenantsSnap = await db.collection('tenants').get();
            appConfigManagerModule.tenants = tenantsSnap.docs.map(d => ({ tenantId: d.id, ...d.data() }));

            const brandsSnap = await db.collection('brands').get();
            appConfigManagerModule.brands = brandsSnap.docs.map(d => ({ brandId: d.id, ...d.data() }));

            const subsSnap = await db.collection('subscriptions').get();
            appConfigManagerModule.subscriptions = subsSnap.docs.map(d => ({ subscriptionId: d.id, ...d.data() }));

            // Populate Tenant Filter
            const tenantFilter = document.getElementById('ac-tenant-filter');
            if (tenantFilter) {
                tenantFilter.innerHTML = '<option value="all">Todos</option>' +
                    appConfigManagerModule.tenants.map(t => `<option value="${t.tenantId}">${t.name || t.tenantId}</option>`).join('');
            }

            // Realtime Listener to /app_configs
            if (!appConfigManagerModule.unsubscribeConfigs) {
                appConfigManagerModule.unsubscribeConfigs = db.collection('app_configs').onSnapshot(snap => {
                    appConfigManagerModule.appConfigs = snap.docs.map(d => ({ configId: d.id, ...d.data() }));
                    appConfigManagerModule.renderConfigsList();
                }, err => {
                    console.error("[APP_CONFIG_MANAGER] Error en listener de app_configs:", err);
                });
            }
        } catch (err) {
            console.error("[APP_CONFIG_MANAGER] Error cargando datos iniciales:", err);
        }
    },

    onSearch: (val) => {
        appConfigManagerModule.searchTerm = (val || '').toLowerCase().trim();
        appConfigManagerModule.renderConfigsList();
    },

    onTenantFilterChange: (val) => {
        appConfigManagerModule.selectedTenantFilter = val;
        appConfigManagerModule.renderConfigsList();
    },

    onPlatformFilterChange: (val) => {
        appConfigManagerModule.selectedPlatformFilter = val;
        appConfigManagerModule.renderConfigsList();
    },

    onEnvFilterChange: (val) => {
        appConfigManagerModule.selectedEnvFilter = val;
        appConfigManagerModule.renderConfigsList();
    },

    onStatusFilterChange: (val) => {
        appConfigManagerModule.selectedStatusFilter = val;
        appConfigManagerModule.renderConfigsList();
    },

    renderConfigsList: () => {
        const container = document.getElementById('ac-configs-container');
        if (!container) return;

        let filtered = appConfigManagerModule.appConfigs.filter(cfg => {
            const dist = cfg.distribution || {};
            const matchesSearch = !appConfigManagerModule.searchTerm ||
                (dist.appName && dist.appName.toLowerCase().includes(appConfigManagerModule.searchTerm)) ||
                (dist.applicationId && dist.applicationId.toLowerCase().includes(appConfigManagerModule.searchTerm)) ||
                (cfg.configId && cfg.configId.toLowerCase().includes(appConfigManagerModule.searchTerm)) ||
                (cfg.tenantId && cfg.tenantId.toLowerCase().includes(appConfigManagerModule.searchTerm)) ||
                (cfg.brandId && cfg.brandId.toLowerCase().includes(appConfigManagerModule.searchTerm));

            const matchesTenant = appConfigManagerModule.selectedTenantFilter === 'all' || cfg.tenantId === appConfigManagerModule.selectedTenantFilter;
            const matchesPlatform = appConfigManagerModule.selectedPlatformFilter === 'all' || cfg.platform === appConfigManagerModule.selectedPlatformFilter;
            const matchesEnv = appConfigManagerModule.selectedEnvFilter === 'all' || cfg.environment === appConfigManagerModule.selectedEnvFilter;
            const matchesStatus = appConfigManagerModule.selectedStatusFilter === 'all' || (cfg.status || 'ACTIVE') === appConfigManagerModule.selectedStatusFilter;

            return matchesSearch && matchesTenant && matchesPlatform && matchesEnv && matchesStatus;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                    <span class="text-4xl">📱</span>
                    <h3 class="text-sm font-bold text-slate-200">No hay configuraciones de aplicación registradas</h3>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto">Crea una nueva especificación de producto comercial vinculando un Tenant, Brand y Plataforma.</p>
                    <button onclick="appConfigManagerModule.openConfigModal(null)" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">
                        Crear Primera Configuración
                    </button>
                </div>
            `;
            return;
        }

        let html = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">`;

        filtered.forEach(cfg => {
            const dist = cfg.distribution || {};
            const prov = cfg.providers || {};
            const tenantObj = appConfigManagerModule.tenants.find(t => t.tenantId === cfg.tenantId);
            const tenantName = tenantObj ? (tenantObj.name || tenantObj.tenantId) : cfg.tenantId;
            const brandObj = appConfigManagerModule.brands.find(b => b.brandId === cfg.brandId);
            const brandName = brandObj ? brandObj.displayName : cfg.brandId;
            const logoUrl = brandObj?.visual?.logoUrl || 'https://storage.googleapis.com/bluesystem-assets/logo.png';

            const status = cfg.status || 'ACTIVE';
            const statusBadge = status === 'ACTIVE'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>`
                : status === 'DRAFT'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DRAFT</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">${status}</span>`;

            const platformIcon = cfg.platform === 'ANDROID' ? '🤖' : cfg.platform === 'IOS' ? '🍎' : '🌐';
            const flagsCount = cfg.featureFlags ? Object.keys(cfg.featureFlags).filter(k => cfg.featureFlags[k]).length : 0;

            html += `
                <div class="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition duration-200 relative overflow-hidden">
                    <div class="space-y-3">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0">
                                    <img src="${logoUrl}" alt="${brandName}" class="max-h-full max-w-full object-contain" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
                                </div>
                                <div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-sm font-black text-white">${dist.appName || 'Sin Nombre'}</span>
                                        <span class="text-xs">${platformIcon}</span>
                                    </div>
                                    <p class="text-[10px] text-slate-500 font-mono truncate">ID: ${cfg.configId}</p>
                                </div>
                            </div>
                            <div>${statusBadge}</div>
                        </div>

                        <!-- Details Box -->
                        <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🏢 Tenant:</span>
                                <span class="font-bold text-slate-200 truncate max-w-[150px]">${tenantName}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🎨 Marca:</span>
                                <span class="font-semibold text-slate-300 truncate max-w-[150px]">${brandName}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>📦 Package / App ID:</span>
                                <span class="font-mono text-indigo-400 font-bold truncate max-w-[150px]">${dist.applicationId || dist.bundleId || '-'}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🏷️ Versión:</span>
                                <span class="font-mono text-slate-300 font-bold">v${dist.versionName || '1.0.0'} (${dist.buildNumber || 100})</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🌐 Entorno:</span>
                                <span class="font-mono text-amber-400 font-bold text-[10px]">${cfg.environment || 'PRODUCTION'}</span>
                            </div>
                        </div>

                        <!-- Providers & Flags Summary -->
                        <div class="flex items-center justify-between text-[10px] text-slate-400 px-1">
                            <span>🔥 Firebase: <strong class="text-slate-200">${prov.firebaseProjectId || 'bluesystem-core'}</strong></span>
                            <span>⚡ Flags: <strong class="text-emerald-400">${flagsCount} activos</strong></span>
                        </div>
                    </div>

                    <!-- Bottom Actions -->
                    <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button onclick="appConfigManagerModule.openPreviewModal('${cfg.configId}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <span>👁️</span> Preview
                        </button>
                        <button onclick="appConfigManagerModule.openConfigModal('${cfg.configId}')" class="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <span>✏️</span> Editar Config
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    // ──────────────────────────────────────────────────────────────────────────
    // MODAL DE CREACIÓN / EDICIÓN DE APP CONFIG
    // ──────────────────────────────────────────────────────────────────────────
    openConfigModal: (configId) => {
        const cfg = configId ? appConfigManagerModule.appConfigs.find(c => c.configId === configId) : null;
        appConfigManagerModule.currentEditingConfig = cfg;

        const isEditing = !!cfg;
        const dist = cfg?.distribution || {};
        const prov = cfg?.providers || {};
        const selectedTenantId = cfg?.tenantId || (appConfigManagerModule.tenants[0]?.tenantId || '');

        const tenantOptions = appConfigManagerModule.tenants.map(t => {
            const isSelected = selectedTenantId === t.tenantId;
            return `<option value="${t.tenantId}" ${isSelected ? 'selected' : ''}>${t.name || t.tenantId} (${t.tenantId})</option>`;
        }).join('');

        const modalBackdrop = document.getElementById('ac-modal-backdrop');
        const modalContent = document.getElementById('ac-modal-content');
        if (!modalBackdrop || !modalContent) return;

        modalContent.innerHTML = `
            <!-- Modal Header -->
            <div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">📱</span>
                    <div>
                        <h3 class="text-lg font-black text-white">${isEditing ? 'Editar Configuración de App' : 'Nueva Configuración de Aplicación'}</h3>
                        <p class="text-xs text-slate-400">${isEditing ? `Modificando especificación ${cfg.configId}` : 'Ensambla Tenant, Brand y especificaciones de plataforma'}</p>
                    </div>
                </div>
                <button onclick="appConfigManagerModule.closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold">
                    ✕
                </button>
            </div>

            <!-- Modal Form -->
            <form id="ac-config-form" onsubmit="appConfigManagerModule.saveConfig(event)" class="p-6 space-y-6 flex-1">
                <!-- Section 1: Tenant & Brand Binding -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>1.</span> Vinculación Tenant, Brand & Suscripción
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Tenant Propietario *</label>
                            <select id="ac-field-tenantId" required onchange="appConfigManagerModule.onModalTenantChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                ${tenantOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Marca Comercial (Brand) *</label>
                            <select id="ac-field-brandId" required onchange="appConfigManagerModule.onModalBrandChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <!-- Populated dynamically -->
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Config ID (Inmutable) *</label>
                            <input type="text" id="ac-field-configId" value="${cfg?.configId || ''}" ${isEditing ? 'disabled' : ''} required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}" placeholder="config-fitoni-android-prod">
                        </div>
                    </div>

                    <!-- Subscription & Gatekeeper Read-Only Binding -->
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400">💳 Suscripción del Tenant:</span>
                            <span class="font-bold text-indigo-300" id="ac-sub-info-display">Validando...</span>
                        </div>
                        <span class="text-[10px] text-emerald-400 uppercase font-mono font-bold" id="ac-gatekeeper-badge">Gatekeeper Conforme</span>
                    </div>
                </div>

                <!-- Section 2: Plataforma & Distribución -->
                <div class="space-y-4 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>2.</span> Plataforma & Metadatos de Distribución
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Plataforma Destino *</label>
                            <select id="ac-field-platform" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="ANDROID" ${cfg?.platform === 'ANDROID' ? 'selected' : ''}>ANDROID</option>
                                <option value="IOS" ${cfg?.platform === 'IOS' ? 'selected' : ''}>IOS (Schema)</option>
                                <option value="WEB" ${cfg?.platform === 'WEB' ? 'selected' : ''}>WEB</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Entorno de Ejecución *</label>
                            <select id="ac-field-environment" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="DEVELOPMENT" ${cfg?.environment === 'DEVELOPMENT' ? 'selected' : ''}>DEVELOPMENT</option>
                                <option value="STAGING" ${cfg?.environment === 'STAGING' ? 'selected' : ''}>STAGING</option>
                                <option value="PRODUCTION" ${cfg?.environment === 'PRODUCTION' || !cfg ? 'selected' : ''}>PRODUCTION</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Estado de Configuración</label>
                            <select id="ac-field-status" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="ACTIVE" ${cfg?.status === 'ACTIVE' || !cfg ? 'selected' : ''}>ACTIVE (READY_FOR_BUILD)</option>
                                <option value="DRAFT" ${cfg?.status === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
                                <option value="DEPRECATED" ${cfg?.status === 'DEPRECATED' ? 'selected' : ''}>DEPRECATED</option>
                                <option value="ARCHIVED" ${cfg?.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVED</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">App Name (Launcher) *</label>
                            <input type="text" id="ac-dist-appName" value="${dist.appName || ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" placeholder="Ej: Fitoni Express">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Application ID / Package *</label>
                            <input type="text" id="ac-dist-applicationId" value="${dist.applicationId || ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono" placeholder="com.fitoni.express">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Version Name *</label>
                            <input type="text" id="ac-dist-versionName" value="${dist.versionName || '1.0.0'}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono" placeholder="1.0.0">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Build Number *</label>
                            <input type="number" id="ac-dist-buildNumber" value="${dist.buildNumber || 100}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono" placeholder="100">
                        </div>
                    </div>
                </div>

                <!-- Section 3: Proveedores & Llaves -->
                <div class="space-y-4 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>3.</span> Proveedores de Infraestructura
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Firebase Project ID</label>
                            <input type="text" id="ac-prov-firebaseProjectId" value="${prov.firebaseProjectId || 'bluesystem-core'}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono" placeholder="bluesystem-core">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Firebase App ID</label>
                            <input type="text" id="ac-prov-firebaseAppId" value="${prov.firebaseAppId || '1:123456789:android:abcdef'}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono" placeholder="1:123456789:android:abcdef">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Google Maps API Key</label>
                            <input type="text" id="ac-prov-mapsApiKey" value="${prov.mapsApiKey || 'AIzaSyCoreDefaultKey'}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono" placeholder="AIzaSy...">
                        </div>
                    </div>
                </div>

                <!-- Modal Footer Actions -->
                <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2 text-[10px] text-amber-400 font-mono">
                        <span>🔒</span>
                        <span>READY_FOR_BUILD Barrier: Guardar NO dispara compilación ni release</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <button type="button" onclick="appConfigManagerModule.closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">
                            Cancelar
                        </button>
                        <button type="submit" id="ac-save-btn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                            <span>💾</span> Guardar Configuración
                        </button>
                    </div>
                </div>
            </form>
        `;

        modalBackdrop.classList.remove('hidden');
        appConfigManagerModule.onModalTenantChange(selectedTenantId);
    },

    onModalTenantChange: (tenantId) => {
        const brandSelect = document.getElementById('ac-field-brandId');
        if (!brandSelect) return;

        // Strict Tenant Isolation: Only show brands belonging to this tenant
        const matchingBrands = appConfigManagerModule.brands.filter(b => b.tenantId === tenantId);
        if (matchingBrands.length === 0) {
            brandSelect.innerHTML = '<option value="">Sin marcas creadas para este tenant</option>';
        } else {
            const currentBrandId = appConfigManagerModule.currentEditingConfig?.brandId;
            brandSelect.innerHTML = matchingBrands.map(b => {
                const isSelected = currentBrandId === b.brandId;
                return `<option value="${b.brandId}" ${isSelected ? 'selected' : ''}>${b.displayName} (${b.brandId})</option>`;
            }).join('');
        }

        // Validate subscription
        const tenant = appConfigManagerModule.tenants.find(t => t.tenantId === tenantId);
        const subDisplay = document.getElementById('ac-sub-info-display');
        if (subDisplay && tenant) {
            const sub = appConfigManagerModule.subscriptions.find(s => s.subscriptionId === tenant.subscriptionId);
            subDisplay.textContent = sub ? `${sub.planName || sub.planTier} (Contrato: ${sub.subscriptionId})` : 'Plan Standard Heredado';
        }

        // Auto-generate configId if creating
        if (!appConfigManagerModule.currentEditingConfig) {
            const configIdInput = document.getElementById('ac-field-configId');
            const appIdInput = document.getElementById('ac-dist-applicationId');
            const appNameInput = document.getElementById('ac-dist-appName');
            const brandObj = matchingBrands[0];
            const slug = brandObj ? brandObj.slug : tenantId.replace('ten-live-', '');

            if (configIdInput) configIdInput.value = `config-${slug}-android-prod`;
            if (appIdInput) appIdInput.value = `com.${slug.replace(/[^a-z0-9]/g, '')}.delivery`;
            if (appNameInput && brandObj) appNameInput.value = brandObj.displayName;
        }
    },

    onModalBrandChange: (brandId) => {
        const brand = appConfigManagerModule.brands.find(b => b.brandId === brandId);
        if (brand && !appConfigManagerModule.currentEditingConfig) {
            const appNameInput = document.getElementById('ac-dist-appName');
            if (appNameInput) appNameInput.value = brand.displayName;
        }
    },

    openPreviewModal: (configId) => {
        const cfg = appConfigManagerModule.appConfigs.find(c => c.configId === configId);
        if (!cfg) return;

        const dist = cfg.distribution || {};
        const brandObj = appConfigManagerModule.brands.find(b => b.brandId === cfg.brandId);
        const visual = brandObj?.visual || {};
        const primary = visual.primaryColor || '#0284C7';
        const bg = visual.backgroundColor || '#0F172A';
        const text = visual.textColor || '#F8FAFC';
        const logoUrl = visual.logoUrl || 'https://storage.googleapis.com/bluesystem-assets/logo.png';

        const modalBackdrop = document.getElementById('ac-modal-backdrop');
        const modalContent = document.getElementById('ac-modal-content');
        if (!modalBackdrop || !modalContent) return;

        modalContent.innerHTML = `
            <div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">👁️</span>
                    <div>
                        <h3 class="text-lg font-black text-white">App Preview: ${dist.appName || cfg.configId}</h3>
                        <p class="text-xs text-slate-400">Previsualización de producto comercial compilable (Read-Only Mockup)</p>
                    </div>
                </div>
                <button onclick="appConfigManagerModule.closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>
            <div class="p-6 space-y-4">
                <div class="max-w-xs mx-auto rounded-3xl p-4 shadow-2xl border-4 border-slate-800" style="background-color: ${bg}; color: ${text};">
                    <div class="flex justify-between items-center pb-3 border-b border-slate-700/40">
                        <div class="flex items-center gap-2">
                            <img src="${logoUrl}" class="w-7 h-7 object-contain">
                            <span class="font-bold text-xs">${dist.appName || 'App Name'}</span>
                        </div>
                        <span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style="background-color: ${primary}; color: #fff;">${cfg.platform}</span>
                    </div>
                    <div class="py-6 text-center space-y-2">
                        <p class="text-xs font-bold">Package: ${dist.applicationId || 'com.example'}</p>
                        <p class="text-[10px] opacity-75">Versión ${dist.versionName || '1.0.0'} (${dist.buildNumber || 100})</p>
                        <div class="p-2.5 rounded-xl text-[10px] text-left bg-slate-950/50 border border-slate-800 space-y-1">
                            <p>🏢 Tenant: <strong>${cfg.tenantId}</strong></p>
                            <p>🎨 Brand: <strong>${brandObj?.displayName || cfg.brandId}</strong></p>
                            <p>🌐 Entorno: <strong>${cfg.environment}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
                <button onclick="appConfigManagerModule.closeModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">Cerrar Preview</button>
            </div>
        `;

        modalBackdrop.classList.remove('hidden');
    },

    saveConfig: async (event) => {
        event.preventDefault();

        const isEditing = !!appConfigManagerModule.currentEditingConfig;
        const configId = document.getElementById('ac-field-configId').value.trim();
        const tenantId = document.getElementById('ac-field-tenantId').value.trim();
        const brandId = document.getElementById('ac-field-brandId').value.trim();
        const platform = document.getElementById('ac-field-platform').value;
        const environment = document.getElementById('ac-field-environment').value;
        const status = document.getElementById('ac-field-status').value;

        // Strict Tenant-Brand Validation
        const brandObj = appConfigManagerModule.brands.find(b => b.brandId === brandId);
        if (!brandObj || brandObj.tenantId !== tenantId) {
            alert("Error de Integridad: La marca seleccionada no pertenece al Tenant.");
            return;
        }

        const appName = document.getElementById('ac-dist-appName').value.trim();
        const applicationId = document.getElementById('ac-dist-applicationId').value.trim();
        const versionName = document.getElementById('ac-dist-versionName').value.trim();
        const buildNumber = parseInt(document.getElementById('ac-dist-buildNumber').value, 10);

        const firebaseProjectId = document.getElementById('ac-prov-firebaseProjectId').value.trim();
        const firebaseAppId = document.getElementById('ac-prov-firebaseAppId').value.trim();
        const mapsApiKey = document.getElementById('ac-prov-mapsApiKey').value.trim();

        const now = Date.now();
        const currentUser = firebase.auth().currentUser;
        const currentUid = currentUser ? currentUser.uid : 'admin_system';

        const configDocData = {
            configId,
            tenantId,
            brandId,
            platform,
            environment,
            distribution: {
                appName,
                shortName: appName.split(' ')[0],
                applicationId,
                bundleId: applicationId,
                versionName,
                buildNumber
            },
            providers: {
                firebaseProjectId,
                firebaseAppId,
                mapsApiKey
            },
            featureFlags: {
                orders: true,
                catalog: true,
                customers: true,
                fleetCore: true,
                gpsTracking: true,
                controlTower: true,
                xToYDelivery: true,
                notifications: true
            },
            status,
            schemaVersion: "1.0",
            updatedAt: now,
            updatedBy: currentUid
        };

        if (!isEditing) {
            configDocData.createdAt = now;
            configDocData.createdBy = currentUid;
        }

        const btn = document.getElementById('ac-save-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>⏳</span> Guardando...`;
        }

        try {
            // Guardar en /app_configs/{configId}
            await db.collection('app_configs').doc(configId).set(configDocData, { merge: true });

            // Registrar en /audit_events
            try {
                await db.collection('audit_events').add({
                    eventId: `audit_${Date.now()}`,
                    eventType: isEditing ? 'APP_CONFIG_UPDATED' : 'APP_CONFIG_CREATED',
                    actorUid: currentUid,
                    targetConfigId: configId,
                    targetTenantId: tenantId,
                    targetBrandId: brandId,
                    timestamp: now,
                    metadata: { platform, environment, applicationId, status }
                });
            } catch (auditErr) {
                console.warn("[APP_CONFIG_MANAGER] No se pudo registrar auditoría:", auditErr);
            }

            console.log("[APP_CONFIG_MANAGER] 🟢 READY_FOR_BUILD BARRIER CHECK: Configuración guardada. Cero invocaciones a Gradle/Build Engine.");
            alert(`Configuración de aplicación ${appName} (${configId}) guardada exitosamente.`);
            appConfigManagerModule.closeModal();
        } catch (err) {
            console.error("[APP_CONFIG_MANAGER] Error guardando app_config:", err);
            alert("Error al guardar la configuración: " + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>💾</span> Guardar Configuración`;
            }
        }
    },

    closeModal: () => {
        const modalBackdrop = document.getElementById('ac-modal-backdrop');
        if (modalBackdrop) modalBackdrop.classList.add('hidden');
        appConfigManagerModule.currentEditingConfig = null;
    }
};

window.appConfigManagerModule = appConfigManagerModule;
