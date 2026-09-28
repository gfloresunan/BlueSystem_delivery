// Utilidad Toast para notificaciones flotantes premium
const toast = {
    show: (message, type = 'success') => {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
            document.body.appendChild(toastContainer);
        }

        const el = document.createElement('div');
        const colorClass = type === 'success' ? 'bg-green-600 border-green-500' : type === 'error' ? 'bg-red-600 border-red-500' : 'bg-blue-600 border-blue-500';
        el.className = `px-5 py-3 text-white font-medium text-sm rounded-lg border shadow-lg transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto flex items-center gap-2 ${colorClass}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        el.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        toastContainer.appendChild(el);

        // Animar entrada
        setTimeout(() => {
            el.classList.remove('translate-y-2', 'opacity-0');
        }, 10);

        // Salida y remover
        setTimeout(() => {
            el.classList.add('opacity-0', 'translate-y-1');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }
};
