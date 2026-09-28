// Verification & Unit Tests for liveOrdersModule (Admin Panel Control Center)
const fs = require('fs');
const path = require('path');

// Mock window and browser environment
global.window = {};
global.document = {
    getElementById: (id) => null
};

// Load liveOrders.js
const liveOrdersCode = fs.readFileSync(path.join(__dirname, '../panel-admin/public/js/dashboard/liveOrders.js'), 'utf8');
eval(liveOrdersCode);

const mod = global.window.liveOrdersModule || global.liveOrdersModule;

console.log("=================================================");
console.log("RUNNING VERIFICATION SUITE FOR LIVE ORDERS MODULE");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`✅ [PASS] ${description}`);
        passed++;
    } else {
        console.error(`❌ [FAIL] ${description}`);
        failed++;
    }
}

// 1. FINANCIAL / MONEY NORMALIZATION TESTS
console.log("--- 1. Testing normalizeMoney ---");
assert("Number 450 returns 450", mod.normalizeMoney(450) === 450);
assert("Number 450.50 returns 450.50", mod.normalizeMoney(450.50) === 450.50);
assert("String '450' returns 450", mod.normalizeMoney("450") === 450);
assert("String '450.50' returns 450.50", mod.normalizeMoney("450.50") === 450.50);
assert("String 'C$ 450' returns 450", mod.normalizeMoney("C$ 450") === 450);
assert("String '$450.00' returns 450", mod.normalizeMoney("$450.00") === 450);
assert("String 'C$ 1,250.75' returns 1250.75", mod.normalizeMoney("C$ 1,250.75") === 1250.75);
assert("String '1.250,75' (European) returns 1250.75", mod.normalizeMoney("1.250,75") === 1250.75);
assert("Null returns 0", mod.normalizeMoney(null) === 0);
assert("Undefined returns 0", mod.normalizeMoney(undefined) === 0);
assert("NaN returns 0", mod.normalizeMoney(NaN) === 0);
assert("Object { total: 320 } returns 320", mod.normalizeMoney({ total: 320 }) === 320);
assert("Object { grandTotal: '550' } returns 550", mod.normalizeMoney({ grandTotal: '550' }) === 550);

// 2. CURRENCY FORMATTING TESTS
console.log("\n--- 2. Testing formatCurrency ---");
assert("formatCurrency(450) includes '450.00'", mod.formatCurrency(450).includes("450.00") || mod.formatCurrency(450).includes("450,00"));
assert("formatCurrency('450') does not crash and formats", typeof mod.formatCurrency("450") === 'string');
assert("formatCurrency(null) returns 'C$ 0.00'", mod.formatCurrency(null).includes("0.00") || mod.formatCurrency(null).includes("0,00"));

// 3. ORDER RESOLVERS & TOTAL TESTS
console.log("\n--- 3. Testing resolveOrderTotal with diverse schemas ---");
const orderA = { id: 'ord-1', total: 450 };
const orderB = { id: 'ord-2', total: "450.50" };
const orderC = { id: 'ord-3', valoresMonetarios: { total: 600 } };
const orderD = { id: 'ord-4', priceBreakdown: { grandTotal: 750 } };
const orderE = { id: 'ord-5', subtotal: 200, deliveryFee: 50 };
const orderF = { id: 'ord-6', total: null, subtotal: "180", deliveryFee: "40" };
const orderG = { id: 'ord-7' }; // completely empty

assert("orderA total is 450", mod.resolveOrderTotal(orderA) === 450);
assert("orderB total is 450.50", mod.resolveOrderTotal(orderB) === 450.50);
assert("orderC total is 600", mod.resolveOrderTotal(orderC) === 600);
assert("orderD total is 750", mod.resolveOrderTotal(orderD) === 750);
assert("orderE total is 250", mod.resolveOrderTotal(orderE) === 250);
assert("orderF total is 220", mod.resolveOrderTotal(orderF) === 220);
assert("orderG total is 0", mod.resolveOrderTotal(orderG) === 0);

// 4. STATUS NORMALIZATION TESTS
console.log("\n--- 4. Testing normalizeOrderStatus ---");
assert("PENDING is PENDING", mod.normalizeOrderStatus({ status: 'PENDING' }) === 'PENDING');
assert("pendiente is PENDING", mod.normalizeOrderStatus({ estado: 'pendiente' }) === 'PENDING');
assert("preparando is PREPARING", mod.normalizeOrderStatus({ status: 'preparando' }) === 'PREPARING');
assert("listo is READY", mod.normalizeOrderStatus({ status: 'listo' }) === 'READY');
assert("asignado is ASSIGNED", mod.normalizeOrderStatus({ estado: 'asignado' }) === 'ASSIGNED');
assert("en_ruta is IN_TRANSIT", mod.normalizeOrderStatus({ status: 'en_ruta' }) === 'IN_TRANSIT');
assert("going_to_customer is IN_TRANSIT", mod.normalizeOrderStatus({ status: 'going_to_customer' }) === 'IN_TRANSIT');
assert("entregado is DELIVERED", mod.normalizeOrderStatus({ status: 'entregado' }) === 'DELIVERED');
assert("completed is DELIVERED", mod.normalizeOrderStatus({ status: 'completed' }) === 'DELIVERED');
assert("cancelado is CANCELLED", mod.normalizeOrderStatus({ estado: 'cancelado' }) === 'CANCELLED');
assert("rejected is CANCELLED", mod.normalizeOrderStatus({ status: 'rejected' }) === 'CANCELLED');

// 5. DATE NORMALIZATION TESTS
console.log("\n--- 5. Testing normalizeDate & formatDate ---");
const mockTimestamp = { toDate: () => new Date('2026-08-21T12:00:00Z') };
const mockSecondsObj = { seconds: 1787313600, nanoseconds: 0 };
assert("Firestore Timestamp converts to Date", mod.normalizeDate(mockTimestamp) instanceof Date);
assert("Seconds object converts to Date", mod.normalizeDate(mockSecondsObj) instanceof Date);
assert("ISO string converts to Date", mod.normalizeDate("2026-08-21T12:00:00Z") instanceof Date);
assert("Epoch ms converts to Date", mod.normalizeDate(1787313600000) instanceof Date);
assert("Null returns null", mod.normalizeDate(null) === null);
assert("formatDate on valid timestamp returns formatted string", typeof mod.formatDate(mockTimestamp) === 'string');
assert("formatDate on null returns 'No registrado'", mod.formatDate(null) === 'No registrado');

// 6. TIMELINE RESOLUTION TESTS
console.log("\n--- 6. Testing resolveTimelineEvents ---");
const sampleOrderWithHistory = {
    id: 'ord-e2e',
    status: 'IN_TRANSIT',
    createdAt: new Date('2026-08-21T10:00:00Z'),
    assignedAt: new Date('2026-08-21T10:15:00Z'),
    historialEstados: [
        { estado: 'PENDIENTE', timestamp: new Date('2026-08-21T10:00:00Z') },
        { estado: 'ACEPTADO', timestamp: new Date('2026-08-21T10:05:00Z') },
        { estado: 'PREPARANDO', timestamp: new Date('2026-08-21T10:08:00Z') },
        { estado: 'LISTO', timestamp: new Date('2026-08-21T10:14:00Z') },
        { estado: 'ASIGNADO', timestamp: new Date('2026-08-21T10:15:00Z') },
        { estado: 'EN_RUTA', timestamp: new Date('2026-08-21T10:20:00Z') }
    ]
};

const timeline = mod.resolveTimelineEvents(sampleOrderWithHistory);
assert("Timeline has 12 stages", timeline.length === 12);
assert("Stage 1 (CREADO) is completed with timestamp", timeline[0].isCompleted && timeline[0].hasRealTimestamp);
assert("Stage 2 (ACEPTADO) is completed with timestamp", timeline[1].isCompleted && timeline[1].hasRealTimestamp);
assert("Stage 3 (PREPARANDO) is completed with timestamp", timeline[2].isCompleted && timeline[2].hasRealTimestamp);
assert("Stage 10 (IN_TRANSIT) is completed with timestamp", timeline[9].isCompleted && timeline[9].hasRealTimestamp);
assert("Stage 12 (DELIVERED) is NOT completed for in-transit order", !timeline[11].isCompleted && !timeline[11].hasRealTimestamp);

// 7. INCIDENTS RESOLUTION TESTS
console.log("\n--- 7. Testing resolveIncidents ---");
const cleanOrder = { id: 'ord-clean' };
const rejectedOrder = { id: 'ord-rej', rejectionReason: 'Cliente no responde teléfono', rejectedBy: 'Admin' };
const incidentOrder = { id: 'ord-inc', hasIncident: true, incidents: [{ description: 'Llanta ponchada' }] };

assert("cleanOrder has no incident", !mod.resolveIncidents(cleanOrder).hasIncident);
assert("rejectedOrder detects incident and reason", mod.resolveIncidents(rejectedOrder).hasIncident && mod.resolveIncidents(rejectedOrder).reason === 'Cliente no responde teléfono');
assert("incidentOrder detects incident", mod.resolveIncidents(incidentOrder).hasIncident && mod.resolveIncidents(incidentOrder).count === 1);

console.log("\n=================================================");
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
