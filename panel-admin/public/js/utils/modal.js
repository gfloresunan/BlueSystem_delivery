// Utilidad para control de modales dinámicos
const modal = {
    open: (modalId, contentHtml, onOpenCallback = null) => {
        let modalEl = document.getElementById(modalId);
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = modalId;
            modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm hidden transition-all duration-300';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-gray-100 transform scale-95 opacity-0 transition-all duration-300">
                <button onclick="modal.close('${modalId}')" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
                <div class="modal-body">${contentHtml}</div>
            </div>
        `;

        modalEl.classList.remove('hidden');
        setTimeout(() => {
            const card = modalEl.querySelector('.bg-gray-900');
            card.classList.remove('scale-95', 'opacity-0');
        }, 10);

        if (onOpenCallback) onOpenCallback(modalEl);
    },

    close: (modalId) => {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const card = modalEl.querySelector('.bg-gray-900');
            card.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modalEl.classList.add('hidden');
            }, 300);
        }
    }
};
