// Módulo de Visor de Auditoría y Exportación Avanzada (audit_logs)
const auditModule = {
    allLogs: [],
    filteredLogs: [],
    pagination: null,

    render: () => {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header con Botones de Exportación -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-100">🛡️ Auditoría de Seguridad & Exportación</h2>
                        <p class="text-xs text-gray-400 mt-1">Bitácora centralizada con filtros avanzados y descarga en formatos CSV y JSON.</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="auditModule.exportCSV()" class="px-4 py-2 bg-green-700 hover:bg-green-600 text-xs font-semibold text-white rounded-lg transition shadow flex items-center gap-2">
                            <span>📥</span> <span>Exportar CSV</span>
                        </button>
                        <button onclick="auditModule.exportJSON()" class="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-xs font-semibold text-white rounded-lg transition shadow flex items-center gap-2">
                            <span>📥</span> <span>Exportar JSON</span>
                        </button>
                    </div>
                </div>

                <!-- Barra de Filtros de Auditoría -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg space-y-3">
                    <h3 class="text-xs font-bold text-gray-300 uppercase tracking-wider">🔍 Filtros de Búsqueda</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label class="text-[10px] font-semibold text-gray-400">Desde (Fecha Inicio)</label>
                            <input type="date" id="audit-date-start" onchange="auditModule.applyFilters()" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                        </div>
                        <div>
                            <label class="text-[10px] font-semibold text-gray-400">Hasta (Fecha Fin)</label>
                            <input type="date" id="audit-date-end" onchange="auditModule.applyFilters()" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                        </div>
                        <div>
                            <label class="text-[10px] font-semibold text-gray-400">Administrador / Email</label>
                            <input type="text" id="audit-admin-filter" oninput="auditModule.applyFilters()" placeholder="Buscar admin..." class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                        </div>
                        <div>
                            <label class="text-[10px] font-semibold text-gray-400">Acción / Target</label>
                            <input type="text" id="audit-action-filter" oninput="auditModule.applyFilters()" placeholder="Buscar acción o target..." class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                        </div>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <div id="audit-table-container">
                        <p class="text-xs text-gray-500 p-6">Cargando bitácora de auditoría...</p>
                    </div>
                    <div id="audit-pagination"></div>
                </div>
            </div>
        `;

        auditModule.pagination = new Pagination('audit-pagination', 10, () => {
            auditModule.displayPage();
        });

        auditModule.loadLogs();
    },

    loadLogs: () => {
        db.collection('audit_logs').orderBy('timestamp', 'desc').onSnapshot(snap => {
            auditModule.allLogs = [];
            snap.forEach(doc => {
                auditModule.allLogs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            auditModule.applyFilters();
        });
    },

    applyFilters: () => {
        const startDateStr = document.getElementById('audit-date-start')?.value;
        const endDateStr = document.getElementById('audit-date-end')?.value;
        const adminFilter = document.getElementById('audit-admin-filter')?.value?.toLowerCase() || '';
        const actionFilter = document.getElementById('audit-action-filter')?.value?.toLowerCase() || '';

        const startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
        const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;

        auditModule.filteredLogs = auditModule.allLogs.filter(log => {
            const logDate = log.timestamp ? new Date(log.timestamp.seconds * 1000) : null;
            if (startDate && logDate && logDate < startDate) return false;
            if (endDate && logDate && logDate > endDate) return false;

            const adminMatch = !adminFilter || (log.adminEmail || '').toLowerCase().includes(adminFilter);
            const actionMatch = !actionFilter || 
                (log.action || '').toLowerCase().includes(actionFilter) || 
                (log.targetEmail || '').toLowerCase().includes(actionFilter) ||
                (log.targetUid || '').toLowerCase().includes(actionFilter);

            return adminMatch && actionMatch;
        });

        auditModule.pagination.currentPage = 1;
        auditModule.pagination.setTotalItems(auditModule.filteredLogs.length);
        auditModule.displayPage();
    },

    displayPage: () => {
        const pageData = auditModule.pagination.getCurrentPageData(auditModule.filteredLogs);
        
        table.render(
            'audit-table-container',
            ['Administrador', 'Operación / Acción', 'Target', 'Detalles', 'IP / Navegador', 'Fecha'],
            pageData,
            (log) => {
                const admin = log.adminEmail || 'system';
                const action = log.action || 'DESCONOCIDA';
                const target = log.targetEmail || log.targetUid || 'N/A';
                const timestamp = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                
                const detailsStr = log.details ? Object.entries(log.details).map(([k, v]) => `${k}:${v}`).join(', ') : '';

                const ip = log.ip || 'unknown';
                const ua = log.browser || 'unknown';
                const browserName = ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : 'Browser';

                return `
                    <td class="p-4 font-medium text-gray-300 font-mono text-xs">${admin}</td>
                    <td class="p-4"><span class="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded border border-blue-500/20">${action}</span></td>
                    <td class="p-4 text-gray-400 font-mono text-xs">${target}</td>
                    <td class="p-4 text-gray-500 text-xs truncate max-w-xs" title="${detailsStr}">${detailsStr}</td>
                    <td class="p-4 text-gray-500 text-xs">
                        <div>IP: ${ip}</div>
                        <div class="text-[10px] text-gray-600">${browserName}</div>
                    </td>
                    <td class="p-4 text-gray-500 font-mono text-xs">${timestamp}</td>
                `;
            }
        );
    },

    exportCSV: () => {
        if (auditModule.filteredLogs.length === 0) {
            toast.show('No hay registros para exportar en la vista actual.', 'error');
            return;
        }

        const headers = ['ID', 'Fecha', 'Administrador', 'Accion', 'Target', 'IP', 'Detalles'];
        const rows = auditModule.filteredLogs.map(l => {
            const timestamp = l.timestamp ? new Date(l.timestamp.seconds * 1000).toISOString() : '';
            const detailsStr = l.details ? JSON.stringify(l.details).replace(/"/g, '""') : '';
            return [
                l.id,
                `"${timestamp}"`,
                `"${l.adminEmail || ''}"`,
                `"${l.action || ''}"`,
                `"${l.targetEmail || l.targetUid || ''}"`,
                `"${l.ip || ''}"`,
                `"${detailsStr}"`
            ].join(',');
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `bluesystem_audit_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.show(`Exportados ${auditModule.filteredLogs.length} registros a CSV exitosamente.`);
    },

    exportJSON: () => {
        if (auditModule.filteredLogs.length === 0) {
            toast.show('No hay registros para exportar en la vista actual.', 'error');
            return;
        }

        const jsonStr = JSON.stringify(auditModule.filteredLogs, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bluesystem_audit_export_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.show(`Exportados ${auditModule.filteredLogs.length} registros a JSON exitosamente.`);
    }
};

window.auditModule = auditModule;
