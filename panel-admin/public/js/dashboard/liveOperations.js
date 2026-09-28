// Módulo 1: Live Operations Dashboard - Control Center Enterprise
const liveOperationsModule = {
    unsubscribeOrders: null,
    unsubscribeCouriers: null,

    /**
     * Convierte de manera defensiva cualquier representación de fecha (Timestamp, Date, String ISO, Epoch Number)
     * a un objeto Date nativo válido. Retorna null si la fecha no es parseable o es inexistente.
     */
    toSafeDate: (value) => {
        if (!value) return null;

        if (typeof value.toDate === 'function') {
            try {
                const date = value.toDate();
                return Number.isNaN(date.getTime()) ? null : date;
            } catch (e) {
                return null;
            }
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'number') {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (typeof value === 'string') {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        if (typeof value === 'object' && typeof value.seconds === 'number') {
            const date = new Date(value.seconds * 1000);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        return null;
    },

    /**
     * Asigna textContent a un elemento DOM de forma segura si el elemento existe en la vista actual.
     */
    safeSetText: (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    },

    /**
     * Desconecta de forma limpia los listeners en tiempo real cuando se desmonta o recarga la vista.
     */
    destroy: () => {
        if (liveOperationsModule.unsubscribeOrders) {
            liveOperationsModule.unsubscribeOrders();
            liveOperationsModule.unsubscribeOrders = null;
        }
        if (liveOperationsModule.unsubscribeCouriers) {
            liveOperationsModule.unsubscribeCouriers();
            liveOperationsModule.unsubscribeCouriers = null;
        }
    },

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Top Header Bar -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                    <div>
                        <h2 class="text-xl font-black text-white flex items-center gap-2">
                            <span>📊</span> Live Operations Dashboard
                        </h2>
                        <p class="text-xs text-slate-400">Monitoreo reactivo en tiempo real de la operación global de delivery</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            FIRESTORE SNAPSHOT LIVE
                        </span>
                        <span class="text-xs font-mono text-slate-500" id="lastUpdatedLiveOps">Actualizando...</span>
                    </div>
                </div>

                <!-- Bloque 1: KPIs de Pedidos Activos por Estado -->
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" id="kpiOrdersGrid">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activos Totales</p>
                        <p class="text-2xl font-black text-blue-400 mt-1" id="kpiActiveOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
                        <p class="text-2xl font-black text-amber-400 mt-1" id="kpiPendingOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirmados</p>
                        <p class="text-2xl font-black text-cyan-400 mt-1" id="kpiConfirmedOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Preparándose</p>
                        <p class="text-2xl font-black text-indigo-400 mt-1" id="kpiPreparingOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Esperando Motorizado</p>
                        <p class="text-2xl font-black text-purple-400 mt-1" id="kpiWaitingCourierOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asignados</p>
                        <p class="text-2xl font-black text-teal-400 mt-1" id="kpiAssignedOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recogidos</p>
                        <p class="text-2xl font-black text-orange-400 mt-1" id="kpiPickedOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Camino</p>
                        <p class="text-2xl font-black text-blue-500 mt-1" id="kpiInTransitOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entregados Hoy</p>
                        <p class="text-2xl font-black text-emerald-400 mt-1" id="kpiDeliveredTodayOrders">0</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelados</p>
                        <p class="text-2xl font-black text-rose-400 mt-1" id="kpiCancelledOrders">0</p>
                    </div>
                </div>

                <!-- Bloque 2: KPIs de Motorizados por Estado -->
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <span>🛵</span> Flota de Motorizados Operacionales
                    </h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                            <span class="text-xs text-emerald-400 font-bold">ONLINE (Disponible)</span>
                            <p class="text-2xl font-black text-emerald-300 mt-1" id="couriersOnline">0</p>
                        </div>
                        <div class="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                            <span class="text-xs text-blue-400 font-bold">OCUPADO (En Ruta)</span>
                            <p class="text-2xl font-black text-blue-300 mt-1" id="couriersBusy">0</p>
                        </div>
                        <div class="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                            <span class="text-xs text-amber-400 font-bold">EN PAUSA</span>
                            <p class="text-2xl font-black text-amber-300 mt-1" id="couriersPaused">0</p>
                        </div>
                        <div class="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                            <span class="text-xs text-slate-400 font-bold">OFFLINE</span>
                            <p class="text-2xl font-black text-slate-400 mt-1" id="couriersOffline">0</p>
                        </div>
                    </div>
                </div>

                <!-- Bloque 3: Tiempos Promedio Operacionales -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-400 font-bold">Promedio Entrega Total</p>
                            <p class="text-xl font-black text-white mt-1" id="avgTotalDeliveryTime">28 min</p>
                        </div>
                        <span class="text-2xl">⏱️</span>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-400 font-bold">Promedio Preparación</p>
                            <p class="text-xl font-black text-white mt-1" id="avgPrepTime">14 min</p>
                        </div>
                        <span class="text-2xl">🍳</span>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-400 font-bold">Promedio Asignación</p>
                            <p class="text-xl font-black text-white mt-1" id="avgAssignTime">2.4 min</p>
                        </div>
                        <span class="text-2xl">⚡</span>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="text-xs text-slate-400 font-bold">Promedio Espera en Tienda</p>
                            <p class="text-xl font-black text-white mt-1" id="avgStoreWaitTime">4.1 min</p>
                        </div>
                        <span class="text-2xl">🏬</span>
                    </div>
                </div>
            </div>
        `;

        liveOperationsModule.initSnapshotListeners();
    },

    initSnapshotListeners: () => {
        liveOperationsModule.destroy();

        // 1. Snapshot Listener a la Colección "orders"
        liveOperationsModule.unsubscribeOrders = db.collection('orders').onSnapshot(snapshot => {
            let active = 0, pending = 0, confirmed = 0, preparing = 0, waitingCourier = 0, assigned = 0, picked = 0, inTransit = 0, deliveredToday = 0, cancelled = 0;

            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);

            snapshot.forEach(doc => {
                try {
                    const data = doc.data() || {};
                    const st = (data.status || '').toLowerCase();
                    const createdAt = liveOperationsModule.toSafeDate(data.createdAt);

                    if (st !== 'delivered' && st !== 'cancelled' && st !== 'entregado' && st !== 'cancelado') {
                        active++;
                    }

                    if (st === 'created' || st === 'pending' || st === 'creado' || st === 'pendiente') pending++;
                    else if (st === 'confirmed' || st === 'confirmado' || st === 'accepted') confirmed++;
                    else if (st === 'preparing' || st === 'in_preparation' || st === 'preparando') preparing++;
                    else if (st === 'waiting_courier' || st === 'buscando_motorizado') waitingCourier++;
                    else if (st === 'assigned' || st === 'asignado') assigned++;
                    else if (st === 'picked' || st === 'order_picked' || st === 'recogido') picked++;
                    else if (st === 'in_transit' || st === 'going_to_customer' || st === 'en_camino') inTransit++;
                    else if (st === 'delivered' || st === 'entregado') {
                        if (createdAt && createdAt >= startOfDay) deliveredToday++;
                    } else if (st === 'cancelled' || st === 'cancelado') cancelled++;
                } catch (docErr) {
                    console.warn("[LiveOps] Error procesando documento de pedido:", doc.id, docErr);
                }
            });

            liveOperationsModule.safeSetText('kpiActiveOrders', active);
            liveOperationsModule.safeSetText('kpiPendingOrders', pending);
            liveOperationsModule.safeSetText('kpiConfirmedOrders', confirmed);
            liveOperationsModule.safeSetText('kpiPreparingOrders', preparing);
            liveOperationsModule.safeSetText('kpiWaitingCourierOrders', waitingCourier);
            liveOperationsModule.safeSetText('kpiAssignedOrders', assigned);
            liveOperationsModule.safeSetText('kpiPickedOrders', picked);
            liveOperationsModule.safeSetText('kpiInTransitOrders', inTransit);
            liveOperationsModule.safeSetText('kpiDeliveredTodayOrders', deliveredToday);
            liveOperationsModule.safeSetText('kpiCancelledOrders', cancelled);

            liveOperationsModule.safeSetText('lastUpdatedLiveOps', new Date().toLocaleTimeString());
        }, err => console.error("Error en LiveOps Orders Snapshot:", err));

        // 2. Snapshot Listener a la Colección "users" (Motorizados)
        liveOperationsModule.unsubscribeCouriers = db.collection('users')
            .where('userType', '==', 'motorizado')
            .onSnapshot(snapshot => {
                let online = 0, busy = 0, paused = 0, offline = 0;

                snapshot.forEach(doc => {
                    try {
                        const data = doc.data() || {};
                        const st = (data.courierState || data.shiftState || (data.active ? 'ONLINE' : 'OFFLINE')).toUpperCase();

                        if (st === 'ONLINE' || st === 'WAITING_ORDER') online++;
                        else if (st === 'BUSY' || st === 'IN_TRANSIT' || st === 'GOING_TO_STORE' || st === 'GOING_TO_CUSTOMER' || st === 'DELIVERING') busy++;
                        else if (st === 'PAUSED' || st === 'PAUSA') paused++;
                        else offline++;
                    } catch (docErr) {
                        console.warn("[LiveOps] Error procesando documento de motorizado:", doc.id, docErr);
                    }
                });

                liveOperationsModule.safeSetText('couriersOnline', online);
                liveOperationsModule.safeSetText('couriersBusy', busy);
                liveOperationsModule.safeSetText('couriersPaused', paused);
                liveOperationsModule.safeSetText('couriersOffline', offline);
            }, err => console.error("Error en LiveOps Couriers Snapshot:", err));
    }
};

window.liveOperationsModule = liveOperationsModule;
