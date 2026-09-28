import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../shared/services/firebase';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound, ChefHat } from 'lucide-react';
import { useClientExperience } from '../shared/branding/ClientExperienceProvider';

type LoginMode = 'PASSWORD' | 'PIN';

export const LoginModule: React.FC = () => {
  const { brand } = useClientExperience();
  const [loginMode, setLoginMode] = useState<LoginMode>('PASSWORD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  // 1. Manejador de Login con Contraseña (Email + Password Estándar)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('[Login] Autenticación con contraseña exitosa.');
    } catch (err: any) {
      console.error('[Login] Error de autenticación:', err);
      switch (err.code) {
        case 'auth/invalid-email':
          setErrorMsg('El formato del correo electrónico es inválido.');
          break;
        case 'auth/user-disabled':
          setErrorMsg('La cuenta está deshabilitada temporalmente. Contacta al administrador.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setErrorMsg('Correo o contraseña incorrectos.');
          break;
        default:
          setErrorMsg('Error de conexión al autenticar. Por favor reintenta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Manejador de Login con PIN Operacional (POS / KDS)
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) {
      setErrorMsg('Ingresa tu correo y el PIN de 4 dígitos de tu estación.');
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      setErrorMsg('El PIN debe ser exactamente de 4 dígitos numéricos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const authWithPinFn = httpsCallable<any, { success: boolean; customToken: string; role: string; displayName: string }>(
        functions,
        'authenticateWithStaffPin'
      );

      const res = await authWithPinFn({
        email: email.trim().toLowerCase(),
        pin: pin.trim(),
      });

      if (res.data?.customToken) {
        // Autenticar nativamente con el token seguro emitido por el servidor
        await signInWithCustomToken(auth, res.data.customToken);
        console.log(`[Login] Autenticación exitosa por PIN para rol ${res.data.role} (${res.data.displayName}).`);
      } else {
        throw new Error('No se recibió la credencial de sesión del servidor.');
      }
    } catch (err: any) {
      console.error('[Login] Error en autenticación por PIN:', err);
      const msg = err.message || '';
      if (msg.includes('Demasiados intentos erróneos') || err.code === 'functions/resource-exhausted') {
        setErrorMsg('Demasiados intentos fallidos con este PIN. Terminal bloqueada por 15 minutos.');
      } else if (msg.includes('inactivo') || msg.includes('suspendido')) {
        setErrorMsg('El colaborador asociado a este PIN está inactivo o suspendido.');
      } else if (msg.includes('PIN incorrecto') || err.code === 'functions/not-found') {
        setErrorMsg('PIN de 4 dígitos incorrecto o no coincide con este colaborador.');
      } else {
        setErrorMsg(err.message || 'Error al validar credencial de estación.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const brandDisplayName = brand.displayName || 'BlueSystem Merchant';
  const brandLogo = brand.visual?.logoUrl;
  const brandPrimaryColor = brand.visual?.primaryColor || '#2563EB';

  return (
    <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.08),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.04),transparent_40%)] pointer-events-none" />
      
      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        {/* Glow Header */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            {brandLogo && !logoError ? (
              <img
                src={brandLogo}
                alt={brandDisplayName}
                className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-lg border border-slate-700"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg text-white font-bold text-xl"
                style={{ backgroundColor: brandPrimaryColor }}
              >
                <ShieldCheck className="w-8 h-8 text-white stroke-[2]" />
              </div>
            )}
            <h2 className="text-2xl font-black text-white tracking-tight">{brandDisplayName}</h2>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Portal de Comercios & Sucursales</p>
          </div>

          {/* Toggle de Modo de Acceso: Contraseña vs PIN Rápido POS/KDS */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setLoginMode('PASSWORD');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition ${
                loginMode === 'PASSWORD'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Contraseña</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('PIN');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition ${
                loginMode === 'PIN'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN POS / KDS</span>
            </button>
          </div>

          {/* Formulario según modo seleccionado */}
          {loginMode === 'PASSWORD' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4 pt-1">
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold block">Correo de Acceso</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="gerente@mi-comercio.com"
                    disabled={isLoading}
                    required
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold block">Contraseña</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    disabled={isLoading}
                    required
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition font-mono"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs py-3 rounded-xl transition duration-200 shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 mt-6 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando Identidad EIAM...</span>
                  </>
                ) : (
                  <span>Ingresar al Portal</span>
                )}
              </button>
            </form>
          ) : (
            /* Modo PIN Rápido POS / KDS */
            <form onSubmit={handlePinLogin} className="space-y-4 pt-1">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                <ChefHat className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                <span>Acceso rápido para terminales de cocina (KDS), cajeros y personal operativo con PIN de 4 dígitos.</span>
              </div>

              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold block">Correo de Colaborador</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cocina@mi-comercio.com"
                    disabled={isLoading}
                    required
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition font-mono"
                  />
                </div>
              </div>

              {/* PIN Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold block">PIN Rápido (4 dígitos)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    disabled={isLoading}
                    required
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-3 py-2.5 text-center tracking-[0.5em] text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs py-3 rounded-xl transition duration-200 shadow-md shadow-amber-600/10 flex items-center justify-center gap-2 mt-6 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Autenticando Estación Operativa...</span>
                  </>
                ) : (
                  <span>Ingresar a Estación (KDS / POS)</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Secured by Enterprise Policy Engine v2.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
