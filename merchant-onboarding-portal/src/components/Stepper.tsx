import React from 'react';
import { Building2, MapPin, FileCheck, CheckCircle, Check } from 'lucide-react';

interface StepperProps {
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Datos Generales', icon: Building2 },
    { id: 2, label: 'Ubicación & Contacto', icon: MapPin },
    { id: 3, label: 'Documentación Legal', icon: FileCheck },
    { id: 4, label: 'Confirmación & Envío', icon: CheckCircle },
  ];

  return (
    <div className="w-full py-6 mb-8">
      <div className="flex items-center justify-between relative max-w-3xl mx-auto px-4">
        
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-800 -translate-y-1/2 -z-0 rounded-full" />
        
        {/* Progress Line */}
        <div 
          className="absolute top-1/2 left-8 h-1 bg-gradient-neon -translate-y-1/2 -z-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 85}%` }}
        />

        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-neon text-black shadow-glow-cyan scale-100'
                    : isCurrent
                    ? 'bg-cyan-500 text-black shadow-glow-cyan ring-4 ring-cyan-500/20 scale-110'
                    : 'bg-gray-900 border border-gray-800 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6 stroke-[3]" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              <span
                className={`mt-3 text-xs font-semibold text-center transition-colors ${
                  isCurrent ? 'text-cyan-400 font-bold' : isCompleted ? 'text-white' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}

      </div>
    </div>
  );
};
