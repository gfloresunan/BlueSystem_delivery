import React, { useState } from 'react';
import { MerchantFormData } from '../types';
import { uploadDocumentFile } from '../firebase';
import { FileCheck, Upload, Trash2, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface Props {
  formData: MerchantFormData;
  updateForm: (data: Partial<MerchantFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step3Documents: React.FC<Props> = ({ formData, updateForm, onNext, onBack }) => {
  const [docType, setDocType] = useState<'RUC' | 'SANITY_PERMIT' | 'ID_CARD' | 'OTHER'>('RUC');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validación preventiva de tipo MIME
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert('Formato de archivo no permitido. Solo se permiten imágenes JPG/PNG o documentos PDF.');
      e.target.value = '';
      return;
    }

    // Validación preventiva de tamaño máximo (10 MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`El archivo excede el tamaño máximo permitido de 10 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      e.target.value = '';
      return;
    }

    const newDoc = {
      name: file.name,
      type: docType,
      size: file.size,
      contentType: file.type,
      progress: 0,
      status: 'uploading' as const,
    };

    const updatedList = [...formData.documentFiles, newDoc];
    updateForm({ documentFiles: updatedList });
    setIsUploading(true);

    try {
      const uploadResult = await uploadDocumentFile(
        file,
        formData.applicationId,
        docType,
        // FIX BUG A (ADR-011.2): Use updatedList (local snapshot) instead of
        // formData.documentFiles, which is a stale closed-over prop value.
        // At the time onProgress fires asynchronously, formData.documentFiles
        // still holds the pre-upload empty array from closure capture time.
        (progress) => {
          updateForm({
            documentFiles: updatedList.map((doc) =>
              doc.name === file.name ? { ...doc, progress } : doc
            ),
          });
        }
      );

      // FIX BUG B (ADR-011.2): Same stale closure fix for the completed update.
      // Use updatedList instead of formData.documentFiles.
      updateForm({
        documentFiles: updatedList.map((doc) =>
          doc.name === file.name
            ? {
              ...doc,
              progress: 100,
              status: 'completed',
              storagePath: uploadResult.storagePath,
              contentType: uploadResult.contentType,
              size: uploadResult.size,
              uploadedAt: uploadResult.uploadedAt,
            }
            : doc
        ),
      });
    } catch (err) {
      alert('Ocurrió un error al subir el archivo. Inténtalo de nuevo.');
      updateForm({
        documentFiles: formData.documentFiles.filter((doc) => doc.name !== file.name),
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveDoc = (index: number) => {
    const newList = formData.documentFiles.filter((_, i) => i !== index);
    updateForm({ documentFiles: newList });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.documentFiles.length === 0) {
      if (!confirm('No has adjuntado ningún documento legal (RUC/Licencia). ¿Deseas continuar de todos modos?')) {
        return;
      }
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-cyan-400" />
          <span>Carga de Documentación Legal</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Adjunta copias de tu RUC,Matricula, Licencia Sanitaria o Identificación Oficial para agilizar la aprobación.
        </p>
      </div>

      {/* Selector de Tipo de Documento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <button
          type="button"
          onClick={() => setDocType('RUC')}
          className={`p-4 rounded-2xl border text-left transition-all ${docType === 'RUC'
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-glow-cyan'
              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Cedula RUC / NIT</span>
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-xs opacity-75">Registro único de contribuyente del negocio.</p>
        </button>

        <button
          type="button"
          onClick={() => setDocType('SANITY_PERMIT')}
          className={`p-4 rounded-2xl border text-left transition-all ${docType === 'SANITY_PERMIT'
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-glow-cyan'
              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Matricula Alcaldía /Permiso Sanitario / Operación</span>
            <FileCheck className="w-4 h-4" />
          </div>
          <p className="text-xs opacity-75">Licencia o permiso de funcionamiento vigente.</p>
        </button>

        <button
          type="button"
          onClick={() => setDocType('ID_CARD')}
          className={`p-4 rounded-2xl border text-left transition-all ${docType === 'ID_CARD'
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-glow-cyan'
              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Identificación Legal</span>
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-xs opacity-75">Cédula o Pasaporte del representante legal.</p>
        </button>

      </div>

      {/* Area de Carga / Drag & Drop */}
      <div className="relative border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-2xl p-8 text-center bg-gray-900/40 transition-colors">
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
            <Upload className="w-7 h-7 stroke-[2]" />
          </div>
          <p className="text-sm font-semibold text-white">
            Haz clic o arrastra un archivo aquí para subir <span className="text-cyan-400 font-bold">({docType})</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Soporta PDF, PNG, JPG hasta 10MB</p>
        </div>
      </div>

      {/* Lista de Archivos Subidos */}
      {formData.documentFiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documentos Adjuntados ({formData.documentFiles.length})</h4>

          <div className="space-y-2">
            {formData.documentFiles.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/80 border border-gray-800"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{doc.name}</p>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">{doc.type}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {doc.status === 'completed' ? (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>Listo</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-cyan-400">
                      <AlertCircle className="w-4 h-4 animate-spin" />
                      <span>{doc.progress || 0}%</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <span>Revisar Resumen & Enviar</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

    </form>
  );
};
