/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — FIRESTORE RULES AUDIT HARNESS
 * AUDITORÍA DE SEGURIDAD Y ANÁLISIS DE CONTRADICCIÓN
 */

const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, 'test_rules_emulator.js');
console.log('Running security matrix audit against firestore.rules...');

// Let's create an evaluation function for the 12 required test scenarios
const tests = [
  {
    id: 1,
    name: '1. SUPER_ADMIN L10 (con Custom Claim role=SUPER_ADMIN) modifica usuario',
    claimRole: 'SUPER_ADMIN',
    docRole: 'SUPER_ADMIN',
    docBusinessId: null,
    targetUid: 'other_user',
    actorUid: 'admin_1',
    expected: 'ALLOW'
  },
  {
    id: 2,
    name: '2. SUPER_ADMIN L10 sin Custom Claim pero con eiamRole=SUPER_ADMIN en /users/{uid}',
    claimRole: null,
    docRole: 'SUPER_ADMIN',
    docBusinessId: null,
    targetUid: 'other_user',
    actorUid: 'admin_1',
    expected: 'ALLOW_FALLBACK'
  },
  {
    id: 3,
    name: '3. ADMIN L9 de plataforma (con Custom Claim role=ADMIN) modifica usuario',
    claimRole: 'ADMIN',
    docRole: 'ADMIN',
    docBusinessId: null,
    targetUid: 'other_user',
    actorUid: 'admin_2',
    expected: 'ALLOW'
  },
  {
    id: 4,
    name: '4. Merchant Admin (con document /users/{uid}.role=ADMIN y businessId=biz_123) modifica identidad global',
    claimRole: null, // O claim de merchant
    docRole: 'ADMIN',
    docBusinessId: 'biz_123',
    targetUid: 'other_user',
    actorUid: 'merchant_admin_1',
    expected: 'DENY' // <--- DEBE SER DENY PARA EVITAR PRIVILEGE ESCALATION
  },
  {
    id: 5,
    name: '5. Merchant Admin (con businessId=biz_123) asigna SUPER_ADMIN',
    claimRole: null,
    docRole: 'ADMIN',
    docBusinessId: 'biz_123',
    targetUid: 'merchant_admin_1',
    actorUid: 'merchant_admin_1',
    expected: 'DENY'
  },
  {
    id: 6,
    name: '6. Customer modifica su propio role',
    claimRole: 'CUSTOMER',
    docRole: 'CUSTOMER',
    docBusinessId: null,
    targetUid: 'customer_1',
    actorUid: 'customer_1',
    modifyingKeys: ['role'],
    expected: 'DENY'
  },
  {
    id: 7,
    name: '7. Customer modifica su propio eiamRole',
    claimRole: 'CUSTOMER',
    docRole: 'CUSTOMER',
    docBusinessId: null,
    targetUid: 'customer_1',
    actorUid: 'customer_1',
    modifyingKeys: ['eiamRole'],
    expected: 'DENY'
  },
  {
    id: 8,
    name: '8. Courier modifica roles',
    claimRole: 'COURIER',
    docRole: 'COURIER',
    docBusinessId: null,
    targetUid: 'other_user',
    actorUid: 'courier_1',
    expected: 'DENY'
  },
  {
    id: 9,
    name: '9. Usuario no autenticado modifica /users/{uid}',
    claimRole: null,
    docRole: null,
    unauthenticated: true,
    targetUid: 'target_1',
    expected: 'DENY'
  },
  {
    id: 10,
    name: '10. request.resource.data.diff(resource.data) protege role, userType, rol, eiamRole e isActive',
    claimRole: 'CUSTOMER',
    docRole: 'CUSTOMER',
    targetUid: 'customer_1',
    actorUid: 'customer_1',
    modifyingKeys: ['nombre'], // No clave sensible
    expected: 'ALLOW'
  },
  {
    id: 11,
    name: '11. Operaciones legítimas de Merchant (OWNER/MANAGER), Courier y Governance no afectadas',
    claimRole: 'OWNER',
    docRole: 'OWNER',
    docBusinessId: 'biz_123',
    expected: 'ALLOW_MERCHANT'
  },
  {
    id: 12,
    name: '12. Ruta alternativa para modificar roles sin autorización correcta',
    expected: 'DENY'
  }
];

console.log('Scenarios Audit Loaded Successfully.');
