const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'bluesystem-7c9af'
  });
}

const db = admin.firestore();

// Test the date calculation across timezones and methods
function testTimezones() {
  console.log('=== TEST TIMEZONES AND DATE CALCULATIONS ===');
  
  // Simulated current local time: 2026-09-08 21:40:13-06:00
  // In UTC: 2026-09-09 03:40:13Z
  const simulatedNowUtc = new Date('2026-09-09T03:40:13.000Z');
  
  // 1. Broken logic currently in DashboardModule.tsx:
  const brokenTodayStr = simulatedNowUtc.toISOString().split('T')[0]; // "2026-09-09"
  
  // Order created at 1:26 PM Managua (19:26 UTC) on Sept 8, 2026:
  const orderCreatedAt = new Date('2026-09-08T19:26:31.437Z');
  const orderCreatedStr = orderCreatedAt.toISOString().split('T')[0]; // "2026-09-08"
  
  console.log('Broken Logic:');
  console.log('  todayStr (from toISOString):', brokenTodayStr);
  console.log('  orderCreatedStr (from toISOString):', orderCreatedStr);
  console.log('  Match:', brokenTodayStr === orderCreatedStr); // FALSE!
  
  // 2. Canonical local / Managua timezone logic:
  // Using Intl / toLocaleDateString with America/Managua (or client local timezone)
  const getManaguaDateStr = (d) => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua' }).format(d);
  };

  const getLocalDateRange = (referenceDate = new Date()) => {
    // In browser client (where local time is Nicaragua):
    const now = new Date(referenceDate);
    // Start and end of day in local/Managua time
    // For universal robustness in browser (where Intl is standard):
    const todayManagua = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua' }).format(now);
    return todayManagua;
  };

  console.log('\nCanonical America/Managua Logic:');
  console.log('  Today (Managua):', getManaguaDateStr(simulatedNowUtc)); // "2026-09-08"
  console.log('  Order Date (Managua):', getManaguaDateStr(orderCreatedAt)); // "2026-09-08"
  console.log('  Match:', getManaguaDateStr(simulatedNowUtc) === getManaguaDateStr(orderCreatedAt)); // TRUE!
}

testTimezones();
