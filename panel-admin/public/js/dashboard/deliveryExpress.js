/**
 * DeliveryExpressModule — Enterprise X→Y Point-to-Point Logistics & Dynamic Pricing Engine
 * BlueSystem Delivery Enterprise v6.2.0
 * 
 * SSOT Master: /deliveryTrips/{tripId}
 * Cartographic Engine: Leaflet + CartoDB Voyager (0 Maps Cost)
 * Pricing Configuration: /system_config/global.xToYPricing (ADR-026 Frozen Core)
 * Audit Trail: /audit_events
 */

const deliveryExpressModule = {
    // 1. Estado y Caché
    activeSection: 'trips', // 'trips' | 'pricing'
    trips: [],              // Raw trips from /deliveryTrips
    resolvedTrips: [],      // Processed with OperationalStateResolver
    unsubscribeTrips: null,
    unsubscribeCourierGps: null,
    activeGpsCourierId: null,
    
    // Cachés en memoria (Zero N+1)
    couriersCache: new Map(),       // uid -> { id, name, phone, plate, isOnline, isAvailable, ... }
    ordersMirrorCache: new Map(),   // tripId -> orderData
    isLoadingTrips: false,
    
    // Filtros
    filterStatus: 'ALL',
    filterCourier: 'ALL',
    filteredTrips: [],
    searchQuery: '',
    dateFrom: '',
    dateTo: '',

    // Paginación (10 encomiendas por página)
    currentPage: 1,
    pageSize: 10,
    
    // Detalle seleccionado
    selectedTrip: null,
    detailMap: null,
    detailPolyline: null,
    detailMarkers: [],
    courierMarker: null,
    courierLivePolyline: null,

    // Modal de Asignación Administrativa
    assignModalTripId: null,
    assignModalSearchQuery: '',
    selectedAssignCourierId: null,
    isExecutingAssignment: false,

    // Configuración de Tarifas (ADR-026 FROZEN CORE — INMUTABLE)
    pricingConfig: {
        baseFee: 35.0,
        pricePerKm: 15.0, // Canónico Maestro
        perKmRate: 15.0,  // Alias Legacy Retrocompatible
        calculationPolicy: 'KM_BLOCK_2DEC',
        version: 'system_config_global_v1'
    },
    isSavingPricing: false,
    bankAccounts: [],
    isLoadingBankAccounts: false,

    // Comprueba si el usuario autenticado tiene permisos de escritura sobre tarifas o asignación
    canModifyPricing: () => {
        const role = (window.AuthReadyGate?.role || '').toLowerCase();
        const claims = window.AuthReadyGate?.claims || {};
        return role === 'super_admin' || role === 'admin' || role === 'platform_admin' ||
               claims.admin === true || claims.isSuperAdmin === true || claims.isPlatformAdmin === true;
    },

    canAdminAssign: () => {
        const role = (window.AuthReadyGate?.role || '').toLowerCase();
        const claims = window.AuthReadyGate?.claims || {};
        return role === 'super_admin' || role === 'admin' || role === 'platform_admin' ||
               claims.admin === true || claims.isSuperAdmin === true || claims.isPlatformAdmin === true;
    },

    // 2. Render Principal
    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header Principal con Tabs de Navegación -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-2xl bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 text-indigo-400">⚡</span>
                            <div>
                                <h2 class="text-xl font-black text-white flex items-center gap-2">
                                    Delivery Express — Punto A → Punto B (X→Y)
                                </h2>
                                <p class="text-xs text-slate-400">Monitoreo vial en tiempo real, trazabilidad de encomiendas y motor canónico de tarifas por distancia</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button id="btn-sec-trips" onclick="deliveryExpressModule.switchSection('trips')" class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${deliveryExpressModule.activeSection === 'trips' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
                            <span>📦</span> Encomiendas en Vivo
                        </button>
                        <button id="btn-sec-transfers" onclick="deliveryExpressModule.switchSection('transfers')" class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${deliveryExpressModule.activeSection === 'transfers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
                            <span>💳</span> Verificación Transferencias <span id="badge-pending-transfers" class="hidden px-1.5 py-0.5 text-[10px] bg-amber-500 text-black font-black rounded-full">0</span>
                        </button>
                        <button id="btn-sec-pricing" onclick="deliveryExpressModule.switchSection('pricing')" class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${deliveryExpressModule.activeSection === 'pricing' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
                            <span>⚙️</span> Configuración de Tarifas
                        </button>
                        <button id="btn-sec-bank" onclick="deliveryExpressModule.switchSection('bank_accounts')" class="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${deliveryExpressModule.activeSection === 'bank_accounts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
                            <span>🏦</span> Cuentas Bancarias
                        </button>
                    </div>
                </div>

                <!-- Sección 1: Encomiendas X→Y -->
                <div id="section-trips" class="${deliveryExpressModule.activeSection === 'trips' ? 'block' : 'hidden'} space-y-6">
                    <!-- Nota Aclaratoria de Operaciones en Vivo -->
                    <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                        <div class="flex items-center gap-2">
                            <span>⚡</span>
                            <span><strong>Operaciones en Vivo:</strong> Control Tower activo sincronizado con <code class="text-indigo-400 font-mono">/deliveryTrips</code> en tiempo real.</span>
                        </div>
                        <span class="text-[11px] text-slate-500">Normalizador Operacional Canónico v6.2.0</span>
                    </div>

                    <!-- Tarjetas de Métricas en Vivo -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Encomiendas</p>
                                <h3 id="kpi-total" class="text-2xl font-black text-white mt-1">0</h3>
                                <span class="text-[10px] text-slate-500">Muestra activa sincronizada</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">📦</div>
                        </div>
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400">En Tránsito / Activas</p>
                                <h3 id="kpi-active" class="text-2xl font-black text-amber-400 mt-1">0</h3>
                                <span class="text-[10px] text-slate-500">Asignadas o en ruta</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">🛵</div>
                        </div>
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-sky-400">Por Asignar</p>
                                <h3 id="kpi-pending" class="text-2xl font-black text-sky-400 mt-1">0</h3>
                                <span class="text-[10px] text-slate-500">Esperando repartidor</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-xl">⏳</div>
                        </div>
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Tarifas Acumuladas</p>
                                <h3 id="kpi-revenue" class="text-2xl font-black text-emerald-400 mt-1">C$ 0.00</h3>
                                <span id="kpi-revenue-subtitle" class="text-[10px] text-slate-500">Total calculado SSOT</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">💰</div>
                        </div>
                    </div>

                    <!-- Barra de Filtros, Rango de Fechas y Búsqueda -->
                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                            <!-- Input de Búsqueda -->
                            <div class="lg:col-span-4 relative">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">🔍</span>
                                <input type="text" id="trip-search-input" oninput="deliveryExpressModule.onSearchChange(this.value)" placeholder="Buscar por ID, cliente, destinatario, teléfono..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition">
                            </div>

                            <!-- Filtro de Estado -->
                            <div class="lg:col-span-2">
                                <select id="trip-status-filter" onchange="deliveryExpressModule.onFilterStatusChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition">
                                    <option value="ALL">Todos los Estados</option>
                                    <option value="PENDING">Pendientes</option>
                                    <option value="ASSIGNED">Asignados</option>
                                    <option value="IN_TRANSIT">En Tránsito</option>
                                    <option value="COMPLETED">Entregados</option>
                                    <option value="CANCELLED">Cancelados</option>
                                </select>
                            </div>

                            <!-- Filtro de Motorizados (Select Dinámico) -->
                            <div class="lg:col-span-3">
                                <select id="trip-courier-filter" onchange="deliveryExpressModule.onFilterCourierChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition">
                                    <option value="ALL">🛵 Todos los Motorizados</option>
                                </select>
                            </div>

                            <!-- Filtros de Fecha Desde / Hasta con Icono de Calendario Clickable -->
                            <div class="lg:col-span-3 flex items-center gap-1.5">
                                <div class="relative flex items-center flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 transition cursor-pointer" onclick="document.getElementById('trip-date-from')?.showPicker?.()" title="Seleccionar Fecha Desde">
                                    <span class="text-indigo-400 text-xs mr-1 select-none">📅</span>
                                    <input type="date" id="trip-date-from" onchange="deliveryExpressModule.onDateChange()" onclick="event.stopPropagation(); this.showPicker?.()" style="color-scheme: dark;" class="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer w-full p-0" title="Fecha Desde">
                                </div>
                                <span class="text-slate-500 text-xs select-none">→</span>
                                <div class="relative flex items-center flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 transition cursor-pointer" onclick="document.getElementById('trip-date-to')?.showPicker?.()" title="Seleccionar Fecha Hasta">
                                    <span class="text-indigo-400 text-xs mr-1 select-none">📅</span>
                                    <input type="date" id="trip-date-to" onchange="deliveryExpressModule.onDateChange()" onclick="event.stopPropagation(); this.showPicker?.()" style="color-scheme: dark;" class="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer w-full p-0" title="Fecha Hasta">
                                </div>
                                <button onclick="deliveryExpressModule.clearFilters()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs transition shrink-0" title="Limpiar Filtros">
                                    ✕
                                </button>
                                <button onclick="deliveryExpressModule.initTripsListener()" class="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0" title="Refrescar">
                                    🔄
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tabla de Encomiendas X→Y -->
                    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-slate-300">
                                <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                                    <tr>
                                        <th class="p-3">ID Viaje</th>
                                        <th class="p-3">Fecha / Hora</th>
                                        <th class="p-3">Origen (Punto A)</th>
                                        <th class="p-3">Destino (Punto B)</th>
                                        <th class="p-3">Distancia</th>
                                        <th class="p-3">Tarifa Oficial</th>
                                        <th class="p-3">Motorizado</th>
                                        <th class="p-3">Estado</th>
                                        <th class="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="trips-table-body" class="divide-y divide-slate-800/60">
                                    <tr>
                                        <td colspan="9" class="p-8 text-center text-slate-500">Cargando encomiendas de /deliveryTrips...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Barra de Paginación (10 Viajes por Página) -->
                        <div id="trips-pagination-bar" class="p-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div id="pagination-info" class="text-slate-400">
                                Mostrando 0–0 de 0 encomiendas
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="btn-prev-page" onclick="deliveryExpressModule.prevPage()" class="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                    ‹ Anterior
                                </button>
                                <span id="pagination-page-display" class="px-3 py-1 text-slate-300 font-bold bg-slate-900 rounded-lg border border-slate-800">
                                    Página 1 de 1
                                </span>
                                <button id="btn-next-page" onclick="deliveryExpressModule.nextPage()" class="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                    Siguiente ›
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sección 2: Configuración Canónica de Tarifas & Simulador -->
                <div id="section-pricing" class="${deliveryExpressModule.activeSection === 'pricing' ? 'block' : 'hidden'} space-y-6">
                    <!-- Alerta de Permisos para Roles Operativos / Auditoría -->
                    <div id="pricing-permission-alert" class="hidden">
                        <span class="text-base">🔒</span>
                        <span><strong>Modo Solo Lectura (Auditoría / Operación):</strong> Tu rol actual permite inspeccionar y simular tarifas, pero la modificación del motor de cálculo está reservada a Super Administradores y Administradores de Plataforma.</span>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <!-- Panel de Configuración -->
                        <div class="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                            <div class="border-b border-slate-800 pb-4">
                                <h3 class="text-base font-black text-white flex items-center gap-2">
                                    <span>⚙️</span> Parámetros del Motor Tarifario X→Y
                                </h3>
                                <p class="text-xs text-slate-400 mt-1">Fuente Única de Verdad: <code class="text-indigo-400 font-mono">/system_config/global.xToYPricing</code> (ADR-026)</p>
                            </div>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-1">Tarifa Base (baseFee) (C$)</label>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">C$</span>
                                        <input type="number" id="pricing-base-fee" step="0.5" min="0" class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="35.00">
                                    </div>
                                    <p class="text-[10px] text-slate-500 mt-1">Cargo mínimo inicial por solicitud de encomienda express.</p>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-1">Tarifa Canónica por Km (pricePerKm) (C$/km)</label>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">C$</span>
                                        <input type="number" id="pricing-per-km" step="0.5" min="0" class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="15.00">
                                    </div>
                                    <p class="text-[10px] text-slate-500 mt-1">Precio añadido por cada kilómetro recorrido según red vial (Canónico maestro: <code class="text-indigo-300 font-mono">pricePerKm</code>; alias legacy: <code class="text-slate-400 font-mono">perKmRate</code>).</p>
                                </div>

                                <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold text-slate-300">Política de Redondeo Canónica</span>
                                        <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">KM_BLOCK_2DEC</span>
                                    </div>
                                    <p class="text-[11px] text-slate-400 leading-relaxed">
                                        La distancia se redondea a 2 decimales exactos (<code class="text-indigo-300">Math.round(distKm * 100) / 100</code>) antes de multiplicar por la tarifa por kilómetro, garantizando consistencia absoluta entre cotización y cobro.
                                    </p>
                                </div>

                                <div class="pt-2">
                                    <button id="btn-save-pricing" onclick="deliveryExpressModule.savePricingConfig()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30">
                                        <span>💾</span> Guardar y Sincronizar Tarifas Globales
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Simulador Interactivo de Tarifas -->
                        <div class="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                            <div class="border-b border-slate-800 pb-4">
                                <h3 class="text-base font-black text-emerald-400 flex items-center gap-2">
                                    <span>🧮</span> Simulador de Precios en Vivo
                                </h3>
                                <p class="text-xs text-slate-400 mt-1">Prueba el comportamiento exacto del algoritmo con cualquier distancia</p>
                            </div>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-1">Distancia de Prueba (Kilómetros)</label>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">🛣️</span>
                                        <input type="number" id="sim-distance-input" step="0.001" min="0" value="15.532" oninput="deliveryExpressModule.runSimulator()" class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500" placeholder="Ej: 15.532">
                                    </div>
                                    <p class="text-[10px] text-slate-500 mt-1">Ejemplo real Managua: 15,532 metros</p>
                                </div>

                                <!-- Tarjeta de Desglose Matemático -->
                                <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                                    <div class="flex justify-between text-slate-400">
                                        <span>Distancia Bruta:</span>
                                        <span id="sim-raw-distance" class="text-white">15.532 km</span>
                                    </div>
                                    <div class="flex justify-between text-slate-400">
                                        <span>Distancia Redondeada (KM_BLOCK_2DEC):</span>
                                        <span id="sim-rounded-distance" class="text-indigo-400 font-bold">15.53 km</span>
                                    </div>
                                    <div class="flex justify-between text-slate-400">
                                        <span>Tarifa Base:</span>
                                        <span id="sim-base-fee" class="text-white">C$ 35.00</span>
                                    </div>
                                    <div class="flex justify-between text-slate-400">
                                        <span>Distancia × Tarifa/Km:</span>
                                        <span id="sim-distance-charge" class="text-white">15.53 × C$ 15.00 = C$ 232.95</span>
                                    </div>
                                    <div class="border-t border-slate-800 pt-3 flex justify-between items-center text-sm">
                                        <span class="text-emerald-400 font-sans font-bold">Importe Total Cotizado:</span>
                                        <span id="sim-total-amount" class="text-xl font-black text-emerald-400">C$ 267.95</span>
                                    </div>
                                </div>

                                <div class="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 text-[11px] text-indigo-300">
                                    🛡️ <strong>Integridad Financiera Certificada:</strong> Este mismo valor es el que genera la Cloud Function y estampa inmutablemente en <code class="font-mono">pricingSnapshot</code> al crearse el viaje.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal de Detalle con Mapa Leaflet (Sin Marca de Agua + Telemetría en Tiempo Real) -->
                <div id="trip-detail-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                        <!-- Modal Header -->
                        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">🗺️</span>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 id="modal-trip-id" class="text-base font-black text-white">Viaje Express #...</h3>
                                        <span id="modal-gps-badge" class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Telemetría GPS</span>
                                    </div>
                                    <p id="modal-trip-status" class="text-xs text-slate-400 mt-0.5">Estado: ...</p>
                                </div>
                            </div>
                            <button onclick="deliveryExpressModule.closeDetailModal()" class="text-slate-400 hover:text-white p-2 text-lg">✕</button>
                        </div>

                        <!-- Modal Body -->
                        <div class="p-5 overflow-y-auto space-y-4 flex-1">
                            <!-- Contenedor del Mapa Leaflet -->
                            <div class="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
                                <div id="trip-leaflet-map" class="w-full h-full z-0"></div>
                            </div>

                            <!-- Desglose de Información (Cuadrícula 3 Columnas) -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <!-- Col 1: Puntos de Ruta & Distancia -->
                                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs flex flex-col justify-between">
                                    <div>
                                        <h4 class="font-bold text-slate-200 flex items-center gap-2 mb-2">
                                            <span class="text-sky-400">📍</span> Puntos de Ruta
                                        </h4>
                                        <div class="space-y-2">
                                            <div>
                                                <span class="text-[10px] uppercase font-bold text-sky-400">Punto A (Origen):</span>
                                                <p id="modal-origin-addr" class="text-slate-200 mt-0.5 font-medium leading-tight">-</p>
                                            </div>
                                            <div class="border-t border-slate-800/60 pt-2">
                                                <span class="text-[10px] uppercase font-bold text-rose-400">Punto B (Destino):</span>
                                                <p id="modal-dest-addr" class="text-slate-200 mt-0.5 font-medium leading-tight">-</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="border-t border-slate-800/80 pt-2 flex items-center justify-between">
                                        <span class="text-[10px] uppercase font-bold text-slate-400">Distancia:</span>
                                        <span id="modal-distance" class="text-xs font-bold text-white">0.00 km</span>
                                    </div>
                                </div>

                                <!-- Col 2: Cliente Solicitante & Destinatario -->
                                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs flex flex-col justify-between">
                                    <div>
                                        <h4 class="font-bold text-slate-200 flex items-center gap-2 mb-2">
                                            <span class="text-indigo-400">👤</span> Datos del Cliente
                                        </h4>
                                        <div class="space-y-2">
                                            <div>
                                                <span class="text-[10px] uppercase font-bold text-indigo-400">Cliente Solicitante:</span>
                                                <p id="modal-client-name" class="text-slate-100 font-bold mt-0.5">-</p>
                                                <p id="modal-client-phone" class="text-slate-400 text-[11px]">-</p>
                                            </div>
                                            <div class="border-t border-slate-800/60 pt-2">
                                                <span class="text-[10px] uppercase font-bold text-slate-400">Destinatario:</span>
                                                <p id="modal-recipient-info" class="text-slate-200 mt-0.5 font-medium">-</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="border-t border-slate-800/80 pt-2">
                                        <span class="text-[10px] uppercase font-bold text-slate-500">Paquete:</span>
                                        <p id="modal-package-desc" class="text-slate-400 text-[11px] truncate">Sin descripción</p>
                                    </div>
                                </div>

                                <!-- Col 3: Desglose Financiero Oficial ADR-026 -->
                                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs flex flex-col justify-between">
                                    <div>
                                        <h4 class="font-bold text-slate-200 flex items-center gap-2 mb-2">
                                            <span class="text-emerald-400">💰</span> Desglose Financiero
                                        </h4>
                                        <div class="space-y-2">
                                            <div class="flex items-center justify-between">
                                                <span class="text-[10px] uppercase font-bold text-slate-400">Tarifa Oficial:</span>
                                                <span id="modal-amount" class="text-sm font-black text-emerald-400">C$ 0.00</span>
                                            </div>
                                            <div class="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                                                <span class="text-[11px] text-slate-300">🛵 Motorizado:</span>
                                                <span id="modal-courier-earnings" class="font-bold text-indigo-300 font-mono">C$ 0.00</span>
                                            </div>
                                            <div class="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                                                <span class="text-[11px] text-slate-300">🏢 Empresa / Plataforma:</span>
                                                <span id="modal-platform-revenue" class="font-bold text-amber-300 font-mono">C$ 35.00</span>
                                            </div>
                                            <div class="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                                                <span class="text-[10px] uppercase font-bold text-slate-500">Reconciliación:</span>
                                                <span id="modal-reconciliation-status" class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">-</span>
                                            </div>
                                            <div class="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                                                <span class="text-[10px] uppercase font-bold text-slate-500">Método de Pago:</span>
                                                <span id="modal-payment-method" class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">Efectivo</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="border-t border-slate-800/80 pt-2">
                                        <span class="text-[10px] uppercase font-bold text-slate-500">Repartidor Asignado:</span>
                                        <p id="modal-courier-name" class="text-slate-200 text-[11px] font-semibold truncate">Sin asignar</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Modal Footer -->
                        <div class="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
                            <button onclick="deliveryExpressModule.closeDetailModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-5 py-2.5 rounded-xl font-bold transition">
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal de Asignación Manual Administrativa -->
                <div id="assign-courier-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <!-- Modal Header -->
                        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 text-indigo-400">🛵</span>
                                <div>
                                    <h3 id="assign-modal-title" class="text-base font-black text-white">Asignar Motorizado</h3>
                                    <p id="assign-modal-subtitle" class="text-xs text-slate-400">Selecciona el repartidor oficial para esta encomienda</p>
                                </div>
                            </div>
                            <button onclick="deliveryExpressModule.closeAssignModal()" class="text-slate-400 hover:text-white p-2 text-lg">✕</button>
                        </div>

                        <!-- Search Courier Input -->
                        <div class="p-4 bg-slate-950/60 border-b border-slate-800/80">
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">🔍</span>
                                <input type="text" id="assign-courier-search" oninput="deliveryExpressModule.onCourierSearchChange(this.value)" placeholder="Buscar por nombre, teléfono o placa..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition">
                            </div>
                        </div>

                        <!-- Couriers List Body -->
                        <div id="assign-couriers-list" class="p-4 overflow-y-auto space-y-2 flex-1 max-h-[350px]">
                            <div class="p-6 text-center text-slate-500 text-xs">Cargando flota de repartidores...</div>
                        </div>

                        <!-- Modal Footer -->
                        <div class="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
                            <button onclick="deliveryExpressModule.closeAssignModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-xl font-bold transition">
                                Cancelar
                            </button>
                            <button id="btn-confirm-assignment" onclick="deliveryExpressModule.confirmAssignment()" disabled class="bg-slate-800 text-slate-500 cursor-not-allowed text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2">
                                <span>Confirmar Asignación</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sección 3: Verificación de Transferencias Bancarias (X→Y) -->
                <div id="section-transfers" class="hidden space-y-6">
                    <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                        <div class="flex items-center gap-2">
                            <span>💳</span>
                            <span><strong>Auditoría de Pagos:</strong> Comprobantes de transferencia de clientes para encomiendas X→Y antes de liberar al pool de motorizados.</span>
                        </div>
                        <span class="text-[11px] text-amber-400 font-bold">Validación Pre-Despacho</span>
                    </div>

                    <!-- Métricas de Transferencias -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400">Pendientes de Verificación</p>
                                <h3 id="kpi-transfers-pending" class="text-2xl font-black text-amber-400 mt-1">0</h3>
                                <span class="text-[10px] text-slate-500">Requieren aprobación manual</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">⏳</div>
                        </div>
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Transferencias Aprobadas</p>
                                <h3 id="kpi-transfers-verified" class="text-2xl font-black text-emerald-400 mt-1">0</h3>
                                <span class="text-[10px] text-slate-500">Despachadas con éxito</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">✓</div>
                        </div>
                        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p class="text-[11px] font-bold uppercase tracking-wider text-rose-400">Transferencias Rechazadas</p>
                                <h3 id="kpi-transfers-rejected" class="text-2xl font-black text-rose-400 mt-1">0</h3>
                                <span class="text-[10px] text-slate-500">Comprobante no válido</span>
                            </div>
                            <div class="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl">✕</div>
                        </div>
                    </div>

                    <!-- Tabla de Transferencias -->
                    <div class="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 class="text-sm font-black text-white flex items-center gap-2">
                                <span>📋</span> Encomiendas Pagadas con Transferencia
                            </h3>
                            <button onclick="deliveryExpressModule.renderTransfersTable()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
                                <span>🔄</span> Actualizar
                            </button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-slate-300">
                                <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                                    <tr>
                                        <th class="p-3.5">ID / Fecha</th>
                                        <th class="p-3.5">Remitente</th>
                                        <th class="p-3.5">Destinatario</th>
                                        <th class="p-3.5">Monto Total</th>
                                        <th class="p-3.5">N° Referencia</th>
                                        <th class="p-3.5 text-center">Comprobante</th>
                                        <th class="p-3.5 text-center">Estado</th>
                                        <th class="p-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="transfers-table-body" class="divide-y divide-slate-800/60 font-medium">
                                    <tr><td colspan="8" class="p-6 text-center text-slate-500">Cargando transferencias...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Sección 4: Configuración de Cuentas Bancarias Oficiales (/system_config/bank_accounts) -->
                <div id="section-bank-accounts" class="hidden space-y-6">
                    <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                        <div class="flex items-center gap-2">
                            <span>🏦</span>
                            <span><strong>Cuentas Bancarias Maestras:</strong> Cuentas oficiales que se muestran al cliente en la App al seleccionar pago por transferencia.</span>
                        </div>
                        <span class="text-[11px] text-indigo-400 font-mono">/system_config/bank_accounts</span>
                    </div>

                    <div class="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-base font-black text-white">Cuentas Receptoras Oficiales</h3>
                                <p class="text-xs text-slate-400">Configura los números de cuenta bancarios donde los clientes deben transferir el valor del envío.</p>
                            </div>
                            <button onclick="deliveryExpressModule.addBankAccountRow()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                                <span>➕</span> Agregar Cuenta
                            </button>
                        </div>

                        <div id="bank-accounts-container" class="space-y-4">
                            <!-- Filas dinámicas -->
                        </div>

                        <div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                            <button onclick="deliveryExpressModule.loadBankAccountsConfig()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                                Descartar Cambios
                            </button>
                            <button id="btn-save-bank-accounts" onclick="deliveryExpressModule.saveBankAccountsConfig()" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/30">
                                <span>💾</span> Guardar Cuentas Bancarias
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal de Visualización de Comprobante / Voucher (BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001) -->
                <div id="voucher-preview-modal" class="hidden fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                            <div>
                                <h3 class="text-sm font-black text-white flex items-center gap-2">
                                    <span>🧾</span> Comprobante de Transferencia Bancaria
                                </h3>
                                <p id="voucher-modal-trip-id" class="text-xs text-indigo-400 font-mono">ID: -</p>
                            </div>
                            <button onclick="deliveryExpressModule.closeVoucherModal()" class="text-slate-400 hover:text-white p-2 text-lg">✕</button>
                        </div>
                        <!-- Metadata Bar -->
                        <div class="px-5 py-3 bg-slate-950/80 border-b border-slate-800 grid grid-cols-3 gap-3 text-xs">
                            <div>
                                <span class="text-[10px] text-slate-500 uppercase font-bold">Referencia:</span>
                                <p id="voucher-modal-ref" class="text-indigo-300 font-mono font-bold">-</p>
                            </div>
                            <div>
                                <span class="text-[10px] text-slate-500 uppercase font-bold">Monto:</span>
                                <p id="voucher-modal-amount" class="text-emerald-400 font-bold">-</p>
                            </div>
                            <div>
                                <span class="text-[10px] text-slate-500 uppercase font-bold">Fecha:</span>
                                <p id="voucher-modal-date" class="text-slate-300 font-medium">-</p>
                            </div>
                        </div>
                        <div id="voucher-modal-image-container" class="p-4 overflow-auto flex items-center justify-center bg-black/40 min-h-[300px]">
                            <img id="voucher-modal-image" src="" alt="Comprobante" class="max-h-[55vh] max-w-full rounded-xl object-contain border border-slate-800 shadow-2xl">
                            <div id="voucher-modal-error" class="hidden text-center p-6 space-y-2">
                                <span class="text-3xl">⚠️</span>
                                <p class="text-amber-400 font-bold text-sm" id="voucher-modal-error-msg">No se pudo cargar el comprobante</p>
                                <p class="text-slate-500 text-xs" id="voucher-modal-error-sub">El archivo puede ser una ruta local privada de Android o no existir en almacenamiento remoto.</p>
                            </div>
                        </div>
                        <div class="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                            <a id="voucher-modal-download" href="" target="_blank" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2">
                                <span>🔗</span> Abrir Imagen Completa
                            </a>
                            <button onclick="deliveryExpressModule.closeVoucherModal()" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal de Rechazo de Transferencia Bancaria (BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001) -->
                <div id="reject-transfer-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
                        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 text-rose-400">✕</span>
                                <div>
                                    <h3 class="text-base font-black text-white">Rechazar Transferencia</h3>
                                    <p id="reject-transfer-modal-trip-id" class="text-xs text-rose-400 font-mono font-bold">ID: #...</p>
                                </div>
                            </div>
                            <button onclick="deliveryExpressModule.closeRejectModal()" class="text-slate-400 hover:text-white p-2 text-lg">✕</button>
                        </div>
                        <div class="p-5 space-y-4 text-xs">
                            <div>
                                <label class="block text-[11px] text-slate-300 font-bold mb-1.5">Motivo del Rechazo *</label>
                                <select id="reject-transfer-reason" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500">
                                    <option value="Comprobante ilegible">Comprobante ilegible</option>
                                    <option value="Monto incorrecto">Monto incorrecto</option>
                                    <option value="Referencia no válida">Referencia no válida</option>
                                    <option value="Transferencia no localizada">Transferencia no localizada</option>
                                    <option value="Comprobante inconsistente">Comprobante inconsistente</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] text-slate-300 font-bold mb-1.5">Comentarios adicionales (Opcional)</label>
                                <textarea id="reject-transfer-details" rows="3" placeholder="Detalla el motivo para informar al cliente..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"></textarea>
                            </div>
                        </div>
                        <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2 shrink-0">
                            <button onclick="deliveryExpressModule.closeRejectModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                                Cancelar
                            </button>
                            <button id="btn-confirm-reject-transfer" onclick="deliveryExpressModule.confirmRejectTransfer()" class="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow">
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal de Cancelación de Encomienda (BSD-001) -->
                <div id="cancel-trip-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
                        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 text-rose-400">⚠️</span>
                                <div>
                                    <h3 class="text-base font-black text-white">Cancelar Encomienda</h3>
                                    <p id="cancel-modal-trip-id" class="text-xs text-rose-400 font-mono font-bold">ID: #...</p>
                                </div>
                            </div>
                            <button onclick="deliveryExpressModule.closeCancelModal()" class="text-slate-400 hover:text-white p-2 text-lg">✕</button>
                        </div>
                        <div class="p-5 space-y-3 text-xs">
                            <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div><span class="text-slate-500 font-bold uppercase text-[10px]">Remitente:</span> <span id="cancel-modal-sender" class="text-white font-medium">-</span></div>
                                <div><span class="text-slate-500 font-bold uppercase text-[10px]">Destino:</span> <span id="cancel-modal-dest" class="text-white font-medium">-</span></div>
                                <div><span class="text-slate-500 font-bold uppercase text-[10px]">Motorizado:</span> <span id="cancel-modal-courier" class="text-indigo-300 font-bold">-</span></div>
                                <div><span class="text-slate-500 font-bold uppercase text-[10px]">Estado Actual:</span> <span id="cancel-modal-status" class="text-amber-400 font-bold">-</span></div>
                            </div>
                            <div>
                                <label class="block text-[11px] text-slate-300 font-bold mb-1">Motivo de la Cancelación</label>
                                <textarea id="cancel-modal-reason" rows="2" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:border-rose-500 focus:outline-none" placeholder="Motivo administrativo de la cancelación..."></textarea>
                            </div>
                            <p class="text-[11px] text-rose-400/90 font-medium">
                                ¿Confirmas la cancelación? Esta acción es irreversible, finalizará la solicitud y registrará auditoría inmutable.
                            </p>
                        </div>
                        <div class="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
                            <button onclick="deliveryExpressModule.closeCancelModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-xl font-bold transition">
                                CERRAR
                            </button>
                            <button id="btn-confirm-cancel" onclick="deliveryExpressModule.confirmCancellation()" class="bg-rose-600 hover:bg-rose-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/30">
                                <span>CONFIRMAR CANCELACIÓN</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;


        // Iniciar precargas y oyentes
        deliveryExpressModule.loadCouriersCache();
        deliveryExpressModule.initTripsListener();
        deliveryExpressModule.loadPricingConfig();
        deliveryExpressModule.runSimulator();
    },

    // 3. Cambio de Sección
    switchSection: (section) => {
        deliveryExpressModule.activeSection = section;
        const secTrips = document.getElementById('section-trips');
        const secTransfers = document.getElementById('section-transfers');
        const secPricing = document.getElementById('section-pricing');
        const secBank = document.getElementById('section-bank-accounts');

        const btnTrips = document.getElementById('btn-sec-trips');
        const btnTransfers = document.getElementById('btn-sec-transfers');
        const btnPricing = document.getElementById('btn-sec-pricing');
        const btnBank = document.getElementById('btn-sec-bank');

        // Hide all sections
        secTrips?.classList.add('hidden');
        secTransfers?.classList.add('hidden');
        secPricing?.classList.add('hidden');
        secBank?.classList.add('hidden');

        // De-highlight all buttons
        [btnTrips, btnTransfers, btnPricing, btnBank].forEach(btn => {
            btn?.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
            btn?.classList.add('text-slate-400');
        });

        if (section === 'trips') {
            secTrips?.classList.remove('hidden');
            btnTrips?.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
            btnTrips?.classList.remove('text-slate-400');
        } else if (section === 'transfers') {
            secTransfers?.classList.remove('hidden');
            btnTransfers?.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
            btnTransfers?.classList.remove('text-slate-400');
            deliveryExpressModule.renderTransfersTable();
        } else if (section === 'pricing') {
            secPricing?.classList.remove('hidden');
            btnPricing?.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
            btnPricing?.classList.remove('text-slate-400');
        } else if (section === 'bank_accounts') {
            secBank?.classList.remove('hidden');
            btnBank?.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
            btnBank?.classList.remove('text-slate-400');
            deliveryExpressModule.loadBankAccountsConfig();
        }
    },

    // 4. Precarga de Caché de Motorizados (Zero N+1)
    loadCouriersCache: async () => {
        if (typeof db === 'undefined' || !db) return;
        try {
            const couriersSnap = await db.collection('couriers').get();
            couriersSnap.forEach(doc => {
                const d = doc.data() || {};
                deliveryExpressModule.couriersCache.set(doc.id, {
                    id: doc.id,
                    name: d.name || d.nombre || d.displayName || 'Motorizado',
                    phone: d.phone || d.telefono || '',
                    plate: d.plate || d.vehiclePlate || d.vehicle?.plate || '',
                    vehicleModel: d.vehicleModel || d.vehicle?.model || '',
                    isOnline: d.isOnline === true,
                    isAvailable: d.isAvailable !== false,
                    municipality: d.municipalityName || d.city || 'Managua'
                });
            });

            // Complementar con /users rol courier/driver
            const usersSnap = await db.collection('users')
                .where('role', 'in', ['courier', 'driver', 'repartidor', 'motorizado'])
                .get();

            usersSnap.forEach(doc => {
                const u = doc.data() || {};
                const existing = deliveryExpressModule.couriersCache.get(doc.id) || {};
                deliveryExpressModule.couriersCache.set(doc.id, {
                    ...existing,
                    id: doc.id,
                    name: u.name || u.nombre || u.displayName || existing.name || 'Motorizado',
                    phone: u.phone || u.telefono || existing.phone || '',
                    plate: u.vehiclePlate || u.placa || existing.plate || '',
                    vehicleModel: u.vehicleModel || existing.vehicleModel || '',
                    isOnline: existing.isOnline ?? true,
                    isAvailable: existing.isAvailable ?? true,
                    municipality: u.municipalityId || existing.municipality || 'Managua'
                });
            });
        } catch (e) {
            console.warn("[DeliveryExpress] Aviso al precargar couriers:", e.message);
        }
        deliveryExpressModule.populateCourierFilterSelect();
    },

    // 5. Oyente Reactivo de /deliveryTrips (SSOT)
    initTripsListener: () => {
        if (deliveryExpressModule.unsubscribeTrips) {
            deliveryExpressModule.unsubscribeTrips();
            deliveryExpressModule.unsubscribeTrips = null;
        }

        if (typeof db === 'undefined' || !db) {
            console.error("[DeliveryExpress] Firestore db no está inicializado.");
            return;
        }

        deliveryExpressModule.isLoadingTrips = true;
        const tripsRef = db.collection('deliveryTrips');

        // Escucha reactiva ordenada cronológicamente
        deliveryExpressModule.unsubscribeTrips = tripsRef
            .orderBy('createdAt', 'desc')
            .limit(100)
            .onSnapshot(async (snapshot) => {
                const trips = [];
                snapshot.forEach(doc => {
                    trips.push({ id: doc.id, ...doc.data() });
                });

                deliveryExpressModule.trips = trips;

                // Resolver espejos de /orders para sincronización de integridad operacional
                await deliveryExpressModule.resolveOrdersMirrors(trips);

                // Aplicar OperationalStateResolver a cada viaje
                deliveryExpressModule.resolvedTrips = trips.map(t => deliveryExpressModule.resolveTripOperationalData(t));

                deliveryExpressModule.isLoadingTrips = false;
                deliveryExpressModule.populateCourierFilterSelect();
                deliveryExpressModule.renderTripsTable();
                deliveryExpressModule.updateKpis();
                deliveryExpressModule.renderTransfersTable();
                deliveryExpressModule.checkDeepLink();
            }, (err) => {
                console.error("[DeliveryExpress] Error escuchando /deliveryTrips:", err);
                deliveryExpressModule.isLoadingTrips = false;
                const tbody = document.getElementById('trips-table-body');
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-rose-400 font-bold">Error de lectura: ${err.message}</td></tr>`;
                }
            });

        if (!deliveryExpressModule._hashListenerAdded && typeof window !== 'undefined') {
            window.addEventListener('hashchange', () => deliveryExpressModule.checkDeepLink());
            deliveryExpressModule._hashListenerAdded = true;
        }
    },

    checkDeepLink: () => {
        try {
            const hash = (typeof window !== 'undefined' && window.location.hash) ? window.location.hash : '';
            if (hash.includes('deliveryExpress-transfer-verification') || hash.includes('transfer-verification')) {
                deliveryExpressModule.switchSection('transfers');
                const match = hash.match(/tripId=([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    const targetId = match[1];
                    setTimeout(() => {
                        const trip = deliveryExpressModule.trips.find(t => t.id === targetId);
                        if (trip) {
                            if (trip.receiptUrl) {
                                deliveryExpressModule.openVoucherModal(trip.receiptUrl, trip.id);
                            } else if (trip.receiptPath) {
                                deliveryExpressModule.openVoucherPathModal(trip.receiptPath, trip.id);
                            }
                        }
                    }, 500);
                }
            }
        } catch (e) {
            console.warn('[DeliveryExpress] Error al procesar deep link:', e);
        }
    },

    // 6. Resolución de Espejos /orders (Recuperación de Estado e Identidad Operacional)
    resolveOrdersMirrors: async (trips) => {
        if (typeof db === 'undefined' || !db) return;
        const missingIds = trips
            .filter(t => !deliveryExpressModule.ordersMirrorCache.has(t.id))
            .map(t => t.id);

        if (missingIds.length === 0) return;

        // Leer en paralelo de /orders sin N+1 loop en UI
        await Promise.all(missingIds.map(async (tripId) => {
            try {
                const doc = await db.collection('orders').doc(tripId).get();
                if (doc.exists) {
                    deliveryExpressModule.ordersMirrorCache.set(tripId, doc.data());
                } else {
                    deliveryExpressModule.ordersMirrorCache.set(tripId, null);
                }
            } catch (e) {
                deliveryExpressModule.ordersMirrorCache.set(tripId, null);
            }
        }));
    },

    // 7. OPERATIONAL STATE RESOLVER CANÓNICO
    resolveTripOperationalData: (trip) => {
        const mirror = deliveryExpressModule.ordersMirrorCache.get(trip.id) || null;

        // 1. Estado Operacional Canónico
        const canonicalStatus = deliveryExpressModule.resolveCanonicalStatus(trip, mirror);

        // 2. Identidad Canónica del Motorizado
        const courierInfo = deliveryExpressModule.resolveCourierInfo(trip, mirror);

        // 3. Distancia Canónica y Tipo (Vial vs Estimada)
        const distanceInfo = deliveryExpressModule.resolveDistanceInfo(trip);

        // 4. Tarifa Canónica (Invariante ADR-026 SSOT)
        const price = trip.customerTotal != null
            ? Number(trip.customerTotal).toFixed(2)
            : (trip.pricingSnapshot?.calculatedAmount != null 
                ? Number(trip.pricingSnapshot.calculatedAmount).toFixed(2)
                : (trip.calculatedFee != null ? Number(trip.calculatedFee).toFixed(2) : (trip.deliveryFee != null ? Number(trip.deliveryFee).toFixed(2) : '0.00')));

        // 5. Fecha Canónica
        let dateObj = null;
        let dateStr = '-';
        if (trip.createdAt?.toDate) {
            dateObj = trip.createdAt.toDate();
            dateStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        } else if (trip.createdAt) {
            dateObj = new Date(trip.createdAt);
            if (!isNaN(dateObj.getTime())) {
                dateStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            }
        }

        return {
            ...trip,
            operationalStatus: canonicalStatus,
            courierInfo: courierInfo,
            distanceInfo: distanceInfo,
            canonicalPrice: price,
            formattedDate: dateStr,
            dateObject: dateObj,
            mirrorOrder: mirror
        };
    },

    // 7.1. Normalizador de Estados
    resolveCanonicalStatus: (trip, mirror) => {
        const rawStatus = (trip.status || '').toUpperCase().trim();
        const estado = (trip.estado || '').toLowerCase().trim();
        const mirrorStatus = (mirror?.status || '').toUpperCase().trim();
        const mirrorEstado = (mirror?.estado || '').toLowerCase().trim();

        // 1. Completado / Entregado (Prioridad sobre cancelación si completedAt >= cancelledAt o si estado final es completado)
        const isCompletedSignal = rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED' || estado === 'completado' || estado === 'entregado' ||
            trip.completedAt || trip.deliveredAt || trip.courierPhase === 3 ||
            mirrorStatus === 'COMPLETED' || mirrorStatus === 'DELIVERED' || mirrorEstado === 'completado' || mirrorEstado === 'entregado';

        const completedSeconds = trip.completedAt?._seconds || trip.completedAt?.seconds || 0;
        const cancelledSeconds = trip.cancelledAt?._seconds || trip.cancelledAt?.seconds || 0;

        if (isCompletedSignal && (!trip.cancelledAt || completedSeconds >= cancelledSeconds)) {
            return 'COMPLETED';
        }

        // 2. Cancelado
        if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELADO' || estado === 'cancelado' || trip.cancelledAt || mirrorStatus === 'CANCELLED' || mirrorEstado === 'cancelado') {
            return 'CANCELLED';
        }

        // 3. En Tránsito / En Ruta
        if (rawStatus === 'IN_TRANSIT' || rawStatus === 'PICKED_UP' || rawStatus === 'EN_ROUTE_PICKUP' ||
            estado === 'en_camino' || estado === 'recogido' || estado === 'en_ruta' || trip.courierPhase === 2 ||
            mirrorStatus === 'IN_TRANSIT' || mirrorStatus === 'PICKED_UP' || mirrorEstado === 'en_camino' || mirrorEstado === 'recogido') {
            return 'IN_TRANSIT';
        }

        // 4. Asignado
        const hasCourier = Boolean(trip.assignedCourierId || trip.courierId || trip.motorizadoId || mirror?.assignedCourierId || mirror?.motorizadoId);
        if (rawStatus === 'ASSIGNED' || estado === 'asignado' || trip.assignedAt || trip.courierPhase === 1 ||
            mirrorStatus === 'ASSIGNED' || mirrorStatus === 'COURIER_ACCEPTED' || mirrorEstado === 'asignado' || hasCourier) {
            return 'ASSIGNED';
        }

        // 5. Listo para despacho
        if (rawStatus === 'READY' || estado === 'listo' || mirrorStatus === 'READY') {
            return 'READY';
        }

        // 6. Verificando Pago
        if (rawStatus === 'PAYMENT_VERIFYING' || rawStatus === 'VERIFYING_PAYMENT' || estado === 'verificando_pago') {
            return 'PAYMENT_VERIFYING';
        }

        // 7. Pendiente de asignación
        if (rawStatus === 'PENDING' || rawStatus === 'DRAFT' || rawStatus === 'CREATED' || estado === 'pendiente' || !rawStatus) {
            return 'PENDING';
        }

        return 'UNKNOWN';
    },

    // 7.2. Resolución de Motorizado
    resolveCourierInfo: (trip, mirror) => {
        const courierId = trip.assignedCourierId || trip.courierId || trip.motorizadoId || mirror?.assignedCourierId || mirror?.motorizadoId || null;
        const rawName = trip.assignedCourierName || trip.courierName || trip.driverName || trip.motorizadoNombre || mirror?.driverName || mirror?.assignedCourierName || null;

        if (courierId) {
            const cached = deliveryExpressModule.couriersCache.get(courierId);
            const resolvedName = rawName || cached?.name || `DRV-${courierId.slice(-4).toUpperCase()}`;
            const plate = cached?.plate || trip.assignedCourierPlate || '';
            return {
                id: courierId,
                name: resolvedName,
                plate: plate,
                isAssigned: true
            };
        }

        // Si no tiene courier pero el viaje ya fue completado históricamente sin asignación registrada
        const isCompleted = trip.status === 'completed' || trip.estado === 'completado' || trip.completedAt || mirror?.status === 'completed';
        if (isCompleted) {
            return {
                id: null,
                name: 'DATA GAP',
                isDataGap: true,
                isAssigned: false
            };
        }

        return {
            id: null,
            name: 'Por asignar',
            isUnassigned: true,
            isAssigned: false
        };
    },

    // 7.3. Estimación Geodésica Resiliente de Distancia (Haversine ante ausencia de snapshot)
    resolveDistanceInfo: (trip) => {
        // Prioridad 1: Snapshot canónico
        if (trip.pricingSnapshot?.routeDistanceKm != null) {
            return {
                km: Number(trip.pricingSnapshot.routeDistanceKm).toFixed(2),
                type: 'VIAL',
                display: `🟢 ${Number(trip.pricingSnapshot.routeDistanceKm).toFixed(2)} km`
            };
        }

        // Prioridad 2: Metros viales calculados
        if (trip.routeDistanceMeters) {
            const km = (Number(trip.routeDistanceMeters) / 1000).toFixed(2);
            return {
                km: km,
                type: 'VIAL',
                display: `🟢 ${km} km`
            };
        }

        // Prioridad 3: Geodesia Haversine de Coordenadas (Origen → Destino)
        const oLat = trip.origin?.latitude;
        const oLng = trip.origin?.longitude;
        const dLat = trip.destination?.latitude;
        const dLng = trip.destination?.longitude;

        if (oLat && oLng && dLat && dLng) {
            const R = 6371; // Radio de la tierra en km
            const dLatRad = (dLat - oLat) * Math.PI / 180;
            const dLonRad = (dLng - oLng) * Math.PI / 180;
            const a = Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
                      Math.cos(oLat * Math.PI / 180) * Math.cos(dLat * Math.PI / 180) *
                      Math.sin(dLonRad / 2) * Math.sin(dLonRad / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const haversineKm = (R * c).toFixed(2);
            return {
                km: haversineKm,
                type: 'ESTIMATED',
                display: `🟠 ${haversineKm} km <span class="text-[10px] text-amber-400/80">(Est.)</span>`
            };
        }

        // Prioridad 4: Derivación matemática desde tarifa legacy
        if (trip.calculatedFee && Number(trip.calculatedFee) > 35) {
            const derivedKm = ((Number(trip.calculatedFee) - 35) / 15).toFixed(2);
            return {
                km: derivedKm,
                type: 'ESTIMATED',
                display: `🟠 ${derivedKm} km <span class="text-[10px] text-amber-400/80">(Est.)</span>`
            };
        }

        return {
            km: '0.00',
            type: 'UNKNOWN',
            display: `<span class="text-slate-500">0.00 km</span>`
        };
    },

    // 8. Render de Tabla Paginada y Filtros
    renderTripsTable: () => {
        const tbody = document.getElementById('trips-table-body');
        if (!tbody) return;

        let filtered = deliveryExpressModule.resolvedTrips;

        // Filtro por Estado Operacional
        if (deliveryExpressModule.filterStatus !== 'ALL') {
            filtered = filtered.filter(t => t.operationalStatus === deliveryExpressModule.filterStatus);
        }

        // Filtro por Motorizado
        if (deliveryExpressModule.filterCourier !== 'ALL') {
            filtered = filtered.filter(t => {
                return t.courierInfo?.id === deliveryExpressModule.filterCourier ||
                       t.courierInfo?.name === deliveryExpressModule.filterCourier;
            });
        }

        // Filtro por Rango de Fechas (createdAt canónico)
        if (deliveryExpressModule.dateFrom) {
            const fromDate = new Date(deliveryExpressModule.dateFrom + 'T00:00:00');
            filtered = filtered.filter(t => t.dateObject && t.dateObject >= fromDate);
        }
        if (deliveryExpressModule.dateTo) {
            const toDate = new Date(deliveryExpressModule.dateTo + 'T23:59:59.999');
            filtered = filtered.filter(t => t.dateObject && t.dateObject <= toDate);
        }

        // Filtro por Búsqueda Multicampo
        if (deliveryExpressModule.searchQuery.trim().length > 0) {
            const q = deliveryExpressModule.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(t => {
                const id = (t.id || '').toLowerCase();
                const shortId = id.slice(-6);
                const sender = (t.senderName || '').toLowerCase();
                const senderPhone = (t.senderPhone || '').toLowerCase();
                const recipient = (t.recipientName || '').toLowerCase();
                const recipientPhone = (t.recipientPhone || '').toLowerCase();
                const origin = (t.origin?.address || '').toLowerCase();
                const dest = (t.destination?.address || '').toLowerCase();
                const courier = (t.courierInfo?.name || '').toLowerCase();
                const courierId = (t.courierInfo?.id || '').toLowerCase();
                const plate = (t.courierInfo?.plate || '').toLowerCase();

                return id.includes(q) || shortId.includes(q) ||
                       sender.includes(q) || senderPhone.includes(q) ||
                       recipient.includes(q) || recipientPhone.includes(q) ||
                       origin.includes(q) || dest.includes(q) ||
                       courier.includes(q) || courierId.includes(q) || plate.includes(q);
            });
        }

        deliveryExpressModule.filteredTrips = filtered;
        deliveryExpressModule.updateKpis();

        const totalFiltered = filtered.length;

        if (totalFiltered === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-500 font-medium">No se encontraron encomiendas que coincidan con los filtros aplicados.</td></tr>`;
            deliveryExpressModule.updatePaginationControls(0, 0, 0);
            return;
        }

        // Paginación: 10 viajes por página
        const totalPages = Math.ceil(totalFiltered / deliveryExpressModule.pageSize) || 1;
        if (deliveryExpressModule.currentPage > totalPages) {
            deliveryExpressModule.currentPage = totalPages;
        }
        if (deliveryExpressModule.currentPage < 1) {
            deliveryExpressModule.currentPage = 1;
        }

        const startIndex = (deliveryExpressModule.currentPage - 1) * deliveryExpressModule.pageSize;
        const endIndex = Math.min(startIndex + deliveryExpressModule.pageSize, totalFiltered);
        const pageItems = filtered.slice(startIndex, endIndex);

        deliveryExpressModule.updatePaginationControls(startIndex + 1, endIndex, totalFiltered);

        tbody.innerHTML = pageItems.map(t => {
            const badge = deliveryExpressModule.getStatusBadge(t.operationalStatus);
            const originAddr = t.origin?.address || 'Origen no disponible';
            const destAddr = t.destination?.address || 'Destino no disponible';

            // Representación de motorizado
            let courierDisplay = '';
            if (t.courierInfo.isAssigned) {
                courierDisplay = `
                    <div class="flex flex-col">
                        <span class="font-bold text-indigo-300 flex items-center gap-1">
                            <span>🛵</span> ${t.courierInfo.name}
                        </span>
                        ${t.courierInfo.plate ? `<span class="text-[10px] text-slate-500 font-mono">Placa: ${t.courierInfo.plate}</span>` : ''}
                    </div>
                `;
            } else if (t.courierInfo.isDataGap) {
                courierDisplay = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700" title="Identidad no preservada históricamente">DATA GAP</span>`;
            } else {
                courierDisplay = `<span class="text-slate-500">Por asignar</span>`;
            }

            // Botón de Asignación / Bloqueo
            let assignActionBtn = '';
            const isEligibleToAssign = (t.operationalStatus === 'PENDING' || t.operationalStatus === 'READY' || t.operationalStatus === 'PAYMENT_VERIFYING') && !t.courierInfo.isAssigned;

            if (isEligibleToAssign && deliveryExpressModule.canAdminAssign()) {
                assignActionBtn = `
                    <button onclick="deliveryExpressModule.openAssignModal('${t.id}')" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm">
                        <span>👤</span> Asignar
                    </button>
                `;
            } else if (t.courierInfo.isAssigned) {
                assignActionBtn = `
                    <span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed flex items-center gap-1" title="El motorizado ya fue asignado/aceptó el servicio">
                        <span>🔒</span> Asignado
                    </span>
                `;
            }

            return `
                <tr class="hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-white">#${t.id.slice(-6).toUpperCase()}</td>
                    <td class="p-3 text-slate-400 whitespace-nowrap">${t.formattedDate}</td>
                    <td class="p-3 max-w-[170px] truncate" title="${originAddr}">${originAddr}</td>
                    <td class="p-3 max-w-[170px] truncate" title="${destAddr}">${destAddr}</td>
                    <td class="p-3 font-mono">${t.distanceInfo.display}</td>
                    <td class="p-3 font-mono font-bold text-emerald-400">C$ ${t.canonicalPrice}</td>
                    <td class="p-3">${courierDisplay}</td>
                    <td class="p-3">${badge}</td>
                    <td class="p-3">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="deliveryExpressModule.openDetailModal('${t.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1" title="Ver en Mapa">
                                <span>🗺️</span>
                            </button>
                            ${assignActionBtn}
                            ${deliveryExpressModule.canCancelTrip(t) ? `
                                <button onclick="deliveryExpressModule.openCancelModal('${t.id}')" class="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm" title="Cancelar Encomienda">
                                    <span>❌</span> Cancelar
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // 9. Badges de Estado Operacional Canónico
    getStatusBadge: (status) => {
        switch (status) {
            case 'PENDING':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">PENDIENTE</span>`;
            case 'PAYMENT_VERIFYING':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">VERIF. PAGO</span>`;
            case 'READY':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LISTO</span>`;
            case 'ASSIGNED':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">ASIGNADO</span>`;
            case 'IN_TRANSIT':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">EN TRÁNSITO</span>`;
            case 'COMPLETED':
            case 'DELIVERED':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ENTREGADO</span>`;
            case 'CANCELLED':
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CANCELADO</span>`;
            default:
                return `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">${status}</span>`;
        }
    },

    // 10. Controles de Paginación
    updatePaginationControls: (start, end, total) => {
        const infoEl = document.getElementById('pagination-info');
        const displayEl = document.getElementById('pagination-page-display');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');

        const totalPages = Math.ceil(total / deliveryExpressModule.pageSize) || 1;

        if (infoEl) infoEl.textContent = `Mostrando ${start}–${end} de ${total} encomiendas`;
        if (displayEl) displayEl.textContent = `Página ${deliveryExpressModule.currentPage} de ${totalPages}`;

        if (btnPrev) btnPrev.disabled = deliveryExpressModule.currentPage <= 1;
        if (btnNext) btnNext.disabled = deliveryExpressModule.currentPage >= totalPages;
    },

    nextPage: () => {
        deliveryExpressModule.currentPage++;
        deliveryExpressModule.renderTripsTable();
    },

    prevPage: () => {
        deliveryExpressModule.currentPage--;
        deliveryExpressModule.renderTripsTable();
    },

    // 11. Métricas Superiores (KPIs)
    updateKpis: () => {
        const trips = deliveryExpressModule.resolvedTrips;
        const filtered = deliveryExpressModule.filteredTrips || trips;
        const total = trips.length;

        // Comprobar si hay filtros aplicados
        const hasFilter = (deliveryExpressModule.filterStatus !== 'ALL') ||
                          (deliveryExpressModule.filterCourier !== 'ALL') ||
                          Boolean(deliveryExpressModule.dateFrom) ||
                          Boolean(deliveryExpressModule.dateTo) ||
                          Boolean(deliveryExpressModule.searchQuery.trim().length > 0);

        // En tránsito / Activas: ÚNICAMENTE viajes asignados o en tránsito (excluye finalizados y cancelados)
        const active = trips.filter(t => t.operationalStatus === 'ASSIGNED' || t.operationalStatus === 'IN_TRANSIT').length;

        // Por asignar: ÚNICAMENTE viajes elegibles (PENDING/READY/PAYMENT_VERIFYING) sin courier
        const pending = trips.filter(t => (t.operationalStatus === 'PENDING' || t.operationalStatus === 'READY' || t.operationalStatus === 'PAYMENT_VERIFYING') && !t.courierInfo.isAssigned).length;
        
        // Tarifas acumuladas: se adaptan según el rango de fecha, motorizado o global
        const revenueToDisplay = hasFilter
            ? filtered.reduce((acc, t) => acc + Number(t.canonicalPrice || 0), 0)
            : trips.reduce((acc, t) => acc + Number(t.canonicalPrice || 0), 0);

        const elTotal = document.getElementById('kpi-total');
        const elActive = document.getElementById('kpi-active');
        const elPending = document.getElementById('kpi-pending');
        const elRev = document.getElementById('kpi-revenue');
        const elRevSub = document.getElementById('kpi-revenue-subtitle');

        if (elTotal) elTotal.textContent = total;
        if (elActive) elActive.textContent = active;
        if (elPending) elPending.textContent = pending;
        if (elRev) elRev.textContent = `C$ ${revenueToDisplay.toFixed(2)}`;
        if (elRevSub) {
            if (hasFilter) {
                elRevSub.textContent = `Filtrado (${filtered.length} de ${total} viajes)`;
                elRevSub.className = "text-[10px] text-amber-400 font-bold";
            } else {
                elRevSub.textContent = "Total calculado SSOT";
                elRevSub.className = "text-[10px] text-slate-500";
            }
        }
    },

    // 12. Búsqueda y Filtros
    onSearchChange: (val) => {
        deliveryExpressModule.searchQuery = val;
        deliveryExpressModule.currentPage = 1;
        deliveryExpressModule.renderTripsTable();
    },

    onFilterStatusChange: (val) => {
        deliveryExpressModule.filterStatus = val;
        deliveryExpressModule.currentPage = 1;
        deliveryExpressModule.renderTripsTable();
    },

    onFilterCourierChange: (val) => {
        deliveryExpressModule.filterCourier = val;
        deliveryExpressModule.currentPage = 1;
        deliveryExpressModule.renderTripsTable();
    },

    populateCourierFilterSelect: () => {
        const select = document.getElementById('trip-courier-filter');
        if (!select) return;

        const currentVal = deliveryExpressModule.filterCourier || 'ALL';
        const couriersMap = new Map();

        // 1. Del caché de motorizados
        deliveryExpressModule.couriersCache.forEach((c, id) => {
            if (c.name && c.name !== 'Motorizado') {
                couriersMap.set(id, { id, name: c.name, plate: c.plate });
            }
        });

        // 2. De los viajes resueltos
        deliveryExpressModule.resolvedTrips.forEach(t => {
            if (t.courierInfo && t.courierInfo.isAssigned && t.courierInfo.id) {
                couriersMap.set(t.courierInfo.id, {
                    id: t.courierInfo.id,
                    name: t.courierInfo.name,
                    plate: t.courierInfo.plate
                });
            }
        });

        const sorted = Array.from(couriersMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        let html = `<option value="ALL">🛵 Todos los Motorizados</option>`;
        sorted.forEach(c => {
            const isSel = currentVal === c.id ? 'selected' : '';
            html += `<option value="${c.id}" ${isSel}>${c.name} ${c.plate ? `(${c.plate})` : ''}</option>`;
        });

        select.innerHTML = html;
    },

    onDateChange: () => {
        const fromVal = document.getElementById('trip-date-from')?.value || '';
        const toVal = document.getElementById('trip-date-to')?.value || '';
        deliveryExpressModule.dateFrom = fromVal;
        deliveryExpressModule.dateTo = toVal;
        deliveryExpressModule.currentPage = 1;
        deliveryExpressModule.renderTripsTable();
    },

    clearFilters: () => {
        deliveryExpressModule.searchQuery = '';
        deliveryExpressModule.filterStatus = 'ALL';
        deliveryExpressModule.filterCourier = 'ALL';
        deliveryExpressModule.dateFrom = '';
        deliveryExpressModule.dateTo = '';
        deliveryExpressModule.currentPage = 1;

        const sInput = document.getElementById('trip-search-input');
        const stFilter = document.getElementById('trip-status-filter');
        const cFilter = document.getElementById('trip-courier-filter');
        const dFrom = document.getElementById('trip-date-from');
        const dTo = document.getElementById('trip-date-to');

        if (sInput) sInput.value = '';
        if (stFilter) stFilter.value = 'ALL';
        if (cFilter) cFilter.value = 'ALL';
        if (dFrom) dFrom.value = '';
        if (dTo) dTo.value = '';

        deliveryExpressModule.renderTripsTable();
    },

    // 13. ASIGNACIÓN MANUAL ADMINISTRATIVA CON PROTECCIÓN DE CONCURRENCIA
    openAssignModal: (tripId) => {
        const trip = deliveryExpressModule.resolvedTrips.find(t => t.id === tripId);
        if (!trip) return;

        // Comprobación previa de elegibilidad
        if (trip.operationalStatus !== 'PENDING' && trip.operationalStatus !== 'READY' && trip.operationalStatus !== 'PAYMENT_VERIFYING') {
            if (typeof showToast === 'function') showToast("Esta encomienda ya no está disponible para asignación.", "warning");
            return;
        }

        if (trip.courierInfo.isAssigned) {
            if (typeof showToast === 'function') showToast("🔒 Esta encomienda ya cuenta con motorizado asignado.", "warning");
            return;
        }

        deliveryExpressModule.assignModalTripId = tripId;
        deliveryExpressModule.selectedAssignCourierId = null;
        deliveryExpressModule.assignModalSearchQuery = '';

        const modal = document.getElementById('assign-courier-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        document.getElementById('assign-modal-title').textContent = `Asignar Motorizado a #${trip.id.slice(-6).toUpperCase()}`;
        document.getElementById('assign-modal-subtitle').textContent = `Origen: ${trip.origin?.address || 'Punto A'} → Destino: ${trip.destination?.address || 'Punto B'}`;
        
        const sInput = document.getElementById('assign-courier-search');
        if (sInput) sInput.value = '';

        deliveryExpressModule.renderAssignCouriersList();
    },

    closeAssignModal: () => {
        const modal = document.getElementById('assign-courier-modal');
        if (modal) modal.classList.add('hidden');
        deliveryExpressModule.assignModalTripId = null;
        deliveryExpressModule.selectedAssignCourierId = null;
    },

    onCourierSearchChange: (val) => {
        deliveryExpressModule.assignModalSearchQuery = val;
        deliveryExpressModule.renderAssignCouriersList();
    },

    renderAssignCouriersList: () => {
        const container = document.getElementById('assign-couriers-list');
        const btnConfirm = document.getElementById('btn-confirm-assignment');
        if (!container) return;

        let couriers = Array.from(deliveryExpressModule.couriersCache.values());

        if (deliveryExpressModule.assignModalSearchQuery.trim().length > 0) {
            const q = deliveryExpressModule.assignModalSearchQuery.toLowerCase().trim();
            couriers = couriers.filter(c => {
                const name = (c.name || '').toLowerCase();
                const phone = (c.phone || '').toLowerCase();
                const plate = (c.plate || '').toLowerCase();
                const model = (c.vehicleModel || '').toLowerCase();
                return name.includes(q) || phone.includes(q) || plate.includes(q) || model.includes(q);
            });
        }

        if (couriers.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No se encontraron motorizados activos que coincidan con la búsqueda.</div>`;
            if (btnConfirm) btnConfirm.disabled = true;
            return;
        }

        container.innerHTML = couriers.map(c => {
            const isSelected = deliveryExpressModule.selectedAssignCourierId === c.id;
            const statusIndicator = c.isOnline
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">🟢 Disponible</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">⚪ Desconectado</span>`;

            return `
                <div onclick="deliveryExpressModule.selectCourierForAssignment('${c.id}')" class="p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-600/20 border-indigo-500 shadow-md' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg ${isSelected ? 'border-2 border-indigo-400' : ''}">
                            🛵
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-white text-xs">${c.name}</h4>
                                ${statusIndicator}
                            </div>
                            <p class="text-[11px] text-slate-400 mt-0.5">
                                ${c.plate ? `<span class="font-mono text-indigo-300">Placa: ${c.plate}</span> · ` : ''}
                                <span>${c.phone || 'Tel: N/D'}</span> · 
                                <span class="text-slate-500">${c.municipality}</span>
                            </p>
                        </div>
                    </div>
                    <div>
                        <input type="radio" name="selected-courier-radio" ${isSelected ? 'checked' : ''} class="w-4 h-4 text-indigo-600 focus:ring-0">
                    </div>
                </div>
            `;
        }).join('');

        if (btnConfirm) {
            const hasSelection = Boolean(deliveryExpressModule.selectedAssignCourierId);
            btnConfirm.disabled = !hasSelection || deliveryExpressModule.isExecutingAssignment;
            if (hasSelection && !deliveryExpressModule.isExecutingAssignment) {
                btnConfirm.className = "bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30";
            } else {
                btnConfirm.className = "bg-slate-800 text-slate-500 cursor-not-allowed text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2";
            }
        }
    },

    selectCourierForAssignment: (courierId) => {
        deliveryExpressModule.selectedAssignCourierId = courierId;
        deliveryExpressModule.renderAssignCouriersList();
    },

    confirmAssignment: async () => {
        const tripId = deliveryExpressModule.assignModalTripId;
        const courierId = deliveryExpressModule.selectedAssignCourierId;

        if (!tripId || !courierId || deliveryExpressModule.isExecutingAssignment) return;

        const courier = deliveryExpressModule.couriersCache.get(courierId);
        const courierName = courier?.name || 'Motorizado Asignado';

        deliveryExpressModule.isExecutingAssignment = true;
        const btnConfirm = document.getElementById('btn-confirm-assignment');
        if (btnConfirm) {
            btnConfirm.disabled = true;
            btnConfirm.innerHTML = `<span>⏳</span> Asignando en Firestore...`;
        }

        try {
            const tripRef = db.collection('deliveryTrips').doc(tripId);
            const orderRef = db.collection('orders').doc(tripId);

            // Transacción atómica con verificación estricta de concurrencia
            await db.runTransaction(async (transaction) => {
                const tripSnap = await transaction.get(tripRef);
                if (!tripSnap.exists) {
                    throw new Error("La encomienda solicitada ya no existe en el sistema.");
                }

                const tripData = tripSnap.data() || {};
                const currentStatus = (tripData.status || '').toUpperCase().trim();
                const existingCourier = tripData.assignedCourierId || tripData.courierId || tripData.motorizadoId;

                // 🔒 Lock de Carrera: Si ya fue asignado o aceptado por un repartidor
                if (existingCourier) {
                    throw new Error("🔒 Este delivery ya fue asignado o aceptado por otro motorizado.");
                }

                if (currentStatus !== 'PENDING' && currentStatus !== 'READY' && currentStatus !== 'PAYMENT_VERIFYING' && currentStatus !== '') {
                    throw new Error(`La encomienda no es elegible para asignación (estado actual: ${currentStatus}).`);
                }

                // Verificar si existe orden espejo en /orders
                const orderSnap = await transaction.get(orderRef);
                if (orderSnap.exists) {
                    const orderData = orderSnap.data() || {};
                    const orderCourier = orderData.assignedCourierId || orderData.motorizadoId;
                    if (orderCourier) {
                        throw new Error("🔒 La encomienda ya fue reclamada por un motorizado en la red.");
                    }
                }

                // 1. Mutación atómica en /deliveryTrips (SSOT Dominio B)
                transaction.update(tripRef, {
                    assignedCourierId: courierId,
                    courierId: courierId,
                    motorizadoId: courierId,
                    assignedCourierName: courierName,
                    courierName: courierName,
                    status: 'ASSIGNED',
                    estado: 'asignado',
                    courierPhase: 1,
                    assignedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 2. Si existe espejo en /orders, sincronizar atómicamente para activar FCM
                if (orderSnap.exists) {
                    transaction.update(orderRef, {
                        assignedCourierId: courierId,
                        motorizadoId: courierId,
                        driverName: courierName,
                        assignedCourierName: courierName,
                        status: 'assigned',
                        estado: 'asignado',
                        courierPhase: 1,
                        assignedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            // Registro en auditoría
            await db.collection('audit_events').add({
                action: 'ADMIN_MANUAL_ASSIGNMENT_X2Y',
                module: 'DELIVERY_EXPRESS',
                tripId: tripId,
                assignedCourierId: courierId,
                assignedCourierName: courierName,
                performedBy: (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin_console',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (typeof showToast === 'function') {
                showToast(`Encomienda #${tripId.slice(-6).toUpperCase()} asignada a ${courierName}`, "success");
            } else {
                alert(`Encomienda #${tripId.slice(-6).toUpperCase()} asignada exitosamente a ${courierName}`);
            }

            deliveryExpressModule.closeAssignModal();
        } catch (err) {
            console.error("[DeliveryExpress] Error en asignación administrativa:", err);
            if (typeof showToast === 'function') {
                showToast(err.message, "error");
            } else {
                alert("Error al asignar motorizado: " + err.message);
            }
        } finally {
            deliveryExpressModule.isExecutingAssignment = false;
        }
    },

    // ─── 13b. Cancelación Administrativa Segura (BSD-001) ─────────────────────
    canCancelTrip: (trip) => {
        if (!trip) return false;
        const st = (trip.operationalStatus || trip.status || '').toUpperCase().trim();
        const nonCancellableStatuses = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'PICKED_UP', 'IN_TRANSIT'];
        if (nonCancellableStatuses.includes(st)) return false;
        if (trip.pickedUpAt || trip.pickupArrivedAt) return false;
        return true;
    },

    pendingCancelTripId: null,

    openCancelModal: (tripId) => {
        deliveryExpressModule.pendingCancelTripId = tripId;
        const trip = deliveryExpressModule.resolvedTrips.find(t => t.id === tripId) || deliveryExpressModule.trips.find(t => t.id === tripId);
        if (!trip) return;
        const modal = document.getElementById('cancel-trip-modal');
        if (!modal) return;

        const originAddr = trip.origin?.senderName || trip.originAddress || trip.origin?.address || 'Punto A';
        const destAddr = trip.destination?.recipientName || trip.destinationAddress || trip.destination?.address || 'Punto B';
        const courier = trip.courierInfo?.name || 'Sin asignar';
        const status = trip.operationalStatus || trip.status || 'PENDING';

        const idEl = document.getElementById('cancel-modal-trip-id');
        const sEl = document.getElementById('cancel-modal-sender');
        const dEl = document.getElementById('cancel-modal-dest');
        const cEl = document.getElementById('cancel-modal-courier');
        const stEl = document.getElementById('cancel-modal-status');
        const rEl = document.getElementById('cancel-modal-reason');

        if (idEl) idEl.textContent = `ID: #${tripId.slice(-6).toUpperCase()}`;
        if (sEl) sEl.textContent = originAddr;
        if (dEl) dEl.textContent = destAddr;
        if (cEl) cEl.textContent = courier;
        if (stEl) stEl.textContent = status;
        if (rEl) rEl.value = 'Cancelado administrativamente por la plataforma';

        modal.classList.remove('hidden');
    },

    closeCancelModal: () => {
        deliveryExpressModule.pendingCancelTripId = null;
        const modal = document.getElementById('cancel-trip-modal');
        if (modal) modal.classList.add('hidden');
    },

    confirmCancellation: async () => {
        const tripId = deliveryExpressModule.pendingCancelTripId;
        if (!tripId) return;
        const reason = (document.getElementById('cancel-modal-reason')?.value || '').trim() || 'Cancelado por administración';
        const btn = document.getElementById('btn-confirm-cancel');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="animate-spin inline-block mr-1">⏳</span> Cancelando...';
        }

        try {
            const cancelFn = firebase.functions().httpsCallable('cancelDeliveryTrip');
            await cancelFn({
                tripId: tripId,
                reason: reason,
                actorRole: 'PLATFORM_ADMIN'
            });

            if (typeof showToast === 'function') {
                showToast(`Encomienda #${tripId.slice(-6).toUpperCase()} cancelada exitosamente.`, 'success');
            } else if (typeof toast !== 'undefined' && toast.success) {
                toast.success(`Encomienda #${tripId.slice(-6).toUpperCase()} cancelada exitosamente.`);
            } else {
                alert(`Encomienda #${tripId.slice(-6).toUpperCase()} cancelada exitosamente.`);
            }

            deliveryExpressModule.closeCancelModal();
        } catch (err) {
            console.error('[DeliveryExpress] Error al cancelar viaje:', err);
            const errMsg = err.message || String(err);
            if (typeof showToast === 'function') {
                showToast(`Error al cancelar: ${errMsg}`, 'error');
            } else if (typeof toast !== 'undefined' && toast.error) {
                toast.error(`Error al cancelar: ${errMsg}`);
            } else {
                alert(`Error al cancelar encomienda: ${errMsg}`);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>CONFIRMAR CANCELACIÓN</span>';
            }
        }
    },

    // 14. Modal de Detalle con Mapa Leaflet (Sin Marca de Agua + Telemetría en Tiempo Real)
    openDetailModal: (tripId) => {
        const trip = deliveryExpressModule.resolvedTrips.find(t => t.id === tripId);
        if (!trip) return;
        deliveryExpressModule.selectedTrip = trip;

        const modal = document.getElementById('trip-detail-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        // Textos de Cabecera
        document.getElementById('modal-trip-id').textContent = `Viaje Express #${trip.id.slice(-6).toUpperCase()}`;
        document.getElementById('modal-trip-status').innerHTML = `Estado: ${deliveryExpressModule.getStatusBadge(trip.operationalStatus)}`;
        
        // Puntos de Ruta & Distancia
        document.getElementById('modal-origin-addr').textContent = trip.origin?.address || 'Origen no provisto';
        document.getElementById('modal-dest-addr').textContent = trip.destination?.address || 'Destino no provisto';
        document.getElementById('modal-distance').innerHTML = trip.distanceInfo.display;

        // Datos del Cliente Solicitante
        const clientName = trip.senderName || trip.customerName || trip.userName || trip.clienteNombre || 'Cliente Delivery Express';
        const clientPhone = trip.senderPhone || trip.customerPhone || trip.telefono || 'Sin teléfono provisto';
        const recipientName = trip.recipientName || 'Sin destinatario provisto';
        const recipientPhone = trip.recipientPhone ? `Tel: ${trip.recipientPhone}` : '';
        const packageDesc = trip.packageDescription || trip.notes || trip.instrucciones || 'Sin notas especiales de encomienda';

        const elClientName = document.getElementById('modal-client-name');
        const elClientPhone = document.getElementById('modal-client-phone');
        const elRecipientInfo = document.getElementById('modal-recipient-info');
        const elPackageDesc = document.getElementById('modal-package-desc');

        if (elClientName) elClientName.textContent = clientName;
        if (elClientPhone) elClientPhone.textContent = `📞 ${clientPhone}`;
        if (elRecipientInfo) elRecipientInfo.textContent = recipientPhone ? `${recipientName} · ${recipientPhone}` : recipientName;
        if (elPackageDesc) elPackageDesc.textContent = packageDesc;

        // Desglose Financiero Oficial ADR-026 (SSOT autoritativa de /deliveryTrips)
        const totalAmount = trip.customerTotal != null 
            ? Number(trip.customerTotal) 
            : (trip.canonicalPrice != null ? Number(trip.canonicalPrice) : 0);

        let courierEarnings = 0;
        let platformRevenue = 0;

        if (trip.courierTotalEarnings != null && trip.platformRevenue != null) {
            courierEarnings = Number(trip.courierTotalEarnings);
            platformRevenue = Number(trip.platformRevenue);
        } else if (trip.pricingSnapshot?.courierEarnings != null && trip.pricingSnapshot?.platformRevenue != null) {
            courierEarnings = Number(trip.pricingSnapshot.courierEarnings);
            platformRevenue = Number(trip.pricingSnapshot.platformRevenue);
        } else if (trip.pricingSnapshot && trip.pricingSnapshot.routeDistanceKm) {
            const distKm = Number(trip.pricingSnapshot.routeDistanceKm);
            const ratePerKm = Number(trip.pricingSnapshot.pricePerKm || trip.pricingSnapshot.perKmRate || 10);
            courierEarnings = distKm * ratePerKm;
            const baseFee = Number(trip.pricingSnapshot.baseFee || 35.0);
            const rounding = Number(trip.pricingSnapshot.roundingAdjustment || 0);
            platformRevenue = baseFee + rounding;
        } else {
            // Fallback matemático retrocompatible
            platformRevenue = 35.0;
            courierEarnings = Math.max(0, totalAmount - platformRevenue);
        }

        const elAmount = document.getElementById('modal-amount');
        const elCourierEarn = document.getElementById('modal-courier-earnings');
        const elPlatformRev = document.getElementById('modal-platform-revenue');
        const elPayMethod = document.getElementById('modal-payment-method');
        const elReconStatus = document.getElementById('modal-reconciliation-status');

        if (elAmount) elAmount.textContent = `C$ ${totalAmount.toFixed(2)}`;
        if (elCourierEarn) elCourierEarn.textContent = `C$ ${courierEarnings.toFixed(2)}`;
        if (elPlatformRev) elPlatformRev.textContent = `C$ ${platformRevenue.toFixed(2)}`;
        if (elPayMethod) {
            const pMethod = (trip.paymentMethod || 'Efectivo').toUpperCase();
            elPayMethod.textContent = pMethod === 'WALLET' ? 'Billetera Digital' : (pMethod === 'TRANSFER' ? 'Transferencia' : 'Efectivo');
            elPayMethod.className = pMethod === 'WALLET'
                ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : (pMethod === 'TRANSFER' ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30');
        }
        if (elReconStatus) {
            const recon = trip.financialReconciliationStatus || (trip.financialReconciliation?.status) || 'PENDING';
            if (recon === 'RECONCILED_OK') {
                elReconStatus.textContent = '✅ RECONCILIADO';
                elReconStatus.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            } else if (recon === 'FAIL_CLOSED' || recon === 'DISCREPANCY') {
                elReconStatus.textContent = `⚠️ ${recon}`;
                elReconStatus.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
            } else {
                elReconStatus.textContent = recon;
                elReconStatus.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300';
            }
        }

        // Motorizado Asignado
        const courierDisplay = trip.courierInfo.isAssigned
            ? `${trip.courierInfo.name} ${trip.courierInfo.plate ? `(Placa: ${trip.courierInfo.plate})` : ''} ${trip.courierInfo.phone ? `· Tel: ${trip.courierInfo.phone}` : ''}`
            : (trip.courierInfo.isDataGap ? 'Identidad no preservada (DATA GAP)' : 'Sin motorizado asignado');
        const elCourierName = document.getElementById('modal-courier-name');
        if (elCourierName) elCourierName.textContent = courierDisplay;

        // Badge de Telemetría GPS
        const elGpsBadge = document.getElementById('modal-gps-badge');
        const isFinished = trip.operationalStatus === 'COMPLETED' || trip.operationalStatus === 'CANCELLED';
        if (elGpsBadge) {
            if (isFinished) {
                elGpsBadge.textContent = "⚪ Viaje Concluido";
                elGpsBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700";
            } else if (trip.courierInfo.isAssigned) {
                elGpsBadge.innerHTML = `<span class="animate-ping inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 mr-1"></span> 🟢 Monitoreo GPS Activo`;
                elGpsBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center";
            } else {
                elGpsBadge.textContent = "⏳ Esperando Asignación";
                elGpsBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30";
            }
        }

        // Render Leaflet Map
        setTimeout(() => {
            deliveryExpressModule.initLeafletMap(trip);
        }, 150);
    },

    closeDetailModal: () => {
        const modal = document.getElementById('trip-detail-modal');
        if (modal) modal.classList.add('hidden');

        if (deliveryExpressModule.unsubscribeCourierGps) {
            deliveryExpressModule.unsubscribeCourierGps();
            deliveryExpressModule.unsubscribeCourierGps = null;
        }

        if (deliveryExpressModule.detailMap) {
            deliveryExpressModule.detailMap.remove();
            deliveryExpressModule.detailMap = null;
        }
        deliveryExpressModule.courierMarker = null;
        deliveryExpressModule.courierLivePolyline = null;
    },

    // 15. Inicializador de Mapa Leaflet con OpenStreetMap (Cero Marca de Agua)
    initLeafletMap: (trip) => {
        const mapContainer = document.getElementById('trip-leaflet-map');
        if (!mapContainer || typeof L === 'undefined') return;

        if (deliveryExpressModule.detailMap) {
            deliveryExpressModule.detailMap.remove();
            deliveryExpressModule.detailMap = null;
        }
        if (deliveryExpressModule.unsubscribeCourierGps) {
            deliveryExpressModule.unsubscribeCourierGps();
            deliveryExpressModule.unsubscribeCourierGps = null;
        }
        deliveryExpressModule.courierMarker = null;
        deliveryExpressModule.courierLivePolyline = null;

        // Mapa centrado en Managua
        const map = L.map('trip-leaflet-map', {
            zoomControl: true,
            attributionControl: false
        }).setView([12.1364, -86.2514], 13);

        // OpenStreetMap Standard Tiles (Zero Watermark, Zero Cost)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        deliveryExpressModule.detailMap = map;
        deliveryExpressModule.detailMarkers = [];

        const originLat = trip.origin?.latitude;
        const originLng = trip.origin?.longitude;
        const destLat = trip.destination?.latitude;
        const destLng = trip.destination?.longitude;

        const bounds = [];

        // Marcador Origen A (Celeste)
        if (originLat && originLng) {
            const originIcon = L.divIcon({
                className: 'custom-pin',
                html: `<div style="background:#0284c7;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:2.5px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);">A</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            const mA = L.marker([originLat, originLng], { icon: originIcon }).addTo(map)
                .bindPopup(`<b>Origen (Punto A):</b><br>${trip.origin?.address || 'Punto A'}`);
            bounds.push([originLat, originLng]);
            deliveryExpressModule.detailMarkers.push(mA);
        }

        // Marcador Destino B (Rojo)
        if (destLat && destLng) {
            const destIcon = L.divIcon({
                className: 'custom-pin',
                html: `<div style="background:#e11d48;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;border:2.5px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);">B</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            const mB = L.marker([destLat, destLng], { icon: destIcon }).addTo(map)
                .bindPopup(`<b>Destino (Punto B):</b><br>${trip.destination?.address || 'Punto B'}`);
            bounds.push([destLat, destLng]);
            deliveryExpressModule.detailMarkers.push(mB);
        }

        // Trazado de Polilínea Vial
        const polylineStr = trip.routing?.polyline || trip.polyline || '';
        if (polylineStr) {
            const decodedPoints = deliveryExpressModule.decodePolyline(polylineStr);
            if (decodedPoints.length > 0) {
                const polyline = L.polyline(decodedPoints, {
                    color: '#4f46e5',
                    weight: 6,
                    opacity: 0.85,
                    lineJoin: 'round'
                }).addTo(map);
                deliveryExpressModule.detailPolyline = polyline;
                decodedPoints.forEach(p => bounds.push(p));
            }
        } else if (originLat && originLng && destLat && destLng) {
            // Línea de referencia geodésica si no hay polilínea vial denormalizada
            const straightLine = L.polyline([[originLat, originLng], [destLat, destLng]], {
                color: '#6366f1',
                weight: 3,
                dashArray: '5, 8',
                opacity: 0.7
            }).addTo(map);
            deliveryExpressModule.detailPolyline = straightLine;
        }

        // Suscripción GPS del Motorizado si está asignado
        const courierId = trip.courierInfo?.id;
        const isFinished = trip.operationalStatus === 'COMPLETED' || trip.operationalStatus === 'CANCELLED';

        if (courierId && typeof db !== 'undefined') {
            deliveryExpressModule.activeGpsCourierId = courierId;
            deliveryExpressModule.unsubscribeCourierGps = db.collection('ubicaciones_repartidores').doc(courierId)
                .onSnapshot(doc => {
                    if (doc.exists && deliveryExpressModule.detailMap) {
                        const data = doc.data() || {};
                        const cLat = Number(data.coordenadas?.latitud || data.latitude || data.lat || data.coordinates?.latitude || data.location?.lat);
                        const cLng = Number(data.coordenadas?.longitud || data.longitude || data.lng || data.coordinates?.longitude || data.location?.lng);
                        
                        if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng)) {
                            const courierName = trip.courierInfo?.name || 'Motorizado';
                            const plate = trip.courierInfo?.plate ? ` (${trip.courierInfo.plate})` : '';

                            // Crear o actualizar Marcador del Motorizado
                            if (!deliveryExpressModule.courierMarker) {
                                const motoIcon = L.divIcon({
                                    className: 'custom-moto-pin',
                                    html: `
                                        <div class="relative flex items-center justify-center">
                                            <div style="background:#10b981;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 0 12px rgba(16,185,129,0.7);position:relative;z-index:10;">
                                                🛵
                                            </div>
                                        </div>
                                    `,
                                    iconSize: [34, 34],
                                    iconAnchor: [17, 17]
                                });
                                deliveryExpressModule.courierMarker = L.marker([cLat, cLng], { icon: motoIcon }).addTo(deliveryExpressModule.detailMap)
                                    .bindPopup(`<b>${courierName}${plate}</b><br><span style="font-size:11px;color:#10b981;">🟢 Posición GPS en Tiempo Real</span>`);
                            } else {
                                deliveryExpressModule.courierMarker.setLatLng([cLat, cLng]);
                            }

                            // Si el viaje está en curso, trazar segmento dinámico hacia el destino
                            if (!isFinished && destLat && destLng) {
                                if (!deliveryExpressModule.courierLivePolyline) {
                                    deliveryExpressModule.courierLivePolyline = L.polyline([[cLat, cLng], [destLat, destLng]], {
                                        color: '#10b981',
                                        weight: 4,
                                        dashArray: '4, 8',
                                        opacity: 0.9
                                    }).addTo(deliveryExpressModule.detailMap);
                                } else {
                                    deliveryExpressModule.courierLivePolyline.setLatLngs([[cLat, cLng], [destLat, destLng]]);
                                }
                            }

                            // Incluir posición del motorizado en el encuadre si no está finalizado
                            if (!isFinished) {
                                bounds.push([cLat, cLng]);
                            }
                        }
                    }
                }, err => {
                    console.warn("[DeliveryExpress] Telemetría GPS restringida o desconectada:", err.message);
                });
        }

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    },

    // 16. Decodificador Polyline Google
    decodePolyline: (encoded) => {
        if (!encoded) return [];
        const poly = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push([lat / 1e5, lng / 1e5]);
        }
        return poly;
    },

    // 17. Cargar Configuración de Tarifas (ADR-026 SSOT)
    loadPricingConfig: async () => {
        if (typeof db === 'undefined' || !db) return;
        try {
            const doc = await db.collection('system_config').doc('global').get();
            if (doc.exists) {
                const data = doc.data() || {};
                if (data.xToYPricing) {
                    const pricePerKmVal = data.xToYPricing.pricePerKm != null
                        ? Number(data.xToYPricing.pricePerKm)
                        : (data.xToYPricing.perKmRate != null ? Number(data.xToYPricing.perKmRate) : 15.0);
                    
                    deliveryExpressModule.pricingConfig = {
                        ...deliveryExpressModule.pricingConfig,
                        ...data.xToYPricing,
                        pricePerKm: pricePerKmVal,
                        perKmRate: pricePerKmVal
                    };
                } else {
                    console.info("[DeliveryExpress] /system_config/global existe pero sin xToYPricing. Usando tarifas base.");
                }
            } else {
                console.info("[DeliveryExpress] /system_config/global no encontrado en Firestore. Usando tarifas base.");
            }
        } catch (e) {
            console.error("[DeliveryExpress] Error leyendo /system_config/global:", e);
            if (typeof showToast === 'function') {
                showToast("Atención: No se pudieron cargar las tarifas de Firestore (" + e.message + ")", "warning");
            }
        }

        const canWrite = deliveryExpressModule.canModifyPricing();
        const baseInput = document.getElementById('pricing-base-fee');
        const perKmInput = document.getElementById('pricing-per-km');
        const btnSave = document.getElementById('btn-save-pricing');
        const alertPerms = document.getElementById('pricing-permission-alert');

        if (baseInput) {
            baseInput.value = deliveryExpressModule.pricingConfig.baseFee;
            baseInput.disabled = !canWrite;
        }
        if (perKmInput) {
            perKmInput.value = deliveryExpressModule.pricingConfig.pricePerKm;
            perKmInput.disabled = !canWrite;
        }
        if (btnSave) {
            if (!canWrite) {
                btnSave.disabled = true;
                btnSave.className = "w-full bg-slate-800 text-slate-500 text-xs py-3 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-slate-700";
                btnSave.innerHTML = `<span>🔒</span> Modificación Restringida (Solo Super Admin / Admin)`;
            } else {
                btnSave.disabled = false;
                btnSave.className = "w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30";
                btnSave.innerHTML = `<span>💾</span> Guardar y Sincronizar Tarifas Globales`;
            }
        }
        if (alertPerms) {
            alertPerms.className = canWrite ? "hidden" : "bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2";
        }

        deliveryExpressModule.runSimulator();
    },

    // 18. Guardar Configuración de Tarifas con Auditoría
    savePricingConfig: async () => {
        if (deliveryExpressModule.isSavingPricing) return;

        if (!deliveryExpressModule.canModifyPricing()) {
            if (typeof showToast === 'function') {
                showToast("Acción denegada: Se requiere rol Super Administrador o Administrador para alterar tarifas maestras.", "error");
            } else {
                alert("Acción denegada: Se requiere rol Super Administrador o Administrador.");
            }
            return;
        }

        const baseInput = document.getElementById('pricing-base-fee');
        const perKmInput = document.getElementById('pricing-per-km');
        const btnSave = document.getElementById('btn-save-pricing');

        const baseFee = parseFloat(baseInput?.value);
        const pricePerKm = parseFloat(perKmInput?.value);

        if (isNaN(baseFee) || baseFee < 0 || isNaN(pricePerKm) || pricePerKm < 0) {
            if (typeof showToast === 'function') showToast("Ingrese valores numéricos válidos mayores o iguales a 0", "warning");
            else alert("Valores de tarifas no válidos.");
            return;
        }

        deliveryExpressModule.isSavingPricing = true;
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `<span>⏳</span> Guardando en Firestore...`;
        }

        try {
            const currentUser = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin_console';
            const previousConfig = { ...deliveryExpressModule.pricingConfig };

            const newConfig = {
                baseFee: baseFee,
                pricePerKm: pricePerKm, // Canónico maestro
                perKmRate: pricePerKm,  // Alias legacy retrocompatible
                calculationPolicy: 'KM_BLOCK_2DEC',
                version: 'system_config_global_v1',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser
            };

            // 1. Persistencia en /system_config/global
            await db.collection('system_config').doc('global').set({
                xToYPricing: newConfig
            }, { merge: true });

            // 2. Registro Inmutable en /audit_events
            await db.collection('audit_events').add({
                action: 'UPDATE_X_TO_Y_PRICING',
                module: 'DELIVERY_EXPRESS',
                previousValues: previousConfig,
                newValues: { baseFee, pricePerKm, perKmRate: pricePerKm, calculationPolicy: 'KM_BLOCK_2DEC' },
                performedBy: currentUser,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                source: 'ADMIN_WEB_CONTROL_CENTER'
            });

            deliveryExpressModule.pricingConfig = newConfig;

            if (typeof showToast === 'function') {
                showToast("Tarifas X→Y actualizadas y sincronizadas globalmente (pricePerKm canónico)", "success");
            } else {
                alert("Tarifas actualizadas correctamente.");
            }

            deliveryExpressModule.runSimulator();
        } catch (err) {
            console.error("[DeliveryExpress] Error guardando tarifas:", err);
            if (typeof showToast === 'function') showToast("Error guardando tarifas: " + err.message, "error");
            else alert("Error guardando tarifas: " + err.message);
        } finally {
            deliveryExpressModule.isSavingPricing = false;
            if (btnSave && deliveryExpressModule.canModifyPricing()) {
                btnSave.disabled = false;
                btnSave.innerHTML = `<span>💾</span> Guardar y Sincronizar Tarifas Globales`;
            }
        }
    },

    // 19. Simulador Interactivo
    runSimulator: () => {
        const distInput = document.getElementById('sim-distance-input');
        const baseInput = document.getElementById('pricing-base-fee');
        const perKmInput = document.getElementById('pricing-per-km');

        const rawDist = parseFloat(distInput?.value) || 0.0;
        const baseFee = parseFloat(baseInput?.value) || deliveryExpressModule.pricingConfig.baseFee;
        const pricePerKm = parseFloat(perKmInput?.value) || deliveryExpressModule.pricingConfig.pricePerKm || deliveryExpressModule.pricingConfig.perKmRate;

        // Algoritmo Canónico KM_BLOCK_2DEC
        const roundedDistKm = Math.round(rawDist * 100) / 100;
        const distanceCharge = Math.round((roundedDistKm * pricePerKm) * 100) / 100;
        const totalAmount = Math.round((baseFee + distanceCharge) * 100) / 100;

        const elRaw = document.getElementById('sim-raw-distance');
        const elRounded = document.getElementById('sim-rounded-distance');
        const elBase = document.getElementById('sim-base-fee');
        const elCharge = document.getElementById('sim-distance-charge');
        const elTotal = document.getElementById('sim-total-amount');

        if (elRaw) elRaw.textContent = `${rawDist} km`;
        if (elRounded) elRounded.textContent = `${roundedDistKm.toFixed(2)} km`;
        if (elBase) elBase.textContent = `C$ ${baseFee.toFixed(2)}`;
        if (elCharge) elCharge.textContent = `${roundedDistKm.toFixed(2)} × C$ ${pricePerKm.toFixed(2)} = C$ ${distanceCharge.toFixed(2)}`;
        const customerTotal = Math.ceil(totalAmount);
        const roundingAdjustment = Math.round((customerTotal - totalAmount) * 100) / 100;
        const platformRevenue = Math.round((customerTotal - distanceCharge) * 100) / 100;

        if (elTotal) elTotal.textContent = `C$ ${customerTotal.toFixed(2)} (Ceil: +C$ ${roundingAdjustment.toFixed(2)})`;
    },

    // ═════════════════════════════════════════════════════════════════════════
    // GESTIÓN DE TRANSFERENCIAS BANCARIAS Y COMPROBANTES (X→Y)
    // ═════════════════════════════════════════════════════════════════════════
    // GESTIÓN DE VERIFICACIÓN DE TRANSFERENCIAS BANCARIAS (BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001)
    // ═════════════════════════════════════════════════════════════════════════
    rejectModalTripId: null,

    renderTransfersTable: () => {
        const tbody = document.getElementById('transfers-table-body');
        const badgePending = document.getElementById('badge-pending-transfers');
        const kpiPending = document.getElementById('kpi-transfers-pending');
        const kpiVerified = document.getElementById('kpi-transfers-verified');
        const kpiRejected = document.getElementById('kpi-transfers-rejected');

        // Filtrar viajes con pago por transferencia
        const transferTrips = deliveryExpressModule.trips.filter(t => {
            const pMethod = (t.paymentMethod || '').trim().toLowerCase();
            const pStatus = (t.paymentStatus || '').trim().toLowerCase();
            const status = (t.status || '').trim().toUpperCase();
            return pMethod === 'transferencia' || status === 'PAYMENT_VERIFYING' || pStatus === 'pending_verification' || pStatus === 'payment_verifying' || t.receiptUrl || t.receiptPath;
        });

        let pendingCount = 0;
        let verifiedCount = 0;
        let rejectedCount = 0;

        transferTrips.forEach(t => {
            const status = (t.status || '').toUpperCase();
            const pStatus = (t.paymentStatus || '').toUpperCase();
            const isVerified = t.paymentVerified === true || pStatus === 'VERIFIED' || pStatus === 'APPROVED';
            const isRejected = status === 'PAYMENT_REJECTED' || pStatus === 'REJECTED';

            if (isVerified) {
                verifiedCount++;
            } else if (isRejected) {
                rejectedCount++;
            } else {
                pendingCount++;
            }
        });

        if (badgePending) {
            if (pendingCount > 0) {
                badgePending.textContent = pendingCount;
                badgePending.classList.remove('hidden');
            } else {
                badgePending.classList.add('hidden');
            }
        }
        if (kpiPending) kpiPending.textContent = pendingCount;
        if (kpiVerified) kpiVerified.textContent = verifiedCount;
        if (kpiRejected) kpiRejected.textContent = rejectedCount;

        if (!tbody) return;

        if (transferTrips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-500">No hay encomiendas registradas con método de transferencia.</td></tr>';
            return;
        }

        tbody.innerHTML = transferTrips.map(trip => {
            const pStatus = (trip.paymentStatus || '').toUpperCase();
            const status = (trip.status || '').toUpperCase();
            const isVerified = trip.paymentVerified === true || pStatus === 'VERIFIED' || pStatus === 'APPROVED';
            const isRejected = status === 'PAYMENT_REJECTED' || pStatus === 'REJECTED';
            const isPending = !isVerified && !isRejected;

            const dateStr = trip.createdAt ? (trip.createdAt.toDate ? trip.createdAt.toDate().toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : new Date(trip.createdAt).toLocaleString('es-NI')) : '-';
            const customerTotal = Number(trip.deliveryFee || trip.calculatedFee || trip.customerOffer || 0);
            const receiptUrl = (trip.receiptUrl || '').trim();
            const receiptPath = (trip.receiptPath || '').trim();

            const isLocalFile = receiptUrl.startsWith('file:') || receiptUrl.includes('/data/user/') || receiptUrl.includes('/cache/');

            let voucherHtml = '';
            if (isLocalFile) {
                console.warn(`[DeliveryExpress] Comprobante en ruta local no accesible para #${trip.id}:`, receiptUrl);
                voucherHtml = `
                    <button onclick="deliveryExpressModule.openVoucherModal('${receiptUrl}', '${trip.id}')" class="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto hover:bg-amber-500/20 transition" title="Ruta local en Android">
                        <span>⚠️</span> Local
                    </button>
                `;
            } else if (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://')) {
                voucherHtml = `
                    <button onclick="deliveryExpressModule.openVoucherModal('${receiptUrl}', '${trip.id}')" class="group relative inline-block">
                        <img src="${receiptUrl}" alt="Voucher" class="w-10 h-10 object-cover rounded-lg border border-slate-700 group-hover:border-indigo-500 transition shadow" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-amber-400 text-[10px]\\'>⚠️ Error</span>';">
                        <span class="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 text-[9px]">🔍</span>
                    </button>
                `;
            } else if (receiptPath) {
                voucherHtml = `
                    <button onclick="deliveryExpressModule.openVoucherPathModal('${receiptPath}', '${trip.id}')" class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition border border-indigo-500/30 flex items-center gap-1 mx-auto" title="Cargar desde Firebase Storage">
                        <span>☁️</span> Ver
                    </button>
                `;
            } else {
                voucherHtml = `<span class="text-slate-500 italic text-[11px]">Sin voucher</span>`;
            }

            return `
                <tr class="hover:bg-slate-800/40 transition">
                    <td class="p-3.5">
                        <div class="font-mono font-bold text-white">#${trip.id.slice(-6).toUpperCase()}</div>
                        <div class="text-[10px] text-slate-500">${dateStr}</div>
                    </td>
                    <td class="p-3.5">
                        <div class="text-white font-bold">${trip.senderName || 'Remitente'}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${trip.senderPhone || '-'}</div>
                    </td>
                    <td class="p-3.5">
                        <div class="text-white font-bold">${trip.recipientName || 'Destinatario'}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${trip.recipientPhone || '-'}</div>
                    </td>
                    <td class="p-3.5">
                        <span class="font-black text-emerald-400 text-sm">C$ ${customerTotal.toFixed(2)}</span>
                    </td>
                    <td class="p-3.5">
                        <span class="font-mono font-bold text-indigo-300 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">${trip.referenceNumber || trip.referencia || 'S/N'}</span>
                    </td>
                    <td class="p-3.5 text-center">
                        ${voucherHtml}
                    </td>
                    <td class="p-3.5 text-center">
                        ${isVerified ? `
                            <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold text-[10px]">
                                ✓ VERIFICADO
                            </span>
                        ` : isRejected ? `
                            <span class="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-bold text-[10px]" title="${trip.rejectionReason || trip.paymentRejectionReason || ''}">
                                ✕ RECHAZADO
                            </span>
                        ` : `
                            <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold text-[10px] animate-pulse">
                                ⏳ POR VERIFICAR
                            </span>
                        `}
                    </td>
                    <td class="p-3.5 text-right">
                        ${isPending ? `
                            <div class="flex items-center justify-end gap-1.5">
                                <button onclick="deliveryExpressModule.verifyTransfer('${trip.id}')" title="Aprobar Transferencia y Enviar a Pool" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow">
                                    <span>✓</span> Aprobar
                                </button>
                                <button onclick="deliveryExpressModule.openRejectModal('${trip.id}')" title="Rechazar Transferencia" class="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition border border-rose-500/30">
                                    ✕
                                </button>
                            </div>
                        ` : isRejected ? `
                            <button onclick="deliveryExpressModule.openRejectModal('${trip.id}')" title="Ver o Modificar Rechazo" class="text-rose-400 hover:text-rose-300 text-[11px] underline">
                                Ver motivo
                            </button>
                        ` : `
                            <span class="text-slate-500 text-[11px]">-</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    },

    openVoucherModal: (url, tripId) => {
        const modal = document.getElementById('voucher-preview-modal');
        const img = document.getElementById('voucher-modal-image');
        const title = document.getElementById('voucher-modal-trip-id');
        const dlLink = document.getElementById('voucher-modal-download');
        const errorDiv = document.getElementById('voucher-modal-error');
        const errorMsg = document.getElementById('voucher-modal-error-msg');
        const errorSub = document.getElementById('voucher-modal-error-sub');
        const refEl = document.getElementById('voucher-modal-ref');
        const amountEl = document.getElementById('voucher-modal-amount');
        const dateEl = document.getElementById('voucher-modal-date');
        if (!modal) return;

        const trip = deliveryExpressModule.trips.find(t => t.id === tripId);
        if (title) title.textContent = `ID Encomienda: #${tripId.slice(-6).toUpperCase()}`;

        // Metadatos
        if (refEl) refEl.textContent = trip?.referenceNumber || trip?.referencia || 'S/N';
        if (amountEl) {
            const total = Number(trip?.deliveryFee || trip?.calculatedFee || trip?.customerOffer || 0);
            amountEl.textContent = `C$ ${total.toFixed(2)}`;
        }
        if (dateEl) {
            dateEl.textContent = trip?.createdAt ? (trip.createdAt.toDate ? trip.createdAt.toDate().toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : new Date(trip.createdAt).toLocaleString('es-NI')) : '-';
        }

        const isLocalFile = url.startsWith('file:') || url.includes('/data/user/') || url.includes('/cache/');

        if (isLocalFile) {
            console.warn(`[DeliveryExpress] Comprobante en sandbox local de Android no accesible por web: ${url}`);
            if (img) img.classList.add('hidden');
            if (errorDiv) {
                errorDiv.classList.remove('hidden');
                if (errorMsg) errorMsg.textContent = '⚠️ Comprobante no disponible en almacenamiento remoto';
                if (errorSub) errorSub.textContent = `El comprobante (${url}) reside exclusivamente en el dispositivo Android del cliente y no fue cargado a Firebase Storage.`;
            }
            if (dlLink) dlLink.classList.add('hidden');
        } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            if (errorDiv) errorDiv.classList.add('hidden');
            if (img) {
                img.classList.remove('hidden');
                img.src = url;
                img.onerror = () => {
                    img.classList.add('hidden');
                    if (errorDiv) {
                        errorDiv.classList.remove('hidden');
                        if (errorMsg) errorMsg.textContent = '⚠️ No se pudo cargar el comprobante';
                        if (errorSub) errorSub.textContent = 'El enlace remoto no está accesible o expiró el token de Cloud Storage.';
                    }
                };
            }
            if (dlLink) {
                dlLink.classList.remove('hidden');
                dlLink.href = url;
            }
        } else {
            if (img) img.classList.add('hidden');
            if (errorDiv) {
                errorDiv.classList.remove('hidden');
                if (errorMsg) errorMsg.textContent = '⚠️ Sin comprobante cargado';
                if (errorSub) errorSub.textContent = 'No se encontró un archivo ni URL remota para esta transferencia.';
            }
            if (dlLink) dlLink.classList.add('hidden');
        }

        modal.classList.remove('hidden');
    },

    openVoucherPathModal: async (storagePath, tripId) => {
        try {
            if (typeof firebase !== 'undefined' && firebase.storage) {
                const storageRef = firebase.storage().ref(storagePath);
                const url = await storageRef.getDownloadURL();
                deliveryExpressModule.openVoucherModal(url, tripId);
            } else {
                deliveryExpressModule.openVoucherModal('', tripId);
            }
        } catch (e) {
            console.error('[DeliveryExpress] Error obteniendo downloadURL de Storage:', e);
            deliveryExpressModule.openVoucherModal('', tripId);
        }
    },

    closeVoucherModal: () => {
        const modal = document.getElementById('voucher-preview-modal');
        modal?.classList.add('hidden');
        const img = document.getElementById('voucher-modal-image');
        if (img) img.src = '';
    },

    verifyTransfer: async (tripId) => {
        if (!confirm(`¿Confirmas la verificación del comprobante de la encomienda #${tripId.slice(-6).toUpperCase()}?\n\nAl confirmar, la encomienda quedará lista para ser tomada por un motorizado en el Fleet Pool.`)) {
            return;
        }

        try {
            const adminEmail = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin_console';
            const now = firebase.firestore.FieldValue.serverTimestamp();

            // 1. Invocar Callable autoritativo si está disponible
            let callableSuccess = false;
            try {
                if (typeof firebase !== 'undefined' && firebase.functions) {
                    const verifyFn = firebase.functions().httpsCallable('adminVerifyXToYTransfer');
                    const res = await verifyFn({ tripId });
                    if (res && res.data && res.data.success) {
                        callableSuccess = true;
                    }
                }
            } catch (callableErr) {
                console.warn('[DeliveryExpress] Callable adminVerifyXToYTransfer falló o no disponible, usando mutación directa:', callableErr);
            }

            // 2. Fallback de batch si el callable no ejecutó la mutación
            if (!callableSuccess) {
                const batch = db.batch();
                const tripRef = db.collection('deliveryTrips').doc(tripId);
                batch.update(tripRef, {
                    status: 'PENDING',
                    estado: 'pendiente',
                    paymentStatus: 'APPROVED',
                    paymentVerified: true,
                    paymentVerifiedAt: now,
                    paymentVerifiedBy: adminEmail,
                    paymentVerificationAction: 'APPROVED',
                    updatedAt: now
                });

                // Sincronizar en /orders si existe
                const orderRef = db.collection('orders').doc(tripId);
                batch.update(orderRef, {
                    status: 'ready',
                    paymentStatus: 'APPROVED',
                    paymentVerified: true,
                    paymentVerifiedAt: now,
                    paymentVerifiedBy: adminEmail,
                    updatedAt: now
                });

                await batch.commit();

                // Auditoría Inmutable
                await db.collection('audit_events').add({
                    action: 'X2Y_TRANSFER_PAYMENT_VERIFIED',
                    module: 'DELIVERY_EXPRESS',
                    tripId: tripId,
                    performedBy: adminEmail,
                    timestamp: now
                });
            }

            if (typeof showToast === 'function') {
                showToast(`Pago de encomienda #${tripId.slice(-6).toUpperCase()} verificado con éxito. Liberada a despacho.`, 'success');
            } else {
                alert(`Pago verificado con éxito. Encomienda liberada al pool de motorizados.`);
            }
            deliveryExpressModule.renderTransfersTable();
        } catch (e) {
            console.error('[DeliveryExpress] Error al verificar transferencia:', e);
            alert(`Error al verificar transferencia: ${e.message}`);
        }
    },

    openRejectModal: (tripId) => {
        deliveryExpressModule.rejectModalTripId = tripId;
        const modal = document.getElementById('reject-transfer-modal');
        const title = document.getElementById('reject-transfer-modal-trip-id');
        const reasonSelect = document.getElementById('reject-transfer-reason');
        const detailsInput = document.getElementById('reject-transfer-details');

        if (title) title.textContent = `ID: #${tripId.slice(-6).toUpperCase()}`;
        if (reasonSelect) reasonSelect.value = 'Comprobante ilegible';
        if (detailsInput) detailsInput.value = '';

        modal?.classList.remove('hidden');
    },

    closeRejectModal: () => {
        const modal = document.getElementById('reject-transfer-modal');
        modal?.classList.add('hidden');
        deliveryExpressModule.rejectModalTripId = null;
    },

    confirmRejectTransfer: async () => {
        const tripId = deliveryExpressModule.rejectModalTripId;
        if (!tripId) return;

        const reasonSelect = document.getElementById('reject-transfer-reason');
        const detailsInput = document.getElementById('reject-transfer-details');
        const confirmBtn = document.getElementById('btn-confirm-reject-transfer');

        const reason = reasonSelect?.value || 'Comprobante no válido';
        const comments = detailsInput?.value?.trim() || '';

        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Rechazando...';
            }

            const adminEmail = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin_console';
            const now = firebase.firestore.FieldValue.serverTimestamp();

            // 1. Invocar Callable autoritativo si está disponible
            let callableSuccess = false;
            try {
                if (typeof firebase !== 'undefined' && firebase.functions) {
                    const rejectFn = firebase.functions().httpsCallable('adminRejectXToYTransfer');
                    const res = await rejectFn({ tripId, reason, comments });
                    if (res && res.data && res.data.success) {
                        callableSuccess = true;
                    }
                }
            } catch (callableErr) {
                console.warn('[DeliveryExpress] Callable adminRejectXToYTransfer falló o no disponible, usando mutación directa:', callableErr);
            }

            // 2. Fallback de batch si el callable no ejecutó la mutación
            if (!callableSuccess) {
                const fullReason = comments ? `${reason}: ${comments}` : reason;
                const batch = db.batch();
                const tripRef = db.collection('deliveryTrips').doc(tripId);
                batch.update(tripRef, {
                    status: 'PAYMENT_REJECTED',
                    paymentStatus: 'REJECTED',
                    rejectionReason: fullReason,
                    paymentRejectionReason: fullReason,
                    paymentRejectedAt: now,
                    paymentRejectedBy: adminEmail,
                    updatedAt: now
                });

                const orderRef = db.collection('orders').doc(tripId);
                batch.update(orderRef, {
                    status: 'payment_rejected',
                    paymentStatus: 'REJECTED',
                    rejectionReason: fullReason,
                    paymentRejectionReason: fullReason,
                    paymentRejectedAt: now,
                    updatedAt: now
                });

                await batch.commit();

                await db.collection('audit_events').add({
                    action: 'X2Y_TRANSFER_PAYMENT_REJECTED',
                    module: 'DELIVERY_EXPRESS',
                    tripId: tripId,
                    reason: fullReason,
                    performedBy: adminEmail,
                    timestamp: now
                });
            }

            deliveryExpressModule.closeRejectModal();

            if (typeof showToast === 'function') {
                showToast(`Transferencia rechazada para #${tripId.slice(-6).toUpperCase()}.`, 'info');
            } else {
                alert(`Transferencia rechazada correctamente.`);
            }
            deliveryExpressModule.renderTransfersTable();
        } catch (e) {
            console.error('[DeliveryExpress] Error al rechazar transferencia:', e);
            alert(`Error al rechazar transferencia: ${e.message}`);
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirmar Rechazo';
            }
        }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // GESTIÓN DE CUENTAS BANCARIAS (/system_config/bank_accounts)
    // ═════════════════════════════════════════════════════════════════════════
    loadBankAccountsConfig: async () => {
        const container = document.getElementById('bank-accounts-container');
        if (!container) return;

        try {
            deliveryExpressModule.isLoadingBankAccounts = true;
            container.innerHTML = '<p class="text-xs text-slate-500">Cargando cuentas bancarias oficiales...</p>';

            const doc = await db.collection('system_config').doc('bank_accounts').get();
            if (doc.exists && Array.isArray(doc.data().accounts)) {
                deliveryExpressModule.bankAccounts = doc.data().accounts;
            } else {
                deliveryExpressModule.bankAccounts = [
                    { bankName: 'BAC Credomatic (Córdobas)', accountNumber: '365821945', beneficiary: 'BlueSystem Delivery', currency: 'NIO', accountType: 'Corriente' },
                    { bankName: 'Banpro Grupo Promerica (Córdobas)', accountNumber: '10020304050607', beneficiary: 'BlueSystem Delivery', currency: 'NIO', accountType: 'Ahorro' }
                ];
            }

            deliveryExpressModule.renderBankAccountsList();
        } catch (e) {
            console.error('[DeliveryExpress] Error cargando cuentas bancarias:', e);
            container.innerHTML = `<p class="text-xs text-rose-400">Error al cargar cuentas: ${e.message}</p>`;
        } finally {
            deliveryExpressModule.isLoadingBankAccounts = false;
        }
    },

    renderBankAccountsList: () => {
        const container = document.getElementById('bank-accounts-container');
        if (!container) return;

        if (deliveryExpressModule.bankAccounts.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-500 italic">No hay cuentas bancarias configuradas. Pulsa "Agregar Cuenta" para comenzar.</p>';
            return;
        }

        container.innerHTML = deliveryExpressModule.bankAccounts.map((acc, index) => `
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <span>🏦</span> Cuenta #${index + 1}
                    </span>
                    <button onclick="deliveryExpressModule.removeBankAccountRow(${index})" class="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20">
                        Eliminar
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-400 mb-1">Nombre del Banco</label>
                        <input type="text" value="${acc.bankName || ''}" onchange="deliveryExpressModule.bankAccounts[${index}].bankName = this.value" placeholder="ej. BAC Credomatic" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-400 mb-1">Número de Cuenta</label>
                        <input type="text" value="${acc.accountNumber || ''}" onchange="deliveryExpressModule.bankAccounts[${index}].accountNumber = this.value" placeholder="ej. 365821945" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-400 mb-1">Beneficiario / Titular</label>
                        <input type="text" value="${acc.beneficiary || ''}" onchange="deliveryExpressModule.bankAccounts[${index}].beneficiary = this.value" placeholder="ej. BlueSystem Delivery" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none">
                    </div>
                </div>
            </div>
        `).join('');
    },

    addBankAccountRow: () => {
        deliveryExpressModule.bankAccounts.push({
            bankName: '',
            accountNumber: '',
            beneficiary: 'BlueSystem Delivery',
            currency: 'NIO',
            accountType: 'Corriente'
        });
        deliveryExpressModule.renderBankAccountsList();
    },

    removeBankAccountRow: (index) => {
        deliveryExpressModule.bankAccounts.splice(index, 1);
        deliveryExpressModule.renderBankAccountsList();
    },

    saveBankAccountsConfig: async () => {
        const btn = document.getElementById('btn-save-bank-accounts');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳ Guardando...</span>';
        }

        try {
            const adminEmail = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin_console';
            const now = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('system_config').doc('bank_accounts').set({
                accounts: deliveryExpressModule.bankAccounts,
                updatedAt: now,
                updatedBy: adminEmail
            }, { merge: true });

            await db.collection('audit_events').add({
                action: 'BANK_ACCOUNTS_CONFIG_UPDATED',
                module: 'DELIVERY_EXPRESS',
                accountsCount: deliveryExpressModule.bankAccounts.length,
                performedBy: adminEmail,
                timestamp: now
            });

            if (typeof showToast === 'function') {
                showToast('Cuentas bancarias oficiales actualizadas exitosamente.', 'success');
            } else {
                alert('Cuentas bancarias actualizadas correctamente.');
            }
        } catch (e) {
            console.error('[DeliveryExpress] Error al guardar cuentas bancarias:', e);
            alert(`Error al guardar: ${e.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>💾 Guardar Cuentas Bancarias</span>';
            }
        }
    },

};

// Exportar al scope global
window.deliveryExpressModule = deliveryExpressModule;
