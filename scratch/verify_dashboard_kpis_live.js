const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

const TIMEZONE_MANAGUA = 'America/Managua';

const getManaguaDateStr = (dateInput) => {
  if (!dateInput) return '';
  const d = dateInput instanceof Date
    ? dateInput
    : typeof dateInput.toDate === 'function'
    ? dateInput.toDate()
    : new Date(dateInput);

  if (isNaN(d.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE_MANAGUA }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const isOrderFromToday = (order, todayStr) => {
  const primaryDateRaw = order.deliveredAt || order.completedAt || order.entregadoAt || order.createdAt;
  if (!primaryDateRaw) return false;
  const orderDateStr = getManaguaDateStr(primaryDateRaw);
  return orderDateStr === todayStr;
};

async function verifyLive() {
  console.log('=== VERIFICACIÓN EN VIVO DE KPIS Y PEDIDOS DE FIRESTORE ===');
  
  const targetBusinessId = '90169f49-9d0c-4571-97a5-5f19032a6f42'; // Variedades TECNOHOME
  const snap = await db.collection('orders').where('businessId', '==', targetBusinessId).get();

  console.log(`Documentos encontrados para businessId "${targetBusinessId}": ${snap.size}`);

  const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const nowManaguaStr = getManaguaDateStr(new Date());
  console.log(`Fecha Hoy (America/Managua): ${nowManaguaStr}`);

  let salesSum = 0;
  let activeCount = 0;
  const customerSet = new Set();
  const slaDurations = [];

  // Trend
  const trendMap = new Map();
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const trendDays = [];

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);
    const dStr = getManaguaDateStr(targetDate);
    const dayName = daysOfWeek[targetDate.getDay()];
    trendDays.push({ dateStr: dStr, label: i === 0 ? 'Hoy' : dayName });
    trendMap.set(dStr, 0);
  }

  allOrders.forEach((ord) => {
    const statusStr = String(ord.status || ord.estado || 'pending').toLowerCase();
    const isCancelled = ['cancelled', 'rejected', 'cancelado', 'rechazado'].includes(statusStr);
    const isDelivered = ['delivered', 'completed', 'entregado', 'completado'].includes(statusStr);

    const subtotalVal = Number(ord.subtotal || 0);
    const discountVal = Number(ord.discountAmount || ord.couponDiscount || ord.coupon?.discountAmount || 0);
    const grossSale = Number(
      ord.merchantGrossSales ?? (subtotalVal > 0 ? Math.max(0, subtotalVal - discountVal) : (ord.total || ord.totalAmount || 0))
    );

    const isToday = isOrderFromToday(ord, nowManaguaStr);
    const orderDateStr = getManaguaDateStr(ord.deliveredAt || ord.completedAt || ord.entregadoAt || ord.createdAt);

    console.log(`\nPedido: [${ord.id}]`);
    console.log(`  Status: ${ord.status} / ${ord.estado} -> isCancelled: ${isCancelled}, isDelivered: ${isDelivered}`);
    console.log(`  CreatedAt: ${ord.createdAt?.toDate ? ord.createdAt.toDate().toISOString() : ord.createdAt} (Managua: ${getManaguaDateStr(ord.createdAt)})`);
    console.log(`  CompletedAt: ${ord.completedAt?.toDate ? ord.completedAt.toDate().toISOString() : ord.completedAt} (Managua: ${getManaguaDateStr(ord.completedAt)})`);
    console.log(`  isToday (${nowManaguaStr}): ${isToday}`);
    console.log(`  grossSale: C$ ${grossSale.toFixed(2)}`);

    if (!isCancelled && orderDateStr && trendMap.has(orderDateStr)) {
      trendMap.set(orderDateStr, (trendMap.get(orderDateStr) || 0) + grossSale);
    }

    if (!isCancelled && isToday) {
      salesSum += grossSale;
      const custId = ord.customerId || ord.clienteId || ord.customerName || ord.clienteNombre;
      if (custId) customerSet.add(custId);

      if (isDelivered && ord.createdAt) {
        const start = ord.createdAt.toDate ? ord.createdAt.toDate().getTime() : new Date(ord.createdAt).getTime();
        const endRaw = ord.deliveredAt || ord.completedAt || ord.entregadoAt || ord.updatedAt;
        if (endRaw) {
          const end = endRaw.toDate ? endRaw.toDate().getTime() : new Date(endRaw).getTime();
          const diffMin = (end - start) / 60000;
          if (!isNaN(diffMin) && diffMin > 0 && diffMin < 180) {
            slaDurations.push(diffMin);
          }
        }
      }
    }

    if (!isCancelled && !isDelivered) {
      activeCount++;
    }
  });

  const calculatedSla = slaDurations.length > 0
    ? Math.round((slaDurations.reduce((a, b) => a + b, 0) / slaDurations.length) * 10) / 10
    : null;

  console.log('\n============================================================');
  console.log('RESULTADO FINAL DE KPIS:');
  console.log('  VENTAS HOY: C$', salesSum.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  console.log('  PEDIDOS ACTIVOS:', activeCount);
  console.log('  SLA TIEMPO PREP:', calculatedSla !== null ? `${calculatedSla} min` : 'N/A');
  console.log('  CLIENTES HOY:', customerSet.size);
  console.log('  TENDENCIA 7 DÍAS:', JSON.stringify(Array.from(trendMap.entries())));
  console.log('============================================================');
}

verifyLive().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
