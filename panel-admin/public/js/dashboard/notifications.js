// Módulo de Notificaciones y Mensajería Enterprise con Cola, Versionado, Multi-Dispositivo, Destinos Contextuales y Conversiones (Fase 12 / Sprint 18.2)
const notificationsModule = {
    users: [],
    selectedUsers: [],
    businesses: [],
    coupons: [],
    productsCache: {},
    previewMode: 'COLLAPSED', // 'COLLAPSED' | 'EXPANDED'
    _unsubscribeHistory: null,

    render: () => {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-100">📢 Notification Center Enterprise</h2>
                        <p class="text-xs text-gray-400 mt-1">Gestión de campañas, cola de procesamiento (Queue), deep linking contextual, preview Android en vivo y resiliencia multi-dispositivo.</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="notificationsModule.purgeInvalidTokens()" class="px-3 py-2 bg-red-800/80 hover:bg-red-700 text-xs font-bold text-white rounded-lg transition shadow flex items-center gap-1">
                            <span>🧹</span> Purgar Tokens Obsoletos
                        </button>
                        <button onclick="notificationsModule.runDiagnostics()" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition shadow flex items-center gap-1">
                            <span>🔍</span> Diagnóstico & Cola FCM
                        </button>
                    </div>
                </div>

                <!-- KPI Center del Estado del Sistema FCM & Dispositivos -->
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow text-center">
                        <span class="text-[10px] text-gray-500 block uppercase">Dispositivos</span>
                        <span class="text-xl font-bold text-white font-mono" id="stat-total-devices">0</span>
                        <span class="text-[9px] text-gray-400 block">Registrados</span>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow text-center">
                        <span class="text-[10px] text-gray-500 block uppercase">En Cola (Queue)</span>
                        <span class="text-xl font-bold text-yellow-400 font-mono" id="stat-queue-count">0</span>
                        <span class="text-[9px] text-gray-400 block">Pendientes</span>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow text-center">
                        <span class="text-[10px] text-gray-500 block uppercase">Programadas</span>
                        <span class="text-xl font-bold text-blue-400 font-mono" id="stat-scheduled-count">0</span>
                        <span class="text-[9px] text-gray-400 block">Diferidas</span>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow text-center">
                        <span class="text-[10px] text-gray-500 block uppercase">Fallidas</span>
                        <span class="text-xl font-bold text-red-400 font-mono" id="stat-failed-count">0</span>
                        <span class="text-[9px] text-gray-400 block">Requiere Reintento</span>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow text-center">
                        <span class="text-[10px] text-gray-500 block uppercase">Tasa Conversión</span>
                        <span class="text-xl font-bold text-purple-400 font-mono" id="stat-conversion-rate">0.0%</span>
                        <span class="text-[9px] text-gray-400 block">Ventas originadas</span>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow text-center">
                        <span class="text-[10px] text-gray-500 block uppercase">Tokens Válidos</span>
                        <span class="text-xl font-bold text-green-400 font-mono" id="stat-valid-tokens">100%</span>
                        <span class="text-[9px] text-gray-400 block">Salud de red</span>
                    </div>
                </div>

                <!-- Modal / Panel de Diagnóstico FCM -->
                <div id="fcm-diagnostic-panel" class="hidden bg-gray-900 border border-indigo-500/30 rounded-xl p-5 shadow-2xl space-y-4">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                        <h3 class="text-sm font-bold text-indigo-400 flex items-center gap-2">
                            <span>🛡️</span> Informe de Diagnóstico FCM & Resiliencia Multi-Dispositivo
                        </h3>
                        <button onclick="document.getElementById('fcm-diagnostic-panel').classList.add('hidden')" class="text-gray-400 hover:text-white font-bold text-sm">✕</button>
                    </div>
                    <div id="fcm-diagnostic-content" class="text-xs space-y-3">
                        <p class="text-gray-400">Ejecutando diagnóstico del sistema...</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Formulario de envío / Programación de Campaña -->
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
                        <div class="flex justify-between items-center">
                            <h3 class="text-sm font-semibold text-gray-200">🚀 Redactar / Diseñar Campaña v2.2</h3>
                            <span class="text-[10px] text-blue-400 font-mono font-bold uppercase bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800">Contextual Ready</span>
                        </div>
                        
                        <form id="notification-form" onsubmit="notificationsModule.promptSubmitConfirmation(event)" class="space-y-4">
                            <!-- Canales de Entrega -->
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Canales de Entrega Preparados:</label>
                                <div class="flex flex-wrap gap-3 pt-1">
                                    <label class="flex items-center gap-1.5 text-xs text-gray-300">
                                        <input type="checkbox" id="chan-push" checked disabled class="accent-blue-500"> Push (FCM)
                                    </label>
                                    <label class="flex items-center gap-1.5 text-xs text-gray-300">
                                        <input type="checkbox" id="chan-inapp" checked disabled class="accent-blue-500"> In-App Center
                                    </label>
                                    <label class="flex items-center gap-1.5 text-xs text-gray-300">
                                        <input type="checkbox" id="chan-popup" checked class="accent-blue-500"> Popup Dialog
                                    </label>
                                    <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-not-allowed">
                                        <input type="checkbox" disabled class="accent-blue-500"> Email / SMS
                                    </label>
                                </div>
                            </div>

                            <!-- Plantillas -->
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Gestor de Plantillas Rápidas:</label>
                                <select id="notif-template" onchange="notificationsModule.loadTemplate()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 focus:outline-none">
                                    <option value="">-- Personalizado (Escribir abajo) --</option>
                                    <option value="black_friday">🛍️ Black Friday - Ofertas Exclusivas</option>
                                    <option value="promo_30">🎉 30% Descuento Especial</option>
                                    <option value="envio_gratis">🚚 Envío Gratis en BlueSystem</option>
                                    <option value="birthday">🎂 ¡Feliz Cumpleaños!</option>
                                    <option value="mantenimiento">⚠ Aviso de Mantenimiento Programado</option>
                                    <option value="bienvenida">👋 ¡Te damos la Bienvenida!</option>
                                </select>
                            </div>

                            <!-- Categoría & Tipo -->
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs font-semibold text-gray-400">Categoría *</label>
                                    <select id="notif-category" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                        <option value="Pedidos">Pedidos</option>
                                        <option value="Promociones">Promociones</option>
                                        <option value="Pagos">Pagos</option>
                                        <option value="Cuenta">Cuenta</option>
                                        <option value="Sistema" selected>Sistema</option>
                                        <option value="Seguridad">Seguridad</option>
                                        <option value="Novedades">Novedades</option>
                                        <option value="Comercio">Comercio</option>
                                        <option value="Delivery">Delivery</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs font-semibold text-gray-400">Tipo de Evento *</label>
                                    <select id="notif-type" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                        <option value="SYSTEM" selected>SYSTEM</option>
                                        <option value="ORDER">ORDER</option>
                                        <option value="PAYMENT">PAYMENT</option>
                                        <option value="PROMOTION">PROMOTION</option>
                                        <option value="SECURITY">SECURITY</option>
                                        <option value="ACCOUNT">ACCOUNT</option>
                                        <option value="BUSINESS">BUSINESS</option>
                                        <option value="COURIER">COURIER</option>
                                        <option value="SUPERVISOR">SUPERVISOR</option>
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="AUDIT">AUDIT</option>
                                        <option value="MAINTENANCE">MAINTENANCE</option>
                                        <option value="NEWS">NEWS</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Prioridad & Comportamiento -->
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Nivel de Prioridad & Comportamiento *</label>
                                <select id="notif-priority" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                    <option value="LOW">LOW - Silenciosa (Solo Badge en la App)</option>
                                    <option value="NORMAL" selected>NORMAL - Push Normal</option>
                                    <option value="HIGH">HIGH - Push + Badge Destacado</option>
                                    <option value="CRITICAL">CRITICAL - Popup Obligatorio + Modal Persistente</option>
                                </select>
                            </div>

                            <!-- Título -->
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Título del Mensaje *</label>
                                <input type="text" id="notif-title" required oninput="notificationsModule.updatePreview()" placeholder="Ej: ¡Hoy envío gratis!" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                            </div>

                            <!-- Mensaje -->
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Cuerpo del Mensaje *</label>
                                <textarea id="notif-body" required rows="3" oninput="notificationsModule.updatePreview()" placeholder="Redacta el contenido de la campaña..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"></textarea>
                            </div>

                            <!-- Imagen Opcional (Promocional / Admin) con Carga en Storage -->
                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">Imagen / Banner Opcional (BigPictureStyle en Android):</label>
                                <div class="flex gap-2">
                                    <input type="url" id="notif-image" oninput="notificationsModule.updatePreview()" placeholder="https://... o sube una imagen" class="flex-1 bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500">
                                    <label class="px-3 py-2 bg-indigo-700/90 hover:bg-indigo-600 text-xs font-semibold text-white rounded-lg cursor-pointer transition flex items-center gap-1 shadow flex-shrink-0">
                                        <span>📁</span> Subir
                                        <input type="file" id="notif-image-file" accept="image/png,image/jpeg,image/webp" class="hidden" onchange="notificationsModule.handleImageUpload(event)">
                                    </label>
                                </div>
                                <p class="text-[10px] text-gray-500">Formatos: JPG, PNG, WEBP. Máx: 1 MB. En la app se muestra como miniatura (contraída) y banner completo (expandida).</p>
                            </div>

                            <!-- Destino de Navegación Contextual (Deep Linking Canónico) -->
                            <div class="space-y-2 border-t border-gray-800 pt-3">
                                <div class="flex justify-between items-center">
                                    <label class="text-xs font-semibold text-gray-200">Destino de Navegación Contextual *</label>
                                    <span class="text-[10px] text-emerald-400 font-mono">Sin Dead-Ends</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label class="text-[10px] text-gray-400 block mb-1">Tipo de Destino</label>
                                        <select id="notif-destination-type" onchange="notificationsModule.handleDestinationTypeChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                            <option value="CUSTOMER_HOME" selected>🏠 Inicio del Cliente (CUSTOMER_HOME)</option>
                                            <option value="CUSTOMER_MERCHANT">🏪 Comercio / Restaurante (CUSTOMER_MERCHANT)</option>
                                            <option value="CUSTOMER_PRODUCT">🍔 Producto de Comercio (CUSTOMER_PRODUCT)</option>
                                            <option value="CUSTOMER_COUPON">🎟️ Cupón de Descuento (CUSTOMER_COUPON)</option>
                                            <option value="CUSTOMER_ORDERS">📦 Historial de Pedidos (CUSTOMER_ORDERS)</option>
                                            <option value="CUSTOMER_SUPPORT_CHAT">💬 Centro de Ayuda / Soporte (CUSTOMER_SUPPORT_CHAT)</option>
                                            <option value="CUSTOM_DEEPLINK">🔗 Deep Link Manual (CUSTOM_DEEPLINK)</option>
                                        </select>
                                    </div>
                                    <div id="destination-secondary-container">
                                        <label class="text-[10px] text-gray-400 block mb-1">Configuración del Destino</label>
                                        <div class="p-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400">
                                            Abre la pantalla principal de la aplicación cliente.
                                        </div>
                                    </div>
                                </div>
                                <!-- Campos canónicos internos ocultos -->
                                <input type="hidden" id="notif-entity-id" value="">
                                <input type="hidden" id="notif-entity-type" value="">
                                <input type="hidden" id="notif-business-id" value="">
                                <input type="hidden" id="notif-product-id" value="">
                                <input type="hidden" id="notif-coupon-id" value="">
                                <input type="hidden" id="notif-destination-route" value="home">
                                <input type="hidden" id="notif-action" value="OPEN_HOME">
                                <div class="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 bg-gray-950/70 p-1.5 rounded border border-gray-800">
                                    <span class="text-gray-400 font-semibold">URI Canónica:</span>
                                    <span id="destination-preview-uri" class="text-blue-400 font-bold truncate">bluesystem://customer/home</span>
                                </div>
                            </div>

                            <!-- Botones Interactivos de Acción -->
                            <div class="space-y-2 border-t border-gray-800 pt-3">
                                <div class="flex justify-between items-center">
                                    <label class="text-xs font-semibold text-gray-300">Botones Interactivos de Acción (Opcional):</label>
                                    <button type="button" onclick="notificationsModule.addButtonField()" class="text-[10px] text-blue-400 hover:text-blue-300 font-bold">+ Agregar Botón</button>
                                </div>
                                <div id="buttons-container" class="space-y-2"></div>
                            </div>

                            <!-- Programación & Expiración -->
                            <div class="grid grid-cols-2 gap-3 border-t border-gray-800 pt-3">
                                <div>
                                    <label class="text-xs font-semibold text-gray-400">Modo de Envío / Programación</label>
                                    <select id="notif-schedule-mode" onchange="notificationsModule.handleScheduleModeChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                        <option value="QUEUE">Enviar vía Cola (QUEUED)</option>
                                        <option value="SCHEDULED">Programar Envío (SCHEDULED)</option>
                                        <option value="DRAFT">Guardar Borrador (DRAFT)</option>
                                    </select>
                                </div>
                                <div id="scheduled-datetime-container" class="hidden">
                                    <label class="text-xs font-semibold text-gray-400">Fecha / Hora Programada *</label>
                                    <input type="datetime-local" id="notif-scheduled-at" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                </div>
                            </div>

                            <div class="space-y-1">
                                <label class="text-xs font-semibold text-gray-400">📅 Fecha de Expiración (Opcional - TTL en Notification Center):</label>
                                <input type="datetime-local" id="notif-expires-at"
                                       class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200"
                                       style="color-scheme: dark;">
                                <p class="text-[10px] text-gray-500">Al vencer, la notificación desaparece automáticamente de la bandeja del usuario.</p>
                            </div>

                            <!-- Segmentación Avanzada -->
                            <div class="space-y-1 border-t border-gray-800 pt-3">
                                <label class="text-xs font-semibold text-gray-400">Segmentación de Destinatarios:</label>
                                <select id="notif-target-type" onchange="notificationsModule.handleTargetTypeChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                                    <option value="all">Todos los Usuarios Registrados</option>
                                    <option value="customer" selected>Segmento: Clientes</option>
                                    <option value="business">Segmento: Comercios</option>
                                    <option value="courier">Segmento: Motorizados</option>
                                    <option value="operator">Segmento: Operadores Logísticos</option>
                                    <option value="supervisor">Segmento: Supervisores Operativos</option>
                                    <option value="admin">Segmento: Administradores</option>
                                    <option value="active_30_days">Usuarios Activos (Últimos 30 días)</option>
                                    <option value="no_orders">Clientes Sin Pedidos Realizados</option>
                                    <option value="frequent_orders">Clientes Frecuentes (+20 Pedidos)</option>
                                    <option value="active_couriers">Repartidores En Ruta Activos</option>
                                    <option value="inactive_couriers">Repartidores Inactivos</option>
                                    <option value="specific">Selección Manual por Email</option>
                                </select>
                            </div>

                            <!-- Selección manual -->
                            <div id="specific-users-section" class="hidden space-y-2 bg-gray-950 p-3 rounded-lg border border-gray-800">
                                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Buscar destinatarios por email:</label>
                                <input type="text" id="user-search-notif" oninput="notificationsModule.searchUsers()" placeholder="Buscar por email..." class="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200">
                                <div class="max-h-32 overflow-y-auto divide-y divide-gray-800 border border-gray-800 rounded mt-1 bg-gray-950" id="users-search-results"></div>
                                <div class="flex flex-wrap gap-1.5 mt-2" id="selected-users-tags">
                                    <span class="text-[10px] text-gray-500">Ningún usuario seleccionado.</span>
                                </div>
                            </div>

                            <!-- Botones del Formulario -->
                            <div class="flex justify-end items-center gap-2 pt-3 border-t border-gray-800">
                                <button type="button" onclick="notificationsModule.promptDryRunTest()" class="px-4 py-2.5 bg-purple-800/80 hover:bg-purple-700 text-xs font-semibold text-white rounded-lg transition shadow flex items-center gap-1.5">
                                    <span>🧪</span> Enviar Prueba 1-a-1
                                </button>
                                <button type="submit" id="send-notif-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition shadow flex items-center gap-1.5">
                                    <span>🚀</span> Procesar / Guardar en Cola (Queue)
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Columna Derecha: Vista Previa Android en Vivo & Historial -->
                    <div class="space-y-6">
                        <!-- Card: Vista Previa Android en Vivo -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-3">
                            <div class="flex justify-between items-center border-b border-gray-800 pb-2.5">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm">📱</span>
                                    <h3 class="text-sm font-bold text-gray-200">Vista Previa Android en Vivo</h3>
                                </div>
                                <!-- Switcher Contraída vs Expandida -->
                                <div class="flex bg-gray-950 p-1 rounded-lg border border-gray-800 gap-1 text-[11px]">
                                    <button type="button" id="preview-btn-collapsed" onclick="notificationsModule.setPreviewMode('COLLAPSED')" class="px-2.5 py-1 rounded font-semibold transition bg-blue-600 text-white shadow">
                                        Contraída
                                    </button>
                                    <button type="button" id="preview-btn-expanded" onclick="notificationsModule.setPreviewMode('EXPANDED')" class="px-2.5 py-1 rounded font-semibold transition text-gray-400 hover:text-white">
                                        Expandida (BigPicture)
                                    </button>
                                </div>
                            </div>

                            <!-- Mockup Android Shade Container -->
                            <div class="bg-gradient-to-b from-gray-950 to-[#0d1117] p-4 rounded-xl border border-gray-800 shadow-inner">
                                <!-- Status bar mockup -->
                                <div class="flex justify-between items-center text-[10px] text-gray-400 font-mono mb-2.5 px-1">
                                    <span>10:45</span>
                                    <div class="flex items-center gap-1.5 text-[10px]">
                                        <span>5G</span>
                                        <span>📶</span>
                                        <span>🔋 95%</span>
                                    </div>
                                </div>

                                <!-- Notification Card (Android 13/14 Style) -->
                                <div class="bg-[#1f242d] border border-gray-700/60 rounded-2xl p-3.5 shadow-2xl text-white space-y-2 transition-all">
                                    <!-- Header: App badge + App Name + Timestamp -->
                                    <div class="flex items-center justify-between text-[11px] text-gray-400">
                                        <div class="flex items-center gap-2">
                                            <div class="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow">
                                                BS
                                            </div>
                                            <span class="font-semibold text-gray-200">BlueSystem Delivery</span>
                                            <span class="text-[9px] text-gray-500">•</span>
                                            <span class="text-[10px] text-gray-400">ahora</span>
                                        </div>
                                        <span class="text-xs text-gray-500">⌄</span>
                                    </div>

                                    <!-- Content Row -->
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="space-y-0.5 flex-1 min-w-0">
                                            <h4 id="preview-mockup-title" class="text-xs font-bold text-gray-100 leading-snug">
                                                ¡Hoy envío gratis!
                                            </h4>
                                            <p id="preview-mockup-body" class="text-[11px] text-gray-300 leading-normal line-clamp-2">
                                                Redacta el contenido de la campaña para visualizar cómo se mostrará en los teléfonos de los clientes.
                                            </p>
                                        </div>
                                        <!-- Thumbnail para modo Contraído -->
                                        <img id="preview-mockup-thumb" src="" alt="thumb" class="w-11 h-11 rounded-lg object-cover border border-gray-700 hidden flex-shrink-0">
                                    </div>

                                    <!-- Banner Grande para modo Expandido (BigPictureStyle) -->
                                    <div id="preview-mockup-big-container" class="hidden pt-1">
                                        <img id="preview-mockup-big-image" src="" alt="banner" class="w-full h-32 object-cover rounded-xl border border-gray-700 shadow-md">
                                    </div>

                                    <!-- Botones de Acción en modo Expandido -->
                                    <div id="preview-mockup-buttons" class="hidden flex gap-2 pt-2 border-t border-gray-700/50"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Historial, Versionado & Analíticas de Conversión -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
                            <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                                <h3 class="text-sm font-semibold text-gray-200">📋 Historial, Versionado & Conversión</h3>
                                <button onclick="notificationsModule.loadHistory()" class="text-xs text-blue-400 hover:text-blue-300">🔄 Actualizar</button>
                            </div>
                            <div class="space-y-3 max-h-[500px] overflow-y-auto divide-y divide-gray-800" id="notifications-history">
                                <p class="text-xs text-gray-500">Cargando historial de campañas...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MODAL: Confirmación de Envío a Gran Escala -->
                <div id="notif-confirm-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
                        <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                            <h3 class="text-base font-bold text-white flex items-center gap-2">
                                <span>🚀</span> Confirmar Despacho de Campaña
                            </h3>
                            <button onclick="notificationsModule.closeConfirmModal()" class="text-gray-400 hover:text-white font-bold text-sm">✕</button>
                        </div>
                        <div id="notif-confirm-content" class="text-xs space-y-3"></div>
                        <div class="flex justify-end gap-2 pt-3 border-t border-gray-800">
                            <button onclick="notificationsModule.closeConfirmModal()" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-lg transition">Cancelar</button>
                            <button id="btn-modal-confirm-submit" onclick="notificationsModule.executeSubmit()" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg transition shadow">Confirmar y Encolar Envío</button>
                        </div>
                    </div>
                </div>

                <!-- MODAL: Smoke Test / Prueba 1-a-1 -->
                <div id="notif-test-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-gray-900 border border-purple-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div class="flex justify-between items-center border-b border-gray-800 pb-3">
                            <h3 class="text-sm font-bold text-purple-300 flex items-center gap-2">
                                <span>🧪</span> Enviar Notificación de Prueba 1-a-1
                            </h3>
                            <button onclick="notificationsModule.closeDryRunModal()" class="text-gray-400 hover:text-white font-bold text-sm">✕</button>
                        </div>
                        <p class="text-xs text-gray-400">
                            Envía esta notificación directamente a tu propio dispositivo o a un usuario específico sin afectar a toda la base de clientes.
                        </p>
                        <form onsubmit="notificationsModule.executeDryRunTest(event)" class="space-y-3">
                            <div>
                                <label class="text-[10px] text-gray-400 font-semibold block mb-1">UID o Email del Destinatario de Prueba *</label>
                                <input type="text" id="test-target-recipient" required placeholder="Ingresa UID o email..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500">
                            </div>
                            <div class="p-2.5 bg-purple-950/30 border border-purple-800/40 rounded-lg text-[11px] text-purple-200">
                                💡 Tip: Puedes usar tu propio email de administrador si está registrado en el sistema.
                            </div>
                            <div class="flex justify-end gap-2 pt-2 border-t border-gray-800">
                                <button type="button" onclick="notificationsModule.closeDryRunModal()" class="px-3 py-1.5 bg-gray-800 text-xs text-gray-300 rounded-lg">Cancelar</button>
                                <button type="submit" id="btn-submit-dry-run" class="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white rounded-lg transition shadow">Despachar Prueba</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        notificationsModule.loadUsers();
        notificationsModule.loadDevicesCount();
        notificationsModule.loadBusinesses();
        notificationsModule.loadCoupons();
        notificationsModule.loadHistory();
        notificationsModule.updatePreview();
    },

    loadDevicesCount: () => {
        db.collection('user_devices').get().then(snap => {
            const countEl = document.getElementById('stat-total-devices');
            if (countEl) countEl.innerText = snap.size;
        }).catch(e => console.error("Error contando dispositivos:", e));
    },

    loadBusinesses: async () => {
        try {
            const snap = await db.collection('businesses').get();
            notificationsModule.businesses = [];
            snap.forEach(doc => {
                const d = doc.data();
                notificationsModule.businesses.push({
                    id: doc.id,
                    name: d.name || d.nombre || d.businessName || doc.id,
                    ...d
                });
            });
            notificationsModule.businesses.sort((a, b) => a.name.localeCompare(b.name));
            notificationsModule.handleDestinationTypeChange();
        } catch (e) {
            console.error("[NOTIFICATIONS_MODULE] Error cargando comercios:", e);
        }
    },

    loadCoupons: async () => {
        try {
            const snap = await db.collection('coupons').get();
            notificationsModule.coupons = [];
            snap.forEach(doc => {
                const d = doc.data();
                notificationsModule.coupons.push({
                    id: doc.id,
                    code: d.code || doc.id,
                    discount: d.discount || 0,
                    ...d
                });
            });
        } catch (e) {
            console.error("[NOTIFICATIONS_MODULE] Error cargando cupones:", e);
        }
    },

    loadProductsForBusiness: async (businessId) => {
        if (!businessId) return [];
        if (notificationsModule.productsCache[businessId]) {
            return notificationsModule.productsCache[businessId];
        }
        try {
            const snap = await db.collection('businesses').doc(businessId).collection('products').get();
            const prods = [];
            snap.forEach(doc => {
                const d = doc.data();
                prods.push({
                    id: doc.id,
                    name: d.name || d.nombre || doc.id,
                    price: d.price || d.precio || 0,
                    ...d
                });
            });
            notificationsModule.productsCache[businessId] = prods;
            return prods;
        } catch (e) {
            console.error("[NOTIFICATIONS_MODULE] Error cargando productos para comercio:", businessId, e);
            return [];
        }
    },

    handleDestinationTypeChange: () => {
        const destType = document.getElementById('notif-destination-type')?.value || 'CUSTOMER_HOME';
        const secContainer = document.getElementById('destination-secondary-container');
        if (!secContainer) return;

        switch (destType) {
            case 'CUSTOMER_HOME':
                secContainer.innerHTML = `
                    <label class="text-[10px] text-gray-400 block mb-1">Configuración del Destino</label>
                    <div class="p-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400">
                        Abre la pantalla principal del cliente.
                    </div>
                `;
                document.getElementById('notif-entity-id').value = '';
                document.getElementById('notif-entity-type').value = '';
                document.getElementById('notif-business-id').value = '';
                document.getElementById('notif-product-id').value = '';
                document.getElementById('notif-coupon-id').value = '';
                document.getElementById('notif-destination-route').value = 'home';
                document.getElementById('notif-action').value = 'OPEN_HOME';
                break;

            case 'CUSTOMER_MERCHANT':
                const bizOptions = notificationsModule.businesses.map(b => 
                    `<option value="${b.id}">${b.name}</option>`
                ).join('');
                secContainer.innerHTML = `
                    <label class="text-[10px] text-gray-400 block mb-1">Seleccionar Comercio / Restaurante *</label>
                    <select id="dest-biz-select" onchange="notificationsModule.onBusinessChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                        <option value="">-- Selecciona un comercio --</option>
                        ${bizOptions}
                    </select>
                `;
                notificationsModule.onBusinessChange();
                break;

            case 'CUSTOMER_PRODUCT':
                const bizOptsForProd = notificationsModule.businesses.map(b => 
                    `<option value="${b.id}">${b.name}</option>`
                ).join('');
                secContainer.innerHTML = `
                    <div class="space-y-1.5">
                        <div>
                            <label class="text-[10px] text-gray-400 block mb-0.5">1. Comercio Propietario *</label>
                            <select id="dest-biz-for-prod-select" onchange="notificationsModule.onBusinessForProductChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-200">
                                <option value="">-- Selecciona comercio --</option>
                                ${bizOptsForProd}
                            </select>
                        </div>
                        <div id="dest-product-selector-container">
                            <label class="text-[10px] text-gray-400 block mb-0.5">2. Producto Específico *</label>
                            <select id="dest-prod-select" disabled class="w-full bg-gray-950 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-500">
                                <option value="">Primero selecciona comercio</option>
                            </select>
                        </div>
                    </div>
                `;
                break;

            case 'CUSTOMER_COUPON':
                const couponOpts = notificationsModule.coupons.map(c => 
                    `<option value="${c.code || c.id}">${c.code || c.id} (${c.discount ? c.discount + '%' : 'Activo'})</option>`
                ).join('');
                secContainer.innerHTML = `
                    <label class="text-[10px] text-gray-400 block mb-1">Seleccionar Cupón *</label>
                    <select id="dest-coupon-select" onchange="notificationsModule.onCouponChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                        <option value="">-- Selecciona cupón --</option>
                        ${couponOpts}
                    </select>
                `;
                notificationsModule.onCouponChange();
                break;

            case 'CUSTOMER_ORDERS':
                secContainer.innerHTML = `
                    <label class="text-[10px] text-gray-400 block mb-1">Configuración del Destino</label>
                    <div class="p-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400">
                        Navega a la pestaña de historial de pedidos.
                    </div>
                `;
                document.getElementById('notif-entity-id').value = '';
                document.getElementById('notif-entity-type').value = 'ORDER';
                document.getElementById('notif-destination-route').value = 'orders';
                document.getElementById('notif-action').value = 'OPEN_ORDERS';
                break;

            case 'CUSTOMER_SUPPORT_CHAT':
                secContainer.innerHTML = `
                    <label class="text-[10px] text-gray-400 block mb-1">Configuración del Destino</label>
                    <div class="p-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400">
                        Navega al centro de ayuda y soporte en vivo.
                    </div>
                `;
                document.getElementById('notif-entity-id').value = '';
                document.getElementById('notif-entity-type').value = 'SUPPORT';
                document.getElementById('notif-destination-route').value = 'customer_help';
                document.getElementById('notif-action').value = 'OPEN_SUPPORT';
                break;

            case 'CUSTOM_DEEPLINK':
                secContainer.innerHTML = `
                    <label class="text-[10px] text-gray-400 block mb-1">Ruta DeepLink Personalizada *</label>
                    <input type="text" id="dest-custom-input" oninput="notificationsModule.onCustomDeeplinkInput()" placeholder="ej: customer/coupons o https://..." class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                `;
                break;
        }

        notificationsModule.recalculateDestinationUri();
    },

    onBusinessChange: () => {
        const bizId = document.getElementById('dest-biz-select')?.value || '';
        document.getElementById('notif-entity-id').value = bizId;
        document.getElementById('notif-entity-type').value = 'BUSINESS';
        document.getElementById('notif-business-id').value = bizId;
        document.getElementById('notif-product-id').value = '';
        document.getElementById('notif-coupon-id').value = '';
        document.getElementById('notif-destination-route').value = bizId ? `comercio_detalle_screen/${bizId}` : 'home';
        document.getElementById('notif-action').value = 'OPEN_MERCHANT';
        notificationsModule.recalculateDestinationUri();
    },

    onBusinessForProductChange: async () => {
        const bizId = document.getElementById('dest-biz-for-prod-select')?.value || '';
        const prodContainer = document.getElementById('dest-product-selector-container');
        if (!bizId) {
            prodContainer.innerHTML = `
                <label class="text-[10px] text-gray-400 block mb-0.5">2. Producto Específico *</label>
                <select id="dest-prod-select" disabled class="w-full bg-gray-950 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-500">
                    <option value="">Primero selecciona comercio</option>
                </select>
            `;
            return;
        }

        prodContainer.innerHTML = `
            <label class="text-[10px] text-gray-400 block mb-0.5">2. Cargando productos...</label>
            <div class="text-xs text-gray-400 animate-pulse">Consultando menú...</div>
        `;

        const prods = await notificationsModule.loadProductsForBusiness(bizId);
        const prodOpts = prods.map(p => `<option value="${p.id}">${p.name} ($${p.price})</option>`).join('');

        prodContainer.innerHTML = `
            <label class="text-[10px] text-gray-400 block mb-0.5">2. Producto Específico *</label>
            <select id="dest-prod-select" onchange="notificationsModule.onProductChange()" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-1.5 text-xs text-gray-200">
                <option value="">-- Selecciona producto --</option>
                ${prodOpts}
            </select>
        `;
        notificationsModule.onProductChange();
    },

    onProductChange: () => {
        const bizId = document.getElementById('dest-biz-for-prod-select')?.value || '';
        const prodId = document.getElementById('dest-prod-select')?.value || '';
        document.getElementById('notif-entity-id').value = prodId;
        document.getElementById('notif-entity-type').value = 'PRODUCT';
        document.getElementById('notif-business-id').value = bizId;
        document.getElementById('notif-product-id').value = prodId;
        document.getElementById('notif-coupon-id').value = '';
        document.getElementById('notif-destination-route').value = (bizId && prodId) ? `comercio_detalle_screen/${bizId}?productId=${prodId}` : 'home';
        document.getElementById('notif-action').value = 'OPEN_PRODUCT';
        notificationsModule.recalculateDestinationUri();
    },

    onCouponChange: () => {
        const couponCode = document.getElementById('dest-coupon-select')?.value || '';
        document.getElementById('notif-entity-id').value = couponCode;
        document.getElementById('notif-entity-type').value = 'COUPON';
        document.getElementById('notif-coupon-id').value = couponCode;
        document.getElementById('notif-business-id').value = '';
        document.getElementById('notif-product-id').value = '';
        document.getElementById('notif-destination-route').value = 'coupons';
        document.getElementById('notif-action').value = 'OPEN_COUPON';
        notificationsModule.recalculateDestinationUri();
    },

    onCustomDeeplinkInput: () => {
        const val = document.getElementById('dest-custom-input')?.value?.trim() || '';
        document.getElementById('notif-destination-route').value = val || 'home';
        document.getElementById('notif-action').value = 'OPEN_DEEPLINK';
        notificationsModule.recalculateDestinationUri();
    },

    recalculateDestinationUri: () => {
        const destType = document.getElementById('notif-destination-type')?.value || 'CUSTOMER_HOME';
        const uriEl = document.getElementById('destination-preview-uri');
        if (!uriEl) return;

        let uri = 'bluesystem://customer/home';
        switch (destType) {
            case 'CUSTOMER_HOME':
                uri = 'bluesystem://customer/home';
                break;
            case 'CUSTOMER_MERCHANT':
                const bId = document.getElementById('dest-biz-select')?.value || '';
                uri = bId ? `bluesystem://customer/merchant/${bId}` : 'bluesystem://customer/home';
                break;
            case 'CUSTOMER_PRODUCT':
                const bizId = document.getElementById('dest-biz-for-prod-select')?.value || '';
                const pId = document.getElementById('dest-prod-select')?.value || '';
                uri = (pId && bizId) ? `bluesystem://customer/product/${pId}?businessId=${bizId}` : 'bluesystem://customer/home';
                break;
            case 'CUSTOMER_COUPON':
                const cCode = document.getElementById('dest-coupon-select')?.value || '';
                uri = cCode ? `bluesystem://customer/coupon/${cCode}` : 'bluesystem://customer/coupons';
                break;
            case 'CUSTOMER_ORDERS':
                uri = 'bluesystem://customer/orders';
                break;
            case 'CUSTOMER_SUPPORT_CHAT':
                uri = 'bluesystem://customer/support';
                break;
            case 'CUSTOM_DEEPLINK':
                const custom = document.getElementById('dest-custom-input')?.value?.trim() || '';
                uri = custom ? (custom.startsWith('bluesystem://') ? custom : `bluesystem://${custom}`) : 'bluesystem://customer/home';
                break;
        }

        uriEl.innerText = uri;
    },

    handleImageUpload: async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamaño (máx 1MB)
        if (file.size > 1024 * 1024) {
            toast.show("El archivo excede el tamaño máximo permitido de 1 MB.", "warning");
            e.target.value = '';
            return;
        }

        // Validar MIME
        const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validMimes.includes(file.type)) {
            toast.show("Formato no admitido. Usa JPG, PNG o WEBP.", "warning");
            e.target.value = '';
            return;
        }

        toast.show("Subiendo imagen a Cloud Storage...", "info");
        try {
            const storageInstance = (typeof storage !== 'undefined' && storage) ? storage : firebase.storage();
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const ref = storageInstance.ref().child(`campaign_images/${Date.now()}_${cleanName}`);
            const snapshot = await ref.put(file, { contentType: file.type });
            const downloadUrl = await snapshot.ref.getDownloadURL();

            const imgInput = document.getElementById('notif-image');
            if (imgInput) {
                imgInput.value = downloadUrl;
            }
            notificationsModule.updatePreview();
            toast.show("Imagen subida con éxito a Storage.", "success");
        } catch (err) {
            console.error("[NOTIFICATIONS_MODULE] Error subiendo imagen:", err);
            toast.show("Error subiendo imagen: " + (err.message || ''), "error");
        } finally {
            e.target.value = '';
        }
    },

    setPreviewMode: (mode) => {
        notificationsModule.previewMode = mode;
        const btnCol = document.getElementById('preview-btn-collapsed');
        const btnExp = document.getElementById('preview-btn-expanded');
        if (mode === 'COLLAPSED') {
            btnCol?.classList.add('bg-blue-600', 'text-white', 'shadow');
            btnCol?.classList.remove('text-gray-400');
            btnExp?.classList.remove('bg-blue-600', 'text-white', 'shadow');
            btnExp?.classList.add('text-gray-400');
        } else {
            btnExp?.classList.add('bg-blue-600', 'text-white', 'shadow');
            btnExp?.classList.remove('text-gray-400');
            btnCol?.classList.remove('bg-blue-600', 'text-white', 'shadow');
            btnCol?.classList.add('text-gray-400');
        }
        notificationsModule.updatePreview();
    },

    updatePreview: () => {
        const title = document.getElementById('notif-title')?.value || '¡Hoy envío gratis!';
        const body = document.getElementById('notif-body')?.value || 'Redacta el contenido de la campaña para visualizar cómo se mostrará en los teléfonos de los clientes.';
        const imageUrl = document.getElementById('notif-image')?.value?.trim() || '';
        const mode = notificationsModule.previewMode || 'COLLAPSED';

        const pTitle = document.getElementById('preview-mockup-title');
        const pBody = document.getElementById('preview-mockup-body');
        const pThumb = document.getElementById('preview-mockup-thumb');
        const pBigContainer = document.getElementById('preview-mockup-big-container');
        const pBigImg = document.getElementById('preview-mockup-big-image');
        const pButtons = document.getElementById('preview-mockup-buttons');

        if (pTitle) pTitle.innerText = title;
        if (pBody) pBody.innerText = body;

        if (mode === 'COLLAPSED') {
            pBigContainer?.classList.add('hidden');
            if (pThumb) {
                if (imageUrl) {
                    pThumb.src = imageUrl;
                    pThumb.classList.remove('hidden');
                } else {
                    pThumb.classList.add('hidden');
                }
            }
            pButtons?.classList.add('hidden');
        } else {
            // EXPANDED
            pThumb?.classList.add('hidden');
            if (imageUrl && pBigImg) {
                pBigImg.src = imageUrl;
                pBigContainer?.classList.remove('hidden');
            } else {
                pBigContainer?.classList.add('hidden');
            }

            // Buttons preview
            if (pButtons) {
                const btnLabels = [];
                document.querySelectorAll('#buttons-container .btn-label').forEach(inp => {
                    if (inp.value.trim()) btnLabels.push(inp.value.trim());
                });
                if (btnLabels.length > 0) {
                    pButtons.classList.remove('hidden');
                    pButtons.innerHTML = btnLabels.map(l => `<span class="px-2.5 py-1 bg-gray-800 text-[10px] font-bold text-blue-400 rounded">${l}</span>`).join('');
                } else {
                    pButtons.classList.add('hidden');
                }
            }
        }
    },

    addButtonField: () => {
        const container = document.getElementById('buttons-container');
        if (!container) return;
        const count = container.children.length;
        if (count >= 3) {
            toast.show('Máximo 3 botones permitidos por notificación.', 'warning');
            return;
        }

        const div = document.createElement('div');
        div.className = 'grid grid-cols-3 gap-2 bg-gray-950 p-2 rounded border border-gray-800 items-center';
        div.innerHTML = `
            <input type="text" oninput="notificationsModule.updatePreview()" placeholder="Etiqueta (ej. Ver Menú)" class="btn-label bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-gray-200">
            <select class="btn-action bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-gray-200">
                <option value="OPEN_DEEPLINK">Abrir Destino</option>
                <option value="ACCEPT">Aceptar</option>
                <option value="REJECT">Rechazar</option>
            </select>
            <div class="flex items-center gap-1">
                <input type="text" placeholder="Ruta (ej. orders)" class="btn-link bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-gray-200 w-full">
                <button type="button" onclick="this.parentElement.parentElement.remove(); notificationsModule.updatePreview();" class="text-red-400 text-xs font-bold px-1">✕</button>
            </div>
        `;
        container.appendChild(div);
        notificationsModule.updatePreview();
    },

    handleScheduleModeChange: () => {
        const mode = document.getElementById('notif-schedule-mode').value;
        const container = document.getElementById('scheduled-datetime-container');
        if (mode === 'SCHEDULED') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    },

    handleTargetTypeChange: () => {
        const val = document.getElementById('notif-target-type').value;
        const sec = document.getElementById('specific-users-section');
        if (val === 'specific') {
            sec.classList.remove('hidden');
        } else {
            sec.classList.add('hidden');
        }
    },

    loadUsers: () => {
        db.collection('users').get().then(snap => {
            notificationsModule.users = [];
            snap.forEach(doc => {
                notificationsModule.users.push({
                    uid: doc.id,
                    ...doc.data()
                });
            });
        });
    },

    loadTemplate: () => {
        const val = document.getElementById('notif-template').value;
        const titleEl = document.getElementById('notif-title');
        const bodyEl = document.getElementById('notif-body');
        const catEl = document.getElementById('notif-category');
        const typeEl = document.getElementById('notif-type');
        const destTypeEl = document.getElementById('notif-destination-type');

        if (!val) return;

        switch (val) {
            case 'black_friday':
                titleEl.value = '🛍️ ¡Black Friday en BlueSystem!';
                bodyEl.value = 'Descuentos de hasta el 50% en restaurantes y comercios seleccionados. ¡Válido solo por hoy!';
                catEl.value = 'Promociones';
                typeEl.value = 'PROMOTION';
                destTypeEl.value = 'CUSTOMER_HOME';
                break;
            case 'promo_30':
                titleEl.value = '🎉 ¡30% de Descuento en tu próxima orden!';
                bodyEl.value = 'Disfruta de tus platillos favoritos con un 30% de descuento directo en toda la aplicación.';
                catEl.value = 'Promociones';
                typeEl.value = 'PROMOTION';
                destTypeEl.value = 'CUSTOMER_COUPON';
                break;
            case 'envio_gratis':
                titleEl.value = '🚚 ¡Envío Gratis hoy en BlueSystem!';
                bodyEl.value = 'No pagues costo de delivery hoy. Ordena de cualquier comercio destacado.';
                catEl.value = 'Delivery';
                typeEl.value = 'PROMOTION';
                destTypeEl.value = 'CUSTOMER_HOME';
                break;
            case 'birthday':
                titleEl.value = '🎂 ¡Feliz Cumpleaños de parte de BlueSystem!';
                bodyEl.value = 'Queremos celebrar contigo. Te regalamos un cupón especial para tu consumo el día de hoy.';
                catEl.value = 'Cuenta';
                typeEl.value = 'ACCOUNT';
                destTypeEl.value = 'CUSTOMER_COUPON';
                break;
            case 'mantenimiento':
                titleEl.value = '⚠ Mantenimiento Programado del Sistema';
                bodyEl.value = 'La aplicación estará en mantenimiento preventivo hoy a las 11:59 PM por aproximadamente 1 hora.';
                catEl.value = 'Sistema';
                typeEl.value = 'MAINTENANCE';
                destTypeEl.value = 'CUSTOMER_HOME';
                break;
            case 'bienvenida':
                titleEl.value = '👋 ¡Bienvenido a BlueSystem Delivery!';
                bodyEl.value = 'Explora los mejores restaurantes, farmacias y tiendas locales en tu ciudad.';
                catEl.value = 'Novedades';
                typeEl.value = 'NEWS';
                destTypeEl.value = 'CUSTOMER_HOME';
                break;
        }

        notificationsModule.handleDestinationTypeChange();
        notificationsModule.updatePreview();
    },

    searchUsers: () => {
        const query = document.getElementById('user-search-notif').value.toLowerCase().trim();
        const container = document.getElementById('users-search-results');
        if (!query) {
            container.innerHTML = '';
            return;
        }

        const matches = notificationsModule.users.filter(u => 
            (u.email || '').toLowerCase().includes(query) || 
            (u.nombre || '').toLowerCase().includes(query)
        ).slice(0, 5);

        container.innerHTML = matches.map(u => `
            <div onclick="notificationsModule.selectUser('${u.uid}', '${u.email || u.nombre}')" class="p-2 hover:bg-gray-900 cursor-pointer flex justify-between items-center text-xs">
                <span class="text-gray-200 font-medium">${u.nombre || 'Usuario'}</span>
                <span class="text-gray-500 font-mono text-[10px]">${u.email || u.uid}</span>
            </div>
        `).join('');
    },

    selectUser: (uid, email) => {
        if (!notificationsModule.selectedUsers.some(u => u.uid === uid)) {
            notificationsModule.selectedUsers.push({ uid, email });
            notificationsModule.renderSelectedTags();
        }
    },

    removeUser: (uid) => {
        notificationsModule.selectedUsers = notificationsModule.selectedUsers.filter(u => u.uid !== uid);
        notificationsModule.renderSelectedTags();
    },

    renderSelectedTags: () => {
        const container = document.getElementById('selected-users-tags');
        if (notificationsModule.selectedUsers.length === 0) {
            container.innerHTML = '<span class="text-[10px] text-gray-500">Ningún usuario seleccionado.</span>';
            return;
        }

        container.innerHTML = notificationsModule.selectedUsers.map(u => `
            <span class="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-800 flex items-center gap-1">
                ${u.email}
                <button type="button" onclick="notificationsModule.removeUser('${u.uid}')" class="text-red-400 font-bold ml-1">✕</button>
            </span>
        `).join('');
    },

    promptSubmitConfirmation: (e) => {
        e.preventDefault();
        const title = document.getElementById('notif-title').value.trim();
        const body = document.getElementById('notif-body').value.trim();
        if (!title || !body) {
            toast.show("Título y cuerpo del mensaje son obligatorios.", "warning");
            return;
        }

        const targetType = document.getElementById('notif-target-type').value;
        let targetCount = 0;
        let targetLabel = '';
        if (targetType === 'all') {
            targetCount = notificationsModule.users.length;
            targetLabel = 'Todos los Usuarios';
        } else if (targetType === 'specific') {
            targetCount = notificationsModule.selectedUsers.length;
            targetLabel = 'Usuarios Específicos';
        } else if (targetType === 'active_30_days') {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            targetCount = notificationsModule.users.filter(u => u.lastLogin && u.lastLogin.seconds * 1000 > thirtyDaysAgo).length;
            targetLabel = 'Usuarios Activos (30 días)';
        } else {
            targetCount = notificationsModule.users.filter(u => (u.rol || u.role || u.userType || '').toLowerCase().includes(targetType)).length;
            targetLabel = `Segmento: ${targetType.toUpperCase()}`;
        }

        const destType = document.getElementById('notif-destination-type').value;
        const uri = document.getElementById('destination-preview-uri').innerText;
        const img = document.getElementById('notif-image').value.trim();
        const priority = document.getElementById('notif-priority').value;

        const content = document.getElementById('notif-confirm-content');
        content.innerHTML = `
            <div class="space-y-3 bg-gray-950 p-4 rounded-xl border border-gray-800">
                <div class="flex justify-between items-start border-b border-gray-800 pb-2">
                    <div>
                        <span class="text-[10px] text-gray-500 uppercase font-mono block">Campaña</span>
                        <h4 class="text-sm font-bold text-white">${title}</h4>
                    </div>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-900/40 text-blue-300 border border-blue-800">${priority}</span>
                </div>
                <p class="text-xs text-gray-300">${body}</p>
                <div class="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-gray-800">
                    <div>
                        <span class="text-gray-500 block">Destino Contextual:</span>
                        <span class="text-blue-400 font-mono font-bold">${destType}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 block">Audiencia Estimada:</span>
                        <span class="text-yellow-400 font-bold">${targetCount} destinatarios (${targetLabel})</span>
                    </div>
                </div>
                <div class="text-[10px] font-mono text-gray-400 truncate">
                    <span class="text-gray-500">URI:</span> ${uri}
                </div>
                ${img ? `<div class="pt-1"><img src="${img}" class="h-20 w-full object-cover rounded-lg border border-gray-800"></div>` : ''}
            </div>
            <p class="text-[11px] text-gray-400">
                Al confirmar, la campaña será enviada a la cola backend (<code class="text-blue-400">notification_campaigns</code>) para su despacho atómico vía FCM y persistencia en los centros de notificaciones de cada usuario.
            </p>
        `;

        document.getElementById('notif-confirm-modal').classList.remove('hidden');
    },

    closeConfirmModal: () => {
        document.getElementById('notif-confirm-modal')?.classList.add('hidden');
    },

    executeSubmit: async () => {
        notificationsModule.closeConfirmModal();
        const btn = document.getElementById('send-notif-btn');
        btn.disabled = true;
        btn.innerHTML = '⏳ Encolando Campaña (QUEUED)...';

        const category = document.getElementById('notif-category').value;
        const type = document.getElementById('notif-type').value;
        const priority = document.getElementById('notif-priority').value;
        const title = document.getElementById('notif-title').value.trim();
        const body = document.getElementById('notif-body').value.trim();
        const imageUrl = document.getElementById('notif-image').value.trim();
        const destinationType = document.getElementById('notif-destination-type').value;
        const destinationRoute = document.getElementById('notif-destination-route').value;
        const deepLink = document.getElementById('destination-preview-uri').innerText;
        const entityId = document.getElementById('notif-entity-id').value;
        const entityType = document.getElementById('notif-entity-type').value;
        const businessId = document.getElementById('notif-business-id').value;
        const productId = document.getElementById('notif-product-id').value;
        const couponId = document.getElementById('notif-coupon-id').value;
        const action = document.getElementById('notif-action').value;

        const scheduleMode = document.getElementById('notif-schedule-mode').value;
        const scheduledAtVal = document.getElementById('notif-scheduled-at').value;
        const expiresAtVal = document.getElementById('notif-expires-at').value;
        const targetType = document.getElementById('notif-target-type').value;

        const buttons = [];
        document.querySelectorAll('#buttons-container > div').forEach(row => {
            const label = row.querySelector('.btn-label')?.value?.trim();
            const bAction = row.querySelector('.btn-action')?.value;
            const link = row.querySelector('.btn-link')?.value?.trim();
            if (label) {
                buttons.push({ id: `btn_${Date.now()}_${Math.random()}`, label, action: bAction, deepLink: link });
            }
        });

        let status = 'QUEUED';
        let scheduledAt = null;
        if (scheduleMode === 'SCHEDULED') {
            status = 'SCHEDULED';
            scheduledAt = scheduledAtVal ? firebase.firestore.Timestamp.fromDate(new Date(scheduledAtVal)) : null;
        } else if (scheduleMode === 'DRAFT') {
            status = 'DRAFT';
        }

        const expiresAt = expiresAtVal ? firebase.firestore.Timestamp.fromDate(new Date(expiresAtVal)) : null;

        // Validar que la fecha de expiración no sea en el pasado
        if (expiresAtVal) {
            const selectedExpiry = new Date(expiresAtVal);
            if (selectedExpiry <= new Date()) {
                toast.show("La fecha de expiración debe ser en el futuro.", "warning");
                btn.disabled = false;
                btn.innerHTML = '🚀 Procesar / Guardar en Cola (Queue)';
                return;
            }
        }

        let targetUids = [];
        if (targetType === 'all') {
            targetUids = notificationsModule.users.map(u => u.uid);
        } else if (targetType === 'specific') {
            targetUids = notificationsModule.selectedUsers.map(u => u.uid);
        } else if (targetType === 'active_30_days') {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            targetUids = notificationsModule.users.filter(u => u.lastLogin && u.lastLogin.seconds * 1000 > thirtyDaysAgo).map(u => u.uid);
        } else {
            targetUids = notificationsModule.users.filter(u => (u.rol || u.role || u.userType || '').toLowerCase().includes(targetType)).map(u => u.uid);
        }

        const campaignId = `camp_${Date.now()}`;
        const campaignData = {
            id: campaignId,
            version: 1,
            title,
            body,
            category,
            type,
            priority,
            imageUrl,
            destinationType,
            destinationRoute,
            fallbackDestination: 'CUSTOMER_HOME',
            deepLink,
            navigationRoute: destinationRoute || deepLink,
            action,
            entityId,
            entityType,
            businessId,
            productId,
            couponId,
            buttons,
            targetType,
            status, // DRAFT, SCHEDULED, QUEUED, PROCESSING, SENT, PARTIALLY_SENT, FAILED, CANCELLED, ARCHIVED
            retryCount: 0,
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'admin_web',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            scheduledAt: scheduledAt,
            expiresAt: expiresAt,
            analytics: {
                sentCount: targetUids.length,
                deliveredCount: targetUids.length,
                openedCount: 0,
                dismissedCount: 0,
                deletedCount: 0,
                buttonClicks: 0,
                conversionCount: 0,
                conversionValue: 0.0,
                ctr: 0.0,
                conversionRate: 0.0,
                readRate: 0.0,
                deliveryRate: 100.0
            }
        };

        try {
            // 1. Guardar la campaña
            await db.collection('notification_campaigns').doc(campaignId).set(campaignData);

            // 2. Guardar versión v1
            await db.collection('notification_campaigns').doc(campaignId).collection('versions').doc('v1').set({
                version: 1,
                title,
                body,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'admin_web'
            });

            if (status === 'QUEUED') {
                toast.show(`Campaña "${title}" agregada a la cola backend (QUEUED). Despacho en proceso.`);
            } else if (status === 'SCHEDULED') {
                toast.show('Campaña programada con éxito para despacho diferido.');
            } else {
                toast.show('Borrador guardado exitosamente.');
            }

            document.getElementById('notification-form').reset();
            document.getElementById('buttons-container').innerHTML = '';
            notificationsModule.selectedUsers = [];
            notificationsModule.renderSelectedTags();
            notificationsModule.handleDestinationTypeChange();
            notificationsModule.updatePreview();
            notificationsModule.loadHistory();
        } catch (e) {
            console.error("[NOTIFICATIONS_MODULE] Error al guardar campaña:", e);
            toast.show('Error al guardar la campaña en la cola.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>🚀</span> Procesar / Guardar en Cola (Queue)';
        }
    },

    promptDryRunTest: () => {
        const title = document.getElementById('notif-title').value.trim();
        const body = document.getElementById('notif-body').value.trim();
        if (!title || !body) {
            toast.show("Por favor ingresa primero el título y cuerpo de la notificación.", "warning");
            return;
        }

        const currentEmail = firebase.auth().currentUser ? firebase.auth().currentUser.email : '';
        const input = document.getElementById('test-target-recipient');
        if (input && currentEmail) {
            input.value = currentEmail;
        }
        document.getElementById('notif-test-modal')?.classList.remove('hidden');
    },

    closeDryRunModal: () => {
        document.getElementById('notif-test-modal')?.classList.add('hidden');
    },

    executeDryRunTest: async (e) => {
        e.preventDefault();
        const recipient = document.getElementById('test-target-recipient').value.trim();
        if (!recipient) return;

        const btn = document.getElementById('btn-submit-dry-run');
        btn.disabled = true;
        btn.innerHTML = 'Enviando...';

        // Resolver UID del destinatario si ingresó email
        let targetUid = recipient;
        const matchedUser = notificationsModule.users.find(u => 
            u.uid === recipient || 
            (u.email && u.email.toLowerCase() === recipient.toLowerCase())
        );
        if (matchedUser) {
            targetUid = matchedUser.uid;
        }

        const title = document.getElementById('notif-title').value.trim();
        const body = document.getElementById('notif-body').value.trim();
        const imageUrl = document.getElementById('notif-image').value.trim();
        const category = document.getElementById('notif-category').value;
        const type = document.getElementById('notif-type').value;
        const priority = document.getElementById('notif-priority').value;
        const destinationType = document.getElementById('notif-destination-type').value;
        const destinationRoute = document.getElementById('notif-destination-route').value;
        const deepLink = document.getElementById('destination-preview-uri').innerText;
        const entityId = document.getElementById('notif-entity-id').value;
        const entityType = document.getElementById('notif-entity-type').value;
        const businessId = document.getElementById('notif-business-id').value;
        const productId = document.getElementById('notif-product-id').value;
        const couponId = document.getElementById('notif-coupon-id').value;
        const action = document.getElementById('notif-action').value;

        const testCampaignId = `camp_test_${Date.now()}`;
        const campaignData = {
            id: testCampaignId,
            version: 1,
            isDryRun: true,
            title: `[TEST] ${title}`,
            body,
            category,
            type,
            priority,
            imageUrl,
            destinationType,
            destinationRoute,
            fallbackDestination: 'CUSTOMER_HOME',
            deepLink,
            navigationRoute: destinationRoute || deepLink,
            action,
            entityId,
            entityType,
            businessId,
            productId,
            couponId,
            targetType: 'specific',
            status: 'QUEUED',
            retryCount: 0,
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'admin_web',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            analytics: {
                sentCount: 1,
                deliveredCount: 1,
                openedCount: 0
            }
        };

        try {
            // Guardar campaña de prueba en cola
            await db.collection('notification_campaigns').doc(testCampaignId).set(campaignData);

            // También escribir directamente en la bandeja del usuario para inmediatez E2E
            await db.collection('users').doc(targetUid).collection('notifications').doc(testCampaignId).set({
                id: testCampaignId,
                title: `[TEST] ${title}`,
                body,
                imageUrl,
                action,
                destinationType,
                destinationRoute,
                fallbackDestination: 'CUSTOMER_HOME',
                deepLink,
                entityId,
                entityType,
                businessId,
                productId,
                couponId,
                category,
                type,
                priority,
                campaignId: testCampaignId,
                isRead: false,
                read: false,
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                visibilityStatus: 'VISIBLE'
            });

            toast.show(`Prueba 1-a-1 despachada exitosamente para ${targetUid}.`);
            notificationsModule.closeDryRunModal();
            notificationsModule.loadHistory();
        } catch (err) {
            console.error("[NOTIFICATIONS_MODULE] Error despachando prueba 1-a-1:", err);
            toast.show("Error despachando prueba: " + (err.message || ''), "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Despachar Prueba';
        }
    },

    purgeInvalidTokens: async () => {
        if (!confirm("¿Deseas purgar automáticamente todos los tokens FCM obsoletos o inactivos?")) return;
        try {
            const snap = await db.collection('user_devices').where('isTokenValid', '==', false).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            toast.show(`Purga completada: ${snap.size} tokens obsoletos eliminados.`);
            notificationsModule.loadDevicesCount();
        } catch (e) {
            toast.show('Error purgando tokens.', 'error');
        }
    },

    loadHistory: () => {
        const container = document.getElementById('notifications-history');
        if (!container) return;

        if (notificationsModule._unsubscribeHistory && typeof notificationsModule._unsubscribeHistory === 'function') {
            notificationsModule._unsubscribeHistory();
            notificationsModule._unsubscribeHistory = null;
        }

        notificationsModule._unsubscribeHistory = db.collection('notification_campaigns')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot(
                snap => {
                    if (snap.empty) {
                        container.innerHTML = '<p class="text-xs text-gray-500 p-4">No hay campañas en la cola.</p>';
                        return;
                    }

                    let totalScheduled = 0;
                    let totalQueued = 0;
                    let totalFailed = 0;
                    let totalConversions = 0;
                    let totalSent = 0;

                    container.innerHTML = snap.docs.map(doc => {
                        const data = doc.data();
                        const analytics = data.analytics || {};
                        const sent = analytics.sentCount || 0;
                        const opened = analytics.openedCount || 0;
                        const conversions = analytics.conversionCount || 0;
                        const ctr = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0';
                        const convRate = sent > 0 ? ((conversions / sent) * 100).toFixed(1) : '0.0';

                        if (data.status === 'SCHEDULED') totalScheduled++;
                        if (data.status === 'QUEUED') totalQueued++;
                        if (data.status === 'FAILED' || data.status === 'PARTIALLY_SENT') totalFailed++;
                        totalConversions += conversions;
                        totalSent += sent;

                        const isDeleted = data.visibility && data.visibility.status === 'DELETED';
                        const statusColor = isDeleted ? 'bg-purple-900/40 text-purple-300 border-purple-800' :
                                            data.status === 'SENT' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                            data.status === 'PARTIALLY_SENT' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                            data.status === 'SCHEDULED' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                            data.status === 'QUEUED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                            data.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                            'bg-red-500/20 text-red-400 border-red-500/30';
                        const statusText = isDeleted ? '🗑️ ELIMINADA DE LA BANDEJA' :
                                            data.status === 'PARTIALLY_SENT' ? '🟡 PARTIALLY SENT' :
                                            (data.status || 'SENT');

                        return `
                            <div class="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-2">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[10px] uppercase font-bold text-blue-400 font-mono">${data.category || 'General'}</span>
                                            ${data.destinationType ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono border border-emerald-800/60">${data.destinationType}</span>` : ''}
                                            ${data.isDryRun ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 font-mono border border-purple-800">TEST 1-A-1</span>` : ''}
                                        </div>
                                        <h4 class="text-xs font-bold text-gray-200 mt-0.5">${data.title}</h4>
                                    </div>
                                    <span class="px-2 py-0.5 text-[10px] font-bold rounded border ${statusColor}">${statusText}</span>
                                </div>
                                <p class="text-xs text-gray-400">${data.body}</p>
                                ${data.imageUrl ? `<div class="pt-1"><img src="${data.imageUrl}" class="h-14 w-full object-cover rounded border border-gray-800"></div>` : ''}
                                
                                <!-- KPIs de Interacción & Conversión -->
                                <div class="grid grid-cols-5 gap-1.5 pt-2 border-t border-gray-800 text-[10px]">
                                    <div class="bg-gray-900 p-1.5 rounded text-center">
                                        <span class="text-gray-500 block">Enviados</span>
                                        <span class="font-bold text-white font-mono">${sent}</span>
                                    </div>
                                    <div class="bg-gray-900 p-1.5 rounded text-center">
                                        <span class="text-gray-500 block">Abiertos</span>
                                        <span class="font-bold text-green-400 font-mono">${opened}</span>
                                    </div>
                                    <div class="bg-gray-900 p-1.5 rounded text-center">
                                        <span class="text-gray-500 block">CTR %</span>
                                        <span class="font-bold text-purple-400 font-mono">${ctr}%</span>
                                    </div>
                                    <div class="bg-gray-900 p-1.5 rounded text-center">
                                        <span class="text-gray-500 block">Compras</span>
                                        <span class="font-bold text-yellow-400 font-mono">${conversions}</span>
                                    </div>
                                    <div class="bg-gray-900 p-1.5 rounded text-center">
                                        <span class="text-gray-500 block">Conversión</span>
                                        <span class="font-bold text-cyan-400 font-mono">${convRate}%</span>
                                    </div>
                                </div>

                                <!-- Acciones del Ciclo de Vida -->
                                <div class="flex justify-end gap-2 pt-2 border-t border-gray-800/80 text-[11px]">
                                    <button onclick="notificationsModule.promptDisableForUser('${doc.id}')" class="px-2 py-1 bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 rounded border border-amber-800/50 flex items-center gap-1 transition">
                                        🚫 Deshabilitar para cliente
                                    </button>
                                    ${!isDeleted ? `
                                    <button onclick="notificationsModule.promptDeleteCampaign('${doc.id}', '${(data.title || '').replace(/'/g, "\\'")}')" class="px-2 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-300 rounded border border-red-800/50 flex items-center gap-1 transition">
                                        🗑️ Eliminar de la bandeja
                                    </button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');

                    // Actualizar KPIs superiores
                    const statQueue = document.getElementById('stat-queue-count');
                    if (statQueue) statQueue.innerText = totalQueued;
                    const statSched = document.getElementById('stat-scheduled-count');
                    if (statSched) statSched.innerText = totalScheduled;
                    const statFail = document.getElementById('stat-failed-count');
                    if (statFail) statFail.innerText = totalFailed;
                    const globalConvRate = totalSent > 0 ? ((totalConversions / totalSent) * 100).toFixed(1) : '0.0';
                    const statConv = document.getElementById('stat-conversion-rate');
                    if (statConv) statConv.innerText = `${globalConvRate}%`;
                },
                error => {
                    console.error("[NOTIFICATIONS_MODULE] Error en snapshot listener de campañas:", error);
                    container.innerHTML = `
                        <div class="p-4 bg-rose-950/30 border border-rose-800/50 rounded-lg text-xs text-rose-300 space-y-1.5">
                            <div class="font-bold flex items-center gap-1.5 text-rose-400">
                                <span>⚠️</span> No fue posible cargar el historial de campañas
                            </div>
                            <p class="text-[11px] text-slate-400">Error: <code class="text-rose-300 font-mono">${error.code || error.message || 'permission-denied'}</code></p>
                        </div>
                    `;
                }
            );
    },

    runDiagnostics: async () => {
        const panel = document.getElementById('fcm-diagnostic-panel');
        const content = document.getElementById('fcm-diagnostic-content');
        panel.classList.remove('hidden');
        content.innerHTML = `
            <div class="p-4 text-center text-gray-400 font-mono text-xs">
                <span class="inline-block animate-spin mr-2">🔄</span> Consultando telemetría real del backend FCM y Queue Worker...
            </div>
        `;

        try {
            const diag = await functionsService.diagnoseFcm();

            const queue = diag.campaigns || {};
            const devices = diag.devices || {};
            const deliveries = diag.deliveries || {};
            const last = diag.lastActivity || {};

            content.innerHTML = `
                <div class="space-y-4">
                    <!-- Salud del Sistema -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center font-mono">
                        <div class="bg-gray-950 p-2 rounded border border-gray-800">
                            <span class="text-[9px] text-gray-500 block uppercase">App Check</span>
                            <span class="text-xs font-bold text-green-400 flex items-center justify-center gap-1">🟢 ${diag.appCheckStatus || 'ACTIVE'}</span>
                        </div>
                        <div class="bg-gray-950 p-2 rounded border border-gray-800">
                            <span class="text-[9px] text-gray-500 block uppercase">Auth (EIAM)</span>
                            <span class="text-xs font-bold text-green-400 flex items-center justify-center gap-1">🟢 ${diag.authStatus || 'ACTIVE'}</span>
                        </div>
                        <div class="bg-gray-950 p-2 rounded border border-gray-800">
                            <span class="text-[9px] text-gray-500 block uppercase">Cloud Functions</span>
                            <span class="text-xs font-bold text-green-400 flex items-center justify-center gap-1">🟢 ${diag.cloudFunctionsStatus || 'ACTIVE'}</span>
                        </div>
                        <div class="bg-gray-950 p-2 rounded border border-gray-800">
                            <span class="text-[9px] text-gray-500 block uppercase">Queue Worker</span>
                            <span class="text-xs font-bold text-green-400 flex items-center justify-center gap-1">🟢 ${diag.queueWorkerStatus || 'ACTIVE'}</span>
                        </div>
                    </div>

                    <!-- Resumen del Estado de la Cola & Dispositivos -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="bg-gray-950 p-3 rounded border border-gray-800 space-y-1.5">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide block border-b border-gray-800 pb-1">⚙️ Estado de la Cola (Campaigns)</span>
                            <div class="flex justify-between text-xs"><span class="text-yellow-400 font-medium">QUEUED (En Cola):</span><span class="font-bold font-mono text-yellow-400">${queue.QUEUED || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-blue-400 font-medium">PROCESSING (En Proceso):</span><span class="font-bold font-mono text-blue-400">${queue.PROCESSING || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-amber-400 font-medium">RETRY (Reintento):</span><span class="font-bold font-mono text-amber-400">${queue.RETRY || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-red-400 font-medium">FAILED (Fallidas):</span><span class="font-bold font-mono text-red-400">${queue.FAILED || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-green-400 font-medium">SENT (Completadas):</span><span class="font-bold font-mono text-green-400">${queue.SENT || 0}</span></div>
                        </div>

                        <div class="bg-gray-950 p-3 rounded border border-gray-800 space-y-1.5">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide block border-b border-gray-800 pb-1">📱 Telemetría de Dispositivos</span>
                            <div class="flex justify-between text-xs"><span class="text-gray-300">Total Dispositivos:</span><span class="font-bold font-mono text-white">${devices.total || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-green-400">Tokens Válidos Activos:</span><span class="font-bold font-mono text-green-400">${devices.validTokens || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-red-400">Tokens Vacíos / Inválidos:</span><span class="font-bold font-mono text-red-400">${devices.emptyOrInvalidTokens || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-gray-400">Plataformas:</span><span class="font-mono text-gray-300">Android: ${devices.android || 0} | iOS: ${devices.ios || 0}</span></div>
                        </div>

                        <div class="bg-gray-950 p-3 rounded border border-gray-800 space-y-1.5">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide block border-b border-gray-800 pb-1">📋 Ledger FCM (campaign_deliveries)</span>
                            <div class="flex justify-between text-xs"><span class="text-green-400 font-medium">FCM_ACCEPTED:</span><span class="font-bold font-mono text-green-400">${deliveries.FCM_ACCEPTED || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-amber-400 font-medium">FAILED_RETRYABLE:</span><span class="font-bold font-mono text-amber-400">${deliveries.FAILED_RETRYABLE || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-red-400 font-medium">FAILED_PERMANENT:</span><span class="font-bold font-mono text-red-400">${deliveries.FAILED_PERMANENT || 0}</span></div>
                            <div class="flex justify-between text-xs"><span class="text-gray-400">PENDING / SENDING:</span><span class="font-bold font-mono text-gray-300">${(deliveries.PENDING || 0) + (deliveries.SENDING || 0)}</span></div>
                        </div>
                    </div>

                    <!-- Última Actividad de Campaña -->
                    <div class="bg-gray-950 p-3 rounded border border-gray-800 space-y-2">
                        <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wide block">🕒 Última Actividad del Queue Worker</span>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div><span class="text-gray-500 block">Campaña:</span><span class="font-bold text-gray-200">${last.title || 'Ninguna'}</span></div>
                            <div><span class="text-gray-500 block">Estado / Éxitos:</span><span class="font-bold text-green-400">${last.status || 'N/A'} (${last.successCount || 0} FCM_ACCEPTED)</span></div>
                            <div><span class="text-gray-500 block">Último FCM Message ID:</span><span class="font-mono text-gray-300 truncate block">${last.lastFcmMessageId || 'N/A'}</span></div>
                        </div>
                    </div>

                    <!-- Smoke Test Controlado FCM -->
                    <div class="bg-gray-950 p-4 rounded border border-indigo-500/40 space-y-3">
                        <div class="flex justify-between items-center">
                            <h4 class="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <span>🧪</span> Smoke Test FCM Controlado (Dispositivo Específico)
                            </h4>
                            <span class="text-[10px] text-gray-500 font-mono">Prueba 1-to-1 aislada</span>
                        </div>
                        <form onsubmit="notificationsModule.runSmokeTest(event)" class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                            <div>
                                <label class="text-[10px] text-gray-400 font-semibold">UID Usuario Objetivo *</label>
                                <input type="text" id="smoke-target-uid" required placeholder="Ej: user_smoke_123" class="w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500">
                            </div>
                            <div>
                                <label class="text-[10px] text-gray-400 font-semibold">ID Dispositivo (deviceId) *</label>
                                <input type="text" id="smoke-device-id" required placeholder="Ej: dev1" value="dev1" class="w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500">
                            </div>
                            <div>
                                <button type="submit" id="btn-run-smoke" class="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded transition shadow">
                                    🚀 Ejecutar Smoke Test FCM
                                </button>
                            </div>
                        </form>
                        <div id="smoke-test-result" class="hidden text-xs p-3 bg-gray-900 rounded border border-gray-800 space-y-1 font-mono"></div>
                    </div>
                </div>
            `;

            if (document.getElementById('stat-queue-count')) document.getElementById('stat-queue-count').innerText = queue.QUEUED || 0;
            if (document.getElementById('stat-scheduled-count')) document.getElementById('stat-scheduled-count').innerText = queue.SCHEDULED || 0;
            if (document.getElementById('stat-failed-count')) document.getElementById('stat-failed-count').innerText = queue.FAILED || 0;
            if (document.getElementById('stat-total-devices')) document.getElementById('stat-total-devices').innerText = devices.total || 0;
            if (document.getElementById('stat-valid-tokens')) {
                const pct = devices.total > 0 ? ((devices.validTokens / devices.total) * 100).toFixed(0) : 100;
                document.getElementById('stat-valid-tokens').innerText = `${pct}%`;
            }
        } catch (err) {
            console.error("[NOTIFICATIONS_MODULE] Error ejecutando diagnóstico FCM:", err);
            content.innerHTML = `
                <div class="p-3 bg-red-950/60 border border-red-800 rounded text-red-300 text-xs">
                    ❌ Error ejecutando diagnóstico del backend: ${err.message || 'Error desconocido'}
                </div>
            `;
        }
    },

    runSmokeTest: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-run-smoke');
        const resDiv = document.getElementById('smoke-test-result');
        const targetUid = document.getElementById('smoke-target-uid').value.trim();
        const deviceId = document.getElementById('smoke-device-id').value.trim();

        btn.disabled = true;
        btn.innerHTML = '⏳ Probando FCM...';
        resDiv.classList.remove('hidden');
        resDiv.innerHTML = '<span class="text-yellow-400">Enviando payload Data-Only a FCM Admin SDK...</span>';

        try {
            const res = await functionsService.sendFcmDiagnostic(targetUid, deviceId);
            resDiv.innerHTML = `
                <div class="space-y-1">
                    <p class="text-green-400 font-bold">✓ Target: 🟢 | Device: 🟢 | Token: 🟢 VALID</p>
                    <p class="text-indigo-300 font-bold">FCM Status: 🟢 ${res.fcmStatus}</p>
                    <p class="text-gray-300">Message ID: <span class="text-white">${res.fcmMessageId || 'N/A'}</span></p>
                    <p class="text-gray-400">Delivery Key: <span class="text-gray-300">${res.deliveryKey}</span></p>
                </div>
            `;
            toast.show("Smoke Test FCM ejecutado con éxito.");
        } catch (err) {
            console.error("[NOTIFICATIONS_MODULE] Error en Smoke Test FCM:", err);
            resDiv.innerHTML = `
                <div class="text-red-400 font-bold space-y-1">
                    <p>❌ Error en Smoke Test FCM:</p>
                    <p class="text-gray-300 font-normal">${err.message || 'Fallo de entrega'}</p>
                </div>
            `;
            toast.show("Error en Smoke Test FCM.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '🚀 Ejecutar Smoke Test FCM';
        }
    },

    promptDeleteCampaign: async (campaignId, title) => {
        if (!confirm(`¿Eliminar la campaña "${title}" de la experiencia visible de los clientes?\n\n⚠️ Esta acción ocultará la notificación para los clientes, pero CONSERVARÁ intactas las estadísticas, entregas y auditoría.`)) return;

        try {
            if (typeof functionsService !== 'undefined' && functionsService.adminDeleteCampaign) {
                await functionsService.adminDeleteCampaign(campaignId);
            } else {
                await db.collection('notification_campaigns').doc(campaignId).update({
                    'visibility.status': 'DELETED',
                    'visibility.deletedAt': firebase.firestore.FieldValue.serverTimestamp(),
                    'visibility.deletedBy': firebase.auth().currentUser ? firebase.auth().currentUser.email : 'admin_web'
                });
            }
            toast.show(`Campaña eliminada de la bandeja de clientes. Estadísticas conservadas.`);
            notificationsModule.loadHistory();
        } catch (e) {
            console.error("[NOTIFICATIONS_MODULE] Error eliminando campaña:", e);
            toast.show("Error al eliminar la campaña de la bandeja.", "error");
        }
    },

    promptDisableForUser: async (campaignId) => {
        const targetUid = prompt("Ingresa el UID o Email del cliente para deshabilitar esta notificación:");
        if (!targetUid || !targetUid.trim()) return;

        try {
            const cleanUid = targetUid.trim();
            if (typeof functionsService !== 'undefined' && functionsService.adminDisableNotificationForUser) {
                await functionsService.adminDisableNotificationForUser(campaignId, cleanUid);
            } else {
                await db.collection('users').doc(cleanUid).collection('notifications').doc(campaignId).set({
                    campaignId,
                    visibilityStatus: 'DISABLED',
                    disabledAt: firebase.firestore.FieldValue.serverTimestamp(),
                    disabledBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'admin_web'
                }, { merge: true });
            }
            toast.show(`Notificación deshabilitada únicamente para el cliente ${cleanUid}.`);
        } catch (e) {
            console.error("[NOTIFICATIONS_MODULE] Error deshabilitando notificación:", e);
            toast.show("Error al deshabilitar notificación para el cliente.", "error");
        }
    }
};

window.notificationsModule = notificationsModule;
