import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import { getCourierApplicationStatusCallable } from '../firebase';

export const CourierStatusPage: React.FC = () => {
  const [searchType, setSearchType] = useState<'id' | 'credentials'>('id');
  const [applicationId, setApplicationId] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<{
    applicationId: string;
    status: string;
    onboardingStatus: string;
    createdAt: any;
    candidateName: string;
    rejectionReason?: string;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusResult(null);
    setLoading(true);

    try {
      let payload: any = {};
      if (searchType === 'id') {
        if (!applicationId.trim()) {
          throw new Error('Ingresa el número de expediente de la solicitud.');
        }
        payload = { applicationId: applicationId.trim() };
      } else {
        if (!email.trim() || !nationalId.trim()) {
          throw new Error('Ingresa tu correo electrónico y número de cédula.');
        }
        payload = { email: email.trim(), nationalId: nationalId.trim() };
      }

      const res = await getCourierApplicationStatusCallable(payload);
      const data = res.data as any;
      setStatusResult(data);
    } catch (err: any) {
      console.error('Error consultando estado:', err);
      setError(err.message || 'No se pudo consultar el estado. Revisa los datos ingresados.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
      case 'PENDING':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="font-extrabold text-sm uppercase tracking-wider">En Revisión Inicial (PENDING)</span>
          </div>
        );
      case 'UNDER_REVIEW':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Search className="w-5 h-5 animate-pulse" />
            <span className="font-extrabold text-sm uppercase tracking-wider">Documentación en Análisis</span>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-extrabold text-sm uppercase tracking-wider">¡Solicitud Aprobada & Habilitada!</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <XCircle className="w-5 h-5" />
            <span className="font-extrabold text-sm uppercase tracking-wider">Solicitud Rechazada</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <span className="font-bold text-sm">{status}</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      {/* Cabecera */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
          <Bike className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Estado de Solicitud de Motorizado</h1>
        <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
          Consulta en tiempo real el progreso de validación documental y habilitación de tu cuenta en Fleet Core.
        </p>
      </div>

      {/* Selector de Método de Búsqueda */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSearchType('id');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              searchType === 'id'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Buscar por ID de Expediente
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchType('credentials');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              searchType === 'credentials'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Buscar por Correo & Cédula
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {searchType === 'id' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Número de Expediente (Application ID) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: courier_app_172464..."
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Correo Electrónico Registrado *
                </label>
                <input
                  type="email"
                  required
                  placeholder="repartidor@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cédula de Identidad *
                </label>
                <input
                  type="text"
                  required
                  placeholder="001-XXXXXX-XXXXX"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Consultando Expediente...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Consultar Estado</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tarjeta de Resultados */}
      {statusResult && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <p className="text-[11px] text-slate-400 font-mono">ID de Expediente</p>
              <h3 className="text-base font-bold text-white font-mono">{statusResult.applicationId}</h3>
            </div>
            {renderStatusBadge(statusResult.status)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 mb-0.5">Aspirante:</p>
              <p className="font-bold text-white text-sm">{statusResult.candidateName || 'N/A'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 mb-0.5">Fecha de Radicación:</p>
              <p className="font-semibold text-slate-300">
                {statusResult.createdAt
                  ? new Date(statusResult.createdAt._seconds ? statusResult.createdAt._seconds * 1000 : statusResult.createdAt).toLocaleDateString()
                  : 'Reciente'}
              </p>
            </div>
          </div>

          {statusResult.status === 'APPROVED' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2">
              <p className="font-bold text-sm">🎉 ¡Tu cuenta ha sido aprobada e inicializada!</p>
              <p className="text-slate-300">
                Tu perfil de motorizado ya fue registrado en el sistema. Puedes iniciar sesión en la aplicación móvil de repartidores de <strong>BlueSystem</strong> utilizando tu correo electrónico y comenzar tu turno cuando desees.
              </p>
            </div>
          )}

          {statusResult.status === 'REJECTED' && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-2">
              <p className="font-bold text-sm">⚠️ Motivo del Rechazo:</p>
              <p className="text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono">
                {statusResult.rejectionReason || 'Documentación o datos inconsistentes con las políticas de la plataforma.'}
              </p>
              <p className="text-slate-400">
                Puedes corregir la información y presentar una nueva solicitud asegurándote de que los documentos sean completamente legibles y vigentes.
              </p>
            </div>
          )}

          {(statusResult.status === 'PENDING_REVIEW' || statusResult.status === 'UNDER_REVIEW') && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 space-y-1">
              <p className="font-bold">📋 Próximos Pasos:</p>
              <p className="text-slate-300">
                El equipo de Governance está validando tu cédula, récord de tránsito, seguro y documentación vehicular. Este proceso suele tomar entre 24 y 48 horas hábiles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navegación Inferior */}
      <div className="flex items-center justify-between text-xs pt-4">
        <Link to="/courier" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Formulario de Registro</span>
        </Link>
        <Link to="/" className="text-slate-500 hover:text-slate-400">
          Portal de Comercios
        </Link>
      </div>
    </div>
  );
};
