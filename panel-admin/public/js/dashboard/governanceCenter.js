// Governance Center — Enterprise Organizational Governance Platform v2.2
// Powered by Enterprise Identity & Access Management (EIAM)
// Operational Control Console — Complete Functional Implementation

const governanceCenterModule = {
    currentSubTab: 'dashboard',
    selectedOrgId: 'all',
    globalSearchQuery: '',
    
    // Estado de Navegación Jerárquica
    breadcrumbs: [
        { id: 'root', label: 'Governance Center', type: 'root' }
    ],
    
    currentFocus: {
        type: 'root',
        data: null
    },

    // Cache local mantenido por Services
    organizations: [],
    businesses: [],
    branches: [],
    identities: [],
    nonOperationalIdentities: [],
    employees: [],
    invitations: [],
    roles: [],
    sessions: [],
    devices: [],
    auditEvents: [],

    render: async (subTabId = 'dashboard') => {
        governanceCenterModule.currentSubTab = subTabId;
        const container = document.getElementById('tab-content');
        if (!container) return;

        // REGLA #3: AUTH READY GATE — Mostrar estado de verificación y esperar validación JWT de Custom Claims
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-sans select-none">
                <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs font-mono text-indigo-400 animate-pulse font-bold">VERIFICANDO SESIÓN ADMINISTRATIVA & CUSTOM CLAIMS (AUTH READY GATE)...</p>
            </div>
        `;

        if (!window.AuthReadyGate || !window.AuthReadyGate.isReady) {
            try {
                if (window.AuthReadyGate && typeof window.AuthReadyGate.waitUntilReady === 'function') {
                    await window.AuthReadyGate.waitUntilReady();
                } else {
                    throw new Error("AuthReadyGate no está inicializado en el sistema");
                }
            } catch (authErr) {
                console.error("[GOVERNANCE_CENTER] Auth Ready Gate denegó la carga de datos:", authErr);
                container.innerHTML = `
                    <div class="bg-slate-900 border border-rose-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl font-sans my-8">
                        <span class="text-5xl">⛔</span>
                        <h3 class="text-lg font-bold text-rose-400">AUTH_CLAIMS_INVALID — Acceso Denegado</h3>
                        <p class="text-xs text-slate-300 max-w-md mx-auto">Governance Center ha bloqueado las consultas a Firestore debido a que su token JWT no cuenta con Custom Claims de administración verificados.</p>
                        <button onclick="window.dashboardLogout()" class="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition">
                            Cerrar Sesión e Intentar Nuevo Login
                        </button>
                    </div>
                `;
                return;
            }
        }

        // Renderizado del Shell SPA
        container.innerHTML = `
            <div class="space-y-6 select-none font-sans">
                <!-- Header con Branding Oficial, Buscador Global, Selector MultiTenant y Acciones -->
                <div class="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">🛡️</span>
                            <div>
                                <h2 class="text-2xl font-black text-white tracking-tight">Governance Center</h2>
                                <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Enterprise Security & Policy Engine — ABAC + RBAC v2.2</p>
                            </div>
                        </div>
                        <p class="text-xs text-slate-400 mt-1 max-w-2xl">
                            Gobierno de acceso contextual, matriz ABAC+RBAC, Policy Simulator, Risk Engine (0-100) y Custom Claims Validator.
                        </p>
                    </div>

                    <!-- Buscador Global y Selector Multi-Empresa -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div class="relative flex-1 sm:w-64">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">🔍</span>
                            <input type="text" id="gov-global-search" oninput="governanceCenterModule.onGlobalSearch(this.value)" placeholder="Buscar UID, Correo, IP, Rol..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono">
                        </div>

                        <div class="bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
                            <span class="text-xs text-slate-400 font-bold pl-2">🏙️ Tenant:</span>
                            <select id="gov-tenant-selector" onchange="governanceCenterModule.onTenantChange(this.value)" class="bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todas las Empresas (Global)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Barra de Navegación Contextual por Migas de Pan -->
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-md text-xs" id="gov-breadcrumb-bar">
                </div>

                <!-- Sub-Navegación Categorizada del Governance Center -->
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-2 flex overflow-x-auto gap-1 text-xs">
                    <button onclick="governanceCenterModule.switchSubTab('dashboard')" id="gov-tab-dashboard" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>📊</span> Dashboard
                    </button>
                    <div class="w-px bg-slate-800 my-1 shrink-0"></div>
                    <button onclick="governanceCenterModule.switchSubTab('organizations')" id="gov-tab-organizations" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>🏙️</span> Empresas
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('businesses')" id="gov-tab-businesses" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>🏪</span> Comercios
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('applications')" id="gov-tab-applications" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 hover:text-white shrink-0">
                        <span>📝</span> Solicitudes Afiliación (ADR-011)
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('courier_applications')" id="gov-tab-courier_applications" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:text-white shrink-0">
                        <span>🛵</span> Solicitudes Motorizados
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('courier_profile_requests')" id="gov-tab-courier_profile_requests" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:text-white shrink-0">
                        <span>🔧</span> Modificaciones Perfil Motorizados
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('branches')" id="gov-tab-branches" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>🏢</span> Sucursales GPS
                    </button>
                    <div class="w-px bg-slate-800 my-1 shrink-0"></div>
                    <button onclick="governanceCenterModule.switchSubTab('users')" id="gov-tab-users" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>👤</span> Identidades & Usuarios
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('employees')" id="gov-tab-employees" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>💼</span> Personal & Staff
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('invitations')" id="gov-tab-invitations" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>✉️</span> Invitaciones Workflow
                    </button>
                    <div class="w-px bg-slate-800 my-1 shrink-0"></div>
                    <button onclick="governanceCenterModule.switchSubTab('roles')" id="gov-tab-roles" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>👑</span> Roles & Comparador
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('permissions')" id="gov-tab-permissions" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>🧩</span> Permisos & Simulator
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('claims')" id="gov-tab-claims" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>🎟️</span> Claims Validator
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('sessions')" id="gov-tab-sessions" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>💻</span> Sesiones Active Map
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('devices')" id="gov-tab-devices" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>📱</span> Dispositivos Trust
                    </button>
                    <div class="w-px bg-slate-800 my-1 shrink-0"></div>
                    <button onclick="governanceCenterModule.switchSubTab('events')" id="gov-tab-events" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>📜</span> Eventos Audit
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('timeline')" id="gov-tab-timeline" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>⏱️</span> Timeline Real
                    </button>
                    <button onclick="governanceCenterModule.switchSubTab('risks')" id="gov-tab-risks" class="gov-subtab-btn px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0">
                        <span>⚠️</span> Risk Score Engine
                    </button>
                </div>

                <!-- Contenedor Dinámico Principal -->
                <div id="gov-subtab-container" class="space-y-6 min-h-[400px]">
                    <div class="flex items-center justify-center p-12">
                        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        `;

        await governanceCenterModule.loadData();
        governanceCenterModule.initRealtimeSubscriptions();
        governanceCenterModule.renderBreadcrumbs();
        governanceCenterModule.switchSubTab(subTabId);
    },

    unsubscribeIdentities: null,
    unsubscribeDevices: null,
    unsubscribeBusinesses: null,

    initRealtimeSubscriptions: () => {
        if (!governanceCenterModule.unsubscribeBusinesses && governanceService && governanceService.subscribeToBusinesses) {
            governanceCenterModule.unsubscribeBusinesses = governanceService.subscribeToBusinesses(list => {
                governanceCenterModule.businesses = list || [];
                const container = document.getElementById('gov-subtab-container');
                if (container) {
                    if (governanceCenterModule.currentSubTab === 'businesses') {
                        governanceCenterModule.renderBusinessesContent(container);
                    } else if (governanceCenterModule.currentSubTab === 'dashboard') {
                        governanceCenterModule.renderDashboardContent(container);
                    }
                }
            }, governanceCenterModule.selectedOrgId);
        }

        if (!governanceCenterModule.unsubscribeIdentities && identityService && identityService.subscribeToIdentities) {
            governanceCenterModule.unsubscribeIdentities = identityService.subscribeToIdentities(list => {
                governanceCenterModule.identities = list || [];
                const container = document.getElementById('gov-subtab-container');
                if (container) {
                    if (governanceCenterModule.currentSubTab === 'users') {
                        governanceCenterModule.renderUsersContent(container);
                    } else if (governanceCenterModule.currentSubTab === 'dashboard') {
                        governanceCenterModule.renderDashboardContent(container);
                    }
                }
            });
        }

        if (!governanceCenterModule.unsubscribeDevices && identityService && identityService.subscribeToDevices) {
            governanceCenterModule.unsubscribeDevices = identityService.subscribeToDevices(list => {
                governanceCenterModule.devices = list || [];
                const container = document.getElementById('gov-subtab-container');
                if (container && governanceCenterModule.currentSubTab === 'devices') {
                    governanceCenterModule.renderDevicesContent(container);
                }
            });
        }
    },

    // Carga unificada desde Repositorios Firestore con manejo explícito de errores de permiso
    loadData: async () => {
        try {
            const results = await Promise.allSettled([
                governanceService.getOrganizations(),
                governanceService.getBusinesses(governanceCenterModule.selectedOrgId),
                governanceService.getBranches(null, governanceCenterModule.selectedOrgId),
                identityService.getIdentities(governanceCenterModule.globalSearchQuery, 'all', 'all', governanceCenterModule.selectedOrgId),
                identityService.getEmployees(null, governanceCenterModule.selectedOrgId),
                identityService.getInvitations(),
                governanceService.getRoles(),
                identityService.getSessions(),
                identityService.getDevices(),
                identityService.getAuditEvents('all', governanceCenterModule.globalSearchQuery, 50)
            ]);

            const keys = ['organizations', 'businesses', 'branches', 'identities', 'employees', 'invitations', 'roles', 'sessions', 'devices', 'auditEvents'];
            const permissionErrors = [];

            results.forEach((res, i) => {
                const key = keys[i];
                if (res.status === 'fulfilled') {
                    governanceCenterModule[key] = res.value || [];
                } else {
                    const err = res.reason || {};
                    console.error(`[GOVERNANCE_MODULE] ⛔ PERMISSION DENIED o Error en '${key}':`, err);
                    governanceCenterModule[key] = [];
                    permissionErrors.push({
                        collection: key,
                        message: err.message || 'Permission Denied',
                        code: err.code || 'permission-denied'
                    });
                }
            });

            governanceCenterModule.permissionErrors = permissionErrors.length > 0 ? permissionErrors : null;

            // Popular selector MultiTenant
            const selector = document.getElementById('gov-tenant-selector');
            if (selector) {
                let html = `<option value="all" ${governanceCenterModule.selectedOrgId === 'all' ? 'selected' : ''}>Todas las Empresas (Global)</option>`;
                (governanceCenterModule.organizations || []).forEach(o => {
                    html += `<option value="${o.orgId}" ${governanceCenterModule.selectedOrgId === o.orgId ? 'selected' : ''}>🏙️ ${o.nombre}</option>`;
                });
                selector.innerHTML = html;
            }
        } catch (e) {
            console.error("[GOVERNANCE_MODULE] Error crítico en loadData:", e);
        }
    },

    onGlobalSearch: (query) => {
        governanceCenterModule.globalSearchQuery = query;
        governanceCenterModule.loadData().then(() => {
            governanceCenterModule.switchSubTab(governanceCenterModule.currentSubTab);
        });
    },

    onTenantChange: async (orgId) => {
        governanceCenterModule.selectedOrgId = orgId;
        if (governanceCenterModule.unsubscribeBusinesses) {
            governanceCenterModule.unsubscribeBusinesses();
            governanceCenterModule.unsubscribeBusinesses = null;
        }
        await governanceCenterModule.loadData();
        governanceCenterModule.initRealtimeSubscriptions();
        governanceCenterModule.switchSubTab(governanceCenterModule.currentSubTab);
    },

    renderBreadcrumbs: () => {
        const bar = document.getElementById('gov-breadcrumb-bar');
        if (!bar) return;

        let html = `<div class="flex items-center gap-2 overflow-x-auto py-1">`;
        governanceCenterModule.breadcrumbs.forEach((bc, idx) => {
            const isLast = idx === governanceCenterModule.breadcrumbs.length - 1;
            if (idx > 0) {
                html += `<span class="text-slate-600 font-bold">›</span>`;
            }
            if (isLast) {
                html += `<span class="font-bold text-indigo-400 flex items-center gap-1 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-800/40">${bc.label}</span>`;
            } else {
                html += `<a href="#" onclick="governanceCenterModule.navigateToBreadcrumb(${idx})" class="font-semibold text-slate-400 hover:text-white transition flex items-center gap-1">${bc.label}</a>`;
            }
        });
        html += `</div>`;

        html += `
            <div class="text-[10px] text-slate-500 font-mono flex items-center gap-2 shrink-0">
                <span>Enterprise Security Engine: ABAC + RBAC v2.2</span>
            </div>
        `;

        bar.innerHTML = html;
    },

    navigateToBreadcrumb: (index) => {
        governanceCenterModule.breadcrumbs = governanceCenterModule.breadcrumbs.slice(0, index + 1);
        const target = governanceCenterModule.breadcrumbs[index];
        governanceCenterModule.currentFocus = { type: target.type, data: target.data };
        governanceCenterModule.renderBreadcrumbs();
        governanceCenterModule.switchSubTab(governanceCenterModule.currentSubTab);
    },

    // ─── SUB-TABS ROUTING ─────────────────────────────────────────────────────

    switchSubTab: (subTabId) => {
        governanceCenterModule.currentSubTab = subTabId;

        document.querySelectorAll('.gov-subtab-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
            btn.classList.add('text-slate-400');
        });

        const activeBtn = document.getElementById(`gov-tab-${subTabId}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-400');
            activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
        }

        const container = document.getElementById('gov-subtab-container');
        if (!container) return;

        switch (subTabId) {
            case 'dashboard':
                governanceCenterModule.renderDashboardContent(container);
                break;
            case 'organizations':
                governanceCenterModule.renderOrganizationsContent(container);
                break;
            case 'businesses':
                governanceCenterModule.renderBusinessesContent(container);
                break;
            case 'applications':
                governanceCenterModule.renderApplicationsContent(container);
                break;
            case 'courier_applications':
                governanceCenterModule.renderCourierApplicationsContent(container);
                break;
            case 'courier_profile_requests':
                governanceCenterModule.renderCourierProfileRequestsContent(container);
                break;
            case 'branches':
                governanceCenterModule.renderBranchesContent(container);
                break;
            case 'users':
                governanceCenterModule.renderUsersContent(container);
                break;
            case 'employees':
                governanceCenterModule.renderEmployeesContent(container);
                break;
            case 'invitations':
                governanceCenterModule.renderInvitationsContent(container);
                break;
            case 'roles':
                governanceCenterModule.renderRolesContent(container);
                break;
            case 'permissions':
                governanceCenterModule.renderPermissionsContent(container);
                break;
            case 'claims':
                governanceCenterModule.renderClaimsContent(container);
                break;
            case 'sessions':
                governanceCenterModule.renderSessionsContent(container);
                break;
            case 'devices':
                governanceCenterModule.renderDevicesContent(container);
                break;
            case 'events':
                governanceCenterModule.renderEventsContent(container);
                break;
            case 'timeline':
                governanceCenterModule.renderTimelineContent(container);
                break;
            case 'risks':
                governanceCenterModule.renderRisksContent(container);
                break;
            default:
                governanceCenterModule.renderDashboardContent(container);
                break;
        }
    },

    // ─── 1. DASHBOARD ─────────────────────────────────────────────────────────

    renderDashboardContent: async (container) => {
        const metrics = await governanceService.getConsolidatedMetrics(governanceCenterModule.selectedOrgId);

        let errorBannerHtml = '';
        if (governanceCenterModule.permissionErrors && governanceCenterModule.permissionErrors.length > 0) {
            errorBannerHtml = `
                <div class="bg-rose-950/60 border border-rose-500/40 p-4 rounded-xl shadow-lg space-y-2 font-sans select-none">
                    <div class="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span>⛔</span>
                        <span>PERMISSION DENIED EN CONSULTAS FIRESTORE</span>
                    </div>
                    <p class="text-[11px] text-slate-300">Las siguientes colecciones rechazaron la lectura por falta de permisos en Firestore Rules:</p>
                    <div class="flex flex-wrap gap-2 pt-1">
                        ${governanceCenterModule.permissionErrors.map(err => `
                            <span class="px-2.5 py-1 bg-slate-900 border border-rose-700/50 rounded-lg text-[10px] text-rose-300 font-mono">
                                <strong>${err.collection}:</strong> ${err.message}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6">
                ${errorBannerHtml}
                <!-- Tarjetas KPI -->
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg cursor-pointer hover:border-indigo-500/50 transition" onclick="governanceCenterModule.switchSubTab('organizations')">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresas</p>
                        <p class="text-2xl font-black text-indigo-400 mt-1">${metrics.totalOrganizations}</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg cursor-pointer hover:border-cyan-500/50 transition" onclick="governanceCenterModule.switchSubTab('businesses')">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comercios</p>
                        <p class="text-2xl font-black text-cyan-400 mt-1">${metrics.totalBusinesses}</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg cursor-pointer hover:border-emerald-500/50 transition" onclick="governanceCenterModule.switchSubTab('branches')">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sucursales</p>
                        <p class="text-2xl font-black text-emerald-400 mt-1">${metrics.totalBranches}</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg cursor-pointer hover:border-blue-500/50 transition" onclick="governanceCenterModule.switchSubTab('users')">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identidades</p>
                        <p class="text-2xl font-black text-blue-400 mt-1">${governanceCenterModule.identities.length}</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg cursor-pointer hover:border-amber-500/50 transition" onclick="governanceCenterModule.switchSubTab('employees')">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empleados / Staff</p>
                        <p class="text-2xl font-black text-amber-400 mt-1">${metrics.totalEmployees}</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg cursor-pointer hover:border-rose-500/50 transition" onclick="governanceCenterModule.switchSubTab('risks')">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Score Engine</p>
                        <p class="text-2xl font-black text-rose-400 mt-1">ABAC Active</p>
                    </div>
                </div>

                <!-- Resumen de Estado del Sistema -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                        <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <span>🛡️</span> Estado de Políticas EIAM & Reglas ABAC
                        </h3>
                        <div class="space-y-2 text-xs font-mono">
                            <div class="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                <span class="text-slate-400">Policy Engine:</span>
                                <span class="text-emerald-400 font-bold">🟢 ONLINE (ABAC+RBAC Matrix)</span>
                            </div>
                            <div class="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                <span class="text-slate-400">Risk Score Auto-Mitigation:</span>
                                <span class="text-indigo-400 font-bold">⚡ ACTIVO (Score > 80 auto-block)</span>
                            </div>
                            <div class="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                <span class="text-slate-400">Custom Claims JWT Validator:</span>
                                <span class="text-cyan-400 font-bold">🎟️ FIRESTORE DUAL-WRITE</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                        <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <span>📜</span> Eventos Recientes de Seguridad
                        </h3>
                        <div class="space-y-2 text-xs font-mono">
                            ${governanceCenterModule.auditEvents.slice(0, 4).map(e => `
                                <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                                    <div class="truncate pr-2">
                                        <p class="font-bold text-slate-200">${e.eventType || 'EVENT'}</p>
                                        <p class="text-[10px] text-slate-400 truncate">${e.description || ''}</p>
                                    </div>
                                    <span class="text-[9px] text-indigo-400 shrink-0">${e.domain || 'SECURITY'}</span>
                                </div>
                            `).join('') || '<p class="text-slate-500 italic p-4 text-center">No hay eventos recientes de auditoría.</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ─── 2. EMPRESAS (ORGANIZATIONS) ──────────────────────────────────────────

    renderOrganizationsContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>🏙️</span> Empresas & Holding Multi-Tenant (${governanceCenterModule.organizations.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Gestión corporativa de organizaciones principales (Tenants Multi-Empresa).</p>
                    </div>
                    <button onclick="governanceCenterModule.openSaveOrganizationModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>➕</span> Nueva Empresa
                    </button>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Empresa / Holding</th>
                                <th class="p-4">Org ID</th>
                                <th class="p-4">Plan Enterprise</th>
                                <th class="p-4">Contacto Email</th>
                                <th class="p-4 text-center">Estado</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.organizations.map(o => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 font-sans font-bold text-white">${o.nombre}</td>
                                    <td class="p-4 text-indigo-400 font-bold">${o.orgId}</td>
                                    <td class="p-4 text-slate-300">${o.plan || 'Enterprise'}</td>
                                    <td class="p-4 text-slate-400">${o.contactoEmail || 'N/A'}</td>
                                    <td class="p-4 text-center">
                                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${o.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}">
                                            ${o.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="governanceCenterModule.openSaveOrganizationModal('${o.orgId}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700">
                                                ✏️ Editar
                                            </button>
                                            <button onclick="governanceCenterModule.deleteOrganization('${o.orgId}')" class="px-3 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold transition border border-rose-800/40">
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openSaveOrganizationModal: (orgId = null) => {
        const org = orgId ? governanceCenterModule.organizations.find(o => o.orgId === orgId) : null;
        const isEdit = !!org;

        const html = `
            <form onsubmit="governanceCenterModule.handleSaveOrganization(event, '${orgId || ''}')" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nombre de la Empresa / Holding:</label>
                    <input type="text" id="org-nombre" value="${org ? org.nombre : ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Plan Corporativo:</label>
                    <select id="org-plan" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none">
                        <option value="Enterprise MultiTenant" ${org && org.plan === 'Enterprise MultiTenant' ? 'selected' : ''}>Enterprise MultiTenant</option>
                        <option value="Corporate Gold" ${org && org.plan === 'Corporate Gold' ? 'selected' : ''}>Corporate Gold</option>
                        <option value="Standard Tenant" ${org && org.plan === 'Standard Tenant' ? 'selected' : ''}>Standard Tenant</option>
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Email de Contacto:</label>
                    <input type="email" id="org-email" value="${org ? org.contactoEmail || '' : ''}" placeholder="admin@empresa.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Teléfono corporativo:</label>
                    <input type="text" id="org-telefono" value="${org ? org.contactoTelefono || '' : ''}" placeholder="+505 8888 8888" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Estado de Operación:</label>
                    <select id="org-status" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none">
                        <option value="ACTIVE" ${!org || org.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE (Operativa)</option>
                        <option value="SUSPENDED" ${org && org.status === 'SUSPENDED' ? 'selected' : ''}>SUSPENDED (Suspendida)</option>
                    </select>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-organization')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Empresa'}
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-organization', isEdit ? 'Editar Empresa' : 'Nueva Empresa MultiTenant', html);
    },

    handleSaveOrganization: async (e, orgId) => {
        e.preventDefault();
        try {
            const orgData = {
                orgId: orgId || null,
                nombre: document.getElementById('org-nombre').value,
                plan: document.getElementById('org-plan').value,
                contactoEmail: document.getElementById('org-email').value,
                contactoTelefono: document.getElementById('org-telefono').value,
                status: document.getElementById('org-status').value
            };
            await governanceService.saveOrganization(orgData);
            drawer.close('drawer-organization');
            if (typeof toast !== 'undefined') toast.show('Empresa guardada exitosamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('organizations');
        } catch (err) {
            alert('Error al guardar empresa: ' + err.message);
        }
    },

    deleteOrganization: async (orgId) => {
        if (!confirm(`¿Confirmas la eliminación de la empresa ${orgId}? Esta acción no se puede deshacer.`)) return;
        try {
            await governanceService.deleteOrganization(orgId);
            if (typeof toast !== 'undefined') toast.show('Empresa eliminada');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('organizations');
        } catch (e) {
            alert('Error al eliminar empresa: ' + e.message);
        }
    },

    // ─── 3. COMERCIOS (BUSINESSES) — SEPARACIÓN CANÓNICA VS LEGACY ───────────

    renderBusinessesContent: (container) => {
        const allBiz = governanceCenterModule.businesses || [];
        const canonicalBiz = allBiz.filter(b => b.status === 'ACTIVE' || b.lifecycleStatus === 'ACTIVE' || (b.status !== 'DEPROVISIONED' && b.lifecycleStatus !== 'DEPROVISIONED' && !b.isDeleted));
        const legacyDeprovisionedBiz = allBiz.filter(b => b.status === 'DEPROVISIONED' || b.lifecycleStatus === 'DEPROVISIONED' || b.isDeleted === true);

        container.innerHTML = `
            <div class="space-y-6">
                <!-- 1. HEADER & COMERCIOS CANÓNICOS OPERATIVOS -->
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>🏪</span> Comercios Canónicos Operativos EIAM v2.2 (${canonicalBiz.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Entidades comerciales activas vinculadas a organizaciones y membresías EIAM.</p>
                    </div>
                    <button onclick="governanceCenterModule.openSaveBusinessModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>➕</span> Nuevo Comercio
                    </button>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Comercio Canónico</th>
                                <th class="p-4">Empresa (Org)</th>
                                <th class="p-4">Categoría</th>
                                <th class="p-4">Horarios</th>
                                <th class="p-4">Moneda</th>
                                <th class="p-4 text-center">Estado EIAM</th>
                                <th class="p-4 text-right">Acciones EIAM</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${canonicalBiz.length === 0 ? `
                                <tr><td colspan="7" class="p-4 text-center text-slate-500 font-sans">No hay comercios canónicos activos.</td></tr>
                            ` : canonicalBiz.map(b => {
                                const displayName = b.name || b.comercioNombre || b.businessName || b.nombre || 'Comercio Sin Nombre';
                                return `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 font-sans font-bold text-white flex items-center gap-2">
                                        <span>🏪</span>
                                        <div>
                                            <p class="text-sm text-indigo-200">${displayName}</p>
                                            <div class="flex items-center gap-2 mt-0.5">
                                                <span class="text-[10px] text-slate-500 font-mono">ID: ${b.businessId}</span>
                                                <span class="px-1.5 py-0.5 text-[9px] font-bold rounded font-mono bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                                                    CANONICAL_EIAM
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-4 text-indigo-400 font-bold">${b.orgId ? b.orgId : '<span class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">UNKNOWN</span>'}</td>
                                    <td class="p-4 text-slate-300 font-sans">${b.categoria || 'Restaurante'}</td>
                                    <td class="p-4 text-slate-400">${b.horarios || '08:00 AM - 10:00 PM'}</td>
                                    <td class="p-4 text-slate-300">${b.moneda || 'NIO (C$)'}</td>
                                    <td class="p-4 text-center font-sans">
                                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${b.status === 'ACTIVE' || b.lifecycleStatus === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}">
                                            ${b.status || b.lifecycleStatus || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="governanceCenterModule.openSaveBusinessModal('${b.businessId}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700">
                                                ✏️ Editar
                                            </button>
                                            <button onclick="governanceCenterModule.toggleBusinessSuspension('${b.businessId}', '${b.status}')" class="px-2.5 py-1 ${b.status === 'ACTIVE' ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/40' : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40'} rounded-lg text-xs font-bold transition">
                                                ${b.status === 'ACTIVE' ? '⚠️ Suspender' : '🟢 Activar'}
                                            </button>
                                            <button onclick="governanceCenterModule.deleteBusiness('${b.businessId}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold transition border border-rose-800/40">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- 2. SECCIÓN SEPARADA: COMERCIOS LEGACY REMANENTES (DEPROVISIONED) -->
                <div class="bg-slate-900 border border-amber-500/20 p-5 rounded-2xl shadow-xl space-y-4">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                            <h4 class="text-sm font-bold text-amber-400 flex items-center gap-2">
                                <span>📦</span> Comercios Legacy Remanentes & Deprovisioned (${legacyDeprovisionedBiz.length})
                            </h4>
                            <p class="text-[11px] text-slate-400 mt-0.5">Documentos comerciales antiguos de la arquitectura v1.x (claves por UID) purgados y deprovisionados al migrar a EIAM v2.2.</p>
                        </div>
                        <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 font-mono">LEGACY HISTORICAL</span>
                    </div>

                    <div class="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                        <table class="w-full text-left text-xs text-slate-300">
                            <thead class="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                                <tr>
                                    <th class="p-3">ID Remanente</th>
                                    <th class="p-3">Nombre Registrado</th>
                                    <th class="p-3">Categoría</th>
                                    <th class="p-3 text-center">Estado Ciclo de Vida</th>
                                    <th class="p-3 text-right">Nota de Auditoría</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/80 font-mono text-[11px]">
                                ${legacyDeprovisionedBiz.length === 0 ? `
                                    <tr><td colspan="5" class="p-3 text-center text-slate-500 font-sans">No hay comercios legacy deprovisionados.</td></tr>
                                ` : legacyDeprovisionedBiz.map(b => {
                                    const displayName = b.name || b.comercioNombre || b.businessName || b.nombre || 'Comercio Sin Nombre';
                                    return `
                                        <tr class="hover:bg-slate-900/50 transition">
                                            <td class="p-3 text-slate-400">${b.businessId || b.id}</td>
                                            <td class="p-3 font-sans font-bold text-slate-300">${displayName}</td>
                                            <td class="p-3 text-slate-400 font-sans">${b.categoria || 'N/A'}</td>
                                            <td class="p-3 text-center">
                                                <span class="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold border border-rose-500/20 font-mono">
                                                    ${b.lifecycleStatus || b.status || 'DEPROVISIONED'}
                                                </span>
                                            </td>
                                            <td class="p-3 text-right font-sans text-slate-500 text-[10px]">
                                                Baja formal en Sprint 16/17 (Migrado a UUID)
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    openSaveBusinessModal: (businessId = null) => {
        const biz = businessId ? governanceCenterModule.businesses.find(b => b.businessId === businessId) : null;
        const isEdit = !!biz;

        let orgOptions = governanceCenterModule.organizations.map(o => `
            <option value="${o.orgId}" ${biz && biz.orgId === o.orgId ? 'selected' : ''}>🏙️ ${o.nombre}</option>
        `).join('');

        const html = `
            <form onsubmit="governanceCenterModule.handleSaveBusiness(event, '${businessId || ''}')" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nombre Comercial:</label>
                    <input type="text" id="biz-nombre" value="${biz ? (biz.comercioNombre || biz.nombre) : ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Empresa / Tenant Perteneciente:</label>
                    <select id="biz-orgId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none font-mono">
                        ${orgOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Categoría de Comercio:</label>
                    <input type="text" id="biz-categoria" value="${biz ? biz.categoria || 'Restaurante' : 'Restaurante'}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Horarios Operativos:</label>
                    <input type="text" id="biz-horarios" value="${biz ? biz.horarios || '08:00 AM - 10:00 PM' : '08:00 AM - 10:00 PM'}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Moneda Principal:</label>
                    <select id="biz-moneda" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none">
                        <option value="NIO (C$)" ${biz && biz.moneda === 'NIO (C$)' ? 'selected' : ''}>NIO (C$)</option>
                        <option value="USD ($)" ${biz && biz.moneda === 'USD ($)' ? 'selected' : ''}>USD ($)</option>
                    </select>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-business')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Comercio'}
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-business', isEdit ? 'Editar Comercio' : 'Nuevo Comercio Affiliated', html);
    },

    handleSaveBusiness: async (e, businessId) => {
        e.preventDefault();
        try {
            const bizData = {
                businessId: businessId || null,
                comercioNombre: document.getElementById('biz-nombre').value,
                orgId: document.getElementById('biz-orgId').value,
                categoria: document.getElementById('biz-categoria').value,
                horarios: document.getElementById('biz-horarios').value,
                moneda: document.getElementById('biz-moneda').value,
                status: 'ACTIVE'
            };
            await governanceService.saveBusiness(bizData);
            drawer.close('drawer-business');
            if (typeof toast !== 'undefined') toast.show('Comercio guardado exitosamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('businesses');
        } catch (err) {
            alert('Error al guardar comercio: ' + err.message);
        }
    },

    toggleBusinessSuspension: async (businessId, currentStatus) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const reason = newStatus === 'SUSPENDED' ? prompt('Ingresa el motivo de la suspensión:') : 'Reactivado por Administrador';
        if (newStatus === 'SUSPENDED' && reason === null) return;
        try {
            await governanceService.updateMerchantLifecycleStatus(businessId, newStatus, reason);
            if (typeof toast !== 'undefined') toast.show(`Comercio ${newStatus === 'SUSPENDED' ? 'suspendido' : 'reactivado'}`);
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('businesses');
        } catch (e) {
            alert('Error al cambiar estado de comercio: ' + e.message);
        }
    },

    deleteBusiness: (businessId) => {
        const biz = governanceCenterModule.businesses.find(b => b.businessId === businessId);
        const bizName = biz ? (biz.name || biz.comercioNombre || biz.nombre) : businessId;
        const branches = governanceCenterModule.branches.filter(b => b.businessId === businessId);
        const safeBizName = bizName.replace(/'/g, "\\'");

        const html = `
            <div class="space-y-4">
                <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
                    <span class="text-2xl">⚠️</span>
                    <div>
                        <h3 class="text-base font-bold text-rose-400">Confirmación de Desaprovisionamiento de Comercio</h3>
                        <p class="text-xs text-slate-400">Comercio: <strong class="text-white">${bizName}</strong> (ID: <span class="font-mono text-indigo-400">${businessId}</span>)</p>
                    </div>
                </div>

                <div class="bg-rose-950/30 border border-rose-800/40 p-3.5 rounded-xl space-y-2 text-xs text-rose-200">
                    <p class="font-bold flex items-center gap-1.5">
                        <span>🚨</span> Selecciona el tipo de operación:
                    </p>
                    <ul class="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                        <li><strong class="text-amber-400">Desactivar Solo:</strong> Cambia el estado a INACTIVE. Conserva los documentos de Firestore y sus sucursales.</li>
                        <li><strong class="text-rose-400">Eliminar Definitivamente:</strong> Borra físicamente el documento <code>/businesses/${businessId}</code> y sus sucursales operativas en <code>/branches</code>. Esta acción es IRREVERSIBLE.</li>
                    </ul>
                    <p class="text-[10px] text-slate-400 pt-1 border-t border-rose-900/50">
                        * Sucursales vinculadas que serán procesadas: <strong>${branches.length}</strong>.
                    </p>
                </div>

                <div class="space-y-2 pt-1">
                    <label class="block text-xs text-slate-300 font-bold">
                        Para habilitar la <span class="text-rose-400 uppercase font-black">Eliminación Definitiva</span>, escriba exactamente el nombre del comercio:
                    </label>
                    <input type="text" id="gov-delete-confirm-input" placeholder="${bizName}"
                        oninput="governanceCenterModule.validateDeleteInput(this.value, '${safeBizName}')"
                        class="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none font-mono" />
                </div>

                <div class="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button onclick="if(typeof modal !== 'undefined') modal.close('deleteBusinessModal')" class="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                        Cancelar
                    </button>
                    <button onclick="governanceCenterModule.executeDeactivateBusiness('${businessId}', '${safeBizName}')" class="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5">
                        <span>🌙</span> Desactivar Solo
                    </button>
                    <button id="btn-gov-hard-delete" disabled onclick="governanceCenterModule.executeHardDeleteBusiness('${businessId}', '${safeBizName}')" class="w-full sm:w-auto px-4 py-2 bg-rose-600/40 text-slate-500 font-bold rounded-xl text-xs transition cursor-not-allowed flex items-center justify-center gap-1.5 border border-rose-900/40">
                        <span>💥</span> ELIMINAR DEFINITIVAMENTE
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('deleteBusinessModal', html);
    },

    validateDeleteInput: (inputValue, expectedName) => {
        const btn = document.getElementById('btn-gov-hard-delete');
        if (!btn) return;
        const matches = inputValue.trim().toLowerCase() === expectedName.trim().toLowerCase();
        if (matches) {
            btn.disabled = false;
            btn.className = "w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 border border-rose-500 cursor-pointer animate-pulse";
        } else {
            btn.disabled = true;
            btn.className = "w-full sm:w-auto px-4 py-2 bg-rose-600/40 text-slate-500 font-bold rounded-xl text-xs transition cursor-not-allowed flex items-center justify-center gap-1.5 border border-rose-900/40";
        }
    },

    executeDeactivateBusiness: async (businessId, bizName) => {
        if (typeof modal !== 'undefined') modal.close('deleteBusinessModal');
        if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.invalidateContext) {
            identityAdminDrawer.invalidateContext(businessId, 'BUSINESS_DEACTIVATE');
        }
        try {
            const res = await governanceService.deactivateBusiness(businessId);
            if (typeof toast !== 'undefined') {
                toast.show(`Comercio "${bizName}" desactivado con éxito.`);
            } else {
                alert(`✅ Comercio "${bizName}" desactivado con éxito.`);
            }
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('businesses');
        } catch (e) {
            alert('❌ Error al desactivar comercio: ' + e.message);
        }
    },

    executeHardDeleteBusiness: async (businessId, bizName) => {
        if (typeof modal !== 'undefined') modal.close('deleteBusinessModal');
        if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.invalidateContext) {
            identityAdminDrawer.invalidateContext(businessId, 'BUSINESS_HARD_DELETE');
        }
        try {
            const res = await governanceService.hardDeleteBusiness(businessId);
            if (typeof toast !== 'undefined') {
                toast.show(`Comercio "${bizName}" eliminado definitivamente de la base de datos.`, 'success');
            } else {
                alert(`✅ Comercio "${bizName}" eliminado definitivamente de Firestore.`);
            }
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('businesses');
        } catch (e) {
            alert('❌ Error crítico al eliminar definitivamente el comercio: ' + e.message);
        }
    },

    // ─── 4. SUCURSALES (BRANCHES) & MAPA GPS ──────────────────────────────────

    renderBranchesContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>🏢</span> Sucursales GPS & Radio de Cobertura Delivery (${governanceCenterModule.branches.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Ubicaciones físicas, mapa geográfico de cobertura y gerentes de sucursal.</p>
                    </div>
                    <button onclick="governanceCenterModule.openSaveBranchModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>➕</span> Nueva Sucursal
                    </button>
                </div>

                <!-- Mapa GPS de Cobertura Leaflet -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
                    <div class="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-2">
                        <span>🗺️ Visor Geográfico de Cobertura de Sucursales</span>
                        <span class="font-mono text-indigo-400">Leaflet Map Engine</span>
                    </div>
                    <div id="gov-branches-map" class="w-full h-80 rounded-xl bg-slate-950 overflow-hidden border border-slate-800 z-10"></div>
                </div>

                <!-- DataGrid de Sucursales -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Sucursal</th>
                                <th class="p-4">Comercio Perteneciente</th>
                                <th class="p-4">Dirección</th>
                                <th class="p-4">Lat / Lng GPS</th>
                                <th class="p-4">Radio Cobertura</th>
                                <th class="p-4">Gerente UID</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.branches.map(br => {
                                const branchName = br.name || br.nombre || br.branchName || 'Sucursal Sin Nombre';
                                const parentBizName = br.businessName || br.comercioNombre || 'Comercio Sin Asignar';
                                return `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 font-sans font-bold text-white">${branchName}</td>
                                    <td class="p-4 font-sans">
                                        <p class="text-xs text-indigo-400 font-bold">${parentBizName}</p>
                                        <p class="text-[10px] text-slate-500 font-mono">ID: ${br.businessId || 'N/A'}</p>
                                    </td>
                                    <td class="p-4 text-slate-300 font-sans">${br.direccion || br.address || 'N/A'}</td>
                                    <td class="p-4 text-slate-400">${br.locationGPS ? `${br.locationGPS.lat}, ${br.locationGPS.lng}` : '12.136, -86.251'}</td>
                                    <td class="p-4 text-emerald-400 font-bold">${br.radioCoberturaKm || 5} km</td>
                                    <td class="p-4 text-slate-400 font-sans">${br.managerUid || 'Sin Asignar'}</td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="governanceCenterModule.openSaveBranchModal('${br.branchId}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700">
                                                ✏️ Editar
                                            </button>
                                            <button onclick="governanceCenterModule.deleteBranch('${br.branchId}')" class="px-3 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold transition border border-rose-800/40">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        governanceCenterModule.initBranchesMap();
    },

    initBranchesMap: () => {
        setTimeout(() => {
            const mapContainer = document.getElementById('gov-branches-map');
            if (!mapContainer || typeof L === 'undefined') return;

            const map = L.map('gov-branches-map').setView([12.136389, -86.251389], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            governanceCenterModule.branches.forEach(b => {
                const lat = b.locationGPS ? b.locationGPS.lat : 12.136389;
                const lng = b.locationGPS ? b.locationGPS.lng : -86.251389;
                const radiusMeters = (parseFloat(b.radioCoberturaKm) || 5) * 1000;

                L.marker([lat, lng]).addTo(map)
                    .bindPopup(`<b>${b.nombre}</b><br>${b.direccion || 'Sucursal GPS'}`);

                L.circle([lat, lng], {
                    color: '#6366f1',
                    fillColor: '#818cf8',
                    fillOpacity: 0.15,
                    radius: radiusMeters
                }).addTo(map);
            });
        }, 100);
    },

    openSaveBranchModal: (branchId = null) => {
        const br = branchId ? governanceCenterModule.branches.find(b => b.branchId === branchId) : null;
        const isEdit = !!br;

        let bizOptions = governanceCenterModule.businesses.map(b => `
            <option value="${b.businessId}" ${br && br.businessId === b.businessId ? 'selected' : ''}>🏪 ${b.comercioNombre || b.nombre}</option>
        `).join('');

        const html = `
            <form onsubmit="governanceCenterModule.handleSaveBranch(event, '${branchId || ''}')" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nombre de la Sucursal:</label>
                    <input type="text" id="br-nombre" value="${br ? br.nombre : ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Comercio Perteneciente:</label>
                    <select id="br-businessId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none font-mono">
                        ${bizOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Dirección Física:</label>
                    <input type="text" id="br-direccion" value="${br ? br.direccion || '' : ''}" placeholder="Ej: Pista Principal Altamira" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-slate-400 font-bold mb-1">Latitud GPS:</label>
                        <input type="number" step="any" id="br-lat" value="${br && br.locationGPS ? br.locationGPS.lat : 12.136389}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-slate-400 font-bold mb-1">Longitud GPS:</label>
                        <input type="number" step="any" id="br-lng" value="${br && br.locationGPS ? br.locationGPS.lng : -86.251389}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Radio Cobertura (Km):</label>
                    <input type="number" step="0.5" id="br-radio" value="${br ? br.radioCoberturaKm || 5 : 5}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">UID Gerente / Supervisor:</label>
                    <input type="text" id="br-manager" value="${br ? br.managerUid || '' : ''}" placeholder="UID de Usuario Gerente" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-branch')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Sucursal'}
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-branch', isEdit ? 'Editar Sucursal' : 'Nueva Sucursal GPS', html);
    },

    handleSaveBranch: async (e, branchId) => {
        e.preventDefault();
        try {
            const branchData = {
                branchId: branchId || null,
                nombre: document.getElementById('br-nombre').value,
                businessId: document.getElementById('br-businessId').value,
                direccion: document.getElementById('br-direccion').value,
                locationGPS: {
                    lat: parseFloat(document.getElementById('br-lat').value) || 12.136389,
                    lng: parseFloat(document.getElementById('br-lng').value) || -86.251389
                },
                radioCoberturaKm: parseFloat(document.getElementById('br-radio').value) || 5,
                managerUid: document.getElementById('br-manager').value
            };
            await governanceService.saveBranch(branchData);
            drawer.close('drawer-branch');
            if (typeof toast !== 'undefined') toast.show('Sucursal guardada exitosamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('branches');
        } catch (err) {
            alert('Error al guardar sucursal: ' + err.message);
        }
    },

    deleteBranch: async (branchId) => {
        if (!confirm(`¿Confirmas la eliminación de la sucursal ${branchId}?`)) return;
        try {
            await governanceService.deleteBranch(branchId);
            if (typeof toast !== 'undefined') toast.show('Sucursal eliminada');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('branches');
        } catch (e) {
            alert('Error al eliminar sucursal: ' + e.message);
        }
    },

    // ─── 5. USUARIOS & IDENTIDADES ────────────────────────────────────────────

    renderUsersContent: (container) => {
        const opList = governanceCenterModule.identities || [];
        const nonOpList = governanceCenterModule.nonOperationalIdentities || [];

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header de Identidades Operacionales -->
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>👤</span> Identidades & Usuarios Operacionales Plataforma (${opList.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Población canónica operacional de usuarios y roles activos en BlueSystem Enterprise.</p>
                    </div>
                    <button onclick="governanceCenterModule.openInviteUserDrawer()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>✉️</span> Invitar / Crear Usuario
                    </button>
                </div>

                <!-- Tabla de Identidades Operacionales -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Identidad / Nombre</th>
                                <th class="p-4">Email</th>
                                <th class="p-4">Teléfono</th>
                                <th class="p-4">Rol Canónico EIAM</th>
                                <th class="p-4 text-center">Nivel RBAC</th>
                                <th class="p-4 text-center">Estado</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${opList.length === 0 ? `
                                <tr><td colspan="7" class="p-4 text-center text-slate-500 font-sans">No hay usuarios operacionales en la vista actual.</td></tr>
                            ` : opList.map(u => {
                                const name = u.effectiveName || u.nombre || u.name || 'Sin nombre';
                                const email = u.effectiveEmail || u.email || 'Sin correo';
                                const phone = u.effectivePhone || u.telefono || 'N/A';

                                let identityBadge = '';
                                if (phone === '82397401' || phone === '+50582397401') {
                                    identityBadge = `<span class="ml-2 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded border border-purple-500/20 font-mono font-bold">⚠ Posible Duplicado</span>`;
                                }

                                return `
                                    <tr class="hover:bg-slate-800/40 transition">
                                        <td class="p-4 font-sans font-bold text-white">
                                            <div class="flex items-center">
                                                <p class="text-sm">${name}</p>
                                                ${identityBadge}
                                            </div>
                                            <p class="text-[10px] text-slate-500 font-mono">UID: ${u.uid}</p>
                                        </td>
                                        <td class="p-4 text-slate-300">${email}</td>
                                        <td class="p-4 text-slate-400">${phone}</td>
                                        <td class="p-4 font-sans">${eiamAdapter.getRoleBadgeHtml(u.canonicalRole)}</td>
                                        <td class="p-4 text-center text-indigo-400 font-bold">L${u.roleLevel || 1}</td>
                                        <td class="p-4 text-center font-sans">
                                            <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${u.displayStatus === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}">
                                                ${u.displayStatus}
                                            </span>
                                        </td>
                                        <td class="p-4 text-right font-sans">
                                            <div class="flex items-center justify-end gap-2">
                                                <button onclick="identityAdminDrawer.open('${u.uid}')" class="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/40 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                                    <span>✏️</span> Administrar
                                                </button>
                                                <button onclick="governanceCenterModule.toggleUserBlock('${u.uid}', ${u.isActive !== false})" class="px-2.5 py-1 ${u.isActive !== false ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'} rounded-lg text-xs font-bold transition">
                                                    ${u.isActive !== false ? '🔒 Bloquear' : '🟢 Activar'}
                                                </button>
                                                <button onclick="governanceCenterModule.openTransferUserDrawer('${u.uid}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700">
                                                    🏬 Transferir
                                                </button>
                                                <button onclick="governanceCenterModule.openHardDeleteUserModal('${u.uid}')" class="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-bold transition">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- SECCIÓN SEPARADA: LEGACY POS & NO OPERACIONALES -->
                <div class="bg-slate-900 border border-amber-500/20 p-5 rounded-2xl shadow-xl space-y-4">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                            <h4 class="text-sm font-bold text-amber-400 flex items-center gap-2">
                                <span>📦</span> Registros Legacy POS & Identidades No Operacionales (${nonOpList.length})
                            </h4>
                            <p class="text-[11px] text-slate-400 mt-0.5">Registros históricos del punto de venta escritorio POS e identidades incompletas o de origen no demostrado.</p>
                        </div>
                        <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 font-mono">SECCIÓN SEPARADA</span>
                    </div>

                    <div class="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                        <table class="w-full text-left text-xs text-slate-300">
                            <thead class="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                                <tr>
                                    <th class="p-3">UID Documento</th>
                                    <th class="p-3">Nombre Registrado</th>
                                    <th class="p-3">Email</th>
                                    <th class="p-3">Teléfono</th>
                                    <th class="p-3">Clasificación Origen</th>
                                    <th class="p-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/80 font-mono text-[11px]">
                                ${nonOpList.length === 0 ? `
                                    <tr><td colspan="6" class="p-3 text-center text-slate-500 font-sans">No hay registros legacy o no operacionales.</td></tr>
                                ` : nonOpList.map(u => {
                                    const name = u.effectiveName || u.nombre || u.name || 'Sin nombre';
                                    const email = u.effectiveEmail || u.email || 'Sin correo';
                                    const phone = u.effectivePhone || u.telefono || 'N/A';
                                    const orig = u.identityType || 'LEGACY_POS';
                                    return `
                                        <tr class="hover:bg-slate-900/50 transition">
                                            <td class="p-3 text-slate-400">${u.uid}</td>
                                            <td class="p-3 font-sans font-bold text-slate-200">${name}</td>
                                            <td class="p-3 text-slate-400">${email}</td>
                                            <td class="p-3 text-slate-400">${phone}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold border border-amber-500/20">${orig}</span></td>
                                            <td class="p-3 text-right font-sans">
                                                <button onclick="governanceCenterModule.openHardDeleteUserModal('${u.uid}')" class="px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900 text-rose-400 border border-rose-900/40 rounded text-xs transition">
                                                    🗑️ Hard Delete
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    openHardDeleteUserModal: (uid) => {
        const user = [...governanceCenterModule.identities, ...governanceCenterModule.nonOperationalIdentities].find(u => u.uid === uid) || { uid, effectiveName: uid };
        const name = user.effectiveName || user.nombre || user.name || uid;
        const safeName = String(name).replace(/'/g, "\\'");

        const html = `
            <div class="space-y-4 font-sans">
                <div class="flex items-center gap-3 border-b border-slate-800 pb-3">
                    <span class="text-2xl">🚨</span>
                    <div>
                        <h3 class="text-base font-bold text-rose-400">Eliminación Definitiva de Identidad</h3>
                        <p class="text-xs text-slate-400">Usuario: <strong class="text-white">${name}</strong> (UID: <span class="font-mono text-indigo-400">${uid}</span>)</p>
                    </div>
                </div>

                <div class="bg-rose-950/30 border border-rose-800/40 p-3.5 rounded-xl space-y-2 text-xs text-rose-200">
                    <p class="font-bold flex items-center gap-1.5">
                        <span>⚠️</span> ADVERTENCIA CRÍTICA FIRESTORE HARD DELETE:
                    </p>
                    <p class="text-[11px] text-slate-300">
                        Esta operación borrará permanentemente el documento <code>/users/${uid}</code> y limpiará sus registros de dispositivos. El historial de ventas y pagos anteriores no se borrará. Esta acción es IRREVERSIBLE.
                    </p>
                </div>

                <div class="space-y-2 pt-1">
                    <label class="block text-xs text-slate-300 font-bold">
                        Escriba exactamente <span class="text-rose-400 font-black uppercase">ELIMINAR DEFINITIVAMENTE</span> para confirmar:
                    </label>
                    <input type="text" id="gov-user-delete-confirm-input" placeholder="ELIMINAR DEFINITIVAMENTE"
                        oninput="governanceCenterModule.validateUserDeleteConfirmInput(this.value)"
                        class="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none font-mono" />
                </div>

                <div class="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button onclick="if(typeof modal !== 'undefined') modal.close('deleteUserGovModal')" class="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                        Cancelar
                    </button>
                    <button id="btn-gov-user-hard-delete" disabled onclick="governanceCenterModule.executeHardDeleteUser('${uid}', '${safeName}')" class="w-full sm:w-auto px-4 py-2 bg-rose-600/40 text-slate-500 font-bold rounded-xl text-xs transition cursor-not-allowed flex items-center justify-center gap-1.5 border border-rose-900/40">
                        <span>💥</span> ELIMINAR DEFINITIVAMENTE
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('deleteUserGovModal', html);
    },

    validateUserDeleteConfirmInput: (val) => {
        const btn = document.getElementById('btn-gov-user-hard-delete');
        if (!btn) return;
        if (val.trim() === 'ELIMINAR DEFINITIVAMENTE') {
            btn.disabled = false;
            btn.className = "w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 border border-rose-500 cursor-pointer animate-pulse";
        } else {
            btn.disabled = true;
            btn.className = "w-full sm:w-auto px-4 py-2 bg-rose-600/40 text-slate-500 font-bold rounded-xl text-xs transition cursor-not-allowed flex items-center justify-center gap-1.5 border border-rose-900/40";
        }
    },

    executeHardDeleteUser: async (uid, name) => {
        if (typeof modal !== 'undefined') modal.close('deleteUserGovModal');
        try {
            if (typeof identityCanonicalService !== 'undefined' && identityCanonicalService.deleteIdentityPermanently) {
                await identityCanonicalService.deleteIdentityPermanently(uid);
            } else {
                await db.collection('users').doc(uid).delete();
            }
            if (typeof toast !== 'undefined') toast.show(`Identidad ${name} eliminada definitivamente de Firestore.`, 'success');
        } catch (e) {
            alert('❌ Error al eliminar identidad: ' + e.message);
        }
    },

    openEditUserRoleModal: (uid, currentRole) => {
        if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.open) {
            identityAdminDrawer.open(uid);
            return;
        }

        const rolesOptions = Object.keys(eiamAdapter.roles).map(rKey => `
            <option value="${rKey}" ${currentRole === rKey ? 'selected' : ''}>${rKey} (Nivel ${eiamAdapter.roles[rKey].level}) - ${eiamAdapter.roles[rKey].label}</option>
        `).join('');

        const html = `
            <form onsubmit="governanceCenterModule.handleUpdateUserRole(event, '${uid}')" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">UID del Usuario:</label>
                    <input type="text" value="${uid}" disabled class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-400 font-mono">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Seleccionar Nuevo Rol EIAM:</label>
                    <select id="user-role-select" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                        ${rolesOptions}
                    </select>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="modal.close('modal-user-role')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        Actualizar Rol EIAM
                    </button>
                </div>
            </form>
        `;

        modal.open('modal-user-role', html);
    },

    handleUpdateUserRole: async (e, uid) => {
        e.preventDefault();
        try {
            const newRole = document.getElementById('user-role-select').value;
            await identityService.updateIdentityRole(uid, newRole);
            modal.close('modal-user-role');
            if (typeof toast !== 'undefined') toast.show('Rol actualizado correctamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('users');
        } catch (err) {
            alert('Error al actualizar rol: ' + err.message);
        }
    },

    toggleUserBlock: async (uid, currentActive) => {
        const newActive = !currentActive;
        if (!confirm(`¿Confirmas ${newActive ? 'reactivar' : 'bloquear'} la cuenta ${uid}?`)) return;
        try {
            await identityService.setIdentityStatus(uid, newActive);
            if (typeof toast !== 'undefined') toast.show(`Usuario ${newActive ? 'reactivado' : 'bloqueado'}`);
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('users');
        } catch (e) {
            alert('Error al cambiar estado de usuario: ' + e.message);
        }
    },

    openTransferUserDrawer: (uid) => {
        let bizOptions = governanceCenterModule.businesses.map(b => `<option value="${b.businessId}">🏪 ${b.comercioNombre || b.nombre}</option>`).join('');
        let branchOptions = governanceCenterModule.branches.map(b => `<option value="${b.branchId}">🏢 ${b.nombre}</option>`).join('');

        const html = `
            <form onsubmit="governanceCenterModule.handleTransferUser(event, '${uid}')" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">UID del Usuario:</label>
                    <input type="text" value="${uid}" disabled class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-400 font-mono">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nuevo Comercio Asignado:</label>
                    <select id="trans-businessId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono">
                        ${bizOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nueva Sucursal Asignada:</label>
                    <select id="trans-branchId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono">
                        ${branchOptions}
                    </select>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-transfer')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        Ejecutar Transferencia
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-transfer', 'Transferir Empleado a Comercio/Sucursal', html);
    },

    handleTransferUser: async (e, uid) => {
        e.preventDefault();
        try {
            const bizId = document.getElementById('trans-businessId').value;
            const brId = document.getElementById('trans-branchId').value;
            await identityService.transferEmployee(uid, bizId, brId);
            drawer.close('drawer-transfer');
            if (typeof toast !== 'undefined') toast.show('Empleado transferido exitosamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('users');
        } catch (err) {
            alert('Error al transferir usuario: ' + err.message);
        }
    },

    openInviteUserDrawer: () => {
        let bizOptions = governanceCenterModule.businesses.map(b => `<option value="${b.businessId}">🏪 ${b.comercioNombre || b.nombre}</option>`).join('');

        const html = `
            <form onsubmit="governanceCenterModule.handleInviteUser(event)" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Email del Destinatario:</label>
                    <input type="email" id="inv-email" required placeholder="usuario@comercio.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Rol Objetivo EIAM:</label>
                    <select id="inv-role" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                        <option value="MANAGER">MANAGER (Gerente Sucursal)</option>
                        <option value="SUPERVISOR">SUPERVISOR (Supervisor Turno)</option>
                        <option value="CASHIER">CASHIER (Cajero POS)</option>
                        <option value="COOK">COOK (Cocinero KDS)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Comercio Asignado:</label>
                    <select id="inv-businessId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                        ${bizOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Canal de Envío:</label>
                    <select id="inv-channel" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none">
                        <option value="EMAIL">EMAIL</option>
                        <option value="WHATSAPP">WHATSAPP</option>
                        <option value="SMS">SMS</option>
                    </select>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-invite')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        Enviar Invitación
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-invite', 'Invitar Nuevo Usuario a la Plataforma', html);
    },

    handleInviteUser: async (e) => {
        e.preventDefault();
        try {
            const invData = {
                email: document.getElementById('inv-email').value,
                targetRole: document.getElementById('inv-role').value,
                businessId: document.getElementById('inv-businessId').value,
                channel: document.getElementById('inv-channel').value
            };
            await identityService.createInvitation(invData);
            drawer.close('drawer-invite');
            if (typeof toast !== 'undefined') toast.show('Invitación enviada correctamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('invitations');
        } catch (err) {
            alert('Error al enviar invitación: ' + err.message);
        }
    },

    // ─── 6. EMPLEADOS & STAFF ─────────────────────────────────────────────────

    renderEmployeesContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>💼</span> Personal & Staff Operativo (${governanceCenterModule.employees.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Supervisión de personal contratado en comercios y sucursales.</p>
                    </div>
                    <button onclick="governanceCenterModule.openSaveEmployeeModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>➕</span> Asignar Personal
                    </button>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Empleado / Nombre</th>
                                <th class="p-4">Email</th>
                                <th class="p-4">Rol Asignado</th>
                                <th class="p-4">Comercio ID</th>
                                <th class="p-4">Sucursal ID</th>
                                <th class="p-4 text-center">Estado</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.employees.map(emp => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 font-sans font-bold text-white">${emp.nombre || 'Empleado'}</td>
                                    <td class="p-4 text-slate-400">${emp.email || 'N/A'}</td>
                                    <td class="p-4 font-sans">${eiamAdapter.getRoleBadgeHtml(emp.role || 'CASHIER')}</td>
                                    <td class="p-4 text-indigo-400 font-bold">${emp.businessId || 'N/A'}</td>
                                    <td class="p-4 text-slate-300">${emp.branchId || 'N/A'}</td>
                                    <td class="p-4 text-center font-sans">
                                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${emp.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}">
                                            ${emp.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="governanceCenterModule.openSaveEmployeeModal('${emp.employeeId}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700">
                                                ✏️ Editar
                                            </button>
                                            <button onclick="governanceCenterModule.deleteEmployee('${emp.employeeId}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-bold transition border border-rose-800/40">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openSaveEmployeeModal: (employeeId = null) => {
        const emp = employeeId ? governanceCenterModule.employees.find(e => e.employeeId === employeeId) : null;
        const isEdit = !!emp;

        let bizOptions = governanceCenterModule.businesses.map(b => `<option value="${b.businessId}" ${emp && emp.businessId === b.businessId ? 'selected' : ''}>🏪 ${b.comercioNombre || b.nombre}</option>`).join('');
        let branchOptions = governanceCenterModule.branches.map(b => `<option value="${b.branchId}" ${emp && emp.branchId === b.branchId ? 'selected' : ''}>🏢 ${b.nombre}</option>`).join('');

        const html = `
            <form onsubmit="governanceCenterModule.handleSaveEmployee(event, '${employeeId || ''}')" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nombre Completo del Empleado:</label>
                    <input type="text" id="emp-nombre" value="${emp ? emp.nombre : ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Email:</label>
                    <input type="email" id="emp-email" value="${emp ? emp.email || '' : ''}" placeholder="empleado@comercio.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Rol Operativo:</label>
                    <select id="emp-role" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                        <option value="MANAGER" ${emp && emp.role === 'MANAGER' ? 'selected' : ''}>MANAGER (Gerente)</option>
                        <option value="SUPERVISOR" ${emp && emp.role === 'SUPERVISOR' ? 'selected' : ''}>SUPERVISOR</option>
                        <option value="CASHIER" ${emp && emp.role === 'CASHIER' ? 'selected' : ''}>CASHIER (Cajero)</option>
                        <option value="COOK" ${emp && emp.role === 'COOK' ? 'selected' : ''}>COOK (Cocinero)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Comercio Perteneciente:</label>
                    <select id="emp-businessId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono">
                        ${bizOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Sucursal Asignada:</label>
                    <select id="emp-branchId" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono">
                        ${branchOptions}
                    </select>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-employee')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        ${isEdit ? 'Guardar Cambios' : 'Registrar Empleado'}
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-employee', isEdit ? 'Editar Registro de Personal' : 'Registrar Nuevo Empleado', html);
    },

    handleSaveEmployee: async (e, employeeId) => {
        e.preventDefault();
        try {
            const empData = {
                employeeId: employeeId || null,
                nombre: document.getElementById('emp-nombre').value,
                email: document.getElementById('emp-email').value,
                role: document.getElementById('emp-role').value,
                businessId: document.getElementById('emp-businessId').value,
                branchId: document.getElementById('emp-branchId').value,
                status: 'ACTIVE'
            };
            await identityService.saveEmployee(empData);
            drawer.close('drawer-employee');
            if (typeof toast !== 'undefined') toast.show('Personal guardado correctamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('employees');
        } catch (err) {
            alert('Error al guardar empleado: ' + err.message);
        }
    },

    deleteEmployee: async (employeeId) => {
        if (!confirm(`¿Confirmas eliminar al empleado ${employeeId}?`)) return;
        try {
            await identityService.deleteEmployee(employeeId);
            if (typeof toast !== 'undefined') toast.show('Empleado eliminado');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('employees');
        } catch (e) {
            alert('Error al eliminar empleado: ' + e.message);
        }
    },

    // ─── 7. INVITACIONES WORKFLOW ─────────────────────────────────────────────

    renderInvitationsContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>✉️</span> Invitaciones Workflow & Token Exchange (${governanceCenterModule.invitations.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Tokens temporales (72 hrs) para la incorporación segura de personal sin password expuesto.</p>
                    </div>
                    <button onclick="governanceCenterModule.openInviteUserDrawer()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>➕</span> Nueva Invitación
                    </button>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Token / ID</th>
                                <th class="p-4">Destinatario</th>
                                <th class="p-4">Rol Objetivo</th>
                                <th class="p-4">Comercio</th>
                                <th class="p-4">Canal</th>
                                <th class="p-4 text-center">Estado</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.invitations.map(inv => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 text-indigo-400 font-bold">${inv.token}</td>
                                    <td class="p-4 text-slate-200 font-sans">${inv.email}</td>
                                    <td class="p-4 font-sans">${eiamAdapter.getRoleBadgeHtml(inv.targetRole || 'CASHIER')}</td>
                                    <td class="p-4 text-slate-400">${inv.businessId || 'Global'}</td>
                                    <td class="p-4 text-slate-300 font-sans">${inv.channel || 'EMAIL'}</td>
                                    <td class="p-4 text-center font-sans">
                                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${inv.status === 'PENDING' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' : inv.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}">
                                            ${inv.status || 'PENDING'}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            ${inv.status === 'PENDING' ? `
                                                <button onclick="governanceCenterModule.revokeInvitation('${inv.token}')" class="px-3 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-bold transition">
                                                    🚫 Revocar
                                                </button>
                                            ` : '<span class="text-slate-500 italic text-[11px]">Procesada</span>'}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    revokeInvitation: async (token) => {
        if (!confirm(`¿Confirmas la revocación del token de invitación ${token}?`)) return;
        try {
            await identityService.revokeInvitation(token);
            if (typeof toast !== 'undefined') toast.show('Invitación revocada');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('invitations');
        } catch (e) {
            alert('Error al revocar invitación: ' + e.message);
        }
    },

    // ─── 8. ROLES RBAC & COMPARADOR VISUAL ────────────────────────────────────

    renderRolesContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>👑</span> Roles RBAC & Comparador Visual (${governanceCenterModule.roles.length} Niveles)
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Supervisión de niveles RBAC (L0-L10) y comparación lado a lado de privilegios.</p>
                    </div>
                    <button onclick="governanceCenterModule.openSaveRoleModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>➕</span> Crear Rol Personalizado
                    </button>
                </div>

                <!-- Tabla DataGrid de Roles -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Rol ID</th>
                                <th class="p-4">Nombre del Rol</th>
                                <th class="p-4 text-center">Nivel Jerárquico RBAC</th>
                                <th class="p-4 text-center">Tipo Rol</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.roles.map(r => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 text-indigo-400 font-bold">${r.roleId}</td>
                                    <td class="p-4 font-sans font-bold text-white">${r.nombre}</td>
                                    <td class="p-4 text-center font-bold text-indigo-300">Nivel ${r.level}</td>
                                    <td class="p-4 text-center font-sans">
                                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${r.isSystem ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40' : 'bg-indigo-950 text-indigo-400 border border-indigo-800/40'}">
                                            ${r.isSystem ? 'SISTEMA' : 'CUSTOM'}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="governanceCenterModule.duplicateRole('${r.roleId}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition border border-slate-700">
                                                📋 Duplicar
                                            </button>
                                            ${!r.isSystem ? `
                                                <button onclick="governanceCenterModule.deleteRole('${r.roleId}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-bold transition">
                                                    🗑️
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Comparador Visual de Roles -->
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <h4 class="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
                        <span>🔍</span> Comparador Lado a Lado de Permisos entre Roles
                    </h4>

                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label class="text-slate-400 font-bold">Rol A:</label>
                            <select id="comp-role-a" onchange="governanceCenterModule.updateRoleComparison()" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200">
                                <option value="MANAGER">GERENTE (Manager - L5)</option>
                                <option value="SUPERVISOR">SUPERVISOR (Supervisor - L4)</option>
                                <option value="CASHIER">CAJERO (Cashier - L3)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-slate-400 font-bold">Rol B:</label>
                            <select id="comp-role-b" onchange="governanceCenterModule.updateRoleComparison()" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200">
                                <option value="SUPERVISOR" selected>SUPERVISOR (Supervisor - L4)</option>
                                <option value="CASHIER">CAJERO (Cashier - L3)</option>
                                <option value="COOK">COCINERO (Cook - L3)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-slate-400 font-bold">Rol C (Opcional):</label>
                            <select id="comp-role-c" onchange="governanceCenterModule.updateRoleComparison()" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200">
                                <option value="CASHIER" selected>CAJERO (Cashier - L3)</option>
                                <option value="COOK">COCINERO (Cook - L3)</option>
                                <option value="DRIVER">MOTORIZADO (Driver - L2)</option>
                            </select>
                        </div>
                    </div>

                    <div id="role-comparison-table" class="overflow-x-auto">
                    </div>
                </div>
            </div>
        `;

        governanceCenterModule.updateRoleComparison();
    },

    openSaveRoleModal: () => {
        const html = `
            <form onsubmit="governanceCenterModule.handleSaveRole(event)" class="space-y-4">
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nombre del Nuevo Rol:</label>
                    <input type="text" id="role-nombre" required placeholder="Ej: Auditor Financiero Senior" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Nivel Jerárquico RBAC (1 a 9):</label>
                    <input type="number" min="1" max="9" id="role-level" value="4" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-indigo-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 font-bold mb-1">Descripción del Rol:</label>
                    <textarea id="role-descripcion" placeholder="Descripción de privilegios y alcance del rol" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none h-24"></textarea>
                </div>
                <div class="pt-4 flex justify-end gap-3">
                    <button type="button" onclick="drawer.close('drawer-role')" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition shadow">
                        Crear Rol Personalizado
                    </button>
                </div>
            </form>
        `;

        drawer.open('drawer-role', 'Crear Rol Personalizado EIAM', html);
    },

    handleSaveRole: async (e) => {
        e.preventDefault();
        try {
            const roleData = {
                nombre: document.getElementById('role-nombre').value,
                level: document.getElementById('role-level').value,
                descripcion: document.getElementById('role-descripcion').value
            };
            await governanceService.saveRole(roleData);
            drawer.close('drawer-role');
            if (typeof toast !== 'undefined') toast.show('Rol personalizado creado');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('roles');
        } catch (err) {
            alert('Error al crear rol: ' + err.message);
        }
    },

    duplicateRole: async (roleId) => {
        const sourceRole = governanceCenterModule.roles.find(r => r.roleId === roleId);
        if (!sourceRole) return;
        const newName = prompt(`Duplicar rol ${sourceRole.nombre}. Ingresa el nuevo nombre:`, `${sourceRole.nombre} (Copia)`);
        if (!newName) return;
        try {
            await governanceService.saveRole({
                nombre: newName,
                level: sourceRole.level,
                descripcion: `Copia duplicada desde ${roleId}`
            });
            if (typeof toast !== 'undefined') toast.show('Rol duplicado correctamente');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('roles');
        } catch (e) {
            alert('Error al duplicar rol: ' + e.message);
        }
    },

    deleteRole: async (roleId) => {
        if (!confirm(`¿Confirmas eliminar el rol ${roleId}?`)) return;
        try {
            await governanceService.deleteRole(roleId);
            if (typeof toast !== 'undefined') toast.show('Rol eliminado');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('roles');
        } catch (e) {
            alert('Error al eliminar rol: ' + e.message);
        }
    },

    updateRoleComparison: () => {
        const rA = document.getElementById('comp-role-a').value;
        const rB = document.getElementById('comp-role-b').value;
        const rC = document.getElementById('comp-role-c').value;

        const compData = securityPolicyEngine.compareRoles(rA, rB, rC);
        const container = document.getElementById('role-comparison-table');
        if (!container) return;

        container.innerHTML = `
            <table class="w-full text-left text-xs text-slate-300 mt-2">
                <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                        <th class="p-3">Acción de Sistema</th>
                        <th class="p-3 text-center">${rA}</th>
                        <th class="p-3 text-center">${rB}</th>
                        <th class="p-3 text-center">${rC}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80">
                    ${compData.map(d => `
                        <tr class="hover:bg-slate-800/40 transition">
                            <td class="p-3 font-semibold text-slate-200">${d.actionLabel} <span class="text-[9px] text-slate-500 font-mono">(${d.actionId})</span></td>
                            <td class="p-3 text-center font-bold text-base ${d.roleAAllowed ? 'text-emerald-400' : 'text-rose-500'}">${d.roleAAllowed ? '✔' : '✘'}</td>
                            <td class="p-3 text-center font-bold text-base ${d.roleBAllowed ? 'text-emerald-400' : 'text-rose-500'}">${d.roleBAllowed ? '✔' : '✘'}</td>
                            <td class="p-3 text-center font-bold text-base ${d.roleCAllowed ? 'text-emerald-400' : 'text-rose-500'}">${d.roleCAllowed ? '✔' : '✘'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ─── 9. PERMISOS & POLICY SIMULATOR ───────────────────────────────────────

    renderPermissionsContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Matriz Interactiva de Permisos -->
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <span>🧩</span> Matriz Interactiva de Permisos EIAM
                            </h3>
                            <p class="text-xs text-slate-400">Control directo de matriz de permisos por rol. Haz clic en las casillas para alternar accesos.</p>
                        </div>
                        <button onclick="governanceCenterModule.savePermissionsMatrix()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                            <span>💾</span> Guardar Matriz Firestore
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs text-slate-300 font-mono">
                            <thead class="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                                <tr>
                                    <th class="p-3 font-sans">Acción Plataforma</th>
                                    <th class="p-3 text-center">SUPER_ADMIN</th>
                                    <th class="p-3 text-center">ADMIN</th>
                                    <th class="p-3 text-center">OWNER</th>
                                    <th class="p-3 text-center">MANAGER</th>
                                    <th class="p-3 text-center">SUPERVISOR</th>
                                    <th class="p-3 text-center">CASHIER</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/80" id="matrix-table-body">
                                ${governanceCenterModule.getPermissionsMatrixRowsHtml()}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Policy Simulator UI -->
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <span>⚡</span> Policy Simulator & Evaluador ABAC+RBAC en Tiempo Real
                    </h3>
                    <p class="text-xs text-slate-400">Simulador de políticas de acceso contextual. Prueba si un rol puede ejecutar una acción bajo condiciones de horario y confianza de hardware.</p>

                    <form onsubmit="governanceCenterModule.handlePolicySimulation(event)" class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div>
                            <label class="text-slate-400 font-bold">Rol a Probar:</label>
                            <select id="sim-role" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200">
                                <option value="MANAGER">GERENTE (Manager)</option>
                                <option value="SUPERVISOR" selected>SUPERVISOR</option>
                                <option value="CASHIER">CAJERO (Cashier)</option>
                                <option value="COOK">COCINERO (Cook)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-slate-400 font-bold">Acción Solicitada:</label>
                            <select id="sim-action" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200">
                                <option value="CONFIRM_ORDER">CONFIRM_ORDER</option>
                                <option value="CANCEL_ORDER">CANCEL_ORDER</option>
                                <option value="VIEW_FINANCE">VIEW_FINANCE</option>
                                <option value="EXPORT_FINANCE">EXPORT_FINANCE</option>
                                <option value="MODIFY_PRICE">MODIFY_PRICE</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-slate-400 font-bold">Hora Simulación (ABAC):</label>
                            <input type="text" id="sim-hour" value="23:30" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono">
                        </div>
                        <div class="flex items-end">
                            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition shadow">
                                Simular Política (⚡)
                            </button>
                        </div>
                    </form>

                    <div id="sim-result-card" class="hidden p-4 rounded-xl border text-xs font-mono">
                    </div>
                </div>
            </div>
        `;
    },

    getPermissionsMatrixRowsHtml: () => {
        const actions = [
            { id: 'CREATE_ORDER', label: 'Crear Pedidos' },
            { id: 'CONFIRM_ORDER', label: 'Confirmar Pedidos' },
            { id: 'CANCEL_ORDER', label: 'Anular Pedidos' },
            { id: 'VIEW_FINANCE', label: 'Ver Finanzas' },
            { id: 'EXPORT_FINANCE', label: 'Exportar Finanzas' },
            { id: 'MANAGE_STAFF', label: 'Gestionar Personal' },
            { id: 'MODIFY_PRODUCT', label: 'Modificar Productos' },
            { id: 'MODIFY_PRICE', label: 'Modificar Precios' }
        ];

        const rolesList = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER', 'SUPERVISOR', 'CASHIER'];

        return actions.map(act => `
            <tr class="hover:bg-slate-800/40 transition">
                <td class="p-3 font-sans font-bold text-slate-200">${act.label} <span class="text-[9px] text-slate-500 font-mono">(${act.id})</span></td>
                ${rolesList.map(r => {
                    const res = securityPolicyEngine.evaluateABACPolicy(r, act.id);
                    return `
                        <td class="p-3 text-center">
                            <input type="checkbox" ${res.allowed ? 'checked' : ''} class="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer">
                        </td>
                    `;
                }).join('')}
            </tr>
        `).join('');
    },

    savePermissionsMatrix: async () => {
        try {
            await governanceService.savePermissionMatrix({ updated: true });
            if (typeof toast !== 'undefined') toast.show('Matriz de permisos guardada en Firestore');
        } catch (e) {
            alert('Error al guardar matriz: ' + e.message);
        }
    },

    handlePolicySimulation: (e) => {
        e.preventDefault();
        const role = document.getElementById('sim-role').value;
        const action = document.getElementById('sim-action').value;
        const hourStr = document.getElementById('sim-hour').value;

        const result = securityPolicyEngine.simulatePolicy(role, action, hourStr, 'HIGH');
        const card = document.getElementById('sim-result-card');
        if (!card) return;

        card.classList.remove('hidden', 'bg-emerald-950/60', 'border-emerald-800/40', 'bg-rose-950/60', 'border-rose-800/40');

        if (result.allowed) {
            card.classList.add('bg-emerald-950/60', 'border-emerald-800/40');
            card.innerHTML = `
                <div class="flex justify-between items-center text-emerald-400">
                    <span class="font-bold text-sm">🟢 ACCESO CONCEDIDO (PERMITIDO)</span>
                    <span>Trazabilidad: ${result.inheritancePath}</span>
                </div>
                <p class="text-slate-300 mt-2">${result.reason}</p>
            `;
        } else {
            card.classList.add('bg-rose-950/60', 'border-rose-800/40');
            card.innerHTML = `
                <div class="flex justify-between items-center text-rose-400">
                    <span class="font-bold text-sm">⛔ ACCESO DENEGADO (RECHAZADO)</span>
                    <span>Trazabilidad: ${result.inheritancePath}</span>
                </div>
                <p class="text-slate-300 mt-2">${result.reason}</p>
            `;
        }
    },

    // ─── 10. CLAIMS VALIDATOR ────────────────────────────────────────────────

    renderClaimsContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>🎟️</span> Custom Claims Inspector & Validator (JWT vs Firestore Sync)
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Detección automática de inconsistencias de sincronización de claims con Firebase Auth.</p>
                    </div>
                    <button onclick="governanceCenterModule.syncAllUserClaims()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2">
                        <span>🔄</span> Batch Sync Todos los Claims
                    </button>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Usuario</th>
                                <th class="p-4">Email</th>
                                <th class="p-4">Rol Firestore</th>
                                <th class="p-4">Estado Claims JWT</th>
                                <th class="p-4 text-right">Acción Reparación</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80">
                            ${governanceCenterModule.identities.map(u => {
                                const val = securityPolicyEngine.validateUserClaims(u);
                                return `
                                    <tr class="hover:bg-slate-800/40 transition">
                                        <td class="p-4 font-bold text-slate-100">${u.nombre || 'Usuario'}</td>
                                        <td class="p-4 font-mono text-slate-400">${u.email}</td>
                                        <td class="p-4">${eiamAdapter.getRoleBadgeHtml(val.firestoreRole)}</td>
                                        <td class="p-4">${val.statusBadge}</td>
                                        <td class="p-4 text-right">
                                            <button onclick="identityService.syncClaims('${u.uid}').then(() => { if (typeof toast !== 'undefined') toast.show('Claims Reparados'); governanceCenterModule.switchSubTab('claims'); })" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow">
                                                Reparar Sync Claims
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    syncAllUserClaims: async () => {
        if (!confirm('¿Confirmas la resincronización batch de Custom Claims para todos los usuarios?')) return;
        try {
            for (const u of governanceCenterModule.identities) {
                await identityService.syncClaims(u.uid);
            }
            if (typeof toast !== 'undefined') toast.show('Batch Claims Sync Completado');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('claims');
        } catch (e) {
            alert('Error en resincronización batch: ' + e.message);
        }
    },

    // ─── 11. SESIONES ────────────────────────────────────────────────────────

    renderSessionsContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>💻</span> Remote Sessions Active Map (${governanceCenterModule.sessions.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Control de sesiones remotas activas con geolocalización IP y capacidad de cierre instantáneo.</p>
                    </div>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Session ID</th>
                                <th class="p-4">UID Usuario</th>
                                <th class="p-4">Dispositivo / Browser</th>
                                <th class="p-4">Dirección IP</th>
                                <th class="p-4">Fecha Inicio</th>
                                <th class="p-4 text-right">Acción Cierre</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.sessions.length === 0 ? `
                                <tr>
                                    <td colspan="6" class="p-8 text-center text-slate-500 italic">No se registran sesiones remotas activas en /sessions.</td>
                                </tr>
                            ` : governanceCenterModule.sessions.map(s => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 text-indigo-400 font-bold">${s.sessionId}</td>
                                    <td class="p-4 text-slate-200 font-sans">${s.uid || 'desconocido'}</td>
                                    <td class="p-4 text-slate-400 font-sans">${s.userAgent || 'Web Browser'}</td>
                                    <td class="p-4 text-cyan-400">${s.ipAddress || '190.10.20.30'}</td>
                                    <td class="p-4 text-slate-400">${s.loginAt ? new Date(s.loginAt).toLocaleString() : 'Reciente'}</td>
                                    <td class="p-4 text-right font-sans">
                                        <button onclick="governanceCenterModule.revokeSession('${s.sessionId}', '${s.uid}')" class="px-3 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-bold transition">
                                            🚪 Cerrar Sesión
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    revokeSession: async (sessionId, uid) => {
        if (!confirm(`¿Confirmas el cierre remoto de la sesión ${sessionId}?`)) return;
        try {
            await identityService.revokeSession(sessionId, uid);
            if (typeof toast !== 'undefined') toast.show('Sesión revocada');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('sessions');
        } catch (e) {
            alert('Error al revocar sesión: ' + e.message);
        }
    },

    // ─── 12. DISPOSITIVOS ────────────────────────────────────────────────────

    renderDevicesContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>📱</span> Device Trust Engine & Hardware Risk Score (${governanceCenterModule.devices.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Clasificación de hardware registrado, bloqueo remoto y prevención de Root/Emulador.</p>
                    </div>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Device ID</th>
                                <th class="p-4">UID Usuario</th>
                                <th class="p-4">Modelo Hardware</th>
                                <th class="p-4">OS / APK Version</th>
                                <th class="p-4 text-center">Confianza Trust</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.devices.length === 0 ? `
                                <tr>
                                    <td colspan="6" class="p-8 text-center text-slate-500 italic">No hay dispositivos registrados en /user_devices.</td>
                                </tr>
                            ` : governanceCenterModule.devices.map(d => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 font-mono font-bold text-indigo-400">
                                        <p>${d.deviceId}</p>
                                        <p class="text-[10px] text-slate-500 font-sans font-normal">FCM: ${d.truncatedToken || 'Sin Token'}</p>
                                    </td>
                                    <td class="p-4 text-slate-200 font-sans">${d.uid || 'N/A'}</td>
                                    <td class="p-4 text-slate-300 font-sans">${d.model || d.platform || 'Android APK Client'}</td>
                                    <td class="p-4 text-slate-400">${d.platform || 'Android'} (${d.appVersion || 'v2.2'})</td>
                                    <td class="p-4 text-center font-sans">
                                        <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg ${d.trusted !== false ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}">
                                            ${d.trusted !== false ? '🟢 ALTA (TRUSTED)' : '⛔ RESTRINGIDO'}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right font-sans">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="governanceCenterModule.toggleDeviceLock('${d.deviceId}', ${d.trusted !== false})" class="px-2.5 py-1 ${d.trusted !== false ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'} rounded-lg text-xs font-bold transition">
                                                ${d.trusted !== false ? '🔒 Bloquear' : '🟢 Desbloquear'}
                                            </button>
                                            <button onclick="governanceCenterModule.deleteDevice('${d.deviceId}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-bold transition">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    toggleDeviceLock: async (deviceId, currentTrusted) => {
        const isLocking = currentTrusted;
        try {
            await identityService.toggleDeviceLock(deviceId, isLocking);
            if (typeof toast !== 'undefined') toast.show(`Dispositivo ${isLocking ? 'bloqueado' : 'desbloqueado'}`);
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('devices');
        } catch (e) {
            alert('Error al actualizar dispositivo: ' + e.message);
        }
    },

    deleteDevice: async (deviceId) => {
        if (!confirm(`¿Confirmas eliminar el dispositivo ${deviceId}?`)) return;
        try {
            await identityService.deleteDevice(deviceId);
            if (typeof toast !== 'undefined') toast.show('Dispositivo eliminado');
            await governanceCenterModule.loadData();
            governanceCenterModule.switchSubTab('devices');
        } catch (e) {
            alert('Error al eliminar dispositivo: ' + e.message);
        }
    },

    // ─── 13. EVENTOS DE AUDITORIA ─────────────────────────────────────────────

    renderEventsContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>📜</span> Eventos Audit & Logs Inmutables (${governanceCenterModule.auditEvents.length})
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Historial inmutable de auditoría para trazabilidad legal y financiera.</p>
                    </div>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Dominio</th>
                                <th class="p-4">Tipo Evento</th>
                                <th class="p-4">Descripción</th>
                                <th class="p-4">UID / Actor</th>
                                <th class="p-4">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80 font-mono">
                            ${governanceCenterModule.auditEvents.map(ev => `
                                <tr class="hover:bg-slate-800/40 transition">
                                    <td class="p-4 text-indigo-400 font-bold">${ev.domain || 'SECURITY'}</td>
                                    <td class="p-4 font-bold text-white">${ev.eventType || ev.event || 'EVENT'}</td>
                                    <td class="p-4 text-slate-300 font-sans">${ev.description || ev.reason || 'Sin descripción'}</td>
                                    <td class="p-4 text-slate-400 font-sans">${ev.uid || ev.triggeredBy || 'system'}</td>
                                    <td class="p-4 text-slate-500">${ev.timestamp ? new Date(ev.timestamp.seconds * 1000).toLocaleString() : 'Reciente'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ─── 14. TIMELINE REAL ────────────────────────────────────────────────────

    renderTimelineContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <span>⏱️</span> Timeline Cronológico Unificado de Gobernanza
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">Línea de tiempo en tiempo real de todos los eventos del sistema.</p>
                </div>

                <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div class="relative border-l-2 border-indigo-500/30 pl-6 ml-4 space-y-6">
                        ${governanceCenterModule.auditEvents.map(ev => `
                            <div class="relative group">
                                <div class="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-900 group-hover:scale-125 transition"></div>
                                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                                    <div class="flex justify-between items-center">
                                        <span class="font-bold text-indigo-400 text-sm font-sans">${ev.eventType || ev.event || 'EVENT'}</span>
                                        <span class="text-[10px] text-slate-500 font-mono">${ev.timestamp ? new Date(ev.timestamp.seconds * 1000).toLocaleString() : 'Reciente'}</span>
                                    </div>
                                    <p class="text-xs text-slate-300 font-sans">${ev.description || ev.reason || 'Operación registrada en el Governance Center.'}</p>
                                    <p class="text-[10px] text-slate-500 font-mono">Ejecutado por UID: ${ev.uid || ev.triggeredBy || 'system'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // ─── 15. RISK SCORE ENGINE ────────────────────────────────────────────────

    renderRisksContent: (container) => {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>⚠️</span> Risk Score Engine (Monitoreo de Riesgo 0 a 100)
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">Puntuación dinámica de riesgo calculada por telemetría de hardware, VPN, elevaciones y auditoría.</p>
                    </div>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                                <th class="p-4">Identidad</th>
                                <th class="p-4">Email</th>
                                <th class="p-4">Risk Score (0-100)</th>
                                <th class="p-4">Nivel de Riesgo</th>
                                <th class="p-4 text-right">Acción Auditoría</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80">
                            ${governanceCenterModule.identities.map(u => {
                                const risk = securityPolicyEngine.calculateRiskScore(u.uid, {}, {}, []);
                                return `
                                    <tr class="hover:bg-slate-800/40 transition">
                                        <td class="p-4 font-bold text-slate-100">${u.nombre || 'Usuario'}</td>
                                        <td class="p-4 font-mono text-slate-400">${u.email}</td>
                                        <td class="p-4 font-mono font-bold text-sm ${risk.score >= 60 ? 'text-rose-400' : risk.score >= 25 ? 'text-amber-400' : 'text-emerald-400'}">${risk.score} / 100</td>
                                        <td class="p-4">
                                            <span class="px-2.5 py-1 text-[10px] font-mono font-bold rounded-full border ${risk.colorClass}">
                                                ${risk.level}
                                            </span>
                                        </td>
                                        <td class="p-4 text-right">
                                            <button onclick="governanceCenterModule.openIdentityWorkspace360('${u.uid}')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700">
                                                Inspeccionar Workspace 360°
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    openIdentityWorkspace360: async (uid) => {
        const data360 = await identityService.getIdentity360(uid);
        if (!data360) return alert('No se encontraron datos para la identidad.');

        const u = data360.user;
        const html = `
            <div class="space-y-4">
                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                    <p class="font-bold text-white text-sm">${u.nombre || 'Usuario'}</p>
                    <p class="text-indigo-400 font-mono text-xs">${u.email}</p>
                    <p class="text-slate-400 font-mono text-[11px]">UID: ${u.uid}</p>
                    <p class="text-emerald-400 font-bold text-xs mt-2">Rol Canónico: ${data360.canonicalRole}</p>
                </div>

                <div class="space-y-2">
                    <h4 class="font-bold text-slate-300 text-xs">📱 Dispositivos Vinculados (${data360.devices.length}):</h4>
                    ${data360.devices.map(d => `<div class="p-2.5 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 border border-slate-800">${d.model || d.deviceId} - ${d.trusted ? '🟢 Trusted' : '🔴 Untrusted'}</div>`).join('') || '<p class="text-slate-500 italic">Ninguno</p>'}
                </div>

                <div class="space-y-2">
                    <h4 class="font-bold text-slate-300 text-xs">💻 Sesiones Remotas (${data360.sessions.length}):</h4>
                    ${data360.sessions.map(s => `<div class="p-2.5 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 border border-slate-800">${s.sessionId} - IP: ${s.ipAddress || '190.10.20.30'}</div>`).join('') || '<p class="text-slate-500 italic">Ninguna</p>'}
                </div>
            </div>
        `;

        drawer.open('drawer-workspace360', `Identity 360° Workspace — ${u.nombre || u.uid}`, html);
    },

    // ─── BANDEJA DE SOLICITUDES DE AFILIACIÓN (ADR-011) ───────────────────────

    // ─── BANDEJA DE SOLICITUDES DE AFILIACIÓN (ADR-011) ───────────────────────

    _isApprovingApp: false,
    _currentApplicationDocId: null,

    renderApplicationsContent: async (container, statusFilter = 'all') => {
        container.innerHTML = `
            <div class="flex items-center justify-center p-12">
                <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        `;

        try {
            // Sincronización con AuthReadyGate si aún no está inicializado
            if (window.AuthReadyGate && !window.AuthReadyGate.isReady && window.AuthReadyGate.waitUntilReady) {
                await window.AuthReadyGate.waitUntilReady();
            }

            const selectedTenant = governanceCenterModule.selectedOrgId && governanceCenterModule.selectedOrgId !== 'all'
                ? governanceCenterModule.selectedOrgId
                : null;

            const applications = await governanceService.getMerchantApplications(statusFilter, selectedTenant);

            // Contadores para métricas rápidas
            const allApps = await governanceService.getMerchantApplications('all', selectedTenant);
            const pendingCount = allApps.filter(a => a.status === 'PENDING').length;
            const underReviewCount = allApps.filter(a => a.status === 'UNDER_REVIEW').length;
            const docsReqCount = allApps.filter(a => a.status === 'DOCS_REQUESTED').length;
            const activeCount = allApps.filter(a => a.status === 'ACTIVE' || a.status === 'ONBOARDING' || a.status === 'APPROVED').length;

        let html = `
            <div class="space-y-6">
                <!-- Header Banner con Métricas y Filtros Rápidos -->
                <div class="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div class="flex items-center gap-3">
                            <span class="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 text-xl">📝</span>
                            <div>
                                <h3 class="text-xl font-bold text-white">Centro de Afiliación & Documentos Comerciales</h3>
                                <p class="text-xs text-slate-400">Revisión de expedientes, verificación documental (KYC) y aprovisionamiento EIAM.</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <button onclick="governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'), '${statusFilter}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5">
                                <span>🔄</span> Actualizar
                            </button>
                        </div>
                    </div>

                    <!-- Métricas de Estado -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
                        <div onclick="governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'), 'PENDING')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'PENDING' ? 'border-amber-500' : 'border-slate-800'} cursor-pointer hover:border-amber-500/50 transition">
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">⏳ Pendientes</span>
                            <span class="text-lg font-black text-amber-400">${pendingCount}</span>
                        </div>
                        <div onclick="governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'), 'DOCS_REQUESTED')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'DOCS_REQUESTED' ? 'border-orange-500' : 'border-slate-800'} cursor-pointer hover:border-orange-500/50 transition">
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">📄 Docs Requeridos</span>
                            <span class="text-lg font-black text-orange-400">${docsReqCount}</span>
                        </div>
                        <div onclick="governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'), 'APPROVED')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'APPROVED' ? 'border-cyan-500' : 'border-slate-800'} cursor-pointer hover:border-cyan-500/50 transition">
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">⚡ En Onboarding / Activos</span>
                            <span class="text-lg font-black text-cyan-400">${activeCount}</span>
                        </div>
                        <div onclick="governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'), 'all')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'all' ? 'border-indigo-500' : 'border-slate-800'} cursor-pointer hover:border-indigo-500/50 transition">
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">📋 Total Solicitudes</span>
                            <span class="text-lg font-black text-indigo-300">${allApps.length}</span>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Solicitudes -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs text-slate-300">
                            <thead class="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                    <th class="p-4">Comercio / Razón Social</th>
                                    <th class="p-4">RUC / NIT</th>
                                    <th class="p-4">Contacto & Canales</th>
                                    <th class="p-4">Ciudad / Zona</th>
                                    <th class="p-4 text-center">Expediente Docs</th>
                                    <th class="p-4 text-center">Estado</th>
                                    <th class="p-4 text-center">Acciones EIAM</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/60 font-mono">
        `;

        if (applications.length === 0) {
            html += `
                <tr>
                    <td colspan="7" class="p-8 text-center text-slate-500 italic">
                        No hay solicitudes de afiliación que coincidan con el filtro seleccionado.
                    </td>
                </tr>
            `;
        } else {
            applications.forEach(app => {
                const statusBadge = governanceCenterModule.getApplicationStatusBadge(app.status);
                const docsList = Array.isArray(app.documents) ? app.documents : [];
                const docsCount = docsList.length;
                const approvedDocsCount = docsList.filter(d => d.status === 'APPROVED').length;
                const rejectedDocsCount = docsList.filter(d => d.status === 'REJECTED').length;

                let docsBadgeHtml = '';
                if (docsCount === 0) {
                    docsBadgeHtml = `<span class="px-2 py-1 bg-slate-800 text-slate-500 border border-slate-700 rounded-lg text-[10px] font-bold">⚠️ Sin docs</span>`;
                } else if (rejectedDocsCount > 0) {
                    docsBadgeHtml = `<span class="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold">⚠️ ${rejectedDocsCount} Rechazado(s)</span>`;
                } else if (approvedDocsCount === docsCount) {
                    docsBadgeHtml = `<span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold">✅ ${approvedDocsCount}/${docsCount} Aprobados</span>`;
                } else {
                    docsBadgeHtml = `<span class="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-bold">📂 ${docsCount} Adjunto(s)</span>`;
                }

                html += `
                    <tr class="hover:bg-slate-800/40 transition">
                        <td class="p-4 font-sans">
                            <div class="flex items-center gap-2">
                                <span class="text-base">🏪</span>
                                <div>
                                    <p class="font-bold text-white text-sm">${app.businessName}</p>
                                    <p class="text-[11px] text-slate-400">${app.legalName || app.businessName} • <span class="text-indigo-400 font-mono">${app.appId || app.applicationId}</span></p>
                                </div>
                            </div>
                            ${(app.businessId || app.provisionedBusinessId || app.organizationId || app.branchId) ? `
                                <div class="flex flex-wrap gap-1.5 mt-1.5 font-mono text-[10px]">
                                    ${(app.businessId || app.provisionedBusinessId) ? `<span class="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 rounded">🏪 Biz: ${app.businessId || app.provisionedBusinessId}</span>` : ''}
                                    ${app.organizationId ? `<span class="px-1.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 rounded">🏙️ Org: ${app.organizationId}</span>` : ''}
                                </div>
                            ` : ''}
                        </td>
                        <td class="p-4 text-indigo-300 font-bold font-mono">${app.ruc || 'N/A'}</td>
                        <td class="p-4 font-sans">
                            <p class="font-semibold text-slate-200">${app.contactName || 'N/A'}</p>
                            <p class="text-[11px] text-slate-400 font-mono">${app.email || 'N/A'}</p>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[11px] text-slate-500 font-mono">${app.phone || 'N/A'}</span>
                                ${app.phone ? `<a href="https://wa.me/${app.phone.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-400 hover:text-emerald-300 text-[10px]" title="Abrir WhatsApp">💬</a>` : ''}
                            </div>
                        </td>
                        <td class="p-4 font-sans text-slate-300">
                            <p class="font-medium">${app.city || 'N/A'}</p>
                            ${app.zone ? `<p class="text-[11px] text-slate-500">${app.zone}</p>` : ''}
                        </td>
                        <td class="p-4 text-center font-sans">
                            ${docsBadgeHtml}
                        </td>
                        <td class="p-4 text-center">${statusBadge}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <!-- Botón Ver Expediente 360° -->
                                <button onclick="governanceCenterModule.openApplicationDrawer('${app.firestoreDocId}')" class="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-lg font-bold text-[11px] transition flex items-center gap-1">
                                    <span>👁️</span> Expediente
                                </button>

                                ${app.status === 'PENDING' || app.status === 'UNDER_REVIEW' || app.status === 'DOCS_REQUESTED' ? `
                                    <button onclick="governanceCenterModule.approveMerchantApp('${app.firestoreDocId}')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-[11px] transition" title="Aprobar Solicitud">
                                        ⚡ Aprobar
                                    </button>
                                    <button onclick="governanceCenterModule.requestDocsMerchantApp('${app.firestoreDocId}')" class="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] transition" title="Solicitar Documentos">
                                        📄
                                    </button>
                                    <button onclick="governanceCenterModule.rejectMerchantApp('${app.firestoreDocId}')" class="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-lg font-bold text-[11px] transition" title="Rechazar Solicitud">
                                        ❌
                                    </button>
                                ` : `
                                    <span class="text-[11px] text-slate-500 italic">Procesado</span>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        } catch (err) {
            console.error('[GOVERNANCE_CENTER] Error al renderizar solicitudes de comercios:', err);
            container.innerHTML = `
                <div class="p-8 bg-slate-900 border border-rose-500/40 rounded-2xl text-center space-y-4 max-w-lg mx-auto my-8">
                    <span class="text-4xl block">⛔</span>
                    <h3 class="text-base font-bold text-rose-300">No fue posible consultar las solicitudes de afiliación</h3>
                    <p class="text-xs text-slate-400 leading-relaxed">
                        ${err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))
                            ? 'Acceso restringido: Verifique que su cuenta posea los permisos administrativos necesarios o que el inquilino seleccionado sea el autorizado.'
                            : (err.message || 'Error de conexión con Firestore.')}
                    </p>
                    <div class="pt-2">
                        <button onclick="governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'), '${statusFilter}')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 mx-auto border border-slate-700">
                            <span>🔄</span> Reintentar Consulta
                        </button>
                    </div>
                </div>
            `;
        }
    },

    getApplicationStatusBadge: (status) => {
        switch (status) {
            case 'PENDING':
                return `<span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg font-bold text-[10px]">⏳ PENDING</span>`;
            case 'UNDER_REVIEW':
                return `<span class="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg font-bold text-[10px]">🔍 UNDER_REVIEW</span>`;
            case 'DOCS_REQUESTED':
                return `<span class="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-lg font-bold text-[10px]">📄 DOCS_REQUESTED</span>`;
            case 'APPROVED':
            case 'ONBOARDING':
                return `<span class="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg font-bold text-[10px]">⚡ ONBOARDING</span>`;
            case 'ACTIVE':
                return `<span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[10px]">🟢 ACTIVE</span>`;
            case 'REJECTED':
                return `<span class="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg font-bold text-[10px]">❌ REJECTED</span>`;
            default:
                return `<span class="px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px]">${status || 'UNKNOWN'}</span>`;
        }
    },

    // ─── APPLICATION DETAIL DRAWER (EXPEDIENTE 360°) ──────────────────────────

    openApplicationDrawer: async (firestoreDocId) => {
        if (!firestoreDocId) return;
        governanceCenterModule._currentApplicationDocId = firestoreDocId;

        // Mostrar loading en drawer
        const loadingHtml = `
            <div class="flex flex-col items-center justify-center p-12 space-y-3">
                <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-400 font-mono">Cargando expediente comercial...</p>
            </div>
        `;
        drawer.open('drawer-merchant-application', '📂 Expediente de Afiliación Comercial', loadingHtml);

        try {
            const app = await governanceService.getMerchantApplicationById(firestoreDocId);

            // Registrar evento de auditoría de lectura
            try {
                await governanceService.logAuditEvent('MERCHANT_APPLICATION_VIEWED', {
                    applicationId: app.appId || app.applicationId || firestoreDocId,
                    businessName: app.businessName,
                    email: app.email
                });
            } catch (auditErr) {
                console.warn('[GOVERNANCE_CENTER] Error registrando auditoría:', auditErr);
            }

            const statusBadge = governanceCenterModule.getApplicationStatusBadge(app.status);
            const docs = Array.isArray(app.documents) ? app.documents : [];

            const humanDocType = (type) => {
                switch (type) {
                    case 'RUC': return { label: 'Cédula RUC / NIT', icon: '📄', desc: 'Registro único de contribuyente' };
                    case 'SANITY_PERMIT': return { label: 'Permiso Sanitario / Operación', icon: '🏥', desc: 'Licencia sanitaria de funcionamiento' };
                    case 'ID_CARD': return { label: 'Identificación Legal (Cédula/ID)', icon: '🪪', desc: 'Identificación oficial del representante' };
                    default: return { label: 'Otro Documento Legal', icon: '📦', desc: 'Documento complementario adjunto' };
                }
            };

            const formatFileSize = (bytes) => {
                if (!bytes || bytes === 0) return 'Tamaño no disponible';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
            };

            const contentHtml = `
                <div class="space-y-6">
                    <!-- Cabecera del Expediente -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">ID EXPEDIENTE: ${app.appId || app.applicationId}</span>
                                <h3 class="text-xl font-black text-white mt-0.5">${app.businessName}</h3>
                                <p class="text-xs text-slate-400 font-medium">${app.legalName || app.businessName}</p>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>

                        ${app.docsRequestedNote ? `
                            <div class="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs">
                                <span class="font-bold block uppercase tracking-wider text-[10px]">Nota de Documentos Requeridos:</span>
                                <p class="mt-0.5">${app.docsRequestedNote}</p>
                            </div>
                        ` : ''}

                        ${app.rejectionReason ? `
                            <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                                <span class="font-bold block uppercase tracking-wider text-[10px]">Motivo del Rechazo:</span>
                                <p class="mt-0.5">${app.rejectionReason}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Sección 1: Información Comercial & Fiscal -->
                    <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            <span>🏢</span>
                            <span>1. Identificación Comercial & Fiscal</span>
                        </div>
                        <div class="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">RUC / NIT</span>
                                <span class="text-indigo-300 font-mono font-bold">${app.ruc || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Rubro / Categoría</span>
                                <span class="text-white font-medium capitalize">${app.category || 'Restaurante'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Fecha de Solicitud</span>
                                <span class="text-slate-300 font-mono">${app.createdAt ? new Date(app.createdAt.seconds ? app.createdAt.seconds * 1000 : app.createdAt).toLocaleString() : 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Última Revisión</span>
                                <span class="text-slate-300 font-mono">${app.reviewedAt ? new Date(app.reviewedAt.seconds ? app.reviewedAt.seconds * 1000 : app.reviewedAt).toLocaleString() : (app.reviewedBy ? 'Por ' + app.reviewedBy : 'Pendiente')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 2: Representante & Canales de Contacto -->
                    <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            <span>👤</span>
                            <span>2. Representante & Contacto</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Nombre del Representante</span>
                                <span class="text-white font-semibold">${app.contactName || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Correo Electrónico Oficial</span>
                                <a href="mailto:${app.email}" class="text-indigo-400 hover:text-indigo-300 font-mono underline">${app.email || 'N/A'}</a>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Teléfono / Móvil</span>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-slate-200 font-mono">${app.phone || 'N/A'}</span>
                                    ${app.phone ? `
                                        <a href="tel:${app.phone}" class="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] hover:bg-slate-700">📞 Llamar</a>
                                        <a href="https://wa.me/${app.phone.replace(/[^0-9]/g, '')}" target="_blank" class="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 rounded text-[10px] hover:bg-emerald-900">💬 WhatsApp</a>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 3: Ubicación Física & Georreferenciación GPS -->
                    <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            <span>📍</span>
                            <span>3. Ubicación & Georreferenciación</span>
                        </div>
                        <div class="space-y-2 text-xs">
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Ciudad / Zona</span>
                                <span class="text-white font-medium">${app.city || 'N/A'} ${app.zone ? `— ${app.zone}` : ''}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Dirección Exacta</span>
                                <p class="text-slate-200 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">${app.address || 'N/A'}</p>
                            </div>
                            ${app.location ? `
                                <div class="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px]">
                                    <div>
                                        <span class="text-indigo-300 font-bold block">Coordenadas GPS de la Sucursal</span>
                                        <span class="text-slate-400 font-mono">Lat: ${(app.location.latitude || app.location._latitude || 0).toFixed(6)}, Lon: ${(app.location.longitude || app.location._longitude || 0).toFixed(6)}</span>
                                    </div>
                                    <a href="https://www.google.com/maps/search/?api=1&query=${app.location.latitude || app.location._latitude},${app.location.longitude || app.location._longitude}" target="_blank" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition">
                                        🗺️ Ver en Maps
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Sección 4: Centro de Control Documental (Document Center) -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                <span>📂</span>
                                <span>4. Documentación Legal Adjunta (${docs.length})</span>
                            </div>
                            <span class="text-[10px] text-slate-500 font-mono">Storage Aislado</span>
                        </div>

                        ${docs.length === 0 ? `
                            <div class="p-6 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-1">
                                <span class="text-2xl">⚠️</span>
                                <p class="text-xs font-bold text-slate-300">Sin documentos adjuntos</p>
                                <p class="text-[11px] text-slate-500">El aspirante no subió archivos durante el formulario. Puedes solicitarlos usando la opción "📄 Solicitar Docs".</p>
                            </div>
                        ` : `
                            <div class="space-y-3">
                                ${docs.map((doc, idx) => {
                                    const docInfo = humanDocType(doc.documentType || doc.type);
                                    const docStatus = doc.status || 'PENDING_REVIEW';
                                    const docStatusBadge = docStatus === 'APPROVED'
                                        ? `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">✅ APROBADO</span>`
                                        : docStatus === 'REJECTED'
                                            ? `<span class="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">❌ RECHAZADO</span>`
                                            : `<span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold">⏳ PENDIENTE</span>`;

                                    return `
                                        <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                            <div class="flex items-start justify-between gap-3">
                                                <div class="flex items-start gap-2.5">
                                                    <span class="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-lg shrink-0">${docInfo.icon}</span>
                                                    <div>
                                                        <div class="flex items-center gap-2">
                                                            <h4 class="font-bold text-white text-xs">${docInfo.label}</h4>
                                                            ${docStatusBadge}
                                                        </div>
                                                        <p class="text-[11px] text-slate-400 font-mono truncate max-w-xs">${doc.name}</p>
                                                        <p class="text-[10px] text-slate-500 mt-0.5">${formatFileSize(doc.size)} • ${doc.contentType || 'Archivo'} • ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Subido'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            ${doc.rejectionReason ? `
                                                <div class="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[10px]">
                                                    <span class="font-bold uppercase">Motivo de rechazo:</span> ${doc.rejectionReason}
                                                </div>
                                            ` : ''}

                                            <!-- Acciones Documentales -->
                                            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                                                <div class="flex items-center gap-1.5">
                                                    <button onclick="governanceCenterModule.openDocumentViewer('${doc.storagePath}', '${encodeURIComponent(doc.name)}', '${doc.documentType || doc.type}', '${doc.contentType || ''}', '${app.appId || app.applicationId}')" class="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-lg font-bold text-[10px] transition flex items-center gap-1">
                                                        <span>👁️</span> Visualizar
                                                    </button>
                                                    <button onclick="governanceCenterModule.downloadDocument('${doc.storagePath}', '${encodeURIComponent(doc.name)}', '${doc.documentType || doc.type}', '${app.appId || app.applicationId}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-[10px] transition flex items-center gap-1">
                                                        <span>⬇️</span> Descargar
                                                    </button>
                                                </div>

                                                <div class="flex items-center gap-1">
                                                    <button onclick="governanceCenterModule.reviewDocument('${firestoreDocId}', '${doc.storagePath}', 'APPROVED')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition" title="Marcar como Válido">
                                                        ✓ Aprobar
                                                    </button>
                                                    <button onclick="governanceCenterModule.reviewDocument('${firestoreDocId}', '${doc.storagePath}', 'REJECTED')" class="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold transition" title="Marcar como Inválido / Ilegible">
                                                        ✕ Rechazar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Sección 5: Decisión & Aprobación EIAM -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block">5. Decisión de Afiliación EIAM</span>

                        ${app.status === 'PENDING' || app.status === 'UNDER_REVIEW' || app.status === 'DOCS_REQUESTED' ? `
                            <div class="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                                <button onclick="governanceCenterModule.approveMerchantApp('${firestoreDocId}')" class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5">
                                    <span>⚡</span> Aprobar Afiliación & Aprovisionar EIAM
                                </button>
                                <button onclick="governanceCenterModule.requestDocsMerchantApp('${firestoreDocId}')" class="px-3 py-2.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1">
                                    <span>📄</span> Solicitar Docs
                                </button>
                                <button onclick="governanceCenterModule.rejectMerchantApp('${firestoreDocId}')" class="px-3 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1">
                                    <span>❌</span> Rechazar
                                </button>
                            </div>
                        ` : `
                            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                                <div>
                                    <span class="font-bold text-white block">Solicitud en estado: ${app.status}</span>
                                    <span class="text-[11px] text-slate-500">Aprovisionamiento completado o finalizado.</span>
                                </div>
                                ${(app.businessId || app.provisionedBusinessId) ? `
                                    <span class="px-2 py-1 bg-emerald-950 text-emerald-300 rounded font-mono text-[10px]">Biz: ${app.businessId || app.provisionedBusinessId}</span>
                                ` : ''}
                            </div>
                        `}
                    </div>
                </div>
            `;

            drawer.open('drawer-merchant-application', `Expediente: ${app.businessName}`, contentHtml);

        } catch (e) {
            console.error('[GOVERNANCE_CENTER] Error al abrir expediente:', e);
            drawer.open('drawer-merchant-application', 'Error al Cargar', `
                <div class="p-6 text-center space-y-3">
                    <span class="text-3xl">⛔</span>
                    <p class="text-xs text-red-400 font-bold">No se pudo cargar el expediente.</p>
                    <p class="text-[11px] text-slate-500">${e.message}</p>
                </div>
            `);
        }
    },

    // ─── VISOR SEGURO DE DOCUMENTOS (PDF & IMÁGENES) ─────────────────────────

    openDocumentViewer: async (storagePath, encodedDocName, docType, mimeType, applicationId) => {
        const docName = decodeURIComponent(encodedDocName || 'Documento');

        // Modal container
        let modalEl = document.getElementById('modal-document-viewer');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'modal-document-viewer';
            modalEl.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-md transition-all select-none p-4';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="bg-slate-900 border border-indigo-500/30 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans text-slate-100 animate-fade-in">
                <!-- Header -->
                <div class="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-3">
                        <span class="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-lg">👁️</span>
                        <div>
                            <h3 class="text-sm font-extrabold text-white tracking-tight">${docName}</h3>
                            <p class="text-[10px] text-slate-400 font-mono">${docType} • Storage: ${storagePath}</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button id="modal-doc-download-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                            <span>⬇️</span> Descargar
                        </button>
                        <button onclick="governanceCenterModule.closeDocumentViewer()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Body (Loader inicial) -->
                <div id="modal-doc-body" class="p-6 flex-1 overflow-auto flex items-center justify-center min-h-[400px]">
                    <div class="flex flex-col items-center space-y-3">
                        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-xs text-slate-400 font-mono">Obteniendo enlace seguro de Firebase Storage...</p>
                    </div>
                </div>
            </div>
        `;
        modalEl.classList.remove('hidden');

        // Manejador de tecla ESC
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                governanceCenterModule.closeDocumentViewer();
                window.removeEventListener('keydown', onKeyDown);
            }
        };
        window.addEventListener('keydown', onKeyDown);

        try {
            const downloadUrl = await governanceService.getSecureDocumentDownloadUrl(storagePath, applicationId);

            // Registrar auditoría de visualización
            try {
                await governanceService.logAuditEvent('DOCUMENT_VIEWED', {
                    applicationId,
                    documentName: docName,
                    documentType: docType,
                    storagePath
                });
            } catch (auditErr) {
                console.warn('[GOVERNANCE_CENTER] Auditoría de visualización falló:', auditErr);
            }

            const downloadBtn = document.getElementById('modal-doc-download-btn');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    governanceCenterModule.downloadDocument(storagePath, encodedDocName, docType, applicationId);
                };
            }

            const bodyEl = document.getElementById('modal-doc-body');
            if (!bodyEl) return;

            const isPdf = mimeType === 'application/pdf' || docName.toLowerCase().endsWith('.pdf') || storagePath.toLowerCase().endsWith('.pdf');

            if (isPdf) {
                bodyEl.innerHTML = `
                    <iframe src="${downloadUrl}#toolbar=1" class="w-full h-[65vh] rounded-xl bg-slate-950 border border-slate-800 shadow-inner"></iframe>
                `;
            } else {
                bodyEl.innerHTML = `
                    <div class="flex flex-col items-center justify-center p-2">
                        <img src="${downloadUrl}" alt="${docName}" class="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800 bg-slate-950" />
                    </div>
                `;
            }

        } catch (err) {
            console.error('[GOVERNANCE_CENTER] Error al abrir documento:', err);
            const bodyEl = document.getElementById('modal-doc-body');
            if (bodyEl) {
                bodyEl.innerHTML = `
                    <div class="p-8 text-center space-y-3 max-w-md">
                        <span class="text-4xl">⚠️</span>
                        <h4 class="text-sm font-bold text-red-400">No se pudo cargar el documento</h4>
                        <p class="text-xs text-slate-400">${err.message}</p>
                    </div>
                `;
            }
        }
    },

    closeDocumentViewer: () => {
        const modalEl = document.getElementById('modal-document-viewer');
        if (modalEl) {
            modalEl.classList.add('hidden');
        }
    },

    // ─── DESCARGA SEGURA DE DOCUMENTOS ───────────────────────────────────────

    downloadDocument: async (storagePath, encodedDocName, docType, applicationId) => {
        const docName = decodeURIComponent(encodedDocName || 'documento');
        try {
            const downloadUrl = await governanceService.getSecureDocumentDownloadUrl(storagePath, applicationId);

            // Registrar evento de descarga
            try {
                await governanceService.logAuditEvent('DOCUMENT_DOWNLOADED', {
                    applicationId,
                    documentName: docName,
                    documentType: docType,
                    storagePath
                });
            } catch (auditErr) {
                console.warn('[GOVERNANCE_CENTER] Auditoría de descarga falló:', auditErr);
            }

            // Trigger de descarga seguro mediante elemento anchor temporal
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.download = docName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (err) {
            alert('❌ Error al descargar documento: ' + err.message);
        }
    },

    // ─── REVISIÓN DE DOCUMENTO INDIVIDUAL (APPROVE / REJECT) ─────────────────

    reviewDocument: async (firestoreDocId, storagePath, newStatus) => {
        let reason = null;
        if (newStatus === 'REJECTED') {
            reason = prompt('Ingresa el motivo del rechazo del documento (ej: Imagen ilegible, Permiso vencido, etc.):');
            if (reason === null) return;
            if (reason.trim() === '') {
                alert('Debes ingresar un motivo para rechazar el documento.');
                return;
            }
        }

        try {
            await governanceService.updateApplicationDocumentStatus(firestoreDocId, storagePath, newStatus, reason);
            alert(`✅ Documento marcado como ${newStatus === 'APPROVED' ? 'APROBADO' : 'RECHAZADO'}.`);

            // Refrescar el Drawer actual y la tabla de fondo
            if (governanceCenterModule._currentApplicationDocId === firestoreDocId) {
                governanceCenterModule.openApplicationDrawer(firestoreDocId);
            }
            governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'));

        } catch (e) {
            alert('❌ Error al actualizar documento: ' + e.message);
        }
    },

    // ─── ACCIONES DE APROBACIÓN / RECHAZO DE SOLICITUD ────────────────────────

    approveMerchantApp: async (firestoreDocId) => {
        if (governanceCenterModule._isApprovingApp) return;

        if (!confirm('¿Confirmas la aprobación de esta solicitud comercial?\n\nAl aprobar, la Cloud Function canónica ejecutará de forma atómica el aprovisionamiento EIAM (Creación de usuario Auth, Organization, Business, Branch, Settings, Membership y credenciales por email).')) return;

        governanceCenterModule._isApprovingApp = true;
        try {
            await governanceService.approveMerchantApplication(firestoreDocId);
            alert('✅ Solicitud aprobada con éxito. El motor de provisión EIAM ha sido activado.');

            if (governanceCenterModule._currentApplicationDocId === firestoreDocId) {
                drawer.close('drawer-merchant-application');
            }
            governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al aprobar la solicitud: ' + e.message);
        } finally {
            governanceCenterModule._isApprovingApp = false;
        }
    },

    rejectMerchantApp: async (firestoreDocId) => {
        const reason = prompt('Ingresa el motivo del rechazo de la solicitud comercial:');
        if (reason === null) return;
        if (reason.trim() === '') {
            alert('Debes ingresar un motivo para el rechazo.');
            return;
        }
        try {
            await governanceService.rejectMerchantApplication(firestoreDocId, reason);
            alert('Solicitud marcada como REJECTED.');

            if (governanceCenterModule._currentApplicationDocId === firestoreDocId) {
                drawer.close('drawer-merchant-application');
            }
            governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al rechazar la solicitud: ' + e.message);
        }
    },

    requestDocsMerchantApp: async (firestoreDocId) => {
        const note = prompt('Ingresa la nota especificando los documentos requeridos al comercio:');
        if (note === null) return;
        if (note.trim() === '') {
            alert('Debes ingresar una nota con los documentos requeridos.');
            return;
        }
        try {
            await governanceService.requestDocsMerchantApplication(firestoreDocId, note);
            alert('Solicitud actualizada a DOCS_REQUESTED.');

            if (governanceCenterModule._currentApplicationDocId === firestoreDocId) {
                governanceCenterModule.openApplicationDrawer(firestoreDocId);
            }
            governanceCenterModule.renderApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al solicitar documentos: ' + e.message);
        }
    },

    // ─── BANDEJA DE SOLICITUDES DE MOTORIZADOS (COURIER ONBOARDING ENTERPRISE) ───

    _isApprovingCourierApp: false,
    _currentCourierAppDocId: null,

    renderCourierApplicationsContent: async (container, statusFilter = 'all') => {
        container.innerHTML = `
            <div class="flex items-center justify-center p-12">
                <div class="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        `;

        try {
            // Sincronización con AuthReadyGate si aún no está inicializado
            if (window.AuthReadyGate && !window.AuthReadyGate.isReady && window.AuthReadyGate.waitUntilReady) {
                await window.AuthReadyGate.waitUntilReady();
            }

            const selectedTenant = governanceCenterModule.selectedOrgId && governanceCenterModule.selectedOrgId !== 'all'
                ? governanceCenterModule.selectedOrgId
                : null;

            const applications = await governanceService.getCourierApplications(statusFilter, selectedTenant);
            const allApps = await governanceService.getCourierApplications('all', selectedTenant);

            const pendingCount = allApps.filter(a => a.status === 'PENDING_REVIEW' || a.status === 'PENDING').length;
            const underReviewCount = allApps.filter(a => a.status === 'UNDER_REVIEW').length;
            const approvedCount = allApps.filter(a => a.status === 'APPROVED').length;
            const rejectedCount = allApps.filter(a => a.status === 'REJECTED').length;

            // Función para enmascarar cédula (ej: 001-******-****)
            const maskNationalId = (id) => {
                if (!id || typeof id !== 'string') return 'N/A';
                const clean = id.trim();
                if (clean.length <= 6) return clean;
                return clean.substring(0, 3) + '-******-' + clean.substring(clean.length - 4);
            };

            let html = `
                <div class="space-y-6 select-none font-sans">
                    <!-- Header Banner con Métricas y Filtros Rápidos -->
                    <div class="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div class="flex items-center gap-3">
                                <span class="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-xl">🛵</span>
                                <div>
                                    <h3 class="text-xl font-bold text-white">Centro de Validación de Motorizados (Courier Verification)</h3>
                                    <p class="text-xs text-slate-400">Expedientes de aspirantes a la flota, verificación documental KYC, inspección de moto y habilitación Fleet Core.</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-3">
                                <button onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), '${statusFilter}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5">
                                    <span>🔄</span> Actualizar
                                </button>
                            </div>
                        </div>

                        <!-- Métricas de Estado -->
                        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800">
                            <div onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), 'PENDING_REVIEW')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'PENDING_REVIEW' ? 'border-amber-500' : 'border-slate-800'} cursor-pointer hover:border-amber-500/50 transition">
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">⏳ Pendientes</span>
                                <span class="text-lg font-black text-amber-400">${pendingCount}</span>
                            </div>
                            <div onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), 'UNDER_REVIEW')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'UNDER_REVIEW' ? 'border-blue-500' : 'border-slate-800'} cursor-pointer hover:border-blue-500/50 transition">
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🔍 En Revisión</span>
                                <span class="text-lg font-black text-blue-400">${underReviewCount}</span>
                            </div>
                            <div onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), 'APPROVED')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'APPROVED' ? 'border-emerald-500' : 'border-slate-800'} cursor-pointer hover:border-emerald-500/50 transition">
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">⚡ Aprobados</span>
                                <span class="text-lg font-black text-emerald-400">${approvedCount}</span>
                            </div>
                            <div onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), 'REJECTED')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'REJECTED' ? 'border-red-500' : 'border-slate-800'} cursor-pointer hover:border-red-500/50 transition">
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">❌ Rechazados</span>
                                <span class="text-lg font-black text-red-400">${rejectedCount}</span>
                            </div>
                            <div onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), 'all')" class="p-3 rounded-xl bg-slate-950/60 border ${statusFilter === 'all' ? 'border-cyan-500' : 'border-slate-800'} cursor-pointer hover:border-cyan-500/50 transition">
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">📋 Total Solicitudes</span>
                                <span class="text-lg font-black text-cyan-300">${allApps.length}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tabla de Solicitudes de Motorizados -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-slate-300">
                                <thead class="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                                    <tr>
                                        <th class="p-4">Motorizado / Contacto</th>
                                        <th class="p-4">Cédula Nacional</th>
                                        <th class="p-4">Motocicleta & Placa</th>
                                        <th class="p-4">Ubicación</th>
                                        <th class="p-4 text-center">Expediente Docs</th>
                                        <th class="p-4 text-center">Estado</th>
                                        <th class="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60 font-mono">
            `;

            if (applications.length === 0) {
                html += `
                    <tr>
                        <td colspan="7" class="p-8 text-center text-slate-500 italic font-sans">
                            No hay solicitudes de motorizados que coincidan con el filtro seleccionado.
                        </td>
                    </tr>
                `;
            } else {
                applications.forEach(app => {
                    const statusBadge = governanceCenterModule.getCourierApplicationStatusBadge(app.status);
                    const p = app.personal || {};
                    const v = app.vehicle || {};
                    const d = app.documents || {};
                    const candidateName = p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Aspirante';
                    const hasDocs = d.idFront && d.idBack && d.profilePhoto && d.registration && d.insurance && d.driverLicense;

                    html += `
                        <tr class="hover:bg-slate-800/40 transition">
                            <td class="p-4 font-sans">
                                <div class="flex items-center gap-2.5">
                                    <span class="text-xl">🛵</span>
                                    <div>
                                        <p class="font-bold text-white text-sm">${candidateName}</p>
                                        <p class="text-[11px] text-slate-400 font-mono">${p.email || 'N/A'}</p>
                                        <div class="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-500">
                                            <span>${p.phone || 'N/A'}</span>
                                            ${p.phone ? `<a href="https://wa.me/${p.phone.replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-400 hover:text-emerald-300 text-[10px]" title="Abrir WhatsApp">💬 WhatsApp</a>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td class="p-4 font-mono font-bold text-slate-300">
                                <span>${maskNationalId(p.nationalId)}</span>
                            </td>
                            <td class="p-4 font-sans">
                                <p class="font-semibold text-slate-200">${v.brand || 'Moto'} ${v.model || ''}</p>
                                <span class="inline-block mt-0.5 px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/40 rounded font-mono font-bold text-[10px] tracking-widest uppercase">
                                    🏍️ ${v.plate || 'SIN PLACA'}
                                </span>
                            </td>
                            <td class="p-4 font-sans text-slate-300">
                                <p class="font-medium">${p.city || 'N/A'}</p>
                                <p class="text-[11px] text-slate-500">${p.department || 'N/A'}</p>
                            </td>
                            <td class="p-4 text-center font-sans">
                                ${hasDocs ? `
                                    <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold">
                                        ✅ 6/6 Docs Completos
                                    </span>
                                ` : `
                                    <span class="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold">
                                        ⚠️ Documentación Parcial
                                    </span>
                                `}
                            </td>
                            <td class="p-4 text-center">${statusBadge}</td>
                            <td class="p-4 text-center">
                                <div class="flex items-center justify-center gap-1.5 font-sans">
                                    <!-- Botón Ver Expediente 360° -->
                                    <button onclick="governanceCenterModule.openCourierApplicationDrawer('${app.firestoreDocId}')" class="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 rounded-lg font-bold text-[11px] transition flex items-center gap-1">
                                        <span>👁️</span> Expediente 360°
                                    </button>

                                    ${(app.status === 'PENDING_REVIEW' || app.status === 'PENDING' || app.status === 'UNDER_REVIEW') ? `
                                        <button onclick="governanceCenterModule.approveCourierApp('${app.firestoreDocId}')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-[11px] transition flex items-center gap-1" title="Aprobar y Habilitar en Fleet Core">
                                            <span>⚡</span> Aprobar
                                        </button>
                                        <button onclick="governanceCenterModule.rejectCourierApp('${app.firestoreDocId}')" class="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-lg font-bold text-[11px] transition" title="Rechazar Solicitud">
                                            ❌
                                        </button>
                                    ` : app.status === 'REJECTED' ? `
                                        <button onclick="governanceCenterModule.reopenCourierApp('${app.firestoreDocId}')" class="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] transition flex items-center gap-1" title="Reactivar a Revisión (Permitir corrección de documentos)">
                                            <span>🔄</span> Reabrir
                                        </button>
                                        <button onclick="governanceCenterModule.approveCourierApp('${app.firestoreDocId}')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-[11px] transition flex items-center gap-1" title="Aprobar Solicitud">
                                            <span>⚡</span> Aprobar
                                        </button>
                                        <button onclick="governanceCenterModule.deleteCourierApp('${app.firestoreDocId}')" class="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded-lg font-bold text-[11px] transition" title="Eliminar/Purgar Registro Definitivamente">
                                            🗑️
                                        </button>
                                    ` : `
                                        <span class="text-[11px] text-emerald-400 font-bold">✓ Activo</span>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
        } catch (err) {
            console.error('[GOVERNANCE_CENTER] Error al renderizar solicitudes de motorizados:', err);
            container.innerHTML = `
                <div class="p-8 bg-slate-900 border border-rose-500/40 rounded-2xl text-center space-y-4 max-w-lg mx-auto my-8">
                    <span class="text-4xl block">⛔</span>
                    <h3 class="text-base font-bold text-rose-300">No fue posible consultar las solicitudes de motorizados</h3>
                    <p class="text-xs text-slate-400 leading-relaxed">
                        ${err.code === 'permission-denied' || (err.message && err.message.includes('permissions'))
                            ? 'Acceso restringido: Verifique que su cuenta posea los permisos administrativos necesarios o que el inquilino seleccionado sea el autorizado.'
                            : (err.message || 'Error de conexión con Firestore.')}
                    </p>
                    <div class="pt-2">
                        <button onclick="governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'), '${statusFilter}')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 mx-auto border border-slate-700">
                            <span>🔄</span> Reintentar Consulta
                        </button>
                    </div>
                </div>
            `;
        }
    },

    getCourierApplicationStatusBadge: (status) => {
        switch (status) {
            case 'PENDING_REVIEW':
            case 'PENDING':
                return `<span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg font-bold text-[10px]">⏳ PENDING_REVIEW</span>`;
            case 'UNDER_REVIEW':
                return `<span class="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg font-bold text-[10px]">🔍 UNDER_REVIEW</span>`;
            case 'APPROVED':
                return `<span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[10px]">🟢 APPROVED</span>`;
            case 'REJECTED':
                return `<span class="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg font-bold text-[10px]">❌ REJECTED</span>`;
            default:
                return `<span class="px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px]">${status || 'UNKNOWN'}</span>`;
        }
    },

    // ─── COURIER VERIFICATION CENTER (EXPEDIENTE 360° DRAWER) ─────────────────

    openCourierApplicationDrawer: async (firestoreDocId) => {
        if (!firestoreDocId) return;
        governanceCenterModule._currentCourierAppDocId = firestoreDocId;

        const loadingHtml = `
            <div class="flex flex-col items-center justify-center p-12 space-y-3">
                <div class="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-400 font-mono">Cargando expediente de motorizado...</p>
            </div>
        `;
        drawer.open('drawer-courier-application', '📂 Expediente de Motorizado (Verification Center)', loadingHtml);

        try {
            const app = await governanceService.getCourierApplicationById(firestoreDocId);

            try {
                await governanceService.logAuditEvent('COURIER_APPLICATION_VIEWED', {
                    applicationId: app.applicationId || firestoreDocId,
                    candidateName: app.personal?.fullName,
                    email: app.personal?.email
                }, 'COURIER_GOVERNANCE');
            } catch (auditErr) {
                console.warn('[GOVERNANCE_CENTER] Error registrando auditoría:', auditErr);
            }

            const statusBadge = governanceCenterModule.getCourierApplicationStatusBadge(app.status);
            const p = app.personal || {};
            const v = app.vehicle || {};
            const d = app.documents || {};

            const docsConfig = [
                { key: 'idFront', label: 'Cédula de Identidad (Frente)', icon: '🪪', data: d.idFront },
                { key: 'idBack', label: 'Cédula de Identidad (Reverso)', icon: '🪪', data: d.idBack },
                { key: 'profilePhoto', label: 'Fotografía de Perfil', icon: '👤', data: d.profilePhoto },
                { key: 'registration', label: 'Circulación de Motocicleta', icon: '📄', data: d.registration },
                { key: 'insurance', label: 'Póliza de Seguro Vigente', icon: '🛡️', data: d.insurance },
                { key: 'driverLicense', label: 'Licencia de Conducir', icon: '🛵', data: d.driverLicense }
            ];

            const formatFileSize = (bytes) => {
                if (!bytes) return 'N/A';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
            };

            const contentHtml = `
                <div class="space-y-6 select-none font-sans">
                    <!-- Cabecera del Expediente -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
                            <div>
                                <span class="text-[10px] text-cyan-400 font-mono font-bold uppercase">Expediente ID</span>
                                <h3 class="text-lg font-extrabold text-white font-mono">${app.applicationId || firestoreDocId}</h3>
                            </div>
                            <div>${statusBadge}</div>
                        </div>

                        ${app.rejectionReason ? `
                            <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                                <span class="font-bold">⚠️ Motivo de Rechazo:</span> ${app.rejectionReason}
                            </div>
                        ` : ''}

                        ${app.provisionedCourierId ? `
                            <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                                <span class="font-bold">⚡ Motorizado Aprovisionado:</span> UID <span class="font-mono">${app.provisionedCourierId}</span> en dominio <code>/couriers</code>.
                            </div>
                        ` : ''}
                    </div>

                    <!-- Sección 1: Datos Personales -->
                    <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <span>👤</span>
                            <span>1. Información Personal del Aspirante</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Nombre Completo</span>
                                <span class="text-white font-bold text-sm">${p.fullName || `${p.firstName || ''} ${p.lastName || ''}`}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Cédula Nacional (Sin Enmascarar)</span>
                                <span class="text-indigo-300 font-mono font-bold text-sm">${p.nationalId || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Teléfono / WhatsApp</span>
                                <span class="text-white font-mono">${p.phone || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Correo Electrónico</span>
                                <span class="text-white font-mono">${p.email || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Departamento</span>
                                <span class="text-slate-300">${p.department || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Ciudad / Municipio</span>
                                <span class="text-slate-300">${p.city || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 2: Datos de la Motocicleta -->
                    <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            <span>🏍️</span>
                            <span>2. Datos de la Motocicleta</span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Marca</span>
                                <span class="text-white font-bold">${v.brand || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Modelo</span>
                                <span class="text-white font-bold">${v.model || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Año</span>
                                <span class="text-white font-bold">${v.year || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Color</span>
                                <span class="text-white font-bold">${v.color || 'N/A'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[10px] block uppercase font-bold">Placa Canónica</span>
                                <span class="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/40 rounded-lg font-mono font-black text-sm tracking-widest uppercase inline-block">
                                    ${v.plate || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 3: Documentación & Inspección Visual -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                <span>📂</span>
                                <span>3. Inspección Documental Digital (6 Requisitos)</span>
                            </div>
                            <span class="text-[10px] text-slate-500 font-mono">Storage Seguro</span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${docsConfig.map(dc => {
                                const doc = dc.data;
                                return `
                                    <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="flex items-center gap-2">
                                                <span class="text-base">${dc.icon}</span>
                                                <h4 class="font-bold text-white text-xs">${dc.label}</h4>
                                            </div>
                                            ${doc ? `
                                                <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                                                    ✓ Adjunto
                                                </span>
                                            ` : `
                                                <span class="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-[10px] font-bold">
                                                    Falta
                                                </span>
                                            `}
                                        </div>

                                        ${doc ? `
                                            <p class="text-[11px] text-slate-400 font-mono truncate">${doc.name || 'documento'}</p>
                                            <p class="text-[10px] text-slate-500">${formatFileSize(doc.size)} • ${doc.contentType || 'image'}</p>
                                            <button onclick="governanceCenterModule.viewCourierDocument('${doc.storagePath}', '${dc.label}')" class="w-full mt-2 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5">
                                                <span>🔍</span> Ver Documento / Zoom
                                            </button>
                                        ` : `
                                            <p class="text-[11px] text-slate-600 italic">No disponible en este expediente</p>
                                        `}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Sección 4: Checklist de Verificación Administrativa -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            <span>✅</span>
                            <span>4. Checklist de Validación Documental Obligatoria</span>
                        </div>
                        <p class="text-xs text-slate-400">Verifica cada elemento antes de autorizar la habilitación del repartidor:</p>

                        <div class="space-y-2 text-xs text-slate-300 pt-1">
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-1" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Identidad verificada y Cédula Frente revisada</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-2" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Cédula Reverso revisada y legible</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-3" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Fotografía de perfil verificada (rostro nítido)</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-4" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Datos de moto y placa verificados contra circulación</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-5" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Circulación vehicular vigente confirmada</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-6" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Póliza de Seguro vigente confirmada</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition">
                                <input type="checkbox" id="chk-courier-7" class="courier-val-chk w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500" />
                                <span>Licencia de conducir válida para motocicleta</span>
                            </label>
                        </div>
                    </div>

                    <!-- Sección 5: Botones de Decisión Administrativa -->
                    ${app.status === 'REJECTED' ? `
                        <div class="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-3">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-red-300 flex items-center gap-1.5">
                                    <span>🚫</span> ESTADO: RECHAZADO PREVIAMENTE
                                </span>
                                <span class="text-[11px] text-slate-400 font-mono">
                                    ${app.reviewedAt ? new Date(app.reviewedAt.toDate ? app.reviewedAt.toDate() : app.reviewedAt).toLocaleString() : ''}
                                </span>
                            </div>
                            <div class="p-2.5 rounded-xl bg-slate-950 border border-red-900/40 text-xs text-slate-300">
                                <strong class="text-red-400 block mb-1">Motivo del rechazo:</strong>
                                ${app.rejectionReason || 'No especificado'}
                            </div>
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                ℹ️ Por normativa, el postulante debe esperar 48 horas para registrar una nueva solicitud desde el portal público. Sin embargo, como Administrador puedes <strong>Reactivar a Revisión</strong> para permitirle subsanar documentos, <strong>Aprobarlo directamente</strong> si ya entregó los requisitos, o <strong>Eliminar el registro</strong> para purgar sus datos y liberar su cédula/email de inmediato.
                            </p>
                            <div class="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-red-900/40">
                                <button onclick="governanceCenterModule.deleteCourierApp('${app.firestoreDocId}')" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/50 font-bold text-xs transition flex items-center justify-center gap-1.5" title="Eliminar registro de la base de datos">
                                    <span>🗑️</span> Eliminar Registro
                                </button>
                                <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <button onclick="governanceCenterModule.reopenCourierApp('${app.firestoreDocId}')" class="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center gap-1.5" title="Volver a estado PENDING_REVIEW">
                                        <span>🔄</span> Reactivar a Revisión
                                    </button>
                                    <button onclick="governanceCenterModule.approveCourierApp('${app.firestoreDocId}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5" title="Aprobar y aprovisionar en Flota">
                                        <span>⚡</span> Aprobar Motorizado
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : app.status === 'APPROVED' ? `
                        <div class="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                                <span>✅</span>
                                <span>Expediente Aprobado y Motorizado Aprovisionado en Flota</span>
                            </div>
                            <span class="text-[11px] text-slate-400 font-mono">UID: ${app.provisionedUid || 'Sincronizado'}</span>
                        </div>
                    ` : `
                        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <button onclick="governanceCenterModule.rejectCourierApp('${app.firestoreDocId}')" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 font-bold text-xs transition flex items-center justify-center gap-1.5">
                                <span>❌</span> Rechazar Solicitud
                            </button>

                            <button onclick="governanceCenterModule.approveCourierApp('${app.firestoreDocId}')" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5">
                                <span>⚡</span> Aprobar y Habilitar Motorizado
                            </button>
                        </div>
                    `}
                </div>
            `;

            drawer.open('drawer-courier-application', `Expediente: ${p.fullName || 'Motorizado'}`, contentHtml);

        } catch (e) {
            console.error('[GOVERNANCE_CENTER] Error al abrir expediente:', e);
            drawer.open('drawer-courier-application', 'Error', `<div class="p-8 text-center text-rose-400 text-xs">${e.message}</div>`);
        }
    },

    // ─── ACCIONES DE APROBACIÓN, RECHAZO, REACTIVACIÓN Y ELIMINACIÓN DE MOTORIZADOS ─

    approveCourierApp: async (firestoreDocId) => {
        if (governanceCenterModule._isApprovingCourierApp) return;

        // Validar checklist si está en el drawer
        const chks = document.querySelectorAll('.courier-val-chk');
        if (chks.length > 0) {
            const allChecked = Array.from(chks).every(c => c.checked);
            if (!allChecked) {
                if (!confirm('⚠️ Advertencia: No has marcado todos los puntos del checklist de validación documental.\n\n¿Deseas continuar con la aprobación de todos modos?')) {
                    return;
                }
            }
        }

        if (!confirm('¿Confirmar aprobación del motorizado?\n\nAl aprobar, el motorizado será aprovisionado en Firebase Auth, /users y /couriers con rol "courier" y quedará habilitado para operar según las reglas de Fleet Core.')) {
            return;
        }

        governanceCenterModule._isApprovingCourierApp = true;
        try {
            await governanceService.approveCourierApplication(firestoreDocId);
            alert('✅ Motorizado aprobado exitosamente. El trigger Cloud Function ha aprovisionado su cuenta y perfil.');

            if (governanceCenterModule._currentCourierAppDocId === firestoreDocId) {
                drawer.close('drawer-courier-application');
            }
            governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al aprobar motorizado: ' + e.message);
        } finally {
            governanceCenterModule._isApprovingCourierApp = false;
        }
    },

    rejectCourierApp: async (firestoreDocId) => {
        const reason = prompt('Ingresa el motivo del rechazo de la solicitud del motorizado:\n\n(Ej: Documento ilegible, Cédula inconsistente, Seguro vencido, Licencia inválida)');
        if (reason === null) return;
        if (reason.trim() === '') {
            alert('Debes ingresar un motivo obligatorio para el rechazo.');
            return;
        }
        try {
            await governanceService.rejectCourierApplication(firestoreDocId, reason);
            alert('Solicitud de motorizado marcada como REJECTED.\n\nEl postulante deberá esperar 48 horas para registrar una nueva solicitud, salvo que decidas reactivarla o eliminarla desde el panel.');

            if (governanceCenterModule._currentCourierAppDocId === firestoreDocId) {
                drawer.close('drawer-courier-application');
            }
            governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al rechazar solicitud: ' + e.message);
        }
    },

    reopenCourierApp: async (firestoreDocId) => {
        if (!confirm('¿Deseas reactivar esta solicitud rechazada y devolverla al estado "En Revisión"?\n\nEsto permitirá evaluar nuevamente al candidato y actualizar su documentación sin requerir que empiece un registro nuevo.')) {
            return;
        }
        try {
            await governanceService.reopenCourierApplication(firestoreDocId);
            alert('✅ Solicitud reactivada exitosamente. El expediente ha vuelto al estado PENDING_REVIEW.');

            if (governanceCenterModule._currentCourierAppDocId === firestoreDocId) {
                drawer.close('drawer-courier-application');
            }
            governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al reactivar solicitud: ' + e.message);
        }
    },

    deleteCourierApp: async (firestoreDocId) => {
        if (!confirm('⚠️ ¿Estás seguro de que deseas ELIMINAR DEFINITIVAMENTE este registro de solicitud?\n\nEsta acción purgará el documento de la base de datos y liberará de inmediato la cédula, el correo electrónico y la placa para que puedan volver a ser utilizados en un nuevo registro.')) {
            return;
        }
        try {
            const res = await governanceService.deleteCourierApplication(firestoreDocId);
            alert(res?.message || '✅ Solicitud eliminada definitivamente de la base de datos.');

            if (governanceCenterModule._currentCourierAppDocId === firestoreDocId) {
                drawer.close('drawer-courier-application');
            }
            governanceCenterModule.renderCourierApplicationsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al eliminar solicitud: ' + e.message);
        }
    },

    viewCourierDocument: async (storagePath, title) => {
        try {
            const url = await governanceService.getSecureDocumentDownloadUrl(storagePath);
            const isPdf = storagePath.toLowerCase().endsWith('.pdf');

            // Abrir modal de vista previa con zoom
            const modalId = 'courier-doc-zoom-modal';
            let modal = document.getElementById(modalId);
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div class="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-fadeIn">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🔍</span>
                            <h3 class="font-bold text-sm text-cyan-300">${title}</h3>
                        </div>
                        <div class="flex items-center gap-3">
                            <a href="${url}" target="_blank" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
                                <span>↗️</span> Abrir en Pestaña
                            </a>
                            <button onclick="document.getElementById('${modalId}').innerHTML = ''" class="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition">
                                ✕ Cerrar
                            </button>
                        </div>
                    </div>

                    <div class="flex-1 flex items-center justify-center p-4 overflow-auto">
                        ${isPdf ? `
                            <iframe src="${url}" class="w-full h-full rounded-xl border border-slate-800 bg-white"></iframe>
                        ` : `
                            <img src="${url}" alt="${title}" class="max-h-[82vh] max-w-full rounded-2xl shadow-2xl border border-slate-700 object-contain" />
                        `}
                    </div>
                </div>
            `;
        } catch (e) {
            alert('❌ Error al visualizar documento: ' + e.message);
        }
    },

    // ─── COURIER PROFILE REQUESTS (MODIFICACIONES DE PERFIL) ─────────────────

    renderCourierProfileRequestsContent: async (container) => {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 space-y-3">
                <div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-400 font-mono">Cargando solicitudes de modificación de perfil...</p>
            </div>
        `;

        try {
            const requests = await governanceService.getCourierProfileRequests();

            const pendingCount = requests.filter(r => r.status === 'PENDING_REVIEW' || r.status === 'pending_review').length;
            const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
            const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

            const formatTimestamp = (ts) => {
                if (!ts) return 'N/A';
                const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
                return date.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            };

            const getStatusBadge = (status) => {
                switch (status) {
                    case 'APPROVED':
                        return `<span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider">✓ Aprobada</span>`;
                    case 'REJECTED':
                        return `<span class="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider">✕ Rechazada</span>`;
                    case 'CANCELLED':
                        return `<span class="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Cancelada</span>`;
                    case 'PENDING_REVIEW':
                    default:
                        return `<span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider animate-pulse">🟡 Pendiente</span>`;
                }
            };

            container.innerHTML = `
                <div class="space-y-6 select-none font-sans">
                    <!-- Header -->
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-xl font-extrabold text-white">
                                    <span>🔧</span> Modificaciones de Perfil & Vehículo de Motorizados
                                </h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    Auditoría Actividad #2
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">
                                Bandeja administrativa para auditar, comparar OLD/NEW, inspeccionar documentos y autorizar cambios sensibles de motorizados.
                            </p>
                        </div>
                    </div>

                    <!-- Métricas KPI Rápidas -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                            <div>
                                <span class="text-slate-400 text-xs font-bold uppercase tracking-wider block">Pendientes de Revisión</span>
                                <span class="text-2xl font-black text-amber-400 font-mono">${pendingCount}</span>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
                                🟡
                            </div>
                        </div>

                        <div class="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                            <div>
                                <span class="text-slate-400 text-xs font-bold uppercase tracking-wider block">Modificaciones Aprobadas</span>
                                <span class="text-2xl font-black text-emerald-400 font-mono">${approvedCount}</span>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">
                                ✓
                            </div>
                        </div>

                        <div class="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                            <div>
                                <span class="text-slate-400 text-xs font-bold uppercase tracking-wider block">Rechazadas con Motivo</span>
                                <span class="text-2xl font-black text-rose-400 font-mono">${rejectedCount}</span>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg">
                                ✕
                            </div>
                        </div>
                    </div>

                    <!-- Tabla de Solicitudes -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                            <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Historial de Solicitudes (${requests.length})</span>
                            <span class="text-[11px] text-slate-500 font-mono">/courier_profile_requests</span>
                        </div>

                        ${requests.length === 0 ? `
                            <div class="p-12 text-center text-slate-500 text-xs space-y-2">
                                <span class="text-3xl block">📭</span>
                                <p>No hay solicitudes de modificación de perfil registradas en el sistema.</p>
                            </div>
                        ` : `
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300">
                                    <thead class="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                                        <tr>
                                            <th class="p-4">ID Solicitud</th>
                                            <th class="p-4">Motorizado</th>
                                            <th class="p-4">Tipo Cambio</th>
                                            <th class="p-4">Dato Anterior (OLD)</th>
                                            <th class="p-4">Dato Solicitado (NEW)</th>
                                            <th class="p-4">Estado</th>
                                            <th class="p-4">Fecha</th>
                                            <th class="p-4 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800/60 font-mono">
                                        ${requests.map(req => {
                                            const oldV = req.oldValues || {};
                                            const newV = req.newValues || {};
                                            const isVehicle = req.requestType === 'VEHICLE_CHANGE' || newV.vehiclePlate || newV.vehicleBrand || newV.vehicleModel;

                                            return `
                                                <tr class="hover:bg-slate-800/40 transition">
                                                    <td class="p-4 text-cyan-400 font-bold">${req.requestId || req.firestoreDocId}</td>
                                                    <td class="p-4 font-sans">
                                                        <div class="font-bold text-white">${oldV.name || req.courierId}</div>
                                                        <div class="text-[11px] text-slate-500 font-mono">UID: ${req.courierId}</div>
                                                    </td>
                                                    <td class="p-4 font-sans">
                                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                                            ${req.requestType || 'MODIFICACIÓN'}
                                                        </span>
                                                    </td>
                                                    <td class="p-4 text-slate-400 font-sans">
                                                        ${isVehicle ? `
                                                            <div>${oldV.vehicleBrand || ''} ${oldV.vehicleModel || ''} <span class="text-slate-500 text-[10px]">(${oldV.vehicleYear || '2024'} • ${oldV.vehicleColor || 'Negro'})</span></div>
                                                            <div class="text-amber-400 font-mono font-bold">${oldV.vehiclePlate || 'Sin placa'}</div>
                                                        ` : `
                                                            <div>${oldV.phone || oldV.name || 'N/A'}</div>
                                                        `}
                                                    </td>
                                                    <td class="p-4 text-slate-200 font-sans">
                                                        ${isVehicle ? `
                                                            <div class="text-white font-bold">${newV.vehicleBrand || ''} ${newV.vehicleModel || ''} <span class="text-emerald-400 text-[10px]">(${newV.vehicleYear || oldV.vehicleYear || '2024'} • ${newV.vehicleColor || oldV.vehicleColor || 'Negro'})</span></div>
                                                            <div class="text-emerald-400 font-mono font-bold">${newV.vehiclePlate || 'Sin placa'}</div>
                                                        ` : `
                                                            <div class="text-white font-bold">${newV.phone || newV.name || 'N/A'}</div>
                                                        `}
                                                    </td>
                                                    <td class="p-4">${getStatusBadge(req.status)}</td>
                                                    <td class="p-4 text-slate-500 text-[11px]">${formatTimestamp(req.createdAt)}</td>
                                                    <td class="p-4 text-right font-sans">
                                                        <button onclick="governanceCenterModule.openCourierProfileRequestDrawer('${req.firestoreDocId}')" class="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition border border-indigo-500/30">
                                                            🔍 Auditar & Decidir
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="p-8 text-center text-rose-400 text-xs">Error cargando solicitudes: ${e.message}</div>`;
        }
    },

    openCourierProfileRequestDrawer: async (firestoreDocId) => {
        if (!firestoreDocId) return;

        const loadingHtml = `
            <div class="flex flex-col items-center justify-center p-12 space-y-3">
                <div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs text-slate-400 font-mono">Cargando expediente de modificación...</p>
            </div>
        `;
        drawer.open('drawer-courier-profile-request', '📂 Auditoría de Modificación de Perfil', loadingHtml);

        try {
            const req = await governanceService.getCourierProfileRequestById(firestoreDocId);
            const oldV = req.oldValues || {};
            const newV = req.newValues || {};
            const docs = req.documents || {};

            const isPending = req.status === 'PENDING_REVIEW' || req.status === 'pending_review';

            const oldBrand = oldV.vehicleBrand || oldV.brand || '';
            const newBrand = newV.vehicleBrand || newV.brand || '';
            const brandChanged = Boolean(newBrand && newBrand.trim().toLowerCase() !== oldBrand.trim().toLowerCase());

            const oldModel = oldV.vehicleModel || oldV.model || '';
            const newModel = newV.vehicleModel || newV.model || '';
            const modelChanged = Boolean(newModel && newModel.trim().toLowerCase() !== oldModel.trim().toLowerCase());

            const oldYear = String(oldV.vehicleYear || oldV.year || '2024');
            const newYear = String(newV.vehicleYear || newV.year || oldYear);
            const yearChanged = Boolean(newYear && newYear !== oldYear && oldYear !== '');

            const oldColor = oldV.vehicleColor || oldV.color || 'Negro';
            const newColor = newV.vehicleColor || newV.color || oldColor;
            const colorChanged = Boolean(newColor && newColor.trim().toLowerCase() !== oldColor.trim().toLowerCase());

            const oldPlate = (oldV.vehiclePlate || oldV.plate || oldV.placa || '').replace(/\s+/g, '').toUpperCase();
            const newPlate = (newV.vehiclePlate || newV.plate || newV.placa || '').replace(/\s+/g, '').toUpperCase();
            const plateChanged = Boolean(newPlate && newPlate !== oldPlate);

            const oldPhone = (oldV.phone || oldV.telefono || '').replace(/\s+/g, '');
            const newPhone = (newV.phone || newV.telefono || '').replace(/\s+/g, '');
            const phoneChanged = Boolean(newPhone && newPhone !== oldPhone);

            const diffBadge = (isChanged) => isChanged
                ? `<span class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">Modificado</span>`
                : `<span class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-500 uppercase">Sin cambio</span>`;

            const hasAnyChange = brandChanged || modelChanged || yearChanged || colorChanged || plateChanged || phoneChanged;

            const contentHtml = `
                <div class="space-y-6 select-none font-sans">
                    <!-- Cabecera -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div class="flex justify-between items-center pb-2 border-b border-slate-800">
                            <div>
                                <span class="text-[10px] text-amber-400 font-mono font-bold uppercase">Solicitud ID</span>
                                <h3 class="text-base font-extrabold text-white font-mono">${req.requestId || firestoreDocId}</h3>
                            </div>
                            <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}">
                                ${req.status}
                            </span>
                        </div>
                        <div class="text-xs text-slate-400">
                            <span>Motorizado UID: </span><span class="font-mono text-cyan-300">${req.courierId}</span>
                        </div>
                        ${req.rejectionReason ? `
                            <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                                <strong>Motivo de Rechazo:</strong> ${req.rejectionReason}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Resumen Auditoría de Campos Modificados -->
                    <div class="p-4 rounded-2xl ${hasAnyChange ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-900 border border-slate-800'} space-y-2">
                        <div class="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                            <span>⚡</span>
                            <span>Resumen de Auditoría: Campos Modificados</span>
                        </div>
                        ${hasAnyChange ? `
                            <div class="flex flex-wrap gap-2 pt-1">
                                ${brandChanged ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Marca: ${oldBrand || 'N/A'} → ${newBrand}</span>` : ''}
                                ${modelChanged ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Modelo: ${oldModel || 'N/A'} → ${newModel}</span>` : ''}
                                ${colorChanged ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Color: ${oldColor || 'N/A'} → ${newColor}</span>` : ''}
                                ${yearChanged ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Año: ${oldYear || 'N/A'} → ${newYear}</span>` : ''}
                                ${plateChanged ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Placa: ${oldPlate || 'N/A'} → ${newPlate}</span>` : ''}
                                ${phoneChanged ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Teléfono: ${oldPhone || 'N/A'} → ${newPhone}</span>` : ''}
                            </div>
                        ` : `
                            <p class="text-xs text-slate-400 italic">No se detectaron diferencias con los datos oficiales actuales.</p>
                        `}
                    </div>

                    <!-- Comparación Visual OLD vs NEW (Principio Fundamental de Datos) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Columna Izquierda: DATO OFICIAL ACTUAL -->
                        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                            <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                                <span>🔒</span>
                                <span>Dato Oficial Vigente (OLD)</span>
                            </div>
                            <div class="space-y-2 text-xs">
                                <div>
                                    <span class="text-slate-500 text-[10px] block uppercase font-bold">Marca Motocicleta</span>
                                    <span class="text-slate-300 font-bold">${oldBrand || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block uppercase font-bold">Modelo</span>
                                    <span class="text-slate-300 font-bold">${oldModel || 'N/A'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block uppercase font-bold">Año</span>
                                    <span class="text-slate-300 font-bold">${oldYear || '2024'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block uppercase font-bold">Color</span>
                                    <span class="text-slate-300 font-bold">${oldColor || 'Negro'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block uppercase font-bold">Placa Oficial</span>
                                    <span class="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded font-mono font-bold inline-block">
                                        ${oldPlate || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block uppercase font-bold">Teléfono Actual</span>
                                    <span class="text-slate-300 font-mono">${oldPhone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Columna Derecha: DATO SOLICITADO -->
                        <div class="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 shadow-glow-amber">
                            <div class="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                                <span>✨</span>
                                <span>Dato Nuevo Solicitado (NEW)</span>
                            </div>
                            <div class="space-y-2 text-xs">
                                <div>
                                    <div class="flex items-center">
                                        <span class="text-slate-500 text-[10px] uppercase font-bold">Nueva Marca</span>
                                        ${diffBadge(brandChanged)}
                                    </div>
                                    <span class="text-white font-bold text-sm ${brandChanged ? 'text-amber-300' : ''}">${newBrand || oldBrand || 'Sin cambios'}</span>
                                </div>
                                <div>
                                    <div class="flex items-center">
                                        <span class="text-slate-500 text-[10px] uppercase font-bold">Nuevo Modelo</span>
                                        ${diffBadge(modelChanged)}
                                    </div>
                                    <span class="text-white font-bold text-sm ${modelChanged ? 'text-amber-300' : ''}">${newModel || oldModel || 'Sin cambios'}</span>
                                </div>
                                <div>
                                    <div class="flex items-center">
                                        <span class="text-slate-500 text-[10px] uppercase font-bold">Nuevo Año</span>
                                        ${diffBadge(yearChanged)}
                                    </div>
                                    <span class="text-white font-bold text-sm ${yearChanged ? 'text-amber-300' : ''}">${newYear || oldYear || '2024'}</span>
                                </div>
                                <div>
                                    <div class="flex items-center">
                                        <span class="text-slate-500 text-[10px] uppercase font-bold">Nuevo Color Solicitado</span>
                                        ${diffBadge(colorChanged)}
                                    </div>
                                    <span class="text-white font-bold text-sm ${colorChanged ? 'text-amber-300' : ''}">${newColor || oldColor || 'Sin cambios'}</span>
                                </div>
                                <div>
                                    <div class="flex items-center">
                                        <span class="text-slate-500 text-[10px] uppercase font-bold">Nueva Placa Solicitada</span>
                                        ${diffBadge(plateChanged)}
                                    </div>
                                    <span class="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-mono font-black text-sm inline-block">
                                        ${newPlate || oldPlate || 'Sin cambios'}
                                    </span>
                                </div>
                                <div>
                                    <div class="flex items-center">
                                        <span class="text-slate-500 text-[10px] uppercase font-bold">Nuevo Teléfono</span>
                                        ${diffBadge(phoneChanged)}
                                    </div>
                                    <span class="text-white font-mono font-bold ${phoneChanged ? 'text-amber-300' : ''}">${newPhone || oldPhone || 'Sin cambios'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Documentos de Respaldo Adjuntos -->
                    <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <span>📂</span>
                            <span>Documentos de Respaldo Adjuntos</span>
                        </div>

                        ${Object.keys(docs).length === 0 ? `
                            <p class="text-xs text-slate-500 italic">No se adjuntaron nuevos documentos digitales a esta solicitud.</p>
                        ` : `
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${Object.keys(docs).map(dKey => {
                                    const d = docs[dKey];
                                    return `
                                        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                                            <div class="flex justify-between items-center">
                                                <span class="text-xs font-bold text-white uppercase">${dKey}</span>
                                                <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold">Adjunto</span>
                                            </div>
                                            <p class="text-[11px] text-slate-400 font-mono truncate">${d.name || dKey}</p>
                                            ${d.storagePath ? `
                                                <button onclick="governanceCenterModule.viewCourierDocument('${d.storagePath}', '${dKey}')" class="w-full mt-1 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                                    <span>🔍</span> Inspeccionar Documento
                                                </button>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Botones de Decisión Administrativa -->
                    ${isPending ? `
                        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <button onclick="governanceCenterModule.rejectCourierProfileRequestAction('${firestoreDocId}')" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-bold text-xs transition flex items-center justify-center gap-1.5">
                                <span>❌</span> Rechazar Solicitud
                            </button>

                            <button onclick="governanceCenterModule.approveCourierProfileRequestAction('${firestoreDocId}')" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5">
                                <span>⚡</span> Aprobar y Aplicar a Perfil Oficial
                            </button>
                        </div>
                    ` : `
                        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                            Esta solicitud fue procesada y se encuentra en estado <strong>${req.status}</strong>.
                        </div>
                    `}
                </div>
            `;

            drawer.open('drawer-courier-profile-request', '📂 Auditoría de Modificación de Perfil', contentHtml);
        } catch (e) {
            drawer.open('drawer-courier-profile-request', 'Error', `<div class="p-8 text-center text-rose-400 text-xs">${e.message}</div>`);
        }
    },

    approveCourierProfileRequestAction: async (firestoreDocId) => {
        if (!confirm('¿Confirmas la aprobación de esta modificación de perfil?\n\nAl aprobar, los nuevos datos (incluyendo motocicleta, placa y teléfono) reemplazarán a los anteriores en /couriers y /users de forma atómica y se notificará al motorizado.')) {
            return;
        }
        try {
            await governanceService.approveCourierProfileRequest(firestoreDocId);
            alert('✅ Modificación de perfil aprobada exitosamente. El trigger backend ha sincronizado el perfil oficial.');
            drawer.close('drawer-courier-profile-request');
            governanceCenterModule.renderCourierProfileRequestsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al aprobar modificación: ' + e.message);
        }
    },

    rejectCourierProfileRequestAction: async (firestoreDocId) => {
        const reason = prompt('Ingresa el motivo obligatorio del rechazo:\n\n(Ej: Documentos ilegibles, Placa inconsistente, Seguro vehicular vencido)');
        if (reason === null) return;
        if (!reason.trim()) {
            alert('Debes ingresar un motivo obligatorio para el rechazo.');
            return;
        }
        try {
            await governanceService.rejectCourierProfileRequest(firestoreDocId, reason.trim());
            alert('Solicitud de modificación marcada como REJECTED.');
            drawer.close('drawer-courier-profile-request');
            governanceCenterModule.renderCourierProfileRequestsContent(document.getElementById('gov-subtab-container'));
        } catch (e) {
            alert('❌ Error al rechazar solicitud: ' + e.message);
        }
    }
};

window.governanceCenterModule = governanceCenterModule;


