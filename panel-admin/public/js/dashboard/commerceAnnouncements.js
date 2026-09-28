// Módulo de Administración: Commerce Announcement Card (BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001)
// Permite a los administradores gestionar de forma centralizada los anuncios y tarjetas informativas por comercio.

const commerceAnnouncementsModule = {
    selectedStoreId: null,
    selectedStoreName: '',
    selectedFile: null,
    currentAnnouncement: null,
    storesList: [],
    storeProducts: [],
    _productFetchToken: 0,

    render: async () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
                <!-- Header Banner -->
                <div class="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-blue-500/20 p-2.5 rounded-xl border border-blue-400/30">📢</span>
                            <div>
                                <h2 class="text-xl font-black text-white">Anuncios y Promociones por Comercio</h2>
                                <p class="text-xs text-blue-300">Gestiona la tarjeta promocional destacada (Announcement Card) visible en la Customer App para cada comercio.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold rounded-lg uppercase">SSOT: /businesses/{id}/announcements/main</span>
                    </div>
                </div>

                <!-- Selector de Comercio -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1">Seleccionar Comercio / Restaurante</label>
                            <p class="text-[11px] text-slate-500">Selecciona el comercio para ver y editar su tarjeta de anuncio oficial.</p>
                        </div>
                        <div class="w-full sm:w-80">
                            <select id="announcement-store-select" onchange="commerceAnnouncementsModule.onStoreSelect(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                <option value="">-- Seleccione un comercio --</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Workspace de Edición & Vista Previa -->
                <div id="announcement-workspace" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <!-- Formulario de Configuración (7 Cols) -->
                    <div class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>⚙️</span> Configuración del Anuncio
                            </h3>
                            <span id="announcement-status-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"></span>
                        </div>

                        <form id="commerceAnnouncementForm" onsubmit="commerceAnnouncementsModule.handleSave(event)" class="space-y-4">
                            <!-- Toggle Activo -->
                            <div class="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                                <div>
                                    <label for="announcement-is-active" class="text-xs font-bold text-slate-200 cursor-pointer">Anuncio Activo en la App</label>
                                    <p class="text-[11px] text-slate-500">Si está inactivo, no ocupará espacio ni se mostrará a los clientes.</p>
                                </div>
                                <input type="checkbox" id="announcement-is-active" onchange="commerceAnnouncementsModule.updatePreview()" class="w-5 h-5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer">
                            </div>

                            <!-- Título -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Título del Anuncio * (máx. 100 caracteres)</label>
                                <input type="text" id="announcement-title" required maxlength="100" placeholder="Ej: ¡2x1 en Todas las Hamburguesas!" oninput="commerceAnnouncementsModule.updatePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                            </div>

                            <!-- Descripción -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Descripción Informativa * (máx. 300 caracteres)</label>
                                <textarea id="announcement-description" required maxlength="300" rows="3" placeholder="Ej: Válido sólo por este fin de semana en pedidos a domicilio. Aplican restricciones." oninput="commerceAnnouncementsModule.updatePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none resize-none"></textarea>
                            </div>

                            <!-- Imagen Opcional -->
                            <div class="space-y-2 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" id="announcement-show-image" onchange="commerceAnnouncementsModule.toggleImageSection(this.checked)" class="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0">
                                        <label for="announcement-show-image" class="text-xs font-bold text-slate-200 cursor-pointer">Incluir Imagen Promocional</label>
                                    </div>
                                    <span class="text-[10px] text-slate-500 font-mono">Max 5MB (JPG, PNG, WebP)</span>
                                </div>

                                <div id="announcement-image-controls" class="hidden space-y-3 pt-2">
                                    <div class="flex items-center gap-3">
                                        <input type="file" id="announcement-file-input" accept="image/jpeg,image/png,image/webp" onchange="commerceAnnouncementsModule.handleFileSelect(event)" class="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer">
                                        <button type="button" id="announcement-remove-img-btn" onclick="commerceAnnouncementsModule.removeImage()" class="hidden text-xs text-rose-400 hover:text-rose-300 font-semibold transition">Quitar Imagen</button>
                                    </div>
                                    <input type="hidden" id="announcement-image-url">
                                </div>
                            </div>

                            <!-- Botón de Acción (CTA) Opcional -->
                            <div class="space-y-2 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" id="announcement-show-cta" onchange="commerceAnnouncementsModule.toggleCtaSection(this.checked)" class="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0">
                                        <label for="announcement-show-cta" class="text-xs font-bold text-slate-200 cursor-pointer">Incluir Botón de Acción (CTA)</label>
                                    </div>
                                </div>

                                <div id="announcement-cta-controls" class="hidden space-y-3 pt-2">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-semibold text-slate-400 mb-1">Texto del Botón</label>
                                            <input type="text" id="announcement-cta-label" placeholder="Ej: Ver Ofertas" oninput="commerceAnnouncementsModule.updatePreview()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Acción</label>
                                            <select id="announcement-cta-action" onchange="commerceAnnouncementsModule.onCtaActionChange(this.value)" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                                <option value="MERCHANT_MENU">Abrir Menú del Comercio</option>
                                                <option value="MERCHANT_DISCOUNTS">Ver Descuentos del Comercio</option>
                                                <option value="PRODUCT">Ir a un Producto Específico</option>
                                                <option value="EXTERNAL_URL">Enlace Web Externo</option>
                                                <option value="NONE">Sin Acción</option>
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Selector dinámico para PRODUCT -->
                                    <div id="announcement-cta-product-container" class="hidden">
                                        <label class="block text-xs font-semibold text-slate-400 mb-1">Producto de destino *</label>
                                        <select id="announcement-cta-product" onchange="commerceAnnouncementsModule.onProductSelect(this.value)" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                            <option value="">Selecciona un producto...</option>
                                        </select>
                                    </div>

                                    <!-- Campo para EXTERNAL_URL -->
                                    <div id="announcement-cta-url-container" class="hidden">
                                        <label class="block text-xs font-semibold text-slate-400 mb-1">URL Externa (https://...) *</label>
                                        <input type="text" id="announcement-cta-url" placeholder="https://ejemplo.com/promo" oninput="commerceAnnouncementsModule.onUrlInput(this.value)" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                    </div>

                                    <!-- Target Canónico Sincronizado -->
                                    <input type="hidden" id="announcement-cta-target">
                                </div>
                            </div>

                            <!-- Vigencia Temporal Opcional -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Fecha de Inicio (Opcional)</label>
                                    <input type="date" id="announcement-start-at" oninput="commerceAnnouncementsModule.updatePreview()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Fecha de Fin (Opcional)</label>
                                    <input type="date" id="announcement-end-at" oninput="commerceAnnouncementsModule.updatePreview()" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                </div>
                            </div>

                            <!-- Botones de Acción -->
                            <div class="flex items-center justify-between pt-3 border-t border-slate-800">
                                <button type="button" onclick="commerceAnnouncementsModule.handleDelete()" class="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition">
                                    Desactivar / Borrar
                                </button>
                                <button type="submit" id="announcement-save-btn" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition flex items-center gap-2">
                                    <span>💾</span> Guardar Anuncio
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Vista Previa Móvil (5 Cols) -->
                    <div class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center">
                        <div class="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>📱</span> Vista Previa en Customer App
                            </h3>
                            <span class="text-[10px] text-blue-400 font-mono font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">ComercioDetalleScreen</span>
                        </div>

                        <!-- Simulador de Smartphone -->
                        <div class="w-full max-w-[320px] bg-slate-950 border-4 border-slate-800 rounded-[32px] overflow-hidden shadow-2xl p-2">
                            <!-- Notch & Status Bar -->
                            <div class="flex justify-between items-center px-4 py-1.5 text-[9px] text-slate-400 font-mono">
                                <span>9:41</span>
                                <div class="w-12 h-3 bg-slate-800 rounded-full"></div>
                                <span>100% 🔋</span>
                            </div>

                            <!-- Mock Screen Content -->
                            <div class="p-2 space-y-2.5 min-h-[380px]">
                                <!-- Header ficticio del comercio -->
                                <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                                        🏪
                                    </div>
                                    <div class="min-w-0">
                                        <p id="preview-store-title" class="text-xs font-bold text-white truncate">Comercio</p>
                                        <p class="text-[10px] text-emerald-400 font-semibold">● Abierto • 25-35 min</p>
                                    </div>
                                </div>

                                <!-- Announcement Card Mockup -->
                                <div id="preview-card-container" class="transition-all duration-200">
                                    <!-- Dynamic Preview will be rendered here -->
                                </div>

                                <!-- Placeholder items to simulate rest of screen -->
                                <div class="space-y-1.5 pt-2 opacity-30">
                                    <div class="h-3 bg-slate-800 rounded w-1/3"></div>
                                    <div class="h-16 bg-slate-900/60 rounded-xl border border-slate-800/60"></div>
                                    <div class="h-16 bg-slate-900/60 rounded-xl border border-slate-800/60"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await commerceAnnouncementsModule.loadStores();
    },

    // ── Ciclo de Vida: Destructor y Liberación de Estado ───────────────────
    destroy: () => {
        commerceAnnouncementsModule.selectedStoreId = null;
        commerceAnnouncementsModule.selectedStoreName = '';
        commerceAnnouncementsModule.selectedFile = null;
        commerceAnnouncementsModule.currentAnnouncement = null;
        commerceAnnouncementsModule.storesList = [];
        commerceAnnouncementsModule.storeProducts = [];
        commerceAnnouncementsModule._productFetchToken = 0;
        console.log('[COMMERCE_ANNOUNCEMENTS] destroy() — Estado liberado limpiamente.');
    },

    loadStores: async () => {
        try {
            const select = document.getElementById('announcement-store-select');
            if (!select) return;

            let businesses = [];

            // 1. Reutilización del Resolver Canónico Oficial (Governance SSOT)
            if (typeof governanceService !== 'undefined' && typeof governanceService.getBusinesses === 'function') {
                businesses = await governanceService.getBusinesses('all', false);
            } else if (typeof commerceSyncService !== 'undefined' && typeof commerceSyncService.subscribeToBusinesses === 'function') {
                // 2. Alternativa Canónica de Sincronización
                businesses = await new Promise(resolve => {
                    const unsub = commerceSyncService.subscribeToBusinesses(list => {
                        unsub();
                        resolve(list);
                    }, 'all', false);
                });
            } else {
                // 3. Fallback Canónico aplicando la misma regla de visibilidad si los servicios no estuvieran en el scope
                const snap = await db.collection('businesses').orderBy('name').get().catch(async () => {
                    return await db.collection('businesses').get();
                });
                snap.forEach(doc => {
                    const data = doc.data() || {};
                    const isDeleted = data.status === 'DELETED' ||
                        data.lifecycleStatus === 'DELETED' ||
                        data.lifecycleStatus === 'DEPROVISIONED' ||
                        data.isDeleted === true ||
                        data.active === false ||
                        data.isActive === false;
                    if (!isDeleted && (data.status === 'ACTIVE' || !data.status)) {
                        const canonicalName = data.name || data.nombre || data.comercioNombre || doc.id;
                        businesses.push({
                            id: doc.id,
                            businessId: doc.id,
                            name: canonicalName,
                            data
                        });
                    }
                });
            }

            // Normalización, deduplicación estricta por businessId y ordenamiento alfabético
            const uniqueMap = new Map();
            (businesses || []).forEach(b => {
                const bId = b.businessId || b.id;
                if (!bId || uniqueMap.has(bId)) return;
                const canonicalName = b.name || b.comercioNombre || b.nombre || bId;
                uniqueMap.set(bId, {
                    id: bId,
                    name: canonicalName,
                    data: b
                });
            });

            commerceAnnouncementsModule.storesList = Array.from(uniqueMap.values())
                .sort((a, b) => a.name.localeCompare(b.name));

            select.innerHTML = '<option value="">-- Seleccione un comercio --</option>';

            commerceAnnouncementsModule.storesList.forEach(store => {
                const opt = document.createElement('option');
                opt.value = store.id;
                opt.textContent = `${store.name} (${store.id.substring(0, 6)}...)`;
                select.appendChild(opt);
            });
        } catch (err) {
            console.error('[CommerceAnnouncements] Error loading stores:', err);
        }
    },

    onStoreSelect: async (storeId) => {
        const workspace = document.getElementById('announcement-workspace');
        if (!storeId) {
            if (workspace) workspace.classList.add('hidden');
            commerceAnnouncementsModule.selectedStoreId = null;
            commerceAnnouncementsModule.selectedStoreName = '';
            commerceAnnouncementsModule.currentAnnouncement = null;
            commerceAnnouncementsModule.storeProducts = [];
            commerceAnnouncementsModule.resetFormValues();
            return;
        }

        commerceAnnouncementsModule.selectedStoreId = storeId;
        const store = commerceAnnouncementsModule.storesList.find(s => s.id === storeId);
        commerceAnnouncementsModule.selectedStoreName = store ? store.name : storeId;

        // Limpieza previa inmediata de estado y formulario para evitar leaks o estados residuales
        commerceAnnouncementsModule.currentAnnouncement = null;
        commerceAnnouncementsModule.resetFormValues();

        const previewStoreTitle = document.getElementById('preview-store-title');
        if (previewStoreTitle) previewStoreTitle.textContent = commerceAnnouncementsModule.selectedStoreName;

        if (workspace) workspace.classList.remove('hidden');

        // Precarga de productos en background para este comercio con protección anti-race conditions
        const productLoadPromise = commerceAnnouncementsModule.loadProductsForStore(storeId);

        // Carga de anuncio del comercio
        await commerceAnnouncementsModule.loadAnnouncement(storeId, productLoadPromise);
    },

    loadProductsForStore: async (storeId, preselectedProductId = null) => {
        const productSelect = document.getElementById('announcement-cta-product');
        if (!productSelect) return;

        if (!storeId) {
            commerceAnnouncementsModule.storeProducts = [];
            productSelect.innerHTML = '<option value="">Selecciona un comercio para cargar sus productos</option>';
            productSelect.disabled = true;
            return;
        }

        // Incrementamos el token de solicitud para invalidar respuestas desfasadas (Race Condition Guard)
        const fetchToken = ++commerceAnnouncementsModule._productFetchToken;

        productSelect.disabled = true;
        productSelect.innerHTML = '<option value="">Cargando productos del comercio...</option>';

        try {
            const snap = await db.collection('products')
                .where('businessId', '==', storeId)
                .get();

            // Si el token cambió mientras se ejecutaba la query, abortar para evitar stale responses
            if (fetchToken !== commerceAnnouncementsModule._productFetchToken) {
                console.log(`[CommerceAnnouncements] Solicitud de productos para ${storeId} descartada por Race Condition.`);
                return;
            }

            const validProducts = [];
            snap.forEach(doc => {
                const data = doc.data() || {};
                // Filtrado canónico auditado: descartar eliminados o inactivos
                const isInactive = data.status === 'DELETED' ||
                    data.status === 'INACTIVE' ||
                    data.active === false ||
                    data.isActive === false ||
                    data.isAvailable === false ||
                    data.available === false ||
                    data.isHidden === true;

                if (!isInactive) {
                    validProducts.push({
                        id: doc.id,
                        name: data.name || data.nombre || 'Producto sin nombre',
                        price: data.price ?? data.precio ?? 0,
                        sku: data.sku || data.code || ''
                    });
                }
            });

            // Ordenamiento alfabético por nombre
            validProducts.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
            commerceAnnouncementsModule.storeProducts = validProducts;

            if (validProducts.length === 0) {
                productSelect.innerHTML = '<option value="">No hay productos disponibles para este comercio</option>';
                productSelect.disabled = true;
                const targetInput = document.getElementById('announcement-cta-target');
                if (targetInput) targetInput.value = '';
                return;
            }

            productSelect.disabled = false;
            productSelect.innerHTML = '<option value="">Selecciona un producto...</option>';

            validProducts.forEach(prod => {
                const opt = document.createElement('option');
                opt.value = prod.id;
                // Formato exigido: "Nombre — SKU — C$ Precio" si tiene SKU, o "Nombre — C$ Precio"
                const priceFormatted = Number(prod.price).toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                const skuPart = prod.sku ? ` — ${prod.sku}` : '';
                opt.textContent = `${prod.name}${skuPart} — C$ ${priceFormatted}`;
                productSelect.appendChild(opt);
            });

            // Si se pasa un preselectedProductId (edición de anuncio existente)
            if (preselectedProductId) {
                const exists = validProducts.some(p => p.id === preselectedProductId);
                if (exists) {
                    productSelect.value = preselectedProductId;
                    const targetInput = document.getElementById('announcement-cta-target');
                    if (targetInput) targetInput.value = preselectedProductId;
                } else {
                    productSelect.value = '';
                    const targetInput = document.getElementById('announcement-cta-target');
                    if (targetInput) targetInput.value = '';
                    console.warn(`[CommerceAnnouncements] El producto ${preselectedProductId} ya no está disponible en el catálogo.`);
                    alert('El producto seleccionado anteriormente ya no está disponible.');
                }
            } else {
                productSelect.value = '';
                const targetInput = document.getElementById('announcement-cta-target');
                if (targetInput) targetInput.value = '';
            }
        } catch (err) {
            console.error('[CommerceAnnouncements] Error loading products:', err);
            if (fetchToken === commerceAnnouncementsModule._productFetchToken) {
                productSelect.innerHTML = '<option value="">Error al cargar productos</option>';
                productSelect.disabled = true;
            }
        }
    },

    loadAnnouncement: async (storeId, productLoadPromise = null) => {
        try {
            const docSnap = await db.collection('businesses').doc(storeId).collection('announcements').doc('main').get();
            const badge = document.getElementById('announcement-status-badge');

            if (docSnap.exists) {
                const data = docSnap.data();
                commerceAnnouncementsModule.currentAnnouncement = data;

                document.getElementById('announcement-is-active').checked = !!data.isActive;
                document.getElementById('announcement-title').value = data.title || '';
                document.getElementById('announcement-description').value = data.description || '';
                
                const showImage = !!data.showImage && !!data.imageUrl;
                document.getElementById('announcement-show-image').checked = showImage;
                commerceAnnouncementsModule.toggleImageSection(showImage);
                document.getElementById('announcement-image-url').value = data.imageUrl || '';
                
                const removeImgBtn = document.getElementById('announcement-remove-img-btn');
                if (removeImgBtn) {
                    if (data.imageUrl) removeImgBtn.classList.remove('hidden');
                    else removeImgBtn.classList.add('hidden');
                }

                const showCta = !!data.showCTA;
                document.getElementById('announcement-show-cta').checked = showCta;
                commerceAnnouncementsModule.toggleCtaSection(showCta);
                document.getElementById('announcement-cta-label').value = data.ctaLabel || 'Ver Más';
                
                const ctaAction = data.ctaAction || data.ctaType || 'MERCHANT_MENU';
                document.getElementById('announcement-cta-action').value = ctaAction;
                
                const savedTarget = data.ctaTarget || data.productId || '';
                const targetInput = document.getElementById('announcement-cta-target');
                if (targetInput) targetInput.value = savedTarget;

                if (ctaAction === 'PRODUCT') {
                    if (productLoadPromise) {
                        await productLoadPromise;
                    } else {
                        await commerceAnnouncementsModule.loadProductsForStore(storeId);
                    }
                    
                    const productSelect = document.getElementById('announcement-cta-product');
                    if (productSelect && savedTarget) {
                        const exists = commerceAnnouncementsModule.storeProducts.some(p => p.id === savedTarget);
                        if (exists) {
                            productSelect.value = savedTarget;
                        } else {
                            productSelect.value = '';
                            if (targetInput) targetInput.value = '';
                            alert('El producto seleccionado anteriormente ya no está disponible.');
                        }
                    }
                } else if (ctaAction === 'EXTERNAL_URL') {
                    const urlInput = document.getElementById('announcement-cta-url');
                    if (urlInput) urlInput.value = savedTarget;
                }

                commerceAnnouncementsModule.onCtaActionChange(ctaAction);

                document.getElementById('announcement-start-at').value = data.startAt || '';
                document.getElementById('announcement-end-at').value = data.endAt || '';

                if (badge) {
                    if (data.isActive) {
                        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
                        badge.textContent = '● Activo';
                    } else {
                        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30';
                        badge.textContent = '○ Inactivo';
                    }
                }
            } else {
                commerceAnnouncementsModule.currentAnnouncement = null;
                commerceAnnouncementsModule.resetFormValues();
                if (badge) {
                    badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700';
                    badge.textContent = 'Sin Anuncio';
                }
            }

            commerceAnnouncementsModule.updatePreview();
        } catch (err) {
            console.error('[CommerceAnnouncements] Error loading announcement:', err);
        }
    },

    resetFormValues: () => {
        document.getElementById('announcement-is-active').checked = true;
        document.getElementById('announcement-title').value = '';
        document.getElementById('announcement-description').value = '';
        document.getElementById('announcement-show-image').checked = false;
        commerceAnnouncementsModule.toggleImageSection(false);
        document.getElementById('announcement-image-url').value = '';
        document.getElementById('announcement-show-cta').checked = false;
        commerceAnnouncementsModule.toggleCtaSection(false);
        document.getElementById('announcement-cta-label').value = 'Ver Promoción';
        document.getElementById('announcement-cta-action').value = 'MERCHANT_MENU';
        
        const productSelect = document.getElementById('announcement-cta-product');
        if (productSelect) {
            productSelect.value = '';
            productSelect.innerHTML = '<option value="">Selecciona primero un comercio</option>';
            productSelect.disabled = true;
        }
        const urlInput = document.getElementById('announcement-cta-url');
        if (urlInput) urlInput.value = '';
        const targetInput = document.getElementById('announcement-cta-target');
        if (targetInput) targetInput.value = '';

        commerceAnnouncementsModule.onCtaActionChange('MERCHANT_MENU');
        document.getElementById('announcement-start-at').value = '';
        document.getElementById('announcement-end-at').value = '';
        commerceAnnouncementsModule.selectedFile = null;
        commerceAnnouncementsModule.storeProducts = [];
    },

    toggleImageSection: (checked) => {
        const controls = document.getElementById('announcement-image-controls');
        if (controls) {
            if (checked) controls.classList.remove('hidden');
            else controls.classList.add('hidden');
        }
        commerceAnnouncementsModule.updatePreview();
    },

    toggleCtaSection: (checked) => {
        const controls = document.getElementById('announcement-cta-controls');
        if (controls) {
            if (checked) controls.classList.remove('hidden');
            else controls.classList.add('hidden');
        }
        commerceAnnouncementsModule.updatePreview();
    },

    onProductSelect: (productId) => {
        const targetInput = document.getElementById('announcement-cta-target');
        if (targetInput) targetInput.value = productId || '';
        commerceAnnouncementsModule.updatePreview();
    },

    onUrlInput: (url) => {
        const targetInput = document.getElementById('announcement-cta-target');
        if (targetInput) targetInput.value = (url || '').trim();
        commerceAnnouncementsModule.updatePreview();
    },

    onCtaActionChange: (action) => {
        const productContainer = document.getElementById('announcement-cta-product-container');
        const urlContainer = document.getElementById('announcement-cta-url-container');
        const productSelect = document.getElementById('announcement-cta-product');
        const urlInput = document.getElementById('announcement-cta-url');
        const targetInput = document.getElementById('announcement-cta-target');

        if (!productContainer || !urlContainer || !targetInput) return;

        if (action === 'PRODUCT') {
            productContainer.classList.remove('hidden');
            urlContainer.classList.add('hidden');
            if (urlInput) urlInput.value = '';
            
            const storeId = commerceAnnouncementsModule.selectedStoreId;
            if (storeId && (!commerceAnnouncementsModule.storeProducts || commerceAnnouncementsModule.storeProducts.length === 0)) {
                commerceAnnouncementsModule.loadProductsForStore(storeId, targetInput.value || null);
            } else if (productSelect) {
                targetInput.value = productSelect.value || '';
            }
        } else if (action === 'EXTERNAL_URL') {
            urlContainer.classList.remove('hidden');
            productContainer.classList.add('hidden');
            if (productSelect) productSelect.value = '';
            targetInput.value = urlInput ? urlInput.value.trim() : '';
        } else {
            // MERCHANT_MENU, MERCHANT_DISCOUNTS, NONE
            productContainer.classList.add('hidden');
            urlContainer.classList.add('hidden');
            if (productSelect) productSelect.value = '';
            if (urlInput) urlInput.value = '';
            targetInput.value = '';
        }
        commerceAnnouncementsModule.updatePreview();
    },

    handleFileSelect: (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Formato de imagen no soportado. Usa JPG, PNG o WebP.');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede exceder los 5MB.');
            e.target.value = '';
            return;
        }

        commerceAnnouncementsModule.selectedFile = file;

        // Preview temporal en base64
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
            document.getElementById('announcement-image-url').value = loadEvt.target.result;
            const removeImgBtn = document.getElementById('announcement-remove-img-btn');
            if (removeImgBtn) removeImgBtn.classList.remove('hidden');
            commerceAnnouncementsModule.updatePreview();
        };
        reader.readAsDataURL(file);
    },

    removeImage: () => {
        commerceAnnouncementsModule.selectedFile = null;
        document.getElementById('announcement-image-url').value = '';
        const fileInput = document.getElementById('announcement-file-input');
        if (fileInput) fileInput.value = '';
        const removeImgBtn = document.getElementById('announcement-remove-img-btn');
        if (removeImgBtn) removeImgBtn.classList.add('hidden');
        document.getElementById('announcement-show-image').checked = false;
        commerceAnnouncementsModule.toggleImageSection(false);
        commerceAnnouncementsModule.updatePreview();
    },

    updatePreview: () => {
        const container = document.getElementById('preview-card-container');
        if (!container) return;

        const isActive = document.getElementById('announcement-is-active')?.checked;
        const title = document.getElementById('announcement-title')?.value || 'Título de ejemplo';
        const description = document.getElementById('announcement-description')?.value || 'Descripción del anuncio promocional del comercio.';
        const showImage = document.getElementById('announcement-show-image')?.checked;
        const imageUrl = document.getElementById('announcement-image-url')?.value;
        const showCta = document.getElementById('announcement-show-cta')?.checked;
        const ctaLabel = document.getElementById('announcement-cta-label')?.value || 'Ver Más';

        if (!isActive) {
            container.innerHTML = `
                <div class="border border-dashed border-slate-800 rounded-xl p-3 text-center space-y-1">
                    <p class="text-[10px] text-slate-500 font-semibold italic">Anuncio Inactivo</p>
                    <p class="text-[9px] text-slate-600">En la app no ocupará ningún espacio vertical (0dp).</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl p-3 shadow-lg space-y-2.5">
                <!-- Header con icono -->
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                        📢
                    </div>
                    <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Aviso Destacado</span>
                </div>

                <!-- Imagen opcional -->
                ${showImage && imageUrl ? `
                    <div class="rounded-xl overflow-hidden max-h-28 w-full bg-slate-950 border border-slate-800">
                        <img src="${imageUrl}" class="w-full h-28 object-cover" alt="Anuncio">
                    </div>
                ` : ''}

                <!-- Título y Descripción -->
                <div class="space-y-1">
                    <h4 class="text-xs font-bold text-white leading-snug">${title}</h4>
                    <p class="text-[10px] text-slate-300 leading-relaxed">${description}</p>
                </div>

                <!-- Botón CTA opcional -->
                ${showCta ? `
                    <div class="pt-1">
                        <div class="w-full bg-blue-600 text-white rounded-xl py-1.5 px-3 text-[10px] font-bold text-center flex items-center justify-center gap-1 shadow-md">
                            <span>${ctaLabel}</span>
                            <span>→</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    handleSave: async (e) => {
        e.preventDefault();
        const storeId = commerceAnnouncementsModule.selectedStoreId;
        if (!storeId) {
            alert('Por favor selecciona un comercio primero.');
            return;
        }

        const saveBtn = document.getElementById('announcement-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>⏳</span> Guardando...';
        }

        try {
            const isActive = document.getElementById('announcement-is-active').checked;
            const title = document.getElementById('announcement-title').value.trim();
            const description = document.getElementById('announcement-description').value.trim();
            const showImage = document.getElementById('announcement-show-image').checked;
            let imageUrl = document.getElementById('announcement-image-url').value;
            let imageStoragePath = commerceAnnouncementsModule.currentAnnouncement?.imageStoragePath || null;
            const showCta = document.getElementById('announcement-show-cta').checked;
            const ctaLabel = document.getElementById('announcement-cta-label').value.trim();
            const ctaAction = document.getElementById('announcement-cta-action').value;
            let ctaTarget = document.getElementById('announcement-cta-target').value.trim();
            const startAt = document.getElementById('announcement-start-at').value || null;
            const endAt = document.getElementById('announcement-end-at').value || null;

            if (showCta && ctaAction === 'PRODUCT') {
                const productSelect = document.getElementById('announcement-cta-product');
                const selectedProductId = productSelect ? productSelect.value : ctaTarget;
                
                // Validación estricta: obligatorio y perteneciente al catálogo activo del comercio
                const isValidProduct = selectedProductId && commerceAnnouncementsModule.storeProducts.some(p => p.id === selectedProductId);
                if (!isValidProduct) {
                    alert('Debes seleccionar un producto válido del comercio.');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<span>💾</span> Guardar Anuncio';
                    }
                    return;
                }
                ctaTarget = selectedProductId;
            }

            if (showCta && ctaAction === 'EXTERNAL_URL') {
                const cleanUrl = ctaTarget.toLowerCase();
                if (!cleanUrl.startsWith('https://')) {
                    alert('Por política de seguridad corporativa, los enlaces externos deben comenzar obligatoriamente con https://');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = '<span>💾</span> Guardar Anuncio';
                    }
                    return;
                }
            }

            // Subir imagen a Storage si se seleccionó un archivo nuevo
            if (showImage && commerceAnnouncementsModule.selectedFile) {
                if (typeof storageService !== 'undefined' && storageService.uploadImage) {
                    const uploadPath = `commerce_assets/${storeId}/announcements/main`;
                    imageUrl = await storageService.uploadImage(commerceAnnouncementsModule.selectedFile, uploadPath);
                    imageStoragePath = uploadPath;
                }
            }

            const isProductCta = !!showCta && ctaAction === 'PRODUCT';
            const payload = {
                announcementId: 'main',
                businessId: storeId,
                title,
                description,
                showImage: !!showImage && !!imageUrl,
                imageUrl: showImage ? imageUrl : '',
                imageStoragePath: showImage ? imageStoragePath : null,
                showCTA: !!showCta,
                ctaLabel: showCta ? ctaLabel : '',
                ctaAction: showCta ? ctaAction : 'NONE',
                ctaTarget: showCta ? ctaTarget : '',
                ctaType: showCta ? ctaAction : 'NONE',
                productId: isProductCta ? ctaTarget : null,
                isActive: !!isActive,
                startAt,
                endAt,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser?.email || 'admin'
            };

            if (!commerceAnnouncementsModule.currentAnnouncement) {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                payload.createdBy = firebase.auth().currentUser?.email || 'admin';
            }

            // Persistencia Atómica en Subcolección SSOT
            await db.collection('businesses').doc(storeId).collection('announcements').doc('main').set(payload, { merge: true });

            // Registro de Auditoría
            try {
                await db.collection('audit_events').add({
                    eventType: 'COMMERCE_ANNOUNCEMENT_UPDATED',
                    targetBusinessId: storeId,
                    actorUid: firebase.auth().currentUser?.uid || 'admin',
                    actorEmail: firebase.auth().currentUser?.email || 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    details: {
                        title,
                        isActive,
                        showImage: !!showImage,
                        ctaAction: showCta ? ctaAction : 'NONE',
                        productId: isProductCta ? ctaTarget : null
                    }
                });
            } catch (auditErr) {
                console.warn('[CommerceAnnouncements] Audit log failed (non-blocking):', auditErr);
            }

            alert('¡Anuncio del comercio guardado exitosamente!');
            await commerceAnnouncementsModule.loadAnnouncement(storeId);
        } catch (err) {
            console.error('[CommerceAnnouncements] Error saving:', err);
            alert('Error al guardar el anuncio: ' + (err.message || 'Error desconocido'));
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾</span> Guardar Anuncio';
            }
        }
    },

    handleDelete: async () => {
        const storeId = commerceAnnouncementsModule.selectedStoreId;
        if (!storeId) return;

        if (!confirm('¿Estás seguro de desactivar y eliminar el anuncio de este comercio?')) return;

        try {
            await db.collection('businesses').doc(storeId).collection('announcements').doc('main').delete();

            try {
                await db.collection('audit_events').add({
                    eventType: 'COMMERCE_ANNOUNCEMENT_DELETED',
                    targetBusinessId: storeId,
                    actorUid: firebase.auth().currentUser?.uid || 'admin',
                    actorEmail: firebase.auth().currentUser?.email || 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (auditErr) {
                console.warn('[CommerceAnnouncements] Audit log delete failed:', auditErr);
            }

            alert('Anuncio eliminado.');
            await commerceAnnouncementsModule.loadAnnouncement(storeId);
        } catch (err) {
            console.error('[CommerceAnnouncements] Error deleting:', err);
            alert('Error al eliminar el anuncio: ' + err.message);
        }
    }
};

window.commerceAnnouncementsModule = commerceAnnouncementsModule;
