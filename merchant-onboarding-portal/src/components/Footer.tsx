import React from 'react';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-gray-800/80 bg-[#070A12] py-12 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Features badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 pb-10 border-b border-gray-800/60">
          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/50">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Validación EIAM v2.2</h4>
              <p className="text-xs text-gray-400">Provisión automática de seguridad multi-tenant.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/50">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Encriptación de Extremo a Extremo</h4>
              <p className="text-xs text-gray-400">Tus datos comerciales están 100% protegidos.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/50">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Aprobación Rápida 24-48h</h4>
              <p className="text-xs text-gray-400">Respuesta ágil por el equipo de gobernanza.</p>
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 BlueSystem Delivery Enterprise v2.2. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-6">
            <a href="#" className="hover:text-cyan-400 transition-colors">Términos de Servicio</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Política de Privacidad</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Soporte B2B</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
