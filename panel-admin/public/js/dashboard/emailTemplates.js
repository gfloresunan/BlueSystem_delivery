// Módulo Email Templates Enterprise (Actividad #20 - Protocolo BSD-ACT20-TRANSACTIONAL-EMAIL-ENTERPRISE-001)
window.emailTemplatesModule = {
    templates: [],
    eventsHistory: [],
    activeTab: 'templates',
    selectedTemplate: null,
    previewMode: 'desktop',
    filterAudience: 'ALL',

    render: async function() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto pb-12">
                <!-- Header Banner -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div class="space-y-1">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">✉️</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h2 class="text-xl font-black text-slate-100">Sistema de Email Transaccional Enterprise</h2>
                                    <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">SMTP SSL/TLS 465</span>
                                </div>
                                <p class="text-xs text-slate-400">Infraestructura centralizada de notificaciones transaccionales para Cliente, Comercio, Motorizado y Gobernanza.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button onclick="window.emailTemplatesModule.verifySmtp()" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-indigo-500/30 shadow-lg transition flex items-center gap-2">
                            <span>🩺</span> Verificar Conexión SMTP
                        </button>
                        <button onclick="window.emailTemplatesModule.loadTemplates()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>🔄</span> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Estado del Servidor SMTP Corporativo -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Servidor SMTP</p>
                        <p class="text-sm font-mono font-bold text-indigo-300 mt-1">mail.bluesystemdelivery.com</p>
                    </div>
                    <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Puerto & Seguridad</p>
                        <p class="text-sm font-mono font-bold text-emerald-400 mt-1">465 (SSL/TLS Nativo)</p>
                    </div>
                    <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Remitente Corporativo</p>
                        <p class="text-sm font-mono font-bold text-slate-200 mt-1 truncate">noreply@bluesystemdelivery.com</p>
                    </div>
                    <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-xl" id="smtpStatusBox">
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Estado de Conectividad</p>
                        <p class="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> OPERACIONAL
                        </p>
                    </div>
                </div>

                <!-- Sub-Navegación por Pestañas -->
                <div class="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                    <button onclick="window.emailTemplatesModule.switchSubTab('templates')" id="etab-btn-templates" class="etab-btn active bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-xs font-bold transition">
                        📄 Catálogo de Plantillas
                    </button>
                    <button onclick="window.emailTemplatesModule.switchSubTab('history')" id="etab-btn-history" class="etab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        📊 Historial de Entregas (/email_events)
                    </button>
                </div>

                <!-- Pestaña 1: Catálogo de Plantillas -->
                <div id="esubtab-templates" class="esubtab-content space-y-6">
                    <!-- Filtro por Audiencia -->
                    <div class="flex items-center justify-between gap-4 flex-wrap bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-400">Filtrar por Audiencia:</span>
                            <div class="flex gap-1">
                                <button onclick="window.emailTemplatesModule.setFilter('ALL')" class="filter-btn text-xs px-3 py-1 rounded-lg font-bold transition bg-indigo-600 text-white" id="filter-btn-ALL">Todos</button>
                                <button onclick="window.emailTemplatesModule.setFilter('CUSTOMER')" class="filter-btn text-xs px-3 py-1 rounded-lg font-bold transition text-slate-400 hover:text-white" id="filter-btn-CUSTOMER">Clientes</button>
                                <button onclick="window.emailTemplatesModule.setFilter('MERCHANT')" class="filter-btn text-xs px-3 py-1 rounded-lg font-bold transition text-slate-400 hover:text-white" id="filter-btn-MERCHANT">Comercios</button>
                                <button onclick="window.emailTemplatesModule.setFilter('COURIER')" class="filter-btn text-xs px-3 py-1 rounded-lg font-bold transition text-slate-400 hover:text-white" id="filter-btn-COURIER">Motorizados</button>
                                <button onclick="window.emailTemplatesModule.setFilter('SYSTEM')" class="filter-btn text-xs px-3 py-1 rounded-lg font-bold transition text-slate-400 hover:text-white" id="filter-btn-SYSTEM">Sistema & Auth</button>
                            </div>
                        </div>
                    </div>

                    <!-- Lista de Plantillas -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="templatesGridContainer">
                        <p class="text-xs text-slate-500 p-4">Cargando plantillas de correo transaccional...</p>
                    </div>
                </div>

                <!-- Pestaña 2: Historial de Entregas -->
                <div id="esubtab-history" class="esubtab-content space-y-6 hidden">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h3 class="text-sm font-extrabold text-indigo-400 uppercase tracking-wider">Registro de Eventos Transaccionales (/email_events)</h3>
                                <p class="text-xs text-slate-400">Trazabilidad en tiempo real de correos entregados, omitidos por idempotencia y fallas controladas.</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="window.emailTemplatesModule.loadHistory()" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-200 font-bold border border-slate-700">
                                    🔄 Refrescar Historial
                                </button>
                            </div>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-slate-300">
                                <thead class="bg-slate-950/80 text-[10px] text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
                                    <tr>
                                        <th class="p-3">Evento / ID</th>
                                        <th class="p-3">Destinatario</th>
                                        <th class="p-3">Asunto</th>
                                        <th class="p-3">Plantilla</th>
                                        <th class="p-3">Estado</th>
                                        <th class="p-3">Intentos</th>
                                        <th class="p-3">Message ID</th>
                                        <th class="p-3">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60 font-mono text-[11px]" id="emailEventsTableBody">
                                    <tr>
                                        <td colspan="8" class="p-6 text-center text-slate-500 font-sans text-xs">Cargando historial de eventos...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Editor de Plantilla -->
            <div id="editTemplateModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                    <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">✏️</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-100" id="editModalTitle">Editar Plantilla</h3>
                                <p class="text-[11px] text-slate-400 font-mono" id="editModalTemplateId">template_id</p>
                            </div>
                        </div>
                        <button onclick="window.emailTemplatesModule.closeEditModal()" class="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
                    </div>

                    <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block font-bold text-slate-300 mb-1">Asunto del Correo (Subject)</label>
                                <input type="text" id="editSubject" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs font-mono">
                            </div>
                            <div>
                                <label class="block font-bold text-slate-300 mb-1">Título Interno del Correo</label>
                                <input type="text" id="editTitle" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs">
                            </div>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-300 mb-1">Variables Permitidas</label>
                            <div class="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-indigo-300" id="editAllowedVariablesPills">
                                <!-- Pills de variables -->
                            </div>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-300 mb-1">Cuerpo HTML (Sanitizado Server-Side)</label>
                            <textarea id="editHtmlContent" rows="8" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-xs font-mono"></textarea>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block font-bold text-slate-300 mb-1">Etiqueta del Botón CTA (Opcional)</label>
                                <input type="text" id="editButtonLabel" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs">
                            </div>
                            <div>
                                <label class="block font-bold text-slate-300 mb-1">URL de Destino (https:// o variable)</label>
                                <input type="text" id="editButtonUrl" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs font-mono">
                            </div>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-300 mb-1">Estado de la Plantilla</label>
                            <select id="editStatus" class="bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs">
                                <option value="ACTIVE">ACTIVE (Activa para envíos)</option>
                                <option value="INACTIVE">INACTIVE (Desactivada)</option>
                            </select>
                        </div>
                    </div>

                    <div class="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                        <span class="text-[11px] text-slate-400">Cada guardado genera una nueva versión inmutable.</span>
                        <div class="flex gap-2">
                            <button onclick="window.emailTemplatesModule.closeEditModal()" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-700">Cancelar</button>
                            <button onclick="window.emailTemplatesModule.saveTemplate()" class="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-500 shadow-lg">💾 Guardar Nueva Versión</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Previsualizador de Correo -->
            <div id="previewTemplateModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                    <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">👁️</span>
                            <div>
                                <h3 class="text-sm font-bold text-slate-100" id="previewModalTitle">Vista Previa de Correo</h3>
                                <p class="text-[11px] text-slate-400" id="previewModalSubject">Asunto</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-bold">
                                <button onclick="window.emailTemplatesModule.setPreviewMode('desktop')" id="prev-btn-desktop" class="px-3 py-1 rounded bg-indigo-600 text-white text-[11px]">🖥️ Desktop</button>
                                <button onclick="window.emailTemplatesModule.setPreviewMode('mobile')" id="prev-btn-mobile" class="px-3 py-1 rounded text-slate-400 hover:text-white text-[11px]">📱 Mobile</button>
                            </div>
                            <button onclick="window.emailTemplatesModule.closePreviewModal()" class="text-slate-400 hover:text-white text-lg font-bold p-1 ml-2">✕</button>
                        </div>
                    </div>

                    <div class="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-950">
                        <div id="previewContainerWrapper" class="w-full max-w-[600px] transition-all duration-200">
                            <div id="previewIframeContainer" class="bg-[#0B0F19] rounded-xl border border-slate-800 p-4 min-h-[400px]">
                                <!-- Contenido inyectado -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Envío de Prueba SMTP -->
            <div id="testEmailModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                    <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🧪</span>
                            <h3 class="text-sm font-bold text-slate-100">Enviar Correo de Prueba</h3>
                        </div>
                        <button onclick="window.emailTemplatesModule.closeTestModal()" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
                    </div>

                    <div class="p-5 space-y-4 text-xs">
                        <p class="text-slate-300">Introduce el correo electrónico al cual deseas enviar una prueba real con la plantilla <strong id="testModalTemplateName" class="text-indigo-300">...</strong>:</p>
                        <div>
                            <label class="block font-bold text-slate-300 mb-1">Destinatario de Prueba</label>
                            <input type="email" id="testEmailRecipient" placeholder="tu-correo@ejemplo.com" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs font-mono">
                        </div>
                        <div class="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 space-y-1">
                            <p><strong>Remitente:</strong> noreply@bluesystemdelivery.com</p>
                            <p><strong>Transporte:</strong> mail.bluesystemdelivery.com:465</p>
                            <p><strong>Seguridad:</strong> Se inyectan datos de prueba ficticios.</p>
                        </div>
                    </div>

                    <div class="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
                        <button onclick="window.emailTemplatesModule.closeTestModal()" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-700">Cancelar</button>
                        <button onclick="window.emailTemplatesModule.executeSendTestEmail()" id="btnExecuteSendTest" class="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-500 shadow-lg flex items-center gap-1.5">
                            <span>🚀</span> Enviar Prueba Ahora
                        </button>
                    </div>
                </div>
            </div>
        `;

        await this.loadTemplates();
    },

    switchSubTab: function(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.etab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-indigo-600/20', 'text-indigo-400', 'border-indigo-500/30');
            btn.classList.add('text-slate-400');
        });
        const activeBtn = document.getElementById(`etab-btn-${tab}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-indigo-600/20', 'text-indigo-400', 'border-indigo-500/30');
            activeBtn.classList.remove('text-slate-400');
        }

        document.querySelectorAll('.esubtab-content').forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById(`esubtab-${tab}`);
        if (activeContent) activeContent.classList.remove('hidden');

        if (tab === 'history') {
            this.loadHistory();
        }
    },

    setFilter: function(audience) {
        this.filterAudience = audience;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('bg-indigo-600', 'text-white');
            b.classList.add('text-slate-400');
        });
        const activeFilterBtn = document.getElementById(`filter-btn-${audience}`);
        if (activeFilterBtn) {
            activeFilterBtn.classList.add('bg-indigo-600', 'text-white');
            activeFilterBtn.classList.remove('text-slate-400');
        }
        this.renderTemplatesGrid();
    },

    loadTemplates: async function() {
        const grid = document.getElementById('templatesGridContainer');
        if (grid) grid.innerHTML = '<p class="text-xs text-slate-500 p-4">Cargando plantillas...</p>';

        try {
            const functions = firebase.functions();
            const getTemplatesCallable = functions.httpsCallable('adminGetEmailTemplates');
            const result = await getTemplatesCallable({});
            this.templates = result.data?.templates || [];
            this.renderTemplatesGrid();
        } catch (err) {
            console.error("Error cargando plantillas:", err);
            if (grid) {
                grid.innerHTML = `<div class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">Error cargando plantillas: ${err.message}</div>`;
            }
        }
    },

    renderTemplatesGrid: function() {
        const grid = document.getElementById('templatesGridContainer');
        if (!grid) return;

        let filtered = this.templates;
        if (this.filterAudience !== 'ALL') {
            filtered = this.templates.filter(t => t.audience === this.filterAudience);
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<p class="text-xs text-slate-500 p-4 col-span-3">No hay plantillas para la audiencia seleccionada.</p>';
            return;
        }

        const audienceColors = {
            CUSTOMER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            MERCHANT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            COURIER: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
            SYSTEM: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };

        grid.innerHTML = filtered.map(t => {
            const audBadge = audienceColors[t.audience] || 'bg-slate-800 text-slate-400 border-slate-700';
            const statusBadge = t.status === 'ACTIVE'
                ? '<span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>'
                : '<span class="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">INACTIVE</span>';

            return `
                <div class="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-5 rounded-2xl transition shadow-lg flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${audBadge}">${t.audience}</span>
                            <div class="flex items-center gap-1.5">
                                <span class="text-[10px] font-mono text-slate-500">v${t.version || 1}</span>
                                ${statusBadge}
                            </div>
                        </div>
                        <h4 class="text-sm font-bold text-slate-100">${t.name}</h4>
                        <p class="text-xs text-slate-400 font-mono truncate" title="${t.subject}">Asunto: ${t.subject}</p>
                        <p class="text-[11px] text-slate-500 line-clamp-2">${t.description || ''}</p>
                    </div>

                    <div class="space-y-3 pt-2 border-t border-slate-800/80">
                        <div class="flex flex-wrap gap-1">
                            ${(t.allowedVariables || []).slice(0, 4).map(v => `<span class="bg-slate-950 px-1.5 py-0.5 rounded text-[9px] font-mono text-indigo-300 border border-slate-800">{{${v}}}</span>`).join('')}
                            ${(t.allowedVariables || []).length > 4 ? `<span class="text-[9px] text-slate-500 self-center">+${t.allowedVariables.length - 4} más</span>` : ''}
                        </div>

                        <div class="flex items-center justify-between gap-2 pt-1">
                            <button onclick="window.emailTemplatesModule.openPreviewModal('${t.templateId}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1">
                                <span>👁️</span> Ver
                            </button>
                            <button onclick="window.emailTemplatesModule.openEditModal('${t.templateId}')" class="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs py-1.5 rounded-lg font-bold border border-indigo-500/30 transition flex items-center justify-center gap-1">
                                <span>✏️</span> Editar
                            </button>
                            <button onclick="window.emailTemplatesModule.openTestModal('${t.templateId}')" class="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs rounded-lg font-bold border border-emerald-500/30 transition" title="Enviar Prueba">
                                🧪
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    openEditModal: function(templateId) {
        const tpl = this.templates.find(t => t.templateId === templateId);
        if (!tpl) return;
        this.selectedTemplate = tpl;

        document.getElementById('editModalTitle').textContent = `Editar: ${tpl.name}`;
        document.getElementById('editModalTemplateId').textContent = tpl.templateId;
        document.getElementById('editSubject').value = tpl.subject || '';
        document.getElementById('editTitle').value = tpl.title || '';
        document.getElementById('editHtmlContent').value = tpl.htmlContent || '';
        document.getElementById('editButtonLabel').value = tpl.buttonLabel || '';
        document.getElementById('editButtonUrl').value = tpl.buttonUrl || '';
        document.getElementById('editStatus').value = tpl.status || 'ACTIVE';

        const pillsContainer = document.getElementById('editAllowedVariablesPills');
        if (pillsContainer) {
            pillsContainer.innerHTML = (tpl.allowedVariables || []).map(v => `
                <span class="bg-slate-900 border border-indigo-500/30 px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-950" onclick="window.emailTemplatesModule.insertVariable('{{${v}}}')">
                    {{${v}}}
                </span>
            `).join('');
        }

        document.getElementById('editTemplateModal').classList.remove('hidden');
    },

    insertVariable: function(varText) {
        const textarea = document.getElementById('editHtmlContent');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + varText + text.substring(end);
        textarea.focus();
    },

    closeEditModal: function() {
        document.getElementById('editTemplateModal').classList.add('hidden');
        this.selectedTemplate = null;
    },

    saveTemplate: async function() {
        if (!this.selectedTemplate) return;
        const templateId = this.selectedTemplate.templateId;
        const subject = document.getElementById('editSubject').value;
        const title = document.getElementById('editTitle').value;
        const htmlContent = document.getElementById('editHtmlContent').value;
        const buttonLabel = document.getElementById('editButtonLabel').value;
        const buttonUrl = document.getElementById('editButtonUrl').value;
        const status = document.getElementById('editStatus').value;

        try {
            const functions = firebase.functions();
            const saveCallable = functions.httpsCallable('adminSaveEmailTemplate');
            const result = await saveCallable({
                templateId,
                subject,
                title,
                htmlContent,
                buttonLabel,
                buttonUrl,
                status,
                allowedVariables: this.selectedTemplate.allowedVariables,
            });

            alert(result.data?.message || 'Plantilla guardada con éxito.');
            this.closeEditModal();
            await this.loadTemplates();
        } catch (err) {
            alert(`Error al guardar plantilla: ${err.message}`);
        }
    },

    openPreviewModal: function(templateId) {
        const tpl = this.templates.find(t => t.templateId === templateId);
        if (!tpl) return;
        this.selectedTemplate = tpl;

        document.getElementById('previewModalTitle').textContent = tpl.name;
        document.getElementById('previewModalSubject').textContent = `Asunto: ${tpl.subject}`;

        this.renderPreviewContent();
        document.getElementById('previewTemplateModal').classList.remove('hidden');
    },

    setPreviewMode: function(mode) {
        this.previewMode = mode;
        const wrapper = document.getElementById('previewContainerWrapper');
        const btnDesk = document.getElementById('prev-btn-desktop');
        const btnMob = document.getElementById('prev-btn-mobile');

        if (mode === 'mobile') {
            if (wrapper) wrapper.style.maxWidth = '375px';
            btnMob.classList.add('bg-indigo-600', 'text-white');
            btnMob.classList.remove('text-slate-400');
            btnDesk.classList.remove('bg-indigo-600', 'text-white');
            btnDesk.classList.add('text-slate-400');
        } else {
            if (wrapper) wrapper.style.maxWidth = '600px';
            btnDesk.classList.add('bg-indigo-600', 'text-white');
            btnDesk.classList.remove('text-slate-400');
            btnMob.classList.remove('bg-indigo-600', 'text-white');
            btnMob.classList.add('text-slate-400');
        }
    },

    renderPreviewContent: function() {
        const container = document.getElementById('previewIframeContainer');
        if (!container || !this.selectedTemplate) return;

        const dummyVars = {
            customerName: 'Juan Pérez (Cliente Demo)',
            contactName: 'Carlos Mendoza',
            businessName: 'Hamburguesas & Grill Pro',
            candidateName: 'Mario Gómez (Motorizado Demo)',
            email: 'usuario.demo@bluesystemdelivery.com',
            appId: 'app_demo_789456',
            businessId: 'biz_demo_123',
            courierId: 'courier_demo_456',
            tempPassword: 'DemoPass987#@!',
            plate: 'M 987654',
            rejectionReason: 'Documentación de identidad vencida o borrosa.',
            docsNote: 'Por favor adjuntar cédula actualizada por ambos lados.',
            resetLink: 'https://bluesystemdelivery.com/reset-demo',
            platformName: 'BlueSystem Delivery',
            tenantName: 'BlueSystem Platform',
            supportEmail: 'soporte@bluesystemdelivery.com',
            year: new Date().getFullYear().toString(),
        };

        let renderedBody = this.selectedTemplate.htmlContent || '';
        let renderedTitle = this.selectedTemplate.title || '';
        let renderedBtnUrl = this.selectedTemplate.buttonUrl || '';

        for (const [k, v] of Object.entries(dummyVars)) {
            const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
            renderedBody = renderedBody.replace(reg, v);
            renderedTitle = renderedTitle.replace(reg, v);
            renderedBtnUrl = renderedBtnUrl.replace(reg, v);
        }

        const buttonHtml = this.selectedTemplate.buttonLabel
            ? `<div style="text-align: center; margin: 28px 0;">
                 <a href="${renderedBtnUrl || '#'}" style="background-color: #0284C7; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">${this.selectedTemplate.buttonLabel}</a>
               </div>`
            : '';

        container.innerHTML = `
            <div style="background-color: #1E293B; border-radius: 12px; border: 1px solid #334155; padding: 24px; color: #E2E8F0; font-family: sans-serif;">
                <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
                    <h2 style="color: #38BDF8; font-size: 20px; font-weight: 900; margin: 0;">BlueSystem Delivery</h2>
                    <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase;">Enterprise Notification Preview</p>
                </div>
                <h3 style="color: #F8FAFC; font-size: 16px; font-weight: 700; margin-bottom: 16px;">${renderedTitle}</h3>
                <div style="font-size: 13px; line-height: 1.6; color: #CBD5E1;">
                    ${renderedBody}
                </div>
                ${buttonHtml}
                <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 11px; color: #64748B;">
                    © ${new Date().getFullYear()} BlueSystem Delivery Enterprise. Soporte: soporte@bluesystemdelivery.com
                </div>
            </div>
        `;
    },

    closePreviewModal: function() {
        document.getElementById('previewTemplateModal').classList.add('hidden');
        this.selectedTemplate = null;
    },

    openTestModal: function(templateId) {
        const tpl = this.templates.find(t => t.templateId === templateId);
        if (!tpl) return;
        this.selectedTemplate = tpl;

        document.getElementById('testModalTemplateName').textContent = tpl.name;
        document.getElementById('testEmailRecipient').value = '';
        document.getElementById('testEmailModal').classList.remove('hidden');
    },

    closeTestModal: function() {
        document.getElementById('testEmailModal').classList.add('hidden');
        this.selectedTemplate = null;
    },

    executeSendTestEmail: async function() {
        if (!this.selectedTemplate) return;
        const recipient = document.getElementById('testEmailRecipient').value.trim();
        if (!recipient) {
            alert('Por favor ingresa un correo destinatario.');
            return;
        }

        const btn = document.getElementById('btnExecuteSendTest');
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Enviando...';

        try {
            const functions = firebase.functions();
            const sendTestCallable = functions.httpsCallable('adminSendTestEmail');
            const result = await sendTestCallable({
                templateId: this.selectedTemplate.templateId,
                recipient,
            });

            if (result.data?.success) {
                alert(`🟢 Correo de prueba enviado exitosamente a ${recipient}.\nMessage ID: ${result.data.providerMessageId}`);
                this.closeTestModal();
            } else {
                alert(`🔴 Fallo en el envío: ${result.data?.error || 'Error desconocido'}`);
            }
        } catch (err) {
            alert(`🔴 Error: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>🚀</span> Enviar Prueba Ahora';
        }
    },

    loadHistory: async function() {
        const tbody = document.getElementById('emailEventsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-500 font-sans text-xs">Cargando eventos...</td></tr>';

        try {
            const functions = firebase.functions();
            const getHistoryCallable = functions.httpsCallable('adminGetEmailEventsHistory');
            const result = await getHistoryCallable({ limit: 50 });
            this.eventsHistory = result.data?.events || [];

            if (this.eventsHistory.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-500 font-sans text-xs">No hay eventos registrados en /email_events aún.</td></tr>';
                return;
            }

            const statusBadges = {
                SENT: '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">SENT</span>',
                FAILED: '<span class="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">FAILED</span>',
                SKIPPED: '<span class="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">SKIPPED</span>',
                SENDING: '<span class="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold">SENDING</span>',
            };

            tbody.innerHTML = this.eventsHistory.map(e => `
                <tr class="hover:bg-slate-950/40 transition">
                    <td class="p-3">
                        <div class="font-bold text-slate-200">${e.eventType}</div>
                        <div class="text-[10px] text-slate-500 truncate max-w-[150px]">${e.eventId}</div>
                    </td>
                    <td class="p-3 text-slate-300">${e.recipient}</td>
                    <td class="p-3 text-slate-300 font-sans truncate max-w-[200px]" title="${e.subject}">${e.subject}</td>
                    <td class="p-3 text-indigo-300">${e.templateId} (v${e.templateVersion})</td>
                    <td class="p-3">${statusBadges[e.status] || e.status}</td>
                    <td class="p-3 text-center text-slate-400">${e.attempts || 1}</td>
                    <td class="p-3 text-[10px] text-slate-400 truncate max-w-[120px]" title="${e.providerMessageId || ''}">${e.providerMessageId || '-'}</td>
                    <td class="p-3 text-[10px] text-slate-400 font-sans">${e.sentAt ? new Date(e.sentAt).toLocaleString('es-NI') : (e.createdAt ? new Date(e.createdAt).toLocaleString('es-NI') : '-')}</td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-rose-400 font-sans text-xs">Error cargando historial: ${err.message}</td></tr>`;
        }
    },

    verifySmtp: async function() {
        const box = document.getElementById('smtpStatusBox');
        if (box) {
            box.innerHTML = `
                <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Estado de Conectividad</p>
                <p class="text-xs font-bold text-indigo-300 mt-1 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-indigo-400 animate-spin"></span> Verificando...
                </p>
            `;
        }

        try {
            const functions = firebase.functions();
            const verifyCallable = functions.httpsCallable('adminVerifySmtpConnection');
            const result = await verifyCallable({});

            if (result.data?.success) {
                alert(`🟢 Conexión SMTP Exitosa:\n${result.data.message}`);
                if (box) {
                    box.innerHTML = `
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Estado de Conectividad</p>
                        <p class="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> CONECTADO & AUTORIZADO
                        </p>
                    `;
                }
            } else {
                alert(`🔴 Fallo en la verificación SMTP:\n${result.data?.error || 'Credenciales o servidor inaccesible.'}`);
                if (box) {
                    box.innerHTML = `
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Estado de Conectividad</p>
                        <p class="text-sm font-bold text-rose-400 mt-1 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-rose-400"></span> ERROR DE CONEXIÓN
                        </p>
                    `;
                }
            }
        } catch (err) {
            alert(`🔴 Error verificando SMTP: ${err.message}`);
        }
    }
};
