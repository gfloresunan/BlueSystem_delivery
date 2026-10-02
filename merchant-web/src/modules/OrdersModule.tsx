import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, MapPin, CheckCircle, Sparkles, RefreshCw, AlertCircle, 
  ShoppingBag, MessageSquare, Phone, Lock, Clock, Truck
} from 'lucide-react';
import { useTabState } from '../shared/context/TabStateContext';
import { SkeletonCard } from '../shared/components/Skeleton';
import { db } from '../shared/services/firebase';
import { useAuth } from '../shared/context/AuthContext';
import { getMerchantOrderFinancials } from '../shared/utils/merchantFinancialMapper';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  runTransaction,
  getDocs,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import type { CourierOption, ResolvedCourierIdentity } from '../shared/utils/courierIdentityResolver';
import { 
  resolveCourierIdentity,
  getOrderCourierDisplayName,
  isOrderAssigned,
  getOrderAssignedCourierId,
  isCanonicalCourier,
  resolveEiamRole
} from '../shared/utils/courierIdentityResolver';
import { useCourierDirectory } from '../shared/hooks/useCourierDirectory';

export type { CourierOption, ResolvedCourierIdentity };
export { 
  resolveCourierIdentity, 
  getOrderCourierDisplayName, 
  isOrderAssigned, 
  getOrderAssignedCourierId 
};

export type CanonicalOrderStatus = 
  | 'PENDING' 
  | 'PREPARING' 
  | 'READY' 
  | 'ASSIGNED' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type MerchantColumnKey = 
  | 'NUEVOS' 
  | 'PENDIENTES' 
  | 'PREPARACION' 
  | 'DELIVERY' 
  | 'ENTREGAS_HOY'
  | 'HISTORIAL_SOLO';

export interface OrderItem {
  id: string;
  orderNumber: string;
  orderCode?: string;
  orderShortCode?: string;
  orderSequence?: number;
  orderCodePrefix?: string;
  customerName: string;
  customerPhone?: string;
  items: string;
  itemsList?: Array<{ name?: string; productName?: string; quantity?: number; price?: number }>;
  total: string;
  totalAmount?: number;
  productSubtotal?: number;
  productSubtotalFormatted?: string;
  rawProductsSubtotal?: number;
  commercialDiscount?: number;
  merchantGrossSales?: number;
  merchantGrossSalesFormatted?: string;
  merchantCommissionRate?: number;
  merchantCommissionAmount?: number;
  merchantNetPayout?: number;
  subtotalAmount?: number;
  couponCode?: string;
  couponDiscount?: number;
  deliveryFee?: number;
  tipAmount?: number;
  additionalChargeAmount?: number;
  deliveryNote?: string;
  canonicalStatus: CanonicalOrderStatus;
  status: CanonicalOrderStatus;
  estado?: string;
  timeAgo: string;
  createdAt?: any;
  deliveredAt?: any;
  completedAt?: any;
  entregadoAt?: any;
  updatedAt?: any;
  driverName?: string;
  motorizadoId?: string;
  courierId?: string;
  assignedCourierId?: string;
  assignedCourierName?: string;
  assignedCourierPlate?: string;
  slaMinutes?: number;
  tenantId?: string;
  cityId?: string;
  departmentId?: string;
  municipalityId?: string;
  cityName?: string;
  branchId?: string;
  isPendingResolution?: boolean;
  isScheduled?: boolean;
  pendingReason?: string;
}

// ─── CANONICAL STATUS NORMALIZER ─────────────────────────────────────────────
export const normalizeCanonicalStatus = (data: any): CanonicalOrderStatus => {
  const rawStatus = String(data.status || '').trim().toUpperCase();
  const rawEstado = String(data.estado || '').trim().toLowerCase();
  const courierPhase = Number(data.courierPhase || 0);

  // 1. Cancelled / Rejected
  if (
    rawStatus === 'CANCELLED' || 
    rawStatus === 'REJECTED' || 
    rawEstado === 'cancelado' || 
    rawEstado === 'rechazado'
  ) {
    return 'CANCELLED';
  }

  // 2. Delivered / Completed
  if (
    rawStatus === 'DELIVERED' || 
    rawStatus === 'COMPLETED' || 
    rawEstado === 'entregado' || 
    rawEstado === 'completado' ||
    courierPhase === 4
  ) {
    return rawStatus === 'COMPLETED' || rawEstado === 'completado' ? 'COMPLETED' : 'DELIVERED';
  }

  // 3. In Transit / Delivering
  if (
    rawStatus === 'IN_TRANSIT' || 
    rawStatus === 'DELIVERING' || 
    rawEstado === 'en_ruta' || 
    rawEstado === 'en_transito' ||
    courierPhase === 3
  ) {
    return 'IN_TRANSIT';
  }

  // 4. Assigned (Courier accepted or assigned)
  if (
    rawStatus === 'ASSIGNED' || 
    rawEstado === 'asignado' || 
    rawEstado === 'aceptado' ||
    courierPhase === 2 ||
    (Boolean(data.assignedCourierId || data.motorizadoId) && courierPhase >= 1 && rawStatus !== 'READY')
  ) {
    return 'ASSIGNED';
  }

  // 5. Ready
  if (
    rawStatus === 'READY' || 
    rawEstado === 'listo' || 
    rawEstado === 'packed'
  ) {
    return 'READY';
  }

  // 6. Preparing
  if (
    rawStatus === 'PREPARING' || 
    rawEstado === 'preparando' || 
    rawEstado === 'cooking' ||
    rawEstado === 'en_preparacion'
  ) {
    return 'PREPARING';
  }

  // 7. Default to PENDING
  return 'PENDING';
};

// ─── FECHA DE ENTREGA HOY RESOLVER ───────────────────────────────────────────
export const isDeliveredToday = (order: OrderItem): boolean => {
  const deliveryDateRaw = order.deliveredAt || order.completedAt || order.entregadoAt || order.updatedAt;
  if (!deliveryDateRaw) return false;

  const deliveryDate = deliveryDateRaw instanceof Date 
    ? deliveryDateRaw 
    : typeof deliveryDateRaw.toDate === 'function'
    ? deliveryDateRaw.toDate()
    : new Date(deliveryDateRaw);

  if (isNaN(deliveryDate.getTime())) return false;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  return deliveryDate >= startOfDay && deliveryDate < endOfDay;
};

// ─── RESOLVER CANÓNICO DE COLUMNAS CON EXCLUSIÓN MUTUA ───────────────────────
export const resolveMerchantOrderColumn = (order: OrderItem): MerchantColumnKey => {
  const status = order.canonicalStatus;

  // Cancelados van exclusivamente a Historial
  if (status === 'CANCELLED') {
    return 'HISTORIAL_SOLO';
  }

  // Entregados/Completados: solo aparecen en Entregas de Hoy si fueron entregados HOY
  if (status === 'DELIVERED' || status === 'COMPLETED') {
    if (isDeliveredToday(order)) {
      return 'ENTREGAS_HOY';
    }
    return 'HISTORIAL_SOLO';
  }

  // En proceso de delivery
  if (status === 'READY' || status === 'ASSIGNED' || status === 'IN_TRANSIT') {
    return 'DELIVERY';
  }

  // Preparación
  if (status === 'PREPARING') {
    return 'PREPARACION';
  }

  // Nuevos vs. Pendientes
  if (status === 'PENDING') {
    if (order.isPendingResolution || order.isScheduled || order.pendingReason) {
      return 'PENDIENTES';
    }
    return 'NUEVOS';
  }

  return 'HISTORIAL_SOLO';
};

export const OrdersModule: React.FC = () => {
  const { identity } = useAuth();
  const businessId = identity?.businessId || '';
  const tenantId = (identity as any)?.tenantId || '';
  const { couriers: globalCouriers } = useCourierDirectory(businessId, tenantId);
  const [isLoading, setIsLoading] = useState(true);
  const { getModuleState, setModuleState } = useTabState();

  const savedState = getModuleState('orders');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(savedState.activeSubTab === 'list' ? 'list' : 'kanban');
  const [searchQuery, setSearchQuery] = useState(savedState.searchQuery || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Modal Asignación de Courier
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<OrderItem | null>(null);
  const [courierList, setCourierList] = useState<CourierOption[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [assigningCourierId, setAssigningCourierId] = useState<string | null>(null);

  const effectiveCourierList = useMemo(() => {
    return courierList.length > 0 ? courierList : globalCouriers;
  }, [courierList, globalCouriers]);

  // Modal Rechazo
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedOrderForReject, setSelectedOrderForReject] = useState<OrderItem | null>(null);
  const [rejectReasonOption, setRejectReasonOption] = useState<string>('Producto no disponible');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Modal Detalle de Pedido (Exclusivo Productos & Merchant)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<OrderItem | null>(null);

  // Modal Chat en Vivo (Auditoría Solo Lectura)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState<OrderItem | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // ─── ESTADO DEL MÓDULO DE HISTORIAL DE PEDIDOS ──────────────────────────────
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyDatePreset, setHistoryDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('LAST_7_DAYS');
  const [customDateFrom, setCustomDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customDateTo, setCustomDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Listener para mensajes de chat en vivo
  useEffect(() => {
    if (!isChatModalOpen || !chatOrder?.id) {
      setChatMessages([]);
      return;
    }
    setIsLoadingChat(true);
    const msgRef = collection(db, 'orders', chatOrder.id, 'messages');
    const q = query(msgRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChatMessages(msgs);
        setIsLoadingChat(false);
      },
      (err) => {
        console.error('Error fetching order messages in Merchant Web:', err);
        setIsLoadingChat(false);
      }
    );
    return () => unsubscribe();
  }, [isChatModalOpen, chatOrder?.id]);

  const handleOpenChatModal = (order: OrderItem) => {
    setChatOrder(order);
    setIsChatModalOpen(true);
  };

  const handleOpenCourierModal = async (order: OrderItem) => {
    setSelectedOrderForAssign(order);
    setIsCourierModalOpen(true);
    setIsLoadingCouriers(true);

    try {
      const couriersMap = new Map<string, CourierOption>();
      const orderTenant = order.tenantId || (identity as any)?.tenantId || '';
      const orderMuni = (order.municipalityId || order.cityId || '').trim().toUpperCase();

      // Cargar /users y /couriers concurrentemente (BSD-COURIER-ELIGIBILITY-SOURCE-OF-TRUTH-FORENSIC-001)
      const [usersSnap, couriersColSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'couriers'))
      ]);

      const usersDataMap = new Map<string, any>();
      usersSnap.docs.forEach((d) => usersDataMap.set(d.id, { id: d.id, ...d.data() }));

      const couriersDataMap = new Map<string, any>();
      couriersColSnap.docs.forEach((d) => couriersDataMap.set(d.id, { id: d.id, ...d.data() }));

      // Unificar todos los IDs candidatos
      const candidateIds = new Set<string>([...couriersDataMap.keys()]);
      usersDataMap.forEach((u, uid) => {
        if (resolveEiamRole(u) === 'DRIVER') {
          candidateIds.add(uid);
        }
      });

      // Validación estricta con el resolver canónico centralizado
      for (const cid of candidateIds) {
        const cData = couriersDataMap.get(cid) || null;
        const uData = usersDataMap.get(cid) || null;

        const check = isCanonicalCourier(cData, uData);
        if (!check.isEligible) continue;

        const d = { ...(uData || {}), ...(cData || {}) };
        const courierTenant = String(d.tenantId || d.activeTenantId || '');
        const courierMuni = String(d.municipalityId || d.cityId || d.city || '').trim().toUpperCase();
        const courierDept = String(d.departmentId || '').trim().toUpperCase();

        if (orderTenant && courierTenant && orderTenant !== courierTenant) continue;
        if (orderMuni && courierMuni && orderMuni !== courierMuni) continue;

        const name = d.name || d.nombre || d.displayName || 'Motorizado';
        const driverId = d.driverId || d.codigoOperativo || (`DRV-${cid.substring(0, 4).toUpperCase()}`);
        const plate = d.licensePlate || d.placa || (d.vehicle && d.vehicle.plate) || 'M-Oficial';
        const status = d.status || d.shiftState || d.courierState || 'Disponible';
        const isAvailable = !d.activeOrderId && d.status !== 'SUSPENDED';

        couriersMap.set(cid, {
          id: cid,
          name,
          driverId,
          plate,
          status,
          isAvailable,
          tenantId: courierTenant,
          cityId: courierMuni,
          departmentId: courierDept,
          municipalityId: d.municipalityId || courierMuni,
          cityName: d.municipalityName || d.city || ''
        });
      }

      // 3. Enriquecer con Estado Financiero Canónico (/courier_balances)
      try {
        const balancesSnap = await getDocs(collection(db, 'courier_balances'));
        balancesSnap.docs.forEach((bDoc) => {
          const bData = bDoc.data();
          const cid = bDoc.id;
          if (couriersMap.has(cid)) {
            const existing = couriersMap.get(cid)!;
            const canReceive = bData.canReceiveNewOrders ?? true;
            const accessState = String(bData.financialAccessState || 'ALLOW');
            const cashCents = Number(bData.cashOutstandingCents || 0);
            const limitCents = Number(bData.effectiveCashLimitCents || bData.cashLimitCents || 200000);
            const hasOverdue = bData.hasOverdueClosure === true;
            const reason = bData.financialAccessReason || 'Límite de efectivo alcanzado o cierre pendiente.';

            const isBlocked = !canReceive || accessState.startsWith('BLOCKED') || hasOverdue || (limitCents > 0 && cashCents >= limitCents);
            if (isBlocked) {
              couriersMap.set(cid, {
                ...existing,
                isAvailable: false,
                isFinanciallyBlocked: true,
                financialBlockReason: reason
              });
            }
          }
        });
      } catch (bErr) {
        console.warn('Error loading courier_balances in modal:', bErr);
      }

      setCourierList(Array.from(couriersMap.values()));
    } catch (err) {
      console.error('Error fetching couriers:', err);
    } finally {
      setIsLoadingCouriers(false);
    }
  };

  const handleConfirmAssignCourier = async (courier: CourierOption) => {
    if (!activeSelectedOrder) return;
    const orderId = activeSelectedOrder.id;
    const orderNumber = activeSelectedOrder.orderNumber;
    setAssigningCourierId(courier.id);

    try {
      const orderRef = doc(db, 'orders', orderId);
      const courierRef = doc(db, 'users', courier.id);
      const balanceRef = doc(db, 'courier_balances', courier.id);

      const assignmentResult = await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('El pedido no existe.');
        }

        const data = orderSnap.data();
        const existingCourierId = data.assignedCourierId || data.motorizadoId || data.courierId;

        if (existingCourierId === courier.id) {
          return 'ALREADY_SAME';
        }

        if (existingCourierId && existingCourierId !== '') {
          throw new Error('Este pedido ya fue asignado a otro motorizado.');
        }

        // 1. Verificación Estricta de Restricciones Financieras del Motorizado
        const balanceSnap = await transaction.get(balanceRef);
        if (balanceSnap.exists()) {
          const balData = balanceSnap.data();
          const canReceive = balData.canReceiveNewOrders ?? true;
          const accessState = String(balData.financialAccessState || 'ALLOW');
          const cashCents = Number(balData.cashOutstandingCents || 0);
          const limitCents = Number(balData.effectiveCashLimitCents || balData.cashLimitCents || 200000);
          const hasOverdue = balData.hasOverdueClosure === true;
          const reason = balData.financialAccessReason || 'Límite de efectivo alcanzado o cierre diario pendiente.';

          if (!canReceive || accessState.startsWith('BLOCKED') || hasOverdue || (limitCents > 0 && cashCents >= limitCents)) {
            throw new Error(`Asignación rechazada: El motorizado ${courier.name} tiene restricciones financieras activas (${reason}).`);
          }
        }

        const courierDocSnap = await transaction.get(courierRef);
        const courierData = courierDocSnap.exists() ? courierDocSnap.data() : {};
        const courierTenant = String(courierData.tenantId || courierData.activeTenantId || courier.tenantId || '');
        const courierMuni = String(courierData.municipalityId || courierData.cityId || courierData.city || courier.municipalityId || courier.cityId || '').trim().toUpperCase();

        const orderTenant = String(data.tenantId || activeSelectedOrder.tenantId || (identity as any)?.tenantId || '');
        const orderMuni = String(data.municipalityId || data.cityId || activeSelectedOrder.municipalityId || activeSelectedOrder.cityId || '').trim().toUpperCase();

        if (courierTenant && orderTenant && courierTenant !== orderTenant) {
          throw new Error(`Asignación rechazada: Incompatibilidad de Tenant (${courierTenant} vs ${orderTenant}).`);
        }

        if (courierMuni && orderMuni && courierMuni !== orderMuni) {
          throw new Error(`Asignación rechazada: El motorizado no pertenece al mismo municipio operacional (${courierMuni} vs ${orderMuni}).`);
        }

        const currentHist = (data.historialEstados as any[]) || [];
        const newHist = [
          ...currentHist,
          {
            estado: 'asignado',
            status: 'assigned',
            assignedCourierId: courier.id,
            motorizadoId: courier.id,
            timestamp: new Date().toISOString(),
            triggeredBy: 'MERCHANT_MANUAL_ASSIGNMENT'
          }
        ];

        transaction.update(orderRef, {
          status: 'assigned',
          estado: 'asignado',
          assignedCourierId: courier.id,
          motorizadoId: courier.id,
          driverName: courier.name,
          assignedCourierName: courier.name,
          motorizadoNombre: courier.name,
          assignedCourierPlate: courier.plate,
          motorizadoPlaca: courier.plate,
          courierPhase: 1,
          assignedAt: serverTimestamp(),
          historialEstados: newHist,
          updatedAt: serverTimestamp()
        });

        return 'ASSIGNED';
      });

      if (assignmentResult === 'ALREADY_SAME') {
        setActionFeedback({
          message: `ℹ️ El pedido #${orderNumber} ya se encuentra asignado a ${courier.name}.`,
          isError: false
        });
        setIsCourierModalOpen(false);
        setSelectedOrderForAssign(null);
        return;
      }

      await setDoc(doc(collection(db, 'audit_events')), {
        event: 'ORDER_COURIER_ASSIGNED_MANUALLY',
        domain: 'OPERATIONS',
        uid: identity?.uid || '',
        actorUid: identity?.uid || '',
        businessId,
        orderId,
        assignedCourierId: courier.id,
        courierName: courier.name,
        courierPlate: courier.plate,
        triggeredBy: 'MERCHANT_OWNER',
        timestamp: serverTimestamp()
      });

      setActionFeedback({
        message: `🛵 Pedido #${orderNumber} asignado exitosamente a ${courier.name} (${courier.plate})`,
        isError: false
      });

      setIsCourierModalOpen(false);
      setSelectedOrderForAssign(null);
    } catch (err: any) {
      const errMsg = err.message || 'No se pudo realizar la asignación de motorizado.';
      if (errMsg.includes('ya fue asignado')) {
        setActionFeedback({
          message: '⚠️ Este pedido acaba de ser asignado a otro motorizado. Actualizamos la información automáticamente.',
          isError: true
        });
      } else {
        console.error('[ORDER_ASSIGNMENT_ERROR]', err);
        setActionFeedback({ message: errMsg, isError: true });
      }
    } finally {
      setAssigningCourierId(null);
    }
  };

  const activeSelectedOrder = selectedOrderForAssign
    ? (orders.find((o) => o.id === selectedOrderForAssign.id) || selectedOrderForAssign)
    : null;

  useEffect(() => {
    if (!businessId) return;
    const branchesQuery = query(collection(db, 'branches'), where('businessId', '==', businessId));
    const unsubBranches = onSnapshot(branchesQuery, (snap) => {
      const bList = snap.docs.map(docSnap => ({ id: docSnap.id, name: docSnap.data().name || docSnap.id }));
      setBranches(bList);
    });
    return () => unsubBranches();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('businessId', '==', businessId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: OrderItem[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();

            if (selectedBranchId !== 'ALL' && d.branchId && d.branchId !== selectedBranchId) {
              return null;
            }

            const canonical = normalizeCanonicalStatus(d);

            let itemsSummary = '';
            if (Array.isArray(d.items)) {
              itemsSummary = d.items
                .map((item: any) => `${item.quantity || 1}x ${item.productName || item.name || 'Producto'}`)
                .join(', ');
            } else if (d.items) {
              itemsSummary = String(d.items);
            }

            let timeAgoStr = 'Hace un momento';
            if (d.createdAt) {
              const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
              const diffMs = Date.now() - date.getTime();
              const diffMin = Math.floor(diffMs / 60000);
              if (diffMin > 60) {
                const diffHr = Math.floor(diffMin / 60);
                timeAgoStr = `Hace ${diffHr} hr${diffHr > 1 ? 's' : ''}`;
              } else if (diffMin > 0) {
                timeAgoStr = `Hace ${diffMin} min${diffMin > 1 ? 's' : ''}`;
              } else {
                timeAgoStr = 'Hace un momento';
              }
            }

            const assignedCourierId = d.assignedCourierId || d.courierId || d.motorizadoId || undefined;
            const driverName = d.assignedCourierName || d.driverName || d.motorizadoNombre || undefined;
            const assignedCourierPlate = d.assignedCourierPlate || d.motorizadoPlaca || undefined;

            const fin = getMerchantOrderFinancials(d);
            const grossSalesVal = fin.productSubtotal;
            const commissionRateVal = Number(d.merchantCommissionRate || 0.15);
            const commissionAmtVal = Number(d.merchantCommissionAmount ?? Math.round(grossSalesVal * commissionRateVal * 100) / 100);
            const netPayoutVal = Number(d.merchantNetPayout ?? Math.max(0, Math.round((grossSalesVal - commissionAmtVal) * 100) / 100));

            const rawCode = (d.orderCode || d.orderNumber || '').toString().trim();
            const resolvedOrderCode = rawCode || docSnap.id.substring(Math.max(0, docSnap.id.length - 6)).toUpperCase();
            const resolvedShortCode = (d.orderShortCode || '').toString().trim() || (rawCode ? rawCode.slice(-4) : docSnap.id.substring(Math.max(0, docSnap.id.length - 4)).toUpperCase());

            return {
              id: docSnap.id,
              orderNumber: resolvedOrderCode,
              orderCode: resolvedOrderCode,
              orderShortCode: resolvedShortCode,
              orderSequence: Number(d.orderSequence || 0),
              orderCodePrefix: (d.orderCodePrefix || '').toString().trim(),
              customerName: d.customerName || d.clienteNombre || 'Cliente',
              customerPhone: d.customerPhone || d.clienteTelefono || d.phone || undefined,
              items: itemsSummary || 'Sin items',
              itemsList: Array.isArray(d.items) ? d.items : undefined,
              total: `C$ ${fin.customerTotal.toFixed(2)}`,
              totalAmount: fin.customerTotal,
              productSubtotal: fin.productSubtotal,
              productSubtotalFormatted: fin.productSubtotalFormatted,
              rawProductsSubtotal: fin.rawProductsSubtotal,
              commercialDiscount: fin.commercialDiscount,
              merchantGrossSales: grossSalesVal,
              merchantGrossSalesFormatted: fin.productSubtotalFormatted,
              merchantCommissionRate: commissionRateVal,
              merchantCommissionAmount: commissionAmtVal,
              merchantNetPayout: netPayoutVal,
              subtotalAmount: fin.rawProductsSubtotal,
              couponCode: fin.couponCode,
              couponDiscount: fin.commercialDiscount,
              deliveryFee: d.deliveryFee || 0,
              tipAmount: d.tipAmount || d.tip || undefined,
              additionalChargeAmount: d.additionalChargeAmount || d.additionalCharge || undefined,
              deliveryNote: d.deliveryNote || d.notes || d.deliveryInstructions || d.instructions || undefined,
              canonicalStatus: canonical,
              status: canonical,
              estado: d.estado || '',
              timeAgo: timeAgoStr,
              createdAt: d.createdAt,
              deliveredAt: d.deliveredAt || d.completedAt || d.entregadoAt || null,
              completedAt: d.completedAt || null,
              entregadoAt: d.entregadoAt || null,
              updatedAt: d.updatedAt,
              driverName: driverName,
              motorizadoId: d.motorizadoId || undefined,
              courierId: d.courierId || undefined,
              assignedCourierId: assignedCourierId,
              assignedCourierName: driverName,
              assignedCourierPlate: assignedCourierPlate,
              slaMinutes: d.slaMinutes || 15,
              tenantId: d.tenantId || undefined,
              cityId: d.cityId || d.municipalityId || undefined,
              departmentId: d.departmentId || undefined,
              municipalityId: d.municipalityId || undefined,
              cityName: d.municipalityName || d.city || undefined,
              branchId: d.branchId || undefined,
              isPendingResolution: Boolean(d.isPendingResolution || d.holdReason || d.isPaused),
              isScheduled: Boolean(d.isScheduled || d.scheduledFor),
              pendingReason: d.pendingReason || d.holdReason || undefined
            } as OrderItem;
          })
          .filter((item): item is OrderItem => item !== null);

        list.sort((a, b) => {
          const docA = snap.docs.find((doc) => doc.id === a.id);
          const docB = snap.docs.find((doc) => doc.id === b.id);
          const tA = docA?.data().createdAt?.seconds || 0;
          const tB = docB?.data().createdAt?.seconds || 0;
          return tB - tA;
        });

        setOrders(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to orders:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [businessId, selectedBranchId]);

  const handleViewModeChange = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    setModuleState('orders', { activeSubTab: mode });
  };

  const handleSearchChange = (queryStr: string) => {
    setSearchQuery(queryStr);
    setModuleState('orders', { searchQuery: queryStr });
  };

  // ─── TRANSICIONES CANÓNICAS DE ESTADO ─────────────────────────────────────
  const handleAdvanceStatus = async (id: string, nextStatus: CanonicalOrderStatus) => {
    const order = orders.find((o) => o.id === id);
    if (!order || processingOrderId === id) return;

    let dbStatus = '';
    let dbEstado = '';
    let auditEvent = '';

    if (nextStatus === 'PREPARING') {
      dbStatus = 'preparing';
      dbEstado = 'preparando';
      auditEvent = 'ORDER_ACCEPTED';
    } else if (nextStatus === 'READY') {
      dbStatus = 'ready';
      dbEstado = 'listo';
      auditEvent = 'ORDER_READY';
    } else {
      alert("Transición de estado no autorizada para el perfil de comercio.");
      return;
    }

    setProcessingOrderId(id);
    setActionFeedback(null);

    try {
      const orderRef = doc(db, 'orders', id);
      await updateDoc(orderRef, {
        status: dbStatus,
        estado: dbEstado,
        updatedAt: serverTimestamp()
      });

      await setDoc(doc(collection(db, 'audit_events')), {
        event: auditEvent,
        domain: 'OPERATIONS',
        uid: identity?.uid || '',
        actorUid: identity?.uid || '',
        businessId,
        orgId: identity?.orgId || null,
        branchId: selectedBranchId !== 'ALL' ? selectedBranchId : identity?.branchId || null,
        orderId: id,
        triggeredBy: 'MERCHANT_OWNER',
        timestamp: serverTimestamp()
      });

      const label = nextStatus === 'PREPARING' ? 'en Preparación' : 'Listo para despacho';
      setActionFeedback({ message: `✓ Pedido #${order.orderNumber} pasó a "${label}" exitosamente`, isError: false });
    } catch (err: any) {
      console.error('Error actualizando pedido en Firestore:', err);
      setActionFeedback({ message: `No se pudo actualizar el pedido #${order.orderNumber}. Verificá tu conexión o permisos.`, isError: true });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleOpenRejectModal = (order: OrderItem) => {
    setSelectedOrderForReject(order);
    setRejectReasonOption('Producto no disponible');
    setCustomRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectOrder = async () => {
    if (!selectedOrderForReject || isSubmittingReject) return;
    const orderId = selectedOrderForReject.id;

    let finalReason = rejectReasonOption;
    if (rejectReasonOption === 'Otro') {
      if (!customRejectReason.trim()) {
        alert("Por favor especifique el motivo del rechazo.");
        return;
      }
      finalReason = customRejectReason.trim();
    }

    setIsSubmittingReject(true);
    setProcessingOrderId(orderId);
    setActionFeedback(null);

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'cancelled',
        estado: 'cancelado',
        rejectionReason: finalReason,
        rejectedBy: identity?.uid || 'MERCHANT_OWNER',
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      try {
        await setDoc(doc(collection(db, 'audit_events')), {
          event: 'ORDER_REJECTED',
          domain: 'OPERATIONS',
          uid: identity?.uid || '',
          actorUid: identity?.uid || '',
          businessId,
          orgId: identity?.orgId || null,
          branchId: selectedBranchId !== 'ALL' ? selectedBranchId : identity?.branchId || null,
          orderId,
          triggeredBy: 'MERCHANT_OWNER',
          metadata: {
            reason: finalReason,
            timestamp: new Date().toISOString()
          },
          timestamp: serverTimestamp()
        });
      } catch (auditErr) {
        console.warn('Advertencia audit_events al rechazar pedido:', auditErr);
      }

      setActionFeedback({ message: `❌ Pedido #${selectedOrderForReject.orderNumber} rechazado (${finalReason})`, isError: false });
      setIsRejectModalOpen(false);
      setSelectedOrderForReject(null);
    } catch (err: any) {
      console.error('Error al rechazar pedido en Firestore:', err);
      setActionFeedback({ message: `No se pudo rechazar el pedido: ${err.message || 'Verificá tu conexión o permisos.'}`, isError: true });
    } finally {
      setIsSubmittingReject(false);
      setProcessingOrderId(null);
    }
  };

  // ─── FILTRADO Y DISTRIBUCIÓN OPERACIONAL KANBAN ────────────────────────────
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.orderCode || '').toLowerCase().includes(q) ||
        (o.orderShortCode || '').toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const columnBuckets = useMemo(() => {
    const buckets: Record<MerchantColumnKey, OrderItem[]> = {
      NUEVOS: [],
      PENDIENTES: [],
      PREPARACION: [],
      DELIVERY: [],
      ENTREGAS_HOY: [],
      HISTORIAL_SOLO: []
    };

    filteredOrders.forEach((order) => {
      const column = resolveMerchantOrderColumn(order);
      buckets[column].push(order);
    });

    return buckets;
  }, [filteredOrders]);

  // ─── CONSULTA Y FILTROS DE HISTORIAL INDEPENDIENTE ─────────────────────────
  const historyOrders = useMemo(() => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (historyDatePreset === 'TODAY') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (historyDatePreset === 'YESTERDAY') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (historyDatePreset === 'LAST_7_DAYS') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    } else if (historyDatePreset === 'LAST_30_DAYS') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
    } else if (historyDatePreset === 'THIS_MONTH') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      fromDate = customDateFrom ? new Date(customDateFrom + 'T00:00:00') : new Date(0);
      toDate = customDateTo ? new Date(customDateTo + 'T23:59:59') : new Date();
    }

    return orders.filter((o) => {
      // Filtro de Texto
      const q = historySearchQuery.trim().toLowerCase();
      const matchesSearch = !q || (
        (o.orderCode || '').toLowerCase().includes(q) ||
        (o.orderShortCode || '').toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;

      // Filtro de Estado
      if (historyStatusFilter !== 'ALL') {
        if (historyStatusFilter === 'PENDING' && o.canonicalStatus !== 'PENDING') return false;
        if (historyStatusFilter === 'PREPARING' && o.canonicalStatus !== 'PREPARING') return false;
        if (historyStatusFilter === 'READY' && o.canonicalStatus !== 'READY') return false;
        if (historyStatusFilter === 'ASSIGNED' && o.canonicalStatus !== 'ASSIGNED') return false;
        if (historyStatusFilter === 'IN_TRANSIT' && o.canonicalStatus !== 'IN_TRANSIT') return false;
        if (historyStatusFilter === 'DELIVERED' && (o.canonicalStatus !== 'DELIVERED' && o.canonicalStatus !== 'COMPLETED')) return false;
        if (historyStatusFilter === 'CANCELLED' && o.canonicalStatus !== 'CANCELLED') return false;
      }

      // Filtro de Fecha (usando createdAt o deliveredAt)
      const orderDateRaw = o.createdAt || o.deliveredAt || o.updatedAt;
      if (!orderDateRaw) return true;
      const orderDate = orderDateRaw instanceof Date 
        ? orderDateRaw 
        : typeof orderDateRaw.toDate === 'function'
        ? orderDateRaw.toDate()
        : new Date(orderDateRaw);

      if (isNaN(orderDate.getTime())) return true;
      return orderDate >= fromDate && orderDate <= toDate;
    });
  }, [orders, historySearchQuery, historyStatusFilter, historyDatePreset, customDateFrom, customDateTo]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-7 w-64 bg-slate-800 rounded-md animate-pulse" />
          <div className="h-9 w-36 bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Notificación de Acción */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            actionFeedback.isError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-[10px] text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Merchant Orders Operations Center</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Operations 2.2
            </span>
          </div>
          <p className="text-sm text-slate-400">Control operativo en tiempo real • 1 Pedido = 1 Documento Canónico = 1 Columna Exacta</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-branch Holding Selector */}
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="ALL">🏢 Todas las Sucursales ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => handleViewModeChange('kanban')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vista Kanban
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vista Lista
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-obsidian-900 p-3 rounded-xl border border-slate-800">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por #pedido, cliente o producto en operaciones activas..."
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="text-xs text-blue-400 hover:underline font-medium"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {/* ─── KANBAN BOARD O VISTA LISTA ────────────────────────────────────── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          
          {/* 🟠 COLUMNA 1: NUEVOS */}
          <div className="bg-obsidian-900 border border-orange-500/20 rounded-xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="font-bold text-sm text-orange-400">Nuevos</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 font-black rounded-full border border-orange-500/30">
                {columnBuckets.NUEVOS.length}
              </span>
            </div>

            {columnBuckets.NUEVOS.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <ShoppingBag className="w-8 h-8 opacity-30 text-orange-400" />
                <p className="text-xs font-semibold text-slate-400">No hay pedidos nuevos</p>
                <p className="text-[10px] text-slate-600">Los nuevos pedidos de clientes aparecerán aquí automáticamente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {columnBuckets.NUEVOS.map((o) => (
                  <div key={o.id} className="bg-slate-800/80 border border-orange-500/30 p-3 rounded-xl space-y-2 shadow-lg relative group hover:border-orange-400/60 transition">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedOrderForDetail(o)}
                        className="font-bold text-orange-400 text-xs tracking-wider hover:underline flex items-center gap-1"
                        title="Ver detalle del pedido"
                      >
                        #{o.orderNumber}
                      </button>
                      <span className="text-[10px] bg-slate-700/80 px-2 py-0.5 rounded text-slate-300 font-mono">{o.timeAgo}</span>
                    </div>

                    <div 
                      onClick={() => setSelectedOrderForDetail(o)}
                      className="cursor-pointer group-hover:opacity-90"
                    >
                      <p className="text-sm font-bold text-slate-100">{o.customerName}</p>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{o.items}</p>
                    </div>

                    {o.deliveryNote && (
                      <div className="bg-orange-950/30 border border-orange-800/40 p-2 rounded-lg text-[11px] text-orange-200 font-medium">
                        📝 Nota: {o.deliveryNote}
                      </div>
                    )}

                    {/* Visibilidad Financiera: Solo Valor de Productos */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Valor de productos</span>
                        <span className="text-xs font-black text-emerald-400">
                          {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                        </span>
                      </div>
                      {o.couponCode && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          🎟️ {o.couponCode}
                        </span>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleAdvanceStatus(o.id, 'PREPARING')}
                        disabled={processingOrderId === o.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2 px-2 rounded-lg transition flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
                      >
                        {processingOrderId === o.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>✓ Confirmar pedido</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(o)}
                        disabled={processingOrderId === o.id}
                        className="bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-50 text-rose-300 text-xs font-semibold px-2.5 py-2 rounded-lg transition border border-rose-500/30"
                        title="Rechazar pedido"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🟡 COLUMNA 2: PENDIENTES */}
          <div className="bg-obsidian-900 border border-amber-500/20 rounded-xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="font-bold text-sm text-amber-400">Pendientes</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 font-black rounded-full border border-amber-500/30">
                {columnBuckets.PENDIENTES.length}
              </span>
            </div>

            {columnBuckets.PENDIENTES.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <Clock className="w-8 h-8 opacity-30 text-amber-400" />
                <p className="text-xs font-semibold text-slate-400">No hay pedidos pendientes</p>
                <p className="text-[10px] text-slate-600">Pedidos programados o en espera de resolución aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {columnBuckets.PENDIENTES.map((o) => (
                  <div key={o.id} className="bg-slate-800/80 border border-amber-500/30 p-3 rounded-xl space-y-2 shadow-lg">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedOrderForDetail(o)}
                        className="font-bold text-amber-400 text-xs tracking-wider hover:underline"
                        title="Ver detalle del pedido"
                      >
                        #{o.orderNumber}
                      </button>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded">
                        {o.isScheduled ? 'Programado' : 'En Espera'}
                      </span>
                    </div>

                    <div 
                      onClick={() => setSelectedOrderForDetail(o)}
                      className="cursor-pointer"
                    >
                      <p className="text-sm font-bold text-slate-100">{o.customerName}</p>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{o.items}</p>
                    </div>

                    {o.pendingReason && (
                      <div className="bg-amber-950/40 border border-amber-800/40 p-2 rounded-lg text-[11px] text-amber-200">
                        ⚠️ Motivo: {o.pendingReason}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Valor de productos</span>
                        <span className="text-xs font-black text-emerald-400">
                          {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleAdvanceStatus(o.id, 'PREPARING')}
                        disabled={processingOrderId === o.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        ✓ Confirmar pedido
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(o)}
                        disabled={processingOrderId === o.id}
                        className="bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-50 text-rose-300 text-xs font-semibold px-2.5 py-2 rounded-lg transition border border-rose-500/30"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🔵 COLUMNA 3: PREPARACIÓN */}
          <div className="bg-obsidian-900 border border-blue-500/20 rounded-xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-bold text-sm text-blue-400">Preparación</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 font-black rounded-full border border-blue-500/30">
                {columnBuckets.PREPARACION.length}
              </span>
            </div>

            {columnBuckets.PREPARACION.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-8 h-8 opacity-30 text-blue-400" />
                <p className="text-xs font-semibold text-slate-400">No hay pedidos en preparación</p>
                <p className="text-[10px] text-slate-600">Los pedidos confirmados para preparación aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {columnBuckets.PREPARACION.map((o) => (
                  <div key={o.id} className="bg-slate-800/80 border border-blue-500/30 p-3 rounded-xl space-y-2 shadow-lg">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedOrderForDetail(o)}
                        className="font-bold text-blue-400 text-xs tracking-wider hover:underline"
                        title="Ver detalle del pedido"
                      >
                        #{o.orderNumber}
                      </button>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold border border-blue-500/30">
                        {o.slaMinutes || 15}m SLA
                      </span>
                    </div>

                    <div 
                      onClick={() => setSelectedOrderForDetail(o)}
                      className="cursor-pointer"
                    >
                      <p className="text-sm font-bold text-slate-100">{o.customerName}</p>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{o.items}</p>
                    </div>

                    {o.deliveryNote && (
                      <div className="bg-blue-950/40 border border-blue-800/40 p-2 rounded-lg text-[11px] text-blue-300 font-medium">
                        📝 Nota: {o.deliveryNote}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Valor de productos</span>
                        <span className="text-xs font-black text-emerald-400">
                          {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAdvanceStatus(o.id, 'READY')}
                      disabled={processingOrderId === o.id}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
                    >
                      {processingOrderId === o.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>✓ Marcar como listo</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🟣 COLUMNA 4: EN PROCESO DELIVERY */}
          <div className="bg-obsidian-900 border border-purple-500/20 rounded-xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="font-bold text-sm text-purple-400">En Proceso Delivery</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 font-black rounded-full border border-purple-500/30">
                {columnBuckets.DELIVERY.length}
              </span>
            </div>

            {columnBuckets.DELIVERY.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <Truck className="w-8 h-8 opacity-30 text-purple-400" />
                <p className="text-xs font-semibold text-slate-400">No hay pedidos en delivery</p>
                <p className="text-[10px] text-slate-600">Pedidos listos, asignados o en ruta con repartidor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {columnBuckets.DELIVERY.map((o) => (
                  <div key={o.id} className="bg-slate-800/80 border border-purple-500/30 p-3.5 rounded-xl space-y-2.5 shadow-lg">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedOrderForDetail(o)}
                        className="font-bold text-purple-400 text-xs tracking-wider hover:underline"
                        title="Ver detalle del pedido"
                      >
                        #{o.orderNumber}
                      </button>
                      <span className="text-[10px] bg-purple-950/80 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-800/40">
                        {o.canonicalStatus === 'IN_TRANSIT' ? '🚚 En Ruta' : o.canonicalStatus === 'ASSIGNED' ? '🛵 Asignado' : '📦 Listo'}
                      </span>
                    </div>

                    <div 
                      onClick={() => setSelectedOrderForDetail(o)}
                      className="cursor-pointer"
                    >
                      <p className="text-sm font-bold text-slate-100">{o.customerName}</p>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{o.items}</p>
                    </div>

                    {o.deliveryNote && (
                      <div className="bg-blue-950/40 border border-blue-800/40 p-2 rounded-lg text-[11px] text-blue-300 font-medium">
                        📝 Nota: {o.deliveryNote}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Valor de productos</span>
                        <span className="text-xs font-black text-emerald-400">
                          {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Estado del Courier & Acciones */}
                    {isOrderAssigned(o) ? (
                      <div className="p-2.5 bg-slate-900 border border-purple-500/30 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between text-purple-300 font-bold">
                          <span>🛵 {getOrderCourierDisplayName(o, effectiveCourierList)}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-500/20 rounded text-purple-400">
                            {o.assignedCourierPlate || 'M 123456'}
                          </span>
                        </div>
                        <div className="pt-1 flex items-center justify-between border-t border-slate-800">
                          <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {o.canonicalStatus === 'IN_TRANSIT' ? 'En camino al cliente' : 'Motorizado asignado'}
                          </p>
                          <button
                            onClick={() => handleOpenChatModal(o)}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700 font-bold flex items-center gap-1 transition"
                            title="Ver conversación entre Cliente y Motorizado"
                          >
                            <MessageSquare className="w-3 h-3 text-blue-400" />
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>
                    ) : o.canonicalStatus === 'READY' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold bg-purple-500/10 border border-purple-500/20 py-1.5 px-3 rounded-lg justify-center w-full">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Esperando Motorizado...</span>
                        </div>
                        <button
                          onClick={() => handleOpenCourierModal(o)}
                          disabled={processingOrderId === o.id}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
                        >
                          <span>🛵 ASIGNAR MOTORIZADO</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                        <span>Sin motorizado asignado</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🟢 COLUMNA 5: ENTREGAS DE HOY */}
          <div className="bg-obsidian-900 border border-emerald-500/20 rounded-xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-sm text-emerald-400">Entregas de hoy</span>
              </div>
              <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 font-black rounded-full border border-emerald-500/30">
                {columnBuckets.ENTREGAS_HOY.length}
              </span>
            </div>

            {columnBuckets.ENTREGAS_HOY.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <CheckCircle className="w-8 h-8 opacity-30 text-emerald-400" />
                <p className="text-xs font-semibold text-slate-400">Todavía no hay entregas hoy</p>
                <p className="text-[10px] text-slate-600">Los pedidos entregados durante el día actual aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {columnBuckets.ENTREGAS_HOY.map((o) => (
                  <div key={o.id} className="bg-slate-800/80 border border-emerald-500/30 p-3 rounded-xl space-y-2 shadow-lg">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedOrderForDetail(o)}
                        className="font-bold text-emerald-400 text-xs tracking-wider hover:underline"
                        title="Ver detalle del pedido"
                      >
                        #{o.orderNumber}
                      </button>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Entregado
                      </span>
                    </div>

                    <div 
                      onClick={() => setSelectedOrderForDetail(o)}
                      className="cursor-pointer"
                    >
                      <p className="text-sm font-bold text-slate-100">{o.customerName}</p>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{o.items}</p>
                    </div>

                    {isOrderAssigned(o) && (
                      <p className="text-[11px] text-slate-400">
                        Courier: <strong className="text-slate-200">{getOrderCourierDisplayName(o, effectiveCourierList)}</strong>
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Valor de productos</span>
                        <span className="text-xs font-black text-emerald-400">
                          {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                        </span>
                      </div>
                      {o.couponCode && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          🎟️ {o.couponCode}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ─── VISTA LISTA OPERACIONAL (EXACTA MISMA LÓGICA DE RESOLUCIÓN) ─── */
        <div className="bg-obsidian-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span className="w-1/4">Pedido & Cliente</span>
            <span className="w-1/4">Items / Productos</span>
            <span className="w-1/5">Motorizado</span>
            <span className="w-1/6">Valor Productos</span>
            <span className="w-1/6 text-right">Estado Operativo</span>
          </div>

          <div className="divide-y divide-slate-800">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                No hay pedidos que coincidan con los filtros activos.
              </div>
            ) : (
              filteredOrders.map((o) => {
                const colKey = resolveMerchantOrderColumn(o);
                const colBadgeColor = 
                  colKey === 'NUEVOS' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                  colKey === 'PENDIENTES' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  colKey === 'PREPARACION' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  colKey === 'DELIVERY' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  colKey === 'ENTREGAS_HOY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  'bg-slate-700/50 text-slate-400 border-slate-600/30';

                const colLabel = 
                  colKey === 'NUEVOS' ? '🟠 Nuevo' :
                  colKey === 'PENDIENTES' ? '🟡 Pendiente' :
                  colKey === 'PREPARACION' ? '🔵 Preparación' :
                  colKey === 'DELIVERY' ? '🟣 En Delivery' :
                  colKey === 'ENTREGAS_HOY' ? '🟢 Entregado Hoy' :
                  '📋 Histórico';

                return (
                  <div key={o.id} className="p-4 flex items-center justify-between text-sm hover:bg-slate-800/30 transition">
                    <div className="w-1/4">
                      <button
                        onClick={() => setSelectedOrderForDetail(o)}
                        className="font-bold text-blue-400 hover:underline text-left block"
                      >
                        #{o.orderNumber}
                      </button>
                      <p className="text-xs text-slate-200 font-semibold">{o.customerName}</p>
                      <span className="text-[10px] text-slate-500">{o.timeAgo}</span>
                    </div>

                    <div className="w-1/4 pr-4">
                      <p className="text-xs text-slate-300 line-clamp-2">{o.items}</p>
                    </div>

                    <div className="w-1/5 text-xs">
                      {isOrderAssigned(o) ? (
                        <span className="text-purple-300 font-semibold">
                          🛵 {getOrderCourierDisplayName(o, effectiveCourierList)} ({o.assignedCourierPlate || 'M 123456'})
                        </span>
                      ) : o.canonicalStatus === 'READY' ? (
                        <button
                          onClick={() => handleOpenCourierModal(o)}
                          className="text-[11px] bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg border border-indigo-500/30 transition font-semibold"
                        >
                          🛵 Asignar
                        </button>
                      ) : (
                        <span className="text-slate-500 italic">Sin asignar</span>
                      )}
                    </div>

                    <div className="w-1/6">
                      <span className="font-bold text-emerald-400 block text-xs">
                        {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                      </span>
                    </div>

                    <div className="w-1/6 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenChatModal(o)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                        title="Ver conversación (Auditoría Solo Lectura)"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${colBadgeColor}`}>
                        {colLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── 📋 MÓDULO INDEPENDIENTE: HISTORIAL DE PEDIDOS ──────────────────── */}
      <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>📋</span> Historial de Pedidos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulta histórica independiente • Filtros por rango de fecha, estado y sucursal sin afectar el flujo del Kanban
            </p>
          </div>

          {/* Selector de Rango de Fecha */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'TODAY', label: 'Hoy' },
              { key: 'YESTERDAY', label: 'Ayer' },
              { key: 'LAST_7_DAYS', label: 'Últimos 7 días' },
              { key: 'LAST_30_DAYS', label: 'Últimos 30 días' },
              { key: 'THIS_MONTH', label: 'Este mes' },
              { key: 'CUSTOM', label: 'Personalizado' },
            ].map((preset) => (
              <button
                key={preset.key}
                onClick={() => setHistoryDatePreset(preset.key as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  historyDatePreset === preset.key
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Rango Personalizado & Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          {/* Búsqueda en Historial */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Buscar #pedido, cliente, producto..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filtro de Estado */}
          <div>
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="ALL">🔍 Todos los Estados</option>
              <option value="PENDING">🟠 Pendiente / Nuevo</option>
              <option value="PREPARING">🔵 En Preparación</option>
              <option value="READY">📦 Listo para Despacho</option>
              <option value="ASSIGNED">🛵 Asignado a Courier</option>
              <option value="IN_TRANSIT">🚚 En Proceso Delivery</option>
              <option value="DELIVERED">🟢 Entregado / Completado</option>
              <option value="CANCELLED">❌ Cancelado / Rechazado</option>
            </select>
          </div>

          {/* Fechas Desde / Hasta */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Desde:</span>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => {
                setCustomDateFrom(e.target.value);
                setHistoryDatePreset('CUSTOM');
              }}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Hasta:</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => {
                setCustomDateTo(e.target.value);
                setHistoryDatePreset('CUSTOM');
              }}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tabla de Resultados de Historial */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3"># Pedido</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Productos</th>
                <th className="p-3">Motorizado</th>
                <th className="p-3">Valor Productos</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {historyOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron pedidos en el rango de fechas y filtros seleccionados.
                  </td>
                </tr>
              ) : (
                historyOrders.map((o) => {
                  const dateDisplay = o.createdAt
                    ? (o.createdAt.toDate ? o.createdAt.toDate().toLocaleDateString('es-NI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : String(o.createdAt))
                    : 'Reciente';

                  const badgeClass = 
                    o.canonicalStatus === 'DELIVERED' || o.canonicalStatus === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    o.canonicalStatus === 'CANCELLED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    o.canonicalStatus === 'IN_TRANSIT' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                    o.canonicalStatus === 'PREPARING' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30';

                  return (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-mono font-bold text-blue-400">
                        <button
                          onClick={() => setSelectedOrderForDetail(o)}
                          className="hover:underline text-blue-400"
                          title="Ver detalle del pedido"
                        >
                          #{o.orderNumber}
                        </button>
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{dateDisplay}</td>
                      <td className="p-3 font-semibold text-slate-200">{o.customerName}</td>
                      <td className="p-3 text-slate-300 max-w-xs truncate" title={o.items}>{o.items}</td>
                      <td className="p-3 text-slate-400">
                        {isOrderAssigned(o) ? (
                          <span className="text-slate-200 font-medium">
                            {getOrderCourierDisplayName(o, effectiveCourierList)}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        {o.productSubtotalFormatted || o.merchantGrossSalesFormatted}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                          {o.canonicalStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenChatModal(o)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-lg border border-slate-700 font-bold inline-flex items-center gap-1.5 transition text-[11px]"
                          title="Ver conversación entre Cliente y Motorizado (Auditoría Solo Lectura)"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>Chat</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL SELECTOR DE MOTORIZADOS ─────────────────────────────────── */}
      {isCourierModalOpen && activeSelectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-obsidian-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>🛵</span> Asignar Motorizado Manualmente
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pedido <strong className="text-blue-400">#{activeSelectedOrder.orderNumber}</strong> • {activeSelectedOrder.customerName}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCourierModalOpen(false);
                  setSelectedOrderForAssign(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {isOrderAssigned(activeSelectedOrder) && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1 text-center animate-in fade-in">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Pedido Asignado en Tiempo Real</span>
                </div>
                <p className="text-xs text-slate-300">
                  Asignado a: <strong className="text-emerald-300">{getOrderCourierDisplayName(activeSelectedOrder, effectiveCourierList)}</strong>
                  {activeSelectedOrder.assignedCourierPlate && ` (${activeSelectedOrder.assignedCourierPlate})`}
                </p>
              </div>
            )}

            {isLoadingCouriers ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                <p>Consultando flota de motorizados en Firestore...</p>
              </div>
            ) : courierList.length === 0 ? (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400 space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                <p>No se encontraron motorizados elegibles en la flota activa.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {courierList.map((c) => {
                  const isOrderAlreadyWithThisCourier = getOrderAssignedCourierId(activeSelectedOrder) === c.id;
                  const isOrderTakenByOther = isOrderAssigned(activeSelectedOrder) && !isOrderAlreadyWithThisCourier;
                  const isOrderNotEligible = activeSelectedOrder.canonicalStatus !== 'READY' && !isOrderAlreadyWithThisCourier;
                  const isFinanciallyBlocked = c.isFinanciallyBlocked === true;
                  const isDisabled = Boolean(
                    assigningCourierId !== null ||
                    isOrderTakenByOther ||
                    isOrderNotEligible ||
                    isOrderAlreadyWithThisCourier ||
                    isFinanciallyBlocked
                  );

                  return (
                    <div
                      key={c.id}
                      className={`bg-slate-900/90 border p-4 rounded-xl flex items-center justify-between transition shadow-md ${
                        isOrderAlreadyWithThisCourier
                          ? 'border-emerald-500/50 bg-emerald-950/20'
                          : isFinanciallyBlocked
                          ? 'border-rose-500/30 bg-rose-950/10 opacity-75'
                          : isOrderTakenByOther
                          ? 'border-slate-800 opacity-60'
                          : 'border-slate-800 hover:border-indigo-500/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            isOrderAlreadyWithThisCourier 
                              ? 'bg-emerald-400' 
                              : isFinanciallyBlocked
                              ? 'bg-rose-500'
                              : 'bg-emerald-500 animate-pulse'
                          }`} />
                          <h4 className="font-bold text-sm text-slate-100">{c.name}</h4>
                          {isOrderAlreadyWithThisCourier && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Asignado
                            </span>
                          )}
                          {isFinanciallyBlocked && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                              ⛔ Bloqueo Financiero
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-indigo-300 font-semibold border border-indigo-500/20">
                            {c.driverId}
                          </span>
                          <span>Placa: <strong className="text-slate-200">{c.plate}</strong></span>
                          {isFinanciallyBlocked ? (
                            <span className="text-rose-400 font-semibold text-[11px] truncate max-w-xs">
                              {c.financialBlockReason || 'Límite de efectivo alcanzado'}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">{c.status}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleConfirmAssignCourier(c)}
                        disabled={isDisabled}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg ${
                          isOrderAlreadyWithThisCourier
                            ? 'bg-emerald-700/50 text-emerald-200 cursor-default'
                            : isFinanciallyBlocked
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/30 cursor-not-allowed'
                            : isDisabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                        }`}
                      >
                        {assigningCourierId === c.id
                          ? 'Asignando...'
                          : isOrderAlreadyWithThisCourier
                          ? 'Asignado'
                          : isFinanciallyBlocked
                          ? 'Bloqueado'
                          : 'Asignar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL DE RECHAZO DE PEDIDO ────────────────────────────────────── */}
      {isRejectModalOpen && selectedOrderForReject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                  <span>❌</span> Rechazar Pedido #{selectedOrderForReject.orderNumber}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cliente: <strong className="text-slate-200">{selectedOrderForReject.customerName}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedOrderForReject(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">¿Por qué deseas rechazar este pedido?</p>
              
              <div className="space-y-2">
                {[
                  'Comercio cerrado',
                  'Producto no disponible',
                  'Fuera de cobertura',
                  'Alta demanda',
                  'Otro'
                ].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      rejectReasonOption === option
                        ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-semibold'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={option}
                      checked={rejectReasonOption === option}
                      onChange={() => setRejectReasonOption(option)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              {rejectReasonOption === 'Otro' && (
                <div className="pt-2">
                  <textarea
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    placeholder="Escriba el motivo detallado del rechazo..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 h-20 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedOrderForReject(null);
                }}
                disabled={isSubmittingReject}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold py-2.5 rounded-xl transition border border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRejectOrder}
                disabled={isSubmittingReject}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-rose-600/20"
              >
                {isSubmittingReject ? 'Procesando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE AUDITORÍA DE CHAT EN VIVO (SOLO LECTURA) ─────────────── */}
      {isChatModalOpen && chatOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-obsidian-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[580px]">
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Conversación: Pedido #{chatOrder.orderNumber}
                  </h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Auditoría Solo Lectura
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cliente: <strong className="text-slate-200">{chatOrder.customerName}</strong> • {getOrderCourierDisplayName(chatOrder, effectiveCourierList)}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsChatModalOpen(false);
                  setChatOrder(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60">
              {isLoadingChat ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Cargando mensajes del pedido...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400">Sin mensajes registrados</p>
                  <p className="text-[11px] text-slate-600">No se ha generado comunicación directa entre Cliente y Motorizado para este pedido.</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCustomer = msg.senderRole === 'CUSTOMER';
                  const isCallEvent = msg.type === 'CALL_EVENT';

                  if (isCallEvent) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-[11px] bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          {msg.text} • {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 px-1 mb-0.5">
                        {isCustomer ? `👤 ${msg.senderName || 'Cliente'}` : `🛵 ${msg.senderName || 'Motorizado'}`}
                      </span>
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                          isCustomer
                            ? 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-sm'
                            : 'bg-blue-600/90 text-white rounded-tr-sm shadow-md'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-70">
                          <span>
                            {msg.createdAt?.toDate
                              ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Canal de comunicación directo Cliente ↔ Motorizado (Vista de Auditoría).</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DETALLE DE PEDIDO (EXCLUSIVO VALOR PRODUCTOS, ZERO FEES) ─── */}
      {selectedOrderForDetail && (
        <OrderDetailModal
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onAdvanceStatus={handleAdvanceStatus}
          onOpenCourierModal={(order) => {
            setSelectedOrderForDetail(null);
            handleOpenCourierModal(order);
          }}
          onOpenRejectModal={(order) => {
            setSelectedOrderForDetail(null);
            handleOpenRejectModal(order);
          }}
          isProcessing={processingOrderId === selectedOrderForDetail.id}
        />
      )}
    </div>
  );
};

