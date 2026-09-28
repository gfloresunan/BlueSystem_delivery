import React from 'react';
import { MerchantFormData } from '../types';
import { MapPin, ArrowLeft, ArrowRight, Navigation, Globe } from 'lucide-react';
import {
  NICARAGUA_DEPARTMENTS,
  getMunicipalities,
  isValidMunicipality,
  getDepartmentName,
  getMunicipalityName,
} from '../constants/geoCatalog';

interface Props {
  formData: MerchantFormData;
  updateForm: (data: Partial<MerchantFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step2LocationContact: React.FC<Props> = ({ formData, updateForm, onNext, onBack }) => {
  const availableMunicipalities = getMunicipalities(formData.departmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.departmentId ||
      !formData.municipalityId ||
      !isValidMunicipality(formData.departmentId, formData.municipalityId)
    ) {
      alert('Por favor selecciona un Departamento y un Municipio válidos.');
      return;
    }

    if (!formData.address || !formData.contactName || !formData.phone || !formData.email) {
      alert('Por favor completa todos los campos de contacto y dirección física.');
      return;
    }
    onNext();
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeptId = e.target.value;
    const deptName = getDepartmentName(newDeptId);
    // REGLA DE INTEGRIDAD: Si cambia el departamento, el municipio DEBE reiniciarse
    updateForm({
      departmentId: newDeptId,
      departmentName: deptName,
      municipalityId: '',
      municipalityName: '',
      city: '',
    });
  };

  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMuniId = e.target.value;
    const muniName = getMunicipalityName(formData.departmentId, newMuniId);
    updateForm({
      municipalityId: newMuniId,
      municipalityName: muniName,
      city: muniName || newMuniId,
    });
  };

  const handleUseCurrentGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateForm({
            location: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
          });
          alert('Ubicación GPS capturada con éxito.');
        },
        (err) => {
          alert('No se pudo obtener la posición GPS automáticamente. Ingresa la latitud y longitud manualmente o selecciona en el mapa.');
          console.warn(err);
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-cyan-400" />
          <span>Ubicación de la Sucursal & Contacto</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Ingresa la dirección de la tienda principal y los datos del representante comercial.
        </p>
      </div>

      {/* Sección Dirección */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">1. Ubicación Física</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Departamento *</span>
            </label>
            <select
              required
              value={formData.departmentId || ''}
              onChange={handleDepartmentChange}
              className="form-input bg-gray-900 text-white cursor-pointer"
            >
              <option value="" disabled>Seleccionar departamento</option>
              {NICARAGUA_DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Municipio *</span>
            </label>
            <select
              required
              disabled={!formData.departmentId}
              value={formData.municipalityId || ''}
              onChange={handleMunicipalityChange}
              className={`form-input bg-gray-900 text-white ${
                !formData.departmentId ? 'opacity-50 cursor-not-allowed text-gray-500' : 'cursor-pointer'
              }`}
            >
              <option value="" disabled>
                {formData.departmentId ? 'Seleccionar municipio' : 'Seleccione primero un departamento'}
              </option>
              {availableMunicipalities.map((muni) => (
                <option key={muni.id} value={muni.id}>
                  {muni.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Zona / Barrio / Distrito (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Villa Fontana / Altamira / Zona Central"
            value={formData.zone}
            onChange={(e) => updateForm({ zone: e.target.value })}
            className="form-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Dirección Exacta de la Sucursal *
          </label>
          <textarea
            required
            rows={2}
            placeholder="Ej: De la rotonda El Guegüense 2c abajo, frente a Banpro."
            value={formData.address}
            onChange={(e) => updateForm({ address: e.target.value })}
            className="form-input resize-none"
          />
        </div>

        {/* GPS Picker Box */}
        <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Coordenadas GPS de la Tienda</p>
              <p className="text-xs text-gray-400">
                Lat: {formData.location.latitude.toFixed(6)}, Lon: {formData.location.longitude.toFixed(6)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentGps}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center space-x-2"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Detectar mi Ubicación GPS</span>
          </button>
        </div>
      </div>

      {/* Sección Contacto */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">2. Representante del Comercio</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Nombre de Contacto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Carlos Mendoza"
              value={formData.contactName}
              onChange={(e) => updateForm({ contactName: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Teléfono de Contacto / WhatsApp *
            </label>
            <input
              type="tel"
              required
              placeholder="Ej: +505 8888 8888"
              value={formData.phone}
              onChange={(e) => updateForm({ phone: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Correo Electrónico Oficial *
            </label>
            <input
              type="email"
              required
              placeholder="contacto@pizzaroma.com"
              value={formData.email}
              onChange={(e) => updateForm({ email: e.target.value })}
              className="form-input"
            />
          </div>

        </div>
      </div>

      {/* Botones de Navegación */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-800">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-all flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás</span>
        </button>

        <button
          type="submit"
          className="btn-neon flex items-center space-x-2 text-sm"
        >
          <span>Continuar a Documentación</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

    </form>
  );
};
