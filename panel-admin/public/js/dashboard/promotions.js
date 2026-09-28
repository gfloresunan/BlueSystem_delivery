// Módulo de Centro de Promociones (Promociones App /promotions, Banners, Cupones, Ofertas Flash, Popups)
const promotionsModule = {
    selectedFile: null,
    selectedPromoFile: null,
    selectedPopupFile: null,
    currentSubTab: 'promotions',
    businessesList: [],

    render: () => {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-xl font-bold text-gray-100">📢 Centro de Promociones Enterprise</h2>
                        <p class="text-xs text-gray-400 mt-1">Administración de campañas comerciales, cupones, banners y ofertas especiales sincronizadas con Customer App.</p>
                    </div>
                </div>

                <!-- Subtabs Navigation -->
                <div class="flex border-b border-gray-800 gap-6 text-sm overflow-x-auto">
                    <button onclick="promotionsModule.switchSubTab('promotions')" id="subtab-btn-promotions" class="pb-3 font-semibold border-b-2 transition duration-150 border-blue-500 text-blue-500">🎁 Promociones App (/promotions)</button>
                    <button onclick="promotionsModule.switchSubTab('banners')" id="subtab-btn-banners" class="pb-3 font-semibold border-b-2 border-transparent text-gray-400 hover:text-white transition duration-150">Carrusel Banners</button>
                    <button onclick="promotionsModule.switchSubTab('popups')" id="subtab-btn-popups" class="pb-3 font-semibold border-b-2 border-transparent text-gray-400 hover:text-white transition duration-150">Alertas Popup</button>
                    <button onclick="promotionsModule.switchSubTab('cupones')" id="subtab-btn-cupones" class="pb-3 font-semibold border-b-2 border-transparent text-gray-400 hover:text-white transition duration-150">Cupones de Descuento</button>
                    <button onclick="promotionsModule.switchSubTab('flash')" id="subtab-btn-flash" class="pb-3 font-semibold border-b-2 border-transparent text-gray-400 hover:text-white transition duration-150">Ofertas Flash</button>
                </div>

                <!-- Contenedor dinámico de Subpestaña -->
                <div id="promotions-subcontent" class="space-y-6">
                    <!-- Se inyecta dinámicamente -->
                </div>
            </div>
        `;

        promotionsModule.loadBusinessesCache();
        promotionsModule.switchSubTab(promotionsModule.currentSubTab);
    },

    loadBusinessesCache: async () => {
        try {
            const snap = await db.collection('businesses').get();
            promotionsModule.businessesList = [];
            snap.forEach(doc => {
                const data = doc.data() || {};
                const name = data.name || data.comercioNombre || data.nombre || 'Comercio Sin Nombre';
                promotionsModule.businessesList.push({ id: doc.id, name });
            });
            promotionsModule.businessesList.sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.warn('[PromotionsModule] Error cargando lista de comercios:', e);
        }
    },

    switchSubTab: (subTabId) => {
        // Actualizar estados visuales de los botones
        const subTabs = ['promotions', 'banners', 'cupones', 'flash', 'popups'];
        subTabs.forEach(tab => {
            const btn = document.getElementById(`subtab-btn-${tab}`);
            if (btn) {
                if (tab === subTabId) {
                    btn.className = "pb-3 font-semibold border-b-2 border-blue-500 text-blue-500 transition duration-150 whitespace-nowrap";
                } else {
                    btn.className = "pb-3 font-semibold border-b-2 border-transparent text-gray-400 hover:text-white transition duration-150 whitespace-nowrap";
                }
            }
        });

        promotionsModule.currentSubTab = subTabId;

        const subcontent = document.getElementById('promotions-subcontent');
        if (subTabId === 'promotions') {
            promotionsModule.renderPromotionsTab(subcontent);
        } else if (subTabId === 'banners') {
            promotionsModule.renderBannersTab(subcontent);
        } else if (subTabId === 'popups') {
            promotionsModule.renderPopupsTab(subcontent);
        } else {
            promotionsModule.renderPlaceholderTab(subcontent, subTabId);
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // RENDERIZAR PESTAÑA PROMOCIONES APP (/promotions) — SSOT CUSTOMER APP
    // ═══════════════════════════════════════════════════════════════════════════════
    renderPromotionsTab: (container) => {
        const businessOptions = promotionsModule.businessesList.map(b => 
            `<option value="${b.id}">${b.name}</option>`
        ).join('');

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Formulario de creación/edición de Promoción -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4 h-fit">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                        <h3 class="text-sm font-semibold text-gray-200" id="promo-form-title">🆕 Nueva Promoción / Editar</h3>
                        <button type="button" onclick="promotionsModule.resetPromotionForm()" class="text-xs text-gray-400 hover:text-white transition">Limpiar</button>
                    </div>
                    
                    <form id="promoForm" onsubmit="promotionsModule.handleSavePromotion(event)" class="space-y-3.5">
                        <input type="hidden" id="promoId">
                        
                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">Título de la Promoción *</label>
                            <input type="text" id="promoTitle" required placeholder="Ej: 20% OFF en Combos Familiares" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">Comercio Asociado</label>
                            <select id="promoBusinessId" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                                <option value="">🌍 Plataforma Global (Todos los comercios)</option>
                                ${businessOptions}
                            </select>
                            <p class="text-[10px] text-gray-500">Selecciona un comercio específico o déjalo global.</p>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">Descripción / Condiciones</label>
                            <textarea id="promoDescription" rows="2" placeholder="Ej: Válido de lunes a viernes en productos seleccionados." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"></textarea>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Descuento (%)</label>
                                <input type="number" id="promoDiscountPercentage" min="0" max="100" step="0.1" placeholder="Ej: 20" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Cupón Vinculado</label>
                                <input type="text" id="promoCouponCode" placeholder="Ej: COMBO20" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-blue-400 font-mono uppercase focus:outline-none focus:border-blue-500">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Compra Mínima (C$)</label>
                                <input type="number" id="promoMinOrderAmount" min="0" step="0.01" placeholder="0.00" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Prioridad</label>
                                <input type="number" id="promoPriority" value="10" min="1" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">Imagen de la Promoción</label>
                            <div class="border border-dashed border-gray-800 hover:border-gray-700 bg-gray-950 rounded-lg p-4 text-center cursor-pointer relative" onclick="document.getElementById('promoImageFile').click()">
                                <input type="file" id="promoImageFile" accept="image/*" onchange="promotionsModule.previewPromotionImage(this)" class="hidden">
                                <div class="space-y-1" id="promoUploadPlaceholder">
                                    <span class="text-2xl">🖼️</span>
                                    <p class="text-[11px] text-gray-300">Toca para subir imagen</p>
                                    <p class="text-[9px] text-gray-500">Recomendado: 800x400px</p>
                                </div>
                                <img id="promoImagePreview" class="max-h-28 mx-auto rounded hidden object-cover shadow border border-gray-800">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">URL Imagen (alternativa directa)</label>
                            <input type="url" id="promoImageUrl" placeholder="https://..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Fecha Inicio</label>
                                <input type="datetime-local" id="promoStartDate" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-[11px] text-gray-200 focus:outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Fecha Fin</label>
                                <input type="datetime-local" id="promoEndDate" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-[11px] text-gray-200 focus:outline-none">
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-1">
                            <input type="checkbox" id="promoIsActive" checked class="rounded bg-gray-950 border-gray-800 text-blue-500 focus:ring-0">
                            <label for="promoIsActive" class="text-xs text-gray-300 font-semibold cursor-pointer">🟢 Promoción Activa</label>
                        </div>

                        <div class="pt-2">
                            <button type="submit" id="save-promo-btn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition duration-150 shadow-lg shadow-blue-600/20">
                                💾 Guardar Promoción
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Tabla de Promociones Existentes -->
                <div class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-semibold text-gray-200">📋 Catálogo de Promociones (/promotions)</h3>
                            <span id="promoCount" class="px-2 py-0.5 bg-blue-950 text-blue-400 text-xs font-bold rounded-full border border-blue-900/50">0</span>
                        </div>
                        <span class="text-[11px] text-gray-400">Sincronización Realtime con Customer App</span>
                    </div>

                    <div id="promotions-table-container" class="overflow-x-auto min-h-[300px]">
                        <div class="p-8 text-center text-xs text-gray-500">Cargando promociones en vivo...</div>
                    </div>
                </div>
            </div>
        `;

        promotionsModule.loadPromotions();
    },

    loadPromotions: () => {
        db.collection('promotions').onSnapshot(snap => {
            const countBadge = document.getElementById('promoCount');
            if (countBadge) countBadge.textContent = snap.size;

            const list = [];
            snap.forEach(doc => {
                list.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            list.sort((a, b) => (a.priority || 10) - (b.priority || 10));

            table.render(
                'promotions-table-container',
                ['Vista', 'Título & Comercio', 'Beneficio', 'Estado', 'Vigencia', 'Pri.', 'Acciones'],
                list,
                (p) => {
                    const title = p.title || 'Sin título';
                    const businessName = p.businessName || (p.businessId ? (promotionsModule.businessesList.find(b => b.id === p.businessId)?.name || p.businessId) : '🌍 Global');
                    const imgUrl = p.image || p.imageUrl || '/assets/promo-placeholder.svg';
                    const isActive = p.active !== false && p.isActive !== false;
                    const discount = p.discountPercentage ? `${p.discountPercentage}% OFF` : '';
                    const coupon = p.couponCode ? `<span class="font-mono text-blue-400 bg-blue-950/40 px-1 py-0.5 rounded text-[10px] border border-blue-900/40">${p.couponCode}</span>` : '';
                    const minOrder = p.minOrderAmount > 0 ? `<div class="text-[10px] text-gray-400">Mín: C$ ${Number(p.minOrderAmount).toFixed(2)}</div>` : '';
                    const startDate = promotionsModule.formatDateDisplay(p.startDate);
                    const endDate = promotionsModule.formatDateDisplay(p.endDate);
                    const priority = p.priority || 10;

                    const statusBadge = isActive 
                        ? `<span class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-semibold">🟢 Activa</span>`
                        : `<span class="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-semibold">🔴 Inactiva</span>`;

                    return `
                        <td class="p-3">
                            <img src="${imgUrl}" class="w-14 h-10 object-cover rounded border border-gray-800 bg-gray-950" onerror="this.src='/assets/promo-placeholder.svg'">
                        </td>
                        <td class="p-3">
                            <div class="font-bold text-gray-200 text-xs">${title}</div>
                            <div class="text-[11px] text-gray-400">${businessName}</div>
                            ${p.description ? `<div class="text-[10px] text-gray-500 line-clamp-1 max-w-xs">${p.description}</div>` : ''}
                        </td>
                        <td class="p-3">
                            ${discount ? `<div class="font-black text-xs text-amber-400">${discount}</div>` : ''}
                            ${coupon}
                            ${minOrder}
                        </td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3 text-[10px] text-gray-400">
                            <div>Ini: ${startDate}</div>
                            <div>Fin: ${endDate}</div>
                        </td>
                        <td class="p-3 font-mono text-xs text-gray-400">${priority}</td>
                        <td class="p-3">
                            <div class="flex gap-1.5">
                                <button onclick="promotionsModule.editPromotion('${p.id}')" class="px-2 py-1 bg-gray-850 hover:bg-gray-800 text-[10px] text-gray-300 rounded border border-gray-800 transition">Editar</button>
                                <button onclick="promotionsModule.duplicatePromotion('${p.id}')" class="px-2 py-1 bg-gray-850 hover:bg-gray-800 text-[10px] text-gray-300 rounded border border-gray-800 transition">Duplicar</button>
                                <button onclick="promotionsModule.togglePromotionActive('${p.id}', ${isActive})" class="px-2 py-1 ${isActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} text-[10px] font-semibold rounded border transition">${isActive ? 'Pausar' : 'Activar'}</button>
                                <button onclick="promotionsModule.deletePromotion('${p.id}', '${(p.image || p.imageUrl || '').replace(/'/g, "\\'")}')" class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 text-[10px] font-semibold transition">Borrar</button>
                            </div>
                        </td>
                    `;
                }
            );
        }, err => {
            console.error('[PromotionsModule] Error observando /promotions:', err);
            const container = document.getElementById('promotions-table-container');
            if (container) {
                container.innerHTML = `<div class="p-8 text-center text-xs text-rose-400">Error al cargar promociones: ${err.message}</div>`;
            }
        });
    },

    previewPromotionImage: (input) => {
        const file = input.files[0];
        if (file) {
            promotionsModule.selectedPromoFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('promoImagePreview');
                if (preview) {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    document.getElementById('promoUploadPlaceholder').classList.add('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    },

    resetPromotionForm: () => {
        const form = document.getElementById('promoForm');
        if (form) form.reset();
        document.getElementById('promoId').value = '';
        const preview = document.getElementById('promoImagePreview');
        if (preview) {
            preview.classList.add('hidden');
            preview.src = '';
        }
        const ph = document.getElementById('promoUploadPlaceholder');
        if (ph) ph.classList.remove('hidden');
        document.getElementById('promo-form-title').textContent = '🆕 Nueva Promoción / Editar';
        promotionsModule.selectedPromoFile = null;
    },

    handleSavePromotion: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-promo-btn');
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        const id = document.getElementById('promoId').value;
        const title = document.getElementById('promoTitle').value.trim();
        const businessId = document.getElementById('promoBusinessId').value;
        const description = document.getElementById('promoDescription').value.trim();
        let image = document.getElementById('promoImageUrl').value.trim();
        const discountPercentage = parseFloat(document.getElementById('promoDiscountPercentage').value) || 0;
        const couponCode = document.getElementById('promoCouponCode').value.trim().toUpperCase();
        const minOrderAmount = parseFloat(document.getElementById('promoMinOrderAmount').value) || 0;
        const priority = parseInt(document.getElementById('promoPriority').value) || 10;
        const startDate = document.getElementById('promoStartDate').value;
        const endDate = document.getElementById('promoEndDate').value;
        const active = document.getElementById('promoIsActive').checked;

        try {
            if (promotionsModule.selectedPromoFile && typeof storageService !== 'undefined' && storageService.uploadImage) {
                image = await storageService.uploadImage(promotionsModule.selectedPromoFile, 'promotions');
            }

            const businessObj = promotionsModule.businessesList.find(b => b.id === businessId);
            const businessName = businessObj ? businessObj.name : (businessId ? businessId : 'Plataforma Global');

            const payload = {
                title,
                businessId: businessId || '',
                businessName,
                description,
                image: image || '',
                imageUrl: image || '', // Compatibilidad retroactiva
                discountPercentage,
                couponCode,
                minOrderAmount,
                priority,
                startDate: startDate || '',
                endDate: endDate || '',
                active,
                isActive: active, // Compatibilidad retroactiva
                tenantId: 'GLOBAL',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await db.collection('promotions').doc(id).update(payload);
                toast.show('¡Promoción actualizada con éxito!');
            } else {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                if (typeof auth !== 'undefined' && auth.currentUser) {
                    payload.createdBy = auth.currentUser.uid;
                }
                await db.collection('promotions').add(payload);
                toast.show('¡Promoción creada exitosamente!');
            }

            promotionsModule.resetPromotionForm();
        } catch (err) {
            console.error('[Save Promotion Error]', err);
            toast.show(err.message || 'Error al guardar promoción', 'error');
        } finally {
            btn.textContent = '💾 Guardar Promoción';
            btn.disabled = false;
        }
    },

    editPromotion: async (id) => {
        try {
            const docSnap = await db.collection('promotions').doc(id).get();
            if (!docSnap.exists) {
                toast.show('Promoción no encontrada', 'error');
                return;
            }
            const p = docSnap.data();
            document.getElementById('promoId').value = id;
            document.getElementById('promoTitle').value = p.title || '';
            document.getElementById('promoBusinessId').value = p.businessId || '';
            document.getElementById('promoDescription').value = p.description || '';
            document.getElementById('promoImageUrl').value = p.image || p.imageUrl || '';
            document.getElementById('promoDiscountPercentage').value = p.discountPercentage || '';
            document.getElementById('promoCouponCode').value = p.couponCode || '';
            document.getElementById('promoMinOrderAmount').value = p.minOrderAmount || '';
            document.getElementById('promoPriority').value = p.priority || 10;
            document.getElementById('promoStartDate').value = promotionsModule.formatForInputDateTime(p.startDate);
            document.getElementById('promoEndDate').value = promotionsModule.formatForInputDateTime(p.endDate);
            document.getElementById('promoIsActive').checked = p.active !== false && p.isActive !== false;

            const preview = document.getElementById('promoImagePreview');
            const img = p.image || p.imageUrl;
            if (img) {
                preview.src = img;
                preview.classList.remove('hidden');
                document.getElementById('promoUploadPlaceholder').classList.add('hidden');
            } else {
                preview.classList.add('hidden');
                document.getElementById('promoUploadPlaceholder').classList.remove('hidden');
            }

            document.getElementById('promo-form-title').textContent = '📝 Editar Promoción';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error('[Edit Promo Error]', e);
            toast.show(e.message || 'Error al cargar promoción para edición', 'error');
        }
    },

    togglePromotionActive: async (id, currentActive) => {
        try {
            const newActive = !currentActive;
            await db.collection('promotions').doc(id).update({
                active: newActive,
                isActive: newActive,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast.show(newActive ? 'Promoción activada' : 'Promoción pausada');
        } catch (e) {
            console.error('[Toggle Active Error]', e);
            toast.show(e.message || 'Error al cambiar estado de la promoción', 'error');
        }
    },

    duplicatePromotion: async (id) => {
        try {
            const docSnap = await db.collection('promotions').doc(id).get();
            if (!docSnap.exists) return;
            const data = docSnap.data();
            const copyData = {
                ...data,
                title: `${data.title || 'Promoción'} (Copia)`,
                active: false,
                isActive: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            delete copyData.id;
            await db.collection('promotions').add(copyData);
            toast.show('Promoción duplicada exitosamente (guardada como inactiva)');
        } catch (e) {
            console.error('[Duplicate Promo Error]', e);
            toast.show(e.message || 'Error al duplicar promoción', 'error');
        }
    },

    deletePromotion: async (id, imageUrl) => {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta promoción?')) return;
        try {
            await db.collection('promotions').doc(id).delete();
            toast.show('Promoción eliminada con éxito');
            if (imageUrl && imageUrl.includes('firebasestorage')) {
                try {
                    const storageRef = storage.refFromURL(imageUrl);
                    await storageRef.delete();
                } catch (stErr) {
                    console.warn('[Promo Storage Cleanup Warning]', stErr);
                }
            }
        } catch (e) {
            console.error('[Delete Promo Error]', e);
            toast.show(e.message || 'Error al eliminar promoción', 'error');
        }
    },

    // RENDERIZAR PESTAÑA BANNERS
    renderBannersTab: (container) => {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Formulario de creación/edición -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4 h-fit">
                    <h3 class="text-sm font-semibold text-gray-200" id="form-title">🆕 Nuevo Banner / Editar</h3>
                    
                    <form id="bannerForm" onsubmit="promotionsModule.handleSubmit(event)" class="space-y-4">
                        <input type="hidden" id="bannerId">
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Título *</label>
                                <input type="text" id="bannerTitle" required placeholder="Ej: 50% de descuento en pizzas" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Subtítulo</label>
                                <input type="text" id="bannerSubtitle" placeholder="Ej: Válido solo hoy" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">Imagen del Banner</label>
                            <div class="border border-dashed border-gray-800 hover:border-gray-700 bg-gray-950 rounded-lg p-6 text-center cursor-pointer relative" id="upload-area" onclick="document.getElementById('bannerImage').click()">
                                <input type="file" id="bannerImage" accept="image/*" onchange="promotionsModule.previewImage(this)" class="hidden">
                                <div class="space-y-1.5" id="uploadPlaceholder">
                                    <span class="text-3xl">📤</span>
                                    <p class="text-xs text-gray-300">Toca para subir imagen</p>
                                    <p class="text-[10px] text-gray-500">Recomendado: 1200x600px</p>
                                </div>
                                <img id="imagePreview" class="max-h-36 mx-auto rounded hidden object-cover shadow border border-gray-800">
                            </div>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-400">URL de imagen (alternativo)</label>
                            <input type="url" id="imageUrl" placeholder="https://..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Tipo de acción</label>
                                <select id="actionType" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                                    <option value="NONE">Sin acción (solo visual)</option>
                                    <option value="PRODUCT">Abrir producto</option>
                                    <option value="CATEGORY">Abrir categoría</option>
                                    <option value="BUSINESS">Abrir comercio</option>
                                    <option value="URL">Abrir URL externa</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">ID Destino / Enlace</label>
                                <input type="text" id="actionId" placeholder="Ej: pizza_123" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Fecha Inicio</label>
                                <input type="datetime-local" id="startDate" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Fecha Fin</label>
                                <input type="datetime-local" id="endDate" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-4 items-center">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Prioridad</label>
                                <input type="number" id="priority" value="10" min="1" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                            </div>
                            <label class="flex items-center gap-2 text-xs text-gray-300 select-none pt-4">
                                <input type="checkbox" id="isActive" checked class="accent-blue-500"> Activo
                            </label>
                            <label class="flex items-center gap-2 text-xs text-gray-300 select-none pt-4">
                                <input type="checkbox" id="isFeatured" checked class="accent-blue-500"> Destacado
                            </label>
                        </div>

                        <div class="flex justify-end gap-2 border-t border-gray-800 pt-4">
                            <button type="button" onclick="promotionsModule.resetForm()" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-lg transition">Limpiar</button>
                            <button type="submit" id="save-banner-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition">💾 Guardar Banner</button>
                        </div>
                    </form>
                </div>

                <!-- Tabla de Banners -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4 lg:col-span-2 overflow-x-auto">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                        <h3 class="text-sm font-semibold text-gray-200">📋 Banners del Carrusel</h3>
                        <span id="bannerCount" class="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full">0</span>
                    </div>
                    <div id="banners-table-container">
                        <p class="text-xs text-gray-500">Cargando banners...</p>
                    </div>
                </div>
            </div>
        `;

        promotionsModule.loadBanners();
    },

    // RENDERIZAR PESTAÑA PROVISIONAL (CUPONES / FLASH / POPUPS)
    renderPlaceholderTab: (container, tabName) => {
        const titles = {
            cupones: '🎟️ Centro de Cupones de Descuento',
            flash: '⚡ Ofertas Relámpago (Flash)',
            popups: '📱 Alertas Emergentes (Popups App)'
        };
        container.innerHTML = `
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-xl mx-auto shadow-lg space-y-4">
                <span class="text-5xl">⚙️</span>
                <h3 class="text-md font-bold text-gray-200">${titles[tabName]}</h3>
                <p class="text-xs text-gray-400">Este módulo está siendo preparado para la versión **BlueSystem Admin v2.2**.</p>
                <div class="bg-gray-950 p-4 border border-gray-800 rounded-lg text-left text-xs font-mono text-gray-500 space-y-2">
                    <p>// Funcionalidades planeadas:</p>
                    <p>• Definir códigos de cupones personalizados.</p>
                    <p>• Límite de uso por usuario e integración de carrito.</p>
                    <p>• Notificaciones y Popups automáticos al abrir la aplicación.</p>
                </div>
            </div>
        `;
    },

    previewImage: (input) => {
        const file = input.files[0];
        if (file) {
            promotionsModule.selectedFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                document.getElementById('uploadPlaceholder').classList.add('hidden');
            }
            reader.readAsDataURL(file);
        }
    },

    resetForm: () => {
        const form = document.getElementById('bannerForm');
        if (form) form.reset();
        document.getElementById('bannerId').value = '';
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('uploadPlaceholder').classList.remove('hidden');
        document.getElementById('form-title').textContent = '🆕 Nuevo Banner / Editar';
        promotionsModule.selectedFile = null;
    },

    formatDateDisplay: (dateVal) => {
        if (!dateVal) return 'N/A';
        try {
            let d;
            if (typeof dateVal === 'object' && dateVal !== null && typeof dateVal.toDate === 'function') {
                d = dateVal.toDate();
            } else if (typeof dateVal === 'object' && dateVal !== null && dateVal.seconds) {
                d = new Date(dateVal.seconds * 1000);
            } else {
                d = new Date(dateVal);
            }
            if (isNaN(d.getTime())) return 'N/A';
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return 'N/A';
        }
    },

    formatForInputDateTime: (dateVal) => {
        if (!dateVal) return '';
        try {
            let d;
            if (typeof dateVal === 'object' && dateVal !== null && typeof dateVal.toDate === 'function') {
                d = dateVal.toDate();
            } else if (typeof dateVal === 'object' && dateVal !== null && dateVal.seconds) {
                d = new Date(dateVal.seconds * 1000);
            } else {
                d = new Date(dateVal);
            }
            if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : '';
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (e) {
            return typeof dateVal === 'string' ? dateVal : '';
        }
    },

    loadBanners: () => {
        const tableContainer = document.getElementById('banners-table-container');
        const countBadge = document.getElementById('bannerCount');

        db.collection('banners').orderBy('priority', 'asc').onSnapshot(snap => {
            countBadge.textContent = snap.size;

            const banners = [];
            snap.forEach(doc => {
                banners.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            table.render(
                'banners-table-container',
                ['Vista Previa', 'Título', 'Estado', 'Fechas (Inicio/Fin)', 'Pri.', 'Vistas / Clics', 'Acciones'],
                banners,
                (b) => {
                    const title = b.title || b.titulo || 'Sin título';
                    const promoFallback = typeof getFallbackUrl === 'function' ? getFallbackUrl('promo') : '/assets/promo-placeholder.svg';
                    const imageUrl = b.imageUrl || b.imagenUrl || promoFallback;
                    const isActive = b.isActive !== false;
                    const priority = b.priority || 10;
                    
                    const startDate = promotionsModule.formatDateDisplay(b.startDate);
                    const endDate = promotionsModule.formatDateDisplay(b.endDate);

                    const views = b.views || b.viewsCount || 0;
                    const clicks = b.clicks || b.clicksCount || 0;

                    const statusBadge = isActive 
                        ? `<span class="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px]">Activo</span>`
                        : `<span class="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px]">Inactivo</span>`;

                    return `
                        <td class="p-3">
                            <img src="${imageUrl}" class="w-16 h-8 object-cover rounded border border-gray-800" onError="handleImageError(this, 'promo')">
                        </td>
                        <td class="p-3 font-semibold text-gray-200 text-xs">${title}</td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3 text-[10px] text-gray-500">
                            <div>Ini: ${startDate}</div>
                            <div>Fin: ${endDate}</div>
                        </td>
                        <td class="p-3 font-mono text-xs text-gray-400">${priority}</td>
                        <td class="p-3 text-xs text-gray-400">
                            👁️ ${views} | 🖱️ ${clicks}
                        </td>
                        <td class="p-3">
                            <div class="flex gap-1.5">
                                <button onclick="promotionsModule.editBanner('${b.id}')" class="px-1.5 py-0.5 bg-gray-850 hover:bg-gray-800 text-[10px] text-gray-300 rounded border border-gray-800 transition">Editar</button>
                                <button onclick="promotionsModule.duplicateBanner('${b.id}')" class="px-1.5 py-0.5 bg-gray-850 hover:bg-gray-800 text-[10px] text-gray-300 rounded border border-gray-800 transition">Duplicar</button>
                                <button onclick="promotionsModule.quickPush('${b.id}', '${title.replace(/'/g, "\\'")}', '${b.subtitle ? b.subtitle.replace(/'/g, "\\'") : ''}', '${b.actionId || ''}')" class="px-1.5 py-0.5 bg-blue-950/20 border border-blue-900/40 hover:bg-blue-900/30 text-[10px] text-blue-400 rounded transition">Push</button>
                                <button onclick="promotionsModule.toggleActive('${b.id}', ${isActive})" class="px-1.5 py-0.5 ${isActive ? 'bg-yellow-950/20 border-yellow-900/40 text-yellow-400' : 'bg-green-950/20 border-green-900/40 text-green-400'} text-[10px] rounded border transition">${isActive ? 'Desact.' : 'Activar'}</button>
                                <button onclick="promotionsModule.deleteBanner('${b.id}', '${imageUrl.replace(/'/g, "\\'")}')" class="px-1.5 py-0.5 bg-red-950/20 border border-red-900/40 hover:bg-red-900/30 text-[10px] text-red-400 rounded transition">Borrar</button>
                            </div>
                        </td>
                    `;
                }
            );
        });
    },

    editBanner: async (id) => {
        try {
            const doc = await db.collection('banners').doc(id).get();
            if (doc.exists) {
                const b = doc.data();
                document.getElementById('bannerId').value = id;
                document.getElementById('bannerTitle').value = b.title || b.titulo || '';
                document.getElementById('bannerSubtitle').value = b.subtitle || '';
                document.getElementById('imageUrl').value = b.imageUrl || b.imagenUrl || '';
                document.getElementById('actionType').value = b.actionType || b.tipoAccion || 'NONE';
                document.getElementById('actionId').value = b.actionId || b.destinoId || '';
                document.getElementById('startDate').value = promotionsModule.formatForInputDateTime(b.startDate);
                document.getElementById('endDate').value = promotionsModule.formatForInputDateTime(b.endDate);
                document.getElementById('priority').value = b.priority || 10;
                document.getElementById('isActive').checked = b.isActive !== false;
                document.getElementById('isFeatured').checked = b.isFeatured === true;

                const preview = document.getElementById('imagePreview');
                const path = b.imageUrl || b.imagenUrl;
                if (path) {
                    preview.src = path;
                    preview.classList.remove('hidden');
                    document.getElementById('uploadPlaceholder').classList.add('hidden');
                }

                document.getElementById('form-title').textContent = '📝 Editar Banner';
            }
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    duplicateBanner: async (id) => {
        try {
            const doc = await db.collection('banners').doc(id).get();
            if (doc.exists) {
                const b = doc.data();
                promotionsModule.resetForm();
                
                // Precargar formulario pero sin ID
                document.getElementById('bannerTitle').value = `${b.title || b.titulo || ''} (Copia)`;
                document.getElementById('bannerSubtitle').value = b.subtitle || '';
                document.getElementById('imageUrl').value = b.imageUrl || b.imagenUrl || '';
                document.getElementById('actionType').value = b.actionType || b.tipoAccion || 'NONE';
                document.getElementById('actionId').value = b.actionId || b.destinoId || '';
                document.getElementById('startDate').value = promotionsModule.formatForInputDateTime(b.startDate);
                document.getElementById('endDate').value = promotionsModule.formatForInputDateTime(b.endDate);
                document.getElementById('priority').value = b.priority || 10;
                document.getElementById('isActive').checked = b.isActive !== false;
                document.getElementById('isFeatured').checked = b.isFeatured === true;

                const preview = document.getElementById('imagePreview');
                const path = b.imageUrl || b.imagenUrl;
                if (path) {
                    preview.src = path;
                    preview.classList.remove('hidden');
                    document.getElementById('uploadPlaceholder').classList.add('hidden');
                }

                document.getElementById('form-title').textContent = '🆕 Nuevo Banner (Duplicado)';
                toast.show('Datos duplicados precargados. Revisa y haz clic en Guardar.');
            }
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    toggleActive: async (id, currentActive) => {
        try {
            await db.collection('banners').doc(id).update({
                isActive: !currentActive,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast.show(currentActive ? 'Banner desactivado correctamente' : 'Banner activado correctamente');
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    deleteBanner: async (id, imageUrl) => {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este banner?')) return;
        try {
            await db.collection('banners').doc(id).delete();
            toast.show('Banner eliminado de Firestore');
            if (imageUrl && imageUrl.includes('firebasestorage')) {
                try {
                    const storageRef = storage.refFromURL(imageUrl);
                    await storageRef.delete();
                } catch (stErr) {
                    console.warn('[Storage Cleanup Warning]', stErr);
                }
            }
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    quickPush: (id, title, subtitle, actionId) => {
        // Redireccionar al tab de notificaciones y pre-llenar los datos
        dashboardController.switchTab('notifications');
        setTimeout(() => {
            document.getElementById('notif-title').value = `🍕 ¡Promoción Especial: ${title}!`;
            document.getElementById('notif-body').value = subtitle || `Aprovecha esta increíble oferta en BlueSystem. Toca aquí para ver detalles.`;
            document.getElementById('notif-action').value = actionId || id;
            document.getElementById('notif-target-type').value = 'all';
            toast.show('Módulo de notificaciones pre-configurado para este banner.');
        }, 150);
    },

    handleSubmit: async (e) => {
        e.preventDefault();

        const btn = document.getElementById('save-banner-btn');
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        const id = document.getElementById('bannerId').value;
        const title = document.getElementById('bannerTitle').value;
        const subtitle = document.getElementById('bannerSubtitle').value;
        let imageUrl = document.getElementById('imageUrl').value;
        const actionType = document.getElementById('actionType').value;
        const actionId = document.getElementById('actionId').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const priority = parseInt(document.getElementById('priority').value) || 10;
        const isActive = document.getElementById('isActive').checked;
        const isFeatured = document.getElementById('isFeatured').checked;

        try {
            if (promotionsModule.selectedFile) {
                imageUrl = await storageService.uploadImage(promotionsModule.selectedFile, 'banners');
            }

            if (!imageUrl) {
                throw new Error('Debes seleccionar una imagen para subir o proporcionar una URL válida.');
            }

            const data = {
                title,
                titulo: title, // Legacy
                subtitle,
                imageUrl,
                imagenUrl: imageUrl, // Legacy
                actionType,
                tipoAccion: actionType, // Legacy
                actionId,
                destinoId: actionId, // Legacy
                startDate,
                endDate,
                priority,
                isActive,
                isFeatured,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await db.collection('banners').doc(id).update(data);
                toast.show('Banner actualizado con éxito');
            } else {
                data.views = 0;
                data.clicks = 0;
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('banners').add(data);
                toast.show('Banner creado con éxito');
            }

            promotionsModule.resetForm();
        } catch (err) {
            console.error('[Submit Banner Error]', err);
            toast.show(err.message || 'Error al guardar el banner', 'error');
        } finally {
            btn.textContent = '💾 Guardar Banner';
            btn.disabled = false;
        }
    },

    // ═════════════════════════════════════════════════════════════════════════
    // RENDERIZAR PESTAÑA POPUPS PROMOCIONALES (Actividad #10 Enterprise)
    // ═════════════════════════════════════════════════════════════════════════
    selectedPopupFile: null,

    renderPopupsTab: (container) => {
        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                <!-- Formulario Pop-up -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4 h-fit">
                    <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                        <h3 class="text-sm font-semibold text-gray-200" id="popup-form-title">📱 Nueva Campaña Pop-Up</h3>
                        <button type="button" onclick="promotionsModule.resetPopupForm()" class="text-[11px] text-gray-400 hover:text-white transition">Limpiar</button>
                    </div>

                    <form id="popupForm" onsubmit="promotionsModule.handleSavePopup(event)" class="space-y-3.5">
                        <input type="hidden" id="popupId">

                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-1">Título de la Campaña *</label>
                            <input type="text" id="popupTitle" required placeholder="Ej: 🎉 ¡Zona VIP Exclusiva!" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-1">Mensaje / Contenido *</label>
                            <textarea id="popupMessage" required rows="3" placeholder="Ej: Participa en nuestro programa VIP y obtén delivery gratis en todos tus pedidos este mes." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"></textarea>
                        </div>

                        <div class="space-y-1">
                            <label class="block text-xs font-semibold text-gray-400">Imagen del Pop-up (Opcional)</label>
                            <div class="border border-dashed border-gray-800 hover:border-gray-700 bg-gray-950 rounded-lg p-4 text-center cursor-pointer relative" onclick="document.getElementById('popupImageFile').click()">
                                <input type="file" id="popupImageFile" accept="image/*" onchange="promotionsModule.previewPopupImage(this)" class="hidden">
                                <div class="space-y-1" id="popupUploadPlaceholder">
                                    <span class="text-2xl">🖼️</span>
                                    <p class="text-[11px] text-gray-300">Toca para subir imagen de banner</p>
                                    <p class="text-[9px] text-gray-500">Formato cuadrado o banner recomendado</p>
                                </div>
                                <img id="popupImagePreview" class="max-h-28 mx-auto rounded hidden object-cover shadow border border-gray-800">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-1">URL de Imagen Alternativa</label>
                            <input type="url" id="popupImageUrl" placeholder="https://..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Texto Botón (CTA)</label>
                                <input type="text" id="popupActionLabel" value="Participar" placeholder="Ej: Participar, Ver más" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Tipo de Acción</label>
                                <select id="popupActionType" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                                    <option value="NONE">Sin botón (Solo mensaje)</option>
                                    <option value="URL">URL Externa (HTTPS)</option>
                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="INTERNAL_ROUTE">Ruta Interna</option>
                                    <option value="DEEPLINK">Deep Link</option>
                                    <option value="BUSINESS">Abrir Comercio</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-1">Destino de la Acción</label>
                            <input type="text" id="popupActionTarget" placeholder="https://... o profile, coupons, etc." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Fecha Inicio</label>
                                <input type="datetime-local" id="popupStartDate" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Fecha Fin</label>
                                <input type="datetime-local" id="popupEndDate" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-3 items-center">
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Prioridad</label>
                                <input type="number" id="popupPriority" value="10" min="1" max="999" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 text-center font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Frecuencia</label>
                                <select id="popupFrequency" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                                    <option value="ONCE_PER_SESSION">1 vez por sesión</option>
                                    <option value="ONCE_PER_DAY">1 vez al día</option>
                                    <option value="ONCE">Solo 1 vez total</option>
                                    <option value="ALWAYS">Siempre activa</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-400 mb-1">Tenant Scope</label>
                                <input type="text" id="popupTenantId" value="GLOBAL" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 font-mono text-center">
                            </div>
                        </div>

                        <div class="pt-2 flex items-center justify-between border-t border-gray-800">
                            <label class="flex items-center gap-2 text-xs text-gray-300 select-none cursor-pointer">
                                <input type="checkbox" id="popupIsActive" checked class="accent-blue-500 w-4 h-4 rounded"> Activa
                            </label>
                            <button type="submit" id="save-popup-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition">💾 Guardar Campaña Pop-up</button>
                        </div>
                    </form>
                </div>

                <!-- Tabla de Campañas Pop-up & Preview -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4 lg:col-span-2 overflow-x-auto flex flex-col">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                        <div>
                            <h3 class="text-sm font-semibold text-gray-200">📋 Campañas Pop-Up Configuradas</h3>
                            <p class="text-[11px] text-gray-400">Evaluación automática en Customer App: vigencia temporal, prioridad y frecuencia.</p>
                        </div>
                        <span id="popupCount" class="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold rounded-full">0 campañas</span>
                    </div>

                    <div id="popups-table-container">
                        <p class="text-xs text-gray-500 p-4">Cargando campañas...</p>
                    </div>
                </div>
            </div>
        `;

        promotionsModule.loadPopups();
    },

    previewPopupImage: (input) => {
        const file = input.files[0];
        if (file) {
            promotionsModule.selectedPopupFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('popupImagePreview');
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                document.getElementById('popupUploadPlaceholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    },

    resetPopupForm: () => {
        const form = document.getElementById('popupForm');
        if (form) form.reset();
        document.getElementById('popupId').value = '';
        document.getElementById('popupPriority').value = '10';
        document.getElementById('popupTenantId').value = 'GLOBAL';
        document.getElementById('popupActionLabel').value = 'Participar';
        document.getElementById('popupIsActive').checked = true;
        document.getElementById('popupImagePreview').classList.add('hidden');
        document.getElementById('popupUploadPlaceholder').classList.remove('hidden');
        document.getElementById('popup-form-title').textContent = '📱 Nueva Campaña Pop-Up';
        promotionsModule.selectedPopupFile = null;
    },

    loadPopups: () => {
        const tableContainer = document.getElementById('popups-table-container');
        const countBadge = document.getElementById('popupCount');

        db.collection('promotional_popups').orderBy('priority', 'desc').onSnapshot(snap => {
            if (countBadge) countBadge.textContent = `${snap.size} campañas`;

            const popups = [];
            snap.forEach(doc => {
                popups.push({ id: doc.id, ...doc.data() });
            });

            if (!tableContainer) return;

            if (popups.length === 0) {
                tableContainer.innerHTML = `
                    <div class="text-center p-8 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                        <span class="text-3xl">📱</span>
                        <p class="text-xs text-gray-300 font-semibold">No hay campañas pop-up registradas</p>
                        <p class="text-[11px] text-gray-500">Crea una campaña emergente en el formulario para mostrarla a los clientes.</p>
                    </div>
                `;
                return;
            }

            tableContainer.innerHTML = `
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th class="p-3">Pri.</th>
                            <th class="p-3">Imagen</th>
                            <th class="p-3">Título / Mensaje</th>
                            <th class="p-3">Vigencia & Frecuencia</th>
                            <th class="p-3">Acción</th>
                            <th class="p-3">Estado</th>
                            <th class="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800/60 text-xs">
                        ${popups.map(p => {
                            const isActive = p.active !== false;
                            const statusBadge = isActive
                                ? `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-semibold">Activa</span>`
                                : `<span class="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-semibold">Inactiva</span>`;

                            const startDate = promotionsModule.formatDateDisplay(p.startDate || p.startAt);
                            const endDate = promotionsModule.formatDateDisplay(p.endDate || p.endAt);
                            const img = p.imageUrl ? `<img src="${p.imageUrl}" class="w-10 h-10 object-cover rounded border border-gray-800">` : `<span class="text-lg">📢</span>`;

                            return `
                                <tr class="hover:bg-gray-800/30 transition">
                                    <td class="p-3 font-mono font-bold text-blue-400 text-center">${p.priority || 10}</td>
                                    <td class="p-3">${img}</td>
                                    <td class="p-3">
                                        <div class="font-bold text-gray-200">${p.title || 'Sin título'}</div>
                                        <div class="text-[11px] text-gray-400 max-w-xs truncate">${p.message || ''}</div>
                                    </td>
                                    <td class="p-3 text-[10px] text-gray-400">
                                        <div>📅 ${startDate} → ${endDate}</div>
                                        <div class="font-mono text-indigo-300">🔁 ${p.frequency || 'ONCE_PER_SESSION'}</div>
                                    </td>
                                    <td class="p-3">
                                        <div class="text-[10px] font-bold text-blue-300 uppercase">${p.actionType || 'NONE'}</div>
                                        <div class="text-[11px] text-gray-400 truncate max-w-[120px] font-mono">${p.actionTarget || '-'}</div>
                                    </td>
                                    <td class="p-3">${statusBadge}</td>
                                    <td class="p-3 text-right">
                                        <div class="flex items-center justify-end gap-1.5">
                                            <button onclick="promotionsModule.editPopup('${p.id}')" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-semibold transition">Editar</button>
                                            <button onclick="promotionsModule.togglePopupActive('${p.id}', ${isActive})" class="px-2 py-1 ${isActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} border rounded text-[10px] font-semibold transition">${isActive ? 'Desact.' : 'Activar'}</button>
                                            <button onclick="promotionsModule.deletePopup('${p.id}', '${(p.imageUrl || '').replace(/'/g, "\\'")}')" class="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded text-[10px] font-semibold transition">Borrar</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }, err => {
            console.error('[Load Popups Error]', err);
            if (tableContainer) tableContainer.innerHTML = `<p class="text-xs text-rose-400 p-4">Error al cargar popups: ${err.message}</p>`;
        });
    },

    editPopup: async (id) => {
        try {
            const doc = await db.collection('promotional_popups').doc(id).get();
            if (!doc.exists) return;
            const p = doc.data();

            document.getElementById('popupId').value = id;
            document.getElementById('popupTitle').value = p.title || '';
            document.getElementById('popupMessage').value = p.message || '';
            document.getElementById('popupImageUrl').value = p.imageUrl || '';
            document.getElementById('popupActionLabel').value = p.actionLabel || 'Participar';
            document.getElementById('popupActionType').value = p.actionType || 'NONE';
            document.getElementById('popupActionTarget').value = p.actionTarget || '';
            document.getElementById('popupStartDate').value = promotionsModule.formatForInputDateTime(p.startDate || p.startAt);
            document.getElementById('popupEndDate').value = promotionsModule.formatForInputDateTime(p.endDate || p.endAt);
            document.getElementById('popupPriority').value = p.priority || 10;
            document.getElementById('popupFrequency').value = p.frequency || 'ONCE_PER_SESSION';
            document.getElementById('popupTenantId').value = p.tenantId || 'GLOBAL';
            document.getElementById('popupIsActive').checked = p.active !== false;

            const preview = document.getElementById('popupImagePreview');
            if (p.imageUrl) {
                preview.src = p.imageUrl;
                preview.classList.remove('hidden');
                document.getElementById('popupUploadPlaceholder').classList.add('hidden');
            }

            document.getElementById('popup-form-title').textContent = '📝 Editar Campaña Pop-Up';
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    togglePopupActive: async (id, currentActive) => {
        try {
            await db.collection('promotional_popups').doc(id).update({
                active: !currentActive,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast.show(currentActive ? 'Campaña pop-up desactivada' : 'Campaña pop-up activada con éxito');
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    deletePopup: async (id, imageUrl) => {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta campaña pop-up?')) return;
        try {
            await db.collection('promotional_popups').doc(id).delete();
            toast.show('Campaña pop-up eliminada con éxito');
            if (imageUrl && imageUrl.includes('firebasestorage')) {
                try {
                    const storageRef = storage.refFromURL(imageUrl);
                    await storageRef.delete();
                } catch (stErr) {
                    console.warn('[Popup Storage Cleanup Warning]', stErr);
                }
            }
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    handleSavePopup: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-popup-btn');
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        const id = document.getElementById('popupId').value;
        const title = document.getElementById('popupTitle').value.trim();
        const message = document.getElementById('popupMessage').value.trim();
        let imageUrl = document.getElementById('popupImageUrl').value.trim();
        const actionLabel = document.getElementById('popupActionLabel').value.trim() || 'Participar';
        const actionType = document.getElementById('popupActionType').value;
        const actionTarget = document.getElementById('popupActionTarget').value.trim();
        const startDate = document.getElementById('popupStartDate').value;
        const endDate = document.getElementById('popupEndDate').value;
        const priority = parseInt(document.getElementById('popupPriority').value) || 10;
        const frequency = document.getElementById('popupFrequency').value;
        const tenantId = (document.getElementById('popupTenantId').value.trim() || 'GLOBAL').toUpperCase();
        const active = document.getElementById('popupIsActive').checked;

        // Validación de destino seguro
        const lowerTarget = actionTarget.toLowerCase();
        if (lowerTarget.startsWith('javascript:') || lowerTarget.startsWith('data:') || lowerTarget.startsWith('file:') || lowerTarget.startsWith('vbscript:')) {
            toast.show('⛔ Protocolo no seguro en destino detectado.', 'error');
            btn.textContent = '💾 Guardar Campaña Pop-up';
            btn.disabled = false;
            return;
        }

        try {
            if (promotionsModule.selectedPopupFile) {
                imageUrl = await storageService.uploadImage(promotionsModule.selectedPopupFile, 'popups');
            }

            const data = {
                title,
                message,
                imageUrl,
                actionLabel,
                actionType,
                actionTarget,
                startDate,
                endDate,
                priority,
                frequency,
                tenantId,
                active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await db.collection('promotional_popups').doc(id).update(data);
                toast.show('¡Campaña pop-up actualizada con éxito!');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('promotional_popups').add(data);
                toast.show('¡Campaña pop-up creada exitosamente!');
            }

            promotionsModule.resetPopupForm();
        } catch (err) {
            console.error('[Submit Popup Error]', err);
            toast.show(err.message || 'Error al guardar la campaña pop-up', 'error');
        } finally {
            btn.textContent = '💾 Guardar Campaña Pop-up';
            btn.disabled = false;
        }
    }
};

window.promotionsModule = promotionsModule;


