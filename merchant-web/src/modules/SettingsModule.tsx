import React, { useEffect, useState } from 'react';
import { 
  Building, 
  Clock, 
  CheckCircle2, 
  Save, 
  Store, 
  Truck, 
  CreditCard, 
  Upload, 
  AlertTriangle, 
  DollarSign,
  MapPin, 
  Sliders, 
  Calendar, 
  Image as ImageIcon,
  Copy,
  Zap,
  FileText,
  Navigation,
  ExternalLink,
  Compass
} from 'lucide-react';
import { db, storage } from '../shared/services/firebase';
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query,
  where,
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../shared/context/AuthContext';

interface ScheduleDay {
  open: string;
  close: string;
  isOpen: boolean;
}

interface WeeklySchedule {
  lunes: ScheduleDay;
  martes: ScheduleDay;
  miercoles: ScheduleDay;
  jueves: ScheduleDay;
  viernes: ScheduleDay;
  sabado: ScheduleDay;
  domingo: ScheduleDay;
}

interface MerchantSettingsState {
  // Comercial
  commercialName: string;
  legalName: string;
  taxId: string;
  category: string;
  phone: string;
  email: string;
  description: string;
  logoUrl: string;
  coverUrl: string;

  // Ubicación básica y Coordenadas GPS
  address: string;
  city: string;
  zone: string;
  latitude: number;
  longitude: number;

  // Operaciones & Delivery
  isOpen: boolean;
  deliveryFee: number;
  maxDeliveryRadiusKm: number;
  kitchenPrepTimeMinutes: number;
  autoAcceptOrders: boolean;
  printReceiptOnOrder: boolean;

  // Horarios
  schedule: WeeklySchedule;

  // Banca & Pagos
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  accountType: 'AHORRO' | 'CORRIENTE';
  acceptedPayments: string[];
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  lunes: { open: '08:00', close: '22:00', isOpen: true },
  martes: { open: '08:00', close: '22:00', isOpen: true },
  miercoles: { open: '08:00', close: '22:00', isOpen: true },
  jueves: { open: '08:00', close: '22:00', isOpen: true },
  viernes: { open: '08:00', close: '23:00', isOpen: true },
  sabado: { open: '09:00', close: '23:00', isOpen: true },
  domingo: { open: '09:00', close: '21:00', isOpen: false },
};

const BANK_OPTIONS = [
  'BAC Credomatic',
  'Banco Lafise Bancentro',
  'Banpro Grupo Promerica',
  'Banco Ficohsa Nicaragua',
  'Banco de Fomento a la Producción (BDF)',
  'Avanz',
  'Otro Banco / Billetera Digital'
];

export const SettingsModule: React.FC = () => {
  const { identity } = useAuth();
  const merchantId = identity?.businessId || '';

  const [activeTab, setActiveTab] = useState<'general' | 'operations' | 'schedule' | 'banking'>('general');

  const [settings, setSettings] = useState<MerchantSettingsState>({
    commercialName: '',
    legalName: '',
    taxId: '',
    category: '',
    phone: '',
    email: '',
    description: '',
    logoUrl: '',
    coverUrl: '',
    address: '',
    city: '',
    zone: '',
    latitude: 12.136389,
    longitude: -86.251389,
    isOpen: true,
    deliveryFee: 35,
    maxDeliveryRadiusKm: 5,
    kitchenPrepTimeMinutes: 15,
    autoAcceptOrders: false,
    printReceiptOnOrder: false,
    schedule: DEFAULT_SCHEDULE,
    bankName: 'BAC Credomatic',
    accountNumber: '',
    accountHolder: '',
    accountType: 'CORRIENTE',
    acceptedPayments: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],
  });

  const [businessCategories, setBusinessCategories] = useState<Array<{ id: string; name: string; icon?: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingField, setUploadingField] = useState<'logoUrl' | 'coverUrl' | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);

  // 1. Cargar categorías comerciales dinámicas de /categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        const list: Array<{ id: string; name: string; icon?: string }> = [];
        catSnap.forEach((d) => {
          const data = d.data();
          const isBusiness = !data.type || data.type === 'BUSINESS' || data.type === 'BOTH';
          const isActive = data.active !== false;
          const isGlobal = !data.businessId;
          if (isBusiness && isActive && isGlobal && data.name) {
            list.push({
              id: d.id,
              name: data.name,
              icon: data.icon || '🏪',
            });
          }
        });
        if (list.length === 0) {
          list.push(
            { id: 'cat_1', name: 'Restaurantes', icon: '🍔' },
            { id: 'cat_2', name: 'Tiendas', icon: '🏪' },
            { id: 'cat_3', name: 'Supermercados', icon: '🛒' },
            { id: 'cat_4', name: 'Farmacias', icon: '💊' },
            { id: 'cat_5', name: 'Cafeterías', icon: '☕' },
            { id: 'cat_6', name: 'Tecnología', icon: '💻' },
            { id: 'cat_7', name: 'Panaderías', icon: '🥖' }
          );
        }
        list.sort((a, b) => a.name.localeCompare(b.name));
        setBusinessCategories(list);
      } catch (err) {
        console.warn('Error loading dynamic categories in SettingsModule:', err);
      }
    };
    loadCategories();
  }, []);

  // 2. Escuchar y sincronizar datos de restaurant_settings y businesses
  useEffect(() => {
    if (!merchantId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [settingsDoc, bizDoc] = await Promise.all([
          getDoc(doc(db, 'restaurant_settings', merchantId)),
          getDoc(doc(db, 'businesses', merchantId))
        ]);

        if (!isMounted) return;

        const settsData = settingsDoc.exists() ? settingsDoc.data() : {};
        const bizData = bizDoc.exists() ? bizDoc.data() : {};

        // Normalización de categoría
        let rawCategory = bizData.category || bizData.categoria || settsData.category || '';
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
        if (catMap[rawCategory.toLowerCase()?.trim()]) {
          rawCategory = catMap[rawCategory.toLowerCase().trim()];
        }

        // Extracción resiliente de coordenadas GPS (Negocio -> Settings -> Sucursales)
        let initialLat = 12.136389;
        let initialLng = -86.251389;

        const rawLat = bizData.latitude ?? bizData.lat ?? bizData.location?.latitude ?? bizData.location?._latitude ?? bizData.coordenadas?.latitud ?? settsData.latitude ?? settsData.location?.latitude;
        const rawLng = bizData.longitude ?? bizData.lng ?? bizData.location?.longitude ?? bizData.location?._longitude ?? bizData.coordenadas?.longitud ?? settsData.longitude ?? settsData.location?.longitude;

        if (typeof rawLat === 'number' && rawLat !== 0 && !isNaN(rawLat)) {
          initialLat = rawLat;
        }
        if (typeof rawLng === 'number' && rawLng !== 0 && !isNaN(rawLng)) {
          initialLng = rawLng;
        }

        // Si todavía son las coordenadas por defecto, consultar en /branches si hay datos guardados
        if (initialLat === 12.136389 && initialLng === -86.251389) {
          try {
            const branchSnap = await getDocs(query(collection(db, 'branches'), where('businessId', '==', merchantId)));
            if (!branchSnap.empty) {
              const bData = branchSnap.docs[0].data();
              const bLat = bData.latitude ?? bData.lat ?? bData.location?.latitude ?? bData.location?._latitude;
              const bLng = bData.longitude ?? bData.lng ?? bData.location?.longitude ?? bData.location?._longitude;
              if (typeof bLat === 'number' && bLat !== 0 && !isNaN(bLat)) initialLat = bLat;
              if (typeof bLng === 'number' && bLng !== 0 && !isNaN(bLng)) initialLng = bLng;
            }
          } catch (e) {
            console.warn('Error leyendo coordenadas de branch:', e);
          }
        }

        setSettings({
          commercialName: bizData.name || bizData.comercioNombre || settsData.commercialName || '',
          legalName: bizData.legalName || settsData.legalName || bizData.name || '',
          taxId: bizData.taxId || bizData.ruc || settsData.taxId || '',
          category: rawCategory,
          phone: bizData.phone || bizData.telefono || settsData.phone || '',
          email: bizData.email || settsData.email || '',
          description: bizData.description || bizData.descripcion || '',
          logoUrl: bizData.logoUrl || bizData.photoUrl || '',
          coverUrl: bizData.coverUrl || bizData.bannerUrl || bizData.portadaUrl || '',
          address: bizData.address || bizData.direccion || settsData.address || '',
          city: bizData.city || settsData.city || '',
          zone: bizData.zone || settsData.zone || '',
          latitude: initialLat,
          longitude: initialLng,
          isOpen: settsData.isOpen ?? bizData.isOpen ?? true,
          deliveryFee: settsData.deliveryFee ?? bizData.deliveryFee ?? 35,
          maxDeliveryRadiusKm: settsData.maxDeliveryRadiusKm ?? 5,
          kitchenPrepTimeMinutes: settsData.kitchenPrepTimeMinutes ?? 15,
          autoAcceptOrders: settsData.autoAcceptOrders ?? false,
          printReceiptOnOrder: settsData.printReceiptOnOrder ?? false,
          schedule: settsData.schedule || DEFAULT_SCHEDULE,
          bankName: settsData.bankName || 'BAC Credomatic',
          accountNumber: settsData.accountNumber || '',
          accountHolder: settsData.accountHolder || '',
          accountType: settsData.accountType || 'CORRIENTE',
          acceptedPayments: settsData.acceptedPayments || ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],
        });
      } catch (err) {
        console.error('Error fetching settings in SettingsModule:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  // Actualizador genérico de campo
  const updateField = <K extends keyof MerchantSettingsState>(field: K, value: MerchantSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Autodetección de ubicación GPS mediante Geolocation API
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador o dispositivo no soporta geolocalización GPS.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        updateField('latitude', lat);
        updateField('longitude', lng);
        setFeedbackMsg({
          type: 'success',
          text: `Coordenadas GPS capturadas con éxito: [${lat}, ${lng}]. Recuerda guardar los cambios.`,
        });
        setTimeout(() => setFeedbackMsg(null), 4000);
      },
      (err) => {
        setIsDetectingGps(false);
        console.error('Error obteniendo geolocalización:', err);
        alert('No se pudo obtener la ubicación GPS: ' + err.message + '. Verifica que hayas otorgado permisos de ubicación a tu navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Actualizador de horarios
  const updateDaySchedule = (day: keyof WeeklySchedule, field: keyof ScheduleDay, value: any) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value,
        },
      },
    }));
  };

  // Copiar horario de lunes a todos los días laborales (martes a viernes)
  const copyWeekdaySchedule = () => {
    const monday = settings.schedule.lunes;
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        martes: { ...monday },
        miercoles: { ...monday },
        jueves: { ...monday },
        viernes: { ...monday },
      },
    }));
    setFeedbackMsg({
      type: 'success',
      text: 'Horario de Lunes replicado a Martes, Miércoles, Jueves y Viernes.',
    });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Toggle métodos de pago
  const togglePaymentMethod = (method: string) => {
    setSettings((prev) => {
      const current = prev.acceptedPayments || [];
      const exists = current.includes(method);
      const updated = exists ? current.filter((m) => m !== method) : [...current, method];
      return { ...prev, acceptedPayments: updated };
    });
  };

  // Subida de imagen a Firebase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'logoUrl' | 'coverUrl') => {
    const file = e.target.files?.[0];
    if (!file || !merchantId) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
      return;
    }

    setUploadingField(targetField);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const storagePath = `merchants/${merchantId}/${targetField}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        null,
        (err) => {
          console.error('Upload error:', err);
          alert('Error al subir la imagen: ' + err.message);
          setUploadingField(null);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          updateField(targetField, downloadUrl);
          setUploadingField(null);
        }
      );
    } catch (err: any) {
      console.error('Error during upload initiation:', err);
      alert('Error al procesar la imagen.');
      setUploadingField(null);
    }
  };

  // Toggle rápido de Estado de Tienda (Abierto / Cerrado)
  const handleToggleStoreStatus = async () => {
    const newStatus = !settings.isOpen;
    updateField('isOpen', newStatus);

    if (!merchantId) return;
    try {
      const batch = writeBatch(db);
      const settsRef = doc(db, 'restaurant_settings', merchantId);
      const bizRef = doc(db, 'businesses', merchantId);

      batch.set(settsRef, { isOpen: newStatus, updatedAt: serverTimestamp() }, { merge: true });
      batch.update(bizRef, { isOpen: newStatus, abierto: newStatus, updatedAt: serverTimestamp() });

      try {
        const branchesSnap = await getDocs(query(collection(db, 'branches'), where('businessId', '==', merchantId)));
        branchesSnap.forEach(bDoc => {
          batch.update(bDoc.ref, { isOpen: newStatus, abierto: newStatus, active: newStatus, updatedAt: serverTimestamp() });
        });
      } catch (e) {
        console.warn('Error sincronizando branches en toggle:', e);
      }

      await batch.commit();
      setFeedbackMsg({
        type: 'success',
        text: `Estado de tienda cambiado a ${newStatus ? 'ABIERTO (Recibiendo pedidos)' : 'CERRADO'}.`,
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Error toggling store status:', err);
    }
  };

  // Guardado general de configuraciones en Firestore
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!merchantId) return;

    if (!settings.commercialName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El nombre comercial es obligatorio.' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const batch = writeBatch(db);
      const settsRef = doc(db, 'restaurant_settings', merchantId);
      const bizRef = doc(db, 'businesses', merchantId);
      const now = serverTimestamp();

      const parsedLat = Number(settings.latitude) || 12.136389;
      const parsedLng = Number(settings.longitude) || -86.251389;

      // 1. Actualizar /restaurant_settings/{merchantId}
      batch.set(
        settsRef,
        {
          restaurantId: merchantId,
          commercialName: settings.commercialName.trim(),
          legalName: settings.legalName.trim() || settings.commercialName.trim(),
          taxId: settings.taxId.trim(),
          category: settings.category.trim(),
          phone: settings.phone.trim(),
          email: settings.email.trim(),
          address: settings.address.trim(),
          city: settings.city.trim(),
          zone: settings.zone.trim(),
          latitude: parsedLat,
          longitude: parsedLng,
          location: {
            latitude: parsedLat,
            longitude: parsedLng,
          },
          isOpen: settings.isOpen,
          deliveryFee: Number(settings.deliveryFee) || 0,
          maxDeliveryRadiusKm: Number(settings.maxDeliveryRadiusKm) || 5,
          kitchenPrepTimeMinutes: Number(settings.kitchenPrepTimeMinutes) || 15,
          autoAcceptOrders: settings.autoAcceptOrders,
          printReceiptOnOrder: settings.printReceiptOnOrder,
          schedule: settings.schedule,
          bankName: settings.bankName.trim(),
          accountNumber: settings.accountNumber.trim(),
          accountHolder: settings.accountHolder.trim(),
          accountType: settings.accountType,
          acceptedPayments: settings.acceptedPayments,
          updatedAt: now,
        },
        { merge: true }
      );

      // 2. Actualizar /businesses/{merchantId}
      batch.update(bizRef, {
        name: settings.commercialName.trim(),
        comercioNombre: settings.commercialName.trim(),
        legalName: settings.legalName.trim() || settings.commercialName.trim(),
        taxId: settings.taxId.trim(),
        ruc: settings.taxId.trim(),
        category: settings.category.trim(),
        categoria: settings.category.trim(),
        phone: settings.phone.trim(),
        telefono: settings.phone.trim(),
        email: settings.email.trim(),
        description: settings.description.trim(),
        descripcion: settings.description.trim(),
        logoUrl: settings.logoUrl || null,
        photoUrl: settings.logoUrl || null,
        coverUrl: settings.coverUrl || null,
        bannerUrl: settings.coverUrl || null,
        portadaUrl: settings.coverUrl || null,
        address: settings.address.trim(),
        direccion: settings.address.trim(),
        city: settings.city.trim(),
        zone: settings.zone.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        lat: parsedLat,
        lng: parsedLng,
        location: {
          latitude: parsedLat,
          longitude: parsedLng,
        },
        coordenadas: {
          latitud: parsedLat,
          longitud: parsedLng,
        },
        isOpen: settings.isOpen,
        abierto: settings.isOpen,
        schedule: settings.schedule,
        weeklySchedule: settings.schedule,
        deliveryFee: Number(settings.deliveryFee) || 0,
        costoEnvioBase: Number(settings.deliveryFee) || 0,
        updatedAt: now,
      });

      // 3. Sincronizar sucursales /branches en el mismo batch para la app cliente móvil
      try {
        const branchesSnap = await getDocs(query(collection(db, 'branches'), where('businessId', '==', merchantId)));
        branchesSnap.forEach(bDoc => {
          batch.update(bDoc.ref, {
            deliveryFee: Number(settings.deliveryFee) || 0,
            costoEnvio: Number(settings.deliveryFee) || 0,
            phone: settings.phone.trim(),
            telefono: settings.phone.trim(),
            address: settings.address.trim(),
            direccion: settings.address.trim(),
            city: settings.city.trim(),
            zone: settings.zone.trim(),
            latitude: parsedLat,
            longitude: parsedLng,
            lat: parsedLat,
            lng: parsedLng,
            location: {
              latitude: parsedLat,
              longitude: parsedLng,
            },
            coverageRadiusKm: Number(settings.maxDeliveryRadiusKm) || 5,
            prepTimeMinutes: Number(settings.kitchenPrepTimeMinutes) || 15,
            isOpen: settings.isOpen,
            abierto: settings.isOpen,
            active: settings.isOpen,
            schedule: settings.schedule,
            weeklySchedule: settings.schedule,
            updatedAt: now
          });
        });
      } catch (branchErr) {
        console.warn('Error sincronizando sucursales:', branchErr);
      }

      await batch.commit();

      setFeedbackMsg({
        type: 'success',
        text: '¡Configuración comercial y coordenadas GPS sincronizadas con éxito!',
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Error al guardar configuración: ' + (err.message || 'Intente nuevamente.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Cargando centro de configuración comercial...</p>
      </div>
    );
  }

  const daysList: Array<{ key: keyof WeeklySchedule; label: string }> = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ─── HEADER PRINCIPAL ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Restaurant Settings Center (RSC)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Administración centralizada de operaciones, catálogo comercial, logística y finanzas para{' '}
            <span className="text-blue-400 font-semibold">{settings.commercialName || merchantId}</span>.
          </p>
        </div>

        {/* Acciones del Header */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle de Tienda Abierta / Cerrada */}
          <button
            type="button"
            onClick={handleToggleStoreStatus}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition shadow-sm ${
              settings.isOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${settings.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{settings.isOpen ? 'Restaurante Abierto' : 'Tienda Cerrada'}</span>
          </button>

          {/* Botón Guardar Cambios */}
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios (RSC)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2.5 transition animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ─── PESTAÑAS DE NAVEGACIÓN ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800 bg-obsidian-900/60 rounded-xl p-1.5 gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Datos Comerciales & Marca</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'operations'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Operaciones & Logística</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Horarios Semanales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'banking'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Banca & Métodos de Pago</span>
        </button>
      </div>

      {/* ─── TAB 1: DATOS COMERCIALES & MARCA ──────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Principal (2 Cols) */}
          <div className="lg:col-span-2 bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Identificación Comercial
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  value={settings.commercialName}
                  onChange={(e) => updateField('commercialName', e.target.value)}
                  placeholder="Ej. JB Porcinos"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Razón Social / Titular Legal</label>
                <input
                  type="text"
                  value={settings.legalName}
                  onChange={(e) => updateField('legalName', e.target.value)}
                  placeholder="Ej. Jeremy Reyes / JB Porcinos S.A."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">RUC / Cédula Fiscal</label>
                <input
                  type="text"
                  value={settings.taxId}
                  onChange={(e) => updateField('taxId', e.target.value)}
                  placeholder="Ej. J0310000012345"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría Comercial *</label>
                <select
                  value={settings.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Selecciona una categoría...</option>
                  {businessCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </option>
                  ))}
                  {settings.category && !businessCategories.some((c) => c.name.toLowerCase() === settings.category.toLowerCase()) && (
                    <option value={settings.category}>🏪 {settings.category}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono de Atención</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="Ej. 85134195"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Correo de Notificaciones</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="comercio@ejemplo.com"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción del Negocio</label>
              <textarea
                value={settings.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                placeholder="Describe la propuesta gastronómica o comercial de tu establecimiento para la App Cliente..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>
          </div>

          {/* Multimedia: Logo y Portada (1 Col) */}
          <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              Identidad Visual (App Sync)
            </h2>

            {/* Logo */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400">Logo del Comercio</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'logoUrl' ? 'Subiendo...' : 'Cambiar Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logoUrl')}
                      disabled={uploadingField === 'logoUrl'}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    value={settings.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    placeholder="o pega URL de imagen..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Portada / Banner */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400">Banner / Portada</label>
              <div className="w-full h-24 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden shadow-inner relative group">
                {settings.coverUrl ? (
                  <img src={settings.coverUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-600">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-[10px]">Sin imagen de portada</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition flex-shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingField === 'coverUrl' ? 'Subiendo...' : 'Subir Banner'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'coverUrl')}
                    disabled={uploadingField === 'coverUrl'}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  value={settings.coverUrl}
                  onChange={(e) => updateField('coverUrl', e.target.value)}
                  placeholder="URL de imagen..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: OPERACIONES & LOGÍSTICA ────────────────────────────────── */}
      {activeTab === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parámetros de Envío & Cocina */}
          <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Parámetros de Entrega & Despacho
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tarifa Base de Delivery (C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.deliveryFee}
                    onChange={(e) => updateField('deliveryFee', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Costo base de flete que se cargará por defecto al cliente para esta sucursal.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Radio Máximo de Cobertura Delivery
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                    {settings.maxDeliveryRadiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={settings.maxDeliveryRadiusKm}
                  onChange={(e) => updateField('maxDeliveryRadiusKm', parseInt(e.target.value) || 5)}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>1 km</span>
                  <span>10 km</span>
                  <span>25 km (Regional)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tiempo Estimado de Preparación (Minutos)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 25, 40].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => updateField('kitchenPrepTimeMinutes', mins)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        settings.kitchenPrepTimeMinutes === mins
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Automatización de Comandas y Ubicación */}
          <div className="space-y-6">
            <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Automatización de Órdenes
              </h2>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-slate-200">Auto-Aceptar Pedidos Entrantes</p>
                    <p className="text-[11px] text-slate-400">
                      Pasa automáticamente los pedidos a estado "En Preparación" sin intervención manual.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoAcceptOrders}
                    onChange={(e) => updateField('autoAcceptOrders', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-slate-200">Imprimir Comanda al Recibir</p>
                    <p className="text-[11px] text-slate-400">
                      Envía orden de impresión automática al KDS / Impresora térmica al confirmarse el pago.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.printReceiptOnOrder}
                    onChange={(e) => updateField('printReceiptOnOrder', e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  Dirección de la Sucursal Principal
                </h2>
                <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                  Sede Central
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Ciudad / Municipio</label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Ej. Jinotega"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Zona / Barrio</label>
                  <input
                    type="text"
                    value={settings.zone}
                    onChange={(e) => updateField('zone', e.target.value)}
                    placeholder="Ej. Bo. Central"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Dirección Exacta</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Ej. Banpro 2c al este"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Subsección Coordenadas GPS Satelitales */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-blue-400" />
                      Coordenadas GPS de la Sucursal
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Utilizadas para la App Cliente (botón "Ver mapa" en retiro local) y Torre de Control.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      disabled={isDetectingGps}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
                      title="Captura la ubicación actual del dispositivo usando el navegador"
                    >
                      <Navigation className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
                      <span>{isDetectingGps ? 'Obteniendo GPS...' : 'Detectar mi GPS'}</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-semibold transition"
                      title="Ver estas coordenadas en Google Maps en una nueva pestaña"
                    >
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                      <span>Ver en Mapa ↗</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Latitud GPS *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={settings.latitude}
                      onChange={(e) => updateField('latitude', parseFloat(e.target.value) || 0)}
                      placeholder="Ej. 12.136389"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Longitud GPS *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={settings.longitude}
                      onChange={(e) => updateField('longitude', parseFloat(e.target.value) || 0)}
                      placeholder="Ej. -86.251389"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: HORARIOS SEMANALES ────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Jornadas y Horarios de Atención
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define los horarios en que tu local recibe pedidos en la App Cliente.
              </p>
            </div>

            <button
              type="button"
              onClick={copyWeekdaySchedule}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Copiar Lunes a toda la semana</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {daysList.map(({ key, label }) => {
              const daySchedule = settings.schedule[key] || { open: '08:00', close: '22:00', isOpen: true };
              return (
                <div key={key} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Día y Toggle */}
                  <div className="flex items-center gap-3 w-40">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={daySchedule.isOpen}
                        onChange={(e) => updateDaySchedule(key, 'isOpen', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    <span className={`text-xs font-bold ${daySchedule.isOpen ? 'text-slate-100' : 'text-slate-500 line-through'}`}>
                      {label}
                    </span>
                  </div>

                  {/* Horas o Estado Cerrado */}
                  {daySchedule.isOpen ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="time"
                          value={daySchedule.open}
                          onChange={(e) => updateDaySchedule(key, 'open', e.target.value)}
                          className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
                        />
                      </div>
                      <span className="text-xs text-slate-500">a</span>
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="time"
                          value={daySchedule.close}
                          onChange={(e) => updateDaySchedule(key, 'close', e.target.value)}
                          className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-rose-400/80 font-semibold italic">
                      Cerrado todo el día
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 4: BANCA & PAGOS ─────────────────────────────────────────── */}
      {activeTab === 'banking' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cuenta Bancaria para Liquidaciones */}
          <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              Cuenta Bancaria para Liquidaciones
            </h2>
            <p className="text-xs text-slate-400">
              Datos oficiales donde el Centro de Liquidación de BlueSystem acreditará las ventas semanales.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Entidad Bancaria</label>
                <select
                  value={settings.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Número de Cuenta</label>
                <input
                  type="text"
                  value={settings.accountNumber}
                  onChange={(e) => updateField('accountNumber', e.target.value)}
                  placeholder="Ej. 1029384756"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={settings.accountHolder}
                    onChange={(e) => updateField('accountHolder', e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Cuenta</label>
                  <select
                    value={settings.accountType}
                    onChange={(e) => updateField('accountType', e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="CORRIENTE">Cuenta Corriente</option>
                    <option value="AHORRO">Cuenta de Ahorros</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Métodos de Pago Aceptados */}
          <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Métodos de Cobro Habilitados
            </h2>
            <p className="text-xs text-slate-400">
              Selecciona los medios de pago que tus clientes pueden usar al ordenar en tu comercio.
            </p>

            <div className="space-y-3 pt-2">
              {[
                { id: 'EFECTIVO', title: 'Efectivo contra Entrega (Cash)', desc: 'El cliente paga en córdobas al motorizado al recibir.' },
                { id: 'TARJETA', title: 'Tarjeta de Débito / Crédito', desc: 'Cobro procesado vía pasarela segura integrada.' },
                { id: 'TRANSFERENCIA', title: 'Transferencia Bancaria Directa', desc: 'Envío de comprobante de transferencia previo a despacho.' },
              ].map((m) => {
                const isChecked = settings.acceptedPayments.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      isChecked
                        ? 'bg-blue-600/10 border-blue-500/30 text-slate-100'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePaymentMethod(m.id)}
                      className="w-4 h-4 mt-0.5 accent-blue-600 rounded cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{m.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── BARRA INFERIOR DE ACCIÓN RÁPIDA ──────────────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-obsidian-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="text-xs text-slate-400">
          Los cambios se sincronizan en tiempo real con la App Cliente y la Torre de Control.
        </div>
        <button
          type="button"
          onClick={() => handleSaveSettings()}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Guardando en Servidor...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configuración (RSC)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
