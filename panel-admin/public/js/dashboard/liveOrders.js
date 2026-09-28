// ═══════════════════════════════════════════════════════════════════════════════
// BLUESYSTEM DELIVERY ENTERPRISE — Live Order Monitor & Detail Enterprise
// OPS CONTROL CENTER — Módulo 3, 7 y 8 (Canónico v5.3.0)
// ═══════════════════════════════════════════════════════════════════════════════

const liveOrdersModule = {
    // ── 1. ESTADO DEL MÓDULO & SUSCRIPCIONES ──────────────────────────────────
    unsubscribeOrders: null,
    unsubscribeCourierGps: null,
    unsubscribeOrderChat: null,
    ordersCache: [],
    selectedOrder: null,
    connectionStatus: 'INIT', // 'INIT' | 'LIVE' | 'ERROR' | 'OFFLINE'
    lastSyncTimestamp: null,

    // ── 2. MOTORES CENTRALIZADOS DE NORMALIZACIÓN PURA ─────────────────────────
    
    /**
     * Convierte de manera defensiva cualquier valor monetario (number, string formateado,
     * objeto anidado, null, undefined) a un valor numérico finito nativo.
     * NUNCA muta el documento original de Firestore.
     */
    normalizeMoney: (value) => {
        if (value === null || value === undefined) return 0;

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value === 'string') {
            // Elimina símbolos de moneda (C$, $, USD, etc.), espacios, y caracteres no numéricos excepto punto, coma y signo negativo
            let cleaned = value.replace(/[^\d.,-]/g, '').trim();
            if (!cleaned) return 0;

            // Manejar separadores de miles y decimales
            // Ej: "1,250.50" o "1.250,50" o "450"
            if (cleaned.includes(',') && cleaned.includes('.')) {
                if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                    // Formato europeo: 1.250,50 -> 1250.50
                    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                } else {
                    // Formato estándar: 1,250.50 -> 1250.50
                    cleaned = cleaned.replace(/,/g, '');
                }
            } else if (cleaned.includes(',')) {
                // Si solo tiene coma, verificar si es decimal o miles
                const parts = cleaned.split(',');
                if (parts.length === 2 && parts[1].length <= 2) {
                    cleaned = cleaned.replace(',', '.');
                } else {
                    cleaned = cleaned.replace(/,/g, '');
                }
            }

            const parsed = parseFloat(cleaned);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        if (typeof value === 'object') {
            // Soporta objetos anidados como { total: 450 }, { amount: 450 }, etc.
            if (value.total !== undefined) return liveOrdersModule.normalizeMoney(value.total);
            if (value.grandTotal !== undefined) return liveOrdersModule.normalizeMoney(value.grandTotal);
            if (value.amount !== undefined) return liveOrdersModule.normalizeMoney(value.amount);
            if (value.subtotal !== undefined) return liveOrdersModule.normalizeMoney(value.subtotal);
        }

        return 0;
    },

    /**
     * Formatea un valor monetario a la moneda canónica de Nicaragua (C$ XXX.XX).
     */
    formatCurrency: (value) => {
        const amount = liveOrdersModule.normalizeMoney(value);
        return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },

    /**
     * Normaliza los estados canónicos y legacy (español e inglés) a un enum canónico.
     */
    normalizeOrderStatus: (order) => {
        if (!order) return 'PENDING';
        const raw = String(order.status || order.estado || order.commercialStatus || order.operationalStatus || '').toUpperCase().trim();

        if (raw === 'PENDING' || raw === 'PENDIENTE' || raw === 'DRAFT' || raw === 'CREATED' || raw === 'CREADO' || raw === 'QUEUED') {
            return 'PENDING';
        }
        if (raw === 'PREPARING' || raw === 'PREPARANDO' || raw === 'IN_PREPARATION' || raw === 'COOKING' || raw === 'CONFIRMED' || raw === 'ACCEPTED' || raw === 'CONFIRMADO' || raw === 'ACEPTADO') {
            return 'PREPARING';
        }
        if (raw === 'READY' || raw === 'LISTO' || raw === 'PREPARADO' || raw === 'PACKED' || raw === 'WAITING_COURIER' || raw === 'BUSCANDO_MOTORIZADO') {
            return 'READY';
        }
        if (raw === 'ASSIGNED' || raw === 'ASIGNADO' || raw === 'COURIER_ACCEPTED' || raw === 'GOING_TO_STORE' || raw === 'AT_STORE' || raw === 'ORDER_PICKED' || raw === 'RECOGIDO') {
            return 'ASSIGNED';
        }
        if (raw === 'IN_TRANSIT' || raw === 'EN_RUTA' || raw === 'EN_CAMINO' || raw === 'GOING_TO_CUSTOMER' || raw === 'AT_CUSTOMER' || raw === 'DELIVERING' || raw === 'EN_TRANSITO') {
            return 'IN_TRANSIT';
        }
        if (raw === 'DELIVERED' || raw === 'ENTREGADO' || raw === 'COMPLETED' || raw === 'COMPLETADO') {
            return 'DELIVERED';
        }
        if (raw === 'CANCELLED' || raw === 'CANCELADO' || raw === 'REJECTED' || raw === 'RECHAZADO' || raw === 'ANULADO') {
            return 'CANCELLED';
        }

        return raw || 'PENDING';
    },

    /**
     * Convierte de manera defensiva cualquier valor de fecha/timestamp a un objeto Date nativo válido.
     */
    normalizeDate: (value) => {
        if (!value) return null;

        if (typeof value.toDate === 'function') {
            try {
                const d = value.toDate();
                return Number.isNaN(d.getTime()) ? null : d;
            } catch (e) {
                return null;
            }
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'number') {
            // Manejar segundos vs milisegundos
            const ms = value < 10000000000 ? value * 1000 : value;
            const d = new Date(ms);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        if (typeof value === 'string') {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        if (typeof value === 'object' && typeof value.seconds === 'number') {
            const d = new Date(value.seconds * 1000 + (value.nanoseconds ? Math.floor(value.nanoseconds / 1000000) : 0));
            return Number.isNaN(d.getTime()) ? null : d;
        }

        return null;
    },

    /**
     * Formatea una fecha para visualización en el Control Center.
     */
    formatDate: (value, includeTime = true) => {
        const d = liveOrdersModule.normalizeDate(value);
        if (!d) return 'No registrado';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        if (!includeTime) return `${day}/${month}/${year}`;

        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    },

    // ── 3. RESOLVERS CANÓNICOS DEFENSIVOS ───────────────────────────────────────
    resolveOrderId: (ord) => ord?.id || ord?.pedidoId || ord?.orderId || 'S/ID',
    resolveOrderCode: (ord) => ord?.orderCode || ord?.codigoPedido || '',
    resolveOrderShortCode: (ord) => ord?.orderShortCode || ord?.codigoCorto || '',

    resolveOrderTotal: (ord) => {
        if (!ord) return 0;
        if (ord.total !== undefined && ord.total !== null) {
            return liveOrdersModule.normalizeMoney(ord.total);
        }
        if (ord.valoresMonetarios?.total !== undefined) {
            return liveOrdersModule.normalizeMoney(ord.valoresMonetarios.total);
        }
        if (ord.priceBreakdown?.grandTotal !== undefined) {
            return liveOrdersModule.normalizeMoney(ord.priceBreakdown.grandTotal);
        }
        if (ord.priceBreakdown?.total !== undefined) {
            return liveOrdersModule.normalizeMoney(ord.priceBreakdown.total);
        }
        if (ord.amountPaid !== undefined && ord.amountPaid > 0) {
            return liveOrdersModule.normalizeMoney(ord.amountPaid);
        }
        const subtotal = liveOrdersModule.normalizeMoney(ord.subtotal || ord.valoresMonetarios?.subtotal || 0);
        const deliveryFee = liveOrdersModule.normalizeMoney(ord.deliveryFee || ord.costoEnvio || ord.valoresMonetarios?.costoEnvio || 0);
        return subtotal + deliveryFee;
    },

    resolveSubtotal: (ord) => {
        if (!ord) return 0;
        if (ord.subtotal !== undefined) return liveOrdersModule.normalizeMoney(ord.subtotal);
        if (ord.valoresMonetarios?.subtotal !== undefined) return liveOrdersModule.normalizeMoney(ord.valoresMonetarios.subtotal);
        if (ord.priceBreakdown?.subtotal !== undefined) return liveOrdersModule.normalizeMoney(ord.priceBreakdown.subtotal);
        return 0;
    },

    resolveDeliveryFee: (ord) => {
        if (!ord) return 0;
        if (ord.deliveryFee !== undefined) return liveOrdersModule.normalizeMoney(ord.deliveryFee);
        if (ord.costoEnvio !== undefined) return liveOrdersModule.normalizeMoney(ord.costoEnvio);
        if (ord.valoresMonetarios?.costoEnvio !== undefined) return liveOrdersModule.normalizeMoney(ord.valoresMonetarios.costoEnvio);
        if (ord.priceBreakdown?.deliveryFee !== undefined) return liveOrdersModule.normalizeMoney(ord.priceBreakdown.deliveryFee);
        return 0;
    },

    resolveCustomerName: (ord) => {
        return ord?.customerName || ord?.clienteNombre || ord?.nombreCliente || ord?.cliente?.nombre || 'Cliente General';
    },

    resolveCustomerPhone: (ord) => {
        return ord?.customerPhone || ord?.telefonoCliente || ord?.clienteTelefono || ord?.cliente?.telefono || 'No registrado';
    },

    resolveCustomerAddress: (ord) => {
        if (!ord) return 'Dirección no registrada';
        if (typeof ord.destinationAddress === 'string' && ord.destinationAddress.trim()) return ord.destinationAddress;
        if (typeof ord.clienteDireccion === 'string' && ord.clienteDireccion.trim()) return ord.clienteDireccion;
        if (typeof ord.direccionDestino === 'string' && ord.direccionDestino.trim()) return ord.direccionDestino;
        if (ord.destino?.direccion) return ord.destino.direccion;
        if (ord.rawDestino?.direccion) return ord.rawDestino.direccion;
        return 'Dirección no especificada';
    },

    resolveBusinessName: (ord) => {
        return ord?.businessName || ord?.nombreComercio || ord?.comercioNombre || ord?.restaurantName || ord?.comercio?.nombre || 'Comercio Aliado';
    },

    resolveBranchName: (ord) => {
        return ord?.branchName || ord?.nombreSucursal || ord?.sucursalNombre || (ord?.branchId ? `Sucursal (${ord.branchId.slice(0, 6)})` : '');
    },

    resolveBusinessAddress: (ord) => {
        return ord?.branchAddress || ord?.direccionSucursal || ord?.comercioDireccion || ord?.comercioDirección || ord?.origen?.direccion || 'Instalaciones del Comercio';
    },

    resolveCourierId: (ord) => {
        return ord?.assignedCourierId || ord?.motorizadoId || ord?.courierId || ord?.driverId || '';
    },

    resolveCourierName: (ord) => {
        return ord?.assignedCourierName || ord?.driverName || ord?.motorizadoNombre || ord?.courierName || (ord?.assignedCourierId ? `Motorizado (${ord.assignedCourierId.slice(0, 6)})` : 'Sin Asignar');
    },

    resolveCourierPlate: (ord) => {
        return ord?.assignedCourierPlate || ord?.motorizadoPlaca || ord?.driverPlate || ord?.placa || '';
    },

    resolveCourierPhone: (ord) => {
        return ord?.assignedCourierPhone || ord?.driverPhone || ord?.motorizadoTelefono || ord?.courierPhone || '';
    },

    resolvePaymentMethod: (ord) => {
        const raw = String(ord?.paymentMethod || ord?.metodoPago || ord?.valoresMonetarios?.metodoPago || 'CASH').toUpperCase();
        if (raw.includes('CARD') || raw.includes('TARJETA') || raw.includes('CREDIT') || raw.includes('DEBIT')) return 'TARJETA';
        if (raw.includes('WALLET') || raw.includes('BILLETERA') || raw.includes('DIGITAL') || raw.includes('PIX')) return 'BILLETERA';
        if (raw.includes('TRANSFER') || raw.includes('TRANSFERENCIA')) return 'TRANSFERENCIA';
        return 'EFECTIVO';
    },

    resolvePaymentStatus: (ord) => {
        const raw = String(ord?.paymentStatus || ord?.estadoPago || '').toUpperCase();
        if (raw === 'PAID' || raw === 'PAGADO' || raw === 'COMPLETED' || raw === 'APROBADO') return 'PAGADO';
        if (raw === 'FAILED' || raw === 'REJECTED' || raw === 'FALLIDO' || raw === 'RECHAZADO') return 'FALLIDO';
        if (raw === 'REFUNDED' || raw === 'REEMBOLSADO') return 'REEMBOLSADO';
        return 'PENDIENTE';
    },

    resolvePriority: (ord) => {
        const raw = String(ord?.priority || ord?.prioridad || 'NORMAL').toUpperCase();
        if (raw.includes('HIGH') || raw.includes('ALTA') || raw.includes('VIP') || raw.includes('URGENT')) return 'ALTA';
        if (raw.includes('LOW') || raw.includes('BAJA')) return 'BAJA';
        return 'NORMAL';
    },

    resolveETA: (ord) => {
        if (ord?.etaMinutes && Number.isFinite(Number(ord.etaMinutes))) {
            return `${Math.round(Number(ord.etaMinutes))} min`;
        }
        if (ord?.estimatedDeliveryMinutes && Number.isFinite(Number(ord.estimatedDeliveryMinutes))) {
            return `${Math.round(Number(ord.estimatedDeliveryMinutes))} min`;
        }
        if (ord?.estimatedDeliveryTime) {
            const date = liveOrdersModule.normalizeDate(ord.estimatedDeliveryTime);
            if (date) {
                const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
                if (diffMin > 0 && diffMin < 180) return `${diffMin} min`;
            }
        }
        return 'No disponible';
    },

    resolveTrustScore: (ord) => {
        if (ord?.trustScore !== undefined && ord?.trustScore !== null && Number.isFinite(Number(ord.trustScore))) {
            return `${Math.min(100, Math.max(0, Math.round(Number(ord.trustScore))))}%`;
        }
        return 'N/D';
    },

    resolveIncidents: (ord) => {
        const hasFlag = Boolean(ord?.hasIncident || ord?.incident || ord?.deliveryIssue);
        const hasRejection = Boolean(ord?.rejectionReason || ord?.cancellationReason || ord?.cancelReason);
        const incidentList = Array.isArray(ord?.incidents) ? ord.incidents : [];
        return {
            hasIncident: hasFlag || hasRejection || incidentList.length > 0,
            count: incidentList.length + (hasRejection ? 1 : 0),
            reason: ord?.rejectionReason || ord?.cancellationReason || ord?.cancelReason || (incidentList[0]?.description) || null,
            rejectedBy: ord?.rejectedBy || null,
            rejectedAt: ord?.rejectedAt || ord?.cancelledAt || null,
            list: incidentList
        };
    },

    resolveProofOfDelivery: (ord) => {
        return {
            hasPod: Boolean(ord?.proofOfDelivery || ord?.pod || ord?.confirmationCode || ord?.otpVerified),
            code: ord?.confirmationCode || ord?.otp || ord?.deliveryPin || 'No requerido',
            recipientName: ord?.receivedBy || ord?.recipientName || 'No registrado',
            signatureUrl: ord?.signatureUrl || ord?.proofOfDelivery?.signatureUrl || null,
            photoUrl: ord?.deliveryPhotoUrl || ord?.proofOfDelivery?.photoUrl || null,
            timestamp: ord?.deliveredAt || ord?.entregadoAt || ord?.completedAt || null
        };
    },

    /**
     * Construye la línea de tiempo operacional de 12 etapas basada EXCLUSIVAMENTE
     * en eventos reales registrados en el pedido (historialEstados, timestamps de cambio de estado).
     * NUNCA fabrica marcas de tiempo ficticias.
     */
    resolveTimelineEvents: (ord) => {
        const stages = [
            { key: 'CREADO', label: '1. Pedido Creado', icon: '📝', rawMatch: ['PENDING', 'CREATED', 'CREADO'] },
            { key: 'ACEPTADO', label: '2. Comercio Aceptó', icon: '🏪', rawMatch: ['CONFIRMED', 'ACCEPTED', 'ACEPTADO'] },
            { key: 'PREPARANDO', label: '3. En Preparación', icon: '🍳', rawMatch: ['PREPARING', 'PREPARANDO', 'COOKING'] },
            { key: 'LISTO', label: '4. Pedido Listo', icon: '📦', rawMatch: ['READY', 'LISTO', 'PACKED'] },
            { key: 'ASIGNADO', label: '5. Motorizado Asignado', icon: '🛵', rawMatch: ['ASSIGNED', 'ASIGNADO'] },
            { key: 'COURIER_ACCEPTED', label: '6. Motorizado Aceptó', icon: '🤝', rawMatch: ['COURIER_ACCEPTED', 'ACEPTADO_MOTORIZADO'] },
            { key: 'GOING_TO_STORE', label: '7. En Camino a Tienda', icon: '📍', rawMatch: ['GOING_TO_STORE', 'HACIA_COMERCIO'] },
            { key: 'AT_STORE', label: '8. En el Comercio', icon: '🏬', rawMatch: ['AT_STORE', 'EN_TIENDA'] },
            { key: 'ORDER_PICKED', label: '9. Pedido Recogido', icon: '🛍️', rawMatch: ['ORDER_PICKED', 'RECOGIDO', 'PICKED'] },
            { key: 'IN_TRANSIT', label: '10. En Camino a Cliente', icon: '🚀', rawMatch: ['IN_TRANSIT', 'GOING_TO_CUSTOMER', 'EN_RUTA', 'EN_CAMINO'] },
            { key: 'AT_CUSTOMER', label: '11. En Destino Cliente', icon: '🎯', rawMatch: ['AT_CUSTOMER', 'EN_DESTINO', 'DELIVERING'] },
            { key: 'DELIVERED', label: '12. Pedido Entregado', icon: '✅', rawMatch: ['DELIVERED', 'ENTREGADO', 'COMPLETED', 'COMPLETADO'] }
        ];

        const history = Array.isArray(ord?.historialEstados) ? ord.historialEstados : [];
        const currentNormalizedStatus = liveOrdersModule.normalizeOrderStatus(ord);

        // Mapeo de timestamps directos del documento
        const directTimestamps = {
            'CREADO': ord?.createdAt || ord?.creadoEl,
            'ACEPTADO': ord?.acceptedAt || ord?.confirmadoAt,
            'PREPARANDO': ord?.preparadoAt || ord?.inPreparationAt,
            'LISTO': ord?.readyAt || ord?.listoAt,
            'ASIGNADO': ord?.assignedAt || ord?.asignadoAt,
            'COURIER_ACCEPTED': ord?.courierAcceptedAt,
            'GOING_TO_STORE': ord?.goingToStoreAt,
            'AT_STORE': ord?.atStoreAt,
            'ORDER_PICKED': ord?.pickedUpAt || ord?.recogidoAt,
            'IN_TRANSIT': ord?.inTransitAt || ord?.enRutaAt,
            'AT_CUSTOMER': ord?.atCustomerAt,
            'DELIVERED': ord?.deliveredAt || ord?.entregadoAt || ord?.completedAt
        };

        const stageOrderMap = ['PENDING', 'PREPARING', 'READY', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'];
        const currentPhaseIndex = stageOrderMap.indexOf(currentNormalizedStatus);

        return stages.map((st, index) => {
            // 1. Buscar en historialEstados si existe un registro explícito para esta etapa
            let matchedHistoryItem = history.find(h => {
                const stName = String(h?.estado || h?.status || '').toUpperCase().trim();
                return st.rawMatch.includes(stName) || stName === st.key;
            });

            // 2. Resolver timestamp real si existe
            let rawTs = matchedHistoryItem?.timestamp || directTimestamps[st.key] || null;
            let formattedDate = rawTs ? liveOrdersModule.formatDate(rawTs) : null;

            // 3. Determinar estado de la etapa (COMPLETED | CURRENT | PENDING)
            let isPassed = false;
            let isCurrent = false;

            if (currentNormalizedStatus === 'CANCELLED') {
                isPassed = Boolean(formattedDate);
                isCurrent = false;
            } else if (formattedDate) {
                isPassed = true;
            } else {
                // Inferencia semántica segura según la jerarquía de fases
                const approxStagePhaseIndex = Math.floor(index / 2);
                if (currentPhaseIndex > approxStagePhaseIndex) {
                    isPassed = true;
                } else if (currentPhaseIndex === approxStagePhaseIndex) {
                    isCurrent = true;
                }
            }

            return {
                ...st,
                timestamp: formattedDate,
                hasRealTimestamp: Boolean(formattedDate),
                isCompleted: isPassed,
                isCurrent: isCurrent,
                actor: matchedHistoryItem?.triggeredBy || matchedHistoryItem?.assignedCourierId || null
            };
        });
    },

    // ── 4. CICLO DE VIDA, RENDER & UI ─────────────────────────────────────────

    destroy: () => {
        if (liveOrdersModule.unsubscribeOrders) {
            try { liveOrdersModule.unsubscribeOrders(); } catch(e){}
            liveOrdersModule.unsubscribeOrders = null;
            console.log("[LiveOrders] Orders snapshot unsubscribed cleanly.");
        }
        if (liveOrdersModule.unsubscribeCourierGps) {
            try { liveOrdersModule.unsubscribeCourierGps(); } catch(e){}
            liveOrdersModule.unsubscribeCourierGps = null;
        }
        liveOrdersModule.connectionStatus = 'OFFLINE';
    },

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        // Limpiar suscripciones activas previas
        liveOrdersModule.destroy();

        container.innerHTML = `
            <div class="space-y-6 select-none font-sans">
                <!-- Header Control Center & Live Sync Status -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-2xl">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl font-black shrink-0">
                            📦
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-xl font-black text-white leading-tight">Live Order Monitor & Detail Enterprise</h2>
                                <span id="liveOrdersConnectionBadge" class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-amber-400"></span> INICIALIZANDO
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">Supervisión en tiempo real de Commerce Delivery • Trazabilidad operacional de 12 etapas • Sin datos simulados</p>
                        </div>
                    </div>

                    <!-- Botones de Acción Rápida -->
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="liveOrdersModule.refresh()" class="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition duration-150 flex items-center gap-2">
                            <span>↻</span> Actualizar
                        </button>
                        <div class="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800" id="liveOrdersCountersBadge">
                            0 visibles / 0 totales
                        </div>
                    </div>
                </div>

                <!-- Bloque 1: Resumen Operacional en Tiempo Real (KPIs) -->
                <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3" id="liveOrdersKpiGrid">
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activos</p>
                        <p class="text-xl font-black text-blue-400 mt-1" id="kpiActiveCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
                        <p class="text-xl font-black text-amber-400 mt-1" id="kpiPendingCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preparando</p>
                        <p class="text-xl font-black text-indigo-400 mt-1" id="kpiPreparingCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listos</p>
                        <p class="text-xl font-black text-teal-400 mt-1" id="kpiReadyCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asignados</p>
                        <p class="text-xl font-black text-cyan-400 mt-1" id="kpiAssignedCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Camino</p>
                        <p class="text-xl font-black text-blue-500 mt-1" id="kpiInTransitCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entregados</p>
                        <p class="text-xl font-black text-emerald-400 mt-1" id="kpiDeliveredCount">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incidencias</p>
                        <p class="text-xl font-black text-rose-400 mt-1" id="kpiIncidentsCount">0</p>
                    </div>
                </div>

                <!-- Bloque 2: Barra de Búsqueda y Filtros Multidimensionales -->
                <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                    <div class="flex flex-col md:flex-row gap-3">
                        <div class="flex-1 relative">
                            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 text-sm">🔍</span>
                            <input type="text" id="orderSearchInput" oninput="liveOrdersModule.filterOrders()" placeholder="Buscar por ID, Cliente, Teléfono, Comercio, Sucursal o Motorizado..." class="w-full bg-slate-950 border border-slate-800 text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Estado Canónico</label>
                            <select id="filterStatus" onchange="liveOrdersModule.filterOrders()" class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-indigo-500">
                                <option value="ALL">Todos los Estados</option>
                                <option value="PENDING">Pendientes</option>
                                <option value="PREPARING">En Preparación</option>
                                <option value="READY">Listos</option>
                                <option value="ASSIGNED">Asignados</option>
                                <option value="IN_TRANSIT">En Camino</option>
                                <option value="DELIVERED">Entregados</option>
                                <option value="CANCELLED">Cancelados</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Método de Pago</label>
                            <select id="filterPayment" onchange="liveOrdersModule.filterOrders()" class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-indigo-500">
                                <option value="ALL">Todos los Métodos</option>
                                <option value="EFECTIVO">Efectivo</option>
                                <option value="TARJETA">Tarjeta</option>
                                <option value="BILLETERA">Billetera Digital</option>
                                <option value="TRANSFERENCIA">Transferencia</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Prioridad</label>
                            <select id="filterPriority" onchange="liveOrdersModule.filterOrders()" class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-indigo-500">
                                <option value="ALL">Todas las Prioridades</option>
                                <option value="ALTA">Alta / VIP</option>
                                <option value="NORMAL">Normal</option>
                                <option value="BAJA">Baja</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">Incidencias / Alertas</label>
                            <select id="filterIncidents" onchange="liveOrdersModule.filterOrders()" class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl p-2.5 mt-1 focus:outline-none focus:border-indigo-500">
                                <option value="ALL">Todas</option>
                                <option value="WITH_INCIDENT">Con Incidencias ⚠️</option>
                                <option value="CLEAN">Sin Incidencias ✓</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Bloque 3: Tabla Principal Enterprise de Pedidos -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div class="overflow-x-auto min-h-[350px]">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th class="p-4">Pedido ID</th>
                                    <th class="p-4">Cliente</th>
                                    <th class="p-4">Comercio & Sucursal</th>
                                    <th class="p-4">Motorizado</th>
                                    <th class="p-4">Estado</th>
                                    <th class="p-4">ETA</th>
                                    <th class="p-4">Pago / Total</th>
                                    <th class="p-4">Trust Score</th>
                                    <th class="p-4">Incidencias</th>
                                    <th class="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="ordersTableBody" class="divide-y divide-slate-800/60 text-xs">
                                <tr>
                                    <td colspan="10" class="p-12 text-center text-slate-400">
                                        <div class="flex flex-col items-center justify-center space-y-3">
                                            <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p class="font-semibold text-slate-300">Cargando pedidos en tiempo real...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Detalle Enterprise & Timeline 12 Etapas -->
            <div id="orderDetailModal" class="hidden fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div class="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
                    <!-- Modal Header -->
                    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xl font-bold">
                                📋
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-lg font-black text-white font-mono" id="modalOrderId">Pedido #---</h3>
                                    <span id="modalOrderStatusBadge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border">---</span>
                                </div>
                                <p class="text-xs text-slate-400" id="modalOrderTimestamp">Creado: ---</p>
                            </div>
                        </div>
                        <button onclick="liveOrdersModule.closeDetailModal()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition">
                            ✕
                        </button>
                    </div>

                    <!-- Timeline de 12 Etapas Operacionales Verificadas -->
                    <div class="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⏱️</span> Timeline de 12 Etapas Operacionales
                            </h4>
                            <span class="text-[10px] text-slate-500 font-mono">Basado estrictamente en auditoría real</span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-[10px]" id="timelineGrid">
                            <!-- Inyectado dinámicamente -->
                        </div>
                    </div>

                    <!-- Fichas de Cliente y Comercio -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Ficha Cliente -->
                        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <p class="font-bold text-indigo-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <span>👤</span> Información del Cliente & Destino
                            </p>
                            <div class="space-y-1 text-xs">
                                <p class="text-white font-bold" id="modalCustomerName">---</p>
                                <p class="text-slate-400 flex items-center gap-1">
                                    <span class="text-slate-500">📞 Tel:</span> <span id="modalCustomerPhone" class="text-slate-300 font-mono">---</span>
                                </p>
                                <p class="text-slate-400 flex items-start gap-1 pt-1 border-t border-slate-800/80">
                                    <span class="text-slate-500">📍 Destino:</span> <span id="modalCustomerAddress" class="text-slate-300">---</span>
                                </p>
                            </div>
                        </div>

                        <!-- Ficha Comercio -->
                        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <p class="font-bold text-indigo-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <span>🏪</span> Información del Comercio & Origen
                            </p>
                            <div class="space-y-1 text-xs">
                                <p class="text-white font-bold" id="modalStoreName">---</p>
                                <p class="text-slate-400 flex items-center gap-1">
                                    <span class="text-slate-500">🏬 Sucursal:</span> <span id="modalBranchName" class="text-slate-300">---</span>
                                </p>
                                <p class="text-slate-400 flex items-start gap-1 pt-1 border-t border-slate-800/80">
                                    <span class="text-slate-500">📍 Origen:</span> <span id="modalStoreAddress" class="text-slate-300">---</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Fichas de Motorizado & Desglose Financiero -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Ficha Motorizado -->
                        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <div class="flex items-center justify-between">
                                <p class="font-bold text-teal-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <span>🛵</span> Motorizado Asignado
                                </p>
                                <span id="modalCourierLiveStatus" class="text-[9px] font-mono px-2 py-0.5 rounded-full border bg-slate-900 border-slate-800 text-slate-400">---</span>
                            </div>
                            <div class="space-y-1 text-xs">
                                <p class="text-white font-bold" id="modalCourierName">---</p>
                                <p class="text-slate-400 flex items-center gap-1">
                                    <span class="text-slate-500">🆔 Operativo:</span> <span id="modalCourierId" class="text-slate-300 font-mono">---</span>
                                </p>
                                <p class="text-slate-400 flex items-center gap-1">
                                    <span class="text-slate-500">🛵 Placa:</span> <span id="modalCourierPlate" class="text-slate-300 font-mono">---</span>
                                </p>
                            </div>
                            <div id="modalCourierGpsBox" class="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                                <span class="text-slate-500">Telemetría GPS:</span> <span id="modalCourierGpsText" class="text-slate-300">Consultando...</span>
                            </div>
                        </div>

                        <!-- Ficha Pago & Financiero -->
                        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <p class="font-bold text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <span>💵</span> Desglose Financiero & Pago
                            </p>
                            <div class="space-y-1 text-xs">
                                <div class="flex justify-between text-slate-400">
                                    <span>Subtotal:</span>
                                    <span id="modalSubtotal" class="font-mono text-slate-200">C$ 0.00</span>
                                </div>
                                <div class="flex justify-between text-slate-400">
                                    <span>Costo de Envío:</span>
                                    <span id="modalDeliveryFee" class="font-mono text-slate-200">C$ 0.00</span>
                                </div>
                                <div class="flex justify-between font-bold text-sm pt-1 border-t border-slate-800 text-white">
                                    <span>Total Pedido:</span>
                                    <span id="modalTotalAmount" class="font-mono text-emerald-400 font-black">C$ 0.00</span>
                                </div>
                                <div class="flex justify-between text-[11px] text-slate-400 pt-1">
                                    <span>Método: <strong id="modalPaymentMethod" class="text-slate-300">EFECTIVO</strong></span>
                                    <span>Estado: <strong id="modalPaymentStatus" class="text-slate-300">PENDIENTE</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Ficha Proof of Delivery (PoD) & Incidencias -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- PoD -->
                        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <p class="font-bold text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <span>🛡️</span> Prueba de Entrega (PoD)
                            </p>
                            <div class="space-y-1 text-xs" id="modalPodDetails">
                                <p class="text-slate-400">Código OTP: <strong class="text-slate-200 font-mono" id="modalPodCode">No requerido</strong></p>
                                <p class="text-slate-400">Receptor: <span class="text-slate-300" id="modalPodRecipient">---</span></p>
                                <p class="text-slate-400">Fecha Entrega: <span class="text-slate-300" id="modalPodDate">---</span></p>
                            </div>
                        </div>

                        <!-- Incidencias & Rechazos -->
                        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <p class="font-bold text-rose-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <span>⚠️</span> Incidencias & Auditoría de Rechazos
                            </p>
                            <div class="text-xs space-y-1" id="modalIncidentsDetails">
                                <p class="text-slate-400">Sin incidencias registradas.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Ficha Conversación & Auditoría de Chat en Vivo (Cliente ↔ Motorizado) -->
                    <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between">
                            <p class="font-bold text-blue-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                <span>💬</span> Registro de Conversación & Auditoría en Vivo (Cliente ↔ Motorizado)
                            </p>
                            <span id="modalChatAuditBadge" class="text-[9px] font-mono px-2 py-0.5 rounded-full border bg-slate-900 border-slate-800 text-slate-400">0 mensajes</span>
                        </div>
                        <div id="modalChatConversationBox" class="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                            <p class="text-slate-500 text-[11px] italic">Consultando mensajes...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        liveOrdersModule.initSnapshotListener();
    },

    // ── 5. SUSCRIPCIÓN EN TIEMPO REAL A FIRESTORE ─────────────────────────────
    initSnapshotListener: () => {
        liveOrdersModule.destroy();
        liveOrdersModule.updateConnectionBadge('SYNCING');

        console.log("[LiveOrders] Initializing realtime listener on /orders...");

        try {
            liveOrdersModule.unsubscribeOrders = db.collection('orders')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .onSnapshot(snapshot => {
                    liveOrdersModule.connectionStatus = 'LIVE';
                    liveOrdersModule.lastSyncTimestamp = new Date();
                    liveOrdersModule.updateConnectionBadge('LIVE');

                    const rawOrders = [];
                    snapshot.forEach(doc => {
                        try {
                            const data = doc.data() || {};
                            rawOrders.push({ id: doc.id, ...data });
                        } catch (docErr) {
                            console.warn("[LiveOrders] Error parsing doc data for ID:", doc.id, docErr);
                        }
                    });

                    liveOrdersModule.ordersCache = rawOrders;
                    console.log(`[LiveOrders] Snapshot received: ${rawOrders.length} orders loaded.`);
                    
                    liveOrdersModule.updateKPIs();
                    liveOrdersModule.filterOrders();
                }, err => {
                    console.error("[LiveOrders] Firestore listener error:", err);
                    liveOrdersModule.connectionStatus = 'ERROR';
                    liveOrdersModule.updateConnectionBadge('ERROR');
                    liveOrdersModule.renderErrorState(err);
                });
        } catch (initErr) {
            console.error("[LiveOrders] Failed to initialize snapshot listener:", initErr);
            liveOrdersModule.connectionStatus = 'ERROR';
            liveOrdersModule.updateConnectionBadge('ERROR');
            liveOrdersModule.renderErrorState(initErr);
        }
    },

    refresh: () => {
        console.log("[LiveOrders] Manual refresh triggered.");
        liveOrdersModule.initSnapshotListener();
        if (typeof toast !== 'undefined' && toast.show) {
            toast.show("Reconectando monitor en tiempo real...", "info");
        }
    },

    updateConnectionBadge: (status) => {
        const badge = document.getElementById('liveOrdersConnectionBadge');
        if (!badge) return;

        if (status === 'LIVE') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-1.5';
            badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> LIVE';
        } else if (status === 'SYNCING') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse flex items-center gap-1.5';
            badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> SINCRONIZANDO';
        } else {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border bg-rose-500/10 border-rose-500/30 text-rose-400 flex items-center gap-1.5';
            badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400"></span> ERROR CONEXIÓN';
        }
    },

    // ── 6. CÁLCULO DE KPIS OPERACIONALES ──────────────────────────────────────
    updateKPIs: () => {
        const orders = liveOrdersModule.ordersCache;
        let active = 0, pending = 0, preparing = 0, ready = 0, assigned = 0, inTransit = 0, delivered = 0, incidents = 0;

        orders.forEach(ord => {
            const st = liveOrdersModule.normalizeOrderStatus(ord);
            const inc = liveOrdersModule.resolveIncidents(ord);

            if (inc.hasIncident) incidents++;

            switch (st) {
                case 'PENDING':
                    pending++;
                    active++;
                    break;
                case 'PREPARING':
                    preparing++;
                    active++;
                    break;
                case 'READY':
                    ready++;
                    active++;
                    break;
                case 'ASSIGNED':
                    assigned++;
                    active++;
                    break;
                case 'IN_TRANSIT':
                    inTransit++;
                    active++;
                    break;
                case 'DELIVERED':
                    delivered++;
                    break;
                case 'CANCELLED':
                    break;
                default:
                    active++;
            }
        });

        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };

        safeSet('kpiActiveCount', active);
        safeSet('kpiPendingCount', pending);
        safeSet('kpiPreparingCount', preparing);
        safeSet('kpiReadyCount', ready);
        safeSet('kpiAssignedCount', assigned);
        safeSet('kpiInTransitCount', inTransit);
        safeSet('kpiDeliveredCount', delivered);
        safeSet('kpiIncidentsCount', incidents);
    },

    // ── 7. FILTRADO Y RENDERIZADO DE LA TABLA ─────────────────────────────────
    filterOrders: () => {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        const query = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
        const statusFilter = document.getElementById('filterStatus')?.value || 'ALL';
        const paymentFilter = document.getElementById('filterPayment')?.value || 'ALL';
        const priorityFilter = document.getElementById('filterPriority')?.value || 'ALL';
        const incidentFilter = document.getElementById('filterIncidents')?.value || 'ALL';

        const filtered = liveOrdersModule.ordersCache.filter(ord => {
            const orderId = liveOrdersModule.resolveOrderId(ord).toLowerCase();
            const orderCode = liveOrdersModule.resolveOrderCode(ord).toLowerCase();
            const orderShortCode = liveOrdersModule.resolveOrderShortCode(ord).toLowerCase();
            const customerName = liveOrdersModule.resolveCustomerName(ord).toLowerCase();
            const customerPhone = liveOrdersModule.resolveCustomerPhone(ord).toLowerCase();
            const businessName = liveOrdersModule.resolveBusinessName(ord).toLowerCase();
            const branchName = liveOrdersModule.resolveBranchName(ord).toLowerCase();
            const courierName = liveOrdersModule.resolveCourierName(ord).toLowerCase();
            const courierId = liveOrdersModule.resolveCourierId(ord).toLowerCase();
            const courierPlate = liveOrdersModule.resolveCourierPlate(ord).toLowerCase();

            // 1. Filtro de Búsqueda Global
            const matchesQuery = !query ||
                orderId.includes(query) ||
                orderCode.includes(query) ||
                orderShortCode.includes(query) ||
                customerName.includes(query) ||
                customerPhone.includes(query) ||
                businessName.includes(query) ||
                branchName.includes(query) ||
                courierName.includes(query) ||
                courierId.includes(query) ||
                courierPlate.includes(query);

            // 2. Filtro de Estado Canónico
            const normalizedStatus = liveOrdersModule.normalizeOrderStatus(ord);
            const matchesStatus = statusFilter === 'ALL' || normalizedStatus === statusFilter;

            // 3. Filtro de Método de Pago
            const paymentMethod = liveOrdersModule.resolvePaymentMethod(ord);
            const matchesPayment = paymentFilter === 'ALL' || paymentMethod === paymentFilter;

            // 4. Filtro de Prioridad
            const priority = liveOrdersModule.resolvePriority(ord);
            const matchesPriority = priorityFilter === 'ALL' || priority === priorityFilter;

            // 5. Filtro de Incidencias
            const incidentsData = liveOrdersModule.resolveIncidents(ord);
            let matchesIncident = true;
            if (incidentFilter === 'WITH_INCIDENT') matchesIncident = incidentsData.hasIncident;
            if (incidentFilter === 'CLEAN') matchesIncident = !incidentsData.hasIncident;

            return matchesQuery && matchesStatus && matchesPayment && matchesPriority && matchesIncident;
        });

        // Actualizar Badge de Contador
        const counterEl = document.getElementById('liveOrdersCountersBadge');
        if (counterEl) {
            counterEl.textContent = `${filtered.length} visibles / ${liveOrdersModule.ordersCache.length} totales`;
        }

        // Estado Vacío (Empty State)
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="p-12 text-center text-slate-500">
                        <div class="flex flex-col items-center justify-center space-y-2">
                            <span class="text-3xl">📭</span>
                            <p class="font-bold text-slate-400">No se encontraron pedidos que coincidan con los filtros aplicados.</p>
                            <p class="text-[11px] text-slate-600">Intenta restablecer los filtros o buscar con otro criterio.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Renderizado de Filas con Normalización Defensiva
        tbody.innerHTML = filtered.map(ord => {
            const orderId = liveOrdersModule.resolveOrderId(ord);
            const orderCode = liveOrdersModule.resolveOrderCode(ord);
            const orderShortCode = liveOrdersModule.resolveOrderShortCode(ord);
            const status = liveOrdersModule.normalizeOrderStatus(ord);
            const total = liveOrdersModule.resolveOrderTotal(ord);
            const customerName = liveOrdersModule.resolveCustomerName(ord);
            const businessName = liveOrdersModule.resolveBusinessName(ord);
            const branchName = liveOrdersModule.resolveBranchName(ord);
            const courierName = liveOrdersModule.resolveCourierName(ord);
            const courierPlate = liveOrdersModule.resolveCourierPlate(ord);
            const eta = liveOrdersModule.resolveETA(ord);
            const trustScore = liveOrdersModule.resolveTrustScore(ord);
            const incidents = liveOrdersModule.resolveIncidents(ord);
            const paymentMethod = liveOrdersModule.resolvePaymentMethod(ord);
            const paymentStatus = liveOrdersModule.resolvePaymentStatus(ord);

            // Badge de Estado
            let badgeClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            if (status === 'PENDING') badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            else if (status === 'PREPARING') badgeClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
            else if (status === 'READY') badgeClass = 'bg-teal-500/10 text-teal-400 border-teal-500/30';
            else if (status === 'ASSIGNED') badgeClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
            else if (status === 'IN_TRANSIT') badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-black animate-pulse';
            else if (status === 'DELIVERED') badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            else if (status === 'CANCELLED') badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

            return `
                <tr class="hover:bg-slate-800/40 transition duration-150 border-b border-slate-800/60">
                    <td class="p-4 font-mono font-bold text-indigo-400">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span title="${orderCode ? `${orderCode} (${orderId})` : orderId}">${orderCode || (orderId.length > 8 ? orderId.slice(0, 8) + '…' : orderId)}</span>
                            ${orderShortCode ? `<span class="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30 font-mono">${orderShortCode}</span>` : ''}
                            <button onclick="liveOrdersModule.copyToClipboard('${orderCode || orderId}')" title="Copiar código operativo o ID" class="text-slate-500 hover:text-slate-300 text-xs">📋</button>
                        </div>
                        ${orderCode ? `<p class="text-[9px] text-slate-500 font-mono font-normal">#${orderId.slice(0, 6)}…</p>` : ''}
                    </td>
                    <td class="p-4 font-semibold text-slate-200">
                        <p class="truncate max-w-[150px]" title="${customerName}">${customerName}</p>
                    </td>
                    <td class="p-4 text-slate-300">
                        <p class="font-bold text-white truncate max-w-[160px]" title="${businessName}">${businessName}</p>
                        ${branchName ? `<p class="text-[10px] text-slate-400 truncate max-w-[160px]">${branchName}</p>` : ''}
                    </td>
                    <td class="p-4 text-slate-300">
                        <p class="font-semibold text-slate-200 truncate max-w-[140px]">${courierName}</p>
                        ${courierPlate ? `<p class="text-[10px] font-mono text-slate-400">${courierPlate}</p>` : ''}
                    </td>
                    <td class="p-4">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeClass}">
                            ${status}
                        </span>
                    </td>
                    <td class="p-4 font-bold text-slate-300">
                        ${eta}
                    </td>
                    <td class="p-4">
                        <p class="font-black text-emerald-400 font-mono">${liveOrdersModule.formatCurrency(total)}</p>
                        <p class="text-[10px] text-slate-400">${paymentMethod} • <span class="${paymentStatus === 'PAGADO' ? 'text-emerald-400' : 'text-amber-400'} font-semibold">${paymentStatus}</span></p>
                    </td>
                    <td class="p-4 font-bold text-slate-300">
                        ${trustScore}
                    </td>
                    <td class="p-4">
                        ${incidents.hasIncident 
                            ? `<span class="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20" title="${incidents.reason || 'Incidencia activa'}">⚠️ Alerta</span>` 
                            : '<span class="text-slate-500">Sin incidencias</span>'}
                    </td>
                    <td class="p-4 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="liveOrdersModule.openDetailModal('${orderId}')" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition duration-150 border border-indigo-500/30 flex items-center gap-1">
                                <span>🔍</span> Detalle
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderErrorState: (err) => {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="p-12 text-center text-rose-400">
                    <div class="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                        <span class="text-4xl">⚠️</span>
                        <h3 class="font-bold text-white text-sm">No fue posible cargar los pedidos en tiempo real</h3>
                        <p class="text-xs text-slate-400">Ocurrió un error al establecer la conexión con Firestore o no se cuenta con los privilegios suficientes.</p>
                        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-500 w-full text-left overflow-x-auto">
                            ${err?.message || String(err)}
                        </div>
                        <button onclick="liveOrdersModule.refresh()" class="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">
                            Reintentar Conexión
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // ── 8. MODAL DE DETALLE ENTERPRISE & TIMELINE ──────────────────────────────
    openDetailModal: (orderId) => {
        const ord = liveOrdersModule.ordersCache.find(o => liveOrdersModule.resolveOrderId(o) === orderId);
        if (!ord) return;

        liveOrdersModule.selectedOrder = ord;

        const resolvedId = liveOrdersModule.resolveOrderId(ord);
        const orderCode = liveOrdersModule.resolveOrderCode(ord);
        const orderShortCode = liveOrdersModule.resolveOrderShortCode(ord);
        const status = liveOrdersModule.normalizeOrderStatus(ord);
        const customerName = liveOrdersModule.resolveCustomerName(ord);
        const customerPhone = liveOrdersModule.resolveCustomerPhone(ord);
        const customerAddress = liveOrdersModule.resolveCustomerAddress(ord);
        const businessName = liveOrdersModule.resolveBusinessName(ord);
        const branchName = liveOrdersModule.resolveBranchName(ord);
        const businessAddress = liveOrdersModule.resolveBusinessAddress(ord);
        const courierId = liveOrdersModule.resolveCourierId(ord);
        const courierName = liveOrdersModule.resolveCourierName(ord);
        const courierPlate = liveOrdersModule.resolveCourierPlate(ord);
        const total = liveOrdersModule.resolveOrderTotal(ord);
        const subtotal = liveOrdersModule.resolveSubtotal(ord);
        const deliveryFee = liveOrdersModule.resolveDeliveryFee(ord);
        const paymentMethod = liveOrdersModule.resolvePaymentMethod(ord);
        const paymentStatus = liveOrdersModule.resolvePaymentStatus(ord);
        const pod = liveOrdersModule.resolveProofOfDelivery(ord);
        const incidents = liveOrdersModule.resolveIncidents(ord);

        // Header
        const modalIdEl = document.getElementById('modalOrderId');
        if (modalIdEl) {
            if (orderCode) {
                modalIdEl.innerHTML = `<span class="text-indigo-400">${orderCode}</span> ${orderShortCode ? `<span class="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">${orderShortCode}</span>` : ''} <span class="text-xs text-slate-500 font-normal font-mono">(${resolvedId})</span>`;
            } else {
                modalIdEl.textContent = `Pedido #${resolvedId}`;
            }
        }

        const modalTsEl = document.getElementById('modalOrderTimestamp');
        if (modalTsEl) modalTsEl.textContent = `Registrado: ${liveOrdersModule.formatDate(ord.createdAt || ord.creadoEl)}`;

        const statusBadgeEl = document.getElementById('modalOrderStatusBadge');
        if (statusBadgeEl) {
            statusBadgeEl.textContent = status;
            statusBadgeEl.className = `px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                status === 'IN_TRANSIT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`;
        }

        // Cliente
        const custNameEl = document.getElementById('modalCustomerName');
        if (custNameEl) custNameEl.textContent = customerName;
        const custPhoneEl = document.getElementById('modalCustomerPhone');
        if (custPhoneEl) custPhoneEl.textContent = customerPhone;
        const custAddrEl = document.getElementById('modalCustomerAddress');
        if (custAddrEl) custAddrEl.textContent = customerAddress;

        // Comercio
        const storeNameEl = document.getElementById('modalStoreName');
        if (storeNameEl) storeNameEl.textContent = businessName;
        const branchNameEl = document.getElementById('modalBranchName');
        if (branchNameEl) branchNameEl.textContent = branchName || 'Casa Matriz / Principal';
        const storeAddrEl = document.getElementById('modalStoreAddress');
        if (storeAddrEl) storeAddrEl.textContent = businessAddress;

        // Motorizado
        const courNameEl = document.getElementById('modalCourierName');
        if (courNameEl) courNameEl.textContent = courierName;
        const courIdEl = document.getElementById('modalCourierId');
        if (courIdEl) courIdEl.textContent = courierId ? courierId : 'No asignado';
        const courPlateEl = document.getElementById('modalCourierPlate');
        if (courPlateEl) courPlateEl.textContent = courierPlate ? courierPlate : 'Sin registro de placa';

        const courStatusEl = document.getElementById('modalCourierLiveStatus');
        if (courStatusEl) {
            if (!courierId) {
                courStatusEl.textContent = 'SIN ASIGNAR';
                courStatusEl.className = 'text-[9px] font-mono px-2 py-0.5 rounded-full border bg-slate-900 border-slate-800 text-slate-500';
            } else if (status === 'IN_TRANSIT') {
                courStatusEl.textContent = 'EN RUTA';
                courStatusEl.className = 'text-[9px] font-mono px-2 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-400 font-bold';
            } else {
                courStatusEl.textContent = 'ASIGNADO';
                courStatusEl.className = 'text-[9px] font-mono px-2 py-0.5 rounded-full border bg-teal-500/10 border-teal-500/30 text-teal-400';
            }
        }

        // Escuchar Telemetría GPS en Vivo del Motorizado
        liveOrdersModule.listenCourierGps(courierId, ord);

        // Financiero
        const serviceType = ord.serviceType || ord.tipoServicio || '';
        const isXToY = serviceType === 'X_TO_Y_DELIVERY' || serviceType === 'P2P';

        const subEl = document.getElementById('modalSubtotal');
        const feeEl = document.getElementById('modalDeliveryFee');
        const totEl = document.getElementById('modalTotalAmount');
        const payMethEl = document.getElementById('modalPaymentMethod');
        const payStatEl = document.getElementById('modalPaymentStatus');

        if (isXToY) {
            const courierEarnings = ord.courierTotalEarnings || ord.courierEarnings || 0;
            const pricingSnapshot = ord.pricingSnapshot || {};
            const baseFee = pricingSnapshot.baseFee || 35;
            const computedEarnings = courierEarnings > 0 ? courierEarnings : (total > baseFee ? total - baseFee : 0);
            
            if (subEl) {
                subEl.textContent = liveOrdersModule.formatCurrency(computedEarnings);
                if (subEl.previousElementSibling) subEl.previousElementSibling.textContent = 'Ganancia Courier:';
                subEl.className = "font-mono text-emerald-300 font-bold";
            }
            if (feeEl) {
                feeEl.textContent = liveOrdersModule.formatCurrency(baseFee);
                if (feeEl.previousElementSibling) feeEl.previousElementSibling.textContent = 'Ingreso Plataforma:';
                feeEl.className = "font-mono text-blue-300 font-bold";
            }
            if (totEl) {
                totEl.textContent = liveOrdersModule.formatCurrency(total);
                if (totEl.previousElementSibling) totEl.previousElementSibling.textContent = 'Total Cliente:';
            }
        } else {
            if (subEl) {
                subEl.textContent = liveOrdersModule.formatCurrency(subtotal > 0 ? subtotal : total);
                if (subEl.previousElementSibling) subEl.previousElementSibling.textContent = 'Subtotal:';
                subEl.className = "font-mono text-slate-200";
            }
            if (feeEl) {
                feeEl.textContent = liveOrdersModule.formatCurrency(deliveryFee);
                if (feeEl.previousElementSibling) feeEl.previousElementSibling.textContent = 'Costo de Envío:';
                feeEl.className = "font-mono text-slate-200";
            }
            if (totEl) {
                totEl.textContent = liveOrdersModule.formatCurrency(total);
                if (totEl.previousElementSibling) totEl.previousElementSibling.textContent = 'Total Pedido:';
            }
        }

        if (payMethEl) payMethEl.textContent = paymentMethod;
        if (payStatEl) payStatEl.textContent = paymentStatus;

        // PoD
        const podCodeEl = document.getElementById('modalPodCode');
        if (podCodeEl) podCodeEl.textContent = pod.code;
        const podRecEl = document.getElementById('modalPodRecipient');
        if (podRecEl) podRecEl.textContent = pod.recipientName;
        const podDateEl = document.getElementById('modalPodDate');
        if (podDateEl) podDateEl.textContent = pod.timestamp ? liveOrdersModule.formatDate(pod.timestamp) : 'Pendiente de entrega';

        // Incidencias
        const incCont = document.getElementById('modalIncidentsDetails');
        if (incCont) {
            if (incidents.hasIncident) {
                incCont.innerHTML = `
                    <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                        <p class="font-bold text-rose-400">⚠️ Incidencia Operacional Detectada</p>
                        <p class="text-slate-300">${incidents.reason || 'Alerta reportada en el ciclo del pedido'}</p>
                        ${incidents.rejectedBy ? `<p class="text-[10px] text-slate-400">Reportado por: <span class="text-slate-300">${incidents.rejectedBy}</span></p>` : ''}
                        ${incidents.rejectedAt ? `<p class="text-[10px] text-slate-400">Fecha reporte: <span class="text-slate-300">${liveOrdersModule.formatDate(incidents.rejectedAt)}</span></p>` : ''}
                    </div>
                `;
            } else {
                incCont.innerHTML = `<p class="text-slate-400">Sin incidencias ni rechazos registrados para esta orden.</p>`;
            }
        }

        // Renderizar Timeline de 12 Etapas
        const timeline = liveOrdersModule.resolveTimelineEvents(ord);
        const timelineGrid = document.getElementById('timelineGrid');
        if (timelineGrid) {
            timelineGrid.innerHTML = timeline.map(st => {
                let cardClass = 'bg-slate-900/60 border-slate-800 text-slate-600';
                let iconColor = 'text-slate-600';
                let statusBadge = '<span class="text-slate-600">Pendiente</span>';

                if (st.isCompleted) {
                    cardClass = 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200 shadow-sm';
                    iconColor = 'text-indigo-400';
                    statusBadge = '<span class="text-emerald-400 font-bold">✓ Completado</span>';
                } else if (st.isCurrent) {
                    cardClass = 'bg-blue-600/20 border-blue-500/60 text-blue-200 ring-1 ring-blue-500 animate-pulse';
                    iconColor = 'text-blue-400';
                    statusBadge = '<span class="text-cyan-300 font-bold">● En Curso</span>';
                }

                return `
                    <div class="p-2.5 rounded-xl border flex flex-col justify-between ${cardClass} min-h-[75px]">
                        <div>
                            <div class="flex items-center justify-between text-[11px] mb-1">
                                <span>${st.icon}</span>
                                <span class="text-[9px] font-mono">${statusBadge}</span>
                            </div>
                            <p class="font-bold truncate text-[10px] text-slate-200">${st.label}</p>
                        </div>
                        <p class="text-[9px] font-mono text-slate-400 mt-1 truncate">
                            ${st.hasRealTimestamp ? st.timestamp : (st.isCompleted ? 'Registrado' : 'Sin registro')}
                        </p>
                    </div>
                `;
            }).join('');
        }

        // Escuchar Conversación / Chat del Pedido (Auditoría en Vivo)
        liveOrdersModule.listenOrderChat(resolvedId, ord?.serviceType);

        const modal = document.getElementById('orderDetailModal');
        if (modal) modal.classList.remove('hidden');
    },

    closeDetailModal: () => {
        const modal = document.getElementById('orderDetailModal');
        if (modal) modal.classList.add('hidden');
        if (liveOrdersModule.unsubscribeCourierGps) {
            try { liveOrdersModule.unsubscribeCourierGps(); } catch(e){}
            liveOrdersModule.unsubscribeCourierGps = null;
        }
        if (liveOrdersModule.unsubscribeOrderChat) {
            try { liveOrdersModule.unsubscribeOrderChat(); } catch(e){}
            liveOrdersModule.unsubscribeOrderChat = null;
        }
        liveOrdersModule.selectedOrder = null;
    },

    listenCourierGps: (courierId, order) => {
        if (liveOrdersModule.unsubscribeCourierGps) {
            try { liveOrdersModule.unsubscribeCourierGps(); } catch(e){}
            liveOrdersModule.unsubscribeCourierGps = null;
        }

        const gpsTextEl = document.getElementById('modalCourierGpsText');
        if (!gpsTextEl) return;

        if (!courierId) {
            gpsTextEl.textContent = 'No aplica (Sin motorizado asignado)';
            return;
        }

        // Consultar ubicación en tiempo real desde /ubicaciones_repartidores/{courierId}
        try {
            liveOrdersModule.unsubscribeCourierGps = db.collection('ubicaciones_repartidores').doc(courierId)
                .onSnapshot(doc => {
                    if (!doc.exists) {
                        // Fallback a ubicación asociada al pedido
                        if (order?.ubicacionRepartidor?.latitud && order?.ubicacionRepartidor?.longitud) {
                            gpsTextEl.innerHTML = `<span class="text-slate-300 font-mono">${order.ubicacionRepartidor.latitud.toFixed(4)}, ${order.ubicacionRepartidor.longitud.toFixed(4)}</span> <span class="text-amber-400 text-[10px]">(Telemetría de la orden)</span>`;
                        } else {
                            gpsTextEl.textContent = 'Ubicación GPS no emitida aún';
                        }
                        return;
                    }

                    const data = doc.data() || {};
                    const coords = data.coordenadas || data.coordinates || data.location || {};
                    const lat = coords.latitud ?? coords.latitude ?? coords.lat;
                    const lng = coords.longitud ?? coords.longitude ?? coords.lng;
                    const updatedAt = liveOrdersModule.normalizeDate(data.ultimaActualizacion || data.updatedAt || data.timestamp);

                    if (lat !== undefined && lng !== undefined) {
                        const numLat = Number(lat);
                        const numLng = Number(lng);
                        const isFresh = updatedAt ? (Date.now() - updatedAt.getTime() < 120000) : false;

                        gpsTextEl.innerHTML = `
                            <span class="font-mono text-white font-bold">${numLat.toFixed(5)}, ${numLng.toFixed(5)}</span>
                            <span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${isFresh ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                ${isFresh ? '● GPS LIVE' : 'GPS DESACTUALIZADO'}
                            </span>
                            ${updatedAt ? `<span class="text-[9px] text-slate-400 block mt-0.5">Última señal: ${liveOrdersModule.formatDate(updatedAt)}</span>` : ''}
                        `;
                    } else {
                        gpsTextEl.textContent = 'Sin coordenadas GPS válidas';
                    }
                }, err => {
                    console.warn("[LiveOrders] Error listening to courier GPS:", err);
                    gpsTextEl.textContent = 'Error al consultar GPS';
                });
        } catch (e) {
            gpsTextEl.textContent = 'Telemetría no disponible';
        }
    },

    listenOrderChat: (orderId, serviceType = '') => {
        if (liveOrdersModule.unsubscribeOrderChat) {
            try { liveOrdersModule.unsubscribeOrderChat(); } catch(e){}
            liveOrdersModule.unsubscribeOrderChat = null;
        }

        const chatBox = document.getElementById('modalChatConversationBox');
        const badge = document.getElementById('modalChatAuditBadge');
        if (!chatBox) return;

        chatBox.innerHTML = '<p class="text-slate-500 text-[11px] italic">Consultando mensajes...</p>';

        const isXToY = serviceType === 'X_TO_Y_DELIVERY' || serviceType === 'P2P';
        const collectionName = isXToY ? 'deliveryTrips' : 'orders';

        try {
            liveOrdersModule.unsubscribeOrderChat = db.collection(collectionName).doc(orderId).collection('messages')
                .orderBy('createdAt', 'asc')
                .onSnapshot(snap => {
                    if (badge) badge.textContent = `${snap.size} mensaje(s)`;
                    if (snap.empty) {
                        chatBox.innerHTML = '<p class="text-slate-500 text-[11px] italic">Sin mensajes registrados en este servicio.</p>';
                        return;
                    }

                    chatBox.innerHTML = snap.docs.map(doc => {
                        const d = doc.data();
                        const role = (d.senderRole || 'CUSTOMER').toUpperCase();
                        const isCustomer = role === 'CUSTOMER';
                        const isCall = d.type === 'CALL_EVENT';
                        const senderName = d.senderNameSnapshot || d.senderName || (isCustomer ? 'Cliente' : 'Motorizado');
                        const text = d.text || '';
                        const ts = d.createdAt ? liveOrdersModule.formatDate(d.createdAt) : 'Enviando...';

                        if (isCall) {
                            return `
                                <div class="flex justify-center my-1">
                                    <span class="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                        <span>📞</span> ${text} • <span class="font-mono text-slate-500">${ts}</span>
                                    </span>
                                </div>
                            `;
                        }

                        return `
                            <div class="flex flex-col ${isCustomer ? 'items-start' : 'items-end'} mb-1.5">
                                <span class="text-[9px] font-bold text-slate-400 mb-0.5">${isCustomer ? '👤 ' + senderName : '🛵 ' + senderName}</span>
                                <div class="max-w-[85%] p-2.5 rounded-xl text-xs ${isCustomer ? 'bg-slate-900 text-slate-200 border border-slate-800' : 'bg-blue-600/90 text-white shadow-sm'}">
                                    <p class="leading-relaxed">${text}</p>
                                    <span class="text-[8px] opacity-70 block text-right mt-1">${ts}</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                }, err => {
                    console.warn("[LiveOrders] Error listening to messages in " + collectionName + ":", err);
                    chatBox.innerHTML = '<p class="text-rose-400 text-[11px]">Error al consultar la conversación.</p>';
                });
        } catch (e) {
            chatBox.innerHTML = '<p class="text-slate-500 text-[11px]">Conversación no disponible.</p>';
        }
    },

    destroy: () => {
        if (liveOrdersModule.unsubscribeOrders) {
            try { liveOrdersModule.unsubscribeOrders(); } catch(e){}
            liveOrdersModule.unsubscribeOrders = null;
        }
        if (liveOrdersModule.unsubscribeCourierGps) {
            try { liveOrdersModule.unsubscribeCourierGps(); } catch(e){}
            liveOrdersModule.unsubscribeCourierGps = null;
        }
        if (liveOrdersModule.unsubscribeOrderChat) {
            try { liveOrdersModule.unsubscribeOrderChat(); } catch(e){}
            liveOrdersModule.unsubscribeOrderChat = null;
        }
        liveOrdersModule.ordersCache = [];
        liveOrdersModule.selectedOrder = null;
    },

    copyToClipboard: (text) => {
        if (!navigator.clipboard) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        } else {
            navigator.clipboard.writeText(text);
        }

        if (typeof toast !== 'undefined' && toast.show) {
            toast.show(`ID copiado: #${text}`, 'success');
        }
    }
};

window.liveOrdersModule = liveOrdersModule;
