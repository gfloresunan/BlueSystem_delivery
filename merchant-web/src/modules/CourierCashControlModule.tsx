/**
 * CourierCashControlModule — Enterprise Courier Cash Ledger, Closure & Bank Deposit Control
 * BlueSystem Delivery Enterprise v2.4
 *
 * Módulo administrativo para la auditoría, control de arqueos, verificación de depósitos bancarios,
 * reconciliación de 4 capas, emisión de actas oficiales, autocompletado con debounce,
 * Date Range Picker interactivo con calendario y manejo explícito de errores Firestore.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Receipt,
  X,
  ExternalLink,
  ZoomIn,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { db } from '../shared/services/firebase';

export interface CourierDailyClosure {
  id: string;
  closureId: string;
  closureOperationId: string;
  courierId: string;
  courierName: string;
  businessDate: string;
  shift?: string;
  status:
    | 'OPEN'
    | 'CLOSURE_SUBMITTED'
    | 'COUNTED'
    | 'SETTLEMENT_CREATED'
    | 'AWAITING_BANK_DEPOSIT'
    | 'DEPOSIT_RECEIPT_UPLOADED'
    | 'PENDING_ADMIN_VERIFICATION'
    | 'VERIFIED'
    | 'DISCREPANCY'
    | 'REJECTED'
    | 'REOPENED';
  expectedAmountCents: number;
  ordersCount: number;
  includedOrderIds?: string[];
  includedTripIds?: string[];
  countedAmountCents: number;
  differenceCents: number;
  discrepancyAction?: string;
  settlementId?: string;
  bankDeposit?: {
    bankDepositId: string;
    bankName: string;
    accountReference: string;
    bankReference: string;
    depositDate: string;
    depositTime: string;
    depositAmountCents: number;
    depositDiscrepancyCents: number;
    receiptStoragePath: string;
    receiptDownloadUrl: string;
    notes?: string;
  };
  officialAct?: {
    actNumber: string;
    issuedAt: any;
    verificationCode: string;
    supervisorName?: string;
  };
  verifiedByName?: string;
  verifiedAt?: any;
  rejectionReason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CourierItem {
  uid: string;
  name: string;
  phone?: string;
}

export interface BalanceItem {
  cashOutstandingCents: number;
  financialAccessState?: string;
  financialAccessReason?: string;
}

export const CourierCashControlModule: React.FC = () => {
  const [closures, setClosures] = useState<CourierDailyClosure[]>([]);
  const [balances, setBalances] = useState<Record<string, BalanceItem>>({});
  const [couriersList, setCouriersList] = useState<CourierItem[]>([]);
  
  // Estados independientes de Carga y Error
  const [closuresState, setClosuresState] = useState<'LOADING' | 'SUCCESS' | 'EMPTY' | 'ERROR'>('LOADING');
  const [closuresError, setClosuresError] = useState<string>('');
  
  // Búsqueda y Autocomplete
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [courierSearchQuery, setCourierSearchQuery] = useState<string>('');
  const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false);
  const [generalSearchTerm, setGeneralSearchTerm] = useState<string>('');
  
  // Filtros y Date Range Picker Popover
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [tempFrom, setTempFrom] = useState<string>('');
  const [tempTo, setTempTo] = useState<string>('');
  const [dateRangeError, setDateRangeError] = useState<string>('');

  // Modal de Detalle
  const [selectedClosure, setSelectedClosure] = useState<CourierDailyClosure | null>(null);
  const [ledgerItems, setLedgerItems] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [rejectionPrompt, setRejectionPrompt] = useState<boolean>(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [actionProcessing, setActionProcessing] = useState<boolean>(false);
  const [previewVoucherUrl, setPreviewVoucherUrl] = useState<string | null>(null);

  // Cargar lista de motorizados para el autocomplete
  useEffect(() => {
    const fetchCouriers = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('userType', '==', 'motorizado')));
        const items: CourierItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          items.push({
            uid: d.id,
            name: data.name || data.nombre || 'Motorizado',
            phone: data.phone || data.telefono
          });
        });
        setCouriersList(items);
      } catch (e) {
        console.error("Error fetching couriers list:", e);
      }
    };
    fetchCouriers();
  }, []);

  // Escuchar balances en tiempo real para bloqueos
  useEffect(() => {
    const unsubBalances = onSnapshot(
      collection(db, 'courier_balances'),
      snap => {
        const map: Record<string, BalanceItem> = {};
        snap.forEach(d => {
          const data = d.data();
          map[d.id] = {
            cashOutstandingCents: Number(data.cashOutstandingCents || 0),
            financialAccessState: data.financialAccessState,
            financialAccessReason: data.financialAccessReason
          };
        });
        setBalances(map);
      },
      err => {
        console.error("Error en balances listener:", err);
      }
    );
    return () => unsubBalances();
  }, []);

  // Escuchar /courier_daily_closures en tiempo real
  useEffect(() => {
    setClosuresState('LOADING');
    setClosuresError('');
    const closuresRef = collection(db, 'courier_daily_closures');
    const q = query(closuresRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: CourierDailyClosure[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        setClosures(items);
        setClosuresState(items.length === 0 ? 'EMPTY' : 'SUCCESS');
      },
      (error: any) => {
        console.error('Error fetching closures:', error);
        setClosuresState('ERROR');
        if (error.code === 'permission-denied') {
          setClosuresError('Sin permisos para consultar cierres de motorizados.');
        } else {
          setClosuresError(error.message || 'Error consultando cierres diarios.');
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Cargar desglose de subledger al abrir un cierre
  useEffect(() => {
    if (!selectedClosure) {
      setLedgerItems([]);
      return;
    }

    const fetchLedger = async () => {
      setLoadingLedger(true);
      try {
        const ledgerRef = collection(db, 'courier_cash_ledger');
        const q = query(
          ledgerRef,
          where('courierId', '==', selectedClosure.courierId),
          where('direction', '==', 'CREDIT'),
          limit(50)
        );
        const snap = await getDocs(q);
        const items: any[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...d.data() });
        });
        setLedgerItems(items);
      } catch (e) {
        console.error('Error fetching subledger details:', e);
      } finally {
        setLoadingLedger(false);
      }
    };

    fetchLedger();
  }, [selectedClosure]);

  // Coincidencias de Autocomplete con Debounce
  const matchingCouriers = useMemo(() => {
    const q = courierSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return couriersList.filter(c =>
      c.name.toLowerCase().includes(q) || c.uid.toLowerCase().includes(q)
    );
  }, [couriersList, courierSearchQuery]);

  // Filtrado reactivo
  const filteredClosures = useMemo(() => {
    return closures.filter((c) => {
      const matchesCourier = !selectedCourierId || c.courierId === selectedCourierId;

      const matchesGeneral =
        !generalSearchTerm ||
        (c.courierName || '').toLowerCase().includes(generalSearchTerm.toLowerCase()) ||
        (c.bankDeposit?.bankReference || '').toLowerCase().includes(generalSearchTerm.toLowerCase()) ||
        (c.officialAct?.actNumber || '').toLowerCase().includes(generalSearchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      let matchesDate = true;
      if (dateFrom && c.businessDate < dateFrom) matchesDate = false;
      if (dateTo && c.businessDate > dateTo) matchesDate = false;

      return matchesCourier && matchesGeneral && matchesStatus && matchesDate;
    });
  }, [closures, selectedCourierId, generalSearchTerm, statusFilter, dateFrom, dateTo]);

  // Motorizados bloqueados en alerta
  const blockedCouriers = useMemo(() => {
    const list: { uid: string; name: string; outstandingCents: number; reason: string }[] = [];
    Object.entries(balances).forEach(([uid, bal]) => {
      const isLimitExceeded = bal.cashOutstandingCents > 200000;
      const isOverdue = bal.financialAccessState === 'BLOCKED_OVERDUE_CLOSURE' || bal.financialAccessState === 'BLOCKED_CASH_LIMIT_AND_OVERDUE';
      if (isLimitExceeded || isOverdue) {
        const found = couriersList.find(c => c.uid === uid);
        list.push({
          uid,
          name: found ? found.name : uid.slice(-8),
          outstandingCents: bal.cashOutstandingCents,
          reason: bal.financialAccessReason || (isLimitExceeded ? 'Límite de C$2,000 excedido' : 'Cierre de día anterior pendiente')
        });
      }
    });
    return list;
  }, [balances, couriersList]);

  // KPIs agregados
  const kpis = useMemo(() => {
    let totalRecaudadoCents = 0;
    let totalEntregadoCents = 0;
    let totalDepositadoCents = 0;
    let pendientesVerificacion = 0;
    let discrepanciasCount = 0;

    closures.forEach((c) => {
      totalRecaudadoCents += Number(c.expectedAmountCents || 0);
      totalEntregadoCents += Number(c.countedAmountCents || 0);
      if (c.bankDeposit) {
        totalDepositadoCents += Number(c.bankDeposit.depositAmountCents || 0);
      }
      if (c.status === 'PENDING_ADMIN_VERIFICATION' || c.status === 'DEPOSIT_RECEIPT_UPLOADED') {
        pendientesVerificacion++;
      }
      if (c.status === 'DISCREPANCY' || c.differenceCents !== 0 || (c.bankDeposit && c.bankDeposit.depositDiscrepancyCents !== 0)) {
        discrepanciasCount++;
      }
    });

    return {
      totalRecaudado: totalRecaudadoCents / 100,
      totalEntregado: totalEntregadoCents / 100,
      totalDepositado: totalDepositadoCents / 100,
      pendientesVerificacion,
      discrepanciasCount,
    };
  }, [closures]);

  // Manejo de Date Range Picker Popover
  const navigateMonth = (direction: number) => {
    let nextMonth = pickerMonth + direction;
    let nextYear = pickerYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    setPickerMonth(nextMonth);
    setPickerYear(nextYear);
  };

  const handleDayClick = (fullDate: string) => {
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(fullDate);
      setTempTo('');
      setDateRangeError('');
    } else if (tempFrom && !tempTo) {
      if (fullDate < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(fullDate);
      } else {
        setTempTo(fullDate);
      }
      setDateRangeError('');
    }
  };

  const handlePreset = (preset: string) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (preset === 'TODAY') {
      setTempFrom(fmt(today));
      setTempTo(fmt(today));
    } else if (preset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setTempFrom(fmt(y));
      setTempTo(fmt(y));
    } else if (preset === 'LAST_7') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setTempFrom(fmt(past));
      setTempTo(fmt(today));
    }
    setDateRangeError('');
  };

  const applyRange = () => {
    if (tempFrom && tempTo && tempFrom > tempTo) {
      setDateRangeError('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    setDateFrom(tempFrom || '');
    setDateTo(tempTo || tempFrom || '');
    setDatePickerOpen(false);
    setDateRangeError('');
  };

  const clearRange = () => {
    setDateFrom('');
    setDateTo('');
    setTempFrom('');
    setTempTo('');
    setDateRangeError('');
    setDatePickerOpen(false);
  };

  const handleVerifyClosure = async (closureId: string) => {
    try {
      setActionProcessing(true);
      const functions = getFunctions();
      const verifyFn = httpsCallable(functions, 'verifyCourierDailyClosure');
      await verifyFn({ closureId, action: 'VERIFY' });
      setActionProcessing(false);
      setSelectedClosure(null);
    } catch (e: any) {
      alert(`Error aprobando cierre: ${e.message}`);
      setActionProcessing(false);
    }
  };

  const handleRejectClosure = async (closureId: string) => {
    if (!rejectionReasonInput.trim()) {
      alert('Debe especificar el motivo formal del rechazo.');
      return;
    }
    try {
      setActionProcessing(true);
      const functions = getFunctions();
      const verifyFn = httpsCallable(functions, 'verifyCourierDailyClosure');
      await verifyFn({ closureId, action: 'REJECT', rejectionReason: rejectionReasonInput.trim() });
      setActionProcessing(false);
      setRejectionPrompt(false);
      setRejectionReasonInput('');
      setSelectedClosure(null);
    } catch (e: any) {
      alert(`Error rechazando cierre: ${e.message}`);
      setActionProcessing(false);
    }
  };

  const printOfficialAct = (c: CourierDailyClosure) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Acta Oficial de Cierre - ${c.officialAct?.actNumber || c.closureId}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .act-badge { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: bold; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .data-item { font-size: 13px; }
          .data-label { color: #64748b; font-size: 11px; text-transform: uppercase; }
          .data-value { font-weight: 600; color: #0f172a; margin-top: 2px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          .table th { background: #f8fafc; text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #475569; }
          .table td { padding: 8px; border: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
          .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
          .sig-box { text-align: center; width: 200px; border-top: 1px solid #0f172a; padding-top: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">BLUESYSTEM DELIVERY ENTERPRISE</div>
            <div class="subtitle">Acta Oficial de Arqueo, Liquidación y Depósito Bancario</div>
          </div>
          <div>
            <span class="act-badge">${c.officialAct?.actNumber || 'DOCUMENTO OFICIAL'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. INFORMACIÓN DEL CIERRE</div>
          <div class="grid">
            <div class="data-item"><div class="data-label">Motorizado</div><div class="data-value">${c.courierName} (ID: ${c.courierId})</div></div>
            <div class="data-item"><div class="data-label">Fecha Operacional</div><div class="data-value">${c.businessDate}</div></div>
            <div class="data-item"><div class="data-label">Código Verificación</div><div class="data-value">${c.officialAct?.verificationCode || 'N/A'}</div></div>
            <div class="data-item"><div class="data-label">Estado Auditoría</div><div class="data-value">${c.status}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. CONCILIACIÓN FINANCIERA DE CUATRO CAPAS</div>
          <table class="table">
            <thead>
              <tr>
                <th>Capa Contable</th>
                <th>Concepto</th>
                <th>Monto (C$)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Capa 1: Recaudación</strong></td>
                <td>Efectivo total esperado (${c.ordersCount} pedidos)</td>
                <td>C$ ${(Number(c.expectedAmountCents || 0) / 100).toFixed(2)}</td>
                <td>Conforme</td>
              </tr>
              <tr>
                <td><strong>Capa 2: Arqueo / Mesa</strong></td>
                <td>Efectivo físico contado</td>
                <td>C$ ${(Number(c.countedAmountCents || 0) / 100).toFixed(2)}</td>
                <td>${c.differenceCents === 0 ? 'Exacto' : `Diff: C$ ${(c.differenceCents / 100).toFixed(2)}`}</td>
              </tr>
              <tr>
                <td><strong>Capa 3: Depósito Bancario</strong></td>
                <td>Monto acreditado (${c.bankDeposit?.bankName || 'N/A'}) - Ref: ${c.bankDeposit?.bankReference || 'N/A'}</td>
                <td>C$ ${c.bankDeposit ? (c.bankDeposit.depositAmountCents / 100).toFixed(2) : '0.00'}</td>
                <td>${c.bankDeposit ? (c.bankDeposit.depositDiscrepancyCents === 0 ? 'Conforme' : `Diff: C$ ${(c.bankDeposit.depositDiscrepancyCents / 100).toFixed(2)}`) : 'Pendiente'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="signatures">
          <div class="sig-box">
            ${c.courierName}<br><strong>Motorizado Responsable</strong>
          </div>
          <div class="sig-box">
            ${c.verifiedByName || c.officialAct?.supervisorName || 'Supervisor Autorizado'}<br><strong>Auditoría & Finanzas</strong>
          </div>
        </div>

        <div class="footer">
          Documento inmutable generado autoritativamente por BlueSystem Delivery Enterprise.<br>
          Hash de Seguridad: ${c.officialAct?.verificationCode || c.closureOperationId}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Nombres de meses para el calendario
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const firstDayOfWeek = new Date(pickerYear, pickerMonth, 1).getDay();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-full">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-400" />
            Control de Efectivo &amp; Cierres de Flota
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Auditoría de recaudación diaria, arqueos en mesa, depósitos bancarios y control de custodia de efectivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Banner de Alerta: Motorizados Bloqueados */}
      {blockedCouriers.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>ALERTA DE AUDITORÍA: {blockedCouriers.length} Motorizado(s) con Acceso a Nuevos Pedidos Bloqueado</span>
          </div>
          <div className="space-y-1 text-xs">
            {blockedCouriers.map((b) => (
              <div key={b.uid} className="flex items-center justify-between bg-white p-2 rounded-lg border border-rose-100">
                <span className="font-semibold text-slate-800">
                  {b.name} <span className="font-mono text-slate-400 text-[10px]">({b.uid.slice(-8)})</span> — Saldo: <strong className="text-rose-600">C$ {(b.outstandingCents / 100).toFixed(2)}</strong>
                </span>
                <span className="text-[11px] text-rose-700 font-medium">Motivo: {b.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recaudado Flota</span>
          <div className="text-xl font-black text-slate-900 mt-1">C$ {kpis.totalRecaudado.toFixed(2)}</div>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Ledger Total
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entregado en Mesa</span>
          <div className="text-xl font-black text-slate-900 mt-1">C$ {kpis.totalEntregado.toFixed(2)}</div>
          <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" /> Arqueos Contados
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Depositado Banco</span>
          <div className="text-xl font-black text-emerald-700 mt-1">C$ {kpis.totalDepositado.toFixed(2)}</div>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <Building2 className="w-3 h-3" /> Con Vouchers
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por Verificar</span>
          <div className="text-xl font-black text-amber-600 mt-1">{kpis.pendientesVerificacion}</div>
          <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" /> Cierres en Cola
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discrepancias</span>
          <div className={`text-xl font-black mt-1 ${kpis.discrepanciasCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {kpis.discrepanciasCount}
          </div>
          <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" /> Faltantes / Sobrantes
          </span>
        </div>
      </div>

      {/* Barra de Búsqueda, Autocomplete y Date Range Picker */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Autocomplete de Motorizados */}
          <div className="relative w-full md:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filtrar por Motorizado:</label>
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Escribe nombre o ID..."
                value={courierSearchQuery}
                onFocus={() => setAutocompleteOpen(true)}
                onChange={(e) => {
                  setCourierSearchQuery(e.target.value);
                  setAutocompleteOpen(true);
                }}
                className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {selectedCourierId && (
                <button
                  onClick={() => {
                    setSelectedCourierId('');
                    setCourierSearchQuery('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {autocompleteOpen && matchingCouriers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {matchingCouriers.map((c) => {
                  const bal = balances[c.uid];
                  const outstanding = bal ? (bal.cashOutstandingCents / 100).toFixed(2) : '0.00';
                  const isBlocked = bal && bal.cashOutstandingCents > 200000;

                  return (
                    <div
                      key={c.uid}
                      onClick={() => {
                        setSelectedCourierId(c.uid);
                        setCourierSearchQuery(`${c.name} (${c.uid.slice(-8)})`);
                        setAutocompleteOpen(false);
                      }}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {c.uid.slice(-8)} {c.phone ? `• ${c.phone}` : ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800">C$ {outstanding}</div>
                        <span className={`text-[9px] font-semibold ${isBlocked ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isBlocked ? '🔴 Bloqueado' : '🟢 Activo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Búsqueda General */}
          <div className="w-full md:w-56">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Búsqueda General:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ref. Bancaria o Acta..."
                value={generalSearchTerm}
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Filtro de Estado */}
          <div className="w-full md:w-44">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Estado de Cierre:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDING_ADMIN_VERIFICATION">Por Verificar</option>
              <option value="AWAITING_BANK_DEPOSIT">Esperando Depósito</option>
              <option value="VERIFIED">Verificados</option>
              <option value="DISCREPANCY">Discrepancias</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>

          {/* Date Range Picker Popover */}
          <div className="relative w-full md:w-72">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Rango de Fechas:</label>
            <button
              type="button"
              onClick={() => {
                setTempFrom(dateFrom);
                setTempTo(dateTo);
                setDatePickerOpen(!datePickerOpen);
              }}
              className="w-full flex items-center justify-between bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 text-xs rounded-lg transition"
            >
              <span className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                {dateFrom && dateTo ? (
                  <strong className="text-slate-900">{dateFrom} - {dateTo}</strong>
                ) : dateFrom ? (
                  <strong className="text-slate-900">{dateFrom}</strong>
                ) : (
                  <span>Todas las fechas</span>
                )}
              </span>
              <Filter className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {datePickerOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 p-4 w-80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-900">
                    {monthNames[pickerMonth]} {pickerYear}
                  </span>
                  <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                  <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayStr = String(day).padStart(2, '0');
                    const monthStr = String(pickerMonth + 1).padStart(2, '0');
                    const fullDate = `${pickerYear}-${monthStr}-${dayStr}`;

                    const isStart = tempFrom === fullDate;
                    const isEnd = tempTo === fullDate;
                    const inRange = tempFrom && tempTo && fullDate > tempFrom && fullDate < tempTo;

                    let btnClass = 'text-slate-700 hover:bg-slate-100 rounded-lg py-1.5';
                    if (isStart || isEnd) {
                      btnClass = 'bg-emerald-600 text-white font-bold rounded-lg py-1.5';
                    } else if (inRange) {
                      btnClass = 'bg-emerald-50 text-emerald-800 rounded-md py-1.5';
                    }

                    return (
                      <button
                        key={fullDate}
                        onClick={() => handleDayClick(fullDate)}
                        className={btnClass}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-[10px]">
                  <button onClick={() => handlePreset('TODAY')} className="py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 font-medium">Hoy</button>
                  <button onClick={() => handlePreset('YESTERDAY')} className="py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 font-medium">Ayer</button>
                  <button onClick={() => handlePreset('LAST_7')} className="py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 font-medium">Últimos 7d</button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Desde:</span>
                    <input
                      type="date"
                      value={tempFrom}
                      onChange={(e) => setTempFrom(e.target.value)}
                      className="w-full text-[11px] p-1 border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Hasta:</span>
                    <input
                      type="date"
                      value={tempTo}
                      onChange={(e) => setTempTo(e.target.value)}
                      className="w-full text-[11px] p-1 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                {dateRangeError && (
                  <div className="text-rose-600 text-[10px] font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {dateRangeError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button onClick={clearRange} className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded font-semibold">
                    Limpiar
                  </button>
                  <button onClick={applyRange} className="px-3 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded font-bold">
                    Aplicar Rango
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Cierres Diarios */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Courier</th>
                <th className="py-3 px-4">Acceso Courier</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Recaudado</th>
                <th className="py-3 px-4 text-right">Contado</th>
                <th className="py-3 px-4 text-right">Diferencia</th>
                <th className="py-3 px-4 text-right">Depositado</th>
                <th className="py-3 px-4 text-center">Comprobante</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {closuresState === 'ERROR' ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-rose-600 bg-rose-50 font-semibold">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-rose-600" />
                      <span>{closuresError}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Verifique que su cuenta tenga asignado un rol administrativo autorizado.</span>
                    </div>
                  </td>
                </tr>
              ) : closuresState === 'LOADING' ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    Cargando cierres de flota...
                  </td>
                </tr>
              ) : filteredClosures.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    No se encontraron cierres con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredClosures.map((c) => {
                  const expected = (Number(c.expectedAmountCents || 0) / 100).toFixed(2);
                  const counted = (Number(c.countedAmountCents || 0) / 100).toFixed(2);
                  const diff = (Number(c.differenceCents || 0) / 100).toFixed(2);
                  const deposited = c.bankDeposit ? (Number(c.bankDeposit.depositAmountCents || 0) / 100).toFixed(2) : '—';
                  const hasVoucher = Boolean(c.bankDeposit?.receiptDownloadUrl);

                  const bal = balances[c.courierId];
                  const outstanding = bal ? bal.cashOutstandingCents : 0;
                  const isBlocked = outstanding > 200000 || bal?.financialAccessState === 'BLOCKED_OVERDUE_CLOSURE' || bal?.financialAccessState === 'BLOCKED_CASH_LIMIT_AND_OVERDUE';
                  const isNearLimit = outstanding > 150000 && !isBlocked;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {c.courierName}
                        <div className="text-[10px] text-slate-400 font-mono">{c.courierId.slice(-8)}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isBlocked ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            🔴 BLOQUEADO
                          </span>
                        ) : isNearLimit ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            🟠 CERCA LÍMITE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            🟢 ACTIVO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{c.businessDate}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">C$ {expected}</td>
                      <td className="py-3 px-4 text-right text-slate-700">C$ {counted}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${Number(diff) === 0 ? 'text-slate-500' : Number(diff) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {Number(diff) === 0 ? 'C$ 0.00' : `C$ ${diff}`}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {deposited !== '—' ? `C$ ${deposited}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasVoucher ? (
                          <button
                            onClick={() => setPreviewVoucherUrl(c.bankDeposit!.receiptDownloadUrl)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin archivo</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'PENDING_ADMIN_VERIFICATION' || c.status === 'DEPOSIT_RECEIPT_UPLOADED'
                              ? 'bg-amber-100 text-amber-800'
                              : c.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2">
                        <button
                          onClick={() => setSelectedClosure(c)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                        >
                          Detalle & 4-Capas
                        </button>
                        {c.status === 'VERIFIED' && (
                          <button
                            onClick={() => printOfficialAct(c)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition inline-flex items-center gap-1"
                            title="Descargar Acta PDF"
                          >
                            <Download className="w-3 h-3" /> Acta
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalle del Cierre & Reconciliación de 4 Capas */}
      {selectedClosure && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">
                    CIERRE #{selectedClosure.closureId.slice(-8)}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedClosure.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedClosure.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {selectedClosure.courierName} — {selectedClosure.businessDate}
                </h2>
              </div>
              <button
                onClick={() => setSelectedClosure(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Reconciliación Financiera Cuatripartita
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">1. Recaudación Esperada</span>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      C$ {(Number(selectedClosure.expectedAmountCents || 0) / 100).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-500">{selectedClosure.ordersCount} pedidos</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">2. Arqueo en Mesa</span>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      C$ {(Number(selectedClosure.countedAmountCents || 0) / 100).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Diff: C$ {(Number(selectedClosure.differenceCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">3. Depósito Bancario</span>
                    <div className="text-sm font-black text-emerald-700 mt-0.5">
                      C${' '}
                      {selectedClosure.bankDeposit
                        ? (Number(selectedClosure.bankDeposit.depositAmountCents || 0) / 100).toFixed(2)
                        : '0.00'}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {selectedClosure.bankDeposit?.bankName || 'Sin depósito'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">4. Acta Oficial</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                      {selectedClosure.officialAct?.actNumber || 'Pendiente'}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedClosure.officialAct?.verificationCode || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedClosure.bankDeposit && (
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Comprobante y Datos Bancarios
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Banco Receptor:</span>
                      <div className="font-bold text-slate-900">{selectedClosure.bankDeposit.bankName}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Número / Referencia:</span>
                      <div className="font-mono font-bold text-slate-900">{selectedClosure.bankDeposit.bankReference}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase">Fecha y Hora:</span>
                      <div className="font-semibold text-slate-700">
                        {selectedClosure.bankDeposit.depositDate} {selectedClosure.bankDeposit.depositTime}
                      </div>
                    </div>
                  </div>

                  {selectedClosure.bankDeposit.receiptDownloadUrl && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        Comprobante de depósito digitalizado
                      </div>
                      <button
                        onClick={() => setPreviewVoucherUrl(selectedClosure.bankDeposit!.receiptDownloadUrl)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition inline-flex items-center gap-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5" /> Ver Voucher con Zoom
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">Desglose de Pedidos Cobrados (Subledger)</span>
                  <span className="text-[11px] text-slate-400">{ledgerItems.length} registros</span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {loadingLedger ? (
                    <div className="p-4 text-center text-xs text-slate-400">Cargando desglose...</div>
                  ) : ledgerItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Sin asientos en subledger</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-100">
                          <th className="py-2 px-3">Pedido / Encomienda</th>
                          <th className="py-2 px-3">Dominio</th>
                          <th className="py-2 px-3">Descripción</th>
                          <th className="py-2 px-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">
                              {item.orderId ? `#${item.orderId.slice(-6).toUpperCase()}` : item.tripId ? `TRIP-#${item.tripId.slice(-6).toUpperCase()}` : item.id.slice(-6)}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.sourceDomain}</td>
                            <td className="py-2 px-3 text-slate-700">{item.description}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              C$ {(item.amountCents / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => printOfficialAct(selectedClosure)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" /> Imprimir / Descargar Acta
              </button>

              {selectedClosure.status !== 'VERIFIED' && selectedClosure.status !== 'REJECTED' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!rejectionPrompt ? (
                    <>
                      <button
                        onClick={() => setRejectionPrompt(true)}
                        disabled={actionProcessing}
                        className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleVerifyClosure(selectedClosure.id)}
                        disabled={actionProcessing}
                        className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20 inline-flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Aprobar Cierre
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Motivo del rechazo..."
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        className="text-xs px-3 py-1.5 border border-rose-300 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        onClick={() => handleRejectClosure(selectedClosure.id)}
                        disabled={actionProcessing}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setRejectionPrompt(false)}
                        className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visor con Zoom de Voucher */}
      {previewVoucherUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 relative shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewVoucherUrl(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Comprobante de Depósito Bancario</h4>
            <div className="max-h-[75vh] overflow-auto rounded-lg border border-slate-200">
              <img src={previewVoucherUrl} alt="Comprobante Bancario" className="max-w-full h-auto object-contain" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={previewVoucherUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir imagen original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierCashControlModule;
