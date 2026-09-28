// Módulo 2 y 9: Global Live Map & Fleet Control 4K — Control Center Enterprise (Fase 10.5-D)
// Sistema Oficial de Supervisión Cartográfica y Logística en Tiempo Real de BlueSystem Delivery
// FASE 10.5-D: Forensic Geolocation Reconciliation + Firestore Incidents Permission Repair

const liveMapModule = {
    // ── 1. ESTADO DEL MÓDULO & MAPA ───────────────────────────────────────────
    map: null,
    markersClusterGroup: null,
    routesGroup: null,
    incidentsGroup: null,
    
    // Capas activas
    layers: {
        stores: true,
        customers: true,
        couriers: true,
        orders: true,
        routes: true,
        incidents: true
    },

    // Suscripciones activas en tiempo real (Unsubscribers)
    unsubscribes: {
        orders: null,
        businesses: null,
        branches: null,
        couriers: null,
        gps: null,
        incidents: null
    },

    // Índices en memoria y cachés de datos reales de Firestore (SSOT)
    cache: {
        orders: new Map(),          // orderId -> normalized order
        businesses: new Map(),      // businessId -> store data
        branches: new Map(),        // branchId -> branch data
        couriers: new Map(),        // courierId -> user profile
        gps: new Map(),             // courierId -> telemetry object
        customers: new Map(),       // customerId -> user profile
        incidents: new Map()        // incidentId -> incident object
    },

    // Filtros y modos de operación
    filters: {
        searchQuery: '',
        orderStatus: 'ALL',        // ALL, PENDING, PREPARING, READY, ASSIGNED, IN_TRANSIT
        courierState: 'ALL',       // ALL, ONLINE, BUSY, AVAILABLE, IN_TRANSIT, PAUSED, OFFLINE, STALE
        businessState: 'ALL',      // ALL, OPEN, CLOSED, WITH_ORDERS, WITHOUT_ORDERS
        incidentCategory: 'ALL',   // ALL, CLIENTE, COMERCIO, VEHICULO, SISTEMA_RED, CLIMA_ENTORNO
        selectedBusinessId: 'ALL',
        selectedCourierId: 'ALL'
    },

    // Modos especiales
    followingCourierId: null,      // ID del courier en Follow Mode
    diagnosticsVisible: false,
    lastSyncTimestamp: null,
    syncStatus: 'SYNCING',          // LIVE, SYNCING, DEGRADED, OFFLINE, ERROR
    incidentsStatus: 'OK',         // OK, PERMISSION_DENIED_HANDLED, ERROR
    unlocatedStores: [],
    anomalies: [],

    // ── 2. CICLO DE VIDA Y RENDER ─────────────────────────────────────────────
    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Limpiar suscripciones previas para prevenir duplicados y fugas de memoria
        liveMapModule.unsubscribeAll();

        container.innerHTML = `
            <div class="h-full flex flex-col space-y-4 font-sans select-none">
                <!-- Header Control Center & Live Sync Status -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xl shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xl font-black shrink-0">
                            🗺️
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-black text-white leading-tight">Global Live Map & Fleet Monitor 4K</h2>
                                <span id="liveMapSyncBadge" class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-amber-400"></span> SYNCING
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">Centro global de supervisión cartográfica y logística en tiempo real • Sin datos simulados</p>
                        </div>
                    </div>

                    <!-- Quick Operations Toolbar -->
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <button onclick="liveMapModule.fitOperationBounds()" class="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
                            <span>🎯</span> Centrar Operación
                        </button>
                        <button onclick="liveMapModule.toggleUnlocatedStoresDrawer()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5" id="btnUnlocatedDrawer">
                            <span>⚠️</span> Sin GPS (<span id="unlocatedCountBadge">0</span>)
                        </button>
                        <button onclick="liveMapModule.toggleAnomaliesDrawer()" class="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5" id="btnAnomaliesDrawer">
                            <span>🚨</span> Anomalías (<span id="anomaliesCountBadge">0</span>)
                        </button>
                        <button onclick="liveMapModule.toggleDiagnosticsPanel()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
                            <span>🩺</span> Diagnóstico
                        </button>
                    </div>
                </div>

                <!-- Live Control Tower KPI Bar -->
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2.5 shrink-0" id="liveControlTowerKpis">
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pedidos Activos</span>
                        <p class="text-base font-black text-white mt-0.5" id="kpiActiveOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-blue-400 uppercase tracking-widest">En Ruta</span>
                        <p class="text-base font-black text-blue-400 mt-0.5" id="kpiInTransitOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-amber-400 uppercase tracking-widest">Esperando Courier</span>
                        <p class="text-base font-black text-amber-400 mt-0.5" id="kpiWaitingCourierOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Motorizados Online</span>
                        <p class="text-base font-black text-emerald-400 mt-0.5" id="kpiCouriersOnline">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-purple-400 uppercase tracking-widest">Couriers Ocupados</span>
                        <p class="text-base font-black text-purple-400 mt-0.5" id="kpiCouriersBusy">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Comercios Activos</span>
                        <p class="text-base font-black text-indigo-400 mt-0.5" id="kpiActiveStores">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
                        <span class="text-[9px] font-black text-rose-400 uppercase tracking-widest">Incidencias Activas</span>
                        <p class="text-base font-black text-rose-400 mt-0.5" id="kpiActiveIncidents">0</p>
                    </div>
                </div>

                <!-- Filters & Layers Bar -->
                <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0">
                    <!-- Layer Switches -->
                    <div class="flex flex-wrap items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span class="text-[10px] font-extrabold text-slate-500 uppercase px-1">Capas:</span>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-300 font-semibold select-none">
                            <input type="checkbox" id="layerStores" checked onchange="liveMapModule.toggleLayer('stores', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0">
                            <span>🏪 Comercios</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-300 font-semibold select-none">
                            <input type="checkbox" id="layerCustomers" checked onchange="liveMapModule.toggleLayer('customers', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0">
                            <span>👤 Clientes</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-300 font-semibold select-none">
                            <input type="checkbox" id="layerCouriers" checked onchange="liveMapModule.toggleLayer('couriers', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0">
                            <span>🛵 Motorizados</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-300 font-semibold select-none">
                            <input type="checkbox" id="layerOrders" checked onchange="liveMapModule.toggleLayer('orders', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0">
                            <span>📦 Pedidos</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-300 font-semibold select-none">
                            <input type="checkbox" id="layerRoutes" checked onchange="liveMapModule.toggleLayer('routes', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0">
                            <span>🛣️ Rutas</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-300 font-semibold select-none">
                            <input type="checkbox" id="layerIncidents" checked onchange="liveMapModule.toggleLayer('incidents', this.checked)" class="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0">
                            <span>⚠️ Incidencias</span>
                        </label>
                    </div>

                    <!-- Search & Entity Selectors -->
                    <div class="flex flex-wrap items-center gap-2 flex-1 justify-end min-w-0">
                        <!-- Global Search -->
                        <div class="relative w-full sm:w-56 min-w-0">
                            <input type="text" id="liveMapSearchInput" onkeyup="liveMapModule.onSearchInput(this.value)" placeholder="🔍 Buscar ID, comercio, placa..." class="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500 placeholder-slate-500">
                        </div>

                        <!-- Commerce Filter -->
                        <select id="filterSelectBusiness" onchange="liveMapModule.onBusinessFilterChange(this.value)" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[160px] truncate">
                            <option value="ALL">🏢 Todos Comercios</option>
                        </select>

                        <!-- Courier Filter -->
                        <select id="filterSelectCourier" onchange="liveMapModule.onCourierFilterChange(this.value)" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[160px] truncate">
                            <option value="ALL">🛵 Todos Motorizados</option>
                        </select>

                        <!-- Order Status Filter -->
                        <select id="filterSelectOrderStatus" onchange="liveMapModule.onOrderStatusFilterChange(this.value)" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500">
                            <option value="ALL">📦 Todos Estados</option>
                            <option value="PENDING">Pendientes</option>
                            <option value="PREPARING">Preparando</option>
                            <option value="READY">Listos (Wait Courier)</option>
                            <option value="ASSIGNED">Asignados</option>
                            <option value="IN_TRANSIT">En Ruta</option>
                        </select>
                    </div>
                </div>

                <!-- Main Container for Leaflet & Overlay Drawers -->
                <div class="flex-1 w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl" style="min-height: 520px;" id="liveMapContainer">
                    
                    <!-- Follow Mode Active Floating Banner -->
                    <div id="followModeBanner" class="hidden absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 text-xs py-2 px-4 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pulse">
                        <span class="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
                        <span>MODO SEGUIMIENTO ACTIVO: <strong id="followCourierNameText" class="text-white">Motorizado</strong></span>
                        <button onclick="liveMapModule.stopFollowingCourier()" class="bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-700 transition">
                            Dejar de seguir ✕
                        </button>
                    </div>

                    <!-- Diagnostics Floating Overlay -->
                    <div id="diagnosticsPanelOverlay" class="hidden absolute top-4 right-4 z-[1000] bg-slate-900/95 border border-slate-800 p-4 rounded-2xl w-80 shadow-2xl backdrop-blur-md text-xs space-y-2">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="font-black text-white flex items-center gap-1.5">🩺 LIVE MAP DIAGNOSTICS</span>
                            <button onclick="liveMapModule.toggleDiagnosticsPanel()" class="text-slate-400 hover:text-white font-bold">✕</button>
                        </div>
                        <div class="space-y-1 text-[11px] font-mono text-slate-300">
                            <p>Orders Loaded: <strong class="text-indigo-400" id="diagOrdersCount">0</strong></p>
                            <p>Active Orders: <strong class="text-emerald-400" id="diagActiveOrdersCount">0</strong></p>
                            <p>Businesses Loaded: <strong class="text-indigo-400" id="diagBusinessesCount">0</strong></p>
                            <p>Branches Loaded: <strong class="text-indigo-400" id="diagBranchesCount">0</strong></p>
                            <p>Couriers Loaded: <strong class="text-indigo-400" id="diagCouriersCount">0</strong></p>
                            <p>GPS Documents: <strong class="text-indigo-400" id="diagGpsCount">0</strong></p>
                            <p>Incidents Loaded: <strong class="text-rose-400" id="diagIncidentsCount">0</strong></p>
                            <div class="pt-2 border-t border-slate-800 text-[10px] space-y-0.5">
                                <p>Orders Listener: <span class="text-emerald-400" id="diagOrdersListener">CONNECTED</span></p>
                                <p>GPS Listener: <span class="text-emerald-400" id="diagGpsListener">CONNECTED</span></p>
                                <p>Businesses Listener: <span class="text-emerald-400" id="diagBusinessesListener">CONNECTED</span></p>
                                <p>Couriers Listener: <span class="text-emerald-400" id="diagCouriersListener">CONNECTED</span></p>
                                <p>Incidents Status: <span class="text-emerald-400 font-bold" id="diagIncidentsListener">CONNECTED</span></p>
                                <p class="text-slate-400 mt-1">Last Snapshot: <span id="diagLastSyncTime">--:--:--</span></p>
                            </div>
                        </div>
                    </div>

                    <!-- Unlocated Stores Drawer Overlay -->
                    <div id="unlocatedStoresDrawerOverlay" class="hidden absolute inset-y-0 right-0 z-[1000] bg-slate-900/95 border-l border-slate-800 w-80 p-4 shadow-2xl backdrop-blur-md flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                            <div>
                                <h3 class="font-black text-white text-xs flex items-center gap-1.5">
                                    <span>⚠️</span> COMERCIOS SIN GEOLOCALIZACIÓN
                                </h3>
                                <p class="text-[10px] text-slate-400">Sucursales registradas sin coordenadas válidas</p>
                            </div>
                            <button onclick="liveMapModule.toggleUnlocatedStoresDrawer()" class="text-slate-400 hover:text-white font-bold">✕</button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-2 pr-1" id="unlocatedStoresListContainer">
                            <p class="text-xs text-slate-500 p-4 text-center">No existen comercios sin coordenadas.</p>
                        </div>
                    </div>

                    <!-- Operational Anomalies Drawer Overlay -->
                    <div id="anomaliesDrawerOverlay" class="hidden absolute inset-y-0 right-0 z-[1000] bg-slate-900/95 border-l border-slate-800 w-88 p-4 shadow-2xl backdrop-blur-md flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                            <div>
                                <h3 class="font-black text-rose-400 text-xs flex items-center gap-1.5">
                                    <span>🚨</span> ANOMALÍAS OPERACIONALES
                                </h3>
                                <p class="text-[10px] text-slate-400">Incongruencias detectadas en la flota en vivo</p>
                            </div>
                            <button onclick="liveMapModule.toggleAnomaliesDrawer()" class="text-slate-400 hover:text-white font-bold">✕</button>
                        </div>
                        <div class="flex-1 overflow-y-auto space-y-2.5 pr-1" id="anomaliesListContainer">
                            <p class="text-xs text-slate-500 p-4 text-center">No hay anomalías operacionales detectadas.</p>
                        </div>
                    </div>

                </div>
            </div>
        `;

        if (liveMapModule._initMapTimer) {
            clearTimeout(liveMapModule._initMapTimer);
            liveMapModule._initMapTimer = null;
        }
        liveMapModule._initMapTimer = setTimeout(() => {
            liveMapModule._initMapTimer = null;
            liveMapModule.initMap();
        }, 150);
    },

    // ── 3. INICIALIZACIÓN DE LEAFLET ──────────────────────────────────────────
    initMap: () => {
        const container = document.getElementById('liveMapContainer');
        if (!container) return;

        if (liveMapModule.map) {
            try { liveMapModule.map.remove(); } catch(e){}
            liveMapModule.map = null;
        }

        // Managua, Nicaragua como centro predeterminado de vista inicial
        liveMapModule.map = L.map('liveMapContainer', {
            zoomControl: true,
            attributionControl: true,
            maxZoom: 19
        }).setView([12.1364, -86.2514], 13);

        // Map Tiles: OpenFreeMap Liberty Vector Basemap (Google Maps-like Clean Aesthetics, Zero API Key, Zero Watermark)
        // Con fallback resiliente a OpenStreetMap Standard en caso de no disponibilidad de WebGL
        let baseLayerLoaded = false;
        if (typeof L.maplibreGL === 'function' && typeof maplibregl !== 'undefined') {
            try {
                L.maplibreGL({
                    style: 'https://tiles.openfreemap.org/styles/liberty',
                    attribution: '&copy; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
                }).addTo(liveMapModule.map);
                baseLayerLoaded = true;
                console.info("[LIVE_MAP_DEBUG] OpenFreeMap Liberty Vector Basemap initialized successfully.");
            } catch (glErr) {
                console.warn("[LIVE_MAP_DEBUG] MapLibre GL layer init failed, falling back to OSM raster:", glErr);
            }
        }

        if (!baseLayerLoaded) {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
            }).addTo(liveMapModule.map);
            console.info("[LIVE_MAP_DEBUG] Standard OSM Raster TileLayer loaded as fallback.");
        }

        // MarkerCluster con desplegado automático y Badges Modernos 4K
        if (typeof L.markerClusterGroup === 'function') {
            liveMapModule.markersClusterGroup = L.markerClusterGroup({
                maxClusterRadius: 40,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 15,
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    let sizeClass = 'bs-cluster-small';
                    let size = 36;
                    if (count >= 50) {
                        sizeClass = 'bs-cluster-large';
                        size = 44;
                    } else if (count >= 10) {
                        sizeClass = 'bs-cluster-medium';
                        size = 40;
                    }
                    return L.divIcon({
                        html: `<div class="bs-cluster-badge ${sizeClass}" style="width: ${size}px; height: ${size}px; font-size: ${size >= 44 ? 13 : 11}px;">${count}</div>`,
                        className: 'custom-cluster-marker',
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size / 2]
                    });
                }
            });
            liveMapModule.map.addLayer(liveMapModule.markersClusterGroup);
        } else {
            liveMapModule.markersClusterGroup = L.layerGroup().addTo(liveMapModule.map);
        }

        liveMapModule.routesGroup = L.layerGroup().addTo(liveMapModule.map);
        liveMapModule.incidentsGroup = L.layerGroup().addTo(liveMapModule.map);

        // Iniciar suscripciones en tiempo real
        liveMapModule.subscribeAllRealtime();
    },

    // ── 4. SUSCRIPCIONES EN TIEMPO REAL A FIRESTORE (SSOT) ─────────────────────
    subscribeAllRealtime: () => {
        liveMapModule.updateSyncStatus('SYNCING');

        // 1. Escuchar Comercios (/businesses)
        liveMapModule.unsubscribes.businesses = db.collection('businesses').onSnapshot(snap => {
            liveMapModule.cache.businesses.clear();
            snap.forEach(doc => {
                const data = doc.data() || {};
                const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.isDeleted === true;
                if (!isDeleted) {
                    liveMapModule.cache.businesses.set(doc.id, { id: doc.id, ...data });
                }
            });
            liveMapModule.populateBusinessDropdown();
            liveMapModule.onDataUpdate();
        }, err => {
            console.error("[LIVE_MAP_DEBUG] Error listening to /businesses:", err);
            liveMapModule.updateSyncStatus('ERROR');
        });

        // 2. Escuchar Sucursales (/branches)
        liveMapModule.unsubscribes.branches = db.collection('branches').onSnapshot(snap => {
            liveMapModule.cache.branches.clear();
            snap.forEach(doc => {
                liveMapModule.cache.branches.set(doc.id, { id: doc.id, ...doc.data() });
            });
            liveMapModule.onDataUpdate();
        }, err => {
            console.warn("[LIVE_MAP_DEBUG] Error listening to /branches:", err);
        });

        // 3. Escuchar Motorizados (/users con userType == motorizado/driver/courier)
        liveMapModule.unsubscribes.couriers = db.collection('users').onSnapshot(snap => {
            liveMapModule.cache.couriers.clear();
            snap.forEach(doc => {
                const d = doc.data() || {};
                const r = String(d.role || d.eiamRole || d.rol || d.userType || '').toLowerCase();
                if (r.includes('motorizado') || r.includes('courier') || r.includes('driver') || r.includes('repartidor')) {
                    liveMapModule.cache.couriers.set(doc.id, { id: doc.id, ...d });
                } else if (r.includes('client') || r.includes('customer') || r.includes('cliente')) {
                    liveMapModule.cache.customers.set(doc.id, { id: doc.id, ...d });
                }
            });
            liveMapModule.populateCourierDropdown();
            liveMapModule.onDataUpdate();
        }, err => {
            console.error("[LIVE_MAP_DEBUG] Error listening to /users:", err);
        });

        // 4. Escuchar Telemetría GPS (/ubicaciones_repartidores)
        liveMapModule.unsubscribes.gps = db.collection('ubicaciones_repartidores').onSnapshot(snap => {
            liveMapModule.cache.gps.clear();
            snap.forEach(doc => {
                liveMapModule.cache.gps.set(doc.id, { id: doc.id, ...doc.data() });
            });
            liveMapModule.onDataUpdate();
        }, err => {
            console.error("[LIVE_MAP_DEBUG] Error listening to /ubicaciones_repartidores:", err);
        });

        // 5. Escuchar Pedidos (/orders)
        liveMapModule.unsubscribes.orders = db.collection('orders').onSnapshot(snap => {
            liveMapModule.cache.orders.clear();
            snap.forEach(doc => {
                const data = doc.data() || {};
                if (liveMapModule.isActiveOrder(data)) {
                    liveMapModule.cache.orders.set(doc.id, { id: doc.id, ...data });
                }
            });
            liveMapModule.onDataUpdate();
        }, err => {
            console.error("[LIVE_MAP_DEBUG] Error listening to /orders:", err);
            liveMapModule.updateSyncStatus('ERROR');
        });

        // 6. Escuchar Incidencias (/incidents con control elegante de permisos)
        liveMapModule.unsubscribes.incidents = db.collection('incidents').limit(50).onSnapshot(snap => {
            liveMapModule.cache.incidents.clear();
            snap.forEach(doc => {
                liveMapModule.cache.incidents.set(doc.id, { id: doc.id, ...doc.data() });
            });
            liveMapModule.incidentsStatus = 'CONNECTED';
            liveMapModule.onDataUpdate();
        }, err => {
            if (err && (err.code === 'permission-denied' || String(err).includes('permissions'))) {
                console.info("[LIVE_MAP_DEBUG] /incidents query restricted for role (Handled Intentionally).");
                liveMapModule.incidentsStatus = 'PERMISSION_DENIED_HANDLED';
            } else {
                console.warn("[LIVE_MAP_DEBUG] Error listening to /incidents:", err);
                liveMapModule.incidentsStatus = 'ERROR';
            }
            liveMapModule.onDataUpdate();
        });
    },

    unsubscribeAll: () => {
        Object.keys(liveMapModule.unsubscribes).forEach(k => {
            if (typeof liveMapModule.unsubscribes[k] === 'function') {
                try { liveMapModule.unsubscribes[k](); } catch(e){}
            }
            liveMapModule.unsubscribes[k] = null;
        });
    },

    destroy: () => {
        if (liveMapModule._initMapTimer) {
            clearTimeout(liveMapModule._initMapTimer);
            liveMapModule._initMapTimer = null;
        }
        liveMapModule.unsubscribeAll();
        if (liveMapModule.map) {
            try { liveMapModule.map.remove(); } catch(e) {}
            liveMapModule.map = null;
        }
        liveMapModule.markersClusterGroup = null;
        liveMapModule.routesGroup = null;
        liveMapModule.incidentsGroup = null;

        if (liveMapModule.cache) {
            Object.values(liveMapModule.cache).forEach(mapInstance => {
                if (mapInstance && typeof mapInstance.clear === 'function') {
                    mapInstance.clear();
                }
            });
        }
        console.log('[LIVE_MAP] destroy() — Listeners, timers, instancias Leaflet y cachés liberados limpiamente.');
    },

    // ── 5. NORMAS CANÓNICAS & RESOLVERS DE DATOS ──────────────────────────────
    isActiveOrder: (order) => {
        if (!order) return false;
        const st = String(order.status || order.estado || '').toUpperCase().trim();
        const activeStates = ['PENDING', 'PREPARING', 'READY', 'ASSIGNED', 'IN_TRANSIT', 'COOKING', 'PACKED', 'EN_RUTA', 'EN_TRANSITO', 'ASIGNADO', 'LISTO', 'PREPARANDO', 'PENDIENTE'];
        return activeStates.includes(st);
    },

    resolveBusinessId: (order) => {
        if (!order) return '';
        return order.businessId || order.comercioId || order.restaurantId || order.merchantId || '';
    },

    resolveCourierId: (order) => {
        if (!order) return '';
        return order.assignedCourierId || order.motorizadoId || order.courierId || order.driverId || '';
    },

    // Resolver Universal de Coordenadas para Sucursal o Comercio (FASE 10.5-D)
    resolveBranchCoordinates: (item) => {
        if (!item) return null;
        let lat = item?.coordinates?.latitude ?? item?.locationGPS?.lat ?? item?.location?.latitude ?? item?.location?.lat ?? item?.coordenadas?.latitud ?? item?.coordenadas?.lat ?? item?.latitude ?? item?.latitud ?? item?.lat ?? item?.geo?.lat;
        let lng = item?.coordinates?.longitude ?? item?.locationGPS?.lng ?? item?.location?.longitude ?? item?.location?.lng ?? item?.coordenadas?.longitud ?? item?.coordenadas?.lng ?? item?.longitude ?? item?.longitud ?? item?.lng ?? item?.geo?.lng;

        if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
            const numLat = Number(lat);
            const numLng = Number(lng);
            if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
                return { lat: numLat, lng: numLng };
            }
        }
        return null;
    },

    // Evaluación de Frescura del GPS (Límite: 10 minutos)
    getGpsFreshness: (updatedAtRaw) => {
        if (!updatedAtRaw) {
            return { state: 'OFFLINE', text: 'Sin GPS', color: 'slate', secondsAgo: 99999, label: 'Desconectado' };
        }

        let dateObj = null;
        if (updatedAtRaw.toDate && typeof updatedAtRaw.toDate === 'function') {
            dateObj = updatedAtRaw.toDate();
        } else if (updatedAtRaw.seconds) {
            dateObj = new Date(updatedAtRaw.seconds * 1000);
        } else if (typeof updatedAtRaw === 'number') {
            dateObj = new Date(updatedAtRaw);
        } else if (typeof updatedAtRaw === 'string') {
            dateObj = new Date(updatedAtRaw);
        }

        if (!dateObj || isNaN(dateObj.getTime())) {
            return { state: 'OFFLINE', text: 'Señal desconocida', color: 'slate', secondsAgo: 99999, label: 'Desconectado' };
        }

        const diffMs = Date.now() - dateObj.getTime();
        const secondsAgo = Math.floor(diffMs / 1000);
        const minutesAgo = Math.floor(secondsAgo / 60);

        if (secondsAgo < 60) {
            return { state: 'ONLINE', text: `Hace ${secondsAgo} s`, color: 'emerald', secondsAgo, label: 'EN VIVO' };
        } else if (minutesAgo <= 10) {
            return { state: 'STALE', text: `Hace ${minutesAgo} min`, color: 'amber', secondsAgo, label: 'STALE GPS' };
        } else {
            return { state: 'OFFLINE', text: `Hace ${minutesAgo} min`, color: 'rose', secondsAgo, label: 'OFFLINE' };
        }
    },

    // Resolver Contexto Completo del Pedido (Order + Business + Branch + Customer + Courier + GPS)
    resolveOrderContext: (order) => {
        const orderId = order.id;
        const bId = liveMapModule.resolveBusinessId(order);
        const brId = order.branchId || order.restaurantBranchId || '';
        const cId = liveMapModule.resolveCourierId(order);
        const custId = order.customerId || order.clienteId || '';

        const business = liveMapModule.cache.businesses.get(bId) || null;
        const branch = liveMapModule.cache.branches.get(brId) || null;
        const courier = liveMapModule.cache.couriers.get(cId) || null;
        const gps = liveMapModule.cache.gps.get(cId) || null;
        const customer = liveMapModule.cache.customers.get(custId) || null;

        // Coordenadas Origen (Comercio / Sucursal)
        const storeCoords = liveMapModule.resolveBranchCoordinates(branch) || 
                            liveMapModule.resolveBranchCoordinates(business) || 
                            (order.comercioLat && order.comercioLng ? { lat: Number(order.comercioLat), lng: Number(order.comercioLng) } : null) ||
                            (order.branchLat && order.branchLng ? { lat: Number(order.branchLat), lng: Number(order.branchLng) } : null) ||
                            (order.origen && order.origen.coordenadas ? { lat: Number(order.origen.coordenadas.latitud), lng: Number(order.origen.coordenadas.longitud) } : null);

        let storeLat = storeCoords ? storeCoords.lat : null;
        let storeLng = storeCoords ? storeCoords.lng : null;

        // Coordenadas Destino (Cliente)
        let custLat = order.customerLat || order.clienteLat || (order.destino && order.destino.coordenadas ? Number(order.destino.coordenadas.latitud) : null) || customer?.location?.lat;
        let custLng = order.customerLng || order.clienteLng || (order.destino && order.destino.coordenadas ? Number(order.destino.coordenadas.longitud) : null) || customer?.location?.lng;

        // Coordenadas Repartidor (GPS)
        let courierLat = gps?.coordenadas?.latitud || gps?.latitud || gps?.lat;
        let courierLng = gps?.coordenadas?.longitud || gps?.longitud || gps?.lng;
        let speed = gps?.velocidadKmh || gps?.velocidad || gps?.speed || 0;
        let bearing = gps?.rumbo || gps?.bearing || gps?.heading || 0;
        let battery = gps?.bateria || gps?.battery || gps?.batteryLevel || courier?.batteryLevel || 100;
        let freshness = liveMapModule.getGpsFreshness(gps?.ultimaActualizacion || gps?.timestamp || gps?.updatedAt);

        return {
            order,
            orderId,
            business,
            branch,
            courier,
            gps,
            customer,
            storeLat: storeLat ? Number(storeLat) : null,
            storeLng: storeLng ? Number(storeLng) : null,
            custLat: custLat ? Number(custLat) : null,
            custLng: custLng ? Number(custLng) : null,
            courierLat: courierLat ? Number(courierLat) : null,
            courierLng: courierLng ? Number(courierLng) : null,
            speed: Number(speed),
            bearing: Number(bearing),
            battery: Number(battery),
            freshness
        };
    },

    // ── 6. CONTROLADORES DE EVENTOS Y RECONCILIACIÓN DE DATOS ───────────────
    onDataUpdate: () => {
        liveMapModule.lastSyncTimestamp = new Date();
        liveMapModule.updateSyncStatus('LIVE');

        // Actualizar KPIs de Control Tower
        liveMapModule.updateControlTowerKpis();

        // Escanear anomalías operacionales y comercios sin geolocalización
        liveMapModule.detectAnomaliesAndUnlocated();

        // Renderizar marcadores y polilíneas en el mapa
        liveMapModule.renderMapElements();

        // Si se encuentra en Follow Mode, centrar mapa en el motorizado
        if (liveMapModule.followingCourierId) {
            const gpsData = liveMapModule.cache.gps.get(liveMapModule.followingCourierId);
            const lat = gpsData?.coordenadas?.latitud || gpsData?.latitud || gpsData?.lat;
            const lng = gpsData?.coordenadas?.longitud || gpsData?.longitud || gpsData?.lng;
            if (lat && lng && liveMapModule.map) {
                liveMapModule.map.panTo([Number(lat), Number(lng)], { animate: true, duration: 0.8 });
            }
        }

        // Actualizar panel de diagnóstico
        liveMapModule.updateDiagnosticsUI();
    },

    updateSyncStatus: (status) => {
        liveMapModule.syncStatus = status;
        const badge = document.getElementById('liveMapSyncBadge');
        if (!badge) return;

        if (status === 'LIVE') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-1.5';
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE`;
        } else if (status === 'SYNCING') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center gap-1.5';
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> SYNCING`;
        } else if (status === 'ERROR') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-rose-500/10 border-rose-500/30 text-rose-400 flex items-center gap-1.5';
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span> ERROR SYNC`;
        }
    },

    updateControlTowerKpis: () => {
        const activeOrders = Array.from(liveMapModule.cache.orders.values());
        const activeCouriers = Array.from(liveMapModule.cache.couriers.values());
        const activeStores = Array.from(liveMapModule.cache.businesses.values());
        const incidents = Array.from(liveMapModule.cache.incidents.values());

        let inTransitCount = 0;
        let waitingCourierCount = 0;

        activeOrders.forEach(ord => {
            const st = (ord.status || ord.estado || '').toUpperCase();
            if (st === 'IN_TRANSIT' || st === 'EN_RUTA' || st === 'EN_TRANSITO') {
                inTransitCount++;
            } else if (st === 'READY' || st === 'LISTO' || st === 'PENDING' || st === 'PREPARING') {
                waitingCourierCount++;
            }
        });

        let couriersOnline = 0;
        let couriersBusy = 0;

        activeCouriers.forEach(c => {
            const st = (c.courierState || c.shiftState || (c.active ? 'ONLINE' : 'OFFLINE')).toUpperCase();
            const gps = liveMapModule.cache.gps.get(c.id);
            const fresh = liveMapModule.getGpsFreshness(gps?.ultimaActualizacion || gps?.timestamp);

            if (fresh.state === 'ONLINE' || fresh.state === 'STALE') {
                couriersOnline++;
                if (st === 'BUSY' || st === 'IN_TRANSIT' || c.activeOrderId) {
                    couriersBusy++;
                }
            }
        });

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setTxt('kpiActiveOrders', activeOrders.length);
        setTxt('kpiInTransitOrders', inTransitCount);
        setTxt('kpiWaitingCourierOrders', waitingCourierCount);
        setTxt('kpiCouriersOnline', couriersOnline);
        setTxt('kpiCouriersBusy', couriersBusy);
        setTxt('kpiActiveStores', activeStores.length);
        setTxt('kpiActiveIncidents', incidents.length);
    },

    detectAnomaliesAndUnlocated: () => {
        liveMapModule.unlocatedStores = [];
        liveMapModule.anomalies = [];

        // 1. Detección de Comercios/Sucursales sin GPS
        liveMapModule.cache.businesses.forEach(b => {
            const bId = b.id;
            const bBranches = Array.from(liveMapModule.cache.branches.values()).filter(br => br.businessId === bId || br.merchantId === bId || br.restaurantId === bId);

            if (bBranches.length > 0) {
                bBranches.forEach(br => {
                    const coords = liveMapModule.resolveBranchCoordinates(br) || liveMapModule.resolveBranchCoordinates(b);
                    if (!coords) {
                        liveMapModule.unlocatedStores.push({
                            id: br.id,
                            name: b.name || b.comercioNombre || 'Comercio',
                            branchName: br.name || br.nombre || 'Sucursal',
                            businessId: bId
                        });
                    }
                });
            } else {
                const coords = liveMapModule.resolveBranchCoordinates(b);
                if (!coords) {
                    liveMapModule.unlocatedStores.push({
                        id: bId,
                        name: b.name || b.comercioNombre || 'Comercio',
                        branchName: 'Sucursal Principal',
                        businessId: bId
                    });
                }
            }
        });

        const unlocatedBadge = document.getElementById('unlocatedCountBadge');
        if (unlocatedBadge) unlocatedBadge.textContent = liveMapModule.unlocatedStores.length;
        liveMapModule.renderUnlocatedStoresDrawerList();

        // 2. Detección de Anomalías Operacionales
        liveMapModule.cache.orders.forEach(ord => {
            const ctx = liveMapModule.resolveOrderContext(ord);
            const st = (ord.status || ord.estado || '').toUpperCase();
            const cId = ctx.courier?.id || liveMapModule.resolveCourierId(ord);

            if ((st === 'IN_TRANSIT' || st === 'EN_RUTA') && !cId) {
                liveMapModule.anomalies.push({
                    type: 'ORDER_IN_TRANSIT_WITHOUT_COURIER',
                    title: `Pedido #${ord.id.slice(0,8)} EN RUTA sin motorizado asignado`,
                    orderId: ord.id,
                    severity: 'HIGH'
                });
            }

            if ((st === 'ASSIGNED' || st === 'IN_TRANSIT') && cId) {
                if (ctx.freshness.state === 'OFFLINE') {
                    liveMapModule.anomalies.push({
                        type: 'COURIER_STALE_GPS_WITH_ACTIVE_ORDER',
                        title: `Motorizado ${ctx.courier?.name || cId.slice(0,6)} con GPS STALE (${ctx.freshness.text}) en Pedido #${ord.id.slice(0,6)}`,
                        orderId: ord.id,
                        courierId: cId,
                        severity: 'HIGH'
                    });
                }
            }
        });

        const anomaliesBadge = document.getElementById('anomaliesCountBadge');
        if (anomaliesBadge) anomaliesBadge.textContent = liveMapModule.anomalies.length;
        liveMapModule.renderAnomaliesDrawerList();
    },

    // ── 7. RENDERIZADO DE MARCADORES Y CAPAS EN EL MAPA ─────────────────────
    renderMapElements: () => {
        if (!liveMapModule.map || !liveMapModule.markersClusterGroup) return;

        liveMapModule.markersClusterGroup.clearLayers();
        liveMapModule.routesGroup.clearLayers();
        liveMapModule.incidentsGroup.clearLayers();

        const renderedStoreKeys = new Set();
        const renderedCourierIds = new Set();

        // Filtrar pedidos activos
        const activeOrders = Array.from(liveMapModule.cache.orders.values()).filter(ord => {
            const ctx = liveMapModule.resolveOrderContext(ord);
            const q = liveMapModule.filters.searchQuery.toLowerCase();
            const bFilter = liveMapModule.filters.selectedBusinessId;
            const cFilter = liveMapModule.filters.selectedCourierId;
            const stFilter = liveMapModule.filters.orderStatus;

            if (bFilter !== 'ALL' && ctx.business?.id !== bFilter && ord.businessId !== bFilter && ord.comercioId !== bFilter) return false;
            if (cFilter !== 'ALL' && ctx.courier?.id !== cFilter) return false;
            if (stFilter !== 'ALL' && (ord.status || ord.estado || '').toUpperCase() !== stFilter) return false;

            if (q) {
                const matchId = ord.id.toLowerCase().includes(q);
                const matchCust = (ord.customerName || ord.clienteNombre || '').toLowerCase().includes(q);
                const matchBus = (ctx.business?.name || ord.comercioNombre || '').toLowerCase().includes(q);
                const matchCour = (ctx.courier?.name || ord.motorizadoNombre || '').toLowerCase().includes(q);
                const matchPlate = (ctx.courier?.licensePlate || ord.motorizadoPlaca || '').toLowerCase().includes(q);
                if (!matchId && !matchCust && !matchBus && !matchCour && !matchPlate) return false;
            }
            return true;
        });

        // A. CAPA 1: COMERCIOS & SUCURSALES (🏪) — VISUALIZACIÓN PERMANENTE
        if (liveMapModule.layers.stores) {
            liveMapModule.cache.businesses.forEach(b => {
                const bId = b.id;
                if (liveMapModule.filters.selectedBusinessId !== 'ALL' && liveMapModule.filters.selectedBusinessId !== bId) return;

                // Buscar sucursales asociadas en /branches
                const bBranches = Array.from(liveMapModule.cache.branches.values()).filter(br => 
                    br.businessId === bId || br.merchantId === bId || br.restaurantId === bId
                );

                if (bBranches.length > 0) {
                    bBranches.forEach(br => {
                        const markerKey = `business:${bId}:branch:${br.id}`;
                        if (renderedStoreKeys.has(markerKey)) return;

                        const coords = liveMapModule.resolveBranchCoordinates(br) || liveMapModule.resolveBranchCoordinates(b);
                        if (coords) {
                            renderedStoreKeys.add(markerKey);
                            const activeCount = activeOrders.filter(o => liveMapModule.resolveBusinessId(o) === bId).length;

                            const storeIcon = L.divIcon({
                                className: 'custom-store-marker-icon',
                                html: `
                                    <div class="relative group cursor-pointer flex items-center justify-center">
                                        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 border-2 border-white text-white shadow-xl flex items-center justify-center font-bold text-base transform transition-all duration-200 hover:scale-110 shadow-indigo-950/50">
                                            🏪
                                        </div>
                                        ${activeCount > 0 ? `<span class="absolute -top-1.5 -right-1.5 bg-rose-500 border-2 border-white text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-pulse">${activeCount}</span>` : ''}
                                    </div>
                                `,
                                iconSize: [40, 40],
                                iconAnchor: [20, 20]
                            });

                            const m = L.marker([coords.lat, coords.lng], { icon: storeIcon })
                                .bindPopup(liveMapModule.createCommercePopupContent(b, br, activeCount));
                            liveMapModule.markersClusterGroup.addLayer(m);
                        }
                    });
                } else {
                    // Si no existen subdocumentos en /branches, evaluar el documento raíz /businesses
                    const markerKey = `business:${bId}`;
                    if (!renderedStoreKeys.has(markerKey)) {
                        const coords = liveMapModule.resolveBranchCoordinates(b);
                        if (coords) {
                            renderedStoreKeys.add(markerKey);
                            const activeCount = activeOrders.filter(o => liveMapModule.resolveBusinessId(o) === bId).length;

                            const storeIcon = L.divIcon({
                                className: 'custom-store-marker-icon',
                                html: `
                                    <div class="relative group cursor-pointer flex items-center justify-center">
                                        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 border-2 border-white text-white shadow-xl flex items-center justify-center font-bold text-base transform transition-all duration-200 hover:scale-110 shadow-indigo-950/50">
                                            🏪
                                        </div>
                                        ${activeCount > 0 ? `<span class="absolute -top-1.5 -right-1.5 bg-rose-500 border-2 border-white text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-pulse">${activeCount}</span>` : ''}
                                    </div>
                                `,
                                iconSize: [40, 40],
                                iconAnchor: [20, 20]
                            });

                            const m = L.marker([coords.lat, coords.lng], { icon: storeIcon })
                                .bindPopup(liveMapModule.createCommercePopupContent(b, null, activeCount));
                            liveMapModule.markersClusterGroup.addLayer(m);
                        }
                    }
                }
            });
        }

        // B. CAPA 2: MOTORIZADOS & TELEMETRÍA GPS (🛵)
        if (liveMapModule.layers.couriers) {
            liveMapModule.cache.couriers.forEach(c => {
                const cId = c.id;
                if (liveMapModule.filters.selectedCourierId !== 'ALL' && liveMapModule.filters.selectedCourierId !== cId) return;

                const gps = liveMapModule.cache.gps.get(cId);
                const lat = gps?.coordenadas?.latitud || gps?.latitud || gps?.lat;
                const lng = gps?.coordenadas?.longitud || gps?.longitud || gps?.lng;
                const bearing = Number(gps?.rumbo || gps?.bearing || gps?.heading || 0);
                const freshness = liveMapModule.getGpsFreshness(gps?.ultimaActualizacion || gps?.timestamp);

                if (lat && lng && !renderedCourierIds.has(cId)) {
                    renderedCourierIds.add(cId);

                    const isOnline = freshness.state === 'ONLINE';
                    const isStale = freshness.state === 'STALE';
                    const isBusy = (c.courierState || c.shiftState || '').toUpperCase() === 'BUSY' || c.activeOrderId;

                    let bgGradient = 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-950/50';
                    let dotColor = 'bg-emerald-400';
                    let pointerColor = 'border-b-emerald-400';

                    if (isBusy && isOnline) {
                        bgGradient = 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-blue-950/50';
                        dotColor = 'bg-blue-400';
                        pointerColor = 'border-b-blue-400';
                    } else if (isStale) {
                        bgGradient = 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-950/50';
                        dotColor = 'bg-amber-400';
                        pointerColor = 'border-b-amber-400';
                    } else if (!isOnline && !isStale) {
                        bgGradient = 'bg-slate-700 shadow-slate-900/50';
                        dotColor = 'bg-slate-500';
                        pointerColor = 'border-b-slate-400';
                    }

                    const courierIcon = L.divIcon({
                        className: 'custom-courier-marker-icon',
                        html: `
                            <div class="relative group cursor-pointer flex items-center justify-center">
                                ${isOnline ? '<div class="bs-radar-aura"></div>' : ''}
                                <div class="relative z-10" style="${bearing > 0 ? `transform: rotate(${bearing}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);` : ''}">
                                    <div class="w-10 h-10 rounded-full ${bgGradient} border-2 border-white text-white shadow-xl flex items-center justify-center font-black text-sm transform transition hover:scale-110">
                                        🛵
                                    </div>
                                    ${bearing > 0 ? `<div class="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-b-[7px] ${pointerColor}"></div>` : ''}
                                </div>
                                <span class="absolute -bottom-0.5 -right-0.5 z-20 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white shadow-sm"></span>
                            </div>
                        `,
                        iconSize: [44, 44],
                        iconAnchor: [22, 22]
                    });

                    const m = L.marker([Number(lat), Number(lng)], { icon: courierIcon })
                        .bindPopup(liveMapModule.createCourierPopupContent(c, gps, freshness));
                    liveMapModule.markersClusterGroup.addLayer(m);
                }
            });
        }

        // C. CAPA 3 Y 4: CLIENTES, RUTAS Y PEDIDOS (👤 📦 🛣️)
        activeOrders.forEach(ord => {
            const ctx = liveMapModule.resolveOrderContext(ord);

            // Marcador de Cliente (Destino)
            if (liveMapModule.layers.customers && ctx.custLat && ctx.custLng) {
                const customerIcon = L.divIcon({
                    className: 'custom-customer-marker-icon',
                    html: `
                        <div class="relative group cursor-pointer flex items-center justify-center">
                            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-900 border-2 border-white text-white shadow-lg flex items-center justify-center font-bold text-xs transform transition hover:scale-110 shadow-purple-950/50">
                                👤
                            </div>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const custMarker = L.marker([ctx.custLat, ctx.custLng], { icon: customerIcon })
                    .bindPopup(liveMapModule.createCustomerPopupContent(ctx));
                liveMapModule.markersClusterGroup.addLayer(custMarker);
            }

            // Polilíneas de Rutas (Comercio -> Courier -> Cliente) con Underlay Casing
            if (liveMapModule.layers.routes) {
                const points = [];
                if (ctx.storeLat && ctx.storeLng) points.push([ctx.storeLat, ctx.storeLng]);
                if (ctx.courierLat && ctx.courierLng) points.push([ctx.courierLat, ctx.courierLng]);
                if (ctx.custLat && ctx.custLng) points.push([ctx.custLat, ctx.custLng]);

                if (points.length >= 2) {
                    const st = (ord.status || ord.estado || '').toUpperCase();
                    const routeColor = st === 'IN_TRANSIT' || st === 'EN_RUTA' ? '#2563eb' : st === 'READY' ? '#7c3aed' : '#d97706';

                    // 1. Halo / Underlay Casing para contraste sobre calles
                    const underlay = L.polyline(points, {
                        color: routeColor,
                        weight: 8,
                        opacity: 0.22,
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    liveMapModule.routesGroup.addLayer(underlay);

                    // 2. Trazo Principal de Ruta de Navegación
                    const polyline = L.polyline(points, {
                        color: routeColor,
                        weight: 3.5,
                        opacity: 0.95,
                        dashArray: '6, 8',
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    liveMapModule.routesGroup.addLayer(polyline);
                }
            }
        });

        // D. CAPA 5: INCIDENCIAS OPERACIONALES (⚠️)
        if (liveMapModule.layers.incidents) {
            liveMapModule.cache.incidents.forEach(inc => {
                const lat = inc.latitude || inc.lat || inc.coordenadas?.latitud;
                const lng = inc.longitude || inc.lng || inc.coordenadas?.longitud;
                if (lat && lng) {
                    const incidentIcon = L.divIcon({
                        className: 'custom-incident-marker-icon',
                        html: `
                            <div class="relative group cursor-pointer flex items-center justify-center">
                                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 border-2 border-white text-white shadow-xl flex items-center justify-center font-bold text-sm transform transition hover:scale-110 shadow-rose-950/60">
                                    ⚠️
                                </div>
                            </div>
                        `,
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });

                    const m = L.marker([Number(lat), Number(lng)], { icon: incidentIcon })
                        .bindPopup(`
                            <div class="p-3 space-y-1.5 font-sans text-xs bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl">
                                <h4 class="font-black text-rose-400 flex items-center gap-1.5">⚠️ INCIDENCIA OPERATIVA</h4>
                                <p><b class="text-slate-400">Categoría:</b> <span class="text-slate-200">${inc.category || 'General'}</span></p>
                                <p><b class="text-slate-400">Descripción:</b> <span class="text-slate-200">${inc.description || 'Sin detalle'}</span></p>
                                <p class="text-[10px] text-slate-500 pt-1 border-t border-slate-800">Hora: ${new Date(inc.timestamp || Date.now()).toLocaleTimeString()}</p>
                            </div>
                        `);
                    liveMapModule.incidentsGroup.addLayer(m);
                }
            });
        }
    },

    // ── 8. GENERACIÓN DE POPUPS ENTERPRISE 4K ─────────────────────────────────
    createCourierPopupContent: (courier, gps, freshness) => {
        const cId = courier.id;
        const name = courier.name || courier.nombre || courier.displayName || 'Motorizado';
        const plate = courier.licensePlate || courier.placa || courier.vehiculo || 'Sin Placa';
        const opId = courier.driverId || courier.codigoOperativo || `DRV-${cId.slice(0,4).toUpperCase()}`;
        const trust = courier.trustScore || 100;
        const speed = gps?.velocidadKmh || gps?.velocidad || 0;
        const battery = gps?.bateria || gps?.battery || courier.batteryLevel || 95;

        // Buscar pedido asignado
        let currentOrder = null;
        liveMapModule.cache.orders.forEach(o => {
            if (liveMapModule.resolveCourierId(o) === cId) {
                currentOrder = o;
            }
        });

        const freshBadgeColor = freshness.state === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                freshness.state === 'STALE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-rose-500/20 text-rose-400 border-rose-500/30';

        let orderSectionHtml = '<p class="text-[11px] text-gray-400 font-semibold italic bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">Sin pedido asignado actualmente</p>';

        if (currentOrder) {
            const ctx = liveMapModule.resolveOrderContext(currentOrder);
            const itemsSummary = Array.isArray(currentOrder.items) ? currentOrder.items.map(i => `${i.quantity||1}x ${i.productName||i.name||'Item'}`).join(', ') : currentOrder.itemsSummary || 'Items';
            
            orderSectionHtml = `
                <div class="bg-slate-900 border border-slate-700 p-2.5 rounded-xl space-y-1.5 text-xs text-slate-200 mt-2">
                    <div class="flex items-center justify-between font-bold">
                        <span class="text-indigo-400">📦 Pedido #${currentOrder.id.slice(0,8).toUpperCase()}</span>
                        <span class="px-2 py-0.5 rounded-full text-[9px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">${(currentOrder.status||currentOrder.estado||'').toUpperCase()}</span>
                    </div>
                    <p class="text-[11px]"><b>Comercio:</b> ${ctx.business?.name || currentOrder.comercioNombre || 'Comercio'}</p>
                    <p class="text-[11px]"><b>Cliente:</b> ${currentOrder.customerName || currentOrder.clienteNombre || 'Cliente'}</p>
                    <p class="text-[10px] text-slate-400 truncate"><b>Items:</b> ${itemsSummary}</p>
                </div>
            `;
        }

        return `
            <div class="p-3 space-y-2 font-sans w-72 text-xs bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl">
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs">
                            ${name[0]}
                        </div>
                        <div>
                            <h4 class="font-black text-sm text-white leading-tight">${name}</h4>
                            <span class="text-[10px] font-mono text-indigo-400 font-bold">${opId} • ${plate}</span>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${freshBadgeColor}">${freshness.label}</span>
                </div>

                <!-- Telemetry Metrics Grid -->
                <div class="grid grid-cols-3 gap-1.5 text-center bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <div>
                        <span class="text-[9px] text-slate-400 font-bold uppercase">Velocidad</span>
                        <p class="font-black text-white text-xs">${speed.toFixed(0)} km/h</p>
                    </div>
                    <div>
                        <span class="text-[9px] text-slate-400 font-bold uppercase">Trust Score</span>
                        <p class="font-black text-emerald-400 text-xs">${trust}%</p>
                    </div>
                    <div>
                        <span class="text-[9px] text-slate-400 font-bold uppercase">Batería</span>
                        <p class="font-bold text-slate-200 text-xs">🔋 ${battery}%</p>
                    </div>
                </div>

                <!-- GPS Freshness Info -->
                <div class="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>Última señal GPS:</span>
                    <strong class="text-slate-200 font-mono">${freshness.text}</strong>
                </div>

                <!-- Current Order Section -->
                ${orderSectionHtml}

                <!-- Actions -->
                <div class="pt-2 border-t border-slate-800 flex gap-2">
                    <button onclick="liveMapModule.toggleFollowCourier('${cId}', '${name}')" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] py-1.5 rounded-lg transition shadow-md">
                        🎯 Seguir Courier
                    </button>
                    ${currentOrder ? `<button onclick="liveMapModule.openOrderDetailModal('${currentOrder.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] px-3 py-1.5 rounded-lg transition">Ver Pedido</button>` : ''}
                </div>
            </div>
        `;
    },

    createCommercePopupContent: (business, branch, activeCount) => {
        const name = business.name || business.comercioNombre || business.nombre || 'Comercio';
        const branchName = branch ? (branch.name || branch.nombre || 'Sucursal Principal') : 'Sucursal Principal';
        const category = business.category || business.categoría || 'Restaurante';
        const phone = branch?.phone || business.phone || business.teléfono || 'N/A';
        const address = branch?.address || business.address || business.dirección || 'Dirección no especificada';

        const geoMeta = branch?.geolocationMetadata || business?.geolocationMetadata || {};
        const coords = liveMapModule.resolveBranchCoordinates(branch) || liveMapModule.resolveBranchCoordinates(business);
        const confidence = geoMeta.confidence || (coords ? 'ROOFTOP' : 'UNVERIFIED');
        const source = geoMeta.source || (coords ? 'GEOCODED_VERIFIED_ADDRESS' : 'MANUAL');

        return `
            <div class="p-3 space-y-2 font-sans w-72 text-xs bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl">
                <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span class="text-2xl p-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">🏪</span>
                    <div>
                        <h4 class="font-black text-sm text-white leading-tight">${name}</h4>
                        <span class="text-[10px] font-bold text-indigo-400">${branchName} • ${category}</span>
                    </div>
                </div>

                <div class="space-y-1 text-[11px] text-slate-300">
                    <p><b>Dirección:</b> ${address}</p>
                    <p><b>Teléfono:</b> ${phone}</p>
                    <p class="flex items-center justify-between pt-1">
                        <span>Pedidos Activos:</span>
                        <strong class="${activeCount > 0 ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 bg-slate-800'} px-2.5 py-0.5 rounded-full font-black">${activeCount}</strong>
                    </p>
                </div>

                <!-- Geolocation Diagnostic Badge -->
                <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl text-[10px] font-mono space-y-0.5 text-slate-400">
                    <div class="flex justify-between items-center">
                        <span>Geolocalización:</span>
                        <strong class="text-emerald-400 font-bold">✓ VERIFICADA</strong>
                    </div>
                    ${coords ? `<p class="truncate">GPS: <span class="text-slate-200">${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}</span></p>` : ''}
                    <div class="flex justify-between text-[9px] text-slate-500 pt-0.5">
                        <span>Fuente: ${source}</span>
                        <span>Precisión: ${confidence}</span>
                    </div>
                </div>

                ${activeCount === 0 ? `<p class="text-[10px] text-slate-500 italic bg-slate-900 p-2 rounded-xl border border-slate-800 text-center">Este comercio no tiene pedidos activos actualmente.</p>` : ''}

                <div class="pt-2 border-t border-slate-800 flex gap-2">
                    <button onclick="liveMapModule.filterByCommerce('${business.id}')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] py-1.5 rounded-lg transition">
                        Filtrar por este Comercio
                    </button>
                </div>
            </div>
        `;
    },

    createCustomerPopupContent: (ctx) => {
        const name = ctx.order?.customerName || ctx.order?.clienteNombre || ctx.customer?.name || 'Cliente';
        const address = ctx.order?.customerAddress || ctx.order?.clienteDireccion || ctx.order?.address || 'Dirección de Entrega';

        return `
            <div class="p-3 space-y-2 font-sans w-60 text-xs bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl">
                <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span class="text-xl p-1 bg-purple-500/10 rounded-xl border border-purple-500/20">👤</span>
                    <div>
                        <h4 class="font-black text-sm text-white leading-tight">${name}</h4>
                        <span class="text-[10px] text-purple-400 font-bold">Destino de Entrega</span>
                    </div>
                </div>

                <div class="space-y-1 text-[11px] text-slate-300">
                    <p><b>Dirección:</b> ${address}</p>
                    <p><b>Pedido:</b> <span class="font-mono text-indigo-400 font-bold">${ctx.order?.orderCode || '#' + ctx.orderId.slice(0,8).toUpperCase()}</span></p>
                    <p><b>Motorizado:</b> ${ctx.courier?.name || 'Por asignar'}</p>
                </div>
            </div>
        `;
    },

    // ── 9. DRAWERS Y PANELES LATERALES ─────────────────────────────────────────
    toggleLayer: (layerName, isChecked) => {
        liveMapModule.layers[layerName] = isChecked;
        liveMapModule.renderMapElements();
    },

    toggleDiagnosticsPanel: () => {
        liveMapModule.diagnosticsVisible = !liveMapModule.diagnosticsVisible;
        const panel = document.getElementById('diagnosticsPanelOverlay');
        if (panel) {
            if (liveMapModule.diagnosticsVisible) panel.classList.remove('hidden');
            else panel.classList.add('hidden');
        }
        liveMapModule.updateDiagnosticsUI();
    },

    updateDiagnosticsUI: () => {
        if (!liveMapModule.diagnosticsVisible) return;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('diagOrdersCount', liveMapModule.cache.orders.size);
        setVal('diagActiveOrdersCount', liveMapModule.cache.orders.size);
        setVal('diagBusinessesCount', liveMapModule.cache.businesses.size);
        setVal('diagBranchesCount', liveMapModule.cache.branches.size);
        setVal('diagCouriersCount', liveMapModule.cache.couriers.size);
        setVal('diagGpsCount', liveMapModule.cache.gps.size);
        setVal('diagIncidentsCount', liveMapModule.cache.incidents.size);
        setVal('diagIncidentsListener', liveMapModule.incidentsStatus || 'CONNECTED');
        setVal('diagLastSyncTime', liveMapModule.lastSyncTimestamp ? liveMapModule.lastSyncTimestamp.toLocaleTimeString() : '--:--:--');
    },

    toggleUnlocatedStoresDrawer: () => {
        const drawer = document.getElementById('unlocatedStoresDrawerOverlay');
        if (drawer) drawer.classList.toggle('hidden');
    },

    renderUnlocatedStoresDrawerList: () => {
        const container = document.getElementById('unlocatedStoresListContainer');
        if (!container) return;

        if (liveMapModule.unlocatedStores.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 p-4 text-center">No existen comercios sin coordenadas registradas.</p>`;
            return;
        }

        container.innerHTML = liveMapModule.unlocatedStores.map(st => `
            <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 text-xs text-slate-200">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-white text-xs">${st.name}</h4>
                    <span class="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">SIN GPS</span>
                </div>
                <p class="text-[11px] text-slate-400">${st.branchName}</p>
            </div>
        `).join('');
    },

    toggleAnomaliesDrawer: () => {
        const drawer = document.getElementById('anomaliesDrawerOverlay');
        if (drawer) drawer.classList.toggle('hidden');
    },

    renderAnomaliesDrawerList: () => {
        const container = document.getElementById('anomaliesListContainer');
        if (!container) return;

        if (liveMapModule.anomalies.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 p-4 text-center">No hay anomalías operacionales detectadas.</p>`;
            return;
        }

        container.innerHTML = liveMapModule.anomalies.map(a => `
            <div class="bg-slate-950 border border-rose-900/40 p-3 rounded-xl space-y-1 text-xs text-slate-200">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">${a.severity}</span>
                    <span class="text-[10px] text-slate-500 font-mono">Alerta Activa</span>
                </div>
                <p class="text-xs font-semibold text-rose-300">${a.title}</p>
            </div>
        `).join('');
    },

    // ── 10. INTERACCIONES, FILTROS Y BÚSQUEDA ─────────────────────────────────
    populateBusinessDropdown: () => {
        const select = document.getElementById('filterSelectBusiness');
        if (!select) return;

        const currentVal = select.value || 'ALL';
        select.innerHTML = '<option value="ALL">🏢 Todos Comercios</option>';

        liveMapModule.cache.businesses.forEach(b => {
            const name = b.name || b.comercioNombre || b.nombre || 'Comercio';
            select.innerHTML += `<option value="${b.id}">📍 ${name}</option>`;
        });
        select.value = currentVal;
    },

    populateCourierDropdown: () => {
        const select = document.getElementById('filterSelectCourier');
        if (!select) return;

        const currentVal = select.value || 'ALL';
        select.innerHTML = '<option value="ALL">🛵 Todos Motorizados</option>';

        liveMapModule.cache.couriers.forEach(c => {
            const name = c.name || c.nombre || 'Motorizado';
            const plate = c.licensePlate || c.placa || 'Sin Placa';
            select.innerHTML += `<option value="${c.id}">🛵 ${name} (${plate})</option>`;
        });
        select.value = currentVal;
    },

    onSearchInput: (val) => {
        liveMapModule.filters.searchQuery = val || '';
        liveMapModule.renderMapElements();
    },

    onBusinessFilterChange: (val) => {
        liveMapModule.filters.selectedBusinessId = val || 'ALL';
        liveMapModule.renderMapElements();
    },

    filterByCommerce: (bId) => {
        liveMapModule.filters.selectedBusinessId = bId;
        const select = document.getElementById('filterSelectBusiness');
        if (select) select.value = bId;
        liveMapModule.renderMapElements();
    },

    onCourierFilterChange: (val) => {
        liveMapModule.filters.selectedCourierId = val || 'ALL';
        liveMapModule.renderMapElements();

        if (val !== 'ALL') {
            const courier = liveMapModule.cache.couriers.get(val);
            const gps = liveMapModule.cache.gps.get(val);
            const lat = gps?.coordenadas?.latitud || gps?.latitud || gps?.lat;
            const lng = gps?.coordenadas?.longitud || gps?.longitud || gps?.lng;
            if (lat && lng && liveMapModule.map) {
                liveMapModule.map.setView([Number(lat), Number(lng)], 16);
            }
        }
    },

    onOrderStatusFilterChange: (val) => {
        liveMapModule.filters.orderStatus = val || 'ALL';
        liveMapModule.renderMapElements();
    },

    // Modo Seguir Courier (Follow Mode)
    toggleFollowCourier: (courierId, courierName) => {
        if (liveMapModule.followingCourierId === courierId) {
            liveMapModule.stopFollowingCourier();
        } else {
            liveMapModule.followingCourierId = courierId;
            const banner = document.getElementById('followModeBanner');
            const nameText = document.getElementById('followCourierNameText');
            if (banner) banner.classList.remove('hidden');
            if (nameText) nameText.textContent = courierName || 'Motorizado';

            const gps = liveMapModule.cache.gps.get(courierId);
            const lat = gps?.coordenadas?.latitud || gps?.latitud || gps?.lat;
            const lng = gps?.coordenadas?.longitud || gps?.longitud || gps?.lng;
            if (lat && lng && liveMapModule.map) {
                liveMapModule.map.setView([Number(lat), Number(lng)], 16);
            }
        }
    },

    stopFollowingCourier: () => {
        liveMapModule.followingCourierId = null;
        const banner = document.getElementById('followModeBanner');
        if (banner) banner.classList.add('hidden');
    },

    // Centrar Operación (Calcula Bounds de Comercios, Couriers y Destinos activos)
    fitOperationBounds: () => {
        if (!liveMapModule.map) return;

        const bounds = L.latLngBounds();

        // 1. Incluir Comercios y Sucursales Geolocalizados
        liveMapModule.cache.businesses.forEach(b => {
            const bBranches = Array.from(liveMapModule.cache.branches.values()).filter(br => 
                br.businessId === b.id || br.merchantId === b.id || br.restaurantId === b.id
            );
            if (bBranches.length > 0) {
                bBranches.forEach(br => {
                    const coords = liveMapModule.resolveBranchCoordinates(br) || liveMapModule.resolveBranchCoordinates(b);
                    if (coords) bounds.extend([coords.lat, coords.lng]);
                });
            } else {
                const coords = liveMapModule.resolveBranchCoordinates(b);
                if (coords) bounds.extend([coords.lat, coords.lng]);
            }
        });

        // 2. Incluir Motorizados activos con GPS
        liveMapModule.cache.gps.forEach(g => {
            const lat = g?.coordenadas?.latitud || g?.latitud || g?.lat;
            const lng = g?.coordenadas?.longitud || g?.longitud || g?.lng;
            if (lat && lng) bounds.extend([Number(lat), Number(lng)]);
        });

        if (bounds.isValid()) {
            liveMapModule.map.fitBounds(bounds, { padding: [40, 40] });
        } else {
            // Default: Managua, Nicaragua
            liveMapModule.map.setView([12.1364, -86.2514], 13);
        }
    },

    // Modal de Detalle de Pedido Enterprise
    openOrderDetailModal: (orderId) => {
        const order = liveMapModule.cache.orders.get(orderId);
        if (!order) return;

        const ctx = liveMapModule.resolveOrderContext(order);
        const items = Array.isArray(order.items) ? order.items : [];

        const modalHtml = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200" id="liveMapOrderDetailModal">
                <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-white">
                    <!-- Header -->
                    <div class="flex justify-between items-start border-b border-slate-800 pb-4">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-lg font-black text-white">Pedido #${order.id.slice(0,8).toUpperCase()}</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">${(order.status||order.estado||'').toUpperCase()}</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">Enterprise Order Detail • ID: ${order.id}</p>
                        </div>
                        <button onclick="document.getElementById('liveMapOrderDetailModal').remove()" class="text-slate-400 hover:text-white font-black text-lg">✕</button>
                    </div>

                    <!-- Context Info Grid -->
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                            <span class="text-[10px] font-black text-slate-500 uppercase">Comercio / Origen</span>
                            <p class="font-bold text-slate-200">${ctx.business?.name || order.comercioNombre || 'Comercio'}</p>
                            <p class="text-[11px] text-slate-400 truncate">${ctx.branch?.name || 'Sucursal Principal'}</p>
                        </div>
                        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                            <span class="text-[10px] font-black text-slate-500 uppercase">Cliente / Destino</span>
                            <p class="font-bold text-slate-200">${order.customerName || order.clienteNombre || 'Cliente'}</p>
                            <p class="text-[11px] text-slate-400 truncate">${order.customerAddress || order.clienteDireccion || 'Dirección de Entrega'}</p>
                        </div>
                    </div>

                    <!-- Courier Assigned Card -->
                    <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-sm">🛵</div>
                            <div>
                                <h4 class="font-bold text-slate-100">${ctx.courier?.name || order.assignedCourierName || order.motorizadoNombre || 'Por Asignar'}</h4>
                                <span class="text-[10px] font-mono text-slate-400">${order.assignedCourierPlate || order.motorizadoPlaca || 'Sin Placa'}</span>
                            </div>
                        </div>
                        ${ctx.courier?.id ? `<button onclick="liveMapModule.toggleFollowCourier('${ctx.courier.id}', '${ctx.courier.name}'); document.getElementById('liveMapOrderDetailModal').remove();" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl transition">🎯 Seguir</button>` : ''}
                    </div>

                    <!-- Items breakdown -->
                    <div class="space-y-2">
                        <span class="text-[10px] font-black text-slate-500 uppercase">Detalle de Productos (${items.length})</span>
                        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 max-h-40 overflow-y-auto">
                            ${items.length > 0 ? items.map(i => `
                                <div class="flex items-center justify-between text-xs text-slate-300">
                                    <span>${i.quantity || 1}x ${i.productName || i.name || 'Producto'}</span>
                                    <strong class="text-slate-100">C$ ${parseFloat(i.price || 0).toFixed(2)}</strong>
                                </div>
                            `).join('') : `<p class="text-xs text-slate-500">${order.itemsSummary || 'Sin resumen estructurado de productos'}</p>`}
                        </div>
                    </div>

                    <!-- Footer Total -->
                    <div class="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span class="text-xs font-bold text-slate-400">Monto Total del Pedido:</span>
                        <span class="text-lg font-black text-emerald-400">C$ ${parseFloat(order.total || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

window.liveMapModule = liveMapModule;
