/**
 * Módulo de Reportes & Analítica Enterprise — Panel Admin Control Center
 * BlueSystem Delivery Enterprise — Production Grade / Multi-Tenant / E2E Certified
 *
 * Características:
 * - Doble Modo: Visión General (Todos los Comercios) o Filtro por Comercio Específico.
 * - 5 Pestañas: Resumen Ejecutivo, Canales & Plataformas, Ranking de Productos, Tendencia Diaria, Comercio × Plataforma.
 * - Métricas de Negocio: Ventas C$, Total Pedidos, Ticket Promedio, Tasa Cancelación, Hora Pico, Comercio Líder, Producto Estrella.
 * - Comparativa de Crecimiento vs Período Anterior.
 * - Distribución Horaria Visual Interactiva (00h - 23h).
 * - Exportación a CSV Analítico e Impresión Ejecutiva a PDF.
 * - Cumplimiento ADR-003: Cero N+1, queries acotadas, desuscripción automática de listeners.
 */

(function () {
    const analyticsModule = {
        // Estado
        businesses: [],
        selectedBusinessId: 'ALL',
        datePreset: '7DAYS',
        startDate: null,
        endDate: null,
        selectedPlatform: 'ALL',
        activeSubTab: 'summary',
        orders: [],
        prevOrders: [],
        loading: false,
        unsubOrders: null,
        unsubBusinesses: null,
        initialized: false,

        // Inicialización y Renderizado
        render: async function () {
            const container = document.getElementById('tab-content');
            if (!container) return;

            // Inicializar fechas por defecto si es primera vez
            if (!this.startDate || !this.endDate) {
                this.applyDatePreset('7DAYS', false);
            }

            // Renderizar estructura básica
            this.renderLayout(container);

            // Cargar lista de comercios si aún no se ha cargado
            if (this.businesses.length === 0) {
                await this.loadBusinesses();
            } else {
                this.populateBusinessSelect();
            }

            // Iniciar escucha de pedidos con los filtros actuales
            this.subscribeOrders();
        },

        // Limpieza de suscripciones (Llamado por switchTab de dashboardController)
        destroy: function () {
            if (this.unsubOrders) {
                this.unsubOrders();
                this.unsubOrders = null;
            }
            if (this.unsubBusinesses) {
                this.unsubBusinesses();
                this.unsubBusinesses = null;
            }
        },

        // Cálculo de fechas según preset
        applyDatePreset: function (preset, reload = true) {
            this.datePreset = preset;
            const now = new Date();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

            if (preset === 'TODAY') {
                // start ya es hoy a las 00:00:00
            } else if (preset === '7DAYS') {
                start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
                start.setHours(0, 0, 0, 0);
            } else if (preset === '30DAYS') {
                start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
                start.setHours(0, 0, 0, 0);
            } else if (preset === 'THIS_MONTH') {
                start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            }

            this.startDate = start;
            this.endDate = end;

            if (reload) {
                this.updateDateRangeUI();
                this.subscribeOrders();
            }
        },

        // Cargar lista de comercios afiliados desde Firestore
        loadBusinesses: async function () {
            try {
                if (this.unsubBusinesses) this.unsubBusinesses();

                this.unsubBusinesses = db.collection('businesses').onSnapshot((snap) => {
                    const list = [];
                    snap.forEach((doc) => {
                        const data = doc.data();
                        list.push({
                            id: doc.id,
                            name: data.nombre || data.name || data.businessName || 'Comercio ' + doc.id.substring(0, 6),
                            logoUrl: data.logoUrl || data.logo || null,
                            status: data.status || data.estado || 'active'
                        });
                    });

                    list.sort((a, b) => a.name.localeCompare(b.name));
                    this.businesses = list;
                    this.populateBusinessSelect();
                }, (err) => {
                    console.error('[Analytics] Error cargando comercios:', err);
                });
            } catch (err) {
                console.error('[Analytics] Excepción en loadBusinesses:', err);
            }
        },

        // Poblar el selector de comercios
        populateBusinessSelect: function () {
            const select = document.getElementById('analytics-business-select');
            if (!select) return;

            const currentVal = this.selectedBusinessId;
            let optionsHtml = `<option value="ALL">🌐 Todos los Comercios (Consolidado Global)</option>`;

            this.businesses.forEach((b) => {
                const selected = b.id === currentVal ? 'selected' : '';
                optionsHtml += `<option value="${b.id}" ${selected}>🏬 ${b.name}</option>`;
            });

            select.innerHTML = optionsHtml;
        },

        // Cálculo de ventas reales de comercio (DEC-03: excluye deliveryFee y propinas de motorizado)
        resolveOrderCommerceSales: function (data) {
            if (!data) return 0;
            if (data.merchantGrossSales != null && typeof data.merchantGrossSales === 'number' && data.merchantGrossSales > 0) {
                return data.merchantGrossSales;
            }
            const subtotal = Number(data.subtotal || 0);
            const discount = Number(data.discount || 0);
            if (subtotal > 0) {
                return Math.max(0, subtotal - discount);
            }
            const total = Number(data.total || data.totalAmount || 0);
            const deliveryFee = Number(data.deliveryFee || data.shippingCost || 0);
            const tipAmount = Number(data.tipAmount || data.tip || 0);
            const merchantAmount = total - deliveryFee - tipAmount;
            return Math.max(0, merchantAmount);
        },

        // Identificador estricto de órdenes de prueba, scripts mock y envíos courier X->Y
        isTestOrNonCommerce: function (orderId, data) {
            if (!orderId || !data) return true;
            if (data.serviceType === 'X_TO_Y_DELIVERY') return true;
            if (data.isTest === true) return true;

            const idLower = orderId.toLowerCase();
            if (
                idLower.startsWith('env_') ||
                idLower.startsWith('ped_e2e_') ||
                idLower.startsWith('ped_ux_') ||
                idLower.startsWith('ped_val_') ||
                idLower.startsWith('ord_e2e_') ||
                idLower.startsWith('test_')
            ) {
                return true;
            }

            const cust = (data.customerName || data.userName || '').toString().toLowerCase();
            if (
                cust.includes('ited virtual') ||
                cust.includes('test') ||
                cust.includes('prueba')
            ) {
                return true;
            }

            const bName = (data.businessName || data.restaurantName || '').toString().toLowerCase();
            if (bName.includes('punto de recogida x') || bName.includes('prueba')) {
                return true;
            }

            const bId = (data.businessId || data.restaurantId || '').toString().trim();
            if (!bId || bId === 'unknown' || bId === 'sin_id') {
                return true;
            }

            return false;
        },

        // Suscripción en tiempo real a orders con filtros de fecha y límites ADR-003
        subscribeOrders: function () {
            if (this.unsubOrders) {
                this.unsubOrders();
                this.unsubOrders = null;
            }

            this.loading = true;
            this.renderLoadingState();

            const startTs = firebase.firestore.Timestamp.fromDate(this.startDate);
            const endTs = firebase.firestore.Timestamp.fromDate(this.endDate);

            // Período anterior para comparativa
            const durationMs = this.endDate.getTime() - this.startDate.getTime();
            const prevStart = new Date(this.startDate.getTime() - durationMs);
            const prevEnd = new Date(this.startDate.getTime() - 1);
            const prevStartTs = firebase.firestore.Timestamp.fromDate(prevStart);
            const prevEndTs = firebase.firestore.Timestamp.fromDate(prevEnd);

            let q = db.collection('orders')
                .where('createdAt', '>=', startTs)
                .where('createdAt', '<=', endTs)
                .orderBy('createdAt', 'desc')
                .limit(1000);

            // Si hay comercio seleccionado, intentamos acotar la query
            if (this.selectedBusinessId !== 'ALL') {
                q = db.collection('orders')
                    .where('businessId', '==', this.selectedBusinessId)
                    .where('createdAt', '>=', startTs)
                    .where('createdAt', '<=', endTs)
                    .orderBy('createdAt', 'desc')
                    .limit(1000);
            }

            const self = this;
            const parseOrderDoc = (doc) => {
                const d = doc.data();

                // Excluir envíos X->Y de mensajería personal o registros de prueba no asociados a comercio real
                if (self.isTestOrNonCommerce(doc.id, d)) return null;

                let orderDate = null;
                if (d.createdAt) {
                    if (typeof d.createdAt.toDate === 'function') orderDate = d.createdAt.toDate();
                    else if (typeof d.createdAt.seconds === 'number') orderDate = new Date(d.createdAt.seconds * 1000);
                    else if (typeof d.createdAt === 'string') orderDate = new Date(d.createdAt);
                }

                // Resolución canónica de plataforma:
                // La app cliente compila en Android nativo. Si la orden no tiene platform explícito (órdenes anteriores),
                // provino de Android. No existe plataforma de pedidos web de cara al cliente.
                const rawPlatform = (d.platform || d.source || '').toString().trim().toUpperCase();
                const resolvedPlatform = rawPlatform === 'IOS' ? 'IOS' : rawPlatform === 'WEB' ? 'WEB' : 'ANDROID';

                const commerceSales = self.resolveOrderCommerceSales(d);

                return {
                    id: doc.id,
                    ...d,
                    resolvedCreatedAt: orderDate || new Date(),
                    resolvedPlatform: resolvedPlatform,
                    resolvedTotal: commerceSales
                };
            };

            this.unsubOrders = q.onSnapshot(
                (snap) => {
                    const currentOrders = [];
                    snap.forEach((doc) => {
                        const parsed = parseOrderDoc(doc);
                        if (parsed) currentOrders.push(parsed);
                    });

                    this.orders = currentOrders;
                    this.loading = false;

                    // Consulta en segundo plano del período previo para comparativa (una sola vez)
                    this.loadPreviousPeriodOrders(prevStartTs, prevEndTs);
                },
                (err) => {
                    console.warn('[Analytics] Error con query compuesta en Firestore:', err);
                    // Fallback transparente: query por fecha o sin filtro compuesto
                    const fallbackQ = db.collection('orders')
                        .orderBy('createdAt', 'desc')
                        .limit(800);

                    this.unsubOrders = fallbackQ.onSnapshot((snap) => {
                        const filtered = [];
                        const sMs = this.startDate.getTime();
                        const eMs = this.endDate.getTime();

                        snap.forEach((doc) => {
                            const parsed = parseOrderDoc(doc);
                            if (!parsed) return;
                            const t = parsed.resolvedCreatedAt.getTime();
                            if (t >= sMs && t <= eMs) {
                                if (this.selectedBusinessId === 'ALL' || parsed.businessId === this.selectedBusinessId) {
                                    filtered.push(parsed);
                                }
                            }
                        });

                        this.orders = filtered;
                        this.loading = false;
                        this.refreshActiveTab();
                    }, (fallbackErr) => {
                        console.error('[Analytics] Error en fallback query:', fallbackErr);
                        this.loading = false;
                        this.renderErrorState(fallbackErr.message);
                    });
                }
            );
        },

        // Cargar pedidos del período previo para deltas
        loadPreviousPeriodOrders: async function (prevStartTs, prevEndTs) {
            try {
                let prevQ = db.collection('orders')
                    .where('createdAt', '>=', prevStartTs)
                    .where('createdAt', '<=', prevEndTs)
                    .orderBy('createdAt', 'desc')
                    .limit(1000);

                if (this.selectedBusinessId !== 'ALL') {
                    prevQ = db.collection('orders')
                        .where('businessId', '==', this.selectedBusinessId)
                        .where('createdAt', '>=', prevStartTs)
                        .where('createdAt', '<=', prevEndTs)
                        .orderBy('createdAt', 'desc')
                        .limit(1000);
                }

                const prevSnap = await prevQ.get();
                const prevList = [];
                prevSnap.forEach((doc) => {
                    const d = doc.data();
                    if (this.isTestOrNonCommerce(doc.id, d)) return;

                    prevList.push({
                        id: doc.id,
                        resolvedTotal: this.resolveOrderCommerceSales(d),
                        status: d.status || d.estado || ''
                    });
                });

                this.prevOrders = prevList;
            } catch (e) {
                // Silencioso: si falla el período previo no rompe la vista principal
                this.prevOrders = [];
            }
            this.refreshActiveTab();
        },

        // Filtrado por plataforma seleccionada
        getFilteredOrders: function () {
            if (this.selectedPlatform === 'ALL') return this.orders;
            return this.orders.filter(o => o.resolvedPlatform === this.selectedPlatform);
        },

        // Motor de cálculo de métricas analíticas
        computeMetrics: function () {
            const filtered = this.getFilteredOrders();

            let totalOrders = 0;
            let totalSales = 0;
            let cancelledOrders = 0;
            let androidOrders = 0;
            let androidSales = 0;
            let iosOrders = 0;
            let iosSales = 0;
            let webOrders = 0;
            let webSales = 0;
            let legacyOrders = 0;
            let legacySales = 0;

            const hourlyBuckets = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                label: `${String(i).padStart(2, '0')}:00`,
                totalOrders: 0,
                totalSales: 0
            }));

            const productMap = new Map();
            const businessMap = new Map();
            const dailyMap = new Map();

            filtered.forEach((order) => {
                const st = (order.status || order.estado || '').toString().toLowerCase();
                const isCancelled = ['cancelled', 'cancelado', 'rechazado', 'rejected'].includes(st);

                if (isCancelled) {
                    cancelledOrders++;
                    return;
                }

                totalOrders++;
                const amount = order.resolvedTotal || 0;
                totalSales += amount;

                // Plataformas
                if (order.resolvedPlatform === 'ANDROID') {
                    androidOrders++;
                    androidSales += amount;
                } else if (order.resolvedPlatform === 'IOS') {
                    iosOrders++;
                    iosSales += amount;
                } else if (order.resolvedPlatform === 'WEB') {
                    webOrders++;
                    webSales += amount;
                } else {
                    androidOrders++;
                    androidSales += amount;
                }

                // Hora del día
                const d = order.resolvedCreatedAt;
                if (d && typeof d.getHours === 'function') {
                    const h = d.getHours();
                    if (h >= 0 && h < 24) {
                        hourlyBuckets[h].totalOrders++;
                        hourlyBuckets[h].totalSales += amount;
                    }

                    // Tendencia diaria
                    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (!dailyMap.has(dateKey)) {
                        dailyMap.set(dateKey, {
                            date: dateKey,
                            totalOrders: 0,
                            totalSales: 0,
                            android: 0,
                            ios: 0,
                            web: 0
                        });
                    }
                    const dayItem = dailyMap.get(dateKey);
                    dayItem.totalOrders++;
                    dayItem.totalSales += amount;
                    if (order.resolvedPlatform === 'ANDROID') dayItem.android++;
                    else if (order.resolvedPlatform === 'IOS') dayItem.ios++;
                    else if (order.resolvedPlatform === 'WEB') dayItem.web++;
                }

                // Desglose de Comercios
                const bId = order.businessId || order.restaurantId || 'unknown';
                const bName = order.businessName || order.restaurantName || order.comercioNombre || this.getBusinessNameById(bId);
                if (!businessMap.has(bId)) {
                    businessMap.set(bId, {
                        businessId: bId,
                        businessName: bName,
                        totalOrders: 0,
                        totalSales: 0,
                        androidSales: 0,
                        iosSales: 0,
                        webSales: 0
                    });
                }
                const bItem = businessMap.get(bId);
                bItem.totalOrders++;
                bItem.totalSales += amount;
                if (order.resolvedPlatform === 'ANDROID') bItem.androidSales += amount;
                else if (order.resolvedPlatform === 'IOS') bItem.iosSales += amount;
                else if (order.resolvedPlatform === 'WEB') bItem.webSales += amount;

                // Desglose de Productos
                const items = order.items || order.products || [];
                if (Array.isArray(items)) {
                    items.forEach((item) => {
                        const pName = (item.name || item.nombre || item.title || 'Producto').toString().trim();
                        const qty = Number(item.quantity || item.cantidad || item.qty || 1);
                        const price = Number(item.price || item.precio || 0);
                        const lineTotal = price > 0 ? price * qty : (amount / Math.max(items.length, 1));

                        if (!productMap.has(pName)) {
                            productMap.set(pName, {
                                productName: pName,
                                totalQuantity: 0,
                                totalSales: 0,
                                androidQty: 0,
                                iosQty: 0,
                                webQty: 0
                            });
                        }
                        const pItem = productMap.get(pName);
                        pItem.totalQuantity += qty;
                        pItem.totalSales += lineTotal;
                        if (order.resolvedPlatform === 'ANDROID') pItem.androidQty += qty;
                        else if (order.resolvedPlatform === 'IOS') pItem.iosQty += qty;
                        else if (order.resolvedPlatform === 'WEB') pItem.webQty += qty;
                    });
                }
            });

            // Hora pico
            let peakHour = null;
            let maxHourOrders = 0;
            hourlyBuckets.forEach((b) => {
                if (b.totalOrders > maxHourOrders) {
                    maxHourOrders = b.totalOrders;
                    peakHour = b.hour;
                }
            });

            // Ranking de productos
            const productMatrix = Array.from(productMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
            const topProductName = productMatrix[0]?.productName || null;

            // Matriz de comercios
            const businessMatrix = Array.from(businessMap.values()).sort((a, b) => b.totalSales - a.totalSales);
            const topBusinessName = businessMatrix[0]?.businessName || null;

            // Tendencias diarias ordenadas
            const dailyTrends = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

            // Comparativas del período anterior
            const prevValid = this.prevOrders.filter(o => !['cancelled', 'cancelado', 'rechazado'].includes((o.status || '').toLowerCase()));
            const prevTotalOrders = prevValid.length;
            const prevTotalSales = prevValid.reduce((acc, o) => acc + (o.resolvedTotal || 0), 0);

            const calcDelta = (curr, prev) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return Math.round(((curr - prev) / prev) * 100);
            };

            const ordersDelta = calcDelta(totalOrders, prevTotalOrders);
            const salesDelta = calcDelta(totalSales, prevTotalSales);

            return {
                totalOrders,
                totalSales,
                cancelledOrders,
                cancelRate: (totalOrders + cancelledOrders) > 0 ? Math.round((cancelledOrders / (totalOrders + cancelledOrders)) * 100) : 0,
                avgTicket: totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0,
                androidOrders,
                androidSales,
                androidAvgTicket: androidOrders > 0 ? Math.round(androidSales / androidOrders) : 0,
                androidPct: totalOrders > 0 ? Math.round((androidOrders / totalOrders) * 100) : 0,
                iosOrders,
                iosSales,
                iosAvgTicket: iosOrders > 0 ? Math.round(iosSales / iosOrders) : 0,
                iosPct: totalOrders > 0 ? Math.round((iosOrders / totalOrders) * 100) : 0,
                webOrders,
                webSales,
                webAvgTicket: webOrders > 0 ? Math.round(webSales / webOrders) : 0,
                webPct: totalOrders > 0 ? Math.round((webOrders / totalOrders) * 100) : 0,
                legacyOrders: 0,
                legacySales: 0,
                legacyPct: 0,
                peakHour,
                topProductName,
                topBusinessName,
                hourlyBuckets,
                productMatrix,
                businessMatrix,
                dailyTrends,
                ordersDelta,
                salesDelta
            };
        },

        getBusinessNameById: function (bId) {
            const found = this.businesses.find(b => b.id === bId);
            return found ? found.name : 'Comercio ' + bId.substring(0, 6);
        },

        // Renderizado del layout base
        renderLayout: function (container) {
            container.innerHTML = `
                <div class="space-y-6 max-w-7xl mx-auto pb-16">
                    <!-- ENCABEZADO Y CONTROLES PRINCIPALES -->
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <span class="text-3xl bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">📊</span>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h2 class="text-xl font-black text-slate-100">Reportes & Analítica Enterprise</h2>
                                        <span class="text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">v2.2 Live</span>
                                    </div>
                                    <p class="text-xs text-slate-400">Inteligencia multicanal (Android, iOS, Web) consolidada para la plataforma o aislada por comercio.</p>
                                </div>
                            </div>

                            <!-- Botones de Acción / Exportación -->
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <button onclick="window.analyticsModule.exportCsv()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow">
                                    <span>📥</span> Exportar CSV
                                </button>
                                <button onclick="window.analyticsModule.printReport()" class="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow">
                                    <span>🖨️</span> Imprimir / PDF
                                </button>
                                <button onclick="window.analyticsModule.subscribeOrders()" class="bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl font-bold transition" title="Refrescar">
                                    <span>🔄</span>
                                </button>
                            </div>
                        </div>

                        <!-- BARRA DE FILTROS (Comercio, Rango Temporal, Plataforma) -->
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-800/80 items-center">
                            <!-- Selector de Comercio -->
                            <div class="md:col-span-4 space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🏢 Alcance Comercial</label>
                                <select id="analytics-business-select" onchange="window.analyticsModule.onBusinessChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none shadow-inner">
                                    <option value="ALL">🌐 Todos los Comercios (Consolidado Global)</option>
                                </select>
                            </div>

                            <!-- Presets de Fechas -->
                            <div class="md:col-span-5 space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📅 Período Temporal</label>
                                <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
                                    <button onclick="window.analyticsModule.applyDatePreset('TODAY')" id="preset-TODAY" class="flex-1 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">Hoy</button>
                                    <button onclick="window.analyticsModule.applyDatePreset('7DAYS')" id="preset-7DAYS" class="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white shadow">7 Días</button>
                                    <button onclick="window.analyticsModule.applyDatePreset('30DAYS')" id="preset-30DAYS" class="flex-1 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">30 Días</button>
                                    <button onclick="window.analyticsModule.applyDatePreset('THIS_MONTH')" id="preset-THIS_MONTH" class="flex-1 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">Mes</button>
                                    <button onclick="window.analyticsModule.toggleCustomDates()" id="preset-CUSTOM" class="flex-1 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition">Fechas</button>
                                </div>
                            </div>

                            <!-- Filtro de Plataforma -->
                            <div class="md:col-span-3 space-y-1">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📱 Canal de Venta</label>
                                <select id="analytics-platform-select" onchange="window.analyticsModule.onPlatformChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none shadow-inner">
                                    <option value="ALL">Todas las Plataformas</option>
                                    <option value="ANDROID">🤖 Android App</option>
                                    <option value="IOS">🍎 iOS App</option>
                                    <option value="WEB">🌐 Web / PWA</option>
                                </select>
                            </div>
                        </div>

                        <!-- Selector Manual de Fechas (Oculto por defecto) -->
                        <div id="analytics-custom-date-box" class="hidden grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                            <div class="flex items-center gap-2">
                                <span class="text-slate-400 text-xs">Desde:</span>
                                <input type="date" id="analytics-custom-start" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none flex-1">
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-slate-400 text-xs">Hasta:</span>
                                <input type="date" id="analytics-custom-end" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-indigo-500 focus:outline-none flex-1">
                                <button onclick="window.analyticsModule.applyCustomDates()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl transition">Filtrar</button>
                            </div>
                        </div>
                    </div>

                    <!-- BARRA DE PESTAÑAS (5 TABS) -->
                    <div class="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto select-none">
                        <button onclick="window.analyticsModule.switchSubTab('summary')" id="atab-btn-summary" class="atab-btn active bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>📊</span> Resumen Ejecutivo
                        </button>
                        <button onclick="window.analyticsModule.switchSubTab('channels')" id="atab-btn-channels" class="atab-btn text-slate-400 hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>📱</span> Canales & Plataformas
                        </button>
                        <button onclick="window.analyticsModule.switchSubTab('products')" id="atab-btn-products" class="atab-btn text-slate-400 hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>🏆</span> Ranking de Productos
                        </button>
                        <button onclick="window.analyticsModule.switchSubTab('trends')" id="atab-btn-trends" class="atab-btn text-slate-400 hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>📈</span> Tendencia Diaria
                        </button>
                        <button onclick="window.analyticsModule.switchSubTab('businesses')" id="atab-btn-businesses" class="atab-btn text-slate-400 hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>🏢</span> Comercio × Plataforma
                        </button>
                    </div>

                    <!-- CONTENIDO DE LA PESTAÑA ACTIVA -->
                    <div id="analytics-subtab-content">
                        <!-- Renderizado dinámico -->
                    </div>
                </div>
            `;
            this.updateDateRangeUI();
        },

        // Cambiar pestaña secundaria
        switchSubTab: function (tabName) {
            this.activeSubTab = tabName;
            document.querySelectorAll('.atab-btn').forEach((b) => {
                b.classList.remove('bg-indigo-600/20', 'text-indigo-300', 'border', 'border-indigo-500/30');
                b.classList.add('text-slate-400');
            });
            const activeBtn = document.getElementById(`atab-btn-${tabName}`);
            if (activeBtn) {
                activeBtn.classList.remove('text-slate-400');
                activeBtn.classList.add('bg-indigo-600/20', 'text-indigo-300', 'border', 'border-indigo-500/30');
            }
            this.refreshActiveTab();
        },

        // Refrescar contenido de la pestaña activa con las métricas computadas
        refreshActiveTab: function () {
            const container = document.getElementById('analytics-subtab-content');
            if (!container) return;

            if (this.loading) {
                this.renderLoadingState();
                return;
            }

            const m = this.computeMetrics();

            if (this.activeSubTab === 'summary') {
                this.renderSummaryTab(container, m);
            } else if (this.activeSubTab === 'channels') {
                this.renderChannelsTab(container, m);
            } else if (this.activeSubTab === 'products') {
                this.renderProductsTab(container, m);
            } else if (this.activeSubTab === 'trends') {
                this.renderTrendsTab(container, m);
            } else if (this.activeSubTab === 'businesses') {
                this.renderBusinessesTab(container, m);
            }
        },

        // ─── PESTAÑA 1: RESUMEN EJECUTIVO ─────────────────────────────────────────
        renderSummaryTab: function (container, m) {
            const peakHourLabel = m.peakHour !== null ? `${String(m.peakHour).padStart(2, '0')}:00 - ${String((m.peakHour + 1) % 24).padStart(2, '0')}:00` : 'Sin datos';
            const topBizLabel = m.topBusinessName || (this.selectedBusinessId !== 'ALL' ? this.getBusinessNameById(this.selectedBusinessId) : 'N/A');
            const topProdLabel = m.topProductName || 'Sin ventas registradas';

            const maxHourlyOrders = Math.max(...m.hourlyBuckets.map(b => b.totalOrders), 1);

            container.innerHTML = `
                <div class="space-y-6">
                    <!-- KPI Cards (6 Grid) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        <!-- Ventas Totales -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-1">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold uppercase tracking-wider text-[10px]">Ventas Totales</span>
                                <span class="bg-emerald-500/10 text-emerald-400 text-xs px-1.5 py-0.5 rounded font-bold">NIO</span>
                            </div>
                            <h3 class="text-2xl font-black text-slate-100 font-mono">C$ ${m.totalSales.toLocaleString('es-NI')}</h3>
                            <div class="flex items-center gap-1 text-[11px] font-bold ${m.salesDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                <span>${m.salesDelta >= 0 ? '↗ +' : '↘ '}${m.salesDelta}%</span>
                                <span class="text-slate-500 font-normal">vs período anterior</span>
                            </div>
                        </div>

                        <!-- Total Pedidos -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-1">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold uppercase tracking-wider text-[10px]">Total Pedidos</span>
                                <span class="text-indigo-400 text-xs">📦</span>
                            </div>
                            <h3 class="text-2xl font-black text-indigo-400 font-mono">${m.totalOrders}</h3>
                            <div class="flex items-center gap-1 text-[11px] font-bold ${m.ordersDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                <span>${m.ordersDelta >= 0 ? '↗ +' : '↘ '}${m.ordersDelta}%</span>
                                <span class="text-slate-500 font-normal">vs período anterior</span>
                            </div>
                        </div>

                        <!-- Ticket Promedio -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-1">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold uppercase tracking-wider text-[10px]">Ticket Promedio</span>
                                <span class="text-amber-400 text-xs">🎫</span>
                            </div>
                            <h3 class="text-2xl font-black text-amber-400 font-mono">C$ ${m.avgTicket}</h3>
                            <span class="text-[10px] text-slate-500">Por pedido completado</span>
                        </div>

                        <!-- Tasa de Cancelación -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-1">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold uppercase tracking-wider text-[10px]">Tasa Cancelación</span>
                                <span class="text-rose-400 text-xs">⚠️</span>
                            </div>
                            <h3 class="text-2xl font-black text-rose-400 font-mono">${m.cancelRate}%</h3>
                            <span class="text-[10px] text-slate-500">${m.cancelledOrders} cancelados</span>
                        </div>

                        <!-- Hora Pico -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-1">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold uppercase tracking-wider text-[10px]">Hora Pico</span>
                                <span class="text-sky-400 text-xs">⏰</span>
                            </div>
                            <h3 class="text-lg font-black text-sky-400 font-mono truncate">${peakHourLabel}</h3>
                            <span class="text-[10px] text-slate-500">Mayor demanda operativa</span>
                        </div>

                        <!-- Líder / Destacado -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-1">
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span class="font-bold uppercase tracking-wider text-[10px]">${this.selectedBusinessId === 'ALL' ? 'Comercio Top' : 'Producto Estrella'}</span>
                                <span class="text-purple-400 text-xs">👑</span>
                            </div>
                            <h3 class="text-sm font-black text-purple-300 truncate" title="${this.selectedBusinessId === 'ALL' ? topBizLabel : topProdLabel}">
                                ${this.selectedBusinessId === 'ALL' ? topBizLabel : topProdLabel}
                            </h3>
                            <span class="text-[10px] text-slate-500">Líder del período</span>
                        </div>
                    </div>

                    <!-- DISTRIBUCIÓN HORARIA VISUAL (00:00 a 23:00) -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                                    <span>⏱️</span> Distribución Horaria de Pedidos (00:00 - 23:00)
                                </h3>
                                <p class="text-xs text-slate-400">Volumen de pedidos procesados por hora para dimensionar capacidad y flota.</p>
                            </div>
                            <span class="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                Pico: ${peakHourLabel}
                            </span>
                        </div>

                        <!-- Barras Interactivas Horarias -->
                        <div class="h-48 flex items-end gap-1.5 pt-6 pb-2 px-2 overflow-x-auto">
                            ${m.hourlyBuckets.map((b) => {
                                const heightPct = maxHourlyOrders > 0 ? Math.max(Math.round((b.totalOrders / maxHourlyOrders) * 100), 4) : 4;
                                const isPeak = b.hour === m.peakHour && b.totalOrders > 0;
                                return `
                                    <div class="flex-1 flex flex-col items-center gap-1 group relative min-w-[24px]">
                                        <!-- Tooltip flotante -->
                                        <div class="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-950 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded-lg shadow-xl pointer-events-none z-10 whitespace-nowrap">
                                            ${b.label}: <strong>${b.totalOrders} pedidos</strong> (C$ ${b.totalSales.toLocaleString('es-NI')})
                                        </div>
                                        <span class="text-[9px] font-mono font-bold text-slate-400 group-hover:text-white">${b.totalOrders > 0 ? b.totalOrders : ''}</span>
                                        <div class="w-full rounded-t-md transition-all duration-300 ${isPeak ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-lg shadow-amber-500/20' : b.totalOrders > 0 ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300' : 'bg-slate-800/40'}" style="height: ${heightPct}%;"></div>
                                        <span class="text-[9px] font-mono ${isPeak ? 'text-amber-400 font-bold' : 'text-slate-500'}">${String(b.hour).padStart(2, '0')}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- RESUMEN DE CANALES RÁPIDO (ANDROID, IOS, WEB) -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 shadow space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-black uppercase text-emerald-400 flex items-center gap-2">
                                    <span class="text-base">🤖</span> Android App
                                </span>
                                <span class="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    ${m.androidPct}% del total
                                </span>
                            </div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <p class="text-2xl font-black text-slate-100 font-mono">${m.androidOrders} <span class="text-xs font-normal text-slate-400">pedidos</span></p>
                                    <p class="text-xs text-slate-400">Ticket Promedio: <strong class="text-slate-200">C$ ${m.androidAvgTicket}</strong></p>
                                </div>
                                <div class="text-right">
                                    <p class="text-base font-black text-emerald-400 font-mono">C$ ${m.androidSales.toLocaleString('es-NI')}</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-900 border border-sky-500/20 rounded-2xl p-5 shadow space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-black uppercase text-sky-400 flex items-center gap-2">
                                    <span class="text-base">🍎</span> iOS App
                                </span>
                                <span class="text-xs font-mono font-bold bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/20">
                                    ${m.iosPct}% del total
                                </span>
                            </div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <p class="text-2xl font-black text-slate-100 font-mono">${m.iosOrders} <span class="text-xs font-normal text-slate-400">pedidos</span></p>
                                    <p class="text-xs text-slate-400">Ticket Promedio: <strong class="text-slate-200">C$ ${m.iosAvgTicket}</strong></p>
                                </div>
                                <div class="text-right">
                                    <p class="text-base font-black text-sky-400 font-mono">C$ ${m.iosSales.toLocaleString('es-NI')}</p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-900 border border-purple-500/20 rounded-2xl p-5 shadow space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-black uppercase text-purple-400 flex items-center gap-2">
                                    <span class="text-base">🌐</span> Web & Portal
                                </span>
                                <span class="text-xs font-mono font-bold bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    ${m.webPct}% del total
                                </span>
                            </div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <p class="text-2xl font-black text-slate-100 font-mono">${m.webOrders} <span class="text-xs font-normal text-slate-400">pedidos</span></p>
                                    <p class="text-xs text-slate-400">Ticket Promedio: <strong class="text-slate-200">C$ ${m.webAvgTicket}</strong></p>
                                </div>
                                <div class="text-right">
                                    <p class="text-base font-black text-purple-400 font-mono">C$ ${m.webSales.toLocaleString('es-NI')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ─── PESTAÑA 2: CANALES & PLATAFORMAS ──────────────────────────────────────
        renderChannelsTab: function (container, m) {
            const channels = [
                { id: 'ANDROID', name: 'Android Native App', icon: '🤖', orders: m.androidOrders, sales: m.androidSales, ticket: m.androidAvgTicket, pct: m.androidPct, color: 'emerald' },
                { id: 'IOS', name: 'iOS Native App', icon: '🍎', orders: m.iosOrders, sales: m.iosSales, ticket: m.iosAvgTicket, pct: m.iosPct, color: 'sky' },
                { id: 'WEB', name: 'Web Portal & PWA', icon: '🌐', orders: m.webOrders, sales: m.webSales, ticket: m.webAvgTicket, pct: m.webPct, color: 'purple' }
            ];

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
                        <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                            <span>📱</span> Desglose de Rendimiento por Canal de Venta
                        </h3>
                        <p class="text-xs text-slate-400">Análisis comparativo de conversión, volumen transaccional y ticket promedio según plataforma de origen.</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        ${channels.map(c => `
                            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700">${c.icon}</span>
                                        <div>
                                            <h4 class="text-sm font-bold text-slate-100">${c.name}</h4>
                                            <span class="text-[10px] text-slate-500 font-mono">Canal ID: ${c.id}</span>
                                        </div>
                                    </div>
                                    <span class="text-sm font-mono font-black text-${c.color}-400 bg-${c.color}-500/10 px-2.5 py-1 rounded-xl border border-${c.color}-500/20">
                                        ${c.pct}% Cuota
                                    </span>
                                </div>

                                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono">
                                    <div class="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                                        <span class="text-[9px] text-slate-500 block uppercase">Pedidos</span>
                                        <strong class="text-base text-slate-200">${c.orders}</strong>
                                    </div>
                                    <div class="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                                        <span class="text-[9px] text-slate-500 block uppercase">Ticket Prom.</span>
                                        <strong class="text-base text-amber-400">C$ ${c.ticket}</strong>
                                    </div>
                                    <div class="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                                        <span class="text-[9px] text-slate-500 block uppercase">Ventas Totales</span>
                                        <strong class="text-base text-emerald-400">C$ ${c.sales.toLocaleString('es-NI')}</strong>
                                    </div>
                                </div>

                                <!-- Barra visual de cuota -->
                                <div class="space-y-1">
                                    <div class="flex justify-between text-[10px] text-slate-400">
                                        <span>Participación en el volumen</span>
                                        <span class="font-mono font-bold text-slate-300">${c.pct}%</span>
                                    </div>
                                    <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                        <div class="h-full bg-${c.color}-500 rounded-full transition-all duration-500" style="width: ${c.pct}%;"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        // ─── PESTAÑA 3: RANKING DE PRODUCTOS ──────────────────────────────────────
        renderProductsTab: function (container, m) {
            const list = m.productMatrix;
            const maxQty = list[0]?.totalQuantity || 1;

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                                <span>🏆</span> Ranking de Productos Más Vendidos
                            </h3>
                            <p class="text-xs text-slate-400">Listado consolidado ordenado por unidades vendidas y distribución por canal.</p>
                        </div>
                        <span class="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-xl border border-slate-700">
                            ${list.length} productos con ventas
                        </span>
                    </div>

                    ${list.length === 0 ? `
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                            <span class="text-3xl block mb-2">📦</span>
                            <p class="text-sm font-bold">No hay ventas registradas en el período seleccionado.</p>
                            <p class="text-xs text-slate-500 mt-1">Prueba ampliando el rango temporal o cambiando de comercio.</p>
                        </div>
                    ` : `
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300 font-sans">
                                    <thead class="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
                                        <tr>
                                            <th class="p-3.5 text-center w-12">#</th>
                                            <th class="p-3.5">Producto</th>
                                            <th class="p-3.5 text-center w-48">Volumen Relativo</th>
                                            <th class="p-3.5 text-right">Unidades</th>
                                            <th class="p-3.5 text-right">Ventas Totales</th>
                                            <th class="p-3.5 text-center">Canales (And / iOS / Web)</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800/60 font-mono">
                                        ${list.map((p, idx) => {
                                            const pct = Math.round((p.totalQuantity / maxQty) * 100);
                                            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                                            return `
                                                <tr class="hover:bg-slate-800/40 transition">
                                                    <td class="p-3 text-center text-xs font-black text-amber-400">${medal}</td>
                                                    <td class="p-3 font-sans font-bold text-slate-100">
                                                        ${p.productName}
                                                    </td>
                                                    <td class="p-3">
                                                        <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                                            <div class="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full" style="width: ${pct}%;"></div>
                                                        </div>
                                                    </td>
                                                    <td class="p-3 text-right font-black text-slate-100">${p.totalQuantity}</td>
                                                    <td class="p-3 text-right text-emerald-400 font-bold">C$ ${p.totalSales.toLocaleString('es-NI')}</td>
                                                    <td class="p-3 text-center">
                                                        <div class="flex items-center justify-center gap-1.5 text-[10px]">
                                                            <span class="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Android: ${p.androidQty}">🤖 ${p.androidQty}</span>
                                                            <span class="bg-sky-500/10 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/20" title="iOS: ${p.iosQty}">🍎 ${p.iosQty}</span>
                                                            <span class="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20" title="Web: ${p.webQty}">🌐 ${p.webQty}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                </div>
            `;
        },

        // ─── PESTAÑA 4: TENDENCIA DIARIA ──────────────────────────────────────────
        renderTrendsTab: function (container, m) {
            const list = m.dailyTrends;
            const maxDailyOrders = Math.max(...list.map(d => d.totalOrders), 1);

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                                <span>📈</span> Evolución de Ventas y Pedidos Día a Día
                            </h3>
                            <p class="text-xs text-slate-400">Seguimiento temporal para identificar patrones de crecimiento semanal.</p>
                        </div>
                        <span class="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-xl border border-slate-700">
                            ${list.length} días analizados
                        </span>
                    </div>

                    ${list.length === 0 ? `
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                            <span class="text-3xl block mb-2">📅</span>
                            <p class="text-sm font-bold">No hay pedidos registrados en el intervalo.</p>
                        </div>
                    ` : `
                        <!-- Mini Gráfica de Barras por Día -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
                            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Histograma Diario de Pedidos</h4>
                            <div class="h-36 flex items-end gap-2 pt-4 px-2 overflow-x-auto">
                                ${list.map(d => {
                                    const hPct = Math.max(Math.round((d.totalOrders / maxDailyOrders) * 100), 5);
                                    return `
                                        <div class="flex-1 flex flex-col items-center gap-1 group relative min-w-[32px]">
                                            <div class="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 border border-slate-700 text-white text-[9px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                                                ${d.date}: ${d.totalOrders} pedidos (C$ ${d.totalSales.toLocaleString('es-NI')})
                                            </div>
                                            <span class="text-[9px] font-mono font-bold text-slate-400">${d.totalOrders}</span>
                                            <div class="w-full bg-indigo-600 group-hover:bg-indigo-400 rounded-t-md transition duration-200" style="height: ${hPct}%;"></div>
                                            <span class="text-[8px] font-mono text-slate-500 truncate w-full text-center">${d.date.substring(5)}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Tabla Detallada -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300 font-sans">
                                    <thead class="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
                                        <tr>
                                            <th class="p-3.5">Fecha</th>
                                            <th class="p-3.5 text-right">Pedidos</th>
                                            <th class="p-3.5 text-right">Ventas Totales</th>
                                            <th class="p-3.5 text-right">Ticket Prom.</th>
                                            <th class="p-3.5 text-center">Android</th>
                                            <th class="p-3.5 text-center">iOS</th>
                                            <th class="p-3.5 text-center">Web</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800/60 font-mono">
                                        ${list.map(d => {
                                            const ticket = d.totalOrders > 0 ? Math.round(d.totalSales / d.totalOrders) : 0;
                                            return `
                                                <tr class="hover:bg-slate-800/40 transition">
                                                    <td class="p-3 font-bold text-slate-200">${d.date}</td>
                                                    <td class="p-3 text-right font-black text-indigo-400">${d.totalOrders}</td>
                                                    <td class="p-3 text-right text-emerald-400 font-bold">C$ ${d.totalSales.toLocaleString('es-NI')}</td>
                                                    <td class="p-3 text-right text-amber-400">C$ ${ticket}</td>
                                                    <td class="p-3 text-center text-emerald-300">${d.android}</td>
                                                    <td class="p-3 text-center text-sky-300">${d.ios}</td>
                                                    <td class="p-3 text-center text-purple-300">${d.web}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                </div>
            `;
        },

        // ─── PESTAÑA 5: COMERCIO × PLATAFORMA ─────────────────────────────────────
        renderBusinessesTab: function (container, m) {
            const list = m.businessMatrix;

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                                <span>🏢</span> Desempeño Consolidado de Comercios Aliados
                            </h3>
                            <p class="text-xs text-slate-400">Comparativa de volumen de pedidos, facturación y desglose de canales por comercio.</p>
                        </div>
                        <span class="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-xl border border-slate-700">
                            ${list.length} comercios con actividad
                        </span>
                    </div>

                    ${list.length === 0 ? `
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                            <span class="text-3xl block mb-2">🏬</span>
                            <p class="text-sm font-bold">No hay comercios con ventas en el rango seleccionado.</p>
                        </div>
                    ` : `
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300 font-sans">
                                    <thead class="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
                                        <tr>
                                            <th class="p-3.5">Comercio</th>
                                            <th class="p-3.5 text-right">Pedidos</th>
                                            <th class="p-3.5 text-right">Ventas Totales</th>
                                            <th class="p-3.5 text-right">Ticket Prom.</th>
                                            <th class="p-3.5 text-right text-emerald-400">Android</th>
                                            <th class="p-3.5 text-right text-sky-400">iOS</th>
                                            <th class="p-3.5 text-right text-purple-400">Web</th>
                                            <th class="p-3.5 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-800/60 font-mono">
                                        ${list.map(b => {
                                            const ticket = b.totalOrders > 0 ? Math.round(b.totalSales / b.totalOrders) : 0;
                                            return `
                                                <tr class="hover:bg-slate-800/40 transition">
                                                    <td class="p-3 font-sans">
                                                        <strong class="text-slate-100 block">${b.businessName}</strong>
                                                        <span class="text-[10px] text-slate-500 font-mono">ID: ${b.businessId.substring(0, 10)}...</span>
                                                    </td>
                                                    <td class="p-3 text-right font-black text-indigo-400">${b.totalOrders}</td>
                                                    <td class="p-3 text-right text-emerald-400 font-bold">C$ ${b.totalSales.toLocaleString('es-NI')}</td>
                                                    <td class="p-3 text-right text-amber-400">C$ ${ticket}</td>
                                                    <td class="p-3 text-right text-emerald-300">C$ ${b.androidSales.toLocaleString('es-NI')}</td>
                                                    <td class="p-3 text-right text-sky-300">C$ ${b.iosSales.toLocaleString('es-NI')}</td>
                                                    <td class="p-3 text-right text-purple-300">C$ ${b.webSales.toLocaleString('es-NI')}</td>
                                                    <td class="p-3 text-center font-sans">
                                                        <button onclick="window.analyticsModule.filterBySingleBusiness('${b.businessId}')" class="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold px-2.5 py-1 rounded-lg transition">
                                                            Filtrar
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                </div>
            `;
        },

        // Filtrar rápidamente por un comercio desde la tabla
        filterBySingleBusiness: function (bId) {
            this.selectedBusinessId = bId;
            const select = document.getElementById('analytics-business-select');
            if (select) select.value = bId;
            this.subscribeOrders();
        },

        // Eventos de cambios en controles
        onBusinessChange: function (value) {
            this.selectedBusinessId = value;
            this.subscribeOrders();
        },

        onPlatformChange: function (value) {
            this.selectedPlatform = value;
            this.refreshActiveTab();
        },

        toggleCustomDates: function () {
            const box = document.getElementById('analytics-custom-date-box');
            if (!box) return;
            box.classList.toggle('hidden');
            box.classList.toggle('grid');

            // Actualizar botones de preset
            document.querySelectorAll('[id^="preset-"]').forEach((b) => {
                b.classList.remove('bg-indigo-600', 'text-white', 'shadow');
                b.classList.add('text-slate-400');
            });
            const customBtn = document.getElementById('preset-CUSTOM');
            if (customBtn) {
                customBtn.classList.remove('text-slate-400');
                customBtn.classList.add('bg-indigo-600', 'text-white', 'shadow');
            }
        },

        applyCustomDates: function () {
            const startInput = document.getElementById('analytics-custom-start');
            const endInput = document.getElementById('analytics-custom-end');

            if (!startInput || !endInput || !startInput.value || !endInput.value) {
                if (typeof toastError === 'function') toastError('Seleccione fecha inicial y fecha final');
                else alert('Seleccione fecha inicial y fecha final');
                return;
            }

            const [sY, sM, sD] = startInput.value.split('-').map(Number);
            const [eY, eM, eD] = endInput.value.split('-').map(Number);

            this.datePreset = 'CUSTOM';
            this.startDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
            this.endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999);

            this.subscribeOrders();
        },

        updateDateRangeUI: function () {
            document.querySelectorAll('[id^="preset-"]').forEach((b) => {
                b.classList.remove('bg-indigo-600', 'text-white', 'shadow');
                b.classList.add('text-slate-400');
            });
            const activeBtn = document.getElementById(`preset-${this.datePreset}`);
            if (activeBtn) {
                activeBtn.classList.remove('text-slate-400');
                activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow');
            }
        },

        renderLoadingState: function () {
            const container = document.getElementById('analytics-subtab-content');
            if (!container) return;
            container.innerHTML = `
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center space-y-4">
                    <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p class="text-sm font-bold text-slate-200">Sincronizando analítica de pedidos en tiempo real...</p>
                    <p class="text-xs text-slate-500">Agregando métricas multicanal y calculando deltas de negocio.</p>
                </div>
            `;
        },

        renderErrorState: function (msg) {
            const container = document.getElementById('analytics-subtab-content');
            if (!container) return;
            container.innerHTML = `
                <div class="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center space-y-3">
                    <span class="text-3xl">⚠️</span>
                    <h4 class="text-base font-bold text-rose-400">Error Consultando Analítica</h4>
                    <p class="text-xs text-slate-400 font-mono">${msg}</p>
                    <button onclick="window.analyticsModule.subscribeOrders()" class="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition">
                        Reintentar Consulta
                    </button>
                </div>
            `;
        },

        // ─── EXPORTACIÓN A CSV ANALÍTICO ──────────────────────────────────────────
        exportCsv: function () {
            const m = this.computeMetrics();
            const scopeName = this.selectedBusinessId === 'ALL' ? 'GLOBAL_TODOS_COMERCIOS' : this.getBusinessNameById(this.selectedBusinessId).replace(/\s+/g, '_');
            const dateStr = new Date().toISOString().substring(0, 10);
            const filename = `Reporte_Analitica_${scopeName}_${dateStr}.csv`;

            let csv = 'REPORTE EJECUTIVO DE ANALITICA - BLUESYSTEM DELIVERY ENTERPRISE\r\n';
            csv += `Alcance,${scopeName}\r\n`;
            csv += `Generado,${new Date().toLocaleString()}\r\n`;
            csv += `Rango,${this.startDate.toLocaleDateString()} al ${this.endDate.toLocaleDateString()}\r\n\r\n`;

            csv += 'METRICAS GENERALES\r\n';
            csv += `Ventas Totales (NIO),${m.totalSales}\r\n`;
            csv += `Total Pedidos,${m.totalOrders}\r\n`;
            csv += `Ticket Promedio (NIO),${m.avgTicket}\r\n`;
            csv += `Tasa Cancelacion,${m.cancelRate}%\r\n`;
            csv += `Pedidos Cancelados,${m.cancelledOrders}\r\n`;
            csv += `Hora Pico,${m.peakHour !== null ? m.peakHour + ':00' : 'N/A'}\r\n\r\n`;

            csv += 'DESGLOSE POR CANAL\r\n';
            csv += 'Canal,Pedidos,Cuota %,Ventas NIO,Ticket Promedio\r\n';
            csv += `Android,${m.androidOrders},${m.androidPct}%,${m.androidSales},${m.androidAvgTicket}\r\n`;
            csv += `iOS,${m.iosOrders},${m.iosPct}%,${m.iosSales},${m.iosAvgTicket}\r\n`;
            csv += `Web,${m.webOrders},${m.webPct}%,${m.webSales},${m.webAvgTicket}\r\n\r\n`;

            csv += 'RANKING DE PRODUCTOS\r\n';
            csv += 'Producto,Unidades,Ventas NIO,Android Qty,iOS Qty,Web Qty\r\n';
            m.productMatrix.forEach((p) => {
                csv += `"${p.productName.replace(/"/g, '""')}",${p.totalQuantity},${p.totalSales},${p.androidQty},${p.iosQty},${p.webQty}\r\n`;
            });

            csv += '\r\nDESEMPEÑO POR COMERCIO\r\n';
            csv += 'Comercio,Pedidos,Ventas NIO,Android NIO,iOS NIO,Web NIO\r\n';
            m.businessMatrix.forEach((b) => {
                csv += `"${b.businessName.replace(/"/g, '""')}",${b.totalOrders},${b.totalSales},${b.androidSales},${b.iosSales},${b.webSales}\r\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // ─── IMPRESIÓN / EXPORTACIÓN PDF ──────────────────────────────────────────
        printReport: function () {
            window.print();
        }
    };

    window.analyticsModule = analyticsModule;
})();
