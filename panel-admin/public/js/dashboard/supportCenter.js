// Módulo de Administración: Centro de Soporte & Ayuda Enterprise (Tickets & Contacto Directo)
const supportCenterModule = {
    currentTicketId: null,
    ticketsListener: null,
    messagesListener: null,
    supportConfigListener: null,
    currentStatusFilter: 'ALL',

    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Header Banner -->
                <div class="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-3xl bg-blue-500/20 p-2 rounded-xl border border-blue-400/30">🎧</span>
                            <div>
                                <h2 class="text-2xl font-black text-white">Centro de Soporte & Ayuda Enterprise</h2>
                                <p class="text-xs text-blue-300">Gestión de Tickets de Clientes en Tiempo Real y Configuración Dinámica de Contacto Directo.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="supportCenterModule.switchTab('tickets')" id="btnTabTickets" class="bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>🎫</span> Tickets de Soporte
                        </button>
                        <button onclick="supportCenterModule.switchTab('config')" id="btnTabConfig" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>⚙️</span> Configuración Contacto Directo
                        </button>
                    </div>
                </div>

                <!-- Tab 1: Tickets de Soporte -->
                <div id="supportTicketsView" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Columna Izquierda: Lista de Tickets -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 lg:col-span-1 flex flex-col h-[650px]">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                <span>📋</span> Bandeja de Tickets
                            </h3>
                            <span id="ticketCountBadge" class="text-[10px] bg-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded border border-blue-500/30">0 tickets</span>
                        </div>

                        <!-- Filtro de Estado -->
                        <div class="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-[11px]">
                            <button onclick="supportCenterModule.filterStatus('ALL')" id="filterBtnALL" class="py-1 px-2 rounded-lg bg-blue-600 text-white font-bold transition">Todos</button>
                            <button onclick="supportCenterModule.filterStatus('WAITING_ADMIN')" id="filterBtnWAITING_ADMIN" class="py-1 px-2 rounded-lg text-slate-400 hover:text-white transition">Pendientes</button>
                            <button onclick="supportCenterModule.filterStatus('RESOLVED')" id="filterBtnRESOLVED" class="py-1 px-2 rounded-lg text-slate-400 hover:text-white transition">Resueltos</button>
                        </div>

                        <!-- Lista scrolleable de tickets -->
                        <div id="ticketsListContainer" class="flex-1 overflow-y-auto space-y-2 pr-1">
                            <div class="text-center py-12 text-slate-500 text-xs">Cargando tickets de soporte...</div>
                        </div>
                    </div>

                    <!-- Columna Derecha: Chat y Detalle del Ticket Seleccionado -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg lg:col-span-2 flex flex-col h-[650px]" id="ticketDetailPanel">
                        <div class="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3" id="noTicketSelectedState">
                            <span class="text-5xl">💬</span>
                            <h4 class="text-base font-bold text-slate-300">Selecciona un ticket de la bandeja</h4>
                            <p class="text-xs max-w-sm">Haz clic sobre cualquier ticket a la izquierda para visualizar la conversación y responder al cliente en tiempo real.</p>
                        </div>

                        <!-- Contenido activo del chat (oculto por defecto) -->
                        <div id="activeTicketChat" class="hidden flex-1 flex flex-col h-full">
                            <!-- Chat Header -->
                            <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="text-sm font-bold text-white" id="chatCustomerName">Cliente</h3>
                                        <span id="chatStatusBadge" class="text-[10px] font-bold px-2 py-0.5 rounded uppercase">OPEN</span>
                                    </div>
                                    <p class="text-[11px] text-slate-400 mt-0.5" id="chatSubject">Asunto: Consulta</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <select id="ticketStatusSelect" onchange="supportCenterModule.updateTicketStatus(this.value)" class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none">
                                        <option value="OPEN">Abierto</option>
                                        <option value="IN_PROGRESS">En Atención</option>
                                        <option value="WAITING_CUSTOMER">Esperando Cliente</option>
                                        <option value="WAITING_ADMIN">Esperando Admin</option>
                                        <option value="RESOLVED">Resuelto</option>
                                        <option value="CLOSED">Cerrado</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Mensajes scrolleables -->
                            <div id="chatMessagesContainer" class="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-3">
                                <!-- Mensajes inyectados dinámicamente -->
                            </div>

                            <!-- Input para responder -->
                            <form onsubmit="supportCenterModule.sendAdminReply(event)" class="flex gap-2">
                                <input type="text" id="adminReplyInput" placeholder="Escribe una respuesta para el cliente..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none">
                                <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2">
                                    <span>Enviar</span> 🚀
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Tab 2: Configuración de Contacto Directo (/system_config/support) -->
                <div id="supportConfigView" class="hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 max-w-4xl">
                    <div class="border-b border-slate-800 pb-4 flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <span>📞</span> Canales de Contacto Directo para la Customer App
                            </h3>
                            <p class="text-xs text-slate-400 mt-1">Estos datos son leídos en tiempo real por la Customer App (pantalla de Centro de Ayuda). Modifícalos y guárdalos sin necesidad de compilar la app.</p>
                        </div>
                        <span class="text-xs bg-emerald-500/20 text-emerald-400 font-mono px-3 py-1 rounded border border-emerald-500/30">/system_config/support</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Canal WhatsApp -->
                        <div class="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                            <div class="flex items-center justify-between">
                                <h4 class="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                    <span>💬</span> Canal WhatsApp
                                </h4>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="cfgWhatsappActive" class="accent-emerald-500 rounded">
                                    <span class="text-xs text-slate-300 font-semibold">Activo</span>
                                </label>
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Número de WhatsApp (con código de país)</label>
                                <input type="text" id="cfgWhatsappNumber" placeholder="+505 8888-0000" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Texto o Título descriptivo</label>
                                <input type="text" id="cfgWhatsappText" placeholder="WhatsApp Soporte" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none">
                            </div>
                        </div>

                        <!-- Canal Correo Electrónico -->
                        <div class="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                            <div class="flex items-center justify-between">
                                <h4 class="text-sm font-bold text-blue-400 flex items-center gap-2">
                                    <span>✉️</span> Correo Electrónico
                                </h4>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" id="cfgEmailActive" class="accent-blue-500 rounded">
                                    <span class="text-xs text-slate-300 font-semibold">Activo</span>
                                </label>
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Dirección de Correo Oficial</label>
                                <input type="email" id="cfgSupportEmail" placeholder="soporte@bluesystemdelivery.com" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Texto o Título descriptivo</label>
                                <input type="text" id="cfgEmailText" placeholder="Correo Electrónico" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none">
                            </div>
                        </div>

                        <!-- Horario de Atención -->
                        <div class="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 md:col-span-2">
                            <h4 class="text-sm font-bold text-amber-400 flex items-center gap-2">
                                <span>⏰</span> Horario y Disponibilidad de Soporte
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-slate-400 mb-1">Días de Atención</label>
                                    <input type="text" id="cfgScheduleDays" placeholder="Lun-Dom" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs text-slate-400 mb-1">Horas de Atención</label>
                                    <input type="text" id="cfgScheduleHours" placeholder="8:00am a 8:00pm" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs text-slate-400 mb-1">Mensaje de Disponibilidad / Aviso</label>
                                <input type="text" id="cfgAvailabilityMsg" placeholder="Respondemos usualmente en menos de 15 minutos durante horario hábil." class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none">
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t border-slate-800">
                        <button onclick="supportCenterModule.saveSupportConfig()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition flex items-center gap-2">
                            <span>💾</span> Guardar Configuración de Contacto
                        </button>
                    </div>
                </div>
            </div>
        `;

        supportCenterModule.initTicketsListener();
        supportCenterModule.loadSupportConfig();
    },

    switchTab: (tab) => {
        const ticketsView = document.getElementById('supportTicketsView');
        const configView = document.getElementById('supportConfigView');
        const btnTickets = document.getElementById('btnTabTickets');
        const btnConfig = document.getElementById('btnTabConfig');

        if (tab === 'tickets') {
            ticketsView.classList.remove('hidden');
            configView.classList.add('hidden');
            btnTickets.className = 'bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2';
            btnConfig.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2';
        } else {
            ticketsView.classList.add('hidden');
            configView.classList.remove('hidden');
            btnConfig.className = 'bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2';
            btnTickets.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2';
        }
    },

    filterStatus: (status) => {
        supportCenterModule.currentStatusFilter = status;
        ['ALL', 'WAITING_ADMIN', 'RESOLVED'].forEach(st => {
            const btn = document.getElementById(`filterBtn${st}`);
            if (btn) {
                if (st === status) {
                    btn.className = 'py-1 px-2 rounded-lg bg-blue-600 text-white font-bold transition';
                } else {
                    btn.className = 'py-1 px-2 rounded-lg text-slate-400 hover:text-white transition';
                }
            }
        });
        supportCenterModule.renderTicketsList();
    },

    cachedTickets: [],

    initTicketsListener: () => {
        if (supportCenterModule.ticketsListener) {
            supportCenterModule.ticketsListener();
        }

        supportCenterModule.ticketsListener = db.collection('support_tickets')
            .orderBy('updatedAt', 'desc')
            .onSnapshot((snapshot) => {
                const tickets = [];
                snapshot.forEach(doc => {
                    tickets.push({ id: doc.id, ...doc.data() });
                });
                supportCenterModule.cachedTickets = tickets;
                supportCenterModule.renderTicketsList();
            }, (err) => {
                console.error('Error listening to support_tickets:', err);
            });
    },

    renderTicketsList: () => {
        const container = document.getElementById('ticketsListContainer');
        const badge = document.getElementById('ticketCountBadge');
        if (!container) return;

        let filtered = supportCenterModule.cachedTickets;
        if (supportCenterModule.currentStatusFilter === 'WAITING_ADMIN') {
            filtered = filtered.filter(t => t.status === 'WAITING_ADMIN' || t.status === 'OPEN');
        } else if (supportCenterModule.currentStatusFilter === 'RESOLVED') {
            filtered = filtered.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
        }

        if (badge) badge.innerText = `${filtered.length} tickets`;

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-12 text-slate-500 text-xs">No hay tickets en esta categoría.</div>`;
            return;
        }

        container.innerHTML = filtered.map(ticket => {
            const isSelected = ticket.id === supportCenterModule.currentTicketId;
            const statusColors = {
                OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                WAITING_ADMIN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                WAITING_CUSTOMER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                RESOLVED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                CLOSED: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            };
            const colorClass = statusColors[ticket.status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            const unreadCount = ticket.unreadByAdmin || 0;

            return `
                <div onclick="supportCenterModule.selectTicket('${ticket.id}')" class="cursor-pointer p-3.5 rounded-xl border transition ${isSelected ? 'bg-blue-950/40 border-blue-500 shadow-md' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-mono text-slate-400">#${ticket.id.substring(0, 8).toUpperCase()}</span>
                        <div class="flex items-center gap-1.5">
                            ${unreadCount > 0 ? `<span class="bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">${unreadCount}</span>` : ''}
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${colorClass}">${ticket.status || 'OPEN'}</span>
                        </div>
                    </div>
                    <h4 class="text-xs font-bold text-white truncate">${ticket.customerName || 'Cliente'}</h4>
                    <p class="text-[11px] text-slate-300 font-medium truncate mt-0.5">${ticket.subject || 'Sin Asunto'}</p>
                    <p class="text-[10px] text-slate-500 truncate mt-1">${ticket.lastMessage || 'Sin mensajes aún'}</p>
                </div>
            `;
        }).join('');
    },

    selectTicket: (ticketId) => {
        supportCenterModule.currentTicketId = ticketId;
        supportCenterModule.renderTicketsList();

        const ticket = supportCenterModule.cachedTickets.find(t => t.id === ticketId);
        if (!ticket) return;

        document.getElementById('noTicketSelectedState').classList.add('hidden');
        document.getElementById('activeTicketChat').classList.remove('hidden');

        document.getElementById('chatCustomerName').innerText = `${ticket.customerName || 'Cliente'} (${ticket.customerEmail || ''})`;
        document.getElementById('chatSubject').innerText = `Asunto: ${ticket.subject || 'Sin Asunto'}`;
        
        const statusBadge = document.getElementById('chatStatusBadge');
        statusBadge.innerText = ticket.status || 'OPEN';
        
        const statusSelect = document.getElementById('ticketStatusSelect');
        if (statusSelect) statusSelect.value = ticket.status || 'OPEN';

        // Reset unread count for admin
        db.collection('support_tickets').doc(ticketId).update({
            unreadByAdmin: 0
        }).catch(() => {});

        // Listen to messages of this ticket
        if (supportCenterModule.messagesListener) {
            supportCenterModule.messagesListener();
        }

        const messagesContainer = document.getElementById('chatMessagesContainer');
        messagesContainer.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">Cargando mensajes...</div>';

        supportCenterModule.messagesListener = db.collection('support_tickets').doc(ticketId).collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => {
                const messages = [];
                snap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

                if (messages.length === 0) {
                    messagesContainer.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No hay mensajes en este ticket.</div>';
                    return;
                }

                messagesContainer.innerHTML = messages.map(msg => {
                    const isAdmin = (msg.senderRole || '').toUpperCase() === 'ADMIN';
                    const timeStr = msg.createdAt ? new Date(msg.createdAt.seconds ? msg.createdAt.seconds * 1000 : msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return `
                        <div class="flex flex-col ${isAdmin ? 'items-end' : 'items-start'}">
                            <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${isAdmin ? 'bg-blue-600 text-white rounded-br-xs' : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700'}">
                                <div class="text-[10px] font-bold mb-1 opacity-75">${msg.senderName || (isAdmin ? 'Soporte BlueSystem' : 'Cliente')}</div>
                                <p class="leading-relaxed whitespace-pre-wrap">${msg.text || msg.message || ''}</p>
                                <div class="text-[9px] text-right mt-1 opacity-60">${timeStr}</div>
                            </div>
                        </div>
                    `;
                }).join('');

                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, err => {
                console.error('Error listening to ticket messages:', err);
            });
    },

    sendAdminReply: async (event) => {
        event.preventDefault();
        const input = document.getElementById('adminReplyInput');
        const text = (input.value || '').trim();
        if (!text || !supportCenterModule.currentTicketId) return;

        const ticketId = supportCenterModule.currentTicketId;
        input.value = '';

        try {
            const adminUser = firebase.auth().currentUser;
            const now = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('support_tickets').doc(ticketId).collection('messages').add({
                ticketId,
                senderId: adminUser ? adminUser.uid : 'admin_support',
                senderRole: 'ADMIN',
                senderName: 'Soporte BlueSystem',
                text: text,
                createdAt: now,
                isRead: false
            });

        } catch (err) {
            console.error('Error sending admin reply:', err);
            alert('Error al enviar la respuesta: ' + err.message);
        }
    },

    updateTicketStatus: async (newStatus) => {
        if (!supportCenterModule.currentTicketId) return;
        try {
            await db.collection('support_tickets').doc(supportCenterModule.currentTicketId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            const badge = document.getElementById('chatStatusBadge');
            if (badge) badge.innerText = newStatus;
        } catch (err) {
            console.error('Error updating ticket status:', err);
            alert('Error actualizando estado: ' + err.message);
        }
    },

    loadSupportConfig: async () => {
        try {
            const doc = await db.collection('system_config').doc('support').get();
            if (doc.exists) {
                const data = doc.data();
                if (document.getElementById('cfgWhatsappActive')) document.getElementById('cfgWhatsappActive').checked = data.whatsappActive !== false;
                if (document.getElementById('cfgWhatsappNumber')) document.getElementById('cfgWhatsappNumber').value = data.whatsappNumber || '+505 8888-0000';
                if (document.getElementById('cfgWhatsappText')) document.getElementById('cfgWhatsappText').value = data.whatsappText || 'WhatsApp Soporte';

                if (document.getElementById('cfgEmailActive')) document.getElementById('cfgEmailActive').checked = data.emailActive !== false;
                if (document.getElementById('cfgSupportEmail')) document.getElementById('cfgSupportEmail').value = data.supportEmail || 'soporte@bluesystemdelivery.com';
                if (document.getElementById('cfgEmailText')) document.getElementById('cfgEmailText').value = data.emailText || 'Correo Electrónico';

                if (document.getElementById('cfgScheduleDays')) document.getElementById('cfgScheduleDays').value = data.scheduleDays || 'Lun-Dom';
                if (document.getElementById('cfgScheduleHours')) document.getElementById('cfgScheduleHours').value = data.scheduleHours || '8:00am a 8:00pm';
                if (document.getElementById('cfgAvailabilityMsg')) document.getElementById('cfgAvailabilityMsg').value = data.availabilityMessage || '';
            } else {
                // Set initial defaults
                if (document.getElementById('cfgWhatsappActive')) document.getElementById('cfgWhatsappActive').checked = true;
                if (document.getElementById('cfgWhatsappNumber')) document.getElementById('cfgWhatsappNumber').value = '+505 8888-0000';
                if (document.getElementById('cfgWhatsappText')) document.getElementById('cfgWhatsappText').value = 'WhatsApp Soporte';
                if (document.getElementById('cfgEmailActive')) document.getElementById('cfgEmailActive').checked = true;
                if (document.getElementById('cfgSupportEmail')) document.getElementById('cfgSupportEmail').value = 'soporte@bluesystemdelivery.com';
                if (document.getElementById('cfgEmailText')) document.getElementById('cfgEmailText').value = 'Correo Electrónico';
                if (document.getElementById('cfgScheduleDays')) document.getElementById('cfgScheduleDays').value = 'Lun-Dom';
                if (document.getElementById('cfgScheduleHours')) document.getElementById('cfgScheduleHours').value = '8:00am a 8:00pm';
            }
        } catch (err) {
            console.error('Error loading support config:', err);
        }
    },

    saveSupportConfig: async () => {
        try {
            const payload = {
                whatsappActive: document.getElementById('cfgWhatsappActive').checked,
                whatsappNumber: (document.getElementById('cfgWhatsappNumber').value || '').trim(),
                whatsappText: (document.getElementById('cfgWhatsappText').value || '').trim(),
                emailActive: document.getElementById('cfgEmailActive').checked,
                supportEmail: (document.getElementById('cfgSupportEmail').value || '').trim(),
                emailText: (document.getElementById('cfgEmailText').value || '').trim(),
                scheduleDays: (document.getElementById('cfgScheduleDays').value || '').trim(),
                scheduleHours: (document.getElementById('cfgScheduleHours').value || '').trim(),
                availabilityMessage: (document.getElementById('cfgAvailabilityMsg').value || '').trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'admin'
            };

            await db.collection('system_config').doc('support').set(payload, { merge: true });
            alert('¡Configuración de Soporte & Contacto Directo guardada exitosamente en /system_config/support!');
        } catch (err) {
            console.error('Error saving support config:', err);
            alert('Error al guardar configuración: ' + err.message);
        }
    }
};

window.supportCenterModule = supportCenterModule;
