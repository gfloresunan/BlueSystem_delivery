import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  ChefHat, 
  Building2, 
  Sparkles, 
  HelpCircle, 
  X, 
  Share2, 
  BadgePercent, 
  Check
} from 'lucide-react';
import { db, functions } from '../shared/services/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../shared/context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDocs 
} from 'firebase/firestore';

export type StaffRole = 'MANAGER' | 'SUPERVISOR' | 'CASHIER' | 'COOK';
export type StaffStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface StaffMember {
  id: string;
  employeeId?: string;
  businessId: string;
  tenantId?: string | null;
  branchId?: string | null;
  branchName?: string;
  displayName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  pin: string;
  permissions?: string[];
  invitedBy?: string;
  invitedAt?: any;
  joinedAt?: any;
  suspendedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

interface BranchItem {
  id: string;
  name: string;
}

const ROLE_DEFINITIONS: Record<StaffRole, { 
  title: string; 
  description: string; 
  badgeColor: string; 
  icon: React.ElementType;
  defaultPermissions: string[];
}> = {
  MANAGER: {
    title: 'Gerente de Sucursal',
    description: 'Control operativo completo: pedidos, cocina, menú, horarios y supervisión de empleados.',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    icon: ShieldCheck,
    defaultPermissions: ['ORDERS', 'CATALOG', 'CUSTOMERS', 'PROMOTIONS', 'REPORTS', 'CONTROL_TOWER', 'STAFF_VIEW']
  },
  SUPERVISOR: {
    title: 'Supervisor de Turno',
    description: 'Monitoreo de SLAs de preparación, resolución de incidencias con motorizados y atención.',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    icon: Users,
    defaultPermissions: ['ORDERS', 'CONTROL_TOWER', 'CUSTOMERS', 'NOTIFICATIONS']
  },
  CASHIER: {
    title: 'Cajero / Mostrador',
    description: 'Confirmación de pedidos entrantes, cobros en caja, impresión de comandas y POS.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: BadgePercent,
    defaultPermissions: ['ORDERS', 'CATALOG_VIEW', 'CUSTOMERS', 'RECEIPT_PRINT']
  },
  COOK: {
    title: 'Cocinero / Pantalla KDS',
    description: 'Estación de cocina. Visualiza pedidos en cola, cambia estados a preparando/listo y avisa stock.',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: ChefHat,
    defaultPermissions: ['ORDERS_KDS', 'STOCK_REPORT', 'PREP_STATUS']
  }
};

export const StaffModule: React.FC = () => {
  const { identity } = useAuth();
  const businessId = identity?.businessId || '';
  const tenantId = identity?.orgId || null;

  // Data states
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // UI Modals states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<StaffRole>('CASHIER');
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formPin, setFormPin] = useState('');
  const [formStatus, setFormStatus] = useState<StaffStatus>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch branches from /branches
  useEffect(() => {
    if (!businessId) return;
    const fetchBranches = async () => {
      try {
        const q = query(collection(db, 'branches'), where('businessId', '==', businessId));
        const snap = await getDocs(q);
        const list: BranchItem[] = snap.docs.map(docSnap => ({
          id: docSnap.id,
          name: docSnap.data().name || docSnap.data().nombre || `Sucursal ${docSnap.id.slice(0, 5)}`
        }));
        setBranches(list);
      } catch (err) {
        console.warn('[StaffModule] Error cargando sucursales:', err);
      }
    };
    fetchBranches();
  }, [businessId]);

  // 2. Real-time listener for /employees
  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(collection(db, 'employees'), where('businessId', '==', businessId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StaffMember[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          employeeId: d.employeeId || docSnap.id,
          businessId: d.businessId || businessId,
          tenantId: d.tenantId || tenantId,
          branchId: d.branchId || null,
          branchName: d.branchName || '',
          displayName: d.displayName || d.name || d.nombre || 'Colaborador',
          email: d.email || '',
          phone: d.phone || d.telefono || '',
          role: (d.role || 'CASHIER').toUpperCase() as StaffRole,
          status: (d.status || (d.active === false ? 'SUSPENDED' : 'ACTIVE')).toUpperCase() as StaffStatus,
          pin: d.pin || d.quickPin || '1234',
          permissions: d.permissions || [],
          invitedBy: d.invitedBy || '',
          invitedAt: d.invitedAt || null,
          joinedAt: d.joinedAt || null,
          createdAt: d.createdAt || null,
          updatedAt: d.updatedAt || null
        };
      });

      // Ordenar por fecha de creación o nombre
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setStaffList(list);
      setIsLoading(false);
    }, (error) => {
      console.error('[StaffModule] Error escuchando empleados:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [businessId, tenantId]);

  // Helper: Generar PIN aleatorio de 4 dígitos
  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPin(pin);
  };

  // Helper: Abrir modal para crear
  const handleOpenCreateModal = () => {
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('CASHIER');
    setFormBranchId(branches.length > 0 ? branches[0].id : '');
    generateRandomPin();
    setFormStatus('ACTIVE');
    setIsModalOpen(true);
  };

  // Helper: Abrir modal para editar
  const handleOpenEditModal = (member: StaffMember) => {
    setEditingMember(member);
    setFormName(member.displayName);
    setFormEmail(member.email);
    setFormPhone(member.phone);
    setFormRole(member.role);
    setFormBranchId(member.branchId || '');
    setFormPin(member.pin);
    setFormStatus(member.status);
    setIsModalOpen(true);
  };

  // Helper: Toggle visibilidad de PIN en fila
  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper: Copiar texto al portapapeles
  const handleCopyText = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showFeedback('success', `¡${label} copiado al portapapeles!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper: Mostrar notificaciones de feedback
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Helper: Guardar empleado (Crear o Actualizar)
  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      showFeedback('error', 'No se ha detectado un comercio activo.');
      return;
    }

    if (!formName.trim()) {
      showFeedback('error', 'El nombre completo es obligatorio.');
      return;
    }

    if (formPin.length !== 4 || !/^\d{4}$/.test(formPin)) {
      showFeedback('error', 'El PIN debe ser exactamente de 4 dígitos numéricos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBranchObj = branches.find(b => b.id === formBranchId);
      const branchName = selectedBranchObj ? selectedBranchObj.name : 'Todas las sucursales';

      // Invocar Cloud Function oficial para creación de identidad, Auth, membership, invitación y correo
      const inviteFn = httpsCallable<any, any>(functions, 'adminInviteStaffMember');
      const res = await inviteFn({
        employeeId: editingMember ? editingMember.id : undefined,
        businessId,
        branchId: formBranchId || null,
        branchName: formBranchId ? branchName : 'Todas las sucursales',
        displayName: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formRole,
        pin: formPin.trim(),
        permissions: ROLE_DEFINITIONS[formRole].defaultPermissions,
      });

      if (editingMember) {
        showFeedback('success', `Datos de "${formName}" actualizados y sincronizados correctamente.`);
      } else {
        if (res.data?.emailSent) {
          showFeedback('success', `🟢 Colaborador "${formName}" registrado e invitación enviada por correo a ${formEmail}.`);
        } else {
          showFeedback('success', `🟡 Colaborador "${formName}" registrado. Correo: ${res.data?.emailStatus || 'Pendiente'}. Puedes reenviar la invitación en cualquier momento.`);
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('[StaffModule] Error guardando empleado:', err);
      showFeedback('error', `Error al guardar: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Alternar estado (Suspender / Reactivar)
  const handleToggleStatus = async (member: StaffMember) => {
    const newStatus: StaffStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const memberRef = doc(db, 'employees', member.id);
      await updateDoc(memberRef, {
        status: newStatus,
        suspendedAt: newStatus === 'SUSPENDED' ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      showFeedback('success', `El colaborador "${member.displayName}" ahora está ${newStatus === 'ACTIVE' ? 'ACTIVO' : 'SUSPENDIDO'}.`);
    } catch (err: any) {
      console.error('[StaffModule] Error cambiando estado:', err);
      showFeedback('error', 'No se pudo cambiar el estado del colaborador.');
    }
  };

  // Helper: Eliminar empleado
  const handleDeleteMember = async (member: StaffMember) => {
    const confirm = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${member.displayName}" del equipo? Esta acción no se puede deshacer.`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'employees', member.id));
      showFeedback('success', `Colaborador "${member.displayName}" desvinculado con éxito.`);
    } catch (err: any) {
      console.error('[StaffModule] Error eliminando empleado:', err);
      showFeedback('error', 'Error al eliminar el colaborador.');
    }
  };

  // Helper: Compartir invitación canónica
  const handleShareInvite = (member: StaffMember) => {
    const inviteMessage = `¡Hola ${member.displayName}! Has sido registrado en el equipo de ${identity?.businessId || 'nuestro comercio'} en BlueSystem Delivery.
Tu rol asignado es: ${ROLE_DEFINITIONS[member.role].title}
Tu PIN de acceso rápido en estación (POS/KDS) es: ${member.pin}

Para activar tu cuenta y configurar tu contraseña personal de acceso:
https://comercio.bluesystemdelivery.com/accept-invite?token=inv_${member.id}
Acceso al portal: https://comercio.bluesystemdelivery.com`;

    handleCopyText(inviteMessage, `invite_${member.id}`, 'Mensaje de invitación');
  };

  // Helper: Sincronizar credenciales y acceso EIAM del colaborador
  const handleSyncStaffCredentials = async (member: StaffMember) => {
    try {
      showFeedback('success', `Sincronizando credenciales de "${member.displayName}"...`);
      const inviteFn = httpsCallable<any, any>(functions, 'adminInviteStaffMember');
      await inviteFn({
        employeeId: member.id,
        businessId: member.businessId,
        branchId: member.branchId || null,
        branchName: member.branchName,
        displayName: member.displayName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        pin: member.pin,
        permissions: member.permissions,
      });
      showFeedback('success', `¡Credenciales de "${member.displayName}" sincronizadas y activadas en EIAM!`);
    } catch (err: any) {
      console.error('[StaffModule] Error sincronizando credenciales:', err);
      showFeedback('error', `Error al sincronizar: ${err.message || 'Error desconocido'}`);
    }
  };

  // Helper: Reenviar invitación formal por correo electrónico
  const handleResendInviteEmail = async (member: StaffMember) => {
    try {
      showFeedback('success', `Reenviando invitación por correo a "${member.displayName}" (${member.email})...`);
      const resendFn = httpsCallable<any, any>(functions, 'adminResendStaffInvitation');
      const res = await resendFn({
        employeeId: member.id,
        businessId: member.businessId,
      });

      if (res.data?.emailSent) {
        showFeedback('success', `🟢 ¡Invitación reenviada exitosamente por correo a ${member.email}!`);
      } else {
        showFeedback('error', `🟡 Invitación generada, pero el correo no pudo entregarse: ${res.data?.emailError || 'Pendiente'}.`);
      }
    } catch (err: any) {
      console.error('[StaffModule] Error reenviando invitación:', err);
      showFeedback('error', `Error al reenviar invitación: ${err?.message || 'Error desconocido'}`);
    }
  };

  // 3. Filtrado reactivo en memoria
  const filteredStaff = useMemo(() => {
    return staffList.filter((m) => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchName = m.displayName.toLowerCase().includes(queryLower);
        const matchEmail = m.email.toLowerCase().includes(queryLower);
        const matchPhone = m.phone.toLowerCase().includes(queryLower);
        const matchRole = ROLE_DEFINITIONS[m.role]?.title.toLowerCase().includes(queryLower);
        if (!matchName && !matchEmail && !matchPhone && !matchRole) return false;
      }

      // Filtro de rol
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;

      // Filtro de sucursal
      if (branchFilter !== 'ALL') {
        if (branchFilter === 'UNASSIGNED' && m.branchId) return false;
        if (branchFilter !== 'UNASSIGNED' && m.branchId !== branchFilter) return false;
      }

      // Filtro de estado
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

      return true;
    });
  }, [staffList, searchQuery, roleFilter, branchFilter, statusFilter]);

  // KPIs
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter(m => m.status === 'ACTIVE').length;
  const pendingStaff = staffList.filter(m => m.status === 'PENDING').length;
  const cooksCount = staffList.filter(m => m.role === 'COOK').length;
  const cashiersCount = staffList.filter(m => m.role === 'CASHIER').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* ─── Encabezado Principal ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-obsidian-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">Merchant Staff Center</h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
                  v2.2 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestión operativa de colaboradores, asignación de roles y PINs de acceso rápido para terminales POS y KDS.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPermModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Ver matriz de permisos por rol"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Matriz de Roles</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invitar / Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* ─── Feedback Toast ─── */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 border transition animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ─── Tarjetas de Métricas (KPIs) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-obsidian-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Personal</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100 font-mono">{totalStaff}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Colaboradores registrados</p>
          </div>
        </div>

        <div className="bg-obsidian-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activos en Turno</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 font-mono">{activeStaff}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Con acceso habilitado</p>
          </div>
        </div>

        <div className="bg-obsidian-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estación Cocina (KDS)</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ChefHat className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 font-mono">{cooksCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Operadores de cocina</p>
          </div>
        </div>

        <div className="bg-obsidian-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Caja & Mostrador</span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <BadgePercent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-400 font-mono">{cashiersCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">{pendingStaff > 0 ? `${pendingStaff} pendientes de unirse` : 'Cajeros operativos'}</p>
          </div>
        </div>
      </div>

      {/* ─── Barra de Búsqueda y Filtros Omnicanal ─── */}
      <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Input Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o cargo..."
            className="w-full bg-slate-950 border border-slate-700/70 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros Selectores */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Rol */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/70 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3 h-3 text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-slate-900">Todos los Roles</option>
              <option value="MANAGER" className="bg-slate-900">Gerentes</option>
              <option value="SUPERVISOR" className="bg-slate-900">Supervisores</option>
              <option value="CASHIER" className="bg-slate-900">Cajeros</option>
              <option value="COOK" className="bg-slate-900">Cocineros (KDS)</option>
            </select>
          </div>

          {/* Filtro Sucursal */}
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/70 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Building2 className="w-3 h-3 text-slate-500" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-slate-900">Todas las Sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Estado */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/70 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-slate-900">Todos los Estados</option>
              <option value="ACTIVE" className="bg-slate-900">Activos</option>
              <option value="PENDING" className="bg-slate-900">Invitación Pendiente</option>
              <option value="SUSPENDED" className="bg-slate-900">Suspendidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Directorio y Tabla de Empleados ─── */}
      <div className="bg-obsidian-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">Plantilla de Colaboradores</h2>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
              {filteredStaff.length} {filteredStaff.length === 1 ? 'miembro' : 'miembros'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Sincronización en vivo
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando directorio de personal...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-inner">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">
                {staffList.length === 0 ? 'Sin personal registrado aún' : 'No se encontraron colaboradores'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {staffList.length === 0
                  ? 'Agrega a tus cajeros, gerentes y cocineros para que accedan al KDS y gestionen pedidos con PIN rápido.'
                  : 'Ningún colaborador coincide con los filtros aplicados en la búsqueda.'}
              </p>
            </div>
            {staffList.length === 0 ? (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
              >
                <UserPlus className="w-4 h-4" /> Registrar Primer Colaborador
              </button>
            ) : (
              <button
                onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); setBranchFilter('ALL'); setStatusFilter('ALL'); }}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Colaborador</th>
                  <th className="py-3.5 px-4">Rol & Función</th>
                  <th className="py-3.5 px-4">Sucursal</th>
                  <th className="py-3.5 px-4">PIN Rápido (POS/KDS)</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStaff.map((member) => {
                  const roleDef = ROLE_DEFINITIONS[member.role] || ROLE_DEFINITIONS.CASHIER;
                  const RoleIcon = roleDef.icon;
                  const isPinVisible = !!visiblePins[member.id];

                  return (
                    <tr 
                      key={member.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Colaborador / Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm shadow-inner flex-shrink-0">
                            {member.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-100 text-sm truncate flex items-center gap-2">
                              <span>{member.displayName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {member.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span className="font-mono truncate">{member.email}</span>
                                </span>
                              )}
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span className="font-mono">{member.phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-4 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${roleDef.badgeColor}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span>{roleDef.title}</span>
                        </div>
                      </td>

                      {/* Sucursal */}
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-medium truncate max-w-[140px]">
                            {member.branchName || (member.branchId ? `Sucursal #${member.branchId.slice(0, 6)}` : 'Todas las sucursales')}
                          </span>
                        </div>
                      </td>

                      {/* PIN de Acceso Rápido */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl font-mono text-xs shadow-inner">
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span className="font-bold text-slate-200">
                            {isPinVisible ? member.pin : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(member.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                            title={isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}
                          >
                            {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyText(member.pin, `pin_${member.id}`, 'PIN')}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition"
                            title="Copiar PIN"
                          >
                            {copiedId === `pin_${member.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4">
                        {member.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Activo
                          </span>
                        )}
                        {member.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Pendiente
                          </span>
                        )}
                        {member.status === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Suspendido
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Compartir Invitación */}
                          <button
                            onClick={() => handleShareInvite(member)}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-blue-400 rounded-xl border border-slate-700 transition"
                            title="Compartir credenciales de acceso"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reenviar Invitación por Correo */}
                          <button
                            onClick={() => handleResendInviteEmail(member)}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl border border-slate-700 transition"
                            title="Reenviar invitación por correo electrónico"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Sincronizar EIAM / Acceso */}
                          <button
                            onClick={() => handleSyncStaffCredentials(member)}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-xl border border-slate-700 transition"
                            title="Sincronizar y activar acceso EIAM"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspender / Reactivar */}
                          <button
                            onClick={() => handleToggleStatus(member)}
                            className={`p-2 rounded-xl border transition ${
                              member.status === 'ACTIVE'
                                ? 'bg-slate-800/80 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border-slate-700 hover:border-rose-500/30'
                                : 'bg-slate-800/80 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border-slate-700 hover:border-emerald-500/30'
                            }`}
                            title={member.status === 'ACTIVE' ? 'Suspender acceso' : 'Reactivar acceso'}
                          >
                            {member.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(member)}
                            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
                            title="Editar datos y rol"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="p-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-500/30 transition"
                            title="Eliminar colaborador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL DE CREACIÓN / EDICIÓN ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  {editingMember ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {editingMember ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingMember ? 'Actualiza los datos, cargo o PIN del empleado.' : 'Asigna rol y PIN para acceso rápido a terminales.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitMember} className="p-6 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Roberto Castillo"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Email & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="colaborador@comercio.com"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ej. 88123456"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Selección de Rol Operativo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rol & Función en el Comercio *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ROLE_DEFINITIONS) as StaffRole[]).map((rKey) => {
                    const rData = ROLE_DEFINITIONS[rKey];
                    const RIcon = rData.icon;
                    const isSelected = formRole === rKey;

                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => setFormRole(rKey)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 text-slate-100 shadow-md ring-1 ring-blue-500/40'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <RIcon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{rData.title}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{rData.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sucursal Asignada */}
              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sucursal Asignada
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Todas las sucursales (Acceso Global)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* PIN Rápido (POS / KDS) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-200">
                      PIN de Acceso Rápido (4 Dígitos) *
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Usado para iniciar sesión en tablets de cocina y cajas registradoras sin contraseña larga.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20"
                  >
                    <RefreshCw className="w-3 h-3" /> Generar
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400 ml-1" />
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Ej. 4821"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-center text-base font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Estado Inicial / Actual */}
              {editingMember && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estado de la Cuenta
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StaffStatus)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Activo (Habilitado)</option>
                    <option value="PENDING">Pendiente de Aceptación</option>
                    <option value="SUSPENDED">Suspendido (Bloqueado)</option>
                  </select>
                </div>
              )}

              {/* Acciones del Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingMember ? 'Actualizar Colaborador' : 'Guardar y Generar PIN'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DE MATRIZ DE ROLES Y PERMISOS ─── */}
      {isPermModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Matriz de Roles y Alcance de Permisos</h3>
                  <p className="text-[11px] text-slate-400">Guía de capacidades de cada rol dentro del ecosistema comercial.</p>
                </div>
              </div>
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(ROLE_DEFINITIONS) as StaffRole[]).map((rKey) => {
                  const rData = ROLE_DEFINITIONS[rKey];
                  const RIcon = rData.icon;

                  return (
                    <div 
                      key={rKey} 
                      className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-xl border ${rData.badgeColor}`}>
                            <RIcon className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-100">{rData.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{rData.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capacidades:</span>
                        <div className="flex flex-wrap gap-1">
                          {rData.defaultPermissions.map(p => (
                            <span key={p} className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Seguridad Financiera Blindada:</strong> Únicamente el <strong>Titular / Owner</strong> del comercio tiene acceso a editar cuentas bancarias, solicitar liquidaciones y configurar parámetros fiscales de la empresa. Los roles operativos están estrictamente confinados a la gestión de comandas y despacho.
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
