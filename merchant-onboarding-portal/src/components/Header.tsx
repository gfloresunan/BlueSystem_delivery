import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, Search, ShieldCheck, Bike } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const isCourierSection = location.pathname.startsWith('/courier');

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gray-800/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              isCourierSection
                ? 'bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-gradient-neon shadow-glow-cyan text-black'
            }`}>
              {isCourierSection ? (
                <Bike className="w-7 h-7 stroke-[2.5]" />
              ) : (
                <Store className="w-7 h-7 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-white">BlueSystem</span>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${
                  isCourierSection
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                }`}>
                  {isCourierSection ? 'Fleet Core' : 'Enterprise'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {isCourierSection ? 'Portal de Registro de Motorizados' : 'Portal de Afiliación Comercial'}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  !isCourierSection
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Comercios</span>
              </Link>
              <Link
                to="/courier"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isCourierSection
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Motorizados</span>
              </Link>
            </div>

            {/* Status Link */}
            <Link
              to={isCourierSection ? '/courier/status' : '/status'}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 hover:text-white border border-gray-700/60 text-xs font-medium transition-all"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Consultar Estado</span>
            </Link>

            <a
              href="https://merchant.bluesystemdelivery.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Portal Merchant</span>
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};
