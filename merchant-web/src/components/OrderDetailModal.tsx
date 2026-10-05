import React from 'react';
import { X, Clock, User, Phone, Tag, CheckCircle, RefreshCw, Truck } from 'lucide-react';
import type { OrderItem } from '../modules/OrdersModule';
import { resolveItemVisual } from '../shared/utils/categoryIconResolver';

interface OrderDetailModalProps {
  order: OrderItem;
  businessCategory?: string;
  onClose: () => void;
  onAdvanceStatus?: (orderId: string, nextStatus: any) => void;
  onOpenRejectModal?: (order: OrderItem) => void;
  onOpenCourierModal?: (order: OrderItem) => void;
  isProcessing?: boolean;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  businessCategory,
  onClose,
  onAdvanceStatus,
  onOpenRejectModal,
  onOpenCourierModal,
  isProcessing = false
}) => {
  const items = Array.isArray(order.itemsList) && order.itemsList.length > 0
    ? order.itemsList
    : [{ name: order.items, quantity: 1, price: order.merchantGrossSales || 0 }];

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-obsidian-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                #{order.orderNumber}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {order.timeAgo}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-1">
              Detalle del Pedido
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Información del Cliente */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" /> Cliente
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <p className="font-semibold text-slate-200 text-sm">{order.customerName}</p>
              {order.customerPhone && (
                <a 
                  href={`tel:${order.customerPhone}`}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <Phone className="w-3 h-3" /> {order.customerPhone}
                </a>
              )}
            </div>

            {order.deliveryNote && (
              <div className="mt-2 p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-200 text-xs">
                📝 <strong>Instrucciones:</strong> {order.deliveryNote}
              </div>
            )}
          </div>

          {/* Lista de Productos Solicitados */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Productos Solicitados
            </span>

            <div className="divide-y divide-slate-800/80 bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
              {items.map((it: any, idx: number) => {
                const visual = resolveItemVisual(it, businessCategory);
                const qty = Number(it.quantity || 1);
                const unitPrice = Number(it.price || it.unitPrice || 0);
                const subtotal = unitPrice > 0 ? unitPrice * qty : 0;

                return (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/20 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      {visual.hasImage && visual.imageUrl ? (
                        <img 
                          src={visual.imageUrl} 
                          alt={it.productName || it.name || 'Producto'} 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                          onError={(e) => {
                            // Fallback a emoji en caso de error de imagen
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-lg flex-shrink-0">
                          {visual.emoji}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                          {it.productName || it.name || 'Producto'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {qty} × {unitPrice > 0 ? `C$ ${unitPrice.toFixed(2)}` : 'Precio según orden'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {subtotal > 0 && (
                        <span className="font-bold text-slate-200 text-xs sm:text-sm">
                          C$ {subtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose Financiero Exclusivo del Comercio */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Subtotal Productos</span>
              <span className="font-semibold text-slate-300">
                {order.merchantGrossSalesFormatted || `C$ ${(order.merchantGrossSales || 0).toFixed(2)}`}
              </span>
            </div>

            {order.couponDiscount && order.couponDiscount > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-400">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Descuento Comercial {order.couponCode ? `(${order.couponCode})` : ''}
                </span>
                <span className="font-semibold">
                  -C$ {order.couponDiscount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Valor de Productos
                </span>
                <span className="text-[10px] text-slate-500">
                  Importe exclusivo de venta del comercio
                </span>
              </div>
              <span className="text-base sm:text-xl font-black text-emerald-400">
                {order.merchantGrossSalesFormatted || `C$ ${(order.merchantGrossSales || 0).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Asignación de Courier si existe */}
          {order.assignedCourierName && (
            <div className="p-3 bg-slate-900 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-purple-300 font-semibold">
                <Truck className="w-4 h-4 text-purple-400" />
                <span>Repartidor: {order.assignedCourierName}</span>
              </div>
              {order.assignedCourierPlate && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                  {order.assignedCourierPlate}
                </span>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer / Acciones Operacionales */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap gap-2 justify-end">
          {order.canonicalStatus === 'PENDING' && (
            <>
              {onOpenRejectModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenRejectModal(order);
                  }}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 transition disabled:opacity-50"
                >
                  ✕ Rechazar
                </button>
              )}
              {onAdvanceStatus && (
                <button
                  onClick={() => {
                    onAdvanceStatus(order.id, 'PREPARING');
                    onClose();
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Confirmar Pedido</span>
                </button>
              )}
            </>
          )}

          {order.canonicalStatus === 'PREPARING' && onAdvanceStatus && (
            <button
              onClick={() => {
                onAdvanceStatus(order.id, 'READY');
                onClose();
              }}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>Marcar como Listo</span>
            </button>
          )}

          {order.canonicalStatus === 'READY' && onOpenCourierModal && (
            <button
              onClick={() => {
                onClose();
                onOpenCourierModal(order);
              }}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>🛵 Asignar Motorizado</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
