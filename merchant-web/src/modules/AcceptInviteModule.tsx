import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth, functions } from '../shared/services/firebase';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Building2, ChefHat, Users, BadgePercent } from 'lucide-react';

interface AcceptInviteProps {
  token: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ROLE_INFO: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  COOK: { label: 'Cocinero / Pantalla KDS', icon: ChefHat, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  CASHIER: { label: 'Cajero / Mostrador POS', icon: BadgePercent, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  SUPERVISOR: { label: 'Supervisor de Turno', icon: Users, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  MANAGER: { label: 'Gerente de Sucursal', icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
};

export const AcceptInviteModule: React.FC<AcceptInviteProps> = ({ token, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any | null>(null);
  const [businessName, setBusinessName] = useState<string>('Comercio BlueSystem');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const cleanToken = token.trim();

        // 1. Invocar Cloud Function autorizada para resolver detalles sin dependencia de Firestore rules públicas
        try {
          const detailsFn = httpsCallable<any, any>(functions, 'getStaffInvitationDetails');
          const res = await detailsFn({ token: cleanToken });
          if (res.data?.valid) {
            setInvitation(res.data);
            if (res.data.businessName) {
              setBusinessName(res.data.businessName);
            }
            setLoading(false);
            return;
          }
        } catch (fnErr: any) {
          const msg = fnErr?.message || '';
          if (msg.includes('utilizada previamente') || msg.includes('revocada') || msg.includes('expirado') || msg.includes('inválido')) {
            setErrorMsg(msg);
            setLoading(false);
            return;
          }
          console.warn('[AcceptInvite] Fallback a Firestore directo:', fnErr);
        }

        // 2. Fallback a consulta Firestore directa
        const invSnap = await getDoc(doc(db, 'invitations', cleanToken));
        if (!invSnap.exists()) {
          setErrorMsg('La invitación no existe o el enlace es inválido.');
          setLoading(false);
          return;
        }

        const data = invSnap.data();
        if (data.status === 'ACCEPTED') {
          setErrorMsg('Esta invitación ya fue utilizada previamente.');
          setLoading(false);
          return;
        }

        if (data.status === 'REVOKED') {
          setErrorMsg('Esta invitación fue revocada por el administrador del comercio.');
          setLoading(false);
          return;
        }

        const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
        if (expiresAt && Date.now() > expiresAt.getTime()) {
          setErrorMsg('La invitación ha expirado. Contacte al administrador para solicitar una nueva.');
          setLoading(false);
          return;
        }

        setInvitation(data);

        // Cargar nombre del comercio
        if (data.businessId) {
          try {
            const bizSnap = await getDoc(doc(db, 'businesses', data.businessId));
            if (bizSnap.exists()) {
              setBusinessName(bizSnap.data()?.name || bizSnap.data()?.nombre || 'Comercio BlueSystem');
            }
          } catch {
            // Fallback silencioso
          }
        }
      } catch (err: any) {
        console.error('[AcceptInvite] Error cargando invitación:', err);
        setErrorMsg('Error al verificar la invitación. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    } else {
      setErrorMsg('Token de invitación no proporcionado.');
      setLoading(false);
    }
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const acceptFn = httpsCallable<any, { success: boolean; customToken?: string; role: string; email?: string }>(
        functions,
        'acceptStaffInvitation'
      );
      const res = await acceptFn({ token: token.trim(), password });

      const emailToAuth = res.data?.email || invitation?.email;

      if (res.data?.customToken) {
        // Autenticar nativamente en Firebase Auth con el custom token emitido
        await signInWithCustomToken(auth, res.data.customToken);
        console.log('[AcceptInvite] Cuenta activada y autenticada exitosamente con Custom Token.');
      } else if (emailToAuth && password) {
        // Autenticación nativa directa con email y la contraseña recién establecida
        await signInWithEmailAndPassword(auth, emailToAuth, password);
        console.log('[AcceptInvite] Cuenta activada y autenticada exitosamente con credenciales.');
      } else {
        throw new Error('No se recibió credencial de acceso para iniciar sesión.');
      }

      // Limpiar URL
      if (window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.pathname);
      }

      onSuccess?.();
    } catch (err: any) {
      console.error('[AcceptInvite] Error al activar cuenta:', err);
      setErrorMsg(err.message || 'Error al procesar la activación de la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const role = (invitation?.targetRole || invitation?.role || 'COOK').toUpperCase();
  const roleData = ROLE_INFO[role] || ROLE_INFO.COOK;
  const RoleIcon = roleData.icon;

  return (
    <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(37,99,235,0.1),transparent_50%)] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

        <div className="text-center space-y-3 pb-4">
          <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{businessName}</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Activación de Personal & Staff</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Validando token de invitación...</p>
          </div>
        ) : errorMsg && !invitation ? (
          <div className="space-y-4">
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => {
                if (onCancel) onCancel();
                else window.location.href = '/';
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition"
            >
              Ir al Inicio de Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="space-y-4">
            {/* Tarjeta Informativa del Rol Asignado */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${roleData.color}`}>
              <div className="p-2 rounded-xl bg-slate-900/50">
                <RoleIcon className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] uppercase tracking-wider font-mono opacity-80 block">Puesto Asignado</span>
                <span className="font-bold text-sm text-white block truncate">{roleData.label}</span>
                <span className="text-xs opacity-90 block truncate">{invitation?.email}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Contraseña */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-bold block">Establece tu Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-bold block">Confirma tu Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Activando Credenciales...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activar Cuenta y Comenzar</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
