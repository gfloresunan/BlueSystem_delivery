import React, { useState } from 'react';
import { Stepper } from '../components/Stepper';
import { Step1GeneralInfo } from '../components/Step1GeneralInfo';
import { Step2LocationContact } from '../components/Step2LocationContact';
import { Step3Documents } from '../components/Step3Documents';
import { Step4Summary } from '../components/Step4Summary';
import { SuccessModal } from '../components/SuccessModal';
import { MerchantFormData } from '../types';
import { ShieldCheck, Zap, TrendingUp, Users } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const tenantParam = searchParams.get('tenant') || searchParams.get('tenantSlug') || undefined;
  const tenantIdParam = searchParams.get('tenantId') || undefined;

  const [formData, setFormData] = useState<MerchantFormData>({
    applicationId: 'APP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
    tenantId: tenantIdParam,
    tenantSlug: tenantParam,
    businessName: '',
    legalName: '',
    ruc: '',
    category: '',
    departmentId: 'MANAGUA',
    departmentName: 'Managua',
    municipalityId: 'MANAGUA',
    municipalityName: 'Managua',
    address: '',
    city: 'Managua',
    zone: '',
    contactName: '',
    phone: '',
    email: '',
    location: {
      latitude: 12.136389,
      longitude: -86.251389, // Managua por defecto
    },
    documentFiles: [],
    acceptTerms: false,
  });

  const updateForm = (data: Partial<MerchantFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuccess = (applicationId: string) => {
    setSubmittedAppId(applicationId);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Hero Section Banner */}
      <div className="max-w-4xl mx-auto text-center mb-10 space-y-4">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider shadow-glow-cyan">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Únete a la Red de Comercio Enterprise</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Impulsa tus Ventas Digitales con <span className="text-gradient-neon">BlueSystem Delivery</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
          Afilia tu negocio a la plataforma omnicanal más avanzada. Accede a herramientas POS, control de cocina (KDS), delivery en tiempo real y finanzas automatizadas.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-2xl glass-card">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Mayor Cobertura</h4>
            <p className="text-xs text-gray-400 mt-1">Conecta con miles de clientes en tu zona con rutas optimizadas.</p>
          </div>

          <div className="p-4 rounded-2xl glass-card">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 w-fit mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Gestión Merchant Web</h4>
            <p className="text-xs text-gray-400 mt-1">Panel exclusivo para menú, precios, sucursales y personal EIAM.</p>
          </div>

          <div className="p-4 rounded-2xl glass-card">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-2">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Soporte Dedicado</h4>
            <p className="text-xs text-gray-400 mt-1">Acompañamiento en el onboarding y capacitación operativa.</p>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl mx-auto glass-panel rounded-3xl p-6 sm:p-10 border border-gray-800 shadow-2xl relative overflow-hidden">
        
        {/* Top Glow Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-neon" />

        {/* Stepper */}
        <Stepper currentStep={currentStep} />

        {/* Form Steps */}
        <div className="mt-8">
          {currentStep === 1 && (
            <Step1GeneralInfo formData={formData} updateForm={updateForm} onNext={handleNext} />
          )}

          {currentStep === 2 && (
            <Step2LocationContact
              formData={formData}
              updateForm={updateForm}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <Step3Documents
              formData={formData}
              updateForm={updateForm}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <Step4Summary
              formData={formData}
              updateForm={updateForm}
              onSuccess={handleSuccess}
              onBack={handleBack}
            />
          )}
        </div>

      </div>

      {/* Success Modal */}
      {submittedAppId && (
        <SuccessModal
          applicationId={submittedAppId}
          email={formData.email}
          businessName={formData.businessName}
        />
      )}

    </div>
  );
};
