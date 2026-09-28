// Módulo Oficial: Zonas Calientes / Heatmap de Demanda Enterprise (Actividad #8)
// BlueSystem Delivery Enterprise — Plataforma Multi-Tenant
// ADR-003 Compliance, ADR-013 Freezed Basemaps, K-Anonymity & Anti-Doxxing

const heatmapAnalyticsModule = {
    // ─── 1. ESTADO DEL MÓDULO ─────────────────────────────────────────────────
    map: null,
    heatLayer: null,
    tileLayer: null,
    
    // Caché en memoria con TTL de 10 minutos
    cache: new Map(), // key -> { data, timestamp }
    CACHE_TTL_MS: 10 * 60 * 1000,

    // Filtros activos
    filters: {
        tenantId: 'ALL',
        timeRange: 'last7days',
        startDate: '',
        endDate: '',
        businessLine: 'ALL',       // ALL, COMMERCE, PARCEL_XY
        perspective: 'DESTINATION', // DESTINATION, ORIGIN, BOTH
        metric: 'ALL',             // ALL, COMPLETED, CANCELLED
        departmentId: 'ALL',
        municipalityId: 'ALL',
        merchantId: 'ALL',
        radius: 35,
        blur: 20
    },

    // Datos cargados actuales
    currentData: null,
    isLoading: false,
    currentMode: 'GLOBAL', // 'GLOBAL' | 'MERCHANT'

    // ─── 2. CICLO DE VIDA Y RENDER ─────────────────────────────────────────────
    render: async () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Limpiar mapa anterior si existe
        if (heatmapAnalyticsModule.map) {
            try {
                heatmapAnalyticsModule.map.remove();
            } catch (e) {
                console.warn('[HEATMAP] Error limpiando instancia de mapa anterior:', e);
            }
            heatmapAnalyticsModule.map = null;
            heatmapAnalyticsModule.heatLayer = null;
        }

        const isSuperAdmin = window.AuthReadyGate && (
            window.AuthReadyGate.role === 'super_admin' ||
            (window.AuthReadyGate.claims && window.AuthReadyGate.claims.isSuperAdmin === true)
        );

        container.innerHTML = `
            <div class="h-full flex flex-col space-y-4 font-sans select-none pb-4">
                <!-- Header Control Center -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/95 p-4 rounded-2xl border border-slate-800 shadow-2xl shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl font-black shrink-0">
                            🔥
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-lg font-black text-white leading-tight">Zonas Calientes & Heatmap de Demanda</h2>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
                                    ENTERPRISE ANALYTICS
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">Mapa térmico de concentración de pedidos, consumo y despacho • Anti-Doxxing K-Anonymity</p>
                        </div>
                    </div>

                    <!-- Quick Actions Toolbar -->
                    <div class="flex flex-wrap items-center justify-end gap-2 text-xs w-full lg:w-auto mt-2 lg:mt-0">
                        <div class="flex bg-slate-950 rounded-lg p-1 border border-slate-800 self-start mr-auto lg:mr-2">
                            <button id="hmBtnModeGlobal" onclick="heatmapAnalyticsModule.switchMode('GLOBAL')" class="px-4 py-1.5 text-xs font-bold rounded-md bg-indigo-600 text-white shadow">🌍 Global</button>
                            <button id="hmBtnModeMerchant" onclick="heatmapAnalyticsModule.switchMode('MERCHANT')" class="px-4 py-1.5 text-xs font-bold rounded-md text-slate-400 hover:text-slate-200">🏪 Comercio</button>
                        </div>
                        <button onclick="heatmapAnalyticsModule.fitMapBounds()" class="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
                            <span>🎯</span> Centrar
                        </button>
                        <button onclick="heatmapAnalyticsModule.exportToCsv()" class="bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5" id="btnExportCsv" title="Exportar a CSV">
                            <span>📊</span> CSV
                        </button>
                        <button onclick="heatmapAnalyticsModule.exportToPdf()" class="bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5" id="btnExportPdf" title="Exportar a PDF Analítico">
                            <span>📄</span> PDF
                        </button>
                        <button onclick="heatmapAnalyticsModule.loadData(true)" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
                            <span>🔄</span> Refrescar
                        </button>
                    </div>
                </div>

                <!-- Filters Control Bar (Filtros Reactivos) -->
                <div class="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3 shrink-0">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                        <!-- 1. Línea de Negocio -->
                        <div class="space-y-1">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Línea de Negocio</label>
                            <select id="hmFilterBusinessLine" onchange="heatmapAnalyticsModule.onFilterChange('businessLine', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-indigo-500 focus:outline-none">
                                <option value="ALL">📦 Todas las Líneas</option>
                                <option value="COMMERCE">🏪 Comercio (Delivery)</option>
                                <option value="PARCEL_XY">🛵 Envíos (Punto A → B)</option>
                            </select>
                        </div>

                        <!-- 2. Perspectiva Geoespacial (Solo Global) -->
                        <div class="space-y-1" id="hmFilterPerspectiveContainer">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Perspectiva Demanda</label>
                            <select id="hmFilterPerspective" onchange="heatmapAnalyticsModule.onFilterChange('perspective', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-indigo-500 focus:outline-none">
                                <option value="DESTINATION">📍 Demanda de Entrega (Clientes)</option>
                                <option value="ORIGIN">🏬 Concentración Origen (Comercios)</option>
                                <option value="BOTH">🔄 Ambas Coordenadas</option>
                            </select>
                        </div>

                        <!-- 2.5 Comercio (Solo Merchant Mode) -->
                        <div class="space-y-1 hidden" id="hmFilterMerchantContainer">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider text-amber-400">Comercio Específico</label>
                            <select id="hmFilterMerchant" onchange="heatmapAnalyticsModule.onFilterChange('merchantId', this.value)" class="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-amber-500 focus:outline-none">
                                <option value="ALL">Seleccionar Comercio...</option>
                                <!-- Se llenará dinámicamente -->
                            </select>
                        </div>

                        <!-- 3. Rango Temporal -->
                        <div class="space-y-1">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Periodo</label>
                            <select id="hmFilterTimeRange" onchange="heatmapAnalyticsModule.onTimeRangeChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-indigo-500 focus:outline-none">
                                <option value="last7days">Últimos 7 Días</option>
                                <option value="today">Hoy</option>
                                <option value="yesterday">Ayer</option>
                                <option value="last30days">Últimos 30 Días</option>
                                <option value="currentMonth">Mes Actual</option>
                                <option value="custom">📅 Personalizado...</option>
                            </select>
                        </div>

                        <!-- 4. Departamento -->
                        <div class="space-y-1">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Departamento</label>
                            <select id="hmFilterDepartment" onchange="heatmapAnalyticsModule.onDepartmentChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-indigo-500 focus:outline-none">
                                <option value="ALL">Todo el País</option>
                            </select>
                        </div>

                        <!-- 5. Municipio -->
                        <div class="space-y-1">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Municipio</label>
                            <select id="hmFilterMunicipality" onchange="heatmapAnalyticsModule.onFilterChange('municipalityId', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-indigo-500 focus:outline-none">
                                <option value="ALL">Todos los Municipios</option>
                            </select>
                        </div>

                        <!-- 6. Métrica / Estado -->
                        <div class="space-y-1">
                            <label class="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Métrica de Éxito</label>
                            <select id="hmFilterMetric" onchange="heatmapAnalyticsModule.onFilterChange('metric', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-medium focus:border-indigo-500 focus:outline-none">
                                <option value="ALL">📊 Demanda Total (Activos + Entregados)</option>
                                <option value="COMPLETED">✅ Solo Completados</option>
                                <option value="CANCELLED">❌ Tasa de Cancelaciones</option>
                            </select>
                        </div>
                    </div>

                    <!-- Custom Date Range Bar (oculto por defecto) -->
                    <div id="hmCustomDateBar" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400 font-bold">Desde:</span>
                            <input type="date" id="hmCustomStartDate" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none" onchange="heatmapAnalyticsModule.onCustomDateChange()">
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400 font-bold">Hasta:</span>
                            <input type="date" id="hmCustomEndDate" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none" onchange="heatmapAnalyticsModule.onCustomDateChange()">
                        </div>
                    </div>
                </div>

                <!-- KPI Summary Cards Bar -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0" id="hmKpiCards">
                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total de Pedidos</span>
                        <div class="flex items-baseline gap-2 mt-0.5">
                            <span class="text-xl font-black text-white" id="hmKpiTotal">--</span>
                            <span class="text-[10px] text-slate-500">en rango</span>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                        <span class="text-[10px] font-black text-indigo-400 uppercase tracking-wider" id="hmKpiDistTitle">Distribución Negocio</span>
                        <div class="flex items-baseline gap-2 mt-0.5">
                            <span class="text-xs font-black text-slate-200" id="hmKpiDistribution">--</span>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                        <span class="text-[10px] font-black text-emerald-400 uppercase tracking-wider" id="hmKpiSuccessTitle">Tasa de Efectividad</span>
                        <div class="flex items-baseline gap-2 mt-0.5">
                            <span class="text-xl font-black text-emerald-400" id="hmKpiSuccessRate">--%</span>
                            <span class="text-[10px] text-slate-500" id="hmKpiCancelled">0 cancelados</span>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                        <span class="text-[10px] font-black text-amber-400 uppercase tracking-wider">Celdas Térmicas</span>
                        <div class="flex items-baseline gap-2 mt-0.5">
                            <span class="text-xl font-black text-amber-400" id="hmKpiDensity">--</span>
                            <span class="text-[10px] text-slate-500">clusters activos</span>
                        </div>
                    </div>
                </div>

                <!-- Main Work Area: Mapa & Panel Lateral -->
                <div class="flex-1 flex flex-col lg:flex-row gap-4 min-h-[480px]">
                    <!-- Map Container -->
                    <div class="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl flex flex-col">
                        <div id="heatmap-map-container" class="w-full h-full min-h-[420px] bg-slate-950 z-0"></div>

                        <!-- Dynamic Loading Overlay -->
                        <div id="hmLoadingOverlay" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-3">
                            <div class="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <p class="text-xs font-bold text-slate-300 tracking-wide">Calculando gradiente térmico de demanda...</p>
                        </div>

                        <!-- Map Heatmap Settings Pill (Bottom Left) -->
                        <div class="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col gap-2 max-w-xs text-xs">
                            <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                                <span class="font-black text-[10px] text-slate-300 uppercase tracking-wider">Ajuste de Calor</span>
                                <span class="text-[10px] text-amber-400 font-mono font-bold" id="hmRadiusVal">35px</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-slate-400 font-bold">Radio:</span>
                                <input type="range" id="hmRadiusSlider" min="10" max="60" value="35" class="w-32 accent-amber-500 cursor-pointer" oninput="heatmapAnalyticsModule.onRadiusSliderChange(this.value)">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-slate-400 font-bold">Difusión:</span>
                                <input type="range" id="hmBlurSlider" min="5" max="40" value="20" class="w-32 accent-indigo-500 cursor-pointer" oninput="heatmapAnalyticsModule.onBlurSliderChange(this.value)">
                            </div>
                        </div>

                        <!-- Map Heatmap Scale Legend (Bottom Right) -->
                        <div class="absolute bottom-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col gap-1.5 text-xs">
                            <span class="font-black text-[10px] text-slate-300 uppercase tracking-wider">Densidad de Pedidos</span>
                            <div class="w-44 h-3.5 rounded-full bg-gradient-to-r from-blue-600 via-emerald-400 via-amber-400 to-rose-600 border border-slate-700 shadow-inner"></div>
                            <div class="flex justify-between text-[9px] text-slate-400 font-mono font-bold">
                                <span>Baja (1)</span>
                                <span>Media</span>
                                <span id="hmLegendMax">Alta</span>
                            </div>
                        </div>
                    </div>

                    <!-- Top 5 Hot Zones & Demographics Sidebar -->
                    <div class="w-full lg:w-80 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col space-y-4 shrink-0 shadow-2xl overflow-y-auto max-h-[600px] lg:max-h-none">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-base">🏆</span>
                                <h3 class="text-xs font-black text-slate-200 uppercase tracking-wider">Top 5 Zonas Calientes</h3>
                            </div>
                            <span class="text-[10px] text-amber-400 font-bold font-mono" id="hmTopZonesCount">0 zonas</span>
                        </div>

                        <!-- Top Zones List Container -->
                        <div id="hmTopZonesList" class="space-y-2.5 flex-1">
                            <p class="text-xs text-slate-500 text-center py-6">Cargando ranking de sectores...</p>
                        </div>

                        <!-- Anti-Doxxing Governance Footer Note -->
                        <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 space-y-1 leading-relaxed">
                            <p class="font-bold text-slate-300 flex items-center gap-1.5">
                                <span>🛡️</span> Privacidad & K-Anonymity
                            </p>
                            <p>Las coordenadas se agregan en celdas de ~110m. No se almacenan ni visualizan nombres, teléfonos ni residencias individuales.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 3. Inicializar Catálogo de Departamentos
        heatmapAnalyticsModule.populateGeoSelectors();

        // 4. Inicializar Mapa Leaflet
        setTimeout(() => {
            heatmapAnalyticsModule.initMap();
            heatmapAnalyticsModule.loadData();
        }, 100);
    },

    // ─── 3. INICIALIZACIÓN DEL MAPA ───────────────────────────────────────────
    initMap: () => {
        const container = document.getElementById('heatmap-map-container');
        if (!container) return;

        try {
            // Centro por defecto: Managua, Nicaragua
            const defaultCenter = [12.1364, -86.2514];
            const defaultZoom = 12;

            heatmapAnalyticsModule.map = L.map('heatmap-map-container', {
                center: defaultCenter,
                zoom: defaultZoom,
                zoomControl: false
            });

            // Control de Zoom moderno en esquina superior derecha
            L.control.zoom({ position: 'topright' }).addTo(heatmapAnalyticsModule.map);

            // Capa de Mapa Base: OSM Raster Standard (Zero API Key, Zero Cost)
            // DECISIÓN ARQUITECTÓNICA: El módulo Heatmap usa OSM Raster (no MapLibre GL WebGL)
            // porque L.maplibreGL crea un canvas WebGL que renderiza ENCIMA del canvas 2D de
            // leaflet-heat, ocultando la capa térmica. El basemap es contexto secundario;
            // la visualización primaria ES la capa de calor.
            // liveMap.js continúa usando OpenFreeMap Liberty (correcto para su caso de uso).
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
            }).addTo(heatmapAnalyticsModule.map);
            console.log('[HEATMAP] OSM Raster basemap initialized (Zero API Key — leaflet-heat compatible).');

            // Evento para adaptar el radio al zoom del mapa
            heatmapAnalyticsModule.map.on('zoomend', () => {
                const currentZoom = heatmapAnalyticsModule.map.getZoom();
                if (heatmapAnalyticsModule.heatLayer) {
                    // Escalar el radio suavemente con el zoom
                    const adaptiveRadius = Math.max(12, Math.min(55, heatmapAnalyticsModule.filters.radius * (currentZoom / 12)));
                    heatmapAnalyticsModule.heatLayer.setOptions({ radius: adaptiveRadius });
                }
            });

            console.log('[HEATMAP] Leaflet Map & Tiles inicializados correctamente.');
        } catch (err) {
            console.error('[HEATMAP] Error inicializando Leaflet Map:', err);
        }
    },

    // ─── 4. CARGA DE DATOS (CLOUD FUNCTION CALLABLE) ──────────────────────────
    loadData: async (forceRefresh = false) => {
        heatmapAnalyticsModule.showLoading(true);

        const cacheKey = JSON.stringify({
            tenantId: heatmapAnalyticsModule.filters.tenantId,
            timeRange: heatmapAnalyticsModule.filters.timeRange,
            startDate: heatmapAnalyticsModule.filters.startDate,
            endDate: heatmapAnalyticsModule.filters.endDate,
            businessLine: heatmapAnalyticsModule.filters.businessLine,
            perspective: heatmapAnalyticsModule.filters.perspective,
            metric: heatmapAnalyticsModule.filters.metric,
            departmentId: heatmapAnalyticsModule.filters.departmentId,
            municipalityId: heatmapAnalyticsModule.filters.municipalityId,
            merchantId: heatmapAnalyticsModule.filters.merchantId
        });

        // 1. Revisar Caché local si no es refresh forzado
        if (!forceRefresh && heatmapAnalyticsModule.cache.has(cacheKey)) {
            const cached = heatmapAnalyticsModule.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < heatmapAnalyticsModule.CACHE_TTL_MS) {
                console.log('[HEATMAP] Datos servidos desde caché en memoria local (TTL activo).');
                heatmapAnalyticsModule.applyData(cached.data);
                heatmapAnalyticsModule.showLoading(false);
                return;
            }
        }

        try {
            const payload = {
                tenantId: heatmapAnalyticsModule.filters.tenantId,
                timeRange: heatmapAnalyticsModule.filters.timeRange,
                startDate: heatmapAnalyticsModule.filters.startDate || undefined,
                endDate: heatmapAnalyticsModule.filters.endDate || undefined,
                businessLine: heatmapAnalyticsModule.filters.businessLine,
                perspective: heatmapAnalyticsModule.filters.perspective,
                metric: heatmapAnalyticsModule.filters.metric,
                departmentId: heatmapAnalyticsModule.filters.departmentId !== 'ALL' ? heatmapAnalyticsModule.filters.departmentId : undefined,
                municipalityId: heatmapAnalyticsModule.filters.municipalityId !== 'ALL' ? heatmapAnalyticsModule.filters.municipalityId : undefined,
                merchantId: heatmapAnalyticsModule.filters.merchantId !== 'ALL' ? heatmapAnalyticsModule.filters.merchantId : undefined
            };

            const response = await functionsService.getHeatmapData(payload);

            if (response && response.success) {
                // Guardar en caché
                heatmapAnalyticsModule.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                heatmapAnalyticsModule.applyData(response);
            } else {
                throw new Error('Respuesta inválida del servidor.');
            }
        } catch (err) {
            console.error('[HEATMAP] Error al consultar datos térmicos:', err);
            if (typeof toast !== 'undefined' && toast.show) {
                toast.show(`Error al cargar heatmap: ${err.message || 'Error desconocido'}`, 'error');
            }
            heatmapAnalyticsModule.renderEmptyState('Error al cargar datos del servidor');
        } finally {
            heatmapAnalyticsModule.showLoading(false);
        }
    },

    // ─── 5. APLICACIÓN DE DATOS & RENDERIZADO DE CAPAS ────────────────────────
    applyData: (data) => {
        heatmapAnalyticsModule.currentData = data;
        const points = data.points || [];
        const summary = data.summary || {};

        // 1. Actualizar KPIs
        const totalEl = document.getElementById('hmKpiTotal');
        if (totalEl) totalEl.textContent = Number(summary.totalOrders || 0).toLocaleString();

        const distEl = document.getElementById('hmKpiDistribution');
        if (distEl) {
            if (heatmapAnalyticsModule.currentMode === 'MERCHANT') {
                const activeZones = summary.topZones ? summary.topZones.length : 0;
                distEl.innerHTML = `📍 <span class="text-indigo-400 font-bold">${activeZones} cuadrículas</span>`;
            } else {
                const total = summary.totalOrders || 1;
                const comPct = Math.round(((summary.commerceOrders || 0) / total) * 100);
                const xyPct = Math.round(((summary.xToYOrders || 0) / total) * 100);
                distEl.innerHTML = `🏪 <span class="text-indigo-400">${comPct}%</span> • 🛵 <span class="text-emerald-400">${xyPct}%</span>`;
            }
        }

        const successRateEl = document.getElementById('hmKpiSuccessRate');
        if (successRateEl) {
            if (heatmapAnalyticsModule.currentMode === 'MERCHANT') {
                const topZone = summary.topZones && summary.topZones.length > 0 ? summary.topZones[0] : null;
                let conc = '--';
                if (topZone) {
                    if (topZone.percentage > 50) conc = '🔥 Alta';
                    else if (topZone.percentage < 25) conc = '🟡 Distribuida';
                    else conc = '📈 Moderada';
                }
                successRateEl.textContent = conc;
            } else {
                const total = summary.totalOrders || 0;
                const completed = summary.completedOrders || 0;
                const rate = total > 0 ? Math.round((completed / total) * 100) : 100;
                successRateEl.textContent = `${rate}%`;
            }
        }

        const cancelledEl = document.getElementById('hmKpiCancelled');
        if (cancelledEl) {
            if (heatmapAnalyticsModule.currentMode === 'MERCHANT') {
                const topZone = summary.topZones && summary.topZones.length > 0 ? summary.topZones[0] : null;
                cancelledEl.textContent = topZone ? topZone.zoneName : '';
            } else {
                cancelledEl.textContent = `${summary.cancelledOrders || 0} cancelaciones`;
            }
        }

        const densityEl = document.getElementById('hmKpiDensity');
        if (densityEl) {
            densityEl.textContent = `${summary.uniquePointsCount || points.length}`;
        }

        const legendMaxEl = document.getElementById('hmLegendMax');
        if (legendMaxEl) {
            legendMaxEl.textContent = `Alta (${summary.maxDensityCell || 1}+)`;
        }

        // 2. Renderizar Top 5 Zonas
        const topZonesTitle = document.querySelector('#hmTopZonesCount')?.previousElementSibling?.querySelector('h3');
        if (topZonesTitle) {
            topZonesTitle.textContent = heatmapAnalyticsModule.currentMode === 'MERCHANT' ? '📈 TOP 5 ZONAS DE DEMANDA' : 'TOP 5 ZONAS CALIENTES';
        }
        heatmapAnalyticsModule.renderTopZones(summary.topZones || []);

        // 3. Renderizar Capa de Calor en el Mapa
        heatmapAnalyticsModule.renderHeatLayer(points);
    },

    // ─── 6. RENDERIZADO DE LA CAPA TÉRMICA LEAFLET ────────────────────────────
    renderHeatLayer: (points) => {
        if (!heatmapAnalyticsModule.map) return;

        // Remover capa existente
        if (heatmapAnalyticsModule.heatLayer) {
            heatmapAnalyticsModule.map.removeLayer(heatmapAnalyticsModule.heatLayer);
            heatmapAnalyticsModule.heatLayer = null;
        }

        if (!points || points.length === 0) {
            console.log('[HEATMAP] No hay puntos térmicos para los filtros seleccionados.');
            return;
        }

        // PASO 1: Establecer el viewport ANTES de crear el heat layer.
        // Razón: si se llama fitBounds() DESPUÉS de agregar L.heatLayer, la animación
        // de zoom desincroniza el canvas 2D de leaflet-heat del viewport CSS transformado,
        // haciendo la capa de calor invisible. animate:false elimina esta interferencia.
        const latLngs = points.map(p => [p.lat, p.lng]);
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
            heatmapAnalyticsModule.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
        }

        // PASO 2: Crear el heat layer con el viewport ya establecido
        const heatData = points.map(p => [p.lat, p.lng, p.weight]);

        if (typeof L.heatLayer === 'function') {
            heatmapAnalyticsModule.heatLayer = L.heatLayer(heatData, {
                radius: heatmapAnalyticsModule.filters.radius,
                blur: heatmapAnalyticsModule.filters.blur,
                maxZoom: 11,
                minOpacity: 0.5,
                max: 1.0,
                gradient: {
                    0.1: '#3b82f6', // Azul visible desde el 10%
                    0.3: '#10b981', // Verde esmeralda
                    0.5: '#eab308', // Amarillo
                    0.7: '#f97316', // Naranja
                    1.0: '#ef4444'  // Rojo intenso
                }
            }).addTo(heatmapAnalyticsModule.map);

            console.log('[HEATMAP] Heat layer renderizado:', points.length, 'celdas térmicas.');
        } else {
            console.error('[HEATMAP] Error: Plugin L.heatLayer no disponible en el runtime.');
        }
    },

    // ─── 7. RENDERIZADO DEL TOP 5 DE ZONAS CALIENTES ─────────────────────────
    renderTopZones: (topZones) => {
        const listEl = document.getElementById('hmTopZonesList');
        const countEl = document.getElementById('hmTopZonesCount');
        if (!listEl) return;

        if (countEl) countEl.textContent = `${topZones.length} sectores`;

        if (!topZones || topZones.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-8 space-y-2">
                    <span class="text-3xl block">📍</span>
                    <p class="text-xs text-slate-400 font-bold">Sin datos para este periodo</p>
                    <p class="text-[10px] text-slate-500">Prueba ampliando el rango de fechas o cambiando los filtros.</p>
                </div>
            `;
            return;
        }

        let html = '';
        topZones.forEach((zone, index) => {
            const rank = index + 1;
            const badgeColor = rank === 1 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                               rank === 2 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                               rank === 3 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                            'bg-slate-800 text-slate-300 border-slate-700';

            html += `
                <div class="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 hover:border-slate-700 transition">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${badgeColor}">
                                #${rank}
                            </span>
                            <span class="text-xs font-bold text-slate-200 truncate">${zone.zoneName}</span>
                        </div>
                        <span class="text-xs font-mono font-black text-amber-400">${zone.orderCount} ped</span>
                    </div>

                    <div class="flex items-center justify-between text-[10px] text-slate-400">
                        <span>${zone.municipality}</span>
                        <span>${zone.percentage}% ${heatmapAnalyticsModule.currentMode === 'MERCHANT' ? 'participación' : 'del total'}</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full" style="width: ${Math.min(100, zone.percentage * 2)}%"></div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    },

    // ─── 8. INTERACCIÓN CON FILTROS & SELECTORES ──────────────────────────────
    switchMode: (mode) => {
        heatmapAnalyticsModule.currentMode = mode;
        const btnGlobal = document.getElementById('hmBtnModeGlobal');
        const btnMerchant = document.getElementById('hmBtnModeMerchant');
        const persContainer = document.getElementById('hmFilterPerspectiveContainer');
        const merchContainer = document.getElementById('hmFilterMerchantContainer');
        const kpiDistTitle = document.getElementById('hmKpiDistTitle');
        const kpiSuccessTitle = document.getElementById('hmKpiSuccessTitle');
        
        if (mode === 'MERCHANT') {
            if (btnGlobal) btnGlobal.className = 'px-4 py-1.5 text-xs font-bold rounded-md text-slate-400 hover:text-slate-200';
            if (btnMerchant) btnMerchant.className = 'px-4 py-1.5 text-xs font-bold rounded-md bg-indigo-600 text-white shadow';
            
            if (persContainer) persContainer.classList.add('hidden');
            if (merchContainer) merchContainer.classList.remove('hidden');
            
            if (kpiDistTitle) kpiDistTitle.textContent = 'Zonas Activas';
            if (kpiSuccessTitle) kpiSuccessTitle.textContent = 'Concentración';
            
            // Forzar perspectiva a DESTINATION
            const persSelect = document.getElementById('hmFilterPerspective');
            if (persSelect) persSelect.value = 'DESTINATION';
            heatmapAnalyticsModule.filters.perspective = 'DESTINATION';
            
            heatmapAnalyticsModule.populateMerchantSelector();
            
        } else {
            if (btnGlobal) btnGlobal.className = 'px-4 py-1.5 text-xs font-bold rounded-md bg-indigo-600 text-white shadow';
            if (btnMerchant) btnMerchant.className = 'px-4 py-1.5 text-xs font-bold rounded-md text-slate-400 hover:text-slate-200';
            
            if (persContainer) persContainer.classList.remove('hidden');
            if (merchContainer) merchContainer.classList.add('hidden');
            
            if (kpiDistTitle) kpiDistTitle.textContent = 'Distribución Negocio';
            if (kpiSuccessTitle) kpiSuccessTitle.textContent = 'Tasa Efectividad';
            
            const merchSelect = document.getElementById('hmFilterMerchant');
            if (merchSelect) merchSelect.value = 'ALL';
            heatmapAnalyticsModule.filters.merchantId = 'ALL';
        }
        
        heatmapAnalyticsModule.loadData();
    },

    populateMerchantSelector: async () => {
        const select = document.getElementById('hmFilterMerchant');
        if (!select || select.options.length > 1) return;
        
        try {
            let stores = [];
            if (window.storesMap && window.storesMap.size > 0) {
                stores = Array.from(window.storesMap.values()).map(s => ({ id: s.id || s.uid, name: s.name || s.businessName }));
            } else if (typeof db !== 'undefined') {
                const snapshot = await db.collection('businesses').get();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const status = (data.status || data.estado || '').toUpperCase();
                    // Evitar comercios inactivos, borrados o cuentas de testing explícitas
                    if (data.isDeleted === true || status === 'INACTIVE' || status === 'DELETED') return;
                    
                    const name = data.name || data.businessName || 'Comercio';
                    if (name.toLowerCase().includes('certificación') || name.toLowerCase().includes('prueba')) return;
                    
                    stores.push({ id: doc.id, name });
                });
            }
            
            // Eliminar duplicados basados en el nombre
            const uniqueStores = [];
            const seenNames = new Set();
            stores.forEach(s => {
                if (!seenNames.has(s.name)) {
                    seenNames.add(s.name);
                    uniqueStores.push(s);
                }
            });
            stores = uniqueStores;
            
            stores.sort((a, b) => a.name.localeCompare(b.name));
            let html = '<option value="ALL">Seleccionar Comercio...</option>';
            stores.forEach(s => {
                html += `<option value="${s.id}">${s.name}</option>`;
            });
            select.innerHTML = html;
        } catch (err) {
            console.error('[HEATMAP] Error cargando comercios:', err);
        }
    },

    populateGeoSelectors: () => {
        const deptSelect = document.getElementById('hmFilterDepartment');
        if (!deptSelect || !window.GeoCatalog) return;

        const depts = window.GeoCatalog.NICARAGUA_DEPARTMENTS || [];
        let deptOptions = '<option value="ALL">Todo el País</option>';
        depts.forEach(d => {
            deptOptions += `<option value="${d.id}">${d.name}</option>`;
        });
        deptSelect.innerHTML = deptOptions;
    },

    onDepartmentChange: (deptId) => {
        heatmapAnalyticsModule.filters.departmentId = deptId;
        heatmapAnalyticsModule.filters.municipalityId = 'ALL';

        const muniSelect = document.getElementById('hmFilterMunicipality');
        if (muniSelect && window.GeoCatalog) {
            if (deptId === 'ALL') {
                muniSelect.innerHTML = '<option value="ALL">Todos los Municipios</option>';
            } else {
                const munis = window.GeoCatalog.getMunicipalities(deptId) || [];
                let muniOptions = '<option value="ALL">Todos los Municipios</option>';
                munis.forEach(m => {
                    muniOptions += `<option value="${m.id}">${m.name}</option>`;
                });
                muniSelect.innerHTML = muniOptions;
            }
        }

        heatmapAnalyticsModule.loadData();
    },

    onFilterChange: (field, value) => {
        heatmapAnalyticsModule.filters[field] = value;
        heatmapAnalyticsModule.loadData();
    },

    onTimeRangeChange: (value) => {
        heatmapAnalyticsModule.filters.timeRange = value;
        const customBar = document.getElementById('hmCustomDateBar');
        if (value === 'custom') {
            if (customBar) customBar.classList.remove('hidden');
        } else {
            if (customBar) customBar.classList.add('hidden');
            heatmapAnalyticsModule.filters.startDate = '';
            heatmapAnalyticsModule.filters.endDate = '';
            heatmapAnalyticsModule.loadData();
        }
    },

    onCustomDateChange: () => {
        const start = document.getElementById('hmCustomStartDate')?.value;
        const end = document.getElementById('hmCustomEndDate')?.value;
        if (start && end) {
            heatmapAnalyticsModule.filters.startDate = start;
            heatmapAnalyticsModule.filters.endDate = end;
            heatmapAnalyticsModule.loadData();
        }
    },

    onRadiusSliderChange: (val) => {
        heatmapAnalyticsModule.filters.radius = parseInt(val, 10) || 25;
        const label = document.getElementById('hmRadiusVal');
        if (label) label.textContent = `${val}px`;
        if (heatmapAnalyticsModule.heatLayer) {
            heatmapAnalyticsModule.heatLayer.setOptions({ radius: heatmapAnalyticsModule.filters.radius });
        }
    },

    onBlurSliderChange: (val) => {
        heatmapAnalyticsModule.filters.blur = parseInt(val, 10) || 15;
        if (heatmapAnalyticsModule.heatLayer) {
            heatmapAnalyticsModule.heatLayer.setOptions({ blur: heatmapAnalyticsModule.filters.blur });
        }
    },

    // ─── 9. EXPORTACIÓN A FORMATO CSV ─────────────────────────────────────────
    exportToCsv: () => {
        if (!heatmapAnalyticsModule.currentData || !heatmapAnalyticsModule.currentData.summary) {
            if (typeof toast !== 'undefined' && toast.show) {
                toast.show('No hay datos disponibles para exportar.', 'warning');
            }
            return;
        }

        const summary = heatmapAnalyticsModule.currentData.summary;
        const topZones = summary.topZones || [];
        const points = heatmapAnalyticsModule.currentData.points || [];
        const filters = heatmapAnalyticsModule.filters;
        
        // Determinar nombre del comercio si no es ALL
        let merchantName = "Global (Todos los Comercios)";
        if (filters.merchantId && filters.merchantId !== 'ALL') {
            const select = document.getElementById('hmFilterMerchant');
            if (select && select.options[select.selectedIndex]) {
                merchantName = select.options[select.selectedIndex].text;
            } else {
                merchantName = filters.merchantId;
            }
        }

        // Determinar nombre del periodo
        let timeRangeText = filters.timeRange;
        const selectTime = document.getElementById('hmFilterTimeRange');
        if (selectTime && selectTime.options[selectTime.selectedIndex]) {
            timeRangeText = selectTime.options[selectTime.selectedIndex].text;
        }

        let csvContent = '\uFEFF'; // BOM para asegurar UTF-8 en Excel
        const dateStr = new Date().toLocaleString('es-NI');

        // 1. ENCABEZADO Y CONTEXTO DE FILTROS
        csvContent += '--- REPORTE DE INTELIGENCIA DE DEMANDA GEOESPACIAL (BlueSystem Enterprise) ---\n';
        csvContent += `Fecha de Generacion:, "${dateStr}"\n`;
        csvContent += `Modo de Analisis:, "${filters.perspective === 'DESTINATION' ? 'Inteligencia de Consumo (Destino)' : 'Global'}"\n`;
        csvContent += `Comercio Especifico:, "${merchantName}"\n`;
        csvContent += `Periodo Analizado:, "${timeRangeText}"\n`;
        csvContent += `Departamento:, "${filters.departmentId === 'ALL' ? 'Todo el Pais' : filters.departmentId}"\n`;
        csvContent += `Municipio:, "${filters.municipalityId === 'ALL' ? 'Todos los Municipios' : filters.municipalityId}"\n`;
        const totalPedidos = summary.totalOrders || ((summary.totalCompleted || 0) + (summary.totalActive || 0) + (summary.totalCancelled || 0));
        csvContent += `Total Pedidos Analizados:, ${totalPedidos}\n\n`;

        // 2. RESUMEN DE ZONAS CALIENTES (TOP SECTORES)
        csvContent += '--- RESUMEN POR ZONAS (TOP DEMANDA) ---\n';
        csvContent += 'Ranking,Departamento,Municipio,Zona/Sector,Pedidos_Comercio,Envios_XY,Total_Pedidos,Participacion\n';
        
        if (topZones.length === 0) {
            csvContent += 'Sin datos en este rango de fechas\n';
        } else {
            topZones.forEach((z, idx) => {
                const row = [
                    idx + 1,
                    `"${(z.department || '').replace(/"/g, '""')}"`,
                    `"${(z.municipality || '').replace(/"/g, '""')}"`,
                    `"${(z.zoneName || '').replace(/"/g, '""')}"`,
                    z.commerceCount || 0,
                    z.xToYCount || 0,
                    z.orderCount || 0,
                    `${z.percentage}%`
                ];
                csvContent += row.join(',') + '\n';
            });
        }
        
        csvContent += '\n';

        // 3. DESGLOSE DE CELDAS TERMICAS (COORDENADAS GPS)
        csvContent += '--- DESGLOSE DE MATRIZ DE CALOR (CELDAS TERMICAS) ---\n';
        csvContent += 'Latitud,Longitud,Volumen_Pedidos,Intensidad_Matematica,Estado_Dominante,Ver_En_Mapa\n';

        if (points.length === 0) {
            csvContent += 'Sin celdas termicas generadas\n';
        } else {
            points.forEach((p) => {
                const row = [
                    p.lat,
                    p.lng,
                    p.count || 0,
                    p.weight || 0,
                    p.statusGroup || 'COMPLETED',
                    `"https://maps.google.com/?q=${p.lat},${p.lng}"`
                ];
                csvContent += row.join(',') + '\n';
            });
        }

        const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = document.createElement('a');
        const fileDateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `reporte_zonas_calientes_${fileDateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof toast !== 'undefined' && toast.show) {
            toast.show('Reporte CSV exportado exitosamente.', 'success');
        }
    },

    // ─── 10. EXPORTACIÓN A FORMATO PDF ─────────────────────────────────────────
    exportToPdf: () => {
        if (!heatmapAnalyticsModule.currentData || !heatmapAnalyticsModule.currentData.summary) {
            if (typeof toast !== 'undefined' && toast.show) {
                toast.show('No hay datos disponibles para exportar a PDF.', 'warning');
            }
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            if (typeof toast !== 'undefined' && toast.show) {
                toast.show('La libreria PDF no esta cargada en el sistema.', 'error');
            }
            return;
        }

        const summary = heatmapAnalyticsModule.currentData.summary;
        const topZones = summary.topZones || [];
        const points = heatmapAnalyticsModule.currentData.points || [];
        const filters = heatmapAnalyticsModule.filters;

        // Determinar nombre del comercio si no es ALL
        let merchantName = "Global (Todos los Comercios)";
        if (filters.merchantId && filters.merchantId !== 'ALL') {
            const select = document.getElementById('hmFilterMerchant');
            if (select && select.options[select.selectedIndex]) {
                merchantName = select.options[select.selectedIndex].text;
            } else {
                merchantName = filters.merchantId;
            }
        }

        let timeRangeText = filters.timeRange;
        const selectTime = document.getElementById('hmFilterTimeRange');
        if (selectTime && selectTime.options[selectTime.selectedIndex]) {
            timeRangeText = selectTime.options[selectTime.selectedIndex].text;
        }
        
        const totalPedidos = summary.totalOrders || ((summary.totalCompleted || 0) + (summary.totalActive || 0) + (summary.totalCancelled || 0));
        const dateStr = new Date().toLocaleString('es-NI');

        const doc = new window.jspdf.jsPDF('landscape');
        
        // Colores y tipografía
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("Reporte de Inteligencia de Demanda Geoespacial", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Fecha de Generacion: ${dateStr}`, 14, 28);
        doc.text(`Modo de Analisis: ${filters.perspective === 'DESTINATION' ? 'Inteligencia de Consumo (Destino)' : 'Global'}`, 14, 34);
        doc.text(`Comercio Especifico: ${merchantName}`, 14, 40);
        
        doc.text(`Periodo Analizado: ${timeRangeText}`, 150, 28);
        doc.text(`Departamento/Municipio: ${filters.departmentId === 'ALL' ? 'Todos' : filters.departmentId} / ${filters.municipalityId === 'ALL' ? 'Todos' : filters.municipalityId}`, 150, 34);
        doc.text(`Total Pedidos Analizados: ${totalPedidos}`, 150, 40);

        // Tabla 1: Resumen
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Resumen por Zonas (Top Demanda)", 14, 52);

        const table1Data = topZones.map((z, idx) => [
            idx + 1,
            z.department || '',
            z.municipality || '',
            z.zoneName || '',
            z.commerceCount || 0,
            z.xToYCount || 0,
            z.orderCount || 0,
            `${z.percentage}%`
        ]);

        doc.autoTable({
            startY: 56,
            head: [['Rnk', 'Depto', 'Municipio', 'Zona/Sector', 'Pedidos Comer.', 'Envios X->Y', 'Total', 'Particip.']],
            body: table1Data,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 9 }
        });

        // Tabla 2: Desglose Celdas
        let finalY = doc.lastAutoTable.finalY || 56;
        if (finalY > 160) {
            doc.addPage();
            finalY = 20;
        } else {
            finalY += 15;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Desglose de Matriz de Calor (Celdas Termicas)", 14, finalY);

        const table2Data = points.map((p) => [
            p.lat.toFixed(6),
            p.lng.toFixed(6),
            p.count || 0,
            (p.weight || 0).toFixed(3),
            p.statusGroup || 'COMPLETED',
            '' 
        ]);

        doc.autoTable({
            startY: finalY + 4,
            head: [['Latitud', 'Longitud', 'Volumen', 'Intensidad', 'Est. Dominante', 'Enlace Google Maps']],
            body: table2Data,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 },
            didDrawCell: function(data) {
                // Dibujar enlace real azul encima de la celda vacía
                if (data.section === 'body' && data.column.index === 5) {
                    const rowData = points[data.row.index];
                    const url = `https://maps.google.com/?q=${rowData.lat},${rowData.lng}`;
                    doc.setTextColor(37, 99, 235);
                    doc.textWithLink('Ver en Google Maps', data.cell.x + 2, data.cell.y + (data.cell.height / 2) + 1.5, { url: url });
                }
            }
        });

        const fileDateStr = new Date().toISOString().split('T')[0];
        doc.save(`reporte_zonas_calientes_${fileDateStr}.pdf`);
        
        if (typeof toast !== 'undefined' && toast.show) {
            toast.show('Reporte PDF exportado exitosamente.', 'success');
        }
    },

    // ─── 10. CENTRAR VISTA CARTOGRÁFICA ───────────────────────────────────────
    fitMapBounds: () => {
        if (!heatmapAnalyticsModule.map || !heatmapAnalyticsModule.currentData) return;

        const points = heatmapAnalyticsModule.currentData.points || [];
        if (points.length === 0) {
            heatmapAnalyticsModule.map.setView([12.1364, -86.2514], 12);
            return;
        }

        const latLngs = points.map(p => [p.lat, p.lng]);
        const bounds = L.latLngBounds(latLngs);
        heatmapAnalyticsModule.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    },

    // ─── 11. ESTADOS DE UI (SPINNER & VACÍO) ──────────────────────────────────
    showLoading: (show) => {
        heatmapAnalyticsModule.isLoading = show;
        const overlay = document.getElementById('hmLoadingOverlay');
        if (overlay) {
            if (show) overlay.classList.remove('hidden');
            else overlay.classList.add('hidden');
        }
    },

    renderEmptyState: (msg = 'Sin datos disponibles') => {
        const listEl = document.getElementById('hmTopZonesList');
        if (listEl) {
            listEl.innerHTML = `
                <div class="text-center py-8 space-y-2">
                    <span class="text-3xl block">⚠️</span>
                    <p class="text-xs text-rose-400 font-bold">${msg}</p>
                    <button onclick="heatmapAnalyticsModule.loadData(true)" class="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-bold transition">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }
};

window.heatmapAnalyticsModule = heatmapAnalyticsModule;
