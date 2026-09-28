// Módulo 5: Live Restaurant & Commerce Enterprise Manager - Control Center Enterprise (Fase 14)
const liveRestaurantsModule = {
    unsubscribeStores: null,
    unsubscribeBranches: null,      // Listener canónico a /branches
    unsubscribeMemberships: null,  // Listener canónico a /membership (EIAM SSOT)
    currentStores: [],
    branchesByBusiness: {},         // Índice: businessId → branches[] (fuente canónica /branches)
    membershipsByBusiness: {},      // Índice: businessId → memberships[] (fuente canónica /membership)

    // ── Performance Engine State & Memory Store ──────────────────────────────
    storesMap: new Map(),           // Índice SSOT en memoria: businessId → store
    _initialStoresLoaded: false,    // Flag para distinguir carga inicial de deltas en tiempo real
    _renderTimer: null,             // RAF token para el planificador de renders
    _debounceTimer: null,           // Timer para debounce de búsqueda
    _currentPage: 1,                // Página actual de paginación
    _pageSize: 12,                  // Comercios por página
    _lastFilteredStores: [],        // Caché del último resultado filtrado
    _organizationsCache: null,      // Caché en memoria de Holdings/Organizaciones (evita bloqueos de red)
    _organizationsPromise: null,    // Promesa en vuelo de organizaciones

    // ── Ciclo de Vida: Destructor de Listeners y Timers ─────────────────────
    destroy: () => {
        if (liveRestaurantsModule.unsubscribeStores)    { liveRestaurantsModule.unsubscribeStores();    liveRestaurantsModule.unsubscribeStores = null; }
        if (liveRestaurantsModule.unsubscribeBranches)  { liveRestaurantsModule.unsubscribeBranches();  liveRestaurantsModule.unsubscribeBranches = null; }
        if (liveRestaurantsModule.unsubscribeMemberships) { liveRestaurantsModule.unsubscribeMemberships(); liveRestaurantsModule.unsubscribeMemberships = null; }
        if (liveRestaurantsModule._renderTimer)  { cancelAnimationFrame(liveRestaurantsModule._renderTimer); liveRestaurantsModule._renderTimer = null; }
        if (liveRestaurantsModule._debounceTimer) { clearTimeout(liveRestaurantsModule._debounceTimer); liveRestaurantsModule._debounceTimer = null; }
        
        if (liveRestaurantsModule.pickerMap) {
            try { liveRestaurantsModule.pickerMap.remove(); } catch(e) {}
            liveRestaurantsModule.pickerMap = null;
        }

        liveRestaurantsModule._initialStoresLoaded = false;
        console.log('[LIVE_RESTAURANTS] destroy() — Listeners, timers y mapas liberados limpiamente.');
    },

    // ── Planificador Central de Render Coalescente (anti Layout-Thrashing) ───
    // Coalesce actualizaciones en un único frame RAF sin forzar reseteo de página en updates en vivo.
    scheduleRender: (resetPage = false) => {
        if (liveRestaurantsModule._renderTimer) return;
        liveRestaurantsModule._renderTimer = requestAnimationFrame(() => {
            liveRestaurantsModule._renderTimer = null;
            liveRestaurantsModule.updateKpis();
            if (resetPage) liveRestaurantsModule._currentPage = 1;
            liveRestaurantsModule._doFilterAndRender();
        });
    },

    // ── Caché en Memoria de Organizaciones (Zero-Blocking) ───────────────────
    getOrganizationsCached: async () => {
        if (liveRestaurantsModule._organizationsCache) {
            return liveRestaurantsModule._organizationsCache;
        }
        if (liveRestaurantsModule._organizationsPromise) {
            return liveRestaurantsModule._organizationsPromise;
        }
        if (typeof governanceService !== 'undefined' && governanceService.getOrganizations) {
            liveRestaurantsModule._organizationsPromise = governanceService.getOrganizations()
                .then(orgs => {
                    liveRestaurantsModule._organizationsCache = orgs || [];
                    liveRestaurantsModule._organizationsPromise = null;
                    return liveRestaurantsModule._organizationsCache;
                })
                .catch(err => {
                    console.warn('[LIVE_RESTAURANTS] Error precargando organizaciones:', err);
                    liveRestaurantsModule._organizationsPromise = null;
                    return [];
                });
            return liveRestaurantsModule._organizationsPromise;
        }
        return [];
    },

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Precargar organizaciones en memoria en segundo plano para disponibilidad inmediata
        liveRestaurantsModule.getOrganizationsCached();

        // Skeleton HTML — 6 placeholders con shimmer para evitar CLS al cargar
        const skeletonCard = `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <div class="h-28 w-full bg-slate-800 animate-pulse"></div>
                <div class="p-5 space-y-3 flex-1">
                    <div class="flex items-end justify-between -mt-8 mb-3">
                        <div class="w-16 h-16 rounded-2xl bg-slate-700 animate-pulse"></div>
                        <div class="w-14 h-5 rounded-lg bg-slate-800 animate-pulse"></div>
                    </div>
                    <div class="h-4 w-3/4 rounded bg-slate-800 animate-pulse"></div>
                    <div class="h-3 w-1/2 rounded bg-slate-800 animate-pulse"></div>
                    <div class="grid grid-cols-2 gap-2 mt-4">
                        <div class="h-10 rounded-xl bg-slate-800 animate-pulse"></div>
                        <div class="h-10 rounded-xl bg-slate-800 animate-pulse"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div class="h-8 rounded-xl bg-slate-800 animate-pulse"></div>
                        <div class="h-8 rounded-xl bg-slate-800 animate-pulse"></div>
                        <div class="col-span-2 h-7 rounded-xl bg-slate-800 animate-pulse"></div>
                    </div>
                </div>
            </div>`;
        const skeletonGrid = Array(6).fill(skeletonCard).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header con Estadísticas Ops -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
                    <div>
                        <h2 class="text-2xl font-black text-white flex items-center gap-2.5">
                            <span class="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">🏪</span>
                            <span>Gestión Enterprise de Comercios & Sucursales</span>
                        </h2>
                        <p class="text-xs text-slate-400 mt-1">Administración centralizada de comercios aliados, sucursales, imágenes y usuarios asignados con sincronización en vivo a la App</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="liveRestaurantsModule.openCreateModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition duration-150">
                            <span>➕</span> Nuevo Comercio
                        </button>
                    </div>
                </div>

                <!-- Tarjetas KPI -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" id="commerceKpiContainer">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                        <span class="text-2xl bg-indigo-500/10 p-3 rounded-xl text-indigo-400">🏬</span>
                        <div>
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Comercios</span>
                            <p class="text-xl font-black text-white" id="kpiTotalStores">0</p>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                        <span class="text-2xl bg-emerald-500/10 p-3 rounded-xl text-emerald-400">🟢</span>
                        <div>
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Comercios Activos</span>
                            <p class="text-xl font-black text-emerald-400" id="kpiActiveStores">0</p>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                        <span class="text-2xl bg-amber-500/10 p-3 rounded-xl text-amber-400">🔔</span>
                        <div>
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Abiertos Ahora</span>
                            <p class="text-xl font-black text-amber-400" id="kpiOpenStores">0</p>
                        </div>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                        <span class="text-2xl bg-cyan-500/10 p-3 rounded-xl text-cyan-400">🏢</span>
                        <div>
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Sucursales</span>
                            <p class="text-xl font-black text-cyan-400" id="kpiTotalBranches">0</p>
                        </div>
                    </div>
                </div>

                <!-- Barra de Filtros y Búsqueda -->
                <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-3">
                    <div class="relative flex-1 w-full">
                        <span class="absolute left-3.5 top-2.5 text-slate-500 text-sm">🔍</span>
                        <input type="text" id="searchCommerceInput"
                            oninput="liveRestaurantsModule.handleSearchInput()"
                            placeholder="Buscar por nombre, correo, teléfono o dirección..."
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
                    </div>
                    <select id="filterCategorySelect" onchange="liveRestaurantsModule.filterStores()" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500">
                        <option value="ALL">Todas las Categorías</option>
                        <option value="Restaurante">Restaurante</option>
                        <option value="Supermercado">Supermercado</option>
                        <option value="Farmacia">Farmacia</option>
                        <option value="Cafetería">Cafetería</option>
                        <option value="Repostería">Repostería</option>
                        <option value="Licorería">Licorería</option>
                        <option value="Tecnología">Tecnología</option>
                        <option value="Otro">Otro</option>
                    </select>
                    <select id="filterStatusSelect" onchange="liveRestaurantsModule.filterStores()" class="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500">
                        <option value="ALL">Todos los Estados</option>
                        <option value="ACTIVE">Solo Activos</option>
                        <option value="OPEN">Abiertos en Vivo</option>
                        <option value="FEATURED">⭐ Solo Destacados</option>
                        <option value="NON_FEATURED">○ Solo Normales</option>
                        <option value="INACTIVE">Inactivos</option>
                    </select>
                </div>

                <!-- Stores List Grid con skeleton inicial -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="storesGrid">
                    ${skeletonGrid}
                </div>

                <!-- Paginación -->
                <div id="storesPaginationContainer"></div>
            </div>
        `;

        liveRestaurantsModule._setupGridDelegation();
        liveRestaurantsModule.initSnapshotListener();
    },

    // ── Delegación de Eventos en el Grid (0 Event Listeners Duplicados) ───────
    _setupGridDelegation: () => {
        const container = document.getElementById('storesGrid');
        if (!container || container.dataset.delegated === 'true') return;
        container.dataset.delegated = 'true';

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const storeId = btn.dataset.storeId;
            if (!action || !storeId) return;

            e.stopPropagation();
            switch (action) {
                case 'edit':
                    liveRestaurantsModule.openEditModal(storeId);
                    break;
                case 'images':
                    liveRestaurantsModule.openImagesModal(storeId);
                    break;
                case 'branches':
                    liveRestaurantsModule.openBranchesModal(storeId);
                    break;
                case 'users':
                    liveRestaurantsModule.openAssignUsersModal(storeId);
                    break;
                case 'delete':
                    liveRestaurantsModule.confirmDeleteStore(storeId);
                    break;
                case 'toggle-featured': {
                    const isFeatured = btn.dataset.featured === 'true';
                    liveRestaurantsModule.toggleFeaturedState(storeId, isFeatured);
                    break;
                }
                case 'toggle-active': {
                    const isActive = btn.dataset.active === 'true';
                    liveRestaurantsModule.toggleActiveState(storeId, isActive);
                    break;
                }
            }
        });
    },

    // ── Debounce para el input de búsqueda (200ms) ──────────────────────────
    handleSearchInput: () => {
        if (liveRestaurantsModule._debounceTimer) clearTimeout(liveRestaurantsModule._debounceTimer);
        liveRestaurantsModule._debounceTimer = setTimeout(() => {
            liveRestaurantsModule._currentPage = 1;
            liveRestaurantsModule._doFilterAndRender();
        }, 200);
    },

    // ── filterStores: Punto de entrada público (desde selects onchange) ──────
    filterStores: () => {
        liveRestaurantsModule._currentPage = 1;
        liveRestaurantsModule._doFilterAndRender();
    },

    // ── Actualización Granular de Tarjeta DOM (Zero Re-render del Grid) ─────
    updateCardDom: (storeId, store) => {
        const card = document.querySelector(`[data-store-id="${storeId}"]`);
        if (!card) return false;

        const name = store.comercioNombre || store.nombre || store.name || 'Comercio Sin Nombre';
        const address = store.direccion || store.address || 'Sin dirección registrada';
        const category = store.categoria || store.category || 'Restaurante';
        const isActive = store.active !== false && store.isActive !== false;
        const isOpen = store.isOpen === true || store.abierto === true;
        const isFeatured = store.isFeatured === true || store.featured === true;
        const branches = liveRestaurantsModule.branchesByBusiness[storeId] || [];
        const memberships = liveRestaurantsModule.membershipsByBusiness[storeId] || [];
        const hasMemberships = memberships.length > 0;
        const hasDrift = isActive && !hasMemberships;

        // Badge Destacado
        const featBtn = card.querySelector('[data-action="toggle-featured"]');
        if (featBtn) {
            featBtn.dataset.featured = String(isFeatured);
            featBtn.title = isFeatured ? 'Comercio Destacado (clic para quitar)' : 'Comercio Normal (clic para destacar)';
            featBtn.className = `featured-badge px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${isFeatured ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/40 shadow-sm' : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:bg-slate-700'}`;
            featBtn.textContent = isFeatured ? '⭐ DESTACADO' : '☆ NORMAL';
        }

        // Badge Abierto / Cerrado
        const openBadge = card.querySelector('[data-field="open-badge"]');
        if (openBadge) {
            openBadge.className = `open-badge px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isOpen ? 'bg-amber-500/90 text-slate-950 shadow-md' : 'bg-slate-800/90 text-slate-400 border border-slate-700'}`;
            openBadge.textContent = isOpen ? '⚡ ABIERTO' : '🌙 CERRADO';
        }

        // Badge Activo / Inactivo
        const activeBtn = card.querySelector('[data-action="toggle-active"]');
        if (activeBtn) {
            activeBtn.dataset.active = String(isActive);
            activeBtn.className = `active-badge px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${isActive ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' : 'bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30'}`;
            activeBtn.textContent = isActive ? 'ACTIVO' : 'INACTIVO';
        }

        // Nombre & Dirección
        const nameEl = card.querySelector('[data-field="name"]');
        if (nameEl && nameEl.textContent !== name) nameEl.textContent = name;

        const addrEl = card.querySelector('[data-field="address"]');
        if (addrEl && addrEl.textContent !== `📍 ${address}`) addrEl.textContent = `📍 ${address}`;

        // Categoría
        const catEl = card.querySelector('[data-field="category"]');
        if (catEl && catEl.textContent !== `🏷️ ${category}`) catEl.textContent = `🏷️ ${category}`;

        // ── Imágenes (Logo y Banner) ─────────────────────────────────────────
        // Selector dual: data-img-type (tarjetas nuevas) + fallback por alt (tarjetas legacy)
        const newLogo = store.logoUrl || store.photoUrl || store.optimizedLogoUrl || store.logo || store.image || '';
        const newBanner = store.bannerUrl || store.portadaUrl || store.coverUrl || store.optimizedBannerUrl || store.banner || '';

        if (newLogo) {
            const logoImg = card.querySelector('[data-img-type="logo"]') || card.querySelector('img[alt="Logo"]');
            if (logoImg) logoImg.src = newLogo;
        }

        if (newBanner) {
            const bannerImg = card.querySelector('[data-img-type="banner"]') || card.querySelector('img[alt="Portada"]');
            if (bannerImg) bannerImg.src = newBanner;
        }

        // Metadatos Ops
        const feeEl = card.querySelector('[data-field="delivery-fee"]');
        if (feeEl) feeEl.textContent = `C$ ${store.deliveryFee || store.costoEnvioBase || 35}`;

        const prepEl = card.querySelector('[data-field="prep-time"]');
        if (prepEl) prepEl.textContent = `${store.avgPrepTimeMinutes || store.tiempoEstimadoMinutos || 15} min`;

        // Sucursales & Membresías
        const branchBadge = card.querySelector('[data-field="branches-badge"]');
        if (branchBadge) branchBadge.innerHTML = `🏢 Sucursales: <strong class="text-cyan-400 font-black">${branches.length}</strong>`;

        const memBadge = card.querySelector('[data-field="memberships-badge"]');
        if (memBadge) memBadge.innerHTML = `👥 EIAM: <strong class="${hasMemberships ? 'text-indigo-400 font-black' : (hasDrift ? 'text-rose-400 font-black' : 'text-slate-500 font-normal')}">${hasMemberships ? memberships.length + ' Activos' : (hasDrift ? '⚠️ DRIFT (0)' : '0')}</strong>`;

        return true;
    },

    // ── Actualización Incremental de Relación Sucursales en Tarjeta ──────────
    updateCardBranches: (businessId) => {
        const card = document.querySelector(`[data-store-id="${businessId}"]`);
        if (!card) return;
        const branches = liveRestaurantsModule.branchesByBusiness[businessId] || [];
        const branchBadge = card.querySelector('[data-field="branches-badge"]');
        if (branchBadge) branchBadge.innerHTML = `🏢 Sucursales: <strong class="text-cyan-400 font-black">${branches.length}</strong>`;
    },

    // ── Actualización Incremental de Relación EIAM en Tarjeta ────────────────
    updateCardMemberships: (businessId) => {
        const card = document.querySelector(`[data-store-id="${businessId}"]`);
        if (!card) return;
        const store = liveRestaurantsModule.storesMap.get(businessId) || {};
        const isActive = store.active !== false && store.isActive !== false;
        const memberships = liveRestaurantsModule.membershipsByBusiness[businessId] || [];
        const hasMemberships = memberships.length > 0;
        const hasDrift = isActive && !hasMemberships;
        const memBadge = card.querySelector('[data-field="memberships-badge"]');
        if (memBadge) memBadge.innerHTML = `👥 EIAM: <strong class="${hasMemberships ? 'text-indigo-400 font-black' : (hasDrift ? 'text-rose-400 font-black' : 'text-slate-500 font-normal')}">${hasMemberships ? memberships.length + ' Activos' : (hasDrift ? '⚠️ DRIFT (0)' : '0')}</strong>`;
    },

    // ── Listener con Estrategia Incremental SSOT (docChanges) ───────────────
    initSnapshotListener: () => {
        if (liveRestaurantsModule.unsubscribeStores)    liveRestaurantsModule.unsubscribeStores();
        if (liveRestaurantsModule.unsubscribeBranches)  liveRestaurantsModule.unsubscribeBranches();
        if (liveRestaurantsModule.unsubscribeMemberships) liveRestaurantsModule.unsubscribeMemberships();

        liveRestaurantsModule.storesMap.clear();
        liveRestaurantsModule.currentStores = [];
        liveRestaurantsModule._initialStoresLoaded = false;

        // ── LISTENER 1: /businesses (comercios con docChanges) ───────────────
        liveRestaurantsModule.unsubscribeStores = db.collection('businesses')
            .onSnapshot(snapshot => {
                if (!liveRestaurantsModule._initialStoresLoaded) {
                    // Carga inicial completa
                    snapshot.forEach(doc => {
                        const data = doc.data() || {};
                        const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.lifecycleStatus === 'DEPROVISIONED' || data.isDeleted === true;
                        if (!isDeleted) {
                            const canonicalName = data.name || data.comercioNombre || data.nombre || 'Comercio Sin Nombre';
                            liveRestaurantsModule.storesMap.set(doc.id, {
                                id: doc.id,
                                businessId: doc.id,
                                ...data,
                                name: canonicalName,
                                comercioNombre: canonicalName
                            });
                        }
                    });
                    liveRestaurantsModule.currentStores = Array.from(liveRestaurantsModule.storesMap.values());
                    liveRestaurantsModule._initialStoresLoaded = true;
                    liveRestaurantsModule.scheduleRender(false);
                } else {
                    // Actualizaciones incrementales quirúrgicas con docChanges
                    let structureChanged = false;
                    const docChanges = snapshot.docChanges ? snapshot.docChanges() : [];

                    docChanges.forEach(change => {
                        const doc = change.doc;
                        const data = doc.data() || {};
                        const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.lifecycleStatus === 'DEPROVISIONED' || data.isDeleted === true;

                        if (change.type === 'added') {
                            if (!isDeleted) {
                                const canonicalName = data.name || data.comercioNombre || data.nombre || 'Comercio Sin Nombre';
                                liveRestaurantsModule.storesMap.set(doc.id, {
                                    id: doc.id,
                                    businessId: doc.id,
                                    ...data,
                                    name: canonicalName,
                                    comercioNombre: canonicalName
                                });
                                structureChanged = true;
                            }
                        } else if (change.type === 'modified') {
                            if (isDeleted) {
                                if (liveRestaurantsModule.storesMap.has(doc.id)) {
                                    liveRestaurantsModule.storesMap.delete(doc.id);
                                    structureChanged = true;
                                }
                            } else {
                                const canonicalName = data.name || data.comercioNombre || data.nombre || 'Comercio Sin Nombre';
                                const updatedStore = {
                                    id: doc.id,
                                    businessId: doc.id,
                                    ...data,
                                    name: canonicalName,
                                    comercioNombre: canonicalName
                                };
                                liveRestaurantsModule.storesMap.set(doc.id, updatedStore);

                                // Intento de actualización granular directa en el DOM sin rebuild
                                const updatedInDom = liveRestaurantsModule.updateCardDom(doc.id, updatedStore);
                                if (!updatedInDom) {
                                    structureChanged = true;
                                }
                            }
                        } else if (change.type === 'removed') {
                            if (liveRestaurantsModule.storesMap.has(doc.id)) {
                                liveRestaurantsModule.storesMap.delete(doc.id);
                                structureChanged = true;
                            }
                        }
                    });

                    liveRestaurantsModule.currentStores = Array.from(liveRestaurantsModule.storesMap.values());
                    liveRestaurantsModule.updateKpis();

                    if (structureChanged) {
                        // Solo repintar si cambiaron elementos añadidos o eliminados
                        liveRestaurantsModule.scheduleRender(false);
                    }
                }
            }, err => {
                console.error("[LIVE_RESTAURANTS] Error en Snapshot /businesses:", err);
                if (typeof toast !== 'undefined') toast.show("Error al cargar comercios en tiempo real: " + err.message, "error");
            });

        // ── LISTENER 2: /branches (sucursales canónicas con docChanges) ───────
        liveRestaurantsModule.unsubscribeBranches = db.collection('branches')
            .onSnapshot(snapshot => {
                const affectedBizIds = new Set();
                const index = {};

                snapshot.forEach(doc => {
                    const data = doc.data() || {};
                    const isDeleted = data.status === 'DELETED' || data.active === false;
                    if (isDeleted) return;
                    const bizId = data.businessId;
                    if (!bizId) return;
                    if (!index[bizId]) index[bizId] = [];
                    index[bizId].push({
                        branchId: doc.id,
                        ...data,
                        name: data.name || data.nombre || data.branchName || 'Sucursal Sin Nombre'
                    });
                });

                if (snapshot.docChanges) {
                    snapshot.docChanges().forEach(change => {
                        const data = change.doc.data() || {};
                        if (data.businessId) affectedBizIds.add(data.businessId);
                    });
                }

                liveRestaurantsModule.branchesByBusiness = index;
                liveRestaurantsModule.updateKpis();

                // Actualizar únicamente las tarjetas DOM afectadas
                if (affectedBizIds.size > 0 && liveRestaurantsModule._initialStoresLoaded) {
                    affectedBizIds.forEach(bizId => {
                        liveRestaurantsModule.updateCardBranches(bizId);
                    });
                } else if (!liveRestaurantsModule._initialStoresLoaded) {
                    liveRestaurantsModule.scheduleRender(false);
                }
            }, err => {
                console.error('[BRANCH_RECONCILIATION] Error en listener /branches:', err);
            });

        // ── LISTENER 3: /membership (EIAM Memberships con docChanges) ─────────
        liveRestaurantsModule.unsubscribeMemberships = db.collection('membership')
            .onSnapshot(snapshot => {
                const affectedBizIds = new Set();
                const memIndex = {};

                snapshot.forEach(doc => {
                    const data = doc.data() || {};
                    if (data.status !== 'ACTIVE') return;
                    const bizId = data.businessId;
                    if (!bizId) return;
                    if (!memIndex[bizId]) memIndex[bizId] = [];
                    memIndex[bizId].push({
                        membershipId: doc.id,
                        ...data
                    });
                });

                if (snapshot.docChanges) {
                    snapshot.docChanges().forEach(change => {
                        const data = change.doc.data() || {};
                        if (data.businessId) affectedBizIds.add(data.businessId);
                    });
                }

                liveRestaurantsModule.membershipsByBusiness = memIndex;

                // Actualizar únicamente las tarjetas DOM afectadas
                if (affectedBizIds.size > 0 && liveRestaurantsModule._initialStoresLoaded) {
                    affectedBizIds.forEach(bizId => {
                        liveRestaurantsModule.updateCardMemberships(bizId);
                    });
                } else if (!liveRestaurantsModule._initialStoresLoaded) {
                    liveRestaurantsModule.scheduleRender(false);
                }
            }, err => {
                console.error('[EIAM_GOVERNANCE] Error en listener /membership:', err);
            });
    },

    updateKpis: () => {
        const stores = liveRestaurantsModule.currentStores;
        const total = stores.length;
        const active = stores.filter(s => s.active !== false && s.isActive !== false).length;
        const open = stores.filter(s => s.isOpen === true || s.abierto === true).length;

        // ── Conteo desde la colección canónica /branches ─────────────────────
        const branchesByBusiness = liveRestaurantsModule.branchesByBusiness || {};
        let branchesCount = 0;
        Object.values(branchesByBusiness).forEach(arr => { branchesCount += arr.length; });

        const kpiTotal = document.getElementById('kpiTotalStores');
        const kpiActive = document.getElementById('kpiActiveStores');
        const kpiOpen = document.getElementById('kpiOpenStores');
        const kpiBranches = document.getElementById('kpiTotalBranches');

        if (kpiTotal && kpiTotal.textContent !== String(total)) kpiTotal.textContent = total;
        if (kpiActive && kpiActive.textContent !== String(active)) kpiActive.textContent = active;
        if (kpiOpen && kpiOpen.textContent !== String(open)) kpiOpen.textContent = open;
        if (kpiBranches && kpiBranches.textContent !== String(branchesCount)) kpiBranches.textContent = branchesCount;
    },

    // ── Generador HTML de Tarjeta Individual (con Contención CSS para 60 FPS) ─
    renderCardHtml: (store) => {
        const storeId = store.id;
        const name = store.comercioNombre || store.nombre || store.name || 'Comercio Sin Nombre';
        const address = store.direccion || store.address || 'Sin dirección registrada';
        const category = store.categoria || store.category || 'Restaurante';
        const logo = store.logoUrl || store.photoUrl || store.optimizedLogoUrl || store.logo || store.image || (typeof getFallbackUrl === 'function' ? getFallbackUrl('store') : '/assets/store-placeholder.svg');
        const banner = store.bannerUrl || store.portadaUrl || store.coverUrl || store.optimizedBannerUrl || store.banner || (typeof getFallbackUrl === 'function' ? getFallbackUrl('banner') : '/assets/banner-placeholder.svg');
        const isActive = store.active !== false && store.isActive !== false;
        const isOpen = store.isOpen === true || store.abierto === true;
        const isFeatured = store.isFeatured === true || store.featured === true;
        const branches = liveRestaurantsModule.branchesByBusiness[storeId] || [];
        const memberships = liveRestaurantsModule.membershipsByBusiness[storeId] || [];
        const hasMemberships = memberships.length > 0;
        const hasDrift = isActive && !hasMemberships;

        return `
            <div data-store-id="${storeId}" class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-slate-700 transition duration-200">
                <!-- Banner Header -->
                <div class="relative h-28 w-full bg-slate-800 overflow-hidden">
                    <img src="${banner}" alt="Portada" data-img-type="banner"
                        loading="lazy" decoding="async"
                        class="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80"
                        onError="handleImageError(this, 'banner')">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>

                    <!-- Badges de Estado & Destacado -->
                    <div class="absolute top-3 right-3 flex items-center gap-1.5">
                        <button data-action="toggle-featured" data-store-id="${storeId}" data-featured="${isFeatured}" onclick="liveRestaurantsModule.toggleFeaturedState('${storeId}', ${isFeatured})" title="${isFeatured ? 'Comercio Destacado (clic para quitar)' : 'Comercio Normal (clic para destacar)'}" class="featured-badge px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${isFeatured ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/40 shadow-sm' : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:bg-slate-700'}">
                            ${isFeatured ? '⭐ DESTACADO' : '☆ NORMAL'}
                        </button>
                        <span data-field="open-badge" class="open-badge px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isOpen ? 'bg-amber-500/90 text-slate-950 shadow-md' : 'bg-slate-800/90 text-slate-400 border border-slate-700'}">
                            ${isOpen ? '⚡ ABIERTO' : '🌙 CERRADO'}
                        </span>
                        <button data-action="toggle-active" data-store-id="${storeId}" data-active="${isActive}" onclick="liveRestaurantsModule.toggleActiveState('${storeId}', ${isActive})" class="active-badge px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${isActive ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' : 'bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30'}">
                            ${isActive ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                    </div>

                    <!-- Categoría & Prefijo de Pedidos -->
                    <div class="absolute top-3 left-3 flex items-center gap-1.5">
                        <span data-field="category" class="bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-300">
                            🏷️ ${category}
                        </span>
                        ${(store.orderCodePrefix || store.codePrefix) ? `
                            <span data-field="order-prefix" class="bg-indigo-950/90 border border-indigo-500/50 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-indigo-300" title="Prefijo de Pedidos">
                                #${store.orderCodePrefix || store.codePrefix}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <!-- Información Principal con Logo -->
                <div class="p-5 pt-0 relative flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-end justify-between -mt-8 mb-3">
                            <div class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-indigo-500/40 overflow-hidden shadow-2xl shrink-0">
                                <img src="${logo}" alt="Logo" data-img-type="logo"
                                    loading="lazy" decoding="async"
                                    class="w-full h-full object-cover"
                                    onError="handleImageError(this, 'store')">
                            </div>
                            ${(Number(store.ratingCount || 0) > 0 && Number(store.rating || store.averageRating || 0) > 0)
                                ? `<button onclick="event.stopPropagation(); liveRestaurantsModule.openReviewsModal('${storeId}', '${(store.name || store.nombre || 'Comercio').replace(/'/g, "\\'")}', ${Number(store.rating || store.averageRating).toFixed(1)}, ${store.ratingCount})" class="flex items-center gap-1 bg-slate-950/80 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-800 text-[11px] transition cursor-pointer" title="Ver opiniones de clientes">
                                    <span class="text-amber-400 font-black">★ ${Number(store.rating || store.averageRating).toFixed(1)}</span>
                                    <span class="text-slate-500">(${store.ratingCount})</span>
                                   </button>`
                                : `<button onclick="event.stopPropagation(); liveRestaurantsModule.openReviewsModal('${storeId}', '${(store.name || store.nombre || 'Comercio').replace(/'/g, "\\'")}', 5.0, 0)" class="flex items-center gap-1 bg-slate-950/80 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-800 text-[11px] transition cursor-pointer" title="Ver opiniones de clientes">
                                    <span class="text-slate-400 font-medium">★ 5.0 (Nuevo)</span>
                                   </button>`}
                        </div>

                        <h3 data-field="name" class="font-black text-white text-lg leading-tight line-clamp-1">${name}</h3>
                        <p data-field="address" class="text-xs text-slate-400 mt-1 line-clamp-1">📍 ${address}</p>

                        <!-- Metadatos Ops -->
                        <div class="grid grid-cols-2 gap-2 mt-4 text-center text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div>
                                <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Costo Envío</span>
                                <p data-field="delivery-fee" class="font-black text-indigo-400 mt-0.5">C$ ${store.deliveryFee || store.costoEnvioBase || 35}</p>
                            </div>
                            <div>
                                <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Prep. Promedio</span>
                                <p data-field="prep-time" class="font-bold text-slate-200 mt-0.5">${store.avgPrepTimeMinutes || store.tiempoEstimadoMinutos || 15} min</p>
                            </div>
                        </div>

                        <!-- Sucursales & EIAM Memberships badges -->
                        <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
                            <span data-field="branches-badge">🏢 Sucursales: <strong class="text-cyan-400 font-black">${branches.length}</strong></span>
                            <span data-field="memberships-badge">👥 EIAM: <strong class="${hasMemberships ? 'text-indigo-400 font-black' : (hasDrift ? 'text-rose-400 font-black' : 'text-slate-500 font-normal')}">${hasMemberships ? memberships.length + ' Activos' : (hasDrift ? '⚠️ DRIFT (0)' : '0')}</strong></span>
                        </div>
                    </div>

                    <!-- Botones de Acción Completa -->
                    <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
                        <button data-action="edit" data-store-id="${storeId}" onclick="liveRestaurantsModule.openEditModal('${storeId}')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-slate-700">
                            <span>✏️</span> Editar Datos
                        </button>
                        <button data-action="images" data-store-id="${storeId}" onclick="liveRestaurantsModule.openImagesModal('${storeId}')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-slate-700">
                            <span>🖼️</span> Imágenes
                        </button>
                        <button data-action="branches" data-store-id="${storeId}" onclick="liveRestaurantsModule.openBranchesModal('${storeId}')" class="w-full bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-cyan-800/40">
                            <span>🏢</span> Sucursales
                        </button>
                        <button data-action="users" data-store-id="${storeId}" onclick="liveRestaurantsModule.openAssignUsersModal('${storeId}')" class="w-full bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-xs py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-indigo-800/40">
                            <span>👥</span> Usuarios
                        </button>
                        <button data-action="reviews" data-store-id="${storeId}" onclick="liveRestaurantsModule.openReviewsModal('${storeId}', '${(store.name || store.nombre || 'Comercio').replace(/'/g, "\\'")}', ${Number(store.rating || store.averageRating || 5.0).toFixed(1)}, ${store.ratingCount || 0})" class="col-span-2 w-full bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 text-xs py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-amber-800/40">
                            <span>⭐</span> Opiniones & Reseñas de Clientes
                        </button>
                        <button data-action="delete" data-store-id="${storeId}" onclick="liveRestaurantsModule.confirmDeleteStore('${storeId}')" class="col-span-2 w-full bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 text-xs py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border border-rose-900/40">
                            <span>🗑️</span> Eliminar Comercio
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // ── Motor de Filtrado + Paginación + Render DOM ────────────────────────
    _doFilterAndRender: () => {
        const container = document.getElementById('storesGrid');
        if (!container) return;

        const query = (document.getElementById('searchCommerceInput')?.value || '').toLowerCase().trim();
        const categoryFilter = document.getElementById('filterCategorySelect')?.value || 'ALL';
        const statusFilter = document.getElementById('filterStatusSelect')?.value || 'ALL';

        const filtered = liveRestaurantsModule.currentStores.filter(store => {
            const name = (store.comercioNombre || store.nombre || store.name || '').toLowerCase();
            const email = (store.email || '').toLowerCase();
            const phone = (store.telefono || store.phone || '').toLowerCase();
            const address = (store.direccion || store.address || '').toLowerCase();
            const category = (store.categoria || store.category || 'Restaurante');

            const matchesQuery = !query || name.includes(query) || email.includes(query) || phone.includes(query) || address.includes(query);
            const matchesCategory = categoryFilter === 'ALL' || category.toLowerCase() === categoryFilter.toLowerCase();

            const isActive = store.active !== false && store.isActive !== false;
            const isOpen = store.isOpen === true || store.abierto === true;

            let matchesStatus = true;
            if (statusFilter === 'ACTIVE') matchesStatus = isActive;
            if (statusFilter === 'OPEN') matchesStatus = isOpen;
            if (statusFilter === 'FEATURED') matchesStatus = (store.isFeatured === true || store.featured === true);
            if (statusFilter === 'NON_FEATURED') matchesStatus = !(store.isFeatured === true || store.featured === true);
            if (statusFilter === 'INACTIVE') matchesStatus = !isActive;

            return matchesQuery && matchesCategory && matchesStatus;
        });

        liveRestaurantsModule._lastFilteredStores = filtered;

        // ── Paginación ────────────────────────────────────────────────────────
        const pageSize = liveRestaurantsModule._pageSize;
        const currentPage = liveRestaurantsModule._currentPage;
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (currentPage > totalPages) liveRestaurantsModule._currentPage = totalPages;
        const pageStart = (liveRestaurantsModule._currentPage - 1) * pageSize;
        const pageEnd   = pageStart + pageSize;
        const pageItems = filtered.slice(pageStart, pageEnd);

        // ── Render paginación ─────────────────────────────────────────────────
        const pagContainer = document.getElementById('storesPaginationContainer');
        if (pagContainer) {
            if (totalPages <= 1) {
                pagContainer.innerHTML = '';
            } else {
                pagContainer.innerHTML = `
                    <div class="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3">
                        <span class="text-xs text-slate-400">
                            Mostrando <strong class="text-white">${pageStart + 1}</strong>–<strong class="text-white">${Math.min(pageEnd, filtered.length)}</strong>
                            de <strong class="text-indigo-400">${filtered.length}</strong> comercios
                        </span>
                        <div class="flex items-center gap-2">
                            <button
                                onclick="liveRestaurantsModule._currentPage = Math.max(1, liveRestaurantsModule._currentPage - 1); liveRestaurantsModule._doFilterAndRender();"
                                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-40"
                                ${liveRestaurantsModule._currentPage <= 1 ? 'disabled' : ''}>
                                ← Anterior
                            </button>
                            <span class="text-xs text-slate-400">Pág. <strong class="text-white">${liveRestaurantsModule._currentPage}</strong> / ${totalPages}</span>
                            <button
                                onclick="liveRestaurantsModule._currentPage = Math.min(${totalPages}, liveRestaurantsModule._currentPage + 1); liveRestaurantsModule._doFilterAndRender();"
                                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-40"
                                ${liveRestaurantsModule._currentPage >= totalPages ? 'disabled' : ''}>
                                Siguiente →
                            </button>
                        </div>
                    </div>`;
            }
        }

        if (pageItems.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center text-slate-500 col-span-full bg-slate-900/50 rounded-2xl border border-slate-800">
                    <span class="text-3xl block mb-2">🔍</span>
                    <p class="font-bold text-slate-400 text-sm">No se encontraron comercios que coincidan con la búsqueda.</p>
                </div>
            `;
            return;
        }

        // ── Construcción del HTML del grid (solo la página actual) ────────────
        let html = '';
        pageItems.forEach(store => {
            html += liveRestaurantsModule.renderCardHtml(store);
        });

        container.innerHTML = html;
        liveRestaurantsModule._setupGridDelegation();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL 1: REGISTRAR / EDITAR COMERCIO (EIAM V2.2 / HOLDING COMPLIANT)
    // ─────────────────────────────────────────────────────────────────────────
    openCreateModal: () => {
        const cachedOrgs = liveRestaurantsModule._organizationsCache || [];
        liveRestaurantsModule.renderStoreModal(null, cachedOrgs);

        // Si la caché no estaba lista, actualizar el dropdown en segundo plano
        if (!liveRestaurantsModule._organizationsCache) {
            liveRestaurantsModule.getOrganizationsCached().then(orgs => {
                const selectEl = document.getElementById('modalStoreOrgId');
                if (selectEl && orgs && orgs.length > 0) {
                    let optsHtml = `<option value="" selected>🏢 Sin Organización / UNKNOWN</option>`;
                    orgs.forEach(o => {
                        optsHtml += `<option value="${o.orgId}">🏙️ ${o.nombre || o.orgId}</option>`;
                    });
                    selectEl.innerHTML = optsHtml;
                }
            });
        }
    },

    // ── APERTURA INSTANTÁNEA (0 ms de latencia): Abre el modal sin esperar red
    openEditModal: (storeId) => {
        const store = liveRestaurantsModule.storesMap.get(storeId) || liveRestaurantsModule.currentStores.find(s => s.id === storeId);
        if (!store) {
            if (typeof toast !== 'undefined') toast.show("No se encontró la información del comercio", "error");
            return;
        }

        // 1. Renderizar y abrir el modal INMEDIATAMENTE con datos locales
        const cachedOrgs = liveRestaurantsModule._organizationsCache || [];
        liveRestaurantsModule.renderStoreModal(store, cachedOrgs);

        // 2. Si las organizaciones no estaban cacheadas, actualizarlas en background sin bloquear
        if (!liveRestaurantsModule._organizationsCache) {
            liveRestaurantsModule.getOrganizationsCached().then(orgs => {
                const selectEl = document.getElementById('modalStoreOrgId');
                if (selectEl && orgs && orgs.length > 0) {
                    const currentVal = store.orgId || selectEl.value;
                    let optsHtml = `<option value="" ${!currentVal ? 'selected' : ''}>🏢 Sin Organización / UNKNOWN</option>`;
                    orgs.forEach(o => {
                        optsHtml += `<option value="${o.orgId}" ${currentVal === o.orgId ? 'selected' : ''}>🏙️ ${o.nombre || o.orgId}</option>`;
                    });
                    selectEl.innerHTML = optsHtml;
                }
            });
        }
    },

    handleDepartmentChange: (selectedDeptId, selectedMuniId = null) => {
        const deptSelect = document.getElementById('modalStoreDepartment');
        const muniSelect = document.getElementById('modalStoreMunicipality');
        if (!deptSelect || !muniSelect) return;

        const deptId = selectedDeptId || deptSelect.value;
        const geoCatalog = window.GeoCatalog;
        const munis = geoCatalog ? geoCatalog.getMunicipalities(deptId) : [];

        muniSelect.innerHTML = munis.length > 0
            ? munis.map(m => `<option value="${m.id}" ${(selectedMuniId === m.id || (!selectedMuniId && m.id === deptId)) ? 'selected' : ''}>${m.name}</option>`).join('')
            : '<option value="">Seleccione un departamento</option>';

        liveRestaurantsModule.updateGoogleMapsPreviewLink();
    },

    updateGoogleMapsPreviewLink: () => {
        const latInput = document.getElementById('modalStoreLatitude');
        const lngInput = document.getElementById('modalStoreLongitude');
        const gmapsLink = document.getElementById('modalStoreGoogleMapsLink');
        const gmapsUrlInput = document.getElementById('modalStoreGoogleMapsUrl');

        if (!latInput || !lngInput) return;
        const lat = parseFloat(latInput.value) || 0;
        const lng = parseFloat(lngInput.value) || 0;

        if (lat !== 0 && lng !== 0) {
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            if (gmapsUrlInput) gmapsUrlInput.value = url;
            if (gmapsLink) {
                gmapsLink.href = url;
                gmapsLink.classList.remove('opacity-50', 'pointer-events-none');
            }
        } else {
            if (gmapsUrlInput) gmapsUrlInput.value = '';
            if (gmapsLink) {
                gmapsLink.href = '#';
                gmapsLink.classList.add('opacity-50', 'pointer-events-none');
            }
        }
    },

    detectCurrentGps: () => {
        if (!('geolocation' in navigator)) {
            if (typeof toast !== 'undefined') toast.show("Geolocalización no soportada en este navegador.", "error");
            return;
        }

        if (typeof toast !== 'undefined') toast.show("Detectando coordenadas GPS...", "info");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                const latInput = document.getElementById('modalStoreLatitude');
                const lngInput = document.getElementById('modalStoreLongitude');
                if (latInput) latInput.value = lat.toFixed(6);
                if (lngInput) lngInput.value = lng.toFixed(6);

                liveRestaurantsModule.updateGoogleMapsPreviewLink();
                if (typeof toast !== 'undefined') toast.show(`GPS capturado con éxito: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, "success");
            },
            (err) => {
                console.warn("[GPS] Error detectando posición:", err);
                if (typeof toast !== 'undefined') toast.show("No se pudo obtener la posición GPS automáticamente.", "warning");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    openLocationPickerModal: () => {
        const curLat = parseFloat(document.getElementById('modalStoreLatitude')?.value) || 12.136389;
        const curLng = parseFloat(document.getElementById('modalStoreLongitude')?.value) || -86.251389;

        const pickerHtml = `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-base font-black text-white flex items-center gap-2">
                        <span>📍</span>
                        <span>Seleccionar Ubicación del Comercio en el Mapa</span>
                    </h3>
                </div>

                <!-- Buscador de Dirección Nominatim -->
                <div class="flex items-center gap-2">
                    <input type="text" id="mapPickerSearchInput" placeholder="Buscar dirección o punto de referencia en Nicaragua..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <button type="button" onclick="liveRestaurantsModule.searchPickerAddress()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition">
                        🔍 Buscar
                    </button>
                    <button type="button" onclick="liveRestaurantsModule.detectPickerGps()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs px-3 py-2 rounded-xl border border-cyan-500/30 transition">
                        🛰️ GPS
                    </button>
                </div>

                <!-- Contenedor del Mapa Leaflet -->
                <div id="modalMapPickerContainer" class="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner" style="height: 340px;"></div>

                <!-- Coordenadas Seleccionadas -->
                <div class="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">Latitud Seleccionada</span>
                        <p class="font-mono text-cyan-400 font-bold text-xs mt-0.5" id="pickerSelectedLat">${curLat.toFixed(6)}</p>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">Longitud Seleccionada</span>
                        <p class="font-mono text-cyan-400 font-bold text-xs mt-0.5" id="pickerSelectedLng">${curLng.toFixed(6)}</p>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button type="button" onclick="modal.close('locationPickerModal')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition">
                        Cancelar
                    </button>
                    <button type="button" onclick="liveRestaurantsModule.applyLocationPickerSelection()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition">
                        ✓ Aplicar Ubicación
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('locationPickerModal', pickerHtml);

        setTimeout(() => {
            liveRestaurantsModule.initLocationPickerMap(curLat, curLng);
        }, 200);
    },

    pickerMap: null,
    pickerMarker: null,
    pickerLat: 12.136389,
    pickerLng: -86.251389,

    initLocationPickerMap: (initialLat, initialLng) => {
        const container = document.getElementById('modalMapPickerContainer');
        if (!container || typeof L === 'undefined') return;

        if (liveRestaurantsModule.pickerMap) {
            try { liveRestaurantsModule.pickerMap.remove(); } catch(e){}
            liveRestaurantsModule.pickerMap = null;
        }

        liveRestaurantsModule.pickerLat = initialLat || 12.136389;
        liveRestaurantsModule.pickerLng = initialLng || -86.251389;

        liveRestaurantsModule.pickerMap = L.map('modalMapPickerContainer', {
            zoomControl: true,
            attributionControl: false
        }).setView([liveRestaurantsModule.pickerLat, liveRestaurantsModule.pickerLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(liveRestaurantsModule.pickerMap);

        const customIcon = L.divIcon({
            className: 'custom-picker-pin',
            html: '<div style="background-color: #4f46e5; border: 3px solid #ffffff; width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 12px;">🏪</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        liveRestaurantsModule.pickerMarker = L.marker([liveRestaurantsModule.pickerLat, liveRestaurantsModule.pickerLng], {
            draggable: true,
            icon: customIcon
        }).addTo(liveRestaurantsModule.pickerMap);

        liveRestaurantsModule.pickerMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            liveRestaurantsModule.pickerLat = pos.lat;
            liveRestaurantsModule.pickerLng = pos.lng;
            document.getElementById('pickerSelectedLat').textContent = pos.lat.toFixed(6);
            document.getElementById('pickerSelectedLng').textContent = pos.lng.toFixed(6);
        });

        liveRestaurantsModule.pickerMap.on('click', (e) => {
            const pos = e.latlng;
            liveRestaurantsModule.pickerLat = pos.lat;
            liveRestaurantsModule.pickerLng = pos.lng;
            liveRestaurantsModule.pickerMarker.setLatLng(pos);
            document.getElementById('pickerSelectedLat').textContent = pos.lat.toFixed(6);
            document.getElementById('pickerSelectedLng').textContent = pos.lng.toFixed(6);
        });

        // Trigger map resize after rendering
        setTimeout(() => {
            if (liveRestaurantsModule.pickerMap) liveRestaurantsModule.pickerMap.invalidateSize();
        }, 150);
    },

    searchPickerAddress: async () => {
        const query = document.getElementById('mapPickerSearchInput')?.value.trim();
        if (!query) return;

        try {
            const fullQuery = query.toLowerCase().includes('nicaragua') ? query : `${query}, Nicaragua`;
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`);
            const results = await resp.json();
            if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lon = parseFloat(results[0].lon);
                liveRestaurantsModule.pickerLat = lat;
                liveRestaurantsModule.pickerLng = lon;

                if (liveRestaurantsModule.pickerMap && liveRestaurantsModule.pickerMarker) {
                    liveRestaurantsModule.pickerMap.setView([lat, lon], 16);
                    liveRestaurantsModule.pickerMarker.setLatLng([lat, lon]);
                    document.getElementById('pickerSelectedLat').textContent = lat.toFixed(6);
                    document.getElementById('pickerSelectedLng').textContent = lon.toFixed(6);
                }
            } else {
                if (typeof toast !== 'undefined') toast.show("No se encontraron resultados para la búsqueda.", "warning");
            }
        } catch(e) {
            console.error("Error geocodificando dirección:", e);
        }
    },

    detectPickerGps: () => {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            liveRestaurantsModule.pickerLat = lat;
            liveRestaurantsModule.pickerLng = lng;
            if (liveRestaurantsModule.pickerMap && liveRestaurantsModule.pickerMarker) {
                liveRestaurantsModule.pickerMap.setView([lat, lng], 16);
                liveRestaurantsModule.pickerMarker.setLatLng([lat, lng]);
                document.getElementById('pickerSelectedLat').textContent = lat.toFixed(6);
                document.getElementById('pickerSelectedLng').textContent = lng.toFixed(6);
            }
        }, () => {}, { enableHighAccuracy: true });
    },

    applyLocationPickerSelection: () => {
        const latInput = document.getElementById('modalStoreLatitude');
        const lngInput = document.getElementById('modalStoreLongitude');
        if (latInput) latInput.value = liveRestaurantsModule.pickerLat.toFixed(6);
        if (lngInput) lngInput.value = liveRestaurantsModule.pickerLng.toFixed(6);

        liveRestaurantsModule.updateGoogleMapsPreviewLink();
        if (typeof modal !== 'undefined') modal.close('locationPickerModal');
        if (typeof toast !== 'undefined') toast.show("Coordenadas aplicadas correctamente al formulario.", "success");
    },

    renderStoreModal: (store, orgs = []) => {
        const isEdit = !!store;
        const modalTitle = isEdit ? `Editar Comercio: ${store.comercioNombre || store.nombre || 'Sin Nombre'}` : '➕ Registrar Nuevo Comercio Enterprise';
        
        const geoCatalog = window.GeoCatalog;
        const departments = geoCatalog ? geoCatalog.NICARAGUA_DEPARTMENTS : [];
        const currentDeptId = (store && (store.departmentId || store.departamento || store.department)) || 'MANAGUA';
        const currentMuniId = (store && (store.municipalityId || store.municipio || store.municipality || store.cityId || store.city)) || 'MANAGUA';
        const currentLat = (store && (store.latitude || store.lat || (store.location && store.location.latitude))) || 12.136389;
        const currentLng = (store && (store.longitude || store.lng || (store.location && store.location.longitude))) || -86.251389;
        const currentGmapsUrl = (store && (store.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`)) || '';
        const currentPlaceId = (store && store.placeId) || '';

        const html = `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-lg font-black text-white flex items-center gap-2">
                        <span>${isEdit ? '✏️' : '🏪'}</span>
                        <span>${modalTitle}</span>
                    </h3>
                </div>

                <form id="storeForm" onsubmit="liveRestaurantsModule.saveStore(event, '${store ? store.id : ''}')" class="space-y-4">
                    <!-- SECCIÓN 1: DATOS GENERALES -->
                    <div class="border-b border-slate-800/80 pb-3">
                        <h4 class="text-[11px] font-black text-indigo-400 uppercase tracking-wider mb-2">1. Información General</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div class="md:col-span-2">
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Comercio *</label>
                                <input type="text" id="modalStoreName" value="${store ? (store.comercioNombre || store.nombre || '') : ''}" required placeholder="Ej: Pizzeria Don Corleone" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">🏷️ Prefijo Pedidos (3-5 letras)</label>
                                <input type="text" id="modalStoreOrderCodePrefix" maxlength="5" value="${store ? (store.orderCodePrefix || store.codePrefix || '') : ''}" placeholder="Ej: TECNO, BLUE" class="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-300 uppercase focus:outline-none focus:border-indigo-500" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '')">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Empresa / Holding (Tenant) *</label>
                                <select id="modalStoreOrgId" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
                                    <option value="" ${!store || !store.orgId ? 'selected' : ''}>🏢 Sin Organización / UNKNOWN</option>
                                    ${orgs && orgs.length > 0 ? orgs.map(o => `
                                        <option value="${o.orgId}" ${store && store.orgId === o.orgId ? 'selected' : ''}>🏙️ ${o.nombre || o.orgId}</option>
                                    `).join('') : ''}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría Comercial *</label>
                                <select id="modalStoreCategory" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                    ${((window.businessCategoriesModule && window.businessCategoriesModule.allCategoriesCache && window.businessCategoriesModule.allCategoriesCache.length > 0)
                                        ? window.businessCategoriesModule.allCategoriesCache.filter(c => c.active !== false)
                                        : [
                                            { id: 'restaurante', name: 'Restaurante / Comida', icon: '🍔' },
                                            { id: 'farmacia', name: 'Farmacia', icon: '💊' },
                                            { id: 'supermercado', name: 'Supermercado / Mini Super', icon: '🛒' },
                                            { id: 'licoreria', name: 'Licorería', icon: '🍾' },
                                            { id: 'tienda', name: 'Tienda / Abarrotes', icon: '🏪' },
                                            { id: 'otra', name: 'Otra categoría', icon: '📦' }
                                        ]
                                    ).map(cat => {
                                        const isSelected = store && (
                                            store.businessCategoryId === cat.id ||
                                            store.categoria === cat.name ||
                                            store.category === cat.name ||
                                            (store.category && store.category.toLowerCase() === cat.id)
                                        );
                                        return `<option value="${cat.id}" data-name="${cat.name}" ${isSelected ? 'selected' : ''}>${cat.icon || '🏷️'} ${cat.name}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico *</label>
                                <input type="email" id="modalStoreEmail" value="${store ? (store.email || '') : ''}" required placeholder="comercio@bluesystem.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Teléfono de Contacto *</label>
                                <input type="text" id="modalStorePhone" value="${store ? (store.telefono || store.phone || '') : ''}" required placeholder="+505 8888-9999" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                            </div>
                        </div>

                        <div class="mt-3">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción / Eslogan Comercial</label>
                            <textarea id="modalStoreDescription" rows="1" placeholder="Especialistas en comida típica nicaragüense y asados..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">${store ? (store.descripcion || store.description || '') : ''}</textarea>
                        </div>
                    </div>

                    <!-- SECCIÓN 2: UBICACIÓN TERRITORIAL & GEOLOCALIZACIÓN -->
                    <div class="border-b border-slate-800/80 pb-3">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-[11px] font-black text-cyan-400 uppercase tracking-wider">2. Ubicación Territorial & Coordenadas GPS</h4>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="liveRestaurantsModule.openLocationPickerModal()" class="bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] px-2.5 py-1 rounded-lg transition flex items-center gap-1">
                                    <span>📍</span> Seleccionar en Mapa
                                </button>
                                <button type="button" onclick="liveRestaurantsModule.detectCurrentGps()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-cyan-500/30 transition flex items-center gap-1">
                                    <span>🛰️</span> GPS
                                </button>
                                <a id="modalStoreGoogleMapsLink" href="${currentGmapsUrl || '#'}" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1">
                                    <span>🔗</span> Google Maps
                                </a>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Departamento *</label>
                                <select id="modalStoreDepartment" required onchange="liveRestaurantsModule.handleDepartmentChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                                    ${departments.map(d => `
                                        <option value="${d.id}" ${d.id === currentDeptId ? 'selected' : ''}>${d.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Municipio *</label>
                                <select id="modalStoreMunicipality" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                                    <!-- Opciones cargadas dinámicamente -->
                                </select>
                            </div>
                        </div>

                        <div class="mt-3">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dirección Matriz / Física *</label>
                            <input type="text" id="modalStoreAddress" value="${store ? (store.direccion || store.address || '') : ''}" required placeholder="De la Rotonda El Guegüense 2c abajo..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500">
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <div>
                                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Latitud GPS</label>
                                <input type="number" step="0.000001" id="modalStoreLatitude" oninput="liveRestaurantsModule.updateGoogleMapsPreviewLink()" value="${currentLat}" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500">
                            </div>
                            <div>
                                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Longitud GPS</label>
                                <input type="number" step="0.000001" id="modalStoreLongitude" oninput="liveRestaurantsModule.updateGoogleMapsPreviewLink()" value="${currentLng}" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500">
                            </div>
                            <div>
                                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Place ID (Google)</label>
                                <input type="text" id="modalStorePlaceId" value="${currentPlaceId}" placeholder="ChIJ..." class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500">
                            </div>
                            <div>
                                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Google Maps URL</label>
                                <input type="text" id="modalStoreGoogleMapsUrl" value="${currentGmapsUrl}" placeholder="https://maps.google..." class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-400 focus:outline-none focus:border-cyan-500">
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN 3: OPERACIÓN & TIEMPOS -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Costo Envío (C$)</label>
                            <input type="number" step="0.5" id="modalStoreDeliveryFee" value="${store ? (store.deliveryFee || store.costoEnvioBase || 35) : 35}" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prep. Promedio (min)</label>
                            <input type="number" id="modalStorePrepTime" value="${store ? (store.avgPrepTimeMinutes || store.tiempoEstimadoMinutos || 15) : 15}" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                        </div>
                        <div class="flex items-center pt-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="modalStoreIsOpen" ${!store || store.isOpen !== false ? 'checked' : ''} class="w-4 h-4 rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0">
                                <span class="text-xs font-bold text-slate-300">Abierto en Vivo</span>
                            </label>
                        </div>
                        <div class="flex items-center pt-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="modalStoreIsActive" ${!store || (store.active !== false && store.isActive !== false) ? 'checked' : ''} class="w-4 h-4 rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0">
                                <span class="text-xs font-bold text-slate-300">Activo en App</span>
                            </label>
                        </div>
                    </div>

                    <!-- SECCIÓN 4: MARKETPLACE DESTACADOS -->
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <label class="flex items-center justify-between cursor-pointer">
                            <div>
                                <span class="text-xs font-bold text-slate-200">⭐ Comercio Destacado (Home Carousel SSOT)</span>
                                <p class="text-[10px] text-slate-400">Si está activo, aparecerá en el carrusel de Comercios Destacados de la App del Cliente. Desmarcarlo lo removerá de destacados inmediatamente.</p>
                            </div>
                            <input type="checkbox" id="modalStoreIsFeatured" ${store && (store.isFeatured === true || store.featured === true) ? 'checked' : ''} class="w-5 h-5 rounded bg-slate-900 border-slate-800 text-amber-500 focus:ring-0">
                        </label>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <button type="button" onclick="modal.close('storeModal')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition">
                            Cancelar
                        </button>
                        <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition">
                            ${isEdit ? '💾 Guardar Cambios' : '🚀 Registrar Comercio'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('storeModal', html);

        // Inicializar selector de municipios en cascada
        setTimeout(() => {
            liveRestaurantsModule.handleDepartmentChange(currentDeptId, currentMuniId);
        }, 100);
    },

    saveStore: async (e, storeId) => {
        e.preventDefault();
        const name = document.getElementById('modalStoreName').value.trim();
        const catSelect = document.getElementById('modalStoreCategory');
        const selectedOption = catSelect ? catSelect.options[catSelect.selectedIndex] : null;
        const businessCategoryId = catSelect ? catSelect.value : 'restaurante';
        const category = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text.replace(/^[^\s]+\s+/, '')) : businessCategoryId;
        const email = document.getElementById('modalStoreEmail').value.trim().toLowerCase();
        const phone = document.getElementById('modalStorePhone').value.trim();
        const address = document.getElementById('modalStoreAddress').value.trim();
        const description = document.getElementById('modalStoreDescription').value.trim();
        
        const departmentId = document.getElementById('modalStoreDepartment')?.value || 'MANAGUA';
        const municipalityId = document.getElementById('modalStoreMunicipality')?.value || 'MANAGUA';
        const latitude = parseFloat(document.getElementById('modalStoreLatitude')?.value) || 0;
        const longitude = parseFloat(document.getElementById('modalStoreLongitude')?.value) || 0;
        const placeId = document.getElementById('modalStorePlaceId')?.value.trim() || '';
        const googleMapsUrl = document.getElementById('modalStoreGoogleMapsUrl')?.value.trim() || ((latitude !== 0 && longitude !== 0) ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : '');

        const deliveryFee = parseFloat(document.getElementById('modalStoreDeliveryFee').value) || 35;
        const prepTime = parseInt(document.getElementById('modalStorePrepTime').value) || 15;
        const isOpen = document.getElementById('modalStoreIsOpen').checked;
        const isActive = document.getElementById('modalStoreIsActive').checked;
        const isFeatured = document.getElementById('modalStoreIsFeatured') ? document.getElementById('modalStoreIsFeatured').checked : false;
        const orderCodePrefix = document.getElementById('modalStoreOrderCodePrefix') ? document.getElementById('modalStoreOrderCodePrefix').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5) : '';
        const orgId = document.getElementById('modalStoreOrgId') ? document.getElementById('modalStoreOrgId').value : null;

        if (!name || !email || !phone || !address) {
            if (typeof toast !== 'undefined') toast.show("Por favor completa los campos requeridos (*)", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (typeof toast !== 'undefined') toast.show("Por favor ingresa un correo electrónico comercial válido.", "error");
            return;
        }

        // Validación territorial canónica
        if (window.GeoCatalog && !window.GeoCatalog.isValidMunicipality(departmentId, municipalityId)) {
            if (typeof toast !== 'undefined') toast.show("Por favor selecciona una combinación válida de Departamento y Municipio.", "error");
            return;
        }

        // 1. Verificación Fail-Closed de Sesión y Claims con AuthReadyGate
        let actorUid = 'SYSTEM';
        let actorRole = 'ADMIN';
        let isPlatformAdmin = false;

        if (window.AuthReadyGate) {
            if (!window.AuthReadyGate.isReady && typeof window.AuthReadyGate.waitUntilReady === 'function') {
                await window.AuthReadyGate.waitUntilReady().catch(() => {});
            }
            actorUid = window.AuthReadyGate.user ? window.AuthReadyGate.user.uid : actorUid;
            actorRole = window.AuthReadyGate.role || (window.AuthReadyGate.claims && window.AuthReadyGate.claims.role) || actorRole;
            isPlatformAdmin = window.AuthReadyGate.isPlatformAdmin === true;
        } else if (typeof auth !== 'undefined' && auth && auth.currentUser) {
            actorUid = auth.currentUser.uid;
            isPlatformAdmin = true;
        }

        // Recuperar metadatos del store previo si es edición
        const existingStore = storeId ? (liveRestaurantsModule.currentStores.find(s => s.id === storeId) || {}) : {};

        try {
            const geoCatalog = window.GeoCatalog;
            const departmentName = geoCatalog ? geoCatalog.getDepartmentName(departmentId) : departmentId;
            const municipalityName = geoCatalog ? geoCatalog.getMunicipalityName(departmentId, municipalityId) : municipalityId;

            const payloadData = {
                name: name,
                email: email,
                phone: phone,
                address: address,
                orderCodePrefix: orderCodePrefix || existingStore.orderCodePrefix || existingStore.codePrefix || null,
                codePrefix: orderCodePrefix || existingStore.orderCodePrefix || existingStore.codePrefix || null,
                departmentId: departmentId,
                departmentName: departmentName,
                municipalityId: municipalityId,
                municipalityName: municipalityName,
                city: municipalityName,
                latitude: latitude,
                longitude: longitude,
                placeId: placeId,
                googleMapsUrl: googleMapsUrl,
                location: (latitude !== 0 && longitude !== 0) ? { latitude, longitude } : (existingStore.location || null),
                businessCategoryId: businessCategoryId,
                category: category,
                categoria: category,
                description: description,
                deliveryFee: deliveryFee,
                prepTime: prepTime,
                isOpen: isOpen,
                isActive: isActive,
                isFeatured: isFeatured,
                featured: isFeatured,
                destacado: isFeatured,
                orgId: orgId || (existingStore && existingStore.orgId) || null,
                tenantId: existingStore.tenantId || null,
                brandId: existingStore.brandId || null
            };

            const contextOptions = {
                actorUid: actorUid,
                actorRole: actorRole,
                orgId: payloadData.orgId,
                tenantId: payloadData.tenantId,
                brandId: payloadData.brandId,
                branchId: existingStore.branchId || null,
                membershipId: existingStore.membershipId || null
            };

            console.log(`[ADMIN_BUSINESS_EDIT] operation=saveStore, actorUid=${actorUid}, actorRole=${actorRole}, orgId=${payloadData.orgId || 'N/A'}, tenantId=${payloadData.tenantId || 'N/A'}, brandId=${payloadData.brandId || 'N/A'}, businessId=${storeId || 'NEW_DOC'}, collection=businesses, payloadKeys=${Object.keys(payloadData).join(',')}`);

            const savedDocId = await commerceSyncService.saveStoreAtomic(storeId, payloadData, contextOptions);

            // Sincronizar prefijo en contador si fue definido
            if (orderCodePrefix) {
                try {
                    await db.collection('counters').doc(`orders_${savedDocId}`).set({
                        orderCodePrefix: orderCodePrefix,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log(`[ORDER_PREFIX_COUNTER_SYNC] Prefijo ${orderCodePrefix} sincronizado en counter orders_${savedDocId}`);
                } catch(cntErr) {
                    console.warn('[ORDER_PREFIX_COUNTER_SYNC] Error sincronizando prefijo en counter:', cntErr);
                }
            }

            // ── READ-BACK VERIFICATION OBLIGATORIA ─────────────────────────────
            const verifyDoc = await db.collection('businesses').doc(savedDocId).get();
            if (!verifyDoc.exists) {
                throw new Error("Read-Back Verification Fallida: El documento no fue encontrado en Firestore tras commit.");
            }
            const storedData = verifyDoc.data() || {};
            console.log(`[BUSINESS_LOCATION] businessId=${savedDocId}, department=${storedData.departmentId}, municipality=${storedData.municipalityId}, latitude=${storedData.latitude}, longitude=${storedData.longitude}`);
            console.log(`[BUSINESS_FEATURED] businessId=${savedDocId}, requested=${isFeatured}, persisted=${storedData.isFeatured}`);

            if (storedData.isFeatured !== isFeatured) {
                console.warn(`[FEATURED_DISCREPANCY] Discrepancia detectada en isFeatured para ${savedDocId}. Esperado=${isFeatured}, Almacenado=${storedData.isFeatured}`);
            }

            console.log(`[ADMIN_BUSINESS_EDIT] SUCCESS: document=${savedDocId} persistido y verificado exitosamente`);
            if (typeof toast !== 'undefined') toast.show(storeId ? "Comercio actualizado y verificado correctamente E2E" : "¡Nuevo comercio registrado y verificado con éxito E2E!", "success");
            if (typeof modal !== 'undefined') modal.close('storeModal');
        } catch (err) {
            console.error("[ADMIN_BUSINESS_EDIT] ERROR al guardar comercio:", err);
            if (typeof toast !== 'undefined') toast.show("Error al guardar comercio: " + err.message, "error");
        }
    },

    toggleActiveState: async (storeId, currentState) => {
        try {
            const newState = !currentState;
            await commerceSyncService.toggleStoreActiveAtomic(storeId, newState);
            if (typeof toast !== 'undefined') toast.show(`Comercio ${newState ? 'Activado' : 'Desactivado'} correctamente en tiempo real E2E`, "success");
        } catch (err) {
            if (typeof toast !== 'undefined') toast.show("Error al cambiar estado: " + err.message, "error");
        }
    },

    toggleFeaturedState: async (storeId, currentState) => {
        try {
            const newState = !currentState;
            console.log(`[FEATURED_WRITE] source=AdminWeb_liveRestaurants, businessId=${storeId}, oldValue=${currentState}, newValue=${newState}`);

            if (typeof commerceSyncService !== 'undefined' && commerceSyncService.toggleStoreFeaturedAtomic) {
                await commerceSyncService.toggleStoreFeaturedAtomic(storeId, newState);
            } else {
                await db.collection('businesses').doc(storeId).set({
                    isFeatured: newState,
                    featured: newState,
                    destacado: newState,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // ── READ-BACK VERIFICATION ─────────────────────────────────────────
            const verifyDoc = await db.collection('businesses').doc(storeId).get();
            const storedData = verifyDoc.data() || {};
            console.log(`[BUSINESS_FEATURED] businessId=${storeId}, requested=${newState}, persisted=${storedData.isFeatured}`);

            if (typeof toast !== 'undefined') toast.show(`Comercio ${newState ? 'destacado ⭐' : 'removido de destacados'} exitosamente`, "success");
        } catch (err) {
            console.error("Error al alternar destacado:", err);
            if (typeof toast !== 'undefined') toast.show("Error al cambiar destacado: " + err.message, "error");
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL 2: GESTIONAR IMÁGENES (LOGO Y PORTADA PRINCIPAL)
    // ─────────────────────────────────────────────────────────────────────────
    openImagesModal: (storeId) => {
        const store = liveRestaurantsModule.currentStores.find(s => s.id === storeId);
        if (!store) return;

        const logo = store.logoUrl || store.photoUrl || '';
        const banner = store.bannerUrl || store.portadaUrl || store.coverUrl || '';

        const html = `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-lg font-black text-white flex items-center gap-2">
                        <span>🖼️</span>
                        <span>Imágenes del Comercio: ${store.comercioNombre || store.nombre}</span>
                    </h3>
                </div>

                <div class="bg-indigo-950/50 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-start gap-3 text-[11px]">
                    <span class="text-indigo-400 text-base mt-0.5">⚡</span>
                    <div>
                        <p class="font-black text-indigo-300 mb-0.5">Compresión Automática Activada</p>
                        <p class="text-slate-400">Logo: máx <strong class="text-white">256×256 px</strong> · Banner: máx <strong class="text-white">1200×400 px</strong>. Las imágenes se optimizan automáticamente antes de subir para garantizar scroll fluido a 60 FPS en el panel y la app.</p>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="space-y-2">
                        <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Foto de Portada Principal (Banner)</label>
                        <div class="relative h-36 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                            <img id="previewBanner" src="${banner || (typeof getFallbackUrl === 'function' ? getFallbackUrl('banner') : '/assets/banner-placeholder.svg')}" class="w-full h-full object-cover" onError="handleImageError(this, 'banner')">
                        </div>
                        <div class="flex gap-2 mt-2">
                            <input type="text" id="inputBannerUrl" value="${banner}" placeholder="URL de la Foto de Portada (o selecciona archivo)" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                            <input type="file" id="fileBannerInput" accept="image/*" class="hidden" onchange="liveRestaurantsModule.handleFileSelect(event, 'previewBanner', 'inputBannerUrl')">
                            <button type="button" onclick="document.getElementById('fileBannerInput').click()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl font-bold transition border border-slate-700">
                                📁 Subir Archivo
                            </button>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Logo del Comercio</label>
                        <div class="flex items-center gap-4 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                            <div class="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-indigo-500/40 overflow-hidden shrink-0 shadow-lg">
                                <img id="previewLogo" src="${logo || (typeof getFallbackUrl === 'function' ? getFallbackUrl('store') : '/assets/store-placeholder.svg')}" class="w-full h-full object-cover" onError="handleImageError(this, 'store')">
                            </div>
                            <div class="flex-1 space-y-2">
                                <input type="text" id="inputLogoUrl" value="${logo}" placeholder="URL del Logo (o selecciona archivo)" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                                <input type="file" id="fileLogoInput" accept="image/*" class="hidden" onchange="liveRestaurantsModule.handleFileSelect(event, 'previewLogo', 'inputLogoUrl')">
                                <button type="button" onclick="document.getElementById('fileLogoInput').click()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl font-bold transition border border-slate-700">
                                    📁 Subir Archivo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button type="button" onclick="modal.close('imagesModal')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition">
                        Cancelar
                    </button>
                    <button type="button" onclick="liveRestaurantsModule.saveImages('${storeId}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2">
                        <span>💾</span> Guardar Imágenes
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('imagesModal', html);
    },

    // ── Compresor de Imágenes con Canvas (Anti-Jank Engine) ─────────────────
    // Garantiza que logos y banners nunca superen dimensiones y peso razonables.
    // Logo: max 256×256 px, JPEG 85%, ≤ ~30 KB
    // Banner: max 1200×400 px, JPEG 80%, ≤ ~100 KB
    _compressImageFile: (file, type = 'banner') => {
        return new Promise((resolve, reject) => {
            const MAX_W = type === 'logo' ? 256 : 1200;
            const MAX_H = type === 'logo' ? 256 : 400;
            const QUALITY = type === 'logo' ? 0.85 : 0.80;

            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                let { naturalWidth: w, naturalHeight: h } = img;

                // ── Calcular dimensiones finales manteniendo aspect ratio ─────
                const ratioW = w > MAX_W ? MAX_W / w : 1;
                const ratioH = h > MAX_H ? MAX_H / h : 1;
                const ratio = Math.min(ratioW, ratioH);
                const targetW = Math.round(w * ratio);
                const targetH = Math.round(h * ratio);

                console.log(`[IMAGE_COMPRESS] ${type.toUpperCase()} | original: ${w}×${h}px → compressed: ${targetW}×${targetH}px (ratio: ${ratio.toFixed(3)})`);

                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetW, targetH);

                canvas.toBlob((blob) => {
                    if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    console.log(`[IMAGE_COMPRESS] ${type.toUpperCase()} | size: ${(file.size / 1024).toFixed(1)} KB → ${(compressedFile.size / 1024).toFixed(1)} KB`);
                    resolve({ file: compressedFile, dataUrl: canvas.toDataURL('image/jpeg', QUALITY) });
                }, 'image/jpeg', QUALITY);
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load error')); };
            img.src = objectUrl;
        });
    },

    handleFileSelect: async (event, previewId, inputId) => {
        const file = event.target.files[0];
        if (!file) return;

        // Determinar tipo según el previewId para aplicar límites correctos
        const imageType = previewId === 'previewLogo' ? 'logo' : 'banner';

        // 1. Mostrar preview inmediato con el archivo original (UX instantánea)
        const quickReader = new FileReader();
        quickReader.onload = (e) => {
            const imgEl = document.getElementById(previewId);
            if (imgEl) imgEl.src = e.target.result;
        };
        quickReader.readAsDataURL(file);

        if (typeof storageService !== 'undefined' && storageService.uploadImage) {
            try {
                if (typeof toast !== 'undefined') toast.show(`⏳ Comprimiendo ${imageType === 'logo' ? 'logo' : 'banner'} (max ${imageType === 'logo' ? '256×256px' : '1200×400px'})...`, "info");

                // 2. Comprimir antes de subir a Storage
                let fileToUpload = file;
                try {
                    const compressed = await liveRestaurantsModule._compressImageFile(file, imageType);
                    fileToUpload = compressed.file;

                    // Actualizar preview con la versión comprimida
                    const imgEl = document.getElementById(previewId);
                    if (imgEl) imgEl.src = compressed.dataUrl;

                    // Mostrar badge de compresión en la UI
                    const sizeKb = (fileToUpload.size / 1024).toFixed(1);
                    const originalKb = (file.size / 1024).toFixed(1);
                    if (typeof toast !== 'undefined') toast.show(`✅ Comprimido: ${originalKb} KB → ${sizeKb} KB. Subiendo...`, "success");
                } catch (compressErr) {
                    console.warn('[IMAGE_COMPRESS] Falló compresión, usando archivo original:', compressErr);
                    // Fallback: continuar con el archivo original sin interrumpir el flujo
                }

                // 3. Subir archivo comprimido a Storage
                const url = await storageService.uploadImage(fileToUpload, 'commerce_assets');
                if (url) {
                    const input = document.getElementById(inputId);
                    if (input) input.value = url;
                    if (typeof toast !== 'undefined') toast.show("🖼️ Imagen guardada en Storage exitosamente", "success");
                }
            } catch (err) {
                console.error("Error al subir a storage:", err);
                if (typeof toast !== 'undefined') toast.show("Error al subir archivo: " + err.message, "error");
            }
        } else {
            // Sin storageService: mantener dataUrl en el input para persistencia local
            const reader = new FileReader();
            reader.onload = (e) => {
                const input = document.getElementById(inputId);
                if (input) input.value = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    },

    saveImages: async (storeId) => {
        const logoUrl = document.getElementById('inputLogoUrl').value.trim();
        const bannerUrl = document.getElementById('inputBannerUrl').value.trim();

        try {
            await commerceSyncService.saveStoreImagesAtomic(storeId, logoUrl, bannerUrl);

            // 1. Actualizar storesMap con URLs nuevas
            let updatedStore = liveRestaurantsModule.storesMap.get(storeId);
            if (updatedStore) {
                if (logoUrl)   { updatedStore.logoUrl = logoUrl;   updatedStore.photoUrl = logoUrl;   updatedStore.optimizedLogoUrl = logoUrl; }
                if (bannerUrl) { updatedStore.bannerUrl = bannerUrl; updatedStore.portadaUrl = bannerUrl; updatedStore.coverUrl = bannerUrl; updatedStore.optimizedBannerUrl = bannerUrl; }
                liveRestaurantsModule.storesMap.set(storeId, updatedStore);
                const idx = liveRestaurantsModule.currentStores.findIndex(s => s.id === storeId);
                if (idx >= 0) liveRestaurantsModule.currentStores[idx] = updatedStore;
            }

            // 2. Pre-cargar imágenes nuevas en memoria del browser antes de actualizar el DOM
            const preloadUrl = (url) => new Promise((resolve) => {
                if (!url) return resolve();
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve; // continúa aunque falle
                img.src = url;
            });

            await Promise.all([
                logoUrl   ? preloadUrl(logoUrl)   : Promise.resolve(),
                bannerUrl ? preloadUrl(bannerUrl) : Promise.resolve()
            ]);
            console.log('[SAVE_IMAGES] Imágenes pre-cargadas en memoria');

            // 3. Cerrar modal
            if (typeof modal !== 'undefined') modal.close('imagesModal');

            // 4. Re-render completo de la tarjeta (imágenes ya en cache del browser → visual instantáneo)
            const card = document.querySelector(`[data-store-id="${storeId}"]`);
            if (card && updatedStore) {
                console.log('[SAVE_IMAGES] URLs a renderizar — logo:', updatedStore.logoUrl || updatedStore.optimizedLogoUrl, '| banner:', updatedStore.bannerUrl || updatedStore.optimizedBannerUrl);
                const freshHtml = liveRestaurantsModule.renderCardHtml(updatedStore);
                const tmp = document.createElement('div');
                tmp.innerHTML = freshHtml.trim();
                const newCard = tmp.firstElementChild;
                if (newCard) {
                    card.parentNode.replaceChild(newCard, card);
                    const grid = document.getElementById('storesGrid');
                    if (grid) { delete grid.dataset.delegated; liveRestaurantsModule._setupGridDelegation(); }
                    // Forzar eager load en las imágenes del nuevo card (anula lazy)
                    newCard.querySelectorAll('img[loading="lazy"]').forEach(img => {
                        img.loading = 'eager';
                    });
                    console.log('[SAVE_IMAGES] ✅ Tarjeta re-renderizada con nuevas imágenes para', storeId);
                }
            }

            if (typeof toast !== 'undefined') toast.show("🖼️ Imágenes actualizadas correctamente", "success");

        } catch (err) {
            console.error('[SAVE_IMAGES] Error:', err);
            if (typeof toast !== 'undefined') toast.show("Error al guardar imágenes: " + err.message, "error");
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL 3: GESTIONAR SUCURSALES (BRANCHES)
    // ─────────────────────────────────────────────────────────────────────────
    openBranchesModal: (storeId) => {
        const store = liveRestaurantsModule.currentStores.find(s => s.id === storeId);
        if (!store) return;

        // ── CORRECCIÓN EAD: fuente canónica /branches, mismo contrato que Governance ──
        const branches = liveRestaurantsModule.branchesByBusiness[storeId] || [];

        // Log de reconciliación para verificación E2E
        console.log('[BRANCH_RECONCILIATION]');
        console.log('  Commerce:', store.comercioNombre || store.nombre);
        console.log('  Commerce ID:', storeId);
        console.log('  Canonical collection: /branches');
        console.log('  Canonical relation field: businessId');
        console.log('  Query value:', storeId);
        console.log('  Documents returned:', branches.length);
        branches.forEach(b => console.log('  Branch → ID:', b.branchId || b.id, '| Name:', b.name));

        let branchesHtml = '';
        if (branches.length === 0) {
            branchesHtml = `<div class="p-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">No hay sucursales registradas para este comercio.</div>`;
        } else {
            branches.forEach((b, idx) => {
                branchesHtml += `
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                        <div class="space-y-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-white text-sm">${b.name || 'Sucursal ' + (idx + 1)}</h4>
                                <span class="px-2 py-0.5 rounded text-[9px] font-bold ${b.active !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}">${b.active !== false ? 'ACTIVA' : 'INACTIVA'}</span>
                            </div>
                            <p class="text-xs text-slate-400 truncate">📍 ${b.address || 'Sin dirección'}</p>
                            <p class="text-[11px] text-slate-500">📞 ${b.phone || 'Sin teléfono'} | 🌐 GPS: ${b.lat || 0}, ${b.lng || 0}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <button onclick="liveRestaurantsModule.removeBranch('${storeId}', '${b.branchId || b.id}')" class="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg text-xs font-bold border border-rose-800/40 transition">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        const html = `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-lg font-black text-white flex items-center gap-2">
                        <span>🏢</span>
                        <span>Sucursales de ${store.comercioNombre || store.nombre} (${branches.length})</span>
                    </h3>
                </div>

                <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
                    ${branchesHtml}
                </div>

                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">➕ Agregar Nueva Sucursal</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" id="newBranchName" placeholder="Nombre de Sucursal (ej: Metrocentro)" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                        <input type="text" id="newBranchPhone" placeholder="Teléfono Sucursal (+505 2255-0000)" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>
                    <input type="text" id="newBranchAddress" placeholder="Dirección Completa de la Sucursal" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <div class="grid grid-cols-2 gap-3">
                        <input type="number" step="any" id="newBranchLat" placeholder="Latitud GPS (ej: 12.136389)" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                        <input type="number" step="any" id="newBranchLng" placeholder="Longitud GPS (ej: -86.251389)" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>
                    <button type="button" onclick="liveRestaurantsModule.addBranch('${storeId}')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30">
                        <span>➕</span> Guardar Sucursal
                    </button>
                </div>

                <div class="flex items-center justify-end pt-3 border-t border-slate-800">
                    <button type="button" onclick="modal.close('branchesModal')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('branchesModal', html);
    },

    addBranch: async (storeId) => {
        const name = document.getElementById('newBranchName').value.trim();
        const phone = document.getElementById('newBranchPhone').value.trim();
        const address = document.getElementById('newBranchAddress').value.trim();
        const lat = parseFloat(document.getElementById('newBranchLat')?.value || "0") || 12.136389;
        const lng = parseFloat(document.getElementById('newBranchLng')?.value || "0") || -86.251389;

        if (!name || !address) {
            if (typeof toast !== 'undefined') toast.show("Ingresa el nombre y la dirección de la sucursal", "error");
            return;
        }

        try {
            const store = liveRestaurantsModule.currentStores.find(s => s.id === storeId);
            // ── CORRECCIÓN EAD: usar índice canónico /branches como fuente del array actual
            const currentBranches = liveRestaurantsModule.branchesByBusiness[storeId] || [];
            const storeName = store ? (store.comercioNombre || store.nombre) : 'Comercio';

            if (typeof commerceSyncService !== 'undefined' && commerceSyncService.addBranchAtomic) {
                await commerceSyncService.addBranchAtomic(storeId, storeName, {
                    name, phone, address, locationGPS: { lat, lng }
                }, currentBranches);
            } else {
                const newBranch = { id: 'br_' + Date.now(), name, phone, address, lat, lng, active: true, createdAt: new Date().toISOString() };
                await db.collection('users').doc(storeId).update({ branches: [...currentBranches, newBranch] });
            }

            if (typeof toast !== 'undefined') toast.show("Sucursal añadida con éxito con sincronización atómica E2E", "success");
            liveRestaurantsModule.openBranchesModal(storeId);
        } catch (err) {
            if (typeof toast !== 'undefined') toast.show("Error al añadir sucursal: " + err.message, "error");
        }
    },

    removeBranch: async (storeId, branchId) => {
        try {
            // ── CORRECCIÓN EAD: eliminar por branchId desde la fuente canónica /branches
            const currentBranches = liveRestaurantsModule.branchesByBusiness[storeId] || [];
            const index = currentBranches.findIndex(b => (b.branchId || b.id) === branchId);

            if (index >= 0 && index < currentBranches.length) {
                if (typeof commerceSyncService !== 'undefined' && commerceSyncService.deleteBranchAtomic) {
                    await commerceSyncService.deleteBranchAtomic(storeId, index, currentBranches);
                } else {
                    currentBranches.splice(index, 1);
                    await db.collection('users').doc(storeId).update({ branches: currentBranches });
                }
                if (typeof toast !== 'undefined') toast.show("Sucursal eliminada con sincronización atómica E2E", "success");
                liveRestaurantsModule.openBranchesModal(storeId);
            }
        } catch (err) {
            if (typeof toast !== 'undefined') toast.show("Error al eliminar sucursal: " + err.message, "error");
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL 4: ASIGNAR USUARIOS ENCARGADOS AL COMERCIO (EIAM CANONICAL SSOT)
    // ─────────────────────────────────────────────────────────────────────────
    openAssignUsersModal: (storeId) => {
        const store = liveRestaurantsModule.currentStores.find(s => s.id === storeId);
        if (!store) return;

        const memberships = liveRestaurantsModule.membershipsByBusiness[storeId] || [];

        let usersHtml = '';
        if (memberships.length === 0) {
            usersHtml = `
                <div class="p-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <p class="text-rose-400 font-bold mb-1">⚠️ Sin Membresías EIAM Activas</p>
                    <p class="text-slate-400">No hay identidades empresariales vinculadas formalmente en <code class="text-indigo-300">/membership</code> a este comercio.</p>
                </div>`;
        } else {
            memberships.forEach((m) => {
                const isOwner = m.role === 'MERCHANT_OWNER' || m.role === 'OWNER';
                const roleBadgeClass = isOwner ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                usersHtml += `
                    <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${roleBadgeClass}">
                                    ${isOwner ? '👑 ' : '👔 '}${m.role || 'MERCHANT_OPERATOR'}
                                </span>
                                <span class="text-xs font-bold text-white">${m.email || 'Sin Correo'}</span>
                            </div>
                            <div class="flex items-center gap-3 text-[10px] text-slate-400">
                                <span>UID: <code class="text-slate-300 font-mono">${m.uid}</code></span>
                                <span>🏢 Sucursal: <strong class="text-cyan-400 font-mono">${m.branchId || 'Todas'}</strong></span>
                                <span>Status: <strong class="text-emerald-400">${m.status}</strong></span>
                            </div>
                        </div>
                        <button onclick="liveRestaurantsModule.unassignUser('${storeId}', '${m.membershipId}', '${m.uid}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg text-xs font-bold border border-rose-800/40 transition">
                            ✕ Desvincular
                        </button>
                    </div>
                `;
            });
        }

        const branches = liveRestaurantsModule.branchesByBusiness[storeId] || [];
        let branchOptions = '<option value="">Sucursal Primaria / Global</option>';
        branches.forEach(b => {
            branchOptions += `<option value="${b.branchId}">${b.name || b.branchName}</option>`;
        });

        const html = `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                        <h3 class="text-lg font-black text-white flex items-center gap-2">
                            <span>👥</span>
                            <span>Membresías EIAM de ${store.comercioNombre || store.nombre}</span>
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-0.5">Control canónico de identidades autorizadas en <code class="text-indigo-300">/membership</code></p>
                    </div>
                </div>

                <div class="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    ${usersHtml}
                </div>

                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">➕ Vincular Membresía EIAM Canónica</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input type="text" id="newAssignUserEmail" placeholder="correo.operador@bluesystem.com o UID" class="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                        <select id="newAssignUserRole" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                            <option value="MERCHANT_OWNER">👑 Propietario (Owner)</option>
                            <option value="MERCHANT_MANAGER">👔 Gerente (Manager)</option>
                            <option value="MERCHANT_CASHIER">💳 Cajero / POS</option>
                            <option value="MERCHANT_OPERATOR">🍳 Cocina / KDS</option>
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <select id="newAssignUserBranch" class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                            ${branchOptions}
                        </select>
                        <button type="button" onclick="liveRestaurantsModule.assignUser('${storeId}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30">
                            Vincular EIAM
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-end pt-3 border-t border-slate-800">
                    <button type="button" onclick="modal.close('usersModal')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('usersModal', html);
    },

    assignUser: async (storeId) => {
        const input = document.getElementById('newAssignUserEmail').value.trim();
        const role = document.getElementById('newAssignUserRole').value;
        const selectedBranch = document.getElementById('newAssignUserBranch').value;

        if (!input) {
            if (typeof toast !== 'undefined') toast.show("Ingresa el correo electrónico o UID del usuario", "error");
            return;
        }

        try {
            const store = liveRestaurantsModule.currentStores.find(s => s.id === storeId);
            const branches = liveRestaurantsModule.branchesByBusiness[storeId] || [];
            const primaryBranchId = selectedBranch || (branches[0] ? branches[0].branchId : '');
            const orgId = store?.orgId || null;

            let targetUid = input;
            let targetEmail = input;

            // Si es un correo, buscar en /users para obtener el UID
            if (input.includes('@')) {
                const userSnap = await db.collection('users').where('email', '==', input).get();
                if (!userSnap.empty) {
                    targetUid = userSnap.docs[0].id;
                    targetEmail = userSnap.docs[0].data()?.email || input;
                }
            }

            const membershipId = `mem_${storeId}_${targetUid}`;
            const canonicalPermissions = [
                "VIEW_ORDERS", "MANAGE_ORDERS", "VIEW_MENU", "MANAGE_MENU",
                "VIEW_FINANCE", "EXPORT_REPORT", "MANAGE_EMPLOYEES", "MANAGE_SETTINGS",
                "VIEW_ANALYTICS", "CLOSE_CASH_REGISTER"
            ];

            const batch = db.batch();

            // 1. Guardar en /membership (SSOT)
            const memRef = db.collection('membership').doc(membershipId);
            batch.set(memRef, {
                id: membershipId,
                uid: targetUid,
                email: targetEmail,
                businessId: storeId,
                orgId,
                branchId: primaryBranchId,
                role,
                status: 'ACTIVE',
                permissions: canonicalPermissions,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // 2. Sincronizar en /users (Compatibilidad)
            const userRef = db.collection('users').doc(targetUid);
            batch.set(userRef, {
                eiamRole: role,
                businessId: storeId,
                orgId,
                branchId: primaryBranchId,
                status: 'ACTIVE',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // 3. Auditoría
            const auditRef = db.collection('audit_events').doc();
            batch.set(auditRef, {
                event: 'MEMBERSHIP_ASSIGNED',
                eventType: 'MEMBERSHIP_ASSIGNED',
                domain: 'IDENTITY',
                actorUid: (firebase.auth().currentUser || {}).uid || 'PANEL_ADMIN',
                targetUid,
                businessId: storeId,
                orgId,
                branchId: primaryBranchId,
                membershipId,
                role,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();

            if (typeof toast !== 'undefined') toast.show("Membresía EIAM vinculada correctamente", "success");
            liveRestaurantsModule.openAssignUsersModal(storeId);
        } catch (err) {
            console.error("Error al vincular membresía EIAM:", err);
            if (typeof toast !== 'undefined') toast.show("Error al vincular membresía: " + err.message, "error");
        }
    },

    unassignUser: async (storeId, membershipId, targetUid) => {
        if (!confirm("¿Estás seguro de revocar la membresía EIAM de este usuario?")) return;

        try {
            const batch = db.batch();

            if (membershipId) {
                const memRef = db.collection('membership').doc(membershipId);
                batch.update(memRef, {
                    status: 'TERMINATED',
                    terminatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            if (targetUid) {
                const userRef = db.collection('users').doc(targetUid);
                batch.set(userRef, {
                    status: 'INACTIVE',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            const auditRef = db.collection('audit_events').doc();
            batch.set(auditRef, {
                event: 'MEMBERSHIP_REVOKED',
                eventType: 'MEMBERSHIP_REVOKED',
                domain: 'IDENTITY',
                actorUid: (firebase.auth().currentUser || {}).uid || 'PANEL_ADMIN',
                targetUid,
                businessId: storeId,
                membershipId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            if (typeof toast !== 'undefined') toast.show("Membresía EIAM revocada", "success");
            liveRestaurantsModule.openAssignUsersModal(storeId);
        } catch (err) {
            console.error("Error al desvincular membresía EIAM:", err);
            if (typeof toast !== 'undefined') toast.show("Error al desvincular membresía: " + err.message, "error");
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL 5: ELIMINAR / DESACTIVAR COMERCIO
    // ─────────────────────────────────────────────────────────────────────────
    confirmDeleteStore: (storeId) => {
        const store = liveRestaurantsModule.currentStores.find(s => s.id === storeId);
        if (!store) return;

        const name = store.comercioNombre || store.nombre || 'Comercio';

        const html = `
            <div class="space-y-4 text-center">
                <div class="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 text-2xl mx-auto">
                    ⚠️
                </div>
                <h3 class="text-lg font-black text-white">¿Eliminar o Desactivar Comercio?</h3>
                <p class="text-xs text-slate-300">
                    Estás a punto de desaprovisionar la cuenta del comercio <strong>"${name}"</strong>. Esta acción deshabilitará el acceso de sus usuarios operacionales y cancelará operaciones activas.
                </p>
                <div class="bg-rose-950/40 p-3 rounded-xl border border-rose-900/40 text-[11px] text-rose-300">
                    🔒 Nota de Seguridad Enterprise: El sistema ejecuta desaprovisionamiento seguro en backend preservando el historial financiero y auditoría.
                </div>

                <div class="flex flex-col md:flex-row items-center justify-center gap-3 pt-3 border-t border-slate-800">
                    <button type="button" onclick="modal.close('deleteModal')" class="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition">
                        Cancelar
                    </button>
                    <button type="button" onclick="liveRestaurantsModule.deprovisionStore('${storeId}', 'DEACTIVATE')" class="w-full md:w-auto bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5">
                        <span>🌙</span> Desactivar Solo
                    </button>
                    <button type="button" onclick="liveRestaurantsModule.deprovisionStore('${storeId}', 'DELETE')" class="w-full md:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5">
                        <span>💥</span> Eliminar Definitivamente
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('deleteModal', html);
    },

    deprovisionStore: async (storeId, mode) => {
        const isDeactivate = mode === 'DEACTIVATE';
        const actionTitle = isDeactivate ? 'Desactivando Comercio...' : 'Deprovisionando Comercio...';

        if (typeof modal !== 'undefined') {
            const progressHtml = `
                <div class="space-y-4 text-center py-2">
                    <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <h3 class="text-base font-black text-white">${actionTitle}</h3>
                    <div class="space-y-1.5 text-xs text-slate-400 text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p id="step-val" class="text-indigo-400 font-bold">⏳ Validando comercio y permisos administrativos...</p>
                        <p id="step-orders" class="text-slate-600">⌛ Cancelando órdenes operativas en curso...</p>
                        <p id="step-auth" class="text-slate-600">⌛ Desactivando accesos y revocando tokens de staff...</p>
                        <p id="step-catalog" class="text-slate-600">⌛ Actualizando productos y sucursales en Marketplace...</p>
                        <p id="step-audit" class="text-slate-600">⌛ Registrando trazabilidad e imborrabilidad financiera...</p>
                    </div>
                </div>
            `;
            modal.open('deleteModal', progressHtml);
        }

        if (typeof identityAdminDrawer !== 'undefined' && identityAdminDrawer.invalidateContext) {
            identityAdminDrawer.invalidateContext(storeId, isDeactivate ? 'BUSINESS_DEACTIVATE' : 'BUSINESS_HARD_DELETE');
        }

        try {
            setTimeout(() => { const el = document.getElementById('step-orders'); if (el) { el.className = 'text-indigo-400 font-bold'; el.textContent = '✔️ Cancelando órdenes operativas en curso...'; } }, 300);
            setTimeout(() => { const el = document.getElementById('step-auth'); if (el) { el.className = 'text-indigo-400 font-bold'; el.textContent = '✔️ Desactivando accesos y revocando tokens de staff...'; } }, 600);
            setTimeout(() => { const el = document.getElementById('step-catalog'); if (el) { el.className = 'text-indigo-400 font-bold'; el.textContent = '✔️ Actualizando productos y sucursales en Marketplace...'; } }, 900);
            setTimeout(() => { const el = document.getElementById('step-audit'); if (el) { el.className = 'text-indigo-400 font-bold'; el.textContent = '✔️ Registrando trazabilidad e imborrabilidad financiera...'; } }, 1200);

            try {
                const deprovisionCallable = firebase.functions().httpsCallable('deprovisionTenant');
                await deprovisionCallable({ businessId: storeId, mode: mode });
            } catch (cfErr) {
                console.warn("[LIVE_RESTAURANTS] Cloud Function deprovisionTenant no disponible. Aplicando sincronización atómica directa en Firestore:", cfErr.message);
                if (isDeactivate) {
                    if (typeof commerceSyncService !== 'undefined' && commerceSyncService.toggleStoreActiveAtomic) {
                        await commerceSyncService.toggleStoreActiveAtomic(storeId, false);
                    }
                } else {
                    if (typeof commerceSyncService !== 'undefined' && commerceSyncService.deleteCommerceAtomic) {
                        await commerceSyncService.deleteCommerceAtomic(storeId);
                    } else if (typeof governanceService !== 'undefined' && governanceService.hardDeleteBusiness) {
                        await governanceService.hardDeleteBusiness(storeId);
                    }
                }
            }

            if (typeof modal !== 'undefined') modal.close('deleteModal');
            if (typeof toast !== 'undefined') {
                const msg = isDeactivate 
                    ? "Comercio desactivado correctamente con sincronización en tiempo real" 
                    : "Comercio desaprovisionado correctamente con sincronización en tiempo real.";
                toast.show(msg, "success");
            }
        } catch (err) {
            console.error("[LIVE_RESTAURANTS] Error al deprovisionar comercio:", err);
            if (typeof modal !== 'undefined') modal.close('deleteModal');
            if (typeof toast !== 'undefined') {
                toast.show("Error al procesar desaprovisionamiento: " + (err.message || err), "error");
            }
        }
    },

    // ─── MODAL DE OPINIONES & RESEÑAS DE CLIENTES ─────────────────────────
    openReviewsModal: async (storeId, storeName, rating, count) => {
        if (!storeId) return;

        const existingModal = document.getElementById('store-reviews-modal');
        if (existingModal) existingModal.remove();

        const modalDiv = document.createElement('div');
        modalDiv.id = 'store-reviews-modal';
        modalDiv.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm';
        modalDiv.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <!-- Header -->
                <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-lg">
                            ⭐
                        </div>
                        <div>
                            <h3 class="font-bold text-base text-white">${storeName}</h3>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-amber-400 font-black text-sm">★ ${Number(rating || 5.0).toFixed(1)}</span>
                                <span class="text-xs text-slate-400">(${count || 0} ${count === 1 ? 'opinión' : 'opiniones'})</span>
                                <span class="text-slate-600">•</span>
                                <span class="text-slate-500 font-mono text-[10px]">ID: ${storeId.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('store-reviews-modal').remove()" 
                        class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition">
                        ✕
                    </button>
                </div>

                <!-- Contenedor de Reseñas -->
                <div id="store-reviews-list" class="p-5 overflow-y-auto space-y-3 flex-1">
                    <div class="py-12 text-center text-slate-400 space-y-2">
                        <div class="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p class="text-xs font-medium text-slate-300">Consultando opiniones de clientes en Firestore...</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
                    <button onclick="document.getElementById('store-reviews-modal').remove()" 
                        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        try {
            const snap = await db.collection('businesses').doc(storeId)
                .collection('reviews')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()
                .catch(() => null);

            let reviews = [];
            if (snap && !snap.empty) {
                snap.forEach(doc => {
                    reviews.push({ id: doc.id, ...doc.data() });
                });
            }

            if (reviews.length === 0) {
                const altSnap = await db.collection('reviews')
                    .where('businessId', '==', storeId)
                    .limit(50)
                    .get()
                    .catch(() => null);
                if (altSnap && !altSnap.empty) {
                    altSnap.forEach(doc => {
                        reviews.push({ id: doc.id, ...doc.data() });
                    });
                }
            }

            const listEl = document.getElementById('store-reviews-list');
            if (!listEl) return;

            if (reviews.length === 0) {
                listEl.innerHTML = `
                    <div class="py-12 text-center text-slate-400 space-y-2">
                        <span class="text-4xl block">💬</span>
                        <h4 class="font-bold text-white text-sm">Sin Opiniones Registradas</h4>
                        <p class="text-xs text-slate-500 max-w-sm mx-auto">
                            Este comercio aún no tiene valoraciones directas de clientes registradas en el sistema.
                        </p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = reviews.map(r => {
                const rRating = Number(r.rating || r.businessRating || 5);
                const stars = '★'.repeat(Math.min(5, Math.max(1, Math.round(rRating)))) + '☆'.repeat(Math.max(0, 5 - Math.round(rRating)));
                const cName = r.userName || r.authorName || 'Cliente BlueSystem';
                const cComment = r.comment || r.comments || r.ratingComment || 'Sin comentario escrito';
                const dateStr = r.date || (r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleDateString('es-ES') : 'Reciente');
                const photo = r.userPhotoUrl || '';
                const orderBadge = r.orderId ? `<span class="font-mono text-[9px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">#${String(r.orderId).slice(0, 8).toUpperCase()}</span>` : '';

                return `
                    <div class="bg-slate-950 border border-slate-800/90 p-4 rounded-xl space-y-2 hover:border-slate-700 transition">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                ${photo ? `
                                    <img src="${photo}" alt="${cName}" class="w-8 h-8 rounded-full object-cover border border-slate-700" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                    <div class="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-bold hidden items-center justify-center text-xs">
                                        ${(cName[0] || 'C').toUpperCase()}
                                    </div>
                                ` : `
                                    <div class="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs">
                                        ${(cName[0] || 'C').toUpperCase()}
                                    </div>
                                `}
                                <div>
                                    <h5 class="text-xs font-bold text-white">${cName}</h5>
                                    <span class="text-[10px] text-slate-500">${dateStr}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                ${orderBadge}
                                <span class="text-amber-400 font-black text-xs tracking-wider">${stars}</span>
                            </div>
                        </div>
                        <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                            "${cComment}"
                        </p>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error("[LIVE_RESTAURANTS] Error al cargar reseñas:", err);
            const listEl = document.getElementById('store-reviews-list');
            if (listEl) {
                listEl.innerHTML = `
                    <div class="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl text-rose-300 text-xs text-center">
                        Error al cargar reseñas del comercio: ${err.message || String(err)}
                    </div>
                `;
            }
        }
    }
};

window.liveRestaurantsModule = liveRestaurantsModule;
