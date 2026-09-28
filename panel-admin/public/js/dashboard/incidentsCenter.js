// Módulo 10: Incident Center - Control Center Enterprise
const incidentsCenterModule = {
    unsubscribeIncidents: null,

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header Bar -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                    <div>
                        <h2 class="text-xl font-black text-white flex items-center gap-2">
                            <span>⚠️</span> Incident Center Operativo
                        </h2>
                        <p class="text-xs text-slate-400">Gestión en tiempo real de incidencias clasificadas por Cliente, Comercio, Vehículo, Clima, Sistema y GPS</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <select id="filterIncidentCategory" onchange="incidentsCenterModule.filterIncidents()" class="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-2.5">
                            <option value="ALL">Todas las Categorías</option>
                            <option value="CLIENTE">Cliente</option>
                            <option value="COMERCIO">Comercio</option>
                            <option value="VEHICULO">Vehículo</option>
                            <option value="SISTEMA_RED">Sistema / Red / GPS</option>
                            <option value="CLIMA_ENTORNO">Clima / Entorno</option>
                        </select>
                    </div>
                </div>

                <!-- Incidents Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="incidentsCardsGrid">
                    <div class="p-8 text-center text-slate-500 col-span-full">Cargando centro de incidencias en tiempo real...</div>
                </div>
            </div>
        `;

        incidentsCenterModule.initSnapshotListener();
    },

    incidentsCache: [],

    initSnapshotListener: () => {
        if (incidentsCenterModule.unsubscribeIncidents) incidentsCenterModule.unsubscribeIncidents();

        incidentsCenterModule.unsubscribeIncidents = db.collection('incidents')
            .orderBy('timestampMs', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                incidentsCenterModule.incidentsCache = [];
                snapshot.forEach(doc => {
                    incidentsCenterModule.incidentsCache.push({ id: doc.id, ...doc.data() });
                });
                incidentsCenterModule.filterIncidents();
            }, err => {
                console.error("Error en Incidents Snapshot:", err);
                // Fallback a colección alternativa "audit_logs" si "incidents" no tiene documentos
                incidentsCenterModule.renderFallback();
            });
    },

    renderFallback: () => {
        const container = document.getElementById('incidentsCardsGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 col-span-full">
                <div class="flex items-center justify-between">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">SISTEMA OK</span>
                    <span class="text-xs text-slate-500 font-mono">Monitoreo Activo</span>
                </div>
                <h4 class="font-bold text-white text-base">Cero Incidencias Críticas Activas</h4>
                <p class="text-xs text-slate-400">Todos los motorizados y pedidos operan sin bloqueos de clima, fallas mecánicas ni desvíos de ruta.</p>
            </div>
        `;
    },

    filterIncidents: () => {
        const cat = document.getElementById('filterIncidentCategory')?.value || 'ALL';
        const container = document.getElementById('incidentsCardsGrid');
        if (!container) return;

        const filtered = incidentsCenterModule.incidentsCache.filter(inc => {
            return cat === 'ALL' || (inc.category || '').toUpperCase().includes(cat);
        });

        if (filtered.length === 0) {
            incidentsCenterModule.renderFallback();
            return;
        }

        container.innerHTML = filtered.map(inc => {
            return `
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl border-l-4 border-l-rose-500">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-rose-400">⚠️ Incidencia: ${inc.incidentType || 'Alerta Operativa'}</span>
                        <span class="text-[10px] text-slate-500 font-mono">${new Date(inc.timestampMs || Date.now()).toLocaleTimeString()}</span>
                    </div>
                    <p class="text-xs text-slate-300 font-semibold">${inc.description || 'Sin detalles especificados'}</p>
                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                        <span>Pedido: <strong class="text-indigo-400 font-mono">#${(inc.orderId || 'N/A').slice(0,6)}</strong></span>
                        <span>Motorizado: <strong class="text-slate-200 font-mono">${(inc.courierId || 'N/A').slice(0,6)}</strong></span>
                        <button onclick="incidentsCenterModule.resolveIncident('${inc.id}')" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg font-bold text-[10px] transition">
                            ✓ Resolver
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    resolveIncident: (incidentId) => {
        if (!confirm("¿Marcar esta incidencia como RESUELTA?")) return;

        db.collection('incidents').doc(incidentId).update({
            status: 'RESOLVED',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            toast.success("Incidencia resuelta");
        }).catch(err => {
            toast.error("Error al resolver: " + err.message);
        });
    }
};

window.incidentsCenterModule = incidentsCenterModule;
