// Brand Manager — Enterprise Multi-Brand & White-Label Management v1.0.0
// BlueSystem Delivery Enterprise — Actividad #21
// Single Core / Zero Forks / Configuration-Driven Branding

const brandManagerModule = {
    brands: [],
    tenants: [],
    subscriptions: [],
    searchTerm: '',
    selectedTenantFilter: 'all',
    selectedStatusFilter: 'all',
    currentEditingBrand: null,
    previewState: null,
    unsubscribeBrands: null,

    render: async () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Auth Ready Gate check
        if (!window.AuthReadyGate || !window.AuthReadyGate.isReady) {
            try {
                if (window.AuthReadyGate && typeof window.AuthReadyGate.waitUntilReady === 'function') {
                    await window.AuthReadyGate.waitUntilReady();
                } else {
                    throw new Error("AuthReadyGate no inicializado");
                }
            } catch (err) {
                container.innerHTML = `
                    <div class="bg-slate-900 border border-rose-500/40 p-8 rounded-2xl text-center space-y-4 shadow-2xl font-sans my-8">
                        <span class="text-5xl">⛔</span>
                        <h3 class="text-lg font-bold text-rose-400">Acceso Denegado</h3>
                        <p class="text-xs text-slate-300 max-w-md mx-auto">Brand Manager requiere privilegios de Platform Admin validados.</p>
                    </div>
                `;
                return;
            }
        }

        container.innerHTML = `
            <div class="space-y-6 font-sans select-none">
                <!-- Header -->
                <div class="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">🎨</span>
                            <div>
                                <h2 class="text-2xl font-black text-white tracking-tight">Brand Manager</h2>
                                <p class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Multi-Brand & White-Label Commercial Foundation</p>
                            </div>
                        </div>
                        <p class="text-xs text-slate-400 mt-1 max-w-2xl">
                            Administración de marcas, identidades visuales, tokens de color, logos en Cloud Storage y vinculación determinística con Tenants.
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button onclick="brandManagerModule.openBrandModal(null)" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                            <span>✨</span> Nueva Marca
                        </button>
                    </div>
                </div>

                <!-- Filters & Search Bar -->
                <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div class="relative w-full md:w-80">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">🔍</span>
                        <input type="text" id="bm-search-input" oninput="brandManagerModule.onSearch(this.value)" placeholder="Buscar por nombre, slug, ID..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono">
                    </div>

                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400 font-bold">🏢 Tenant:</span>
                            <select id="bm-tenant-filter" onchange="brandManagerModule.onTenantFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todos los Tenants</option>
                            </select>
                        </div>

                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400 font-bold">⚡ Estado:</span>
                            <select id="bm-status-filter" onchange="brandManagerModule.onStatusFilterChange(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500">
                                <option value="all">Todos</option>
                                <option value="ACTIVE">Activas (ACTIVE)</option>
                                <option value="DRAFT">Borrador (DRAFT)</option>
                                <option value="ARCHIVED">Archivadas (ARCHIVED)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Brands Grid / Table Container -->
                <div id="bm-brands-container" class="space-y-4">
                    <div class="flex items-center justify-center p-12">
                        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>

            <!-- Modal Brand Editor -->
            <div id="bm-modal-backdrop" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
                <div id="bm-modal-content" class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
                    <!-- Modal Content Injected Dynamically -->
                </div>
            </div>
        `;

        await brandManagerModule.loadInitialData();
        brandManagerModule.renderBrandsList();
    },

    loadInitialData: async () => {
        try {
            // Load Tenants & Subscriptions for Association (Read-Only)
            const tenantsSnap = await db.collection('tenants').get();
            brandManagerModule.tenants = tenantsSnap.docs.map(d => ({ tenantId: d.id, ...d.data() }));

            try {
                const subsSnap = await db.collection('subscriptions').get();
                brandManagerModule.subscriptions = subsSnap.docs.map(d => ({ subscriptionId: d.id, ...d.data() }));
            } catch (subErr) {
                console.warn("[BRAND_MANAGER] No se pudieron precargar suscripciones:", subErr.message);
                brandManagerModule.subscriptions = [];
            }

            // Populate Tenant Filter
            const tenantSelect = document.getElementById('bm-tenant-filter');
            if (tenantSelect) {
                tenantSelect.innerHTML = '<option value="all">Todos los Tenants</option>' +
                    brandManagerModule.tenants.map(t => `<option value="${t.tenantId}">${t.name || t.tenantId} (${t.tenantId})</option>`).join('');
            }

            // Realtime Listener to /brands
            if (!brandManagerModule.unsubscribeBrands) {
                brandManagerModule.unsubscribeBrands = db.collection('brands').onSnapshot(snap => {
                    brandManagerModule.brands = snap.docs.map(d => ({ brandId: d.id, ...d.data() }));
                    brandManagerModule.renderBrandsList();
                }, err => {
                    console.error("[BRAND_MANAGER] Error en listener de brands:", err);
                });
            }
        } catch (err) {
            console.error("[BRAND_MANAGER] Error cargando datos iniciales:", err);
        }
    },

    onSearch: (val) => {
        brandManagerModule.searchTerm = (val || '').toLowerCase().trim();
        brandManagerModule.renderBrandsList();
    },

    onTenantFilterChange: (val) => {
        brandManagerModule.selectedTenantFilter = val;
        brandManagerModule.renderBrandsList();
    },

    onStatusFilterChange: (val) => {
        brandManagerModule.selectedStatusFilter = val;
        brandManagerModule.renderBrandsList();
    },

    renderBrandsList: () => {
        const container = document.getElementById('bm-brands-container');
        if (!container) return;

        let filtered = brandManagerModule.brands.filter(b => {
            const matchesSearch = !brandManagerModule.searchTerm ||
                (b.displayName && b.displayName.toLowerCase().includes(brandManagerModule.searchTerm)) ||
                (b.shortName && b.shortName.toLowerCase().includes(brandManagerModule.searchTerm)) ||
                (b.slug && b.slug.toLowerCase().includes(brandManagerModule.searchTerm)) ||
                (b.brandId && b.brandId.toLowerCase().includes(brandManagerModule.searchTerm)) ||
                (b.tenantId && b.tenantId.toLowerCase().includes(brandManagerModule.searchTerm));

            const matchesTenant = brandManagerModule.selectedTenantFilter === 'all' || b.tenantId === brandManagerModule.selectedTenantFilter;
            const matchesStatus = brandManagerModule.selectedStatusFilter === 'all' || (b.status || 'ACTIVE') === brandManagerModule.selectedStatusFilter;

            return matchesSearch && matchesTenant && matchesStatus;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                    <span class="text-4xl">🎨</span>
                    <h3 class="text-sm font-bold text-slate-200">No se encontraron marcas registradas</h3>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto">Crea una nueva marca para configurar su identidad visual, colores y asignarla a un Tenant.</p>
                    <button onclick="brandManagerModule.openBrandModal(null)" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">
                        Crear Primera Marca
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        `;

        filtered.forEach(brand => {
            const visual = brand.visual || {};
            const primaryColor = visual.primaryColor || '#0284C7';
            const secondaryColor = visual.secondaryColor || '#0EA5E9';
            const accentColor = visual.accentColor || '#38BDF8';
            const bgColor = visual.backgroundColor || '#0F172A';
            const logoUrl = visual.logoUrl || 'https://storage.googleapis.com/bluesystem-assets/logo.png';
            const status = brand.status || 'ACTIVE';

            const statusBadge = status === 'ACTIVE'
                ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVA</span>`
                : status === 'DRAFT'
                ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">BORRADOR</span>`
                : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">ARCHIVADA</span>`;

            const tenantObj = brandManagerModule.tenants.find(t => t.tenantId === brand.tenantId);
            const tenantName = tenantObj ? (tenantObj.name || tenantObj.tenantId) : brand.tenantId;
            const isPrimaryForTenant = tenantObj && tenantObj.primaryBrandId === brand.brandId;

            html += `
                <div class="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition duration-200 relative overflow-hidden">
                    <!-- Color Accent Bar -->
                    <div class="absolute top-0 left-0 right-0 h-1.5" style="background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${accentColor});"></div>

                    <!-- Top Content -->
                    <div class="space-y-3 pt-1">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                    <img src="${logoUrl}" alt="${brand.displayName || 'Logo'}" class="max-h-full max-w-full object-contain" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-sm font-black text-white truncate">${brand.displayName || 'Sin Nombre'}</h4>
                                        ${isPrimaryForTenant ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-bold uppercase">Principal</span>` : ''}
                                    </div>
                                    <p class="text-[11px] text-slate-400 font-mono truncate">ID: ${brand.brandId}</p>
                                </div>
                            </div>
                            <div>${statusBadge}</div>
                        </div>

                        <!-- Details & Tenant Association -->
                        <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🏢 Tenant:</span>
                                <span class="font-bold text-slate-200 truncate max-w-[160px]">${tenantName}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🔗 Slug:</span>
                                <span class="font-mono text-indigo-400 font-bold">${brand.slug || '-'}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span>🔤 Short Name:</span>
                                <span class="font-semibold text-slate-300">${brand.shortName || '-'}</span>
                            </div>
                        </div>

                        <!-- Color Palette Chips -->
                        <div class="space-y-1">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paleta de Color:</span>
                            <div class="flex items-center gap-2">
                                <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                                    <span class="w-3 h-3 rounded-full" style="background-color: ${primaryColor};"></span>
                                    <span class="text-slate-300">${primaryColor}</span>
                                </div>
                                <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                                    <span class="w-3 h-3 rounded-full" style="background-color: ${secondaryColor};"></span>
                                    <span class="text-slate-300">${secondaryColor}</span>
                                </div>
                                <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                                    <span class="w-3 h-3 rounded-full" style="background-color: ${accentColor};"></span>
                                    <span class="text-slate-300">${accentColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Actions -->
                    <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button onclick="brandManagerModule.openPreviewModal('${brand.brandId}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <span>👁️</span> Previsualizar
                        </button>
                        <button onclick="brandManagerModule.openBrandModal('${brand.brandId}')" class="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <span>✏️</span> Editar
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    openBrandModal: (brandId) => {
        const brand = brandId ? brandManagerModule.brands.find(b => b.brandId === brandId) : null;
        brandManagerModule.currentEditingBrand = brand;

        const isEditing = !!brand;
        const visual = brand?.visual || {};
        const metadata = brand?.metadata || {};

        const tenantOptions = brandManagerModule.tenants.map(t => {
            const isSelected = brand?.tenantId === t.tenantId;
            return `<option value="${t.tenantId}" ${isSelected ? 'selected' : ''}>${t.name || t.tenantId} (${t.tenantId})</option>`;
        }).join('');

        const modalBackdrop = document.getElementById('bm-modal-backdrop');
        const modalContent = document.getElementById('bm-modal-content');
        if (!modalBackdrop || !modalContent) return;

        modalContent.innerHTML = `
            <!-- Modal Header -->
            <div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-2xl p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">🎨</span>
                    <div>
                        <h3 class="text-lg font-black text-white">${isEditing ? 'Editar Marca' : 'Nueva Marca Comercial'}</h3>
                        <p class="text-xs text-slate-400">${isEditing ? `Modificando identidad visual de ${brand.displayName}` : 'Crea una nueva marca y asóciala a un Tenant'}</p>
                    </div>
                </div>
                <button onclick="brandManagerModule.closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold">
                    ✕
                </button>
            </div>

            <!-- Modal Form -->
            <form id="bm-brand-form" onsubmit="brandManagerModule.saveBrand(event)" class="p-6 space-y-6 flex-1">
                <!-- Section 1: Identidad & Tenant -->
                <div class="space-y-4">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>1.</span> Información General & Tenant
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Nombre Visible (Display Name) *</label>
                            <input type="text" id="bm-field-displayName" value="${brand?.displayName || ''}" required oninput="brandManagerModule.onFormDisplayNameChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" placeholder="Ej: Fitoni Express">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Nombre Corto (Short Name) *</label>
                            <input type="text" id="bm-field-shortName" value="${brand?.shortName || ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" placeholder="Ej: Fitoni">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Slug URL *</label>
                            <input type="text" id="bm-field-slug" value="${brand?.slug || ''}" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono" placeholder="fitoni-express">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Brand ID (Inmutable) *</label>
                            <input type="text" id="bm-field-brandId" value="${brand?.brandId || ''}" ${isEditing ? 'disabled' : ''} required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}" placeholder="brand-live-fitoni-01">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Tenant Propietario *</label>
                            <select id="bm-field-tenantId" required onchange="brandManagerModule.onTenantSelectChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                ${tenantOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Estado de Marca</label>
                            <select id="bm-field-status" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-bold">
                                <option value="ACTIVE" ${brand?.status === 'ACTIVE' ? 'selected' : ''}>ACTIVA (ACTIVE)</option>
                                <option value="DRAFT" ${brand?.status === 'DRAFT' ? 'selected' : ''}>BORRADOR (DRAFT)</option>
                                <option value="ARCHIVED" ${brand?.status === 'ARCHIVED' ? 'selected' : ''}>ARCHIVADA (ARCHIVED)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Read-Only Subscription Association Display -->
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs" id="bm-subscription-info">
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400">💳 Suscripción Vinculada del Tenant:</span>
                            <span class="font-bold text-indigo-300" id="bm-sub-display-name">Calculando...</span>
                        </div>
                        <span class="text-[10px] text-slate-500 uppercase font-mono">Lectura / Validación</span>
                    </div>
                </div>

                <!-- Section 2: Identidad Visual & Colores -->
                <div class="space-y-4 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>2.</span> Tokens de Color & Tipografía
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Primary Color *</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="bm-picker-primary" value="${visual.primaryColor || '#0284C7'}" oninput="document.getElementById('bm-field-primaryColor').value = this.value; brandManagerModule.updateLivePreview();" class="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer">
                                <input type="text" id="bm-field-primaryColor" value="${visual.primaryColor || '#0284C7'}" oninput="document.getElementById('bm-picker-primary').value = this.value; brandManagerModule.updateLivePreview();" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Secondary Color *</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="bm-picker-secondary" value="${visual.secondaryColor || '#0EA5E9'}" oninput="document.getElementById('bm-field-secondaryColor').value = this.value; brandManagerModule.updateLivePreview();" class="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer">
                                <input type="text" id="bm-field-secondaryColor" value="${visual.secondaryColor || '#0EA5E9'}" oninput="document.getElementById('bm-picker-secondary').value = this.value; brandManagerModule.updateLivePreview();" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Accent Color *</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="bm-picker-accent" value="${visual.accentColor || '#38BDF8'}" oninput="document.getElementById('bm-field-accentColor').value = this.value; brandManagerModule.updateLivePreview();" class="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer">
                                <input type="text" id="bm-field-accentColor" value="${visual.accentColor || '#38BDF8'}" oninput="document.getElementById('bm-picker-accent').value = this.value; brandManagerModule.updateLivePreview();" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Background *</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="bm-picker-bg" value="${visual.backgroundColor || '#0F172A'}" oninput="document.getElementById('bm-field-backgroundColor').value = this.value; brandManagerModule.updateLivePreview();" class="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer">
                                <input type="text" id="bm-field-backgroundColor" value="${visual.backgroundColor || '#0F172A'}" oninput="document.getElementById('bm-picker-bg').value = this.value; brandManagerModule.updateLivePreview();" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 mb-1">Text Color *</label>
                            <div class="flex items-center gap-2">
                                <input type="color" id="bm-picker-text" value="${visual.textColor || '#F8FAFC'}" oninput="document.getElementById('bm-field-textColor').value = this.value; brandManagerModule.updateLivePreview();" class="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer">
                                <input type="text" id="bm-field-textColor" value="${visual.textColor || '#F8FAFC'}" oninput="document.getElementById('bm-picker-text').value = this.value; brandManagerModule.updateLivePreview();" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Assets en Cloud Storage -->
                <div class="space-y-4 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>3.</span> Assets Gráficos (Cloud Storage)
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <label class="block text-xs font-bold text-slate-300">Logo Principal (PNG/WebP, max 5MB)</label>
                            <div class="flex items-center gap-3">
                                <input type="file" id="bm-file-logo" accept="image/png,image/jpeg,image/webp" onchange="brandManagerModule.onAssetSelected(event, 'logoUrl')" class="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30">
                            </div>
                            <input type="text" id="bm-field-logoUrl" value="${visual.logoUrl || ''}" placeholder="URL del logo" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono text-[11px]">
                        </div>

                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                            <label class="block text-xs font-bold text-slate-300">Icono de App / Favicon (1:1)</label>
                            <div class="flex items-center gap-3">
                                <input type="file" id="bm-file-icon" accept="image/png,image/x-icon,image/webp" onchange="brandManagerModule.onAssetSelected(event, 'iconUrl')" class="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30">
                            </div>
                            <input type="text" id="bm-field-iconUrl" value="${visual.iconUrl || ''}" placeholder="URL del icono" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono text-[11px]">
                        </div>
                    </div>
                </div>

                <!-- Section 4: Enlaces Legales & Políticas (Términos & Privacidad) -->
                <div class="space-y-3 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>⚖️</span> Enlaces Legales & Políticas (HTTPS)
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                            <label class="block text-xs font-bold text-slate-300">URL Términos y Condiciones</label>
                            <input type="url" id="bm-field-termsUrl" value="${metadata.termsUrl || ''}" placeholder="https://tuanigo.app/terminos" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono text-[11px]">
                            <p class="text-[10px] text-slate-500">Debe ser URL absoluta HTTPS bajo dominio autorizado (tuanigo.app).</p>
                        </div>
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                            <label class="block text-xs font-bold text-slate-300">URL Políticas de Privacidad</label>
                            <input type="url" id="bm-field-privacyUrl" value="${metadata.privacyUrl || ''}" placeholder="https://tuanigo.app/privacidad" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono text-[11px]">
                            <p class="text-[10px] text-slate-500">Debe ser URL absoluta HTTPS bajo dominio autorizado (tuanigo.app).</p>
                        </div>
                    </div>
                </div>

                <!-- Section 5: Live Ephemeral Preview -->
                <div class="space-y-2 pt-2 border-t border-slate-800">
                    <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>5.</span> Previsualización en Vivo (Read-Only)
                    </h4>
                    <div id="bm-live-preview-box" class="p-4 rounded-xl border transition-all duration-200" style="background-color: ${visual.backgroundColor || '#0F172A'}; border-color: ${visual.primaryColor || '#0284C7'};">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-slate-900/50 p-1 flex items-center justify-center">
                                    <span class="text-xs font-bold" style="color: ${visual.primaryColor || '#0284C7'};">★</span>
                                </div>
                                <div>
                                    <h5 id="bm-preview-title" class="text-xs font-black" style="color: ${visual.textColor || '#F8FAFC'};">${brand?.displayName || 'Nombre de la Marca'}</h5>
                                    <p id="bm-preview-subtitle" class="text-[10px] opacity-75" style="color: ${visual.textColor || '#F8FAFC'};">Powered by BlueSystem Core</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button type="button" class="px-2.5 py-1 rounded text-[10px] font-bold text-white shadow" style="background-color: ${visual.primaryColor || '#0284C7'};">Primary</button>
                                <button type="button" class="px-2.5 py-1 rounded text-[10px] font-bold text-white shadow" style="background-color: ${visual.secondaryColor || '#0EA5E9'};">Secondary</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer Actions -->
                <div class="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button type="button" onclick="brandManagerModule.closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">
                        Cancelar
                    </button>
                    <button type="submit" id="bm-save-btn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                        <span>💾</span> Guardar Marca
                    </button>
                </div>
            </form>
        `;

        modalBackdrop.classList.remove('hidden');
        const initialTenantId = brand?.tenantId || (brandManagerModule.tenants[0]?.tenantId);
        if (initialTenantId) {
            brandManagerModule.onTenantSelectChange(initialTenantId);
        }
    },

    onFormDisplayNameChange: (val) => {
        const titleEl = document.getElementById('bm-preview-title');
        if (titleEl) titleEl.textContent = val || 'Nombre de la Marca';

        if (!brandManagerModule.currentEditingBrand) {
            // Auto generate slug and brandId for new brand
            const slug = (val || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const slugEl = document.getElementById('bm-field-slug');
            const idEl = document.getElementById('bm-field-brandId');
            if (slugEl) slugEl.value = slug;
            if (idEl) idEl.value = `brand-live-${slug}-01`;
        }
    },

    onTenantSelectChange: (tenantId) => {
        const tenant = brandManagerModule.tenants.find(t => t.tenantId === tenantId);
        const subDisplay = document.getElementById('bm-sub-display-name');
        if (!subDisplay) return;

        if (tenant && tenant.subscriptionId) {
            const sub = brandManagerModule.subscriptions.find(s => s.subscriptionId === tenant.subscriptionId);
            subDisplay.textContent = sub ? `${sub.planName || sub.planTier} (${sub.subscriptionId})` : tenant.subscriptionId;
        } else {
            subDisplay.textContent = 'Plan Profesional Estándar (Heredado)';
        }
    },

    updateLivePreview: () => {
        const primary = document.getElementById('bm-field-primaryColor')?.value || '#0284C7';
        const secondary = document.getElementById('bm-field-secondaryColor')?.value || '#0EA5E9';
        const bg = document.getElementById('bm-field-backgroundColor')?.value || '#0F172A';
        const text = document.getElementById('bm-field-textColor')?.value || '#F8FAFC';

        const previewBox = document.getElementById('bm-live-preview-box');
        if (previewBox) {
            previewBox.style.backgroundColor = bg;
            previewBox.style.borderColor = primary;
        }
        const title = document.getElementById('bm-preview-title');
        if (title) title.style.color = text;
        const sub = document.getElementById('bm-preview-subtitle');
        if (sub) sub.style.color = text;
    },

    onAssetSelected: async (event, targetField) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("El archivo excede el tamaño máximo permitido de 5MB.");
            event.target.value = "";
            return;
        }

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/x-icon'];
        if (!validTypes.includes(file.type)) {
            alert("Formato de imagen no soportado. Utilice PNG, JPG, WebP o ICO.");
            event.target.value = "";
            return;
        }

        const brandId = document.getElementById('bm-field-brandId')?.value || 'temp-brand';
        const storageRef = firebase.storage().ref().child(`brands/${brandId}/${Date.now()}_${file.name}`);

        const btn = document.getElementById('bm-save-btn');
        if (btn) btn.disabled = true;

        try {
            const snap = await storageRef.put(file, { contentType: file.type });
            const url = await snap.ref.getDownloadURL();
            const targetEl = document.getElementById(`bm-field-${targetField}`);
            if (targetEl) {
                targetEl.value = url;
            }
            alert("Asset cargado correctamente a Cloud Storage.");
        } catch (err) {
            console.error("[BRAND_MANAGER] Error subiendo asset:", err);
            alert("Error al cargar el archivo a Storage: " + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    saveBrand: async (event) => {
        event.preventDefault();

        const isEditing = !!brandManagerModule.currentEditingBrand;
        const brandId = document.getElementById('bm-field-brandId').value.trim();
        const tenantId = document.getElementById('bm-field-tenantId').value.trim();
        const displayName = document.getElementById('bm-field-displayName').value.trim();
        const shortName = document.getElementById('bm-field-shortName').value.trim();
        const slug = document.getElementById('bm-field-slug').value.trim();
        const status = document.getElementById('bm-field-status').value;

        const primaryColor = document.getElementById('bm-field-primaryColor').value.trim();
        const secondaryColor = document.getElementById('bm-field-secondaryColor').value.trim();
        const accentColor = document.getElementById('bm-field-accentColor').value.trim();
        const backgroundColor = document.getElementById('bm-field-backgroundColor').value.trim();
        const textColor = document.getElementById('bm-field-textColor').value.trim();

        const logoUrl = document.getElementById('bm-field-logoUrl')?.value.trim() || 'https://storage.googleapis.com/bluesystem-assets/logo.png';
        const iconUrl = document.getElementById('bm-field-iconUrl')?.value.trim() || 'https://storage.googleapis.com/bluesystem-assets/icon.png';

        const termsUrl = (document.getElementById('bm-field-termsUrl')?.value || '').trim();
        const privacyUrl = (document.getElementById('bm-field-privacyUrl')?.value || '').trim();

        const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
        if (!hexRegex.test(primaryColor) || !hexRegex.test(secondaryColor) || !hexRegex.test(accentColor) || !hexRegex.test(backgroundColor) || !hexRegex.test(textColor)) {
            alert("Formato de color hexadecimal inválido. Debe ser #RGB o #RRGGBB.");
            return;
        }

        // Validación estricta WHATWG URL de URLs legales HTTPS (Protocolo TGO-AUTH-UXUI-CORRECTION-003)
        const validateLegalHttpsUrl = (urlString) => {
            if (!urlString) return true;
            try {
                const parsed = new URL(urlString);
                // 1. Protocolo obligatorio HTTPS (rechazar cualquier otro esquema)
                if (parsed.protocol !== 'https:') return false;
                // 4. Rechazar credenciales embebidas en URL (user:pass@host)
                if (parsed.username || parsed.password) return false;
                // 2. Hostname exactamente tuanigo.app o subdominio expresamente autorizado
                const host = (parsed.hostname || '').toLowerCase();
                if (!host || host.length < 4 || host.length > 253) return false;
                const isAuthorized = host === 'tuanigo.app' || 
                                     host.endsWith('.tuanigo.app') || 
                                     host === 'tuanigo.com' || 
                                     host.endsWith('.tuanigo.com');
                if (!isAuthorized) return false;
                // 3. Rechazar dominios engañosos y hosts mal formados
                const labels = host.split('.');
                if (labels.length < 2) return false;
                for (const label of labels) {
                    if (!label || label.length > 63) return false;
                    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
                }
                return true;
            } catch (_) {
                return false;
            }
        };

        if (termsUrl && !validateLegalHttpsUrl(termsUrl)) {
            alert("La URL de Términos y Condiciones debe ser una URL segura con protocolo HTTPS bajo el dominio tuanigo.app o subdominios autorizados (ej: https://tuanigo.app/terminos), sin credenciales embebidas.");
            return;
        }
        if (privacyUrl && !validateLegalHttpsUrl(privacyUrl)) {
            alert("La URL de Políticas de Privacidad debe ser una URL segura con protocolo HTTPS bajo el dominio tuanigo.app o subdominios autorizados (ej: https://tuanigo.app/privacidad), sin credenciales embebidas.");
            return;
        }


        const now = Date.now();
        const currentUser = firebase.auth().currentUser;
        const currentUid = currentUser ? currentUser.uid : 'admin_system';

        const existingMetadata = (brandManagerModule.currentEditingBrand && brandManagerModule.currentEditingBrand.metadata) || {};
        const brandDocData = {
            brandId,
            tenantId,
            displayName,
            shortName,
            slug,
            status,
            schemaVersion: "1.0",
            visual: {
                logoUrl,
                iconUrl,
                splashUrl: logoUrl,
                faviconUrl: iconUrl,
                primaryColor,
                secondaryColor,
                accentColor,
                backgroundColor,
                textColor,
                fontFamily: "Inter, sans-serif"
            },
            metadata: {
                supportEmail: existingMetadata.supportEmail || ("soporte@" + slug + ".com"),
                supportPhone: existingMetadata.supportPhone || "+505 8888 8888",
                website: existingMetadata.website || ("https://" + slug + ".bluesystemdelivery.com"),
                termsUrl: termsUrl,
                privacyUrl: privacyUrl
            },
            updatedAt: now,
            updatedBy: currentUid
        };

        if (!isEditing) {
            brandDocData.createdAt = now;
            brandDocData.createdBy = currentUid;
        }

        const btn = document.getElementById('bm-save-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>⏳</span> Guardando...`;
        }

        try {
            await db.collection('brands').doc(brandId).set(brandDocData, { merge: true });

            // Audit log
            try {
                await db.collection('audit_events').add({
                    eventId: `audit_${Date.now()}`,
                    eventType: isEditing ? 'BRAND_UPDATED' : 'BRAND_CREATED',
                    actorUid: currentUid,
                    targetBrandId: brandId,
                    targetTenantId: tenantId,
                    timestamp: now,
                    metadata: { displayName, slug, status }
                });
            } catch (auditErr) {
                console.warn("[BRAND_MANAGER] No se pudo registrar auditoría:", auditErr);
            }

            alert(`Marca ${displayName} guardada exitosamente.`);
            brandManagerModule.closeModal();
        } catch (err) {
            console.error("[BRAND_MANAGER] Error guardando marca:", err);
            alert("Error al guardar la marca: " + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>💾</span> Guardar Marca`;
            }
        }
    },

    openPreviewModal: (brandId) => {
        const brand = brandManagerModule.brands.find(b => b.brandId === brandId);
        if (!brand) return;

        const visual = brand.visual || {};
        const primary = visual.primaryColor || '#0284C7';
        const secondary = visual.secondaryColor || '#0EA5E9';
        const bg = visual.backgroundColor || '#0F172A';
        const text = visual.textColor || '#F8FAFC';
        const logoUrl = visual.logoUrl || 'https://storage.googleapis.com/bluesystem-assets/logo.png';

        const modalBackdrop = document.getElementById('bm-modal-backdrop');
        const modalContent = document.getElementById('bm-modal-content');
        if (!modalBackdrop || !modalContent) return;

        modalContent.innerHTML = `
            <div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">👁️</span>
                    <div>
                        <h3 class="text-lg font-black text-white">Previsualización de Branding: ${brand.displayName}</h3>
                        <p class="text-xs text-slate-400">Simulación en vivo de temas Web y Mobile (Read-Only)</p>
                    </div>
                </div>
                <button onclick="brandManagerModule.closeModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>
            <div class="p-6 space-y-6">
                <!-- Mobile Mockup Simulator -->
                <div class="max-w-sm mx-auto rounded-3xl p-4 shadow-2xl border-4 border-slate-800 transition duration-300" style="background-color: ${bg}; color: ${text};">
                    <div class="flex justify-between items-center pb-4 border-b border-slate-700/40">
                        <div class="flex items-center gap-2">
                            <img src="${logoUrl}" class="w-8 h-8 object-contain">
                            <span class="font-bold text-xs">${brand.displayName}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded font-bold" style="background-color: ${primary}; color: #ffffff;">Abierto</span>
                    </div>
                    <div class="py-6 space-y-3 text-center">
                        <h4 class="text-sm font-black">Entrega Rápida y Segura</h4>
                        <p class="text-[11px] opacity-75">Tu comida y productos favoritos en minutos.</p>
                        <button class="w-full py-2 rounded-xl text-xs font-bold text-white shadow-lg" style="background-color: ${primary};">
                            Pedir Ahora
                        </button>
                        <button class="w-full py-2 rounded-xl text-xs font-bold text-white shadow-lg" style="background-color: ${secondary};">
                            Ver Catálogo
                        </button>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
                <button onclick="brandManagerModule.closeModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">Cerrar Preview</button>
            </div>
        `;

        modalBackdrop.classList.remove('hidden');
    },

    closeModal: () => {
        const modalBackdrop = document.getElementById('bm-modal-backdrop');
        if (modalBackdrop) modalBackdrop.classList.add('hidden');
        brandManagerModule.currentEditingBrand = null;
    }
};

window.brandManagerModule = brandManagerModule;
