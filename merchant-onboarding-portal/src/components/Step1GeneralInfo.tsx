import React, { useState, useEffect } from 'react';
import { MerchantFormData } from '../types';
import { Building2, ArrowRight, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface Props {
  formData: MerchantFormData;
  updateForm: (data: Partial<MerchantFormData>) => void;
  onNext: () => void;
}

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  showInOnboarding: boolean;
}

export const Step1GeneralInfo: React.FC<Props> = ({ formData, updateForm, onNext }) => {
  const [catalogStatus, setCatalogStatus] = useState<'LOADING' | 'AUTHORITATIVE' | 'CACHED_OFFLINE' | 'UNAVAILABLE'>('LOADING');
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    setCatalogStatus('LOADING');

    const q = query(
      collection(db, 'business_categories'),
      where('active', '==', true),
      where('showInOnboarding', '==', true),
      orderBy('sortOrder', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: CategoryItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...(doc.data() as Omit<CategoryItem, 'id'>) });
        });

        setCategories(items);
        setCatalogStatus('AUTHORITATIVE');

        try {
          sessionStorage.setItem('cached_business_categories', JSON.stringify(items));
        } catch (e) {
          console.warn('[Onboarding] Error guardando catálogo en sessionStorage:', e);
        }
      },
      (err) => {
        console.error('[Onboarding] Error escuchando /business_categories:', err);
        const cached = sessionStorage.getItem('cached_business_categories');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCategories(parsed);
              setCatalogStatus('CACHED_OFFLINE');
              return;
            }
          } catch {}
        }
        setCatalogStatus('UNAVAILABLE');
      }
    );

    // Limpieza obligatoria al desmontar
    return () => unsubscribe();
  }, []);

  const handleCategoryChange = (selectedId: string) => {
    const found = categories.find((c) => c.id === selectedId);
    if (found) {
      updateForm({
        category: found.name,
        businessCategoryId: found.id,
      });
    } else {
      updateForm({
        category: '',
        businessCategoryId: '',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.legalName || !formData.ruc) {
      alert('Por favor completa todos los campos requeridos del Paso 1.');
      return;
    }

    const currentSelectedId = formData.businessCategoryId || formData.category;
    if (!currentSelectedId) {
      alert('Por favor selecciona un rubro comercial válido.');
      return;
    }

    // Anti-stale guard: Validar que la categoría seleccionada exista en el catálogo cargado
    const isValidCategory = categories.some((c) => c.id === currentSelectedId || c.name === formData.category);
    if (!isValidCategory && categories.length > 0) {
      alert('El rubro comercial seleccionado ya no se encuentra disponible. Por favor selecciona otro rubro.');
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" />
          <span>Datos de Identificación Comercial</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Ingresa la información oficial de tu marca y razón social.
        </p>
      </div>

      {/* Banner de Estado Offline / Stale */}
      {catalogStatus === 'CACHED_OFFLINE' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Modo Sin Conexión:</strong> Mostrando catálogo local. Podrás completar el borrador, pero se requerirá conexión activa para enviar la solicitud final.
          </span>
        </div>
      )}

      {catalogStatus === 'UNAVAILABLE' && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>No se pudo cargar el catálogo de rubros comerciales.</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-white font-bold rounded-lg transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Nombre Comercial */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Nombre Comercial del Negocio *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Pizza Roma Express"
            value={formData.businessName}
            onChange={(e) => updateForm({ businessName: e.target.value })}
            className="form-input"
          />
          <p className="text-[11px] text-gray-400 mt-1">El nombre público visible para los clientes en la app.</p>
        </div>

        {/* Razón Social */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Razón Social Legal *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Inversiones Roma S.A."
            value={formData.legalName}
            onChange={(e) => updateForm({ legalName: e.target.value })}
            className="form-input"
          />
          <p className="text-[11px] text-gray-400 mt-1">Nombre legal registrado para facturación y contratos.</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* RUC / NIT */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Número de RUC / NIT / Registro Fiscal *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: J0310000012345"
            value={formData.ruc}
            onChange={(e) => updateForm({ ruc: e.target.value })}
            className="form-input font-mono"
          />
        </div>

        {/* Rubro o Categoría Comercial Principal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Rubro o Categoría Principal *
            </label>
            {catalogStatus === 'AUTHORITATIVE' && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Catálogo en vivo
              </span>
            )}
          </div>

          <select
            required
            value={formData.businessCategoryId || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={catalogStatus === 'LOADING' || catalogStatus === 'UNAVAILABLE'}
            className="form-input bg-gray-900"
          >
            <option value="">
              {catalogStatus === 'LOADING'
                ? 'Cargando rubros comerciales...'
                : catalogStatus === 'UNAVAILABLE'
                ? 'Error cargando rubros'
                : 'Selecciona un rubro comercial...'}
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            Catálogo maestro de plataforma sincronizado en tiempo real.
          </p>
        </div>

      </div>

      {/* Botón Siguiente */}
      <div className="flex justify-end pt-6 border-t border-gray-800">
        <button
          type="submit"
          className="btn-neon flex items-center space-x-2 text-sm"
        >
          <span>Continuar a Ubicación & Contacto</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

    </form>
  );
};
