/**
 * CourierCashControlModule — Enterprise Courier Cash Ledger, Closure & Bank Deposit Control
 * BlueSystem Delivery Enterprise v5.5.0
 *
 * Módulo para la supervisión de arqueos diarios, reconciliación cuatripartita,
 * verificación de comprobantes bancarios en Storage, emisión de actas oficiales,
 * autocompletado de motorizados con debounce, Date Range Picker interactivo con popover/calendario
 * y control estricto de errores Firestore (PERMISSION_DENIED, LOADING, EMPTY, SUCCESS).
 */

const courierCashControlModule = {
    unsubscribeClosures: null,
    unsubscribeBalances: null,
    closuresCache: [],
    balancesCache: {},
    couriersList: [],
    selectedCourierId: '',
    selectedClosure: null,
    courierHistoryModalData: null,
    debounceTimer: null,

    // Estados independientes de carga y error
    closuresState: 'LOADING', // 'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR'
    closuresErrorMessage: '',
    balancesState: 'LOADING',
    balancesErrorMessage: '',

    // Rango de fechas interactivo
    dateFrom: '',
    dateTo: '',
    datePickerOpen: false,
    currentPickerMonth: new Date().getMonth(),
    currentPickerYear: new Date().getFullYear(),
    tempDateFrom: '',
    tempDateTo: '',
    dateRangeError: '',

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Resetear estados al renderizar
        courierCashControlModule.closuresState = 'LOADING';
        courierCashControlModule.closuresErrorMessage = '';
        courierCashControlModule.balancesState = 'LOADING';
        courierCashControlModule.balancesErrorMessage = '';

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header Principal -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                    <div>
                        <h2 class="text-xl font-black text-white flex items-center gap-2">
                            <span>💰</span> Caja de Motorizados & Cierres Diarios
                        </h2>
                        <p class="text-xs text-slate-400">Auditoría contable, arqueos en mesa, depósitos bancarios, actas oficiales y control de custodia de efectivo</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="courierCashControlModule.refreshData()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5">
                            <span>🔄</span> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Banner de Alerta: Motorizados Bloqueados por Custodia de Efectivo -->
                <div id="blockedCouriersAlertBanner" class="hidden bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl space-y-2">
                    <div class="flex items-center gap-2 text-rose-300 font-bold text-xs">
                        <span>🚨</span>
                        <span>ATENCIÓN DE AUDITORÍA: Motorizados Bloqueados para Nuevos Pedidos</span>
                    </div>
                    <div class="text-xs text-slate-300 space-y-1" id="blockedCouriersListContent"></div>
                </div>

                <!-- 5 KPI Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="cashControlKpiGrid">
                    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recaudado Flota</span>
                        <div class="text-xl font-black text-white mt-1" id="kpiRecaudado">C$ 0.00</div>
                        <span class="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">📈 Ledger Total</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entregado en Mesa</span>
                        <div class="text-xl font-black text-white mt-1" id="kpiEntregado">C$ 0.00</div>
                        <span class="text-[10px] text-blue-400 font-medium flex items-center gap-1 mt-1">🛡️ Arqueos Contados</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Depositado Banco</span>
                        <div class="text-xl font-black text-emerald-400 mt-1" id="kpiDepositado">C$ 0.00</div>
                        <span class="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">🏦 Con Vouchers</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Por Verificar</span>
                        <div class="text-xl font-black text-amber-400 mt-1" id="kpiPendientes">0</div>
                        <span class="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-1">⏳ En Cola de Revisión</span>
                    </div>

                    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discrepancias</span>
                        <div class="text-xl font-black text-rose-400 mt-1" id="kpiDiscrepancias">0</div>
                        <span class="text-[10px] text-rose-400 font-medium flex items-center gap-1 mt-1">⚠️ Faltantes / Sobrantes</span>
                    </div>
                </div>

                <!-- Barra de Búsqueda, Autocomplete y Date Range Picker -->
                <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                        <!-- Autocomplete Combobox de Motorizados -->
                        <div class="relative w-full md:w-72">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filtrar por Motorizado:</label>
                            <div class="relative">
                                <input type="text" id="courierAutocompleteInput" oninput="courierCashControlModule.handleAutocompleteInput(this.value)" placeholder="🔍 Nombre o UID..." class="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3.5 py-2 rounded-xl focus:outline-none focus:border-indigo-500">
                                <button id="clearCourierBtn" onclick="courierCashControlModule.clearCourierSelection()" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white">✕</button>
                            </div>
                            <div id="autocompleteDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-800"></div>
                        </div>

                        <!-- Búsqueda General -->
                        <div class="w-full md:w-56">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Búsqueda General:</label>
                            <input type="text" id="cashSearchInput" onkeyup="courierCashControlModule.renderTable()" placeholder="🔍 Ref. Bancaria o Acta..." class="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3.5 py-2 rounded-xl focus:outline-none focus:border-indigo-500">
                        </div>

                        <!-- Filtro de Estado -->
                        <div class="w-full md:w-44">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estado de Cierre:</label>
                            <select id="cashStatusFilter" onchange="courierCashControlModule.renderTable()" class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500">
                                <option value="ALL">Todos los Estados</option>
                                <option value="PENDING_ADMIN_VERIFICATION">Por Verificar</option>
                                <option value="AWAITING_BANK_DEPOSIT">Esperando Depósito</option>
                                <option value="VERIFIED">Verificados</option>
                                <option value="DISCREPANCY">Discrepancias</option>
                                <option value="REJECTED">Rechazados</option>
                            </select>
                        </div>

                        <!-- Date Range Picker Interactivo con Popover/Calendario -->
                        <div class="relative w-full md:w-72">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rango de Fechas:</label>
                            <div class="relative">
                                <button type="button" id="dateRangePickerBtn" onclick="courierCashControlModule.toggleDatePickerPopover()" class="w-full flex items-center justify-between bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl transition">
                                    <span class="flex items-center gap-2" id="dateRangeDisplayLabel">
                                        <span>📅</span>
                                        <span>Todas las fechas</span>
                                    </span>
                                    <span class="text-[10px] text-slate-500">▼</span>
                                </button>
                            </div>

                            <!-- Popover Flotante de Calendario -->
                            <div id="dateRangePopover" class="hidden absolute top-full right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-40 p-4 w-80 space-y-3">
                                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <button onclick="courierCashControlModule.navigateMonth(-1)" class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">◀</button>
                                    <span class="text-xs font-bold text-white" id="calendarMonthYearHeader"></span>
                                    <button onclick="courierCashControlModule.navigateMonth(1)" class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">▶</button>
                                </div>

                                <!-- Grid de Días de la Semana -->
                                <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500">
                                    <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span>
                                </div>

                                <!-- Grid de Días del Mes -->
                                <div class="grid grid-cols-7 gap-1 text-center text-xs" id="calendarDaysGrid"></div>

                                <!-- Presets Rápidos -->
                                <div class="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800 text-[10px]">
                                    <button onclick="courierCashControlModule.applyDatePreset('TODAY')" class="py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800">Hoy</button>
                                    <button onclick="courierCashControlModule.applyDatePreset('YESTERDAY')" class="py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800">Ayer</button>
                                    <button onclick="courierCashControlModule.applyDatePreset('LAST_7_DAYS')" class="py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800">Últimos 7 días</button>
                                </div>

                                <!-- Inputs Manuales de Fecha -->
                                <div class="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <span class="text-[9px] text-slate-400 font-bold uppercase">Desde:</span>
                                        <input type="date" id="manualDateFrom" onchange="courierCashControlModule.handleManualDateChange('from', this.value)" class="w-full bg-slate-950 border border-slate-800 text-[11px] text-white p-1 rounded-md">
                                    </div>
                                    <div>
                                        <span class="text-[9px] text-slate-400 font-bold uppercase">Hasta:</span>
                                        <input type="date" id="manualDateTo" onchange="courierCashControlModule.handleManualDateChange('to', this.value)" class="w-full bg-slate-950 border border-slate-800 text-[11px] text-white p-1 rounded-md">
                                    </div>
                                </div>

                                <!-- Mensaje de Error en Rango -->
                                <div id="popoverDateError" class="hidden text-rose-400 text-[10px] font-semibold flex items-center gap-1">
                                    <span>⚠️</span> La fecha inicial no puede ser posterior a la final.
                                </div>

                                <!-- Botones de Acción -->
                                <div class="flex items-center justify-between pt-2 border-t border-slate-800">
                                    <button onclick="courierCashControlModule.clearDateRange()" class="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition">
                                        Limpiar
                                    </button>
                                    <button onclick="courierCashControlModule.confirmDateRange()" class="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition">
                                        Aplicar Rango
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Cierres Diarios -->
                <div class="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th class="py-3 px-4">Courier</th>
                                    <th class="py-3 px-4">Acceso Courier</th>
                                    <th class="py-3 px-4">Fecha</th>
                                    <th class="py-3 px-4 text-right">Recaudado</th>
                                    <th class="py-3 px-4 text-right">Contado</th>
                                    <th class="py-3 px-4 text-right">Diferencia</th>
                                    <th class="py-3 px-4 text-right">Depositado</th>
                                    <th class="py-3 px-4 text-center">Comprobante</th>
                                    <th class="py-3 px-4">Estado</th>
                                    <th class="py-3 px-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/60 text-xs" id="closuresTableBody">
                                <tr>
                                    <td colspan="10" class="text-center py-8 text-slate-500">Cargando cierres diarios...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Container para Modales Dinámicos -->
                <div id="cashModalContainer"></div>
            </div>
        `;

        courierCashControlModule.loadCouriersList();
        courierCashControlModule.initSnapshotListeners();
        courierCashControlModule.renderCalendar();
    },

    courierNamesMap: {},

    loadCouriersList: async () => {
        try {
            courierCashControlModule.couriersList = [];
            courierCashControlModule.courierNamesMap = {};

            const [usersSnap, couriersSnap] = await Promise.all([
                db.collection('users').get().catch(() => ({ forEach: () => {} })),
                db.collection('couriers').get().catch(() => ({ forEach: () => {} }))
            ]);

            usersSnap.forEach(doc => {
                const data = doc.data() || {};
                const name = data.name || data.nombre || data.displayName || data.fullName || data.email;
                if (name) {
                    courierCashControlModule.courierNamesMap[doc.id] = name;
                }
                const uType = (data.userType || data.role || '').toLowerCase();
                if (uType === 'motorizado' || uType === 'courier' || uType === 'driver') {
                    courierCashControlModule.couriersList.push({
                        uid: doc.id,
                        name: name || 'Motorizado',
                        phone: data.phone || data.telefono || '',
                        active: data.active !== false
                    });
                }
            });

            couriersSnap.forEach(doc => {
                const data = doc.data() || {};
                const name = data.name || data.nombre || data.displayName || data.fullName;
                if (name && (!courierCashControlModule.courierNamesMap[doc.id] || courierCashControlModule.courierNamesMap[doc.id] === 'Motorizado')) {
                    courierCashControlModule.courierNamesMap[doc.id] = name;
                }
                if (!courierCashControlModule.couriersList.some(c => c.uid === doc.id)) {
                    courierCashControlModule.couriersList.push({
                        uid: doc.id,
                        name: name || 'Motorizado',
                        phone: data.phone || data.telefono || '',
                        active: data.active !== false
                    });
                }
            });
            courierCashControlModule.renderTable();
        } catch (e) {
            console.error("[COURIER_CASH_CONTROL] Error cargando lista de couriers:", e);
        }
    },

    getCourierDisplayName: (courierId, fallbackName) => {
        if (!courierId) return fallbackName || 'Motorizado';
        if (courierCashControlModule.courierNamesMap[courierId]) {
            const mapped = courierCashControlModule.courierNamesMap[courierId];
            if (mapped && mapped !== 'Repartidor' && mapped !== 'Motorizado' && mapped !== 'Courier') {
                return mapped;
            }
        }
        const found = courierCashControlModule.couriersList.find(c => c.uid === courierId);
        if (found && found.name && found.name !== 'Motorizado' && found.name !== 'Repartidor') {
            return found.name;
        }
        const bal = courierCashControlModule.balancesCache[courierId];
        if (bal && bal.courierName && bal.courierName !== 'Motorizado' && bal.courierName !== 'Repartidor') {
            return bal.courierName;
        }
        if (fallbackName && fallbackName !== 'Repartidor' && fallbackName !== 'Courier' && fallbackName !== 'Motorizado') {
            return fallbackName;
        }
        return `Motorizado (${courierId.slice(-6)})`;
    },

    getCourierDisplayNameAsync: async (courierId, fallbackName) => {
        if (!courierId) return fallbackName || 'Motorizado';
        const currentName = courierCashControlModule.getCourierDisplayName(courierId, fallbackName);
        if (currentName && !currentName.startsWith('Motorizado (')) {
            return currentName;
        }
        try {
            const [uDoc, cDoc, bDoc] = await Promise.all([
                db.collection('users').doc(courierId).get().catch(() => null),
                db.collection('couriers').doc(courierId).get().catch(() => null),
                db.collection('courier_balances').doc(courierId).get().catch(() => null)
            ]);
            const uData = uDoc && uDoc.exists ? uDoc.data() : {};
            const cData = cDoc && cDoc.exists ? cDoc.data() : {};
            const bData = bDoc && bDoc.exists ? bDoc.data() : {};
            const foundName = uData.name || uData.nombre || uData.displayName || uData.fullName
                || cData.name || cData.nombre || cData.displayName
                || bData.courierName;
            if (foundName) {
                courierCashControlModule.courierNamesMap[courierId] = foundName;
                return foundName;
            }
        } catch (e) {
            console.warn("[COURIER_CASH_CONTROL] Error resolviendo nombre async:", e);
        }
        return currentName;
    },

    printOfficialAct: async (closureId) => {
        const closure = courierCashControlModule.closuresCache.find(c => c.id === closureId);
        if (!closure) return;

        const expected = (Number(closure.expectedAmountCents || 0) / 100).toFixed(2);
        const counted = (Number(closure.countedAmountCents || 0) / 100).toFixed(2);
        const diff = (Number(closure.differenceCents || 0) / 100).toFixed(2);
        const deposited = closure.bankDeposit ? (Number(closure.bankDeposit.depositAmountCents || 0) / 100).toFixed(2) : '0.00';
        
        let courierDisplayName = await courierCashControlModule.getCourierDisplayNameAsync(closure.courierId, closure.courierName);
        if (!courierDisplayName || courierDisplayName === 'Motorizado' || courierDisplayName === 'Repartidor') {
            courierDisplayName = closure.courierName || `Motorizado (${closure.courierId.slice(-6)})`;
        }

        const actNum = closure.officialAct?.actNumber || `ACTA-${closure.closureId}`;
        const verCode = closure.officialAct?.verificationCode || closure.closureOperationId || 'ER74F05M';
        const supervisorName = closure.verifiedByName || closure.officialAct?.supervisorName || 'Gerald José Flores Gutiérrez';

        // 1. Generación Vectorial Nativa con jsPDF (100% libre de errores de canvas / páginas en blanco)
        const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (window.jsPDF ? window.jsPDF : null);

        if (jsPdfLib) {
            try {
                const doc = new jsPdfLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });

                // Cabecera Corporativa
                doc.setFillColor(15, 23, 42); // Navy 900
                doc.rect(0, 0, 210, 26, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.text('BLUESYSTEM DELIVERY ENTERPRISE', 15, 11);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(203, 213, 225);
                doc.text('Acta Oficial de Arqueo, Liquidación y Depósito Bancario', 15, 18);

                // Badge Acta No
                doc.setFillColor(22, 101, 52);
                doc.roundedRect(135, 7, 60, 12, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text(actNum, 165, 14.5, { align: 'center' });

                // 2. Sección 1: Datos de Identificación
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('1. DATOS DE IDENTIFICACIÓN Y AUDITORÍA', 15, 36);

                doc.setDrawColor(226, 232, 240);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(15, 39, 180, 28, 2, 2, 'FD');

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('Motorizado:', 20, 46);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(courierDisplayName, 52, 46);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('ID Courier:', 20, 54);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(closure.courierId, 52, 54);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('Estado Auditoría:', 20, 62);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 101, 52);
                doc.text('VERIFICADO Y APROBADO', 52, 62);

                // Columna Derecha
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('Fecha Operacional:', 120, 46);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text(closure.businessDate || 'N/A', 156, 46);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('Código Validación:', 120, 54);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(2, 132, 199);
                doc.text(verCode, 156, 54);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('Moneda Oficial:', 120, 62);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(15, 23, 42);
                doc.text('NIO (Córdobas)', 156, 62);

                // 3. Sección 2: Conciliación de 4 Capas
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('2. CONCILIACIÓN Y LIQUIDACIÓN CONTABLE (4 CAPAS)', 15, 78);

                if (typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        startY: 82,
                        margin: { left: 15, right: 15 },
                        head: [['Capa Contable', 'Concepto y Referencias', 'Monto (NIO)', 'Estado']],
                        body: [
                            ['Capa 1: Recaudación', `Efectivo total esperado (${closure.ordersCount || 0} pedidos)`, `C$ ${expected}`, 'Conforme'],
                            ['Capa 2: Arqueo Mesa', 'Efectivo físico entregado en liquidación', `C$ ${counted}`, Number(diff) === 0 ? 'Exacto' : `Diff: C$ ${diff}`],
                            ['Capa 3: Depósito Bancario', `${closure.bankDeposit?.bankName || 'Depósito'} (Ref: ${closure.bankDeposit?.bankReference || 'N/A'})`, `C$ ${deposited}`, 'Liquidado']
                        ],
                        theme: 'grid',
                        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 9 },
                        bodyStyles: { textColor: [15, 23, 42], fontSize: 8.5, cellPadding: 4 },
                        columnStyles: {
                            0: { fontStyle: 'bold', cellWidth: 42 },
                            1: { cellWidth: 78 },
                            2: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
                            3: { halign: 'center', fontStyle: 'bold', textColor: [22, 101, 52], cellWidth: 30 }
                        }
                    });
                }

                const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : 140;

                // 4. Firmas Oficiales
                doc.setDrawColor(15, 23, 42);
                doc.setLineWidth(0.5);
                doc.line(25, finalY, 85, finalY);
                doc.line(125, finalY, 185, finalY);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(courierDisplayName, 55, finalY + 5, { align: 'center' });
                doc.text(supervisorName, 155, finalY + 5, { align: 'center' });

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text('Motorizado Responsable', 55, finalY + 10, { align: 'center' });
                doc.text('Auditoría & Finanzas', 155, finalY + 10, { align: 'center' });

                // 5. Pie de Página y Hash de Seguridad
                doc.setDrawColor(203, 213, 225);
                doc.setLineWidth(0.3);
                doc.line(15, 268, 195, 268);

                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text('Documento inmutable generado por BlueSystem Delivery Enterprise.', 105, 274, { align: 'center' });
                doc.text(`Hash de Seguridad: ${verCode} | Auditoría Canónica v2.2`, 105, 279, { align: 'center' });

                doc.save(`Acta_Oficial_${actNum}.pdf`);
                return;
            } catch (pdfErr) {
                console.warn("[COURIER_CASH_CONTROL] Fallback de impresión:", pdfErr);
            }
        }

        // Fallback de impresión
        window.print();
    },

    handleAutocompleteInput: (query) => {
        clearTimeout(courierCashControlModule.debounceTimer);
        courierCashControlModule.debounceTimer = setTimeout(() => {
            const dropdown = document.getElementById('autocompleteDropdown');
            if (!dropdown) return;

            const q = (query || '').trim().toLowerCase();
            if (!q) {
                dropdown.classList.add('hidden');
                return;
            }

            const matches = courierCashControlModule.couriersList.filter(c =>
                c.name.toLowerCase().includes(q) || c.uid.toLowerCase().includes(q)
            );

            if (matches.length === 0) {
                dropdown.innerHTML = '<div class="p-3 text-xs text-slate-500 text-center">Sin resultados</div>';
                dropdown.classList.remove('hidden');
                return;
            }

            dropdown.innerHTML = matches.map(c => {
                const bal = courierCashControlModule.balancesCache[c.uid] || {};
                const outstandingCents = Number(bal.cashOutstandingCents || 0);
                const outstanding = (outstandingCents / 100).toFixed(2);
                const effectiveLimitCents = Number(bal.effectiveCashLimitCents || bal.cashLimitCents || 200000);
                const isLimitExceeded = effectiveLimitCents > 0 && outstandingCents >= effectiveLimitCents;
                const isBlocked = bal.canReceiveNewOrders === false || isLimitExceeded || bal.hasOverdueClosure === true || String(bal.financialAccessState || '').startsWith('BLOCKED');

                return `
                    <div onclick="courierCashControlModule.selectCourier('${c.uid}', '${c.name.replace(/'/g, "\\'")}')" class="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition">
                        <div>
                            <div class="text-xs font-bold text-white">${c.name}</div>
                            <div class="text-[10px] text-slate-400 font-mono">ID: ${c.uid.slice(-8)} ${c.phone ? '• ' + c.phone : ''} • Límite: C$ ${(effectiveLimitCents / 100).toFixed(2)}</div>
                        </div>
                        <div class="text-right flex items-center gap-2">
                            <div>
                                <div class="text-xs font-bold ${isBlocked ? 'text-rose-400' : 'text-slate-300'}">C$ ${outstanding}</div>
                                <span class="text-[9px] ${isBlocked ? 'text-rose-400 font-bold' : 'text-slate-500'}">${isBlocked ? '🔴 Bloqueado' : '🟢 Elegible'}</span>
                            </div>
                            <button onclick="event.stopPropagation(); courierCashControlModule.openSetCashLimitModal('${c.uid}')" title="Configurar Límite" class="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700">⚙️</button>
                        </div>
                    </div>
                `;
            }).join('');
            dropdown.classList.remove('hidden');
        }, 300);
    },

    selectCourier: (courierId, courierName) => {
        courierCashControlModule.selectedCourierId = courierId;
        const input = document.getElementById('courierAutocompleteInput');
        if (input) input.value = `${courierName} (${courierId.slice(-8)})`;

        const clearBtn = document.getElementById('clearCourierBtn');
        if (clearBtn) clearBtn.classList.remove('hidden');

        const dropdown = document.getElementById('autocompleteDropdown');
        if (dropdown) dropdown.classList.add('hidden');

        courierCashControlModule.renderTable();
    },

    clearCourierSelection: () => {
        courierCashControlModule.selectedCourierId = '';
        const input = document.getElementById('courierAutocompleteInput');
        if (input) input.value = '';

        const clearBtn = document.getElementById('clearCourierBtn');
        if (clearBtn) clearBtn.classList.add('hidden');

        courierCashControlModule.renderTable();
    },

    // ─── Date Range Picker Popover & Calendario ──────────────────────────────
    toggleDatePickerPopover: () => {
        const popover = document.getElementById('dateRangePopover');
        if (!popover) return;
        courierCashControlModule.datePickerOpen = !courierCashControlModule.datePickerOpen;
        if (courierCashControlModule.datePickerOpen) {
            popover.classList.remove('hidden');
            courierCashControlModule.renderCalendar();
        } else {
            popover.classList.add('hidden');
        }
    },

    navigateMonth: (direction) => {
        courierCashControlModule.currentPickerMonth += direction;
        if (courierCashControlModule.currentPickerMonth < 0) {
            courierCashControlModule.currentPickerMonth = 11;
            courierCashControlModule.currentPickerYear--;
        } else if (courierCashControlModule.currentPickerMonth > 11) {
            courierCashControlModule.currentPickerMonth = 0;
            courierCashControlModule.currentPickerYear++;
        }
        courierCashControlModule.renderCalendar();
    },

    renderCalendar: () => {
        const header = document.getElementById('calendarMonthYearHeader');
        const grid = document.getElementById('calendarDaysGrid');
        if (!header || !grid) return;

        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        header.textContent = `${months[courierCashControlModule.currentPickerMonth]} ${courierCashControlModule.currentPickerYear}`;

        const firstDayIndex = new Date(courierCashControlModule.currentPickerYear, courierCashControlModule.currentPickerMonth, 1).getDay();
        const totalDays = new Date(courierCashControlModule.currentPickerYear, courierCashControlModule.currentPickerMonth + 1, 0).getDate();

        let daysHtml = '';
        for (let i = 0; i < firstDayIndex; i++) {
            daysHtml += `<div></div>`;
        }

        const activeFrom = courierCashControlModule.tempDateFrom || courierCashControlModule.dateFrom;
        const activeTo = courierCashControlModule.tempDateTo || courierCashControlModule.dateTo;

        for (let day = 1; day <= totalDays; day++) {
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(courierCashControlModule.currentPickerMonth + 1).padStart(2, '0');
            const fullDate = `${courierCashControlModule.currentPickerYear}-${monthStr}-${dayStr}`;

            const isStart = activeFrom === fullDate;
            const isEnd = activeTo === fullDate;
            const inRange = activeFrom && activeTo && fullDate > activeFrom && fullDate < activeTo;

            let cellClass = 'text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer py-1.5 transition';
            if (isStart || isEnd) {
                cellClass = 'bg-indigo-600 text-white font-bold rounded-lg cursor-pointer py-1.5';
            } else if (inRange) {
                cellClass = 'bg-indigo-950/60 text-indigo-200 rounded-md cursor-pointer py-1.5';
            }

            daysHtml += `<div onclick="courierCashControlModule.handleCalendarDayClick('${fullDate}')" class="${cellClass}">${day}</div>`;
        }

        grid.innerHTML = daysHtml;

        const manualFrom = document.getElementById('manualDateFrom');
        const manualTo = document.getElementById('manualDateTo');
        if (manualFrom) manualFrom.value = activeFrom;
        if (manualTo) manualTo.value = activeTo;
    },

    handleCalendarDayClick: (fullDate) => {
        if (!courierCashControlModule.tempDateFrom || (courierCashControlModule.tempDateFrom && courierCashControlModule.tempDateTo)) {
            courierCashControlModule.tempDateFrom = fullDate;
            courierCashControlModule.tempDateTo = '';
        } else if (courierCashControlModule.tempDateFrom && !courierCashControlModule.tempDateTo) {
            if (fullDate < courierCashControlModule.tempDateFrom) {
                courierCashControlModule.tempDateTo = courierCashControlModule.tempDateFrom;
                courierCashControlModule.tempDateFrom = fullDate;
            } else {
                courierCashControlModule.tempDateTo = fullDate;
            }
        }
        courierCashControlModule.renderCalendar();
    },

    handleManualDateChange: (type, val) => {
        if (type === 'from') courierCashControlModule.tempDateFrom = val;
        if (type === 'to') courierCashControlModule.tempDateTo = val;

        const errEl = document.getElementById('popoverDateError');
        if (courierCashControlModule.tempDateFrom && courierCashControlModule.tempDateTo && courierCashControlModule.tempDateFrom > courierCashControlModule.tempDateTo) {
            if (errEl) errEl.classList.remove('hidden');
        } else {
            if (errEl) errEl.classList.add('hidden');
        }
        courierCashControlModule.renderCalendar();
    },

    applyDatePreset: (preset) => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];

        if (preset === 'TODAY') {
            courierCashControlModule.tempDateFrom = fmt(today);
            courierCashControlModule.tempDateTo = fmt(today);
        } else if (preset === 'YESTERDAY') {
            const y = new Date(today);
            y.setDate(y.getDate() - 1);
            courierCashControlModule.tempDateFrom = fmt(y);
            courierCashControlModule.tempDateTo = fmt(y);
        } else if (preset === 'LAST_7_DAYS') {
            const past = new Date(today);
            past.setDate(past.getDate() - 6);
            courierCashControlModule.tempDateFrom = fmt(past);
            courierCashControlModule.tempDateTo = fmt(today);
        }
        courierCashControlModule.renderCalendar();
    },

    clearDateRange: () => {
        courierCashControlModule.dateFrom = '';
        courierCashControlModule.dateTo = '';
        courierCashControlModule.tempDateFrom = '';
        courierCashControlModule.tempDateTo = '';
        courierCashControlModule.datePickerOpen = false;

        const popover = document.getElementById('dateRangePopover');
        if (popover) popover.classList.add('hidden');

        const label = document.getElementById('dateRangeDisplayLabel');
        if (label) label.innerHTML = `<span>📅</span><span>Todas las fechas</span>`;

        courierCashControlModule.renderTable();
    },

    confirmDateRange: () => {
        if (courierCashControlModule.tempDateFrom && courierCashControlModule.tempDateTo && courierCashControlModule.tempDateFrom > courierCashControlModule.tempDateTo) {
            const errEl = document.getElementById('popoverDateError');
            if (errEl) errEl.classList.remove('hidden');
            return;
        }

        courierCashControlModule.dateFrom = courierCashControlModule.tempDateFrom || '';
        courierCashControlModule.dateTo = courierCashControlModule.tempDateTo || courierCashControlModule.dateFrom;
        courierCashControlModule.datePickerOpen = false;

        const popover = document.getElementById('dateRangePopover');
        if (popover) popover.classList.add('hidden');

        const label = document.getElementById('dateRangeDisplayLabel');
        if (label) {
            if (courierCashControlModule.dateFrom && courierCashControlModule.dateTo) {
                label.innerHTML = `<span>📅</span><span class="font-bold text-white">${courierCashControlModule.dateFrom} - ${courierCashControlModule.dateTo}</span>`;
            } else if (courierCashControlModule.dateFrom) {
                label.innerHTML = `<span>📅</span><span class="font-bold text-white">${courierCashControlModule.dateFrom}</span>`;
            } else {
                label.innerHTML = `<span>📅</span><span>Todas las fechas</span>`;
            }
        }

        courierCashControlModule.renderTable();
    },

    // ─── Snapshot Listeners y Manejo de Errores Firestore ────────────────────
    initSnapshotListeners: () => {
        if (courierCashControlModule.unsubscribeClosures) {
            courierCashControlModule.unsubscribeClosures();
            courierCashControlModule.unsubscribeClosures = null;
        }
        if (courierCashControlModule.unsubscribeBalances) {
            courierCashControlModule.unsubscribeBalances();
            courierCashControlModule.unsubscribeBalances = null;
        }

        // 1. Escuchar Balances para monitoreo de bloqueos en vivo
        courierCashControlModule.balancesState = 'LOADING';
        courierCashControlModule.unsubscribeBalances = db.collection('courier_balances')
            .onSnapshot(
                snap => {
                    courierCashControlModule.balancesState = 'SUCCESS';
                    courierCashControlModule.balancesErrorMessage = '';
                    courierCashControlModule.balancesCache = {};
                    const blockedList = [];

                    snap.forEach(doc => {
                        const data = doc.data();
                        courierCashControlModule.balancesCache[doc.id] = data;

                        const outstandingCents = Number(data.cashOutstandingCents || 0);
                        const effectiveLimitCents = Number(data.effectiveCashLimitCents || data.cashLimitCents || 200000);
                        const isLimitExceeded = effectiveLimitCents > 0 && outstandingCents >= effectiveLimitCents;
                        const isOverdue = data.hasOverdueClosure === true || data.financialAccessState === 'BLOCKED_OVERDUE_CLOSURE' || data.financialAccessState === 'BLOCKED_CASH_LIMIT_AND_OVERDUE';
                        const isBlocked = data.canReceiveNewOrders === false || isLimitExceeded || isOverdue || (data.financialAccessState && data.financialAccessState.startsWith('BLOCKED'));

                        if (isBlocked) {
                            blockedList.push({
                                id: doc.id,
                                name: data.courierName || doc.id.slice(-8),
                                outstandingCents,
                                effectiveLimitCents,
                                state: data.financialAccessState || (isLimitExceeded && isOverdue ? 'BLOCKED_CASH_LIMIT_AND_OVERDUE' : isLimitExceeded ? 'BLOCKED_CASH_LIMIT' : 'BLOCKED_OVERDUE_CLOSURE'),
                                reason: data.financialAccessReason || (isLimitExceeded ? `Límite de C$ ${(effectiveLimitCents / 100).toFixed(2)} alcanzado` : 'Cierre de día anterior pendiente')
                            });
                        }
                    });

                    courierCashControlModule.renderBlockedAlert(blockedList);
                    courierCashControlModule.renderTable();
                },
                err => {
                    console.error("[COURIER_CASH_CONTROL] Error en balances snapshot:", err);
                    courierCashControlModule.balancesState = 'ERROR';
                    courierCashControlModule.balancesErrorMessage = err.code === 'permission-denied'
                        ? 'Sin permisos para consultar balances de motorizados.'
                        : (err.message || 'Error al consultar balances.');
                }
            );

        // 2. Escuchar Cierres Diarios
        courierCashControlModule.closuresState = 'LOADING';
        courierCashControlModule.unsubscribeClosures = db.collection('courier_daily_closures')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .onSnapshot(
                snapshot => {
                    courierCashControlModule.closuresState = 'SUCCESS';
                    courierCashControlModule.closuresErrorMessage = '';
                    courierCashControlModule.closuresCache = [];
                    snapshot.forEach(doc => {
                        courierCashControlModule.closuresCache.push({ id: doc.id, ...doc.data() });
                    });
                    courierCashControlModule.updateKpis();
                    courierCashControlModule.renderTable();
                },
                err => {
                    console.error("[COURIER_CASH_CONTROL] Error en closures snapshot:", err);
                    courierCashControlModule.closuresState = 'ERROR';
                    courierCashControlModule.closuresErrorMessage = err.code === 'permission-denied'
                        ? 'Sin permisos para consultar cierres de motorizados.'
                        : (err.message || 'Error al consultar cierres diarios.');
                    courierCashControlModule.renderTable();
                }
            );
    },

    renderBlockedAlert: (blockedList) => {
        const banner = document.getElementById('blockedCouriersAlertBanner');
        const content = document.getElementById('blockedCouriersListContent');
        if (!banner || !content) return;

        if (blockedList.length === 0) {
            banner.classList.add('hidden');
            return;
        }

        banner.classList.remove('hidden');
        content.innerHTML = blockedList.map(b => `
            <div class="flex items-center justify-between bg-rose-900/30 p-2 rounded-lg border border-rose-800/40">
                <div>
                    <strong class="text-white">${b.name}</strong> (${b.id.slice(-8)}): 
                    <span class="text-rose-300 font-bold">C$ ${(b.outstandingCents / 100).toFixed(2)}</span> en custodia
                </div>
                <div class="text-[10px] text-rose-300 font-mono">Motivo: ${b.reason}</div>
            </div>
        `).join('');
    },

    refreshData: () => {
        courierCashControlModule.initSnapshotListeners();
    },

    updateKpis: () => {
        let totalRecaudadoCents = 0;
        let totalEntregadoCents = 0;
        let totalDepositadoCents = 0;
        let pendientesCount = 0;
        let discrepanciasCount = 0;

        courierCashControlModule.closuresCache.forEach(c => {
            totalRecaudadoCents += Number(c.expectedAmountCents || 0);
            totalEntregadoCents += Number(c.countedAmountCents || 0);
            if (c.bankDeposit) {
                totalDepositadoCents += Number(c.bankDeposit.depositAmountCents || 0);
            }
            if (c.status === 'PENDING_ADMIN_VERIFICATION' || c.status === 'DEPOSIT_RECEIPT_UPLOADED') {
                pendientesCount++;
            }
            if (c.status === 'DISCREPANCY' || c.differenceCents !== 0 || (c.bankDeposit && c.bankDeposit.depositDiscrepancyCents !== 0)) {
                discrepanciasCount++;
            }
        });

        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl('kpiRecaudado', `C$ ${(totalRecaudadoCents / 100).toFixed(2)}`);
        setEl('kpiEntregado', `C$ ${(totalEntregadoCents / 100).toFixed(2)}`);
        setEl('kpiDepositado', `C$ ${(totalDepositadoCents / 100).toFixed(2)}`);
        setEl('kpiPendientes', pendientesCount);
        setEl('kpiDiscrepancias', discrepanciasCount);
    },

    renderTable: () => {
        const tbody = document.getElementById('closuresTableBody');
        if (!tbody) return;

        // 1. Estado de Error
        if (courierCashControlModule.closuresState === 'ERROR') {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-8 text-rose-400 bg-rose-950/20 font-semibold">
                        <div class="flex flex-col items-center gap-2">
                            <span class="text-2xl">🚫</span>
                            <span>${courierCashControlModule.closuresErrorMessage}</span>
                            <span class="text-[10px] text-slate-400 font-mono">Verifique que su cuenta tenga asignado un rol administrativo o de supervisión autorizado.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // 2. Estado de Carga
        if (courierCashControlModule.closuresState === 'LOADING') {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-8 text-slate-500">
                        Cargando cierres diarios...
                    </td>
                </tr>
            `;
            return;
        }

        const search = (document.getElementById('cashSearchInput')?.value || '').toLowerCase();
        const status = document.getElementById('cashStatusFilter')?.value || 'ALL';
        const dateFrom = courierCashControlModule.dateFrom;
        const dateTo = courierCashControlModule.dateTo;
        const selectedCourier = courierCashControlModule.selectedCourierId;

        const filtered = courierCashControlModule.closuresCache.filter(c => {
            const matchesCourier = !selectedCourier || c.courierId === selectedCourier;

            const matchesSearch = !search ||
                (c.courierName || '').toLowerCase().includes(search) ||
                (c.courierId || '').toLowerCase().includes(search) ||
                (c.bankDeposit?.bankReference || '').toLowerCase().includes(search) ||
                (c.officialAct?.actNumber || '').toLowerCase().includes(search);

            const matchesStatus = status === 'ALL' || c.status === status;

            let matchesDate = true;
            if (dateFrom && c.businessDate < dateFrom) matchesDate = false;
            if (dateTo && c.businessDate > dateTo) matchesDate = false;

            return matchesCourier && matchesSearch && matchesStatus && matchesDate;
        });

        // 3. Estado Vacío
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-8 text-slate-500">
                        No se encontraron cierres con los criterios seleccionados.
                    </td>
                </tr>
            `;
            return;
        }

        // 4. Estado Exitoso
        tbody.innerHTML = filtered.map(c => {
            const expected = (Number(c.expectedAmountCents || 0) / 100).toFixed(2);
            const counted = (Number(c.countedAmountCents || 0) / 100).toFixed(2);
            const diffNum = Number(c.differenceCents || 0) / 100;
            const diffStr = diffNum.toFixed(2);
            const deposited = c.bankDeposit ? `C$ ${(Number(c.bankDeposit.depositAmountCents || 0) / 100).toFixed(2)}` : '—';
            const hasVoucher = Boolean(c.bankDeposit?.receiptDownloadUrl);

            const bal = courierCashControlModule.balancesCache[c.courierId] || {};
            const outstanding = Number(bal.cashOutstandingCents || 0);
            const isBlocked = outstanding > 200000 || bal.financialAccessState === 'BLOCKED_OVERDUE_CLOSURE' || bal.financialAccessState === 'BLOCKED_CASH_LIMIT_AND_OVERDUE';
            const isNearLimit = outstanding > 150000 && !isBlocked;

            const accessBadge = isBlocked
                ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">🔴 BLOQUEADO</span>'
                : isNearLimit
                ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">🟠 CERCA LÍMITE</span>'
                : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 ACTIVO</span>';

            const statusBadgeClass =
                c.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                c.status === 'PENDING_ADMIN_VERIFICATION' || c.status === 'DEPOSIT_RECEIPT_UPLOADED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                c.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                'bg-slate-800 text-slate-300 border border-slate-700';

            const displayName = courierCashControlModule.getCourierDisplayName(c.courierId, c.courierName);

            return `
                <tr class="hover:bg-slate-800/30 transition">
                    <td class="py-3 px-4 font-semibold text-white">
                        <div class="flex items-center gap-1.5">
                            <span class="hover:text-indigo-400 cursor-pointer" onclick="courierCashControlModule.openCourierHistory('${c.courierId}', '${displayName.replace(/'/g, "\\'")}')">
                                ${displayName}
                            </span>
                            <button onclick="courierCashControlModule.openCourierHistory('${c.courierId}', '${displayName.replace(/'/g, "\\'")}')" title="Ver Historial Completo" class="text-[10px] text-slate-500 hover:text-indigo-300">
                                📊
                            </button>
                        </div>
                        <div class="text-[10px] text-slate-500 font-mono">${(c.courierId || '').slice(-8)}</div>
                    </td>
                    <td class="py-3 px-4">${accessBadge}</td>
                    <td class="py-3 px-4 text-slate-300 font-mono">${c.businessDate}</td>
                    <td class="py-3 px-4 text-right font-bold text-white">C$ ${expected}</td>
                    <td class="py-3 px-4 text-right text-slate-300">C$ ${counted}</td>
                    <td class="py-3 px-4 text-right font-bold ${diffNum === 0 ? 'text-slate-400' : diffNum < 0 ? 'text-rose-400' : 'text-emerald-400'}">
                        ${diffNum === 0 ? 'C$ 0.00' : `C$ ${diffStr}`}
                    </td>
                    <td class="py-3 px-4 text-right font-bold text-emerald-400">${deposited}</td>
                    <td class="py-3 px-4 text-center">
                        ${hasVoucher ? `
                            <button onclick="courierCashControlModule.openVoucherZoom('${c.bankDeposit.receiptDownloadUrl}')" class="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold underline inline-flex items-center gap-1">
                                👁️ Ver
                            </button>
                        ` : `
                            <span class="text-[10px] text-slate-600">Sin archivo</span>
                        `}
                    </td>
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}">
                            ${c.status}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-center space-x-1.5">
                        <button onclick="courierCashControlModule.openClosureDetail('${c.id}')" class="px-2.5 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition">
                            Detalle 4-Capas
                        </button>
                        ${c.status === 'VERIFIED' ? `
                            <button onclick="courierCashControlModule.printOfficialAct('${c.id}')" class="px-2 py-1 text-[10px] font-bold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40 rounded-lg transition" title="Descargar Acta PDF">
                                📄 Acta
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ─── Modal de Reconciliación de 4 Capas ────────────────────────────────────
    openClosureDetail: async (closureId) => {
        const closure = courierCashControlModule.closuresCache.find(c => c.id === closureId);
        if (!closure) return;
        courierCashControlModule.selectedClosure = closure;

        const modalContainer = document.getElementById('cashModalContainer');
        if (!modalContainer) return;

        let ledgerRowsHtml = '<tr><td colspan="4" class="text-center py-4 text-slate-500">Consultando subledger...</td></tr>';

        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                    <div class="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                                    CIERRE #${closure.closureId ? closure.closureId.slice(-8) : closure.id.slice(-8)}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${closure.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                    ${closure.status}
                                </span>
                            </div>
                            <h3 class="text-base font-black text-white mt-1">
                                ${closure.courierName || 'Courier'} — ${closure.businessDate}
                            </h3>
                        </div>
                        <button onclick="courierCashControlModule.closeModal()" class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
                            ✕
                        </button>
                    </div>

                    <div class="p-6 space-y-6 flex-1">
                        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                Conciliación Financiera Cuatripartita
                            </h4>
                            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                <div class="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span class="text-slate-400 text-[10px] uppercase font-bold">1. Recaudación</span>
                                    <div class="text-sm font-black text-white mt-0.5">
                                        C$ ${(Number(closure.expectedAmountCents || 0) / 100).toFixed(2)}
                                    </div>
                                    <span class="text-[10px] text-slate-400">${closure.ordersCount || 0} pedidos cobrados</span>
                                </div>

                                <div class="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span class="text-slate-400 text-[10px] uppercase font-bold">2. Arqueo en Mesa</span>
                                    <div class="text-sm font-black text-white mt-0.5">
                                        C$ ${(Number(closure.countedAmountCents || 0) / 100).toFixed(2)}
                                    </div>
                                    <span class="text-[10px] text-slate-400">Diff: C$ ${(Number(closure.differenceCents || 0) / 100).toFixed(2)}</span>
                                </div>

                                <div class="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span class="text-slate-400 text-[10px] uppercase font-bold">3. Depósito Banco</span>
                                    <div class="text-sm font-black text-emerald-400 mt-0.5">
                                        C$ ${closure.bankDeposit ? (Number(closure.bankDeposit.depositAmountCents || 0) / 100).toFixed(2) : '0.00'}
                                    </div>
                                    <span class="text-[10px] text-slate-400">${closure.bankDeposit?.bankName || 'Sin voucher'}</span>
                                </div>

                                <div class="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <span class="text-slate-400 text-[10px] uppercase font-bold">4. Acta Oficial</span>
                                    <div class="text-xs font-bold text-white mt-0.5 truncate">
                                        ${closure.officialAct?.actNumber || 'Pendiente'}
                                    </div>
                                    <span class="text-[10px] text-slate-400 font-mono">${closure.officialAct?.verificationCode || '—'}</span>
                                </div>
                            </div>
                        </div>

                        ${closure.bankDeposit ? `
                            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                                <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Datos del Depósito y Voucher</h4>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span class="text-slate-400 text-[10px] uppercase">Banco:</span>
                                        <div class="font-bold text-white">${closure.bankDeposit.bankName}</div>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[10px] uppercase">Referencia / Boucher:</span>
                                        <div class="font-mono font-bold text-indigo-300">${closure.bankDeposit.bankReference}</div>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[10px] uppercase">Fecha y Hora:</span>
                                        <div class="font-semibold text-slate-300">${closure.bankDeposit.depositDate} ${closure.bankDeposit.depositTime || ''}</div>
                                    </div>
                                </div>

                                ${closure.bankDeposit.receiptDownloadUrl ? `
                                    <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                                        <span class="text-xs text-slate-300 flex items-center gap-1.5">
                                            <span>🧾</span> Comprobante bancario digitalizado
                                        </span>
                                        <button onclick="courierCashControlModule.openVoucherZoom('${closure.bankDeposit.receiptDownloadUrl}')" class="px-3 py-1.5 text-xs font-bold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/40 rounded-lg transition">
                                            🔍 Ver Voucher con Zoom
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        <div class="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                            <div class="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                                <span class="text-xs font-bold text-slate-300 uppercase">Desglose de Pedidos Cobrados (Subledger)</span>
                            </div>
                            <div class="max-h-48 overflow-y-auto">
                                <table class="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr class="bg-slate-900/80 text-[10px] text-slate-400 font-bold border-b border-slate-800">
                                            <th class="py-2 px-3">Pedido / Encomienda</th>
                                            <th class="py-2 px-3">Dominio</th>
                                            <th class="py-2 px-3">Descripción</th>
                                            <th class="py-2 px-3 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800" id="ledgerDetailTableBody">
                                        ${ledgerRowsHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="p-5 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button onclick="courierCashControlModule.printOfficialAct('${closure.id}')" class="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center justify-center gap-1.5">
                            <span>📄</span> Imprimir / Descargar Acta
                        </button>

                        ${closure.status !== 'VERIFIED' && closure.status !== 'REJECTED' ? `
                            <div class="flex items-center gap-2 w-full sm:w-auto">
                                <button onclick="courierCashControlModule.promptRejectClosure('${closure.id}')" class="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 rounded-xl transition">
                                    Rechazar
                                </button>
                                <button onclick="courierCashControlModule.verifyClosure('${closure.id}')" class="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5">
                                    <span>✅</span> Aprobar Cierre
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        try {
            const snap = await db.collection('courier_cash_ledger')
                .where('courierId', '==', closure.courierId)
                .where('direction', '==', 'CREDIT')
                .limit(50)
                .get();

            const tbody = document.getElementById('ledgerDetailTableBody');
            if (tbody) {
                if (snap.empty) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-500">Sin asientos en subledger</td></tr>';
                } else {
                    let html = '';
                    snap.forEach(doc => {
                        const item = doc.data();
                        html += `
                            <tr>
                                <td class="py-2 px-3 font-mono font-bold text-slate-200">
                                    ${item.orderCode ? item.orderCode : item.orderId ? '#' + item.orderId.slice(-6).toUpperCase() : item.tripId ? 'TRIP-#' + item.tripId.slice(-6).toUpperCase() : doc.id.slice(-6)}
                                </td>
                                <td class="py-2 px-3 text-slate-400">${item.sourceDomain || 'FOOD_DELIVERY'}</td>
                                <td class="py-2 px-3 text-slate-300">${item.description || 'Cobro en efectivo'}</td>
                                <td class="py-2 px-3 text-right font-bold text-emerald-400">
                                    C$ ${(Number(item.amountCents || 0) / 100).toFixed(2)}
                                </td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }
            }
        } catch (e) {
            console.error("Error consultando subledger:", e);
        }
    },

    verifyClosure: async (closureId) => {
        if (!confirm("¿Desea aprobar este cierre diario y emitir el Acta Oficial inmutable?")) return;
        try {
            const fn = firebase.functions().httpsCallable('verifyCourierDailyClosure');
            await fn({ closureId, action: 'VERIFY' });
            alert("Cierre verificado con éxito. Acta Oficial emitida.");
            courierCashControlModule.closeModal();
        } catch (err) {
            alert("Error aprobando cierre: " + err.message);
        }
    },

    promptRejectClosure: (closureId) => {
        const reason = prompt("Ingrese el motivo formal del rechazo del cierre:");
        if (!reason || !reason.trim()) return;
        courierCashControlModule.rejectClosure(closureId, reason.trim());
    },

    rejectClosure: async (closureId, reason) => {
        try {
            const fn = firebase.functions().httpsCallable('verifyCourierDailyClosure');
            await fn({ closureId, action: 'REJECT', rejectionReason: reason });
            alert("Cierre rechazado formalmente.");
            courierCashControlModule.closeModal();
        } catch (err) {
            alert("Error rechazando cierre: " + err.message);
        }
    },

    openVoucherZoom: (url) => {
        const zoomModal = document.createElement('div');
        zoomModal.id = 'voucherZoomModal';
        zoomModal.className = 'fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4';
        zoomModal.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 relative shadow-2xl flex flex-col items-center">
                <button onclick="document.getElementById('voucherZoomModal').remove()" class="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition">
                    ✕
                </button>
                <h4 class="text-xs font-bold text-slate-300 uppercase mb-3">Comprobante de Depósito Bancario</h4>
                <div class="max-h-[75vh] overflow-auto rounded-lg border border-slate-800">
                    <img src="${url}" alt="Comprobante Bancario" class="max-w-full h-auto object-contain">
                </div>
                <div class="mt-3 flex items-center gap-2">
                    <a href="${url}" target="_blank" rel="noreferrer" class="text-xs font-bold text-indigo-400 hover:underline">
                        🔗 Abrir imagen original en pestaña
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(zoomModal);
    },

    openCourierHistory: async (courierId, courierName) => {
        const modalContainer = document.getElementById('cashModalContainer');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                    <div class="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                        <div>
                            <span class="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Perfil & Historial Financiero Integral</span>
                            <h3 class="text-base font-black text-white">${courierName} (UID: ${courierId.slice(-8)})</h3>
                        </div>
                        <button onclick="courierCashControlModule.closeModal()" class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
                            ✕
                        </button>
                    </div>
                    <div class="p-6 space-y-6" id="courierHistoryContent">
                        <div class="flex items-center justify-center py-10">
                            <div class="text-center space-y-2">
                                <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p class="text-xs text-slate-400">Reconciliando subledger y estado operativo...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            const balDoc = await db.collection('courier_balances').doc(courierId).get();
            const bal = balDoc.exists ? balDoc.data() : { cashOutstandingCents: 0, totalCollectedCents: 0, totalSettledCents: 0, financialAccessState: 'ALLOW', canReceiveNewOrders: true };

            const ledgerSnap = await db.collection('courier_cash_ledger')
                .where('courierId', '==', courierId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            let cashCommerceCents = 0;
            let ordersCommerceCount = 0;
            let cashXToYCents = 0;
            let tripsXToYCount = 0;
            const entriesList = [];

            ledgerSnap.forEach(d => {
                const data = d.data();
                entriesList.push({ id: d.id, ...data });
                if (data.direction === 'CREDIT') {
                    if (data.sourceDomain === 'X_TO_Y_DELIVERY') {
                        cashXToYCents += Number(data.amountCents || 0);
                        tripsXToYCount++;
                    } else {
                        cashCommerceCents += Number(data.amountCents || 0);
                        ordersCommerceCount++;
                    }
                }
            });

            const totalCashCollectedCents = cashCommerceCents + cashXToYCents;
            const outstandingCents = Number(bal.cashOutstandingCents || 0);
            const isBlocked = outstandingCents > 200000 || bal.financialAccessState === 'BLOCKED_OVERDUE_CLOSURE' || bal.financialAccessState === 'BLOCKED_CASH_LIMIT_AND_OVERDUE';
            const accessReason = bal.financialAccessReason || (isBlocked ? 'Límite de custodia o cierre vencido' : 'Acceso autorizado');

            const content = document.getElementById('courierHistoryContent');
            if (content) {
                content.innerHTML = `
                    <!-- 1. Estado Operativo y Acceso -->
                    <div class="p-4 rounded-xl border ${isBlocked ? 'bg-rose-950/30 border-rose-800/60' : 'bg-emerald-950/20 border-emerald-800/40'} flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold ${isBlocked ? 'text-rose-400' : 'text-emerald-400'}">
                                    ${isBlocked ? '🔴 ACCESO A NUEVOS PEDIDOS BLOQUEADO' : '🟢 ACCESO AUTORIZADO (ACTIVO)'}
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                                    ${bal.financialAccessState || 'ALLOW'}
                                </span>
                            </div>
                            <p class="text-xs text-slate-300 mt-1">${accessReason}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-slate-400 font-bold uppercase">Saldo Vivo en Mano</span>
                            <div class="text-lg font-black ${isBlocked ? 'text-rose-400' : 'text-amber-400'} font-mono">
                                C$ ${(outstandingCents / 100).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <!-- 2. Comparativo por Línea de Negocio (Commerce vs X->Y) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Card Comercio -->
                        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                    <span>🏪</span> Delivery Comercio (Restaurantes/Tiendas)
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">${ordersCommerceCount} entregas</span>
                            </div>
                            <div class="flex justify-between items-center text-xs pt-1">
                                <span class="text-slate-400">Efectivo Recaudado:</span>
                                <strong class="text-white font-mono">C$ ${(cashCommerceCents / 100).toFixed(2)}</strong>
                            </div>
                        </div>

                        <!-- Card X->Y Encomiendas -->
                        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                    <span>📦</span> Encomiendas X→Y (Punto A → Punto B)
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">${tripsXToYCount} viajes</span>
                            </div>
                            <div class="flex justify-between items-center text-xs pt-1">
                                <span class="text-slate-400">Efectivo Recaudado:</span>
                                <strong class="text-white font-mono">C$ ${(cashXToYCents / 100).toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- 3. Totales Consolidados -->
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span class="text-slate-400 text-[10px] uppercase font-bold">Total Recaudado</span>
                            <div class="text-base font-black text-white mt-1">C$ ${(totalCashCollectedCents / 100).toFixed(2)}</div>
                            <span class="text-[10px] text-slate-400">${ordersCommerceCount + tripsXToYCount} cobros</span>
                        </div>
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span class="text-slate-400 text-[10px] uppercase font-bold">Total Liquidado</span>
                            <div class="text-base font-black text-emerald-400 mt-1">C$ ${(Number(bal.totalSettledCents || 0) / 100).toFixed(2)}</div>
                            <span class="text-[10px] text-slate-400">Verificado en banco</span>
                        </div>
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <span class="text-slate-400 text-[10px] uppercase font-bold">Saldo Pendiente</span>
                            <div class="text-base font-black text-amber-400 mt-1">C$ ${(outstandingCents / 100).toFixed(2)}</div>
                            <span class="text-[10px] text-slate-400">Bajo custodia actual</span>
                        </div>
                    </div>

                    <!-- 4. Tabla de Movimientos Recientes del Subledger -->
                    <div class="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                        <div class="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-300 uppercase">Últimos Asientos en /courier_cash_ledger</span>
                            <span class="text-[10px] text-slate-400 font-mono">${entriesList.length} movimientos</span>
                        </div>
                        <div class="max-h-56 overflow-y-auto">
                            <table class="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/80 text-[10px] text-slate-400 font-bold border-b border-slate-800">
                                        <th class="py-2 px-3">Ref ID</th>
                                        <th class="py-2 px-3">Línea</th>
                                        <th class="py-2 px-3">Tipo / Descripción</th>
                                        <th class="py-2 px-3 text-center">Sentido</th>
                                        <th class="py-2 px-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60 font-mono">
                                    ${entriesList.length === 0 ? `
                                        <tr><td colspan="5" class="text-center py-4 text-slate-500 font-sans">Sin movimientos</td></tr>
                                    ` : entriesList.map(e => `
                                        <tr>
                                            <td class="py-2 px-3 text-slate-200 font-bold">
                                                ${e.orderCode ? e.orderCode : e.orderId ? '#' + e.orderId.slice(-6).toUpperCase() : e.tripId ? 'TRIP-' + e.tripId.slice(-6).toUpperCase() : e.closureId ? 'CLO-' + e.closureId.slice(-6) : e.id.slice(-6)}
                                            </td>
                                            <td class="py-2 px-3 text-slate-400 font-sans text-[11px]">${e.sourceDomain || 'COMMERCE'}</td>
                                            <td class="py-2 px-3 text-slate-300 font-sans text-[11px]">${e.description || e.eventType}</td>
                                            <td class="py-2 px-3 text-center">
                                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${e.direction === 'CREDIT' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}">
                                                    ${e.direction === 'CREDIT' ? 'CREDIT (+)' : 'DEBIT (-)'}
                                                </span>
                                            </td>
                                            <td class="py-2 px-3 text-right font-bold ${e.direction === 'CREDIT' ? 'text-slate-100' : 'text-emerald-400'}">
                                                C$ ${(Number(e.amountCents || 0) / 100).toFixed(2)}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Error cargando historial de Courier:", e);
        }
    },

    openSetCashLimitModal: (courierId) => {
        const modalContainer = document.getElementById('cashModalContainer');
        if (!modalContainer) return;

        const bal = courierCashControlModule.balancesCache[courierId] || {};
        const courierObj = courierCashControlModule.couriersList.find(c => c.uid === courierId) || {};
        const courierName = bal.courierName || courierObj.name || courierId;
        const currentLimitNio = (Number(bal.effectiveCashLimitCents || bal.cashLimitCents || 200000) / 100).toFixed(2);
        const currentCashNio = (Number(bal.cashOutstandingCents || 0) / 100).toFixed(2);

        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                            <h3 class="text-base font-bold text-white flex items-center gap-2">
                                <span>⚙️</span> Límite de Custodia de Efectivo
                            </h3>
                            <p class="text-xs text-slate-400 mt-0.5">Motorizado: <strong class="text-indigo-300">${courierName}</strong></p>
                        </div>
                        <button onclick="courierCashControlModule.closeModal()" class="text-slate-400 hover:text-white p-1">✕</button>
                    </div>

                    <div class="space-y-3 text-xs">
                        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                            <span class="text-slate-400">Efectivo en Custodia Actual:</span>
                            <span class="font-bold text-white font-mono">C$ ${currentCashNio}</span>
                        </div>

                        <div>
                            <label class="block text-slate-300 font-semibold mb-1">Nuevo Límite Máximo de Efectivo (NIO):</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">C$</span>
                                <input type="number" step="50" min="0" max="100000" id="inputNewCashLimit" value="${currentLimitNio}" class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-500">
                            </div>
                            <span class="text-[10px] text-slate-500 mt-1 block">Default global: C$ 2,000.00. Al alcanzar este monto, se detiene la recepción de nuevos pedidos.</span>
                        </div>

                        <div>
                            <label class="block text-slate-300 font-semibold mb-1">Motivo del Ajuste:</label>
                            <input type="text" id="inputCashLimitReason" placeholder="Ej: Ajuste por volumen de ventas / Historial de confianza" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
                        </div>

                        <div id="setCashLimitFeedback" class="hidden text-xs p-2.5 rounded-lg"></div>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button onclick="courierCashControlModule.closeModal()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition border border-slate-700">
                            Cancelar
                        </button>
                        <button id="btnSaveCashLimit" onclick="courierCashControlModule.submitCourierCashLimit('${courierId}')" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20">
                            Guardar Límite
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    submitCourierCashLimit: async (courierId) => {
        const inputLimit = document.getElementById('inputNewCashLimit');
        const inputReason = document.getElementById('inputCashLimitReason');
        const feedback = document.getElementById('setCashLimitFeedback');
        const btnSave = document.getElementById('btnSaveCashLimit');

        if (!inputLimit) return;
        const newLimitNio = parseFloat(inputLimit.value);
        if (isNaN(newLimitNio) || newLimitNio < 0) {
            if (feedback) {
                feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/50';
                feedback.textContent = 'Ingrese un monto válido de límite en NIO.';
                feedback.classList.remove('hidden');
            }
            return;
        }

        const reason = (inputReason?.value || 'Ajuste de límite de custodia por Administración').trim();

        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = 'Guardando...';
        }

        try {
            const adminSetLimitFn = firebase.functions().httpsCallable('adminSetCourierCashLimit');
            const result = await adminSetLimitFn({
                courierId,
                cashLimit: newLimitNio,
                reason
            });

            if (feedback) {
                feedback.className = 'text-xs p-2.5 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-800/50';
                feedback.textContent = `Límite actualizado exitosamente a C$ ${newLimitNio.toFixed(2)}.`;
                feedback.classList.remove('hidden');
            }

            setTimeout(() => {
                courierCashControlModule.closeModal();
            }, 1200);
        } catch (err) {
            console.error('[SET_CASH_LIMIT_ERR]', err);
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = 'Guardar Límite';
            }
            if (feedback) {
                feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/50';
                feedback.textContent = err.message || 'Error al actualizar el límite de efectivo.';
                feedback.classList.remove('hidden');
            }
        }
    },

    closeModal: () => {
        const modalContainer = document.getElementById('cashModalContainer');
        if (modalContainer) modalContainer.innerHTML = '';
        courierCashControlModule.selectedClosure = null;
    }
};

window.courierCashControlModule = courierCashControlModule;
