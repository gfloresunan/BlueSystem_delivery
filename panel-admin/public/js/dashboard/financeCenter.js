/**
 * FinanceCenterModule — Centro Financiero Enterprise Multi-Tenant v5.5.0
 * BlueSystem Delivery Enterprise — Ops & Governance Control Center
 *
 * Módulo para la supervisión y consolidación financiera de 3 niveles:
 * 1. Nivel Comercio (Single Business)
 * 2. Nivel Tenant / Organización (Multi-Business)
 * 3. Nivel Super Admin (Global Multi-Tenant)
 *
 * Características:
 * - Filtros por Tenant, Comercio y Rango de Fechas (Hoy, Ayer, Mes, Personalizado)
 * - 5 KPIs Financieros autoritativos
 * - Transparencia de Ganancias (Regla #11: Sin costos de producto no se inventan márgenes)
 * - Desglose de Métodos de Pago (Efectivo vs Tarjeta vs Billetera)
 * - Desglose y Drill-down por Comercio
 * - Exportación PDF Oficial de 3 niveles con registro en /audit_events
 * - Prevención estricta contra IDOR y Parameter Tampering
 */

const financeCenterModule = {
    // ── Estado del Módulo ───────────────────────────────────────────────────
    tenantsList: [],
    businessesList: [],
    selectedTenantId: 'ALL',
    selectedBusinessId: 'ALL',
    selectedPeriod: 'TODAY',
    customDateFrom: '',
    customDateTo: '',

    // Caché de Datos Overview
    ordersCache: [],
    eventsCache: [],
    summariesCache: {},
    currentPage: 1,
    pageSize: 15,
    isLoading: false,

    // Estado Sub-Pestañas & Liquidaciones
    currentSubTab: 'overview',
    settlementsList: [],
    settlementsUnsub: null,
    settlementFilterStatus: 'ALL',
    settlementFilterBusinessId: 'ALL',
    settlementsPageSize: 20,
    settlementsCurrentPage: 1,
    settlementsHasNextPage: false,
    settlementsPageCursors: [null],
    settlementsNextCursor: null,
    settlementsIsLoading: false,

    // ── Render Principal ────────────────────────────────────────────────────
    render: async () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 select-none" id="financeCenterRoot">
                <!-- Header Principal -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
                    <div>
                        <div class="flex items-center gap-2.5">
                            <span class="text-2xl bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 text-indigo-400">💰</span>
                            <div>
                                <h2 class="text-xl font-black text-white tracking-tight">Centro Financiero Enterprise Multi-Tenant</h2>
                                <p class="text-xs text-slate-400">Consolidación contable, ingresos brutos, retenciones contractuales y liquidaciones por comercio y tenant</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2.5">
                        <button onclick="financeCenterModule.exportOfficialPdf()" id="btnExportFinancePdf" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                            <span>📄</span> Descargar Reporte PDF
                        </button>
                        <button onclick="financeCenterModule.refreshData()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5">
                            <span>🔄</span> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Sub-Pestañas de Navegación -->
                <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <button onclick="financeCenterModule.switchSubTab('overview')" id="financeSubTabOverview" class="finance-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                        <span>📊</span> Resumen Contable & Órdenes
                    </button>
                    <button onclick="financeCenterModule.switchSubTab('settlements')" id="financeSubTabSettlements" class="finance-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-400 hover:text-slate-200">
                        <span>💼</span> Liquidaciones por Comercio
                        <span id="settlementDisputeCountBadge" class="hidden text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono font-bold">0</span>
                    </button>
                </div>

                <!-- Sub-Pestaña 1: Resumen Contable & Órdenes -->
                <div id="financeOverviewContainer" class="space-y-6">
                    <!-- Barra de Filtros Multi-Tenant & Período -->
                    <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <!-- Selector de Tenant / Organización -->
                        <div class="space-y-1" id="filterTenantContainer">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant / Empresa</label>
                            <select id="financeTenantSelect" onchange="financeCenterModule.onTenantChange(this.value)" class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none">
                                <option value="ALL">🏢 Todos los Tenants (Global)</option>
                            </select>
                        </div>

                        <!-- Selector de Comercio / Sucursal -->
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comercio Afiliado</label>
                            <select id="financeBusinessSelect" onchange="financeCenterModule.onBusinessChange(this.value)" class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none">
                                <option value="ALL">🏬 Todos los Comercios</option>
                            </select>
                        </div>

                        <!-- Selector de Período -->
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período de Consulta</label>
                            <select id="financePeriodSelect" onchange="financeCenterModule.onPeriodChange(this.value)" class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none">
                                <option value="TODAY">📅 Hoy</option>
                                <option value="YESTERDAY">📅 Ayer</option>
                                <option value="THIS_MONTH">📅 Este Mes</option>
                                <option value="CUSTOM">📅 Rango Personalizado</option>
                            </select>
                        </div>

                        <!-- Rango de Fechas (Inputs) -->
                        <div class="space-y-1 flex flex-col justify-end" id="financeCustomDatesContainer" style="display: none;">
                            <div class="flex items-center gap-1.5">
                                <input type="date" id="financeDateFrom" onchange="financeCenterModule.onCustomDateChange()" class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none" />
                                <span class="text-xs text-slate-500">-</span>
                                <input type="date" id="financeDateTo" onchange="financeCenterModule.onCustomDateChange()" class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none" />
                            </div>
                        </div>
                    </div>

                <!-- 5 Tarjetas KPI Principales -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="financeKpiGrid">
                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-blue-500/20 shadow space-y-2">
                        <div class="flex justify-between items-center text-xs text-blue-400 font-semibold uppercase tracking-wider">
                            <span>Ventas Brutas</span>
                            <span class="text-base">📈</span>
                        </div>
                        <h3 class="text-2xl font-black text-blue-300 font-mono" id="kpiGrossRevenue">C$ 0.00</h3>
                        <span class="text-[10px] text-slate-400" id="kpiOrdersCountSub">0 pedidos entregados</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-emerald-500/20 shadow space-y-2">
                        <div class="flex justify-between items-center text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                            <span>Neto Comercios</span>
                            <span class="text-base">💼</span>
                        </div>
                        <h3 class="text-2xl font-black text-emerald-300 font-mono" id="kpiNetRevenue">C$ 0.00</h3>
                        <span class="text-[10px] text-slate-400">Ingreso real tras comisiones</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-rose-500/20 shadow space-y-2">
                        <div class="flex justify-between items-center text-xs text-rose-400 font-semibold uppercase tracking-wider">
                            <span>Comisión Plataforma</span>
                            <span class="text-base">🏷️</span>
                        </div>
                        <h3 class="text-2xl font-black text-rose-300 font-mono" id="kpiPlatformFees">C$ 0.00</h3>
                        <span class="text-[10px] text-slate-400">Retención contractual (15%)</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-amber-500/20 shadow space-y-2">
                        <div class="flex justify-between items-center text-xs text-amber-400 font-semibold uppercase tracking-wider">
                            <span>Ticket Promedio</span>
                            <span class="text-base">🎯</span>
                        </div>
                        <h3 class="text-2xl font-black text-amber-300 font-mono" id="kpiAverageTicket">C$ 0.00</h3>
                        <span class="text-[10px] text-slate-400" id="kpiActiveOrdersSub">Por pedido completado</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/40 shadow space-y-2">
                        <div class="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Ganancia / Margen</span>
                            <span class="text-base">ℹ️</span>
                        </div>
                        <h3 class="text-sm font-black text-slate-300">No disponible</h3>
                        <span class="text-[10px] text-slate-500">Sin estructura de costos de producto</span>
                    </div>
                </div>

                <!-- Desglose por Método de Pago & Desglose por Comercio -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Métodos de Pago -->
                    <div class="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <span>💳</span> <span>Desglose por Método de Pago</span>
                            </h4>
                        </div>
                        <div class="space-y-3 font-mono text-xs">
                            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                                <span class="text-slate-400 flex items-center gap-2">💵 Efectivo (Cash):</span>
                                <strong class="text-emerald-400 font-bold" id="payCashAmount">C$ 0.00</strong>
                            </div>
                            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                                <span class="text-slate-400 flex items-center gap-2">💳 Tarjeta (Card):</span>
                                <strong class="text-blue-400 font-bold" id="payCardAmount">C$ 0.00</strong>
                            </div>
                            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                                <span class="text-slate-400 flex items-center gap-2">📱 Billetera / Otros:</span>
                                <strong class="text-purple-400 font-bold" id="payWalletAmount">C$ 0.00</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Resumen de Comercios en Scope -->
                    <div class="lg:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <span>🏬</span> <span>Consolidado por Comercio</span>
                            </h4>
                            <span class="text-[10px] text-slate-500" id="bizCountInScope">0 comercios activos</span>
                        </div>
                        <div class="max-h-[160px] overflow-y-auto space-y-2" id="businessBreakdownContainer">
                            <p class="text-xs text-slate-500 text-center py-6">Cargando consolidación de comercios...</p>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Transacciones y Órdenes -->
                <div class="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <div class="p-5 border-b border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>📑</span> Registro Detallado de Órdenes y Movimientos
                            </h3>
                            <span class="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full font-mono" id="ordersTableCount">
                                0
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400 font-mono" id="paginationInfo">Página 1</span>
                            <button onclick="financeCenterModule.prevPage()" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition">◀</button>
                            <button onclick="financeCenterModule.nextPage()" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition">▶</button>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                    <th class="py-3 px-4 font-semibold">Pedido ID</th>
                                    <th class="py-3 px-4 font-semibold">Comercio</th>
                                    <th class="py-3 px-4 font-semibold">Fecha & Hora</th>
                                    <th class="py-3 px-4 font-semibold">Método Pago</th>
                                    <th class="py-3 px-4 font-semibold text-right">Venta Total</th>
                                    <th class="py-3 px-4 font-semibold text-right">Comisión</th>
                                    <th class="py-3 px-4 font-semibold text-right">Neto Comercio</th>
                                    <th class="py-3 px-4 font-semibold text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody id="financeOrdersTableBody">
                                <tr>
                                    <td colspan="8" class="text-center py-12 text-slate-500">
                                        Cargando datos contables...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
                <!-- Fin Sub-Pestaña 1 -->

                <!-- Sub-Pestaña 2: Liquidaciones por Comercio -->
                <div id="financeSettlementsContainer" class="space-y-6 hidden">
                    <!-- Settlements KPI Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-slate-900/60 p-4 rounded-2xl border border-amber-500/20 shadow space-y-2">
                            <div class="flex justify-between items-center text-xs text-amber-400 font-semibold uppercase tracking-wider">
                                <span>Pendiente de Pago</span>
                                <span class="text-base">⏳</span>
                            </div>
                            <h3 class="text-2xl font-black text-amber-300 font-mono" id="kpiSettlementPendingPay">C$ 0.00</h3>
                            <span class="text-[10px] text-slate-400" id="kpiSettlementPendingCount">0 pre-liquidaciones listas</span>
                        </div>

                        <div class="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20 shadow space-y-2">
                            <div class="flex justify-between items-center text-xs text-purple-400 font-semibold uppercase tracking-wider">
                                <span>Por Confirmar</span>
                                <span class="text-base">📬</span>
                            </div>
                            <h3 class="text-2xl font-black text-purple-300 font-mono" id="kpiSettlementAwaitingConf">C$ 0.00</h3>
                            <span class="text-[10px] text-slate-400" id="kpiSettlementAwaitingCount">0 en revisión del comercio</span>
                        </div>

                        <div class="bg-slate-900/60 p-4 rounded-2xl border border-rose-500/20 shadow space-y-2">
                            <div class="flex justify-between items-center text-xs text-rose-400 font-semibold uppercase tracking-wider">
                                <span>En Disputa</span>
                                <span class="text-base">⚠️</span>
                            </div>
                            <h3 class="text-2xl font-black text-rose-300 font-mono" id="kpiSettlementDisputed">0</h3>
                            <span class="text-[10px] text-slate-400">Comercios solicitando revisión</span>
                        </div>

                        <div class="bg-slate-900/60 p-4 rounded-2xl border border-emerald-500/20 shadow space-y-2">
                            <div class="flex justify-between items-center text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                                <span>Total Liquidado</span>
                                <span class="text-base">🔒</span>
                            </div>
                            <h3 class="text-2xl font-black text-emerald-300 font-mono" id="kpiSettlementClosed">C$ 0.00</h3>
                            <span class="text-[10px] text-slate-400" id="kpiSettlementClosedCount">0 períodos cerrados e inmutables</span>
                        </div>
                    </div>

                    <!-- Settlements Controls & Actions Bar -->
                    <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <!-- Filtro Comercio -->
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comercio</label>
                                <select id="settlementBizFilter" onchange="financeCenterModule.onSettlementFilterChange()" class="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none">
                                    <option value="ALL">🏬 Todos los Comercios</option>
                                </select>
                            </div>

                            <!-- Filtro Estado -->
                            <div class="space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                                <select id="settlementStatusFilter" onchange="financeCenterModule.onSettlementFilterChange()" class="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none">
                                    <option value="ALL">🔍 Todos los Estados</option>
                                    <option value="DRAFT">Draft / Borrador</option>
                                    <option value="PREPARED">Prepared / Lista</option>
                                    <option value="AWAITING_PAYMENT">Por Pagar</option>
                                    <option value="AWAITING_CONFIRMATION">Awaiting Confirmation</option>
                                    <option value="DISPUTED">⚠️ Disputadas</option>
                                    <option value="CLOSED">🔒 Closed / Inmutable</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <button onclick="financeCenterModule.openConfigModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5">
                                <span>⚙️</span> Configurar Períodos
                            </button>
                            <button onclick="financeCenterModule.openPreSettlementModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                                <span>➕</span> Generar Pre-Liquidación
                            </button>
                        </div>
                    </div>

                    <!-- Tabla de Liquidaciones -->
                    <div class="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span>📑</span> Historial de Liquidaciones por Comercio
                                </h3>
                                <span class="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full font-mono" id="settlementsTableCount">
                                    0
                                </span>
                            </div>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                        <th class="py-3 px-4 font-semibold">Código / ID</th>
                                        <th class="py-3 px-4 font-semibold">Comercio</th>
                                        <th class="py-3 px-4 font-semibold">Período de Corte</th>
                                        <th class="py-3 px-4 font-semibold text-right">Venta Bruta</th>
                                        <th class="py-3 px-4 font-semibold text-right">Comisión</th>
                                        <th class="py-3 px-4 font-semibold text-right">Neto a Pagar</th>
                                        <th class="py-3 px-4 font-semibold text-right">Pagado</th>
                                        <th class="py-3 px-4 font-semibold text-center">Estado</th>
                                        <th class="py-3 px-4 font-semibold text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="settlementsTableBody">
                                    <tr>
                                        <td colspan="9" class="text-center py-12 text-slate-500">
                                            Cargando liquidaciones...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Controles de Paginación -->
                        <div class="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
                            <div class="flex items-center gap-2">
                                <span>Página <strong class="text-white font-bold" id="settlementsCurrentPage">1</strong></span>
                                <span id="settlementsLoadingIndicator" class="text-[11px] text-blue-400 hidden animate-pulse">· Sincronizando...</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button id="btnSettlementsPrev" onclick="financeCenterModule.loadPrevSettlementsPage()" disabled class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition cursor-pointer">
                                    ← Anterior
                                </button>
                                <button id="btnSettlementsNext" onclick="financeCenterModule.loadNextSettlementsPage()" disabled class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition cursor-pointer">
                                    Siguiente →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Fin Sub-Pestaña 2 -->
            </div>
        `;

        await financeCenterModule.initializeScope();
    },

    // ── Inicialización de Alcance & Filtros por Rol ──────────────────────────
    initializeScope: async () => {
        try {
            const authState = await window.AuthReadyGate.waitUntilReady();
            const userRole = (authState.role || '').toUpperCase();
            const userClaims = authState.claims || {};
            const isPlatformAdmin = authState.isPlatformAdmin === true || ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'].includes(userRole);

            // Cargar Organizaciones / Tenants
            const orgs = await governanceService.getOrganizations();
            financeCenterModule.tenantsList = orgs;

            // Cargar Comercios
            const bizSnap = await db.collection('businesses').get();
            const bizList = [];
            bizSnap.forEach(d => {
                const data = d.data() || {};
                const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.isDeleted === true || data.active === false;
                if (!isDeleted) {
                    bizList.push({
                        businessId: d.id,
                        name: data.name || data.comercioNombre || data.nombre || d.id,
                        orgId: data.orgId || data.tenantId || null,
                        tenantId: data.tenantId || data.orgId || null,
                        status: data.status || 'ACTIVE',
                    });
                }
            });
            financeCenterModule.businessesList = bizList;

            // Poblar Selectores
            const tenantSelect = document.getElementById('financeTenantSelect');
            const tenantContainer = document.getElementById('filterTenantContainer');

            if (tenantSelect) {
                tenantSelect.innerHTML = '<option value="ALL">🏢 Todos los Tenants (Global)</option>';
                orgs.forEach(o => {
                    tenantSelect.innerHTML += `<option value="${o.orgId}">🏢 ${o.nombre || o.orgId}</option>`;
                });
            }

            // Aislamiento por Rol (EIAM v3)
            if (!isPlatformAdmin) {
                // Tenant Admin Scope
                const userTenantId = userClaims.tenantId || userClaims.orgId;
                if (userTenantId) {
                    financeCenterModule.selectedTenantId = userTenantId;
                    if (tenantSelect) {
                        tenantSelect.value = userTenantId;
                        tenantSelect.disabled = true;
                    }
                    if (tenantContainer) {
                        tenantContainer.title = "Restringido al tenant del usuario autenticado";
                    }
                }
            }

            financeCenterModule.updateBusinessDropdown();
            await financeCenterModule.fetchFinancialData();
        } catch (err) {
            console.error('[FINANCE_CENTER] Error en inicialización de alcance:', err);
        }
    },

    // ── Actualizar Dropdown de Negocios según Tenant Seleccionado ────────────
    updateBusinessDropdown: () => {
        const bizSelect = document.getElementById('financeBusinessSelect');
        if (!bizSelect) return;

        const tenantId = financeCenterModule.selectedTenantId;
        const filteredBiz = tenantId === 'ALL'
            ? financeCenterModule.businessesList
            : financeCenterModule.businessesList.filter(b => b.orgId === tenantId || b.tenantId === tenantId);

        bizSelect.innerHTML = '<option value="ALL">🏬 Todos los Comercios</option>';
        filteredBiz.forEach(b => {
            bizSelect.innerHTML += `<option value="${b.businessId}">🏬 ${b.name}</option>`;
        });

        // Poblar también el selector de la pestaña de liquidaciones
        const settlementBizSelect = document.getElementById('settlementBizFilter');
        if (settlementBizSelect) {
            settlementBizSelect.innerHTML = '<option value="ALL">🏬 Todos los Comercios</option>';
            filteredBiz.forEach(b => {
                settlementBizSelect.innerHTML += `<option value="${b.businessId}">🏬 ${b.name}</option>`;
            });
            if (financeCenterModule.settlementFilterBusinessId !== 'ALL') {
                settlementBizSelect.value = financeCenterModule.settlementFilterBusinessId;
            }
        }

        // Reset business selection if not in filtered list
        if (financeCenterModule.selectedBusinessId !== 'ALL') {
            const exists = filteredBiz.some(b => b.businessId === financeCenterModule.selectedBusinessId);
            if (!exists) {
                financeCenterModule.selectedBusinessId = 'ALL';
                bizSelect.value = 'ALL';
            }
        }
    },

    onTenantChange: (tenantId) => {
        financeCenterModule.selectedTenantId = tenantId;
        financeCenterModule.updateBusinessDropdown();
        financeCenterModule.fetchFinancialData();
    },

    onBusinessChange: (bizId) => {
        financeCenterModule.selectedBusinessId = bizId;
        financeCenterModule.fetchFinancialData();
    },

    onPeriodChange: (period) => {
        financeCenterModule.selectedPeriod = period;
        const customContainer = document.getElementById('financeCustomDatesContainer');
        if (customContainer) {
            customContainer.style.display = period === 'CUSTOM' ? 'flex' : 'none';
        }
        if (period !== 'CUSTOM') {
            financeCenterModule.fetchFinancialData();
        }
    },

    onCustomDateChange: () => {
        const from = document.getElementById('financeDateFrom')?.value;
        const to = document.getElementById('financeDateTo')?.value;
        financeCenterModule.customDateFrom = from || '';
        financeCenterModule.customDateTo = to || '';
        if (from && to) {
            financeCenterModule.fetchFinancialData();
        }
    },

    // ── Carga y Procesamiento Contable de Datos ───────────────────────────────
    fetchFinancialData: async () => {
        financeCenterModule.isLoading = true;
        const tbody = document.getElementById('financeOrdersTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-slate-400">Calculando indicadores financieros...</td></tr>`;
        }

        try {
            // Calcular Límites de Fecha
            const now = new Date();
            let startBoundary = null;
            let endBoundary = null;

            if (financeCenterModule.selectedPeriod === 'TODAY') {
                startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            } else if (financeCenterModule.selectedPeriod === 'YESTERDAY') {
                const yest = new Date(now);
                yest.setDate(yest.getDate() - 1);
                startBoundary = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
                endBoundary = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
            } else if (financeCenterModule.selectedPeriod === 'THIS_MONTH') {
                startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endBoundary = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            } else if (financeCenterModule.selectedPeriod === 'CUSTOM') {
                if (financeCenterModule.customDateFrom) {
                    const [y, m, d] = financeCenterModule.customDateFrom.split('-').map(Number);
                    startBoundary = new Date(y, m - 1, d, 0, 0, 0, 0);
                }
                if (financeCenterModule.customDateTo) {
                    const [y, m, d] = financeCenterModule.customDateTo.split('-').map(Number);
                    endBoundary = new Date(y, m - 1, d, 23, 59, 59, 999);
                }
            }

            // 1. Resolver configuración dinámica de comisiones desde SSOT canónico (/system_config/global)
            let platformFeePercent = 0.15; // Fallback canónico: 15%
            try {
                const globalDoc = await db.collection('system_config').doc('global').get();
                if (globalDoc.exists && globalDoc.data()?.merchantCommissionRate != null) {
                    platformFeePercent = Number(globalDoc.data().merchantCommissionRate);
                }
            } catch (e) {
                console.warn("[FINANCE_CENTER] /system_config/global no disponible, usando fallback 15%");
            }
            financeCenterModule.platformFeePercent = platformFeePercent;

            // 2. Construir Query de /orders autoritativa sin truncamiento artificial
            let query = db.collection('orders');

            if (financeCenterModule.selectedBusinessId !== 'ALL') {
                query = query.where('businessId', '==', financeCenterModule.selectedBusinessId);
            }

            // Ejecutar consulta completa para el alcance (sin truncar a 300)
            const snap = await query.get();
            const validOrders = [];

            snap.forEach(doc => {
                const data = doc.data() || {};
                const orderDate = liveOrdersModule.normalizeDate(data.createdAt || data.fecha || data.timestamp);

                // Filtrar por Límite de Fecha
                if (startBoundary && orderDate && orderDate < startBoundary) return;
                if (endBoundary && orderDate && orderDate > endBoundary) return;

                // Filtrar por Tenant si no se filtró por business individual
                const bizId = data.businessId || data.comercioId || data.restaurantId;
                if (financeCenterModule.selectedTenantId !== 'ALL') {
                    const biz = financeCenterModule.businessesList.find(b => b.businessId === bizId);
                    const orderTenant = data.tenantId || data.orgId || (biz ? (biz.tenantId || biz.orgId) : null);
                    if (orderTenant !== financeCenterModule.selectedTenantId) return;
                }

                const totalMoney = liveOrdersModule.normalizeMoney(data.total || data.totalAmount || data.amount || 0);
                const subtotalMoney = liveOrdersModule.normalizeMoney(data.subtotal || 0);
                const discountMoney = liveOrdersModule.normalizeMoney(data.discountAmount || data.couponDiscount || 0);
                const deliveryFeeMoney = liveOrdersModule.normalizeMoney(data.deliveryFee || 0);
                const tipMoney = liveOrdersModule.normalizeMoney(data.tipAmount || data.tip || 0);
                const addChargeMoney = liveOrdersModule.normalizeMoney(data.additionalChargeAmount || data.additionalCharge || 0);

                const merchantGrossSales = liveOrdersModule.normalizeMoney(
                    data.merchantGrossSales ?? (subtotalMoney > 0 ? Math.max(0, subtotalMoney - discountMoney) : totalMoney)
                );
                const commissionRate = data.merchantCommissionRate != null ? Number(data.merchantCommissionRate) : (financeCenterModule.platformFeePercent || 0.15);
                const commissionAmount = data.merchantCommissionAmount != null ? Number(data.merchantCommissionAmount) : Math.round(merchantGrossSales * commissionRate * 100) / 100;
                const netPayout = data.merchantNetPayout != null ? Number(data.merchantNetPayout) : Math.max(0, Math.round((merchantGrossSales - commissionAmount) * 100) / 100);

                const status = (data.status || data.estado || 'PENDING').toString().toUpperCase();
                const paymentMethod = (data.paymentMethod || data.metodoPago || 'efectivo').toString().toLowerCase();

                validOrders.push({
                    orderId: doc.id,
                    orderCode: data.orderCode || data.codigoPedido || '',
                    orderShortCode: data.orderShortCode || data.codigoCorto || '',
                    businessId: bizId || 'Desconocido',
                    businessName: data.businessName || data.comercioNombre || (financeCenterModule.businessesList.find(b => b.businessId === bizId)?.name) || 'Comercio',
                    tenantId: data.tenantId || data.orgId || null,
                    total: totalMoney,
                    merchantGrossSales,
                    commissionRate,
                    commissionAmount,
                    netPayout,
                    deliveryFee: deliveryFeeMoney,
                    tipAmount: tipMoney,
                    additionalChargeAmount: addChargeMoney,
                    status,
                    isDelivered: ['DELIVERED', 'ENTREGADO', 'COMPLETED', 'COMPLETADO'].includes(status),
                    isCancelled: ['CANCELLED', 'CANCELADO', 'REJECTED', 'RECHAZADO'].includes(status),
                    paymentMethod,
                    createdAt: orderDate,
                });
            });

            // Ordenar por fecha descendente
            validOrders.sort((a, b) => {
                const tA = a.createdAt ? a.createdAt.getTime() : 0;
                const tB = b.createdAt ? b.createdAt.getTime() : 0;
                return tB - tA;
            });

            financeCenterModule.ordersCache = validOrders;
            financeCenterModule.currentPage = 1;
            financeCenterModule.calculateAndRenderMetrics();
        } catch (err) {
            console.error('[FINANCE_CENTER] Error cargando datos contables:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-rose-400">Error al cargar datos financieros. Verifique permisos y conexión.</td></tr>`;
            }
        } finally {
            financeCenterModule.isLoading = false;
        }
    },

    // ── Cálculo y Renderizado de KPIs ───────────────────────────────────────
    calculateAndRenderMetrics: () => {
        const orders = financeCenterModule.ordersCache;
        let grossRevenue = 0;
        let platformFees = 0;
        let netRevenue = 0;
        let deliveredCount = 0;
        let cancelledCount = 0;

        let payCash = 0;
        let payCard = 0;
        let payWallet = 0;

        const businessAggregates = {};

        orders.forEach(ord => {
            if (ord.isDelivered) {
                grossRevenue += ord.merchantGrossSales;
                platformFees += ord.commissionAmount;
                netRevenue += ord.netPayout;
                deliveredCount++;

                // Desglose Pago (total recaudado al cliente)
                if (ord.paymentMethod.includes('tarjeta') || ord.paymentMethod.includes('card')) {
                    payCard += ord.total;
                } else if (ord.paymentMethod.includes('billetera') || ord.paymentMethod.includes('wallet') || ord.paymentMethod.includes('transfer')) {
                    payWallet += ord.total;
                } else {
                    payCash += ord.total;
                }

                // Agregación por Comercio
                if (!businessAggregates[ord.businessId]) {
                    businessAggregates[ord.businessId] = {
                        name: ord.businessName,
                        gross: 0,
                        commission: 0,
                        net: 0,
                        count: 0,
                    };
                }
                businessAggregates[ord.businessId].gross += ord.merchantGrossSales;
                businessAggregates[ord.businessId].commission += ord.commissionAmount;
                businessAggregates[ord.businessId].net += ord.netPayout;
                businessAggregates[ord.businessId].count++;
            } else if (ord.isCancelled) {
                cancelledCount++;
            }
        });

        const avgTicket = deliveredCount > 0 ? (grossRevenue / deliveredCount) : 0;

        // Render KPIs
        const elGross = document.getElementById('kpiGrossRevenue');
        const elNet = document.getElementById('kpiNetRevenue');
        const elFees = document.getElementById('kpiPlatformFees');
        const elAvg = document.getElementById('kpiAverageTicket');
        const elOrdersSub = document.getElementById('kpiOrdersCountSub');

        if (elGross) elGross.textContent = liveOrdersModule.formatCurrency(grossRevenue);
        if (elNet) elNet.textContent = liveOrdersModule.formatCurrency(netRevenue);
        if (elFees) elFees.textContent = liveOrdersModule.formatCurrency(platformFees);
        if (elAvg) elAvg.textContent = liveOrdersModule.formatCurrency(avgTicket);
        if (elOrdersSub) elOrdersSub.textContent = `${deliveredCount} entregados · ${cancelledCount} cancelados`;

        // Render Métodos de Pago
        const elCash = document.getElementById('payCashAmount');
        const elCard = document.getElementById('payCardAmount');
        const elWallet = document.getElementById('payWalletAmount');

        if (elCash) elCash.textContent = liveOrdersModule.formatCurrency(payCash);
        if (elCard) elCard.textContent = liveOrdersModule.formatCurrency(payCard);
        if (elWallet) elWallet.textContent = liveOrdersModule.formatCurrency(payWallet);

        // Render Consolidado por Comercio
        const bizContainer = document.getElementById('businessBreakdownContainer');
        const elBizCount = document.getElementById('bizCountInScope');
        const bizKeys = Object.keys(businessAggregates);

        if (elBizCount) elBizCount.textContent = `${bizKeys.length} comercios con ventas`;

        if (bizContainer) {
            if (bizKeys.length === 0) {
                bizContainer.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">Sin ventas registradas para el período seleccionado.</p>`;
            } else {
                bizContainer.innerHTML = bizKeys.map(k => {
                    const b = businessAggregates[k];
                    return `
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                            <div>
                                <strong class="text-slate-200 block">${b.name}</strong>
                                <span class="text-[10px] text-slate-400">${b.count} pedidos · Comisión: ${liveOrdersModule.formatCurrency(b.commission)}</span>
                            </div>
                            <div class="text-right">
                                <span class="font-bold text-emerald-400 block">${liveOrdersModule.formatCurrency(b.net)}</span>
                                <span class="text-[10px] text-slate-500 font-mono">Venta Bruta: ${liveOrdersModule.formatCurrency(b.gross)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        financeCenterModule.renderTable();
    },

    // ── Renderizado Paginado de la Tabla ─────────────────────────────────────
    renderTable: () => {
        const tbody = document.getElementById('financeOrdersTableBody');
        const orders = financeCenterModule.ordersCache;
        const totalCount = orders.length;

        const tableCountEl = document.getElementById('ordersTableCount');
        if (tableCountEl) tableCountEl.textContent = totalCount;

        const page = financeCenterModule.currentPage;
        const size = financeCenterModule.pageSize;
        const totalPages = Math.ceil(totalCount / size) || 1;

        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) paginationInfo.textContent = `Página ${page} de ${totalPages} (${totalCount} órdenes)`;

        if (!tbody) return;

        if (totalCount === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-slate-500">No se encontraron transacciones para el filtro seleccionado.</td></tr>`;
            return;
        }

        const start = (page - 1) * size;
        const pageOrders = orders.slice(start, start + size);

        tbody.innerHTML = pageOrders.map(ord => {
            const gross = ord.isDelivered ? ord.merchantGrossSales : 0;
            const fee = ord.isDelivered ? ord.commissionAmount : 0;
            const net = ord.isDelivered ? ord.netPayout : 0;
            const dateStr = ord.createdAt ? ord.createdAt.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

            return `
                <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition font-mono text-xs">
                    <td class="py-3 px-4 font-bold text-slate-300">
                        <span title="${ord.orderCode ? `${ord.orderCode} (${ord.orderId})` : ord.orderId}">${ord.orderCode || '#' + ord.orderId.slice(-6).toUpperCase()}</span>
                    </td>
                    <td class="py-3 px-4 font-sans text-slate-300 truncate max-w-[150px]">${ord.businessName}</td>
                    <td class="py-3 px-4 text-slate-400">${dateStr}</td>
                    <td class="py-3 px-4 capitalize text-slate-300">${ord.paymentMethod}</td>
                    <td class="py-3 px-4 text-right">
                        <span class="font-bold text-slate-100 block">${liveOrdersModule.formatCurrency(gross)}</span>
                        <span class="text-[10px] text-slate-500 font-mono">Pago: ${liveOrdersModule.formatCurrency(ord.total)}</span>
                    </td>
                    <td class="py-3 px-4 text-right text-rose-400 font-bold">${liveOrdersModule.formatCurrency(fee)}</td>
                    <td class="py-3 px-4 text-right font-bold text-emerald-400">${liveOrdersModule.formatCurrency(net)}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.isDelivered ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            ord.isCancelled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }">
                            ${ord.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    prevPage: () => {
        if (financeCenterModule.currentPage > 1) {
            financeCenterModule.currentPage--;
            financeCenterModule.renderTable();
        }
    },

    nextPage: () => {
        const totalPages = Math.ceil(financeCenterModule.ordersCache.length / financeCenterModule.pageSize) || 1;
        if (financeCenterModule.currentPage < totalPages) {
            financeCenterModule.currentPage++;
            financeCenterModule.renderTable();
        }
    },

    refreshData: () => {
        financeCenterModule.fetchFinancialData();
    },

    // ── Exportación Oficial PDF Multi-Tenant ─────────────────────────────────
    exportOfficialPdf: async () => {
        const orders = financeCenterModule.ordersCache;
        if (orders.length === 0) {
            alert("No hay datos financieros en el período seleccionado para exportar.");
            return;
        }

        const authState = await window.AuthReadyGate.waitUntilReady();
        const user = authState.user;
        const tenant = financeCenterModule.tenantsList.find(t => t.orgId === financeCenterModule.selectedTenantId);
        const tenantName = tenant ? tenant.nombre : (financeCenterModule.selectedTenantId === 'ALL' ? 'Ecosistema Global' : financeCenterModule.selectedTenantId);
        const bizName = financeCenterModule.selectedBusinessId === 'ALL' ? 'Todos los Comercios' : (financeCenterModule.businessesList.find(b => b.businessId === financeCenterModule.selectedBusinessId)?.name || financeCenterModule.selectedBusinessId);

        let gross = 0;
        let deliveredCount = 0;
        let payCash = 0;
        let payCard = 0;
        let payWallet = 0;

        orders.forEach(o => {
            if (o.isDelivered) {
                gross += o.total;
                deliveredCount++;
                if (o.paymentMethod.includes('tarjeta') || o.paymentMethod.includes('card')) payCard += o.total;
                else if (o.paymentMethod.includes('billetera') || o.paymentMethod.includes('wallet')) payWallet += o.total;
                else payCash += o.total;
            }
        });

        const fees = gross * 0.15;
        const net = gross - fees;
        const verificationCode = `ADM-FIN-${Date.now().toString(36).toUpperCase()}`;

        // Auditoría
        try {
            await db.collection('audit_events').add({
                event: 'ADMIN_FINANCIAL_REPORT_EXPORTED',
                reportType: 'MULTI_TENANT_FINANCIAL_STATEMENT',
                tenantId: financeCenterModule.selectedTenantId,
                businessId: financeCenterModule.selectedBusinessId,
                period: financeCenterModule.selectedPeriod,
                verificationCode,
                generatedByUid: user ? user.uid : 'ADMIN',
                generatedByEmail: user ? user.email : 'admin@bluesystem.com',
                grossRevenue: gross,
                netRevenue: net,
                ordersCount: orders.length,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } catch (e) {
            console.warn("[FINANCE_CENTER] No se pudo asentar auditoría:", e);
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Habilite los pop-ups para visualizar el PDF oficial.");
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });

        const rowsHtml = orders.slice(0, 100).map((o, idx) => `
            <tr>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${idx + 1}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; font-family: monospace;">${o.orderCode || '#' + o.orderId.slice(-6).toUpperCase()}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${o.businessName}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-transform: capitalize;">${o.paymentMethod}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-align: right; font-weight: bold;">C$ ${o.total.toFixed(2)}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-align: right; color: #b91c1c;">C$ ${(o.isDelivered ? o.total * 0.15 : 0).toFixed(2)}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-align: right; font-weight: bold; color: #15803d;">C$ ${(o.isDelivered ? o.total * 0.85 : 0).toFixed(2)}</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; text-align: center; font-weight: bold;">${o.status}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte Financiero Multi-Tenant - BlueSystem Enterprise</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
                    .title { font-size: 18px; font-weight: 900; color: #0f172a; }
                    .subtitle { font-size: 10px; font-weight: 700; color: #4338ca; text-transform: uppercase; }
                    .badge { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 10px; font-weight: bold; }
                    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
                    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
                    .kpi { padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .kpi.blue { background: #eff6ff; }
                    .kpi.emerald { background: #f0fdf4; }
                    .kpi.rose { background: #fff1f2; }
                    .kpi.amber { background: #fffbeb; }
                    .kpi-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; }
                    .kpi-val { font-size: 16px; font-weight: 900; font-family: monospace; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                    th { background: #f1f5f9; padding: 6px; text-align: left; font-size: 9px; font-weight: bold; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                    .notice { background: #f8fafc; border-left: 3px solid #6366f1; padding: 8px 12px; margin-bottom: 16px; font-size: 10px; color: #475569; }
                    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
                    .sig-box { border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-size: 10px; font-weight: bold; color: #334155; }
                    .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 8px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">BLUESYSTEM DELIVERY ENTERPRISE</div>
                        <div class="subtitle">Consolidado Financiero & Auditoría Multi-Tenant</div>
                    </div>
                    <div>
                        <span class="badge">${verificationCode}</span>
                        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Emisión: ${dateStr} ${timeStr}</div>
                    </div>
                </div>

                <div class="meta">
                    <div><strong>Tenant:</strong><br>${tenantName}</div>
                    <div><strong>Alcance:</strong><br>${bizName}</div>
                    <div><strong>Período:</strong><br>${financeCenterModule.selectedPeriod}</div>
                    <div><strong>Auditor:</strong><br>${user ? user.email : 'Admin'}</div>
                </div>

                <div class="kpis">
                    <div class="kpi blue">
                        <div class="kpi-title">Ventas Brutas</div>
                        <div class="kpi-val">C$ ${gross.toFixed(2)}</div>
                    </div>
                    <div class="kpi emerald">
                        <div class="kpi-title">Neto Comercios</div>
                        <div class="kpi-val">C$ ${net.toFixed(2)}</div>
                    </div>
                    <div class="kpi rose">
                        <div class="kpi-title">Comisión Plataforma</div>
                        <div class="kpi-val">C$ ${fees.toFixed(2)}</div>
                    </div>
                    <div class="kpi amber">
                        <div class="kpi-title">Pedidos Entregados</div>
                        <div class="kpi-val">${deliveredCount} / ${orders.length}</div>
                    </div>
                </div>

                <div class="notice">
                    <strong>Gobernanza Financiera (ADR-003):</strong> Ganancia Neta / Margen Comercial no disponible con la estructura actual por ausencia de costos de adquisición de producto. Las cifras reflejan ingresos y deducciones operativas reales.
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 25px;">#</th>
                            <th style="width: 60px;">Pedido</th>
                            <th>Comercio</th>
                            <th style="width: 70px;">Método</th>
                            <th style="width: 80px; text-align: right;">Total</th>
                            <th style="width: 70px; text-align: right;">Comisión</th>
                            <th style="width: 80px; text-align: right;">Neto</th>
                            <th style="width: 70px; text-align: center;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="signatures">
                    <div class="sig-box">
                        ${tenantName}<br>
                        <span style="font-weight: normal; font-size: 8px; color: #64748b;">Administración de Tenant</span>
                    </div>
                    <div class="sig-box">
                        BlueSystem Control Center<br>
                        <span style="font-weight: normal; font-size: 8px; color: #64748b;">Auditoría Financiera Global</span>
                    </div>
                </div>

                <div class="footer">
                    Documento Oficial Inmutable · BlueSystem Delivery Enterprise (bluesystem-7c9af) · Hash: ${verificationCode}
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    },

    // ── GESTIÓN DE LIQUIDACIONES POR COMERCIO (Enterprise Settlement Lifecycle) ──
    refreshData: async () => {
        if (financeCenterModule.currentSubTab === 'settlements') {
            await financeCenterModule.loadSettlements();
        } else {
            await financeCenterModule.fetchFinancialData();
        }
    },

    switchSubTab: (tabId) => {
        financeCenterModule.currentSubTab = tabId;

        const overviewContainer = document.getElementById('financeOverviewContainer');
        const settlementsContainer = document.getElementById('financeSettlementsContainer');
        const overviewBtn = document.getElementById('financeSubTabOverview');
        const settlementsBtn = document.getElementById('financeSubTabSettlements');

        if (tabId === 'overview') {
            if (overviewContainer) overviewContainer.classList.remove('hidden');
            if (settlementsContainer) settlementsContainer.classList.add('hidden');

            if (overviewBtn) {
                overviewBtn.className = 'finance-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30';
            }
            if (settlementsBtn) {
                settlementsBtn.className = 'finance-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-400 hover:text-slate-200';
            }
        } else {
            if (overviewContainer) overviewContainer.classList.add('hidden');
            if (settlementsContainer) settlementsContainer.classList.remove('hidden');

            if (settlementsBtn) {
                settlementsBtn.className = 'finance-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30';
            }
            if (overviewBtn) {
                overviewBtn.className = 'finance-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-400 hover:text-slate-200';
            }

            financeCenterModule.loadSettlements();
        }
    },

    // ── Carga Paginada de Liquidaciones con Cursor Firestore ──────────────────
    loadSettlements: async (pageIndex = 1, cursor = null) => {
        if (financeCenterModule.settlementsUnsub) {
            financeCenterModule.settlementsUnsub();
            financeCenterModule.settlementsUnsub = null;
        }

        const tbody = document.getElementById('settlementsTableBody');
        const indicator = document.getElementById('settlementsLoadingIndicator');
        const pageSpan = document.getElementById('settlementsCurrentPage');
        const btnPrev = document.getElementById('btnSettlementsPrev');
        const btnNext = document.getElementById('btnSettlementsNext');

        if (tbody && pageIndex === 1 && !cursor) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-12 text-slate-400">Sincronizando liquidaciones comerciales...</td></tr>`;
        }
        if (indicator) indicator.classList.remove('hidden');

        financeCenterModule.settlementsIsLoading = true;
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;

        try {
            let query = db.collection('merchant_settlements');

            if (financeCenterModule.settlementFilterBusinessId && financeCenterModule.settlementFilterBusinessId !== 'ALL') {
                query = query.where('businessId', '==', financeCenterModule.settlementFilterBusinessId);
            }
            if (financeCenterModule.settlementFilterStatus && financeCenterModule.settlementFilterStatus !== 'ALL') {
                query = query.where('status', '==', financeCenterModule.settlementFilterStatus);
            }
            query = query.orderBy('createdAt', 'desc');

            if (cursor) {
                query = query.startAfter(cursor).limit(financeCenterModule.settlementsPageSize + 1);
            } else {
                query = query.limit(financeCenterModule.settlementsPageSize + 1);
            }

            const snapshot = await query.get();
            const docs = snapshot.docs;
            const hasMore = docs.length > financeCenterModule.settlementsPageSize;
            const pageDocs = hasMore ? docs.slice(0, financeCenterModule.settlementsPageSize) : docs;

            const list = [];
            pageDocs.forEach(doc => {
                const data = doc.data() || {};
                list.push({ id: doc.id, ...data });
            });

            financeCenterModule.settlementsList = list;
            financeCenterModule.settlementsCurrentPage = pageIndex;
            financeCenterModule.settlementsHasNextPage = hasMore;
            financeCenterModule.settlementsNextCursor = hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

            if (pageSpan) pageSpan.textContent = pageIndex;
            if (btnPrev) btnPrev.disabled = pageIndex <= 1;
            if (btnNext) btnNext.disabled = !hasMore;

            financeCenterModule.renderSettlementsTable();

            // Refrescar KPIs consolidados si es la primera página
            if (pageIndex === 1) {
                financeCenterModule.loadSettlementsKpis();
            }
        } catch (err) {
            console.error('[FINANCE_CENTER] Error cargando liquidaciones paginadas:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-rose-400">Error al cargar liquidaciones: ${err.message}</td></tr>`;
            }
        } finally {
            financeCenterModule.settlementsIsLoading = false;
            if (indicator) indicator.classList.add('hidden');
        }
    },

    loadNextSettlementsPage: async () => {
        if (!financeCenterModule.settlementsHasNextPage || !financeCenterModule.settlementsNextCursor || financeCenterModule.settlementsIsLoading) return;
        const nextPg = financeCenterModule.settlementsCurrentPage + 1;
        financeCenterModule.settlementsPageCursors[nextPg - 1] = financeCenterModule.settlementsNextCursor;
        await financeCenterModule.loadSettlements(nextPg, financeCenterModule.settlementsNextCursor);
    },

    loadPrevSettlementsPage: async () => {
        if (financeCenterModule.settlementsCurrentPage <= 1 || financeCenterModule.settlementsIsLoading) return;
        const prevPg = financeCenterModule.settlementsCurrentPage - 1;
        const prevCursor = financeCenterModule.settlementsPageCursors[prevPg - 1] || null;
        await financeCenterModule.loadSettlements(prevPg, prevCursor);
    },

    loadSettlementsKpis: async () => {
        try {
            const kpiSnap = await db.collection('merchant_settlements').orderBy('createdAt', 'desc').limit(100).get();
            let pendingPayCents = 0;
            let pendingPayCount = 0;
            let awaitingConfCents = 0;
            let awaitingConfCount = 0;
            let disputedCount = 0;
            let closedCents = 0;
            let closedCount = 0;

            kpiSnap.forEach(doc => {
                const settlement = doc.data() || {};
                const net = Number(settlement.netPayableCents || 0);
                const paid = Number(settlement.paidCents || 0);

                if (['PREPARED', 'AWAITING_PAYMENT'].includes(settlement.status)) {
                    pendingPayCents += net;
                    pendingPayCount++;
                } else if (settlement.status === 'AWAITING_CONFIRMATION') {
                    awaitingConfCents += net;
                    awaitingConfCount++;
                } else if (settlement.status === 'DISPUTED') {
                    disputedCount++;
                } else if (settlement.status === 'CLOSED') {
                    closedCents += paid || net;
                    closedCount++;
                }
            });

            const elPending = document.getElementById('kpiSettlementPendingPay');
            if (elPending) elPending.textContent = `C$ ${(pendingPayCents / 100).toFixed(2)}`;

            const elPendingSub = document.getElementById('kpiSettlementPendingCount');
            if (elPendingSub) elPendingSub.textContent = `${pendingPayCount} pre-liquidaciones listas`;

            const elAwaiting = document.getElementById('kpiSettlementAwaitingConf');
            if (elAwaiting) elAwaiting.textContent = `C$ ${(awaitingConfCents / 100).toFixed(2)}`;

            const elAwaitingSub = document.getElementById('kpiSettlementAwaitingCount');
            if (elAwaitingSub) elAwaitingSub.textContent = `${awaitingConfCount} en revisión del comercio`;

            const elDisputed = document.getElementById('kpiSettlementDisputed');
            if (elDisputed) elDisputed.textContent = disputedCount;

            const badgeDisputed = document.getElementById('settlementDisputeCountBadge');
            if (badgeDisputed) {
                if (disputedCount > 0) {
                    badgeDisputed.textContent = `${disputedCount} disp.`;
                    badgeDisputed.classList.remove('hidden');
                } else {
                    badgeDisputed.classList.add('hidden');
                }
            }

            const elClosed = document.getElementById('kpiSettlementClosed');
            if (elClosed) elClosed.textContent = `C$ ${(closedCents / 100).toFixed(2)}`;

            const elClosedSub = document.getElementById('kpiSettlementClosedCount');
            if (elClosedSub) elClosedSub.textContent = `${closedCount} períodos cerrados e inmutables`;
        } catch (kpiErr) {
            console.warn('[FINANCE_CENTER] Advertencia al calcular KPIs de liquidaciones:', kpiErr);
        }
    },

    onSettlementFilterChange: async () => {
        const bizSelect = document.getElementById('settlementBizFilter');
        const statusSelect = document.getElementById('settlementStatusFilter');
        financeCenterModule.settlementFilterBusinessId = bizSelect ? bizSelect.value : 'ALL';
        financeCenterModule.settlementFilterStatus = statusSelect ? statusSelect.value : 'ALL';
        financeCenterModule.settlementsCurrentPage = 1;
        financeCenterModule.settlementsPageCursors = [null];
        financeCenterModule.settlementsNextCursor = null;
        await financeCenterModule.loadSettlements(1, null);
    },

    // ── Render Tabla de Liquidaciones ────────────────────────────────────────
    renderSettlementsTable: () => {
        const tbody = document.getElementById('settlementsTableBody');
        const countBadge = document.getElementById('settlementsTableCount');
        if (!tbody) return;

        let filtered = financeCenterModule.settlementsList;

        if (financeCenterModule.settlementFilterBusinessId !== 'ALL') {
            filtered = filtered.filter(s => s.businessId === financeCenterModule.settlementFilterBusinessId);
        }

        if (financeCenterModule.settlementFilterStatus !== 'ALL') {
            filtered = filtered.filter(s => s.status === financeCenterModule.settlementFilterStatus);
        }

        if (countBadge) countBadge.textContent = filtered.length;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-12 text-slate-500">
                        No se encontraron liquidaciones para los filtros seleccionados.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(s => {
            const biz = financeCenterModule.businessesList.find(b => b.businessId === s.businessId);
            const bizName = s.businessName || (biz ? biz.name : s.businessId);

            const formatD = (val) => {
                if (!val) return '-';
                try {
                    const d = val.toDate ? val.toDate() : new Date(val);
                    return d.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } catch (e) {
                    return String(val).slice(0, 10);
                }
            };

            const periodStr = `${formatD(s.periodStart)} - ${formatD(s.periodEnd)}`;
            const gross = ((s.grossSalesCents || 0) / 100).toFixed(2);
            const fee = ((s.platformFeesCents || 0) / 100).toFixed(2);
            const net = ((s.netPayableCents || 0) / 100).toFixed(2);
            const paid = ((s.paidCents || 0) / 100).toFixed(2);

            let statusBadge = '';
            switch (s.status) {
                case 'DRAFT':
                    statusBadge = `<span class="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">DRAFT</span>`;
                    break;
                case 'PREPARED':
                    statusBadge = `<span class="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">PREPARADA</span>`;
                    break;
                case 'AWAITING_PAYMENT':
                    statusBadge = `<span class="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">POR PAGAR</span>`;
                    break;
                case 'AWAITING_CONFIRMATION':
                    statusBadge = `<span class="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">CONFIRMACIÓN PDTE</span>`;
                    break;
                case 'DISPUTED':
                    statusBadge = `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">⚠️ DISPUTADA</span>`;
                    break;
                case 'CLOSED':
                    statusBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 justify-center"><span>🔒</span> CERRADA</span>`;
                    break;
                default:
                    statusBadge = `<span class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">${s.status}</span>`;
            }

            let actionButtons = '';
            if (['PREPARED', 'AWAITING_PAYMENT'].includes(s.status)) {
                actionButtons += `
                    <button onclick="financeCenterModule.openRecordPaymentModal('${s.id}')" class="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow">
                        <span>💳</span> Pagar
                    </button>
                `;
            }
            if (s.status === 'DISPUTED') {
                actionButtons += `
                    <button onclick="financeCenterModule.openResolveDisputeModal('${s.id}')" class="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow">
                        <span>⚠️</span> Resolver
                    </button>
                `;
            }
            actionButtons += `
                <button onclick="financeCenterModule.openSettlementDetailsModal('${s.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1" title="Ver Detalle">
                    <span>👁️</span>
                </button>
                <button onclick="financeCenterModule.exportSettlementPdf('${s.id}')" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1" title="Imprimir Acta">
                    <span>📄</span>
                </button>
            `;

            return `
                <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-400">
                        ${s.periodCode || s.id.slice(0, 14)}
                    </td>
                    <td class="py-3 px-4 font-semibold text-slate-200">
                        ${bizName}
                    </td>
                    <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        ${periodStr}
                    </td>
                    <td class="py-3 px-4 font-mono text-right text-slate-300">
                        C$ ${gross}
                    </td>
                    <td class="py-3 px-4 font-mono text-right text-rose-400">
                        C$ ${fee}
                    </td>
                    <td class="py-3 px-4 font-mono text-right font-bold text-emerald-400">
                        C$ ${net}
                    </td>
                    <td class="py-3 px-4 font-mono text-right text-slate-300">
                        C$ ${paid}
                    </td>
                    <td class="py-3 px-4 text-center">
                        ${statusBadge}
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ── MODAL 1: Generar Pre-Liquidación ─────────────────────────────────────
    openPreSettlementModal: () => {
        const modalId = 'modal-pre-settlement';
        financeCenterModule.closeModal(modalId);

        const bizOptions = financeCenterModule.businessesList.map(b => 
            `<option value="${b.businessId}">${b.name} (${b.businessId})</option>`
        ).join('');

        const modalDiv = document.createElement('div');
        modalDiv.id = modalId;
        modalDiv.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl bg-indigo-500/10 p-2 rounded-xl text-indigo-400">➕</span>
                        <div>
                            <h3 class="text-sm font-black text-white">Generar Pre-Liquidación Comercial</h3>
                            <p class="text-[11px] text-slate-400">Cálculo canónico de órdenes entregadas sin liquidar</p>
                        </div>
                    </div>
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
                </div>

                <div class="space-y-4 text-xs">
                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Comercio Afiliado *</label>
                        <select id="preSetBizId" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 outline-none">
                            ${bizOptions}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="font-bold text-slate-300 block mb-1">Fecha de Inicio *</label>
                            <input type="date" id="preSetStart" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                        </div>
                        <div>
                            <label class="font-bold text-slate-300 block mb-1">Fecha de Fin (Corte) *</label>
                            <input type="date" id="preSetEnd" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                        </div>
                    </div>

                    <!-- Botones Rápidos de Período -->
                    <div class="flex items-center gap-2 pt-1">
                        <span class="text-[10px] text-slate-400 uppercase font-bold">Atajos:</span>
                        <button type="button" onclick="financeCenterModule.setPresetDates('LAST_7_DAYS')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-semibold">
                            Últimos 7 días
                        </button>
                        <button type="button" onclick="financeCenterModule.setPresetDates('LAST_15_DAYS')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-semibold">
                            Última Quincena
                        </button>
                        <button type="button" onclick="financeCenterModule.setPresetDates('LAST_MONTH')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1 rounded-lg font-semibold">
                            Mes Anterior
                        </button>
                    </div>

                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Notas Administrativas (Opcional)</label>
                        <textarea id="preSetNotes" rows="2" placeholder="Ej. Corte quincenal programado Q1..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 outline-none"></textarea>
                    </div>

                    <div class="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl text-[11px] text-indigo-300 space-y-1">
                        <div class="font-bold flex items-center gap-1.5">
                            <span>🛡️</span> Gobernanza Contable:
                        </div>
                        <p class="text-slate-400">Las órdenes ya incluidas en una liquidación cerrada quedarán protegidas contra doble cómputo. El cálculo se ejecuta en Cloud Functions autoritativo.</p>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition">
                        Cancelar
                    </button>
                    <button onclick="financeCenterModule.submitPreSettlement('${modalId}')" id="btnSubmitPreSet" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                        <span>⚡</span> Ejecutar Corte & Pre-Liquidación
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        // Preseleccionar últimos 7 días por defecto
        financeCenterModule.setPresetDates('LAST_7_DAYS');
    },

    setPresetDates: (preset) => {
        const startInput = document.getElementById('preSetStart');
        const endInput = document.getElementById('preSetEnd');
        if (!startInput || !endInput) return;

        const now = new Date();
        let s = new Date();
        let e = new Date();

        if (preset === 'LAST_7_DAYS') {
            s.setDate(now.getDate() - 7);
        } else if (preset === 'LAST_15_DAYS') {
            s.setDate(now.getDate() - 15);
        } else if (preset === 'LAST_MONTH') {
            s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            e = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        const toIso = d => d.toISOString().slice(0, 10);
        startInput.value = toIso(s);
        endInput.value = toIso(e);
    },

    submitPreSettlement: async (modalId) => {
        const businessId = document.getElementById('preSetBizId')?.value;
        const periodStart = document.getElementById('preSetStart')?.value;
        const periodEnd = document.getElementById('preSetEnd')?.value;
        const notes = document.getElementById('preSetNotes')?.value;
        const btn = document.getElementById('btnSubmitPreSet');

        if (!businessId || !periodStart || !periodEnd) {
            alert('Por favor selecciona el comercio y las fechas de inicio y fin.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin">🌀</span> Calculando...`;
        }

        try {
            const generateCallable = firebase.functions().httpsCallable('adminGeneratePreSettlement');
            const res = await generateCallable({
                businessId,
                periodStart,
                periodEnd,
                notes: notes || ''
            });

            const data = res.data || {};
            financeCenterModule.closeModal(modalId);
            alert(`✅ Pre-Liquidación generada con éxito:\n\nPeríodo: ${data.periodCode || 'Generado'}\nPedidos procesados: ${data.ordersCount || 0}\nVentas Brutas: C$ ${((data.grossSalesCents || 0) / 100).toFixed(2)}\nNeto a Pagar: C$ ${((data.netPayableCents || 0) / 100).toFixed(2)}`);
        } catch (err) {
            console.error('[FINANCE_CENTER] Error al generar pre-liquidación:', err);
            alert(`❌ Error al generar pre-liquidación: ${err.message}`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>⚡</span> Ejecutar Corte & Pre-Liquidación`;
            }
        }
    },

    // ── MODAL 2: Registrar Pago de Transferencia ──────────────────────────────
    openRecordPaymentModal: (settlementId) => {
        const s = financeCenterModule.settlementsList.find(item => item.id === settlementId);
        if (!s) {
            alert('Liquidación no encontrada.');
            return;
        }

        const modalId = 'modal-record-payment';
        financeCenterModule.closeModal(modalId);

        const netCordobas = ((s.netPayableCents || 0) / 100).toFixed(2);
        const todayIso = new Date().toISOString().slice(0, 10);
        const defaultBank = (s.bankDetails && s.bankDetails.bankName) || 'Banco Lafise Bancentro';

        const modalDiv = document.createElement('div');
        modalDiv.id = modalId;
        modalDiv.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl bg-amber-500/10 p-2 rounded-xl text-amber-400">💳</span>
                        <div>
                            <h3 class="text-sm font-black text-white">Registrar Pago de Transferencia</h3>
                            <p class="text-[11px] text-slate-400">Liquidación ${s.periodCode || s.id}</p>
                        </div>
                    </div>
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
                </div>

                <!-- Resumen Financiero -->
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold">Venta Bruta</div>
                        <div class="text-slate-200 font-mono font-bold mt-1">C$ ${((s.grossSalesCents || 0) / 100).toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-rose-400 uppercase font-bold">Comisión BSD</div>
                        <div class="text-rose-300 font-mono font-bold mt-1">-C$ ${((s.platformFeesCents || 0) / 100).toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-emerald-400 uppercase font-bold">Neto a Liquidar</div>
                        <div class="text-emerald-300 font-mono font-black mt-1">C$ ${netCordobas}</div>
                    </div>
                </div>

                <div class="space-y-3.5 text-xs">
                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Monto Transferido (C$) *</label>
                        <input type="number" step="0.01" id="payAmountInput" value="${netCordobas}" oninput="financeCenterModule.checkAmountMatch('${s.netPayableCents}')" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold focus:border-amber-500 outline-none">
                        <p id="amountMismatchWarning" class="text-[10px] text-amber-400 mt-1 hidden font-semibold">
                            ⚠️ El monto ingresado no coincide exactamente con el Neto a Liquidar (C$ ${netCordobas}).
                        </p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="font-bold text-slate-300 block mb-1">Banco Origen / Destino *</label>
                            <input type="text" id="payBankName" value="${defaultBank}" placeholder="Ej. BAC, Lafise, Banpro..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                        </div>
                        <div>
                            <label class="font-bold text-slate-300 block mb-1">Referencia / Minuta # *</label>
                            <input type="text" id="payReference" placeholder="Ej. ACH-92817482" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono outline-none">
                        </div>
                    </div>

                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Fecha de la Transferencia *</label>
                        <input type="date" id="payDate" value="${todayIso}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                    </div>

                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Comprobante Bancario (Archivo Imagen / PDF)</label>
                        <input type="file" id="payReceiptFile" accept="image/*,application/pdf" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 outline-none">
                        <p class="text-[10px] text-slate-500 mt-1">Sube el capture o minuta bancaria para que el comercio pueda auditarla.</p>
                    </div>

                    <!-- Justificación de Excepción si hay Descuadre -->
                    <div id="exceptionSection" class="hidden space-y-2 bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="chkAllowPartial" class="rounded accent-amber-500">
                            <label for="chkAllowPartial" class="font-bold text-amber-300">Autorizar Pago Parcial o Ajustado</label>
                        </div>
                        <input type="text" id="txtExceptionReason" placeholder="Razón de excepción (ej. deducción préstamo convenido)..." class="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-slate-200 text-xs outline-none">
                    </div>

                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Notas para el Comercio (Opcional)</label>
                        <textarea id="payNotes" rows="2" placeholder="Comentarios visibles para el administrador del comercio..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 outline-none"></textarea>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition">
                        Cancelar
                    </button>
                    <button onclick="financeCenterModule.submitRecordPayment('${s.id}', '${s.businessId}', '${s.netPayableCents}', '${modalId}')" id="btnSubmitPayment" class="bg-amber-600 hover:bg-amber-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-amber-600/30">
                        <span>📤</span> Registrar Pago & Notificar Comercio
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    },

    checkAmountMatch: (netPayableCentsStr) => {
        const netCents = Number(netPayableCentsStr);
        const amountInput = document.getElementById('payAmountInput');
        const warnEl = document.getElementById('amountMismatchWarning');
        const exSection = document.getElementById('exceptionSection');
        if (!amountInput) return;

        const enteredCents = Math.round(parseFloat(amountInput.value || 0) * 100);
        if (enteredCents !== netCents) {
            if (warnEl) warnEl.classList.remove('hidden');
            if (exSection) exSection.classList.remove('hidden');
        } else {
            if (warnEl) warnEl.classList.add('hidden');
            if (exSection) exSection.classList.add('hidden');
        }
    },

    submitRecordPayment: async (settlementId, businessId, netPayableCentsStr, modalId) => {
        const amountInput = document.getElementById('payAmountInput');
        const bankName = document.getElementById('payBankName')?.value;
        const reference = document.getElementById('payReference')?.value;
        const payDate = document.getElementById('payDate')?.value;
        const fileInput = document.getElementById('payReceiptFile');
        const notes = document.getElementById('payNotes')?.value;
        const chkAllowPartial = document.getElementById('chkAllowPartial')?.checked;
        const txtExceptionReason = document.getElementById('txtExceptionReason')?.value;
        const btn = document.getElementById('btnSubmitPayment');

        if (!reference || !bankName || !payDate) {
            alert('Por favor completa el Banco, Referencia y Fecha de pago.');
            return;
        }

        const paidCents = Math.round(parseFloat(amountInput.value || 0) * 100);
        const netCents = Number(netPayableCentsStr);

        if (paidCents <= 0) {
            alert('El monto pagado debe ser mayor a C$ 0.00.');
            return;
        }

        if (paidCents !== netCents && !chkAllowPartial) {
            alert('El monto pagado no coincide con el neto a liquidar. Si se trata de un pago parcial o con ajuste, marca la casilla de autorización e indica la razón.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin">🌀</span> Subiendo comprobante y registrando...`;
        }

        try {
            let receiptUrl = '';

            // Subir Comprobante a Firebase Storage si se seleccionó archivo
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const storageInstance = (typeof storage !== 'undefined' && storage) ? storage : firebase.storage();
                const storagePath = `settlement_receipts/${businessId}/${settlementId}/${Date.now()}_${file.name}`;
                const ref = storageInstance.ref().child(storagePath);
                const uploadSnap = await ref.put(file);
                receiptUrl = await uploadSnap.ref.getDownloadURL();
            }

            const recordCallable = firebase.functions().httpsCallable('adminRecordSettlementPayment');
            await recordCallable({
                settlementId,
                transferReference: reference,
                bankName,
                paymentDate: payDate,
                paidCents,
                transferReceiptUrl: receiptUrl,
                notes: notes || '',
                allowPartialPayment: chkAllowPartial === true,
                exceptionReason: txtExceptionReason || ''
            });

            financeCenterModule.closeModal(modalId);
            await financeCenterModule.loadSettlements(financeCenterModule.settlementsCurrentPage, financeCenterModule.settlementsPageCursors[financeCenterModule.settlementsCurrentPage - 1] || null);
            alert('✅ Pago registrado con éxito. La liquidación ha pasado a estado AWAITING_CONFIRMATION y el comercio ha sido notificado.');
        } catch (err) {
            console.error('[FINANCE_CENTER] Error al registrar pago:', err);
            alert(`❌ Error al registrar pago: ${err.message}`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>📤</span> Registrar Pago & Notificar Comercio`;
            }
        }
    },

    // ── MODAL 3: Atender y Resolver Disputa ───────────────────────────────────
    openResolveDisputeModal: (settlementId) => {
        const s = financeCenterModule.settlementsList.find(item => item.id === settlementId);
        if (!s) {
            alert('Liquidación no encontrada.');
            return;
        }

        const modalId = 'modal-resolve-dispute';
        financeCenterModule.closeModal(modalId);

        const formatD = (val) => {
            if (!val) return '-';
            try {
                const d = val.toDate ? val.toDate() : new Date(val);
                return d.toLocaleString('es-NI');
            } catch (e) {
                return String(val);
            }
        };

        const modalDiv = document.createElement('div');
        modalDiv.id = modalId;
        modalDiv.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl bg-rose-500/10 p-2 rounded-xl text-rose-400">⚠️</span>
                        <div>
                            <h3 class="text-sm font-black text-white">Resolución de Disputa Comercial</h3>
                            <p class="text-[11px] text-slate-400">${s.periodCode || s.id}</p>
                        </div>
                    </div>
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
                </div>

                <!-- Detalle de la Disputa levantada por el comercio -->
                <div class="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl space-y-2 text-xs">
                    <div class="flex items-center justify-between text-[11px] text-rose-400 font-bold">
                        <span>Reclamo del Comercio</span>
                        <span>${formatD(s.disputedAt)}</span>
                    </div>
                    <p class="text-slate-200 italic bg-slate-950/60 p-3 rounded-xl border border-rose-500/20">
                        "${s.disputeReason || 'Sin motivo detallado'}"
                    </p>
                    <div class="text-[10px] text-slate-400 font-mono">
                        Disputado por: ${s.disputedBy || 'Comercio Afiliado'}
                    </div>
                </div>

                <div class="space-y-4 text-xs">
                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Acción Resolutiva *</label>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-indigo-500 transition">
                                <input type="radio" name="resAction" value="ACCEPT_MERCHANT_DISPUTE" checked class="accent-indigo-600">
                                <div>
                                    <strong class="text-slate-200 block">Aceptar Reclamo / Reabrir para Ajuste</strong>
                                    <span class="text-[10px] text-slate-400">Regresa la liquidación a estado AWAITING_PAYMENT para aplicar corrección o nuevo depósito.</span>
                                </div>
                            </label>

                            <label class="flex items-center gap-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-indigo-500 transition">
                                <input type="radio" name="resAction" value="REJECT_DISPUTE" class="accent-indigo-600">
                                <div>
                                    <strong class="text-slate-200 block">Rechazar Disputa / Mantener Cifras</strong>
                                    <span class="text-[10px] text-slate-400">Se ratifican los valores calculados y se regresa a AWAITING_CONFIRMATION con la debida justificación.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Monto de Ajuste en C$ (Opcional, positivo o negativo)</label>
                        <input type="number" step="0.01" id="resAdjustmentInput" value="0.00" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono outline-none">
                    </div>

                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Dictamen / Justificación Administrativa *</label>
                        <textarea id="resNotes" rows="3" placeholder="Explica detalladamente la base contable o auditoría aplicada..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 outline-none"></textarea>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition">
                        Cancelar
                    </button>
                    <button onclick="financeCenterModule.submitResolveDispute('${s.id}', '${modalId}')" id="btnSubmitResolution" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                        <span>⚖️</span> Aplicar Resolución & Registrar Auditoría
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    },

    submitResolveDispute: async (settlementId, modalId) => {
        const actionRadios = document.getElementsByName('resAction');
        let selectedAction = 'ACCEPT_MERCHANT_DISPUTE';
        for (const r of actionRadios) {
            if (r.checked) selectedAction = r.value;
        }

        const notes = document.getElementById('resNotes')?.value;
        const adjVal = parseFloat(document.getElementById('resAdjustmentInput')?.value || 0);
        const adjustmentCents = Math.round(adjVal * 100);
        const btn = document.getElementById('btnSubmitResolution');

        if (!notes || notes.trim().length < 5) {
            alert('Por favor ingresa una justificación administrativa de al menos 5 caracteres.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin">🌀</span> Procesando dictamen...`;
        }

        try {
            const resolveCallable = firebase.functions().httpsCallable('adminResolveSettlementDispute');
            await resolveCallable({
                settlementId,
                resolutionAction: selectedAction,
                resolutionNotes: notes,
                adjustmentCents
            });

            financeCenterModule.closeModal(modalId);
            await financeCenterModule.loadSettlements(financeCenterModule.settlementsCurrentPage, financeCenterModule.settlementsPageCursors[financeCenterModule.settlementsCurrentPage - 1] || null);
            alert('✅ Disputa resuelta y registrada en el libro de auditoría.');
        } catch (err) {
            console.error('[FINANCE_CENTER] Error al resolver disputa:', err);
            alert(`❌ Error al resolver disputa: ${err.message}`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>⚖️</span> Aplicar Resolución & Registrar Auditoría`;
            }
        }
    },

    // ── MODAL 4: Detalle Integral & Auditoría de Liquidación ──────────────────
    openSettlementDetailsModal: (settlementId) => {
        const s = financeCenterModule.settlementsList.find(item => item.id === settlementId);
        if (!s) {
            alert('Liquidación no encontrada.');
            return;
        }

        const modalId = 'modal-settlement-details';
        financeCenterModule.closeModal(modalId);

        const formatD = (val) => {
            if (!val) return '-';
            try {
                const d = val.toDate ? val.toDate() : new Date(val);
                return d.toLocaleString('es-NI');
            } catch (e) {
                return String(val);
            }
        };

        const gross = ((s.grossSalesCents || 0) / 100).toFixed(2);
        const fee = ((s.platformFeesCents || 0) / 100).toFixed(2);
        const adj = ((s.adjustmentsCents || 0) / 100).toFixed(2);
        const net = ((s.netPayableCents || 0) / 100).toFixed(2);
        const paid = ((s.paidCents || 0) / 100).toFixed(2);
        const ordersCount = s.ordersCount || (s.ordersIncluded ? s.ordersIncluded.length : 0);

        const modalDiv = document.createElement('div');
        modalDiv.id = modalId;
        modalDiv.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl bg-indigo-500/10 p-2 rounded-xl text-indigo-400">📑</span>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-sm font-black text-white">Liquidación ${s.periodCode || s.id}</h3>
                                ${s.isFrozen ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">🔒 INMUTABLE</span>' : ''}
                            </div>
                            <p class="text-[11px] text-slate-400">Comercio: ${s.businessName || s.businessId}</p>
                        </div>
                    </div>
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
                </div>

                <!-- Tarjetas de Resumen Numérico -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span class="text-[10px] text-slate-400 block font-sans uppercase font-bold">Venta Bruta</span>
                        <strong class="text-slate-200 text-sm font-bold mt-1 block">C$ ${gross}</strong>
                        <span class="text-[10px] text-slate-500">${ordersCount} pedidos</span>
                    </div>

                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span class="text-[10px] text-rose-400 block font-sans uppercase font-bold">Comisión BSD</span>
                        <strong class="text-rose-300 text-sm font-bold mt-1 block">C$ ${fee}</strong>
                        <span class="text-[10px] text-slate-500">${((s.platformFeeRate || 0.15) * 100).toFixed(0)}% retención</span>
                    </div>

                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span class="text-[10px] text-emerald-400 block font-sans uppercase font-bold">Neto a Liquidar</span>
                        <strong class="text-emerald-300 text-sm font-black mt-1 block">C$ ${net}</strong>
                        <span class="text-[10px] text-slate-500">Ajustes: C$ ${adj}</span>
                    </div>

                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span class="text-[10px] text-amber-400 block font-sans uppercase font-bold">Monto Pagado</span>
                        <strong class="text-amber-300 text-sm font-bold mt-1 block">C$ ${paid}</strong>
                        <span class="text-[10px] text-slate-500">Ref: ${s.transferReference || 'Pendiente'}</span>
                    </div>
                </div>

                <!-- Datos Bancarios & Transferencia -->
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                    <h4 class="font-bold text-slate-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                        <span>🏦</span> Datos de Transferencia y Comprobante
                    </h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                            <span class="text-slate-500 text-[10px] block">Banco:</span>
                            <span class="text-slate-200 font-semibold">${s.bankName || (s.bankDetails && s.bankDetails.bankName) || 'No especificado'}</span>
                        </div>
                        <div>
                            <span class="text-slate-500 text-[10px] block">Minuta / Referencia:</span>
                            <span class="text-slate-200 font-mono font-bold">${s.transferReference || 'No registrada'}</span>
                        </div>
                        <div>
                            <span class="text-slate-500 text-[10px] block">Fecha de Pago:</span>
                            <span class="text-slate-200 font-mono">${formatD(s.paymentDate)}</span>
                        </div>
                    </div>

                    ${s.transferReceiptUrl ? `
                        <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span class="text-slate-400 text-xs">Comprobante digital adjunto:</span>
                            <a href="${s.transferReceiptUrl}" target="_blank" class="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
                                <span>🔍</span> Ver Archivo / Capture
                            </a>
                        </div>
                    ` : '<p class="text-slate-500 text-[11px] italic pt-1">Sin archivo de comprobante adjunto.</p>'}
                </div>

                <!-- Trazabilidad / Timeline de Auditoría -->
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <h4 class="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                        🛡️ Historial de Trazabilidad & Firmas
                    </h4>
                    <ul class="space-y-1.5 font-mono text-[11px] text-slate-400">
                        <li>• <strong class="text-slate-300">Generado:</strong> ${formatD(s.createdAt)} por ${s.createdBy || s.preparedBy || 'Admin'}</li>
                        ${s.paymentDate ? `<li>• <strong class="text-slate-300">Pago Registrado:</strong> ${formatD(s.paymentDate)} por ${s.paidBy || 'Admin'}</li>` : ''}
                        ${s.confirmedAt ? `<li>• <strong class="text-emerald-400">Confirmado por Comercio:</strong> ${formatD(s.confirmedAt)} por ${s.confirmedBy || 'Comercio'}</li>` : ''}
                        ${s.closedAt ? `<li>• <strong class="text-emerald-400">Cerrado e Inmutable:</strong> ${formatD(s.closedAt)}</li>` : ''}
                        ${s.disputedAt ? `<li>• <strong class="text-rose-400">Disputado:</strong> ${formatD(s.disputedAt)} ("${s.disputeReason}")</li>` : ''}
                    </ul>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button onclick="financeCenterModule.exportSettlementPdf('${s.id}')" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
                        <span>📄</span> Imprimir Acta Oficial
                    </button>
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    },

    // ── MODAL 5: Configurar Períodos & Cuentas de Comercio ────────────────────
    openConfigModal: async () => {
        const modalId = 'modal-settlement-config';
        financeCenterModule.closeModal(modalId);

        const bizOptions = financeCenterModule.businessesList.map(b => 
            `<option value="${b.businessId}">${b.name} (${b.businessId})</option>`
        ).join('');

        const modalDiv = document.createElement('div');
        modalDiv.id = modalId;
        modalDiv.className = 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl bg-slate-800 p-2 rounded-xl text-indigo-400">⚙️</span>
                        <div>
                            <h3 class="text-sm font-black text-white">Configuración de Liquidaciones</h3>
                            <p class="text-[11px] text-slate-400">Frecuencia de corte y datos bancarios oficiales del comercio</p>
                        </div>
                    </div>
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
                </div>

                <div class="space-y-4 text-xs">
                    <div>
                        <label class="font-bold text-slate-300 block mb-1">Comercio Afiliado *</label>
                        <select id="cfgBizSelect" onchange="financeCenterModule.loadExistingSettlementConfig(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 outline-none">
                            ${bizOptions}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="font-bold text-slate-300 block mb-1">Período de Corte *</label>
                            <select id="cfgPeriodType" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                                <option value="WEEKLY">Semanal (7 días)</option>
                                <option value="BIWEEKLY" selected>Quincenal (15 días)</option>
                                <option value="MONTHLY">Mensual (Corte a fin de mes)</option>
                            </select>
                        </div>
                        <div>
                            <label class="font-bold text-slate-300 block mb-1">Día de Corte Preferido</label>
                            <select id="cfgCutoffDay" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                                <option value="SUNDAY">Domingo</option>
                                <option value="MONDAY" selected>Lunes</option>
                                <option value="FRIDAY">Viernes</option>
                            </select>
                        </div>
                    </div>

                    <div class="border-t border-slate-800 pt-3 space-y-3">
                        <h4 class="font-bold text-slate-300 text-[10px] uppercase tracking-wider">🏦 Cuenta Bancaria Oficial del Comercio</h4>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="font-bold text-slate-400 block mb-1">Entidad Bancaria</label>
                                <input type="text" id="cfgBankName" placeholder="Ej. Banco Lafise Bancentro" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                            </div>
                            <div>
                                <label class="font-bold text-slate-400 block mb-1">Tipo de Cuenta</label>
                                <select id="cfgAccountType" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                                    <option value="MONETARIA">Corriente / Monetaria</option>
                                    <option value="AHORRO">Ahorros</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="font-bold text-slate-400 block mb-1">Número de Cuenta / IBAN</label>
                            <input type="text" id="cfgAccountNumber" placeholder="Ej. 10293847561029" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="font-bold text-slate-400 block mb-1">Beneficiario Titular</label>
                                <input type="text" id="cfgBeneficiaryName" placeholder="Nombre o Razón Social" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none">
                            </div>
                            <div>
                                <label class="font-bold text-slate-400 block mb-1">Identificación / RUC</label>
                                <input type="text" id="cfgBeneficiaryId" placeholder="Ej. J03100000..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono outline-none">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button onclick="financeCenterModule.closeModal('${modalId}')" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition">
                        Cancelar
                    </button>
                    <button onclick="financeCenterModule.submitSettlementConfig('${modalId}')" id="btnSubmitConfig" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                        <span>💾</span> Guardar Parámetros
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        const firstBiz = financeCenterModule.businessesList[0];
        if (firstBiz) {
            await financeCenterModule.loadExistingSettlementConfig(firstBiz.businessId);
        }
    },

    loadExistingSettlementConfig: async (businessId) => {
        try {
            const doc = await db.collection('merchant_settlement_configs').doc(businessId).get();
            if (doc.exists) {
                const data = doc.data() || {};
                const periodSelect = document.getElementById('cfgPeriodType');
                const cutoffSelect = document.getElementById('cfgCutoffDay');
                const bankInput = document.getElementById('cfgBankName');
                const accountInput = document.getElementById('cfgAccountNumber');
                const typeSelect = document.getElementById('cfgAccountType');
                const benNameInput = document.getElementById('cfgBeneficiaryName');
                const benIdInput = document.getElementById('cfgBeneficiaryId');

                if (periodSelect && data.settlementPeriod) periodSelect.value = data.settlementPeriod;
                if (cutoffSelect && data.cutoffDayOfWeek) cutoffSelect.value = data.cutoffDayOfWeek;

                const bank = data.bankDetails || {};
                if (bankInput) bankInput.value = bank.bankName || '';
                if (accountInput) accountInput.value = bank.accountNumber || '';
                if (typeSelect && bank.accountType) typeSelect.value = bank.accountType;
                if (benNameInput) benNameInput.value = bank.beneficiaryName || '';
                if (benIdInput) benIdInput.value = bank.beneficiaryId || '';
            }
        } catch (err) {
            console.warn('[FINANCE_CENTER] No se pudo cargar config previa:', err);
        }
    },

    submitSettlementConfig: async (modalId) => {
        const businessId = document.getElementById('cfgBizSelect')?.value;
        const settlementPeriod = document.getElementById('cfgPeriodType')?.value;
        const cutoffDayOfWeek = document.getElementById('cfgCutoffDay')?.value;
        const bankName = document.getElementById('cfgBankName')?.value;
        const accountNumber = document.getElementById('cfgAccountNumber')?.value;
        const accountType = document.getElementById('cfgAccountType')?.value;
        const beneficiaryName = document.getElementById('cfgBeneficiaryName')?.value;
        const beneficiaryId = document.getElementById('cfgBeneficiaryId')?.value;
        const btn = document.getElementById('btnSubmitConfig');

        if (!businessId) {
            alert('Por favor selecciona un comercio.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin">🌀</span> Guardando...`;
        }

        try {
            const configureCallable = firebase.functions().httpsCallable('adminConfigureMerchantSettlement');
            await configureCallable({
                businessId,
                settlementPeriod,
                cutoffDayOfWeek,
                bankDetails: {
                    bankName: bankName || '',
                    accountNumber: accountNumber || '',
                    accountType: accountType || 'MONETARIA',
                    beneficiaryName: beneficiaryName || '',
                    beneficiaryId: beneficiaryId || ''
                }
            });

            financeCenterModule.closeModal(modalId);
            alert('✅ Parámetros de liquidación guardados correctamente.');
        } catch (err) {
            console.error('[FINANCE_CENTER] Error al guardar config de liquidación:', err);
            alert(`❌ Error al guardar configuración: ${err.message}`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>💾</span> Guardar Parámetros`;
            }
        }
    },

    // ── Exportación Oficial de Acta / Voucher de Liquidación ─────────────────
    exportSettlementPdf: (settlementId) => {
        const s = financeCenterModule.settlementsList.find(item => item.id === settlementId);
        if (!s) {
            alert('Liquidación no encontrada.');
            return;
        }

        const biz = financeCenterModule.businessesList.find(b => b.businessId === s.businessId);
        const bizName = s.businessName || (biz ? biz.name : s.businessId);

        const formatD = (val) => {
            if (!val) return '-';
            try {
                const d = val.toDate ? val.toDate() : new Date(val);
                return d.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch (e) {
                return String(val).slice(0, 10);
            }
        };

        const gross = ((s.grossSalesCents || 0) / 100).toFixed(2);
        const fee = ((s.platformFeesCents || 0) / 100).toFixed(2);
        const adj = ((s.adjustmentsCents || 0) / 100).toFixed(2);
        const net = ((s.netPayableCents || 0) / 100).toFixed(2);
        const paid = ((s.paidCents || 0) / 100).toFixed(2);
        const verificationCode = `SETTLEMENT-${(s.id || '').toUpperCase().slice(0, 12)}-${Date.now().toString(36).toUpperCase()}`;

        // 1. Generación Vectorial Nativa y Descarga Directa con jsPDF (Sin popup bloqueado ni about:blank)
        const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF ? window.jsPDF : null);
        if (jsPdfLib) {
            try {
                const doc = new jsPdfLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                // Cabecera Corporativa
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, 210, 28, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text('BLUESYSTEM DELIVERY ENTERPRISE', 15, 12);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(203, 213, 225);
                doc.text('Acta Oficial de Liquidación Comercial y Conciliación Financiera', 15, 19);

                // Badge
                const actNum = 'ACTA-SETTLEMENT-' + (s.id || '00000000').substring(0, 10).toUpperCase();
                doc.setFillColor(22, 101, 52);
                doc.roundedRect(137, 8, 58, 12, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.text(actNum, 166, 15.5, { align: 'center' });

                // Sección 1: Identificación
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text('1. IDENTIFICACIÓN Y ESTADO DE GOBERNANZA', 15, 38);

                doc.setDrawColor(226, 232, 240);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(15, 42, 180, 32, 2, 2, 'FD');

                doc.setFontSize(8.5);
                doc.setTextColor(71, 85, 105);
                doc.text('Comercio:', 19, 49);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(bizName, 49, 49);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('ID Comercio:', 19, 57);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(s.businessId, 49, 57);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Estado Auditoría:', 19, 65);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text((s.status || 'CLOSED') + ' (INMUTABLE)', 49, 65);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Período:', 115, 49);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(formatD(s.periodStart) + ' al ' + formatD(s.periodEnd), 140, 49);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Órdenes:', 115, 57);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text((s.ordersCount || 0) + ' pedidos entregados', 140, 57);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Cód. Verificación:', 115, 65);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(2, 132, 199);
                doc.text(verificationCode, 140, 65);

                // Tabla AutoTable
                if (typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        startY: 80,
                        head: [['Concepto Contable', 'Base de Cálculo / Detalle', 'Monto Oficial (NIO)']],
                        body: [
                            ['Venta Bruta Total', (s.ordersCount || 0) + ' pedidos entregados en el período', 'C$ ' + gross],
                            ['Comisión Plataforma (Retención)', 'Tarifa contractual de intermediación (15%)', '- C$ ' + fee],
                            ['Ajustes / Deducciones', 'Descuentos o bonificaciones comerciales', 'C$ ' + adj],
                            ['NETO TOTAL LIQUIDADO', 'Monto acreditado y transferido al comercio', 'C$ ' + (paid !== '0.00' ? paid : net)]
                        ],
                        theme: 'grid',
                        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
                        columnStyles: {
                            0: { fontStyle: 'bold', cellWidth: 60 },
                            1: { cellWidth: 70 },
                            2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 }
                        },
                        styles: { fontSize: 8, cellPadding: 3 },
                        margin: { left: 15, right: 15 }
                    });
                }

                const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 120) + 8;
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text('3. DETALLES DE TRANSFERENCIA BANCARIA Y COMPROBANTE', 15, finalY);

                doc.setDrawColor(226, 232, 240);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(15, finalY + 4, 180, 26, 2, 2, 'FD');

                doc.setFontSize(8.5);
                doc.setTextColor(71, 85, 105);
                doc.text('Banco Receptor:', 19, finalY + 11);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(s.bankName || 'BAC Credomatic', 55, finalY + 11);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Referencia Bancaria:', 19, finalY + 18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(s.transferReference || '—', 55, finalY + 18);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Fecha Transferencia:', 19, finalY + 25);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(formatD(s.paymentDate || s.paidAt), 55, finalY + 25);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Monto Transferido:', 115, finalY + 11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text('C$ ' + (paid !== '0.00' ? paid : net), 150, finalY + 11);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Comprobante:', 115, finalY + 18);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(2, 132, 199);
                doc.text(s.transferReceiptUrl || s.receiptUrl ? 'Verificado en Storage Oficial' : 'Registrado', 150, finalY + 18);

                // Sección 4: Firmas
                const sigY = finalY + 36;
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text('4. CERTIFICACIÓN DE AUDITORÍA Y FIRMAS ELECTRÓNICAS', 15, sigY);

                const boxW = 87;
                doc.setDrawColor(226, 232, 240);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(15, sigY + 4, boxW, 34, 2, 2, 'FD');
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text('EMISOR: ADMINISTRACIÓN PLATAFORMA', 19, sigY + 11);
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text('Registrado por: ' + (s.paidByName || 'Administrador Central'), 19, sigY + 18);
                doc.text('Fecha: ' + formatD(s.paidAt || s.paymentDate), 19, sigY + 24);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text('✓ VALIDADO Y TRANSFERIDO', 19, sigY + 31);

                doc.setDrawColor(187, 247, 208);
                doc.setFillColor(240, 253, 244);
                doc.roundedRect(108, sigY + 4, boxW, 34, 2, 2, 'FD');
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text('RECEPTOR: COMERCIO TITULAR', 112, sigY + 11);
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                const conf = s.confirmedBy || {};
                doc.text('Confirmado por: ' + (conf.confirmedByEmail || 'Comercio Titular'), 112, sigY + 18);
                doc.text('Fecha: ' + formatD(conf.confirmedAt || s.frozenAt), 112, sigY + 24);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text('✓ CONFORME Y CONGELADO', 112, sigY + 31);

                // Cláusula
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text('El presente documento constituye el Acta Oficial de Liquidación Comercial emitida por BlueSystem Delivery Enterprise. Registro contable cerrado y congelado bajo la política de Inmutabilidad Financiera (ADR-018 / EIAM v2.2), no admitiendo modificaciones posteriores.', 15, sigY + 44, { maxWidth: 180 });

                // Footer
                doc.setDrawColor(203, 213, 225);
                doc.line(15, 282, 195, 282);
                doc.setFontSize(6.5);
                doc.setTextColor(148, 163, 184);
                doc.text('Generado el: ' + new Date().toLocaleString('es-NI') + ' | Sistema BlueSystem Delivery Enterprise', 15, 286);
                doc.text('Página 1 de 1 — Documento Contable Inmutable', 195, 286, { align: 'right' });

                // Descarga directa
                const filename = 'Acta_Liquidacion_' + s.businessId + '_' + (s.id || '').substring(0, 8) + '.pdf';
                const blob = doc.output('blob');
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    if (a.parentNode) a.parentNode.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 2000);
                return;
            } catch (pdfErr) {
                console.warn('[FinanceCenter] Error generando PDF con jsPDF, usando fallback de ventana:', pdfErr);
            }
        }

        // Fallback: Ventana de Impresión
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor permite las ventanas emergentes para generar el comprobante PDF.');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Acta Oficial de Liquidación Comercial - ${s.periodCode || s.id}</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                    .title { font-size: 18px; font-weight: 900; color: #0f172a; }
                    .subtitle { font-size: 10px; font-weight: 700; color: #4338ca; text-transform: uppercase; }
                    .badge { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 10px; font-weight: bold; }
                    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
                    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
                    .kpi { padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
                    .kpi.blue { background: #eff6ff; }
                    .kpi.rose { background: #fff1f2; }
                    .kpi.emerald { background: #f0fdf4; border-color: #86efac; }
                    .kpi.amber { background: #fffbeb; }
                    .kpi-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; }
                    .kpi-val { font-size: 16px; font-weight: 900; font-family: monospace; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10px; }
                    th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 9px; font-weight: bold; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                    .clause { background: #f8fafc; border-left: 3px solid #6366f1; padding: 10px 14px; margin-top: 16px; font-size: 9.5px; color: #475569; }
                    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 50px; }
                    .sig-box { border-top: 1px solid #0f172a; padding-top: 8px; text-align: center; font-size: 10px; font-weight: bold; color: #334155; }
                    .footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 8px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">BLUESYSTEM DELIVERY ENTERPRISE</div>
                        <div class="subtitle">Comprobante y Acta Oficial de Liquidación Comercial</div>
                    </div>
                    <div>
                        <span class="badge">${verificationCode}</span>
                        <div style="font-size: 9px; color: #64748b; margin-top: 4px; text-align: right;">Estado: <strong>${s.status}</strong></div>
                    </div>
                </div>

                <div class="meta">
                    <div><strong>Comercio:</strong><br>${bizName}</div>
                    <div><strong>Período de Corte:</strong><br>${formatD(s.periodStart)} al ${formatD(s.periodEnd)}</div>
                    <div><strong>Banco / Cuenta:</strong><br>${s.bankName || 'Bancentro'}</div>
                    <div><strong>Minuta / Ref:</strong><br>${s.transferReference || 'N/A'}</div>
                </div>

                <div class="kpis">
                    <div class="kpi blue">
                        <div class="kpi-title">Venta Bruta</div>
                        <div class="kpi-val">C$ ${gross}</div>
                    </div>
                    <div class="kpi rose">
                        <div class="kpi-title">Comisión Plataforma</div>
                        <div class="kpi-val">C$ ${fee}</div>
                    </div>
                    <div class="kpi emerald">
                        <div class="kpi-title">Neto Liquidado</div>
                        <div class="kpi-val">C$ ${net}</div>
                    </div>
                    <div class="kpi amber">
                        <div class="kpi-title">Monto Depositado</div>
                        <div class="kpi-val">C$ ${paid}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Concepto Contable</th>
                            <th>Tasa / Base</th>
                            <th style="text-align: right;">Monto en Córdobas (C$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Ventas de Órdenes Entregadas (${s.ordersCount || (s.ordersIncluded ? s.ordersIncluded.length : 0)} pedidos)</td>
                            <td>100% Importe Productos</td>
                            <td style="text-align: right; font-family: monospace; font-weight: bold;">C$ ${gross}</td>
                        </tr>
                        <tr>
                            <td>Retención por Comisión de Servicio de Plataforma</td>
                            <td>${((s.platformFeeRate || 0.15) * 100).toFixed(0)}% Contractual</td>
                            <td style="text-align: right; font-family: monospace; color: #e11d48;">- C$ ${fee}</td>
                        </tr>
                        <tr>
                            <td>Ajustes Contables / Bonificaciones / Reclamos Resueltos</td>
                            <td>Auditoría Financiera</td>
                            <td style="text-align: right; font-family: monospace;">C$ ${adj}</td>
                        </tr>
                        <tr style="background: #f8fafc; font-weight: bold;">
                            <td>TOTAL NETO DEPOSITADO A COMERCIO</td>
                            <td>Saldo Final Transferido</td>
                            <td style="text-align: right; font-family: monospace; font-size: 13px; color: #15803d;">C$ ${paid || net}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="clause">
                    <strong>Cláusula de Cierre e Inmutabilidad (BSD-FINANCE-001):</strong> La presente liquidación ha sido debidamente revisada y conciliada conforme a los libros contables digitales de BlueSystem Delivery Enterprise y los registros del Comercio Afiliado. Una vez confirmada, adquiere carácter inmutable y vinculante entre las partes.
                </div>

                <div class="signatures">
                    <div class="sig-box">
                        ${bizName}<br>
                        <span style="font-weight: normal; font-size: 8px; color: #64748b;">Firma / Conformidad Comercio Afiliado</span>
                    </div>
                    <div class="sig-box">
                        BlueSystem Delivery Enterprise<br>
                        <span style="font-weight: normal; font-size: 8px; color: #64748b;">Auditoría Financiera & Pagaduría Central</span>
                    </div>
                </div>

                <div class="footer">
                    Documento Oficial Inmutable · BlueSystem Delivery Enterprise (bluesystem-7c9af) · Hash de Auditoría: ${verificationCode}
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    },

    closeModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
    },

    // ── Limpieza de Recursos y Suscripciones ─────────────────────────────────
    destroy: () => {
        if (financeCenterModule.settlementsUnsub) {
            financeCenterModule.settlementsUnsub();
            financeCenterModule.settlementsUnsub = null;
        }
    }
};

window.financeCenterModule = financeCenterModule;
