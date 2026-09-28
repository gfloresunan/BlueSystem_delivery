// =========================================================================================
// MÓDULO: CUSTOMER OPERATIONS CENTER & CUSTOMER 360 (liveCustomers.js)
// BlueSystem Delivery Enterprise v2.2 — Governance & Control Center
// Conforme a ADR-003, EIAM v2.2 y Baseline Inmutable
// =========================================================================================

const liveCustomersModule = {
    // Referencias a listeners activos de Firestore
    unsubscribeOrders: null,
    unsubscribeTrips: null,
    unsubscribeIncidents: null,

    // Mapas reactivos en memoria (O(1) lookups)
    activeOrdersMap: new Map(),     // customerId -> Order
    activeTripsMap: new Map(),      // customerId -> Trip
    activeIncidentsMap: new Map(),  // customerId -> Incident[]
    
    // Estado de navegación del módulo
    currentTab: 'live',             // 'live' | 'all' | 'commerce' | 'express' | 'incidents'
    searchQuery: '',
    
    // Paginación para pestaña "TODOS"
    pagination: {
        pageSize: 20,
        currentPage: 1,
        pageCursors: [null],       // Stack de cursors para [Pág 1, Pág 2, ...]
        hasNextPage: false,
        totalLoaded: 0
    },
    directoryUsersCache: [],       // Lista de la página actual en "TODOS"
    directoryLoading: false,

    // ─── 1. RESOLVER CANÓNICO DE IDENTIDAD Y CLAVES LEGACY ───────────────────
    extractCustomerId: (entity) => {
        if (!entity) return '';
        return entity.customerId || entity.clienteId || entity.userId || entity.senderUid || entity.uid || '';
    },

    extractCustomerName: (entity, fallbackUser = null) => {
        if (!entity && !fallbackUser) return 'Cliente';
        const name = entity?.customerName || entity?.clienteNombre || entity?.nombreCliente ||
                     entity?.senderName || fallbackUser?.nombre || fallbackUser?.name ||
                     fallbackUser?.displayName || '';
        return name.trim() || 'Cliente General';
    },

    extractCustomerPhone: (entity, fallbackUser = null) => {
        const phone = entity?.customerPhone || entity?.telefonoCliente || entity?.clienteTelefono ||
                      entity?.senderPhone || fallbackUser?.telefono || fallbackUser?.phone ||
                      fallbackUser?.phoneNumber || '';
        return phone.trim() || 'No registrado';
    },

    extractCustomerEmail: (entity, fallbackUser = null) => {
        const email = entity?.customerEmail || entity?.email || fallbackUser?.email || fallbackUser?.mail || '';
        return email.trim() || 'Sin correo';
    },

    // ─── 2. CICLO DE VIDA Y RENDER PRINCIPAL ─────────────────────────────────
    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in font-sans">
                <!-- Header Principal de Operaciones -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl text-indigo-400 shrink-0">
                            👥
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-xl font-black text-white tracking-tight">Customer Operations Center</h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">CUSTOMER 360</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">Supervisión en vivo de clientes con servicios activos, trazabilidad transaccional e inteligencia operativa</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="liveCustomersModule.refreshCurrentView()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 shadow">
                            <span>🔄</span> Actualizar
                        </button>
                    </div>
                </div>

                <!-- KPI Cards de Control Operativo -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Servicios en Vivo</p>
                        <div class="flex items-baseline gap-2 mt-1">
                            <span class="text-2xl font-black text-amber-400" id="kpi-live-active">0</span>
                            <span class="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Activos
                            </span>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commerce en Curso</p>
                        <p class="text-2xl font-black text-emerald-400 mt-1" id="kpi-live-commerce">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Express X→Y en Curso</p>
                        <p class="text-2xl font-black text-cyan-400 mt-1" id="kpi-live-trips">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Con Incidencias</p>
                        <p class="text-2xl font-black text-rose-400 mt-1" id="kpi-live-incidents">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md col-span-2 sm:col-span-1">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Directorio Clientes</p>
                        <p class="text-2xl font-black text-indigo-400 mt-1" id="kpi-total-directory">--</p>
                    </div>
                </div>

                <!-- Barra de Navegación Operativa & Búsqueda -->
                <div class="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow">
                    <!-- Tabs -->
                    <div class="flex flex-wrap items-center gap-1.5 w-full md:w-auto" id="customersTabsNav">
                        <button onclick="liveCustomersModule.switchTab('live')" id="tab-btn-live" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600 text-white shadow-lg">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 🔴 EN VIVO
                        </button>
                        <button onclick="liveCustomersModule.switchTab('all')" id="tab-btn-all" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                            📋 Todos los Clientes
                        </button>
                        <button onclick="liveCustomersModule.switchTab('commerce')" id="tab-btn-commerce" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                            📦 Commerce
                        </button>
                        <button onclick="liveCustomersModule.switchTab('express')" id="tab-btn-express" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                            ⚡ Express X→Y
                        </button>
                        <button onclick="liveCustomersModule.switchTab('incidents')" id="tab-btn-incidents" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                            ⚠️ Con Incidencias
                        </button>
                    </div>

                    <!-- Buscador Universal -->
                    <div class="w-full md:w-80 relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🔍</span>
                        <input type="text" id="customersSearchInput" oninput="liveCustomersModule.handleSearch(this.value)"
                            placeholder="Buscar por nombre, teléfono o UID..."
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono transition">
                    </div>
                </div>

                <!-- Contenedor Dinámico de la Tabla de Clientes -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th class="p-3.5">Cliente</th>
                                    <th class="p-3.5">Contacto</th>
                                    <th class="p-3.5">Estado Operativo en Vivo</th>
                                    <th class="p-3.5">Vertical / Servicio</th>
                                    <th class="p-3.5">Cuenta</th>
                                    <th class="p-3.5 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="customersTableBody" class="divide-y divide-slate-800/60 font-sans">
                                <tr>
                                    <td colspan="6" class="p-8 text-center text-slate-500">
                                        <div class="flex items-center justify-center gap-2">
                                            <span class="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                                            Sincronizando operaciones de clientes en tiempo real...
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Barra de Paginación Cursor-Based (Activa solo en tab "all") -->
                    <div id="customersPaginationBar" class="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs hidden">
                        <div class="text-slate-400 text-[11px]">
                            Página <span class="font-bold text-white" id="paginationCurrentPage">1</span> — Mostrando <span class="font-bold text-indigo-400" id="paginationPageCount">0</span> registros
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="btnPaginationPrev" onclick="liveCustomersModule.paginatePrev()" disabled
                                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 font-bold text-[11px] rounded-lg border border-slate-700 transition">
                                ⬅️ Anterior
                            </button>
                            <button id="btnPaginationNext" onclick="liveCustomersModule.paginateNext()" disabled
                                class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] rounded-lg transition shadow">
                                Siguiente ➡️
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        liveCustomersModule.initSnapshotListeners();
        liveCustomersModule.loadDirectoryTotalCount();
    },

    // ─── 3. LISTENERS REACTIVOS ACOTADOS (ANTI N+1) ─────────────────────────
    initSnapshotListeners: () => {
        // 1. Destrucción segura de suscripciones previas
        liveCustomersModule.destroy();

        if (typeof db === 'undefined' || !db) {
            console.error("[CUSTOMER_OPS] Firestore db no disponible");
            return;
        }

        // Listener A: Órdenes Commerce Activas (estados operativos en curso)
        const activeOrderStatuses = [
            'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
            'ASSIGNED', 'IN_TRANSIT', 'GOING_TO_CUSTOMER', 'AT_CUSTOMER'
        ];

        liveCustomersModule.unsubscribeOrders = db.collection('orders')
            .where('status', 'in', activeOrderStatuses)
            .limit(100)
            .onSnapshot(snapshot => {
                liveCustomersModule.activeOrdersMap.clear();
                snapshot.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    const cId = liveCustomersModule.extractCustomerId(data);
                    if (cId) {
                        liveCustomersModule.activeOrdersMap.set(cId, data);
                    }
                });
                liveCustomersModule.updateKPIs();
                if (liveCustomersModule.currentTab !== 'all') {
                    liveCustomersModule.renderCurrentView();
                }
            }, err => console.error("[CUSTOMER_OPS] Error en listener orders activos:", err));

        // Listener B: Viajes Express X→Y Activos
        const activeTripStatuses = [
            'REQUESTED', 'OFFERED', 'ASSIGNED', 'ARRIVED_ORIGIN',
            'PACKAGE_COLLECTED', 'IN_TRANSIT', 'ARRIVED_DESTINATION'
        ];

        liveCustomersModule.unsubscribeTrips = db.collection('deliveryTrips')
            .where('status', 'in', activeTripStatuses)
            .limit(100)
            .onSnapshot(snapshot => {
                liveCustomersModule.activeTripsMap.clear();
                snapshot.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    const cId = liveCustomersModule.extractCustomerId(data);
                    if (cId) {
                        liveCustomersModule.activeTripsMap.set(cId, data);
                    }
                });
                liveCustomersModule.updateKPIs();
                if (liveCustomersModule.currentTab !== 'all') {
                    liveCustomersModule.renderCurrentView();
                }
            }, err => console.error("[CUSTOMER_OPS] Error en listener trips activos:", err));

        // Listener C: Incidencias Abiertas
        liveCustomersModule.unsubscribeIncidents = db.collection('incidents')
            .where('status', 'in', ['OPEN', 'IN_REVIEW'])
            .limit(50)
            .onSnapshot(snapshot => {
                liveCustomersModule.activeIncidentsMap.clear();
                snapshot.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    const cId = data.customerId || data.clienteId || data.userId;
                    if (cId) {
                        if (!liveCustomersModule.activeIncidentsMap.has(cId)) {
                            liveCustomersModule.activeIncidentsMap.set(cId, []);
                        }
                        liveCustomersModule.activeIncidentsMap.get(cId).push(data);
                    }
                });
                liveCustomersModule.updateKPIs();
                if (liveCustomersModule.currentTab !== 'all') {
                    liveCustomersModule.renderCurrentView();
                }
            }, err => console.error("[CUSTOMER_OPS] Error en listener incidencias:", err));
    },

    destroy: () => {
        if (liveCustomersModule.unsubscribeOrders) {
            liveCustomersModule.unsubscribeOrders();
            liveCustomersModule.unsubscribeOrders = null;
        }
        if (liveCustomersModule.unsubscribeTrips) {
            liveCustomersModule.unsubscribeTrips();
            liveCustomersModule.unsubscribeTrips = null;
        }
        if (liveCustomersModule.unsubscribeIncidents) {
            liveCustomersModule.unsubscribeIncidents();
            liveCustomersModule.unsubscribeIncidents = null;
        }
    },

    // ─── 4. KPIS Y MÉTRICAS EN TIEMPO REAL ────────────────────────────────────
    updateKPIs: () => {
        const liveOrdersCount = liveCustomersModule.activeOrdersMap.size;
        const liveTripsCount = liveCustomersModule.activeTripsMap.size;
        
        // Unión de clientes únicos con al menos 1 servicio activo
        const activeClientIds = new Set([
            ...liveCustomersModule.activeOrdersMap.keys(),
            ...liveCustomersModule.activeTripsMap.keys()
        ]);

        const elLiveActive = document.getElementById('kpi-live-active');
        const elCommerce = document.getElementById('kpi-live-commerce');
        const elTrips = document.getElementById('kpi-live-trips');
        const elIncidents = document.getElementById('kpi-live-incidents');

        if (elLiveActive) elLiveActive.textContent = activeClientIds.size.toString();
        if (elCommerce) elCommerce.textContent = liveOrdersCount.toString();
        if (elTrips) elTrips.textContent = liveTripsCount.toString();
        if (elIncidents) elIncidents.textContent = liveCustomersModule.activeIncidentsMap.size.toString();
    },

    loadDirectoryTotalCount: async () => {
        try {
            if (typeof db === 'undefined' || !db) return;
            // Estimación o agregación de población
            const snap = await db.collection('users').limit(1000).get();
            const elTotal = document.getElementById('kpi-total-directory');
            if (elTotal) {
                elTotal.textContent = snap.size >= 1000 ? '1000+' : snap.size.toString();
            }
        } catch (e) {
            console.warn("[CUSTOMER_OPS] No se pudo leer conteo total:", e);
        }
    },

    // ─── 5. NAVEGACIÓN ENTRE PESTAÑAS ─────────────────────────────────────────
    switchTab: (tabKey) => {
        liveCustomersModule.currentTab = tabKey;
        liveCustomersModule.searchQuery = '';
        const searchInput = document.getElementById('customersSearchInput');
        if (searchInput) searchInput.value = '';

        // Estilos de botones de Tabs
        const tabKeys = ['live', 'all', 'commerce', 'express', 'incidents'];
        tabKeys.forEach(k => {
            const btn = document.getElementById(`tab-btn-${k}`);
            if (btn) {
                if (k === tabKey) {
                    btn.className = "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600 text-white shadow-lg";
                } else {
                    btn.className = "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800";
                }
            }
        });

        const pagBar = document.getElementById('customersPaginationBar');
        if (pagBar) {
            if (tabKey === 'all') pagBar.classList.remove('hidden');
            else pagBar.classList.add('hidden');
        }

        if (tabKey === 'all') {
            // Reiniciar paginación al cambiar a 'all'
            liveCustomersModule.pagination.currentPage = 1;
            liveCustomersModule.pagination.pageCursors = [null];
            liveCustomersModule.loadDirectoryPage();
        } else {
            liveCustomersModule.renderCurrentView();
        }
    },

    handleSearch: (val) => {
        liveCustomersModule.searchQuery = (val || '').toLowerCase().trim();
        liveCustomersModule.renderCurrentView();
    },

    refreshCurrentView: () => {
        if (liveCustomersModule.currentTab === 'all') {
            liveCustomersModule.loadDirectoryPage();
        } else {
            liveCustomersModule.renderCurrentView();
        }
        toast?.show?.('Vista de clientes sincronizada con éxito');
    },

    // ─── 6. MOTOR DE RENDERIZADO DE VISTAS ────────────────────────────────────
    renderCurrentView: () => {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        let clientsList = [];

        if (liveCustomersModule.currentTab === 'live') {
            // Clientes con Orden o Trip activo
            const liveMap = new Map();

            liveCustomersModule.activeOrdersMap.forEach((ord, cId) => {
                liveMap.set(cId, {
                    uid: cId,
                    name: liveCustomersModule.extractCustomerName(ord),
                    phone: liveCustomersModule.extractCustomerPhone(ord),
                    email: liveCustomersModule.extractCustomerEmail(ord),
                    activeOrder: ord,
                    activeTrip: null,
                    vertical: 'COMMERCE',
                    incident: liveCustomersModule.activeIncidentsMap.get(cId) || null
                });
            });

            liveCustomersModule.activeTripsMap.forEach((trip, cId) => {
                if (liveMap.has(cId)) {
                    const existing = liveMap.get(cId);
                    existing.activeTrip = trip;
                    existing.vertical = 'COMMERCE + X→Y';
                } else {
                    liveMap.set(cId, {
                        uid: cId,
                        name: liveCustomersModule.extractCustomerName(trip),
                        phone: liveCustomersModule.extractCustomerPhone(trip),
                        email: liveCustomersModule.extractCustomerEmail(trip),
                        activeOrder: null,
                        activeTrip: trip,
                        vertical: 'EXPRESS_X2Y',
                        incident: liveCustomersModule.activeIncidentsMap.get(cId) || null
                    });
                }
            });

            clientsList = Array.from(liveMap.values());

        } else if (liveCustomersModule.currentTab === 'commerce') {
            // Solo con orden activa de comercio
            liveCustomersModule.activeOrdersMap.forEach((ord, cId) => {
                clientsList.push({
                    uid: cId,
                    name: liveCustomersModule.extractCustomerName(ord),
                    phone: liveCustomersModule.extractCustomerPhone(ord),
                    email: liveCustomersModule.extractCustomerEmail(ord),
                    activeOrder: ord,
                    activeTrip: null,
                    vertical: 'COMMERCE',
                    incident: liveCustomersModule.activeIncidentsMap.get(cId) || null
                });
            });

        } else if (liveCustomersModule.currentTab === 'express') {
            // Solo con viaje activo express
            liveCustomersModule.activeTripsMap.forEach((trip, cId) => {
                clientsList.push({
                    uid: cId,
                    name: liveCustomersModule.extractCustomerName(trip),
                    phone: liveCustomersModule.extractCustomerPhone(trip),
                    email: liveCustomersModule.extractCustomerEmail(trip),
                    activeOrder: null,
                    activeTrip: trip,
                    vertical: 'EXPRESS_X2Y',
                    incident: liveCustomersModule.activeIncidentsMap.get(cId) || null
                });
            });

        } else if (liveCustomersModule.currentTab === 'incidents') {
            // Con incidencias activas
            liveCustomersModule.activeIncidentsMap.forEach((incList, cId) => {
                const ord = liveCustomersModule.activeOrdersMap.get(cId) || null;
                const trip = liveCustomersModule.activeTripsMap.get(cId) || null;
                clientsList.push({
                    uid: cId,
                    name: liveCustomersModule.extractCustomerName(ord || trip || incList[0]),
                    phone: liveCustomersModule.extractCustomerPhone(ord || trip || incList[0]),
                    email: liveCustomersModule.extractCustomerEmail(ord || trip || incList[0]),
                    activeOrder: ord,
                    activeTrip: trip,
                    vertical: incList.length > 0 ? `⚠️ ${incList.length} Caso(s)` : 'SOPORTE',
                    incident: incList
                });
            });

        } else if (liveCustomersModule.currentTab === 'all') {
            // Viene de directoryUsersCache
            clientsList = liveCustomersModule.directoryUsersCache.map(u => {
                const ord = liveCustomersModule.activeOrdersMap.get(u.uid) || null;
                const trip = liveCustomersModule.activeTripsMap.get(u.uid) || null;
                const inc = liveCustomersModule.activeIncidentsMap.get(u.uid) || null;
                return {
                    uid: u.uid,
                    name: u.effectiveName || u.nombre || u.name || 'Cliente',
                    phone: u.effectivePhone || u.telefono || u.phone || 'No registrado',
                    email: u.effectiveEmail || u.email || 'Sin correo',
                    activeOrder: ord,
                    activeTrip: trip,
                    vertical: ord ? 'COMMERCE' : (trip ? 'EXPRESS_X2Y' : 'REGISTRADO'),
                    incident: inc,
                    isActive: u.isActive !== false
                };
            });
        }

        // Aplicar filtro de búsqueda
        if (liveCustomersModule.searchQuery) {
            const q = liveCustomersModule.searchQuery;
            clientsList = clientsList.filter(c => {
                return (c.name || '').toLowerCase().includes(q) ||
                       (c.phone || '').toLowerCase().includes(q) ||
                       (c.email || '').toLowerCase().includes(q) ||
                       (c.uid || '').toLowerCase().includes(q);
            });
        }

        // Renderizado del Empty State Legítimo
        if (clientsList.length === 0) {
            let emptyMsg = '';
            if (liveCustomersModule.currentTab === 'live') {
                emptyMsg = `
                    <div class="p-12 text-center space-y-3">
                        <div class="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xl mx-auto">⚪</div>
                        <h4 class="text-sm font-bold text-slate-300">No hay clientes con servicios activos en este momento</h4>
                        <p class="text-xs text-slate-500 max-w-md mx-auto">La plataforma se encuentra en estado de espera operativa. Cuando un cliente realice un pedido Commerce o una encomienda Express X→Y, aparecerá inmediatamente aquí con telemetría en vivo.</p>
                        <button onclick="liveCustomersModule.switchTab('all')" class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition">
                            Explorar Directorio de Clientes Registrados
                        </button>
                    </div>
                `;
            } else if (liveCustomersModule.currentTab === 'incidents') {
                emptyMsg = `
                    <div class="p-12 text-center space-y-2">
                        <div class="w-12 h-12 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center text-xl mx-auto">✅</div>
                        <h4 class="text-sm font-bold text-slate-300">Sin incidencias abiertas</h4>
                        <p class="text-xs text-slate-500">Ningún cliente tiene reclamos o tickets operacionales sin resolver.</p>
                    </div>
                `;
            } else {
                emptyMsg = `
                    <div class="p-12 text-center text-slate-500 text-xs">
                        No se encontraron registros que coincidan con el criterio de búsqueda en esta vista.
                    </div>
                `;
            }
            tbody.innerHTML = `<tr><td colspan="6">${emptyMsg}</td></tr>`;
            return;
        }

        // Renderizado de Filas de la Tabla Enterprise
        let html = '';
        clientsList.forEach(c => {
            const hasOrder = !!c.activeOrder;
            const hasTrip = !!c.activeTrip;
            const hasInc = !!c.incident && c.incident.length > 0;
            const isServiceActive = hasOrder || hasTrip;

            // Badge de Estado Operativo en Vivo
            let liveStatusBadge = '';
            if (hasOrder) {
                const ord = c.activeOrder;
                const courierName = ord.courierName || ord.assignedCourierName || 'Asignando...';
                liveStatusBadge = `
                    <div class="space-y-1">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            🛵 Commerce #${(ord.orderNumber || ord.id).substring(0, 8)}
                        </span>
                        <p class="text-[10px] text-slate-400 truncate max-w-[200px]">${ord.businessName || ord.restaurantName || 'Comercio'} → ${ord.status}</p>
                    </div>
                `;
            } else if (hasTrip) {
                const trip = c.activeTrip;
                liveStatusBadge = `
                    <div class="space-y-1">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            ⚡ Express X→Y
                        </span>
                        <p class="text-[10px] text-slate-400 truncate max-w-[200px]">${trip.destination?.address || trip.destAddress || 'Destino'} → ${trip.status}</p>
                    </div>
                `;
            } else {
                liveStatusBadge = `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-400">
                        ⚪ Sin servicio activo
                    </span>
                `;
            }

            // Indicador de Incidencia si existe
            let incBadge = '';
            if (hasInc) {
                incBadge = `<span class="ml-1 px-1.5 py-0.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded text-[9px] font-black animate-pulse">⚠️ RECLAMO</span>`;
            }

            // Teléfono clickeable a WhatsApp / Llamada
            const cleanPhone = (c.phone || '').replace(/[^0-9+]/g, '');
            const phoneLink = cleanPhone
                ? `<a href="https://wa.me/${cleanPhone.replace('+', '')}" target="_blank" class="text-slate-300 hover:text-emerald-400 font-mono flex items-center gap-1">📞 ${c.phone}</a>`
                : `<span class="text-slate-500 font-mono">No registrado</span>`;

            html += `
                <tr class="hover:bg-slate-800/40 transition">
                    <td class="p-3.5">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-black flex items-center justify-center text-xs shrink-0">
                                ${(c.name || 'C')[0].toUpperCase()}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1">
                                    <h4 class="font-bold text-white text-xs truncate max-w-[180px]">${c.name}</h4>
                                    ${incBadge}
                                </div>
                                <p class="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">${c.email}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-3.5">${phoneLink}</td>
                    <td class="p-3.5">${liveStatusBadge}</td>
                    <td class="p-3.5">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">${c.vertical || 'CLIENTE'}</span>
                    </td>
                    <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                            ${c.isActive !== false ? 'ACTIVA' : 'BLOQUEADA'}
                        </span>
                    </td>
                    <td class="p-3.5 text-right">
                        <button onclick="liveCustomersModule.openCustomer360('${c.uid}')"
                            class="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[11px] rounded-xl border border-indigo-500/40 transition shadow flex items-center gap-1.5 ml-auto">
                            <span>👤</span> Ver 360
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    // ─── 7. PAGINACIÓN CURSOR-BASED PARA DIRECTORIO "TODOS" ──────────────────
    loadDirectoryPage: async () => {
        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Cargando página de clientes registrados...</td></tr>`;
        }

        try {
            if (typeof db === 'undefined' || !db) return;
            liveCustomersModule.directoryLoading = true;

            const cursor = liveCustomersModule.pagination.pageCursors[liveCustomersModule.pagination.currentPage - 1];
            let query = db.collection('users').limit(liveCustomersModule.pagination.pageSize + 1);

            if (cursor) {
                query = query.startAfter(cursor);
            }

            const snapshot = await query.get();
            liveCustomersModule.directoryUsersCache = [];

            const docs = snapshot.docs;
            const hasMore = docs.length > liveCustomersModule.pagination.pageSize;
            const pageDocs = hasMore ? docs.slice(0, liveCustomersModule.pagination.pageSize) : docs;

            pageDocs.forEach(doc => {
                const raw = { uid: doc.id, ...doc.data() };
                const norm = (typeof CanonicalIdentityResolver !== 'undefined')
                    ? CanonicalIdentityResolver.resolve(raw)
                    : raw;
                liveCustomersModule.directoryUsersCache.push(norm);
            });

            // Actualizar controles de paginación
            liveCustomersModule.pagination.hasNextPage = hasMore;
            if (hasMore && pageDocs.length > 0) {
                liveCustomersModule.pagination.pageCursors[liveCustomersModule.pagination.currentPage] = pageDocs[pageDocs.length - 1];
            }

            const elPage = document.getElementById('paginationCurrentPage');
            const elCount = document.getElementById('paginationPageCount');
            const btnPrev = document.getElementById('btnPaginationPrev');
            const btnNext = document.getElementById('btnPaginationNext');

            if (elPage) elPage.textContent = liveCustomersModule.pagination.currentPage.toString();
            if (elCount) elCount.textContent = pageDocs.length.toString();
            if (btnPrev) btnPrev.disabled = liveCustomersModule.pagination.currentPage <= 1;
            if (btnNext) btnNext.disabled = !hasMore;

            liveCustomersModule.renderCurrentView();
        } catch (err) {
            console.error("[CUSTOMER_OPS] Error cargando página de directorio:", err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-400">Error al cargar directorio: ${err.message}</td></tr>`;
            }
        } finally {
            liveCustomersModule.directoryLoading = false;
        }
    },

    paginateNext: () => {
        if (!liveCustomersModule.pagination.hasNextPage || liveCustomersModule.directoryLoading) return;
        liveCustomersModule.pagination.currentPage++;
        liveCustomersModule.loadDirectoryPage();
    },

    paginatePrev: () => {
        if (liveCustomersModule.pagination.currentPage <= 1 || liveCustomersModule.directoryLoading) return;
        liveCustomersModule.pagination.currentPage--;
        liveCustomersModule.loadDirectoryPage();
    },

    // ─── 8. EL DRAWER OPERATIVO: "CUSTOMER 360" ──────────────────────────────
    openCustomer360: async (uid) => {
        if (!uid) return;

        // HTML inicial de carga en el Drawer
        const loadingHtml = `
            <div class="p-12 text-center space-y-4">
                <div class="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h4 class="text-sm font-bold text-white">Construyendo Customer 360...</h4>
                <p class="text-xs text-slate-400">Consultando identidad canónica, pedidos commerce, encomiendas X→Y e historial de soporte.</p>
            </div>
        `;

        if (typeof drawer !== 'undefined' && drawer.open) {
            drawer.open('drawer-customer-360', '👤 Customer 360 — Cargando...', loadingHtml);
        }

        try {
            // Consultas Paralelas de Recuperación Exhaustiva (Soporte Multicampo Legacy Anti-Pérdida)
            const [
                snapOrdersCust, snapOrdersCli, snapOrdersUser,
                snapTripsCust, snapTripsSender, snapTripsUser,
                userDocSnap,
                snapIncidents
            ] = await Promise.all([
                db.collection('orders').where('customerId', '==', uid).limit(100).get().catch(() => ({ docs: [] })),
                db.collection('orders').where('clienteId', '==', uid).limit(100).get().catch(() => ({ docs: [] })),
                db.collection('orders').where('userId', '==', uid).limit(100).get().catch(() => ({ docs: [] })),
                db.collection('deliveryTrips').where('customerId', '==', uid).limit(100).get().catch(() => ({ docs: [] })),
                db.collection('deliveryTrips').where('senderUid', '==', uid).limit(100).get().catch(() => ({ docs: [] })),
                db.collection('deliveryTrips').where('userId', '==', uid).limit(100).get().catch(() => ({ docs: [] })),
                db.collection('users').doc(uid).get().catch(() => null),
                db.collection('incidents').where('customerId', '==', uid).limit(50).get().catch(() => ({ docs: [] }))
            ]);

            // 1. Deduplicación Atómica de Órdenes Commerce
            const ordersMap = new Map();
            [snapOrdersCust, snapOrdersCli, snapOrdersUser].forEach(snap => {
                if (snap?.docs) {
                    snap.docs.forEach(d => ordersMap.set(d.id, { id: d.id, ...d.data(), serviceType: 'COMMERCE' }));
                }
            });
            const allOrders = Array.from(ordersMap.values());

            // 2. Deduplicación Atómica de Viajes Express X→Y
            const tripsMap = new Map();
            [snapTripsCust, snapTripsSender, snapTripsUser].forEach(snap => {
                if (snap?.docs) {
                    snap.docs.forEach(d => tripsMap.set(d.id, { id: d.id, ...d.data(), serviceType: 'EXPRESS_X2Y' }));
                }
            });
            const allTrips = Array.from(tripsMap.values());

            // 3. Incidencias
            const incidents = snapIncidents?.docs ? snapIncidents.docs.map(d => ({ id: d.id, ...d.data() })) : [];

            // 4. Identidad
            const rawUser = userDocSnap && userDocSnap.exists ? { uid, ...userDocSnap.data() } : { uid };
            const identity = (typeof CanonicalIdentityResolver !== 'undefined')
                ? CanonicalIdentityResolver.resolve(rawUser)
                : rawUser;

            const name = identity.effectiveName || identity.nombre || identity.name || (allOrders[0]?.customerName) || 'Cliente';
            const phone = identity.effectivePhone || identity.telefono || identity.phone || (allOrders[0]?.customerPhone) || 'No registrado';
            const email = identity.effectiveEmail || identity.email || 'Sin correo';
            const regDate = identity.fechaRegistro
                ? new Date(parseInt(identity.fechaRegistro)).toLocaleDateString('es-NI')
                : (identity.createdAt ? new Date(identity.createdAt.seconds ? identity.createdAt.seconds * 1000 : identity.createdAt).toLocaleDateString('es-NI') : 'N/A');

            // 5. Métricas Históricas Reales (Sobre el 100% de las transacciones recuperadas)
            const totalOrders = allOrders.length;
            const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED').length;
            const cancelledOrders = allOrders.filter(o => ['CANCELLED', 'REJECTED', 'CANCELADO'].includes(o.status)).length;
            
            const totalTrips = allTrips.length;
            const completedTrips = allTrips.filter(t => t.status === 'DELIVERED').length;
            
            const spendOrders = allOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
            const spendTrips = allTrips.reduce((sum, t) => sum + (parseFloat(t.costoTotal || t.pricing?.totalFee || t.pricing?.totalAmount || t.finalCost || 0)), 0);
            const totalSpend = spendOrders + spendTrips;
            const totalServices = totalOrders + totalTrips;
            const avgSpend = totalServices > 0 ? (totalSpend / totalServices).toFixed(2) : '0.00';

            // 6. Servicio Activo Actual (si existe en los maps en vivo)
            const liveOrder = liveCustomersModule.activeOrdersMap.get(uid);
            const liveTrip = liveCustomersModule.activeTripsMap.get(uid);

            let activeServiceHtml = '';
            if (liveOrder) {
                activeServiceHtml = `
                    <div class="p-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 space-y-3 shadow-lg">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> 🟠 Pedido en Curso (Commerce)
                            </span>
                            <span class="text-[10px] text-amber-400/80 font-mono font-bold">${liveOrder.status}</span>
                        </div>
                        <div>
                            <h4 class="text-sm font-black text-white">#${(liveOrder.orderNumber || liveOrder.id).substring(0, 10)} — ${liveOrder.businessName || 'Comercio'}</h4>
                            <p class="text-xs text-slate-300 mt-0.5">Courier: <strong class="text-amber-200">${liveOrder.courierName || 'Asignando repartidor...'}</strong></p>
                            <p class="text-xs text-slate-400">Total: <strong class="text-emerald-400">C$ ${parseFloat(liveOrder.total || 0).toFixed(2)}</strong></p>
                        </div>
                        <div class="flex gap-2 pt-1 border-t border-amber-500/20">
                            <button onclick="drawer.close('drawer-customer-360'); dashboardController.switchTab('liveOrders');"
                                class="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5">
                                <span>📦</span> Ver en Monitor Pedidos
                            </button>
                            <button onclick="drawer.close('drawer-customer-360'); dashboardController.switchTab('liveMap');"
                                class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5">
                                <span>🗺️</span> Rastrear en Mapa
                            </button>
                        </div>
                    </div>
                `;
            } else if (liveTrip) {
                activeServiceHtml = `
                    <div class="p-4 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 space-y-3 shadow-lg">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> ⚡ Encomienda en Curso (Express X→Y)
                            </span>
                            <span class="text-[10px] text-cyan-400/80 font-mono font-bold">${liveTrip.status}</span>
                        </div>
                        <div>
                            <h4 class="text-sm font-black text-white">Destino: ${liveTrip.destination?.address || liveTrip.destAddress || 'Punto de Entrega'}</h4>
                            <p class="text-xs text-slate-300 mt-0.5">Tarifa: <strong class="text-emerald-400">C$ ${parseFloat(liveTrip.costoTotal || liveTrip.pricing?.totalFee || 0).toFixed(2)}</strong></p>
                        </div>
                        <div class="flex gap-2 pt-1 border-t border-cyan-500/20">
                            <button onclick="drawer.close('drawer-customer-360'); dashboardController.switchTab('deliveryExpress');"
                                class="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5">
                                <span>⚡</span> Ver en Delivery Express
                            </button>
                            <button onclick="drawer.close('drawer-customer-360'); dashboardController.switchTab('liveMap');"
                                class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5">
                                <span>🗺️</span> Rastrear en Mapa
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Última fecha conocida
                const lastOrderDate = allOrders[0]?.createdAt ? new Date(allOrders[0].createdAt.seconds ? allOrders[0].createdAt.seconds * 1000 : allOrders[0].createdAt).toLocaleString('es-NI') : null;
                activeServiceHtml = `
                    <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <span class="text-base text-slate-500">⚪</span>
                            <div>
                                <p class="text-xs font-bold text-slate-300">Sin servicio activo en este momento</p>
                                <p class="text-[10px] text-slate-500">${lastOrderDate ? `Última actividad: ${lastOrderDate}` : 'Sin servicios previos registrados'}</p>
                            </div>
                        </div>
                        <span class="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">En Reposo</span>
                    </div>
                `;
            }

            // 7. Timeline Unificado de Últimos 20 Servicios Combinados
            const timelineEvents = [...allOrders, ...allTrips];
            timelineEvents.sort((a, b) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
                return timeB - timeA;
            });
            const top20Events = timelineEvents.slice(0, 20);

            let timelineHtml = '';
            if (top20Events.length === 0) {
                timelineHtml = `<div class="p-6 text-center text-slate-500 text-xs">No hay historial transaccional para este cliente.</div>`;
            } else {
                timelineHtml = top20Events.map(ev => {
                    const isOrd = ev.serviceType === 'COMMERCE';
                    const icon = isOrd ? '📦' : '⚡';
                    const title = isOrd ? (ev.businessName || 'Pedido Commerce') : 'Delivery Express X→Y';
                    const amount = isOrd ? ev.total : (ev.costoTotal || ev.pricing?.totalFee || 0);
                    const dateStr = ev.createdAt
                        ? new Date(ev.createdAt.seconds ? ev.createdAt.seconds * 1000 : ev.createdAt).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : 'Fecha desc.';

                    let statusClass = 'text-slate-400 bg-slate-800';
                    if (ev.status === 'DELIVERED') statusClass = 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40';
                    else if (['CANCELLED', 'REJECTED'].includes(ev.status)) statusClass = 'text-rose-400 bg-rose-950/60 border border-rose-800/40';
                    else statusClass = 'text-amber-400 bg-amber-950/60 border border-amber-800/40';

                    return `
                        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <span class="text-sm">${icon}</span>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-slate-200 truncate">${title} <span class="font-mono text-[10px] text-slate-500">#${(ev.orderNumber || ev.id).substring(0, 8)}</span></p>
                                    <p class="text-[10px] text-slate-500 font-mono">${dateStr}</p>
                                </div>
                            </div>
                            <div class="text-right shrink-0 ml-3">
                                <p class="text-xs font-black text-white font-mono">C$ ${parseFloat(amount || 0).toFixed(2)}</p>
                                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${statusClass}">${ev.status}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // 8. Sección de Incidencias
            let incidentsHtml = '';
            if (incidents.length > 0) {
                incidentsHtml = `
                    <div class="space-y-2 border-t border-slate-800 pt-4">
                        <h4 class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                            <span>⚠️</span> Incidencias Registradas (${incidents.length})
                        </h4>
                        <div class="space-y-2">
                            ${incidents.map(inc => `
                                <div class="p-3 bg-rose-950/20 border border-rose-800/40 rounded-xl space-y-1 text-xs">
                                    <div class="flex justify-between items-center">
                                        <span class="font-bold text-rose-300 uppercase text-[10px]">${inc.type || 'RECLAMO'}</span>
                                        <span class="text-[10px] font-bold text-rose-400 bg-rose-900/40 px-1.5 py-0.5 rounded">${inc.status}</span>
                                    </div>
                                    <p class="text-slate-300 text-[11px]">${inc.description || inc.reason || 'Sin descripción'}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            // HTML Completo de la Ficha Customer 360
            const fullHtml = `
                <div class="space-y-5 font-sans">
                    <!-- Cabecera de Perfil de Identidad -->
                    <div class="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                        <div class="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-black flex items-center justify-center text-xl shrink-0">
                            ${(name || 'C')[0].toUpperCase()}
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="text-base font-black text-white truncate">${name}</h3>
                            <p class="text-xs text-slate-400 font-mono truncate">${email}</p>
                            <div class="flex flex-wrap items-center gap-2 mt-1.5">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${identity.isActive !== false ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                                    ${identity.isActive !== false ? 'CUENTA ACTIVA' : 'BLOQUEADA'}
                                </span>
                                <span class="text-[10px] text-slate-500 font-mono">UID: ${uid.substring(0, 12)}...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Botones de Contacto Rápido -->
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <a href="tel:${phone.replace(/[^0-9+]/g, '')}" class="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition">
                            <span>📞</span> Llamar (${phone})
                        </a>
                        <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" target="_blank" class="p-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 transition">
                            <span>💬</span> WhatsApp
                        </a>
                    </div>

                    <!-- Estado Operacional Actual -->
                    <div class="space-y-2">
                        <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">Estado Operacional Actual</h4>
                        ${activeServiceHtml}
                    </div>

                    <!-- Resumen Financiero Histórico Real -->
                    <div class="space-y-2">
                        <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">Resumen Transaccional Histórico</h4>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Servicios</span>
                                <p class="text-lg font-black text-white mt-0.5">${totalServices}</p>
                                <p class="text-[9px] text-slate-400">${totalOrders} Com. | ${totalTrips} X→Y</p>
                            </div>
                            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Entregados</span>
                                <p class="text-lg font-black text-emerald-400 mt-0.5">${deliveredOrders + completedTrips}</p>
                                <p class="text-[9px] text-emerald-500/80">Completados</p>
                            </div>
                            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Cancelados</span>
                                <p class="text-lg font-black text-rose-400 mt-0.5">${cancelledOrders}</p>
                                <p class="text-[9px] text-rose-500/80">Fallidos</p>
                            </div>
                            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                                <span class="text-[10px] text-slate-500 font-bold uppercase">Total Gastado</span>
                                <p class="text-lg font-black text-indigo-400 mt-0.5">C$ ${totalSpend.toFixed(0)}</p>
                                <p class="text-[9px] text-slate-400">Prom: C$ ${avgSpend}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline de los Últimos 20 Servicios -->
                    <div class="space-y-2 border-t border-slate-800 pt-4">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">Línea de Tiempo (Últimos 20)</h4>
                            <span class="text-[10px] text-slate-500 font-mono">Commerce + X→Y</span>
                        </div>
                        <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                            ${timelineHtml}
                        </div>
                    </div>

                    <!-- Incidencias -->
                    ${incidentsHtml}

                    <!-- Footer / Acciones -->
                    <div class="pt-3 border-t border-slate-800 flex justify-end">
                        <button onclick="drawer.close('drawer-customer-360')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition">
                            Cerrar Expediente
                        </button>
                    </div>
                </div>
            `;

            if (typeof drawer !== 'undefined' && drawer.open) {
                drawer.open('drawer-customer-360', `👤 Customer 360 — ${name}`, fullHtml);
            }
        } catch (err) {
            console.error("[CUSTOMER_OPS] Error abriendo Customer 360:", err);
            const errHtml = `<div class="p-8 text-center text-rose-400 text-xs">Error al cargar expediente 360: ${err.message}</div>`;
            if (typeof drawer !== 'undefined' && drawer.open) {
                drawer.open('drawer-customer-360', 'Error Customer 360', errHtml);
            }
        }
    }
};

window.liveCustomersModule = liveCustomersModule;
