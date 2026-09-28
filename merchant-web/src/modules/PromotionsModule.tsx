import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, AlertCircle, Megaphone } from 'lucide-react';
import { db } from '../shared/services/firebase';
import { useAuth } from '../shared/context/AuthContext';
import { CommerceAnnouncementPanel } from './promotions/CommerceAnnouncementPanel';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

interface CouponItem {
  id: string;
  code: string;
  scope: 'GLOBAL' | 'MERCHANT_SPECIFIC';
  businessId: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount?: number | null;
  startsAt: any;
  expiresAt: any;
  isActive: boolean;
  usageLimit?: number | null;
  usageCount: number;
  perCustomerLimit?: number | null;
  description?: string;
  stackable?: boolean;
}

export const PromotionsModule: React.FC = () => {
  const { identity } = useAuth();
  const businessId = identity?.businessId || '';

  const [activeTab, setActiveTab] = useState<'announcement' | 'coupons'>('announcement');
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minimumOrderAmount, setMinimumOrderAmount] = useState<number>(0);
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState<string>('');
  const [expiresAtStr, setExpiresAtStr] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [perCustomerLimit, setPerCustomerLimit] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    // Escuchar cupones específicos de este comercio
    const q = query(
      collection(db, 'coupons'),
      where('scope', '==', 'MERCHANT_SPECIFIC'),
      where('businessId', '==', businessId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: CouponItem[] = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CouponItem));
      setCoupons(list);
      setIsLoading(false);
    }, (err) => {
      console.error('[PROMOTIONS_MODULE] Error escuchando cupones:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, [businessId]);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(10);
    setMinimumOrderAmount(0);
    setMaximumDiscountAmount('');
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    setExpiresAtStr(future.toISOString().split('T')[0]);
    setUsageLimit('');
    setPerCustomerLimit(1);
    setDescription('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: CouponItem) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinimumOrderAmount(c.minimumOrderAmount || 0);
    setMaximumDiscountAmount(c.maximumDiscountAmount ? c.maximumDiscountAmount.toString() : '');
    if (c.expiresAt) {
      const d = c.expiresAt.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
      setExpiresAtStr(d.toISOString().split('T')[0]);
    }
    setUsageLimit(c.usageLimit ? c.usageLimit.toString() : '');
    setPerCustomerLimit(c.perCustomerLimit || 1);
    setDescription(c.description || '');
    setIsActive(c.isActive !== false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      setFormError('No se encontró el ID de comercio autenticado.');
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('El código del cupón es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const expiresAt = expiresAtStr ? new Date(expiresAtStr + 'T23:59:59') : new Date(Date.now() + 365 * 24 * 3600 * 1000);
      const couponRef = editingCoupon ? doc(db, 'coupons', editingCoupon.id) : doc(collection(db, 'coupons'));

      const payload: any = {
        code: cleanCode,
        scope: 'MERCHANT_SPECIFIC',
        businessId,
        discountType,
        discountValue: discountType === 'FREE_DELIVERY' ? 0 : Number(discountValue) || 0,
        minimumOrderAmount: Number(minimumOrderAmount) || 0,
        maximumDiscountAmount: maximumDiscountAmount ? Number(maximumDiscountAmount) : null,
        expiresAt,
        startsAt: editingCoupon ? editingCoupon.startsAt : serverTimestamp(),
        isActive,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerLimit: Number(perCustomerLimit) || 1,
        description: description.trim(),
        stackable: false,
        priority: 1,
        updatedAt: serverTimestamp(),
      };

      if (!editingCoupon) {
        payload.createdAt = serverTimestamp();
        payload.usageCount = 0;
        payload.createdBy = identity?.uid || '';
      }

      await setDoc(couponRef, payload, { merge: true });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('[PROMOTIONS_MODULE] Error guardando cupón:', err);
      setFormError(err.message || 'Error al guardar el cupón.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (c: CouponItem) => {
    try {
      await updateDoc(doc(db, 'coupons', c.id), {
        isActive: !c.isActive,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[PROMOTIONS_MODULE] Error toggling status:', err);
    }
  };

  const handleDelete = async (c: CouponItem) => {
    if (!window.confirm(`¿Estás seguro de eliminar el cupón ${c.code}?`)) return;
    try {
      await deleteDoc(doc(db, 'coupons', c.id));
    } catch (err) {
      console.error('[PROMOTIONS_MODULE] Error eliminando cupón:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Selector de Subpestañas */}
      <div className="flex border-b border-slate-800 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('announcement')}
          className={`pb-3 font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'announcement'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Anuncio del Comercio (Announcement Card)</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'coupons'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Cupones de Descuento</span>
        </button>
      </div>

      {activeTab === 'announcement' ? (
        <CommerceAnnouncementPanel />
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center bg-obsidian-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-100">Promociones & Cupones del Comercio</h1>
                  <p className="text-xs text-slate-400">Crea códigos de descuento exclusivos para los clientes de tu tienda.</p>
                </div>
              </div>
            </div>
            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Crear Cupón Exclusivo
            </button>
          </div>

      {/* Lista de Cupones */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-obsidian-900 border border-slate-800 rounded-2xl">
          Cargando promociones de tu comercio...
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
            <Tag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-100">Sin Cupones Activos</h3>
            <p className="text-xs text-slate-400">
              Crea tu primer código promocional para atraer más ventas y premiar a tus clientes.
            </p>
          </div>
          <button 
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" /> Crear Primer Cupón
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => {
            const discountLabel = 
              c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` :
              c.discountType === 'FIXED_AMOUNT' ? `C$ ${c.discountValue.toFixed(2)} OFF` : 'ENVÍO GRATIS';

            const minStr = c.minimumOrderAmount > 0 ? `C$ ${c.minimumOrderAmount.toFixed(2)}` : 'Sin mínimo';

            return (
              <div 
                key={c.id} 
                className={`bg-slate-900 border ${c.isActive ? 'border-slate-800' : 'border-rose-900/40 opacity-75'} p-5 rounded-2xl space-y-3 shadow-lg flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      {c.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                      {c.isActive ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-100">{discountLabel}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{c.description || 'Promoción en tu tienda'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Mínimo Compra</span>
                      <span className="font-semibold text-slate-200">{minStr}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Usos Registrados</span>
                      <span className="font-semibold text-slate-200">{c.usageCount || 0} {c.usageLimit ? `/ ${c.usageLimit}` : 'veces'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                  <button 
                    onClick={() => handleToggleActive(c)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${c.isActive ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'}`}
                  >
                    {c.isActive ? 'Pausar' : 'Activar'}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleOpenEditModal(c)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(c)}
                      className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-100">
                {editingCoupon ? 'Editar Cupón de Tienda' : 'Nuevo Cupón para tu Comercio'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Código del Cupón *</label>
                <input 
                  type="text" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required 
                  placeholder="Ej: PIZZA15" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 font-mono uppercase text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Tipo de Descuento *</label>
                  <select 
                    value={discountType} 
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="PERCENTAGE">Porcentaje (% OFF)</option>
                    <option value="FIXED_AMOUNT">Monto Fijo (C$ OFF)</option>
                    <option value="FREE_DELIVERY">Envío Gratis</option>
                  </select>
                </div>
                {discountType !== 'FREE_DELIVERY' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">
                      {discountType === 'PERCENTAGE' ? 'Porcentaje (%) *' : 'Monto (C$) *'}
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      value={discountValue} 
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      required 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Monto Mínimo de Pedido (C$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={minimumOrderAmount} 
                    onChange={(e) => setMinimumOrderAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Fecha de Vencimiento *</label>
                  <input 
                    type="date" 
                    value={expiresAtStr} 
                    onChange={(e) => setExpiresAtStr(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Descripción para los clientes</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: 15% de descuento en pedidos mayores a C$ 200" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="mIsActive" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-blue-500"
                />
                <label htmlFor="mIsActive" className="font-bold text-slate-200 cursor-pointer">Activar inmediatamente</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
