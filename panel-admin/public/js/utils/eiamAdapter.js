// Adaptador cliente JavaScript para EIAM v2.2 (BlueSystem Delivery Enterprise)
// Provee mapeo bidireccional entre esquemas legacy y el modelo canónico de Gobernanza

const eiamAdapter = {
    // Definición de Roles EIAM y Jerarquía
    roles: {
        SUPER_ADMIN: { level: 10, label: 'Super Administrador', category: 'platform' },
        ADMIN:       { level: 9,  label: 'Administrador Plataforma', category: 'platform' },
        AUDITOR:     { level: 8,  label: 'Auditor de Seguridad', category: 'platform' },
        SUPPORT:     { level: 7,  label: 'Soporte Técnico', category: 'platform' },
        OWNER:       { level: 6,  label: 'Propietario de Empresa', category: 'business' },
        MANAGER:     { level: 5,  label: 'Gerente General', category: 'business' },
        SUPERVISOR:  { level: 4,  label: 'Supervisor de Operaciones', category: 'business' },
        CASHIER:     { level: 3,  label: 'Cajero / Punto de Venta', category: 'business' },
        COOK:        { level: 3,  label: 'Cocinero / Personal Cocina', category: 'business' },
        DRIVER:      { level: 2,  label: 'Motorizado / Repartidor', category: 'driver' },
        CLIENT:      { level: 1,  label: 'Cliente Final', category: 'customer' },
        GUEST:       { level: 0,  label: 'Invitado / Anónimo', category: 'public' }
    },

    // Traduce cualquier string de rol legacy a EiamRole enum key
    toEiamRole: (rawRole) => {
        if (!rawRole) return 'GUEST';
        const str = String(rawRole).toLowerCase().trim();
        switch (str) {
            case 'super_admin':
            case 'superadmin':
                return 'SUPER_ADMIN';
            case 'admin':
            case 'administrator':
                return 'ADMIN';
            case 'auditor':
                return 'AUDITOR';
            case 'support':
            case 'soporte':
                return 'SUPPORT';
            case 'owner':
            case 'business':
            case 'comercio':
            case 'merchant':
            case 'empresa':
                return 'OWNER';
            case 'manager':
            case 'gerente':
                return 'MANAGER';
            case 'supervisor':
                return 'SUPERVISOR';
            case 'cashier':
            case 'cajero':
                return 'CASHIER';
            case 'cook':
            case 'cocinero':
            case 'kitchen':
                return 'COOK';
            case 'driver':
            case 'motorizado':
            case 'courier':
            case 'repartidor':
                return 'DRIVER';
            case 'client':
            case 'customer':
            case 'cliente':
                return 'CLIENT';
            default:
                return 'CLIENT';
        }
    },

    // Obtiene el label amigable para la interfaz de un rol EIAM
    getRoleLabel: (rawRole) => {
        const canonical = eiamAdapter.toEiamRole(rawRole);
        return eiamAdapter.roles[canonical] ? eiamAdapter.roles[canonical].label : 'Cliente';
    },

    // Genera la insignia badge HTML formateada según nivel de rol
    getRoleBadgeHtml: (rawRole) => {
        const canonical = eiamAdapter.toEiamRole(rawRole);
        const info = eiamAdapter.roles[canonical] || { level: 1, label: 'Cliente' };
        
        let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';
        if (info.level >= 9) {
            colorClass = 'bg-purple-950/60 text-purple-400 border-purple-800/60';
        } else if (info.level >= 7) {
            colorClass = 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60';
        } else if (info.level >= 5) {
            colorClass = 'bg-amber-950/60 text-amber-400 border-amber-800/60';
        } else if (info.level >= 3) {
            colorClass = 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60';
        } else if (info.level === 2) {
            colorClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
        }

        return `<span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${colorClass}">${info.label} (L${info.level})</span>`;
    },

    // Sintetiza un objeto Empresa dinámico si el registro en /businesses aún no existe de forma explícita
    synthesizeBusinessFromUser: (userDoc) => {
        const uid = userDoc.uid || userDoc.id;
        return {
            businessId: userDoc.businessId || uid,
            nombre: userDoc.comercioNombre || userDoc.nombre || 'Comercio Sin Nombre',
            email: userDoc.email || '',
            ownerUid: uid,
            telefono: userDoc.telefono || 'N/A',
            active: userDoc.isActive !== false,
            createdAt: userDoc.fechaRegistro || Date.now(),
            isVirtual: !userDoc.businessId
        };
    },

    // Traduce un rol EIAM canónico a string de rol legacy (retrocompatibilidad)
    toLegacyString: (rawRole) => {
        if (!rawRole) return 'customer';
        const canonical = eiamAdapter.toEiamRole(rawRole);
        switch (canonical) {
            case 'SUPER_ADMIN':
            case 'ADMIN':
            case 'AUDITOR':
            case 'SUPPORT':
                return 'admin';
            case 'OWNER':
            case 'MANAGER':
            case 'SUPERVISOR':
            case 'CASHIER':
            case 'COOK':
                return 'business';
            case 'DRIVER':
                return 'driver';
            case 'CLIENT':
            case 'GUEST':
            default:
                return 'customer';
        }
    }
};

window.eiamAdapter = eiamAdapter;
window.LegacyRoleAdapter = eiamAdapter;

