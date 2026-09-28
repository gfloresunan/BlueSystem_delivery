import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  KeyRound, 
  ShieldCheck, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Smartphone, 
  Building2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { 
  updatePassword, 
  updateProfile, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, identity, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState(false);

  // Load profile data on open
  useEffect(() => {
    if (!isOpen || !user) return;

    setName(user.displayName || '');
    setProfileMsg(null);
    setPasswordMsg(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    // Fetch phone from Firestore users/{uid}
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.telefono || data.phone) {
            setPhone(data.telefono || data.phone || '');
          }
          if (!name && (data.nombre || data.name)) {
            setName(data.nombre || data.name || '');
          }
        }
      } catch (err) {
        console.warn('Error fetching user data from Firestore:', err);
      }
    };

    fetchUserData();
  }, [isOpen, user]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleCopyBusinessId = () => {
    if (!identity?.businessId) return;
    navigator.clipboard.writeText(identity.businessId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMsg({ type: 'error', text: 'El nombre no puede estar vacío.' });
      return;
    }

    setLoadingProfile(true);
    setProfileMsg(null);

    try {
      // 1. Actualizar displayName en Firebase Auth
      await updateProfile(user, {
        displayName: name.trim(),
      });

      // 2. Actualizar datos en Firestore /users/{uid}
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        nombre: name.trim(),
        name: name.trim(),
        telefono: phone.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      });

      setProfileMsg({ type: 'success', text: '¡Perfil actualizado exitosamente!' });
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setProfileMsg({ type: 'error', text: err.message || 'Error al guardar cambios de perfil.' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'Ingresa una nueva contraseña.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
      return;
    }

    setLoadingPassword(true);

    try {
      // Si el usuario proporcionó la contraseña actual/temporal, re-autenticamos
      if (currentPassword && user.email) {
        try {
          const credential = EmailAuthProvider.credential(user.email, currentPassword.trim());
          await reauthenticateWithCredential(user, credential);
        } catch (reauthErr: any) {
          if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
            setPasswordMsg({ type: 'error', text: 'La contraseña actual/temporal ingresada es incorrecta.' });
            setLoadingPassword(false);
            return;
          }
          throw reauthErr;
        }
      }

      // Actualizar la contraseña en Firebase Auth
      await updatePassword(user, newPassword.trim());

      // Opcional: Actualizar marca de tiempo en Firestore
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          passwordChangedAt: serverTimestamp(),
          requiresPasswordChange: false,
        });
      } catch (_) {
        // No bloqueante
      }

      setPasswordMsg({
        type: 'success',
        text: '¡Tu contraseña ha sido actualizada con éxito! Úsala la próxima vez que inicies sesión.',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordMsg({
          type: 'error',
          text: 'Por seguridad, debes ingresar tu contraseña actual/temporal para validar el cambio.',
        });
      } else if (err.code === 'auth/weak-password') {
        setPasswordMsg({
          type: 'error',
          text: 'La contraseña es demasiado débil. Usa una combinación de letras, números y símbolos.',
        });
      } else {
        setPasswordMsg({
          type: 'error',
          text: err.message || 'Error al actualizar la contraseña.',
        });
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const displayName = user.displayName || name || user.email?.split('@')[0] || 'Comercio';
  const roleDisplay = identity?.role || 'MERCHANT_OWNER';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-obsidian-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con Perfil y Avatar */}
        <div className="p-6 bg-gradient-to-r from-obsidian-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border-2 border-blue-500/40 text-blue-400 font-bold text-xl flex items-center justify-center shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">{displayName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                  {roleDisplay}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas (Tabs) */}
        <div className="flex border-b border-slate-800 bg-obsidian-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Perfil Comercial</span>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Seguridad & Contraseña</span>
          </button>
        </div>

        {/* Contenido de la Pestaña */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                    profileMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {profileMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre del Contacto / Representante
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Jeremy Reyes"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 85134195"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Solo Lectura)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-400 cursor-not-allowed select-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  El correo electrónico está vinculado a tu cuenta oficial y no puede ser alterado directamente.
                </p>
              </div>

              {identity?.businessId && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        Business ID del Comercio
                      </p>
                      <p className="text-xs font-mono text-slate-200 mt-1 break-all">
                        {identity.businessId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyBusinessId}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loadingProfile}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
                >
                  {loadingProfile ? (
                    <span>Guardando cambios...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Información de Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Si accediste con la contraseña temporal recibida por correo, te recomendamos definir aquí una nueva contraseña segura y personal para tus futuros accesos.
                </span>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña Actual / Temporal
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Pega tu contraseña temporal aquí"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña Personal
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  {loadingPassword ? (
                    <span>Actualizando contraseña...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Actualizar Contraseña Definitiva</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer con Logout */}
        <div className="p-4 bg-obsidian-950 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            EIAM Core v3 • Enterprise
          </span>
          <button
            onClick={async () => {
              onClose();
              await logout();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
