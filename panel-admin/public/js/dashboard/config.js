// Módulo de Configuración Global del Sistema (system_config/global) y Comisiones de Comercios
const configModule = {
    currentGlobalCommissionRate: 0.15,
    businessesList: [],

    render: () => {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xl">⚙️</span>
                            <h2 class="text-xl font-bold text-gray-100">Configuración Global & Comisiones Enterprise</h2>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">Parámetros operativos y políticas de comisión comercial con snapshot inmutable y herencia dinámica.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="configModule.loadBusinesses()" class="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs rounded-xl font-semibold transition flex items-center gap-1.5">
                            <span>🔄</span> Recargar Comercios
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Formulario de Configuración -->
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
                        <h3 class="text-sm font-semibold text-gray-200">🛡️ Estado, Comisiones y Operación</h3>

                        <form id="configForm" onsubmit="configModule.handleSubmit(event)" class="space-y-4">
                            <!-- Modo Mantenimiento -->
                            <div class="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-2">
                                <label class="flex items-center justify-between cursor-pointer">
                                    <span class="text-xs font-bold text-gray-300">🚨 Modo Mantenimiento</span>
                                    <input type="checkbox" id="cfg-maintenanceMode" class="w-4 h-4 accent-blue-600 rounded">
                                </label>
                                <p class="text-[10px] text-gray-500">Bloquea la aplicación móvil para todos los usuarios no administradores.</p>
                                <div class="space-y-1 pt-1">
                                    <label class="text-[10px] font-semibold text-gray-400">Mensaje de Mantenimiento:</label>
                                    <input type="text" id="cfg-maintenanceMessage" placeholder="Ej: Mantenimiento programado hasta las 3:00 PM." class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                </div>
                            </div>

                            <!-- Comisión Global de Comercios (Enterprise Baseline) -->
                            <div class="p-3 bg-gray-950 border border-indigo-900/50 rounded-lg space-y-2">
                                <label class="flex items-center justify-between cursor-pointer">
                                    <span class="text-xs font-bold text-indigo-400">🏷️ Comisión Global de Comercios</span>
                                    <input type="checkbox" id="cfg-merchantCommissionEnabled" checked class="w-4 h-4 accent-indigo-500 rounded">
                                </label>
                                <p class="text-[10px] text-gray-400">Tasa de comisión predeterminada aplicada sobre las ventas brutas de productos (<code class="text-indigo-300">merchantGrossSales</code>). Se hereda automáticamente a todos los comercios sin excepción configurada.</p>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Porcentaje Global (%):</label>
                                        <div class="relative">
                                            <input type="number" id="cfg-merchantCommissionPercent" step="0.1" min="0" max="100" value="15.0" required class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-indigo-300 font-bold pr-8">
                                            <span class="absolute right-2.5 top-2 text-xs text-gray-500">%</span>
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Versión Política:</label>
                                        <input type="number" id="cfg-merchantCommissionPolicyVersion" value="1" min="1" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Descripción:</label>
                                        <input type="text" id="cfg-merchantCommissionDescription" value="Comisión sobre ventas brutas del comercio" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Policy ID:</label>
                                        <input type="text" id="cfg-merchantCommissionPolicyId" value="merchant_commission" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                </div>
                            </div>

                            <!-- Control de Versiones (Actualización Obligatoria) -->
                            <div class="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-2">
                                <h4 class="text-xs font-bold text-gray-300">📲 Versión Mínima Requerida</h4>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Código Versión Mínima *</label>
                                        <input type="number" id="cfg-minimumVersion" value="1" min="1" required class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                    <div class="flex items-center pt-4">
                                        <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                            <input type="checkbox" id="cfg-forceUpdate" class="w-4 h-4 accent-blue-600 rounded">
                                            <span class="font-semibold text-red-400">Forzar Actualización</span>
                                        </label>
                                    </div>
                                </div>
                                <p class="text-[10px] text-gray-500">Si el BuildConfig.VERSION_CODE del APK es menor, la app requerirá actualización obligatoria.</p>
                            </div>

                            <!-- Cargo Adicional Global Administrable (Financiero Enterprise) -->
                            <div class="p-3 bg-gray-950 border border-gray-800 rounded-lg space-y-2">
                                <label class="flex items-center justify-between cursor-pointer">
                                    <span class="text-xs font-bold text-amber-400">💰 Cargo Adicional Global</span>
                                    <input type="checkbox" id="cfg-additionalChargeEnabled" class="w-4 h-4 accent-amber-500 rounded">
                                </label>
                                <p class="text-[10px] text-gray-500">Aplica un cargo administrativo/servicio a cada pedido en el Checkout del cliente. Se congela como snapshot inmutable al crearse la orden.</p>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Monto del Cargo (C$):</label>
                                        <input type="number" id="cfg-additionalChargeAmount" step="0.5" min="0" placeholder="0.00" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Versión Política:</label>
                                        <input type="number" id="cfg-additionalChargePolicyVersion" value="1" min="1" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Descripción Visible:</label>
                                        <input type="text" id="cfg-additionalChargeDescription" placeholder="Ej: Cargo adicional por servicio" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Policy ID:</label>
                                        <input type="text" id="cfg-additionalChargePolicyId" value="global_delivery_charge" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                </div>
                            </div>

                            <!-- Tarifas de Entrega Comercial (Commerce Delivery Dynamic Pricing) -->
                            <div class="p-3 bg-gray-950 border border-blue-900/60 rounded-lg space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-blue-400">📦 Tarifas de Entrega Comercio (Commerce Delivery Pricing)</span>
                                    <span class="text-[9px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-bold">Dynamic Road Pricing</span>
                                </div>
                                <p class="text-[10px] text-gray-400">Tarifación dinámica basada en distancia real de ruta (<code class="text-blue-300">routeDistanceKm</code>). La tarifa del cliente y la ganancia del repartidor son 100% independientes.</p>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Tarifa Cliente (C$/km):</label>
                                        <div class="relative">
                                            <input type="number" id="cfg-commerceCustomerRatePerKm" step="0.25" min="0" value="8.00" required class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-blue-400 font-bold pr-12">
                                            <span class="absolute right-2 top-2 text-[10px] text-gray-500 font-mono">C$/km</span>
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Ganancia Motorizado (C$/km):</label>
                                        <div class="relative">
                                            <input type="number" id="cfg-commerceCourierRatePerKm" step="0.25" min="0" value="7.00" required class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-emerald-400 font-bold pr-12">
                                            <span class="absolute right-2 top-2 text-[10px] text-gray-500 font-mono">C$/km</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Versión de Tarifa:</label>
                                        <input type="text" id="cfg-commercePricingVersion" value="v2.2-commerce" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Política de Redondeo:</label>
                                        <input type="text" id="cfg-commerceRoundingPolicy" value="KM_BLOCK_2DEC" readonly class="w-full bg-gray-900/50 border border-gray-800 rounded p-2 text-xs text-gray-400">
                                    </div>
                                </div>
                            </div>

                            <!-- Modelo Financiero de Pagos al Motorizado (BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001) -->
                            <div class="p-3 bg-gray-950 border border-emerald-900/60 rounded-lg space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-emerald-400">🏍️ Tarifa & Bonos de Pago al Motorizado (Courier)</span>
                                    <span class="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">Enterprise SSOT</span>
                                </div>
                                <p class="text-[10px] text-gray-400">Configuración centralizada y server-authoritative del valor por kilómetro y bono fijo por entrega. No afecta pedidos históricos cerrados.</p>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Tarifa por Kilómetro (C$/km):</label>
                                        <div class="relative">
                                            <input type="number" id="cfg-courierRatePerKm" step="0.25" min="0" value="7.00" required class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-emerald-400 font-bold pr-12">
                                            <span class="absolute right-2 top-2 text-[10px] text-gray-500 font-mono">C$/km</span>
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Bono Fijo por Pedido (C$):</label>
                                        <div class="relative">
                                            <input type="number" id="cfg-courierOrderBonus" step="0.5" min="0" value="10.00" required class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-emerald-400 font-bold pr-12">
                                            <span class="absolute right-2 top-2 text-[10px] text-gray-500 font-mono">C$/ped</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 pt-1">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Versión de Política:</label>
                                        <input type="number" id="cfg-courierRatePolicyVersion" value="1" min="1" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-semibold text-gray-400">Descripción / Motivo:</label>
                                        <input type="text" id="cfg-courierRateDescription" value="Tarifa base por kilómetro y bono fijo por entrega" class="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                    </div>
                                </div>
                            </div>

                            <!-- Opciones Generales -->
                            <div class="grid grid-cols-2 gap-4">
                                <label class="flex items-center gap-2 text-xs text-gray-300 p-2 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer">
                                    <input type="checkbox" id="cfg-allowGuest" checked class="accent-blue-600"> Permitir Modo Invitado
                                </label>
                                <label class="flex items-center gap-2 text-xs text-gray-300 p-2 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer">
                                    <input type="checkbox" id="cfg-showPromotions" checked class="accent-blue-600"> Mostrar Promociones
                                </label>
                            </div>

                            <!-- Canales de Soporte -->
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-gray-400">Teléfono Soporte</label>
                                    <input type="text" id="cfg-supportPhone" placeholder="+50588888888" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-gray-400">WhatsApp Soporte</label>
                                    <input type="text" id="cfg-supportWhatsapp" placeholder="+50588888888" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                </div>
                            </div>

                            <!-- Personalización Visual / Tema -->
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-gray-400">Nombre Aplicación</label>
                                    <input type="text" id="cfg-appName" value="BlueSystem Delivery" class="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200">
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold text-gray-400">Color Principal (HEX)</label>
                                    <input type="color" id="cfg-primaryColor" value="#1565C0" class="w-full bg-gray-950 border border-gray-800 rounded h-8 p-1 cursor-pointer">
                                </div>
                            </div>

                            <div class="flex justify-end pt-2 border-t border-gray-800">
                                <button type="submit" id="save-cfg-btn" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition">💾 Guardar Configuración Global</button>
                            </div>
                        </form>
                    </div>

                    <!-- Vista Previa y Estado en Vivo -->
                    <div class="space-y-6">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-4">
                            <h3 class="text-sm font-semibold text-gray-200">📡 Estado Actual en Firestore</h3>
                            <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3 font-mono text-xs text-gray-400" id="cfg-preview">
                                <p class="text-gray-500">Cargando system_config/global...</p>
                            </div>
                        </div>

                        <!-- Panel de Regla de Jerarquía -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg space-y-3">
                            <h3 class="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⚖️</span> <span>Regla de Jerarquía de Comisión</span>
                            </h3>
                            <div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 text-xs text-gray-300 space-y-2 font-mono">
                                <p class="text-indigo-300 font-bold">effectiveCommissionRate =</p>
                                <p class="pl-4 text-emerald-400">business.commissionOverrideRate</p>
                                <p class="pl-4 text-gray-400">?: system_config/global.merchantCommissionRate</p>
                                <p class="pl-4 text-gray-500">?: 0.15 (15.00% fallback)</p>
                            </div>
                            <p class="text-[11px] text-gray-400 leading-relaxed">
                                Los pedidos nuevos heredan la comisión vigente al momento de su creación.
                                Al entregarse la orden, la comisión queda congelada de forma inmutable en el ledger.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Sección: Comisiones Específicas por Comercio (Overrides y Herencia) -->
                <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                        <div>
                            <h3 class="text-sm font-bold text-gray-100 flex items-center gap-2">
                                <span>🏬</span> <span>Comisión Específica por Comercio (Overrides & Excepciones)</span>
                            </h3>
                            <p class="text-xs text-gray-400 mt-0.5">Define comisiones personalizadas o mantén la herencia de la comisión global.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="text" id="search-merchant-commission" oninput="configModule.filterBusinessesList(this.value)" placeholder="Buscar comercio..." class="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none w-48">
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="bg-gray-950 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                                    <th class="py-3 px-4 font-semibold">Comercio / Negocio</th>
                                    <th class="py-3 px-4 font-semibold">ID Comercio</th>
                                    <th class="py-3 px-4 font-semibold text-center">Comisión Efectiva</th>
                                    <th class="py-3 px-4 font-semibold text-center">Origen de la Tasa</th>
                                    <th class="py-3 px-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="merchant-commission-table-body" class="divide-y divide-gray-800/60">
                                <tr>
                                    <td colspan="5" class="text-center py-8 text-gray-500">Cargando comercios...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        configModule.loadConfig();
        configModule.loadBusinesses();
    },

    loadConfig: () => {
        db.collection('system_config').doc('global').onSnapshot(doc => {
            const previewEl = document.getElementById('cfg-preview');
            if (!doc.exists) {
                if (previewEl) previewEl.innerHTML = '<p class="text-yellow-500">⚠️ Documento global no existe aún. Guarde para crearlo.</p>';
                return;
            }

            const data = doc.data();
            const globalRate = data.merchantCommissionRate != null ? Number(data.merchantCommissionRate) : 0.15;
            configModule.currentGlobalCommissionRate = globalRate;
            
            // Llenar formulario
            if (document.getElementById('cfg-maintenanceMode')) {
                document.getElementById('cfg-maintenanceMode').checked = data.maintenanceMode === true;
                document.getElementById('cfg-maintenanceMessage').value = data.maintenanceMessage || '';
                document.getElementById('cfg-minimumVersion').value = data.minimumVersion || 1;
                document.getElementById('cfg-forceUpdate').checked = data.forceUpdate === true;

                // Comisiones
                document.getElementById('cfg-merchantCommissionEnabled').checked = data.merchantCommissionEnabled !== false;
                document.getElementById('cfg-merchantCommissionPercent').value = (globalRate * 100).toFixed(1);
                document.getElementById('cfg-merchantCommissionDescription').value = data.merchantCommissionDescription || 'Comisión sobre ventas brutas del comercio';
                document.getElementById('cfg-merchantCommissionPolicyId').value = data.merchantCommissionPolicyId || 'merchant_commission';
                document.getElementById('cfg-merchantCommissionPolicyVersion').value = data.merchantCommissionPolicyVersion || 1;

                // Cargo Adicional
                document.getElementById('cfg-additionalChargeEnabled').checked = data.additionalChargeEnabled === true;
                document.getElementById('cfg-additionalChargeAmount').value = data.additionalChargeAmount ?? 0;
                document.getElementById('cfg-additionalChargeDescription').value = data.additionalChargeDescription || 'Cargo adicional por servicio';
                document.getElementById('cfg-additionalChargePolicyId').value = data.additionalChargePolicyId || 'global_delivery_charge';
                document.getElementById('cfg-additionalChargePolicyVersion').value = data.additionalChargePolicyVersion || 1;

                // Tarifas de Entrega Comercial (BSD-COMMERCE-DYNAMIC-DELIVERY-PRICING-COURIER-EARNINGS-DISPATCH-001)
                if (document.getElementById('cfg-commerceCustomerRatePerKm')) {
                    const commPricing = data.commerceDeliveryPricing || {};
                    document.getElementById('cfg-commerceCustomerRatePerKm').value = commPricing.customerPricePerKm != null ? Number(commPricing.customerPricePerKm).toFixed(2) : '8.00';
                    document.getElementById('cfg-commerceCourierRatePerKm').value = commPricing.courierPricePerKm != null ? Number(commPricing.courierPricePerKm).toFixed(2) : '7.00';
                    document.getElementById('cfg-commercePricingVersion').value = commPricing.pricingVersion || 'v2.2-commerce';
                }

                // Parámetros Courier (BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001)
                if (document.getElementById('cfg-courierRatePerKm')) {
                    document.getElementById('cfg-courierRatePerKm').value = data.courierRatePerKm != null ? Number(data.courierRatePerKm).toFixed(2) : '7.00';
                    document.getElementById('cfg-courierOrderBonus').value = data.courierOrderBonus != null ? Number(data.courierOrderBonus).toFixed(2) : '10.00';
                    document.getElementById('cfg-courierRatePolicyVersion').value = data.courierRatePolicyVersion || 1;
                    document.getElementById('cfg-courierRateDescription').value = data.courierRateDescription || 'Tarifa base por kilómetro y bono fijo por entrega';
                }

                document.getElementById('cfg-allowGuest').checked = data.allowGuest !== false;
                document.getElementById('cfg-showPromotions').checked = data.showPromotions !== false;
                document.getElementById('cfg-supportPhone').value = data.supportPhone || '';
                document.getElementById('cfg-supportWhatsapp').value = data.supportWhatsapp || '';
                document.getElementById('cfg-appName').value = data.appName || 'BlueSystem Delivery';
                document.getElementById('cfg-primaryColor').value = data.primaryColor || '#1565C0';
            }

            // Actualizar vista previa
            if (previewEl) {
                const commPricing = data.commerceDeliveryPricing || {};
                previewEl.innerHTML = `
                    <div><span class="text-blue-400">maintenanceMode:</span> <strong class="${data.maintenanceMode ? 'text-red-400' : 'text-green-400'}">${data.maintenanceMode}</strong></div>
                    <div><span class="text-blue-400">maintenanceMessage:</span> "${data.maintenanceMessage || ''}"</div>
                    <div><span class="text-indigo-400">merchantCommission:</span> <strong class="text-indigo-300">${(globalRate * 100).toFixed(1)}%</strong> (${data.merchantCommissionEnabled !== false ? 'Habilitada' : 'Pausada'})</div>
                    <div><span class="text-indigo-400">commissionPolicy:</span> "${data.merchantCommissionPolicyId || 'merchant_commission'}" (v${data.merchantCommissionPolicyVersion || 1})</div>
                    <div><span class="text-blue-400">commerceCustomerRate:</span> <strong class="text-blue-300">C$ ${commPricing.customerPricePerKm != null ? Number(commPricing.customerPricePerKm).toFixed(2) : '8.00'}/km</strong></div>
                    <div><span class="text-emerald-400">commerceCourierRate:</span> <strong class="text-emerald-300">C$ ${commPricing.courierPricePerKm != null ? Number(commPricing.courierPricePerKm).toFixed(2) : '7.00'}/km</strong> (${commPricing.pricingVersion || 'v2.2-commerce'})</div>
                    <div><span class="text-emerald-400">courierRatePerKm:</span> <strong class="text-emerald-300">C$ ${data.courierRatePerKm != null ? Number(data.courierRatePerKm).toFixed(2) : '7.00'}/km</strong></div>
                    <div><span class="text-emerald-400">courierOrderBonus:</span> <strong class="text-emerald-300">C$ ${data.courierOrderBonus != null ? Number(data.courierOrderBonus).toFixed(2) : '10.00'}/ped</strong> (v${data.courierRatePolicyVersion || 1})</div>
                    <div><span class="text-blue-400">minimumVersion:</span> ${data.minimumVersion || 1}</div>
                    <div><span class="text-blue-400">forceUpdate:</span> <strong class="${data.forceUpdate ? 'text-red-400' : 'text-gray-400'}">${data.forceUpdate}</strong></div>
                    <div><span class="text-amber-400">additionalChargeEnabled:</span> <strong class="${data.additionalChargeEnabled ? 'text-amber-400' : 'text-gray-400'}">${data.additionalChargeEnabled === true}</strong></div>
                    <div><span class="text-amber-400">additionalChargeAmount:</span> C$ ${data.additionalChargeAmount ?? 0}</div>
                    <div><span class="text-amber-400">additionalChargeDesc:</span> "${data.additionalChargeDescription || ''}"</div>
                    <div><span class="text-blue-400">allowGuest:</span> ${data.allowGuest !== false}</div>
                    <div><span class="text-blue-400">showPromotions:</span> ${data.showPromotions !== false}</div>
                    <div><span class="text-blue-400">supportPhone:</span> "${data.supportPhone || ''}"</div>
                    <div><span class="text-blue-400">supportWhatsapp:</span> "${data.supportWhatsapp || ''}"</div>
                    <div><span class="text-blue-400">primaryColor:</span> <span style="color: ${data.primaryColor || '#1565C0'}">■ ${data.primaryColor || '#1565C0'}</span></div>
                    <div class="text-[10px] text-gray-500 pt-2 border-t border-gray-800">Última actualización: ${data.lastUpdate ? new Date(data.lastUpdate.seconds * 1000).toLocaleString() : 'N/A'}</div>
                `;
            }

            configModule.renderBusinessesTable();
        });
    },

    loadBusinesses: async () => {
        try {
            const snap = await db.collection('businesses').get();
            configModule.businessesList = [];
            snap.forEach(doc => {
                const b = doc.data();
                configModule.businessesList.push({
                    id: doc.id,
                    name: b.name || b.businessName || b.nombre || doc.id,
                    commissionOverrideRate: b.commissionOverrideRate != null ? Number(b.commissionOverrideRate) : null,
                    commissionPolicyId: b.commissionPolicyId || null,
                    updatedAt: b.updatedAt || null
                });
            });
            configModule.renderBusinessesTable();
        } catch (err) {
            console.error('Error cargando comercios para comisiones:', err);
        }
    },

    renderBusinessesTable: () => {
        const tbody = document.getElementById('merchant-commission-table-body');
        if (!tbody) return;

        if (configModule.businessesList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-500 text-xs">No hay comercios registrados o cargando...</td></tr>`;
            return;
        }

        const searchTerm = (document.getElementById('search-merchant-commission')?.value || '').toLowerCase().trim();
        const filtered = configModule.businessesList.filter(b => 
            b.name.toLowerCase().includes(searchTerm) || b.id.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-500 text-xs">No se encontraron comercios con el filtro "${searchTerm}"</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(b => {
            const hasOverride = b.commissionOverrideRate !== null;
            const effectiveRate = hasOverride ? b.commissionOverrideRate : configModule.currentGlobalCommissionRate;
            const percentDisplay = (effectiveRate * 100).toFixed(1);

            return `
                <tr class="hover:bg-gray-800/40 transition">
                    <td class="py-3 px-4 font-medium text-gray-200">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🏬</span>
                            <div>
                                <p class="font-bold text-gray-100">${b.name}</p>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4 font-mono text-[11px] text-gray-400">${b.id}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${hasOverride ? 'bg-amber-900/50 text-amber-300 border border-amber-800' : 'bg-indigo-900/50 text-indigo-300 border border-indigo-800'}">
                            ${percentDisplay}%
                        </span>
                    </td>
                    <td class="py-3 px-4 text-center text-[11px]">
                        ${hasOverride 
                            ? `<span class="text-amber-400 font-semibold flex items-center justify-center gap-1"><span>⚡</span> Override (${b.commissionPolicyId || 'personalizada'})</span>` 
                            : `<span class="text-gray-400 flex items-center justify-center gap-1"><span>🌐</span> Heredada (Global)</span>`
                        }
                    </td>
                    <td class="py-3 px-4 text-right space-x-2">
                        <button onclick="configModule.openCommissionModal('${b.id}', '${b.name.replace(/'/g, "\\'")}', ${b.commissionOverrideRate !== null ? (b.commissionOverrideRate * 100) : 'null'})" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold transition">
                            ✏️ Configurar
                        </button>
                        ${hasOverride ? `
                            <button onclick="configModule.resetToGlobalCommission('${b.id}')" title="Revertir a Comisión Global" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition">
                                ↺ Reset
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterBusinessesList: () => {
        configModule.renderBusinessesTable();
    },

    openCommissionModal: (businessId, businessName, currentRatePercent) => {
        const isOverride = currentRatePercent !== null;
        const initialVal = isOverride ? currentRatePercent : (configModule.currentGlobalCommissionRate * 100).toFixed(1);

        const modalHtml = `
            <div id="commission-override-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div class="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                    <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                        <h3 class="text-sm font-bold text-gray-100 flex items-center gap-2">
                            <span>⚙️</span> Configurar Comisión de Comercio
                        </h3>
                        <button onclick="document.getElementById('commission-override-modal').remove()" class="text-gray-400 hover:text-gray-200 text-sm">✕</button>
                    </div>

                    <div class="space-y-3">
                        <div class="bg-gray-950 p-3 rounded-xl border border-gray-800">
                            <p class="text-xs text-gray-400 font-semibold">Comercio:</p>
                            <p class="text-sm font-bold text-gray-100">${businessName}</p>
                            <p class="text-[10px] font-mono text-gray-500">${businessId}</p>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-300">Porcentaje de Comisión (%)</label>
                            <div class="relative">
                                <input type="number" id="modal-override-rate" step="0.1" min="0" max="100" value="${initialVal}" class="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-indigo-300 font-bold pr-8 outline-none focus:border-indigo-500">
                                <span class="absolute right-3 top-2.5 text-xs text-gray-500">%</span>
                            </div>
                            <p class="text-[10px] text-gray-500">Se aplicará sobre las ventas brutas de este comercio de forma prioritaria.</p>
                        </div>

                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-gray-300">ID de Política / Razón</label>
                            <input type="text" id="modal-override-policy" placeholder="Ej: acuerdo_preferencial_2026" value="custom_merchant_override" class="w-full bg-gray-950 border border-gray-800 rounded-xl p-2 text-xs text-gray-200 outline-none focus:border-indigo-500">
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
                        <button onclick="document.getElementById('commission-override-modal').remove()" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition">Cancelar</button>
                        <button onclick="configModule.saveCommissionOverride('${businessId}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition">💾 Guardar Comisión</button>
                    </div>
                </div>
            </div>
        `;

        const prev = document.getElementById('commission-override-modal');
        if (prev) prev.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    saveCommissionOverride: async (businessId) => {
        const rateInput = document.getElementById('modal-override-rate');
        const policyInput = document.getElementById('modal-override-policy');
        if (!rateInput) return;

        const ratePercent = parseFloat(rateInput.value);
        if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) {
            toast.show('El porcentaje debe ser un número válido entre 0 y 100.', 'error');
            return;
        }

        const rateDecimal = Math.round((ratePercent / 100) * 1000) / 1000;
        const policyId = (policyInput?.value || '').trim() || 'custom_merchant_override';

        try {
            await db.collection('businesses').doc(businessId).set({
                commissionOverrideRate: rateDecimal,
                commissionPolicyId: policyId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await db.collection('audit_events').add({
                event: 'MERCHANT_COMMISSION_OVERRIDE_UPDATED',
                businessId,
                overrideRate: rateDecimal,
                policyId,
                changedBy: firebase.auth().currentUser?.email || 'ADMIN',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('commission-override-modal')?.remove();
            toast.show('Comisión personalizada guardada exitosamente.');
            await configModule.loadBusinesses();
        } catch (err) {
            toast.show(`Error guardando comisión: ${err.message}`, 'error');
        }
    },

    resetToGlobalCommission: async (businessId) => {
        if (!confirm('¿Desea eliminar la comisión personalizada y volver a la comisión global heredada?')) return;

        try {
            await db.collection('businesses').doc(businessId).update({
                commissionOverrideRate: firebase.firestore.FieldValue.delete(),
                commissionPolicyId: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('audit_events').add({
                event: 'MERCHANT_COMMISSION_OVERRIDE_RESET',
                businessId,
                changedBy: firebase.auth().currentUser?.email || 'ADMIN',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            toast.show('Comercio reestablecido a la comisión global.');
            await configModule.loadBusinesses();
        } catch (err) {
            toast.show(`Error al reestablecer comisión: ${err.message}`, 'error');
        }
    },

    handleSubmit: async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-cfg-btn');
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        const commissionPercent = parseFloat(document.getElementById('cfg-merchantCommissionPercent').value);
        const commissionRate = isNaN(commissionPercent) ? 0.15 : (commissionPercent / 100);

        const courierRatePerKm = parseFloat(document.getElementById('cfg-courierRatePerKm')?.value) || 7.00;
        const courierOrderBonus = parseFloat(document.getElementById('cfg-courierOrderBonus')?.value) || 10.00;
        const courierRatePolicyVersion = parseInt(document.getElementById('cfg-courierRatePolicyVersion')?.value) || 1;
        const courierRateDescription = document.getElementById('cfg-courierRateDescription')?.value?.trim() || 'Tarifa base por kilómetro y bono fijo por entrega';

        // Commerce Delivery Dynamic Pricing (BSD-COMMERCE-DYNAMIC-DELIVERY-PRICING-COURIER-EARNINGS-DISPATCH-001)
        const commerceCustomerRatePerKm = parseFloat(document.getElementById('cfg-commerceCustomerRatePerKm')?.value) || 8.00;
        const commerceCourierRatePerKm = parseFloat(document.getElementById('cfg-commerceCourierRatePerKm')?.value) || 7.00;
        const commercePricingVersion = document.getElementById('cfg-commercePricingVersion')?.value?.trim() || 'v2.2-commerce';
        const commerceDeliveryPricing = {
            customerPricePerKm: commerceCustomerRatePerKm,
            courierPricePerKm: commerceCourierRatePerKm,
            pricingVersion: commercePricingVersion,
            roundingPolicy: 'KM_BLOCK_2DEC',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const payload = {
            maintenanceMode: document.getElementById('cfg-maintenanceMode').checked,
            maintenanceMessage: document.getElementById('cfg-maintenanceMessage').value.trim(),
            merchantCommissionEnabled: document.getElementById('cfg-merchantCommissionEnabled').checked,
            merchantCommissionRate: commissionRate,
            merchantCommissionDescription: document.getElementById('cfg-merchantCommissionDescription').value.trim() || 'Comisión sobre ventas brutas del comercio',
            merchantCommissionPolicyId: document.getElementById('cfg-merchantCommissionPolicyId').value.trim() || 'merchant_commission',
            merchantCommissionPolicyVersion: parseInt(document.getElementById('cfg-merchantCommissionPolicyVersion').value) || 1,
            commerceDeliveryPricing,
            courierRatePerKm,
            courierOrderBonus,
            courierRatePolicyVersion,
            courierRateDescription,
            minimumVersion: parseInt(document.getElementById('cfg-minimumVersion').value) || 1,
            forceUpdate: document.getElementById('cfg-forceUpdate').checked,
            additionalChargeEnabled: document.getElementById('cfg-additionalChargeEnabled').checked,
            additionalChargeAmount: parseFloat(document.getElementById('cfg-additionalChargeAmount').value) || 0,
            additionalChargeDescription: document.getElementById('cfg-additionalChargeDescription').value.trim() || 'Cargo adicional por servicio',
            additionalChargePolicyId: document.getElementById('cfg-additionalChargePolicyId').value.trim() || 'global_delivery_charge',
            additionalChargePolicyVersion: parseInt(document.getElementById('cfg-additionalChargePolicyVersion').value) || 1,
            allowGuest: document.getElementById('cfg-allowGuest').checked,
            showPromotions: document.getElementById('cfg-showPromotions').checked,
            supportPhone: document.getElementById('cfg-supportPhone').value.trim(),
            supportWhatsapp: document.getElementById('cfg-supportWhatsapp').value.trim(),
            appName: document.getElementById('cfg-appName').value.trim(),
            primaryColor: document.getElementById('cfg-primaryColor').value,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('system_config').doc('global').set(payload, { merge: true });

            // Registrar en audit_events
            await db.collection('audit_events').add({
                event: 'GLOBAL_CONFIG_AND_COMMERCE_DELIVERY_PRICING_UPDATED',
                commissionRate,
                commerceDeliveryPricing: {
                    customerPricePerKm: commerceCustomerRatePerKm,
                    courierPricePerKm: commerceCourierRatePerKm,
                    pricingVersion: commercePricingVersion
                },
                courierRatePerKm,
                courierOrderBonus,
                courierRatePolicyVersion,
                changedBy: firebase.auth().currentUser?.email || 'ADMIN',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            toast.show('Configuración global, comisiones y tarifas de entrega comercial guardadas con éxito.');
        } catch (err) {
            toast.show(err.message, 'error');
        } finally {
            btn.textContent = '💾 Guardar Configuración Global';
            btn.disabled = false;
        }
    }
};

window.configModule = configModule;
