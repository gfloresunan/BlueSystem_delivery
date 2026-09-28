// ═══════════════════════════════════════════════════════════════════════════════
// BLUESYSTEM DELIVERY ENTERPRISE — Live Courier Monitor & Fleet Discovery
// PROTOCOLO: BSD-ADMIN-MOTORIZADOS-PHASE1-ROOT-FIX-001 (Fase 1 Canónica)
// ═══════════════════════════════════════════════════════════════════════════════

const liveCouriersModule = {
    unsubscribeCouriers: null,
    couriersCache: [],
    moduleState: 'LOADING', // 'LOADING' | 'SUCCESS' | 'EMPTY' | 'SEARCH_EMPTY' | 'PERMISSION_ERROR' | 'GENERIC_ERROR'
    errorMessage: '',
    currentTenantScope: null,

    // ─── 1. RESOLVER DE SCOPE MULTI-TENANT ────────────────────────────────────
    getTenantScope: () => {
        const claims = (window.AuthReadyGate && window.AuthReadyGate.claims) || {};
        const rawRole = (claims.role || claims.eiamRole || (window.AuthReadyGate && window.AuthReadyGate.role) || '').toString().toUpperCase();
        const isPlatformGlobal =
            rawRole === 'SUPER_ADMIN' ||
            rawRole === 'ADMIN' ||
            rawRole === 'AUDITOR' ||
            claims.admin === true ||
            claims.isSuperAdmin === true ||
            claims.isPlatformAdmin === true;

        return {
            isPlatformGlobal,
            tenantId: isPlatformGlobal ? null : (claims.tenantId || null)
        };
    },

    // ─── 2. RESOLVER CANÓNICO DE ROL COURIER / DRIVER (EIAM) ──────────────────
    isCourierEntity: (data) => {
        if (!data) return false;
        if (typeof CanonicalIdentityResolver !== 'undefined' && CanonicalIdentityResolver.resolveEiamRole) {
            return CanonicalIdentityResolver.resolveEiamRole(data) === 'DRIVER';
        }
        const raw = String(data.role || data.eiamRole || data.rol || data.userType || '').toLowerCase().trim();
        return ['driver', 'motorizado', 'courier', 'repartidor', 'deliverer'].includes(raw);
    },

    // ─── 3. RESOLVER DE ESTADO OPERACIONAL CANÓNICO ───────────────────────────
    // ─── 3. RESOLVER DE ESTADO OPERACIONAL & DE IDENTIDAD CANÓNICO ───────────
    resolveCourierState: (c) => {
        if (!c) {
            return {
                label: 'OFFLINE',
                colorClass: 'bg-slate-800 text-slate-400 border-slate-700',
                identityStatus: 'ACTIVO',
                identityClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                operationalLabel: 'OFFLINE',
                operationalClass: 'bg-slate-800 text-slate-400 border-slate-700',
                isSuspended: false
            };
        }

        // 1. Evaluación canónica de bloqueo o suspensión de identidad
        const isSuspended =
            c.status === 'SUSPENDED' ||
            c.status === 'BLOCKED' ||
            c.suspended === true ||
            c.lifecycleStatus === 'DEACTIVATED' ||
            c.isActive === false ||
            c.active === false;

        const identityStatus = isSuspended ? 'SUSPENDIDO' : 'ACTIVO';
        const identityClass = isSuspended
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

        // 2. Estado de turno operativo
        let operationalLabel = 'OFFLINE';
        let operationalClass = 'bg-slate-800 text-slate-400 border-slate-700';

        if (isSuspended) {
            operationalLabel = 'INHABILITADO';
            operationalClass = 'bg-rose-950/40 text-rose-300/80 border-rose-800/40';
        } else {
            const rawState = (c.courierState || c.shiftState || '').toUpperCase().trim();
            if (rawState === 'ONLINE' || rawState === 'WAITING_ORDER' || rawState === 'AVAILABLE' || rawState === 'DISPONIBLE') {
                operationalLabel = 'ONLINE';
                operationalClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            } else if (rawState === 'BUSY' || rawState === 'IN_TRANSIT' || rawState === 'GOING_TO_STORE' || rawState === 'GOING_TO_CUSTOMER' || rawState === 'DELIVERING' || rawState === 'EN_RUTA') {
                operationalLabel = 'EN SERVICIO';
                operationalClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            } else if (rawState === 'PAUSED' || rawState === 'PAUSA') {
                operationalLabel = 'EN PAUSA';
                operationalClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            } else if (c.isOnline === true || c.online === true) {
                operationalLabel = 'ONLINE';
                operationalClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            }
        }

        return {
            label: isSuspended ? 'SUSPENDIDO' : operationalLabel,
            colorClass: isSuspended ? identityClass : operationalClass,
            identityStatus,
            identityClass,
            operationalLabel,
            operationalClass,
            isSuspended
        };
    },

    // ─── 4. RENDERIZADO PRINCIPAL DEL CONTENEDOR ──────────────────────────────
    render: () => {
        const container = document.getElementById('tab-content');
        if (!container) return;

        liveCouriersModule.currentTenantScope = liveCouriersModule.getTenantScope();
        liveCouriersModule.moduleState = 'LOADING';
        liveCouriersModule.errorMessage = '';

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header Bar -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                    <div>
                        <h2 class="text-xl font-black text-white flex items-center gap-2">
                            <span>🛵</span> Live Courier Monitor & Telemetría
                        </h2>
                        <p class="text-xs text-slate-400">Padrón activo de motorizados, verificación vehicular y estado operacional en tiempo real</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <input type="text" id="courierSearchInput" placeholder="🔍 Buscar por Nombre, Placa, UID o Tel..." onkeyup="liveCouriersModule.renderGrid()" class="bg-slate-950 border border-slate-800 text-xs text-white px-4 py-2 rounded-xl focus:outline-none focus:border-indigo-500 w-64 md:w-72">
                        </div>
                        <button onclick="liveCouriersModule.refresh()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5" title="Recargar flota">
                            <span>🔄</span>
                        </button>
                    </div>
                </div>

                <!-- Couriers Summary Counter -->
                <div class="flex items-center justify-between px-1 text-xs text-slate-400">
                    <span id="couriersCounterText">Descubriendo flota de motorizados...</span>
                    <span class="text-[11px] font-mono ${liveCouriersModule.currentTenantScope.isPlatformGlobal ? 'text-indigo-400' : 'text-emerald-400'}">
                        ${liveCouriersModule.currentTenantScope.isPlatformGlobal ? 'Scope: Global (Todos los Tenants)' : `Scope: Tenant [${liveCouriersModule.currentTenantScope.tenantId}]`}
                    </span>
                </div>

                <!-- Couriers Cards Grid / State Container -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="couriersCardsGrid">
                    <div class="p-12 text-center text-slate-400 col-span-full">
                        <div class="flex flex-col items-center justify-center space-y-3">
                            <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p class="font-semibold text-slate-300">Cargando flota de motorizados en tiempo real...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        liveCouriersModule.initSnapshotListener();
    },

    // ─── 5. CICLO DE VIDA DEL LISTENER FIRESTORE ───────────────────────────────
    initSnapshotListener: () => {
        liveCouriersModule.cleanup();

        if (typeof db === 'undefined') {
            console.error("[LIVE_COURIERS] Firestore DB no está inicializado.");
            liveCouriersModule.moduleState = 'GENERIC_ERROR';
            liveCouriersModule.errorMessage = 'Firestore SDK no está disponible.';
            liveCouriersModule.renderGrid();
            return;
        }

        const scope = liveCouriersModule.currentTenantScope || liveCouriersModule.getTenantScope();

        // Consulta unificada a /users (donde residen las identidades de repartidores)
        let query = db.collection('users');
        if (!scope.isPlatformGlobal && scope.tenantId) {
            query = query.where('tenantId', '==', scope.tenantId);
        }

        liveCouriersModule.unsubscribeCouriers = query.onSnapshot(snapshot => {
            const discovered = [];

            snapshot.forEach(doc => {
                const data = doc.data() || {};
                const candidate = { id: doc.id, uid: doc.id, ...data };

                // Filtrar exclusivamente entidades que correspondan a repartidores (DRIVER)
                if (liveCouriersModule.isCourierEntity(candidate)) {
                    discovered.push(candidate);
                }
            });

            // Ordenar alfabéticamente por nombre
            discovered.sort((a, b) => {
                const nameA = a.name || a.nombre || '';
                const nameB = b.name || b.nombre || '';
                return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
            });

            liveCouriersModule.couriersCache = discovered;
            liveCouriersModule.moduleState = discovered.length > 0 ? 'SUCCESS' : 'EMPTY';
            liveCouriersModule.renderGrid();
        }, error => {
            console.error("[LIVE_COURIERS] Error en snapshot listener:", error);
            if (error && (error.code === 'permission-denied' || String(error).includes('permissions'))) {
                liveCouriersModule.moduleState = 'PERMISSION_ERROR';
                liveCouriersModule.errorMessage = 'No tienes permisos para consultar la colección de motorizados.';
            } else {
                liveCouriersModule.moduleState = 'GENERIC_ERROR';
                liveCouriersModule.errorMessage = error?.message || 'Error desconocido al consultar Firestore.';
            }
            liveCouriersModule.renderGrid();
        });
    },

    // ─── 6. CLEANUP EXPLICITO DE SUSCRIPCIONES ────────────────────────────────
    cleanup: () => {
        if (liveCouriersModule.unsubscribeCouriers) {
            try {
                liveCouriersModule.unsubscribeCouriers();
            } catch (err) {
                console.warn("[LIVE_COURIERS] Error limpiando listener anterior:", err);
            }
            liveCouriersModule.unsubscribeCouriers = null;
        }
    },

    // ─── 7. REFRESH MANUAL ───────────────────────────────────────────────────
    refresh: () => {
        liveCouriersModule.render();
    },

    // ─── 8. RENDERIZADO REACTIVO DE GRID Y ESTADOS ───────────────────────────
    renderGrid: () => {
        const container = document.getElementById('couriersCardsGrid');
        const counterText = document.getElementById('couriersCounterText');
        if (!container) return;

        // A. Manejo de Estado LOADING
        if (liveCouriersModule.moduleState === 'LOADING') {
            container.innerHTML = `
                <div class="p-12 text-center text-slate-400 col-span-full">
                    <div class="flex flex-col items-center justify-center space-y-3">
                        <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="font-semibold text-slate-300">Cargando flota de motorizados en tiempo real...</p>
                    </div>
                </div>
            `;
            if (counterText) counterText.innerText = 'Cargando motorizados...';
            return;
        }

        // B. Manejo de Estado PERMISSION_ERROR
        if (liveCouriersModule.moduleState === 'PERMISSION_ERROR') {
            container.innerHTML = `
                <div class="bg-rose-950/40 border border-rose-800/60 p-8 rounded-2xl text-center col-span-full space-y-3">
                    <span class="text-4xl">🔒</span>
                    <h4 class="font-bold text-rose-300 text-base">Permiso Denegado</h4>
                    <p class="text-xs text-rose-200/80 max-w-md mx-auto">${liveCouriersModule.errorMessage}</p>
                </div>
            `;
            if (counterText) counterText.innerText = '0 motorizados disponibles';
            return;
        }

        // C. Manejo de Estado GENERIC_ERROR
        if (liveCouriersModule.moduleState === 'GENERIC_ERROR') {
            container.innerHTML = `
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center col-span-full space-y-3">
                    <span class="text-4xl">⚠️</span>
                    <h4 class="font-bold text-white text-base">No fue posible cargar la flota</h4>
                    <p class="text-xs text-slate-400 max-w-md mx-auto">${liveCouriersModule.errorMessage}</p>
                    <button onclick="liveCouriersModule.refresh()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition">
                        Reintentar
                    </button>
                </div>
            `;
            if (counterText) counterText.innerText = 'Error de conexión';
            return;
        }

        // D. Manejo de Estado EMPTY (Sin motorizados registrados en la BD)
        if (liveCouriersModule.moduleState === 'EMPTY' || liveCouriersModule.couriersCache.length === 0) {
            container.innerHTML = `
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center col-span-full space-y-3">
                    <span class="text-4xl">🛵</span>
                    <h4 class="font-bold text-white text-base">No hay motorizados registrados</h4>
                    <p class="text-xs text-slate-400 max-w-md mx-auto">No se encontraron identidades con rol de repartidor en este tenant / plataforma.</p>
                </div>
            `;
            if (counterText) counterText.innerText = '0 motorizados registrados';
            return;
        }

        // E. Filtrado local por caja de búsqueda
        const query = (document.getElementById('courierSearchInput')?.value || '').toLowerCase().trim();

        const filtered = liveCouriersModule.couriersCache.filter(c => {
            if (!query) return true;
            const name = (c.name || c.nombre || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const phone = (c.phone || c.telefono || '').toLowerCase();
            const id = (c.id || c.uid || '').toLowerCase();
            const plate = (c.licensePlate || c.placa || c.vehiclePlate || c.vehicle?.plate || '').toLowerCase();
            const vehicle = (c.vehicleModel || c.vehicleBrand || c.vehicle?.model || '').toLowerCase();
            const tenant = (c.tenantId || '').toLowerCase();

            return name.includes(query) ||
                email.includes(query) ||
                phone.includes(query) ||
                id.includes(query) ||
                plate.includes(query) ||
                vehicle.includes(query) ||
                tenant.includes(query);
        });

        // F. Manejo de Estado SEARCH_EMPTY (Búsqueda sin resultados)
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl col-span-full space-y-2">
                    <p class="font-semibold text-slate-300">No se encontraron resultados para "${query}"</p>
                    <p class="text-xs text-slate-500">Intenta buscar por otro nombre, número de placa, teléfono o UID.</p>
                </div>
            `;
            if (counterText) counterText.innerText = `0 de ${liveCouriersModule.couriersCache.length} motorizados`;
            return;
        }

        // Actualizar contador del header
        if (counterText) {
            counterText.innerText = `Mostrando ${filtered.length} de ${liveCouriersModule.couriersCache.length} motorizados`;
        }

        // G. Renderizado de Cards sin datos simulados / mock
        container.innerHTML = filtered.map(c => {
            const state = liveCouriersModule.resolveCourierState(c);
            const name = c.name || c.nombre || 'Motorizado';
            const emailOrPhone = c.email || c.phone || c.telefono || 'Sin contacto';
            const uidShort = (c.id || c.uid || 'DRV').slice(0, 10);
            
            // Resolución defensiva de vehículo, año, color y placa (N/D si no existe en Firestore)
            const vYear = c.vehicleYear || c.vehicle?.year || '';
            const vColor = c.vehicleColor || c.vehicle?.color || '';
            const vSpecs = [vYear, vColor].filter(Boolean).join(' • ');
            const vehicleBase = c.vehicleModel ? `${c.vehicleBrand || ''} ${c.vehicleModel}`.trim() :
                                 (c.vehicle?.model ? `${c.vehicle.brand || ''} ${c.vehicle.model}`.trim() : (c.vehiculo || 'N/D'));
            const vehicleModel = vSpecs && vehicleBase !== 'N/D' ? `${vehicleBase} (${vSpecs})` : vehicleBase;
            const plate = c.licensePlate || c.placa || c.vehiclePlate || c.vehicle?.plate || 'N/D';

            // Datos que solo se muestran si existen realmente (sin hardcoded mocks)
            const trustScoreText = (c.trustScore !== undefined && c.trustScore !== null) ? `${c.trustScore}%` : 'N/D';
            const batteryText = (c.batteryLevel !== undefined && c.batteryLevel !== null) ? `🔋 ${c.batteryLevel}%` : 'N/D';
            const activeOrderText = c.activeOrderId ? `#${String(c.activeOrderId).slice(0, 8).toUpperCase()}` : 'Ninguna';
            const tenantBadge = c.tenantId ? `<span class="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-[9px] border border-slate-800">${c.tenantId}</span>` : '';
            const photoUrl = c.photoUrl || c.photoURL || c.fotoUrl || c.profilePhotoUrl || c.avatarUrl || '';

            // Badges geográficos y de flota canónicos
            const locationText = [c.municipalityName || c.city || c.municipalityId, c.departmentName || c.department || c.departmentId].filter(Boolean).join(', ');
            const locationBadge = locationText ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 font-mono text-[9px] border border-indigo-800/60 flex items-center gap-1" title="Ubicación Operativa">📍 ${locationText}</span>` : '';
            const fleetBadge = (c.fleetName || c.fleetId) ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 font-mono text-[9px] border border-emerald-800/60 flex items-center gap-1" title="Flota Adscrita">🛵 ${c.fleetName || c.fleetId}</span>` : '';

            // Métricas históricas canónicas de viajes
            const completedCommerce = Number(c.completedCommerceTrips || 0);
            const completedX2Y = Number(c.completedX2YTrips || 0);
            const completedTotal = Number(c.completedTotalTrips || (completedCommerce + completedX2Y));

            return `
                <div class="bg-slate-900 border ${state.isSuspended ? 'border-rose-800/60 bg-rose-950/15' : 'border-slate-800'} p-5 rounded-2xl space-y-4 shadow-xl hover:border-slate-700 transition">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="relative w-10 h-10 shrink-0">
                                ${photoUrl ? `
                                    <img src="${photoUrl}" 
                                         alt="${name}" 
                                         class="w-10 h-10 rounded-full object-cover border ${state.isSuspended ? 'border-rose-500/60' : 'border-indigo-500/50'} shadow-sm"
                                         onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                                    <div class="w-10 h-10 rounded-full ${state.isSuspended ? 'bg-rose-600/20 border-rose-500/40 text-rose-300' : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'} font-bold hidden items-center justify-center text-sm border">
                                        ${(name[0] || 'M').toUpperCase()}
                                    </div>
                                ` : `
                                    <div class="w-10 h-10 rounded-full ${state.isSuspended ? 'bg-rose-600/20 border-rose-500/40 text-rose-300' : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'} font-bold flex items-center justify-center text-sm border">
                                        ${(name[0] || 'M').toUpperCase()}
                                    </div>
                                `}
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-sm text-white truncate max-w-[170px]" title="${name}">${name}</h4>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">${emailOrPhone}</span>
                                    ${tenantBadge}
                                </div>
                                ${(locationBadge || fleetBadge) ? `
                                    <div class="flex items-center gap-1.5 flex-wrap mt-1">
                                        ${locationBadge}
                                        ${fleetBadge}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${state.identityClass}">
                                ${state.isSuspended ? '🔴 SUSPENDIDO' : '🟢 ACTIVO'}
                            </span>
                            <span class="px-2 py-0.5 rounded-md text-[9px] font-mono border ${state.operationalClass}">
                                ${state.operationalLabel}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-4 gap-2 text-center text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <div>
                            <span class="text-[10px] text-amber-500 font-bold uppercase" title="Calificación de clientes">Rating</span>
                            <p class="font-bold text-amber-300 mt-0.5 flex items-center justify-center gap-0.5">
                                <span class="text-amber-400">★</span> ${c.rating !== undefined && c.rating !== null ? Number(c.rating).toFixed(1) : (c.averageRating ? Number(c.averageRating).toFixed(1) : '5.0')}
                                <span class="text-[9px] text-slate-500 font-normal">(${c.totalRatings || c.ratingCount || 0})</span>
                            </p>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-500 font-bold uppercase" title="Evaluación de confianza">Trust Score</span>
                            <p class="font-bold text-slate-300 mt-0.5">${trustScoreText}</p>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-500 font-bold uppercase" title="Nivel de batería del dispositivo">Batería</span>
                            <p class="font-bold text-slate-300 mt-0.5">${batteryText}</p>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-500 font-bold uppercase" title="Placa y vehículo registrado">Placa</span>
                            <p class="font-bold text-slate-300 mt-0.5 truncate" title="${vehicleModel} (${plate})">${plate}</p>
                        </div>
                    </div>

                    <!-- Métricas Históricas Segregadas -->
                    <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                        <div title="Total de viajes finalizados (Comercio + X→Y)">
                            <span class="text-slate-400 block text-[9px] font-sans font-medium">🏁 Total</span>
                            <span class="font-bold text-white text-xs">${completedTotal}</span>
                        </div>
                        <div title="Viajes finalizados de pedidos de comercio">
                            <span class="text-blue-400 block text-[9px] font-sans font-medium">🚚 Comercio</span>
                            <span class="font-bold text-blue-300 text-xs">${completedCommerce}</span>
                        </div>
                        <div title="Viajes finalizados de paquetería X→Y">
                            <span class="text-purple-400 block text-[9px] font-sans font-medium">📦 X→Y</span>
                            <span class="font-bold text-purple-300 text-xs">${completedX2Y}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1">
                        <span class="text-slate-400">Orden Activa: <strong class="text-indigo-400 font-mono">${activeOrderText}</strong></span>
                        <div class="flex items-center gap-2">
                            <button onclick="liveCouriersModule.openDossier('${c.id || c.uid}')" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm" title="Ver y editar expediente completo del motorizado">
                                <span>📋</span> Expediente
                            </button>
                            <button onclick="liveCouriersModule.toggleSuspend('${c.id || c.uid}', ${state.isSuspended})" class="${state.isSuspended ? 'bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/10 hover:bg-rose-600 text-rose-300 border-rose-500/30'} border hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition">
                                ${state.isSuspended ? '🔓 Reactivar' : '🚫 Suspender'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ─── 9. SUSPENSIÓN / REACTIVACIÓN SEGURA CON AUDITORÍA ───────────────────
    // ROOT FIX: confirm() nativo bloqueado por browser en hosting seguro → modal inline
    toggleSuspend: (courierId, currentSuspended) => {
        console.log(`[Motorizados] suspend click | uid: ${courierId} | currentSuspended: ${currentSuspended}`);

        if (!courierId || courierId === 'undefined' || courierId === 'null') {
            console.error('[Motorizados] UID inválido recibido en toggleSuspend:', courierId);
            if (typeof toast !== 'undefined' && toast.error) toast.error('Error: UID del motorizado no disponible.');
            return;
        }

        const actionText = currentSuspended ? 'reactivar' : 'suspender';
        const targetStatus = currentSuspended ? 'ACTIVE' : 'SUSPENDED';
        const actionLabel = currentSuspended ? '🔓 Reactivar' : '🚫 Suspender';
        const actionColor = currentSuspended ? '#10b981' : '#ef4444';

        // Modal de confirmación inline (evita confirm() bloqueado por browser)
        const modalId = 'courier-action-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);';
        modal.innerHTML = `
            <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                <h3 style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0 0 8px;">${actionLabel} Motorizado</h3>
                <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;">UID: <code style="color:#818cf8;font-size:11px;">${courierId}</code></p>
                <p style="color:#94a3b8;font-size:13px;margin:0 0 24px;">Esta acción modificará el estado de autenticación y de identidad del motorizado. ¿Confirmas?</p>
                <div style="display:flex;gap:12px;justify-content:flex-end;">
                    <button id="modal-cancel-btn" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:8px 18px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="modal-confirm-btn" style="background:${actionColor};color:#fff;border:none;padding:8px 20px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">${actionLabel}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('modal-cancel-btn').onclick = () => {
            console.log('[Motorizados] Acción cancelada por el usuario.');
            modal.remove();
        };

        document.getElementById('modal-confirm-btn').onclick = async () => {
            modal.remove();
            await liveCouriersModule._executeSuspendAction(courierId, currentSuspended, targetStatus, actionText);
        };
    },

    // ─── 9b. EJECUCIÓN REAL DE SUSPENSIÓN/REACTIVACIÓN ────────────────────────
    _executeSuspendAction: async (courierId, currentSuspended, targetStatus, actionText) => {
        console.log(`[Motorizados] action: ${targetStatus} | calling identityAdministrationService`);

        // Feedback visual en botón durante operación
        const buttons = document.querySelectorAll(`[onclick*="'${courierId}'"]`);
        buttons.forEach(btn => { btn.disabled = true; btn.innerText = '⏳ Procesando...'; });

        try {
            const isNowSuspended = (targetStatus !== 'ACTIVE');

            if (typeof identityAdministrationService !== 'undefined' && identityAdministrationService.setIdentityStatus) {
                const actorUid = (firebase.auth().currentUser && firebase.auth().currentUser.uid) || 'ADMIN_PORTAL';
                console.log(`[Motorizados] calling setIdentityStatus(uid=${courierId}, status=${targetStatus}, actor=${actorUid})`);
                const result = await identityAdministrationService.setIdentityStatus(courierId, targetStatus, actorUid);
                console.log('[Motorizados] service response:', result);

                // Actualización optimista inmediata en cache local para feedback visual instantáneo
                const targetCourier = liveCouriersModule.couriersCache.find(c => (c.id === courierId || c.uid === courierId));
                if (targetCourier) {
                    targetCourier.status = targetStatus;
                    targetCourier.isActive = !isNowSuspended;
                    targetCourier.active = !isNowSuspended;
                    targetCourier.suspended = isNowSuspended;
                    liveCouriersModule.renderGrid();
                }

                if (typeof toast !== 'undefined' && toast.success) {
                    toast.success(`Motorizado ${actionText === 'reactivar' ? 'reactivado' : 'suspendido'} exitosamente.`);
                }
            } else {
                // Fallback: escritura directa con todos los campos canónicos
                console.warn('[Motorizados] identityAdministrationService no disponible. Usando fallback directo.');
                await db.collection('users').doc(courierId).set({
                    status: targetStatus,
                    suspended: isNowSuspended,
                    isActive: !isNowSuspended,
                    active: !isNowSuspended,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                const targetCourier = liveCouriersModule.couriersCache.find(c => (c.id === courierId || c.uid === courierId));
                if (targetCourier) {
                    targetCourier.status = targetStatus;
                    targetCourier.isActive = !isNowSuspended;
                    targetCourier.active = !isNowSuspended;
                    targetCourier.suspended = isNowSuspended;
                    liveCouriersModule.renderGrid();
                }

                if (typeof toast !== 'undefined' && toast.success) {
                    toast.success(`Estado actualizado a ${targetStatus}.`);
                }
            }
        } catch (err) {
            console.error('[Motorizados] service error:', err);
            if (typeof toast !== 'undefined' && toast.error) {
                toast.error('Error al actualizar estado: ' + (err.message || String(err)));
            }
            // Restaurar botón en caso de error
            buttons.forEach(btn => { btn.disabled = false; btn.innerText = currentSuspended ? '🔓 Reactivar' : '🚫 Suspender'; });
        }
    },

    // ─── 10. GESTIÓN INTEGRAL DEL EXPEDIENTE DEL MOTORIZADO (DOSSIER) ─────────
    currentDossierData: null,
    activeDossierTab: 'location',
    isSavingDossier: false,

    // ─── 10a. APERTURA DEL EXPEDIENTE ─────────────────────────────────────────
    openDossier: async (courierId) => {
        if (!courierId) return;
        liveCouriersModule.activeDossierTab = 'location';
        liveCouriersModule.isSavingDossier = false;

        const loadingHtml = `
            <div class="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-sans">
                <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs font-mono text-indigo-400 font-bold animate-pulse">CARGANDO EXPEDIENTE 360°...</p>
                <p class="text-[10px] text-slate-500 font-mono">UID: ${courierId}</p>
            </div>
        `;

        if (typeof drawer !== 'undefined' && drawer.open) {
            drawer.open('drawer-courier-dossier', '📋 Expediente del Motorizado', loadingHtml);
        }

        try {
            const [userDoc, courierDoc, balanceDoc] = await Promise.all([
                db.collection('users').doc(courierId).get().catch(() => null),
                db.collection('couriers').doc(courierId).get().catch(() => null),
                db.collection('courier_balances').doc(courierId).get().catch(() => null)
            ]);

            const uData = (userDoc && userDoc.exists) ? userDoc.data() || {} : {};
            const cData = (courierDoc && courierDoc.exists) ? courierDoc.data() || {} : {};
            const bData = (balanceDoc && balanceDoc.exists) ? balanceDoc.data() || {} : {};

            liveCouriersModule.currentDossierData = {
                uid: courierId,
                user: uData,
                courier: cData,
                balance: bData
            };

            liveCouriersModule.renderDossier(courierId);
        } catch (err) {
            console.error("[LIVE_COURIERS] Error al cargar expediente:", err);
            if (typeof toast !== 'undefined' && toast.error) {
                toast.error("Error al cargar expediente: " + (err.message || String(err)));
            }
            if (typeof drawer !== 'undefined' && drawer.close) {
                drawer.close('drawer-courier-dossier');
            }
        }
    },

    // ─── 10b. CAMBIO DE PESTAÑA DEL EXPEDIENTE ────────────────────────────────
    switchDossierTab: (tabKey) => {
        liveCouriersModule.activeDossierTab = tabKey;
        const tabs = ['personal', 'location', 'vehicle', 'telemetry', 'reviews'];
        tabs.forEach(t => {
            const tabBtn = document.getElementById(`cd-tab-btn-${t}`);
            const panel = document.getElementById(`cd-panel-${t}`);
            if (tabBtn) {
                if (t === tabKey) {
                    tabBtn.className = 'flex-1 py-2 text-xs font-bold border-b-2 border-indigo-500 text-indigo-400 transition bg-slate-900/60 rounded-t-xl';
                } else {
                    tabBtn.className = 'flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition';
                }
            }
            if (panel) {
                if (t === tabKey) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            }
        });
        if (tabKey === 'reviews' && liveCouriersModule.currentDossierData) {
            liveCouriersModule.loadCourierReviews(liveCouriersModule.currentDossierData.uid);
        }
    },

    // ─── 10b-bis. CARGA DE RESEÑAS Y CALIFICACIONES DEL MOTORIZADO ────────────
    loadCourierReviews: async (courierId) => {
        const container = document.getElementById('cd-reviews-container');
        if (!container || !courierId) return;

        try {
            const snap = await db.collection('couriers').doc(courierId)
                .collection('reviews')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get()
                .catch(() => null);

            let reviews = [];
            if (snap && !snap.empty) {
                snap.forEach(doc => {
                    reviews.push({ id: doc.id, ...doc.data() });
                });
            }

            // Fallback: Si no hay en subcolección, buscar en /reviews donde courierId == courierId
            if (reviews.length === 0) {
                const altSnap = await db.collection('reviews')
                    .where('courierId', '==', courierId)
                    .limit(50)
                    .get()
                    .catch(() => null);
                if (altSnap && !altSnap.empty) {
                    altSnap.forEach(doc => {
                        reviews.push({ id: doc.id, ...doc.data() });
                    });
                }
            }

            const cData = liveCouriersModule.currentDossierData?.user || {};
            const ratingVal = cData.rating !== undefined && cData.rating !== null ? Number(cData.rating).toFixed(1) : '5.0';
            const totalVal = reviews.length || cData.totalRatings || cData.ratingCount || 0;

            if (reviews.length === 0) {
                container.innerHTML = `
                    <div class="bg-slate-950 border border-slate-800 p-6 rounded-xl text-center space-y-2">
                        <span class="text-3xl block">⭐</span>
                        <h5 class="text-sm font-bold text-white">Sin Reseñas Aún</h5>
                        <p class="text-xs text-slate-400 max-w-xs mx-auto">
                            Este motorizado aún no ha recibido calificaciones directas de clientes en pedidos entregados.
                        </p>
                        <div class="inline-block bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono text-amber-400">
                            Rating Base: ★ ${ratingVal} (${totalVal} reseñas)
                        </div>
                    </div>
                `;
                return;
            }

            const reviewsHtml = reviews.map(r => {
                const rRating = Number(r.rating || r.courierRating || 5);
                const stars = '★'.repeat(Math.min(5, Math.max(1, Math.round(rRating)))) + '☆'.repeat(Math.max(0, 5 - Math.round(rRating)));
                const cName = r.userName || r.authorName || r.customerName || 'Cliente';
                const cComment = r.comment || r.courierComment || r.comments || r.courierRatingComment || 'Sin comentario de texto';
                const dateStr = r.date || (r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleDateString('es-ES') : 'Reciente');
                const orderBadge = r.orderId ? `<span class="font-mono text-[9px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">#${String(r.orderId).slice(0, 8).toUpperCase()}</span>` : '';

                return `
                    <div class="bg-slate-950 border border-slate-800/90 p-3 rounded-xl space-y-2 hover:border-slate-700 transition">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-xs">
                                    ${(cName[0] || 'C').toUpperCase()}
                                </div>
                                <div>
                                    <span class="text-xs font-bold text-white">${cName}</span>
                                    <span class="text-[10px] text-slate-500 block">${dateStr}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-1.5">
                                ${orderBadge}
                                <span class="text-amber-400 font-black text-xs tracking-wider">${stars}</span>
                            </div>
                        </div>
                        <p class="text-xs text-slate-300 leading-relaxed pl-9 bg-slate-900/40 p-2 rounded-lg border border-slate-800/40">
                            "${cComment}"
                        </p>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Satisfacción General</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-amber-400 font-black text-xl">★ ${ratingVal}</span>
                            <span class="text-xs text-slate-400">(${totalVal} ${totalVal === 1 ? 'opinión' : 'opiniones'})</span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Flota Verificada
                    </span>
                </div>
                <div class="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    ${reviewsHtml}
                </div>
            `;
        } catch (err) {
            console.error('[LIVE_COURIERS] Error cargando reseñas:', err);
            container.innerHTML = `
                <div class="bg-rose-950/20 border border-rose-800/40 p-3 rounded-xl text-xs text-rose-300 text-center">
                    Error al consultar reseñas del motorizado: ${err.message || String(err)}
                </div>
            `;
        }
    },

    // ─── 10c. SELECTOR DEPENDIENTE DE DEPARTAMENTO → MUNICIPIO ────────────────
    onDepartmentChange: (deptId) => {
        const muniSelect = document.getElementById('cd-muni');
        if (!muniSelect) return;

        const geo = window.GeoCatalog;
        const cleanDept = (deptId || '').trim().toUpperCase();
        const munis = (geo && cleanDept) ? geo.getMunicipalities(cleanDept) : [];

        muniSelect.innerHTML = '<option value="">-- Seleccionar Municipio Oficial --</option>' +
            munis.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    },

    // ─── 10d. RENDERIZADO DEL EXPEDIENTE ──────────────────────────────────────
    renderDossier: (courierId) => {
        const data = liveCouriersModule.currentDossierData;
        if (!data) return;

        const u = data.user || {};
        const c = data.courier || {};
        const b = data.balance || {};

        const name = u.name || u.nombre || c.name || c.nombre || 'Sin nombre';
        const phone = u.phone || u.telefono || c.phone || c.telefono || '';
        const email = u.email || c.email || 'Sin correo';
        const nationalId = u.nationalId || u.cedula || c.nationalId || c.cedula || '';
        const tenantId = u.tenantId || c.tenantId || 'default';
        const role = u.role || u.eiamRole || u.rol || 'DRIVER';

        // Ubicación actual canónica
        let currentDeptId = c.departmentId || u.departmentId || '';
        let currentMuniId = c.operationalMunicipalityId || c.municipalityId || c.cityId || u.operationalMunicipalityId || u.municipalityId || u.cityId || '';
        const currentZone = c.zone || c.operationalZone || u.zone || u.operationalZone || '';
        const currentFleetId = c.fleetId || u.fleetId || '';
        const currentFleetName = c.fleetName || u.fleetName || '';
        const currentBaseAddress = c.baseAddress || c.direccionBase || u.address || '';

        // Si departamento no está normalizado pero el municipio sí, auto-resolver vía GeoCatalog
        const geo = window.GeoCatalog;
        if (geo && !currentDeptId && currentMuniId) {
            const normalized = geo.normalizeGeoLocation(currentDeptId, currentMuniId);
            if (normalized && normalized.departmentId) {
                currentDeptId = normalized.departmentId;
                currentMuniId = normalized.municipalityId || currentMuniId;
            }
        }

        // Datos vehiculares
        const currentVehicleType = (c.vehicleType || c.vehicle?.type || u.vehicleType || 'MOTO').toUpperCase();
        const currentVehicleBrand = c.vehicleBrand || c.vehicle?.brand || u.vehicleBrand || '';
        const currentVehicleModel = c.vehicleModel || c.vehicle?.model || u.vehicleModel || '';
        const currentPlate = c.plate || c.licensePlate || c.vehicle?.plate || u.vehiclePlate || u.placa || '';
        const currentYear = c.vehicleYear || c.vehicle?.year || u.vehicleYear || u.year || '';
        const currentColor = c.vehicleColor || c.vehicle?.color || u.vehicleColor || u.color || '';

        // Telemetría & Finanzas
        const state = liveCouriersModule.resolveCourierState(u);
        const cashOutstanding = b.cashOutstandingCents ? (Number(b.cashOutstandingCents) / 100).toFixed(2) + ' NIO' : '0.00 NIO';
        const hasCustomLimit = (b.customCashLimitCents !== undefined && b.customCashLimitCents !== null) ||
                               (c.customCashLimitCents !== undefined && c.customCashLimitCents !== null) ||
                               (u.customCashLimitCents !== undefined && u.customCashLimitCents !== null);
        const rawLimitCents = hasCustomLimit
            ? Number(b.customCashLimitCents ?? c.customCashLimitCents ?? u.customCashLimitCents)
            : Number(b.effectiveCashLimitCents ?? 200000);
        const currentLimitNio = (rawLimitCents / 100).toFixed(2);
        const effectiveLimit = `C$ ${currentLimitNio} NIO`;
        const limitTypeBadge = hasCustomLimit
            ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 font-mono text-[9px] border border-indigo-700/60 font-bold">Personalizado</span>`
            : `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px] border border-slate-700 font-medium">General (Predeterminado)</span>`;
        const accessState = String(b.financialAccessState || 'ALLOW');
        const canReceive = b.canReceiveNewOrders ?? true;
        const hasOverdue = b.hasOverdueClosure === true;

        // Métricas históricas canónicas de viajes
        const completedCommerce = Number(c.completedCommerceTrips || u.completedCommerceTrips || 0);
        const completedX2Y = Number(c.completedX2YTrips || u.completedX2YTrips || 0);
        const completedTotal = Number(c.completedTotalTrips || u.completedTotalTrips || (completedCommerce + completedX2Y));

        // Opciones de Departamentos Oficiales de Nicaragua
        const departments = geo ? geo.NICARAGUA_DEPARTMENTS : [];
        const deptOptions = departments.map(d => {
            return `<option value="${d.id}" ${d.id === currentDeptId.toUpperCase() ? 'selected' : ''}>${d.name}</option>`;
        }).join('');

        // Opciones de Municipios Dependientes del departamento actual
        const municipalities = (geo && currentDeptId) ? geo.getMunicipalities(currentDeptId) : [];
        const muniOptions = municipalities.map(m => {
            return `<option value="${m.id}" ${m.id === currentMuniId.toUpperCase() ? 'selected' : ''}>${m.name}</option>`;
        }).join('');

        const html = `
            <div class="space-y-4 font-sans text-xs text-slate-200">
                <!-- Banner de Identidad Superior -->
                <div class="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-black text-lg flex items-center justify-center shrink-0">
                            ${(name[0] || 'M').toUpperCase()}
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-sm font-black text-white truncate" title="${name}">${name}</h3>
                            <p class="text-[11px] font-mono text-slate-400 truncate">${email}</p>
                            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${state.identityClass}">${state.identityStatus}</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-mono border ${state.operationalClass}">${state.operationalLabel}</span>
                                <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px] border border-slate-700">Tenant: ${tenantId}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="text-[10px] font-mono text-slate-600 -mt-2 px-1">UID: ${courierId}</p>

                <!-- Barra de Navegación de Pestañas del Expediente -->
                <div class="flex border-b border-slate-800 text-center bg-slate-950/60 rounded-xl p-1 gap-1">
                    <button id="cd-tab-btn-location" onclick="liveCouriersModule.switchDossierTab('location')"
                        class="flex-1 py-2 text-xs font-bold border-b-2 border-indigo-500 text-indigo-400 transition bg-slate-900/60 rounded-t-xl">
                        📍 Ubicación & Flota
                    </button>
                    <button id="cd-tab-btn-personal" onclick="liveCouriersModule.switchDossierTab('personal')"
                        class="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
                        👤 Personales
                    </button>
                    <button id="cd-tab-btn-vehicle" onclick="liveCouriersModule.switchDossierTab('vehicle')"
                        class="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
                        🛵 Vehículo
                    </button>
                    <button id="cd-tab-btn-telemetry" onclick="liveCouriersModule.switchDossierTab('telemetry')"
                        class="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
                        📊 Operación & Caja
                    </button>
                    <button id="cd-tab-btn-reviews" onclick="liveCouriersModule.switchDossierTab('reviews')"
                        class="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
                        ⭐ Reseñas
                    </button>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <!-- PESTAÑA 2: UBICACIÓN GEOGRÁFICA & ADSCRIPCIÓN A FLOTA (PRIORIDAD) -->
                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <div id="cd-panel-location" class="space-y-4">
                    <div class="bg-indigo-950/20 border border-indigo-500/30 p-3.5 rounded-xl space-y-1">
                        <div class="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                            <span>🧭</span> Control Territorial & Elegibilidad de Despacho
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                            Al cambiar Departamento y Municipio, el motorizado se desuscribe automáticamente de su pool anterior y se suscribe al pool municipal receptor. Las órdenes históricas no sufren alteración alguna.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">
                                Departamento Oficial <span class="text-rose-400">*</span>
                            </label>
                            <select id="cd-dept" onchange="liveCouriersModule.onDepartmentChange(this.value)"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                                <option value="">-- Seleccionar Departamento --</option>
                                ${deptOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">
                                Municipio Oficial (Dependiente) <span class="text-rose-400">*</span>
                            </label>
                            <select id="cd-muni"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                                <option value="">-- Seleccionar Municipio Oficial --</option>
                                ${muniOptions}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Zona / Área Operativa</label>
                            <input type="text" id="cd-zone" value="${currentZone}"
                                placeholder="Ej: Casco Urbano, Zona Norte, Centro..."
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Nombre / Identificador de Flota</label>
                            <input type="text" id="cd-fleet-name" value="${currentFleetName || currentFleetId}"
                                placeholder="Ej: Flota Jinotega Urbana, Flota Managua 1..."
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[11px] text-slate-300 font-bold mb-1">Dirección / Base Operativa</label>
                        <input type="text" id="cd-base-address" value="${currentBaseAddress}"
                            placeholder="Dirección física o punto de partida habitual..."
                            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                    </div>

                    <div class="pt-2 border-t border-slate-800/80">
                        <label class="block text-[11px] text-amber-300 font-bold mb-1 flex items-center gap-1.5">
                            <span>📝</span> Motivo del Traslado / Modificación Operativa (Auditoría)
                        </label>
                        <textarea id="cd-transfer-reason" rows="2"
                            placeholder="Describa el motivo del cambio de municipio o adscripción (e.g. Traslado por apertura de plaza, cambio de domicilio...)"
                            class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none"></textarea>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <!-- PESTAÑA 1: DATOS PERSONALES & CONTACTO                            -->
                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <div id="cd-panel-personal" class="space-y-3 hidden">
                    <div>
                        <label class="block text-[11px] text-slate-300 font-bold mb-1">
                            Nombre Completo <span class="text-rose-400">*</span>
                        </label>
                        <input type="text" id="cd-name" value="${name !== 'Sin nombre' ? name : ''}"
                            placeholder="Nombre y Apellidos"
                            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] text-slate-300 font-bold mb-1">
                            Teléfono de Contacto <span class="text-rose-400">*</span>
                        </label>
                        <input type="text" id="cd-phone" value="${phone}"
                            placeholder="+505 8888 8888"
                            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] text-slate-300 font-bold mb-1">Cédula de Identidad Nacional</label>
                        <input type="text" id="cd-national-id" value="${nationalId}"
                            placeholder="001-000000-0000A"
                            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-[11px] text-slate-400 font-bold mb-1">Correo Electrónico (Firebase Auth)</label>
                        <input type="text" value="${email}" disabled
                            class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 text-xs font-mono cursor-not-allowed">
                        <p class="text-[9px] text-slate-500 mt-1">🔒 El email de autenticación se gestiona en Firebase Auth para proteger las credenciales.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <span class="text-slate-500 font-bold block mb-1">Rol EIAM</span>
                            <span class="text-indigo-400 font-mono font-bold uppercase">${role}</span>
                        </div>
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <span class="text-slate-500 font-bold block mb-1">Tenant ID</span>
                            <span class="text-emerald-400 font-mono font-bold">${tenantId}</span>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <!-- PESTAÑA 3: VEHÍCULO & DOCUMENTACIÓN                              -->
                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <div id="cd-panel-vehicle" class="space-y-3 hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Tipo de Vehículo</label>
                            <select id="cd-vehicle-type"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                                <option value="MOTO" ${currentVehicleType === 'MOTO' ? 'selected' : ''}>🛵 Motocicleta</option>
                                <option value="BICICLETA" ${currentVehicleType === 'BICICLETA' ? 'selected' : ''}>🚲 Bicicleta</option>
                                <option value="AUTOMOVIL" ${currentVehicleType === 'AUTOMOVIL' ? 'selected' : ''}>🚗 Automóvil</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Número de Placa</label>
                            <input type="text" id="cd-vehicle-plate" value="${currentPlate}"
                                placeholder="M 123456"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono uppercase focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Marca</label>
                            <input type="text" id="cd-vehicle-brand" value="${currentVehicleBrand}"
                                placeholder="Ej: Honda, Yamaha, Suzuki..."
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Modelo</label>
                            <input type="text" id="cd-vehicle-model" value="${currentVehicleModel}"
                                placeholder="Ej: Pulsar 150, Boxer..."
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Año</label>
                            <input type="number" id="cd-vehicle-year" value="${currentYear}"
                                placeholder="2023" min="1990" max="2030"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-300 font-bold mb-1">Color</label>
                            <input type="text" id="cd-vehicle-color" value="${currentColor}"
                                placeholder="Ej: Negro, Rojo, Azul..."
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <!-- PESTAÑA 4: TELEMETRÍA, ESTADO & FINANZAS                          -->
                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <div id="cd-panel-telemetry" class="space-y-3 hidden">
                    <div class="grid grid-cols-2 gap-2 text-[11px]">
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
                            <span class="text-slate-500 font-bold block">Efectivo en Custodia</span>
                            <span class="text-amber-400 font-mono font-black text-sm">${cashOutstanding}</span>
                        </div>
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1.5" id="cd-cash-limit-card">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-bold block">Límite Efectivo Máx.</span>
                                ${limitTypeBadge}
                            </div>
                            <div class="flex items-baseline justify-between">
                                <span class="text-emerald-400 font-mono font-black text-sm" id="cd-cash-limit-val">${effectiveLimit}</span>
                                <button type="button" onclick="liveCouriersModule.toggleCashLimitEditor(true)"
                                    class="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1 border border-indigo-900/60 bg-indigo-950/40 px-2 py-0.5 rounded-lg hover:border-indigo-700" title="Configurar límite individual o restaurar límite general">
                                    <span>⚙️</span> Editar
                                </button>
                            </div>
                        </div>
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
                            <span class="text-slate-500 font-bold block">Estado Financiero</span>
                            <span class="font-mono font-bold ${accessState === 'ALLOW' ? 'text-emerald-400' : 'text-rose-400'}">${accessState}</span>
                        </div>
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
                            <span class="text-slate-500 font-bold block">Habilitado para Pedidos</span>
                            <span class="font-mono font-bold ${canReceive ? 'text-emerald-400' : 'text-rose-400'}">${canReceive ? 'SÍ' : 'NO (Bloqueado)'}</span>
                        </div>
                    </div>

                    <!-- Métricas Históricas de Viajes Segregadas -->
                    <div class="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Métricas Históricas de Despacho</span>
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div class="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl space-y-0.5">
                                <span class="text-[10px] text-slate-400 block font-medium">🏁 Total</span>
                                <span class="text-base font-black text-white font-mono">${completedTotal}</span>
                                <span class="text-[8px] text-slate-500 block">Viajes</span>
                            </div>
                            <div class="bg-blue-950/20 border border-blue-800/40 p-2.5 rounded-xl space-y-0.5">
                                <span class="text-[10px] text-blue-400 block font-medium">🚚 Comercio</span>
                                <span class="text-base font-black text-blue-300 font-mono">${completedCommerce}</span>
                                <span class="text-[8px] text-blue-400/60 block">Restaurantes</span>
                            </div>
                            <div class="bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-xl space-y-0.5">
                                <span class="text-[10px] text-purple-400 block font-medium">📦 Delivery X→Y</span>
                                <span class="text-base font-black text-purple-300 font-mono">${completedX2Y}</span>
                                <span class="text-[8px] text-purple-400/60 block">Paquetería</span>
                            </div>
                        </div>
                    </div>

                    <!-- Micro-editor de Límite Máximo de Efectivo Individual -->
                    <div id="cd-cash-limit-editor" class="hidden bg-slate-950 border border-indigo-500/40 p-3.5 rounded-xl space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div class="flex items-center gap-1.5">
                                <span class="text-indigo-400 font-bold text-xs">⚙️ Configurar Límite de Efectivo</span>
                                ${hasCustomLimit ? `<span class="text-[9px] font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40 font-bold">Override Activo</span>` : ''}
                            </div>
                            <button type="button" onclick="liveCouriersModule.toggleCashLimitEditor(false)" class="text-slate-400 hover:text-white text-xs">✕</button>
                        </div>

                        <div class="space-y-2 text-xs">
                            <div>
                                <label class="block text-[11px] text-slate-300 font-bold mb-1">
                                    Límite Máximo Individual (NIO) <span class="text-rose-400">*</span>
                                </label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">C$</span>
                                    <input type="number" id="cd-input-cash-limit" step="50" min="0" max="100000" value="${currentLimitNio}"
                                        class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white font-mono font-bold text-xs focus:border-indigo-500 focus:outline-none">
                                </div>
                                <p class="text-[9px] text-slate-500 mt-1">Límite general del sistema: C$ 2,000.00. Al alcanzar o rebasar este monto en custodia, se suspende la recepción de nuevos pedidos.</p>
                            </div>

                            <div>
                                <label class="block text-[11px] text-slate-300 font-bold mb-1">Motivo del Ajuste (Auditoría Administrativa)</label>
                                <input type="text" id="cd-input-cash-limit-reason" placeholder="Ej: Ajuste por volumen de ventas / Confiabilidad"
                                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none">
                            </div>

                            <div id="cd-cash-limit-feedback" class="hidden text-[11px] p-2 rounded-lg"></div>
                        </div>

                        <div class="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                            <button type="button" onclick="liveCouriersModule.toggleCashLimitEditor(false)"
                                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition">
                                Cancelar
                            </button>

                            ${hasCustomLimit ? `
                                <button type="button" id="cd-btn-reset-cash-limit" onclick="liveCouriersModule.resetCashLimit('${courierId}')"
                                    class="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                    title="Elimina el override individual y restaura el límite predeterminado del sistema (C$ 2,000.00)">
                                    <span>🔄</span> Restaurar General
                                </button>
                            ` : ''}

                            <button type="button" id="cd-btn-save-cash-limit" onclick="liveCouriersModule.saveCashLimit('${courierId}')"
                                class="ml-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow">
                                <span>💾</span> Guardar Límite
                            </button>
                        </div>
                    </div>

                    ${hasOverdue ? `
                        <div class="bg-rose-950/30 border border-rose-800/40 p-3 rounded-xl text-xs text-rose-300">
                            ⚠️ <strong>Alerta:</strong> Este motorizado tiene un cierre diario pendiente de liquidación.
                        </div>
                    ` : ''}

                    <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="text-slate-400">Ver telemetría en vivo en el Mapa 4K:</span>
                            <button onclick="drawer.close('drawer-courier-dossier'); dashboardController.switchTab('liveMap');"
                                class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition">
                                🗺️ Ver en Mapa
                            </button>
                        </div>
                        <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                            <span class="text-slate-400">Administrar caja y liquidación oficial:</span>
                            <button onclick="drawer.close('drawer-courier-dossier'); dashboardController.switchTab('courierCashControl');"
                                class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold text-[10px] transition">
                                💰 Ver Caja
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <!-- PESTAÑA 5: CALIFICACIONES & RESEÑAS DE CLIENTES                    -->
                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <div id="cd-panel-reviews" class="space-y-3 hidden">
                    <div id="cd-reviews-container" class="space-y-3">
                        <div class="p-8 text-center text-slate-400">
                            <div class="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p class="text-xs">Cargando calificaciones y comentarios...</p>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <!-- BOTONES DE ACCIÓN DEL FOOTER                                      -->
                <!-- ═══════════════════════════════════════════════════════════════════ -->
                <div class="border-t border-slate-800 pt-4 flex gap-2 justify-end sticky bottom-0 bg-slate-900 pb-1">
                    <button onclick="drawer.close('drawer-courier-dossier')"
                        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                        Cancelar
                    </button>
                    <button id="cd-save-btn" onclick="liveCouriersModule.saveDossier('${courierId}')"
                        class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-2">
                        <span>💾</span> Guardar Expediente
                    </button>
                </div>
            </div>
        `;

        if (typeof drawer !== 'undefined' && drawer.open) {
            drawer.open('drawer-courier-dossier', `🛵 Expediente: ${name}`, html);
        }
    },

    // ─── 10e. GUARDADO ATÓMICO CON AUDITORÍA INMUTABLE ─────────────────────────
    saveDossier: async (courierId) => {
        if (!courierId || liveCouriersModule.isSavingDossier) return;

        const saveBtn = document.getElementById('cd-save-btn');
        const originalBtnHtml = saveBtn ? saveBtn.innerHTML : 'Guardar Expediente';

        // 1. Lectura de campos del formulario
        const nameInput = document.getElementById('cd-name');
        const phoneInput = document.getElementById('cd-phone');
        const nationalIdInput = document.getElementById('cd-national-id');

        const deptSelect = document.getElementById('cd-dept');
        const muniSelect = document.getElementById('cd-muni');
        const zoneInput = document.getElementById('cd-zone');
        const fleetNameInput = document.getElementById('cd-fleet-name');
        const baseAddressInput = document.getElementById('cd-base-address');
        const transferReasonInput = document.getElementById('cd-transfer-reason');

        const vehicleTypeSelect = document.getElementById('cd-vehicle-type');
        const plateInput = document.getElementById('cd-vehicle-plate');
        const brandInput = document.getElementById('cd-vehicle-brand');
        const modelInput = document.getElementById('cd-vehicle-model');
        const yearInput = document.getElementById('cd-vehicle-year');
        const colorInput = document.getElementById('cd-vehicle-color');

        const newName = nameInput ? nameInput.value.trim() : '';
        const newPhone = phoneInput ? phoneInput.value.trim() : '';
        const newNationalId = nationalIdInput ? nationalIdInput.value.trim() : '';

        const newDeptId = deptSelect ? deptSelect.value.trim().toUpperCase() : '';
        const newMuniId = muniSelect ? muniSelect.value.trim().toUpperCase() : '';
        const newZone = zoneInput ? zoneInput.value.trim() : '';
        const newFleetName = fleetNameInput ? fleetNameInput.value.trim() : '';
        const newFleetId = newFleetName ? `FLEET_${newFleetName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}` : '';
        const newBaseAddress = baseAddressInput ? baseAddressInput.value.trim() : '';
        const transferReason = transferReasonInput ? transferReasonInput.value.trim() : '';

        const newVehicleType = vehicleTypeSelect ? vehicleTypeSelect.value.trim().toUpperCase() : 'MOTO';
        const newPlate = plateInput ? plateInput.value.toUpperCase().replace(/\s+/g, '').trim() : '';
        const newBrand = brandInput ? brandInput.value.trim() : '';
        const newModel = modelInput ? modelInput.value.trim() : '';
        const newYear = yearInput ? yearInput.value.trim() : '';
        const newColor = colorInput ? colorInput.value.trim() : '';

        // 2. Validaciones estrictas
        if (!newName) {
            if (typeof toast !== 'undefined' && toast.error) toast.error("El nombre del motorizado es obligatorio.");
            liveCouriersModule.switchDossierTab('personal');
            return;
        }

        if (!newPhone) {
            if (typeof toast !== 'undefined' && toast.error) toast.error("El teléfono de contacto es obligatorio.");
            liveCouriersModule.switchDossierTab('personal');
            return;
        }

        const geo = window.GeoCatalog;
        if (newDeptId || newMuniId) {
            if (!newDeptId || !newMuniId) {
                if (typeof toast !== 'undefined' && toast.error) {
                    toast.error("Debe seleccionar tanto Departamento como Municipio oficial.");
                }
                liveCouriersModule.switchDossierTab('location');
                return;
            }

            if (geo && !geo.isValidMunicipality(newDeptId, newMuniId)) {
                if (typeof toast !== 'undefined' && toast.error) {
                    toast.error(`El municipio seleccionado no pertenece al departamento de ${geo.getDepartmentName(newDeptId)}.`);
                }
                liveCouriersModule.switchDossierTab('location');
                return;
            }
        }

        if (newPlate && newPlate.length < 3) {
            if (typeof toast !== 'undefined' && toast.error) toast.error("La placa vehicular ingresada no tiene formato válido.");
            liveCouriersModule.switchDossierTab('vehicle');
            return;
        }

        const newDeptName = (geo && newDeptId) ? geo.getDepartmentName(newDeptId) : newDeptId;
        const newMuniName = (geo && newDeptId && newMuniId) ? geo.getMunicipalityName(newDeptId, newMuniId) : newMuniId;

        // 3. Comparación de estado previo (Before / After Diff)
        const d = liveCouriersModule.currentDossierData || {};
        const uPrev = d.user || {};
        const cPrev = d.courier || {};

        const prevDeptId = cPrev.departmentId || uPrev.departmentId || '';
        const prevMuniId = cPrev.operationalMunicipalityId || cPrev.municipalityId || uPrev.operationalMunicipalityId || uPrev.municipalityId || '';
        const prevFleetId = cPrev.fleetId || uPrev.fleetId || '';
        const prevFleetName = cPrev.fleetName || uPrev.fleetName || '';
        const prevZone = cPrev.zone || uPrev.zone || '';

        const prevName = uPrev.name || uPrev.nombre || cPrev.name || cPrev.nombre || '';
        const prevPhone = uPrev.phone || uPrev.telefono || cPrev.phone || cPrev.telefono || '';
        const prevNationalId = uPrev.nationalId || cPrev.nationalId || '';

        const prevPlate = cPrev.plate || cPrev.vehicle?.plate || uPrev.vehiclePlate || '';
        const prevBrand = cPrev.vehicleBrand || cPrev.vehicle?.brand || uPrev.vehicleBrand || '';
        const prevModel = cPrev.vehicleModel || cPrev.vehicle?.model || uPrev.vehicleModel || '';
        const prevYear = String(cPrev.vehicleYear || cPrev.vehicle?.year || uPrev.vehicleYear || '');
        const prevColor = cPrev.vehicleColor || cPrev.vehicle?.color || uPrev.vehicleColor || '';
        const prevVehicleType = cPrev.vehicleType || cPrev.vehicle?.type || uPrev.vehicleType || 'MOTO';

        const isLocationChanged = (newDeptId !== prevDeptId) || (newMuniId !== prevMuniId) || (newZone !== prevZone) || (newFleetName !== prevFleetName);
        const isPersonalChanged = (newName !== prevName) || (newPhone !== prevPhone) || (newNationalId !== prevNationalId);
        const isVehicleChanged = (newPlate !== prevPlate) || (newBrand !== prevBrand) || (newModel !== prevModel) || (newYear !== prevYear) || (newColor !== prevColor) || (newVehicleType !== prevVehicleType);

        if (!isLocationChanged && !isPersonalChanged && !isVehicleChanged && newBaseAddress === (cPrev.baseAddress || '')) {
            if (typeof toast !== 'undefined' && toast.info) toast.info("Sin cambios detectados en el expediente.");
            return;
        }

        try {
            liveCouriersModule.isSavingDossier = true;
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span>⏳</span> Guardando...';
            }

            const actorUid = (firebase.auth().currentUser && firebase.auth().currentUser.uid) || 'ADMIN_PORTAL';
            const serverNow = firebase.firestore.FieldValue.serverTimestamp();
            const batch = db.batch();

            const courierDocRef = db.collection('couriers').doc(courierId);
            const userDocRef = db.collection('users').doc(courierId);

            // 4. Construcción atómica de actualizaciones para /couriers/{courierId}
            const courierUpdates = {
                name: newName,
                phone: newPhone,
                nationalId: newNationalId,
                departmentId: newDeptId,
                departmentName: newDeptName,
                department: newDeptName,
                municipalityId: newMuniId,
                municipalityName: newMuniName,
                operationalMunicipalityId: newMuniId,
                cityId: newMuniId,
                city: newMuniName,
                zone: newZone,
                operationalZone: newZone,
                fleetId: newFleetId,
                fleetName: newFleetName,
                baseAddress: newBaseAddress,
                vehicleType: newVehicleType,
                vehicleBrand: newBrand,
                vehicleModel: newModel,
                plate: newPlate,
                licensePlate: newPlate,
                vehiclePlate: newPlate,
                vehicleYear: newYear ? Number(newYear) : null,
                vehicleColor: newColor,
                vehicle: {
                    type: newVehicleType,
                    brand: newBrand,
                    model: newModel,
                    plate: newPlate,
                    year: newYear ? Number(newYear) : null,
                    color: newColor
                },
                updatedAt: serverNow,
                updatedBy: actorUid
            };
            batch.set(courierDocRef, courierUpdates, { merge: true });

            // 5. Construcción atómica de actualizaciones para /users/{courierId}
            const userUpdates = {
                name: newName,
                nombre: newName,
                phone: newPhone,
                telefono: newPhone,
                nationalId: newNationalId,
                departmentId: newDeptId,
                department: newDeptName,
                municipalityId: newMuniId,
                municipalityName: newMuniName,
                operationalMunicipalityId: newMuniId,
                cityId: newMuniId,
                city: newMuniName,
                zone: newZone,
                operationalZone: newZone,
                fleetId: newFleetId,
                fleetName: newFleetName,
                vehicleType: newVehicleType,
                vehicleBrand: newBrand,
                vehicleModel: newModel,
                vehiclePlate: newPlate,
                placa: newPlate,
                vehicleYear: newYear ? Number(newYear) : null,
                year: newYear ? Number(newYear) : null,
                vehicleColor: newColor,
                color: newColor,
                updatedAt: serverNow,
                updatedBy: actorUid
            };
            batch.set(userDocRef, userUpdates, { merge: true });

            // 6. Auditoría Forense Canónica
            if (isLocationChanged) {
                const auditLocRef = db.collection('audit_events').doc();
                batch.set(auditLocRef, {
                    event: 'COURIER_OPERATIONAL_LOCATION_CHANGED',
                    action: 'COURIER_OPERATIONAL_LOCATION_CHANGED',
                    domain: 'COURIER_FLEET',
                    targetUid: courierId,
                    targetName: newName,
                    changedBy: actorUid,
                    reason: transferReason || 'Traslado o reasignación operativa de flota/municipio',
                    previous: {
                        departmentId: prevDeptId,
                        municipalityId: prevMuniId,
                        fleetId: prevFleetId,
                        fleetName: prevFleetName,
                        zone: prevZone
                    },
                    new: {
                        departmentId: newDeptId,
                        departmentName: newDeptName,
                        municipalityId: newMuniId,
                        municipalityName: newMuniName,
                        fleetId: newFleetId,
                        fleetName: newFleetName,
                        zone: newZone
                    },
                    timestamp: serverNow
                });
            }

            if (isPersonalChanged || isVehicleChanged) {
                const auditProfRef = db.collection('audit_events').doc();
                batch.set(auditProfRef, {
                    event: 'COURIER_PROFILE_UPDATED',
                    action: 'COURIER_PROFILE_UPDATED',
                    domain: 'COURIER_PROFILE',
                    targetUid: courierId,
                    targetName: newName,
                    changedBy: actorUid,
                    reason: transferReason || 'Actualización administrativa de datos del expediente',
                    changes: {
                        personal: isPersonalChanged ? { before: { name: prevName, phone: prevPhone, nationalId: prevNationalId }, after: { name: newName, phone: newPhone, nationalId: newNationalId } } : null,
                        vehicle: isVehicleChanged ? { before: { plate: prevPlate, brand: prevBrand, model: prevModel }, after: { plate: newPlate, brand: newBrand, model: newModel } } : null
                    },
                    timestamp: serverNow
                });
            }

            // 7. Ejecución del commit atómico
            await batch.commit();
            console.log(`[LIVE_COURIERS] Expediente guardado exitosamente para courierId=${courierId}`);

            // 8. Actualización en caliente de la caché local para respuesta UI instantánea
            const target = liveCouriersModule.couriersCache.find(c => c.id === courierId || c.uid === courierId);
            if (target) {
                target.name = newName;
                target.nombre = newName;
                target.phone = newPhone;
                target.telefono = newPhone;
                target.nationalId = newNationalId;
                target.departmentId = newDeptId;
                target.departmentName = newDeptName;
                target.department = newDeptName;
                target.municipalityId = newMuniId;
                target.municipalityName = newMuniName;
                target.operationalMunicipalityId = newMuniId;
                target.cityId = newMuniId;
                target.city = newMuniName;
                target.zone = newZone;
                target.fleetId = newFleetId;
                target.fleetName = newFleetName;
                target.vehicleType = newVehicleType;
                target.vehicleBrand = newBrand;
                target.vehicleModel = newModel;
                target.plate = newPlate;
                target.licensePlate = newPlate;
                target.vehiclePlate = newPlate;
                target.vehicleYear = newYear ? Number(newYear) : null;
                target.vehicleColor = newColor;
                liveCouriersModule.renderGrid();
            }

            if (typeof toast !== 'undefined' && toast.success) {
                toast.success(`Expediente de ${newName} guardado y sincronizado correctamente.`);
            }

            if (typeof drawer !== 'undefined' && drawer.close) {
                drawer.close('drawer-courier-dossier');
            }
        } catch (err) {
            console.error("[LIVE_COURIERS] Error al guardar expediente:", err);
            if (typeof toast !== 'undefined' && toast.error) {
                toast.error("Error al guardar expediente: " + (err.message || String(err)));
            }
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnHtml;
            }
        } finally {
            liveCouriersModule.isSavingDossier = false;
        }
    },

    // ─── 10f. EDICIÓN AISLADA DE LÍMITE DE EFECTIVO (OVERRIDE INDIVIDUAL) ─────
    toggleCashLimitEditor: (show) => {
        const editor = document.getElementById('cd-cash-limit-editor');
        if (!editor) return;
        if (show) {
            editor.classList.remove('hidden');
            const input = document.getElementById('cd-input-cash-limit');
            if (input) input.focus();
        } else {
            editor.classList.add('hidden');
        }
    },

    saveCashLimit: async (courierId) => {
        if (!courierId) return;
        const inputLimit = document.getElementById('cd-input-cash-limit');
        const inputReason = document.getElementById('cd-input-cash-limit-reason');
        const feedback = document.getElementById('cd-cash-limit-feedback');
        const btnSave = document.getElementById('cd-btn-save-cash-limit');
        const btnReset = document.getElementById('cd-btn-reset-cash-limit');

        if (!inputLimit) return;
        const newLimitNio = parseFloat(inputLimit.value);
        if (isNaN(newLimitNio) || newLimitNio < 0 || newLimitNio > 100000) {
            if (feedback) {
                feedback.className = 'text-[11px] p-2 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/50';
                feedback.textContent = 'Ingrese un monto válido de límite entre C$ 0.00 y C$ 100,000.00.';
                feedback.classList.remove('hidden');
            }
            return;
        }

        const reason = (inputReason?.value || 'Ajuste de límite de custodia individual desde Expediente').trim();

        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<span>⏳</span> Guardando...';
        }
        if (btnReset) btnReset.disabled = true;

        try {
            const adminSetLimitFn = firebase.functions().httpsCallable('adminSetCourierCashLimit');
            const result = await adminSetLimitFn({
                courierId,
                cashLimit: newLimitNio,
                reason
            });

            const resData = result.data || {};
            const updatedLimitCents = resData.newLimitCents ?? Math.round(newLimitNio * 100);
            const access = resData.accessState || {};

            // Actualización reactiva local de la caché del expediente
            if (liveCouriersModule.currentDossierData) {
                const d = liveCouriersModule.currentDossierData;
                d.balance = d.balance || {};
                d.courier = d.courier || {};
                d.balance.customCashLimitCents = updatedLimitCents;
                d.balance.cashLimitCents = updatedLimitCents;
                d.balance.effectiveCashLimitCents = updatedLimitCents;
                d.courier.customCashLimitCents = updatedLimitCents;
                d.courier.cashLimitCents = updatedLimitCents;
                if (access.canReceiveNewOrders !== undefined) d.balance.canReceiveNewOrders = access.canReceiveNewOrders;
                if (access.accessState) d.balance.financialAccessState = access.accessState;
            }

            if (typeof toast !== 'undefined' && toast.success) {
                toast.success(`Límite individual actualizado a C$ ${newLimitNio.toFixed(2)} NIO.`);
            }

            // Re-renderizar expediente preservando la pestaña de Operación & Caja
            liveCouriersModule.renderDossier(courierId);
            liveCouriersModule.switchDossierTab('telemetry');
        } catch (err) {
            console.error('[LIVE_COURIERS] Error al actualizar límite de efectivo:', err);
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = '<span>💾</span> Guardar Límite';
            }
            if (btnReset) btnReset.disabled = false;
            if (feedback) {
                feedback.className = 'text-[11px] p-2 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/50';
                feedback.textContent = err.message || 'Error al actualizar el límite.';
                feedback.classList.remove('hidden');
            }
            if (typeof toast !== 'undefined' && toast.error) {
                toast.error('Error al guardar límite: ' + (err.message || String(err)));
            }
        }
    },

    resetCashLimit: async (courierId) => {
        if (!courierId) return;
        const feedback = document.getElementById('cd-cash-limit-feedback');
        const btnSave = document.getElementById('cd-btn-save-cash-limit');
        const btnReset = document.getElementById('cd-btn-reset-cash-limit');
        const inputReason = document.getElementById('cd-input-cash-limit-reason');

        const reason = (inputReason?.value || 'Restauración a límite global predeterminado desde Expediente').trim();

        if (btnReset) {
            btnReset.disabled = true;
            btnReset.innerHTML = '<span>⏳</span> Restaurando...';
        }
        if (btnSave) btnSave.disabled = true;

        try {
            const adminSetLimitFn = firebase.functions().httpsCallable('adminSetCourierCashLimit');
            const result = await adminSetLimitFn({
                courierId,
                resetToGlobal: true,
                reason
            });

            const resData = result.data || {};
            const updatedLimitCents = resData.newLimitCents ?? 200000;
            const access = resData.accessState || {};

            // Actualización reactiva local eliminando el override
            if (liveCouriersModule.currentDossierData) {
                const d = liveCouriersModule.currentDossierData;
                if (d.balance) {
                    delete d.balance.customCashLimitCents;
                    delete d.balance.cashLimitCents;
                    d.balance.effectiveCashLimitCents = updatedLimitCents;
                    if (access.canReceiveNewOrders !== undefined) d.balance.canReceiveNewOrders = access.canReceiveNewOrders;
                    if (access.accessState) d.balance.financialAccessState = access.accessState;
                }
                if (d.courier) {
                    delete d.courier.customCashLimitCents;
                    delete d.courier.cashLimitCents;
                }
            }

            if (typeof toast !== 'undefined' && toast.success) {
                toast.success('Límite individual eliminado. Restaurado al límite general (C$ 2,000.00 NIO).');
            }

            // Re-renderizar expediente preservando la pestaña de Operación & Caja
            liveCouriersModule.renderDossier(courierId);
            liveCouriersModule.switchDossierTab('telemetry');
        } catch (err) {
            console.error('[LIVE_COURIERS] Error al restaurar límite global:', err);
            if (btnReset) {
                btnReset.disabled = false;
                btnReset.innerHTML = '<span>🔄</span> Restaurar General';
            }
            if (btnSave) btnSave.disabled = false;
            if (feedback) {
                feedback.className = 'text-[11px] p-2 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/50';
                feedback.textContent = err.message || 'Error al restaurar límite.';
                feedback.classList.remove('hidden');
            }
            if (typeof toast !== 'undefined' && toast.error) {
                toast.error('Error al restaurar límite: ' + (err.message || String(err)));
            }
        }
    }
};

window.liveCouriersModule = liveCouriersModule;

