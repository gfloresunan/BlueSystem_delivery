import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, Search, ExternalLink, ShieldCheck } from 'lucide-react';

interface SuccessModalProps {
  applicationId: string;
  email: string;
  businessName: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ applicationId, email, businessName }) => {
  const navigate = useNavigate();

  const handleCopyId = () => {
    navigator.clipboard.writeText(applicationId);
    alert('Código de seguimiento copiado al portapapeles.');
  };

  const handleCheckStatus = () => {
    navigate(`/status?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg p-8 rounded-3xl glass-panel border border-cyan-500/30 text-center shadow-glow-cyan relative overflow-hidden">
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-neon rounded-full" />

        {/* Icon Header */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-neon p-0.5 flex items-center justify-center shadow-glow-cyan">
          <div className="w-full h-full bg-[#0B0F19] rounded-[22px] flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-cyan-400 stroke-[2.5]" />
          </div>
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight mb-2">
          ¡Solicitud Enviada con Éxito!
        </h3>
        
        <p className="text-sm text-gray-300 mb-6">
          Hemos recibido la solicitud de afiliación para <span className="text-cyan-400 font-bold">{businessName}</span>. El equipo de gobernanza revisará tus datos en un plazo de <span className="text-white font-semibold">24 a 48 horas</span>.
        </p>

        {/* Código de Seguimiento Box */}
        <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-800 mb-6 text-left space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
            <span>Número de Trámite / ID de Solicitud</span>
            <button
              onClick={handleCopyId}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </button>
          </div>
          <p className="font-mono text-base font-bold text-white tracking-wider break-all text-cyan-300">
            {applicationId}
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-gray-300 text-left mb-6 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            Te enviamos una notificación a <span className="text-white font-bold">{email}</span>. Una vez aprobada tu cuenta, recibirás tu correo de bienvenida con el enlace de primer acceso a <span className="text-cyan-400 font-semibold">Merchant Web</span>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleCheckStatus}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-sm font-semibold transition-all flex items-center justify-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Consultar Estado</span>
          </button>

          <a
            href="https://merchant.bluesystemdelivery.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition-all flex items-center justify-center space-x-2 border border-gray-700"
          >
            <span>Ir a Merchant Web</span>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>

      </div>
    </div>
  );
};
