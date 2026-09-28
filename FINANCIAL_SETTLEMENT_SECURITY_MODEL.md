# Modelo de Seguridad & EIAM v3 para Liquidaciones Comerciales

## 1. Directiva Inviolable de Escritura Cero en Cliente
Bajo ninguna circunstancia se permite a clientes web (Panel Admin o Portal Comercio) escribir directamente sobre las colecciones `/merchant_settlements` o `/merchant_settlement_configs`.
Toda mutación debe pasar obligatoriamente por una Cloud Function autoritativa que valide:
- Criptografía de sesión (`context.auth`).
- Rol administrativo (`isPlatformAdmin` / `SUPER_ADMIN`).
- Afiliación de comercio legítima (`claims.businessId === settlement.businessId`).

---

## 2. Reglas de Seguridad en `firestore.rules`

```javascript
// /merchant_settlements/{settlementId}
match /merchant_settlements/{settlementId} {
  // Prohibida estrictamente cualquier escritura directa desde SDKs cliente
  allow write: if false;

  // Lectura protegida: Platform Admin o Comercio titular del documento
  allow read: if request.auth != null && (
    isPlatformAdmin() ||
    (request.auth.token.businessId != null && request.auth.token.businessId == resource.data.businessId) ||
    (request.auth.token.tenantId != null && request.auth.token.tenantId == resource.data.tenantId)
  );
}

// /merchant_settlement_configs/{businessId}
match /merchant_settlement_configs/{businessId} {
  allow write: if false;
  allow read: if request.auth != null && (
    isPlatformAdmin() ||
    (request.auth.token.businessId != null && request.auth.token.businessId == businessId) ||
    (request.auth.token.tenantId != null && request.auth.token.tenantId == resource.data.tenantId)
  );
}
```

---

## 3. Reglas de Almacenamiento en `storage.rules`

Para los comprobantes bancarios y minutas de transferencia:

```javascript
match /settlement_receipts/{businessId}/{settlementId}/{fileName} {
  // Sólo administradores autorizados pueden subir comprobantes oficiales
  allow write: if request.auth != null &&
               isPlatformAdmin() &&
               request.resource.size < 10 * 1024 * 1024 &&
               request.resource.contentType.matches('image/.*|application/pdf');

  // Lectura permitida al Admin y al Comercio titular
  allow read: if request.auth != null && (
    isPlatformAdmin() ||
    (request.auth.token.businessId != null && request.auth.token.businessId == businessId)
  );
}
```

---

## 4. Matriz de Autorización por Endpoint Cloud Function

| Endpoint | Rol / Permiso Requerido | Validación de Claims | Verificación de Inmutabilidad |
|---|---|---|---|
| `adminGeneratePreSettlement` | Platform Admin (`ADMIN`, `SUPER_ADMIN`) | `context.auth.token.isPlatformAdmin === true` o rol administrativo | Sí (bloquea cortes que colisionen con liquidaciones cerradas) |
| `adminRecordSettlementPayment` | Platform Admin (`ADMIN`, `SUPER_ADMIN`) | Rol administrativo | Sí (`if (isFrozen) throw Error`) |
| `merchantConfirmSettlement` | Comercio Afiliado titular | `claims.businessId === settlement.businessId` | Sí (garantiza cierre atómico) |
| `merchantDisputeSettlement` | Comercio Afiliado titular | `claims.businessId === settlement.businessId` | Sí (bloquea modificación si ya está cerrada) |
| `adminResolveSettlementDispute` | Platform Admin (`ADMIN`, `SUPER_ADMIN`) | Rol administrativo | Sí (sólo resuelve si está en estado `DISPUTED`) |
| `adminConfigureMerchantSettlement` | Platform Admin (`ADMIN`, `SUPER_ADMIN`) | Rol administrativo | N/A (configuración) |

---

## 5. Prevención de Ataques de IDOR & Parameter Tampering

1. **Inyección de Identidad (IDOR):**
   - El comercio no envía `businessId` en el payload de confirmación o disputa. El backend lo extrae directamente de `context.auth.token.businessId`.
   - Si un usuario malintencionado intenta invocar `merchantConfirmSettlement` enviando el ID de liquidación de otro comercio, el backend compara:
     ```typescript
     if (userBizId && userBizId !== settlement.businessId) {
         throw new functions.https.HttpsError('permission-denied', 'No tienes autorización sobre esta liquidación.');
     }
     ```
2. **Manipulación de Cifras (Parameter Tampering):**
   - El front-end no calcula las cifras. Toda la agregación se ejecuta server-side consultando directamente `/financial_events`.
   - El valor `netPayableCents` proviene del registro en Firestore, no del cliente.
