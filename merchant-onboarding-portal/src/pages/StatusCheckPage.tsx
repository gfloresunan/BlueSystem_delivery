import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getApplicationStatusCallable } from '../firebase';
import { Search, ShieldAlert, Clock, CheckCircle2, FileQuestion, XCircle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { MerchantApplicationStatus } from '../types';

export const StatusCheckPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [emailInput, setEmailInput] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('No se encontró información');

  const fetchStatus = async (emailToSearch: string) => {
    if (!emailToSearch.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res: any = await getApplicationStatusCallable({ email: emailToSearch.trim() });
      if (res.data && res.data.success) {
        setResult(res.data);
      } else {
        throw new Error('No se encontró ninguna solicitud para este correo.');
      }
    } catch (err: any) {
      console.warn('Error consultando estado:', err);
      const code = (err?.code || '').toLowerCase();
      const msg = err?.message || '';

      if (code.includes('not-found') || msg.includes('not-found') || msg.includes('No se encontró')) {
        setErrorTitle('Solicitud no encontrada');
        setError('No encontramos ninguna solicitud de afiliación registrada con este correo electrónico.');
      } else if (code.includes('invalid-argument') || msg.includes('invalid-argument') || msg.includes('El email es requerido')) {
        setErrorTitle('Datos requeridos');
        setError('Por favor ingresa un correo electrónico válido para consultar.');
      } else if (code.includes('internal') || code.includes('unavailable') || msg.includes('INTERNAL')) {
        setErrorTitle('Error al consultar estado');
        setError('No fue posible consultar el estado de tu solicitud en este momento. Por favor intenta nuevamente.');
      } else {
        setErrorTitle('Error al consultar');
        setError('No fue posible completar la consulta. Por favor intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEmail) {
      fetchStatus(initialEmail);
    }
  }, [initialEmail]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(emailInput);
  };

  const getStatusBadge = (status: MerchantApplicationStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Pendiente de Revisión',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: Clock,
        };
      case 'UNDER_REVIEW':
        return {
          label: 'En Revisión por Gobernanza',
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: Clock,
        };
      case 'DOCS_REQUESTED':
        return {
          label: 'Documentación Adicional Requerida',
          color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          icon: FileQuestion,
        };
      case 'APPROVED':
      case 'ONBOARDING':
        return {
          label: 'Aprobado — En Onboarding',
          color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          icon: CheckCircle2,
        };
      case 'ACTIVE':
        return {
          label: 'Comercio Activo en Plataforma',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'REJECTED':
        return {
          label: 'Solicitud No Aprobada',
          color: 'bg-red-500/10 text-red-400 border-red-500/30',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'bg-gray-800 text-gray-300 border-gray-700',
          icon: Clock,
        };
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-cyan-400 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la Página de Afiliación</span>
      </Link>

      {/* Header */}
      <div className="text-center mb-10 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Consulta de Estado de Solicitud
        </h1>
        <p className="text-sm text-gray-400 max-w-xl mx-auto">
          Ingresa el correo electrónico oficial registrado durante tu afiliación comercial para verificar el estado de tu trámite.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-2xl mb-8">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="email"
              required
              placeholder="contacto@pizzaroma.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="form-input pl-11 py-3.5"
            />
            <Search className="w-5 h-5 text-gray-500 absolute left-4 top-4 pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-neon py-3.5 px-8 flex items-center justify-center space-x-2 shrink-0 text-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Consultar</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Card */}
      {error && (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start space-x-4 animate-fade-in">
          <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-red-200">{errorTitle}</h4>
            <p className="text-xs text-red-300/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-glow-cyan space-y-6 animate-fade-in">
          
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Comercio Registrado</span>
              <h3 className="text-2xl font-bold text-white mt-0.5">{result.businessName}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">ID Trámite: {result.applicationId}</p>
            </div>

            {/* Badge */}
            {(() => {
              const badge = getStatusBadge(result.status);
              const BadgeIcon = badge.icon;
              return (
                <div className={`px-4 py-2 rounded-2xl border ${badge.color} flex items-center space-x-2 w-fit text-xs font-bold`}>
                  <BadgeIcon className="w-4 h-4" />
                  <span>{badge.label}</span>
                </div>
              );
            })()}
          </div>

          {/* Status Message */}
          <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 text-sm text-gray-200">
            <p className="font-medium">{result.statusMessage}</p>
          </div>

          {/* Docs Note if applicable */}
          {result.docsNote && (
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider block">Nota del Equipo de Gobernanza:</span>
              <p>{result.docsNote}</p>
            </div>
          )}

          {/* Rejection reason if applicable */}
          {result.rejectionReason && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider block">Motivo de la decisión:</span>
              <p>{result.rejectionReason}</p>
            </div>
          )}

          {/* Next steps CTA */}
          {(result.status === 'APPROVED' || result.status === 'ONBOARDING' || result.status === 'ACTIVE') && (
            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-white">¡Tu cuenta está lista!</h4>
                <p className="text-xs text-gray-300 mt-0.5">Ingresa a Merchant Web para iniciar sesión y configurar tu tienda.</p>
              </div>

              <a
                href="https://merchant.bluesystemdelivery.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-neon text-xs py-2.5 px-5 flex items-center space-x-2 shrink-0 font-bold"
              >
                <span>Acceder a Merchant Web</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
