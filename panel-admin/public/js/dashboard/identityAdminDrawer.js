// identityAdminDrawer.js — BlueSystem Enterprise EIAM-ADMIN v1.0
// Identity Administration Center — Drawer Lateral Unificado
//
// Uso:
//   identityAdminDrawer.open(uid)
//
// Reutilizable por: users.js, governanceCenter.js
// Servicios consumidos: identityService, functionsService, governanceService
// SEGURIDAD: Jamás almacena contraseñas. Toda operación crítica pasa por Cloud Function + Admin SDK.
// AUDITORÍA: Toda operación genera un evento en /audit_events con before/after.

const identityAdminDrawer = {

    // UID actualmente en edición
    _currentUid: null,
    // Datos 360° cargados
    _identity360: null,
    // Listas para selectores
    _businesses: [],
    _branches: [],
    // Flags de concurrencia e invalidación de ciclo de vida
    _isSaving: false,
    _isInvalidated: false,

    // ─── INVALIDACIÓN DE CONTEXTO POR CICLO DE VIDA (LIFECYCLE INVALIDATION) ────
    invalidateContext: (businessId, reason = 'BUSINESS_DELETED') => {
        const currentData = identityAdminDrawer._identity360;
        const currentUid = identityAdminDrawer._currentUid;
        const currentBizId = currentData && currentData.user ? currentData.user.businessId : null;

        const isAffected = !businessId || currentUid === businessId || currentBizId === businessId;

        if (isAffected) {
            identityAdminDrawer._isInvalidated = true;
            identityAdminDrawer._identity360 = null;
            identityAdminDrawer._currentUid = null;
            identityAdminDrawer._isSaving = false;

            console.log(`[IDENTITY_INVALIDATED] Contexto de drawer invalidado para businessId=${businessId || 'GLOBAL'} (reason=${reason})`);

            if (typeof drawer !== 'undefined' && drawer.close) {
                drawer.close('drawer-identity-admin');
            }

            if (typeof toast !== 'undefined' && toast.show) {
                toast.show('Esta identidad ya no está disponible porque el comercio fue eliminado o desaprovisionado.', 'warning');
            }
        }
    },

    // ─── APERTURA DEL DRAWER ────────────────────────────────────────────────────

    open: async (uid) => {
        if (!uid) return;
        identityAdminDrawer._currentUid = uid;
        identityAdminDrawer._isInvalidated = false;
        identityAdminDrawer._isSaving = false;

        // Mostrar drawer con estado de carga
        const loadingHtml = `
            <div class="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-xs font-mono text-indigo-400 animate-pulse font-bold">CARGANDO IDENTITY 360°...</p>
                <p class="text-[10px] text-slate-500 font-mono">${uid}</p>
            </div>
        `;

        if (typeof drawer !== 'undefined') {
            drawer.open('drawer-identity-admin', '🔐 Administración de Identidad', loadingHtml);
        }

        try {
            // Cargar datos paralelos: identity 360° + listas accesorias para selectores con degradación resiliente
            const [identity360, businesses, branches] = await Promise.all([
                identityService.getIdentity360(uid),
                (typeof governanceService !== 'undefined' && governanceService.getBusinesses)
                    ? governanceService.getBusinesses('all').catch(() => [])
                    : Promise.resolve([]),
                (typeof governanceService !== 'undefined' && governanceService.getBranches)
                    ? governanceService.getBranches().catch(() => [])
                    : Promise.resolve([])
            ]);

            if (identityAdminDrawer._isInvalidated) {
                console.warn(`[IDENTITY_LIFECYCLE] Drawer open abortado: contexto invalidado durante la carga para ${uid}`);
                return;
            }

            identityAdminDrawer._identity360 = identity360;
            identityAdminDrawer._businesses = businesses || [];
            identityAdminDrawer._branches = branches || [];

            if (!identity360 || !identity360.user) {
                identityAdminDrawer._showError('No se pudo obtener la identidad. Verifique el UID.');
                return;
            }

            identityAdminDrawer._renderDrawer(identity360);
        } catch (e) {
            console.error('[IDENTITY_ADMIN_DRAWER] Error al cargar identity 360°:', e);
            identityAdminDrawer._showError('Error al cargar la identidad: ' + e.message);
        }
    },

    _showError: (msg) => {
        const html = `
            <div class="flex flex-col items-center justify-center min-h-[300px] space-y-4 p-6 font-sans">
                <span class="text-4xl">⛔</span>
                <p class="text-sm font-bold text-rose-400">Error de Carga de Identidad</p>
                <p class="text-xs text-slate-400 text-center">${msg}</p>
                <button onclick="drawer.close('drawer-identity-admin')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">Cerrar</button>
            </div>
        `;
        const el = document.getElementById('drawer-identity-admin-content');
        if (el) {
            el.innerHTML = html;
        } else if (typeof drawer !== 'undefined' && drawer.open) {
            drawer.open('drawer-identity-admin', '🔐 Error de Identidad', html);
        }
    },

    // ─── RENDERIZADO PRINCIPAL ──────────────────────────────────────────────────

    _renderDrawer: (data) => {
        const u = data.user || {};
        const uid = u.uid || identityAdminDrawer._currentUid;

        // Resolver identidad normalizada
        const normalized = (typeof identityService !== 'undefined' && identityService.normalizeIdentity)
            ? identityService.normalizeIdentity(u)
            : u;

        const name = normalized.effectiveName || u.nombre || u.name || 'Sin nombre';
        const email = normalized.effectiveEmail || u.email || 'Sin correo';
        const phone = normalized.effectivePhone || u.telefono || 'N/A';
        const canonicalRole = normalized.canonicalRole || u.eiamRole || u.role || u.rol || 'customer';
        const effectiveStatus = (typeof identityService !== 'undefined' && identityService.getEffectiveUserStatus)
            ? identityService.getEffectiveUserStatus(u)
            : (u.isActive !== false ? 'ACTIVE' : 'BLOCKED');

        // Determinar permisos del actor (RBAC)
        const actorRole = (window.AuthReadyGate && window.AuthReadyGate.claims)
            ? (window.AuthReadyGate.claims.role || 'customer')
            : 'customer';
        const isSuperAdmin = ['super_admin', 'admin', 'SUPER_ADMIN', 'ADMIN'].includes(actorRole);

        // Selectores de roles EIAM
        const eiamRoles = (typeof eiamAdapter !== 'undefined' && eiamAdapter.roles)
            ? Object.keys(eiamAdapter.roles)
            : ['customer', 'courier', 'business', 'supervisor', 'admin', 'super_admin'];

        const roleOptions = eiamRoles.map(r => {
            const label = (typeof eiamAdapter !== 'undefined' && eiamAdapter.roles && eiamAdapter.roles[r])
                ? `${r} — L${eiamAdapter.roles[r].level} — ${eiamAdapter.roles[r].label}`
                : r;
            return `<option value="${r}" ${canonicalRole === r ? 'selected' : ''}>${label}</option>`;
        }).join('');

        // Selectores de comercio y sucursal
        const bizOptions = identityAdminDrawer._businesses.map(b => {
            const bName = b.name || b.comercioNombre || b.nombre || b.businessId;
            return `<option value="${b.businessId}" ${u.businessId === b.businessId ? 'selected' : ''}>🏪 ${bName}</option>`;
        }).join('');

        const currentBusinessId = u.businessId || '';
        const filteredBranches = currentBusinessId
            ? identityAdminDrawer._branches.filter(b => b.businessId === currentBusinessId)
            : identityAdminDrawer._branches;

        const branchOptions = filteredBranches.map(b => {
            const bName = b.nombre || b.name || b.branchId;
            return `<option value="${b.branchId}" ${u.branchId === b.branchId ? 'selected' : ''}>🏢 ${bName}</option>`;
        }).join('');

        // Badge de estado
        const statusConfig = {
            ACTIVE:        { color: 'text-emerald-400 bg-emerald-950 border-emerald-800/40', icon: '🟢' },
            BLOCKED:       { color: 'text-rose-400 bg-rose-950 border-rose-800/40', icon: '🔴' },
            SUSPENDED:     { color: 'text-amber-400 bg-amber-950 border-amber-800/40', icon: '🟡' },
            PENDING:       { color: 'text-blue-400 bg-blue-950 border-blue-800/40', icon: '🔵' },
            DISABLED:      { color: 'text-slate-400 bg-slate-800 border-slate-700', icon: '⚫' },
            TERMINATED:    { color: 'text-rose-400 bg-rose-950/60 border-rose-800/60', icon: '🛑' },
            DEPROVISIONED: { color: 'text-slate-400 bg-slate-900 border-slate-700', icon: '🗑️' },
            DELETED:       { color: 'text-slate-400 bg-slate-900 border-slate-700', icon: '🗑️' },
            UNKNOWN:       { color: 'text-slate-400 bg-slate-800 border-slate-700', icon: '❔' },
        };
        const sc = statusConfig[effectiveStatus] || statusConfig.UNKNOWN;

        // Dispositivo FCM
        const device = data.devices && data.devices.length > 0 ? data.devices[0] : null;
        const deviceInfo = device
            ? `${device.platform || 'Android'} ${device.model ? '(' + device.model + ')' : ''}`
            : 'No registrado';
        const fcmStatus = device && device.fcmToken && device.fcmToken.length > 20
            ? `🟢 Token: ${device.fcmToken.substring(0, 8)}...${device.fcmToken.slice(-4)}`
            : '🔴 Sin token FCM';

        // Últimos eventos de auditoría
        const auditHtml = (data.auditEvents || []).slice(0, 5).map(ev => `
            <div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <div>
                    <p class="text-[10px] font-bold font-mono text-indigo-300">${ev.eventType || ev.action || 'EVENT'}</p>
                    <p class="text-[9px] text-slate-500 truncate max-w-[200px]">${ev.description || ''}</p>
                </div>
                <span class="text-[9px] text-slate-600 shrink-0 ml-2 font-mono">
                    ${ev.timestamp ? new Date(ev.timestamp.seconds * 1000).toLocaleDateString('es-NI') : 'N/A'}
                </span>
            </div>
        `).join('') || '<p class="text-[11px] text-slate-600 italic p-2">Sin eventos de auditoría registrados.</p>';

        // Último acceso
        const lastAccess = u.updatedAt
            ? new Date(u.updatedAt.seconds * 1000).toLocaleString('es-NI')
            : (u.lastLogin ? new Date(u.lastLogin).toLocaleString('es-NI') : 'N/A');

        // Botones de seguridad condicionales a RBAC
        const securityActionsHtml = isSuperAdmin ? `
            <div class="space-y-2">
                <button id="iad-btn-reset-password-${uid}" onclick="identityAdminDrawer._resetPassword('${uid}', '${email}')"
                    class="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition">
                    🔑 Restablecer contraseña (enviar enlace)
                </button>
                <button onclick="identityAdminDrawer._revokeSessions('${uid}')"
                    class="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 rounded-xl text-xs font-bold transition">
                    🚪 Revocar todas las sesiones
                </button>
                <div class="flex gap-2">
                    ${effectiveStatus !== 'BLOCKED' ? `
                    <button onclick="identityAdminDrawer._setStatus('${uid}', 'BLOCKED')"
                        class="flex-1 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded-xl text-xs font-bold transition">
                        🔒 Bloquear
                    </button>` : ''}
                    ${effectiveStatus !== 'ACTIVE' ? `
                    <button onclick="identityAdminDrawer._setStatus('${uid}', 'ACTIVE')"
                        class="flex-1 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-300 rounded-xl text-xs font-bold transition">
                        🟢 Activar
                    </button>` : ''}
                    ${effectiveStatus !== 'SUSPENDED' ? `
                    <button onclick="identityAdminDrawer._setStatus('${uid}', 'SUSPENDED')"
                        class="flex-1 px-3 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 rounded-xl text-xs font-bold transition">
                        ⏸ Suspender
                    </button>` : ''}
                </div>
            </div>
        ` : `
            <div class="bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                <span>🔒</span>
                <span>Las acciones de seguridad requieren privilegio Super Admin / Admin.</span>
            </div>
        `;

        // HTML completo del drawer
        const html = `
            <div class="space-y-5 text-sm font-sans" id="iad-body">

                <!-- === ENCABEZADO DE IDENTIDAD === -->
                <div class="flex items-center gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                    <div class="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-2xl shrink-0">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-white truncate">${name}</h3>
                        <p class="text-xs text-slate-400 truncate">${email}</p>
                        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span class="px-2 py-0.5 ${sc.color} text-[10px] font-bold rounded-lg border font-mono">${sc.icon} ${effectiveStatus}</span>
                            ${(typeof eiamAdapter !== 'undefined' && eiamAdapter.getRoleBadgeHtml)
                                ? eiamAdapter.getRoleBadgeHtml(canonicalRole)
                                : `<span class="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono rounded border border-slate-700">${canonicalRole}</span>`}
                        </div>
                    </div>
                </div>
                <p class="text-[10px] font-mono text-slate-600 -mt-2 px-1">UID: ${uid}</p>

                <!-- === SECCIÓN 1: DATOS PERSONALES === -->
                <div class="space-y-3">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <span class="text-base">👤</span> Datos Personales
                    </h4>
                    <div class="space-y-2">
                        <div>
                            <label class="block text-[11px] text-slate-400 font-bold mb-1">Nombre completo</label>
                            <input type="text" id="iad-nombre" value="${name !== 'Sin nombre' ? name : ''}"
                                placeholder="Nombre completo"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-sans focus:border-indigo-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-400 font-bold mb-1">Email</label>
                            <input type="text" value="${email}" disabled
                                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 text-xs font-mono cursor-not-allowed"
                                title="El email se gestiona en Firebase Authentication">
                            <p class="text-[9px] text-slate-600 mt-1">⚠ El email se modifica en Firebase Auth — no desde aquí.</p>
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-400 font-bold mb-1">Teléfono</label>
                            <input type="text" id="iad-telefono" value="${phone !== 'N/A' ? phone : ''}"
                                placeholder="+505 8888 8888"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>
                </div>

                <!-- === SECCIÓN 2: AUTORIZACIÓN & MEMBRESÍA EIAM === -->
                <div class="space-y-3 border-t border-slate-800 pt-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                        <span class="text-base">🛡️</span> Autorización & Membresía EIAM
                    </h4>

                    <!-- Tarjeta de Membresía Canónica EIAM (/membership SSOT) -->
                    <div class="bg-slate-950 p-3 rounded-xl border ${data.membership ? 'border-indigo-500/30 bg-indigo-950/10' : 'border-amber-500/30 bg-amber-950/10'} text-xs space-y-1.5">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-300 flex items-center gap-1.5">
                                <span>📜</span> Membresía EIAM (/membership):
                            </span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${data.membership && data.membership.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'} font-mono">
                                ${data.membership ? data.membership.status : 'SIN REGISTRO'}
                            </span>
                        </div>
                        ${data.membership ? `
                            <p class="text-[11px] text-slate-400 font-mono">ID: <code class="text-slate-300">${data.membership.membershipId || data.membership.id}</code></p>
                            <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>Rol: <strong class="text-indigo-300">${data.membership.role}</strong></span>
                                <span>•</span>
                                <span>Permisos: <strong class="text-cyan-300">${Array.isArray(data.membership.permissions) ? data.membership.permissions.length : 0} canónicos</strong></span>
                            </div>
                        ` : `
                            <p class="text-[11px] text-amber-400/80">Esta identidad no posee un documento de relación empresarial canónico en <code class="text-indigo-300">/membership</code>.</p>
                        `}
                    </div>

                    <div class="space-y-2">
                        <div>
                            <label class="block text-[11px] text-slate-400 font-bold mb-1">Rol EIAM</label>
                            ${isSuperAdmin ? `
                            <select id="iad-role" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                                ${roleOptions}
                            </select>` : `
                            <input type="text" value="${canonicalRole}" disabled
                                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 text-xs font-mono cursor-not-allowed">`}
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-400 font-bold mb-1">Comercio (businessId canónico)</label>
                            ${isSuperAdmin ? `
                            <select id="iad-businessId" onchange="identityAdminDrawer._onBusinessChange(this.value)"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                                <option value="">Sin comercio asignado</option>
                                ${bizOptions}
                            </select>` : `
                            <input type="text" value="${u.businessId || 'N/A'}" disabled
                                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 text-xs font-mono cursor-not-allowed">`}
                        </div>
                        <div>
                            <label class="block text-[11px] text-slate-400 font-bold mb-1">Sucursal (branchId canónico)</label>
                            ${isSuperAdmin ? `
                            <select id="iad-branchId"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none">
                                <option value="">Sin sucursal asignada</option>
                                ${branchOptions}
                            </select>` : `
                            <input type="text" value="${u.branchId || 'N/A'}" disabled
                                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 text-xs font-mono cursor-not-allowed">`}
                        </div>
                    </div>
                </div>

                <!-- === SECCIÓN 3: SEGURIDAD === -->
                <div class="space-y-3 border-t border-slate-800 pt-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center gap-2">
                        <span class="text-base">🔐</span> Seguridad
                    </h4>
                    ${securityActionsHtml}
                </div>

                <!-- === SECCIÓN 4: ACCESO === -->
                <div class="space-y-3 border-t border-slate-800 pt-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <span class="text-base">📡</span> Acceso & Dispositivos
                    </h4>
                    <div class="grid grid-cols-2 gap-2 text-[11px]">
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <p class="text-slate-500 font-bold mb-1">Último acceso</p>
                            <p class="text-slate-300 font-mono">${lastAccess}</p>
                        </div>
                        <div class="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <p class="text-slate-500 font-bold mb-1">Dispositivo</p>
                            <p class="text-slate-300">${deviceInfo}</p>
                        </div>
                        <div class="col-span-2 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                            <p class="text-slate-500 font-bold mb-1">FCM Token</p>
                            <p class="text-slate-300 font-mono text-[10px]">${fcmStatus}</p>
                        </div>
                    </div>
                </div>

                <!-- === SECCIÓN 5: AUDIT TRAIL === -->
                <div class="space-y-2 border-t border-slate-800 pt-4">
                    <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <span class="text-base">📜</span> Historial de Auditoría
                    </h4>
                    <div class="space-y-1 max-h-40 overflow-y-auto">
                        ${auditHtml}
                    </div>
                </div>

                <!-- === BOTONES DE ACCIÓN === -->
                <div class="border-t border-slate-800 pt-4 flex gap-2 justify-end sticky bottom-0 bg-slate-900 pb-1">
                    <button onclick="drawer.close('drawer-identity-admin')"
                        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">
                        Cancelar
                    </button>
                    <button onclick="identityAdminDrawer._save('${uid}')"
                        class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-2">
                        <span>💾</span> Guardar cambios
                    </button>
                </div>

            </div>
        `;

        const contentEl = document.getElementById('drawer-identity-admin-content');
        if (contentEl) {
            contentEl.innerHTML = html;
        } else if (typeof drawer !== 'undefined') {
            drawer.open('drawer-identity-admin', '🔐 Administración de Identidad', html);
        }
    },

    // ─── ACCIONES INDIVIDUALES (SEGURIDAD) ─────────────────────────────────────

    _onBusinessChange: (newBusinessId) => {
        // Refrescar opciones de sucursal según comercio seleccionado
        const branchSel = document.getElementById('iad-branchId');
        if (!branchSel) return;
        const filtered = newBusinessId
            ? identityAdminDrawer._branches.filter(b => b.businessId === newBusinessId)
            : identityAdminDrawer._branches;
        branchSel.innerHTML = '<option value="">Sin sucursal asignada</option>' +
            filtered.map(b => {
                const bName = b.nombre || b.name || b.branchId;
                return `<option value="${b.branchId}">🏢 ${bName}</option>`;
            }).join('');
    },

    _isResettingPassword: false,

    _resetPassword: async (uid, email) => {
        if (identityAdminDrawer._isResettingPassword) return;
        if (!confirm(`¿Deseas generar un enlace seguro de restablecimiento de contraseña para:\n${email}?\n\nEl enlace se generará vía Firebase Admin SDK y se enviará por correo si el servicio está activo. NO se modifica ninguna contraseña ahora.`)) return;

        const btn = document.getElementById(`iad-btn-reset-password-${uid}`);
        const originalBtnHtml = btn ? btn.innerHTML : null;

        try {
            identityAdminDrawer._isResettingPassword = true;
            if (btn) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                btn.innerHTML = '⏳ Procesando enlace...';
            }
            if (typeof toast !== 'undefined') toast.show('Generando enlace de recuperación...', 'info');

            const res = await functionsService.resetPasswordLink(uid, email, 'Restablecimiento iniciado por administrador');
            if (res && res.success && res.link) {
                if (typeof toast !== 'undefined') {
                    toast.show('✅ Enlace de recuperación generado correctamente.', 'success');
                }

                // Mostrar modal con el enlace
                const emailNotice = res.emailSent
                    ? '<p class="text-[11px] text-emerald-400 flex items-center gap-1">✉ Correo de notificación enviado al usuario.</p>'
                    : '<p class="text-[11px] text-slate-400">Puedes copiar el enlace a continuación para compartirlo manualmente.</p>';

                const linkHtml = `
                    <div class="space-y-4 font-sans">
                        <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">🔑 Enlace de Restablecimiento Generado</h3>
                        ${emailNotice}
                        <input type="text" readonly value="${res.link}"
                            onclick="this.select()"
                            class="w-full bg-slate-950 border border-indigo-800/40 rounded-xl p-2.5 text-xs font-mono text-indigo-400 focus:outline-none cursor-pointer select-all">
                        <p class="text-[10px] text-amber-400 flex items-center gap-1">
                            ⚠ Este enlace es de un solo uso y expira en 1 hora. La contraseña actual NO cambiará hasta que el usuario complete el formulario.
                        </p>
                        <div class="flex justify-between items-center pt-2 border-t border-slate-800">
                            <button onclick="navigator.clipboard.writeText('${res.link}').then(() => { if(typeof toast!=='undefined') toast.show('Enlace copiado al portapapeles', 'info'); })"
                                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition">
                                📋 Copiar Enlace
                            </button>
                            <button onclick="modal.close('modal-reset-link')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">Aceptar</button>
                        </div>
                    </div>
                `;
                if (typeof modal !== 'undefined') modal.open('modal-reset-link', linkHtml);
            } else {
                throw new Error('No se recibió enlace de recuperación del servidor');
            }
        } catch (e) {
            console.error('[IDENTITY_ADMIN_DRAWER] Error al generar enlace de recuperación:', e);
            if (typeof toast !== 'undefined') toast.show('Error: ' + e.message, 'error');
            else alert('Error al generar enlace: ' + e.message);
        } finally {
            identityAdminDrawer._isResettingPassword = false;
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                if (originalBtnHtml) btn.innerHTML = originalBtnHtml;
            }
        }
    },

    _revokeSessions: async (uid) => {
        if (!confirm('¿Revocar TODAS las sesiones activas de este usuario?\n\nEl usuario deberá iniciar sesión nuevamente en todos sus dispositivos.')) return;
        try {
            if (typeof toast !== 'undefined') toast.show('Revocando sesiones...', 'info');
            await functionsService.revokeSessions(uid, 'Revocación administrativa de sesiones');
            if (typeof toast !== 'undefined') toast.show('✅ Sesiones revocadas. El usuario deberá iniciar sesión nuevamente.', 'success');
            // Recargar el drawer para reflejar cambios
            await identityAdminDrawer.open(uid);
        } catch (e) {
            console.error('[IDENTITY_ADMIN_DRAWER] Error al revocar sesiones:', e);
            if (typeof toast !== 'undefined') toast.show('Error: ' + e.message, 'error');
        }
    },

    _setStatus: async (uid, newStatus) => {
        const statusLabels = { ACTIVE: 'ACTIVAR', BLOCKED: 'BLOQUEAR', SUSPENDED: 'SUSPENDER', DISABLED: 'DESHABILITAR' };
        if (!confirm(`¿Confirmas ${statusLabels[newStatus] || newStatus} esta identidad?`)) return;
        try {
            const isActive = newStatus === 'ACTIVE';
            await identityService.setIdentityStatus(uid, isActive);
            // Actualizar campo status canónico adicional
            if (typeof db !== 'undefined') {
                await db.collection('users').doc(uid).set({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            if (typeof toast !== 'undefined') toast.show(`Estado cambiado a ${newStatus}`, 'success');
            await identityAdminDrawer.open(uid);
        } catch (e) {
            console.error('[IDENTITY_ADMIN_DRAWER] Error al cambiar estado:', e);
            if (typeof toast !== 'undefined') toast.show('Error: ' + e.message, 'error');
        }
    },

    // ─── GUARDAR CAMBIOS ────────────────────────────────────────────────────────

    _save: async (uid) => {
        if (!uid) return;

        // Guardia contra doble click / concurrencia
        if (identityAdminDrawer._isSaving) {
            console.warn('[IDENTITY_SAVE] Operación de guardado en curso, descartando ejecución concurrente.');
            return;
        }

        // Guardia contra contexto invalidado por ciclo de vida
        if (identityAdminDrawer._isInvalidated) {
            console.warn('[IDENTITY_SAVE] [STALE_WRITE_BLOCKED] Intento de guardado en contexto invalidado.');
            if (typeof toast !== 'undefined') {
                toast.show('Esta identidad ya no está disponible porque el comercio fue eliminado o desaprovisionado.', 'error');
            }
            if (typeof drawer !== 'undefined' && drawer.close) {
                drawer.close('drawer-identity-admin');
            }
            return;
        }

        const data = identityAdminDrawer._identity360;
        const u = data ? data.user : {};

        if (!u || u.isDeleted || u.status === 'DELETED' || u.lifecycleStatus === 'DEPROVISIONED') {
            console.warn('[IDENTITY_SAVE] [STALE_WRITE_BLOCKED] Intento de guardado en identidad eliminada o inexistente.');
            if (typeof toast !== 'undefined') {
                toast.show('Esta identidad ha sido eliminada o desaprovisionada.', 'error');
            }
            if (typeof drawer !== 'undefined' && drawer.close) {
                drawer.close('drawer-identity-admin');
            }
            return;
        }

        // Leer valores del formulario
        const nombreEl = document.getElementById('iad-nombre');
        const telefonoEl = document.getElementById('iad-telefono');
        const roleEl = document.getElementById('iad-role');
        const bizEl = document.getElementById('iad-businessId');
        const branchEl = document.getElementById('iad-branchId');

        const newNombre = nombreEl ? nombreEl.value.trim() : null;
        const newTelefono = telefonoEl ? telefonoEl.value.trim() : null;
        const newRole = roleEl ? roleEl.value : null;
        const newBusinessId = bizEl ? bizEl.value : null;
        const newBranchId = branchEl ? branchEl.value : null;

        const changes = [];

        try {
            identityAdminDrawer._isSaving = true;

            // 1. Actualizar perfil (nombre, teléfono) si cambiaron
            const oldNombre = u.nombre || u.name || '';
            const oldTelefono = u.telefono || u.phone || '';
            if ((newNombre !== null && newNombre !== oldNombre) ||
                (newTelefono !== null && newTelefono !== oldTelefono)) {
                await functionsService.updateProfile(uid, newNombre, newTelefono, 'Actualización administrativa de perfil');
                changes.push('perfil');
            }

            // 2. Actualizar rol EIAM si cambió
            const oldRole = u.eiamRole || u.role || u.rol || 'customer';
            if (newRole && newRole !== oldRole) {
                await identityService.updateIdentityRole(uid, newRole);
                // Audit log con before/after
                await identityService.logAdminAudit({
                    action: 'USER_ROLE_UPDATED',
                    targetUid: uid,
                    before: { role: oldRole },
                    after: { role: newRole },
                    reason: 'Cambio de rol administrativo'
                });
                changes.push('rol');
            }

            // 3. Transferir comercio/sucursal si cambió
            const oldBusinessId = u.businessId || '';
            const oldBranchId = u.branchId || '';
            if ((newBusinessId !== null && newBusinessId !== oldBusinessId) ||
                (newBranchId !== null && newBranchId !== oldBranchId)) {
                await identityService.transferEmployee(uid, newBusinessId || oldBusinessId, newBranchId || oldBranchId);
                // Audit log
                await identityService.logAdminAudit({
                    action: 'USER_COMMERCE_ASSIGNED',
                    targetUid: uid,
                    before: { businessId: oldBusinessId, branchId: oldBranchId },
                    after: { businessId: newBusinessId, branchId: newBranchId },
                    reason: 'Asignación de comercio/sucursal'
                });
                changes.push('comercio');
            }

            if (changes.length === 0) {
                if (typeof toast !== 'undefined') toast.show('Sin cambios detectados.', 'info');
                return;
            }

            if (typeof toast !== 'undefined') toast.show(`✅ Guardado: ${changes.join(', ')} actualizado(s)`, 'success');
            if (typeof drawer !== 'undefined' && drawer.close) drawer.close('drawer-identity-admin');

            // Notificar al módulo padre para que recargue
            if (typeof usersModule !== 'undefined' && usersModule.loadUsers) {
                // no-op: el listener realtime lo actualizará automáticamente
            }
            if (typeof governanceCenterModule !== 'undefined' && governanceCenterModule.loadData) {
                await governanceCenterModule.loadData();
                governanceCenterModule.switchSubTab('users');
            }
        } catch (e) {
            console.error('[IDENTITY_ADMIN_DRAWER] Error al guardar cambios:', e);
            const isEiamGuard = e.message && e.message.includes('[EIAM_GUARD]');
            const displayMsg = isEiamGuard ? e.message : 'Error al guardar: ' + e.message;
            if (typeof toast !== 'undefined') toast.show(displayMsg, 'error');
            else alert(displayMsg);
        } finally {
            identityAdminDrawer._isSaving = false;
        }
    }
};

window.identityAdminDrawer = identityAdminDrawer;
