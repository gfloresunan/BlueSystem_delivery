import React, { useState } from 'react';
import { MerchantFormData } from '../types';
import { submitMerchantApplication } from '../firebase';
import {
  CheckCircle,
  ShieldCheck,
  ArrowLeft,
  Send,
  Building2,
  MapPin,
  Mail,
  Phone,
  FileText,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

// ─── Submission State Machine (ADR-011.3) ─────────────────────────────────────
type SubmissionState = 'idle' | 'submitting' | 'error';

interface Props {
  formData: MerchantFormData;
  updateForm: (data: Partial<MerchantFormData>) => void;
  onSuccess: (applicationId: string) => void;
  onBack: () => void;
}

export const Step4Summary: React.FC<Props> = ({ formData, updateForm, onSuccess, onBack }) => {
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: prevent double submission
    if (submissionState === 'submitting') return;

    if (!formData.acceptTerms) {
      alert('Debes aceptar los Términos y Condiciones de Afiliación para continuar.');
      return;
    }

    // ── Transition: idle → submitting ────────────────────────────────────────
    setSubmissionState('submitting');
    setErrorMessage(null);

    try {
      // Build document metadata (only successfully uploaded files with storagePath)
      const documents = formData.documentFiles
        .filter((d) => d.status === 'completed' && d.storagePath)
        .map((d) => ({
          name: d.name,
          documentType: d.type,
          storagePath: d.storagePath,
          contentType: d.contentType || 'application/octet-stream',
          size: d.size || 0,
          uploadedAt: d.uploadedAt || new Date().toISOString(),
          status: 'PENDING_REVIEW',
        }));

      const payload = {
        applicationId: formData.applicationId,
        tenantId: formData.tenantId,
        tenantSlug: formData.tenantSlug,
        businessName: formData.businessName,
        legalName: formData.legalName,
        ruc: formData.ruc,
        category: formData.category,
        businessCategoryId: formData.businessCategoryId || formData.category,
        departmentId: formData.departmentId,
        departmentName: formData.departmentName || formData.departmentId,
        municipalityId: formData.municipalityId,
        municipalityName: formData.municipalityName || formData.municipalityId,
        address: formData.address,
        city: formData.municipalityName || formData.city || formData.municipalityId,
        zone: formData.zone,
        contactName: formData.contactName,
        phone: formData.phone,
        email: formData.email,
        location: formData.location,
        documents,
        documentUrls: [],
      };

      // ── SOLE authoritative creation path (ADR-011.3) ──────────────────────
      // submitMerchantApplication calls httpsCallable() exclusively.
      // There is NO Firestore fallback here.
      // Failures propagate to the error state for user retry.
      const response = await submitMerchantApplication(payload);

      // ── Transition: submitting → success (ONLY on confirmed callable success) ──
      // response.success === true AND response.applicationId are guaranteed
      // by the service layer before this point.
      onSuccess(response.applicationId);

    } catch (err: unknown) {
      // ── Transition: submitting → error ────────────────────────────────────
      const errorErr = err as { message?: string };
      const userMessage =
        errorErr?.message || 'Ocurrió un error al enviar la solicitud. Por favor reintenta.';

      setErrorMessage(userMessage);
      setSubmissionState('error');
    }
  };

  const handleRetry = () => {
    // Reset to idle — allow retry without resetting form data
    setSubmissionState('idle');
    setErrorMessage(null);
  };

  const isSubmitting = submissionState === 'submitting';

  return (
    <form onSubmit={handleFinalSubmit} className="space-y-6">

      {/* ── Step Header ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-cyan-400" />
          <span>Confirmación de la Solicitud</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Por favor revisa que toda la información comercial sea exacta antes de realizar el envío oficial.
        </p>
      </div>

      {/* ── Error Panel (visible only in error state) ─────────────────────── */}
      {submissionState === 'error' && errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm space-y-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center space-x-2 text-xs font-semibold text-red-300 hover:text-red-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Intentar nuevamente</span>
          </button>
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Business Data */}
        <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>1. Datos Comerciales</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400 text-xs block">Nombre Comercial</span>
              <span className="font-semibold text-white">{formData.businessName}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Razón Social</span>
              <span className="font-semibold text-white">{formData.legalName}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">RUC / NIT</span>
              <span className="font-mono font-semibold text-white">{formData.ruc}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Rubro Comercial</span>
              <span className="font-semibold text-cyan-300 uppercase text-xs">{formData.category}</span>
            </div>
          </div>
        </div>

        {/* Location & Contact */}
        <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>2. Ubicación &amp; Contacto</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400 text-xs block">Ubicación Administrativa</span>
              <span className="font-semibold text-white">
                {formData.municipalityName || formData.municipalityId}, {formData.departmentName || formData.departmentId}
                {formData.zone ? ` (${formData.zone})` : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Representante Comercial</span>
              <span className="font-semibold text-white">{formData.contactName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-white">{formData.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-white">{formData.email}</span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-2">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>3. Documentos Legal Adjuntos ({formData.documentFiles.length})</span>
          </div>
          {formData.documentFiles.length > 0 ? (
            <ul className="space-y-1 text-xs text-gray-300">
              {formData.documentFiles.map((doc, idx) => (
                <li key={idx} className="flex items-center space-x-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{doc.name} ({doc.type})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Sin documentos adjuntos (se podrán solicitar posteriormente en la revisión).
            </p>
          )}
        </div>

      </div>

      {/* ── Terms Acceptance ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start space-x-3">
        <input
          type="checkbox"
          id="terms"
          checked={formData.acceptTerms}
          onChange={(e) => updateForm({ acceptTerms: e.target.checked })}
          disabled={isSubmitting}
          className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500"
        />
        <label htmlFor="terms" className="text-xs text-gray-300 leading-relaxed cursor-pointer">
          Declaro que la información ingresada es verídica y acepto los{' '}
          <a href="#" className="text-cyan-400 underline font-semibold">
            Términos de Afiliación Comercial de BlueSystem Delivery Enterprise
          </a>
          . Entiendo que mi solicitud será evaluada por el centro de gobernanza y que recibiré
          mi acceso a Merchant Web una vez aprobada.
        </label>
      </div>

      {/* ── Action Buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-800">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás</span>
        </button>

        {/*
         * Submit button:
         * - Disabled while submitting (prevents double click / concurrent calls)
         * - Disabled if terms not accepted
         * - Shows animated spinner during submission
         */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.acceptTerms}
          className="btn-neon flex items-center space-x-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <ShieldCheck className="w-4 h-4 animate-spin" />
              <span>Enviando solicitud...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Enviar Solicitud de Afiliación</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
};
