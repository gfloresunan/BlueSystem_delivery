import React from 'react';
import { MessageSquare } from 'lucide-react';

export const CommunicationModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Enterprise Communication Platform (ECP)</h1>
        <p className="text-sm text-slate-400">Envíos multicanal por WhatsApp, Notificaciones Push, Email y SMS.</p>
      </div>

      <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-100 font-sans">Plataforma no conectada</h3>
          <p className="text-xs text-slate-400 font-sans">
            La integración de notificaciones push, alertas por WhatsApp y envíos de SMS se activará en la Phase 8.
          </p>
        </div>
      </div>
    </div>
  );
};
