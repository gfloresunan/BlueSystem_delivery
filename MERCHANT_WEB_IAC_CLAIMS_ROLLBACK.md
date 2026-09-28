# MERCHANT WEB IAC CLAIMS ROLLBACK PLAN & PROCEDURE
**Proyecto:** bluesystem-7c9af  
**Fecha:** 2026-08-17  
**Modulo:** Identity Administration Center (IAC) / Merchant Web Claims  

---

## 1. MANTENIMIENTO DEL REVERSIBLE ROLLBACK

Toda mutación administrativa realizada sobre reclamos de usuario genera un snapshot de respaldo en `/audit_events` bajo un `operationId` único.

### Registro de Operaciones Ejecutadas:
- **Operation ID:** `op_reconcile_fritoni_1787013877616`
- **Target UID:** `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`
- **Estado:** `COMPLETED`
- **Snapshot `before` Registrado:**
  ```json
  {
    "uid": "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
    "email": "fritonic@gmail.com",
    "firestore": {
      "role": "business",
      "status": "ACTIVE",
      "businessId": "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
      "branchId": "br_1786988052589",
      "orgId": "org_default_bluesystem",
      "tenantId": null
    },
    "auth": {
      "disabled": false,
      "customClaims": {
        "role": "MERCHANT_OWNER",
        "businessId": "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
        "orgId": "org_default_bluesystem",
        "branchId": "br_1786988052589",
        "tenantId": null
      }
    }
  }
  ```

---

## 2. PROCEDIMIENTO DE ROLLBACK POR `operationId`

En caso de requerir revertir la reconciliación de reclamos para la cuenta FRITONI, se debe ejecutar el procedimiento estándar de restauración:

### Comando de Rollback Automatizado:
```bash
node -e "
const admin = require('./functions/node_modules/firebase-admin');
const { execSync } = require('child_process');
const token = execSync('gcloud auth print-access-token').toString().trim();
admin.initializeApp({ projectId: 'bluesystem-7c9af' });
const db = admin.firestore();

async function rollback(operationId) {
  const auditSnap = await db.collection('audit_events').doc(operationId).get();
  if (!auditSnap.exists) throw new Error('Operation ID not found');
  const event = auditSnap.data();
  const beforeClaims = event.before.auth.customClaims;
  const uid = event.targetUid;

  await fetch('https://identitytoolkit.googleapis.com/v1/projects/bluesystem-7c9af/accounts:update', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'x-goog-user-project': 'bluesystem-7c9af'
    },
    body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(beforeClaims) })
  });

  await db.collection('audit_events').doc(operationId + '_rollback').set({
    action: 'ROLLBACK_OPERATION',
    originalOperationId: operationId,
    timestamp: new Date().toISOString(),
    restoredClaims: beforeClaims
  });
  console.log('ROLLBACK COMPLETED SUCCESSFULLY FOR:', operationId);
}
rollback('op_reconcile_fritoni_1787013877616');
"
```

---

## 3. CRITERIOS PARA ACTIVAR ROLLBACK
- Error de autenticación en login de Merchant Web.
- Pérdida inadvertida de `businessId` o `branchId` en token.
- Desincronización de permisos de membresía.
- Incompatibilidad de versión de API.

*Estado actual: No se requiere activar Rollback dado que las 14 pruebas de certificación E2E resultaron exitosas.*
