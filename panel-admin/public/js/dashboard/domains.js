// Módulo de Gestión de Dominios & White Label (Fase 2E) — BlueSystem Enterprise
window.domainsModule = {
    domains: [],
    tenants: [],
    isLoading: false,

    render: async function() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto pb-12">
                <!-- Header -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">🌐</span>
                        <div>
                            <h2 class="text-xl font-black text-slate-100">Gestión de Dominios & White Label</h2>
                            <p class="text-xs text-slate-400">Administra dominios personalizados, subdominios por Tenant, verificación de registros DNS y certificados SSL en una única infraestructura.</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.domainsModule.openRegisterDomainModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>+</span> Registrar Nuevo Dominio
                        </button>
                        <button onclick="window.domainsModule.loadData()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3 py-2.5 rounded-xl transition">
                            🔄 Actualizar
                        </button>
                    </div>
                </div>

                <!-- KPIs -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="domainKpiContainer">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Dominios</span>
                        <p class="text-2xl font-black text-white mt-1" id="kpiTotalDomains">-</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Dominios Activos</span>
                        <p class="text-2xl font-black text-emerald-400 mt-1" id="kpiActiveDomains">-</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <span class="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pendientes DNS</span>
                        <p class="text-2xl font-black text-amber-400 mt-1" id="kpiPendingDomains">-</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Dominios Propios (Custom)</span>
                        <p class="text-2xl font-black text-indigo-400 mt-1" id="kpiCustomDomains">-</p>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div class="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                        <div class="flex items-center gap-2 w-full md:w-auto">
                            <input 
                                type="text" 
                                id="domainSearchInput" 
                                oninput="window.domainsModule.filterTable()" 
                                placeholder="Filtrar por dominio o tenant..." 
                                class="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl w-full md:w-64 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-800 bg-slate-950/40 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    <th class="p-3.5">Dominio</th>
                                    <th class="p-3.5">Tenant</th>
                                    <th class="p-3.5">Tipo</th>
                                    <th class="p-3.5">Estado</th>
                                    <th class="p-3.5">DNS Status</th>
                                    <th class="p-3.5">SSL</th>
                                    <th class="p-3.5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="domainTableBody" class="divide-y divide-slate-800/60 text-xs">
                                <tr>
                                    <td colspan="7" class="p-8 text-center text-slate-500">Cargando registros de dominios...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Registrar Dominio -->
            <div id="registerDomainModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
                <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 class="text-sm font-black text-white">Registrar Nuevo Dominio</h3>
                        <button onclick="window.domainsModule.closeRegisterDomainModal()" class="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
                    </div>
                    <form onsubmit="window.domainsModule.submitRegisterDomain(event)" class="space-y-3">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Tenant ID</label>
                            <input type="text" id="regTenantId" required placeholder="ej. tenant_volados" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white mt-1 font-mono focus:border-indigo-500" />
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Tipo de Dominio</label>
                            <select id="regDomainType" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-indigo-500">
                                <option value="TENANT_SUBDOMAIN">Subdominio (ej: volados.bluesystemdelivery.com)</option>
                                <option value="CUSTOM_DOMAIN">Dominio Propio (ej: volados.com)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Nombre del Dominio / FQDN</label>
                            <input type="text" id="regDomainName" required placeholder="ej. delivery.volados.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white mt-1 font-mono focus:border-indigo-500" />
                        </div>
                        <div class="pt-3 flex gap-2">
                            <button type="button" onclick="window.domainsModule.closeRegisterDomainModal()" class="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition">Cancelar</button>
                            <button type="submit" id="btnSubmitDomain" class="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg">Guardar Dominio</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal Instrucciones DNS -->
            <div id="dnsInstructionsModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
                <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h3 class="text-sm font-black text-white">Instrucciones de Configuración DNS</h3>
                        <button onclick="window.domainsModule.closeDnsModal()" class="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
                    </div>
                    <div class="space-y-3" id="dnsInstructionsContent">
                        <!-- Inyectado dinámicamente -->
                    </div>
                    <div class="pt-3 border-t border-slate-800 flex justify-end">
                        <button onclick="window.domainsModule.closeDnsModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        try {
            const snap = await firebase.firestore().collection('tenantDomains').orderBy('createdAt', 'desc').get();
            this.domains = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateKpis();
            this.renderTable(this.domains);
        } catch (err) {
            console.error("Error al cargar dominios:", err);
            const tbody = document.getElementById('domainTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-rose-400">Error al cargar dominios: ${err.message}</td></tr>`;
            }
        }
    },

    updateKpis: function() {
        const total = this.domains.length;
        const active = this.domains.filter(d => d.status === 'ACTIVE').length;
        const pending = this.domains.filter(d => d.status === 'PENDING' || d.dnsStatus === 'PENDING').length;
        const custom = this.domains.filter(d => d.domainType === 'CUSTOM_DOMAIN').length;

        const elTotal = document.getElementById('kpiTotalDomains');
        const elActive = document.getElementById('kpiActiveDomains');
        const elPending = document.getElementById('kpiPendingDomains');
        const elCustom = document.getElementById('kpiCustomDomains');

        if (elTotal) elTotal.textContent = total;
        if (elActive) elActive.textContent = active;
        if (elPending) elPending.textContent = pending;
        if (elCustom) elCustom.textContent = custom;
    },

    renderTable: function(items) {
        const tbody = document.getElementById('domainTableBody');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-500">No hay dominios registrados en la plataforma.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(d => {
            const isPrimaryBadge = d.isPrimary ? `<span class="ml-2 px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono font-bold">PRIMARY</span>` : '';
            const statusColor = d.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' : 'text-amber-400 bg-amber-950/40 border-amber-800/40';
            const dnsColor = d.dnsStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400';

            return `
                <tr class="hover:bg-slate-800/30 transition">
                    <td class="p-3.5 font-bold text-slate-200">
                        <div class="flex items-center">
                            <span class="font-mono">${d.domain}</span>
                            ${isPrimaryBadge}
                        </div>
                    </td>
                    <td class="p-3.5 font-mono text-slate-400">${d.tenantId}</td>
                    <td class="p-3.5 text-slate-300">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700">${d.domainType}</span>
                    </td>
                    <td class="p-3.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}">${d.status}</span>
                    </td>
                    <td class="p-3.5 font-mono text-xs ${dnsColor}">
                        ${d.dnsStatus === 'VERIFIED' ? '✅ VERIFIED' : '⏳ PENDING'}
                    </td>
                    <td class="p-3.5 text-[10px] font-mono text-slate-400">${d.sslStatus || 'ACTIVE'}</td>
                    <td class="p-3.5 text-right space-x-1">
                        <button onclick="window.domainsModule.showDnsInstructions('${d.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition">DNS</button>
                        ${d.status !== 'ACTIVE' ? `<button onclick="window.domainsModule.verifyDomain('${d.id}')" class="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold transition">Verificar</button>` : ''}
                        ${!d.isPrimary ? `<button onclick="window.domainsModule.setPrimary('${d.tenantId}', '${d.id}')" class="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold transition">Primario</button>` : ''}
                        <button onclick="window.domainsModule.deleteDomain('${d.id}')" class="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition">Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterTable: function() {
        const query = (document.getElementById('domainSearchInput')?.value || '').toLowerCase().trim();
        const filtered = this.domains.filter(d => 
            d.domain.toLowerCase().includes(query) || 
            d.tenantId.toLowerCase().includes(query)
        );
        this.renderTable(filtered);
    },

    openRegisterDomainModal: function() {
        const modal = document.getElementById('registerDomainModal');
        if (modal) modal.classList.remove('hidden');
    },

    closeRegisterDomainModal: function() {
        const modal = document.getElementById('registerDomainModal');
        if (modal) modal.classList.add('hidden');
    },

    submitRegisterDomain: async function(e) {
        e.preventDefault();
        const tenantId = document.getElementById('regTenantId').value.trim();
        const domainType = document.getElementById('regDomainType').value;
        const domain = document.getElementById('regDomainName').value.trim();
        const btn = document.getElementById('btnSubmitDomain');

        if (!tenantId || !domain) return;
        btn.disabled = true;
        btn.textContent = 'Registrando...';

        try {
            const registerFn = firebase.functions().httpsCallable('registerTenantDomain');
            await registerFn({ tenantId, domainType, domain });
            alert(`Dominio ${domain} registrado exitosamente.`);
            this.closeRegisterDomainModal();
            await this.loadData();
        } catch (err) {
            alert(`Error al registrar dominio: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Guardar Dominio';
        }
    },

    showDnsInstructions: function(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        const content = document.getElementById('dnsInstructionsContent');
        if (!content) return;

        const instructions = domain.dnsInstructions || [];
        content.innerHTML = `
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                <p><strong class="text-white">Dominio:</strong> <span class="font-mono text-indigo-400">${domain.domain}</span></p>
                <p><strong class="text-white">Tenant:</strong> <span class="font-mono text-slate-300">${domain.tenantId}</span></p>
            </div>
            <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-300 uppercase">Registros Requeridos</h4>
                ${instructions.map(inst => `
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                        <div class="flex justify-between">
                            <span class="text-amber-400 font-bold">TYPE: ${inst.type}</span>
                            <span class="text-[10px] text-slate-400">${inst.isVerified ? '✅ VERIFICADO' : '⏳ PENDIENTE'}</span>
                        </div>
                        <p class="text-slate-300">Host: <span class="text-white font-bold">${inst.host}</span></p>
                        <p class="text-slate-300 break-all">Valor: <span class="text-emerald-400 font-bold">${inst.targetValue}</span></p>
                    </div>
                `).join('')}
            </div>
        `;

        const modal = document.getElementById('dnsInstructionsModal');
        if (modal) modal.classList.remove('hidden');
    },

    closeDnsModal: function() {
        const modal = document.getElementById('dnsInstructionsModal');
        if (modal) modal.classList.add('hidden');
    },

    verifyDomain: async function(domainId) {
        if (!confirm('¿Desea ejecutar la verificación de registros DNS para este dominio?')) return;
        try {
            const verifyFn = firebase.functions().httpsCallable('verifyTenantDomainDns');
            await verifyFn({ domainId });
            alert('Dominio verificado y activado.');
            await this.loadData();
        } catch (err) {
            alert(`Error en verificación DNS: ${err.message}`);
        }
    },

    setPrimary: async function(tenantId, domainId) {
        if (!confirm('¿Desea establecer este dominio como primario para el tenant?')) return;
        try {
            const setPrimaryFn = firebase.functions().httpsCallable('setPrimaryTenantDomain');
            await setPrimaryFn({ tenantId, domainId });
            alert('Dominio primario actualizado.');
            await this.loadData();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    },

    deleteDomain: async function(domainId) {
        if (!confirm('¿Está seguro de eliminar este registro de dominio?')) return;
        try {
            const delFn = firebase.functions().httpsCallable('deleteTenantDomain');
            await delFn({ domainId });
            alert('Dominio eliminado.');
            await this.loadData();
        } catch (err) {
            alert(`Error al eliminar: ${err.message}`);
        }
    }
};
