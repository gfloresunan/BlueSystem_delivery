// Subscription & Feature Manager — Enterprise Multi-Tenant Commercial Cockpit v1.0.0
// BlueSystem Delivery Enterprise — Actividad #22
// Single Core / Zero Forks / Configuration-Driven Commercial Transformation

const subscriptionManagerModule = {
    currentTab: 'subscriptions', // 'subscriptions' | 'plans' | 'features'
    subscriptions: [],
    tenants: [],
    brands: [],
    searchTerm: '',
    selectedTenantFilter: 'all',
    selectedStatusFilter: 'all',
    currentEditingSubscription: null,
    unsubscribeSubscriptions: null,

    // Canonical Catalog definitions derived from Gatekeeper / Platform Models
    PLAN_CATALOG: {
        STARTER: {
            planTier: 'STARTER',
            planName: 'Plan Starter',
            description: 'Ideal para comercios individuales que inician su operación',
            defaultEntitlements: ['ORDERS', 'CATALOG', 'CUSTOMERS'],
            defaultQuotas: {
                maxBusinesses: 1,
                maxBranches: 1,
                maxUsers: 3,
                maxCouriers: 2,
                maxOrders: 300,
                maxStorageMb: 500,
                maxApiRequests: 1000
            }
        },
        PROFESSIONAL: {
            planTier: 'PROFESSIONAL',
            planName: 'Plan Professional',
            description: 'Para negocios consolidados con flota de reparto y finanzas',
            defaultEntitlements: [
                'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE',
                'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING',
                'X_TO_Y_DELIVERY', 'NOTIFICATIONS'
            ],
            defaultQuotas: {
                maxBusinesses: 3,
                maxBranches: 5,
                maxUsers: 15,
                maxCouriers: 10,
                maxOrders: 3000,
                maxStorageMb: 2000,
                maxApiRequests: 10000
            }
        },
        ENTERPRISE: {
            planTier: 'ENTERPRISE',
            planName: 'Plan Enterprise Holding',
            description: 'Para cadenas comerciales, holdings y agencias de gran escala',
            defaultEntitlements: [
                'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE',
                'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING',
                'X_TO_Y_DELIVERY', 'NOTIFICATIONS', 'ANALYTICS', 'GOVERNANCE',
                'MULTI_BRANCH', 'MULTI_BRAND', 'API_ACCESS'
            ],
            defaultQuotas: {
                maxBusinesses: -1,
                maxBranches: -1,
                maxUsers: -1,
                maxCouriers: -1,
                maxOrders: -1,
                maxStorageMb: 50000,
                maxApiRequests: 1000000
            }
        },
        CUSTOM: {
            planTier: 'CUSTOM',
            planName: 'Plan Contractual White-Label',
            description: 'Suscripción personalizada según contrato comercial exclusivo',
            defaultEntitlements: [
                'ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'FINANCE',
                'REPORTS', 'CONTROL_TOWER', 'FLEET_CORE', 'GPS_TRACKING', 'X_TO_Y_DELIVERY'
            ],
            defaultQuotas: {
                maxBusinesses: 10,
                maxBranches: 20,
                maxUsers: 50,
                maxCouriers: 30,
                maxOrders: 10000,
                maxStorageMb: 10000,
                maxApiRequests: 50000
            }
        }
    },

    MODULE_CATALOG: [
        { id: 'ORDERS', name: 'Gestión de Pedidos', category: 'Core', desc: 'Recepción, estados y despacho de pedidos' },
        { id: 'CATALOG', name: 'Catálogo de Productos', category: 'Core', desc: 'Categorías, combos, productos y precios' },
        { id: 'CUSTOMERS', name: 'Gestión de Clientes', category: 'Core', desc: 'Directorio de clientes y fidelización' },
        { id: 'PROMOTIONS', name: 'Promociones & Cupones', category: 'Marketing', desc: 'Descuentos, banners publicitarios y popups' },
        { id: 'FINANCE', name: 'Finanzas & Caja', category: 'Finanzas', desc: 'Arqueo de caja, liquidaciones y balances' },
        { id: 'REPORTS', name: 'Reportes & Exportación', category: 'Analítica', desc: 'Reportes de ventas, PDF y CSV' },
        { id: 'CONTROL_TOWER', name: 'Torre de Control 4K', category: 'Logística', desc: 'Radar de despacho en vivo y mapa (ADR-013)' },
        { id: 'FLEET_CORE', name: 'Gestión de Flota', category: 'Logística', desc: 'Padrón de motorizados y turnos' },
        { id: 'GPS_TRACKING', name: 'Telemetría GPS en Vivo', category: 'Logística', desc: 'Suscripción en tiempo real a ubicaciones' },
        { id: 'X_TO_Y_DELIVERY', name: 'Envíos Punto a Punto (X→Y)', category: 'Logística', desc: 'Geocodificación y cotizador nativo (ADR-015)' },
        { id: 'NOTIFICATIONS', name: 'Notificaciones Push FCM', category: 'Mensajería', desc: 'Alertas automáticas y personalizadas' },
        { id: 'ANALYTICS', name: 'Business Intelligence BI', category: 'Analítica', desc: 'Cohortes, retención y métricas avanzadas' },
        { id: 'GOVERNANCE', name: 'Gobernanza & Auditoría', category: 'Seguridad', desc: 'Bitácoras inmutables y monitoreo forense' },
        { id: 'MULTI_BRANCH', name: 'Multi-Sucursal', category: 'Enterprise', desc: 'Operación de múltiples sucursales físicas' },
        { id: 'MULTI_BRAND', name: 'Multi-Marca', category: 'Enterprise', desc: 'Múltiples identidades bajo un mismo tenant' },
        { id: 'API_ACCESS', name: 'Acceso a APIs & Webhooks', category: 'Integración', desc: 'API Keys para ERPs y sistemas externos' }
    ],

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
                        <p class="text-xs text-slate-300 max-w-md mx-auto">Subscription & Feature Manager requiere privilegios de Platform Admin validados.</p>
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
                            <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">💳</span>
                            <div>
                                <h2 class="text-2xl font-black text-white tracking-tight">Subscription & Feature Manager</h2>
                                <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Commercial Capability & Gatekeeper Governance Cockpit</p>
                            </div>
                        </div>
                        <p class="text-xs text-slate-400 mt-1 max-w-2xl">
                            Administración centralizada de contratos comerciales, niveles de plan, paquetes de funcionalidades, límites operacionales y asignación determinística a Tenants.
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button onclick="subscriptionManagerModule.openSubscriptionModal(null)" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                            <span>✨</span> Nueva Suscripción
                        </button>
                    </div>
                </div>

                <!-- Navigation Sub-Tabs -->
                <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <button id="sm-tab-btn-subscriptions" onclick="subscriptionManagerModule.switchSubTab('subscriptions')" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-2">
                        <span>📑</span> Suscripciones Activas
                    </button>
                    <button id="sm-tab-btn-plans" onclick="subscriptionManagerModule.switchSubTab('plans')" class="px-4 py-2 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center gap-2">
                        <span>📦</span> Catálogo de Planes
                    </button>
                    <button id="sm-tab-btn-features" onclick="subscriptionManagerModule.switchSubTab('features')" class="px-4 py-2 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center gap-2">
                        <span>⚡</span> Matriz de Features & Gatekeeper
                    </button>
                </div>

                <!-- Dynamic View Area -->
                <div id="sm-view-content" class="space-y-4">
                    <div class="flex items-center justify-center p-12">
                        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>

            <!-- Modal Subscription Editor -->
            <div id="sm-modal-backdrop" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
                <div id="sm-modal-content" class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
                    <!-- Modal Content Injected Dynamically -->
                </div>
            </div>
        `;

        await subscriptionManagerModule.loadInitialData();
        subscriptionManagerModule.renderCurrentSubTab();
    },

    loadInitialData: async () => {
        try {
            // Load Tenants & Brands
            const tenantsSnap = await db.collection('tenants').get();
            subscriptionManagerModule.tenants = tenantsSnap.docs.map(d => ({ tenantId: d.id, ...d.data() }));

            const brandsSnap = await db.collection('brands').get();
            subscriptionManagerModule.brands = brandsSnap.docs.map(d => ({ brandId: d.id, ...d.data() }));

            // Realtime Listener to /subscriptions
            if (!subscriptionManagerModule.unsubscribeSubscriptions) {
                subscriptionManagerModule.unsubscribeSubscriptions = db.collection('subscriptions').onSnapshot(snap => {
                    subscriptionManagerModule.subscriptions = snap.docs.map(d => ({ subscriptionId: d.id, ...d.data() }));
                    if (subscriptionManagerModule.currentTab === 'subscriptions') {
                        subscriptionManagerModule.renderSubscriptionsView();
                    }
                }, err => {
                    console.error("[SUBSCRIPTION_MANAGER] Error en listener de subscriptions:", err);
                });
            }
        } catch (err) {
            console.error("[SUBSCRIPTION_MANAGER] Error cargando datos iniciales:", err);
        }
    },

    switchSubTab: (tabId) => {
        subscriptionManagerModule.currentTab = tabId;

        ['subscriptions', 'plans', 'features'].forEach(t => {
            const btn = document.getElementById(`sm-tab-btn-${t}`);
            if (btn) {
                if (t === tabId) {
                    btn.className = "px-4 py-2 text-xs font-bold rounded-xl transition bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-2";
                } else {
                    btn.className = "px-4 py-2 text-xs font-bold rounded-xl transition text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center gap-2";
                }
            }
        });

        subscriptionManagerModule.renderCurrentSubTab();
    },

    renderCurrentSubTab: () => {
        switch (subscriptionManagerModule.currentTab) {
            case 'subscriptions':
                subscriptionManagerModule.renderSubscriptionsView();
                break;
            case 'plans':
                subscriptionManagerModule.renderPlansView();
                break;
            case 'features':
                subscriptionManagerModule.renderFeaturesView();
                break;
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // SUB-TAB 1: Suscripciones Activas
    // ──────────────────────────────────────────────────────────────────────────
    renderSubscriptionsView: () => {
        const container = document.getElementById('sm-view-content');
        if (!container) return;

        let filtered = subscriptionManagerModule.subscriptions.filter(sub => {
            const matchesSearch = !subscriptionManagerModule.searchTerm ||
                (sub.planName && sub.planName.toLowerCase().includes(subscriptionManagerModule.searchTerm)) ||
                (sub.subscriptionId && sub.subscriptionId.toLowerCase().includes(subscriptionManagerModule.searchTerm)) ||
                (sub.tenantId && sub.tenantId.toLowerCase().includes(subscriptionManagerModule.searchTerm)) ||
                (sub.planTier && sub.planTier.toLowerCase().includes(subscriptionManagerModule.searchTerm));

            const matchesTenant = subscriptionManagerModule.selectedTenantFilter === 'all' || sub.tenantId === subscriptionManagerModule.selectedTenantFilter;
            const matchesStatus = subscriptionManagerModule.selectedStatusFilter === 'all' || (sub.status || 'ACTIVE') === subscriptionManagerModule.selectedStatusFilter;

            return matchesSearch && matchesTenant && matchesStatus;
        });

        const tenantOptions = '<option value="all">Todos los Tenants</option>' +
            subscriptionManagerModule.tenants.map(t => `<option value="${t.tenantId}" ${subscriptionManagerModule.selectedTenantFilter === t.tenantId ? 'selected' : ''}>${t.name || t.tenantId}</option>`).join('');

        let html = `
            <!-- Filters & Search Bar -->
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
                <div class="relative w-full md:w-80">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">🔍</span>
                    <input type="text" value="${subscriptionManagerModule.searchTerm}" oninput="subscriptionManagerModule.onSearch(this.value)" placeholder="Buscar suscripción, tenant, ID..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono">
                </div>

                <div class="flex items-center gap-3 w-full md:w-auto">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400 font-bold">🏢 Tenant:</span>
                        <select onchange="subscriptionManagerModule.onTenantFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500">
                            ${tenantOptions}
                        </select>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400 font-bold">⚡ Estado:</span>
                        <select onchange="subscriptionManagerModule.onStatusFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500">
                            <option value="all" ${subscriptionManagerModule.selectedStatusFilter === 'all' ? 'selected' : ''}>Todos</option>
                            <option value="ACTIVE" ${subscriptionManagerModule.selectedStatusFilter === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                            <option value="TRIAL" ${subscriptionManagerModule.selectedStatusFilter === 'TRIAL' ? 'selected' : ''}>TRIAL</option>
                            <option value="SUSPENDED" ${subscriptionManagerModule.selectedStatusFilter === 'SUSPENDED' ? 'selected' : ''}>SUSPENDED</option>
                            <option value="PAST_DUE" ${subscriptionManagerModule.selectedStatusFilter === 'PAST_DUE' ? 'selected' : ''}>PAST_DUE</option>
                            <option value="CANCELLED" ${subscriptionManagerModule.selectedStatusFilter === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        if (filtered.length === 0) {
            html += `
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                    <span class="text-4xl">💳</span>
                    <h3 class="text-sm font-bold text-slate-200">No hay contratos de suscripción activos</h3>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto">Crea una nueva suscripción para vincular un plan comercial a un Tenant.</p>
                    <button onclick="subscriptionManagerModule.openSubscriptionModal(null)" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">
                        Crear Primera Suscripción
                    </button>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        html += `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">`;

        filtered.forEach(sub => {
            const tenantObj = subscriptionManagerModule.tenants.find(t => t.tenantId === sub.tenantId);
            const tenantName = tenantObj ? (tenantObj.name || tenantObj.tenantId) : sub.tenantId;
            const brandObj = subscriptionManagerModule.brands.find(b => b.tenantId === sub.tenantId);
            const brandName = brandObj ? brandObj.displayName : 'Sin Marca Asociada';

            const status = sub.status || 'ACTIVE';
            const statusBadge = status === 'ACTIVE'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVA</span>`
                : status === 'TRIAL'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">TRIAL</span>`
                : status === 'SUSPENDED'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">SUSPENDIDA</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">${status}</span>`;

            const limits = sub.limits || {};
            const enabledCount = Array.isArray(sub.enabledFeatures) ? sub.enabledFeatures.length : 0;

            html += `
                <div class="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition duration-200 relative overflow-hidden">
                    <div class="space-y-3">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-black text-white">${sub.planName || sub.planTier}</span>
                                    <span class="text-[9px] bg-slate-800 text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded">${sub.planTier}</span>
                                </div>
                                <p class="text-[11px] text-slate-500 font-mono truncate">ID: ${sub.subscriptionId}</p>
                            </div>
                            <div>${statusBadge}</div>
                        </div>

                        <!-- Tenant & Brand Binding -->
                        <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🏢 Tenant:</span>
                                <span class="font-bold text-slate-200 truncate max-w-[160px]">${tenantName}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🎨 Brand:</span>
                                <span class="font-semibold text-slate-300 truncate max-w-[160px]">${brandName}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🔄 Facturación:</span>
                                <span class="font-mono text-indigo-400 font-bold">${sub.billingCycle || 'MONTHLY'}</span>
                            </div>
                        </div>

                        <!-- Quota Metrics Summary -->
                        <div class="space-y-1">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cuotas Operacionales:</span>
                            <div class="grid grid-cols-3 gap-1.5 text-[10px] text-center">
                                <div class="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                    <p class="text-slate-500 text-[9px]">Comercios</p>
                                    <p class="font-bold text-slate-200">${limits.maxBusinesses === -1 ? '∞' : (limits.maxBusinesses || 1)}</p>
                                </div>
                                <div class="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                    <p class="text-slate-500 text-[9px]">Usuarios</p>
                                    <p class="font-bold text-slate-200">${limits.maxUsers === -1 ? '∞' : (limits.maxUsers || 3)}</p>
                                </div>
                                <div class="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                    <p class="text-slate-500 text-[9px]">Features</p>
                                    <p class="font-bold text-emerald-400">${enabledCount} / 16</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Actions -->
                    <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button onclick="subscriptionManagerModule.openSubscriptionModal('${sub.subscriptionId}')" class="w-full px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1">
                            <span>✏️</span> Editar Configuración
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    // ──────────────────────────────────────────────────────────────────────────
    // SUB-TAB 2: Catálogo de Planes Canónicos
    // ──────────────────────────────────────────────────────────────────────────
    renderPlansView: () => {
        const container = document.getElementById('sm-view-content');
        if (!container) return;

        let html = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        `;

        Object.keys(subscriptionManagerModule.PLAN_CATALOG).forEach(tierKey => {
            const plan = subscriptionManagerModule.PLAN_CATALOG[tierKey];
            const quotas = plan.defaultQuotas;
            const isEnterprise = tierKey === 'ENTERPRISE';

            html += `
                <div class="bg-slate-900 border ${isEnterprise ? 'border-indigo-500/50 shadow-indigo-500/10' : 'border-slate-800'} rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">${plan.planTier}</span>
                            ${isEnterprise ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">RECOMENDADO</span>' : ''}
                        </div>
                        <div>
                            <h3 class="text-base font-black text-white">${plan.planName}</h3>
                            <p class="text-xs text-slate-400 mt-1">${plan.description}</p>
                        </div>

                        <!-- Quota Card -->
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1 text-xs text-slate-300">
                            <div class="flex justify-between"><span>Comercios Máx:</span><span class="font-bold text-white">${quotas.maxBusinesses === -1 ? 'Ilimitado' : quotas.maxBusinesses}</span></div>
                            <div class="flex justify-between"><span>Sucursales:</span><span class="font-bold text-white">${quotas.maxBranches === -1 ? 'Ilimitado' : quotas.maxBranches}</span></div>
                            <div class="flex justify-between"><span>Usuarios:</span><span class="font-bold text-white">${quotas.maxUsers === -1 ? 'Ilimitado' : quotas.maxUsers}</span></div>
                            <div class="flex justify-between"><span>Motorizados:</span><span class="font-bold text-white">${quotas.maxCouriers === -1 ? 'Ilimitado' : quotas.maxCouriers}</span></div>
                            <div class="flex justify-between"><span>Pedidos/mes:</span><span class="font-bold text-white">${quotas.maxOrders === -1 ? 'Ilimitado' : quotas.maxOrders}</span></div>
                            <div class="flex justify-between"><span>Storage:</span><span class="font-bold text-white">${quotas.maxStorageMb} MB</span></div>
                        </div>

                        <!-- Features Included -->
                        <div class="space-y-1.5">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Módulos Incluidos (${plan.defaultEntitlements.length}):</span>
                            <div class="flex flex-wrap gap-1">
                                ${plan.defaultEntitlements.map(mod => `<span class="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 border border-slate-800 text-slate-300 font-mono">${mod}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    // ──────────────────────────────────────────────────────────────────────────
    // SUB-TAB 3: Matriz de Features & Gatekeeper
    // ──────────────────────────────────────────────────────────────────────────
    renderFeaturesView: () => {
        const container = document.getElementById('sm-view-content');
        if (!container) return;

        let html = `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div>
                        <h3 class="text-sm font-black text-white">Catálogo Canónico de Módulos (16 Módulos Core)</h3>
                        <p class="text-xs text-slate-400">Matriz comparativa de capacidades por nivel de plan evaluada por Gatekeeper Engine (Default Deny)</p>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                            <tr>
                                <th class="p-3">Módulo Capability</th>
                                <th class="p-3">Categoría</th>
                                <th class="p-3 text-center">Starter</th>
                                <th class="p-3 text-center">Professional</th>
                                <th class="p-3 text-center">Enterprise</th>
                                <th class="p-3 text-center">Custom</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60 text-slate-200">
        `;

        subscriptionManagerModule.MODULE_CATALOG.forEach(mod => {
            const hasStarter = subscriptionManagerModule.PLAN_CATALOG.STARTER.defaultEntitlements.includes(mod.id);
            const hasPro = subscriptionManagerModule.PLAN_CATALOG.PROFESSIONAL.defaultEntitlements.includes(mod.id);
            const hasEnt = subscriptionManagerModule.PLAN_CATALOG.ENTERPRISE.defaultEntitlements.includes(mod.id);
            const hasCustom = subscriptionManagerModule.PLAN_CATALOG.CUSTOM.defaultEntitlements.includes(mod.id);

            html += `
                <tr class="hover:bg-slate-800/40 transition">
                    <td class="p-3">
                        <p class="font-bold text-white">${mod.name}</p>
                        <p class="text-[10px] text-slate-500 font-mono">${mod.id} — ${mod.desc}</p>
                    </td>
                    <td class="p-3">
                        <span class="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-indigo-300 font-mono">${mod.category}</span>
                    </td>
                    <td class="p-3 text-center">${hasStarter ? '🟢' : '—'}</td>
                    <td class="p-3 text-center">${hasPro ? '🟢' : '—'}</td>
                    <td class="p-3 text-center">${hasEnt ? '🟢' : '—'}</td>
                    <td class="p-3 text-center">${hasCustom ? '🟢' : '—'}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    // ──────────────────────────────────────────────────────────────────────────
    // MODAL DE CREACIÓN / EDICIÓN DE SUSCRIPCIÓN
    // ──────────────────────────────────────────────────────────────────────────
    openSubscriptionModal: (subscriptionId) => {
        const sub = subscriptionId ? subscriptionManagerModule.subscriptions.find(s => s.subscriptionId === subscriptionId) : null;
        subscriptionManagerModule.currentEditingSubscription = sub;

        const isEditing = !!sub;
        const limits = sub?.limits || subscriptionManagerModule.PLAN_CATALOG.STARTER.defaultQuotas;
        const currentTier = sub?.planTier || 'STARTER';
        const enabledFeatures = sub?.enabledFeatures || subscriptionManagerModule.PLAN_CATALOG.STARTER.defaultEntitlements;

        const tenantOptions = subscriptionManagerModule.tenants.map(t => {
            const isSelected = sub?.tenantId === t.tenantId;
            return `<option value="${t.tenantId}" ${isSelected ? 'selected' : ''}>${t.name || t.tenantId} (${t.tenantId})</option>`;
        }).join('');

        const modalBackdrop = document.getElementById('sm-modal-backdrop');
        const modalContent = document.getElementById('sm-modal-content');
        if (!modalBackdrop || !modalContent) return;

        modalContent.innerHTML = `
            <!-- Modal Header -->
            <div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">💳</span>
                    <div>
                        <h3 class="text-lg font-black text-white">${isEditing ? 'Editar Suscripción Comercial' : 'Nueva Suscripción'}</h3>
                        <p class="text-xs text-slate-400">${isEditing ? `Modificando contrato ${sub.subscriptionId}` : 'Configura el plan, cuotas y módulos para un Tenant'}</p>
                    </div>
                </div>
                <button onclick="subscriptionManagerModule.closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold">
                    ✕
                </button>
            </div>

            <!-- Modal Form -->
            <form id="sm-sub-form" onsubmit="subscriptionManagerModule.saveSubscription(event)" class="p-6 space-y-6 flex-1">
                <!-- Section 1: Tenant & Plan -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>1.</span> Contrato & Nivel de Plan
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Tenant Propietario *</label>
                            <select id="sm-field-tenantId" required onchange="subscriptionManagerModule.onTenantSelect(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                ${tenantOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Nivel de Plan (Plan Tier) *</label>
                            <select id="sm-field-planTier" required onchange="subscriptionManagerModule.onPlanTierSelect(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="STARTER" ${currentTier === 'STARTER' ? 'selected' : ''}>STARTER</option>
                                <option value="PROFESSIONAL" ${currentTier === 'PROFESSIONAL' ? 'selected' : ''}>PROFESSIONAL</option>
                                <option value="ENTERPRISE" ${currentTier === 'ENTERPRISE' ? 'selected' : ''}>ENTERPRISE</option>
                                <option value="CUSTOM" ${currentTier === 'CUSTOM' ? 'selected' : ''}>CUSTOM</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Nombre Comercial del Plan</label>
                            <input type="text" id="sm-field-planName" value="${sub?.planName || 'Plan Starter'}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Subscription ID (Inmutable) *</label>
                            <input type="text" id="sm-field-subscriptionId" value="${sub?.subscriptionId || ''}" ${isEditing ? 'disabled' : ''} required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}" placeholder="sub-live-tenant-01">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Estado de Ciclo de Vida</label>
                            <select id="sm-field-status" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="ACTIVE" ${sub?.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                                <option value="TRIAL" ${sub?.status === 'TRIAL' ? 'selected' : ''}>TRIAL</option>
                                <option value="SUSPENDED" ${sub?.status === 'SUSPENDED' ? 'selected' : ''}>SUSPENDED</option>
                                <option value="PAST_DUE" ${sub?.status === 'PAST_DUE' ? 'selected' : ''}>PAST_DUE</option>
                                <option value="CANCELLED" ${sub?.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                                <option value="ARCHIVED" ${sub?.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVED</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Ciclo de Facturación</label>
                            <select id="sm-field-billingCycle" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="MONTHLY" ${sub?.billingCycle === 'MONTHLY' ? 'selected' : ''}>MENSUAL (MONTHLY)</option>
                                <option value="ANNUAL" ${sub?.billingCycle === 'ANNUAL' ? 'selected' : ''}>ANUAL (ANNUAL)</option>
                                <option value="CUSTOM" ${sub?.billingCycle === 'CUSTOM' ? 'selected' : ''}>CUSTOM</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Cuotas Operacionales -->
                <div class="space-y-4 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>2.</span> Cuotas & Límites Operacionales (-1 = Ilimitado)
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Máx Comercios</label>
                            <input type="number" id="sm-quota-maxBusinesses" value="${limits.maxBusinesses ?? 1}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Máx Sucursales</label>
                            <input type="number" id="sm-quota-maxBranches" value="${limits.maxBranches ?? 1}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Máx Usuarios</label>
                            <input type="number" id="sm-quota-maxUsers" value="${limits.maxUsers ?? 3}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Máx Motorizados</label>
                            <input type="number" id="sm-quota-maxCouriers" value="${limits.maxCouriers ?? 2}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Máx Pedidos/Mes</label>
                            <input type="number" id="sm-quota-maxOrders" value="${limits.maxOrders ?? 300}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Storage (MB)</label>
                            <input type="number" id="sm-quota-maxStorageMb" value="${limits.maxStorageMb ?? 500}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">API Requests/Mes</label>
                            <input type="number" id="sm-quota-maxApiRequests" value="${limits.maxApiRequests ?? 1000}" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono">
                        </div>
                    </div>
                </div>

                <!-- Section 3: Feature Matrix Selection -->
                <div class="space-y-4 pt-2 border-t border-slate-800">
                    <div class="flex items-center justify-between">
                        <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>3.</span> Módulos Habilitados (Gatekeeper Entitlements)
                        </h4>
                        <div class="flex gap-2">
                            <button type="button" onclick="subscriptionManagerModule.selectAllModules(true)" class="text-[10px] text-indigo-400 hover:underline">Marcar Todos</button>
                            <span class="text-slate-600">|</span>
                            <button type="button" onclick="subscriptionManagerModule.selectAllModules(false)" class="text-[10px] text-slate-400 hover:underline">Desmarcar Todos</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                        ${subscriptionManagerModule.MODULE_CATALOG.map(mod => {
                            const isChecked = enabledFeatures.includes(mod.id);
                            return `
                                <label class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition">
                                    <input type="checkbox" name="sm-mod-check" value="${mod.id}" ${isChecked ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
                                    <div>
                                        <p class="text-xs font-bold text-slate-200">${mod.name}</p>
                                        <p class="text-[10px] text-slate-500 font-mono">${mod.id}</p>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Modal Footer Actions -->
                <div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button type="button" onclick="subscriptionManagerModule.closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">
                        Cancelar
                    </button>
                    <button type="submit" id="sm-save-btn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                        <span>💾</span> Guardar Suscripción
                    </button>
                </div>
            </form>
        `;

        modalBackdrop.classList.remove('hidden');
    },

    onPlanTierSelect: (tier) => {
        const plan = subscriptionManagerModule.PLAN_CATALOG[tier];
        if (!plan) return;

        const nameInput = document.getElementById('sm-field-planName');
        if (nameInput) nameInput.value = plan.planName;

        // Auto populate quotas
        const quotas = plan.defaultQuotas;
        document.getElementById('sm-quota-maxBusinesses').value = quotas.maxBusinesses;
        document.getElementById('sm-quota-maxBranches').value = quotas.maxBranches;
        document.getElementById('sm-quota-maxUsers').value = quotas.maxUsers;
        document.getElementById('sm-quota-maxCouriers').value = quotas.maxCouriers;
        document.getElementById('sm-quota-maxOrders').value = quotas.maxOrders;
        document.getElementById('sm-quota-maxStorageMb').value = quotas.maxStorageMb;
        document.getElementById('sm-quota-maxApiRequests').value = quotas.maxApiRequests;

        // Auto check features
        const checkboxes = document.querySelectorAll('input[name="sm-mod-check"]');
        checkboxes.forEach(cb => {
            cb.checked = plan.defaultEntitlements.includes(cb.value);
        });
    },

    onTenantSelect: (tenantId) => {
        if (!subscriptionManagerModule.currentEditingSubscription) {
            const idInput = document.getElementById('sm-field-subscriptionId');
            if (idInput) {
                idInput.value = `sub-live-${tenantId}`;
            }
        }
    },

    selectAllModules: (checkAll) => {
        const checkboxes = document.querySelectorAll('input[name="sm-mod-check"]');
        checkboxes.forEach(cb => { cb.checked = checkAll; });
    },

    onSearch: (val) => {
        subscriptionManagerModule.searchTerm = (val || '').toLowerCase().trim();
        subscriptionManagerModule.renderSubscriptionsView();
    },

    onTenantFilterChange: (val) => {
        subscriptionManagerModule.selectedTenantFilter = val;
        subscriptionManagerModule.renderSubscriptionsView();
    },

    onStatusFilterChange: (val) => {
        subscriptionManagerModule.selectedStatusFilter = val;
        subscriptionManagerModule.renderSubscriptionsView();
    },

    saveSubscription: async (event) => {
        event.preventDefault();

        const isEditing = !!subscriptionManagerModule.currentEditingSubscription;
        const subscriptionId = document.getElementById('sm-field-subscriptionId').value.trim();
        const tenantId = document.getElementById('sm-field-tenantId').value.trim();
        const planTier = document.getElementById('sm-field-planTier').value;
        const planName = document.getElementById('sm-field-planName').value.trim();
        const status = document.getElementById('sm-field-status').value;
        const billingCycle = document.getElementById('sm-field-billingCycle').value;

        // Collect checked features
        const checkedFeatures = [];
        const uncheckedFeatures = [];
        const checkboxes = document.querySelectorAll('input[name="sm-mod-check"]');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                checkedFeatures.push(cb.value);
            } else {
                uncheckedFeatures.push(cb.value);
            }
        });

        // Collect quotas
        const limits = {
            maxBusinesses: parseInt(document.getElementById('sm-quota-maxBusinesses').value, 10),
            maxBranches: parseInt(document.getElementById('sm-quota-maxBranches').value, 10),
            maxUsers: parseInt(document.getElementById('sm-quota-maxUsers').value, 10),
            maxCouriers: parseInt(document.getElementById('sm-quota-maxCouriers').value, 10),
            maxOrders: parseInt(document.getElementById('sm-quota-maxOrders').value, 10),
            maxStorageMb: parseInt(document.getElementById('sm-quota-maxStorageMb').value, 10),
            maxApiRequests: parseInt(document.getElementById('sm-quota-maxApiRequests').value, 10)
        };

        const now = Date.now();
        const currentUser = firebase.auth().currentUser;
        const currentUid = currentUser ? currentUser.uid : 'admin_system';

        const subDocData = {
            subscriptionId,
            tenantId,
            planId: `plan-${planTier.toLowerCase()}`,
            planName,
            planTier,
            status,
            startDate: isEditing && subscriptionManagerModule.currentEditingSubscription.startDate ? subscriptionManagerModule.currentEditingSubscription.startDate : now,
            endDate: null,
            billingCycle,
            enabledFeatures: checkedFeatures,
            disabledFeatures: uncheckedFeatures,
            limits,
            schemaVersion: "1.0",
            updatedAt: now,
            updatedBy: currentUid
        };

        if (!isEditing) {
            subDocData.createdAt = now;
            subDocData.createdBy = currentUid;
        }

        const btn = document.getElementById('sm-save-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>⏳</span> Guardando...`;
        }

        try {
            // 1. Guardar Suscripción en /subscriptions/{subscriptionId}
            await db.collection('subscriptions').doc(subscriptionId).set(subDocData, { merge: true });

            // 2. Vincular determinísticamente en /tenants/{tenantId}
            await db.collection('tenants').doc(tenantId).update({
                subscriptionId: subscriptionId,
                updatedAt: now,
                updatedBy: currentUid
            });

            // 3. Registrar evento en /audit_events
            try {
                await db.collection('audit_events').add({
                    eventId: `audit_${Date.now()}`,
                    eventType: isEditing ? 'SUBSCRIPTION_UPDATED' : 'SUBSCRIPTION_CREATED',
                    actorUid: currentUid,
                    targetSubscriptionId: subscriptionId,
                    targetTenantId: tenantId,
                    timestamp: now,
                    metadata: { planTier, planName, status, enabledFeaturesCount: checkedFeatures.length }
                });
            } catch (auditErr) {
                console.warn("[SUBSCRIPTION_MANAGER] No se pudo registrar auditoría:", auditErr);
            }

            alert(`Suscripción ${planName} (${subscriptionId}) guardada y asignada al Tenant ${tenantId} exitosamente.`);
            subscriptionManagerModule.closeModal();
        } catch (err) {
            console.error("[SUBSCRIPTION_MANAGER] Error guardando suscripción:", err);
            alert("Error al guardar la suscripción: " + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>💾</span> Guardar Suscripción`;
            }
        }
    },

    closeModal: () => {
        const modalBackdrop = document.getElementById('sm-modal-backdrop');
        if (modalBackdrop) modalBackdrop.classList.add('hidden');
        subscriptionManagerModule.currentEditingSubscription = null;
    }
};

window.subscriptionManagerModule = subscriptionManagerModule;
