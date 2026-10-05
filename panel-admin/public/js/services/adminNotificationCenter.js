/**
 * Centro de Notificaciones In-App para Panel Administrativo Web (Enterprise)
 * BlueSystem Delivery — Sincronización reactiva con /users/{adminUid}/notifications
 */

(function () {
    const AdminNotificationCenter = {
        currentUser: null,
        unsubscribe: null,
        notifications: [],
        dropdownOpen: false,
        initialLoadDone: false,

        init: function () {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                console.warn("[ADMIN_NOTIF_CENTER] Firebase no disponible todavía.");
                return;
            }

            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.currentUser = user;
                    this.startListening(user.uid);
                } else {
                    this.currentUser = null;
                    this.stopListening();
                    this.updateBadge(0);
                }
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                const container = document.getElementById('adminHeaderNotifContainer');
                if (container && !container.contains(e.target) && this.dropdownOpen) {
                    this.closeDropdown();
                }
            });
        },

        startListening: function (uid) {
            this.stopListening();
            const db = firebase.firestore();

            try {
                // Escuchar notificaciones del admin ordenadas por fecha reciente
                const query = db.collection('users').doc(uid).collection('notifications')
                    .orderBy('createdAt', 'desc')
                    .limit(25);

                this.unsubscribe = query.onSnapshot((snapshot) => {
                    const items = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.visibilityStatus !== 'DISABLED' && data.deletedByUser !== true) {
                            items.push({ id: doc.id, ...data });
                        }
                    });

                    // Detectar nuevas notificaciones para disparar Toast banner
                    if (this.initialLoadDone && items.length > this.notifications.length) {
                        const latest = items[0];
                        if (latest && (!latest.isRead && !latest.read)) {
                            this.showToast(latest);
                        }
                    }

                    this.notifications = items;
                    this.initialLoadDone = true;
                    this.render();
                }, (error) => {
                    console.warn("[ADMIN_NOTIF_CENTER] Fallback sin orderBy por índice:", error.message);
                    // Fallback directo sin orderBy si no existe el composite index
                    this.unsubscribe = db.collection('users').doc(uid).collection('notifications')
                        .limit(25)
                        .onSnapshot((snapshot) => {
                            const items = [];
                            snapshot.forEach(doc => {
                                const data = doc.data();
                                if (data.visibilityStatus !== 'DISABLED' && data.deletedByUser !== true) {
                                    items.push({ id: doc.id, ...data });
                                }
                            });
                            items.sort((a, b) => {
                                const tA = a.createdAt?.seconds || 0;
                                const tB = b.createdAt?.seconds || 0;
                                return tB - tA;
                            });
                            this.notifications = items;
                            this.initialLoadDone = true;
                            this.render();
                        });
                });
            } catch (err) {
                console.error("[ADMIN_NOTIF_CENTER] Error iniciando listener:", err);
            }
        },

        stopListening: function () {
            if (typeof this.unsubscribe === 'function') {
                this.unsubscribe();
                this.unsubscribe = null;
            }
            this.initialLoadDone = false;
        },

        toggleDropdown: function () {
            if (this.dropdownOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        },

        openDropdown: function () {
            const dropdown = document.getElementById('adminHeaderNotifDropdown');
            if (dropdown) {
                dropdown.classList.remove('hidden');
                this.dropdownOpen = true;
            }
        },

        closeDropdown: function () {
            const dropdown = document.getElementById('adminHeaderNotifDropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
                this.dropdownOpen = false;
            }
        },

        updateBadge: function (unreadCount) {
            const dot = document.getElementById('adminHeaderNotifDot');
            const badge = document.getElementById('adminHeaderNotifBadge');
            const counterText = document.getElementById('adminHeaderNotifCounterText');

            if (dot) {
                if (unreadCount > 0) dot.classList.remove('hidden');
                else dot.classList.add('hidden');
            }

            if (badge) {
                if (unreadCount > 0) {
                    badge.classList.remove('hidden');
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                } else {
                    badge.classList.add('hidden');
                }
            }

            if (counterText) {
                counterText.textContent = `${unreadCount} pendientes`;
            }
        },

        render: function () {
            const listEl = document.getElementById('adminHeaderNotifList');
            if (!listEl) return;

            const unreadItems = this.notifications.filter(n => !n.isRead && !n.read);
            this.updateBadge(unreadItems.length);

            if (this.notifications.length === 0) {
                listEl.innerHTML = `
                    <div class="p-8 text-center space-y-2">
                        <span class="text-2xl opacity-40">🔕</span>
                        <p class="text-xs text-slate-400 font-medium">Bandeja de notificaciones vacía</p>
                        <p class="text-[10px] text-slate-500">Las alertas de depósitos bancarios y cierres aparecerán aquí.</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = this.notifications.map(n => {
                const isUnread = !n.isRead && !n.read;
                const isClosure = n.type === 'COURIER_DAILY_CLOSURE_PENDING' || n.action === 'OPEN_COURIER_DAILY_CLOSURE';
                
                let timeStr = 'Reciente';
                if (n.createdAt) {
                    try {
                        const date = n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
                        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    } catch (_) {}
                }

                return `
                    <div onclick="window.adminNotificationCenter.handleNotificationClick('${n.id}')" 
                         class="p-3.5 hover:bg-slate-800/60 cursor-pointer transition flex items-start gap-3 relative ${isUnread ? 'bg-indigo-950/20' : ''}">
                        ${isUnread ? '<div class="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>' : ''}
                        
                        <div class="p-2 rounded-xl shrink-0 ${isClosure ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}">
                            <span>${isClosure ? '💰' : '🔔'}</span>
                        </div>

                        <div class="flex-1 min-w-0 space-y-1">
                            <div class="flex items-center justify-between gap-1">
                                <h4 class="text-xs font-bold text-slate-200 truncate ${isUnread ? 'text-indigo-200' : ''}">
                                    ${n.title || 'Nueva Notificación'}
                                </h4>
                                <span class="text-[10px] text-slate-500 font-mono shrink-0">${timeStr}</span>
                            </div>
                            <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                ${n.body || ''}
                            </p>
                            ${isClosure && n.amount ? `
                                <div class="pt-1 flex items-center gap-2">
                                    <span class="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                                        C$ ${Number(n.amount).toFixed(2)}
                                    </span>
                                    <span class="text-[10px] text-slate-400 font-mono">Ref: ${n.bankReference || 'S/R'}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        },

        handleNotificationClick: async function (notifId) {
            const notif = this.notifications.find(n => n.id === notifId);
            if (!notif) return;

            // Marcar como leída en Firestore
            if (this.currentUser && (!notif.isRead && !notif.read)) {
                try {
                    const db = firebase.firestore();
                    await db.collection('users').doc(this.currentUser.uid).collection('notifications').doc(notifId).update({
                        isRead: true,
                        read: true,
                        readAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (e) {
                    console.warn("[ADMIN_NOTIF_CENTER] Error marcando leída:", e);
                }
            }

            this.closeDropdown();

            // Navegar según tipo
            if (notif.type === 'COURIER_DAILY_CLOSURE_PENDING' || notif.action === 'OPEN_COURIER_DAILY_CLOSURE' || notif.screen === 'courier_cash_control') {
                if (typeof dashboardController !== 'undefined' && dashboardController.switchTab) {
                    dashboardController.switchTab('courierCashControl');
                    setTimeout(() => {
                        if (typeof courierCashControlModule !== 'undefined' && courierCashControlModule.openClosureDetail && notif.closureId) {
                            courierCashControlModule.openClosureDetail(notif.closureId);
                        }
                    }, 400);
                }
            }
        },

        markAllAsRead: async function () {
            if (!this.currentUser) return;
            const unread = this.notifications.filter(n => !n.isRead && !n.read);
            if (unread.length === 0) return;

            try {
                const db = firebase.firestore();
                const batch = db.batch();
                unread.forEach(n => {
                    const ref = db.collection('users').doc(this.currentUser.uid).collection('notifications').doc(n.id);
                    batch.update(ref, {
                        isRead: true,
                        read: true,
                        readAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
            } catch (err) {
                console.error("[ADMIN_NOTIF_CENTER] Error marcando todas como leídas:", err);
            }
        },

        showToast: function (notif) {
            const existing = document.getElementById('adminLiveNotifToast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = 'adminLiveNotifToast';
            toast.className = 'fixed top-16 right-6 z-[100] max-w-sm w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-bounce flex items-start gap-3';
            toast.innerHTML = `
                <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <span class="text-xl">🔔</span>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold text-white truncate">${notif.title || 'Nueva Notificación'}</h4>
                    <p class="text-[11px] text-slate-300 line-clamp-2 mt-0.5">${notif.body || ''}</p>
                    <div class="mt-2 flex items-center gap-2">
                        <button onclick="window.adminNotificationCenter.handleNotificationClick('${notif.id}'); document.getElementById('adminLiveNotifToast').remove();" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition shadow">
                            Ver Cierre
                        </button>
                        <button onclick="document.getElementById('adminLiveNotifToast').remove()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] rounded-lg transition">
                            Cerrar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(toast);
            setTimeout(() => {
                if (document.getElementById('adminLiveNotifToast')) {
                    toast.classList.remove('animate-bounce');
                    setTimeout(() => toast.remove(), 8000);
                }
            }, 3000);
        }
    };

    window.adminNotificationCenter = AdminNotificationCenter;
    document.addEventListener('DOMContentLoaded', () => {
        AdminNotificationCenter.init();
    });
})();
