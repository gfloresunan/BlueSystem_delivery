// Utilidad para control de paginación de datos
class Pagination {
    constructor(containerId, itemsPerPage, onPageChange) {
        this.containerId = containerId;
        this.itemsPerPage = itemsPerPage;
        this.onPageChange = onPageChange;
        this.currentPage = 1;
        this.totalItems = 0;
    }

    setTotalItems(total) {
        this.totalItems = total;
        this.render();
    }

    getCurrentPageData(allItems) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return allItems.slice(start, end);
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 1;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.className = 'flex items-center justify-between px-4 py-3 border-t border-gray-800 text-gray-400';
        container.innerHTML = `
            <div class="text-xs">
                Mostrando <span class="font-semibold text-gray-200">${((this.currentPage - 1) * this.itemsPerPage) + 1}</span> a 
                <span class="font-semibold text-gray-200">${Math.min(this.currentPage * this.itemsPerPage, this.totalItems)}</span> de 
                <span class="font-semibold text-gray-200">${this.totalItems}</span> registros
            </div>
            <div class="flex items-center gap-1">
                <button id="btn-prev" class="px-3 py-1 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded text-xs transition duration-200 disabled:opacity-50" ${this.currentPage === 1 ? 'disabled' : ''}>Anterior</button>
                <span class="text-xs px-2">Pág. ${this.currentPage} de ${totalPages}</span>
                <button id="btn-next" class="px-3 py-1 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded text-xs transition duration-200 disabled:opacity-50" ${this.currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
            </div>
        `;

        const prevBtn = container.querySelector('#btn-prev');
        const nextBtn = container.querySelector('#btn-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.onPageChange(this.currentPage);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.onPageChange(this.currentPage);
                }
            });
        }
    }
}
