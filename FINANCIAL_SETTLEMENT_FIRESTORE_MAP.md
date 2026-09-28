# Mapeo de Esquemas Firestore & Persistencia (BSD-FINANCE-MERCHANT-SETTLEMENT-001)

## 1. Colecciones Involucradas

El subsistema de liquidaciones opera sobre las siguientes colecciones canónicas en Google Cloud Firestore:

```
/merchant_settlements/{settlementId}             <-- Documentos de liquidación por período
/merchant_settlement_configs/{businessId}       <-- Parámetros de corte y cuentas bancarias
/merchant_summaries/{businessId}                <-- Saldo agregado y pendientes acumulados
/financial_events/{eventId}                     <-- SSOT transaccional de órdenes entregadas
/audit_events/{auditId}                         <-- Trazabilidad y firmas criptográficas
```

---

## 2. Esquema Detallado: `/merchant_settlements/{settlementId}`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `settlementId` | `string` | Sí | ID canónico del documento (ej. `SETTLEMENT-BIZ1-20260901-20260915`). |
| `periodCode` | `string` | Sí | Código amigable para el comercio y el auditor. |
| `businessId` | `string` | Sí | ID del comercio afiliado. |
| `businessName` | `string` | Sí | Nombre comercial / sucursal. |
| `tenantId` | `string` | No | ID de la organización / tenant superior (si aplica). |
| `periodStart` | `Timestamp` | Sí | Inicio del período de corte (00:00:00). |
| `periodEnd` | `Timestamp` | Sí | Fin del período de corte (23:59:59). |
| `status` | `string` | Sí | Uno de: `DRAFT`, `PREPARED`, `AWAITING_PAYMENT`, `AWAITING_CONFIRMATION`, `DISPUTED`, `CLOSED`. |
| `isFrozen` | `boolean` | Sí | `false` durante preparación; `true` estrictamente al alcanzar `CLOSED`. |
| `grossSalesCents` | `number` | Sí | Total de ventas de productos en céntimos (C$ * 100). |
| `platformFeeRate` | `number` | Sí | Tasa de comisión contractual (ej. `0.15` para 15%). |
| `platformFeesCents` | `number` | Sí | Comisión total retenida en céntimos. |
| `adjustmentsCents` | `number` | Sí | Ajustes contables acordados en céntimos (default `0`). |
| `netPayableCents` | `number` | Sí | Neto a transferir (`gross - fees + adjustments`). |
| `paidCents` | `number` | No | Monto real depositado por el admin en céntimos. |
| `ordersCount` | `number` | Sí | Cantidad de pedidos entregados procesados en el corte. |
| `ordersIncluded` | `string[]` | Sí | Array con los `orderId` amparados en la liquidación. |
| `bankDetails` | `map` | No | Datos de la cuenta bancaria destino (`bankName`, `accountNumber`, `accountType`, `beneficiaryName`, `beneficiaryId`). |
| `transferReference` | `string` | No | Número de minuta o referencia ACH del depósito bancario. |
| `bankName` | `string` | No | Entidad bancaria desde/hacia donde se emitió el pago. |
| `paymentDate` | `string` | No | Fecha en que se ejecutó la transferencia (ISO YYYY-MM-DD). |
| `transferReceiptUrl` | `string` | No | URL pública del comprobante en Firebase Storage. |
| `disputeReason` | `string` | No | Justificación del comercio en caso de estado `DISPUTED`. |
| `disputedBy` | `string` | No | UID del usuario del comercio que abrió la disputa. |
| `disputedAt` | `Timestamp` | No | Fecha/hora en que se abrió la disputa. |
| `disputeResolution` | `map` | No | Registro del dictamen de disputa (`resolutionAction`, `resolutionNotes`, `resolvedBy`, `resolvedAt`). |
| `confirmedBy` | `string` | No | UID del comercio que emitió la confirmación de cierre. |
| `confirmedAt` | `Timestamp` | No | Fecha/hora de confirmación final por el comercio. |
| `closedAt` | `Timestamp` | No | Fecha/hora de sellado e inmutabilidad. |
| `createdBy` | `string` | Sí | UID del administrador que generó la pre-liquidación. |
| `createdAt` | `Timestamp` | Sí | Timestamp de creación en el sistema. |
| `updatedAt` | `Timestamp` | Sí | Timestamp de última actualización. |

---

## 3. Esquema Detallado: `/merchant_settlement_configs/{businessId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `businessId` | `string` | ID del comercio. |
| `settlementPeriod` | `string` | `WEEKLY`, `BIWEEKLY`, o `MONTHLY`. |
| `cutoffDayOfWeek` | `string` | `MONDAY`, `SUNDAY`, `FRIDAY`. |
| `bankDetails` | `map` | Objeto con la información bancaria oficial del comercio. |
| `updatedAt` | `Timestamp` | Última modificación administrativa. |

---

## 4. Índices Compuestos Creados en `firestore.indexes.json`

```json
{
  "collectionGroup": "merchant_settlements",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "merchant_settlements",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "merchant_settlements",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```
