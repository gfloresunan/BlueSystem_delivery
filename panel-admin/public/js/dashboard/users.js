// Módulo de Gestión de Usuarios y Roles
const usersModule = {
    users: [],
    pagination: null,
    _unsubDevices: null, // [BSD-GOV-IAM-FOR-001] Referencia al listener de user_devices
    _unsubUsers: null,   // [BSD-GOV-IAM-FOR-001] Referencia al listener de users
    
    render: () => {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-xl font-bold text-gray-100 flex items-center gap-2">
                            <span>👥</span> Centro de Gestión de Usuarios e Identidades
                        </h2>
                        <p class="text-xs text-gray-400 mt-1">Supervisión, gobierno y control administrativo de identidades en BlueSystem Enterprise.</p>
                    </div>
                </div>

                <!-- KPI Cards de Identidades & Clasificación -->
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Identidades</p>
                        <p class="text-xl font-black text-blue-400 mt-1" id="kpi-total-identities">0</p>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Operativos</p>
                        <p class="text-xl font-black text-green-400 mt-1" id="kpi-operational-users">0</p>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comercios</p>
                        <p class="text-xl font-black text-cyan-400 mt-1" id="kpi-business-users">0</p>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Motorizados</p>
                        <p class="text-xl font-black text-emerald-400 mt-1" id="kpi-courier-users">0</p>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clientes</p>
                        <p class="text-xl font-black text-indigo-400 mt-1" id="kpi-customer-users">0</p>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Legacy / POS</p>
                        <p class="text-xl font-black text-amber-400 mt-1" id="kpi-legacy-users">0</p>
                    </div>
                    <div class="bg-gray-900 border border-gray-800 p-3 rounded-xl shadow">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incompletos</p>
                        <p class="text-xl font-black text-rose-400 mt-1" id="kpi-incomplete-users">0</p>
                    </div>
                </div>

                <!-- Filters & Search -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">🔍</span>
                        <input type="text" id="user-search" oninput="usersModule.filterData()" placeholder="Buscar por nombre, email, teléfono o UID..." class="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono">
                    </div>
                    <div>
                        <select id="user-role-filter" onchange="usersModule.filterData()" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500 font-sans">
                            <option value="">Todos los Roles y Clasificaciones</option>
                            <option value="admin">Administrador</option>
                            <option value="super_admin">Súper Administrador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="business">Comercio</option>
                            <option value="courier">Motorizado</option>
                            <option value="customer">Cliente</option>
                            <option value="SELLER">Vendedor POS</option>
                            <option value="LEGACY_POS">Legacy / POS Client</option>
                            <option value="INCOMPLETE">Perfil Incompleto</option>
                        </select>
                    </div>
                    <div>
                        <select id="user-status-filter" onchange="usersModule.filterData()" class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500 font-sans">
                            <option value="">Todos los Estados</option>
                            <option value="active">Activos</option>
                            <option value="blocked">Bloqueados</option>
                        </select>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <div id="users-table-container">
                        <p class="text-xs text-gray-500 p-6">Cargando lista unificada de identidades...</p>
                    </div>
                    <div id="users-pagination"></div>
                </div>
            </div>
        `;

        usersModule.pagination = new Pagination('users-pagination', 8, () => {
            usersModule.displayPage();
        });

        usersModule.loadUsers();
    },

    devicesMap: {},

    updateKPIs: () => {
        const users = usersModule.users || [];
        const total = users.length;
        const business = users.filter(u => u.identityType === 'BUSINESS' || u.canonicalRole === 'business').length;
        const courier = users.filter(u => u.identityType === 'COURIER' || u.canonicalRole === 'courier').length;
        const customer = users.filter(u => u.identityType === 'CUSTOMER' || u.canonicalRole === 'customer').length;
        const legacy = users.filter(u => u.identityType === 'LEGACY_POS').length;
        const incomplete = users.filter(u => u.identityType === 'INCOMPLETE' || u.identityType === 'GUEST').length;
        const operational = Math.max(0, total - legacy - incomplete);

        const kpiTotal = document.getElementById('kpi-total-identities');
        if (kpiTotal) kpiTotal.innerText = total;

        const kpiOper = document.getElementById('kpi-operational-users');
        if (kpiOper) kpiOper.innerText = operational;

        const kpiBiz = document.getElementById('kpi-business-users');
        if (kpiBiz) kpiBiz.innerText = business;

        const kpiCour = document.getElementById('kpi-courier-users');
        if (kpiCour) kpiCour.innerText = courier;

        const kpiCust = document.getElementById('kpi-customer-users');
        if (kpiCust) kpiCust.innerText = customer;

        const kpiLeg = document.getElementById('kpi-legacy-users');
        if (kpiLeg) kpiLeg.innerText = legacy;

        const kpiInc = document.getElementById('kpi-incomplete-users');
        if (kpiInc) kpiInc.innerText = incomplete;
    },

    loadUsers: () => {
        const currentUser = firebase.auth().currentUser;
        const uid = currentUser ? currentUser.uid : 'anonymous';

        // [BSD-GOV-IAM-FOR-001] CLEANUP: Destruir listeners previos antes de crear nuevos.
        // Sin esto, cada navegación a la pestaña acumula un nuevo listener activo,
        // produciendo N renderizados simultáneos por cada snapshot de Firestore.
        if (usersModule._unsubDevices) {
            usersModule._unsubDevices();
            usersModule._unsubDevices = null;
            console.log('[FIRESTORE_AUDIT] [LISTENER_CLEANUP] Path: user_devices — listener anterior destruido.');
        }
        if (usersModule._unsubUsers) {
            usersModule._unsubUsers();
            usersModule._unsubUsers = null;
            console.log('[FIRESTORE_AUDIT] [LISTENER_CLEANUP] Path: users — listener anterior destruido.');
        }

        console.log(`[FIRESTORE_AUDIT] [LISTENER_INIT] Path: user_devices | UID: ${uid}`);
        usersModule._unsubDevices = db.collection('user_devices').onSnapshot(dSnap => {
            usersModule.devicesMap = {};
            dSnap.forEach(dDoc => {
                usersModule.devicesMap[dDoc.id] = dDoc.data();
            });
            usersModule.displayPage();
        }, error => {
            console.error(`[FIRESTORE_AUDIT] [PERMISSION_ERROR] Path: user_devices | Code: ${error.code} | Msg: ${error.message}`, error);
        });

        console.log(`[FIRESTORE_AUDIT] [LISTENER_INIT] Path: users (Canonical Operational Identities Resolver) | UID: ${uid}`);
        if (typeof identityCanonicalService !== 'undefined' && identityCanonicalService.subscribeToOperationalIdentities) {
            usersModule._unsubUsers = identityCanonicalService.subscribeToOperationalIdentities(list => {
                usersModule.users = list || [];
                usersModule.updateKPIs();
                usersModule.filterData();
            }, error => {
                console.error(`[FIRESTORE_AUDIT] [PERMISSION_ERROR] Path: users | Code: ${error.code} | Msg: ${error.message}`, error);
            });
        } else {
            usersModule._unsubUsers = db.collection('users').onSnapshot(snap => {
                usersModule.users = [];
                snap.forEach(doc => {
                    const rawData = { uid: doc.id, ...doc.data() };
                    const normalized = (typeof identityService !== 'undefined' && identityService.normalizeIdentity)
                        ? identityService.normalizeIdentity(rawData)
                        : rawData;
                    usersModule.users.push(normalized);
                });
                usersModule.users.sort((a, b) => (a.effectiveName || a.nombre || '').localeCompare(b.effectiveName || b.nombre || '', 'es', { sensitivity: 'base' }));
                usersModule.updateKPIs();
                usersModule.filterData();
            }, error => {
                console.error(`[FIRESTORE_AUDIT] [PERMISSION_ERROR] Path: users | Code: ${error.code} | Msg: ${error.message}`, error);
            });
        }
    },

    filteredUsers: [],
    filterData: () => {
        const queryInput = document.getElementById('user-search');
        const query = queryInput ? queryInput.value.toLowerCase().trim() : '';
        
        const roleFilterInput = document.getElementById('user-role-filter');
        const roleFilter = roleFilterInput ? roleFilterInput.value : '';

        const statusFilterInput = document.getElementById('user-status-filter');
        const statusFilter = statusFilterInput ? statusFilterInput.value : '';

        usersModule.filteredUsers = usersModule.users.filter(user => {
            const name = user.effectiveName || user.nombre || user.name || '';
            const email = user.effectiveEmail || user.email || user.mail || '';
            const phone = user.effectivePhone || user.telefono || user.phone || '';
            const uid = user.uid || '';

            const matchesQuery = !query ||
                name.toLowerCase().includes(query) ||
                email.toLowerCase().includes(query) ||
                phone.toLowerCase().includes(query) ||
                uid.toLowerCase().includes(query);

            let matchesRole = true;
            if (roleFilter) {
                if (roleFilter === 'LEGACY_POS' || roleFilter === 'INCOMPLETE') {
                    matchesRole = user.identityType === roleFilter;
                } else {
                    matchesRole = (user.role || user.rol || user.canonicalRole || user.identityType) === roleFilter || user.canonicalRole === roleFilter;
                }
            }

            let matchesStatus = true;
            if (statusFilter) {
                matchesStatus = (statusFilter === 'active' ? user.isActive !== false : user.isActive === false);
            }

            return matchesQuery && matchesRole && matchesStatus;
        });

        usersModule.pagination.currentPage = 1;
        usersModule.pagination.setTotalItems(usersModule.filteredUsers.length);
        usersModule.displayPage();
    },

    displayPage: () => {
        const pageData = usersModule.pagination.getCurrentPageData(usersModule.filteredUsers);

        table.render(
            'users-table-container',
            ['Identidad / Usuario', 'Email', 'Rol', 'FCM', 'Dispositivo', 'Estado', 'Acciones'],
            pageData,
            (user) => {
                const name = user.effectiveName || user.nombre || user.name || 'Sin nombre';
                const email = user.effectiveEmail || user.email || 'Sin correo';
                const role = user.canonicalRole || user.role || user.rol || 'customer';
                const isActive = user.isActive !== false;
                const devData = usersModule.devicesMap[user.uid];

                // Badges de Clasificación de Identidad
                let identityBadge = '';
                if (user.identityType === 'LEGACY_POS') {
                    identityBadge = `<span class="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded border border-amber-500/20 font-mono font-bold">Legacy / POS</span>`;
                } else if (user.identityType === 'INCOMPLETE') {
                    identityBadge = `<span class="ml-2 px-1.5 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded border border-rose-500/20 font-mono font-bold">⚠ Perfil Incompleto</span>`;
                } else if (user.effectivePhone === '82397401' || user.effectivePhone === '+50582397401') {
                    identityBadge = `<span class="ml-2 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded border border-purple-500/20 font-mono font-bold">⚠ Posible Duplicado</span>`;
                }

                // Indicador FCM con token truncado
                let fcmBadge = `<span class="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">🔴 Sin Token</span>`;
                if (devData && devData.fcmToken && devData.fcmToken.length > 20 && devData.isActive !== false) {
                    const lastUpdate = devData.lastTokenUpdate ? (devData.lastTokenUpdate.seconds * 1000) : Date.now();
                    const daysOld = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
                    const rawToken = devData.fcmToken;
                    const truncToken = `${rawToken.substring(0, 6)}...${rawToken.substring(rawToken.length - 4)}`;
                    if (daysOld < 14) {
                        fcmBadge = `<span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20" title="${truncToken}">🟢 ${truncToken}</span>`;
                    } else {
                        fcmBadge = `<span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/20" title="${truncToken}">🟡 ${truncToken}</span>`;
                    }
                }

                const platformInfo = devData ? `${devData.platform || 'Android'} ${devData.model ? `(${devData.model})` : ''}` : 'No registrado';

                const statusBadge = isActive
                    ? `<span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">Activo</span>`
                    : `<span class="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">Bloqueado</span>`;

                return `
                    <td class="p-4 flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 cursor-pointer" onclick="identityAdminDrawer.open('${user.uid}')">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="flex items-center">
                                <span class="font-medium text-gray-200 hover:text-blue-400 cursor-pointer" onclick="identityAdminDrawer.open('${user.uid}')">${name}</span>
                                ${identityBadge}
                            </div>
                            <span class="text-[10px] text-gray-500 font-mono">UID: ${user.uid}</span>
                        </div>
                    </td>
                    <td class="p-4 text-gray-400">${email}</td>
                    <td class="p-4"><span class="capitalize text-gray-300 font-mono text-xs">${String(role).replace('_', ' ')}</span></td>
                    <td class="p-4">${fcmBadge}</td>
                    <td class="p-4 text-gray-400 text-xs">${platformInfo}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 flex items-center gap-2">
                        <button onclick="identityAdminDrawer.open('${user.uid}')" class="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/40 text-xs font-bold text-indigo-300 rounded-lg transition flex items-center gap-1">
                            <span>✏️</span> Administrar
                        </button>
                        <button onclick="usersModule.toggleBlock('${user.uid}', ${isActive})" class="px-2 py-1 border text-xs font-bold rounded-lg transition ${isActive ? 'bg-red-950/20 border-red-900/40 hover:bg-red-900/30 text-red-400' : 'bg-green-950/20 border-green-900/40 hover:bg-green-900/30 text-green-400'}">${isActive ? 'Bloquear' : 'Desbloquear'}</button>
                        <button onclick="usersModule.deleteUser('${user.uid}')" class="px-2 py-1 bg-red-950/40 border border-red-900/40 hover:bg-red-900/60 text-xs font-bold text-red-400 rounded-lg transition">Eliminar</button>
                    </td>
                `;
            }
        );
    },

    // Ver ficha completa de usuario
    viewProfile: async (uid) => {
        const user = usersModule.users.find(u => u.uid === uid);
        if (!user) return;

        const name = user.nombre || 'Sin nombre';
        const email = user.email || 'Sin correo';
        const role = user.rol || user.role || 'customer';
        const phone = user.telefono || 'No registrado';
        const isActive = user.isActive !== false;
        const regDate = user.fechaRegistro ? new Date(parseInt(user.fechaRegistro)).toLocaleString() : 'N/A';

        // Obtener historial de pedidos de este usuario para la ficha
        let orderCount = 0;
        let totalSpend = 0;
        try {
            const ordersSnap = await db.collection('orders').where('customerId', '==', uid).get();
            orderCount = ordersSnap.size;
            ordersSnap.forEach(o => {
                totalSpend += parseFloat(o.data().total || 0);
            });
        } catch (e) {
            console.error("Error al leer historial de pedidos:", e);
        }

        const avgSpend = orderCount > 0 ? (totalSpend / orderCount).toFixed(2) : '0.00';

        const content = `
            <div class="space-y-6">
                <!-- Profile Header -->
                <div class="flex items-center gap-4 border-b border-gray-800 pb-4">
                    <div class="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-2xl border border-blue-500/20">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-100">${name}</h3>
                        <p class="text-xs text-gray-400">${email}</p>
                        <div class="flex gap-2 mt-2">
                            <span class="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-mono rounded border border-blue-500/20 capitalize">${role.replace('_', ' ')}</span>
                            <span class="px-2 py-0.5 ${isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} text-[10px] font-medium rounded border">${isActive ? 'Activo' : 'Bloqueado'}</span>
                        </div>
                    </div>
                </div>

                <!-- Detalle de Datos -->
                <div class="grid grid-cols-2 gap-4 text-xs">
                    <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                        <span class="text-gray-500 font-medium">Teléfono:</span>
                        <p class="text-gray-200 mt-1 font-semibold">${phone}</p>
                    </div>
                    <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                        <span class="text-gray-500 font-medium">Registrado el:</span>
                        <p class="text-gray-200 mt-1 font-semibold">${regDate}</p>
                    </div>
                    <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                        <span class="text-gray-500 font-medium">Última Conexión:</span>
                        <p class="text-gray-200 mt-1 font-semibold font-mono">${user.updatedAt ? new Date(user.updatedAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                        <span class="text-gray-500 font-medium">Versión App:</span>
                        <p class="text-gray-200 mt-1 font-semibold">${user.appVersion || 'Desconocida'}</p>
                    </div>
                </div>

                <!-- Resumen de Actividad -->
                <div class="border-t border-gray-800 pt-4">
                    <h4 class="text-sm font-semibold text-gray-200 mb-3">📈 Historial de Compras</h4>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                            <span class="text-[10px] text-gray-500 font-medium">Pedidos Totales</span>
                            <p class="text-xl font-bold text-gray-100 mt-1">${orderCount}</p>
                        </div>
                        <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                            <span class="text-[10px] text-gray-500 font-medium">Total Gastado</span>
                            <p class="text-xl font-bold text-green-400 mt-1">C$ ${totalSpend.toFixed(2)}</p>
                        </div>
                        <div class="bg-gray-950 p-3 rounded-lg border border-gray-800">
                            <span class="text-[10px] text-gray-500 font-medium">Ticket Promedio</span>
                            <p class="text-xl font-bold text-blue-400 mt-1">C$ ${avgSpend}</p>
                        </div>
                    </div>
                </div>

                <!-- Acciones del Modal -->
                <div class="flex justify-end gap-2 border-t border-gray-800 pt-4">
                    <button onclick="modal.close('user-profile-modal')" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 rounded-lg transition">Cerrar Ficha</button>
                </div>
            </div>
        `;

        modal.open('user-profile-modal', content);
    },

    // Cambiar rol de usuario
    editRole: (uid, currentRole) => {
        const content = `
            <div class="space-y-4">
                <h3 class="text-sm font-bold text-gray-200">🔄 Modificar Rol del Usuario</h3>
                <div class="space-y-2">
                    <label class="text-xs text-gray-400">Selecciona el nuevo rol:</label>
                    <select id="new-user-role" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-sm text-gray-300">
                        <option value="super_admin" ${currentRole === 'super_admin' ? 'selected' : ''}>Súper Administrador</option>
                        <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Administrador</option>
                        <option value="supervisor" ${currentRole === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="call_center" ${currentRole === 'call_center' ? 'selected' : ''}>Call Center</option>
                        <option value="marketing" ${currentRole === 'marketing' ? 'selected' : ''}>Marketing</option>
                        <option value="support" ${currentRole === 'support' ? 'selected' : ''}>Soporte</option>
                        <option value="business" ${currentRole === 'business' ? 'selected' : ''}>Comercio</option>
                        <option value="courier" ${currentRole === 'courier' ? 'selected' : ''}>Motorizado</option>
                        <option value="customer" ${currentRole === 'customer' ? 'selected' : ''}>Cliente</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t border-gray-800">
                    <button onclick="modal.close('edit-role-modal')" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg text-gray-300">Cancelar</button>
                    <button onclick="usersModule.saveRole('${uid}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white">Actualizar Rol</button>
                </div>
            </div>
        `;
        modal.open('edit-role-modal', content);
    },

    saveRole: async (uid) => {
        const newRole = document.getElementById('new-user-role').value;
        try {
            await functionsService.updateUser('setRole', uid, '', newRole);
            toast.show('Rol actualizado correctamente en el servidor');
            modal.close('edit-role-modal');
        } catch (e) {
            toast.show(e.message, 'error');
        }
    },

    // Bloquear / Desbloquear usuario
    toggleBlock: async (uid, currentActive) => {
        const confirmMsg = currentActive 
            ? '¿Estás seguro de que deseas BLOQUEAR a este usuario? No podrá iniciar sesión ni realizar transacciones.'
            : '¿Deseas DESBLOQUEAR a este usuario para restablecer su acceso?';
        
        if (confirm(confirmMsg)) {
            try {
                await functionsService.updateUser('setBlockStatus', uid, '', '', !currentActive);
                toast.show(currentActive ? 'Usuario bloqueado con éxito' : 'Usuario desbloqueado con éxito');
            } catch (e) {
                toast.show(e.message, 'error');
            }
        }
    },

    // Enviar link de restauración de contraseña
    triggerResetPassword: async (email) => {
        if (confirm(`¿Deseas enviar un enlace seguro para restablecer la contraseña a: ${email}?`)) {
            try {
                const res = await functionsService.resetPassword(email);
                if (res.success) {
                    const content = `
                        <div class="space-y-4">
                            <h3 class="text-sm font-bold text-gray-200">🔗 Enlace Seguro de Restablecimiento</h3>
                            <p class="text-xs text-gray-400">Se generó el enlace correctamente. Puedes copiarlo o compartirlo directamente:</p>
                            <input type="text" readonly value="${res.link}" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs font-mono text-blue-400 focus:outline-none">
                            <div class="flex justify-end pt-2 border-t border-gray-800">
                                <button onclick="modal.close('reset-link-modal')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white">Aceptar</button>
                            </div>
                        </div>
                    `;
                    modal.open('reset-link-modal', content);
                }
            } catch (e) {
                toast.show(e.message, 'error');
            }
        }
    },

    // Eliminar usuario con Confirmación de Seguridad Elevada (Hard Delete Real)
    deleteUser: (uid) => {
        const user = usersModule.users.find(u => u.uid === uid) || { uid, effectiveName: uid };
        const name = user.effectiveName || user.nombre || user.name || uid;

        const modalHtml = `
            <div class="space-y-4">
                <div class="flex items-center gap-3 border-b border-gray-800 pb-3">
                    <span class="text-2xl">🚨</span>
                    <div>
                        <h3 class="text-base font-bold text-red-400">Eliminación Definitiva de Identidad</h3>
                        <p class="text-xs text-gray-400">Usuario: <strong class="text-white">${name}</strong> (UID: <span class="font-mono text-blue-400">${uid}</span>)</p>
                    </div>
                </div>

                <div class="bg-red-950/30 border border-red-800/40 p-3.5 rounded-xl space-y-2 text-xs text-red-200">
                    <p class="font-bold flex items-center gap-1.5">
                        <span>⚠️</span> ADVERTENCIA DE SEGURIDAD CRÍTICA:
                    </p>
                    <p class="text-[11px] text-gray-300">
                        Esta operación eliminará permanentemente el documento de la identidad en <code>/users/${uid}</code> y limpiará sus dispositivos registrados en <code>/user_devices</code>. El historial transaccional previo (ventas, pagos y auditoría) se conservará intacto. Esta acción es IRREVERSIBLE.
                    </p>
                </div>

                <div class="space-y-2 pt-1">
                    <label class="block text-xs text-gray-300 font-bold">
                        Para habilitar el botón, escriba exactamente: <span class="text-red-400 font-black">ELIMINAR DEFINITIVAMENTE</span>
                    </label>
                    <input type="text" id="user-delete-confirm-input" placeholder="ELIMINAR DEFINITIVAMENTE"
                        oninput="usersModule.validateDeleteConfirmInput(this.value)"
                        class="w-full bg-gray-950 border border-gray-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:border-red-500 focus:outline-none font-mono" />
                </div>

                <div class="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-gray-800">
                    <button onclick="if(typeof modal !== 'undefined') modal.close('deleteUserModal')" class="w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition">
                        Cancelar
                    </button>
                    <button id="btn-user-hard-delete" disabled onclick="usersModule.executeHardDeleteUser('${uid}')" class="w-full sm:w-auto px-4 py-2 bg-red-600/40 text-gray-500 font-bold rounded-xl text-xs transition cursor-not-allowed flex items-center justify-center gap-1.5 border border-red-900/40">
                        <span>💥</span> CONFIRMAR ELIMINACIÓN DEFINITIVA
                    </button>
                </div>
            </div>
        `;

        if (typeof modal !== 'undefined') modal.open('deleteUserModal', modalHtml);
    },

    validateDeleteConfirmInput: (val) => {
        const btn = document.getElementById('btn-user-hard-delete');
        if (!btn) return;
        if (val.trim() === 'ELIMINAR DEFINITIVAMENTE') {
            btn.disabled = false;
            btn.className = "w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 border border-red-500 cursor-pointer animate-pulse";
        } else {
            btn.disabled = true;
            btn.className = "w-full sm:w-auto px-4 py-2 bg-red-600/40 text-gray-500 font-bold rounded-xl text-xs transition cursor-not-allowed flex items-center justify-center gap-1.5 border border-red-900/40";
        }
    },

    executeHardDeleteUser: async (uid) => {
        if (typeof modal !== 'undefined') modal.close('deleteUserModal');
        try {
            let res = null;
            if (typeof identityCanonicalService !== 'undefined' && identityCanonicalService.deleteIdentityPermanently) {
                res = await identityCanonicalService.deleteIdentityPermanently(uid);
            } else {
                await db.collection('users').doc(uid).delete();
                res = { success: true, identityType: 'FIRESTORE_ONLY' };
            }

            const msg = (res && res.identityType === 'AUTH_BACKED')
                ? 'Identidad AUTH_BACKED eliminada permanentemente de Auth y Firestore.'
                : 'Identidad FIRESTORE_ONLY eliminada permanentemente de Firestore.';

            if (typeof toast !== 'undefined') toast.show(msg, 'success');
        } catch (e) {
            alert('❌ Error al eliminar identidad: ' + e.message);
        }
    }
};

window.usersModule = usersModule;

