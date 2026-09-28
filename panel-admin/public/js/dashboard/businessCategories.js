// ===============================================================================
// BLUESYSTEM DELIVERY ENTERPRISE — Business Categories Global Platform Master
// Sovereign Collection: /business_categories/{id} (SSOT v2.2)
// Governance Center / Catálogo Maestro de Rubros Comerciales
// ===============================================================================

const businessCategoriesModule = {
    allCategoriesCache: [],
    businessCountsMap: {},
    unsubscribeListener: null,
    activeFilter: 'ALL', // 'ALL' | 'ACTIVE' | 'ONBOARDING' | 'INACTIVE'
    currentEditingId: null,

    // Emojis sugeridos para selección rápida
    suggestedEmojis: ['🍔', '🍕', '🍣', '🌮', '🍗', '💊', '🛒', '🍾', '🏪', '📦', '☕', '🧁', '🥩', '💐', '📱', '👕', '🛠️'],

    init: () => {
        console.log('[BUSINESS_CATEGORIES] Inicializando módulo de Gobernanza de Rubros Comerciales...');
        businessCategoriesModule.loadCategories();
    },

    loadCategories: () => {
        if (businessCategoriesModule.unsubscribeListener) {
            businessCategoriesModule.unsubscribeListener();
        }

        const container = document.getElementById('business-categories-container');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center p-12 text-slate-400">
                    <div class="flex items-center gap-3">
                        <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-xs font-bold">Cargando catálogo maestro de rubros...</span>
                    </div>
                </div>
            `;
        }

        businessCategoriesModule.unsubscribeListener = db.collection('business_categories')
            .orderBy('sortOrder', 'asc')
            .onSnapshot(async (snapshot) => {
                const categories = [];
                snapshot.forEach(doc => {
                    categories.push({ id: doc.id, ...doc.data() });
                });

                businessCategoriesModule.allCategoriesCache = categories;
                await businessCategoriesModule.loadCanonicalCounts(categories);
                businessCategoriesModule.render();
            }, (error) => {
                console.error('[BUSINESS_CATEGORIES] Error en listener onSnapshot:', error);
                if (typeof toast !== 'undefined') {
                    toast.show('Error sincronizando rubros comerciales: ' + error.message, 'error');
                }
            });
    },

    loadCanonicalCounts: async (categories) => {
        for (const cat of categories) {
            try {
                const snap = await db.collection('businesses')
                    .where('businessCategoryId', '==', cat.id)
                    .count()
                    .get();
                businessCategoriesModule.businessCountsMap[cat.id] = snap.data().count;
            } catch (err) {
                // Fallback silencioso si count() no está soportado en la versión de SDK del cliente
                businessCategoriesModule.businessCountsMap[cat.id] = 0;
            }
        }
    },

    render: () => {
        const mainContainer = document.getElementById('tab-content') || document.getElementById('businessCategories-tab');
        if (!mainContainer) return;

        if (!businessCategoriesModule.unsubscribeListener && businessCategoriesModule.allCategoriesCache.length === 0) {
            businessCategoriesModule.loadCategories();
            return;
        }

        const all = businessCategoriesModule.allCategoriesCache;
        let filtered = all;

        if (businessCategoriesModule.activeFilter === 'ACTIVE') {
            filtered = all.filter(c => c.active === true);
        } else if (businessCategoriesModule.activeFilter === 'ONBOARDING') {
            filtered = all.filter(c => c.active === true && c.showInOnboarding === true);
        } else if (businessCategoriesModule.activeFilter === 'INACTIVE') {
            filtered = all.filter(c => c.active === false);
        }

        const isEmpty = all.length === 0;

        mainContainer.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 select-none">
                
                <!-- HEADER DE GOBERNANZA -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-400">🏛️</span>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h2 class="text-lg font-black text-white">Rubros Comerciales</h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">SSOT v2.2</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">GLOBAL MASTER</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">
                                Catálogo maestro único que gobierna los rubros en el Portal de Afiliación, Comercios y Control Tower.
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2.5 w-full sm:w-auto">
                        ${isEmpty ? `
                            <button onclick="businessCategoriesModule.seedInitialCategories()" class="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30">
                                <span>🌱</span> Inicializar Seed Oficial (6 Rubros)
                            </button>
                        ` : ''}
                        <button onclick="businessCategoriesModule.openCreateModal()" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30">
                            <span>➕</span> Nuevo Rubro Comercial
                        </button>
                    </div>
                </div>

                <!-- FILTROS & MÉTRICAS RÁPIDAS -->
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        <button onclick="businessCategoriesModule.setFilter('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${businessCategoriesModule.activeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                            Todos (${all.length})
                        </button>
                        <button onclick="businessCategoriesModule.setFilter('ONBOARDING')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${businessCategoriesModule.activeFilter === 'ONBOARDING' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                            🟢 En Afiliación (${all.filter(c => c.active === true && c.showInOnboarding === true).length})
                        </button>
                        <button onclick="businessCategoriesModule.setFilter('ACTIVE')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${businessCategoriesModule.activeFilter === 'ACTIVE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                            Activos en Plataforma (${all.filter(c => c.active === true).length})
                        </button>
                        <button onclick="businessCategoriesModule.setFilter('INACTIVE')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${businessCategoriesModule.activeFilter === 'INACTIVE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                            Pausados (${all.filter(c => c.active === false).length})
                        </button>
                    </div>

                    <div class="text-[11px] text-slate-400 font-medium">
                        Regla: <span class="text-slate-200">Soft-Delete exclusivo</span>. Cero Hard Delete. Inmutabilidad de identidad garantizada.
                    </div>
                </div>

                <!-- TABLA MASTER DE RUBROS -->
                <div class="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl" id="business-categories-container">
                    ${filtered.length === 0 ? `
                        <div class="p-12 text-center text-slate-500">
                            <span class="text-4xl block mb-2">📦</span>
                            <p class="text-sm font-bold text-slate-300">No se encontraron rubros comerciales</p>
                            <p class="text-xs text-slate-500 mt-1">Utiliza el botón de arriba para inicializar el catálogo o crear uno nuevo.</p>
                        </div>
                    ` : `
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-800 bg-slate-950/60 text-[10px] uppercase font-black tracking-wider text-slate-400">
                                        <th class="py-3 px-4 w-16 text-center">Orden</th>
                                        <th class="py-3 px-4 w-16 text-center">Icono</th>
                                        <th class="py-3 px-4">Nombre Oficial</th>
                                        <th class="py-3 px-4">Slug Canónico (Document ID)</th>
                                        <th class="py-3 px-4 text-center">En Afiliación</th>
                                        <th class="py-3 px-4 text-center">Estado</th>
                                        <th class="py-3 px-4 text-center">Comercios Canónicos</th>
                                        <th class="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60 font-medium">
                                    ${filtered.map(cat => {
                                        const count = businessCategoriesModule.businessCountsMap[cat.id] || 0;
                                        const isVisibleOnboarding = cat.active === true && cat.showInOnboarding === true;
                                        return `
                                            <tr class="hover:bg-slate-800/40 transition duration-150">
                                                <td class="py-3 px-4 text-center font-mono font-bold text-indigo-400">
                                                    #${cat.sortOrder || 1}
                                                </td>
                                                <td class="py-3 px-4 text-center text-xl">
                                                    ${cat.icon || '🏷️'}
                                                </td>
                                                <td class="py-3 px-4 text-white font-bold">
                                                    ${cat.name}
                                                    ${cat.legacyAliases && cat.legacyAliases.length > 0 ? `
                                                        <div class="text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-xs" title="${cat.legacyAliases.join(', ')}">
                                                            Aliases: ${cat.legacyAliases.slice(0, 3).join(', ')}${cat.legacyAliases.length > 3 ? '...' : ''}
                                                        </div>
                                                    ` : ''}
                                                </td>
                                                <td class="py-3 px-4 font-mono text-indigo-300 text-[11px]">
                                                    <code>${cat.id}</code>
                                                </td>
                                                <td class="py-3 px-4 text-center">
                                                    ${isVisibleOnboarding ? `
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                            🟢 Visible
                                                        </span>
                                                    ` : `
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                                            ⚪ Oculto
                                                        </span>
                                                    `}
                                                </td>
                                                <td class="py-3 px-4 text-center">
                                                    ${cat.active !== false ? `
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                                                            Activo
                                                        </span>
                                                    ` : `
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                            Pausado
                                                        </span>
                                                    `}
                                                </td>
                                                <td class="py-3 px-4 text-center">
                                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${count > 0 ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60' : 'bg-slate-950 text-slate-400 border border-slate-800'}" title="Indica comercios vinculados explícitamente mediante businessCategoryId. Los comercios históricos legacy no migrados no alteran esta cifra.">
                                                        🏪 ${count} <span class="text-[9px] text-slate-400 font-sans">[v2.2+]</span>
                                                    </span>
                                                </td>
                                                <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                                    <button onclick="businessCategoriesModule.openEditModal('${cat.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition">
                                                        ✏️ Editar
                                                    </button>
                                                    <button onclick="businessCategoriesModule.toggleStatus('${cat.id}', ${cat.active !== false})" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition ${cat.active !== false ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/50' : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/50'}">
                                                        ${cat.active !== false ? '⏸️ Pausar' : '▶️ Activar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>

            </div>
        `;
    },

    setFilter: (filter) => {
        businessCategoriesModule.activeFilter = filter;
        businessCategoriesModule.render();
    },

    openCreateModal: () => {
        businessCategoriesModule.currentEditingId = null;
        const nextOrder = businessCategoriesModule.allCategoriesCache.length + 1;

        const modalHtml = `
            <div class="p-6 space-y-5 bg-slate-900 text-slate-100 rounded-2xl max-w-lg mx-auto border border-slate-800 select-none">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">➕</span>
                        <h3 class="text-base font-black text-white">Nuevo Rubro Comercial</h3>
                    </div>
                    <button type="button" onclick="modal.close('categoryModal')" class="text-slate-400 hover:text-white text-sm font-bold">✕</button>
                </div>

                <form id="createCategoryForm" onsubmit="businessCategoriesModule.handleSave(event)" class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Oficial del Rubro *</label>
                        <input type="text" id="catModalName" required oninput="businessCategoriesModule.autoSlugOnInput()" placeholder="Ej: Veterinaria & Mascotas" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Slug Canónico Inmutable (Document ID) *</label>
                        <input type="text" id="catModalSlug" required placeholder="veterinaria_mascotas" class="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-indigo-400 font-mono focus:outline-none focus:border-indigo-500">
                        <p class="text-[10px] text-slate-500 mt-1">Este identificador será la clave primaria en Firestore y es estrictamente inmutable.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Icono / Emoji *</label>
                            <input type="text" id="catModalIcon" required value="🏷️" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                            <div class="flex flex-wrap gap-1 mt-2">
                                ${businessCategoriesModule.suggestedEmojis.slice(0, 8).map(e => `
                                    <button type="button" onclick="document.getElementById('catModalIcon').value = '${e}'" class="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-xs transition">${e}</button>
                                `).join('')}
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Orden de Despliegue *</label>
                            <input type="number" id="catModalOrder" required value="${nextOrder}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aliases Históricos (Separados por coma)</label>
                        <input type="text" id="catModalAliases" placeholder="Ej: Mascotas, Veterinaria, PET_SHOP" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>

                    <div class="pt-2">
                        <label class="flex items-center gap-2 cursor-pointer bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <input type="checkbox" id="catModalShowOnboarding" checked class="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
                            <div>
                                <span class="text-xs font-bold text-white block">Habilitar en Portal de Afiliación</span>
                                <span class="text-[10px] text-slate-400 block">Disponible para nuevos comercios en el selector de afiliación.</span>
                            </div>
                        </label>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                        <button type="button" onclick="modal.close('categoryModal')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition">
                            Cancelar
                        </button>
                        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition">
                            💾 Guardar Rubro
                        </button>
                    </div>
                </form>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('categoryModal', modalHtml);
    },

    openEditModal: (id) => {
        const cat = businessCategoriesModule.allCategoriesCache.find(c => c.id === id);
        if (!cat) return;

        businessCategoriesModule.currentEditingId = id;

        const modalHtml = `
            <div class="p-6 space-y-5 bg-slate-900 text-slate-100 rounded-2xl max-w-lg mx-auto border border-slate-800 select-none">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">✏️</span>
                        <h3 class="text-base font-black text-white">Editar Rubro: <span class="text-indigo-400 font-mono">${cat.id}</span></h3>
                    </div>
                    <button type="button" onclick="modal.close('categoryModal')" class="text-slate-400 hover:text-white text-sm font-bold">✕</button>
                </div>

                <form id="editCategoryForm" onsubmit="businessCategoriesModule.handleSave(event)" class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Oficial del Rubro *</label>
                        <input type="text" id="catModalName" required value="${cat.name || ''}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Slug Canónico Inmutable</label>
                        <input type="text" id="catModalSlug" disabled value="${cat.id}" class="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-500 font-mono cursor-not-allowed">
                        <p class="text-[10px] text-slate-500 mt-1">El identificador canónico es inmutable para proteger la integridad referencial.</p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Icono / Emoji *</label>
                            <input type="text" id="catModalIcon" required value="${cat.icon || '🏷️'}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                            <div class="flex flex-wrap gap-1 mt-2">
                                ${businessCategoriesModule.suggestedEmojis.slice(0, 8).map(e => `
                                    <button type="button" onclick="document.getElementById('catModalIcon').value = '${e}'" class="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-xs transition">${e}</button>
                                `).join('')}
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Orden de Despliegue *</label>
                            <input type="number" id="catModalOrder" required value="${cat.sortOrder || 1}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aliases Históricos (Separados por coma)</label>
                        <input type="text" id="catModalAliases" value="${(cat.legacyAliases || []).join(', ')}" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                    </div>

                    <div class="pt-2">
                        <label class="flex items-center gap-2 cursor-pointer bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <input type="checkbox" id="catModalShowOnboarding" ${cat.showInOnboarding !== false ? 'checked' : ''} ${cat.active === false ? 'disabled' : ''} class="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
                            <div>
                                <span class="text-xs font-bold text-white block">Habilitar en Portal de Afiliación</span>
                                <span class="text-[10px] text-slate-400 block">${cat.active === false ? 'Deshabilitado porque el rubro está pausado.' : 'Disponible para nuevos comercios en el selector de afiliación.'}</span>
                            </div>
                        </label>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                        <button type="button" onclick="modal.close('categoryModal')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition">
                            Cancelar
                        </button>
                        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition">
                            💾 Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('categoryModal', modalHtml);
    },

    autoSlugOnInput: () => {
        const nameInput = document.getElementById('catModalName');
        const slugInput = document.getElementById('catModalSlug');
        if (nameInput && slugInput) {
            slugInput.value = nameInput.value
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .substring(0, 40);
        }
    },

    handleSave: async (e) => {
        e.preventDefault();
        const isEdit = Boolean(businessCategoriesModule.currentEditingId);
        const name = document.getElementById('catModalName').value.trim();
        const slug = (isEdit ? businessCategoriesModule.currentEditingId : document.getElementById('catModalSlug').value.trim()).toLowerCase();
        const icon = document.getElementById('catModalIcon').value.trim() || '🏷️';
        const sortOrder = parseInt(document.getElementById('catModalOrder').value) || 1;
        const showInOnboarding = document.getElementById('catModalShowOnboarding').checked;
        const rawAliases = document.getElementById('catModalAliases').value;
        const legacyAliases = rawAliases.split(',').map(a => a.trim()).filter(Boolean);

        if (!slug) {
            if (typeof toast !== 'undefined') toast.show('El identificador del rubro no puede estar vacío.', 'error');
            return;
        }

        try {
            // Intentar ejecutar via Cloud Function Callable con auditoría atómica
            let useDirectFallback = false;
            if (typeof firebase !== 'undefined' && firebase.functions) {
                try {
                    const saveCallable = firebase.functions().httpsCallable('adminSaveBusinessCategory');
                    await saveCallable({
                        id: isEdit ? slug : undefined,
                        name,
                        icon,
                        sortOrder,
                        showInOnboarding,
                        legacyAliases
                    });
                } catch (fnErr) {
                    console.warn('[BUSINESS_CATEGORIES] Falló callable adminSaveBusinessCategory, ejecutando batch atómico directo:', fnErr);
                    useDirectFallback = true;
                }
            } else {
                useDirectFallback = true;
            }

            if (useDirectFallback) {
                // Batch Atómico Directo SDK: /business_categories + /audit_events en un solo commit
                const batch = db.batch();
                const now = firebase.firestore.FieldValue.serverTimestamp();
                const catRef = db.collection('business_categories').doc(slug);
                const auditRef = db.collection('audit_events').doc();
                const currentUid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : 'ADMIN_CONSOLE';
                const currentEmail = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin@bluesystem.com';

                if (!isEdit) {
                    // Check duplicate
                    const checkSnap = await catRef.get();
                    if (checkSnap.exists) {
                        if (typeof toast !== 'undefined') toast.show(`El rubro '${slug}' ya existe en el sistema.`, 'error');
                        return;
                    }

                    const initialAliases = Array.from(new Set([name, slug, ...legacyAliases]));
                    batch.set(catRef, {
                        id: slug,
                        name,
                        icon,
                        sortOrder,
                        active: true,
                        showInOnboarding,
                        legacyAliases: initialAliases,
                        createdAt: now,
                        createdBy: currentUid,
                        updatedAt: now,
                        updatedBy: currentUid
                    });

                    batch.set(auditRef, {
                        eventId: auditRef.id,
                        eventType: 'BUSINESS_CATEGORY_CREATED',
                        entityType: 'BUSINESS_CATEGORY',
                        entityId: slug,
                        actor: { uid: currentUid, email: currentEmail, role: 'admin' },
                        timestamp: now,
                        metadata: { id: slug, name, icon, sortOrder, showInOnboarding }
                    });
                } else {
                    const existingCat = businessCategoriesModule.allCategoriesCache.find(c => c.id === slug);
                    const effectiveShow = (existingCat && existingCat.active === false) ? false : showInOnboarding;

                    batch.update(catRef, {
                        name,
                        icon,
                        sortOrder,
                        showInOnboarding: effectiveShow,
                        legacyAliases: legacyAliases.length > 0 ? legacyAliases : (existingCat ? existingCat.legacyAliases : [name]),
                        updatedAt: now,
                        updatedBy: currentUid
                    });

                    batch.set(auditRef, {
                        eventId: auditRef.id,
                        eventType: 'BUSINESS_CATEGORY_UPDATED',
                        entityType: 'BUSINESS_CATEGORY',
                        entityId: slug,
                        actor: { uid: currentUid, email: currentEmail, role: 'admin' },
                        timestamp: now,
                        metadata: { id: slug, name, icon, sortOrder, showInOnboarding: effectiveShow }
                    });
                }

                await batch.commit();
            }

            if (typeof modal !== 'undefined') modal.close('categoryModal');
            if (typeof toast !== 'undefined') {
                toast.show(isEdit ? 'Rubro comercial actualizado con auditoría atómica.' : 'Rubro comercial creado exitosamente.', 'success');
            }
        } catch (err) {
            console.error('[BUSINESS_CATEGORIES] Error guardando rubro:', err);
            if (typeof toast !== 'undefined') {
                toast.show('Error guardando rubro: ' + err.message, 'error');
            }
        }
    },

    toggleStatus: async (categoryId, currentActive) => {
        const targetActive = !currentActive;
        const actionLabel = targetActive ? 'activar' : 'pausar';

        const confirmMsg = targetActive
            ? `¿Deseas reactivar el rubro '${categoryId}'? Volverá a estar disponible en la plataforma.`
            : `¿Deseas pausar el rubro '${categoryId}'? Los comercios existentes permanecerán intactos, pero no se aceptarán nuevas afiliaciones.`;

        if (!confirm(confirmMsg)) return;

        try {
            let useDirectFallback = false;
            if (typeof firebase !== 'undefined' && firebase.functions) {
                try {
                    const toggleCallable = firebase.functions().httpsCallable('adminToggleBusinessCategoryStatus');
                    await toggleCallable({
                        categoryId,
                        active: targetActive
                    });
                } catch (fnErr) {
                    console.warn('[BUSINESS_CATEGORIES] Falló callable adminToggleBusinessCategoryStatus, ejecutando batch atómico directo:', fnErr);
                    useDirectFallback = true;
                }
            } else {
                useDirectFallback = true;
            }

            if (useDirectFallback) {
                const batch = db.batch();
                const now = firebase.firestore.FieldValue.serverTimestamp();
                const catRef = db.collection('business_categories').doc(categoryId);
                const auditRef = db.collection('audit_events').doc();
                const currentUid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : 'ADMIN_CONSOLE';
                const currentEmail = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin@bluesystem.com';

                batch.update(catRef, {
                    active: targetActive,
                    showInOnboarding: targetActive ? true : false,
                    updatedAt: now,
                    updatedBy: currentUid
                });

                batch.set(auditRef, {
                    eventId: auditRef.id,
                    eventType: targetActive ? 'BUSINESS_CATEGORY_ACTIVATED' : 'BUSINESS_CATEGORY_DEACTIVATED',
                    entityType: 'BUSINESS_CATEGORY',
                    entityId: categoryId,
                    actor: { uid: currentUid, email: currentEmail, role: 'admin' },
                    timestamp: now,
                    metadata: { categoryId, active: targetActive, showInOnboarding: targetActive }
                });

                await batch.commit();
            }

            if (typeof toast !== 'undefined') {
                toast.show(`Rubro comercial ${targetActive ? 'activado' : 'pausado'} con éxito.`, 'success');
            }
        } catch (err) {
            console.error('[BUSINESS_CATEGORIES] Error cambiando estado:', err);
            if (typeof toast !== 'undefined') {
                toast.show('Error actualizando estado: ' + err.message, 'error');
            }
        }
    },

    seedInitialCategories: async () => {
        if (!confirm('¿Deseas inicializar el catálogo con los 6 rubros oficiales canónicos?')) return;

        try {
            let useDirectFallback = false;
            if (typeof firebase !== 'undefined' && firebase.functions) {
                try {
                    const seedCallable = firebase.functions().httpsCallable('adminSeedBusinessCategories');
                    const res = await seedCallable({});
                    if (res.data && res.data.seeded === false) {
                        alert(res.data.message);
                        return;
                    }
                } catch (fnErr) {
                    console.warn('[BUSINESS_CATEGORIES] Falló callable adminSeedBusinessCategories, ejecutando seed directo:', fnErr);
                    useDirectFallback = true;
                }
            } else {
                useDirectFallback = true;
            }

            if (useDirectFallback) {
                const check = await db.collection('business_categories').get();
                if (!check.empty) {
                    alert(`La colección ya contiene ${check.size} documentos. No se requiere inicialización.`);
                    return;
                }

                const seedData = [
                    { id: 'restaurante', name: 'Restaurante / Comida', icon: '🍔', sortOrder: 1, active: true, showInOnboarding: true, legacyAliases: ['Restaurante', 'Restaurantes', 'restaurante', 'RESTAURANT', 'Comida Rápida'] },
                    { id: 'farmacia', name: 'Farmacia', icon: '💊', sortOrder: 2, active: true, showInOnboarding: true, legacyAliases: ['Farmacia', 'Farmacias', 'farmacia', 'PHARMACY'] },
                    { id: 'supermercado', name: 'Supermercado / Mini Super', icon: '🛒', sortOrder: 3, active: true, showInOnboarding: true, legacyAliases: ['Supermercado', 'Supermercados', 'supermercado', 'SUPERMARKET'] },
                    { id: 'licoreria', name: 'Licorería', icon: '🍾', sortOrder: 4, active: true, showInOnboarding: true, legacyAliases: ['Licorería', 'Licorerias', 'licoreria', 'LIQUOR_STORE'] },
                    { id: 'tienda', name: 'Tienda / Abarrotes', icon: '🏪', sortOrder: 5, active: true, showInOnboarding: true, legacyAliases: ['Tienda', 'Tiendas', 'tienda', 'CONVENIENCE'] },
                    { id: 'otra', name: 'Otra categoría', icon: '📦', sortOrder: 6, active: true, showInOnboarding: true, legacyAliases: ['Otra', 'Otras', 'otra', 'OTHER'] },
                ];

                const batch = db.batch();
                const now = firebase.firestore.FieldValue.serverTimestamp();
                const auditRef = db.collection('audit_events').doc();
                const currentUid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : 'ADMIN_CONSOLE';
                const currentEmail = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.email : 'admin@bluesystem.com';

                for (const cat of seedData) {
                    const ref = db.collection('business_categories').doc(cat.id);
                    batch.set(ref, {
                        ...cat,
                        createdAt: now,
                        createdBy: currentUid,
                        updatedAt: now,
                        updatedBy: currentUid
                    });
                }

                batch.set(auditRef, {
                    eventId: auditRef.id,
                    eventType: 'BUSINESS_CATEGORY_CREATED',
                    entityType: 'BUSINESS_CATEGORY',
                    entityId: 'INITIAL_SEED_BATCH',
                    actor: { uid: currentUid, email: currentEmail, role: 'admin' },
                    timestamp: now,
                    metadata: { seededCount: seedData.length, categories: seedData.map(c => c.id) }
                });

                await batch.commit();
            }

            if (typeof toast !== 'undefined') toast.show('Catálogo de 6 rubros inicializado exitosamente.', 'success');
        } catch (err) {
            console.error('[BUSINESS_CATEGORIES] Error inicializando seed:', err);
            if (typeof toast !== 'undefined') toast.show('Error inicializando seed: ' + err.message, 'error');
        }
    },

    destroy: () => {
        if (businessCategoriesModule.unsubscribeListener) {
            businessCategoriesModule.unsubscribeListener();
            businessCategoriesModule.unsubscribeListener = null;
        }
    }
};

window.businessCategoriesModule = businessCategoriesModule;
