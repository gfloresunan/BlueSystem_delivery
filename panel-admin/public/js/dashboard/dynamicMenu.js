// Módulo de Administración: Menú Dinámico Administrable (Actividad #10 Enterprise)
const dynamicMenuModule = {
    currentEditingId: null,

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
                <!-- Header Banner -->
                <div class="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-400/30">🍔</span>
                            <div>
                                <h2 class="text-xl font-black text-white">Menú Dinámico Administrable Enterprise</h2>
                                <p class="text-xs text-indigo-300">Controla en tiempo real las opciones remotas del menú hamburguesa de la Customer App (WhatsApp, VIP, Promociones, Rutas y Enlaces Externos).</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold rounded-lg uppercase">SSOT: /dynamic_menu</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Formulario de Creación / Edición -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 h-fit">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2" id="menu-form-title">
                                <span>➕</span> Nueva Opción de Menú
                            </h3>
                            <button type="button" onclick="dynamicMenuModule.resetForm()" class="text-[11px] text-slate-400 hover:text-white transition">Limpiar</button>
                        </div>

                        <form id="dynamicMenuForm" onsubmit="dynamicMenuModule.handleSubmit(event)" class="space-y-3.5">
                            <input type="hidden" id="menu-item-id">

                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre / Título *</label>
                                <input type="text" id="menu-item-title" required placeholder="Ej: Únete al WhatsApp" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Descripción (Opcional)</label>
                                <input type="text" id="menu-item-description" placeholder="Ej: Atención personalizada 24/7" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Icono</label>
                                    <select id="menu-item-icon" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                                        <option value="whatsapp">💬 WhatsApp</option>
                                        <option value="vip">⭐ Zona VIP / Estrella</option>
                                        <option value="gift">🎁 Regalos & Fidelidad</option>
                                        <option value="tag">🏷️ Promociones & Ofertas</option>
                                        <option value="card">💳 Cupones / Tarjeta</option>
                                        <option value="support">🎧 Soporte / Ayuda</option>
                                        <option value="link">🔗 Enlace Web</option>
                                        <option value="info">ℹ️ Información</option>
                                        <option value="location">📍 Sucursales / Ubicación</option>
                                        <option value="bell">🔔 Campañas</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Orden *</label>
                                    <input type="number" id="menu-item-order" value="1" min="1" max="999" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none text-center font-mono">
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Destino *</label>
                                    <select id="menu-item-dest-type" onchange="dynamicMenuModule.handleDestTypeChange()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                                        <option value="WHATSAPP">WhatsApp</option>
                                        <option value="EXTERNAL_URL">URL Externa (HTTPS)</option>
                                        <option value="INTERNAL_ROUTE">Ruta Interna</option>
                                        <option value="DEEPLINK">Deep Link</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Alcance / Tenant</label>
                                    <input type="text" id="menu-item-tenant" value="GLOBAL" placeholder="GLOBAL o tenant_id" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none font-mono">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1" id="dest-target-label">Destino / URL *</label>
                                <input type="text" id="menu-item-destination" required placeholder="https://wa.me/50588888888 o https://..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                                <p class="text-[10px] text-slate-500 mt-1" id="dest-helper-text">Solo se permiten esquemas seguros (HTTPS, WhatsApp o rutas internas).</p>
                            </div>

                            <div class="pt-2 flex items-center justify-between">
                                <label class="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" id="menu-item-active" checked class="w-4 h-4 accent-indigo-500 rounded">
                                    <span class="text-xs text-slate-300 font-semibold">Opción Activa</span>
                                </label>
                                <button type="submit" id="save-menu-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                                    <span>💾</span> Guardar Opción
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Tabla de Opciones Remotas & Preview -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 lg:col-span-2 overflow-hidden flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                    <span>📋</span> Opciones Configuradas en Menú
                                </h3>
                                <p class="text-[11px] text-slate-400">Las opciones activas se integran debajo del Core Menu en la Customer App.</p>
                            </div>
                            <span id="menu-items-count" class="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold rounded-full">0 items</span>
                        </div>

                        <!-- Tabla -->
                        <div class="overflow-x-auto" id="dynamic-menu-table-container">
                            <p class="text-xs text-slate-500 p-4">Cargando opciones del menú...</p>
                        </div>

                        <!-- Preview Visual Drawer -->
                        <div class="mt-auto pt-4 border-t border-slate-800/80">
                            <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span>📱</span> Vista Previa Simulada (Drawer de la App)
                            </h4>
                            <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 max-w-sm">
                                <div class="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">CORE MENU (Nativo Fijo)</div>
                                <div class="space-y-1 text-xs text-slate-400 opacity-60 px-2 py-1">
                                    <div>👤 Mi Perfil</div>
                                    <div>❤️ Favoritos</div>
                                    <div>📍 Mis direcciones</div>
                                    <div>🚚 Envío A → B</div>
                                </div>
                                <div class="my-2 border-t border-slate-800"></div>
                                <div class="text-[10px] font-bold text-indigo-400 uppercase px-2 py-1">ADMIN DYNAMIC MENU (En Tiempo Real)</div>
                                <div class="space-y-1 px-2 py-1" id="drawer-preview-items">
                                    <p class="text-[11px] text-slate-500 italic">No hay opciones dinámicas activas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        dynamicMenuModule.loadMenuItems();
    },

    handleDestTypeChange: () => {
        const type = document.getElementById('menu-item-dest-type').value;
        const destInput = document.getElementById('menu-item-destination');
        const helperText = document.getElementById('dest-helper-text');

        if (type === 'WHATSAPP') {
            destInput.placeholder = 'https://wa.me/50588888888 o +50588888888';
            helperText.textContent = 'Enlace seguro de WhatsApp directo a chat.';
        } else if (type === 'EXTERNAL_URL') {
            destInput.placeholder = 'https://ejemplo.com/promocion';
            helperText.textContent = 'Debe iniciar con https://. Protocolos peligrosos bloqueados.';
        } else if (type === 'INTERNAL_ROUTE') {
            destInput.placeholder = 'profile, favorites, coupons, loyalty_points, solicitar_envio';
            helperText.textContent = 'Identificador de pantalla interna en la Customer App.';
        } else {
            destInput.placeholder = 'bluesystem://promocion';
            helperText.textContent = 'Deep link registrado en la aplicación.';
        }
    },

    validateDestination: (type, dest) => {
        const d = (dest || '').trim();
        if (!d) return { valid: false, error: 'El destino no puede estar vacío.' };

        // Bloqueo estricto de esquemas peligrosos
        const lower = d.toLowerCase();
        if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:') || lower.startsWith('vbscript:') || lower.startsWith('intent:')) {
            return { valid: false, error: '⛔ Protocolo no seguro detectado. Solo se permiten enlaces HTTPS, WhatsApp o rutas internas.' };
        }

        if (type === 'EXTERNAL_URL') {
            if (!lower.startsWith('https://')) {
                return { valid: false, error: 'Las URLs externas deben iniciar obligatoriamente con https://' };
            }
        }

        return { valid: true };
    },

    resetForm: () => {
        const form = document.getElementById('dynamicMenuForm');
        if (form) form.reset();
        document.getElementById('menu-item-id').value = '';
        document.getElementById('menu-item-order').value = '1';
        document.getElementById('menu-item-tenant').value = 'GLOBAL';
        document.getElementById('menu-item-active').checked = true;
        document.getElementById('menu-form-title').innerHTML = '<span>➕</span> Nueva Opción de Menú';
        dynamicMenuModule.currentEditingId = null;
        dynamicMenuModule.handleDestTypeChange();
    },

    loadMenuItems: () => {
        const tableContainer = document.getElementById('dynamic-menu-table-container');
        const countBadge = document.getElementById('menu-items-count');
        const previewContainer = document.getElementById('drawer-preview-items');

        db.collection('dynamic_menu').orderBy('order', 'asc').onSnapshot(snap => {
            if (countBadge) countBadge.textContent = `${snap.size} items`;

            const items = [];
            snap.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });

            // Actualizar simulador de drawer
            if (previewContainer) {
                const activeItems = items.filter(i => i.active !== false);
                if (activeItems.length === 0) {
                    previewContainer.innerHTML = '<p class="text-[11px] text-slate-500 italic">No hay opciones dinámicas activas</p>';
                } else {
                    previewContainer.innerHTML = activeItems.map(i => {
                        const iconEmoji = dynamicMenuModule.getIconEmoji(i.iconKey);
                        return `
                            <div class="flex items-center gap-2 text-xs font-semibold text-slate-200 py-0.5">
                                <span>${iconEmoji}</span>
                                <span>${i.title || 'Sin título'}</span>
                                <span class="text-[9px] text-indigo-400 ml-auto font-mono">#${i.order || 1}</span>
                            </div>
                        `;
                    }).join('');
                }
            }

            if (!tableContainer) return;

            if (items.length === 0) {
                tableContainer.innerHTML = `
                    <div class="text-center p-8 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                        <span class="text-3xl">🍔</span>
                        <p class="text-xs text-slate-300 font-semibold">No hay opciones de menú dinámico creadas</p>
                        <p class="text-[11px] text-slate-500">Crea tu primera opción en el formulario de la izquierda.</p>
                    </div>
                `;
                return;
            }

            tableContainer.innerHTML = `
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th class="p-3">Ord.</th>
                            <th class="p-3">Icono</th>
                            <th class="p-3">Nombre / Descripción</th>
                            <th class="p-3">Tipo & Destino</th>
                            <th class="p-3">Tenant</th>
                            <th class="p-3">Estado</th>
                            <th class="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60 text-xs">
                        ${items.map(item => {
                            const iconEmoji = dynamicMenuModule.getIconEmoji(item.iconKey);
                            const isActive = item.active !== false;
                            const statusBadge = isActive
                                ? `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-semibold">Activo</span>`
                                : `<span class="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-semibold">Inactivo</span>`;

                            return `
                                <tr class="hover:bg-slate-800/30 transition">
                                    <td class="p-3 font-mono font-bold text-indigo-400">${item.order || 1}</td>
                                    <td class="p-3 text-base">${iconEmoji}</td>
                                    <td class="p-3">
                                        <div class="font-bold text-slate-200">${item.title || 'Sin título'}</div>
                                        ${item.description ? `<div class="text-[11px] text-slate-400">${item.description}</div>` : ''}
                                    </td>
                                    <td class="p-3">
                                        <div class="text-[10px] font-mono font-bold text-indigo-300 uppercase">${item.destinationType || 'INTERNAL_ROUTE'}</div>
                                        <div class="text-[11px] text-slate-400 truncate max-w-xs font-mono" title="${item.destination || ''}">${item.destination || '-'}</div>
                                    </td>
                                    <td class="p-3 font-mono text-[10px] text-slate-400">${item.tenantId || 'GLOBAL'}</td>
                                    <td class="p-3">${statusBadge}</td>
                                    <td class="p-3 text-right">
                                        <div class="flex items-center justify-end gap-1.5">
                                            <button onclick="dynamicMenuModule.editItem('${item.id}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold transition">Editar</button>
                                            <button onclick="dynamicMenuModule.toggleActive('${item.id}', ${isActive})" class="px-2 py-1 ${isActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} border rounded text-[10px] font-semibold transition">${isActive ? 'Desact.' : 'Activar'}</button>
                                            <button onclick="dynamicMenuModule.deleteItem('${item.id}')" class="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded text-[10px] font-semibold transition">Borrar</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }, err => {
            console.error('[DynamicMenu Error]', err);
            if (tableContainer) tableContainer.innerHTML = `<p class="text-xs text-rose-400 p-4">Error al cargar opciones: ${err.message}</p>`;
        });
    },

    getIconEmoji: (key) => {
        const map = {
            whatsapp: '💬',
            vip: '⭐',
            gift: '🎁',
            tag: '🏷️',
            card: '💳',
            support: '🎧',
            link: '🔗',
            info: 'ℹ️',
            location: '📍',
            bell: '🔔'
        };
        return map[key] || '⭐';
    },

    editItem: async (id) => {
        try {
            const doc = await db.collection('dynamic_menu').doc(id).get();
            if (!doc.exists) return;
            const data = doc.data();

            document.getElementById('menu-item-id').value = id;
            document.getElementById('menu-item-title').value = data.title || '';
            document.getElementById('menu-item-description').value = data.description || '';
            document.getElementById('menu-item-icon').value = data.iconKey || 'whatsapp';
            document.getElementById('menu-item-dest-type').value = data.destinationType || 'WHATSAPP';
            document.getElementById('menu-item-destination').value = data.destination || '';
            document.getElementById('menu-item-order').value = data.order || 1;
            document.getElementById('menu-item-tenant').value = data.tenantId || 'GLOBAL';
            document.getElementById('menu-item-active').checked = data.active !== false;

            document.getElementById('menu-form-title').innerHTML = '<span>📝</span> Editar Opción de Menú';
            dynamicMenuModule.currentEditingId = id;
            dynamicMenuModule.handleDestTypeChange();
        } catch (e) {
            toast.show('Error al cargar item para editar: ' + e.message, 'error');
        }
    },

    toggleActive: async (id, currentActive) => {
        try {
            await db.collection('dynamic_menu').doc(id).update({
                active: !currentActive,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast.show(currentActive ? 'Opción desactivada' : 'Opción activada exitosamente');
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    deleteItem: async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta opción de menú?')) return;
        try {
            await db.collection('dynamic_menu').doc(id).delete();
            toast.show('Opción eliminada exitosamente');
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-menu-btn');
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        const id = document.getElementById('menu-item-id').value;
        const title = document.getElementById('menu-item-title').value.trim();
        const description = document.getElementById('menu-item-description').value.trim();
        const iconKey = document.getElementById('menu-item-icon').value;
        const destinationType = document.getElementById('menu-item-dest-type').value;
        const destination = document.getElementById('menu-item-destination').value.trim();
        const order = parseInt(document.getElementById('menu-item-order').value) || 1;
        const tenantId = (document.getElementById('menu-item-tenant').value.trim() || 'GLOBAL').toUpperCase();
        const active = document.getElementById('menu-item-active').checked;

        const validation = dynamicMenuModule.validateDestination(destinationType, destination);
        if (!validation.valid) {
            toast.show(validation.error, 'error');
            btn.textContent = '💾 Guardar Opción';
            btn.disabled = false;
            return;
        }

        const payload = {
            title,
            description,
            iconKey,
            destinationType,
            destination,
            order,
            tenantId,
            active,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (id) {
                await db.collection('dynamic_menu').doc(id).update(payload);
                toast.show('¡Opción de menú actualizada con éxito!');
            } else {
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('dynamic_menu').add(payload);
                toast.show('¡Opción de menú creada exitosamente!');
            }
            dynamicMenuModule.resetForm();
        } catch (err) {
            console.error('[Submit Dynamic Menu Error]', err);
            toast.show(err.message || 'Error al guardar la opción de menú', 'error');
        } finally {
            btn.textContent = '💾 Guardar Opción';
            btn.disabled = false;
        }
    }
};

window.dynamicMenuModule = dynamicMenuModule;
