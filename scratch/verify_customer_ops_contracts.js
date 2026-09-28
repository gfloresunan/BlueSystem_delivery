// scratch/verify_customer_ops_contracts.js
// Prueba de verificación de sintaxis y contratos para liveCustomers.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../panel-admin/public/js/dashboard/liveCustomers.js');
const fileContent = fs.readFileSync(filePath, 'utf-8');

console.log('--- Verificando Contratos de liveCustomers.js ---');

// 1. Verificar que NO contenga el filtro roto .where('userType', '==', 'cliente')
if (fileContent.includes(".where('userType', '==', 'cliente')")) {
    console.error('FAIL: Aún contiene el filtro roto .where(userType, ==, cliente)');
    process.exit(1);
} else {
    console.log('PASS: Filtro roto .where(userType, ==, cliente) eliminado exitosamente.');
}

// 2. Verificar que incluya los listeners de órdenes y deliveryTrips
if (!fileContent.includes("db.collection('orders')") || !fileContent.includes("db.collection('deliveryTrips')")) {
    console.error('FAIL: Faltan consultas a orders o deliveryTrips');
    process.exit(1);
} else {
    console.log('PASS: Consultas a orders y deliveryTrips presentes.');
}

// 3. Verificar soporte multicampo legacy
const hasCustomerLegacy = fileContent.includes('customerId') && fileContent.includes('clienteId') && fileContent.includes('userId');
if (!hasCustomerLegacy) {
    console.error('FAIL: No contiene resolución multicampo legacy (customerId, clienteId, userId)');
    process.exit(1);
} else {
    console.log('PASS: Soporte multicampo legacy integrado (customerId, clienteId, userId, senderUid).');
}

// 4. Verificar Drawer 360 y acciones operativas
if (!fileContent.includes('drawer.open') || !fileContent.includes('dashboardController.switchTab')) {
    console.error('FAIL: Falta integración con drawer.open o dashboardController.switchTab');
    process.exit(1);
} else {
    console.log('PASS: Drawer 360 y delegación operativa a switchTab presentes.');
}

// 5. Verificar que NO cree colecciones paralelas
if (fileContent.includes("db.collection('customers')") || fileContent.includes("db.collection('customer_profiles')")) {
    console.error('FAIL: Detectada creación de colecciones paralelas (/customers o /customer_profiles)');
    process.exit(1);
} else {
    console.log('PASS: Cero colecciones paralelas. Cumple regla de gobernanza.');
}

console.log('\nTODAS LAS PRUEBAS DE CONTRATO PASARON EXITOSAMENTE.');
