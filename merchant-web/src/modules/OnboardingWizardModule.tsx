import React, { useState, useEffect } from 'react';
import { 
  Building2, Image as ImageIcon, MapPin, Clock, Truck, Landmark, 
  UtensilsCrossed, ClipboardCheck, ArrowRight, ArrowLeft, 
  Upload, CheckCircle2, AlertCircle, Sparkles, Loader2, Globe
} from 'lucide-react';
import { db, storage } from '../shared/services/firebase';
import { 
  doc, 
  getDoc, 
  getDocs,
  collection, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../shared/context/AuthContext';
import { 
  WizardState, 
  validateMerchantOnboarding, 
  OnboardingValidationReport 
} from '../shared/utils/onboardingValidator';
import {
  NICARAGUA_DEPARTMENTS,
  getMunicipalities,
  getDepartmentName,
  getMunicipalityName,
} from '../shared/constants/geoCatalog';

interface OnboardingWizardModuleProps {
  businessId?: string;
  onWizardCompleted?: () => void;
}

const STEPS = [
  { id: 1, label: 'Información', icon: Building2, desc: 'Datos del comercio' },
  { id: 2, label: 'Identidad Visual', icon: ImageIcon, desc: 'Logo y portada' },
  { id: 3, label: 'Sucursal & GPS', icon: MapPin, desc: 'Ubicación física' },
  { id: 4, label: 'Horarios', icon: Clock, desc: 'Atención semanal' },
  { id: 5, label: 'Delivery', icon: Truck, desc: 'Logística de envíos' },
  { id: 6, label: 'Finanzas', icon: Landmark, desc: 'Datos de cobro' },
  { id: 7, label: 'Menú & Producto', icon: UtensilsCrossed, desc: 'Catálogo inicial' },
  { id: 8, label: 'Revisión & Activar', icon: ClipboardCheck, desc: 'Validación final' },
];

export const OnboardingWizardModule: React.FC<OnboardingWizardModuleProps> = ({
  businessId,
  onWizardCompleted,
}) => {
  const { identity } = useAuth();
  const activeBusinessId = businessId || identity?.businessId || '';
  const activeBranchId = identity?.branchId || '';
  const activeOrgId = identity?.orgId || '';
  const activeUid = identity?.uid || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Categorías comerciales dinámicas sincronizadas con el Panel Admin (/categories)
  const [businessCategories, setBusinessCategories] = useState<Array<{ id: string; name: string; slug?: string; icon?: string }>>([]);

  // Estado del Onboarding
  const [wizardData, setWizardData] = useState<WizardState>({
    businessName: '',
    category: 'Restaurante',
    phone: '',
    email: '',
    description: '',

    logoUrl: '',
    coverUrl: '',

    branchName: 'Sucursal Principal',
    departmentId: 'MANAGUA',
    departmentName: 'Managua',
    municipalityId: 'MANAGUA',
    municipalityName: 'Managua',
    city: 'Managua',
    zone: '',
    address: '',
    latitude: 12.136389,
    longitude: -86.251389,
    coverageRadiusKm: 5,

    schedule: {
      lunes: { open: '08:00', close: '22:00', isOpen: true },
      martes: { open: '08:00', close: '22:00', isOpen: true },
      miercoles: { open: '08:00', close: '22:00', isOpen: true },
      jueves: { open: '08:00', close: '22:00', isOpen: true },
      viernes: { open: '08:00', close: '23:00', isOpen: true },
      sabado: { open: '09:00', close: '23:00', isOpen: true },
      domingo: { open: '09:00', close: '21:00', isOpen: false },
    },

    deliveryFee: 35,
    maxDeliveryRadiusKm: 5,
    kitchenPrepTimeMinutes: 15,

    bankName: 'BAC Credomatic',
    accountNumber: '',
    accountHolder: '',
    accountType: 'CORRIENTE',
    acceptedPayments: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],

    categoryName: 'Especialidades',
    productName: '',
    productPrice: 150,
    productDescription: '',
    productImageUrl: '',
  });

  // Cargar categorías comerciales dinámicas de Firestore /categories (gestionadas en Admin Web)
  useEffect(() => {
    const loadDynamicCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const list: Array<{ id: string; name: string; slug?: string; icon?: string }> = [];
        snap.forEach((d) => {
          const data = d.data();
          const isBusiness = !data.type || data.type === 'BUSINESS' || data.type === 'BOTH';
          const isActive = data.active !== false;
          const isGlobal = !data.businessId; // Solo categorías globales del sistema, no de catálogo particular
          if (isBusiness && isActive && isGlobal && data.name) {
            list.push({
              id: d.id,
              name: data.name,
              slug: data.slug || d.id,
              icon: data.icon || '🏪',
            });
          }
        });

        if (list.length === 0) {
          list.push(
            { id: 'cat_rest', name: 'Restaurantes', slug: 'restaurantes', icon: '🍔' },
            { id: 'cat_tiendas', name: 'Tiendas', slug: 'tiendas', icon: '🏪' },
            { id: 'cat_super', name: 'Supermercados', slug: 'supermercados', icon: '🛒' },
            { id: 'cat_farma', name: 'Farmacias', slug: 'farmacias', icon: '💊' },
            { id: 'cat_cafe', name: 'Cafeterías', slug: 'cafeterias', icon: '☕' },
            { id: 'cat_tecno', name: 'Tecnología', slug: 'tecnologia', icon: '💻' },
            { id: 'cat_pan', name: 'Panaderías', slug: 'panaderias', icon: '🥖' }
          );
        }

        list.sort((a, b) => a.name.localeCompare(b.name));
        setBusinessCategories(list);
      } catch (err) {
        console.warn('Error fetching dynamic categories in OnboardingWizard:', err);
      }
    };
    loadDynamicCategories();
  }, []);

  // Carga de datos existentes desde Firestore
  useEffect(() => {
    if (!activeBusinessId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const busDoc = await getDoc(doc(db, 'businesses', activeBusinessId));
        if (busDoc.exists()) {
          const busData = busDoc.data();
          const deptId = busData.departmentId || 'MANAGUA';
          const muniId = busData.municipalityId || 'MANAGUA';
          setWizardData((prev) => ({
            ...prev,
            businessName: busData.name || busData.comercioNombre || prev.businessName,
            phone: busData.phone || busData.telefono || prev.phone,
            email: busData.email || prev.email,
            category: (() => {
              const raw = (busData.category || busData.categoria || '').trim();
              if (!raw) return prev.category;
              const catMap: Record<string, string> = {
                tienda: 'Tiendas',
                tiendas: 'Tiendas',
                restaurante: 'Restaurantes',
                restaurantes: 'Restaurantes',
                farmacia: 'Farmacias',
                farmacias: 'Farmacias',
                supermercado: 'Supermercados',
                supermercados: 'Supermercados',
                cafeteria: 'Cafeterías',
                cafeterias: 'Cafeterías',
                panaderia: 'Panaderías',
                panaderias: 'Panaderías',
                tecnologia: 'Tecnología',
              };
              return catMap[raw.toLowerCase()] || raw;
            })(),
            description: busData.description || busData.descripcion || prev.description,
            departmentId: deptId,
            departmentName: busData.departmentName || getDepartmentName(deptId),
            municipalityId: muniId,
            municipalityName: busData.municipalityName || getMunicipalityName(deptId, muniId),
            city: busData.city || busData.municipalityName || prev.city,
            zone: busData.zone || prev.zone,
            address: busData.address || busData.direccion || prev.address,
            logoUrl: busData.logoUrl || busData.photoUrl || prev.logoUrl,
            coverUrl: busData.coverUrl || busData.bannerUrl || busData.portadaUrl || prev.coverUrl,
            deliveryFee: busData.deliveryFee ?? busData.costoEnvioBase ?? prev.deliveryFee,
          }));

          if (busData.location?.latitude || busData.location?._latitude) {
            setWizardData((prev) => ({
              ...prev,
              latitude: busData.location.latitude ?? busData.location._latitude,
              longitude: busData.location.longitude ?? busData.location._longitude,
            }));
          }
        }

        const settingsDoc = await getDoc(doc(db, 'restaurant_settings', activeBusinessId));
        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data();
          setWizardData((prev) => ({
            ...prev,
            bankName: settingsData.bankName || prev.bankName,
            accountNumber: settingsData.accountNumber || prev.accountNumber,
            accountHolder: settingsData.accountHolder || prev.accountHolder,
            accountType: settingsData.accountType || prev.accountType,
            acceptedPayments: settingsData.acceptedPayments || prev.acceptedPayments,
            schedule: settingsData.schedule || prev.schedule,
            deliveryFee: settingsData.deliveryFee ?? prev.deliveryFee,
            maxDeliveryRadiusKm: settingsData.maxDeliveryRadiusKm ?? prev.maxDeliveryRadiusKm,
            kitchenPrepTimeMinutes: settingsData.kitchenPrepTimeMinutes ?? prev.kitchenPrepTimeMinutes,
          }));
        }

        // Cargar datos de sucursal si existe
        if (activeBranchId) {
          const branchDoc = await getDoc(doc(db, 'branches', activeBranchId));
          if (branchDoc.exists()) {
            const brData = branchDoc.data();
            setWizardData((prev) => ({
              ...prev,
              branchName: brData.name || prev.branchName,
              address: brData.address || prev.address,
              city: brData.city || prev.city,
              zone: brData.zone || prev.zone,
              coverageRadiusKm: brData.coverageRadiusKm ?? prev.coverageRadiusKm,
            }));
          }
        }
      } catch (err) {
        console.error("Error cargando datos de onboarding:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeBusinessId, activeBranchId]);

  const updateField = (field: keyof WizardState, value: any) => {
    setWizardData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSchedule = (day: string, field: 'open' | 'close' | 'isOpen', value: any) => {
    setWizardData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value
        }
      }
    }));
  };

  // Subida de imagen a Firebase Storage cumpliendo ADR-006
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'logoUrl' | 'coverUrl' | 'productImageUrl') => {
    const file = e.target.files?.[0];
    if (!file || !activeBusinessId) return;

    // Validación de tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    setUploadingField(targetField);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `commerce_assets/${activeBusinessId}/${targetField}_${timestamp}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          businessId: activeBusinessId,
          field: targetField,
          uploadedBy: activeUid
        }
      });

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Error subiendo imagen a Storage:", error);
          alert('Error al subir la imagen. Reintenta.');
          setUploadingField(null);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          updateField(targetField, downloadUrl);
          setUploadingField(null);
          setSaveSuccessMsg(`Imagen guardada exitosamente.`);
          setTimeout(() => setSaveSuccessMsg(null), 3000);
        }
      );
    } catch (err: any) {
      console.error("Error en pipeline de subida:", err);
      alert('Error en la subida.');
      setUploadingField(null);
    }
  };

  const validationReport: OnboardingValidationReport = validateMerchantOnboarding(wizardData);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 8));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Activación Atómica y Completa
  const handleActivateCommerce = async () => {
    if (!activeBusinessId) {
      alert("No se encontró el ID de tu comercio.");
      return;
    }

    if (!validationReport.complete) {
      alert("Debes completar todas las secciones obligatorias antes de activar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();
      const resolvedBranchId = activeBranchId || `br_${Date.now()}`;
      const categoryId = `cat_${activeBusinessId}_${Date.now()}`;
      const productId = `prod_${activeBusinessId}_${Date.now()}`;

      // 1. /businesses/{businessId}
      const busRef = doc(db, 'businesses', activeBusinessId);
      const deptId = wizardData.departmentId || 'MANAGUA';
      const muniId = wizardData.municipalityId || 'MANAGUA';
      const deptName = wizardData.departmentName || getDepartmentName(deptId);
      const muniName = wizardData.municipalityName || getMunicipalityName(deptId, muniId);
      const canonicalCity = muniName || wizardData.city || 'Managua';

      batch.update(busRef, {
        businessId: activeBusinessId,
        name: wizardData.businessName.trim(),
        comercioNombre: wizardData.businessName.trim(),
        nombre: wizardData.businessName.trim(),
        phone: wizardData.phone.trim(),
        telefono: wizardData.phone.trim(),
        description: wizardData.description.trim(),
        descripcion: wizardData.description.trim(),
        category: wizardData.category.trim(),
        categoria: wizardData.category.trim(),
        departmentId: deptId,
        departmentName: deptName,
        municipalityId: muniId,
        municipalityName: muniName,
        city: canonicalCity,
        zone: wizardData.zone.trim(),
        address: wizardData.address.trim(),
        direccion: wizardData.address.trim(),
        logoUrl: wizardData.logoUrl || null,
        photoUrl: wizardData.logoUrl || null,
        coverUrl: wizardData.coverUrl || null,
        bannerUrl: wizardData.coverUrl || null,
        portadaUrl: wizardData.coverUrl || null,
        deliveryFee: wizardData.deliveryFee,
        costoEnvioBase: wizardData.deliveryFee,
        isOpen: true,
        abierto: true,
        schedule: wizardData.schedule,
        weeklySchedule: wizardData.schedule,
        isActive: true,
        active: true,
        wizardCompleted: true,
        lifecycleStatus: 'ACTIVE',
        onboardingStatus: 'COMPLETED',
        onboardingCompletedAt: now,
        branchIds: [resolvedBranchId],
        updatedAt: now,
      });

      // 2. /branches/{branchId}
      const branchRef = doc(db, 'branches', resolvedBranchId);
      batch.set(branchRef, {
        branchId: resolvedBranchId,
        businessId: activeBusinessId,
        orgId: activeOrgId || null,
        name: wizardData.branchName.trim(),
        departmentId: deptId,
        departmentName: deptName,
        municipalityId: muniId,
        municipalityName: muniName,
        address: wizardData.address.trim(),
        city: canonicalCity,
        zone: wizardData.zone.trim(),
        location: {
          latitude: wizardData.latitude,
          longitude: wizardData.longitude
        },
        phone: wizardData.phone.trim(),
        coverageRadiusKm: wizardData.coverageRadiusKm,
        deliveryFee: wizardData.deliveryFee,
        isPrimary: true,
        isActive: true,
        active: true,
        isOpen: true,
        abierto: true,
        schedule: wizardData.schedule,
        weeklySchedule: wizardData.schedule,
        updatedAt: now,
      }, { merge: true });

      // 3. /restaurant_settings/{businessId}
      const settingsRef = doc(db, 'restaurant_settings', activeBusinessId);
      batch.set(settingsRef, {
        restaurantId: activeBusinessId,
        commercialName: wizardData.businessName.trim(),
        legalName: wizardData.businessName.trim(),
        phone: wizardData.phone.trim(),
        departmentId: deptId,
        departmentName: deptName,
        municipalityId: muniId,
        municipalityName: muniName,
        address: wizardData.address.trim(),
        city: canonicalCity,
        zone: wizardData.zone.trim(),
        bankName: wizardData.bankName.trim(),
        accountNumber: wizardData.accountNumber.trim(),
        accountHolder: wizardData.accountHolder.trim(),
        accountType: wizardData.accountType,
        acceptedPayments: wizardData.acceptedPayments,
        schedule: wizardData.schedule,
        isOpen: true,
        deliveryFee: wizardData.deliveryFee,
        maxDeliveryRadiusKm: wizardData.maxDeliveryRadiusKm,
        kitchenPrepTimeMinutes: wizardData.kitchenPrepTimeMinutes,
        autoAcceptOrders: false,
        printReceiptOnOrder: false,
        version: 1,
        updatedAt: now,
      }, { merge: true });

      // 4. /categories/{categoryId}
      const catRef = doc(db, 'categories', categoryId);
      batch.set(catRef, {
        id: categoryId,
        businessId: activeBusinessId,
        name: wizardData.categoryName.trim(),
        nombre: wizardData.categoryName.trim(),
        description: 'Categoría inicial de catálogo',
        active: true,
        order: 1,
        createdAt: now,
        updatedAt: now
      });

      // 5. /products/{productId}
      const prodRef = doc(db, 'products', productId);
      batch.set(prodRef, {
        id: productId,
        businessId: activeBusinessId,
        name: wizardData.productName.trim(),
        nombre: wizardData.productName.trim(),
        price: wizardData.productPrice,
        precio: wizardData.productPrice,
        category: wizardData.categoryName.trim(),
        categoria: wizardData.categoryName.trim(),
        categoryId: categoryId,
        description: wizardData.productDescription.trim(),
        imageUrl: wizardData.productImageUrl || null,
        isAvailable: true,
        available: true,
        active: true,
        stockStatus: 'AVAILABLE',
        createdAt: now,
        updatedAt: now,
      });

      // 6. /audit_events/{auto}
      const auditRef = doc(collection(db, 'audit_events'));
      batch.set(auditRef, {
        event: 'BUSINESS_ACTIVATED',
        domain: 'COMMERCE_OPERATIONS',
        uid: activeUid,
        actorUid: activeUid,
        businessId: activeBusinessId,
        orgId: activeOrgId,
        branchId: resolvedBranchId,
        triggeredBy: 'MERCHANT_OWNER',
        correlationId: `act_${Date.now()}`,
        metadata: {
          businessName: wizardData.businessName,
          productName: wizardData.productName,
          completionPercentage: validationReport.completionPercentage
        },
        timestamp: now
      });

      // Ejecución Atómica
      await batch.commit();

      setIsFinished(true);
    } catch (err: any) {
      console.error("Error al activar comercio:", err);
      alert(`Error de activación: ${err.message || 'Intenta de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
            Cargando configuración del comercio...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de éxito post-activación
  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 animate-bounce">
          <Sparkles className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white">¡Comercio Activado con Éxito!</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            <span className="text-white font-bold">{wizardData.businessName}</span> está oficialmente configurado y listo para recibir pedidos en tiempo real.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => {
              if (onWizardCompleted) {
                onWizardCompleted();
              } else {
                window.location.reload();
              }
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm"
          >
            <span>Ir al Panel de Control</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header & Progress Bar */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Paso {currentStep} de 8
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {validationReport.completionPercentage}% completado
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              Configuración y Activación Comercial
            </h1>
            <p className="text-xs text-slate-400">
              Completa los datos esenciales para poner en marcha tu negocio en BlueSystem.
            </p>
          </div>

          <div className="w-full sm:w-48 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1.5 font-mono">
              <span>Progreso</span>
              <span className={validationReport.complete ? 'text-emerald-400' : 'text-blue-400'}>
                {validationReport.completionPercentage}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${validationReport.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-6 mt-6 border-t border-slate-800/80">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = s.id === currentStep;
            const isPast = s.id < currentStep;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex flex-col items-center p-2 rounded-xl transition text-center ${
                  isCurrent 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : isPast 
                    ? 'text-emerald-400 hover:bg-slate-800/50' 
                    : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'
                }`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1">
                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-bold truncate w-full">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl flex items-center gap-2 text-xs text-emerald-400 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Step Content Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* PASO 1: Información Comercial */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span>1. Información Comercial</span>
              </h2>
              <p className="text-xs text-slate-400">Datos públicos de tu establecimiento</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre Comercial *</label>
                <input
                  type="text"
                  value={wizardData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="Ej. El Chanchito"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Categoría *</label>
                <select
                  value={wizardData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="">Selecciona una categoría...</option>
                  {businessCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </option>
                  ))}
                  {/* Preservar categoría actual si no coincide con los nombres de la lista */}
                  {wizardData.category && !businessCategories.some((c) => c.name.toLowerCase() === wizardData.category.toLowerCase()) && (
                    <option value={wizardData.category}>
                      🏪 {wizardData.category}
                    </option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Teléfono de Contacto *</label>
                <input
                  type="text"
                  value={wizardData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+505 8888 8888"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Correo Electrónico</label>
                <input
                  type="email"
                  value={wizardData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contacto@mi-comercio.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-300">Descripción del Negocio</label>
                <textarea
                  value={wizardData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  placeholder="Describe tus especialidades, historia o propuesta de valor..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: Identidad Visual */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                <span>2. Identidad Visual (ADR-006)</span>
              </h2>
              <p className="text-xs text-slate-400">Logotipo y banner de portada para clientes</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <label className="text-xs font-bold text-slate-300 block">Logo del Comercio</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {wizardData.logoUrl ? (
                      <img src={wizardData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition shadow">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'logoUrl')} 
                        className="hidden" 
                        disabled={uploadingField !== null}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">Recomendado 500x500 px (PNG/JPG)</p>
                  </div>
                </div>
                {uploadingField === 'logoUrl' && (
                  <div className="text-[10px] text-blue-400 font-mono">Subiendo: {uploadProgress}%</div>
                )}
              </div>

              {/* Cover Upload */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <label className="text-xs font-bold text-slate-300 block">Portada / Banner Principal</label>
                <div className="h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                  {wizardData.coverUrl ? (
                    <img src={wizardData.coverUrl} alt="Portada" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition border border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Portada</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'coverUrl')} 
                      className="hidden" 
                      disabled={uploadingField !== null}
                    />
                  </label>
                  {uploadingField === 'coverUrl' && (
                    <span className="text-[10px] text-blue-400 font-mono">Subiendo: {uploadProgress}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Sucursal & GPS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span>3. Sucursal Principal & Geolocalización GPS</span>
              </h2>
              <p className="text-xs text-slate-400">Ubicación exacta para despacho de pedidos</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre de Sucursal *</label>
                <input
                  type="text"
                  value={wizardData.branchName}
                  onChange={(e) => updateField('branchName', e.target.value)}
                  placeholder="Sucursal Principal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Departamento *</span>
                </label>
                <select
                  value={wizardData.departmentId || 'MANAGUA'}
                  onChange={(e) => {
                    const newDeptId = e.target.value;
                    const deptName = getDepartmentName(newDeptId);
                    setWizardData((prev) => ({
                      ...prev,
                      departmentId: newDeptId,
                      departmentName: deptName,
                      municipalityId: '',
                      municipalityName: '',
                      city: '',
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                >
                  <option value="" disabled>Seleccionar departamento</option>
                  {NICARAGUA_DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>Municipio *</span>
                </label>
                <select
                  value={wizardData.municipalityId || ''}
                  disabled={!wizardData.departmentId}
                  onChange={(e) => {
                    const newMuniId = e.target.value;
                    const muniName = getMunicipalityName(wizardData.departmentId, newMuniId);
                    setWizardData((prev) => ({
                      ...prev,
                      municipalityId: newMuniId,
                      municipalityName: muniName,
                      city: muniName || newMuniId,
                    }));
                  }}
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono ${
                    !wizardData.departmentId ? 'opacity-50 cursor-not-allowed text-slate-500' : 'cursor-pointer'
                  }`}
                >
                  <option value="" disabled>
                    {wizardData.departmentId ? 'Seleccionar municipio' : 'Seleccione primero un departamento'}
                  </option>
                  {getMunicipalities(wizardData.departmentId).map((muni) => (
                    <option key={muni.id} value={muni.id}>
                      {muni.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Zona / Sector (Opcional)</label>
                <input
                  type="text"
                  value={wizardData.zone}
                  onChange={(e) => updateField('zone', e.target.value)}
                  placeholder="Ej. Villa Fontana, Altamira"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Radio de Cobertura (km)</label>
                <input
                  type="number"
                  value={wizardData.coverageRadiusKm}
                  onChange={(e) => updateField('coverageRadiusKm', parseFloat(e.target.value) || 5)}
                  min={1}
                  max={30}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-300">Dirección Exacta *</label>
                <textarea
                  value={wizardData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={2}
                  placeholder="Calle, número, puntos de referencia..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Latitud GPS *</label>
                <input
                  type="number"
                  step="any"
                  value={wizardData.latitude}
                  onChange={(e) => updateField('latitude', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Longitud GPS *</label>
                <input
                  type="number"
                  step="any"
                  value={wizardData.longitude}
                  onChange={(e) => updateField('longitude', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: Horarios */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span>4. Horarios de Atención Semanal</span>
              </h2>
              <p className="text-xs text-slate-400">Configura los días y turnos de apertura para pedidos</p>
            </div>

            <div className="space-y-3">
              {Object.keys(wizardData.schedule).map((dayKey) => {
                const day = wizardData.schedule[dayKey];
                const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
                return (
                  <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl gap-3">
                    <div className="flex items-center gap-3 w-32">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) => updateSchedule(dayKey, 'isOpen', e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                      />
                      <span className={`text-xs font-bold ${day.isOpen ? 'text-white' : 'text-slate-500'}`}>
                        {dayName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e) => updateSchedule(dayKey, 'open', e.target.value)}
                        disabled={!day.isOpen}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono disabled:opacity-30"
                      />
                      <span className="text-xs text-slate-500">a</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e) => updateSchedule(dayKey, 'close', e.target.value)}
                        disabled={!day.isOpen}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono disabled:opacity-30"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 5: Delivery */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <span>5. Parámetros de Delivery & Cocina</span>
              </h2>
              <p className="text-xs text-slate-400">Tarifas base y tiempos operativos</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Costo Base de Envío (C$)</label>
                <input
                  type="number"
                  value={wizardData.deliveryFee}
                  onChange={(e) => updateField('deliveryFee', parseFloat(e.target.value) || 0)}
                  min={0}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Radio Máximo (km)</label>
                <input
                  type="number"
                  value={wizardData.maxDeliveryRadiusKm}
                  onChange={(e) => updateField('maxDeliveryRadiusKm', parseFloat(e.target.value) || 5)}
                  min={1}
                  max={30}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Tiempo de Preparación (min)</label>
                <input
                  type="number"
                  value={wizardData.kitchenPrepTimeMinutes}
                  onChange={(e) => updateField('kitchenPrepTimeMinutes', parseInt(e.target.value, 10) || 15)}
                  min={5}
                  max={120}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 6: Finanzas */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-400" />
                <span>6. Liquidación Financiera & Métodos de Pago</span>
              </h2>
              <p className="text-xs text-slate-400">Cuenta bancaria para recepción de pagos por pedidos</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Banco *</label>
                <select
                  value={wizardData.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="BAC Credomatic">BAC Credomatic</option>
                  <option value="Banco Lafise">Banco Lafise Bancentro</option>
                  <option value="Banpro">Banpro Grupo Promerica</option>
                  <option value="BDF">Banco de Finanzas (BDF)</option>
                  <option value="Avanz">Banco Avanz</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Tipo de Cuenta *</label>
                <select
                  value={wizardData.accountType}
                  onChange={(e) => updateField('accountType', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="CORRIENTE">Cuenta Corriente</option>
                  <option value="AHORRO">Cuenta de Ahorro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Número de Cuenta *</label>
                <input
                  type="text"
                  value={wizardData.accountNumber}
                  onChange={(e) => updateField('accountNumber', e.target.value)}
                  placeholder="360000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Titular de la Cuenta *</label>
                <input
                  type="text"
                  value={wizardData.accountHolder}
                  onChange={(e) => updateField('accountHolder', e.target.value)}
                  placeholder="Nombre de la empresa o propietario"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PASO 7: Menú & Primer Producto */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-blue-400" />
                <span>7. Menú & Primer Producto del Catálogo</span>
              </h2>
              <p className="text-xs text-slate-400">Crea tu primera categoría y producto para iniciar ventas</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre de la Categoría *</label>
                <input
                  type="text"
                  value={wizardData.categoryName}
                  onChange={(e) => updateField('categoryName', e.target.value)}
                  placeholder="Ej. Platos Fuertes, Bebidas, Promociones"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nombre del Producto *</label>
                  <input
                    type="text"
                    value={wizardData.productName}
                    onChange={(e) => updateField('productName', e.target.value)}
                    placeholder="Ej. Hamburguesa Especial con Papas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Precio de Venta (C$) *</label>
                  <input
                    type="number"
                    value={wizardData.productPrice}
                    onChange={(e) => updateField('productPrice', parseFloat(e.target.value) || 0)}
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Descripción del Producto</label>
                <textarea
                  value={wizardData.productDescription}
                  onChange={(e) => updateField('productDescription', e.target.value)}
                  rows={2}
                  placeholder="Ingredientes, acompañamientos o especificaciones..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Product Image Upload */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {wizardData.productImageUrl ? (
                      <img src={wizardData.productImageUrl} alt="Producto" className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Foto del Producto</span>
                    <span className="text-[10px] text-slate-500 font-mono">PNG o JPG</span>
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl cursor-pointer transition border border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{wizardData.productImageUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'productImageUrl')} 
                      className="hidden" 
                      disabled={uploadingField !== null}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 8: Revisión & Activación */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-400" />
                <span>8. Revisión General & Checklist de Activación</span>
              </h2>
              <p className="text-xs text-slate-400">Verifica que todos los componentes requeridos estén listos</p>
            </div>

            {/* Checklist Visual Interactivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(validationReport.sections).map(([key, val]) => (
                <div 
                  key={key} 
                  className={`p-3 rounded-2xl border flex items-start gap-3 ${
                    val.isComplete 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {val.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider block">
                      {key}
                    </span>
                    <span className="text-[11px] opacity-80 block font-mono">
                      {val.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen Final */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Comercio:</span>
                <span className="font-bold text-white">{wizardData.businessName || 'Sin definir'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sucursal:</span>
                <span>{wizardData.branchName} ({wizardData.city})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tarifa Envío:</span>
                <span>C$ {wizardData.deliveryFee}.00 ({wizardData.maxDeliveryRadiusKm} km)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Producto Inicial:</span>
                <span>{wizardData.productName} (C$ {wizardData.productPrice}.00)</span>
              </div>
            </div>

            {/* Botón de Activación Atómica */}
            <div className="pt-4">
              <button
                onClick={handleActivateCommerce}
                disabled={!validationReport.complete || isSubmitting}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-xl ${
                  validationReport.complete && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20 active:scale-[0.99]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Activando Comercio en Firestore...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>🚀 Activar Comercio & Publicar Catálogo</span>
                  </>
                )}
              </button>
              {!validationReport.complete && (
                <p className="text-center text-[11px] text-rose-400 font-mono mt-2">
                  Completa todos los requisitos marcados con alerta antes de activar.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800/80">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          {currentStep < 8 && (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
