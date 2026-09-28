// Módulo Dashboard Manager Enterprise (Sprint 15 / 18.2) - Control en Tiempo Real del Dashboard Cliente
window.dashboardManagerModule = {
    _unsubs: [],

    render: async function() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Limpiar listeners previos
        this._unsubs.forEach(unsub => { if (typeof unsub === 'function') unsub(); });
        this._unsubs = [];

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto pb-12">
                <!-- Encabezado del Módulo -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div class="space-y-1">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">🎨</span>
                            <div>
                                <h2 class="text-xl font-black text-slate-100 flex items-center gap-2">
                                    <span>Dashboard Manager Enterprise</span>
                                    <span class="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE SYNC
                                    </span>
                                </h2>
                                <p class="text-xs text-slate-400">Administra en tiempo real la experiencia del cliente estilo PedidosYa / Rappi. Cada cambio se refleja instantáneamente en la app móvil.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div id="liveSyncStatus" class="hidden text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl items-center gap-1.5">
                            <span>⚡</span> Sincronizado en tiempo real
                        </div>
                        <button onclick="window.dashboardManagerModule.saveGeneralConfig()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>💾</span> Guardar Configuración General
                        </button>
                    </div>
                </div>

                <!-- Barra de Navegación por Pestañas del Módulo -->
                <div class="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                    <button onclick="window.dashboardManagerModule.switchSubTab('general')" id="dtab-btn-general" class="dtab-btn active bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-xs font-bold transition">
                        ⚙️ Configuración & Visibilidad
                    </button>
                    <button onclick="window.dashboardManagerModule.switchSubTab('starProducts')" id="dtab-btn-starProducts" class="dtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        ⭐ Productos Estrella
                    </button>
                    <button onclick="window.dashboardManagerModule.switchSubTab('flashDeals')" id="dtab-btn-flashDeals" class="dtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        ⚡ Ofertas Flash
                    </button>
                    <button onclick="window.dashboardManagerModule.switchSubTab('branches')" id="dtab-btn-branches" class="dtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        🏢 Sucursales
                    </button>
                    <button onclick="window.dashboardManagerModule.switchSubTab('ordering')" id="dtab-btn-ordering" class="dtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        🔀 Orden de Bloques
                    </button>
                    <button onclick="window.dashboardManagerModule.switchSubTab('analyticsBI')" id="dtab-btn-analyticsBI" class="dtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        📈 Heat Map & Analítica BI
                    </button>
                </div>

                <!-- Sub-Pestaña 1: General & Visibilidad -->
                <div id="dsubtab-general" class="dsubtab-content space-y-6">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-extrabold text-indigo-400 uppercase tracking-wider">Visibilidad de Bloques en el Dashboard</h3>
                                <p class="text-xs text-slate-400">Activa o desactiva los bloques. El cambio se envía inmediatamente a las apps de los clientes conectados.</p>
                            </div>
                            <span class="text-[11px] text-slate-500 font-mono">14 Secciones Dinámicas</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2" id="visibilityTogglesContainer">
                            <p class="text-xs text-slate-500 col-span-3">Cargando interruptores de visibilidad...</p>
                        </div>
                    </div>

                    <!-- Parámetros Geoespaciales Actividad #18 -->
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-extrabold text-indigo-400 uppercase tracking-wider">📍 Parámetros de Descubrimiento Geoespacial (Comercios Cercanos)</h3>
                                <p class="text-xs text-slate-400">Controla los radios de búsqueda y expansión automática para los clientes según su dirección activa.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <label class="text-xs font-bold text-slate-200">Radio Inicial (km)</label>
                                <input type="number" id="cfg_nearbyInitialRadiusKm" min="1" max="50" step="0.5" value="5" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono">
                                <p class="text-[10px] text-slate-400">Radio base de la primera búsqueda (Default: 5 km).</p>
                            </div>

                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <label class="text-xs font-bold text-slate-200">Radio Secundario (km)</label>
                                <input type="number" id="cfg_nearbySecondaryRadiusKm" min="2" max="100" step="0.5" value="10" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono">
                                <p class="text-[10px] text-slate-400">Radio expandido si no se alcanza el mínimo (Default: 10 km).</p>
                            </div>

                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <label class="text-xs font-bold text-slate-200">Radio Máximo (km)</label>
                                <input type="number" id="cfg_nearbyMaxRadiusKm" min="3" max="200" step="0.5" value="15" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono">
                                <p class="text-[10px] text-slate-400">Límite absoluto de cobertura (Default: 15 km).</p>
                            </div>

                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <label class="text-xs font-bold text-slate-200">Mínimo de Comercios Requeridos</label>
                                <input type="number" id="cfg_nearbyMinimumMerchantCount" min="1" max="50" value="5" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono">
                                <p class="text-[10px] text-slate-400">Umbral para detener la expansión de radio (Default: 5).</p>
                            </div>

                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <label class="text-xs font-bold text-slate-200">Criterio de Ordenamiento en Cerca de Ti</label>
                                <select id="cfg_nearbyOrdering" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100">
                                    <option value="nearest">Distancia más cercana (Nearest)</option>
                                    <option value="rating">Mejor calificación de estrellas (Rating)</option>
                                </select>
                                <p class="text-[10px] text-slate-400">Prioridad en el orden del carrusel de proximidad.</p>
                            </div>

                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <label class="text-xs font-bold text-slate-200">Expansión Automática de Radio</label>
                                    <p class="text-[10px] text-slate-400">Amplía de 5 km a 10 km y 15 km si hay pocos comercios.</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="cfg_nearbyAutoExpandEnabled" checked class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sub-Pestaña 2: Productos Estrella -->
                <div id="dsubtab-starProducts" class="dsubtab-content space-y-6 hidden">
                    <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <div>
                            <h3 class="text-sm font-bold text-slate-200">Productos Estrella Destacados ⭐</h3>
                            <p class="text-xs text-slate-400">Platillos destacados que se muestran en el carrusel de inicio de la aplicación.</p>
                        </div>
                        <button onclick="window.dashboardManagerModule.openAddStarProductModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg">
                            <span>+</span> Agregar Producto Estrella
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="starProductsContainer">
                        <p class="text-xs text-slate-500">Cargando productos estrella...</p>
                    </div>
                </div>

                <!-- Sub-Pestaña 3: Ofertas Flash -->
                <div id="dsubtab-flashDeals" class="dsubtab-content space-y-6 hidden">
                    <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <div>
                            <h3 class="text-sm font-bold text-slate-200">Ofertas Flash Programadas ⚡</h3>
                            <p class="text-xs text-slate-400">Descuentos agresivos por tiempo limitado con temporizador regresivo para clientes.</p>
                        </div>
                        <button onclick="window.dashboardManagerModule.openAddFlashDealModal()" class="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg">
                            <span>⚡</span> Crear Oferta Flash
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="flashDealsContainer">
                        <p class="text-xs text-slate-500">Cargando ofertas relámpago...</p>
                    </div>
                </div>

                <!-- Sub-Pestaña 4: Sucursales -->
                <div id="dsubtab-branches" class="dsubtab-content space-y-6 hidden">
                    <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <div>
                            <h3 class="text-sm font-bold text-slate-200">Sucursales Independientes por Comercio 🏢</h3>
                            <p class="text-xs text-slate-400">Asocia sucursales específicas a comercios existentes (ej: Metrocentro, Galerías, Bello Horizonte).</p>
                        </div>
                        <button onclick="window.dashboardManagerModule.openAddBranchModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg">
                            <span>+</span> Registrar Sucursal
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="branchesContainer">
                        <p class="text-xs text-slate-500">Cargando sucursales...</p>
                    </div>
                </div>

                <!-- Sub-Pestaña 5: Orden de Bloques -->
                <div id="dsubtab-ordering" class="dsubtab-content space-y-6 hidden">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-extrabold text-indigo-400 uppercase tracking-wider">🔀 Jerarquía y Orden de Bloques en el Inicio</h3>
                                <p class="text-xs text-slate-400">Define el orden en que las secciones aparecen verticalmente en la pantalla principal del cliente.</p>
                            </div>
                            <button onclick="window.dashboardManagerModule.resetSectionOrder()" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline">
                                Restaurar orden por defecto
                            </button>
                        </div>
                        <div id="sectionOrderListContainer" class="space-y-2 max-w-2xl">
                            <!-- Inyectado dinámicamente -->
                        </div>
                    </div>
                </div>

                <!-- Sub-Pestaña 6: Heat Map & Analítica BI -->
                <div id="dsubtab-analyticsBI" class="dsubtab-content space-y-6 hidden">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-extrabold text-indigo-400 uppercase tracking-wider">Business Intelligence & Heat Map Comercial 📈</h3>
                                <p class="text-xs text-slate-400">Métricas en tiempo real registradas por eventos de interacción directa en la App Android.</p>
                            </div>
                            <button onclick="window.dashboardManagerModule.loadAnalyticsBI()" class="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600/30 transition flex items-center gap-1.5">
                                <span>🔄</span> Actualizar Métricas
                            </button>
                        </div>

                        <!-- KPI Summary Cards -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="biKpiSummaryContainer">
                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Impresiones</p>
                                <p class="text-xl font-black text-slate-100 font-mono" id="kpiTotalViews">0</p>
                            </div>
                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Clics</p>
                                <p class="text-xl font-black text-emerald-400 font-mono" id="kpiTotalClicks">0</p>
                            </div>
                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CTR Promedio</p>
                                <p class="text-xl font-black text-amber-400 font-mono" id="kpiAvgCtr">0.0%</p>
                            </div>
                            <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-1">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ingresos Atribuidos</p>
                                <p class="text-xl font-black text-indigo-300 font-mono" id="kpiTotalRevenue">C$ 0.00</p>
                            </div>
                        </div>

                        <div id="analyticsBITableContainer">
                            <p class="text-xs text-slate-500">Cargando métricas de rendimiento comercial...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initGeneralConfigListener();
        this.initStarProductsListener();
        this.initFlashDealsListener();
        this.initBranchesListener();
        this.loadAnalyticsBI();
    },

    switchSubTab: function(tabKey) {
        document.querySelectorAll('.dtab-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-600/20', 'text-indigo-400', 'border', 'border-indigo-500/30');
            btn.classList.add('text-slate-400');
        });
        document.querySelectorAll('.dsubtab-content').forEach(cont => cont.classList.add('hidden'));

        const activeBtn = document.getElementById(`dtab-btn-${tabKey}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-400');
            activeBtn.classList.add('bg-indigo-600/20', 'text-indigo-400', 'border', 'border-indigo-500/30');
        }
        const activeCont = document.getElementById(`dsubtab-${tabKey}`);
        if (activeCont) activeCont.classList.remove('hidden');

        if (tabKey === 'analyticsBI') {
            this.loadAnalyticsBI();
        }
    },

    showLiveSyncFeedback: function() {
        const badge = document.getElementById('liveSyncStatus');
        if (badge) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
            clearTimeout(this._badgeTimeout);
            this._badgeTimeout = setTimeout(() => {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }, 2500);
        }
    },

    // ─── Pestaña 1: Configuración & Visibilidad ──────────────────────────────

    allToggles: [
        { key: 'showBanners', label: 'Banners Promocionales Superiores', icon: '🖼️', desc: 'Carrusel superior con anuncios de comercios y ofertas.' },
        { key: 'showCategories', label: 'Categorías (PedidosYa Style)', icon: '🏷️', desc: 'Barra horizontal de filtros por categorías comerciales.' },
        { key: 'showBranchesBlock', label: 'Bloque de Sucursales por Comercio 🏢', icon: '🏢', desc: 'Carrusel de sedes específicas para comercios multicentrales.' },
        { key: 'showNearbyBusinesses', label: 'Comercios Cerca de Ti (Geolocalización) 📍', icon: '📍', desc: 'Descubrimiento geoespacial con radio dinámico expandible.' },
        { key: 'showFeaturedProducts', label: 'Productos Estrella ⭐', icon: '🍔', desc: 'Platillos destacados fijados para compra directa.' },
        { key: 'showFeaturedBusinesses', label: 'Comercios Destacados ⭐', icon: '🏪', desc: 'Comercios marcados como favoritos de la plataforma.' },
        { key: 'showFlashDeals', label: 'Ofertas Flash ⚡', icon: '⏱️', desc: 'Sección de compras de oportunidad con cuenta regresiva.' },
        { key: 'showPromotions', label: 'Productos con Descuentos 🏷️', icon: '💰', desc: 'Sección de catálogo con rebajas porcentuales activas.' },
        { key: 'showSamePrice', label: 'Mismo Precio que en Local 🏷️', icon: '💵', desc: 'Comercios garantizados sin sobreprecio de menú.' },
        { key: 'showTopSelling', label: 'Los Más Vendidos 🔥', icon: '📈', desc: 'Comercios y productos con mayor volumen de pedidos.' },
        { key: 'showRecommended', label: 'Recomendados para ti 🎯', icon: '❤️', desc: 'Sugerencias personalizadas según hábitos del cliente.' },
        { key: 'showNewBusinesses', label: 'Comercios Nuevos 🟢', icon: '🆕', desc: 'Nuevos restaurantes y tiendas integrados al marketplace.' },
        { key: 'showQuickReorder', label: 'Volver a Pedir 🔄', icon: '🛍️', desc: 'Acceso directo para repetir pedidos anteriores.' },
        { key: 'showFavoritesBlock', label: 'Tus Comercios Favoritos ❤️', icon: '⭐', desc: 'Comercios guardados en favoritos por el cliente.' },
        { key: 'showExpressDeliveryBanner', label: 'Servicio Encomiendas X→Y (Banner)', icon: '🛵', desc: 'Banner de acceso directo al servicio de envíos express punto a punto.' },
        { key: 'xToYServiceEnabled', label: 'Servicio Encomiendas X→Y (Habilitación Operativa)', icon: '🚚', desc: 'Control maestro de acceso y disponibilidad operativa al servicio de encomiendas X→Y.' }
    ],

    defaultSectionOrder: [
        { id: 'BANNERS', name: 'Banners Promocionales Superiores', icon: '🖼️' },
        { id: 'CATEGORIES', name: 'Categorías (PedidosYa Style)', icon: '🏷️' },
        { id: 'BRANCHES', name: 'Bloque de Sucursales por Comercio', icon: '🏢' },
        { id: 'NEARBY', name: 'Comercios Cerca de Ti (Geolocalización)', icon: '📍' },
        { id: 'FEATURED_BUSINESSES', name: 'Comercios Destacados', icon: '🏪' },
        { id: 'FEATURED_PRODUCTS', name: 'Productos Estrella', icon: '🍔' },
        { id: 'FLASH_DEALS', name: 'Ofertas Flash con Temporizador', icon: '⚡' },
        { id: 'PROMOTIONS', name: 'Productos con Descuentos', icon: '🏷️' },
        { id: 'SAME_PRICE', name: 'Mismo Precio que en Local', icon: '💵' },
        { id: 'TOP_SELLING', name: 'Los Más Vendidos', icon: '🔥' },
        { id: 'RECOMMENDED', name: 'Recomendados para ti', icon: '❤️' },
        { id: 'NEW_BUSINESSES', name: 'Comercios Nuevos', icon: '🟢' },
        { id: 'QUICK_REORDER', name: 'Volver a Pedir (Reorder)', icon: '🔄' },
        { id: 'FAVORITES', name: 'Tus Comercios Favoritos', icon: '⭐' },
        { id: 'EXPRESS_DELIVERY', name: 'Servicio Encomiendas X→Y (Express Delivery)', icon: '🛵' }
    ],

    currentSectionOrder: [],

    initGeneralConfigListener: function() {
        const unsub = db.collection('dashboard').doc('configuration').onSnapshot(doc => {
            const data = doc.exists ? doc.data() : {};
            this.renderToggles(data);
            this.populateGeoParams(data);
            this.renderSectionOrder(data.sectionOrder || this.defaultSectionOrder.map(s => s.id));
        }, err => {
            console.error("Error listening to dashboard configuration:", err);
        });
        this._unsubs.push(unsub);
    },

    renderToggles: function(data) {
        const container = document.getElementById('visibilityTogglesContainer');
        if (!container) return;

        container.innerHTML = this.allToggles.map(t => {
            // Fail-closed safe defaults para X→Y (P0-02, P0-03): false si no está presente
            const isChecked = (t.key === 'showExpressDeliveryBanner' || t.key === 'xToYServiceEnabled')
                ? (data[t.key] === true)
                : (data[t.key] !== false);
            return `
                <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div class="flex items-start gap-3 min-w-0">
                        <span class="text-xl p-1 bg-slate-900 rounded-lg border border-slate-800">${t.icon}</span>
                        <div class="min-w-0">
                            <h4 class="text-xs font-bold text-slate-200 truncate">${t.label}</h4>
                            <p class="text-[10px] text-slate-400 line-clamp-1">${t.desc}</p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" id="cfg_${t.key}" ${isChecked ? 'checked' : ''} onchange="window.dashboardManagerModule.updateSingleToggle('${t.key}', this.checked)" class="sr-only peer">
                        <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            `;
        }).join('');
    },

    populateGeoParams: function(data) {
        const initRadEl = document.getElementById('cfg_nearbyInitialRadiusKm');
        if (initRadEl) initRadEl.value = data.nearbyInitialRadiusKm ?? 5;

        const secRadEl = document.getElementById('cfg_nearbySecondaryRadiusKm');
        if (secRadEl) secRadEl.value = data.nearbySecondaryRadiusKm ?? 10;

        const maxRadEl = document.getElementById('cfg_nearbyMaxRadiusKm');
        if (maxRadEl) maxRadEl.value = data.nearbyMaxRadiusKm ?? 15;

        const minCountEl = document.getElementById('cfg_nearbyMinimumMerchantCount');
        if (minCountEl) minCountEl.value = data.nearbyMinimumMerchantCount ?? 5;

        const orderingEl = document.getElementById('cfg_nearbyOrdering');
        if (orderingEl) orderingEl.value = data.nearbyOrdering || 'nearest';

        const autoExpandEl = document.getElementById('cfg_nearbyAutoExpandEnabled');
        if (autoExpandEl) autoExpandEl.checked = data.nearbyAutoExpandEnabled !== false;
    },

    updateSingleToggle: async function(key, isChecked) {
        try {
            await db.collection('dashboard').doc('configuration').set({
                [key]: isChecked,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') {
                showToast(`⚡ ${isChecked ? 'Activado' : 'Desactivado'} en tiempo real`, 'success');
            }
        } catch (e) {
            console.error("Error updating toggle:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
        }
    },

    saveGeneralConfig: async function() {
        const payload = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        this.allToggles.forEach(t => {
            const el = document.getElementById(`cfg_${t.key}`);
            if (el) payload[t.key] = el.checked;
        });

        const initialRadius = parseFloat(document.getElementById('cfg_nearbyInitialRadiusKm')?.value) || 5;
        const secondaryRadius = parseFloat(document.getElementById('cfg_nearbySecondaryRadiusKm')?.value) || 10;
        const maxRadius = parseFloat(document.getElementById('cfg_nearbyMaxRadiusKm')?.value) || 15;
        const minCount = parseInt(document.getElementById('cfg_nearbyMinimumMerchantCount')?.value, 10) || 5;
        const ordering = document.getElementById('cfg_nearbyOrdering')?.value || 'nearest';
        const autoExpand = document.getElementById('cfg_nearbyAutoExpandEnabled')?.checked ?? true;

        if (initialRadius <= 0) {
            if (typeof showToast === 'function') showToast('❌ El radio inicial debe ser mayor a 0 km', 'error');
            else alert('❌ El radio inicial debe ser mayor a 0 km');
            return;
        }
        if (secondaryRadius <= initialRadius) {
            if (typeof showToast === 'function') showToast('❌ El radio secundario debe ser mayor al radio inicial', 'error');
            else alert('❌ El radio secundario debe ser mayor al radio inicial');
            return;
        }
        if (maxRadius < secondaryRadius) {
            if (typeof showToast === 'function') showToast('❌ El radio máximo debe ser mayor o igual al radio secundario', 'error');
            else alert('❌ El radio máximo debe ser mayor o igual al radio secundario');
            return;
        }
        if (minCount < 1) {
            if (typeof showToast === 'function') showToast('❌ El mínimo de comercios debe ser al menos 1', 'error');
            else alert('❌ El mínimo de comercios debe ser al menos 1');
            return;
        }

        payload.nearbyInitialRadiusKm = initialRadius;
        payload.nearbySecondaryRadiusKm = secondaryRadius;
        payload.nearbyMaxRadiusKm = maxRadius;
        payload.nearbyMinimumMerchantCount = minCount;
        payload.nearbyOrdering = ordering;
        payload.nearbyAutoExpandEnabled = autoExpand;

        if (this.currentSectionOrder && this.currentSectionOrder.length > 0) {
            payload.sectionOrder = this.currentSectionOrder;
        }

        try {
            await db.collection('dashboard').doc('configuration').set(payload, { merge: true });
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast('✅ Configuración del Dashboard guardada y transmitida a clientes', 'success');
            else alert('✅ Configuración del Dashboard guardada con éxito');
        } catch (e) {
            console.error("Error saving general config:", e);
            if (typeof showToast === 'function') showToast(`❌ Error al guardar: ${e.message}`, 'error');
            else alert(`❌ Error: ${e.message}`);
        }
    },

    // ─── Pestaña: Orden de Bloques ──────────────────────────────────────────

    renderSectionOrder: function(orderArray) {
        const container = document.getElementById('sectionOrderListContainer');
        if (!container) return;

        // Normalizar con la lista base
        const items = [];
        orderArray.forEach(id => {
            const found = this.defaultSectionOrder.find(s => s.id === id);
            if (found && !items.find(i => i.id === id)) items.push(found);
        });
        this.defaultSectionOrder.forEach(def => {
            if (!items.find(i => i.id === def.id)) items.push(def);
        });

        this.currentSectionOrder = items.map(i => i.id);

        container.innerHTML = items.map((item, idx) => `
            <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition">
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold flex items-center justify-center text-indigo-400">
                        ${idx + 1}
                    </span>
                    <span class="text-base">${item.icon}</span>
                    <span class="text-xs font-bold text-slate-200">${item.name}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="window.dashboardManagerModule.moveSection(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-lg text-xs font-bold transition">
                        ▲
                    </button>
                    <button onclick="window.dashboardManagerModule.moveSection(${idx}, 1)" ${idx === items.length - 1 ? 'disabled' : ''} class="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-lg text-xs font-bold transition">
                        ▼
                    </button>
                </div>
            </div>
        `).join('');
    },

    moveSection: async function(index, delta) {
        const newIndex = index + delta;
        if (newIndex < 0 || newIndex >= this.currentSectionOrder.length) return;

        const temp = this.currentSectionOrder[index];
        this.currentSectionOrder[index] = this.currentSectionOrder[newIndex];
        this.currentSectionOrder[newIndex] = temp;

        this.renderSectionOrder(this.currentSectionOrder);

        try {
            await db.collection('dashboard').doc('configuration').set({
                sectionOrder: this.currentSectionOrder,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            this.showLiveSyncFeedback();
        } catch (e) {
            console.error("Error updating section order:", e);
        }
    },

    resetSectionOrder: async function() {
        if (!confirm("¿Restaurar el orden predeterminado de bloques en la app?")) return;
        this.currentSectionOrder = this.defaultSectionOrder.map(s => s.id);
        this.renderSectionOrder(this.currentSectionOrder);
        await db.collection('dashboard').doc('configuration').set({
            sectionOrder: this.currentSectionOrder,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        this.showLiveSyncFeedback();
        if (typeof showToast === 'function') showToast('✅ Orden restaurado', 'success');
    },

    // ─── Pestaña 2: Productos Estrella ──────────────────────────────────────

    initStarProductsListener: function() {
        const unsub = db.collection('featuredProducts').onSnapshot(snapshot => {
            const container = document.getElementById('starProductsContainer');
            if (!container) return;

            if (snapshot.empty) {
                container.innerHTML = `<div class="bg-slate-950/60 border border-slate-800 p-8 rounded-2xl text-center space-y-2 col-span-3">
                    <p class="text-xs text-slate-400">No hay productos estrella registrados actualmente.</p>
                    <p class="text-[11px] text-slate-500">Haz clic en "+ Agregar Producto Estrella" para destacar platillos de tus comercios.</p>
                </div>`;
                return;
            }

            container.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                const safeImg = typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(p.imageUrl, 'promo') : (p.imageUrl || '/assets/promo-placeholder.svg');
                const isActive = p.active !== false;

                return `
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
                        <div class="relative">
                            <img src="${safeImg}" class="w-full h-36 object-cover bg-slate-950" onError="handleImageError(this, 'promo')">
                            <span class="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">
                                ${isActive ? 'ACTIVO' : 'PAUSADO'}
                            </span>
                        </div>
                        <div class="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 class="text-xs font-black text-slate-100 line-clamp-1">${p.name}</h4>
                                <p class="text-[11px] text-indigo-400 font-semibold truncate">${p.businessName || 'Comercio'}</p>
                                <p class="text-xs font-black text-emerald-400 mt-1">C$ ${p.price}</p>
                            </div>
                            <div class="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                                <button onclick="window.dashboardManagerModule.toggleStarProductStatus('${doc.id}', ${!isActive})" class="flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition ${isActive ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/60' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60'}">
                                    ${isActive ? '⏸️ Pausar' : '▶️ Activar'}
                                </button>
                                <button onclick="window.dashboardManagerModule.deleteStarProduct('${doc.id}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-800/40 transition">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }, err => {
            console.error("Error listening to star products:", err);
        });
        this._unsubs.push(unsub);
    },

    toggleStarProductStatus: async function(id, newStatus) {
        try {
            await db.collection('featuredProducts').doc(id).update({
                active: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast(`⭐ Producto estrella ${newStatus ? 'activado' : 'pausado'}`, 'success');
        } catch (e) {
            console.error("Error toggling star product:", e);
        }
    },

    deleteStarProduct: async function(id) {
        if (!confirm("¿Eliminar este producto estrella del dashboard?")) return;
        try {
            await db.collection('featuredProducts').doc(id).delete();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast('🗑️ Producto estrella eliminado', 'info');
        } catch (e) {
            console.error("Error deleting star product:", e);
        }
    },

    openAddStarProductModal: async function() {
        const oldModal = document.getElementById('starProductModal');
        if (oldModal) oldModal.remove();

        const [bizSnap, prodSnap] = await Promise.all([
            db.collection('businesses').get(),
            db.collection('products').get()
        ]);

        const businesses = bizSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().nombre || 'Comercio', ...d.data() }));
        const products = prodSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name || d.data().nombre || 'Producto',
            businessId: d.data().businessId || d.data().restaurantId || '',
            price: d.data().price || d.data().precio || 0,
            originalPrice: d.data().originalPrice || d.data().precioOriginal || null,
            imageUrl: typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(d.data().imageUrl || d.data().imagenUrl, 'promo') : (d.data().imageUrl || d.data().imagenUrl || ''),
            status: d.data().status || 'ACTIVE',
            active: d.data().active !== false && d.data().isAvailable !== false
        })).filter(p => p.active && p.status !== 'DELETED');

        const modalDiv = document.createElement('div');
        modalDiv.id = 'starProductModal';
        modalDiv.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-6 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                        <span>⭐</span> Seleccionar Producto Estrella Real
                    </h3>
                    <button onclick="document.getElementById('starProductModal').remove()" class="text-slate-400 hover:text-slate-200 text-lg">✕</button>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">1. Filtrar por Comercio</label>
                        <select id="modalStarBizSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
                            <option value="ALL">-- Todos los Comercios (${businesses.length}) --</option>
                            ${businesses.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">2. Seleccionar Producto Real del Catálogo</label>
                        <select id="modalStarProdSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
                            <option value="">-- Selecciona un producto --</option>
                            ${products.map(p => {
                                const b = businesses.find(bz => bz.id === p.businessId);
                                const bName = b ? b.name : 'Comercio';
                                return `<option value="${p.id}" data-bizid="${p.businessId}" data-bizname="${bName}" data-name="${p.name}" data-price="${p.price}" data-origprice="${p.originalPrice || ''}" data-img="${p.imageUrl}">[${bName}] ${p.name} — C$ ${p.price}</option>`;
                            }).join('')}
                        </select>
                    </div>

                    <!-- Vista Previa Live -->
                    <div id="modalStarPreview" class="hidden bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                        <img id="modalStarPrevImg" src="" class="w-16 h-16 object-cover rounded-lg bg-slate-900 border border-slate-800" onError="handleImageError(this, 'promo')">
                        <div class="flex-1 min-w-0">
                            <h4 id="modalStarPrevName" class="text-xs font-bold text-slate-100 truncate"></h4>
                            <p id="modalStarPrevBiz" class="text-[11px] text-indigo-400 truncate"></p>
                            <p id="modalStarPrevPrice" class="text-xs font-extrabold text-emerald-400 mt-0.5"></p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button type="button" onclick="document.getElementById('starProductModal').remove()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition">Cancelar</button>
                    <button type="button" id="modalStarSaveBtn" disabled class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white rounded-xl shadow-lg transition">⭐ Guardar Producto Estrella</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        const bizSelect = document.getElementById('modalStarBizSelect');
        const prodSelect = document.getElementById('modalStarProdSelect');
        const previewDiv = document.getElementById('modalStarPreview');
        const prevImg = document.getElementById('modalStarPrevImg');
        const prevName = document.getElementById('modalStarPrevName');
        const prevBiz = document.getElementById('modalStarPrevBiz');
        const prevPrice = document.getElementById('modalStarPrevPrice');
        const saveBtn = document.getElementById('modalStarSaveBtn');

        const updateProductList = () => {
            const selectedBiz = bizSelect.value;
            const filteredProds = selectedBiz === 'ALL' ? products : products.filter(p => p.businessId === selectedBiz);
            prodSelect.innerHTML = `<option value="">-- Selecciona un producto (${filteredProds.length}) --</option>` +
                filteredProds.map(p => {
                    const b = businesses.find(bz => bz.id === p.businessId);
                    const bName = b ? b.name : 'Comercio';
                    return `<option value="${p.id}" data-bizid="${p.businessId}" data-bizname="${bName}" data-name="${p.name}" data-price="${p.price}" data-origprice="${p.originalPrice || ''}" data-img="${p.imageUrl}">[${bName}] ${p.name} — C$ ${p.price}</option>`;
                }).join('');
            previewDiv.classList.add('hidden');
            saveBtn.disabled = true;
        };

        bizSelect.addEventListener('change', updateProductList);

        prodSelect.addEventListener('change', () => {
            const opt = prodSelect.selectedOptions[0];
            if (!opt || !opt.value) {
                previewDiv.classList.add('hidden');
                saveBtn.disabled = true;
                return;
            }
            prevName.textContent = opt.dataset.name;
            prevBiz.textContent = opt.dataset.bizname;
            prevPrice.textContent = `C$ ${opt.dataset.price}`;
            const safeImg = typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(opt.dataset.img, 'promo') : (opt.dataset.img || '/assets/promo-placeholder.svg');
            prevImg.src = safeImg;
            previewDiv.classList.remove('hidden');
            saveBtn.disabled = false;
        });

        saveBtn.addEventListener('click', async () => {
            const opt = prodSelect.selectedOptions[0];
            if (!opt || !opt.value) return;

            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            const prodId = opt.value;
            const bizId = opt.dataset.bizid;
            const bizName = opt.dataset.bizname;
            const name = opt.dataset.name;
            const price = parseFloat(opt.dataset.price) || 0;
            const origPrice = opt.dataset.origprice ? parseFloat(opt.dataset.origprice) : null;
            const safeImg = typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(opt.dataset.img, 'promo') : (opt.dataset.img || '');

            try {
                await db.collection('featuredProducts').doc(prodId).set({
                    id: prodId,
                    productId: prodId,
                    businessId: bizId,
                    businessName: bizName,
                    name: name,
                    price: price,
                    originalPrice: origPrice,
                    imageUrl: safeImg,
                    rating: 4.9,
                    active: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                this.showLiveSyncFeedback();
                if (typeof showToast === 'function') showToast('✅ Producto estrella guardado', 'success');
                modalDiv.remove();
            } catch (e) {
                console.error("Error saving star product:", e);
                saveBtn.disabled = false;
                saveBtn.textContent = '⭐ Guardar Producto Estrella';
            }
        });
    },

    // ─── Pestaña 3: Ofertas Flash ───────────────────────────────────────────

    initFlashDealsListener: function() {
        const unsub = db.collection('flashDeals').onSnapshot(snapshot => {
            const container = document.getElementById('flashDealsContainer');
            if (!container) return;

            if (snapshot.empty) {
                container.innerHTML = `<div class="bg-slate-950/60 border border-slate-800 p-8 rounded-2xl text-center space-y-2 col-span-3">
                    <p class="text-xs text-slate-400">No hay ofertas relámpago activas.</p>
                    <p class="text-[11px] text-slate-500">Crea una oferta flash para impulsar ventas inmediatas con temporizador.</p>
                </div>`;
                return;
            }

            const nowMs = Date.now();

            container.innerHTML = snapshot.docs.map(doc => {
                const d = doc.data();
                const safeImg = typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(d.imageUrl, 'promo') : (d.imageUrl || '/assets/promo-placeholder.svg');
                const endAtDate = d.endAt ? (d.endAt.toDate ? d.endAt.toDate() : new Date(d.endAt)) : null;
                const isExpired = endAtDate ? endAtDate.getTime() < nowMs : false;
                const isActive = d.active !== false && !isExpired;

                // Formateo de tiempo restante amigable
                let remainingBadge = '';
                let expirationText = '';
                if (endAtDate) {
                    const diffMs = endAtDate.getTime() - nowMs;
                    if (diffMs <= 0) {
                        remainingBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">⚠️ EXPIRADA</span>`;
                        expirationText = `Expiró: ${endAtDate.toLocaleDateString('es-NI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
                    } else {
                        const totalMins = Math.floor(diffMs / 60000);
                        let remStr = '';
                        if (totalMins >= 1440) {
                            const d = Math.floor(totalMins / 1440);
                            const h = Math.floor((totalMins % 1440) / 60);
                            remStr = `${d}d ${h}h`;
                        } else if (totalMins >= 60) {
                            const h = Math.floor(totalMins / 60);
                            const m = totalMins % 60;
                            remStr = `${h}h ${m}m`;
                        } else {
                            remStr = `${totalMins}m`;
                        }
                        remainingBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">⏱️ ${remStr}</span>`;
                        expirationText = `Vence: ${endAtDate.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
                    }
                } else if (d.expiresAtMinutes) {
                    remainingBadge = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">⏱️ ${d.expiresAtMinutes} min</span>`;
                    expirationText = `Duración: ${d.expiresAtMinutes} min`;
                }

                return `
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
                        <div class="relative">
                            <img src="${safeImg}" class="w-full h-36 object-cover bg-slate-950" onError="handleImageError(this, 'promo')">
                            <div class="absolute top-2 left-2 flex items-center gap-1.5">
                                <span class="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow">
                                    ${d.discountTag || 'OFERTA'}
                                </span>
                            </div>
                            <div class="absolute top-2 right-2 flex items-center gap-1">
                                ${remainingBadge}
                            </div>
                        </div>
                        <div class="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 class="text-xs font-black text-slate-100 line-clamp-1">${d.productName || d.title}</h4>
                                <p class="text-[11px] text-amber-400 font-semibold truncate">${d.businessName || 'Comercio'}</p>
                                <p class="text-xs font-black text-slate-100 mt-1">
                                    C$ ${d.price} <span class="line-through text-[11px] text-slate-500 font-normal ml-1">C$ ${d.originalPrice}</span>
                                </p>
                                <p class="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-mono">
                                    <span>📅</span> ${expirationText}
                                </p>
                            </div>
                            <div class="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                                <button onclick="window.dashboardManagerModule.toggleFlashDealStatus('${doc.id}', ${!d.active})" class="flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition ${d.active ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/60' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60'}">
                                    ${d.active ? '⏸️ Pausar' : '▶️ Activar'}
                                </button>
                                <button onclick="window.dashboardManagerModule.deleteFlashDeal('${doc.id}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-800/40 transition">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }, err => {
            console.error("Error listening to flash deals:", err);
        });
        this._unsubs.push(unsub);
    },

    toggleFlashDealStatus: async function(id, newStatus) {
        try {
            await db.collection('flashDeals').doc(id).update({
                active: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast(`⚡ Oferta flash ${newStatus ? 'reactivada' : 'pausada'}`, 'success');
        } catch (e) {
            console.error("Error toggling flash deal:", e);
        }
    },

    deleteFlashDeal: async function(id) {
        if (!confirm("¿Eliminar esta oferta relámpago?")) return;
        try {
            await db.collection('flashDeals').doc(id).delete();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast('🗑️ Oferta flash eliminada', 'info');
        } catch (e) {
            console.error("Error deleting flash deal:", e);
        }
    },

    openAddFlashDealModal: async function() {
        const oldModal = document.getElementById('flashDealModal');
        if (oldModal) oldModal.remove();

        const [bizSnap, prodSnap] = await Promise.all([
            db.collection('businesses').get(),
            db.collection('products').get()
        ]);

        const businesses = bizSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().nombre || 'Comercio', ...d.data() }));
        const products = prodSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name || d.data().nombre || 'Producto',
            businessId: d.data().businessId || d.data().restaurantId || '',
            price: d.data().price || d.data().precio || 0,
            originalPrice: d.data().originalPrice || d.data().precioOriginal || null,
            imageUrl: typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(d.data().imageUrl || d.data().imagenUrl, 'promo') : (d.data().imageUrl || d.data().imagenUrl || ''),
            status: d.data().status || 'ACTIVE',
            active: d.data().active !== false && d.data().isAvailable !== false
        })).filter(p => p.active && p.status !== 'DELETED');

        const modalDiv = document.createElement('div');
        modalDiv.id = 'flashDealModal';
        modalDiv.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-6 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                        <span>⚡</span> Crear Oferta Flash con Producto Real
                    </h3>
                    <button onclick="document.getElementById('flashDealModal').remove()" class="text-slate-400 hover:text-slate-200 text-lg">✕</button>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">1. Filtrar por Comercio</label>
                        <select id="modalFlashBizSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500">
                            <option value="ALL">-- Todos los Comercios (${businesses.length}) --</option>
                            ${businesses.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">2. Seleccionar Producto Real</label>
                        <select id="modalFlashProdSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500">
                            <option value="">-- Selecciona un producto --</option>
                            ${products.map(p => {
                                const b = businesses.find(bz => bz.id === p.businessId);
                                const bName = b ? b.name : 'Comercio';
                                return `<option value="${p.id}" data-bizid="${p.businessId}" data-bizname="${bName}" data-name="${p.name}" data-price="${p.price}" data-origprice="${p.originalPrice || ''}" data-img="${p.imageUrl}">[${bName}] ${p.name} (Normal: C$ ${p.price})</option>`;
                            }).join('')}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Precio Normal (C$)</label>
                            <input type="number" id="modalFlashOrigPrice" readonly class="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 outline-none">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Precio Oferta Flash (C$) *</label>
                            <input type="number" id="modalFlashPrice" placeholder="Ej: 150" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 font-bold outline-none focus:border-amber-500">
                        </div>
                    </div>

                    <!-- Configuración Avanzada de Duración (Minutos, Horas, Días) -->
                    <div class="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                        <div class="flex items-center justify-between">
                            <label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <span>⏱️</span> Duración de la Oferta Flash *
                            </label>
                            <span id="modalFlashDurationSummary" class="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                2 horas (120 min)
                            </span>
                        </div>

                        <!-- Selector de Cantidad y Unidad -->
                        <div class="grid grid-cols-12 gap-2">
                            <div class="col-span-5">
                                <input type="number" id="modalFlashDurationValue" value="2" min="1" step="1" 
                                    class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 font-bold outline-none focus:border-amber-500 transition text-center" 
                                    placeholder="2">
                            </div>
                            <div class="col-span-7">
                                <select id="modalFlashDurationUnit" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-amber-500">
                                    <option value="MINUTES">Minutos</option>
                                    <option value="HOURS" selected>Horas</option>
                                    <option value="DAYS">Días</option>
                                </select>
                            </div>
                        </div>

                        <!-- Accesos Rápidos (Presets) -->
                        <div class="space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] text-slate-500 font-medium">Accesos rápidos:</span>
                            </div>
                            <div class="flex flex-wrap gap-1.5" id="modalFlashPresets">
                                <button type="button" data-val="15" data-unit="MINUTES" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">15m</button>
                                <button type="button" data-val="30" data-unit="MINUTES" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">30m</button>
                                <button type="button" data-val="1" data-unit="HOURS" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">1h</button>
                                <button type="button" data-val="2" data-unit="HOURS" class="flash-preset-chip active px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 transition">2h</button>
                                <button type="button" data-val="6" data-unit="HOURS" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">6h</button>
                                <button type="button" data-val="12" data-unit="HOURS" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">12h</button>
                                <button type="button" data-val="1" data-unit="DAYS" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">1 día</button>
                                <button type="button" data-val="3" data-unit="DAYS" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">3 días</button>
                                <button type="button" data-val="7" data-unit="DAYS" class="flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">7 días</button>
                            </div>
                        </div>

                        <!-- Previsualización de Vencimiento Estimado -->
                        <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                            <span class="text-slate-400 flex items-center gap-1.5">
                                <span>📅</span> Vence: <strong id="modalFlashEndFormatted" class="text-amber-300 font-semibold">Calculando...</strong>
                            </span>
                            <span id="modalFlashTotalMinutesText" class="text-[10px] text-slate-500 font-mono">120 min</span>
                        </div>
                    </div>

                    <!-- Badge de Descuento y Ahorro Estimado -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Badge de Descuento</label>
                            <input type="text" id="modalFlashDiscountTag" placeholder="-50%" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 font-bold outline-none focus:border-amber-500">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Ahorro para el Cliente</label>
                            <div id="modalFlashSavingsBadge" class="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-semibold flex items-center">
                                C$ 0.00
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button type="button" onclick="document.getElementById('flashDealModal').remove()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition">Cancelar</button>
                    <button type="button" id="modalFlashSaveBtn" disabled class="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white rounded-xl shadow-lg transition">⚡ Crear Oferta Flash</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        const bizSelect = document.getElementById('modalFlashBizSelect');
        const prodSelect = document.getElementById('modalFlashProdSelect');
        const origPriceInput = document.getElementById('modalFlashOrigPrice');
        const flashPriceInput = document.getElementById('modalFlashPrice');
        const discountTagInput = document.getElementById('modalFlashDiscountTag');
        const savingsBadge = document.getElementById('modalFlashSavingsBadge');
        const durationValInput = document.getElementById('modalFlashDurationValue');
        const durationUnitSelect = document.getElementById('modalFlashDurationUnit');
        const durationSummary = document.getElementById('modalFlashDurationSummary');
        const endFormattedEl = document.getElementById('modalFlashEndFormatted');
        const totalMinutesEl = document.getElementById('modalFlashTotalMinutesText');
        const presetButtons = modalDiv.querySelectorAll('.flash-preset-chip');
        const saveBtn = document.getElementById('modalFlashSaveBtn');

        const calculateDiscount = () => {
            const orig = parseFloat(origPriceInput.value) || 0;
            const flash = parseFloat(flashPriceInput.value) || 0;
            if (orig > flash && orig > 0) {
                const pct = Math.round(((orig - flash) / orig) * 100);
                discountTagInput.value = `-${pct}%`;
                const diff = (orig - flash).toFixed(2);
                if (savingsBadge) savingsBadge.textContent = `Ahorra: C$ ${diff} (${pct}%)`;
                saveBtn.disabled = flash <= 0;
            } else {
                discountTagInput.value = flash > 0 ? `C$ ${flash}` : '';
                if (savingsBadge) savingsBadge.textContent = flash > 0 ? `Precio especial: C$ ${flash}` : 'C$ 0.00';
                saveBtn.disabled = flash <= 0;
            }
        };

        const calculateDuration = () => {
            let val = parseInt(durationValInput.value);
            if (isNaN(val) || val <= 0) val = 1;
            const unit = durationUnitSelect.value;
            let totalMinutes = val;
            let unitName = 'minutos';

            if (unit === 'HOURS') {
                totalMinutes = val * 60;
                unitName = val === 1 ? 'hora' : 'horas';
            } else if (unit === 'DAYS') {
                totalMinutes = val * 1440;
                unitName = val === 1 ? 'día' : 'días';
            } else {
                unitName = val === 1 ? 'minuto' : 'minutos';
            }

            const now = new Date();
            const endAt = new Date(now.getTime() + totalMinutes * 60 * 1000);

            if (durationSummary) {
                durationSummary.textContent = `${val} ${unitName} (${totalMinutes.toLocaleString()} min)`;
            }
            if (endFormattedEl) {
                endFormattedEl.textContent = endAt.toLocaleDateString('es-NI', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            }
            if (totalMinutesEl) {
                totalMinutesEl.textContent = `${totalMinutes.toLocaleString()} min`;
            }

            // Resaltar preset activo si coincide
            presetButtons.forEach(btn => {
                const bVal = parseInt(btn.dataset.val);
                const bUnit = btn.dataset.unit;
                if (bVal === val && bUnit === unit) {
                    btn.className = 'flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 transition';
                } else {
                    btn.className = 'flash-preset-chip px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition';
                }
            });

            return totalMinutes;
        };

        // Event listeners de duración
        durationValInput.addEventListener('input', calculateDuration);
        durationUnitSelect.addEventListener('change', calculateDuration);

        // Click en presets
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                durationValInput.value = btn.dataset.val;
                durationUnitSelect.value = btn.dataset.unit;
                calculateDuration();
            });
        });

        // Inicializar cálculo de duración inicial
        calculateDuration();

        bizSelect.addEventListener('change', () => {
            const selectedBiz = bizSelect.value;
            const filteredProds = selectedBiz === 'ALL' ? products : products.filter(p => p.businessId === selectedBiz);
            prodSelect.innerHTML = `<option value="">-- Selecciona un producto (${filteredProds.length}) --</option>` +
                filteredProds.map(p => {
                    const b = businesses.find(bz => bz.id === p.businessId);
                    const bName = b ? b.name : 'Comercio';
                    return `<option value="${p.id}" data-bizid="${p.businessId}" data-bizname="${bName}" data-name="${p.name}" data-price="${p.price}" data-origprice="${p.originalPrice || ''}" data-img="${p.imageUrl}">[${bName}] ${p.name} (Normal: C$ ${p.price})</option>`;
                }).join('');
            origPriceInput.value = '';
            flashPriceInput.value = '';
            discountTagInput.value = '';
            if (savingsBadge) savingsBadge.textContent = 'C$ 0.00';
            saveBtn.disabled = true;
        });

        prodSelect.addEventListener('change', () => {
            const opt = prodSelect.selectedOptions[0];
            if (!opt || !opt.value) {
                origPriceInput.value = '';
                flashPriceInput.value = '';
                discountTagInput.value = '';
                if (savingsBadge) savingsBadge.textContent = 'C$ 0.00';
                saveBtn.disabled = true;
                return;
            }
            const orig = parseFloat(opt.dataset.price) || 0;
            origPriceInput.value = orig;
            flashPriceInput.value = Math.round(orig * 0.7);
            calculateDiscount();
        });

        flashPriceInput.addEventListener('input', calculateDiscount);

        saveBtn.addEventListener('click', async () => {
            const opt = prodSelect.selectedOptions[0];
            if (!opt || !opt.value) return;

            const totalDurationMinutes = calculateDuration();
            if (!totalDurationMinutes || totalDurationMinutes <= 0) {
                if (typeof showToast === 'function') showToast('⚠️ La duración debe ser mayor a 0', 'error');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            const prodId = opt.value;
            const bizId = opt.dataset.bizid;
            const bizName = opt.dataset.bizname;
            const name = opt.dataset.name;
            const origPrice = parseFloat(origPriceInput.value) || 0;
            const flashPrice = parseFloat(flashPriceInput.value) || 0;
            const discountTag = discountTagInput.value || 'OFERTA';
            const durationVal = Math.max(1, parseInt(durationValInput.value) || 1);
            const durationUnit = durationUnitSelect.value;
            const safeImg = typeof normalizeProductImageUrl === 'function' ? normalizeProductImageUrl(opt.dataset.img, 'promo') : (opt.dataset.img || '');

            const docId = "fd_" + prodId;
            const now = new Date();
            const endAt = new Date(now.getTime() + (totalDurationMinutes * 60 * 1000));

            try {
                await db.collection('flashDeals').doc(docId).set({
                    id: docId,
                    productId: prodId,
                    businessId: bizId,
                    businessName: bizName,
                    productName: name,
                    title: name,
                    price: flashPrice,
                    originalPrice: origPrice,
                    discountTag: discountTag,
                    imageUrl: safeImg,
                    expiresAtMinutes: totalDurationMinutes,
                    durationValue: durationVal,
                    durationUnit: durationUnit,
                    active: true,
                    startAt: firebase.firestore.Timestamp.fromDate(now),
                    endAt: firebase.firestore.Timestamp.fromDate(endAt),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                this.showLiveSyncFeedback();
                if (typeof showToast === 'function') showToast('⚡ Oferta flash creada con éxito', 'success');
                modalDiv.remove();
            } catch (e) {
                console.error("Error creating flash deal:", e);
                saveBtn.disabled = false;
                saveBtn.textContent = '⚡ Crear Oferta Flash';
            }
        });
    },

    // ─── Pestaña 4: Sucursales (Modal Profesional y Corrección Crítica) ──────

    initBranchesListener: function() {
        const unsub = db.collection('branches').onSnapshot(snapshot => {
            const container = document.getElementById('branchesContainer');
            if (!container) return;

            if (snapshot.empty) {
                container.innerHTML = `<div class="bg-slate-950/60 border border-slate-800 p-8 rounded-2xl text-center space-y-2 col-span-3">
                    <p class="text-xs text-slate-400">No hay sucursales registradas en el sistema.</p>
                    <p class="text-[11px] text-slate-500">Haz clic en "+ Registrar Sucursal" para vincular una sede a cualquier comercio activo.</p>
                </div>`;
                return;
            }

            container.innerHTML = snapshot.docs.map(doc => {
                const b = doc.data();
                const isActive = b.active !== false;
                const isOpen = b.isOpen !== false;

                return `
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition">
                        <div class="space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                                    ${isOpen ? 'ABIERTA' : 'CERRADA'}
                                </span>
                                <span class="text-[10px] text-slate-500 font-mono">⏱️ ${b.prepTimeMinutes || 20} min</span>
                            </div>
                            <h4 class="text-xs font-black text-slate-100">${b.businessName} — ${b.branchName}</h4>
                            <p class="text-[11px] text-slate-400 line-clamp-2">📍 ${b.address}</p>
                            ${b.latitude && b.longitude ? `<p class="text-[10px] text-slate-500 font-mono">GPS: ${b.latitude.toFixed(4)}, ${b.longitude.toFixed(4)}</p>` : ''}
                        </div>
                        <div class="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                            <button onclick="window.dashboardManagerModule.toggleBranchStatus('${doc.id}', ${!isOpen})" class="flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition ${isOpen ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/60' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60'}">
                                ${isOpen ? 'Cerrar' : 'Abrir'}
                            </button>
                            <button onclick="window.dashboardManagerModule.deleteBranch('${doc.id}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-800/40 transition">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }, err => {
            console.error("Error listening to branches:", err);
        });
        this._unsubs.push(unsub);
    },

    toggleBranchStatus: async function(id, newOpenStatus) {
        try {
            await db.collection('branches').doc(id).update({
                isOpen: newOpenStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast(`🏢 Sucursal marcada como ${newOpenStatus ? 'abierta' : 'cerrada'}`, 'success');
        } catch (e) {
            console.error("Error toggling branch status:", e);
        }
    },

    openAddBranchModal: async function() {
        const oldModal = document.getElementById('addBranchModal');
        if (oldModal) oldModal.remove();

        const bizSnap = await db.collection('businesses').get();
        const businesses = bizSnap.docs.map(d => ({
            id: d.id,
            name: d.data().name || d.data().nombre || 'Comercio',
            address: d.data().address || d.data().direccion || '',
            lat: d.data().latitude || d.data().lat || 12.1364,
            lng: d.data().longitude || d.data().lng || -86.2514,
            imageUrl: d.data().imageUrl || d.data().imagenUrl || ''
        }));

        const modalDiv = document.createElement('div');
        modalDiv.id = 'addBranchModal';
        modalDiv.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-6 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                        <span>🏢</span> Registrar Sucursal Oficial
                    </h3>
                    <button onclick="document.getElementById('addBranchModal').remove()" class="text-slate-400 hover:text-slate-200 text-lg">✕</button>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">1. Seleccionar Comercio Matriz *</label>
                        <select id="modalBranchBizSelect" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
                            <option value="">-- Selecciona un comercio (${businesses.length}) --</option>
                            ${businesses.map(b => `<option value="${b.id}" data-name="${b.name}" data-addr="${b.address}" data-lat="${b.lat}" data-lng="${b.lng}" data-img="${b.imageUrl}">${b.name}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">2. Nombre de la Sucursal *</label>
                        <input type="text" id="modalBranchName" placeholder="Ej: Sucursal Metrocentro / Plaza España" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-400 block mb-1">3. Dirección Completa *</label>
                        <input type="text" id="modalBranchAddress" placeholder="Ej: Centro Comercial Metrocentro, Módulo 24-B, Managua" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Latitud GPS</label>
                            <input type="number" id="modalBranchLat" step="any" value="12.1364" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Longitud GPS</label>
                            <input type="number" id="modalBranchLng" step="any" value="-86.2514" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Tiempo de Prep. (Min)</label>
                            <input type="number" id="modalBranchPrepTime" value="20" min="5" max="120" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-slate-400 block mb-1">Calificación Inicial</label>
                            <input type="number" id="modalBranchRating" value="4.8" step="0.1" min="1.0" max="5.0" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button type="button" onclick="document.getElementById('addBranchModal').remove()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition">Cancelar</button>
                    <button type="button" id="modalBranchSaveBtn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg transition flex items-center gap-1.5">
                        <span>🏢</span> Guardar Sucursal
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        const bizSelect = document.getElementById('modalBranchBizSelect');
        const nameInput = document.getElementById('modalBranchName');
        const addrInput = document.getElementById('modalBranchAddress');
        const latInput = document.getElementById('modalBranchLat');
        const lngInput = document.getElementById('modalBranchLng');
        const prepInput = document.getElementById('modalBranchPrepTime');
        const ratingInput = document.getElementById('modalBranchRating');
        const saveBtn = document.getElementById('modalBranchSaveBtn');

        bizSelect.addEventListener('change', () => {
            const opt = bizSelect.selectedOptions[0];
            if (!opt || !opt.value) return;
            if (opt.dataset.addr && !addrInput.value) addrInput.value = opt.dataset.addr;
            if (opt.dataset.lat) latInput.value = opt.dataset.lat;
            if (opt.dataset.lng) lngInput.value = opt.dataset.lng;
        });

        saveBtn.addEventListener('click', async () => {
            const opt = bizSelect.selectedOptions[0];
            if (!opt || !opt.value) {
                alert("Por favor selecciona un comercio matriz.");
                return;
            }
            const branchName = nameInput.value.trim();
            if (!branchName) {
                alert("Por favor ingresa el nombre de la sucursal.");
                return;
            }
            const address = addrInput.value.trim();
            if (!address) {
                alert("Por favor ingresa la dirección de la sucursal.");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = "Guardando...";

            const bizId = opt.value;
            const bizName = opt.dataset.name || "Comercio";
            const branchId = "br_" + Date.now();
            const lat = parseFloat(latInput.value) || 12.1364;
            const lng = parseFloat(lngInput.value) || -86.2514;
            const prepTime = parseInt(prepInput.value, 10) || 20;
            const rating = parseFloat(ratingInput.value) || 4.8;
            const imgUrl = opt.dataset.img || "";

            try {
                // GUARDADO CON active: true y businessId PARA CUMPLIR REQUISITOS ESTRICTOS DE ANDROID
                await db.collection('branches').doc(branchId).set({
                    id: branchId,
                    businessId: bizId,
                    businessName: bizName,
                    branchName: branchName,
                    address: address,
                    prepTimeMinutes: prepTime,
                    isOpen: true,
                    active: true,
                    rating: rating,
                    latitude: lat,
                    longitude: lng,
                    imageUrl: imgUrl,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                this.showLiveSyncFeedback();
                if (typeof showToast === 'function') showToast('✅ Sucursal registrada exitosamente', 'success');
                modalDiv.remove();
            } catch (e) {
                console.error("Error creating branch:", e);
                saveBtn.disabled = false;
                saveBtn.textContent = "🏢 Guardar Sucursal";
                alert(`Error al guardar sucursal: ${e.message}`);
            }
        });
    },

    deleteBranch: async function(id) {
        if (!confirm("¿Eliminar esta sucursal permanentemente?")) return;
        try {
            await db.collection('branches').doc(id).delete();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast('🗑️ Sucursal eliminada', 'info');
        } catch (e) {
            console.error("Error deleting branch:", e);
        }
    },

    // ─── Pestaña 6: Heat Map & Analítica BI ───────────────────────────────────

    loadAnalyticsBI: async function() {
        const container = document.getElementById('analyticsBITableContainer');
        if (!container) return;

        try {
            const snapshot = await db.collection('dashboardAnalytics').get();
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="p-8 bg-slate-950/60 rounded-xl text-center space-y-2 border border-slate-800">
                        <p class="text-xs text-slate-300 font-bold">Sin eventos de interacción registrados aún.</p>
                        <p class="text-[11px] text-slate-500 max-w-md mx-auto">A medida que los clientes abran banners, platillos estrella y comercios en la app móvil Android, las métricas de clics, impresiones y conversión aparecerán aquí en vivo.</p>
                    </div>
                `;
                return;
            }

            let totalViews = 0;
            let totalClicks = 0;
            let totalRevenue = 0.0;

            let html = `
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-950 text-indigo-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                                <th class="p-3">Elemento</th>
                                <th class="p-3">Tipo</th>
                                <th class="p-3 text-center">Vistas</th>
                                <th class="p-3 text-center">Clics</th>
                                <th class="p-3 text-center">CTR %</th>
                                <th class="p-3 text-right">Ingresos Atribuidos</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
            `;

            snapshot.docs.forEach(doc => {
                const d = doc.data();
                const views = d.views || 0;
                const clicks = d.clicks || 0;
                const revenue = d.revenue || 0.0;
                const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : (clicks > 0 ? "100.0" : "0.0");

                totalViews += views;
                totalClicks += clicks;
                totalRevenue += revenue;

                html += `
                    <tr class="hover:bg-slate-800/40 transition">
                        <td class="p-3 font-bold text-slate-100">${d.itemName || d.itemId || doc.id}</td>
                        <td class="p-3 text-slate-400 uppercase text-[10px] font-mono">${d.itemType || 'general'}</td>
                        <td class="p-3 text-center text-slate-300 font-mono">${views}</td>
                        <td class="p-3 text-center text-emerald-400 font-bold font-mono">${clicks}</td>
                        <td class="p-3 text-center text-amber-400 font-bold font-mono">${ctr}%</td>
                        <td class="p-3 text-right text-indigo-300 font-black font-mono">C$ ${revenue.toFixed(2)}</td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            container.innerHTML = html;

            // Actualizar tarjetas de KPI
            const viewsEl = document.getElementById('kpiTotalViews');
            if (viewsEl) viewsEl.textContent = totalViews.toLocaleString();

            const clicksEl = document.getElementById('kpiTotalClicks');
            if (clicksEl) clicksEl.textContent = totalClicks.toLocaleString();

            const avgCtrEl = document.getElementById('kpiAvgCtr');
            if (avgCtrEl) {
                const avg = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : (totalClicks > 0 ? "100.0" : "0.0");
                avgCtrEl.textContent = `${avg}%`;
            }

            const revEl = document.getElementById('kpiTotalRevenue');
            if (revEl) revEl.textContent = `C$ ${totalRevenue.toFixed(2)}`;

        } catch (e) {
            container.innerHTML = `<p class="text-xs text-rose-400">Error al cargar analítica BI: ${e.message}</p>`;
        }
    }
};
