import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Eye, 
  ArrowRight,
  Store,
  Loader2
} from 'lucide-react';
import { db, storage } from '../../shared/services/firebase';
import { useAuth } from '../../shared/context/AuthContext';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export interface CommerceAnnouncementData {
  id?: string;
  tenantId?: string;
  businessId?: string;
  branchId?: string;
  title: string;
  description: string;
  imageUrl: string;
  imageStoragePath: string;
  showImage: boolean;
  ctaLabel: string;
  ctaAction: 'NONE' | 'MERCHANT_MENU' | 'MERCHANT_DISCOUNTS' | 'PRODUCT' | 'EXTERNAL_URL';
  ctaTarget: string;
  showCTA: boolean;
  isActive: boolean;
  displayOrder: number;
  startAt: string;
  endAt: string;
  source: 'MERCHANT' | 'ADMIN';
  version: number;
  updatedAt?: any;
  updatedBy?: string;
  createdBy?: string;
}

export const CommerceAnnouncementPanel: React.FC = () => {
  const { identity } = useAuth();
  const businessId = identity?.businessId || identity?.restaurantId || '';
  const tenantId = identity?.orgId || 'default';

  // State
  const [isActive, setIsActive] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showImage, setShowImage] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageStoragePath, setImageStoragePath] = useState<string>('');
  const [showCTA, setShowCTA] = useState<boolean>(false);
  const [ctaLabel, setCtaLabel] = useState<string>('Ver Promoción');
  const [ctaAction, setCtaAction] = useState<'NONE' | 'MERCHANT_MENU' | 'MERCHANT_DISCOUNTS' | 'PRODUCT' | 'EXTERNAL_URL'>('MERCHANT_MENU');
  const [ctaTarget, setCtaTarget] = useState<string>('');
  const [startAt, setStartAt] = useState<string>('');
  const [endAt, setEndAt] = useState<string>('');

  // Upload & UI Status
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [, setIsLoadingInitial] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escuchar en tiempo real el anuncio canónico del comercio
  useEffect(() => {
    if (!businessId) {
      setIsLoadingInitial(false);
      return;
    }

    const docRef = doc(db, 'businesses', businessId, 'announcements', 'main');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CommerceAnnouncementData;
        setIsActive(data.isActive !== false);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setShowImage(data.showImage !== false);
        setImageUrl(data.imageUrl || '');
        setImageStoragePath(data.imageStoragePath || '');
        setShowCTA(data.showCTA === true);
        setCtaLabel(data.ctaLabel || 'Ver Menú');
        setCtaAction(data.ctaAction || 'MERCHANT_MENU');
        setCtaTarget(data.ctaTarget || '');

        // Formateo de fechas para input datetime-local
        if (data.startAt) {
          const sDate = (data.startAt as any)?.toDate ? (data.startAt as any).toDate() : new Date(data.startAt);
          if (!isNaN(sDate.getTime())) setStartAt(sDate.toISOString().slice(0, 16));
        } else {
          setStartAt('');
        }

        if (data.endAt) {
          const eDate = (data.endAt as any)?.toDate ? (data.endAt as any).toDate() : new Date(data.endAt);
          if (!isNaN(eDate.getTime())) setEndAt(eDate.toISOString().slice(0, 16));
        } else {
          setEndAt('');
        }
      }
      setIsLoadingInitial(false);
    }, (err) => {
      console.warn('[CommerceAnnouncementPanel] Error en listener de anuncio:', err);
      setIsLoadingInitial(false);
    });

    return () => unsub();
  }, [businessId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de formato
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setFeedbackMessage({ type: 'error', text: 'Formato no válido. Selecciona una imagen JPG, PNG o WebP.' });
      return;
    }

    // Validación de tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedbackMessage({ type: 'error', text: 'La imagen excede el límite de 5 MB.' });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowImage(true);
    setFeedbackMessage(null);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      setFeedbackMessage({ type: 'error', text: 'No se encontró el comercio autenticado.' });
      return;
    }

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFeedbackMessage({ type: 'error', text: 'El título del anuncio es obligatorio.' });
      return;
    }

    if (showCTA && ctaAction === 'EXTERNAL_URL') {
      const cleanUrl = ctaTarget.trim().toLowerCase();
      if (!cleanUrl.startsWith('https://')) {
        setFeedbackMessage({ type: 'error', text: 'Por seguridad corporativa, los enlaces externos deben iniciar obligatoriamente con https://' });
        return;
      }
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      let finalImageUrl = imageUrl;
      let finalStoragePath = imageStoragePath;
      const oldStoragePath = imageStoragePath;

      // 1. Subida segura de imagen si el usuario seleccionó un nuevo archivo
      if (selectedFile) {
        const extension = selectedFile.name.split('.').pop() || 'jpg';
        const cleanFileName = `${Date.now()}_announcement.${extension}`;
        const targetPath = `commerce_assets/${businessId}/announcements/main/${cleanFileName}`;
        const storageRef = ref(storage, targetPath);

        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(Math.round(progress));
            },
            (error) => {
              console.error('[CommerceAnnouncement] Error en upload:', error);
              reject(error);
            },
            async () => {
              finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              finalStoragePath = targetPath;
              resolve();
            }
          );
        });
      }

      // 2. Persistencia atómica en Firestore SSOT
      const docRef = doc(db, 'businesses', businessId, 'announcements', 'main');
      const payload: CommerceAnnouncementData = {
        id: 'main',
        tenantId,
        businessId,
        branchId: '', // Aplica al comercio
        title: cleanTitle,
        description: description.trim(),
        imageUrl: finalImageUrl,
        imageStoragePath: finalStoragePath,
        showImage,
        ctaLabel: ctaLabel.trim(),
        ctaAction,
        ctaTarget: ctaTarget.trim(),
        showCTA,
        isActive,
        displayOrder: 1,
        startAt: startAt ? new Date(startAt).toISOString() : '',
        endAt: endAt ? new Date(endAt).toISOString() : '',
        source: 'MERCHANT',
        version: 1,
        updatedAt: serverTimestamp(),
        updatedBy: identity?.email || identity?.uid || 'merchant',
      };

      await setDoc(docRef, payload, { merge: true });

      // 3. Limpieza de imagen anterior en Storage SOLO tras confirmar éxito en Firestore
      if (selectedFile && oldStoragePath && oldStoragePath !== finalStoragePath) {
        try {
          const oldRef = ref(storage, oldStoragePath);
          await deleteObject(oldRef);
        } catch (cleanupErr) {
          console.warn('[CommerceAnnouncement] Aviso: no se pudo eliminar la imagen previa en Storage:', cleanupErr);
        }
      }

      setSelectedFile(null);
      setPreviewUrl('');
      setUploadProgress(null);
      setFeedbackMessage({ type: 'success', text: '¡Anuncio del comercio actualizado y sincronizado en tiempo real!' });
    } catch (err: any) {
      console.error('[CommerceAnnouncement] Error guardando anuncio:', err);
      setFeedbackMessage({ type: 'error', text: err.message || 'Error guardando el anuncio del comercio.' });
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const displayImage = previewUrl || imageUrl;

  return (
    <div className="space-y-6">
      {/* Header Informativo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-obsidian-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Anuncio Destacado del Comercio</h1>
              <p className="text-xs text-slate-400">
                Publica un mensaje promocional o informativo dentro de tu página en la Customer App.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isActive ? 'Visible en App' : 'Pausado'}
          </span>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
            : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
        }`}>
          {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Grid Principal: Formulario + Previsualización en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulario de Configuración */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-obsidian-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Switch Activo / Inactivo */}
          <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-200">Mostrar Anuncio en App</p>
              <p className="text-xs text-slate-400">Si lo desactivas, no se reservará espacio en la vista del cliente.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isActive} 
                onChange={(e) => setIsActive(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-300">Título del Anuncio *</label>
              <span className="text-slate-500 text-[11px]">{title.length} / 60</span>
            </div>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value.slice(0, 60))} 
              placeholder="Ej: ¡Nuevo Menú Ejecutivo & Postre Gratis!"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-bold"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-300">Descripción detallada</label>
              <span className="text-slate-500 text-[11px]">{description.length} / 250</span>
            </div>
            <textarea 
              rows={3}
              value={description} 
              onChange={(e) => setDescription(e.target.value.slice(0, 250))} 
              placeholder="Añade detalles sobre la oferta, condiciones o vigencia para tus comensales..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Carga de Imagen */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="flex justify-between items-center pt-2">
              <label className="text-xs font-bold text-slate-300">Imagen Promocional (Opcional)</label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showImage} 
                  onChange={(e) => setShowImage(e.target.checked)} 
                  className="rounded bg-slate-950 border-slate-800 text-blue-600"
                />
                Mostrar imagen si existe
              </label>
            </div>

            <div className="flex items-center gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden"
              />

              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-700"
              >
                <Upload className="w-4 h-4" /> {displayImage ? 'Cambiar Imagen' : 'Subir Imagen'}
              </button>

              {displayImage && (
                <button 
                  type="button" 
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition py-2"
                >
                  <Trash2 className="w-4 h-4" /> Quitar imagen
                </button>
              )}
            </div>

            {uploadProgress !== null && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-500 h-1.5 transition-all duration-200" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Botón de Acción (CTA) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-300">Botón de Llamado a la Acción (CTA)</p>
                <p className="text-[11px] text-slate-400">Permite a tus clientes ir directamente a una sección relevante.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showCTA} 
                  onChange={(e) => setShowCTA(e.target.checked)} 
                  className="rounded bg-slate-950 border-slate-800 text-blue-600"
                />
                <span className="text-xs font-bold text-slate-300">Activar CTA</span>
              </label>
            </div>

            {showCTA && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Texto del Botón</label>
                  <input 
                    type="text" 
                    value={ctaLabel} 
                    onChange={(e) => setCtaLabel(e.target.value)} 
                    placeholder="Ej: Ver Menú"
                    className="w-full bg-obsidian-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Acción al Tocar</label>
                  <select 
                    value={ctaAction} 
                    onChange={(e) => setCtaAction(e.target.value as any)}
                    className="w-full bg-obsidian-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="MERCHANT_MENU">Abrir Menú del Comercio</option>
                    <option value="MERCHANT_DISCOUNTS">Abrir Pestaña de Descuentos</option>
                    <option value="PRODUCT">Abrir Producto Específico</option>
                    <option value="EXTERNAL_URL">Enlace Web Externo (HTTPS)</option>
                  </select>
                </div>

                {(ctaAction === 'PRODUCT' || ctaAction === 'EXTERNAL_URL') && (
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      {ctaAction === 'PRODUCT' ? 'ID del Producto (prod_...)' : 'URL Externa (https://...)'}
                    </label>
                    <input 
                      type="text" 
                      value={ctaTarget} 
                      onChange={(e) => setCtaTarget(e.target.value)} 
                      placeholder={ctaAction === 'PRODUCT' ? 'prod_hamburguesa_doble' : 'https://wa.me/505...'}
                      className="w-full bg-obsidian-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Programación de Fechas (Opcional) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-400" /> Programación de Vigencia (Opcional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Mostrar a partir de:</span>
                <input 
                  type="datetime-local" 
                  value={startAt} 
                  onChange={(e) => setStartAt(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Ocultar a partir de:</span>
                <input 
                  type="datetime-local" 
                  value={endAt} 
                  onChange={(e) => setEndAt(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botón de Guardado */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSaving ? 'Guardando Anuncio...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>

        {/* Simulador Interactivo de Customer App */}
        <div className="lg:col-span-5 space-y-3 sticky top-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <Eye className="w-4 h-4 text-blue-400" />
            <span>Previsualización en Customer App</span>
          </div>

          {/* Marco de Smartphone */}
          <div className="w-full max-w-[340px] mx-auto bg-slate-950 border-[6px] border-slate-800 rounded-[38px] shadow-2xl overflow-hidden text-slate-100 select-none">
            {/* Notch / Speaker */}
            <div className="h-6 bg-slate-950 flex justify-center items-center">
              <div className="w-20 h-3 bg-slate-800 rounded-full" />
            </div>

            {/* Pantalla Simulada */}
            <div className="p-3 bg-slate-900/60 min-h-[440px] space-y-3 font-sans">
              {/* Header simulado de comercio */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{identity?.businessId || 'Tu Comercio'}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Abierto • Delivery 35 min
                  </p>
                </div>
              </div>

              {/* CARD DE ANUNCIO EN VIVO */}
              {isActive ? (
                <div className="bg-slate-950 border border-blue-500/40 rounded-2xl p-3.5 shadow-lg space-y-2.5 transition-all">
                  {/* Título & Badge */}
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-100 leading-snug line-clamp-2">
                        {title || 'Título de tu anuncio...'}
                      </p>
                    </div>
                  </div>

                  {/* Imagen en preview */}
                  {showImage && displayImage && (
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                      <img 
                        src={displayImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}

                  {/* Descripción */}
                  {description && (
                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                      {description}
                    </p>
                  )}

                  {/* CTA */}
                  {showCTA && ctaLabel && (
                    <div className="pt-1 flex justify-end">
                      <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md">
                        <span>{ctaLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-1 text-slate-500">
                  <p className="text-xs font-bold">Anuncio Inactivo</p>
                  <p className="text-[10px]">No se muestra ningún espacio en blanco en la app del cliente.</p>
                </div>
              )}

              {/* Buscador de menú simulado */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-500">
                Buscar en el menú...
              </div>

              {/* Items simulados */}
              <div className="space-y-1.5 opacity-60">
                <div className="h-10 bg-slate-900/60 border border-slate-800/40 rounded-xl" />
                <div className="h-10 bg-slate-900/60 border border-slate-800/40 rounded-xl" />
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="h-5 bg-slate-950 flex justify-center items-center">
              <div className="w-24 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
