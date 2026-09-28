/**
 * reputationBI.js — Módulo de Reportería Analítica Avanzada (Rankings / BI)
 * BlueSystem Delivery Enterprise — Production Grade / Multi-Tenant / ADR-023 Certified
 * 
 * Funcionalidades:
 * 1. KPIs Generales de Reputación y Cobertura de Feedback
 * 2. Podio & Rankings Automatizados con Score Ponderado (🥇 🥈 🥉)
 * 3. Matriz BI de Comercios (% de pedidos valorados, semáforo automatizado, buscador y filtros)
 * 4. Matriz BI de Motorizados (% de entregas valoradas, semáforo, buscador y filtros)
 * 5. Radar de Alertas "Sin Valorar" (Entidades con alto volumen de entregas pero feedback nulo/crítico)
 * 6. Exportación Ejecutiva a formato CSV compatible con Excel
 * 7. Modal interactivo de lectura de reseñas reales en tiempo real
 */

(function () {
    window.reputationBIModule = {
        // ── Estado del Módulo ───────────────────────────────────────────────
        activeSubTab: 'rankings', // 'rankings' | 'merchants' | 'couriers' | 'unratedAlerts'
        merchants: [],
        couriers: [],
        reviews: [],
        ordersMap: {},
        courierOrdersMap: {},
        searchQuery: '',
        semaphoreFilter: 'ALL', // 'ALL' | 'EXCELLENT' | 'AVERAGE' | 'ATTENTION' | 'CRITICAL'
        isLoading: false,
        unsubscribers: [],

        // ── Inicialización y Renderizado Principal ──────────────────────────
        render: async function () {
            const container = document.getElementById('tab-content');
            if (!container) return;

            this.renderLayout(container);
            await this.loadData();
        },

        destroy: function () {
            this.unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });
            this.unsubscribers = [];
        },

        // ── Estructura HTML Base ─────────────────────────────────────────────
        renderLayout: function (container) {
            container.innerHTML = `
                <div class="space-y-6 select-none animate-in fade-in duration-200" id="reputationBIRoot">
                    <!-- Header Principal -->
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
                        <div>
                            <div class="flex items-center gap-3">
                                <span class="text-2xl bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-400">🏆</span>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h2 class="text-xl font-black text-white tracking-tight">Reputación & Business Intelligence (BI)</h2>
                                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase">
                                            ADR-023 Live
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-400 mt-0.5">
                                        Matriz de satisfacción, conversión de feedback, podio de líderes y detección de calidad en tiempo real
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2.5">
                            <button onclick="window.reputationBIModule.exportCurrentToCsv()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow">
                                <span>📥</span> Exportar CSV
                            </button>
                            <button onclick="window.reputationBIModule.loadData()" class="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-amber-600/20">
                                <span>🔄</span> Actualizar Datos
                            </button>
                        </div>
                    </div>

                    <!-- Tarjetas de KPIs Superiores -->
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="biKpiContainer">
                        <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                            <span class="text-2xl bg-amber-500/10 p-3 rounded-xl text-amber-400">⭐</span>
                            <div>
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rating Promedio Global</span>
                                <p class="text-2xl font-black text-white" id="kpiAvgRating">--</p>
                                <span class="text-[10px] text-slate-500" id="kpiTotalReviewsCount">0 opiniones totales</span>
                            </div>
                        </div>
                        <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                            <span class="text-2xl bg-blue-500/10 p-3 rounded-xl text-blue-400">📊</span>
                            <div>
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">% Cobertura de Feedback</span>
                                <p class="text-2xl font-black text-blue-400" id="kpiFeedbackRatio">--%</p>
                                <span class="text-[10px] text-slate-500">Pedidos con calificación</span>
                            </div>
                        </div>
                        <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                            <span class="text-2xl bg-emerald-500/10 p-3 rounded-xl text-emerald-400">🟢</span>
                            <div>
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Líderes de Excelencia</span>
                                <p class="text-2xl font-black text-emerald-400" id="kpiTopLeadersCount">--</p>
                                <span class="text-[10px] text-slate-500">Rating >= 4.5 ⭐</span>
                            </div>
                        </div>
                        <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
                            <span class="text-2xl bg-rose-500/10 p-3 rounded-xl text-rose-400">⚠️</span>
                            <div>
                                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Atención / Críticos</span>
                                <p class="text-2xl font-black text-rose-400" id="kpiCriticalCount">--</p>
                                <span class="text-[10px] text-slate-500">Requieren supervisión</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sub-Pestañas de Navegación -->
                    <div class="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
                        <button onclick="window.reputationBIModule.switchSubTab('rankings')" id="bi-tab-rankings" class="bi-subtab-btn active bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>🏆</span> Podio & Rankings Top
                        </button>
                        <button onclick="window.reputationBIModule.switchSubTab('merchants')" id="bi-tab-merchants" class="bi-subtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>🏪</span> Matriz BI de Comercios
                        </button>
                        <button onclick="window.reputationBIModule.switchSubTab('couriers')" id="bi-tab-couriers" class="bi-subtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>🛵</span> Matriz BI de Motorizados
                        </button>
                        <button onclick="window.reputationBIModule.switchSubTab('unratedAlerts')" id="bi-tab-unratedAlerts" class="bi-subtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
                            <span>⚠️</span> Radar "Sin Valorar" & Alertas
                        </button>
                    </div>

                    <!-- Contenedor Dinámico de la Sub-Pestaña Activa -->
                    <div id="biTabContent" class="min-h-[350px]">
                        <div class="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                            <div class="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando analítica de reputación y feedback...</span>
                        </div>
                    </div>
                </div>

                <!-- Modal Flotante de Reseñas de Cliente -->
                <div id="biReviewsModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg" id="modalEntityIcon">
                                    ⭐
                                </div>
                                <div>
                                    <h3 class="text-sm font-bold text-white" id="modalEntityTitle">Reseñas de Clientes</h3>
                                    <p class="text-[11px] text-slate-400" id="modalEntitySubtitle">Historial verificado</p>
                                </div>
                            </div>
                            <button onclick="window.reputationBIModule.closeReviewsModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold transition">
                                ✕
                            </button>
                        </div>
                        <div id="modalReviewsContent" class="p-4 overflow-y-auto space-y-3 flex-1">
                            <!-- Inyectado dinámicamente -->
                        </div>
                    </div>
                </div>
            `;
        },

        // ── Carga y Procesamiento de Datos ──────────────────────────────────
        loadData: async function () {
            this.isLoading = true;
            try {
                const db = firebase.firestore();

                // 1. Cargar Comercios
                const storesSnap = await db.collection('businesses').get();
                const rawMerchants = [];
                storesSnap.forEach(doc => {
                    rawMerchants.push({ id: doc.id, ...doc.data() });
                });

                // 2. Cargar Motorizados Canónicos (BSD-COURIER-ELIGIBILITY-SOURCE-OF-TRUTH-FORENSIC-001)
                const [usersSnap, couriersCollectionSnap] = await Promise.all([
                    db.collection('users').get(),
                    db.collection('couriers').get()
                ]);

                const usersMap = new Map();
                usersSnap.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() }));

                const couriersMap = new Map();
                couriersCollectionSnap.forEach(doc => couriersMap.set(doc.id, { id: doc.id, ...doc.data() }));

                // Unificar candidatos garantizando evaluación canónica única
                const allCandidateIds = new Set([...couriersMap.keys()]);
                const resolver = window.CanonicalIdentityResolver || (typeof CanonicalIdentityResolver !== 'undefined' ? CanonicalIdentityResolver : null);
                usersMap.forEach((u, uid) => {
                    if (resolver && resolver.resolveEiamRole(u) === 'DRIVER') {
                        allCandidateIds.add(uid);
                    }
                });

                const rawCouriers = [];
                for (const cid of allCandidateIds) {
                    const cData = couriersMap.get(cid) || null;
                    const uData = usersMap.get(cid) || null;

                    const check = resolver && typeof resolver.isCanonicalCourier === 'function'
                        ? resolver.isCanonicalCourier(cData, uData)
                        : { isEligible: false };

                    if (check.isEligible) {
                        const merged = {
                            ...(uData || {}),
                            ...(cData || {}),
                            id: cid,
                            name: (cData && (cData.name || cData.nombre)) || (uData && (uData.name || uData.nombre)) || 'Motorizado',
                            licensePlate: (cData && (cData.plate || (cData.vehicle && cData.vehicle.plate) || cData.licensePlate)) || (uData && (uData.vehiclePlate || uData.placa)) || 'M-Oficial',
                            phone: (cData && (cData.phone || cData.telefono)) || (uData && (uData.phone || uData.telefono)) || '',
                            tenantId: (cData && cData.tenantId) || (uData && uData.tenantId) || ''
                        };
                        rawCouriers.push(merged);
                    }
                }

                // 3. Cargar Reseñas globales de /reviews (limitado a 1000 para optimización)
                const reviewsSnap = await db.collection('reviews').limit(1000).get();
                const rawReviews = [];
                reviewsSnap.forEach(doc => {
                    rawReviews.push({ id: doc.id, ...doc.data() });
                });

                // 4. Mapear contadores de órdenes por comercio y courier
                const bizOrdersCount = {};
                const courierOrdersCount = {};

                // Leer pedidos completados para calcular ratio exacto
                try {
                    const ordersSnap = await db.collection('orders')
                        .where('status', 'in', ['delivered', 'completed', 'ENTREGADO', 'COMPLETADO'])
                        .limit(2000)
                        .get();

                    ordersSnap.forEach(doc => {
                        const o = doc.data();
                        const bId = o.businessId || o.comercioId || o.restaurantId;
                        const cId = o.assignedCourierId || o.motorizadoId || o.courierId;
                        if (bId) bizOrdersCount[bId] = (bizOrdersCount[bId] || 0) + 1;
                        if (cId) courierOrdersCount[cId] = (courierOrdersCount[cId] || 0) + 1;
                    });
                } catch (e) {
                    console.warn('Orders count aggregation fallback:', e);
                }

                // 5. Procesar Comercios y calcular KPIs
                this.merchants = rawMerchants.map(m => {
                    const rating = Number(m.rating || m.averageRating || 5.0);
                    const ratingCount = Number(m.ratingCount || m.reviewsCount || m.totalReviews || 0);
                    const totalOrders = Math.max(Number(m.totalOrders || m.ordersCount || 0), bizOrdersCount[m.id] || 0, ratingCount);
                    
                    const ratio = totalOrders > 0 
                        ? Math.min(100, Math.round((ratingCount / totalOrders) * 100))
                        : (ratingCount > 0 ? 100 : 0);

                    // Ponderación Bayesiana para Ranking Justo:
                    // W = (v*R + m*C) / (v + m) con m=5 y C=4.5
                    const v = ratingCount;
                    const R = rating;
                    const mWeight = 5;
                    const cPrior = 4.5;
                    const weightedScore = (v + mWeight) > 0 ? ((v * R) + (mWeight * cPrior)) / (v + mWeight) : R;

                    const semaphore = this.calculateSemaphore(rating, ratingCount, totalOrders, ratio);

                    return {
                        id: m.id,
                        name: m.name || m.businessName || m.nombre || 'Comercio',
                        category: m.category || m.categoria || 'Restaurante',
                        logoUrl: m.logoUrl || m.photoUrl || m.logo || '',
                        rating: Math.round(rating * 10) / 10,
                        ratingCount,
                        totalOrders,
                        ratio,
                        weightedScore,
                        semaphore
                    };
                });

                // 6. Procesar Motorizados y calcular KPIs
                this.couriers = rawCouriers.map(c => {
                    const rating = Number(c.rating || c.averageRating || 5.0);
                    const ratingCount = Number(c.ratingCount || c.totalRatings || 0);
                    const totalDeliveries = Math.max(Number(c.deliveredOrdersCount || c.totalDeliveries || c.completedTrips || 0), courierOrdersCount[c.id] || 0, ratingCount);

                    const ratio = totalDeliveries > 0
                        ? Math.min(100, Math.round((ratingCount / totalDeliveries) * 100))
                        : (ratingCount > 0 ? 100 : 0);

                    const v = ratingCount;
                    const R = rating;
                    const mWeight = 5;
                    const cPrior = 4.5;
                    const weightedScore = (v + mWeight) > 0 ? ((v * R) + (mWeight * cPrior)) / (v + mWeight) : R;

                    const semaphore = this.calculateSemaphore(rating, ratingCount, totalDeliveries, ratio);

                    return {
                        id: c.id,
                        name: c.name || c.nombre || c.fullName || 'Motorizado',
                        plate: c.licensePlate || c.placa || c.plate || 'M-Oficial',
                        phone: c.phone || c.telefono || '',
                        rating: Math.round(rating * 10) / 10,
                        ratingCount,
                        totalDeliveries,
                        ratio,
                        weightedScore,
                        semaphore
                    };
                });

                this.reviews = rawReviews;

                // 7. Actualizar KPIs de la cabecera
                this.updateHeaderKPIs();

                // 8. Renderizar la subpestaña actual
                this.renderActiveSubTab();
            } catch (err) {
                console.error('Error loading reputation BI data:', err);
                const tabContent = document.getElementById('biTabContent');
                if (tabContent) {
                    tabContent.innerHTML = `
                        <div class="p-8 text-center bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs">
                            <p class="font-bold text-sm">Error cargando matriz de reputación</p>
                            <p class="mt-1">${err.message || 'Fallo de sincronización'}</p>
                        </div>
                    `;
                }
            } finally {
                this.isLoading = false;
            }
        },

        // ── Reglas del Semáforo Automatizado ────────────────────────────────
        calculateSemaphore: function (rating, ratingCount, totalOrders, ratio) {
            // 1. Crítico: Calificaciones reprobatorias directas
            if (ratingCount > 0 && rating < 3.8) {
                return {
                    status: 'CRITICAL',
                    badge: '🔴 Crítico',
                    badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                    desc: 'Calificación promedio baja (< 3.8 ⭐). Requiere intervención operativa.'
                };
            }

            // 2. Atención Requerida / Feedback Ausente:
            // Alto volumen de pedidos/entregas pero feedback nulo o < 15%
            if (totalOrders >= 5 && (ratingCount === 0 || ratio < 15)) {
                return {
                    status: 'ATTENTION',
                    badge: '🟠 Atención / Sin Feedback',
                    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                    desc: 'Alto volumen con menos del 15% de feedback. Riesgo de insatisfacción no detectada.'
                };
            }

            // 3. Excelente / Top Performer:
            if (rating >= 4.5 && ratingCount >= 2) {
                return {
                    status: 'EXCELLENT',
                    badge: '🟢 Excelente',
                    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                    desc: 'Satisfacción sobresaliente (>= 4.5 ⭐) y buena adopción de feedback.'
                };
            }

            // 4. Promedio / Regular:
            return {
                status: 'AVERAGE',
                badge: '🟡 Promedio',
                badgeClass: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
                desc: 'Rendimiento aceptable en rango normal.'
            };
        },

        // ── Actualizar KPIs de Cabecera ─────────────────────────────────────
        updateHeaderKPIs: function () {
            const allEntities = [...this.merchants, ...this.couriers];
            const totalOpinions = allEntities.reduce((acc, curr) => acc + curr.ratingCount, 0);

            const ratedEntities = allEntities.filter(e => e.ratingCount > 0);
            const globalAvg = ratedEntities.length > 0
                ? (ratedEntities.reduce((acc, curr) => acc + curr.rating, 0) / ratedEntities.length).toFixed(1)
                : '5.0';

            const totalOrdersAll = allEntities.reduce((acc, curr) => acc + (curr.totalOrders || curr.totalDeliveries || 0), 0);
            const globalRatio = totalOrdersAll > 0
                ? Math.min(100, Math.round((totalOpinions / totalOrdersAll) * 100))
                : 0;

            const topLeaders = allEntities.filter(e => e.semaphore.status === 'EXCELLENT').length;
            const criticals = allEntities.filter(e => e.semaphore.status === 'CRITICAL' || e.semaphore.status === 'ATTENTION').length;

            const kpiAvg = document.getElementById('kpiAvgRating');
            if (kpiAvg) kpiAvg.textContent = `${globalAvg} ⭐`;

            const kpiRev = document.getElementById('kpiTotalReviewsCount');
            if (kpiRev) kpiRev.textContent = `${totalOpinions} valoraciones acumuladas`;

            const kpiRat = document.getElementById('kpiFeedbackRatio');
            if (kpiRat) kpiRat.textContent = `${globalRatio}%`;

            const kpiTop = document.getElementById('kpiTopLeadersCount');
            if (kpiTop) kpiTop.textContent = topLeaders;

            const kpiCrit = document.getElementById('kpiCriticalCount');
            if (kpiCrit) kpiCrit.textContent = criticals;
        },

        // ── Gestión de Sub-Pestañas ─────────────────────────────────────────
        switchSubTab: function (subTabId) {
            this.activeSubTab = subTabId;
            this.searchQuery = '';
            this.semaphoreFilter = 'ALL';

            // Actualizar botones de pestañas
            document.querySelectorAll('.bi-subtab-btn').forEach(btn => {
                btn.className = 'bi-subtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2';
            });
            const activeBtn = document.getElementById(`bi-tab-${subTabId}`);
            if (activeBtn) {
                activeBtn.className = 'bi-subtab-btn active bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2';
            }

            this.renderActiveSubTab();
        },

        renderActiveSubTab: function () {
            const container = document.getElementById('biTabContent');
            if (!container) return;

            switch (this.activeSubTab) {
                case 'rankings':
                    this.renderRankingsTab(container);
                    break;
                case 'merchants':
                    this.renderMerchantsTab(container);
                    break;
                case 'couriers':
                    this.renderCouriersTab(container);
                    break;
                case 'unratedAlerts':
                    this.renderAlertsTab(container);
                    break;
            }
        },

        // ── PESTAÑA 1: Podio & Rankings Automatizados ───────────────────────
        renderRankingsTab: function (container) {
            const sortedMerchants = [...this.merchants]
                .filter(m => m.ratingCount > 0)
                .sort((a, b) => b.weightedScore - a.weightedScore);

            const sortedCouriers = [...this.couriers]
                .filter(c => c.ratingCount > 0)
                .sort((a, b) => b.weightedScore - a.weightedScore);

            const renderPodiumCards = (list, type) => {
                if (list.length === 0) {
                    return `
                        <div class="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                            Aún no hay suficientes calificaciones registradas para generar el podio.
                        </div>
                    `;
                }

                const medals = ['🥇', '🥈', '🥉', '4°', '5°'];
                const borderGradients = [
                    'border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-slate-900',
                    'border-slate-300/40 bg-gradient-to-b from-slate-400/10 to-slate-900',
                    'border-amber-700/40 bg-gradient-to-b from-amber-700/10 to-slate-900',
                    'border-slate-800 bg-slate-900/60',
                    'border-slate-800 bg-slate-900/60'
                ];

                return `
                    <div class="space-y-2.5">
                        ${list.slice(0, 5).map((item, idx) => `
                            <div class="flex items-center justify-between p-3.5 rounded-xl border ${borderGradients[idx] || 'border-slate-800'} transition hover:border-amber-500/40">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl font-black">${medals[idx] || (idx + 1)}</span>
                                    <div>
                                        <h4 class="text-xs font-bold text-white">${item.name}</h4>
                                        <p class="text-[10px] text-slate-400">
                                            ${type === 'merchant' ? (item.category || 'Comercio') : `Placa: ${item.plate}`}
                                        </p>
                                    </div>
                                </div>
                                <div class="text-right flex items-center gap-3">
                                    <div>
                                        <span class="text-sm font-black text-amber-400">⭐ ${item.rating}</span>
                                        <p class="text-[10px] text-slate-400">${item.ratingCount} opiniones (${item.ratio}% feedback)</p>
                                    </div>
                                    <button onclick="window.reputationBIModule.openReviewsModal('${type}', '${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.rating})" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-lg border border-slate-700 font-semibold transition">
                                        Ver Reseñas
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            };

            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Top Comercios -->
                    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">🏪</span>
                                <h3 class="font-black text-sm text-white">Top 5 Comercios Más Valorados</h3>
                            </div>
                            <span class="text-[10px] text-slate-400 font-mono">Ranking Ponderado</span>
                        </div>
                        ${renderPodiumCards(sortedMerchants, 'merchant')}
                    </div>

                    <!-- Top Motorizados -->
                    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">🛵</span>
                                <h3 class="font-black text-sm text-white">Top 5 Motorizados de Élite</h3>
                            </div>
                            <span class="text-[10px] text-slate-400 font-mono">Excelencia en Entrega</span>
                        </div>
                        ${renderPodiumCards(sortedCouriers, 'courier')}
                    </div>
                </div>
            `;
        },

        // ── PESTAÑA 2: Matriz BI de Comercios ───────────────────────────────
        renderMerchantsTab: function (container) {
            let filtered = this.merchants.filter(m => {
                const matchSearch = !this.searchQuery || 
                    m.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                    m.category.toLowerCase().includes(this.searchQuery.toLowerCase());
                const matchSem = this.semaphoreFilter === 'ALL' || m.semaphore.status === this.semaphoreFilter;
                return matchSearch && matchSem;
            });

            filtered.sort((a, b) => b.rating - a.rating);

            container.innerHTML = `
                <div class="space-y-4">
                    <!-- Filtros y Búsqueda -->
                    <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                        <div class="relative flex-1 w-full">
                            <span class="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                            <input type="text" value="${this.searchQuery}" oninput="window.reputationBIModule.handleSearch(this.value)" placeholder="Buscar comercio por nombre o rubro comercial..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto">
                            <select onchange="window.reputationBIModule.handleFilterSemaphore(this.value)" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 w-full md:w-auto">
                                <option value="ALL" ${this.semaphoreFilter === 'ALL' ? 'selected' : ''}>Todos los Semáforos</option>
                                <option value="EXCELLENT" ${this.semaphoreFilter === 'EXCELLENT' ? 'selected' : ''}>🟢 Solo Excelentes (>= 4.5 ⭐)</option>
                                <option value="AVERAGE" ${this.semaphoreFilter === 'AVERAGE' ? 'selected' : ''}>🟡 Solo Promedio (3.8 - 4.4)</option>
                                <option value="ATTENTION" ${this.semaphoreFilter === 'ATTENTION' ? 'selected' : ''}>🟠 Solo Atención (Bajo % feedback)</option>
                                <option value="CRITICAL" ${this.semaphoreFilter === 'CRITICAL' ? 'selected' : ''}>🔴 Solo Críticos (< 3.8 ⭐)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Tabla de Datos -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                        <th class="p-3.5">Comercio</th>
                                        <th class="p-3.5 text-center">⭐ Rating Promedio</th>
                                        <th class="p-3.5 text-center">Total Opiniones</th>
                                        <th class="p-3.5 text-center">Pedidos Entregados</th>
                                        <th class="p-3.5 text-center">% Pedidos Valorados</th>
                                        <th class="p-3.5 text-center">Semáforo</th>
                                        <th class="p-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    ${filtered.length === 0 ? `
                                        <tr>
                                            <td colspan="7" class="p-8 text-center text-slate-500 text-xs">
                                                No se encontraron comercios con los filtros aplicados.
                                            </td>
                                        </tr>
                                    ` : filtered.map(m => `
                                        <tr class="hover:bg-slate-800/40 transition">
                                            <td class="p-3.5">
                                                <div class="flex items-center gap-3">
                                                    ${m.logoUrl ? `
                                                        <img src="${m.logoUrl}" class="w-8 h-8 rounded-lg object-cover border border-slate-700">
                                                    ` : `
                                                        <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                                                            ${m.name.charAt(0)}
                                                        </div>
                                                    `}
                                                    <div>
                                                        <span class="font-bold text-white text-xs block">${m.name}</span>
                                                        <span class="text-[10px] text-slate-400">${m.category}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="p-3.5 text-center">
                                                <span class="font-black text-sm text-amber-400">★ ${m.rating}</span>
                                            </td>
                                            <td class="p-3.5 text-center font-mono font-bold text-slate-300">
                                                ${m.ratingCount}
                                            </td>
                                            <td class="p-3.5 text-center font-mono text-slate-400">
                                                ${m.totalOrders}
                                            </td>
                                            <td class="p-3.5 text-center">
                                                <div class="flex items-center justify-center gap-2">
                                                    <div class="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                                        <div class="bg-blue-500 h-full rounded-full" style="width: ${m.ratio}%;"></div>
                                                    </div>
                                                    <span class="font-mono text-xs font-bold text-slate-300">${m.ratio}%</span>
                                                </div>
                                            </td>
                                            <td class="p-3.5 text-center">
                                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${m.semaphore.badgeClass}" title="${m.semaphore.desc}">
                                                    ${m.semaphore.badge}
                                                </span>
                                            </td>
                                            <td class="p-3.5 text-right">
                                                <button onclick="window.reputationBIModule.openReviewsModal('merchant', '${m.id}', '${m.name.replace(/'/g, "\\'")}', ${m.rating})" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 font-semibold transition">
                                                    Ver Opiniones
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        },

        // ── PESTAÑA 3: Matriz BI de Motorizados ─────────────────────────────
        renderCouriersTab: function (container) {
            let filtered = this.couriers.filter(c => {
                const matchSearch = !this.searchQuery || 
                    c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                    c.plate.toLowerCase().includes(this.searchQuery.toLowerCase());
                const matchSem = this.semaphoreFilter === 'ALL' || c.semaphore.status === this.semaphoreFilter;
                return matchSearch && matchSem;
            });

            filtered.sort((a, b) => b.rating - a.rating);

            container.innerHTML = `
                <div class="space-y-4">
                    <!-- Filtros y Búsqueda -->
                    <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                        <div class="relative flex-1 w-full">
                            <span class="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                            <input type="text" value="${this.searchQuery}" oninput="window.reputationBIModule.handleSearch(this.value)" placeholder="Buscar motorizado por nombre o número de placa..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto">
                            <select onchange="window.reputationBIModule.handleFilterSemaphore(this.value)" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 w-full md:w-auto">
                                <option value="ALL" ${this.semaphoreFilter === 'ALL' ? 'selected' : ''}>Todos los Semáforos</option>
                                <option value="EXCELLENT" ${this.semaphoreFilter === 'EXCELLENT' ? 'selected' : ''}>🟢 Solo Excelentes (>= 4.5 ⭐)</option>
                                <option value="AVERAGE" ${this.semaphoreFilter === 'AVERAGE' ? 'selected' : ''}>🟡 Solo Promedio (3.8 - 4.4)</option>
                                <option value="ATTENTION" ${this.semaphoreFilter === 'ATTENTION' ? 'selected' : ''}>🟠 Solo Atención (Bajo % feedback)</option>
                                <option value="CRITICAL" ${this.semaphoreFilter === 'CRITICAL' ? 'selected' : ''}>🔴 Solo Críticos (< 3.8 ⭐)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Tabla de Datos -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                        <th class="p-3.5">Motorizado</th>
                                        <th class="p-3.5 text-center">⭐ Rating Promedio</th>
                                        <th class="p-3.5 text-center">Total Opiniones</th>
                                        <th class="p-3.5 text-center">Entregas Completadas</th>
                                        <th class="p-3.5 text-center">% Entregas Valoradas</th>
                                        <th class="p-3.5 text-center">Semáforo</th>
                                        <th class="p-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    ${filtered.length === 0 ? `
                                        <tr>
                                            <td colspan="7" class="p-8 text-center text-slate-500 text-xs">
                                                No se encontraron motorizados con los filtros aplicados.
                                            </td>
                                        </tr>
                                    ` : filtered.map(c => `
                                        <tr class="hover:bg-slate-800/40 transition">
                                            <td class="p-3.5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                                                        🛵
                                                    </div>
                                                    <div>
                                                        <span class="font-bold text-white text-xs block">${c.name}</span>
                                                        <span class="text-[10px] text-slate-400 font-mono">Placa: ${c.plate}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="p-3.5 text-center">
                                                <span class="font-black text-sm text-amber-400">★ ${c.rating}</span>
                                            </td>
                                            <td class="p-3.5 text-center font-mono font-bold text-slate-300">
                                                ${c.ratingCount}
                                            </td>
                                            <td class="p-3.5 text-center font-mono text-slate-400">
                                                ${c.totalDeliveries}
                                            </td>
                                            <td class="p-3.5 text-center">
                                                <div class="flex items-center justify-center gap-2">
                                                    <div class="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                                        <div class="bg-blue-500 h-full rounded-full" style="width: ${c.ratio}%;"></div>
                                                    </div>
                                                    <span class="font-mono text-xs font-bold text-slate-300">${c.ratio}%</span>
                                                </div>
                                            </td>
                                            <td class="p-3.5 text-center">
                                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${c.semaphore.badgeClass}" title="${c.semaphore.desc}">
                                                    ${c.semaphore.badge}
                                                </span>
                                            </td>
                                            <td class="p-3.5 text-right">
                                                <button onclick="window.reputationBIModule.openReviewsModal('courier', '${c.id}', '${c.name.replace(/'/g, "\\'")}', ${c.rating})" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 font-semibold transition">
                                                    Ver Opiniones
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        },

        // ── PESTAÑA 4: Radar "Sin Valorar" & Alertas Críticas ────────────────
        renderAlertsTab: function (container) {
            const unratedMerchants = this.merchants.filter(m => m.semaphore.status === 'ATTENTION' || m.semaphore.status === 'CRITICAL');
            const unratedCouriers = this.couriers.filter(c => c.semaphore.status === 'ATTENTION' || c.semaphore.status === 'CRITICAL');

            container.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
                        <span class="text-xl">⚠️</span>
                        <div>
                            <h4 class="font-bold text-xs text-amber-300">Radar de Atención Temprana (ADR-023)</h4>
                            <p class="text-[11px] text-amber-400/80 mt-0.5">
                                Este reporte identifica comercios y motorizados con alta actividad operativa pero bajo retorno de feedback (&lt; 15%), o con notas promedio críticas (&lt; 3.8). Son puntos ciegos de satisfacción donde se recomienda incentivar la calificación o revisar la calidad del servicio.
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Comercios en Alerta -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 class="font-bold text-xs text-white flex items-center gap-2">
                                    <span>🏪</span> Comercios con Alertas (${unratedMerchants.length})
                                </h3>
                                <span class="text-[10px] text-slate-400 font-mono">Feedback Bajo o Crítico</span>
                            </div>
                            <div class="space-y-2">
                                ${unratedMerchants.length === 0 ? `
                                    <p class="text-xs text-slate-500 text-center py-6">¡Excelente! Ningún comercio presenta anomalías de feedback.</p>
                                ` : unratedMerchants.map(m => `
                                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span class="text-xs font-bold text-white block">${m.name}</span>
                                            <span class="text-[10px] text-slate-400">${m.totalOrders} pedidos entregados · ${m.ratingCount} valoraciones (${m.ratio}%)</span>
                                        </div>
                                        <span class="px-2 py-0.5 text-[10px] rounded font-bold ${m.semaphore.badgeClass}">
                                            ${m.semaphore.badge}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Motorizados en Alerta -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 class="font-bold text-xs text-white flex items-center gap-2">
                                    <span>🛵</span> Motorizados con Alertas (${unratedCouriers.length})
                                </h3>
                                <span class="text-[10px] text-slate-400 font-mono">Feedback Bajo o Crítico</span>
                            </div>
                            <div class="space-y-2">
                                ${unratedCouriers.length === 0 ? `
                                    <p class="text-xs text-slate-500 text-center py-6">¡Excelente! Ningún motorizado presenta anomalías de feedback.</p>
                                ` : unratedCouriers.map(c => `
                                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span class="text-xs font-bold text-white block">${c.name}</span>
                                            <span class="text-[10px] text-slate-400">Placa: ${c.plate} · ${c.totalDeliveries} entregas · ${c.ratingCount} valoraciones (${c.ratio}%)</span>
                                        </div>
                                        <span class="px-2 py-0.5 text-[10px] rounded font-bold ${c.semaphore.badgeClass}">
                                            ${c.semaphore.badge}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        // ── Handlers de Búsqueda y Filtro ───────────────────────────────────
        handleSearch: function (query) {
            this.searchQuery = query;
            this.renderActiveSubTab();
        },

        handleFilterSemaphore: function (status) {
            this.semaphoreFilter = status;
            this.renderActiveSubTab();
        },

        // ── Modal de Reseñas E2E ────────────────────────────────────────────
        openReviewsModal: async function (type, entityId, entityName, rating) {
            const modal = document.getElementById('biReviewsModal');
            const titleEl = document.getElementById('modalEntityTitle');
            const subEl = document.getElementById('modalEntitySubtitle');
            const iconEl = document.getElementById('modalEntityIcon');
            const contentEl = document.getElementById('modalReviewsContent');
            if (!modal || !contentEl) return;

            titleEl.textContent = entityName;
            subEl.textContent = `${type === 'merchant' ? 'Comercio' : 'Motorizado'} · Calificación actual: ★ ${rating}`;
            iconEl.textContent = type === 'merchant' ? '🏪' : '🛵';

            contentEl.innerHTML = `
                <div class="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <div class="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Consultando opiniones en tiempo real...</span>
                </div>
            `;
            modal.classList.remove('hidden');

            try {
                const db = firebase.firestore();
                let reviewList = [];

                if (type === 'merchant') {
                    // 1. Intentar subcolección canónica /businesses/{id}/reviews
                    try {
                        const snap = await db.collection('businesses').doc(entityId).collection('reviews').limit(50).get();
                        snap.forEach(d => reviewList.push({ id: d.id, ...d.data() }));
                    } catch (e) {
                        console.warn('Subcollection /businesses/reviews read failed, using root fallback:', e);
                    }

                    // 2. Si está vacío o falló, buscar en raíz /reviews (pública por reglas)
                    if (reviewList.length === 0) {
                        try {
                            const snapRoot = await db.collection('reviews').where('businessId', '==', entityId).limit(50).get();
                            snapRoot.forEach(d => reviewList.push({ id: d.id, ...d.data() }));
                        } catch (e) {
                            console.warn('Root reviews query failed:', e);
                        }
                    }
                } else {
                    // Para MOTORIZADO:
                    // 1. Consultar en raíz /reviews (regla pública allow read: if true)
                    try {
                        const snapRoot = await db.collection('reviews').where('courierId', '==', entityId).limit(50).get();
                        snapRoot.forEach(d => reviewList.push({ id: d.id, ...d.data() }));
                    } catch (e) {
                        console.warn('Root reviews by courierId failed:', e);
                    }

                    // 2. Si no encontró por courierId, probar por motorizadoId en raíz /reviews
                    if (reviewList.length === 0) {
                        try {
                            const snapRoot2 = await db.collection('reviews').where('motorizadoId', '==', entityId).limit(50).get();
                            snapRoot2.forEach(d => reviewList.push({ id: d.id, ...d.data() }));
                        } catch (e) {}
                    }

                    // 3. Fallback seguro en memoria de this.reviews ya cargadas
                    if (reviewList.length === 0 && Array.isArray(this.reviews)) {
                        const memReviews = this.reviews.filter(r => 
                            (r.courierId && r.courierId === entityId) || 
                            (r.motorizadoId && r.motorizadoId === entityId)
                        );
                        reviewList.push(...memReviews);
                    }

                    // 4. Intentar opcionalmente subcolección /couriers/{id}/reviews de forma protegida
                    if (reviewList.length === 0) {
                        try {
                            const snapSub = await db.collection('couriers').doc(entityId).collection('reviews').limit(50).get();
                            snapSub.forEach(d => reviewList.push({ id: d.id, ...d.data() }));
                        } catch (e) {
                            // Ignorar silenciosamente si no hay permisos sobre la subcolección
                        }
                    }
                }

                // 5. Si aún no hay resultados, revisar memoria global
                if (reviewList.length === 0 && Array.isArray(this.reviews)) {
                    const memFallback = this.reviews.filter(r => 
                        type === 'merchant' 
                            ? (r.businessId && r.businessId === entityId)
                            : (r.courierId === entityId || r.motorizadoId === entityId)
                    );
                    reviewList.push(...memFallback);
                }

                if (reviewList.length === 0) {
                    contentEl.innerHTML = `
                        <div class="p-8 text-center text-slate-500 text-xs">
                            No se encontraron comentarios de texto para esta entidad aún.
                        </div>
                    `;
                    return;
                }

                contentEl.innerHTML = reviewList.map(r => {
                    const clientName = r.userName || r.authorName || r.customerName || 'Cliente BlueSystem';
                    const score = r.rating || (type === 'merchant' ? r.businessRating : r.courierRating) || 5;
                    const dateStr = r.date || (r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'Reciente');
                    const commentText = r.comment || (type === 'merchant' ? r.comments : r.courierComments) || '';

                    return `
                        <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                                        ${clientName.charAt(0)}
                                    </div>
                                    <span class="text-xs font-bold text-white">${clientName}</span>
                                    <span class="text-[10px] text-slate-500">${dateStr}</span>
                                </div>
                                <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-black border border-amber-500/20">
                                    ★ ${score}
                                </span>
                            </div>
                            <p class="text-xs text-slate-300 italic pl-8">
                                "${commentText || 'Calificación sin comentario escrito.'}"
                            </p>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                console.error('Error fetching reviews modal content:', err);
                contentEl.innerHTML = `
                    <div class="p-6 text-center text-rose-400 text-xs">
                        Error al cargar las reseñas: ${err.message}
                    </div>
                `;
            }
        },

        closeReviewsModal: function () {
            const modal = document.getElementById('biReviewsModal');
            if (modal) modal.classList.add('hidden');
        },

        // ── Exportación a CSV ───────────────────────────────────────────────
        exportCurrentToCsv: function () {
            let csvContent = 'data:text/csv;charset=utf-8,';
            let filename = 'reputacion_bi.csv';

            if (this.activeSubTab === 'couriers') {
                filename = 'reputacion_motorizados.csv';
                csvContent += 'Nombre,Placa,Rating Promedio,Total Opiniones,Entregas Completadas,% Entregas Valoradas,Estado Semáforo\r\n';
                this.couriers.forEach(c => {
                    csvContent += `"${c.name}","${c.plate}",${c.rating},${c.ratingCount},${c.totalDeliveries},${c.ratio}%,"${c.semaphore.badge}"\r\n`;
                });
            } else {
                filename = 'reputacion_comercios.csv';
                csvContent += 'Comercio,Rubro,Rating Promedio,Total Opiniones,Pedidos Entregados,% Pedidos Valorados,Estado Semáforo\r\n';
                this.merchants.forEach(m => {
                    csvContent += `"${m.name}","${m.category}",${m.rating},${m.ratingCount},${m.totalOrders},${m.ratio}%,"${m.semaphore.badge}"\r\n`;
                });
            }

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
})();
