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
                    <button onclick="window.dashboardManagerModule.switchSubTab('editorialAds')" id="dtab-btn-editorialAds" class="dtab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        📣 Anuncios del Home
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
                            <span class="text-[11px] text-slate-500 font-mono">16 Secciones Dinámicas</span>
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

                <!-- Sub-Pestaña: Anuncios Editoriales del Home (BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001) -->
                <div id="dsubtab-editorialAds" class="dsubtab-content space-y-6 hidden">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">📣</span>
                                <h3 class="text-sm font-black text-slate-100 uppercase tracking-wider">Publicidad & Anuncios Editoriales del Home</h3>
                                <span class="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                                    /home_editorial_ads
                                </span>
                            </div>
                            <p class="text-xs text-slate-400">Superficie de anuncios patrocinados, captación de aliados y promociones con carrusel interactivo en el feed principal del cliente.</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                                <span class="text-slate-400">Total:</span>
                                <span id="editorialAdsCount" class="font-bold text-indigo-400">0</span>
                                <span class="text-slate-600">|</span>
                                <span class="text-emerald-400 font-bold" id="editorialAdsActiveCount">0 Activos</span>
                            </div>
                            <button onclick="window.dashboardManagerModule.openEditorialAdModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg">
                                <span>+</span> Crear Anuncio Editorial
                            </button>
                        </div>
                    </div>

                    <!-- Aviso de Aislamiento Arquitectónico -->
                    <div class="bg-indigo-950/30 border border-indigo-800/40 p-4 rounded-xl flex items-start gap-3">
                        <span class="text-lg text-indigo-400">ℹ️</span>
                        <div class="text-xs text-indigo-200/90 space-y-1">
                            <p class="font-bold">Aislamiento de Superficie Publicitaria</p>
                            <p class="text-slate-400">Los <strong>Banners Superiores</strong> (<code class="text-indigo-300">/banners</code>) continúan operando como el carrusel de cabecera independiente. Esta sección administra la colección <code class="text-indigo-300">/home_editorial_ads</code>, la cual se renderiza dentro del feed según la posición asignada al bloque <strong>EDITORIAL_ADS</strong> en la pestaña <em>"🔀 Orden de Bloques"</em>.</p>
                        </div>
                    </div>

                    <!-- Contenedor de Anuncios -->
                    <div id="editorialAdsContainer" class="space-y-3">
                        <p class="text-xs text-slate-500">Cargando anuncios editoriales...</p>
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
        this.initEditorialAdsListener();
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
        { key: 'showBanners', sectionId: 'BANNERS', label: 'Banners Promocionales Superiores', icon: '🖼️', desc: 'Carrusel superior con anuncios de comercios y ofertas.' },
        { key: 'showCategories', sectionId: 'CATEGORIES', label: 'Categorías (PedidosYa Style)', icon: '🏷️', desc: 'Barra horizontal de filtros por categorías comerciales.' },
        { key: 'showBranchesBlock', sectionId: 'BRANCHES', label: 'Bloque de Sucursales por Comercio 🏢', icon: '🏢', desc: 'Carrusel de sedes específicas para comercios multicentrales.' },
        { key: 'showNearbyBusinesses', sectionId: 'NEARBY', label: 'Comercios Cerca de Ti (Geolocalización) 📍', icon: '📍', desc: 'Descubrimiento geoespacial con radio dinámico expandible.' },
        { key: 'showFeaturedProducts', sectionId: 'FEATURED_PRODUCTS', label: 'Productos Estrella ⭐', icon: '🍔', desc: 'Platillos destacados fijados para compra directa.' },
        { key: 'showFeaturedBusinesses', sectionId: 'FEATURED_BUSINESSES', label: 'Comercios Destacados ⭐', icon: '🏪', desc: 'Comercios marcados como favoritos de la plataforma.' },
        { key: 'showFlashDeals', sectionId: 'FLASH_DEALS', label: 'Ofertas Flash ⚡', icon: '⏱️', desc: 'Sección de compras de oportunidad con cuenta regresiva.' },
        { key: 'showPromotions', sectionId: 'PROMOTIONS', label: 'Productos con Descuentos 🏷️', icon: '💰', desc: 'Sección de catálogo con rebajas porcentuales activas.' },
        { key: 'showSamePrice', sectionId: 'SAME_PRICE', label: 'Mismo Precio que en Local 🏷️', icon: '💵', desc: 'Comercios garantizados sin sobreprecio de menú.' },
        { key: 'showTopSelling', sectionId: 'TOP_SELLING', label: 'Los Más Vendidos 🔥', icon: '📈', desc: 'Comercios y productos con mayor volumen de pedidos.' },
        { key: 'showRecommended', sectionId: 'RECOMMENDED', label: 'Recomendados para ti 🎯', icon: '❤️', desc: 'Sugerencias personalizadas según hábitos del cliente.' },
        { key: 'showNewBusinesses', sectionId: 'NEW_BUSINESSES', label: 'Comercios Nuevos 🟢', icon: '🆕', desc: 'Nuevos restaurantes y tiendas integrados al marketplace.' },
        { key: 'showQuickReorder', sectionId: 'QUICK_REORDER', label: 'Volver a Pedir 🔄', icon: '🛍️', desc: 'Acceso directo para repetir pedidos anteriores.' },
        { key: 'showFavoritesBlock', sectionId: 'FAVORITES', label: 'Tus Comercios Favoritos ❤️', icon: '⭐', desc: 'Comercios guardados en favoritos por el cliente.' },
        { key: 'showExpressDeliveryBanner', sectionId: 'EXPRESS_DELIVERY', label: 'Servicio Encomiendas X→Y (Banner)', icon: '🛵', desc: 'Banner de acceso directo al servicio de envíos express punto a punto.' },
        { key: 'showEditorialAds', sectionId: 'EDITORIAL_ADS', label: 'Publicidad / Anuncios del Home 📣', icon: '📣', desc: 'Carrusel editorial de promociones y anuncios en el feed principal.' },
        { key: 'xToYServiceEnabled', sectionId: null, label: 'Servicio Encomiendas X→Y (Habilitación Operativa)', icon: '🚚', desc: 'Control maestro de acceso y disponibilidad operativa al servicio de encomiendas X→Y.' }
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
        { id: 'EXPRESS_DELIVERY', name: 'Servicio Encomiendas X→Y (Express Delivery)', icon: '🛵' },
        { id: 'EDITORIAL_ADS', name: 'Publicidad / Anuncios del Home', icon: '📣' }
    ],

    currentSectionOrder: [],
    currentBlockTitles: {},
    currentBlockActions: {},

    initGeneralConfigListener: function() {
        const unsub = db.collection('dashboard').doc('configuration').onSnapshot(doc => {
            const data = doc.exists ? doc.data() : {};
            this.currentBlockTitles = data.blockTitles || {};
            this.currentBlockActions = data.blockActions || {};
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

        const blockTitles = data.blockTitles || {};
        const blockActions = data.blockActions || {};

        container.innerHTML = this.allToggles.map(t => {
            // Fail-closed safe defaults para X→Y (P0-02, P0-03): false si no está presente
            const isChecked = (t.key === 'showExpressDeliveryBanner' || t.key === 'xToYServiceEnabled')
                ? (data[t.key] === true)
                : (data[t.key] !== false);

            const hasSectionId = !!t.sectionId;
            const customTitle = hasSectionId ? blockTitles[t.sectionId] : null;
            const actionConfig = hasSectionId ? blockActions[t.sectionId] : null;
            const hasCustomAction = actionConfig && actionConfig.actionType && actionConfig.actionType !== 'NONE';

            return `
                <div class="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3 hover:border-slate-700 transition">
                    <div class="flex items-start justify-between gap-3 min-w-0">
                        <div class="flex items-start gap-3 min-w-0">
                            <span class="text-xl p-1 bg-slate-900 rounded-lg border border-slate-800 shrink-0">${t.icon}</span>
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

                    ${hasSectionId ? `
                        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px]">
                            <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                ${customTitle ? `
                                    <span class="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono truncate max-w-[130px]" title="Título personalizado: ${customTitle}">
                                        ✏️ "${customTitle}"
                                    </span>
                                ` : `
                                    <span class="text-slate-500 italic truncate">Título default</span>
                                `}
                                ${hasCustomAction ? `
                                    <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] uppercase tracking-wider shrink-0" title="Acción de Encabezado: ${actionConfig.actionType}">
                                        🔗 CTA: ${actionConfig.actionType}
                                    </span>
                                ` : ''}
                            </div>
                            <div class="flex items-center gap-1 shrink-0">
                                <button type="button" onclick="window.dashboardManagerModule.openEditBlockTitleModal('${t.sectionId}', '${t.label.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition flex items-center gap-1" title="Personalizar título del bloque en la app móvil">
                                    <span>✏️</span> Título
                                </button>
                                <button type="button" onclick="window.dashboardManagerModule.openEditBlockActionModal('${t.sectionId}', '${t.label.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition flex items-center gap-1" title="Configurar acción del encabezado/CTA">
                                    <span>🔗</span> Acción
                                </button>
                            </div>
                        </div>
                    ` : ''}
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

        container.innerHTML = items.map((item, idx) => {
            const customTitle = this.currentBlockTitles[item.id];
            const actionConfig = this.currentBlockActions[item.id];
            const hasCustomAction = actionConfig && actionConfig.actionType && actionConfig.actionType !== 'NONE';

            return `
                <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold flex items-center justify-center text-indigo-400 shrink-0">
                            ${idx + 1}
                        </span>
                        <span class="text-base shrink-0">${item.icon}</span>
                        <div class="min-w-0">
                            <span class="text-xs font-bold text-slate-200 block truncate">${item.name}</span>
                            ${customTitle ? `<span class="text-[10px] text-indigo-400 font-mono truncate block">✏️ "${customTitle}"</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" onclick="window.dashboardManagerModule.openEditBlockTitleModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')" class="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition" title="Editar título del bloque">
                            ✏️
                        </button>
                        <button type="button" onclick="window.dashboardManagerModule.openEditBlockActionModal('${item.id}', '${item.name.replace(/'/g, "\\'")}')" class="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold transition" title="Configurar acción de encabezado">
                            🔗
                        </button>
                        <button onclick="window.dashboardManagerModule.moveSection(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-lg text-xs font-bold transition" title="Mover arriba">
                            ▲
                        </button>
                        <button onclick="window.dashboardManagerModule.moveSection(${idx}, 1)" ${idx === items.length - 1 ? 'disabled' : ''} class="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-lg text-xs font-bold transition" title="Mover abajo">
                            ▼
                        </button>
                    </div>
                </div>
            `;
        }).join('');
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

    // ─── Modales: Títulos Dinámicos y Acciones de Encabezado (blockTitles & blockActions) ──

    openEditBlockTitleModal: function(blockId, blockLabel) {
        const oldModal = document.getElementById('blockTitleModal');
        if (oldModal) oldModal.remove();

        const currentTitle = this.currentBlockTitles[blockId] || '';

        const modalDiv = document.createElement('div');
        modalDiv.id = 'blockTitleModal';
        modalDiv.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>✏️</span> Título Dinámico de Bloque
                    </h3>
                    <button onclick="document.getElementById('blockTitleModal').remove()" class="text-slate-400 hover:text-slate-200 text-lg">✕</button>
                </div>

                <div class="space-y-3">
                    <div class="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span class="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Identificador de Bloque</span>
                        <p class="text-xs font-bold text-slate-200">${blockId}</p>
                        <p class="text-[11px] text-slate-400">${blockLabel}</p>
                    </div>

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-300 block">Título Personalizado en la App Móvil</label>
                        <input type="text" id="modalBlockTitleInput" value="${currentTitle.replace(/"/g, '&quot;')}" placeholder="${blockLabel}" maxlength="60" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        <p class="text-[10px] text-slate-400">Deja este campo vacío para restaurar el título predeterminado del sistema.</p>
                    </div>

                    <div class="bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-xl flex items-start gap-2">
                        <span class="text-sm text-indigo-400">⚡</span>
                        <p class="text-[11px] text-indigo-300">Este cambio se persiste en <code class="font-mono text-indigo-200">/dashboard/configuration.blockTitles.${blockId}</code> y se transmite en tiempo real a los clientes conectados.</p>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button type="button" onclick="document.getElementById('blockTitleModal').remove()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition">Cancelar</button>
                    <button type="button" onclick="window.dashboardManagerModule.saveBlockTitle('${blockId}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg transition flex items-center gap-1.5">
                        <span>💾</span> Guardar Título
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    },

    saveBlockTitle: async function(blockId) {
        const input = document.getElementById('modalBlockTitleInput');
        if (!input) return;
        const newTitle = input.value.trim();

        try {
            const updatePayload = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (newTitle) {
                updatePayload[`blockTitles.${blockId}`] = newTitle;
            } else {
                updatePayload[`blockTitles.${blockId}`] = firebase.firestore.FieldValue.delete();
            }

            await db.collection('dashboard').doc('configuration').update(updatePayload);
            document.getElementById('blockTitleModal')?.remove();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') {
                showToast(`✅ Título de ${blockId} actualizado`, 'success');
            }
        } catch (e) {
            console.error("Error saving block title:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
        }
    },

    openEditBlockActionModal: async function(blockId, blockLabel) {
        const oldModal = document.getElementById('blockActionModal');
        if (oldModal) oldModal.remove();

        const currentAction = this.currentBlockActions[blockId] || { actionType: 'NONE', label: 'Ver todos' };

        // Cargar comercios y categorías para los selectores dinámicos
        let businesses = [];
        let categories = [];
        try {
            const [bizSnap, catSnap] = await Promise.all([
                db.collection('businesses').get(),
                db.collection('categories').get()
            ]);
            businesses = bizSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().nombre || d.id }));
            categories = catSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().nombre || d.id }));
        } catch (err) {
            console.warn("Could not pre-load businesses/categories for block action modal:", err);
        }

        const modalDiv = document.createElement('div');
        modalDiv.id = 'blockActionModal';
        modalDiv.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>🔗</span> Acción de Encabezado / CTA del Bloque
                    </h3>
                    <button onclick="document.getElementById('blockActionModal').remove()" class="text-slate-400 hover:text-slate-200 text-lg">✕</button>
                </div>

                <!-- ALERTA DE SEMÁNTICA DEL ENCABEZADO -->
                <div class="bg-amber-950/40 border border-amber-800/40 p-3 rounded-xl flex items-start gap-2.5">
                    <span class="text-base text-amber-400 shrink-0">⚠️</span>
                    <div class="text-[11px] text-amber-200/90 space-y-0.5">
                        <p class="font-bold">Acción Exclusiva del Encabezado (Header CTA)</p>
                        <p class="text-slate-400">Esta acción aplica <strong>únicamente al botón de acción del encabezado</strong> (ej: "Ver todos", "Conocer más"). <strong>NO</strong> convierte la superficie del bloque en un enlace ni altera la navegación propia de sus tarjetas o productos internos.</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-1">
                        <span class="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Bloque</span>
                        <p class="text-xs font-bold text-slate-200">${blockId} — ${blockLabel}</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 block">Texto del Botón CTA</label>
                            <input type="text" id="modalActionLabel" value="${(currentAction.label || 'Ver todos').replace(/"/g, '&quot;')}" placeholder="Ver todos" maxlength="30" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 block">Tipo de Acción (actionType)</label>
                            <select id="modalActionType" onchange="window.dashboardManagerModule.handleActionTypeChange(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                                <option value="NONE" ${currentAction.actionType === 'NONE' ? 'selected' : ''}>NONE — Sin acción (Ocultar CTA)</option>
                                <option value="CATEGORY" ${currentAction.actionType === 'CATEGORY' ? 'selected' : ''}>CATEGORY — Abrir Categoría Comercial</option>
                                <option value="MERCHANT" ${currentAction.actionType === 'MERCHANT' ? 'selected' : ''}>MERCHANT — Abrir Comercio Específico</option>
                                <option value="INTERNAL_ROUTE" ${currentAction.actionType === 'INTERNAL_ROUTE' ? 'selected' : ''}>INTERNAL_ROUTE — Ruta Interna de la App</option>
                                <option value="EXTERNAL_URL" ${currentAction.actionType === 'EXTERNAL_URL' ? 'selected' : ''}>EXTERNAL_URL — Enlace Web Seguro (HTTPS)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Contenedor dinámico según tipo de acción -->
                    <div id="modalActionDynamicContainer" class="space-y-3 pt-1">
                        <!-- Inyectado por handleActionTypeChange -->
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button type="button" onclick="document.getElementById('blockActionModal').remove()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition">Cancelar</button>
                    <button type="button" onclick="window.dashboardManagerModule.saveBlockAction('${blockId}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg transition flex items-center gap-1.5">
                        <span>💾</span> Guardar Acción de Encabezado
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        this._tempBusinesses = businesses;
        this._tempCategories = categories;
        this.handleActionTypeChange(currentAction.actionType || 'NONE', currentAction);
    },

    handleActionTypeChange: function(actionType, currentAction = {}) {
        const container = document.getElementById('modalActionDynamicContainer');
        if (!container) return;

        if (actionType === 'NONE') {
            container.innerHTML = `
                <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
                    El encabezado no mostrará ningún botón o enlace tipo "Ver todos". El usuario sólo interactuará directamente con el contenido interno del bloque.
                </div>
            `;
        } else if (actionType === 'CATEGORY') {
            const categories = this._tempCategories || [];
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">Seleccionar Categoría Destino</label>
                    <select id="modalActionTargetId" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        <option value="">-- Selecciona una categoría --</option>
                        ${categories.map(c => `<option value="${c.id}" ${c.id === currentAction.targetId ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (actionType === 'MERCHANT') {
            const businesses = this._tempBusinesses || [];
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">Seleccionar Comercio Destino</label>
                    <select id="modalActionTargetId" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        <option value="">-- Selecciona un comercio --</option>
                        ${businesses.map(b => `<option value="${b.id}" ${b.id === currentAction.targetId ? 'selected' : ''}>${b.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (actionType === 'INTERNAL_ROUTE') {
            const routes = [
                { path: '/categories', label: 'Catálogo de Categorías (/categories)' },
                { path: '/express_delivery', label: 'Servicio Encomiendas X→Y (/express_delivery)' },
                { path: '/deals', label: 'Ofertas Flash y Promociones (/deals)' },
                { path: '/branches', label: 'Sucursales de Comercios (/branches)' },
                { path: '/orders', label: 'Historial de Pedidos (/orders)' },
                { path: '/favorites', label: 'Comercios Favoritos (/favorites)' }
            ];
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">Seleccionar Ruta de Navegación Interna</label>
                    <select id="modalActionTargetRoute" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        ${routes.map(r => `<option value="${r.path}" ${r.path === currentAction.targetRoute ? 'selected' : ''}>${r.label}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (actionType === 'EXTERNAL_URL') {
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">URL Externa Segura (Requiere HTTPS obligatorio)</label>
                    <input type="url" id="modalActionTargetUrl" value="${(currentAction.targetUrl || '').replace(/"/g, '&quot;')}" placeholder="https://ejemplo.com/campana" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
                    <p class="text-[10px] text-slate-400">Por seguridad de la plataforma y de la aplicación móvil, toda URL debe iniciar estrictamente con <code class="text-emerald-400 font-bold font-mono">https://</code>.</p>
                </div>
            `;
        }
    },

    saveBlockAction: async function(blockId) {
        const actionType = document.getElementById('modalActionType')?.value || 'NONE';
        const label = document.getElementById('modalActionLabel')?.value?.trim() || 'Ver todos';

        const actionPayload = {
            actionType: actionType,
            label: label
        };

        if (actionType === 'CATEGORY' || actionType === 'MERCHANT') {
            const targetId = document.getElementById('modalActionTargetId')?.value;
            if (!targetId) {
                if (typeof showToast === 'function') showToast('❌ Selecciona el elemento de destino', 'error');
                else alert('Selecciona el elemento de destino');
                return;
            }
            actionPayload.targetId = targetId;
        } else if (actionType === 'INTERNAL_ROUTE') {
            const targetRoute = document.getElementById('modalActionTargetRoute')?.value;
            if (!targetRoute) {
                if (typeof showToast === 'function') showToast('❌ Selecciona la ruta interna', 'error');
                else alert('Selecciona la ruta interna');
                return;
            }
            actionPayload.targetRoute = targetRoute;
        } else if (actionType === 'EXTERNAL_URL') {
            const targetUrl = document.getElementById('modalActionTargetUrl')?.value?.trim();
            if (!targetUrl || !targetUrl.startsWith('https://')) {
                if (typeof showToast === 'function') showToast('❌ La URL externa debe comenzar obligatoriamente con https://', 'error');
                else alert('La URL externa debe comenzar obligatoriamente con https://');
                return;
            }
            actionPayload.targetUrl = targetUrl;
        }

        try {
            const updatePayload = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (actionType === 'NONE') {
                updatePayload[`blockActions.${blockId}`] = firebase.firestore.FieldValue.delete();
            } else {
                updatePayload[`blockActions.${blockId}`] = actionPayload;
            }

            await db.collection('dashboard').doc('configuration').update(updatePayload);
            document.getElementById('blockActionModal')?.remove();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') {
                showToast(`✅ Acción de encabezado para ${blockId} guardada`, 'success');
            }
        } catch (e) {
            console.error("Error saving block action:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
        }
    },

    // ─── Submódulo: Publicidad / Anuncios Editoriales del Home (/home_editorial_ads) ──

    editorialAdsList: [],

    initEditorialAdsListener: function() {
        const unsub = db.collection('home_editorial_ads').onSnapshot(snapshot => {
            const container = document.getElementById('editorialAdsContainer');
            const totalCountEl = document.getElementById('editorialAdsCount');
            const activeCountEl = document.getElementById('editorialAdsActiveCount');

            if (!container) return;

            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar por 'order' ascendente
            docs.sort((a, b) => (a.order || 0) - (b.order || 0));

            this.editorialAdsList = docs;

            if (totalCountEl) totalCountEl.textContent = docs.length;
            if (activeCountEl) {
                const activeCount = docs.filter(d => d.isActive !== false).length;
                activeCountEl.textContent = `${activeCount} Activos`;
            }

            if (docs.length === 0) {
                container.innerHTML = `
                    <div class="bg-slate-950/60 border border-slate-800 p-8 rounded-2xl text-center space-y-2">
                        <span class="text-3xl">📣</span>
                        <p class="text-xs text-slate-300 font-bold">No hay anuncios editoriales registrados actualmente.</p>
                        <p class="text-[11px] text-slate-500 max-w-md mx-auto">Haz clic en <strong>"+ Crear Anuncio Editorial"</strong> para programar campañas comerciales, eventos o promociones en el carrusel del home.</p>
                    </div>
                `;
                return;
            }

            const now = new Date();

            container.innerHTML = docs.map((ad, idx) => {
                const isActive = ad.isActive !== false;
                
                // Evaluar programación de fechas
                let scheduleBadge = '';
                if (ad.startAt) {
                    const startDate = ad.startAt.toDate ? ad.startAt.toDate() : new Date(ad.startAt);
                    if (now < startDate) {
                        scheduleBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">PROGRAMADO</span>`;
                    }
                }
                if (ad.endAt) {
                    const endDate = ad.endAt.toDate ? ad.endAt.toDate() : new Date(ad.endAt);
                    if (now > endDate) {
                        scheduleBadge = `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">EXPIRADO</span>`;
                    }
                }

                const safeImg = ad.imageUrl || '/assets/promo-placeholder.svg';
                const badgeText = ad.badge || '';
                const ctaText = ad.ctaText || 'Ver más';
                const typeLabel = window.dashboardManagerModule.formatCampaignType(ad.type);
                const actionLabel = window.dashboardManagerModule.formatActionType(ad);

                return `
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition shadow-sm">
                        <div class="flex items-center gap-4 min-w-0 flex-1">
                            <!-- Indicador de Orden y Reordenamiento ▲/▼ -->
                            <div class="flex flex-col items-center justify-center gap-1 shrink-0">
                                <button onclick="window.dashboardManagerModule.moveEditorialAd('${ad.id}', -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded text-[10px] font-bold transition" title="Mover arriba">
                                    ▲
                                </button>
                                <span class="w-6 h-6 rounded-full bg-slate-950 border border-slate-700 text-[11px] font-mono font-bold flex items-center justify-center text-indigo-400">
                                    ${ad.order ?? (idx + 1)}
                                </span>
                                <button onclick="window.dashboardManagerModule.moveEditorialAd('${ad.id}', 1)" ${idx === docs.length - 1 ? 'disabled' : ''} class="p-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded text-[10px] font-bold transition" title="Mover abajo">
                                    ▼
                                </button>
                            </div>

                            <!-- Miniatura -->
                            <div class="relative w-24 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                                <img src="${safeImg}" alt="Ad" class="w-full h-full object-cover" onError="handleImageError(this, 'promo')">
                                ${badgeText ? `<span class="absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.2 bg-indigo-600/90 text-white rounded">${badgeText}</span>` : ''}
                            </div>

                            <!-- Info Principal -->
                            <div class="space-y-1 min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-1.5">
                                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">
                                        ${isActive ? 'ACTIVO' : 'PAUSADO'}
                                    </span>
                                    ${scheduleBadge}
                                    <span class="text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                        ${typeLabel}
                                    </span>
                                </div>
                                <h4 class="text-xs font-black text-slate-100 truncate">${ad.title || 'Sin título'}</h4>
                                <p class="text-[11px] text-slate-400 line-clamp-1">${ad.subtitle || 'Sin subtítulo'}</p>
                                <div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                                    <span class="text-indigo-400 font-semibold">${actionLabel}</span>
                                    <span class="text-slate-600">•</span>
                                    <span>CTA: <strong class="text-slate-300">${ctaText}</strong></span>
                                    ${ad.merchantName ? `<span class="text-slate-600">•</span><span class="text-emerald-400 font-semibold">🏪 ${ad.merchantName}</span>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Botones de Acción -->
                        <div class="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                            <button onclick="window.dashboardManagerModule.toggleEditorialAdStatus('${ad.id}', ${!isActive})" class="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${isActive ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 hover:bg-amber-900/60' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60'}" title="${isActive ? 'Pausar anuncio' : 'Activar anuncio'}">
                                ${isActive ? '⏸️' : '▶️'}
                            </button>
                            <button onclick="window.dashboardManagerModule.openEditorialAdModal('${ad.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1" title="Editar anuncio">
                                ✏️ Editar
                            </button>
                            <button onclick="window.dashboardManagerModule.duplicateEditorialAd('${ad.id}')" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1" title="Duplicar anuncio">
                                📋 Duplicar
                            </button>
                            <button onclick="window.dashboardManagerModule.deleteEditorialAd('${ad.id}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold transition" title="Eliminar anuncio">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }, err => {
            console.error("Error listening to home_editorial_ads:", err);
            const container = document.getElementById('editorialAdsContainer');
            if (container) container.innerHTML = `<p class="text-xs text-rose-400">Error al cargar anuncios editoriales: ${err.message}</p>`;
        });
        this._unsubs.push(unsub);
    },

    formatCampaignType: function(type) {
        const types = {
            'MERCHANT_PROMOTION': '🏪 Promo Comercio',
            'PRODUCT_PROMOTION': '🍔 Promo Producto',
            'MERCHANT_ACQUISITION': '🤝 Afiliación Comercios',
            'COURIER_RECRUITMENT': '🛵 Únete como Repartidor',
            'PLATFORM_CAMPAIGN': '🛡️ Institucional BlueSystem',
            'EVENT': '🎉 Evento Especial',
            'SERVICE_PROMOTION': '🚚 Envíos Express X→Y',
            'GENERIC_EDITORIAL': '📢 Editorial General'
        };
        return types[type] || type || 'General';
    },

    formatActionType: function(ad) {
        if (!ad.actionType || ad.actionType === 'NONE') return '🔘 Sin Clic';
        if (ad.actionType === 'MERCHANT') return `🏪 Comercio (${ad.merchantName || ad.targetId || 'ID'})`;
        if (ad.actionType === 'PRODUCT') return `🍔 Producto (${ad.productName || ad.targetId || 'ID'})`;
        if (ad.actionType === 'INTERNAL_ROUTE') return `🧭 Ruta (${ad.targetRoute || '/'})`;
        if (ad.actionType === 'EXTERNAL_URL') return `🌐 Enlace Externo`;
        return ad.actionType;
    },

    moveEditorialAd: async function(id, delta) {
        const list = this.editorialAdsList || [];
        const index = list.findIndex(a => a.id === id);
        if (index === -1) return;
        const targetIndex = index + delta;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const currentAd = list[index];
        const targetAd = list[targetIndex];

        const currentOrder = currentAd.order ?? index;
        const targetOrder = targetAd.order ?? targetIndex;

        const newCurrentOrder = (currentOrder === targetOrder) ? (delta > 0 ? targetOrder + 1 : targetOrder - 1) : targetOrder;
        const newTargetOrder = currentOrder;

        try {
            const batch = db.batch();
            batch.update(db.collection('home_editorial_ads').doc(currentAd.id), {
                order: newCurrentOrder,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            batch.update(db.collection('home_editorial_ads').doc(targetAd.id), {
                order: newTargetOrder,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await batch.commit();
            this.showLiveSyncFeedback();
        } catch (e) {
            console.error("Error reordering editorial ads:", e);
            if (typeof showToast === 'function') showToast(`❌ Error al reordenar: ${e.message}`, 'error');
        }
    },

    toggleEditorialAdStatus: async function(id, newStatus) {
        try {
            await db.collection('home_editorial_ads').doc(id).update({
                isActive: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') {
                showToast(`📣 Anuncio editorial ${newStatus ? 'activado' : 'pausado'}`, 'success');
            }
        } catch (e) {
            console.error("Error updating editorial ad status:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
        }
    },

    duplicateEditorialAd: async function(id) {
        try {
            const doc = await db.collection('home_editorial_ads').doc(id).get();
            if (!doc.exists) {
                if (typeof showToast === 'function') showToast('❌ Anuncio no encontrado', 'error');
                return;
            }
            const data = doc.data();
            const maxOrder = (this.editorialAdsList || []).reduce((max, a) => Math.max(max, a.order || 0), 0);
            
            const newAd = {
                ...data,
                title: `${data.title || 'Anuncio'} (Copia)`,
                order: maxOrder + 1,
                isActive: false, // Inicia pausado para revisión del admin
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            delete newAd.id;

            await db.collection('home_editorial_ads').add(newAd);
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast('📋 Anuncio duplicado con éxito (pausado)', 'success');
        } catch (e) {
            console.error("Error duplicating editorial ad:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
        }
    },

    deleteEditorialAd: async function(id) {
        if (!confirm("¿Eliminar definitivamente este anuncio editorial del feed?")) return;
        try {
            await db.collection('home_editorial_ads').doc(id).delete();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') showToast('🗑️ Anuncio editorial eliminado', 'info');
        } catch (e) {
            console.error("Error deleting editorial ad:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
        }
    },

    openEditorialAdModal: async function(adDataOrId = null) {
        const oldModal = document.getElementById('editorialAdModal');
        if (oldModal) oldModal.remove();

        let ad = null;
        if (typeof adDataOrId === 'string') {
            const found = (this.editorialAdsList || []).find(a => a.id === adDataOrId);
            if (found) {
                ad = found;
            } else {
                try {
                    const snap = await db.collection('home_editorial_ads').doc(adDataOrId).get();
                    if (snap.exists) ad = { id: snap.id, ...snap.data() };
                } catch (e) {
                    console.error("Error fetching ad doc:", e);
                }
            }
        } else if (adDataOrId && typeof adDataOrId === 'object') {
            ad = adDataOrId;
        }

        const isEdit = !!ad;
        const defaultOrder = (this.editorialAdsList || []).reduce((max, a) => Math.max(max, a.order || 0), 0) + 1;

        // Cargar comercios y productos
        let businesses = [];
        let products = [];
        try {
            const [bizSnap, prodSnap] = await Promise.all([
                db.collection('businesses').get(),
                db.collection('products').get()
            ]);
            businesses = bizSnap.docs.map(d => ({
                id: d.id,
                name: d.data().name || d.data().nombre || 'Comercio',
                logoUrl: d.data().logoUrl || d.data().photoUrl || d.data().image || '',
                ...d.data()
            }));
            products = prodSnap.docs.map(d => ({
                id: d.id,
                name: d.data().name || d.data().nombre || 'Producto',
                businessId: d.data().businessId || d.data().restaurantId || '',
                price: d.data().price || d.data().precio || 0,
                imageUrl: d.data().imageUrl || d.data().imagenUrl || ''
            }));
        } catch (e) {
            console.warn("Could not pre-load businesses/products for ad modal:", e);
        }

        const formatIsoForInput = (timestampOrIso) => {
            if (!timestampOrIso) return '';
            try {
                const date = timestampOrIso.toDate ? timestampOrIso.toDate() : new Date(timestampOrIso);
                if (isNaN(date.getTime())) return '';
                const tzOffset = date.getTimezoneOffset() * 60000;
                return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
            } catch (err) {
                return '';
            }
        };

        const modalDiv = document.createElement('div');
        modalDiv.id = 'editorialAdModal';
        modalDiv.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150">
                <!-- Modal Header -->
                <div class="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">📣</span>
                        <div>
                            <h3 class="text-sm font-black text-slate-100 uppercase tracking-wider">
                                ${isEdit ? 'Editar Anuncio Editorial' : 'Nuevo Anuncio Editorial'}
                            </h3>
                            <p class="text-[11px] text-slate-400">Superficie interactiva /home_editorial_ads para el feed del cliente.</p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('editorialAdModal').remove()" class="text-slate-400 hover:text-slate-200 text-lg">✕</button>
                </div>

                <!-- Modal Body: 2 Columns (Form on left, Mobile Simulator on right) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto max-h-[75vh]">
                    <!-- Left Column: Form (7 cols) -->
                    <div class="lg:col-span-7 space-y-4">
                        <!-- Título y Subtítulo -->
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 block">Título Principal del Anuncio <span class="text-rose-400">*</span></label>
                            <input type="text" id="modalAdTitle" value="${(ad?.title || '').replace(/"/g, '&quot;')}" placeholder="Ej: ¡2x1 en Todas las Hamburguesas!" maxlength="60" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-bold text-slate-300 block">Subtítulo Descriptivo</label>
                            <input type="text" id="modalAdSubtitle" value="${(ad?.subtitle || '').replace(/"/g, '&quot;')}" placeholder="Ej: Válido sólo por hoy viernes con entrega express." maxlength="100" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        </div>

                        <!-- Badge y CTA -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Badge / Etiqueta Visual</label>
                                <input type="text" id="modalAdBadge" value="${(ad?.badge || '').replace(/"/g, '&quot;')}" placeholder="Ej: 🔥 OFERTA, ⭐ EXCLUSIVO" maxlength="25" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Texto del Botón CTA</label>
                                <input type="text" id="modalAdCtaText" value="${(ad?.ctaText || 'Ver más').replace(/"/g, '&quot;')}" placeholder="Ver más" maxlength="25" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                            </div>
                        </div>

                        <!-- Tipo de Campaña y Acción -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Tipo de Campaña</label>
                                <select id="modalAdType" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                                    <option value="MERCHANT_PROMOTION" ${ad?.type === 'MERCHANT_PROMOTION' ? 'selected' : ''}>🏪 Promo de Comercio</option>
                                    <option value="PRODUCT_PROMOTION" ${ad?.type === 'PRODUCT_PROMOTION' ? 'selected' : ''}>🍔 Promo de Producto</option>
                                    <option value="MERCHANT_ACQUISITION" ${ad?.type === 'MERCHANT_ACQUISITION' ? 'selected' : ''}>🤝 Afiliación Comercios</option>
                                    <option value="COURIER_RECRUITMENT" ${ad?.type === 'COURIER_RECRUITMENT' ? 'selected' : ''}>🛵 Únete como Motorizado</option>
                                    <option value="PLATFORM_CAMPAIGN" ${ad?.type === 'PLATFORM_CAMPAIGN' ? 'selected' : ''}>🛡️ Campaña Institucional</option>
                                    <option value="EVENT" ${ad?.type === 'EVENT' ? 'selected' : ''}>🎉 Evento Especial</option>
                                    <option value="SERVICE_PROMOTION" ${ad?.type === 'SERVICE_PROMOTION' ? 'selected' : ''}>🚚 Envíos Express X→Y</option>
                                    <option value="GENERIC_EDITORIAL" ${ad?.type === 'GENERIC_EDITORIAL' ? 'selected' : ''}>📢 Editorial General</option>
                                </select>
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Acción al Hacer Clic (actionType)</label>
                                <select id="modalAdActionType" onchange="window.dashboardManagerModule.handleAdActionTypeChange(this.value)" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                                    <option value="NONE" ${ad?.actionType === 'NONE' ? 'selected' : ''}>NONE — Solo Informativo (Sin Clic)</option>
                                    <option value="MERCHANT" ${ad?.actionType === 'MERCHANT' ? 'selected' : ''}>MERCHANT — Abrir Comercio</option>
                                    <option value="PRODUCT" ${ad?.actionType === 'PRODUCT' ? 'selected' : ''}>PRODUCT — Abrir Producto Directo</option>
                                    <option value="INTERNAL_ROUTE" ${ad?.actionType === 'INTERNAL_ROUTE' ? 'selected' : ''}>INTERNAL_ROUTE — Ruta Interna</option>
                                    <option value="EXTERNAL_URL" ${ad?.actionType === 'EXTERNAL_URL' ? 'selected' : ''}>EXTERNAL_URL — Enlace Web (HTTPS)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Selector Dinámico de Destino según actionType -->
                        <div id="modalAdDynamicTargetContainer" class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                            <!-- Inyectado por handleAdActionTypeChange -->
                        </div>

                        <!-- Creativo Visual (Imagen / Storage) -->
                        <div class="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                            <label class="text-xs font-bold text-slate-300 block">Creativo Visual (Imagen del Anuncio) <span class="text-rose-400">*</span></label>
                            
                            <div class="flex items-center gap-2">
                                <input type="file" id="modalAdFile" accept="image/jpeg,image/png,image/webp" class="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer">
                                <span id="modalAdUploadStatus" class="hidden text-[11px] text-amber-300 font-mono">⏳ Subiendo...</span>
                            </div>

                            <div class="space-y-1 pt-1">
                                <label class="text-[10px] text-slate-400 block">O ingresa directamente la URL de la imagen:</label>
                                <input type="url" id="modalAdImageUrl" value="${(ad?.imageUrl || '').replace(/"/g, '&quot;')}" placeholder="https://firebasestorage.googleapis.com/.../editorial_ads/..." class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
                            </div>
                            <p class="text-[10px] text-slate-400">Recomendado: 1200×600 px (2:1 o 16:9). Formatos: JPG, PNG, WebP (máx. 5 MB). Se sube de forma segura a <code class="text-indigo-300">/editorial_ads</code>.</p>
                        </div>

                        <!-- Programación de Fechas -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Fecha/Hora de Inicio (startAt)</label>
                                <input type="datetime-local" id="modalAdStartAt" value="${formatIsoForInput(ad?.startAt)}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                                <p class="text-[10px] text-slate-400">Opcional. Vacío = inmediato.</p>
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Fecha/Hora de Fin (endAt)</label>
                                <input type="datetime-local" id="modalAdEndAt" value="${formatIsoForInput(ad?.endAt)}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                                <p class="text-[10px] text-slate-400">Opcional. Vacío = sin caducidad.</p>
                            </div>
                        </div>

                        <!-- Orden y Estado -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                            <div class="space-y-1">
                                <label class="text-xs font-bold text-slate-300 block">Orden en Carrusel</label>
                                <input type="number" id="modalAdOrder" min="1" max="999" value="${ad?.order ?? defaultOrder}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
                            </div>

                            <div class="flex items-center justify-between pt-4">
                                <span class="text-xs font-bold text-slate-200">Anuncio Activo</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="modalAdIsActive" ${ad ? (ad.isActive !== false ? 'checked' : '') : 'checked'} class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Live Mobile Simulator Preview (5 cols) -->
                    <div class="lg:col-span-5 flex flex-col items-center justify-start space-y-3 bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
                        <div class="flex items-center gap-2 self-start">
                            <span class="text-base">📱</span>
                            <h4 class="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Simulador Móvil en Vivo</h4>
                        </div>
                        <p class="text-[10px] text-slate-400 self-start">Previsualización idéntica a la tarjeta que renderizará la Customer App en Android.</p>

                        <!-- Simulated Mobile Card Container -->
                        <div class="w-full max-w-[340px] pt-2">
                            <div id="simulatedAdCard" class="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900 flex flex-col justify-between p-3.5 transition">
                                <!-- Background Image with Overlay -->
                                <img id="simAdImg" src="${ad?.imageUrl || '/assets/promo-placeholder.svg'}" class="absolute inset-0 w-full h-full object-cover z-0" onError="handleImageError(this, 'promo')">
                                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-10"></div>

                                <!-- Top Row: Badge & Type -->
                                <div class="relative z-20 flex items-center justify-between gap-2">
                                    <span id="simAdBadge" class="bg-indigo-600/90 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-md uppercase tracking-wide">
                                        ${ad?.badge || '🔥 DESTACADO'}
                                    </span>
                                    <span id="simAdCampaignType" class="bg-slate-900/80 backdrop-blur-sm text-indigo-300 text-[8px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                                        ${window.dashboardManagerModule.formatCampaignType(ad?.type || 'MERCHANT_PROMOTION')}
                                    </span>
                                </div>

                                <!-- Bottom Row: Content & CTA -->
                                <div class="relative z-20 space-y-1.5">
                                    <div id="simAdMerchantRow" class="flex items-center gap-1.5">
                                        <img id="simAdMerchantLogo" src="${ad?.merchantLogoUrl || '/assets/store-placeholder.svg'}" class="w-4 h-4 rounded-full object-cover bg-slate-800 border border-slate-700" onError="handleImageError(this, 'store')">
                                        <span id="simAdMerchantName" class="text-[10px] font-bold text-slate-200 truncate">${ad?.merchantName || 'BlueSystem Delivery'}</span>
                                    </div>

                                    <div>
                                        <h4 id="simAdTitle" class="text-xs font-black text-white leading-tight drop-shadow-md truncate">
                                            ${ad?.title || 'Título del Anuncio'}
                                        </h4>
                                        <p id="simAdSubtitle" class="text-[10px] text-slate-300 line-clamp-1 drop-shadow-sm">
                                            ${ad?.subtitle || 'Subtítulo o descripción de la promoción'}
                                        </p>
                                    </div>

                                    <div class="flex items-center justify-between pt-1">
                                        <span class="text-[9px] text-emerald-400 font-bold font-mono" id="simAdPrice"></span>
                                        <button type="button" id="simAdCta" class="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg shadow-lg hover:bg-indigo-500 transition">
                                            ${ad?.ctaText || 'Ver más'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-[10px] text-slate-400 text-center pt-2">
                            <span>Autoplay: <strong>5s</strong> • Pausa por toque • Reanudación tras <strong>6s</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
                    <button type="button" onclick="document.getElementById('editorialAdModal').remove()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition">
                        Cancelar
                    </button>
                    <button type="button" id="modalAdSaveBtn" onclick="window.dashboardManagerModule.saveEditorialAd(${isEdit ? `'${ad.id}'` : 'null'})" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg transition flex items-center gap-1.5">
                        <span>💾</span> ${isEdit ? 'Guardar Cambios' : 'Crear Anuncio Editorial'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        this._tempBusinesses = businesses;
        this._tempProducts = products;

        // Inyectar subcampos de actionType
        this.handleAdActionTypeChange(ad?.actionType || 'NONE', ad);

        // Configurar listener de subida de archivo Storage
        const fileInput = document.getElementById('modalAdFile');
        const uploadStatus = document.getElementById('modalAdUploadStatus');
        const urlInput = document.getElementById('modalAdImageUrl');

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (uploadStatus) {
                    uploadStatus.classList.remove('hidden');
                    uploadStatus.textContent = '⏳ Subiendo a /editorial_ads...';
                }

                try {
                    if (typeof storageService !== 'undefined' && storageService.uploadImage) {
                        const downloadUrl = await storageService.uploadImage(file, 'editorial_ads');
                        if (urlInput) urlInput.value = downloadUrl;
                        if (uploadStatus) {
                            uploadStatus.textContent = '✅ Subida exitosa';
                            uploadStatus.className = 'text-[11px] text-emerald-400 font-mono';
                        }
                        this.updateMobilePreview();
                    } else {
                        throw new Error('Servicio de almacenamiento (storageService) no disponible');
                    }
                } catch (err) {
                    console.error("Storage upload error:", err);
                    if (uploadStatus) {
                        uploadStatus.textContent = `❌ ${err.message}`;
                        uploadStatus.className = 'text-[11px] text-rose-400 font-mono';
                    }
                    if (typeof showToast === 'function') showToast(`❌ Error al subir: ${err.message}`, 'error');
                }
            });
        }

        // Configurar listeners reactivos en vivo para el simulador móvil
        ['modalAdTitle', 'modalAdSubtitle', 'modalAdBadge', 'modalAdCtaText', 'modalAdType', 'modalAdImageUrl'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateMobilePreview());
                el.addEventListener('change', () => this.updateMobilePreview());
            }
        });

        this.updateMobilePreview();
    },

    handleAdActionTypeChange: function(actionType, ad = {}) {
        const container = document.getElementById('modalAdDynamicTargetContainer');
        if (!container) return;

        const businesses = this._tempBusinesses || [];
        const products = this._tempProducts || [];

        if (actionType === 'NONE') {
            container.innerHTML = `
                <p class="text-[11px] text-slate-400">Anuncio estático institucional / informativo. No realizará ninguna acción de navegación al tocarlo.</p>
            `;
        } else if (actionType === 'MERCHANT') {
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">Comercio Asociado</label>
                    <select id="modalAdMerchantSelect" onchange="window.dashboardManagerModule.updateMobilePreview()" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        <option value="">-- Selecciona el comercio (${businesses.length}) --</option>
                        ${businesses.map(b => `<option value="${b.id}" data-name="${b.name}" data-logo="${b.logoUrl || ''}" ${b.id === (ad.merchantId || ad.targetId) ? 'selected' : ''}>${b.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (actionType === 'PRODUCT') {
            const initialBizId = ad.merchantId || '';
            const filteredProds = initialBizId ? products.filter(p => p.businessId === initialBizId) : products;

            container.innerHTML = `
                <div class="space-y-2">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-300 block">1. Filtrar por Comercio</label>
                        <select id="modalAdMerchantSelect" onchange="window.dashboardManagerModule.handleAdMerchantChange(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                            <option value="">-- Todos los Comercios (${businesses.length}) --</option>
                            ${businesses.map(b => `<option value="${b.id}" data-name="${b.name}" data-logo="${b.logoUrl || ''}" ${b.id === initialBizId ? 'selected' : ''}>${b.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-300 block">2. Producto Específico del Catálogo</label>
                        <select id="modalAdProductSelect" onchange="window.dashboardManagerModule.handleAdProductChange(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                            <option value="">-- Selecciona un producto (${filteredProds.length}) --</option>
                            ${filteredProds.map(p => {
                                const b = businesses.find(bz => bz.id === p.businessId);
                                const bName = b ? b.name : 'Comercio';
                                return `<option value="${p.id}" data-bizid="${p.businessId}" data-bizname="${bName}" data-name="${p.name}" data-price="${p.price}" data-img="${p.imageUrl}" ${p.id === (ad.productId || ad.targetId) ? 'selected' : ''}>[${bName}] ${p.name} — C$ ${p.price}</option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>
            `;
        } else if (actionType === 'INTERNAL_ROUTE') {
            const routes = [
                { path: '/express_delivery', label: '🚚 Servicio Encomiendas X→Y (/express_delivery)' },
                { path: '/categories', label: '🏷️ Catálogo de Categorías (/categories)' },
                { path: '/deals', label: '⚡ Ofertas Flash y Promociones (/deals)' },
                { path: '/branches', label: '🏢 Sucursales (/branches)' },
                { path: '/orders', label: '🛍️ Historial de Pedidos (/orders)' },
                { path: '/favorites', label: '❤️ Comercios Favoritos (/favorites)' }
            ];
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">Ruta de Navegación Interna</label>
                    <select id="modalAdInternalRoute" onchange="window.dashboardManagerModule.updateMobilePreview()" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        ${routes.map(r => `<option value="${r.path}" ${r.path === ad.targetRoute ? 'selected' : ''}>${r.label}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (actionType === 'EXTERNAL_URL') {
            container.innerHTML = `
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-300 block">URL Externa Segura (Requiere HTTPS)</label>
                    <input type="url" id="modalAdExternalUrl" value="${(ad.targetUrl || '').replace(/"/g, '&quot;')}" placeholder="https://ejemplo.com/promocion" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500">
                    <p class="text-[10px] text-slate-400">Por seguridad estricta, la URL debe comenzar obligatoriamente con <code class="text-emerald-400 font-bold font-mono">https://</code>.</p>
                </div>
            `;
        }

        this.updateMobilePreview();
    },

    handleAdMerchantChange: function(merchantId) {
        const prodSelect = document.getElementById('modalAdProductSelect');
        if (!prodSelect) return;

        const products = this._tempProducts || [];
        const businesses = this._tempBusinesses || [];

        const filtered = merchantId ? products.filter(p => p.businessId === merchantId) : products;
        prodSelect.innerHTML = `<option value="">-- Selecciona un producto (${filtered.length}) --</option>` +
            filtered.map(p => {
                const b = businesses.find(bz => bz.id === p.businessId);
                const bName = b ? b.name : 'Comercio';
                return `<option value="${p.id}" data-bizid="${p.businessId}" data-bizname="${bName}" data-name="${p.name}" data-price="${p.price}" data-img="${p.imageUrl}">[${bName}] ${p.name} — C$ ${p.price}</option>`;
            }).join('');

        this.updateMobilePreview();
    },

    handleAdProductChange: function(productId) {
        const prodSelect = document.getElementById('modalAdProductSelect');
        const selectedOpt = prodSelect?.selectedOptions?.[0];
        if (!selectedOpt || !productId) return;

        // Auto-completar título e imagen si están vacíos
        const titleInput = document.getElementById('modalAdTitle');
        const imgInput = document.getElementById('modalAdImageUrl');

        const pName = selectedOpt.getAttribute('data-name');
        const pImg = selectedOpt.getAttribute('data-img');
        const bizId = selectedOpt.getAttribute('data-bizid');

        if (titleInput && !titleInput.value.trim() && pName) {
            titleInput.value = pName;
        }
        if (imgInput && !imgInput.value.trim() && pImg) {
            imgInput.value = pImg;
        }

        const bizSelect = document.getElementById('modalAdMerchantSelect');
        if (bizSelect && bizId) {
            bizSelect.value = bizId;
        }

        this.updateMobilePreview();
    },

    updateMobilePreview: function() {
        const title = document.getElementById('modalAdTitle')?.value?.trim() || 'Título del Anuncio';
        const subtitle = document.getElementById('modalAdSubtitle')?.value?.trim() || 'Subtítulo o descripción de la promoción';
        const badge = document.getElementById('modalAdBadge')?.value?.trim();
        const ctaText = document.getElementById('modalAdCtaText')?.value?.trim() || 'Ver más';
        const type = document.getElementById('modalAdType')?.value || 'MERCHANT_PROMOTION';
        const imageUrl = document.getElementById('modalAdImageUrl')?.value?.trim() || '/assets/promo-placeholder.svg';

        const simTitle = document.getElementById('simAdTitle');
        const simSubtitle = document.getElementById('simAdSubtitle');
        const simBadge = document.getElementById('simAdBadge');
        const simCta = document.getElementById('simAdCta');
        const simType = document.getElementById('simAdCampaignType');
        const simImg = document.getElementById('simAdImg');
        const simMerchantName = document.getElementById('simAdMerchantName');
        const simMerchantLogo = document.getElementById('simAdMerchantLogo');
        const simPrice = document.getElementById('simAdPrice');

        if (simTitle) simTitle.textContent = title;
        if (simSubtitle) simSubtitle.textContent = subtitle;
        if (simCta) simCta.textContent = ctaText;
        if (simType) simType.textContent = this.formatCampaignType(type);

        if (simBadge) {
            if (badge) {
                simBadge.textContent = badge;
                simBadge.classList.remove('hidden');
            } else {
                simBadge.classList.add('hidden');
            }
        }

        if (simImg && imageUrl) {
            simImg.src = imageUrl;
        }

        // Resolver comercio y producto
        const merchantSelect = document.getElementById('modalAdMerchantSelect');
        const productSelect = document.getElementById('modalAdProductSelect');

        if (productSelect && productSelect.value) {
            const opt = productSelect.selectedOptions?.[0];
            const price = opt?.getAttribute('data-price');
            const bizName = opt?.getAttribute('data-bizname');
            if (simPrice && price) simPrice.textContent = `C$ ${price}`;
            if (simMerchantName && bizName) simMerchantName.textContent = bizName;
        } else if (merchantSelect && merchantSelect.value) {
            const opt = merchantSelect.selectedOptions?.[0];
            const bName = opt?.getAttribute('data-name');
            const bLogo = opt?.getAttribute('data-logo');
            if (simPrice) simPrice.textContent = '';
            if (simMerchantName && bName) simMerchantName.textContent = bName;
            if (simMerchantLogo && bLogo) simMerchantLogo.src = bLogo;
        } else {
            if (simPrice) simPrice.textContent = '';
            if (simMerchantName) simMerchantName.textContent = 'BlueSystem Delivery';
        }
    },

    saveEditorialAd: async function(adId = null) {
        const title = document.getElementById('modalAdTitle')?.value?.trim();
        const subtitle = document.getElementById('modalAdSubtitle')?.value?.trim() || '';
        const badge = document.getElementById('modalAdBadge')?.value?.trim() || '';
        const ctaText = document.getElementById('modalAdCtaText')?.value?.trim() || 'Ver más';
        const type = document.getElementById('modalAdType')?.value || 'MERCHANT_PROMOTION';
        const actionType = document.getElementById('modalAdActionType')?.value || 'NONE';
        const imageUrl = document.getElementById('modalAdImageUrl')?.value?.trim();
        const startAtInput = document.getElementById('modalAdStartAt')?.value;
        const endAtInput = document.getElementById('modalAdEndAt')?.value;
        const orderVal = parseInt(document.getElementById('modalAdOrder')?.value, 10) || 0;
        const isActive = document.getElementById('modalAdIsActive')?.checked ?? true;

        if (!title) {
            if (typeof showToast === 'function') showToast('❌ Ingresa el título del anuncio', 'error');
            else alert('Ingresa el título del anuncio');
            return;
        }

        if (!imageUrl) {
            if (typeof showToast === 'function') showToast('❌ Ingresa o sube una imagen para el anuncio', 'error');
            else alert('Ingresa o sube una imagen para el anuncio');
            return;
        }

        const payload = {
            title: title,
            subtitle: subtitle,
            badge: badge,
            ctaText: ctaText,
            type: type,
            actionType: actionType,
            imageUrl: imageUrl,
            order: orderVal,
            isActive: isActive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Procesar fechas
        if (startAtInput) {
            payload.startAt = firebase.firestore.Timestamp.fromDate(new Date(startAtInput));
        } else {
            payload.startAt = null;
        }

        if (endAtInput) {
            payload.endAt = firebase.firestore.Timestamp.fromDate(new Date(endAtInput));
        } else {
            payload.endAt = null;
        }

        // Procesar acción
        if (actionType === 'MERCHANT') {
            const bizSelect = document.getElementById('modalAdMerchantSelect');
            const merchantId = bizSelect?.value;
            if (!merchantId) {
                if (typeof showToast === 'function') showToast('❌ Selecciona el comercio para el anuncio', 'error');
                else alert('Selecciona el comercio');
                return;
            }
            const selectedOpt = bizSelect.selectedOptions?.[0];
            payload.targetId = merchantId;
            payload.merchantId = merchantId;
            payload.merchantName = selectedOpt?.getAttribute('data-name') || null;
            payload.merchantLogoUrl = selectedOpt?.getAttribute('data-logo') || null;
        } else if (actionType === 'PRODUCT') {
            const prodSelect = document.getElementById('modalAdProductSelect');
            const productId = prodSelect?.value;
            if (!productId) {
                if (typeof showToast === 'function') showToast('❌ Selecciona el producto para el anuncio', 'error');
                else alert('Selecciona el producto');
                return;
            }
            const selectedOpt = prodSelect.selectedOptions?.[0];
            const bizId = selectedOpt?.getAttribute('data-bizid') || document.getElementById('modalAdMerchantSelect')?.value;

            payload.targetId = productId;
            payload.productId = productId;
            payload.productName = selectedOpt?.getAttribute('data-name') || null;
            payload.productPrice = parseFloat(selectedOpt?.getAttribute('data-price')) || null;
            payload.merchantId = bizId || null;
            payload.merchantName = selectedOpt?.getAttribute('data-bizname') || null;
        } else if (actionType === 'INTERNAL_ROUTE') {
            const route = document.getElementById('modalAdInternalRoute')?.value;
            if (!route) {
                if (typeof showToast === 'function') showToast('❌ Selecciona la ruta interna', 'error');
                else alert('Selecciona la ruta interna');
                return;
            }
            payload.targetRoute = route;
        } else if (actionType === 'EXTERNAL_URL') {
            const url = document.getElementById('modalAdExternalUrl')?.value?.trim();
            if (!url || !url.startsWith('https://')) {
                if (typeof showToast === 'function') showToast('❌ La URL externa debe comenzar con https://', 'error');
                else alert('La URL externa debe comenzar con https://');
                return;
            }
            payload.targetUrl = url;
        }

        const saveBtn = document.getElementById('modalAdSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>⏳</span> Guardando...';
        }

        try {
            if (adId) {
                await db.collection('home_editorial_ads').doc(adId).set(payload, { merge: true });
            } else {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('home_editorial_ads').add(payload);
            }

            document.getElementById('editorialAdModal')?.remove();
            this.showLiveSyncFeedback();
            if (typeof showToast === 'function') {
                showToast(`✅ Anuncio editorial ${adId ? 'actualizado' : 'creado'} con éxito`, 'success');
            }
        } catch (e) {
            console.error("Error saving editorial ad:", e);
            if (typeof showToast === 'function') showToast(`❌ Error: ${e.message}`, 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾</span> Guardar';
            }
        }
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
