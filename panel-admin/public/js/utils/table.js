// Utilidad para renderizado y formateo de tablas dinámicas
const table = {
    render: (containerId, headers, data, rowRenderer) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 text-gray-500">
                    <span class="text-4xl mb-2">📁</span>
                    <p class="font-medium text-sm">No se encontraron registros</p>
                </div>
            `;
            return;
        }

        const tableEl = document.createElement('table');
        tableEl.className = 'w-full text-left border-collapse text-sm text-gray-300';
        
        // Render Headers
        const headerCells = headers.map(h => `<th class="p-4 border-b border-gray-800 text-gray-400 font-semibold tracking-wide">${h}</th>`).join('');
        tableEl.innerHTML = `<thead><tr class="bg-gray-900/50">${headerCells}</tr></thead><tbody class="divide-y divide-gray-800"></tbody>`;

        const tbody = tableEl.querySelector('tbody');
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-800/30 transition-colors duration-150';
            tr.innerHTML = rowRenderer(item);
            tbody.appendChild(tr);
        });

        container.innerHTML = '';
        container.appendChild(tableEl);
    }
};
