/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — GATEKEEPER UI SHIELD (FASE 2D.11)
 * Escudo de Protección Visual para Rutas y Módulos no contratados o no autorizados
 */

import React from 'react';
import { ShieldX, Lock, ArrowLeft } from 'lucide-react';
import { AccessDecision } from './types';

interface GatekeeperShieldProps {
  decision: AccessDecision;
  moduleName?: string;
  onGoBack?: () => void;
}

export const GatekeeperShield: React.FC<GatekeeperShieldProps> = ({
  decision,
  moduleName = 'Módulo Protegido',
  onGoBack
}) => {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-slate-900/60 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldX className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>ACCESO DENEGADO (GATEKEEPER)</span>
          </div>

          <h2 className="text-2xl font-black text-white pt-2">
            {moduleName} No Disponible
          </h2>

          <p className="text-xs text-rose-400 font-mono bg-rose-950/30 py-2.5 px-3 rounded-xl border border-rose-900/40 break-words">
            MOTIVO: {decision.reason} [{decision.module || 'UNKNOWN'}]
          </p>

          <p className="text-xs text-slate-400 pt-2 leading-relaxed">
            Tu plan de suscripción o tu rol actual no cuenta con los entitlements requeridos para ejecutar este módulo dentro del Tenant activo.
          </p>
        </div>

        {onGoBack && (
          <div className="pt-2">
            <button
              onClick={onGoBack}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Regresar al Dashboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
