// Módulo 14 & 18: Herramientas Operativas y Control de Roles RBAC
const opsToolsModule = {
    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                    <div>
                        <h2 class="text-xl font-black text-white flex items-center gap-2">
                            <span>🛠️</span> Herramientas Operativas & Control de Misión
                        </h2>
                        <p class="text-xs text-slate-400">Consola de intervención directa: reasignación de órdenes, cancelaciones, cambios de motorizado y llamadas</p>
                    </div>
                </div>

                <!-- Tools Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Reasignar Pedido -->
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                        <h3 class="font-bold text-sm text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🔄</span> Reasignar Motorizado
                        </h3>
                        <div class="space-y-3 text-xs">
                            <div>
                                <label class="text-[10px] text-slate-400 uppercase font-bold">ID del Pedido</label>
                                <input type="text" id="reassignOrderId" placeholder="ej: ord_12345" class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white mt-1">
                            </div>
                            <div>
                                <label class="text-[10px] text-slate-400 uppercase font-bold">Nuevo Motorizado UID</label>
                                <input type="text" id="reassignCourierId" placeholder="ej: usr_motorizado_789" class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white mt-1">
                            </div>
                            <button onclick="opsToolsModule.reassignOrder()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition text-xs">
                                Ejecutar Reasignación
                            </button>
                        </div>
                    </div>

                    <!-- Cancelar Pedido -->
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                        <h3 class="font-bold text-sm text-rose-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🚫</span> Cancelar Pedido Activo
                        </h3>
                        <div class="space-y-3 text-xs">
                            <div>
                                <label class="text-[10px] text-slate-400 uppercase font-bold">ID del Pedido</label>
                                <input type="text" id="cancelOrderId" placeholder="ej: ord_12345" class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white mt-1">
                            </div>
                            <div>
                                <label class="text-[10px] text-slate-400 uppercase font-bold">Motivo de Cancelación</label>
                                <input type="text" id="cancelReason" placeholder="ej: Comercio sin insumos" class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white mt-1">
                            </div>
                            <button onclick="opsToolsModule.cancelOrder()" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition text-xs">
                                Cancelar Pedido Ahora
                            </button>
                        </div>
                    </div>

                    <!-- Broadcast Notificación -->
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                        <h3 class="font-bold text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <span>📢</span> Broadcast / Alerta General
                        </h3>
                        <div class="space-y-3 text-xs">
                            <div>
                                <label class="text-[10px] text-slate-400 uppercase font-bold">Título Alerta</label>
                                <input type="text" id="broadcastTitle" placeholder="ej: ⚠️ Alerta de Lluvia Intensa" class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white mt-1">
                            </div>
                            <div>
                                <label class="text-[10px] text-slate-400 uppercase font-bold">Mensaje Push</label>
                                <input type="text" id="broadcastMessage" placeholder="Conduzcan con precaución..." class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white mt-1">
                            </div>
                            <button onclick="opsToolsModule.sendBroadcast()" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition text-xs">
                                Emitir Notificación General
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    reassignOrder: async () => {
        const orderId = document.getElementById('reassignOrderId')?.value.trim();
        const courierId = document.getElementById('reassignCourierId')?.value.trim();

        if (!orderId || !courierId) {
            toast.error("Debe ingresar el ID del pedido y el UID del motorizado");
            return;
        }

        const orderRef = db.collection('orders').doc(orderId);
        const courierRef = db.collection('users').doc(courierId);
        const courierProfileRef = db.collection('couriers').doc(courierId);
        const balanceRef = db.collection('courier_balances').doc(courierId);

        try {
            await db.runTransaction(async (transaction) => {
                // 1. Leer pedido
                const orderSnap = await transaction.get(orderRef);
                if (!orderSnap.exists) {
                    throw new Error(`El pedido #${orderId} no existe.`);
                }
                const orderData = orderSnap.data() || {};
                const currentStatus = String(orderData.status || orderData.estado || '').toLowerCase();
                if (['delivered', 'completed', 'cancelled', 'entregado', 'completado', 'cancelado'].includes(currentStatus)) {
                    throw new Error(`No se puede reasignar un pedido en estado final (${orderData.status}).`);
                }

                // 2. Leer balance y evaluar política financiera canónica (BSD-C4-006)
                const balanceSnap = await transaction.get(balanceRef);
                if (balanceSnap.exists) {
                    const balData = balanceSnap.data() || {};
                    const canReceive = balData.canReceiveNewOrders ?? true;
                    const accessState = String(balData.financialAccessState || 'ALLOW');
                    const cashCents = Number(balData.cashOutstandingCents || 0);
                    const limitCents = Number(balData.effectiveCashLimitCents || balData.cashLimitCents || 200000);
                    const hasOverdue = balData.hasOverdueClosure === true;
                    const reason = balData.financialAccessReason || 'Restricciones financieras activas.';

                    if (!canReceive || accessState.startsWith('BLOCKED') || hasOverdue || (limitCents > 0 && cashCents >= limitCents)) {
                        throw new Error(`Reasignación rechazada: Motorizado bloqueado financieramente (${reason}).`);
                    }
                }

                // 3. Validar courier y compatibilidad multi-tenant
                const userSnap = await transaction.get(courierRef);
                const profileSnap = await transaction.get(courierProfileRef);

                if (!userSnap.exists && !profileSnap.exists) {
                    throw new Error(`El motorizado ${courierId} no existe en el sistema.`);
                }

                const userData = userSnap.exists ? userSnap.data() : {};
                const profileData = profileSnap.exists ? profileSnap.data() : {};

                const courierTenant = String(userData.tenantId || userData.activeTenantId || profileData.tenantId || '').trim();
                const orderTenant = String(orderData.tenantId || '').trim();

                if (courierTenant && orderTenant && courierTenant !== orderTenant) {
                    throw new Error(`Incompatibilidad Multi-Tenant: El motorizado pertenece a ${courierTenant} y el pedido a ${orderTenant}.`);
                }

                const courierName = userData.name || userData.nombre || profileData.name || 'Motorizado Reasignado';
                const courierPhone = userData.phone || userData.telefono || profileData.phone || '';

                const reassignEvent = {
                    estado: 'asignado',
                    status: 'ASSIGNED',
                    assignedCourierId: courierId,
                    motorizadoId: courierId,
                    timestamp: new Date().toISOString(),
                    triggeredBy: 'ADMIN_REASSIGNMENT'
                };

                // 4. Actualización atómica en la misma transacción
                transaction.update(orderRef, {
                    motorizadoId: courierId,
                    assignedCourierId: courierId,
                    driverName: courierName,
                    assignedCourierName: courierName,
                    driverPhone: courierPhone,
                    status: 'ASSIGNED',
                    estado: 'asignado',
                    courierPhase: 1,
                    historialEstados: firebase.firestore.FieldValue.arrayUnion(reassignEvent),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            toast.success(`Pedido #${orderId} reasignado atómicamente al motorizado ${courierId}`);
        } catch (err) {
            console.error('[OPS_TOOLS_REASSIGN_ERROR]', err);
            toast.error("Error al reasignar: " + err.message);
        }
    },

    cancelOrder: () => {
        const orderId = document.getElementById('cancelOrderId')?.value.trim();
        const reason = document.getElementById('cancelReason')?.value.trim() || 'Cancelado por Centro de Control Operativo';

        if (!orderId) {
            toast.error("Debe ingresar el ID del pedido");
            return;
        }

        db.collection('orders').doc(orderId).update({
            status: 'CANCELLED',
            cancelReason: reason,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            toast.success(`Pedido #${orderId} cancelado exitosamente`);
        }).catch(err => toast.error("Error al cancelar: " + err.message));
    },

    sendBroadcast: () => {
        const title = document.getElementById('broadcastTitle')?.value.trim();
        const message = document.getElementById('broadcastMessage')?.value.trim();

        if (!title || !message) {
            toast.error("Debe completar el título y el mensaje");
            return;
        }

        db.collection('notifications').add({
            title: title,
            message: message,
            target: 'all',
            type: 'BROADCAST_ALERT',
            timestampMs: Date.now(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            toast.success("Broadcast de notificación emitido exitosamente a todos los dispositivos");
        }).catch(err => toast.error("Error al emitir broadcast: " + err.message));
    }
};

window.opsToolsModule = opsToolsModule;
