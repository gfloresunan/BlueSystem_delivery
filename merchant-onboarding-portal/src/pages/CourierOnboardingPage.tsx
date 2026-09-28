import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
  User,
  CreditCard,
  FileCheck,
  CheckCircle,
  AlertCircle,
  Upload,
  RefreshCw,
  Trash2,
  Send,
} from 'lucide-react';
import {
  CourierFormData,
} from '../types/courier';
import {
  NICARAGUA_DEPARTMENTS,
  getMunicipalities,
  isValidMunicipality,
  getDepartmentName,
  getMunicipalityName,
} from '../constants/geoCatalog';
import {
  uploadCourierDocumentFile,
  submitCourierApplication,
  DocumentUploadResult,
} from '../firebase';

// Catálogo canónico de marcas populares de motocicletas
export const POPULAR_MOTORCYCLE_BRANDS = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'Bajaj',
  'Italika',
  'TVS',
  'Genesis',
  'Serpento',
  'Haojue',
  'Kawasaki',
  'KTM',
  'Hero',
  'Benelli',
  'Keeway',
  'Royal Enfield',
  'BMW',
  'Harley-Davidson',
  'OTRO',
] as const;

// Catálogo básico de colores para motocicletas (10 colores básicos + OTRO)
export const BASIC_MOTORCYCLE_COLORS = [
  'Negro',
  'Blanco',
  'Rojo',
  'Azul',
  'Gris / Plata',
  'Amarillo',
  'Verde',
  'Naranja',
  'Café / Marrón',
  'Multicolor',
  'OTRO',
] as const;

// Rango de años de motocicleta: desde 1990 hasta el año actual del sistema
const CURRENT_YEAR = new Date().getFullYear();
export const MOTORCYCLE_YEARS = Array.from(
  { length: CURRENT_YEAR - 1990 + 1 },
  (_, i) => String(CURRENT_YEAR - i)
);

export const CourierOnboardingPage: React.FC = () => {
  const [appId] = useState<string>(
    () => `courier_app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  const searchParams = new URLSearchParams(window.location.search);
  const tenantParam = searchParams.get('tenant') || searchParams.get('tenantSlug') || undefined;
  const tenantIdParam = searchParams.get('tenantId') || undefined;

  const [formData, setFormData] = useState<CourierFormData>({
    personal: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      departmentId: 'MANAGUA',
      departmentName: 'Managua',
      municipalityId: 'MANAGUA',
      municipalityName: 'Managua',
      department: 'Managua',
      city: 'Managua',
      nationalId: '',
    },
    vehicle: {
      brand: '',
      model: '',
      plate: '',
      year: '',
      color: '',
    },
    documents: {
      idFront: null,
      idBack: null,
      profilePhoto: null,
      registration: null,
      insurance: null,
      driverLicense: null,
    },
  });

  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('');

  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Departments & Municipalities from Canonical Single Source of Truth
  const availableMunicipalities = getMunicipalities(formData.personal.departmentId || 'MANAGUA');

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value;
    const deptName = getDepartmentName(deptId);
    const munis = getMunicipalities(deptId);
    const firstMuni = munis[0];
    setFormData((prev) => ({
      ...prev,
      personal: {
        ...prev.personal,
        departmentId: deptId,
        departmentName: deptName,
        department: deptName,
        municipalityId: firstMuni ? firstMuni.id : '',
        municipalityName: firstMuni ? firstMuni.name : '',
        city: firstMuni ? firstMuni.name : '',
      },
    }));
  };

  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const muniId = e.target.value;
    const muniName = getMunicipalityName(formData.personal.departmentId, muniId);
    setFormData((prev) => ({
      ...prev,
      personal: {
        ...prev.personal,
        municipalityId: muniId,
        municipalityName: muniName,
        city: muniName || muniId,
      },
    }));
  };

  // Helper para normalizar placa en vivo
  const handlePlateChange = (val: string) => {
    const clean = val.toUpperCase().replace(/\s+/g, '');
    setFormData((prev) => ({
      ...prev,
      vehicle: { ...prev.vehicle, plate: clean },
    }));
  };

  // Handlers para marca de motocicleta (Select + opción OTRO)
  const handleBrandSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBrand(val);
    if (val === 'OTRO') {
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, brand: customBrand.trim() },
      }));
    } else {
      setCustomBrand('');
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, brand: val },
      }));
    }
  };

  const handleCustomBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomBrand(val);
    setFormData((prev) => ({
      ...prev,
      vehicle: { ...prev.vehicle, brand: val },
    }));
  };

  // Handlers para color de motocicleta (Select + opción OTRO)
  const handleColorSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedColor(val);
    if (val === 'OTRO') {
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, color: customColor.trim() },
      }));
    } else {
      setCustomColor('');
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, color: val },
      }));
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomColor(val);
    setFormData((prev) => ({
      ...prev,
      vehicle: { ...prev.vehicle, color: val },
    }));
  };

  // Handler para año de motocicleta
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      vehicle: { ...prev.vehicle, year: val },
    }));
  };

  // Helper para normalizar cédula
  const handleNationalIdChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setFormData((prev) => ({
      ...prev,
      personal: { ...prev.personal, nationalId: clean },
    }));
  };

  // Upload handler
  const handleFileUpload = async (
    file: File,
    docKey: keyof CourierFormData['documents']
  ) => {
    if (!file) return;

    // Validación de tamaño (Máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError((prev) => ({
        ...prev,
        [docKey]: 'El archivo excede el tamaño máximo permitido (10MB).',
      }));
      return;
    }

    // Validación de tipo MIME
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      setUploadError((prev) => ({
        ...prev,
        [docKey]: 'Formato no soportado. Utiliza JPG, PNG, WebP o PDF.',
      }));
      return;
    }

    setUploadError((prev) => ({ ...prev, [docKey]: '' }));
    setUploadProgress((prev) => ({ ...prev, [docKey]: 1 }));

    try {
      const result = await uploadCourierDocumentFile(
        file,
        appId,
        docKey,
        (progress) => {
          setUploadProgress((prev) => ({ ...prev, [docKey]: progress }));
        }
      );

      setFormData((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docKey]: result,
        },
      }));
      setUploadProgress((prev) => ({ ...prev, [docKey]: 100 }));
    } catch (err: any) {
      console.error(`Error al subir ${docKey}:`, err);
      setUploadError((prev) => ({
        ...prev,
        [docKey]: 'Error durante la subida. Reintenta.',
      }));
      setUploadProgress((prev) => ({ ...prev, [docKey]: 0 }));
    }
  };

  const handleRemoveDocument = (docKey: keyof CourierFormData['documents']) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: null,
      },
    }));
    setUploadProgress((prev) => ({ ...prev, [docKey]: 0 }));
    setUploadError((prev) => ({ ...prev, [docKey]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validación completa
    const { personal, vehicle, documents } = formData;

    if (
      !personal.firstName.trim() ||
      !personal.lastName.trim() ||
      !personal.phone.trim() ||
      !personal.email.trim() ||
      !personal.nationalId.trim()
    ) {
      setGeneralError('Por favor completa todos los datos de información personal.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (
      !personal.departmentId ||
      !personal.municipalityId ||
      !isValidMunicipality(personal.departmentId, personal.municipalityId)
    ) {
      setGeneralError('Por favor selecciona un Departamento y un Municipio válidos del catálogo oficial.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (
      !vehicle.brand.trim() ||
      !vehicle.model.trim() ||
      !vehicle.plate.trim() ||
      !vehicle.year?.trim() ||
      !vehicle.color?.trim()
    ) {
      setGeneralError('Por favor completa todos los datos de la motocicleta (marca, modelo, año, color y placa).');
      return;
    }

    // Validar los 6 documentos
    if (!documents.idFront) {
      setGeneralError('Falta la fotografía frontal de tu cédula.');
      return;
    }
    if (!documents.idBack) {
      setGeneralError('Falta la fotografía del reverso de tu cédula.');
      return;
    }
    if (!documents.profilePhoto) {
      setGeneralError('Falta tu fotografía de perfil.');
      return;
    }
    if (!documents.registration) {
      setGeneralError('Falta la fotografía o documento de circulación de la moto.');
      return;
    }
    if (!documents.insurance) {
      setGeneralError('Falta el documento o póliza de seguro vigente.');
      return;
    }
    if (!documents.driverLicense) {
      setGeneralError('Falta la fotografía de tu licencia de conducir.');
      return;
    }

    if (!termsAccepted) {
      setGeneralError('Debes aceptar los términos y condiciones del programa de motorizados.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitCourierApplication({
        applicationId: appId,
        tenantId: tenantIdParam,
        tenantSlug: tenantParam,
        personal,
        vehicle,
        documents: documents as {
          idFront: DocumentUploadResult;
          idBack: DocumentUploadResult;
          profilePhoto: DocumentUploadResult;
          registration: DocumentUploadResult;
          insurance: DocumentUploadResult;
          driverLicense: DocumentUploadResult;
        },
      });

      setSubmissionSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error al enviar solicitud:', err);
      setGeneralError(err.message || 'Ocurrió un error al enviar tu solicitud. Intenta nuevamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Componente reutilizable para cada tarjeta de subida
  const renderUploadCard = (
    docKey: keyof CourierFormData['documents'],
    title: string,
    description: string,
    accept = 'image/jpeg,image/png,image/webp,application/pdf'
  ) => {
    const doc = formData.documents[docKey];
    const progress = uploadProgress[docKey] || 0;
    const error = uploadError[docKey];
    const isUploading = progress > 0 && progress < 100;

    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 transition-all hover:border-slate-700">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
          </div>
          {doc ? (
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3" />
              Cargado ✓
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold shrink-0">
              Obligatorio
            </span>
          )}
        </div>

        {error && (
          <div className="p-2 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {doc ? (
          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{doc.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {(doc.size / 1024).toFixed(1)} KB • {doc.contentType}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveDocument(docKey)}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
              title="Eliminar y reemplazar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-3">
            {isUploading ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Subiendo documento seguro...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1.5 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition group">
                <Upload className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition mb-1" />
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                  Seleccionar fotografía o archivo
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WebP o PDF hasta 10MB</span>
                <input
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, docKey);
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>
    );
  };

  if (submissionSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
            <CheckCircle className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-widest">
              Solicitud Recibida
            </span>
            <h2 className="text-3xl font-extrabold text-white">¡Expediente de Motorizado Enviado!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Tu solicitud ha sido radicada correctamente con estado{' '}
              <span className="text-amber-400 font-bold">PENDING_REVIEW</span> y pasará a revisión documental por el equipo de Governance.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-left max-w-md mx-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">ID de Solicitud:</span>
              <span className="text-cyan-400 font-bold">{appId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aspirante:</span>
              <span className="text-slate-200">
                {formData.personal.firstName} {formData.personal.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cédula:</span>
              <span className="text-slate-200">{formData.personal.nationalId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Placa:</span>
              <span className="text-indigo-400 font-bold">{formData.vehicle.plate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vehículo:</span>
              <span className="text-slate-200">
                {formData.vehicle.brand} {formData.vehicle.model} ({formData.vehicle.year}) - {formData.vehicle.color}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/courier/status"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30"
            >
              Consultar Estado de mi Solicitud
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
            >
              Ir al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg">
            <Bike className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Registro de Motorizado
              </h1>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-extrabold uppercase">
                Fleet Core
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              Únete a la flota oficial de BlueSystem Delivery Enterprise. Completa el expediente digital.
            </p>
          </div>
        </div>
      </div>

      {generalError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs md:text-sm flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">1. Información Básica</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nombres *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Aldrich"
                value={formData.personal.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, firstName: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Apellidos *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Flores"
                value={formData.personal.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, lastName: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Teléfono de Contacto (WhatsApp) *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 88888888"
                value={formData.personal.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, phone: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                placeholder="repartidor@ejemplo.com"
                value={formData.personal.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, email: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Departamento *
              </label>
              <select
                value={formData.personal.departmentId || 'MANAGUA'}
                onChange={handleDepartmentChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
              >
                {NICARAGUA_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Ciudad / Municipio *
              </label>
              <select
                value={formData.personal.municipalityId || ''}
                onChange={handleMunicipalityChange}
                disabled={!formData.personal.departmentId}
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans ${
                  formData.personal.departmentId ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed text-gray-500'
                }`}
              >
                {availableMunicipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Número de Cédula de Identidad *
              </label>
              <input
                type="text"
                required
                placeholder="001-XXXXXX-XXXXX"
                value={formData.personal.nationalId}
                onChange={(e) => handleNationalIdChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Ingresa el número completo de tu documento de identidad nacional sin abreviaturas.
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2 & 3: DOCUMENTOS DE IDENTIDAD Y FOTO DE PERFIL */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">2. Identidad & Fotografía Personal</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderUploadCard(
              'idFront',
              'Cédula — Frente',
              'Fotografía clara de la parte frontal de tu cédula.'
            )}
            {renderUploadCard(
              'idBack',
              'Cédula — Reverso',
              'Fotografía clara del reverso de tu cédula.'
            )}
            {renderUploadCard(
              'profilePhoto',
              'Foto de Perfil',
              'Fotografía tipo pasaporte o rostro despejado para tu perfil de repartidor.'
            )}
          </div>
        </section>

        {/* SECCIÓN 4: DATOS DE LA MOTOCICLETA */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Bike className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">3. Datos de la Motocicleta</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Marca (Select con marcas populares + Opción OTRO) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Marca *
              </label>
              <select
                required
                value={selectedBrand}
                onChange={handleBrandSelectChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
              >
                <option value="">-- Seleccionar Marca --</option>
                {POPULAR_MOTORCYCLE_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand === 'OTRO' ? 'Otros (Escribir otra marca...)' : brand}
                  </option>
                ))}
              </select>
              {selectedBrand === 'OTRO' && (
                <div className="mt-2.5 animate-fadeIn">
                  <input
                    type="text"
                    required
                    placeholder="Escribe la marca de tu moto *"
                    value={customBrand}
                    onChange={handleCustomBrandChange}
                    className="w-full bg-slate-950 border border-indigo-500/60 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-sans shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* 2. Modelo (Texto libre) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Modelo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Pulsar 150, Boxer, FZ-S"
                value={formData.vehicle.model}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, model: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {/* 3. Año (Select desde 1990 hasta el año actual del sistema) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Año *
              </label>
              <select
                required
                value={formData.vehicle.year || ''}
                onChange={handleYearChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
              >
                <option value="">-- Seleccionar Año --</option>
                {MOTORCYCLE_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Color (Select con ~10 colores básicos + Opción OTRO) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Color *
              </label>
              <select
                required
                value={selectedColor}
                onChange={handleColorSelectChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
              >
                <option value="">-- Seleccionar Color --</option>
                {BASIC_MOTORCYCLE_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color === 'OTRO' ? 'Otros (Escribir color específico...)' : color}
                  </option>
                ))}
              </select>
              {selectedColor === 'OTRO' && (
                <div className="mt-2.5 animate-fadeIn">
                  <input
                    type="text"
                    required
                    placeholder="Escribe el color específico *"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="w-full bg-slate-950 border border-indigo-500/60 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-sans shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* 5. Número de Placa */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Número de Placa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: M123456"
                value={formData.vehicle.plate}
                onChange={(e) => handlePlateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono font-bold tracking-widest uppercase"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN 5 & 6: DOCUMENTACIÓN DE LA MOTO Y LICENCIA */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">4. Documentación del Vehículo & Licencia</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderUploadCard(
              'registration',
              'Circulación de Moto',
              'Documento oficial de circulación o tarjeta de propiedad.'
            )}
            {renderUploadCard(
              'insurance',
              'Seguro Vigente',
              'Póliza o certificado de seguro obligatorio actualizado.'
            )}
            {renderUploadCard(
              'driverLicense',
              'Licencia de Conducir',
              'Licencia oficial vigente para conducción de motocicleta.'
            )}
          </div>
        </section>

        {/* SECCIÓN 7: ACEPTACIÓN DE TÉRMINOS Y ENVÍO */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-400">
              Declaro que toda la información y documentación provista es verídica, vigente y legítima.
              Acepto los términos de afiliación y las directivas de seguridad operativa de{' '}
              <strong className="text-white">BlueSystem Delivery Enterprise</strong>.
            </span>
          </label>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[11px] text-slate-500 font-mono">
              Expediente: <span className="text-cyan-400 font-bold">{appId}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando y Enviando Expediente...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Solicitud de Registro</span>
                </>
              )}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};
