// ═══════════════════════════════════════════════════════════════════════════════
// BLUE SYSTEM DELIVERY ENTERPRISE — APP UPDATE CENTER
// Module: appUpdateCenter.js
// Baseline: v2.3 Enterprise
// Single Source of Truth: /system_config/global (field: appUpdate)
// ═══════════════════════════════════════════════════════════════════════════════

const appUpdateCenterModule = {
    currentConfig: null,
    unsubscribeSnapshot: null,
    previewPlatform: 'ANDROID', // 'ANDROID' | 'IOS'
    selectedImageFile: null,
    selectedIconFile: null,
    isUploadingImage: false,
    isUploadingIcon: false,

    // SemVer parsing and comparison utility in JavaScript
    parseSemVer: (versionStr) => {
        if (!versionStr || typeof versionStr !== 'string') return [0, 0, 0];
        const cleaned = versionStr.trim().replace(/^[vV]/, '').split('-')[0];
        const parts = cleaned.split('.').map(p => {
            const num = parseInt(p, 10);
            return isNaN(num) ? 0 : num;
        });
        while (parts.length < 3) parts.push(0);
        return parts;
    },

    compareSemVer: (v1, v2) => {
        const p1 = appUpdateCenterModule.parseSemVer(v1);
        const p2 = appUpdateCenterModule.parseSemVer(v2);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    },

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto select-none">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-2xl p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">🚀</span>
                            <div>
                                <h2 class="text-xl font-black text-slate-100">App Update Center Enterprise</h2>
                                <p class="text-xs text-slate-400 mt-0.5">Control de versiones remotas, actualizaciones forzadas y modal dinámico multiplataforma.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="auc-status-badge" class="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                            Cargando...
                        </span>
                        <button onclick="appUpdateCenterModule.saveConfig()" id="btn-save-app-update" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition duration-150 flex items-center gap-2">
                            <span>💾</span> Guardar Configuración
                        </button>
                    </div>
                </div>

                <!-- Main 2-Column Grid: Form (Left) + Real-Time Preview (Right) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <!-- Formulario de Configuración (Col 7) -->
                    <div class="lg:col-span-7 space-y-5">
                        
                        <!-- Panel: Estado & Comportamiento -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>⚙️</span> Estado & Comportamiento Operativo
                            </h3>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <!-- Activar Actualización -->
                                <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                                    <div>
                                        <label for="auc-enabled" class="text-xs font-bold text-slate-200 cursor-pointer">Activar Aviso Remoto</label>
                                        <p class="text-[10px] text-slate-400">Habilita el chequeo de versión en los clientes.</p>
                                    </div>
                                    <input type="checkbox" id="auc-enabled" onchange="appUpdateCenterModule.updateLivePreview()" class="w-5 h-5 accent-indigo-600 rounded cursor-pointer">
                                </div>

                                <!-- Mostrar Logo -->
                                <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                                    <div>
                                        <label for="auc-showLogo" class="text-xs font-bold text-slate-200 cursor-pointer">Mostrar Branding / Logo</label>
                                        <p class="text-[10px] text-slate-400">Encabezado visual con isotipo corporativo.</p>
                                    </div>
                                    <input type="checkbox" id="auc-showLogo" checked onchange="appUpdateCenterModule.updateLivePreview()" class="w-5 h-5 accent-indigo-600 rounded cursor-pointer">
                                </div>
                            </div>

                            <!-- Tipo de Actualización -->
                            <div class="space-y-1.5 pt-1">
                                <label class="text-xs font-semibold text-slate-300">Tipo de Comportamiento:</label>
                                <div class="grid grid-cols-3 gap-2">
                                    <label class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 cursor-pointer hover:border-slate-700">
                                        <input type="radio" name="auc-updateType" value="INFO" onchange="appUpdateCenterModule.onTypeChange('INFO')" class="accent-indigo-600">
                                        <div>
                                            <span class="text-xs font-bold text-slate-300 block">Informativo</span>
                                            <span class="text-[9px] text-slate-500">Aviso simple</span>
                                        </div>
                                    </label>
                                    <label class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 cursor-pointer hover:border-slate-700">
                                        <input type="radio" name="auc-updateType" value="RECOMMENDED" checked onchange="appUpdateCenterModule.onTypeChange('RECOMMENDED')" class="accent-indigo-600">
                                        <div>
                                            <span class="text-xs font-bold text-emerald-400 block">Recomendado</span>
                                            <span class="text-[9px] text-slate-500">Permite "Más tarde"</span>
                                        </div>
                                    </label>
                                    <label class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 cursor-pointer hover:border-slate-700">
                                        <input type="radio" name="auc-updateType" value="FORCED" onchange="appUpdateCenterModule.onTypeChange('FORCED')" class="accent-indigo-600">
                                        <div>
                                            <span class="text-xs font-bold text-rose-400 block">Obligatorio</span>
                                            <span class="text-[9px] text-slate-500">Bloquea la app</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Plataformas Objetivo -->
                            <div class="space-y-1.5 pt-1">
                                <label class="text-xs font-semibold text-slate-300">Plataformas Objetivo:</label>
                                <div class="grid grid-cols-2 gap-3">
                                    <label class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                                        <span class="text-xs font-bold text-slate-200 flex items-center gap-2">🤖 Android</span>
                                        <input type="checkbox" id="auc-target-android" checked onchange="appUpdateCenterModule.updateLivePreview()" class="w-4 h-4 accent-indigo-600">
                                    </label>
                                    <label class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                                        <span class="text-xs font-bold text-slate-200 flex items-center gap-2">🍎 iOS</span>
                                        <input type="checkbox" id="auc-target-ios" checked onchange="appUpdateCenterModule.updateLivePreview()" class="w-4 h-4 accent-indigo-600">
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Panel: Control de Versiones Semánticas -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>🏷️</span> Versiones Semánticas (SemVer)
                            </h3>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Última Versión Publicada (Latest) *</label>
                                    <input type="text" id="auc-latestVersion" value="1.26.0" placeholder="1.26.0" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-indigo-300 font-mono font-bold focus:border-indigo-500 outline-none">
                                    <span class="text-[10px] text-slate-500">Versión más reciente en las tiendas.</span>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Versión Mínima Soportada (Minimum) *</label>
                                    <input type="text" id="auc-minimumVersion" value="1.25.0" placeholder="1.25.0" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-rose-300 font-mono font-bold focus:border-indigo-500 outline-none">
                                    <span class="text-[10px] text-slate-500">Versiones inferiores serán forzadas a actualizar.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Panel: Contenido Editorial y Textos -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>✍️</span> Contenido Editorial & Botones
                            </h3>

                            <div class="space-y-3">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Título del Modal *</label>
                                    <input type="text" id="auc-title" value="Actualiza BlueSystem Delivery" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:border-indigo-500 outline-none">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Subtítulo Descriptivo</label>
                                    <input type="text" id="auc-subtitle" value="Tenemos una nueva versión para ti" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:border-indigo-500 outline-none">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Mensaje Detallado *</label>
                                    <textarea id="auc-message" rows="3" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none resize-none">Hemos preparado mejoras de rendimiento, optimizaciones de seguridad y nuevas funcionalidades de entrega en tiempo real. Actualiza para disfrutar de la mejor experiencia.</textarea>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-xs font-semibold text-slate-400">Texto Botón Primario *</label>
                                        <input type="text" id="auc-primaryButtonText" value="Actualizar ahora" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:border-indigo-500 outline-none">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs font-semibold text-slate-400">Texto Botón Secundario</label>
                                        <input type="text" id="auc-secondaryButtonText" value="Más tarde" oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none">
                                    </div>
                                </div>

                                <!-- Paleta de Colores Dinámica -->
                                <div class="grid grid-cols-3 gap-3 pt-2">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-slate-400">Color Botón Primario</label>
                                        <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                                            <input type="color" id="auc-primaryButtonColor" value="#2563EB" oninput="appUpdateCenterModule.updateLivePreview()" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0">
                                            <input type="text" id="auc-primaryButtonColor-text" value="#2563EB" oninput="document.getElementById('auc-primaryButtonColor').value=this.value; appUpdateCenterModule.updateLivePreview()" class="bg-transparent text-[11px] font-mono text-slate-300 w-full outline-none">
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-slate-400">Color de Fondo</label>
                                        <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                                            <input type="color" id="auc-backgroundColor" value="#0F172A" oninput="appUpdateCenterModule.updateLivePreview()" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0">
                                            <input type="text" id="auc-backgroundColor-text" value="#0F172A" oninput="document.getElementById('auc-backgroundColor').value=this.value; appUpdateCenterModule.updateLivePreview()" class="bg-transparent text-[11px] font-mono text-slate-300 w-full outline-none">
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-slate-400">Color de Texto</label>
                                        <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                                            <input type="color" id="auc-textColor" value="#FFFFFF" oninput="appUpdateCenterModule.updateLivePreview()" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0">
                                            <input type="text" id="auc-textColor-text" value="#FFFFFF" oninput="document.getElementById('auc-textColor').value=this.value; appUpdateCenterModule.updateLivePreview()" class="bg-transparent text-[11px] font-mono text-slate-300 w-full outline-none">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Panel: Assets Multimedia (Imagen & Icono) -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>🖼️</span> Recursos Visuales (Storage Assets)
                            </h3>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <!-- Imagen Principal -->
                                <div class="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                    <label class="text-xs font-semibold text-slate-300">Imagen Principal (Hero):</label>
                                    <input type="text" id="auc-imageUrl" placeholder="https://..." oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono outline-none">
                                    <div class="flex items-center justify-between pt-1">
                                        <label class="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 rounded-lg transition border border-slate-700 flex items-center gap-1.5">
                                            <span>📷</span> Subir Imagen
                                            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onchange="appUpdateCenterModule.handleImageUpload(event)" class="hidden">
                                        </label>
                                        <span id="auc-image-upload-status" class="text-[10px] text-slate-500">Máx 2 MB</span>
                                    </div>
                                </div>

                                <!-- Icono -->
                                <div class="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                    <label class="text-xs font-semibold text-slate-300">Icono Decorativo:</label>
                                    <input type="text" id="auc-iconUrl" placeholder="https://..." oninput="appUpdateCenterModule.updateLivePreview()" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono outline-none">
                                    <div class="flex items-center justify-between pt-1">
                                        <label class="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 rounded-lg transition border border-slate-700 flex items-center gap-1.5">
                                            <span>🖼️</span> Subir Icono
                                            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onchange="appUpdateCenterModule.handleIconUpload(event)" class="hidden">
                                        </label>
                                        <span id="auc-icon-upload-status" class="text-[10px] text-slate-500">Máx 1 MB</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Panel: Enlaces de Tienda (Store Links) -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>🔗</span> Enlaces Hacia Tiendas Oficiales
                            </h3>

                            <div class="space-y-3">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Google Play Store URL / Package *</label>
                                    <input type="text" id="auc-playStoreUrl" value="https://play.google.com/store/apps/details?id=com.aistudio.delivery.djweq" placeholder="https://play.google.com/store/apps/details?id=..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono outline-none">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Apple App Store URL</label>
                                    <input type="text" id="auc-appStoreUrl" value="https://apps.apple.com/app/bluesystem-delivery/id123456789" placeholder="https://apps.apple.com/app/..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono outline-none">
                                </div>
                            </div>
                        </div>

                        <!-- Panel: Programación & Frecuencia -->
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>⏱️</span> Frecuencia & Vigencia de Campaña
                            </h3>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Frecuencia de Muestra:</label>
                                    <select id="auc-displayFrequency" onchange="appUpdateCenterModule.onFrequencyChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none">
                                        <option value="EACH_SESSION" selected>Cada sesión de la app</option>
                                        <option value="ONCE">Una sola vez por versión</option>
                                        <option value="COOLDOWN">Intervalo / Cooldown (Horas)</option>
                                    </select>
                                </div>
                                <div class="space-y-1" id="auc-cooldown-container">
                                    <label class="text-xs font-semibold text-slate-400">Horas de Espera (Cooldown):</label>
                                    <input type="number" id="auc-cooldownHours" value="24" min="1" max="720" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono outline-none">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Fecha / Hora de Inicio (Opcional):</label>
                                    <input type="datetime-local" id="auc-startAt" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-slate-400">Fecha / Hora de Fin (Opcional):</label>
                                    <input type="datetime-local" id="auc-endAt" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none">
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Live Mobile Preview Frame (Col 5) -->
                    <div class="lg:col-span-5 sticky top-6 space-y-4">
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                            <!-- Preview Header -->
                            <div class="flex items-center justify-between pb-4 border-b border-slate-800">
                                <div>
                                    <h4 class="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>👁️</span> Previsualización en Vivo
                                    </h4>
                                    <p class="text-[10px] text-slate-400">Simulación interactiva de UI en tiempo real.</p>
                                </div>
                                <div class="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                                    <button onclick="appUpdateCenterModule.setPreviewPlatform('ANDROID')" id="btn-prev-android" class="px-2.5 py-1 rounded-lg bg-indigo-600 text-white transition">
                                        🤖 Android
                                    </button>
                                    <button onclick="appUpdateCenterModule.setPreviewPlatform('IOS')" id="btn-prev-ios" class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition">
                                        🍎 iOS
                                    </button>
                                </div>
                            </div>

                            <!-- Phone Shell Mockup -->
                            <div class="mt-4 flex justify-center">
                                <div class="w-[310px] h-[580px] bg-slate-950 rounded-[40px] border-[6px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col select-none">
                                    
                                    <!-- Device Notch / Dynamic Island -->
                                    <div class="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center">
                                        <div class="w-2.5 h-2.5 bg-black rounded-full mr-2"></div>
                                        <div class="w-1.5 h-1.5 bg-indigo-950 rounded-full"></div>
                                    </div>

                                    <!-- Mock Blurred App Screen Underneath -->
                                    <div class="flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 opacity-30 flex flex-col justify-between pointer-events-none">
                                        <div class="pt-6 space-y-2">
                                            <div class="h-3 bg-slate-700 rounded w-2/3"></div>
                                            <div class="h-16 bg-slate-800 rounded-xl"></div>
                                            <div class="h-16 bg-slate-800 rounded-xl"></div>
                                        </div>
                                        <div class="h-12 bg-slate-800 rounded-xl"></div>
                                    </div>

                                    <!-- Modal Overlay Container -->
                                    <div class="absolute inset-0 bg-black/75 backdrop-blur-sm z-20 flex items-center justify-center p-3.5">
                                        
                                        <!-- Modal Card Content -->
                                        <div id="prev-modal-card" class="w-full bg-slate-900 border border-slate-700/60 rounded-3xl p-4 shadow-2xl space-y-3.5 text-center relative max-h-[92%] overflow-y-auto">
                                            
                                            <!-- Brand Logo / Header -->
                                            <div id="prev-logo-container" class="flex justify-center items-center gap-1.5 pt-1">
                                                <span class="text-xs font-black text-indigo-400 tracking-wider">BLUESYSTEM</span>
                                                <span class="text-[9px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 font-bold rounded">DELIVERY</span>
                                            </div>

                                            <!-- Illustration / Icon Container -->
                                            <div class="flex justify-center">
                                                <div id="prev-image-box" class="w-full h-32 rounded-2xl bg-slate-800/80 border border-slate-700/40 flex items-center justify-center overflow-hidden relative">
                                                    <!-- Injected image or fallback icon -->
                                                    <span class="text-4xl">🚀</span>
                                                </div>
                                            </div>

                                            <!-- Badge / Pill -->
                                            <div class="flex justify-center">
                                                <span id="prev-version-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                                    v1.26.0
                                                </span>
                                            </div>

                                            <!-- Title & Subtitle -->
                                            <div class="space-y-1">
                                                <h5 id="prev-title" class="text-sm font-black text-white leading-tight">
                                                    Actualiza BlueSystem Delivery
                                                </h5>
                                                <p id="prev-subtitle" class="text-[11px] font-semibold text-slate-300">
                                                    Tenemos una nueva versión para ti
                                                </p>
                                            </div>

                                            <!-- Message Body -->
                                            <p id="prev-message" class="text-[10px] text-slate-400 leading-relaxed max-h-24 overflow-y-auto px-1">
                                                Hemos preparado mejoras de rendimiento, optimizaciones de seguridad y nuevas funcionalidades de entrega en tiempo real.
                                            </p>

                                            <!-- Action Buttons -->
                                            <div class="space-y-2 pt-1">
                                                <button id="prev-primary-btn" class="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white shadow-lg transition duration-150 flex items-center justify-center gap-1.5 bg-blue-600">
                                                    <span id="prev-primary-btn-text">Actualizar ahora</span>
                                                    <span>➔</span>
                                                </button>
                                                <button id="prev-secondary-btn" class="w-full py-1.5 px-3 rounded-xl font-semibold text-[11px] text-slate-400 hover:text-white transition">
                                                    Más tarde
                                                </button>
                                            </div>

                                        </div>

                                    </div>

                                    <!-- Home Indicator Bar -->
                                    <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-600 rounded-full z-30"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        appUpdateCenterModule.loadConfig();
    },

    loadConfig: () => {
        if (appUpdateCenterModule.unsubscribeSnapshot) {
            appUpdateCenterModule.unsubscribeSnapshot();
        }

        appUpdateCenterModule.unsubscribeSnapshot = db.collection('system_config').doc('global').onSnapshot(doc => {
            const statusBadge = document.getElementById('auc-status-badge');
            if (!doc.exists) {
                if (statusBadge) {
                    statusBadge.textContent = 'NO CREADO';
                    statusBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-950 text-amber-400 border border-amber-800';
                }
                return;
            }

            const data = doc.data() || {};
            const updateConfig = data.appUpdate || {};
            appUpdateCenterModule.currentConfig = updateConfig;

            // Populate Form fields safely
            const enabled = updateConfig.enabled === true;
            if (document.getElementById('auc-enabled')) {
                document.getElementById('auc-enabled').checked = enabled;
            }

            if (statusBadge) {
                if (enabled) {
                    statusBadge.textContent = '🟢 ACTIVO EN PRODUCCIÓN';
                    statusBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800';
                } else {
                    statusBadge.textContent = '⚪ INACTIVO';
                    statusBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700';
                }
            }

            // Target Platforms
            const targets = updateConfig.targetPlatforms || ['ANDROID', 'IOS'];
            if (document.getElementById('auc-target-android')) {
                document.getElementById('auc-target-android').checked = targets.includes('ANDROID') || targets.includes('ALL');
            }
            if (document.getElementById('auc-target-ios')) {
                document.getElementById('auc-target-ios').checked = targets.includes('IOS') || targets.includes('ALL');
            }

            // Update Type
            const type = updateConfig.updateType || (updateConfig.forceUpdate ? 'FORCED' : 'RECOMMENDED');
            const radios = document.getElementsByName('auc-updateType');
            radios.forEach(r => {
                r.checked = r.value === type;
            });

            // Versions
            if (document.getElementById('auc-latestVersion')) {
                document.getElementById('auc-latestVersion').value = updateConfig.latestVersion || '1.26.0';
            }
            if (document.getElementById('auc-minimumVersion')) {
                document.getElementById('auc-minimumVersion').value = updateConfig.minimumVersion || (data.minimumVersion ? `${data.minimumVersion}.0.0` : '1.25.0');
            }

            // Content
            if (document.getElementById('auc-title')) {
                document.getElementById('auc-title').value = updateConfig.title || 'Actualiza BlueSystem Delivery';
            }
            if (document.getElementById('auc-subtitle')) {
                document.getElementById('auc-subtitle').value = updateConfig.subtitle || 'Tenemos una nueva versión para ti';
            }
            if (document.getElementById('auc-message')) {
                document.getElementById('auc-message').value = updateConfig.message || 'Hemos preparado mejoras de rendimiento y seguridad.';
            }
            if (document.getElementById('auc-showLogo')) {
                document.getElementById('auc-showLogo').checked = updateConfig.showLogo !== false;
            }

            // Buttons & Colors
            if (document.getElementById('auc-primaryButtonText')) {
                document.getElementById('auc-primaryButtonText').value = updateConfig.primaryButtonText || 'Actualizar ahora';
            }
            if (document.getElementById('auc-secondaryButtonText')) {
                document.getElementById('auc-secondaryButtonText').value = updateConfig.secondaryButtonText || 'Más tarde';
            }
            if (document.getElementById('auc-primaryButtonColor')) {
                const color = updateConfig.primaryButtonColor || '#2563EB';
                document.getElementById('auc-primaryButtonColor').value = color;
                document.getElementById('auc-primaryButtonColor-text').value = color;
            }
            if (document.getElementById('auc-backgroundColor')) {
                const bgColor = updateConfig.backgroundColor || '#0F172A';
                document.getElementById('auc-backgroundColor').value = bgColor;
                document.getElementById('auc-backgroundColor-text').value = bgColor;
            }
            if (document.getElementById('auc-textColor')) {
                const txtColor = updateConfig.textColor || '#FFFFFF';
                document.getElementById('auc-textColor').value = txtColor;
                document.getElementById('auc-textColor-text').value = txtColor;
            }

            // Assets
            if (document.getElementById('auc-imageUrl')) {
                document.getElementById('auc-imageUrl').value = updateConfig.imageUrl || '';
            }
            if (document.getElementById('auc-iconUrl')) {
                document.getElementById('auc-iconUrl').value = updateConfig.iconUrl || '';
            }

            // URLs
            if (document.getElementById('auc-playStoreUrl')) {
                document.getElementById('auc-playStoreUrl').value = updateConfig.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.aistudio.delivery.djweq';
            }
            if (document.getElementById('auc-appStoreUrl')) {
                document.getElementById('auc-appStoreUrl').value = updateConfig.appStoreUrl || 'https://apps.apple.com/app/bluesystem-delivery/id123456789';
            }

            // Scheduling & Frequency
            if (document.getElementById('auc-displayFrequency')) {
                document.getElementById('auc-displayFrequency').value = updateConfig.displayFrequency || 'EACH_SESSION';
            }
            if (document.getElementById('auc-cooldownHours')) {
                document.getElementById('auc-cooldownHours').value = updateConfig.cooldownHours || 24;
            }
            if (document.getElementById('auc-startAt') && updateConfig.startAt) {
                document.getElementById('auc-startAt').value = updateConfig.startAt.slice(0, 16);
            }
            if (document.getElementById('auc-endAt') && updateConfig.endAt) {
                document.getElementById('auc-endAt').value = updateConfig.endAt.slice(0, 16);
            }

            appUpdateCenterModule.updateLivePreview();
        }, error => {
            console.error('[AppUpdateCenter] Snapshot listener error:', error);
            toast.show('Error al sincronizar configuración remota: ' + error.message, 'error');
        });
    },

    setPreviewPlatform: (platform) => {
        appUpdateCenterModule.previewPlatform = platform;
        const btnAndroid = document.getElementById('btn-prev-android');
        const btnIos = document.getElementById('btn-prev-ios');
        if (platform === 'ANDROID') {
            btnAndroid.className = 'px-2.5 py-1 rounded-lg bg-indigo-600 text-white transition';
            btnIos.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition';
        } else {
            btnAndroid.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition';
            btnIos.className = 'px-2.5 py-1 rounded-lg bg-indigo-600 text-white transition';
        }
        appUpdateCenterModule.updateLivePreview();
    },

    onTypeChange: (type) => {
        appUpdateCenterModule.updateLivePreview();
    },

    onFrequencyChange: (freq) => {
        const cooldownContainer = document.getElementById('auc-cooldown-container');
        if (cooldownContainer) {
            cooldownContainer.style.display = freq === 'COOLDOWN' ? 'block' : 'none';
        }
    },

    updateLivePreview: () => {
        // Collect current values from DOM
        const title = document.getElementById('auc-title')?.value || 'Actualiza BlueSystem Delivery';
        const subtitle = document.getElementById('auc-subtitle')?.value || '';
        const message = document.getElementById('auc-message')?.value || '';
        const latestVer = document.getElementById('auc-latestVersion')?.value || '1.0.0';
        const primaryText = document.getElementById('auc-primaryButtonText')?.value || 'Actualizar ahora';
        const secondaryText = document.getElementById('auc-secondaryButtonText')?.value || 'Más tarde';
        const primaryColor = document.getElementById('auc-primaryButtonColor')?.value || '#2563EB';
        const bgColor = document.getElementById('auc-backgroundColor')?.value || '#0F172A';
        const textColor = document.getElementById('auc-textColor')?.value || '#FFFFFF';
        const showLogo = document.getElementById('auc-showLogo')?.checked !== false;
        const imageUrl = document.getElementById('auc-imageUrl')?.value?.trim() || '';
        const iconUrl = document.getElementById('auc-iconUrl')?.value?.trim() || '';

        // Selected update type
        let selectedType = 'RECOMMENDED';
        const radios = document.getElementsByName('auc-updateType');
        radios.forEach(r => {
            if (r.checked) selectedType = r.value;
        });

        // DOM Elements
        const prevCard = document.getElementById('prev-modal-card');
        const prevTitle = document.getElementById('prev-title');
        const prevSubtitle = document.getElementById('prev-subtitle');
        const prevMessage = document.getElementById('prev-message');
        const prevBadge = document.getElementById('prev-version-badge');
        const prevPrimaryBtn = document.getElementById('prev-primary-btn');
        const prevPrimaryBtnText = document.getElementById('prev-primary-btn-text');
        const prevSecondaryBtn = document.getElementById('prev-secondary-btn');
        const prevImageBox = document.getElementById('prev-image-box');
        const prevLogoBox = document.getElementById('prev-logo-container');

        if (!prevCard) return;

        // Colors
        prevCard.style.backgroundColor = bgColor;
        prevTitle.style.color = textColor;
        if (prevSubtitle) prevSubtitle.style.color = textColor;

        // Texts
        prevTitle.textContent = title;
        if (prevSubtitle) {
            prevSubtitle.textContent = subtitle;
            prevSubtitle.style.display = subtitle ? 'block' : 'none';
        }
        prevMessage.textContent = message;
        prevBadge.textContent = `v${latestVer}`;
        prevPrimaryBtnText.textContent = primaryText;
        prevPrimaryBtn.style.backgroundColor = primaryColor;

        // Secondary button visibility: HIDE in FORCED mode
        if (prevSecondaryBtn) {
            prevSecondaryBtn.textContent = secondaryText;
            if (selectedType === 'FORCED') {
                prevSecondaryBtn.style.display = 'none';
            } else {
                prevSecondaryBtn.style.display = 'block';
            }
        }

        // Logo visibility
        if (prevLogoBox) {
            prevLogoBox.style.display = showLogo ? 'flex' : 'none';
        }

        // Image / Illustration Box
        if (prevImageBox) {
            if (imageUrl) {
                prevImageBox.innerHTML = `
                    <img src="${imageUrl}" alt="Update Preview" class="w-full h-full object-cover rounded-2xl" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-4xl\\'>🚀</span>';">
                `;
            } else if (iconUrl) {
                prevImageBox.innerHTML = `
                    <img src="${iconUrl}" alt="Icon" class="w-16 h-16 object-contain" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-4xl\\'>🚀</span>';">
                `;
            } else {
                const defaultIcon = selectedType === 'FORCED' ? '🔒' : (selectedType === 'INFO' ? 'ℹ️' : '🚀');
                prevImageBox.innerHTML = `<span class="text-4xl">${defaultIcon}</span>`;
            }
        }
    },

    handleImageUpload: async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('auc-image-upload-status');
        try {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedMimes.includes(file.type)) {
                throw new Error('Formato no permitido. Solo se aceptan imágenes JPEG, PNG y WebP (SVG no permitido por seguridad).');
            }
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('La imagen excede el límite máximo de 2 MB.');
            }
            if (statusEl) statusEl.textContent = 'Subiendo...';
            
            const campaignId = 'camp_' + Date.now();
            const downloadUrl = await storageService.uploadImage(file, `app_update_assets/${campaignId}`);
            
            document.getElementById('auc-imageUrl').value = downloadUrl;
            if (statusEl) statusEl.textContent = '✅ Subida exitosa';
            appUpdateCenterModule.updateLivePreview();
            toast.show('Imagen de actualización cargada a Firebase Storage con éxito.');
        } catch (err) {
            console.error('[AppUpdateCenter] Image upload failed:', err);
            if (statusEl) statusEl.textContent = '❌ Falló subida';
            toast.show('Error al subir imagen: ' + err.message, 'error');
        }
    },

    handleIconUpload: async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('auc-icon-upload-status');
        try {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedMimes.includes(file.type)) {
                throw new Error('Formato no permitido. Solo se aceptan iconos JPEG, PNG y WebP (SVG no permitido por seguridad).');
            }
            if (file.size > 1024 * 1024) {
                throw new Error('El icono excede el límite de 1 MB.');
            }
            if (statusEl) statusEl.textContent = 'Subiendo...';
            
            const campaignId = 'icon_' + Date.now();
            const downloadUrl = await storageService.uploadImage(file, `app_update_assets/${campaignId}`);
            
            document.getElementById('auc-iconUrl').value = downloadUrl;
            if (statusEl) statusEl.textContent = '✅ Subido';
            appUpdateCenterModule.updateLivePreview();
            toast.show('Icono cargado a Firebase Storage con éxito.');
        } catch (err) {
            console.error('[AppUpdateCenter] Icon upload failed:', err);
            if (statusEl) statusEl.textContent = '❌ Falló subida';
            toast.show('Error al subir icono: ' + err.message, 'error');
        }
    },

    saveConfig: async () => {
        const saveBtn = document.getElementById('btn-save-app-update');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>⏳</span> Validando y Guardando...';
        }

        try {
            const enabled = document.getElementById('auc-enabled').checked;
            const latestVer = document.getElementById('auc-latestVersion').value.trim();
            const minVer = document.getElementById('auc-minimumVersion').value.trim();

            let updateType = 'RECOMMENDED';
            const radios = document.getElementsByName('auc-updateType');
            radios.forEach(r => {
                if (r.checked) updateType = r.value;
            });

            // Target Platforms
            const isAndroid = document.getElementById('auc-target-android').checked;
            const isIos = document.getElementById('auc-target-ios').checked;
            const targetPlatforms = [];
            if (isAndroid) targetPlatforms.push('ANDROID');
            if (isIos) targetPlatforms.push('IOS');

            const title = document.getElementById('auc-title').value.trim();
            const subtitle = document.getElementById('auc-subtitle').value.trim();
            const message = document.getElementById('auc-message').value.trim();
            const primaryButtonText = document.getElementById('auc-primaryButtonText').value.trim();
            const secondaryButtonText = document.getElementById('auc-secondaryButtonText').value.trim();
            const primaryButtonColor = document.getElementById('auc-primaryButtonColor').value;
            const backgroundColor = document.getElementById('auc-backgroundColor').value;
            const textColor = document.getElementById('auc-textColor').value;
            const showLogo = document.getElementById('auc-showLogo').checked;

            const imageUrl = document.getElementById('auc-imageUrl').value.trim();
            const iconUrl = document.getElementById('auc-iconUrl').value.trim();
            const playStoreUrl = document.getElementById('auc-playStoreUrl').value.trim();
            const appStoreUrl = document.getElementById('auc-appStoreUrl').value.trim();

            const displayFrequency = document.getElementById('auc-displayFrequency').value;
            const cooldownHours = parseInt(document.getElementById('auc-cooldownHours').value, 10) || 24;
            const startAt = document.getElementById('auc-startAt').value || null;
            const endAt = document.getElementById('auc-endAt').value || null;

            // ─── VALIDACIONES ENTERPRISE ESTRICTAS ────────────────────────────
            if (!latestVer) {
                throw new Error('La versión más reciente (latestVersion) es obligatoria.');
            }
            if (!minVer) {
                throw new Error('La versión mínima soportada (minimumVersion) es obligatoria.');
            }

            const semVerRegex = /^\d+(\.\d+)+(-[a-zA-Z0-9.]+)?$/;
            if (!semVerRegex.test(latestVer)) {
                throw new Error(`La versión latestVersion "${latestVer}" no cumple el formato semántico SemVer (Ejemplo: 1.26.0).`);
            }
            if (!semVerRegex.test(minVer)) {
                throw new Error(`La versión minimumVersion "${minVer}" no cumple el formato semántico SemVer (Ejemplo: 1.25.0).`);
            }

            if (appUpdateCenterModule.compareSemVer(minVer, latestVer) > 0) {
                throw new Error(`Inconsistencia de versiones: minimumVersion (${minVer}) no puede ser mayor que latestVersion (${latestVer}).`);
            }

            if (targetPlatforms.length === 0) {
                throw new Error('Debes seleccionar al menos una plataforma objetivo (Android o iOS).');
            }

            if (!title) {
                throw new Error('El título del modal es obligatorio.');
            }
            if (!message) {
                throw new Error('El mensaje detallado es obligatorio.');
            }

            if (isAndroid && !playStoreUrl) {
                throw new Error('Si Android está seleccionado, debes especificar la URL de Google Play Store.');
            }
            if (isIos && !appStoreUrl) {
                throw new Error('Si iOS está seleccionado, debes especificar la URL de Apple App Store.');
            }

            // Anti-XSS Sanitization & javascript: protocol prevention
            const dangerousProtocols = ['javascript:', 'data:text/html', 'vbscript:'];
            [imageUrl, iconUrl, playStoreUrl, appStoreUrl].forEach(url => {
                if (url) {
                    dangerousProtocols.forEach(p => {
                        if (url.toLowerCase().startsWith(p)) {
                            throw new Error(`URL prohibida por directivas de seguridad anti-XSS (${p}).`);
                        }
                    });
                }
            });

            // Parse legacy integer version code from minimum version for backwards compatibility
            const minParts = appUpdateCenterModule.parseSemVer(minVer);
            const legacyMinCode = (minParts[0] * 10000) + (minParts[1] * 100) + minParts[2];
            const forceUpdateFlag = updateType === 'FORCED';

            const campaignId = appUpdateCenterModule.currentConfig?.campaignId || ('camp_' + latestVer.replace(/\./g, '_') + '_' + Date.now());

            const appUpdatePayload = {
                enabled,
                updateType,
                latestVersion: latestVer,
                minimumVersion: minVer,
                targetPlatforms,
                title,
                subtitle,
                message,
                imageUrl: imageUrl || null,
                iconUrl: iconUrl || null,
                showLogo,
                primaryButtonText: primaryButtonText || 'Actualizar ahora',
                secondaryButtonText: secondaryButtonText || 'Más tarde',
                allowDismiss: updateType !== 'FORCED',
                forceUpdate: forceUpdateFlag,
                playStoreUrl,
                appStoreUrl,
                backgroundColor,
                primaryButtonColor,
                textColor,
                startAt: startAt ? new Date(startAt).toISOString() : null,
                endAt: endAt ? new Date(endAt).toISOString() : null,
                displayFrequency,
                cooldownHours,
                campaignId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser?.email || 'ADMIN',
                schemaVersion: 1
            };

            // Payload para /system_config/global con retrocompatibilidad incondicional
            const globalPayload = {
                appUpdate: appUpdatePayload,
                minimumVersion: legacyMinCode,
                forceUpdate: forceUpdateFlag,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 1. Escritura Atómica en SSOT Firestore Y Proyección Pública Sanitizada (GATE-001)
            const batch = db.batch();
            const globalRef = db.collection('system_config').doc('global');
            const publicProjectionRef = db.collection('system_config').doc('app_update');

            // SSOT global con retrocompatibilidad incondicional
            batch.set(globalRef, globalPayload, { merge: true });
            // Proyección pública sanitizada (cero exposición de parámetros sensibles de global)
            batch.set(publicProjectionRef, appUpdatePayload);

            await batch.commit();

            // 2. Registro Audit Forense
            let auditAction = 'APP_UPDATE_CONFIG_UPDATED';
            if (enabled !== appUpdateCenterModule.currentConfig?.enabled) {
                auditAction = enabled ? 'APP_UPDATE_CONFIG_ENABLED' : 'APP_UPDATE_CONFIG_DISABLED';
            } else if (forceUpdateFlag !== appUpdateCenterModule.currentConfig?.forceUpdate) {
                auditAction = forceUpdateFlag ? 'APP_UPDATE_FORCE_ENABLED' : 'APP_UPDATE_FORCE_DISABLED';
            }

            await db.collection('audit_events').add({
                event: auditAction,
                action: auditAction,
                previousValue: appUpdateCenterModule.currentConfig || null,
                newValue: appUpdatePayload,
                platform: targetPlatforms.join(','),
                campaignId,
                adminUid: firebase.auth().currentUser?.uid || 'UNKNOWN_ADMIN',
                adminEmail: firebase.auth().currentUser?.email || 'ADMIN',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            toast.show('¡Configuración de App Update Center guardada y sincronizada exitosamente!');
        } catch (err) {
            console.error('[AppUpdateCenter] Save Error:', err);
            toast.show(err.message || 'Error al guardar configuración.', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾</span> Guardar Configuración';
            }
        }
    }
};

window.appUpdateCenterModule = appUpdateCenterModule;
