// Módulo de Gestión de Categorías Enterprise (categories collection - 3 Niveles)
const categoriesModule = {
    activeTabFilter: 'ALL', // 'ALL' | 'BUSINESS' | 'PRODUCT' | 'HOME'
    allCategoriesCache: [],
    unsubscribeListener: null,

    // Colección de emojis predefinidos organizados por categoría operacional
    emojiCatalog: [
        { group: "Comida & Restaurantes", emojis: ["🍔", "🍕", "🍗", "🥩", "🌮", "🍣", "🍜", "🥗", "🍰", "🥖", "🍦", "🥤", "☕", "🍺"] },
        { group: "Comercios & Retail", emojis: ["🏪", "🛒", "🏬", "🛍️", "🎁", "💐", "📚", "👕", "👟", "🧴", "💄"] },
        { group: "Tecnología & Servicios", emojis: ["💻", "📱", "🎮", "🎧", "⚡", "🔧", "🚗", "📦", "🏠", "💊", "🐶", "⚽"] }
    ],

    render: () => {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header Enterprise -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                    <div>
                        <h2 class="text-2xl font-black text-gray-100 flex items-center gap-2">
                            🏷️ Centro de Categorías BlueSystem
                            <span class="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full">v2.1 Enterprise</span>
                        </h2>
                        <p class="text-xs text-gray-400 mt-1">Administra la jerarquía global de categorías para Comercios, Productos y la Pantalla Principal (Home) de Android en tiempo real.</p>
                    </div>

                    <!-- Filtros por Pestañas y Restauración Global -->
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" onclick="categoriesModule.seedDefaultCategories()" class="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                            🌱 Restaurar Categorías Globales
                        </button>

                        <div class="flex items-center gap-1.5 bg-gray-950 p-1.5 rounded-xl border border-gray-800 text-xs">
                            <button onclick="categoriesModule.setTabFilter('ALL')" id="tab-btn-ALL" class="px-3 py-1.5 rounded-lg font-semibold transition bg-blue-600 text-white">Todas</button>
                            <button onclick="categoriesModule.setTabFilter('BUSINESS')" id="tab-btn-BUSINESS" class="px-3 py-1.5 rounded-lg font-semibold text-gray-400 hover:text-white transition">🏪 Comercios</button>
                            <button onclick="categoriesModule.setTabFilter('PRODUCT')" id="tab-btn-PRODUCT" class="px-3 py-1.5 rounded-lg font-semibold text-gray-400 hover:text-white transition">🛍️ Productos</button>
                            <button onclick="categoriesModule.setTabFilter('HOME')" id="tab-btn-HOME" class="px-3 py-1.5 rounded-lg font-semibold text-gray-400 hover:text-white transition">🏠 Visibles en Home</button>
                        </div>
                    </div>
                </div>

                <!-- Grid Principal: Formulario + Vista Previa Live + Tabla -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <!-- Columna Izquierda: Formulario + Selector de Iconos (5 cols) -->
                    <div class="lg:col-span-5 space-y-6">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
                            <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                                <h3 class="text-sm font-bold text-gray-200 flex items-center gap-2" id="cat-form-title">
                                    <span>🆕</span> Nueva Categoría
                                </h3>
                                <button type="button" onclick="categoriesModule.resetForm()" class="text-xs text-gray-400 hover:text-white">Limpiar</button>
                            </div>

                            <form id="categoryForm" onsubmit="categoriesModule.handleSubmit(event)" class="space-y-4">
                                <input type="hidden" id="catId">

                                <div class="grid grid-cols-2 gap-3">
                                    <!-- Tipo de Categoría -->
                                    <div class="space-y-1">
                                        <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tipo Operacional *</label>
                                        <select id="catType" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                                            <option value="BUSINESS">🏪 Comercio (Giro de negocio)</option>
                                            <option value="PRODUCT">🛍️ Producto (Taxonomía global)</option>
                                        </select>
                                    </div>

                                    <!-- Orden de Despliegue -->
                                    <div class="space-y-1">
                                        <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Orden (ASC) *</label>
                                        <input type="number" id="catOrderIndex" value="1" min="1" required class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono">
                                    </div>
                                </div>

                                <!-- Nombre -->
                                <div class="space-y-1">
                                    <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre de Categoría *</label>
                                    <input type="text" id="catName" required oninput="categoriesModule.autoGenerateSlug()" placeholder="Ej: Restaurantes, Tecnología, Mascotas" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                                </div>

                                <!-- Slug -->
                                <div class="space-y-1">
                                    <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Slug URL / Identificador *</label>
                                    <input type="text" id="catSlug" required placeholder="ej: restaurantes-nicas" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500">
                                </div>

                                <!-- Tipo de Representación e Icono -->
                                <div class="space-y-2 border-t border-gray-800 pt-3">
                                    <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Representación Visual</label>
                                    
                                    <div class="grid grid-cols-3 gap-2 text-xs">
                                        <label class="flex items-center gap-1.5 p-2 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer">
                                            <input type="radio" name="iconType" value="EMOJI" checked onchange="categoriesModule.handleIconTypeChange('EMOJI')" class="accent-blue-600">
                                            <span class="text-gray-300 font-medium">Emoji</span>
                                        </label>
                                        <label class="flex items-center gap-1.5 p-2 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer">
                                            <input type="radio" name="iconType" value="SYSTEM_ICON" onchange="categoriesModule.handleIconTypeChange('SYSTEM_ICON')" class="accent-blue-600">
                                            <span class="text-gray-300 font-medium">Icono App</span>
                                        </label>
                                        <label class="flex items-center gap-1.5 p-2 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer">
                                            <input type="radio" name="iconType" value="IMAGE_URL" onchange="categoriesModule.handleIconTypeChange('IMAGE_URL')" class="accent-blue-600">
                                            <span class="text-gray-300 font-medium">Imagen URL</span>
                                        </label>
                                    </div>

                                    <!-- Campo EMOJI u Icono Primario -->
                                    <div id="emoji-input-container" class="space-y-2">
                                        <div class="flex gap-2 items-center">
                                            <input type="text" id="catIcon" value="🍔" maxlength="4" class="w-16 text-center text-xl bg-gray-950 border border-gray-800 rounded-lg p-2 text-white focus:outline-none">
                                            <span class="text-xs text-gray-400">Selecciona de la lista o escribe tu emoji</span>
                                        </div>

                                        <!-- Grid Selector de Emojis -->
                                        <div class="bg-gray-950 border border-gray-800 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-2">
                                            ${categoriesModule.emojiCatalog.map(cat => `
                                                <div>
                                                    <p class="text-[10px] font-bold text-gray-500 mb-1">${cat.group}</p>
                                                    <div class="flex flex-wrap gap-1.5">
                                                        ${cat.emojis.map(e => `
                                                            <button type="button" onclick="categoriesModule.selectEmoji('${e}')" class="w-7 h-7 flex items-center justify-center hover:bg-blue-600/30 hover:scale-110 rounded transition text-base">${e}</button>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>

                                    <!-- Campo Imagen URL (Opcional) -->
                                    <div id="image-url-container" class="space-y-1 hidden">
                                        <label class="text-[10px] text-gray-400">URL de Imagen Personalizada</label>
                                        <input type="url" id="catImageUrl" placeholder="https://ejemplo.com/icono.png" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                                    </div>
                                </div>

                                <!-- Colores y Descripción -->
                                <div class="grid grid-cols-2 gap-3 border-t border-gray-800 pt-3">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-gray-400">Color Acento</label>
                                        <div class="flex items-center gap-2">
                                            <input type="color" id="catColor" value="#3B82F6" class="w-8 h-8 rounded bg-transparent cursor-pointer border border-gray-800">
                                            <span class="text-xs font-mono text-gray-400" id="catColorText">#3B82F6</span>
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-gray-400">Color Fondo Chip</label>
                                        <div class="flex items-center gap-2">
                                            <input type="color" id="catBgColor" value="#EFF6FF" class="w-8 h-8 rounded bg-transparent cursor-pointer border border-gray-800">
                                            <span class="text-xs font-mono text-gray-400" id="catBgColorText">#EFF6FF</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-1">
                                    <label class="text-[10px] font-bold text-gray-400">Descripción u Observaciones</label>
                                    <textarea id="catDescription" rows="2" placeholder="Resumen para SEO o descripción operacional..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none"></textarea>
                                </div>

                                <!-- Toggles y Checkboxes de Configuración -->
                                <div class="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-2">
                                    <label class="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                                        <span class="flex items-center gap-1.5">
                                            <input type="checkbox" id="catActive" checked class="w-4 h-4 accent-blue-600 rounded">
                                            Categoría Activa
                                        </span>
                                        <span class="text-[10px] text-gray-500">Desactivación lógica</span>
                                    </label>

                                    <label class="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                                        <span class="flex items-center gap-1.5 font-bold text-blue-400">
                                            <input type="checkbox" id="catShowInHome" checked class="w-4 h-4 accent-blue-600 rounded">
                                            🏠 Visible en Home Android
                                        </span>
                                        <span class="text-[10px] text-blue-400 font-mono">CustomerHomeScreen</span>
                                    </label>

                                    <label class="flex items-center justify-between text-xs text-gray-300 cursor-pointer">
                                        <span class="flex items-center gap-1.5 text-amber-400">
                                            <input type="checkbox" id="catIsFeatured" class="w-4 h-4 accent-amber-500 rounded">
                                            ⭐ Categoría Destacada
                                        </span>
                                        <span class="text-[10px] text-amber-400 font-mono">Prioridad VIP</span>
                                    </label>
                                </div>

                                <div class="flex justify-end gap-2 pt-3 border-t border-gray-800">
                                    <button type="button" onclick="categoriesModule.resetForm()" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-lg transition">Cancelar</button>
                                    <button type="submit" id="save-cat-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg transition shadow-lg shadow-blue-600/30">💾 Guardar Categoría</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Columna Derecha: Live Preview Android + Tabla de Categorías (7 cols) -->
                    <div class="lg:col-span-7 space-y-6">
                        
                        <!-- Panel de Live Preview Android Home -->
                        <div class="bg-slate-950 border border-blue-900/40 rounded-xl p-4 shadow-2xl relative overflow-hidden">
                            <div class="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
                                <div class="flex items-center gap-2">
                                    <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <h4 class="text-xs font-black tracking-wider text-blue-400 uppercase flex items-center gap-1.5">
                                        📱 Vista Previa Live: Android Home
                                    </h4>
                                </div>
                                <span class="text-[10px] text-slate-500 font-mono">Sincronizado en tiempo real</span>
                            </div>

                            <!-- Simulador de Carrusel Horizontal de Android -->
                            <div class="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-xs font-extrabold text-slate-200">Categorías</span>
                                    <span class="text-[10px] text-slate-400" id="livePreviewCount">0 visibles</span>
                                </div>

                                <div id="livePreviewContainer" class="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                                    <p class="text-xs text-slate-500 italic p-2">Cargando vista previa del Home...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Tabla Principal de Categorías -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
                            <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                                <div class="flex items-center gap-3">
                                    <h3 class="text-sm font-bold text-gray-200">📋 Categorías Existentes</h3>
                                    <span id="catCount" class="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full">0</span>
                                </div>
                                
                                <div class="text-xs text-gray-400 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-green-500"></span> Activas
                                    <span class="w-2 h-2 rounded-full bg-red-500 ml-2"></span> Inactivas
                                </div>
                            </div>

                            <div id="categories-table-container">
                                <p class="text-xs text-gray-500 p-4 text-center">Cargando catálogo central de categorías...</p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        `;

        // Event Listeners de Color Picker
        document.getElementById('catColor')?.addEventListener('input', (e) => {
            document.getElementById('catColorText').textContent = e.target.value;
        });
        document.getElementById('catBgColor')?.addEventListener('input', (e) => {
            document.getElementById('catBgColorText').textContent = e.target.value;
        });

        categoriesModule.loadCategories();
    },

    setTabFilter: (tab) => {
        categoriesModule.activeTabFilter = tab;
        ['ALL', 'BUSINESS', 'PRODUCT', 'HOME'].forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            if (btn) {
                if (t === tab) {
                    btn.className = 'px-3 py-1.5 rounded-lg font-semibold transition bg-blue-600 text-white';
                } else {
                    btn.className = 'px-3 py-1.5 rounded-lg font-semibold text-gray-400 hover:text-white transition';
                }
            }
        });
        categoriesModule.renderTableAndPreview();
    },

    autoGenerateSlug: () => {
        const name = document.getElementById('catName').value;
        const slugInput = document.getElementById('catSlug');
        if (name && slugInput) {
            const slug = name.toLowerCase()
                .trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9 -]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
            slugInput.value = slug;
        }
    },

    selectEmoji: (emoji) => {
        const input = document.getElementById('catIcon');
        if (input) {
            input.value = emoji;
            categoriesModule.triggerLivePreviewUpdate();
        }
    },

    handleIconTypeChange: (type) => {
        const imgContainer = document.getElementById('image-url-container');
        if (imgContainer) {
            if (type === 'IMAGE_URL') {
                imgContainer.classList.remove('hidden');
            } else {
                imgContainer.classList.add('hidden');
            }
        }
    },

    resetForm: () => {
        const form = document.getElementById('categoryForm');
        if (form) form.reset();
        document.getElementById('catId').value = '';
        document.getElementById('catType').value = 'BUSINESS';
        document.getElementById('catOrderIndex').value = (categoriesModule.allCategoriesCache.length + 1);
        document.getElementById('catColor').value = '#3B82F6';
        document.getElementById('catColorText').textContent = '#3B82F6';
        document.getElementById('catBgColor').value = '#EFF6FF';
        document.getElementById('catBgColorText').textContent = '#EFF6FF';
        document.getElementById('catIcon').value = '🍔';
        document.getElementById('catActive').checked = true;
        document.getElementById('catShowInHome').checked = true;
        document.getElementById('catIsFeatured').checked = false;
        document.getElementById('cat-form-title').innerHTML = '<span>🆕</span> Nueva Categoría';
        categoriesModule.handleIconTypeChange('EMOJI');
    },

    loadCategories: () => {
        if (categoriesModule.unsubscribeListener) {
            categoriesModule.unsubscribeListener();
        }

        categoriesModule.unsubscribeListener = db.collection('categories')
            .orderBy('orderIndex', 'asc')
            .onSnapshot(snap => {
                const categories = [];
                snap.forEach(doc => {
                    categories.push({ id: doc.id, ...doc.data() });
                });

                categoriesModule.allCategoriesCache = categories;
                categoriesModule.renderTableAndPreview();
            }, err => {
                console.error("Error al cargar categorías:", err);
                toast.show("Error al cargar categorías: " + err.message, "error");
            });
    },

    renderTableAndPreview: () => {
        const all = categoriesModule.allCategoriesCache;
        let filtered = all;

        if (categoriesModule.activeTabFilter === 'BUSINESS') {
            filtered = all.filter(c => c.type === 'BUSINESS');
        } else if (categoriesModule.activeTabFilter === 'PRODUCT') {
            filtered = all.filter(c => c.type === 'PRODUCT');
        } else if (categoriesModule.activeTabFilter === 'HOME') {
            filtered = all.filter(c => c.showInHome === true);
        }

        const countBadge = document.getElementById('catCount');
        if (countBadge) countBadge.textContent = filtered.length;

        // 1. Renderizar Live Preview de Android
        const homeCategories = all.filter(c => c.showInHome === true && c.active !== false)
            .sort((a, b) => (a.orderIndex || 99) - (b.orderIndex || 99));

        const livePreviewContainer = document.getElementById('livePreviewContainer');
        const livePreviewCount = document.getElementById('livePreviewCount');
        if (livePreviewCount) livePreviewCount.textContent = `${homeCategories.length} visibles`;

        if (livePreviewContainer) {
            if (homeCategories.length === 0) {
                livePreviewContainer.innerHTML = '<p class="text-xs text-slate-500 italic p-2">No hay categorías configuradas para mostrar en Home.</p>';
            } else {
                livePreviewContainer.innerHTML = homeCategories.map(cat => {
                    const iconDisplay = cat.icon || '📁';
                    const isFeaturedBadge = cat.isFeatured ? '⭐' : '';
                    return `
                        <div class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition shadow-sm"
                             style="background-color: ${cat.bgColor || '#EFF6FF'}; color: #0F172A; border-color: ${cat.color || '#3B82F6'};">
                            <span class="text-lg">${iconDisplay}</span>
                            <span>${cat.name} ${isFeaturedBadge}</span>
                        </div>
                    `;
                }).join('');
            }
        }

        // 2. Renderizar Tabla de Categorías con Table Helper
        table.render(
            'categories-table-container',
            ['Icono', 'Nombre / Slug', 'Tipo', 'Home / ⭐', 'Orden', 'Estado', 'Acciones'],
            filtered,
            (cat) => {
                const icon = cat.imageUrl 
                    ? `<img src="${cat.imageUrl}" class="w-8 h-8 object-cover rounded bg-gray-950 p-1 border border-gray-800">`
                    : `<span class="text-xl p-1 bg-gray-950 rounded border border-gray-800 inline-block text-center w-9 h-9 leading-7">${cat.icon || '📁'}</span>`;

                const typeBadge = cat.type === 'PRODUCT'
                    ? '<span class="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20">PRODUCTO</span>'
                    : '<span class="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">COMERCIO</span>';

                const homeBadge = cat.showInHome
                    ? `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">Home ${cat.isFeatured ? '⭐' : ''}</span>`
                    : '<span class="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded">Oculta</span>';

                const activeBadge = cat.active !== false 
                    ? '<span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded border border-green-500/20">Activa</span>'
                    : '<span class="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/20">Inactiva</span>';

                return `
                    <td class="p-3">${icon}</td>
                    <td class="p-3">
                        <div class="font-bold text-gray-100 text-xs">${cat.name}</div>
                        <div class="font-mono text-[10px] text-blue-400">${cat.slug || '-'}</div>
                    </td>
                    <td class="p-3">${typeBadge}</td>
                    <td class="p-3">${homeBadge}</td>
                    <td class="p-3 font-mono text-xs text-gray-300 font-bold">#${cat.orderIndex || 1}</td>
                    <td class="p-3">${activeBadge}</td>
                    <td class="p-3">
                        <div class="flex gap-1.5">
                            <button onclick="categoriesModule.editCategory('${cat.id}')" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 rounded border border-gray-700 transition">Editar</button>
                            <button onclick="categoriesModule.toggleCategory('${cat.id}', ${cat.active !== false})" class="px-2 py-1 ${cat.active !== false ? 'bg-amber-950/30 text-amber-400 border-amber-800/40' : 'bg-green-950/30 text-green-400 border-green-800/40'} text-xs rounded border transition">${cat.active !== false ? 'Pausar' : 'Activar'}</button>
                            <button onclick="categoriesModule.deleteCategorySafe('${cat.id}', '${cat.name}')" class="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs rounded border border-red-800/50 transition">🗑️</button>
                        </div>
                    </td>
                `;
            }
        );
    },

    triggerLivePreviewUpdate: () => {
        categoriesModule.renderTableAndPreview();
    },

    editCategory: async (id) => {
        try {
            const doc = await db.collection('categories').doc(id).get();
            if (doc.exists) {
                const c = doc.data();
                document.getElementById('catId').value = id;
                document.getElementById('catType').value = c.type || 'BUSINESS';
                document.getElementById('catName').value = c.name || '';
                document.getElementById('catSlug').value = c.slug || '';
                document.getElementById('catIcon').value = c.icon || '📁';
                document.getElementById('catImageUrl').value = c.imageUrl || '';
                document.getElementById('catOrderIndex').value = c.orderIndex || 1;
                document.getElementById('catColor').value = c.color || '#3B82F6';
                document.getElementById('catColorText').textContent = c.color || '#3B82F6';
                document.getElementById('catBgColor').value = c.bgColor || '#EFF6FF';
                document.getElementById('catBgColorText').textContent = c.bgColor || '#EFF6FF';
                document.getElementById('catDescription').value = c.description || '';
                document.getElementById('catActive').checked = c.active !== false;
                document.getElementById('catShowInHome').checked = c.showInHome !== false;
                document.getElementById('catIsFeatured').checked = c.isFeatured === true;

                const iconType = c.iconType || (c.imageUrl ? 'IMAGE_URL' : 'EMOJI');
                const radio = document.querySelector(`input[name="iconType"][value="${iconType}"]`);
                if (radio) radio.checked = true;
                categoriesModule.handleIconTypeChange(iconType);

                document.getElementById('cat-form-title').innerHTML = '<span>📝</span> Editar Categoría';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    toggleCategory: async (id, currentActive) => {
        try {
            await db.collection('categories').doc(id).update({
                active: !currentActive,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Auditoría
            categoriesModule.logAudit('TOGGLE_CATEGORY_STATUS', id, { active: !currentActive });
            toast.show(currentActive ? 'Categoría pausada de la plataforma.' : 'Categoría activada con éxito.');
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    deleteCategorySafe: async (id, name) => {
        try {
            // Protección: Comprobar si existen comercios o productos con este categoryId / category name
            const bizSnap = await db.collection('businesses')
                .where('categoryId', '==', id)
                .get();

            const bizSnapLegacy = await db.collection('businesses')
                .where('category', '==', name)
                .get();

            const totalUsed = bizSnap.size + bizSnapLegacy.size;

            if (totalUsed > 0) {
                alert(`⚠️ La categoría "${name}" está asociada a ${totalUsed} comercio(s). No puede eliminarse para no comprometer los datos. Te sugerimos desactivarla.`);
                return;
            }

            if (!confirm(`¿Estás seguro de eliminar permanentemente la categoría "${name}"? Esta acción no se puede deshacer.`)) {
                return;
            }

            await db.collection('categories').doc(id).delete();
            categoriesModule.logAudit('DELETE_CATEGORY', id, { name });
            toast.show(`Categoría "${name}" eliminada.`);
        } catch (e) {
            toast.show("Error al eliminar categoría: " + e.message, 'error');
        }
    },

    handleSubmit: async (e) => {
        e.preventDefault();

        const btn = document.getElementById('save-cat-btn');
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        const id = document.getElementById('catId').value;
        const type = document.getElementById('catType').value;
        const name = document.getElementById('catName').value.trim();
        const slug = document.getElementById('catSlug').value.trim();
        const iconType = document.querySelector('input[name="iconType"]:checked')?.value || 'EMOJI';
        const icon = document.getElementById('catIcon').value.trim() || '📁';
        const imageUrl = document.getElementById('catImageUrl').value.trim();
        const orderIndex = parseInt(document.getElementById('catOrderIndex').value) || 1;
        const color = document.getElementById('catColor').value;
        const bgColor = document.getElementById('catBgColor').value;
        const description = document.getElementById('catDescription').value.trim();
        const active = document.getElementById('catActive').checked;
        const showInHome = document.getElementById('catShowInHome').checked;
        const isFeatured = document.getElementById('catIsFeatured').checked;

        const data = {
            type,
            name,
            slug,
            iconType,
            icon,
            imageUrl,
            orderIndex,
            color,
            bgColor,
            description,
            active,
            showInHome,
            isFeatured,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (id) {
                await db.collection('categories').doc(id).update(data);
                categoriesModule.logAudit('UPDATE_CATEGORY', id, { name, type, showInHome });
                toast.show('Categoría actualizada con éxito.');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.createdBy = firebase.auth().currentUser?.uid || 'admin';
                const docRef = await db.collection('categories').add(data);
                categoriesModule.logAudit('CREATE_CATEGORY', docRef.id, { name, type, showInHome });
                toast.show('Categoría creada con éxito.');
            }
            categoriesModule.resetForm();
        } catch (err) {
            toast.show(err.message, 'error');
        } finally {
            btn.textContent = '💾 Guardar Categoría';
            btn.disabled = false;
        }
    },

    defaultGlobalCategories: [
        { name: 'Restaurantes', slug: 'restaurantes', type: 'BUSINESS', icon: '🍔', orderIndex: 1, showInHome: true, color: '#EF4444', bgColor: '#FEF2F2', active: true, iconType: 'EMOJI', description: 'Restaurantes, comida rápida, fritangas y opciones a domicilio.' },
        { name: 'Tecnología', slug: 'tecnologia', type: 'BUSINESS', icon: '💻', orderIndex: 2, showInHome: true, color: '#3B82F6', bgColor: '#EFF6FF', active: true, iconType: 'EMOJI', description: 'Celulares, laptops, accesorios y periféricos.' },
        { name: 'Tiendas', slug: 'tiendas', type: 'BUSINESS', icon: '🏪', orderIndex: 3, showInHome: true, color: '#8B5CF6', bgColor: '#F5F3FF', active: true, iconType: 'EMOJI', description: 'Tiendas de conveniencia, ropa y retail general.' },
        { name: 'Supermercados', slug: 'supermercados', type: 'BUSINESS', icon: '🛒', orderIndex: 4, showInHome: true, color: '#10B981', bgColor: '#ECFDF5', active: true, iconType: 'EMOJI', description: 'Supermercados, abarrotes y productos para el hogar.' },
        { name: 'Farmacias', slug: 'farmacias', type: 'BUSINESS', icon: '💊', orderIndex: 5, showInHome: true, color: '#EC4899', bgColor: '#FDF2F8', active: true, iconType: 'EMOJI', description: 'Farmacias, medicamentos y cuidado personal.' },
        { name: 'Cafeterías', slug: 'cafeterias', type: 'BUSINESS', icon: '☕', orderIndex: 6, showInHome: true, color: '#F59E0B', bgColor: '#FFFBEB', active: true, iconType: 'EMOJI', description: 'Cafés, reposterías, postres y desayunos.' },
        { name: 'Fritangas', slug: 'fritangas', type: 'BUSINESS', icon: '🍗', orderIndex: 7, showInHome: true, color: '#D97706', bgColor: '#FEF3C7', active: true, iconType: 'EMOJI', description: 'Fritangas tradicionales nicaragüenses y asados.' },
        { name: 'Panaderías', slug: 'panaderias', type: 'BUSINESS', icon: '🥖', orderIndex: 8, showInHome: true, color: '#B45309', bgColor: '#FFFBEB', active: true, iconType: 'EMOJI', description: 'Panaderías artesanas y reposterías.' }
    ],

    seedDefaultCategories: async () => {
        try {
            toast.show("Iniciando sembrado de categorías globales...", "info");
            const snap = await db.collection('categories').get();
            const existingSlugs = new Set();
            snap.forEach(doc => {
                const data = doc.data();
                if (data.slug) existingSlugs.add(data.slug.toLowerCase());
                if (data.name) existingSlugs.add(data.name.toLowerCase());
            });

            let addedCount = 0;
            const batch = db.batch();

            for (const cat of categoriesModule.defaultGlobalCategories) {
                if (!existingSlugs.has(cat.slug.toLowerCase()) && !existingSlugs.has(cat.name.toLowerCase())) {
                    const docRef = db.collection('categories').doc();
                    batch.set(docRef, {
                        ...cat,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: firebase.auth().currentUser?.uid || 'system_seed'
                    });
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                await batch.commit();
                categoriesModule.logAudit('SEED_GLOBAL_CATEGORIES', 'system', { count: addedCount });
                toast.show(`¡Se crearon ${addedCount} categorías globales de comercio con éxito!`);
            } else {
                toast.show("Todas las categorías globales ya existen en la base de datos.", "info");
            }
        } catch (e) {
            console.error("Error al sembrar categorías globales:", e);
            toast.show("Error en sembrado: " + e.message, "error");
        }
    },

    logAudit: (action, categoryId, details) => {
        try {
            db.collection('audit_logs').add({
                module: 'CATEGORIES',
                action,
                categoryId,
                details,
                performedBy: firebase.auth().currentUser?.email || 'Admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn("No se pudo registrar la auditoría:", e);
        }
    }
};

window.categoriesModule = categoriesModule;


