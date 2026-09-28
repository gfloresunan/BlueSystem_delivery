// Enterprise Security & Policy Engine — BlueSystem Enterprise v2.2
// Capa de Servicios de Seguridad Avanzada, Evaluador ABAC+RBAC, Risk Engine y Policy Simulator

const securityPolicyEngine = {

    // ─── 1. POLICY ENGINE (ABAC + RBAC EVALUATOR WITH CORRELATION ID) ──────────

    // Genera un Correlation ID único para trazabilidad E2E
    generateCorrelationId: () => {
        return 'corr_' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    },

    // Evalúa si un rol puede ejecutar una acción bajo condiciones contextuales ABAC
    evaluateABACPolicy: (role, action, businessId = null, hour = null, deviceTrust = 'HIGH', sessionValid = true) => {
        const canonicalRole = eiamAdapter.toEiamRole(role);
        const roleInfo = eiamAdapter.roles[canonicalRole] || { level: 1 };
        const correlationId = securityPolicyEngine.generateCorrelationId();

        // 1. Verificación básica de sesión
        if (!sessionValid) {
            return { allowed: false, reason: "Sesión remota revocada o inválida.", inheritancePath: "Session Engine", correlationId };
        }

        // 2. Verificación de Nivel RBAC Plataforma
        if (roleInfo.level >= 9) { // SUPER_ADMIN & ADMIN
            return { allowed: true, reason: "Acceso concedido por privilegio Super Admin / Admin Plataforma.", inheritancePath: "Plataforma ➔ Super Admin", correlationId };
        }

        // 3. Verificación de horario operativo (Regla ABAC)
        const currentHour = hour !== null ? hour : new Date().getHours();
        if (roleInfo.level <= 4 && (currentHour < 6 || currentHour >= 23)) {
            return { allowed: false, reason: "Denegado por política ABAC de horario (Solo permitido de 06:00 a 23:00).", inheritancePath: "Policy Engine ➔ Time Restriction", correlationId };
        }

        // 4. Verificación de confianza del dispositivo (Regla ABAC)
        if (deviceTrust === 'LOW' && action.includes('FINANCE')) {
            return { allowed: false, reason: "Denegado por política ABAC de riesgo: Acción financiera no permitida en dispositivo no confiable.", inheritancePath: "Device Trust Engine", correlationId };
        }

        // 5. Matriz de Permisos RBAC por Módulo
        const allowedRolesByAction = {
            'CREATE_ORDER': ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER', 'SUPERVISOR', 'CASHIER', 'CLIENT'],
            'CONFIRM_ORDER': ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER', 'SUPERVISOR', 'COOK', 'CASHIER'],
            'CANCEL_ORDER': ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER', 'SUPERVISOR'],
            'VIEW_FINANCE': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'OWNER', 'MANAGER'],
            'EXPORT_FINANCE': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'OWNER'],
            'MANAGE_STAFF': ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'],
            'MODIFY_PRODUCT': ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER'],
            'MODIFY_PRICE': ['SUPER_ADMIN', 'ADMIN', 'OWNER']
        };

        const allowedRoles = allowedRolesByAction[action] || ['SUPER_ADMIN', 'ADMIN'];
        const isAllowed = allowedRoles.includes(canonicalRole);

        if (isAllowed) {
            return {
                allowed: true,
                reason: `Permiso concedido para ${canonicalRole} en ${action}.`,
                inheritancePath: `Empresa ➔ Comercio ➔ Sucursal ➔ ${canonicalRole}`,
                correlationId
            };
        } else {
            return {
                allowed: false,
                reason: `El rol ${canonicalRole} no posee privilegios para ${action}.`,
                inheritancePath: `RBAC Matrix ➔ ${action}`,
                correlationId
            };
        }
    },

    // ─── 2. RISK ENGINE (0 A 100 RISK SCORE WITH AUTOMATED MITIGATION) ──────

    calculateRiskScore: (uid, deviceData = {}, sessionData = {}, auditEvents = []) => {
        let score = 0;
        const factors = [];

        // Factor 1: Dispositivo no registrado o sin FCM validado
        if (!deviceData.fcmToken || deviceData.trusted === false) {
            score += 25;
            factors.push({ label: "Dispositivo no confiable / Token Antiguo", weight: +25 });
        }

        // Factor 2: Detección de Root / Emulador / Anomalía
        if (deviceData.isRooted || deviceData.isEmulator) {
            score += 40;
            factors.push({ label: "Detección de Root o Emulador en APK", weight: +40 });
        }

        // Factor 3: Conexión desde IP inusual o VPN
        if (sessionData.isVpn || sessionData.ipChanged) {
            score += 20;
            factors.push({ label: "Conexión desde IP inusual o proxy VPN", weight: +20 });
        }

        // Factor 4: Intentos de elevación de permisos o cambios de rol
        const roleChanges = auditEvents.filter(e => e.eventType === 'ROLE_CHANGED' || e.eventType === 'CLAIMS_SYNCED');
        if (roleChanges.length > 3) {
            score += 15;
            factors.push({ label: "Múltiples cambios de rol / claims recientes", weight: +15 });
        }

        score = Math.min(100, score);
        let level = 'LOW'; // LOW | MODERATE | CRITICAL
        let colorClass = 'text-emerald-400 border-emerald-800/40 bg-emerald-950/60';

        if (score >= 60) {
            level = 'CRITICAL';
            colorClass = 'text-rose-400 border-rose-800/40 bg-rose-950/60';
        } else if (score >= 25) {
            level = 'MODERATE';
            colorClass = 'text-amber-400 border-amber-800/40 bg-amber-950/60';
        }

        // RESPUESTA AUTOMÁTICA DEL RISK ENGINE (SCORE > 80)
        if (score >= 80 && uid) {
            securityPolicyEngine.triggerAutomatedRiskResponse(uid, score, factors);
        }

        return { score, level, colorClass, factors };
    },

    // Mitigación Automática de Riesgo para Score > 80
    triggerAutomatedRiskResponse: async (uid, score, factors) => {
        try {
            console.warn(`[RISK_ENGINE_ALERT] Risk Score crítico (${score}/100) para UID: ${uid}. Ejecutando auto-revocación.`);
            const correlationId = securityPolicyEngine.generateCorrelationId();

            if (typeof identityService !== 'undefined') {
                await identityService.setIdentityStatus(uid, false);
                await identityService.logAuditEvent(uid, 'AUTOMATED_RISK_BLOCK', `Cuenta bloqueada automáticamente por Risk Score elevado (${score}/100). CorrelationId: ${correlationId}`);
            }
        } catch (e) {
            console.error("[RISK_ENGINE_ERROR] Error en mitigación automática:", e);
        }
    },

    // ─── 3. POLICY SIMULATOR ──────────────────────────────────────────────────

    simulatePolicy: (role, action, hourStr = "12:00", deviceTrust = "HIGH") => {
        const hour = parseInt(hourStr.split(':')[0]) || 12;
        return securityPolicyEngine.evaluateABACPolicy(role, action, null, hour, deviceTrust, true);
    },

    // ─── 4. COMPARADOR VISUAL DE ROLES ────────────────────────────────────────

    compareRoles: (roleA, roleB, roleC = null) => {
        const actions = [
            { id: 'CREATE_ORDER', label: 'Crear Pedidos' },
            { id: 'CONFIRM_ORDER', label: 'Confirmar / Preparar Pedido' },
            { id: 'CANCEL_ORDER', label: 'Anular / Cancelar Pedido' },
            { id: 'VIEW_FINANCE', label: 'Ver Módulo de Finanzas' },
            { id: 'EXPORT_FINANCE', label: 'Exportar Reportes Financieros' },
            { id: 'MANAGE_STAFF', label: 'Gestionar Personal / Empleados' },
            { id: 'MODIFY_PRODUCT', label: 'Modificar Productos Catálogo' },
            { id: 'MODIFY_PRICE', label: 'Modificar Precios de Lista' }
        ];

        return actions.map(act => {
            const resA = securityPolicyEngine.evaluateABACPolicy(roleA, act.id);
            const resB = securityPolicyEngine.evaluateABACPolicy(roleB, act.id);
            const resC = roleC ? securityPolicyEngine.evaluateABACPolicy(roleC, act.id) : null;

            return {
                actionId: act.id,
                actionLabel: act.label,
                roleAAllowed: resA.allowed,
                roleBAllowed: resB.allowed,
                roleCAllowed: resC ? resC.allowed : null
            };
        });
    },

    // ─── 5. CLAIMS VALIDATOR (FIRESTORE VS AUTH JWT) ──────────────────────────

    validateUserClaims: (userDoc) => {
        const firestoreRole = eiamAdapter.toEiamRole(userDoc.eiamRole || userDoc.role || userDoc.rol);
        const legacyRole = userDoc.role || userDoc.rol || 'customer';
        const expectedClaim = LegacyRoleAdapter.toLegacyString ? LegacyRoleAdapter.toLegacyString(firestoreRole) : legacyRole;

        const isMatch = (legacyRole.toLowerCase() === expectedClaim.toLowerCase());

        return {
            uid: userDoc.uid,
            email: userDoc.email,
            firestoreRole,
            legacyRole,
            expectedClaim,
            isMatch,
            statusBadge: isMatch
                ? `<span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">🟢 CLAIMS_SYNCED</span>`
                : `<span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-rose-950 text-rose-400 border border-rose-800/40 animate-pulse">⚠️ CLAIM_MISMATCH</span>`
        };
    }
};

window.securityPolicyEngine = securityPolicyEngine;
