// Módulo de Administración: Customer Experience -> Profile Manager (Sprint 15.3 Enterprise)
const profileManagerModule = {
    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Header Banner -->
                <div class="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/30">👤</span>
                            <div>
                                <h2 class="text-2xl font-black text-white">Profile Manager & Customer Experience</h2>
                                <p class="text-xs text-indigo-300">Administra el Banner del Perfil, Frase Dinámica, Secciones, Fidelización y Cupones en tiempo real para la App.</p>
                            </div>
                        </div>
                    </div>
                    <button onclick="profileManagerModule.saveAllConfig()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg transition flex items-center gap-2">
                        <span>💾</span> Guardar Cambios en Firestore
                    </button>
                </div>

                <!-- Main Grid Settings -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <!-- Card 1: Banner Administrable (profile/banner) -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>📢</span> Profile Banner Configurator
                            </h3>
                            <span class="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30 uppercase">profileBanner/config</span>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Título del Banner</label>
                                <input type="text" id="bannerTitle" value="Programa de Fidelidad Enterprise" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Subtítulo / Descripción</label>
                                <input type="text" id="bannerSubtitle" value="¡Gana puntos dobles en todos tus pedidos este mes!" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">URL de la Imagen / Banner</label>
                                <input type="text" id="bannerImageUrl" value="/assets/banner-placeholder.svg" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Acción</label>
                                    <select id="bannerActionType" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                                        <option value="loyalty">Programa de Fidelidad</option>
                                        <option value="coupon">Aplicar Cupón</option>
                                        <option value="category">Categoría</option>
                                        <option value="business">Comercio Especifico</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">ID de Acción / Enlace</label>
                                    <input type="text" id="bannerActionId" placeholder="Ej: GERALD20 o demo_tiptop" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3 pt-2">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="bannerActive" checked class="w-4 h-4 accent-indigo-500 rounded">
                                    <span class="text-xs text-slate-300 font-semibold">Banner Activo</span>
                                </label>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-slate-400">Prioridad:</span>
                                    <input type="number" id="bannerPriority" value="1" min="1" max="10" class="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 text-center">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card 2: Frase Dinámica y Secciones del Perfil -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>💬</span> Frase Dinámica & Secciones
                            </h3>
                            <span class="text-[10px] bg-indigo-500/20 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-500/30 uppercase">profileSections/config</span>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Frase del Encabezado Dinámico</label>
                                <input type="text" id="dynamicHeaderPhrase" value="¡Gracias por confiar en BlueSystem! 🚀" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                            </div>

                            <div class="space-y-2 pt-2">
                                <label class="block text-xs font-semibold text-slate-400">Visibilidad de Módulos en App Cliente</label>
                                
                                <div class="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secBanner" checked class="accent-indigo-500"> Banner Promocional</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secStats" checked class="accent-indigo-500"> Tarjetas Resumen</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secLoyalty" checked class="accent-indigo-500"> Programa Fidelidad</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secCoupons" checked class="accent-indigo-500"> Cupones</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secFavorites" checked class="accent-indigo-500"> Favoritos</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secWallet" checked class="accent-indigo-500"> Cartera / Wallet</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secTimeline" checked class="accent-indigo-500"> Línea de Tiempo</label>
                                    <label class="flex items-center gap-2"><input type="checkbox" id="secBenefits" checked class="accent-indigo-500"> Beneficios & C360</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card 3: Programa de Fidelización & Beneficios VIP -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>⭐</span> Fidelización & Niveles VIP
                            </h3>
                            <span class="text-[10px] bg-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded border border-amber-500/30 uppercase">loyalty/rules</span>
                        </div>

                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-3 text-xs">
                                <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                    <span class="font-bold text-amber-400">Nivel Bronce:</span> 0 - 499 pts
                                    <p class="text-[10px] text-slate-500">1% Cashback</p>
                                </div>
                                <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                    <span class="font-bold text-slate-300">Nivel Plata:</span> 500 - 999 pts
                                    <p class="text-[10px] text-slate-500">3% Cashback</p>
                                </div>
                                <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                    <span class="font-bold text-amber-500">Nivel Oro:</span> 1,000 - 1,999 pts
                                    <p class="text-[10px] text-slate-500">5% Cashback + Envío Gratis</p>
                                </div>
                                <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                    <span class="font-bold text-cyan-400">Nivel Platino / Diamante:</span> 2,000+ pts
                                    <p class="text-[10px] text-slate-500">8% Cashback + Soporte VIP</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card 4: Gestión de Cupones Globals -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>🎟️</span> Crear Nuevo Cupón
                            </h3>
                            <span class="text-[10px] bg-rose-500/20 text-rose-400 font-mono px-2 py-0.5 rounded border border-rose-500/30 uppercase">coupons/new</span>
                        </div>

                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">Código del Cupón</label>
                                    <input type="text" id="couponCode" placeholder="EJ: FIESTA30" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 uppercase outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-400 mb-1">% Descuento</label>
                                    <input type="number" id="couponPercent" placeholder="Ej: 20" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none">
                                </div>
                            </div>
                            <button onclick="profileManagerModule.createCoupon()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition">
                                + Publicar Cupón en App
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        `;

        profileManagerModule.loadFromFirestore();
    },

    loadFromFirestore: () => {
        db.collection('profileBanner').doc('config').get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (document.getElementById('bannerTitle')) document.getElementById('bannerTitle').value = data.title || '';
                if (document.getElementById('bannerSubtitle')) document.getElementById('bannerSubtitle').value = data.subtitle || '';
                if (document.getElementById('bannerImageUrl')) document.getElementById('bannerImageUrl').value = data.imageUrl || '';
                if (document.getElementById('bannerActionType')) document.getElementById('bannerActionType').value = data.actionType || 'loyalty';
                if (document.getElementById('bannerActionId')) document.getElementById('bannerActionId').value = data.actionId || '';
                if (document.getElementById('bannerActive')) document.getElementById('bannerActive').checked = data.active !== false;
                if (document.getElementById('bannerPriority')) document.getElementById('bannerPriority').value = data.priority || 1;
            }
        });

        db.collection('profileSections').doc('config').get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (document.getElementById('dynamicHeaderPhrase')) {
                    document.getElementById('dynamicHeaderPhrase').value = data.dynamicHeaderPhrase || '¡Gracias por confiar en BlueSystem! 🚀';
                }
            }
        });
    },

    saveAllConfig: () => {
        const bannerTitle = document.getElementById('bannerTitle').value;
        const bannerSubtitle = document.getElementById('bannerSubtitle').value;
        const bannerImageUrl = document.getElementById('bannerImageUrl').value;
        const bannerActionType = document.getElementById('bannerActionType').value;
        const bannerActionId = document.getElementById('bannerActionId').value;
        const bannerActive = document.getElementById('bannerActive').checked;
        const bannerPriority = parseInt(document.getElementById('bannerPriority').value) || 1;

        const dynamicHeaderPhrase = document.getElementById('dynamicHeaderPhrase').value;

        const p1 = db.collection('profileBanner').doc('config').set({
            title: bannerTitle,
            subtitle: bannerSubtitle,
            imageUrl: bannerImageUrl,
            actionType: bannerActionType,
            actionId: bannerActionId,
            active: bannerActive,
            priority: bannerPriority,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const p2 = db.collection('profileSections').doc('config').set({
            dynamicHeaderPhrase: dynamicHeaderPhrase,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        Promise.all([p1, p2]).then(() => {
            alert('¡Configuración guardada en Firestore exitosamente! Los cambios se verán reflejados en tiempo real en la App Android.');
        }).catch(err => {
            console.error('Error guardando configuración:', err);
            alert('Error al guardar configuración: ' + err.message);
        });
    },

    createCoupon: () => {
        const code = (document.getElementById('couponCode').value || '').trim().toUpperCase();
        const percent = parseFloat(document.getElementById('couponPercent').value) || 0;

        if (!code) {
            alert('Ingresa un código de cupón válido.');
            return;
        }

        db.collection('coupons').doc(code).set({
            code: code,
            title: percent + '% OFF en Tu Compra',
            discountPercent: percent,
            status: 'activo',
            category: 'Promocionales',
            expiryDate: '31/12/2026',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert('¡Cupón ' + code + ' creado con éxito!');
            document.getElementById('couponCode').value = '';
            document.getElementById('couponPercent').value = '';
        });
    }
};

window.profileManagerModule = profileManagerModule;
