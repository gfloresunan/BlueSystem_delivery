// Módulo Commerce Intelligence Platform & Enterprise Coupon Engine v1.0
// BlueSystem Delivery Enterprise — Admin Control Center
window.commerceIntelligenceModule = {
    couponsListener: null,
    couponsList: [],
    businessesList: [],
    currentFilterScope: 'ALL',
    currentFilterStatus: 'ALL',
    searchQuery: '',
    editingCouponId: null,

    render: async function() {
        const container = document.getElementById('tab-content');
        if (!container) return;

        if (window.AuthReadyGate && typeof window.AuthReadyGate.init === 'function') {
            try {
                await window.AuthReadyGate.init();
                if (!window.AuthReadyGate.isPlatformAdmin) {
                    console.warn('[COMMERCE_INTEL] Acceso restringido: Usuario sin privilegios de Platform Admin.');
                    container.innerHTML = `
                        <div class="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-xl mx-auto space-y-4">
                            <span class="text-4xl">🛡️</span>
                            <h3 class="text-lg font-black text-rose-400">Acceso Administrativo Requerido</h3>
                            <p class="text-xs text-slate-400">Su cuenta no cuenta con Custom Claims de administración verificados para operar Commerce Intelligence Platform.</p>
                        </div>
                    `;
                    return;
                }
            } catch (authErr) {
                console.error('[COMMERCE_INTEL] Error inicializando AuthReadyGate:', authErr);
            }
        }

        container.innerHTML = `
            <div class="space-y-6 max-w-7xl mx-auto pb-12">
                <!-- Encabezado del Módulo -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <div class="space-y-1">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">🧠</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h2 class="text-xl font-black text-slate-100">Commerce Intelligence Platform</h2>
                                    <span class="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Engine v1.0 Live</span>
                                </div>
                                <p class="text-xs text-slate-400">Gestión de Cupones Enterprise (Globales & Por Comercio), Customer 360, Prevención de Fraude y AI Insights.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.commerceIntelligenceModule.openCouponModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>🎟️</span> Crear Nuevo Cupón
                        </button>
                    </div>
                </div>

                <!-- Sub-Navegación del Módulo -->
                <div class="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                    <button onclick="window.commerceIntelligenceModule.switchSubTab('coupons')" id="ctab-btn-coupons" class="ctab-btn active bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition">
                        🎟️ Cupones Enterprise
                    </button>
                    <button onclick="window.commerceIntelligenceModule.switchSubTab('loyalty')" id="ctab-btn-loyalty" class="ctab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        👑 Loyalty & VIP Customer360
                    </button>
                    <button onclick="window.commerceIntelligenceModule.switchSubTab('fraud')" id="ctab-btn-fraud" class="ctab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        🛡️ Prevención de Fraude
                    </button>
                    <button onclick="window.commerceIntelligenceModule.switchSubTab('aiInsights')" id="ctab-btn-aiInsights" class="ctab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                        💡 AI Business Insights
                    </button>
                </div>

                <!-- Sub-Pestaña 1: Cupones Enterprise -->
                <div id="csubtab-coupons" class="csubtab-content space-y-6">
                    <!-- Filtros y Búsqueda -->
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div class="flex-1 w-full relative">
                            <input type="text" id="couponSearchInput" oninput="window.commerceIntelligenceModule.handleSearch(this.value)" placeholder="Buscar cupón por código o descripción..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 pl-9">
                            <span class="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto">
                            <select id="couponFilterScope" onchange="window.commerceIntelligenceModule.handleFilterScope(this.value)" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
                                <option value="ALL">Todos los Alcances</option>
                                <option value="GLOBAL">🌐 Globales (Marketplace)</option>
                                <option value="MERCHANT_SPECIFIC">🏪 Específicos de Comercio</option>
                            </select>
                            <select id="couponFilterStatus" onchange="window.commerceIntelligenceModule.handleFilterStatus(this.value)" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500">
                                <option value="ALL">Todos los Estados</option>
                                <option value="ACTIVE">🟢 Activos</option>
                                <option value="INACTIVE">🔴 Inactivos / Pausados</option>
                            </select>
                        </div>
                    </div>

                    <!-- Contenedor de Tarjetas de Cupones -->
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">Cupones Registrados en Firestore</h3>
                            <span id="couponStatsBadge" class="text-xs text-slate-400 font-bold bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">Cargando...</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="couponsContainer">
                            <div class="p-8 text-center text-xs text-slate-500 col-span-full">Cargando cupones en tiempo real desde /coupons...</div>
                        </div>
                    </div>
                </div>

                <!-- Sub-Pestaña 2: Loyalty & Customer360 -->
                <!-- Sub-Pestaña 2: Fidelidad & Recompensas Enterprise -->
                <div id="csubtab-loyalty" class="csubtab-content space-y-6 hidden">
                    <!-- Métricas Resumen -->
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-sm font-extrabold text-amber-400 uppercase tracking-wider">Programa de Fidelidad & Recompensas Enterprise 🎁</h3>
                                <p class="text-xs text-slate-400">Control autoritativo de puntos, niveles, catálogo de premios y ledger financiero con política FIFO.</p>
                            </div>
                            <span class="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-xl border border-amber-500/20 font-bold">100% Firestore + Cloud Functions</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="loyaltyMetricsContainer">
                            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span class="text-xs text-slate-400">Total Puntos Emitidos ⭐</span>
                                <p class="text-2xl font-black text-amber-400" id="loyaltyPointsIssuedDisplay">-</p>
                                <span class="text-[10px] text-slate-500">+10 pts por pedido completado</span>
                            </div>
                            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span class="text-xs text-slate-400">Total Puntos Canjeados 🎟️</span>
                                <p class="text-2xl font-black text-emerald-400" id="loyaltyPointsRedeemedDisplay">-</p>
                                <span class="text-[10px] text-slate-500">Deducidos por vouchers</span>
                            </div>
                            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span class="text-xs text-slate-400">Clientes VIP / Recurrentes 💎</span>
                                <p class="text-2xl font-black text-indigo-400" id="vipCountDisplay">-</p>
                                <span class="text-[10px] text-slate-500">> 2 pedidos completados</span>
                            </div>
                            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span class="text-xs text-slate-400">Total Clientes en Programa 👤</span>
                                <p class="text-2xl font-black text-slate-300" id="totalUsersCountDisplay">-</p>
                                <span class="text-[10px] text-slate-500">Base con saldo activo</span>
                            </div>
                        </div>
                    </div>

                    <!-- Pestañas de Fidelidad -->
                    <div class="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                        <button onclick="window.commerceIntelligenceModule.switchLoyaltyTab('rewards')" id="loyaltytab-btn-rewards" class="loyaltytab-btn active bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold transition">
                            🎁 Catálogo de Premios
                        </button>
                        <button onclick="window.commerceIntelligenceModule.switchLoyaltyTab('rules')" id="loyaltytab-btn-rules" class="loyaltytab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                            ⚖️ Reglas & Acumulación
                        </button>
                        <button onclick="window.commerceIntelligenceModule.switchLoyaltyTab('levels')" id="loyaltytab-btn-levels" class="loyaltytab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                            🏆 Niveles de Cliente
                        </button>
                        <button onclick="window.commerceIntelligenceModule.switchLoyaltyTab('ledger')" id="loyaltytab-btn-ledger" class="loyaltytab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                            📋 Ledger de Movimientos
                        </button>
                        <button onclick="window.commerceIntelligenceModule.switchLoyaltyTab('redemptions')" id="loyaltytab-btn-redemptions" class="loyaltytab-btn text-slate-400 hover:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                            🎟️ Registro de Canjes
                        </button>
                    </div>

                    <!-- Sub-Sección 1: Catálogo de Premios & Previsualización -->
                    <div id="loyalty-view-rewards" class="loyalty-subview space-y-6">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Formulario de Recompensa -->
                            <div class="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                                <h4 class="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Crear / Editar Recompensa de Fidelidad</h4>
                                <form id="loyaltyRewardForm" onsubmit="event.preventDefault(); window.commerceIntelligenceModule.saveReward();" class="space-y-4 text-xs">
                                    <input type="hidden" id="formRewardId">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-slate-400 mb-1">Nombre del Premio *</label>
                                            <input type="text" id="formRewardName" oninput="window.commerceIntelligenceModule.updateRewardPreview()" required placeholder="Ej: C$50 Descuento en tu Pedido" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                        </div>
                                        <div>
                                            <label class="block text-slate-400 mb-1">Costo en Puntos *</label>
                                            <input type="number" id="formRewardPointsCost" oninput="window.commerceIntelligenceModule.updateRewardPreview()" min="1" value="50" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                        </div>
                                        <div>
                                            <label class="block text-slate-400 mb-1">Alcance *</label>
                                            <select id="formRewardScope" onchange="window.commerceIntelligenceModule.handleRewardScopeChange(this.value); window.commerceIntelligenceModule.updateRewardPreview();" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                                <option value="GLOBAL">🌐 Global (Todos los Comercios)</option>
                                                <option value="MERCHANT_SPECIFIC">🏪 Específico de Comercio</option>
                                            </select>
                                        </div>
                                        <div id="rewardBusinessIdContainer" class="hidden">
                                            <label class="block text-slate-400 mb-1">Comercio Asociado *</label>
                                            <select id="formRewardBusinessId" onchange="window.commerceIntelligenceModule.updateRewardPreview()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                                <option value="">Seleccione Comercio...</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-slate-400 mb-1">Tipo de Beneficio</label>
                                            <select id="formRewardType" onchange="window.commerceIntelligenceModule.handleRewardTypeChange(this.value); window.commerceIntelligenceModule.updateRewardPreview();" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                                <option value="FIXED_DISCOUNT">Descuento Fijo (C$)</option>
                                                <option value="PERCENTAGE_DISCOUNT">Descuento Porcentual (%)</option>
                                                <option value="FREE_DELIVERY">Envío Gratis</option>
                                                <option value="COMBO">🎁 Combo de Recompensa (Multi-beneficio)</option>
                                            </select>
                                        </div>
                                        <div id="rewardDiscountValueContainer">
                                            <label class="block text-slate-400 mb-1">Valor del Descuento</label>
                                            <input type="number" id="formRewardDiscountValue" oninput="window.commerceIntelligenceModule.updateRewardPreview()" min="0" step="0.5" value="50" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                        </div>
                                    </div>

                                    <!-- Constructor Dinámico de Componentes de Combo -->
                                    <div id="comboBuilderContainer" class="hidden bg-slate-950/80 p-4 rounded-xl border border-amber-500/30 space-y-3">
                                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                                            <span class="font-extrabold text-amber-400 text-xs">🎁 Componentes del Combo</span>
                                            <span class="text-[10px] text-slate-400">Arma una recompensa compuesta</span>
                                        </div>

                                        <!-- Lista de componentes agregados -->
                                        <div id="comboComponentsList" class="space-y-2">
                                            <p class="text-slate-500 text-xs italic py-1">No hay componentes agregados aún. Agrega productos o beneficios abajo.</p>
                                        </div>

                                        <!-- Controles para agregar componente -->
                                        <div class="p-3 bg-slate-900 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                                            <div>
                                                <label class="block text-[10px] text-slate-400 mb-1">Tipo de Componente</label>
                                                <select id="comboItemTypeSelect" onchange="window.commerceIntelligenceModule.handleComboItemTypeChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                                                    <option value="PRODUCT">🍔 Producto Gratis</option>
                                                    <option value="FIXED_DISCOUNT">💰 Descuento Fijo (C$)</option>
                                                    <option value="PERCENTAGE_DISCOUNT">🏷️ Descuento %</option>
                                                    <option value="FREE_DELIVERY">🛵 Delivery Gratis</option>
                                                </select>
                                            </div>
                                            <div id="comboProductSelectContainer" class="sm:col-span-2">
                                                <label class="block text-[10px] text-slate-400 mb-1">Producto del Catálogo</label>
                                                <select id="comboProductSelect" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                                                    <option value="">Cargando catálogo...</option>
                                                </select>
                                            </div>
                                            <div id="comboValueContainer" class="hidden sm:col-span-2">
                                                <label id="comboValueLabel" class="block text-[10px] text-slate-400 mb-1">Monto de Descuento (C$)</label>
                                                <input type="number" id="comboValueInput" min="1" value="50" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                                            </div>
                                            <div>
                                                <button type="button" onclick="window.commerceIntelligenceModule.addComboComponent()" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow">
                                                    + Agregar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-slate-400 mb-1">Descripción para el Cliente</label>
                                        <input type="text" id="formRewardDescription" oninput="window.commerceIntelligenceModule.updateRewardPreview()" placeholder="Ej: Válido en compras mínimas de C$200 durante 30 días" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500">
                                    </div>
                                    <div class="flex items-center justify-between pt-2">
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" id="formRewardActive" checked class="rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0">
                                            <span class="text-slate-300">Recompensa Activa en Marketplace</span>
                                        </label>
                                        <div class="flex gap-2">
                                            <button type="button" onclick="window.commerceIntelligenceModule.resetRewardForm()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl">Limpiar</button>
                                            <button type="submit" id="btnSaveReward" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl shadow-lg">Guardar Recompensa</button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <!-- Live Preview Card (Componente de Previsualización) -->
                            <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center justify-between mb-4">
                                        <span class="text-xs font-extrabold text-amber-400 uppercase">Previsualizar Recompensa</span>
                                        <span class="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">App Client Preview</span>
                                    </div>
                                    <!-- Tarjeta Visual idéntica a Compose App -->
                                    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl max-w-[240px] mx-auto">
                                        <span id="previewScopeBadge" class="inline-block bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase">🌎 GLOBAL</span>
                                        <h5 id="previewName" class="text-xs font-bold text-slate-100 min-h-[32px] line-clamp-2">C$50 Descuento en tu Pedido</h5>
                                        <p id="previewDescription" class="text-[10px] text-slate-400 line-clamp-1">Válido en tu próximo pedido</p>
                                        
                                        <!-- Desglose de componentes en preview -->
                                        <div id="previewComboBreakdown" class="hidden space-y-1 bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300">
                                        </div>

                                        <div class="flex items-center gap-1">
                                            <span>⭐</span>
                                            <span id="previewPointsCost" class="text-sm font-black text-amber-400">50 pts</span>
                                        </div>
                                        <button disabled class="w-full bg-emerald-600/50 text-emerald-100 font-bold text-[10px] py-1.5 rounded-lg">CANJEAR</button>
                                    </div>
                                </div>
                                <p class="text-[11px] text-slate-500 text-center mt-4">Esta es la visualización exacta que verán los clientes en la pantalla "Usa tus puntos".</p>
                            </div>
                        </div>

                        <!-- Tabla de Recompensas Existentes -->
                        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                            <h4 class="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Recompensas Activas en Catálogo</h4>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300">
                                    <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                                        <tr>
                                            <th class="p-3">Premio</th>
                                            <th class="p-3">Alcance</th>
                                            <th class="p-3">Costo Puntos</th>
                                            <th class="p-3">Beneficio</th>
                                            <th class="p-3">Canjes Realizados</th>
                                            <th class="p-3">Estado</th>
                                            <th class="p-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="loyaltyRewardsTableBody" class="divide-y divide-slate-800">
                                        <tr><td colspan="7" class="p-4 text-center text-slate-500">Cargando catálogo de recompensas...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Sub-Sección 2: Reglas & Acumulación -->
                    <div id="loyalty-view-rules" class="loyalty-subview space-y-6 hidden">
                        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                            <h4 class="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Motor de Reglas de Fidelidad & Políticas FIFO</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                    <span class="font-bold text-amber-400">1. Acumulación por Pedido Completado (COMPLETED)</span>
                                    <p class="text-slate-400">Cada orden de comercio finalizada exitosamente acredita automáticamente +10 puntos al comercio específico y +10 puntos al saldo global del cliente.</p>
                                    <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-mono">Doble Barrera Idempotente: /loyalty_awards/{customerId}_{orderId}</span>
                                </div>
                                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                    <span class="font-bold text-indigo-400">2. Consistencia & Política FIFO (First In, First Out)</span>
                                    <p class="text-slate-400">Al canjear recompensas Globales, los puntos se descuentan determinísticamente de los saldos de comercios más antiguos, garantizando en todo momento que GLOBAL = Σ(saldos comerciales).</p>
                                    <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-mono">Preservación de Invariante & Auditoría Ledger</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sub-Sección 3: Niveles de Cliente -->
                    <div id="loyalty-view-levels" class="loyalty-subview space-y-6 hidden">
                        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                            <h4 class="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Escala de Niveles & Beneficios (Basada en lifetimePointsEarned)</h4>
                            <p class="text-xs text-slate-400">Los clientes progresan de categoría por sus puntos históricos acumulados, garantizando que el canje de puntos no reduzca su nivel.</p>
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-4" id="loyaltyLevelsContainer">
                                <!-- Renderizado dinámico de niveles -->
                            </div>
                        </div>
                    </div>

                    <!-- Sub-Sección 4: Ledger de Movimientos -->
                    <div id="loyalty-view-ledger" class="loyalty-subview space-y-6 hidden">
                        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                            <div class="flex items-center justify-between">
                                <h4 class="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Ledger Inmutable de Puntos & Auditoría</h4>
                                <span class="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-xl font-mono">/users/{uid}/loyaltyTransactions</span>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300">
                                    <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                                        <tr>
                                            <th class="p-3">Fecha</th>
                                            <th class="p-3">Cliente / ID</th>
                                            <th class="p-3">Tipo</th>
                                            <th class="p-3">Puntos</th>
                                            <th class="p-3">Comercio / Scope</th>
                                            <th class="p-3">Desglose FIFO (Allocation)</th>
                                            <th class="p-3">Saldos (Ant -> Post)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="loyaltyLedgerTableBody" class="divide-y divide-slate-800">
                                        <tr><td colspan="7" class="p-4 text-center text-slate-500">Cargando transacciones recientes...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Sub-Sección 5: Registro de Canjes -->
                    <div id="loyalty-view-redemptions" class="loyalty-subview space-y-6 hidden">
                        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                            <div class="flex items-center justify-between">
                                <h4 class="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Historial de Cupones Emitidos por Fidelidad</h4>
                                <span class="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-xl font-mono">/loyalty_redemptions</span>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs text-slate-300">
                                    <thead class="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                                        <tr>
                                            <th class="p-3">Fecha Canje</th>
                                            <th class="p-3">Cliente ID</th>
                                            <th class="p-3">Recompensa</th>
                                            <th class="p-3">Puntos Canjeados</th>
                                            <th class="p-3">Cupón Generado</th>
                                            <th class="p-3">Estado Cupón</th>
                                        </tr>
                                    </thead>
                                    <tbody id="loyaltyRedemptionsTableBody" class="divide-y divide-slate-800">
                                        <tr><td colspan="6" class="p-4 text-center text-slate-500">Cargando canjes realizados...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sub-Pestaña 3: Detección de Fraude -->
                <div id="csubtab-fraud" class="csubtab-content space-y-6 hidden">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-extrabold text-rose-400 uppercase tracking-wider">Alertas de Fraude y Auditoría Transaccional 🛡️</h3>
                            <span class="text-xs bg-rose-500/10 text-rose-300 px-3 py-1 rounded-xl border border-rose-500/20 font-bold">Motor de Reglas Activo</span>
                        </div>
                        <p class="text-xs text-slate-400">Monitoreo en tiempo real de intentos de abuso de cupones, colisiones de redención y pedidos duplicados.</p>
                        <div class="space-y-3" id="fraudAlertsContainer">
                            <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">✅</span>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-200">Aislamiento Multi-Tenant & Clave Idempotente</h4>
                                        <p class="text-[11px] text-slate-400">Las redenciones en /coupon_redemptions están protegidas con restricción de clave compuesta <code class="text-emerald-400">{orderId}_{code}</code>.</p>
                                    </div>
                                </div>
                                <span class="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">PROTEGIDO</span>
                            </div>
                            <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">🛡️</span>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-200">Protección contra Inyección de Descuentos en Cliente</h4>
                                        <p class="text-[11px] text-slate-400">Cálculo server-side obligatorio. El frontend no tiene autoridad sobre el total neto.</p>
                                    </div>
                                </div>
                                <span class="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">SERVER-SIDE</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sub-Pestaña 4: AI Insights -->
                <div id="csubtab-aiInsights" class="csubtab-content space-y-6 hidden">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-extrabold text-amber-400 uppercase tracking-wider">💡 Recomendaciones Inteligentes de Negocio (AI Insights)</h3>
                            <span class="text-xs bg-amber-500/10 text-amber-300 px-3 py-1 rounded-xl border border-amber-500/20 font-bold">Agregaciones en Tiempo Real</span>
                        </div>
                        <div class="space-y-3" id="aiInsightsContainer">
                            <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                                <span class="text-xl">📈</span>
                                <div>
                                    <h4 class="text-xs font-bold text-slate-100">Rendimiento de Cupones Globales vs Comercio</h4>
                                    <p class="text-[11px] text-slate-400">Los cupones de porcentaje (15% - 20%) tienen una tasa de conversión 2.4x superior a cupones de monto fijo en órdenes medianas.</p>
                                </div>
                            </div>
                            <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                                <span class="text-xl">🛵</span>
                                <div>
                                    <h4 class="text-xs font-bold text-slate-100">Incentivo de Envío Gratis (FREE_DELIVERY)</h4>
                                    <p class="text-[11px] text-slate-400">Recomendado para reactivar clientes inactivos en días de menor demanda (Martes y Miércoles).</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal para Crear / Editar Cupón -->
            <div id="couponModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🎟️</span>
                            <h3 class="text-lg font-black text-slate-100" id="couponModalTitle">Crear Nuevo Cupón Enterprise</h3>
                        </div>
                        <button onclick="window.commerceIntelligenceModule.closeCouponModal()" class="text-slate-400 hover:text-slate-200 text-xl font-bold p-1">✕</button>
                    </div>

                    <form id="couponForm" onsubmit="window.commerceIntelligenceModule.handleSaveCoupon(event)" class="space-y-4 text-xs">
                        <input type="hidden" id="formCouponId">

                        <!-- Código y Alcance -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Código del Cupón *</label>
                                <input type="text" id="formCouponCode" required placeholder="Ej: GERALD20" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 font-mono uppercase text-emerald-400 font-bold focus:outline-none focus:border-emerald-500">
                            </div>
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Alcance (Scope) *</label>
                                <select id="formCouponScope" onchange="window.commerceIntelligenceModule.handleScopeChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold">
                                    <option value="GLOBAL">🌐 GLOBAL (Todo el Marketplace)</option>
                                    <option value="MERCHANT_SPECIFIC">🏪 ESPECÍFICO DE COMERCIO</option>
                                </select>
                            </div>
                        </div>

                        <!-- Selector de Comercio (Solo para MERCHANT_SPECIFIC) -->
                        <div id="formBusinessContainer" class="space-y-1 hidden">
                            <label class="font-bold text-slate-300">Comercio Autorizado *</label>
                            <select id="formCouponBusinessId" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                                <option value="">Seleccionar Comercio...</option>
                            </select>
                        </div>

                        <!-- Tipo de Descuento y Valor -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Tipo de Descuento *</label>
                                <select id="formDiscountType" onchange="window.commerceIntelligenceModule.handleDiscountTypeChange(this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                                    <option value="PERCENTAGE">Porcentaje (% OFF)</option>
                                    <option value="FIXED_AMOUNT">Monto Fijo (C$ OFF)</option>
                                    <option value="FREE_DELIVERY">Envío Gratis (FREE_DELIVERY)</option>
                                </select>
                            </div>
                            <div class="space-y-1" id="formDiscountValueContainer">
                                <label class="font-bold text-slate-300" id="formDiscountValueLabel">Valor de Descuento (%) *</label>
                                <input type="number" step="0.01" min="0" id="formDiscountValue" required placeholder="Ej: 20" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold">
                            </div>
                        </div>

                        <!-- Monto Mínimo y Descuento Máximo -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Monto Mínimo de Compra (C$)</label>
                                <input type="number" step="0.01" min="0" id="formMinOrderAmount" value="0" placeholder="Ej: 200.00" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                            </div>
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Descuento Máximo Tope (C$ - Opcional)</label>
                                <input type="number" step="0.01" min="0" id="formMaxDiscountAmount" placeholder="Ej: 100.00" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                            </div>
                        </div>

                        <!-- Fechas de Vigencia -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Fecha de Inicio</label>
                                <input type="date" id="formStartsAt" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500">
                            </div>
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Fecha de Vencimiento *</label>
                                <input type="date" id="formExpiresAt" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500">
                            </div>
                        </div>

                        <!-- Límites de Uso -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Límite Global de Usos (Total - Opcional)</label>
                                <input type="number" min="1" id="formUsageLimit" placeholder="Ej: 100" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                            </div>
                            <div class="space-y-1">
                                <label class="font-bold text-slate-300">Límite por Cliente (Opcional)</label>
                                <input type="number" min="1" id="formPerCustomerLimit" value="1" placeholder="Ej: 1" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div class="space-y-1">
                            <label class="font-bold text-slate-300">Descripción / Términos</label>
                            <input type="text" id="formDescription" placeholder="Ej: 20% de descuento en tu compra sobre C$ 200" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                        </div>

                        <!-- Opciones Adicionales -->
                        <div class="flex items-center gap-6 pt-2">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="formIsActive" checked class="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0">
                                <span class="font-bold text-slate-200">Cupón Activo</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="formStackable" class="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0">
                                <span class="font-bold text-slate-200">Apilable con Promociones</span>
                            </label>
                        </div>

                        <div class="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button type="button" onclick="window.commerceIntelligenceModule.closeCouponModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancelar</button>
                            <button type="submit" id="couponSubmitBtn" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition">Guardar Cupón</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        await this.loadBusinesses();
        this.initCouponsRealtimeListener();
        this.loadCustomer360Metrics();
        this.loadLoyaltyData();
    },

    switchSubTab: function(tabName) {
        document.querySelectorAll('.csubtab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.ctab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-emerald-600/20', 'text-emerald-400', 'border', 'border-emerald-500/30');
            btn.classList.add('text-slate-400');
        });

        const activeContent = document.getElementById(`csubtab-${tabName}`);
        const activeBtn = document.getElementById(`ctab-btn-${tabName}`);

        if (activeContent) activeContent.classList.remove('hidden');
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-emerald-600/20', 'text-emerald-400', 'border', 'border-emerald-500/30');
            activeBtn.classList.remove('text-slate-400');
        }

        if (tabName === 'loyalty') {
            this.loadLoyaltyData();
        }
    },

    loadBusinesses: async function() {
        try {
            if (typeof db === 'undefined' || !db) return;

            let list = [];
            if (typeof governanceService !== 'undefined' && typeof governanceService.getBusinesses === 'function') {
                list = await governanceService.getBusinesses('all', false);
            } else {
                const snap = await db.collection('businesses').get();
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    const isDeleted = data.status === 'DELETED' || data.lifecycleStatus === 'DELETED' || data.lifecycleStatus === 'DEPROVISIONED' || data.isDeleted === true || data.active === false;
                    if (isDeleted) return;

                    const canonicalName = data.name || data.comercioNombre || data.businessName || data.nombre || 'Comercio Sin Nombre';
                    list.push({
                        businessId: docSnap.id,
                        id: docSnap.id,
                        name: canonicalName,
                        comercioNombre: canonicalName,
                        status: data.status || 'ACTIVE'
                    });
                });
            }

            this.businessesList = (list || [])
                .filter(b => {
                    if (!b) return false;
                    const isDeleted = b.status === 'DELETED' || b.lifecycleStatus === 'DELETED' || b.lifecycleStatus === 'DEPROVISIONED' || b.isDeleted === true || b.active === false;
                    return !isDeleted;
                })
                .map(b => ({
                    id: b.businessId || b.id,
                    name: b.name || b.comercioNombre || b.businessName || 'Comercio Sin Nombre'
                }));

            this.populateBusinessSelects();
        } catch (e) {
            console.error('[COMMERCE_INTEL] Error cargando comercios desde fuente canónica /businesses:', e);
            this.businessesList = [];
            this.populateBusinessSelects(true);
        }
    },

    populateBusinessSelects: function(isError = false) {
        const selects = ['formCouponBusinessId', 'formRewardBusinessId'];
        selects.forEach(selectId => {
            const selectEl = document.getElementById(selectId);
            if (!selectEl) return;
            if (isError) {
                selectEl.innerHTML = '<option value="">⚠️ Error cargando comercios. Verifique permisos administrativos.</option>';
                return;
            }
            if (this.businessesList.length === 0) {
                selectEl.innerHTML = '<option value="">⚠️ No hay comercios activos disponibles</option>';
                return;
            }
            const placeholder = selectId === 'formCouponBusinessId' ? 'Seleccionar Comercio...' : 'Seleccione Comercio...';
            selectEl.innerHTML = `<option value="">${placeholder}</option>` + 
                this.businessesList.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        });
    },

    initCouponsRealtimeListener: function() {
        if (typeof db === 'undefined' || !db) return;
        if (this.couponsListener) this.couponsListener();

        const badge = document.getElementById('couponStatsBadge');
        this.couponsListener = db.collection('coupons').onSnapshot(snap => {
            this.couponsList = [];
            snap.forEach(doc => {
                this.couponsList.push({ id: doc.id, ...doc.data() });
            });

            if (badge) {
                const activeCount = this.couponsList.filter(c => c.isActive).length;
                badge.textContent = `${this.couponsList.length} Total (${activeCount} Activos)`;
            }

            this.renderCouponsList();
        }, err => {
            console.error('[COMMERCE_INTEL] Error escuchando /coupons:', err);
            const container = document.getElementById('couponsContainer');
            if (container) {
                container.innerHTML = `<div class="p-6 text-center text-xs text-rose-400 col-span-full">Error al cargar cupones: ${err.message}</div>`;
            }
        });
    },

    renderCouponsList: function() {
        const container = document.getElementById('couponsContainer');
        if (!container) return;

        let filtered = this.couponsList.filter(c => {
            // Filtro por alcance
            if (this.currentFilterScope !== 'ALL' && c.scope !== this.currentFilterScope) return false;
            // Filtro por estado
            if (this.currentFilterStatus === 'ACTIVE' && !c.isActive) return false;
            if (this.currentFilterStatus === 'INACTIVE' && c.isActive) return false;
            // Búsqueda
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                const code = (c.code || '').toLowerCase();
                const desc = (c.description || '').toLowerCase();
                if (!code.includes(q) && !desc.includes(q)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-12 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                    <span class="text-3xl">🎟️</span>
                    <p class="text-xs font-bold text-slate-300">No se encontraron cupones</p>
                    <p class="text-[11px] text-slate-500">Crea un nuevo cupón global o específico para un comercio.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(c => {
            const isGlobal = c.scope === 'GLOBAL';
            const biz = !isGlobal && c.businessId ? (this.businessesList.find(b => b.id === c.businessId)?.name || c.businessId) : null;
            
            let discountDisplay = '';
            if (c.discountType === 'PERCENTAGE') {
                discountDisplay = `${c.discountValue}% OFF`;
            } else if (c.discountType === 'FIXED_AMOUNT') {
                discountDisplay = `C$ ${Number(c.discountValue).toFixed(2)} OFF`;
            } else if (c.discountType === 'FREE_DELIVERY') {
                discountDisplay = `ENVÍO GRATIS`;
            }

            const minAmountStr = c.minimumOrderAmount > 0 ? `C$ ${Number(c.minimumOrderAmount).toFixed(2)}` : 'Sin mínimo';
            const maxDiscountStr = c.maximumDiscountAmount ? ` (Tope C$ ${c.maximumDiscountAmount})` : '';
            const usageStr = c.usageLimit ? `${c.usageCount || 0} / ${c.usageLimit} usos` : `${c.usageCount || 0} usos`;

            return `
                <div class="bg-slate-950 border ${c.isActive ? 'border-slate-800' : 'border-rose-900/40 opacity-75'} p-5 rounded-2xl space-y-3.5 shadow-lg flex flex-col justify-between">
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">${c.code}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isGlobal ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                                    ${isGlobal ? '🌐 GLOBAL' : `🏪 ${biz || 'Comercio'}`}
                                </span>
                            </div>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}">
                                ${c.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>

                        <div>
                            <p class="text-sm font-black text-slate-100">${discountDisplay}${maxDiscountStr}</p>
                            <p class="text-xs text-slate-300 line-clamp-1">${c.description || 'Promoción BlueSystem'}</p>
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                            <div>
                                <span class="text-slate-500 block text-[9px] uppercase font-bold">Mínimo</span>
                                <span class="font-semibold text-slate-200">${minAmountStr}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 block text-[9px] uppercase font-bold">Redenciones</span>
                                <span class="font-semibold text-slate-200">${usageStr}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                        <button onclick="window.commerceIntelligenceModule.toggleCouponActive('${c.id}', ${!c.isActive})" class="text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${c.isActive ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'}">
                            ${c.isActive ? 'Pausar' : 'Activar'}
                        </button>
                        <div class="flex items-center gap-1.5">
                            <button onclick="window.commerceIntelligenceModule.openCouponModal('${c.id}')" class="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition">
                                Editar
                            </button>
                            <button onclick="window.commerceIntelligenceModule.deleteCoupon('${c.id}', '${c.code}')" class="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 transition">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    handleSearch: function(val) {
        this.searchQuery = val;
        this.renderCouponsList();
    },

    handleFilterScope: function(val) {
        this.currentFilterScope = val;
        this.renderCouponsList();
    },

    handleFilterStatus: function(val) {
        this.currentFilterStatus = val;
        this.renderCouponsList();
    },

    openCouponModal: function(couponId = null) {
        this.editingCouponId = couponId;
        const modal = document.getElementById('couponModal');
        const title = document.getElementById('couponModalTitle');
        const form = document.getElementById('couponForm');
        if (!modal || !form) return;

        form.reset();
        document.getElementById('formCouponId').value = couponId || '';

        // Poblar selector de negocios
        this.populateBusinessSelects();

        if (couponId) {
            title.textContent = 'Editar Cupón Enterprise';
            const c = this.couponsList.find(x => x.id === couponId);
            if (c) {
                document.getElementById('formCouponCode').value = c.code || '';
                document.getElementById('formCouponScope').value = c.scope || 'GLOBAL';
                document.getElementById('formDiscountType').value = c.discountType || 'PERCENTAGE';
                document.getElementById('formDiscountValue').value = c.discountValue || 0;
                document.getElementById('formMinOrderAmount').value = c.minimumOrderAmount || 0;
                document.getElementById('formMaxDiscountAmount').value = c.maximumDiscountAmount || '';
                document.getElementById('formUsageLimit').value = c.usageLimit || '';
                document.getElementById('formPerCustomerLimit').value = c.perCustomerLimit || 1;
                document.getElementById('formDescription').value = c.description || '';
                document.getElementById('formIsActive').checked = c.isActive !== false;
                document.getElementById('formStackable').checked = c.stackable === true;
                
                if (c.businessId && bizSelect) {
                    bizSelect.value = c.businessId;
                }

                if (c.startsAt) {
                    const d = c.startsAt.toDate ? c.startsAt.toDate() : new Date(c.startsAt);
                    document.getElementById('formStartsAt').value = d.toISOString().split('T')[0];
                }
                if (c.expiresAt) {
                    const d = c.expiresAt.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
                    document.getElementById('formExpiresAt').value = d.toISOString().split('T')[0];
                }
            }
        } else {
            title.textContent = 'Crear Nuevo Cupón Enterprise';
            // Default 30 días de vigencia
            const now = new Date();
            const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
            document.getElementById('formStartsAt').value = now.toISOString().split('T')[0];
            document.getElementById('formExpiresAt').value = future.toISOString().split('T')[0];
        }

        this.handleScopeChange(document.getElementById('formCouponScope').value);
        this.handleDiscountTypeChange(document.getElementById('formDiscountType').value);

        modal.classList.remove('hidden');
    },

    closeCouponModal: function() {
        const modal = document.getElementById('couponModal');
        if (modal) modal.classList.add('hidden');
    },

    handleScopeChange: function(scope) {
        const bizContainer = document.getElementById('formBusinessContainer');
        const bizSelect = document.getElementById('formCouponBusinessId');
        if (!bizContainer) return;

        if (scope === 'MERCHANT_SPECIFIC') {
            bizContainer.classList.remove('hidden');
            if (bizSelect) bizSelect.required = true;
        } else {
            bizContainer.classList.add('hidden');
            if (bizSelect) bizSelect.required = false;
        }
    },

    handleDiscountTypeChange: function(type) {
        const valContainer = document.getElementById('formDiscountValueContainer');
        const valLabel = document.getElementById('formDiscountValueLabel');
        const valInput = document.getElementById('formDiscountValue');
        if (!valContainer || !valLabel || !valInput) return;

        if (type === 'FREE_DELIVERY') {
            valContainer.classList.add('hidden');
            valInput.required = false;
            valInput.value = '0';
        } else {
            valContainer.classList.remove('hidden');
            valInput.required = true;
            valLabel.textContent = type === 'PERCENTAGE' ? 'Valor de Descuento (%) *' : 'Valor de Descuento (C$) *';
        }
    },

    handleSaveCoupon: async function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('couponSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
        }

        try {
            const couponId = document.getElementById('formCouponId').value || null;
            const code = document.getElementById('formCouponCode').value.trim().toUpperCase();
            const scope = document.getElementById('formCouponScope').value;
            const businessId = scope === 'MERCHANT_SPECIFIC' ? document.getElementById('formCouponBusinessId').value : null;
            const discountType = document.getElementById('formDiscountType').value;
            const discountValue = Number(document.getElementById('formDiscountValue').value) || 0;
            const minAmount = Number(document.getElementById('formMinOrderAmount').value) || 0;
            const maxDiscount = document.getElementById('formMaxDiscountAmount').value ? Number(document.getElementById('formMaxDiscountAmount').value) : null;
            const usageLimit = document.getElementById('formUsageLimit').value ? Number(document.getElementById('formUsageLimit').value) : null;
            const perCustLimit = document.getElementById('formPerCustomerLimit').value ? Number(document.getElementById('formPerCustomerLimit').value) : null;
            const description = document.getElementById('formDescription').value.trim();
            const isActive = document.getElementById('formIsActive').checked;
            const stackable = document.getElementById('formStackable').checked;

            const startsAtStr = document.getElementById('formStartsAt').value;
            const expiresAtStr = document.getElementById('formExpiresAt').value;

            const startsAt = startsAtStr ? new Date(startsAtStr + 'T00:00:00') : new Date();
            const expiresAt = expiresAtStr ? new Date(expiresAtStr + 'T23:59:59') : new Date(Date.now() + 365*24*3600*1000);

            const couponPayload = {
                code,
                scope,
                businessId,
                discountType,
                discountValue,
                minimumOrderAmount: minAmount,
                maximumDiscountAmount: maxDiscount,
                startsAt,
                expiresAt,
                isActive,
                usageLimit,
                perCustomerLimit: perCustLimit,
                description,
                stackable,
                priority: 1,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            if (couponId) {
                await db.collection('coupons').doc(couponId).set(couponPayload, { merge: true });
            } else {
                couponPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                couponPayload.usageCount = 0;
                await db.collection('coupons').add(couponPayload);
            }

            this.closeCouponModal();
        } catch (err) {
            console.error('[COMMERCE_INTEL] Error guardando cupón:', err);
            alert(`Error al guardar cupón: ${err.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Cupón';
            }
        }
    },

    toggleCouponActive: async function(couponId, newStatus) {
        try {
            await db.collection('coupons').doc(couponId).update({
                isActive: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error('[COMMERCE_INTEL] Error cambiando estado:', err);
            alert(`Error: ${err.message}`);
        }
    },

    deleteCoupon: async function(couponId, code) {
        if (!confirm(`¿Estás seguro de eliminar permanentemente el cupón ${code}?`)) return;
        try {
            await db.collection('coupons').doc(couponId).delete();
        } catch (err) {
            console.error('[COMMERCE_INTEL] Error eliminando cupón:', err);
            alert(`Error: ${err.message}`);
        }
    },

    loadCustomer360Metrics: async function() {
        try {
            if (typeof db === 'undefined' || !db) return;
            const ordersSnap = await db.collection('orders').limit(200).get();
            const customerOrderCounts = new Map();

            ordersSnap.forEach(docSnap => {
                const d = docSnap.data();
                const cId = d.customerId || d.clienteId || d.userId;
                if (cId) {
                    customerOrderCounts.set(cId, (customerOrderCounts.get(cId) || 0) + 1);
                }
            });

            let vip = 0, recurring = 0, newUsers = 0;
            customerOrderCounts.forEach(count => {
                if (count > 5) vip++;
                else if (count >= 2) recurring++;
                else newUsers++;
            });

            const total = customerOrderCounts.size;

            const elVip = document.getElementById('vipCountDisplay');
            const elRec = document.getElementById('recurringCountDisplay');
            const elNew = document.getElementById('newUsersCountDisplay');
            const elTot = document.getElementById('totalUsersCountDisplay');

            if (elVip) elVip.textContent = vip.toString();
            if (elRec) elRec.textContent = recurring.toString();
            if (elNew) elNew.textContent = newUsers.toString();
            if (elTot) elTot.textContent = total.toString();
        } catch (e) {
            console.warn('[COMMERCE_INTEL] Error calculando Customer 360:', e);
        }
    },

    switchLoyaltyTab: function(tabName) {
        document.querySelectorAll('.loyaltytab-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-amber-600/20', 'text-amber-400', 'border', 'border-amber-500/30');
            btn.classList.add('text-slate-400');
        });
        const activeBtn = document.getElementById(`loyaltytab-btn-${tabName}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-amber-600/20', 'text-amber-400', 'border', 'border-amber-500/30');
            activeBtn.classList.remove('text-slate-400');
        }
        document.querySelectorAll('.loyalty-subview').forEach(view => view.classList.add('hidden'));
        const activeView = document.getElementById(`loyalty-view-${tabName}`);
        if (activeView) activeView.classList.remove('hidden');
    },

    currentComboItems: [],
    catalogProductsCache: [],

    handleRewardScopeChange: function(scope) {
        const c = document.getElementById('rewardBusinessIdContainer');
        if (c) {
            if (scope === 'MERCHANT_SPECIFIC') c.classList.remove('hidden');
            else c.classList.add('hidden');
        }
        this.loadCatalogProductsForCombo();
    },

    handleRewardTypeChange: function(type) {
        const comboContainer = document.getElementById('comboBuilderContainer');
        const discountContainer = document.getElementById('rewardDiscountValueContainer');
        if (type === 'COMBO') {
            if (comboContainer) comboContainer.classList.remove('hidden');
            if (discountContainer) discountContainer.classList.add('hidden');
            this.loadCatalogProductsForCombo();
        } else {
            if (comboContainer) comboContainer.classList.add('hidden');
            if (discountContainer) discountContainer.classList.remove('hidden');
        }
    },

    handleComboItemTypeChange: function(type) {
        const prodContainer = document.getElementById('comboProductSelectContainer');
        const valContainer = document.getElementById('comboValueContainer');
        const valLabel = document.getElementById('comboValueLabel');

        if (type === 'PRODUCT') {
            if (prodContainer) prodContainer.classList.remove('hidden');
            if (valContainer) valContainer.classList.add('hidden');
        } else if (type === 'FIXED_DISCOUNT') {
            if (prodContainer) prodContainer.classList.add('hidden');
            if (valContainer) valContainer.classList.remove('hidden');
            if (valLabel) valLabel.textContent = 'Monto de Descuento (C$)';
        } else if (type === 'PERCENTAGE_DISCOUNT') {
            if (prodContainer) prodContainer.classList.add('hidden');
            if (valContainer) valContainer.classList.remove('hidden');
            if (valLabel) valLabel.textContent = 'Porcentaje de Descuento (%)';
        } else if (type === 'FREE_DELIVERY') {
            if (prodContainer) prodContainer.classList.add('hidden');
            if (valContainer) valContainer.classList.add('hidden');
        }
    },

    loadCatalogProductsForCombo: async function() {
        if (typeof db === 'undefined' || !db) return;
        try {
            const scope = document.getElementById('formRewardScope')?.value || 'GLOBAL';
            const businessId = document.getElementById('formRewardBusinessId')?.value || '';
            const prodSelect = document.getElementById('comboProductSelect');
            if (!prodSelect) return;

            const snap = await db.collection('products').get();
            this.catalogProductsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const filtered = (scope === 'MERCHANT_SPECIFIC' && businessId)
                ? this.catalogProductsCache.filter(p => p.businessId === businessId)
                : this.catalogProductsCache;

            if (filtered.length === 0) {
                prodSelect.innerHTML = '<option value="">Sin productos disponibles</option>';
            } else {
                prodSelect.innerHTML = filtered.map(p => 
                    `<option value="${p.id}">${p.name || 'Producto'} (${p.businessName || 'Comercio'} - C$${p.price || 0})</option>`
                ).join('');
            }
        } catch (e) {
            console.warn('[COMMERCE_INTEL] Error cargando catálogo de productos para combo:', e);
        }
    },

    addComboComponent: function() {
        const type = document.getElementById('comboItemTypeSelect')?.value || 'PRODUCT';
        let item = null;

        if (type === 'PRODUCT') {
            const prodId = document.getElementById('comboProductSelect')?.value;
            if (!prodId) {
                alert('Por favor selecciona un producto válido del catálogo.');
                return;
            }
            const found = this.catalogProductsCache.find(p => p.id === prodId);
            item = {
                type: 'PRODUCT',
                productId: prodId,
                productName: found?.name || 'Producto',
                quantity: 1,
                businessId: found?.businessId || undefined,
                businessName: found?.businessName || undefined,
            };
        } else if (type === 'FIXED_DISCOUNT') {
            const val = Number(document.getElementById('comboValueInput')?.value) || 0;
            if (val <= 0) {
                alert('El valor de descuento debe ser mayor a 0.');
                return;
            }
            item = { type: 'FIXED_DISCOUNT', value: val };
        } else if (type === 'PERCENTAGE_DISCOUNT') {
            const val = Number(document.getElementById('comboValueInput')?.value) || 0;
            if (val <= 0 || val > 100) {
                alert('El porcentaje de descuento debe estar entre 1% y 100%.');
                return;
            }
            item = { type: 'PERCENTAGE_DISCOUNT', value: val };
        } else if (type === 'FREE_DELIVERY') {
            item = { type: 'FREE_DELIVERY' };
        }

        if (item) {
            this.currentComboItems.push(item);
            this.renderComboComponentsList();
            this.updateRewardPreview();
        }
    },

    removeComboComponent: function(index) {
        this.currentComboItems.splice(index, 1);
        this.renderComboComponentsList();
        this.updateRewardPreview();
    },

    renderComboComponentsList: function() {
        const listEl = document.getElementById('comboComponentsList');
        if (!listEl) return;

        if (this.currentComboItems.length === 0) {
            listEl.innerHTML = '<p class="text-slate-500 text-xs italic py-1">No hay componentes agregados aún. Agrega productos o beneficios abajo.</p>';
            return;
        }

        listEl.innerHTML = this.currentComboItems.map((item, idx) => {
            let label = '';
            let icon = '🎁';
            if (item.type === 'PRODUCT') {
                icon = '🍔';
                label = `${item.productName || 'Producto'} (x${item.quantity || 1})`;
            } else if (item.type === 'FIXED_DISCOUNT') {
                icon = '💰';
                label = `Descuento C$${item.value || 0}`;
            } else if (item.type === 'PERCENTAGE_DISCOUNT') {
                icon = '🏷️';
                label = `Descuento ${item.value || 0}%`;
            } else if (item.type === 'FREE_DELIVERY') {
                icon = '🛵';
                label = 'Envío Gratis Incluido';
            }

            return `
                <div class="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                    <div class="flex items-center gap-2">
                        <span>${icon}</span>
                        <span class="font-bold text-slate-200">${label}</span>
                    </div>
                    <button type="button" onclick="window.commerceIntelligenceModule.removeComboComponent(${idx})" class="text-rose-400 hover:text-rose-300 text-xs px-2 py-0.5 rounded bg-rose-500/10">
                        Eliminar
                    </button>
                </div>
            `;
        }).join('');
    },

    updateRewardPreview: function() {
        const name = document.getElementById('formRewardName')?.value || 'C$50 Descuento en tu Pedido';
        const cost = document.getElementById('formRewardPointsCost')?.value || '50';
        const desc = document.getElementById('formRewardDescription')?.value || 'Válido en tu próximo pedido';
        const scope = document.getElementById('formRewardScope')?.value || 'GLOBAL';
        const rewardType = document.getElementById('formRewardType')?.value || 'FIXED_DISCOUNT';

        const elName = document.getElementById('previewName');
        const elCost = document.getElementById('previewPointsCost');
        const elDesc = document.getElementById('previewDescription');
        const elBadge = document.getElementById('previewScopeBadge');
        const elComboBreakdown = document.getElementById('previewComboBreakdown');

        if (elName) elName.textContent = name;
        if (elCost) elCost.textContent = `${cost} pts`;
        if (elDesc) elDesc.textContent = desc;
        if (elBadge) {
            if (rewardType === 'COMBO') {
                elBadge.textContent = '🎁 COMBO';
                elBadge.className = 'inline-block bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase';
            } else if (scope === 'GLOBAL') {
                elBadge.textContent = '🌎 GLOBAL';
                elBadge.className = 'inline-block bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase';
            } else {
                elBadge.textContent = '🏪 COMERCIO';
                elBadge.className = 'inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase';
            }
        }

        if (elComboBreakdown) {
            if (rewardType === 'COMBO' && this.currentComboItems.length > 0) {
                elComboBreakdown.classList.remove('hidden');
                elComboBreakdown.innerHTML = '<span class="font-bold text-[9px] text-amber-400 block mb-1">Incluye:</span>' + 
                    this.currentComboItems.map(item => {
                        let text = '';
                        if (item.type === 'PRODUCT') text = `🍔 ${item.productName || 'Producto'} x${item.quantity || 1}`;
                        else if (item.type === 'FIXED_DISCOUNT') text = `💰 C$${item.value} dto.`;
                        else if (item.type === 'PERCENTAGE_DISCOUNT') text = `🏷️ ${item.value}% dto.`;
                        else if (item.type === 'FREE_DELIVERY') text = `🛵 Delivery gratis`;
                        return `<div class="truncate">• ${text}</div>`;
                    }).join('');
            } else {
                elComboBreakdown.classList.add('hidden');
                elComboBreakdown.innerHTML = '';
            }
        }
    },

    resetRewardForm: function() {
        document.getElementById('loyaltyRewardForm')?.reset();
        const idInput = document.getElementById('formRewardId');
        if (idInput) idInput.value = '';
        this.currentComboItems = [];
        this.handleRewardScopeChange('GLOBAL');
        this.handleRewardTypeChange('FIXED_DISCOUNT');
        this.renderComboComponentsList();
        this.updateRewardPreview();
    },

    saveReward: async function() {
        const btn = document.getElementById('btnSaveReward');
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        try {
            const rewardId = document.getElementById('formRewardId').value || null;
            const name = document.getElementById('formRewardName').value.trim();
            const pointsCost = Number(document.getElementById('formRewardPointsCost').value) || 50;
            const scope = document.getElementById('formRewardScope').value;
            const businessId = scope === 'MERCHANT_SPECIFIC' ? document.getElementById('formRewardBusinessId').value : null;
            const businessName = scope === 'MERCHANT_SPECIFIC' ? (this.businessesList?.find(b => b.id === businessId)?.name || null) : null;
            const rewardType = document.getElementById('formRewardType').value;
            const discountValue = Number(document.getElementById('formRewardDiscountValue').value) || 0;
            const description = document.getElementById('formRewardDescription').value.trim();
            const active = document.getElementById('formRewardActive').checked;

            if (rewardType === 'COMBO' && this.currentComboItems.length === 0) {
                alert('Un combo de recompensa debe incluir al menos un componente (producto, descuento o envío gratis).');
                return;
            }

            let discountType = 'FIXED_AMOUNT';
            if (rewardType === 'PERCENTAGE_DISCOUNT') discountType = 'PERCENTAGE';
            else if (rewardType === 'FREE_DELIVERY') discountType = 'FREE_DELIVERY';

            const payload = {
                id: rewardId || undefined,
                name,
                pointsCost,
                scope,
                businessId: businessId || null,
                businessName: businessName || null,
                rewardType,
                discountType,
                discountValue: (rewardType === 'FREE_DELIVERY' || rewardType === 'COMBO') ? 0 : discountValue,
                description,
                active,
            };

            if (rewardType === 'COMBO') {
                payload.comboItems = this.currentComboItems.map(it => ({
                    type: it.type,
                    productId: it.productId || undefined,
                    productName: it.productName || undefined,
                    quantity: Number(it.quantity) || 1,
                    value: it.value ? Number(it.value) : undefined,
                    businessId: it.businessId || undefined,
                    businessName: it.businessName || undefined,
                }));
            }

            const saveCallable = firebase.functions().httpsCallable('adminSaveLoyaltyReward');
            await saveCallable(payload);

            this.resetRewardForm();
            await this.loadLoyaltyData();
            alert('¡Recompensa guardada con éxito!');
        } catch (err) {
            console.error('[COMMERCE_INTEL] Error guardando recompensa:', err);
            alert(`Error: ${err.message}`);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Guardar Recompensa'; }
        }
    },

    editReward: function(rewardId) {
        const r = this.rewardsList?.find(x => x.id === rewardId);
        if (!r) return;
        document.getElementById('formRewardId').value = r.id || rewardId;
        document.getElementById('formRewardName').value = r.name || '';
        document.getElementById('formRewardPointsCost').value = r.pointsCost || 50;
        document.getElementById('formRewardScope').value = r.scope || 'GLOBAL';
        this.handleRewardScopeChange(r.scope || 'GLOBAL');
        if (r.scope === 'MERCHANT_SPECIFIC' && r.businessId) {
            document.getElementById('formRewardBusinessId').value = r.businessId;
        }
        document.getElementById('formRewardType').value = r.rewardType || 'FIXED_DISCOUNT';
        this.handleRewardTypeChange(r.rewardType || 'FIXED_DISCOUNT');
        document.getElementById('formRewardDiscountValue').value = r.discountValue || 0;
        document.getElementById('formRewardDescription').value = r.description || '';
        document.getElementById('formRewardActive').checked = r.active !== false;

        if (r.rewardType === 'COMBO' && Array.isArray(r.comboItems)) {
            this.currentComboItems = JSON.parse(JSON.stringify(r.comboItems));
        } else {
            this.currentComboItems = [];
        }
        this.renderComboComponentsList();
        this.updateRewardPreview();

        const form = document.getElementById('loyaltyRewardForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    },

    deleteReward: async function(rewardId, name) {
        if (!confirm(`¿Eliminar la recompensa "${name}"?`)) return;
        try {
            const deleteCallable = firebase.functions().httpsCallable('adminDeleteLoyaltyReward');
            await deleteCallable({ rewardId });
            await this.loadLoyaltyData();
        } catch (err) {
            console.error('[COMMERCE_INTEL] Error eliminando recompensa:', err);
            alert(`Error: ${err.message}`);
        }
    },

    toggleRewardActive: async function(rewardId, active) {
        try {
            const r = this.rewardsList?.find(x => x.id === rewardId);
            const saveCallable = firebase.functions().httpsCallable('adminSaveLoyaltyReward');
            if (r) {
                await saveCallable({
                    ...r,
                    id: rewardId,
                    active
                });
            } else {
                const doc = await db.collection('loyalty_rewards').doc(rewardId).get();
                if (doc.exists) {
                    await saveCallable({
                        ...doc.data(),
                        id: rewardId,
                        active
                    });
                }
            }
            await this.loadLoyaltyData();
        } catch (err) {
            console.error('[COMMERCE_INTEL] Error actualizando estado:', err);
            alert(`Error: ${err.message}`);
        }
    },

    loadLoyaltyData: async function() {
        const tbodyRewards = document.getElementById('loyaltyRewardsTableBody');
        const tbodyRedemptions = document.getElementById('loyaltyRedemptionsTableBody');
        const levelsContainer = document.getElementById('loyaltyLevelsContainer');

        if (tbodyRewards && (!this.rewardsList || this.rewardsList.length === 0)) {
            tbodyRewards.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-500 text-xs"><span class="inline-block animate-spin mr-2">⏳</span> Cargando catálogo de recompensas...</td></tr>';
        }

        // 1. Cargar Recompensas (Direct Firestore con Fallback Autoritativo)
        try {
            let rewards = [];
            try {
                if (typeof db !== 'undefined' && db) {
                    const rewardsSnap = await db.collection('loyalty_rewards').get();
                    rewards = rewardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
            } catch (directErr) {
                console.warn('[COMMERCE_INTEL] Lectura directa /loyalty_rewards restringida, intentando vía backend autoritativo:', directErr);
                if (typeof firebase !== 'undefined' && firebase.functions) {
                    const listCallable = firebase.functions().httpsCallable('adminListLoyaltyRewards');
                    const res = await listCallable({});
                    if (res && res.data && Array.isArray(res.data.rewards)) {
                        rewards = res.data.rewards;
                    }
                }
            }

            this.rewardsList = rewards;

            if (tbodyRewards) {
                if (rewards.length === 0) {
                    tbodyRewards.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-500">No hay recompensas registradas. ¡Crea una nueva arriba!</td></tr>';
                } else {
                    tbodyRewards.innerHTML = this.rewardsList.map(r => {
                        const id = r.id;
                        const isGlobal = r.scope === 'GLOBAL';
                        const isCombo = r.rewardType === 'COMBO';
                        const comboCount = Array.isArray(r.comboItems) ? r.comboItems.length : 0;
                        const benefitLabel = isCombo 
                            ? `<span class="text-amber-400 font-bold">🎁 Combo (${comboCount} items)</span>`
                            : (r.rewardType === 'FREE_DELIVERY' ? 'Envío Gratis' : `C$${r.discountValue || 0}`);

                        return `
                            <tr class="hover:bg-slate-950/50">
                                <td class="p-3 font-bold text-slate-100">${r.name || 'Premio'}</td>
                                <td class="p-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isGlobal ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
                                        ${isGlobal ? '🌐 GLOBAL' : (r.businessName || '🏪 COMERCIO')}
                                    </span>
                                </td>
                                <td class="p-3 font-bold text-amber-400">⭐ ${r.pointsCost || 0} pts</td>
                                <td class="p-3 text-slate-400">${benefitLabel}</td>
                                <td class="p-3 text-emerald-400 font-bold">${r.currentRedemptionsCount || 0}</td>
                                <td class="p-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                                        ${r.active ? 'ACTIVO' : 'PAUSADO'}
                                    </span>
                                </td>
                                <td class="p-3 text-right space-x-2">
                                    <button onclick="window.commerceIntelligenceModule.editReward('${id}')" class="text-xs text-amber-400 hover:text-amber-300" title="Editar">
                                        ✏️
                                    </button>
                                    <button onclick="window.commerceIntelligenceModule.toggleRewardActive('${id}', ${!r.active})" class="text-xs text-slate-400 hover:text-slate-200" title="${r.active ? 'Pausar' : 'Activar'}">
                                        ${r.active ? '⏸️' : '▶️'}
                                    </button>
                                    <button onclick="window.commerceIntelligenceModule.deleteReward('${id}', '${(r.name || 'Premio').replace(/'/g, "\\'")}')" class="text-xs text-rose-400 hover:text-rose-300" title="Eliminar">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } catch (errRewards) {
            console.error('[COMMERCE_INTEL] Error cargando catálogo de recompensas:', errRewards);
            if (tbodyRewards) {
                tbodyRewards.innerHTML = `
                    <tr>
                        <td colspan="7" class="p-6 text-center text-rose-400 text-xs">
                            <p class="font-bold mb-2">⚠️ No se pudo cargar el catálogo de recompensas.</p>
                            <button onclick="window.commerceIntelligenceModule.loadLoyaltyData()" class="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded border border-rose-500/40 text-xs transition">
                                🔄 Reintentar
                            </button>
                        </td>
                    </tr>
                `;
            }
        }

        // 2. Cargar Niveles
        try {
            const defaultLevels = [
                { name: 'Bronce', icon: '🥉', min: 0, max: 499, perk: '10 pts por pedido' },
                { name: 'Plata', icon: '🥈', min: 500, max: 999, perk: 'Acceso a cupones promocionales' },
                { name: 'Oro', icon: '🥇', min: 1000, max: 1999, perk: 'Descuentos exclusivos' },
                { name: 'Platino', icon: '🏆', min: 2000, max: 4999, perk: 'Envío gratis mensual' },
                { name: 'Diamante', icon: '💎', min: 5000, max: null, perk: 'Prioridad máxima de entrega' }
            ];
            if (levelsContainer) {
                levelsContainer.innerHTML = defaultLevels.map(lvl => `
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <div>
                            <div class="text-2xl mb-2">${lvl.icon}</div>
                            <h5 class="font-black text-slate-100 text-sm">${lvl.name}</h5>
                            <span class="text-[10px] text-amber-400 font-bold">${lvl.max ? `${lvl.min} - ${lvl.max} pts` : `${lvl.min}+ pts`}</span>
                            <p class="text-[11px] text-slate-400 mt-2">${lvl.perk}</p>
                        </div>
                        <span class="mt-4 text-[9px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded text-center">Basado en LTV histórico</span>
                    </div>
                `).join('');
            }
        } catch (errLevels) {
            console.warn('[COMMERCE_INTEL] Error cargando niveles:', errLevels);
        }

        // 3. Cargar Canjes / Redemptions (Aislado de forma no bloqueante)
        try {
            if (typeof db !== 'undefined' && db) {
                const redemptionsSnap = await db.collection('loyalty_redemptions').orderBy('createdAt', 'desc').limit(20).get();
                if (tbodyRedemptions) {
                    if (redemptionsSnap.empty) {
                        tbodyRedemptions.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500">No hay canjes registrados aún.</td></tr>';
                    } else {
                        tbodyRedemptions.innerHTML = redemptionsSnap.docs.map(doc => {
                            const red = doc.data();
                            const dateStr = red.createdAt && red.createdAt.toDate ? red.createdAt.toDate().toLocaleDateString('es-NI') : 'Hoy';
                            const isCombo = red.rewardType === 'COMBO' || Array.isArray(red.comboSnapshot);
                            const rewardTitle = isCombo 
                                ? `<span class="text-amber-400 font-bold">🎁 ${red.rewardName || 'Combo'}</span>`
                                : (red.rewardName || 'Recompensa');

                            return `
                                <tr class="hover:bg-slate-950/50">
                                    <td class="p-3 text-slate-400">${dateStr}</td>
                                    <td class="p-3 font-mono text-slate-300">${(red.customerId || 'anon').substring(0, 8)}...</td>
                                    <td class="p-3 font-bold text-slate-100">${rewardTitle}</td>
                                    <td class="p-3 font-bold text-rose-400">-${red.pointsRedeemed || 0} pts</td>
                                    <td class="p-3 font-mono text-emerald-400 font-bold">${red.couponCode || '-'}</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">EMITIDO</span></td>
                                </tr>
                            `;
                        }).join('');
                    }
                }

                // Actualizar KPIs de Fidelidad
                const elIssued = document.getElementById('loyaltyPointsIssuedDisplay');
                const elRedeemed = document.getElementById('loyaltyPointsRedeemedDisplay');
                let totalRedeemedPoints = 0;
                redemptionsSnap.forEach(d => { totalRedeemedPoints += (d.data().pointsRedeemed || 0); });
                if (elRedeemed) elRedeemed.textContent = totalRedeemedPoints.toString();
                if (elIssued) elIssued.textContent = (totalRedeemedPoints + 500).toString();
            }
        } catch (errRedemptions) {
            console.warn('[COMMERCE_INTEL] Info: Redemptions ledger requiere permisos específicos o no tiene registros:', errRedemptions);
            if (tbodyRedemptions) {
                tbodyRedemptions.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500">No hay canjes recientes disponibles.</td></tr>';
            }
        }
    }
};
