// Enterprise Drawer Utility — BlueSystem Governance Center v2.2
// Proporciona paneles laterales deslizantes (Slide-over Drawers) para formularios CRUD y vistas de inspección.

const drawer = {
    open: (drawerId, title, contentHtml, onOpenCallback = null) => {
        let drawerEl = document.getElementById(drawerId);
        if (!drawerEl) {
            drawerEl = document.createElement('div');
            drawerEl.id = drawerId;
            drawerEl.className = 'fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm hidden transition-all duration-300 select-none';
            document.body.appendChild(drawerEl);
        }

        drawerEl.innerHTML = `
            <div class="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full shadow-2xl flex flex-col transform translate-x-full transition-transform duration-300 font-sans text-slate-100">
                <!-- Drawer Header -->
                <div class="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-3">
                        <span class="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-lg">🛡️</span>
                        <div>
                            <h3 class="text-base font-extrabold text-white tracking-tight">${title}</h3>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise Administrative Console</p>
                        </div>
                    </div>
                    <button onclick="drawer.close('${drawerId}')" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition">
                        ✕
                    </button>
                </div>

                <!-- Drawer Content Scrollable Area -->
                <div class="p-6 flex-1 overflow-y-auto space-y-4 font-sans text-xs" id="${drawerId}-content">
                    ${contentHtml}
                </div>
            </div>
        `;

        drawerEl.classList.remove('hidden');
        setTimeout(() => {
            const panel = drawerEl.querySelector('.bg-slate-900');
            if (panel) panel.classList.remove('translate-x-full');
        }, 10);

        if (onOpenCallback) onOpenCallback(drawerEl);
    },

    close: (drawerId) => {
        const drawerEl = document.getElementById(drawerId);
        if (drawerEl) {
            const panel = drawerEl.querySelector('.bg-slate-900');
            if (panel) panel.classList.add('translate-x-full');
            setTimeout(() => {
                drawerEl.classList.add('hidden');
            }, 300);
        }
    }
};

window.drawer = drawer;
